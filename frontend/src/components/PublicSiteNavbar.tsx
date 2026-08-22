import { useEffect, useState, useRef, type FormEvent } from "react";
import { Link, useLocation, NavLink } from "react-router-dom";
import { X } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { getStoredClient, type ClientUser } from "@/lib/clientAuth";
import { buildEmployerLoginPath } from "@/lib/clientNavigation";
import { logoutClientPortal, syncClientProfileFromSession } from "@/lib/supabaseAuth";
import { cn } from "@/lib/utils";
import { RequestForm, defaultFilters, GLOBAL_CSS as REQUEST_FORM_CSS } from "@/ClientPage/ClientMaidsPage";

/* ─── Scoped keyframes injected once ─────────────────────────────────────── */
const STYLE_ID = "pubnavbar-styles";
if (typeof document !== "undefined" && !document.getElementById(STYLE_ID)) {
  const s = document.createElement("style");
  s.id = STYLE_ID;
  s.textContent = `
    @keyframes _pnb_shimmer {
      0%   { background-position: -200% center; }
      100% { background-position:  200% center; }
    }
    @keyframes _pnb_fadeDown {
      from { opacity: 0; transform: translateY(-6px); }
      to   { opacity: 1; transform: translateY(0); }
    }
    @keyframes _pnb_pulse_dot {
      0%, 100% { transform: scale(1);   opacity: 1; }
      50%       { transform: scale(1.6); opacity: .7; }
    }
    @keyframes _pnb_slideIn {
      from { opacity: 0; transform: translateX(8px); }
      to   { opacity: 1; transform: translateX(0); }
    }
    ._pnb_shimmer-btn {
      background: linear-gradient(
        110deg,
        #FCD34D 0%,
        #fde68a 40%,
        #FCD34D 60%,
        #ca9f1a 100%
      );
      background-size: 200% auto;
    }
    ._pnb_shimmer-btn:hover {
      animation: _pnb_shimmer 1.4s linear infinite;
    }
    ._pnb_dot {
      animation: _pnb_pulse_dot 2s ease-in-out infinite;
    }
    ._pnb_drawer {
      animation: _pnb_fadeDown .22s cubic-bezier(.22,1,.36,1) both;
    }
    ._pnb_nav-link-slide {
      animation: _pnb_slideIn .18s ease both;
    }
    .public-site-navbar,
    .public-site-navbar nav,
    .public-site-navbar a,
    .public-site-navbar button,
    .public-site-navbar h1,
    .public-site-navbar h2,
    .public-site-navbar h3,
    .public-site-navbar h4,
    .public-site-navbar h5,
    .public-site-navbar h6,
    ._pnb_drawer,
    ._pnb_drawer a,
    ._pnb_drawer button {
      font-size: 16px !important;
    }
  `;
  document.head.appendChild(s);
}

/* ─── Constants ──────────────────────────────────────────────────────────── */
const TEAL   = "#0E4E5E";
const TEAL_D = "#0a3a47";
const AMBER  = "#FCD34D";
const AMBER_D = "#ca9f1a";

const links = [
  { label: "Home",         to: "/"             },
  { label: "Search Maids", to: "/search-maids" },
  { label: "About Us",     to: "/about"        },
  { label: "Agency",       to: "/agency"       },
  { label: "Enquiry",      to: "/enquiry2"     },
  { label: "FAQ",          to: "/faq"          },
];

/* ─── Tiny SVG helpers ───────────────────────────────────────────────────── */
const ArrowIcon = () => (
  <svg
    viewBox="0 0 16 16"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="h-3.5 w-3.5 flex-shrink-0"
  >
    <path d="M3 8h10M9 4l4 4-4 4" />
  </svg>
);

const ChevronDown = () => (
  <svg viewBox="0 0 12 12" fill="none" className="h-3 w-3 opacity-70">
    <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
  </svg>
);

/* ─── Component ──────────────────────────────────────────────────────────── */
const PublicSiteNavbar = () => {
  const location = useLocation();
  const [clientUser, setClientUser] = useState<ClientUser | null>(getStoredClient());
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const headerRef = useRef<HTMLElement>(null);

  /* scroll shadow */
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    void syncClientProfileFromSession().then((c) =>
      setClientUser(c ?? getStoredClient())
    );
    setIsMobileMenuOpen(false);
  }, [location.pathname, location.search, location.hash]);

  useEffect(() => {
    document.body.style.overflow = isMobileMenuOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [isMobileMenuOpen]);

  // Bring the user back to whatever page they were browsing (including any
  // active search filters) after they log in. On non-returnable pages (home,
  // the auth pages) getClientPostLoginPath falls back to the maids search page.
  const loginPath = buildEmployerLoginPath(
    `${location.pathname}${location.search}${location.hash}`
  );
  const showFloatingRequest = !location.pathname.startsWith("/search-maids")
    && !location.pathname.startsWith("/client/")
    && !location.pathname.startsWith("/agency");
  const [isRequestOpen, setIsRequestOpen] = useState(false);
  const [requestStatus, setRequestStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [requestForm, setRequestForm] = useState({ name: "", email: "", phone: "", notes: "" });
  const submitRequest = async (event: FormEvent) => { event.preventDefault(); setRequestStatus("idle"); };

  /* ── Login Button ── */
  const LoginButton = ({ full = false, onClick }: { full?: boolean; onClick?: () => void }) => (
    <Link
      to={loginPath}
      onClick={onClick}
      style={{ background: TEAL, borderColor: TEAL_D, color: "#fff" }}
      className={cn(
        "inline-flex overflow-hidden rounded-[10px] border-b-[3px]",
        "text-[16px] font-bold tracking-wide select-none",
        "transition-all duration-150 hover:brightness-110 active:translate-y-[2px] active:border-b-[1px]",
        full && "w-full h-11"
      )}
    >
      <span
        style={{ background: TEAL_D, borderColor: `${TEAL_D}99` }}
        className="flex items-center justify-center px-3 border-r"
      >
        <ArrowIcon />
      </span>
      <span className={cn("flex items-center px-4 py-[9px]", full && "flex-1 justify-center")}>
        Employer Login
      </span>
    </Link>
  );

  /* ── Apply Button ── */
  const ApplyButton = ({
    full = false,
    compact = false,
    onClick,
  }: {
    full?: boolean;
    compact?: boolean;
    onClick?: () => void;
  }) => (
    <Link
      to="/apply-as-maid"
      onClick={onClick}
      style={{ borderColor: AMBER_D }}
      className={cn(
        "_pnb_shimmer-btn inline-flex items-center gap-2 rounded-[10px] border-b-[3px]",
        "font-bold tracking-wide select-none",
        "transition-all duration-150 hover:brightness-105 active:translate-y-[2px] active:border-b-[1px]",
        "text-[#3d2800]",
        full    && "w-full h-11 justify-center text-base px-4",
        compact && "h-[38px] px-3 text-base",
        !full && !compact && "px-4 py-[9px] text-[16px]"
      )}
    >
      <span className="_pnb_dot h-2 w-2 rounded-full bg-[#3d2800]/50 flex-shrink-0" />
      {compact ? (
        <>
          <span className="hidden sm:inline">Apply as FDW</span>
          <span className="sm:hidden">FDW Apply</span>
        </>
      ) : (
        <span>Apply as FDW</span>
      )}
    </Link>
  );

  /* ── User Chip ── */
  const UserChip = ({ small = false }: { small?: boolean }) => (
    <button
      style={{ borderColor: `${TEAL}33`, background: `${TEAL}0d`, color: TEAL }}
      className={cn(
        "flex items-center gap-2 rounded-full border-2 py-1 pl-1 transition-colors",
        small ? "pr-2.5" : "pr-3",
        "hover:brightness-95"
      )}
    >
      <Avatar className="h-7 w-7">
        <AvatarImage src={clientUser?.profileImageUrl} alt={clientUser?.name} />
        <AvatarFallback style={{ background: TEAL }} className="text-base font-bold text-white">
          {clientUser?.name[0].toUpperCase()}
        </AvatarFallback>
      </Avatar>
      <span
        className={cn(
          "font-medium truncate",
          small ? "text-base max-w-[70px]" : "text-base max-w-[110px]"
        )}
      >
        {small ? clientUser?.name.split(" ")[0] : clientUser?.name}
      </span>
      {!small && <ChevronDown />}
    </button>
  );

  return (
    <header
      ref={headerRef}
      className={cn(
        "public-site-navbar sticky top-0 z-50 bg-white",
        "transition-shadow duration-300",
        scrolled
          ? "shadow-[0_2px_20px_rgba(14,78,94,.13)]"
          : "border-b border-[#0E4E5E]/10"
      )}
    >
      {/* Top accent bar */}
      <div
        style={{
          background: `linear-gradient(90deg, ${TEAL} 0%, ${AMBER} 60%, ${TEAL} 100%)`,
        }}
        className="h-[3px] w-full"
      />

      <div className="mx-auto flex h-14 max-w-screen-xl items-center px-4 sm:px-6 md:h-[76px]">

        {/* Logo */}
        <Link to="/" className="flex shrink-0 items-center group">
          <img
            src="/FM_logo.webp"
            alt="Find Maids At The Agency"
            width="300"
            height="123"
            className="h-11 w-auto object-contain md:h-[58px] transition-transform duration-200 group-hover:scale-[1.03]"
          />
        </Link>

        {/* Desktop nav */}
        <nav className="hidden flex-1 items-center justify-center gap-0.5 lg:flex" aria-label="Main">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.to === "/"}
              className={({ isActive }) =>
                cn(
                  "relative px-3.5 py-2 text-[16px] font-medium rounded-lg transition-colors duration-150",
                  isActive
                    ? "font-semibold"
                    : "text-[#0E4E5E] hover:bg-[#0E4E5E]/8 hover:text-[#0B3340]"
                )
              }
              style={({ isActive }) =>
                isActive ? { color: TEAL } : {}
              }
            >
              {({ isActive }) => (
                <>
                  {link.label}
                  <span
                    style={{ background: isActive ? AMBER : TEAL }}
                    className={cn(
                      "absolute bottom-1 left-3.5 right-3.5 h-[2px] rounded-full transition-all duration-200",
                      isActive ? "opacity-100" : "opacity-0"
                    )}
                  />
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Desktop CTA row */}
        <div className="ml-auto hidden shrink-0 items-center gap-2.5 lg:flex">
          <ApplyButton />
          {clientUser ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <span><UserChip /></span>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44 _pnb_drawer">
                <DropdownMenuLabel style={{ color: TEAL }} className="font-semibold">
                  My Account
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link to="/client/home">Portal Home</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/client/profile">Profile</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/client/history">History</Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-red-600 focus:text-red-600"
                  onClick={() => void logoutClientPortal("/")}
                >
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <LoginButton />
          )}
        </div>

        {/* Mobile: compact right cluster */}
        <div className="ml-auto flex items-center gap-2 lg:hidden">
          <ApplyButton compact />
          {clientUser && (
            <span className="hidden sm:inline-flex">
              <UserChip small />
            </span>
          )}
          <button
            style={{ borderColor: `${TEAL}2a`, background: `${TEAL}08` }}
            className={cn(
              "flex h-9 w-9 flex-col items-center justify-center gap-[5px]",
              "rounded-lg border-2 transition-colors duration-150",
              isMobileMenuOpen ? "bg-[#0E4E5E]/10" : "hover:bg-[#0E4E5E]/10"
            )}
            onClick={() => setIsMobileMenuOpen((v) => !v)}
            aria-label={isMobileMenuOpen ? "Close menu" : "Open menu"}
          >
            {isMobileMenuOpen ? (
              <X className="h-4 w-4" style={{ color: TEAL }} />
            ) : (
              <>
                <span style={{ background: TEAL }}  className="h-[2px] w-[18px] rounded-full" />
                <span style={{ background: AMBER }} className="h-[2px] w-[13px] rounded-full" />
                <span style={{ background: TEAL }}  className="h-[2px] w-[18px] rounded-full" />
              </>
            )}
          </button>
        </div>
      </div>

      {/* Mobile drawer */}
      {isMobileMenuOpen && (
        <>
          <div
            className="fixed inset-0 top-[calc(3.5rem+3px)] z-40 bg-black/25 lg:hidden"
            onClick={() => setIsMobileMenuOpen(false)}
          />
          <div
            className="_pnb_drawer fixed left-0 right-0 top-[calc(3.5rem+3px)] z-50 max-h-[calc(100dvh-3.5rem)] overflow-y-auto bg-white lg:hidden"
            style={{
              borderTop: `2px solid ${TEAL}1a`,
              boxShadow: `0 12px 40px ${TEAL}22`,
            }}
          >
            <nav className="flex flex-col" aria-label="Mobile">
              {links.map((link, i) => (
                <NavLink
                  key={link.to}
                  to={link.to}
                  end={link.to === "/"}
                  className={({ isActive }) =>
                    cn(
                      "_pnb_nav-link-slide flex items-center justify-between px-5 py-3.5",
                      "text-base font-medium transition-colors duration-100",
                      "border-b border-b-gray-50 border-l-[3px]",
                      isActive
                        ? "font-semibold bg-[#0E4E5E]/5"
                        : "border-l-transparent text-[#0E4E5E] hover:bg-[#0E4E5E]/5"
                    )
                  }
                  style={({ isActive }) => ({
                    animationDelay: `${i * 35}ms`,
                    borderLeftColor: isActive ? TEAL : "transparent",
                    color: isActive ? TEAL : undefined,
                  })}
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  {({ isActive }) => (
                    <>
                      <span>{link.label}</span>
                      <span
                        style={{ color: isActive ? TEAL : "#d1d5db" }}
                        className="text-base leading-none"
                      >
                        ›
                      </span>
                    </>
                  )}
                </NavLink>
              ))}
            </nav>

            <div
              className="space-y-3 p-4"
              style={{ borderTop: `1px solid ${TEAL}15` }}
            >
              <ApplyButton full onClick={() => setIsMobileMenuOpen(false)} />
              {clientUser ? (
                <div className="space-y-2.5">
                  <div
                    className="flex items-center gap-3 px-1 py-2 rounded-xl"
                    style={{ background: `${TEAL}08` }}
                  >
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={clientUser.profileImageUrl} alt={clientUser.name} />
                      <AvatarFallback
                        style={{ background: TEAL }}
                        className="text-base font-bold text-white"
                      >
                        {clientUser.name[0].toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p style={{ color: TEAL }} className="text-base font-bold">
                        {clientUser.name}
                      </p>
                      <p className="text-base text-gray-400">Logged in</p>
                    </div>
                  </div>
                  <Link
                    to="/client/home"
                    onClick={() => setIsMobileMenuOpen(false)}
                    style={{ background: TEAL, borderColor: TEAL_D }}
                    className="flex h-11 w-full items-center justify-center rounded-[9px] border-b-[3px] text-base font-bold text-white hover:brightness-110 transition-all active:translate-y-[2px] active:border-b-[1px]"
                  >
                    Open Portal
                  </Link>
                  <button
                    style={{ borderColor: `${TEAL}33`, color: TEAL }}
                    className="flex h-11 w-full items-center justify-center rounded-[9px] border-2 bg-white text-base font-semibold hover:bg-[#0E4E5E]/5 transition-colors"
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      void logoutClientPortal("/");
                    }}
                  >
                    Logout
                  </button>
                </div>
              ) : (
                <LoginButton full onClick={() => setIsMobileMenuOpen(false)} />
              )}
            </div>
          </div>
        </>
      )}

      {showFloatingRequest && (
        <>
          <button type="button" onClick={() => { setIsRequestOpen(true); setRequestStatus("idle"); }}
            className="fixed left-0 top-1/2 z-40 h-[118px] w-10 -translate-y-1/2 text-[11px] font-bold shadow-lg sm:h-[154px] sm:w-[52px] sm:text-[13px]"
            style={{ border:0, borderRadius:"0 12px 12px 0", background: "#FCD34D", color: "#0B3340", writingMode:"vertical-rl", boxShadow: "0 10px 28px rgba(11,51,64,.28)" }}>
            Request Maid
          </button>
          {false && isRequestOpen && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4" onMouseDown={() => setIsRequestOpen(false)}>
              <div className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl" onMouseDown={(event) => event.stopPropagation()}>
                <div className="flex items-start justify-between p-5" style={{ background: "linear-gradient(135deg,#0B3340,#0E4E5E)", color: "white" }}>
                  <div><p className="m-0 text-xs font-bold uppercase tracking-widest text-[#FCD34D]">Agency matching</p><h2 className="mt-1 text-xl font-bold">Request Agency Help</h2><p className="m-0 text-sm text-white/70">Tell us what you need and we’ll help shortlist suitable candidates.</p></div>
                  <button type="button" onClick={() => setIsRequestOpen(false)} className="rounded-md p-1 text-white/80 hover:bg-white/10" aria-label="Close request form"><X size={20}/></button>
                </div>
                {requestStatus === "sent" ? (
                  <div className="p-8 text-center"><p className="text-lg font-bold" style={{ color: TEAL }}>Request sent successfully.</p><p className="text-sm text-slate-500">Our agency will contact you shortly.</p><button type="button" onClick={() => setIsRequestOpen(false)} className="mt-4 rounded-lg px-4 py-2 font-bold" style={{ background: AMBER, color: TEAL }}>Close</button></div>
                ) : (
                  <form onSubmit={submitRequest} className="space-y-3 p-5">
                    <input required placeholder="Full name" value={requestForm.name} onChange={(e) => setRequestForm((v) => ({ ...v, name: e.target.value }))} className="w-full rounded-lg border p-3 text-sm" />
                    <input required type="email" placeholder="Email address" value={requestForm.email} onChange={(e) => setRequestForm((v) => ({ ...v, email: e.target.value }))} className="w-full rounded-lg border p-3 text-sm" />
                    <input required placeholder="Phone number" value={requestForm.phone} onChange={(e) => setRequestForm((v) => ({ ...v, phone: e.target.value }))} className="w-full rounded-lg border p-3 text-sm" />
                    <textarea placeholder="Requirements (optional)" rows={3} value={requestForm.notes} onChange={(e) => setRequestForm((v) => ({ ...v, notes: e.target.value }))} className="w-full rounded-lg border p-3 text-sm" />
                    {requestStatus === "error" && <p className="m-0 text-sm text-red-600">Could not send your request. Please try again.</p>}
                    <button disabled={requestStatus === "sending"} type="submit" className="w-full rounded-lg px-4 py-3 font-bold disabled:opacity-60" style={{ background: AMBER, color: TEAL }}>{requestStatus === "sending" ? "Sending…" : "Submit Request"}</button>
                  </form>
                )}
              </div>
            </div>
          )}
          {isRequestOpen && <div className="request-modal-overlay" onMouseDown={() => setIsRequestOpen(false)}><div className="request-modal-shell" onMouseDown={(event) => event.stopPropagation()}><style>{`${REQUEST_FORM_CSS}
            .request-modal-overlay{position:fixed;inset:0;z-index:100;background:rgba(0,0,0,.52);padding:16px;overflow:hidden;display:flex;align-items:center;justify-content:center}
            .request-modal-shell{width:min(960px,calc(100vw - 32px));max-height:calc(100vh - 32px);overflow:hidden}
            .request-modal-scale{zoom:.72}
            @media(max-width:640px){.request-modal-overlay{padding:8px;align-items:flex-start;overflow-y:auto}.request-modal-shell{width:calc(100vw - 16px);max-height:none;overflow:visible;margin:auto 0}.request-modal-scale{zoom:.52}}
          `}</style><div className="request-modal-scale"><RequestForm prefillFilters={defaultFilters} onBack={() => setIsRequestOpen(false)} /></div></div></div>}
        </>
      )}
    </header>
  );
};

export default PublicSiteNavbar;
