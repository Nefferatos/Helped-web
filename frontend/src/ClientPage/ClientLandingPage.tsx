import { useEffect, useMemo, useState } from "react";
import { ArrowRight, CheckCircle, HeartHandshake, Search, Settings, ShieldCheck, UserRound, Users, Menu, X } from "lucide-react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { toast } from "@/components/ui/sonner";
import { clearClientAuth, getClientAuthHeaders, getStoredClient, getClientToken, type ClientUser } from "@/lib/clientAuth";
import { calculateAge, MaidProfile } from "@/lib/maids";
import { filterMaids } from "@/lib/maidFilter";
import culinaryImg from "./assets/culinary.png";
import elderlyImg from "./assets/elderly-care.png";
import familyImg from "./assets/family.jpg";
import heroImage from "./assets/maid1.png";
import housekeepingImg from "./assets/housekeeping.png";
import infantImg from "./assets/infant-care.png";
import "./ClientTheme.css";

const services = [
  {
    title: "Housekeeping",
    slug: "housekeeping",
    description: "Meticulous cleaning, organization, and care to keep your living space immaculate and inviting.",
    image: housekeepingImg,
  },
  {
    title: "Elderly Care",
    slug: "elderly-care",
    description: "Compassionate and professional support for your loved ones. Ensuring dignity and well-being.",
    image: elderlyImg,
  },
  {
    title: "Infant Care",
    slug: "infant-care",
    description: "Expert caregivers providing nurturing, developmental support for your little ones.",
    image: infantImg,
  },
  {
    title: "Kid Care",
    slug: "kid-care",
    description: "Safe, engaging, and developmental care for your growing children by trained professionals.",
    image: culinaryImg,
  },
];

const features = [
  {
    icon: CheckCircle,
    title: "Vigorously Vetted",
    description: "Our rigorous screening process ensures only the most trustworthy and capable candidates join our network.",
  },
  {
    icon: Users,
    title: "Smart Matching",
    description: "We use refined, advanced matching to find the best helper who perfectly suits your household's unique needs.",
  },
  {
    icon: HeartHandshake,
    title: "Ongoing Support",
    description: "Our dedicated service doesn't end with a hire. We provide continued mediation and after-placement care.",
  },
];

const MAID_TYPES = ["New Maid", "Transfer Maid", "Ex-Singapore Maid"] as const;
const ITEMS_PER_PAGE = 21;

const getPrimaryPhoto = (maid: MaidProfile) =>
  Array.isArray(maid.photoDataUrls) && maid.photoDataUrls.length > 0
    ? maid.photoDataUrls[0]
    : maid.photoDataUrl || "";

interface CompanyProfileApi {
  company_name?: string;
  short_name?: string;
  license_no?: string;
  address_line1?: string;
  address_line2?: string;
  postal_code?: string;
  country?: string;
  contact_person?: string;
  contact_phone?: string;
  contact_email?: string;
  contact_website?: string;
  office_hours_regular?: string;
  office_hours_other?: string;
  about_us?: string;
  logo_data_url?: string;
}

interface CompanyResponse {
  companyProfile?: CompanyProfileApi;
}

type ClientLandingPageProps = {
  embedded?: boolean;
};

const ClientLandingPage = ({ embedded = false }: ClientLandingPageProps) => {
  const navigate = useNavigate();
  const [allPublicMaids, setAllPublicMaids] = useState<MaidProfile[]>([]);
  const [company, setCompany] = useState<CompanyProfileApi | null>(null);
  const [clientUser, setClientUser] = useState<ClientUser | null>(getStoredClient());
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const [keyword, setKeyword] = useState("");
  const [maidTypes, setMaidTypes] = useState<string[]>([]);
  const [nationality, setNationality] = useState("No Preference");
  const [currentPage, setCurrentPage] = useState(1);

  const isLoggedIn = Boolean(clientUser);

  const location = useLocation();
  useEffect(() => {
    if (location.hash === "#services") {
      const el = document.getElementById("services");
      if (el) {
        setTimeout(() => el.scrollIntoView({ behavior: "smooth" }), 100);
      }
    }
  }, [location]);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) setIsMobileMenuOpen(false);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    document.body.style.overflow = isMobileMenuOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [isMobileMenuOpen]);

  useEffect(() => {
    const loadLandingData = async () => {
      try {
        setIsLoading(true);
        const [maidsResponse, companyResponse] = await Promise.all([
          fetch("/api/maids?visibility=public"),
          fetch("/api/company"),
        ]);

        const maidData = (await maidsResponse.json().catch(() => ({}))) as {
          error?: string;
          maids?: MaidProfile[];
        };
        if (!maidsResponse.ok || !maidData.maids) {
          throw new Error(maidData.error || "Failed to load public maids");
        }
        setAllPublicMaids(maidData.maids.filter((maid) => maid.isPublic));

        if (companyResponse.ok) {
          const companyData = (await companyResponse.json().catch(() => ({}))) as CompanyResponse;
          setCompany(companyData.companyProfile ?? null);
        }
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to load public maids");
      } finally {
        setIsLoading(false);
      }
    };

    void loadLandingData();
  }, []);

  useEffect(() => {
    const loadClientProfile = async () => {
      const token = getClientToken();
      if (!token) { setClientUser(null); return; }

      try {
        const response = await fetch("/api/client-auth/me", {
          headers: { ...getClientAuthHeaders() },
        });
        const data = (await response.json().catch(() => ({}))) as {
          error?: string;
          client?: ClientUser;
        };
        if (!response.ok || !data.client) {
          throw new Error(data.error || "Failed to load client profile");
        }
        setClientUser(data.client);
      } catch {
        clearClientAuth();
        setClientUser(null);
      }
    };

    void loadClientProfile();
  }, []);

  const nationalityOptions = useMemo(() => {
    const values = Array.from(
      new Set(
        allPublicMaids
          .map((maid) => maid.nationality?.trim())
          .filter((value): value is string => Boolean(value))
      )
    ).sort((a, b) => a.localeCompare(b));
    return ["No Preference", ...values];
  }, [allPublicMaids]);

  const toggleMaidType = (type: string) => {
    setMaidTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    );
  };

  const filteredMaids = useMemo(() => {
    return filterMaids(allPublicMaids, {
      keyword,
      nationality: nationality === "No Preference" ? [] : [nationality],
      maidTypes,
    });
  }, [allPublicMaids, keyword, maidTypes, nationality]);

  useEffect(() => { setCurrentPage(1); }, [keyword, maidTypes, nationality]);

  const totalPages = Math.ceil(filteredMaids.length / ITEMS_PER_PAGE);
  const pagedMaids = filteredMaids.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const pageNumbers = useMemo(() => {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
    const pages: (number | "...")[] = [1];
    if (currentPage > 3) pages.push("...");
    for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++) {
      pages.push(i);
    }
    if (currentPage < totalPages - 2) pages.push("...");
    pages.push(totalPages);
    return pages;
  }, [totalPages, currentPage]);

  const handleSearch = () => {
    setCurrentPage(1);
    window.setTimeout(() => {
      document.getElementById("maid-results")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 0);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.setTimeout(() => {
      document.getElementById("maid-results")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 0);
  };

  const handleRequestMaid = () => {
    document.getElementById("contact")?.scrollIntoView({ behavior: "smooth" });
  };

  const handleLogout = async () => {
    try {
      await fetch("/api/client-auth/logout", {
        method: "POST",
        headers: { ...getClientAuthHeaders() },
      });
    } catch {
      // ignore
    } finally {
      clearClientAuth();
      setClientUser(null);
      toast.success("Client account logged out");
      navigate("/");
    }
  };

  return (
    <div className="client-page-theme min-h-screen">

      {!embedded && (
        <header className="sticky top-0 z-50 border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
          <div className="container flex h-14 items-center justify-between gap-4 px-4 sm:px-6 md:h-16">

            <Link
              to="/"
              className="font-display text-base font-bold text-foreground sm:text-lg md:text-xl shrink-0 leading-tight"
            >
              <span className="hidden sm:inline">Find Maids At The Agency</span>
              <span className="sm:hidden">Find Maids</span>
            </Link>

            <nav className="hidden items-center gap-5 font-body text-sm font-medium lg:flex xl:gap-8">
              <a href="/" className="hover:text-primary transition-colors">Home</a>
              <a href="#services" className="hover:text-primary transition-colors">Services</a>
              <a href="#search" className="hover:text-primary transition-colors">Search Maids</a>
              <a href="/about" className="hover:text-primary transition-colors">About Us</a>
              <a href="/enquiry2" className="hover:text-primary transition-colors">Enquiry</a>
              <a href="/faq" className="hover:text-primary transition-colors">FAQ</a>
              <a href="/contact" className="hover:text-primary transition-colors">Contact Us</a>
            </nav>

            <div className="flex items-center gap-2 shrink-0">
              <div className="hidden md:flex">
                {clientUser ? (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="flex items-center gap-2 border px-2 py-1 rounded-full hover:bg-muted transition-colors">
                        <Avatar className="h-7 w-7 md:h-8 md:w-8">
                          <AvatarImage src={clientUser.profileImageUrl} />
                          <AvatarFallback className="text-xs">
                            {clientUser.name.slice(0, 1)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm max-w-[120px] truncate hidden lg:inline">{clientUser.name}</span>
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem asChild>
                        <Link to="/client/dashboard">Dashboard</Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => void handleLogout()}>
                        Logout
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                ) : (
                  <Link to="/employer-login">
                    <Button size="sm" className="text-xs md:text-sm">Employer Login</Button>
                  </Link>
                )}
              </div>

              <button
                className="flex h-9 w-9 items-center justify-center rounded-lg hover:bg-muted transition-colors md:hidden"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                aria-label={isMobileMenuOpen ? "Close menu" : "Open menu"}
              >
                {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>
            </div>
          </div>

          {isMobileMenuOpen && (
            <>
              <div
                className="fixed inset-0 top-14 z-40 bg-black/30 md:hidden"
                onClick={() => setIsMobileMenuOpen(false)}
              />
              <div className="fixed left-0 right-0 top-14 z-50 max-h-[calc(100dvh-3.5rem)] overflow-y-auto bg-card border-t shadow-xl md:hidden animate-in slide-in-from-top-2 duration-200">
                <nav className="flex flex-col p-4 gap-1">
                  {[
                    { label: "Home", href: "/" },
                    { label: "Services", href: "#services" },
                    { label: "Search Maids", href: "#search" },
                    { label: "About Us", href: "/about" },
                    { label: "FAQ", href: "/faq" },
                    { label: "Enquiry", href: "/enquiry2" },
                    { label: "Contact Us", href: "/contact" },
                  ].map((item) => (
                    <a
                      key={item.label}
                      href={item.href}
                      className="flex items-center rounded-lg px-3 py-2.5 text-sm font-medium text-foreground hover:bg-muted transition-colors"
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      {item.label}
                    </a>
                  ))}

                  <div className="my-2 border-t" />

                  {clientUser ? (
                    <div className="space-y-2 px-1">
                      <div className="flex items-center gap-3 py-2">
                        <Avatar className="h-9 w-9">
                          <AvatarImage src={clientUser.profileImageUrl} />
                          <AvatarFallback>{clientUser.name.slice(0, 1)}</AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold">{clientUser.name}</p>
                          <p className="text-xs text-muted-foreground">Logged in</p>
                        </div>
                      </div>
                      <Button className="w-full" asChild>
                        <Link to="/client/dashboard" onClick={() => setIsMobileMenuOpen(false)}>
                          Open Dashboard
                        </Link>
                      </Button>
                      <Button variant="outline" className="w-full" onClick={() => { void handleLogout(); setIsMobileMenuOpen(false); }}>
                        Logout
                      </Button>
                    </div>
                  ) : (
                    <Button className="mx-1" asChild>
                      <Link to="/employer-login" onClick={() => setIsMobileMenuOpen(false)}>
                        Employer Login
                      </Link>
                    </Button>
                  )}
                </nav>
              </div>
            </>
          )}
        </header>
      )}

      <section className="bg-card">
        <div className="container grid items-center gap-8 px-4 py-10 sm:px-6 sm:py-14 md:grid-cols-2 md:gap-10 md:py-20 lg:py-24">
          <div className="order-2 md:order-1">
            <span className="mb-4 inline-block rounded-full bg-secondary/20 px-3 py-1 font-body text-xs font-semibold uppercase tracking-wider text-secondary">
              Expert Domestic Care
            </span>
            <h1 className="mb-4 font-display text-3xl font-bold leading-tight text-foreground sm:text-4xl md:text-4xl lg:text-5xl xl:text-6xl">
              Exceptional <span className="italic text-primary">Support</span> For Every Home.
            </h1>
            <p className="mb-6 max-w-lg font-body text-sm text-muted-foreground sm:text-base md:text-lg">
              Discover professional help tailored to your family's unique needs. From housekeeping to specialized infant care, we provide vetted experts you can trust.
            </p>
            {clientUser ? (
              <div className="mb-6 rounded-2xl border bg-muted/50 p-4">
                <p className="font-display text-lg font-semibold text-foreground sm:text-xl">
                  Welcome back, {clientUser.name}
                </p>
              </div>
            ) : null}
            {clientUser ? (
              <div className="flex flex-wrap gap-3">
                <Button variant="outline" size="lg" className="font-body flex-1 sm:flex-none">Direct Hire</Button>
                <Button variant="outline" size="lg" className="font-body flex-1 sm:flex-none">Bio Data Direct Sell</Button>
              </div>
            ) : null}
          </div>

          <div className="relative order-1 md:order-2">
            <div className="overflow-hidden rounded-2xl shadow-xl">
              <img
                src={heroImage}
                alt="Professional domestic helper"
                className="h-56 w-full object-cover sm:h-72 md:h-[400px] lg:h-[480px] xl:h-[520px]"
              />
            </div>
            <div className="absolute bottom-4 left-4 flex items-center gap-3 rounded-xl bg-card px-3 py-2.5 shadow-lg sm:bottom-6 sm:left-6 sm:px-4 sm:py-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary sm:h-10 sm:w-10">
                <CheckCircle className="h-4 w-4 text-primary-foreground sm:h-5 sm:w-5" />
              </div>
              <div>
                <p className="font-body text-xs font-semibold text-foreground sm:text-sm">Vetted Professionals</p>
                <p className="font-body text-[10px] text-muted-foreground sm:text-xs">Background checked and verified</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-y bg-background py-8 md:py-10">
        <div className="container px-4 sm:px-6">
          <div className="mb-5 flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary shrink-0" />
            <h2 className="font-display text-xl font-bold text-foreground sm:text-2xl">Portal Access</h2>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 mb-4">
            <Link
              to="/employer-login"
              className="group rounded-xl border bg-card p-5 transition-colors hover:border-border/60 hover:bg-muted/20"
            >
              <div className="mb-4 flex items-start justify-between">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg" style={{ background: "#EAF3DE" }}>
                  <UserRound className="h-5 w-5" style={{ color: "#3B6D11" }} />
                </div>
                <span className="rounded-full px-2.5 py-1 font-body text-[11px] font-medium" style={{ background: "#EAF3DE", color: "#3B6D11" }}>
                  For employers
                </span>
              </div>
              <p className="font-display text-base font-semibold text-foreground mb-1.5">Employer / Client Login</p>
              <p className="font-body text-sm text-muted-foreground mb-4 leading-relaxed">
                Hire a maid, view biodata, track your applications, and chat with support.
              </p>
              <ul className="space-y-1.5 mb-5">
                {["Browse & shortlist maid profiles", "Track hiring progress", "Message & get support"].map(item => (
                  <li key={item} className="flex items-center gap-2 font-body text-xs text-muted-foreground">
                    <CheckCircle className="h-3.5 w-3.5 shrink-0" style={{ color: "#3B6D11" }} />
                    {item}
                  </li>
                ))}
              </ul>
              <div className="flex items-center justify-between">
                <span className="font-mono text-[11px]" style={{ color: "#3B6D11" }}>/employer-login</span>
                <div className="flex h-7 w-7 items-center justify-center rounded-full" style={{ background: "#EAF3DE" }}>
                  <ArrowRight className="h-3.5 w-3.5" style={{ color: "#3B6D11" }} />
                </div>
              </div>
            </Link>

            <Link
              to="/agencyadmin/login"
              className="group rounded-xl border bg-card p-5 transition-colors hover:border-border/60 hover:bg-muted/20"
            >
              <div className="mb-4 flex items-start justify-between">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg" style={{ background: "#FAEEDA" }}>
                  <Settings className="h-5 w-5" style={{ color: "#854F0B" }} />
                </div>
                <span className="rounded-full px-2.5 py-1 font-body text-[11px] font-medium" style={{ background: "#FAEEDA", color: "#854F0B" }}>
                  Agency staff only
                </span>
              </div>
              <p className="font-display text-base font-semibold text-foreground mb-1.5">Agency Admin Portal</p>
              <p className="font-body text-sm text-muted-foreground mb-4 leading-relaxed">
                Manage maid listings, client accounts, applications, and agency settings.
              </p>
              <ul className="space-y-1.5 mb-5">
                {["Add & publish maid profiles", "Manage client accounts", "Full agency dashboard"].map(item => (
                  <li key={item} className="flex items-center gap-2 font-body text-xs text-muted-foreground">
                    <CheckCircle className="h-3.5 w-3.5 shrink-0" style={{ color: "#854F0B" }} />
                    {item}
                  </li>
                ))}
              </ul>
              <div className="flex items-center justify-between">
                <span className="font-mono text-[11px]" style={{ color: "#854F0B" }}>/agencyadmin/login</span>
                <div className="flex h-7 w-7 items-center justify-center rounded-full" style={{ background: "#FAEEDA" }}>
                  <ArrowRight className="h-3.5 w-3.5" style={{ color: "#854F0B" }} />
                </div>
              </div>
            </Link>
          </div>

          <div className="flex items-start gap-2.5 rounded-lg p-3" style={{ borderLeft: "3px solid #639922", background: "rgb(234 243 222 / 0.4)" }}>
            <ShieldCheck className="h-4 w-4 shrink-0 mt-0.5" style={{ color: "#3B6D11" }} />
            <p className="font-body text-xs text-muted-foreground leading-relaxed">
              Looking for work as a maid? Contact the agency directly — maid registration is handled by agency staff.
            </p>
          </div>
        </div>
      </section>

      <section id="search" className="bg-muted py-8 md:py-10">
        <div className="container px-4 sm:px-6">
          <div className="mb-5">
            <h2 className="font-display text-xl font-bold text-foreground sm:text-2xl">
              Maid <span className="text-primary">Search</span>
            </h2>
          </div>

          <div className="rounded-2xl border bg-card shadow-sm overflow-hidden">
            <div className="p-5 sm:p-6 space-y-5">

              <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-4">
                <label className="w-28 shrink-0 font-body text-sm font-semibold text-foreground">Keywords</label>
                <input
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  className="flex-1 rounded-lg border bg-background px-3 py-2.5 font-body text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                  placeholder="Enter search keywords such as: Filipino maid, baby sitter, etc."
                />
              </div>

              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
                <label className="w-28 shrink-0 font-body text-sm font-semibold text-foreground">Maid Type</label>
                <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
                  {MAID_TYPES.map((type) => (
                    <label key={type} className="flex cursor-pointer items-center gap-2 font-body text-sm text-foreground select-none">
                      <input
                        type="radio"
                        name="maidType"
                        value={type}
                        checked={maidTypes.includes(type)}
                        onChange={() => toggleMaidType(type)}
                        className="h-4 w-4 accent-primary cursor-pointer"
                      />
                      {type}
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-4">
                <label className="w-28 shrink-0 font-body text-sm font-semibold text-foreground">Nationality</label>
                <select
                  value={nationality}
                  onChange={(e) => setNationality(e.target.value)}
                  className="w-full sm:w-52 rounded-lg border bg-background px-3 py-2.5 font-body text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                >
                  {nationalityOptions.map((opt) => (
                    <option key={opt}>{opt}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 border-t">
              <button
                onClick={handleRequestMaid}
                className="flex items-center justify-center gap-2 bg-primary px-4 py-3.5 font-body text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 sm:py-4 sm:text-base border-r border-primary/20"
              >
                Request Maid
              </button>
              <button
                onClick={handleSearch}
                className="flex items-center justify-center gap-2 bg-primary px-4 py-3.5 font-body text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 sm:py-4 sm:text-base"
              >
                <Search className="h-4 w-4 shrink-0" />
                Search Maid Now
              </button>
            </div>
          </div>

          <p className="mt-3 font-body text-sm text-muted-foreground">
            {isLoading
              ? "Loading available public maids..."
              : `${filteredMaids.length} public maid${filteredMaids.length !== 1 ? "s" : ""} matched your search.`}
          </p>
        </div>
      </section>

      <section id="maid-results" className="bg-card py-10 md:py-12">
        <div className="container px-4 sm:px-6">
          <div className="mb-6 flex items-end justify-between gap-4 md:mb-8">
            <div>
              <h2 className="font-display text-2xl font-bold text-foreground sm:text-3xl">
                Available Public Maids
              </h2>
              <p className="mt-1.5 font-body text-sm text-muted-foreground sm:text-base">
                Browse currently available public profiles from your search filters.
              </p>
            </div>
            {totalPages > 1 && (
              <p className="font-body text-sm text-muted-foreground shrink-0">
                Page {currentPage} of {totalPages}
              </p>
            )}
          </div>

          {isLoading ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7">
              {Array.from({ length: 14 }).map((_, i) => (
                <div key={i} className="flex flex-col overflow-hidden border bg-card shadow-sm animate-pulse">
                  <div className="aspect-[3/4] bg-muted" />
                  <div className="p-2.5 space-y-2">
                    <div className="h-2.5 w-3/4 rounded bg-muted" />
                    <div className="h-2 w-1/2 rounded bg-muted" />
                    <div className="h-6 w-full rounded bg-muted mt-2" />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredMaids.length === 0 ? (
            <div className="rounded-2xl border bg-muted/40 p-6 text-center">
              <p className="font-display text-lg font-semibold text-foreground">No matching maids found</p>
              <p className="mt-1 font-body text-sm text-muted-foreground">
                Try a different nationality, maid type, or a broader keyword search.
              </p>
            </div>
          ) : (
            <>
              {!isLoggedIn && (
                <div className="mb-6 rounded-2xl border bg-muted/30 p-5 text-center">
                  <p className="font-display text-lg font-semibold text-foreground sm:text-xl">
                    Login to Unlock Maid Profiles
                  </p>
                  <p className="mt-2 font-body text-sm text-muted-foreground">
                    Guests can preview available public maids in blurred mode. Login to search, view full biodata, and continue hiring.
                  </p>
                  <div className="mt-4">
                    <Button asChild className="w-full sm:w-auto">
                      <Link to="/employer-login">Employer Login</Link>
                    </Button>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7">
                {pagedMaids.map((maid) => {
                  const photo = getPrimaryPhoto(maid);
                  const age = calculateAge(maid.dateOfBirth);
                  const typeLower = (maid.type || "").toLowerCase();
                  const typeColor = typeLower.includes("new")
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                    : typeLower.includes("transfer")
                    ? "bg-blue-50 text-blue-700 border-blue-200"
                    : "bg-amber-50 text-amber-700 border-amber-200";

                  return (
                    <article
                      key={maid.referenceCode}
                      className={`group flex flex-col overflow-hidden border bg-card shadow-sm transition-shadow hover:shadow-md ${!isLoggedIn ? "pointer-events-none" : ""}`}>
                      <div className={`${!isLoggedIn ? "blur-[3px] opacity-80" : ""}`}>

                      <div className="relative w-full bg-muted">
                        {photo ? (
                          <img
                            src={photo}
                            alt={maid.fullName}
                            className="block w-full h-auto"
                          />
                        ) : (
                          <div className="flex h-48 items-center justify-center flex-col gap-1 text-muted-foreground/50">
                            <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                            </svg>
                            <span className="text-[9px]">No photo</span>
                          </div>
                        )}
                        {maid.type && (
                          <div className="absolute top-1.5 left-1.5">
                            <span className={`inline-block px-1.5 py-px text-[9px] font-semibold border bg-white/90 backdrop-blur-sm ${typeColor}`}>
                              {maid.type}
                            </span>
                          </div>
                        )}
                      </div>

                      <div className="flex flex-col gap-1 p-2.5 flex-1">
                        <h3 className="text-xs font-semibold text-foreground line-clamp-1 leading-tight">
                          {maid.fullName}
                        </h3>
                        <p className="text-[10px] text-muted-foreground font-mono leading-tight">
                          {maid.referenceCode}
                        </p>
                        <div className="flex flex-wrap gap-1 mt-0.5">
                          {maid.nationality && (
                            <span className="bg-muted px-1.5 py-px text-[9px] text-muted-foreground border border-border/40">
                              {maid.nationality}
                            </span>
                          )}
                          {age && (
                            <span className="bg-muted px-1.5 py-px text-[9px] text-muted-foreground border border-border/40">
                              {age} yrs
                            </span>
                          )}
                        </div>
                        <div className="mt-auto pt-2">
                          <Button size="sm" asChild className="h-7 w-full text-[10px] px-1 font-semibold">
                            <Link to={`/maids/${encodeURIComponent(maid.referenceCode)}`}>
                              View Profile
                            </Link>
                          </Button>
                        </div>
                      </div>
                    </div>
                    </article>
                  );
                })}
              </div>

              {isLoggedIn && totalPages > 1 && (
                <div className="mt-8 flex items-center justify-center gap-1.5 flex-wrap">
                  <button
                    onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className="rounded-lg border bg-card px-3 py-2 font-body text-sm text-foreground disabled:opacity-40 disabled:cursor-not-allowed hover:bg-muted transition-colors"
                  >
                    Previous
                  </button>
                  {pageNumbers.map((page, idx) =>
                    page === "..." ? (
                      <span key={`ellipsis-${idx}`} className="px-2 py-2 font-body text-sm text-muted-foreground select-none">
                        …
                      </span>
                    ) : (
                      <button
                        key={page}
                        onClick={() => handlePageChange(page as number)}
                        className={`min-w-[2.25rem] rounded-lg border px-3 py-2 font-body text-sm transition-colors ${
                          page === currentPage
                            ? "bg-primary text-primary-foreground border-primary font-semibold"
                            : "bg-card text-foreground hover:bg-muted"
                        }`}
                      >
                        {page}
                      </button>
                    )
                  )}
                  <button
                    onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                    className="rounded-lg border bg-card px-3 py-2 font-body text-sm text-foreground disabled:opacity-40 disabled:cursor-not-allowed hover:bg-muted transition-colors"
                  >
                    Next
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </section>

      <section id="services" className="bg-card py-12 md:py-16 lg:py-24">
        <div className="container px-4 sm:px-6">
          <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between md:mb-10">
            <div>
              <h2 className="font-display text-2xl font-bold text-foreground sm:text-3xl md:text-4xl">
                Our Core <span className="text-primary">Services</span>
              </h2>
              <p className="mt-2 font-body text-sm text-muted-foreground sm:text-base">
                Specialized care designed for modern living standards.
              </p>
            </div>
            <a href="#contact" className="flex items-center gap-1 font-body text-sm font-medium text-primary hover:underline self-start sm:self-auto">
              View All Services <ArrowRight className="h-4 w-4" />
            </a>
          </div>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {services.map((service) => (
              <div key={service.title} className="group overflow-hidden rounded-2xl bg-muted transition-shadow hover:shadow-lg">
                <div className="h-44 overflow-hidden sm:h-48">
                  <img
                    src={service.image}
                    alt={service.title}
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                </div>
                <div className="p-4 sm:p-5">
                  <h3 className="font-display text-base font-semibold text-foreground mb-1.5 sm:text-lg sm:mb-2">{service.title}</h3>
                  <p className="font-body text-xs text-muted-foreground mb-3 sm:text-sm leading-relaxed">{service.description}</p>
                  <Link to={`/services/${service.slug}`} className="inline-flex items-center gap-1 font-body text-sm text-primary font-medium hover:underline">
                    Learn More <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="why" className="bg-muted py-12 md:py-16 lg:py-24">
        <div className="container grid items-center gap-8 px-4 sm:px-6 md:grid-cols-2 md:gap-12">
          <div className="relative">
            <div className="overflow-hidden rounded-2xl">
              <img
                src={familyImg}
                alt="Happy family"
                className="h-64 w-full rounded-2xl object-cover sm:h-80 md:h-[400px]"
              />
            </div>
            <div className="absolute bottom-4 left-4 rounded-xl bg-primary px-4 py-3 text-primary-foreground sm:bottom-6 sm:left-6 sm:px-5 sm:py-4">
              <p className="font-display text-2xl font-bold sm:text-3xl">15+</p>
              <p className="font-body text-[10px] sm:text-xs">Years of Excellence in Domestic Management</p>
            </div>
          </div>
          <div>
            <h2 className="mb-6 font-display text-2xl font-bold text-foreground sm:text-3xl md:text-4xl md:mb-8">
              Why Choose <br />
              <span className="text-primary">"Find Maids" At The Agency?</span>
            </h2>
            <div className="space-y-5 md:space-y-6">
              {features.map((feature) => (
                <div key={feature.title} className="flex gap-3 md:gap-4">
                  <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-accent md:h-10 md:w-10">
                    <feature.icon className="h-4 w-4 text-accent-foreground md:h-5 md:w-5" />
                  </div>
                  <div>
                    <h3 className="mb-1 font-display text-base font-semibold text-foreground md:text-lg">{feature.title}</h3>
                    <p className="font-body text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* <section id="contact" className="bg-card py-12 md:py-16 lg:py-24">
        <div className="container max-w-2xl px-4 text-center sm:px-6">
          <h2 className="mb-3 font-display text-2xl font-bold text-foreground sm:text-3xl md:text-4xl">
            Initiate Your Search Today
          </h2>
          <p className="mb-8 font-body text-sm text-muted-foreground sm:text-base md:mb-10">
            Tell us your requirements and our experts will shortlist the best candidates for you within 24 hours.
          </p>
          <div className="rounded-2xl bg-muted p-5 text-left sm:p-8">
            <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
              <div>
                <label className="mb-1 block font-body text-xs uppercase tracking-wider text-muted-foreground">Your Full Name</label>
                <input className="w-full rounded-lg border bg-card px-3 py-2.5 font-body text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30" placeholder="John Doe" />
              </div>
              <div>
                <label className="mb-1 block font-body text-xs uppercase tracking-wider text-muted-foreground">Email Address</label>
                <input className="w-full rounded-lg border bg-card px-3 py-2.5 font-body text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30" placeholder="john@example.org" />
              </div>
              <div>
                <label className="mb-1 block font-body text-xs uppercase tracking-wider text-muted-foreground">Phone Number</label>
                <input className="w-full rounded-lg border bg-card px-3 py-2.5 font-body text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30" placeholder="+1 (555) 000-0000" />
              </div>
              <div>
                <label className="mb-1 block font-body text-xs uppercase tracking-wider text-muted-foreground">Main Requirement</label>
                <select className="w-full rounded-lg border bg-card px-3 py-2.5 font-body text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30">
                  <option>Housekeeping</option>
                  <option>Elderly Care</option>
                  <option>Infant Care</option>
                  <option>Kid Care</option>
                </select>
              </div>
            </div>
            <div className="mb-5">
              <label className="mb-1 block font-body text-xs uppercase tracking-wider text-muted-foreground">Message (Optional)</label>
              <textarea className="h-24 w-full resize-none rounded-lg border bg-card px-3 py-2.5 font-body text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30" placeholder="Tell us more about your care needs..." />
            </div>
            <Button size="lg" className="w-full font-body">
              Submit My Request
            </Button>
          </div>
        </div>
      </section> */}

      <footer className="bg-foreground py-10 text-primary-foreground md:py-12">
        <div className="container px-4 sm:px-6">
          <div className="mb-8 grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-4 md:gap-8">
            <div className="sm:col-span-2 md:col-span-1">
              <h4 className="mb-3 font-display text-base font-bold md:text-lg">"Find Maids" At The Agency</h4>
              <p className="font-body text-sm opacity-70 leading-relaxed">Matching trusted domestic professionals with families since 2009.</p>
            </div>
            <div>
              <h5 className="mb-3 font-body text-xs font-semibold uppercase tracking-wider">Company</h5>
              <ul className="space-y-2 font-body text-sm opacity-70">
                <li><a href="#why" className="transition-opacity hover:opacity-100">About Us</a></li>
                <li><a href="#services" className="transition-opacity hover:opacity-100">Our Services</a></li>
                <li><a href="#contact" className="transition-opacity hover:opacity-100">Contact</a></li>
              </ul>
            </div>
            <div>
              <h5 className="mb-3 font-body text-xs font-semibold uppercase tracking-wider">Legal</h5>
              <ul className="space-y-2 font-body text-sm opacity-70">
                <li><a href="#contact" className="transition-opacity hover:opacity-100">Legal Information</a></li>
                <li><a href="#contact" className="transition-opacity hover:opacity-100">Privacy Policy</a></li>
                <li><a href="#contact" className="transition-opacity hover:opacity-100">Terms of Service</a></li>
              </ul>
            </div>
            <div>
              <h5 className="mb-3 font-body text-xs font-semibold uppercase tracking-wider">Newsletter</h5>
              <p className="mb-3 font-body text-sm opacity-70 leading-relaxed">Stay updated on care tips, industry news, and agency updates.</p>
              <div className="flex gap-2">
                <input
                  className="min-w-0 flex-1 rounded-lg border border-primary-foreground/20 bg-primary-foreground/10 px-3 py-2 font-body text-sm placeholder:opacity-50 focus:outline-none"
                  placeholder="Email"
                />
                <button className="rounded-lg bg-primary px-3 py-2 font-body text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 shrink-0">
                  Join
                </button>
              </div>
            </div>
          </div>
          <div className="border-t border-primary-foreground/20 pt-6 text-center font-body text-xs opacity-50">
            Copyright 2026 "Find Maids" At The Agency. All rights reserved.
          </div>
        </div>
      </footer>

    </div>
  );
};

export default ClientLandingPage;