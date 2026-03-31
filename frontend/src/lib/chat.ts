import { getAgencyAdminAuthHeaders } from "@/lib/agencyAdminAuth";
import { getClientAuthHeaders } from "@/lib/clientAuth";

export type ConversationType = "support" | "agency";

export interface ChatMessage {
  id: number;
  clientId: number;
  conversationType: ConversationType;
  agencyId?: number;
  agencyName?: string;
  senderRole: "client" | "agency";
  senderName: string;
  message: string;
  createdAt: string;
}

export interface ClientConversation {
  key: string;
  clientId: number;
  conversationType: ConversationType;
  title: string;
  description: string;
  agencyId?: number;
  agencyName?: string;
  lastMessage: string;
  lastMessageAt: string;
  unreadCount: number;
}

export interface AdminConversation {
  key: string;
  clientId: number;
  conversationType: ConversationType;
  agencyId?: number;
  agencyName?: string;
  clientName: string;
  clientEmail: string;
  clientCompany: string;
  lastMessage: string;
  lastMessageAt: string;
  unreadCount: number;
}

const readUnreadCount = async (response: Response) => {
  const data = (await response.json().catch(() => ({}))) as {
    unreadCount?: number;
    error?: string;
  };

  if (!response.ok || typeof data.unreadCount !== "number") {
    throw new Error(data.error || "Failed to load chat summary");
  }

  return data.unreadCount;
};

export const fetchClientUnreadChatCount = async () => {
  const response = await fetch("/api/chats/client/summary", {
    headers: { ...getClientAuthHeaders() },
  });
  return readUnreadCount(response);
};

export const fetchAdminUnreadChatCount = async () => {
  const response = await fetch("/api/chats/admin/summary", {
    headers: { ...getAgencyAdminAuthHeaders() },
  });
  return readUnreadCount(response);
};
