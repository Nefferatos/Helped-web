-- Persist external calendar and sheet references so interview rescheduling
-- updates the same records instead of creating a duplicate invitation row.
ALTER TABLE public.interviews
  ADD COLUMN IF NOT EXISTS calendar_event_id TEXT,
  ADD COLUMN IF NOT EXISTS calendar_event_url TEXT,
  ADD COLUMN IF NOT EXISTS calendar_sheet_row_number INTEGER,
  ADD COLUMN IF NOT EXISTS calendar_sync_updated_at TIMESTAMPTZ;

ALTER TABLE public.interviews
  DROP CONSTRAINT IF EXISTS interviews_calendar_sheet_row_number_check;
ALTER TABLE public.interviews
  ADD CONSTRAINT interviews_calendar_sheet_row_number_check
  CHECK (calendar_sheet_row_number IS NULL OR calendar_sheet_row_number >= 2);

COMMENT ON COLUMN public.interviews.calendar_event_id IS
  'External calendar event id returned by the dedicated interview Make workflow.';
COMMENT ON COLUMN public.interviews.calendar_event_url IS
  'External calendar event URL returned by the dedicated interview Make workflow.';
COMMENT ON COLUMN public.interviews.calendar_sheet_row_number IS
  'Row number in the configured interview Google Sheet; used to update that row on reschedule.';
