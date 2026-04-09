import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CheckCheck, MessageCircle, Search, Send, Users } from "lucide-react";
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


const THEME_STYLE = `
@keyframes dotPulse {
  0%, 80%, 100% { opacity: 0.2; transform: scale(0.8); }
  40% { opacity: 1; transform: scale(1); }
}
@keyframes fadeSlideUp {
  from { opacity: 0; transform: translateY(6px); }
  to   { opacity: 1; transform: translateY(0); }
}

:root {
  --asc-accent: #1D9E75;
  --asc-accent-hover: #0F6E56;

  --asc-avatar-client-bg:  #EEEDFE;
  --asc-avatar-client-fg:  #3C3489;
  --asc-avatar-agency-bg:  #E1F5EE;
  --asc-avatar-agency-fg:  #085041;
  --asc-avatar-support-bg: #E6F1FB;
  --asc-avatar-support-fg: #0C447C;

  --asc-badge-bg: #1D9E75;
  --asc-badge-fg: #fff;

  --asc-bubble-own-bg: #E1F5EE;
  --asc-bubble-own-fg: #04342C;
  --asc-bubble-them-bg: var(--color-background-secondary, #F5F5F3);

  --asc-conv-active-bg: var(--color-background-primary, #fff);
  --asc-conv-hover-bg:  rgba(0,0,0,0.03);
}

@media (prefers-color-scheme: dark) {
  :root {
    --asc-accent: #5DCAA5;
    --asc-accent-hover: #9FE1CB;

    --asc-avatar-client-bg:  #26215C;
    --asc-avatar-client-fg:  #CECBF6;
    --asc-avatar-agency-bg:  #04342C;
    --asc-avatar-agency-fg:  #9FE1CB;
    --asc-avatar-support-bg: #042C53;
    --asc-avatar-support-fg: #B5D4F4;

    --asc-badge-bg: #5DCAA5;
    --asc-badge-fg: #04342C;

    --asc-bubble-own-bg: #085041;
    --asc-bubble-own-fg: #E1F5EE;
  }
}

.asc-search-input {
  width: 100%;
  background: var(--color-background-primary, #fff);
  border: 0.5px solid var(--color-border-secondary, rgba(0,0,0,0.18));
  border-radius: 8px;
  padding: 7px 10px 7px 30px;
  font-size: 12px;
  color: var(--color-text-primary);
  outline: none;
  transition: border-color 0.15s;
  font-family: inherit;
}
.asc-search-input:focus { border-color: var(--asc-accent); }
.asc-search-input::placeholder { color: var(--color-text-tertiary); }

.asc-textarea {
  width: 100%;
  background: var(--color-background-secondary, #F5F5F3);
  border: 0.5px solid var(--color-border-secondary, rgba(0,0,0,0.18));
  border-radius: 20px;
  padding: 9px 14px;
  font-size: 13px;
  font-family: inherit;
  color: var(--color-text-primary);
  resize: none;
  outline: none;
  line-height: 1.5;
  max-height: 120px;
  overflow-y: auto;
  transition: border-color 0.15s;
}
.asc-textarea:focus { border-color: var(--asc-accent); }
.asc-textarea::placeholder { color: var(--color-text-tertiary); }
.asc-textarea:disabled { opacity: 0.5; cursor: not-allowed; }

.asc-send-btn {
  width: 36px;
  height: 36px;
  min-width: 36px;
  border-radius: 50%;
  background: var(--asc-accent);
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: opacity 0.15s, transform 0.1s;
  flex-shrink: 0;
  align-self: flex-end;
}
.asc-send-btn:hover:not(:disabled) { opacity: 0.88; }
.asc-send-btn:active:not(:disabled) { transform: scale(0.95); }
.asc-send-btn:disabled { opacity: 0.35; cursor: default; }

.asc-conv-btn {
  width: 100%;
  display: flex;
  gap: 10px;
  padding: 11px 14px;
  border: none;
  border-bottom: 0.5px solid var(--color-border-tertiary, rgba(0,0,0,0.08));
  cursor: pointer;
  text-align: left;
  align-items: flex-start;
  transition: background 0.12s;
  background: transparent;
}
.asc-conv-btn:hover { background: var(--asc-conv-hover-bg); }
.asc-conv-btn.active {
  background: var(--asc-conv-active-bg);
  border-left: 2px solid var(--asc-accent);
}
.asc-conv-btn:not(.active) { border-left: 2px solid transparent; }

.asc-msg-row { animation: fadeSlideUp 0.18s ease both; }
`;

function injectTheme() {
  if (typeof document !== "undefined" && !document.getElementById("asc-theme")) {
    const el = document.createElement("style");
    el.id = "asc-theme";
    el.textContent = THEME_STYLE;
    document.head.appendChild(el);
  }
}


type AvatarTone = "client" | "agency" | "support";

function Avatar({
  name,
  tone = "client",
  size = "md",
}: {
  name: string;
  tone?: AvatarTone;
  size?: "sm" | "md" | "lg";
}) {
  const px = { sm: 28, md: 36, lg: 44 }[size];
  const colors: Record<AvatarTone, { bg: string; color: string }> = {
    client:  { bg: "var(--asc-avatar-client-bg)",  color: "var(--asc-avatar-client-fg)" },
    agency:  { bg: "var(--asc-avatar-agency-bg)",  color: "var(--asc-avatar-agency-fg)" },
    support: { bg: "var(--asc-avatar-support-bg)", color: "var(--asc-avatar-support-fg)" },
  };
  return (
    <div
      style={{
        width: px,
        height: px,
        minWidth: px,
        borderRadius: "50%",
        background: colors[tone].bg,
        color: colors[tone].color,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: size === "sm" ? 10 : size === "md" ? 12 : 14,
        fontWeight: 600,
        letterSpacing: "0.02em",
        flexShrink: 0,
      }}
    >
      {initials(name)}
    </div>
  );
}

function UnreadBadge({ count }: { count: number }) {
  if (!count) return null;
  return (
    <span
      style={{
        background: "var(--asc-badge-bg)",
        color: "var(--asc-badge-fg)",
        fontSize: 10,
        fontWeight: 600,
        borderRadius: 9999,
        padding: "2px 6px",
        minWidth: 18,
        textAlign: "center",
        lineHeight: "16px",
        display: "inline-block",
      }}
    >
      {count > 99 ? "99+" : count}
    </span>
  );
}

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
    <button className={`asc-conv-btn${isActive ? " active" : ""}`} onClick={onClick}>
      <Avatar name={conversation.clientName} tone="client" size="md" />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: 13,
            fontWeight: isActive ? 600 : 500,
            color: "var(--color-text-primary)",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {conversation.clientName}
        </div>
        <div
          style={{
            fontSize: 11,
            color: "var(--color-text-tertiary)",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
            marginTop: 1,
          }}
        >
          {conversation.clientEmail}
        </div>
        {conversation.lastMessage && (
          <div
            style={{
              fontSize: 11,
              color: "var(--color-text-tertiary)",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
              marginTop: 2,
              opacity: 0.8,
            }}
          >
            {conversation.lastMessage}
          </div>
        )}
      </div>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4, flexShrink: 0 }}>
        <span style={{ fontSize: 10, color: "var(--color-text-tertiary)" }}>
          {formatTime(conversation.lastMessageAt)}
        </span>
        <UnreadBadge count={conversation.unreadCount} />
        {conversation.conversationType === "agency" && conversation.agencyName && (
          <span
            style={{
              fontSize: 10,
              background: "var(--asc-avatar-agency-bg)",
              color: "var(--asc-avatar-agency-fg)",
              borderRadius: 4,
              padding: "1px 5px",
              fontWeight: 500,
              whiteSpace: "nowrap",
              maxWidth: 72,
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {conversation.agencyName}
          </span>
        )}
      </div>
    </button>
  );
}

function MessageBubble({ message }: { message: ChatMessage }) {
  const isOwn = message.senderRole === "agency";
  const tone: AvatarTone = isOwn ? "agency" : message.senderRole === "client" ? "client" : "support";

  return (
    <div
      style={{
        display: "flex",
        gap: 8,
        maxWidth: "76%",
        alignItems: "flex-end",
        marginLeft: isOwn ? "auto" : undefined,
        flexDirection: isOwn ? "row-reverse" : "row",
      }}
    >
      <Avatar name={message.senderName} tone={tone} size="sm" />
      <div>
        {!isOwn && (
          <div style={{ fontSize: 11, color: "var(--color-text-tertiary)", marginBottom: 3, paddingLeft: 2 }}>
            {message.senderName}
          </div>
        )}
        <div
          style={{
            padding: "9px 13px",
            borderRadius: 14,
            borderBottomLeftRadius: isOwn ? 14 : 4,
            borderBottomRightRadius: isOwn ? 4 : 14,
            fontSize: 13,
            lineHeight: 1.55,
            background: isOwn ? "var(--asc-bubble-own-bg)" : "var(--asc-bubble-them-bg)",
            color: isOwn ? "var(--asc-bubble-own-fg)" : "var(--color-text-primary)",
          }}
        >
          {message.message}
        </div>
        <div
          style={{
            fontSize: 10,
            color: "var(--color-text-tertiary)",
            marginTop: 3,
            paddingLeft: 2,
            textAlign: isOwn ? "right" : "left",
            display: "flex",
            alignItems: "center",
            gap: 4,
            justifyContent: isOwn ? "flex-end" : "flex-start",
          }}
        >
          {formatTime(message.createdAt)}
          {isOwn && <CheckCheck size={12} color="var(--asc-accent)" />}
        </div>
      </div>
    </div>
  );
}

function DateDivider({ label }: { label: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "4px 0" }}>
      <div style={{ flex: 1, height: "0.5px", background: "var(--color-border-tertiary, rgba(0,0,0,0.08))" }} />
      <span style={{ fontSize: 11, color: "var(--color-text-tertiary)", whiteSpace: "nowrap" }}>{label}</span>
      <div style={{ flex: 1, height: "0.5px", background: "var(--color-border-tertiary, rgba(0,0,0,0.08))" }} />
    </div>
  );
}

function LoadingDots() {
  return (
    <div style={{ display: "flex", gap: 5, padding: "16px 18px" }}>
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          style={{
            width: 6,
            height: 6,
            borderRadius: "50%",
            background: "var(--color-text-tertiary)",
            animation: `dotPulse 1.2s ease-in-out ${i * 0.2}s infinite`,
          }}
        />
      ))}
    </div>
  );
}

function EmptyState({ label, icon }: { label: string; icon?: "message" | "user" }) {
  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 10,
        padding: 40,
      }}
    >
      <div
        style={{
          width: 48,
          height: 48,
          borderRadius: "50%",
          background: "var(--asc-avatar-agency-bg)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {icon === "user"
          ? <Users size={20} color="var(--asc-avatar-agency-fg)" />
          : <MessageCircle size={20} color="var(--asc-avatar-agency-fg)" />}
      </div>
      <p style={{ fontSize: 13, color: "var(--color-text-tertiary)", textAlign: "center", maxWidth: 200 }}>
        {label}
      </p>
    </div>
  );
}


const AdminSupportChat = () => {
  injectTheme();

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
        const message = error instanceof Error ? error.message : "Failed to load conversations";
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
        const message = error instanceof Error ? error.message : "Failed to load messages";
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
      } catch {}
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
            ? { ...item, lastMessage: data.message!.message, lastMessageAt: data.message!.createdAt, unreadCount: 0 }
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

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void sendMessage();
    }
  };

  const totalUnread = conversations.reduce((sum, c) => sum + c.unreadCount, 0);
  const messageGroups = groupMessagesByDate(messages);

  const headerSubtitle = activeConversation
    ? activeConversation.conversationType === "agency"
      ? `Agency thread${activeConversation.agencyName ? ` · ${activeConversation.agencyName}` : ""}`
      : "Support thread"
    : "Choose a conversation to begin";


  return (
    <div className="page-container">
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
        <MessageCircle size={18} color="var(--asc-accent)" />
        <h1 style={{ fontSize: 22, fontWeight: 500, color: "var(--color-text-primary)", margin: 0 }}>
          User chat desk
        </h1>
        {totalUnread > 0 && (
          <span
            style={{
              background: "var(--asc-badge-bg)",
              color: "var(--asc-badge-fg)",
              fontSize: 11,
              fontWeight: 600,
              borderRadius: 9999,
              padding: "2px 8px",
            }}
          >
            {totalUnread} unread
          </span>
        )}
      </div>

      <div
        style={{
          display: "flex",
          height: 660,
          border: "0.5px solid var(--color-border-tertiary, rgba(0,0,0,0.08))",
          borderRadius: 14,
          overflow: "hidden",
          background: "var(--color-background-primary)",
          boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
        }}
      >
        <div
          style={{
            width: 288,
            minWidth: 288,
            display: "flex",
            flexDirection: "column",
            borderRight: "0.5px solid var(--color-border-tertiary, rgba(0,0,0,0.08))",
            background: "var(--color-background-secondary, #F5F5F3)",
          }}
        >
          <div
            style={{
              padding: "14px 14px 12px",
              borderBottom: "0.5px solid var(--color-border-tertiary, rgba(0,0,0,0.08))",
            }}
          >
            <p style={{ fontSize: 13, fontWeight: 500, color: "var(--color-text-primary)", marginBottom: 2 }}>
              Live user conversations
            </p>
            <p style={{ fontSize: 11, color: "var(--color-text-tertiary)", lineHeight: 1.4 }}>
              Support and agency-specific chats in one inbox.
            </p>
          </div>

          <div
            style={{
              padding: "10px 12px",
              borderBottom: "0.5px solid var(--color-border-tertiary, rgba(0,0,0,0.08))",
              position: "relative",
            }}
          >
            <Search
              size={13}
              color="var(--color-text-tertiary)"
              style={{ position: "absolute", left: 22, top: "50%", transform: "translateY(-50%)" }}
            />
            <input
              className="asc-search-input"
              type="text"
              placeholder="Search by name, email, or message"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div style={{ flex: 1, overflowY: "auto" }}>
            {isLoadingConversations ? (
              <LoadingDots />
            ) : filteredConversations.length === 0 ? (
              <EmptyState label="No user conversations yet." icon="user" />
            ) : (
              filteredConversations.map((conv) => (
                <ConversationItem
                  key={conv.key}
                  conversation={conv}
                  isActive={conv.key === activeConversationKey}
                  onClick={() => setActiveConversationKey(conv.key)}
                />
              ))
            )}
          </div>

          <div
            style={{
              display: "flex",
              borderTop: "0.5px solid var(--color-border-tertiary, rgba(0,0,0,0.08))",
              padding: "10px 14px",
              gap: 8,
            }}
          >
            {[
              { label: "Open threads", value: conversations.length },
              { label: "Unread", value: totalUnread },
              { label: "Active user", value: activeConversation?.clientName ?? "None" },
            ].map(({ label, value }) => (
              <div
                key={label}
                style={{
                  flex: 1,
                  textAlign: "center",
                  background: "var(--color-background-primary)",
                  borderRadius: 8,
                  padding: "6px 4px",
                }}
              >
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 500,
                    color: "var(--color-text-primary)",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {value}
                </div>
                <div style={{ fontSize: 10, color: "var(--color-text-tertiary)", marginTop: 1 }}>
                  {label}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
          <div
            style={{
              padding: "12px 18px",
              borderBottom: "0.5px solid var(--color-border-tertiary, rgba(0,0,0,0.08))",
              display: "flex",
              alignItems: "center",
              gap: 12,
            }}
          >
            {activeConversation ? (
              <>
                <Avatar name={activeConversation.clientName} tone="client" size="md" />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 500, color: "var(--color-text-primary)" }}>
                    {activeConversation.clientName}
                  </div>
                  <div style={{ fontSize: 11, color: "var(--color-text-tertiary)" }}>
                    {headerSubtitle}
                  </div>
                </div>
                <div style={{ textAlign: "right", flexShrink: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 500, color: "var(--color-text-primary)" }}>
                    {admin?.agencyName ?? "Agency"}
                  </div>
                  <div style={{ fontSize: 11, color: "var(--color-text-tertiary)" }}>
                    {activeConversation.clientEmail}
                  </div>
                </div>
              </>
            ) : (
              <div style={{ fontSize: 13, color: "var(--color-text-tertiary)" }}>
                {headerSubtitle}
              </div>
            )}
          </div>

          <div
            ref={scrollRef}
            style={{
              flex: 1,
              overflowY: "auto",
              padding: "16px 18px",
              display: "flex",
              flexDirection: "column",
              gap: 10,
            }}
          >
            {isLoadingMessages ? (
              <LoadingDots />
            ) : errorMessage ? (
              <div
                style={{
                  margin: "auto",
                  padding: "12px 16px",
                  background: "var(--color-background-danger, #FCEBEB)",
                  color: "var(--color-text-danger, #A32D2D)",
                  borderRadius: 8,
                  fontSize: 13,
                  maxWidth: 320,
                  textAlign: "center",
                }}
              >
                {errorMessage}
              </div>
            ) : !activeConversation ? (
              <EmptyState label="Select a conversation from the left to get started." />
            ) : messages.length === 0 ? (
              <EmptyState label="No messages in this thread yet." />
            ) : (
              messageGroups.map(({ label, messages: groupMsgs }) => (
                <div key={label} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  <DateDivider label={label} />
                  {groupMsgs.map((msg) => (
                    <div key={msg.id} className="asc-msg-row">
                      <MessageBubble message={msg} />
                    </div>
                  ))}
                </div>
              ))
            )}
          </div>

          <div
            style={{
              padding: "10px 16px 12px",
              borderTop: "0.5px solid var(--color-border-tertiary, rgba(0,0,0,0.08))",
              display: "flex",
              alignItems: "flex-end",
              gap: 10,
            }}
          >
            <textarea
              className="asc-textarea"
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
            />
            <button
              className="asc-send-btn"
              onClick={() => void sendMessage()}
              disabled={isSending || !draft.trim() || !activeConversation}
              title="Send message"
            >
              <Send size={15} color="#fff" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminSupportChat;