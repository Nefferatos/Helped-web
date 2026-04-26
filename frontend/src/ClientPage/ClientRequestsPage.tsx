import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowRight, CheckCircle2, Clock3, Loader2, RefreshCcw, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { getStoredClient } from "@/lib/clientAuth";
import { fetchAgencyOptions } from "@/lib/agencies";
import {
  createRequestMessage,
  createRequest,
  fetchRequests,
  fetchRequestConversation,
  fetchRequestMessages,
  subscribeToRequestsChanged,
  type RequestMessageRecord,
  type RequestRecord,
  requestStateMessage,
  requestStatusMeta,
} from "@/lib/requests";
import { toast } from "@/components/ui/sonner";
import "./ClientTheme.css";

const NATIONALITY_OPTIONS = [
  "No Preference",
  "Filipino",
  "Indonesian",
  "Indian",
  "Sri Lankan",
  "Myanmese",
  "Cambodian",
  "Bangladeshi",
  "Nepali",
] as const;

const PRIMARY_DUTY_OPTIONS = [
  "No Preference",
  "Housekeeping",
  "Elderly Care",
  "Infant Care",
  "Kid Care",
  "Cooking",
  "Other",
] as const;

const AGE_GROUP_OPTIONS = [
  "No Preference",
  "18-25",
  "26-35",
  "36-45",
  "46+",
] as const;

const LANGUAGE_OPTIONS = [
  "No Preference",
  "English",
  "Mandarin",
  "Malay",
  "Tamil",
  "Tagalog",
  "Bahasa Indonesia",
] as const;

type RequirementsState = {
  noOffDay: boolean;
  hasChildren: boolean;
  married: boolean;
  newMaid: boolean;
  transferMaid: boolean;
  exSingaporeMaid: boolean;
};

const defaultRequirements: RequirementsState = {
  noOffDay: false,
  hasChildren: false,
  married: false,
  newMaid: false,
  transferMaid: false,
  exSingaporeMaid: false,
};

const formatDate = (value: string) =>
  new Intl.DateTimeFormat("en-SG", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));

const ClientRequestsPage = () => {
  const queryClient = useQueryClient();
  const storedClient = useMemo(() => getStoredClient(), []);
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);
  const [chatDraft, setChatDraft] = useState("");
  const [requirements, setRequirements] = useState<RequirementsState>(defaultRequirements);
  const chatScrollRef = useRef<HTMLDivElement | null>(null);
  const [form, setForm] = useState({
    agencyId: "",
    nationality: "No Preference",
    primaryDuty: "No Preference",
    ageGroup: "No Preference",
    language: "No Preference",
    budget: "",
    otherRequirements: "",
  });

  const requestsQuery = useQuery({
    queryKey: ["client-requests", storedClient?.id],
    enabled: typeof storedClient?.id === "number",
    queryFn: () =>
      fetchRequests({
        clientId: storedClient?.id,
        page: 1,
        pageSize: 12,
      }),
    refetchInterval: 5000,
  });

  const agenciesQuery = useQuery({
    queryKey: ["public-agencies"],
    queryFn: fetchAgencyOptions,
    staleTime: 60_000,
  });

  const conversationQuery = useQuery({
    queryKey: ["request-conversation", selectedRequestId],
    enabled: Boolean(selectedRequestId),
    queryFn: () => fetchRequestConversation(selectedRequestId!),
    refetchInterval: 5000,
  });

  const messagesQuery = useQuery({
    queryKey: ["request-messages", conversationQuery.data?.id],
    enabled: Boolean(conversationQuery.data?.id),
    queryFn: () => fetchRequestMessages(conversationQuery.data!.id),
    refetchInterval: 5000,
  });

  const createMutation = useMutation({
    mutationFn: () => {
      if (!storedClient?.id) throw new Error("Client session not found");
      const requirementsList = [
        requirements.noOffDay ? "No Off-day" : null,
        requirements.hasChildren ? "Has child(ren)" : null,
        requirements.married ? "Married" : null,
        requirements.newMaid ? "New Maid" : null,
        requirements.transferMaid ? "Transfer Maid" : null,
        requirements.exSingaporeMaid ? "Ex-Singapore Maid" : null,
      ].filter(Boolean);

      return createRequest({
        clientId: storedClient.id,
        type: "general",
        agencyId: form.agencyId ? Number(form.agencyId) : 1,
        details: {
          nationality: form.nationality,
          primaryDuty: form.primaryDuty,
          ageGroup: form.ageGroup,
          language: form.language,
          ...(form.budget.trim() && { budget: form.budget.trim() }),
          ...(form.otherRequirements.trim() && {
            otherRequirements: form.otherRequirements.trim(),
          }),
          ...(requirementsList.length > 0 && {
            requirements: requirementsList.join(", "),
          }),
        },
      });
    },
    onSuccess: (request) => {
      void queryClient.invalidateQueries({ queryKey: ["agency-requests"] });
      void queryClient.invalidateQueries({ queryKey: ["client-requests"] });
      queryClient.setQueryData<Awaited<ReturnType<typeof fetchRequests>> | undefined>(
        ["client-requests", storedClient?.id],
        (previous) => {
          if (!previous) {
            return {
              data: [request],
              pageInfo: { page: 1, pageSize: 12, total: 1, totalPages: 1 },
            };
          }
          return {
            ...previous,
            data: [request, ...previous.data].slice(0, previous.pageInfo.pageSize),
            pageInfo: {
              ...previous.pageInfo,
              total: previous.pageInfo.total + 1,
              totalPages: Math.max(1, Math.ceil((previous.pageInfo.total + 1) / previous.pageInfo.pageSize)),
            },
          };
        },
      );
      setSelectedRequestId(request.id);
      setChatDraft("");
      setRequirements(defaultRequirements);
      setForm({
        agencyId: "",
        nationality: "No Preference",
        primaryDuty: "No Preference",
        ageGroup: "No Preference",
        language: "No Preference",
        budget: "",
        otherRequirements: "",
      });
      toast.success("Your request is now in review.");
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Failed to submit request");
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
        ["request-messages", message.conversationId],
        (previous) => [...(previous ?? []), message],
      );
      setChatDraft("");
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Failed to send message");
    },
  });

  useEffect(() => {
    const unsubscribe = subscribeToRequestsChanged(() => {
      void requestsQuery.refetch();
    });
    return unsubscribe;
  }, [requestsQuery.refetch]);

  const requests = requestsQuery.data?.data ?? [];

  useEffect(() => {
    if (!selectedRequestId && requests.length > 0) {
      setSelectedRequestId(requests[0].id);
    }
  }, [requests, selectedRequestId]);

  useEffect(() => {
    if (!chatScrollRef.current) return;
    chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
  }, [messagesQuery.data]);

  const selectedRequest =
    requests.find((request) => request.id === selectedRequestId) ?? requests[0] ?? null;

  const timeline = selectedRequest
    ? [
        {
          label: "Submitted",
          text: "We received your request and added it to the agency queue.",
          active: true,
          date: formatDate(selectedRequest.createdAt),
        },
        {
          label: "Updated",
          text: requestStateMessage(selectedRequest.status),
          active: selectedRequest.updatedAt !== selectedRequest.createdAt || selectedRequest.status !== "pending",
          date: formatDate(selectedRequest.updatedAt),
        },
        {
          label: "Outcome",
          text:
            selectedRequest.status === "direct_hire"
              ? "Your request has reached a successful direct hire outcome."
              : selectedRequest.status === "rejected"
                ? "This request was closed."
                : "We will keep this updated as the team works on it.",
          active: selectedRequest.status === "direct_hire" || selectedRequest.status === "rejected",
          date:
            selectedRequest.status === "direct_hire" || selectedRequest.status === "rejected"
              ? formatDate(selectedRequest.updatedAt)
              : "In progress",
        },
      ]
    : [];

  const requestMessages = messagesQuery.data ?? [];

  const renderMessage = (message: RequestMessageRecord) => {
    if (message.senderType === "system") {
      return (
        <div key={message.id} className="flex justify-center">
          <div className="max-w-[90%] rounded-full bg-muted px-4 py-2 text-center text-xs text-muted-foreground">
            {message.message}
          </div>
        </div>
      );
    }

    const isClient = message.senderType === "client";
    const senderLabel = isClient
      ? "You"
      : message.senderType === "staff"
        ? "Agency Staff"
        : "Agency Admin";

    return (
      <div key={message.id} className={cn("flex", isClient ? "justify-end" : "justify-start")}>
        <div
          className={cn(
            "max-w-[82%] rounded-[22px] px-4 py-3 text-sm shadow-sm",
            isClient
              ? "rounded-br-md bg-primary text-primary-foreground"
              : "rounded-bl-md border bg-background text-foreground",
          )}
        >
          <p className="mb-1 text-[11px] opacity-70">{senderLabel}</p>
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
  };

  return (
    <div className="client-page-theme min-h-screen bg-[linear-gradient(180deg,hsl(var(--background))_0%,hsl(var(--muted))_100%)]">
      <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6">
        <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-6">
            <Card className="rounded-[30px] border bg-card shadow-sm">
              <CardHeader className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">New request</p>
                <CardTitle className="text-3xl font-semibold tracking-tight">Tell us what you need</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Submit one request and track every update here. No more black hole.
                </p>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="grid gap-2 sm:col-span-2">
                    <label className="text-sm font-medium text-foreground">Agency</label>
                    <select
                      className="h-11 rounded-2xl border bg-background px-3 text-sm"
                      value={form.agencyId}
                      onChange={(event) => setForm((current) => ({ ...current, agencyId: event.target.value }))}
                    >
                      <option value="">Choose an agency</option>
                      {(agenciesQuery.data ?? []).map((agency) => (
                        <option key={agency.id} value={agency.id}>
                          {agency.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="grid gap-2">
                    <label className="text-sm font-medium text-foreground">Nationality</label>
                    <select
                      className="h-11 rounded-2xl border bg-background px-3 text-sm"
                      value={form.nationality}
                      onChange={(event) => setForm((current) => ({ ...current, nationality: event.target.value }))}
                    >
                      {NATIONALITY_OPTIONS.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="grid gap-2">
                    <label className="text-sm font-medium text-foreground">Primary Duty</label>
                    <select
                      className="h-11 rounded-2xl border bg-background px-3 text-sm"
                      value={form.primaryDuty}
                      onChange={(event) => setForm((current) => ({ ...current, primaryDuty: event.target.value }))}
                    >
                      {PRIMARY_DUTY_OPTIONS.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="grid gap-2">
                    <label className="text-sm font-medium text-foreground">Age Group</label>
                    <select
                      className="h-11 rounded-2xl border bg-background px-3 text-sm"
                      value={form.ageGroup}
                      onChange={(event) => setForm((current) => ({ ...current, ageGroup: event.target.value }))}
                    >
                      {AGE_GROUP_OPTIONS.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="grid gap-2">
                    <label className="text-sm font-medium text-foreground">Language</label>
                    <select
                      className="h-11 rounded-2xl border bg-background px-3 text-sm"
                      value={form.language}
                      onChange={(event) => setForm((current) => ({ ...current, language: event.target.value }))}
                    >
                      {LANGUAGE_OPTIONS.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid gap-2">
                  <label className="text-sm font-medium text-foreground">Budget</label>
                  <Input
                    value={form.budget}
                    onChange={(event) => setForm((current) => ({ ...current, budget: event.target.value }))}
                    placeholder="e.g. SGD 700 - 900"
                    className="h-11 rounded-2xl"
                  />
                </div>

                <div className="rounded-[24px] border bg-muted/30 p-4">
                  <p className="text-sm font-semibold text-foreground">Special requirements</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {[
                      { key: "noOffDay", label: "No Off-day" },
                      { key: "hasChildren", label: "Has child(ren)" },
                      { key: "married", label: "Married" },
                      { key: "newMaid", label: "New Maid" },
                      { key: "transferMaid", label: "Transfer Maid" },
                      { key: "exSingaporeMaid", label: "Ex-Singapore Maid" },
                    ].map((item) => {
                      const checked = requirements[item.key as keyof RequirementsState];
                      return (
                        <button
                          key={item.key}
                          type="button"
                          className={cn(
                            "rounded-full border px-3 py-1.5 text-sm transition-all duration-200 ease-out",
                            checked
                              ? "border-primary bg-primary text-primary-foreground"
                              : "bg-background text-foreground hover:border-primary/40",
                          )}
                          onClick={() =>
                            setRequirements((current) => ({
                              ...current,
                              [item.key]: !current[item.key as keyof RequirementsState],
                            }))
                          }
                        >
                          {item.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="grid gap-2">
                  <label className="text-sm font-medium text-foreground">Additional notes</label>
                  <Textarea
                    value={form.otherRequirements}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, otherRequirements: event.target.value }))
                    }
                    placeholder="Share your household needs, caregiving priorities, or anything the agency should know."
                    className="min-h-[120px] rounded-[24px] resize-none"
                  />
                </div>

                <div className="flex justify-end">
                  <Button
                    type="button"
                    size="lg"
                    className="rounded-full px-6"
                    disabled={createMutation.isPending}
                    aria-disabled={createMutation.isPending}
                    onClick={() => createMutation.mutate()}
                  >
                    {createMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      <>
                        Submit request
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-[30px] border bg-card shadow-sm">
              <CardHeader className="flex flex-row items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">My requests</p>
                  <CardTitle className="mt-2 text-2xl">Track every request</CardTitle>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-full"
                  onClick={() => void requestsQuery.refetch()}
                  disabled={requestsQuery.isFetching}
                >
                  {requestsQuery.isFetching ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCcw className="mr-2 h-4 w-4" />}
                  Refresh
                </Button>
              </CardHeader>
              <CardContent className="space-y-3">
                {requestsQuery.isLoading ? (
                  <div className="py-8 text-center text-sm text-muted-foreground">Loading your requests...</div>
                ) : requests.length === 0 ? (
                  <div className="rounded-[24px] border-dashed border p-8 text-center">
                    <p className="text-base font-medium text-foreground">No requests yet</p>
                    <p className="mt-1 text-sm text-muted-foreground">Submit your first request and it will appear here right away.</p>
                  </div>
                ) : (
                  requests.map((request) => {
                    const meta = requestStatusMeta[request.status];
                    const active = selectedRequest?.id === request.id;
                    return (
                      <button
                        key={request.id}
                        type="button"
                        className={cn(
                          "w-full rounded-[24px] border p-4 text-left transition-all duration-200 ease-out",
                          active ? "border-primary/40 bg-primary/5 shadow-sm" : "bg-background hover:-translate-y-0.5 hover:shadow-sm",
                        )}
                        onClick={() => setSelectedRequestId(request.id)}
                      >
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                          <div>
                            <p className="text-sm font-semibold text-foreground">{request.summary}</p>
                            <p className="mt-1 text-sm text-muted-foreground">{formatDate(request.createdAt)}</p>
                            <p className="mt-1 text-xs text-muted-foreground">{request.agencyName}</p>
                          </div>
                          <Badge className={cn("rounded-full border px-3 py-1 text-xs font-medium", meta.badgeClassName)}>
                            {meta.label}
                          </Badge>
                        </div>
                      </button>
                    );
                  })
                )}
              </CardContent>
            </Card>
          </div>

          <div>
            <Card className="sticky top-24 rounded-[30px] border bg-card shadow-sm">
              <CardHeader>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Status detail</p>
                <CardTitle className="mt-2 text-2xl">
                  {selectedRequest ? "Live request status" : "Select a request"}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {selectedRequest ? (
                  <>
                    <div className="rounded-[24px] bg-muted/40 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-foreground">{selectedRequest.summary}</p>
                          <p className="mt-1 text-sm text-muted-foreground">
                            {selectedRequest.budget ? `Budget ${selectedRequest.budget}` : "Budget not specified"}
                          </p>
                          <p className="mt-1 text-xs text-muted-foreground">{selectedRequest.agencyName}</p>
                        </div>
                        <Badge className={cn("rounded-full border px-3 py-1 text-xs font-medium", requestStatusMeta[selectedRequest.status].badgeClassName)}>
                          {requestStatusMeta[selectedRequest.status].label}
                        </Badge>
                      </div>
                      <p className="mt-3 text-sm text-muted-foreground">{requestStateMessage(selectedRequest.status)}</p>
                    </div>

                    <div className="space-y-4">
                      {timeline.map((item, index) => (
                        <div key={item.label} className="flex gap-3">
                          <div className="flex flex-col items-center">
                            <div
                              className={cn(
                                "flex h-9 w-9 items-center justify-center rounded-full border",
                                item.active ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background text-muted-foreground",
                              )}
                            >
                              {index === 0 ? <Clock3 className="h-4 w-4" /> : index === 1 ? <Users className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
                            </div>
                            {index < timeline.length - 1 ? <div className="mt-2 h-10 w-px bg-border" /> : null}
                          </div>
                          <div className="pb-4">
                            <p className="text-sm font-semibold text-foreground">{item.label}</p>
                            <p className="mt-1 text-sm text-muted-foreground">{item.text}</p>
                            <p className="mt-1 text-xs text-muted-foreground">{item.date}</p>
                          </div>
                        </div>
                      ))}
                    </div>

                    {selectedRequest.status === "interested" && selectedRequest.maids.length > 0 ? (
                      <div className="space-y-3">
                        <div>
                          <p className="text-sm font-semibold text-foreground">Suggested maids</p>
                          <p className="text-sm text-muted-foreground">These were shortlisted for your request.</p>
                        </div>
                        {selectedRequest.maids.map((maid) => (
                          <div key={maid.referenceCode} className="rounded-[24px] border bg-background p-4">
                            <p className="text-sm font-semibold text-foreground">{maid.fullName}</p>
                            <p className="mt-1 text-sm text-muted-foreground">
                              {maid.nationality} • {maid.referenceCode}
                            </p>
                          </div>
                        ))}
                      </div>
                    ) : null}

                    <div className="space-y-3">
                      <div>
                        <p className="text-sm font-semibold text-foreground">Request conversation</p>
                        <p className="text-sm text-muted-foreground">
                          Send updates and questions directly on this request.
                        </p>
                      </div>

                      <div
                        ref={chatScrollRef}
                        className="max-h-[360px] space-y-3 overflow-y-auto rounded-[24px] border bg-muted/20 p-4"
                      >
                        {messagesQuery.isLoading || conversationQuery.isLoading ? (
                          <div className="py-8 text-center text-sm text-muted-foreground">
                            Loading conversation...
                          </div>
                        ) : requestMessages.length === 0 ? (
                          <div className="py-8 text-center text-sm text-muted-foreground">
                            No messages yet.
                          </div>
                        ) : (
                          requestMessages.map(renderMessage)
                        )}
                      </div>

                      <div className="rounded-[24px] border bg-background p-3">
                        <Textarea
                          value={chatDraft}
                          onChange={(event) => setChatDraft(event.target.value)}
                          placeholder="Reply to the agency about this request..."
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
                            Messages are shown oldest to newest.
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
                              "Send message"
                            )}
                          </Button>
                        </div>
                      </div>
                    </div>

                    {selectedRequest.status === "rejected" ? (
                      <div className="rounded-[24px] border border-red-200 bg-red-50 p-4">
                        <p className="text-sm font-semibold text-red-700">Request closed</p>
                        <p className="mt-1 text-sm text-red-700/80">
                          You can retry with updated preferences whenever you are ready.
                        </p>
                        <Button
                          type="button"
                          variant="outline"
                          className="mt-4 rounded-full border-red-200 text-red-700 hover:bg-red-100 hover:text-red-700"
                          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
                        >
                          Retry with a new request
                        </Button>
                      </div>
                    ) : null}

                    {selectedRequest.status === "direct_hire" ? (
                      <div className="rounded-[24px] border border-emerald-200 bg-emerald-50 p-4">
                        <p className="text-sm font-semibold text-emerald-700">Success state</p>
                        <p className="mt-1 text-sm text-emerald-700/80">
                          Your request has progressed to a direct hire outcome. The agency will continue the next steps with you.
                        </p>
                      </div>
                    ) : null}
                  </>
                ) : (
                  <div className="rounded-[24px] border-dashed border p-8 text-center text-sm text-muted-foreground">
                    Pick a request from the left to see the status timeline and any maid suggestions.
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
};

export default ClientRequestsPage;
