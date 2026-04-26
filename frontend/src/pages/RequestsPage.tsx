import { Component, type ErrorInfo, type ReactNode, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Search, UserRound, ChevronLeft, ChevronRight, Sparkles, BriefcaseBusiness } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
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
  previous: { data: RequestRecord[]; pageInfo: { page: number; pageSize: number; total: number; totalPages: number } } | undefined,
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

class RequestsPageErrorBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("[RequestsPage] render error", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return null;
    }

    return this.props.children;
  }
}

const RequestsPageContent = () => {
  const queryClient = useQueryClient();
  const admin = useMemo(() => getStoredAgencyAdmin(), []);
  const isMainAdmin = admin?.role === "admin";
  const agencyId = typeof admin?.agencyId === "number" ? admin.agencyId : undefined;

  // FIX 1: Always use agencyId directly. When agencyId is undefined (true
  // platform super-admin), no filter is applied and all records are returned.
  const agencyFilter = agencyId;

  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<RequestStatus | "all">("all");
  const [search, setSearch] = useState("");
  const [drawerOpen, setDrawerOpen] = useState(false);
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

  // Main paginated + filtered query
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

  // FIX 2: Separate unfiltered counts query — always fetches all statuses
  // regardless of which tab is active, so badge counts stay accurate.
  const countsQuery = useQuery({
    queryKey: ["agency-requests-counts", agencyFilter ?? "all"],
    enabled: typeof agencyFilter === "number" || isMainAdmin,
    queryFn: () =>
      fetchRequests({
        agencyId: agencyFilter,
        page: 1,
        pageSize: 100,
        status: "all",
      }),
    refetchInterval: 5000,
    placeholderData: (previous) => previous,
  });

  const maidOptionsQuery = useQuery({
    queryKey: ["maids", "request-matching"],
    enabled: drawerOpen && drawerMode === "match",
    staleTime: 60_000,
    queryFn: async () => {
      const response = await fetch("/api/maids", {
        headers: { ...getAgencyAdminAuthHeaders() },
      });
      const data = (await response.json().catch(() => ({}))) as {
        maids?: MaidOption[];
        error?: string;
      };
      if (!response.ok || !data.maids) {
        throw new Error(data.error || "Failed to load maids");
      }
      return data.maids;
    },
  });

  const conversationQuery = useQuery({
    queryKey: ["admin-request-conversation", selectedRequest?.id],
    enabled: drawerOpen && drawerMode === "details" && Boolean(selectedRequest?.id),
    queryFn: () => fetchRequestConversation(selectedRequest!.id),
    refetchInterval: 5000,
  });

  const messagesQuery = useQuery({
    queryKey: ["admin-request-messages", conversationQuery.data?.id],
    enabled: drawerOpen && drawerMode === "details" && Boolean(conversationQuery.data?.id),
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
      if (selectedRequest?.id === requestId) {
        setSelectedRequest((current) => (current ? { ...current, status } : current));
      }
      return { previous };
    },
    onError: (error, _variables, context) => {
      if (context?.previous) queryClient.setQueryData(requestQueryKey, context.previous);
      toast.error(error instanceof Error ? error.message : "Failed to update request");
    },
    onSuccess: (request) => {
      queryClient.setQueryData<Awaited<ReturnType<typeof fetchRequests>> | undefined>(requestQueryKey, (previous) =>
        applyRequestPatch(previous, request.id, request),
      );
      if (selectedRequest?.id === request.id) setSelectedRequest(request);
      void countsQuery.refetch();
    },
  });

  const matchMutation = useMutation({
    mutationFn: async ({
      requestId,
      maidReferences,
    }: {
      requestId: string;
      maidReferences: string[];
    }) => {
      await updateRequestMaids(requestId, maidReferences);
      return updateRequestStatus(requestId, "interested");
    },
    onMutate: async ({ requestId, maidReferences }) => {
      await queryClient.cancelQueries({ queryKey: requestQueryKey });
      const previous = queryClient.getQueryData<Awaited<ReturnType<typeof fetchRequests>>>(requestQueryKey);
      const maids = (maidOptionsQuery.data ?? [])
        .filter((maid) => maidReferences.includes(maid.referenceCode))
        .map((maid) => ({
          referenceCode: maid.referenceCode,
          fullName: maid.fullName,
          nationality: maid.nationality,
          status: maid.status ?? "available",
          type: maid.type ?? "",
          photoDataUrl: maid.photoDataUrl,
        }));
      queryClient.setQueryData(
        requestQueryKey,
        applyRequestPatch(previous, requestId, {
          maidReferences,
          status: "interested",
          maids,
        }),
      );
      if (selectedRequest?.id === requestId) {
        setSelectedRequest((current) =>
          current ? { ...current, maidReferences, maids, status: "interested" } : current,
        );
      }
      return { previous };
    },
    onError: (error, _variables, context) => {
      if (context?.previous) queryClient.setQueryData(requestQueryKey, context.previous);
      toast.error(error instanceof Error ? error.message : "Failed to save maid suggestions");
    },
    onSuccess: (request) => {
      queryClient.setQueryData<Awaited<ReturnType<typeof fetchRequests>> | undefined>(requestQueryKey, (previous) =>
        applyRequestPatch(previous, request.id, request),
      );
      setSelectedRequest(request);
      setDrawerOpen(false);
      toast.success("Request moved to Interested");
      void countsQuery.refetch();
    },
  });

  const messageMutation = useMutation({
    mutationFn: async () => {
      if (!conversationQuery.data?.id) throw new Error("Conversation not found");
      if (!chatDraft.trim()) throw new Error("Message cannot be empty");
      return createRequestMessage({
        conversationId: conversationQuery.data.id,
        message: chatDraft.trim(),
      });
    },
    onSuccess: (message) => {
      queryClient.setQueryData<RequestMessageRecord[] | undefined>(
        ["admin-request-messages", message.conversationId],
        (previous) => [...(previous ?? []), message],
      );
      setChatDraft("");
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Failed to send message");
    },
  });

  // FIX 3: Use the unfiltered countsQuery so badge numbers stay correct
  // on every tab, including when the active tab is empty.
  const statusCounts = useMemo(() => {
    const all = countsQuery.data?.data ?? [];
    return {
      pending:     all.filter((r) => r.status === "pending").length,
      interested:  all.filter((r) => r.status === "interested").length,
      direct_hire: all.filter((r) => r.status === "direct_hire").length,
      rejected:    all.filter((r) => r.status === "rejected").length,
    };
  }, [countsQuery.data]);

  const filteredMaids = useMemo(() => {
    const term = deferredMaidSearch.trim().toLowerCase();
    const items = maidOptionsQuery.data ?? [];
    if (!term) return items;
    return items.filter((maid) =>
      [maid.referenceCode, maid.fullName, maid.nationality, maid.type, maid.status]
        .join(" ")
        .toLowerCase()
        .includes(term),
    );
  }, [deferredMaidSearch, maidOptionsQuery.data]);

  const openDrawer = (request: RequestRecord, mode: DrawerMode) => {
    setSelectedRequest(request);
    setDrawerMode(mode);
    setSelectedMaidReferences(request.maidReferences);
    setMaidSearch("");
    setChatDraft("");
    setDrawerOpen(true);
  };

  useEffect(() => {
    if (!chatScrollRef.current) return;
    chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
  }, [messagesQuery.data]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 rounded-[28px] border bg-card p-6 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Requests</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-foreground">Action-first request queue</h1>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
              Review, match, and close requests without leaving the list. Each action updates in place so the queue stays fast.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {([
              ["pending", "Pending"],
              ["interested", "Interested"],
              ["direct_hire", "Direct Hire"],
              ["rejected", "Rejected"],
            ] as const).map(([status, label]) => (
              <Card key={status} className="border-border/70 shadow-none">
                <CardContent className="px-4 py-3">
                  <p className={cn("text-2xl font-semibold", requestStatusMeta[status].accentClassName)}>
                    {statusCounts[status]}
                  </p>
                  <p className="text-xs text-muted-foreground">{label}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(event) => {
                setPage(1);
                setSearch(event.target.value);
              }}
              placeholder="Search client, summary, notes, or maid reference"
              className="h-11 rounded-2xl pl-10"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            {(["all", "pending", "interested", "direct_hire", "rejected"] as const).map((status) => (
              <Button
                key={status}
                type="button"
                variant={statusFilter === status ? "default" : "outline"}
                className="rounded-full"
                onClick={() => {
                  setPage(1);
                  setStatusFilter(status);
                }}
              >
                {status === "all" ? "All" : requestStatusMeta[status].label}
              </Button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid gap-4">
        {requestsQuery.isLoading ? (
          Array.from({ length: 5 }).map((_, index) => (
            <Card key={index} className="animate-pulse rounded-[24px] border-border/70">
              <CardContent className="h-40" />
            </Card>
          ))
        ) : requests.length === 0 ? (
          <Card className="rounded-[28px] border-dashed border-border/80 shadow-none">
            <CardContent className="flex flex-col items-center justify-center gap-3 py-16 text-center">
              <BriefcaseBusiness className="h-10 w-10 text-muted-foreground" />
              <div>
                <p className="text-lg font-semibold text-foreground">No requests in this view</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  No rows matched the current filters.
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          requests.map((request) => {
            const statusMeta = requestStatusMeta[request.status];
            const isUpdatingStatus =
              statusMutation.isPending && statusMutation.variables?.requestId === request.id;
            const isMatching =
              matchMutation.isPending && matchMutation.variables?.requestId === request.id;

            return (
              <Card
                key={request.id}
                className="rounded-[28px] border-border/70 shadow-sm transition-all duration-200 ease-out hover:-translate-y-0.5 hover:shadow-md"
              >
                <CardContent className="space-y-5 p-6">
                  <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                    <div className="space-y-3">
                      <div className="flex flex-wrap items-center gap-3">
                        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
                          <UserRound className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="text-base font-semibold text-foreground">
                            {request.client?.name || "Client request"}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {request.client?.email || "No email"}{request.client?.phone ? ` • ${request.client.phone}` : ""}
                          </p>
                          <p className="text-xs text-muted-foreground">{request.agencyName}</p>
                        </div>
                        <Badge className={cn("rounded-full border px-3 py-1 text-xs font-medium", statusMeta.badgeClassName)}>
                          {statusMeta.label}
                        </Badge>
                      </div>

                      <div className="grid gap-3 md:grid-cols-3">
                        <div className="rounded-2xl bg-muted/50 px-4 py-3">
                          <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Summary</p>
                          <p className="mt-1 text-sm font-medium text-foreground">{request.summary}</p>
                        </div>
                        <div className="rounded-2xl bg-muted/50 px-4 py-3">
                          <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Budget</p>
                          <p className="mt-1 text-sm font-medium text-foreground">{request.budget || "Not specified"}</p>
                        </div>
                        <div className="rounded-2xl bg-muted/50 px-4 py-3">
                          <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Updated</p>
                          <p className="mt-1 text-sm font-medium text-foreground">{formatDate(request.updatedAt)}</p>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2 xl:max-w-[340px] xl:justify-end">
                      <Button
                        type="button"
                        variant="outline"
                        className="rounded-full"
                        onClick={() => openDrawer(request, "details")}
                      >
                        View details
                      </Button>
                      <Button
                        type="button"
                        className="rounded-full"
                        onClick={() => openDrawer(request, "match")}
                        disabled={isMatching}
                      >
                        {isMatching ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                        Mark Interested
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        className="rounded-full"
                        disabled={isUpdatingStatus}
                        onClick={() => statusMutation.mutate({ requestId: request.id, status: "direct_hire" })}
                      >
                        {isUpdatingStatus && statusMutation.variables?.status === "direct_hire" ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : null}
                        Move to Direct Hire
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        className="rounded-full border-red-200 text-red-700 hover:bg-red-50 hover:text-red-700"
                        disabled={isUpdatingStatus}
                        onClick={() => statusMutation.mutate({ requestId: request.id, status: "rejected" })}
                      >
                        {isUpdatingStatus && statusMutation.variables?.status === "rejected" ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : null}
                        Reject
                      </Button>
                    </div>
                  </div>

                  {request.maids.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {request.maids.map((maid) => (
                        <span
                          key={maid.referenceCode}
                          className="rounded-full border bg-background px-3 py-1 text-xs font-medium text-foreground"
                        >
                          {maid.fullName} ({maid.referenceCode})
                        </span>
                      ))}
                    </div>
                  ) : null}
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      <div className="flex items-center justify-between rounded-[24px] border bg-card px-4 py-3">
        <p className="text-sm text-muted-foreground">
          {pageInfo ? `Page ${pageInfo.page} of ${pageInfo.totalPages} • ${pageInfo.total} total requests` : "Loading..."}
        </p>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            className="rounded-full"
            disabled={page <= 1 || requestsQuery.isFetching}
            onClick={() => setPage((current) => Math.max(1, current - 1))}
          >
            <ChevronLeft className="mr-1 h-4 w-4" />
            Previous
          </Button>
          <Button
            type="button"
            variant="outline"
            className="rounded-full"
            disabled={!pageInfo || page >= pageInfo.totalPages || requestsQuery.isFetching}
            onClick={() => setPage((current) => current + 1)}
          >
            Next
            <ChevronRight className="ml-1 h-4 w-4" />
          </Button>
        </div>
      </div>

      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetContent side="right" className="w-full max-w-[560px] border-l bg-background/95 p-0 backdrop-blur-sm duration-200">
          {selectedRequest ? (
            <>
              <SheetHeader className="border-b px-6 py-5">
                <SheetTitle>{drawerMode === "match" ? "Match request with maids" : "Request details"}</SheetTitle>
                <SheetDescription>
                  {drawerMode === "match"
                    ? "Select suitable maids and move the request into Interested."
                    : requestStateMessage(selectedRequest.status)}
                </SheetDescription>
              </SheetHeader>

              <ScrollArea className="h-[calc(100vh-88px)]">
                <div className="space-y-6 px-6 py-5">
                  <Card className="rounded-[24px] border-border/70 shadow-none">
                    <CardHeader className="space-y-2">
                      <CardTitle className="text-lg">{selectedRequest.client?.name || "Client request"}</CardTitle>
                      <div className="flex flex-wrap gap-2">
                        <Badge className={cn("rounded-full border px-3 py-1 text-xs font-medium", requestStatusMeta[selectedRequest.status].badgeClassName)}>
                          {requestStatusMeta[selectedRequest.status].label}
                        </Badge>
                        <Badge variant="outline" className="rounded-full px-3 py-1 text-xs">
                          {selectedRequest.type === "direct" ? "Direct request" : "General request"}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="grid gap-3 text-sm text-muted-foreground">
                      <p>{selectedRequest.summary}</p>
                      <p>{selectedRequest.client?.email || "No email"}{selectedRequest.client?.phone ? ` • ${selectedRequest.client.phone}` : ""}</p>
                      <p>{selectedRequest.agencyName}</p>
                      <p>Budget: {selectedRequest.budget || "Not specified"}</p>
                    </CardContent>
                  </Card>

                  {drawerMode === "details" ? (
                    <div className="space-y-6">
                      <Card className="rounded-[24px] border-border/70 shadow-none">
                        <CardHeader>
                          <CardTitle className="text-base">Normalized details</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          {detailEntries(selectedRequest.details).map(([key, value]) => (
                            <div key={key} className="rounded-2xl bg-muted/40 px-4 py-3">
                              <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                                {formatDetailLabel(key)}
                              </p>
                              <p className="mt-1 text-sm text-foreground">{String(value)}</p>
                            </div>
                          ))}
                          {detailEntries(selectedRequest.details).length === 0 ? (
                            <p className="text-sm text-muted-foreground">No extra details were captured for this request.</p>
                          ) : null}
                        </CardContent>
                      </Card>

                      <Card className="rounded-[24px] border-border/70 shadow-none">
                        <CardHeader>
                          <CardTitle className="text-base">Request conversation</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div
                            ref={chatScrollRef}
                            className="max-h-[360px] space-y-3 overflow-y-auto rounded-[24px] border bg-muted/20 p-4"
                          >
                            {messagesQuery.isLoading || conversationQuery.isLoading ? (
                              <div className="py-8 text-center text-sm text-muted-foreground">
                                Loading conversation...
                              </div>
                            ) : (messagesQuery.data ?? []).length === 0 ? (
                              <div className="py-8 text-center text-sm text-muted-foreground">
                                No messages yet.
                              </div>
                            ) : (
                              (messagesQuery.data ?? []).map((message) => {
                                if (message.senderType === "system") {
                                  return (
                                    <div key={message.id} className="flex justify-center">
                                      <div className="max-w-[90%] rounded-full bg-muted px-4 py-2 text-center text-xs text-muted-foreground">
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
                                        "max-w-[82%] rounded-[22px] px-4 py-3 text-sm shadow-sm",
                                        isOwn
                                          ? "rounded-bl-md border bg-background text-foreground"
                                          : "rounded-br-md bg-primary text-primary-foreground",
                                      )}
                                    >
                                      <p className="mb-1 text-[11px] opacity-70">
                                        {message.senderType === "staff"
                                          ? "Staff"
                                          : message.senderType === "admin"
                                            ? "Admin"
                                            : "Client"}
                                      </p>
                                      <p className="whitespace-pre-wrap leading-6">{message.message}</p>
                                      <p className="mt-2 text-right text-[11px] opacity-70">
                                        {new Date(message.createdAt).toLocaleTimeString([], {
                                          hour: "numeric",
                                          minute: "2-digit",
                                        })}
                                      </p>
                                    </div>
                                  </div>
                                );
                              })
                            )}
                          </div>

                          <div className="rounded-[24px] border bg-background p-3">
                            <Textarea
                              value={chatDraft}
                              onChange={(event) => setChatDraft(event.target.value)}
                              placeholder="Reply to the client on this request..."
                              className="min-h-[96px] resize-none border-0 p-0 shadow-none focus-visible:ring-0"
                              onKeyDown={(event) => {
                                if (event.key === "Enter" && !event.shiftKey) {
                                  event.preventDefault();
                                  messageMutation.mutate();
                                }
                              }}
                            />
                            <div className="mt-3 flex items-center justify-between gap-3">
                              <p className="text-xs text-muted-foreground">
                                System messages stay centered. Client replies appear on the right.
                              </p>
                              <Button
                                type="button"
                                className="rounded-full"
                                disabled={
                                  messageMutation.isPending ||
                                  !chatDraft.trim() ||
                                  !conversationQuery.data?.id
                                }
                                onClick={() => messageMutation.mutate()}
                              >
                                {messageMutation.isPending ? (
                                  <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Sending...
                                  </>
                                ) : (
                                  "Send reply"
                                )}
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="relative">
                        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          value={maidSearch}
                          onChange={(event) => setMaidSearch(event.target.value)}
                          placeholder="Search maid name, nationality, or reference"
                          className="h-11 rounded-2xl pl-10"
                        />
                      </div>

                      <Card className="rounded-[24px] border-border/70 shadow-none">
                        <CardContent className="space-y-3 p-4">
                          {maidOptionsQuery.isLoading ? (
                            <div className="flex items-center justify-center py-10 text-sm text-muted-foreground">
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Loading maid list...
                            </div>
                          ) : filteredMaids.length === 0 ? (
                            <div className="py-10 text-center text-sm text-muted-foreground">
                              No maids match this search.
                            </div>
                          ) : (
                            filteredMaids.map((maid) => {
                              const checked = selectedMaidReferences.includes(maid.referenceCode);
                              return (
                                <label
                                  key={maid.referenceCode}
                                  className="flex cursor-pointer items-start gap-3 rounded-2xl border p-4 transition-all duration-200 ease-out hover:border-foreground/20 hover:bg-muted/40"
                                >
                                  <Checkbox
                                    checked={checked}
                                    onCheckedChange={(nextChecked) => {
                                      setSelectedMaidReferences((current) =>
                                        nextChecked
                                          ? [...current, maid.referenceCode]
                                          : current.filter((referenceCode) => referenceCode !== maid.referenceCode),
                                      );
                                    }}
                                  />
                                  <div className="min-w-0 flex-1">
                                    <div className="flex items-center justify-between gap-3">
                                      <p className="truncate text-sm font-medium text-foreground">{maid.fullName}</p>
                                      <span className="rounded-full border px-2 py-0.5 text-[11px] text-muted-foreground">
                                        {maid.referenceCode}
                                      </span>
                                    </div>
                                    <p className="mt-1 text-xs text-muted-foreground">
                                      {maid.nationality} • {maid.type || "Maid"} • {maid.status || "available"}
                                    </p>
                                  </div>
                                </label>
                              );
                            })
                          )}
                        </CardContent>
                      </Card>

                      <div className="flex gap-3">
                        <Button
                          type="button"
                          variant="outline"
                          className="flex-1 rounded-2xl"
                          onClick={() => setDrawerOpen(false)}
                        >
                          Cancel
                        </Button>
                        <Button
                          type="button"
                          className="flex-1 rounded-2xl"
                          disabled={!selectedRequest || matchMutation.isPending}
                          onClick={() =>
                            selectedRequest &&
                            matchMutation.mutate({
                              requestId: selectedRequest.id,
                              maidReferences: selectedMaidReferences,
                            })
                          }
                        >
                          {matchMutation.isPending ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Saving...
                            </>
                          ) : (
                            "Save and mark Interested"
                          )}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </>
          ) : null}
        </SheetContent>
      </Sheet>
    </div>
  );
};

const RequestsPage = () => (
  <RequestsPageErrorBoundary>
    <RequestsPageContent />
  </RequestsPageErrorBoundary>
);

export default RequestsPage;