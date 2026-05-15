import { getAgencyAdminAuthHeaders } from "@/lib/agencyAdminAuth";
import { getClientAuthHeaders } from "@/lib/clientAuth";

export type ConversationType = "support" | "agency";
export type SupportConversationStatus =
  | "OPEN"
  | "WAITING_CLIENT"
  | "WAITING_SUPPORT"
  | "RESOLVED"
  | "CLOSED";
export type SupportInquiryCategory =
  | "Booking Concern"
  | "Payment Concern"
  | "Contract Concern"
  | "Maid Replacement"
  | "Technical Support"
  | "General Inquiry";
export type SupportPriority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";

export interface ChatMessage {
  id: number;
  conversationId?: number;
  clientId: number;
  conversationType: ConversationType;
  agencyId?: number;
  agencyName?: string;
  clientProfileImageUrl?: string;
  agencyProfileImageUrl?: string;
  senderRole: "client" | "agency";
  senderName: string;
  message: string;
  attachments?: Array<{
    name: string;
    url: string;
    mimeType?: string;
    size?: number;
  }>;
  createdAt: string;
}

export interface ClientConversation {
  id?: number;
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
  unreadAdmin?: number;
  unreadClient?: number;
  status?: SupportConversationStatus;
  category?: SupportInquiryCategory;
  priority?: SupportPriority;
  assignedAdminId?: number;
  assignedAdminName?: string;
  subject?: string;
}

export interface AdminConversation {
  id?: number;
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
  unreadAdmin?: number;
  unreadClient?: number;
  status?: SupportConversationStatus;
  category?: SupportInquiryCategory;
  priority?: SupportPriority;
  assignedAdminId?: number;
  assignedAdminName?: string;
  subject?: string;
  description?: string;
}

export interface SupportNotification {
  id: number;
  conversationId: number;
  messageId: number;
  clientId: number;
  agencyId: number;
  recipientType: "client" | "admin";
  recipientId?: number;
  title: string;
  body: string;
  createdAt: string;
  readAt?: string;
  conversationType?: ConversationType;
  agencyName?: string;
  clientName?: string;
  clientEmail?: string;
  status?: SupportConversationStatus;
  category?: SupportInquiryCategory;
  priority?: SupportPriority;
  subject?: string;
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
    notifications?: SupportNotification[];
    error?: string;
  };

  if (!response.ok || typeof data.unreadCount !== "number") {
    throw new Error(data.error || "Failed to load chat summary");
  }

  return {
    unreadCount: data.unreadCount,
    notifications: Array.isArray(data.notifications) ? data.notifications : [],
  };
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
