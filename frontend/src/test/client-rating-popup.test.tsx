import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import ClientRatingPopup from "@/ClientPage/ClientRatingPopup";
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

const popup = () => screen.queryByRole("dialog", { name: /rating request/i });
const rateLink = () => screen.queryByRole("link", { name: /rate us on google/i });
const dismissButton = () => screen.getByRole("button", { name: /dismiss rating popup/i });

// Renders the popup and lets the delay elapse (fake timers).
const showPopup = (delayMs = 1000) => {
  render(<ClientRatingPopup delayMs={delayMs} />);
  act(() => {
    vi.advanceTimersByTime(delayMs);
  });
};

describe("ClientRatingPopup", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    // Vitest loads frontend/.env, which carries the real review short link, so
    // pin both Google vars to a known state before every test.
    vi.stubEnv("VITE_GOOGLE_PLACE_ID", "");
    vi.stubEnv("VITE_GOOGLE_REVIEW_URL", SHORT_LINK);
    window.localStorage.clear();
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    vi.unstubAllEnvs();
    clearClientAuth();
  });

  it("never prompts an anonymous visitor", () => {
    showPopup();
    expect(popup()).not.toBeInTheDocument();
  });

  it("prompts a signed-in client after the delay", () => {
    saveClientAuth("token-a", clientA);

    showPopup();

    expect(popup()).toBeInTheDocument();
    expect(screen.getByText(/enjoying our service/i)).toBeInTheDocument();
  });

  it("does not appear before the delay elapses", () => {
    saveClientAuth("token-a", clientA);

    render(<ClientRatingPopup delayMs={1000} />);
    act(() => {
      vi.advanceTimersByTime(500);
    });

    expect(popup()).not.toBeInTheDocument();
  });

  it("sends the client to Google's review composer", () => {
    saveClientAuth("token-a", clientA);

    showPopup();

    expect(rateLink()).toHaveAttribute("href", SHORT_LINK);
    expect(rateLink()).toHaveAttribute("target", "_blank");
    expect(rateLink()).toHaveAttribute("rel", expect.stringContaining("noopener"));
  });

  it("stops asking once dismissed", () => {
    saveClientAuth("token-a", clientA);

    showPopup();
    fireEvent.click(dismissButton());
    expect(popup()).not.toBeInTheDocument();

    cleanup();
    showPopup();
    expect(popup()).not.toBeInTheDocument();
  });

  it("stops asking once the client heads off to Google", () => {
    saveClientAuth("token-a", clientA);

    showPopup();
    fireEvent.click(rateLink()!);

    cleanup();
    showPopup();
    expect(popup()).not.toBeInTheDocument();
  });

  it("still prompts a different client using the same browser", () => {
    saveClientAuth("token-a", clientA);
    showPopup();
    fireEvent.click(dismissButton());

    cleanup();
    saveClientAuth("token-b", clientB);
    showPopup();
    expect(popup()).toBeInTheDocument();
  });
});
