-- Add structured airport dispatch information to existing flight records.
-- This is additive; existing flights and placement history are preserved.

ALTER TABLE public.flights
  ADD COLUMN IF NOT EXISTS terminal TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS pickup_contact TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS transport_arrangement TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS accommodation_destination TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS special_instructions TEXT NOT NULL DEFAULT '';

COMMENT ON COLUMN public.flights.terminal IS 'Arrival terminal provided by the confirmed flight itinerary.';
COMMENT ON COLUMN public.flights.pickup_contact IS 'Private airport pickup contact for this placement.';
COMMENT ON COLUMN public.flights.transport_arrangement IS 'Private pickup transport arrangement.';
COMMENT ON COLUMN public.flights.accommodation_destination IS 'Private accommodation destination for the arrival.';
COMMENT ON COLUMN public.flights.special_instructions IS 'Private operational instructions for authorized dispatch staff.';
