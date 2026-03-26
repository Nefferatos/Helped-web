import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, BriefcaseBusiness, CheckCircle2, LogOut, Mail, MessageCircle, Phone, Search, Sparkles, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { calculateAge, MaidProfile } from "@/lib/maids";
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

const ClientDashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [client, setClient] = useState<ClientUser | null>(getStoredClient());
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [allPublicMaids, setAllPublicMaids] = useState<MaidProfile[]>([]);
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
  const agencyCount = assignments.length - directHireCount;

  return (
    <div className="client-page-theme min-h-screen bg-muted">
      <div className="container py-8 md:py-12">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <Link to="/" className="mb-3 inline-flex items-center gap-2 font-body text-sm text-muted-foreground transition-colors hover:text-foreground">
              <ArrowLeft className="h-4 w-4" /> Back to Home
            </Link>
            <h1 className="font-display text-3xl font-bold text-foreground">Client Dashboard</h1>
            <p className="mt-2 font-body text-sm text-muted-foreground">
              {client ? `Welcome, ${client.name}. Review your assigned maids and discover more public profiles.` : "Loading your account..."}
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <div className="rounded-2xl border bg-card px-4 py-3 text-sm text-foreground shadow-sm">
              <p className="font-semibold">{client?.name || "Client"}</p>
              <p className="text-muted-foreground">{client?.email || ""}</p>
              {client?.company ? <p className="text-muted-foreground">{client.company}</p> : null}
            </div>
            <Button variant="outline" onClick={() => void handleLogout()}>
              <LogOut className="mr-2 h-4 w-4" /> Logout
            </Button>
            <Button variant="outline" asChild>
              <Link to="/client/support-chat">
                <MessageCircle className="mr-2 h-4 w-4" /> Chat Support
              </Link>
            </Button>
          </div>
        </div>

        <section className="mb-8 grid gap-4 lg:grid-cols-[1.3fr_0.9fr]">
          <div className="rounded-3xl border bg-card p-6 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="mb-2 inline-flex items-center gap-2 rounded-full bg-accent px-3 py-1 font-body text-xs font-semibold uppercase tracking-wide text-accent-foreground">
                  <Sparkles className="h-3.5 w-3.5" /> Personal Hiring Space
                </p>
                <h2 className="font-display text-3xl font-bold text-foreground">Plan your next helper search with confidence</h2>
                <p className="mt-3 max-w-2xl font-body text-sm leading-6 text-muted-foreground">
                  Use this dashboard to compare assigned maids, explore more public profiles, and keep your hiring conversation with the agency moving smoothly.
                </p>
              </div>
              <Button asChild>
                <a href="#discover-maids">Browse Public Maids</a>
              </Button>
            </div>
          </div>

            <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-1">
              <div className="rounded-2xl border bg-card p-4 shadow-sm">
                <p className="font-body text-xs uppercase tracking-wide text-muted-foreground">Assigned to You</p>
                <p className="mt-2 font-display text-3xl font-bold text-foreground">{assignments.length}</p>
              </div>
              <div className="rounded-2xl border bg-card p-4 shadow-sm">
                <p className="font-body text-xs uppercase tracking-wide text-muted-foreground">Through Agency</p>
                <p className="mt-2 font-display text-3xl font-bold text-foreground">{agencyCount}</p>
              </div>
              <div className="rounded-2xl border bg-card p-4 shadow-sm">
                <p className="font-body text-xs uppercase tracking-wide text-muted-foreground">Interested</p>
                <p className="mt-2 font-display text-3xl font-bold text-foreground">{interestedCount}</p>
              </div>
              <div className="rounded-2xl border bg-card p-4 shadow-sm">
                <p className="font-body text-xs uppercase tracking-wide text-muted-foreground">Accepted</p>
                <p className="mt-2 font-display text-3xl font-bold text-foreground">{directHireCount}</p>
              </div>
            </div>
        </section>

        <section className="mb-8 grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-2xl border bg-card p-6 shadow-sm">
            <div className="mb-5 flex items-center gap-2">
              <Search className="h-5 w-5 text-primary" />
              <h2 className="font-display text-2xl font-bold text-foreground">Discover Public Maids</h2>
            </div>
            <div className="mb-5 grid gap-3 md:grid-cols-3">
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="w-full rounded-lg border bg-background px-3 py-2.5 font-body text-sm text-foreground"
                placeholder="Search name, code, type"
              />
              <select
                value={nationality}
                onChange={(event) => setNationality(event.target.value)}
                className="w-full rounded-lg border bg-background px-3 py-2.5 font-body text-sm text-foreground"
              >
                {nationalityOptions.map((option) => (
                  <option key={option}>{option}</option>
                ))}
              </select>
              <select
                value={maidType}
                onChange={(event) => setMaidType(event.target.value)}
                className="w-full rounded-lg border bg-background px-3 py-2.5 font-body text-sm text-foreground"
              >
                {maidTypeOptions.map((option) => (
                  <option key={option}>{option}</option>
                ))}
              </select>
            </div>
            <p className="mb-5 font-body text-sm text-muted-foreground">
              {isLoading ? "Loading public maid profiles..." : `${filteredPublicMaids.length} public maids matched your dashboard search.`}
            </p>

            <div id="discover-maids" className="grid gap-4 md:grid-cols-2">
              {isLoading ? (
                <div className="md:col-span-2 rounded-2xl border bg-muted/40 p-8 text-center font-body text-muted-foreground">
                  Loading public maid profiles...
                </div>
              ) : filteredPublicMaids.length === 0 ? (
                <div className="md:col-span-2 rounded-2xl border bg-muted/40 p-8 text-center">
                  <p className="font-display text-xl font-semibold text-foreground">No matching public maids found</p>
                  <p className="mt-2 font-body text-sm text-muted-foreground">Try a broader search or another nationality/type filter.</p>
                </div>
              ) : (
                filteredPublicMaids.slice(0, 6).map((maid) => {
                  const age = calculateAge(maid.dateOfBirth);
                  const photo = getPrimaryPhoto(maid);

                  return (
                    <article key={maid.referenceCode} className="overflow-hidden rounded-2xl border bg-muted/20">
                      <div className="grid min-h-[210px] gap-0 sm:grid-cols-[120px_1fr]">
                        <div className="flex items-center justify-center bg-muted">
                          {photo ? (
                            <img src={photo} alt={maid.fullName} className="h-full w-full object-cover" />
                          ) : (
                            <div className="px-3 text-center font-body text-xs text-muted-foreground">No photo</div>
                          )}
                        </div>
                        <div className="p-4">
                          <h3 className="font-display text-xl font-bold text-foreground">{maid.fullName}</h3>
                          <p className="font-body text-xs uppercase tracking-wide text-muted-foreground">{maid.referenceCode}</p>
                          <div className="mt-3 flex flex-wrap gap-2">
                            <span className="rounded-full bg-accent px-2.5 py-1 font-body text-xs font-medium text-accent-foreground">{maid.nationality || "N/A"}</span>
                            <span className="rounded-full bg-secondary/20 px-2.5 py-1 font-body text-xs font-medium text-foreground">{maid.type || "N/A"}</span>
                            <span className="rounded-full bg-muted px-2.5 py-1 font-body text-xs font-medium text-foreground">{getExperienceBucket(maid)}</span>
                          </div>
                          <div className="mt-3 grid grid-cols-2 gap-2 font-body text-sm text-foreground">
                            <p><span className="text-muted-foreground">Age:</span> {age ?? "N/A"}</p>
                            <p><span className="text-muted-foreground">Education:</span> {maid.educationLevel || "N/A"}</p>
                          </div>
                          <p className="mt-3 line-clamp-3 font-body text-sm leading-6 text-muted-foreground">
                            {getPublicIntro(maid) || "Public introduction will be available soon for this profile."}
                          </p>
                          <div className="mt-4">
                            <Button variant="outline" size="sm" asChild>
                              <Link to={`/maids/${encodeURIComponent(maid.referenceCode)}`}>View Profile</Link>
                            </Button>
                          </div>
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

        <section className="rounded-2xl border bg-card p-6 shadow-sm">
          <div className="mb-6 flex items-center justify-between gap-4">
            <div>
              <h2 className="font-display text-2xl font-bold text-foreground">Maids Assigned to You</h2>
              <p className="mt-1 font-body text-sm text-muted-foreground">
                Only the maids assigned to your account appear in this section.
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
                  <article key={directSale.id} className="rounded-2xl border bg-muted/15 p-6">
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
                            <span className="rounded-full bg-muted px-2.5 py-1 font-body text-xs font-medium text-foreground">
                              Assignment: {directSale.status}
                            </span>
                          </div>
                        </div>

                        <div className="grid gap-3 font-body text-sm text-foreground sm:grid-cols-2 xl:grid-cols-4">
                          <p><span className="text-muted-foreground">Age:</span> {age ?? "N/A"}</p>
                          <p><span className="text-muted-foreground">Education:</span> {maid.educationLevel || "N/A"}</p>
                          <p><span className="text-muted-foreground">Maid Status:</span> {maid.status || "available"}</p>
                          <p><span className="text-muted-foreground">Assigned On:</span> {new Date(directSale.createdAt).toLocaleDateString()}</p>
                        </div>

                        <p className="mt-4 font-body text-sm leading-6 text-muted-foreground">
                          {getPublicIntro(maid) || "Public introduction will be available soon for this profile."}
                        </p>

                        <div className="mt-5 flex flex-wrap gap-3">
                          <Button
                            variant="outline"
                            disabled={actioningId === directSale.id}
                            onClick={() => void updateAssignmentStatus(directSale.id, "interested")}
                          >
                            Interested
                          </Button>
                          <Button
                            disabled={actioningId === directSale.id}
                            onClick={() => void updateAssignmentStatus(directSale.id, "direct-hire")}
                          >
                            Accept
                          </Button>
                          <Button
                            variant="destructive"
                            disabled={actioningId === directSale.id}
                            onClick={() => void updateAssignmentStatus(directSale.id, "reject")}
                          >
                            Reject
                          </Button>
                          <Button variant="outline" asChild>
                            <Link to={`/maids/${encodeURIComponent(maid.referenceCode)}`}>View Public Profile</Link>
                          </Button>
                        </div>

                        <div className="mt-6 grid gap-3 rounded-2xl border bg-card p-4 font-body text-sm text-foreground md:grid-cols-3">
                          <p className="flex items-center gap-2"><BriefcaseBusiness className="h-4 w-4 text-primary" /> {String(agencyContact.companyName || company?.company_name || "Agency")}</p>
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
    </div>
  );
};

export default ClientDashboard;
