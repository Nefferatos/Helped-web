import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Bell, LogOut } from "lucide-react";
import { adminPath } from "@/lib/routes";
import { toast } from "@/components/ui/sonner";
import { clearAgencyAdminAuth, getAgencyAdminAuthHeaders, getStoredAgencyAdmin, type AgencyAdminUser } from "@/lib/agencyAdminAuth";

const navItems = [
  { label: "HOME", path: adminPath("/dashboard") },
  { label: "AGENCY PROFILE", path: adminPath("/agency-profile") },
  { label: "ADD", path: adminPath("/add-maid") },
  { label: "EDIT/DELETE", path: adminPath("/edit-maids") },
  { label: "REQUESTS", path: adminPath("/requests") },
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

  useEffect(() => {
    const loadSummary = async () => {
      try {
        const response = await fetch("/api/company/summary");
        const data = (await response.json().catch(() => ({}))) as {
          pendingRequests?: number;
          unreadAgencyChats?: number;
          error?: string;
        };
        if (!response.ok) {
          throw new Error(data.error || "Failed to load notifications");
        }
        setPendingRequests(data.pendingRequests ?? 0);
        setUnreadAgencyChats(data.unreadAgencyChats ?? 0);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to load notifications");
      }
    };

    void loadSummary();
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
    <div className="min-h-screen flex flex-col bg-background">
      <header className="bg-nav text-nav-foreground">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <h1 className="text-lg font-bold tracking-tight">Find Maids – Maid Agency Account Management</h1>
          <div className="flex items-center gap-3">
            <Link
              to={adminPath("/requests")}
              className="relative flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-opacity hover:opacity-80"
            >
              <Bell className="h-4 w-4" />
              <span>Notifications</span>
              {totalNotifications > 0 ? (
                <span className="absolute -right-1 -top-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                  {totalNotifications}
                </span>
              ) : null}
            </Link>
            <button
              type="button"
              onClick={() => void handleLogout()}
              className="flex items-center gap-2 text-sm hover:opacity-80 transition-opacity active:scale-[0.97]"
            >
              <span>Log Out</span>
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      <nav className="bg-secondary border-b">
        <div className="max-w-5xl mx-auto px-4 flex flex-wrap justify-center items-center gap-1 py-1">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`px-3 py-2 text-xs font-bold uppercase tracking-wide rounded-sm transition-colors active:scale-[0.97] ${
                location.pathname === item.path || location.pathname.startsWith(`${item.path}/`)
                  ? "bg-primary text-primary-foreground"
                  : "text-primary hover:bg-primary/10"
              }`}
            >
              {item.label}
            </Link>
          ))}
        </div>
      </nav>

      <div className="max-w-3xl mx-auto px-4 w-full pt-4">
        <div className="flex items-center justify-between rounded-xl border bg-white px-4 py-3 shadow-sm">
          <p className="text-sm font-medium">
            Welcome back, <span className="font-semibold">{agencyAdmin?.username ?? "Agency Admin"}</span>
          </p>
          <span className="text-xs text-black">{agencyAdmin?.agencyName ?? "Agency Portal"}</span>
        </div>
      </div>

      <main className="flex-1">{children}</main>

      <footer className="border-t py-4 text-center text-xs text-muted-foreground">
        Copyright STREET PTE LTD. 2026. All Rights Reserved.
      </footer>
    </div>
  );
};

export default AppLayout;
