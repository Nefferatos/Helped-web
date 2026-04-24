import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  CheckCheck,
  MessageCircle,
  Search,
  Send,
  Users,
  ArrowLeft,
  Inbox,
} from "lucide-react";
import { toast } from "@/components/ui/sonner";
import { useNavigate } from "react-router-dom";
import { adminPath } from "@/lib/routes";
import {
  clearAgencyAdminAuth,
  getAgencyAdminAuthHeaders,
  getAgencyAdminToken,
  getStoredAgencyAdmin,
} from "@/lib/agencyAdminAuth";
import type { AdminConversation, ChatMessage } from "@/lib/chat";
import { streamSse } from "@/lib/sse";

/* ─── Helpers ──────────────────────────────────────────────────────────── */

function initials(name: string) {
  return name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}

function formatTime(iso: string) {
  if (!iso) return "";
  const d = new Date(iso);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - d.getTime()) / 86_400_000);
  if (diffDays === 0) return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return d.toLocaleDateString([], { weekday: "short" });
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
}

function formatDateLabel(iso: string) {
  if (!iso) return "";
  const d = new Date(iso);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - d.getTime()) / 86_400_000);
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  return d.toLocaleDateString([], { weekday: "long", month: "long", day: "numeric" });
}

function groupMessagesByDate(messages: ChatMessage[]) {
  const groups: { label: string; messages: ChatMessage[] }[] = [];
  let currentLabel = "";
  for (const msg of messages) {
    const label = formatDateLabel(msg.createdAt);
    if (label !== currentLabel) {
      currentLabel = label;
      groups.push({ label, messages: [msg] });
    } else {
      groups[groups.length - 1].messages.push(msg);
    }
  }
  return groups;
}

function buildQueryString(
  conversation: Pick<AdminConversation, "conversationType" | "agencyId" | "agencyName">,
) {
  const params = new URLSearchParams();
  params.set("type", conversation.conversationType);
  if (conversation.conversationType === "agency" && conversation.agencyId) {
    params.set("agencyId", String(conversation.agencyId));
    if (conversation.agencyName) params.set("agencyName", conversation.agencyName);
  }
  return params.toString();
}

/* ─── Sub-components ───────────────────────────────────────────────────── */

type AvatarTone = "client" | "agency" | "support";

const TONE_CLASSES: Record<AvatarTone, string> = {
  client:  "bg-violet-100 text-violet-700",
  agency:  "bg-emerald-100 text-emerald-800",
  support: "bg-sky-100 text-sky-700",
};

const SIZE_CLASSES: Record<"sm" | "md" | "lg", string> = {
  sm: "h-9 w-9 text-[13px]",
  md: "h-11 w-11 text-[15px]",
  lg: "h-14 w-14 text-[18px]",
};

function AvatarBubble({
  name,
  tone = "client",
  size = "md",
}: {
  name: string;
  tone?: AvatarTone;
  size?: "sm" | "md" | "lg";
}) {
  return (
    <div
      className={`flex flex-shrink-0 items-center justify-center rounded-full font-bold tracking-wide ${TONE_CLASSES[tone]} ${SIZE_CLASSES[size]}`}
    >
      {initials(name)}
    </div>
  );
}

function UnreadBadge({ count }: { count: number }) {
  if (!count) return null;
  return (
    <span className="inline-flex min-w-[22px] items-center justify-center rounded-full bg-emerald-600 px-2 py-0.5 text-[12px] font-bold leading-none text-white shadow-sm">
      {count > 99 ? "99+" : count}
    </span>
  );
}

function LoadingDots() {
  return (
    <div className="flex items-center justify-center gap-2 px-4 py-8">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="h-2.5 w-2.5 rounded-full bg-emerald-300"
          style={{ animation: `dotPulse 1.2s ease-in-out ${i * 0.2}s infinite` }}
        />
      ))}
    </div>
  );
}

function EmptyState({ label, icon }: { label: string; icon?: "message" | "user" }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 p-12">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-50 shadow-sm">
        {icon === "user" ? (
          <Users className="h-7 w-7 text-emerald-600" />
        ) : (
          <Inbox className="h-7 w-7 text-emerald-600" />
        )}
      </div>
      <p className="max-w-[220px] text-center text-[15px] leading-relaxed text-gray-400 font-medium">{label}</p>
    </div>
  );
}

function DateDivider({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 my-2">
      <div className="h-px flex-1 bg-gray-150" />
      <span className="whitespace-nowrap rounded-full bg-gray-100 px-3 py-1 text-[13px] font-semibold text-gray-400">
        {label}
      </span>
      <div className="h-px flex-1 bg-gray-150" />
    </div>
  );
}

/* ─── Conversation list item ───────────────────────────────────────────── */

function ConversationItem({
  conversation,
  isActive,
  onClick,
}: {
  conversation: AdminConversation;
  isActive: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`group relative flex w-full items-start gap-3.5 border-b border-gray-100 px-4 py-4 text-left transition-all last:border-0 ${
        isActive
          ? "bg-emerald-50 before:absolute before:left-0 before:top-3 before:bottom-3 before:w-1 before:rounded-r-full before:bg-emerald-600"
          : "hover:bg-gray-50/80"
      }`}
    >
      <AvatarBubble name={conversation.clientName} tone="client" size="md" />
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2 mb-0.5">
          <p className={`truncate text-[15px] leading-snug ${isActive ? "font-bold text-emerald-900" : "font-semibold text-gray-800"}`}>
            {conversation.clientName}
          </p>
          <span className={`flex-shrink-0 text-[12px] font-medium ${isActive ? "text-emerald-700" : "text-gray-400"}`}>
            {formatTime(conversation.lastMessageAt)}
          </span>
        </div>
        <p className="truncate text-[13px] text-gray-500 mb-1">{conversation.clientEmail}</p>
        {conversation.lastMessage && (
          <p className="truncate text-[13px] text-gray-400 leading-snug">
            {conversation.lastMessage}
          </p>
        )}
      </div>
      <div className="flex flex-shrink-0 flex-col items-end gap-1.5 pt-0.5">
        <UnreadBadge count={conversation.unreadCount} />
        {conversation.conversationType === "agency" && conversation.agencyName && (
          <span className="max-w-[72px] truncate rounded-md bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-800">
            {conversation.agencyName}
          </span>
        )}
      </div>
    </button>
  );
}

/* ─── Message bubble ───────────────────────────────────────────────────── */

function MessageBubble({ message }: { message: ChatMessage }) {
  const isOwn = message.senderRole === "agency";
  const tone: AvatarTone =
    isOwn ? "agency" : message.senderRole === "client" ? "client" : "support";

  return (
    <div
      className={`asc-msg-row flex items-end gap-2.5 ${isOwn ? "ml-auto flex-row-reverse" : ""}`}
      style={{ maxWidth: "72%" }}
    >
      <AvatarBubble name={message.senderName} tone={tone} size="sm" />
      <div className="min-w-0">
        {!isOwn && (
          <p className="mb-1.5 pl-1 text-[13px] font-semibold text-gray-500">{message.senderName}</p>
        )}
        <div
          className={`rounded-2xl px-4 py-3 text-[15px] leading-relaxed shadow-sm ${
            isOwn
              ? "rounded-br-md bg-emerald-700 text-white"
              : "rounded-bl-md bg-white text-gray-800 border border-gray-100"
          }`}
        >
          {message.message}
        </div>
        <div
          className={`mt-1.5 flex items-center gap-1 text-[12px] text-gray-400 font-medium ${
            isOwn ? "justify-end pr-1" : "pl-1"
          }`}
        >
          {formatTime(message.createdAt)}
          {isOwn && <CheckCheck className="h-3.5 w-3.5 text-emerald-400" />}
        </div>
      </div>
    </div>
  );
}

/* ─── Main component ───────────────────────────────────────────────────── */

const AdminSupportChat = () => {
  const navigate = useNavigate();
  const [mobileView, setMobileView] = useState<"list" | "chat">("list");

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
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const activeConversationRef = useRef<AdminConversation | null>(null);
  const lastMessageSignatureRef = useRef("");
  const admin = getStoredAgencyAdmin();

  const activeConversation = useMemo(
    () => conversations.find((item) => item.key === activeConversationKey) ?? null,
    [activeConversationKey, conversations],
  );

  useEffect(() => {
    activeConversationRef.current = activeConversation;
  }, [activeConversation]);

  const filteredConversations = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return conversations;
    return conversations.filter((c) =>
      [c.clientName, c.clientEmail, c.clientCompany, c.agencyName, c.lastMessage]
        .join(" ")
        .toLowerCase()
        .includes(term),
    );
  }, [conversations, search]);

  const loadConversations = useCallback(
    async (silent = false) => {
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
          if (prev && data.conversations!.some((c) => c.key === prev)) return prev;
          return data.conversations![0]?.key ?? null;
        });
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Failed to load conversations";
        setErrorMessage(message);
        if (!silent) toast.error(message);
      } finally {
        if (!silent) setIsLoadingConversations(false);
      }
    },
    [navigate],
  );

  const loadMessages = useCallback(
    async (conversation: AdminConversation, silent = false) => {
      try {
        if (!silent) setIsLoadingMessages(true);
        setErrorMessage("");
        const response = await fetch(
          `/api/chats/admin/${conversation.clientId}?${buildQueryString(conversation)}`,
          { headers: { ...getAgencyAdminAuthHeaders() } },
        );
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
          (l, r) => new Date(l.createdAt).getTime() - new Date(r.createdAt).getTime(),
        );
        const nextSig = JSON.stringify(
          nextMessages.map((m) => [m.id, m.message, m.createdAt, m.senderRole]),
        );
        if (nextSig !== lastMessageSignatureRef.current) {
          lastMessageSignatureRef.current = nextSig;
          setMessages(nextMessages);
        }
        setConversations((prev) =>
          prev.map((item) =>
            item.key === conversation.key && item.unreadCount > 0
              ? { ...item, unreadCount: 0 }
              : item,
          ),
        );
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Failed to load messages";
        setErrorMessage(message);
        if (!silent) toast.error(message);
      } finally {
        if (!silent) setIsLoadingMessages(false);
      }
    },
    [navigate],
  );

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
        if (response.ok && typeof data.lastId === "number") lastId = data.lastId;
      } catch {
        // no-op
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
                setMessages((prev) =>
                  prev.some((item) => item.id === next.id) ? prev : [...prev, next],
                );
                if (next.senderRole === "client") void loadMessages(current, true);
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
    if (!scrollRef.current) return;
    scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  const sendMessage = async () => {
    if (!activeConversation || !draft.trim()) return;
    try {
      setIsSending(true);
      setErrorMessage("");
      const response = await fetch(
        `/api/chats/admin/${activeConversation.clientId}?${buildQueryString(activeConversation)}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json", ...getAgencyAdminAuthHeaders() },
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
        const next = [...prev, data.message!];
        lastMessageSignatureRef.current = JSON.stringify(
          next.map((m) => [m.id, m.message, m.createdAt, m.senderRole]),
        );
        return next;
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
      if (textareaRef.current) textareaRef.current.style.height = "auto";
      await loadConversations(true);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to send message";
      setErrorMessage(message);
      toast.error(message);
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void sendMessage();
    }
  };

  const handleSelectConversation = (key: string) => {
    setActiveConversationKey(key);
    setMobileView("chat");
  };

  const totalUnread = conversations.reduce((sum, c) => sum + c.unreadCount, 0);
  const messageGroups = groupMessagesByDate(messages);

  const headerSubtitle = activeConversation
    ? activeConversation.conversationType === "agency"
      ? `Agency thread${activeConversation.agencyName ? ` · ${activeConversation.agencyName}` : ""}`
      : "Support thread"
    : "Choose a conversation to begin";

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=DM+Serif+Display&display=swap');

        .asc-root * { font-family: 'DM Sans', sans-serif; }

        @keyframes dotPulse {
          0%, 80%, 100% { opacity: 0.25; transform: scale(0.75); }
          40% { opacity: 1; transform: scale(1); }
        }
        @keyframes fadeSlideUp {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes slideIn {
          from { opacity: 0; transform: translateX(-8px); }
          to   { opacity: 1; transform: translateX(0); }
        }

        .asc-msg-row { animation: fadeSlideUp 0.2s ease both; }
        .asc-conv-item { animation: slideIn 0.18s ease both; }

        .asc-scrollbar::-webkit-scrollbar { width: 5px; }
        .asc-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .asc-scrollbar::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.12); border-radius: 8px; }
        .asc-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(0,0,0,0.2); }

        .asc-textarea { field-sizing: content; }

        .asc-send-btn:not(:disabled):hover { transform: scale(1.05); }
        .asc-send-btn:not(:disabled):active { transform: scale(0.95); }
        .asc-send-btn { transition: transform 0.12s ease, background-color 0.15s ease, opacity 0.15s ease; }

        .asc-chat-bg {
          background-color: #f7f9f8;
          background-image:
            radial-gradient(circle at 20% 20%, rgba(16, 185, 129, 0.04) 0%, transparent 50%),
            radial-gradient(circle at 80% 80%, rgba(16, 185, 129, 0.03) 0%, transparent 50%);
        }
      `}</style>

      <div className="asc-root flex flex-col" style={{ height: "calc(100vh - 130px)", minHeight: 440 }}>

        {/* ── Page title bar ── */}
        <div className="mb-4 flex flex-shrink-0 items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600 shadow-sm">
            <MessageCircle className="h-5 w-5 text-white" />
          </div>
          <div>
            <h2 className="text-[22px] font-bold leading-tight tracking-tight text-gray-900">
              Chat Support
            </h2>
            <p className="text-[13px] text-gray-500 leading-none mt-0.5">
              Manage client conversations
            </p>
          </div>
          {totalUnread > 0 && (
            <span className="ml-1 rounded-full bg-emerald-600 px-3 py-1 text-[14px] font-bold text-white shadow-sm">
              {totalUnread} unread
            </span>
          )}
        </div>

        {/* ── Chat shell ── */}
        <div className="flex flex-1 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-md">

          {/* ── Sidebar ── */}
          <div
            className={`flex flex-col border-r border-gray-100 bg-gray-50/70 ${
              mobileView === "chat"
                ? "hidden md:flex md:w-80 md:min-w-[300px]"
                : "flex w-full md:w-80 md:min-w-[300px]"
            }`}
          >
            {/* Sidebar header */}
            <div className="flex-shrink-0 border-b border-gray-100 px-5 py-4">
              <p className="text-[16px] font-bold text-gray-900">Conversations</p>
              <p className="text-[13px] text-gray-500 mt-0.5">
                {conversations.length} thread{conversations.length !== 1 ? "s" : ""}
                {totalUnread > 0 && (
                  <span className="ml-1.5 text-emerald-700 font-semibold">
                    · {totalUnread} unread
                  </span>
                )}
              </p>
            </div>

            {/* Search */}
            <div className="flex-shrink-0 border-b border-gray-100 px-4 py-3">
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search conversations…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="h-10 w-full rounded-xl border border-gray-200 bg-white pl-10 pr-4 text-[14px] text-gray-800 outline-none placeholder:text-gray-400 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 transition-all"
                />
              </div>
            </div>

            {/* Conversation list */}
            <div className="asc-scrollbar flex-1 overflow-y-auto">
              {isLoadingConversations ? (
                <LoadingDots />
              ) : filteredConversations.length === 0 ? (
                <EmptyState label="No conversations found." icon="user" />
              ) : (
                filteredConversations.map((conv, i) => (
                  <div
                    key={conv.key}
                    className="asc-conv-item"
                    style={{ animationDelay: `${i * 0.04}s` }}
                  >
                    <ConversationItem
                      conversation={conv}
                      isActive={conv.key === activeConversationKey}
                      onClick={() => handleSelectConversation(conv.key)}
                    />
                  </div>
                ))
              )}
            </div>

            {/* Sidebar stats footer */}
            <div className="flex-shrink-0 grid grid-cols-2 gap-3 border-t border-gray-100 bg-white/80 p-4">
              <div className="rounded-xl bg-gray-50 px-4 py-3 text-center border border-gray-100">
                <p className="text-[22px] font-bold text-gray-800 leading-none">{conversations.length}</p>
                <p className="text-[12px] text-gray-500 mt-1 font-medium">Total Threads</p>
              </div>
              <div className="rounded-xl bg-emerald-50 px-4 py-3 text-center border border-emerald-100">
                <p className="text-[22px] font-bold text-emerald-700 leading-none">{totalUnread}</p>
                <p className="text-[12px] text-emerald-600 mt-1 font-medium">Unread</p>
              </div>
            </div>
          </div>

          {/* ── Message panel ── */}
          <div
            className={`flex min-w-0 flex-1 flex-col ${
              mobileView === "list" ? "hidden md:flex" : "flex"
            }`}
          >
            {/* Chat header */}
            <div className="flex flex-shrink-0 items-center gap-4 border-b border-gray-100 bg-white px-5 py-3.5 shadow-sm">
              {/* Back button — mobile only */}
              <button
                onClick={() => setMobileView("list")}
                className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-100 active:scale-95 transition-all md:hidden"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>

              {activeConversation ? (
                <>
                  <AvatarBubble name={activeConversation.clientName} tone="client" size="lg" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[18px] font-bold text-gray-900 leading-tight">
                      {activeConversation.clientName}
                    </p>
                    <p className="truncate text-[13px] text-gray-500 mt-0.5 font-medium">
                      {headerSubtitle}
                    </p>
                  </div>
                  <div className="flex-shrink-0 text-right hidden sm:block">
                    <p className="text-[15px] font-bold text-gray-800">
                      {admin?.agencyName ?? "Agency"}
                    </p>
                    <p className="text-[13px] text-gray-400 mt-0.5">{activeConversation.clientEmail}</p>
                  </div>
                </>
              ) : (
                <p className="text-[15px] text-gray-400 font-medium">{headerSubtitle}</p>
              )}
            </div>

            {/* Messages area */}
            <div
              ref={scrollRef}
              className="asc-scrollbar asc-chat-bg flex flex-1 flex-col gap-4 overflow-y-auto p-5"
            >
              {isLoadingMessages ? (
                <LoadingDots />
              ) : errorMessage ? (
                <div className="mx-auto max-w-sm rounded-xl bg-red-50 border border-red-100 px-5 py-4 text-center text-[15px] text-red-600 font-medium">
                  {errorMessage}
                </div>
              ) : !activeConversation ? (
                <EmptyState label="Select a conversation from the list to get started." />
              ) : messages.length === 0 ? (
                <EmptyState label="No messages in this thread yet." />
              ) : (
                messageGroups.map(({ label, messages: groupMsgs }) => (
                  <div key={label} className="flex flex-col gap-3.5">
                    <DateDivider label={label} />
                    {groupMsgs.map((msg) => (
                      <MessageBubble key={msg.id} message={msg} />
                    ))}
                  </div>
                ))
              )}
            </div>

            {/* Compose bar */}
            <div className="flex flex-shrink-0 items-end gap-3 border-t border-gray-100 bg-white px-5 py-4">
              <textarea
                ref={textareaRef}
                placeholder={
                  activeConversation
                    ? `Reply to ${activeConversation.clientName}…`
                    : "Select a conversation to reply…"
                }
                value={draft}
                rows={1}
                disabled={!activeConversation || isSending}
                onChange={(e) => {
                  setDraft(e.target.value);
                  e.target.style.height = "auto";
                  e.target.style.height = Math.min(e.target.scrollHeight, 130) + "px";
                }}
                onKeyDown={handleKeyDown}
                className="asc-textarea asc-scrollbar flex-1 resize-none rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-[15px] leading-relaxed text-gray-800 outline-none transition-all placeholder:text-gray-400 focus:border-emerald-400 focus:bg-white focus:ring-2 focus:ring-emerald-100 disabled:cursor-not-allowed disabled:opacity-50"
                style={{ lineHeight: 1.6, maxHeight: 130, minHeight: 48 }}
              />
              <button
                onClick={() => void sendMessage()}
                disabled={isSending || !draft.trim() || !activeConversation}
                className="asc-send-btn flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-emerald-600 text-white shadow-sm disabled:cursor-default disabled:opacity-30"
              >
                <Send className="h-5 w-5" />
              </button>
            </div>
          </div>

        </div>
      </div>
    </>
  );
};

export default AdminSupportChat;