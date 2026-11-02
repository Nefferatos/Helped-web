-- Private, staff-reviewed requests from applicants about their personal data.
-- The row deliberately does not cascade with an application deletion so the
-- agency can keep an auditable request outcome according to its retention rules.

CREATE TABLE IF NOT EXISTS public.ats_data_subject_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  app_id TEXT NOT NULL,
  application_id TEXT NOT NULL,
  agency_id INTEGER NOT NULL,
  request_type TEXT NOT NULL CHECK (request_type IN ('ACCESS', 'CORRECTION', 'ERASURE')),
  status TEXT NOT NULL DEFAULT 'PENDING'
    CHECK (status IN ('PENDING', 'IN_REVIEW', 'FULFILLED', 'DECLINED')),
  applicant_note TEXT NOT NULL DEFAULT '',
  resolution_note TEXT NOT NULL DEFAULT '',
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMPTZ,
  resolved_by TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ats_data_subject_requests_agency_status_idx
  ON public.ats_data_subject_requests (agency_id, status, submitted_at DESC);
CREATE INDEX IF NOT EXISTS ats_data_subject_requests_application_idx
  ON public.ats_data_subject_requests (app_id, application_id, submitted_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS ats_data_subject_requests_one_open_per_type_idx
  ON public.ats_data_subject_requests (app_id, application_id, request_type)
  WHERE status IN ('PENDING', 'IN_REVIEW');

ALTER TABLE public.ats_data_subject_requests ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.ats_data_subject_requests FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.ats_data_subject_requests TO service_role;

COMMENT ON TABLE public.ats_data_subject_requests IS
  'Applicant access, correction, or erasure requests. Staff must verify and record action; this table does not execute deletion.';
