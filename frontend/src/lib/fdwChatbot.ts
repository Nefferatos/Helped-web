import { readSafeJson } from "@/lib/safeJson";

/**
 * Client for the FDW Application Chatbot Make blueprint
 * (make/helped-fdw-application-chatbot.blueprint.json), proxied by the Worker
 * at POST /api/fdw/chatbot. The Make webhook URL itself stays server-side.
 */

export interface FdwChatReply {
  reply: string;
  conversationId: string;
  source: string;
}

export interface FdwApplicationEventPayload {
  full_name: string;
  email: string;
  contact_number: string;
  nationality: string;
  years_of_experience: string;
  languages: string;
  employment_preference: string;
  available_date: string;
  note?: string;
  application_code?: string;
}

export interface FdwReferralEventPayload {
  referrer_name: string;
  referrer_contact: string;
  relationship?: string;
  referred_name: string;
  referred_contact?: string;
  note?: string;
  source_application_id?: string;
}

const postFdwChatbot = async <T extends { error?: string }>(
  body: Record<string, unknown>,
): Promise<T> => {
  const response = await fetch("/api/fdw/chatbot", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await readSafeJson<T>(response);
  if (!response.ok) throw new Error(data.error || `Request failed (${response.status})`);
  return data;
};

/** One turn of the application chat (scenario: "fdw_application_chat"). */
export const sendFdwChatMessage = async (input: {
  conversationId: string;
  message: string;
  collected?: Record<string, unknown>;
  fallbackReply?: string;
}): Promise<FdwChatReply> => {
  const data = await postFdwChatbot<{
    response?: string;
    reply?: string;
    conversationId?: string;
    source?: string;
    error?: string;
  }>({
    scenario: "fdw_application_chat",
    conversation_id: input.conversationId,
    message: input.message,
    collected: input.collected ?? {},
    fallback_reply: input.fallbackReply ?? "",
  });
  return {
    reply: (data.reply || data.response || "").trim(),
    conversationId: data.conversationId || input.conversationId,
    source: data.source || "make",
  };
};

/** Fires the "Completed FDW application" branch (event_type: fdw_application.completed). */
export const submitFdwApplication = async (payload: FdwApplicationEventPayload) => {
  const data = await postFdwChatbot<{ ok?: boolean; rowsAppended?: number; engine?: string; error?: string }>({
    event_type: "fdw_application.completed",
    submitted_at: new Date().toISOString(),
    ...payload,
  });
  return data;
};

/** Fires the "FDW referral" branch (event_type: fdw_referral.created). */
export const submitFdwReferral = async (payload: FdwReferralEventPayload) => {
  const referralId =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `fdw-referral-${Date.now()}`;
  const data = await postFdwChatbot<{ ok?: boolean; rowsAppended?: number; engine?: string; error?: string }>({
    event_type: "fdw_referral.created",
    submitted_at: new Date().toISOString(),
    referral_id: referralId,
    ...payload,
  });
  return data;
};

export const createFdwConversationId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `fdw-chat-${Date.now()}`;
