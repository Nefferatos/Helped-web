-- Workflow state for the existing ATS applications. Applicant profile data
-- remains in helped_ats_profiles; this table stores only consent, conversation
-- progress, and reviewable draft state keyed to that application.

CREATE TABLE IF NOT EXISTS public.helped_ats_applicant_workflows (
  app_id TEXT NOT NULL,
  application_id TEXT NOT NULL,
  agency_id INTEGER NOT NULL,
  conversation_id UUID NOT NULL DEFAULT gen_random_uuid(),
  profile_state JSONB NOT NULL DEFAULT '{}'::JSONB CHECK (jsonb_typeof(profile_state) = 'object'),
  missing_fields TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  last_reply TEXT NOT NULL DEFAULT '',
  confirmation_summary TEXT NOT NULL DEFAULT '',
  profile_ready_for_confirmation BOOLEAN NOT NULL DEFAULT FALSE,
  processing_consent_at TIMESTAMPTZ,
  processing_consent_source TEXT NOT NULL DEFAULT '',
  applicant_confirmed_at TIMESTAMPTZ,
  publication_consent_at TIMESTAMPTZ,
  publication_consent_source TEXT NOT NULL DEFAULT '',
  publication_consent_withdrawn_at TIMESTAMPTZ,
  public_profile_draft JSONB CHECK (public_profile_draft IS NULL OR jsonb_typeof(public_profile_draft) = 'object'),
  draft_status TEXT NOT NULL DEFAULT 'not_started'
    CHECK (draft_status IN ('not_started', 'not_ready', 'pending_staff_review', 'approved', 'rejected', 'published', 'withdrawn')),
  staff_review_note TEXT NOT NULL DEFAULT '',
  reviewed_by TEXT,
  reviewed_at TIMESTAMPTZ,
  published_reference_code TEXT NOT NULL DEFAULT '',
  published_at TIMESTAMPTZ,
  published_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (app_id, application_id),
  CONSTRAINT helped_ats_applicant_workflows_application_fk
    FOREIGN KEY (app_id, application_id)
    REFERENCES public.helped_ats_applications (app_id, record_id)
    ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS helped_ats_applicant_workflows_review_idx
  ON public.helped_ats_applicant_workflows (agency_id, draft_status, updated_at DESC);

ALTER TABLE public.helped_ats_applicant_workflows
  ADD COLUMN IF NOT EXISTS published_reference_code TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS published_by TEXT;

ALTER TABLE public.helped_ats_applicant_workflows ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.helped_ats_applicant_workflows FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.helped_ats_applicant_workflows TO service_role;
