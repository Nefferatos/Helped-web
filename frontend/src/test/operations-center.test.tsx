import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import HomePage from "@/pages/HomePage";

/** Dates are pinned to today/yesterday so the day grouping stays deterministic. */
const at = (offsetDays: number, hours: number, minutes: number) => {
  const date = new Date();
  date.setDate(date.getDate() - offsetDays);
  date.setHours(hours, minutes, 0, 0);
  return date.toISOString();
};

const entries = [
  {
    id: "e5", event_type: "interview.schedule_saved", entity_type: "interview", entity_id: "iv-1",
    actor: "user:recruiter", payload: { scheduledAt: at(0, 14, 45) }, status: "completed",
    created_at: at(0, 14, 0), interview_application_id: "app-1",
  },
  {
    id: "e1", event_type: "handover.completed", entity_type: "placement", entity_id: "pl-1",
    actor: "user:Maria", payload: { notes: "Signed at the airport" }, status: "completed",
    created_at: at(0, 10, 15), placement_reference: "MM-1001",
  },
  {
    id: "e2", event_type: "flight.booked", entity_type: "placement", entity_id: "pl-1",
    actor: "ai:trip-planner", payload: { notes: "SQ 123 confirmed" }, status: "completed",
    created_at: at(0, 10, 5), placement_reference: "MM-1001",
  },
  {
    id: "e3", event_type: "candidate.created", entity_type: "application", entity_id: "app-1",
    actor: "website:public-application",
    payload: { applicationCode: "APP-77", agencyId: 1, fullName: "Ana Cruz", nationality: "Filipino", attachmentCount: 3 },
    status: "completed", created_at: at(1, 9, 30),
  },
  {
    id: "e4", event_type: "make.webhook.failed", entity_type: "placement", entity_id: "pl-2",
    actor: "make:APPLICANT_INTAKE", payload: {}, status: "failed",
    created_at: at(2, 16, 0), placement_reference: "MM-1002",
  },
];

const jsonResponse = (body: unknown, ok = true) =>
  ({ ok, status: ok ? 200 : 503, json: async () => body }) as unknown as Response;

// The transcript needs the event spine, so the specs also cover the case where
// the endpoint answers 503 (storage not configured).
let endpointFails = false;
let payload = entries;

beforeEach(() => {
  endpointFails = false;
  payload = entries;
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/api/operations-board/transcript")) {
        return endpointFails
          ? jsonResponse({ error: "Activity transcript requires Supabase storage" }, false)
          : jsonResponse({ entries: payload, count: payload.length });
      }
      return jsonResponse({ error: "not mocked" }, false);
    }),
  );
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const renderConsole = () => render(<MemoryRouter><HomePage /></MemoryRouter>);

describe("Operations Center transcript dashboard", () => {
  it("renders the dashboard as a live transcript console", async () => {
    const { container } = renderConsole();

    expect(container.querySelector(".oc-deck--console")).toBeInTheDocument();
    expect(await screen.findByText("Handover signed off")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /dashboard/i })).toBeInTheDocument();
    expect(screen.getByText("4 events loaded · refreshed every 5s while this tab is visible · newest first")).toBeInTheDocument();
  });

  it("transcribes operations and recruitment events with actor and reference", async () => {
    renderConsole();

    expect(await screen.findByText("Handover signed off")).toBeInTheDocument();
    expect(screen.getByText("Flight booked")).toBeInTheDocument();
    expect(screen.getByText("Applicant received")).toBeInTheDocument();

    // AI HR is withheld: no chip for it, and no interview lines in the console.
    expect(screen.queryByRole("button", { name: /AI HR/ })).not.toBeInTheDocument();
    expect(screen.queryByText("Interview scheduled")).not.toBeInTheDocument();

    // who acted, straight out of the actor prefix
    expect(screen.getByText("Maria")).toBeInTheDocument();
    expect(screen.getByText("trip-planner")).toBeInTheDocument();
    expect(screen.getByText("public-application")).toBeInTheDocument();

    // what the event was about
    expect(screen.getAllByText("MM-1001").length).toBe(2);
    expect(screen.getByText("APP-77")).toBeInTheDocument();
    expect(screen.getByText("Signed at the airport")).toBeInTheDocument();
    expect(screen.getByText("Ana Cruz · Filipino · 3 files")).toBeInTheDocument();
  });

  it("groups lines by day and marks failed events", async () => {
    const { container } = renderConsole();

    await screen.findByText("Handover signed off");

    const days = container.querySelectorAll(".oc-log__day");
    expect(days.length).toBe(3); // today, yesterday, two days ago
    expect(screen.getByText(/Today/)).toBeInTheDocument();
    expect(screen.getByText(/Yesterday/)).toBeInTheDocument();

    // An unknown event type still renders, titled from its dotted name.
    expect(screen.getByText("Make Webhook Failed")).toBeInTheDocument();
    expect(screen.getByText("· 1 failed")).toBeInTheDocument();
  });

  it("filters by source and by free-text search", async () => {
    renderConsole();
    await screen.findByText("Handover signed off");

    fireEvent.click(screen.getByRole("button", { name: /Recruitment/ }));
    expect(screen.getByText("Applicant received")).toBeInTheDocument();
    expect(screen.queryByText("Handover signed off")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /All sources/ }));
    expect(screen.getByText("Handover signed off")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Filter the transcript"), { target: { value: "MM-1001" } });
    expect(screen.getByText("Flight booked")).toBeInTheDocument();
    expect(screen.queryByText("Applicant received")).not.toBeInTheDocument();
    expect(screen.queryByText("APP-77")).not.toBeInTheDocument();
  });

  it("links every line back to the page that wrote it", async () => {
    renderConsole();
    await screen.findByText("Handover signed off");

    expect(screen.getByText("Handover signed off").closest("a")).toHaveAttribute("href", "/agencyadmin/operations-center");
    expect(screen.getByText("Applicant received").closest("a")).toHaveAttribute("href", "/agencyadmin/recruitment");
  });

  it("pauses the live view when the reader scrolls away", async () => {
    renderConsole();
    await screen.findByText("Handover signed off");

    const follow = screen.getByRole("button", { name: /Following/ });
    expect(follow).toHaveAttribute("aria-pressed", "true");

    fireEvent.click(follow);
    expect(screen.getByRole("button", { name: /Paused/ })).toHaveAttribute("aria-pressed", "false");
  });

  it("says so when there is nothing recorded yet", async () => {
    payload = [];
    renderConsole();

    expect(await screen.findByText("Nothing recorded yet.")).toBeInTheDocument();
  });

  it("degrades gracefully when the event spine is unreachable", async () => {
    endpointFails = true;
    renderConsole();

    expect(await screen.findByText("Transcript unavailable.")).toBeInTheDocument();
    // The reason is shown in the log pane and echoed in the footer readout.
    expect(screen.getAllByText(/Activity transcript requires Supabase storage/).length).toBeGreaterThan(0);
    expect(screen.getByText("Open the Operations Center").closest("a")).toHaveAttribute("href", "/agencyadmin/operations-center");
  });

});
