import { getAgencyAdminAuthHeaders } from "@/lib/agencyAdminAuth";
import { getClientAuthHeaders } from "@/lib/clientAuth";

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
    label: "Pending",
    badgeClassName: "border-amber-200 bg-amber-50 text-amber-700",
    dotClassName: "bg-amber-500",
    accentClassName: "text-amber-700",
  },
  interested: {
    label: "Interested",
    badgeClassName: "border-sky-200 bg-sky-50 text-sky-700",
    dotClassName: "bg-sky-500",
    accentClassName: "text-sky-700",
  },
  direct_hire: {
    label: "Direct Hire",
    badgeClassName: "border-emerald-200 bg-emerald-50 text-emerald-700",
    dotClassName: "bg-emerald-500",
    accentClassName: "text-emerald-700",
  },
  rejected: {
    label: "Rejected",
    badgeClassName: "border-red-200 bg-red-50 text-red-700",
    dotClassName: "bg-red-500",
    accentClassName: "text-red-700",
  },
};

const readJson = async <T>(response: Response): Promise<T> =>
  (await response.json().catch(() => ({}))) as T;

const REQUESTS_REFRESH_EVENT = "requests:changed";
const REQUESTS_REFRESH_STORAGE_KEY = "requests:last-change";

const ensureOk = async <T extends { error?: string }>(response: Response) => {
  const data = await readJson<T>(response);
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
    typeof agencyId === "number"
      ? getAgencyAdminAuthHeaders()
      : typeof clientId === "number"
        ? getClientAuthHeaders()
        : {};

  console.log("[requests] fetchRequests request", {
    agencyId: agencyId ?? null,
    clientId: clientId ?? null,
    headers,
    url: `/api/requests?${params.toString()}`,
  });

  const response = await fetch(`/api/requests?${params.toString()}`, {
    headers,
  });
  const data = await ensureOk<RequestListResponse & { error?: string }>(response);
  console.log("[requests] fetchRequests response", {
    agencyId: agencyId ?? null,
    clientId: clientId ?? null,
    count: data.data.length,
    pageInfo: data.pageInfo,
    ids: data.data.map((item) => item.id),
  });
  return data;
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
  console.log("[requests] createRequest payload", input);
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

export const requestStateMessage = (status: RequestStatus) => {
  switch (status) {
    case "pending":
      return "We are reviewing your request.";
    case "interested":
      return "We found suitable maids for you to review.";
    case "direct_hire":
      return "Your request has moved into a direct hire outcome.";
    case "rejected":
      return "This request was closed. You can submit a new request anytime.";
    default:
      return "";
  }
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
