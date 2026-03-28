import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, BriefcaseBusiness, Clock3, MessageCircle } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { clearClientAuth, getClientAuthHeaders, getClientToken } from "@/lib/clientAuth";
import type { MaidProfile } from "@/lib/maids";
import { toast } from "@/components/ui/sonner";
import "./ClientTheme.css";

interface HistoryItem {
  directSale: {
    id: number;
    maidReferenceCode: string;
    maidName: string;
    status: string;
    createdAt: string;
    requestDetails?: Record<string, string>;
  };
  maid: MaidProfile | null;
}

const getStatusBadge = (status: string) => {
  if (status === "direct_hire" || status === "accepted") return "border-emerald-200 bg-emerald-100 text-emerald-700";
  if (status === "rejected" || status === "declined") return "border-rose-200 bg-rose-100 text-rose-700";
  return "border-amber-200 bg-amber-100 text-amber-700";
};

const getStatusLabel = (status: string) => {
  if (status === "direct_hire") return "Accepted";
  if (status === "rejected") return "Declined";
  if (status === "interested") return "Interested";
  return "Pending";
};

const ClientHistoryPage = () => {
  const navigate = useNavigate();
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const token = getClientToken();
    if (!token) {
      navigate("/employer-login");
      return;
    }

    const loadHistory = async () => {
      try {
        setIsLoading(true);
        const response = await fetch("/api/client/history", {
          headers: { ...getClientAuthHeaders() },
        });
        const data = (await response.json().catch(() => ({}))) as {
          history?: HistoryItem[];
          error?: string;
        };

        if (response.status === 401) {
          clearClientAuth();
          navigate("/employer-login");
          return;
        }

        if (!response.ok || !data.history) {
          throw new Error(data.error || "Failed to load transaction history");
        }

        setHistory(data.history);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to load transaction history");
      } finally {
        setIsLoading(false);
      }
    };

    void loadHistory();
  }, [navigate]);

  const filteredHistory = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return history;

    return history.filter((item) =>
      [item.directSale.maidName, item.directSale.maidReferenceCode, item.directSale.status, Object.values(item.directSale.requestDetails || {}).join(" ")]
        .join(" ")
        .toLowerCase()
        .includes(term),
    );
  }, [history, search]);

  return (
    <div className="client-page-theme min-h-screen bg-[linear-gradient(180deg,hsl(var(--background))_0%,hsl(var(--muted))_100%)]">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-8 sm:px-6">
        <Link to="/client/dashboard" className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground">
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </Link>

        <Card className="rounded-[28px] border bg-card shadow-sm">
          <CardContent className="p-6 sm:p-7">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">History</p>
                <h1 className="font-display text-3xl font-bold text-foreground">Transaction history</h1>
                <p className="mt-1 text-sm text-muted-foreground">Track every maid request, decision, and submitted requirement in one place.</p>
              </div>
              <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search maid, status, or request details" className="sm:max-w-sm" />
            </div>
          </CardContent>
        </Card>

        {isLoading ? (
          <Card className="rounded-[28px] border bg-card shadow-sm">
            <CardContent className="p-10 text-center text-muted-foreground">Loading history...</CardContent>
          </Card>
        ) : filteredHistory.length === 0 ? (
          <Card className="rounded-[28px] border bg-card shadow-sm">
            <CardContent className="p-10 text-center">
              <p className="font-display text-2xl font-semibold text-foreground">No transaction history yet</p>
              <p className="mt-2 text-sm text-muted-foreground">Your request and assignment activity will appear here once you start interacting with agencies.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredHistory.map((item) => (
              <Card key={item.directSale.id} className="rounded-[28px] border bg-card shadow-sm">
                <CardContent className="p-5 sm:p-6">
                  <div className="flex flex-col gap-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Transaction #{item.directSale.id}</p>
                        <h2 className="mt-1 font-display text-2xl font-bold text-foreground">{item.directSale.maidName}</h2>
                        <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{item.directSale.maidReferenceCode}</p>
                      </div>
                      <Badge className={`rounded-full border px-3 py-1 text-xs font-semibold ${getStatusBadge(item.directSale.status)}`}>
                        {getStatusLabel(item.directSale.status)}
                      </Badge>
                    </div>

                    <div className="grid gap-3 text-sm text-foreground sm:grid-cols-2">
                      <p className="flex items-center gap-2">
                        <Clock3 className="h-4 w-4 text-primary" />
                        {new Date(item.directSale.createdAt).toLocaleString()}
                      </p>
                      <p className="flex items-center gap-2">
                        <BriefcaseBusiness className="h-4 w-4 text-primary" />
                        {item.maid?.status || "Status unavailable"}
                      </p>
                    </div>

                    {item.directSale.requestDetails && Object.keys(item.directSale.requestDetails).length > 0 ? (
                      <div className="rounded-[22px] bg-muted/45 p-4">
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Submitted Request Details</p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          {Object.entries(item.directSale.requestDetails).map(([key, value]) => (
                            <Badge key={key} variant="outline" className="rounded-full">
                              {key}: {String(value)}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    ) : null}

                    <div className="flex flex-col gap-3 sm:flex-row">
                      {item.maid ? (
                        <Button asChild className="w-full rounded-2xl sm:w-auto">
                          <Link to={`/maids/${encodeURIComponent(item.directSale.maidReferenceCode)}`}>View Maid</Link>
                        </Button>
                      ) : null}
                      <Button asChild variant="outline" className="w-full rounded-2xl sm:w-auto">
                        <Link to="/client/support-chat">
                          <MessageCircle className="mr-2 h-4 w-4" />
                          Open Messages
                        </Link>
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ClientHistoryPage;
