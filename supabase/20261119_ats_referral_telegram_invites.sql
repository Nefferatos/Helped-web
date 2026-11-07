-- Link an agency referral lead only after the referred person voluntarily
-- starts the agency's Telegram bot using their single-use deep-link token.
ALTER TABLE public.ats_referral_leads
  ADD COLUMN IF NOT EXISTS telegram_chat_id TEXT,
  ADD COLUMN IF NOT EXISTS telegram_started_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS telegram_invite_token TEXT,
  ADD COLUMN IF NOT EXISTS telegram_invite_expires_at TIMESTAMPTZ;

CREATE UNIQUE INDEX IF NOT EXISTS ats_referral_leads_telegram_invite_token_idx
  ON public.ats_referral_leads (telegram_invite_token)
  WHERE telegram_invite_token IS NOT NULL;

CREATE INDEX IF NOT EXISTS ats_referral_leads_agency_telegram_chat_idx
  ON public.ats_referral_leads (agency_id, telegram_chat_id)
  WHERE telegram_chat_id IS NOT NULL;
