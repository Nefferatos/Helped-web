import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import * as XLSX from "xlsx";
import ReferralLeadsPage from "@/pages/ReferralLeadsPage";

const response = (body: unknown) =>
  ({ ok: true, status: 200, text: async () => JSON.stringify(body) }) as Response;

describe("ReferralLeadsPage", () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("requests status-filtered results from page one when the status tab changes", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = new URL(String(input), "https://example.test");
      if (url.pathname === "/api/dashboard/automations") return response({ workflows: [] });
      if (url.pathname === "/api/ats/referral-leads") {
        const page = Number(url.searchParams.get("page") ?? "1");
        const segment = url.searchParams.get("segment");
        return response({
          leads: [{
            id: `lead-${page}-${segment ?? "all"}`,
            name: "Referral Test",
            phone: "+6591234567",
            country: "Singapore",
            source: "Website",
            preferredLanguage: "English",
            whatsappConsentAt: null,
            whatsappConsentSource: "",
            whatsappConsentActive: false,
            whatsappOptedOut: false,
            interestStatus: "new",
            staffReviewRequired: true,
            lastDeliveryStatus: "not_sent",
            lastMessageAt: null,
            createdAt: new Date().toISOString(),
          }],
          total: segment ? 1 : 2,
          page,
          pageCount: segment ? 1 : 2,
          countries: ["Singapore"],
          summary: { total: 2, eligible: 0, awaitingConsent: 2, optedOut: 0, interested: 0, needsReview: 2, acceptedByMake: 0, failed: 0, countries: 1 },
        });
      }
      return response({});
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<MemoryRouter><ReferralLeadsPage /></MemoryRouter>);
    await screen.findByText("Referral Test");
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    await screen.findByText(/Page 2 of 2/);
    fireEvent.click(screen.getByRole("tab", { name: "Staff review" }));

    await waitFor(() => {
      const referralCalls = fetchMock.mock.calls
        .map(([input]) => new URL(String(input), "https://example.test"))
        .filter((url) => url.pathname === "/api/ats/referral-leads");
      const latest = referralCalls[referralCalls.length - 1];
      expect(latest.searchParams.get("page")).toBe("1");
      expect(latest.searchParams.get("segment")).toBe("review");
    });
    expect(await screen.findByText(/Page 1 of 1/)).toBeInTheDocument();
  });

  it("detects names and phone numbers embedded in a headerless spreadsheet", async () => {
    let importedLeads: Array<{ name: string; phone: string }> = [];
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = new URL(String(input), "https://example.test");
      if (url.pathname === "/api/dashboard/automations") return response({ workflows: [] });
      if (url.pathname === "/api/ats/referral-leads/import") {
        importedLeads = JSON.parse(String(init?.body)).leads;
        return response({ imported: 2, duplicateCount: 0, invalidCount: 1 });
      }
      if (url.pathname === "/api/ats/referral-leads") {
        return response({
          leads: [],
          total: 0,
          page: 1,
          pageCount: 0,
          countries: [],
          summary: { total: 0, eligible: 0, awaitingConsent: 0, optedOut: 0, interested: 0, needsReview: 0, acceptedByMake: 0, failed: 0, countries: 0 },
        });
      }
      return response({});
    });
    vi.stubGlobal("fetch", fetchMock);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet([
      ["1", "Sep-25", "Asha Example +91 98324 45220"],
      ["2", "Sep-25", "Mina Example"],
      ["3", "Sep-25", "Bina Example +91 90026 88452"],
    ]), "Sheet1");
    const fileData = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
    const file = {
      name: "referrals.xlsx",
      size: fileData.byteLength,
      arrayBuffer: async () => fileData,
    } as File;

    render(<MemoryRouter><ReferralLeadsPage /></MemoryRouter>);
    await screen.findByText("No referral leads yet");
    fireEvent.change(document.querySelector('input[type="file"]')!, { target: { files: [file] } });

    await waitFor(() => expect(importedLeads).toHaveLength(3));
    expect(importedLeads[0]).toEqual({ name: "Asha Example", phone: "+91 98324 45220", country: "", source: "Spreadsheet: referrals.xlsx", preferredLanguage: "", whatsappConsent: false, whatsappConsentSource: "" });
    expect(importedLeads[1]).toMatchObject({ name: "Mina Example", phone: "" });
    expect(importedLeads[2]).toMatchObject({ name: "Bina Example", phone: "+91 90026 88452" });
  });
});
