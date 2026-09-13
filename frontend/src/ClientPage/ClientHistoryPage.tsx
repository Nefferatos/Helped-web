import { useEffect, useMemo, useState } from "react";
import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { ArrowLeft, BriefcaseBusiness, Clock3, MessageCircle, Package, Compass, Search } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { clearClientAuth, getClientAuthHeaders, getClientToken, getStoredClient } from "@/lib/clientAuth";
import type { MaidProfile } from "@/lib/maids";
import { fetchRequests, type RequestRecord, type RequestListResponse } from "@/lib/requests";
import { ProgressTimeline, StatusSummary, RequestSummary } from "@/components/RequestProgressTracker";
import { toast } from "@/components/ui/sonner";
import "./ClientTheme.css";

interface HistoryItem {
  directSale: { id: number; maidReferenceCode: string; maidName: string; status: string; createdAt: string; requestDetails?: Record<string, string>; };
  maid: MaidProfile | null;
}

const getStatusBadge = (s: string) => {
  if (s === "direct_hire" || s === "accepted") return "border-emerald-200 bg-emerald-100 text-emerald-700";
  if (s === "rejected" || s === "declined") return "border-rose-200 bg-rose-100 text-rose-700";
  return "border-amber-200 bg-amber-100 text-amber-700";
};
const getStatusLabel = (s: string) => {
  if (s === "direct_hire") return "Accepted";
  if (s === "rejected") return "Declined";
  if (s === "interested") return "Match Found";
  if (s === "pending") return "Under Review";
  return "Pending";
};

type Tab = "transactions" | "track";
const TABS: { key: Tab; label: string; icon: typeof Package }[] = [
  { key: "track", label: "Track Progress", icon: Compass },
  { key: "transactions", label: "Transactions", icon: Package },
];

function TrackTab({ requests, requestsQuery, selectedRequestId, setSelectedRequestId, selectedRequest }: {
  requests: RequestRecord[];
  requestsQuery: UseQueryResult<RequestListResponse, Error>;
  selectedRequestId: string | null;
  setSelectedRequestId: (id: string | null) => void;
  selectedRequest: RequestRecord | null;
}) {
  return (
    <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
      <div className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Active Requests ({requests.length})</p>
        {requestsQuery.isLoading ? (
          <div className="space-y-3">{[1, 2].map((i) => <div key={i} className="h-24 animate-pulse rounded-2xl bg-muted" />)}</div>
        ) : requests.length === 0 ? (
          <Card className="rounded-2xl border-dashed">
            <CardContent className="flex flex-col items-center gap-3 p-8 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10"><Compass className="h-6 w-6 text-primary" /></div>
              <p className="font-display text-lg font-bold text-foreground">No Requests Yet</p>
              <p className="text-sm text-muted-foreground">When you request a maid, you will be able to track the progress here.</p>
              <Button asChild className="mt-2 rounded-2xl"><Link to="/client/maids">Find a Maid</Link></Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">{requests.map((req) => (
            <RequestSummary key={req.id} request={req} isSelected={selectedRequestId === req.id} onSelect={() => setSelectedRequestId(req.id)} />
          ))}</div>
        )}
      </div>
      <div>
        {selectedRequest ? (
          <Card className="rounded-2xl border shadow-sm">
            <CardContent className="p-6 space-y-6">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Request #{String(selectedRequest.id).slice(-4).toUpperCase()}</p>
                <h2 className="mt-1 font-display text-xl font-bold text-foreground">{selectedRequest.type === "direct" ? "Direct Maid Request" : "General Maid Request"}</h2>
              </div>
              <StatusSummary request={selectedRequest} />
              <div>
                <p className="mb-4 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Progress</p>
                <ProgressTimeline request={selectedRequest} />
              </div>
              {selectedRequest.maids.length > 0 && (
                <div>
                  <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                    {selectedRequest.type === "direct" ? "Requested Maid" : "Recommended Maids"}
                  </p>
                  <div className="space-y-2">
                    {selectedRequest.maids.map((maid) => (
                      <Link key={maid.referenceCode} to={`/maids/${encodeURIComponent(maid.referenceCode)}`} className="flex items-center gap-3 rounded-xl border p-3 transition-colors hover:bg-muted/50">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-sm font-bold text-primary">{maid.fullName?.charAt(0) || "?"}</div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-foreground truncate">{maid.fullName}</p>
                          <p className="text-xs text-muted-foreground">{maid.nationality} · {maid.type || "Maid"}</p>
                        </div>
                        <Badge variant="outline" className="rounded-full text-[10px]">{maid.status || "available"}</Badge>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
              <div className="flex flex-col gap-3 sm:flex-row pt-2">
                <Button asChild className="rounded-2xl"><Link to="/client/support-chat"><MessageCircle className="mr-2 h-4 w-4" /> Contact Agency</Link></Button>
                <Button asChild variant="outline" className="rounded-2xl"><Link to="/client/maids">Find More Maids</Link></Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="rounded-2xl border-dashed">
            <CardContent className="flex flex-col items-center gap-3 p-12 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted"><Search className="h-6 w-6 text-muted-foreground" /></div>
              <p className="font-display text-lg font-bold text-foreground">Select a Request</p>
              <p className="text-sm text-muted-foreground">Choose a request from the list to see its progress and details.</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

function TransactionsTab({ history, search, setSearch, isLoading }: {
  history: HistoryItem[]; search: string; setSearch: (s: string) => void; isLoading: boolean;
}) {
  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="Search transactions..." value={search} onChange={(e) => setSearch(e.target.value)} className="rounded-2xl pl-9" />
      </div>
      {isLoading ? (
        <div className="space-y-4">{[1, 2, 3].map((i) => <div key={i} className="h-32 animate-pulse rounded-[28px] bg-muted" />)}</div>
      ) : history.length === 0 ? (
        <Card className="rounded-[28px] border-dashed">
          <CardContent className="flex flex-col items-center gap-3 p-8 text-center">
            <BriefcaseBusiness className="h-8 w-8 text-muted-foreground/50" />
            <p className="font-display text-lg font-bold text-foreground">No Transactions Yet</p>
            <p className="text-sm text-muted-foreground">Your transaction and assignment activity will appear here once you start interacting with agencies.</p>
          </CardContent>
        </Card>
      ) : (
        history.map((item) => (
          <Card key={item.directSale.id} className="rounded-[28px] border bg-card shadow-sm">
            <CardContent className="p-5 sm:p-6">
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Transaction #{item.directSale.id}</p>
                    <h2 className="mt-1 font-display text-2xl font-bold text-foreground">{item.directSale.maidName}</h2>
                    <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{item.directSale.maidReferenceCode}</p>
                  </div>
                  <Badge className={`rounded-full border px-3 py-1 text-xs font-semibold ${getStatusBadge(item.directSale.status)}`}>{getStatusLabel(item.directSale.status)}</Badge>
                </div>
                <div className="grid gap-3 text-sm text-foreground sm:grid-cols-2">
                  <p className="flex items-center gap-2"><Clock3 className="h-4 w-4 text-primary" />{new Date(item.directSale.createdAt).toLocaleString()}</p>
                  <p className="flex items-center gap-2"><BriefcaseBusiness className="h-4 w-4 text-primary" />{item.maid?.status || "Status unavailable"}</p>
                </div>
                {item.directSale.requestDetails && Object.keys(item.directSale.requestDetails).length > 0 && (
                  <div className="rounded-[22px] bg-muted/45 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Submitted Request Details</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {Object.entries(item.directSale.requestDetails).map(([key, value]) => (
                        <Badge key={key} variant="outline" className="rounded-full">{key}: {String(value)}</Badge>
                      ))}
                    </div>
                  </div>
                )}
                <div className="flex flex-col gap-3 sm:flex-row">
                  {item.maid && <Button asChild className="w-full rounded-2xl sm:w-auto"><Link to={`/maids/${encodeURIComponent(item.directSale.maidReferenceCode)}`}>View Maid</Link></Button>}
                  <Button asChild variant="outline" className="w-full rounded-2xl sm:w-auto"><Link to="/client/support-chat"><MessageCircle className="mr-2 h-4 w-4" /> Open Messages</Link></Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}

const ClientHistoryPage = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<Tab>("track");
  const storedClient = useMemo(() => getStoredClient(), []);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const token = getClientToken();
    if (!token) { navigate("/employer-login"); return; }
    const loadHistory = async () => {
      try {
        setIsLoading(true);
        const response = await fetch("/api/client/history", { headers: { ...getClientAuthHeaders() } });
        const data = (await response.json().catch(() => ({}))) as { history?: HistoryItem[]; error?: string };
        if (response.status === 401) { clearClientAuth(); navigate("/employer-login"); return; }
        if (!response.ok || !data.history) throw new Error(data.error || "Failed to load transaction history");
        setHistory(data.history);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to load transaction history");
      } finally { setIsLoading(false); }
    };
    void loadHistory();
  }, [navigate]);

  const filteredHistory = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return history;
    return history.filter((item) =>
      [item.directSale.maidName, item.directSale.maidReferenceCode, item.directSale.status, Object.values(item.directSale.requestDetails || {}).join(" ")]
        .join(" ").toLowerCase().includes(term),
    );
  }, [history, search]);

  const requestsQuery = useQuery({
    queryKey: ["client-requests-history", storedClient?.id],
    enabled: typeof storedClient?.id === "number",
    queryFn: () => fetchRequests({ clientId: storedClient?.id, page: 1, pageSize: 20 }),
    refetchInterval: 10000,
  });
  const requests = requestsQuery.data?.data ?? [];
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);
  const selectedRequest = requests.find((r) => r.id === selectedRequestId) ?? null;

  return (
    <div className="client-page-theme min-h-screen bg-[linear-gradient(180deg,hsl(var(--background))_0%,hsl(var(--muted))_100%)]">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8 sm:px-6">
        <Link to="/client/home" className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Back to Home
        </Link>
        <div>
          <h1 className="font-display text-3xl font-bold text-foreground">Activity &amp; Tracking</h1>
          <p className="mt-1 text-sm text-muted-foreground">Track your requests and view transaction history.</p>
        </div>
        <div className="flex gap-2 rounded-2xl border bg-card p-1.5 shadow-sm">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.key;
            return (
              <button key={tab.key} type="button" onClick={() => setActiveTab(tab.key)}
                className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition-all ${isActive ? "bg-primary text-primary-foreground shadow-md" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}>
                <Icon className="h-4 w-4" /> {tab.label}
              </button>
            );
          })}
        </div>
        {activeTab === "track" && <TrackTab requests={requests} requestsQuery={requestsQuery} selectedRequestId={selectedRequestId} setSelectedRequestId={setSelectedRequestId} selectedRequest={selectedRequest} />}
        {activeTab === "transactions" && <TransactionsTab history={filteredHistory} search={search} setSearch={setSearch} isLoading={isLoading} />}
      </div>
    </div>
  );
};

export default ClientHistoryPage;

