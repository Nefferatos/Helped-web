-- Helped Web: Supabase setup for the current Cloudflare Worker architecture
--
-- This project currently stores most application data inside one jsonb row in
-- public.app_data. That is what the Worker expects today, so this script keeps
-- that contract intact while making the database safer and easier to inspect.
--
-- Paste this whole file into the Supabase SQL editor and run it once.

begin;

create extension if not exists pgcrypto;

create table if not exists public.app_data (
  id text primary key,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint app_data_id_not_blank check (length(btrim(id)) > 0),
  constraint app_data_json_object check (jsonb_typeof(data) = 'object')
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists app_data_set_updated_at on public.app_data;
create trigger app_data_set_updated_at
before update on public.app_data
for each row
execute function public.set_updated_at();

create index if not exists app_data_updated_at_idx
  on public.app_data (updated_at desc);

create index if not exists app_data_data_gin_idx
  on public.app_data
  using gin (data jsonb_path_ops);

insert into public.app_data (id, data)
values
  ('default', '{}'::jsonb),
  ('default:agency-admin-sessions', '{"agencyAdminSessions":[]}'::jsonb),
  ('default:agency-admin-auth', '{"agencyAdmins":[]}'::jsonb)
on conflict (id) do nothing;

revoke all on table public.app_data from anon, authenticated;
grant select on table public.app_data to service_role;
grant insert on table public.app_data to service_role;
grant update on table public.app_data to service_role;
grant delete on table public.app_data to service_role;

alter table public.app_data enable row level security;

drop policy if exists "service role manages app_data" on public.app_data;
create policy "service role manages app_data"
on public.app_data
for all
to service_role
using (true)
with check (true);

create or replace view public.app_data_overview as
select
  id,
  created_at,
  updated_at,
  pg_column_size(data) as data_bytes,
  jsonb_array_length(coalesce(data->'maids', '[]'::jsonb)) as maids_count,
  jsonb_array_length(coalesce(data->'clients', '[]'::jsonb)) as clients_count,
  jsonb_array_length(coalesce(data->'agencyAdmins', '[]'::jsonb)) as agency_admins_count,
  jsonb_array_length(coalesce(data->'enquiries', '[]'::jsonb)) as enquiries_count,
  jsonb_array_length(coalesce(data->'directSales', '[]'::jsonb)) as direct_sales_count,
  jsonb_array_length(coalesce(data->'chatMessages', '[]'::jsonb)) as chat_messages_count,
  jsonb_array_length(coalesce(data#>'{ats,applications}', '[]'::jsonb)) as ats_applications_count,
  jsonb_array_length(coalesce(data#>'{ats,profiles}', '[]'::jsonb)) as ats_profiles_count
from public.app_data;

create or replace view public.app_maids as
select
  row_number() over () as view_row_id,
  src.reference_code,
  src.full_name,
  src.agency_id,
  src.status,
  src.type,
  src.nationality,
  src.is_public,
  src.has_photo,
  src.created_at,
  src.updated_at,
  src.raw as raw_record
from (
  select
    jsonb_extract_path_text(maid.value, 'referenceCode') as reference_code,
    jsonb_extract_path_text(maid.value, 'fullName') as full_name,
    nullif(jsonb_extract_path_text(maid.value, 'agencyId'), '')::integer as agency_id,
    jsonb_extract_path_text(maid.value, 'status') as status,
    jsonb_extract_path_text(maid.value, 'type') as type,
    jsonb_extract_path_text(maid.value, 'nationality') as nationality,
    coalesce((maid.value->>'isPublic')::boolean, false) as is_public,
    coalesce((maid.value->>'hasPhoto')::boolean, false) as has_photo,
    nullif(jsonb_extract_path_text(maid.value, 'createdAt'), '')::timestamptz as created_at,
    nullif(jsonb_extract_path_text(maid.value, 'updatedAt'), '')::timestamptz as updated_at,
    maid.value as raw
  from public.app_data ad
  cross join lateral jsonb_array_elements(coalesce(ad.data->'maids', '[]'::jsonb)) as maid(value)
  where ad.id = 'default'
) as src;

create or replace view public.app_agency_admins as
select
  row_number() over () as view_row_id,
  src.id,
  src.agency_id,
  src.username,
  src.email,
  src.agency_name,
  src.email_verified,
  src.created_at,
  src.raw as raw_record
from (
  select
    nullif(jsonb_extract_path_text(admin.value, 'id'), '')::integer as id,
    nullif(jsonb_extract_path_text(admin.value, 'agencyId'), '')::integer as agency_id,
    jsonb_extract_path_text(admin.value, 'username') as username,
    jsonb_extract_path_text(admin.value, 'email') as email,
    jsonb_extract_path_text(admin.value, 'agencyName') as agency_name,
    coalesce((admin.value->>'emailVerified')::boolean, false) as email_verified,
    nullif(jsonb_extract_path_text(admin.value, 'createdAt'), '')::timestamptz as created_at,
    admin.value as raw
  from public.app_data ad
  cross join lateral jsonb_array_elements(coalesce(ad.data->'agencyAdmins', '[]'::jsonb)) as admin(value)
  where ad.id = 'default'
) as src;

create or replace view public.app_enquiries as
select
  row_number() over () as view_row_id,
  src.id,
  src.username,
  src.email,
  src.phone,
  src.created_at,
  src.raw as raw_record
from (
  select
    nullif(jsonb_extract_path_text(enquiry.value, 'id'), '')::integer as id,
    jsonb_extract_path_text(enquiry.value, 'username') as username,
    jsonb_extract_path_text(enquiry.value, 'email') as email,
    jsonb_extract_path_text(enquiry.value, 'phone') as phone,
    nullif(jsonb_extract_path_text(enquiry.value, 'createdAt'), '')::timestamptz as created_at,
    enquiry.value as raw
  from public.app_data ad
  cross join lateral jsonb_array_elements(coalesce(ad.data->'enquiries', '[]'::jsonb)) as enquiry(value)
  where ad.id = 'default'
) as src;

create or replace view public.app_ats_applications as
select
  row_number() over () as view_row_id,
  src.id,
  src.application_code,
  src.profile_id,
  src.agency_id,
  src.status,
  src.source,
  src.applied_at,
  src.updated_at,
  src.raw as raw_record
from (
  select
    jsonb_extract_path_text(application.value, 'id') as id,
    jsonb_extract_path_text(application.value, 'applicationCode') as application_code,
    jsonb_extract_path_text(application.value, 'profileId') as profile_id,
    nullif(jsonb_extract_path_text(application.value, 'agencyId'), '')::integer as agency_id,
    jsonb_extract_path_text(application.value, 'status') as status,
    jsonb_extract_path_text(application.value, 'source') as source,
    nullif(jsonb_extract_path_text(application.value, 'appliedAt'), '')::timestamptz as applied_at,
    nullif(jsonb_extract_path_text(application.value, 'updatedAt'), '')::timestamptz as updated_at,
    application.value as raw
  from public.app_data ad
  cross join lateral jsonb_array_elements(coalesce(ad.data#>'{ats,applications}', '[]'::jsonb)) as application(value)
  where ad.id = 'default'
) as src;

create or replace view public.app_ats_profiles as
select
  row_number() over () as view_row_id,
  src.id,
  src.application_id,
  src.full_name,
  src.email,
  src.contact_number,
  src.nationality,
  src.years_of_experience,
  src.expected_salary,
  src.created_at,
  src.updated_at,
  src.raw as raw_record
from (
  select
    jsonb_extract_path_text(profile.value, 'id') as id,
    jsonb_extract_path_text(profile.value, 'applicationId') as application_id,
    jsonb_extract_path_text(profile.value, 'fullName') as full_name,
    jsonb_extract_path_text(profile.value, 'email') as email,
    jsonb_extract_path_text(profile.value, 'contactNumber') as contact_number,
    jsonb_extract_path_text(profile.value, 'nationality') as nationality,
    nullif(jsonb_extract_path_text(profile.value, 'yearsOfExperience'), '')::numeric as years_of_experience,
    nullif(jsonb_extract_path_text(profile.value, 'expectedSalary'), '')::numeric as expected_salary,
    nullif(jsonb_extract_path_text(profile.value, 'createdAt'), '')::timestamptz as created_at,
    nullif(jsonb_extract_path_text(profile.value, 'updatedAt'), '')::timestamptz as updated_at,
    profile.value as raw
  from public.app_data ad
  cross join lateral jsonb_array_elements(coalesce(ad.data#>'{ats,profiles}', '[]'::jsonb)) as profile(value)
  where ad.id = 'default'
) as src;

create or replace view public.app_ats_document_summary as
select
  application.key as application_id,
  count(*) as document_count,
  sum(coalesce(nullif(document.value->>'size', '')::bigint, 0)) as total_document_bytes,
  bool_or(coalesce(document.value->>'url', '') like 'data:%') as has_inline_data_urls
from public.app_data ad
cross join lateral jsonb_each(coalesce(ad.data#>'{ats,documents}', '{}'::jsonb)) as application(key, value)
cross join lateral jsonb_array_elements(coalesce(application.value, '[]'::jsonb)) as document(value)
where ad.id = 'default'
group by application.key;

create or replace function public.find_large_inline_assets(limit_rows integer default 50)
returns table (
  section text,
  record_id text,
  bytes bigint
)
language sql
stable
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
  ) sized
  where bytes > 0
  order by bytes desc
  limit greatest(limit_rows, 1);
$$;

create or replace function public.update_app_maid_visibility(
  p_app_id text,
  p_reference_code text,
  p_is_public boolean
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_data jsonb;
  v_maids jsonb;
  v_next_maids jsonb := '[]'::jsonb;
  v_item jsonb;
  v_updated_item jsonb := null;
  v_updated_at text := now()::text;
begin
  select data into v_data
  from public.app_data
  where id = p_app_id
  for update;

  if v_data is null then
    return null;
  end if;

  v_maids := coalesce(v_data->'maids', '[]'::jsonb);

  for v_item in select value from jsonb_array_elements(v_maids)
  loop
    if v_item->>'referenceCode' = p_reference_code then
      v_updated_item :=
        jsonb_set(
          jsonb_set(v_item, '{isPublic}', to_jsonb(p_is_public), true),
          '{updatedAt}',
          to_jsonb(v_updated_at),
          true
        );
      v_next_maids := v_next_maids || jsonb_build_array(v_updated_item);
    else
      v_next_maids := v_next_maids || jsonb_build_array(v_item);
    end if;
  end loop;

  if v_updated_item is null then
    return null;
  end if;

  update public.app_data
  set data = jsonb_set(v_data, '{maids}', v_next_maids, true)
  where id = p_app_id;

  return v_updated_item;
end;
$$;

grant execute on function public.update_app_maid_visibility(text, text, boolean) to service_role;

create or replace function public.create_app_maid(
  p_app_id text,
  p_payload jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_data jsonb;
  v_maids jsonb;
  v_counters jsonb;
  v_next_id integer;
  v_now text := now()::text;
  v_record jsonb;
begin
  select data into v_data
  from public.app_data
  where id = p_app_id
  for update;

  if v_data is null then
    insert into public.app_data (id, data)
    values (p_app_id, '{}'::jsonb)
    returning data into v_data;
  end if;

  if exists (
    select 1
    from jsonb_array_elements(coalesce(v_data->'maids', '[]'::jsonb)) maid(value)
    where maid.value->>'referenceCode' = p_payload->>'referenceCode'
  ) then
    raise exception 'REFERENCE_CODE_EXISTS' using errcode = '23505';
  end if;

  v_maids := coalesce(v_data->'maids', '[]'::jsonb);
  v_counters := coalesce(v_data->'counters', '{}'::jsonb);
  v_next_id := greatest(
    coalesce(nullif(v_counters->>'maids', '')::integer, 1),
    coalesce(
      (
        select max(nullif(value->>'id', '')::integer) + 1
        from jsonb_array_elements(v_maids)
      ),
      1
    )
  );

  v_record :=
    jsonb_set(
      jsonb_set(
        jsonb_set(p_payload, '{id}', to_jsonb(v_next_id), true),
        '{createdAt}',
        to_jsonb(v_now),
        true
      ),
      '{updatedAt}',
      to_jsonb(v_now),
      true
    );

  v_data := jsonb_set(v_data, '{maids}', jsonb_build_array(v_record) || v_maids, true);
  v_data := jsonb_set(v_data, '{counters,maids}', to_jsonb(v_next_id + 1), true);

  update public.app_data
  set data = v_data
  where id = p_app_id;

  return v_record;
end;
$$;

create or replace function public.update_app_maid(
  p_app_id text,
  p_reference_code text,
  p_payload jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_data jsonb;
  v_maids jsonb;
  v_next_maids jsonb := '[]'::jsonb;
  v_item jsonb;
  v_updated_item jsonb := null;
  v_now text := now()::text;
  v_next_reference text := p_payload->>'referenceCode';
begin
  select data into v_data
  from public.app_data
  where id = p_app_id
  for update;

  if v_data is null then
    return null;
  end if;

  if exists (
    select 1
    from jsonb_array_elements(coalesce(v_data->'maids', '[]'::jsonb)) maid(value)
    where maid.value->>'referenceCode' = v_next_reference
      and maid.value->>'referenceCode' <> p_reference_code
  ) then
    raise exception 'REFERENCE_CODE_EXISTS' using errcode = '23505';
  end if;

  v_maids := coalesce(v_data->'maids', '[]'::jsonb);

  for v_item in select value from jsonb_array_elements(v_maids)
  loop
    if v_item->>'referenceCode' = p_reference_code then
      v_updated_item :=
        jsonb_set(
          (v_item || p_payload),
          '{updatedAt}',
          to_jsonb(v_now),
          true
        );
      v_next_maids := v_next_maids || jsonb_build_array(v_updated_item);
    else
      v_next_maids := v_next_maids || jsonb_build_array(v_item);
    end if;
  end loop;

  if v_updated_item is null then
    return null;
  end if;

  update public.app_data
  set data = jsonb_set(v_data, '{maids}', v_next_maids, true)
  where id = p_app_id;

  return v_updated_item;
end;
$$;

grant execute on function public.create_app_maid(text, jsonb) to service_role;
grant execute on function public.update_app_maid(text, text, jsonb) to service_role;

commit;

-- Helpful SQL editor queries after setup:
--
-- select * from public.app_data_overview order by updated_at desc;
-- select * from public.app_maids order by updated_at desc limit 100;
-- select * from public.app_ats_applications order by applied_at desc limit 100;
-- select * from public.app_ats_document_summary order by total_document_bytes desc limit 50;
-- select * from public.find_large_inline_assets(50);
