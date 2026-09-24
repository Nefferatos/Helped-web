import { getAgencyAdminAuthHeaders } from "@/lib/agencyAdminAuth";
import { getClientAuthHeaders } from "@/lib/clientAuth";
import { readSafeJson } from "@/lib/safeJson";

export type RequestType = "general" | "direct";
export type RequestStatus = "pending" | "interested" | "direct_hire" | "rejected";

export interface RequestClient {
  id: number;
  name: string;
  company?: string;
  phone?: string;
  email: string;
  createdAt: string;
  profileImageUrl?: string;
}

export interface RequestMaid {
  referenceCode: string;
  fullName: string;
  nationality: string;
  status: string;
  type: string;
  photoDataUrl?: string;
}

export interface RequestRecord {
  id: string;
  clientId: number | null;
  type: RequestType;
  agencyId: number;
  agencyName: string;
  status: RequestStatus;
  summary: string;
  budget: string | null;
  details: Record<string, unknown>;
  maidReferences: string[];
  createdAt: string;
  updatedAt: string;
  updatedBy: string;
  client: RequestClient | null;
  maids: RequestMaid[];
}

export type RequestMessageSenderType = "client" | "admin" | "staff" | "system";

export interface RequestConversationRecord {
  id: string;
  requestId: string;
  agencyId: number;
  clientId: number;
  createdAt: string;
}

export interface RequestMessageRecord {
  id: string;
  conversationId: string;
  senderType: RequestMessageSenderType;
  senderId: number;
  message: string;
  createdAt: string;
  attachments?: unknown;
}

export interface RequestPageInfo {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface RequestListResponse {
  data: RequestRecord[];
  pageInfo: RequestPageInfo;
}

export type RequestStatusCounts = Record<RequestStatus, number>;

export interface CreateRequestInput {
  clientId: number;
  type: RequestType;
  agencyId: number;
  details: Record<string, unknown>;
  maidReferences?: string[];
}

export const requestStatusMeta: Record<
  RequestStatus,
  { label: string; badgeClassName: string; dotClassName: string; accentClassName: string }
> = {
  pending: {
    label: "Under Review",
    badgeClassName: "border-amber-200 bg-amber-50 text-amber-700",
    dotClassName: "bg-amber-500",
    accentClassName: "text-amber-700",
  },
  interested: {
    label: "Match Found",
    badgeClassName: "border-sky-200 bg-sky-50 text-sky-700",
    dotClassName: "bg-sky-500",
    accentClassName: "text-sky-700",
  },
  direct_hire: {
    label: "In Progress",
    badgeClassName: "border-emerald-200 bg-emerald-50 text-emerald-700",
    dotClassName: "bg-emerald-500",
    accentClassName: "text-emerald-700",
  },
  rejected: {
    label: "Closed",
    badgeClassName: "border-red-200 bg-red-50 text-red-700",
    dotClassName: "bg-red-500",
    accentClassName: "text-red-700",
  },
};

const REQUESTS_REFRESH_EVENT = "requests:changed";
const REQUESTS_REFRESH_STORAGE_KEY = "requests:last-change";

const ensureOk = async <T extends { error?: string }>(response: Response) => {
  const data = await readSafeJson<T>(response);
  if (!response.ok) {
    throw new Error(data.error || `Request failed (${response.status})`);
  }
  return data;
};

export const notifyRequestsChanged = () => {
  if (typeof window === "undefined") return;

  try {
    const channel = new BroadcastChannel(REQUESTS_REFRESH_EVENT);
    channel.postMessage({ timestamp: Date.now() });
    channel.close();
  } catch {
    // Ignore environments without BroadcastChannel support.
  }

  try {
    window.localStorage.setItem(REQUESTS_REFRESH_STORAGE_KEY, String(Date.now()));
  } catch {
    // Ignore storage access failures.
  }

  window.dispatchEvent(new CustomEvent(REQUESTS_REFRESH_EVENT));
};

export const subscribeToRequestsChanged = (callback: () => void) => {
  if (typeof window === "undefined") return () => undefined;

  const handleLocalEvent = () => callback();
  const handleStorage = (event: StorageEvent) => {
    if (event.key === REQUESTS_REFRESH_STORAGE_KEY) {
      callback();
    }
  };

  window.addEventListener(REQUESTS_REFRESH_EVENT, handleLocalEvent);
  window.addEventListener("storage", handleStorage);

  let channel: BroadcastChannel | null = null;
  try {
    channel = new BroadcastChannel(REQUESTS_REFRESH_EVENT);
    channel.onmessage = () => callback();
  } catch {
    channel = null;
  }

  return () => {
    window.removeEventListener(REQUESTS_REFRESH_EVENT, handleLocalEvent);
    window.removeEventListener("storage", handleStorage);
    channel?.close();
  };
};

export const fetchRequests = async ({
  page = 1,
  pageSize = 12,
  status,
  query,
  clientId,
  agencyId,
}: {
  page?: number;
  pageSize?: number;
  status?: RequestStatus | "all";
  query?: string;
  clientId?: number;
  agencyId?: number;
}): Promise<RequestListResponse> => {
  const params = new URLSearchParams({
    page: String(page),
    pageSize: String(pageSize),
  });
  if (status && status !== "all") params.set("status", status);
  if (query?.trim()) params.set("q", query.trim());
  if (typeof clientId === "number") params.set("clientId", String(clientId));
  if (typeof agencyId === "number") params.set("agencyId", String(agencyId));

  const headers =
    typeof clientId === "number"
      ? getClientAuthHeaders()
      : getAgencyAdminAuthHeaders();

  const response = await fetch(`/api/requests?${params.toString()}`, {
    headers,
  });
  const data = await ensureOk<RequestListResponse & { error?: string }>(response);
  return data;
};

export const fetchRequestStatusCounts = async ({
  clientId,
  agencyId,
}: {
  clientId?: number;
  agencyId?: number;
}): Promise<RequestStatusCounts> => {
  const params = new URLSearchParams();
  if (typeof clientId === "number") params.set("clientId", String(clientId));
  if (typeof agencyId === "number") params.set("agencyId", String(agencyId));

  const headers =
    typeof clientId === "number"
      ? getClientAuthHeaders()
      : getAgencyAdminAuthHeaders();

  const response = await fetch(`/api/requests/status-counts?${params.toString()}`, {
    headers,
  });
  return ensureOk<RequestStatusCounts & { error?: string }>(response);
};

export const fetchRequest = async (id: string): Promise<RequestRecord> => {
  const response = await fetch(`/api/requests/${encodeURIComponent(id)}`, {
    headers: {
      ...getAgencyAdminAuthHeaders(),
      ...getClientAuthHeaders(),
    },
  });
  const data = await ensureOk<{ data: RequestRecord; error?: string }>(response);
  return data.data;
};

export const createRequest = async (input: CreateRequestInput): Promise<RequestRecord> => {
  const response = await fetch("/api/requests", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...getClientAuthHeaders(),
    },
    body: JSON.stringify(input),
  });
  const data = await ensureOk<{ data: RequestRecord; error?: string }>(response);
  notifyRequestsChanged();
  return data.data;
};

export const updateRequestStatus = async (id: string, status: RequestStatus): Promise<RequestRecord> => {
  const response = await fetch(`/api/requests/${encodeURIComponent(id)}/status`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      ...getAgencyAdminAuthHeaders(),
    },
    body: JSON.stringify({ status }),
  });
  const data = await ensureOk<{ data: RequestRecord; error?: string }>(response);
  notifyRequestsChanged();
  return data.data;
};

export const updateRequestMaids = async (id: string, maidReferences: string[]): Promise<RequestRecord> => {
  const response = await fetch(`/api/requests/${encodeURIComponent(id)}/maids`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      ...getAgencyAdminAuthHeaders(),
    },
    body: JSON.stringify({ maidReferences }),
  });
  const data = await ensureOk<{ data: RequestRecord; error?: string }>(response);
  notifyRequestsChanged();
  return data.data;
};

export const deleteRequests = async (ids: string[]): Promise<number> => {
  const response = await fetch("/api/requests/bulk", {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
      ...getAgencyAdminAuthHeaders(),
    },
    body: JSON.stringify({ ids }),
  });
  const data = await ensureOk<{ deleted?: number; error?: string }>(response);
  notifyRequestsChanged();
  return data.deleted ?? 0;
};

export const requestStateMessage = (status: RequestStatus) => {
  switch (status) {
    case "pending":
      return "Our agency is reviewing your request and looking for suitable candidates.";
    case "interested":
      return "We found potential matches for you! Review the recommended candidates.";
    case "direct_hire":
      return "Your request is moving forward. Our agency will guide you through the next steps.";
    case "rejected":
      return "This request has been closed. You can submit a new request anytime.";
    default:
      return "";
  }
};

/* ─────────────────────────────────────────
   Progress Steps — visual timeline
───────────────────────────────────────── */
export interface ProgressStep {
  key: string;
  label: string;
  description: string;
}

/** Returns ordered progress steps for a given request. */
export const getRequestProgressSteps = (request: RequestRecord): ProgressStep[] => {
  const isDirect = request.type === "direct";

  if (request.status === "rejected") {
    return [
      { key: "submitted", label: "Request Submitted", description: "Your request was received." },
      { key: "closed", label: "Request Closed", description: "This request has been closed. You can submit a new request anytime." },
    ];
  }

  const base: ProgressStep[] = [
    { key: "submitted", label: "Request Submitted", description: "We received your request and our agency team has been notified." },
  ];

  if (isDirect) {
    base.push(
      { key: "reviewing", label: "Our Agency Reviewing", description: "Our agency is checking the availability of your requested maid." },
      { key: "matching", label: "Checking Availability", description: "We're confirming if this maid is available for your requirements." },
    );
  } else {
    base.push(
      { key: "reviewing", label: "Our Agency Reviewing", description: "Our agency is reviewing your requirements and checking available candidates." },
      { key: "matching", label: "Finding Your Match", description: "We're looking for the best maid to match your household needs." },
    );
  }

  base.push(
    { key: "recommended", label: "Candidate Recommended", description: "We've found a potential match for you to review." },
    { key: "interview", label: "Interview", description: "Meet and interview the candidate before making your decision." },
    { key: "selected", label: "Maid Selected", description: "You've chosen your maid. Our agency handles the next steps." },
    { key: "hiring", label: "Hiring & Documentation", description: "We're processing the paperwork and employment arrangements." },
    { key: "placed", label: "Placement Complete", description: "Your maid has been successfully placed with your household." },
  );

  return base;
};

/** Returns the index of the current active step (0-based). */
export const getRequestCurrentStepIndex = (status: RequestStatus): number => {
  switch (status) {
    case "pending": return 1;
    case "interested": return 3;
    case "direct_hire": return 5;
    case "rejected": return -1;
    default: return 0;
  }
};

/** Returns the "what's happening now" explanation. */
export const requestWhatsHappening = (request: RequestRecord): string => {
  const isDirect = request.type === "direct";
  switch (request.status) {
    case "pending":
      return isDirect
        ? "Our agency is checking the availability of your requested maid and reviewing your requirements."
        : "Our agency is reviewing your requirements and looking for suitable candidates for you.";
    case "interested":
      return "We found potential matches! Review the recommended candidates and let us know what you think.";
    case "direct_hire":
      return "Great news! Your request is moving forward. Our agency will guide you through the next steps.";
    case "rejected":
      return "This request has been closed. You can submit a new request anytime.";
    default:
      return "Our agency is working on your request.";
  }
};

/** Returns the "what happens next" explanation. */
export const requestWhatsNext = (request: RequestRecord): string => {
  switch (request.status) {
    case "pending":
      return "We'll notify you as soon as we find suitable candidates or need more information.";
    case "interested":
      return "Review the recommended candidates and let us know if you'd like to proceed with an interview.";
    case "direct_hire":
      return "Our agency will contact you to arrange the next steps, including any interviews and documentation.";
    case "rejected":
      return "Feel free to submit a new request with updated preferences.";
    default:
      return "";
  }
};

/** Whether the user needs to take action. */
export const requestNeedsUserAction = (status: RequestStatus): boolean => {
  return status === "interested";
};

export const fetchRequestConversation = async (requestId: string): Promise<RequestConversationRecord> => {
  const response = await fetch(`/api/conversations/${encodeURIComponent(requestId)}`, {
    headers: {
      ...getAgencyAdminAuthHeaders(),
      ...getClientAuthHeaders(),
    },
  });
  const data = await ensureOk<{ data: RequestConversationRecord; error?: string }>(response);
  return data.data;
};

export const fetchRequestMessages = async (conversationId: string): Promise<RequestMessageRecord[]> => {
  const response = await fetch(`/api/messages/${encodeURIComponent(conversationId)}`, {
    headers: {
      ...getAgencyAdminAuthHeaders(),
      ...getClientAuthHeaders(),
    },
  });
  const data = await ensureOk<{ data: RequestMessageRecord[]; error?: string }>(response);
  return data.data;
};

export const createRequestMessage = async ({
  conversationId,
  message,
  attachments,
}: {
  conversationId: string;
  message: string;
  attachments?: unknown;
}): Promise<RequestMessageRecord> => {
  const response = await fetch("/api/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...getAgencyAdminAuthHeaders(),
      ...getClientAuthHeaders(),
    },
    body: JSON.stringify({
      conversationId,
      message,
      ...(attachments !== undefined ? { attachments } : {}),
    }),
  });
  const data = await ensureOk<{ data: RequestMessageRecord; error?: string }>(response);
  return data.data;
};
