-- =============================================================================
-- HELPED WEB — FULL SCHEMA RECONSTRUCTION (ONE-SHOT)
-- Architecture: app_data blob (Worker read/write) + helped_query_* (fast reads)
--
-- HOW TO USE:
--   1. Paste this entire file into Supabase SQL Editor and run it.
--   2. When it succeeds, run this one extra line:
--        SELECT public.refresh_helped_query_tables('default');
--
-- SAFE ON EXISTING DATA:
--   - Does NOT drop app_data or its existing rows.
--   - Drops all old views cleanly before recreating them (fixes the 42P16 error).
--   - Drops and recreates helped_query_* tables (repopulated from your blob).
--   - Drops and recreates all indexes, triggers, views, and functions cleanly.
-- =============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- 0. EXTENSIONS
-- ---------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ---------------------------------------------------------------------------
-- 1. DROP ALL OLD VIEWS FIRST  (prevents 42P16 column rename errors)
-- ---------------------------------------------------------------------------
DROP VIEW IF EXISTS public.app_ats_document_summary        CASCADE;
DROP VIEW IF EXISTS public.app_ats_profiles                CASCADE;
DROP VIEW IF EXISTS public.app_ats_applications            CASCADE;
DROP VIEW IF EXISTS public.app_ats_with_profile            CASCADE;
DROP VIEW IF EXISTS public.app_request_message_threads     CASCADE;
DROP VIEW IF EXISTS public.app_requests_with_client        CASCADE;
DROP VIEW IF EXISTS public.app_data_overview               CASCADE;
DROP VIEW IF EXISTS public.app_maids                       CASCADE;
DROP VIEW IF EXISTS public.app_agency_admins               CASCADE;
DROP VIEW IF EXISTS public.app_enquiries                   CASCADE;
DROP VIEW IF EXISTS public.helped_storage_overview         CASCADE;

-- ---------------------------------------------------------------------------
-- 2. SHARED TRIGGER FUNCTIONS
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_row_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.row_updated_at = NOW();
  RETURN NEW;
END;
$$;

-- ---------------------------------------------------------------------------
-- 3. SAFE CAST HELPERS
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.helped_try_int(value TEXT)
RETURNS INTEGER LANGUAGE plpgsql IMMUTABLE AS $$
BEGIN
  IF value IS NULL OR BTRIM(value) = '' THEN RETURN NULL; END IF;
  RETURN value::INTEGER;
EXCEPTION WHEN OTHERS THEN RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.helped_try_numeric(value TEXT)
RETURNS NUMERIC LANGUAGE plpgsql IMMUTABLE AS $$
BEGIN
  IF value IS NULL OR BTRIM(value) = '' THEN RETURN NULL; END IF;
  RETURN value::NUMERIC;
EXCEPTION WHEN OTHERS THEN RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.helped_try_timestamptz(value TEXT)
RETURNS TIMESTAMPTZ LANGUAGE plpgsql IMMUTABLE AS $$
BEGIN
  IF value IS NULL OR BTRIM(value) = '' THEN RETURN NULL; END IF;
  RETURN value::TIMESTAMPTZ;
EXCEPTION WHEN OTHERS THEN RETURN NULL;
END;
$$;

-- ---------------------------------------------------------------------------
-- 4. app_data  (blob store — Worker reads/writes this, never dropped)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.app_data (
  id          TEXT        PRIMARY KEY,
  data        JSONB       NOT NULL DEFAULT '{}'::JSONB,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT app_data_id_not_blank CHECK (LENGTH(BTRIM(id)) > 0),
  CONSTRAINT app_data_json_object  CHECK (JSONB_TYPEOF(data) = 'object')
);

DROP TRIGGER IF EXISTS app_data_set_updated_at ON public.app_data;
CREATE TRIGGER app_data_set_updated_at
  BEFORE UPDATE ON public.app_data
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX IF NOT EXISTS app_data_updated_at_idx
  ON public.app_data (updated_at DESC);

CREATE INDEX IF NOT EXISTS app_data_data_gin_idx
  ON public.app_data USING GIN (data jsonb_path_ops);

-- Seed default rows only if missing
INSERT INTO public.app_data (id, data) VALUES
  ('default', jsonb_build_object(
    'companyProfile',       '{}'::JSONB,
    'momPersonnel',         '[]'::JSONB,
    'testimonials',         '[]'::JSONB,
    'maids',                '[]'::JSONB,
    'enquiries',            '[]'::JSONB,
    'clients',              '[]'::JSONB,
    'clientSessions',       '[]'::JSONB,
    'agencyAdmins',         '[]'::JSONB,
    'agencyAdminSessions',  '[]'::JSONB,
    'directSales',          '[]'::JSONB,
    'requests',             '[]'::JSONB,
    'requestConversations', '[]'::JSONB,
    'requestMessages',      '[]'::JSONB,
    'chatMessages',         '[]'::JSONB,
    'employers',            '[]'::JSONB,
    'employmentContracts',  '[]'::JSONB,
    'ats', jsonb_build_object(
      'applications',  '[]'::JSONB,
      'profiles',      '[]'::JSONB,
      'scores',        '{}'::JSONB,
      'history',       '{}'::JSONB,
      'documents',     '{}'::JSONB,
      'notifications', '{}'::JSONB,
      'presets',       '[]'::JSONB
    ),
    'counters', '{}'::JSONB
  )),
  ('default:agency-admin-sessions', '{"agencyAdminSessions":[]}'::JSONB),
  ('default:agency-admin-auth',     '{"agencyAdmins":[]}'::JSONB)
ON CONFLICT (id) DO NOTHING;

-- RLS: only service_role touches the blob
REVOKE ALL ON TABLE public.app_data FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.app_data TO service_role;
ALTER TABLE public.app_data ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "service role manages app_data" ON public.app_data;
CREATE POLICY "service role manages app_data"
  ON public.app_data FOR ALL TO service_role
  USING (TRUE) WITH CHECK (TRUE);

-- ---------------------------------------------------------------------------
-- 5. DROP + RECREATE QUERY TABLES  (always fresh, data comes from blob)
-- ---------------------------------------------------------------------------
DROP TABLE IF EXISTS public.helped_query_ats_profiles          CASCADE;
DROP TABLE IF EXISTS public.helped_query_ats_applications      CASCADE;
DROP TABLE IF EXISTS public.helped_query_request_messages      CASCADE;
DROP TABLE IF EXISTS public.helped_query_request_conversations CASCADE;
DROP TABLE IF EXISTS public.helped_query_requests              CASCADE;
DROP TABLE IF EXISTS public.helped_query_direct_sales          CASCADE;
DROP TABLE IF EXISTS public.helped_query_enquiries             CASCADE;
DROP TABLE IF EXISTS public.helped_query_agency_admins         CASCADE;
DROP TABLE IF EXISTS public.helped_query_clients               CASCADE;
DROP TABLE IF EXISTS public.helped_query_maids                 CASCADE;
DROP TABLE IF EXISTS public.helped_query_chat_messages         CASCADE;
DROP TABLE IF EXISTS public.helped_query_employers             CASCADE;
DROP TABLE IF EXISTS public.helped_query_employment_contracts  CASCADE;
DROP TABLE IF EXISTS public.helped_query_meta                  CASCADE;

CREATE TABLE public.helped_query_meta (
  app_id            TEXT        PRIMARY KEY,
  refreshed_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  source_updated_at TIMESTAMPTZ,
  source_bytes      INTEGER     NOT NULL DEFAULT 0
);

CREATE TABLE public.helped_query_maids (
  app_id         TEXT        NOT NULL,
  record_id      INTEGER     NOT NULL,
  agency_id      INTEGER,
  reference_code TEXT,
  full_name      TEXT,
  status         TEXT,
  maid_type      TEXT,
  nationality    TEXT,
  is_public      BOOLEAN     NOT NULL DEFAULT FALSE,
  has_photo      BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at     TIMESTAMPTZ,
  updated_at     TIMESTAMPTZ,
  payload        JSONB       NOT NULL,
  row_created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  row_updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (app_id, record_id),
  CONSTRAINT helped_query_maids_payload_object CHECK (JSONB_TYPEOF(payload) = 'object')
);

CREATE TABLE public.helped_query_clients (
  app_id           TEXT        NOT NULL,
  record_id        INTEGER     NOT NULL,
  supabase_user_id TEXT,
  email            TEXT,
  name             TEXT,
  company          TEXT,
  phone            TEXT,
  created_at       TIMESTAMPTZ,
  payload          JSONB       NOT NULL,
  row_created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  row_updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (app_id, record_id),
  CONSTRAINT helped_query_clients_payload_object CHECK (JSONB_TYPEOF(payload) = 'object')
);

CREATE TABLE public.helped_query_agency_admins (
  app_id           TEXT        NOT NULL,
  record_id        INTEGER     NOT NULL,
  agency_id        INTEGER,
  username         TEXT,
  email            TEXT,
  supabase_user_id TEXT,
  agency_name      TEXT,
  created_at       TIMESTAMPTZ,
  payload          JSONB       NOT NULL,
  row_created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  row_updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (app_id, record_id),
  CONSTRAINT helped_query_agency_admins_payload_object CHECK (JSONB_TYPEOF(payload) = 'object')
);

CREATE TABLE public.helped_query_enquiries (
  app_id         TEXT        NOT NULL,
  record_id      INTEGER     NOT NULL,
  username       TEXT,
  email          TEXT,
  phone          TEXT,
  created_at     TIMESTAMPTZ,
  payload        JSONB       NOT NULL,
  row_created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  row_updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (app_id, record_id),
  CONSTRAINT helped_query_enquiries_payload_object CHECK (JSONB_TYPEOF(payload) = 'object')
);

CREATE TABLE public.helped_query_direct_sales (
  app_id              TEXT        NOT NULL,
  record_id           INTEGER     NOT NULL,
  agency_id           INTEGER,
  client_id           INTEGER,
  maid_reference_code TEXT,
  status              TEXT,
  created_at          TIMESTAMPTZ,
  payload             JSONB       NOT NULL,
  row_created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  row_updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (app_id, record_id),
  CONSTRAINT helped_query_direct_sales_payload_object CHECK (JSONB_TYPEOF(payload) = 'object')
);

-- Primary fast-query table for GET /api/requests
CREATE TABLE public.helped_query_requests (
  app_id          TEXT        NOT NULL,
  request_id      UUID        NOT NULL,
  client_id       INTEGER,
  agency_id       INTEGER,
  request_type    TEXT,
  status          TEXT,
  maid_references TEXT[]      NOT NULL DEFAULT ARRAY[]::TEXT[],
  summary         TEXT,
  updated_by      TEXT,
  created_at      TIMESTAMPTZ,
  updated_at      TIMESTAMPTZ,
  payload         JSONB       NOT NULL,
  row_created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  row_updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (app_id, request_id),
  CONSTRAINT helped_query_requests_payload_object CHECK (JSONB_TYPEOF(payload) = 'object')
);

CREATE TABLE public.helped_query_request_conversations (
  app_id          TEXT        NOT NULL,
  conversation_id UUID        NOT NULL,
  request_id      UUID        NOT NULL,
  agency_id       INTEGER,
  client_id       INTEGER,
  created_at      TIMESTAMPTZ,
  payload         JSONB       NOT NULL,
  row_created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  row_updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (app_id, conversation_id),
  CONSTRAINT helped_query_request_conversations_payload_object CHECK (JSONB_TYPEOF(payload) = 'object')
);

CREATE TABLE public.helped_query_request_messages (
  app_id          TEXT        NOT NULL,
  message_id      UUID        NOT NULL,
  conversation_id UUID        NOT NULL,
  sender_type     TEXT,
  sender_id       INTEGER,
  message         TEXT,
  created_at      TIMESTAMPTZ,
  payload         JSONB       NOT NULL,
  row_created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  row_updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (app_id, message_id),
  CONSTRAINT helped_query_request_messages_payload_object CHECK (JSONB_TYPEOF(payload) = 'object')
);

CREATE TABLE public.helped_query_chat_messages (
  app_id            TEXT        NOT NULL,
  record_id         INTEGER     NOT NULL,
  client_id         INTEGER,
  agency_id         INTEGER,
  conversation_type TEXT,
  sender_role       TEXT,
  created_at        TIMESTAMPTZ,
  payload           JSONB       NOT NULL,
  row_created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  row_updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (app_id, record_id),
  CONSTRAINT helped_query_chat_messages_payload_object CHECK (JSONB_TYPEOF(payload) = 'object')
);

CREATE TABLE public.helped_query_employers (
  app_id              TEXT        NOT NULL,
  record_id           INTEGER     NOT NULL,
  agency_id           INTEGER,
  ref_code            TEXT,
  maid_reference_code TEXT,
  employer_name       TEXT,
  created_at          TIMESTAMPTZ,
  updated_at          TIMESTAMPTZ,
  payload             JSONB       NOT NULL,
  row_created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  row_updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (app_id, record_id),
  CONSTRAINT helped_query_employers_payload_object CHECK (JSONB_TYPEOF(payload) = 'object')
);

CREATE TABLE public.helped_query_employment_contracts (
  app_id              TEXT        NOT NULL,
  record_id           INTEGER     NOT NULL,
  agency_id           INTEGER,
  ref_code            TEXT,
  employer_ref_code   TEXT,
  maid_reference_code TEXT,
  maid_name           TEXT,
  employer_name       TEXT,
  created_at          TIMESTAMPTZ,
  updated_at          TIMESTAMPTZ,
  payload             JSONB       NOT NULL,
  row_created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  row_updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (app_id, record_id),
  CONSTRAINT helped_query_employment_contracts_payload_object CHECK (JSONB_TYPEOF(payload) = 'object')
);

CREATE TABLE public.helped_query_ats_applications (
  app_id           TEXT        NOT NULL,
  application_id   TEXT        NOT NULL,
  agency_id        INTEGER,
  profile_id       TEXT,
  application_code TEXT,
  status           TEXT,
  source           TEXT,
  applied_at       TIMESTAMPTZ,
  updated_at       TIMESTAMPTZ,
  payload          JSONB       NOT NULL,
  row_created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  row_updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (app_id, application_id),
  CONSTRAINT helped_query_ats_applications_payload_object CHECK (JSONB_TYPEOF(payload) = 'object')
);

CREATE TABLE public.helped_query_ats_profiles (
  app_id              TEXT        NOT NULL,
  profile_id          TEXT        NOT NULL,
  application_id      TEXT,
  full_name           TEXT,
  email               TEXT,
  contact_number      TEXT,
  nationality         TEXT,
  years_of_experience NUMERIC,
  expected_salary     NUMERIC,
  created_at          TIMESTAMPTZ,
  updated_at          TIMESTAMPTZ,
  payload             JSONB       NOT NULL,
  row_created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  row_updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (app_id, profile_id),
  CONSTRAINT helped_query_ats_profiles_payload_object CHECK (JSONB_TYPEOF(payload) = 'object')
);

-- ---------------------------------------------------------------------------
-- 6. INDEXES
-- ---------------------------------------------------------------------------

-- Maids
CREATE INDEX helped_query_maids_agency_idx
  ON public.helped_query_maids (app_id, agency_id, is_public, updated_at DESC);
CREATE INDEX helped_query_maids_reference_idx
  ON public.helped_query_maids (app_id, reference_code);
CREATE INDEX helped_query_maids_name_trgm_idx
  ON public.helped_query_maids USING GIN (full_name gin_trgm_ops);
CREATE INDEX helped_query_maids_status_idx
  ON public.helped_query_maids (app_id, agency_id, status);

-- Clients
CREATE INDEX helped_query_clients_email_idx
  ON public.helped_query_clients (app_id, email);
CREATE INDEX helped_query_clients_supabase_idx
  ON public.helped_query_clients (app_id, supabase_user_id)
  WHERE supabase_user_id IS NOT NULL;

-- Agency admins
CREATE INDEX helped_query_agency_admins_login_idx
  ON public.helped_query_agency_admins (app_id, agency_id, username, email);

-- Requests (primary: agencyId + status + recency)
CREATE INDEX helped_query_requests_agency_status_idx
  ON public.helped_query_requests (app_id, agency_id, status, updated_at DESC NULLS LAST);
CREATE INDEX helped_query_requests_client_idx
  ON public.helped_query_requests (app_id, client_id, updated_at DESC NULLS LAST);
CREATE INDEX helped_query_requests_type_idx
  ON public.helped_query_requests (app_id, agency_id, request_type, updated_at DESC NULLS LAST);

-- Conversations & messages
CREATE INDEX helped_query_request_conversations_request_idx
  ON public.helped_query_request_conversations (app_id, request_id);
CREATE INDEX helped_query_request_messages_conversation_idx
  ON public.helped_query_request_messages (app_id, conversation_id, created_at ASC);

-- Chat messages
CREATE INDEX helped_query_chat_messages_agency_client_idx
  ON public.helped_query_chat_messages (app_id, agency_id, client_id, conversation_type, created_at DESC);

-- Direct sales
CREATE INDEX helped_query_direct_sales_agency_status_idx
  ON public.helped_query_direct_sales (app_id, agency_id, status, created_at DESC);

-- Employers & contracts
CREATE INDEX helped_query_employers_agency_ref_idx
  ON public.helped_query_employers (app_id, agency_id, ref_code);
CREATE INDEX helped_query_employment_contracts_agency_idx
  ON public.helped_query_employment_contracts (app_id, agency_id, maid_reference_code);

-- ATS
CREATE INDEX helped_query_ats_applications_agency_status_idx
  ON public.helped_query_ats_applications (app_id, agency_id, status, applied_at DESC NULLS LAST);
CREATE INDEX helped_query_ats_profiles_name_trgm_idx
  ON public.helped_query_ats_profiles USING GIN (full_name gin_trgm_ops);
CREATE INDEX helped_query_ats_profiles_application_idx
  ON public.helped_query_ats_profiles (app_id, application_id);

-- ---------------------------------------------------------------------------
-- 7. RLS ON ALL QUERY TABLES
-- ---------------------------------------------------------------------------
DO $$
DECLARE tbl TEXT;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
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
    'helped_query_ats_profiles'
  ]
  LOOP
    EXECUTE FORMAT('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', tbl);
    EXECUTE FORMAT('REVOKE ALL ON public.%I FROM anon, authenticated', tbl);
    EXECUTE FORMAT('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO service_role', tbl);
    EXECUTE FORMAT('GRANT SELECT ON public.%I TO authenticated', tbl);
    EXECUTE FORMAT('DROP POLICY IF EXISTS "service role manages %1$s" ON public.%I', tbl, tbl);
    EXECUTE FORMAT(
      'CREATE POLICY "service role manages %1$s" ON public.%I FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE)',
      tbl, tbl
    );
    EXECUTE FORMAT('DROP POLICY IF EXISTS "authenticated read %1$s" ON public.%I', tbl, tbl);
    EXECUTE FORMAT(
      'CREATE POLICY "authenticated read %1$s" ON public.%I FOR SELECT TO authenticated USING (TRUE)',
      tbl, tbl
    );
  END LOOP;
END
$$;

-- ---------------------------------------------------------------------------
-- 8. REFRESH FUNCTION  (blob → all query tables, called by trigger + manually)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.refresh_helped_query_tables(p_app_id TEXT DEFAULT 'default')
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_data       JSONB;
  v_updated_at TIMESTAMPTZ;
BEGIN
  SELECT data, updated_at INTO v_data, v_updated_at
  FROM public.app_data
  WHERE id = p_app_id;

  IF v_data IS NULL THEN
    RETURN jsonb_build_object('error', 'app_data row not found', 'app_id', p_app_id);
  END IF;

  DELETE FROM public.helped_query_maids                 WHERE app_id = p_app_id;
  DELETE FROM public.helped_query_clients               WHERE app_id = p_app_id;
  DELETE FROM public.helped_query_agency_admins         WHERE app_id = p_app_id;
  DELETE FROM public.helped_query_enquiries             WHERE app_id = p_app_id;
  DELETE FROM public.helped_query_direct_sales          WHERE app_id = p_app_id;
  DELETE FROM public.helped_query_requests              WHERE app_id = p_app_id;
  DELETE FROM public.helped_query_request_conversations WHERE app_id = p_app_id;
  DELETE FROM public.helped_query_request_messages      WHERE app_id = p_app_id;
  DELETE FROM public.helped_query_chat_messages         WHERE app_id = p_app_id;
  DELETE FROM public.helped_query_employers             WHERE app_id = p_app_id;
  DELETE FROM public.helped_query_employment_contracts  WHERE app_id = p_app_id;
  DELETE FROM public.helped_query_ats_applications      WHERE app_id = p_app_id;
  DELETE FROM public.helped_query_ats_profiles          WHERE app_id = p_app_id;

  -- Maids
  INSERT INTO public.helped_query_maids (
    app_id, record_id, agency_id, reference_code, full_name,
    status, maid_type, nationality, is_public, has_photo, created_at, updated_at, payload
  )
  SELECT
    p_app_id,
    COALESCE(public.helped_try_int(item->>'id'), ROW_NUMBER() OVER ()::INTEGER),
    public.helped_try_int(item->>'agencyId'),
    item->>'referenceCode',
    item->>'fullName',
    item->>'status',
    item->>'type',
    item->>'nationality',
    COALESCE((item->>'isPublic')::BOOLEAN, FALSE),
    COALESCE((item->>'hasPhoto')::BOOLEAN, FALSE),
    public.helped_try_timestamptz(item->>'createdAt'),
    public.helped_try_timestamptz(item->>'updatedAt'),
    item
  FROM JSONB_ARRAY_ELEMENTS(COALESCE(v_data->'maids', '[]'::JSONB)) item;

  -- Clients
  INSERT INTO public.helped_query_clients (
    app_id, record_id, supabase_user_id, email, name, company, phone, created_at, payload
  )
  SELECT
    p_app_id,
    COALESCE(public.helped_try_int(item->>'id'), ROW_NUMBER() OVER ()::INTEGER),
    item->>'supabaseUserId',
    item->>'email',
    item->>'name',
    item->>'company',
    item->>'phone',
    public.helped_try_timestamptz(item->>'createdAt'),
    item
  FROM JSONB_ARRAY_ELEMENTS(COALESCE(v_data->'clients', '[]'::JSONB)) item;

  -- Agency admins
  INSERT INTO public.helped_query_agency_admins (
    app_id, record_id, agency_id, username, email, supabase_user_id, agency_name, created_at, payload
  )
  SELECT
    p_app_id,
    COALESCE(public.helped_try_int(item->>'id'), ROW_NUMBER() OVER ()::INTEGER),
    public.helped_try_int(item->>'agencyId'),
    item->>'username',
    item->>'email',
    item->>'supabaseUserId',
    item->>'agencyName',
    public.helped_try_timestamptz(item->>'createdAt'),
    item
  FROM JSONB_ARRAY_ELEMENTS(COALESCE(v_data->'agencyAdmins', '[]'::JSONB)) item;

  -- Enquiries
  INSERT INTO public.helped_query_enquiries (
    app_id, record_id, username, email, phone, created_at, payload
  )
  SELECT
    p_app_id,
    COALESCE(public.helped_try_int(item->>'id'), ROW_NUMBER() OVER ()::INTEGER),
    item->>'username',
    item->>'email',
    item->>'phone',
    public.helped_try_timestamptz(item->>'createdAt'),
    item
  FROM JSONB_ARRAY_ELEMENTS(COALESCE(v_data->'enquiries', '[]'::JSONB)) item;

  -- Direct sales
  INSERT INTO public.helped_query_direct_sales (
    app_id, record_id, agency_id, client_id, maid_reference_code, status, created_at, payload
  )
  SELECT
    p_app_id,
    COALESCE(public.helped_try_int(item->>'id'), ROW_NUMBER() OVER ()::INTEGER),
    public.helped_try_int(item->>'agencyId'),
    public.helped_try_int(item->>'clientId'),
    item->>'maidReferenceCode',
    item->>'status',
    public.helped_try_timestamptz(item->>'createdAt'),
    item
  FROM JSONB_ARRAY_ELEMENTS(COALESCE(v_data->'directSales', '[]'::JSONB)) item;

  -- Requests (UUID guard)
  INSERT INTO public.helped_query_requests (
    app_id, request_id, client_id, agency_id, request_type, status,
    maid_references, summary, updated_by, created_at, updated_at, payload
  )
  SELECT
    p_app_id,
    (item->>'id')::UUID,
    public.helped_try_int(item->>'clientId'),
    public.helped_try_int(item->>'agencyId'),
    item->>'type',
    item->>'status',
    COALESCE(
      ARRAY(SELECT JSONB_ARRAY_ELEMENTS_TEXT(COALESCE(item->'maidReferences', '[]'::JSONB))),
      ARRAY[]::TEXT[]
    ),
    COALESCE(item#>>'{details,primaryDuty}', item#>>'{details,nationality}', item->>'type'),
    item->>'updatedBy',
    public.helped_try_timestamptz(item->>'createdAt'),
    public.helped_try_timestamptz(item->>'updatedAt'),
    item
  FROM JSONB_ARRAY_ELEMENTS(COALESCE(v_data->'requests', '[]'::JSONB)) item
  WHERE COALESCE(item->>'id', '') ~*
    '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$';

  -- Request conversations
  INSERT INTO public.helped_query_request_conversations (
    app_id, conversation_id, request_id, agency_id, client_id, created_at, payload
  )
  SELECT
    p_app_id,
    (item->>'id')::UUID,
    (item->>'requestId')::UUID,
    public.helped_try_int(item->>'agencyId'),
    public.helped_try_int(item->>'clientId'),
    public.helped_try_timestamptz(item->>'createdAt'),
    item
  FROM JSONB_ARRAY_ELEMENTS(COALESCE(v_data->'requestConversations', '[]'::JSONB)) item
  WHERE COALESCE(item->>'id', '') ~*
      '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
    AND COALESCE(item->>'requestId', '') ~*
      '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$';

  -- Request messages
  INSERT INTO public.helped_query_request_messages (
    app_id, message_id, conversation_id, sender_type, sender_id, message, created_at, payload
  )
  SELECT
    p_app_id,
    (item->>'id')::UUID,
    (item->>'conversationId')::UUID,
    item->>'senderType',
    public.helped_try_int(item->>'senderId'),
    item->>'message',
    public.helped_try_timestamptz(item->>'createdAt'),
    item
  FROM JSONB_ARRAY_ELEMENTS(COALESCE(v_data->'requestMessages', '[]'::JSONB)) item
  WHERE COALESCE(item->>'id', '') ~*
      '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
    AND COALESCE(item->>'conversationId', '') ~*
      '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$';

  -- Chat messages
  INSERT INTO public.helped_query_chat_messages (
    app_id, record_id, client_id, agency_id, conversation_type, sender_role, created_at, payload
  )
  SELECT
    p_app_id,
    COALESCE(public.helped_try_int(item->>'id'), ROW_NUMBER() OVER ()::INTEGER),
    public.helped_try_int(item->>'clientId'),
    public.helped_try_int(item->>'agencyId'),
    item->>'conversationType',
    item->>'senderRole',
    public.helped_try_timestamptz(item->>'createdAt'),
    item
  FROM JSONB_ARRAY_ELEMENTS(COALESCE(v_data->'chatMessages', '[]'::JSONB)) item;

  -- Employers
  INSERT INTO public.helped_query_employers (
    app_id, record_id, agency_id, ref_code, maid_reference_code, employer_name,
    created_at, updated_at, payload
  )
  SELECT
    p_app_id,
    COALESCE(public.helped_try_int(item->>'id'), ROW_NUMBER() OVER ()::INTEGER),
    public.helped_try_int(item->>'agencyId'),
    item->>'refCode',
    item#>>'{maid,referenceCode}',
    item#>>'{employer,name}',
    public.helped_try_timestamptz(item->>'createdAt'),
    public.helped_try_timestamptz(item->>'updatedAt'),
    item
  FROM JSONB_ARRAY_ELEMENTS(COALESCE(v_data->'employers', '[]'::JSONB)) item;

  -- Employment contracts
  INSERT INTO public.helped_query_employment_contracts (
    app_id, record_id, agency_id, ref_code, employer_ref_code, maid_reference_code,
    maid_name, employer_name, created_at, updated_at, payload
  )
  SELECT
    p_app_id,
    COALESCE(public.helped_try_int(item->>'id'), ROW_NUMBER() OVER ()::INTEGER),
    public.helped_try_int(item->>'agencyId'),
    item->>'refCode',
    item->>'employerRefCode',
    item->>'maidReferenceCode',
    item->>'maidName',
    item->>'employerName',
    public.helped_try_timestamptz(item->>'createdAt'),
    public.helped_try_timestamptz(item->>'updatedAt'),
    item
  FROM JSONB_ARRAY_ELEMENTS(COALESCE(v_data->'employmentContracts', '[]'::JSONB)) item;

  -- ATS applications
  INSERT INTO public.helped_query_ats_applications (
    app_id, application_id, agency_id, profile_id, application_code,
    status, source, applied_at, updated_at, payload
  )
  SELECT
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
  FROM JSONB_ARRAY_ELEMENTS(COALESCE(v_data#>'{ats,applications}', '[]'::JSONB)) item
  WHERE COALESCE(item->>'id', '') <> '';

  -- ATS profiles
  INSERT INTO public.helped_query_ats_profiles (
    app_id, profile_id, application_id, full_name, email, contact_number,
    nationality, years_of_experience, expected_salary, created_at, updated_at, payload
  )
  SELECT
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
  FROM JSONB_ARRAY_ELEMENTS(COALESCE(v_data#>'{ats,profiles}', '[]'::JSONB)) item
  WHERE COALESCE(item->>'id', '') <> '';

  -- Update meta
  INSERT INTO public.helped_query_meta (app_id, refreshed_at, source_updated_at, source_bytes)
  VALUES (p_app_id, NOW(), v_updated_at, PG_COLUMN_SIZE(v_data))
  ON CONFLICT (app_id) DO UPDATE
    SET refreshed_at      = EXCLUDED.refreshed_at,
        source_updated_at = EXCLUDED.source_updated_at,
        source_bytes      = EXCLUDED.source_bytes;

  RETURN jsonb_build_object(
    'app_id',                 p_app_id,
    'refreshed_at',           NOW(),
    'maids_count',            (SELECT COUNT(*) FROM public.helped_query_maids              WHERE app_id = p_app_id),
    'clients_count',          (SELECT COUNT(*) FROM public.helped_query_clients            WHERE app_id = p_app_id),
    'agency_admins_count',    (SELECT COUNT(*) FROM public.helped_query_agency_admins      WHERE app_id = p_app_id),
    'requests_count',         (SELECT COUNT(*) FROM public.helped_query_requests           WHERE app_id = p_app_id),
    'request_messages_count', (SELECT COUNT(*) FROM public.helped_query_request_messages   WHERE app_id = p_app_id),
    'ats_applications_count', (SELECT COUNT(*) FROM public.helped_query_ats_applications   WHERE app_id = p_app_id),
    'ats_profiles_count',     (SELECT COUNT(*) FROM public.helped_query_ats_profiles       WHERE app_id = p_app_id)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.refresh_helped_query_tables(TEXT) TO service_role;

-- ---------------------------------------------------------------------------
-- 9. AUTO-SYNC TRIGGER  (query tables update on every Worker save to app_data)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.sync_query_tables_on_save()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public.refresh_helped_query_tables(NEW.id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS app_data_sync_query_tables ON public.app_data;
CREATE TRIGGER app_data_sync_query_tables
  AFTER INSERT OR UPDATE ON public.app_data
  FOR EACH ROW EXECUTE FUNCTION public.sync_query_tables_on_save();

-- ---------------------------------------------------------------------------
-- 10. VIEWS
-- ---------------------------------------------------------------------------

CREATE OR REPLACE VIEW public.app_data_overview AS
SELECT
  ad.id,
  ad.created_at,
  ad.updated_at,
  PG_COLUMN_SIZE(ad.data)                                                    AS data_bytes,
  JSONB_ARRAY_LENGTH(COALESCE(ad.data->'maids',               '[]'::JSONB)) AS maids_count,
  JSONB_ARRAY_LENGTH(COALESCE(ad.data->'clients',             '[]'::JSONB)) AS clients_count,
  JSONB_ARRAY_LENGTH(COALESCE(ad.data->'agencyAdmins',        '[]'::JSONB)) AS agency_admins_count,
  JSONB_ARRAY_LENGTH(COALESCE(ad.data->'enquiries',           '[]'::JSONB)) AS enquiries_count,
  JSONB_ARRAY_LENGTH(COALESCE(ad.data->'directSales',         '[]'::JSONB)) AS direct_sales_count,
  JSONB_ARRAY_LENGTH(COALESCE(ad.data->'requests',            '[]'::JSONB)) AS requests_count,
  JSONB_ARRAY_LENGTH(COALESCE(ad.data->'requestMessages',     '[]'::JSONB)) AS request_messages_count,
  JSONB_ARRAY_LENGTH(COALESCE(ad.data->'chatMessages',        '[]'::JSONB)) AS chat_messages_count,
  JSONB_ARRAY_LENGTH(COALESCE(ad.data->'employers',           '[]'::JSONB)) AS employers_count,
  JSONB_ARRAY_LENGTH(COALESCE(ad.data->'employmentContracts', '[]'::JSONB)) AS employment_contracts_count,
  JSONB_ARRAY_LENGTH(COALESCE(ad.data#>'{ats,applications}',  '[]'::JSONB)) AS ats_applications_count,
  JSONB_ARRAY_LENGTH(COALESCE(ad.data#>'{ats,profiles}',      '[]'::JSONB)) AS ats_profiles_count,
  meta.refreshed_at                                                          AS query_tables_refreshed_at
FROM public.app_data ad
LEFT JOIN public.helped_query_meta meta ON meta.app_id = ad.id;

-- GET /api/requests — requests with client name/email/phone
CREATE OR REPLACE VIEW public.app_requests_with_client AS
SELECT
  r.app_id,
  r.request_id,
  r.agency_id,
  r.client_id,
  c.name         AS client_name,
  c.email        AS client_email,
  c.phone        AS client_phone,
  r.request_type,
  r.status,
  r.maid_references,
  r.summary,
  r.updated_by,
  r.created_at,
  r.updated_at,
  r.payload
FROM public.helped_query_requests r
LEFT JOIN public.helped_query_clients c
  ON c.app_id    = r.app_id
 AND c.record_id = r.client_id;

-- Message threads
CREATE OR REPLACE VIEW public.app_request_message_threads AS
SELECT
  m.app_id,
  c.request_id,
  m.conversation_id,
  m.message_id,
  m.sender_type,
  m.sender_id,
  m.message,
  m.created_at,
  m.payload
FROM public.helped_query_request_messages m
JOIN public.helped_query_request_conversations c
  ON c.app_id         = m.app_id
 AND c.conversation_id = m.conversation_id;

-- ATS applications + profile
CREATE OR REPLACE VIEW public.app_ats_with_profile AS
SELECT
  a.app_id,
  a.application_id,
  a.agency_id,
  a.application_code,
  a.status,
  a.source,
  a.applied_at,
  a.updated_at,
  p.full_name,
  p.email,
  p.contact_number,
  p.nationality,
  p.years_of_experience,
  p.expected_salary,
  a.payload AS application_payload,
  p.payload AS profile_payload
FROM public.helped_query_ats_applications a
LEFT JOIN public.helped_query_ats_profiles p
  ON p.app_id         = a.app_id
 AND p.application_id = a.application_id;

-- ---------------------------------------------------------------------------
-- 11. UTILITY FUNCTIONS
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.debug_uid()
RETURNS TEXT LANGUAGE SQL STABLE AS $$
  SELECT auth.uid()::TEXT;
$$;
GRANT EXECUTE ON FUNCTION public.debug_uid() TO authenticated;

CREATE OR REPLACE FUNCTION public.get_helped_app_data_overview(p_app_id TEXT DEFAULT 'default')
RETURNS JSONB LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT jsonb_build_object(
    'app_id',                    ad.id,
    'updated_at',                ad.updated_at,
    'data_bytes',                PG_COLUMN_SIZE(ad.data),
    'maids_count',               JSONB_ARRAY_LENGTH(COALESCE(ad.data->'maids',              '[]'::JSONB)),
    'clients_count',             JSONB_ARRAY_LENGTH(COALESCE(ad.data->'clients',            '[]'::JSONB)),
    'requests_count',            JSONB_ARRAY_LENGTH(COALESCE(ad.data->'requests',           '[]'::JSONB)),
    'ats_applications_count',    JSONB_ARRAY_LENGTH(COALESCE(ad.data#>'{ats,applications}', '[]'::JSONB)),
    'query_tables_refreshed_at', meta.refreshed_at
  )
  FROM public.app_data ad
  LEFT JOIN public.helped_query_meta meta ON meta.app_id = ad.id
  WHERE ad.id = p_app_id;
$$;
GRANT EXECUTE ON FUNCTION public.get_helped_app_data_overview(TEXT) TO service_role;

-- ---------------------------------------------------------------------------
-- 12. STORAGE BUCKET
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.schemata WHERE schema_name = 'storage') THEN
    INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    VALUES (
      'ats-applications', 'ats-applications', TRUE, 10485760,
      ARRAY[
        'application/pdf', 'image/jpeg', 'image/png', 'image/webp',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      ]
    )
    ON CONFLICT (id) DO UPDATE
      SET public             = EXCLUDED.public,
          file_size_limit    = EXCLUDED.file_size_limit,
          allowed_mime_types = EXCLUDED.allowed_mime_types;
  END IF;
END
$$;

COMMIT;

-- =============================================================================
-- DONE. Now run this one extra line to populate the query tables from your blob:
--
--   SELECT public.refresh_helped_query_tables('default');
--
-- Verify with:
--   SELECT * FROM public.app_data_overview;
--   SELECT * FROM public.app_requests_with_client
--     WHERE agency_id = 1 ORDER BY updated_at DESC NULLS LAST LIMIT 9;
-- =============================================================================