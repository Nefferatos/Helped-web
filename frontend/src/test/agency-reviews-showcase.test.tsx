import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import AgencyReviewsShowcase from "@/components/AgencyReviewsShowcase";

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

// Deliberately lists the non-main agency first: the showcase must still ask for
// the main agency's reviews, not merely the first one in the payload.
const agencies = [
  { id: 3, name: "Small Agency", isMain: false, publicMaids: 1 },
  { id: 1, name: "At The Agency", isMain: true, publicMaids: 20 },
];

const graceReview = {
  id: 2,
  agencyId: 1,
  clientId: 99,
  clientName: "Grace Tan",
  rating: 5,
  comment: "Placed my helper within two weeks.",
  createdAt: "2026-01-02T00:00:00.000Z",
  updatedAt: "2026-01-02T00:00:00.000Z",
};

const marcusReview = {
  id: 1,
  agencyId: 1,
  clientId: 42,
  clientName: "Marcus Lee",
  rating: 4,
  comment: "Good follow-up after placement.",
  createdAt: "2025-12-01T00:00:00.000Z",
  updatedAt: "2025-12-01T00:00:00.000Z",
};

const stubFetch = (options?: { reviews?: unknown[]; summary?: typeof summary; fail?: boolean }) => {
  const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
    if (options?.fail) throw new Error("network down");
    if (String(input).includes("/reviews")) {
      return jsonResponse({
        summary: options?.summary ?? summary,
        reviews: options?.reviews ?? [graceReview, marcusReview],
      });
    }
    return jsonResponse({ agencies });
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
};

describe("AgencyReviewsShowcase", () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("shows the rating summary and recent client reviews", async () => {
    stubFetch();
    render(<AgencyReviewsShowcase />);

    expect(await screen.findByText("4.5")).toBeInTheDocument();
    expect(screen.getByText(/what employers say/i)).toBeInTheDocument();
    expect(screen.getByText("Grace Tan")).toBeInTheDocument();
    expect(screen.getByText("Marcus Lee")).toBeInTheDocument();
    expect(screen.getByText("Placed my helper within two weeks.")).toBeInTheDocument();
    expect(screen.getByText(/2 reviews/i)).toBeInTheDocument();
  });

  it("reads the reviews of the main agency (isMain), not the first listed", async () => {
    const fetchMock = stubFetch();
    render(<AgencyReviewsShowcase />);

    await screen.findByText("4.5");
    const reviewCalls = fetchMock.mock.calls
      .map((call) => String(call[0]))
      .filter((url) => url.includes("/reviews"));
    expect(reviewCalls).toContain("/api/agencies/1/reviews");
  });

  it("renders nothing when the agency has no reviews yet", async () => {
    stubFetch({
      reviews: [],
      summary: { average: 0, count: 0, distribution: { "1": 0, "2": 0, "3": 0, "4": 0, "5": 0 } },
    });
    const { container } = render(<AgencyReviewsShowcase />);

    await waitFor(() => expect(screen.queryByText(/what employers say/i)).not.toBeInTheDocument());
    expect(container.querySelector("#client-reviews")).toBeNull();
  });

  it("never breaks the page when the fetch fails", async () => {
    stubFetch({ fail: true });
    const { container } = render(<AgencyReviewsShowcase />);

    await waitFor(() => expect(container.querySelector("#client-reviews")).toBeNull());
  });

  it("caps the number of cards shown with the limit prop", async () => {
    stubFetch();
    render(<AgencyReviewsShowcase limit={1} />);

    expect(await screen.findByText("Grace Tan")).toBeInTheDocument();
    expect(screen.queryByText("Marcus Lee")).not.toBeInTheDocument();
  });
});
