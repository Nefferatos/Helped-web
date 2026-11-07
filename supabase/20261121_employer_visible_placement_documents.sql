-- Agency uploads stay private until staff explicitly shares them with the employer.
ALTER TABLE public.document_metadata
  ADD COLUMN IF NOT EXISTS employer_visible BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN public.document_metadata.employer_visible IS
  'Whether a placement document is intentionally available to the linked employer through the client portal.';

CREATE INDEX IF NOT EXISTS document_metadata_employer_visible_placement_idx
  ON public.document_metadata (agency_id, entity_id, created_at DESC)
  WHERE entity_type = 'placement' AND employer_visible = TRUE;
