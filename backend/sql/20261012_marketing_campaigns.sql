CREATE TABLE IF NOT EXISTS marketing_campaigns (
  id UUID PRIMARY KEY,
  agency_id INTEGER NOT NULL,
  campaign JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_marketing_campaigns_agency_created
  ON marketing_campaigns (agency_id, created_at DESC);
