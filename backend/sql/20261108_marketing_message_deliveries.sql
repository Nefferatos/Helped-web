-- Per-recipient email delivery idempotency for staff-reviewed AI campaigns.
-- A lease marks an interrupted send as uncertain; uncertain sends are held for
-- staff review instead of being retried automatically.

CREATE TABLE IF NOT EXISTS marketing_message_deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id INTEGER NOT NULL,
  campaign_id UUID NOT NULL,
  contact_id TEXT NOT NULL,
  channel TEXT NOT NULL CHECK (channel = 'email'),
  status TEXT NOT NULL DEFAULT 'SENDING'
    CHECK (status IN ('SENDING', 'SENT', 'FAILED')),
  attempts INTEGER NOT NULL DEFAULT 1 CHECK (attempts > 0),
  lease_expires_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  last_error TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (agency_id, campaign_id, contact_id, channel)
);

CREATE INDEX IF NOT EXISTS idx_marketing_message_deliveries_agency_status
  ON marketing_message_deliveries (agency_id, status, updated_at DESC);
