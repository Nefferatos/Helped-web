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

const navItems = [
  { label: "Home", path: adminPath("/dashboard"), icon: LayoutDashboard },
  { label: "Agency Profile", path: adminPath("/agency-profile"), icon: Building2 },
  { label: "Add Maid", path: adminPath("/add-maid"), icon: UserPlus },
  { label: "Edit / Delete", path: adminPath("/edit-maids"), icon: Pencil },
  { label: "Chat Support", path: adminPath("/chat-support"), icon: MessageSquare },
  { label: "Password Management", path: adminPath("/change-password"), icon: Lock },
  { label: "Employment Contracts", path: adminPath("/employment-contracts"), icon: FileText },
  { label: "Incoming Inquiries", path: adminPath("/enquiry"), icon: PhoneIncoming },
];

/* ─── Sidebar content (reused in both desktop sidebar & mobile drawer) ── */

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
      <p className="text-[15px] font-semibold tracking-tight text-gray-900">Find Maids</p>
      <span className="text-[11px] text-gray-400">Agency Management</span>
    </div>

    {/* Agency identity */}
    <div className="flex items-center gap-3 border-b border-gray-200 bg-[#0D6E56] px-4 py-3">
      <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center overflow-hidden rounded-lg bg-white/20">
        {agencyLogoUrl || agencyAdmin?.profileImageUrl ? (
          <img
            src={agencyLogoUrl || agencyAdmin?.profileImageUrl}
            alt="Agency logo"
            className="h-full w-full object-cover"
          />
        ) : (
          <Building2 className="h-4 w-4 text-white" />
        )}
      </div>
      <div className="min-w-0">
        <p className="truncate text-[12px] font-medium text-white">
          {agencyAdmin?.agencyName ?? "Admin Portal"}
        </p>
        <p className="text-[10px] text-white/70">Management Suite</p>
      </div>
    </div>

    {/* Nav links */}
    <nav className="flex-1 overflow-y-auto py-2">
      <ul className="space-y-0.5">
        {navItems.map((item) => {
          const Icon = item.icon;
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
                className={`relative flex items-center gap-2.5 px-4 py-2.5 text-[13px] transition-colors ${
                  isActive
                    ? "border-r-2 border-[#0D6E56] bg-[#E1F5EE] font-medium text-[#0D6E56]"
                    : "text-gray-500 hover:bg-gray-50 hover:text-gray-700"
                }`}
              >
                <Icon
                  className={`h-4 w-4 flex-shrink-0 ${
                    isActive ? "text-[#0D6E56]" : "text-[#0D6E56]/60"
                  }`}
                />

                <span className="flex-1 truncate">{item.label}</span>

                {hasUnread && (
                  <span className="ml-auto inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-medium text-white">
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

  // Close mobile drawer on route change
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
      <aside className="hidden lg:flex w-52 min-w-[208px] flex-col border-r border-gray-200 bg-white">
        <SidebarContent {...sharedSidebarProps} />
      </aside>

      {/* ── MAIN AREA ── */}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">

        {/* Top bar */}
        <header className="flex h-[52px] flex-shrink-0 items-center justify-between border-b border-gray-200 bg-white px-4 lg:px-6">
          <div className="flex items-center gap-3 min-w-0">
            {/* Hamburger — mobile only */}
            <button
              onClick={() => setSidebarOpen(true)}
              className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-md text-gray-500 hover:bg-gray-100 lg:hidden"
              aria-label="Open menu"
            >
              <Menu className="h-5 w-5" />
            </button>
            <span className="truncate text-[13px] font-medium text-gray-800 sm:text-[14px]">
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
                    <AvatarFallback className="bg-[#0D6E56] text-[12px] font-medium text-white">
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
                    <AvatarFallback className="bg-[#0D6E56] text-[12px] font-medium text-white">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="truncate text-[13px] font-semibold text-gray-900">
                      Welcome! {agencyAdmin?.username ?? "Agency Admin"}
                    </p>
                    <p className="truncate whitespace-normal text-[12px] font-normal leading-snug text-gray-500">
                      {agencyAdmin?.agencyName ?? "Agency"}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => void handleLogout()}
                  className="cursor-pointer text-red-500 focus:bg-red-50 focus:text-red-600"
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
          <p className="text-[13px] text-gray-500">
            Welcome:{" "}
            <span className="font-medium text-[#0D6E56]">
              {agencyAdmin?.username ?? "Agency Admin"}
            </span>
          </p>
        </div>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">{children}</main>

        {/* Footer */}
        <footer className="flex-shrink-0 border-t border-gray-200 bg-white py-2.5 text-center text-[11px] text-gray-400">
          © 2026 STREET PTE LTD. All Rights Reserved.
        </footer>
      </div>
    </div>
  );
};

export default AppLayout;