import { useEffect, useMemo, useState } from "react";
import {
  Bell,
  Search,
  UserRound,
  CalendarDays,
  Tag,
  ChevronLeft,
  ChevronRight,
  X,
  ClipboardList,
  FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/sonner";

interface MaidRequest {
  id: number;
  maidReferenceCode: string;
  maidName: string;
  clientId: number;
  clientName: string;
  clientEmail: string;
  clientPhone: string;
  status: string;
  requestDetails?: Record<string, string>;
  formData?: Record<string, string>;
  createdAt: string;
}

const PAGE_SIZE = 8;

const formatFieldLabel = (value: string) =>
  value
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^./, (char) => char.toUpperCase());

const STATUS_STYLES: Record<string, { bg: string; text: string; dot: string; label: string; tabActive: string }> = {
  pending:     { bg: "bg-amber-50 border-amber-200",     text: "text-amber-700",   dot: "bg-amber-400",   label: "Pending",     tabActive: "bg-amber-500 text-white border-amber-500" },
  interested:  { bg: "bg-sky-50 border-sky-200",         text: "text-sky-700",     dot: "bg-sky-400",     label: "Interested",  tabActive: "bg-sky-500 text-white border-sky-500" },
  direct_hire: { bg: "bg-emerald-50 border-emerald-200", text: "text-emerald-700", dot: "bg-emerald-500", label: "Direct Hire", tabActive: "bg-emerald-600 text-white border-emerald-600" },
  rejected:    { bg: "bg-red-50 border-red-200",         text: "text-red-600",     dot: "bg-red-400",     label: "Rejected",    tabActive: "bg-red-500 text-white border-red-500" },
};

const getStatusStyle = (status: string) =>
  STATUS_STYLES[status.toLowerCase()] ?? {
    bg: "bg-gray-50 border-gray-200", text: "text-gray-600", dot: "bg-gray-400", label: status, tabActive: "bg-gray-500 text-white border-gray-500",
  };

const isGeneralRequest = (r: MaidRequest) =>
  r.maidReferenceCode === "GENERAL" ||
  r.maidReferenceCode === "DIRECT-REQUEST" ||
  !r.maidReferenceCode;

/* ─── Skeleton loader ──────────────────────────────────────────────────── */
function SkeletonCard() {
  return (
    <div className="animate-pulse rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="flex items-start gap-3">
          <div className="h-11 w-11 rounded-full bg-gray-100" />
          <div className="space-y-2">
            <div className="h-4 w-36 rounded-lg bg-gray-100" />
            <div className="h-3 w-48 rounded-lg bg-gray-100" />
          </div>
        </div>
        <div className="h-7 w-24 rounded-full bg-gray-100" />
      </div>
      <div className="h-16 rounded-xl bg-gray-50" />
    </div>
  );
}

/* ─── Main component ───────────────────────────────────────────────────── */
const RequestsPage = () => {
  const [requests, setRequests] = useState<MaidRequest[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<MaidRequest | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    const loadRequests = async () => {
      try {
        setIsLoading(true);
        const response = await fetch("/api/direct-sales", { signal: controller.signal });
        const data = (await response.json().catch(() => ({}))) as {
          directSales?: MaidRequest[];
          error?: string;
        };
        if (!response.ok || !data.directSales)
          throw new Error(data.error || "Failed to load requests");
        setRequests(data.directSales);
      } catch (error) {
        if (!(error instanceof DOMException && error.name === "AbortError")) {
          toast.error(error instanceof Error ? error.message : "Failed to load requests");
        }
      } finally {
        setIsLoading(false);
      }
    };
    void loadRequests();
    return () => controller.abort();
  }, []);

  const filteredRequests = useMemo(() => {
    let result = requests;
    if (statusFilter !== "all")
      result = result.filter((r) => r.status.toLowerCase() === statusFilter);
    const term = search.trim().toLowerCase();
    if (term) {
      result = result.filter((r) =>
        [r.clientName, r.clientEmail, r.clientPhone, r.maidName, r.maidReferenceCode, r.status]
          .join(" ")
          .toLowerCase()
          .includes(term),
      );
    }
    return result;
  }, [requests, search, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredRequests.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const visibleRequests = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredRequests.slice(start, start + PAGE_SIZE);
  }, [currentPage, filteredRequests]);

  useEffect(() => {
    setPage(1);
  }, [search, statusFilter]);

  const detailEntries = useMemo(() => {
    if (!selectedRequest) return [];
    const source = selectedRequest.formData ?? selectedRequest.requestDetails ?? {};
    return Object.entries(source)
      .filter(([, value]) => String(value ?? "").trim().length > 0)
      .sort(([a], [b]) => a.localeCompare(b));
  }, [selectedRequest]);

  const counts = useMemo(
    () => ({
      all:         requests.length,
      pending:     requests.filter((r) => r.status === "pending").length,
      interested:  requests.filter((r) => r.status === "interested").length,
      direct_hire: requests.filter((r) => r.status === "direct_hire").length,
      rejected:    requests.filter((r) => r.status === "rejected").length,
    }),
    [requests],
  );

  const STATUS_TABS = [
    { key: "all",         label: "All",         count: counts.all },
    { key: "pending",     label: "Pending",     count: counts.pending },
    { key: "interested",  label: "Interested",  count: counts.interested },
    { key: "direct_hire", label: "Direct Hire", count: counts.direct_hire },
    { key: "rejected",    label: "Rejected",    count: counts.rejected },
  ];

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap');
        .rp-root, .rp-root * { font-family: 'DM Sans', sans-serif; }

        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .rp-card-enter {
          animation: fadeUp 0.32s cubic-bezier(0.16, 1, 0.3, 1) both;
        }
      `}</style>

      <div className="rp-root space-y-5">

        {/* ── Page Header ── */}
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-600 shadow-md">
            <Bell className="h-5 w-5 text-white" />
          </div>
          <div>
            <h2 className="text-[22px] font-bold leading-tight text-gray-900">Maid Requests</h2>
            <p className="text-[14px] text-gray-500 mt-0.5 font-medium">
              {counts.all} total &middot;{" "}
              <span className="text-amber-600 font-semibold">{counts.pending} pending</span>
            </p>
          </div>
        </div>

        {/* ── Stats strip ── */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: "Pending",     value: counts.pending,     color: "text-amber-600",   bg: "bg-amber-50 border-amber-100" },
            { label: "Interested",  value: counts.interested,  color: "text-sky-600",     bg: "bg-sky-50 border-sky-100" },
            { label: "Direct Hire", value: counts.direct_hire, color: "text-emerald-700", bg: "bg-emerald-50 border-emerald-100" },
            { label: "Rejected",    value: counts.rejected,    color: "text-red-500",     bg: "bg-red-50 border-red-100" },
          ].map((s) => (
            <div key={s.label} className={`rounded-2xl border px-4 py-3 ${s.bg}`}>
              <p className={`text-[26px] font-bold leading-none ${s.color}`}>{s.value}</p>
              <p className="mt-1 text-[13px] font-semibold text-gray-500">{s.label}</p>
            </div>
          ))}
        </div>

        {/* ── Main card ── */}
        <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">

          {/* Toolbar */}
          <div className="border-b border-gray-100 bg-gray-50/60 px-5 py-4 space-y-3">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4.5 w-4.5 text-gray-400 pointer-events-none" style={{ height: 18, width: 18 }} />
              <input
                type="text"
                placeholder="Search by name, email, phone, maid, or status…"
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

            {/* Filter tabs */}
            <div className="flex flex-wrap gap-2">
              {STATUS_TABS.map((tab) => {
                const st = getStatusStyle(tab.key);
                const isActive = statusFilter === tab.key;
                return (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setStatusFilter(tab.key)}
                    className={`inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-[13px] font-semibold transition-all ${
                      isActive
                        ? tab.key === "all"
                          ? "bg-gray-800 text-white border-gray-800 shadow-sm"
                          : st.tabActive + " shadow-sm"
                        : "bg-white border-gray-200 text-gray-600 hover:border-gray-300 hover:text-gray-800"
                    }`}
                  >
                    {tab.label}
                    <span
                      className={`inline-flex h-5 min-w-[20px] items-center justify-center rounded-full px-1.5 text-[11px] font-bold ${
                        isActive ? "bg-white/25 text-white" : "bg-gray-100 text-gray-500"
                      }`}
                    >
                      {tab.count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* List body */}
          <div className="p-4">
            {isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <SkeletonCard key={i} />
                ))}
              </div>
            ) : visibleRequests.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200 bg-gray-50 py-16 text-center">
                <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-100">
                  <ClipboardList className="h-6 w-6 text-gray-400" />
                </div>
                <p className="text-[16px] font-bold text-gray-700">No requests found</p>
                <p className="mt-1.5 text-[14px] text-gray-400 max-w-[260px] leading-relaxed">
                  {search || statusFilter !== "all"
                    ? "Try adjusting your search or filters."
                    : "Client requests will appear here once submitted."}
                </p>
                {(search || statusFilter !== "all") && (
                  <button
                    type="button"
                    onClick={() => { setSearch(""); setStatusFilter("all"); }}
                    className="mt-4 rounded-xl bg-emerald-600 px-5 py-2 text-[14px] font-semibold text-white hover:bg-emerald-700 transition-colors"
                  >
                    Clear filters
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {visibleRequests.map((request, index) => {
                  const st = getStatusStyle(request.status);
                  const isGeneral = isGeneralRequest(request);
                  return (
                    <button
                      key={request.id}
                      type="button"
                      onClick={() => { setSelectedRequest(request); setIsDialogOpen(true); }}
                      className="rp-card-enter group w-full rounded-2xl border border-gray-100 bg-white text-left shadow-sm hover:shadow-md hover:border-emerald-200 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/40 transition-all"
                      style={{ animationDelay: `${index * 0.045}s` }}
                    >
                      <div className="p-4 sm:p-5">
                        {/* Top row */}
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-3.5 min-w-0">
                            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-violet-100 text-violet-700 font-bold text-[15px]">
                              {request.clientName.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <p className="text-[15px] font-bold text-gray-900 truncate leading-snug">
                                {request.clientName}
                              </p>
                              <p className="text-[13px] text-gray-500 truncate">{request.clientEmail}</p>
                              {request.clientPhone && (
                                <p className="text-[13px] text-gray-400">{request.clientPhone}</p>
                              )}
                            </div>
                          </div>
                          <span
                            className={`shrink-0 inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[13px] font-bold ${st.bg} ${st.text}`}
                          >
                            <span className={`h-2 w-2 rounded-full ${st.dot}`} />
                            {st.label}
                          </span>
                        </div>

                        {/* Info grid */}
                        <div className="mt-4 grid grid-cols-2 gap-2.5 rounded-xl bg-gray-50 p-3.5 sm:grid-cols-3">
                          <div className="min-w-0">
                            <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-1">
                              {isGeneral ? "Request Type" : "Maid Requested"}
                            </p>
                            <p className="text-[14px] font-bold text-gray-800 truncate">
                              {isGeneral ? "General" : request.maidName}
                            </p>
                            {!isGeneral && (
                              <p className="text-[12px] font-mono text-gray-400 truncate">
                                {request.maidReferenceCode}
                              </p>
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-1">Request ID</p>
                            <p className="text-[14px] font-bold text-gray-800 font-mono">#{request.id}</p>
                          </div>
                          <div className="col-span-2 min-w-0 sm:col-span-1">
                            <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-1 flex items-center gap-1">
                              <CalendarDays className="h-3 w-3" /> Submitted
                            </p>
                            <p className="text-[13px] font-semibold text-gray-700">
                              {new Date(request.createdAt).toLocaleString()}
                            </p>
                          </div>
                        </div>

                        <p className="mt-3 text-[12px] text-gray-400 font-medium text-right group-hover:text-emerald-600 transition-colors">
                          View full details →
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-gray-100 bg-gray-50/50 px-5 py-3.5">
              <button
                disabled={currentPage <= 1}
                onClick={() => setPage((p) => Math.max(p - 1, 1))}
                className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-4 py-2 text-[14px] font-semibold text-gray-700 hover:border-emerald-300 hover:text-emerald-700 disabled:opacity-40 disabled:cursor-default transition-all"
              >
                <ChevronLeft className="h-4 w-4" /> Previous
              </button>
              <span className="text-[14px] font-medium text-gray-500">
                Page <span className="font-bold text-gray-800">{currentPage}</span> of{" "}
                <span className="font-bold text-gray-800">{totalPages}</span>
              </span>
              <button
                disabled={currentPage >= totalPages}
                onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
                className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-4 py-2 text-[14px] font-semibold text-gray-700 hover:border-emerald-300 hover:text-emerald-700 disabled:opacity-40 disabled:cursor-default transition-all"
              >
                Next <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── Detail Dialog ── */}
      <Dialog
        open={isDialogOpen}
        onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) setSelectedRequest(null);
        }}
      >
        <DialogContent className="max-w-2xl rounded-3xl p-0 overflow-hidden">
          {selectedRequest &&
            (() => {
              const st = getStatusStyle(selectedRequest.status);
              const isGeneral = isGeneralRequest(selectedRequest);
              return (
                <>
                  {/* Dialog header */}
                  <div className="border-b border-gray-100 bg-white px-6 py-5">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100">
                          <FileText className="h-5 w-5 text-emerald-700" />
                        </div>
                        <div>
                          <p className="text-[18px] font-bold text-gray-900">
                            Request #{selectedRequest.id}
                          </p>
                          <p className="text-[13px] text-gray-400 font-medium mt-0.5">
                            {new Date(selectedRequest.createdAt).toLocaleString()}
                          </p>
                        </div>
                      </div>
                      <span
                        className={`inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-[14px] font-bold ${st.bg} ${st.text}`}
                      >
                        <span className={`h-2.5 w-2.5 rounded-full ${st.dot}`} />
                        {st.label}
                      </span>
                    </div>
                  </div>

                  {/* Dialog body */}
                  <div className="max-h-[68vh] overflow-y-auto p-6 space-y-5">

                    {/* Client + Maid info */}
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
                        <p className="text-[11px] font-bold uppercase tracking-widest text-gray-400 mb-3">
                          Client Info
                        </p>
                        <div className="flex items-center gap-3 mb-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-violet-100 text-violet-700 font-bold text-[14px]">
                            {selectedRequest.clientName.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase()}
                          </div>
                          <p className="text-[16px] font-bold text-gray-900 leading-tight">
                            {selectedRequest.clientName}
                          </p>
                        </div>
                        <div className="space-y-1.5">
                          <p className="text-[14px] text-gray-600 font-medium">{selectedRequest.clientEmail}</p>
                          <p className="text-[14px] text-gray-500">
                            {selectedRequest.clientPhone || "No phone provided"}
                          </p>
                          <p className="text-[12px] text-gray-400">Client ID: {selectedRequest.clientId}</p>
                        </div>
                      </div>

                      <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
                        <p className="text-[11px] font-bold uppercase tracking-widest text-gray-400 mb-3">
                          {isGeneral ? "Request Type" : "Maid Requested"}
                        </p>
                        {isGeneral ? (
                          <span className="inline-flex rounded-xl bg-emerald-100 px-4 py-2 text-[15px] font-bold text-emerald-800">
                            General Request
                          </span>
                        ) : (
                          <div className="flex items-start gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-800 font-bold text-[13px]">
                              {selectedRequest.maidName.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase()}
                            </div>
                            <div>
                              <p className="text-[16px] font-bold text-gray-900 leading-tight">
                                {selectedRequest.maidName}
                              </p>
                              <p className="text-[13px] font-mono text-gray-500 mt-0.5">
                                {selectedRequest.maidReferenceCode}
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Detail fields */}
                    <div className="rounded-2xl border border-gray-100 bg-white p-5">
                      <p className="text-[15px] font-bold text-gray-900 mb-4 flex items-center gap-2">
                        <Tag className="h-4 w-4 text-emerald-600" />
                        Request Details
                      </p>
                      {detailEntries.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-8 text-center">
                          <ClipboardList className="h-8 w-8 text-gray-300 mb-2" />
                          <p className="text-[14px] text-gray-400 font-medium">No additional details were submitted.</p>
                        </div>
                      ) : (
                        <div className="grid gap-3 sm:grid-cols-2">
                          {detailEntries.map(([key, value]) => (
                            <div
                              key={key}
                              className="rounded-xl border border-gray-100 bg-gray-50 p-3.5"
                            >
                              <p className="text-[11px] font-bold uppercase tracking-widest text-gray-400 mb-1.5">
                                {formatFieldLabel(key)}
                              </p>
                              <p className="whitespace-pre-wrap text-[14px] font-semibold text-gray-800 leading-relaxed">
                                {String(value)}
                              </p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </>
              );
            })()}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default RequestsPage;