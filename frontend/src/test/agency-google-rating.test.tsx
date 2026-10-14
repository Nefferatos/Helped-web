import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import AgencyGoogleRating from "@/components/AgencyGoogleRating";

const PLACE_ID = "ChIJ3S-JXmauEmsRUcIaWtf4MzE";
const SHORT_LINK = "https://g.page/r/CfD9XpTa2bDcEAE/review";

const renderCard = (address = "12 Marina Blvd, Singapore") =>
  render(<AgencyGoogleRating agencyName="At The Agency" address={address} />);

describe("AgencyGoogleRating", () => {
  beforeEach(() => {
    // Vitest loads frontend/.env, which carries the real review short link, so
    // pin both Google vars to a known state before every test.
    vi.stubEnv("VITE_GOOGLE_PLACE_ID", "");
    vi.stubEnv("VITE_GOOGLE_REVIEW_URL", "");
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllEnvs();
  });

  it("publishes the owner's review request above the map", () => {
    renderCard();

    expect(screen.getByText(/our valued customers/i)).toBeInTheDocument();
    expect(screen.getByText(/5-star review on Google/i)).toBeInTheDocument();
    expect(screen.getByText("Thank You, At The Agency")).toBeInTheDocument();

    const iframe = screen.getByTitle(/map showing at the agency/i) as HTMLIFrameElement;
    expect(iframe.getAttribute("src")).toContain("output=embed");
    expect(iframe.getAttribute("src")).not.toContain("key=");
    expect(iframe).toHaveAttribute("loading", "lazy");
  });

  it("sends the visitor to the Business Profile short link, verbatim", () => {
    vi.stubEnv("VITE_GOOGLE_REVIEW_URL", SHORT_LINK);
    // A Place ID is also present — the short link must still win.
    vi.stubEnv("VITE_GOOGLE_PLACE_ID", PLACE_ID);

    renderCard();

    const cta = screen.getByRole("link", { name: /give us a 5-star review/i });
    expect(cta).toHaveAttribute("href", SHORT_LINK);
    expect(cta).toHaveAttribute("target", "_blank");

    // A direct link means no "go find the listing yourself" hint.
    expect(screen.queryByText(/find the agency and tap/i)).not.toBeInTheDocument();
  });

  it("falls back to the review composer built from a Place ID", () => {
    vi.stubEnv("VITE_GOOGLE_PLACE_ID", PLACE_ID);

    renderCard();

    const cta = screen.getByRole("link", { name: /give us a 5-star review/i });
    expect(cta).toHaveAttribute("href", expect.stringContaining("writereview"));
    expect(cta).toHaveAttribute("href", expect.stringContaining(`placeid=${PLACE_ID}`));
  });

  it("falls back to the Maps listing when nothing is configured", () => {
    renderCard();

    const cta = screen.getByRole("link", { name: /give us a 5-star review/i });
    expect(cta).toHaveAttribute("href", expect.stringContaining("/maps/search/"));
    expect(cta.getAttribute("href")).not.toContain("writereview");

    expect(screen.getByText(/find the agency and tap/i)).toBeInTheDocument();
  });

  it("falls back to the agency name for the map query when no address is known", () => {
    renderCard("   ");

    const iframe = screen.getByTitle(/map showing at the agency/i) as HTMLIFrameElement;
    expect(iframe.getAttribute("src")).toContain("q=At+The+Agency");
  });
});
