import { Link, useLocation } from "react-router-dom";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Bell, Menu, X } from "lucide-react";
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
import { getStoredClient, type ClientUser } from "@/lib/clientAuth";
import { fetchClientUnreadChatCount, type SupportNotification } from "@/lib/chat";
import { logoutClientPortal, syncClientProfileFromSession } from "@/lib/supabaseAuth";
import "./ClientTheme.css";

const allTabs = [
  { label: "Home",        to: "/client/home" },
  { label: "Search Maid", to: "/client/maids" },
  { label: "My Requests", to: "/client/requests" },
  { label: "AI Assistant", to: "/client/ai-assistant" },
  { label: "Messages",    to: "/client/support-chat" },
  { label: "FAQ",         to: "/client/faq" },
  { label: "Enquiry",     to: "/client/enquiry" },
  { label: "History",     to: "/client/history" },
];

// Enquiry is a secondary action — shown as its own CTA button in the
// mobile drawer instead of occupying a grid tile.
const mobileGridTabs = allTabs.filter((t) => t.to !== "/client/enquiry");

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

const getClientNotificationHref = (notification: SupportNotification) => {
  const params = new URLSearchParams();
  params.set("type", notification.conversationType === "agency" ? "agency" : "support");
  if (notification.conversationType === "agency" && notification.agencyId) {
    params.set("agencyId", String(notification.agencyId));
    if (notification.agencyName) params.set("agencyName", notification.agencyName);
  }
  const query = params.toString();
  return `/client/support-chat${query ? `?${query}` : ""}`;
};

const ClientPortalNavbar = () => {
  const location = useLocation();
  const [clientUser, setClientUser] = useState<ClientUser | null>(getStoredClient());
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [unreadChatCount, setUnreadChatCount] = useState(0);
  const [chatNotifications, setChatNotifications] = useState<SupportNotification[]>([]);

  const isActive = useCallback(
    (to: string) => {
      const [path, hash] = to.split("#");
      if (hash) return location.pathname === path && location.hash === `#${hash}`;
      return location.pathname === to;
    },
    [location.hash, location.pathname],
  );

  useEffect(() => {
    // FIX: syncClientProfileFromSession is now deduplicated and cached internally,
    // so calling it here on every route change is safe — it won't fire a new
    // network request if one is already in flight or the cache is still warm.
    // We intentionally do NOT make the cancellation token abort the setState
    // call, since the sync result is shared state and still valid even if this
    // component unmounts before it resolves.
    let cancelled = false;

    void syncClientProfileFromSession().then((c) => {
      if (!cancelled) {
        setClientUser(c ?? getStoredClient());
      }
    });

    setIsMobileMenuOpen(false);

    return () => {
      cancelled = true;
    };
  }, [location.pathname, location.hash]);

  useEffect(() => {
    let active = true;

    const loadNotifications = async () => {
      try {
        const summary = await fetchClientUnreadChatCount();
        if (!active) return;
        setUnreadChatCount(summary.unreadCount);
        setChatNotifications(summary.notifications);
      } catch {
        if (!active) return;
        setUnreadChatCount(0);
        setChatNotifications([]);
      }
    };

    void loadNotifications();
    const intervalId = window.setInterval(() => {
      void loadNotifications();
    }, 5000);

    return () => {
      active = false;
      window.clearInterval(intervalId);
    };
  }, []);

  const activeKey = useMemo(
    () => allTabs.find((tab) => isActive(tab.to))?.to ?? "",
    [isActive],
  );

  const handleLogout = async () => {
    toast.success("Logged out");
    await logoutClientPortal("/");
  };

  return (
    <header className="client-page-theme sticky top-0 z-50 border-b bg-card/90 backdrop-blur supports-[backdrop-filter]:bg-card/75">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-2 px-3 py-2 sm:px-6">

        {/* ── Left: hamburger (< lg) + logo ── */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            className="inline-flex h-9 w-9 items-center justify-center rounded-xl border bg-background/60 hover:bg-muted transition lg:hidden"
            onClick={() => setIsMobileMenuOpen((v) => !v)}
            aria-label={isMobileMenuOpen ? "Close menu" : "Open menu"}
          >
            {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>

          <Link
            to="/client/home"
            className="shrink-0 font-display text-sm font-bold text-foreground sm:text-base"
          >
            Employer Portal
          </Link>
        </div>

        {/* ── Centre: tab strip (lg+)
              Uses px-2.5 so all 7 tabs comfortably fit at 1024 px
              without overflow or a scroll container.              ── */}
        <nav className="hidden lg:flex min-w-0 flex-1 items-center justify-center gap-0.5">
          {allTabs.map((tab) => {
            const active = isActive(tab.to);
            return (
              <Link
                key={tab.to}
                to={tab.to}
                className={cn(
                  "relative rounded-xl px-2.5 py-2 text-sm font-medium transition-colors whitespace-nowrap",
                  active
                    ? "text-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
                aria-current={active ? "page" : undefined}
              >
                {tab.label}
                <span
                  className={cn(
                    "pointer-events-none absolute inset-x-2.5 -bottom-0.5 h-0.5 rounded-full transition-opacity",
                    active ? "bg-primary opacity-100" : "bg-primary opacity-0",
                  )}
                />
              </Link>
            );
          })}
        </nav>

        {/* ── Right: CTA + avatar ──
              Request Maid hidden on tablet (md–lg) — reappears at xl
              where there's room alongside the full desktop nav.     ── */}
        <div className="flex items-center gap-2 shrink-0">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className="relative inline-flex h-9 w-9 items-center justify-center rounded-xl border bg-background/60 hover:bg-muted transition"
                aria-label={`Notifications${unreadChatCount > 0 ? ` (${unreadChatCount} unread)` : ""}`}
              >
                <Bell className="h-4.5 w-4.5" />
                {unreadChatCount > 0 && (
                  <span className="absolute -right-1 -top-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                    {unreadChatCount > 99 ? "99+" : unreadChatCount}
                  </span>
                )}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-[360px] max-w-[calc(100vw-24px)]">
              <DropdownMenuLabel className="flex items-center justify-between gap-3">
                <span>Notifications</span>
                <span className="text-xs font-medium text-muted-foreground">
                  {unreadChatCount > 0 ? `${unreadChatCount} unread` : "All caught up"}
                </span>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              {chatNotifications.slice(0, 6).map((notification) => (
                <DropdownMenuItem key={notification.id} asChild>
                  <Link to={getClientNotificationHref(notification)} className="flex flex-col items-start gap-1">
                    <div className="w-full flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="font-medium text-foreground">
                          {notification.title}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {notification.body}
                        </div>
                      </div>
                      <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                        Message
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-[10px] text-muted-foreground">
                      <span>{formatNotificationTime(notification.createdAt)}</span>
                      {notification.status ? <span>{notification.status.replace(/_/g, " ")}</span> : null}
                      {notification.agencyName ? <span>{notification.agencyName}</span> : null}
                    </div>
                  </Link>
                </DropdownMenuItem>
              ))}
              {chatNotifications.length === 0 && (
                <div className="px-3 py-6 text-center text-sm text-muted-foreground">
                  No new notifications right now.
                </div>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link to="/client/support-chat" className="justify-center font-medium text-primary">
                  Open support chat
                </Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button asChild className="rounded-full hidden xl:inline-flex">
            <Link to="/client/maids?intent=request">Request Maid</Link>
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-1.5 rounded-full border bg-background px-2 py-1 transition hover:border-primary/40">
                <Avatar className="h-7 w-7 sm:h-8 sm:w-8">
                  <AvatarImage src={clientUser?.profileImageUrl} alt={clientUser?.name || "Client"} />
                  <AvatarFallback className="bg-primary/10 text-primary text-xs">
                    {(clientUser?.name || "C").slice(0, 1).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className="hidden xl:inline text-sm font-medium max-w-[140px] truncate">
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
              <DropdownMenuItem onClick={() => void handleLogout()}>Logout</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* ── Mobile / tablet drawer (< lg) ── */}
      {isMobileMenuOpen && (
        <div className="border-t bg-background/95 backdrop-blur lg:hidden">
          <div className="mx-auto w-full max-w-6xl px-3 py-3 sm:px-6">

            {/* 6 primary tabs in a 2-col (mobile) / 3-col (sm+) grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {mobileGridTabs.map((tab) => {
                const active = tab.to === activeKey;
                return (
                  <Link
                    key={tab.to}
                    to={tab.to}
                    className={cn(
                      "rounded-xl border px-3 py-2.5 text-sm font-medium transition-colors text-center",
                      active
                        ? "border-primary/40 bg-primary/10 text-foreground"
                        : "border-border bg-background hover:bg-muted text-foreground",
                    )}
                    aria-current={active ? "page" : undefined}
                  >
                    {tab.label}
                  </Link>
                );
              })}
            </div>

            {/* CTAs */}
            <div className="mt-3 grid grid-cols-2 gap-2">
              <Button asChild className="rounded-2xl">
                <Link to="/client/maids?intent=request">Request Maid</Link>
              </Button>
              <Button asChild variant="outline" className="rounded-2xl">
                <Link to="/client/enquiry">Submit Enquiry</Link>
              </Button>
            </div>

          </div>
        </div>
      )}
    </header>
  );
};

export default ClientPortalNavbar;
