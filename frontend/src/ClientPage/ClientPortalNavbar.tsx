import { Link, useLocation } from "react-router-dom";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  Bell,
  ChevronRight,
  ClipboardList,
  HelpCircle,
  History as HistoryIcon,
  Home,
  Menu,
  MessageCircle,
  MessageSquarePlus,
  Search,
  X,
  type LucideIcon,
} from "lucide-react";
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

type NavTab = { label: string; to: string; icon: LucideIcon };

const allTabs: NavTab[] = [
  { label: "Home",        to: "/client/home",         icon: Home },
  { label: "Search Maid", to: "/client/maids",         icon: Search },
  { label: "My Requests", to: "/client/requests",      icon: ClipboardList },
  { label: "Messages",    to: "/client/support-chat",  icon: MessageCircle },
  { label: "FAQ",         to: "/client/faq",           icon: HelpCircle },
  { label: "Enquiry",     to: "/client/enquiry",       icon: MessageSquarePlus },
  { label: "History",     to: "/client/history",       icon: HistoryIcon },
];

// Enquiry is a secondary action — shown as its own CTA button in the
// mobile drawer instead of occupying a grid tile.
const mobileGridTabs = allTabs.filter((t) => t.to !== "/client/enquiry");

// Horizontal padding baked into each desktop tab link (px-2.5 = 10px).
// Used to inset the sliding underline so it lines up with the label
// rather than spanning the link's full hit-target width.
const TAB_LABEL_INSET = 10;

// How often to poll for new chat notifications while the tab is visible.
const NOTIFICATION_POLL_MS = 15000;

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

// Visually distinguishes agency vs. support conversations in the
// notification list — the type itself is information worth surfacing,
// not just a generic "Message" tag.
const getNotificationTypeMeta = (notification: SupportNotification) =>
  notification.conversationType === "agency"
    ? { label: "Agency", className: "bg-amber-500/10 text-amber-600" }
    : { label: "Support", className: "bg-primary/10 text-primary" };

const ClientPortalNavbar = () => {
  const location = useLocation();
  const [clientUser, setClientUser] = useState<ClientUser | null>(getStoredClient());
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [unreadChatCount, setUnreadChatCount] = useState(0);
  const [chatNotifications, setChatNotifications] = useState<SupportNotification[]>([]);
  const [notificationsLoading, setNotificationsLoading] = useState(true);
  const [isScrolled, setIsScrolled] = useState(false);

  const navRef = useRef<HTMLElement | null>(null);
  const tabRefs = useRef<Record<string, HTMLAnchorElement | null>>({});
  const [underline, setUnderline] = useState<{ left: number; width: number } | null>(null);

  const isActive = useCallback(
    (to: string) => {
      const [path, hash] = to.split("#");
      if (hash) return location.pathname === path && location.hash === `#${hash}`;
      return location.pathname === to;
    },
    [location.hash, location.pathname],
  );

  useEffect(() => {
    // syncClientProfileFromSession is deduplicated and cached internally,
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

  // Notification polling — paused while the tab is hidden so we're not
  // burning requests in background tabs, and refreshed immediately when
  // the tab regains focus so the badge doesn't feel stale.
  useEffect(() => {
    let active = true;
    let intervalId: number | undefined;

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
      } finally {
        if (active) setNotificationsLoading(false);
      }
    };

    const startPolling = () => {
      if (intervalId) return;
      void loadNotifications();
      intervalId = window.setInterval(() => {
        void loadNotifications();
      }, NOTIFICATION_POLL_MS);
    };

    const stopPolling = () => {
      if (intervalId) {
        window.clearInterval(intervalId);
        intervalId = undefined;
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        startPolling();
      } else {
        stopPolling();
      }
    };

    if (document.visibilityState === "visible") startPolling();
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      active = false;
      stopPolling();
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  // Track scroll position to add a subtle elevation cue once the page
  // content starts moving under the sticky header.
  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 6);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Auto-close the mobile drawer if the viewport grows into the desktop
  // breakpoint (e.g. rotating a tablet) so it can't get stuck open.
  useEffect(() => {
    const onResize = () => {
      if (window.innerWidth >= 1024) setIsMobileMenuOpen(false);
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // While the mobile drawer is open: lock background scroll and let
  // Escape close it, same as any other dismissible overlay.
  useEffect(() => {
    if (!isMobileMenuOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsMobileMenuOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [isMobileMenuOpen]);

  const activeKey = useMemo(
    () => allTabs.find((tab) => isActive(tab.to))?.to ?? "",
    [isActive],
  );

  // Measure the active tab's position so the underline can slide between
  // tabs instead of just toggling opacity per-link.
  useLayoutEffect(() => {
    const updateUnderline = () => {
      const activeEl = tabRefs.current[activeKey];
      const containerEl = navRef.current;
      if (!activeEl || !containerEl) {
        setUnderline(null);
        return;
      }
      const containerRect = containerEl.getBoundingClientRect();
      const elRect = activeEl.getBoundingClientRect();
      setUnderline({
        left: elRect.left - containerRect.left + TAB_LABEL_INSET,
        width: Math.max(elRect.width - TAB_LABEL_INSET * 2, 0),
      });
    };

    updateUnderline();
    window.addEventListener("resize", updateUnderline);
    return () => window.removeEventListener("resize", updateUnderline);
  }, [activeKey]);

  const handleLogout = async () => {
    toast.success("Logged out");
    await logoutClientPortal("/");
  };

  return (
    <header
      className={cn(
        "client-page-theme sticky top-0 z-50 border-b border-[#0E4E5E]/10 bg-white transition-shadow duration-300",
        isScrolled && "shadow-[0_2px_20px_rgba(14,78,94,.13)]",
      )}
    >
      <div className="h-[3px] w-full bg-[linear-gradient(90deg,#0E4E5E_0%,#FCD34D_60%,#0E4E5E_100%)]" />
      <div className="mx-auto flex h-14 w-full max-w-screen-xl items-center justify-between gap-2 px-4 sm:px-6 md:h-[76px]">

        {/* ── Left: hamburger (< lg) + logo ── */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border-2 border-[#0E4E5E]/20 bg-[#0E4E5E]/5 text-[#0E4E5E] transition hover:bg-[#0E4E5E]/10 lg:hidden"
            onClick={() => setIsMobileMenuOpen((v) => !v)}
            aria-label={isMobileMenuOpen ? "Close menu" : "Open menu"}
            aria-expanded={isMobileMenuOpen}
            aria-controls="client-mobile-nav-drawer"
          >
            {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>

          <Link
            to="/client/home"
            className="group flex shrink-0 items-center"
          >
            <img
              src="/FM_logo.webp"
              alt="Find Maids At The Agency — Employer Portal"
              width="300"
              height="123"
              className="h-11 w-auto object-contain transition-transform duration-200 group-hover:scale-[1.03] md:h-[58px]"
            />
          </Link>
        </div>

        {/* ── Centre: tab strip (lg+) with a sliding active-tab underline
              instead of a per-link indicator, so moving between tabs reads
              as one continuous motion. px-2.5 keeps all 7 tabs comfortably
              within 1024px without overflow or a scroll container.       ── */}
        <nav
          ref={navRef}
          className="relative hidden min-w-0 flex-1 items-center justify-center gap-0.5 lg:flex"
        >
          {allTabs.map((tab) => {
            const active = isActive(tab.to);
            return (
              <Link
                key={tab.to}
                to={tab.to}
                ref={(el) => {
                  tabRefs.current[tab.to] = el;
                }}
                className={cn(
                  "relative whitespace-nowrap rounded-lg px-2.5 py-2 text-[16px] font-medium transition-colors duration-150",
                  active
                    ? "font-semibold text-[#0E4E5E]"
                    : "text-[#0E4E5E] hover:bg-[#0E4E5E]/[.08] hover:text-[#0B3340]",
                )}
                aria-current={active ? "page" : undefined}
              >
                {tab.label}
              </Link>
            );
          })}
          <span
            className="pointer-events-none absolute bottom-1 h-0.5 rounded-full bg-[#FCD34D] transition-all duration-300 ease-out"
            style={{
              left: underline?.left ?? 0,
              width: underline?.width ?? 0,
              opacity: underline ? 1 : 0,
            }}
          />
        </nav>

        {/* ── Right: notifications + avatar ── */}
        <div className="flex items-center gap-2 shrink-0">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className="relative inline-flex h-9 w-9 items-center justify-center rounded-lg border-2 border-[#0E4E5E]/15 bg-[#0E4E5E]/5 text-[#0E4E5E] transition hover:border-[#0E4E5E]/30 hover:bg-[#0E4E5E]/10"
                aria-label={`Notifications${unreadChatCount > 0 ? ` (${unreadChatCount} unread)` : ""}`}
              >
                <Bell className="h-4 w-4" />
                {unreadChatCount > 0 && (
                  <span className="absolute -right-1 -top-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                    {unreadChatCount > 99 ? "99+" : unreadChatCount}
                  </span>
                )}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="client-page-theme w-[360px] max-w-[calc(100vw-24px)]">
              <DropdownMenuLabel className="flex items-center justify-between gap-3">
                <span>Notifications</span>
                <span className="text-xs font-medium text-muted-foreground">
                  {notificationsLoading
                    ? "Checking…"
                    : unreadChatCount > 0
                      ? `${unreadChatCount} unread`
                      : "All caught up"}
                </span>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />

              {notificationsLoading && (
                <div className="px-3 py-6 text-center text-sm text-muted-foreground">
                  Loading notifications…
                </div>
              )}

              {!notificationsLoading &&
                chatNotifications.slice(0, 6).map((notification) => {
                  const typeMeta = getNotificationTypeMeta(notification);
                  return (
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
                          <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-semibold", typeMeta.className)}>
                            {typeMeta.label}
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 text-[10px] text-muted-foreground">
                          <span>{formatNotificationTime(notification.createdAt)}</span>
                          {notification.status ? <span>{notification.status.replace(/_/g, " ")}</span> : null}
                          {notification.agencyName ? <span>{notification.agencyName}</span> : null}
                        </div>
                      </Link>
                    </DropdownMenuItem>
                  );
                })}

              {!notificationsLoading && chatNotifications.length === 0 && (
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
            <DropdownMenuContent align="end" className="client-page-theme w-56">
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
        <div
          id="client-mobile-nav-drawer"
          className="animate-in fade-in slide-in-from-top-2 duration-200 border-t bg-background/95 backdrop-blur lg:hidden"
        >
          <div className="mx-auto w-full max-w-6xl px-3 py-3 sm:px-6">

            {/* Single-column nav list — each row is a full-width tap target
                  with a leading icon and a trailing chevron (or the unread
                  badge for Messages), separated by hairline dividers. */}
            <div className="overflow-hidden rounded-2xl border divide-y divide-border">
              {mobileGridTabs.map((tab) => {
                const active = tab.to === activeKey;
                const Icon = tab.icon;
                const isMessages = tab.to === "/client/support-chat";
                return (
                  <Link
                    key={tab.to}
                    to={tab.to}
                    className={cn(
                      "flex items-center gap-3 px-4 py-3 text-[16px] font-medium transition-colors",
                      active ? "bg-primary/10 text-foreground" : "bg-background text-foreground hover:bg-muted",
                    )}
                    aria-current={active ? "page" : undefined}
                  >
                    <Icon className={cn("h-4 w-4 shrink-0", active ? "text-primary" : "text-muted-foreground")} />
                    <span className="flex-1">{tab.label}</span>
                    {isMessages && unreadChatCount > 0 ? (
                      <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                        {unreadChatCount > 99 ? "99+" : unreadChatCount}
                      </span>
                    ) : (
                      <ChevronRight
                        className={cn("h-4 w-4 shrink-0", active ? "text-primary" : "text-muted-foreground/50")}
                      />
                    )}
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
