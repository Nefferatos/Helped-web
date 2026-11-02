-- Consent ledger required by AI Marketing audience scans and campaign drafts.
-- Without an active, explicit channel consent, contacts remain ineligible.
CREATE TABLE IF NOT EXISTS public.consents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id INTEGER NOT NULL DEFAULT 1,
  subject TEXT NOT NULL,
  channel TEXT NOT NULL CHECK (channel IN ('marketing', 'whatsapp', 'sms', 'email')),
  source TEXT NOT NULL DEFAULT 'manual',
  consented_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  unsubscribed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (agency_id, subject, channel)
);

CREATE INDEX IF NOT EXISTS idx_consents_active_lookup
  ON public.consents (agency_id, subject, channel) WHERE unsubscribed_at IS NULL;

ALTER TABLE public.consents ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.consents FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.consents TO service_role;

DROP POLICY IF EXISTS "consents_service_role_only" ON public.consents;
CREATE POLICY "consents_service_role_only" ON public.consents
  FOR ALL TO service_role USING (true) WITH CHECK (true);
