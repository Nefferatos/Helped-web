/**
 * Google Maps / Google Business Profile link builders for the agency rating UI.
 *
 * Google has NO API that submits a star rating or a review — a review can only be
 * written by a signed-in Google user inside Google's own UI. So this module only
 * builds (a) a keyless map embed and (b) deep links into Google's review composer
 * and Maps listing.
 *
 * No API key is used anywhere here on purpose: per this repo's policy (see
 * src/vite-env.d.ts) API keys must never be inlined into the browser bundle.
 */

const trimmed = (value: string | undefined | null) => (value ?? "").trim();

/**
 * The agency's Google Business Profile Place ID (`ChIJ...`).
 *
 * A Place ID is a PUBLIC identifier that already appears in every Google Maps
 * URL — it is not a secret — so it is safe as a VITE_ variable. Leave it blank
 * and the UI falls back to a plain Google Maps search.
 */
export const getGooglePlaceId = () => trimmed(import.meta.env.VITE_GOOGLE_PLACE_ID);

/**
 * Google's own "review short link" for the agency's Business Profile, e.g.
 * https://g.page/r/CfD9XpTa2bDcEAE/review
 *
 * Google generates these from the Business Profile dashboard ("Ask for
 * reviews"). It is the most reliable way to open the star picker — no Place ID
 * lookup and no API key — so it takes priority over the Place ID when both are
 * configured. Still only a link: the visitor writes the review on Google.
 */
export const getGoogleReviewUrl = () => trimmed(import.meta.env.VITE_GOOGLE_REVIEW_URL);

/**
 * Opens Google's "write a review" composer for a place.
 *
 * Undocumented by Google but stable, and the endpoint behind every "get more
 * reviews" tool. The visitor still signs in to Google and chooses the stars
 * themselves — nothing is ever submitted on their behalf.
 */
export const buildGoogleReviewUrl = (placeId: string) =>
  `https://search.google.com/local/writereview?placeid=${encodeURIComponent(trimmed(placeId))}`;

/** Official Maps URLs API (keyless): opens the listing in Maps / the Maps app. */
export const buildGoogleMapsSearchUrl = (query: string, placeId?: string) => {
  const params = new URLSearchParams({ api: "1", query: trimmed(query) });
  if (trimmed(placeId)) params.set("query_place_id", trimmed(placeId));
  return `https://www.google.com/maps/search/?${params.toString()}`;
};

/** Official Maps URLs API (keyless): turn-by-turn directions to the agency. */
export const buildGoogleDirectionsUrl = (destination: string, placeId?: string) => {
  const params = new URLSearchParams({ api: "1", destination: trimmed(destination) });
  if (trimmed(placeId)) params.set("destination_place_id", trimmed(placeId));
  return `https://www.google.com/maps/dir/?${params.toString()}`;
};

/**
 * Keyless Maps iframe src (`output=embed`).
 *
 * Google's official Maps Embed API would require an API key inside the page,
 * which this repo forbids, so the public iframe is used instead. The
 * human-readable `query` is preferred over a `place_id:` token here because it
 * always resolves without a key.
 */
export const buildGoogleMapsEmbedUrl = (query: string) => {
  const params = new URLSearchParams({ q: trimmed(query), output: "embed" });
  return `https://www.google.com/maps?${params.toString()}`;
};

/**
 * Where the "Rate us on Google" CTA points, in priority order:
 *   1. a Business Profile review short link (VITE_GOOGLE_REVIEW_URL)
 *   2. Google's review composer built from a Place ID
 *   3. the Maps listing (which offers "Write a review" once signed in)
 */
export const buildGoogleRateUrl = (options: {
  query: string;
  placeId?: string;
  reviewUrl?: string;
}) => {
  const direct = trimmed(options.reviewUrl);
  if (direct) return direct;
  const placeId = trimmed(options.placeId);
  return placeId ? buildGoogleReviewUrl(placeId) : buildGoogleMapsSearchUrl(options.query);
};
