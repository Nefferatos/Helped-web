-- Store referral marketing leads as agency-scoped database records instead of
-- one whole-list KV value. Existing KV rows are migrated lazily by the Worker.

CREATE TABLE IF NOT EXISTS public.ats_referral_leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id INTEGER NOT NULL,
  name TEXT NOT NULL CHECK (length(btrim(name)) BETWEEN 1 AND 160),
  phone TEXT NOT NULL DEFAULT '',
  normalized_phone TEXT NOT NULL DEFAULT '',
  country TEXT NOT NULL DEFAULT '',
  source TEXT NOT NULL DEFAULT '',
  preferred_language TEXT NOT NULL DEFAULT '',
  campaign_id TEXT NOT NULL DEFAULT '',
  whatsapp_consent_at TIMESTAMPTZ,
  whatsapp_consent_withdrawn_at TIMESTAMPTZ,
  whatsapp_consent_source TEXT NOT NULL DEFAULT '',
  share_contact_consent_at TIMESTAMPTZ,
  possible_duplicate_of UUID,
  referrer_name TEXT NOT NULL DEFAULT '',
  referrer_phone TEXT NOT NULL DEFAULT '',
  notes TEXT NOT NULL DEFAULT '',
  interest_status TEXT NOT NULL DEFAULT 'new'
    CHECK (interest_status IN ('new', 'interested', 'not_interested', 'replied')),
  lead_classification TEXT NOT NULL DEFAULT 'unknown'
    CHECK (lead_classification IN ('new_applicant', 'existing_applicant', 'referral', 'general_enquiry', 'unknown')),
  lead_hunter_status TEXT NOT NULL DEFAULT 'not_configured'
    CHECK (lead_hunter_status IN ('classified', 'not_configured', 'failed')),
  eligible_for_next_step BOOLEAN NOT NULL DEFAULT FALSE,
  staff_review_required BOOLEAN NOT NULL DEFAULT TRUE,
  last_delivery_status TEXT NOT NULL DEFAULT 'not_sent'
    CHECK (last_delivery_status IN ('not_sent', 'accepted', 'delivered', 'failed')),
  last_message_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (agency_id, id)
);

CREATE INDEX IF NOT EXISTS ats_referral_leads_agency_created_idx
  ON public.ats_referral_leads (agency_id, created_at DESC);
CREATE INDEX IF NOT EXISTS ats_referral_leads_agency_country_idx
  ON public.ats_referral_leads (agency_id, country);
CREATE INDEX IF NOT EXISTS ats_referral_leads_agency_phone_idx
  ON public.ats_referral_leads (agency_id, normalized_phone)
  WHERE normalized_phone <> '';

ALTER TABLE public.ats_referral_leads ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.ats_referral_leads FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.ats_referral_leads TO service_role;
