-- At The Agency WhatsApp marketing contacts and campaign delivery.
-- All tables are private to the Worker service role; browser access is through authenticated APIs.
CREATE TABLE IF NOT EXISTS public.whatsapp_marketing_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id integer NOT NULL DEFAULT 1,
  full_name text NOT NULL DEFAULT '',
  phone_number text NOT NULL,
  email text NOT NULL DEFAULT '',
  company text NOT NULL DEFAULT '',
  tags text[] NOT NULL DEFAULT '{}',
  consent_status text NOT NULL DEFAULT 'not_consented' CHECK (consent_status IN ('subscribed','not_consented','opted_out')),
  consent_source text NOT NULL DEFAULT '',
  consent_timestamp timestamptz,
  opted_out_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  last_message_sent_at timestamptz,
  UNIQUE (agency_id, phone_number),
  CHECK (consent_status <> 'subscribed' OR (length(consent_source) >= 5 AND consent_timestamp IS NOT NULL))
);
CREATE INDEX IF NOT EXISTS idx_wa_marketing_contacts_agency_consent ON public.whatsapp_marketing_contacts (agency_id, consent_status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_wa_marketing_contacts_tags ON public.whatsapp_marketing_contacts USING gin(tags);

CREATE TABLE IF NOT EXISTS public.whatsapp_marketing_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id integer NOT NULL DEFAULT 1,
  campaign_name text NOT NULL,
  description text NOT NULL DEFAULT '',
  message_content text NOT NULL,
  campaign_status text NOT NULL DEFAULT 'draft' CHECK (campaign_status IN ('draft','queued','sending','paused','completed','cancelled','failed')),
  started_at timestamptz,
  completed_at timestamptz,
  total_recipients integer NOT NULL DEFAULT 0,
  sent_count integer NOT NULL DEFAULT 0,
  failed_count integer NOT NULL DEFAULT 0,
  pending_count integer NOT NULL DEFAULT 0,
  created_by text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  dispatch_key text,
  dispatched_at timestamptz,
  UNIQUE (agency_id, dispatch_key)
);
CREATE INDEX IF NOT EXISTS idx_wa_marketing_campaigns_agency_created ON public.whatsapp_marketing_campaigns (agency_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.whatsapp_marketing_recipients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES public.whatsapp_marketing_campaigns(id) ON DELETE CASCADE,
  contact_id uuid NOT NULL REFERENCES public.whatsapp_marketing_contacts(id) ON DELETE RESTRICT,
  agency_id integer NOT NULL DEFAULT 1,
  phone_number text NOT NULL,
  personalized_message text NOT NULL,
  delivery_status text NOT NULL DEFAULT 'pending' CHECK (delivery_status IN ('pending','queued','sending','sent','delivered','read','failed','skipped')),
  attempt_count integer NOT NULL DEFAULT 0,
  last_error text NOT NULL DEFAULT '',
  waha_message_id text,
  sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (campaign_id, contact_id)
);
CREATE INDEX IF NOT EXISTS idx_wa_marketing_recipients_campaign_status ON public.whatsapp_marketing_recipients (campaign_id, delivery_status, created_at);
CREATE UNIQUE INDEX IF NOT EXISTS idx_wa_marketing_recipients_waha_message ON public.whatsapp_marketing_recipients (waha_message_id) WHERE waha_message_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.whatsapp_marketing_message_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id integer NOT NULL DEFAULT 1,
  campaign_id uuid REFERENCES public.whatsapp_marketing_campaigns(id) ON DELETE SET NULL,
  contact_id uuid REFERENCES public.whatsapp_marketing_contacts(id) ON DELETE SET NULL,
  phone_number text NOT NULL,
  direction text NOT NULL CHECK (direction IN ('incoming','outgoing')),
  message_content text NOT NULL DEFAULT '',
  message_status text NOT NULL DEFAULT 'received' CHECK (message_status IN ('queued','sent','delivered','read','failed','received','suppressed')),
  waha_message_id text,
  error_message text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (waha_message_id)
);
CREATE INDEX IF NOT EXISTS idx_wa_marketing_message_logs_agency_created ON public.whatsapp_marketing_message_logs (agency_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.whatsapp_marketing_webhook_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_key text NOT NULL UNIQUE,
  event_type text NOT NULL,
  event_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  processed boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz
);
CREATE TABLE IF NOT EXISTS public.whatsapp_marketing_settings (
  agency_id integer PRIMARY KEY DEFAULT 1,
  ai_auto_reply_enabled boolean NOT NULL DEFAULT false,
  ai_reply_instructions text NOT NULL DEFAULT 'Answer briefly and helpfully as At The Agency. Do not send promotional messages, ask for sensitive personal information, or claim a human has completed an action. If unsure, say a team member will follow up.',
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.whatsapp_marketing_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_marketing_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_marketing_recipients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_marketing_message_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_marketing_webhook_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_marketing_settings ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.whatsapp_marketing_contacts, public.whatsapp_marketing_campaigns,
  public.whatsapp_marketing_recipients, public.whatsapp_marketing_message_logs,
  public.whatsapp_marketing_webhook_events, public.whatsapp_marketing_settings FROM anon, authenticated;
GRANT ALL ON public.whatsapp_marketing_contacts, public.whatsapp_marketing_campaigns,
  public.whatsapp_marketing_recipients, public.whatsapp_marketing_message_logs,
  public.whatsapp_marketing_webhook_events, public.whatsapp_marketing_settings TO service_role;

-- Atomic claim: Make receives only one pending/failed recipient at a time and can't
-- claim contacts whose opt-in has been withdrawn. SENT rows are never claimable.
CREATE OR REPLACE FUNCTION public.claim_whatsapp_marketing_recipient(p_recipient_id uuid)
RETURNS SETOF public.whatsapp_marketing_recipients
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE public.whatsapp_marketing_recipients r
  SET delivery_status = 'sending', attempt_count = attempt_count + 1, updated_at = now()
  FROM public.whatsapp_marketing_contacts c, public.whatsapp_marketing_campaigns cp
  WHERE r.id = p_recipient_id AND r.contact_id = c.id AND cp.id = r.campaign_id
    AND r.delivery_status IN ('pending','failed') AND r.attempt_count < 3
    AND c.consent_status = 'subscribed' AND c.opted_out_at IS NULL
    AND cp.campaign_status IN ('queued','sending')
  RETURNING r.*;
$$;
REVOKE ALL ON FUNCTION public.claim_whatsapp_marketing_recipient(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_whatsapp_marketing_recipient(uuid) TO service_role;
