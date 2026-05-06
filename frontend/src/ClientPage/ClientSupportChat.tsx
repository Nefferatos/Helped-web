import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  MessageCircle,
  Bot,
  ChevronDown,
  Sparkles,
  AlertCircle,
  RefreshCw,
  Tag,
} from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ChatWorkspace, type ChatWorkspaceConversation, type ChatWorkspaceMessage } from "@/components/chat/ChatWorkspace";
import { toast } from "@/components/ui/sonner";
import { getStoredClient } from "@/lib/clientAuth";
import type { ChatMessage, ClientConversation, ConversationType } from "@/lib/chat";
import { streamSse } from "@/lib/sse";
import { clientFetch, hasActiveClientSession, primeClientAuth, syncClientProfileFromSession } from "@/lib/supabaseAuth";
import "./ClientTheme.css";

/* ─── Types ─────────────────────────────────────────────────────────────── */

type AiStatus = "online" | "offline" | "checking";

type TopicOption = {
  id: string;
  label: string;
  icon: string;
  description: string;
  suggestedMessage: string;
};

/* ─── Constants ─────────────────────────────────────────────────────────── */

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

const SUPPORT_TOPICS: TopicOption[] = [
  {
    id: "placement",
    label: "Placement Status",
    icon: "📋",
    description: "Ask about your current placement or application progress",
    suggestedMessage: "Hi, I'd like to get an update on the status of my current placement request.",
  },
  {
    id: "schedule",
    label: "Schedule Change",
    icon: "📅",
    description: "Request a change to a helper's schedule or hours",
    suggestedMessage: "Hi, I need to request a change to my helper's schedule.",
  },
  {
    id: "complaint",
    label: "Raise a Concern",
    icon: "🚨",
    description: "Report an issue or concern with a helper or agency",
    suggestedMessage: "Hi, I'd like to raise a concern regarding my current arrangement.",
  },
  {
    id: "billing",
    label: "Billing / Fees",
    icon: "💳",
    description: "Inquire about invoices, fees, or payment",
    suggestedMessage: "Hi, I have a question regarding my billing or invoice.",
  },
  {
    id: "renewal",
    label: "Contract Renewal",
    icon: "🔄",
    description: "Discuss renewal or extension of a contract",
    suggestedMessage: "Hi, I'd like to discuss renewing my current contract.",
  },
  {
    id: "other",
    label: "Other",
    icon: "💬",
    description: "Something else — just type your message",
    suggestedMessage: "",
  },
];

/* ─── AI Status Banner ───────────────────────────────────────────────────── */

function AiStatusBanner({
  status,
  onRetry,
}: {
  status: AiStatus;
  onRetry: () => void;
}) {
  if (status === "online") return null;

  if (status === "checking") {
    return (
      <div className="flex items-center gap-2.5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm">
        <div className="h-2 w-2 animate-pulse rounded-full bg-amber-400" />
        <span className="font-medium text-amber-800">Connecting to AI assistant…</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2.5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm">
      <AlertCircle className="h-4 w-4 flex-shrink-0 text-red-500" />
      <span className="flex-1 font-medium text-red-800">
        AI assistant is currently unavailable. Select a topic below to reach our support team directly.
      </span>
      <button
        onClick={onRetry}
        className="flex items-center gap-1.5 rounded-lg border border-red-200 bg-white px-3 py-1 text-xs font-semibold text-red-700 hover:bg-red-50 transition-colors"
      >
        <RefreshCw className="h-3 w-3" />
        Retry
      </button>
    </div>
  );
}

/* ─── Topic Picker (shown when AI is offline) ────────────────────────────── */

function TopicPicker({
  onSelect,
  selectedId,
}: {
  onSelect: (topic: TopicOption) => void;
  selectedId: string | null;
}) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center gap-2">
        <Tag className="h-4 w-4 text-gray-500" />
        <p className="text-sm font-bold text-gray-700">What can we help you with?</p>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
        {SUPPORT_TOPICS.map((topic) => (
          <button
            key={topic.id}
            onClick={() => onSelect(topic)}
            className={`flex flex-col gap-1.5 rounded-xl border p-3.5 text-left transition-all ${
              selectedId === topic.id
                ? "border-emerald-300 bg-emerald-50 shadow-sm"
                : "border-gray-100 bg-gray-50/70 hover:border-gray-200 hover:bg-gray-50"
            }`}
          >
            <span className="text-xl leading-none">{topic.icon}</span>
            <span className={`text-[13px] font-semibold leading-snug ${selectedId === topic.id ? "text-emerald-900" : "text-gray-800"}`}>
              {topic.label}
            </span>
            <span className="text-[11px] text-gray-500 leading-snug line-clamp-2">{topic.description}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

/* ─── AI Suggestion Chip ─────────────────────────────────────────────────── */

function AiSuggestionChips({
  suggestions,
  onSelect,
}: {
  suggestions: string[];
  onSelect: (text: string) => void;
}) {
  if (!suggestions.length) return null;
  return (
    <div className="flex flex-wrap gap-2 px-1 pb-1">
      {suggestions.map((s) => (
        <button
          key={s}
          onClick={() => onSelect(s)}
          className="flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-[12px] font-semibold text-emerald-800 hover:bg-emerald-100 transition-colors"
        >
          <Sparkles className="h-3 w-3" />
          {s}
        </button>
      ))}
    </div>
  );
}

/* ─── Main Component ─────────────────────────────────────────────────────── */

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

  // AI assistant state
  const [aiStatus, setAiStatus] = useState<AiStatus>("checking");
  const [selectedTopic, setSelectedTopic] = useState<TopicOption | null>(null);
  const [showTopicPicker, setShowTopicPicker] = useState(false);
  const [aiSuggestions] = useState<string[]>([
    "What's my placement status?",
    "I need to reschedule",
    "Billing question",
    "Raise a concern",
  ]);

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

  // Check AI status
  const checkAiStatus = useCallback(async () => {
    setAiStatus("checking");
    try {
      const response = await clientFetch("/api/ai/status").catch(() => null);
      if (response?.ok) {
        setAiStatus("online");
        setShowTopicPicker(false);
      } else {
        setAiStatus("offline");
        setShowTopicPicker(true);
      }
    } catch {
      setAiStatus("offline");
      setShowTopicPicker(true);
    }
  }, []);

  useEffect(() => {
    void checkAiStatus();
  }, [checkAiStatus]);

  const filteredConversations = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return conversations;
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
      const response = await clientFetch("/api/chats/client/conversations");
      const data = (await response.json().catch(() => ({}))) as {
        conversations?: ClientConversation[];
        error?: string;
      };
      if (!response.ok || !data.conversations) throw new Error(data.error || "Failed to load conversations");
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
      if (!silent) toast.error(error instanceof Error ? error.message : "Failed to load conversations");
    }
  }, [selectedAgencyId, selectedConversationType, setSearchParams]);

  const loadMessages = useCallback(async (silent = false) => {
    try {
      if (!silent) setIsLoading(true);
      setErrorMessage("");
      const response = await clientFetch(`/api/chats/client?${queryString}`);
      const data = (await response.json().catch(() => ({}))) as { messages?: ChatMessage[]; error?: string };
      if (!response.ok || !data.messages) throw new Error(data.error || "Failed to load chat");

      const nextMessages = [...data.messages].sort(
        (l, r) => new Date(l.createdAt).getTime() - new Date(r.createdAt).getTime(),
      );
      const signature = JSON.stringify(nextMessages.map((m) => [m.id, m.message, m.createdAt, m.senderRole]));
      if (signature !== lastSignatureRef.current) {
        lastSignatureRef.current = signature;
        setMessages(nextMessages);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to load chat";
      setErrorMessage(message);
      if (!silent) toast.error(message);
    } finally {
      if (!silent) setIsLoading(false);
    }
  }, [queryString]);

  useEffect(() => {
    let cancelled = false;
    const boot = async () => {
      const isAuthenticated = await hasActiveClientSession();
      if (!isAuthenticated) {
        if (!cancelled) navigate("/employer-login");
        return;
      }
      await syncClientProfileFromSession();
      lastSignatureRef.current = "";
      if (!cancelled) {
        void loadConversations(false);
        void loadMessages(false);
      }
    };
    void boot();
    return () => { cancelled = true; };
  }, [loadConversations, loadMessages, navigate]);

  useEffect(() => {
    const controller = new AbortController();
    let lastId = 0;
    const run = async () => {
      try {
        const token = await primeClientAuth();
        if (!token) { navigate("/employer-login"); return; }
        const response = await clientFetch("/api/chats/client/last-id", { signal: controller.signal });
        const data = (await response.json().catch(() => ({}))) as { lastId?: number };
        if (response.ok && typeof data.lastId === "number") lastId = data.lastId;
      } catch { /* no-op */ }

      while (!controller.signal.aborted) {
        try {
          const token = await primeClientAuth();
          if (!token) { navigate("/employer-login"); return; }
          await streamSse(`/api/chats/client/stream?all=1&afterId=${lastId}`, {
            headers: { Authorization: `Bearer ${token}` },
            signal: controller.signal,
            onEvent: (event) => {
              if (event.event !== "message" || !event.data) return;
              const payload = JSON.parse(event.data) as { message?: ChatMessage };
              const next = payload.message;
              if (!next) return;
              lastId = Math.max(lastId, next.id);
              const current = activeConversationRef.current;
              const isActive =
                current.conversationType === next.conversationType &&
                (current.conversationType === "support" || current.agencyId === next.agencyId);
              if (isActive) {
                setMessages((prev) => prev.some((item) => item.id === next.id) ? prev : [...prev, next]);
                if (next.senderRole === "agency") void loadMessages(true);
              }
              void loadConversations(true);
            },
          });
        } catch {
          if (controller.signal.aborted) return;
          await new Promise((resolve) => window.setTimeout(resolve, 1200));
        }
      }
    };
    void run();
    return () => controller.abort();
  }, [loadConversations, loadMessages, navigate]);

  useEffect(() => {
    lastSignatureRef.current = "";
    void loadMessages(false);
  }, [loadMessages]);

  useEffect(() => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  const sendMessage = async (overrideDraft?: string) => {
    const messageText = (overrideDraft ?? draft).trim();
    if (!messageText) return;

    try {
      setIsSending(true);
      const response = await clientFetch(`/api/chats/client?${queryString}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: messageText }),
      });
      const data = (await response.json().catch(() => ({}))) as { message?: ChatMessage; error?: string };
      if (!response.ok || !data.message) throw new Error(data.error || "Failed to send message");

      setMessages((prev) => {
        const nextMessages = [...prev, data.message!];
        lastSignatureRef.current = JSON.stringify(nextMessages.map((m) => [m.id, m.message, m.createdAt, m.senderRole]));
        return nextMessages;
      });
      setConversations((prev) =>
        prev.map((item) =>
          item.key === activeConversation.key
            ? { ...item, lastMessage: data.message!.message, lastMessageAt: data.message!.createdAt }
            : item,
        ),
      );
      setDraft("");
      setSelectedTopic(null);
      await loadConversations(true);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to send message");
    } finally {
      setIsSending(false);
    }
  };

  const handleTopicSelect = (topic: TopicOption) => {
    setSelectedTopic(topic);
    if (topic.suggestedMessage) {
      setDraft(topic.suggestedMessage);
    }
  };

  const handleSuggestionSelect = (text: string) => {
    setDraft(text);
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

  const totalUnread = conversations.reduce((sum, c) => sum + c.unreadCount, 0);

  return (
    <div className="client-page-theme min-h-screen bg-[linear-gradient(180deg,hsl(var(--background))_0%,hsl(var(--muted))_100%)]">
      <div className="container py-8 md:py-12">

        {/* ── Page header ── */}
        <div className="mb-6 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary shadow-sm">
              <MessageCircle className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="font-display text-2xl font-bold text-foreground leading-tight">Support Messages</h1>
              {totalUnread > 0 && (
                <p className="text-sm font-semibold text-primary">{totalUnread} unread message{totalUnread !== 1 ? "s" : ""}</p>
              )}
            </div>
          </div>

          {/* AI status indicator */}
          <div
            className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold cursor-pointer transition-all ${
              aiStatus === "online"
                ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                : aiStatus === "checking"
                ? "border-amber-200 bg-amber-50 text-amber-700"
                : "border-red-200 bg-red-50 text-red-700"
            }`}
            onClick={() => aiStatus === "offline" && void checkAiStatus()}
            title={aiStatus === "offline" ? "Click to retry AI connection" : undefined}
          >
            <Bot className="h-3.5 w-3.5" />
            <div className={`h-1.5 w-1.5 rounded-full ${
              aiStatus === "online" ? "bg-emerald-500" :
              aiStatus === "checking" ? "bg-amber-400 animate-pulse" :
              "bg-red-400"
            }`} />
            AI {aiStatus === "checking" ? "Connecting" : aiStatus === "online" ? "Online" : "Offline"}
          </div>
        </div>

        {/* ── AI status banner ── */}
        <div className="mb-4">
          <AiStatusBanner status={aiStatus} onRetry={checkAiStatus} />
        </div>

        {/* ── Topic picker (shown when AI offline, above chat) ── */}
        {showTopicPicker && aiStatus === "offline" && (
          <div className="mb-5">
            <TopicPicker onSelect={handleTopicSelect} selectedId={selectedTopic?.id ?? null} />
          </div>
        )}

        {/* ── AI quick suggestions (shown when AI online) ── */}
        {aiStatus === "online" && messages.length === 0 && (
          <div className="mb-4">
            <p className="text-xs font-semibold text-gray-400 mb-2 px-1">Suggested messages</p>
            <AiSuggestionChips suggestions={aiSuggestions} onSelect={handleSuggestionSelect} />
          </div>
        )}

        {/* ── Chat workspace ── */}
        <ChatWorkspace
          sidebarTitle="Your Conversations"
          sidebarDescription="Chat with support or message a specific agency without leaving the portal."
          searchPlaceholder="Search support chats"
          conversations={workspaceConversations}
          activeConversationKey={activeConversation.key}
          onSelectConversation={(key) => {
            const conversation = conversations.find((item) => item.key === key);
            if (!conversation) return;
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
            { label: "Unread", value: totalUnread },
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
          emptyMessagesLabel={
            aiStatus === "offline"
              ? "Select a topic above, then type your message."
              : "Start the conversation here."
          }
          draft={draft}
          onDraftChange={setDraft}
          onSend={() => void sendMessage()}
          isSending={isSending}
          composePlaceholder={
            selectedTopic
              ? `Message about: ${selectedTopic.label}…`
              : `Message ${activeConversation.title}…`
          }
          scrollRef={scrollRef}
        />
      </div>
    </div>
  );
};

export default ClientSupportChat;