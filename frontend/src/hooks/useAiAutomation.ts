import { useState } from "react";

export interface AiMatchCandidate {
  maidId: number;
  maidReferenceCode: string;
  maidName: string;
  score: number;
  reasons: string[];
}

export interface AiInquiryRecord {
  id: number;
  name: string;
  contact: string;
  message: string;
  intent: "hiring" | "inquiry" | "complaint";
  workflow: "maid_matching" | "support_escalation" | "general_inquiry" | "lead_nurture";
  reply: string;
  aiUsed: boolean;
  createdAt: string;
}

export interface AiInquiryResponse {
  inquiry: AiInquiryRecord;
  matches?: AiMatchCandidate[];
  reply: string;
}

export interface LeadBudget {
  min: number | null;
  max: number | null;
  currency: string;
  text: string;
}

export interface LeadEnrichment {
  serviceType: string;
  budget: LeadBudget;
  urgency: string;
  location: string;
  summary: string;
}

export interface LeadQualification {
  score: number;
  classification: "HIGH" | "MEDIUM" | "LOW";
  reasons: string[];
}

export interface LeadSubmissionResponse {
  lead: {
    id: number;
    name: string;
    source: "facebook" | "website" | "scraped";
    classification: "HIGH" | "MEDIUM" | "LOW";
    aiSummary: string;
    createdAt: string;
  };
  enrichment: LeadEnrichment;
  qualification: LeadQualification;
  notification: {
    id: number;
    recipient: string;
    message: string;
  };
  aiUsed: boolean;
}

interface ApiErrorPayload {
  error?: string;
}

interface InquiryPayload {
  name: string;
  contact: string;
  message: string;
  employerId?: number;
}

interface LeadPayload {
  source: "facebook" | "website" | "scraped";
  name: string;
  contact: string;
  message: string;
}

const parseApiError = async (response: Response, fallbackMessage: string) => {
  const data = (await response.json().catch(() => ({}))) as ApiErrorPayload;
  return data.error || fallbackMessage;
};

const postJson = async <TResponse, TPayload>(url: string, payload: TPayload, fallbackMessage: string) => {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(await parseApiError(response, fallbackMessage));
  }

  return (await response.json()) as TResponse;
};

export const triggerMakeScenario = async (
  scenario: "inquiry_pipeline" | "lead_pipeline",
  payload: Record<string, unknown>,
) => {
  const response = await fetch("/api/send-to-make", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ scenario, payload }),
  });

  if (!response.ok) {
    const message = await parseApiError(response, `Failed to trigger ${scenario}`);
    throw new Error(message);
  }

  return (await response.json()) as {
    ok: boolean;
    delivery?: {
      id: number;
      scenario: string;
      success: boolean;
      statusCode: number | null;
    };
  };
};

export const submitInquiryWithAutomation = async (payload: InquiryPayload) => {
  const inquiryResult = await postJson<AiInquiryResponse, InquiryPayload>(
    "/api/inquiry",
    payload,
    "Failed to process inquiry",
  );

  let makeTriggered = false;
  let makeError: string | null = null;

  try {
    await triggerMakeScenario("inquiry_pipeline", {
      inquiryId: inquiryResult.inquiry.id,
      intent: inquiryResult.inquiry.intent,
      workflow: inquiryResult.inquiry.workflow,
      aiUsed: inquiryResult.inquiry.aiUsed,
      matches: inquiryResult.matches ?? [],
      reply: inquiryResult.reply,
      contact: payload.contact,
      name: payload.name,
      message: payload.message,
    });
    makeTriggered = true;
  } catch (error) {
    makeError = error instanceof Error ? error.message : "Failed to trigger inquiry automation";
  }

  return {
    data: inquiryResult,
    makeTriggered,
    makeError,
  };
};

export const submitLeadWithAutomation = async (payload: LeadPayload) => {
  const leadResult = await postJson<LeadSubmissionResponse, LeadPayload>(
    "/api/leads/raw",
    payload,
    "Failed to create lead",
  );

  let makeTriggered = false;
  let makeError: string | null = null;

  try {
    await triggerMakeScenario("lead_pipeline", {
      leadId: leadResult.lead.id,
      source: leadResult.lead.source,
      classification: leadResult.lead.classification,
      aiUsed: leadResult.aiUsed,
      summary: leadResult.lead.aiSummary,
      name: payload.name,
      contact: payload.contact,
      message: payload.message,
    });
    makeTriggered = true;
  } catch (error) {
    makeError = error instanceof Error ? error.message : "Failed to trigger lead automation";
  }

  return {
    data: leadResult,
    makeTriggered,
    makeError,
  };
};

export interface InquiryConversationItem {
  id: string;
  role: "user" | "assistant";
  content: string;
  meta?: {
    intent?: AiInquiryRecord["intent"];
    aiUsed?: boolean;
    workflow?: AiInquiryRecord["workflow"];
    matches?: AiMatchCandidate[];
    makeTriggered?: boolean;
    makeError?: string | null;
  };
}

export const useAiInquiry = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<InquiryConversationItem[]>([]);

  const submitInquiry = async (payload: InquiryPayload) => {
    setIsSubmitting(true);
    setError(null);

    const userMessage: InquiryConversationItem = {
      id: `user-${Date.now()}`,
      role: "user",
      content: payload.message,
    };

    setHistory((current) => [...current, userMessage]);

    try {
      const result = await submitInquiryWithAutomation(payload);

      const assistantMessage: InquiryConversationItem = {
        id: `assistant-${Date.now()}`,
        role: "assistant",
        content: result.data.reply,
        meta: {
          intent: result.data.inquiry.intent,
          aiUsed: result.data.inquiry.aiUsed,
          workflow: result.data.inquiry.workflow,
          matches: result.data.matches,
          makeTriggered: result.makeTriggered,
          makeError: result.makeError,
        },
      };

      setHistory((current) => [...current, assistantMessage]);
      return result;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to process inquiry";
      setError(message);
      throw error;
    } finally {
      setIsSubmitting(false);
    }
  };

  const clearConversation = () => {
    setHistory([]);
    setError(null);
  };

  return {
    isSubmitting,
    error,
    history,
    submitInquiry,
    clearConversation,
  };
};
