-- Link standalone maid-profile interviews to the maid reference code.
-- Maid profiles are stored in the application data store, so the reference
-- code is intentionally not a foreign key.

ALTER TABLE public.interviews
  ADD COLUMN IF NOT EXISTS maid_reference_code TEXT,
  ADD COLUMN IF NOT EXISTS candidate_invitation_sent_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_interviews_agency_maid_schedule
  ON public.interviews (agency_id, maid_reference_code, scheduled_at DESC)
  WHERE maid_reference_code IS NOT NULL;
