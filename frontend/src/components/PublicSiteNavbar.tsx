import { useEffect, useState } from "react";
import { Link, useLocation, NavLink } from "react-router-dom";
import { Menu, X, LogIn } from "lucide-react";
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
  { label: "Home", to: "/" },
  { label: "Search Maids", to: "/search-maids" },
  { label: "About Us", to: "/about" },
  { label: "Agency", to: "/agency" },
  { label: "Enquiry", to: "/enquiry2" },
  { label: "FAQ", to: "/faq" },
];

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

  const loginPath = buildEmployerLoginPath(
    `${location.pathname}${location.search}${location.hash}`
  );

  // Reusable login button — desktop header variant
  const LoginButton = () => (
    <Link
      to={loginPath}
      className="inline-flex items-center gap-2 rounded-[9px] border-b-[3px] border-green-950 bg-green-800 px-5 py-2 text-[13.5px] font-bold tracking-wide text-white transition-colors hover:bg-green-900"
    >
      <span className="flex h-6 w-6 items-center justify-center rounded-md bg-white/20">
        <LogIn className="h-3.5 w-3.5" />
      </span>
      Employer Login
    </Link>
  );

  // Reusable login button — full-width menu variant
  const LoginButtonFull = () => (
    <Link
      to={loginPath}
      onClick={() => setIsMobileMenuOpen(false)}
      className="flex h-11 w-full items-center justify-center gap-2.5 rounded-[9px] border-b-[3px] border-green-950 bg-green-800 text-[14px] font-bold tracking-wide text-white transition-colors hover:bg-green-900"
    >
      <span className="flex h-[22px] w-[22px] items-center justify-center rounded-md bg-white/20">
        <LogIn className="h-3.5 w-3.5" />
      </span>
      Employer Login
    </Link>
  );

  return (
    <header className="sticky top-0 z-50 border-b-2 border-green-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/90">
      <div className="mx-auto flex h-14 max-w-screen-xl items-center px-4 sm:px-6 md:h-[58px]">

        {/* Logo */}
        <Link to="/" className="flex shrink-0 items-center gap-2">
          <div className="flex h-[30px] w-[30px] items-center justify-center rounded-lg bg-green-800">
            <svg viewBox="0 0 16 16" fill="none" className="h-[15px] w-[15px]">
              <path
                d="M8 1.5C5.5 1.5 3.5 3.5 3.5 6c0 3.5 4.5 8.5 4.5 8.5S12.5 9.5 12.5 6C12.5 3.5 10.5 1.5 8 1.5zm0 6a1.5 1.5 0 110-3 1.5 1.5 0 010 3z"
                fill="white"
              />
            </svg>
          </div>
          <span className="text-[20px] font-bold tracking-tight text-green-950">
            Find Maids{" "}
            <span className="font-medium text-green-600">At The Agency</span>
          </span>
        </Link>

        {/* Desktop nav — centered, only lg+ */}
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

        {/* Desktop: login or avatar — lg+ only */}
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
                <DropdownMenuItem className="text-red-600" onClick={() => void logoutClientPortal("/")}>
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <LoginButton />
          )}
        </div>

        {/* Tablet + Mobile: hamburger only (no login button in header) */}
        <div className="ml-auto flex items-center lg:hidden">
          {/* Show avatar pill on tablet if logged in */}
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

      {/* Dropdown menu — tablet + mobile */}
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
                        ? "border-l-green-700 bg-green-50 font-bold text-green-800 underline underline-offset-2"
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