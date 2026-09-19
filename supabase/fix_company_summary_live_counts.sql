-- Migration: make get_helped_company_summary return LIVE counts from app_data.data
--
-- PROBLEM
--   The previous definition counted maids from public.helped_query_maids, a
--   derived table populated by refresh_helped_query_tables(). That refresh only
--   runs from a trigger on public.app_data or from a manual RPC call, so any
--   write path that reaches app_data without the trigger firing leaves the
--   derived tables stale. A deleted maid kept being counted, which is why
--   dashboard counters went up but never went down.
--
-- FIX
--   Count everything straight out of the JSON blob in public.app_data, which is
--   the exact source every write path mutates. Counters now move both up and
--   down the moment app_data is written.
--
-- NOTE
--   This mirrors GET /api/company/summary in functions/api/[[...path]].ts, which
--   computes the same numbers in code and no longer trusts this function for the
--   mutable counters. Applying this migration is therefore optional, but it keeps
--   the RPC consistent for direct SQL consumers:
--     select public.get_helped_company_summary('default');

CREATE OR REPLACE FUNCTION public.get_helped_company_summary(p_app_id TEXT DEFAULT 'default')
RETURNS JSONB
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH blob AS (
    SELECT COALESCE(data, '{}'::JSONB) AS data
    FROM public.app_data
    WHERE id = p_app_id
  ),
  maids AS (
    SELECT item
    FROM blob, JSONB_ARRAY_ELEMENTS(COALESCE(blob.data->'maids', '[]'::JSONB)) AS item
  )
  SELECT JSONB_BUILD_OBJECT(
    'publicMaids', (
      SELECT COUNT(*) FROM maids
      WHERE COALESCE((item->>'isPublic')::BOOLEAN, FALSE)
    ),
    'hiddenMaids', (
      SELECT COUNT(*) FROM maids
      WHERE NOT COALESCE((item->>'isPublic')::BOOLEAN, FALSE)
    ),
    'totalMaids', (SELECT COUNT(*) FROM maids),
    'maidsWithPhotos', (
      SELECT COUNT(*) FROM maids
      WHERE COALESCE((item->>'hasPhoto')::BOOLEAN, FALSE)
         OR JSONB_ARRAY_LENGTH(COALESCE(item->'photoDataUrls', '[]'::JSONB)) > 0
         OR COALESCE(item->>'photoDataUrl', '') <> ''
    ),
    'enquiries', (
      SELECT COUNT(*)
      FROM blob, JSONB_ARRAY_ELEMENTS(COALESCE(blob.data->'enquiries', '[]'::JSONB)) AS e
      WHERE e->>'viewedAt' IS NULL
    ),
    -- `enquiries` above is the UNREAD count consumed by the notification bell.
    -- `totalEnquiries` is the pipeline size the dashboard tile renders: without
    -- it the tile reads 0 whenever the inbox has been opened, because
    -- POST /api/enquiries/mark-viewed stamps viewedAt on every enquiry shown.
    'unreadEnquiries', (
      SELECT COUNT(*)
      FROM blob, JSONB_ARRAY_ELEMENTS(COALESCE(blob.data->'enquiries', '[]'::JSONB)) AS e
      WHERE e->>'viewedAt' IS NULL
    ),
    'totalEnquiries', (
      SELECT COUNT(*)
      FROM blob, JSONB_ARRAY_ELEMENTS(COALESCE(blob.data->'enquiries', '[]'::JSONB)) AS e
    ),
    'requests', (
      SELECT COUNT(*)
      FROM blob, JSONB_ARRAY_ELEMENTS(COALESCE(blob.data->'directSales', '[]'::JSONB)) AS d
    ),
    'pendingRequests', (
      SELECT COUNT(*)
      FROM blob, JSONB_ARRAY_ELEMENTS(COALESCE(blob.data->'directSales', '[]'::JSONB)) AS d
      WHERE d->>'status' = 'pending'
    ),
    'unreadAgencyChats', (
      SELECT COUNT(*)
      FROM blob, JSONB_ARRAY_ELEMENTS(COALESCE(blob.data->'chatMessages', '[]'::JSONB)) AS m
      WHERE m->>'senderRole' = 'client'
        AND COALESCE((m->>'readByAgency')::BOOLEAN, FALSE) = FALSE
    ),
    'momPersonnel', (
      SELECT JSONB_ARRAY_LENGTH(COALESCE(data->'momPersonnel', '[]'::JSONB)) FROM blob
    ),
    'testimonials', (
      SELECT JSONB_ARRAY_LENGTH(COALESCE(data->'testimonials', '[]'::JSONB)) FROM blob
    ),
    'galleryImages', (
      SELECT JSONB_ARRAY_LENGTH(
        COALESCE(data#>'{companyProfile,gallery_image_data_urls}', '[]'::JSONB)
      )
      FROM blob
    )
  );
$$;

GRANT EXECUTE ON FUNCTION public.get_helped_company_summary(TEXT) TO service_role;