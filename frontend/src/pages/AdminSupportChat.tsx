import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  CheckCheck,
  MessageCircle,
  Search,
  Send,
  Users,
  ArrowLeft,
  Inbox,
  SlidersHorizontal,
  ChevronDown,
  Bot,
  Zap,
  Clock,
  Star,
  Filter,
  RefreshCw,
  Copy,
  Tag,
  AlertCircle,
} from "lucide-react";
import { toast } from "@/components/ui/sonner";
import { useNavigate, useSearchParams } from "react-router-dom";
import { adminPath } from "@/lib/routes";
import {
  clearAgencyAdminAuth,
  getAgencyAdminAuthHeaders,
  getAgencyAdminToken,
  getStoredAgencyAdmin,
} from "@/lib/agencyAdminAuth";
import type { AdminConversation, ChatMessage, ConversationType } from "@/lib/chat";
import { streamSse } from "@/lib/sse";

/* ─── Types ─────────────────────────────────────────────────────────────── */

type SortOption = "newest" | "oldest" | "unread" | "name";
type FilterOption = "all" | "unread" | "support" | "agency";
type AiStatus = "online" | "offline" | "checking";

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

function firstName(name: string) {
  return name.trim().split(/\s+/)[0] || "there";
}

function normalizeText(value: string) {
  return value.trim().toLowerCase();
}

function compactWhitespace(value: string) {
  return value.replace(/\s+/g, " ").trim();
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

function getLatestClientMessage(messages: ChatMessage[]) {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    if (messages[index].senderRole === "client") return messages[index];
  }
  return null;
}

function buildAutoGreeting(conversation: AdminConversation) {
  const greetingName = firstName(conversation.clientName);
  if (conversation.conversationType === "agency" && conversation.agencyName) {
    return `Hi ${greetingName}, thank you for messaging ${conversation.agencyName}. How can we help you today?`;
  }
  return `Hi ${greetingName}, thank you for reaching out to our support team. How can we help you today?`;
}

function buildOfflineAutoReplies(
  conversation: AdminConversation,
  messages: ChatMessage[],
) {
  const greeting = buildAutoGreeting(conversation);
  const latestClientMessage = getLatestClientMessage(messages);
  if (!latestClientMessage) {
    return [
      greeting,
      "Thank you for your message. Please share the details of what you need help with, and we will assist you as soon as possible.",
      "Could you let us know your preferred maid profile, timeline, and any key requirements so we can guide you better?",
    ];
  }

  const text = normalizeText(latestClientMessage.message);
  const greetingName = firstName(conversation.clientName);

  if (/(price|pricing|cost|budget|fee|fees|salary|how much)/.test(text)) {
    return [
      `Hi ${greetingName}, thank you for your question. We can help with the pricing details for this request.`,
      "Please let us know your budget range and the type of helper you need, and we will recommend the most suitable option.",
      "We can also break down the agency fees, salary expectations, and any applicable processing costs for you.",
    ];
  }

  if (/(interview|schedule|appointment|meet|viewing|visit|available time|when can)/.test(text)) {
    return [
      `Hi ${greetingName}, we can help arrange the next step for you.`,
      "Please share your preferred date and time, and we will check availability and get back to you shortly.",
      "If you already have a shortlist or reference code, send it over and we will coordinate the interview or viewing faster.",
    ];
  }

  if (/(available|availability|still available|can i hire|open)/.test(text)) {
    return [
      `Hi ${greetingName}, thank you for checking with us.`,
      "We will confirm the current availability for you and update you as soon as possible.",
      "If you have a specific reference code or profile in mind, please send it so we can verify the status accurately.",
    ];
  }

  if (/(document|documents|paperwork|permit|application|process|requirement|required)/.test(text)) {
    return [
      `Hi ${greetingName}, we can guide you through the requirements.`,
      "Please let us know whether this is for a new hire, transfer, or replacement so we can advise on the correct documents and process.",
      "Once we have that, we will share the required paperwork and next steps with you.",
    ];
  }

  if (/(recommend|suggest|match|suitable|shortlist|looking for|need a maid|helper)/.test(text)) {
    return [
      `Hi ${greetingName}, thank you for sharing what you are looking for.`,
      "Please tell us the main requirements such as childcare, elderly care, cooking, language preference, and budget, and we will suggest suitable profiles.",
      "If you already saw a profile you like, send the reference code and we can help compare it with other matching options.",
    ];
  }

  if (/(status|update|follow up|follow-up|progress|any news)/.test(text)) {
    return [
      `Hi ${greetingName}, thank you for following up.`,
      "We are checking the latest status for you and will update you shortly.",
      "If there is a specific application, interview, or profile you are referring to, please mention it so we can respond more precisely.",
    ];
  }

  if (/(thank you|thanks)/.test(text)) {
    return [
      `You're welcome, ${greetingName}.`,
      "We're happy to help. If you need anything else, just let us know.",
      "If you want, we can also help with the next step such as recommendations, scheduling, or paperwork guidance.",
    ];
  }

  return [
    greeting,
    "Thank you for the details. We are reviewing your request and will get back to you shortly.",
    "If you can share a little more about what you need, such as the profile, timeline, or concern, we can assist you more accurately.",
  ];
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

function AiStatusBanner({ status, onRetry }: { status: AiStatus; onRetry: () => void }) {
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
}

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

function AiSuggestionStrip({
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
}

/* ─── Main component ─────────────────────────────────────────────────────── */

const AdminSupportChat = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const queryClientId = Number(searchParams.get("clientId") ?? "0");
  const queryConversationType: ConversationType = searchParams.get("type") === "agency" ? "agency" : "support";
  const queryAgencyId = queryConversationType === "agency" ? Number(searchParams.get("agencyId") ?? "0") : undefined;
  const queryClientName = searchParams.get("clientName") ?? "";
  const [pendingConversation, setPendingConversation] = useState<AdminConversation | null>(null);
  const [mobileView, setMobileView] = useState<"list" | "chat">("list");
  const [conversations, setConversations] = useState<AdminConversation[]>([]);
  const [activeConversationKey, setActiveConversationKey] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterOption>("all");
  const [sort, setSort] = useState<SortOption>("newest");
  const [isLoadingConversations, setIsLoadingConversations] = useState(true);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [aiStatus, setAiStatus] = useState<AiStatus>("checking");

  const scrollRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const activeConversationRef = useRef<AdminConversation | null>(null);
  const lastMessageSignatureRef = useRef("");
  const admin = getStoredAgencyAdmin();

  const activeConversation = useMemo(
    () => conversations.find((item) => item.key === activeConversationKey) ?? pendingConversation,
    [activeConversationKey, conversations, pendingConversation],
  );

  useEffect(() => { activeConversationRef.current = activeConversation; }, [activeConversation]);

  // Check AI status
  const checkAiStatus = useCallback(async () => {
    setAiStatus("checking");
    try {
      const response = await fetch("/api/ai/status", { headers: { ...getAgencyAdminAuthHeaders() } }).catch(() => null);
      setAiStatus(response?.ok ? "online" : "offline");
    } catch {
      setAiStatus("offline");
    }
  }, []);

  useEffect(() => { void checkAiStatus(); }, [checkAiStatus]);

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

    return sortConversations(result, sort);
  }, [effectiveConversations, search, filter, sort]);

  const loadConversations = useCallback(async (silent = false) => {
    const token = getAgencyAdminToken();
    if (!token) { clearAgencyAdminAuth(); navigate(adminPath("/login"), { replace: true }); return; }
    try {
      setErrorMessage("");
      const response = await fetch("/api/chats/admin", { headers: { ...getAgencyAdminAuthHeaders() } });
      const data = (await response.json().catch(() => ({}))) as { conversations?: AdminConversation[]; error?: string };
      if (!response.ok || !data.conversations) {
        if (response.status === 401) { clearAgencyAdminAuth(); navigate(adminPath("/login"), { replace: true }); return; }
        throw new Error(data.error || "Failed to load conversations");
      }

      setConversations(data.conversations);
      setActiveConversationKey((prev) => {
        const queryKey = queryClientId
          ? `${queryClientId}:${queryConversationType}:${queryAgencyId ?? 0}`
          : null;

        if (queryKey) {
          const existing = data.conversations.some((c) => c.key === queryKey);
          if (existing) {
            setPendingConversation(null);
            return queryKey;
          }

          if (queryConversationType === "support") {
            setPendingConversation({
              key: queryKey,
              clientId: queryClientId,
              conversationType: "support",
              agencyId: undefined,
              agencyName: "",
              clientName: queryClientName || `Client ${queryClientId}`,
              clientEmail: "",
              clientCompany: "",
              lastMessage: "Ready to start a support conversation.",
              lastMessageAt: new Date().toISOString(),
              unreadCount: 0,
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
  }, [navigate, queryAgencyId, queryClientId, queryClientName, queryConversationType]);

  const loadMessages = useCallback(async (conversation: AdminConversation, silent = false) => {
    try {
      if (!silent) setIsLoadingMessages(true);
      setErrorMessage("");
      const response = await fetch(
        `/api/chats/admin/${conversation.clientId}?${buildQueryString(conversation)}`,
        { headers: { ...getAgencyAdminAuthHeaders() } },
      );
      const data = (await response.json().catch(() => ({}))) as { messages?: ChatMessage[]; error?: string };
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
        const data = (await response.json().catch(() => ({}))) as { lastId?: number };
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
                setMessages((prev) => prev.some((item) => item.id === next.id) ? prev : [...prev, next]);
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

  useEffect(() => { void loadConversations(false); }, [loadConversations]);

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
    if (aiStatus !== "offline" || !activeConversation || draft.trim()) return;
    const suggestions = buildOfflineAutoReplies(activeConversation, messages);
    if (suggestions[0]) setDraft(suggestions[0]);
  }, [activeConversation, aiStatus, draft, messages]);

  const copyMessage = (text: string) => {
    navigator.clipboard.writeText(text).then(() => toast.success("Copied to clipboard")).catch(() => toast.error("Copy failed"));
  };

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
      const data = (await response.json().catch(() => ({}))) as { message?: ChatMessage; error?: string };
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
      await loadConversations(true);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to send message";
      setErrorMessage(message);
      toast.error(message);
    } finally {
      setIsSending(false);
    }
  }, [activeConversation, loadConversations, navigate]);

  const sendMessage = useCallback(async () => {
    await sendText(draft);
  }, [draft, sendText]);

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
            <button
              onClick={() => navigate(adminPath("/chatbot-config"))}
              className="rounded-full px-3 py-1.5 text-[12px] font-semibold transition-colors hover:opacity-80"
              style={{ background: "var(--msn-blue-light)", color: "var(--msn-blue)", border: "1px solid #c2deff" }}
            >
              Configure bot
            </button>
            <AiStatusBanner status={aiStatus} onRetry={checkAiStatus} />
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
                  placeholder="Search Messenger"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="asc-search h-10 w-full rounded-full border pl-10 pr-4 text-[14px] font-medium outline-none transition-all"
                  style={{ borderColor: "var(--msn-divider)", background: "#f0f2f5", color: "var(--msn-text-primary)" }}
                />
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
                </>
              ) : (
                <p className="text-[15px] font-semibold" style={{ color: "var(--msn-text-secondary)" }}>{headerSubtitle}</p>
              )}
            </div>

            {/* AI / fallback suggestions strip */}
            {(aiStatus === "online" || aiStatus === "offline") && activeConversation && (
              <AiSuggestionStrip
                conversation={activeConversation}
                messages={messages}
                status={aiStatus}
                onSelect={(text) => void sendText(text)}
              />
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
                <EmptyState label="No messages yet. Say hello!" />
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
