import { getAgencyAdminAuthHeaders } from "@/lib/agencyAdminAuth";
import { getClientAuthHeaders, refreshClientToken } from "@/lib/clientAuth";

export type AiAgentResponse = {
  conversationId?: string;
  response?: string;
  structured?: Record<string, unknown>;
  toolResults?: unknown;
  error?: string;
};

export const callAiAgent = async (
  endpoint: string,
  payload: Record<string, unknown>,
  mode: "public" | "client" | "agency" = "public",
) => {
  let headers: Record<string, string> = { "Content-Type": "application/json" };
  if (mode === "client") {
    await refreshClientToken().catch(() => null);
    headers = { ...headers, ...getClientAuthHeaders() };
  }
  if (mode === "agency") {
    headers = { ...headers, ...getAgencyAdminAuthHeaders() };
  }

  const response = await fetch(endpoint, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  });
  const text = await response.text();
  let data: AiAgentResponse = {};
  if (text.trim()) {
    try {
      data = JSON.parse(text) as AiAgentResponse;
    } catch {
      data = { error: text.trim() };
    }
  }
  if (!response.ok) {
    throw new Error(data.error || `AI agent request failed (${response.status})`);
  }
  return data;
};
