CREATE TABLE IF NOT EXISTS maid_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id INTEGER NOT NULL DEFAULT 1,
  maid_reference_code VARCHAR(100),
  profile_id UUID,
  status VARCHAR(80) NOT NULL DEFAULT 'New Applicant',
  source VARCHAR(40) NOT NULL DEFAULT 'manual',
  applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  parsed_at TIMESTAMPTZ,
  approved_at TIMESTAMPTZ,
  placed_at TIMESTAMPTZ,
  rejected_at TIMESTAMPTZ,
  ai_parse_summary TEXT NOT NULL DEFAULT '',
  ai_parse_review_required BOOLEAN NOT NULL DEFAULT FALSE,
  auto_rejected_reason TEXT,
  notification_log_ids JSONB NOT NULL DEFAULT '[]'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_maid_applications_agency_status
  ON maid_applications(agency_id, status, updated_at DESC);

CREATE TABLE IF NOT EXISTS maid_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID NOT NULL REFERENCES maid_applications(id) ON DELETE CASCADE,
  maid_reference_code VARCHAR(100),
  full_name VARCHAR(255) NOT NULL,
  nationality VARCHAR(100) NOT NULL DEFAULT '',
  date_of_birth DATE,
  age INTEGER,
  gender VARCHAR(30) NOT NULL DEFAULT '',
  marital_status VARCHAR(50) NOT NULL DEFAULT '',
  contact_number VARCHAR(50) NOT NULL DEFAULT '',
  address TEXT NOT NULL DEFAULT '',
  years_of_experience NUMERIC(6,2) NOT NULL DEFAULT 0,
  previous_countries_worked_in JSONB NOT NULL DEFAULT '[]'::jsonb,
  childcare_experience NUMERIC(6,2) NOT NULL DEFAULT 0,
  newborn_care_experience NUMERIC(6,2) NOT NULL DEFAULT 0,
  elderly_care_experience NUMERIC(6,2) NOT NULL DEFAULT 0,
  disabled_care_experience NUMERIC(6,2) NOT NULL DEFAULT 0,
  housekeeping_experience NUMERIC(6,2) NOT NULL DEFAULT 0,
  cooking_skills JSONB NOT NULL DEFAULT '[]'::jsonb,
  pet_care_experience NUMERIC(6,2) NOT NULL DEFAULT 0,
  language_skills JSONB NOT NULL DEFAULT '[]'::jsonb,
  certifications JSONB NOT NULL DEFAULT '[]'::jsonb,
  training_records JSONB NOT NULL DEFAULT '[]'::jsonb,
  available_date DATE,
  expected_salary NUMERIC(10,2),
  employment_preference VARCHAR(100) NOT NULL DEFAULT '',
  medical_status VARCHAR(20) NOT NULL DEFAULT 'pending',
  passport_status VARCHAR(20) NOT NULL DEFAULT 'missing',
  certification_status VARCHAR(20) NOT NULL DEFAULT 'missing',
  introduction_video_url TEXT,
  work_history JSONB NOT NULL DEFAULT '[]'::jsonb,
  strengths_tags JSONB NOT NULL DEFAULT '[]'::jsonb,
  weaknesses_tags JSONB NOT NULL DEFAULT '[]'::jsonb,
  client_match_score NUMERIC(6,2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_maid_profiles_name_nationality
  ON maid_profiles(full_name, nationality);

CREATE TABLE IF NOT EXISTS maid_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID NOT NULL REFERENCES maid_applications(id) ON DELETE CASCADE,
  type VARCHAR(40) NOT NULL,
  name VARCHAR(255) NOT NULL,
  url TEXT NOT NULL DEFAULT '',
  required BOOLEAN NOT NULL DEFAULT TRUE,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status VARCHAR(20) NOT NULL DEFAULT 'missing'
);

CREATE TABLE IF NOT EXISTS maid_skills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID NOT NULL REFERENCES maid_applications(id) ON DELETE CASCADE,
  skill VARCHAR(100) NOT NULL,
  experience_years NUMERIC(6,2) NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS maid_certifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID NOT NULL REFERENCES maid_applications(id) ON DELETE CASCADE,
  certification VARCHAR(255) NOT NULL,
  issuer VARCHAR(255) NOT NULL DEFAULT '',
  issued_at DATE
);

CREATE TABLE IF NOT EXISTS maid_languages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID NOT NULL REFERENCES maid_applications(id) ON DELETE CASCADE,
  language VARCHAR(100) NOT NULL,
  proficiency VARCHAR(50) NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS maid_references (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID NOT NULL REFERENCES maid_applications(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  relationship VARCHAR(120) NOT NULL DEFAULT '',
  contact VARCHAR(255) NOT NULL DEFAULT '',
  rating NUMERIC(4,2) NOT NULL DEFAULT 0,
  verified BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS maid_interviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID NOT NULL REFERENCES maid_applications(id) ON DELETE CASCADE,
  interview_date TIMESTAMPTZ NOT NULL,
  interviewer VARCHAR(255) NOT NULL,
  questions JSONB NOT NULL DEFAULT '[]'::jsonb,
  notes TEXT NOT NULL DEFAULT '',
  ratings JSONB NOT NULL DEFAULT '{}'::jsonb,
  recording_url TEXT,
  interview_result VARCHAR(40) NOT NULL DEFAULT 'Pending',
  score NUMERIC(6,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS maid_background_checks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID NOT NULL REFERENCES maid_applications(id) ON DELETE CASCADE,
  passport_verified BOOLEAN NOT NULL DEFAULT FALSE,
  identity_verified BOOLEAN NOT NULL DEFAULT FALSE,
  employment_history_verified BOOLEAN NOT NULL DEFAULT FALSE,
  reference_verified BOOLEAN NOT NULL DEFAULT FALSE,
  medical_clearance_verified BOOLEAN NOT NULL DEFAULT FALSE,
  completion_percentage NUMERIC(6,2) NOT NULL DEFAULT 0,
  result VARCHAR(20) NOT NULL DEFAULT 'Pending',
  notes TEXT NOT NULL DEFAULT '',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS maid_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID NOT NULL REFERENCES maid_applications(id) ON DELETE CASCADE,
  score NUMERIC(6,2) NOT NULL DEFAULT 0,
  category VARCHAR(40) NOT NULL DEFAULT 'Needs Review',
  explanation TEXT NOT NULL DEFAULT '',
  strengths JSONB NOT NULL DEFAULT '[]'::jsonb,
  weaknesses JSONB NOT NULL DEFAULT '[]'::jsonb,
  factors JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS maid_matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID NOT NULL REFERENCES maid_applications(id) ON DELETE CASCADE,
  request_id UUID,
  inquiry_id INTEGER,
  compatibility_score NUMERIC(6,2) NOT NULL DEFAULT 0,
  skills_matched JSONB NOT NULL DEFAULT '[]'::jsonb,
  missing_requirements JSONB NOT NULL DEFAULT '[]'::jsonb,
  recommendation TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS maid_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID NOT NULL REFERENCES maid_applications(id) ON DELETE CASCADE,
  from_stage VARCHAR(80),
  to_stage VARCHAR(80) NOT NULL,
  actor VARCHAR(255) NOT NULL DEFAULT 'system',
  reason TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_maid_status_history_application_created
  ON maid_status_history(application_id, created_at DESC);

CREATE TABLE IF NOT EXISTS maid_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID NOT NULL REFERENCES maid_applications(id) ON DELETE CASCADE,
  event VARCHAR(80) NOT NULL,
  channel VARCHAR(20) NOT NULL,
  recipient VARCHAR(255) NOT NULL,
  template_key VARCHAR(120) NOT NULL DEFAULT '',
  message TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
