-- Retire the former scheduled-campaign state safely for existing installations.
-- These campaigns become drafts so no queued or timed send can fire unexpectedly.
DROP INDEX IF EXISTS public.idx_wa_marketing_campaigns_due;

UPDATE public.whatsapp_marketing_campaigns
SET campaign_status = 'draft',
    pending_count = 0,
    total_recipients = 0,
    updated_at = now()
WHERE campaign_status = 'scheduled';

ALTER TABLE public.whatsapp_marketing_campaigns
  DROP CONSTRAINT IF EXISTS whatsapp_marketing_campaigns_campaign_status_check;

ALTER TABLE public.whatsapp_marketing_campaigns
  ADD CONSTRAINT whatsapp_marketing_campaigns_campaign_status_check
  CHECK (campaign_status IN ('draft','queued','sending','paused','completed','cancelled','failed'));

ALTER TABLE public.whatsapp_marketing_campaigns
  DROP COLUMN IF EXISTS scheduled_at;
