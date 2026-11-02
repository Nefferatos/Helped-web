-- Agency-scoped, per-contact idempotency for staff-approved campaign emails.
-- Expired SENDING rows are uncertain and must be reviewed, not auto-retried.
CREATE TABLE IF NOT EXISTS public.marketing_message_deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id INTEGER NOT NULL,
  campaign_id UUID NOT NULL,
  contact_id TEXT NOT NULL,
  channel TEXT NOT NULL CHECK (channel = 'email'),
  status TEXT NOT NULL DEFAULT 'SENDING'
    CHECK (status IN ('SENDING', 'SENT', 'FAILED')),
  attempts INTEGER NOT NULL DEFAULT 1 CHECK (attempts > 0),
  lease_expires_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  last_error TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (agency_id, campaign_id, contact_id, channel)
);

CREATE INDEX IF NOT EXISTS idx_marketing_message_deliveries_agency_status
  ON public.marketing_message_deliveries (agency_id, status, updated_at DESC);

ALTER TABLE public.marketing_message_deliveries ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.marketing_message_deliveries FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.marketing_message_deliveries TO service_role;
