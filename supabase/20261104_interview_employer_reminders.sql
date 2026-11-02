-- Add employer participants to the existing interview reminder outbox.
-- Existing queued rows remain applicant reminders through the default value.
-- Apply supabase/20261031_interview_lifecycle.sql first. It creates the
-- interviews table and its lifecycle fields. Keep this migration safe to rerun.

-- A missing relation here means the lifecycle migration has not been applied
-- in this database. Create the outbox with the original applicant-reminder
-- contract so this migration can recover safely; the earlier migration's
-- CREATE TABLE IF NOT EXISTS and index/trigger statements remain compatible.
CREATE TABLE IF NOT EXISTS public.interview_reminder_deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id TEXT NOT NULL UNIQUE,
  agency_id INTEGER NOT NULL,
  interview_id UUID NOT NULL REFERENCES public.interviews(id) ON DELETE CASCADE,
  reminder_type TEXT NOT NULL CHECK (reminder_type IN ('24_hour', 'morning_of', '2_hour')),
  recipient_type TEXT NOT NULL DEFAULT 'applicant',
  recipient_email TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'SENDING', 'DELIVERED', 'FAILED', 'CANCELLED')),
  attempts INTEGER NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  recipient_name TEXT NOT NULL DEFAULT '',
  next_attempt_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_error TEXT NOT NULL DEFAULT '',
  delivered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT interview_reminder_deliveries_recipient_type_check
    CHECK (recipient_type IN ('applicant', 'employer'))
);

CREATE INDEX IF NOT EXISTS idx_interview_reminders_dispatch
  ON public.interview_reminder_deliveries (status, next_attempt_at, created_at);
CREATE INDEX IF NOT EXISTS idx_interview_reminders_agency
  ON public.interview_reminder_deliveries (agency_id, interview_id, reminder_type);

ALTER TABLE public.interview_reminder_deliveries ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.interview_reminder_deliveries FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.interview_reminder_deliveries TO service_role;

CREATE OR REPLACE FUNCTION public.set_interview_reminder_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS interview_reminders_set_updated_at ON public.interview_reminder_deliveries;
CREATE TRIGGER interview_reminders_set_updated_at
BEFORE UPDATE ON public.interview_reminder_deliveries
FOR EACH ROW EXECUTE FUNCTION public.set_interview_reminder_updated_at();

ALTER TABLE public.interviews
  ADD COLUMN IF NOT EXISTS employer_reminder_24h_sent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS employer_reminder_2h_sent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS employer_reminder_morning_sent_at TIMESTAMPTZ;

ALTER TABLE public.interview_reminder_deliveries
  ADD COLUMN IF NOT EXISTS recipient_type TEXT NOT NULL DEFAULT 'applicant';

ALTER TABLE public.interview_reminder_deliveries
  DROP CONSTRAINT IF EXISTS interview_reminder_deliveries_recipient_type_check;
ALTER TABLE public.interview_reminder_deliveries
  ADD CONSTRAINT interview_reminder_deliveries_recipient_type_check
    CHECK (recipient_type IN ('applicant', 'employer'));

COMMENT ON COLUMN public.interviews.employer_reminder_24h_sent_at IS
  'Idempotency marker for the employer 24-hour interview reminder.';
COMMENT ON COLUMN public.interviews.employer_reminder_2h_sent_at IS
  'Idempotency marker for the employer near-interview reminder.';
COMMENT ON COLUMN public.interviews.employer_reminder_morning_sent_at IS
  'Idempotency marker for the employer interview-day morning reminder.';
