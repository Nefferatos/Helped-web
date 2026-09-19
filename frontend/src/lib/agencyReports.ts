import { getAgencyAdminAuthHeaders } from "@/lib/agencyAdminAuth";

/**
 * Client for the agency Google Sheets reporting API.
 *
 * Every data category in the agency portal maps to ONE dedicated Google Sheet
 * tab — categories are never blended into a shared sheet. The section catalogue
 * comes from the Worker (services/agencyReports.ts) so the UI always lists
 * exactly what the backend can export.
 */

export type AgencyReportSection = {
  id: string;
  /** Google Sheet tab title this category is written to. */
  title: string;
  /** UI grouping label (e.g. "Agency Profile", "Applicants"). */
  group: string;
  description: string;
  columnCount: number;
};

export type AgencyReportStatus = {
  serviceAccountConfigured: boolean;
  serviceAccountEmail: string;
  spreadsheetConfigured: boolean;
  spreadsheetId: string;
  spreadsheetUrl: string;
  /** Empty array means "export every section". */
  includedSectionIds: string[];
  savedSpreadsheetIdOrUrl: string;
  spreadsheetSource: "agency" | "worker" | "none";
  ready: boolean;
  blockingReason: string;
  updatedAt: string;
  lastRunAt: string;
  lastRunSummary: string;
};

export type AgencyReportRunResult = {
  spreadsheetId: string;
  spreadsheetUrl: string;
  tabsWritten: number;
  rowsWritten: number;
  tabs: Array<{ title: string; rows: number }>;
  skippedSectionIds: string[];
};

const agencyFetch = async (
  endpoint: string,
  init: RequestInit = {},
): Promise<unknown> => {
  const response = await fetch(endpoint, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...getAgencyAdminAuthHeaders(),
      ...(init.headers ?? {}),
    },
  });

  const text = await response.text();
  let payload: Record<string, unknown> = {};
  if (text.trim()) {
    try {
      payload = JSON.parse(text) as Record<string, unknown>;
    } catch {
      payload = { error: text.trim() };
    }
  }

  if (!response.ok) {
    if (response.status === 401) {
      throw new AgencyReportUnauthorizedError(
        typeof payload.error === "string" ? payload.error : "Unauthorized",
      );
    }
    throw new Error(
      typeof payload.error === "string" && payload.error
        ? payload.error
        : `Report request failed (${response.status})`,
    );
  }

  return payload;
};

/** Lets callers redirect to the login page on session expiry. */
export class AgencyReportUnauthorizedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AgencyReportUnauthorizedError";
  }
}

export const isAgencyReportUnauthorized = (error: unknown) =>
  error instanceof AgencyReportUnauthorizedError;

export const fetchAgencyReportSections = async (): Promise<
  AgencyReportSection[]
> => {
  const payload = (await agencyFetch("/api/reports/sections")) as {
    sections?: AgencyReportSection[];
  };
  return payload.sections ?? [];
};

export const fetchAgencyReportStatus = async (): Promise<AgencyReportStatus> => {
  const payload = (await agencyFetch("/api/reports/status")) as {
    status?: AgencyReportStatus;
  };
  if (!payload.status) throw new Error("Failed to load report configuration");
  return payload.status;
};

export const saveAgencyReportConfig = async (input: {
  spreadsheetIdOrUrl: string;
  includedSectionIds: string[];
}): Promise<AgencyReportStatus> => {
  const payload = (await agencyFetch("/api/reports/config", {
    method: "PUT",
    body: JSON.stringify(input),
  })) as { status?: AgencyReportStatus };
  if (!payload.status) throw new Error("Failed to save report configuration");
  return payload.status;
};

export const testAgencyGoogleSheetConnection = async (): Promise<{
  spreadsheetId: string;
  existingTabs: string[];
}> => {
  const payload = (await agencyFetch("/api/reports/google-sheet/test", {
    method: "POST",
  })) as { spreadsheetId?: string; existingTabs?: string[] };
  return {
    spreadsheetId: payload.spreadsheetId ?? "",
    existingTabs: payload.existingTabs ?? [],
  };
};

/**
 * Pushes the report. Each selected category lands in its own tab.
 * This can take a while on large datasets, so callers should show progress.
 */
export const runAgencyGoogleSheetReport =
  async (): Promise<AgencyReportRunResult> => {
    const payload = (await agencyFetch("/api/reports/google-sheet", {
      method: "POST",
    })) as AgencyReportRunResult;
    return payload;
  };
