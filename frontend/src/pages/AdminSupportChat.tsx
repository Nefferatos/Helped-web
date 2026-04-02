import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CheckCheck, MessageCircle } from "lucide-react";
import { toast } from "@/components/ui/sonner";
import { useNavigate } from "react-router-dom";
import { ChatWorkspace, type ChatWorkspaceConversation, type ChatWorkspaceMessage } from "@/components/chat/ChatWorkspace";
import { adminPath } from "@/lib/routes";
import { clearAgencyAdminAuth, getAgencyAdminAuthHeaders, getAgencyAdminToken, getStoredAgencyAdmin } from "@/lib/agencyAdminAuth";
import type { AdminConversation, ChatMessage } from "@/lib/chat";
import { streamSse } from "@/lib/sse";

const AdminSupportChat = () => {
  const navigate = useNavigate();
  const [conversations, setConversations] = useState<AdminConversation[]>([]);
  const [activeConversationKey, setActiveConversationKey] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [search, setSearch] = useState("");
  const [isLoadingConversations, setIsLoadingConversations] = useState(true);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const activeConversationRef = useRef<AdminConversation | null>(null);
  const lastMessageSignatureRef = useRef("");
  const admin = getStoredAgencyAdmin();

  const buildQueryString = (conversation: Pick<AdminConversation, "conversationType" | "agencyId" | "agencyName">) => {
    const params = new URLSearchParams();
    params.set("type", conversation.conversationType);
    if (conversation.conversationType === "agency" && conversation.agencyId) {
      params.set("agencyId", String(conversation.agencyId));
      if (conversation.agencyName) {
        params.set("agencyName", conversation.agencyName);
      }
    }
    return params.toString();
  };

  const loadConversations = useCallback(async (silent = false) => {
    const token = getAgencyAdminToken();
    if (!token) {
      clearAgencyAdminAuth();
      navigate(adminPath("/login"), { replace: true });
      return;
    }

    try {
      setErrorMessage("");
      const response = await fetch("/api/chats/admin", {
        headers: { ...getAgencyAdminAuthHeaders() },
      });
      const data = (await response.json().catch(() => ({}))) as {
        conversations?: AdminConversation[];
        error?: string;
      };

      if (!response.ok || !data.conversations) {
        if (response.status === 401) {
          clearAgencyAdminAuth();
          navigate(adminPath("/login"), { replace: true });
          return;
        }
        throw new Error(data.error || "Failed to load conversations");
      }

      setConversations(data.conversations);
      setActiveConversationKey((prev) => {
        if (prev && data.conversations.some((conversation) => conversation.key === prev)) {
          return prev;
        }
        return data.conversations[0]?.key ?? null;
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to load conversations";
      setErrorMessage(message);
      if (!silent) {
        toast.error(message);
      }
    } finally {
      if (!silent) {
        setIsLoadingConversations(false);
      }
    }
  }, [navigate]);

  const filteredConversations = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) {
      return conversations;
    }

    return conversations.filter((conversation) =>
      [
        conversation.clientName,
        conversation.clientEmail,
        conversation.clientCompany,
        conversation.agencyName,
        conversation.lastMessage,
      ]
        .join(" ")
        .toLowerCase()
        .includes(term),
    );
  }, [conversations, search]);

  const activeConversation = useMemo(
    () => conversations.find((item) => item.key === activeConversationKey) ?? null,
    [activeConversationKey, conversations],
  );

  useEffect(() => {
    activeConversationRef.current = activeConversation;
  }, [activeConversation]);

  const loadMessages = useCallback(async (conversation: AdminConversation, silent = false) => {
    try {
      if (!silent) {
        setIsLoadingMessages(true);
      }
      setErrorMessage("");

      const response = await fetch(`/api/chats/admin/${conversation.clientId}?${buildQueryString(conversation)}`, {
        headers: { ...getAgencyAdminAuthHeaders() },
      });
      const data = (await response.json().catch(() => ({}))) as {
        messages?: ChatMessage[];
        error?: string;
      };

      if (!response.ok || !data.messages) {
        if (response.status === 401) {
          clearAgencyAdminAuth();
          navigate(adminPath("/login"), { replace: true });
          return;
        }
        throw new Error(data.error || "Failed to load messages");
      }

      const nextMessages = [...data.messages].sort(
        (left, right) => new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime(),
      );
      const nextSignature = JSON.stringify(
        nextMessages.map((message) => [message.id, message.message, message.createdAt, message.senderRole]),
      );

      if (nextSignature !== lastMessageSignatureRef.current) {
        lastMessageSignatureRef.current = nextSignature;
        setMessages(nextMessages);
      }

      setConversations((prev) =>
        prev.map((item) => {
          if (item.key !== conversation.key) {
            return item;
          }
          if (item.unreadCount === 0) {
            return item;
          }
          return { ...item, unreadCount: 0 };
        }),
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to load messages";
      setErrorMessage(message);
      if (!silent) {
        toast.error(message);
      }
    } finally {
      if (!silent) {
        setIsLoadingMessages(false);
      }
    }
  }, [navigate]);

  useEffect(() => {
    const token = getAgencyAdminToken();
    if (!token) {
      clearAgencyAdminAuth();
      navigate(adminPath("/login"), { replace: true });
      return;
    }

    const controller = new AbortController();
    let lastId = 0;

    const run = async () => {
      try {
        const response = await fetch("/api/chats/admin/last-id", {
          headers: { ...getAgencyAdminAuthHeaders() },
          signal: controller.signal,
        });
        const data = (await response.json().catch(() => ({}))) as { lastId?: number };
        if (response.ok && typeof data.lastId === "number") {
          lastId = data.lastId;
        }
      } catch (error) {
        if (controller.signal.aborted) {
          return;
        }
      }

      while (!controller.signal.aborted) {
        try {
          await streamSse(`/api/chats/admin/stream?afterId=${lastId}`, {
            headers: { ...getAgencyAdminAuthHeaders() },
            signal: controller.signal,
            onEvent: (event) => {
              if (event.event !== "message" || !event.data) return;
              const payload = JSON.parse(event.data) as { message?: ChatMessage };
              const next = payload.message;
              if (!next) return;

              lastId = Math.max(lastId, next.id);

              const current = activeConversationRef.current;
              const isActive =
                !!current &&
                current.clientId === next.clientId &&
                current.conversationType === next.conversationType &&
                (current.conversationType === "support" || current.agencyId === next.agencyId);

              if (isActive) {
                setMessages((prev) => (prev.some((item) => item.id === next.id) ? prev : [...prev, next]));
                if (next.senderRole === "client") {
                  void loadMessages(current, true);
                }
              }

              void loadConversations(true);
            },
          });
        } catch (error) {
          if (controller.signal.aborted) return;
          await new Promise((resolve) => window.setTimeout(resolve, 1200));
        }
      }
    };

    void run();
    return () => controller.abort();
  }, [loadConversations, loadMessages, navigate]);

  useEffect(() => {
    void loadConversations(false);
  }, [loadConversations]);

  useEffect(() => {
    if (activeConversation) {
      lastMessageSignatureRef.current = "";
      void loadMessages(activeConversation, false);
      return;
    }

    setMessages([]);
    lastMessageSignatureRef.current = "";
  }, [activeConversation, loadMessages]);

  useEffect(() => {
    if (!scrollRef.current) {
      return;
    }
    scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  const sendMessage = async () => {
    if (!activeConversation || !draft.trim()) {
      return;
    }

    try {
      setIsSending(true);
      setErrorMessage("");

      const response = await fetch(
        `/api/chats/admin/${activeConversation.clientId}?${buildQueryString(activeConversation)}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...getAgencyAdminAuthHeaders(),
          },
          body: JSON.stringify({ message: draft.trim() }),
        },
      );
      const data = (await response.json().catch(() => ({}))) as {
        message?: ChatMessage;
        error?: string;
      };

      if (!response.ok || !data.message) {
        if (response.status === 401) {
          clearAgencyAdminAuth();
          navigate(adminPath("/login"), { replace: true });
          return;
        }
        throw new Error(data.error || "Failed to send message");
      }

      setMessages((prev) => {
        const nextMessages = [...prev, data.message!];
        lastMessageSignatureRef.current = JSON.stringify(
          nextMessages.map((message) => [message.id, message.message, message.createdAt, message.senderRole]),
        );
        return nextMessages;
      });
      setConversations((prev) =>
        prev.map((item) =>
          item.key === activeConversation.key
            ? {
                ...item,
                lastMessage: data.message!.message,
                lastMessageAt: data.message!.createdAt,
                unreadCount: 0,
              }
            : item,
        ),
      );
      setDraft("");
      await loadConversations(true);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to send message";
      setErrorMessage(message);
      toast.error(message);
    } finally {
      setIsSending(false);
    }
  };

  const totalUnread = conversations.reduce((sum, conversation) => sum + conversation.unreadCount, 0);

  const workspaceConversations = filteredConversations.map<ChatWorkspaceConversation>((conversation) => ({
    key: conversation.key,
    title: conversation.clientName,
    subtitle: conversation.clientEmail,
    preview: conversation.lastMessage,
    timestamp: conversation.lastMessageAt,
    unreadCount: conversation.unreadCount,
    tone: conversation.conversationType,
  }));

  const workspaceMessages = messages.map<ChatWorkspaceMessage>((message) => ({
    id: message.id,
    senderName: message.senderName,
    body: message.message,
    createdAt: message.createdAt,
    isOwn: message.senderRole === "agency",
  }));

  return (
    <div className="page-container">
      <div className="mb-6 flex items-center gap-3">
        <MessageCircle className="h-5 w-5 text-primary" />
        <h1 className="text-2xl font-bold text-foreground">User Chat Desk</h1>
      </div>

      <ChatWorkspace
        sidebarTitle="Live User Conversations"
        sidebarDescription="Reply to clients from one calmer inbox. Support chats and agency-specific chats stay together here."
        searchPlaceholder="Search by name, email, company, or message"
        conversations={workspaceConversations}
        activeConversationKey={activeConversationKey}
        onSelectConversation={setActiveConversationKey}
        search={search}
        onSearchChange={setSearch}
        summary={[
          { label: "Open Threads", value: conversations.length },
          { label: "Unread", value: totalUnread },
          { label: "Active User", value: activeConversation?.clientName || "None" },
        ]}
        headerTitle={activeConversation?.clientName || "Select a conversation"}
        headerSubtitle={
          activeConversation
            ? activeConversation.conversationType === "agency"
              ? `Agency conversation${activeConversation.agencyName ? ` with ${activeConversation.agencyName}` : ""}`
              : "Main support conversation"
            : "Choose a user thread to start chatting."
        }
        headerMetaTitle={admin?.agencyName || "Agency side"}
        headerMetaSubtitle={activeConversation?.clientEmail || "Replying as support"}
        messages={workspaceMessages}
        isLoadingConversations={isLoadingConversations}
        isLoadingMessages={isLoadingMessages}
        errorMessage={errorMessage}
        emptyConversationLabel="No user conversations yet."
        emptyMessagesLabel="No messages in this thread yet."
        draft={draft}
        onDraftChange={setDraft}
        onSend={() => void sendMessage()}
        isSending={isSending}
        composePlaceholder={
          activeConversation ? `Reply to ${activeConversation.clientName}...` : "Select a conversation to reply..."
        }
        scrollRef={scrollRef}
        renderMessageMeta={(message) => (message.isOwn ? <CheckCheck className="h-3.5 w-3.5" /> : null)}
      />
    </div>
  );
};

export default AdminSupportChat;
