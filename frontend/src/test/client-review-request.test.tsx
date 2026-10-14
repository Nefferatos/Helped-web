import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import ClientReviewRequest from "@/ClientPage/ClientReviewRequest";
import { clearClientAuth, saveClientAuth, type ClientUser } from "@/lib/clientAuth";

const SHORT_LINK = "https://g.page/r/CfD9XpTa2bDcEAE/review";

const clientA: ClientUser = {
  id: 1,
  name: "Client A",
  email: "a@example.com",
  createdAt: "2025-01-01T00:00:00.000Z",
};

const clientB: ClientUser = {
  id: 2,
  name: "Client B",
  email: "b@example.com",
  createdAt: "2025-01-01T00:00:00.000Z",
};

const rateLink = () => screen.queryByRole("link", { name: /give us a 5-star review/i });

describe("ClientReviewRequest", () => {
  beforeEach(() => {
    // Vitest loads frontend/.env, which carries the real review short link, so
    // pin both Google vars to a known state before every test.
    vi.stubEnv("VITE_GOOGLE_PLACE_ID", "");
    vi.stubEnv("VITE_GOOGLE_REVIEW_URL", "");
    // The "already asked" flag is persisted, so each test starts clean.
    window.localStorage.clear();
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllEnvs();
    clearClientAuth();
  });

  it("publishes the owner's review request and links to the short link", () => {
    vi.stubEnv("VITE_GOOGLE_REVIEW_URL", SHORT_LINK);

    render(<ClientReviewRequest />);

    expect(screen.getByText(/our valued customers/i)).toBeInTheDocument();
    expect(screen.getByText("Thank You, AT The Agency")).toBeInTheDocument();

    const cta = rateLink();
    expect(cta).toHaveAttribute("href", SHORT_LINK);
    expect(cta).toHaveAttribute("target", "_blank");
    expect(cta).toHaveAttribute("rel", expect.stringContaining("noopener"));

    // A direct link means no "go find the listing yourself" hint.
    expect(screen.queryByText(/write a review/i)).not.toBeInTheDocument();
  });

  it("pins the office on a Google map beside the request", () => {
    vi.stubEnv("VITE_GOOGLE_REVIEW_URL", SHORT_LINK);

    render(<ClientReviewRequest />);

    const iframe = screen.getByTitle(/map showing our office/i) as HTMLIFrameElement;
    const src = iframe.getAttribute("src") ?? "";
    expect(src).toContain("output=embed");
    expect(src).toContain("Jalan+Kukoh");
    expect(src).toContain("161003");
    // Keyless on purpose — API keys must never reach the browser bundle.
    expect(src).not.toContain("key=");
    expect(iframe).toHaveAttribute("loading", "lazy");
  });

  it("uses a caller-supplied address for the map instead of the office default", () => {
    render(<ClientReviewRequest address="12 Marina Blvd, Singapore 018982" />);

    const iframe = screen.getByTitle(/map showing our office/i) as HTMLIFrameElement;
    expect(iframe.getAttribute("src")).toContain("Marina+Blvd");
  });

  it("falls back to a Maps search when no Google link is configured", () => {
    render(<ClientReviewRequest />);

    expect(rateLink()).toHaveAttribute("href", expect.stringContaining("/maps/search/"));
    expect(screen.getByText(/write a review/i)).toBeInTheDocument();
  });

  it("keeps asking on repeat visits until the customer answers", () => {
    vi.stubEnv("VITE_GOOGLE_REVIEW_URL", SHORT_LINK);
    saveClientAuth("token-a", clientA);

    const firstVisit = render(<ClientReviewRequest />);
    expect(rateLink()).toBeInTheDocument();
    firstVisit.unmount();

    // Nothing was clicked, so it must still be there next time — hiding it here
    // is what made the request "disappear" before anyone read it.
    render(<ClientReviewRequest />);
    expect(rateLink()).toBeInTheDocument();
  });

  it("stops asking once the customer dismisses it", () => {
    vi.stubEnv("VITE_GOOGLE_REVIEW_URL", SHORT_LINK);
    saveClientAuth("token-a", clientA);

    const firstVisit = render(<ClientReviewRequest />);
    fireEvent.click(screen.getByRole("button", { name: /dismiss review request/i }));
    expect(rateLink()).not.toBeInTheDocument();
    firstVisit.unmount();

    render(<ClientReviewRequest />);
    expect(rateLink()).not.toBeInTheDocument();
  });

  it("stops asking once the customer heads off to Google", () => {
    vi.stubEnv("VITE_GOOGLE_REVIEW_URL", SHORT_LINK);
    saveClientAuth("token-a", clientA);

    const firstVisit = render(<ClientReviewRequest />);
    fireEvent.click(rateLink()!);
    firstVisit.unmount();

    render(<ClientReviewRequest />);
    expect(rateLink()).not.toBeInTheDocument();
  });

  it("still asks a different client using the same browser", () => {
    vi.stubEnv("VITE_GOOGLE_REVIEW_URL", SHORT_LINK);

    saveClientAuth("token-a", clientA);
    const firstVisit = render(<ClientReviewRequest />);
    expect(rateLink()).toBeInTheDocument();
    firstVisit.unmount();

    // A different customer on the same browser has not been asked yet.
    saveClientAuth("token-b", clientB);
    render(<ClientReviewRequest />);
    expect(rateLink()).toBeInTheDocument();
  });
});
