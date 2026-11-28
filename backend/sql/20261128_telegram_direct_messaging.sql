-- MTProto direct messaging from an authenticated agency Telegram user account.
-- Session payloads and temporary login state are AES-256-GCM encrypted in the app.
CREATE TABLE IF NOT EXISTS telegram_direct_accounts (
  agency_id INTEGER PRIMARY KEY,
  encrypted_session TEXT,
  pending_auth TEXT,
  account_phone TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS telegram_direct_broadcasts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id INTEGER NOT NULL,
  idempotency_key TEXT NOT NULL,
  message TEXT NOT NULL,
  total_recipients INTEGER NOT NULL DEFAULT 0,
  consent_acknowledged BOOLEAN NOT NULL DEFAULT FALSE,
  matched_count INTEGER NOT NULL DEFAULT 0,
  successful_count INTEGER NOT NULL DEFAULT 0,
  failed_count INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL CHECK (status IN ('sending','completed','partial','failed','uncertain')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  UNIQUE (agency_id, idempotency_key)
);
