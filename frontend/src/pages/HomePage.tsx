import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { adminPath } from "@/lib/routes";
import { toast } from "@/components/ui/sonner";
import { getAgencyAdminAuthHeaders } from "@/lib/agencyAdminAuth";
import {
  Building2, UserPlus, Pencil, MessageSquare, Lock,
  PhoneIncoming, Users, Eye, EyeOff, Image, MessageCircle,
  FileText, BarChart3, ClipboardList, Zap,
  ScrollText, ArrowRight, Wifi, TrendingUp,
} from "lucide-react";

interface DashboardSummary {
  publicMaids: number; hiddenMaids: number; totalMaids: number;
  maidsWithPhotos: number; enquiries: number; requests: number;
  pendingRequests: number; unreadAgencyChats: number;
  momPersonnel: number; testimonials: number; galleryImages: number;
  whatsappMessagesSent: number; whatsappMessagesDelivered: number;
  whatsappMessagesRead: number; whatsappResponseRate: number;
  whatsappAverageResponseTimeMinutes: number; whatsappActiveConversations: number;
  whatsappPendingReplies: number; whatsappInterviewConfirmations: number;
  whatsappDocumentSubmissionRate: number;
}

const useWindowWidth = () => {
  const [w, setW] = useState(typeof window !== "undefined" ? window.innerWidth : 1280);
  useEffect(() => {
    const h = () => setW(window.innerWidth);
    window.addEventListener("resize", h);
    return () => window.removeEventListener("resize", h);
  }, []);
  return w;
};

const useCountUp = (target: number, duration = 900) => {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (target === 0) { setValue(0); return; }
    let start = 0;
    const step = Math.ceil(target / (duration / 16));
    const timer = setInterval(() => {
      start += step;
      if (start >= target) { setValue(target); clearInterval(timer); }
      else setValue(start);
    }, 16);
    return () => clearInterval(timer);
  }, [target, duration]);
  return value;
};

/* ─── Skeleton ───────────────────────────────────────────────────────────── */
const Skel = ({ h = 80 }: { h?: number }) => (
  <div style={{ borderRadius: 10, height: h, background: "#dde6ea", animation: "hp-shimmer 1.5s ease infinite" }} />
);

/* ─── Stat Card ──────────────────────────────────────────────────────────── */
interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: number;
  loading: boolean;
  accentColor: string;   // border + icon color
  bgColor: string;       // light tint background
  sub?: string;
  subAlert?: boolean;
  delay?: number;
  to?: string;
}

const StatCard = ({ icon, label, value, loading, accentColor, bgColor, sub, subAlert, delay = 0, to }: StatCardProps) => {
  const animated = useCountUp(loading ? 0 : value);
  const [vis, setVis] = useState(false);
  const [hov, setHov] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setVis(true), delay);
    return () => clearTimeout(t);
  }, [delay]);

  const baseStyle: React.CSSProperties = {
    display: "block",
    background: bgColor,
    borderRadius: 10,
    border: `1px solid ${accentColor}30`,
    borderLeft: `4px solid ${accentColor}`,
    padding: "14px 14px 12px",
    textDecoration: "none",
    cursor: to ? "pointer" : "default",
    opacity: vis ? 1 : 0,
    transform: vis ? (hov && to ? "translateY(-2px)" : "translateY(0)") : "translateY(10px)",
    transition: `opacity .35s ease ${delay}ms, transform .35s ease ${delay}ms, box-shadow .2s`,
    boxShadow: hov && to ? "0 6px 20px rgba(0,0,0,.10)" : "0 1px 4px rgba(0,0,0,.05)",
    boxSizing: "border-box",
    minWidth: 0,
  };

  const content = (
    <>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 10 }}>
        <div style={{
          width: 32, height: 32, borderRadius: 8,
          background: accentColor + "20",
          border: `1px solid ${accentColor}40`,
          display: "flex", alignItems: "center", justifyContent: "center",
          color: accentColor, flexShrink: 0,
        }}>
          {icon}
        </div>
        {to && (
          <ArrowRight size={13} color={accentColor} style={{ opacity: hov ? 1 : 0.4, transition: "opacity .2s", marginTop: 2 }} />
        )}
      </div>

      <div style={{ fontSize: 10, fontWeight: 800, color: "#1a1a1a", letterSpacing: ".07em", textTransform: "uppercase", marginBottom: 4, opacity: 0.6 }}>
        {label}
      </div>

      <div style={{ fontSize: 30, fontWeight: 900, color: "#111111", lineHeight: 1, marginBottom: sub ? 5 : 0, fontVariantNumeric: "tabular-nums" }}>
        {loading
          ? <span style={{ display: "inline-block", width: 52, height: 28, borderRadius: 5, background: accentColor + "25", animation: "hp-shimmer 1.5s ease infinite" }} />
          : animated
        }
      </div>

      {sub && (
        <div style={{ fontSize: 11, fontWeight: 700, color: subAlert ? "#b91c1c" : "#333333", display: "flex", alignItems: "center", gap: 4 }}>
          {subAlert && (
            <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#dc2626", display: "inline-block", flexShrink: 0, animation: "hp-pulse 1.6s ease-in-out infinite" }} />
          )}
          {sub}
        </div>
      )}
    </>
  );

  return to
    ? <Link to={to} style={baseStyle} onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}>{content}</Link>
    : <div style={baseStyle} onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}>{content}</div>;
};

/* ─── Donut Chart ──────────────────────────────────────────────────────── */
interface DonutSlice { label: string; value: number; color: string; }

const DonutChart = ({ slices, total, centerLabel, size = 160 }: {
  slices: DonutSlice[]; total: number; centerLabel: string; size?: number;
}) => {
  const [hovered, setHovered] = useState<number | null>(null);
  const [animated, setAnimated] = useState(false);

  useEffect(() => { const t = setTimeout(() => setAnimated(true), 200); return () => clearTimeout(t); }, []);

  const sliceSum = slices.reduce((a, s) => a + s.value, 0);
  const SW = size * 0.12;
  const R = (size - SW) / 2;
  const cx = size / 2;
  const cy = size / 2;
  const C = 2 * Math.PI * R;
  const GAP = sliceSum > 0 ? C * 0.015 : 0;

  let cum = 0;
  const sliceData = slices.map((s) => {
    const pct = sliceSum > 0 ? s.value / sliceSum : 0;
    const start = cum;
    cum += pct;
    return { ...s, pct, start };
  });

  const hov = hovered !== null ? sliceData[hovered] : null;

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 20, width: "100%" }}>
      <div style={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}
          style={{ transform: "rotate(-90deg)", overflow: "visible", display: "block" }}>
          <circle cx={cx} cy={cy} r={R} fill="none" stroke="#dde6ea" strokeWidth={SW} />
          {total > 0 && sliceData.map((s, i) => {
            if (s.value === 0) return null;
            const isH = hovered === i;
            const arcLen = animated ? Math.max(0, s.pct * C - GAP) : 0;
            const offset = C - s.start * C;
            return (
              <circle key={i} cx={cx} cy={cy} r={R} fill="none"
                stroke={s.color}
                strokeWidth={isH ? SW + 4 : SW}
                strokeLinecap="butt"
                strokeDasharray={`${arcLen} ${C - arcLen}`}
                strokeDashoffset={offset}
                style={{ transition: `stroke-dasharray 1s cubic-bezier(.4,0,.2,1) ${i * 70}ms, stroke-width .2s`, cursor: "pointer" }}
                onMouseEnter={() => setHovered(i)}
                onMouseLeave={() => setHovered(null)}
              />
            );
          })}
        </svg>
        <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", pointerEvents: "none" }}>
          <span style={{ fontSize: hov ? size * 0.15 : size * 0.19, fontWeight: 900, color: "#111111", lineHeight: 1, fontVariantNumeric: "tabular-nums", transition: "all .2s" }}>
            {hov ? hov.value : total}
          </span>
          <span style={{ fontSize: size * 0.07, fontWeight: 700, color: "#444444", marginTop: 3, textAlign: "center", maxWidth: size * 0.55, lineHeight: 1.2, transition: "all .2s" }}>
            {hov ? hov.label : centerLabel}
          </span>
        </div>
      </div>

      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 3, minWidth: 0 }}>
        {sliceData.map((s, i) => {
          const pct = sliceSum > 0 ? Math.round((s.value / sliceSum) * 100) : 0;
          const isH = hovered === i;
          return (
            <div key={i}
              style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", padding: "5px 7px", borderRadius: 7, background: isH ? s.color + "15" : "transparent", border: `1px solid ${isH ? s.color + "35" : "transparent"}`, opacity: hovered !== null && !isH ? .4 : 1, transition: "all .18s" }}
              onMouseEnter={() => setHovered(i)}
              onMouseLeave={() => setHovered(null)}
            >
              <div style={{ width: 3, height: 28, borderRadius: 3, background: s.color, flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 3 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: "#1a1a1a", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.label}</span>
                  <div style={{ display: "flex", alignItems: "center", gap: 5, flexShrink: 0 }}>
                    <span style={{ fontSize: 13, fontWeight: 800, color: "#111111" }}>{s.value}</span>
                    <span style={{ fontSize: 10, fontWeight: 700, color: "#333333", background: s.color + "20", border: `1px solid ${s.color}40`, padding: "1px 6px", borderRadius: 99 }}>{pct}%</span>
                  </div>
                </div>
                <div style={{ height: 3, borderRadius: 99, background: "#dde6ea", overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${animated ? pct : 0}%`, background: s.color, borderRadius: 99, transition: `width 1.1s cubic-bezier(.4,0,.2,1) ${i * 80}ms` }} />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

/* ─── Action Card ───────────────────────────────────────────────────────── */
const ActionCard = ({ icon, label, desc, path, accentColor, bgColor, badge, badgeAlert, delay = 0 }: {
  icon: React.ReactNode; label: string; desc: string; path: string;
  accentColor: string; bgColor: string;
  badge?: string; badgeAlert?: boolean; delay?: number;
}) => {
  const [hov, setHov] = useState(false);
  const [vis, setVis] = useState(false);
  useEffect(() => { const t = setTimeout(() => setVis(true), delay); return () => clearTimeout(t); }, [delay]);

  return (
    <Link to={path}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        display: "flex",
        flexDirection: "column",
        background: hov ? accentColor + "18" : bgColor,
        border: `1px solid ${accentColor}35`,
        borderLeft: `4px solid ${accentColor}`,
        borderRadius: 10,
        padding: "11px 12px",
        textDecoration: "none",
        transition: "all .2s ease",
        opacity: vis ? 1 : 0,
        transform: vis ? (hov ? "translateY(-2px)" : "translateY(0)") : "translateY(8px)",
        boxShadow: hov ? "0 6px 16px rgba(0,0,0,.09)" : "0 1px 3px rgba(0,0,0,.04)",
        minWidth: 0,
        boxSizing: "border-box",
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 8 }}>
        <div style={{
          width: 30, height: 30, borderRadius: 8,
          background: accentColor + "25",
          border: `1px solid ${accentColor}40`,
          display: "flex", alignItems: "center", justifyContent: "center",
          color: accentColor, flexShrink: 0,
        }}>
          {icon}
        </div>
        <ArrowRight size={12} color={accentColor} style={{ opacity: hov ? 1 : 0.35, transition: "opacity .2s", marginTop: 2 }} />
      </div>

      <p style={{ fontSize: 13, fontWeight: 800, color: "#111111", margin: "0 0 2px", letterSpacing: "-.01em", lineHeight: 1.3 }}>
        {label}
      </p>
      <p style={{ fontSize: 11, fontWeight: 600, color: "#444444", margin: 0, lineHeight: 1.4 }}>
        {desc}
      </p>

      {badge && (
        <div style={{ marginTop: 7 }}>
          <span style={{
            fontSize: 9, fontWeight: 800, padding: "2px 8px", borderRadius: 99,
            display: "inline-flex", alignItems: "center", gap: 4,
            background: badgeAlert ? "#fee2e2" : accentColor + "20",
            color: badgeAlert ? "#b91c1c" : "#1a1a1a",
            border: `1px solid ${badgeAlert ? "#fca5a5" : accentColor + "50"}`,
            letterSpacing: ".05em", textTransform: "uppercase",
          }}>
            {badgeAlert && (
              <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#dc2626", display: "inline-block", animation: "hp-pulse 1.6s ease-in-out infinite" }} />
            )}
            {badge}
          </span>
        </div>
      )}
    </Link>
  );
};

/* ─── WhatsApp Metric Cell ──────────────────────────────────────────────── */
const WaCell = ({ label, value, sub, accentColor, bgColor }: {
  label: string; value: number; sub?: string; accentColor: string; bgColor: string;
}) => (
  <div style={{
    borderRadius: 9,
    border: `1px solid ${accentColor}30`,
    borderTop: `4px solid ${accentColor}`,
    background: bgColor,
    padding: "11px 12px",
  }}>
    <div style={{ fontSize: 9, fontWeight: 900, color: "#1a1a1a", letterSpacing: ".1em", textTransform: "uppercase", marginBottom: 6, opacity: 0.65 }}>
      {label}
    </div>
    <div style={{ fontSize: 24, fontWeight: 900, color: "#111111", lineHeight: 1, fontVariantNumeric: "tabular-nums" }}>
      {value}
    </div>
    {sub && (
      <div style={{ marginTop: 5, fontSize: 10, fontWeight: 700, color: "#333333" }}>{sub}</div>
    )}
  </div>
);

/* ─── Section Header ─────────────────────────────────────────────────────── */
const SectionHead = ({ icon, label, accentColor, badge }: {
  icon: React.ReactNode; label: string; accentColor: string; badge?: React.ReactNode;
}) => (
  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12, flexShrink: 0 }}>
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <div style={{ width: 26, height: 26, borderRadius: 7, background: accentColor, display: "flex", alignItems: "center", justifyContent: "center" }}>
        {icon}
      </div>
      <span style={{ fontSize: 13, fontWeight: 800, color: "#111111", letterSpacing: "-.01em" }}>{label}</span>
    </div>
    {badge}
  </div>
);

/* ─── Panel ───────────────────────────────────────────────────────────────── */
const Panel = ({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) => (
  <div style={{
    background: "#fff",
    border: "1px solid #dde6ea",
    borderRadius: 12,
    padding: "14px 16px",
    boxShadow: "0 1px 6px rgba(0,0,0,.04)",
    ...style,
  }}>
    {children}
  </div>
);

/* ═══════════════════════════════════════════════════════════════════════════
   HOME PAGE
═══════════════════════════════════════════════════════════════════════════ */
const HomePage = () => {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const width = useWindowWidth();
  const isSm = width < 768;
  const isMd = width < 1024;

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch("/api/company/summary", { headers: { ...getAgencyAdminAuthHeaders() } });
        const data = (await res.json().catch(() => ({}))) as Partial<DashboardSummary> & { error?: string };
        if (!res.ok) throw new Error(data.error || "Failed to load");
        setSummary({
          publicMaids:                        data.publicMaids ?? 0,
          hiddenMaids:                        data.hiddenMaids ?? 0,
          totalMaids:                         data.totalMaids ?? 0,
          maidsWithPhotos:                    data.maidsWithPhotos ?? 0,
          enquiries:                          data.enquiries ?? 0,
          requests:                           data.requests ?? 0,
          pendingRequests:                    data.pendingRequests ?? 0,
          unreadAgencyChats:                  data.unreadAgencyChats ?? 0,
          momPersonnel:                       data.momPersonnel ?? 0,
          testimonials:                       data.testimonials ?? 0,
          galleryImages:                      data.galleryImages ?? 0,
          whatsappMessagesSent:               data.whatsappMessagesSent ?? 0,
          whatsappMessagesDelivered:          data.whatsappMessagesDelivered ?? 0,
          whatsappMessagesRead:               data.whatsappMessagesRead ?? 0,
          whatsappResponseRate:               data.whatsappResponseRate ?? 0,
          whatsappAverageResponseTimeMinutes: data.whatsappAverageResponseTimeMinutes ?? 0,
          whatsappActiveConversations:        data.whatsappActiveConversations ?? 0,
          whatsappPendingReplies:             data.whatsappPendingReplies ?? 0,
          whatsappInterviewConfirmations:     data.whatsappInterviewConfirmations ?? 0,
          whatsappDocumentSubmissionRate:     data.whatsappDocumentSubmissionRate ?? 0,
        });
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed to load dashboard");
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, []);

  const s = summary;
  const cols = isSm ? 2 : 4;
  const donutSize = isSm ? 120 : isMd ? 140 : 158;
  const gap = 8;

  // card palette: [accentColor, bgColor]
  const statRow1: [string, string][] = [
    ["#0E4E5E", "#e8f3f6"],  // teal
    ["#059669", "#e6f7f2"],  // green
    ["#D97706", "#fef5e7"],  // amber
    [s?.unreadAgencyChats ? "#DC2626" : "#059669",
     s?.unreadAgencyChats ? "#fef2f2" : "#e6f7f2"],
  ];
  const statRow2: [string, string][] = [
    ["#7C3AED", "#f1eefe"],  // purple
    ["#0891B2", "#e6f6fb"],  // cyan
    ["#DB2777", "#fdf0f7"],  // pink
    ["#B45309", "#fdf4e7"],  // orange-brown
  ];

  const slices = s ? [
    { label: "Public",      value: s.publicMaids,     color: "#0E7490" },
    { label: "Hidden",      value: s.hiddenMaids,     color: "#D97706" },
    { label: "With Photos", value: s.maidsWithPhotos, color: "#059669" },
    { label: "Enquiries",   value: s.enquiries,       color: "#7C3AED" },
    { label: "Pending",     value: s.pendingRequests, color: "#DB2777" },
  ] : [];

  const menuCards = [
    { icon: <Building2 size={14} />,     label: "Agency Profile",  desc: "Branding & info",         path: adminPath("/agency-profile"),       accentColor: "#0E4E5E", bgColor: "#e8f3f6" },
    { icon: <UserPlus size={14} />,      label: "Add Maid",        desc: "Expand your roster",       path: adminPath("/add-maid"),             accentColor: "#059669", bgColor: "#e6f7f2" },
    { icon: <Pencil size={14} />,        label: "Manage Maids",    desc: "Edit or archive profiles", path: adminPath("/edit-maids"),           accentColor: "#B45309", bgColor: "#fdf4e7" },
    { icon: <MessageSquare size={14} />, label: "Messages",        desc: "Reply to clients",         path: adminPath("/chat-support"),         accentColor: "#7C3AED", bgColor: "#f1eefe",
      badge: s?.unreadAgencyChats ? `${s.unreadAgencyChats} unread` : undefined, badgeAlert: !!(s?.unreadAgencyChats) },
    { icon: <Lock size={14} />,          label: "Security",        desc: "Change password",          path: adminPath("/change-password"),      accentColor: "#475569", bgColor: "#f0f3f5" },
    { icon: <ScrollText size={14} />,    label: "Contracts",       desc: "Employment docs",          path: adminPath("/employment-contracts"), accentColor: "#0F766E", bgColor: "#e6f5f4" },
    { icon: <PhoneIncoming size={14} />, label: "Enquiries",       desc: "See who's reaching out",  path: adminPath("/enquiry"),              accentColor: "#BE185D", bgColor: "#fdf0f7" },
    { icon: <ClipboardList size={14} />, label: "Requests",        desc: "Track bookings",           path: adminPath("/requests"),             accentColor: "#0891B2", bgColor: "#e6f6fb" },
  ];

  const waMetrics = s ? [
    { label: "Sent",          value: s.whatsappMessagesSent,           sub: `${s.whatsappMessagesDelivered} delivered`, accentColor: "#0E4E5E", bgColor: "#e8f3f6" },
    { label: "Read",          value: s.whatsappMessagesRead,           sub: "Messages opened",                          accentColor: "#059669", bgColor: "#e6f7f2" },
    { label: "Response Rate", value: s.whatsappResponseRate,           sub: "% replied",                                accentColor: "#7C3AED", bgColor: "#f1eefe" },
    { label: "Pending",       value: s.whatsappPendingReplies,         sub: "Awaiting reply",                           accentColor: "#D97706", bgColor: "#fef5e7" },
    { label: "Docs / Intrvw", value: s.whatsappDocumentSubmissionRate, sub: `${s.whatsappInterviewConfirmations} confirmed`, accentColor: "#DB2777", bgColor: "#fdf0f7" },
  ] : [];

  return (
    <div style={{ padding: isSm ? "10px 10px 24px" : "14px 18px 24px", background: "#F3F7F9", minHeight: "100vh", boxSizing: "border-box", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>
      <style>{`
        @keyframes hp-pulse   { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.35;transform:scale(1.6)} }
        @keyframes hp-shimmer { 0%,100%{opacity:1} 50%{opacity:.55} }
        * { box-sizing: border-box; }
      `}</style>

      {/* ══ Header ══ */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 3, height: 32, borderRadius: 3, background: "#0E4E5E", flexShrink: 0 }} />
          <div>
            <h2 style={{ fontSize: isSm ? 17 : 19, fontWeight: 800, color: "#111111", margin: 0, lineHeight: 1, letterSpacing: "-.02em" }}>
              Dashboard
            </h2>
            <p style={{ fontSize: 11, color: "#555555", margin: "2px 0 0", fontWeight: 600 }}>Agency overview</p>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 6, background: "#fff", border: "1px solid #D1E4EB", borderRadius: 99, padding: "5px 11px", boxShadow: "0 1px 4px rgba(0,0,0,.05)" }}>
          <Wifi size={11} color="#0E4E5E" style={{ animation: "hp-pulse 2.2s ease-in-out infinite" }} />
          <span style={{ fontSize: 10, fontWeight: 800, color: "#111111", letterSpacing: ".08em" }}>LIVE</span>
        </div>
      </div>

      {/* ══ Stat row 1 ══ */}
      <div style={{ display: "grid", gridTemplateColumns: `repeat(${cols},1fr)`, gap, marginBottom: gap }}>
        {loading ? Array.from({ length: 4 }).map((_, i) => <Skel key={i} h={98} />) : (
          <>
            <StatCard icon={<Users size={14} />}         label="Total Maids"   value={s?.totalMaids ?? 0}        loading={loading} accentColor={statRow1[0][0]} bgColor={statRow1[0][1]} sub={`${s?.maidsWithPhotos ?? 0} with photos`} delay={0}   to={adminPath("/edit-maids")} />
            <StatCard icon={<Eye size={14} />}           label="Public"        value={s?.publicMaids ?? 0}       loading={loading} accentColor={statRow1[1][0]} bgColor={statRow1[1][1]} sub="Visible to clients"                       delay={60}  to={adminPath("/edit-maids")} />
            <StatCard icon={<EyeOff size={14} />}        label="Hidden"        value={s?.hiddenMaids ?? 0}       loading={loading} accentColor={statRow1[2][0]} bgColor={statRow1[2][1]} sub="Not listed"                               delay={120} to={adminPath("/edit-maids")} />
            <StatCard icon={<MessageCircle size={14} />} label="Unread Chats"  value={s?.unreadAgencyChats ?? 0} loading={loading} accentColor={statRow1[3][0]} bgColor={statRow1[3][1]} sub={s?.unreadAgencyChats ? "Needs attention" : "All caught up"} subAlert={!!s?.unreadAgencyChats} delay={180} to={adminPath("/chat-support")} />
          </>
        )}
      </div>

      {/* ══ Stat row 2 ══ */}
      <div style={{ display: "grid", gridTemplateColumns: `repeat(${cols},1fr)`, gap, marginBottom: gap }}>
        {loading ? Array.from({ length: 4 }).map((_, i) => <Skel key={i} h={98} />) : (
          <>
            <StatCard icon={<PhoneIncoming size={14} />} label="Enquiries"     value={s?.enquiries ?? 0}     loading={loading} accentColor={statRow2[0][0]} bgColor={statRow2[0][1]} delay={0}   to={adminPath("/enquiry")} />
            <StatCard icon={<FileText size={14} />}      label="Requests"      value={s?.requests ?? 0}      loading={loading} accentColor={statRow2[1][0]} bgColor={statRow2[1][1]} sub={`${s?.pendingRequests ?? 0} pending`} delay={60} to={adminPath("/requests")} />
            <StatCard icon={<Image size={14} />}         label="Gallery"       value={s?.galleryImages ?? 0} loading={loading} accentColor={statRow2[2][0]} bgColor={statRow2[2][1]} sub="Agency photos" delay={120} to={adminPath("/agency-profile")} />
            <StatCard icon={<Users size={14} />}         label="MOM Personnel" value={s?.momPersonnel ?? 0}  loading={loading} accentColor={statRow2[3][0]} bgColor={statRow2[3][1]} delay={180} to={adminPath("/agency-profile")} />
          </>
        )}
      </div>

      {/* ══ WhatsApp Panel ══ */}
      <Panel style={{ marginBottom: gap }}>
        <SectionHead
          icon={<MessageCircle size={13} color="#fff" />}
          label="WhatsApp Recruitment"
          accentColor="#25D366"
          badge={!loading && s ? (
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#25D366" }} />
              <span style={{ fontSize: 11, fontWeight: 700, color: "#111111" }}>
                {s.whatsappActiveConversations} active
              </span>
            </div>
          ) : undefined}
        />

        <div style={{ display: "grid", gridTemplateColumns: isSm ? "repeat(2,1fr)" : "repeat(5,1fr)", gap }}>
          {loading
            ? Array.from({ length: 5 }).map((_, i) => <Skel key={i} h={80} />)
            : waMetrics.map((m) => <WaCell key={m.label} {...m} />)
          }
        </div>

        {!loading && s && (
          <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px solid #dde6ea", fontSize: 11, fontWeight: 600, color: "#333333", display: "flex", alignItems: "center", gap: 6 }}>
            <TrendingUp size={12} color="#0E4E5E" />
            Avg. response time:&nbsp;
            <strong style={{ color: "#111111", fontWeight: 800 }}>{s.whatsappAverageResponseTimeMinutes} min</strong>
          </div>
        )}
      </Panel>

      {/* ══ Bottom: Donut + Actions ══ */}
      <div style={{ display: "grid", gridTemplateColumns: isSm ? "1fr" : "1fr 1fr", gap }}>

        {/* Donut */}
        <Panel style={{ display: "flex", flexDirection: "column" }}>
          <SectionHead
            icon={<BarChart3 size={13} color="#fff" />}
            label="Roster Breakdown"
            accentColor="#0E4E5E"
            badge={!loading && s ? (
              <span style={{ fontSize: 11, fontWeight: 700, color: "#111111", background: "#e8f3f6", border: "1px solid #b5d5e0", padding: "2px 9px", borderRadius: 99 }}>
                {s.totalMaids} total
              </span>
            ) : undefined}
          />
          <div style={{ flex: 1, display: "flex", alignItems: "center" }}>
            {!loading && s
              ? <DonutChart total={s.totalMaids} centerLabel="Total Maids" slices={slices} size={donutSize} />
              : (
                <div style={{ display: "flex", alignItems: "center", gap: 16, width: "100%" }}>
                  <div style={{ width: donutSize, height: donutSize, borderRadius: "50%", background: "#dde6ea", flexShrink: 0, animation: "hp-shimmer 1.5s ease infinite" }} />
                  <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
                    {[0, 1, 2, 3, 4].map((i) => <Skel key={i} h={22} />)}
                  </div>
                </div>
              )
            }
          </div>
        </Panel>

        {/* Quick actions */}
        <Panel style={{ display: "flex", flexDirection: "column" }}>
          <SectionHead
            icon={<Zap size={13} color="#fff" />}
            label="Quick Actions"
            accentColor="#B45309"
          />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap, flex: 1, minWidth: 0 }}>
            {loading
              ? Array.from({ length: 8 }).map((_, i) => <Skel key={i} h={90} />)
              : menuCards.map((c, i) => (
                  <ActionCard
                    key={i}
                    icon={c.icon}
                    label={c.label}
                    desc={c.desc}
                    path={c.path}
                    accentColor={c.accentColor}
                    bgColor={c.bgColor}
                    badge={(c as { badge?: string }).badge}
                    badgeAlert={(c as { badgeAlert?: boolean }).badgeAlert}
                    delay={i * 35}
                  />
                ))
            }
          </div>
        </Panel>
      </div>
    </div>
  );
};

export default HomePage;