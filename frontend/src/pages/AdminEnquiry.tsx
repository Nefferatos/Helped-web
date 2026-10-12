import { useEffect, useMemo, useRef, useState } from "react";
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
  Reply,
  Filter,
  CheckSquare,
  Square,
  Trash,
  ChevronDown,
  User,
  Tag,
  LayoutGrid,
  List,
  Sparkles,
  Copy,
  ExternalLink,
} from "lucide-react";
import { getAgencyAdminAuthHeaders } from "@/lib/agencyAdminAuth";
import { readSafeJson } from "@/lib/safeJson";

/* ─── Quick contact actions ─────────────────────────────────────────────── */
type Status = "new" | "in_progress" | "replied" | "resolved";

interface EnquiryRecord {
  id: number; username: string; date: string; email: string; phone: string; message: string; createdAt: string;
  status?: Status; note?: string; assignedTo?: string; clientId?: number; clientName?: string;
}
interface EnqMeta { status?: Status; note?: string; assignedTo?: string }
const PAGE_SIZE = 20;
const STATUS_CONFIG: Record<Status, { label: string; color: string; bg: string; border: string; icon: typeof Circle }> = {
  new: { label: "New", color: "text-sky-700", bg: "bg-sky-50", border: "border-sky-200", icon: Circle },
  in_progress: { label: "In Progress", color: "text-amber-700", bg: "bg-amber-50", border: "border-amber-200", icon: Clock },
  replied: { label: "Replied", color: "text-violet-700", bg: "bg-violet-50", border: "border-violet-200", icon: Reply },
  resolved: { label: "Resolved", color: "text-emerald-700", bg: "bg-emerald-50", border: "border-emerald-200", icon: CheckCircle2 },
};
const FILTER_TABS: { key: "all" | Status; label: string }[] = [{ key: "all", label: "All" }, { key: "new", label: "New" }, { key: "resolved", label: "Resolved" }];
const AVATAR_COLORS = [
  { bg: "bg-rose-100", text: "text-rose-700", ring: "ring-rose-200" }, { bg: "bg-violet-100", text: "text-violet-700", ring: "ring-violet-200" },
  { bg: "bg-sky-100", text: "text-sky-700", ring: "ring-sky-200" }, { bg: "bg-amber-100", text: "text-amber-700", ring: "ring-amber-200" },
  { bg: "bg-teal-100", text: "text-teal-700", ring: "ring-teal-200" }, { bg: "bg-fuchsia-100", text: "text-fuchsia-700", ring: "ring-fuchsia-200" },
  { bg: "bg-indigo-100", text: "text-indigo-700", ring: "ring-indigo-200" }, { bg: "bg-orange-100", text: "text-orange-700", ring: "ring-orange-200" },
];
const TOP_BAR_COLORS = ["bg-rose-400", "bg-violet-400", "bg-sky-400", "bg-amber-400", "bg-teal-400", "bg-fuchsia-400", "bg-indigo-400", "bg-orange-400"];
const getAvatarColor = (id: number) => AVATAR_COLORS[id % AVATAR_COLORS.length];

function withStatusDefaults(enquiries: EnquiryRecord[]): EnquiryRecord[] {
  return enquiries.map((enquiry) => ({ ...enquiry, status: enquiry.status ?? "new" }));
}

async function patchEnquiry(id: number, patch: Partial<EnqMeta>, options: { silent?: boolean } = {}): Promise<boolean> {
  try {
    const response = await fetch(`/api/enquiries/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json", ...getAgencyAdminAuthHeaders() }, body: JSON.stringify(patch) });
    const result = await readSafeJson<{ error?: string }>(response);
    if (!response.ok) throw new Error(result.error || "Failed to update enquiry");
    return true;
  } catch (error) {
    if (!options.silent) toast.error(error instanceof Error ? error.message : "Failed to save changes");
    return false;
  }
}

function SkeletonCard() {
  return <div className="animate-pulse rounded-2xl border border-gray-100 bg-white p-5"><div className="mb-4 flex items-center gap-3"><div className="h-12 w-12 rounded-2xl bg-gray-100" /><div className="space-y-2"><div className="h-4 w-36 rounded-lg bg-gray-100" /><div className="h-3 w-52 rounded-lg bg-gray-100" /></div></div><div className="h-20 rounded-xl bg-gray-50" /></div>;
}

function DeleteButton({ onDelete, isBusy }: { onDelete: () => void; isBusy: boolean }) {
  const [confirming, setConfirming] = useState(false);
  const timerRef = useRef<number | null>(null);
  const handleClick = () => {
    if (isBusy) return;
    if (confirming) { if (timerRef.current) window.clearTimeout(timerRef.current); setConfirming(false); onDelete(); }
    else { setConfirming(true); timerRef.current = window.setTimeout(() => setConfirming(false), 2500); }
  };
  useEffect(() => () => { if (timerRef.current) window.clearTimeout(timerRef.current); }, []);
  return <button type="button" onClick={handleClick} disabled={isBusy} title={confirming ? "Click again to confirm delete" : "Delete enquiry"} className={`flex shrink-0 items-center justify-center rounded-xl border-2 transition-all duration-200 disabled:opacity-40 disabled:cursor-default ${confirming ? "h-9 gap-1.5 px-3 border-red-400 bg-red-50 text-red-600" : "h-9 w-9 border-transparent bg-gray-100 text-gray-400 hover:border-red-300 hover:bg-red-50 hover:text-red-500"}`}>
    {isBusy ? <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-gray-600" /> : confirming ? <><Trash2 className="h-4 w-4" /><span className="text-[12px] font-bold">Confirm?</span></> : <Trash2 className="h-4 w-4" />}
  </button>;
}

function StatusBadge({ status }: { status: Status }) {
  const config = STATUS_CONFIG[status]; const Icon = config.icon;
  return <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-bold ${config.color} ${config.bg} ${config.border}`}><Icon className="h-3 w-3" />{config.label}</span>;
}

function StatusDropdown({ status, onChange }: { status: Status; onChange: (status: Status) => void }) {
  const [open, setOpen] = useState(false); const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const closeOnOutsideClick = (event: MouseEvent) => { if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", closeOnOutsideClick); return () => document.removeEventListener("mousedown", closeOnOutsideClick);
  }, []);
  return <div ref={ref} className="relative">
    <button type="button" onClick={() => setOpen((value) => !value)} className="inline-flex items-center gap-1 rounded-full px-1 py-0.5 text-[11px] font-bold"><StatusBadge status={status} /><ChevronDown className="ml-0.5 h-3 w-3 text-gray-400" /></button>
    {open && <div className="absolute left-0 top-full z-50 mt-1.5 w-44 overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-xl">{(Object.keys(STATUS_CONFIG) as Status[]).filter((value) => value !== "replied").map((value) => {
      const config = STATUS_CONFIG[value]; const Icon = config.icon;
      return <button key={value} type="button" onClick={() => { onChange(value); setOpen(false); }} className={`flex w-full items-center gap-2.5 px-3.5 py-2.5 text-[13px] font-semibold transition-colors hover:bg-gray-50 ${value === status ? config.color : "text-gray-700"}`}><Icon className={`h-3.5 w-3.5 ${config.color}`} />{config.label}{value === status && <CheckCircle2 className="ml-auto h-3.5 w-3.5 text-emerald-500" />}</button>;
    })}</div>}
  </div>;
}

function QuickContact({
  email,
  phone,
}: {
  email: string;
  phone: string;
}) {
  return (
    <div className="flex min-w-0 flex-wrap items-center gap-1.5">
      {/* Email copy */}
      {email && (
        <a
          href={`mailto:${email}`}
          title={`Email ${email}`}
          className="group flex min-w-0 max-w-full items-center gap-1.5 rounded-xl border border-sky-100 bg-sky-50 px-3 py-1.5 transition-colors hover:bg-sky-100 focus:outline-none focus:ring-2 focus:ring-sky-300"
        >
          <Mail className="h-3.5 w-3.5 shrink-0 text-sky-500" />
          <span className="max-w-[160px] truncate text-[13px] font-semibold text-sky-900">{email}</span>
        </a>
      )}

      {/* Phone copy */}
      {phone ? (
        <a
          href={`tel:${phone.replace(/[^+\d]/g, "")}`}
          title={`Call ${phone}`}
          className="group flex min-w-0 max-w-full items-center gap-1.5 rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-1.5 transition-colors hover:bg-emerald-100 focus:outline-none focus:ring-2 focus:ring-emerald-300"
        >
          <Phone className="h-3.5 w-3.5 shrink-0 text-emerald-500" />
          <span className="truncate text-[13px] font-semibold text-emerald-900">{phone}</span>
        </a>
      ) : !email ? (
        <div className="flex items-center gap-1.5 rounded-xl bg-gray-50 border border-gray-100 px-3 py-1.5">
          <Phone className="h-3.5 w-3.5 shrink-0 text-gray-400" />
          <span className="text-[13px] text-gray-400 font-normal">No contact details</span>
        </div>
      ) : null}
    </div>
  );
}

/* ─── Enquiry card ──────────────────────────────────────────────────────── */
interface MatchCandidate {
  maidId: number;
  maidReferenceCode: string;
  maidName: string;
  score: number;
  reasons: string[];
}

interface MatchReviewData {
  aiUsed?: boolean;
  fallbackUsed?: boolean;
  matches?: MatchCandidate[];
  matchReview?: {
    requirements?: { known?: string[]; missing?: string[] };
    draftMessage?: string;
  };
}

function MatchReview({ enq }: { enq: EnquiryRecord }) {
  const [matches, setMatches] = useState<MatchCandidate[] | null>(null);
  const [review, setReview] = useState<MatchReviewData | null>(null);
  const [isMatching, setIsMatching] = useState(false);
  const [manualMaidOptions, setManualMaidOptions] = useState<Array<{ id: number; maidReferenceCode: string; maidName: string; nationality: string; status: string }>>([]);
  const [manualMaidReferences, setManualMaidReferences] = useState<string[]>([]);
  const [manualSearch, setManualSearch] = useState("");
  const [manualOpen, setManualOpen] = useState(false);
  const [isLoadingManualMaids, setIsLoadingManualMaids] = useState(false);
  const [manualMaidError, setManualMaidError] = useState("");

  const selectedMatches = useMemo(() => {
    const manual = manualMaidOptions
      .filter((maid) => manualMaidReferences.includes(maid.maidReferenceCode))
      .map((maid) => ({ maidId: maid.id, maidReferenceCode: maid.maidReferenceCode, maidName: maid.maidName, score: 0, reasons: ["Manually selected"] }));
    return [...(matches ?? []).filter((match) => !manualMaidReferences.includes(match.maidReferenceCode)), ...manual];
  }, [matches, manualMaidOptions, manualMaidReferences]);

  const draft = useMemo(() => {
    if (!selectedMatches.length) return "";
    const profileLines = selectedMatches.map((match, index) => {
      const profileUrl = window.location.origin + "/maids/" + encodeURIComponent(match.maidReferenceCode);
      return (index + 1) + ". " + match.maidName + " (" + match.maidReferenceCode + ")\n" + profileUrl;
    });
    const introduction = review?.matchReview?.draftMessage || "Hello " + enq.username + ",\n\nBased on the requirements you shared, our team has shortlisted the following helper profile" + (selectedMatches.length === 1 ? "" : "s") + " for your review.";
    return introduction + "\n\n" + profileLines.join("\n\n") + "\n\nThese are preliminary recommendations subject to staff review and the candidates' current availability. Please let us know which profile you would like to discuss, or share any additional requirements.\n\nWarm regards,\nAT The Agency";
  }, [enq.username, selectedMatches, review]);

  const openManualMatching = async () => {
    setManualOpen((open) => !open);
    if (manualMaidOptions.length || isLoadingManualMaids) return;
    setIsLoadingManualMaids(true);
    setManualMaidError("");
    try {
      const response = await fetch("/api/maids?visibility=public&page=1&pageSize=500&noPhotos=true", { headers: getAgencyAdminAuthHeaders() });
      const result = await readSafeJson<{ maids?: Array<{ id?: number; referenceCode?: string; fullName?: string; name?: string; nationality?: string; status?: string; availability?: string }>; error?: string }>(response);
      if (!response.ok) throw new Error(result.error || "Could not load maid profiles");
      const options = (result.maids ?? []).flatMap((maid) => {
        const reference = String(maid.referenceCode ?? "").trim();
        const name = String(maid.fullName ?? maid.name ?? "").trim();
        if (!reference || !name) return [];
        return [{ id: Number(maid.id) || reference.length, maidReferenceCode: reference, maidName: name, nationality: maid.nationality ?? "", status: maid.status ?? maid.availability ?? "Available" }];
      });
      setManualMaidOptions(options);
      if (!options.length) setManualMaidError("No public maid profiles are available to select.");
    } catch (error) {
      setManualMaidError(error instanceof Error ? error.message : "Could not load maid profiles");
    } finally {
      setIsLoadingManualMaids(false);
    }
  };

  const filteredManualMaids = manualMaidOptions.filter((maid) =>
    `${maid.maidName} ${maid.maidReferenceCode} ${maid.nationality}`.toLowerCase().includes(manualSearch.toLowerCase().trim()),
  );

  const handleMatch = async () => {
    setIsMatching(true);
    try {
      const response = await fetch("/api/match", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAgencyAdminAuthHeaders() },
        body: JSON.stringify({ message: enq.message }),
      });
      const result = await readSafeJson<{ data?: MatchReviewData; error?: string }>(response);
      if (!response.ok) throw new Error(result.error || "Could not find matching profiles");
      setMatches(result.data?.matches ?? []);
      setReview(result.data ?? null);
      toast.success(result.data?.matches?.length ? (result.data.aiUsed ? "AI shortlist prepared for staff review" : "Shortlist prepared using the safe fallback") : "No available public profiles found");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not find matching profiles");
    } finally {
      setIsMatching(false);
    }
  };

  const copyDraft = async () => {
    try {
      await navigator.clipboard.writeText(draft);
      toast.success("Draft message copied — review it before sending");
    } catch {
      toast.error("Could not copy the draft message");
    }
  };

  return (
    <div className="mt-3">
      <button type="button" onClick={() => void handleMatch()} disabled={isMatching} className="inline-flex items-center gap-1.5 rounded-xl border border-violet-200 bg-violet-50 px-3 py-2 text-[12px] font-bold text-violet-700 transition hover:bg-violet-100 disabled:cursor-wait disabled:opacity-60">
        <Sparkles className={"h-3.5 w-3.5 " + (isMatching ? "animate-spin" : "")} />
        {isMatching ? "Finding matches…" : matches ? "Refresh maid matches" : "Find maid matches"}
      </button>
      <button type="button" onClick={() => void openManualMatching()} className="ml-2 inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3 py-2 text-[12px] font-bold text-slate-800 transition hover:border-violet-300 hover:bg-violet-50">
        <User className="h-3.5 w-3.5" /> {manualOpen ? "Hide manual matching" : "Match manually"}
      </button>

      {manualOpen && (
        <div className="mt-3 rounded-xl border border-slate-200 bg-white p-3.5">
          <p className="text-[13px] font-bold text-slate-900">Choose maid profiles</p>
          <p className="mt-1 text-[12px] text-slate-600">Select one or more profiles to add them to the shortlist. This does not change a maid’s availability.</p>
          <div className="relative mt-3">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <input value={manualSearch} onChange={(event) => setManualSearch(event.target.value)} placeholder="Search by name, nationality, or reference" className="h-10 w-full rounded-lg border border-slate-300 bg-white pl-9 pr-3 text-[13px] text-slate-900 outline-none focus:border-violet-400" />
          </div>
          {isLoadingManualMaids ? <p className="py-5 text-center text-[13px] text-slate-700">Loading maid profiles…</p> : manualMaidError ? <p className="py-4 text-[13px] text-slate-700">{manualMaidError}</p> : (
            <div className="mt-3 max-h-56 space-y-1 overflow-y-auto">
              {filteredManualMaids.map((maid) => {
                const selected = manualMaidReferences.includes(maid.maidReferenceCode);
                return <label key={maid.maidReferenceCode} className="flex cursor-pointer items-center gap-3 rounded-lg border border-slate-100 px-3 py-2.5 hover:bg-violet-50">
                  <input type="checkbox" checked={selected} onChange={() => setManualMaidReferences((current) => selected ? current.filter((reference) => reference !== maid.maidReferenceCode) : [...current, maid.maidReferenceCode])} className="h-4 w-4 accent-violet-600" />
                  <span className="min-w-0 flex-1"><span className="block truncate text-[13px] font-bold text-slate-900">{maid.maidName}</span><span className="block truncate text-[12px] text-slate-700">{maid.maidReferenceCode}{maid.nationality ? ` · ${maid.nationality}` : ""} · {maid.status}</span></span>
                </label>;
              })}
              {!filteredManualMaids.length && <p className="py-4 text-center text-[13px] text-slate-700">No profiles match your search.</p>}
            </div>
          )}
        </div>
      )}

      {(matches || manualMaidReferences.length > 0) && (
        <div className="mt-3 rounded-xl border border-violet-100 bg-violet-50/50 p-3.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-[11px] font-black uppercase tracking-widest text-violet-700">{review?.aiUsed ? "AI shortlist — staff review required" : "Fallback shortlist — staff review required"}</p>
            {draft && <button type="button" onClick={() => void copyDraft()} className="inline-flex items-center gap-1 rounded-lg bg-violet-600 px-2.5 py-1.5 text-[11px] font-bold text-white hover:bg-violet-700"><Copy className="h-3 w-3" /> Copy draft</button>}
          </div>
          {selectedMatches.length ? (
            <div className="mt-2.5 space-y-2">
              {selectedMatches.map((match) => (
                <a key={match.maidId} href={"/maids/" + encodeURIComponent(match.maidReferenceCode)} target="_blank" rel="noreferrer" className="flex items-center justify-between gap-3 rounded-lg border border-white bg-white px-3 py-2.5 hover:border-violet-200">
                  <span className="min-w-0"><span className="block truncate text-[13px] font-bold text-slate-900">{match.maidName}</span><span className="block truncate text-[11px] text-slate-500">{match.maidReferenceCode} · {match.reasons[0]}</span></span>
                  <span className="flex shrink-0 items-center gap-1 text-[11px] font-bold text-violet-700">{match.reasons[0] === "Manually selected" ? "Manual" : `${match.score}%`} <ExternalLink className="h-3 w-3" /></span>
                </a>
              ))}
              <textarea readOnly value={draft} className="mt-1 min-h-40 w-full resize-y rounded-lg border border-violet-100 bg-white p-3 text-[12px] leading-relaxed text-slate-700 outline-none" aria-label="Draft employer shortlist message" />
            </div>
          ) : <p className="mt-2 text-[12px] text-slate-600">No public, available maid profiles matched this enquiry. Add more requirements or review the maid records.</p>}
        </div>
      )}
    </div>
  );
}

function EnquiryCard({
  enq,
  index,
  selected,
  onSelect,
  onDelete,
  isBusy,
  onStatusChange,
}: {
  enq: EnquiryRecord;
  index: number;
  selected: boolean;
  onSelect: (id: number) => void;
  onDelete: () => void;
  isBusy: boolean;
  onStatusChange: (id: number, status: Status) => void;
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
            <DeleteButton onDelete={onDelete} isBusy={isBusy} />
          </div>
        </div>

        {/* Quick contact actions */}
        <div className="mb-3">
          <QuickContact
            email={enq.email}
            phone={enq.phone}
          />
        </div>

        {/* Date */}
        <div className="flex items-center gap-1.5 mb-3">
          <Calendar className="h-3.5 w-3.5 text-amber-500" />
          <span className="text-[12px] font-semibold text-amber-800">{enq.date}</span>
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
      </div>
    </div>
  );
}

/* ─── Main component ───────────────────────────────────────────────────── */
const AdminEnquiry = () => {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState<"all" | Status>("all");
  const [viewMode, setViewMode] = useState<"cards" | "list">("list");
  const [enquiries, setEnquiries] = useState<EnquiryRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    const loadEnquiries = async () => {
      setIsLoading(true);
      try {
        const params = new URLSearchParams();
        if (search.trim()) params.set("search", search.trim());
        params.set("pageSize", "500");
        const response = await fetch(`/api/enquiries?${params.toString()}`, {
          headers: getAgencyAdminAuthHeaders(),
          signal: controller.signal,
        });
        const data = await readSafeJson<{ error?: string; enquiries?: EnquiryRecord[] }>(response);
        if (!response.ok || !data.enquiries) throw new Error(data.error || "Failed to load enquiries");
        setEnquiries(withStatusDefaults([...data.enquiries].sort((a, b) => b.id - a.id)));
      } catch (error) {
        if (!controller.signal.aborted) toast.error(error instanceof Error ? error.message : "Failed to load enquiries");
      } finally {
        if (!controller.signal.aborted) setIsLoading(false);
      }
    };
    void loadEnquiries();
    return () => controller.abort();
  }, [search]);

  const handleDelete = async (id: number) => {
    setBusyId(id);
    try {
      const response = await fetch(`/api/enquiries/${id}`, {
        method: "DELETE",
        headers: getAgencyAdminAuthHeaders(),
      });
      const result = await readSafeJson<{ error?: string }>(response);
      if (!response.ok) throw new Error(result.error || "Failed to delete enquiry");
      setEnquiries((current) => current.filter((enquiry) => enquiry.id !== id));
      setSelectedIds((current) => {
        const next = new Set(current);
        next.delete(id);
        return next;
      });
      toast.success("Enquiry deleted");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete enquiry");
    } finally {
      setBusyId(null);
    }
  };

  const handleBulkDelete = async () => {
    const ids = Array.from(selectedIds);
    if (!ids.length) return;
    if (!confirmingDelete) {
      setConfirmingDelete(true);
      return;
    }
    setBulkDeleting(true);
    const results = await Promise.all(ids.map(async (id) => {
      try {
        const response = await fetch(`/api/enquiries/${id}`, { method: "DELETE", headers: getAgencyAdminAuthHeaders() });
        const result = await readSafeJson<{ error?: string }>(response);
        return { id, ok: response.ok, error: result.error };
      } catch (error) {
        return { id, ok: false, error: error instanceof Error ? error.message : "Delete failed" };
      }
    }));
    const deletedIds = new Set(results.filter((result) => result.ok).map((result) => result.id));
    const failedCount = results.length - deletedIds.size;
    setEnquiries((current) => current.filter((enquiry) => !deletedIds.has(enquiry.id)));
    setSelectedIds((current) => new Set([...current].filter((id) => !deletedIds.has(id))));
    setConfirmingDelete(false);
    setBulkDeleting(false);
    if (deletedIds.size) toast.success(`Deleted ${deletedIds.size} ${deletedIds.size === 1 ? "enquiry" : "enquiries"}`);
    if (failedCount) toast.error(`${failedCount} ${failedCount === 1 ? "enquiry" : "enquiries"} could not be deleted`);
  };

  const handleStatusChange = async (id: number, status: Status) => {
    const previousStatus = enquiries.find((enquiry) => enquiry.id === id)?.status ?? "new";
    setEnquiries((current) => current.map((enquiry) => enquiry.id === id ? { ...enquiry, status } : enquiry));
    const saved = await patchEnquiry(id, { status });
    if (!saved) {
      setEnquiries((current) => current.map((enquiry) => enquiry.id === id ? { ...enquiry, status: previousStatus } : enquiry));
    }
  };

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

  /* ── Bulk status change (optimistic, persisted via API) ── */
  const handleBulkStatus = async (status: Status) => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    const prevById = new Map(
      ids.map((id) => [id, enquiries.find((e) => e.id === id)?.status ?? "new"] as const),
    );
    setEnquiries((prev) => prev.map((e) => selectedIds.has(e.id) ? { ...e, status } : e));
    setSelectedIds(new Set());

    const results = await Promise.all(ids.map((id) => patchEnquiry(id, { status }, { silent: true })));
    const failedIds = ids.filter((_, i) => !results[i]);
    const okCount = ids.length - failedIds.length;

    if (failedIds.length > 0) {
      // Revert the ones that failed to persist.
      const failedSet = new Set(failedIds);
      setEnquiries((prev) => prev.map((e) =>
        failedSet.has(e.id) ? { ...e, status: prevById.get(e.id) ?? "new" } : e));
      toast.error(`${failedIds.length} could not be updated`);
    }
    if (okCount > 0) {
      toast.success(`Marked ${okCount} as "${STATUS_CONFIG[status].label}"`);
    }
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
    const counts: Record<"all" | Status, number> = {
      all: enquiries.length,
      new: 0,
      in_progress: 0,
      replied: 0,
      resolved: 0,
    };
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
                {(Object.keys(STATUS_CONFIG) as Status[]).filter((s) => s !== "in_progress" && s !== "replied").map((s) => {
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
                {confirmingDelete ? (
                  <div className="inline-flex items-center gap-1.5">
                    <span className="text-[12px] font-bold text-red-700">Delete {selectedIds.size} enqu{selectedIds.size !== 1 ? "iries" : "iry"}?</span>
                    <button
                      type="button"
                      onClick={handleBulkDelete}
                      disabled={bulkDeleting}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-red-500 bg-red-600 px-3 py-1.5 text-[12px] font-bold text-white transition-all hover:bg-red-700 disabled:opacity-50"
                    >
                      {bulkDeleting
                        ? <div className="h-3 w-3 rounded-full border-2 border-red-300 border-t-white animate-spin" />
                        : <Trash className="h-3 w-3" />}
                      Yes, delete
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmingDelete(false)}
                      className="rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-[12px] font-bold text-gray-600 hover:bg-gray-50 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={handleBulkDelete}
                    disabled={bulkDeleting}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-red-200 bg-red-50 px-3 py-1.5 text-[12px] font-bold text-red-700 transition-all hover:bg-red-100 disabled:opacity-50"
                  >
                    <Trash className="h-3 w-3" />
                    Delete selected
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => { setSelectedIds(new Set()); setConfirmingDelete(false); }}
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
