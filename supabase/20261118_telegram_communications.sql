-- Telegram subscriber consent, broadcasts, and applicant conversations.
-- Applicant IDs intentionally remain text: ATS profiles currently live in the
-- shared app_data document and are not represented by a normalized FK table.
CREATE TABLE IF NOT EXISTS public.telegram_subscribers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id INTEGER NOT NULL DEFAULT 1,
  applicant_id TEXT,
  telegram_chat_id TEXT NOT NULL,
  telegram_user_id TEXT NOT NULL,
  telegram_username TEXT,
  first_name TEXT NOT NULL DEFAULT '',
  language_code TEXT,
  nationality TEXT,
  applicant_status TEXT,
  experience_years NUMERIC(5,2),
  telegram_profile_draft JSONB NOT NULL DEFAULT '{}'::jsonb,
  subscription_status TEXT NOT NULL DEFAULT 'active' CHECK (subscription_status IN ('active','blocked','unsubscribed')),
  consent_status TEXT NOT NULL DEFAULT 'active' CHECK (consent_status IN ('active','revoked')),
  subscribed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  unsubscribed_at TIMESTAMPTZ,
  last_interaction_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (agency_id, telegram_chat_id),
  UNIQUE (agency_id, telegram_user_id)
);
ALTER TABLE public.telegram_subscribers ADD COLUMN IF NOT EXISTS nationality TEXT;
ALTER TABLE public.telegram_subscribers ADD COLUMN IF NOT EXISTS applicant_status TEXT;
ALTER TABLE public.telegram_subscribers ADD COLUMN IF NOT EXISTS experience_years NUMERIC(5,2);
ALTER TABLE public.telegram_subscribers ADD COLUMN IF NOT EXISTS telegram_profile_draft JSONB NOT NULL DEFAULT '{}'::jsonb;
CREATE INDEX IF NOT EXISTS idx_telegram_subscribers_active
  ON public.telegram_subscribers (agency_id, subscription_status, consent_status, last_interaction_at DESC);

CREATE TABLE IF NOT EXISTS public.telegram_broadcasts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id INTEGER NOT NULL DEFAULT 1,
  idempotency_key TEXT NOT NULL,
  title TEXT NOT NULL DEFAULT '',
  message TEXT NOT NULL,
  media_url TEXT,
  recipient_filter JSONB NOT NULL DEFAULT '{}'::jsonb,
  total_recipients INTEGER NOT NULL DEFAULT 0,
  successful_count INTEGER NOT NULL DEFAULT 0,
  failed_count INTEGER NOT NULL DEFAULT 0,
  skipped_count INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued','sending','paused','completed','failed')),
  created_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  UNIQUE (agency_id, idempotency_key)
);
CREATE TABLE IF NOT EXISTS public.telegram_broadcast_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  broadcast_id UUID NOT NULL REFERENCES public.telegram_broadcasts(id) ON DELETE CASCADE,
  applicant_id TEXT,
  telegram_chat_id TEXT NOT NULL,
  telegram_message_id TEXT,
  delivery_status TEXT NOT NULL DEFAULT 'queued' CHECK (delivery_status IN ('queued','sent','failed','skipped')),
  error_message TEXT,
  sent_at TIMESTAMPTZ,
  UNIQUE (broadcast_id, telegram_chat_id)
);
CREATE TABLE IF NOT EXISTS public.telegram_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id INTEGER NOT NULL DEFAULT 1,
  applicant_id TEXT,
  telegram_chat_id TEXT NOT NULL,
  conversation_status TEXT NOT NULL DEFAULT 'active' CHECK (conversation_status IN ('active','needs_attention','human','closed')),
  assigned_admin_id TEXT,
  last_message_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (agency_id, telegram_chat_id)
);
CREATE TABLE IF NOT EXISTS public.telegram_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.telegram_conversations(id) ON DELETE CASCADE,
  sender_type TEXT NOT NULL CHECK (sender_type IN ('applicant','ai','admin','system')),
  message_text TEXT NOT NULL DEFAULT '',
  telegram_message_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_telegram_messages_conversation
  ON public.telegram_messages (conversation_id, created_at);

-- These records include private applicant conversations and chat identifiers.
-- Only the backend Worker accesses them with the service-role key.
ALTER TABLE public.telegram_subscribers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.telegram_broadcasts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.telegram_broadcast_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.telegram_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.telegram_messages ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.telegram_subscribers, public.telegram_broadcasts,
  public.telegram_broadcast_logs, public.telegram_conversations,
  public.telegram_messages FROM anon, authenticated;
GRANT ALL ON public.telegram_subscribers, public.telegram_broadcasts,
  public.telegram_broadcast_logs, public.telegram_conversations,
  public.telegram_messages TO service_role;
