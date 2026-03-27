import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Phone, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/components/ui/sonner";
import { calculateAge, getExperienceBucket, getPrimaryPhoto, getPublicIntro, type MaidProfile } from "@/lib/maids";
import { fetchAgencyDetails, fetchAgencyMaids, type AgencySummary, type CompanyProfileApi } from "@/lib/agencies";
import { getClientToken } from "@/lib/clientAuth";
import "../ClientPage/ClientTheme.css";

const AgencyDetailsPage = () => {
  const { id } = useParams<{ id: string }>();
  const agencyId = Number(id);
  const [agency, setAgency] = useState<AgencySummary | null>(null);
  const [company, setCompany] = useState<CompanyProfileApi | null>(null);
  const [maids, setMaids] = useState<MaidProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [keyword, setKeyword] = useState("");
  const [nationality, setNationality] = useState("All Nationalities");
  const [maidType, setMaidType] = useState("All Types");
  const isLoggedIn = Boolean(getClientToken());

  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        const [{ agency: agencyData, company: companyData }, maidsData] = await Promise.all([
          fetchAgencyDetails(agencyId),
          fetchAgencyMaids(agencyId),
        ]);
        setAgency(agencyData);
        setCompany(companyData);
        setMaids(maidsData);
      } catch {
        toast.error("Failed to load agency details");
      } finally {
        setIsLoading(false);
      }
    };

    if (!Number.isFinite(agencyId)) {
      toast.error("Agency not found");
      return;
    }

    void loadData();
  }, [agencyId]);

  const filteredMaids = useMemo(() => {
    const term = keyword.trim().toLowerCase();

    return maids.filter((maid) => {
      const matchesKeyword =
        !term ||
        [maid.fullName, maid.referenceCode, maid.nationality, maid.type, getPublicIntro(maid)]
          .join(" ")
          .toLowerCase()
          .includes(term);
      const matchesNationality = nationality === "All Nationalities" || maid.nationality === nationality;
      const matchesType = maidType === "All Types" || maid.type === maidType;

      return matchesKeyword && matchesNationality && matchesType;
    });
  }, [keyword, maidType, maids, nationality]);

  const nationalityOptions = useMemo(
    () => ["All Nationalities", ...Array.from(new Set(maids.map((maid) => maid.nationality).filter(Boolean))).sort()],
    [maids],
  );

  const typeOptions = useMemo(
    () => ["All Types", ...Array.from(new Set(maids.map((maid) => maid.type).filter(Boolean))).sort()],
    [maids],
  );

  if (isLoading) {
    return (
      <div className="client-page-theme min-h-screen">
        <div className="container py-16 text-center">Loading agency...</div>
      </div>
    );
  }

  if (!agency) {
    return (
      <div className="client-page-theme min-h-screen">
        <div className="container py-16 text-center">Agency not found</div>
      </div>
    );
  }

  return (
    <div className="client-page-theme min-h-screen">
      <div className="container py-12">
        <Link to="/agencies" className="mb-8 inline-flex items-center gap-2 font-body text-sm text-primary hover:underline">
          <ArrowLeft className="h-4 w-4" />
          All Agencies
        </Link>

        <section className="mb-10 grid gap-6 xl:grid-cols-[1fr_1.2fr]">
          <Card className="overflow-hidden">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                {agency.logoUrl ? (
                  <img src={agency.logoUrl} alt={agency.name} className="h-20 w-20 rounded-2xl object-cover" />
                ) : (
                  <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-muted text-xl font-bold">
                    {agency.shortName.slice(0, 2).toUpperCase()}
                  </div>
                )}
                <div>
                  <h1 className="font-display text-3xl font-bold">{agency.name}</h1>
                  <p className="mt-1 text-sm text-muted-foreground">License: {agency.licenseNo}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Badge variant="secondary">{agency.publicMaidsCount} public maids</Badge>
                    <Badge variant="outline">{agency.availableMaidsCount} available now</Badge>
                  </div>
                </div>
              </div>

              <div className="mt-6 space-y-2 text-sm text-foreground">
                <p>
                  <span className="text-muted-foreground">Location:</span> {agency.location}
                </p>
                <p>
                  <span className="text-muted-foreground">Contact Person:</span> {agency.contactPerson}
                </p>
                <p>
                  <span className="text-muted-foreground">Phone:</span> {agency.contactPhone}
                </p>
                <p>
                  <span className="text-muted-foreground">Email:</span> {agency.contactEmail}
                </p>
                <p>
                  <span className="text-muted-foreground">Website:</span> {agency.website || "N/A"}
                </p>
                <p>
                  <span className="text-muted-foreground">Office Hours:</span> {company?.office_hours_regular || "N/A"}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="overflow-hidden">
            <CardHeader>
              <CardTitle>Agency Overview</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 p-6 pt-0">
              <p className="whitespace-pre-wrap text-sm leading-6 text-muted-foreground">
                {company?.about_us || agency.about || "Agency profile details will be updated soon."}
              </p>
              {agency.featuredSkills.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {agency.featuredSkills.map((item) => (
                    <Badge key={item} variant="outline">
                      {item}
                    </Badge>
                  ))}
                </div>
              ) : null}
              <div className="rounded-2xl border bg-muted/20 p-4 text-sm text-muted-foreground">
                Maids are grouped under this agency so clients can browse, compare, and move into the Accept flow without switching between unrelated screens.
              </div>
              <Button asChild variant="outline">
                <Link to={`/client/support-chat?type=agency&agencyId=${agency.id}&agencyName=${encodeURIComponent(agency.name)}`}>
                  Chat with {agency.name}
                </Link>
              </Button>
            </CardContent>
          </Card>
        </section>

        {!isLoggedIn ? (
          <div className="mb-6 rounded-2xl border bg-card p-5">
            <p className="font-display text-xl font-semibold text-foreground">Login Required</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Maid photos, biodata, search, and action buttons are hidden until employer login.
            </p>
            <div className="mt-4">
              <Button asChild>
                <Link to="/employer-login">Employer Login</Link>
              </Button>
            </div>
          </div>
        ) : null}

        <section className={`mb-6 grid gap-3 md:grid-cols-3 ${!isLoggedIn ? "opacity-50" : ""}`}>
          <div className="flex items-center gap-2 rounded-lg border bg-background px-3 py-2 md:col-span-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
              disabled={!isLoggedIn}
              placeholder="Search maid name, code, nationality, or skills"
              className="h-auto border-none bg-transparent p-0 shadow-none"
            />
          </div>
          <div className="flex gap-3">
            <Select value={nationality} onValueChange={setNationality}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {nationalityOptions.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={maidType} onValueChange={setMaidType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {typeOptions.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </section>

        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="font-display text-2xl font-bold">Available Maids</h2>
          <p className="text-sm text-muted-foreground">
            {isLoggedIn ? `${filteredMaids.length} profiles shown` : "Login to unlock maid profiles"}
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {filteredMaids.map((maid) => {
              const age = calculateAge(maid.dateOfBirth);
              const photo = getPrimaryPhoto(maid);
              const isAvailable = !maid.status || maid.status === "available";

              return (
                <Card
                  key={maid.referenceCode}
                  className="overflow-hidden rounded-xl border bg-card shadow-sm hover:shadow-md transition flex flex-col w-full max-w-[260px] h-[500px]" >
                  <div className={`overflow-hidden ${!isLoggedIn ? "blur-md" : ""}`}>
                    {photo ? (
                      <img
                        src={photo}
                        alt={maid.fullName}
                        className="h-44 w-full object-cover rounded-t-xl" />
                    ) : (
                      <div className="flex h-44 items-center justify-center text-sm text-muted-foreground bg-muted rounded-t-xl">
                        No photo available
                      </div>
                    )}
                  </div>

                  <div className={`p-4 flex flex-col flex-1 ${!isLoggedIn ? "select-none blur-sm" : ""}`}>
                    <CardTitle className="text-lg font-semibold text-foreground mb-1">
                      {maid.fullName}
                    </CardTitle>
                    <p className="text-xs uppercase tracking-wide text-muted-foreground mb-3">
                      {maid.referenceCode}
                    </p>

                    <div className="flex flex-wrap gap-2 mb-4">
                      <Badge>{maid.nationality || "N/A"}</Badge>
                      <Badge variant="secondary">{maid.type || "N/A"}</Badge>
                      <Badge variant={isAvailable ? "outline" : "secondary"}>
                        {isAvailable ? "Available" : maid.status}
                      </Badge>
                    </div>

                    <div className="mb-2 space-y-1 text-sm text-foreground">
                      <p>
                        <span className="font-medium">Age:</span> {age ?? "N/A"}
                      </p>
                      <p>
                        <span className="font-medium">Experience:</span> {getExperienceBucket(maid)}
                      </p>
                    </div>

                    <p className="mb-4 line-clamp-3 text-sm text-muted-foreground">
                      {getPublicIntro(maid) || "Profile introduction coming soon."}
                    </p>

                    {isLoggedIn ? (
                      <div className="flex gap-2 mt-auto">
                        <Button asChild className="flex-1">
                          <Link to={`/maids/${encodeURIComponent(maid.referenceCode)}`}>View Profile</Link>
                        </Button>
                        <Button asChild variant="outline" className="flex-1">
                          <Link to={`/maids/${encodeURIComponent(maid.referenceCode)}`}>Accept</Link>
                        </Button>
                      </div>
                    ) : (
                      <Button asChild className="w-full mt-auto">
                        <Link to="/employer-login">Login to View</Link>
                      </Button>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>

        {filteredMaids.length === 0 ? (
          <Card>
            <CardContent className="p-10 text-center">
              <Phone className="mx-auto mb-4 h-10 w-10 text-muted-foreground" />
              <p className="text-muted-foreground">No maids matched the current filters for this agency.</p>
            </CardContent>
          </Card>
        ) : null}
      </div>
    </div>
  );
};

export default AgencyDetailsPage;
