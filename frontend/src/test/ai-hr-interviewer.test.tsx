import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import AiHrInterviewerPage from "@/pages/AiHrInterviewerPage";

const jsonResponse = (body: unknown, ok = true) =>
  ({
    ok,
    status: ok ? 200 : 500,
    json: async () => body,
  }) as Response;

describe("AI HR interviewer ATS integration", () => {
  afterEach(() => {
    cleanup();
    window.localStorage.clear();
    vi.unstubAllGlobals();
  });

  it("uses the selected ATS application, authenticates requests, and does not invite when starting", async () => {
    window.localStorage.setItem("agency_admin_token", "test-token");
    let chatCount = 0;
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url === "/api/ai/hr-interview/candidates") {
        return jsonResponse({
          candidates: [{
            applicationId: "ats-application-1",
            applicationCode: "ATS-001",
            name: "Test Applicant",
            email: "applicant@example.com",
            position: "Domestic Worker",
          }],
        });
      }
      if (url === "/api/ai/hr-interview/chat") {
        chatCount += 1;
        if (chatCount === 1) return jsonResponse({ evaluation: { score: 0, notes: "" }, nextQuestion: "Tell me about your experience.", stage: "introduction", isComplete: false, result: null });
        return jsonResponse({
          evaluation: { score: 80, notes: "Relevant experience" },
          nextQuestion: null,
          stage: "conclusion",
          isComplete: true,
          result: {
            overallScore: 80,
            recommendation: "pass",
            summary: "Advisory result",
            strengths: ["Relevant experience"],
            weaknesses: [],
          },
        });
      }
      if (url === "/api/ai/hr-interview/session") return jsonResponse({ data: { makeTriggered: false } });
      if (url === "/api/ai/hr-interview/sessions") {
        return jsonResponse({
          sessions: [{
            id: "notification-1",
            applicationId: "ats-application-1",
            candidateName: "Test Applicant",
            candidateEmail: "applicant@example.com",
            position: "Domestic Worker",
            status: "completed",
            currentStage: "conclusion",
            startedAt: "2026-11-08T10:00:00.000Z",
            result: {
              overallScore: 80,
              recommendation: "pass",
              summary: "AI interview completed.",
              strengths: [],
              weaknesses: [],
            },
          }],
        });
      }
      if (url === "/api/send-to-make") return jsonResponse({ ok: true });
      return jsonResponse({ error: `Unexpected request: ${url}` }, false);
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<AiHrInterviewerPage />);
    const applicantSelect = await screen.findByLabelText("ATS applicant");
    fireEvent.change(applicantSelect, { target: { value: "ats-application-1" } });
    fireEvent.click(screen.getByRole("button", { name: /start interview now/i }));

    await screen.findByText("Tell me about your experience.");
    expect(fetchMock.mock.calls.some(([url]) => String(url) === "/api/ai/hr-interview/email")).toBe(false);

    fireEvent.change(screen.getByPlaceholderText("Type your response..."), {
      target: { value: "I have several years of relevant experience." },
    });
    fireEvent.submit(screen.getByPlaceholderText("Type your response...").closest("form")!);

    await waitFor(() => {
      const sessionCall = fetchMock.mock.calls.find(([url]) => String(url) === "/api/ai/hr-interview/session");
      expect(sessionCall).toBeDefined();
      expect(JSON.parse(String(sessionCall?.[1]?.body)).applicationId).toBe("ats-application-1");
      expect(new Headers(sessionCall?.[1]?.headers).get("Authorization")).toBeTruthy();
    });

    const chatCall = fetchMock.mock.calls.find(([url]) => String(url) === "/api/ai/hr-interview/chat");
    expect(new Headers(chatCall?.[1]?.headers).get("Authorization")).toBeTruthy();
    expect(fetchMock.mock.calls.some(([url]) => String(url) === "/api/ai/hr-interview/email")).toBe(false);

    fireEvent.click(screen.getByRole("button", { name: /manage/i }));
    expect(await screen.findByText(/AI advisory: 80\/100/)).toBeInTheDocument();
    expect(screen.queryByText("Maria Santos")).not.toBeInTheDocument();
  });
});
