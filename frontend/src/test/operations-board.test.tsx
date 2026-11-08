import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import OperationsBoardPage from "@/pages/OperationsBoardPage";

const dueAt = "2026-11-08T10:30:00.000Z";
const task = {
  id: "task-1",
  placement_id: "placement-1",
  task_key: "medical_exam",
  task_group: "After arrival",
  title: "Complete medical examination",
  description: "Track and verify the examination.",
  status: "PLANNED",
  assigned_to: null,
  planned_at: null,
  due_at: dueAt,
  completed_at: null,
  evidence_document_id: null,
  verification_note: "",
  verified_at: null,
  verified_by: null,
  notes: "",
  employer_visible_note: "",
};

const jsonResponse = (body: unknown, ok = true) =>
  ({
    ok,
    status: ok ? 200 : 500,
    json: async () => body,
  }) as Response;

describe("Operations Board", () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("keeps a checklist due date unchanged when staff saves it in a non-UTC timezone", async () => {
    vi.stubEnv("TZ", "Asia/Singapore");
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url === "/api/operations-board") {
        return jsonResponse({
          placements: [{
            id: "placement-1",
            maid_reference_code: "M-001",
            employer_id: null,
            status: "CANDIDATE_SELECTED",
            target_start_date: null,
            last_status_at: dueAt,
            last_actor: "staff",
            flight_booked: false,
            medical_completed: false,
            sip_completed: false,
            handover_completed: false,
          }],
        });
      }
      if (url === "/api/operations-board/employers") return jsonResponse({ employers: [] });
      if (url === "/api/operations-board/interviews") return jsonResponse({ interviews: [] });
      if (url === "/api/operations-board/arrivals/rolling-three-day") return jsonResponse({ days: [] });
      if (url.endsWith("/placements/placement-1/tasks")) return jsonResponse({ tasks: [task] });
      if (url.endsWith("/placements/placement-1/documents")) return jsonResponse({ documents: [] });
      if (url.endsWith("/placements/placement-1/flights")) return jsonResponse({ flights: [] });
      if (url.endsWith("/placements/placement-1/mom-application")) {
        return jsonResponse({ application: null, applicantId: "", employerId: "" });
      }
      if (url.endsWith("/deployment-tasks/task-1") && init?.method === "PATCH") {
        return jsonResponse({ task, auditLogged: true });
      }
      return jsonResponse({ error: `Unexpected request: ${url}` }, false);
    });
    vi.stubGlobal("fetch", fetchMock);

    render(
      <MemoryRouter initialEntries={["/agencyadmin/operations/placements/placement-1"]}>
        <Routes>
          <Route path="/agencyadmin/operations/placements/:placementId" element={<OperationsBoardPage />} />
        </Routes>
      </MemoryRouter>,
    );

    const dueDateInput = await screen.findByLabelText("Due date");
    const expectedInputValue = (() => {
      const date = new Date(dueAt);
      const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
      return local.toISOString().slice(0, 16);
    })();
    expect(dueDateInput).toHaveValue(expectedInputValue);

    fireEvent.click(screen.getByRole("button", { name: /save details/i }));

    await waitFor(() => {
      const patchCall = fetchMock.mock.calls.find(([url, init]) =>
        String(url).endsWith("/deployment-tasks/task-1") && init?.method === "PATCH",
      );
      expect(patchCall).toBeDefined();
      const savedDueAt = JSON.parse(String(patchCall?.[1]?.body)).dueAt;
      expect(new Date(savedDueAt).toISOString()).toBe(dueAt);
    });
  });
});
