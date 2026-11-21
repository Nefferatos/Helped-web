-- Phase 5: durable, actor-scoped conversations and messages for command planning.
-- The command/action foundation migration must be applied first.

CREATE TABLE IF NOT EXISTS public.ai_command_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id INTEGER NOT NULL,
  actor_id TEXT NOT NULL,
  title TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (id, agency_id, actor_id)
);
CREATE INDEX IF NOT EXISTS idx_ai_command_conversations_actor
  ON public.ai_command_conversations (agency_id, actor_id, updated_at DESC);

CREATE TABLE IF NOT EXISTS public.ai_command_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL,
  command_id UUID REFERENCES public.ai_commands(id) ON DELETE RESTRICT,
  agency_id INTEGER NOT NULL,
  actor_id TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('user','assistant','system')),
  content TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(metadata) = 'object'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  FOREIGN KEY (conversation_id, agency_id, actor_id)
    REFERENCES public.ai_command_conversations(id, agency_id, actor_id) ON DELETE RESTRICT
);
CREATE INDEX IF NOT EXISTS idx_ai_command_messages_conversation
  ON public.ai_command_messages (conversation_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_command_messages_agency_actor
  ON public.ai_command_messages (agency_id, actor_id, created_at DESC);

ALTER TABLE public.ai_command_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_command_messages ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.ai_command_conversations, public.ai_command_messages FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_command_conversations, public.ai_command_messages TO service_role;
DROP POLICY IF EXISTS ai_command_conversations_service_role_only ON public.ai_command_conversations;
CREATE POLICY ai_command_conversations_service_role_only ON public.ai_command_conversations
  FOR ALL TO service_role USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS ai_command_messages_service_role_only ON public.ai_command_messages;
CREATE POLICY ai_command_messages_service_role_only ON public.ai_command_messages
  FOR ALL TO service_role USING (true) WITH CHECK (true);

COMMENT ON TABLE public.ai_command_conversations IS 'Private, agency- and actor-scoped command center conversations.';
COMMENT ON TABLE public.ai_command_messages IS 'Command planning transcript; service-role access only.';
