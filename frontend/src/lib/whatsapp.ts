import { getAgencyAdminAuthHeaders } from "@/lib/agencyAdminAuth";

export type WhatsAppAttachmentKind = "image" | "video" | "document" | "audio" | "voice";
export type WhatsAppMessageStatus = "queued" | "sent" | "delivered" | "read" | "failed";

export interface WhatsAppAttachmentRecord {
  id: string;
  fileName: string;
  mimeType: string;
  size: number;
  kind: WhatsAppAttachmentKind;
  publicUrl: string;
  uploadedAt: string;
}

export interface WhatsAppMessageRecord {
  id: string;
  direction: "incoming" | "outgoing";
  status: WhatsAppMessageStatus;
  type: "text" | "template" | "image" | "video" | "document" | "audio" | "voice" | "system";
  senderName: string;
  senderRole: "recruiter" | "applicant" | "ai" | "system";
  text: string;
  templateKey?: string;
  automated: boolean;
  createdAt: string;
  readAt?: string;
  failedReason?: string;
  attachments: WhatsAppAttachmentRecord[];
}

export interface WhatsAppTemplateRecord {
  id: string;
  key: string;
  name: string;
  category: string;
  language: string;
  body: string;
  variables: string[];
  active: boolean;
}

export interface WhatsAppEventRecord {
  id: string;
  type: string;
  detail: string;
  createdAt: string;
}

export interface WhatsAppConversationRecord {
  id: string;
  candidateReferenceCode: string;
  candidateName: string;
  phoneNumber: string;
  currentStage: string;
  nextStep: string;
  tags: string[];
  unreadRecruiterCount: number;
  unreadApplicantCount: number;
  lastMessageAt: string;
  lastMessagePreview: string;
  status: "active" | "needs_attention" | "closed";
  aiEnabled: boolean;
  interviewSchedule?: {
    date: string;
    time: string;
    status: "scheduled" | "confirmed" | "reschedule_requested" | "cancelled" | "completed";
  };
  documentChecklist: Array<{
    key: string;
    label: string;
    completed: boolean;
    lastSubmittedAt?: string;
  }>;
  createdAt: string;
  updatedAt: string;
}

export interface WhatsAppConversationBundle {
  conversation: WhatsAppConversationRecord;
  candidate: Record<string, unknown>;
  messages: WhatsAppMessageRecord[];
  templates: WhatsAppTemplateRecord[];
  events: WhatsAppEventRecord[];
}

export interface WhatsAppDashboardMetrics {
  messagesSent: number;
  messagesDelivered: number;
  messagesRead: number;
  responseRate: number;
  averageResponseTimeMinutes: number;
  activeConversations: number;
  pendingReplies: number;
  interviewConfirmations: number;
  documentSubmissionRate: number;
}

const readJson = async <T>(response: Response) =>
  (await response.json().catch(() => ({}))) as T;

const ensureOk = async <T extends { error?: string }>(response: Response) => {
  const data = await readJson<T>(response);
  if (!response.ok) {
    throw new Error(data.error || `Request failed (${response.status})`);
  }
  return data;
};

export const fetchWhatsAppConversation = async (referenceCode: string) => {
  const response = await fetch(`/api/whatsapp/candidates/${encodeURIComponent(referenceCode)}`, {
    headers: { ...getAgencyAdminAuthHeaders() },
  });
  return ensureOk<WhatsAppConversationBundle & { error?: string }>(response);
};

export const sendWhatsAppMessage = async (
  referenceCode: string,
  payload: {
    text?: string;
    templateKey?: string;
    templateVariables?: Record<string, string | undefined>;
    attachments?: Array<{
      fileName: string;
      mimeType: string;
      dataBase64: string;
      kind: WhatsAppAttachmentKind;
    }>;
    automated?: boolean;
  },
) => {
  const response = await fetch(`/api/whatsapp/candidates/${encodeURIComponent(referenceCode)}/messages`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...getAgencyAdminAuthHeaders(),
    },
    body: JSON.stringify(payload),
  });
  return ensureOk<WhatsAppConversationBundle & { error?: string }>(response);
};

export const sendWhatsAppInboundSimulation = async (payload: {
  candidateReferenceCode: string;
  applicantName?: string;
  text?: string;
  attachments?: Array<{
    fileName: string;
    mimeType: string;
    dataBase64: string;
    kind: WhatsAppAttachmentKind;
  }>;
  enableAiReply?: boolean;
}) => {
  const response = await fetch("/api/whatsapp/inbound", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...getAgencyAdminAuthHeaders(),
    },
    body: JSON.stringify(payload),
  });
  return ensureOk<WhatsAppConversationBundle & { error?: string }>(response);
};

export const updateWhatsAppStage = async (
  referenceCode: string,
  payload: {
    stage: string;
    nextStep?: string;
    interviewSchedule?: {
      date: string;
      time: string;
      status: "scheduled" | "confirmed" | "reschedule_requested" | "cancelled" | "completed";
    };
    sendWorkflowTemplate?: boolean;
  },
) => {
  const response = await fetch(`/api/whatsapp/candidates/${encodeURIComponent(referenceCode)}/stage`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      ...getAgencyAdminAuthHeaders(),
    },
    body: JSON.stringify(payload),
  });
  return ensureOk<WhatsAppConversationBundle & { error?: string }>(response);
};

export const fetchWhatsAppMetrics = async () => {
  const response = await fetch("/api/whatsapp/dashboard/metrics", {
    headers: { ...getAgencyAdminAuthHeaders() },
  });
  return ensureOk<WhatsAppDashboardMetrics & { error?: string }>(response);
};
