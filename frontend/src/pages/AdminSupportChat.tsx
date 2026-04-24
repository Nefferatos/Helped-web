import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CheckCheck, MessageCircle, Search, Send, Users, ArrowLeft, Circle } from "lucide-react";
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

/* ─── Tiny sub-components ──────────────────────────────────────────────── */

type AvatarTone = "client" | "agency" | "support";

const TONE_CLASSES: Record<AvatarTone, string> = {
  client:  "bg-purple-100 text-purple-700",
  agency:  "bg-[#E1F5EE] text-[#085041]",
  support: "bg-blue-50 text-blue-700",
};

const SIZE_CLASSES: Record<"sm" | "md" | "lg", string> = {
  sm: "h-7 w-7 text-[10px]",
  md: "h-9 w-9 text-[12px]",
  lg: "h-11 w-11 text-[14px]",
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
      className={`flex flex-shrink-0 items-center justify-center rounded-full font-semibold tracking-wide ${TONE_CLASSES[tone]} ${SIZE_CLASSES[size]}`}
    >
      {initials(name)}
    </div>
  );
}

function UnreadBadge({ count }: { count: number }) {
  if (!count) return null;
  return (
    <span className="inline-flex min-w-[18px] items-center justify-center rounded-full bg-[#0D6E56] px-1.5 py-0.5 text-[10px] font-semibold leading-none text-white">
      {count > 99 ? "99+" : count}
    </span>
  );
}

function LoadingDots() {
  return (
    <div className="flex items-center gap-1.5 px-4 py-5">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="h-1.5 w-1.5 rounded-full bg-gray-300"
          style={{ animation: `dotPulse 1.2s ease-in-out ${i * 0.2}s infinite` }}
        />
      ))}
    </div>
  );
}

function EmptyState({ label, icon }: { label: string; icon?: "message" | "user" }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 p-10">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#E1F5EE]">
        {icon === "user" ? (
          <Users className="h-5 w-5 text-[#0D6E56]" />
        ) : (
          <MessageCircle className="h-5 w-5 text-[#0D6E56]" />
        )}
      </div>
      <p className="max-w-[200px] text-center text-[13px] text-gray-400">{label}</p>
    </div>
  );
}

function DateDivider({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 my-1">
      <div className="h-px flex-1 bg-gray-100" />
      <span className="whitespace-nowrap text-[11px] text-gray-400">{label}</span>
      <div className="h-px flex-1 bg-gray-100" />
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
      className={`flex w-full items-start gap-3 border-b border-gray-100 px-3 py-3 text-left transition-colors last:border-0 hover:bg-gray-50 ${
        isActive ? "border-l-2 border-l-[#0D6E56] bg-white" : "border-l-2 border-l-transparent"
      }`}
    >
      <AvatarBubble name={conversation.clientName} tone="client" size="md" />
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <p
            className={`truncate text-[13px] ${
              isActive ? "font-semibold text-gray-900" : "font-medium text-gray-800"
            }`}
          >
            {conversation.clientName}
          </p>
          <span className="flex-shrink-0 text-[10px] text-gray-400">
            {formatTime(conversation.lastMessageAt)}
          </span>
        </div>
        <p className="truncate text-[11px] text-gray-400">{conversation.clientEmail}</p>
        {conversation.lastMessage && (
          <p className="mt-0.5 truncate text-[11px] text-gray-400 opacity-80">
            {conversation.lastMessage}
          </p>
        )}
      </div>
      <div className="flex flex-shrink-0 flex-col items-end gap-1">
        <UnreadBadge count={conversation.unreadCount} />
        {conversation.conversationType === "agency" && conversation.agencyName && (
          <span className="max-w-[64px] truncate rounded bg-[#E1F5EE] px-1.5 py-0.5 text-[9px] font-medium text-[#085041]">
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
      className={`asc-msg-row flex items-end gap-2 ${isOwn ? "ml-auto flex-row-reverse" : ""}`}
      style={{ maxWidth: "74%" }}
    >
      <AvatarBubble name={message.senderName} tone={tone} size="sm" />
      <div className="min-w-0">
        {!isOwn && (
          <p className="mb-1 pl-0.5 text-[11px] text-gray-400">{message.senderName}</p>
        )}
        <div
          className={`rounded-2xl px-3.5 py-2.5 text-[13px] leading-relaxed ${
            isOwn
              ? "rounded-br-sm bg-[#E1F5EE] text-[#04342C]"
              : "rounded-bl-sm bg-gray-100 text-gray-800"
          }`}
        >
          {message.message}
        </div>
        <div
          className={`mt-1 flex items-center gap-1 text-[10px] text-gray-400 ${
            isOwn ? "justify-end pr-0.5" : "pl-0.5"
          }`}
        >
          {formatTime(message.createdAt)}
          {isOwn && <CheckCheck className="h-3 w-3 text-[#0D6E56]" />}
        </div>
      </div>
    </div>
  );
}

/* ─── Main component ───────────────────────────────────────────────────── */

const AdminSupportChat = () => {
  const navigate = useNavigate();

  // Mobile: show conversation list OR message panel (not both)
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
        @keyframes dotPulse {
          0%, 80%, 100% { opacity: 0.2; transform: scale(0.8); }
          40% { opacity: 1; transform: scale(1); }
        }
        @keyframes fadeSlideUp {
          from { opacity: 0; transform: translateY(5px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .asc-msg-row { animation: fadeSlideUp 0.18s ease both; }
        .asc-scrollbar::-webkit-scrollbar { width: 4px; }
        .asc-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .asc-scrollbar::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.1); border-radius: 4px; }
        .asc-textarea { field-sizing: content; }
      `}</style>

      <div className="flex flex-col" style={{ height: "calc(100vh - 130px)", minHeight: 400 }}>

        {/* ── Page title bar ── */}
        <div className="mb-3 flex flex-shrink-0 items-center gap-2.5">
          <MessageCircle className="h-[18px] w-[18px] text-[#0D6E56]" />
          <h2 className="text-[18px] font-bold tracking-tight text-gray-900">Chat Support</h2>
          {totalUnread > 0 && (
            <span className="rounded-full bg-[#0D6E56] px-2.5 py-0.5 text-[11px] font-semibold text-white">
              {totalUnread} unread
            </span>
          )}
        </div>

        {/* ── Chat shell ── */}
        <div className="flex flex-1 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">

          {/* ── Sidebar / Conversation List ── */}
          <div
            className={`flex flex-col border-r border-gray-100 bg-gray-50/60 ${
              // On mobile: full width when showing list, hidden when showing chat
              mobileView === "chat"
                ? "hidden md:flex md:w-72 md:min-w-[272px]"
                : "flex w-full md:w-72 md:min-w-[272px]"
            }`}
          >
            {/* Sidebar header */}
            <div className="flex-shrink-0 border-b border-gray-100 px-4 py-3">
              <p className="text-[13px] font-semibold text-gray-800">Conversations</p>
              <p className="text-[11px] text-gray-400">
                {conversations.length} thread{conversations.length !== 1 ? "s" : ""}
                {totalUnread > 0 && ` · ${totalUnread} unread`}
              </p>
            </div>

            {/* Search */}
            <div className="flex-shrink-0 border-b border-gray-100 px-3 py-2.5">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search conversations…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="h-8 w-full rounded-lg border border-gray-200 bg-white pl-8 pr-3 text-[12px] text-gray-800 outline-none placeholder:text-gray-400 focus:border-[#0D6E56]/50 focus:ring-0 transition-colors"
                />
              </div>
            </div>

            {/* List */}
            <div className="asc-scrollbar flex-1 overflow-y-auto">
              {isLoadingConversations ? (
                <LoadingDots />
              ) : filteredConversations.length === 0 ? (
                <EmptyState label="No conversations found." icon="user" />
              ) : (
                filteredConversations.map((conv) => (
                  <ConversationItem
                    key={conv.key}
                    conversation={conv}
                    isActive={conv.key === activeConversationKey}
                    onClick={() => handleSelectConversation(conv.key)}
                  />
                ))
              )}
            </div>

            {/* Sidebar footer stats */}
            <div className="flex-shrink-0 grid grid-cols-2 gap-2 border-t border-gray-100 bg-white p-3">
              <div className="rounded-lg bg-gray-50 px-3 py-2 text-center">
                <p className="text-[17px] font-bold text-gray-900">{conversations.length}</p>
                <p className="text-[10px] text-gray-400">Threads</p>
              </div>
              <div className="rounded-lg bg-gray-50 px-3 py-2 text-center">
                <p className="text-[17px] font-bold text-[#0D6E56]">{totalUnread}</p>
                <p className="text-[10px] text-gray-400">Unread</p>
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
            <div className="flex flex-shrink-0 items-center gap-3 border-b border-gray-100 bg-white px-4 py-3">
              {/* Back button — mobile only */}
              <button
                onClick={() => setMobileView("list")}
                className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 md:hidden"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>

              {activeConversation ? (
                <>
                  <AvatarBubble name={activeConversation.clientName} tone="client" size="md" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[14px] font-semibold text-gray-900">
                      {activeConversation.clientName}
                    </p>
                    <p className="truncate text-[11px] text-gray-400">{headerSubtitle}</p>
                  </div>
                  <div className="flex-shrink-0 text-right">
                    <p className="text-[12px] font-medium text-gray-700">
                      {admin?.agencyName ?? "Agency"}
                    </p>
                    <p className="text-[11px] text-gray-400">{activeConversation.clientEmail}</p>
                  </div>
                </>
              ) : (
                <p className="text-[13px] text-gray-400">{headerSubtitle}</p>
              )}
            </div>

            {/* Messages area */}
            <div
              ref={scrollRef}
              className="asc-scrollbar flex flex-1 flex-col gap-3 overflow-y-auto p-4"
            >
              {isLoadingMessages ? (
                <LoadingDots />
              ) : errorMessage ? (
                <div className="mx-auto max-w-xs rounded-lg bg-red-50 px-4 py-3 text-center text-[13px] text-red-600">
                  {errorMessage}
                </div>
              ) : !activeConversation ? (
                <EmptyState label="Select a conversation from the left to get started." />
              ) : messages.length === 0 ? (
                <EmptyState label="No messages in this thread yet." />
              ) : (
                messageGroups.map(({ label, messages: groupMsgs }) => (
                  <div key={label} className="flex flex-col gap-3">
                    <DateDivider label={label} />
                    {groupMsgs.map((msg) => (
                      <MessageBubble key={msg.id} message={msg} />
                    ))}
                  </div>
                ))
              )}
            </div>

            {/* Compose bar */}
            <div className="flex flex-shrink-0 items-end gap-2.5 border-t border-gray-100 bg-white px-4 py-3">
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
                  e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px";
                }}
                onKeyDown={handleKeyDown}
                className="asc-textarea asc-scrollbar flex-1 resize-none rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-[13px] text-gray-800 outline-none transition-colors placeholder:text-gray-400 focus:border-[#0D6E56]/50 focus:bg-white disabled:cursor-not-allowed disabled:opacity-50"
                style={{ lineHeight: 1.5, maxHeight: 120, minHeight: 40 }}
              />
              <button
                onClick={() => void sendMessage()}
                disabled={isSending || !draft.trim() || !activeConversation}
                className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-[#0D6E56] text-white transition-all hover:bg-[#0a5c47] active:scale-95 disabled:cursor-default disabled:opacity-30"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default AdminSupportChat;