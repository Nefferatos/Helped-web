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

/* ─── Stat Card ─────────────────────────────────────────────────────────── */

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  iconBg: string;
  iconColor: string;
  sub?: string;
}

const StatCard = ({ icon, label, value, iconBg, iconColor, sub }: StatCardProps) => (
  <div className="flex items-center gap-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
    <div className={`flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl ${iconBg}`}>
      <span className={iconColor}>{icon}</span>
    </div>
    <div className="min-w-0">
      <p className="text-[11px] font-medium uppercase tracking-wide text-gray-400">{label}</p>
      <p className="text-[22px] font-bold leading-tight text-gray-900">{value}</p>
      {sub && <p className="text-[11px] text-gray-400 mt-0.5">{sub}</p>}
    </div>
  </div>
);

/* ─── Menu Card ─────────────────────────────────────────────────────────── */

interface MenuCardProps {
  icon: React.ReactNode;
  label: string;
  desc: string;
  path: string;
  accent: string;
  accentText: string;
  accentBg: string;
  badge?: string;
  badgeUrgent?: boolean;
}

const MenuCard = ({
  icon,
  label,
  desc,
  path,
  accent,
  accentText,
  accentBg,
  badge,
  badgeUrgent,
}: MenuCardProps) => (
  <Link
    to={path}
    className="group flex items-center gap-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-gray-300 hover:shadow-md no-underline"
  >
    <div className={`flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl ${accentBg}`}>
      <span className={accentText}>{icon}</span>
    </div>
    <div className="min-w-0 flex-1">
      <p className="text-[13.5px] font-semibold text-gray-800 group-hover:text-gray-900">
        {label}
      </p>
      <p className="text-[12px] text-gray-400 mt-0.5 leading-snug">{desc}</p>
      {badge && (
        <span
          className={`mt-1.5 inline-block rounded-full px-2 py-0.5 text-[10.5px] font-semibold ${
            badgeUrgent
              ? "bg-red-50 text-red-600"
              : `${accentBg} ${accentText}`
          }`}
        >
          {badge}
        </span>
      )}
    </div>
    <ChevronRight
      className={`h-4 w-4 flex-shrink-0 text-gray-300 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:${accent}`}
    />
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
        const data = (await response.json().catch(() => ({}))) as Partial<DashboardSummary> & {
          error?: string;
        };
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
  const dash = (v?: number) => (loading ? "—" : (v ?? 0));

  return (
    <div className="space-y-6">

      {/* ── Page title ───────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-[18px] font-bold text-gray-900 tracking-tight">Dashboard</h2>
          <p className="text-[13px] text-gray-400 mt-0.5">Agency overview at a glance</p>
        </div>
        <div className="flex items-center gap-2 rounded-lg border border-[#0D6E56]/20 bg-[#E1F5EE] px-3 py-1.5">
          <TrendingUp className="h-3.5 w-3.5 text-[#0D6E56]" />
          <span className="text-[12px] font-semibold text-[#0D6E56]">Live</span>
        </div>
      </div>

      {/* ── Stat cards ───────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard
          icon={<Users className="h-5 w-5" />}
          label="Total Maids"
          value={dash(s?.totalMaids)}
          iconBg="bg-[#E1F5EE]"
          iconColor="text-[#0D6E56]"
          sub={`${dash(s?.maidsWithPhotos)} with photos`}
        />
        <StatCard
          icon={<Eye className="h-5 w-5" />}
          label="Public"
          value={dash(s?.publicMaids)}
          iconBg="bg-blue-50"
          iconColor="text-blue-600"
          sub="Visible to clients"
        />
        <StatCard
          icon={<EyeOff className="h-5 w-5" />}
          label="Hidden"
          value={dash(s?.hiddenMaids)}
          iconBg="bg-orange-50"
          iconColor="text-orange-500"
          sub="Not listed"
        />
        <StatCard
          icon={<MessageCircle className="h-5 w-5" />}
          label="Unread Chats"
          value={dash(s?.unreadAgencyChats)}
          iconBg={s?.unreadAgencyChats ? "bg-red-50" : "bg-gray-50"}
          iconColor={s?.unreadAgencyChats ? "text-red-500" : "text-gray-400"}
          sub={s?.unreadAgencyChats ? "Needs attention" : "All caught up"}
        />
      </div>

      {/* ── Secondary stats ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard
          icon={<PhoneIncoming className="h-5 w-5" />}
          label="Enquiries"
          value={dash(s?.enquiries)}
          iconBg="bg-violet-50"
          iconColor="text-violet-500"
        />
        <StatCard
          icon={<FileText className="h-5 w-5" />}
          label="Requests"
          value={dash(s?.requests)}
          iconBg="bg-sky-50"
          iconColor="text-sky-500"
          sub={`${dash(s?.pendingRequests)} pending`}
        />
        <StatCard
          icon={<Image className="h-5 w-5" />}
          label="Gallery"
          value={dash(s?.galleryImages)}
          iconBg="bg-pink-50"
          iconColor="text-pink-500"
          sub="Agency photos"
        />
        <StatCard
          icon={<Users className="h-5 w-5" />}
          label="MOM Personnel"
          value={dash(s?.momPersonnel)}
          iconBg="bg-amber-50"
          iconColor="text-amber-500"
        />
      </div>

      {/* ── Quick actions ─────────────────────────────────────────────────── */}
      <div>
        <h3 className="text-[13px] font-semibold uppercase tracking-wide text-gray-400 mb-3">
          Quick Actions
        </h3>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <MenuCard
            icon={<Building2 className="h-5 w-5" />}
            label="Agency Profile"
            desc="View and edit your agency details"
            path={adminPath("/agency-profile")}
            accent="text-blue-500"
            accentText="text-blue-600"
            accentBg="bg-blue-50"
            badge={s ? `${s.momPersonnel} MOM · ${s.galleryImages} photos` : undefined}
          />
          <MenuCard
            icon={<UserPlus className="h-5 w-5" />}
            label="Add Maid"
            desc="Register a new maid profile"
            path={adminPath("/add-maid")}
            accent="text-[#0D6E56]"
            accentText="text-[#0D6E56]"
            accentBg="bg-[#E1F5EE]"
            badge="Register new profiles"
          />
          <MenuCard
            icon={<Pencil className="h-5 w-5" />}
            label="Edit / Delete Maids"
            desc="Manage existing maid records"
            path={adminPath("/edit-maids")}
            accent="text-orange-500"
            accentText="text-orange-600"
            accentBg="bg-orange-50"
            badge={s ? `${s.publicMaids} public · ${s.hiddenMaids} hidden` : undefined}
          />
          <MenuCard
            icon={<MessageSquare className="h-5 w-5" />}
            label="Chat Support"
            desc="Reply to client chat messages"
            path={adminPath("/chat-support")}
            accent="text-sky-500"
            accentText="text-sky-600"
            accentBg="bg-sky-50"
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
            icon={<PhoneIncoming className="h-5 w-5" />}
            label="Incoming Inquiries"
            desc="Review client enquiries"
            path={adminPath("/enquiry")}
            accent="text-violet-500"
            accentText="text-violet-600"
            accentBg="bg-violet-50"
            badge={s ? `${s.enquiries} total enquiries` : undefined}
          />
          <MenuCard
            icon={<Lock className="h-5 w-5" />}
            label="Change Password"
            desc="Update your account password"
            path={adminPath("/change-password")}
            accent="text-gray-500"
            accentText="text-gray-500"
            accentBg="bg-gray-100"
            badge="Keep your account secure"
          />
        </div>
      </div>
    </div>
  );
};

export default HomePage;