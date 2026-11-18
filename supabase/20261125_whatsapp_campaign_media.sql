-- Persist public media URLs on campaigns and their recipient rows so Make can
-- retrieve them atomically with the recipient claim.
ALTER TABLE public.whatsapp_marketing_campaigns
  ADD COLUMN IF NOT EXISTS media_type text CHECK (media_type IS NULL OR media_type IN ('image','video')),
  ADD COLUMN IF NOT EXISTS media_url text,
  ADD COLUMN IF NOT EXISTS media_mime_type text,
  ADD COLUMN IF NOT EXISTS media_file_name text;

ALTER TABLE public.whatsapp_marketing_recipients
  ADD COLUMN IF NOT EXISTS media_type text CHECK (media_type IS NULL OR media_type IN ('image','video')),
  ADD COLUMN IF NOT EXISTS media_url text,
  ADD COLUMN IF NOT EXISTS media_mime_type text,
  ADD COLUMN IF NOT EXISTS media_file_name text;
