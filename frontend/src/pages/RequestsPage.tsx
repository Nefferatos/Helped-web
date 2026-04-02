import { useEffect, useMemo, useState } from "react";
import { Bell, UserRound } from "lucide-react";
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

const RequestsPage = () => {
  const [requests, setRequests] = useState<MaidRequest[]>([]);
  const [search, setSearch] = useState("");
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

        if (!response.ok || !data.directSales) {
          throw new Error(data.error || "Failed to load requests");
        }

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
    const term = search.trim().toLowerCase();
    if (!term) return requests;

    return requests.filter((request) =>
      [
        request.clientName,
        request.clientEmail,
        request.maidName,
        request.maidReferenceCode,
        request.status,
      ]
        .join(" ")
        .toLowerCase()
        .includes(term),
    );
  }, [requests, search]);

  const totalPages = Math.max(1, Math.ceil(filteredRequests.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const visibleRequests = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredRequests.slice(start, start + PAGE_SIZE);
  }, [currentPage, filteredRequests]);

  useEffect(() => {
    setPage(1);
  }, [search]);

  const requestDetailEntries = useMemo(() => {
    if (!selectedRequest?.requestDetails) return [];
    return Object.entries(selectedRequest.requestDetails)
      .filter(([, value]) => String(value ?? "").trim().length > 0)
      .sort(([left], [right]) => left.localeCompare(right));
  }, [selectedRequest]);

  return (
    <div className="page-container">
      <div className="mb-6 flex items-center gap-3">
        <Bell className="h-5 w-5 text-primary" />
        <h2 className="text-xl font-bold">Maid Requests</h2>
      </div>

      <div className="content-card animate-fade-in-up space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Input
            placeholder="Search by user name, maid name, email, or status"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="max-w-xl"
          />
          <div className="flex gap-3 text-sm">
            <span className="rounded-md bg-secondary/30 px-3 py-2">
              Total: <strong>{requests.length}</strong>
            </span>
            <span className="rounded-md bg-accent/20 px-3 py-2">
              Pending: <strong>{requests.filter((item) => item.status === "pending").length}</strong>
            </span>
          </div>
        </div>

        {isLoading ? (
          <div className="py-10 text-center text-black">Loading requests...</div>
        ) : visibleRequests.length === 0 ? (
          <div className="py-10 text-center text-black">No maid requests found.</div>
        ) : (
          <div className="space-y-3">
            {visibleRequests.map((request, index) => (
              <button
                key={request.id}
                type="button"
                className="w-full rounded-lg border p-4 text-left transition-colors hover:border-primary/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                style={{
                  animation: "fade-in-up 0.4s cubic-bezier(0.16,1,0.3,1) forwards",
                  animationDelay: `${index * 0.05}s`,
                  opacity: 0,
                }}
                onClick={() => {
                  setSelectedRequest(request);
                  setIsDialogOpen(true);
                }}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-1">
                    <p className="text-sm font-semibold">{request.clientName}</p>
                    <p className="text-xs text-black">{request.clientEmail}</p>
                    <p className="text-xs text-black">{request.clientPhone || "No phone provided"}</p>
                  </div>
                  <div className="rounded-md bg-muted/40 px-3 py-2 text-xs uppercase tracking-wide text-black">
                    {request.status}
                  </div>
                </div>

                <div className="mt-4 grid gap-3 rounded-lg bg-muted/30 p-3 md:grid-cols-2">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Requested Maid</p>
                    <p className="mt-1 text-sm font-semibold">{request.maidName}</p>
                    <p className="text-xs text-black">{request.maidReferenceCode}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Requested By</p>
                    <p className="mt-1 flex items-center gap-2 text-sm">
                      <UserRound className="h-4 w-4 text-primary" />
                      {request.clientName}
                    </p>
                    <p className="text-xs text-black">{new Date(request.createdAt).toLocaleString()}</p>
                  </div>
                </div>

                <p className="mt-3 text-xs text-muted-foreground">Tap to view request details.</p>
              </button>
            ))}
          </div>
        )}

        <div className="flex justify-center gap-2 pt-2">
          <Button
            variant="outline"
            size="sm"
            disabled={currentPage <= 1}
            onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
          >
            Previous
          </Button>
          <span className="flex items-center text-sm text-muted-foreground">
            Page {currentPage} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={currentPage >= totalPages}
            onClick={() => setPage((prev) => Math.min(prev + 1, totalPages))}
          >
            Next
          </Button>
        </div>
      </div>

      <Dialog
        open={isDialogOpen}
        onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) {
            setSelectedRequest(null);
          }
        }}
      >
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Request Details</DialogTitle>
            <DialogDescription>
              {selectedRequest
                ? `Request #${selectedRequest.id} • ${new Date(selectedRequest.createdAt).toLocaleString()}`
                : "Request details"}
            </DialogDescription>
          </DialogHeader>

          {selectedRequest ? (
            <div className="max-h-[70vh] space-y-5 overflow-y-auto pr-1">
              <div className="grid gap-3 rounded-xl border bg-muted/20 p-4 md:grid-cols-2">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Maid</p>
                  <p className="mt-1 text-base font-semibold text-foreground">{selectedRequest.maidName}</p>
                  <p className="text-sm text-muted-foreground">{selectedRequest.maidReferenceCode}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Status</p>
                  <p className="mt-1 inline-flex rounded-full bg-secondary px-3 py-1 text-sm font-semibold text-secondary-foreground">
                    {selectedRequest.status}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Client</p>
                  <p className="mt-1 text-base font-semibold text-foreground">{selectedRequest.clientName}</p>
                  <p className="text-sm text-muted-foreground">{selectedRequest.clientEmail}</p>
                  <p className="text-sm text-muted-foreground">{selectedRequest.clientPhone || "No phone provided"}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Internal</p>
                  <p className="mt-1 text-sm text-muted-foreground">Client ID: {selectedRequest.clientId}</p>
                  <p className="text-sm text-muted-foreground">Request ID: {selectedRequest.id}</p>
                </div>
              </div>

              <div className="rounded-xl border bg-background p-4">
                <p className="text-sm font-semibold text-foreground">Submitted Request Contents</p>
                {requestDetailEntries.length === 0 ? (
                  <p className="mt-2 text-sm text-muted-foreground">No extra request details were submitted.</p>
                ) : (
                  <div className="mt-4 grid gap-3 md:grid-cols-2">
                    {requestDetailEntries.map(([key, value]) => (
                      <div key={key} className="rounded-xl border bg-muted/10 p-3">
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                          {formatFieldLabel(key)}
                        </p>
                        <p className="mt-2 whitespace-pre-wrap text-sm text-foreground">{String(value)}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default RequestsPage;
