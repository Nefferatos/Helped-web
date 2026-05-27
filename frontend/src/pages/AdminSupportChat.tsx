import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  CheckCheck,
  CheckCircle2,
  MessageCircle,
  Search,
  Send,
  Users,
  ArrowLeft,
  Inbox,
  SlidersHorizontal,
  ChevronDown,
  Zap,
  Clock,
  Star,
  Filter,
  RefreshCw,
  Copy,
  Tag,
  AlertCircle,
  UserCheck,
  ShieldAlert,
  CircleDot,
} from "lucide-react";
import { toast } from "@/components/ui/sonner";
import { useNavigate, useSearchParams } from "react-router-dom";
import { adminPath } from "@/lib/routes";
import { readSafeJson } from "@/lib/safeJson";
import {
  clearAgencyAdminAuth,
  getAgencyAdminAuthHeaders,
  getAgencyAdminToken,
  getStoredAgencyAdmin,
} from "@/lib/agencyAdminAuth";
import type {
  AdminConversation,
  ChatMessage,
  ConversationType,
  SupportConversationStatus,
  SupportInquiryCategory,
  SupportPriority,
} from "@/lib/chat";
import { streamSse } from "@/lib/sse";

/* ─── Types ─────────────────────────────────────────────────────────────── */

type SortOption = "newest" | "oldest" | "unread" | "name";
type FilterOption = "all" | "unread" | "support" | "agency";
type StatusFilter = "ALL" | SupportConversationStatus;

/* ─── Quick reply templates ─────────────────────────────────────────────── */

const QUICK_REPLIES = [
  { label: "Acknowledged", text: "Thank you for reaching out. We have received your message and will get back to you shortly." },
  { label: "Processing", text: "We are currently processing your request. We will update you within 1–2 business days." },
  { label: "Need info", text: "To assist you better, could you please provide more details about your request?" },
  { label: "Resolved", text: "We are glad we could help! Your request has been resolved. Please don't hesitate to reach out if you need anything else." },
  { label: "Follow-up", text: "Following up on our previous conversation — has your concern been fully addressed?" },
];

/* ─── Helpers ───────────────────────────────────────────────────────────── */

function initials(name: string) {
  return name.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase();
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

function compactWhitespace(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function buildEnquiryPreview(message: string) {
  const normalized = compactWhitespace(message);
  if (!normalized) return "Opened from enquiries page";
  return normalized.length > 120 ? `${normalized.slice(0, 119)}...` : normalized;
}

function sanitizeConversationPreview(message: string, senderRole?: ChatMessage["senderRole"]) {
  const normalized = compactWhitespace(message);
  if (!normalized) return "No messages yet";

  if (
    senderRole === "agency" &&
    /(thank you for reaching out|thank you for your message|we are reviewing your request|we will get back to you shortly|how can we help you today)/i.test(normalized)
  ) {
    return "Professional follow-up sent";
  }

  if (senderRole === "agency" && /(tracked case|support team|logged with our support team)/i.test(normalized)) {
    return "Support acknowledgement sent";
  }

  return normalized.length > 96 ? `${normalized.slice(0, 95)}...` : normalized;
}

function getConversationTypeLabel(conversationType: ConversationType) {
  return conversationType === "agency" ? "Agency" : "Support";
}

function getStatusTone(status?: SupportConversationStatus) {
  switch (status) {
    case "OPEN":
      return { label: "Open", bg: "#eff6ff", fg: "#1d4ed8", border: "#bfdbfe" };
    case "WAITING_CLIENT":
      return { label: "Waiting Client", bg: "#fff7ed", fg: "#c2410c", border: "#fdba74" };
    case "WAITING_SUPPORT":
      return { label: "Waiting Support", bg: "#fef3c7", fg: "#b45309", border: "#fcd34d" };
    case "RESOLVED":
      return { label: "Resolved", bg: "#ecfdf5", fg: "#047857", border: "#86efac" };
    case "CLOSED":
      return { label: "Closed", bg: "#f3f4f6", fg: "#4b5563", border: "#d1d5db" };
    default:
      return { label: "Open", bg: "#eff6ff", fg: "#1d4ed8", border: "#bfdbfe" };
  }
}

function getPriorityTone(priority?: SupportPriority) {
  switch (priority) {
    case "URGENT":
      return { bg: "#fef2f2", fg: "#b91c1c", border: "#fca5a5" };
    case "HIGH":
      return { bg: "#fff7ed", fg: "#c2410c", border: "#fdba74" };
    case "MEDIUM":
      return { bg: "#fffbeb", fg: "#b45309", border: "#fcd34d" };
    default:
      return { bg: "#f0fdf4", fg: "#166534", border: "#86efac" };
  }
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

function sortConversations(conversations: AdminConversation[], sort: SortOption): AdminConversation[] {
  const sorted = [...conversations];
  switch (sort) {
    case "newest":
      return sorted.sort((a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime());
    case "oldest":
      return sorted.sort((a, b) => new Date(a.lastMessageAt).getTime() - new Date(b.lastMessageAt).getTime());
    case "unread":
      return sorted.sort((a, b) => b.unreadCount - a.unreadCount || new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime());
    case "name":
      return sorted.sort((a, b) => a.clientName.localeCompare(b.clientName));
    default:
      return sorted;
  }
}

/* ─── Sub-components ────────────────────────────────────────────────────── */

type AvatarTone = "client" | "agency" | "support";

const TONE_CLASSES: Record<AvatarTone, string> = {
  client: "bg-violet-100 text-violet-800",
  agency: "bg-blue-100 text-blue-800",
  support: "bg-sky-100 text-sky-800",
};

const SIZE_CLASSES: Record<"sm" | "md" | "lg", string> = {
  sm: "h-10 w-10 text-[15px]",
  md: "h-12 w-12 text-[17px]",
  lg: "h-16 w-16 text-[20px]",
};

function AvatarBubble({
  name,
  imageUrl,
  tone = "client",
  size = "md",
}: {
  name: string;
  imageUrl?: string;
  tone?: AvatarTone;
  size?: "sm" | "md" | "lg";
}) {
  return (
    <div className={`flex flex-shrink-0 items-center justify-center rounded-full font-bold tracking-wide ${TONE_CLASSES[tone]} ${SIZE_CLASSES[size]}`}>
      {imageUrl ? (
        <img src={imageUrl} alt={name} className="h-full w-full rounded-full object-cover" />
      ) : (
        initials(name)
      )}
    </div>
  );
}

function UnreadBadge({ count }: { count: number }) {
  if (!count) return null;
  return (
    <span className="inline-flex min-w-[22px] items-center justify-center rounded-full px-2 py-0.5 text-[12px] font-bold leading-none text-white shadow-sm" style={{ background: "var(--msn-unread)" }}>
      {count > 99 ? "99+" : count}
    </span>
  );
}

function LoadingDots() {
  return (
    <div className="flex items-center justify-center gap-1.5 px-4 py-10">
      {[0, 1, 2].map((i) => (
        <div key={i} className="h-2.5 w-2.5 rounded-full" style={{ background: "var(--msn-blue)", animation: `dotPulse 1.2s ease-in-out ${i * 0.2}s infinite` }} />
      ))}
    </div>
  );
}

function EmptyState({ label, icon }: { label: string; icon?: "message" | "user" }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 p-10">
      <div className="flex h-16 w-16 items-center justify-center rounded-full" style={{ background: "var(--msn-blue-light)" }}>
        {icon === "user" ? <Users className="h-8 w-8" style={{ color: "var(--msn-blue)" }} /> : <Inbox className="h-8 w-8" style={{ color: "var(--msn-blue)" }} />}
      </div>
      <p className="max-w-[240px] text-center text-[14px] leading-relaxed font-medium" style={{ color: "var(--msn-text-secondary)" }}>{label}</p>
    </div>
  );
}

function DateDivider({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 my-2">
      <div className="h-px flex-1" style={{ background: "var(--msn-divider)" }} />
      <span className="whitespace-nowrap rounded-full px-3 py-1 text-[12px] font-semibold" style={{ background: "#e4e6eb", color: "var(--msn-text-secondary)" }}>{label}</span>
      <div className="h-px flex-1" style={{ background: "var(--msn-divider)" }} />
    </div>
  );
}

/* ─── AI Status Banner ───────────────────────────────────────────────────── */

/* function AiStatusBanner({ status, onRetry }: { status: AiStatus; onRetry: () => void }) {
  if (status === "online") {
    return (
      <div className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-semibold" style={{ background: "#e7f8ee", color: "#1a7a3c", border: "1px solid #b8f0cc" }}>
        <div className="h-2 w-2 rounded-full" style={{ background: "var(--msn-online)" }} />
        AI suggestions active
      </div>
    );
  }
  if (status === "offline") {
    return (
      <div className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px]" style={{ background: "#fff8e1", border: "1px solid #ffe082" }}>
        <AlertCircle className="h-3 w-3 flex-shrink-0" style={{ color: "#f59e0b" }} />
        <span className="font-semibold" style={{ color: "#92400e" }}>AI offline – fallback mode</span>
        <button type="button" onClick={onRetry} className="ml-1 flex items-center gap-0.5 font-semibold transition-opacity hover:opacity-70" style={{ color: "#b45309" }}>
          <RefreshCw className="h-2.5 w-2.5" /> Retry
        </button>
      </div>
    );
  }
  return null;
} */

/* ─── Quick Reply Panel ─────────────────────────────────────────────────── */

function QuickReplyPanel({ onSelect }: { onSelect: (text: string) => void }) {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen((v) => !v)}
        className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-semibold transition-colors hover:opacity-80"
        style={{ background: "var(--msn-blue-light)", color: "var(--msn-blue)", border: "1px solid #c2deff" }}
      >
        <Zap className="h-3 w-3" style={{ color: "var(--msn-blue)" }} />
        Quick replies
        <ChevronDown className={`h-3 w-3 transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </button>
      {isOpen && (
        <div className="absolute bottom-full left-0 mb-2 z-10 w-80 rounded-2xl overflow-hidden shadow-2xl" style={{ border: "1px solid var(--msn-divider)", background: "#fff" }}>
          <div className="px-4 py-2.5" style={{ borderBottom: "1px solid var(--msn-divider)" }}>
            <p className="text-[12px] font-bold" style={{ color: "var(--msn-text-secondary)" }}>Quick reply templates</p>
          </div>
          <div className="max-h-60 overflow-y-auto">
            {QUICK_REPLIES.map((r) => (
              <button
                key={r.label}
                onClick={() => { onSelect(r.text); setIsOpen(false); }}
                className="w-full px-4 py-3 text-left transition-colors"
                style={{ borderBottom: "1px solid #f0f2f5" }}
                onMouseEnter={e => (e.currentTarget.style.background = "#f0f2f5")}
                onMouseLeave={e => (e.currentTarget.style.background = "")}
              >
                <p className="text-[13px] font-bold mb-0.5" style={{ color: "var(--msn-text-primary)" }}>{r.label}</p>
                <p className="text-[12px] leading-relaxed line-clamp-2" style={{ color: "var(--msn-text-secondary)" }}>{r.text}</p>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Filter & Sort Bar ─────────────────────────────────────────────────── */

function FilterSortBar({
  filter,
  sort,
  onFilterChange,
  onSortChange,
}: {
  filter: FilterOption;
  sort: SortOption;
  onFilterChange: (f: FilterOption) => void;
  onSortChange: (s: SortOption) => void;
}) {
  const filters: { value: FilterOption; label: string }[] = [
    { value: "all", label: "All" },
    { value: "unread", label: "Unread" },
    { value: "support", label: "Support" },
    { value: "agency", label: "Agency" },
  ];
  const sorts: { value: SortOption; label: string; icon: typeof Clock }[] = [
    { value: "newest", label: "Newest", icon: Clock },
    { value: "unread", label: "Unread first", icon: Star },
    { value: "name", label: "Name A–Z", icon: Filter },
    { value: "oldest", label: "Oldest", icon: RefreshCw },
  ];

  return (
    <div className="space-y-2">
      {/* Filter pills */}
      <div className="flex gap-1.5 flex-wrap">
        {filters.map((f) => (
          <button
            key={f.value}
            onClick={() => onFilterChange(f.value)}
            className="rounded-full px-3 py-1 text-[12px] font-semibold transition-all"
            style={
              filter === f.value
                ? { background: "var(--msn-blue)", color: "#fff" }
                : { background: "#f0f2f5", color: "var(--msn-text-secondary)" }
            }
          >
            {f.label}
          </button>
        ))}
      </div>
      {/* Sort select */}
      <div className="relative">
        <SlidersHorizontal className="absolute left-3 top-1/2 h-3 w-3 -translate-y-1/2" style={{ color: "var(--msn-text-muted)" }} />
        <select
          value={sort}
          onChange={(e) => onSortChange(e.target.value as SortOption)}
          className="h-8 w-full rounded-full pl-8 pr-4 text-[12px] font-semibold outline-none transition-colors appearance-none cursor-pointer"
          style={{ border: "1px solid var(--msn-divider)", background: "#f0f2f5", color: "var(--msn-text-primary)" }}
        >
          {sorts.map((s) => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>
        <ChevronDown className="absolute right-3 top-1/2 h-3 w-3 -translate-y-1/2 pointer-events-none" style={{ color: "var(--msn-text-muted)" }} />
      </div>
    </div>
  );
}

function StatusTabs({
  value,
  onChange,
}: {
  value: StatusFilter;
  onChange: (value: StatusFilter) => void;
}) {
  const tabs: { value: StatusFilter; label: string }[] = [
    { value: "ALL", label: "All statuses" },
    { value: "OPEN", label: "Open" },
    { value: "WAITING_SUPPORT", label: "Waiting support" },
    { value: "WAITING_CLIENT", label: "Waiting client" },
    { value: "RESOLVED", label: "Resolved" },
    { value: "CLOSED", label: "Closed" },
  ];

  return (
    <div className="flex gap-1.5 overflow-x-auto pb-1">
      {tabs.map((tab) => (
        <button
          key={tab.value}
          onClick={() => onChange(tab.value)}
          className="whitespace-nowrap rounded-full px-3 py-1 text-[12px] font-semibold transition-colors"
          style={
            value === tab.value
              ? { background: "var(--msn-blue)", color: "#fff" }
              : { background: "#f7f8fa", color: "var(--msn-text-secondary)", border: "1px solid var(--msn-divider)" }
          }
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

/* ─── Conversation list item ─────────────────────────────────────────────── */

function ConversationItem({
  conversation,
  isActive,
  onClick,
}: {
  conversation: AdminConversation;
  isActive: boolean;
  onClick: () => void;
}) {
  const statusTone = getStatusTone(conversation.status);
  const priorityTone = getPriorityTone(conversation.priority);
  return (
    <button
      onClick={onClick}
      className="group relative flex w-full items-center gap-3 px-3 py-2.5 text-left transition-all rounded-xl mx-1 my-0.5"
      style={{
        width: "calc(100% - 8px)",
        background: isActive ? "var(--msn-sidebar-active)" : "transparent",
      }}
      onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = "var(--msn-sidebar-hover)"; }}
      onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = "transparent"; }}
    >
      <div className="relative flex-shrink-0">
        <AvatarBubble
          name={conversation.clientName}
          imageUrl={conversation.clientProfileImageUrl}
          tone="client"
          size="md"
        />
        {conversation.unreadCount > 0 && (
          <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white" style={{ background: "var(--msn-online)" }} />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-1 mb-0.5">
          <p className="truncate text-[15px] font-semibold leading-snug" style={{ color: isActive ? "var(--msn-text-primary)" : "var(--msn-text-primary)", fontWeight: conversation.unreadCount > 0 ? 700 : 600 }}>
            {conversation.clientName}
          </p>
          <span className="flex-shrink-0 text-[12px] font-medium" style={{ color: "var(--msn-text-muted)" }}>
            {formatTime(conversation.lastMessageAt)}
          </span>
        </div>
        <div className="mt-1 flex items-center gap-2">
          <span
            className="rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em]"
            style={{ background: "var(--msn-blue-light)", color: "var(--msn-blue)" }}
          >
            {getConversationTypeLabel(conversation.conversationType)}
          </span>
          {conversation.status && (
            <span
              className="rounded-full px-2 py-0.5 text-[10px] font-semibold"
              style={{ background: statusTone.bg, color: statusTone.fg, border: `1px solid ${statusTone.border}` }}
            >
              {statusTone.label}
            </span>
          )}
          {conversation.priority && (
            <span
              className="rounded-full px-2 py-0.5 text-[10px] font-semibold"
              style={{ background: priorityTone.bg, color: priorityTone.fg, border: `1px solid ${priorityTone.border}` }}
            >
              {conversation.priority}
            </span>
          )}
          {!!conversation.clientCompany && (
            <span className="truncate text-[11px] font-medium" style={{ color: "var(--msn-text-muted)" }}>
              {conversation.clientCompany}
            </span>
          )}
        </div>
        <p
          className="mt-1 line-clamp-2 text-[13px] leading-5"
          style={{ color: conversation.unreadCount > 0 ? "var(--msn-text-primary)" : "var(--msn-text-muted)", fontWeight: conversation.unreadCount > 0 ? 600 : 400 }}
        >
          {sanitizeConversationPreview(conversation.lastMessage)}
        </p>
      </div>
      <div className="flex flex-shrink-0 flex-col items-end gap-1 ml-1">
        <UnreadBadge count={conversation.unreadCount} />
        {conversation.category && (
          <span className="max-w-[110px] truncate rounded-full px-2 py-0.5 text-[10px] font-semibold" style={{ background: "#f3f4f6", color: "var(--msn-text-secondary)" }}>
            {conversation.category}
          </span>
        )}
        {conversation.conversationType === "agency" && conversation.agencyName && (
          <span className="max-w-[70px] truncate rounded-full px-2 py-0.5 text-[11px] font-semibold" style={{ background: "var(--msn-blue-light)", color: "var(--msn-blue)" }}>
            {conversation.agencyName}
          </span>
        )}
      </div>
    </button>
  );
}

/* ─── Message bubble ─────────────────────────────────────────────────────── */

function MessageBubble({ message, onCopy }: { message: ChatMessage; onCopy: (text: string) => void }) {
  const isOwn = message.senderRole === "agency";
  const tone: AvatarTone = isOwn ? "agency" : message.senderRole === "client" ? "client" : "support";
  const avatarName = isOwn ? message.agencyName || message.senderName : message.senderName;
  const avatarUrl = isOwn ? message.agencyProfileImageUrl : message.clientProfileImageUrl;

  return (
    <div className={`asc-msg-row group flex items-end gap-2 ${isOwn ? "ml-auto flex-row-reverse" : ""}`} style={{ maxWidth: "75%" }}>
      <AvatarBubble name={avatarName} imageUrl={avatarUrl} tone={tone} size="sm" />
      <div className="min-w-0">
        {!isOwn && <p className="mb-1 pl-1 text-[12px] font-semibold" style={{ color: "var(--msn-text-secondary)" }}>{message.senderName}</p>}
        <div
          className="asc-bubble-pop relative rounded-2xl px-4 py-2.5 text-[15px] leading-relaxed"
          style={isOwn
            ? { background: "var(--msn-bubble-out)", color: "var(--msn-bubble-out-text)", borderBottomRightRadius: 4 }
            : { background: "var(--msn-bubble-in)", color: "var(--msn-bubble-in-text)", borderBottomLeftRadius: 4 }
          }
        >
          {message.message}
          <button
            onClick={() => onCopy(message.message)}
            className={`absolute -top-2 ${isOwn ? "-left-2" : "-right-2"} hidden group-hover:flex h-6 w-6 items-center justify-center rounded-full border border-gray-200 bg-white shadow-sm transition-colors hover:bg-gray-50`}
            style={{ color: "var(--msn-text-secondary)" }}
          >
            <Copy className="h-3 w-3" />
          </button>
        </div>
        <div className={`mt-1 flex items-center gap-1 text-[11px] font-medium ${isOwn ? "justify-end pr-1" : "pl-1"}`} style={{ color: "var(--msn-text-muted)" }}>
          {formatTime(message.createdAt)}
          {isOwn && <CheckCheck className="h-3.5 w-3.5" style={{ color: "var(--msn-blue)" }} />}
        </div>
      </div>
    </div>
  );
}

/* ─── AI Suggestion Strip ────────────────────────────────────────────────── */

/* function AiSuggestionStrip({
  conversation,
  messages,
  status,
  onSelect,
}: {
  conversation: AdminConversation | null;
  messages: ChatMessage[];
  status: AiStatus;
  onSelect: (text: string) => void | Promise<void>;
}) {
  if (!conversation) return null;
  const suggestions =
    status === "offline"
      ? buildOfflineAutoReplies(conversation, messages)
      : [
          `Hi ${firstName(conversation.clientName)}, thank you for your message.`,
          "Could you provide more details so we can assist you better?",
          "We are looking into this and will update you shortly.",
        ];
  return (
    <div className="flex flex-wrap items-center gap-2 px-4 py-3" style={{ borderBottom: "1px solid var(--msn-divider)", background: status === "offline" ? "#fffbf0" : "#f0f7ff" }}>
      <span className="mr-1 flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold" style={{ color: status === "offline" ? "#b45309" : "var(--msn-blue)", background: "#fff" }}>
        <Bot className="h-3 w-3" /> {status === "offline" ? "Fallback replies" : "Suggested replies"}
      </span>
      {suggestions.map((s) => (
        <button
          key={s}
          type="button"
          onClick={() => onSelect(s)}
          className="rounded-full border px-3 py-1.5 text-[12px] font-semibold transition-colors"
          style={
            status === "offline"
              ? { borderColor: "#fcd34d", color: "#92400e", background: "#fff" }
              : { borderColor: "#bfdbfe", color: "var(--msn-blue)", background: "#fff" }
          }
        >
          {s.length > 44 ? s.slice(0, 44) + "…" : s}
        </button>
      ))}
    </div>
  );
} */

/* ─── Main component ─────────────────────────────────────────────────────── */

const AdminSupportChat = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const queryClientId = Number(searchParams.get("clientId") ?? "0");
  const queryConversationType: ConversationType = searchParams.get("type") === "agency" ? "agency" : "support";
  const queryAgencyId = queryConversationType === "agency" ? Number(searchParams.get("agencyId") ?? "0") : undefined;
  const queryClientName = searchParams.get("clientName") ?? "";
  const queryEnquiryEmail = searchParams.get("enquiryEmail") ?? "";
  const queryEnquiryMessage = searchParams.get("enquiryMessage") ?? "";
  const [pendingConversation, setPendingConversation] = useState<AdminConversation | null>(null);
  const [mobileView, setMobileView] = useState<"list" | "chat">("list");
  const [conversations, setConversations] = useState<AdminConversation[]>([]);
  const [activeConversationKey, setActiveConversationKey] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterOption>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [sort, setSort] = useState<SortOption>("newest");
  const [isLoadingConversations, setIsLoadingConversations] = useState(true);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [isUpdatingMeta, setIsUpdatingMeta] = useState(false);

  const scrollRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const activeConversationRef = useRef<AdminConversation | null>(null);
  const lastMessageSignatureRef = useRef("");
  const lastLoadedConversationKeyRef = useRef<string | null>(null);
  const lastUnreadTotalRef = useRef(0);
  const conversationRefreshTimeoutRef = useRef<number | null>(null);
  const admin = getStoredAgencyAdmin();

  const activeConversation = useMemo(
    () => conversations.find((item) => item.key === activeConversationKey) ?? pendingConversation,
    [activeConversationKey, conversations, pendingConversation],
  );
  const activeConversationClientId = activeConversation?.clientId ?? null;
  const activeConversationType = activeConversation?.conversationType ?? null;
  const activeConversationAgencyId = activeConversation?.agencyId ?? null;

  useEffect(() => { activeConversationRef.current = activeConversation; }, [activeConversation]);

  const effectiveConversations = useMemo(() => (
    pendingConversation ? [pendingConversation, ...conversations.filter((c) => c.key !== pendingConversation.key)] : conversations
  ), [conversations, pendingConversation]);

  // Filter and sort conversations
  const filteredConversations = useMemo(() => {
    let result = [...effectiveConversations];

    // Text search
    const term = search.trim().toLowerCase();
    if (term) {
      result = result.filter((c) =>
        [c.clientName, c.clientEmail, c.clientCompany, c.agencyName, c.lastMessage]
          .join(" ").toLowerCase().includes(term),
      );
    }

    // Filter
    switch (filter) {
      case "unread": result = result.filter((c) => c.unreadCount > 0); break;
      case "support": result = result.filter((c) => c.conversationType === "support"); break;
      case "agency": result = result.filter((c) => c.conversationType === "agency"); break;
    }

    if (statusFilter !== "ALL") {
      result = result.filter((c) => c.status === statusFilter);
    }

    return sortConversations(result, sort);
  }, [effectiveConversations, search, filter, sort, statusFilter]);

  const loadConversations = useCallback(async (silent = false) => {
    const token = getAgencyAdminToken();
    if (!token) { clearAgencyAdminAuth(); navigate(adminPath("/login"), { replace: true }); return; }
    try {
      setErrorMessage("");
      const response = await fetch("/api/chats/admin", { headers: { ...getAgencyAdminAuthHeaders() } });
      const data = await readSafeJson<{ conversations?: AdminConversation[]; error?: string }>(response);
      if (!response.ok || !data.conversations) {
        if (response.status === 401) { clearAgencyAdminAuth(); navigate(adminPath("/login"), { replace: true }); return; }
        throw new Error(data.error || "Failed to load conversations");
      }

      setConversations(data.conversations);
      setActiveConversationKey((prev) => {
        const queryKey = queryClientId
          ? `${queryClientId}:${queryConversationType}:${queryConversationType === "support" ? 1 : (queryAgencyId ?? 0)}`
          : null;

        if (queryKey) {
          const existing = data.conversations.some((c) => c.key === queryKey);
          if (existing) {
            setPendingConversation(null);
            return queryKey;
          }

          if (queryConversationType === "support") {
            const enquiryPreview = buildEnquiryPreview(queryEnquiryMessage);
            setPendingConversation({
              key: queryKey,
              clientId: queryClientId,
              conversationType: "support",
              agencyId: 1,
              agencyName: "",
              clientName: queryClientName || `Client ${queryClientId}`,
              clientEmail: queryEnquiryEmail,
              clientCompany: "",
              lastMessage: enquiryPreview,
              lastMessageAt: new Date().toISOString(),
              description: enquiryPreview,
              unreadCount: 0,
              status: "OPEN",
              category: "General Inquiry",
              priority: "MEDIUM",
              subject: "Agency Support · General Inquiry",
            });
            return queryKey;
          }
        }

        if (prev && data.conversations.some((c) => c.key === prev)) return prev;
        return data.conversations[0]?.key ?? null;
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to load conversations";
      setErrorMessage(message);
      if (!silent) toast.error(message);
    } finally {
      if (!silent) setIsLoadingConversations(false);
    }
  }, [navigate, queryAgencyId, queryClientId, queryClientName, queryConversationType, queryEnquiryEmail, queryEnquiryMessage]);

  const scheduleConversationRefresh = useCallback(() => {
    if (conversationRefreshTimeoutRef.current !== null) {
      window.clearTimeout(conversationRefreshTimeoutRef.current);
    }
    conversationRefreshTimeoutRef.current = window.setTimeout(() => {
      conversationRefreshTimeoutRef.current = null;
      void loadConversations(true);
    }, 350);
  }, [loadConversations]);

  const loadMessages = useCallback(async (conversation: AdminConversation, silent = false) => {
    try {
      if (!silent) setIsLoadingMessages(true);
      setErrorMessage("");
      const response = await fetch(
        `/api/chats/admin/${conversation.clientId}?${buildQueryString(conversation)}`,
        { headers: { ...getAgencyAdminAuthHeaders() } },
      );
      const data = await readSafeJson<{ messages?: ChatMessage[]; error?: string }>(response);
      if (!response.ok || !data.messages) {
        if (response.status === 401) { clearAgencyAdminAuth(); navigate(adminPath("/login"), { replace: true }); return; }
        throw new Error(data.error || "Failed to load messages");
      }
      const nextMessages = [...data.messages].sort((l, r) => new Date(l.createdAt).getTime() - new Date(r.createdAt).getTime());
      const nextSig = JSON.stringify(nextMessages.map((m) => [m.id, m.message, m.createdAt, m.senderRole]));
      if (nextSig !== lastMessageSignatureRef.current) {
        lastMessageSignatureRef.current = nextSig;
        setMessages(nextMessages);
      }
      setConversations((prev) =>
        prev.map((item) => item.key === conversation.key && item.unreadCount > 0 ? { ...item, unreadCount: 0 } : item),
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to load messages";
      setErrorMessage(message);
      if (!silent) toast.error(message);
    } finally {
      if (!silent) setIsLoadingMessages(false);
    }
  }, [navigate]);

  useEffect(() => {
    const token = getAgencyAdminToken();
    if (!token) { clearAgencyAdminAuth(); navigate(adminPath("/login"), { replace: true }); return; }
    const controller = new AbortController();
    let lastId = 0;
    const run = async () => {
      try {
        const response = await fetch("/api/chats/admin/last-id", { headers: { ...getAgencyAdminAuthHeaders() }, signal: controller.signal });
        const data = await readSafeJson<{ lastId?: number }>(response);
        if (response.ok && typeof data.lastId === "number") lastId = data.lastId;
      } catch { /* no-op */ }
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
                setMessages((prev) => {
                  if (prev.some((item) => item.id === next.id)) return prev;
                  const updated = [...prev, next].sort(
                    (left, right) => new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime(),
                  );
                  lastMessageSignatureRef.current = JSON.stringify(
                    updated.map((message) => [message.id, message.message, message.createdAt, message.senderRole]),
                  );
                  return updated;
                });
              }
              if (next.senderRole === "client" && (!isActive || document.visibilityState !== "visible")) {
                toast.message(next.senderName, {
                  description: next.message.length > 90 ? `${next.message.slice(0, 90)}...` : next.message,
                });
              }
              scheduleConversationRefresh();
            },
          });
        } catch {
          if (controller.signal.aborted) return;
          await new Promise((resolve) => window.setTimeout(resolve, 1200));
        }
      }
    };
    void run();
    return () => {
      if (conversationRefreshTimeoutRef.current !== null) {
        window.clearTimeout(conversationRefreshTimeoutRef.current);
      }
      controller.abort();
    };
  }, [loadConversations, loadMessages, navigate, scheduleConversationRefresh]);

  useEffect(() => { void loadConversations(false); }, [loadConversations]);

  useEffect(() => {
    if (!activeConversationKey) {
      setMessages([]);
      lastMessageSignatureRef.current = "";
      lastLoadedConversationKeyRef.current = null;
      return;
    }

    const conversation = activeConversationRef.current;
    if (
      conversation &&
      conversation.key === activeConversationKey &&
      conversation.clientId === activeConversationClientId &&
      conversation.conversationType === activeConversationType &&
      (conversation.agencyId ?? null) === activeConversationAgencyId
    ) {
      if (lastLoadedConversationKeyRef.current === activeConversationKey) {
        return;
      }
      lastLoadedConversationKeyRef.current = activeConversationKey;
      lastMessageSignatureRef.current = "";
      void loadMessages(conversation, false);
      return;
    }

    setMessages([]);
    lastMessageSignatureRef.current = "";
    lastLoadedConversationKeyRef.current = null;
  }, [
    activeConversationAgencyId,
    activeConversationClientId,
    activeConversationKey,
    activeConversationType,
    loadMessages,
  ]);

  useEffect(() => {
    if (!pendingConversation) return;
    const actual = conversations.find((item) => item.key === pendingConversation.key);
    if (actual) {
      setPendingConversation(null);
      setActiveConversationKey(actual.key);
    }
  }, [conversations, pendingConversation]);

  useEffect(() => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  useEffect(() => {
    const unreadNow = conversations.reduce((sum, item) => sum + item.unreadCount, 0);
    if (unreadNow > lastUnreadTotalRef.current) {
      try {
        const context = new (window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext)();
        const oscillator = context.createOscillator();
        const gainNode = context.createGain();
        oscillator.type = "sine";
        oscillator.frequency.value = 880;
        gainNode.gain.value = 0.03;
        oscillator.connect(gainNode);
        gainNode.connect(context.destination);
        oscillator.start();
        oscillator.stop(context.currentTime + 0.08);
      } catch {
        // ignore notification sound failures
      }
    }
    lastUnreadTotalRef.current = unreadNow;
  }, [conversations]);

  const copyMessage = (text: string) => {
    navigator.clipboard.writeText(text).then(() => toast.success("Copied to clipboard")).catch(() => toast.error("Copy failed"));
  };

  const updateConversationMeta = useCallback(async (payload: {
    status?: SupportConversationStatus;
    category?: SupportInquiryCategory;
    priority?: SupportPriority;
  }) => {
    if (!activeConversation) return;
    try {
      setIsUpdatingMeta(true);
      const response = await fetch(
        `/api/chats/admin/${activeConversation.clientId}?${buildQueryString(activeConversation)}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json", ...getAgencyAdminAuthHeaders() },
          body: JSON.stringify(payload),
        },
      );
      const data = await readSafeJson<{
        conversation?: Partial<AdminConversation>;
        error?: string;
      }>(response);
      if (!response.ok || !data.conversation) {
        throw new Error(data.error || "Failed to update conversation");
      }
      setConversations((prev) =>
        prev.map((item) =>
          item.key === activeConversation.key
            ? {
                ...item,
                ...data.conversation,
                assignedAdminName: admin?.username || admin?.agencyName || item.assignedAdminName,
                assignedAdminId: admin?.id || item.assignedAdminId,
              }
            : item,
        ),
      );
      toast.success("Conversation updated");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update conversation");
    } finally {
      setIsUpdatingMeta(false);
    }
  }, [activeConversation, admin]);

  const sendText = useCallback(async (rawText: string) => {
    if (!activeConversation) return;
    const messageText = rawText.trim();
    if (!messageText) return;
    try {
      setIsSending(true);
      setErrorMessage("");
      const response = await fetch(
        `/api/chats/admin/${activeConversation.clientId}?${buildQueryString(activeConversation)}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json", ...getAgencyAdminAuthHeaders() },
          body: JSON.stringify({ message: messageText }),
        },
      );
      const data = await readSafeJson<{ message?: ChatMessage; error?: string }>(response);
      if (!response.ok || !data.message) {
        if (response.status === 401) { clearAgencyAdminAuth(); navigate(adminPath("/login"), { replace: true }); return; }
        throw new Error(data.error || "Failed to send message");
      }
      setMessages((prev) => {
        const next = [...prev, data.message!];
        lastMessageSignatureRef.current = JSON.stringify(next.map((m) => [m.id, m.message, m.createdAt, m.senderRole]));
        return next;
      });
      setConversations((prev) =>
        prev.map((item) =>
          item.key === activeConversation.key
            ? { ...item, lastMessage: data.message!.message, lastMessageAt: data.message!.createdAt, unreadCount: 0 }
            : item,
        ),
      );
      setDraft((prev) => (prev.trim() === messageText ? "" : prev));
      if (textareaRef.current) textareaRef.current.style.height = "auto";
      scheduleConversationRefresh();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to send message";
      setErrorMessage(message);
      toast.error(message);
    } finally {
      setIsSending(false);
    }
  }, [activeConversation, navigate, scheduleConversationRefresh]);

  const sendMessage = useCallback(async () => {
    await sendText(draft);
  }, [draft, sendText]);

  const handleRefreshMessages = useCallback(() => {
    const conversation = activeConversationRef.current;
    if (!conversation) return;
    lastLoadedConversationKeyRef.current = conversation.key;
    lastMessageSignatureRef.current = "";
    void loadMessages(conversation, false);
  }, [loadMessages]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void sendMessage(); }
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
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
        .asc-root * { font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; }

        /* ── Messenger colour tokens ── */
        :root {
          --msn-blue: #0084ff;
          --msn-blue-dark: #006fd6;
          --msn-blue-light: #e7f3ff;
          --msn-sidebar-bg: #ffffff;
          --msn-sidebar-hover: #f2f2f2;
          --msn-sidebar-active: #e4e6eb;
          --msn-header-bg: #ffffff;
          --msn-chat-bg: #f0f2f5;
          --msn-bubble-in: #e4e6eb;
          --msn-bubble-in-text: #050505;
          --msn-bubble-out: #0084ff;
          --msn-bubble-out-text: #ffffff;
          --msn-divider: #e4e6eb;
          --msn-text-primary: #050505;
          --msn-text-secondary: #65676b;
          --msn-text-muted: #8a8d91;
          --msn-online: #31a24c;
          --msn-unread: #0084ff;
        }

        @keyframes dotPulse {
          0%, 80%, 100% { opacity: 0.3; transform: scale(0.7); }
          40% { opacity: 1; transform: scale(1); }
        }
        @keyframes fadeSlideUp {
          from { opacity: 0; transform: translateY(5px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes slideIn {
          from { opacity: 0; transform: translateX(-6px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        @keyframes popIn {
          from { opacity: 0; transform: scale(0.92); }
          to   { opacity: 1; transform: scale(1); }
        }

        .asc-msg-row  { animation: fadeSlideUp 0.18s ease both; }
        .asc-conv-item { animation: slideIn 0.16s ease both; }
        .asc-bubble-pop { animation: popIn 0.15s ease both; }

        /* Thin Messenger-style scrollbar */
        .asc-scrollbar::-webkit-scrollbar { width: 4px; }
        .asc-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .asc-scrollbar::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.12); border-radius: 8px; }
        .asc-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(0,0,0,0.22); }

        /* Send button */
        .asc-send-btn { transition: transform 0.1s ease, opacity 0.15s ease; }
        .asc-send-btn:not(:disabled):hover { transform: scale(1.08); }
        .asc-send-btn:not(:disabled):active { transform: scale(0.94); }

        /* Chat background – subtle FB Messenger grey */
        .asc-chat-bg {
          background-color: var(--msn-chat-bg);
        }

        /* Sidebar search focus ring */
        .asc-search:focus { border-color: var(--msn-blue) !important; box-shadow: 0 0 0 2px rgba(0,132,255,0.18) !important; }

        /* Compose textarea */
        .asc-textarea:focus { border-color: var(--msn-blue) !important; box-shadow: 0 0 0 2px rgba(0,132,255,0.15) !important; }

        /* Conversation item active indicator */
        .asc-conv-active { background: var(--msn-sidebar-active) !important; }

        /* Online pulse dot */
        @keyframes onlinePulse {
          0%,100% { box-shadow: 0 0 0 0 rgba(49,162,76,0.4); }
          50% { box-shadow: 0 0 0 4px rgba(49,162,76,0); }
        }
        .asc-online-dot { animation: onlinePulse 2s ease infinite; }
      `}</style>

      <div className="asc-root flex flex-col" style={{ height: "calc(100vh - 130px)", minHeight: 440 }}>

        {/* ── Page title bar ── */}
        <div className="mb-3 flex flex-shrink-0 items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-full shadow-sm" style={{ background: "linear-gradient(135deg, #0084ff 0%, #44bef1 100%)" }}>
            <MessageCircle className="h-5 w-5 text-white" />
          </div>
          <div>
            <h2 className="text-[22px] font-bold leading-tight tracking-tight" style={{ color: "var(--msn-text-primary)" }}>Messages</h2>
            <p className="text-[13px] font-medium leading-none mt-0.5" style={{ color: "var(--msn-text-secondary)" }}>Client support inbox</p>
          </div>
          {totalUnread > 0 && (
            <span className="ml-1 rounded-full px-3 py-1 text-[13px] font-bold text-white shadow-sm" style={{ background: "var(--msn-blue)" }}>
              {totalUnread} new
            </span>
          )}
          <div className="ml-auto flex items-center gap-2">
            <span className="rounded-full px-3 py-1.5 text-[12px] font-semibold" style={{ background: "var(--msn-blue-light)", color: "var(--msn-blue)", border: "1px solid #c2deff" }}>
              Quick replies ready
            </span>
          </div>
        </div>

        {/* ── Chat shell ── */}
        <div className="flex flex-1 overflow-hidden rounded-2xl shadow-lg" style={{ border: "1px solid var(--msn-divider)", background: "#fff" }}>

          {/* ── Sidebar ── */}
          <div className={`flex flex-col ${
            mobileView === "chat" ? "hidden md:flex md:w-[340px] md:min-w-[300px]" : "flex w-full md:w-[340px] md:min-w-[300px]"
          }`} style={{ borderRight: "1px solid var(--msn-divider)", background: "var(--msn-sidebar-bg)" }}>

            {/* Sidebar header */}
            <div className="flex-shrink-0 px-5 pt-5 pb-3" style={{ borderBottom: "1px solid var(--msn-divider)" }}>
              <p className="text-[20px] font-bold" style={{ color: "var(--msn-text-primary)" }}>Chats</p>
              <p className="text-[13px] font-medium mt-0.5" style={{ color: "var(--msn-text-secondary)" }}>
                {filteredConversations.length}/{effectiveConversations.length} conversations
                {totalUnread > 0 && <span className="ml-2 font-bold" style={{ color: "var(--msn-blue)" }}>· {totalUnread} unread</span>}
              </p>
            </div>

            {/* Search */}
            <div className="flex-shrink-0 px-4 pt-3 pb-2" style={{ borderBottom: "1px solid var(--msn-divider)" }}>
              <div className="relative mb-3">
                <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2" style={{ color: "var(--msn-text-muted)" }} />
                <input
                  type="text"
                  placeholder="Search Message"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="asc-search h-10 w-full rounded-full border pl-10 pr-4 text-[14px] font-medium outline-none transition-all"
                  style={{ borderColor: "var(--msn-divider)", background: "#f0f2f5", color: "var(--msn-text-primary)" }}
                />
              </div>
              <div className="mb-3">
                <StatusTabs value={statusFilter} onChange={setStatusFilter} />
              </div>
              <FilterSortBar filter={filter} sort={sort} onFilterChange={setFilter} onSortChange={setSort} />
            </div>

            {/* Conversation list */}
            <div className="asc-scrollbar flex-1 overflow-y-auto">
              {isLoadingConversations ? (
                <LoadingDots />
              ) : filteredConversations.length === 0 ? (
                <EmptyState label={search || filter !== "all" ? "No conversations match your filters." : "No conversations found."} icon="user" />
              ) : (
                filteredConversations.map((conv, i) => (
                  <div key={conv.key} className="asc-conv-item" style={{ animationDelay: `${i * 0.04}s` }}>
                    <ConversationItem conversation={conv} isActive={conv.key === activeConversationKey} onClick={() => handleSelectConversation(conv.key)} />
                  </div>
                ))
              )}
            </div>

            {/* Sidebar stats footer */}
            <div className="flex-shrink-0 grid grid-cols-2 gap-2 p-3" style={{ borderTop: "1px solid var(--msn-divider)", background: "#fafafa" }}>
              <div className="rounded-xl px-4 py-3 text-center" style={{ background: "#f0f2f5" }}>
                <p className="text-[24px] font-bold leading-none" style={{ color: "var(--msn-text-primary)" }}>{effectiveConversations.length}</p>
                <p className="text-[12px] font-semibold mt-1" style={{ color: "var(--msn-text-secondary)" }}>Total</p>
              </div>
              <div className="rounded-xl px-4 py-3 text-center" style={{ background: "var(--msn-blue-light)" }}>
                <p className="text-[24px] font-bold leading-none" style={{ color: "var(--msn-blue)" }}>{totalUnread}</p>
                <p className="text-[12px] font-semibold mt-1" style={{ color: "var(--msn-blue)" }}>Unread</p>
              </div>
            </div>
          </div>

          {/* ── Message panel ── */}
          <div className={`flex min-w-0 flex-1 flex-col ${mobileView === "list" ? "hidden md:flex" : "flex"}`}>

            {/* Chat header */}
            <div className="flex flex-shrink-0 items-center gap-3 px-4 py-3 shadow-sm" style={{ borderBottom: "1px solid var(--msn-divider)", background: "var(--msn-header-bg)" }}>
              <button
                onClick={() => setMobileView("list")}
                className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full transition-colors md:hidden"
                style={{ color: "var(--msn-blue)" }}
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              {activeConversation ? (
                <>
                  <div className="relative flex-shrink-0">
                    <AvatarBubble
                      name={activeConversation.clientName}
                      imageUrl={activeConversation.clientProfileImageUrl}
                      tone="client"
                      size="lg"
                    />
                    <span className="asc-online-dot absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full border-2 border-white" style={{ background: "var(--msn-online)" }} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[16px] font-bold leading-tight" style={{ color: "var(--msn-text-primary)" }}>{activeConversation.clientName}</p>
                    <p className="text-[12px] font-medium" style={{ color: "var(--msn-online)" }}>Active now</p>
                  </div>
                  <div className="flex-shrink-0 text-right hidden sm:block">
                    <p className="text-[14px] font-semibold" style={{ color: "var(--msn-text-primary)" }}>{admin?.agencyName ?? "Agency"}</p>
                    <p className="text-[12px] mt-0.5" style={{ color: "var(--msn-text-secondary)" }}>{activeConversation.clientEmail}</p>
                  </div>
                  <button
                    type="button"
                    onClick={handleRefreshMessages}
                    className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full border transition-colors hover:bg-slate-50"
                    style={{ borderColor: "var(--msn-divider)", color: "var(--msn-text-secondary)" }}
                    aria-label="Refresh chat"
                    title="Refresh chat"
                  >
                    <RefreshCw className="h-4 w-4" />
                  </button>
                </>
              ) : (
                <p className="text-[15px] font-semibold" style={{ color: "var(--msn-text-secondary)" }}>{headerSubtitle}</p>
              )}
            </div>

            {activeConversation && (
              <div className="grid gap-3 px-4 py-3 sm:grid-cols-2 xl:grid-cols-4" style={{ borderBottom: "1px solid var(--msn-divider)", background: "#fcfcfd" }}>
                <div className="rounded-2xl border px-3 py-3" style={{ borderColor: "var(--msn-divider)", background: "#fff" }}>
                  <p className="mb-1 text-[11px] font-bold uppercase tracking-[0.08em]" style={{ color: "var(--msn-text-muted)" }}>Status</p>
                  <div className="flex items-center gap-2">
                    <CircleDot className="h-4 w-4" style={{ color: getStatusTone(activeConversation.status).fg }} />
                    <select
                      value={activeConversation.status ?? "OPEN"}
                      disabled={isUpdatingMeta}
                      onChange={(e) => void updateConversationMeta({ status: e.target.value as SupportConversationStatus })}
                      className="w-full rounded-xl border px-3 py-2 text-[13px] font-semibold outline-none"
                      style={{ borderColor: "var(--msn-divider)", background: "#fff", color: "var(--msn-text-primary)" }}
                    >
                      {["OPEN", "WAITING_SUPPORT", "WAITING_CLIENT", "RESOLVED", "CLOSED"].map((status) => (
                        <option key={status} value={status}>{status.replace(/_/g, " ")}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="rounded-2xl border px-3 py-3" style={{ borderColor: "var(--msn-divider)", background: "#fff" }}>
                  <p className="mb-1 text-[11px] font-bold uppercase tracking-[0.08em]" style={{ color: "var(--msn-text-muted)" }}>Category</p>
                  <div className="flex items-center gap-2">
                    <Tag className="h-4 w-4" style={{ color: "var(--msn-blue)" }} />
                    <select
                      value={activeConversation.category ?? "General Inquiry"}
                      disabled={isUpdatingMeta}
                      onChange={(e) => void updateConversationMeta({ category: e.target.value as SupportInquiryCategory })}
                      className="w-full rounded-xl border px-3 py-2 text-[13px] font-semibold outline-none"
                      style={{ borderColor: "var(--msn-divider)", background: "#fff", color: "var(--msn-text-primary)" }}
                    >
                      {["Booking Concern", "Payment Concern", "Contract Concern", "Maid Replacement", "Technical Support", "General Inquiry"].map((category) => (
                        <option key={category} value={category}>{category}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="rounded-2xl border px-3 py-3" style={{ borderColor: "var(--msn-divider)", background: "#fff" }}>
                  <p className="mb-1 text-[11px] font-bold uppercase tracking-[0.08em]" style={{ color: "var(--msn-text-muted)" }}>Priority</p>
                  <div className="flex items-center gap-2">
                    <ShieldAlert className="h-4 w-4" style={{ color: getPriorityTone(activeConversation.priority).fg }} />
                    <select
                      value={activeConversation.priority ?? "MEDIUM"}
                      disabled={isUpdatingMeta}
                      onChange={(e) => void updateConversationMeta({ priority: e.target.value as SupportPriority })}
                      className="w-full rounded-xl border px-3 py-2 text-[13px] font-semibold outline-none"
                      style={{ borderColor: "var(--msn-divider)", background: "#fff", color: "var(--msn-text-primary)" }}
                    >
                      {["LOW", "MEDIUM", "HIGH", "URGENT"].map((priority) => (
                        <option key={priority} value={priority}>{priority}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="rounded-2xl border px-3 py-3" style={{ borderColor: "var(--msn-divider)", background: "#fff" }}>
                  <p className="mb-1 text-[11px] font-bold uppercase tracking-[0.08em]" style={{ color: "var(--msn-text-muted)" }}>Owner</p>
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-[13px] font-semibold" style={{ color: "var(--msn-text-primary)" }}>
                        {activeConversation.assignedAdminName || admin?.username || admin?.agencyName || "Unassigned"}
                      </p>
                      <p className="text-[11px]" style={{ color: "var(--msn-text-secondary)" }}>
                        {activeConversation.subject || "Trackable support inquiry"}
                      </p>
                    </div>
                    <button
                      type="button"
                      disabled={isUpdatingMeta}
                      onClick={() => void updateConversationMeta({ status: "RESOLVED" })}
                      className="inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-[12px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                      style={{ background: "#16a34a" }}
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" /> Mark resolved
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Messages area */}
            <div ref={scrollRef} className="asc-scrollbar asc-chat-bg flex flex-1 flex-col gap-4 overflow-y-auto p-5">
              {isLoadingMessages ? (
                <LoadingDots />
              ) : errorMessage ? (
                <div className="mx-auto max-w-sm rounded-2xl px-5 py-4 text-center text-[14px] font-semibold" style={{ background: "#fff0f0", color: "#c0392b", border: "1px solid #ffd0d0" }}>
                  {errorMessage}
                </div>
              ) : !activeConversation ? (
                <EmptyState label="Select a conversation to get started." />
              ) : messages.length === 0 ? (
                <EmptyState label={activeConversation.description || "No messages yet. Say hello!"} />
              ) : (
                messageGroups.map(({ label, messages: groupMsgs }) => (
                  <div key={label} className="flex flex-col gap-2">
                    <DateDivider label={label} />
                    {groupMsgs.map((msg) => (
                      <MessageBubble key={msg.id} message={msg} onCopy={copyMessage} />
                    ))}
                  </div>
                ))
              )}
            </div>

            {/* Compose bar */}
            <div className="flex-shrink-0" style={{ borderTop: "1px solid var(--msn-divider)", background: "#fff" }}>
              {/* Quick reply row */}
              <div className="flex items-center gap-2 px-4 pt-2.5 pb-1">
                <QuickReplyPanel onSelect={(text) => setDraft(text)} />
              </div>
              {/* Textarea + send */}
              <div className="flex items-end gap-2 px-4 pb-4">
                <textarea
                  ref={textareaRef}
                  placeholder={activeConversation ? `Message ${activeConversation.clientName}…` : "Select a conversation…"}
                  value={draft}
                  rows={1}
                  disabled={!activeConversation || isSending}
                  onChange={(e) => {
                    setDraft(e.target.value);
                    e.target.style.height = "auto";
                    e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px";
                  }}
                  onKeyDown={handleKeyDown}
                  className="asc-scrollbar asc-textarea flex-1 resize-none rounded-2xl border px-4 py-2.5 text-[15px] leading-relaxed outline-none transition-all disabled:cursor-not-allowed disabled:opacity-50"
                  style={{
                    lineHeight: 1.6,
                    maxHeight: 120,
                    minHeight: 42,
                    borderColor: "var(--msn-divider)",
                    background: "#f0f2f5",
                    color: "var(--msn-text-primary)",
                  }}
                />
                <button
                  onClick={() => void sendMessage()}
                  disabled={isSending || !draft.trim() || !activeConversation}
                  className="asc-send-btn flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full text-white disabled:cursor-default disabled:opacity-30"
                  style={{ background: "var(--msn-blue)" }}
                >
                  <Send className="h-5 w-5" />
                </button>
              </div>
            </div>

          </div>
        </div>
      </div>
    </>
  );
};

export default AdminSupportChat;
