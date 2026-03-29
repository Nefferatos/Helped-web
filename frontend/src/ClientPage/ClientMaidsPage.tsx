import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Search } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/sonner";
import { getClientAuthHeaders, getClientToken } from "@/lib/clientAuth";
import { calculateAge, getExperienceBucket, getPrimaryPhoto, getPublicIntro, type MaidProfile } from "@/lib/maids";
import "./ClientTheme.css";

interface CompanyProfileApi {
  company_name?: string;
  short_name?: string;
}

interface CompanyResponse {
  companyProfile?: CompanyProfileApi;
}

const getAgencyName = (maid: MaidProfile, company: CompanyProfileApi | null) => {
  const agencyContact = maid.agencyContact as Record<string, unknown>;
  return String(agencyContact.companyName || company?.company_name || company?.short_name || "Agency");
};

const ClientMaidsPage = () => {
  const navigate = useNavigate();
  const [maids, setMaids] = useState<MaidProfile[]>([]);
  const [company, setCompany] = useState<CompanyProfileApi | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [nationality, setNationality] = useState("All Nationalities");
  const [maidType, setMaidType] = useState("All Types");

  useEffect(() => {
    if (!getClientToken()) {
      navigate("/employer-login");
      return;
    }

    const loadMaids = async () => {
      try {
        setIsLoading(true);
        const [maidsResponse, companyResponse] = await Promise.all([
          fetch("/api/maids?visibility=public", {
            headers: { ...getClientAuthHeaders() },
          }),
          fetch("/api/company"),
        ]);

        const maidData = (await maidsResponse.json().catch(() => ({}))) as {
          maids?: MaidProfile[];
          error?: string;
        };
        const companyData = (await companyResponse.json().catch(() => ({}))) as CompanyResponse;

        if (!maidsResponse.ok || !maidData.maids) {
          throw new Error(maidData.error || "Failed to load maids");
        }

        setMaids(maidData.maids.filter((maid) => maid.isPublic));
        setCompany(companyData.companyProfile ?? null);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to load maids");
      } finally {
        setIsLoading(false);
      }
    };

    void loadMaids();
  }, [navigate]);

  const nationalityOptions = useMemo(() => {
    const values = Array.from(
      new Set(maids.map((maid) => maid.nationality?.trim()).filter((value): value is string => Boolean(value))),
    ).sort((left, right) => left.localeCompare(right));

    return ["All Nationalities", ...values];
  }, [maids]);

  const maidTypeOptions = useMemo(() => {
    const values = Array.from(
      new Set(maids.map((maid) => maid.type?.trim()).filter((value): value is string => Boolean(value))),
    ).sort((left, right) => left.localeCompare(right));

    return ["All Types", ...values];
  }, [maids]);

  const filteredMaids = useMemo(() => {
    return maids.filter((maid) => {
      const publicIntro = getPublicIntro(maid).toLowerCase();
      const searchText = `${maid.fullName} ${maid.referenceCode} ${maid.nationality} ${maid.type} ${publicIntro}`.toLowerCase();

      const matchesSearch = !search.trim() || searchText.includes(search.trim().toLowerCase());
      const matchesNationality = nationality === "All Nationalities" || maid.nationality === nationality;
      const matchesType = maidType === "All Types" || maid.type === maidType;

      return matchesSearch && matchesNationality && matchesType;
    });
  }, [maids, maidType, nationality, search]);

  return (
    <div className="client-page-theme min-h-screen bg-[linear-gradient(180deg,hsl(var(--background))_0%,hsl(var(--muted))_100%)]">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8 sm:px-6">
        <Link to="/client/dashboard" className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground">
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </Link>

        <Card className="rounded-[28px] border bg-card shadow-sm">
          <CardContent className="p-6 sm:p-7">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Maids</p>
            <h1 className="mt-2 font-display text-3xl font-bold text-foreground">Browse maids</h1>
            <p className="mt-1 text-sm text-muted-foreground">Choose a maid from a dedicated page with search and filter controls.</p>

            <div className="mt-5 grid gap-3 md:grid-cols-[1.3fr_1fr_1fr]">
              <div className="flex items-center gap-3 rounded-[22px] border bg-background px-4 py-3 md:col-span-3">
                <Search className="h-4 w-4 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search maid name, code, type, or introduction"
                  className="h-auto border-0 bg-transparent p-0 shadow-none focus-visible:ring-0"
                />
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
                className="h-12 w-full rounded-[18px] border bg-background px-3 text-sm text-foreground"
              >
                {maidTypeOptions.map((option) => (
                  <option key={option}>{option}</option>
                ))}
              </select>
              <div className="flex items-center rounded-[18px] border bg-muted/40 px-4 text-sm text-muted-foreground">
                {isLoading ? "Loading maids..." : `${filteredMaids.length} maids found`}
              </div>
            </div>
          </CardContent>
        </Card>

        {isLoading ? (
          <Card className="rounded-[28px] border bg-card shadow-sm">
            <CardContent className="p-10 text-center text-muted-foreground">
              Loading maids...
            </CardContent>
          </Card>
        ) : filteredMaids.length === 0 ? (
          <Card className="rounded-[28px] border bg-card shadow-sm">
            <CardContent className="p-10 text-center">
              <p className="font-display text-2xl font-semibold text-foreground">
                No matching maids found
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                Try changing the filters or broadening the search.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {filteredMaids.map((maid) => {
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
                      <h2 className="text-sm font-semibold text-foreground line-clamp-1">
                        {maid.fullName}
                      </h2>
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
                      <Button
                        size="sm"
                        className="flex-1 h-7 text-xs rounded-md"
                        asChild >
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
                          )}`} >
                          Msg
                        </Link>
                      </Button>
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

export default ClientMaidsPage;
