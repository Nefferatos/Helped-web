import { Link, useLocation, useNavigate } from "react-router-dom";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "@/components/ui/sonner";
import { cn } from "@/lib/utils";
import { clearClientAuth, getClientAuthHeaders, getStoredClient, type ClientUser } from "@/lib/clientAuth";
import "./ClientTheme.css";

const tabs = [
  { label: "Home", to: "/client/home" },
  { label: "Search Maid", to: "/client/maids" },
  { label: "Messages", to: "/client/support-chat" },
  { label: "Enquiry", to: "/client/enquiry" },
  { label: "History", to: "/client/history" },
];

const ClientPortalNavbar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [clientUser, setClientUser] = useState<ClientUser | null>(getStoredClient());
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const isActive = useCallback((to: string) => {
    const [path, hash] = to.split("#");
    if (hash) {
      return location.pathname === path && location.hash === `#${hash}`;
    }
    return location.pathname === to;
  }, [location.hash, location.pathname]);

  useEffect(() => {
    setClientUser(getStoredClient());
    setIsMobileMenuOpen(false);
  }, [location.pathname, location.hash]);

  const activeKey = useMemo(() => {
    const directMatch = tabs.find((tab) => isActive(tab.to));
    return directMatch?.to || "";
  }, [isActive]);

  const handleLogout = async () => {
    try {
      await fetch("/api/client-auth/logout", {
        method: "POST",
        headers: { ...getClientAuthHeaders() },
      });
    } catch {

    } finally {
      clearClientAuth();
      toast.success("Logged out");
      navigate("/employer-login");
    }
  };

  return (
    <header className="client-page-theme sticky top-0 z-50 border-b bg-card/90 backdrop-blur supports-[backdrop-filter]:bg-card/75">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-3 py-2 sm:px-6 sm:py-3">
        <div className="flex items-center gap-3">
          <button
            className="inline-flex h-9 w-9 items-center justify-center rounded-xl border bg-background/60 hover:bg-muted transition md:hidden"
            onClick={() => setIsMobileMenuOpen((v) => !v)}
            aria-label={isMobileMenuOpen ? "Close navigation menu" : "Open navigation menu"}
          >
            {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>

          <Link to="/client/home" className="shrink-0 font-display text-base font-bold text-foreground sm:text-lg">
            Client Portal
          </Link>
        </div>

        <nav className="hidden md:flex min-w-0 flex-1 items-center justify-center gap-1">
          {tabs.map((tab) => {
            const active = isActive(tab.to);
            return (
              <Link
                key={tab.to}
                to={tab.to}
                className={cn(
                  "relative rounded-xl px-3 py-2 text-sm font-medium transition-colors whitespace-nowrap",
                  active ? "text-foreground" : "text-muted-foreground hover:text-foreground",
                )}
                aria-current={active ? "page" : undefined}
              >
                {tab.label}
                <span
                  className={cn(
                    "pointer-events-none absolute inset-x-3 -bottom-0.5 h-0.5 rounded-full transition-opacity",
                    active ? "bg-primary opacity-100" : "bg-primary opacity-0",
                  )}
                />
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-2 shrink-0">
          <Button asChild className="rounded-full hidden sm:inline-flex">
            <Link to="/client/requests">Request Maid</Link>
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-2 rounded-full border bg-background px-2 py-1 transition hover:border-primary/40">
                <Avatar className="h-9 w-9">
                  <AvatarImage src={clientUser?.profileImageUrl} alt={clientUser?.name || "Client"} />
                  <AvatarFallback className="bg-primary/10 text-primary text-xs">
                    {(clientUser?.name || "C").slice(0, 1).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className="hidden lg:inline text-sm font-medium max-w-[160px] truncate">
                  {clientUser?.name || "Client"}
                </span>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>My Account</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link to="/client/profile">Profile</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link to="/client/change-password">Change Password</Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => void handleLogout()}>
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {isMobileMenuOpen && (
        <div className="border-t bg-background/80 backdrop-blur md:hidden">
          <div className="mx-auto w-full max-w-6xl px-3 py-3 sm:px-6">
            <div className="grid grid-cols-2 gap-2">
              {tabs.map((tab) => {
                const active = tab.to === activeKey;
                return (
                  <Link
                    key={tab.to}
                    to={tab.to}
                    className={cn(
                      "rounded-xl border px-3 py-2 text-sm font-medium transition-colors",
                      active ? "border-primary/40 bg-primary/10 text-foreground" : "bg-background hover:bg-muted",
                    )}
                    aria-current={active ? "page" : undefined}
                  >
                    {tab.label}
                  </Link>
                );
              })}
            </div>
            <div className="mt-3">
              <Button asChild className="w-full rounded-2xl">
                <Link to="/client/requests">Request Maid</Link>
              </Button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};

export default ClientPortalNavbar;
