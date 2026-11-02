-- Structured, staff-managed MOM/IPA tracking tied to the existing placement.
-- This does not call MOM or make a legal/immigration decision.

CREATE TABLE IF NOT EXISTS public.placement_mom_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id INTEGER NOT NULL DEFAULT 1,
  placement_id UUID NOT NULL UNIQUE REFERENCES public.placements(id) ON DELETE CASCADE,
  applicant_id TEXT NOT NULL DEFAULT '',
  employer_id TEXT NOT NULL DEFAULT '',
  submission_date DATE,
  application_reference TEXT NOT NULL DEFAULT '',
  ipa_status TEXT NOT NULL DEFAULT 'NOT_STARTED'
    CHECK (ipa_status IN (
      'NOT_STARTED', 'DOCUMENTS_PREPARING', 'READY_FOR_SUBMISSION',
      'AWAITING_HUMAN_APPROVAL', 'SUBMITTED_TO_MOM', 'PENDING_APPROVAL',
      'APPROVED', 'REJECTED', 'ADDITIONAL_INFORMATION_REQUIRED'
    )),
  ipa_document_id UUID REFERENCES public.document_metadata(id) ON DELETE SET NULL,
  approval_date DATE,
  rejection_reason TEXT NOT NULL DEFAULT '',
  assigned_to TEXT NOT NULL DEFAULT '',
  notes TEXT NOT NULL DEFAULT '',
  updated_by TEXT NOT NULL DEFAULT 'system',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS placement_mom_applications_agency_status_idx
  ON public.placement_mom_applications (agency_id, ipa_status, submission_date);

ALTER TABLE public.placement_mom_applications ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.placement_mom_applications FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.placement_mom_applications TO service_role;

COMMENT ON TABLE public.placement_mom_applications IS
  'Agency staff record MOM and IPA application facts. Updates are manual; no MOM integration or automated legal decision is implied.';
