import { getAgencyAdminAuthHeaders } from "@/lib/agencyAdminAuth";

export interface ApplicantAssistantChatResponse {
  requestId: string;
  conversationId: string;
  duplicate?: boolean;
  message: string;
  action: {
    type: string | null;
    status: string;
    data: Record<string, unknown>;
  } | null;
  result: {
    trackerId: string | null;
    googleDocUrl: string | null;
    documentId: string | null;
  };
  requiresHumanReview: boolean;
  makeSuccess: boolean;
}

export interface ApplicantTrackerResponse {
  tracker: {
    id: string;
    name: string;
    description: string;
    items: Array<Record<string, unknown>>;
    googleDocUrl: string | null;
    createdAt: string;
    updatedAt: string;
  } | null;
  googleDocUrl: string | null;
}

export const sendApplicantAssistantMessage = async (payload: {
  conversationId?: string;
  message: string;
  selectedApplicantIds?: string[];
  currentFilters?: Record<string, unknown>;
  currentSearch?: string;
}): Promise<ApplicantAssistantChatResponse> => {
  const response = await fetch("/api/applicant-assistant/chat", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...getAgencyAdminAuthHeaders(),
    },
    body: JSON.stringify(payload),
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || `Request failed (${response.status})`);
  }
  return data;
};

export const fetchApplicantTracker = async (
  trackerId?: string,
): Promise<ApplicantTrackerResponse> => {
  const query = trackerId ? `?trackerId=${encodeURIComponent(trackerId)}` : "";
  const response = await fetch(`/api/applicant-assistant/tracker${query}`, {
    headers: { ...getAgencyAdminAuthHeaders() },
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || `Request failed (${response.status})`);
  }
  return data;
};

export const createApplicantTracker = async (payload: {
  applicantIds?: string[];
  name?: string;
  filters?: Record<string, unknown>;
}): Promise<Record<string, unknown>> => {
  const response = await fetch("/api/applicant-assistant/tracker", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...getAgencyAdminAuthHeaders(),
    },
    body: JSON.stringify(payload),
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || `Request failed (${response.status})`);
  }
  return data;
};