-- Let an assigned contractor report completed work through the existing
-- expiring acknowledgement link. Agency staff still verify and close tasks.

ALTER TABLE public.contractor_jobs
  ADD COLUMN IF NOT EXISTS completion_reported_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS completion_report_note TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS completion_reported_by TEXT;

ALTER TABLE public.contractor_jobs DROP CONSTRAINT IF EXISTS contractor_jobs_status_check;
ALTER TABLE public.contractor_jobs
  ADD CONSTRAINT contractor_jobs_status_check
  CHECK (status IN ('PENDING', 'ACKNOWLEDGED', 'IN_PROGRESS', 'COMPLETION_REPORTED', 'COMPLETED', 'BLOCKED', 'CANCELLED'));

CREATE INDEX IF NOT EXISTS idx_contractor_jobs_completion_review
  ON public.contractor_jobs (completion_reported_at, due_at)
  WHERE status = 'COMPLETION_REPORTED';

COMMENT ON COLUMN public.contractor_jobs.completion_reported_at IS
  'Time the assigned contractor reported completion; staff verification is still required before COMPLETED.';
