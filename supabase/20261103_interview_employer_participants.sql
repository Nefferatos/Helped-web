-- Store the employer participant contact separately on the existing interview.
-- This enables an agency staff member to record a verified address and send an
-- invitation without changing applicant invitations or existing interview rows.

ALTER TABLE public.interviews
  ADD COLUMN IF NOT EXISTS employer_name TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS employer_email TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS employer_contact_verified_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS employer_invitation_sent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS employer_confirmation_token_hash TEXT,
  ADD COLUMN IF NOT EXISTS employer_confirmation_expires_at TIMESTAMPTZ;

COMMENT ON COLUMN public.interviews.employer_contact_verified_at IS
  'Agency staff timestamp confirming the employer participant address was checked before sending interview details.';
COMMENT ON COLUMN public.interviews.employer_invitation_sent_at IS
  'Timestamp when the employer interview invitation was accepted by the configured email provider.';
COMMENT ON COLUMN public.interviews.employer_confirmation_token_hash IS
  'Hash of the one-purpose employer confirmation token; the raw token is only sent by email.';
