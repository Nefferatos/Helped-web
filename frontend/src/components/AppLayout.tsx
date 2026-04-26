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
  Hand,
  ClipboardList,
  ChevronLeft,
  ChevronRight,
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
  type AgencyAdminUser,
} from "@/lib/agencyAdminAuth";
import { fetchAdminUnreadChatCount } from "@/lib/chat";

/* ─── Responsive breakpoint hook ─────────────────────────────────────────
   Uses a MediaQueryList so it reacts to window resize without polling.
   Returns true when viewport >= breakpoint (default 1024px = Tailwind "lg").
───────────────────────────────────────────────────────────────────────── */
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

/* ─── Nav items ─────────────────────────────────────────────────────────── */

const navItems = [
  {
    label: "Home",
    path: adminPath("/dashboard"),
    icon: LayoutDashboard,
    iconBg: "linear-gradient(145deg, #6EE7B7, #059669)",
    iconShadow: "0 4px 0 #047857, 0 6px 12px rgba(5,150,105,0.45)",
    iconShadowActive: "0 2px 0 #047857, 0 3px 8px rgba(5,150,105,0.4)",
    iconColor: "#fff",
  },
  {
    label: "Agency Profile",
    path: adminPath("/agency-profile"),
    icon: Building2,
    iconBg: "linear-gradient(145deg, #93C5FD, #2563EB)",
    iconShadow: "0 4px 0 #1D4ED8, 0 6px 12px rgba(37,99,235,0.45)",
    iconShadowActive: "0 2px 0 #1D4ED8, 0 3px 8px rgba(37,99,235,0.4)",
    iconColor: "#fff",
  },
  {
    label: "Add Maid",
    path: adminPath("/add-maid"),
    icon: UserPlus,
    iconBg: "linear-gradient(145deg, #FCA5A5, #DC2626)",
    iconShadow: "0 4px 0 #B91C1C, 0 6px 12px rgba(220,38,38,0.45)",
    iconShadowActive: "0 2px 0 #B91C1C, 0 3px 8px rgba(220,38,38,0.4)",
    iconColor: "#fff",
  },
  {
    label: "Edit / Delete",
    path: adminPath("/edit-maids"),
    icon: Pencil,
    iconBg: "linear-gradient(145deg, #FDE68A, #D97706)",
    iconShadow: "0 4px 0 #B45309, 0 6px 12px rgba(217,119,6,0.45)",
    iconShadowActive: "0 2px 0 #B45309, 0 3px 8px rgba(217,119,6,0.4)",
    iconColor: "#fff",
  },
  {
    label: "Chat Support",
    path: adminPath("/chat-support"),
    icon: MessageSquare,
    iconBg: "linear-gradient(145deg, #C4B5FD, #7C3AED)",
    iconShadow: "0 4px 0 #6D28D9, 0 6px 12px rgba(124,58,237,0.45)",
    iconShadowActive: "0 2px 0 #6D28D9, 0 3px 8px rgba(124,58,237,0.4)",
    iconColor: "#fff",
  },
  {
    label: "Password Management",
    path: adminPath("/change-password"),
    icon: Lock,
    iconBg: "linear-gradient(145deg, #FDBA74, #EA580C)",
    iconShadow: "0 4px 0 #C2410C, 0 6px 12px rgba(234,88,12,0.45)",
    iconShadowActive: "0 2px 0 #C2410C, 0 3px 8px rgba(234,88,12,0.4)",
    iconColor: "#fff",
  },
  {
    label: "Employment Contracts",
    path: adminPath("/employment-contracts"),
    icon: FileText,
    iconBg: "linear-gradient(145deg, #6EE7F9, #0891B2)",
    iconShadow: "0 4px 0 #0E7490, 0 6px 12px rgba(8,145,178,0.45)",
    iconShadowActive: "0 2px 0 #0E7490, 0 3px 8px rgba(8,145,178,0.4)",
    iconColor: "#fff",
  },
  {
    label: "Incoming Inquiries",
    path: adminPath("/enquiry"),
    icon: PhoneIncoming,
    iconBg: "linear-gradient(145deg, #86EFAC, #16A34A)",
    iconShadow: "0 4px 0 #15803D, 0 6px 12px rgba(22,163,74,0.45)",
    iconShadowActive: "0 2px 0 #15803D, 0 3px 8px rgba(22,163,74,0.4)",
    iconColor: "#fff",
  },
  {
    label: "Request",
    path: adminPath("/requests"),
    icon: ClipboardList,
    iconBg: "linear-gradient(145deg, #60A5FA, #2563EB)",
    iconShadow: "0 4px 0 #1D4ED8, 0 6px 12px rgba(37,99,235,0.45)",
    iconShadowActive: "0 2px 0 #1D4ED8, 0 3px 8px rgba(37,99,235,0.4)",
    iconColor: "#fff",
  },
];

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

/* ─── Tooltip (shown on collapsed icon hover) ───────────────────────────── */

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

const getAgencyDisplayName = (agencyAdmin: AgencyAdminUser | null) => {
  if (!agencyAdmin) return "Agency";

  if (agencyAdmin.role === "admin") {
    return agencyAdmin.agencyName || "Main Agency";
  }

  return agencyAdmin.agencyName || agencyAdmin.username || "Agency";
};

const getAgencyDisplaySubtitle = (agencyAdmin: AgencyAdminUser | null) => {
  if (!agencyAdmin) return "Management Suite";

  if (agencyAdmin.role === "admin") {
    return "Main Agency";
  }

  if (agencyAdmin.role === "agency") {
    return "Agency Account";
  }

  return "Management Suite";
};

const getAgencyDisplayWelcomeName = (agencyAdmin: AgencyAdminUser | null) => {
  if (!agencyAdmin) return "Agency";

  if (agencyAdmin.role === "admin") {
    return agencyAdmin.agencyName || "Main Agency";
  }

  return agencyAdmin.username || agencyAdmin.agencyName || "Agency";
};

/* ─── Sidebar inner content ──────────────────────────────────────────────── */

const SidebarContent = ({
  location,
  unreadAgencyChats,
  agencyLogoUrl,
  agencyAdmin,
  collapsed,
  onNavClick,
}: {
  location: ReturnType<typeof useLocation>;
  unreadAgencyChats: number;
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
          <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: "#fff" }}>
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
          const hasUnread =
            item.path === adminPath("/chat-support") && unreadAgencyChats > 0;
          const isHovered = hoveredPath === item.path;

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
                    fontSize: 13,
                    fontWeight: isActive ? 700 : 600,
                    color: isActive ? "#0D6E56" : "#4B5563",
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

                {hasUnread && !collapsed && (
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
                    }}
                  >
                    {unreadAgencyChats}
                  </span>
                )}

                {hasUnread && collapsed && (
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
                )}
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

  // JS-driven responsive: avoids ALL Tailwind/inline-style conflicts
  const isDesktop = useIsDesktop(1024);

  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [unreadAgencyChats, setUnreadAgencyChats] = useState(0);
  const [agencyAdmin, setAgencyAdmin] = useState<AgencyAdminUser | null>(
    getStoredAgencyAdmin()
  );
  const [agencyLogoUrl, setAgencyLogoUrl] = useState("");

  // Close mobile drawer on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  // Polling: notifications + logo
  useEffect(() => {
    let active = true;

    const loadSummary = async (silent = false) => {
      try {
          const [res, compRes] = await Promise.all([
            fetch("/api/company/summary", {
              headers: { ...getAgencyAdminAuthHeaders() },
            }),
            fetch("/api/company", {
              headers: { ...getAgencyAdminAuthHeaders() },
            }),
          ]);
        const data = (await res.json().catch(() => ({}))) as {
          unreadAgencyChats?: number;
          error?: string;
        };
        if (!res.ok) throw new Error(data.error || "Failed to load notifications");
        if (!active) return;
        setUnreadAgencyChats(data.unreadAgencyChats ?? 0);
        if (compRes.ok) {
          const compData = (await compRes.json().catch(() => ({}))) as {
            companyProfile?: { logo_data_url?: string };
          };
          if (active) setAgencyLogoUrl(compData.companyProfile?.logo_data_url || "");
        }
      } catch (err) {
        if (!silent)
          toast.error(err instanceof Error ? err.message : "Failed to load notifications");
      }
    };

    const loadUnread = async (silent = false) => {
      try {
        const count = await fetchAdminUnreadChatCount();
        if (active) setUnreadAgencyChats(count);
      } catch (err) {
        if (!silent)
          toast.error(err instanceof Error ? err.message : "Failed to load unread chats");
      }
    };

    void loadSummary(false);
    void loadUnread(false);
    const iv = window.setInterval(() => {
      void loadSummary(true);
      void loadUnread(true);
    }, 5000);

    return () => {
      active = false;
      window.clearInterval(iv);
    };
  }, [location.pathname]);

  useEffect(() => {
    setAgencyAdmin(getStoredAgencyAdmin());
  }, [location.pathname]);

  const handleLogout = async () => {
    try {
      await fetch("/api/agency-auth/logout", {
        method: "POST",
        headers: { ...getAgencyAdminAuthHeaders() },
      });
    } catch {
      // swallow — auth cleared regardless
    } finally {
      clearAgencyAdminAuth();
      toast.success("Agency admin logged out");
      navigate(adminPath("/login"), { replace: true });
    }
  };

  const initials = (agencyAdmin?.agencyName || "A").slice(0, 2).toUpperCase();
  const agencyDisplayName = getAgencyDisplayName(agencyAdmin);
  const agencyWelcomeName = getAgencyDisplayWelcomeName(agencyAdmin);
  const desktopWidth = collapsed ? 64 : 230;

  const sharedSidebarProps = {
    location,
    unreadAgencyChats,
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
              color: "#9CA3AF",
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

          {/* Collapse toggle knob on the right edge */}
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
              (e.currentTarget as HTMLButtonElement).style.background = "#E1F5EE";
              (e.currentTarget as HTMLButtonElement).style.borderColor = "#0D6E56";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background = "#fff";
              (e.currentTarget as HTMLButtonElement).style.borderColor = "#E5E7EB";
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
        {/* Top header */}
        <header
          style={{
            height: 86,
            flexShrink: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderBottom: "1px solid #E5E7EB",
            background: "#fff",
            padding: "0 24px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
            {/* Hamburger only on mobile */}
            {!isDesktop && (
              <button
                onClick={() => setMobileOpen(true)}
                aria-label="Open menu"
                style={{
                  display: "flex",
                  width: 32,
                  height: 32,
                  flexShrink: 0,
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: 6,
                  border: "none",
                  background: "transparent",
                  cursor: "pointer",
                  color: "#6B7280",
                }}
              >
                <Menu style={{ width: 20, height: 20 }} />
              </button>
            )}

            <span
              style={{
                fontSize: 18,
                fontWeight: 700,
                color: "#1F2937",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {isDesktop ? "Maid Agency Account Management" : "Find Maids Admin"}
            </span>
          </div>

          <div style={{ display: "flex", flexShrink: 0, alignItems: "center", gap: 10 }}>
            <button
              style={{
                width: 32,
                height: 32,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                borderRadius: "50%",
                border: "1px solid #E5E7EB",
                background: "transparent",
                cursor: "pointer",
                color: "#9CA3AF",
              }}
            >
              <Bell style={{ width: 15, height: 15 }} />
            </button>

            {isDesktop && (
              <button
                style={{
                  width: 32,
                  height: 32,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: "50%",
                  border: "1px solid #E5E7EB",
                  background: "transparent",
                  cursor: "pointer",
                  color: "#9CA3AF",
                }}
              >
                <HelpCircle style={{ width: 15, height: 15 }} />
              </button>
            )}

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  style={{ background: "none", border: "none", cursor: "pointer" }}
                  className="focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0D6E56] rounded-full"
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
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64">
                <DropdownMenuLabel className="flex items-center gap-3 py-3">
                  <Avatar className="h-10 w-10 flex-shrink-0">
                    <AvatarImage
                      src={agencyLogoUrl || agencyAdmin?.profileImageUrl}
                      alt={agencyAdmin?.agencyName || "Agency"}
                    />
                    <AvatarFallback className="bg-[#0D6E56] text-[13px] font-bold text-white">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="truncate text-[14px] font-bold text-gray-100">
                      Welcome! {agencyWelcomeName}
                    </p>
                    <p className="truncate text-[13px] font-semibold leading-snug text-gray-500">
                      {agencyDisplayName}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => void handleLogout()}
                  className="cursor-pointer font-semibold text-[14px] text-red-500 focus:bg-red-50 focus:text-red-600"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Welcome bar */}
        <div
          style={{
            flexShrink: 0,
            borderBottom: "1px solid #E5E7EB",
            background: "#fff",
            padding: "10px 24px",
          }}
        >
          <p
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              fontSize: 16,
              fontWeight: 500,
              color: "#4B5563",
              margin: 0,
            }}
          >
            Welcome:
            <span style={{ fontWeight: 700, color: "#0D6E56" }}>
              {agencyWelcomeName}
            </span>
            <Hand style={{ width: 18, height: 18, color: "#0D6E56" }} />
          </p>
        </div>

        {/* Page content */}
        <main style={{ flex: 1, overflowY: "auto", padding: 24 }}>{children}</main>

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
            color: "#9CA3AF",
          }}
        >
          © 2026 STREET PTE LTD. All Rights Reserved.
        </footer>
      </div>
    </div>
  );
};

export default AppLayout;
