-- Extend existing employer requirements with structured household and start-date
-- inputs used by the matching workflow. Existing requirements are preserved.

ALTER TABLE public.employer_requirements
  ADD COLUMN IF NOT EXISTS household_size INTEGER CHECK (household_size IS NULL OR household_size > 0),
  ADD COLUMN IF NOT EXISTS children_count INTEGER CHECK (children_count IS NULL OR children_count >= 0),
  ADD COLUMN IF NOT EXISTS elderly_count INTEGER CHECK (elderly_count IS NULL OR elderly_count >= 0),
  ADD COLUMN IF NOT EXISTS cooking_requirements TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS preferred_start_date DATE;

COMMENT ON COLUMN public.employer_requirements.household_size IS
  'Number of people in the employer household, when supplied.';
COMMENT ON COLUMN public.employer_requirements.children_count IS
  'Number of children in the household; zero means none reported.';
COMMENT ON COLUMN public.employer_requirements.elderly_count IS
  'Number of elderly household members; zero means none reported.';
COMMENT ON COLUMN public.employer_requirements.cooking_requirements IS
  'Employer-stated cooking needs used as matching context.';
COMMENT ON COLUMN public.employer_requirements.preferred_start_date IS
  'Employer requested start date; it is a preference, not a placement commitment.';
