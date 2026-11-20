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
  requiresHumanReview: boolean;
  makeSuccess: boolean;
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
