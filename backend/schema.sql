-- Maid Agency Database Schema
-- Run this SQL script to create all required tables

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
