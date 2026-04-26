import { useEffect, useState } from "react";
import { Link, useLocation, NavLink } from "react-router-dom";
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
import { getStoredClient, type ClientUser } from "@/lib/clientAuth";
import { buildEmployerLoginPath } from "@/lib/clientNavigation";
import { logoutClientPortal, syncClientProfileFromSession } from "@/lib/supabaseAuth";

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
    void syncClientProfileFromSession().then((client) => setClientUser(client ?? getStoredClient()));
    setIsMobileMenuOpen(false);
  }, [location.pathname, location.search, location.hash]);

  useEffect(() => {
    document.body.style.overflow = isMobileMenuOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [isMobileMenuOpen]);

  const loginPath = buildEmployerLoginPath(`${location.pathname}${location.search}${location.hash}`);

  return (
    <header className="sticky top-0 z-50 border-b border-gray-200 bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
      <div className="container flex h-14 items-center justify-between gap-4 px-4 sm:px-6 md:h-16">
        <Link
          to="/"
          className="shrink-0 font-display text-base font-bold leading-tight text-foreground sm:text-lg md:text-xl"
        >
          <span className="hidden sm:inline">Find Maids At The Agency</span>
          <span className="sm:hidden">Find Maids</span>
        </Link>

        <nav className="hidden items-center gap-5 font-body text-sm font-medium lg:flex xl:gap-8">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.to === "/"}
              className={({ isActive }) =>
                [
                  "relative pb-0.5 transition-colors hover:text-primary",
                  "after:absolute after:bottom-0 after:left-0 after:h-[2px] after:w-full after:rounded-full after:bg-primary after:transition-opacity",
                  isActive ? "text-primary font-semibold after:opacity-100" : "after:opacity-0",
                ].join(" ")
              }
            >
              {link.label}
            </NavLink>
          ))}
        </nav>

        <div className="flex shrink-0 items-center gap-2">
          <div className="hidden md:flex">
            {clientUser ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-2 rounded-full border px-2 py-1 transition-colors hover:bg-muted">
                    <Avatar className="h-7 w-7 md:h-8 md:w-8">
                      <AvatarImage src={clientUser.profileImageUrl} alt={clientUser.name} />
                      <AvatarFallback className="text-xs">
                        {clientUser.name.slice(0, 1).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span className="hidden max-w-[120px] truncate text-sm lg:inline">{clientUser.name}</span>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-44">
                  <DropdownMenuLabel>My Account</DropdownMenuLabel>
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
                  <DropdownMenuItem onClick={() => void logoutClientPortal("/")}>
                    Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button asChild size="sm" className="text-xs md:text-sm">
                <Link to={loginPath}>Employer Login</Link>
              </Button>
            )}
          </div>

          <button
            className="flex h-9 w-9 items-center justify-center rounded-lg transition-colors hover:bg-muted md:hidden"
            onClick={() => setIsMobileMenuOpen((value) => !value)}
            aria-label={isMobileMenuOpen ? "Close menu" : "Open menu"}
          >
            {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {isMobileMenuOpen && (
        <>
          <div className="fixed inset-0 top-14 z-40 bg-black/30 md:hidden" onClick={() => setIsMobileMenuOpen(false)} />
          <div className="fixed left-0 right-0 top-14 z-50 max-h-[calc(100dvh-3.5rem)] overflow-y-auto border-t bg-card shadow-xl md:hidden">
            <nav className="flex flex-col gap-1 p-4">
              {links.map((link) => (
                <NavLink
                  key={link.to}
                  to={link.to}
                  end={link.to === "/"}
                  className={({ isActive }) =>
                    [
                      "flex items-center rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                      isActive
                        ? "bg-primary/10 text-primary font-semibold border-l-2 border-primary"
                        : "text-foreground hover:bg-muted",
                    ].join(" ")
                  }
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  {link.label}
                </NavLink>
              ))}

              <div className="my-2 border-t" />

              {clientUser ? (
                <div className="space-y-2 px-1">
                  <div className="flex items-center gap-3 py-2">
                    <Avatar className="h-9 w-9">
                      <AvatarImage src={clientUser.profileImageUrl} alt={clientUser.name} />
                      <AvatarFallback>{clientUser.name.slice(0, 1).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">{clientUser.name}</p>
                      <p className="text-xs text-muted-foreground">Logged in</p>
                    </div>
                  </div>
                  <Button className="w-full" asChild>
                    <Link to="/client/home" onClick={() => setIsMobileMenuOpen(false)}>
                      Open Portal
                    </Link>
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      void logoutClientPortal("/");
                    }}
                  >
                    Logout
                  </Button>
                </div>
              ) : (
                <Button className="mx-1" asChild>
                  <Link to={loginPath} onClick={() => setIsMobileMenuOpen(false)}>
                    Employer Login
                  </Link>
                </Button>
              )}
            </nav>
          </div>
        </>
      )}
    </header>
  );
};

export default PublicSiteNavbar;