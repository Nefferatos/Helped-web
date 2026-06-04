-- ============================================================================
-- Support Chat: fast-path read RPCs + bidirectional presence
-- ----------------------------------------------------------------------------
-- Context: the worker previously loaded the ENTIRE app-data blob for every chat
-- read and for every 1.2s SSE tick. These RPCs query the already-indexed
-- public.helped_query_chat_messages table directly (same table & pattern as
-- public.get_helped_chat_admin_summary), so reads no longer scan the whole DB.
--
-- Safe to run multiple times (create-or-replace / if-not-exists). Message WRITES
-- and mark-read continue to flow through save_helped_app_data, which rebuilds
-- helped_query_chat_messages, keeping these reads fresh.
--
-- Run once in the Supabase SQL editor.
-- ============================================================================

-- ─── Fast-path chat read RPCs ──────────────────────────────────────────────

-- Admin inbox: one entry per (client_id, conversation_type, agency_id).
create or replace function public.list_helped_chat_admin_conversations(
  p_app_id text default 'default'
)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  with grouped as (
    select
      cm.client_id,
      cm.conversation_type,
      cm.agency_id,
      max(cm.record_id) as last_record_id,
      count(*) filter (
        where cm.sender_role = 'client'
          and coalesce((cm.payload->>'readByAgency')::boolean, false) = false
      ) as unread_count
    from public.helped_query_chat_messages cm
    where cm.app_id = p_app_id
      and cm.client_id is not null
    group by cm.client_id, cm.conversation_type, cm.agency_id
  ),
  enriched as (
    select
      g.client_id,
      g.conversation_type,
      g.agency_id,
      g.unread_count,
      m.payload->>'message' as last_message,
      m.created_at as last_message_at,
      coalesce(m.payload->>'agencyName', '') as agency_name,
      c.name as client_name,
      c.email as client_email,
      c.company as client_company,
      coalesce(c.payload->>'profileImageUrl', '') as client_profile_image_url
    from grouped g
    join public.helped_query_chat_messages m
      on m.app_id = p_app_id and m.record_id = g.last_record_id
    join public.helped_query_clients c
      on c.app_id = p_app_id and c.record_id = g.client_id
  )
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'key', client_id || ':' || conversation_type || ':' || coalesce(agency_id, 0),
        'clientId', client_id,
        'conversationType', conversation_type,
        'agencyId', agency_id,
        'agencyName', agency_name,
        'clientName', coalesce(client_name, ''),
        'clientEmail', coalesce(client_email, ''),
        'clientCompany', coalesce(client_company, ''),
        'clientProfileImageUrl', client_profile_image_url,
        'lastMessage', coalesce(last_message, ''),
        'lastMessageAt', last_message_at,
        'unreadCount', unread_count
      )
      order by last_message_at desc nulls last
    ),
    '[]'::jsonb
  )
  from enriched;
$$;

-- Client inbox: entries for a single client, keyed by conversation_type:agency_id.
create or replace function public.list_helped_chat_client_conversations(
  p_app_id text default 'default',
  p_client_id integer default null
)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  with grouped as (
    select
      cm.conversation_type,
      cm.agency_id,
      max(cm.record_id) as last_record_id,
      count(*) filter (
        where cm.sender_role = 'agency'
          and coalesce((cm.payload->>'readByClient')::boolean, false) = false
      ) as unread_count
    from public.helped_query_chat_messages cm
    where cm.app_id = p_app_id
      and cm.client_id = p_client_id
    group by cm.conversation_type, cm.agency_id
  ),
  enriched as (
    select
      g.conversation_type,
      g.agency_id,
      g.unread_count,
      m.payload->>'message' as last_message,
      m.created_at as last_message_at,
      coalesce(m.payload->>'agencyName', '') as agency_name
    from grouped g
    join public.helped_query_chat_messages m
      on m.app_id = p_app_id and m.record_id = g.last_record_id
  )
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'key', conversation_type || ':' || coalesce(agency_id, 0),
        'clientId', p_client_id,
        'conversationType', conversation_type,
        'agencyId', agency_id,
        'agencyName', agency_name,
        'title', case when conversation_type = 'agency'
                      then coalesce(nullif(agency_name, ''), 'Agency')
                      else 'Agency Support' end,
        'description', case when conversation_type = 'agency'
                      then 'Direct chat with agency'
                      else 'General help, follow-up, and request support' end,
        'lastMessage', coalesce(last_message, ''),
        'lastMessageAt', last_message_at,
        'unreadCount', unread_count
      )
      order by last_message_at desc nulls last
    ),
    '[]'::jsonb
  )
  from enriched;
$$;

-- Paginated message history for one conversation (newest p_limit, ascending).
-- Pass p_before_id to page older (record_id < p_before_id).
create or replace function public.get_helped_chat_messages(
  p_app_id text default 'default',
  p_client_id integer default null,
  p_conversation_type text default 'support',
  p_agency_id integer default null,
  p_before_id integer default null,
  p_limit integer default 30
)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  with picked as (
    select cm.payload, cm.record_id
    from public.helped_query_chat_messages cm
    where cm.app_id = p_app_id
      and cm.client_id = p_client_id
      and cm.conversation_type = p_conversation_type
      and (p_conversation_type = 'support' or cm.agency_id = p_agency_id)
      and (p_before_id is null or cm.record_id < p_before_id)
    order by cm.record_id desc
    limit least(greatest(coalesce(p_limit, 30), 1), 200)
  )
  select coalesce(jsonb_agg(payload order by record_id asc), '[]'::jsonb)
  from picked;
$$;

-- New messages after a cursor id (drives the SSE loop). Optional scope filters:
-- admin stream passes none (all messages); client stream scopes by client_id.
create or replace function public.get_helped_chat_messages_after(
  p_app_id text default 'default',
  p_after_id integer default 0,
  p_client_id integer default null,
  p_conversation_type text default null,
  p_agency_id integer default null
)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  with picked as (
    select cm.payload, cm.record_id
    from public.helped_query_chat_messages cm
    where cm.app_id = p_app_id
      and cm.record_id > coalesce(p_after_id, 0)
      and (p_client_id is null or cm.client_id = p_client_id)
      and (p_conversation_type is null or cm.conversation_type = p_conversation_type)
      and (p_agency_id is null or cm.agency_id = p_agency_id)
    order by cm.record_id asc
    limit 200
  )
  select coalesce(jsonb_agg(payload order by record_id asc), '[]'::jsonb)
  from picked;
$$;

-- Highest message id (cursor bootstrap). Optional p_client_id to scope per client.
create or replace function public.get_helped_chat_last_id(
  p_app_id text default 'default',
  p_client_id integer default null
)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'lastId',
    coalesce(max(cm.record_id), 0)
  )
  from public.helped_query_chat_messages cm
  where cm.app_id = p_app_id
    and (p_client_id is null or cm.client_id = p_client_id);
$$;

-- ─── Presence (heartbeat-based, no blob writes) ────────────────────────────

create table if not exists public.helped_presence (
  app_id text not null,
  actor_type text not null,            -- 'client' | 'admin'
  actor_id integer not null,
  agency_id integer,
  last_seen timestamptz not null default now(),
  primary key (app_id, actor_type, actor_id)
);

create index if not exists helped_presence_lookup_idx
  on public.helped_presence (app_id, actor_type, last_seen desc);

alter table public.helped_presence enable row level security;
revoke all on public.helped_presence from anon, authenticated;
grant select, insert, update, delete on public.helped_presence to service_role;
drop policy if exists "service role manages helped_presence" on public.helped_presence;
create policy "service role manages helped_presence"
  on public.helped_presence for all to service_role using (true) with check (true);

-- Upsert a heartbeat (call every ~25s while the tab is visible).
create or replace function public.helped_presence_touch(
  p_app_id text,
  p_actor_type text,
  p_actor_id integer,
  p_agency_id integer default null
)
returns void
language sql
security definer
set search_path = public
as $$
  insert into public.helped_presence (app_id, actor_type, actor_id, agency_id, last_seen)
  values (p_app_id, p_actor_type, p_actor_id, p_agency_id, now())
  on conflict (app_id, actor_type, actor_id)
  do update set last_seen = now(), agency_id = coalesce(excluded.agency_id, public.helped_presence.agency_id);
$$;

-- Force offline (explicit logout / tab close beacon).
create or replace function public.helped_presence_offline(
  p_app_id text,
  p_actor_type text,
  p_actor_id integer
)
returns void
language sql
security definer
set search_path = public
as $$
  update public.helped_presence
  set last_seen = now() - interval '1 day'
  where app_id = p_app_id and actor_type = p_actor_type and actor_id = p_actor_id;
$$;

-- Snapshot of who is online within p_window_seconds:
--  { "clients": [<online client ids>], "agencies": [<agency ids with an online admin>] }
create or replace function public.get_helped_presence(
  p_app_id text default 'default',
  p_window_seconds integer default 40
)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  with live as (
    select actor_type, actor_id, agency_id
    from public.helped_presence
    where app_id = p_app_id
      and last_seen > now() - make_interval(secs => greatest(coalesce(p_window_seconds, 40), 5))
  )
  select jsonb_build_object(
    'clients', coalesce(
      (select jsonb_agg(distinct actor_id) from live where actor_type = 'client'),
      '[]'::jsonb
    ),
    'agencies', coalesce(
      (select jsonb_agg(distinct agency_id) from live where actor_type = 'admin' and agency_id is not null),
      '[]'::jsonb
    ),
    'anyAdmin', exists (select 1 from live where actor_type = 'admin')
  );
$$;

-- ─── Grants ────────────────────────────────────────────────────────────────

grant execute on function public.list_helped_chat_admin_conversations(text) to service_role;
grant execute on function public.list_helped_chat_client_conversations(text, integer) to service_role;
grant execute on function public.get_helped_chat_messages(text, integer, text, integer, integer, integer) to service_role;
grant execute on function public.get_helped_chat_messages_after(text, integer, integer, text, integer) to service_role;
grant execute on function public.get_helped_chat_last_id(text, integer) to service_role;
grant execute on function public.helped_presence_touch(text, text, integer, integer) to service_role;
grant execute on function public.helped_presence_offline(text, text, integer) to service_role;
grant execute on function public.get_helped_presence(text, integer) to service_role;
