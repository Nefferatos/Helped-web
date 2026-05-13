import { getAgencyAdminAuthHeaders } from "@/lib/agencyAdminAuth";
import { getClientAuthHeaders } from "@/lib/clientAuth";

export type ConversationType = "support" | "agency";

export interface ChatMessage {
  id: number;
  clientId: number;
  conversationType: ConversationType;
  agencyId?: number;
  agencyName?: string;
  clientProfileImageUrl?: string;
  agencyProfileImageUrl?: string;
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
  clientProfileImageUrl?: string;
  agencyProfileImageUrl?: string;
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
  clientProfileImageUrl?: string;
  agencyProfileImageUrl?: string;
  lastMessage: string;
  lastMessageAt: string;
  unreadCount: number;
}

export interface AgencyChatbotTopicOption {
  id: string;
  label: string;
  icon: string;
  description: string;
  suggestedMessage: string;
  enabled: boolean;
}

export interface AgencyChatbotResponseRule {
  id: string;
  label: string;
  keywords: string[];
  response: string;
  enabled: boolean;
}

export interface AgencyChatbotConfig {
  agencyId: number;
  enabled: boolean;
  botName: string;
  welcomeMessage: string;
  fallbackShortResponse: string;
  fallbackLongResponse: string;
  suggestionChips: string[];
  topicOptions: AgencyChatbotTopicOption[];
  responseRules: AgencyChatbotResponseRule[];
  updatedAt: string;
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
