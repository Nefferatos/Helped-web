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

function getStatusConfig(status?: SupportConversationStatus) {
  switch (status) {
    case "OPEN":           return { label: "Open",            color: "#1d4ed8", bg: "#eff6ff", dot: "#2563eb" };
    case "WAITING_CLIENT": return { label: "Waiting Client",  color: "#9a3412", bg: "#fff7ed", dot: "#ea580c" };
    case "WAITING_SUPPORT":return { label: "Waiting Support", color: "#92400e", bg: "#fef3c7", dot: "#d97706" };
    case "RESOLVED":       return { label: "Resolved",        color: "#065f46", bg: "#ecfdf5", dot: "#059669" };
    case "CLOSED":         return { label: "Closed",          color: "#1f2937", bg: "#f3f4f6", dot: "#6b7280" };
    default:               return { label: "Open",            color: "#1d4ed8", bg: "#eff6ff", dot: "#2563eb" };
  }
}

function getPriorityConfig(priority?: SupportPriority) {
  switch (priority) {
    case "URGENT": return { color: "#991b1b", bg: "#fef2f2", label: "Urgent" };
    case "HIGH":   return { color: "#9a3412", bg: "#fff7ed", label: "High" };
    case "MEDIUM": return { color: "#92400e", bg: "#fffbeb", label: "Medium" };
    default:       return { color: "#14532d", bg: "#f0fdf4", label: "Low" };
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
    case "newest":  return sorted.sort((a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime());
    case "oldest":  return sorted.sort((a, b) => new Date(a.lastMessageAt).getTime() - new Date(b.lastMessageAt).getTime());
    case "unread":  return sorted.sort((a, b) => b.unreadCount - a.unreadCount || new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime());
    case "name":    return sorted.sort((a, b) => a.clientName.localeCompare(b.clientName));
    default:        return sorted;
  }
}

/* ─── Avatar helpers ─────────────────────────────────────────────────────── */

const AVATAR_GRADIENTS = [
  "linear-gradient(135deg,#667eea,#764ba2)",
  "linear-gradient(135deg,#f093fb,#f5576c)",
  "linear-gradient(135deg,#4facfe,#00f2fe)",
  "linear-gradient(135deg,#43e97b,#38f9d7)",
  "linear-gradient(135deg,#fa709a,#fee140)",
  "linear-gradient(135deg,#a18cd1,#fbc2eb)",
  "linear-gradient(135deg,#ffecd2,#fcb69f)",
  "linear-gradient(135deg,#a1c4fd,#c2e9fb)",
];

function avatarGradient(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_GRADIENTS[Math.abs(hash) % AVATAR_GRADIENTS.length];
}

/* ─── Sub-components ────────────────────────────────────────────────────── */

function AvatarBubble({
  name,
  imageUrl,
  size = "md",
  showRing = false,
}: {
  name: string;
  imageUrl?: string;
  size?: "xs" | "sm" | "md" | "lg";
  showRing?: boolean;
}) {
  const sizeMap = { xs: 28, sm: 36, md: 44, lg: 52 };
  const px = sizeMap[size];
  const fontSize = size === "lg" ? 18 : size === "md" ? 15 : size === "sm" ? 13 : 11;
  return (
    <div
      className="flex-shrink-0 flex items-center justify-center rounded-full font-bold select-none"
      style={{
        width: px,
        height: px,
        fontSize,
        background: imageUrl ? "transparent" : avatarGradient(name),
        color: "#fff",
        boxShadow: showRing ? "0 0 0 3px rgba(79,110,247,0.25), 0 2px 8px rgba(0,0,0,0.12)" : "0 2px 6px rgba(0,0,0,0.10)",
        flexShrink: 0,
        letterSpacing: "0.02em",
      }}
    >
      {imageUrl
        ? <img src={imageUrl} alt={name} className="w-full h-full rounded-full object-cover" />
        : initials(name)
      }
    </div>
  );
}

function OnlineDot({ online, size = "sm" }: { online?: boolean; size?: "sm" | "md" }) {
  const px = size === "md" ? 13 : 10;
  return (
    <span
      className={online ? "asc-pulse-dot" : ""}
      style={{
        display: "block",
        width: px,
        height: px,
        borderRadius: "50%",
        background: online ? "#10b981" : "#d1d5db",
        border: "2px solid #fff",
        boxShadow: online ? "0 0 0 0 rgba(16,185,129,0.4)" : "none",
      }}
    />
  );
}

function UnreadBadge({ count }: { count: number }) {
  if (!count) return null;
  return (
    <span className="asc-badge-pop inline-flex min-w-[20px] h-5 items-center justify-center rounded-full px-1.5 leading-none text-white"
      style={{ fontSize: 10.5, fontWeight: 900, background: "linear-gradient(135deg,#f87171,#ef4444)", boxShadow: "0 2px 6px rgba(239,68,68,0.4)" }}>
      {count > 99 ? "99+" : count}
    </span>
  );
}

function MessageSkeleton() {
  const rows = [
    { own: false, w: "56%", h: 44 },
    { own: true,  w: "42%", h: 40 },
    { own: false, w: "68%", h: 60 },
    { own: true,  w: "50%", h: 40 },
    { own: false, w: "36%", h: 40 },
  ];
  return (
    <div className="flex flex-col gap-5 py-3 px-1">
      {rows.map((row, i) => (
        <div key={i} className={`flex items-end gap-2.5 ${row.own ? "ml-auto flex-row-reverse" : ""}`}
          style={{ maxWidth: "72%", animationDelay: `${i * 70}ms` }}>
          <div className="rounded-full asc-skeleton flex-shrink-0" style={{ width: 36, height: 36 }} />
          <div className="asc-skeleton rounded-2xl" style={{ width: row.w, height: row.h, borderRadius: 18 }} />
        </div>
      ))}
    </div>
  );
}

function LoadingDots() {
  return (
    <div className="flex flex-1 flex-col gap-2 px-3 py-4">
      {[78, 62, 88, 70, 52].map((w, i) => (
        <div key={i} className="flex items-center gap-3 px-2 py-2">
          <div className="rounded-full asc-skeleton flex-shrink-0" style={{ width: 40, height: 40 }} />
          <div className="flex flex-1 flex-col gap-2">
            <div className="h-3 rounded-full asc-skeleton" style={{ width: `${w}%` }} />
            <div className="h-2.5 rounded-full asc-skeleton" style={{ width: `${w - 18}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}

function EmptyState({ label, icon }: { label: string; icon?: "message" | "user" }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 p-10">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl"
        style={{ background: "linear-gradient(135deg,#eef1ff,#e0e7ff)", boxShadow: "0 4px 16px rgba(79,110,247,0.12)" }}>
        {icon === "user"
          ? <Users className="h-7 w-7" style={{ color: "#4f6ef7" }} />
          : <Inbox className="h-7 w-7" style={{ color: "#4f6ef7" }} />}
      </div>
      <p className="max-w-[220px] text-center leading-relaxed font-medium" style={{ fontSize: 13.5, color: "#374151" }}>{label}</p>
    </div>
  );
}

function DateDivider({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 my-3">
      <div className="h-px flex-1" style={{ background: "linear-gradient(to right, transparent, #e5e7eb)" }} />
      <span className="whitespace-nowrap rounded-full px-3 py-1 font-semibold tracking-wide"
        style={{ fontSize: 11, background: "#f1f3f9", color: "#374151", border: "1px solid #e5e7eb" }}>
        {label}
      </span>
      <div className="h-px flex-1" style={{ background: "linear-gradient(to left, transparent, #e5e7eb)" }} />
    </div>
  );
}

/* ─── Quick Reply Panel ─────────────────────────────────────────────────── */

function QuickReplyPanel({ onSelect }: { onSelect: (text: string) => void }) {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen((v) => !v)}
        className="flex items-center gap-1.5 rounded-full px-3 py-1.5 font-semibold transition-all hover:scale-105 active:scale-95"
        style={{ fontSize: 12, background: "linear-gradient(135deg,#eef1ff,#e0e7ff)", color: "#3d55d4", border: "1px solid rgba(79,110,247,0.2)", boxShadow: "0 1px 4px rgba(79,110,247,0.12)" }}
      >
        <Zap className="h-3 w-3" />
        Quick replies
        <ChevronDown className={`h-3 w-3 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} />
      </button>
      {isOpen && (
        <div className="asc-float-panel absolute bottom-full left-0 mb-2.5 z-20 w-80 rounded-2xl overflow-hidden"
          style={{ background: "#fff", boxShadow: "0 20px 48px rgba(0,0,0,0.14), 0 4px 12px rgba(0,0,0,0.06)", border: "1px solid #eaecf5" }}>
          <div className="px-4 py-3 flex items-center gap-2"
            style={{ background: "linear-gradient(135deg,#f8f9ff,#eef1ff)", borderBottom: "1px solid #eaecf5" }}>
            <Zap className="h-3.5 w-3.5" style={{ color: "#4f6ef7" }} />
            <p className="font-bold tracking-wide" style={{ fontSize: 12, color: "#1e3a8a" }}>QUICK REPLY TEMPLATES</p>
          </div>
          <div className="max-h-56 overflow-y-auto asc-scrollbar">
            {QUICK_REPLIES.map((r, i) => (
              <button
                key={r.label}
                onClick={() => { onSelect(r.text); setIsOpen(false); }}
                className="w-full px-4 py-3 text-left transition-all group"
                style={{ borderBottom: i < QUICK_REPLIES.length - 1 ? "1px solid #f3f4f8" : "none" }}
                onMouseEnter={e => { e.currentTarget.style.background = "#f8f9ff"; }}
                onMouseLeave={e => { e.currentTarget.style.background = ""; }}
              >
                <div className="flex items-center justify-between mb-1">
                  <p className="font-bold" style={{ fontSize: 12.5, color: "#111827" }}>{r.label}</p>
                  <span className="font-semibold rounded-full px-2 py-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                    style={{ fontSize: 10, background: "#eef1ff", color: "#3d55d4" }}>Use →</span>
                </div>
                <p className="leading-relaxed line-clamp-2" style={{ fontSize: 12, color: "#374151" }}>{r.text}</p>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Filter & Sort Bar ─────────────────────────────────────────────────── */

function FilterPill({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="rounded-full px-3.5 py-1.5 font-semibold transition-all hover:scale-105 active:scale-95"
      style={
        active
          ? { fontSize: 13, background: "linear-gradient(135deg,#6580f8,#4f6ef7)", color: "#fff", boxShadow: "0 2px 8px rgba(79,110,247,0.35)" }
          : { fontSize: 13, background: "#f0f1f6", color: "#111827", border: "1px solid #d1d5db" }
      }
    >
      {label}
    </button>
  );
}

function TypeFilterRow({ filter, setFilter }: { filter: FilterOption; setFilter: (f: FilterOption) => void }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const scroll = (dir: "left" | "right") => {
    if (scrollRef.current) scrollRef.current.scrollBy({ left: dir === "left" ? -100 : 100, behavior: "smooth" });
  };
  return (
    <div className="flex items-center gap-1">
      <button onClick={() => scroll("left")} className="flex-shrink-0 flex items-center justify-center rounded-lg transition-all hover:scale-105 active:scale-95"
        style={{ width: 24, height: 24, background: "#f0f1f6", border: "1px solid #d1d5db", color: "#374151" }}>
        <ChevronDown className="h-3 w-3" style={{ transform: "rotate(90deg)" }} />
      </button>
      <div ref={scrollRef} className="asc-hscroll flex gap-1.5 flex-1" style={{ overflowX: "auto", paddingBottom: 2 }}>
        {(["all", "unread", "support", "agency"] as FilterOption[]).map((f) => (
          <div key={f} className="flex-shrink-0">
            <FilterPill label={f.charAt(0).toUpperCase() + f.slice(1)} active={filter === f} onClick={() => setFilter(f)} />
          </div>
        ))}
      </div>
      <button onClick={() => scroll("right")} className="flex-shrink-0 flex items-center justify-center rounded-lg transition-all hover:scale-105 active:scale-95"
        style={{ width: 24, height: 24, background: "#f0f1f6", border: "1px solid #d1d5db", color: "#374151" }}>
        <ChevronDown className="h-3 w-3" style={{ transform: "rotate(-90deg)" }} />
      </button>
    </div>
  );
}


function StatusTabs({ value, onChange }: { value: StatusFilter; onChange: (value: StatusFilter) => void }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const tabs: { value: StatusFilter; label: string }[] = [
    { value: "ALL",             label: "All statuses" },
    { value: "OPEN",            label: "Open" },
    { value: "WAITING_SUPPORT", label: "Waiting support" },
    { value: "WAITING_CLIENT",  label: "Waiting client" },
    { value: "RESOLVED",        label: "Resolved" },
    { value: "CLOSED",          label: "Closed" },
  ];
  const scroll = (dir: "left" | "right") => {
    if (scrollRef.current) scrollRef.current.scrollBy({ left: dir === "left" ? -120 : 120, behavior: "smooth" });
  };
  return (
    <div className="flex items-center gap-1">
      <button
        onClick={() => scroll("left")}
        className="flex-shrink-0 flex items-center justify-center rounded-lg transition-all active:scale-95"
        style={{ width: 24, height: 24, background: "#f0f1f6", border: "1px solid #d1d5db", color: "#374151" }}
      >
        <ChevronDown className="h-3 w-3" style={{ transform: "rotate(90deg)" }} />
      </button>
      <div ref={scrollRef} className="asc-hscroll flex gap-1.5 flex-1" style={{ overflowX: "auto", paddingBottom: 2 }}>
        {tabs.map((tab) => {
          const cfg = tab.value !== "ALL" ? getStatusConfig(tab.value as SupportConversationStatus) : null;
          const isActive = value === tab.value;
          return (
            <button
              key={tab.value}
              onClick={() => onChange(tab.value)}
              className="rounded-full font-semibold flex items-center gap-1.5 flex-shrink-0 transition-colors"
              style={
                isActive
                  ? { fontSize: 12, padding: "5px 12px", whiteSpace: "nowrap", background: cfg ? cfg.bg : "#eef1ff", color: cfg ? cfg.color : "#1e3a8a", border: `1.5px solid ${cfg ? cfg.dot : "#4f6ef7"}`, fontWeight: 700 }
                  : { fontSize: 12, padding: "5px 12px", whiteSpace: "nowrap", background: "#f0f1f6", color: "#111827", border: "1px solid #d1d5db" }
              }
            >
              {isActive && (
                <span className="inline-block rounded-full flex-shrink-0"
                  style={{ width: 6, height: 6, background: cfg ? cfg.dot : "#4f6ef7" }} />
              )}
              {tab.label}
            </button>
          );
        })}
      </div>
      <button
        onClick={() => scroll("right")}
        className="flex-shrink-0 flex items-center justify-center rounded-lg transition-all active:scale-95"
        style={{ width: 24, height: 24, background: "#f0f1f6", border: "1px solid #d1d5db", color: "#374151" }}
      >
        <ChevronDown className="h-3 w-3" style={{ transform: "rotate(-90deg)" }} />
      </button>
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
  const statusCfg = getStatusConfig(conversation.status);
  const hasUnread = conversation.unreadCount > 0;
  const isSupport = conversation.conversationType === "support";

  return (
    <button
      onClick={onClick}
      className="group w-full text-left transition-all duration-150 rounded-xl px-3 py-3 mx-1 relative overflow-hidden"
      style={{
        width: "calc(100% - 8px)",
        background: isActive
          ? "linear-gradient(135deg,rgba(79,110,247,0.10),rgba(79,110,247,0.05))"
          : "transparent",
        borderLeft: isActive ? "2.5px solid #4f6ef7" : "2.5px solid transparent",
      }}
      onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = "rgba(0,0,0,0.03)"; }}
      onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = "transparent"; }}
    >
      {/* Unread shimmer accent */}
      {hasUnread && !isActive && (
        <div className="absolute inset-0 rounded-xl pointer-events-none"
          style={{ background: "linear-gradient(90deg,rgba(239,68,68,0.04),transparent)" }} />
      )}

      <div className="flex items-start gap-3">
        {/* Avatar + status */}
        <div className="relative flex-shrink-0">
          <AvatarBubble name={conversation.clientName} imageUrl={conversation.clientProfileImageUrl} size="md" showRing={isActive} />
          <div className="absolute -bottom-0.5 -right-0.5">
            <OnlineDot online={conversation.clientOnline} size="sm" />
          </div>
        </div>

        {/* Content */}
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-1 mb-1">
            <p className="truncate leading-snug"
              style={{ fontSize: 14, color: "#0f172a", fontWeight: hasUnread ? 700 : 600 }}>
              {conversation.clientName}
            </p>
            <span className="flex-shrink-0 mt-0.5"
              style={{ fontSize: 11.5, color: hasUnread ? "#dc2626" : "#374151", fontWeight: hasUnread ? 600 : 500 }}>
              {formatTime(conversation.lastMessageAt)}
            </span>
          </div>

          {/* Tags row */}
          <div className="flex items-center gap-1 mb-1.5 flex-wrap">
            <span className="rounded-md px-1.5 py-px font-bold uppercase tracking-wider"
              style={{ fontSize: 10, background: isSupport ? "#eef1ff" : "#f0fdf4", color: isSupport ? "#1e3a8a" : "#14532d" }}>
              {isSupport ? "Support" : "Agency"}
            </span>
            {conversation.status && (
              <span className="rounded-md px-1.5 py-px font-semibold"
                style={{ fontSize: 10, background: statusCfg.bg, color: statusCfg.color }}>
                {statusCfg.label}
              </span>
            )}
          </div>

          {/* Preview */}
          <p className="line-clamp-1 leading-5"
            style={{ fontSize: 12.5, color: hasUnread ? "#1f2937" : "#374151", fontWeight: hasUnread ? 500 : 400 }}>
            {sanitizeConversationPreview(conversation.lastMessage)}
          </p>
        </div>

        {/* Right badge */}
        <div className="flex-shrink-0 flex flex-col items-end gap-1 ml-0.5">
          {hasUnread
            ? <UnreadBadge count={conversation.unreadCount} />
            : <CheckCheck className="h-3.5 w-3.5 mt-0.5" style={{ color: "#9ca3af" }} />
          }
        </div>
      </div>
    </button>
  );
}

/* ─── Message bubble ─────────────────────────────────────────────────────── */

function MessageBubble({ message, onCopy }: { message: ChatMessage; onCopy: (text: string) => void }) {
  const isOwn = message.senderRole === "agency";
  const isPending = Boolean(message._optimistic);
  const isBot = Boolean(message.isBot);
  const avatarName = isOwn ? (message.agencyName || message.senderName) : message.senderName;
  const avatarUrl = isOwn ? message.agencyProfileImageUrl : message.clientProfileImageUrl;

  return (
    <div className={`asc-msg-row group flex items-end gap-2.5 ${isOwn ? "ml-auto flex-row-reverse" : ""}`}
      style={{ maxWidth: "76%", opacity: isPending ? 0.75 : 1, transition: "opacity 0.2s" }}>
      <AvatarBubble name={avatarName} imageUrl={avatarUrl} size="sm" />

      <div className="min-w-0 flex flex-col">
        {!isOwn && (
          <p className="mb-1 pl-1 font-semibold flex items-center gap-1.5" style={{ fontSize: 12, color: "#374151" }}>
            {message.senderName}
            {isBot && (
              <span className="rounded-full px-1.5 py-px font-black tracking-wider"
                style={{ fontSize: 9, background: "linear-gradient(135deg,#eef1ff,#e0e7ff)", color: "#3d55d4" }}>AI</span>
            )}
          </p>
        )}

        <div className={`relative rounded-2xl px-4 py-2.5 ${isOwn ? "asc-bubble-out" : "asc-bubble-in"}`}
          style={{
            borderBottomRightRadius: isOwn ? 6 : undefined,
            borderBottomLeftRadius: isOwn ? undefined : 6,
          }}>
          <span className="leading-relaxed" style={{ fontSize: 14, wordBreak: "break-word", whiteSpace: "pre-wrap" }}>
            {message.message}
          </span>

          {/* Copy button */}
          {!isPending && (
            <button
              onClick={() => onCopy(message.message)}
              className={`absolute -top-2.5 ${isOwn ? "-left-2.5" : "-right-2.5"} hidden group-hover:flex h-7 w-7 items-center justify-center rounded-full bg-white shadow-lg transition-all hover:scale-110 active:scale-90`}
              style={{ color: "#374151", border: "1px solid #e5e7eb" }}>
              <Copy className="h-3 w-3" />
            </button>
          )}
        </div>

        {/* Timestamp */}
        <div className={`mt-1 flex items-center gap-1 ${isOwn ? "justify-end pr-1" : "pl-1"}`}
          style={{ fontSize: 11, color: "#374151" }}>
          {isPending
            ? <span className="italic" style={{ color: "#6b7280" }}>Sending…</span>
            : <>
                <span>{formatTime(message.createdAt)}</span>
                {isOwn && <CheckCheck className="h-3 w-3" style={{ color: "#a5b4fc" }} />}
              </>
          }
        </div>
      </div>
    </div>
  );
}

/* ─── Meta Card ─────────────────────────────────────────────────────────── */

function MetaCard({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl px-3.5 py-3 flex flex-col gap-2"
      style={{ background: "#fff", border: "1px solid #e5e7eb", boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}>
      <div className="flex items-center gap-1.5">
        <span style={{ color: "#374151" }}>{icon}</span>
        <p className="font-bold uppercase tracking-[0.1em]" style={{ fontSize: 11, color: "#374151" }}>{label}</p>
      </div>
      {children}
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

  const filteredConversations = useMemo(() => {
    let result = [...effectiveConversations];
    const term = search.trim().toLowerCase();
    if (term) {
      result = result.filter((c) =>
        [c.clientName, c.clientEmail, c.clientCompany, c.agencyName, c.lastMessage].join(" ").toLowerCase().includes(term),
      );
    }
    switch (filter) {
      case "unread":  result = result.filter((c) => c.unreadCount > 0); break;
      case "support": result = result.filter((c) => c.conversationType === "support"); break;
      case "agency":  result = result.filter((c) => c.conversationType === "agency"); break;
    }
    if (statusFilter !== "ALL") result = result.filter((c) => c.status === statusFilter);
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
          if (existing) { setPendingConversation(null); return queryKey; }
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
    if (conversationRefreshTimeoutRef.current !== null) window.clearTimeout(conversationRefreshTimeoutRef.current);
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
      if (!silent) { setErrorMessage(message); toast.error(message); }
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
    } catch { /* keep existing messages */ } finally { setIsLoadingOlder(false); }
  }, [hasMoreOlder, isLoadingOlder, messages]);

  const handleMessagesScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    isNearBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
    if (el.scrollTop < 80 && hasMoreOlder && !isLoadingOlder) void loadOlderMessages();
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
                  const filtered = prev.filter(
                    (item) => !(item._optimistic && item.senderRole === next.senderRole && item.message === next.message),
                  );
                  const updated = [...filtered, next].sort(
                    (left, right) => new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime(),
                  );
                  lastMessageSignatureRef.current = JSON.stringify(updated.map((m) => [m.id, m.message, m.createdAt, m.senderRole]));
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
      if (conversationRefreshTimeoutRef.current !== null) window.clearTimeout(conversationRefreshTimeoutRef.current);
      controller.abort();
    };
  }, [loadConversations, loadMessages, navigate, scheduleConversationRefresh]);

  useEffect(() => { void loadConversations(false); }, [loadConversations]);

  useEffect(() => {
    if (!activeConversationKey) {
      setMessages([]); lastMessageSignatureRef.current = ""; lastLoadedConversationKeyRef.current = null; return;
    }
    const conversation = activeConversationRef.current;
    if (
      conversation &&
      conversation.key === activeConversationKey &&
      conversation.clientId === activeConversationClientId &&
      conversation.conversationType === activeConversationType &&
      (conversation.agencyId ?? null) === activeConversationAgencyId
    ) {
      if (lastLoadedConversationKeyRef.current === activeConversationKey) return;
      lastLoadedConversationKeyRef.current = activeConversationKey;
      lastMessageSignatureRef.current = "";
      void loadMessages(conversation, false);
      return;
    }
    setMessages([]); lastMessageSignatureRef.current = ""; lastLoadedConversationKeyRef.current = null;
  }, [activeConversationAgencyId, activeConversationClientId, activeConversationKey, activeConversationType, loadMessages]);

  useEffect(() => {
    if (!activeConversationKey) return;
    const handleVisibility = () => {
      if (document.visibilityState !== "visible") return;
      const conversation = activeConversationRef.current;
      if (!conversation || conversation.key !== activeConversationKey || messagePollInFlightRef.current) return;
      messagePollInFlightRef.current = true;
      void loadMessages(conversation, true).finally(() => { messagePollInFlightRef.current = false; });
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => { document.removeEventListener("visibilitychange", handleVisibility); };
  }, [activeConversationKey, loadMessages]);

  useEffect(() => {
    if (!pendingConversation) return;
    const actual = conversations.find((item) => item.key === pendingConversation.key);
    if (actual) { setPendingConversation(null); setActiveConversationKey(actual.key); }
  }, [conversations, pendingConversation]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    if (justPrependedRef.current) { justPrependedRef.current = false; return; }
    if (isNearBottomRef.current) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
    if (el.scrollHeight <= el.clientHeight && hasMoreOlder && !isLoadingOlder) void loadOlderMessages();
  }, [messages, hasMoreOlder, isLoadingOlder, loadOlderMessages]);

  useEffect(() => {
    const sendHeartbeat = () => {
      if (document.visibilityState !== "visible") return;
      void fetch("/api/chats/admin/heartbeat", { method: "POST", headers: { ...getAgencyAdminAuthHeaders() }, keepalive: true }).catch(() => {});
    };
    const goOffline = () => {
      void fetch("/api/chats/admin/offline", { method: "POST", headers: { ...getAgencyAdminAuthHeaders() }, keepalive: true }).catch(() => {});
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
        const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const osc = ctx.createOscillator(); const gain = ctx.createGain();
        osc.type = "sine"; osc.frequency.value = 880; gain.gain.value = 0.03;
        osc.connect(gain); gain.connect(ctx.destination);
        osc.start(); osc.stop(ctx.currentTime + 0.08);
      } catch { /* ignore */ }
    }
    lastUnreadTotalRef.current = unreadNow;
  }, [conversations]);

  const copyMessage = (text: string) => {
    navigator.clipboard.writeText(text).then(() => toast.success("Copied!")).catch(() => toast.error("Copy failed"));
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
      const data = await readSafeJson<{ conversation?: Partial<AdminConversation>; error?: string }>(response);
      if (!response.ok || !data.conversation) throw new Error(data.error || "Failed to update");
      setConversations((prev) =>
        prev.map((item) =>
          item.key === activeConversation.key
            ? { ...item, ...data.conversation, assignedAdminName: admin?.username || admin?.agencyName || item.assignedAdminName, assignedAdminId: admin?.id || item.assignedAdminId }
            : item,
        ),
      );
      toast.success("Updated");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update");
    } finally { setIsUpdatingMeta(false); }
  }, [activeConversation, admin]);

  const sendText = useCallback(async (rawText: string) => {
    if (!activeConversation) return;
    const messageText = rawText.trim();
    if (!messageText) return;
    const tempId = -Date.now();
    const optimistic: ChatMessage = {
      id: tempId, clientId: activeConversation.clientId,
      conversationType: activeConversation.conversationType,
      agencyId: activeConversation.agencyId, agencyName: activeConversation.agencyName,
      senderRole: "agency", senderName: admin?.username || admin?.agencyName || "Support",
      message: messageText, createdAt: new Date().toISOString(), _optimistic: true,
    };
    setMessages((prev) => {
      const next = [...prev, optimistic];
      lastMessageSignatureRef.current = JSON.stringify(next.map((m) => [m.id, m.message, m.createdAt, m.senderRole]));
      isNearBottomRef.current = true;
      return next;
    });
    setDraft("");
    if (textareaRef.current) textareaRef.current.style.height = "auto";
    try {
      setIsSending(true); setErrorMessage("");
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
        throw new Error(data.error || "Failed to send");
      }
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
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
      setDraft(messageText);
      const message = error instanceof Error ? error.message : "Failed to send";
      setErrorMessage(message); toast.error(message);
    } finally { setIsSending(false); }
  }, [activeConversation, admin, navigate, scheduleConversationRefresh]);

  const sendMessage = useCallback(async () => { await sendText(draft); }, [draft, sendText]);

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
  const statusCfg = getStatusConfig(activeConversation?.status);
  const priorityCfg = getPriorityConfig(activeConversation?.priority);

  return (
    <>
      <style>{`
        /* ── Design tokens ── */
        .asc-root {
          --c-blue: #4f6ef7;
          --c-blue-dark: #3d5bf5;
          --c-blue-light: #eef1ff;
          --c-surface: #ffffff;
          --c-bg: #f5f6fa;
          --c-divider: #edf0f7;
          --c-text-1: #111827;
          --c-text-2: #374151;
          --c-text-3: #6b7280;
          --c-online: #10b981;
          --c-unread: #ef4444;
          font-family: 'DM Sans', ui-sans-serif, system-ui, sans-serif;
          font-size: 14px;
          color: #111827;
        }

        /* ── Shimmer ── */
        @keyframes asc-shimmer {
          0%   { background-position: -500px 0; }
          100% { background-position: 500px 0; }
        }
        .asc-skeleton {
          background: linear-gradient(90deg, #f0f1f6 25%, #e8eaf2 50%, #f0f1f6 75%);
          background-size: 1000px 100%;
          animation: asc-shimmer 1.8s ease-in-out infinite;
        }

        /* ── Animations ── */
        @keyframes asc-fade-up   { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:none} }
        @keyframes asc-slide-in  { from{opacity:0;transform:translateX(-6px)} to{opacity:1;transform:none} }
        @keyframes asc-pop       { from{opacity:0;transform:scale(0.88)} to{opacity:1;transform:scale(1)} }
        @keyframes asc-badge-in  { from{opacity:0;transform:scale(0.5)} to{opacity:1;transform:scale(1)} }
        @keyframes asc-float-in  { from{opacity:0;transform:translateY(8px) scale(0.97)} to{opacity:1;transform:none} }
        .asc-msg-row   { animation: asc-fade-up 0.22s cubic-bezier(.22,1,.36,1) both; }
        .asc-conv-item { animation: asc-slide-in 0.18s cubic-bezier(.22,1,.36,1) both; }
        .asc-badge-pop { animation: asc-badge-in 0.25s cubic-bezier(.34,1.56,.64,1) both; }
        .asc-float-panel { animation: asc-float-in 0.2s cubic-bezier(.22,1,.36,1) both; }

        /* ── Scrollbars ── */
        .asc-scrollbar::-webkit-scrollbar { width: 4px; }
        .asc-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .asc-scrollbar::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.10); border-radius: 8px; }
        .asc-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(0,0,0,0.18); }

        /* ── Bubbles ── */
        .asc-bubble-out {
          background: linear-gradient(135deg,#6580f8 0%,#4f6ef7 55%,#3d5bf5 100%);
          color: #ffffff;
          box-shadow: 0 4px 16px rgba(79,110,247,0.28);
        }
        .asc-bubble-in {
          background: #ffffff;
          color: #111827;
          box-shadow: 0 1px 6px rgba(0,0,0,0.07), 0 0 0 1px #e5e7eb;
        }

        /* ── Send btn ── */
        @keyframes asc-spin { to{transform:rotate(360deg)} }
        .animate-spin { animation: asc-spin 0.8s linear infinite; }
        .asc-send-btn {
          background: linear-gradient(135deg,#6580f8,#4f6ef7);
          box-shadow: 0 3px 10px rgba(79,110,247,0.4);
          transition: transform 0.12s, box-shadow 0.12s;
        }
        .asc-send-btn:not(:disabled):hover  { transform:scale(1.08); box-shadow:0 5px 16px rgba(79,110,247,0.5); }
        .asc-send-btn:not(:disabled):active { transform:scale(0.93); }
        .asc-send-btn:disabled { background:#e5e7eb; box-shadow:none; }

        /* ── Online pulse ── */
        @keyframes asc-pulse {
          0%,100% { box-shadow:0 0 0 0 rgba(16,185,129,0.5); }
          60%      { box-shadow:0 0 0 6px rgba(16,185,129,0); }
        }
        .asc-pulse-dot { animation: asc-pulse 2.4s ease infinite; }

        /* ── Search focus ── */
        .asc-search { font-size: 13.5px; color: #111827; }
        .asc-search::placeholder { color: #6b7280; }
        .asc-search:focus {
          border-color: #a5b4fc !important;
          box-shadow: 0 0 0 3px rgba(79,110,247,0.10) !important;
          background: #fff !important;
        }

        /* ── Compose focus ── */
        .asc-compose:focus-within {
          border-color: #a5b4fc !important;
          box-shadow: 0 0 0 3px rgba(79,110,247,0.10) !important;
          background: #fff !important;
        }

        /* ── Meta select ── */
        .asc-meta-select {
          appearance: none;
          cursor: pointer;
          transition: border-color 0.15s, background 0.15s;
          font-size: 12.5px;
          font-weight: 600;
          color: #111827;
        }
        .asc-meta-select:focus {
          outline: none;
          border-color: #a5b4fc;
          box-shadow: 0 0 0 3px rgba(79,110,247,0.10);
        }
        .asc-meta-select:disabled { opacity: 0.5; cursor: not-allowed; }

        /* ── Global text readability ── */
        .asc-root * { -webkit-font-smoothing: antialiased; }
        .asc-root p, .asc-root span, .asc-root button, .asc-root select, .asc-root textarea, .asc-root input {
          color: inherit;
        }

        /* ── Horizontal scroll strips ── */
        .asc-hscroll { scrollbar-width: none; }
        .asc-hscroll::-webkit-scrollbar { display: none; }
      `}</style>

      <div className="asc-root flex flex-col" style={{ height: "calc(100vh - 130px)", minHeight: 480, color: "#111827" }}>

        {/* ── Page header ── */}
        <div className="mb-5 flex flex-shrink-0 items-center gap-3.5">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl"
            style={{ background: "linear-gradient(135deg,#6580f8 0%,#4f6ef7 50%,#3d5bf5 100%)", boxShadow: "0 4px 14px rgba(79,110,247,0.35)" }}>
            <MessageCircle className="h-5 w-5 text-white" />
          </div>
          <div>
            <h2 className="leading-tight tracking-tight" style={{ fontSize: 20, fontWeight: 900, color: "#111827" }}>Messages</h2>
            <p className="font-medium mt-0.5" style={{ fontSize: 13, color: "#374151" }}>Client support inbox</p>
          </div>
          {totalUnread > 0 && (
            <div className="flex items-center gap-1.5 rounded-full px-3 py-1.5 font-bold text-white ml-1"
              style={{ fontSize: 12, background: "linear-gradient(135deg,#f87171,#ef4444)", boxShadow: "0 2px 8px rgba(239,68,68,0.35)" }}>
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-white/80" />
              {totalUnread} unread
            </div>
          )}
        </div>

        {/* ── Shell ── */}
        <div className="flex flex-1 overflow-hidden rounded-2xl"
          style={{ boxShadow: "0 8px 32px rgba(0,0,0,0.07), 0 1px 4px rgba(0,0,0,0.04)", border: "1px solid #e5e7eb", background: "#fff" }}>

          {/* ══════════════════════════════════════════════════════
              SIDEBAR
          ══════════════════════════════════════════════════════ */}
          <div className={`flex flex-col ${mobileView === "chat" ? "hidden md:flex md:w-[320px]" : "flex w-full md:w-[320px]"}`}
            style={{ borderRight: "1px solid #e5e7eb", background: "#fcfcff", minWidth: 0 }}>

            {/* Sidebar header */}
            <div className="px-5 pt-5 pb-4 flex-shrink-0" style={{ borderBottom: "1px solid #e5e7eb" }}>
              <p className="tracking-tight" style={{ fontSize: 18, fontWeight: 900, color: "#0f172a" }}>Conversations</p>
            </div>

            {/* Search */}
            <div className="px-4 pt-3.5 pb-3 flex-shrink-0 space-y-3" style={{ borderBottom: "1px solid #e5e7eb" }}>
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2" style={{ color: "#6b7280" }} />
                <input
                  type="text"
                  placeholder="Search conversations…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="asc-search h-10 w-full rounded-xl border pl-10 pr-4 font-medium outline-none transition-all"
                  style={{ fontSize: 13.5, borderColor: "#d1d5db", background: "#f5f6fa", color: "#111827" }}
                />
              </div>

              <div>
                <p className="font-bold uppercase tracking-widest mb-2" style={{ fontSize: 11, color: "#374151" }}>Status</p>
                <StatusTabs value={statusFilter} onChange={setStatusFilter} />
              </div>

              {/* Filter pills */}
              <div>
                <p className="font-bold uppercase tracking-widest mb-2" style={{ fontSize: 11, color: "#374151" }}>Type</p>
                <TypeFilterRow filter={filter} setFilter={setFilter} />
              </div>

              {/* Sort */}
              <div className="relative">
                <SlidersHorizontal className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 pointer-events-none" style={{ color: "#6b7280" }} />
                <select
                  value={sort}
                  onChange={(e) => setSort(e.target.value as SortOption)}
                  className="asc-meta-select h-9 w-full rounded-xl pl-9 pr-8"
                  style={{ fontSize: 13, fontWeight: 600, border: "1px solid #d1d5db", background: "#f5f6fa", color: "#111827" }}
                >
                  <option value="newest">Newest first</option>
                  <option value="unread">Unread first</option>
                  <option value="name">Name A–Z</option>
                  <option value="oldest">Oldest first</option>
                </select>
                <ChevronDown className="absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 pointer-events-none" style={{ color: "#6b7280" }} />
              </div>
            </div>

            {/* List */}
            <div className="asc-scrollbar flex-1 overflow-y-auto py-1.5">
              {isLoadingConversations ? (
                <LoadingDots />
              ) : errorMessage && conversations.length === 0 ? (
                <div className="flex flex-col items-center gap-3 p-6 text-center">
                  <AlertCircle className="h-7 w-7" style={{ color: "#dc2626" }} />
                  <p className="font-medium leading-snug max-w-[200px]" style={{ fontSize: 13, color: "#374151" }}>{errorMessage}</p>
                  <button onClick={() => { setErrorMessage(""); void loadConversations(false); }}
                    className="rounded-full px-4 py-1.5 font-bold text-white transition-opacity hover:opacity-90"
                    style={{ fontSize: 12, background: "linear-gradient(135deg,#6580f8,#4f6ef7)" }}>
                    Retry
                  </button>
                </div>
              ) : filteredConversations.length === 0 ? (
                <EmptyState label={search || filter !== "all" ? "No conversations match your filters." : "No conversations yet."} icon="user" />
              ) : (
                filteredConversations.map((conv, i) => (
                  <div key={conv.key} className="asc-conv-item" style={{ animationDelay: `${i * 35}ms` }}>
                    <ConversationItem conversation={conv} isActive={conv.key === activeConversationKey} onClick={() => handleSelectConversation(conv.key)} />
                  </div>
                ))
              )}
            </div>

            {/* Stats footer */}
            <div className="flex-shrink-0 grid grid-cols-2 gap-2 p-3" style={{ borderTop: "1px solid #e5e7eb", background: "#f9fafb" }}>
              <div className="rounded-xl px-3 py-3 flex flex-col items-center justify-center gap-0.5"
                style={{ background: "#fff", border: "1px solid #e5e7eb", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
                <p style={{ fontSize: 22, fontWeight: 900, color: "#111827", lineHeight: 1 }}>{effectiveConversations.length}</p>
                <p className="font-semibold" style={{ fontSize: 11.5, color: "#374151" }}>Total</p>
              </div>
              <div className="rounded-xl px-3 py-3 flex flex-col items-center justify-center gap-0.5"
                style={{
                  background: totalUnread > 0 ? "#fff" : "#fff",
                  border: `1px solid ${totalUnread > 0 ? "#fecaca" : "#e5e7eb"}`,
                  boxShadow: totalUnread > 0 ? "0 1px 3px rgba(239,68,68,0.08)" : "0 1px 3px rgba(0,0,0,0.04)",
                }}>
                <p style={{ fontSize: 22, fontWeight: 900, lineHeight: 1, color: totalUnread > 0 ? "#4f6ef7" : "#374151" }}>{totalUnread}</p>
                <p className="font-semibold" style={{ fontSize: 11.5, color: totalUnread > 0 ? "#4f6ef7" : "#374151" }}>Unread</p>
              </div>
            </div>
          </div>

          {/* ══════════════════════════════════════════════════════
              MESSAGE PANEL
          ══════════════════════════════════════════════════════ */}
          <div className={`flex min-w-0 flex-1 flex-col ${mobileView === "list" ? "hidden md:flex" : "flex"}`}>

            {/* Chat header */}
            <div className="flex flex-shrink-0 items-center gap-3 px-5 py-3.5"
              style={{ borderBottom: "1px solid #e5e7eb", background: "#fff", minHeight: 68 }}>
              <button
                onClick={() => setMobileView("list")}
                className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl transition-colors md:hidden hover:bg-gray-50"
                style={{ color: "#4f6ef7" }}>
                <ArrowLeft className="h-5 w-5" />
              </button>

              {activeConversation ? (
                <>
                  <div className="relative flex-shrink-0">
                    <AvatarBubble name={activeConversation.clientName} imageUrl={activeConversation.clientProfileImageUrl} size="lg" showRing />
                    <div className="absolute bottom-0 right-0">
                      <OnlineDot online={activeConversation.clientOnline} size="md" />
                    </div>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-black" style={{ fontSize: 15.5, color: "#111827" }}>{activeConversation.clientName}</p>
                    <p className="font-medium flex items-center gap-1.5 mt-0.5"
                      style={{ fontSize: 12, color: activeConversation.clientOnline ? "#059669" : "#374151" }}>
                      <span className="inline-block w-1.5 h-1.5 rounded-full"
                        style={{ background: activeConversation.clientOnline ? "#10b981" : "#d1d5db" }} />
                      {activeConversation.clientOnline ? "Active now" : "Offline"}
                    </p>
                  </div>
                  <div className="flex-shrink-0 text-right hidden sm:block">
                    <p className="font-bold" style={{ fontSize: 13.5, color: "#111827" }}>{admin?.agencyName ?? "Agency"}</p>
                    <p className="mt-0.5" style={{ fontSize: 12, color: "#374151" }}>{activeConversation.clientEmail}</p>
                  </div>
                  {/* ── Reload icon: BLACK ── */}
                  <button
                    type="button"
                    onClick={handleRefreshMessages}
                    className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl border transition-all hover:scale-105 hover:bg-gray-50"
                    style={{ borderColor: "#d1d5db", color: "#111827" }}>
                    <RefreshCw className="h-4 w-4" style={{ color: "#111827" }} />
                  </button>
                </>
              ) : (
                <p className="font-medium" style={{ fontSize: 14, color: "#374151" }}>Select a conversation to begin</p>
              )}
            </div>

            {/* Meta bar */}
            {activeConversation && (
              <div className="flex-shrink-0 grid gap-2.5 px-5 py-3 sm:grid-cols-2 xl:grid-cols-4"
                style={{ borderBottom: "1px solid #e5e7eb", background: "#fbfbfe" }}>

                <MetaCard icon={<CircleDot className="h-3.5 w-3.5" />} label="Status">
                  <div className="relative">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full pointer-events-none"
                      style={{ background: statusCfg.dot }} />
                    <select
                      value={activeConversation.status ?? "OPEN"}
                      disabled={isUpdatingMeta}
                      onChange={(e) => void updateConversationMeta({ status: e.target.value as SupportConversationStatus })}
                      className="asc-meta-select w-full rounded-xl border pl-7 pr-3 py-2"
                      style={{ fontSize: 12.5, fontWeight: 600, borderColor: "#e5e7eb", background: statusCfg.bg, color: statusCfg.color }}>
                      {["OPEN","WAITING_SUPPORT","WAITING_CLIENT","RESOLVED","CLOSED"].map((s) => (
                        <option key={s} value={s}>{s.replace(/_/g," ")}</option>
                      ))}
                    </select>
                  </div>
                </MetaCard>

                <MetaCard icon={<Tag className="h-3.5 w-3.5" />} label="Category">
                  <select
                    value={activeConversation.category ?? "General Inquiry"}
                    disabled={isUpdatingMeta}
                    onChange={(e) => void updateConversationMeta({ category: e.target.value as SupportInquiryCategory })}
                    className="asc-meta-select w-full rounded-xl border px-3 py-2"
                    style={{ fontSize: 12.5, fontWeight: 600, borderColor: "#e5e7eb", background: "#f5f6fa", color: "#111827" }}>
                    {["Booking Concern","Payment Concern","Contract Concern","Maid Replacement","Technical Support","General Inquiry"].map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </MetaCard>

                <MetaCard icon={<ShieldAlert className="h-3.5 w-3.5" />} label="Priority">
                  <div className="relative">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
                      <span style={{ fontSize: 9, fontWeight: 900, color: priorityCfg.color }}>●</span>
                    </div>
                    <select
                      value={activeConversation.priority ?? "MEDIUM"}
                      disabled={isUpdatingMeta}
                      onChange={(e) => void updateConversationMeta({ priority: e.target.value as SupportPriority })}
                      className="asc-meta-select w-full rounded-xl border pl-7 pr-3 py-2"
                      style={{ fontSize: 12.5, fontWeight: 600, borderColor: "#e5e7eb", background: priorityCfg.bg, color: priorityCfg.color }}>
                      {["LOW","MEDIUM","HIGH","URGENT"].map((p) => (
                        <option key={p} value={p}>{p}</option>
                      ))}
                    </select>
                  </div>
                </MetaCard>

                <MetaCard icon={<UserCheck className="h-3.5 w-3.5" />} label="Owner">
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-bold" style={{ fontSize: 12.5, color: "#111827" }}>
                        {activeConversation.assignedAdminName || admin?.username || admin?.agencyName || "Unassigned"}
                      </p>
                      <p className="truncate mt-0.5" style={{ fontSize: 11, color: "#374151" }}>
                        {activeConversation.subject || "Trackable inquiry"}
                      </p>
                    </div>
                    <button
                      type="button"
                      disabled={isUpdatingMeta}
                      onClick={() => void updateConversationMeta({ status: "RESOLVED" })}
                      className="flex-shrink-0 inline-flex items-center gap-1 rounded-xl px-2.5 py-1.5 font-bold transition-all hover:scale-105 active:scale-95 disabled:opacity-50"
                      style={{ fontSize: 11, color: "#ffffff", background: "linear-gradient(135deg,#34d399,#10b981)", boxShadow: "0 2px 8px rgba(16,185,129,0.3)", textShadow: "0 1px 2px rgba(0,0,0,0.15)" }}>
                      <CheckCircle2 className="h-3 w-3" style={{ color: "#ffffff" }} />
                      Resolve
                    </button>
                  </div>
                </MetaCard>
              </div>
            )}

            {/* Messages */}
            <div ref={scrollRef} onScroll={handleMessagesScroll}
              className="asc-scrollbar flex flex-1 flex-col gap-3.5 overflow-y-auto px-5 py-5"
              style={{ background: "#f5f6fa" }}>
              {isLoadingMessages ? (
                <MessageSkeleton />
              ) : errorMessage ? (
                <div className="mx-auto max-w-sm rounded-2xl px-5 py-4 text-center font-semibold"
                  style={{ fontSize: 13.5, background: "#fff0f0", color: "#991b1b", border: "1px solid #fecaca" }}>
                  {errorMessage}
                </div>
              ) : !activeConversation ? (
                <EmptyState label="Select a conversation to get started." />
              ) : messages.length === 0 ? (
                <EmptyState label={activeConversation.description || "No messages yet. Say hello!"} />
              ) : (
                <>
                  {hasMoreOlder && (
                    <div className="flex justify-center pb-1">
                      <button
                        onClick={() => void loadOlderMessages()}
                        disabled={isLoadingOlder}
                        className="flex items-center gap-2 rounded-full px-4 py-1.5 font-semibold transition-all hover:scale-105 disabled:opacity-60"
                        style={{ fontSize: 12, background: "#fff", color: "#374151", border: "1px solid #d1d5db", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
                        {isLoadingOlder
                          ? <><RefreshCw className="h-3 w-3 animate-spin" style={{ color: "#111827" }} /> Loading…</>
                          : <><RefreshCw className="h-3 w-3" style={{ color: "#111827" }} /> Load earlier</>
                        }
                      </button>
                    </div>
                  )}
                  {messageGroups.map(({ label, messages: groupMsgs }) => (
                    <div key={label} className="flex flex-col gap-3">
                      <DateDivider label={label} />
                      {groupMsgs.map((msg) => (
                        <MessageBubble key={msg.id} message={msg} onCopy={copyMessage} />
                      ))}
                    </div>
                  ))}
                </>
              )}
            </div>

            {/* Compose */}
            <div className="flex-shrink-0 px-5 pt-2.5 pb-4" style={{ borderTop: "1px solid #e5e7eb", background: "#fff" }}>
              {/* Toolbar row */}
              <div className="flex items-center gap-2 mb-2.5">
                <QuickReplyPanel onSelect={(text) => setDraft(text)} />
                {draft.trim() && (
                  <span className="ml-auto" style={{ fontSize: 11, color: "#374151" }}>
                    {draft.length} chars · ↵ send
                  </span>
                )}
              </div>
              {/* Input */}
              <div className="asc-compose flex items-end gap-2.5 rounded-2xl p-2"
                style={{ background: "#f5f6fa", border: "1.5px solid #d1d5db", transition: "all 0.15s" }}>
                <textarea
                  ref={textareaRef}
                  placeholder={activeConversation ? `Reply to ${activeConversation.clientName}…` : "Select a conversation…"}
                  value={draft}
                  rows={1}
                  disabled={!activeConversation || isSending}
                  onChange={(e) => {
                    setDraft(e.target.value);
                    e.target.style.height = "auto";
                    e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px";
                  }}
                  onKeyDown={handleKeyDown}
                  className="asc-scrollbar flex-1 resize-none bg-transparent px-2 py-1.5 leading-relaxed outline-none disabled:cursor-not-allowed disabled:opacity-40"
                  style={{ fontSize: 14, maxHeight: 120, minHeight: 36, color: "#111827" }}
                />
                <button
                  onClick={() => void sendMessage()}
                  disabled={isSending || !draft.trim() || !activeConversation}
                  className="asc-send-btn flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl text-white"
                  aria-label="Send">
                  {isSending
                    ? <RefreshCw className="h-4 w-4 animate-spin" />
                    : <Send className="h-4 w-4" />
                  }
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