import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, MessageCircle } from "lucide-react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { ChatWorkspace, type ChatWorkspaceConversation, type ChatWorkspaceMessage } from "@/components/chat/ChatWorkspace";
import { toast } from "@/components/ui/sonner";
import { getClientAuthHeaders, getClientToken, getStoredClient } from "@/lib/clientAuth";
import type { ChatMessage, ClientConversation, ConversationType } from "@/lib/chat";
import "./ClientTheme.css";

const defaultConversation: ClientConversation = {
  key: "support:0",
  clientId: 0,
  conversationType: "support",
  title: "Agency Support",
  description: "General help, follow-up, and request support",
  lastMessage: "",
  lastMessageAt: "",
  unreadCount: 0,
};

const ClientSupportChat = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [conversations, setConversations] = useState<ClientConversation[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const lastSignatureRef = useRef("");
  const activeConversationRef = useRef<ClientConversation>(defaultConversation);
  const client = getStoredClient();

  const selectedConversationType: ConversationType = searchParams.get("type") === "agency" ? "agency" : "support";
  const selectedAgencyId = selectedConversationType === "agency" ? Number(searchParams.get("agencyId")) : undefined;

  const activeConversation =
    conversations.find((item) =>
      item.conversationType === selectedConversationType &&
      (item.conversationType === "support" || item.agencyId === selectedAgencyId),
    ) ?? conversations[0] ?? defaultConversation;

  useEffect(() => {
    activeConversationRef.current = activeConversation;
  }, [activeConversation]);

  const filteredConversations = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) {
      return conversations;
    }
    return conversations.filter((item) =>
      `${item.title} ${item.description} ${item.lastMessage}`.toLowerCase().includes(term),
    );
  }, [conversations, search]);

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    params.set("type", activeConversation.conversationType);
    if (activeConversation.conversationType === "agency" && activeConversation.agencyId) {
      params.set("agencyId", String(activeConversation.agencyId));
      params.set("agencyName", activeConversation.agencyName || "Agency");
    }
    return params.toString();
  }, [activeConversation]);

  const loadConversations = useCallback(async (silent = false) => {
    try {
      const response = await fetch("/api/chats/client/conversations", {
        headers: { ...getClientAuthHeaders() },
      });
      const data = (await response.json().catch(() => ({}))) as {
        conversations?: ClientConversation[];
        error?: string;
      };

      if (!response.ok || !data.conversations) {
        throw new Error(data.error || "Failed to load conversations");
      }

      setConversations(data.conversations);
      const hasCurrentSelection = data.conversations.some(
        (item) =>
          item.conversationType === selectedConversationType &&
          (item.conversationType === "support" || item.agencyId === selectedAgencyId),
      );

      if (!hasCurrentSelection && data.conversations[0]) {
        const params = new URLSearchParams();
        params.set("type", data.conversations[0].conversationType);
        if (data.conversations[0].conversationType === "agency" && data.conversations[0].agencyId) {
          params.set("agencyId", String(data.conversations[0].agencyId));
          params.set("agencyName", data.conversations[0].agencyName || "Agency");
        }
        setSearchParams(params, { replace: true });
      }
    } catch (error) {
      if (!silent) {
        toast.error(error instanceof Error ? error.message : "Failed to load conversations");
      }
    }
  }, [selectedAgencyId, selectedConversationType, setSearchParams]);

  const loadMessages = useCallback(async (silent = false) => {
    try {
      if (!silent) {
        setIsLoading(true);
      }
      setErrorMessage("");

      const response = await fetch(`/api/chats/client?${queryString}`, {
        headers: { ...getClientAuthHeaders() },
      });
      const data = (await response.json().catch(() => ({}))) as {
        messages?: ChatMessage[];
        error?: string;
      };

      if (!response.ok || !data.messages) {
        throw new Error(data.error || "Failed to load chat");
      }

      const nextMessages = [...data.messages].sort(
        (left, right) => new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime(),
      );
      const signature = JSON.stringify(
        nextMessages.map((message) => [message.id, message.message, message.createdAt, message.senderRole]),
      );

      if (signature !== lastSignatureRef.current) {
        lastSignatureRef.current = signature;
        setMessages(nextMessages);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to load chat";
      setErrorMessage(message);
      if (!silent) {
        toast.error(message);
      }
    } finally {
      if (!silent) {
        setIsLoading(false);
      }
    }
  }, [queryString]);

  useEffect(() => {
    if (!getClientToken()) {
      navigate("/employer-login");
      return;
    }

    lastSignatureRef.current = "";
    void loadConversations(false);
    void loadMessages(false);

    const interval = window.setInterval(() => {
      void loadConversations(true);
      if (activeConversationRef.current) {
        void loadMessages(true);
      }
    }, 5000);

    return () => window.clearInterval(interval);
  }, [loadConversations, loadMessages, navigate]);

  useEffect(() => {
    lastSignatureRef.current = "";
    void loadMessages(false);
  }, [loadMessages]);

  useEffect(() => {
    if (!scrollRef.current) {
      return;
    }
    scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  const sendMessage = async () => {
    if (!draft.trim()) {
      return;
    }

    try {
      setIsSending(true);
      const response = await fetch(`/api/chats/client?${queryString}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getClientAuthHeaders(),
        },
        body: JSON.stringify({ message: draft.trim() }),
      });
      const data = (await response.json().catch(() => ({}))) as {
        message?: ChatMessage;
        error?: string;
      };

      if (!response.ok || !data.message) {
        throw new Error(data.error || "Failed to send message");
      }

      setMessages((prev) => {
        const nextMessages = [...prev, data.message!];
        lastSignatureRef.current = JSON.stringify(
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
              }
            : item,
        ),
      );
      setDraft("");
      await loadConversations(true);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to send message");
    } finally {
      setIsSending(false);
    }
  };

  const workspaceConversations = filteredConversations.map<ChatWorkspaceConversation>((conversation) => ({
    key: conversation.key,
    title: conversation.title,
    subtitle: conversation.description,
    preview: conversation.lastMessage,
    timestamp: conversation.lastMessageAt || new Date().toISOString(),
    unreadCount: conversation.unreadCount,
    tone: conversation.conversationType,
  }));

  const workspaceMessages = messages.map<ChatWorkspaceMessage>((message) => ({
    id: message.id,
    senderName: message.senderName,
    body: message.message,
    createdAt: message.createdAt,
    isOwn: message.senderRole === "client",
  }));

  return (
    <div className="client-page-theme min-h-screen bg-[linear-gradient(180deg,hsl(var(--background))_0%,hsl(var(--muted))_100%)]">
      <div className="container py-8 md:py-12">
        <Link
          to="/client/dashboard"
          className="mb-6 inline-flex items-center gap-2 font-body text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Dashboard
        </Link>

        <div className="mb-6 flex items-center gap-3">
          <MessageCircle className="h-5 w-5 text-primary" />
          <h1 className="font-display text-2xl font-bold text-foreground">Support Messages</h1>
        </div>

        <ChatWorkspace
          sidebarTitle="Your Conversations"
          sidebarDescription="Chat with support or message a specific agency without leaving the portal."
          searchPlaceholder="Search support chats"
          conversations={workspaceConversations}
          activeConversationKey={activeConversation.key}
          onSelectConversation={(key) => {
            const conversation = conversations.find((item) => item.key === key);
            if (!conversation) {
              return;
            }

            const params = new URLSearchParams();
            params.set("type", conversation.conversationType);
            if (conversation.conversationType === "agency" && conversation.agencyId) {
              params.set("agencyId", String(conversation.agencyId));
              params.set("agencyName", conversation.agencyName || "Agency");
            }
            setSearchParams(params);
          }}
          search={search}
          onSearchChange={setSearch}
          summary={[
            { label: "Conversations", value: conversations.length },
            {
              label: "Unread Replies",
              value: conversations.reduce((sum, conversation) => sum + conversation.unreadCount, 0),
            },
            { label: "You", value: client?.name || "Client" },
          ]}
          headerTitle={activeConversation.title}
          headerSubtitle={activeConversation.description}
          headerMetaTitle={client?.name || "Client"}
          headerMetaSubtitle={client?.email || ""}
          messages={workspaceMessages}
          isLoadingConversations={false}
          isLoadingMessages={isLoading}
          errorMessage={errorMessage}
          emptyConversationLabel="No conversations available yet."
          emptyMessagesLabel="Start the conversation here."
          draft={draft}
          onDraftChange={setDraft}
          onSend={() => void sendMessage()}
          isSending={isSending}
          composePlaceholder={`Message ${activeConversation.title}...`}
          scrollRef={scrollRef}
        />
      </div>
    </div>
  );
};

export default ClientSupportChat;
