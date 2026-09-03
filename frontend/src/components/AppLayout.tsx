import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  LogOut,
  LayoutDashboard,
  Building2,
  UserPlus,
  Pencil,
  MessageSquare,
  Lock,
  FileText,
  PhoneIncoming,
  Bell,
  HelpCircle,
  Menu,
  X,
  ClipboardList,
  ChevronLeft,
  ChevronRight,
  Hand,
  Sparkles,
  Brain,
  Megaphone,
  Zap,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { adminPath } from "@/lib/routes";
import { toast } from "@/components/ui/sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  clearAgencyAdminAuth,
  getAgencyAdminAuthHeaders,
  getStoredAgencyAdmin,
  markAgencyAdminWelcomeShown,
  shouldShowAgencyAdminWelcome,
  type AgencyAdminUser,
} from "@/lib/agencyAdminAuth";
import {
  fetchAdminUnreadChatCount,
  markAdminNotificationsRead,
  type SupportNotification,
} from "@/lib/chat";

/* ─── Responsive breakpoint hook ─────────────────────────────────────────── */

function useIsDesktop(breakpoint = 1024) {
  const [isDesktop, setIsDesktop] = useState(
    () => typeof window !== "undefined" && window.innerWidth >= breakpoint
  );
  useEffect(() => {
    const mq = window.matchMedia(`(min-width: ${breakpoint}px)`);
    const handler = (e: MediaQueryListEvent) => setIsDesktop(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [breakpoint]);
  return isDesktop;
}

/* ─── Nav items ──────────────────────────────────────────────────────────── */

const navItems = [
  {
    label: "Home",
    path: adminPath("/dashboard"),
    icon: LayoutDashboard,
    iconBg: "linear-gradient(145deg, #6EE7B7, #059669)",
    iconShadow: "0 4px 0 #047857, 0 6px 12px rgba(5,150,105,0.45)",
    iconShadowActive: "0 2px 0 #047857, 0 3px 8px rgba(5,150,105,0.4)",
    iconColor: "#fff",
    badgeKey: null,
  },
  {
    label: "Our Profile",
    path: adminPath("/agency-profile"),
    icon: Building2,
    iconBg: "linear-gradient(145deg, #93C5FD, #2563EB)",
    iconShadow: "0 4px 0 #1D4ED8, 0 6px 12px rgba(37,99,235,0.45)",
    iconShadowActive: "0 2px 0 #1D4ED8, 0 3px 8px rgba(37,99,235,0.4)",
    iconColor: "#fff",
    badgeKey: null,
  },
  {
    label: "Add Maid",
    path: adminPath("/add-maid"),
    icon: UserPlus,
    iconBg: "linear-gradient(145deg, #FCA5A5, #DC2626)",
    iconShadow: "0 4px 0 #B91C1C, 0 6px 12px rgba(220,38,38,0.45)",
    iconShadowActive: "0 2px 0 #B91C1C, 0 3px 8px rgba(220,38,38,0.4)",
    iconColor: "#fff",
    badgeKey: null,
  },
  {
    label: "Manage Maids",
    path: adminPath("/edit-maids"),
    icon: Pencil,
    iconBg: "linear-gradient(145deg, #FDE68A, #D97706)",
    iconShadow: "0 4px 0 #B45309, 0 6px 12px rgba(217,119,6,0.45)",
    iconShadowActive: "0 2px 0 #B45309, 0 3px 8px rgba(217,119,6,0.4)",
    iconColor: "#fff",
    badgeKey: null,
  },
  {
    label: "Applicants List",
    path: adminPath("/recruitment"),
    icon: Brain,
    iconBg: "linear-gradient(145deg, #A7F3D0, #10B981)",
    iconShadow: "0 4px 0 #059669, 0 6px 12px rgba(16,185,129,0.45)",
    iconShadowActive: "0 2px 0 #059669, 0 3px 8px rgba(16,185,129,0.4)",
    iconColor: "#fff",
    badgeKey: "unreadApplicants" as const,
  },
  {
    label: "Messages",
    path: adminPath("/chat-support"),
    icon: MessageSquare,
    iconBg: "linear-gradient(145deg, #C4B5FD, #7C3AED)",
    iconShadow: "0 4px 0 #6D28D9, 0 6px 12px rgba(124,58,237,0.45)",
    iconShadowActive: "0 2px 0 #6D28D9, 0 3px 8px rgba(124,58,237,0.4)",
    iconColor: "#fff",
    badgeKey: "unreadChats" as const,
  },
  {
    label: "Security",
    path: adminPath("/change-password"),
    icon: Lock,
    iconBg: "linear-gradient(145deg, #FDBA74, #EA580C)",
    iconShadow: "0 4px 0 #C2410C, 0 6px 12px rgba(234,88,12,0.45)",
    iconShadowActive: "0 2px 0 #C2410C, 0 3px 8px rgba(234,88,12,0.4)",
    iconColor: "#fff",
    badgeKey: null,
  },
  {
    label: "Contracts",
    path: adminPath("/employment-contracts"),
    icon: FileText,
    iconBg: "linear-gradient(145deg, #6EE7F9, #0891B2)",
    iconShadow: "0 4px 0 #0E7490, 0 6px 12px rgba(8,145,178,0.45)",
    iconShadowActive: "0 2px 0 #0E7490, 0 3px 8px rgba(8,145,178,0.4)",
    iconColor: "#fff",
    badgeKey: null,
  },
  {
    label: "Enquiries",
    path: adminPath("/enquiry"),
    icon: PhoneIncoming,
    iconBg: "linear-gradient(145deg, #86EFAC, #16A34A)",
    iconShadow: "0 4px 0 #15803D, 0 6px 12px rgba(22,163,74,0.45)",
    iconShadowActive: "0 2px 0 #15803D, 0 3px 8px rgba(22,163,74,0.4)",
    iconColor: "#fff",
    badgeKey: "unreadEnquiries" as const,
  },
  {
    label: "Requests",
    path: adminPath("/requests"),
    icon: ClipboardList,
    iconBg: "linear-gradient(145deg, #60A5FA, #2563EB)",
    iconShadow: "0 4px 0 #1D4ED8, 0 6px 12px rgba(37,99,235,0.45)",
    iconShadowActive: "0 2px 0 #1D4ED8, 0 3px 8px rgba(37,99,235,0.4)",
    iconColor: "#fff",
    badgeKey: "unreadRequests" as const,
  },
  {
    label: "AI Agents",
    path: adminPath("/ai-agents"),
    icon: Sparkles,
    iconBg: "linear-gradient(145deg, #67E8F9, #0891B2)",
    iconShadow: "0 4px 0 #0E7490, 0 6px 12px rgba(8,145,178,0.45)",
    iconShadowActive: "0 2px 0 #0E7490, 0 3px 8px rgba(8,145,178,0.4)",
    iconColor: "#fff",
    badgeKey: null,
  },
  {
    label: "AI Marketing",
    path: adminPath("/ai-marketing"),
    icon: Megaphone,
    iconBg: "linear-gradient(145deg, #F9A8D4, #DB2777)",
    iconShadow: "0 4px 0 #BE185D, 0 6px 12px rgba(219,39,119,0.45)",
    iconShadowActive: "0 2px 0 #BE185D, 0 3px 8px rgba(219,39,119,0.4)",
    iconColor: "#fff",
    badgeKey: null,
  },
  {
    label: "AI Automation",
    path: adminPath("/ai-automation"),
    icon: Zap,
    iconBg: "linear-gradient(145deg, #FDE68A, #F59E0B)",
    iconShadow: "0 4px 0 #D97706, 0 6px 12px rgba(245,158,11,0.45)",
    iconShadowActive: "0 2px 0 #D97706, 0 3px 8px rgba(245,158,11,0.4)",
    iconColor: "#fff",
    badgeKey: null,
  },
];

/* ─── Badge counts type ───────────────────────────────────────────────────── */

type BadgeCounts = {
  unreadChats: number;
  unreadEnquiries: number;
  unreadApplicants: number;
  unreadRequests: number;
};

const EMPTY_BADGE_COUNTS: BadgeCounts = {
  unreadChats: 0,
  unreadEnquiries: 0,
  unreadApplicants: 0,
  unreadRequests: 0,
};

const ADMIN_NOTIFICATION_CACHE_KEY = "helped-admin-notification-cache";

type AdminNotificationCache = {
  badgeCounts: BadgeCounts;
  chatNotifications: SupportNotification[];
  agencyLogoUrl: string;
};

const readAdminNotificationCache = (): AdminNotificationCache | null => {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(ADMIN_NOTIFICATION_CACHE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as Partial<AdminNotificationCache>;
    const badgeCounts = parsed.badgeCounts;
    if (!badgeCounts) return null;

    return {
      badgeCounts: {
        unreadChats: Number(badgeCounts.unreadChats) || 0,
        unreadEnquiries: Number(badgeCounts.unreadEnquiries) || 0,
        unreadApplicants: Number(badgeCounts.unreadApplicants) || 0,
        unreadRequests: Number(badgeCounts.unreadRequests) || 0,
      },
      chatNotifications: Array.isArray(parsed.chatNotifications)
        ? parsed.chatNotifications
        : [],
      agencyLogoUrl: typeof parsed.agencyLogoUrl === "string" ? parsed.agencyLogoUrl : "",
    };
  } catch {
    return null;
  }
};

const writeAdminNotificationCache = (cache: AdminNotificationCache) => {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(ADMIN_NOTIFICATION_CACHE_KEY, JSON.stringify(cache));
  } catch {
    // Storage can be unavailable in private sessions; notifications still work in memory.
  }
};

const formatNotificationTime = (iso: string) => {
  if (!iso) return "";
  const date = new Date(iso);
  const diffMs = Date.now() - date.getTime();
  const diffMinutes = Math.floor(diffMs / 60000);
  if (diffMinutes < 1) return "Just now";
  if (diffMinutes < 60) return `${diffMinutes} min ago`;
  if (diffMinutes < 1440) return `${Math.floor(diffMinutes / 60)} hr ago`;
  return date.toLocaleDateString([], { month: "short", day: "numeric" });
};

const getAdminNotificationHref = (notification: SupportNotification) => {
  const params = new URLSearchParams();
  params.set("clientId", String(notification.clientId));
  params.set("type", notification.conversationType === "agency" ? "agency" : "support");
  if (notification.clientName) params.set("clientName", notification.clientName);
  if (notification.conversationType === "agency" && notification.agencyId) {
    params.set("agencyId", String(notification.agencyId));
    if (notification.agencyName) params.set("agencyName", notification.agencyName);
  }
  return `${adminPath("/chat-support")}?${params.toString()}`;
};

const getNotificationTone = (priority?: SupportNotification["priority"]) => {
  switch (priority) {
    case "URGENT":
      return { bg: "#fef2f2", fg: "#b91c1c" };
    case "HIGH":
      return { bg: "#fff7ed", fg: "#c2410c" };
    case "MEDIUM":
      return { bg: "#fffbeb", fg: "#b45309" };
    default:
      return { bg: "#eff6ff", fg: "#1d4ed8" };
  }
};

/* ─── 3D Icon ────────────────────────────────────────────────────────────── */

const Icon3D = ({
  icon: IconComp,
  bg,
  shadow,
  shadowActive,
  color,
  isActive,
}: {
  icon: React.ElementType;
  bg: string;
  shadow: string;
  shadowActive: string;
  color: string;
  isActive: boolean;
}) => (
  <span
    style={{
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      width: 34,
      height: 34,
      borderRadius: 10,
      background: bg,
      boxShadow: isActive ? shadowActive : shadow,
      transform: isActive ? "translateY(2px)" : "translateY(0)",
      transition: "box-shadow 0.15s ease, transform 0.15s ease",
      flexShrink: 0,
    }}
  >
    <IconComp
      style={{
        width: 17,
        height: 17,
        color,
        filter: "drop-shadow(0 1px 1px rgba(0,0,0,0.25))",
      }}
    />
  </span>
);

/* ─── Tooltip ────────────────────────────────────────────────────────────── */

const Tooltip = ({ label }: { label: string }) => (
  <div
    style={{
      position: "absolute",
      left: "calc(100% + 10px)",
      top: "50%",
      transform: "translateY(-50%)",
      background: "#1e293b",
      color: "#fff",
      fontSize: 12,
      fontWeight: 600,
      padding: "4px 10px",
      borderRadius: 6,
      whiteSpace: "nowrap",
      pointerEvents: "none",
      zIndex: 200,
      boxShadow: "0 4px 12px rgba(0,0,0,0.25)",
    }}
  >
    {label}
    <span
      style={{
        position: "absolute",
        left: -5,
        top: "50%",
        transform: "translateY(-50%)",
        width: 0,
        height: 0,
        borderTop: "5px solid transparent",
        borderBottom: "5px solid transparent",
        borderRight: "5px solid #1e293b",
      }}
    />
  </div>
);

/* ─── Badge component ─────────────────────────────────────────────────────── */

const NavBadge = ({
  count,
  collapsed,
}: {
  count: number;
  collapsed: boolean;
}) => {
  if (count <= 0) return null;

  if (collapsed) {
    return (
      <span
        style={{
          position: "absolute",
          top: 6,
          right: 6,
          width: 8,
          height: 8,
          borderRadius: "50%",
          background: "#EF4444",
          border: "2px solid #fff",
        }}
      />
    );
  }

  return (
    <span
      style={{
        display: "inline-flex",
        height: 18,
        minWidth: 18,
        alignItems: "center",
        justifyContent: "center",
        borderRadius: 9999,
        background: "#EF4444",
        padding: "0 5px",
        fontSize: 10,
        fontWeight: 700,
        color: "#fff",
        flexShrink: 0,
      }}
    >
      {count > 99 ? "99+" : count}
    </span>
  );
};

/* ─── Display name helpers ───────────────────────────────────────────────── */

const getAgencyDisplayName = (agencyAdmin: AgencyAdminUser | null) => {
  if (!agencyAdmin) return "Agency";
  if (agencyAdmin.role === "admin") return agencyAdmin.agencyName || "Main Agency";
  return agencyAdmin.agencyName || agencyAdmin.username || "Agency";
};

const getAgencyDisplaySubtitle = (agencyAdmin: AgencyAdminUser | null) => {
  if (!agencyAdmin) return "Management Suite";
  if (agencyAdmin.role === "admin") return "Main Agency";
  if (agencyAdmin.role === "agency") return "Agency Account";
  return "Management Suite";
};

const getAgencyDisplayWelcomeName = (agencyAdmin: AgencyAdminUser | null) => {
  if (!agencyAdmin) return "Agency";
  if (agencyAdmin.role === "admin") return agencyAdmin.agencyName || "Main Agency";
  return agencyAdmin.username || agencyAdmin.agencyName || "Agency";
};

/* ─── Welcome Modal ──────────────────────────────────────────────────────── */

const WelcomeModal = ({
  agencyAdmin,
  agencyLogoUrl,
  onClose,
}: {
  agencyAdmin: AgencyAdminUser | null;
  agencyLogoUrl: string;
  onClose: () => void;
}) => {
  const name = getAgencyDisplayWelcomeName(agencyAdmin);
  const subtitle = getAgencyDisplaySubtitle(agencyAdmin);
  const initials = (agencyAdmin?.agencyName || "A").slice(0, 2).toUpperCase();
  const logoSrc = agencyLogoUrl || agencyAdmin?.profileImageUrl || "";

  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 20);
    return () => clearTimeout(t);
  }, []);

  const handleClose = () => {
    setVisible(false);
    setTimeout(onClose, 260);
  };

  return (
    <div
      onClick={handleClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: visible ? "rgba(0,0,0,0.45)" : "rgba(0,0,0,0)",
        transition: "background 0.26s ease",
        padding: 16,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%",
          maxWidth: 420,
          background: "#fff",
          borderRadius: 20,
          overflow: "hidden",
          boxShadow: "0 24px 64px rgba(0,0,0,0.18)",
          transform: visible
            ? "scale(1) translateY(0)"
            : "scale(0.92) translateY(24px)",
          opacity: visible ? 1 : 0,
          transition:
            "transform 0.26s cubic-bezier(0.34,1.56,0.64,1), opacity 0.22s ease",
        }}
      >
        {/* Green header band */}
        <div
          style={{
            background: "linear-gradient(135deg, #0D6E56 0%, #1aa37e 100%)",
            padding: "28px 28px 24px",
            textAlign: "center",
            position: "relative",
          }}
        >
          <Sparkles
            style={{
              width: 20,
              height: 20,
              color: "rgba(255,255,255,0.5)",
              position: "absolute",
              top: 18,
              left: 22,
            }}
          />
          <Sparkles
            style={{
              width: 14,
              height: 14,
              color: "rgba(255,255,255,0.3)",
              position: "absolute",
              bottom: 20,
              left: 38,
            }}
          />
          <Sparkles
            style={{
              width: 16,
              height: 16,
              color: "rgba(255,255,255,0.35)",
              position: "absolute",
              bottom: 24,
              right: 32,
            }}
          />

          <p
            style={{
              margin: "0 0 4px",
              fontSize: 13,
              fontWeight: 600,
              color: "rgba(255,255,255,0.75)",
              letterSpacing: "0.06em",
              textTransform: "uppercase",
            }}
          >
            Find Maids · Agency Portal
          </p>
          <p
            style={{
              margin: "0 0 20px",
              fontSize: 26,
              fontWeight: 800,
              color: "#fff",
              lineHeight: 1.25,
            }}
          >
            Welcome back!{" "}
            <Hand
              style={{
                width: 26,
                height: 26,
                display: "inline",
                verticalAlign: "middle",
              }}
            />
          </p>

          <div style={{ display: "flex", justifyContent: "center" }}>
            <div
              style={{
                width: 72,
                height: 72,
                borderRadius: "50%",
                border: "4px solid rgba(255,255,255,0.9)",
                overflow: "hidden",
                background: "#085041",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              {logoSrc ? (
                <img
                  src={logoSrc}
                  alt={name}
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
              ) : (
                <span
                  style={{
                    fontSize: 22,
                    fontWeight: 800,
                    color: "#fff",
                    lineHeight: 1,
                  }}
                >
                  {initials}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Body */}
        <div style={{ padding: "20px 28px 28px", textAlign: "center" }}>
          <p
            style={{
              margin: "0 0 4px",
              fontSize: 20,
              fontWeight: 800,
              color: "#111827",
            }}
          >
            {name}
          </p>
          <p
            style={{
              margin: "0 0 20px",
              fontSize: 13,
              fontWeight: 500,
              color: "#6B7280",
            }}
          >
            {subtitle}
          </p>

          <div
            style={{
              background: "#F0FDF9",
              border: "1px solid #BBFAE3",
              borderRadius: 12,
              padding: "12px 16px",
              marginBottom: 22,
              textAlign: "left",
            }}
          >
            <p
              style={{
                margin: 0,
                fontSize: 13,
                color: "#065F46",
                fontWeight: 500,
                lineHeight: 1.6,
              }}
            >
              You're signed in to your agency dashboard. Manage your maids,
              contracts, and inquiries all in one place.
            </p>
          </div>

          <button
            onClick={handleClose}
            style={{
              width: "100%",
              padding: "12px 0",
              borderRadius: 10,
              border: "none",
              background: "linear-gradient(135deg, #0D6E56 0%, #1aa37e 100%)",
              color: "#fff",
              fontSize: 15,
              fontWeight: 700,
              cursor: "pointer",
              boxShadow: "0 4px 14px rgba(13,110,86,0.35)",
              transition: "opacity 0.15s ease, transform 0.15s ease",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.opacity = "0.9";
              (e.currentTarget as HTMLButtonElement).style.transform =
                "translateY(-1px)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.opacity = "1";
              (e.currentTarget as HTMLButtonElement).style.transform =
                "translateY(0)";
            }}
          >
            Get Started
          </button>
        </div>
      </div>
    </div>
  );
};

/* ─── Sidebar content ────────────────────────────────────────────────────── */

const SidebarContent = ({
  location,
  badgeCounts,
  agencyLogoUrl,
  agencyAdmin,
  collapsed,
  onNavClick,
}: {
  location: ReturnType<typeof useLocation>;
  badgeCounts: BadgeCounts;
  agencyLogoUrl: string;
  agencyAdmin: AgencyAdminUser | null;
  collapsed: boolean;
  onNavClick?: () => void;
}) => {
  const [hoveredPath, setHoveredPath] = useState<string | null>(null);
  const agencyDisplayName = getAgencyDisplayName(agencyAdmin);
  const agencyDisplaySubtitle = getAgencyDisplaySubtitle(agencyAdmin);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        overflow: "hidden",
      }}
    >
      {/* Brand */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: collapsed ? "center" : "flex-start",
          gap: 8,
          padding: collapsed ? "14px 0" : "14px 16px",
          borderBottom: "1px solid #E5E7EB",
          transition: "padding 0.3s ease",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: 9,
            background: "linear-gradient(145deg, #6EE7B7, #0D6E56)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            boxShadow: "0 2px 6px rgba(13,110,86,0.4)",
          }}
        >
          <Building2 style={{ width: 16, height: 16, color: "#fff" }} />
        </div>

        <div
          style={{
            overflow: "hidden",
            maxWidth: collapsed ? 0 : 160,
            opacity: collapsed ? 0 : 1,
            transition: "max-width 0.3s ease, opacity 0.2s ease",
            whiteSpace: "nowrap",
          }}
        >
          <p
            style={{
              margin: 0,
              fontSize: 17,
              fontWeight: 700,
              color: "#111827",
              lineHeight: 1.2,
            }}
          >
            Find Maids
          </p>
          <span style={{ fontSize: 11, fontWeight: 600, color: "#6B7280" }}>
            Agency Management
          </span>
        </div>
      </div>

      {/* Agency identity strip */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: collapsed ? "center" : "flex-start",
          gap: 10,
          padding: collapsed ? "10px 0" : "10px 12px",
          background: "#0D6E56",
          borderBottom: "1px solid rgba(255,255,255,0.1)",
          transition: "padding 0.3s ease",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: 36,
            height: 36,
            flexShrink: 0,
            borderRadius: 8,
            overflow: "hidden",
            background: "rgba(255,255,255,0.2)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {agencyLogoUrl || agencyAdmin?.profileImageUrl ? (
            <img
              src={agencyLogoUrl || agencyAdmin?.profileImageUrl}
              alt="Agency logo"
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          ) : (
            <Building2 style={{ width: 18, height: 18, color: "#fff" }} />
          )}
        </div>

        <div
          style={{
            overflow: "hidden",
            maxWidth: collapsed ? 0 : 160,
            opacity: collapsed ? 0 : 1,
            transition: "max-width 0.3s ease, opacity 0.2s ease",
            whiteSpace: "nowrap",
          }}
        >
          <p
            style={{ margin: 0, fontSize: 13, fontWeight: 700, color: "#fff" }}
          >
            {agencyDisplayName}
          </p>
          <p
            style={{
              margin: 0,
              fontSize: 11,
              fontWeight: 500,
              color: "rgba(255,255,255,0.75)",
            }}
          >
            {agencyDisplaySubtitle}
          </p>
        </div>
      </div>

      {/* Nav */}
      <nav
        style={{
          flex: 1,
          overflowY: "auto",
          overflowX: "hidden",
          paddingTop: 6,
          paddingBottom: 6,
        }}
      >
        {navItems.map((item) => {
          const isActive =
            location.pathname === item.path ||
            location.pathname.startsWith(`${item.path}/`);
          const isHovered = hoveredPath === item.path;

          // Resolve badge count from badgeKey
          const badgeCount = item.badgeKey ? badgeCounts[item.badgeKey] : 0;

          return (
            <div
              key={item.path}
              style={{ position: "relative" }}
              onMouseEnter={() => setHoveredPath(item.path)}
              onMouseLeave={() => setHoveredPath(null)}
            >
              <Link
                to={item.path}
                onClick={onNavClick}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: collapsed ? "8px 0" : "8px 12px",
                  justifyContent: collapsed ? "center" : "flex-start",
                  textDecoration: "none",
                  borderRight: isActive
                    ? "3px solid #0D6E56"
                    : "3px solid transparent",
                  background: isActive
                    ? "#E1F5EE"
                    : isHovered
                    ? "#F8FAFC"
                    : "transparent",
                  transition:
                    "background 0.15s ease, padding 0.3s ease, border-color 0.15s ease",
                  position: "relative",
                }}
              >
                <Icon3D
                  icon={item.icon}
                  bg={item.iconBg}
                  shadow={item.iconShadow}
                  shadowActive={item.iconShadowActive}
                  color={item.iconColor}
                  isActive={isActive}
                />

                <span
                  style={{
                    fontSize: 15,
                    fontWeight: isActive ? 700 : 600,
                    color: isActive ? "#0D6E56" : "#000000",
                    flex: 1,
                    overflow: "hidden",
                    maxWidth: collapsed ? 0 : 200,
                    opacity: collapsed ? 0 : 1,
                    transition: "max-width 0.3s ease, opacity 0.2s ease",
                    whiteSpace: "nowrap",
                  }}
                >
                  {item.label}
                </span>

                {/* Badge — expanded or collapsed dot */}
                <NavBadge count={badgeCount} collapsed={collapsed} />
              </Link>

              {collapsed && isHovered && <Tooltip label={item.label} />}
            </div>
          );
        })}
      </nav>
    </div>
  );
};

/* ─── AppLayout ──────────────────────────────────────────────────────────── */

const AppLayout = ({ children }: { children: React.ReactNode }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const isDesktop = useIsDesktop(1024);
  const isAddMaidRoute = location.pathname === adminPath("/add-maid");

  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [showWelcomeModal, setShowWelcomeModal] = useState(false);

  // ── All badge counts in one state object ──────────────────────────────────
  const [badgeCounts, setBadgeCounts] = useState<BadgeCounts>(
    () => readAdminNotificationCache()?.badgeCounts ?? EMPTY_BADGE_COUNTS
  );
  const [chatNotifications, setChatNotifications] = useState<SupportNotification[]>(
    () => readAdminNotificationCache()?.chatNotifications ?? []
  );
  const [agencyAdmin, setAgencyAdmin] = useState<AgencyAdminUser | null>(
    getStoredAgencyAdmin()
  );
  const [agencyLogoUrl, setAgencyLogoUrl] = useState(
    () => readAdminNotificationCache()?.agencyLogoUrl ?? ""
  );

  // Show the welcome modal once for each successful login session.
  useEffect(() => {
    if (!shouldShowAgencyAdminWelcome()) return;
    markAgencyAdminWelcomeShown();
    setShowWelcomeModal(true);
  }, []);

  // Close mobile drawer on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  // ── Polling: notifications + logo ────────────────────────────────────────
  useEffect(() => {
    let active = true;

    const loadAll = async () => {
      const authHeaders = getAgencyAdminAuthHeaders();
      if (!authHeaders.Authorization) return;

      try {
        const cached = readAdminNotificationCache();
        let summaryData: {
          unreadAgencyChats?: number;
          enquiries?: number;
          pendingRequests?: number;
          error?: string;
        } | null = null;
        let companyLogo = cached?.agencyLogoUrl ?? "";
        let unreadChats = cached?.badgeCounts.unreadChats ?? 0;
        let unreadApplicants = cached?.badgeCounts.unreadApplicants ?? 0;
        let dedicatedNotifications: SupportNotification[] = cached?.chatNotifications ?? [];

        try {
          const chatSummary = await fetchAdminUnreadChatCount();
          unreadChats = chatSummary.unreadCount;
          dedicatedNotifications = chatSummary.notifications;
        } catch {
          // Keep the previous notification state during navigation or transient network hiccups.
        }

        if (!isAddMaidRoute) {
          const [summaryResult, companyResult, applicantsResult] = await Promise.allSettled([
            fetch("/api/company/summary", {
              headers: authHeaders,
            }),
            fetch("/api/company", {
              headers: authHeaders,
            }),
            fetch("/api/ats/applications/unread-count", {
              headers: authHeaders,
            }),
          ]);

          if (summaryResult.status === "fulfilled") {
            summaryData = (await summaryResult.value.json().catch(() => ({}))) as {
              unreadAgencyChats?: number;
              enquiries?: number;
              pendingRequests?: number;
              error?: string;
            };
          }

          if (
            companyResult.status === "fulfilled" &&
            companyResult.value.ok
          ) {
            const compData = (await companyResult.value.json().catch(() => ({}))) as {
              companyProfile?: { logo_data_url?: string };
            };
            companyLogo = compData.companyProfile?.logo_data_url || "";
          }

          if (applicantsResult.status === "fulfilled" && applicantsResult.value.ok) {
            const applicantsData = (await applicantsResult.value.json().catch(() => ({}))) as {
              unreadCount?: number;
            };
            unreadApplicants = Number(applicantsData.unreadCount) || 0;
          }
        }

        if (!active) return;

        const nextBadgeCounts = {
          unreadChats,
          unreadEnquiries: summaryData?.enquiries ?? cached?.badgeCounts.unreadEnquiries ?? 0,
          unreadApplicants,
          unreadRequests: summaryData?.pendingRequests ?? cached?.badgeCounts.unreadRequests ?? 0,
        };

        setBadgeCounts(nextBadgeCounts);
        setChatNotifications(dedicatedNotifications);

        setAgencyLogoUrl(companyLogo);
        writeAdminNotificationCache({
          badgeCounts: nextBadgeCounts,
          chatNotifications: dedicatedNotifications,
          agencyLogoUrl: companyLogo,
        });
      } catch (err) {
        console.warn("[AppLayout] Failed to refresh admin notifications", err);
      }
    };

    void loadAll();
    const iv = window.setInterval(() => void loadAll(), 5000);

    return () => {
      active = false;
      window.clearInterval(iv);
    };
  }, [isAddMaidRoute, location.pathname]);

  useEffect(() => {
    setAgencyAdmin(getStoredAgencyAdmin());
  }, [location.pathname]);

  // Viewing Requests acknowledges the items without changing their workflow status.
  useEffect(() => {
    if (!location.pathname.endsWith("/requests")) return;
    const authHeaders = getAgencyAdminAuthHeaders();
    if (!authHeaders.Authorization) return;

    void (async () => {
      try {
        const response = await fetch("/api/requests/mark-viewed", {
          method: "POST",
          headers: authHeaders,
        });
        if (!response.ok) throw new Error(`Request acknowledgement failed (${response.status})`);
        setBadgeCounts((current) => ({ ...current, unreadRequests: 0 }));
      } catch (error) {
        console.warn("[AppLayout] Failed to mark requests viewed", error);
      }
    })();
  }, [location.pathname]);

  // Opening either inbox acknowledges its related notifications permanently.
  useEffect(() => {
    if (!location.pathname.endsWith("/enquiry")) return;
    const authHeaders = getAgencyAdminAuthHeaders();
    if (!authHeaders.Authorization) return;

    void (async () => {
      try {
        const response = await fetch("/api/enquiries/mark-viewed", {
          method: "POST",
          headers: authHeaders,
        });
        if (!response.ok) throw new Error(`Enquiry acknowledgement failed (${response.status})`);
        setBadgeCounts((current) => ({ ...current, unreadEnquiries: 0 }));
      } catch (error) {
        console.warn("[AppLayout] Failed to mark enquiries viewed", error);
      }
    })();
  }, [location.pathname]);

  useEffect(() => {
    if (!location.pathname.endsWith("/recruitment")) return;
    const authHeaders = getAgencyAdminAuthHeaders();
    if (!authHeaders.Authorization) return;

    void (async () => {
      try {
        const response = await fetch("/api/ats/applications/mark-viewed", {
          method: "POST",
          headers: authHeaders,
        });
        if (!response.ok) throw new Error(`Applicant acknowledgement failed (${response.status})`);
        setBadgeCounts((current) => ({ ...current, unreadApplicants: 0 }));
      } catch (error) {
        console.warn("[AppLayout] Failed to mark applicants viewed", error);
      }
    })();
  }, [location.pathname]);

  const handleLogout = async () => {
    try {
      await fetch("/api/agency-auth/logout", {
        method: "POST",
        headers: { ...getAgencyAdminAuthHeaders() },
      });
    } catch {
      // ignore error
    } finally {
      window.localStorage.removeItem(ADMIN_NOTIFICATION_CACHE_KEY);
      clearAgencyAdminAuth();
      toast.success("Agency admin logged out");
      window.location.href = "/agency";
    }
  };

  const initials = (agencyAdmin?.agencyName || "A").slice(0, 2).toUpperCase();
  const agencyDisplayName = getAgencyDisplayName(agencyAdmin);
  const agencyWelcomeName = getAgencyDisplayWelcomeName(agencyAdmin);
  const desktopWidth = collapsed ? 64 : 230;

  // Total unread count for the header bell icon
  const totalUnread =
    badgeCounts.unreadChats +
    badgeCounts.unreadEnquiries +
    badgeCounts.unreadApplicants +
    badgeCounts.unreadRequests;
  const visibleUnread = totalUnread;
  const visibleChatNotifications = chatNotifications.slice(0, 6);

  const handleNotificationsOpenChange = (open: boolean) => {
    if (!open || chatNotifications.length === 0) return;

    // Update immediately, then persist the viewed state so it survives refreshes.
    setChatNotifications([]);
    setBadgeCounts((current) => ({ ...current, unreadChats: 0 }));
    void markAdminNotificationsRead().catch((error) => {
      console.warn("[AppLayout] Failed to mark notifications read", error);
    });
  };

  const sharedSidebarProps = {
    location,
    badgeCounts,
    agencyLogoUrl,
    agencyAdmin,
  };

  return (
    <div
      style={{
        display: "flex",
        height: "100vh",
        overflow: "hidden",
        background: "#F8FAFC",
      }}
    >
      {/* Welcome Modal */}
      {showWelcomeModal && (
        <WelcomeModal
          agencyAdmin={agencyAdmin}
          agencyLogoUrl={agencyLogoUrl}
          onClose={() => setShowWelcomeModal(false)}
        />
      )}

      {/* ══ MOBILE: backdrop + drawer ══════════════════════════════════════ */}
      {!isDesktop && mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 30,
            background: "rgba(0,0,0,0.4)",
          }}
          aria-hidden="true"
        />
      )}

      {!isDesktop && (
        <aside
          aria-label="Navigation drawer"
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            bottom: 0,
            width: 240,
            zIndex: 40,
            background: "#fff",
            borderRight: "1px solid #E5E7EB",
            boxShadow: "4px 0 24px rgba(0,0,0,0.12)",
            transform: mobileOpen ? "translateX(0)" : "translateX(-100%)",
            transition: "transform 0.3s ease",
          }}
        >
          <button
            onClick={() => setMobileOpen(false)}
            aria-label="Close menu"
            style={{
              position: "absolute",
              top: 8,
              right: 8,
              zIndex: 10,
              width: 28,
              height: 28,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: 6,
              border: "none",
              background: "transparent",
              cursor: "pointer",
              color: "#6B7280",
            }}
          >
            <X style={{ width: 16, height: 16 }} />
          </button>
          <SidebarContent
            {...sharedSidebarProps}
            collapsed={false}
            onNavClick={() => setMobileOpen(false)}
          />
        </aside>
      )}

      {/* ══ DESKTOP: persistent collapsible sidebar ════════════════════════ */}
      {isDesktop && (
        <aside
          style={{
            width: desktopWidth,
            flexShrink: 0,
            display: "flex",
            flexDirection: "column",
            borderRight: "1px solid #E5E7EB",
            background: "#fff",
            transition: "width 0.3s cubic-bezier(0.4,0,0.2,1)",
            position: "relative",
            overflow: "visible",
          }}
        >
          <SidebarContent {...sharedSidebarProps} collapsed={collapsed} />

          <button
            onClick={() => setCollapsed((c) => !c)}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            style={{
              position: "absolute",
              right: -14,
              top: 72,
              zIndex: 50,
              width: 28,
              height: 28,
              borderRadius: "50%",
              border: "2px solid #E5E7EB",
              background: "#fff",
              boxShadow: "0 2px 8px rgba(0,0,0,0.12)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              color: "#0D6E56",
              transition: "background 0.15s ease, border-color 0.15s ease",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background =
                "#E1F5EE";
              (e.currentTarget as HTMLButtonElement).style.borderColor =
                "#0D6E56";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background = "#fff";
              (e.currentTarget as HTMLButtonElement).style.borderColor =
                "#E5E7EB";
            }}
          >
            {collapsed ? (
              <ChevronRight style={{ width: 14, height: 14 }} />
            ) : (
              <ChevronLeft style={{ width: 14, height: 14 }} />
            )}
          </button>
        </aside>
      )}

      {/* ══ MAIN AREA ══════════════════════════════════════════════════════ */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          flex: 1,
          minWidth: 0,
          overflow: "hidden",
        }}
      >
        {/* ── Top header ─────────────────────────────────────────────────── */}
        <header
          style={{
            height: 64,
            flexShrink: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderBottom: "1px solid #E5E7EB",
            background: "#fff",
            padding: "0 20px",
            gap: 12,
          }}
        >
          {/* Left: hamburger + title */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              minWidth: 0,
            }}
          >
            {!isDesktop && (
              <button
                onClick={() => setMobileOpen(true)}
                aria-label="Open menu"
                style={{
                  display: "flex",
                  width: 36,
                  height: 36,
                  flexShrink: 0,
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: 8,
                  border: "1px solid #E5E7EB",
                  background: "transparent",
                  cursor: "pointer",
                  color: "#6B7280",
                  position: "relative",
                }}
              >
                <Menu style={{ width: 18, height: 18 }} />
                {/* Dot on hamburger when drawer is closed and there are unreads */}
                {totalUnread > 0 && (
                  <span
                    style={{
                      position: "absolute",
                      top: 4,
                      right: 4,
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                      background: "#EF4444",
                      border: "2px solid #fff",
                    }}
                  />
                )}
              </button>
            )}

            <span
              style={{
                fontSize: 16,
                fontWeight: 700,
                color: "#111827",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {isDesktop
                ? "Dashboard"
                : "Find Maids Admin"}
            </span>
          </div>

          {/* Right: actions */}
          <div
            style={{
              display: "flex",
              flexShrink: 0,
              alignItems: "center",
              gap: 6,
            }}
          >
            <DropdownMenu onOpenChange={handleNotificationsOpenChange}>
              <DropdownMenuTrigger asChild>
                <button
                  aria-label={`Notifications${visibleUnread > 0 ? ` (${visibleUnread} unread)` : ""}`}
                  style={{
                    width: 38,
                    height: 38,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    borderRadius: 10,
                    border: "1px solid #E5E7EB",
                    background: "#F9FAFB",
                    cursor: "pointer",
                    color: "#6B7280",
                    transition: "background 0.15s, border-color 0.15s",
                    flexShrink: 0,
                    position: "relative",
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.background =
                      "#F3F4F6";
                    (e.currentTarget as HTMLButtonElement).style.borderColor =
                      "#D1D5DB";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.background =
                      "#F9FAFB";
                    (e.currentTarget as HTMLButtonElement).style.borderColor =
                      "#E5E7EB";
                  }}
                >
                  <Bell style={{ width: 17, height: 17 }} />
                  {visibleUnread > 0 && (
                    <span
                      style={{
                        position: "absolute",
                        top: 4,
                        right: 4,
                        minWidth: 16,
                        height: 16,
                        borderRadius: 9999,
                        background: "#EF4444",
                        border: "2px solid #fff",
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 9,
                        fontWeight: 700,
                        color: "#fff",
                        padding: "0 3px",
                        lineHeight: 1,
                      }}
                    >
                      {visibleUnread > 99 ? "99+" : visibleUnread}
                    </span>
                  )}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-[380px] max-w-[calc(100vw-24px)]">
                <DropdownMenuLabel className="flex items-center justify-between gap-3">
                  <span>Notifications</span>
                  <span className="text-xs font-medium text-muted-foreground">
                    {totalUnread > 0 ? `${totalUnread} unread` : "All caught up"}
                  </span>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />

                {badgeCounts.unreadRequests > 0 && (
                  <DropdownMenuItem asChild>
                    <Link
                      to={adminPath("/requests")}
                      className="flex items-start justify-between gap-3"
                    >
                      <div className="min-w-0">
                        <div className="font-medium text-foreground">Requests need review</div>
                        <div className="text-xs text-muted-foreground">
                          {badgeCounts.unreadRequests} unread request{badgeCounts.unreadRequests !== 1 ? "s" : ""}
                        </div>
                      </div>
                      <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-700">
                        Requests
                      </span>
                    </Link>
                  </DropdownMenuItem>
                )}

                {badgeCounts.unreadEnquiries > 0 && (
                  <DropdownMenuItem asChild>
                    <Link
                      to={adminPath("/enquiry")}
                      className="flex items-start justify-between gap-3"
                    >
                      <div className="min-w-0">
                        <div className="font-medium text-foreground">Enquiries need follow-up</div>
                        <div className="text-xs text-muted-foreground">
                          {badgeCounts.unreadEnquiries} unread enquir{badgeCounts.unreadEnquiries !== 1 ? "ies" : "y"}
                        </div>
                      </div>
                      <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                        Enquiry
                      </span>
                    </Link>
                  </DropdownMenuItem>
                )}

                {badgeCounts.unreadApplicants > 0 && (
                  <DropdownMenuItem asChild>
                    <Link
                      to={adminPath("/recruitment")}
                      className="flex items-start justify-between gap-3"
                    >
                      <div className="min-w-0">
                        <div className="font-medium text-foreground">Applicants need review</div>
                        <div className="text-xs text-muted-foreground">
                          {badgeCounts.unreadApplicants} unread applicant{badgeCounts.unreadApplicants !== 1 ? "s" : ""}
                        </div>
                      </div>
                      <span className="rounded-full bg-violet-50 px-2 py-0.5 text-[10px] font-semibold text-violet-700">
                        Applicants
                      </span>
                    </Link>
                  </DropdownMenuItem>
                )}

                {visibleChatNotifications.map((notification) => {
                  const tone = getNotificationTone(notification.priority);
                  return (
                    <DropdownMenuItem key={notification.id} asChild>
                      <Link
                        to={getAdminNotificationHref(notification)}
                        className="flex items-start justify-between gap-3"
                      >
                        <div className="min-w-0">
                          <div className="font-medium text-foreground">
                            {notification.clientName || notification.title}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {notification.body}
                          </div>
                          <div className="mt-1 flex flex-wrap items-center gap-2 text-[10px] text-muted-foreground">
                            <span>{formatNotificationTime(notification.createdAt)}</span>
                            {notification.status ? <span>{notification.status.replace(/_/g, " ")}</span> : null}
                            {notification.category ? <span>{notification.category}</span> : null}
                          </div>
                        </div>
                        <span
                          className="rounded-full px-2 py-0.5 text-[10px] font-semibold"
                          style={{ background: tone.bg, color: tone.fg }}
                        >
                          {notification.priority || "OPEN"}
                        </span>
                      </Link>
                    </DropdownMenuItem>
                  );
                })}

                {totalUnread === 0 && (
                  <div className="px-3 py-6 text-center text-sm text-muted-foreground">
                    No new notifications right now.
                  </div>
                )}

                {visibleChatNotifications.length > 0 && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link to={adminPath("/chat-support")} className="justify-center font-medium text-primary">
                        Open support inbox
                      </Link>
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Help */}
            {isDesktop && (
              <button
                aria-label="Help"
                style={{
                  width: 38,
                  height: 38,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: 10,
                  border: "1px solid #E5E7EB",
                  background: "#F9FAFB",
                  cursor: "pointer",
                  color: "#6B7280",
                  transition: "background 0.15s, border-color 0.15s",
                  flexShrink: 0,
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.background =
                    "#F3F4F6";
                  (e.currentTarget as HTMLButtonElement).style.borderColor =
                    "#D1D5DB";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.background =
                    "#F9FAFB";
                  (e.currentTarget as HTMLButtonElement).style.borderColor =
                    "#E5E7EB";
                }}
              >
                <HelpCircle style={{ width: 17, height: 17 }} />
              </button>
            )}

            {/* Divider */}
            <div
              style={{
                width: 1,
                height: 28,
                background: "#E5E7EB",
                margin: "0 4px",
                flexShrink: 0,
              }}
            />

            {/* Avatar dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "4px 10px 4px 4px",
                    border: "1px solid #E5E7EB",
                    borderRadius: 10,
                    background: "#F9FAFB",
                    cursor: "pointer",
                    transition: "background 0.15s, border-color 0.15s",
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.background =
                      "#F3F4F6";
                    (e.currentTarget as HTMLButtonElement).style.borderColor =
                      "#D1D5DB";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.background =
                      "#F9FAFB";
                    (e.currentTarget as HTMLButtonElement).style.borderColor =
                      "#E5E7EB";
                  }}
                  className="focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0D6E56]"
                >
                  <Avatar className="h-8 w-8">
                    <AvatarImage
                      src={agencyLogoUrl || agencyAdmin?.profileImageUrl}
                      alt={agencyAdmin?.agencyName || "Agency"}
                    />
                    <AvatarFallback className="bg-[#0D6E56] text-[13px] font-bold text-white">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  {isDesktop && (
                    <span
                      style={{
                        fontSize: 13,
                        fontWeight: 600,
                        color: "#111827",
                        maxWidth: 120,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {agencyWelcomeName}
                    </span>
                  )}
                </button>
              </DropdownMenuTrigger>

              <DropdownMenuContent align="end" className="w-64">
                <DropdownMenuLabel className="flex items-center gap-3 py-3 px-3">
                  <Avatar className="h-11 w-11 flex-shrink-0">
                    <AvatarImage
                      src={agencyLogoUrl || agencyAdmin?.profileImageUrl}
                      alt={agencyAdmin?.agencyName || "Agency"}
                    />
                    <AvatarFallback className="bg-[#0D6E56] text-[14px] font-bold text-white">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p
                      style={{
                        margin: 0,
                        fontSize: 14,
                        fontWeight: 700,
                        color: "#111827",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {agencyWelcomeName}
                    </p>
                    <p
                      style={{
                        margin: 0,
                        fontSize: 12,
                        fontWeight: 500,
                        color: "#6B7280",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {agencyDisplayName}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => void handleLogout()}
                  className="cursor-pointer font-semibold text-[14px] text-red-500 focus:bg-red-50 focus:text-red-600 mx-1 mb-1 rounded-md"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Page content */}
        <main style={{ flex: 1, overflowY: "auto", padding: 24 }}>
          {children}
        </main>

        {/* Footer */}
        <footer
          style={{
            flexShrink: 0,
            borderTop: "1px solid #E5E7EB",
            background: "#fff",
            padding: "10px 0",
            textAlign: "center",
            fontSize: 12,
            fontWeight: 500,
            color: "#6B7280",
          }}
        >
          © 2026 STREET PTE LTD. All Rights Reserved.
        </footer>
      </div>
    </div>
  );
};

export default AppLayout;
