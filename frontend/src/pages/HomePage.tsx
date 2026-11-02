import { useCallback, useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import { Link } from "react-router-dom";
import { CheckCircle2, CircleAlert, ClipboardList, FileText, History, MessageSquareText, RefreshCw, Users, UserRoundSearch } from "lucide-react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { adminPath } from "@/lib/routes";
import { getAgencyAdminAuthHeaders, getStoredAgencyAdmin } from "@/lib/agencyAdminAuth";
import { readSafeJson } from "@/lib/safeJson";
import AgencyOperationsCenterPage from "@/pages/AgencyOperationsCenterPage";
import "./home-dashboard.css";

type Maid = { createdAt?: string; status?: string; isPublic?: boolean };
type Applicant = { appliedAt?: string; status?: string; source?: string };
type Enquiry = { createdAt?: string; status?: string };
type Employer = { createdAt?: string; updatedAt?: string };
type RequestCounts = { pending: number; interested: number; direct_hire: number; rejected: number };
type MetricData = { maids: Maid[]; maidCount: number; applicants: Applicant[]; applicantCount: number; enquiries: Enquiry[]; enquiryCount: number; contracts: Employer[]; requests: RequestCounts };
type ListPage<T> = { items: T[]; total: number };
type PortalAction = { id: string; actor: string; created_at: string; status: "completed" | "failed"; payload: { actionLabel?: string } };

const links = {
  maids: adminPath("/edit-maids"), contracts: adminPath("/employment-contracts"),
  enquiries: adminPath("/enquiry"), applicants: adminPath("/recruitment"), requests: adminPath("/requests"),
};
// Built per request so a rotated/renewed admin token is always sent. A
// module-level snapshot of the headers would go stale after re-login.
const apiRequestInit = (): RequestInit => ({
  headers: { ...getAgencyAdminAuthHeaders() },
  cache: "no-store",
});

// Reads a paginated list endpoint. The headline card totals come from the API's
// own `total` (the size of the whole collection), not the length of the single
// page we fetch — so a capped page can never undercount the dashboard tiles.
async function getList<T>(url: string, key: string): Promise<ListPage<T>> {
  const response = await fetch(url, apiRequestInit());
  const data = await readSafeJson<Record<string, unknown>>(response);
  if (!response.ok) throw new Error(String(data.error || `Could not load ${key}`));
  const items = Array.isArray(data[key]) ? data[key] as T[] : [];
  const total = typeof data.total === "number" ? data.total : items.length;
  return { items, total };
}

async function getAllApplicants(): Promise<ListPage<Applicant>> {
  const loadPage = async (page: number) => {
    const response = await fetch(`/api/ats/applications?page=${page}&pageSize=100`, apiRequestInit());
    const payload = await readSafeJson<{ data?: Applicant[]; pageInfo?: { total?: number; totalPages?: number }; error?: string }>(response);
    if (!response.ok) throw new Error(payload.error || "Could not load applicants");
    return payload;
  };
  const first = await loadPage(1);
  const totalPages = Math.max(1, Number(first.pageInfo?.totalPages || 1));
  const remaining = await Promise.all(Array.from({ length: totalPages - 1 }, (_, index) => loadPage(index + 2)));
  const items = [ ...(first.data || []), ...remaining.flatMap((page) => page.data || []) ]
    .filter((applicant) => applicant.source !== "synced_from_maid");
  return {
    items,
    total: items.length,
  };
}

async function getRequestCounts(): Promise<RequestCounts> {
  const response = await fetch("/api/requests/status-counts", apiRequestInit());
  const data = await readSafeJson<RequestCounts & { error?: string }>(response);
  if (!response.ok) throw new Error(data.error || "Could not load request counts");
  return data;
}

const monthKey = (date?: string) => {
  if (!date) return "";
  const parsed = new Date(date);
  return Number.isNaN(parsed.getTime()) ? "" : `${parsed.getFullYear()}-${parsed.getMonth()}`;
};

const HomePage = () => {
  const [data, setData] = useState<MetricData>({ maids: [], maidCount: 0, applicants: [], applicantCount: 0, enquiries: [], enquiryCount: 0, contracts: [], requests: { pending: 0, interested: 0, direct_hire: 0, rejected: 0 } });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [failed, setFailed] = useState<Set<number>>(() => new Set());
  const [syncedAt, setSyncedAt] = useState<Date | null>(null);
  const [portalActions, setPortalActions] = useState<PortalAction[]>([]);
  const [portalActionsUnavailable, setPortalActionsUnavailable] = useState(false);
  const [portalActionsRefreshing, setPortalActionsRefreshing] = useState(false);
  const admin = getStoredAgencyAdmin();

  const refresh = useCallback(async (quiet = false) => {
    if (quiet) setRefreshing(true); else setLoading(true);
    const results = await Promise.allSettled([
      getList<Maid>("/api/maids?visibility=all&page=1&pageSize=500&noPhotos=1", "maids"),
      getAllApplicants(),
      getList<Enquiry>("/api/enquiries?pageSize=500", "enquiries"),
      getList<Employer>("/api/employers", "employers"),
      getRequestCounts(),
    ]);
    const nextErrors: string[] = [];
    const failedIndexes: number[] = [];
    const value = <T,>(index: number, fallback: T): T => {
      const result = results[index];
      if (result.status === "fulfilled") return result.value as T;
      failedIndexes.push(index);
      nextErrors.push(result.reason instanceof Error ? result.reason.message : "Some dashboard data is unavailable");
      return fallback;
    };
    const maidsResult = value(0, { items: [] as Maid[], total: 0 });
    const applicantResult = value(1, { items: [] as Applicant[], total: 0 });
    const enquiriesResult = value(2, { items: [] as Enquiry[], total: 0 });
    const contractsResult = value(3, { items: [] as Employer[], total: 0 });
    setData({ maids: maidsResult.items, maidCount: maidsResult.total, applicants: applicantResult.items, applicantCount: applicantResult.total, enquiries: enquiriesResult.items, enquiryCount: enquiriesResult.total, contracts: contractsResult.items, requests: value(4, { pending: 0, interested: 0, direct_hire: 0, rejected: 0 }) });
    setErrors(nextErrors);
    setFailed(new Set(failedIndexes));
    setSyncedAt(new Date());
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);
  const refreshPortalActions = useCallback(async () => {
    setPortalActionsRefreshing(true);
    try {
      const response = await fetch("/api/dashboard/actions", apiRequestInit());
      const payload = await readSafeJson<{ actions?: PortalAction[]; trackingAvailable?: boolean; error?: string }>(response);
      if (!response.ok) throw new Error(payload.error || "Could not load portal actions");
      setPortalActions((payload.actions || []).filter((action) => Boolean(action.payload?.actionLabel)));
      setPortalActionsUnavailable(payload.trackingAvailable === false);
    } catch {
      setPortalActionsUnavailable(true);
    } finally {
      setPortalActionsRefreshing(false);
    }
  }, []);
  useEffect(() => { void refreshPortalActions(); }, [refreshPortalActions]);

  const chartData = useMemo(() => {
    const months = Array.from({ length: 6 }, (_, index) => {
      const date = new Date(); date.setDate(1); date.setMonth(date.getMonth() - (5 - index));
      return { key: `${date.getFullYear()}-${date.getMonth()}`, month: date.toLocaleDateString([], { month: "short" }), "Public Maids": 0, "Hidden Maids": 0, Applicants: 0, Enquiries: 0, Contracts: 0 };
    });
    data.maids.forEach((maid) => {
      const point = months.find((month) => month.key === monthKey(maid.createdAt));
      if (point) point[maid.isPublic ? "Public Maids" : "Hidden Maids"] += 1;
    });
    const groups = [["applicants", "Applicants"], ["enquiries", "Enquiries"], ["contracts", "Contracts"]] as const;
    groups.forEach(([field, label]) => {
      const records: Array<{ createdAt?: string; appliedAt?: string }> = data[field];
      records.forEach((item) => {
        const point = months.find((month) => month.key === monthKey(item.appliedAt ?? item.createdAt));
        if (point) point[label] += 1;
      });
    });
    return months;
  }, [data]);

  const hasChartData = chartData.some((month) => month["Public Maids"] + month["Hidden Maids"] + month.Applicants + month.Enquiries + month.Contracts > 0);
  // Chart sources are indexes 0..3 (maids, applicants, enquiries, contracts).
  const chartFailed = failed.has(0) || failed.has(1) || failed.has(2) || failed.has(3);

  const cards = [
    { index: 0, title: "Maid profiles", value: data.maidCount, note: `${data.maids.filter((maid) => maid.isPublic).length} visible to clients`, icon: Users, color: "#0F766E", surface: "#CCFBF1", href: links.maids },
    { index: 3, title: "Employment contracts", value: data.contracts.length, note: "Employer records", icon: FileText, color: "#0E7490", surface: "#CFFAFE", href: links.contracts },
    { index: 2, title: "Enquiries", value: data.enquiryCount, note: `${data.enquiries.filter((item) => !["resolved", "replied"].includes((item.status || "new").toLowerCase())).length} need follow-up`, icon: MessageSquareText, color: "#0284C7", surface: "#E0F2FE", href: links.enquiries },
    { index: 1, title: "Applicants", value: data.applicantCount, note: `${data.applicants.filter((item) => ["new applicant", "documents submitted"].includes((item.status || "").toLowerCase())).length} new or awaiting documents`, icon: UserRoundSearch, color: "#2563EB", surface: "#DBEAFE", href: links.applicants },
    { index: 4, title: "Requests", value: Object.values(data.requests).reduce((total, count) => total + count, 0), note: `${data.requests.pending} awaiting review`, icon: ClipboardList, color: "#155E75", surface: "#CFFAFE", href: links.requests },
  ];
  // The trend lines differ by stroke pattern, not colour alone, so
  // colour-blind users can still tell them apart.
  const series: Array<[string, string, string]> = [["Public Maids", "#0F766E", ""], ["Hidden Maids", "#14B8A6", "5 3"], ["Contracts", "#0891B2", "6 4"], ["Enquiries", "#2563EB", "2 3"], ["Applicants", "#4F46E5", "8 4 2 4"]];
  const fillId: Record<string, string> = { "Public Maids": "public-maids", "Hidden Maids": "hidden-maids", Contracts: "contracts", Enquiries: "enquiries", Applicants: "applicants" };
  // Screen-reader description for the chart (a colour-only graphic otherwise).
  const chartSummary = series
    .map(([label]) => {
      const key = label as "Public Maids" | "Hidden Maids" | "Contracts" | "Enquiries" | "Applicants";
      return `${label} ${chartData.reduce((sum, month) => sum + month[key], 0)}`;
    })
    .join(", ");
  return <main className="admin-dashboard">
    <header className="dash-head"><div><p className="dash-kicker">Agency overview</p><h1>Good day{admin?.agencyName ? `, ${admin.agencyName}` : ""}</h1><p>Your agency at a glance. Updated {syncedAt ? syncedAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "when data loads"}.</p></div><button className="dash-refresh" onClick={() => void refresh(true)} disabled={refreshing}><RefreshCw size={15} className={refreshing ? "animate-spin" : ""}/>{refreshing ? "Refreshing" : "Refresh data"}</button></header>
    {errors.length > 0 && <div className="dash-error" role="alert">Some figures could not be loaded. {Array.from(new Set(errors)).join(" · ")}</div>}
    <section className="dash-grid" aria-label="Agency analytics">
      {cards.map((card) => <Link key={card.title} to={card.href} className="dash-card" style={{textDecoration:"none",color:"inherit","--card-accent":card.color,"--card-surface":card.surface} as CSSProperties}><div className="dash-card-top"><span className="dash-icon" style={{background:card.surface,color:card.color}}><card.icon size={20}/></span><span className="dash-card-label">{card.title}</span></div>{loading ? <div className="dash-value-loading" aria-hidden /> : <div className="dash-value">{failed.has(card.index) ? "—" : card.value.toLocaleString()}</div>}<div className="dash-note">{card.note}</div></Link>)}
    </section>
    <section className="dash-portal-actions" aria-labelledby="dash-portal-actions-title">
      <div className="dash-portal-actions-head"><div><p className="dash-kicker"><History size={14}/> Staff activity</p><h2 id="dash-portal-actions-title">Recent portal actions</h2><p>See what staff changed in applicant, maid, enquiry, and placement records.</p></div><button type="button" className="dash-automation-refresh" onClick={() => void refreshPortalActions()} disabled={portalActionsRefreshing}><RefreshCw size={15} className={portalActionsRefreshing ? "animate-spin" : ""}/>{portalActionsRefreshing ? "Refreshing" : "Refresh actions"}</button></div>
      {portalActionsUnavailable ? <p className="dash-automation-empty" role="alert">Portal action history is currently unavailable. Refresh to try again.</p> : portalActions.length === 0 ? <p className="dash-automation-empty">No staff actions are recorded yet. Adding or updating a maid, reviewing applicants, and managing enquiries will appear here.</p> : <ol className="dash-portal-actions-list">{portalActions.map((action) => <li key={action.id}><span className={`dash-action-result ${action.status === "completed" ? "is-complete" : "is-failed"}`}>{action.status === "completed" ? <CheckCircle2 size={14}/> : <CircleAlert size={14}/>} {action.status === "completed" ? "Completed" : "Failed"}</span><span className="dash-action-description"><strong>{action.payload.actionLabel}</strong><span>By {action.actor.replace(/^user:/, "") || "agency staff"}</span></span><time dateTime={action.created_at}>{new Date(action.created_at).toLocaleString()}</time></li>)}</ol>}
    </section>
    <section className="dash-content">
      <article className="dash-panel dash-activity-panel"><div className="dash-panel-head"><div><h2>Agency activity</h2><p className="dash-panel-sub">Public and hidden maid profiles, plus other records added over the last six months</p></div><div className="dash-legend">{series.map(([label,color])=><span key={label}><i className="dash-dot" style={{background:color}}/>{label}</span>)}</div></div>{!loading && !hasChartData ? <div className="dash-empty">{chartFailed ? "Activity data could not be loaded. Use Refresh data to try again." : "No records added in the last six months yet. New maids, contracts, enquiries and applicants will show up here."}</div> : <div className="dash-chart" role="img" aria-label={`Agency activity over the last six months — ${chartSummary}`}><ResponsiveContainer width="100%" height="100%"><AreaChart data={chartData} margin={{top:8,right:8,left:-22,bottom:0}}><defs>{series.map(([label,color])=>{const id=fillId[label];return <linearGradient key={id} id={`fill-${id}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={color} stopOpacity={.18}/><stop offset="90%" stopColor={color} stopOpacity={0}/></linearGradient>;})}</defs><CartesianGrid stroke="#cbd5e1" vertical={false}/><XAxis dataKey="month" tickLine={false} axisLine={false} tick={{fontSize:16,fill:"#000"}}/><YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={{fontSize:16,fill:"#000"}}/><Tooltip contentStyle={{borderRadius:12,border:"1px solid #d1d5db",fontSize:16,color:"#000"}}/>{series.map(([label,color,dash])=><Area key={label} type="monotone" dataKey={label} stroke={color} fill={`url(#fill-${fillId[label]})`} strokeWidth={3} strokeDasharray={dash || undefined}/>)}</AreaChart></ResponsiveContainer></div>}</article>
    </section>
    <section className="dash-full-operations" aria-label="Full operations workspace">
      <AgencyOperationsCenterPage embedded />
    </section>
  </main>;
};

export default HomePage;
