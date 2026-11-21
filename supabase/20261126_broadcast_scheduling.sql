-- Restore intentional, owner-approved future scheduling for WhatsApp and Telegram.
-- The former WhatsApp scheduled state was removed after its dispatcher was retired;
-- this migration adds a new due-time field and a Worker cron dispatcher.

ALTER TABLE public.whatsapp_marketing_campaigns
  ADD COLUMN IF NOT EXISTS scheduled_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS contact_tags TEXT[] NOT NULL DEFAULT '{}';

ALTER TABLE public.whatsapp_marketing_campaigns
  DROP CONSTRAINT IF EXISTS whatsapp_marketing_campaigns_campaign_status_check;

ALTER TABLE public.whatsapp_marketing_campaigns
  ADD CONSTRAINT whatsapp_marketing_campaigns_campaign_status_check
  CHECK (campaign_status IN ('draft','scheduled','queued','sending','paused','completed','cancelled','failed'));

CREATE INDEX IF NOT EXISTS idx_wa_marketing_campaigns_due
  ON public.whatsapp_marketing_campaigns (scheduled_at, created_at)
  WHERE campaign_status = 'scheduled' AND scheduled_at IS NOT NULL;

ALTER TABLE public.telegram_broadcasts
  ADD COLUMN IF NOT EXISTS scheduled_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS media_file_id TEXT,
  ADD COLUMN IF NOT EXISTS media_type TEXT;

ALTER TABLE public.telegram_broadcasts
  DROP CONSTRAINT IF EXISTS telegram_broadcasts_status_check;

ALTER TABLE public.telegram_broadcasts
  ADD CONSTRAINT telegram_broadcasts_status_check
  CHECK (status IN ('scheduled','queued','sending','paused','completed','failed','cancelled'));

ALTER TABLE public.telegram_broadcasts
  DROP CONSTRAINT IF EXISTS telegram_broadcasts_media_type_check;

ALTER TABLE public.telegram_broadcasts
  ADD CONSTRAINT telegram_broadcasts_media_type_check
  CHECK (media_type IS NULL OR media_type IN ('image','video','document'));

CREATE INDEX IF NOT EXISTS idx_telegram_broadcasts_due
  ON public.telegram_broadcasts (scheduled_at, created_at)
  WHERE status = 'scheduled' AND scheduled_at IS NOT NULL;
