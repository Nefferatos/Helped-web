-- Add an explicit review outcome for uploads that need correction.
-- Existing task states and records are preserved.

ALTER TABLE public.deployment_tasks
  DROP CONSTRAINT IF EXISTS deployment_tasks_status_check;

ALTER TABLE public.deployment_tasks
  ADD CONSTRAINT deployment_tasks_status_check CHECK (status IN (
    'NOT_STARTED',
    'PLANNED',
    'IN_PROGRESS',
    'VERIFICATION_PENDING',
    'VERIFIED',
    'REJECTED',
    'RESUBMISSION_REQUIRED',
    'BLOCKED',
    'NOT_APPLICABLE'
  ));

COMMENT ON COLUMN public.deployment_tasks.status IS
  'Workflow state. RESUBMISSION_REQUIRED means an uploaded item needs correction; only VERIFIED represents staff-verified completion.';
