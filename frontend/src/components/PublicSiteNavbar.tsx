import { useEffect, useState, useRef } from "react";
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

  const loginPath = buildEmployerLoginPath("/");

  /* ── Login Button ── */
  const LoginButton = ({ full = false, onClick }: { full?: boolean; onClick?: () => void }) => (
    <Link
      to={loginPath}
      onClick={onClick}
      style={{ background: TEAL, borderColor: TEAL_D, color: "#fff" }}
      className={cn(
        "inline-flex overflow-hidden rounded-[10px] border-b-[3px]",
        "text-[13.5px] font-bold tracking-wide select-none",
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
        full    && "w-full h-11 justify-center text-[14px] px-4",
        compact && "h-[38px] px-3 text-[12px]",
        !full && !compact && "px-4 py-[9px] text-[13.5px]"
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
        <AvatarFallback style={{ background: TEAL }} className="text-xs font-bold text-white">
          {clientUser?.name[0].toUpperCase()}
        </AvatarFallback>
      </Avatar>
      <span
        className={cn(
          "font-medium truncate",
          small ? "text-[12.5px] max-w-[70px]" : "text-[13px] max-w-[110px]"
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
        "sticky top-0 z-50 bg-white",
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
            src="/FM_logo.png"
            alt="Find Maids At The Agency"
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
                  "relative px-3.5 py-2 text-[13.5px] font-medium rounded-lg transition-colors duration-150",
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
                      "text-[14px] font-medium transition-colors duration-100",
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
                        className="text-lg leading-none"
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
                        className="text-sm font-bold text-white"
                      >
                        {clientUser.name[0].toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p style={{ color: TEAL }} className="text-[14px] font-bold">
                        {clientUser.name}
                      </p>
                      <p className="text-xs text-gray-400">Logged in</p>
                    </div>
                  </div>
                  <Link
                    to="/client/home"
                    onClick={() => setIsMobileMenuOpen(false)}
                    style={{ background: TEAL, borderColor: TEAL_D }}
                    className="flex h-11 w-full items-center justify-center rounded-[9px] border-b-[3px] text-[14px] font-bold text-white hover:brightness-110 transition-all active:translate-y-[2px] active:border-b-[1px]"
                  >
                    Open Portal
                  </Link>
                  <button
                    style={{ borderColor: `${TEAL}33`, color: TEAL }}
                    className="flex h-11 w-full items-center justify-center rounded-[9px] border-2 bg-white text-[14px] font-semibold hover:bg-[#0E4E5E]/5 transition-colors"
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
    </header>
  );
};

export default PublicSiteNavbar;