-- Extend the existing interview records with the staff-controlled lifecycle
-- needed for confirmation, rescheduling, outcomes, and reminder deduplication.
-- This migration preserves existing interview rows and values.

ALTER TABLE public.interviews
  ADD COLUMN IF NOT EXISTS employer_confirmed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS applicant_confirmed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS outcome TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS cancellation_reason TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS reschedule_reason TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS candidate_name TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS candidate_email TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS reminders_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS reminder_24h_sent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS reminder_2h_sent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS reminder_morning_sent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS employer_reminder_24h_sent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS employer_reminder_2h_sent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS employer_reminder_morning_sent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS updated_by TEXT NOT NULL DEFAULT 'system';

ALTER TABLE public.interviews DROP CONSTRAINT IF EXISTS interviews_status_check;
ALTER TABLE public.interviews
  ADD CONSTRAINT interviews_status_check CHECK (status IN (
    'REQUESTED',
    'AWAITING_EMPLOYER_CONFIRMATION',
    'AWAITING_APPLICANT_CONFIRMATION',
    'SCHEDULED',
    'CONFIRMED',
    'RESCHEDULED',
    'COMPLETED',
    'PASSED',
    'FAILED',
    'SECOND_INTERVIEW',
    'CANCELLED',
    'NO_SHOW'
  ));

CREATE INDEX IF NOT EXISTS idx_interviews_agency_status_schedule
  ON public.interviews (agency_id, status, scheduled_at);

CREATE TABLE IF NOT EXISTS public.interview_reminder_deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id TEXT NOT NULL UNIQUE,
  agency_id INTEGER NOT NULL,
  interview_id UUID NOT NULL REFERENCES public.interviews(id) ON DELETE CASCADE,
  reminder_type TEXT NOT NULL CHECK (reminder_type IN ('24_hour', 'morning_of', '2_hour')),
  recipient_type TEXT NOT NULL DEFAULT 'applicant' CHECK (recipient_type IN ('applicant', 'employer')),
  recipient_email TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'SENDING', 'DELIVERED', 'FAILED', 'CANCELLED')),
  attempts INTEGER NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  recipient_name TEXT NOT NULL DEFAULT '',
  next_attempt_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_error TEXT NOT NULL DEFAULT '',
  delivered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
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

COMMENT ON COLUMN public.interviews.outcome IS
  'Staff-entered interview outcome. AI recommendations are not authoritative outcomes.';
COMMENT ON COLUMN public.interviews.reminder_24h_sent_at IS
  'Idempotency marker for the 24-hour interview reminder.';
COMMENT ON COLUMN public.interviews.reminder_2h_sent_at IS
  'Idempotency marker for the near-interview reminder.';
COMMENT ON COLUMN public.interviews.reminder_morning_sent_at IS
  'Idempotency marker for the interview-day morning reminder.';
COMMENT ON COLUMN public.interviews.employer_reminder_24h_sent_at IS
  'Idempotency marker for the employer 24-hour interview reminder.';
COMMENT ON COLUMN public.interviews.employer_reminder_2h_sent_at IS
  'Idempotency marker for the employer near-interview reminder.';
COMMENT ON COLUMN public.interviews.employer_reminder_morning_sent_at IS
  'Idempotency marker for the employer interview-day morning reminder.';
COMMENT ON COLUMN public.interviews.reminders_enabled IS
  'Applicant reminders are sent only when staff enables them while scheduling the interview.';
