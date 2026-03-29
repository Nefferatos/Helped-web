import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Bell,
  BriefcaseBusiness,
  Building2,
  CheckCircle2,
  Clock3,
  Home,
  LogOut,
  Mail,
  MessageCircle,
  Phone,
  Search,
  Settings,
  Sparkles,
  UserRound,
  Users,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { calculateAge, MaidProfile } from "@/lib/maids";
import { fetchAgencies, type AgencySummary } from "@/lib/agencies";
import { clearClientAuth, getClientAuthHeaders, getStoredClient, getClientToken, type ClientUser } from "@/lib/clientAuth";
import { useToast } from "@/hooks/use-toast";
import "./ClientTheme.css";

interface Assignment {
  directSale: {
    id: number;
    status: string;
    createdAt: string;
  };
  maid: MaidProfile;
}

interface CompanyProfileApi {
  company_name?: string;
  short_name?: string;
  contact_person?: string;
  contact_phone?: string;
  contact_email?: string;
  contact_website?: string;
  office_hours_regular?: string;
  about_us?: string;
}

interface CompanyResponse {
  companyProfile?: CompanyProfileApi;
}

const getPrimaryPhoto = (maid: MaidProfile) =>
  Array.isArray(maid.photoDataUrls) && maid.photoDataUrls.length > 0 ? maid.photoDataUrls[0] : maid.photoDataUrl || "";

const getPublicIntro = (maid: MaidProfile) => String((maid.introduction as Record<string, unknown>)?.publicIntro || "").trim();

const getExperienceBucket = (maid: MaidProfile) => {
  const count = Array.isArray(maid.employmentHistory) ? maid.employmentHistory.length : 0;
  if (count >= 5) return "5+ Years";
  if (count >= 3) return "3-5 Years";
  if (count >= 1) return "1-2 Years";
  return "No Experience";
};

const getDisplayStatus = (status: string) => {
  if (status === "direct_hire" || status === "accepted") {
    return { label: "Accepted", className: "border-emerald-200 bg-emerald-100 text-emerald-700" };
  }
  if (status === "reject" || status === "rejected" || status === "declined") {
    return { label: "Declined", className: "border-rose-200 bg-rose-100 text-rose-700" };
  }

  return { label: "Pending", className: "border-amber-200 bg-amber-100 text-amber-700" };
};

const getAgencyName = (maid: MaidProfile, company: CompanyProfileApi | null) => {
  const agencyContact = maid.agencyContact as Record<string, unknown>;
  return String(agencyContact.companyName || company?.company_name || company?.short_name || "Agency");
};

const navItems = [
  { label: "Dashboard", href: "/client/dashboard", icon: Home },
  { label: "Maids", href: "/client/maids", icon: Users },
  { label: "Agencies", href: "/agencies", icon: Building2 },
  { label: "Requests", href: "/client/dashboard#requests", icon: BriefcaseBusiness },
  { label: "Messages", href: "/client/support-chat", icon: MessageCircle },
  { label: "Profile", href: "/client/profile", icon: UserRound },
  { label: "History", href: "/client/history", icon: Clock3 },
];

const ClientDashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [client, setClient] = useState<ClientUser | null>(getStoredClient());
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [allPublicMaids, setAllPublicMaids] = useState<MaidProfile[]>([]);
  const [agencies, setAgencies] = useState<AgencySummary[]>([]);
  const [company, setCompany] = useState<CompanyProfileApi | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [actioningId, setActioningId] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [nationality, setNationality] = useState("All Nationalities");
  const [maidType, setMaidType] = useState("All Types");

  useEffect(() => {
    const token = getClientToken();
    if (!token) {
      navigate("/employer-login");
      return;
    }

    const loadDashboard = async () => {
      try {
        setIsLoading(true);
        const [meResponse, maidsResponse, publicMaidsResponse, companyResponse] = await Promise.all([
          fetch("/api/client-auth/me", { headers: { ...getClientAuthHeaders() } }),
          fetch("/api/client/my-maids", { headers: { ...getClientAuthHeaders() } }),
          fetch("/api/maids?visibility=public"),
          fetch("/api/company"),
        ]);

        const meData = (await meResponse.json().catch(() => ({}))) as { error?: string; client?: ClientUser };
        const maidData = (await maidsResponse.json().catch(() => ({}))) as { error?: string; assignments?: Assignment[] };
        const publicData = (await publicMaidsResponse.json().catch(() => ({}))) as { error?: string; maids?: MaidProfile[] };
        const companyData = (await companyResponse.json().catch(() => ({}))) as CompanyResponse;

        if (!meResponse.ok || !meData.client) {
          throw new Error(meData.error || "Failed to load client session");
        }

        if (!maidsResponse.ok || !maidData.assignments) {
          throw new Error(maidData.error || "Failed to load assigned maids");
        }

        if (!publicMaidsResponse.ok || !publicData.maids) {
          throw new Error(publicData.error || "Failed to load public maids");
        }

        setClient(meData.client);
        setAssignments(maidData.assignments);
        setAllPublicMaids(publicData.maids.filter((maid) => maid.isPublic));
        setCompany(companyData.companyProfile ?? null);
        try {
          setAgencies(await fetchAgencies());
        } catch {
          setAgencies([]);
        }
      } catch (error) {
        clearClientAuth();
        toast({
          title: "Session Expired",
          description: error instanceof Error ? error.message : "Please sign in again",
          variant: "destructive",
        });
        navigate("/employer-login");
      } finally {
        setIsLoading(false);
      }
    };

    void loadDashboard();
  }, [navigate, toast]);

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

  const maidTypeOptions = useMemo(() => {
    const values = Array.from(
      new Set(
        allPublicMaids
          .map((maid) => maid.type?.trim())
          .filter((value): value is string => Boolean(value))
      )
    ).sort((left, right) => left.localeCompare(right));

    return ["All Types", ...values];
  }, [allPublicMaids]);

  const filteredPublicMaids = useMemo(() => {
    return allPublicMaids.filter((maid) => {
      const publicIntro = getPublicIntro(maid).toLowerCase();
      const searchText = `${maid.fullName} ${maid.referenceCode} ${maid.nationality} ${maid.type} ${publicIntro}`.toLowerCase();

      const matchesSearch = !search.trim() || searchText.includes(search.trim().toLowerCase());
      const matchesNationality = nationality === "All Nationalities" || maid.nationality === nationality;
      const matchesType = maidType === "All Types" || maid.type === maidType;

      return matchesSearch && matchesNationality && matchesType;
    });
  }, [allPublicMaids, maidType, nationality, search]);

  const updateAssignmentStatus = async (id: number, action: "interested" | "direct-hire" | "reject") => {
    try {
      setActioningId(id);
      const response = await fetch(`/api/client/direct-sales/${id}/${action}`, {
        method: "PATCH",
        headers: { ...getClientAuthHeaders() },
      });
      const data = (await response.json().catch(() => ({}))) as {
        error?: string;
        directSale?: Assignment["directSale"];
        maid?: MaidProfile | null;
      };

      if (!response.ok || !data.directSale || !data.maid) {
        throw new Error(data.error || "Failed to update assigned maid");
      }

      setAssignments((prev) =>
        prev.map((item) =>
          item.directSale.id === id ? { directSale: data.directSale!, maid: data.maid! } : item
        )
      );
      toast({
        title: "Updated",
        description:
          action === "interested"
            ? "Marked as interested."
            : action === "direct-hire"
            ? "Marked as accepted."
            : "Marked as rejected.",
      });
    } catch (error) {
      toast({
        title: "Action Failed",
        description: error instanceof Error ? error.message : "Unable to update status",
        variant: "destructive",
      });
    } finally {
      setActioningId(null);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch("/api/client-auth/logout", {
        method: "POST",
        headers: { ...getClientAuthHeaders() },
      });
    } finally {
      clearClientAuth();
      navigate("/employer-login");
    }
  };

  const interestedCount = assignments.filter((item) => item.directSale.status === "interested").length;
  const directHireCount = assignments.filter((item) => item.directSale.status === "direct_hire").length;
  const pendingCount = assignments.filter(
    (item) => !["direct_hire", "accepted", "reject", "rejected", "declined"].includes(item.directSale.status),
  ).length;
  const featuredMaids = filteredPublicMaids.slice(0, 8);

  return (
    <div className="client-page-theme min-h-screen bg-[linear-gradient(180deg,hsl(var(--background))_0%,hsl(var(--muted))_100%)]">
      <header className="sticky top-0 z-30 border-b bg-card/95 backdrop-blur">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-6">
            <div>
              <Link to="/" className="font-display text-xl font-bold text-foreground">
                "Find Maids" At The Agency
              </Link>
            </div>
            <nav className="hidden items-center gap-6 font-body text-sm font-medium md:flex">
              {navItems.map((item) => (
                <Link key={item.label} to={item.href} className="transition-colors hover:text-primary">
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" className="rounded-2xl">
              <Bell className="h-5 w-5" />
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-3 rounded-full border bg-background px-2 py-1 pr-3 transition hover:border-primary/40">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={client?.profileImageUrl} alt={client?.name || "Client"} />
                    <AvatarFallback className="bg-primary/10 text-primary">
                      {(client?.name || "C").slice(0, 1).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="hidden text-left md:block">
                    <p className="text-sm font-semibold text-foreground">{client?.name || "Client"}</p>
                    <p className="text-xs text-muted-foreground">{client?.email || ""}</p>
                  </div>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>My Account</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link to="/client/profile">
                    <UserRound className="mr-2 h-4 w-4" />
                    Profile
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/client/history">History</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/client/support-chat">
                    <MessageCircle className="mr-2 h-4 w-4" />
                    Messages
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/client/profile">
                    <Settings className="mr-2 h-4 w-4" />
                    Settings
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => void handleLogout()}>
                  <LogOut className="mr-2 h-4 w-4" />
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 md:py-8">
        <div className="mb-8 overflow-hidden rounded-[28px] border bg-card shadow-sm">
          <div className="flex flex-col gap-5 bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.18),transparent_40%),linear-gradient(135deg,rgba(255,255,255,0.96),rgba(245,247,243,0.94))] p-5 sm:p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground">
                  <ArrowLeft className="h-4 w-4" /> Back to Home
                </Link>
                <p className="mt-4 inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-primary">
                  <Sparkles className="h-3.5 w-3.5" /> Request Center
                </p>
                <h2 className="mt-3 font-display text-3xl font-bold text-foreground sm:text-4xl">Review agency suggestions with a cleaner flow.</h2>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
                  Requests stay front and center here, while maid discovery, agency browsing, and chat remain close by.
                </p>
              </div>
              <div className="min-w-[220px] rounded-[24px] border bg-background/80 p-4 shadow-sm">
                <p className="font-semibold text-foreground">{client?.name || "Client"}</p>
                <p className="text-sm text-muted-foreground">{client?.email || ""}</p>
                {client?.company ? <p className="text-sm text-muted-foreground">{client.company}</p> : null}
                <div className="mt-4 flex flex-col gap-2">
                  <Button asChild className="w-full rounded-2xl">
                    <Link to="/client/support-chat">
                      <MessageCircle className="mr-2 h-4 w-4" /> Messages
                    </Link>
                  </Button>
                  <Button asChild variant="outline" className="w-full rounded-2xl">
                    <Link to="/client/profile">Profile</Link>
                  </Button>
                  <Button asChild variant="outline" className="w-full rounded-2xl">
                    <Link to="/client/history">History</Link>
                  </Button>
                  <Button variant="outline" onClick={() => void handleLogout()} className="w-full rounded-2xl">
                    <LogOut className="mr-2 h-4 w-4" /> Logout
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <section className="mb-8 grid gap-3 sm:grid-cols-3">
          <Card className="rounded-[24px] border bg-card shadow-sm">
            <CardContent className="p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Pending Requests</p>
              <p className="mt-2 font-display text-3xl font-bold text-foreground">{pendingCount}</p>
            </CardContent>
          </Card>
          <Card className="rounded-[24px] border bg-card shadow-sm">
            <CardContent className="p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Accepted</p>
              <p className="mt-2 font-display text-3xl font-bold text-foreground">{directHireCount}</p>
            </CardContent>
          </Card>
          <Card className="rounded-[24px] border bg-card shadow-sm">
            <CardContent className="p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Interested</p>
              <p className="mt-2 font-display text-3xl font-bold text-foreground">{interestedCount}</p>
            </CardContent>
          </Card>
        </section>

        <section id="best-maids" className="mb-8">
          <div className="rounded-[28px] border bg-card p-5 shadow-sm sm:p-6">
            
            <div className="mb-5">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
                Best Maids
              </p>

              <div className="mt-2 flex items-center gap-2">
                <Search className="h-5 w-5 text-primary" />
                <h2 className="font-display text-2xl font-bold text-foreground">
                  Quick public maid shortlist
                </h2>
              </div>

              <p className="mt-2 text-sm text-muted-foreground">
                Filter once, then browse a cleaner set of public maid cards.
              </p>
            </div>

            <div className="mb-5 grid gap-3 md:grid-cols-3">
              <div className="flex items-center gap-3 rounded-[22px] border bg-background px-4 py-3 md:col-span-3">
                <Search className="h-4 w-4 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  className="h-auto border-0 bg-transparent p-0 shadow-none focus-visible:ring-0"
                  placeholder="Search name, code, type, or introduction" />
              </div>

              <select
                value={nationality}
                onChange={(event) => setNationality(event.target.value)}
                className="h-12 w-full rounded-[18px] border bg-background px-3 text-sm text-foreground"
              >
                {nationalityOptions.map((option) => (
                  <option key={option}>{option}</option>
                ))}
              </select>

              <select
                value={maidType}
                onChange={(event) => setMaidType(event.target.value)}
                className="h-12 w-full rounded-[18px] border bg-background px-3 text-sm text-foreground" >
                {maidTypeOptions.map((option) => (
                  <option key={option}>{option}</option>
                ))}
              </select>
            </div>

            <p className="mb-5 text-sm text-muted-foreground">
              {isLoading
                ? "Loading public maid profiles..."
                : `${filteredPublicMaids.length} public maids matched your dashboard search.`}
            </p>

            <div
              id="discover-maids"
              className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4"
            >
              {isLoading ? (
                <div className="col-span-full rounded-[24px] border bg-muted/40 p-8 text-center text-muted-foreground">
                  Loading public maid profiles...
                </div>
              ) : featuredMaids.length === 0 ? (
                <div className="col-span-full rounded-[24px] border bg-muted/40 p-8 text-center">
                  <p className="font-display text-lg font-semibold text-foreground">
                    No matching public maids found
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Try a broader search or another filter.
                  </p>
                </div>
              ) : (
                featuredMaids.map((maid) => {
                  const age = calculateAge(maid.dateOfBirth);
                  const photo = getPrimaryPhoto(maid);
                  const agencyName = getAgencyName(maid, company);

                  return (
                    <article
                      key={maid.referenceCode}
                      className="flex flex-col overflow-hidden rounded-xl border bg-background shadow-sm hover:shadow-md transition" >
                      <div className="h-36 w-full bg-muted overflow-hidden">
                        {photo ? (
                          <img
                            src={photo}
                            alt={maid.fullName}
                            className="h-full w-full object-cover" />
                        ) : (
                          <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
                            No photo
                          </div>
                        )}
                      </div>

                      <div className="p-3 flex flex-col gap-2 text-xs">
                        
                        <div>
                          <h3 className="text-sm font-semibold text-foreground line-clamp-1">
                            {maid.fullName}
                          </h3>
                          <p className="text-[10px] text-muted-foreground">
                            {maid.referenceCode}
                          </p>
                        </div>

                        <div className="flex flex-wrap gap-1">
                          <span className="px-2 py-[2px] text-[10px] rounded-full bg-muted">
                            {getExperienceBucket(maid)}
                          </span>
                          <span className="px-2 py-[2px] text-[10px] rounded-full border">
                            Age {age ?? "N/A"}
                          </span>
                        </div>

                        <p className="text-[11px] text-muted-foreground">
                          {maid.nationality || "N/A"} • {maid.type || "N/A"}
                        </p>

                        <p className="text-[11px] text-muted-foreground line-clamp-2">
                          {getPublicIntro(maid) || "No intro yet"}
                        </p>

                        <div className="flex gap-1 mt-auto">
                          <Button size="sm" className="flex-1 h-7 text-xs rounded-md" asChild>
                            <Link to={`/maids/${encodeURIComponent(maid.referenceCode)}`}>
                              View
                            </Link>
                          </Button>

                          <Button
                            variant="outline"
                            size="sm"
                            className="flex-1 h-7 text-xs rounded-md"
                            asChild >
                            <Link
                              to={`/client/support-chat?type=agency&agencyId=1&agencyName=${encodeURIComponent(
                                agencyName
                              )}`}
                            >
                              Msg
                            </Link>
                          </Button>
                        </div>
                      </div>
                    </article>
                  );
                })
              )}
            </div>
          </div>

          <div className="grid gap-6">
            <section className="rounded-2xl border bg-card p-6 shadow-sm">
              <div className="mb-4 flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-primary" />
                <h2 className="font-display text-2xl font-bold text-foreground">Hiring Journey</h2>
              </div>
              <div className="space-y-4 font-body text-sm text-muted-foreground">
                <div className="rounded-2xl bg-muted/40 p-4">
                  <p className="font-semibold text-foreground">1. Explore profiles</p>
                  <p className="mt-1">Review public maid profiles and note the ones that match your household needs.</p>
                </div>
                <div className="rounded-2xl bg-muted/40 p-4">
                  <p className="font-semibold text-foreground">2. Track assigned maids</p>
                  <p className="mt-1">Assigned maids from the agency will appear below so you can decide quickly.</p>
                </div>
                <div className="rounded-2xl bg-muted/40 p-4">
                  <p className="font-semibold text-foreground">3. Update your decision</p>
                  <p className="mt-1">Use Interested, Direct Hire, or Reject so the agency can continue the next step for you.</p>
                </div>
              </div>
            </section>

            <section className="rounded-2xl border bg-card p-6 shadow-sm">
              <div className="mb-4 flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                <h2 className="font-display text-2xl font-bold text-foreground">Agency Support</h2>
              </div>
              <div className="space-y-3 font-body text-sm text-foreground">
                <p className="flex items-center gap-2"><BriefcaseBusiness className="h-4 w-4 text-primary" /> {company?.company_name || company?.short_name || "Agency"}</p>
                <p className="flex items-center gap-2"><Phone className="h-4 w-4 text-primary" /> {company?.contact_phone || "N/A"}</p>
                <p className="flex items-center gap-2"><Mail className="h-4 w-4 text-primary" /> {company?.contact_email || "N/A"}</p>
                <p className="font-body text-sm text-muted-foreground">{company?.office_hours_regular || "Office hours will be updated soon."}</p>
                <p className="font-body text-sm leading-6 text-muted-foreground">{company?.about_us || "The agency will assist with matching, shortlisting, and follow-up support."}</p>
                <Button variant="outline" asChild>
                  <Link to="/client/support-chat">
                    <MessageCircle className="mr-2 h-4 w-4" /> Open Support Chat
                  </Link>
                </Button>
              </div>
            </section>
          </div>
        </section>

        <section className="mb-8">
          <div className="mb-4">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Agencies</p>
            <h2 className="mt-2 font-display text-2xl font-bold text-foreground">Browse agencies in the same flow</h2>
            <p className="mt-1 text-sm text-muted-foreground">Review agencies, then continue into details or messages without leaving the portal.</p>
          </div>

          <div className="flex snap-x gap-4 overflow-x-auto pb-2">
            {agencies.length === 0 ? (
              <Card className="w-full rounded-[24px] border bg-card shadow-sm">
                <CardContent className="p-8 text-center text-muted-foreground">No agencies available right now.</CardContent>
              </Card>
            ) : (
              agencies.map((agency) => (
                <Card key={agency.id} className="min-w-[300px] max-w-[300px] snap-start rounded-[24px] border bg-card shadow-sm">
                  <CardContent className="flex h-full flex-col gap-4 p-5">
                    <div className="flex items-start gap-4">
                      {agency.logoUrl ? (
                        <img src={agency.logoUrl} alt={agency.name} className="h-16 w-16 rounded-[20px] object-cover" />
                      ) : (
                        <div className="flex h-16 w-16 items-center justify-center rounded-[20px] bg-muted text-lg font-bold">
                          {agency.shortName.slice(0, 2).toUpperCase()}
                        </div>
                      )}
                      <div className="min-w-0">
                        <h3 className="font-display text-xl font-semibold text-foreground">{agency.name}</h3>
                        <p className="mt-1 text-sm text-muted-foreground">{agency.location}</p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="secondary" className="rounded-full">{agency.rating.toFixed(1)} rating</Badge>
                      <Badge variant="outline" className="rounded-full">{agency.availableMaidsCount} available</Badge>
                    </div>
                    <p className="line-clamp-3 text-sm leading-6 text-muted-foreground">{agency.about || "Agency overview will be updated soon."}</p>
                    <div className="mt-auto flex flex-col gap-2">
                      <Button asChild className="w-full rounded-2xl">
                        <Link to={`/agencies/${agency.id}`}>View Agency</Link>
                      </Button>
                      <Button variant="outline" asChild className="w-full rounded-2xl">
                        <Link to={`/client/support-chat?type=agency&agencyId=${agency.id}&agencyName=${encodeURIComponent(agency.name)}`}>Message</Link>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </section>

        <section id="requests" className="rounded-[28px] border bg-card p-5 shadow-sm sm:p-6">
          <div className="mb-6 flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Requests</p>
              <h2 className="mt-2 font-display text-2xl font-bold text-foreground sm:text-3xl">Agency-submitted maid suggestions</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                This is the main request area. Review each maid suggestion and respond quickly.
              </p>
            </div>
          </div>

          {isLoading ? (
            <div className="rounded-2xl border bg-muted/40 p-8 text-center font-body text-muted-foreground">
              Loading your assigned maids...
            </div>
          ) : assignments.length === 0 ? (
            <div className="rounded-2xl border bg-muted/40 p-10 text-center">
              <h3 className="font-display text-2xl font-semibold text-foreground">No assigned maids yet</h3>
              <p className="mt-2 font-body text-muted-foreground">
                The agency will assign maid profiles to your account, and they will appear here once shared with you.
              </p>
            </div>
          ) : (
            <div className="grid gap-6">
              {assignments.map(({ directSale, maid }) => {
                const age = calculateAge(maid.dateOfBirth);
                const photo = getPrimaryPhoto(maid);
                const agencyContact = maid.agencyContact as Record<string, unknown>;

                return (
                  <article key={directSale.id} className="rounded-[24px] border bg-muted/15 p-5 transition hover:shadow-sm sm:p-6">
                    <div className="grid gap-6 lg:grid-cols-[180px_1fr]">
                      <div className="overflow-hidden rounded-2xl border bg-muted">
                        {photo ? (
                          <img src={photo} alt={maid.fullName} className="h-full min-h-[220px] w-full object-cover" />
                        ) : (
                          <div className="flex min-h-[220px] items-center justify-center px-4 text-center font-body text-sm text-muted-foreground">
                            No photo available
                          </div>
                        )}
                      </div>

                      <div>
                        <div className="mb-4 flex flex-wrap items-start justify-between gap-4">
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">{getAgencyName(maid, company)}</p>
                            <h3 className="font-display text-2xl font-bold text-foreground">{maid.fullName}</h3>
                            <p className="mt-1 font-body text-xs uppercase tracking-wide text-muted-foreground">{maid.referenceCode}</p>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <span className="rounded-full bg-accent px-2.5 py-1 font-body text-xs font-medium text-accent-foreground">
                              {maid.nationality || "N/A"}
                            </span>
                            <span className="rounded-full bg-secondary/20 px-2.5 py-1 font-body text-xs font-medium text-foreground">
                              {maid.type || "N/A"}
                            </span>
                            {(() => {
                              const status = getDisplayStatus(directSale.status);
                              return (
                                <span className={`rounded-full border px-2.5 py-1 text-xs font-medium ${status.className}`}>
                                  {status.label}
                                </span>
                              );
                            })()}
                          </div>
                        </div>

                        <div className="grid gap-3 font-body text-sm text-foreground sm:grid-cols-2 xl:grid-cols-4">
                          <p><span className="text-muted-foreground">Age:</span> {age ?? "N/A"}</p>
                          <p><span className="text-muted-foreground">Education:</span> {maid.educationLevel || "N/A"}</p>
                          <p><span className="text-muted-foreground">Maid Status:</span> {maid.status || "available"}</p>
                          <p><span className="text-muted-foreground">Assigned On:</span> {new Date(directSale.createdAt).toLocaleDateString()}</p>
                        </div>

                        <div className="mt-4 rounded-[20px] bg-background p-4">
                          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Agency Message</p>
                          <p className="mt-2 text-sm leading-6 text-muted-foreground">
                            {String(agencyContact.message || "").trim() || getPublicIntro(maid) || "No additional message was included with this request."}
                          </p>
                        </div>

                        <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                          <Button
                            className="h-12 w-full rounded-2xl sm:flex-1"
                            disabled={actioningId === directSale.id}
                            onClick={() => void updateAssignmentStatus(directSale.id, "direct-hire")}
                          >
                            Accept
                          </Button>
                          <Button
                            variant="destructive"
                            className="h-12 w-full rounded-2xl sm:flex-1"
                            disabled={actioningId === directSale.id}
                            onClick={() => void updateAssignmentStatus(directSale.id, "reject")}
                          >
                            Decline
                          </Button>
                          <Button variant="outline" className="h-12 w-full rounded-2xl sm:flex-1" asChild>
                            <Link to={`/client/support-chat?type=agency&agencyId=1&agencyName=${encodeURIComponent(getAgencyName(maid, company))}`}>Message</Link>
                          </Button>
                        </div>

                        <div className="mt-3 flex flex-col gap-3 sm:flex-row">
                          <Button
                            variant="outline"
                            className="w-full rounded-2xl sm:flex-1"
                            disabled={actioningId === directSale.id}
                            onClick={() => void updateAssignmentStatus(directSale.id, "interested")}
                          >
                            Mark Interested
                          </Button>
                          <Button variant="ghost" className="w-full rounded-2xl sm:flex-1" asChild>
                            <Link to={`/maids/${encodeURIComponent(maid.referenceCode)}`}>View Details</Link>
                          </Button>
                        </div>

                        <div className="mt-6 grid gap-3 rounded-2xl border bg-card p-4 font-body text-sm text-foreground md:grid-cols-3">
                          <p className="flex items-center gap-2"><BriefcaseBusiness className="h-4 w-4 text-primary" /> {getAgencyName(maid, company)}</p>
                          <p className="flex items-center gap-2"><Phone className="h-4 w-4 text-primary" /> {String(agencyContact.phone || company?.contact_phone || "N/A")}</p>
                          <p className="flex items-center gap-2"><Mail className="h-4 w-4 text-primary" /> {String(agencyContact.contactEmail || agencyContact.email || company?.contact_email || "N/A")}</p>
                        </div>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </div>

      <Button asChild className="fixed bottom-5 right-5 h-14 rounded-full px-5 shadow-lg">
        <Link to="/client/support-chat">
          <MessageCircle className="mr-2 h-5 w-5" />
          Chat
        </Link>
      </Button>

    </div>
  );
};

export default ClientDashboard;
