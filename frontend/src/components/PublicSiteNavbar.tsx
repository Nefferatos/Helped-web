import { useEffect, useState } from "react";
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

const links = [
  { label: "Home",         to: "/"          },
  { label: "Search Maids", to: "/search-maids" },
  { label: "About Us",     to: "/about"     },
  { label: "Agency",       to: "/agency"    },
  { label: "Enquiry",      to: "/enquiry2"  },
  { label: "FAQ",          to: "/faq"       },
];

const ArrowRightIcon = () => (
  <svg
    viewBox="0 0 16 16"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="h-3.5 w-3.5"
  >
    <path d="M3 8h10M9 4l4 4-4 4" />
  </svg>
);

const PublicSiteNavbar = () => {
  const location = useLocation();
  const [clientUser, setClientUser] = useState<ClientUser | null>(getStoredClient());
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    void syncClientProfileFromSession().then((client) =>
      setClientUser(client ?? getStoredClient())
    );
    setIsMobileMenuOpen(false);
  }, [location.pathname, location.search, location.hash]);

  useEffect(() => {
    document.body.style.overflow = isMobileMenuOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [isMobileMenuOpen]);

  // Always redirect to homepage after login, regardless of which page the user was on
  const loginPath = buildEmployerLoginPath("/");

  const LoginButton = () => (
    <Link
      to={loginPath}
      className={cn(
        "inline-flex items-center gap-0 overflow-hidden",
        "rounded-[10px] border-b-[3px] border-green-950",
        "bg-[#1c5e2a] text-white",
        "text-[13.5px] font-bold tracking-wide",
        "transition-all hover:brightness-110 active:border-b-[1px] active:translate-y-[2px]",
        "select-none"
      )}
    >
      <span
        className={cn(
          "flex h-full items-center justify-center",
          "bg-[#164d22]",
          "px-3 py-[9px]",
          "border-r border-green-950/40"
        )}
      >
        <ArrowRightIcon />
      </span>
      <span className="px-4 py-[9px]">Employer Login</span>
    </Link>
  );

  const LoginButtonFull = () => (
    <Link
      to={loginPath}
      onClick={() => setIsMobileMenuOpen(false)}
      className={cn(
        "flex h-11 w-full overflow-hidden",
        "rounded-[10px] border-b-[3px] border-green-950",
        "bg-[#1c5e2a] text-white",
        "text-[14px] font-bold tracking-wide",
        "transition-all hover:brightness-110 active:border-b-[1px] active:translate-y-[2px]",
        "select-none"
      )}
    >
      <span
        className={cn(
          "flex items-center justify-center",
          "bg-[#164d22]",
          "px-4",
          "border-r border-green-950/40"
        )}
      >
        <ArrowRightIcon />
      </span>
      <span className="flex flex-1 items-center justify-center">
        Employer Login
      </span>
    </Link>
  );

  return (
    <header className="sticky top-0 z-50 border-b-2 border-green-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/90">
      <div className="mx-auto flex h-14 max-w-screen-xl items-center px-4 sm:px-6 md:h-[80px]">

        {/* Logo */}
        <Link to="/" className="flex shrink-0 items-center">
          <img
            src="/FM_logo.png"
            alt="Find Maids At The Agency"
            className="h-12 w-auto object-contain md:h-20"
          />
        </Link>

        {/* Desktop nav */}
        <nav className="hidden flex-1 items-center justify-center gap-1 lg:flex">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.to === "/"}
              className={({ isActive }) =>
                cn(
                  "relative px-3 py-1.5 text-[14px] font-medium transition-colors",
                  "after:absolute after:bottom-[-2px] after:left-3 after:right-3 after:h-[2px] after:rounded-full after:bg-green-700 after:transition-opacity",
                  isActive
                    ? "font-bold text-green-800 after:opacity-100"
                    : "text-gray-700 after:opacity-0 hover:text-green-800"
                )
              }
            >
              {link.label}
            </NavLink>
          ))}
        </nav>

        {/* Desktop: login or avatar — always visible on all pages */}
        <div className="ml-auto hidden shrink-0 lg:flex">
          {clientUser ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 rounded-full border-2 border-green-200 bg-green-50 py-1 pl-1 pr-3 font-medium text-green-900 transition-colors hover:bg-green-100">
                  <Avatar className="h-7 w-7">
                    <AvatarImage src={clientUser.profileImageUrl} alt={clientUser.name} />
                    <AvatarFallback className="bg-green-800 text-xs font-bold text-white">
                      {clientUser.name[0].toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="max-w-[110px] truncate text-[13px]">{clientUser.name}</span>
                  <svg viewBox="0 0 12 12" fill="none" className="h-3 w-3 text-green-600">
                    <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44">
                <DropdownMenuLabel className="text-green-950">My Account</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild><Link to="/client/home">Portal Home</Link></DropdownMenuItem>
                <DropdownMenuItem asChild><Link to="/client/profile">Profile</Link></DropdownMenuItem>
                <DropdownMenuItem asChild><Link to="/client/history">History</Link></DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-red-600"
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

        {/* Tablet + Mobile: hamburger */}
        <div className="ml-auto flex items-center lg:hidden">
          {clientUser && (
            <button className="mr-2 hidden items-center gap-2 rounded-full border-2 border-green-200 bg-green-50 py-1 pl-1 pr-2.5 sm:flex">
              <Avatar className="h-7 w-7">
                <AvatarImage src={clientUser.profileImageUrl} alt={clientUser.name} />
                <AvatarFallback className="bg-green-800 text-xs font-bold text-white">
                  {clientUser.name[0].toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <span className="text-[12.5px] font-medium text-green-900">
                {clientUser.name.split(" ")[0]}
              </span>
            </button>
          )}

          <button
            className="flex h-[38px] w-[38px] flex-col items-center justify-center gap-[5px] rounded-lg border-2 border-green-200 bg-green-50 transition-colors hover:bg-green-100"
            onClick={() => setIsMobileMenuOpen((v) => !v)}
            aria-label={isMobileMenuOpen ? "Close menu" : "Open menu"}
          >
            {isMobileMenuOpen ? (
              <X className="h-4 w-4 text-green-800" />
            ) : (
              <>
                <span className="h-[2px] w-[18px] rounded-full bg-green-800" />
                <span className="h-[2px] w-[13px] rounded-full bg-green-800" />
                <span className="h-[2px] w-[18px] rounded-full bg-green-800" />
              </>
            )}
          </button>
        </div>
      </div>

      {/* Mobile drawer */}
      {isMobileMenuOpen && (
        <>
          <div
            className="fixed inset-0 top-14 z-40 bg-black/20 lg:hidden"
            onClick={() => setIsMobileMenuOpen(false)}
          />
          <div className="fixed left-0 right-0 top-14 z-50 max-h-[calc(100dvh-3.5rem)] overflow-y-auto border-t border-green-100 bg-white shadow-lg lg:hidden">
            <nav className="flex flex-col">
              {links.map((link) => (
                <NavLink
                  key={link.to}
                  to={link.to}
                  end={link.to === "/"}
                  className={({ isActive }) =>
                    cn(
                      "flex items-center justify-between border-b border-green-50 px-5 py-3.5 text-[14px] font-medium transition-colors",
                      "border-l-[3px]",
                      isActive
                        ? "border-l-green-700 bg-green-50 font-bold text-green-800"
                        : "border-l-transparent text-gray-700 hover:bg-green-50 hover:text-green-800"
                    )
                  }
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  {({ isActive }) => (
                    <>
                      <span>{link.label}</span>
                      <span className={cn("text-base", isActive ? "text-green-500" : "text-gray-300")}>›</span>
                    </>
                  )}
                </NavLink>
              ))}
            </nav>

            {/* Mobile login section — always visible on all pages */}
            <div className="border-t border-green-100 p-4">
              {clientUser ? (
                <div className="space-y-2.5">
                  <div className="flex items-center gap-3 px-1 py-1">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={clientUser.profileImageUrl} alt={clientUser.name} />
                      <AvatarFallback className="bg-green-800 text-sm font-bold text-white">
                        {clientUser.name[0].toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-[14px] font-bold text-green-950">{clientUser.name}</p>
                      <p className="text-xs text-green-600">Logged in</p>
                    </div>
                  </div>
                  <Link
                    to="/client/home"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="flex h-11 w-full items-center justify-center rounded-[9px] border-b-[3px] border-green-950 bg-green-800 text-[14px] font-bold text-white hover:bg-green-900"
                  >
                    Open Portal
                  </Link>
                  <button
                    className="flex h-11 w-full items-center justify-center rounded-[9px] border-2 border-green-200 bg-green-50 text-[14px] font-semibold text-green-800 hover:bg-green-100"
                    onClick={() => { setIsMobileMenuOpen(false); void logoutClientPortal("/"); }}
                  >
                    Logout
                  </button>
                </div>
              ) : (
                <LoginButtonFull />
              )}
            </div>
          </div>
        </>
      )}
    </header>
  );
};

export default PublicSiteNavbar;