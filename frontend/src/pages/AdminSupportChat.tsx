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

const MESSAGE_PAGE_SIZE = 50;

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

function MessageSkeleton() {
  const rows = [
    { own: false, w: "58%", h: 40 },
    { own: true,  w: "44%", h: 40 },
    { own: false, w: "70%", h: 56 },
    { own: true,  w: "52%", h: 40 },
    { own: false, w: "38%", h: 40 },
  ];
  return (
    <div className="flex flex-col gap-4 py-2">
      {rows.map((row, i) => (
        <div key={i} className={`flex items-end gap-2 ${row.own ? "ml-auto flex-row-reverse" : ""}`} style={{ maxWidth: "75%", animationDelay: `${i * 60}ms` }}>
          <div className="h-8 w-8 flex-shrink-0 rounded-full asc-skeleton" />
          <div style={{ width: row.w, height: row.h, borderRadius: 18, borderBottomRightRadius: row.own ? 4 : undefined, borderBottomLeftRadius: !row.own ? 4 : undefined }} className="asc-skeleton" />
        </div>
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

function LoadingDots() {
  return (
    <div className="flex flex-1 flex-col gap-3 px-3 py-4">
      {[80, 65, 90, 70, 55].map((w, i) => (
        <div key={i} className="flex items-center gap-3 px-1 py-1.5">
          <div className="h-10 w-10 flex-shrink-0 rounded-full asc-skeleton" />
          <div className="flex flex-1 flex-col gap-2">
            <div className="h-3 rounded-full asc-skeleton" style={{ width: `${w}%` }} />
            <div className="h-2.5 rounded-full asc-skeleton" style={{ width: `${w - 15}%` }} />
          </div>
        </div>
      ))}
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
  const hasUnread = conversation.unreadCount > 0;
  return (
    <button
      onClick={onClick}
      className="group relative flex w-full items-start gap-3 px-3 py-3 text-left transition-all rounded-xl mx-1 my-0.5"
      style={{
        width: "calc(100% - 8px)",
        background: isActive ? "var(--msn-sidebar-active)" : "transparent",
        borderLeft: isActive ? "3px solid var(--msn-blue)" : "3px solid transparent",
      }}
      onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = "var(--msn-sidebar-hover)"; }}
      onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = "transparent"; }}
    >
      {/* Avatar */}
      <div className="relative flex-shrink-0 mt-0.5">
        <AvatarBubble name={conversation.clientName} imageUrl={conversation.clientProfileImageUrl} tone="client" size="md" />
        <span
          className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white ${conversation.clientOnline ? "asc-online-dot" : ""}`}
          style={{ background: conversation.clientOnline ? "var(--msn-online)" : "#d1d5db" }}
        />
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-1">
          <p className="truncate text-[14px] leading-snug" style={{ color: "var(--msn-text-primary)", fontWeight: hasUnread ? 700 : 600 }}>
            {conversation.clientName}
          </p>
          <span className="flex-shrink-0 text-[11px]" style={{ color: hasUnread ? "var(--msn-blue)" : "var(--msn-text-muted)", fontWeight: hasUnread ? 600 : 400 }}>
            {formatTime(conversation.lastMessageAt)}
          </span>
        </div>

        {/* Status + type row */}
        <div className="mt-1 flex flex-wrap items-center gap-1">
          <span className="rounded-md px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide" style={{ background: "var(--msn-blue-light)", color: "var(--msn-blue)" }}>
            {getConversationTypeLabel(conversation.conversationType)}
          </span>
          {conversation.status && (
            <span className="rounded-md px-1.5 py-0.5 text-[10px] font-semibold" style={{ background: statusTone.bg, color: statusTone.fg }}>
              {statusTone.label}
            </span>
          )}
        </div>

        {/* Preview */}
        <p className="mt-1 line-clamp-1 text-[12.5px] leading-5" style={{ color: hasUnread ? "var(--msn-text-secondary)" : "var(--msn-text-muted)", fontWeight: hasUnread ? 500 : 400 }}>
          {sanitizeConversationPreview(conversation.lastMessage)}
        </p>
      </div>

      {/* Right column */}
      <div className="flex flex-shrink-0 flex-col items-end gap-1.5">
        {hasUnread ? (
          <UnreadBadge count={conversation.unreadCount} />
        ) : (
          <CheckCheck className="h-3.5 w-3.5" style={{ color: "var(--msn-text-muted)", opacity: 0.5 }} />
        )}
      </div>
    </button>
  );
}

/* ─── Message bubble ─────────────────────────────────────────────────────── */

function MessageBubble({ message, onCopy }: { message: ChatMessage; onCopy: (text: string) => void }) {
  const isOwn = message.senderRole === "agency";
  const isPending = Boolean(message._optimistic);
  const isBot = Boolean(message.isBot);
  const tone: AvatarTone = isOwn ? "agency" : "client";
  const avatarName = isOwn ? message.agencyName || message.senderName : message.senderName;
  const avatarUrl = isOwn ? message.agencyProfileImageUrl : message.clientProfileImageUrl;

  return (
    <div
      className={`asc-msg-row group flex items-end gap-2.5 ${isOwn ? "ml-auto flex-row-reverse" : ""}`}
      style={{ maxWidth: "78%", opacity: isPending ? 0.7 : 1, transition: "opacity 0.2s ease" }}
    >
      <div className="flex-shrink-0">
        <AvatarBubble name={avatarName} imageUrl={avatarUrl} tone={tone} size="sm" />
      </div>
      <div className="min-w-0 flex flex-col">
        {!isOwn && (
          <p className="mb-1 pl-1 text-[11px] font-semibold flex items-center gap-1.5" style={{ color: "var(--msn-text-muted)" }}>
            {message.senderName}
            {isBot && (
              <span className="rounded-full px-1.5 py-px text-[9px] font-bold tracking-wide" style={{ background: "var(--msn-blue-light)", color: "var(--msn-blue)" }}>
                AI
              </span>
            )}
          </p>
        )}
        <div
          className={`asc-bubble-pop relative rounded-2xl px-4 py-2.5 text-[14.5px] leading-relaxed ${isOwn ? "asc-bubble-out-style" : "asc-bubble-in-style"}`}
          style={{
            borderBottomRightRadius: isOwn ? 4 : undefined,
            borderBottomLeftRadius: isOwn ? undefined : 4,
            color: isOwn ? "var(--msn-bubble-out-text)" : "var(--msn-bubble-in-text)",
            ...(isPending && isOwn ? { opacity: 0.75 } : {}),
          }}
        >
          <span style={{ wordBreak: "break-word", whiteSpace: "pre-wrap" }}>{message.message}</span>
          {!isPending && (
            <button
              onClick={() => onCopy(message.message)}
              className={`absolute -top-2.5 ${isOwn ? "-left-2.5" : "-right-2.5"} hidden group-hover:flex h-7 w-7 items-center justify-center rounded-full bg-white shadow-md transition-all hover:scale-110`}
              style={{ color: "var(--msn-text-secondary)", border: "1px solid var(--msn-divider)" }}
            >
              <Copy className="h-3 w-3" />
            </button>
          )}
        </div>
        <div className={`mt-1 flex items-center gap-1 text-[11px] ${isOwn ? "justify-end pr-1" : "pl-1"}`} style={{ color: "var(--msn-text-muted)" }}>
          {isPending ? (
            <span className="italic">Sending…</span>
          ) : (
            <>
              <span>{formatTime(message.createdAt)}</span>
              {isOwn && <CheckCheck className="h-3 w-3" style={{ color: "var(--msn-blue)", opacity: 0.8 }} />}
            </>
          )}
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
  const [isLoadingOlder, setIsLoadingOlder] = useState(false);
  const [hasMoreOlder, setHasMoreOlder] = useState(false);

  const scrollRef = useRef<HTMLDivElement | null>(null);
  const isNearBottomRef = useRef(true);
  const justPrependedRef = useRef(false);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const activeConversationRef = useRef<AdminConversation | null>(null);
  const lastMessageSignatureRef = useRef("");
  const lastLoadedConversationKeyRef = useRef<string | null>(null);
  const lastUnreadTotalRef = useRef(0);
  const conversationRefreshTimeoutRef = useRef<number | null>(null);
  const messagePollInFlightRef = useRef(false);
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
    const abortCtrl = new AbortController();
    const timeoutId = window.setTimeout(() => abortCtrl.abort(), 12_000);
    try {
      const token = getAgencyAdminToken();
      if (!token) { clearAgencyAdminAuth(); navigate(adminPath("/login"), { replace: true }); return; }
      setErrorMessage("");
      const response = await fetch("/api/chats/admin", {
        headers: { ...getAgencyAdminAuthHeaders() },
        signal: abortCtrl.signal,
      });
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
      if ((error as { name?: string }).name === "AbortError") {
        const msg = "Server is not responding. Check that the backend is running.";
        setErrorMessage(msg);
        if (!silent) toast.error(msg);
      } else {
        const message = error instanceof Error ? error.message : "Failed to load conversations";
        setErrorMessage(message);
        if (!silent) toast.error(message);
      }
    } finally {
      window.clearTimeout(timeoutId);
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
    const abortCtrl = new AbortController();
    const timeoutId = window.setTimeout(() => abortCtrl.abort(), 12_000);
    try {
      if (!silent) setIsLoadingMessages(true);
      setErrorMessage("");
      const response = await fetch(
        `/api/chats/admin/${conversation.clientId}?${buildQueryString(conversation)}&limit=${MESSAGE_PAGE_SIZE}`,
        { headers: { ...getAgencyAdminAuthHeaders() }, signal: abortCtrl.signal },
      );
      const data = await readSafeJson<{ messages?: ChatMessage[]; error?: string }>(response);
      if (!response.ok || !data.messages) {
        if (response.status === 401) { clearAgencyAdminAuth(); navigate(adminPath("/login"), { replace: true }); return; }
        throw new Error(data.error || "Failed to load messages");
      }
      setHasMoreOlder(data.messages.length >= MESSAGE_PAGE_SIZE);
      const nextMessages = [...data.messages].sort((l, r) => new Date(l.createdAt).getTime() - new Date(r.createdAt).getTime());
      const nextSig = JSON.stringify(nextMessages.map((m) => [m.id, m.message, m.createdAt, m.senderRole]));
      if (nextSig !== lastMessageSignatureRef.current) {
        justPrependedRef.current = false;
        lastMessageSignatureRef.current = nextSig;
        setMessages(nextMessages);
      }
      setConversations((prev) =>
        prev.map((item) => item.key === conversation.key && item.unreadCount > 0 ? { ...item, unreadCount: 0 } : item),
      );
    } catch (error) {
      const message = (error as { name?: string }).name === "AbortError"
        ? "Server is not responding. Please try again."
        : error instanceof Error ? error.message : "Failed to load messages";
      if (!silent) {
        setErrorMessage(message);
        toast.error(message);
      }
    } finally {
      window.clearTimeout(timeoutId);
      if (!silent) setIsLoadingMessages(false);
    }
  }, [navigate]);

  const loadOlderMessages = useCallback(async () => {
    const conversation = activeConversationRef.current;
    if (!conversation || isLoadingOlder || !hasMoreOlder || messages.length === 0) return;
    const oldestId = messages.reduce((min, m) => Math.min(min, m.id), messages[0].id);
    const container = scrollRef.current;
    const previousHeight = container?.scrollHeight ?? 0;
    setIsLoadingOlder(true);
    try {
      const response = await fetch(
        `/api/chats/admin/${conversation.clientId}?${buildQueryString(conversation)}&before=${oldestId}&limit=${MESSAGE_PAGE_SIZE}`,
        { headers: { ...getAgencyAdminAuthHeaders() } },
      );
      const data = await readSafeJson<{ messages?: ChatMessage[]; error?: string }>(response);
      if (!response.ok || !data.messages) return;
      setHasMoreOlder(data.messages.length >= MESSAGE_PAGE_SIZE);
      if (data.messages.length === 0) return;
      justPrependedRef.current = true;
      setMessages((prev) => {
        const seen = new Set(prev.map((m) => m.id));
        const older = data.messages!.filter((m) => !seen.has(m.id));
        if (older.length === 0) return prev;
        const merged = [...older, ...prev].sort(
          (l, r) => new Date(l.createdAt).getTime() - new Date(r.createdAt).getTime(),
        );
        lastMessageSignatureRef.current = JSON.stringify(merged.map((m) => [m.id, m.message, m.createdAt, m.senderRole]));
        return merged;
      });
      requestAnimationFrame(() => {
        const el = scrollRef.current;
        if (el) el.scrollTop = el.scrollHeight - previousHeight;
      });
    } catch {
      /* keep existing messages on failure */
    } finally {
      setIsLoadingOlder(false);
    }
  }, [hasMoreOlder, isLoadingOlder, messages]);

  const handleMessagesScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    isNearBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
    if (el.scrollTop < 80 && hasMoreOlder && !isLoadingOlder) {
      void loadOlderMessages();
    }
  }, [hasMoreOlder, isLoadingOlder, loadOlderMessages]);

  useEffect(() => {
    const token = getAgencyAdminToken();
    if (!token) { clearAgencyAdminAuth(); navigate(adminPath("/login"), { replace: true }); return; }
    const controller = new AbortController();
    let lastId = 0;
    const run = async () => {
      try {
        const response = await fetch("/api/chats/admin/last-id", { headers: { ...getAgencyAdminAuthHeaders() }, signal: controller.signal });
        const data = await readSafeJson<{ lastId?: number; error?: string }>(response);
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
                  // Remove any pending optimistic messages with the same text/role so the
                  // confirmed message from SSE replaces them without a double-render.
                  const filtered = prev.filter(
                    (item) => !(item._optimistic && item.senderRole === next.senderRole && item.message === next.message),
                  );
                  const updated = [...filtered, next].sort(
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

  // Real-time delivery is handled by the SSE stream; we only re-sync the open
  // conversation when the tab regains focus (covers any events missed while the
  // stream was suspended in a backgrounded tab). No more 2.5s polling loop.
  useEffect(() => {
    if (!activeConversationKey) return;

    const handleVisibility = () => {
      if (document.visibilityState !== "visible") return;
      const conversation = activeConversationRef.current;
      if (
        !conversation ||
        conversation.key !== activeConversationKey ||
        messagePollInFlightRef.current
      ) {
        return;
      }
      messagePollInFlightRef.current = true;
      void loadMessages(conversation, true).finally(() => {
        messagePollInFlightRef.current = false;
      });
    };

    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [activeConversationKey, loadMessages]);

  useEffect(() => {
    if (!pendingConversation) return;
    const actual = conversations.find((item) => item.key === pendingConversation.key);
    if (actual) {
      setPendingConversation(null);
      setActiveConversationKey(actual.key);
    }
  }, [conversations, pendingConversation]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    if (justPrependedRef.current) { justPrependedRef.current = false; return; }
    if (isNearBottomRef.current) {
      el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
    }
    // If the loaded batch doesn't fill the viewport there's no scrollbar,
    // so the onScroll trigger never fires — kick off the older-load here.
    if (el.scrollHeight <= el.clientHeight && hasMoreOlder && !isLoadingOlder) {
      void loadOlderMessages();
    }
  }, [messages, hasMoreOlder, isLoadingOlder, loadOlderMessages]);

  // Presence heartbeat: marks this admin online while the tab is visible so
  // clients see the agency as online. Closing the tab fires an offline beacon;
  // otherwise presence lapses to offline ~40s after the last heartbeat.
  useEffect(() => {
    const sendHeartbeat = () => {
      if (document.visibilityState !== "visible") return;
      void fetch("/api/chats/admin/heartbeat", {
        method: "POST",
        headers: { ...getAgencyAdminAuthHeaders() },
        keepalive: true,
      }).catch(() => {});
    };
    const goOffline = () => {
      void fetch("/api/chats/admin/offline", {
        method: "POST",
        headers: { ...getAgencyAdminAuthHeaders() },
        keepalive: true,
      }).catch(() => {});
    };

    sendHeartbeat();
    const interval = window.setInterval(sendHeartbeat, 25_000);
    document.addEventListener("visibilitychange", sendHeartbeat);
    window.addEventListener("beforeunload", goOffline);

    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", sendHeartbeat);
      window.removeEventListener("beforeunload", goOffline);
    };
  }, []);

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

    // Optimistic update — show the message instantly with a temp negative ID
    const tempId = -Date.now();
    const optimistic: ChatMessage = {
      id: tempId,
      clientId: activeConversation.clientId,
      conversationType: activeConversation.conversationType,
      agencyId: activeConversation.agencyId,
      agencyName: activeConversation.agencyName,
      senderRole: "agency",
      senderName: admin?.username || admin?.agencyName || "Support",
      message: messageText,
      createdAt: new Date().toISOString(),
      _optimistic: true,
    };
    setMessages((prev) => {
      const next = [...prev, optimistic];
      lastMessageSignatureRef.current = JSON.stringify(next.map((m) => [m.id, m.message, m.createdAt, m.senderRole]));
      isNearBottomRef.current = true; // just sent — always scroll
      return next;
    });
    setDraft("");
    if (textareaRef.current) textareaRef.current.style.height = "auto";

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
      // Replace the optimistic message with the confirmed one from the server
      setMessages((prev) => {
        const without = prev.filter((m) => m.id !== tempId);
        if (without.some((m) => m.id === data.message!.id)) return without;
        const next = [...without, data.message!].sort(
          (l, r) => new Date(l.createdAt).getTime() - new Date(r.createdAt).getTime(),
        );
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
      scheduleConversationRefresh();
    } catch (error) {
      // Revert: remove optimistic message and restore the draft
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
      setDraft(messageText);
      const message = error instanceof Error ? error.message : "Failed to send message";
      setErrorMessage(message);
      toast.error(message);
    } finally {
      setIsSending(false);
    }
  }, [activeConversation, admin, navigate, scheduleConversationRefresh]);

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
        /* ── Design tokens ── */
        .asc-root {
          --msn-blue: #4f6ef7;
          --msn-blue-dark: #3d5bf5;
          --msn-blue-light: #eef1ff;
          --msn-sidebar-bg: #ffffff;
          --msn-sidebar-hover: #f6f8ff;
          --msn-sidebar-active: #eef1ff;
          --msn-header-bg: #ffffff;
          --msn-chat-bg: #f3f4f8;
          --msn-bubble-in: #ffffff;
          --msn-bubble-in-text: #1a1d2e;
          --msn-bubble-out: #4f6ef7;
          --msn-bubble-out-text: #ffffff;
          --msn-divider: #eaecf0;
          --msn-text-primary: #111827;
          --msn-text-secondary: #6b7280;
          --msn-text-muted: #9ca3af;
          --msn-online: #10b981;
          --msn-unread: #ef4444;
          --msn-shadow-xs: 0 1px 2px rgba(0,0,0,0.06);
          --msn-shadow-sm: 0 1px 4px rgba(0,0,0,0.08), 0 2px 8px rgba(0,0,0,0.04);
          --msn-shadow-md: 0 4px 16px rgba(0,0,0,0.10), 0 1px 4px rgba(0,0,0,0.06);
        }

        /* ── Skeleton shimmer ── */
        @keyframes ascShimmer {
          0%   { background-position: -400px 0; }
          100% { background-position: 400px 0; }
        }
        .asc-skeleton {
          background: linear-gradient(90deg, #f0f0f0 25%, #e8e8e8 50%, #f0f0f0 75%);
          background-size: 800px 100%;
          animation: ascShimmer 1.6s ease-in-out infinite;
        }

        /* ── Entry animations ── */
        @keyframes fadeSlideUp { from { opacity:0; transform:translateY(6px); } to { opacity:1; transform:none; } }
        @keyframes slideIn     { from { opacity:0; transform:translateX(-8px); } to { opacity:1; transform:none; } }
        @keyframes popIn       { from { opacity:0; transform:scale(0.90); } to { opacity:1; transform:scale(1); } }
        .asc-msg-row   { animation: fadeSlideUp 0.20s cubic-bezier(.22,1,.36,1) both; }
        .asc-conv-item { animation: slideIn 0.16s cubic-bezier(.22,1,.36,1) both; }
        .asc-bubble-pop{ animation: popIn 0.16s cubic-bezier(.34,1.56,.64,1) both; }

        /* ── Scrollbars ── */
        .asc-scrollbar::-webkit-scrollbar       { width: 5px; }
        .asc-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .asc-scrollbar::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.10); border-radius: 10px; }
        .asc-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(0,0,0,0.20); }

        /* ── Bubbles ── */
        .asc-bubble-out-style {
          background: linear-gradient(135deg, #6580f8 0%, #4f6ef7 60%, #3d5bf5 100%);
          box-shadow: 0 3px 12px rgba(79,110,247,0.30);
        }
        .asc-bubble-in-style {
          background: #ffffff;
          box-shadow: var(--msn-shadow-sm);
          border: 1px solid #eaecf0;
        }

        /* ── Chat background ── */
        .asc-chat-bg { background-color: var(--msn-chat-bg); }

        /* ── Search & compose focus ── */
        .asc-search:focus { border-color: var(--msn-blue) !important; box-shadow: 0 0 0 3px rgba(79,110,247,0.15) !important; background: #fff !important; }
        .asc-compose-inner:focus-within { border-color: var(--msn-blue) !important; box-shadow: 0 0 0 3px rgba(79,110,247,0.12) !important; background: #fff !important; }
        .asc-textarea { outline: none; }

        /* ── Send button ── */
        @keyframes asc-spin { to { transform: rotate(360deg); } }
        .animate-spin { animation: asc-spin 0.8s linear infinite; }
        .asc-send-btn { background: linear-gradient(135deg, #6580f8, #4f6ef7); box-shadow: 0 2px 8px rgba(79,110,247,0.35); transition: transform 0.12s, box-shadow 0.12s; }
        .asc-send-btn:not(:disabled):hover  { transform: scale(1.07); box-shadow: 0 4px 14px rgba(79,110,247,0.45); }
        .asc-send-btn:not(:disabled):active { transform: scale(0.94); }
        .asc-send-btn:disabled { background: #e5e7eb; box-shadow: none; }

        /* ── Online pulse ── */
        @keyframes onlinePulse {
          0%,100% { box-shadow: 0 0 0 0 rgba(16,185,129,0.5); }
          60%      { box-shadow: 0 0 0 5px rgba(16,185,129,0); }
        }
        .asc-online-dot { animation: onlinePulse 2.2s ease infinite; }

        /* ── Compose elevation ── */
        .asc-compose-wrap { background: #ffffff; border-top: 1px solid var(--msn-divider); }
      `}</style>

      <div className="asc-root flex flex-col" style={{ height: "calc(100vh - 130px)", minHeight: 440 }}>

        {/* ── Page title bar ── */}
        <div className="mb-4 flex flex-shrink-0 items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl shadow-md" style={{ background: "linear-gradient(135deg, #6580f8 0%, #4f6ef7 50%, #3d5bf5 100%)" }}>
            <MessageCircle className="h-5 w-5 text-white" />
          </div>
          <div>
            <h2 className="text-[21px] font-extrabold leading-tight tracking-tight" style={{ color: "var(--msn-text-primary)" }}>Messages</h2>
            <p className="text-[12px] font-medium mt-0.5" style={{ color: "var(--msn-text-muted)" }}>Client support inbox</p>
          </div>
          {totalUnread > 0 && (
            <span className="ml-1 flex items-center gap-1 rounded-full px-3 py-1 text-[12px] font-bold text-white shadow-sm" style={{ background: "var(--msn-unread)" }}>
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-white opacity-90" />
              {totalUnread} unread
            </span>
          )}
          <div className="ml-auto flex items-center gap-2">
            <span className="rounded-full px-3 py-1.5 text-[12px] font-semibold" style={{ background: "var(--msn-blue-light)", color: "var(--msn-blue)", border: "1px solid rgba(79,110,247,0.2)" }}>
              ⚡ Quick replies
            </span>
          </div>
        </div>

        {/* ── Chat shell ── */}
        <div className="flex flex-1 overflow-hidden rounded-2xl" style={{ boxShadow: "var(--msn-shadow-md)", border: "1px solid var(--msn-divider)", background: "#fff" }}>

          {/* ── Sidebar ── */}
          <div className={`flex flex-col ${
            mobileView === "chat" ? "hidden md:flex md:w-[340px] md:min-w-[300px]" : "flex w-full md:w-[340px] md:min-w-[300px]"
          }`} style={{ borderRight: "1px solid var(--msn-divider)", background: "var(--msn-sidebar-bg)" }}>

            {/* Sidebar header */}
            <div className="flex-shrink-0 px-5 pt-5 pb-4" style={{ borderBottom: "1px solid var(--msn-divider)" }}>
              <div className="flex items-center justify-between">
                <p className="text-[18px] font-extrabold tracking-tight" style={{ color: "var(--msn-text-primary)" }}>Chats</p>
                <span className="rounded-full px-2.5 py-0.5 text-[11px] font-bold" style={{ background: "var(--msn-blue-light)", color: "var(--msn-blue)" }}>
                  {effectiveConversations.length}
                </span>
              </div>
              <p className="text-[12px] mt-0.5" style={{ color: "var(--msn-text-muted)" }}>
                {filteredConversations.length} shown
                {totalUnread > 0 && <span className="ml-2 font-semibold" style={{ color: "var(--msn-unread)" }}>· {totalUnread} unread</span>}
              </p>
            </div>

            {/* Search + filters */}
            <div className="flex-shrink-0 px-4 pt-3 pb-2.5" style={{ borderBottom: "1px solid var(--msn-divider)" }}>
              <div className="relative mb-2.5">
                <Search className="absolute left-3.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2" style={{ color: "var(--msn-text-muted)" }} />
                <input
                  type="text"
                  placeholder="Search conversations…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="asc-search h-9 w-full rounded-xl border pl-10 pr-4 text-[13px] font-medium outline-none transition-all"
                  style={{ borderColor: "var(--msn-divider)", background: "#f6f7fb", color: "var(--msn-text-primary)" }}
                />
              </div>
              <div className="mb-2.5">
                <StatusTabs value={statusFilter} onChange={setStatusFilter} />
              </div>
              <FilterSortBar filter={filter} sort={sort} onFilterChange={setFilter} onSortChange={setSort} />
            </div>

            {/* Conversation list */}
            <div className="asc-scrollbar flex-1 overflow-y-auto">
              {isLoadingConversations ? (
                <LoadingDots />
              ) : errorMessage && conversations.length === 0 ? (
                <div className="flex flex-col items-center gap-3 p-6 text-center">
                  <AlertCircle className="h-8 w-8" style={{ color: "#ef4444" }} />
                  <p className="text-[13px] font-medium leading-snug" style={{ color: "var(--msn-text-secondary)" }}>{errorMessage}</p>
                  <button
                    onClick={() => { setErrorMessage(""); void loadConversations(false); }}
                    className="rounded-full px-4 py-1.5 text-[13px] font-semibold text-white transition-opacity hover:opacity-90"
                    style={{ background: "var(--msn-blue)" }}
                  >
                    Retry
                  </button>
                </div>
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
            <div className="flex-shrink-0 grid grid-cols-2 gap-2 p-3" style={{ borderTop: "1px solid var(--msn-divider)", background: "#fafbff" }}>
              <div className="rounded-xl px-3 py-2.5 text-center" style={{ background: "#f0f1f5" }}>
                <p className="text-[22px] font-bold leading-none" style={{ color: "var(--msn-text-primary)" }}>{effectiveConversations.length}</p>
                <p className="text-[11px] font-semibold mt-0.5" style={{ color: "var(--msn-text-muted)" }}>Total</p>
              </div>
              <div className="rounded-xl px-3 py-2.5 text-center" style={{ background: totalUnread > 0 ? "rgba(239,68,68,0.08)" : "var(--msn-blue-light)" }}>
                <p className="text-[22px] font-bold leading-none" style={{ color: totalUnread > 0 ? "var(--msn-unread)" : "var(--msn-blue)" }}>{totalUnread}</p>
                <p className="text-[11px] font-semibold mt-0.5" style={{ color: totalUnread > 0 ? "var(--msn-unread)" : "var(--msn-blue)" }}>Unread</p>
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
                    <span
                      className={`absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full border-2 border-white ${activeConversation.clientOnline ? "asc-online-dot" : ""}`}
                      style={{ background: activeConversation.clientOnline ? "var(--msn-online)" : "#9ca3af" }}
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[16px] font-bold leading-tight" style={{ color: "var(--msn-text-primary)" }}>{activeConversation.clientName}</p>
                    <p className="text-[12px] font-medium" style={{ color: activeConversation.clientOnline ? "var(--msn-online)" : "var(--msn-text-muted)" }}>
                      {activeConversation.clientOnline ? "Active now" : "Offline"}
                    </p>
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
            <div ref={scrollRef} onScroll={handleMessagesScroll} className="asc-scrollbar asc-chat-bg flex flex-1 flex-col gap-4 overflow-y-auto p-5">
              {isLoadingMessages ? (
                <MessageSkeleton />
              ) : errorMessage ? (
                <div className="mx-auto max-w-sm rounded-2xl px-5 py-4 text-center text-[14px] font-semibold" style={{ background: "#fff0f0", color: "#c0392b", border: "1px solid #ffd0d0" }}>
                  {errorMessage}
                </div>
              ) : !activeConversation ? (
                <EmptyState label="Select a conversation to get started." />
              ) : messages.length === 0 ? (
                <EmptyState label={activeConversation.description || "No messages yet. Say hello!"} />
              ) : (
                <>
                  {/* ── Load earlier messages ── */}
                  {hasMoreOlder && (
                    <div className="flex justify-center py-2">
                      <button
                        onClick={() => void loadOlderMessages()}
                        disabled={isLoadingOlder}
                        className="flex items-center gap-2 rounded-full px-4 py-1.5 text-[12px] font-semibold transition-all disabled:opacity-60"
                        style={{ background: "#e4e6eb", color: "var(--msn-text-secondary)", border: "1px solid var(--msn-divider)" }}
                      >
                        {isLoadingOlder ? (
                          <>
                            <RefreshCw className="h-3 w-3 animate-spin" />
                            Loading earlier messages…
                          </>
                        ) : (
                          <>
                            <RefreshCw className="h-3 w-3" />
                            Load earlier messages
                          </>
                        )}
                      </button>
                    </div>
                  )}
                  {messageGroups.map(({ label, messages: groupMsgs }) => (
                    <div key={label} className="flex flex-col gap-2">
                      <DateDivider label={label} />
                      {groupMsgs.map((msg) => (
                        <MessageBubble key={msg.id} message={msg} onCopy={copyMessage} />
                      ))}
                    </div>
                  ))}
                </>
              )}
            </div>

            {/* Compose bar */}
            <div className="asc-compose-wrap flex-shrink-0 px-4 pt-2 pb-4">
              {/* Quick reply row */}
              <div className="flex items-center gap-2 mb-2">
                <QuickReplyPanel onSelect={(text) => setDraft(text)} />
                {draft.trim() && (
                  <span className="text-[11px]" style={{ color: "var(--msn-text-muted)" }}>
                    {draft.length} chars · Enter to send
                  </span>
                )}
              </div>
              {/* Input row */}
              <div className="asc-compose-inner flex items-end gap-2 rounded-2xl p-2" style={{ background: "#f6f7fb", border: "1.5px solid var(--msn-divider)", transition: "border-color 0.15s, box-shadow 0.15s, background 0.15s" }}>
                <textarea
                  ref={textareaRef}
                  placeholder={activeConversation ? `Message ${activeConversation.clientName}…` : "Select a conversation to reply…"}
                  value={draft}
                  rows={1}
                  disabled={!activeConversation || isSending}
                  onChange={(e) => {
                    setDraft(e.target.value);
                    e.target.style.height = "auto";
                    e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px";
                  }}
                  onKeyDown={handleKeyDown}
                  className="asc-scrollbar asc-textarea flex-1 resize-none bg-transparent px-2 py-1.5 text-[14.5px] leading-relaxed outline-none disabled:cursor-not-allowed disabled:opacity-40"
                  style={{ maxHeight: 120, minHeight: 36, color: "var(--msn-text-primary)" }}
                />
                <button
                  onClick={() => void sendMessage()}
                  disabled={isSending || !draft.trim() || !activeConversation}
                  className="asc-send-btn flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl text-white"
                  aria-label="Send message"
                >
                  <Send className="h-4 w-4" />
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
