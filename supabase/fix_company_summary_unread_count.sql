-- Migration: Fix get_helped_company_summary to return unread enquiry count
-- instead of total enquiry count.
--
-- PROBLEM: The original function used jsonb_array_length() which counts ALL
-- enquiries in the JSON blob, regardless of viewedAt status. This caused the
-- notification bell to show the total enquiry count (e.g., 91) instead of the
-- actual unread count.
--
-- FIX: Filter by viewedAt IS NULL to count only genuinely unread enquiries.
--
-- Run this against the production Supabase database to apply the fix.

CREATE OR REPLACE FUNCTION public.get_helped_company_summary(p_app_id TEXT DEFAULT 'default')
RETURNS JSONB
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT JSONB_BUILD_OBJECT(
    'publicMaids', (SELECT COUNT(*) FROM public.helped_query_maids m WHERE m.app_id = p_app_id AND m.is_public),
    'hiddenMaids', (SELECT COUNT(*) FROM public.helped_query_maids m WHERE m.app_id = p_app_id AND NOT m.is_public),
    'totalMaids', (SELECT COUNT(*) FROM public.helped_query_maids m WHERE m.app_id = p_app_id),
    'maidsWithPhotos', (SELECT COUNT(*) FROM public.helped_query_maids m WHERE m.app_id = p_app_id AND m.has_photo),
    'enquiries', (
      SELECT COUNT(*)
      FROM JSONB_ARRAY_ELEMENTS(COALESCE(ad.data->'enquiries', '[]'::JSONB)) AS e
      WHERE e->>'viewedAt' IS NULL
    ),
    'requests', JSONB_ARRAY_LENGTH(COALESCE(ad.data->'directSales', '[]'::JSONB)),
    'pendingRequests', (
      SELECT COUNT(*)
      FROM public.helped_query_direct_sales ds
      WHERE ds.app_id = p_app_id
        AND ds.status = 'pending'
    ),
    'unreadAgencyChats', (
      SELECT COUNT(*)
      FROM public.helped_query_chat_messages cm
      WHERE cm.app_id = p_app_id
        AND cm.sender_role = 'client'
        AND COALESCE((cm.payload->>'readByAgency')::BOOLEAN, FALSE) = FALSE
    ),
    'momPersonnel', JSONB_ARRAY_LENGTH(COALESCE(ad.data->'momPersonnel', '[]'::JSONB)),
    'testimonials', JSONB_ARRAY_LENGTH(COALESCE(ad.data->'testimonials', '[]'::JSONB)),
    'galleryImages', JSONB_ARRAY_LENGTH(COALESCE(ad.data#>'{companyProfile,gallery_image_data_urls}', '[]'::JSONB))
  )
  FROM public.app_data ad
  WHERE ad.id = p_app_id;
$$;

GRANT EXECUTE ON FUNCTION public.get_helped_company_summary(TEXT) TO service_role;