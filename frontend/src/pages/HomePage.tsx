import { useEffect, useState, useRef } from "react";
import { Link } from "react-router-dom";
import { adminPath } from "@/lib/routes";
import { toast } from "@/components/ui/sonner";
import { getAgencyAdminAuthHeaders } from "@/lib/agencyAdminAuth";
import {
  Building2, UserPlus, Pencil, MessageSquare, Lock,
  PhoneIncoming, Users, Eye, EyeOff, Image, MessageCircle,
  FileText, ChevronRight, BarChart3, ClipboardList, Zap,
  TrendingUp, ScrollText,
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

/* ─── Stat Card ─────────────────────────────────────────────────────────── */
interface StatCardProps {
  icon: React.ReactNode; label: string; value: number; loading: boolean;
  gradient: string; glowColor: string; sub?: string; subUrgent?: boolean;
  delay?: number;
}

const StatCard = ({ icon, label, value, loading, gradient, glowColor, sub, subUrgent, delay = 0 }: StatCardProps) => {
  const animated = useCountUp(loading ? 0 : value);
  const [visible, setVisible] = useState(false);
  const [hovered, setHovered] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), delay);
    return () => clearTimeout(t);
  }, [delay]);

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: gradient,
        borderRadius: 16,
        padding: "12px 14px 10px",
        position: "relative",
        overflow: "hidden",
        cursor: "default",
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0) scale(1)" : "translateY(12px) scale(0.97)",
        transition: `opacity 0.4s ease ${delay}ms, transform 0.4s cubic-bezier(0.34,1.56,0.64,1) ${delay}ms, box-shadow 0.2s ease`,
        boxShadow: hovered
          ? `0 8px 32px ${glowColor}55, 0 2px 8px rgba(0,0,0,0.12)`
          : `0 4px 16px ${glowColor}30, 0 1px 4px rgba(0,0,0,0.08)`,
      }}
    >
      {/* Shimmer overlay */}
      <div style={{
        position: "absolute", inset: 0, pointerEvents: "none",
        background: "linear-gradient(135deg, rgba(255,255,255,0.18) 0%, transparent 60%)",
        borderRadius: 20,
      }} />
      {/* Decorative circle */}
      <div style={{
        position: "absolute", bottom: -16, right: -16, width: 60, height: 60,
        borderRadius: "50%", background: "rgba(255,255,255,0.1)",
        transition: "transform 0.3s ease",
        transform: hovered ? "scale(1.3)" : "scale(1)",
      }} />
      <div style={{
        position: "absolute", top: -10, right: 30, width: 40, height: 40,
        borderRadius: "50%", background: "rgba(255,255,255,0.07)",
      }} />

      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6, position: "relative" }}>
        <div style={{
          width: 28, height: 28, borderRadius: 9,
          background: "rgba(255,255,255,0.22)",
          backdropFilter: "blur(8px)",
          display: "flex", alignItems: "center", justifyContent: "center",
          color: "#fff", flexShrink: 0,
          boxShadow: "0 2px 8px rgba(0,0,0,0.12)",
          transition: "transform 0.2s ease",
          transform: hovered ? "scale(1.1) rotate(-5deg)" : "scale(1) rotate(0deg)",
        }}>
          {icon}
        </div>
        <p style={{
          fontSize: 10, fontWeight: 700, letterSpacing: "0.08em",
          textTransform: "uppercase", color: "rgba(255,255,255,0.85)", margin: 0,
        }}>
          {label}
        </p>
      </div>

      <p style={{
        fontSize: 28, fontWeight: 900, color: "#fff",
        lineHeight: 1, margin: "0 0 3px",
        position: "relative",
        textShadow: "0 2px 8px rgba(0,0,0,0.15)",
        fontVariantNumeric: "tabular-nums",
      }}>
        {loading ? (
          <span style={{ display: "inline-block", width: 48, height: 36, borderRadius: 8, background: "rgba(255,255,255,0.2)", animation: "shimmer 1.5s ease infinite" }} />
        ) : animated}
      </p>

      {sub && (
        <p style={{
          fontSize: 11, fontWeight: 600,
          color: subUrgent ? "#FFD6D6" : "rgba(255,255,255,0.8)",
          margin: 0, position: "relative",
          display: "flex", alignItems: "center", gap: 4,
        }}>
          {subUrgent && <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#FF6B6B", display: "inline-block", animation: "livePulse 1.6s ease-in-out infinite" }} />}
          {sub}
        </p>
      )}
    </div>
  );
};

/* ─── Donut Chart ───────────────────────────────────────────────────────── */
interface DonutSlice { label: string; value: number; color: string; icon?: React.ReactNode; }
interface DonutChartProps { slices: DonutSlice[]; total: number; centerLabel: string; size?: number; }

const DonutChart = ({ slices, total, centerLabel, size = 200 }: DonutChartProps) => {
  const [hovered, setHovered] = useState<number | null>(null);
  const [animated, setAnimated] = useState(false);
  const R = size * 0.367;
  const cx = size / 2; const cy = size / 2;
  const stroke = size * 0.13;
  const circumference = 2 * Math.PI * R;

  useEffect(() => {
    const t = setTimeout(() => setAnimated(true), 100);
    return () => clearTimeout(t);
  }, []);

  let cumulative = 0;
  const rendered = slices.map((slice, i) => {
    const pct = total > 0 ? slice.value / total : 0;
    const dash = animated ? pct * circumference : 0;
    const gap = circumference - dash;
    const offset = circumference - cumulative * circumference;
    cumulative += pct;
    const isHov = hovered === i;
    return (
      <circle key={i} cx={cx} cy={cy} r={R} fill="none" stroke={slice.color}
        strokeWidth={isHov ? stroke + 5 : stroke}
        strokeLinecap="round"
        strokeDasharray={`${dash} ${gap}`} strokeDashoffset={offset}
        style={{
          transition: "stroke-width 0.25s ease, stroke-dasharray 1s cubic-bezier(.4,0,.2,1)",
          cursor: "pointer",
          filter: isHov ? `drop-shadow(0 0 6px ${slice.color}88)` : "none",
        }}
        onMouseEnter={() => setHovered(i)} onMouseLeave={() => setHovered(null)} />
    );
  });

  const hovSlice = hovered !== null ? slices[hovered] : null;

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 24, width: "100%" }}>
      <div style={{ flexShrink: 0, position: "relative", width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}
          style={{ transform: "rotate(-90deg)" }}>
          <circle cx={cx} cy={cy} r={R} fill="none" stroke="#F0F4F8" strokeWidth={stroke} />
          {rendered}
        </svg>
        <div style={{
          position: "absolute", inset: 0, display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center", pointerEvents: "none",
        }}>
          <span style={{
            fontSize: hovSlice ? size * 0.11 : size * 0.13,
            fontWeight: 900,
            color: hovSlice ? hovSlice.color : "#0F172A",
            transition: "all 0.25s ease",
            fontVariantNumeric: "tabular-nums",
          }}>
            {hovSlice ? hovSlice.value : total}
          </span>
          <span style={{
            fontSize: size * 0.052, fontWeight: 600, color: "#64748B",
            marginTop: 3, textAlign: "center", maxWidth: size * 0.42,
            lineHeight: 1.2,
          }}>
            {hovSlice ? hovSlice.label : centerLabel}
          </span>
        </div>
      </div>

      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
        {slices.map((slice, i) => {
          const pct = total > 0 ? Math.round((slice.value / total) * 100) : 0;
          const isHov = hovered === i;
          return (
            <div key={i}
              style={{
                display: "flex", alignItems: "center", gap: 10, cursor: "pointer",
                opacity: hovered !== null && !isHov ? 0.35 : 1,
                transition: "opacity 0.2s ease",
                padding: "6px 10px",
                borderRadius: 10,
                background: isHov ? `${slice.color}10` : "transparent",
              }}
              onMouseEnter={() => setHovered(i)} onMouseLeave={() => setHovered(null)}>
              <div style={{
                width: 10, height: 10, borderRadius: 4, background: slice.color, flexShrink: 0,
                transform: isHov ? "scale(1.4)" : "scale(1)",
                transition: "transform 0.2s ease",
                boxShadow: isHov ? `0 0 8px ${slice.color}88` : "none",
              }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                  <span style={{
                    fontSize: 13, fontWeight: 600,
                    color: isHov ? slice.color : "#334155",
                    transition: "color 0.2s",
                    whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                  }}>{slice.label}</span>
                  <span style={{ fontSize: 13, fontWeight: 800, color: slice.color, marginLeft: 8, flexShrink: 0 }}>
                    {slice.value}
                  </span>
                </div>
                <div style={{ height: 5, borderRadius: 99, background: "#F1F5F9", overflow: "hidden" }}>
                  <div style={{
                    height: "100%", width: `${animated ? pct : 0}%`,
                    background: `linear-gradient(90deg, ${slice.color}cc, ${slice.color})`,
                    borderRadius: 99,
                    transition: "width 1.2s cubic-bezier(.4,0,.2,1)",
                    boxShadow: isHov ? `0 0 6px ${slice.color}66` : "none",
                  }} />
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
  accentColor: string; iconBg: string; iconColor: string;
  badge?: string; badgeUrgent?: boolean; delay?: number;
}

const MenuCard = ({ icon, label, desc, path, accentColor, iconBg, iconColor, badge, badgeUrgent, delay = 0 }: MenuCardProps) => {
  const [hovered, setHovered] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), delay);
    return () => clearTimeout(t);
  }, [delay]);

  return (
    <Link
      to={path}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: "flex", alignItems: "center", gap: 9,
        background: hovered ? "#FAFBFF" : "#fff",
        border: `1.5px solid ${hovered ? accentColor + "40" : "#EEF2F7"}`,
        borderLeft: `3px solid ${accentColor}`,
        borderRadius: 12, padding: "9px 11px",
        textDecoration: "none", color: "inherit",
        transition: "all 0.2s cubic-bezier(0.34,1.56,0.64,1)",
        transform: visible ? (hovered ? "translateX(4px)" : "translateX(0)") : "translateX(-8px)",
        opacity: visible ? 1 : 0,
        boxShadow: hovered
          ? `0 4px 20px rgba(0,0,0,0.08), -2px 0 0 ${accentColor}`
          : "0 1px 4px rgba(0,0,0,0.04)",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Hover shimmer */}
      {hovered && (
        <div style={{
          position: "absolute", inset: 0, pointerEvents: "none",
          background: `linear-gradient(90deg, ${accentColor}06 0%, transparent 60%)`,
        }} />
      )}

      <div style={{
        width: 32, height: 32, borderRadius: 9,
        background: hovered ? accentColor : iconBg,
        display: "flex", alignItems: "center", justifyContent: "center",
        flexShrink: 0, color: hovered ? "#fff" : iconColor,
        transition: "all 0.25s ease",
        boxShadow: hovered ? `0 4px 12px ${accentColor}44` : "none",
      }}>
        {icon}
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 1 }}>
          <p style={{
            fontSize: 12, fontWeight: 700,
            color: hovered ? accentColor : "#0F172A",
            margin: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
            transition: "color 0.2s",
          }}>{label}</p>
          {badge && (
            <span style={{
              fontSize: 10, fontWeight: 700, padding: "1px 6px",
              borderRadius: 20, flexShrink: 0,
              background: badgeUrgent ? "#FEF2F2" : "#F8FAFC",
              color: badgeUrgent ? "#DC2626" : "#64748B",
              border: `1px solid ${badgeUrgent ? "#FECACA" : "#E2E8F0"}`,
            }}>{badge}</span>
          )}
        </div>
        <p style={{ fontSize: 11, color: "#94A3B8", margin: 0 }}>{desc}</p>
      </div>

      <ChevronRight size={15} style={{
        flexShrink: 0, color: hovered ? accentColor : "#CBD5E1",
        transition: "all 0.2s ease",
        transform: hovered ? "translateX(3px)" : "translateX(0)",
      }} />
    </Link>
  );
};

/* ─── Section Header ────────────────────────────────────────────────────── */
const SectionHeader = ({ icon, label, iconGradient, badge }: {
  icon: React.ReactNode; label: string; iconGradient: string; badge?: React.ReactNode;
}) => (
  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
    <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
      <div style={{
        width: 26, height: 26, borderRadius: 8,
        background: iconGradient,
        display: "flex", alignItems: "center", justifyContent: "center",
        boxShadow: "0 3px 8px rgba(0,0,0,0.12)",
      }}>
        {icon}
      </div>
      <span style={{ fontSize: 13, fontWeight: 800, color: "#0F172A", letterSpacing: "-0.01em" }}>{label}</span>
    </div>
    {badge}
  </div>
);

/* ─── Skeleton Loader ───────────────────────────────────────────────────── */
const SkeletonCard = () => (
  <div style={{
    borderRadius: 16, padding: "12px 14px", background: "#F1F5F9",
    animation: "shimmer 1.5s ease infinite",
  }}>
    <div style={{ width: 80, height: 10, borderRadius: 5, background: "#E2E8F0", marginBottom: 12 }} />
    <div style={{ width: 50, height: 32, borderRadius: 8, background: "#E2E8F0", marginBottom: 8 }} />
    <div style={{ width: 100, height: 8, borderRadius: 4, background: "#E2E8F0" }} />
  </div>
);

/* ─── Main Component ────────────────────────────────────────────────────── */
const HomePage = () => {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const width = useWindowWidth();

  const isSm = width < 768;
  const isMd = width < 1024;

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
  const statCols = isSm ? 2 : 4;
  const donutSize = isSm ? 150 : isMd ? 165 : 200;

  const slices = s ? [
    { label: "Public Maids",     value: s.publicMaids,     color: "#10B981" },
    { label: "Hidden Maids",     value: s.hiddenMaids,     color: "#F59E0B" },
    { label: "With Photos",      value: s.maidsWithPhotos, color: "#3B82F6" },
    { label: "Enquiries",        value: s.enquiries,       color: "#EC4899" },
    { label: "Pending Requests", value: s.pendingRequests, color: "#8B5CF6" },
  ] : [];

  return (
    <div style={{
      padding: isSm ? "12px 12px 24px" : "12px 16px 12px",
      background: "#F8FAFC",
      minHeight: "100vh",
      height: isSm ? "auto" : "100vh",
      boxSizing: "border-box",
      display: "flex",
      flexDirection: "column",
      overflow: isSm ? "visible" : "hidden",
      gap: 10,
    }}>
      <style>{`
        @keyframes livePulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.4;transform:scale(1.7)} }
        @keyframes shimmer { 0%,100%{opacity:1} 50%{opacity:0.5} }
        @keyframes fadeSlideDown { from{opacity:0;transform:translateY(-10px)} to{opacity:1;transform:translateY(0)} }
      `}</style>

      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        flexShrink: 0,
        animation: "fadeSlideDown 0.4s ease both",
      }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 2 }}>
            <div style={{
              width: 30, height: 30, borderRadius: 10,
              background: "linear-gradient(135deg, #0D6E56, #1aa37e)",
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: "0 3px 10px rgba(13,110,86,0.3)",
            }}>
              <TrendingUp size={15} color="#fff" />
            </div>
            <div>
              <h2 style={{ fontSize: isSm ? 17 : 18, fontWeight: 900, color: "#0F172A", margin: 0, lineHeight: 1, letterSpacing: "-0.02em" }}>
                Dashboard
              </h2>
              <p style={{ fontSize: 11, color: "#94A3B8", margin: 0, marginTop: 1, fontWeight: 500 }}>
                Agency overview at a glance
              </p>
            </div>
          </div>
        </div>

        {/* Live badge */}
        <div style={{
          display: "flex", alignItems: "center", gap: 5,
          background: "#fff",
          border: "1.5px solid #D1FAE5",
          borderRadius: 99, padding: "4px 10px",
          boxShadow: "0 2px 8px rgba(16,185,129,0.12)",
        }}>
          <span style={{
            width: 6, height: 6, borderRadius: "50%", background: "#10B981",
            display: "inline-block", animation: "livePulse 1.8s ease-in-out infinite",
            boxShadow: "0 0 6px rgba(16,185,129,0.5)",
          }} />
          <span style={{ fontSize: 11, fontWeight: 700, color: "#059669", letterSpacing: "0.04em" }}>LIVE</span>
        </div>
      </div>

      {/* ── Stat Cards Row 1 ──────────────────────────────────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: `repeat(${statCols}, 1fr)`, gap: 8, flexShrink: 0 }}>
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)
        ) : (
          <>
            <StatCard icon={<Users size={14} />} label="Total Maids" value={s?.totalMaids ?? 0} loading={loading}
              gradient="linear-gradient(135deg, #059669, #10B981)" glowColor="#10B981" delay={0}
              sub={`${s?.maidsWithPhotos ?? 0} with photos`} />
            <StatCard icon={<Eye size={14} />} label="Public" value={s?.publicMaids ?? 0} loading={loading}
              gradient="linear-gradient(135deg, #1D4ED8, #3B82F6)" glowColor="#3B82F6" delay={60}
              sub="Visible to clients" />
            <StatCard icon={<EyeOff size={14} />} label="Hidden" value={s?.hiddenMaids ?? 0} loading={loading}
              gradient="linear-gradient(135deg, #D97706, #F59E0B)" glowColor="#F59E0B" delay={120}
              sub="Not listed" />
            <StatCard icon={<MessageCircle size={14} />} label="Unread Chats" value={s?.unreadAgencyChats ?? 0} loading={loading}
              gradient={s?.unreadAgencyChats
                ? "linear-gradient(135deg, #B91C1C, #EF4444)"
                : "linear-gradient(135deg, #15803D, #22C55E)"}
              glowColor={s?.unreadAgencyChats ? "#EF4444" : "#22C55E"} delay={180}
              sub={s?.unreadAgencyChats ? "Needs attention" : "All caught up"}
              subUrgent={!!s?.unreadAgencyChats} />
          </>
        )}
      </div>

      {/* ── Stat Cards Row 2 ──────────────────────────────────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: `repeat(${statCols}, 1fr)`, gap: 8, flexShrink: 0 }}>
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)
        ) : (
          <>
            <StatCard icon={<PhoneIncoming size={14} />} label="Enquiries" value={s?.enquiries ?? 0} loading={loading}
              gradient="linear-gradient(135deg, #6D28D9, #8B5CF6)" glowColor="#8B5CF6" delay={60} />
            <StatCard icon={<FileText size={14} />} label="Requests" value={s?.requests ?? 0} loading={loading}
              gradient="linear-gradient(135deg, #0E7490, #06B6D4)" glowColor="#06B6D4" delay={120}
              sub={`${s?.pendingRequests ?? 0} pending`} />
            <StatCard icon={<Image size={14} />} label="Gallery" value={s?.galleryImages ?? 0} loading={loading}
              gradient="linear-gradient(135deg, #BE185D, #EC4899)" glowColor="#EC4899" delay={180}
              sub="Agency photos" />
            <StatCard icon={<Users size={14} />} label="MOM Personnel" value={s?.momPersonnel ?? 0} loading={loading}
              gradient="linear-gradient(135deg, #92400E, #D97706)" glowColor="#D97706" delay={240} />
          </>
        )}
      </div>

      {/* ── Bottom: Chart + Quick Actions ────────────────────────────────── */}
      <div style={{
        display: "grid",
        gridTemplateColumns: isSm ? "1fr" : "1fr 1fr",
        gap: 10,
        flex: isSm ? "none" : 1,
        minHeight: 0,
        alignItems: "start",
      }}>

        {/* LEFT: Maid Roster Breakdown */}
        <div style={{
          background: "#fff",
          border: "1.5px solid #EEF2F7",
          borderRadius: 16,
          boxShadow: "0 4px 24px rgba(0,0,0,0.04)",
          padding: "14px 16px",
          display: "flex", flexDirection: "column",
          height: isSm ? "auto" : "100%",
          minHeight: isSm ? 340 : undefined,
          boxSizing: "border-box",
        }}>
          <SectionHeader
            icon={<BarChart3 size={13} color="#fff" />}
            label="Maid Roster Breakdown"
            iconGradient="linear-gradient(135deg, #059669, #10B981)"
            badge={!loading && s ? (
              <span style={{
                fontSize: 12, fontWeight: 700, color: "#059669",
                background: "#ECFDF5", border: "1.5px solid #A7F3D0",
                padding: "3px 10px", borderRadius: 99,
              }}>
                {s.totalMaids} total
              </span>
            ) : undefined}
          />

          <div style={{ flex: 1, display: "flex", alignItems: "center" }}>
            {!loading && s ? (
              <DonutChart total={s.totalMaids} centerLabel="Total Maids" slices={slices} size={donutSize} />
            ) : (
              <div style={{ display: "flex", alignItems: "center", gap: 20, width: "100%" }}>
                <div style={{
                  width: donutSize, height: donutSize, borderRadius: "50%", flexShrink: 0,
                  background: "#F1F5F9", animation: "shimmer 1.5s ease infinite",
                }} />
                <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 12 }}>
                  {[70, 50, 80, 40, 60].map((w, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{ width: 10, height: 10, borderRadius: 4, background: "#E2E8F0", flexShrink: 0 }} />
                      <div style={{ flex: 1 }}>
                        <div style={{ height: 11, width: `${w}%`, borderRadius: 99, background: "#E2E8F0", marginBottom: 5, animation: "shimmer 1.5s ease infinite" }} />
                        <div style={{ height: 5, borderRadius: 99, background: "#F1F5F9" }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT: Quick Actions */}
        <div style={{ display: "flex", flexDirection: "column", minHeight: 0, gap: 8 }}>
          <SectionHeader
            icon={<Zap size={13} color="#fff" />}
            label="Quick Actions"
            iconGradient="linear-gradient(135deg, #6D28D9, #8B5CF6)"
          />

          <div style={{
            display: "flex", flexDirection: "column", gap: 6,
            overflowY: "auto", flex: 1,
            paddingRight: 2,
            scrollbarWidth: "thin",
            scrollbarColor: "#CBD5E1 transparent",
          }}>
            <MenuCard icon={<Building2 size={14} />} label="Our Profile"
              desc="Agency info & branding"
              path={adminPath("/agency-profile")} accentColor="#1D4ED8"
              iconBg="#EFF6FF" iconColor="#1D4ED8" delay={0}
              badge={s ? `${s.momPersonnel} MOM · ${s.galleryImages} photos` : undefined} />
            <MenuCard icon={<UserPlus size={14} />} label="New Maid"
              desc="Add a maid to the roster"
              path={adminPath("/add-maid")} accentColor="#059669"
              iconBg="#ECFDF5" iconColor="#059669" delay={40} />
            <MenuCard icon={<Pencil size={14} />} label="Manage Maids"
              desc="Edit, hide, or remove profiles"
              path={adminPath("/edit-maids")} accentColor="#D97706"
              iconBg="#FFFBEB" iconColor="#D97706" delay={80}
              badge={s ? `${s.publicMaids} live · ${s.hiddenMaids} hidden` : undefined} />
            <MenuCard icon={<MessageSquare size={14} />} label="Messages"
              desc="Respond to client chats"
              path={adminPath("/chat-support")} accentColor="#6D28D9"
              iconBg="#F5F3FF" iconColor="#6D28D9" delay={120}
              badge={s ? (s.unreadAgencyChats > 0 ? `${s.unreadAgencyChats} unread` : "All read") : undefined}
              badgeUrgent={!!s?.unreadAgencyChats && s.unreadAgencyChats > 0} />
            <MenuCard icon={<Lock size={14} />} label="Security"
              desc="Change your password"
              path={adminPath("/change-password")} accentColor="#475569"
              iconBg="#F8FAFC" iconColor="#475569" delay={160} />
            <MenuCard icon={<ScrollText size={14} />} label="Contracts"
              desc="View employment contracts"
              path={adminPath("/employment-contracts")} accentColor="#0F766E"
              iconBg="#F0FDFA" iconColor="#0F766E" delay={200} />
            <MenuCard icon={<PhoneIncoming size={14} />} label="Enquiries"
              desc="See who's reaching out"
              path={adminPath("/enquiry")} accentColor="#BE185D"
              iconBg="#FDF2F8" iconColor="#BE185D" delay={240}
              badge={s ? `${s.enquiries} total` : undefined} />
            <MenuCard icon={<ClipboardList size={14} />} label="Requests"
              desc="Track & fulfill bookings"
              path={adminPath("/requests")} accentColor="#0E7490"
              iconBg="#ECFEFF" iconColor="#0E7490" delay={280}
              badge={s ? `${s.pendingRequests} pending` : undefined}
              badgeUrgent={!!s?.pendingRequests && s.pendingRequests > 0} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default HomePage;