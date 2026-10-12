import { useCallback, useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import { Link } from "react-router-dom";
import { ClipboardList, FileText, MessageSquareText, RefreshCw, Users, UserRoundSearch } from "lucide-react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { adminPath } from "@/lib/routes";
import { getAgencyAdminAuthHeaders, getStoredAgencyAdmin } from "@/lib/agencyAdminAuth";
import { readSafeJson } from "@/lib/safeJson";
import AgencyOperationsCenterPage from "@/pages/AgencyOperationsCenterPage";

type Maid = { createdAt?: string; status?: string; isPublic?: boolean };
type Applicant = { appliedAt?: string; status?: string; source?: string };
type Enquiry = { createdAt?: string; status?: string };
type Employer = { createdAt?: string; updatedAt?: string };
type RequestCounts = { pending: number; interested: number; direct_hire: number; rejected: number };
type MetricData = { maids: Maid[]; applicants: Applicant[]; applicantCount: number; enquiries: Enquiry[]; contracts: Employer[]; requests: RequestCounts };

const links = {
  maids: adminPath("/edit-maids"), contracts: adminPath("/employment-contracts"),
  enquiries: adminPath("/enquiry"), applicants: adminPath("/recruitment"), requests: adminPath("/requests"),
};
const auth = { headers: { ...getAgencyAdminAuthHeaders() }, cache: "no-store" as RequestCache };

async function getList<T>(url: string, key: string): Promise<T[]> {
  const response = await fetch(url, auth);
  const data = await readSafeJson<Record<string, unknown>>(response);
  if (!response.ok) throw new Error(String(data.error || `Could not load ${key}`));
  return Array.isArray(data[key]) ? data[key] as T[] : [];
}

async function getAllApplicants(): Promise<{ items: Applicant[]; total: number }> {
  const loadPage = async (page: number) => {
    const response = await fetch(`/api/ats/applications?page=${page}&pageSize=100`, auth);
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
  const response = await fetch("/api/requests/status-counts", auth);
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
  const [data, setData] = useState<MetricData>({ maids: [], applicants: [], applicantCount: 0, enquiries: [], contracts: [], requests: { pending: 0, interested: 0, direct_hire: 0, rejected: 0 } });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [syncedAt, setSyncedAt] = useState<Date | null>(null);
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
    const value = <T,>(index: number, fallback: T): T => {
      const result = results[index];
      if (result.status === "fulfilled") return result.value as T;
      nextErrors.push(result.reason instanceof Error ? result.reason.message : "Some dashboard data is unavailable");
      return fallback;
    };
    const applicantResult = value(1, { items: [] as Applicant[], total: 0 });
    setData({ maids: value(0, []), applicants: applicantResult.items, applicantCount: applicantResult.total, enquiries: value(2, []), contracts: value(3, []), requests: value(4, { pending: 0, interested: 0, direct_hire: 0, rejected: 0 }) });
    setErrors(nextErrors);
    setSyncedAt(new Date());
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);

  const chartData = useMemo(() => {
    const months = Array.from({ length: 6 }, (_, index) => {
      const date = new Date(); date.setDate(1); date.setMonth(date.getMonth() - (5 - index));
      return { key: `${date.getFullYear()}-${date.getMonth()}`, month: date.toLocaleDateString([], { month: "short" }), Maids: 0, Applicants: 0, Enquiries: 0, Contracts: 0 };
    });
    const groups: Array<[keyof MetricData, string]> = [["maids", "Maids"], ["applicants", "Applicants"], ["enquiries", "Enquiries"], ["contracts", "Contracts"]];
    groups.forEach(([field, label]) => data[field].forEach((item) => {
      const date = "appliedAt" in item ? item.appliedAt : "createdAt" in item ? item.createdAt : undefined;
      const point = months.find((month) => month.key === monthKey(date));
      if (point) point[label as "Maids" | "Applicants" | "Enquiries" | "Contracts"] += 1;
    }));
    return months;
  }, [data]);

  const cards = [
    { title: "Maid profiles", value: data.maids.length, note: `${data.maids.filter((maid) => maid.isPublic).length} visible to clients`, icon: Users, color: "#087F5B", surface: "#E8F8F1", href: links.maids },
    { title: "Employment contracts", value: data.contracts.length, note: "Employer records", icon: FileText, color: "#1D4ED8", surface: "#EAF1FF", href: links.contracts },
    { title: "Enquiries", value: data.enquiries.length, note: `${data.enquiries.filter((item) => !["resolved", "replied"].includes((item.status || "new").toLowerCase())).length} need follow-up`, icon: MessageSquareText, color: "#C2410C", surface: "#FFF2E4", href: links.enquiries },
    { title: "Applicants", value: data.applicantCount, note: `${data.applicants.filter((item) => ["new applicant", "documents submitted"].includes((item.status || "").toLowerCase())).length} new or awaiting documents`, icon: UserRoundSearch, color: "#6D28D9", surface: "#F2ECFF", href: links.applicants },
    { title: "Requests", value: Object.values(data.requests).reduce((total, count) => total + count, 0), note: `${data.requests.pending} awaiting review`, icon: ClipboardList, color: "#0369A1", surface: "#E0F2FE", href: links.requests },
  ];
  return <main className="admin-dashboard">
    <style>{`
      .admin-dashboard{--line:#e5e7eb;color:#000;padding:30px clamp(18px,3vw,42px) 44px;max-width:1580px;margin:0 auto;font-family:inherit;font-size:16px}
      .admin-dashboard *{box-sizing:border-box}
      .dash-head{display:flex;justify-content:space-between;align-items:flex-end;gap:20px;margin-bottom:26px;padding-bottom:20px;border-bottom:4px solid transparent;border-image:linear-gradient(90deg,#10b981 0%,#3b82f6 34%,#f59e0b 67%,#a855f7 100%) 1;color:#000}
      .dash-kicker{font-size:16px;letter-spacing:.12em;text-transform:uppercase;font-weight:800;color:#000;margin:0 0 8px}
      .dash-head h1{font-size:34px;letter-spacing:-.04em;margin:0;font-weight:800;color:#000;line-height:1.15}
      .dash-head p:last-child{margin:9px 0 0;color:#000;font-size:16px}
      .dash-refresh{border:1px solid var(--line);background:#fff;border-radius:12px;padding:12px 16px;display:flex;gap:9px;align-items:center;font-size:16px;font-weight:700;color:#000;cursor:pointer;box-shadow:0 3px 12px rgba(15,23,42,.04);transition:background .15s,transform .15s}
      .dash-refresh:hover{background:#f8fafc;transform:translateY(-1px)}
      .dash-refresh:disabled{opacity:.65;cursor:wait}
      .dash-grid{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:16px}
      .dash-card,.dash-panel{background:#fff;border:1px solid var(--line);border-radius:18px;box-shadow:0 4px 18px rgba(15,23,42,.045)}
      .dash-card{position:relative;overflow:hidden;padding:22px 22px 20px;border-top:4px solid var(--card-accent);background:linear-gradient(145deg,var(--card-surface),#fff 78%);transition:transform .18s,box-shadow .18s,border-color .18s}
      .dash-card::after{content:"";position:absolute;width:116px;height:116px;border-radius:50%;right:-42px;bottom:-58px;background:var(--card-accent);opacity:.08;pointer-events:none}
      .dash-card:hover{transform:translateY(-3px);box-shadow:0 12px 26px rgba(15,23,42,.1);border-color:var(--card-accent)}
      .dash-card-top{display:flex;align-items:center;justify-content:space-between;gap:14px}
      .dash-icon{width:48px;height:48px;border-radius:15px;display:grid;place-items:center;flex:none;box-shadow:0 5px 12px color-mix(in srgb,var(--card-accent) 18%,transparent)}
      .dash-card-label{font-size:16px;color:#000;font-weight:700;line-height:1.35}
      .dash-value{font-size:36px;color:#000;font-weight:800;letter-spacing:-.04em;margin:19px 0 4px;line-height:1.1}
      .dash-note{color:#000;font-size:16px;line-height:1.4;min-height:22px}
      .dash-content{display:grid;grid-template-columns:1fr;gap:18px;margin-top:19px;align-items:stretch}
      .dash-panel{padding:23px;background:linear-gradient(145deg,#fff,#fbfdff)}
      .dash-activity-panel{border-top:4px solid #0e7490;background:linear-gradient(145deg,#eaf8fb 0%,#fff 43%)}
      .dash-full-operations{margin-top:22px;padding:clamp(18px,2.5vw,30px);border:1px solid #c4b5fd;border-top:5px solid #7c3aed;border-radius:22px;background:linear-gradient(145deg,#f5f0ff 0%,#fff 36%,#eff6ff 100%);box-shadow:0 8px 26px rgba(76,29,149,.08)}
      .dash-full-operations>header{margin-bottom:20px}
      .dash-panel-head{display:flex;align-items:flex-start;justify-content:space-between;gap:18px;margin-bottom:20px}
      .dash-panel h2{font-size:20px;color:#000;margin:0;font-weight:800;line-height:1.3}
      .dash-panel-sub{font-size:16px;color:#000;margin:6px 0 0;line-height:1.4}
      .dash-legend{display:flex;gap:15px;flex-wrap:wrap;font-size:16px;color:#000}
      .dash-legend span{display:flex;gap:7px;align-items:center;white-space:nowrap}
      .dash-dot{width:9px;height:9px;border-radius:50%;flex:none}
      .dash-chart{height:300px}
      .dash-ops{display:flex;align-items:center;gap:13px;border-radius:13px;padding:15px;margin:18px 0;border:1px solid #e5e7eb;color:#000!important;font-size:16px}
      .dash-light{position:relative;width:12px;height:12px;border-radius:50%;box-shadow:0 0 0 4px currentColor;opacity:.9;flex:none}
      .dash-command-list{display:grid;gap:11px}
      .dash-command{display:flex;align-items:center;justify-content:space-between;gap:10px;border:1px solid var(--line);border-radius:13px;padding:13px 14px;color:#000;text-decoration:none;font-size:16px;font-weight:700;line-height:1.35;transition:border .15s,background .15s,transform .15s}
      .dash-command:hover{border-color:#a6d3c6;background:#f7fbf9;transform:translateX(2px)}
      .dash-command span:first-child{display:flex;align-items:center;gap:12px;min-width:0}
      .dash-command-icon{display:grid;place-items:center;width:36px;height:36px;background:#f1f5f9;color:#000!important;border-radius:10px;flex:none}
      .dash-footer-note{margin:15px 0 0;font-size:16px;color:#000;line-height:1.45}
      .dash-error{padding:13px 15px;background:#fff7ed;color:#000;border:1px solid #fed7aa;border-radius:12px;font-size:16px;margin:0 0 16px;line-height:1.45}
      @media(max-width:1180px){.dash-grid{grid-template-columns:repeat(3,minmax(0,1fr))}}
      @media(max-width:950px){.dash-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}
      @media(max-width:560px){.admin-dashboard{padding:22px 14px 32px}.dash-head{align-items:flex-start;flex-direction:column}.dash-head h1{font-size:30px}.dash-grid{gap:11px}.dash-card{padding:16px}.dash-value{font-size:31px}.dash-panel{padding:17px}.dash-panel-head{display:block}.dash-legend{margin-top:14px;gap:10px}.dash-chart{height:270px}}
    `}</style>
    <header className="dash-head"><div><p className="dash-kicker">Agency overview</p><h1>Good day{admin?.agencyName ? `, ${admin.agencyName}` : ""}</h1><p>Your agency at a glance. Updated {syncedAt ? syncedAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "when data loads"}.</p></div><button className="dash-refresh" onClick={() => void refresh(true)} disabled={refreshing}><RefreshCw size={15} className={refreshing ? "animate-spin" : ""}/>{refreshing ? "Refreshing" : "Refresh data"}</button></header>
    {errors.length > 0 && <div className="dash-error">Some figures could not be loaded. {Array.from(new Set(errors)).join(" · ")}</div>}
    <section className="dash-grid" aria-label="Agency analytics">
      {cards.map((card) => <Link key={card.title} to={card.href} className="dash-card" style={{textDecoration:"none",color:"inherit","--card-accent":card.color,"--card-surface":card.surface} as CSSProperties}><div className="dash-card-top"><span className="dash-card-label">{card.title}</span><span className="dash-icon" style={{background:card.surface,color:card.color}}><card.icon size={21}/></span></div><div className="dash-value">{loading ? "—" : card.value.toLocaleString()}</div><div className="dash-note">{card.note}</div></Link>)}
    </section>
    <section className="dash-content">
      <article className="dash-panel dash-activity-panel"><div className="dash-panel-head"><div><h2>Agency activity</h2><p className="dash-panel-sub">Records added over the last six months</p></div><div className="dash-legend">{[["#0D8A68","Maids"],["#2563EB","Contracts"],["#D97706","Enquiries"],["#7C3AED","Applicants"]].map(([color,label])=><span key={label}><i className="dash-dot" style={{background:color}}/>{label}</span>)}</div></div><div className="dash-chart"><ResponsiveContainer width="100%" height="100%"><AreaChart data={chartData} margin={{top:8,right:8,left:-22,bottom:0}}><defs>{[["maids","#0D8A68"],["contracts","#2563EB"],["enquiries","#D97706"],["applicants","#7C3AED"]].map(([id,color])=><linearGradient key={id} id={`fill-${id}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={color} stopOpacity={.32}/><stop offset="95%" stopColor={color} stopOpacity={.02}/></linearGradient>)}</defs><CartesianGrid stroke="#cbd5e1" vertical={false}/><XAxis dataKey="month" tickLine={false} axisLine={false} tick={{fontSize:16,fill:"#000"}}/><YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={{fontSize:16,fill:"#000"}}/><Tooltip contentStyle={{borderRadius:12,border:"1px solid #d1d5db",fontSize:16,color:"#000"}}/><Area type="monotone" dataKey="Maids" stroke="#0D8A68" fill="url(#fill-maids)" strokeWidth={3}/><Area type="monotone" dataKey="Contracts" stroke="#2563EB" fill="url(#fill-contracts)" strokeWidth={3}/><Area type="monotone" dataKey="Enquiries" stroke="#D97706" fill="url(#fill-enquiries)" strokeWidth={3}/><Area type="monotone" dataKey="Applicants" stroke="#7C3AED" fill="url(#fill-applicants)" strokeWidth={3}/></AreaChart></ResponsiveContainer></div></article>
    </section>
    <section className="dash-full-operations" aria-label="Full operations workspace">
      <AgencyOperationsCenterPage embedded />
    </section>
  </main>;
};

export default HomePage;
