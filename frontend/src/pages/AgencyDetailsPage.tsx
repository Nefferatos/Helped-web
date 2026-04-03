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
      <div className="container py-8 md:py-12">
        <Link to="/agencies" className="mb-6 inline-flex items-center gap-2 font-body text-sm text-primary hover:underline">
          <ArrowLeft className="h-4 w-4" />
          All Agencies
        </Link>

        <section className="mb-8 space-y-5">
          <Card className="overflow-hidden rounded-3xl">
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
                    <Badge variant="outline">{agency.rating.toFixed(1)} rating</Badge>
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

          <Card className="overflow-hidden rounded-3xl">
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
              <Button asChild variant="outline" className="w-full rounded-2xl sm:w-auto">
                <Link to={`/client/support-chat?type=agency&agencyId=${agency.id}&agencyName=${encodeURIComponent(agency.name)}`}>
                  Message {agency.name}
                </Link>
              </Button>
            </CardContent>
          </Card>
        </section>

        {!isLoggedIn ? (
          <div className="mb-6 rounded-3xl border bg-card p-5">
            <p className="font-display text-xl font-semibold text-foreground">Login Required</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Maid photos, biodata, search, and actions are hidden until employer login.
            </p>
            <div className="mt-4">
              <Button asChild className="w-full rounded-2xl sm:w-auto">
                <Link to="/employer-login">Employer Login</Link>
              </Button>
            </div>
          </div>
        ) : null}

        <section className={`mb-6 grid gap-3 ${!isLoggedIn ? "opacity-50" : ""}`}>
          <div className="flex items-center gap-2 rounded-2xl border bg-background px-3 py-3">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
              disabled={!isLoggedIn}
              placeholder="Search maid name, code, nationality, or skills"
              className="h-auto border-none bg-transparent p-0 shadow-none"
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
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

        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="font-display text-2xl font-bold">Available Maids</h2>
          <p className="text-sm text-muted-foreground">
            {isLoggedIn ? `${filteredMaids.length} profiles shown` : "Login to unlock maid profiles"}
          </p>
        </div>

        {filteredMaids.length === 0 ? (
          <Card className="rounded-3xl">
            <CardContent className="p-10 text-center">
              <Phone className="mx-auto mb-4 h-10 w-10 text-muted-foreground" />
              <p className="text-muted-foreground">No maids matched the current filters for this agency.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredMaids.map((maid) => {
              const age = calculateAge(maid.dateOfBirth);
              const photo = getPrimaryPhoto(maid);
              const isAvailable = !maid.status || maid.status === "available";

              return (
                <article
                  key={maid.referenceCode}
                  className="w-36 flex flex-col overflow-hidden rounded-lg border bg-card shadow-sm hover:shadow-md transition text-xs">
                  <div
                    className={`h-26 w-full bg-muted overflow-hidden flex-shrink-0 ${
                      !isLoggedIn ? "blur-md" : ""
                    }`}>
                    {photo ? (
                      <img
                        src={photo}
                        alt={maid.fullName}
                        className="h-full w-full object-cover"/>
                    ) : (
                      <div className="flex h-full items-center justify-center text-[10px] text-muted-foreground">
                        No photo
                      </div>
                    )}
                  </div>

                  <div
                    className={`flex flex-col p-2 gap-1 flex-1 items-center text-center ${
                      !isLoggedIn ? "blur-sm select-none" : ""
                    }`}>
                    <h3 className="text-[12px] font-medium text-foreground line-clamp-1">
                      {maid.fullName}
                    </h3>

                    <p className="text-[10px] text-muted-foreground">
                      {maid.referenceCode}
                    </p> 
                    <div className="mt-auto w-full">
                      {isLoggedIn ? (
                        <Button size="sm" className="w-full h-7 text-[10px]" asChild>
                          <Link to={`/maids/${encodeURIComponent(maid.referenceCode)}`}>
                            View Profile
                          </Link>
                        </Button>
                      ) : (
                        <Button size="sm" className="w-full h-7 text-[10px]" asChild>
                          <Link to="/employer-login">Login</Link>
                        </Button>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default AgencyDetailsPage;
