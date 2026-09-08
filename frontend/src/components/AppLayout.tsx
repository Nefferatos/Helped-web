import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { LogOut, LayoutDashboard, Building2, UserPlus, Pencil, MessageSquare, Lock, FileText, PhoneIncoming, Bell, HelpCircle, Menu, X, ClipboardList, ChevronLeft, ChevronRight, Hand, Sparkles, Brain, Megaphone, Zap } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { adminPath } from "@/lib/routes";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { clearAgencyAdminAuth, getAgencyAdminAuthHeaders, getStoredAgencyAdmin, markAgencyAdminWelcomeShown, shouldShowAgencyAdminWelcome, type AgencyAdminUser } from "@/lib/agencyAdminAuth";
import { fetchAdminUnreadChatCount, markAdminNotificationsRead, type SupportNotification } from "@/lib/chat";

const C = { bg: "#F6F4EF", white: "#FFFFFF", green: "#1E6F52", greenLight: "#E4F1EA", text: "#1C231F", textSecondary: "#6B7268", textMuted: "#8B8F86", border: "#E3DFD4", surface: "#F0EEE7", red: "#A23B3B", redLight: "#FDE8E8", sidebarW: 248, sidebarCollapsedW: 68, headerH: 60 };

function useIsDesktop(bp = 1024) {
  const [d, set] = useState(() => typeof window !== "undefined" && window.innerWidth >= bp);
  useEffect(() => { const mq = window.matchMedia(`(min-width:${bp}px)`); const h = (e: MediaQueryListEvent) => set(e.matches); mq.addEventListener("change", h); return () => mq.removeEventListener("change", h); }, [bp]);
  return d;
}

const navItems = [
  { label: "Dashboard", path: adminPath("/dashboard"), icon: LayoutDashboard, badgeKey: null },
  { label: "Our Profile", path: adminPath("/agency-profile"), icon: Building2, badgeKey: null },
  { label: "Add Maid", path: adminPath("/add-maid"), icon: UserPlus, badgeKey: null },
  { label: "Manage Maids", path: adminPath("/edit-maids"), icon: Pencil, badgeKey: null },
  { label: "Applicants", path: adminPath("/recruitment"), icon: Brain, badgeKey: null },
  { label: "Messages", path: adminPath("/messages"), icon: MessageSquare, badgeKey: "unread" },
  { label: "Enquiries", path: adminPath("/enquiries"), icon: PhoneIncoming, badgeKey: null },
  { label: "Contracts", path: adminPath("/employment-contracts"), icon: FileText, badgeKey: null },
  { label: "Requests", path: adminPath("/requests"), icon: ClipboardList, badgeKey: "requests" },
  { label: "Security", path: adminPath("/change-password"), icon: Lock, badgeKey: null },
  { label: "AI Agents", path: adminPath("/ai-agents"), icon: Sparkles, badgeKey: null },
  { label: "AI Marketing", path: adminPath("/ai-direct-marketing"), icon: Megaphone, badgeKey: null },
  { label: "AI Automation", path: adminPath("/ai-automation"), icon: Zap, badgeKey: null },
  { label: "AI HR Interviewer", path: adminPath("/ai-hr-interviewer"), icon: Brain, badgeKey: null },
  { label: "Chatbot Config", path: adminPath("/chatbot-config"), icon: Hand, badgeKey: null },
];

function getPageTitle(p: string): string {
  const m = navItems.find(i => p.startsWith(i.path));
  if (m) return m.label;
  if (p.includes("/maid/")) return "Maid Profile";
  if (p.includes("/edit-maid/")) return "Edit Maid";
  if (p.includes("/employment-contracts/")) return "Contract Details";
  if (p.includes("/employer/")) return "Employer Details";
  if (p.includes("/agency-profile/edit")) return "Edit Profile";
  return "Dashboard";
}

const getName = (a: AgencyAdminUser | null) => !a ? "Agency" : a.role === "admin" ? a.agencyName || "Main Agency" : a.agencyName || a.username || "Agency";
const getSub = (a: AgencyAdminUser | null) => !a ? "Management Suite" : a.role === "admin" ? "Main Agency" : a.role === "agency" ? "Agency Account" : "Management Suite";
const getWelcome = (a: AgencyAdminUser | null) => !a ? "Agency" : a.role === "admin" ? a.agencyName || "Main Agency" : a.username || a.agencyName || "Agency";

const WelcomeModal = ({ agencyAdmin, agencyLogoUrl, onClose }: { agencyAdmin: AgencyAdminUser | null; agencyLogoUrl: string; onClose: () => void }) => {
  const name = getWelcome(agencyAdmin);
  const sub = getSub(agencyAdmin);
  const init = (agencyAdmin?.agencyName || "A").slice(0, 2).toUpperCase();
  const logo = agencyLogoUrl || agencyAdmin?.profileImageUrl || "";
  const [vis, setVis] = useState(false);
  useEffect(() => { const t = setTimeout(() => setVis(true), 20); return () => clearTimeout(t); }, []);
  const close = () => { setVis(false); setTimeout(onClose, 260); };
  return (
    <div onClick={close} style={{ position: "fixed", inset: 0, zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", background: vis ? "rgba(0,0,0,0.35)" : "rgba(0,0,0,0)", transition: "background 0.26s ease", padding: 16 }}>
      <div onClick={e => e.stopPropagation()} style={{ width: "100%", maxWidth: 400, background: C.white, borderRadius: 16, overflow: "hidden", border: "1px solid " + C.border, boxShadow: "0 20px 60px rgba(0,0,0,0.12)", transform: vis ? "translateY(0) scale(1)" : "translateY(24px) scale(0.97)", opacity: vis ? 1 : 0, transition: "all 0.26s cubic-bezier(0.16,1,0.3,1)" }}>
        <div style={{ background: C.green, padding: "32px 24px 28px", textAlign: "center" }}>
          <div style={{ width: 64, height: 64, borderRadius: 16, margin: "0 auto 16px", background: "rgba(255,255,255,0.15)", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", border: "2px solid rgba(255,255,255,0.25)" }}>
            {logo ? <img src={logo} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <span style={{ fontSize: 22, fontWeight: 700, color: "#fff" }}>{init}</span>}
          </div>
          <p style={{ margin: 0, fontSize: 20, fontWeight: 700, color: "#fff" }}>Welcome back,</p>
          <p style={{ margin: "4px 0 0", fontSize: 18, fontWeight: 600, color: "rgba(255,255,255,0.9)" }}>{name}</p>
          <p style={{ margin: "4px 0 0", fontSize: 13, color: "rgba(255,255,255,0.7)" }}>{sub}</p>
        </div>
        <div style={{ padding: "20px 24px 24px", textAlign: "center" }}>
          <button onClick={close} style={{ width: "100%", padding: "10px 0", borderRadius: 10, border: "none", background: C.green, color: "#fff", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>Get Started</button>
        </div>
      </div>
    </div>
  );
};

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const isDesktop = useIsDesktop();
  const [agencyAdmin, setAgencyAdmin] = useState<AgencyAdminUser | null>(null);
  const [agencyLogoUrl, setAgencyLogoUrl] = useState("");
  const [totalUnread, setTotalUnread] = useState(0);
  const [requestCount, setRequestCount] = useState(0);
  const [showWelcomeModal, setShowWelcomeModal] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const pageTitle = getPageTitle(location.pathname);
  const agencyDisplayName = getName(agencyAdmin);
  const agencyWelcomeName = getWelcome(agencyAdmin);
  const init = (agencyAdmin?.agencyName || "A").slice(0, 2).toUpperCase();

  useEffect(() => {
    const s = getStoredAgencyAdmin(); if (!s) return; setAgencyAdmin(s);
    if (shouldShowAgencyAdminWelcome()) { setShowWelcomeModal(true); markAgencyAdminWelcomeShown(); }
    (async () => { try { const r = await fetch("/api/agencies/" + (s.agencyId ?? s.id), { headers: { ...getAgencyAdminAuthHeaders() } }); if (r.ok) { const d = await r.json(); setAgencyLogoUrl(d.logoUrl || d.logo_url || ""); } } catch { /* ignore */ } })();
  }, []);

  useEffect(() => {
    const s = getStoredAgencyAdmin(); if (!s) return; let t: ReturnType<typeof setTimeout>;
    const p = async () => { try { setTotalUnread((await fetchAdminUnreadChatCount()).unreadCount); } catch { /* ignore */ } t = setTimeout(p, 30000); }; void p(); return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    const s = getStoredAgencyAdmin(); if (!s) return; let t: ReturnType<typeof setTimeout>;
    const p = async () => { try { const r = await fetch("/api/requests", { headers: { ...getAgencyAdminAuthHeaders() } }); if (r.ok) { const d = await r.json(); const l = Array.isArray(d) ? d : d.requests ?? []; setRequestCount(l.filter((x: { status?: string }) => !x.status || x.status === "pending").length); } } catch { /* ignore */ } t = setTimeout(p, 60000); }; void p(); return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    const s = getStoredAgencyAdmin(); if (!s) return; let t: ReturnType<typeof setTimeout>;
    const p = async () => { try { await fetch("/api/enquiries?limit=1", { headers: { ...getAgencyAdminAuthHeaders() } }); } catch { /* ignore */ } t = setTimeout(p, 60000); }; void p(); return () => clearTimeout(t);
  }, []);

  const handleLogout = async () => { try { const s = getStoredAgencyAdmin(); if (s) await fetch("/api/agency-admin/logout", { method: "POST", headers: { ...getAgencyAdminAuthHeaders() } }).catch(() => {}); } finally { clearAgencyAdminAuth(); navigate(adminPath("/login"), { replace: true }); } };
  useEffect(() => { setMobileOpen(false); }, [location.pathname]);

  const bv: Record<string, number> = { unread: totalUnread, requests: requestCount };
  const navP = { items: navItems, bv, loc: location, logoUrl: agencyLogoUrl, initials: init, agencyName: agencyDisplayName, welcomeName: agencyWelcomeName, admin: agencyAdmin, onLogout: handleLogout };

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: C.bg }}>
      {showWelcomeModal && <WelcomeModal agencyAdmin={agencyAdmin} agencyLogoUrl={agencyLogoUrl} onClose={() => setShowWelcomeModal(false)} />}
      {!isDesktop && mobileOpen && <div onClick={() => setMobileOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 30, background: "rgba(0,0,0,0.3)" }} />}
      {!isDesktop && (
        <aside style={{ position: "fixed", top: 0, left: 0, bottom: 0, width: C.sidebarW, zIndex: 40, background: C.white, borderRight: "1px solid " + C.border, boxShadow: "4px 0 24px rgba(0,0,0,0.08)", transform: mobileOpen ? "translateX(0)" : "translateX(-100%)", transition: "transform 0.3s ease", display: "flex", flexDirection: "column" }}>
          <button onClick={() => setMobileOpen(false)} style={{ position: "absolute", top: 12, right: 12, zIndex: 10, width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 6, border: "none", background: "transparent", cursor: "pointer", color: C.textMuted }}><X style={{ width: 16, height: 16 }} /></button>
          <SidebarNav {...navP} collapsed={false} onNavClick={() => setMobileOpen(false)} />
        </aside>
      )}
      {isDesktop && (
        <aside style={{ width: collapsed ? C.sidebarCollapsedW : C.sidebarW, flexShrink: 0, display: "flex", flexDirection: "column", borderRight: "1px solid " + C.border, background: C.white, transition: "width 0.3s cubic-bezier(0.4,0,0.2,1)", position: "relative", overflow: "visible" }}>
          <SidebarNav {...navP} collapsed={collapsed} />
          <button onClick={() => setCollapsed(c => !c)} style={{ position: "absolute", right: -14, top: 72, zIndex: 50, width: 28, height: 28, borderRadius: "50%", border: "1px solid " + C.border, background: C.white, boxShadow: "0 2px 8px rgba(0,0,0,0.08)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: C.textMuted }} onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = C.surface; }} onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = C.white; }}>
            {collapsed ? <ChevronRight style={{ width: 14, height: 14 }} /> : <ChevronLeft style={{ width: 14, height: 14 }} />}
          </button>
        </aside>
      )}
      <div style={{ display: "flex", flexDirection: "column", flex: 1, minWidth: 0, overflow: "hidden" }}>
        <HeaderBar isDesktop={isDesktop} setMobileOpen={setMobileOpen} totalUnread={totalUnread} pageTitle={pageTitle} logoUrl={agencyLogoUrl} admin={agencyAdmin} welcomeName={agencyWelcomeName} displayName={agencyDisplayName} init={init} onLogout={handleLogout} navigate={navigate} />
        <main style={{ flex: 1, overflowY: "auto", padding: 24 }}>{children}</main>
        <footer style={{ flexShrink: 0, borderTop: "1px solid " + C.border, background: C.white, padding: "10px 0", textAlign: "center", fontSize: 12, fontWeight: 400, color: C.textMuted }}>© 2026 STREET PTE LTD. All Rights Reserved.</footer>
      </div>
    </div>
  );
}

function HeaderBar({ isDesktop, setMobileOpen, totalUnread, pageTitle, logoUrl, admin, welcomeName, displayName, init, onLogout, navigate }: { isDesktop: boolean; setMobileOpen: (v: boolean) => void; totalUnread: number; pageTitle: string; logoUrl: string; admin: AgencyAdminUser | null; welcomeName: string; displayName: string; init: string; onLogout: () => void; navigate: ReturnType<typeof useNavigate> }) {
  return (
    <header style={{ height: C.headerH, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid " + C.border, background: C.white, padding: "0 24px", gap: 12 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
        {!isDesktop && <button onClick={() => setMobileOpen(true)} style={{ display: "flex", width: 36, height: 36, flexShrink: 0, alignItems: "center", justifyContent: "center", borderRadius: 8, border: "1px solid " + C.border, background: "transparent", cursor: "pointer", color: C.textSecondary, position: "relative" }}><Menu style={{ width: 18, height: 18 }} />{totalUnread > 0 && <span style={{ position: "absolute", top: 4, right: 4, width: 8, height: 8, borderRadius: "50%", background: C.red, border: "2px solid " + C.white }} />}</button>}
        <h1 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: C.text }}>{pageTitle}</h1>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <button onClick={() => { void (async () => { try { const s = getStoredAgencyAdmin(); if (!s) return; const r = await fetch("/api/chats/admin/notifications", { headers: { ...getAgencyAdminAuthHeaders() } }); if (r.ok) { const d = await r.json(); const n = (Array.isArray(d) ? d : []) as SupportNotification[]; if (n.length > 0) { navigate(adminPath("/messages?conversation=" + n[0].conversationId)); await markAdminNotificationsRead(); } else navigate(adminPath("/messages")); } } catch { navigate(adminPath("/messages")); } })(); }} style={{ position: "relative", display: "flex", width: 36, height: 36, alignItems: "center", justifyContent: "center", borderRadius: 8, border: "1px solid " + C.border, background: "transparent", cursor: "pointer", color: C.textSecondary }}>
          <Bell style={{ width: 18, height: 18 }} />
          {totalUnread > 0 && <span style={{ position: "absolute", top: -2, right: -2, width: 16, height: 16, borderRadius: "50%", background: C.red, color: "#fff", fontSize: 9, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", border: "2px solid " + C.white }}>{totalUnread > 9 ? "9+" : totalUnread}</span>}
        </button>
        <button style={{ display: "flex", width: 36, height: 36, alignItems: "center", justifyContent: "center", borderRadius: 8, border: "1px solid " + C.border, background: "transparent", cursor: "pointer", color: C.textSecondary }}><HelpCircle style={{ width: 18, height: 18 }} /></button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button style={{ display: "flex", alignItems: "center", gap: 8, padding: "4px 10px 4px 4px", borderRadius: 8, border: "1px solid " + C.border, background: "transparent", cursor: "pointer", marginLeft: 4 }}>
              <Avatar style={{ width: 32, height: 32, flexShrink: 0 }}><AvatarImage src={logoUrl || admin?.profileImageUrl} /><AvatarFallback style={{ background: C.green, color: "#fff", fontSize: 11, fontWeight: 700 }}>{init}</AvatarFallback></Avatar>
              {isDesktop && <span style={{ fontSize: 13, fontWeight: 600, color: C.text, maxWidth: 120, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{welcomeName}</span>}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64">
            <DropdownMenuLabel className="flex items-center gap-3 py-3 px-3">
              <Avatar className="h-10 w-10 flex-shrink-0"><AvatarImage src={logoUrl || admin?.profileImageUrl} /><AvatarFallback style={{ background: C.green, color: "#fff", fontSize: 12, fontWeight: 700 }}>{init}</AvatarFallback></Avatar>
              <div className="min-w-0"><p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: C.text }}>{welcomeName}</p><p style={{ margin: 0, fontSize: 12, color: C.textSecondary }}>{displayName}</p></div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => void onLogout()} className="cursor-pointer font-medium text-[13px] text-red-500 focus:bg-red-50 focus:text-red-600 mx-1 mb-1 rounded-lg"><LogOut className="mr-2 h-4 w-4" />Sign Out</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}

function SidebarNav({ items, bv, collapsed, loc, onNavClick, logoUrl, initials, agencyName, welcomeName, admin, onLogout }: { items: typeof navItems; bv: Record<string, number>; collapsed: boolean; loc: ReturnType<typeof useLocation>; onNavClick?: () => void; logoUrl: string; initials: string; agencyName: string; welcomeName: string; admin: AgencyAdminUser | null; onLogout: () => void }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div style={{ padding: collapsed ? "20px 12px" : "20px 20px", borderBottom: "1px solid " + C.border, display: "flex", alignItems: "center", gap: 12, minHeight: 72 }}>
        <div style={{ width: 36, height: 36, borderRadius: 10, flexShrink: 0, background: C.green, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
          {logoUrl ? <img src={logoUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <span style={{ fontSize: 14, fontWeight: 700, color: "#fff" }}>{initials}</span>}
        </div>
        {!collapsed && <div style={{ minWidth: 0, overflow: "hidden" }}><p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: C.text, lineHeight: 1.3 }}>Find Maids</p><p style={{ margin: 0, fontSize: 11, color: C.textMuted, lineHeight: 1.3 }}>{agencyName}</p></div>}
      </div>
      <nav style={{ flex: 1, overflowY: "auto", padding: collapsed ? "12px 8px" : "12px 12px" }}>
        <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 2 }}>
          {items.map(item => {
            const isActive = loc.pathname.startsWith(item.path);
            const Icon = item.icon;
            const badge = item.badgeKey ? bv[item.badgeKey] ?? 0 : 0;
            return (
              <li key={item.path}>
                <Link to={item.path} onClick={onNavClick} title={collapsed ? item.label : undefined} style={{ display: "flex", alignItems: "center", gap: 12, padding: collapsed ? "10px 0" : "10px 12px", justifyContent: collapsed ? "center" : "flex-start", borderRadius: 8, textDecoration: "none", background: isActive ? C.greenLight : "transparent", color: isActive ? C.green : C.textSecondary, fontWeight: isActive ? 600 : 400, fontSize: 13, position: "relative", transition: "background 0.15s ease, color 0.15s ease" }} onMouseEnter={e => { if (!isActive) { (e.currentTarget as HTMLAnchorElement).style.background = C.surface; (e.currentTarget as HTMLAnchorElement).style.color = C.text; } }} onMouseLeave={e => { if (!isActive) { (e.currentTarget as HTMLAnchorElement).style.background = "transparent"; (e.currentTarget as HTMLAnchorElement).style.color = C.textSecondary; } }}>
                  {isActive && <span style={{ position: "absolute", left: 0, top: "50%", transform: "translateY(-50%)", width: 3, height: 20, borderRadius: "0 3px 3px 0", background: C.green }} />}
                  <Icon style={{ width: 18, height: 18, flexShrink: 0 }} />
                  {!collapsed && <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.label}</span>}
                  {!collapsed && badge > 0 && <span style={{ display: "inline-flex", height: 18, minWidth: 18, alignItems: "center", justifyContent: "center", borderRadius: 9999, background: C.red, padding: "0 5px", fontSize: 10, fontWeight: 700, color: "#fff", flexShrink: 0 }}>{badge > 99 ? "99+" : badge}</span>}
                  {collapsed && badge > 0 && <span style={{ position: "absolute", top: 4, right: 4, width: 8, height: 8, borderRadius: "50%", background: C.red, border: "2px solid " + C.white }} />}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
      <div style={{ padding: collapsed ? "12px 8px" : "12px 16px", borderTop: "1px solid " + C.border }}>
        {!collapsed && <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 4px", marginBottom: 4 }}><Avatar style={{ width: 32, height: 32, flexShrink: 0 }}><AvatarImage src={logoUrl || admin?.profileImageUrl} /><AvatarFallback style={{ background: C.green, color: "#fff", fontSize: 11, fontWeight: 700 }}>{initials}</AvatarFallback></Avatar><div style={{ minWidth: 0, flex: 1 }}><p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: C.text }}>{welcomeName}</p><p style={{ margin: 0, fontSize: 11, color: C.textMuted }}>{admin?.role === "admin" ? "Administrator" : "Staff"}</p></div></div>}
        <button onClick={() => void onLogout()} title={collapsed ? "Sign Out" : undefined} style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", padding: collapsed ? "10px 0" : "10px 12px", justifyContent: collapsed ? "center" : "flex-start", borderRadius: 8, border: "none", background: "transparent", cursor: "pointer", color: C.textMuted, fontSize: 13, fontWeight: 400, transition: "background 0.15s ease, color 0.15s ease" }} onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = C.redLight; (e.currentTarget as HTMLButtonElement).style.color = C.red; }} onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = "transparent"; (e.currentTarget as HTMLButtonElement).style.color = C.textMuted; }}>
          <LogOut style={{ width: 18, height: 18, flexShrink: 0 }} />{!collapsed && <span>Sign Out</span>}
        </button>
      </div>
    </div>
  );
}
