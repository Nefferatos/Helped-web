-- Add auditable contractor assignment and staff-recorded acknowledgement to
-- existing contractor jobs. Contractor identity and completion history remain.

ALTER TABLE public.contractor_jobs
  ADD COLUMN IF NOT EXISTS assigned_by TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS assignment_note TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS acknowledged_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS acknowledged_by TEXT,
  ADD COLUMN IF NOT EXISTS acknowledgement_note TEXT NOT NULL DEFAULT '';

ALTER TABLE public.contractor_jobs DROP CONSTRAINT IF EXISTS contractor_jobs_status_check;
ALTER TABLE public.contractor_jobs
  ADD CONSTRAINT contractor_jobs_status_check
  CHECK (status IN ('PENDING', 'ACKNOWLEDGED', 'IN_PROGRESS', 'COMPLETED', 'BLOCKED', 'CANCELLED'));

CREATE INDEX IF NOT EXISTS idx_contractor_jobs_placement_status
  ON public.contractor_jobs (placement_id, status, due_at);

COMMENT ON COLUMN public.contractor_jobs.acknowledged_by IS
  'Agency staff member who recorded that the assigned contractor acknowledged the task.';
