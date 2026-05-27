-- Helped Web: normalized Supabase schema for the Cloudflare Worker
--
-- This is the "Option B" setup:
-- 1. Creates normalized tables for the app domains.
-- 2. Adds RPC functions the Worker can call to load/save the whole app shape.
-- 3. Adds a migration helper to move the legacy public.app_data blob into
--    the normalized tables.
--
-- Rollout:
-- 1. Run this file in Supabase SQL editor.
-- 2. Run: select public.migrate_helped_blob_to_normalized('default');
-- 3. Set SUPABASE_USE_NORMALIZED=true in the Worker.
-- 4. Redeploy the Worker.

begin;

create extension if not exists pgcrypto;

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

create table if not exists public.helped_company_profiles (
  app_id text primary key,
  company_id integer not null default 1,
  updated_at timestamptz not null default now(),
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint helped_company_profiles_payload_object check (jsonb_typeof(payload) = 'object')
);

create table if not exists public.helped_mom_personnel (
  app_id text not null,
  record_id integer not null,
  company_id integer,
  created_at timestamptz,
  payload jsonb not null,
  row_created_at timestamptz not null default now(),
  row_updated_at timestamptz not null default now(),
  primary key (app_id, record_id),
  constraint helped_mom_personnel_payload_object check (jsonb_typeof(payload) = 'object')
);

create table if not exists public.helped_testimonials (
  app_id text not null,
  record_id integer not null,
  company_id integer,
  created_at timestamptz,
  payload jsonb not null,
  row_created_at timestamptz not null default now(),
  row_updated_at timestamptz not null default now(),
  primary key (app_id, record_id),
  constraint helped_testimonials_payload_object check (jsonb_typeof(payload) = 'object')
);

create table if not exists public.helped_maids (
  app_id text not null,
  record_id integer not null,
  agency_id integer,
  reference_code text,
  full_name text,
  status text,
  nationality text,
  maid_type text,
  is_public boolean not null default false,
  has_photo boolean not null default false,
  created_at timestamptz,
  updated_at timestamptz,
  payload jsonb not null,
  row_created_at timestamptz not null default now(),
  row_updated_at timestamptz not null default now(),
  primary key (app_id, record_id),
  constraint helped_maids_payload_object check (jsonb_typeof(payload) = 'object')
);

create table if not exists public.helped_enquiries (
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
  constraint helped_enquiries_payload_object check (jsonb_typeof(payload) = 'object')
);

create table if not exists public.helped_clients (
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
  constraint helped_clients_payload_object check (jsonb_typeof(payload) = 'object')
);

create table if not exists public.helped_client_sessions (
  app_id text not null,
  token text not null,
  client_id integer not null,
  created_at timestamptz,
  payload jsonb not null,
  row_created_at timestamptz not null default now(),
  row_updated_at timestamptz not null default now(),
  primary key (app_id, token),
  constraint helped_client_sessions_payload_object check (jsonb_typeof(payload) = 'object')
);

create table if not exists public.helped_agency_admins (
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
  constraint helped_agency_admins_payload_object check (jsonb_typeof(payload) = 'object')
);

create table if not exists public.helped_agency_admin_sessions (
  app_id text not null,
  token text not null,
  admin_id integer not null,
  created_at timestamptz,
  payload jsonb not null,
  row_created_at timestamptz not null default now(),
  row_updated_at timestamptz not null default now(),
  primary key (app_id, token),
  constraint helped_agency_admin_sessions_payload_object check (jsonb_typeof(payload) = 'object')
);

create table if not exists public.helped_direct_sales (
  app_id text not null,
  record_id integer not null,
  client_id integer,
  maid_reference_code text,
  status text,
  created_at timestamptz,
  payload jsonb not null,
  row_created_at timestamptz not null default now(),
  row_updated_at timestamptz not null default now(),
  primary key (app_id, record_id),
  constraint helped_direct_sales_payload_object check (jsonb_typeof(payload) = 'object')
);

create table if not exists public.helped_chat_messages (
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
  constraint helped_chat_messages_payload_object check (jsonb_typeof(payload) = 'object')
);

create table if not exists public.helped_employers (
  app_id text not null,
  record_id integer not null,
  ref_code text,
  created_at timestamptz,
  updated_at timestamptz,
  payload jsonb not null,
  row_created_at timestamptz not null default now(),
  row_updated_at timestamptz not null default now(),
  primary key (app_id, record_id),
  constraint helped_employers_payload_object check (jsonb_typeof(payload) = 'object')
);

create table if not exists public.helped_employment_contracts (
  app_id text not null,
  record_id integer not null,
  ref_code text,
  employer_ref_code text,
  maid_reference_code text,
  created_at timestamptz,
  updated_at timestamptz,
  payload jsonb not null,
  row_created_at timestamptz not null default now(),
  row_updated_at timestamptz not null default now(),
  primary key (app_id, record_id),
  constraint helped_employment_contracts_payload_object check (jsonb_typeof(payload) = 'object')
);

create table if not exists public.helped_ats_applications (
  app_id text not null,
  record_id text not null,
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
  primary key (app_id, record_id),
  constraint helped_ats_applications_payload_object check (jsonb_typeof(payload) = 'object')
);

create table if not exists public.helped_ats_profiles (
  app_id text not null,
  record_id text not null,
  application_id text not null,
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
  primary key (app_id, record_id),
  constraint helped_ats_profiles_payload_object check (jsonb_typeof(payload) = 'object')
);

create table if not exists public.helped_ats_scores (
  app_id text not null,
  application_id text not null,
  score numeric,
  category text,
  payload jsonb not null,
  row_created_at timestamptz not null default now(),
  row_updated_at timestamptz not null default now(),
  primary key (app_id, application_id),
  constraint helped_ats_scores_payload_object check (jsonb_typeof(payload) = 'object')
);

create table if not exists public.helped_ats_history (
  app_id text not null,
  record_id text not null,
  application_id text not null,
  to_stage text,
  created_at timestamptz,
  payload jsonb not null,
  row_created_at timestamptz not null default now(),
  row_updated_at timestamptz not null default now(),
  primary key (app_id, record_id),
  constraint helped_ats_history_payload_object check (jsonb_typeof(payload) = 'object')
);

create table if not exists public.helped_ats_documents (
  app_id text not null,
  record_id text not null,
  application_id text not null,
  document_type text,
  file_name text,
  uploaded_at timestamptz,
  file_size bigint,
  payload jsonb not null,
  row_created_at timestamptz not null default now(),
  row_updated_at timestamptz not null default now(),
  primary key (app_id, record_id),
  constraint helped_ats_documents_payload_object check (jsonb_typeof(payload) = 'object')
);

create table if not exists public.helped_ats_notifications (
  app_id text not null,
  record_id text not null,
  application_id text not null,
  event text,
  channel text,
  created_at timestamptz,
  payload jsonb not null,
  row_created_at timestamptz not null default now(),
  row_updated_at timestamptz not null default now(),
  primary key (app_id, record_id),
  constraint helped_ats_notifications_payload_object check (jsonb_typeof(payload) = 'object')
);

create table if not exists public.helped_ats_presets (
  app_id text not null,
  record_id text not null,
  agency_id integer,
  preset_name text,
  created_at timestamptz,
  payload jsonb not null,
  row_created_at timestamptz not null default now(),
  row_updated_at timestamptz not null default now(),
  primary key (app_id, record_id),
  constraint helped_ats_presets_payload_object check (jsonb_typeof(payload) = 'object')
);

create table if not exists public.helped_counters (
  app_id text primary key,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint helped_counters_payload_object check (jsonb_typeof(payload) = 'object')
);

create table if not exists public.helped_storage_meta (
  app_id text primary key,
  last_saved_at timestamptz not null default now(),
  source text not null default 'normalized',
  notes jsonb not null default '{}'::jsonb
);

drop trigger if exists trg_helped_company_profiles_updated_at on public.helped_company_profiles;
create trigger trg_helped_company_profiles_updated_at before update on public.helped_company_profiles for each row execute function public.set_updated_at();
drop trigger if exists trg_helped_counters_updated_at on public.helped_counters;
create trigger trg_helped_counters_updated_at before update on public.helped_counters for each row execute function public.set_updated_at();

drop trigger if exists trg_helped_mom_personnel_updated_at on public.helped_mom_personnel;
create trigger trg_helped_mom_personnel_updated_at before update on public.helped_mom_personnel for each row execute function public.set_row_updated_at();
drop trigger if exists trg_helped_testimonials_updated_at on public.helped_testimonials;
create trigger trg_helped_testimonials_updated_at before update on public.helped_testimonials for each row execute function public.set_row_updated_at();
drop trigger if exists trg_helped_maids_updated_at on public.helped_maids;
create trigger trg_helped_maids_updated_at before update on public.helped_maids for each row execute function public.set_row_updated_at();
drop trigger if exists trg_helped_enquiries_updated_at on public.helped_enquiries;
create trigger trg_helped_enquiries_updated_at before update on public.helped_enquiries for each row execute function public.set_row_updated_at();
drop trigger if exists trg_helped_clients_updated_at on public.helped_clients;
create trigger trg_helped_clients_updated_at before update on public.helped_clients for each row execute function public.set_row_updated_at();
drop trigger if exists trg_helped_client_sessions_updated_at on public.helped_client_sessions;
create trigger trg_helped_client_sessions_updated_at before update on public.helped_client_sessions for each row execute function public.set_row_updated_at();
drop trigger if exists trg_helped_agency_admins_updated_at on public.helped_agency_admins;
create trigger trg_helped_agency_admins_updated_at before update on public.helped_agency_admins for each row execute function public.set_row_updated_at();
drop trigger if exists trg_helped_agency_admin_sessions_updated_at on public.helped_agency_admin_sessions;
create trigger trg_helped_agency_admin_sessions_updated_at before update on public.helped_agency_admin_sessions for each row execute function public.set_row_updated_at();
drop trigger if exists trg_helped_direct_sales_updated_at on public.helped_direct_sales;
create trigger trg_helped_direct_sales_updated_at before update on public.helped_direct_sales for each row execute function public.set_row_updated_at();
drop trigger if exists trg_helped_chat_messages_updated_at on public.helped_chat_messages;
create trigger trg_helped_chat_messages_updated_at before update on public.helped_chat_messages for each row execute function public.set_row_updated_at();
drop trigger if exists trg_helped_employers_updated_at on public.helped_employers;
create trigger trg_helped_employers_updated_at before update on public.helped_employers for each row execute function public.set_row_updated_at();
drop trigger if exists trg_helped_employment_contracts_updated_at on public.helped_employment_contracts;
create trigger trg_helped_employment_contracts_updated_at before update on public.helped_employment_contracts for each row execute function public.set_row_updated_at();
drop trigger if exists trg_helped_ats_applications_updated_at on public.helped_ats_applications;
create trigger trg_helped_ats_applications_updated_at before update on public.helped_ats_applications for each row execute function public.set_row_updated_at();
drop trigger if exists trg_helped_ats_profiles_updated_at on public.helped_ats_profiles;
create trigger trg_helped_ats_profiles_updated_at before update on public.helped_ats_profiles for each row execute function public.set_row_updated_at();
drop trigger if exists trg_helped_ats_scores_updated_at on public.helped_ats_scores;
create trigger trg_helped_ats_scores_updated_at before update on public.helped_ats_scores for each row execute function public.set_row_updated_at();
drop trigger if exists trg_helped_ats_history_updated_at on public.helped_ats_history;
create trigger trg_helped_ats_history_updated_at before update on public.helped_ats_history for each row execute function public.set_row_updated_at();
drop trigger if exists trg_helped_ats_documents_updated_at on public.helped_ats_documents;
create trigger trg_helped_ats_documents_updated_at before update on public.helped_ats_documents for each row execute function public.set_row_updated_at();
drop trigger if exists trg_helped_ats_notifications_updated_at on public.helped_ats_notifications;
create trigger trg_helped_ats_notifications_updated_at before update on public.helped_ats_notifications for each row execute function public.set_row_updated_at();
drop trigger if exists trg_helped_ats_presets_updated_at on public.helped_ats_presets;
create trigger trg_helped_ats_presets_updated_at before update on public.helped_ats_presets for each row execute function public.set_row_updated_at();

create index if not exists helped_maids_lookup_idx
  on public.helped_maids (app_id, agency_id, is_public, updated_at desc);
create unique index if not exists helped_maids_reference_code_idx
  on public.helped_maids (app_id, reference_code)
  where reference_code is not null;
create index if not exists helped_agency_admins_login_idx
  on public.helped_agency_admins (app_id, username, email);
create index if not exists helped_agency_admins_supabase_user_idx
  on public.helped_agency_admins (app_id, supabase_user_id);
create index if not exists helped_clients_lookup_idx
  on public.helped_clients (app_id, email, supabase_user_id);
create index if not exists helped_client_sessions_client_idx
  on public.helped_client_sessions (app_id, client_id, created_at desc);
create index if not exists helped_agency_admin_sessions_admin_idx
  on public.helped_agency_admin_sessions (app_id, admin_id, created_at desc);
create index if not exists helped_chat_messages_lookup_idx
  on public.helped_chat_messages (app_id, conversation_type, created_at desc);
create index if not exists helped_direct_sales_lookup_idx
  on public.helped_direct_sales (app_id, client_id, maid_reference_code, created_at desc);
create index if not exists helped_employers_ref_idx
  on public.helped_employers (app_id, ref_code);
create index if not exists helped_employment_contracts_ref_idx
  on public.helped_employment_contracts (app_id, ref_code, employer_ref_code, maid_reference_code);
create index if not exists helped_ats_applications_lookup_idx
  on public.helped_ats_applications (app_id, agency_id, status, applied_at desc);
create unique index if not exists helped_ats_applications_code_idx
  on public.helped_ats_applications (app_id, application_code);
create index if not exists helped_ats_profiles_lookup_idx
  on public.helped_ats_profiles (app_id, application_id, full_name);
create index if not exists helped_ats_scores_lookup_idx
  on public.helped_ats_scores (app_id, score desc);
create index if not exists helped_ats_history_lookup_idx
  on public.helped_ats_history (app_id, application_id, created_at desc);
create index if not exists helped_ats_documents_lookup_idx
  on public.helped_ats_documents (app_id, application_id, uploaded_at desc);
create index if not exists helped_ats_notifications_lookup_idx
  on public.helped_ats_notifications (app_id, application_id, created_at desc);
create index if not exists helped_ats_presets_lookup_idx
  on public.helped_ats_presets (app_id, agency_id, created_at desc);

revoke all on
  public.helped_company_profiles,
  public.helped_mom_personnel,
  public.helped_testimonials,
  public.helped_maids,
  public.helped_enquiries,
  public.helped_clients,
  public.helped_client_sessions,
  public.helped_agency_admins,
  public.helped_agency_admin_sessions,
  public.helped_direct_sales,
  public.helped_chat_messages,
  public.helped_employers,
  public.helped_employment_contracts,
  public.helped_ats_applications,
  public.helped_ats_profiles,
  public.helped_ats_scores,
  public.helped_ats_history,
  public.helped_ats_documents,
  public.helped_ats_notifications,
  public.helped_ats_presets,
  public.helped_counters,
  public.helped_storage_meta
from anon, authenticated;
grant select, insert, update, delete on
  public.helped_company_profiles,
  public.helped_mom_personnel,
  public.helped_testimonials,
  public.helped_maids,
  public.helped_enquiries,
  public.helped_clients,
  public.helped_client_sessions,
  public.helped_agency_admins,
  public.helped_agency_admin_sessions,
  public.helped_direct_sales,
  public.helped_chat_messages,
  public.helped_employers,
  public.helped_employment_contracts,
  public.helped_ats_applications,
  public.helped_ats_profiles,
  public.helped_ats_scores,
  public.helped_ats_history,
  public.helped_ats_documents,
  public.helped_ats_notifications,
  public.helped_ats_presets,
  public.helped_counters,
  public.helped_storage_meta
to service_role;

alter table public.helped_company_profiles enable row level security;
alter table public.helped_mom_personnel enable row level security;
alter table public.helped_testimonials enable row level security;
alter table public.helped_maids enable row level security;
alter table public.helped_enquiries enable row level security;
alter table public.helped_clients enable row level security;
alter table public.helped_client_sessions enable row level security;
alter table public.helped_agency_admins enable row level security;
alter table public.helped_agency_admin_sessions enable row level security;
alter table public.helped_direct_sales enable row level security;
alter table public.helped_chat_messages enable row level security;
alter table public.helped_employers enable row level security;
alter table public.helped_employment_contracts enable row level security;
alter table public.helped_ats_applications enable row level security;
alter table public.helped_ats_profiles enable row level security;
alter table public.helped_ats_scores enable row level security;
alter table public.helped_ats_history enable row level security;
alter table public.helped_ats_documents enable row level security;
alter table public.helped_ats_notifications enable row level security;
alter table public.helped_ats_presets enable row level security;
alter table public.helped_counters enable row level security;
alter table public.helped_storage_meta enable row level security;

do $$
declare
  tbl text;
begin
  foreach tbl in array array[
    'helped_company_profiles',
    'helped_mom_personnel',
    'helped_testimonials',
    'helped_maids',
    'helped_enquiries',
    'helped_clients',
    'helped_client_sessions',
    'helped_agency_admins',
    'helped_agency_admin_sessions',
    'helped_direct_sales',
    'helped_chat_messages',
    'helped_employers',
    'helped_employment_contracts',
    'helped_ats_applications',
    'helped_ats_profiles',
    'helped_ats_scores',
    'helped_ats_history',
    'helped_ats_documents',
    'helped_ats_notifications',
    'helped_ats_presets',
    'helped_counters',
    'helped_storage_meta'
  ]
  loop
    execute format('drop policy if exists "service role manages %1$s" on public.%1$s', tbl);
    execute format(
      'create policy "service role manages %1$s" on public.%1$s for all to service_role using (true) with check (true)',
      tbl
    );
  end loop;
end
$$;

create or replace function public.load_helped_app_data(p_app_id text default 'default')
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'companyProfile', coalesce(
      (select payload from public.helped_company_profiles where app_id = p_app_id limit 1),
      '{}'::jsonb
    ),
    'momPersonnel', coalesce(
      (select jsonb_agg(payload order by record_id) from public.helped_mom_personnel where app_id = p_app_id),
      '[]'::jsonb
    ),
    'testimonials', coalesce(
      (select jsonb_agg(payload order by record_id) from public.helped_testimonials where app_id = p_app_id),
      '[]'::jsonb
    ),
    'maids', coalesce(
      (select jsonb_agg(payload order by updated_at desc nulls last, record_id desc) from public.helped_maids where app_id = p_app_id),
      '[]'::jsonb
    ),
    'enquiries', coalesce(
      (select jsonb_agg(payload order by created_at desc nulls last, record_id desc) from public.helped_enquiries where app_id = p_app_id),
      '[]'::jsonb
    ),
    'clients', coalesce(
      (select jsonb_agg(payload order by record_id) from public.helped_clients where app_id = p_app_id),
      '[]'::jsonb
    ),
    'clientSessions', coalesce(
      (select jsonb_agg(payload order by created_at desc nulls last) from public.helped_client_sessions where app_id = p_app_id),
      '[]'::jsonb
    ),
    'agencyAdmins', coalesce(
      (select jsonb_agg(payload order by record_id) from public.helped_agency_admins where app_id = p_app_id),
      '[]'::jsonb
    ),
    'agencyAdminSessions', coalesce(
      (select jsonb_agg(payload order by created_at desc nulls last) from public.helped_agency_admin_sessions where app_id = p_app_id),
      '[]'::jsonb
    ),
    'directSales', coalesce(
      (select jsonb_agg(payload order by created_at desc nulls last, record_id desc) from public.helped_direct_sales where app_id = p_app_id),
      '[]'::jsonb
    ),
    'chatMessages', coalesce(
      (select jsonb_agg(payload order by created_at asc nulls last, record_id asc) from public.helped_chat_messages where app_id = p_app_id),
      '[]'::jsonb
    ),
    'employers', coalesce(
      (select jsonb_agg(payload order by updated_at desc nulls last, record_id desc) from public.helped_employers where app_id = p_app_id),
      '[]'::jsonb
    ),
    'employmentContracts', coalesce(
      (select jsonb_agg(payload order by updated_at desc nulls last, record_id desc) from public.helped_employment_contracts where app_id = p_app_id),
      '[]'::jsonb
    ),
    'ats', jsonb_build_object(
      'applications', coalesce(
        (select jsonb_agg(payload order by applied_at desc nulls last, record_id desc) from public.helped_ats_applications where app_id = p_app_id),
        '[]'::jsonb
      ),
      'profiles', coalesce(
        (select jsonb_agg(payload order by updated_at desc nulls last, record_id desc) from public.helped_ats_profiles where app_id = p_app_id),
        '[]'::jsonb
      ),
      'scores', coalesce(
        (select jsonb_object_agg(application_id, payload) from public.helped_ats_scores where app_id = p_app_id),
        '{}'::jsonb
      ),
      'history', coalesce(
        (
          select jsonb_object_agg(application_id, history_payload)
          from (
            select
              application_id,
              jsonb_agg(payload order by created_at desc nulls last, record_id desc) as history_payload
            from public.helped_ats_history
            where app_id = p_app_id
            group by application_id
          ) grouped_history
        ),
        '{}'::jsonb
      ),
      'documents', coalesce(
        (
          select jsonb_object_agg(application_id, documents_payload)
          from (
            select
              application_id,
              jsonb_agg(payload order by uploaded_at desc nulls last, record_id desc) as documents_payload
            from public.helped_ats_documents
            where app_id = p_app_id
            group by application_id
          ) grouped_documents
        ),
        '{}'::jsonb
      ),
      'notifications', coalesce(
        (
          select jsonb_object_agg(application_id, notifications_payload)
          from (
            select
              application_id,
              jsonb_agg(payload order by created_at desc nulls last, record_id desc) as notifications_payload
            from public.helped_ats_notifications
            where app_id = p_app_id
            group by application_id
          ) grouped_notifications
        ),
        '{}'::jsonb
      ),
      'presets', coalesce(
        (select jsonb_agg(payload order by created_at desc nulls last, record_id desc) from public.helped_ats_presets where app_id = p_app_id),
        '[]'::jsonb
      )
    ),
    'counters', coalesce(
      (select payload from public.helped_counters where app_id = p_app_id limit 1),
      '{}'::jsonb
    )
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
declare
  v_now timestamptz := now();
begin
  delete from public.helped_mom_personnel where app_id = p_app_id;
  delete from public.helped_testimonials where app_id = p_app_id;
  delete from public.helped_maids where app_id = p_app_id;
  delete from public.helped_enquiries where app_id = p_app_id;
  delete from public.helped_clients where app_id = p_app_id;
  delete from public.helped_client_sessions where app_id = p_app_id;
  delete from public.helped_agency_admins where app_id = p_app_id;
  delete from public.helped_agency_admin_sessions where app_id = p_app_id;
  delete from public.helped_direct_sales where app_id = p_app_id;
  delete from public.helped_chat_messages where app_id = p_app_id;
  delete from public.helped_employers where app_id = p_app_id;
  delete from public.helped_employment_contracts where app_id = p_app_id;
  delete from public.helped_ats_applications where app_id = p_app_id;
  delete from public.helped_ats_profiles where app_id = p_app_id;
  delete from public.helped_ats_scores where app_id = p_app_id;
  delete from public.helped_ats_history where app_id = p_app_id;
  delete from public.helped_ats_documents where app_id = p_app_id;
  delete from public.helped_ats_notifications where app_id = p_app_id;
  delete from public.helped_ats_presets where app_id = p_app_id;

  delete from public.helped_company_profiles where app_id = p_app_id;
  insert into public.helped_company_profiles (
    app_id,
    company_id,
    updated_at,
    payload,
    created_at
  )
  select
    p_app_id,
    coalesce(nullif(p_payload#>>'{companyProfile,id}', '')::integer, 1),
    coalesce(nullif(p_payload#>>'{companyProfile,updated_at}', '')::timestamptz, v_now),
    coalesce(p_payload->'companyProfile', '{}'::jsonb),
    coalesce(nullif(p_payload#>>'{companyProfile,created_at}', '')::timestamptz, v_now);

  insert into public.helped_mom_personnel (app_id, record_id, company_id, created_at, payload)
  select
    p_app_id,
    coalesce(nullif(item->>'id', '')::integer, row_number() over ()),
    nullif(item->>'company_id', '')::integer,
    nullif(item->>'created_at', '')::timestamptz,
    item
  from jsonb_array_elements(coalesce(p_payload->'momPersonnel', '[]'::jsonb)) item;

  insert into public.helped_testimonials (app_id, record_id, company_id, created_at, payload)
  select
    p_app_id,
    coalesce(nullif(item->>'id', '')::integer, row_number() over ()),
    nullif(item->>'company_id', '')::integer,
    nullif(item->>'created_at', '')::timestamptz,
    item
  from jsonb_array_elements(coalesce(p_payload->'testimonials', '[]'::jsonb)) item;

  insert into public.helped_maids (
    app_id, record_id, agency_id, reference_code, full_name, status, nationality,
    maid_type, is_public, has_photo, created_at, updated_at, payload
  )
  select
    p_app_id,
    coalesce(nullif(item->>'id', '')::integer, row_number() over ()),
    nullif(item->>'agencyId', '')::integer,
    item->>'referenceCode',
    item->>'fullName',
    item->>'status',
    item->>'nationality',
    item->>'type',
    coalesce((item->>'isPublic')::boolean, false),
    coalesce((item->>'hasPhoto')::boolean, false),
    nullif(item->>'createdAt', '')::timestamptz,
    nullif(item->>'updatedAt', '')::timestamptz,
    item
  from jsonb_array_elements(coalesce(p_payload->'maids', '[]'::jsonb)) item;

  insert into public.helped_enquiries (app_id, record_id, username, email, phone, created_at, payload)
  select
    p_app_id,
    coalesce(nullif(item->>'id', '')::integer, row_number() over ()),
    item->>'username',
    item->>'email',
    item->>'phone',
    nullif(item->>'createdAt', '')::timestamptz,
    item
  from jsonb_array_elements(coalesce(p_payload->'enquiries', '[]'::jsonb)) item;

  insert into public.helped_clients (
    app_id, record_id, supabase_user_id, email, name, company, phone, created_at, payload
  )
  select
    p_app_id,
    coalesce(nullif(item->>'id', '')::integer, row_number() over ()),
    item->>'supabaseUserId',
    item->>'email',
    item->>'name',
    item->>'company',
    item->>'phone',
    nullif(item->>'createdAt', '')::timestamptz,
    item
  from jsonb_array_elements(coalesce(p_payload->'clients', '[]'::jsonb)) item;

  insert into public.helped_client_sessions (app_id, token, client_id, created_at, payload)
  select
    p_app_id,
    item->>'token',
    coalesce(nullif(item->>'clientId', '')::integer, 0),
    nullif(item->>'createdAt', '')::timestamptz,
    item
  from jsonb_array_elements(coalesce(p_payload->'clientSessions', '[]'::jsonb)) item
  where coalesce(item->>'token', '') <> '';

  insert into public.helped_agency_admins (
    app_id, record_id, agency_id, username, email, supabase_user_id, agency_name, created_at, payload
  )
  select
    p_app_id,
    coalesce(nullif(item->>'id', '')::integer, row_number() over ()),
    nullif(item->>'agencyId', '')::integer,
    item->>'username',
    item->>'email',
    item->>'supabaseUserId',
    item->>'agencyName',
    nullif(item->>'createdAt', '')::timestamptz,
    item
  from jsonb_array_elements(coalesce(p_payload->'agencyAdmins', '[]'::jsonb)) item;

  insert into public.helped_agency_admin_sessions (app_id, token, admin_id, created_at, payload)
  select
    p_app_id,
    item->>'token',
    coalesce(nullif(item->>'adminId', '')::integer, 0),
    nullif(item->>'createdAt', '')::timestamptz,
    item
  from jsonb_array_elements(coalesce(p_payload->'agencyAdminSessions', '[]'::jsonb)) item
  where coalesce(item->>'token', '') <> '';

  insert into public.helped_direct_sales (app_id, record_id, client_id, maid_reference_code, status, created_at, payload)
  select
    p_app_id,
    coalesce(nullif(item->>'id', '')::integer, row_number() over ()),
    nullif(item->>'clientId', '')::integer,
    item->>'maidReferenceCode',
    item->>'status',
    nullif(item->>'createdAt', '')::timestamptz,
    item
  from jsonb_array_elements(coalesce(p_payload->'directSales', '[]'::jsonb)) item;

  insert into public.helped_chat_messages (
    app_id, record_id, client_id, agency_id, conversation_type, sender_role, created_at, payload
  )
  select
    p_app_id,
    coalesce(nullif(item->>'id', '')::integer, row_number() over ()),
    nullif(item->>'clientId', '')::integer,
    nullif(item->>'agencyId', '')::integer,
    item->>'conversationType',
    item->>'senderRole',
    nullif(item->>'createdAt', '')::timestamptz,
    item
  from jsonb_array_elements(coalesce(p_payload->'chatMessages', '[]'::jsonb)) item;

  insert into public.helped_employers (app_id, record_id, ref_code, created_at, updated_at, payload)
  select
    p_app_id,
    coalesce(nullif(item->>'id', '')::integer, row_number() over ()),
    item->>'refCode',
    nullif(item->>'createdAt', '')::timestamptz,
    nullif(item->>'updatedAt', '')::timestamptz,
    item
  from jsonb_array_elements(coalesce(p_payload->'employers', '[]'::jsonb)) item;

  insert into public.helped_employment_contracts (
    app_id, record_id, ref_code, employer_ref_code, maid_reference_code, created_at, updated_at, payload
  )
  select
    p_app_id,
    coalesce(nullif(item->>'id', '')::integer, row_number() over ()),
    item->>'refCode',
    item->>'employerRefCode',
    item->>'maidReferenceCode',
    nullif(item->>'createdAt', '')::timestamptz,
    nullif(item->>'updatedAt', '')::timestamptz,
    item
  from jsonb_array_elements(coalesce(p_payload->'employmentContracts', '[]'::jsonb)) item;

  insert into public.helped_ats_applications (
    app_id, record_id, agency_id, profile_id, application_code, status, source, applied_at, updated_at, payload
  )
  select
    p_app_id,
    coalesce(item->>'id', gen_random_uuid()::text),
    nullif(item->>'agencyId', '')::integer,
    item->>'profileId',
    item->>'applicationCode',
    item->>'status',
    item->>'source',
    nullif(item->>'appliedAt', '')::timestamptz,
    nullif(item->>'updatedAt', '')::timestamptz,
    item
  from jsonb_array_elements(coalesce(p_payload#>'{ats,applications}', '[]'::jsonb)) item;

  insert into public.helped_ats_profiles (
    app_id, record_id, application_id, full_name, email, contact_number, nationality,
    years_of_experience, expected_salary, created_at, updated_at, payload
  )
  select
    p_app_id,
    coalesce(item->>'id', gen_random_uuid()::text),
    coalesce(item->>'applicationId', ''),
    item->>'fullName',
    item->>'email',
    item->>'contactNumber',
    item->>'nationality',
    nullif(item->>'yearsOfExperience', '')::numeric,
    nullif(item->>'expectedSalary', '')::numeric,
    nullif(item->>'createdAt', '')::timestamptz,
    nullif(item->>'updatedAt', '')::timestamptz,
    item
  from jsonb_array_elements(coalesce(p_payload#>'{ats,profiles}', '[]'::jsonb)) item;

  insert into public.helped_ats_scores (app_id, application_id, score, category, payload)
  select
    p_app_id,
    score_entry.key,
    nullif(score_entry.value->>'score', '')::numeric,
    score_entry.value->>'category',
    score_entry.value
  from jsonb_each(coalesce(p_payload#>'{ats,scores}', '{}'::jsonb)) score_entry;

  insert into public.helped_ats_history (app_id, record_id, application_id, to_stage, created_at, payload)
  select
    p_app_id,
    coalesce(history_item->>'id', gen_random_uuid()::text),
    history_entry.key,
    history_item->>'toStage',
    nullif(history_item->>'createdAt', '')::timestamptz,
    history_item
  from jsonb_each(coalesce(p_payload#>'{ats,history}', '{}'::jsonb)) history_entry
  cross join lateral jsonb_array_elements(coalesce(history_entry.value, '[]'::jsonb)) history_item;

  insert into public.helped_ats_documents (
    app_id, record_id, application_id, document_type, file_name, uploaded_at, file_size, payload
  )
  select
    p_app_id,
    coalesce(document_item->>'id', gen_random_uuid()::text),
    document_entry.key,
    document_item->>'type',
    document_item->>'name',
    nullif(document_item->>'uploadedAt', '')::timestamptz,
    nullif(document_item->>'size', '')::bigint,
    document_item
  from jsonb_each(coalesce(p_payload#>'{ats,documents}', '{}'::jsonb)) document_entry
  cross join lateral jsonb_array_elements(coalesce(document_entry.value, '[]'::jsonb)) document_item;

  insert into public.helped_ats_notifications (
    app_id, record_id, application_id, event, channel, created_at, payload
  )
  select
    p_app_id,
    coalesce(notification_item->>'id', gen_random_uuid()::text),
    notification_entry.key,
    notification_item->>'event',
    notification_item->>'channel',
    nullif(notification_item->>'createdAt', '')::timestamptz,
    notification_item
  from jsonb_each(coalesce(p_payload#>'{ats,notifications}', '{}'::jsonb)) notification_entry
  cross join lateral jsonb_array_elements(coalesce(notification_entry.value, '[]'::jsonb)) notification_item;

  insert into public.helped_ats_presets (app_id, record_id, agency_id, preset_name, created_at, payload)
  select
    p_app_id,
    coalesce(item->>'id', gen_random_uuid()::text),
    nullif(item->>'agencyId', '')::integer,
    item->>'name',
    nullif(item->>'createdAt', '')::timestamptz,
    item
  from jsonb_array_elements(coalesce(p_payload#>'{ats,presets}', '[]'::jsonb)) item;

  insert into public.helped_counters (app_id, payload)
  values (p_app_id, coalesce(p_payload->'counters', '{}'::jsonb))
  on conflict (app_id) do update
  set payload = excluded.payload,
      updated_at = v_now;

  insert into public.helped_storage_meta (app_id, last_saved_at, source, notes)
  values (p_app_id, v_now, 'normalized', jsonb_build_object('savedBy', 'save_helped_app_data'))
  on conflict (app_id) do update
  set last_saved_at = excluded.last_saved_at,
      source = excluded.source,
      notes = excluded.notes;

  return public.load_helped_app_data(p_app_id);
end;
$$;

create or replace function public.migrate_helped_blob_to_normalized(p_app_id text default 'default')
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_payload jsonb;
begin
  select data into v_payload
  from public.app_data
  where id = p_app_id;

  if v_payload is null then
    raise exception 'No legacy app_data row found for app_id %', p_app_id;
  end if;

  perform public.save_helped_app_data(p_app_id, v_payload);

  return jsonb_build_object(
    'app_id', p_app_id,
    'migrated', true,
    'storage_meta', (
      select jsonb_build_object(
        'last_saved_at', last_saved_at,
        'source', source
      )
      from public.helped_storage_meta
      where app_id = p_app_id
    )
  );
end;
$$;

grant execute on function public.load_helped_app_data(text) to service_role;
grant execute on function public.save_helped_app_data(text, jsonb) to service_role;
grant execute on function public.migrate_helped_blob_to_normalized(text) to service_role;

create or replace view public.helped_storage_overview as
select
  meta.app_id,
  meta.last_saved_at,
  meta.source,
  (select count(*) from public.helped_maids m where m.app_id = meta.app_id) as maids_count,
  (select count(*) from public.helped_agency_admins a where a.app_id = meta.app_id) as agency_admins_count,
  (select count(*) from public.helped_clients c where c.app_id = meta.app_id) as clients_count,
  (select count(*) from public.helped_enquiries e where e.app_id = meta.app_id) as enquiries_count,
  (select count(*) from public.helped_ats_applications aa where aa.app_id = meta.app_id) as ats_applications_count,
  (select count(*) from public.helped_ats_documents ad where ad.app_id = meta.app_id) as ats_documents_count
from public.helped_storage_meta meta;

commit;

-- After setup:
-- select public.migrate_helped_blob_to_normalized('default');
-- select * from public.helped_storage_overview;
-- select * from public.helped_maids order by updated_at desc limit 50;
