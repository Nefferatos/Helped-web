import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "@/components/ui/sonner";
import {
  Search,
  Trash2,
  Inbox,
  ChevronLeft,
  ChevronRight,
  X,
  Mail,
  Phone,
  Calendar,
  MessageSquare,
  CheckCircle2,
  Clock,
  AlertCircle,
  Circle,
  Copy,
  Reply,
  StickyNote,
  Filter,
  CheckSquare,
  Square,
  Trash,
  ChevronDown,
  User,
  Tag,
  LayoutGrid,
  List,
} from "lucide-react";
import { streamSse } from "@/lib/sse";
import { adminPath } from "@/lib/routes";
import { getAgencyAdminAuthHeaders } from "@/lib/agencyAdminAuth";
import { readSafeJson } from "@/lib/safeJson";

/* ─── Types ─────────────────────────────────────────────────────────────── */
type Status = "new" | "in_progress" | "replied" | "resolved";

interface EnquiryRecord {
  id: number;
  username: string;
  date: string;
  email: string;
  phone: string;
  message: string;
  createdAt: string;
  status?: Status;
  note?: string;
  assignedTo?: string;
  clientId?: number;
  clientName?: string;
}

/* ─── Constants ─────────────────────────────────────────────────────────── */
const PAGE_SIZE = 20;

const STATUS_CONFIG: Record<Status, { label: string; color: string; bg: string; border: string; icon: typeof Circle }> = {
  new:         { label: "New",         color: "text-sky-700",     bg: "bg-sky-50",     border: "border-sky-200",     icon: Circle },
  in_progress: { label: "In Progress", color: "text-amber-700",   bg: "bg-amber-50",   border: "border-amber-200",   icon: Clock },
  replied:     { label: "Replied",     color: "text-violet-700",  bg: "bg-violet-50",  border: "border-violet-200",  icon: Reply },
  resolved:    { label: "Resolved",    color: "text-emerald-700", bg: "bg-emerald-50", border: "border-emerald-200", icon: CheckCircle2 },
};

const FILTER_TABS: { key: "all" | Status; label: string }[] = [
  { key: "all",         label: "All" },
  { key: "new",         label: "New" },
  { key: "in_progress", label: "In Progress" },
  { key: "replied",     label: "Replied" },
  { key: "resolved",    label: "Resolved" },
];

const AVATAR_COLORS = [
  { bg: "bg-rose-100",    text: "text-rose-700",    ring: "ring-rose-200" },
  { bg: "bg-violet-100",  text: "text-violet-700",  ring: "ring-violet-200" },
  { bg: "bg-sky-100",     text: "text-sky-700",     ring: "ring-sky-200" },
  { bg: "bg-amber-100",   text: "text-amber-700",   ring: "ring-amber-200" },
  { bg: "bg-teal-100",    text: "text-teal-700",    ring: "ring-teal-200" },
  { bg: "bg-fuchsia-100", text: "text-fuchsia-700", ring: "ring-fuchsia-200" },
  { bg: "bg-indigo-100",  text: "text-indigo-700",  ring: "ring-indigo-200" },
  { bg: "bg-orange-100",  text: "text-orange-700",  ring: "ring-orange-200" },
];

const TOP_BAR_COLORS = [
  "bg-rose-400","bg-violet-400","bg-sky-400","bg-amber-400",
  "bg-teal-400","bg-fuchsia-400","bg-indigo-400","bg-orange-400",
];

const getAvatarColor = (id: number) => AVATAR_COLORS[id % AVATAR_COLORS.length];

/* ─── Local storage helpers for status/notes (no backend change needed) ── */
const LS_KEY = "enq_meta";
interface EnqMeta { status?: Status; note?: string; assignedTo?: string }
function getMeta(id: number): EnqMeta {
  try { return JSON.parse(localStorage.getItem(LS_KEY) || "{}")[id] ?? {}; }
  catch { return {}; }
}
function setMeta(id: number, patch: Partial<EnqMeta>) {
  try {
    const all = JSON.parse(localStorage.getItem(LS_KEY) || "{}") as Record<number, EnqMeta>;
    all[id] = { ...all[id], ...patch };
    localStorage.setItem(LS_KEY, JSON.stringify(all));
  } catch { /* ignore */ }
}
function bulkDeleteMeta(ids: number[]) {
  try {
    const all = JSON.parse(localStorage.getItem(LS_KEY) || "{}") as Record<number, EnqMeta>;
    ids.forEach((id) => delete all[id]);
    localStorage.setItem(LS_KEY, JSON.stringify(all));
  } catch { /* ignore */ }
}
function enrichWithMeta(enqs: EnquiryRecord[]): EnquiryRecord[] {
  return enqs.map((e) => {
    const m = getMeta(e.id);
    return { ...e, status: m.status ?? "new", note: m.note ?? "", assignedTo: m.assignedTo ?? "" };
  });
}

/* ─── Skeleton card ─────────────────────────────────────────────────────── */
function SkeletonCard() {
  return (
    <div className="animate-pulse rounded-2xl border border-gray-100 bg-white p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-2xl bg-gray-100" />
          <div className="space-y-2">
            <div className="h-4 w-36 rounded-lg bg-gray-100" />
            <div className="h-3 w-52 rounded-lg bg-gray-100" />
          </div>
        </div>
        <div className="h-8 w-8 rounded-xl bg-gray-100" />
      </div>
      <div className="h-20 rounded-xl bg-gray-50" />
    </div>
  );
}

/* ─── Delete confirm button ─────────────────────────────────────────────── */
function DeleteButton({ onDelete, isBusy }: { onDelete: () => void; isBusy: boolean }) {
  const [confirming, setConfirming] = useState(false);
  const timerRef = useRef<number | null>(null);

  const handleClick = () => {
    if (isBusy) return;
    if (confirming) {
      if (timerRef.current) window.clearTimeout(timerRef.current);
      setConfirming(false);
      onDelete();
    } else {
      setConfirming(true);
      timerRef.current = window.setTimeout(() => setConfirming(false), 2500);
    }
  };

  useEffect(() => () => { if (timerRef.current) window.clearTimeout(timerRef.current); }, []);

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isBusy}
      title={confirming ? "Click again to confirm delete" : "Delete enquiry"}
      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border-2 transition-all duration-200 disabled:opacity-40 disabled:cursor-default ${
        confirming
          ? "border-red-400 bg-red-50 text-red-600 animate-pulse scale-110"
          : "border-transparent bg-gray-100 text-gray-400 hover:border-red-300 hover:bg-red-50 hover:text-red-500 hover:scale-110"
      }`}
    >
      {isBusy ? (
        <div className="h-4 w-4 rounded-full border-2 border-gray-300 border-t-gray-600 animate-spin" />
      ) : (
        <Trash2 className="h-4 w-4" />
      )}
    </button>
  );
}

/* ─── Status badge ──────────────────────────────────────────────────────── */
function StatusBadge({ status }: { status: Status }) {
  const cfg = STATUS_CONFIG[status];
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-bold ${cfg.color} ${cfg.bg} ${cfg.border}`}>
      <Icon className="h-3 w-3" />
      {cfg.label}
    </span>
  );
}

/* ─── Status dropdown ───────────────────────────────────────────────────── */
function StatusDropdown({
  status,
  onChange,
}: {
  status: Status;
  onChange: (s: Status) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-bold transition-all hover:opacity-80 active:scale-95"
        style={{ borderColor: "transparent" }}
      >
        <StatusBadge status={status} />
        <ChevronDown className="h-3 w-3 text-gray-400 ml-0.5" />
      </button>
      {open && (
        <div className="absolute left-0 top-full mt-1.5 z-50 w-44 rounded-2xl border border-gray-100 bg-white shadow-xl shadow-gray-200/60 overflow-hidden">
          {(Object.keys(STATUS_CONFIG) as Status[]).map((s) => {
            const cfg = STATUS_CONFIG[s];
            const Icon = cfg.icon;
            return (
              <button
                key={s}
                type="button"
                onClick={() => { onChange(s); setOpen(false); }}
                className={`flex w-full items-center gap-2.5 px-3.5 py-2.5 text-[13px] font-semibold transition-colors hover:bg-gray-50 ${
                  s === status ? cfg.color + " font-bold" : "text-gray-700"
                }`}
              >
                <Icon className={`h-3.5 w-3.5 ${cfg.color}`} />
                {cfg.label}
                {s === status && <CheckCircle2 className="h-3.5 w-3.5 ml-auto text-emerald-500" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ─── Notes panel ───────────────────────────────────────────────────────── */
function NotesPanel({
  note,
  assignedTo,
  onSave,
}: {
  note: string;
  assignedTo: string;
  onSave: (note: string, assignedTo: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [draftNote, setDraftNote] = useState(note);
  const [draftAssigned, setDraftAssigned] = useState(assignedTo);

  const handleSave = () => {
    onSave(draftNote, draftAssigned);
    setOpen(false);
    toast.success("Note saved");
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => { setDraftNote(note); setDraftAssigned(assignedTo); setOpen((o) => !o); }}
        title="Add internal note"
        className={`flex h-8 w-8 items-center justify-center rounded-xl border-2 transition-all hover:scale-110 ${
          note
            ? "border-amber-300 bg-amber-50 text-amber-600"
            : "border-transparent bg-gray-100 text-gray-400 hover:border-amber-300 hover:bg-amber-50 hover:text-amber-500"
        }`}
      >
        <StickyNote className="h-3.5 w-3.5" />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-2 z-50 w-72 rounded-2xl border border-gray-100 bg-white p-4 shadow-xl shadow-gray-200/60">
          <p className="text-[12px] font-black uppercase tracking-widest text-gray-400 mb-2">Internal Note</p>
          <textarea
            value={draftNote}
            onChange={(e) => setDraftNote(e.target.value)}
            placeholder="e.g. Called client, waiting callback..."
            rows={3}
            className="w-full rounded-xl border-2 border-gray-200 bg-gray-50 px-3 py-2 text-[13px] text-gray-800 outline-none placeholder:text-gray-400 focus:border-amber-400 focus:bg-white resize-none transition-all"
          />
          <div className="mt-2 flex items-center gap-2">
            <User className="h-3.5 w-3.5 text-gray-400 shrink-0" />
            <input
              value={draftAssigned}
              onChange={(e) => setDraftAssigned(e.target.value)}
              placeholder="Assigned to..."
              className="flex-1 rounded-xl border-2 border-gray-200 bg-gray-50 px-3 py-1.5 text-[13px] text-gray-800 outline-none placeholder:text-gray-400 focus:border-amber-400 focus:bg-white transition-all"
            />
          </div>
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={handleSave}
              className="flex-1 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 py-2 text-[13px] font-bold text-white hover:opacity-90 transition-opacity"
            >
              Save
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-xl border-2 border-gray-200 px-3 py-2 text-[13px] font-bold text-gray-600 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Quick contact actions ─────────────────────────────────────────────── */
function QuickContact({
  email,
  phone,
  canOpenChat,
  onOpenChat,
}: {
  email: string;
  phone: string;
  canOpenChat: boolean;
  onOpenChat: () => void;
}) {
  const copy = (text: string, label: string) => {
    navigator.clipboard.writeText(text).then(() => toast.success(`${label} copied!`));
  };

  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {/* Email copy */}
      <button
        type="button"
        onClick={() => copy(email, "Email")}
        title="Copy email"
        className="flex items-center gap-1.5 rounded-xl bg-sky-50 border border-sky-100 px-3 py-1.5 min-w-0 hover:bg-sky-100 transition-colors group"
      >
        <Mail className="h-3.5 w-3.5 shrink-0 text-sky-500" />
        <span className="text-[13px] font-semibold text-sky-900 truncate max-w-[160px]">{email}</span>
        <Copy className="h-3 w-3 text-sky-400 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
      </button>

      {/* Chat reply button */}
      <button
        type="button"
        onClick={onOpenChat}
        disabled={!canOpenChat}
        title={canOpenChat ? "Reply in chat support" : "Cannot open chat without a registered client account"}
        className={`flex items-center gap-1.5 rounded-xl border px-3 py-1.5 transition-colors ${
          canOpenChat
            ? "bg-indigo-50 border-indigo-100 hover:bg-indigo-100"
            : "bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed"
        }`}
      >
        <Reply className="h-3.5 w-3.5 text-indigo-500" />
        <span className={`text-[13px] font-semibold ${canOpenChat ? "text-indigo-900" : "text-gray-400"}`}>Reply in Chat</span>
      </button>

      {/* Phone copy */}
      {phone ? (
        <button
          type="button"
          onClick={() => copy(phone, "Phone number")}
          title="Copy phone"
          className="flex items-center gap-1.5 rounded-xl bg-emerald-50 border border-emerald-100 px-3 py-1.5 hover:bg-emerald-100 transition-colors group"
        >
          <Phone className="h-3.5 w-3.5 shrink-0 text-emerald-500" />
          <span className="text-[13px] font-semibold text-emerald-900">{phone}</span>
          <Copy className="h-3 w-3 text-emerald-400 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
        </button>
      ) : (
        <div className="flex items-center gap-1.5 rounded-xl bg-gray-50 border border-gray-100 px-3 py-1.5">
          <Phone className="h-3.5 w-3.5 shrink-0 text-gray-400" />
          <span className="text-[13px] text-gray-400 font-normal">No phone</span>
        </div>
      )}
    </div>
  );
}

/* ─── Enquiry card ──────────────────────────────────────────────────────── */
function EnquiryCard({
  enq,
  index,
  selected,
  onSelect,
  onDelete,
  isBusy,
  onStatusChange,
  onNoteSave,
  onOpenSupportChat,
}: {
  enq: EnquiryRecord;
  index: number;
  selected: boolean;
  onSelect: (id: number) => void;
  onDelete: () => void;
  isBusy: boolean;
  onStatusChange: (id: number, status: Status) => void;
  onNoteSave: (id: number, note: string, assignedTo: string) => void;
  onOpenSupportChat: (enquiry: EnquiryRecord) => void;
}) {
  const avatar = getAvatarColor(enq.id);
  const initials =
    enq.username
      .split(" ")
      .slice(0, 2)
      .map((w) => w[0])
      .join("")
      .toUpperCase() || "?";
  const status = enq.status ?? "new";

  return (
    <div
      className={`enq-card-enter group rounded-2xl border-2 bg-white shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 overflow-hidden ${
        selected ? "border-indigo-400 shadow-indigo-100" : "border-transparent hover:border-indigo-100"
      }`}
      style={{ animationDelay: `${index * 0.035}s` }}
    >
      {/* Colored top accent bar */}
      <div className={`h-1 w-full ${TOP_BAR_COLORS[enq.id % 8]}`} />

      <div className="p-4 sm:p-5">
        {/* Header row */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-2.5 min-w-0">
            {/* Checkbox for bulk select */}
            <button
              type="button"
              onClick={() => onSelect(enq.id)}
              className="shrink-0 text-gray-300 hover:text-indigo-500 transition-colors"
            >
              {selected
                ? <CheckSquare className="h-5 w-5 text-indigo-500" />
                : <Square className="h-5 w-5" />}
            </button>

            <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl font-black text-[15px] ring-2 ${avatar.bg} ${avatar.text} ${avatar.ring}`}>
              {initials}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-[15px] font-extrabold text-gray-950 truncate leading-tight">{enq.username}</p>
                <span className="shrink-0 rounded-full bg-indigo-50 px-2 py-0.5 text-[11px] font-black text-indigo-600">#{enq.id}</span>
              </div>
              <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                <StatusDropdown status={status} onChange={(s) => onStatusChange(enq.id, s)} />
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => onOpenSupportChat(enq)}
              disabled={!enq.clientId}
              title={enq.clientId ? "Open this enquiry in client support chat" : "Cannot open chat without a registered client account"}
              className={`flex h-9 min-w-[120px] items-center justify-center rounded-xl border-2 px-3 text-sm font-semibold transition-all duration-200 ${
                enq.clientId
                  ? "border-sky-200 bg-sky-50 text-sky-700 hover:border-sky-300 hover:bg-sky-100"
                  : "border-gray-200 bg-gray-100 text-gray-400 cursor-not-allowed"
              }`}
            >
              <Inbox className="mr-2 h-4 w-4" />
              Open Chat
            </button>
            <NotesPanel
              note={enq.note ?? ""}
              assignedTo={enq.assignedTo ?? ""}
              onSave={(note, assignedTo) => onNoteSave(enq.id, note, assignedTo)}
            />
            <DeleteButton onDelete={onDelete} isBusy={isBusy} />
          </div>
        </div>

        {/* Quick contact actions */}
        <div className="mb-3">
          <QuickContact
            email={enq.email}
            phone={enq.phone}
            canOpenChat={Boolean(enq.clientId)}
            onOpenChat={() => onOpenSupportChat(enq)}
          />
        </div>

        {/* Date */}
        <div className="flex items-center gap-1.5 mb-3">
          <Calendar className="h-3.5 w-3.5 text-amber-500" />
          <span className="text-[12px] font-semibold text-amber-800">{enq.date}</span>
          {enq.assignedTo && (
            <>
              <span className="text-gray-300 mx-1">·</span>
              <User className="h-3.5 w-3.5 text-gray-400" />
              <span className="text-[12px] font-semibold text-gray-600">{enq.assignedTo}</span>
            </>
          )}
        </div>

        {/* Message box */}
        <div className="rounded-xl bg-gradient-to-br from-slate-50 to-gray-50 border border-gray-100 p-4">
          <p className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-widest text-gray-400 mb-2">
            <MessageSquare className="h-3 w-3" /> Message
          </p>
          <p className="text-[14px] text-gray-900 leading-relaxed whitespace-pre-line font-medium line-clamp-4">
            {enq.message || <span className="italic text-gray-500 font-normal">No message provided.</span>}
          </p>
        </div>

        {/* Internal note (if exists) */}
        {enq.note && (
          <div className="mt-3 rounded-xl border border-amber-100 bg-amber-50 px-4 py-3">
            <p className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-widest text-amber-600 mb-1">
              <StickyNote className="h-3 w-3" /> Internal Note
            </p>
            <p className="text-[13px] text-amber-900 leading-relaxed">{enq.note}</p>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Main component ───────────────────────────────────────────────────── */
const AdminEnquiry = () => {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState<"all" | Status>("all");
  const [viewMode, setViewMode] = useState<"cards" | "list">("cards");
  const [enquiries, setEnquiries] = useState<EnquiryRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const enquiriesRef = useRef<EnquiryRecord[]>([]);
  const searchRef = useRef("");

  useEffect(() => { enquiriesRef.current = enquiries; }, [enquiries]);
  useEffect(() => { searchRef.current = search; }, [search]);

  /* ── Fetch enquiries ── */
  useEffect(() => {
    const controller = new AbortController();
    const load = async () => {
      try {
        setIsLoading(true);
        const params = new URLSearchParams();
        if (search.trim()) params.set("search", search.trim());
        const response = await fetch(
          `/api/enquiries${params.toString() ? `?${params.toString()}` : ""}`,
          { headers: { ...getAgencyAdminAuthHeaders() }, signal: controller.signal },
        );
        const data = await readSafeJson<{ error?: string; enquiries?: EnquiryRecord[] }>(response);
        if (!response.ok || !data.enquiries)
          throw new Error(data.error || "Failed to load enquiries");
        const sorted = [...data.enquiries].sort((a, b) => b.id - a.id);
        setEnquiries(enrichWithMeta(sorted));
        setPage(1);
        setSelectedIds(new Set());
      } catch (error) {
        if (!(error instanceof DOMException && error.name === "AbortError"))
          toast.error(error instanceof Error ? error.message : "Failed to load enquiries");
      } finally {
        setIsLoading(false);
      }
    };
    void load();
    return () => controller.abort();
  }, [search]);

  /* ── Real-time stream ── */
  useEffect(() => {
    const controller = new AbortController();
    let lastId = 0;
    let pollTimer: number | null = null;
    const computeLocalLastId = () =>
      enquiriesRef.current.reduce((m, e) => Math.max(m, e.id), 0);
    const sleep = (ms: number) => new Promise((r) => window.setTimeout(r, ms));

    const loadLastId = async () => {
      try {
        const res = await fetch("/api/enquiries/last-id", { headers: { ...getAgencyAdminAuthHeaders() }, signal: controller.signal });
        const d = await readSafeJson<{ lastId?: number; error?: string }>(res);
        if (res.ok && typeof d.lastId === "number") lastId = Math.max(lastId, d.lastId);
      } catch { /* ignore */ } finally {
        lastId = Math.max(lastId, computeLocalLastId());
      }
    };

    const run = async () => {
      await loadLastId();
      while (!controller.signal.aborted) {
        try {
          await streamSse(`/api/enquiries/stream?afterId=${lastId}`, {
            signal: controller.signal,
            onEvent: (event) => {
              if (event.event !== "enquiry" || !event.data) return;
              const payload = JSON.parse(event.data) as { enquiry?: EnquiryRecord };
              const next = payload.enquiry;
              if (!next) return;
              lastId = Math.max(lastId, next.id);
              if (searchRef.current.trim()) return;
              setEnquiries((prev) => {
                if (prev.some((item) => item.id === next.id)) return prev;
                const enriched = { ...next, ...getMeta(next.id), status: getMeta(next.id).status ?? "new" };
                return [...prev, enriched].sort((a, b) => b.id - a.id);
              });
            },
          });
        } catch (error) {
          if (controller.signal.aborted) return;
          if (error instanceof Error && /Stream failed \((404|405)\)/.test(error.message)) {
            if (pollTimer !== null) return;
            pollTimer = window.setInterval(async () => {
              if (controller.signal.aborted || searchRef.current.trim()) return;
              try {
                const res = await fetch("/api/enquiries", { headers: { ...getAgencyAdminAuthHeaders() }, signal: controller.signal });
                const d = await readSafeJson<{ enquiries?: EnquiryRecord[] }>(res);
                if (res.ok && d.enquiries) {
                  setEnquiries(enrichWithMeta([...d.enquiries].sort((a, b) => b.id - a.id)));
                  setPage(1);
                  lastId = Math.max(lastId, d.enquiries.reduce((m, e) => Math.max(m, e.id), 0));
                }
              } catch { /* ignore */ }
            }, 5000);
            await sleep(10);
            continue;
          }
          await sleep(1200);
        }
      }
    };
    void run();
    return () => {
      controller.abort();
      if (pollTimer !== null) window.clearInterval(pollTimer);
    };
  }, []);

  /* ── Delete single ── */
  const handleDelete = async (id: number) => {
    try {
      setBusyId(id);
      const response = await fetch(`/api/enquiries/${id}`, { method: "DELETE", headers: { ...getAgencyAdminAuthHeaders() } });
      const data = await readSafeJson<{ error?: string }>(response);
      if (!response.ok) throw new Error(data.error || "Failed to delete enquiry");
      bulkDeleteMeta([id]);
      setEnquiries((prev) => prev.filter((e) => e.id !== id));
      setSelectedIds((prev) => { const n = new Set(prev); n.delete(id); return n; });
      toast.success("Enquiry deleted");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete enquiry");
    } finally {
      setBusyId(null);
    }
  };

  /* ── Bulk delete ── */
  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    try {
      setBulkDeleting(true);
      const ids = Array.from(selectedIds);
      await Promise.all(ids.map((id) => fetch(`/api/enquiries/${id}`, { method: "DELETE", headers: { ...getAgencyAdminAuthHeaders() } })));
      bulkDeleteMeta(ids);
      setEnquiries((prev) => prev.filter((e) => !selectedIds.has(e.id)));
      toast.success(`${ids.length} enqu${ids.length !== 1 ? "iries" : "iry"} deleted`);
      setSelectedIds(new Set());
    } catch {
      toast.error("Some enquiries could not be deleted");
    } finally {
      setBulkDeleting(false);
    }
  };

  /* ── Status change ── */
  const handleStatusChange = (id: number, status: Status) => {
    setMeta(id, { status });
    setEnquiries((prev) => prev.map((e) => e.id === id ? { ...e, status } : e));
  };

  /* ── Note save ── */
  const handleNoteSave = (id: number, note: string, assignedTo: string) => {
    setMeta(id, { note, assignedTo });
    setEnquiries((prev) => prev.map((e) => e.id === id ? { ...e, note, assignedTo } : e));
  };

  const handleOpenSupportChat = (enquiry: EnquiryRecord) => {
    if (!enquiry.clientId) {
      toast.error("No registered client account was found for this enquiry.");
      return;
    }

    const params = new URLSearchParams();
    params.set("clientId", String(enquiry.clientId));
    params.set("type", "support");
    params.set("clientName", enquiry.clientName ?? enquiry.username);
    params.set("enquiryId", String(enquiry.id));
    params.set("enquiryEmail", enquiry.email);
    params.set("enquiryMessage", enqSummary(enquiry.message));

    navigate(adminPath(`/chat-support?${params.toString()}`));
  };

  function enqSummary(message: string) {
    return message.replace(/\s+/g, " ").trim().slice(0, 240);
  }

  /* ── Select toggle ── */
  const handleSelect = (id: number) => {
    setSelectedIds((prev) => {
      const n = new Set(prev);
      if (n.has(id)) { n.delete(id); } else { n.add(id); }
      return n;
    });
  };

  /* ── Select all on current page ── */
  const handleSelectAll = () => {
    const visibleIds = visibleEnquiries.map((e) => e.id);
    const allSelected = visibleIds.every((id) => selectedIds.has(id));
    if (allSelected) {
      setSelectedIds((prev) => {
        const n = new Set(prev);
        visibleIds.forEach((id) => n.delete(id));
        return n;
      });
    } else {
      setSelectedIds((prev) => {
        const n = new Set(prev);
        visibleIds.forEach((id) => n.add(id));
        return n;
      });
    }
  };

  /* ── Bulk status change ── */
  const handleBulkStatus = (status: Status) => {
    selectedIds.forEach((id) => setMeta(id, { status }));
    setEnquiries((prev) =>
      prev.map((e) => selectedIds.has(e.id) ? { ...e, status } : e)
    );
    toast.success(`Marked ${selectedIds.size} as "${STATUS_CONFIG[status].label}"`);
    setSelectedIds(new Set());
  };

  /* ── Filtered + paginated enquiries ── */
  const filteredEnquiries = useMemo(() => {
    if (activeFilter === "all") return enquiries;
    return enquiries.filter((e) => (e.status ?? "new") === activeFilter);
  }, [enquiries, activeFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredEnquiries.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);

  const visibleEnquiries = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredEnquiries.slice(start, start + PAGE_SIZE);
  }, [currentPage, filteredEnquiries]);

  const pageNumbers = useMemo(() => {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
    const pages: (number | "...")[] = [];
    const range = 2;
    for (let i = 1; i <= totalPages; i++) {
      if (i === 1 || i === totalPages || (i >= currentPage - range && i <= currentPage + range)) {
        pages.push(i);
      } else if (pages[pages.length - 1] !== "...") {
        pages.push("...");
      }
    }
    return pages;
  }, [totalPages, currentPage]);

  const startItem = (currentPage - 1) * PAGE_SIZE + 1;
  const endItem = Math.min(currentPage * PAGE_SIZE, filteredEnquiries.length);

  /* ── Status counts for filter tabs ── */
  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { all: enquiries.length };
    enquiries.forEach((e) => {
      const s = e.status ?? "new";
      counts[s] = (counts[s] ?? 0) + 1;
    });
    return counts;
  }, [enquiries]);

  const allVisibleSelected = visibleEnquiries.length > 0 && visibleEnquiries.every((e) => selectedIds.has(e.id));

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&display=swap');
        .enq-root, .enq-root * { font-family: 'Plus Jakarta Sans', sans-serif; }

        @keyframes enqFadeUp {
          from { opacity: 0; transform: translateY(14px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .enq-card-enter { animation: enqFadeUp 0.35s cubic-bezier(0.16, 1, 0.3, 1) both; }

        @keyframes shimmer {
          from { background-position: -200% center; }
          to   { background-position: 200% center; }
        }
        .enq-badge-count {
          background: linear-gradient(90deg, #6366f1, #8b5cf6, #a78bfa, #6366f1);
          background-size: 200% auto;
          animation: shimmer 3s linear infinite;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
      `}</style>

      <div className="enq-root space-y-6">

        {/* ── Page header ── */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 shadow-lg shadow-indigo-200">
              <Mail className="h-6 w-6 text-white" />
              <div className="absolute -top-1 -right-1 h-3.5 w-3.5 rounded-full bg-emerald-400 border-2 border-white" />
            </div>
            <div>
              <h2 className="text-[24px] font-black leading-tight text-gray-900 tracking-tight">
                Employer Enquiries
              </h2>
              <p className="text-[14px] font-semibold mt-0.5">
                <span className="enq-badge-count text-[16px] font-black">{enquiries.length}</span>
                <span className="text-gray-700 ml-1.5">total enquir{enquiries.length !== 1 ? "ies" : "y"}</span>
              </p>
            </div>
          </div>

          {!isLoading && enquiries.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="rounded-xl bg-indigo-50 border border-indigo-100 px-3.5 py-2 text-[13px] font-bold text-indigo-600">
                Page {currentPage} of {totalPages}
              </span>
              <span className="rounded-xl bg-violet-50 border border-violet-100 px-3.5 py-2 text-[13px] font-bold text-violet-600">
                {startItem}–{endItem} shown
              </span>
            </div>
          )}
        </div>

        {/* ── Main card ── */}
        <div className="rounded-3xl border border-gray-200 bg-white shadow-sm overflow-hidden">

          {/* Toolbar */}
          <div className="border-b border-gray-100 bg-gradient-to-r from-slate-50 via-indigo-50/40 to-violet-50/40 px-5 py-4 space-y-3">
            <div className="relative max-w-lg">
              <Search
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-indigo-400 pointer-events-none"
                style={{ height: 18, width: 18 }}
              />
              <input
                type="text"
                placeholder="Search by name, email, phone…"
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                className="h-12 w-full rounded-2xl border-2 border-gray-200 bg-white pl-10 pr-10 text-[15px] font-semibold text-gray-800 outline-none placeholder:text-gray-400 placeholder:font-normal focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100 transition-all"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 flex h-6 w-6 items-center justify-center rounded-full bg-gray-200 text-gray-500 hover:bg-gray-300 transition-colors"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {/* Filter tabs */}
            <div className="flex items-center gap-2 flex-wrap">
              <Filter className="h-3.5 w-3.5 text-gray-400 shrink-0" />
              {FILTER_TABS.map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => { setActiveFilter(tab.key); setPage(1); setSelectedIds(new Set()); }}
                  className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-[13px] font-bold transition-all ${
                    activeFilter === tab.key
                      ? "bg-indigo-600 text-white shadow-md shadow-indigo-200"
                      : "bg-white border-2 border-gray-200 text-gray-600 hover:border-indigo-300 hover:text-indigo-700"
                  }`}
                >
                  {tab.label}
                  {statusCounts[tab.key] !== undefined && (
                    <span className={`rounded-full px-1.5 py-0.5 text-[11px] font-black ${
                      activeFilter === tab.key ? "bg-white/20 text-white" : "bg-gray-100 text-gray-600"
                    }`}>
                      {statusCounts[tab.key]}
                    </span>
                  )}
                </button>
              ))}
              <div className="ml-auto inline-flex items-center rounded-2xl border-2 border-gray-200 bg-white p-1">
                <button
                  type="button"
                  onClick={() => setViewMode("cards")}
                  className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-[12px] font-bold transition-all ${
                    viewMode === "cards"
                      ? "bg-indigo-600 text-white shadow-sm"
                      : "text-gray-600 hover:text-indigo-700"
                  }`}
                >
                  <LayoutGrid className="h-3.5 w-3.5" />
                  Cards
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("list")}
                  className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-[12px] font-bold transition-all ${
                    viewMode === "list"
                      ? "bg-indigo-600 text-white shadow-sm"
                      : "text-gray-600 hover:text-indigo-700"
                  }`}
                >
                  <List className="h-3.5 w-3.5" />
                  List
                </button>
              </div>
            </div>
          </div>

          {/* Bulk action bar */}
          {selectedIds.size > 0 && (
            <div className="flex items-center gap-3 flex-wrap border-b border-indigo-100 bg-indigo-50 px-5 py-3">
              <span className="text-[13px] font-bold text-indigo-700">
                {selectedIds.size} selected
              </span>
              <div className="flex items-center gap-2 flex-wrap ml-2">
                {(Object.keys(STATUS_CONFIG) as Status[]).map((s) => {
                  const cfg = STATUS_CONFIG[s];
                  return (
                    <button
                      key={s}
                      type="button"
                      onClick={() => handleBulkStatus(s)}
                      className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-[12px] font-bold transition-all hover:opacity-80 ${cfg.color} ${cfg.bg} ${cfg.border}`}
                    >
                      <Tag className="h-3 w-3" />
                      Mark as {cfg.label}
                    </button>
                  );
                })}
                <button
                  type="button"
                  onClick={handleBulkDelete}
                  disabled={bulkDeleting}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-red-200 bg-red-50 px-3 py-1.5 text-[12px] font-bold text-red-700 transition-all hover:bg-red-100 disabled:opacity-50"
                >
                  {bulkDeleting
                    ? <div className="h-3 w-3 rounded-full border-2 border-red-300 border-t-red-600 animate-spin" />
                    : <Trash className="h-3 w-3" />}
                  Delete selected
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedIds(new Set())}
                  className="rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-[12px] font-bold text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  Clear
                </button>
              </div>
            </div>
          )}

          {/* Content */}
          <div className="p-4 sm:p-5 bg-gray-50/50">
            {isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}
              </div>
            ) : filteredEnquiries.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-gray-200 bg-white py-20 text-center">
                <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-50 to-violet-50 border border-indigo-100">
                  <Inbox className="h-7 w-7 text-indigo-400" />
                </div>
                <p className="text-[18px] font-black text-gray-800">No enquiries found</p>
                <p className="mt-2 text-[14px] text-gray-600 font-medium max-w-[240px] leading-relaxed">
                  {search
                    ? "Try a different search term."
                    : activeFilter !== "all"
                      ? `No "${STATUS_CONFIG[activeFilter as Status].label}" enquiries yet.`
                        : "Employer enquiries will appear here once submitted."}
                </p>
                {(search || activeFilter !== "all") && (
                  <button
                    type="button"
                    onClick={() => { setSearch(""); setActiveFilter("all"); }}
                    className="mt-5 rounded-2xl bg-gradient-to-r from-indigo-500 to-violet-600 px-6 py-2.5 text-[14px] font-bold text-white hover:opacity-90 transition-opacity shadow-md shadow-indigo-200"
                  >
                    Clear filters
                  </button>
                )}
              </div>
            ) : (
              <>
                {/* Select-all row */}
                <div className="flex items-center gap-2 mb-3">
                  <button
                    type="button"
                    onClick={handleSelectAll}
                    className="flex items-center gap-2 text-[13px] font-bold text-gray-500 hover:text-indigo-600 transition-colors"
                  >
                    {allVisibleSelected
                      ? <CheckSquare className="h-4 w-4 text-indigo-500" />
                      : <Square className="h-4 w-4" />}
                    {allVisibleSelected ? "Deselect page" : "Select page"}
                  </button>
                </div>

                <div className={viewMode === "list" ? "grid gap-3 grid-cols-1" : "grid gap-3 sm:grid-cols-1 lg:grid-cols-2"}>
                  {visibleEnquiries.map((enq, i) => (
                    <EnquiryCard
                      key={enq.id}
                      enq={enq}
                      index={i}
                      selected={selectedIds.has(enq.id)}
                      onSelect={handleSelect}
                      onDelete={() => void handleDelete(enq.id)}
                      isBusy={busyId === enq.id}
                      onStatusChange={handleStatusChange}
                      onNoteSave={handleNoteSave}
                      onOpenSupportChat={handleOpenSupportChat}
                    />
                  ))}
                </div>
              </>
            )}
          </div>

          {/* ── Pagination ── */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-gray-100 bg-white px-5 py-4 gap-3 flex-wrap">
              <button
                disabled={currentPage <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="inline-flex items-center gap-1.5 rounded-2xl border-2 border-gray-200 bg-white px-4 py-2.5 text-[14px] font-bold text-gray-800 hover:border-indigo-300 hover:text-indigo-700 hover:bg-indigo-50 disabled:opacity-40 disabled:cursor-default transition-all"
              >
                <ChevronLeft className="h-4 w-4" /> Previous
              </button>

              <div className="flex items-center gap-1.5 flex-wrap justify-center">
                {pageNumbers.map((p, idx) =>
                  p === "..." ? (
                    <span key={`e-${idx}`} className="px-1 text-[14px] text-gray-600 font-bold">…</span>
                  ) : (
                    <button
                      key={p}
                      onClick={() => setPage(p as number)}
                      className={`flex h-10 w-10 items-center justify-center rounded-2xl text-[14px] font-black transition-all duration-150 ${
                        p === currentPage
                          ? "bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-md shadow-indigo-200 scale-110"
                          : "bg-white border-2 border-gray-200 text-gray-800 hover:border-indigo-300 hover:text-indigo-700 hover:bg-indigo-50"
                      }`}
                    >
                      {p}
                    </button>
                  ),
                )}
              </div>

              <button
                disabled={currentPage >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="inline-flex items-center gap-1.5 rounded-2xl border-2 border-gray-200 bg-white px-4 py-2.5 text-[14px] font-bold text-gray-800 hover:border-indigo-300 hover:text-indigo-700 hover:bg-indigo-50 disabled:opacity-40 disabled:cursor-default transition-all"
              >
                Next <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>

        {/* Results count footer */}
        {!isLoading && filteredEnquiries.length > 0 && (
          <p className="text-center text-[13px] text-gray-600 font-semibold pb-2">
            Showing{" "}
            <span className="font-black text-indigo-700">{startItem}–{endItem}</span>
            {" "}of{" "}
            <span className="font-black text-gray-900">{filteredEnquiries.length}</span> enquiries
          </p>
        )}
      </div>
    </>
  );
};

export default AdminEnquiry;
