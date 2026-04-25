import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { adminPath } from "@/lib/routes";
import { toast } from "@/components/ui/sonner";
import {
  Building2,
  UserPlus,
  Pencil,
  MessageSquare,
  Lock,
  PhoneIncoming,
  Users,
  Eye,
  EyeOff,
  Image,
  MessageCircle,
  FileText,
  ChevronRight,
  TrendingUp,
  BarChart3,
} from "lucide-react";

interface DashboardSummary {
  publicMaids: number;
  hiddenMaids: number;
  totalMaids: number;
  maidsWithPhotos: number;
  enquiries: number;
  requests: number;
  pendingRequests: number;
  unreadAgencyChats: number;
  momPersonnel: number;
  testimonials: number;
  galleryImages: number;
}

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
  icon: React.ReactNode;
  label: string;
  value: number | string;
  loading: boolean;
  colorClass: string;        // e.g. "teal" | "blue" | "orange" | "red" | "violet" | "sky" | "pink" | "amber"
  sub?: string;
  subUrgent?: boolean;
}

const colorMap: Record<string, { bg: string; shadow: string; iconBg: string; iconColor: string; border: string }> = {
  teal:   { bg: "#E1F5EE", shadow: "#9FE1CB", iconBg: "rgba(13,110,86,0.14)",   iconColor: "#0D6E56", border: "#9FE1CB" },
  blue:   { bg: "#E6F1FB", shadow: "#B5D4F4", iconBg: "rgba(24,95,165,0.14)",   iconColor: "#185FA5", border: "#B5D4F4" },
  orange: { bg: "#FEF3E2", shadow: "#FAC775", iconBg: "rgba(186,117,23,0.14)",  iconColor: "#BA7517", border: "#FAC775" },
  red:    { bg: "#FCEBEB", shadow: "#F7C1C1", iconBg: "rgba(163,45,45,0.14)",   iconColor: "#A32D2D", border: "#F7C1C1" },
  violet: { bg: "#EEEDFE", shadow: "#CECBF6", iconBg: "rgba(83,74,183,0.14)",   iconColor: "#534AB7", border: "#CECBF6" },
  sky:    { bg: "#E6F1FB", shadow: "#B5D4F4", iconBg: "rgba(24,95,165,0.12)",   iconColor: "#185FA5", border: "#B5D4F4" },
  pink:   { bg: "#FBEAF0", shadow: "#F4C0D1", iconBg: "rgba(153,53,86,0.14)",   iconColor: "#993556", border: "#F4C0D1" },
  amber:  { bg: "#FEF3E2", shadow: "#FAC775", iconBg: "rgba(133,79,11,0.14)",   iconColor: "#854F0B", border: "#FAC775" },
};

const StatCard = ({ icon, label, value, loading, colorClass, sub, subUrgent }: StatCardProps) => {
  const numericValue = typeof value === "number" ? value : 0;
  const animated = useCountUp(loading ? 0 : numericValue);
  const c = colorMap[colorClass] ?? colorMap.teal;

  return (
    <div
      style={{
        background: c.bg,
        border: `1.5px solid ${c.border}`,
        boxShadow: `0 6px 0 ${c.shadow}, 0 12px 24px rgba(0,0,0,0.07)`,
        borderRadius: 18,
        padding: "18px 16px 16px",
        transition: "transform 0.18s ease, box-shadow 0.18s ease",
        cursor: "default",
      }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLDivElement).style.transform = "translateY(-4px) scale(1.025)";
        (e.currentTarget as HTMLDivElement).style.boxShadow = `0 2px 0 ${c.shadow}, 0 8px 22px rgba(0,0,0,0.12)`;
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLDivElement).style.transform = "translateY(0) scale(1)";
        (e.currentTarget as HTMLDivElement).style.boxShadow = `0 6px 0 ${c.shadow}, 0 12px 24px rgba(0,0,0,0.07)`;
      }}
    >
      {/* Icon */}
      <div
        style={{
          width: 44,
          height: 44,
          borderRadius: 13,
          background: c.iconBg,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 12,
          color: c.iconColor,
        }}
      >
        {icon}
      </div>

      {/* Label */}
      <p style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.07em", textTransform: "uppercase", color: "#555", marginBottom: 4 }}>
        {label}
      </p>

      {/* Value */}
      <p style={{ fontSize: 36, fontWeight: 800, color: "#111", lineHeight: 1, marginBottom: 4, fontFamily: "'Lexend', sans-serif" }}>
        {loading ? "—" : animated}
      </p>

      {/* Sub */}
      {sub && (
        <p style={{ fontSize: 13, fontWeight: 600, color: subUrgent ? "#A32D2D" : "#555" }}>
          {sub}
        </p>
      )}
    </div>
  );
};

/* ─── Analytics Bar ─────────────────────────────────────────────────────── */

interface BarRowProps {
  label: string;
  value: number;
  max: number;
  color: string;
}

const BarRow = ({ label, value, max, color }: BarRowProps) => {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
        <span style={{ fontSize: 15, fontWeight: 600, color: "#222" }}>{label}</span>
        <span style={{ fontSize: 15, fontWeight: 700, color: "#111" }}>{value}</span>
      </div>
      <div style={{ height: 11, borderRadius: 8, background: "#EBEBEB", overflow: "hidden" }}>
        <div
          style={{
            height: "100%",
            width: `${pct}%`,
            borderRadius: 8,
            background: color,
            transition: "width 1.1s cubic-bezier(.4,0,.2,1)",
          }}
        />
      </div>
    </div>
  );
};

/* ─── Menu Card ─────────────────────────────────────────────────────────── */

interface MenuCardProps {
  icon: React.ReactNode;
  label: string;
  desc: string;
  path: string;
  iconBg: string;
  iconColor: string;
  badge?: string;
  badgeUrgent?: boolean;
}

const MenuCard = ({ icon, label, desc, path, iconBg, iconColor, badge, badgeUrgent }: MenuCardProps) => (
  <Link
    to={path}
    style={{
      display: "flex",
      alignItems: "center",
      gap: 14,
      background: "#fff",
      border: "1.5px solid #E4E9F0",
      borderRadius: 18,
      padding: "16px 18px",
      boxShadow: "0 5px 0 #E4E9F0, 0 10px 22px rgba(0,0,0,0.05)",
      textDecoration: "none",
      color: "inherit",
      transition: "transform 0.16s ease, box-shadow 0.16s ease",
    }}
    onMouseEnter={e => {
      (e.currentTarget as HTMLAnchorElement).style.transform = "translateY(-3px)";
      (e.currentTarget as HTMLAnchorElement).style.boxShadow = "0 2px 0 #E4E9F0, 0 8px 22px rgba(0,0,0,0.1)";
    }}
    onMouseLeave={e => {
      (e.currentTarget as HTMLAnchorElement).style.transform = "translateY(0)";
      (e.currentTarget as HTMLAnchorElement).style.boxShadow = "0 5px 0 #E4E9F0, 0 10px 22px rgba(0,0,0,0.05)";
    }}
  >
    {/* Icon */}
    <div
      style={{
        width: 50,
        height: 50,
        borderRadius: 14,
        background: iconBg,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
        color: iconColor,
      }}
    >
      {icon}
    </div>

    {/* Body */}
    <div style={{ flex: 1, minWidth: 0 }}>
      <p style={{ fontSize: 16, fontWeight: 700, color: "#111", marginBottom: 2, fontFamily: "'Lexend', sans-serif" }}>
        {label}
      </p>
      <p style={{ fontSize: 13, color: "#666", marginBottom: badge ? 6 : 0 }}>{desc}</p>
      {badge && (
        <span
          style={{
            display: "inline-block",
            fontSize: 12,
            fontWeight: 700,
            padding: "3px 10px",
            borderRadius: 20,
            background: badgeUrgent ? "#FCEBEB" : "#F1EFE8",
            color: badgeUrgent ? "#791F1F" : "#444441",
          }}
        >
          {badge}
        </span>
      )}
    </div>

    {/* Arrow */}
    <ChevronRight size={18} style={{ flexShrink: 0, color: "#CCC" }} />
  </Link>
);

/* ─── Main Component ────────────────────────────────────────────────────── */

const HomePage = () => {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadSummary = async () => {
      try {
        const response = await fetch("/api/company/summary");
        const data = (await response.json().catch(() => ({}))) as Partial<DashboardSummary> & { error?: string };
        if (!response.ok) throw new Error(data.error || "Failed to load dashboard summary");
        setSummary({
          publicMaids: data.publicMaids ?? 0,
          hiddenMaids: data.hiddenMaids ?? 0,
          totalMaids: data.totalMaids ?? 0,
          maidsWithPhotos: data.maidsWithPhotos ?? 0,
          enquiries: data.enquiries ?? 0,
          requests: data.requests ?? 0,
          pendingRequests: data.pendingRequests ?? 0,
          unreadAgencyChats: data.unreadAgencyChats ?? 0,
          momPersonnel: data.momPersonnel ?? 0,
          testimonials: data.testimonials ?? 0,
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

  return (
    <div style={{ padding: "4px 0 32px", background: "#F5F7FA", minHeight: "100vh" }}>

      {/* ── Page Header ───────────────────────────────────────────────── */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 28 }}>
        <div>
          <h2 style={{ fontSize: 28, fontWeight: 800, color: "#111", fontFamily: "'Lexend', sans-serif", margin: 0, lineHeight: 1.1 }}>
            Dashboard
          </h2>
          <p style={{ fontSize: 15, color: "#666", marginTop: 4 }}>Agency overview at a glance</p>
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            background: "#E1F5EE",
            border: "1.5px solid #9FE1CB",
            borderRadius: 24,
            padding: "8px 18px",
          }}
        >
          <span
            style={{
              width: 9,
              height: 9,
              borderRadius: "50%",
              background: "#1D9E75",
              display: "inline-block",
              animation: "livePulse 1.6s ease-in-out infinite",
            }}
          />
          <span style={{ fontSize: 14, fontWeight: 700, color: "#0D6E56", fontFamily: "'Lexend', sans-serif" }}>Live</span>
        </div>
      </div>

      <style>{`
        @keyframes livePulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50%       { opacity: 0.45; transform: scale(1.5); }
        }
      `}</style>

      {/* ── Primary Stat Cards ────────────────────────────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginBottom: 14 }}>
        <StatCard
          icon={<Users size={22} />}
          label="Total Maids"
          value={s?.totalMaids ?? 0}
          loading={loading}
          colorClass="teal"
          sub={loading ? undefined : `${s?.maidsWithPhotos ?? 0} with photos`}
        />
        <StatCard
          icon={<Eye size={22} />}
          label="Public"
          value={s?.publicMaids ?? 0}
          loading={loading}
          colorClass="blue"
          sub="Visible to clients"
        />
        <StatCard
          icon={<EyeOff size={22} />}
          label="Hidden"
          value={s?.hiddenMaids ?? 0}
          loading={loading}
          colorClass="orange"
          sub="Not listed"
        />
        <StatCard
          icon={<MessageCircle size={22} />}
          label="Unread Chats"
          value={s?.unreadAgencyChats ?? 0}
          loading={loading}
          colorClass={s?.unreadAgencyChats ? "red" : "teal"}
          sub={loading ? undefined : s?.unreadAgencyChats ? "Needs attention" : "All caught up"}
          subUrgent={!!s?.unreadAgencyChats && s.unreadAgencyChats > 0}
        />
      </div>

      {/* ── Secondary Stat Cards ──────────────────────────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginBottom: 28 }}>
        <StatCard
          icon={<PhoneIncoming size={22} />}
          label="Enquiries"
          value={s?.enquiries ?? 0}
          loading={loading}
          colorClass="violet"
        />
        <StatCard
          icon={<FileText size={22} />}
          label="Requests"
          value={s?.requests ?? 0}
          loading={loading}
          colorClass="sky"
          sub={loading ? undefined : `${s?.pendingRequests ?? 0} pending`}
        />
        <StatCard
          icon={<Image size={22} />}
          label="Gallery"
          value={s?.galleryImages ?? 0}
          loading={loading}
          colorClass="pink"
          sub="Agency photos"
        />
        <StatCard
          icon={<Users size={22} />}
          label="MOM Personnel"
          value={s?.momPersonnel ?? 0}
          loading={loading}
          colorClass="amber"
        />
      </div>

      {/* ── Analytics Panel ───────────────────────────────────────────── */}
      {!loading && s && (
        <div
          style={{
            background: "#fff",
            border: "1.5px solid #E4E9F0",
            borderRadius: 20,
            boxShadow: "0 6px 0 #E4E9F0, 0 14px 28px rgba(0,0,0,0.06)",
            padding: "22px 24px",
            marginBottom: 28,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
            <BarChart3 size={20} color="#0D6E56" />
            <span style={{ fontSize: 18, fontWeight: 800, color: "#111", fontFamily: "'Lexend', sans-serif" }}>
              Maid Roster Breakdown
            </span>
          </div>

          <BarRow label="Public Maids"     value={s.publicMaids}     max={s.totalMaids} color="#1D9E75" />
          <BarRow label="Hidden Maids"     value={s.hiddenMaids}     max={s.totalMaids} color="#EF9F27" />
          <BarRow label="Maids with Photos" value={s.maidsWithPhotos} max={s.totalMaids} color="#378ADD" />

          {/* Summary pills */}
          <div style={{ display: "flex", gap: 10, marginTop: 6, flexWrap: "wrap" }}>
            {[
              { label: `${s.totalMaids} Total`,           bg: "#E1F5EE", color: "#085041" },
              { label: `${Math.round((s.publicMaids / (s.totalMaids || 1)) * 100)}% Public`,    bg: "#E6F1FB", color: "#0C447C" },
              { label: `${Math.round((s.maidsWithPhotos / (s.totalMaids || 1)) * 100)}% w/ Photos`, bg: "#EEEDFE", color: "#3C3489" },
            ].map(pill => (
              <span
                key={pill.label}
                style={{
                  fontSize: 13,
                  fontWeight: 700,
                  padding: "5px 14px",
                  borderRadius: 20,
                  background: pill.bg,
                  color: pill.color,
                }}
              >
                {pill.label}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* ── Quick Actions ─────────────────────────────────────────────── */}
      <p style={{ fontSize: 13, fontWeight: 700, letterSpacing: "0.09em", textTransform: "uppercase", color: "#999", marginBottom: 14 }}>
        Quick Actions
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <MenuCard
          icon={<Building2 size={22} />}
          label="Agency Profile"
          desc="View and edit your agency details"
          path={adminPath("/agency-profile")}
          iconBg="#E6F1FB"
          iconColor="#185FA5"
          badge={s ? `${s.momPersonnel} MOM · ${s.galleryImages} photos` : undefined}
        />
        <MenuCard
          icon={<UserPlus size={22} />}
          label="Add Maid"
          desc="Register a new maid profile"
          path={adminPath("/add-maid")}
          iconBg="#E1F5EE"
          iconColor="#0D6E56"
          badge="Register new profiles"
        />
        <MenuCard
          icon={<Pencil size={22} />}
          label="Edit / Delete Maids"
          desc="Manage existing maid records"
          path={adminPath("/edit-maids")}
          iconBg="#FEF3E2"
          iconColor="#BA7517"
          badge={s ? `${s.publicMaids} public · ${s.hiddenMaids} hidden` : undefined}
        />
        <MenuCard
          icon={<MessageSquare size={22} />}
          label="Chat Support"
          desc="Reply to client chat messages"
          path={adminPath("/chat-support")}
          iconBg="#E6F1FB"
          iconColor="#185FA5"
          badge={
            s
              ? s.unreadAgencyChats > 0
                ? `${s.unreadAgencyChats} unread messages`
                : "No unread messages"
              : undefined
          }
          badgeUrgent={!!s?.unreadAgencyChats && s.unreadAgencyChats > 0}
        />
        <MenuCard
          icon={<PhoneIncoming size={22} />}
          label="Incoming Inquiries"
          desc="Review client enquiries"
          path={adminPath("/enquiry")}
          iconBg="#EEEDFE"
          iconColor="#534AB7"
          badge={s ? `${s.enquiries} total enquiries` : undefined}
        />
        <MenuCard
          icon={<Lock size={22} />}
          label="Change Password"
          desc="Update your account password"
          path={adminPath("/change-password")}
          iconBg="#F1EFE8"
          iconColor="#444441"
          badge="Keep your account secure"
        />
      </div>
    </div>
  );
};

export default HomePage;
