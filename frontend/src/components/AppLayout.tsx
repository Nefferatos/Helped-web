import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { LogOut } from "lucide-react";
import { adminPath } from "@/lib/routes";
import { toast } from "@/components/ui/sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { clearAgencyAdminAuth, getAgencyAdminAuthHeaders, getStoredAgencyAdmin, type AgencyAdminUser } from "@/lib/agencyAdminAuth";
import { fetchAdminUnreadChatCount } from "@/lib/chat";

const navItems = [
  { label: "HOME", path: adminPath("/dashboard") },
  { label: "AGENCY PROFILE", path: adminPath("/agency-profile") },
  { label: "ADD", path: adminPath("/add-maid") },
  { label: "EDIT/DELETE", path: adminPath("/edit-maids") },
  // { label: "REQUESTS", path: adminPath("/requests") },
  { label: "CHAT SUPPORT", path: adminPath("/chat-support") },
  { label: "PASSWORD MANAGEMENT", path: adminPath("/change-password") },
  { label: "INCOMING INQUIRIES", path: adminPath("/enquiry") },
];

const AppLayout = ({ children }: { children: React.ReactNode }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [pendingRequests, setPendingRequests] = useState<number>(0);
  const [unreadAgencyChats, setUnreadAgencyChats] = useState<number>(0);
  const [agencyAdmin, setAgencyAdmin] = useState<AgencyAdminUser | null>(getStoredAgencyAdmin());
  const [agencyLogoUrl, setAgencyLogoUrl] = useState("");

  useEffect(() => {
    let active = true;

    const loadSummary = async (silent = false) => {
      try {
        const [response, companyResponse] = await Promise.all([fetch("/api/company/summary"), fetch("/api/company")]);
        const data = (await response.json().catch(() => ({}))) as {
          pendingRequests?: number;
          unreadAgencyChats?: number;
          error?: string;
        };
        if (!response.ok) {
          throw new Error(data.error || "Failed to load notifications");
        }
        if (!active) return;
        setPendingRequests(data.pendingRequests ?? 0);
        setUnreadAgencyChats(data.unreadAgencyChats ?? 0);

        if (companyResponse.ok) {
          const companyData = (await companyResponse.json().catch(() => ({}))) as {
            companyProfile?: { logo_data_url?: string };
          };
          if (active) {
            setAgencyLogoUrl(companyData.companyProfile?.logo_data_url || "");
          }
        }
      } catch (error) {
        if (!silent) {
          toast.error(error instanceof Error ? error.message : "Failed to load notifications");
        }
      }
    };

    const loadUnreadChats = async (silent = false) => {
      try {
        const unreadCount = await fetchAdminUnreadChatCount();
        if (active) {
          setUnreadAgencyChats(unreadCount);
        }
      } catch (error) {
        if (!silent) {
          toast.error(error instanceof Error ? error.message : "Failed to load unread chats");
        }
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

  const totalNotifications = pendingRequests + unreadAgencyChats;

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

  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAFC]">
      {/* HEADER */}
      <header className="bg-white/80 backdrop-blur border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <h1 className="text-lg font-semibold text-gray-800 tracking-tight">
            Find Maids - Maid Agency Account Management
          </h1>

          <div className="flex items-center gap-3">
            {/* <Link
              to={adminPath("/requests")}
              className="relative flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 transition"
            >
              <Bell className="h-4 w-4" />
              <span>Notifications</span>

              {totalNotifications > 0 && (
                <span className="absolute -right-1 -top-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                  {totalNotifications}
                </span>
              )}
            </Link> */}

            {/* <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="flex items-center gap-3 rounded-full border border-gray-200 bg-white px-2 py-1 pr-3 text-sm shadow-sm hover:shadow-md transition"
                >
                  <Avatar className="h-9 w-9 border border-gray-200">
                    <AvatarImage
                      src={agencyLogoUrl || agencyAdmin?.profileImageUrl}
                      alt={agencyAdmin?.agencyName || "Agency"}
                    />
                    <AvatarFallback className="bg-gray-100 text-gray-700">
                      {(agencyAdmin?.agencyName || "A")
                        .slice(0, 1)
                        .toUpperCase()}
                    </AvatarFallback>
                  </Avatar>

                  <div className="hidden text-left md:block">
                    <p className="text-sm font-semibold text-gray-800">
                      {agencyAdmin?.agencyName || "Agency Portal"}
                    </p>
                    <p className="text-xs text-gray-500">
                      {agencyAdmin?.username || "Agency Admin"}
                    </p>
                  </div>
                </button>
              </DropdownMenuTrigger>

              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>Agency Account</DropdownMenuLabel>
                <DropdownMenuSeparator />

                <DropdownMenuItem asChild>
                  <Link to={adminPath("/agency-profile")}>
                    <UserRound className="mr-2 h-4 w-4" />
                    Profile
                  </Link>
                </DropdownMenuItem>

                <DropdownMenuItem asChild>
                  <Link to={adminPath("/change-password")}>
                    <Settings className="mr-2 h-4 w-4" />
                    Settings
                  </Link>
                </DropdownMenuItem>

                <DropdownMenuSeparator />

                <DropdownMenuItem onClick={() => void handleLogout()}>
                  <LogOut className="mr-2 h-4 w-4" />
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu> */}
            <button
              onClick={() => void handleLogout()}
              className="text-red-600 hover:text-red-800 active:text-red-900 text-sm font-extrabold underline underline-offset-4 px-2 py-1 focus:outline-none focus:ring-2 focus:ring-red-400 rounded"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* NAV */}
      <nav className="bg-white border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-4 flex flex-wrap justify-center items-center gap-2 py-2">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`relative px-4 py-2 text-xs font-extrabold uppercase tracking-wide rounded-lg transition-all ${
                location.pathname === item.path ||
                location.pathname.startsWith(`${item.path}/`)
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-blue-600 hover:bg-blue-50"
              }`}
            >
              {item.label}

              {item.path === adminPath("/chat-support") &&
                unreadAgencyChats > 0 && (
                  <span className="absolute -right-1 -top-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                    {unreadAgencyChats}
                  </span>
                )}
            </Link>
          ))}
        </div>
      </nav>

     {/* WELCOME (Simple + High Visibility) */}
      <div className="max-w-4xl mx-auto px-4 w-full pt-6">
        <div className="flex items-center justify-between border-b border-gray-300 pb-2">
          
          <p className="text-lg font-extrabold text-blue-700">
            Welcome:{" "}
            <span className="text-black">
              {agencyAdmin?.username ?? "Agency Admin"}
            </span>
          </p>

        </div>
      </div>

      {/* MAIN */}
      <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-6">
        {children}
      </main>

      {/* FOOTER */}
      <footer className="border-t border-gray-200 py-4 text-center text-xs text-gray-400 bg-[#F8FAFC]">
        © 2026 STREET PTE LTD. All Rights Reserved.
      </footer>
    </div>
  );
};

export default AppLayout;
