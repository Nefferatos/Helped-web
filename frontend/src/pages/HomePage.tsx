import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { adminPath } from "@/lib/routes";
import { toast } from "@/components/ui/sonner";
import { getAgencyAdminAuthHeaders } from "@/lib/agencyAdminAuth";
import {
  Building2, UserPlus, Pencil, MessageSquare, Lock,
  PhoneIncoming, Users, Eye, EyeOff, Image, MessageCircle,
  FileText, ChevronRight, BarChart3, ClipboardList, Zap,
} from "lucide-react";

interface DashboardSummary {
  publicMaids: number; hiddenMaids: number; totalMaids: number;
  maidsWithPhotos: number; enquiries: number; requests: number;
  pendingRequests: number; unreadAgencyChats: number;
  momPersonnel: number; testimonials: number; galleryImages: number;
}

/* ─── Responsive hook ───────────────────────────────────────────────────── */
const useWindowWidth = () => {
  const [w, setW] = useState(typeof window !== "undefined" ? window.innerWidth : 1280);
  useEffect(() => {
    const h = () => setW(window.innerWidth);
    window.addEventListener("resize", h);
    return () => window.removeEventListener("resize", h);
  }, []);
  return w;
};

/* ─── Animated Counter ──────────────────────────────────────────────────── */
const useCountUp = (target: number, duration = 700) => {
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

/* ─── Stat Card ─────────────────────────────────────────────────────────── */
interface StatCardProps {
  icon: React.ReactNode; label: string; value: number; loading: boolean;
  gradient: string; shadowColor: string; sub?: string; subUrgent?: boolean;
}
const StatCard = ({ icon, label, value, loading, gradient, shadowColor, sub, subUrgent }: StatCardProps) => {
  const animated = useCountUp(loading ? 0 : value);
  return (
    <div style={{ background: gradient, borderRadius: 14, padding: "10px 12px 8px",
      boxShadow: `0 5px 0 ${shadowColor}, 0 10px 20px rgba(0,0,0,0.1)`,
      cursor: "default", position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", top: -14, right: -14, width: 56, height: 56,
        borderRadius: "50%", background: "rgba(255,255,255,0.12)", pointerEvents: "none" }} />
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
        <div style={{ width: 28, height: 28, borderRadius: 8, background: "rgba(255,255,255,0.25)",
          display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", flexShrink: 0 }}>
          {icon}
        </div>
        {/* CHANGED: fontSize 10 → 11, color 0.82 → 0.97 */}
        <p style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.07em",
          textTransform: "uppercase", color: "rgba(255,255,255,0.97)", margin: 0 }}>
          {label}
        </p>
      </div>
      {/* CHANGED: fontSize 28 → 30 */}
      <p style={{ fontSize: 32, fontWeight: 800, color: "#fff", lineHeight: 1, margin: "0 0 2px" }}>
        {loading ? "—" : animated}
      </p>
      {sub && (
        /* CHANGED: fontSize 11 → 12, color 0.75 → 0.92 */
        <p style={{ fontSize: 13, fontWeight: 600,
          color: subUrgent ? "#FFD6D6" : "rgba(255,255,255,0.92)", margin: 0 }}>
          {sub}
        </p>
      )}
    </div>
  );
};

/* ─── Donut Chart ───────────────────────────────────────────────────────── */
interface DonutSlice { label: string; value: number; color: string; }
interface DonutChartProps { slices: DonutSlice[]; total: number; centerLabel: string; size?: number; }

const DonutChart = ({ slices, total, centerLabel, size = 200 }: DonutChartProps) => {
  const [hovered, setHovered] = useState<number | null>(null);
  const R = size * 0.367;
  const cx = size / 2; const cy = size / 2;
  const stroke = size * 0.142;
  const circumference = 2 * Math.PI * R;

  let cumulative = 0;
  const rendered = slices.map((slice, i) => {
    const pct = total > 0 ? slice.value / total : 0;
    const dash = pct * circumference;
    const gap = circumference - dash;
    const offset = circumference - cumulative * circumference;
    cumulative += pct;
    const isHov = hovered === i;
    return (
      <circle key={i} cx={cx} cy={cy} r={R} fill="none" stroke={slice.color}
        strokeWidth={isHov ? stroke + 4 : stroke}
        strokeDasharray={`${dash} ${gap}`} strokeDashoffset={offset}
        style={{ transition: "stroke-width 0.2s ease, stroke-dasharray 0.8s cubic-bezier(.4,0,.2,1)", cursor: "pointer" }}
        onMouseEnter={() => setHovered(i)} onMouseLeave={() => setHovered(null)} />
    );
  });

  const hovSlice = hovered !== null ? slices[hovered] : null;

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 20, width: "100%" }}>
      <div style={{ flexShrink: 0, position: "relative", width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}
          style={{ transform: "rotate(-90deg)" }}>
          <circle cx={cx} cy={cy} r={R} fill="none" stroke="#F0F2F5" strokeWidth={stroke} />
          {rendered}
        </svg>
        <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center", pointerEvents: "none" }}>
          {/* CHANGED: center value font size slightly larger */}
          <span style={{ fontSize: hovSlice ? size * 0.11 : size * 0.13, fontWeight: 800,
            color: hovSlice ? hovSlice.color : "#000", transition: "all 0.2s" }}>
            {hovSlice ? hovSlice.value : total}
          </span>
          {/* CHANGED: center label font size slightly larger, color darker */}
          <span style={{ fontSize: size * 0.054, fontWeight: 700, color: "#555",
            marginTop: 2, textAlign: "center", maxWidth: size * 0.42 }}>
            {hovSlice ? hovSlice.label : centerLabel}
          </span>
        </div>
      </div>

      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 10 }}>
        {slices.map((slice, i) => {
          const pct = total > 0 ? Math.round((slice.value / total) * 100) : 0;
          const isHov = hovered === i;
          return (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer",
              opacity: hovered !== null && !isHov ? 0.4 : 1, transition: "opacity 0.2s" }}
              onMouseEnter={() => setHovered(i)} onMouseLeave={() => setHovered(null)}>
              <div style={{ width: 10, height: 10, borderRadius: 3, background: slice.color, flexShrink: 0,
                transform: isHov ? "scale(1.3)" : "scale(1)", transition: "transform 0.2s" }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                  {/* CHANGED: fontSize 12 → 13, color #111 → #000 */}
                  <span style={{ fontSize: 18, fontWeight: 700, color: "#000", whiteSpace: "nowrap",
                    overflow: "hidden", textOverflow: "ellipsis" }}>{slice.label}</span>
                  {/* CHANGED: fontSize 12 → 13 */}
                  <span style={{ fontSize: 14, fontWeight: 800, color: slice.color, marginLeft: 6, flexShrink: 0 }}>
                    {slice.value}
                  </span>
                </div>
                <div style={{ height: 15, borderRadius: 4, background: "#F0F2F5", overflow: "hidden", marginTop: 3 }}>
                  <div style={{ height: "100%", width: `${pct}%`, background: slice.color, borderRadius: 4,
                    transition: "width 1s cubic-bezier(.4,0,.2,1)" }} />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

/* ─── Menu Card ─────────────────────────────────────────────────────────── */
interface MenuCardProps {
  icon: React.ReactNode; label: string; desc: string; path: string;
  accentColor: string; iconBg: string; iconColor: string; badge?: string; badgeUrgent?: boolean;
}
const MenuCard = ({ icon, label, desc, path, accentColor, iconBg, iconColor, badge, badgeUrgent }: MenuCardProps) => (
  <Link to={path} style={{ display: "flex", alignItems: "center", gap: 10, background: "#fff",
    border: `1.5px solid #EAECF0`, borderLeft: `4px solid ${accentColor}`,
    borderRadius: 10, padding: "8px 10px",
    boxShadow: "0 3px 0 #EAECF0, 0 6px 14px rgba(0,0,0,0.04)",
    textDecoration: "none", color: "inherit",
    transition: "transform 0.16s ease, box-shadow 0.16s ease" }}
    onMouseEnter={(e) => {
      (e.currentTarget as HTMLAnchorElement).style.transform = "translateY(-2px)";
      (e.currentTarget as HTMLAnchorElement).style.boxShadow = "0 1px 0 #EAECF0, 0 6px 16px rgba(0,0,0,0.09)";
    }}
    onMouseLeave={(e) => {
      (e.currentTarget as HTMLAnchorElement).style.transform = "translateY(0)";
      (e.currentTarget as HTMLAnchorElement).style.boxShadow = "0 3px 0 #EAECF0, 0 6px 14px rgba(0,0,0,0.04)";
    }}>
    <div style={{ width: 34, height: 34, borderRadius: 9, background: iconBg,
      display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, color: iconColor }}>
      {icon}
    </div>
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        {/* CHANGED: fontSize 13 → 14, color #111 → #000 */}
        <p style={{ fontSize: 20, fontWeight: 700, color: "#000", margin: 0,
          whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{label}</p>
        {badge && (
          /* CHANGED: fontSize 10 → 11 */
          <span style={{ fontSize: 13, fontWeight: 700, padding: "1px 7px", borderRadius: 20, flexShrink: 0,
            background: badgeUrgent ? "#FCEBEB" : "#F1F5F9",
            color: badgeUrgent ? "#7F1D1D" : "#334155" }}>{badge}</span>
        )}
      </div>
      {/* CHANGED: fontSize 11 → 12, color #777 → #555 */}
      <p style={{ fontSize: 15, color: "#000", margin: 0 }}>{desc}</p>
    </div>
    <ChevronRight size={13} style={{ flexShrink: 0, color: "#999" }} />
  </Link>
);

/* ─── Main Component ────────────────────────────────────────────────────── */
const HomePage = () => {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const width = useWindowWidth();

  // Breakpoints
  const isSm  = width < 768;
  const isMd  = width < 1024;

  useEffect(() => {
    const loadSummary = async () => {
      try {
        const response = await fetch("/api/company/summary", { headers: { ...getAgencyAdminAuthHeaders() } });
        const data = (await response.json().catch(() => ({}))) as Partial<DashboardSummary> & { error?: string };
        if (!response.ok) throw new Error(data.error || "Failed to load dashboard summary");
        setSummary({
          publicMaids: data.publicMaids ?? 0, hiddenMaids: data.hiddenMaids ?? 0,
          totalMaids: data.totalMaids ?? 0, maidsWithPhotos: data.maidsWithPhotos ?? 0,
          enquiries: data.enquiries ?? 0, requests: data.requests ?? 0,
          pendingRequests: data.pendingRequests ?? 0, unreadAgencyChats: data.unreadAgencyChats ?? 0,
          momPersonnel: data.momPersonnel ?? 0, testimonials: data.testimonials ?? 0,
          galleryImages: data.galleryImages ?? 0,
        });
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to load dashboard summary");
      } finally {
        setLoading(false);
      }
    };
    void loadSummary();
  }, []);

  const s = summary;

  const statCols  = isSm ? 2 : 4;
  const donutSize = isSm ? 150 : isMd ? 170 : 210;

  const slices = s ? [
    { label: "Public Maids",     value: s.publicMaids,     color: "#1aa37e" },
    { label: "Hidden Maids",     value: s.hiddenMaids,     color: "#EF9F27" },
    { label: "With Photos",      value: s.maidsWithPhotos, color: "#378ADD" },
    { label: "Enquiries", value: s.enquiries, color: "#D97706" },
    { label: "Pending Requests", value: s.pendingRequests, color: "#7F77DD" },
  ] : [];

  return (
    <div style={{
      padding: isSm ? "0 0 20px" : "0 0 12px",
      background: "#F5F7FA",
      height: isSm ? "auto" : "100vh",
      minHeight: isSm ? "100vh" : undefined,
      boxSizing: "border-box",
      display: "flex",
      flexDirection: "column",
      overflow: isSm ? "visible" : "hidden",
    }}>
      <style>{`@keyframes livePulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:0.4;transform:scale(1.6)}}`}</style>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between",
        marginBottom: 10, flexShrink: 0 }}>
        <div>
          <h2 style={{ fontSize: isSm ? 22 : 24, fontWeight: 800, color: "#000", margin: 0, lineHeight: 1.15 }}>
            Dashboard
          </h2>
          <p style={{ fontSize: 14, color: "#444", marginTop: 1, marginBottom: 0 }}>
            Agency overview at a glance
          </p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6,
          background: "linear-gradient(135deg,#E1F5EE,#D0F4E5)",
          border: "1.5px solid #9FE1CB", borderRadius: 20, padding: "5px 13px" }}>
          <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#1D9E75",
            display: "inline-block", animation: "livePulse 1.6s ease-in-out infinite" }} />
          <span style={{ fontSize: 14, fontWeight: 700, color: "#0D6E56" }}>Live</span>
        </div>
      </div>

      {/* ── Stat Cards Row 1 ────────────────────────────────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: `repeat(${statCols}, 1fr)`,
        gap: 8, marginBottom: 8, flexShrink: 0 }}>
        <StatCard icon={<Users size={16} />} label="Total Maids" value={s?.totalMaids ?? 0} loading={loading}
          gradient="linear-gradient(135deg,#0D6E56,#1aa37e)" shadowColor="#085041"
          sub={loading ? undefined : `${s?.maidsWithPhotos ?? 0} with photos`} />
        <StatCard icon={<Eye size={16} />} label="Public" value={s?.publicMaids ?? 0} loading={loading}
          gradient="linear-gradient(135deg,#185FA5,#378ADD)" shadowColor="#0C447C" sub="Visible to clients" />
        <StatCard icon={<EyeOff size={16} />} label="Hidden" value={s?.hiddenMaids ?? 0} loading={loading}
          gradient="linear-gradient(135deg,#BA7517,#EF9F27)" shadowColor="#854F0B" sub="Not listed" />
        <StatCard icon={<MessageCircle size={16} />} label="Unread Chats" value={s?.unreadAgencyChats ?? 0} loading={loading}
          gradient={s?.unreadAgencyChats ? "linear-gradient(135deg,#A32D2D,#E24B4A)" : "linear-gradient(135deg,#3B6D11,#639922)"}
          shadowColor={s?.unreadAgencyChats ? "#791F1F" : "#27500A"}
          sub={loading ? undefined : s?.unreadAgencyChats ? "Needs attention" : "All caught up"}
          subUrgent={!!s?.unreadAgencyChats} />
      </div>

      {/* ── Stat Cards Row 2 ────────────────────────────────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: `repeat(${statCols}, 1fr)`,
        gap: 8, marginBottom: 10, flexShrink: 0 }}>
        <StatCard icon={<PhoneIncoming size={16} />} label="Enquiries" value={s?.enquiries ?? 0} loading={loading}
          gradient="linear-gradient(135deg,#534AB7,#7F77DD)" shadowColor="#3C3489" />
        <StatCard icon={<FileText size={16} />} label="Requests" value={s?.requests ?? 0} loading={loading}
          gradient="linear-gradient(135deg,#0E7490,#06B6D4)" shadowColor="#0C4A6E"
          sub={loading ? undefined : `${s?.pendingRequests ?? 0} pending`} />
        <StatCard icon={<Image size={16} />} label="Gallery" value={s?.galleryImages ?? 0} loading={loading}
          gradient="linear-gradient(135deg,#993556,#D4537E)" shadowColor="#72243E" sub="Agency photos" />
        <StatCard icon={<Users size={16} />} label="MOM Personnel" value={s?.momPersonnel ?? 0} loading={loading}
          gradient="linear-gradient(135deg,#92400E,#D97706)" shadowColor="#633806" />
      </div>

      {/* ── Bottom: Pie + Quick Actions ─────────────────────────────────── */}
      <div style={{
        display: "grid",
        gridTemplateColumns: isSm ? "1fr" : "1fr 1fr",
        gap: 12,
        flex: isSm ? "none" : 1,
        minHeight: 0,
        alignItems: "start",
      }}>

        {/* LEFT: Maid Roster Breakdown */}
        <div style={{ background: "#fff", border: "1.5px solid #E4E9F0", borderRadius: 16,
          boxShadow: "0 4px 0 #E4E9F0, 0 10px 20px rgba(0,0,0,0.05)",
          padding: "14px 16px 16px", display: "flex", flexDirection: "column", height: 575, boxSizing: "border-box" }}>

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between",
            marginBottom: 14, flexShrink: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
              <div style={{ width: 28, height: 28, borderRadius: 8,
                background: "linear-gradient(135deg,#0D6E56,#1aa37e)",
                display: "flex", alignItems: "center", justifyContent: "center" }}>
                <BarChart3 size={14} color="#fff" />
              </div>
              {/* CHANGED: fontSize 14 → 15, color #111 → #000 */}
              <span style={{ fontSize: 16, fontWeight: 800, color: "#000" }}>Maid Roster Breakdown</span>
            </div>
            {!loading && s && (
              <span style={{ fontSize: 13, fontWeight: 700, color: "#0D6E56",
                background: "#E1F5EE", border: "1px solid #9FE1CB",
                padding: "2px 9px", borderRadius: 20 }}>
                {s.totalMaids} total
              </span>
            )}
          </div>

          <div style={{ flex: 1, display: "flex", alignItems: "center" }}>
            {!loading && s ? (
              <DonutChart total={s.totalMaids} centerLabel="Total Maids"
                slices={slices} size={donutSize} />
            ) : (
              <div style={{ display: "flex", alignItems: "center", gap: 16, width: "100%" }}>
                <div style={{ width: donutSize, height: donutSize, borderRadius: "50%", flexShrink: 0,
                  background: "conic-gradient(#E9ECF0 0%,#D1D5DB 40%,#E9ECF0 40%)" }} />
                <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 12 }}>
                  {[70,50,80,40,60].map((w, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div style={{ width: 10, height: 10, borderRadius: 3, background: "#E9ECF0", flexShrink: 0 }} />
                      <div style={{ flex: 1 }}>
                        <div style={{ height: 10, width: `${w}%`, borderRadius: 5, background: "#E9ECF0", marginBottom: 4 }} />
                        <div style={{ height: 4, borderRadius: 4, background: "#E9ECF0" }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT: Quick Actions */}
        <div style={{ display: "flex", flexDirection: "column", minHeight: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 7,
            marginBottom: 8, flexShrink: 0 }}>
            <div style={{ width: 28, height: 28, borderRadius: 8,
              background: "linear-gradient(135deg,#534AB7,#7F77DD)",
              display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Zap size={14} color="#fff" />
            </div>
            {/* CHANGED: fontSize 14 → 15, color #111 → #000 */}
            <span style={{ fontSize: 16, fontWeight: 800, color: "#000" }}>Quick Actions</span>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
            <MenuCard icon={<Building2 size={17} />} label="Agency Profile"
              desc="View and edit agency details"
              path={adminPath("/agency-profile")} accentColor="#185FA5"
              iconBg="#E6F1FB" iconColor="#185FA5"
              badge={s ? `${s.momPersonnel} MOM · ${s.galleryImages} photos` : undefined} />
            <MenuCard icon={<UserPlus size={17} />} label="Add Maid"
              desc="Register a new maid profile"
              path={adminPath("/add-maid")} accentColor="#0D6E56"
              iconBg="#E1F5EE" iconColor="#0D6E56"
              badge="Register new profiles" />
            <MenuCard icon={<Pencil size={17} />} label="Edit / Delete Maids"
              desc="Manage existing maid records"
              path={adminPath("/edit-maids")} accentColor="#BA7517"
              iconBg="#FEF3E2" iconColor="#BA7517"
              badge={s ? `${s.publicMaids} public · ${s.hiddenMaids} hidden` : undefined} />
            <MenuCard icon={<MessageSquare size={17} />} label="Chat Support"
              desc="Reply to client messages"
              path={adminPath("/chat-support")} accentColor="#534AB7"
              iconBg="#EEEDFE" iconColor="#534AB7"
              badge={s ? (s.unreadAgencyChats > 0 ? `${s.unreadAgencyChats} unread` : "No unread messages") : undefined}
              badgeUrgent={!!s?.unreadAgencyChats && s.unreadAgencyChats > 0} />
            <MenuCard icon={<PhoneIncoming size={17} />} label="Incoming Inquiries"
              desc="Review client enquiries"
              path={adminPath("/enquiry")} accentColor="#993556"
              iconBg="#FBEAF0" iconColor="#993556"
              badge={s ? `${s.enquiries} total` : undefined} />
            <MenuCard icon={<ClipboardList size={17} />} label="Requests"
              desc="View and manage requests"
              path={adminPath("/requests")} accentColor="#0E7490"
              iconBg="#E0F7FA" iconColor="#0E7490"
              badge={s ? `${s.pendingRequests} pending` : undefined}
              badgeUrgent={!!s?.pendingRequests && s.pendingRequests > 0} />
            <MenuCard icon={<Lock size={17} />} label="Change Password"
              desc="Update your account password"
              path={adminPath("/change-password")} accentColor="#444441"
              iconBg="#F1EFE8" iconColor="#444441"
              badge="Keep your account secure" />
          </div>
        </div>

      </div>
    </div>
  );
};

export default HomePage;