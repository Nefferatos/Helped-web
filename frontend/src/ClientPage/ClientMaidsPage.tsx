import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Search } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/sonner";
import { getClientAuthHeaders, getClientToken } from "@/lib/clientAuth";
import {
  calculateAge,
  getPrimaryPhoto,
  getPublicIntro,
  type MaidProfile,
} from "@/lib/maids";
import "./ClientTheme.css";

interface CompanyProfileApi {
  company_name?: string;
  short_name?: string;
}

interface CompanyResponse {
  companyProfile?: CompanyProfileApi;
}

const getAgencyName = (
  maid: MaidProfile,
  company: CompanyProfileApi | null
) => {
  const agencyContact = maid.agencyContact as Record<string, unknown>;
  return String(
    agencyContact.companyName ||
      company?.company_name ||
      company?.short_name ||
      "Agency"
  );
};

const ClientMaidsPage = () => {
  const navigate = useNavigate();

  const [maids, setMaids] = useState<MaidProfile[]>([]);
  const [company, setCompany] = useState<CompanyProfileApi | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [nationality, setNationality] = useState("All Nationalities");
  const [maidType, setMaidType] = useState("All Types");

  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 12;

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

        const maidData = await maidsResponse.json();
        const companyData = (await companyResponse.json()) as CompanyResponse;

        if (!maidsResponse.ok || !maidData.maids) {
          throw new Error(maidData.error || "Failed to load maids");
        }

        setMaids(maidData.maids.filter((m: MaidProfile) => m.isPublic));
        setCompany(companyData.companyProfile ?? null);
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Failed to load maids"
        );
      } finally {
        setIsLoading(false);
      }
    };

    void loadMaids();
  }, [navigate]);

  const nationalityOptions = useMemo(() => {
    const values = Array.from(
      new Set(
        maids.map((m) => m.nationality?.trim()).filter(Boolean)
      )
    ).sort();

    return ["All Nationalities", ...values];
  }, [maids]);

  const maidTypeOptions = useMemo(() => {
    const values = Array.from(
      new Set(maids.map((m) => m.type?.trim()).filter(Boolean))
    ).sort();

    return ["All Types", ...values];
  }, [maids]);

  const filteredMaids = useMemo(() => {
    return maids.filter((maid) => {
      const intro = getPublicIntro(maid).toLowerCase();
      const text =
        `${maid.fullName} ${maid.referenceCode} ${maid.nationality} ${maid.type} ${intro}`.toLowerCase();

      return (
        (!search.trim() || text.includes(search.toLowerCase())) &&
        (nationality === "All Nationalities" ||
          maid.nationality === nationality) &&
        (maidType === "All Types" || maid.type === maidType)
      );
    });
  }, [maids, search, nationality, maidType]);

  const totalPages = Math.ceil(filteredMaids.length / ITEMS_PER_PAGE);

  const paginatedMaids = filteredMaids.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [search, nationality, maidType]);

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,hsl(var(--background))_0%,hsl(var(--muted))_100%)]">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-5 px-4 py-6">

        {/* BACK */}
        <Link
          to="/client/dashboard"
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </Link>

        {/* FILTERS */}
        <Card>
          <CardContent className="p-4">
            <div className="grid gap-2 md:grid-cols-[2fr_1fr_1fr]">
              
              <div className="flex items-center gap-2 rounded-xl border px-3">
                <Search className="h-4 w-4 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search maid..."
                  className="border-0"
                />
              </div>

              <select
                value={nationality}
                onChange={(e) => setNationality(e.target.value)}
                className="h-10 rounded-lg border px-2 text-sm"
              >
                {nationalityOptions.map((o) => (
                  <option key={o}>{o}</option>
                ))}
              </select>

              <select
                value={maidType}
                onChange={(e) => setMaidType(e.target.value)}
                className="h-10 rounded-lg border px-2 text-sm"
              >
                {maidTypeOptions.map((o) => (
                  <option key={o}>{o}</option>
                ))}
              </select>

            </div>
          </CardContent>
        </Card>

        {/* GRID */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-6 gap-2">

          {paginatedMaids.map((maid) => {
            const age = calculateAge(maid.dateOfBirth);
            const photo = getPrimaryPhoto(maid);
            const agencyName = getAgencyName(maid, company);

            return (
              <article
                key={maid.referenceCode}
                className="group overflow-hidden rounded-xl border bg-card shadow-sm transition hover:shadow-md hover:-translate-y-1"
              >
                {/* IMAGE */}
                <div className="aspect-[3/4] bg-muted overflow-hidden">
                  {photo ? (
                    <img
                      src={photo}
                      alt={maid.fullName}
                      className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
                      No photo
                    </div>
                  )}
                </div>

                {/* CONTENT */}
                <div className="p-2 flex flex-col gap-2">

                  {/* NAME */}
                  <h3 className="text-xs font-semibold truncate">
                    {maid.fullName}
                  </h3>

                  <p className="text-[10px] text-muted-foreground">
                    ID: {maid.referenceCode}
                  </p>

                  {/* BADGES */}
                  <div className="flex flex-wrap gap-1">
                    <span className="px-2 py-[2px] rounded-full bg-muted text-[10px]">
                      {maid.nationality}
                    </span>
                    <span className="px-2 py-[2px] rounded-full bg-muted text-[10px]">
                      {maid.type}
                    </span>
                    <span className="px-2 py-[2px] rounded-full bg-muted text-[10px]">
                      {age} yrs
                    </span>
                  </div>

                  {/* QUICK INFO */}
                  <p className="text-[10px] text-muted-foreground">
                    Available • Verified
                  </p>

                  {/* BUTTONS */}
                  <div className="flex gap-1 pt-1">

                    <Button
                      size="sm"
                      asChild
                      className="h-7 flex-1 text-[10px]"
                    >
                      <Link
                        to={`/maids/${encodeURIComponent(
                          maid.referenceCode
                        )}`}
                      >
                        View
                      </Link>
                    </Button>

                    <Button
                      size="sm"
                      variant="outline"
                      asChild
                      className="h-7 flex-1 text-[10px]"
                    >
                      <Link
                        to={`/client/support-chat?agencyName=${encodeURIComponent(
                          agencyName
                        )}`}
                      >
                        Chat
                      </Link>
                    </Button>

                  </div>
                </div>
              </article>
            );
          })}

        </div>

        {/* PAGINATION */}
        {totalPages > 1 && (
          <div className="flex justify-center gap-1 mt-4 flex-wrap">
            
            <Button
              size="sm"
              variant="outline"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((p) => p - 1)}
            >
              Prev
            </Button>

            {Array.from({ length: totalPages }).map((_, i) => (
              <Button
                key={i}
                size="sm"
                variant={currentPage === i + 1 ? "default" : "outline"}
                onClick={() => setCurrentPage(i + 1)}
              >
                {i + 1}
              </Button>
            ))}

            <Button
              size="sm"
              variant="outline"
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage((p) => p + 1)}
            >
              Next
            </Button>

          </div>
        )}

      </div>
    </div>
  );
};

export default ClientMaidsPage;