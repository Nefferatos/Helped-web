-- Per-contact WhatsApp human handover. While a conversation is in `human`
-- mode, the inbound automation must not generate an AI reply.
ALTER TABLE public.whatsapp_marketing_contacts
  ADD COLUMN IF NOT EXISTS conversation_status TEXT NOT NULL DEFAULT 'active'
  CHECK (conversation_status IN ('active', 'human'));
