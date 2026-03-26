import { useEffect, useMemo, useState } from "react";
import { ArrowRight, CheckCircle, HeartHandshake, Search, Users } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "@/components/ui/sonner";
import { clearClientAuth, getClientAuthHeaders, getStoredClient, getClientToken, type ClientUser } from "@/lib/clientAuth";
import { calculateAge, MaidProfile } from "@/lib/maids";
import culinaryImg from "./assets/culinary.jpg";
import elderlyImg from "./assets/elderly-care.jpg";
import familyImg from "./assets/family.jpg";
import heroImage from "./assets/hero-maid.jpg";
import housekeepingImg from "./assets/housekeeping.jpg";
import infantImg from "./assets/infant-care.jpg";
import "./ClientTheme.css";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import { Menu } from "lucide-react";




const services = [
  {
    title: "Housekeeping",
    description: "Meticulous cleaning, organization, and care to keep your living space immaculate and inviting.",
    image: housekeepingImg,
  },
  {
    title: "Elderly Care",
    description: "Compassionate and professional support for your loved ones. Ensuring dignity and well-being.",
    image: elderlyImg,
  },
  {
    title: "Infant Care",
    description: "Expert caregivers providing nurturing, developmental support for your little ones.",
    image: infantImg,
  },
  {
    title: "Child Care",
    description: "Personalized culinary experiences for your dietary preferences and nutrition needs.",
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

const getExperienceBucket = (maid: MaidProfile) => {
  const count = Array.isArray(maid.employmentHistory) ? maid.employmentHistory.length : 0;
  if (count >= 5) return "5+ Years";
  if (count >= 3) return "3-5 Years";
  if (count >= 1) return "1-2 Years";
  return "No Experience";
};

const getPrimaryPhoto = (maid: MaidProfile) =>
  Array.isArray(maid.photoDataUrls) && maid.photoDataUrls.length > 0 ? maid.photoDataUrls[0] : maid.photoDataUrl || "";

const getPublicIntro = (maid: MaidProfile) => String((maid.introduction as Record<string, unknown>)?.publicIntro || "").trim();

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

const ClientLandingPage = () => {
  const navigate = useNavigate();
  const [allPublicMaids, setAllPublicMaids] = useState<MaidProfile[]>([]);
  const [company, setCompany] = useState<CompanyProfileApi | null>(null);
  const [clientUser, setClientUser] = useState<ClientUser | null>(getStoredClient());
  const [isAgencyModalOpen, setIsAgencyModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [keyword, setKeyword] = useState("");
  const [nationality, setNationality] = useState("All Nationalities");
  const [experience, setExperience] = useState("Any Experience");
  const [ageGroup, setAgeGroup] = useState("Any Age");
  const [agencyKeyword, setAgencyKeyword] = useState("");
  const [agencyNationality, setAgencyNationality] = useState("All Nationalities");
  const [agencyType, setAgencyType] = useState("All Types");
  const [open, setOpen] = useState(false);
  const [submittedFilters, setSubmittedFilters] = useState({
    keyword: "",
    nationality: "All Nationalities",
    experience: "Any Experience",
    ageGroup: "Any Age",
  });

  const navLinks = [
  { label: "Services", href: "#services" },
  { label: "Search Maids", href: "#search" },
  { label: "About", href: "#why" },
  { label: "Contact", href: "#contact" },
];

  useEffect(() => {
    const loadLandingData = async () => {
      try {
        setIsLoading(true);
        const [maidsResponse, companyResponse] = await Promise.all([
          fetch("/api/maids?visibility=public"),
          fetch("/api/company"),
        ]);

        const maidData = (await maidsResponse.json().catch(() => ({}))) as { error?: string; maids?: MaidProfile[] };
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
      if (!token) {
        setClientUser(null);
        return;
      }

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
    ).sort((left, right) => left.localeCompare(right));

    return ["All Nationalities", ...values];
  }, [allPublicMaids]);

  const typeOptions = useMemo(() => {
    const values = Array.from(
      new Set(
        allPublicMaids
          .map((maid) => maid.type?.trim())
          .filter((value): value is string => Boolean(value))
      )
    ).sort((left, right) => left.localeCompare(right));

    return ["All Types", ...values];
  }, [allPublicMaids]);

  const agencyFilteredMaids = useMemo(() => {
    return allPublicMaids.filter((maid) => {
      const publicIntro = getPublicIntro(maid).toLowerCase();
      const searchText = `${maid.fullName} ${maid.referenceCode} ${maid.nationality} ${maid.type} ${publicIntro}`.toLowerCase();

      const keywordMatches = !agencyKeyword.trim() || searchText.includes(agencyKeyword.trim().toLowerCase());
      const nationalityMatches = agencyNationality === "All Nationalities" || maid.nationality === agencyNationality;
      const typeMatches = agencyType === "All Types" || maid.type === agencyType;

      return keywordMatches && nationalityMatches && typeMatches;
    });
  }, [agencyKeyword, agencyNationality, agencyType, allPublicMaids]);

  const filteredMaids = useMemo(() => {
    return allPublicMaids.filter((maid) => {
      const age = calculateAge(maid.dateOfBirth);
      const publicIntro = getPublicIntro(maid).toLowerCase();
      const searchText = `${maid.fullName} ${maid.referenceCode} ${maid.nationality} ${maid.type} ${publicIntro}`.toLowerCase();

      const keywordMatches =
        !submittedFilters.keyword.trim() || searchText.includes(submittedFilters.keyword.trim().toLowerCase());
      const nationalityMatches =
        submittedFilters.nationality === "All Nationalities" || maid.nationality === submittedFilters.nationality;
      const experienceMatches =
        submittedFilters.experience === "Any Experience" || getExperienceBucket(maid) === submittedFilters.experience;
      const ageMatches =
        submittedFilters.ageGroup === "Any Age" ||
        (submittedFilters.ageGroup === "23-30" && age !== null && age >= 23 && age <= 30) ||
        (submittedFilters.ageGroup === "30-40" && age !== null && age > 30 && age <= 40) ||
        (submittedFilters.ageGroup === "40+" && age !== null && age > 40);

      return keywordMatches && nationalityMatches && experienceMatches && ageMatches;
    });
  }, [allPublicMaids, submittedFilters]);

  const handleSearch = () => {
    setSubmittedFilters({ keyword, nationality, experience, ageGroup });
    window.setTimeout(() => {
      document.getElementById("maid-results")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 0);
  };

  const handleLogout = async () => {
    try {
      await fetch("/api/client-auth/logout", {
        method: "POST",
        headers: { ...getClientAuthHeaders() },
      });
    } catch {
      // Best-effort logout; local auth will still be cleared.
    } finally {
      clearClientAuth();
      setClientUser(null);
      toast.success("Client account logged out");
      navigate("/");
    }
  };

  return (
    <div className="client-page-theme min-h-screen">
      <header className="sticky top-0 z-50 bg-card/95 backdrop-blur border-b border-border">
        <div className="container flex items-center justify-between h-16">
          <Link to="/" className="font-display text-xl font-bold text-foreground">
            MaidAgency
          </Link>

          <nav className="hidden md:flex items-center gap-8 font-body text-sm font-medium">
            <button
              type="button"
              onClick={() => setIsAgencyModalOpen(true)}
              className="transition-colors hover:text-primary text-foreground"
            >
              Through Agency
            </button>

            {navLinks
              .filter(link => link.label !== "Home")
              .map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  className="text-foreground hover:text-primary transition-colors"
                >
                  {link.label}
                </a>
              ))}
          </nav>

          <Link to="/employer-login" className="hidden md:inline-flex">
            <Button variant="default" size="sm" className="font-body">
              Employer Login
            </Button>
          </Link>

          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild className="md:hidden">
              <Button variant="ghost" size="icon">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>

            <SheetContent side="right" className="w-64">
              <SheetTitle className="font-display text-lg">Menu</SheetTitle>

              <nav className="flex flex-col gap-4 mt-6 font-body text-base">
                <button
                  type="button"
                  onClick={() => {
                    setIsAgencyModalOpen(true);
                    setOpen(false);
                  }}
                  className="text-left text-foreground hover:text-primary transition-colors py-1"
                >
                  Through Agency
                </button>

                {/* Other links (excluding Home) */}
                {navLinks
                  .filter(link => link.label !== "Home")
                  .map((link) => (
                    <a
                      key={link.href}
                      href={link.href}
                      onClick={() => setOpen(false)}
                      className="text-foreground hover:text-primary transition-colors py-1"
                    >
                      {link.label}
                    </a>
                  ))}

                <Link to="/employer-login" onClick={() => setOpen(false)} className="mt-2">
                  <Button variant="default" className="w-full font-body">
                    Employer Login
                  </Button>
                </Link>
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </header>

      <section className="bg-card">
        <div className="container grid items-center gap-10 py-12 md:grid-cols-2 md:py-20">
          <div>
            <span className="mb-4 inline-block rounded-full bg-secondary/20 px-3 py-1 font-body text-xs font-semibold uppercase tracking-wider text-secondary">
              Expert Domestic Care
            </span>
            <h1 className="mb-6 font-display text-4xl font-bold leading-tight text-foreground md:text-5xl lg:text-6xl">
              Exceptional <span className="italic text-primary">Support</span> For Every Home.
            </h1>
            <p className="mb-8 max-w-lg font-body text-base text-muted-foreground md:text-lg">
              Discover professional help tailored to your family's unique needs. From housekeeping to specialized infant care, we provide vetted experts you can trust.
            </p>
            {clientUser ? (
              <div className="mb-8 rounded-2xl border bg-muted/50 p-4">
                <p className="font-display text-xl font-semibold text-foreground">Welcome back, {clientUser.name}</p>
                <p className="mt-1 font-body text-sm text-muted-foreground">
                  Your client account is active. Open your dashboard to view only the maids assigned to you.
                </p>
                <div className="mt-4">
                  <Button className="font-body" asChild>
                    <Link to="/client/dashboard">Open Client Dashboard</Link>
                  </Button>
                </div>
              </div>
            ) : null}
            <div className="flex gap-3 max-w-xs">
            <Button size="lg" className="flex-1 font-body" onClick={() => setIsAgencyModalOpen(true)} >Through Agency</Button>
          </div>
          </div>
          <div className="relative">
            <div className="overflow-hidden rounded-2xl shadow-xl">
              <img src={heroImage} alt="Professional domestic helper" className="h-[400px] w-full object-cover md:h-[500px]" />
            </div>
            <div className="absolute bottom-6 left-6 flex items-center gap-3 rounded-xl bg-card px-4 py-3 shadow-lg">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary">
                <CheckCircle className="h-5 w-5 text-primary-foreground" />
              </div>
              <div>
                <p className="font-body text-sm font-semibold text-foreground">Vetted Professionals</p>
                <p className="font-body text-xs text-muted-foreground">Background checked and verified</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <Dialog open={isAgencyModalOpen} onOpenChange={setIsAgencyModalOpen}>
        <DialogContent className="max-h-[90vh] max-w-6xl overflow-y-auto p-0">
          <div className="p-6 md:p-8">
            <DialogHeader className="mb-6 pr-8">
              <DialogTitle className="font-display text-3xl font-bold text-foreground">Through Agency</DialogTitle>
              <DialogDescription className="font-body text-sm text-muted-foreground">
                View the agency details and browse public maid profiles available through the agency in one place.
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-6 xl:grid-cols-[1.05fr_1.35fr]">
              <article className="rounded-2xl border bg-muted/40 p-6">
                <div className="mb-5 flex items-center gap-4">
                  <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-2xl border bg-card">
                    {company?.logo_data_url ? (
                      <img src={company.logo_data_url} alt={company.company_name || "Agency logo"} className="h-full w-full object-cover" />
                    ) : (
                      <span className="font-display text-lg font-bold text-primary">MA</span>
                    )}
                  </div>
                  <div>
                    <h3 className="font-display text-2xl font-bold text-foreground">
                      {company?.company_name || company?.short_name || "Agency Profile"}
                    </h3>
                    <p className="font-body text-sm text-muted-foreground">License No: {company?.license_no || "N/A"}</p>
                  </div>
                </div>

                <div className="grid gap-4 font-body text-sm text-foreground sm:grid-cols-2">
                  <div>
                    <p className="text-xs uppercase tracking-wider text-muted-foreground">Contact Person</p>
                    <p className="mt-1">{company?.contact_person || "N/A"}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wider text-muted-foreground">Phone</p>
                    <p className="mt-1">{company?.contact_phone || "N/A"}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wider text-muted-foreground">Email</p>
                    <p className="mt-1 break-all">{company?.contact_email || "N/A"}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wider text-muted-foreground">Website</p>
                    <p className="mt-1 break-all">{company?.contact_website || "N/A"}</p>
                  </div>
                </div>

                <div className="mt-5 space-y-4">
                  <div>
                    <p className="font-body text-xs uppercase tracking-wider text-muted-foreground">Address</p>
                    <p className="mt-1 font-body text-sm text-foreground">
                      {[company?.address_line1, company?.address_line2, company?.postal_code, company?.country].filter(Boolean).join(", ") || "N/A"}
                    </p>
                  </div>
                  <div>
                    <p className="font-body text-xs uppercase tracking-wider text-muted-foreground">Office Hours</p>
                    <p className="mt-1 font-body text-sm text-foreground">{company?.office_hours_regular || "N/A"}</p>
                    {company?.office_hours_other ? (
                      <p className="mt-1 font-body text-sm text-muted-foreground">{company.office_hours_other}</p>
                    ) : null}
                  </div>
                  <div>
                    <p className="font-body text-xs uppercase tracking-wider text-muted-foreground">About the Agency</p>
                    <p className="mt-1 font-body text-sm leading-6 text-muted-foreground">
                      {company?.about_us || "Agency information will be updated soon."}
                    </p>
                  </div>
                </div>
              </article>

              <article className="rounded-2xl border bg-card p-6 shadow-sm">
                <div className="mb-5 flex items-center justify-between gap-3">
                  <div>
                    <h3 className="font-display text-2xl font-bold text-foreground">Public Maids Through Agency</h3>
                    <p className="mt-1 font-body text-sm text-muted-foreground">
                      {isLoading ? "Loading public profiles..." : `${agencyFilteredMaids.length} profiles found`}
                    </p>
                  </div>
                </div>

                <div className="mb-5 grid grid-cols-1 gap-3 md:grid-cols-3">
                  <input
                    value={agencyKeyword}
                    onChange={(event) => setAgencyKeyword(event.target.value)}
                    className="w-full rounded-lg border bg-card px-3 py-2.5 font-body text-sm text-foreground"
                    placeholder="Search name, code, type"
                  />
                  <select
                    value={agencyNationality}
                    onChange={(event) => setAgencyNationality(event.target.value)}
                    className="w-full rounded-lg border bg-card px-3 py-2.5 font-body text-sm text-foreground"
                  >
                    {nationalityOptions.map((option) => (
                      <option key={option}>{option}</option>
                    ))}
                  </select>
                  <select
                    value={agencyType}
                    onChange={(event) => setAgencyType(event.target.value)}
                    className="w-full rounded-lg border bg-card px-3 py-2.5 font-body text-sm text-foreground"
                  >
                    {typeOptions.map((option) => (
                      <option key={option}>{option}</option>
                    ))}
                  </select>
                </div>

                {isLoading ? (
                  <div className="rounded-2xl border bg-muted/50 p-6 text-center font-body text-muted-foreground">
                    Loading maid profiles...
                  </div>
                ) : agencyFilteredMaids.length === 0 ? (
                  <div className="rounded-2xl border bg-muted/50 p-6 text-center">
                    <p className="font-display text-xl font-semibold text-foreground">No public maids found</p>
                    <p className="mt-2 font-body text-sm text-muted-foreground">
                      Try a different keyword, nationality, or maid type.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {agencyFilteredMaids.slice(0, 4).map((maid) => {
                      const age = calculateAge(maid.dateOfBirth);
                      const photo = getPrimaryPhoto(maid);

                      return (
                        <article key={maid.referenceCode} className="grid gap-4 rounded-2xl border bg-muted/30 p-4 md:grid-cols-[96px_1fr]">
                          <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-xl bg-muted">
                            {photo ? (
                              <img src={photo} alt={maid.fullName} className="h-full w-full object-cover" />
                            ) : (
                              <span className="px-2 text-center font-body text-xs text-muted-foreground">No photo</span>
                            )}
                          </div>
                          <div>
                            <div className="flex flex-wrap items-start justify-between gap-3">
                              <div>
                                <p className="font-display text-xl font-bold text-foreground">{maid.fullName}</p>
                                <p className="font-body text-xs uppercase tracking-wide text-muted-foreground">{maid.referenceCode}</p>
                              </div>
                              <div className="flex flex-wrap gap-2">
                                <span className="rounded-full bg-accent px-2.5 py-1 font-body text-xs font-medium text-accent-foreground">
                                  {maid.nationality || "N/A"}
                                </span>
                                <span className="rounded-full bg-secondary/20 px-2.5 py-1 font-body text-xs font-medium text-foreground">
                                  {maid.type || "N/A"}
                                </span>
                              </div>
                            </div>

                            <div className="mt-3 grid gap-2 font-body text-sm text-foreground sm:grid-cols-3">
                              <p><span className="text-muted-foreground">Age:</span> {age ?? "N/A"}</p>
                              <p><span className="text-muted-foreground">Experience:</span> {getExperienceBucket(maid)}</p>
                              <p><span className="text-muted-foreground">Education:</span> {maid.educationLevel || "N/A"}</p>
                            </div>

                            <p className="mt-3 font-body text-sm leading-6 text-muted-foreground">
                              {getPublicIntro(maid) || "Public introduction will be available soon for this profile."}
                            </p>
                          </div>
                        </article>
                      );
                    })}

                    {agencyFilteredMaids.length > 4 ? (
                      <p className="font-body text-sm text-muted-foreground">
                        Showing 4 of {agencyFilteredMaids.length} matching public maids. Use the full search below to explore more profiles.
                      </p>
                    ) : null}
                  </div>
                )}
              </article>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <section id="search" className="bg-muted py-8">
        <div className="container">
          <div className="mb-4 flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            <h3 className="font-display text-lg font-semibold text-foreground">Find Your Ideal Match</h3>
          </div>
          <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
            <div className="xl:col-span-1">
              <label className="mb-1 block font-body text-xs uppercase tracking-wider text-muted-foreground">Keyword</label>
              <input
                value={keyword}
                onChange={(event) => setKeyword(event.target.value)}
                className="w-full rounded-lg border bg-card px-3 py-2.5 font-body text-sm text-foreground"
                placeholder="Name, code, type"
              />
            </div>
            <div>
              <label className="mb-1 block font-body text-xs uppercase tracking-wider text-muted-foreground">Nationality</label>
              <select
                value={nationality}
                onChange={(event) => setNationality(event.target.value)}
                className="w-full rounded-lg border bg-card px-3 py-2.5 font-body text-sm text-foreground"
              >
                {nationalityOptions.map((option) => (
                  <option key={option}>{option}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block font-body text-xs uppercase tracking-wider text-muted-foreground">Experience</label>
              <select
                value={experience}
                onChange={(event) => setExperience(event.target.value)}
                className="w-full rounded-lg border bg-card px-3 py-2.5 font-body text-sm text-foreground"
              >
                <option>Any Experience</option>
                <option>1-2 Years</option>
                <option>3-5 Years</option>
                <option>5+ Years</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block font-body text-xs uppercase tracking-wider text-muted-foreground">Age Group</label>
              <select
                value={ageGroup}
                onChange={(event) => setAgeGroup(event.target.value)}
                className="w-full rounded-lg border bg-card px-3 py-2.5 font-body text-sm text-foreground"
              >
                <option>Any Age</option>
                <option>23-30</option>
                <option>30-40</option>
                <option>40+</option>
              </select>
            </div>
            <div className="flex items-end">
              <Button className="w-full gap-2 font-body" onClick={handleSearch}>
                <Search className="h-4 w-4" /> Search Maids
              </Button>
            </div>
          </div>
          <p className="font-body text-sm text-muted-foreground">
            {isLoading ? "Loading available public maids..." : `${filteredMaids.length} public maids matched your search.`}
          </p>
        </div>
      </section>

        <section id="maid-results" className="bg-card py-12">
          <div className="container max-w-5xl mx-auto">
            <div className="mb-8 flex items-end justify-between gap-4">
              <div>
                <h2 className="font-display text-3xl font-bold text-foreground">
                  Available Public Maids
                </h2>
                <p className="mt-2 font-body text-muted-foreground">
                  Browse currently available public profiles from your search filters.
                </p>
              </div>
            </div>

            {isLoading ? (
              <div className="rounded-2xl border bg-muted/50 p-6 text-center font-body text-muted-foreground">
                Loading maid profiles...
              </div>
            ) : filteredMaids.length === 0 ? (
              <div className="rounded-2xl border bg-muted/50 p-6 text-center">
                <p className="font-display text-xl font-semibold text-foreground">
                  No matching maids found
                </p>
                <p className="mt-2 font-body text-sm text-muted-foreground">
                  Try a different filter or broader search.
                </p>
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {filteredMaids.map((maid) => {
                  const age = calculateAge(maid.dateOfBirth);
                  const photo = getPrimaryPhoto(maid);
                  const publicIntro = getPublicIntro(maid);

                  return (
                    <article
                      key={maid.referenceCode}
                      className="w-full max-w-xs mx-auto overflow-hidden rounded-xl border bg-card shadow-sm hover:shadow-md transition"
                    >
                      <div className="h-40 w-full overflow-hidden bg-muted">
                        {photo ? (
                          <img
                            src={photo}
                            alt={maid.fullName}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
                            No photo available
                          </div>
                        )}
                      </div>

                      <div className="p-3 space-y-2 text-center">
                        <p className="text-base font-semibold text-foreground">
                          {maid.fullName}
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          {maid.referenceCode}
                        </p>

                        <div className="flex flex-wrap justify-center gap-1">
                          <span className="px-2 py-0.5 text-[10px] rounded-full bg-accent text-accent-foreground">
                            {maid.nationality}
                          </span>
                          <span className="px-2 py-0.5 text-[10px] rounded-full bg-secondary/20">
                            {maid.type}
                          </span>
                          <span className="px-2 py-0.5 text-[10px] rounded-full bg-muted">
                            {getExperienceBucket(maid)}
                          </span>
                        </div>

                        <div className="text-[12px] space-y-1">
                          <p>
                            Age: {age ?? "N/A"} • Marital:{" "}
                            {maid.maritalStatus || "N/A"}
                          </p>
                          <p>Religion: {maid.religion || "N/A"}</p>
                          <p>
                            Education: {maid.educationLevel || "N/A"}
                          </p>
                        </div>

                        <p className="text-[12px] text-muted-foreground line-clamp-2">
                          {publicIntro ||
                            "Public introduction will be available soon."}
                        </p>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </div>
        </section>

      <section id="services" className="bg-card py-16 md:py-24">
        <div className="container">
          <div className="mb-10 flex items-end justify-between">
            <div>
              <h2 className="font-display text-3xl font-bold text-foreground md:text-4xl">
                Our Core <span className="text-primary">Services</span>
              </h2>
              <p className="mt-2 font-body text-muted-foreground">Specialized care designed for modern living standards.</p>
            </div>
            <a href="#contact" className="hidden items-center gap-1 font-body text-sm font-medium text-primary hover:underline md:flex">
              View All Services <ArrowRight className="h-4 w-4" />
            </a>
          </div>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {services.map((service) => (
              <div key={service.title} className="group overflow-hidden rounded-2xl bg-muted transition-shadow hover:shadow-lg">
                <div className="h-48 overflow-hidden">
                  <img src={service.image} alt={service.title} className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" />
                </div>
                <div className="p-5">
                  <h3 className="mb-2 font-display text-lg font-semibold text-foreground">{service.title}</h3>
                  <p className="mb-3 font-body text-sm text-muted-foreground">{service.description}</p>
                  <a href="#contact" className="inline-flex items-center gap-1 font-body text-sm font-medium text-primary hover:underline">
                    Learn More <ArrowRight className="h-3.5 w-3.5" />
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="why" className="bg-muted py-16 md:py-24">
        <div className="container grid items-center gap-12 md:grid-cols-2">
          <div className="relative">
            <div className="overflow-hidden rounded-2xl">
              <img src={familyImg} alt="Happy family" className="h-[400px] w-full rounded-2xl object-cover" />
            </div>
            <div className="absolute bottom-6 left-6 rounded-xl bg-primary px-5 py-4 text-primary-foreground">
              <p className="font-display text-3xl font-bold">15+</p>
              <p className="font-body text-xs">Years of Excellence in Domestic Management</p>
            </div>
          </div>
          <div>
            <h2 className="mb-8 font-display text-3xl font-bold text-foreground md:text-4xl">
              Why Choose <br />
              <span className="text-primary">MaidAgency?</span>
            </h2>
            <div className="space-y-6">
              {features.map((feature) => (
                <div key={feature.title} className="flex gap-4">
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-accent">
                    <feature.icon className="h-5 w-5 text-accent-foreground" />
                  </div>
                  <div>
                    <h3 className="mb-1 font-display text-lg font-semibold text-foreground">{feature.title}</h3>
                    <p className="font-body text-sm text-muted-foreground">{feature.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="contact" className="bg-card py-16 md:py-24">
        <div className="container max-w-2xl text-center">
          <h2 className="mb-3 font-display text-3xl font-bold text-foreground md:text-4xl">Initiate Your Search Today</h2>
          <p className="mb-10 font-body text-muted-foreground">
            Tell us your requirements and our experts will shortlist the best candidates for you within 24 hours.
          </p>
          <div className="rounded-2xl bg-muted p-8 text-left">
            <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block font-body text-xs uppercase tracking-wider text-muted-foreground">Your Full Name</label>
                <input className="w-full rounded-lg border bg-card px-3 py-2.5 font-body text-sm text-foreground" placeholder="John Doe" />
              </div>
              <div>
                <label className="mb-1 block font-body text-xs uppercase tracking-wider text-muted-foreground">Email Address</label>
                <input className="w-full rounded-lg border bg-card px-3 py-2.5 font-body text-sm text-foreground" placeholder="john@example.org" />
              </div>
              <div>
                <label className="mb-1 block font-body text-xs uppercase tracking-wider text-muted-foreground">Phone Number</label>
                <input className="w-full rounded-lg border bg-card px-3 py-2.5 font-body text-sm text-foreground" placeholder="+1 (555) 000-0000" />
              </div>
              <div>
                <label className="mb-1 block font-body text-xs uppercase tracking-wider text-muted-foreground">Main Requirement</label>
                <select className="w-full rounded-lg border bg-card px-3 py-2.5 font-body text-sm text-foreground">
                  <option>Housekeeping</option>
                  <option>Elderly Care</option>
                  <option>Infant Care</option>
                  <option>Child Care</option>
                </select>
              </div>
            </div>
            <div className="mb-6">
              <label className="mb-1 block font-body text-xs uppercase tracking-wider text-muted-foreground">Message (Optional)</label>
              <textarea className="h-24 w-full resize-none rounded-lg border bg-card px-3 py-2.5 font-body text-sm text-foreground" placeholder="Tell us more about your care needs..." />
            </div>
            <Button size="lg" className="w-full font-body">
              Submit My Request
            </Button>
          </div>
        </div>
      </section>

      <footer className="bg-foreground py-12 text-primary-foreground">
        <div className="container">
          <div className="mb-8 grid grid-cols-1 gap-8 md:grid-cols-4">
            <div>
              <h4 className="mb-3 font-display text-lg font-bold">MaidAgency</h4>
              <p className="font-body text-sm opacity-70">Matching trusted domestic professionals with families since 2009.</p>
            </div>
            <div>
              <h5 className="mb-3 font-body text-sm font-semibold uppercase tracking-wider">Company</h5>
              <ul className="space-y-2 font-body text-sm opacity-70">
                <li><a href="#why" className="transition-opacity hover:opacity-100">About Us</a></li>
                <li><a href="#services" className="transition-opacity hover:opacity-100">Our Services</a></li>
                <li><a href="#contact" className="transition-opacity hover:opacity-100">Contact</a></li>
              </ul>
            </div>
            <div>
              <h5 className="mb-3 font-body text-sm font-semibold uppercase tracking-wider">Legal</h5>
              <ul className="space-y-2 font-body text-sm opacity-70">
                <li><a href="#contact" className="transition-opacity hover:opacity-100">Legal Information</a></li>
                <li><a href="#contact" className="transition-opacity hover:opacity-100">Privacy Policy</a></li>
                <li><a href="#contact" className="transition-opacity hover:opacity-100">Terms of Service</a></li>
              </ul>
            </div>
            <div>
              <h5 className="mb-3 font-body text-sm font-semibold uppercase tracking-wider">Join Our Newsletter</h5>
              <p className="mb-3 font-body text-sm opacity-70">Stay updated on care tips, industry news, and agency updates.</p>
              <div className="flex gap-2">
                <input className="flex-1 rounded-lg border border-primary-foreground/20 bg-primary-foreground/10 px-3 py-2 font-body text-sm placeholder:opacity-50" placeholder="Email" />
                <button className="rounded-lg bg-primary px-4 py-2 font-body text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90">Join</button>
              </div>
            </div>
          </div>
          <div className="border-t border-primary-foreground/20 pt-6 text-center font-body text-xs opacity-50">
            Copyright 2025 MaidAgency. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
};

export default ClientLandingPage;
