import { useEffect, useMemo, useState } from "react";
import { Bell, CheckCircle2, Clock3, FileText, History, Mail, Phone, UserRound, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/sonner";
import { adminPath } from "@/lib/routes";

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

type RequestStatus = "pending" | "interested" | "direct_hire" | "rejected";
type RequestTab = "active" | "history";

const PAGE_SIZE = 8;

const statusLabel: Record<string, string> = {
  pending: "New Request",
  interested: "In Progress",
  direct_hire: "Completed",
  rejected: "Closed",
};

const getStatusTone = (status: string) => {
  if (status === "direct_hire") return "bg-emerald-100 text-emerald-800";
  if (status === "rejected") return "bg-rose-100 text-rose-800";
  if (status === "interested") return "bg-amber-100 text-amber-800";
  return "bg-sky-100 text-sky-800";
};

const formatRequestDetailLabel = (key: string) =>
  key
    .replace(/([A-Z])/g, " $1")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase())
    .trim();

const getWorkflowSteps = (request: MaidRequest) => {
  const baseSteps = [
    {
      title: "Review request details",
      description: "Check the service type, duties, budget, and preferred start date from the client submission.",
      state: "done",
    },
    {
      title: "Shortlist and contact client",
      description: "Confirm fit, clarify missing details, and move the request into active handling when the agency starts follow-up.",
      state: request.status === "pending" ? "current" : "done",
    },
    {
      title: "Interview and candidate coordination",
      description: "Arrange interviews, propose shortlisted helpers, and keep the request moving toward selection.",
      state: request.status === "interested" ? "current" : request.status === "direct_hire" ? "done" : "upcoming",
    },
    {
      title: "Outcome and archive",
      description: "Mark the request as completed or closed. It will move to history automatically.",
      state: request.status === "direct_hire" || request.status === "rejected" ? "done" : "upcoming",
    },
  ] as const;

  return baseSteps;
};

const RequestsPage = () => {
  const [requests, setRequests] = useState<MaidRequest[]>([]);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [tab, setTab] = useState<RequestTab>("active");
  const [isLoading, setIsLoading] = useState(true);
  const [selectedRequestId, setSelectedRequestId] = useState<number | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [internalNotes, setInternalNotes] = useState<Record<number, string>>({});

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
    const scopedRequests = requests.filter((request) =>
      tab === "active"
        ? request.status === "pending" || request.status === "interested"
        : request.status === "direct_hire" || request.status === "rejected",
    );

    if (!term) return scopedRequests;

    return scopedRequests.filter((request) =>
      [
        request.clientName,
        request.clientEmail,
        request.maidName,
        request.maidReferenceCode,
        request.status,
        request.requestDetails?.serviceType,
        request.requestDetails?.duties,
      ]
        .join(" ")
        .toLowerCase()
        .includes(term),
    );
  }, [requests, search, tab]);

  const totalPages = Math.max(1, Math.ceil(filteredRequests.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const visibleRequests = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredRequests.slice(start, start + PAGE_SIZE);
  }, [currentPage, filteredRequests]);

  useEffect(() => {
    setPage(1);
  }, [search, tab]);

  useEffect(() => {
    if (!filteredRequests.length) {
      setSelectedRequestId(null);
      return;
    }

    if (!selectedRequestId || !filteredRequests.some((request) => request.id === selectedRequestId)) {
      setSelectedRequestId(filteredRequests[0].id);
    }
  }, [filteredRequests, selectedRequestId]);

  const selectedRequest = filteredRequests.find((request) => request.id === selectedRequestId) ?? null;
  const selectedRequestNotes = selectedRequest ? internalNotes[selectedRequest.id] ?? "" : "";

  const summary = useMemo(
    () => ({
      total: requests.length,
      active: requests.filter((item) => item.status === "pending" || item.status === "interested").length,
      pending: requests.filter((item) => item.status === "pending").length,
      completed: requests.filter((item) => item.status === "direct_hire").length,
      closed: requests.filter((item) => item.status === "rejected").length,
    }),
    [requests],
  );

  const updateRequestStatus = async (request: MaidRequest, nextStatus: RequestStatus) => {
    try {
      setIsUpdating(true);
      const action =
        nextStatus === "interested" ? "interested" : nextStatus === "direct_hire" ? "direct-hire" : "reject";

      const response = await fetch(`/api/direct-sales/${request.id}/${action}`, {
        method: "PATCH",
      });
      const data = (await response.json().catch(() => ({}))) as {
        error?: string;
        directSale?: MaidRequest;
      };

      if (!response.ok || !data.directSale) {
        throw new Error(data.error || "Failed to update request");
      }

      setRequests((prev) => prev.map((item) => (item.id === request.id ? { ...item, ...data.directSale } : item)));
      toast.success(
        nextStatus === "interested"
          ? "Request moved into active handling."
          : nextStatus === "direct_hire"
          ? "Request completed and moved to history."
          : "Request closed and moved to history.",
      );

      if (nextStatus === "direct_hire" || nextStatus === "rejected") {
        setTab("history");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update request");
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="page-container">
      <div className="mb-6 flex items-center gap-3">
        <Bell className="h-5 w-5 text-primary" />
        <h2 className="text-xl font-bold">Request Workflow</h2>
      </div>

      <div className="content-card animate-fade-in-up space-y-5">
        <div className="grid gap-3 md:grid-cols-4 xl:grid-cols-5">
          <div className="rounded-xl border bg-secondary/20 p-4 text-sm">
            <p className="text-muted-foreground">Total Requests</p>
            <p className="mt-2 text-2xl font-bold">{summary.total}</p>
          </div>
          <div className="rounded-xl border bg-sky-50 p-4 text-sm">
            <p className="text-muted-foreground">Active Queue</p>
            <p className="mt-2 text-2xl font-bold">{summary.active}</p>
          </div>
          <div className="rounded-xl border bg-amber-50 p-4 text-sm">
            <p className="text-muted-foreground">Pending</p>
            <p className="mt-2 text-2xl font-bold">{summary.pending}</p>
          </div>
          <div className="rounded-xl border bg-emerald-50 p-4 text-sm">
            <p className="text-muted-foreground">Completed</p>
            <p className="mt-2 text-2xl font-bold">{summary.completed}</p>
          </div>
          <div className="rounded-xl border bg-rose-50 p-4 text-sm">
            <p className="text-muted-foreground">Closed</p>
            <p className="mt-2 text-2xl font-bold">{summary.closed}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <Input
            placeholder="Search by client, maid, duties, email, or status"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="max-w-xl"
          />

          <div className="flex gap-2">
            <Button variant={tab === "active" ? "default" : "outline"} size="sm" onClick={() => setTab("active")}>
              Active Workflow
            </Button>
            <Button variant={tab === "history" ? "default" : "outline"} size="sm" onClick={() => setTab("history")}>
              History
            </Button>
          </div>
        </div>

        {isLoading ? (
          <div className="py-10 text-center text-black">Loading requests...</div>
        ) : filteredRequests.length === 0 ? (
          <div className="py-10 text-center text-black">No requests found in this view.</div>
        ) : (
          <div className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
            <div className="space-y-3">
              {visibleRequests.map((request) => (
                <button
                  key={request.id}
                  type="button"
                  onClick={() => setSelectedRequestId(request.id)}
                  className={`w-full rounded-xl border p-4 text-left transition-colors ${
                    selectedRequestId === request.id ? "border-primary bg-primary/5" : "hover:border-primary/30"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold">{request.clientName}</p>
                      <p className="text-xs text-black">{request.clientEmail}</p>
                    </div>
                    <span className={`rounded-full px-3 py-1 text-xs font-medium ${getStatusTone(request.status)}`}>
                      {statusLabel[request.status] || request.status}
                    </span>
                  </div>

                  <div className="mt-4 grid gap-3 rounded-lg bg-muted/30 p-3 text-sm md:grid-cols-2">
                    <div>
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">Requested Maid</p>
                      <p className="mt-1 font-semibold">{request.maidName}</p>
                      <p className="text-xs text-black">{request.maidReferenceCode}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">Requested On</p>
                      <p className="mt-1">{new Date(request.createdAt).toLocaleString()}</p>
                      <p className="text-xs text-black">{request.requestDetails?.serviceType || "Service type not provided"}</p>
                    </div>
                  </div>
                </button>
              ))}

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

            {selectedRequest ? (
              <div className="space-y-4 rounded-xl border bg-background p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Selected Request</p>
                    <h3 className="mt-1 text-xl font-bold">{selectedRequest.clientName}</h3>
                    <p className="text-sm text-muted-foreground">
                      {selectedRequest.maidName} • {selectedRequest.maidReferenceCode}
                    </p>
                  </div>
                  <span className={`rounded-full px-3 py-1 text-xs font-medium ${getStatusTone(selectedRequest.status)}`}>
                    {statusLabel[selectedRequest.status] || selectedRequest.status}
                  </span>
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <div className="rounded-xl border bg-muted/20 p-4 text-sm">
                    <p className="mb-2 flex items-center gap-2 font-medium">
                      <UserRound className="h-4 w-4 text-primary" />
                      Client
                    </p>
                    <p>{selectedRequest.clientName}</p>
                    <p className="mt-1 flex items-center gap-2 text-muted-foreground">
                      <Mail className="h-4 w-4" />
                      {selectedRequest.clientEmail}
                    </p>
                    <p className="mt-1 flex items-center gap-2 text-muted-foreground">
                      <Phone className="h-4 w-4" />
                      {selectedRequest.clientPhone || "No phone provided"}
                    </p>
                  </div>

                  <div className="rounded-xl border bg-muted/20 p-4 text-sm">
                    <p className="mb-2 flex items-center gap-2 font-medium">
                      <FileText className="h-4 w-4 text-primary" />
                      Request Snapshot
                    </p>
                    <p className="text-muted-foreground">Created: {new Date(selectedRequest.createdAt).toLocaleString()}</p>
                    <p className="mt-1 text-muted-foreground">
                      Service: {selectedRequest.requestDetails?.serviceType || "Not specified"}
                    </p>
                    <p className="mt-1 text-muted-foreground">
                      Budget: {selectedRequest.requestDetails?.salaryOffer ? `SGD ${selectedRequest.requestDetails.salaryOffer}` : "Not specified"}
                    </p>
                  </div>
                </div>

                <div className="rounded-xl border p-4">
                  <p className="font-medium">Agency Flow</p>
                  <div className="mt-4 space-y-4">
                    {getWorkflowSteps(selectedRequest).map((step, index) => (
                      <div key={step.title} className="flex gap-3">
                        <div className="mt-0.5">
                          {step.state === "done" ? (
                            <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                          ) : step.state === "current" ? (
                            <Clock3 className="h-5 w-5 text-amber-600" />
                          ) : (
                            <History className="h-5 w-5 text-muted-foreground" />
                          )}
                        </div>
                        <div>
                          <p className="font-medium">
                            {index + 1}. {step.title}
                          </p>
                          <p className="text-sm text-muted-foreground">{step.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-xl border p-4">
                  <p className="font-medium">Submitted Client Details</p>
                  <div className="mt-4 grid gap-3 md:grid-cols-2">
                    {Object.entries(selectedRequest.requestDetails || {}).length > 0 ? (
                      Object.entries(selectedRequest.requestDetails || {}).map(([key, value]) => (
                        <div key={key} className="rounded-lg bg-muted/20 p-3 text-sm">
                          <p className="text-xs uppercase tracking-wide text-muted-foreground">{formatRequestDetailLabel(key)}</p>
                          <p className="mt-1 whitespace-pre-wrap break-words">{value || "Not provided"}</p>
                        </div>
                      ))
                    ) : (
                      <div className="text-sm text-muted-foreground">No structured request details were saved for this item.</div>
                    )}
                  </div>
                </div>

                <div className="rounded-xl border p-4">
                  <p className="font-medium">Agency Actions</p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Use the workflow actions below. Completed or closed requests move into history automatically.
                  </p>
                  <div className="mt-4 flex flex-wrap gap-3">
                    {selectedRequest.status === "pending" ? (
                      <Button onClick={() => void updateRequestStatus(selectedRequest, "interested")} disabled={isUpdating}>
                        Start Handling
                      </Button>
                    ) : null}

                    {(selectedRequest.status === "pending" || selectedRequest.status === "interested") ? (
                      <Button
                        variant="outline"
                        onClick={() => void updateRequestStatus(selectedRequest, "direct_hire")}
                        disabled={isUpdating}
                      >
                        Mark Completed
                      </Button>
                    ) : null}

                    {(selectedRequest.status === "pending" || selectedRequest.status === "interested") ? (
                      <Button
                        variant="outline"
                        onClick={() => void updateRequestStatus(selectedRequest, "rejected")}
                        disabled={isUpdating}
                      >
                        <XCircle className="mr-2 h-4 w-4" />
                        Close Request
                      </Button>
                    ) : null}

                    <Button variant="ghost" asChild>
                      <a href={adminPath(`/maid/${encodeURIComponent(selectedRequest.maidReferenceCode)}`)}>Open Maid Profile</a>
                    </Button>
                  </div>
                </div>

                <div className="rounded-xl border p-4">
                  <p className="font-medium">Internal Notes</p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Lightweight working notes for the current admin session. Useful for call outcomes or follow-up reminders.
                  </p>
                  <Textarea
                    className="mt-3"
                    rows={4}
                    placeholder="Example: Client prefers English-speaking helper and evening interview slot."
                    value={selectedRequestNotes}
                    onChange={(event) =>
                      setInternalNotes((prev) => ({
                        ...prev,
                        [selectedRequest.id]: event.target.value,
                      }))
                    }
                  />
                </div>
              </div>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
};

export default RequestsPage;
