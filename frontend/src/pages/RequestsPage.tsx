import {
  Component,
  type ErrorInfo,
  type ReactNode,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
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
  MessageSquare,
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
import {
  createRequestMessage,
  fetchRequestConversation,
  fetchRequestMessages,
  type RequestRecord,
  type RequestMessageRecord,
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
  Object.entries(details).filter(([, value]) => {
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
  const [statusFilter, setStatusFilter] = useState<RequestStatus | "all">("all");
  const [search, setSearch] = useState("");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [drawerMode, setDrawerMode] = useState<DrawerMode>("details");
  const [selectedRequest, setSelectedRequest] = useState<RequestRecord | null>(null);
  const [maidSearch, setMaidSearch] = useState("");
  const [selectedMaidReferences, setSelectedMaidReferences] = useState<string[]>([]);
  const [chatDraft, setChatDraft] = useState("");
  const chatScrollRef = useRef<HTMLDivElement | null>(null);

  const deferredSearch = useDeferredValue(search);
  const deferredMaidSearch = useDeferredValue(maidSearch);

  const requestQueryKey = [
    "agency-requests",
    agencyFilter ?? "all",
    page,
    statusFilter,
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
        status: statusFilter,
        query: deferredSearch,
      }),
    refetchInterval: 5000,
    placeholderData: (previous) => previous,
  });

  const countsQuery = useQuery({
    queryKey: ["agency-requests-counts", agencyFilter ?? "all"],
    enabled: typeof agencyFilter === "number" || isMainAdmin,
    queryFn: () =>
      fetchRequests({ agencyId: agencyFilter, page: 1, pageSize: 100, status: "all" }),
    refetchInterval: 5000,
    placeholderData: (previous) => previous,
  });

  const maidOptionsQuery = useQuery({
    queryKey: ["maids", "request-matching"],
    enabled: sheetOpen && drawerMode === "match",
    staleTime: 60_000,
    queryFn: async () => {
      const response = await fetch("/api/maids", { headers: { ...getAgencyAdminAuthHeaders() } });
      const data = (await response.json().catch(() => ({}))) as {
        maids?: MaidOption[];
        error?: string;
      };
      if (!response.ok || !data.maids) throw new Error(data.error || "Failed to load maids");
      return data.maids;
    },
  });

  const conversationQuery = useQuery({
    queryKey: ["admin-request-conversation", selectedRequest?.id],
    enabled: sheetOpen && drawerMode === "details" && Boolean(selectedRequest?.id),
    queryFn: () => fetchRequestConversation(selectedRequest!.id),
    refetchInterval: 5000,
  });

  const messagesQuery = useQuery({
    queryKey: ["admin-request-messages", conversationQuery.data?.id],
    enabled: sheetOpen && drawerMode === "details" && Boolean(conversationQuery.data?.id),
    queryFn: () => fetchRequestMessages(conversationQuery.data!.id),
    refetchInterval: 5000,
  });

  const requests = requestsQuery.data?.data ?? [];
  const pageInfo: RequestsPageInfo | null = requestsQuery.data?.pageInfo ?? null;

  useEffect(() => {
    const unsubscribe = subscribeToRequestsChanged(() => {
      void requestsQuery.refetch();
      void countsQuery.refetch();
    });
    return unsubscribe;
  }, [requestsQuery.refetch, countsQuery.refetch]);

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
      void countsQuery.refetch();
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
      void countsQuery.refetch();
    },
  });

  const messageMutation = useMutation({
    mutationFn: async () => {
      if (!conversationQuery.data?.id) throw new Error("Conversation not found");
      if (!chatDraft.trim()) throw new Error("Message cannot be empty");
      return createRequestMessage({ conversationId: conversationQuery.data.id, message: chatDraft.trim() });
    },
    onSuccess: (message) => {
      queryClient.setQueryData<RequestMessageRecord[] | undefined>(
        ["admin-request-messages", message.conversationId],
        (prev) => [...(prev ?? []), message],
      );
      setChatDraft("");
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Failed to send message");
    },
  });

  const statusCounts = useMemo(() => {
    const all = countsQuery.data?.data ?? [];
    return {
      pending: all.filter((r) => r.status === "pending").length,
      interested: all.filter((r) => r.status === "interested").length,
      direct_hire: all.filter((r) => r.status === "direct_hire").length,
      rejected: all.filter((r) => r.status === "rejected").length,
    };
  }, [countsQuery.data]);

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
    setChatDraft("");
    setSheetOpen(true);
  };

  useEffect(() => {
    if (!chatScrollRef.current) return;
    chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
  }, [messagesQuery.data]);

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
        <div className="rounded-3xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6 shadow-xl">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-400 mb-2">
                Request Management
              </p>
              <h1 className="font-display text-[28px] font-extrabold text-white leading-tight tracking-tight">
                Action-first Queue
              </h1>
              <p className="mt-2 text-[14px] text-slate-400 max-w-md leading-relaxed font-medium">
                Review, match, and close requests without leaving the list.
              </p>
            </div>

            {/* Stat cards */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:gap-2.5">
              {(["pending", "interested", "direct_hire", "rejected"] as const).map((status) => {
                const cfg = STATUS_CONFIG[status];
                return (
                  <button
                    key={status}
                    type="button"
                    onClick={() => { setPage(1); setStatusFilter(status); }}
                    className={cn(
                      "rounded-2xl border px-4 py-3 text-left transition-all hover:scale-105 active:scale-95",
                      statusFilter === status
                        ? "bg-white/10 border-white/20 shadow-lg"
                        : "bg-white/5 border-white/10 hover:bg-white/8",
                    )}
                  >
                    <p className={cn("text-[26px] font-black leading-none", cfg.stat.replace("text-", "text-"))}>
                      <span className="text-white">{statusCounts[status]}</span>
                    </p>
                    <p className="mt-1.5 text-[12px] font-semibold text-slate-400">{cfg.label}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Search + filters */}
          <div className="mt-5 flex flex-col gap-3 lg:flex-row lg:items-center">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={search}
                onChange={(e) => { setPage(1); setSearch(e.target.value); }}
                placeholder="Search client, summary, notes, or maid reference…"
                className="h-11 w-full rounded-2xl border border-white/10 bg-white/10 pl-10 pr-4 text-[14px] font-medium text-white placeholder:text-slate-500 outline-none focus:border-white/30 focus:bg-white/15 transition-all"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              {(["all", "pending", "interested", "direct_hire", "rejected"] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => { setPage(1); setStatusFilter(s); }}
                  className={cn(
                    "rounded-full px-4 py-2 text-[13px] font-bold transition-all",
                    statusFilter === s
                      ? "bg-white text-slate-900 shadow-md"
                      : "bg-white/10 text-slate-300 hover:bg-white/20",
                  )}
                >
                  {s === "all" ? "All" : STATUS_CONFIG[s].label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ── Request cards ── */}
        <div className="space-y-3">
          {requestsQuery.isLoading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="animate-pulse rounded-3xl border border-gray-100 bg-white h-44"
                style={{ animationDelay: `${i * 0.07}s` }}
              />
            ))
          ) : requests.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-3xl border-2 border-dashed border-gray-200 bg-white py-20 text-center req-fade">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gray-100">
                <BriefcaseBusiness className="h-7 w-7 text-gray-700" />
              </div>
              <p className="text-[18px] font-black text-gray-900">No requests in this view</p>
              <p className="mt-1.5 text-[14px] text-gray-900 font-medium">No rows matched the current filters.</p>
            </div>
          ) : (
            requests.map((request, i) => {
              const cfg = STATUS_CONFIG[request.status as keyof typeof STATUS_CONFIG] ?? STATUS_CONFIG.pending;
              const isUpdatingStatus =
                statusMutation.isPending && statusMutation.variables?.requestId === request.id;
              const isMatching =
                matchMutation.isPending && matchMutation.variables?.requestId === request.id;

              return (
                <div
                  key={request.id}
                  className="req-card rounded-3xl border border-gray-100 bg-white shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 overflow-hidden"
                  style={{ animationDelay: `${i * 0.04}s` }}
                >
                  {/* Accent bar */}
                  <div className={cn("h-1 w-full", cfg.dot)} />

                  <div className="p-5 sm:p-6">
                    <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">

                      {/* Left: identity + info grid */}
                      <div className="space-y-4 flex-1 min-w-0">
                        <div className="flex items-start gap-3.5 flex-wrap">
                          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-slate-600">
                            <UserRound className="h-5 w-5" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="text-[16px] font-extrabold text-gray-950 leading-snug">
                                {request.client?.name || "Client request"}
                              </p>
                              <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[12px] font-bold", cfg.pill)}>
                                <span className={cn("h-1.5 w-1.5 rounded-full", cfg.dot)} />
                                {cfg.label}
                              </span>
                            </div>
                            <p className="text-[13px] text-gray-900 mt-0.5 font-medium">
                              {request.client?.email || "No email"}
                              {request.client?.phone ? ` · ${request.client.phone}` : ""}
                            </p>
                            <p className="text-[12px] text-gray-900 font-medium mt-0.5">{request.agencyName}</p>
                          </div>
                        </div>

                        {/* Info chips */}
                        <div className="grid gap-2.5 sm:grid-cols-3">
                          <div className="rounded-2xl bg-slate-50 border border-slate-100 px-4 py-3">
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Summary</p>
                            <p className="text-[13px] font-semibold text-gray-900 leading-snug">{request.summary}</p>
                          </div>
                          <div className="rounded-2xl bg-slate-50 border border-slate-100 px-4 py-3">
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Budget</p>
                            <p className="text-[13px] font-semibold text-gray-900">{request.budget || "Not specified"}</p>
                          </div>
                          <div className="rounded-2xl bg-slate-50 border border-slate-100 px-4 py-3">
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Updated</p>
                            <p className="text-[13px] font-semibold text-gray-900">{formatDate(request.updatedAt)}</p>
                          </div>
                        </div>

                        {/* Matched maids */}
                        {request.maids.length > 0 && (
                          <div className="flex flex-wrap gap-2">
                            {request.maids.map((maid) => (
                              <span
                                key={maid.referenceCode}
                                className="rounded-full bg-violet-50 border border-violet-100 px-3 py-1 text-[12px] font-semibold text-violet-800"
                              >
                                {maid.fullName} · {maid.referenceCode}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Right: action buttons */}
                      <div className="flex flex-wrap gap-2 xl:flex-col xl:w-[180px] xl:items-stretch">
                        <button
                          type="button"
                          onClick={() => openSheet(request, "details")}
                          className="flex items-center justify-center gap-1.5 rounded-2xl border-2 border-gray-200 bg-white px-4 py-2.5 text-[13px] font-bold text-gray-800 hover:border-slate-400 hover:bg-slate-50 transition-all"
                        >
                          <MessageSquare className="h-3.5 w-3.5" />
                          View Details
                        </button>
                        <button
                          type="button"
                          onClick={() => openSheet(request, "match")}
                          disabled={isMatching}
                          className="flex items-center justify-center gap-1.5 rounded-2xl bg-violet-600 px-4 py-2.5 text-[13px] font-bold text-white hover:bg-violet-700 disabled:opacity-60 transition-all shadow-sm shadow-violet-200"
                        >
                          {isMatching ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                          Mark Interested
                        </button>
                        <button
                          type="button"
                          disabled={isUpdatingStatus}
                          onClick={() => statusMutation.mutate({ requestId: request.id, status: "direct_hire" })}
                          className="flex items-center justify-center gap-1.5 rounded-2xl bg-emerald-600 px-4 py-2.5 text-[13px] font-bold text-white hover:bg-emerald-700 disabled:opacity-60 transition-all shadow-sm shadow-emerald-200"
                        >
                          {isUpdatingStatus && statusMutation.variables?.status === "direct_hire"
                            ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            : <ArrowUpRight className="h-3.5 w-3.5" />}
                          Direct Hire
                        </button>
                        <button
                          type="button"
                          disabled={isUpdatingStatus}
                          onClick={() => statusMutation.mutate({ requestId: request.id, status: "rejected" })}
                          className="flex items-center justify-center gap-1.5 rounded-2xl border-2 border-rose-200 bg-rose-50 px-4 py-2.5 text-[13px] font-bold text-rose-700 hover:bg-rose-100 disabled:opacity-60 transition-all"
                        >
                          {isUpdatingStatus && statusMutation.variables?.status === "rejected"
                            ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            : <XCircle className="h-3.5 w-3.5" />}
                          Reject
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
            <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4 space-y-3">
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
                <div className="rounded-xl bg-white border border-gray-100 px-3 py-2.5">
                  <p className="text-[10px] font-black uppercase tracking-widest text-gray-900 mb-1">Summary</p>
                  <p className="text-[13px] font-semibold text-gray-900 leading-snug">{selectedRequest.summary}</p>
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

            {/* ── Details mode ── */}
            {drawerMode === "details" && (
              <div className="space-y-5">
                {/* Normalized details */}
                <div>
                  <p className="text-[12px] font-black uppercase tracking-widest text-gray-900 mb-3">Normalized Details</p>
                  <div className="space-y-2">
                    {detailEntries(selectedRequest.details).length === 0 ? (
                      <p className="text-[13px] text-gray-900 font-medium italic">No extra details captured.</p>
                    ) : (
                      detailEntries(selectedRequest.details).map(([key, value]) => (
                        <div key={key} className="flex items-start gap-3 rounded-2xl bg-gray-50 border border-gray-100 px-4 py-3">
                          <div className="min-w-0 flex-1">
                            <p className="text-[10px] font-black uppercase tracking-widest text-gray-900 mb-0.5">
                              {formatDetailLabel(key)}
                            </p>
                            <p className="text-[14px] font-semibold text-gray-900">{String(value)}</p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Conversation */}
                <div>
                  <p className="text-[12px] font-black uppercase tracking-widest text-gray-900 mb-3">Conversation</p>
                  <div
                    ref={chatScrollRef}
                    className="space-y-3 overflow-y-auto rounded-2xl border border-gray-100 bg-gray-50 p-4"
                    style={{ maxHeight: 320 }}
                  >
                    {messagesQuery.isLoading || conversationQuery.isLoading ? (
                      <div className="flex items-center justify-center py-10 text-[13px] text-gray-900 font-medium">
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading…
                      </div>
                    ) : (messagesQuery.data ?? []).length === 0 ? (
                      <div className="py-10 text-center text-[13px] text-gray-900 font-medium">No messages yet.</div>
                    ) : (
                      (messagesQuery.data ?? []).map((message) => {
                        if (message.senderType === "system") {
                          return (
                            <div key={message.id} className="flex justify-center">
                              <div className="max-w-[90%] rounded-full bg-gray-200 px-4 py-1.5 text-center text-[11px] font-semibold text-gray-800">
                                {message.message}
                              </div>
                            </div>
                          );
                        }
                        const isOwn = message.senderType === "admin" || message.senderType === "staff";
                        return (
                          <div key={message.id} className={cn("flex", isOwn ? "justify-start" : "justify-end")}>
                            <div
                              className={cn(
                                "max-w-[82%] rounded-[18px] px-4 py-3 text-[13px]",
                                isOwn
                                  ? "rounded-bl-md bg-white border border-gray-200 text-gray-900 shadow-sm"
                                  : "rounded-br-md bg-slate-800 text-white",
                              )}
                            >
                              <p className="mb-1 text-[10px] font-bold opacity-50 uppercase tracking-wider">
                                {message.senderType === "staff" ? "Staff" : message.senderType === "admin" ? "Admin" : "Client"}
                              </p>
                              <p className="whitespace-pre-wrap leading-relaxed font-medium">{message.message}</p>
                              <p className="mt-1.5 text-right text-[10px] opacity-50">
                                {new Date(message.createdAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
                              </p>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>

                  {/* Reply box */}
                  <div className="mt-3 rounded-2xl border-2 border-gray-200 bg-white p-3 focus-within:border-indigo-300 transition-colors">
                    <textarea
                      value={chatDraft}
                      onChange={(e) => setChatDraft(e.target.value)}
                      placeholder="Reply to the client on this request…"
                      rows={3}
                      className="w-full resize-none border-0 p-0 text-[14px] font-medium text-gray-900 placeholder:text-gray-700 outline-none bg-transparent"
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          messageMutation.mutate();
                        }
                      }}
                    />
                    <div className="mt-2 flex items-center justify-between gap-3">
                      <p className="text-[11px] text-gray-900 font-medium">Press Enter to send, Shift+Enter for new line</p>
                      <button
                        type="button"
                        disabled={messageMutation.isPending || !chatDraft.trim() || !conversationQuery.data?.id}
                        onClick={() => messageMutation.mutate()}
                        className="flex items-center gap-1.5 rounded-xl bg-slate-900 px-4 py-2 text-[13px] font-bold text-white hover:bg-slate-700 disabled:opacity-40 disabled:cursor-default transition-all"
                      >
                        {messageMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                        Send reply
                      </button>
                    </div>
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