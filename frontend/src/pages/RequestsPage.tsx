import { useEffect, useMemo, useState } from "react";
import { Bell, Search, UserRound, CalendarDays, Tag, ChevronLeft, ChevronRight, X, ClipboardList } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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

const STATUS_STYLES: Record<string, { bg: string; text: string; dot: string; label: string }> = {
  pending:     { bg: "bg-amber-50 border-amber-200",     text: "text-amber-700",    dot: "bg-amber-400",    label: "Pending" },
  interested:  { bg: "bg-blue-50 border-blue-200",       text: "text-blue-700",     dot: "bg-blue-400",     label: "Interested" },
  direct_hire: { bg: "bg-emerald-50 border-emerald-200", text: "text-emerald-700",  dot: "bg-emerald-500",  label: "Direct Hire" },
  rejected:    { bg: "bg-red-50 border-red-200",         text: "text-red-700",      dot: "bg-red-400",      label: "Rejected" },
};

const getStatusStyle = (status: string) =>
  STATUS_STYLES[status.toLowerCase()] ?? {
    bg: "bg-gray-50 border-gray-200", text: "text-gray-600", dot: "bg-gray-400", label: status,
  };

const isGeneralRequest = (r: MaidRequest) =>
  r.maidReferenceCode === "GENERAL" || r.maidReferenceCode === "DIRECT-REQUEST" || !r.maidReferenceCode;

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
        if (!response.ok || !data.directSales) throw new Error(data.error || "Failed to load requests");
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
    if (statusFilter !== "all") result = result.filter((r) => r.status.toLowerCase() === statusFilter);
    const term = search.trim().toLowerCase();
    if (term) {
      result = result.filter((r) =>
        [r.clientName, r.clientEmail, r.clientPhone, r.maidName, r.maidReferenceCode, r.status]
          .join(" ").toLowerCase().includes(term)
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

  useEffect(() => { setPage(1); }, [search, statusFilter]);

  const detailEntries = useMemo(() => {
    if (!selectedRequest) return [];
    const source = selectedRequest.formData ?? selectedRequest.requestDetails ?? {};
    return Object.entries(source)
      .filter(([, value]) => String(value ?? "").trim().length > 0)
      .sort(([a], [b]) => a.localeCompare(b));
  }, [selectedRequest]);

  const counts = useMemo(() => ({
    all:         requests.length,
    pending:     requests.filter((r) => r.status === "pending").length,
    interested:  requests.filter((r) => r.status === "interested").length,
    direct_hire: requests.filter((r) => r.status === "direct_hire").length,
    rejected:    requests.filter((r) => r.status === "rejected").length,
  }), [requests]);

  const STATUS_TABS = [
    { key: "all",         label: "All",         count: counts.all },
    { key: "pending",     label: "Pending",     count: counts.pending },
    { key: "interested",  label: "Interested",  count: counts.interested },
    { key: "direct_hire", label: "Direct Hire", count: counts.direct_hire },
    { key: "rejected",    label: "Rejected",    count: counts.rejected },
  ];

  return (
    <div className="page-container">

      {/* Header */}
      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10">
          <Bell className="h-4 w-4 text-primary" />
        </div>
        <div>
          <h2 className="text-xl font-bold leading-tight">Maid Requests</h2>
          <p className="text-xs text-muted-foreground">{counts.all} total · {counts.pending} pending</p>
        </div>
      </div>

      <div className="content-card space-y-4">

        {/* Search + Tabs */}
        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="Search by name, email, phone, maid, or status…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 pr-9"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          <div className="flex flex-wrap gap-1.5">
            {STATUS_TABS.map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setStatusFilter(tab.key)}
                className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                  statusFilter === tab.key
                    ? "bg-primary border-primary text-primary-foreground"
                    : "bg-background border-border text-muted-foreground hover:text-foreground hover:border-primary/40"
                }`}
              >
                {tab.label}
                <span className={`inline-flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-bold ${
                  statusFilter === tab.key ? "bg-white/20 text-white" : "bg-muted text-muted-foreground"
                }`}>
                  {tab.count}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* List */}
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="animate-pulse rounded-xl border bg-muted/20 p-4">
                <div className="flex justify-between gap-3">
                  <div className="space-y-2 flex-1">
                    <div className="h-3.5 w-1/3 rounded bg-muted" />
                    <div className="h-2.5 w-1/2 rounded bg-muted" />
                  </div>
                  <div className="h-6 w-20 rounded-full bg-muted" />
                </div>
                <div className="mt-3 h-14 rounded-lg bg-muted/50" />
              </div>
            ))}
          </div>
        ) : visibleRequests.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed bg-muted/10 py-14 text-center">
            <ClipboardList className="mb-3 h-9 w-9 text-muted-foreground/40" />
            <p className="font-semibold text-foreground">No requests found</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {search || statusFilter !== "all"
                ? "Try adjusting your filters."
                : "Requests submitted by clients will appear here."}
            </p>
            {(search || statusFilter !== "all") && (
              <button
                type="button"
                onClick={() => { setSearch(""); setStatusFilter("all"); }}
                className="mt-3 text-xs font-medium text-primary hover:underline"
              >
                Clear filters
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-2.5">
            {visibleRequests.map((request, index) => {
              const st = getStatusStyle(request.status);
              const isGeneral = isGeneralRequest(request);
              return (
                <button
                  key={request.id}
                  type="button"
                  onClick={() => { setSelectedRequest(request); setIsDialogOpen(true); }}
                  className="w-full rounded-xl border bg-card text-left transition-all hover:shadow-md hover:border-primary/20 hover:-translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                  style={{
                    animation: "fade-in-up 0.35s cubic-bezier(0.16,1,0.3,1) forwards",
                    animationDelay: `${index * 0.04}s`,
                    opacity: 0,
                  }}
                >
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 min-w-0">
                        <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
                          <UserRound className="h-4 w-4 text-primary" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-foreground truncate">{request.clientName}</p>
                          <p className="text-xs text-muted-foreground truncate">{request.clientEmail}</p>
                          {request.clientPhone && (
                            <p className="text-xs text-muted-foreground">{request.clientPhone}</p>
                          )}
                        </div>
                      </div>
                      <span className={`shrink-0 inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${st.bg} ${st.text}`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${st.dot}`} />
                        {st.label}
                      </span>
                    </div>

                    <div className="mt-3 grid grid-cols-2 gap-2 rounded-lg bg-muted/30 p-3 sm:grid-cols-3">
                      <div className="min-w-0">
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                          {isGeneral ? "Request Type" : "Requested Maid"}
                        </p>
                        <p className="mt-0.5 text-xs font-semibold text-foreground truncate">
                          {isGeneral ? "General Request" : request.maidName}
                        </p>
                        {!isGeneral && (
                          <p className="text-[10px] text-muted-foreground font-mono">{request.maidReferenceCode}</p>
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Request ID</p>
                        <p className="mt-0.5 text-xs font-mono text-foreground">#{request.id}</p>
                      </div>
                      <div className="col-span-2 min-w-0 sm:col-span-1">
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                          <CalendarDays className="h-3 w-3" /> Submitted
                        </p>
                        <p className="mt-0.5 text-xs text-foreground">{new Date(request.createdAt).toLocaleString()}</p>
                      </div>
                    </div>

                    <p className="mt-2 text-[11px] text-muted-foreground/60 text-right">
                      Tap to view full details →
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between gap-2 border-t border-border/50 pt-3">
            <Button
              variant="outline" size="sm"
              disabled={currentPage <= 1}
              onClick={() => setPage((p) => Math.max(p - 1, 1))}
              className="gap-1"
            >
              <ChevronLeft className="h-3.5 w-3.5" /> Prev
            </Button>
            <span className="text-sm text-muted-foreground">
              Page <strong className="text-foreground">{currentPage}</strong> of{" "}
              <strong className="text-foreground">{totalPages}</strong>
            </span>
            <Button
              variant="outline" size="sm"
              disabled={currentPage >= totalPages}
              onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
              className="gap-1"
            >
              Next <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        )}
      </div>

      {/* Detail Dialog */}
      <Dialog
        open={isDialogOpen}
        onOpenChange={(open) => { setIsDialogOpen(open); if (!open) setSelectedRequest(null); }}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Tag className="h-4 w-4 text-primary" />
              Request #{selectedRequest?.id}
            </DialogTitle>
            <DialogDescription>
              {selectedRequest && new Date(selectedRequest.createdAt).toLocaleString()}
            </DialogDescription>
          </DialogHeader>

          {selectedRequest && (() => {
            const st = getStatusStyle(selectedRequest.status);
            const isGeneral = isGeneralRequest(selectedRequest);
            return (
              <div className="max-h-[70vh] space-y-4 overflow-y-auto pr-1">

                {/* Status banner */}
                <div className={`flex items-center gap-2 rounded-lg border px-3 py-2 ${st.bg}`}>
                  <span className={`h-2 w-2 rounded-full ${st.dot}`} />
                  <span className={`text-sm font-semibold ${st.text}`}>{st.label}</span>
                </div>

                {/* Client + Maid */}
                <div className="grid gap-3 rounded-xl border bg-muted/20 p-4 sm:grid-cols-2">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5">Client</p>
                    <p className="font-semibold text-foreground">{selectedRequest.clientName}</p>
                    <p className="text-sm text-muted-foreground">{selectedRequest.clientEmail}</p>
                    <p className="text-sm text-muted-foreground">{selectedRequest.clientPhone || "No phone"}</p>
                    <p className="mt-1 text-xs text-muted-foreground/60">Client ID: {selectedRequest.clientId}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5">
                      {isGeneral ? "Request Type" : "Requested Maid"}
                    </p>
                    {isGeneral ? (
                      <span className="inline-flex rounded-md bg-primary/10 px-2.5 py-1 text-sm font-semibold text-primary">
                        General Request
                      </span>
                    ) : (
                      <>
                        <p className="font-semibold text-foreground">{selectedRequest.maidName}</p>
                        <p className="text-sm font-mono text-muted-foreground">{selectedRequest.maidReferenceCode}</p>
                      </>
                    )}
                  </div>
                </div>

                {/* Detail fields */}
                <div className="rounded-xl border bg-background p-4">
                  <p className="mb-3 text-sm font-semibold text-foreground">Request Details</p>
                  {detailEntries.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No additional details were submitted.</p>
                  ) : (
                    <div className="grid gap-2.5 sm:grid-cols-2">
                      {detailEntries.map(([key, value]) => (
                        <div key={key} className="rounded-lg border bg-muted/10 p-3">
                          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                            {formatFieldLabel(key)}
                          </p>
                          <p className="mt-1.5 whitespace-pre-wrap text-sm text-foreground">{String(value)}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

              </div>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default RequestsPage;