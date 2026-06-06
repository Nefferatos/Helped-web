-- Repair Helped query schema after accidental view drops.
--
-- Paste this whole file into the Supabase SQL editor, then redeploy/reload the app.
-- It is non-destructive: it recreates query views/functions and refreshes derived
-- query tables from public.app_data without deleting the app_data row.

begin;

create extension if not exists pg_trgm;

create index if not exists helped_query_requests_agency_updated_idx
  on public.helped_query_requests (app_id, agency_id, updated_at desc);
create index if not exists helped_query_requests_client_updated_idx
  on public.helped_query_requests (app_id, client_id, updated_at desc);
create index if not exists helped_query_chat_messages_unread_idx
  on public.helped_query_chat_messages (app_id, agency_id, sender_role, created_at desc);
create index if not exists helped_query_clients_record_idx
  on public.helped_query_clients (app_id, record_id);

drop view if exists public.app_ats_with_profile;
drop view if exists public.app_request_message_threads;
drop view if exists public.app_requests_with_client;
drop view if exists public.app_data_overview;
drop view if exists public.app_maids;

create or replace view public.app_data_overview
with (security_invoker = true) as
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

create or replace view public.app_maids
with (security_invoker = true) as
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

create or replace view public.app_requests_with_client
with (security_invoker = true) as
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

create or replace view public.app_request_message_threads
with (security_invoker = true) as
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
  public.app_ats_with_profile
to service_role;

grant execute on function public.get_helped_company_payload(text) to service_role;
grant execute on function public.get_helped_company_summary(text) to service_role;
grant execute on function public.get_helped_chat_admin_summary(text) to service_role;
grant execute on function public.get_helped_request_status_counts(text, integer, integer) to service_role;
grant execute on function public.list_helped_requests(text, integer, integer, text, text, integer, integer) to service_role;

commit;

-- After this script succeeds, run the refresh separately:
-- select public.refresh_helped_query_tables('default');
--
-- Sanity checks:
-- select * from public.app_data_overview where id = 'default';
-- select * from public.app_requests_with_client where app_id = 'default' order by updated_at desc nulls last limit 20;
-- select public.get_helped_company_summary('default');
-- select public.get_helped_chat_admin_summary('default');
