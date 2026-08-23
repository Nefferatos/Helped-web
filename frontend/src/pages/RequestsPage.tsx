import {
  Component,
  type ErrorInfo,
  type ReactNode,
  useDeferredValue,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Loader2,
  Search,
  UserRound,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  BriefcaseBusiness,
  X,
  SlidersHorizontal,
  CheckCircle2,
  XCircle,
  ArrowUpRight,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { readSafeJson } from "@/lib/safeJson";
import {
  type RequestRecord,
  type RequestStatus,
  fetchRequests,
  subscribeToRequestsChanged,
  requestStatusMeta,
  requestStateMessage,
  updateRequestMaids,
  updateRequestStatus,
} from "@/lib/requests";
import { getAgencyAdminAuthHeaders, getStoredAgencyAdmin } from "@/lib/agencyAdminAuth";
import { toast } from "@/components/ui/sonner";

type DrawerMode = "details" | "match";

type MaidOption = {
  referenceCode: string;
  fullName: string;
  nationality: string;
  status?: string;
  type?: string;
  photoDataUrl?: string;
};

const PAGE_SIZE = 9;

const formatDate = (value: string) =>
  new Intl.DateTimeFormat("en-SG", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));

const detailEntries = (details: Record<string, unknown>) =>
  Object.entries(details).filter(([key, value]) => {
    if (key === "agencyViewedAt") return false;
    if (typeof value === "string") return value.trim().length > 0;
    if (typeof value === "number") return Number.isFinite(value);
    return Boolean(value);
  });

const formatDetailLabel = (value: string) =>
  value
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^./, (char) => char.toUpperCase());

const applyRequestPatch = (
  previous:
    | {
        data: RequestRecord[];
        pageInfo: { page: number; pageSize: number; total: number; totalPages: number };
      }
    | undefined,
  requestId: string,
  patch: Partial<RequestRecord>,
) => {
  if (!previous) return previous;
  return {
    ...previous,
    data: previous.data.map((request) =>
      request.id === requestId ? { ...request, ...patch } : request,
    ),
  };
};

type RequestsPageInfo = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

/* ── Status config ─────────────────────────────────────────────────────── */
const STATUS_CONFIG = {
  pending: {
    label: "Pending",
    icon: Clock,
    pill: "bg-amber-50 text-amber-800 border-amber-200",
    dot: "bg-amber-400",
    stat: "text-amber-600",
    statBg: "bg-amber-50 border-amber-100",
  },
  interested: {
    label: "Interested",
    icon: Sparkles,
    pill: "bg-violet-50 text-violet-800 border-violet-200",
    dot: "bg-violet-400",
    stat: "text-violet-600",
    statBg: "bg-violet-50 border-violet-100",
  },
  direct_hire: {
    label: "Direct Hire",
    icon: CheckCircle2,
    pill: "bg-emerald-50 text-emerald-800 border-emerald-200",
    dot: "bg-emerald-400",
    stat: "text-emerald-600",
    statBg: "bg-emerald-50 border-emerald-100",
  },
  rejected: {
    label: "Rejected",
    icon: XCircle,
    pill: "bg-rose-50 text-rose-800 border-rose-200",
    dot: "bg-rose-400",
    stat: "text-rose-600",
    statBg: "bg-rose-50 border-rose-100",
  },
} as const;

/* ── Slide-up bottom sheet ─────────────────────────────────────────────── */
function BottomSheet({
  open,
  onClose,
  children,
  title,
  subtitle,
}: {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  title: string;
  subtitle?: string;
}) {
  // Lock body scroll when open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  return (
    <>
      {/* Backdrop */}
      <div
        className={cn(
          "fixed inset-0 z-40 bg-black/40 backdrop-blur-sm transition-opacity duration-300",
          open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none",
        )}
        onClick={onClose}
      />

      {/* Sheet */}
      <div
        className={cn(
          "fixed bottom-0 z-50 flex flex-col rounded-t-[28px] bg-white shadow-2xl transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]",
          "w-full max-w-2xl max-h-[72vh] left-1/2 -translate-x-1/2",
          open ? "translate-y-0" : "translate-y-full",
        )}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1 shrink-0">
          <div className="h-1 w-10 rounded-full bg-gray-200" />
        </div>

        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-gray-100 px-6 py-4 shrink-0">
          <div>
            <h2 className="text-[18px] font-black text-gray-950 tracking-tight">{title}</h2>
            {subtitle && <p className="mt-0.5 text-[13px] text-gray-900 font-medium">{subtitle}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors shrink-0 mt-0.5"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="overflow-y-auto flex-1 px-6 py-5">
          {children}
        </div>
      </div>
    </>
  );
}

/* ── Error boundary ────────────────────────────────────────────────────── */
class RequestsPageErrorBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };
  static getDerivedStateFromError() { return { hasError: true }; }
  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("[RequestsPage] render error", error, errorInfo);
  }
  render() {
    if (this.state.hasError) return null;
    return this.props.children;
  }
}

/* ── Main content ──────────────────────────────────────────────────────── */
const RequestsPageContent = () => {
  const queryClient = useQueryClient();
  const admin = useMemo(() => getStoredAgencyAdmin(), []);
  const isMainAdmin = admin?.role === "admin";
  const agencyId = typeof admin?.agencyId === "number" ? admin.agencyId : undefined;
  const agencyFilter = agencyId;

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [drawerMode, setDrawerMode] = useState<DrawerMode>("details");
  const [selectedRequest, setSelectedRequest] = useState<RequestRecord | null>(null);
  const [maidSearch, setMaidSearch] = useState("");
  const [selectedMaidReferences, setSelectedMaidReferences] = useState<string[]>([]);

  const deferredSearch = useDeferredValue(search);
  const deferredMaidSearch = useDeferredValue(maidSearch);

  const requestQueryKey = [
    "agency-requests",
    agencyFilter ?? "all",
    page,
    deferredSearch,
  ] as const;

  const requestsQuery = useQuery({
    queryKey: requestQueryKey,
    enabled: typeof agencyFilter === "number" || isMainAdmin,
    queryFn: () =>
      fetchRequests({
        agencyId: agencyFilter,
        page,
        pageSize: PAGE_SIZE,
        status: "all",
        query: deferredSearch,
      }),
    refetchInterval: 15000,
    placeholderData: (previous) => previous,
  });

  const maidOptionsQuery = useQuery({
    queryKey: ["maids", "request-matching"],
    enabled: sheetOpen && drawerMode === "match",
    staleTime: 60_000,
    queryFn: async () => {
      const response = await fetch("/api/maids", { headers: { ...getAgencyAdminAuthHeaders() } });
      const data = await readSafeJson<{
        maids?: MaidOption[];
        error?: string;
      }>(response);
      if (!response.ok || !data.maids) throw new Error(data.error || "Failed to load maids");
      return data.maids;
    },
  });

  const requests = requestsQuery.data?.data ?? [];
  const pageInfo: RequestsPageInfo | null = requestsQuery.data?.pageInfo ?? null;

  useEffect(() => {
    const unsubscribe = subscribeToRequestsChanged(() => {
      void requestsQuery.refetch();
    });
    return unsubscribe;
  }, [requestsQuery.refetch]);

  const statusMutation = useMutation({
    mutationFn: ({ requestId, status }: { requestId: string; status: RequestStatus }) =>
      updateRequestStatus(requestId, status),
    onMutate: async ({ requestId, status }) => {
      await queryClient.cancelQueries({ queryKey: requestQueryKey });
      const previous = queryClient.getQueryData<Awaited<ReturnType<typeof fetchRequests>>>(requestQueryKey);
      queryClient.setQueryData(requestQueryKey, applyRequestPatch(previous, requestId, { status }));
      if (selectedRequest?.id === requestId)
        setSelectedRequest((c) => (c ? { ...c, status } : c));
      return { previous };
    },
    onError: (error, _v, context) => {
      if (context?.previous) queryClient.setQueryData(requestQueryKey, context.previous);
      toast.error(error instanceof Error ? error.message : "Failed to update request");
    },
    onSuccess: (request) => {
      queryClient.setQueryData<Awaited<ReturnType<typeof fetchRequests>> | undefined>(
        requestQueryKey,
        (prev) => applyRequestPatch(prev, request.id, request),
      );
      if (selectedRequest?.id === request.id) setSelectedRequest(request);
    },
  });

  const matchMutation = useMutation({
    mutationFn: async ({ requestId, maidReferences }: { requestId: string; maidReferences: string[] }) => {
      await updateRequestMaids(requestId, maidReferences);
      return updateRequestStatus(requestId, "interested");
    },
    onMutate: async ({ requestId, maidReferences }) => {
      await queryClient.cancelQueries({ queryKey: requestQueryKey });
      const previous = queryClient.getQueryData<Awaited<ReturnType<typeof fetchRequests>>>(requestQueryKey);
      const maids = (maidOptionsQuery.data ?? [])
        .filter((m) => maidReferences.includes(m.referenceCode))
        .map((m) => ({
          referenceCode: m.referenceCode,
          fullName: m.fullName,
          nationality: m.nationality,
          status: m.status ?? "available",
          type: m.type ?? "",
          photoDataUrl: m.photoDataUrl,
        }));
      queryClient.setQueryData(requestQueryKey, applyRequestPatch(previous, requestId, { maidReferences, status: "interested", maids }));
      if (selectedRequest?.id === requestId)
        setSelectedRequest((c) => (c ? { ...c, maidReferences, maids, status: "interested" } : c));
      return { previous };
    },
    onError: (error, _v, context) => {
      if (context?.previous) queryClient.setQueryData(requestQueryKey, context.previous);
      toast.error(error instanceof Error ? error.message : "Failed to save maid suggestions");
    },
    onSuccess: (request) => {
      queryClient.setQueryData<Awaited<ReturnType<typeof fetchRequests>> | undefined>(
        requestQueryKey,
        (prev) => applyRequestPatch(prev, request.id, request),
      );
      setSelectedRequest(request);
      setSheetOpen(false);
      toast.success("Request moved to Interested");
    },
  });

  const filteredMaids = useMemo(() => {
    const term = deferredMaidSearch.trim().toLowerCase();
    const items = maidOptionsQuery.data ?? [];
    if (!term) return items;
    return items.filter((m) =>
      [m.referenceCode, m.fullName, m.nationality, m.type, m.status].join(" ").toLowerCase().includes(term),
    );
  }, [deferredMaidSearch, maidOptionsQuery.data]);

  const openSheet = (request: RequestRecord, mode: DrawerMode) => {
    setSelectedRequest(request);
    setDrawerMode(mode);
    setSelectedMaidReferences(request.maidReferences);
    setMaidSearch("");
    setSheetOpen(true);
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;500;600;700;800&family=DM+Sans:wght@400;500;600&display=swap');
        .req-root, .req-root * { font-family: 'DM Sans', sans-serif; }
        .req-root h1, .req-root h2, .req-root .font-display { font-family: 'Sora', sans-serif; }

        @keyframes reqSlideUp {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .req-card { animation: reqSlideUp 0.3s cubic-bezier(0.16,1,0.3,1) both; }

        @keyframes reqFadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        .req-fade { animation: reqFadeIn 0.2s ease both; }
      `}</style>

      <div className="req-root space-y-6 pb-6">

        {/* ── Header ── */}
        <section className="rounded-2xl border border-slate-200 bg-white px-5 py-5 shadow-sm sm:px-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">Client requests</p>
              <h1 className="mt-1 font-display text-2xl font-extrabold tracking-tight text-slate-950">Requests</h1>
              <p className="mt-1 text-sm text-slate-500">Review request details and client requirements.</p>
            </div>
            <div className="relative w-full sm:max-w-md">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={search}
                onChange={(e) => { setPage(1); setSearch(e.target.value); }}
                placeholder="Search requests"
                className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-4 text-sm font-medium text-slate-900 outline-none transition focus:border-slate-400 focus:bg-white focus:ring-4 focus:ring-slate-100"
              />
            </div>
          </div>
        </section>

        {/* ── Request cards ── */}
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {requestsQuery.isLoading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="animate-pulse rounded-3xl border border-gray-100 bg-white h-44"
                style={{ animationDelay: `${i * 0.07}s` }}
              />
            ))
          ) : requests.length === 0 ? (
            <div className="col-span-full flex flex-col items-center justify-center rounded-3xl border-2 border-dashed border-gray-200 bg-white py-20 text-center req-fade">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gray-100">
                <BriefcaseBusiness className="h-7 w-7 text-gray-700" />
              </div>
              <p className="text-[18px] font-black text-gray-900">No requests in this view</p>
              <p className="mt-1.5 text-[14px] text-gray-900 font-medium">No rows matched the current filters.</p>
            </div>
          ) : (
            requests.map((request, i) => {
              const cfg = STATUS_CONFIG[request.status as keyof typeof STATUS_CONFIG] ?? STATUS_CONFIG.pending;

              return (
                <div
                  key={request.id}
                  className="req-card flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
                  style={{ animationDelay: `${i * 0.04}s` }}
                >
                  {/* Accent bar */}
                  <div className={cn("h-1 w-full", cfg.dot)} />

                  <div className="flex flex-1 flex-col p-4">
                    <div className="flex h-full flex-col gap-4">

                      {/* Left: identity + info grid */}
                      <div className="min-w-0 space-y-3">
                        <div className="flex items-start gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                            <UserRound className="h-4 w-4" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="text-[15px] font-extrabold text-gray-950 leading-snug">
                                {request.client?.name || "Client request"}
                              </p>
                              <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-bold", cfg.pill)}>
                                <span className={cn("h-1.5 w-1.5 rounded-full", cfg.dot)} />
                                {cfg.label}
                              </span>
                            </div>
                            <p className="mt-0.5 truncate text-[12px] font-medium text-slate-500">{request.client?.email || "No email"}</p>
                          </div>
                        </div>

                        {/* Info chips */}
                        <div>
                          <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2.5">
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Summary</p>
                            <p className="text-[12px] font-semibold leading-snug text-gray-900">{request.summary}</p>
                          </div>
                        </div>

                        {/* Matched maids */}
                        {request.maids.length > 0 && (
                          <div className="flex flex-wrap gap-1.5">
                            {request.maids.map((maid) => (
                              <span
                                key={maid.referenceCode}
                                className="max-w-full truncate rounded-full border border-violet-100 bg-violet-50 px-2.5 py-1 text-[11px] font-semibold text-violet-800"
                              >
                                {maid.fullName} · {maid.referenceCode}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Single, focused action */}
                      <div className="mt-auto flex shrink-0 border-t border-slate-100 pt-3">
                        <button
                          type="button"
                          onClick={() => openSheet(request, "details")}
                          className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-slate-300 bg-white px-4 py-3 text-[13px] font-bold text-slate-800 shadow-sm transition-all hover:border-slate-400 hover:bg-slate-50 hover:shadow"
                        >
                          <BriefcaseBusiness className="h-3.5 w-3.5" />
                          View Details
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* ── Pagination ── */}
        <div className="flex items-center justify-between rounded-2xl border border-gray-200 bg-white px-5 py-3.5 gap-3 flex-wrap shadow-sm">
          <p className="text-[13px] font-semibold text-gray-900">
            {pageInfo
              ? <>Page <span className="font-black text-gray-900">{pageInfo.page}</span> of <span className="font-black text-gray-900">{pageInfo.totalPages}</span> · <span className="font-black text-indigo-600">{pageInfo.total}</span> total requests</>
              : "Loading…"}
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={page <= 1 || requestsQuery.isFetching}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="inline-flex items-center gap-1.5 rounded-2xl border-2 border-gray-200 bg-white px-4 py-2 text-[13px] font-bold text-gray-800 hover:border-indigo-300 hover:text-indigo-700 disabled:opacity-40 disabled:cursor-default transition-all"
            >
              <ChevronLeft className="h-4 w-4" /> Previous
            </button>
            <button
              type="button"
              disabled={!pageInfo || page >= pageInfo.totalPages || requestsQuery.isFetching}
              onClick={() => setPage((p) => p + 1)}
              className="inline-flex items-center gap-1.5 rounded-2xl border-2 border-gray-200 bg-white px-4 py-2 text-[13px] font-bold text-gray-800 hover:border-indigo-300 hover:text-indigo-700 disabled:opacity-40 disabled:cursor-default transition-all"
            >
              Next <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* ── Bottom Sheet ── */}
      <BottomSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        title={drawerMode === "match" ? "Match request with maids" : "Request details"}
        subtitle={
          selectedRequest
            ? drawerMode === "match"
              ? "Select suitable maids and move the request into Interested."
              : requestStateMessage(selectedRequest.status)
            : undefined
        }
      >
        {selectedRequest && (
          <div className="space-y-5 pb-8">

            {/* Request summary card */}
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white px-4 py-3">
                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">Request overview</p>
              </div>
              <div className="space-y-4 p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white border border-gray-200 text-gray-600">
                  <UserRound className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-[15px] font-extrabold text-gray-950 leading-snug">
                    {selectedRequest.client?.name || "Client request"}
                  </p>
                  <p className="text-[12px] text-gray-900 font-medium">
                    {selectedRequest.client?.email || "No email"}
                    {selectedRequest.client?.phone ? ` · ${selectedRequest.client.phone}` : ""}
                  </p>
                </div>
                {(() => {
                  const cfg = STATUS_CONFIG[selectedRequest.status as keyof typeof STATUS_CONFIG] ?? STATUS_CONFIG.pending;
                  return (
                    <span className={cn("ml-auto inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-bold shrink-0", cfg.pill)}>
                      <span className={cn("h-1.5 w-1.5 rounded-full", cfg.dot)} />
                      {cfg.label}
                    </span>
                  );
                })()}
              </div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                <div className="col-span-2 rounded-xl border border-slate-100 bg-slate-50 px-3 py-2.5 sm:col-span-1">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">Request</p>
                  <p className="text-[13px] font-semibold text-slate-900 leading-snug">{selectedRequest.summary}</p>
                </div>
                <div className="rounded-xl bg-white border border-gray-100 px-3 py-2.5">
                  <p className="text-[10px] font-black uppercase tracking-widest text-gray-900 mb-1">Budget</p>
                  <p className="text-[13px] font-semibold text-gray-900">{selectedRequest.budget || "Not specified"}</p>
                </div>
                <div className="col-span-2 sm:col-span-1 rounded-xl bg-white border border-gray-100 px-3 py-2.5">
                  <p className="text-[10px] font-black uppercase tracking-widest text-gray-900 mb-1">Agency</p>
                  <p className="text-[13px] font-semibold text-gray-900">{selectedRequest.agencyName}</p>
                </div>
              </div>
              </div>
            </div>

            {/* ── Details mode ── */}
            {drawerMode === "details" && (
              <div className="space-y-5">
                {/* Normalized details */}
                <div>
                  <p className="text-[12px] font-black uppercase tracking-widest text-slate-900 mb-3">Request requirements</p>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {detailEntries(selectedRequest.details).length === 0 ? (
                      <p className="text-[13px] text-gray-900 font-medium italic">No extra details captured.</p>
                    ) : (
                      detailEntries(selectedRequest.details).map(([key, value]) => (
                        <div key={key} className="flex min-h-[78px] items-start gap-3 rounded-xl border border-slate-100 bg-white px-4 py-3 shadow-sm">
                          <div className="min-w-0 flex-1">
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">
                              {formatDetailLabel(key)}
                            </p>
                            <p className="text-[14px] font-semibold leading-relaxed text-slate-900">{String(value)}</p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

              </div>
            )}

            {/* ── Match mode ── */}
            {drawerMode === "match" && (
              <div className="space-y-4">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-700" />
                  <input
                    value={maidSearch}
                    onChange={(e) => setMaidSearch(e.target.value)}
                    placeholder="Search maid name, nationality, or reference…"
                    className="h-11 w-full rounded-2xl border-2 border-gray-200 bg-white pl-10 pr-4 text-[14px] font-semibold text-gray-900 outline-none focus:border-violet-400 focus:ring-4 focus:ring-violet-100 transition-all"
                  />
                </div>

                <div className="space-y-2">
                  {maidOptionsQuery.isLoading ? (
                    <div className="flex items-center justify-center py-12 text-[13px] text-gray-900 font-medium">
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading maid list…
                    </div>
                  ) : filteredMaids.length === 0 ? (
                    <div className="py-12 text-center text-[13px] text-gray-900 font-medium">
                      No maids match this search.
                    </div>
                  ) : (
                    filteredMaids.map((maid) => {
                      const checked = selectedMaidReferences.includes(maid.referenceCode);
                      return (
                        <label
                          key={maid.referenceCode}
                          className={cn(
                            "flex cursor-pointer items-start gap-3 rounded-2xl border-2 p-4 transition-all duration-150",
                            checked
                              ? "border-violet-300 bg-violet-50"
                              : "border-gray-100 bg-white hover:border-gray-200 hover:bg-gray-50",
                          )}
                        >
                          <Checkbox
                            checked={checked}
                            onCheckedChange={(next) =>
                              setSelectedMaidReferences((curr) =>
                                next
                                  ? [...curr, maid.referenceCode]
                                  : curr.filter((r) => r !== maid.referenceCode),
                              )
                            }
                          />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-2">
                              <p className="truncate text-[14px] font-bold text-gray-950">{maid.fullName}</p>
                              <span className="shrink-0 rounded-full bg-gray-100 border border-gray-200 px-2 py-0.5 text-[11px] font-bold text-gray-600">
                                {maid.referenceCode}
                              </span>
                            </div>
                            <p className="mt-0.5 text-[12px] font-medium text-gray-800">
                              {maid.nationality} · {maid.type || "Maid"} · {maid.status || "available"}
                            </p>
                          </div>
                        </label>
                      );
                    })
                  )}
                </div>

                <div className="flex gap-3 pt-2 sticky bottom-0 bg-white pb-2">
                  <button
                    type="button"
                    onClick={() => setSheetOpen(false)}
                    className="flex-1 rounded-2xl border-2 border-gray-200 bg-white px-4 py-3 text-[14px] font-bold text-gray-800 hover:border-gray-300 hover:bg-gray-50 transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={!selectedRequest || matchMutation.isPending}
                    onClick={() =>
                      selectedRequest &&
                      matchMutation.mutate({
                        requestId: selectedRequest.id,
                        maidReferences: selectedMaidReferences,
                      })
                    }
                    className="flex-1 flex items-center justify-center gap-2 rounded-2xl bg-violet-600 px-4 py-3 text-[14px] font-bold text-white hover:bg-violet-700 disabled:opacity-50 disabled:cursor-default transition-all shadow-md shadow-violet-200"
                  >
                    {matchMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                    Save & Mark Interested
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </BottomSheet>
    </>
  );
};

const RequestsPage = () => (
  <RequestsPageErrorBoundary>
    <RequestsPageContent />
  </RequestsPageErrorBoundary>
);

export default RequestsPage;
