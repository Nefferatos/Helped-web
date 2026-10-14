import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import AgencyReviews from "@/components/AgencyReviews";
import { clearClientAuth, saveClientAuth, type ClientUser } from "@/lib/clientAuth";

const jsonResponse = (body: unknown, ok = true) =>
  ({
    ok,
    status: ok ? 200 : 500,
    text: async () => JSON.stringify(body),
    json: async () => body,
  }) as unknown as Response;

const summary = {
  average: 4.5,
  count: 2,
  distribution: { "1": 0, "2": 0, "3": 0, "4": 1, "5": 1 },
};

const graceReview = {
  id: 2,
  agencyId: 7,
  clientId: 99,
  clientName: "Grace Tan",
  rating: 5,
  comment: "Placed my helper within two weeks.",
  createdAt: "2026-01-02T00:00:00.000Z",
  updatedAt: "2026-01-02T00:00:00.000Z",
};

const marcusReview = {
  id: 1,
  agencyId: 7,
  clientId: 42,
  clientName: "Marcus Lee",
  rating: 4,
  comment: "Good follow-up after placement.",
  createdAt: "2025-12-01T00:00:00.000Z",
  updatedAt: "2025-12-01T00:00:00.000Z",
};

const signedInClient: ClientUser = {
  id: 42,
  name: "Marcus Lee",
  email: "marcus@example.com",
  createdAt: "2025-01-01T00:00:00.000Z",
};

const renderReviews = () =>
  render(
    <MemoryRouter>
      <AgencyReviews agencyId={7} agencyName="At The Agency" />
    </MemoryRouter>,
  );

describe("AgencyReviews", () => {
  beforeEach(() => {
    // Vitest loads frontend/.env, which carries the real Google review short
    // link — stub both Google vars so every test starts from a known state.
    vi.stubEnv("VITE_GOOGLE_PLACE_ID", "");
    vi.stubEnv("VITE_GOOGLE_REVIEW_URL", "");

    // The list endpoint is public, so this is the shape every visitor sees.
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => jsonResponse({ summary, reviews: [graceReview, marcusReview] })),
    );
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
    clearClientAuth();
  });

  it("renders the rating summary and the public review list for anonymous visitors", async () => {
    renderReviews();

    expect(await screen.findByText("4.5")).toBeInTheDocument();
    expect(screen.getByText("Client reviews")).toBeInTheDocument();
    expect(screen.getByText("Grace Tan")).toBeInTheDocument();
    expect(screen.getByText("Marcus Lee")).toBeInTheDocument();
    expect(screen.getByText("Placed my helper within two weeks.")).toBeInTheDocument();

    // Anonymous visitors get a login prompt, never the write form.
    expect(screen.getByRole("link", { name: /log in to review/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /write a review/i })).not.toBeInTheDocument();
  });

  it("highlights the signed-in client's own review and posts an update for it", async () => {
    saveClientAuth("test-token", signedInClient);

    const updated = {
      ...marcusReview,
      rating: 5,
      comment: "Excellent service.",
      updatedAt: "2026-02-01T00:00:00.000Z",
    };
    const fetchMock = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      if (init?.method === "POST") {
        return jsonResponse({
          message: "Review saved",
          review: updated,
          summary: { ...summary, average: 5, count: 2 },
        });
      }
      return jsonResponse({ summary, reviews: [graceReview, marcusReview] });
    });
    vi.stubGlobal("fetch", fetchMock);

    renderReviews();

    // The client's own review is recognised as editable.
    fireEvent.click(await screen.findByRole("button", { name: /edit/i }));
    fireEvent.click(screen.getByRole("button", { name: "5 stars" }));
    fireEvent.change(screen.getByPlaceholderText(/tell other employers/i), {
      target: { value: "Excellent service." },
    });
    fireEvent.click(screen.getByRole("button", { name: /update review/i }));

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/agencies/7/reviews",
        expect.objectContaining({ method: "POST" }),
      ),
    );

    const postCall = fetchMock.mock.calls.find((call) => call[1]?.method === "POST");
    expect(postCall).toBeTruthy();
    const init = postCall?.[1];
    expect(JSON.parse(String(init?.body))).toEqual({ rating: 5, comment: "Excellent service." });
    expect((init?.headers as Record<string, string>).Authorization).toBe("Bearer test-token");
  });

  it("shows an empty state when an agency has no reviews yet", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        jsonResponse({
          summary: { average: 0, count: 0, distribution: { "1": 0, "2": 0, "3": 0, "4": 0, "5": 0 } },
          reviews: [],
        }),
      ),
    );

    renderReviews();

    expect(await screen.findByText(/no reviews yet/i)).toBeInTheDocument();
  });

  // ── Google review funnel ────────────────────────────────────────────────
  // A Google rating can only ever be written by the visitor on Google's own
  // page, so the app's job is to hand them over at the right moment.

  const GOOGLE_PLACE_ID = "ChIJ3S-JXmauEmsRUcIaWtf4MzE";

  it("never pushes an anonymous visitor to Google", async () => {
    vi.stubEnv("VITE_GOOGLE_PLACE_ID", GOOGLE_PLACE_ID);
    renderReviews();

    await screen.findByText("Client reviews");
    expect(screen.queryByRole("link", { name: /rate us on google/i })).not.toBeInTheDocument();
  });

  // Posts for the first time, so the write form (not the "your review" view) shows.
  const stubFirstReview = () => {
    const created = { ...marcusReview, rating: 5, comment: "Great service." };
    vi.stubGlobal(
      "fetch",
      vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
        if (init?.method === "POST") {
          return jsonResponse({ message: "Review saved", review: created, summary });
        }
        return jsonResponse({
          summary: { average: 0, count: 0, distribution: { "1": 0, "2": 0, "3": 0, "4": 0, "5": 0 } },
          reviews: [],
        });
      }),
    );
  };

  const postReviewAndGetGoogleLink = async () => {
    fireEvent.click(await screen.findByRole("button", { name: /write a review/i }));
    fireEvent.click(screen.getByRole("button", { name: "5 stars" }));
    fireEvent.click(screen.getByRole("button", { name: /post review/i }));
    return screen.findByRole("link", { name: /rate us on google/i });
  };

  it("invites the client to Google right after they post a review", async () => {
    vi.stubEnv("VITE_GOOGLE_PLACE_ID", GOOGLE_PLACE_ID);
    saveClientAuth("test-token", signedInClient);
    stubFirstReview();
    renderReviews();

    const googleLink = await postReviewAndGetGoogleLink();

    expect(screen.getByText(/thanks for your review/i)).toBeInTheDocument();
    expect(googleLink).toHaveAttribute("href", expect.stringContaining("writereview"));
    expect(googleLink).toHaveAttribute("href", expect.stringContaining(`placeid=${GOOGLE_PLACE_ID}`));
    expect(googleLink).toHaveAttribute("target", "_blank");
  });

  it("does not re-prompt a client who already has a review", async () => {
    vi.stubEnv("VITE_GOOGLE_PLACE_ID", GOOGLE_PLACE_ID);
    saveClientAuth("test-token", signedInClient);
    renderReviews();

    // Marcus already reviewed in the fixture list, so this is a returning visit.
    expect(await screen.findByRole("button", { name: /edit/i })).toBeInTheDocument();
    expect(screen.queryByText(/thanks for your review/i)).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /rate us on google/i })).not.toBeInTheDocument();
  });

  it("falls back to a Google Maps search when no Place ID is configured", async () => {
    vi.stubEnv("VITE_GOOGLE_PLACE_ID", "");
    saveClientAuth("test-token", signedInClient);
    stubFirstReview();
    renderReviews();

    const googleLink = await postReviewAndGetGoogleLink();
    expect(googleLink).toHaveAttribute("href", expect.stringContaining("/maps/search/"));
    expect(googleLink.getAttribute("href")).not.toContain("writereview");
  });

  it("prefers the Business Profile review short link over the Place ID", async () => {
    vi.stubEnv("VITE_GOOGLE_PLACE_ID", GOOGLE_PLACE_ID);
    vi.stubEnv("VITE_GOOGLE_REVIEW_URL", "https://g.page/r/CfD9XpTa2bDcEAE/review");
    saveClientAuth("test-token", signedInClient);
    stubFirstReview();
    renderReviews();

    const googleLink = await postReviewAndGetGoogleLink();
    expect(googleLink).toHaveAttribute("href", "https://g.page/r/CfD9XpTa2bDcEAE/review");
  });
});
