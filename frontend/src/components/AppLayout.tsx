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

/* ─── 3D Icon config per nav item ──────────────────────────────────────── */

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
    path: adminPath("/request"),
    icon: PhoneIncoming,
    iconBg: "linear-gradient(145deg, #86EFAC, #16A34A)",
    iconShadow: "0 4px 0 #15803D, 0 6px 12px rgba(22,163,74,0.45)",
    iconShadowActive: "0 2px 0 #15803D, 0 3px 8px rgba(22,163,74,0.4)",
    iconColor: "#fff",
  },
];

/* ─── 3D Icon Badge ─────────────────────────────────────────────────────── */

interface Icon3DProps {
  icon: React.ElementType;
  bg: string;
  shadow: string;
  shadowActive: string;
  color: string;
  isActive: boolean;
}

const Icon3D = ({ icon: IconComp, bg, shadow, shadowActive, color, isActive }: Icon3DProps) => (
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
      style={{ width: 17, height: 17, color, filter: "drop-shadow(0 1px 1px rgba(0,0,0,0.25))" }}
    />
  </span>
);

/* ─── Sidebar content ────────────────────────────────────────────────────── */

interface SidebarContentProps {
  location: ReturnType<typeof useLocation>;
  unreadAgencyChats: number;
  agencyLogoUrl: string;
  agencyAdmin: AgencyAdminUser | null;
  onNavClick?: () => void;
}

const SidebarContent = ({
  location,
  unreadAgencyChats,
  agencyLogoUrl,
  agencyAdmin,
  onNavClick,
}: SidebarContentProps) => (
  <>
    {/* Brand */}
    <div className="border-b border-gray-200 px-4 py-4">
      <p className="text-[18px] font-bold tracking-tight text-gray-900">Find Maids</p>
      <span className="text-[13px] font-semibold text-gray-500">Agency Management</span>
    </div>

    {/* Agency identity */}
    <div className="flex items-center gap-3 border-b border-gray-200 bg-[#0D6E56] px-4 py-3">
      <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center overflow-hidden rounded-lg bg-white/20">
        {agencyLogoUrl || agencyAdmin?.profileImageUrl ? (
          <img
            src={agencyLogoUrl || agencyAdmin?.profileImageUrl}
            alt="Agency logo"
            className="h-full w-full object-cover"
          />
        ) : (
          <Building2 className="h-5 w-5 text-white" />
        )}
      </div>
      <div className="min-w-0">
        <p className="truncate text-[14px] font-bold text-white">
          {agencyAdmin?.agencyName ?? "Admin Portal"}
        </p>
        <p className="text-[12px] font-medium text-white/80">Management Suite</p>
      </div>
    </div>

    {/* Nav links */}
    <nav className="flex-1 overflow-y-auto py-2">
      <ul className="space-y-0.5">
        {navItems.map((item) => {
          const isActive =
            location.pathname === item.path ||
            location.pathname.startsWith(`${item.path}/`);
          const hasUnread =
            item.path === adminPath("/chat-support") && unreadAgencyChats > 0;

          return (
            <li key={item.path}>
              <Link
                to={item.path}
                onClick={onNavClick}
                className={`relative flex items-center gap-2.5 px-3 py-2 text-[18px] transition-colors rounded-none ${
                  isActive
                    ? "border-r-2 border-[#0D6E56] bg-[#E1F5EE] font-bold text-[#0D6E56]"
                    : "font-semibold text-gray-600 hover:bg-gray-50 hover:text-gray-800"
                }`}
              >
                <Icon3D
                  icon={item.icon}
                  bg={item.iconBg}
                  shadow={item.iconShadow}
                  shadowActive={item.iconShadowActive}
                  color={item.iconColor}
                  isActive={isActive}
                />

                <span className="flex-1 truncate">{item.label}</span>

                {hasUnread && (
                  <span className="ml-auto inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-500 px-1.5 text-[11px] font-bold text-white">
                    {unreadAgencyChats}
                  </span>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  </>
);

/* ─── Main Layout ─────────────────────────────────────────────────────── */

const AppLayout = ({ children }: { children: React.ReactNode }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [unreadAgencyChats, setUnreadAgencyChats] = useState<number>(0);
  const [agencyAdmin, setAgencyAdmin] = useState<AgencyAdminUser | null>(
    getStoredAgencyAdmin()
  );
  const [agencyLogoUrl, setAgencyLogoUrl] = useState("");

  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    let active = true;

    const loadSummary = async (silent = false) => {
      try {
        const [response, companyResponse] = await Promise.all([
          fetch("/api/company/summary"),
          fetch("/api/company"),
        ]);
        const data = (await response.json().catch(() => ({}))) as {
          pendingRequests?: number;
          unreadAgencyChats?: number;
          error?: string;
        };
        if (!response.ok) throw new Error(data.error || "Failed to load notifications");
        if (!active) return;
        setUnreadAgencyChats(data.unreadAgencyChats ?? 0);

        if (companyResponse.ok) {
          const companyData = (await companyResponse.json().catch(() => ({}))) as {
            companyProfile?: { logo_data_url?: string };
          };
          if (active) setAgencyLogoUrl(companyData.companyProfile?.logo_data_url || "");
        }
      } catch (error) {
        if (!silent)
          toast.error(error instanceof Error ? error.message : "Failed to load notifications");
      }
    };

    const loadUnreadChats = async (silent = false) => {
      try {
        const unreadCount = await fetchAdminUnreadChatCount();
        if (active) setUnreadAgencyChats(unreadCount);
      } catch (error) {
        if (!silent)
          toast.error(error instanceof Error ? error.message : "Failed to load unread chats");
      }
    };

    void loadSummary(false);
    void loadUnreadChats(false);
    const interval = window.setInterval(() => {
      void loadSummary(true);
      void loadUnreadChats(true);
    }, 5000);

    return () => {
      active = false;
      window.clearInterval(interval);
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
      // Local auth is cleared even if the request fails.
    } finally {
      clearAgencyAdminAuth();
      toast.success("Agency admin logged out");
      navigate(adminPath("/login"), { replace: true });
    }
  };

  const initials = (agencyAdmin?.agencyName || "A").slice(0, 2).toUpperCase();

  const sharedSidebarProps: SidebarContentProps = {
    location,
    unreadAgencyChats,
    agencyLogoUrl,
    agencyAdmin,
  };

  return (
    <div className="flex h-screen overflow-hidden bg-[#F8FAFC]">

      {/* ── MOBILE: backdrop ── */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* ── MOBILE: slide-in drawer ── */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-gray-200 bg-white shadow-xl transition-transform duration-300 ease-in-out lg:hidden ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
        aria-label="Navigation drawer"
      >
        <button
          onClick={() => setSidebarOpen(false)}
          className="absolute right-2 top-2 z-10 flex h-7 w-7 items-center justify-center rounded-md text-gray-400 hover:bg-gray-100"
          aria-label="Close menu"
        >
          <X className="h-4 w-4" />
        </button>
        <SidebarContent
          {...sharedSidebarProps}
          onNavClick={() => setSidebarOpen(false)}
        />
      </aside>

      {/* ── DESKTOP: persistent sidebar ── */}
      <aside className="hidden lg:flex w-52 min-w-[350px] flex-col border-r border-gray-200 bg-white">
        <SidebarContent {...sharedSidebarProps} />
      </aside>

      {/* ── MAIN AREA ── */}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">

        {/* Top bar */}
        <header className="flex h-[86px] flex-shrink-0 items-center justify-between border-b border-gray-200 bg-white px-4 lg:px-6">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => setSidebarOpen(true)}
              className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-md text-gray-500 hover:bg-gray-100 lg:hidden"
              aria-label="Open menu"
            >
              <Menu className="h-5 w-5" />
            </button>
            <span className="truncate text-[15px] font-bold text-gray-800 sm:text-[20px]">
              <span className="hidden sm:inline">Maid Agency Account Management</span>
              <span className="sm:hidden">Find Maids Admin</span>
            </span>
          </div>

          <div className="flex flex-shrink-0 items-center gap-2 lg:gap-3">
            <button className="flex h-8 w-8 items-center justify-center rounded-full border border-gray-200 text-gray-400 hover:bg-gray-50">
              <Bell className="h-[15px] w-[15px]" />
            </button>
            <button className="hidden sm:flex h-8 w-8 items-center justify-center rounded-full border border-gray-200 text-gray-400 hover:bg-gray-50">
              <HelpCircle className="h-[15px] w-[15px]" />
            </button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0D6E56] rounded-full">
                  <Avatar className="h-8 w-8 cursor-pointer">
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
                      Welcome! {agencyAdmin?.username ?? "Agency Admin"}
                    </p>
                    <p className="truncate whitespace-normal text-[13px] font-semibold leading-snug text-gray-500">
                      {agencyAdmin?.agencyName ?? "Agency"}
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
        <div className="flex-shrink-0 border-b border-gray-200 bg-white px-4 py-2.5 lg:px-6">
          <p className="flex items-center gap-2 text-[18px] font-medium text-gray-600">

            Welcome:
            <span className="font-bold text-[#0D6E56]">
              {agencyAdmin?.username ?? "Agency Admin"}
            </span>
             <Hand className="h-5 w-5 text-[#0D6E56]" />
          </p>
        </div>
        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">{children}</main>

        {/* Footer */}
        <footer className="flex-shrink-0 border-t border-gray-200 bg-white py-2.5 text-center text-[12px] font-medium text-gray-500">
          © 2026 STREET PTE LTD. All Rights Reserved.
        </footer>
      </div>
    </div>
  );
};

export default AppLayout;