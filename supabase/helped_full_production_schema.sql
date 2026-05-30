-- Helped Web production Supabase schema
--
-- Safe to paste into the Supabase SQL editor.
-- This script is intentionally non-destructive for production data:
-- - It does not drop public.app_data.
-- - It does not overwrite the default app_data row if it already exists.
-- - It keeps the Cloudflare Worker compatible with the current app_data JSON contract.
-- - It adds query-friendly tables/views for smooth inspection and reporting.
--
-- After running, optional refresh:
--   select public.refresh_helped_query_tables('default');

begin;

create extension if not exists pgcrypto;
create extension if not exists pg_trgm;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.set_row_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.row_updated_at = now();
  return new;
end;
$$;

create or replace function public.helped_try_int(value text)
returns integer
language plpgsql
immutable
as $$
begin
  if value is null or btrim(value) = '' then
    return null;
  end if;
  return value::integer;
exception when others then
  return null;
end;
$$;

create or replace function public.helped_try_numeric(value text)
returns numeric
language plpgsql
immutable
as $$
begin
  if value is null or btrim(value) = '' then
    return null;
  end if;
  return value::numeric;
exception when others then
  return null;
end;
$$;

create or replace function public.helped_try_timestamptz(value text)
returns timestamptz
language plpgsql
immutable
as $$
begin
  if value is null or btrim(value) = '' then
    return null;
  end if;
  return value::timestamptz;
exception when others then
  return null;
end;
$$;

create table if not exists public.app_data (
  id text primary key,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint app_data_id_not_blank check (length(btrim(id)) > 0),
  constraint app_data_json_object check (jsonb_typeof(data) = 'object')
);

drop trigger if exists app_data_set_updated_at on public.app_data;
create trigger app_data_set_updated_at
before update on public.app_data
for each row execute function public.set_updated_at();

create index if not exists app_data_updated_at_idx
  on public.app_data (updated_at desc);
create index if not exists app_data_data_gin_idx
  on public.app_data using gin (data jsonb_path_ops);

insert into public.app_data (id, data)
values
  (
    'default',
    jsonb_build_object(
      'companyProfile', '{}'::jsonb,
      'momPersonnel', '[]'::jsonb,
      'testimonials', '[]'::jsonb,
      'maids', '[]'::jsonb,
      'enquiries', '[]'::jsonb,
      'clients', '[]'::jsonb,
      'clientSessions', '[]'::jsonb,
      'agencyAdmins', '[]'::jsonb,
      'agencyAdminSessions', '[]'::jsonb,
      'directSales', '[]'::jsonb,
      'requests', '[]'::jsonb,
      'requestConversations', '[]'::jsonb,
      'requestMessages', '[]'::jsonb,
      'chatMessages', '[]'::jsonb,
      'employers', '[]'::jsonb,
      'employmentContracts', '[]'::jsonb,
      'ats', jsonb_build_object(
        'applications', '[]'::jsonb,
        'profiles', '[]'::jsonb,
        'scores', '{}'::jsonb,
        'history', '{}'::jsonb,
        'documents', '{}'::jsonb,
        'notifications', '{}'::jsonb,
        'presets', '[]'::jsonb
      ),
      'counters', '{}'::jsonb
    )
  ),
  ('default:agency-admin-sessions', '{"agencyAdminSessions":[]}'::jsonb),
  ('default:agency-admin-auth', '{"agencyAdmins":[]}'::jsonb)
on conflict (id) do nothing;

revoke all on table public.app_data from anon, authenticated;
grant select, insert, update, delete on table public.app_data to service_role;
alter table public.app_data enable row level security;
drop policy if exists "service role manages app_data" on public.app_data;
create policy "service role manages app_data"
on public.app_data
for all
to service_role
using (true)
with check (true);

create table if not exists public.helped_query_meta (
  app_id text primary key,
  refreshed_at timestamptz not null default now(),
  source_updated_at timestamptz,
  source_bytes integer not null default 0
);

create table if not exists public.helped_query_maids (
  app_id text not null,
  record_id integer not null,
  agency_id integer,
  reference_code text,
  full_name text,
  status text,
  maid_type text,
  nationality text,
  is_public boolean not null default false,
  has_photo boolean not null default false,
  created_at timestamptz,
  updated_at timestamptz,
  payload jsonb not null,
  row_created_at timestamptz not null default now(),
  row_updated_at timestamptz not null default now(),
  primary key (app_id, record_id),
  constraint helped_query_maids_payload_object check (jsonb_typeof(payload) = 'object')
);

create table if not exists public.helped_query_clients (
  app_id text not null,
  record_id integer not null,
  supabase_user_id text,
  email text,
  name text,
  company text,
  phone text,
  created_at timestamptz,
  payload jsonb not null,
  row_created_at timestamptz not null default now(),
  row_updated_at timestamptz not null default now(),
  primary key (app_id, record_id),
  constraint helped_query_clients_payload_object check (jsonb_typeof(payload) = 'object')
);

create table if not exists public.helped_query_agency_admins (
  app_id text not null,
  record_id integer not null,
  agency_id integer,
  username text,
  email text,
  supabase_user_id text,
  agency_name text,
  created_at timestamptz,
  payload jsonb not null,
  row_created_at timestamptz not null default now(),
  row_updated_at timestamptz not null default now(),
  primary key (app_id, record_id),
  constraint helped_query_agency_admins_payload_object check (jsonb_typeof(payload) = 'object')
);

create table if not exists public.helped_query_enquiries (
  app_id text not null,
  record_id integer not null,
  username text,
  email text,
  phone text,
  created_at timestamptz,
  payload jsonb not null,
  row_created_at timestamptz not null default now(),
  row_updated_at timestamptz not null default now(),
  primary key (app_id, record_id),
  constraint helped_query_enquiries_payload_object check (jsonb_typeof(payload) = 'object')
);

create table if not exists public.helped_query_direct_sales (
  app_id text not null,
  record_id integer not null,
  agency_id integer,
  client_id integer,
  maid_reference_code text,
  status text,
  created_at timestamptz,
  payload jsonb not null,
  row_created_at timestamptz not null default now(),
  row_updated_at timestamptz not null default now(),
  primary key (app_id, record_id),
  constraint helped_query_direct_sales_payload_object check (jsonb_typeof(payload) = 'object')
);

create table if not exists public.helped_query_requests (
  app_id text not null,
  request_id uuid not null,
  client_id integer,
  agency_id integer,
  request_type text,
  status text,
  maid_references text[] not null default array[]::text[],
  summary text,
  updated_by text,
  created_at timestamptz,
  updated_at timestamptz,
  payload jsonb not null,
  row_created_at timestamptz not null default now(),
  row_updated_at timestamptz not null default now(),
  primary key (app_id, request_id),
  constraint helped_query_requests_payload_object check (jsonb_typeof(payload) = 'object')
);

create table if not exists public.helped_query_request_conversations (
  app_id text not null,
  conversation_id uuid not null,
  request_id uuid not null,
  agency_id integer,
  client_id integer,
  created_at timestamptz,
  payload jsonb not null,
  row_created_at timestamptz not null default now(),
  row_updated_at timestamptz not null default now(),
  primary key (app_id, conversation_id),
  constraint helped_query_request_conversations_payload_object check (jsonb_typeof(payload) = 'object')
);

create table if not exists public.helped_query_request_messages (
  app_id text not null,
  message_id uuid not null,
  conversation_id uuid not null,
  sender_type text,
  sender_id integer,
  message text,
  created_at timestamptz,
  payload jsonb not null,
  row_created_at timestamptz not null default now(),
  row_updated_at timestamptz not null default now(),
  primary key (app_id, message_id),
  constraint helped_query_request_messages_payload_object check (jsonb_typeof(payload) = 'object')
);

create table if not exists public.helped_query_chat_messages (
  app_id text not null,
  record_id integer not null,
  client_id integer,
  agency_id integer,
  conversation_type text,
  sender_role text,
  created_at timestamptz,
  payload jsonb not null,
  row_created_at timestamptz not null default now(),
  row_updated_at timestamptz not null default now(),
  primary key (app_id, record_id),
  constraint helped_query_chat_messages_payload_object check (jsonb_typeof(payload) = 'object')
);

create table if not exists public.helped_query_employers (
  app_id text not null,
  record_id integer not null,
  agency_id integer,
  ref_code text,
  maid_reference_code text,
  employer_name text,
  created_at timestamptz,
  updated_at timestamptz,
  payload jsonb not null,
  row_created_at timestamptz not null default now(),
  row_updated_at timestamptz not null default now(),
  primary key (app_id, record_id),
  constraint helped_query_employers_payload_object check (jsonb_typeof(payload) = 'object')
);

create table if not exists public.helped_query_employment_contracts (
  app_id text not null,
  record_id integer not null,
  agency_id integer,
  ref_code text,
  employer_ref_code text,
  maid_reference_code text,
  maid_name text,
  employer_name text,
  created_at timestamptz,
  updated_at timestamptz,
  payload jsonb not null,
  row_created_at timestamptz not null default now(),
  row_updated_at timestamptz not null default now(),
  primary key (app_id, record_id),
  constraint helped_query_employment_contracts_payload_object check (jsonb_typeof(payload) = 'object')
);

create table if not exists public.helped_query_ats_applications (
  app_id text not null,
  application_id text not null,
  agency_id integer,
  profile_id text,
  application_code text,
  status text,
  source text,
  applied_at timestamptz,
  updated_at timestamptz,
  payload jsonb not null,
  row_created_at timestamptz not null default now(),
  row_updated_at timestamptz not null default now(),
  primary key (app_id, application_id),
  constraint helped_query_ats_applications_payload_object check (jsonb_typeof(payload) = 'object')
);

create table if not exists public.helped_query_ats_profiles (
  app_id text not null,
  profile_id text not null,
  application_id text,
  full_name text,
  email text,
  contact_number text,
  nationality text,
  years_of_experience numeric,
  expected_salary numeric,
  created_at timestamptz,
  updated_at timestamptz,
  payload jsonb not null,
  row_created_at timestamptz not null default now(),
  row_updated_at timestamptz not null default now(),
  primary key (app_id, profile_id),
  constraint helped_query_ats_profiles_payload_object check (jsonb_typeof(payload) = 'object')
);

create index if not exists helped_query_maids_lookup_idx
  on public.helped_query_maids (app_id, agency_id, is_public, updated_at desc);
create index if not exists helped_query_maids_reference_idx
  on public.helped_query_maids (app_id, reference_code);
create index if not exists helped_query_maids_name_trgm_idx
  on public.helped_query_maids using gin (full_name gin_trgm_ops);
create index if not exists helped_query_clients_lookup_idx
  on public.helped_query_clients (app_id, email, supabase_user_id);
create index if not exists helped_query_agency_admins_lookup_idx
  on public.helped_query_agency_admins (app_id, agency_id, email, username);
create index if not exists helped_query_enquiries_created_idx
  on public.helped_query_enquiries (app_id, created_at desc);
create index if not exists helped_query_direct_sales_lookup_idx
  on public.helped_query_direct_sales (app_id, agency_id, client_id, status, created_at desc);
create index if not exists helped_query_requests_agency_status_idx
  on public.helped_query_requests (app_id, agency_id, status, updated_at desc);
create index if not exists helped_query_requests_client_idx
  on public.helped_query_requests (app_id, client_id, updated_at desc);
create index if not exists helped_query_request_conversations_request_idx
  on public.helped_query_request_conversations (app_id, request_id);
create index if not exists helped_query_request_messages_conversation_idx
  on public.helped_query_request_messages (app_id, conversation_id, created_at asc);
create index if not exists helped_query_chat_messages_lookup_idx
  on public.helped_query_chat_messages (app_id, agency_id, client_id, conversation_type, created_at desc);
create index if not exists helped_query_employers_ref_idx
  on public.helped_query_employers (app_id, agency_id, ref_code);
create index if not exists helped_query_employment_contracts_ref_idx
  on public.helped_query_employment_contracts (app_id, agency_id, ref_code, employer_ref_code, maid_reference_code);
create index if not exists helped_query_ats_applications_lookup_idx
  on public.helped_query_ats_applications (app_id, agency_id, status, applied_at desc);
create index if not exists helped_query_ats_profiles_lookup_idx
  on public.helped_query_ats_profiles (app_id, application_id, full_name);

create table if not exists public.ai_conversations (
  id uuid primary key default gen_random_uuid(),
  agent_id text not null,
  actor_role text not null,
  actor_id text,
  agency_id integer,
  title text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ai_conversations_agent_id_not_blank check (length(btrim(agent_id)) > 0),
  constraint ai_conversations_actor_role_valid check (
    actor_role in ('public', 'employer', 'agency', 'admin', 'applicant')
  ),
  constraint ai_conversations_metadata_object check (jsonb_typeof(metadata) = 'object')
);

drop trigger if exists ai_conversations_set_updated_at on public.ai_conversations;
create trigger ai_conversations_set_updated_at
before update on public.ai_conversations
for each row execute function public.set_updated_at();

create table if not exists public.ai_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.ai_conversations(id) on delete cascade,
  agent_id text not null,
  role text not null,
  content text not null,
  actor_role text,
  actor_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint ai_messages_role_valid check (role in ('user', 'assistant', 'system', 'tool')),
  constraint ai_messages_content_not_blank check (length(btrim(content)) > 0),
  constraint ai_messages_metadata_object check (jsonb_typeof(metadata) = 'object')
);

create table if not exists public.ai_agent_logs (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid references public.ai_conversations(id) on delete set null,
  agent_id text not null,
  actor_role text not null,
  actor_id text,
  agency_id integer,
  status text not null,
  latency_ms integer,
  input jsonb not null default '{}'::jsonb,
  output text,
  error text,
  created_at timestamptz not null default now(),
  constraint ai_agent_logs_status_valid check (status in ('success', 'error', 'blocked')),
  constraint ai_agent_logs_input_object check (jsonb_typeof(input) = 'object')
);

create table if not exists public.ai_agent_actions (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid references public.ai_conversations(id) on delete set null,
  agent_id text not null,
  action_type text not null,
  status text not null default 'proposed',
  payload jsonb not null default '{}'::jsonb,
  created_by_role text,
  created_by_id text,
  approved_by text,
  executed_at timestamptz,
  created_at timestamptz not null default now(),
  constraint ai_agent_actions_status_valid check (
    status in ('proposed', 'approved', 'rejected', 'executed', 'failed')
  ),
  constraint ai_agent_actions_payload_object check (jsonb_typeof(payload) = 'object')
);

create table if not exists public.ai_agent_feedback (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid references public.ai_conversations(id) on delete cascade,
  message_id uuid references public.ai_messages(id) on delete set null,
  agent_id text not null,
  actor_role text not null,
  actor_id text,
  rating integer,
  feedback text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint ai_agent_feedback_rating_range check (rating is null or rating between 1 and 5),
  constraint ai_agent_feedback_metadata_object check (jsonb_typeof(metadata) = 'object')
);

create index if not exists ai_conversations_actor_idx
  on public.ai_conversations (actor_role, actor_id, updated_at desc);
create index if not exists ai_conversations_agency_idx
  on public.ai_conversations (agency_id, updated_at desc);
create index if not exists ai_messages_conversation_idx
  on public.ai_messages (conversation_id, created_at asc);
create index if not exists ai_agent_logs_agent_created_idx
  on public.ai_agent_logs (agent_id, created_at desc);
create index if not exists ai_agent_logs_agency_created_idx
  on public.ai_agent_logs (agency_id, created_at desc);
create index if not exists ai_agent_actions_conversation_idx
  on public.ai_agent_actions (conversation_id, created_at desc);
create index if not exists ai_agent_feedback_agent_idx
  on public.ai_agent_feedback (agent_id, created_at desc);

do $$
declare
  tbl text;
begin
  foreach tbl in array array[
    'helped_query_meta',
    'helped_query_maids',
    'helped_query_clients',
    'helped_query_agency_admins',
    'helped_query_enquiries',
    'helped_query_direct_sales',
    'helped_query_requests',
    'helped_query_request_conversations',
    'helped_query_request_messages',
    'helped_query_chat_messages',
    'helped_query_employers',
    'helped_query_employment_contracts',
    'helped_query_ats_applications',
    'helped_query_ats_profiles',
    'ai_conversations',
    'ai_messages',
    'ai_agent_logs',
    'ai_agent_actions',
    'ai_agent_feedback'
  ]
  loop
    execute format('alter table public.%I enable row level security', tbl);
    execute format('revoke all on public.%I from anon, authenticated', tbl);
    execute format('grant select, insert, update, delete on public.%I to service_role', tbl);
    execute format('drop policy if exists "service role manages %1$s" on public.%I', tbl);
    execute format(
      'create policy "service role manages %1$s" on public.%I for all to service_role using (true) with check (true)',
      tbl
    );
  end loop;
end
$$;

create or replace function public.refresh_helped_query_tables(p_app_id text default 'default')
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_data jsonb;
  v_updated_at timestamptz;
begin
  select data, updated_at
  into v_data, v_updated_at
  from public.app_data
  where id = p_app_id;

  if v_data is null then
    raise exception 'No app_data row found for app_id %', p_app_id;
  end if;

  delete from public.helped_query_maids where app_id = p_app_id;
  delete from public.helped_query_clients where app_id = p_app_id;
  delete from public.helped_query_agency_admins where app_id = p_app_id;
  delete from public.helped_query_enquiries where app_id = p_app_id;
  delete from public.helped_query_direct_sales where app_id = p_app_id;
  delete from public.helped_query_requests where app_id = p_app_id;
  delete from public.helped_query_request_conversations where app_id = p_app_id;
  delete from public.helped_query_request_messages where app_id = p_app_id;
  delete from public.helped_query_chat_messages where app_id = p_app_id;
  delete from public.helped_query_employers where app_id = p_app_id;
  delete from public.helped_query_employment_contracts where app_id = p_app_id;
  delete from public.helped_query_ats_applications where app_id = p_app_id;
  delete from public.helped_query_ats_profiles where app_id = p_app_id;

  insert into public.helped_query_maids (
    app_id, record_id, agency_id, reference_code, full_name, status, maid_type,
    nationality, is_public, has_photo, created_at, updated_at, payload
  )
  select
    p_app_id,
    coalesce(public.helped_try_int(item->>'id'), row_number() over ()::integer),
    public.helped_try_int(item->>'agencyId'),
    item->>'referenceCode',
    item->>'fullName',
    item->>'status',
    item->>'type',
    item->>'nationality',
    coalesce((item->>'isPublic')::boolean, false),
    coalesce((item->>'hasPhoto')::boolean, false),
    public.helped_try_timestamptz(item->>'createdAt'),
    public.helped_try_timestamptz(item->>'updatedAt'),
    item
  from jsonb_array_elements(coalesce(v_data->'maids', '[]'::jsonb)) item;

  insert into public.helped_query_clients (
    app_id, record_id, supabase_user_id, email, name, company, phone, created_at, payload
  )
  select
    p_app_id,
    coalesce(public.helped_try_int(item->>'id'), row_number() over ()::integer),
    item->>'supabaseUserId',
    item->>'email',
    item->>'name',
    item->>'company',
    item->>'phone',
    public.helped_try_timestamptz(item->>'createdAt'),
    item
  from jsonb_array_elements(coalesce(v_data->'clients', '[]'::jsonb)) item;

  insert into public.helped_query_agency_admins (
    app_id, record_id, agency_id, username, email, supabase_user_id, agency_name, created_at, payload
  )
  select
    p_app_id,
    coalesce(public.helped_try_int(item->>'id'), row_number() over ()::integer),
    public.helped_try_int(item->>'agencyId'),
    item->>'username',
    item->>'email',
    item->>'supabaseUserId',
    item->>'agencyName',
    public.helped_try_timestamptz(item->>'createdAt'),
    item
  from jsonb_array_elements(coalesce(v_data->'agencyAdmins', '[]'::jsonb)) item;

  insert into public.helped_query_enquiries (
    app_id, record_id, username, email, phone, created_at, payload
  )
  select
    p_app_id,
    coalesce(public.helped_try_int(item->>'id'), row_number() over ()::integer),
    item->>'username',
    item->>'email',
    item->>'phone',
    public.helped_try_timestamptz(item->>'createdAt'),
    item
  from jsonb_array_elements(coalesce(v_data->'enquiries', '[]'::jsonb)) item;

  insert into public.helped_query_direct_sales (
    app_id, record_id, agency_id, client_id, maid_reference_code, status, created_at, payload
  )
  select
    p_app_id,
    coalesce(public.helped_try_int(item->>'id'), row_number() over ()::integer),
    public.helped_try_int(item->>'agencyId'),
    public.helped_try_int(item->>'clientId'),
    item->>'maidReferenceCode',
    item->>'status',
    public.helped_try_timestamptz(item->>'createdAt'),
    item
  from jsonb_array_elements(coalesce(v_data->'directSales', '[]'::jsonb)) item;

  insert into public.helped_query_requests (
    app_id, request_id, client_id, agency_id, request_type, status, maid_references,
    summary, updated_by, created_at, updated_at, payload
  )
  select
    p_app_id,
    (item->>'id')::uuid,
    public.helped_try_int(item->>'clientId'),
    public.helped_try_int(item->>'agencyId'),
    item->>'type',
    item->>'status',
    coalesce(
      array(select jsonb_array_elements_text(coalesce(item->'maidReferences', '[]'::jsonb))),
      array[]::text[]
    ),
    coalesce(item#>>'{details,primaryDuty}', item#>>'{details,nationality}', item->>'type'),
    item->>'updatedBy',
    public.helped_try_timestamptz(item->>'createdAt'),
    public.helped_try_timestamptz(item->>'updatedAt'),
    item
  from jsonb_array_elements(coalesce(v_data->'requests', '[]'::jsonb)) item
  where coalesce(item->>'id', '') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$';

  insert into public.helped_query_request_conversations (
    app_id, conversation_id, request_id, agency_id, client_id, created_at, payload
  )
  select
    p_app_id,
    (item->>'id')::uuid,
    (item->>'requestId')::uuid,
    public.helped_try_int(item->>'agencyId'),
    public.helped_try_int(item->>'clientId'),
    public.helped_try_timestamptz(item->>'createdAt'),
    item
  from jsonb_array_elements(coalesce(v_data->'requestConversations', '[]'::jsonb)) item
  where coalesce(item->>'id', '') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
    and coalesce(item->>'requestId', '') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$';

  insert into public.helped_query_request_messages (
    app_id, message_id, conversation_id, sender_type, sender_id, message, created_at, payload
  )
  select
    p_app_id,
    (item->>'id')::uuid,
    (item->>'conversationId')::uuid,
    item->>'senderType',
    public.helped_try_int(item->>'senderId'),
    item->>'message',
    public.helped_try_timestamptz(item->>'createdAt'),
    item
  from jsonb_array_elements(coalesce(v_data->'requestMessages', '[]'::jsonb)) item
  where coalesce(item->>'id', '') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
    and coalesce(item->>'conversationId', '') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$';

  insert into public.helped_query_chat_messages (
    app_id, record_id, client_id, agency_id, conversation_type, sender_role, created_at, payload
  )
  select
    p_app_id,
    coalesce(public.helped_try_int(item->>'id'), row_number() over ()::integer),
    public.helped_try_int(item->>'clientId'),
    public.helped_try_int(item->>'agencyId'),
    item->>'conversationType',
    item->>'senderRole',
    public.helped_try_timestamptz(item->>'createdAt'),
    item
  from jsonb_array_elements(coalesce(v_data->'chatMessages', '[]'::jsonb)) item;

  insert into public.helped_query_employers (
    app_id, record_id, agency_id, ref_code, maid_reference_code, employer_name, created_at, updated_at, payload
  )
  select
    p_app_id,
    coalesce(public.helped_try_int(item->>'id'), row_number() over ()::integer),
    public.helped_try_int(item->>'agencyId'),
    item->>'refCode',
    item#>>'{maid,referenceCode}',
    item#>>'{employer,name}',
    public.helped_try_timestamptz(item->>'createdAt'),
    public.helped_try_timestamptz(item->>'updatedAt'),
    item
  from jsonb_array_elements(coalesce(v_data->'employers', '[]'::jsonb)) item;

  insert into public.helped_query_employment_contracts (
    app_id, record_id, agency_id, ref_code, employer_ref_code, maid_reference_code,
    maid_name, employer_name, created_at, updated_at, payload
  )
  select
    p_app_id,
    coalesce(public.helped_try_int(item->>'id'), row_number() over ()::integer),
    public.helped_try_int(item->>'agencyId'),
    item->>'refCode',
    item->>'employerRefCode',
    item->>'maidReferenceCode',
    item->>'maidName',
    item->>'employerName',
    public.helped_try_timestamptz(item->>'createdAt'),
    public.helped_try_timestamptz(item->>'updatedAt'),
    item
  from jsonb_array_elements(coalesce(v_data->'employmentContracts', '[]'::jsonb)) item;

  insert into public.helped_query_ats_applications (
    app_id, application_id, agency_id, profile_id, application_code, status, source,
    applied_at, updated_at, payload
  )
  select
    p_app_id,
    item->>'id',
    public.helped_try_int(item->>'agencyId'),
    item->>'profileId',
    item->>'applicationCode',
    item->>'status',
    item->>'source',
    public.helped_try_timestamptz(item->>'appliedAt'),
    public.helped_try_timestamptz(item->>'updatedAt'),
    item
  from jsonb_array_elements(coalesce(v_data#>'{ats,applications}', '[]'::jsonb)) item
  where coalesce(item->>'id', '') <> '';

  insert into public.helped_query_ats_profiles (
    app_id, profile_id, application_id, full_name, email, contact_number,
    nationality, years_of_experience, expected_salary, created_at, updated_at, payload
  )
  select
    p_app_id,
    item->>'id',
    item->>'applicationId',
    item->>'fullName',
    item->>'email',
    item->>'contactNumber',
    item->>'nationality',
    public.helped_try_numeric(item->>'yearsOfExperience'),
    public.helped_try_numeric(item->>'expectedSalary'),
    public.helped_try_timestamptz(item->>'createdAt'),
    public.helped_try_timestamptz(item->>'updatedAt'),
    item
  from jsonb_array_elements(coalesce(v_data#>'{ats,profiles}', '[]'::jsonb)) item
  where coalesce(item->>'id', '') <> '';

  insert into public.helped_query_meta (app_id, refreshed_at, source_updated_at, source_bytes)
  values (p_app_id, now(), v_updated_at, pg_column_size(v_data))
  on conflict (app_id) do update
  set refreshed_at = excluded.refreshed_at,
      source_updated_at = excluded.source_updated_at,
      source_bytes = excluded.source_bytes;

  return jsonb_build_object(
    'app_id', p_app_id,
    'refreshed_at', now(),
    'source_updated_at', v_updated_at,
    'maids_count', (select count(*) from public.helped_query_maids where app_id = p_app_id),
    'clients_count', (select count(*) from public.helped_query_clients where app_id = p_app_id),
    'requests_count', (select count(*) from public.helped_query_requests where app_id = p_app_id),
    'request_messages_count', (select count(*) from public.helped_query_request_messages where app_id = p_app_id),
    'ats_applications_count', (select count(*) from public.helped_query_ats_applications where app_id = p_app_id)
  );
end;
$$;

create or replace function public.load_helped_app_data(p_app_id text default 'default')
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select data from public.app_data where id = p_app_id),
    '{}'::jsonb
  );
$$;

create or replace function public.save_helped_app_data(
  p_app_id text,
  p_payload jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.app_data (id, data)
  values (p_app_id, coalesce(p_payload, '{}'::jsonb))
  on conflict (id) do update
  set data = excluded.data;

  perform public.refresh_helped_query_tables(p_app_id);
  return public.load_helped_app_data(p_app_id);
end;
$$;

create or replace function public.get_helped_app_data_overview(p_app_id text default 'default')
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'app_id', ad.id,
    'updated_at', ad.updated_at,
    'data_bytes', pg_column_size(ad.data),
    'maids_count', jsonb_array_length(coalesce(ad.data->'maids', '[]'::jsonb)),
    'clients_count', jsonb_array_length(coalesce(ad.data->'clients', '[]'::jsonb)),
    'agency_admins_count', jsonb_array_length(coalesce(ad.data->'agencyAdmins', '[]'::jsonb)),
    'enquiries_count', jsonb_array_length(coalesce(ad.data->'enquiries', '[]'::jsonb)),
    'direct_sales_count', jsonb_array_length(coalesce(ad.data->'directSales', '[]'::jsonb)),
    'requests_count', jsonb_array_length(coalesce(ad.data->'requests', '[]'::jsonb)),
    'request_conversations_count', jsonb_array_length(coalesce(ad.data->'requestConversations', '[]'::jsonb)),
    'request_messages_count', jsonb_array_length(coalesce(ad.data->'requestMessages', '[]'::jsonb)),
    'chat_messages_count', jsonb_array_length(coalesce(ad.data->'chatMessages', '[]'::jsonb)),
    'employers_count', jsonb_array_length(coalesce(ad.data->'employers', '[]'::jsonb)),
    'employment_contracts_count', jsonb_array_length(coalesce(ad.data->'employmentContracts', '[]'::jsonb)),
    'ats_applications_count', jsonb_array_length(coalesce(ad.data#>'{ats,applications}', '[]'::jsonb)),
    'query_tables_refreshed_at', meta.refreshed_at
  )
  from public.app_data ad
  left join public.helped_query_meta meta on meta.app_id = ad.id
  where ad.id = p_app_id;
$$;

grant execute on function public.refresh_helped_query_tables(text) to service_role;
grant execute on function public.load_helped_app_data(text) to service_role;
grant execute on function public.save_helped_app_data(text, jsonb) to service_role;
grant execute on function public.get_helped_app_data_overview(text) to service_role;

drop view if exists public.app_ats_with_profile;
drop view if exists public.app_request_message_threads;
drop view if exists public.app_requests_with_client;
drop view if exists public.app_data_overview;
drop view if exists public.app_maids;

create or replace view public.app_data_overview as
select
  ad.id,
  ad.created_at,
  ad.updated_at,
  pg_column_size(ad.data) as data_bytes,
  jsonb_array_length(coalesce(ad.data->'maids', '[]'::jsonb)) as maids_count,
  jsonb_array_length(coalesce(ad.data->'clients', '[]'::jsonb)) as clients_count,
  jsonb_array_length(coalesce(ad.data->'agencyAdmins', '[]'::jsonb)) as agency_admins_count,
  jsonb_array_length(coalesce(ad.data->'enquiries', '[]'::jsonb)) as enquiries_count,
  jsonb_array_length(coalesce(ad.data->'directSales', '[]'::jsonb)) as direct_sales_count,
  jsonb_array_length(coalesce(ad.data->'requests', '[]'::jsonb)) as requests_count,
  jsonb_array_length(coalesce(ad.data->'requestConversations', '[]'::jsonb)) as request_conversations_count,
  jsonb_array_length(coalesce(ad.data->'requestMessages', '[]'::jsonb)) as request_messages_count,
  jsonb_array_length(coalesce(ad.data->'chatMessages', '[]'::jsonb)) as chat_messages_count,
  jsonb_array_length(coalesce(ad.data->'employers', '[]'::jsonb)) as employers_count,
  jsonb_array_length(coalesce(ad.data->'employmentContracts', '[]'::jsonb)) as employment_contracts_count,
  jsonb_array_length(coalesce(ad.data#>'{ats,applications}', '[]'::jsonb)) as ats_applications_count,
  jsonb_array_length(coalesce(ad.data#>'{ats,profiles}', '[]'::jsonb)) as ats_profiles_count,
  meta.refreshed_at as query_tables_refreshed_at
from public.app_data ad
left join public.helped_query_meta meta on meta.app_id = ad.id;

create or replace view public.app_maids as
select
  row_number() over () as view_row_id,
  m.reference_code,
  m.full_name,
  m.agency_id,
  m.status,
  m.maid_type as type,
  m.nationality,
  m.is_public,
  m.has_photo,
  m.created_at,
  m.updated_at,
  m.payload as raw_record
from public.helped_query_maids m
where m.app_id = 'default';

create or replace view public.app_requests_with_client as
select
  r.app_id,
  r.request_id,
  r.agency_id,
  r.client_id,
  c.name as client_name,
  c.email as client_email,
  c.phone as client_phone,
  r.request_type,
  r.status,
  r.maid_references,
  r.summary,
  r.updated_by,
  r.created_at,
  r.updated_at,
  r.payload
from public.helped_query_requests r
left join public.helped_query_clients c
  on c.app_id = r.app_id
 and c.record_id = r.client_id;

create or replace view public.app_request_message_threads as
select
  m.app_id,
  c.request_id,
  m.conversation_id,
  m.message_id,
  m.sender_type,
  m.sender_id,
  m.message,
  m.created_at,
  m.payload
from public.helped_query_request_messages m
join public.helped_query_request_conversations c
  on c.app_id = m.app_id
 and c.conversation_id = m.conversation_id;

create or replace view public.app_ats_with_profile as
select
  a.app_id,
  a.application_id,
  a.agency_id,
  a.application_code,
  a.status,
  a.source,
  a.applied_at,
  a.updated_at,
  p.profile_id,
  p.full_name,
  p.email,
  p.contact_number,
  p.nationality,
  p.years_of_experience,
  p.expected_salary,
  a.payload as application_payload,
  p.payload as profile_payload
from public.helped_query_ats_applications a
left join public.helped_query_ats_profiles p
  on p.app_id = a.app_id
 and p.application_id = a.application_id;

create or replace view public.app_ats_document_summary as
select
  ad.id as app_id,
  application.key as application_id,
  count(*) as document_count,
  sum(coalesce(public.helped_try_int(document.value->>'size'), 0)) as total_document_bytes,
  bool_or(coalesce(document.value->>'url', '') like 'data:%') as has_inline_data_urls
from public.app_data ad
cross join lateral jsonb_each(coalesce(ad.data#>'{ats,documents}', '{}'::jsonb)) as application(key, value)
cross join lateral jsonb_array_elements(coalesce(application.value, '[]'::jsonb)) as document(value)
group by ad.id, application.key;

create or replace function public.get_helped_company_payload(p_app_id text default 'default')
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'companyProfile', coalesce(data->'companyProfile', '{}'::jsonb),
    'momPersonnel', coalesce(data->'momPersonnel', '[]'::jsonb),
    'testimonials', coalesce(data->'testimonials', '[]'::jsonb)
  )
  from public.app_data
  where id = p_app_id;
$$;

create or replace function public.get_helped_company_summary(p_app_id text default 'default')
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'publicMaids', (select count(*) from public.helped_query_maids m where m.app_id = p_app_id and m.is_public),
    'hiddenMaids', (select count(*) from public.helped_query_maids m where m.app_id = p_app_id and not m.is_public),
    'totalMaids', (select count(*) from public.helped_query_maids m where m.app_id = p_app_id),
    'maidsWithPhotos', (select count(*) from public.helped_query_maids m where m.app_id = p_app_id and m.has_photo),
    'enquiries', jsonb_array_length(coalesce(ad.data->'enquiries', '[]'::jsonb)),
    'requests', jsonb_array_length(coalesce(ad.data->'directSales', '[]'::jsonb)),
    'pendingRequests', (
      select count(*)
      from public.helped_query_direct_sales ds
      where ds.app_id = p_app_id
        and ds.status = 'pending'
    ),
    'unreadAgencyChats', (
      select count(*)
      from public.helped_query_chat_messages cm
      where cm.app_id = p_app_id
        and cm.sender_role = 'client'
        and coalesce((cm.payload->>'readByAgency')::boolean, false) = false
    ),
    'momPersonnel', jsonb_array_length(coalesce(ad.data->'momPersonnel', '[]'::jsonb)),
    'testimonials', jsonb_array_length(coalesce(ad.data->'testimonials', '[]'::jsonb)),
    'galleryImages', jsonb_array_length(coalesce(ad.data#>'{companyProfile,gallery_image_data_urls}', '[]'::jsonb))
  )
  from public.app_data ad
  where ad.id = p_app_id;
$$;

create or replace function public.get_helped_chat_admin_summary(p_app_id text default 'default')
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object('unreadCount', count(*))
  from public.helped_query_chat_messages
  where app_id = p_app_id
    and sender_role = 'client'
    and coalesce((payload->>'readByAgency')::boolean, false) = false;
$$;

create or replace function public.get_helped_request_status_counts(
  p_app_id text default 'default',
  p_agency_id integer default null,
  p_client_id integer default null
)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'pending', count(*) filter (where status = 'pending'),
    'interested', count(*) filter (where status = 'interested'),
    'direct_hire', count(*) filter (where status = 'direct_hire'),
    'rejected', count(*) filter (where status = 'rejected')
  )
  from public.helped_query_requests
  where app_id = p_app_id
    and (p_agency_id is null or agency_id = p_agency_id)
    and (p_client_id is null or client_id = p_client_id);
$$;

create or replace function public.list_helped_requests(
  p_app_id text default 'default',
  p_agency_id integer default null,
  p_client_id integer default null,
  p_status text default null,
  p_query text default null,
  p_page integer default 1,
  p_page_size integer default 12
)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  with input as (
    select
      greatest(coalesce(p_page, 1), 1) as page,
      least(greatest(coalesce(p_page_size, 12), 1), 24) as page_size,
      nullif(btrim(coalesce(p_query, '')), '') as query_text
  ),
  filtered as (
    select r.*, c.payload as client_payload
    from public.helped_query_requests r
    left join public.helped_query_clients c
      on c.app_id = r.app_id
     and c.record_id = r.client_id
    cross join input i
    where r.app_id = p_app_id
      and (p_agency_id is null or r.agency_id = p_agency_id)
      and (p_client_id is null or r.client_id = p_client_id)
      and (p_status is null or r.status = p_status)
      and (
        i.query_text is null
        or r.request_type ilike '%' || i.query_text || '%'
        or r.status ilike '%' || i.query_text || '%'
        or r.updated_by ilike '%' || i.query_text || '%'
        or r.summary ilike '%' || i.query_text || '%'
        or coalesce(c.name, '') ilike '%' || i.query_text || '%'
        or coalesce(c.email, '') ilike '%' || i.query_text || '%'
        or array_to_string(r.maid_references, ' ') ilike '%' || i.query_text || '%'
      )
  ),
  counted as (
    select count(*)::integer as total from filtered
  ),
  paged as (
    select f.*
    from filtered f
    cross join input i
    order by f.created_at desc nulls last, f.request_id desc
    limit (select page_size from input)
    offset (select (page - 1) * page_size from input)
  ),
  enriched as (
    select
      p.created_at,
      jsonb_build_object(
        'id', p.request_id::text,
        'clientId', p.client_id,
        'agencyId', p.agency_id,
        'type', coalesce(p.request_type, p.payload->>'type'),
        'status', p.status,
        'details', coalesce(p.payload->'details', '{}'::jsonb),
        'maidReferences', coalesce(p.payload->'maidReferences', to_jsonb(p.maid_references)),
        'updatedBy', p.updated_by,
        'createdAt', coalesce(p.payload->>'createdAt', p.created_at::text),
        'updatedAt', coalesce(p.payload->>'updatedAt', p.updated_at::text),
        'client',
          case
            when p.client_payload is null then null
            else jsonb_build_object(
              'id', p.client_id,
              'name', coalesce(p.client_payload->>'name', ''),
              'company', coalesce(p.client_payload->>'company', ''),
              'phone', coalesce(p.client_payload->>'phone', ''),
              'email', coalesce(p.client_payload->>'email', ''),
              'createdAt', coalesce(p.client_payload->>'createdAt', ''),
              'profileImageUrl', coalesce(p.client_payload->>'profileImageUrl', '')
            )
          end,
        'maids',
          (
            select coalesce(
              jsonb_agg(
                jsonb_build_object(
                  'referenceCode', m.reference_code,
                  'fullName', m.full_name,
                  'nationality', m.nationality,
                  'status', coalesce(m.status, 'available'),
                  'type', m.maid_type,
                  'photoDataUrl', coalesce(m.payload->>'photoDataUrl', '')
                )
                order by array_position(p.maid_references, m.reference_code)
              ),
              '[]'::jsonb
            )
            from public.helped_query_maids m
            where m.app_id = p.app_id
              and m.reference_code = any(p.maid_references)
          )
      ) as item
    from paged p
  )
  select jsonb_build_object(
    'data', coalesce((select jsonb_agg(item order by created_at desc nulls last) from enriched), '[]'::jsonb),
    'pageInfo', jsonb_build_object(
      'page', (select page from input),
      'pageSize', (select page_size from input),
      'total', (select total from counted),
      'totalPages', greatest(1, ceil((select total from counted)::numeric / (select page_size from input))::integer)
    )
  );
$$;

grant select on
  public.app_data_overview,
  public.app_maids,
  public.app_requests_with_client,
  public.app_request_message_threads,
  public.app_ats_with_profile,
  public.app_ats_document_summary
to service_role;

grant execute on function public.get_helped_company_payload(text) to service_role;
grant execute on function public.get_helped_company_summary(text) to service_role;
grant execute on function public.get_helped_chat_admin_summary(text) to service_role;
grant execute on function public.get_helped_request_status_counts(text, integer, integer) to service_role;
grant execute on function public.list_helped_requests(text, integer, integer, text, text, integer, integer) to service_role;

create or replace function public.find_large_inline_assets(limit_rows integer default 50)
returns table (
  section text,
  record_id text,
  bytes bigint
)
language sql
stable
security definer
set search_path = public
as $$
  select *
  from (
    select
      'maid.photoDataUrl'::text as section,
      coalesce(maid.value->>'referenceCode', 'unknown') as record_id,
      octet_length(coalesce(maid.value->>'photoDataUrl', ''))::bigint as bytes
    from public.app_data ad
    cross join lateral jsonb_array_elements(coalesce(ad.data->'maids', '[]'::jsonb)) as maid(value)
    where ad.id = 'default'
    union all
    select
      'maid.videoDataUrl'::text as section,
      coalesce(maid.value->>'referenceCode', 'unknown') as record_id,
      octet_length(coalesce(maid.value->>'videoDataUrl', ''))::bigint as bytes
    from public.app_data ad
    cross join lateral jsonb_array_elements(coalesce(ad.data->'maids', '[]'::jsonb)) as maid(value)
    where ad.id = 'default'
    union all
    select
      'ats.document.url'::text as section,
      document.key as record_id,
      octet_length(coalesce(doc.value->>'url', ''))::bigint as bytes
    from public.app_data ad
    cross join lateral jsonb_each(coalesce(ad.data#>'{ats,documents}', '{}'::jsonb)) document(key, value)
    cross join lateral jsonb_array_elements(coalesce(document.value, '[]'::jsonb)) doc(value)
    where ad.id = 'default'
  ) sized
  where bytes > 0
  order by bytes desc
  limit greatest(limit_rows, 1);
$$;

grant execute on function public.find_large_inline_assets(integer) to service_role;

do $$
begin
  if exists (select 1 from information_schema.schemata where schema_name = 'storage') then
    insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    values (
      'ats-applications',
      'ats-applications',
      true,
      10485760,
      array[
        'application/pdf',
        'image/jpeg',
        'image/png',
        'image/webp',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      ]
    )
    on conflict (id) do update
    set public = excluded.public,
        file_size_limit = excluded.file_size_limit,
        allowed_mime_types = excluded.allowed_mime_types;
  end if;
end
$$;

select public.refresh_helped_query_tables('default');

commit;

-- Useful checks after running:
-- select * from public.app_data_overview;
-- select * from public.helped_query_maids order by updated_at desc nulls last limit 50;
-- select * from public.app_requests_with_client order by updated_at desc nulls last limit 50;
-- select * from public.app_request_message_threads order by created_at asc limit 100;
-- select * from public.find_large_inline_assets(50);
