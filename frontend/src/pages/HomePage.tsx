import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { adminPath } from "@/lib/routes";
import { toast } from "@/components/ui/sonner";
import { getAgencyAdminAuthHeaders } from "@/lib/agencyAdminAuth";
import {
  Building2, UserPlus, Pencil, MessageSquare, Lock,
  PhoneIncoming, Users, Eye, EyeOff, Image, MessageCircle,
  FileText, BarChart3, ClipboardList, Zap,
  TrendingUp, ScrollText, ArrowUpRight,
} from "lucide-react";

interface DashboardSummary {
  publicMaids: number; hiddenMaids: number; totalMaids: number;
  maidsWithPhotos: number; enquiries: number; requests: number;
  pendingRequests: number; unreadAgencyChats: number;
  momPersonnel: number; testimonials: number; galleryImages: number;
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

const useWindowHeight = () => {
  const [h, setH] = useState(typeof window !== "undefined" ? window.innerHeight : 768);
  useEffect(() => {
    const handler = () => setH(window.innerHeight);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);
  return h;
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

/* ─── Stat Card ─────────────────────────────────────────────────────────── */
interface StatCardProps {
  icon: React.ReactNode; label: string; value: number; loading: boolean;
  gradient: string; glowColor: string; sub?: string; subUrgent?: boolean;
  delay?: number; compact?: boolean;
}

const StatCard = ({ icon, label, value, loading, gradient, glowColor, sub, subUrgent, delay = 0, compact = false }: StatCardProps) => {
  const animated = useCountUp(loading ? 0 : value);
  const [visible, setVisible] = useState(false);
  const [hovered, setHovered] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), delay);
    return () => clearTimeout(t);
  }, [delay]);

  const pad = compact ? "9px 11px 7px" : "11px 13px 9px";
  const numSize = compact ? 26 : 30;
  const iconSize = compact ? 26 : 28;

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: gradient, borderRadius: 14, padding: pad,
        position: "relative", overflow: "hidden", cursor: "default",
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0) scale(1)" : "translateY(12px) scale(0.97)",
        transition: `opacity 0.4s ease ${delay}ms, transform 0.4s cubic-bezier(0.34,1.56,0.64,1) ${delay}ms, box-shadow 0.2s ease`,
        boxShadow: hovered
          ? `0 8px 32px ${glowColor}55, 0 2px 8px rgba(0,0,0,0.15)`
          : `0 4px 16px ${glowColor}30, 0 1px 4px rgba(0,0,0,0.10)`,
        minWidth: 0,
        boxSizing: "border-box",
      }}
    >
      <div style={{ position: "absolute", inset: 0, pointerEvents: "none", background: "linear-gradient(135deg, rgba(255,255,255,0.18) 0%, transparent 60%)", borderRadius: 14 }} />
      <div style={{ position: "absolute", bottom: -14, right: -14, width: 56, height: 56, borderRadius: "50%", background: "rgba(255,255,255,0.1)", transition: "transform 0.3s ease", transform: hovered ? "scale(1.3)" : "scale(1)" }} />
      <div style={{ position: "absolute", top: -8, right: 26, width: 36, height: 36, borderRadius: "50%", background: "rgba(255,255,255,0.07)" }} />

      <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: compact ? 4 : 5, position: "relative" }}>
        <div style={{
          width: iconSize, height: iconSize, borderRadius: 8, background: "rgba(255,255,255,0.22)",
          backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center",
          color: "#fff", flexShrink: 0, boxShadow: "0 2px 8px rgba(0,0,0,0.12)",
          transition: "transform 0.2s ease",
          transform: hovered ? "scale(1.1) rotate(-5deg)" : "scale(1) rotate(0deg)",
        }}>{icon}</div>
        <p style={{ fontSize: compact ? 10 : 11, fontWeight: 800, letterSpacing: "0.07em", textTransform: "uppercase", color: "rgba(255,255,255,1)", margin: 0, textShadow: "0 1px 3px rgba(0,0,0,0.2)" }}>{label}</p>
      </div>

      <p style={{ fontSize: numSize, fontWeight: 900, color: "#fff", lineHeight: 1, margin: compact ? "0 0 3px" : "0 0 4px", position: "relative", textShadow: "0 2px 8px rgba(0,0,0,0.2)", fontVariantNumeric: "tabular-nums" }}>
        {loading ? <span style={{ display: "inline-block", width: 40, height: 28, borderRadius: 6, background: "rgba(255,255,255,0.2)", animation: "shimmer 1.5s ease infinite" }} /> : animated}
      </p>

      {sub && (
        <p style={{ fontSize: compact ? 10 : 11, fontWeight: 700, color: subUrgent ? "#FFD6D6" : "rgba(255,255,255,1)", margin: 0, position: "relative", display: "flex", alignItems: "center", gap: 4, textShadow: "0 1px 2px rgba(0,0,0,0.15)" }}>
          {subUrgent && <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#FF6B6B", display: "inline-block", animation: "livePulse 1.6s ease-in-out infinite" }} />}
          {sub}
        </p>
      )}
    </div>
  );
};

/* ─── Donut Chart ──────────────────────────────────────────────────────── */
interface DonutSlice { label: string; value: number; color: string; }
interface DonutChartProps { slices: DonutSlice[]; total: number; centerLabel: string; size?: number; }

const DonutChart = ({ slices, total, centerLabel, size = 200 }: DonutChartProps) => {
  const [hovered, setHovered] = useState<number | null>(null);
  const [animated, setAnimated] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setAnimated(true), 150);
    return () => clearTimeout(t);
  }, []);

  const sliceSum = slices.reduce((acc, s) => acc + s.value, 0);
  const BASE_STROKE = size * 0.115;
  const HOVER_EXTRA = 5;
  const PAD = Math.ceil((HOVER_EXTRA / 2) + 2);
  const R = (size - BASE_STROKE) / 2;
  const cx = size / 2;
  const cy = size / 2;
  const circumference = 2 * Math.PI * R;
  const GAP = sliceSum > 0 ? circumference * 0.012 : 0;

  let cumulativePct = 0;
  const sliceData = slices.map((slice) => {
    const arcPct = sliceSum > 0 ? slice.value / sliceSum : 0;
    const legPct = sliceSum > 0 ? slice.value / sliceSum : 0;
    const startPct = cumulativePct;
    cumulativePct += arcPct;
    return { ...slice, arcPct, legPct, startPct };
  });

  const hovSlice = hovered !== null ? sliceData[hovered] : null;

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 16, width: "100%" }}>
      <div style={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
        <svg
          width={size} height={size}
          viewBox={`${-PAD} ${-PAD} ${size + PAD * 2} ${size + PAD * 2}`}
          style={{ transform: "rotate(-90deg)", display: "block", overflow: "visible" }}
        >
          <circle cx={cx} cy={cy} r={R} fill="none" stroke="#EEF2F7" strokeWidth={BASE_STROKE} />
          {total === 0 ? (
            <circle cx={cx} cy={cy} r={R} fill="none" stroke="#E2E8F0" strokeWidth={BASE_STROKE} />
          ) : (
            sliceData.map((slice, i) => {
              if (slice.value === 0) return null;
              const isHov = hovered === i;
              const strokeWidth = isHov ? BASE_STROKE + HOVER_EXTRA : BASE_STROKE;
              const arcLen = animated ? Math.max(0, slice.arcPct * circumference - GAP) : 0;
              const offset = circumference - slice.startPct * circumference;
              return (
                <circle key={i} cx={cx} cy={cy} r={R} fill="none" stroke={slice.color}
                  strokeWidth={strokeWidth} strokeLinecap="butt"
                  strokeDasharray={`${arcLen} ${circumference - arcLen}`}
                  strokeDashoffset={offset}
                  style={{ transition: `stroke-dasharray 1.1s cubic-bezier(.4,0,.2,1) ${i * 70}ms, stroke-width 0.2s ease`, cursor: "pointer", filter: isHov ? `drop-shadow(0 0 7px ${slice.color}99)` : "none" }}
                  onMouseEnter={() => setHovered(i)}
                  onMouseLeave={() => setHovered(null)}
                />
              );
            })
          )}
        </svg>
        <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", pointerEvents: "none" }}>
          <span style={{ fontSize: hovSlice ? size * 0.13 : size * 0.17, fontWeight: 900, color: hovSlice ? hovSlice.color : "#0A0F1E", transition: "all 0.25s ease", fontVariantNumeric: "tabular-nums", lineHeight: 1 }}>
            {hovSlice ? hovSlice.value : total}
          </span>
          <span style={{ fontSize: size * 0.068, fontWeight: 700, color: hovSlice ? hovSlice.color : "#1E293B", marginTop: 3, textAlign: "center", maxWidth: size * 0.52, lineHeight: 1.2, transition: "all 0.25s ease" }}>
            {hovSlice ? hovSlice.label : centerLabel}
          </span>
          {hovSlice && (
            <span style={{ fontSize: size * 0.058, fontWeight: 700, color: hovSlice.color, marginTop: 2, opacity: 0.75 }}>
              {sliceSum > 0 ? Math.round((hovSlice.value / sliceSum) * 100) : 0}%
            </span>
          )}
        </div>
      </div>

      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 4, minWidth: 0 }}>
        {sliceData.map((slice, i) => {
          const rawPcts = sliceData.map((s) => Math.round(s.legPct * 100));
          const roundedSum = rawPcts.reduce((a, b) => a + b, 0);
          const correction = 100 - roundedSum;
          const pct = i === sliceData.length - 1 ? rawPcts[i] + correction : rawPcts[i];
          const isHov = hovered === i;
          return (
            <div key={i}
              style={{ display: "flex", alignItems: "center", gap: 7, cursor: "pointer", padding: "4px 7px", borderRadius: 8, background: isHov ? `${slice.color}12` : "transparent", border: `1.5px solid ${isHov ? slice.color + "30" : "transparent"}`, opacity: hovered !== null && !isHov ? 0.38 : 1, transition: "all 0.2s ease" }}
              onMouseEnter={() => setHovered(i)} onMouseLeave={() => setHovered(null)}
            >
              <div style={{ width: 8, height: 11, borderRadius: 3, background: slice.color, flexShrink: 0, transform: isHov ? "scale(1.35)" : "scale(1)", transition: "transform 0.2s ease", boxShadow: isHov ? `0 0 7px ${slice.color}99` : "none" }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 3 }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: isHov ? slice.color : "#1E293B", transition: "color 0.2s", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "55%" }}>{slice.label}</span>
                  <div style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
                    <span style={{ fontSize: 13, fontWeight: 800, color: slice.color }}>{slice.value}</span>
                    <span style={{ fontSize: 11, fontWeight: 700, color: isHov ? slice.color : "#334155", background: isHov ? `${slice.color}18` : "#F1F5F9", border: `1px solid ${isHov ? slice.color + "40" : "#CBD5E1"}`, padding: "1px 5px", borderRadius: 99, transition: "all 0.2s ease", minWidth: 28, textAlign: "center" }}>{pct}%</span>
                  </div>
                </div>
                <div style={{ height: 5, borderRadius: 99, background: "#EEF2F7", overflow: "hidden", boxShadow: "inset 0 1px 2px rgba(0,0,0,0.05)" }}>
                  <div style={{ height: "100%", width: `${animated ? pct : 0}%`, background: `linear-gradient(90deg, ${slice.color}aa, ${slice.color})`, borderRadius: 99, transition: `width 1.3s cubic-bezier(.4,0,.2,1) ${i * 90}ms`, boxShadow: isHov ? `0 0 6px ${slice.color}55` : "none" }} />
                </div>
              </div>
            </div>
          );
        })}
        <div style={{ display: "flex", justifyContent: "flex-end", paddingRight: 7, marginTop: 1 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: "#475569", background: "#F1F5F9", border: "1px solid #CBD5E1", padding: "2px 6px", borderRadius: 99, letterSpacing: "0.04em" }}>∑ 100%</span>
        </div>
      </div>
    </div>
  );
};

/* ─── Quick Action Card ─────────────────────────────────────────────────── */
interface MenuCardProps {
  icon: React.ReactNode; label: string; desc: string; path: string;
  accentColor: string; gradientFrom: string; gradientTo: string;
  badge?: string; badgeUrgent?: boolean; delay?: number; compact?: boolean;
}

const MenuCard = ({ icon, label, desc, path, accentColor, gradientFrom, gradientTo, badge, badgeUrgent, delay = 0, compact = false }: MenuCardProps) => {
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
        display: "flex", flexDirection: "column",
        background: hovered
          ? `linear-gradient(145deg, ${gradientFrom}, ${gradientTo})`
          : "#fff",
        border: `1.5px solid ${hovered ? "transparent" : "#E2E8F0"}`,
        borderRadius: 12,
        padding: compact ? "9px 10px 8px" : "11px 11px 9px",
        textDecoration: "none", color: "inherit",
        transition: "all 0.25s cubic-bezier(0.34,1.56,0.64,1)",
        transform: visible
          ? (hovered ? "translateY(-3px)" : "translateY(0)")
          : "translateY(10px)",
        opacity: visible ? 1 : 0,
        boxShadow: hovered
          ? `0 8px 24px ${accentColor}40, 0 2px 8px rgba(0,0,0,0.08)`
          : "0 1px 3px rgba(0,0,0,0.06)",
        position: "relative",
        minHeight: compact ? 84 : 96,
        minWidth: 0,
        boxSizing: "border-box",
      }}
    >
      {/* Decorative blobs */}
      <div style={{ position: "absolute", inset: 0, borderRadius: 12, overflow: "hidden", pointerEvents: "none" }}>
        <div style={{
          position: "absolute", bottom: -16, right: -16, width: 64, height: 64,
          borderRadius: "50%",
          background: hovered ? "rgba(255,255,255,0.13)" : `${accentColor}0D`,
          transition: "all 0.35s ease",
          transform: hovered ? "scale(1.25)" : "scale(1)",
        }} />
        <div style={{
          position: "absolute", top: -12, left: -12, width: 42, height: 42,
          borderRadius: "50%",
          background: hovered ? "rgba(255,255,255,0.07)" : `${accentColor}08`,
          transition: "all 0.35s ease",
        }} />
      </div>

      {/* Top row: icon + arrow */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: compact ? 6 : 8, position: "relative" }}>
        <div style={{
          width: compact ? 32 : 36, height: compact ? 32 : 36, borderRadius: 10,
          background: hovered ? "rgba(255,255,255,0.22)" : `${accentColor}18`,
          display: "flex", alignItems: "center", justifyContent: "center",
          color: hovered ? "#fff" : accentColor,
          transition: "all 0.25s ease",
          boxShadow: hovered ? "0 4px 14px rgba(0,0,0,0.18)" : `0 2px 6px ${accentColor}20`,
          flexShrink: 0,
        }}>
          {icon}
        </div>
        <div style={{
          width: 22, height: 22, borderRadius: 6,
          background: hovered ? "rgba(255,255,255,0.2)" : "#EEF2F7",
          display: "flex", alignItems: "center", justifyContent: "center",
          transition: "all 0.25s ease",
          transform: hovered ? "translate(2px, -2px)" : "translate(0,0)",
          boxShadow: hovered ? "0 2px 8px rgba(0,0,0,0.12)" : "none",
          flexShrink: 0,
        }}>
          <ArrowUpRight size={12} color={hovered ? "#fff" : "#475569"} />
        </div>
      </div>

      {/* Label */}
      <p style={{
        fontSize: compact ? 12 : 13, fontWeight: 800,
        color: hovered ? "#fff" : "#0F172A",
        margin: "0 0 2px",
        transition: "color 0.2s",
        whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
        letterSpacing: "-0.01em",
        position: "relative",
      }}>{label}</p>

      {/* Desc */}
      <p style={{
        fontSize: compact ? 11 : 12, fontWeight: 600,
        color: hovered ? "rgba(255,255,255,0.80)" : "#64748B",
        margin: 0,
        whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
        position: "relative",
      }}>{desc}</p>

      {/* Badge */}
      {badge && (
        <div style={{ marginTop: 5, position: "relative" }}>
          <span style={{
            fontSize: 9, fontWeight: 800,
            padding: "2px 7px", borderRadius: 20,
            background: hovered
              ? (badgeUrgent ? "rgba(220,38,38,0.28)" : "rgba(255,255,255,0.2)")
              : (badgeUrgent ? "#FEF2F2" : "#F1F5F9"),
            color: hovered
              ? (badgeUrgent ? "#FFC9C9" : "rgba(255,255,255,0.95)")
              : (badgeUrgent ? "#991B1B" : "#1E293B"),
            border: `1px solid ${hovered
              ? (badgeUrgent ? "rgba(239,68,68,0.4)" : "rgba(255,255,255,0.28)")
              : (badgeUrgent ? "#FECACA" : "#CBD5E1")}`,
            display: "inline-flex", alignItems: "center", gap: 4,
            transition: "all 0.2s ease",
          }}>
            {badgeUrgent && (
              <span style={{ width: 5, height: 5, borderRadius: "50%", background: hovered ? "#FFA0A0" : "#EF4444", display: "inline-block", animation: "livePulse 1.6s ease-in-out infinite" }} />
            )}
            {badge}
          </span>
        </div>
      )}
    </Link>
  );
};

/* ─── Section Header ────────────────────────────────────────────────────── */
const SectionHeader = ({ icon, label, iconGradient, badge }: {
  icon: React.ReactNode; label: string; iconGradient: string; badge?: React.ReactNode;
}) => (
  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <div style={{ width: 24, height: 24, borderRadius: 7, background: iconGradient, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 3px 8px rgba(0,0,0,0.15)" }}>
        {icon}
      </div>
      <span style={{ fontSize: 13, fontWeight: 900, color: "#0A0F1E", letterSpacing: "-0.02em" }}>{label}</span>
    </div>
    {badge}
  </div>
);

/* ─── Skeletons ─────────────────────────────────────────────────────────── */
const SkeletonCard = () => (
  <div style={{ borderRadius: 14, padding: "10px 12px", background: "#F1F5F9", animation: "shimmer 1.5s ease infinite" }}>
    <div style={{ width: 80, height: 8, borderRadius: 4, background: "#E2E8F0", marginBottom: 10 }} />
    <div style={{ width: 44, height: 26, borderRadius: 6, background: "#E2E8F0", marginBottom: 6 }} />
    <div style={{ width: 90, height: 7, borderRadius: 4, background: "#E2E8F0" }} />
  </div>
);

const SkeletonMenuCard = () => (
  <div style={{ borderRadius: 12, padding: "10px", background: "#F8FAFC", border: "1.5px solid #E2E8F0", animation: "shimmer 1.5s ease infinite", minWidth: 0, boxSizing: "border-box" }}>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
      <div style={{ width: 34, height: 34, borderRadius: 10, background: "#E2E8F0" }} />
      <div style={{ width: 22, height: 22, borderRadius: 6, background: "#EEF2F7" }} />
    </div>
    <div style={{ width: "68%", height: 10, borderRadius: 4, background: "#E2E8F0", marginBottom: 5 }} />
    <div style={{ width: "50%", height: 8, borderRadius: 4, background: "#EEF2F7" }} />
  </div>
);

/* ─── Main ──────────────────────────────────────────────────────────────── */
const HomePage = () => {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const width = useWindowWidth();
  const height = useWindowHeight();
  const isSm = width < 768;
  const isMd = width < 1024;

  // Detect short viewports and scale down further
  const isShort = height < 700;
  const compact = isShort || isMd;

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
  const donutSize = isSm ? 130 : isShort ? 140 : isMd ? 155 : 175;

  const slices = s ? [
    { label: "Public Maids",     value: s.publicMaids,     color: "#10B981" },
    { label: "Hidden Maids",     value: s.hiddenMaids,     color: "#F59E0B" },
    { label: "With Photos",      value: s.maidsWithPhotos, color: "#3B82F6" },
    { label: "Enquiries",        value: s.enquiries,       color: "#EC4899" },
    { label: "Pending Requests", value: s.pendingRequests, color: "#8B5CF6" },
  ] : [];

  const menuCards = [
    { icon: <Building2 size={14} />,     label: "Our Profile",   desc: "Agency info & branding",  path: adminPath("/agency-profile"),       accentColor: "#1D4ED8", gradientFrom: "#1E40AF", gradientTo: "#3B82F6", badge: s ? `${s.momPersonnel} MOM` : undefined,                          badgeUrgent: false },
    { icon: <UserPlus size={14} />,      label: "New Maid",      desc: "Add to roster",            path: adminPath("/add-maid"),             accentColor: "#059669", gradientFrom: "#047857", gradientTo: "#10B981", badge: undefined,                                                          badgeUrgent: false },
    { icon: <Pencil size={14} />,        label: "Manage Maids",  desc: "Edit or remove profiles",  path: adminPath("/edit-maids"),           accentColor: "#B45309", gradientFrom: "#92400E", gradientTo: "#D97706", badge: s ? `${s.publicMaids} live` : undefined,                          badgeUrgent: false },
    { icon: <MessageSquare size={14} />, label: "Messages",      desc: "Respond to clients",       path: adminPath("/chat-support"),         accentColor: "#6D28D9", gradientFrom: "#4C1D95", gradientTo: "#7C3AED", badge: s?.unreadAgencyChats ? `${s.unreadAgencyChats} unread` : undefined, badgeUrgent: !!(s?.unreadAgencyChats && s.unreadAgencyChats > 0) },
    { icon: <Lock size={14} />,          label: "Security",      desc: "Change password",          path: adminPath("/change-password"),      accentColor: "#334155", gradientFrom: "#0F172A", gradientTo: "#334155", badge: undefined,                                                          badgeUrgent: false },
    { icon: <ScrollText size={14} />,    label: "Contracts",     desc: "Employment contracts",     path: adminPath("/employment-contracts"), accentColor: "#0F766E", gradientFrom: "#134E4A", gradientTo: "#0D9488", badge: undefined,                                                          badgeUrgent: false },
    { icon: <PhoneIncoming size={14} />, label: "Enquiries",     desc: "See who's reaching out",  path: adminPath("/enquiry"),              accentColor: "#9D174D", gradientFrom: "#831843", gradientTo: "#BE185D", badge: s ? `${s.enquiries} total` : undefined,                            badgeUrgent: false },
    { icon: <ClipboardList size={14} />, label: "Requests",      desc: "Track bookings",           path: adminPath("/requests"),             accentColor: "#0E7490", gradientFrom: "#164E63", gradientTo: "#0891B2", badge: s?.pendingRequests ? `${s.pendingRequests} pending` : undefined,   badgeUrgent: !!(s?.pendingRequests && s.pendingRequests > 0) },
  ];

  const gap = compact ? 6 : 8;
  const pad = isSm ? "10px 10px 16px" : compact ? "10px 14px" : "12px 16px";

  return (
    <div style={{
      padding: pad,
      background: "#F0F4F8",
      /* Lock to viewport — no scroll at all */
      width: "100%",
      height: "100vh",
      maxHeight: "100vh",
      overflow: "hidden",
      boxSizing: "border-box",
      display: "flex",
      flexDirection: "column",
      gap,
    }}>
      <style>{`
        @keyframes livePulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.4;transform:scale(1.7)} }
        @keyframes shimmer   { 0%,100%{opacity:1} 50%{opacity:0.5} }
        @keyframes fadeSlideDown { from{opacity:0;transform:translateY(-10px)} to{opacity:1;transform:translateY(0)} }
      `}</style>

      {/* ── Header ── */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0, animation: "fadeSlideDown 0.4s ease both" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
          <div style={{ width: 30, height: 30, borderRadius: 9, background: "linear-gradient(135deg, #0D6E56, #1aa37e)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 3px 10px rgba(13,110,86,0.35)" }}>
            <TrendingUp size={15} color="#fff" />
          </div>
          <div>
            <h2 style={{ fontSize: isSm ? 17 : 18, fontWeight: 900, color: "#0A0F1E", margin: 0, lineHeight: 1, letterSpacing: "-0.03em" }}>Dashboard</h2>
            <p style={{ fontSize: 11, color: "#334155", margin: 0, marginTop: 1, fontWeight: 600 }}>Agency overview at a glance</p>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 5, background: "#fff", border: "1.5px solid #D1FAE5", borderRadius: 99, padding: "4px 10px", boxShadow: "0 2px 8px rgba(16,185,129,0.12)" }}>
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#10B981", display: "inline-block", animation: "livePulse 1.8s ease-in-out infinite", boxShadow: "0 0 6px rgba(16,185,129,0.5)" }} />
          <span style={{ fontSize: 11, fontWeight: 800, color: "#065F46", letterSpacing: "0.05em" }}>LIVE</span>
        </div>
      </div>

      {/* ── Stat Row 1 ── */}
      <div style={{ display: "grid", gridTemplateColumns: `repeat(${statCols}, 1fr)`, gap, flexShrink: 0 }}>
        {loading ? Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />) : (<>
          <StatCard icon={<Users size={13} />} label="Total Maids" value={s?.totalMaids ?? 0} loading={loading} gradient="linear-gradient(135deg, #047857, #10B981)" glowColor="#10B981" delay={0} sub={`${s?.maidsWithPhotos ?? 0} with photos`} compact={compact} />
          <StatCard icon={<Eye size={13} />} label="Public" value={s?.publicMaids ?? 0} loading={loading} gradient="linear-gradient(135deg, #1E40AF, #3B82F6)" glowColor="#3B82F6" delay={60} sub="Visible to clients" compact={compact} />
          <StatCard icon={<EyeOff size={13} />} label="Hidden" value={s?.hiddenMaids ?? 0} loading={loading} gradient="linear-gradient(135deg, #92400E, #D97706)" glowColor="#F59E0B" delay={120} sub="Not listed" compact={compact} />
          <StatCard icon={<MessageCircle size={13} />} label="Unread Chats" value={s?.unreadAgencyChats ?? 0} loading={loading}
            gradient={s?.unreadAgencyChats ? "linear-gradient(135deg, #7F1D1D, #EF4444)" : "linear-gradient(135deg, #14532D, #22C55E)"}
            glowColor={s?.unreadAgencyChats ? "#EF4444" : "#22C55E"} delay={180}
            sub={s?.unreadAgencyChats ? "Needs attention" : "All caught up"} subUrgent={!!s?.unreadAgencyChats} compact={compact} />
        </>)}
      </div>

      {/* ── Stat Row 2 ── */}
      <div style={{ display: "grid", gridTemplateColumns: `repeat(${statCols}, 1fr)`, gap, flexShrink: 0 }}>
        {loading ? Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />) : (<>
          <StatCard icon={<PhoneIncoming size={13} />} label="Enquiries" value={s?.enquiries ?? 0} loading={loading} gradient="linear-gradient(135deg, #4C1D95, #8B5CF6)" glowColor="#8B5CF6" delay={60} compact={compact} />
          <StatCard icon={<FileText size={13} />} label="Requests" value={s?.requests ?? 0} loading={loading} gradient="linear-gradient(135deg, #164E63, #06B6D4)" glowColor="#06B6D4" delay={120} sub={`${s?.pendingRequests ?? 0} pending`} compact={compact} />
          <StatCard icon={<Image size={13} />} label="Gallery" value={s?.galleryImages ?? 0} loading={loading} gradient="linear-gradient(135deg, #831843, #EC4899)" glowColor="#EC4899" delay={180} sub="Agency photos" compact={compact} />
          <StatCard icon={<Users size={13} />} label="MOM Personnel" value={s?.momPersonnel ?? 0} loading={loading} gradient="linear-gradient(135deg, #78350F, #D97706)" glowColor="#D97706" delay={240} compact={compact} />
        </>)}
      </div>

      {/* ── Bottom panels ── */}
      <div style={{
        display: "grid",
        gridTemplateColumns: isSm ? "1fr" : "1fr 1fr",
        gap,
        flex: 1,
        minHeight: 0, // critical: lets flex children shrink below content size
      }}>

        {/* LEFT: Chart */}
        <div style={{
          background: "#fff", border: "1.5px solid #E2E8F0", borderRadius: 14,
          boxShadow: "0 4px 24px rgba(0,0,0,0.05)", padding: compact ? "10px 12px" : "12px 14px",
          display: "flex", flexDirection: "column",
          minHeight: 0,
          overflow: "hidden",
          boxSizing: "border-box",
        }}>
          <SectionHeader
            icon={<BarChart3 size={12} color="#fff" />}
            label="Maid Roster Breakdown"
            iconGradient="linear-gradient(135deg, #047857, #10B981)"
            badge={!loading && s ? (
              <span style={{ fontSize: 11, fontWeight: 800, color: "#065F46", background: "#ECFDF5", border: "1.5px solid #6EE7B7", padding: "2px 9px", borderRadius: 99 }}>
                {s.totalMaids} total
              </span>
            ) : undefined}
          />
          <div style={{ flex: 1, display: "flex", alignItems: "center", minHeight: 0, overflow: "hidden" }}>
            {!loading && s ? (
              <DonutChart total={s.totalMaids} centerLabel="Total Maids" slices={slices} size={donutSize} />
            ) : (
              <div style={{ display: "flex", alignItems: "center", gap: 14, width: "100%" }}>
                <div style={{ width: donutSize, height: donutSize, borderRadius: "50%", flexShrink: 0, background: "#F1F5F9", animation: "shimmer 1.5s ease infinite" }} />
                <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
                  {[65, 45, 78, 38, 55].map((w, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: 7 }}>
                      <div style={{ width: 8, height: 8, borderRadius: 2, background: "#E2E8F0", flexShrink: 0 }} />
                      <div style={{ flex: 1 }}>
                        <div style={{ height: 8, width: `${w}%`, borderRadius: 99, background: "#E2E8F0", marginBottom: 3, animation: "shimmer 1.5s ease infinite" }} />
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
        <div style={{
          background: "#fff", border: "1.5px solid #E2E8F0", borderRadius: 14,
          boxShadow: "0 4px 24px rgba(0,0,0,0.05)",
          padding: compact ? "10px 12px 12px" : "12px 14px 14px",
          display: "flex", flexDirection: "column",
          minHeight: 0,
          overflow: "hidden",
          boxSizing: "border-box",
          minWidth: 0,
        }}>
          <SectionHeader
            icon={<Zap size={12} color="#fff" />}
            label="Quick Actions"
            iconGradient="linear-gradient(135deg, #4C1D95, #7C3AED)"
          />
          <div style={{
            display: "grid",
            gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)",
            gap: compact ? 6 : 7,
            flex: 1,
            alignContent: "start",
            minHeight: 0,
            minWidth: 0,
            boxSizing: "border-box",
            // No overflow here — cards scale to fill
          }}>
            {loading
              ? Array.from({ length: 8 }).map((_, i) => <SkeletonMenuCard key={i} />)
              : menuCards.map((card, i) => (
                <MenuCard key={i} {...card} delay={i * 40} compact={compact} />
              ))
            }
          </div>
        </div>
      </div>
    </div>
  );
};

export default HomePage;