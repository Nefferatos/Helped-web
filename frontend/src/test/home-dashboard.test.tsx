import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import HomePage from "@/pages/HomePage";

const now = new Date().toISOString();

const jsonResponse = (body: unknown, ok = true) =>
  ({
    ok,
    status: ok ? 200 : 500,
    text: async () => JSON.stringify(body),
    json: async () => body,
  }) as unknown as Response;

// Every dashboard fetch SUCCEEDS. This is the path the UI takes in production
// and the one where a shape mismatch surfaces — the failure path only ever
// renders fallbacks, which is how a broken `contracts` tile once slipped
// through and white-screened the dashboard.
const successfulFetch = vi.fn(async (input: RequestInfo | URL) => {
  const url = String(input);
  if (url.includes("/api/maids")) {
    return jsonResponse({ maids: [{ id: 1, fullName: "Ana", referenceCode: "MM-1", isPublic: true, createdAt: now, agencyId: 1 }], total: 1 });
  }
  if (url.includes("/api/ats/applications")) {
    return jsonResponse({ data: [{ id: "app-1", appliedAt: now, status: "new applicant", source: "resume_upload" }], pageInfo: { page: 1, pageSize: 100, total: 1, totalPages: 1 } });
  }
  if (url.includes("/api/enquiries")) {
    return jsonResponse({ enquiries: [{ id: 1, createdAt: now, status: "new" }], total: 1 });
  }
  if (url.includes("/api/employers")) {
    return jsonResponse({ employers: [{ refCode: "E1", createdAt: now, updatedAt: now }] });
  }
  if (url.includes("/api/requests/status-counts")) {
    return jsonResponse({ pending: 2, interested: 1, direct_hire: 0, rejected: 0 });
  }
  if (url.includes("/api/operations-board/transcript")) {
    return jsonResponse({ entries: [], count: 0 });
  }
  if (url.includes("/api/operations-board")) {
    return jsonResponse({ placements: [], count: 0 });
  }
  return jsonResponse({});
});

describe("Agency dashboard", () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("renders the summary tiles from successful API data without crashing", async () => {
    vi.stubGlobal("fetch", successfulFetch);
    const { container } = render(<MemoryRouter><HomePage /></MemoryRouter>);

    // Wait until loading finished and the five tiles rendered their values.
    // A crash while deriving the tiles/chart would surface here instead.
    await waitFor(() => expect(container.querySelectorAll(".dash-value").length).toBe(5));

    expect(screen.getByText("Maid profiles")).toBeInTheDocument();
    expect(screen.getByText("Employment contracts")).toBeInTheDocument();
    expect(screen.getByText("Requests")).toBeInTheDocument();
    expect(screen.queryByText(/could not be loaded/i)).not.toBeInTheDocument();
  });
});
