-- Keep the legacy Express database schema aligned with the Worker migration.
ALTER TABLE employer_requirements
  ADD COLUMN IF NOT EXISTS household_size INTEGER CHECK (household_size IS NULL OR household_size > 0),
  ADD COLUMN IF NOT EXISTS children_count INTEGER CHECK (children_count IS NULL OR children_count >= 0),
  ADD COLUMN IF NOT EXISTS elderly_count INTEGER CHECK (elderly_count IS NULL OR elderly_count >= 0),
  ADD COLUMN IF NOT EXISTS cooking_requirements TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS preferred_start_date DATE;
