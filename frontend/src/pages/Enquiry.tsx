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
  User,
  Calendar,
  MessageSquare,
  AlertCircle,
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

const PAGE_SIZE = 10;

/* ─── Skeleton card ────────────────────────────────────────────────────── */
function SkeletonCard() {
  return (
    <div className="animate-pulse rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="h-11 w-11 rounded-full bg-gray-100" />
          <div className="space-y-2">
            <div className="h-4 w-32 rounded-lg bg-gray-100" />
            <div className="h-3 w-48 rounded-lg bg-gray-100" />
          </div>
        </div>
        <div className="h-8 w-8 rounded-xl bg-gray-100" />
      </div>
      <div className="h-16 rounded-xl bg-gray-50" />
    </div>
  );
}

/* ─── Delete confirm button (double-click to confirm) ─────────────────── */
function DeleteButton({
  onDelete,
  isBusy,
}: {
  onDelete: () => void;
  isBusy: boolean;
}) {
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
      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border transition-all disabled:opacity-40 disabled:cursor-default ${
        confirming
          ? "border-red-300 bg-red-50 text-red-600 animate-pulse"
          : "border-gray-200 bg-white text-gray-400 hover:border-red-200 hover:bg-red-50 hover:text-red-500"
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
      } catch {
        /* ignore */
      } finally {
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
          if (
            error instanceof Error &&
            /Stream failed \((404|405)\)/.test(error.message)
          ) {
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
              } catch {
                /* ignore */
              }
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
      if (
        i === 1 ||
        i === totalPages ||
        (i >= currentPage - range && i <= currentPage + range)
      ) {
        pages.push(i);
      } else if (pages[pages.length - 1] !== "...") {
        pages.push("...");
      }
    }
    return pages;
  }, [totalPages, currentPage]);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap');
        .enq-root, .enq-root * { font-family: 'DM Sans', sans-serif; }

        @keyframes enqFadeUp {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .enq-card-enter {
          animation: enqFadeUp 0.32s cubic-bezier(0.16, 1, 0.3, 1) both;
        }
        @keyframes enqPulseIn {
          0%   { box-shadow: 0 0 0 0 rgba(16,185,129,0.4); }
          70%  { box-shadow: 0 0 0 8px rgba(16,185,129,0); }
          100% { box-shadow: 0 0 0 0 rgba(16,185,129,0); }
        }
        .enq-new { animation: enqPulseIn 1s ease; }
      `}</style>

      <div className="enq-root space-y-5">

        {/* ── Page header ── */}
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-600 shadow-md">
            <Mail className="h-5 w-5 text-white" />
          </div>
          <div>
            <h2 className="text-[22px] font-bold leading-tight text-gray-900">
              Employer Enquiries
            </h2>
            <p className="text-[14px] text-gray-500 font-medium mt-0.5">
              {enquiries.length} total enquir{enquiries.length !== 1 ? "ies" : "y"}
            </p>
          </div>
        </div>

        {/* ── Main card ── */}
        <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">

          {/* Toolbar */}
          <div className="border-b border-gray-100 bg-gray-50/60 px-5 py-4">
            <div className="relative max-w-md">
              <Search
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
                style={{ height: 18, width: 18 }}
              />
              <input
                type="text"
                placeholder="Search by name, email, phone…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-11 w-full rounded-xl border border-gray-200 bg-white pl-10 pr-10 text-[15px] text-gray-800 outline-none placeholder:text-gray-400 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 transition-all"
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
          <div className="p-4 sm:p-5">
            {isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <SkeletonCard key={i} />
                ))}
              </div>
            ) : enquiries.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200 bg-gray-50 py-16 text-center">
                <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-100">
                  <Inbox className="h-6 w-6 text-gray-400" />
                </div>
                <p className="text-[17px] font-bold text-gray-700">No enquiries found</p>
                <p className="mt-1.5 text-[14px] text-gray-400 max-w-[260px] leading-relaxed">
                  {search
                    ? "Try a different search term."
                    : "Employer enquiries will appear here once submitted."}
                </p>
                {search && (
                  <button
                    type="button"
                    onClick={() => setSearch("")}
                    className="mt-4 rounded-xl bg-emerald-600 px-5 py-2 text-[14px] font-semibold text-white hover:bg-emerald-700 transition-colors"
                  >
                    Clear search
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {visibleEnquiries.map((enq, i) => (
                  <div
                    key={enq.id}
                    className="enq-card-enter group rounded-2xl border border-gray-100 bg-white shadow-sm hover:shadow-md hover:border-emerald-200 hover:-translate-y-0.5 transition-all"
                    style={{ animationDelay: `${i * 0.04}s` }}
                  >
                    <div className="p-4 sm:p-5">
                      {/* Top row */}
                      <div className="flex items-start justify-between gap-3 mb-4">
                        <div className="flex items-center gap-3.5 min-w-0">
                          {/* Avatar */}
                          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-violet-100 text-violet-700 font-bold text-[15px]">
                            {enq.username
                              .split(" ")
                              .slice(0, 2)
                              .map((w) => w[0])
                              .join("")
                              .toUpperCase() || "?"}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="text-[16px] font-bold text-gray-900 truncate leading-snug">
                                {enq.username}
                              </p>
                              <span className="shrink-0 rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-bold text-gray-400">
                                #{enq.id}
                              </span>
                            </div>
                            <p className="text-[13px] text-gray-500 truncate mt-0.5">
                              {enq.email}
                            </p>
                          </div>
                        </div>

                        <DeleteButton
                          onDelete={() => void handleDelete(enq.id)}
                          isBusy={busyId === enq.id}
                        />
                      </div>

                      {/* Info grid */}
                      <div className="grid grid-cols-2 gap-2.5 rounded-xl bg-gray-50 p-3.5 sm:grid-cols-3 mb-3">
                        <div className="min-w-0">
                          <p className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-1">
                            <Mail className="h-3 w-3" /> Email
                          </p>
                          <p className="text-[13px] font-semibold text-gray-700 break-all leading-snug">
                            {enq.email}
                          </p>
                        </div>
                        <div className="min-w-0">
                          <p className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-1">
                            <Phone className="h-3 w-3" /> Phone
                          </p>
                          <p className="text-[13px] font-semibold text-gray-700 leading-snug">
                            {enq.phone || <span className="text-gray-400 font-normal">—</span>}
                          </p>
                        </div>
                        <div className="col-span-2 min-w-0 sm:col-span-1">
                          <p className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-1">
                            <Calendar className="h-3 w-3" /> Date
                          </p>
                          <p className="text-[13px] font-semibold text-gray-700 whitespace-pre-line leading-snug">
                            {enq.date}
                          </p>
                        </div>
                      </div>

                      {/* Message */}
                      <div className="rounded-xl border border-gray-100 bg-white p-3.5">
                        <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-2">
                          <MessageSquare className="h-3 w-3" /> Message
                        </p>
                        <p className="text-[14px] text-gray-700 leading-relaxed whitespace-pre-line">
                          {enq.message || <span className="italic text-gray-400">No message provided.</span>}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ── Pagination ── */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-gray-100 bg-gray-50/50 px-5 py-3.5 gap-3 flex-wrap">
              {/* Prev */}
              <button
                disabled={currentPage <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-4 py-2 text-[14px] font-semibold text-gray-700 hover:border-emerald-300 hover:text-emerald-700 disabled:opacity-40 disabled:cursor-default transition-all"
              >
                <ChevronLeft className="h-4 w-4" /> Previous
              </button>

              {/* Page numbers */}
              <div className="flex items-center gap-1.5 flex-wrap justify-center">
                {pageNumbers.map((p, idx) =>
                  p === "..." ? (
                    <span key={`e-${idx}`} className="px-1 text-[14px] text-gray-400 font-medium">
                      …
                    </span>
                  ) : (
                    <button
                      key={p}
                      onClick={() => setPage(p as number)}
                      className={`flex h-9 w-9 items-center justify-center rounded-xl text-[14px] font-bold transition-all ${
                        p === currentPage
                          ? "bg-emerald-600 text-white shadow-sm"
                          : "bg-white border border-gray-200 text-gray-600 hover:border-emerald-300 hover:text-emerald-700"
                      }`}
                    >
                      {p}
                    </button>
                  ),
                )}
              </div>

              {/* Next */}
              <button
                disabled={currentPage >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-4 py-2 text-[14px] font-semibold text-gray-700 hover:border-emerald-300 hover:text-emerald-700 disabled:opacity-40 disabled:cursor-default transition-all"
              >
                Next <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>

        {/* Results count */}
        {!isLoading && enquiries.length > 0 && (
          <p className="text-center text-[13px] text-gray-400 font-medium">
            Showing{" "}
            <span className="font-bold text-gray-600">
              {(currentPage - 1) * PAGE_SIZE + 1}–
              {Math.min(currentPage * PAGE_SIZE, enquiries.length)}
            </span>{" "}
            of <span className="font-bold text-gray-600">{enquiries.length}</span> enquiries
          </p>
        )}
      </div>
    </>
  );
};

export default Enquiry;