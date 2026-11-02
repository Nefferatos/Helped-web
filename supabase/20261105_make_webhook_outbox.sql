-- Durable retry queue for asynchronous Make event webhooks.
-- Endpoint URLs stay in Worker secrets; the outbox stores only a hook key.

CREATE TABLE IF NOT EXISTS public.make_webhook_deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id TEXT NOT NULL UNIQUE CHECK (length(btrim(event_id)) > 0),
  hook_key TEXT NOT NULL CHECK (hook_key IN ('applicant_intake', 'fdw_event', 'maid_referral_sheet', 'placement_milestone', 'contractor_arrival', 'interview_scheduled', 'rolling_arrival_report', 'deployment_task_event')),
  agency_id INTEGER,
  payload JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'SENDING', 'DELIVERED', 'FAILED')),
  attempts INTEGER NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  max_attempts INTEGER NOT NULL DEFAULT 5 CHECK (max_attempts BETWEEN 1 AND 10),
  next_attempt_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_error TEXT NOT NULL DEFAULT '',
  delivered_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '30 days'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_make_webhook_deliveries_due
  ON public.make_webhook_deliveries (status, next_attempt_at, created_at);
CREATE INDEX IF NOT EXISTS idx_make_webhook_deliveries_expiry
  ON public.make_webhook_deliveries (expires_at);

ALTER TABLE public.make_webhook_deliveries ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.make_webhook_deliveries FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.make_webhook_deliveries TO service_role;

CREATE OR REPLACE FUNCTION public.set_make_webhook_delivery_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS make_webhook_deliveries_set_updated_at ON public.make_webhook_deliveries;
CREATE TRIGGER make_webhook_deliveries_set_updated_at
BEFORE UPDATE ON public.make_webhook_deliveries
FOR EACH ROW EXECUTE FUNCTION public.set_make_webhook_delivery_updated_at();

COMMENT ON TABLE public.make_webhook_deliveries IS
  'Private, idempotent queue for asynchronous Make events; payloads expire after 30 days.';
