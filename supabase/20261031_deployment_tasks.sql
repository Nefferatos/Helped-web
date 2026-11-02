-- Additive deployment checklist for the existing placement lifecycle.
-- Apply after the existing operations schema; this does not alter existing
-- placements, task tables, documents, or their history.

CREATE TABLE IF NOT EXISTS public.deployment_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id INTEGER NOT NULL DEFAULT 1,
  placement_id UUID NOT NULL REFERENCES public.placements(id) ON DELETE CASCADE,
  task_key TEXT NOT NULL CHECK (length(btrim(task_key)) > 0),
  task_group TEXT NOT NULL CHECK (length(btrim(task_group)) > 0),
  title TEXT NOT NULL CHECK (length(btrim(title)) > 0),
  description TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'NOT_STARTED'
    CHECK (status IN ('NOT_STARTED', 'PLANNED', 'IN_PROGRESS', 'VERIFICATION_PENDING', 'VERIFIED', 'REJECTED', 'BLOCKED', 'NOT_APPLICABLE')),
  assigned_to TEXT,
  planned_at TIMESTAMPTZ,
  due_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  evidence_document_id UUID REFERENCES public.document_metadata(id) ON DELETE SET NULL,
  verification_note TEXT NOT NULL DEFAULT '',
  verified_at TIMESTAMPTZ,
  verified_by TEXT,
  notes TEXT NOT NULL DEFAULT '',
  created_by TEXT NOT NULL DEFAULT 'system',
  updated_by TEXT NOT NULL DEFAULT 'system',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (placement_id, task_key)
);

CREATE INDEX IF NOT EXISTS idx_deployment_tasks_agency_status_due
  ON public.deployment_tasks (agency_id, status, due_at);
CREATE INDEX IF NOT EXISTS idx_deployment_tasks_placement_group
  ON public.deployment_tasks (placement_id, task_group, created_at);

CREATE OR REPLACE FUNCTION public.set_deployment_task_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS deployment_tasks_set_updated_at ON public.deployment_tasks;
CREATE TRIGGER deployment_tasks_set_updated_at
BEFORE UPDATE ON public.deployment_tasks
FOR EACH ROW EXECUTE FUNCTION public.set_deployment_task_updated_at();

ALTER TABLE public.deployment_tasks ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.deployment_tasks FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.deployment_tasks TO service_role;

