-- Additive Phase 2 foundation for the AI Command Center.
-- Apply only after confirming the target Supabase project and existing schema.
-- Existing ai_conversations/ai_messages/ai_agent_* objects are intentionally
-- not recreated here because their deployed definitions are not versioned in
-- this repository. Existing ai_sessions/ai_actions remain untouched.

CREATE TABLE IF NOT EXISTS public.ai_commands (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id INTEGER NOT NULL DEFAULT 1,
  actor_id TEXT NOT NULL,
  conversation_id UUID,
  instruction TEXT NOT NULL CHECK (length(btrim(instruction)) > 0),
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft','planning','awaiting_approval','approved','rejected','queued','running','succeeded','partially_succeeded','failed','cancelled','expired')),
  plan JSONB NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(plan) = 'object'),
  result_summary TEXT NOT NULL DEFAULT '',
  error_detail TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_ai_commands_agency_created
  ON public.ai_commands (agency_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_commands_agency_status
  ON public.ai_commands (agency_id, status, updated_at DESC);

CREATE TABLE IF NOT EXISTS public.ai_command_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  command_id UUID NOT NULL REFERENCES public.ai_commands(id) ON DELETE RESTRICT,
  agency_id INTEGER NOT NULL DEFAULT 1,
  agent_id TEXT NOT NULL,
  tool_name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft','planning','awaiting_approval','approved','rejected','queued','running','succeeded','partially_succeeded','failed','cancelled','expired')),
  risk_classification TEXT NOT NULL DEFAULT 'low'
    CHECK (risk_classification IN ('low','moderate','high','critical')),
  payload JSONB NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(payload) = 'object'),
  payload_hash TEXT NOT NULL CHECK (payload_hash ~ '^[a-f0-9]{64}$'),
  result JSONB NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(result) = 'object'),
  error_detail TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ai_command_actions_command
  ON public.ai_command_actions (command_id, created_at);
CREATE INDEX IF NOT EXISTS idx_ai_command_actions_agency_status
  ON public.ai_command_actions (agency_id, status, created_at DESC);

CREATE TABLE IF NOT EXISTS public.ai_approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action_id UUID NOT NULL REFERENCES public.ai_command_actions(id) ON DELETE RESTRICT,
  agency_id INTEGER NOT NULL DEFAULT 1,
  approver_id TEXT NOT NULL,
  decision TEXT NOT NULL CHECK (decision IN ('approved','rejected','cancelled','expired')),
  payload_hash TEXT NOT NULL CHECK (payload_hash ~ '^[a-f0-9]{64}$'),
  decision_note TEXT NOT NULL DEFAULT '',
  decided_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ai_approvals_action_time
  ON public.ai_approvals (action_id, decided_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_approvals_agency_expiry
  ON public.ai_approvals (agency_id, expires_at);

CREATE TABLE IF NOT EXISTS public.ai_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action_id UUID NOT NULL REFERENCES public.ai_command_actions(id) ON DELETE RESTRICT,
  agency_id INTEGER NOT NULL DEFAULT 1,
  provider TEXT NOT NULL DEFAULT 'make',
  idempotency_key TEXT NOT NULL UNIQUE CHECK (length(btrim(idempotency_key)) > 0),
  status TEXT NOT NULL DEFAULT 'queued'
    CHECK (status IN ('queued','running','succeeded','partially_succeeded','failed','cancelled','expired','unknown')),
  request_hash TEXT NOT NULL CHECK (request_hash ~ '^[a-f0-9]{64}$'),
  provider_reference TEXT,
  result JSONB NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(result) = 'object'),
  error_detail TEXT NOT NULL DEFAULT '',
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ai_executions_agency_status
  ON public.ai_executions (agency_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_executions_action
  ON public.ai_executions (action_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.ai_tool_registry (
  name TEXT PRIMARY KEY,
  description TEXT NOT NULL DEFAULT '',
  allowed_agents TEXT[] NOT NULL DEFAULT '{}',
  input_schema JSONB NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(input_schema) = 'object'),
  output_schema JSONB NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(output_schema) = 'object'),
  execution_method TEXT NOT NULL,
  make_hook_key TEXT,
  requires_approval BOOLEAN NOT NULL DEFAULT FALSE,
  timeout_seconds INTEGER NOT NULL DEFAULT 30 CHECK (timeout_seconds BETWEEN 1 AND 600),
  max_attempts INTEGER NOT NULL DEFAULT 1 CHECK (max_attempts BETWEEN 1 AND 10),
  enabled BOOLEAN NOT NULL DEFAULT FALSE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.ai_knowledge_ingestion_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id INTEGER NOT NULL DEFAULT 1,
  document_id UUID REFERENCES public.knowledge_documents(id) ON DELETE SET NULL,
  source_key TEXT NOT NULL,
  content_hash TEXT NOT NULL CHECK (content_hash ~ '^[a-f0-9]{64}$'),
  status TEXT NOT NULL DEFAULT 'queued'
    CHECK (status IN ('queued','validating','extracting','chunking','embedding','succeeded','failed','cancelled')),
  attempt_count INTEGER NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
  error_detail TEXT NOT NULL DEFAULT '',
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(metadata) = 'object'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_ai_knowledge_ingestion_jobs_status
  ON public.ai_knowledge_ingestion_jobs (agency_id, status, created_at);

-- All command and ingestion data stays server-managed until a dedicated,
-- agency-scoped read API and its RLS model are implemented and reviewed.
DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'ai_commands','ai_command_actions','ai_approvals','ai_executions',
    'ai_tool_registry','ai_knowledge_ingestion_jobs'
  ] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('REVOKE ALL ON TABLE public.%I FROM anon, authenticated', t);
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.%I TO service_role', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_service_role_only', t);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR ALL TO service_role USING (true) WITH CHECK (true)',
      t || '_service_role_only', t
    );
  END LOOP;
END $$;

COMMENT ON TABLE public.ai_commands IS
  'Natural-language command plans and lifecycle state for the agency AI Command Center.';
COMMENT ON TABLE public.ai_command_actions IS
  'Typed, hash-bound proposed tool actions; execution authorization is enforced server-side.';
COMMENT ON TABLE public.ai_approvals IS
  'Owner approval decisions bound to the exact action payload hash and an expiry.';
COMMENT ON TABLE public.ai_executions IS
  'Idempotent execution ledger; unknown outcomes require reconciliation before retry.';
COMMENT ON TABLE public.ai_tool_registry IS
  'Allowlisted tool declarations. Enabling tools requires server-side schema and authorization enforcement.';
COMMENT ON TABLE public.ai_knowledge_ingestion_jobs IS
  'Private lifecycle and error tracking for agency knowledge ingestion jobs.';
