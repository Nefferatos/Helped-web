-- Maid Agency Database Schema
-- Run this SQL script to create all required tables

CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Create company_profile table
CREATE TABLE IF NOT EXISTS company_profile (
  id SERIAL PRIMARY KEY,
  company_name VARCHAR(255) NOT NULL,
  short_name VARCHAR(100) NOT NULL,
  license_no VARCHAR(50) NOT NULL UNIQUE,
  address_line1 VARCHAR(255) NOT NULL,
  address_line2 VARCHAR(255),
  postal_code VARCHAR(20) NOT NULL,
  country VARCHAR(100) NOT NULL DEFAULT 'Singapore',
  contact_person VARCHAR(255),
  contact_phone VARCHAR(20),
  contact_email VARCHAR(255),
  contact_fax VARCHAR(20),
  contact_website VARCHAR(255),
  office_hours_regular VARCHAR(255),
  office_hours_other VARCHAR(255),
  social_facebook VARCHAR(255),
  social_whatsapp_number VARCHAR(20),
  social_whatsapp_message TEXT,
  branding_theme_color VARCHAR(50),
  branding_button_color VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index for license_no for faster lookups
CREATE INDEX IF NOT EXISTS idx_company_license ON company_profile(license_no);

-- Create mom_personnel table (one-to-many with company_profile)
CREATE TABLE IF NOT EXISTS mom_personnel (
  id SERIAL PRIMARY KEY,
  company_id INTEGER NOT NULL REFERENCES company_profile(id) ON DELETE CASCADE,
  name VARCHAR(255),
  registration_number VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index for company_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_mom_personnel_company ON mom_personnel(company_id);

-- Create testimonials table (one-to-many with company_profile)
CREATE TABLE IF NOT EXISTS testimonials (
  id SERIAL PRIMARY KEY,
  company_id INTEGER NOT NULL REFERENCES company_profile(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  author VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index for company_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_testimonials_company ON testimonials(company_id);

-- Create maids table
CREATE TABLE IF NOT EXISTS maids (
  id SERIAL PRIMARY KEY,
  full_name VARCHAR(255) NOT NULL,
  reference_code VARCHAR(100) NOT NULL UNIQUE,
  type VARCHAR(100) NOT NULL,
  nationality VARCHAR(100) NOT NULL,
  date_of_birth DATE NOT NULL,
  place_of_birth VARCHAR(255) NOT NULL,
  height INTEGER NOT NULL,
  weight INTEGER NOT NULL,
  religion VARCHAR(100) NOT NULL,
  marital_status VARCHAR(100) NOT NULL,
  number_of_children INTEGER NOT NULL DEFAULT 0,
  number_of_siblings INTEGER NOT NULL DEFAULT 0,
  home_address TEXT NOT NULL,
  airport_repatriation VARCHAR(255) NOT NULL,
  education_level VARCHAR(255) NOT NULL,
  language_skills JSONB NOT NULL DEFAULT '{}'::jsonb,
  skills_preferences JSONB NOT NULL DEFAULT '{}'::jsonb,
  work_areas JSONB NOT NULL DEFAULT '{}'::jsonb,
  employment_history JSONB NOT NULL DEFAULT '[]'::jsonb,
  introduction JSONB NOT NULL DEFAULT '{}'::jsonb,
  agency_contact JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_public BOOLEAN NOT NULL DEFAULT FALSE,
  has_photo BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_maids_reference_code ON maids(reference_code);
CREATE INDEX IF NOT EXISTS idx_maids_is_public ON maids(is_public);

-- Multi-admin / multi-agency support
CREATE TABLE IF NOT EXISTS agency_admins (
  id SERIAL PRIMARY KEY,
  agency_id INTEGER NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role VARCHAR(20) NOT NULL DEFAULT 'admin',
  username VARCHAR(255),
  agency_name VARCHAR(255),
  profile_image_url TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_agency_admins_agency_id ON agency_admins(agency_id);

CREATE TABLE IF NOT EXISTS agency_admin_sessions (
  token VARCHAR(255) PRIMARY KEY,
  admin_id INTEGER NOT NULL REFERENCES agency_admins(id) ON DELETE CASCADE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_agency_admin_sessions_admin_id ON agency_admin_sessions(admin_id);

ALTER TABLE maids
  ADD COLUMN IF NOT EXISTS agency_id INTEGER NOT NULL DEFAULT 1;

ALTER TABLE maids
  ADD COLUMN IF NOT EXISTS status VARCHAR(50) NOT NULL DEFAULT 'available';

ALTER TABLE maids
  ADD COLUMN IF NOT EXISTS photo_data_url TEXT NOT NULL DEFAULT '';

ALTER TABLE maids
  ADD COLUMN IF NOT EXISTS photo_data_urls JSONB NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE maids
  ADD COLUMN IF NOT EXISTS video_data_url TEXT NOT NULL DEFAULT '';

ALTER TABLE agency_admins
  ADD COLUMN IF NOT EXISTS username VARCHAR(255);

ALTER TABLE agency_admins
  ADD COLUMN IF NOT EXISTS agency_name VARCHAR(255);

ALTER TABLE agency_admins
  ADD COLUMN IF NOT EXISTS profile_image_url TEXT;

CREATE INDEX IF NOT EXISTS idx_maids_agency_id ON maids(agency_id);
CREATE INDEX IF NOT EXISTS idx_maids_agency_updated_at ON maids(agency_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_maids_public_updated_at ON maids(is_public, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_maids_agency_public_updated_at ON maids(agency_id, is_public, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_maids_full_name_trgm ON maids USING gin (full_name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_maids_reference_code_trgm ON maids USING gin (reference_code gin_trgm_ops);

-- Production-ready support inbox tables
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'support_conversation_status') THEN
    CREATE TYPE support_conversation_status AS ENUM (
      'OPEN',
      'WAITING_CLIENT',
      'WAITING_SUPPORT',
      'RESOLVED',
      'CLOSED'
    );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'support_inquiry_category') THEN
    CREATE TYPE support_inquiry_category AS ENUM (
      'Booking Concern',
      'Payment Concern',
      'Contract Concern',
      'Maid Replacement',
      'Technical Support',
      'General Inquiry'
    );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'support_priority_level') THEN
    CREATE TYPE support_priority_level AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS support_conversations (
  id BIGSERIAL PRIMARY KEY,
  client_id INTEGER NOT NULL,
  agency_id INTEGER NOT NULL DEFAULT 1,
  conversation_type VARCHAR(20) NOT NULL DEFAULT 'support' CHECK (conversation_type IN ('support', 'agency')),
  agency_name VARCHAR(255),
  subject VARCHAR(255) NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  status support_conversation_status NOT NULL DEFAULT 'OPEN',
  category support_inquiry_category NOT NULL DEFAULT 'General Inquiry',
  priority support_priority_level NOT NULL DEFAULT 'MEDIUM',
  assigned_admin_id INTEGER REFERENCES agency_admins(id) ON DELETE SET NULL,
  unread_client INTEGER NOT NULL DEFAULT 0,
  unread_admin INTEGER NOT NULL DEFAULT 0,
  last_message_preview TEXT NOT NULL DEFAULT '',
  last_message_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  client_last_read_at TIMESTAMPTZ,
  admin_last_read_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  closed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT support_conversations_scope_key UNIQUE (client_id, agency_id, conversation_type)
);

CREATE INDEX IF NOT EXISTS idx_support_conversations_agency_status_updated
  ON support_conversations(agency_id, status, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_support_conversations_client_updated
  ON support_conversations(client_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_support_conversations_priority
  ON support_conversations(priority, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_support_conversations_assignment
  ON support_conversations(assigned_admin_id, updated_at DESC);

CREATE TABLE IF NOT EXISTS support_messages (
  id BIGSERIAL PRIMARY KEY,
  conversation_id BIGINT NOT NULL REFERENCES support_conversations(id) ON DELETE CASCADE,
  client_id INTEGER NOT NULL,
  agency_id INTEGER NOT NULL DEFAULT 1,
  conversation_type VARCHAR(20) NOT NULL DEFAULT 'support' CHECK (conversation_type IN ('support', 'agency')),
  sender_role VARCHAR(20) NOT NULL CHECK (sender_role IN ('client', 'agency')),
  sender_name VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  attachments JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_support_messages_conversation_created
  ON support_messages(conversation_id, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_support_messages_agency_created
  ON support_messages(agency_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_support_messages_client_created
  ON support_messages(client_id, created_at DESC);

CREATE TABLE IF NOT EXISTS support_notifications (
  id BIGSERIAL PRIMARY KEY,
  conversation_id BIGINT NOT NULL REFERENCES support_conversations(id) ON DELETE CASCADE,
  message_id BIGINT REFERENCES support_messages(id) ON DELETE CASCADE,
  client_id INTEGER NOT NULL,
  agency_id INTEGER NOT NULL DEFAULT 1,
  recipient_type VARCHAR(20) NOT NULL CHECK (recipient_type IN ('client', 'admin')),
  recipient_admin_id INTEGER REFERENCES agency_admins(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  body TEXT NOT NULL DEFAULT '',
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_support_notifications_recipient
  ON support_notifications(recipient_type, agency_id, client_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_support_notifications_unread
  ON support_notifications(recipient_type, read_at, created_at DESC);

-- Normalized request messaging support
CREATE TABLE IF NOT EXISTS requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id INTEGER NOT NULL,
  agency_id INTEGER NOT NULL,
  type VARCHAR(20) NOT NULL DEFAULT 'general',
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  maid_references TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  updated_by VARCHAR(100) NOT NULL DEFAULT 'system',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE requests
  ALTER COLUMN agency_id SET DEFAULT 1;

UPDATE requests
SET agency_id = 1
WHERE agency_id IS NULL OR agency_id <= 0;

CREATE INDEX IF NOT EXISTS idx_requests_agency_id ON requests(agency_id);
CREATE INDEX IF NOT EXISTS idx_requests_client_id ON requests(client_id);
CREATE INDEX IF NOT EXISTS idx_requests_agency_updated_at ON requests(agency_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_requests_client_updated_at ON requests(client_id, updated_at DESC);

CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL UNIQUE REFERENCES requests(id) ON DELETE CASCADE,
  agency_id INTEGER NOT NULL,
  client_id INTEGER NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_type TEXT NOT NULL CHECK (sender_type IN ('client', 'admin', 'staff', 'system')),
  sender_id INTEGER NOT NULL,
  message TEXT NOT NULL,
  attachments JSONB,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_messages_conversation_created_at
  ON messages(conversation_id, created_at);

CREATE INDEX IF NOT EXISTS idx_conversations_request ON conversations(request_id);
CREATE INDEX IF NOT EXISTS idx_conversations_client ON conversations(client_id);

CREATE TABLE IF NOT EXISTS workflow_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id TEXT NOT NULL,
  workflow TEXT NOT NULL,
  classifier_output JSONB,
  endpoint_called TEXT NOT NULL,
  status TEXT NOT NULL,
  latency INTEGER NOT NULL DEFAULT 0,
  fallback_used BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_workflow_logs_request_id ON workflow_logs(request_id);
CREATE INDEX IF NOT EXISTS idx_workflow_logs_workflow_created_at
  ON workflow_logs(workflow, created_at DESC);

-- Apply the same ownership pattern to other agency-owned tables in production:
-- enquiries.agency_id
-- direct_sales.agency_id
-- employer_contracts.agency_id
-- employer_contract_files.agency_id
