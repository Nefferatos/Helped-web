CREATE TABLE IF NOT EXISTS whatsapp_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id INTEGER NOT NULL DEFAULT 1,
  candidate_reference_code VARCHAR(100) NOT NULL,
  candidate_id INTEGER,
  candidate_name VARCHAR(255) NOT NULL,
  phone_number VARCHAR(50) NOT NULL DEFAULT '',
  current_stage VARCHAR(100) NOT NULL DEFAULT 'Application Received',
  next_step TEXT NOT NULL DEFAULT '',
  tags JSONB NOT NULL DEFAULT '[]'::jsonb,
  unread_recruiter_count INTEGER NOT NULL DEFAULT 0,
  unread_applicant_count INTEGER NOT NULL DEFAULT 0,
  last_message_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_message_preview TEXT NOT NULL DEFAULT '',
  status VARCHAR(30) NOT NULL DEFAULT 'active',
  ai_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  assigned_recruiter VARCHAR(255),
  interview_schedule JSONB NOT NULL DEFAULT '{}'::jsonb,
  document_checklist JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT whatsapp_conversations_candidate_key UNIQUE (agency_id, candidate_reference_code)
);

CREATE INDEX IF NOT EXISTS idx_whatsapp_conversations_stage
  ON whatsapp_conversations(agency_id, current_stage, updated_at DESC);

CREATE TABLE IF NOT EXISTS whatsapp_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id INTEGER NOT NULL DEFAULT 1,
  conversation_id UUID NOT NULL REFERENCES whatsapp_conversations(id) ON DELETE CASCADE,
  candidate_reference_code VARCHAR(100) NOT NULL,
  candidate_name VARCHAR(255) NOT NULL,
  direction VARCHAR(20) NOT NULL CHECK (direction IN ('incoming', 'outgoing')),
  status VARCHAR(20) NOT NULL CHECK (status IN ('queued', 'sent', 'delivered', 'read', 'failed')),
  type VARCHAR(20) NOT NULL,
  sender_name VARCHAR(255) NOT NULL,
  sender_role VARCHAR(20) NOT NULL CHECK (sender_role IN ('recruiter', 'applicant', 'ai', 'system')),
  text TEXT NOT NULL DEFAULT '',
  template_key VARCHAR(100),
  attachment_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
  automated BOOLEAN NOT NULL DEFAULT FALSE,
  read_at TIMESTAMPTZ,
  failed_reason TEXT,
  external_message_id VARCHAR(255),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_conversation_created
  ON whatsapp_messages(conversation_id, created_at ASC);

CREATE TABLE IF NOT EXISTS whatsapp_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id INTEGER NOT NULL DEFAULT 1,
  key VARCHAR(100) NOT NULL,
  name VARCHAR(255) NOT NULL,
  category VARCHAR(50) NOT NULL,
  language VARCHAR(20) NOT NULL DEFAULT 'en',
  body TEXT NOT NULL,
  variables JSONB NOT NULL DEFAULT '[]'::jsonb,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT whatsapp_templates_key_unique UNIQUE (agency_id, key)
);

CREATE TABLE IF NOT EXISTS whatsapp_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id INTEGER NOT NULL DEFAULT 1,
  conversation_id UUID NOT NULL REFERENCES whatsapp_conversations(id) ON DELETE CASCADE,
  message_id UUID NOT NULL REFERENCES whatsapp_messages(id) ON DELETE CASCADE,
  candidate_reference_code VARCHAR(100) NOT NULL,
  file_name VARCHAR(255) NOT NULL,
  mime_type VARCHAR(120) NOT NULL,
  size INTEGER NOT NULL DEFAULT 0,
  kind VARCHAR(20) NOT NULL,
  storage_path TEXT NOT NULL,
  public_url TEXT NOT NULL,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS whatsapp_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id INTEGER NOT NULL DEFAULT 1,
  conversation_id UUID NOT NULL REFERENCES whatsapp_conversations(id) ON DELETE CASCADE,
  message_id UUID REFERENCES whatsapp_messages(id) ON DELETE SET NULL,
  candidate_reference_code VARCHAR(100) NOT NULL,
  type VARCHAR(50) NOT NULL,
  detail TEXT NOT NULL DEFAULT '',
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS whatsapp_broadcasts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id INTEGER NOT NULL DEFAULT 1,
  name VARCHAR(255) NOT NULL,
  filter_summary TEXT NOT NULL DEFAULT '',
  recipient_count INTEGER NOT NULL DEFAULT 0,
  message_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_by VARCHAR(255) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS whatsapp_message_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id INTEGER NOT NULL DEFAULT 1,
  conversation_id UUID NOT NULL REFERENCES whatsapp_conversations(id) ON DELETE CASCADE,
  message_id UUID NOT NULL REFERENCES whatsapp_messages(id) ON DELETE CASCADE,
  provider VARCHAR(30) NOT NULL,
  request_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  response_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  status VARCHAR(20) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
