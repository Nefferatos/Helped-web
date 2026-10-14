import { afterEach, describe, expect, it, vi } from "vitest";
import {
  buildGoogleDirectionsUrl,
  buildGoogleMapsEmbedUrl,
  buildGoogleMapsSearchUrl,
  buildGoogleRateUrl,
  buildGoogleReviewUrl,
  getGooglePlaceId,
  getGoogleReviewUrl,
} from "@/lib/googleMaps";

// A real-shaped Place ID (Sydney Opera House) from Google's own docs.
const PLACE_ID = "ChIJ3S-JXmauEmsRUcIaWtf4MzE";

describe("Google Maps link builders", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("reads the public Place ID from VITE_GOOGLE_PLACE_ID", () => {
    vi.stubEnv("VITE_GOOGLE_PLACE_ID", PLACE_ID);
    expect(getGooglePlaceId()).toBe(PLACE_ID);
  });

  it("falls back to an empty string when no Place ID is configured", () => {
    vi.stubEnv("VITE_GOOGLE_PLACE_ID", "");
    expect(getGooglePlaceId()).toBe("");
  });

  it("builds Google's review-composer deep link", () => {
    expect(buildGoogleReviewUrl(PLACE_ID)).toBe(
      `https://search.google.com/local/writereview?placeid=${PLACE_ID}`,
    );
  });

  it("builds a keyless Maps search URL, adding query_place_id only when known", () => {
    const withPlace = buildGoogleMapsSearchUrl("Sydney Opera House", PLACE_ID);
    expect(withPlace.startsWith("https://www.google.com/maps/search/?")).toBe(true);
    expect(withPlace).toContain("api=1");
    expect(withPlace).toContain(`query_place_id=${PLACE_ID}`);

    const withoutPlace = buildGoogleMapsSearchUrl("Sydney Opera House");
    expect(withoutPlace).toContain("api=1");
    expect(withoutPlace).not.toContain("query_place_id");
  });

  it("builds a keyless embed iframe src with no API key in the page", () => {
    const url = buildGoogleMapsEmbedUrl("12 Marina Blvd, Singapore 018982");

    expect(url.startsWith("https://www.google.com/maps?")).toBe(true);
    expect(url).toContain("output=embed");
    expect(url).toContain("q=12+Marina+Blvd%2C+Singapore+018982");
    // This repo forbids API keys in the browser bundle.
    expect(url).not.toContain("key=");
  });

  it("builds directions, adding destination_place_id when known", () => {
    const url = buildGoogleDirectionsUrl("12 Marina Blvd", PLACE_ID);
    expect(url.startsWith("https://www.google.com/maps/dir/?")).toBe(true);
    expect(url).toContain("api=1");
    expect(url).toContain(`destination_place_id=${PLACE_ID}`);
  });

  it("prefers the review composer and falls back to the Maps listing", () => {
    expect(buildGoogleRateUrl({ query: "At The Agency", placeId: PLACE_ID })).toContain(
      "writereview",
    );
    expect(buildGoogleRateUrl({ query: "At The Agency" })).toContain("/maps/search/");
  });

  // ── Business Profile review short link (what the agency owner supplied) ──

  const SHORT_LINK = "https://g.page/r/CfD9XpTa2bDcEAE/review";

  it("reads the review short link from VITE_GOOGLE_REVIEW_URL", () => {
    vi.stubEnv("VITE_GOOGLE_REVIEW_URL", SHORT_LINK);
    expect(getGoogleReviewUrl()).toBe(SHORT_LINK);
  });

  it("uses the short link verbatim, then the Place ID, then a Maps search", () => {
    expect(
      buildGoogleRateUrl({ query: "At The Agency", placeId: PLACE_ID, reviewUrl: SHORT_LINK }),
    ).toBe(SHORT_LINK);

    // Whitespace-only config must not shadow the Place ID fallback.
    expect(
      buildGoogleRateUrl({ query: "At The Agency", placeId: PLACE_ID, reviewUrl: "   " }),
    ).toContain("writereview");

    expect(buildGoogleRateUrl({ query: "At The Agency" })).toContain("/maps/search/");
  });
});
