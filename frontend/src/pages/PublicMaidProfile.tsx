import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Check, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getClientToken } from "@/lib/clientAuth";
import { calculateAge, formatDate, MaidProfile } from "@/lib/maids";
import { toast } from "@/components/ui/sonner";
import HireConfirmationDialog from "@/components/HireConfirmationDialog";

interface CompanyProfileApi {
  company_name?: string;
  short_name?: string;
  license_no?: string;
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

const getPrimaryPhoto = (maid: MaidProfile) =>
  Array.isArray(maid.photoDataUrls) && maid.photoDataUrls.length > 0 ? maid.photoDataUrls[0] : maid.photoDataUrl || "";

const getPublicIntro = (maid: MaidProfile) => String((maid.introduction as Record<string, unknown>)?.publicIntro || "").trim();

const PublicMaidProfile = () => {
  const { refCode } = useParams();
  const [maid, setMaid] = useState<MaidProfile | null>(null);
  const [company, setCompany] = useState<CompanyProfileApi | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isHireDialogOpen, setIsHireDialogOpen] = useState(false);
  const isLoggedIn = Boolean(getClientToken());

  useEffect(() => {
    const loadData = async () => {
      if (!refCode) return;

      try {
        setIsLoading(true);
        const [maidResponse, companyResponse] = await Promise.all([
          fetch(`/api/maids/${encodeURIComponent(refCode)}`),
          fetch("/api/company"),
        ]);

        const maidData = (await maidResponse.json().catch(() => ({}))) as { error?: string; maid?: MaidProfile };
        if (!maidResponse.ok || !maidData.maid) {
          throw new Error(maidData.error || "Failed to load maid profile");
        }

        if (!maidData.maid.isPublic) {
          setMaid(null);
        } else {
          setMaid(maidData.maid);
        }

        if (companyResponse.ok) {
          const companyData = (await companyResponse.json().catch(() => ({}))) as CompanyResponse;
          setCompany(companyData.companyProfile ?? null);
        }
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to load maid profile");
      } finally {
        setIsLoading(false);
      }
    };

    void loadData();
  }, [refCode]);

  const agencyContact = useMemo(() => {
    if (!maid) return null;
    return maid.agencyContact as Record<string, unknown>;
  }, [maid]);

  const workAreas = useMemo(
    () =>
      maid
        ? (Object.entries(maid.workAreas || {}) as Array<
            [string, { willing?: boolean; experience?: boolean; evaluation?: string }]
          >)
        : [],
    [maid]
  );

  const languages = useMemo(() => (maid ? Object.entries(maid.languageSkills || {}) : []), [maid]);
  const employment = useMemo(
    () => (maid && Array.isArray(maid.employmentHistory) ? maid.employmentHistory : []),
    [maid]
  );

  if (isLoading) {
    return (
      <div className="client-page-theme min-h-screen bg-card">
        <div className="container py-16 text-center font-body text-muted-foreground">Loading maid profile...</div>
      </div>
    );
  }

  if (!maid) {
    return (
      <div className="client-page-theme min-h-screen bg-card">
        <div className="container py-16">
          <Link to="/" className="mb-6 inline-flex items-center gap-2 font-body text-sm text-primary hover:underline">
            <ArrowLeft className="h-4 w-4" /> Back to Home
          </Link>
          <div className="rounded-2xl border bg-muted/40 p-10 text-center">
            <h1 className="font-display text-3xl font-bold text-foreground">Profile Not Available</h1>
            <p className="mt-3 font-body text-muted-foreground">
              This maid profile is not currently available for public viewing.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const age = calculateAge(maid.dateOfBirth);
  const photo = getPrimaryPhoto(maid);
  const publicIntro = getPublicIntro(maid);
  const workAreaNotes =
    (((maid.skillsPreferences as Record<string, unknown>)?.workAreaNotes as Record<string, string>) ??
      {}) as Record<string, string>;
  const agencyChatName = company?.company_name || company?.short_name || "Agency";

  return (
    <div className="client-page-theme min-h-screen bg-card">
      <div className="container py-10 md:py-14">
        <Link
          to="/client/maids"
          className="mb-3 inline-flex items-center gap-2 font-body text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Home
        </Link>

        <div className="grid gap-6 xl:grid-cols-[1.1fr_1.4fr]">
          <article className="rounded-2xl border bg-muted/30 p-6">
            <div className="mb-5 flex items-center gap-4">
              <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-2xl border bg-card">
                {company?.logo_data_url ? (
                  <img src={company.logo_data_url} alt={company.company_name || "Agency logo"} className="h-full w-full object-cover" />
                ) : (
                  <span className="font-display text-lg font-bold text-primary">MA</span>
                )}
              </div>
              <div>
                <h2 className="font-display text-2xl font-bold text-foreground">
                  {company?.company_name || company?.short_name || String(agencyContact?.companyName || "Agency")}
                </h2>
                <p className="font-body text-sm text-muted-foreground">
                  License No: {company?.license_no || String(agencyContact?.licenseNo || "N/A")}
                </p>
              </div>
            </div>

            <div className="space-y-3 font-body text-sm text-foreground">
              <p>
                <span className="text-muted-foreground">Contact Person:</span>{" "}
                {company?.contact_person || String(agencyContact?.contactPerson || "N/A")}
              </p>
              <p>
                <span className="text-muted-foreground">Phone:</span>{" "}
                {company?.contact_phone || String(agencyContact?.phone || "N/A")}
              </p>
              <p>
                <span className="text-muted-foreground">Email:</span> {company?.contact_email || "N/A"}
              </p>
              <p>
                <span className="text-muted-foreground">Website:</span> {company?.contact_website || "N/A"}
              </p>
              <p>
                <span className="text-muted-foreground">Office Hours:</span> {company?.office_hours_regular || "N/A"}
              </p>
              {company?.office_hours_other ? (
                <p className="text-muted-foreground">{company.office_hours_other}</p>
              ) : null}
            </div>

            <div className="mt-5 border-t pt-5">
              <p className="font-body text-xs uppercase tracking-wider text-muted-foreground">About the Agency</p>
              <p className="mt-2 font-body text-sm leading-6 text-muted-foreground">
                {company?.about_us || "Agency information will be updated soon."}
              </p>
            </div>
          </article>

          <article className="rounded-2xl border bg-card p-6 shadow-sm">
            <div className="grid gap-6 md:grid-cols-[220px_1fr]">
              <div className={`overflow-hidden rounded-2xl border bg-muted ${!isLoggedIn ? "blur-md" : ""}`}>
                {photo ? (
                  <img src={photo} alt={maid.fullName} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex min-h-[280px] items-center justify-center font-body text-sm text-muted-foreground">
                    No photo available
                  </div>
                )}
              </div>

              <div className={!isLoggedIn ? "select-none blur-sm" : ""}>
                <div className="mb-4">
                  <h1 className="font-display text-3xl font-bold text-foreground">{maid.fullName}</h1>
                  <p className="mt-1 font-body text-sm uppercase tracking-wide text-muted-foreground">
                    {maid.referenceCode}
                  </p>
                </div>

                <div className="mb-4 flex flex-wrap gap-2">
                  <span className="rounded-full bg-accent px-2.5 py-1 font-body text-xs font-medium text-accent-foreground">
                    {maid.nationality || "N/A"}
                  </span>
                  <span className="rounded-full bg-secondary/20 px-2.5 py-1 font-body text-xs font-medium text-foreground">
                    {maid.type || "N/A"}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 font-body text-sm text-foreground md:grid-cols-3">
                  <p><span className="text-muted-foreground">Age:</span> {age ?? "N/A"}</p>
                  <p><span className="text-muted-foreground">Religion:</span> {maid.religion || "N/A"}</p>
                  <p><span className="text-muted-foreground">Marital:</span> {maid.maritalStatus || "N/A"}</p>
                  <p><span className="text-muted-foreground">Education:</span> {maid.educationLevel || "N/A"}</p>
                  <p><span className="text-muted-foreground">Height:</span> {maid.height ? `${maid.height} cm` : "N/A"}</p>
                  <p><span className="text-muted-foreground">Weight:</span> {maid.weight ? `${maid.weight} kg` : "N/A"}</p>
                </div>

                <div className="mt-5">
                  <p className="font-body text-xs uppercase tracking-wider text-muted-foreground">Public Introduction</p>
                  <p className="mt-2 font-body text-sm leading-6 text-muted-foreground">
                    {publicIntro || "Public introduction will be available soon for this profile."}
                  </p>
                </div>
              </div>
            </div>

            <div className={`mt-8 grid gap-6 lg:grid-cols-2 ${!isLoggedIn ? "select-none blur-sm" : ""}`}>
              <div>
                <h3 className="mb-3 font-display text-xl font-semibold text-foreground">Language Skills</h3>
                <div className="space-y-2 font-body text-sm text-foreground">
                  {languages.length > 0 ? (
                    languages.map(([language, level]) => (
                      <p key={language}>
                        <span className="text-muted-foreground">{language}:</span> {String(level || "N/A")}
                      </p>
                    ))
                  ) : (
                    <p className="text-muted-foreground">No language details available.</p>
                  )}
                </div>
              </div>

              <div>
                <h3 className="mb-3 font-display text-xl font-semibold text-foreground">Work Areas</h3>
                <div className="space-y-2 font-body text-sm text-foreground">
                  {workAreas.length > 0 ? (
                    workAreas.map(([area, config]) => (
                      <p key={area}>
                        <span className="text-muted-foreground">{area}:</span>{" "}
                        {config.evaluation || (config.experience ? "Experienced" : config.willing ? "Willing" : "Not specified")}
                      </p>
                    ))
                  ) : (
                    <p className="text-muted-foreground">No work-area details available.</p>
                  )}
                </div>

                {workAreaNotes["Cooking"] ? (
                  <div className="mt-4 rounded-2xl border bg-muted/15 p-4">
                    <p className="font-body text-sm font-semibold text-foreground">Cooking feedback</p>
                    <p className="mt-2 whitespace-pre-wrap font-body text-sm text-muted-foreground">
                      {workAreaNotes["Cooking"]}
                    </p>
                  </div>
                ) : null}
              </div>
            </div>

            {employment.length > 0 ? (
              <div className={`mt-8 ${!isLoggedIn ? "select-none blur-sm" : ""}`}>
                <h3 className="mb-3 font-display text-xl font-semibold text-foreground">Employment History</h3>
                <div className="overflow-x-auto rounded-2xl border">
                  <table className="w-full min-w-[640px] text-sm">
                    <thead>
                      <tr className="bg-muted/50 text-left">
                        {["From", "To", "Country", "Employer", "Duties", "Remarks"].map((heading) => (
                          <th key={heading} className="px-3 py-2 font-body font-semibold text-foreground">
                            {heading}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {employment.map((item, index) => {
                        const row = item as Record<string, string>;
                        return (
                          <tr key={`${maid.referenceCode}-${index}`} className="border-t">
                            <td className="px-3 py-2">{formatDate(row.from) === "N/A" ? "-" : formatDate(row.from)}</td>
                            <td className="px-3 py-2">{formatDate(row.to) === "N/A" ? "-" : formatDate(row.to)}</td>
                            <td className="px-3 py-2">{row.country || "-"}</td>
                            <td className="px-3 py-2">{row.employer || "-"}</td>
                            <td className="px-3 py-2">{row.duties || "-"}</td>
                            <td className="px-3 py-2">{row.remarks || "-"}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : null}
            {isLoggedIn ? (
              <div className="mt-8 p-6 bg-accent/10 rounded-xl">
                <h3 className="font-display text-xl font-bold mb-4 flex items-center gap-2">
                  <Check className="h-5 w-5 text-accent-foreground" />
                  Ready to Accept?
                </h3>
                <p className="text-sm text-muted-foreground mb-6">
                  This maid matches your requirements. Accept to move into the hiring process, review terms, and send your request.
                </p>
                <div className="flex flex-col gap-3 md:flex-row">
                  <Button size="lg" className="w-full" onClick={() => setIsHireDialogOpen(true)}>
                    Accept and Start Hiring Process
                  </Button>
                  <Button size="lg" variant="outline" className="w-full" asChild>
                    <Link to={`/client/support-chat?type=agency&agencyId=1&agencyName=${encodeURIComponent(agencyChatName)}`}>
                      <MessageCircle className="mr-2 h-4 w-4" />
                      Chat with Agency
                    </Link>
                  </Button>
                </div>
              </div>
            ) : (
              <div className="mt-8 rounded-xl border bg-muted/30 p-6 text-center">
                <h3 className="font-display text-xl font-bold text-foreground">Login Required</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  Photos, biodata, search access, and hiring actions are hidden until employer login.
                </p>
                <div className="mt-4">
                  <Button asChild>
                    <Link to="/employer-login">Employer Login</Link>
                  </Button>
                </div>
              </div>
            )}
          </article>

          <HireConfirmationDialog
            maid={maid}
            open={isHireDialogOpen}
            onOpenChange={setIsHireDialogOpen}
          />
        </div>
      </div>
    </div>
  );
};

export default PublicMaidProfile;
