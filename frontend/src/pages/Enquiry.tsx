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
} from "lucide-react";
import { streamSse } from "@/lib/sse";

interface EnquiryRecord {
  id: number;
  username: string;
  date: string;
  email: string;
  phone: string;
  message: string;
  createdAt: string;
}

const PAGE_SIZE = 20;

/* ─── Avatar color palette ─────────────────────────────────────────────── */
const AVATAR_COLORS = [
  { bg: "bg-rose-100", text: "text-rose-700", ring: "ring-rose-200" },
  { bg: "bg-violet-100", text: "text-violet-700", ring: "ring-violet-200" },
  { bg: "bg-sky-100", text: "text-sky-700", ring: "ring-sky-200" },
  { bg: "bg-amber-100", text: "text-amber-700", ring: "ring-amber-200" },
  { bg: "bg-teal-100", text: "text-teal-700", ring: "ring-teal-200" },
  { bg: "bg-fuchsia-100", text: "text-fuchsia-700", ring: "ring-fuchsia-200" },
  { bg: "bg-indigo-100", text: "text-indigo-700", ring: "ring-indigo-200" },
  { bg: "bg-orange-100", text: "text-orange-700", ring: "ring-orange-200" },
];

const getAvatarColor = (id: number) => AVATAR_COLORS[id % AVATAR_COLORS.length];

/* ─── Skeleton card ────────────────────────────────────────────────────── */
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

/* ─── Enquiry card ──────────────────────────────────────────────────────── */
function EnquiryCard({
  enq,
  index,
  onDelete,
  isBusy,
}: {
  enq: EnquiryRecord;
  index: number;
  onDelete: () => void;
  isBusy: boolean;
}) {
  const avatar = getAvatarColor(enq.id);
  const initials =
    enq.username
      .split(" ")
      .slice(0, 2)
      .map((w) => w[0])
      .join("")
      .toUpperCase() || "?";

  return (
    <div
      className="enq-card-enter group rounded-2xl border-2 border-transparent bg-white shadow-sm hover:shadow-lg hover:border-indigo-100 hover:-translate-y-0.5 transition-all duration-200 overflow-hidden"
      style={{ animationDelay: `${index * 0.035}s` }}
    >
      {/* Colored top accent bar */}
      <div className={`h-1 w-full ${
        ["bg-rose-400","bg-violet-400","bg-sky-400","bg-amber-400","bg-teal-400","bg-fuchsia-400","bg-indigo-400","bg-orange-400"][enq.id % 8]
      }`} />

      <div className="p-4 sm:p-5">
        {/* Header row */}
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex items-center gap-3.5 min-w-0">
            <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl font-black text-[15px] ring-2 ${avatar.bg} ${avatar.text} ${avatar.ring}`}>
              {initials}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-[16px] font-extrabold text-gray-950 truncate leading-tight">
                  {enq.username}
                </p>
                <span className="shrink-0 rounded-full bg-indigo-50 px-2.5 py-0.5 text-[11px] font-black text-indigo-600 tracking-wide">
                  #{enq.id}
                </span>
              </div>
              <p className="text-[13px] text-gray-600 truncate mt-0.5 font-semibold">
                {enq.email}
              </p>
            </div>
          </div>
          <DeleteButton onDelete={onDelete} isBusy={isBusy} />
        </div>

        {/* Info chips row */}
        <div className="flex flex-wrap gap-2 mb-4">
          {/* Email chip */}
          <div className="flex items-center gap-1.5 rounded-xl bg-sky-50 border border-sky-100 px-3 py-1.5 min-w-0">
            <Mail className="h-3.5 w-3.5 shrink-0 text-sky-500" />
            <span className="text-[13px] font-semibold text-sky-900 truncate max-w-[180px]">{enq.email}</span>
          </div>

          {/* Phone chip */}
          <div className="flex items-center gap-1.5 rounded-xl bg-emerald-50 border border-emerald-100 px-3 py-1.5">
            <Phone className="h-3.5 w-3.5 shrink-0 text-emerald-500" />
            <span className="text-[13px] font-semibold text-emerald-900">
              {enq.phone || <span className="text-emerald-500 font-normal">Not provided</span>}
            </span>
          </div>

          {/* Date chip */}
          <div className="flex items-center gap-1.5 rounded-xl bg-amber-50 border border-amber-100 px-3 py-1.5">
            <Calendar className="h-3.5 w-3.5 shrink-0 text-amber-500" />
            <span className="text-[13px] font-semibold text-amber-900 whitespace-nowrap">{enq.date}</span>
          </div>
        </div>

        {/* Message box */}
        <div className="rounded-xl bg-gradient-to-br from-slate-50 to-gray-50 border border-gray-100 p-4">
          <p className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-widest text-gray-600 mb-2">
            <MessageSquare className="h-3 w-3" /> Message
          </p>
          <p className="text-[14px] text-gray-900 leading-relaxed whitespace-pre-line font-medium">
            {enq.message || (
              <span className="italic text-gray-500 font-normal">No message provided.</span>
            )}
          </p>
        </div>
      </div>
    </div>
  );
}

/* ─── Main component ───────────────────────────────────────────────────── */
const Enquiry = () => {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [enquiries, setEnquiries] = useState<EnquiryRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [busyId, setBusyId] = useState<number | null>(null);
  const enquiriesRef = useRef<EnquiryRecord[]>([]);
  const searchRef = useRef("");

  useEffect(() => { enquiriesRef.current = enquiries; }, [enquiries]);
  useEffect(() => { searchRef.current = search; }, [search]);

  useEffect(() => {
    const controller = new AbortController();
    const load = async () => {
      try {
        setIsLoading(true);
        const params = new URLSearchParams();
        if (search.trim()) params.set("search", search.trim());
        const response = await fetch(
          `/api/enquiries${params.toString() ? `?${params.toString()}` : ""}`,
          { signal: controller.signal },
        );
        const data = (await response.json()) as { error?: string; enquiries?: EnquiryRecord[] };
        if (!response.ok || !data.enquiries)
          throw new Error(data.error || "Failed to load enquiries");
        setEnquiries([...data.enquiries].sort((a, b) => b.id - a.id));
        setPage(1);
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

  useEffect(() => {
    const controller = new AbortController();
    let lastId = 0;
    let pollTimer: number | null = null;
    const computeLocalLastId = () =>
      enquiriesRef.current.reduce((m, e) => Math.max(m, e.id), 0);
    const sleep = (ms: number) => new Promise((r) => window.setTimeout(r, ms));

    const loadLastId = async () => {
      try {
        const res = await fetch("/api/enquiries/last-id", { signal: controller.signal });
        const d = (await res.json().catch(() => ({}))) as { lastId?: number };
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
                return [...prev, next].sort((a, b) => b.id - a.id);
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
                const res = await fetch("/api/enquiries", { signal: controller.signal });
                const d = (await res.json().catch(() => ({}))) as { enquiries?: EnquiryRecord[] };
                if (res.ok && d.enquiries) {
                  setEnquiries([...d.enquiries].sort((a, b) => b.id - a.id));
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

  const totalPages = Math.max(1, Math.ceil(enquiries.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);

  const visibleEnquiries = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return enquiries.slice(start, start + PAGE_SIZE);
  }, [currentPage, enquiries]);

  const handleDelete = async (id: number) => {
    try {
      setBusyId(id);
      const response = await fetch(`/api/enquiries/${id}`, { method: "DELETE" });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error || "Failed to delete enquiry");
      setEnquiries((prev) => prev.filter((e) => e.id !== id));
      toast.success("Enquiry deleted successfully");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete enquiry");
    } finally {
      setBusyId(null);
    }
  };

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
  const endItem = Math.min(currentPage * PAGE_SIZE, enquiries.length);

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

          {/* Stats pills */}
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

          {/* Gradient toolbar */}
          <div className="border-b border-gray-100 bg-gradient-to-r from-slate-50 via-indigo-50/40 to-violet-50/40 px-5 py-4">
            <div className="relative max-w-lg">
              <Search
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-indigo-400 pointer-events-none"
                style={{ height: 18, width: 18 }}
              />
              <input
                type="text"
                placeholder="Search by name, email, phone…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
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
          </div>

          {/* Content */}
          <div className="p-4 sm:p-5 bg-gray-50/50">
            {isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}
              </div>
            ) : enquiries.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-gray-200 bg-white py-20 text-center">
                <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-50 to-violet-50 border border-indigo-100">
                  <Inbox className="h-7 w-7 text-indigo-400" />
                </div>
                <p className="text-[18px] font-black text-gray-800">No enquiries found</p>
                <p className="mt-2 text-[14px] text-gray-600 font-medium max-w-[240px] leading-relaxed">
                  {search
                    ? "Try a different search term."
                    : "Employer enquiries will appear here once submitted."}
                </p>
                {search && (
                  <button
                    type="button"
                    onClick={() => setSearch("")}
                    className="mt-5 rounded-2xl bg-gradient-to-r from-indigo-500 to-violet-600 px-6 py-2.5 text-[14px] font-bold text-white hover:opacity-90 transition-opacity shadow-md shadow-indigo-200"
                  >
                    Clear search
                  </button>
                )}
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-1 lg:grid-cols-2">
                {visibleEnquiries.map((enq, i) => (
                  <EnquiryCard
                    key={enq.id}
                    enq={enq}
                    index={i}
                    onDelete={() => void handleDelete(enq.id)}
                    isBusy={busyId === enq.id}
                  />
                ))}
              </div>
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
        {!isLoading && enquiries.length > 0 && (
          <p className="text-center text-[13px] text-gray-600 font-semibold pb-2">
            Showing{" "}
            <span className="font-black text-indigo-700">{startItem}–{endItem}</span>
            {" "}of{" "}
            <span className="font-black text-gray-900">{enquiries.length}</span> enquiries
          </p>
        )}
      </div>
    </>
  );
};

export default Enquiry;