-- One-purpose, expiring contractor acknowledgement links for assigned jobs.
-- Only a SHA-256 digest is stored; the bearer token is returned once to staff.

ALTER TABLE public.contractor_jobs
  ADD COLUMN IF NOT EXISTS acknowledgement_token_hash TEXT,
  ADD COLUMN IF NOT EXISTS acknowledgement_token_expires_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_contractor_jobs_ack_token_hash
  ON public.contractor_jobs (acknowledgement_token_hash)
  WHERE acknowledgement_token_hash IS NOT NULL;

COMMENT ON COLUMN public.contractor_jobs.acknowledgement_token_hash IS
  'Hash of a one-purpose contractor acknowledgement bearer token. The raw token is never stored.';
COMMENT ON COLUMN public.contractor_jobs.acknowledgement_token_expires_at IS
  'Expiry for the one-purpose contractor acknowledgement link.';
