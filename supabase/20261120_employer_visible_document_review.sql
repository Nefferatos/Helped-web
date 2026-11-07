-- Keep employer-facing correction instructions separate from internal staff notes.
ALTER TABLE public.deployment_tasks
  ADD COLUMN IF NOT EXISTS employer_visible_note TEXT NOT NULL DEFAULT '';

COMMENT ON COLUMN public.deployment_tasks.employer_visible_note IS
  'Staff-authored correction request safe to show to the employer for this placement task. Never use internal notes for employer-facing communication.';
