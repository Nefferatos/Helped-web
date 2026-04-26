import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Check, Eye, Heart, MessageCircle, Share2, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { getStoredClient } from "@/lib/clientAuth";
import { calculateAge, formatDate, getPublicIntro, MaidProfile } from "@/lib/maids";
import { sendMaidToClient } from "@/lib/maidShare";
import { getSavedShortlistRefs, subscribeToShortlistRefs, toggleShortlistRef } from "@/lib/shortlist";
import { toast } from "@/components/ui/sonner";
import PublicSiteNavbar from "@/components/PublicSiteNavbar";
import { hasActiveClientSession, syncClientProfileFromSession } from "@/lib/supabaseAuth";

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

const availabilityRemarkItems = [
  { label: "Able to handle pork", keys: ["Able to handle pork?"] },
  { label: "Able to eat pork", keys: ["Able to eat pork?"] },
  { label: "Able to care for pets", keys: ["Able to care for dog/cat?"] },
  { label: "Able to do sewing", keys: ["Able to do simple sewing?"] },
  { label: "Able to do gardening", keys: ["Able to do gardening work?"] },
  { label: "Willing to wash car", keys: ["Willing to wash car?"] },
  {
    label: "Can work on off-days",
    keys: [
      "Can work on off-days with compensation?",
      "Willing to work on off-days with compensation?",
      "Willing to work on off-days with  compensation?",
    ],
  },
] as const;

const fixedLanguageKeyMap = [
  { label: "ENGLISH", keys: ["English"] },
  { label: "MANDARIN/CHINESE dialect", keys: ["Mandarin/Chinese-Dialect", "Mandarin / Chinese Dialect", "Mandarin/Chinese Dialect", "Mandarin"] },
  { label: "Hindi", keys: ["Hindi"] },
  { label: "Tamil", keys: ["Tamil"] },
  { label: "Bahasa Indonesia/Malaysia", keys: ["Bahasa Indonesia/Malaysia", "Bahasa Indonesia / Malaysia", "Bahasa"] },
] as const;

const getYouTubeEmbedUrl = (value?: string) => {
  const raw = String(value || "").trim();
  if (!raw) return null;
  try {
    const url = new URL(raw);
    const host = url.hostname.replace(/^www\./, "").toLowerCase();
    if (host === "youtu.be") {
      const id = url.pathname.replace(/^\//, "").split("/")[0];
      return id ? `https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}` : null;
    }
    if (host.endsWith("youtube.com")) {
      if (url.pathname.startsWith("/watch")) { const id = url.searchParams.get("v"); return id ? `https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}` : null; }
      if (url.pathname.startsWith("/embed/")) { const id = url.pathname.split("/embed/")[1]?.split("/")[0]; return id ? `https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}` : null; }
      if (url.pathname.startsWith("/shorts/")) { const id = url.pathname.split("/shorts/")[1]?.split("/")[0]; return id ? `https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}` : null; }
    }
  } catch { /* ignore */ }
  return null;
};

const SectionHeader = ({ children }: { children: React.ReactNode }) => (
  <div className="border-b bg-muted/30 px-4 py-2">
    <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">{children}</p>
  </div>
);

const YesNoBadge = ({ yes }: { yes: boolean }) => (
  <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${yes ? "bg-emerald-50 text-emerald-700" : "bg-muted text-muted-foreground"}`}>
    {yes ? "Yes" : "No"}
  </span>
);

const StarDisplay = ({ evaluation }: { evaluation?: string }) => {
  const raw = String(evaluation || "").trim();
  if (!raw || raw === "—" || raw === "N.A." || raw === "-") {
    return <span className="text-muted-foreground text-xs">N.A.</span>;
  }
  const match = raw.match(/^(\d+)\/5/);
  const rating = match ? parseInt(match[1], 10) : null;
  const note = raw.replace(/^\d+\/5\s*[-–]?\s*/, "").trim();
  if (rating === null) {
    return <span className="text-[11px] text-muted-foreground">{raw}</span>;
  }
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="flex items-center gap-0.5">
        {Array.from({ length: 5 }, (_, i) => (
          <Star key={i} className={`h-4 w-4 ${i < rating ? "fill-primary text-primary" : "text-muted-foreground/30"}`} />
        ))}
      </div>
      {note && <span className="text-[10px] text-muted-foreground leading-tight text-center">{note}</span>}
    </div>
  );
};

const KVRow = ({ label, value }: { label: string; value: string }) => (
  <div className="contents">
    <p className="py-1 pr-3 text-[11px] font-medium text-muted-foreground border-b border-dashed border-muted/60 leading-snug">{label}</p>
    <p className="py-1 text-[12px] border-b border-dashed border-muted/60 leading-snug">{value || "—"}</p>
  </div>
);

const getPrimaryPhoto = (maid: MaidProfile) =>
  Array.isArray(maid.photoDataUrls) && maid.photoDataUrls.length > 0 ? maid.photoDataUrls[0] : maid.photoDataUrl || "";


const PublicMaidProfile = () => {
  const { refCode } = useParams();
  const [maid, setMaid] = useState<MaidProfile | null>(null);
  const [company, setCompany] = useState<CompanyProfileApi | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [shortlistRefs, setShortlistRefs] = useState<string[]>([]);
  const [shortlistMaids, setShortlistMaids] = useState<MaidProfile[]>([]);
  const [isShortlistLoading, setIsShortlistLoading] = useState(false);
  const [isShortlistOpen, setIsShortlistOpen] = useState(false);
  const [lightboxPhoto, setLightboxPhoto] = useState<string | null>(null);
  const [showOtherLanguages, setShowOtherLanguages] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

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
        if (!maidResponse.ok || !maidData.maid) throw new Error(maidData.error || "Failed to load maid profile");
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

  useEffect(() => {
    setShortlistRefs(getSavedShortlistRefs());
    return subscribeToShortlistRefs(setShortlistRefs);
  }, []);

  useEffect(() => {
    if (!isShortlistOpen || shortlistRefs.length === 0) {
      if (shortlistRefs.length === 0) setShortlistMaids([]);
      return;
    }
    const controller = new AbortController();
    const loadShortlistMaids = async () => {
      try {
        setIsShortlistLoading(true);
        const res = await fetch("/api/maids?visibility=public", { signal: controller.signal });
        const data = (await res.json()) as { maids?: MaidProfile[]; error?: string };
        if (!res.ok || !data.maids) throw new Error(data.error || "Failed to load shortlist");
        setShortlistMaids(data.maids.filter((item) => item.isPublic && shortlistRefs.includes(item.referenceCode)));
      } catch (error) {
        if (!(error instanceof DOMException && error.name === "AbortError")) {
          toast.error(error instanceof Error ? error.message : "Failed to load shortlist");
        }
      } finally {
        setIsShortlistLoading(false);
      }
    };
    void loadShortlistMaids();
    return () => controller.abort();
  }, [isShortlistOpen, shortlistRefs]);

  useEffect(() => { setShowOtherLanguages(false); }, [maid?.referenceCode]);

  useEffect(() => {
    void hasActiveClientSession()
      .then((active) => {
        setIsLoggedIn(active);
        if (active) {
          void syncClientProfileFromSession();
        }
      })
      .catch(() => setIsLoggedIn(false));
  }, []);

  const agencyContact = useMemo(() => (maid ? maid.agencyContact as Record<string, unknown> : null), [maid]);
  const isShortlisted = Boolean(maid?.referenceCode && shortlistRefs.includes(maid.referenceCode));
  const shortlistedMaidMap = useMemo(
    () => new Map(shortlistMaids.map((item) => [item.referenceCode, item])),
    [shortlistMaids],
  );
  const missingShortlistRefs = useMemo(
    () => shortlistRefs.filter((ref) => !shortlistedMaidMap.has(ref)),
    [shortlistRefs, shortlistedMaidMap],
  );

  const handleToggleShortlist = (refOverride?: string) => {
    const ref = refOverride ?? maid?.referenceCode;
    if (!ref) return;
    const nextRefs = toggleShortlistRef(ref);
    setShortlistRefs(nextRefs);
    toast.success(shortlistRefs.includes(ref) ? "Removed from shortlist" : "Added to shortlist");
  };

  const handleTellFriend = async () => {
    if (!maid) return;
    try { await sendMaidToClient(maid); }
    catch (error) { toast.error(error instanceof Error ? error.message : "Unable to share maid profile"); }
  };

  const employment = useMemo(
    () => (maid && Array.isArray(maid.employmentHistory) ? maid.employmentHistory : []),
    [maid]
  );

  const photos = useMemo(() => {
    if (!maid) return [] as string[];
    return Array.isArray(maid.photoDataUrls) && maid.photoDataUrls.length > 0
      ? maid.photoDataUrls
      : maid.photoDataUrl ? [maid.photoDataUrl] : [];
  }, [maid]);

  const otherLanguages = useMemo(() => {
    const allowedKeys = new Set<string>(fixedLanguageKeyMap.flatMap((item) => item.keys).map(String));
    return Object.entries(maid?.languageSkills || {})
      .map(([language, level]) => [language, String(level || "")] as const)
      .filter(([language, level]) => !allowedKeys.has(language) && level.trim());
  }, [maid?.languageSkills]);

  if (isLoading) {
    return (
      <div className="client-page-theme min-h-screen bg-card">
        <PublicSiteNavbar />
        <div className="page-container">
          <div className="content-card py-10 text-center text-muted-foreground text-sm">Loading maid profile…</div>
        </div>
      </div>
    );
  }

  if (!maid) {
    return (
      <div className="client-page-theme min-h-screen bg-card">
        <PublicSiteNavbar />
        <div className="page-container">
          <div className="mb-3">
            <Link to="/client/maids" className="group inline-flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors">
              <ArrowLeft className="h-3 w-3 transition-transform group-hover:-translate-x-0.5" /> Back to all maids
            </Link>
          </div>
          <div className="content-card p-10 text-center">
            <p className="text-sm font-semibold text-foreground">Profile Not Available</p>
            <p className="mt-1 text-xs text-muted-foreground">This maid profile is not currently available for public viewing.</p>
          </div>
        </div>
      </div>
    );
  }

  const introduction = maid.introduction as Record<string, unknown>;
  const skillsPreferences = maid.skillsPreferences as Record<string, unknown>;
  const otherInformation = (skillsPreferences?.otherInformation as Record<string, boolean>) || {};
  const workAreaNotes = (skillsPreferences?.workAreaNotes as Record<string, string>) || {};
  const pastIllnesses = (introduction?.pastIllnesses as Record<string, boolean>) || {};

  const workAreasOrder = ["Care of infants/children", "Care of elderly", "Care of disabled", "General housework", "Cooking", "Language abilities (spoken)", "Other skills, if any"] as const;
  const rawWorkAreas = Object.entries(maid.workAreas || {}) as Array<[string, { willing?: boolean; experience?: boolean; evaluation?: string; yearsOfExperience?: string }]>;
  const orderedWorkAreas = workAreasOrder
    .map((area) => rawWorkAreas.find(([key]) => key === area) ?? null)
    .filter(Boolean) as Array<[string, { willing?: boolean; experience?: boolean; evaluation?: string; yearsOfExperience?: string }]>;

  const fixedLanguages = fixedLanguageKeyMap
    .map((item) => {
      const level = item.keys.map((key) => (maid.languageSkills || {})[key]).find((val) => String(val || "").trim());
      return level ? [item.label, String(level)] as const : null;
    })
    .filter(Boolean) as Array<[string, string]>;

  const passportOrTwoByTwoPhoto = photos[0] ?? "";
  const fullBodyPhoto = photos[1] ?? "";
  const extraPhotos = photos.slice(2);
  const youtubeEmbedUrl = getYouTubeEmbedUrl(maid.videoDataUrl);

  const storedClient = getStoredClient() as (ReturnType<typeof getStoredClient> & { emailVerified?: boolean }) | null;
  const canViewPrivateIntro = Boolean(isLoggedIn && storedClient?.emailVerified === true);

  const agencyName = company?.company_name || company?.short_name || String(agencyContact?.companyName || "Agency");
  const publicIntro = getPublicIntro(maid);

  const detailRows: Array<[string, string]> = [
    ["Name", maid.fullName],
    ["Ref. Code", maid.referenceCode],
    ["Type", maid.type],
    ["Nationality", maid.nationality],
    ["Category", String((agencyContact?.["indianMaidCategory"] ?? introduction?.["indianMaidCategory"] ?? skillsPreferences?.["indianMaidCategory"] ?? "N/A") as string | number | boolean)],
    ["Date of Birth", formatDate(maid.dateOfBirth)],
    ["Place of Birth", maid.placeOfBirth],
    ["Height / Weight", `${maid.height}cm / ${maid.weight}kg`],
    ["Religion", maid.religion],
    ["Marital Status", maid.maritalStatus],
    ["Children", String(maid.numberOfChildren)],
    ["Siblings", String(maid.numberOfSiblings)],
    ["Home Address", maid.homeAddress],
    ["Repatriation Airport", maid.airportRepatriation],
    ["Education", maid.educationLevel],
    ["Home Contact No.", String(agencyContact?.homeCountryContactNumber || "N/A")],
  ];

  const medicalRows: Array<[string, string]> = [
    ["Allergies", String(introduction?.allergies || "N/A")],
    ["Disabilities", String(introduction?.physicalDisabilities || "N/A")],
    ["Dietary", String(introduction?.dietaryRestrictions || "N/A")],
    ["Food Handling", String(introduction?.foodHandlingPreferences || "N/A")],
    ["Other Illnesses", String(introduction?.otherIllnesses || "N/A")],
    ["Remarks", String(introduction?.otherRemarks || "N/A")],
  ];

  const availabilityRows: Array<[string, string]> = [
    ["Available From", String(introduction?.availability || "N/A")],
    ["Contract Ends", String(introduction?.contractEnds || "N/A")],
    ["Present Salary", String(introduction?.presentSalary || "N/A")],
    ["Expected Salary", String(introduction?.expectedSalary || "N/A")],
    ["Offday Comp.", String(introduction?.offdayCompensation || "N/A")],
    ["Off-days/Month", String(skillsPreferences?.offDaysPerMonth || "N/A")],
    ["Avail. Remark", String(skillsPreferences?.availabilityRemark || "N/A")],
  ];

  const privateRows: Array<[string, string]> = [
    ["Passport No.", String(agencyContact?.passportNo || "N/A")],
    ["Ages of Children", String(introduction?.agesOfChildren || "N/A")],
    ["Maid Loan", String(introduction?.maidLoan || "N/A")],
    ["Private Info", String(skillsPreferences?.privateInfo || "N/A")],
  ];

  return (
    <div className="client-page-theme min-h-screen bg-card">
      <PublicSiteNavbar />

      {/* ── Lightbox ───────────────────────────────────────── */}
      {lightboxPhoto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm" onClick={() => setLightboxPhoto(null)}>
          <div className="relative" onClick={(e) => e.stopPropagation()}>
            <img src={lightboxPhoto} alt="Full size" className="max-h-[90vh] max-w-[90vw] rounded-lg object-contain" />
            <button className="absolute -top-3 -right-3 flex h-7 w-7 items-center justify-center rounded-full bg-white text-black text-xs font-bold shadow" onClick={() => setLightboxPhoto(null)}>✕</button>
          </div>
        </div>
      )}

      <div className="page-container">
        <div className="mb-5">
          <Link
            to="/client/maids/search"
            className="group inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-sm font-medium text-gray-700 shadow-sm transition-all duration-200"
          >
            <ArrowLeft className="h-4 w-4 transition-transform duration-200 group-hover:-translate-x-1" />
            <span>Back to all maids</span>
          </Link>
        </div>

        <div className="content-card animate-fade-in-up space-y-4">

          {/* ── Action toolbar ── */}
          <div className="flex flex-wrap items-center gap-x-0.5 gap-y-1 rounded-lg border bg-muted/20 px-2 py-1.5">
            <Link to="/client/maids/search" className="rounded px-2.5 py-1 text-[11px] text-primary hover:bg-muted transition-colors">All Maids</Link>
            <span className="mx-1 text-muted-foreground/30 select-none">|</span>
            <button
              onClick={() => handleToggleShortlist()}
              className={`flex items-center gap-1 rounded px-2.5 py-1 text-[11px] transition-colors hover:bg-muted ${isShortlisted ? "text-rose-500" : "text-primary"}`}
            >
              <Heart className={`h-3 w-3 ${isShortlisted ? "fill-rose-500" : ""}`} />
              {isShortlisted ? "Shortlisted" : "Shortlist"}
            </button>
            <button
              onClick={() => void handleTellFriend()}
              className="flex items-center gap-1 rounded px-2.5 py-1 text-[11px] text-primary hover:bg-muted transition-colors"
            >
              <Share2 className="h-3 w-3" />Tell Friend
            </button>
            <button
              onClick={() => setIsShortlistOpen(true)}
              className="flex items-center gap-1 rounded px-2.5 py-1 text-[11px] text-primary hover:bg-muted transition-colors"
            >
              <Eye className="h-3 w-3" />My Shortlist ({shortlistRefs.length})
            </button>
            <span className="mx-1 text-muted-foreground/30 select-none">|</span>
            <Link
              to={
                isLoggedIn
                  ? `/client/support-chat?type=agency&agencyId=${encodeURIComponent(
                      String(maid.agencyId ?? 1),
                    )}&agencyName=${encodeURIComponent(maid.agencyName || agencyName)}`
                  : "/employer-login"
              }
              className="flex items-center gap-1 rounded px-2.5 py-1 text-[11px] text-primary hover:bg-muted transition-colors"
            >
              <MessageCircle className="h-3 w-3" />Contact Agency
            </Link>
          </div>

          {!isLoggedIn && (
            <div className="rounded-lg border bg-muted/20 p-4 text-center">
              <p className="text-sm text-muted-foreground">Photos and detailed biodata are blurred until employer login.</p>
              <div className="mt-3">
                <Button asChild><Link to="/employer-login">Employer Login</Link></Button>
              </div>
            </div>
          )}

          {/* ── Top grid: video / agency card / photos ── */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-[1fr_200px_auto]">

            <div className={`relative min-h-[180px] overflow-hidden rounded-lg border bg-muted/20 ${!isLoggedIn ? "blur-md" : ""}`}>
              {youtubeEmbedUrl ? (
                <iframe className="absolute inset-0 h-full w-full" src={youtubeEmbedUrl} title="YouTube video"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  referrerPolicy="strict-origin-when-cross-origin" allowFullScreen />
              ) : maid.videoDataUrl ? (
                <video controls className="absolute inset-0 h-full w-full object-cover" src={maid.videoDataUrl} />
              ) : (
                <div className="flex min-h-[180px] items-center justify-center p-4 text-center">
                  <p className="text-xs text-muted-foreground">No video introduction available.</p>
                </div>
              )}
            </div>

            <div className="rounded-lg border bg-muted/10 p-3 space-y-1 text-xs">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-2">Agency</p>
              <p className="font-semibold text-foreground leading-snug">{agencyName}</p>
              <p className="text-muted-foreground">Lic. No.: {company?.license_no || String(agencyContact?.licenseNo || "N/A")}</p>
              <p>Contact: <span className="font-semibold">{company?.contact_person || String(agencyContact?.contactPerson || "N/A")}</span></p>
              <p>Phone: <span className="font-semibold text-primary">{company?.contact_phone || String(agencyContact?.phone || "N/A")}</span></p>
              <div className="pt-2 mt-1 border-t">
                <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-semibold ${(maid.status || "available") === "available" ? "bg-emerald-50 text-emerald-700" : "bg-muted text-muted-foreground"}`}>
                  <span className="h-1.5 w-1.5 rounded-full bg-current" />{maid.status || "available"}
                </span>
              </div>
            </div>

            <div className={`flex flex-col gap-2 ${!isLoggedIn ? "select-none blur-sm" : ""}`}>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">{photos.length}/5 photos</p>
              <div className="flex gap-2">
                <div className="flex flex-col items-center gap-1">
                  <span className="text-[9px] text-muted-foreground uppercase tracking-wide">Passport</span>
                  <button type="button" disabled={!passportOrTwoByTwoPhoto || !isLoggedIn} onClick={() => passportOrTwoByTwoPhoto && setLightboxPhoto(passportOrTwoByTwoPhoto)}
                    className="group relative flex h-32 w-24 items-center justify-center overflow-hidden rounded-lg border-2 border-dashed border-muted bg-muted/20 transition hover:border-primary/40 disabled:cursor-default">
                    {passportOrTwoByTwoPhoto ? (
                      <><img src={passportOrTwoByTwoPhoto} alt="passport" className="h-full w-full object-contain" />
                      <span className="absolute inset-0 flex items-end justify-center bg-black/20 pb-1 opacity-0 transition-opacity group-hover:opacity-100"><span className="rounded bg-black/60 px-1.5 py-0.5 text-[9px] text-white">View</span></span></>
                    ) : <span className="text-[10px] text-muted-foreground">No photo</span>}
                  </button>
                </div>
                <div className="flex flex-col items-center gap-1">
                  <span className="text-[9px] text-muted-foreground uppercase tracking-wide">Full body</span>
                  <button type="button" disabled={!fullBodyPhoto || !isLoggedIn} onClick={() => fullBodyPhoto && setLightboxPhoto(fullBodyPhoto)}
                    className="group relative flex h-48 w-24 items-center justify-center overflow-hidden rounded-lg border-2 border-dashed border-muted bg-muted/20 transition hover:border-primary/40 disabled:cursor-default">
                    {fullBodyPhoto ? (
                      <><img src={fullBodyPhoto} alt="full body" className="h-full w-full object-contain" />
                      <span className="absolute inset-0 flex items-end justify-center bg-black/20 pb-1 opacity-0 transition-opacity group-hover:opacity-100"><span className="rounded bg-black/60 px-1.5 py-0.5 text-[9px] text-white">View</span></span></>
                    ) : <span className="text-[10px] text-muted-foreground">No photo</span>}
                  </button>
                </div>
              </div>
              {extraPhotos.length > 0 && (
                <div className="flex gap-1.5">
                  {extraPhotos.map((photo, index) => (
                    <button key={`${photo}-${index}`} type="button" disabled={!isLoggedIn} onClick={() => setLightboxPhoto(photo)}
                      className="group relative h-14 w-14 overflow-hidden rounded-md border border-muted bg-muted/20 transition hover:border-primary/40 disabled:cursor-default">
                      <img src={photo} alt={`extra ${index + 1}`} className="h-full w-full object-contain" />
                      <span className="absolute inset-0 bg-black/20 opacity-0 transition-opacity group-hover:opacity-100" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* ── Personal details + Other info / Availability ── */}
          <div className={`grid grid-cols-1 gap-4 lg:grid-cols-[1fr_260px] ${!isLoggedIn ? "select-none blur-sm" : ""}`}>
            <div className="rounded-lg border overflow-hidden">
              <SectionHeader>Personal Details</SectionHeader>
              <div className="grid grid-cols-[140px_1fr] p-4 text-sm">
                {detailRows.map(([label, value]) => <KVRow key={label} label={label} value={value} />)}
                <p className="py-1 pr-3 text-[11px] font-medium text-muted-foreground border-b border-dashed border-muted/60">Languages</p>
                <div className="py-1 text-[12px] border-b border-dashed border-muted/60 space-y-0.5">
                  {fixedLanguages.map(([lang, level]) => <p key={lang}>{lang} <span className="text-muted-foreground text-[11px]">({level})</span></p>)}
                  {otherLanguages.length > 0 && (
                    <button type="button" className="text-primary text-[11px] hover:underline" onClick={() => setShowOtherLanguages((p) => !p)}>
                      {showOtherLanguages ? "Hide others" : `+${otherLanguages.length} more`}
                    </button>
                  )}
                  {showOtherLanguages && otherLanguages.map(([lang, level]) => <p key={lang}>{lang} <span className="text-muted-foreground text-[11px]">({level})</span></p>)}
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-4">
              <div className="rounded-lg border overflow-hidden">
                <SectionHeader>Other Information</SectionHeader>
                <div className="p-3 space-y-1.5">
                  {availabilityRemarkItems.map((item) => {
                    const yes = item.keys.some((key) => Boolean(otherInformation[key]));
                    return (
                      <div key={item.label} className="flex items-center justify-between gap-2">
                        <span className="text-[11px] text-foreground">{item.label}</span>
                        <YesNoBadge yes={yes} />
                      </div>
                    );
                  })}
                </div>
              </div>
              <div className="rounded-lg border overflow-hidden">
                <SectionHeader>Availability</SectionHeader>
                <div className="grid grid-cols-[auto_1fr] p-3">
                  {availabilityRows.map(([label, value]) => <KVRow key={label} label={label} value={value} />)}
                </div>
              </div>
            </div>
          </div>

          {/* ── Maid Skills table ── */}
          <div className={`rounded-lg border overflow-hidden ${!isLoggedIn ? "select-none blur-sm" : ""}`}>
            <SectionHeader>Maid Skills</SectionHeader>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-muted/30 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                    <th className="px-4 py-2 text-left">Area of Work</th>
                    <th className="px-4 py-2 text-center w-20">Willing</th>
                    <th className="px-4 py-2 text-center w-32">Experience</th>
                    <th className="px-4 py-2 text-center w-36">
                      Evaluation<br />
                      <span className="font-normal normal-case">Stars out of 5</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y text-xs">
                  {orderedWorkAreas
                    .filter(([, config]) => {
                      const ev = String(config.evaluation || "").trim();
                      return Boolean(config.willing || config.experience || (ev && ev !== "-" && ev !== "N.A."));
                    })
                    .map(([area, config]) => {
                      const rawAge = String(workAreaNotes["Care of infants/children"] || "").trim();
                      const formattedAge = rawAge ? rawAge.replace(/\s*-\s*/g, "–") : "";
                      const needsYears = formattedAge && !/year/i.test(formattedAge);
                      const areaLabel = area === "Care of infants/children" && formattedAge
                        ? `Care of infants/children (${formattedAge}${needsYears ? " years" : ""})`
                        : area;
                      const yrs = String(config.yearsOfExperience || "").trim();
                      return (
                        <tr key={area} className="hover:bg-muted/20">
                          <td className="px-4 py-2">{areaLabel}</td>
                          <td className="px-4 py-2 text-center"><YesNoBadge yes={Boolean(config.willing)} /></td>
                          <td className="px-4 py-2 text-center">
                            <div className="flex flex-col items-center gap-1">
                              <YesNoBadge yes={Boolean(config.experience)} />
                              {config.experience && yrs && (
                                <span className="text-[11px] text-muted-foreground">
                                  {yrs} {Number(yrs) === 1 ? "year" : "years"}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-2 text-center"><StarDisplay evaluation={config.evaluation} /></td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </div>

          {/* ── Cooking / Other skill notes ── */}
          {(workAreaNotes["Cooking"] || workAreaNotes["Other Skill"]) && (
            <div className={`grid gap-3 sm:grid-cols-2 ${!isLoggedIn ? "select-none blur-sm" : ""}`}>
              {workAreaNotes["Cooking"] && (
                <div className="rounded-lg border overflow-hidden">
                  <SectionHeader>Cooking Notes</SectionHeader>
                  <p className="p-3 text-xs whitespace-pre-wrap text-foreground">{workAreaNotes["Cooking"]}</p>
                </div>
              )}
              {workAreaNotes["Other Skill"] && (
                <div className="rounded-lg border overflow-hidden">
                  <SectionHeader>Other Skill Notes</SectionHeader>
                  <p className="p-3 text-xs whitespace-pre-wrap text-foreground">{workAreaNotes["Other Skill"]}</p>
                </div>
              )}
            </div>
          )}

          {/* ── Employment history ── */}
          {employment.length > 0 && (
            <div className={`rounded-lg border overflow-hidden ${!isLoggedIn ? "select-none blur-sm" : ""}`}>
              <SectionHeader>Employment History</SectionHeader>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b bg-muted/30 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                      {["From", "To", "Country", "Employer", "Duties", "Remarks"].map((h) => <th key={h} className="px-4 py-2 text-left">{h}</th>)}
                    </tr>
                  </thead>
                  <tbody className="divide-y text-xs">
                    {employment.map((item, index) => {
                      const row = item as Record<string, string>;
                      return (
                        <tr key={`${maid.referenceCode}-${index}`} className="hover:bg-muted/20">
                          <td className="px-4 py-1.5 whitespace-nowrap">{formatDate(row.from) === "N/A" ? "—" : formatDate(row.from)}</td>
                          <td className="px-4 py-1.5 whitespace-nowrap">{formatDate(row.to) === "N/A" ? "—" : formatDate(row.to)}</td>
                          <td className="px-4 py-1.5">{row.country || "—"}</td>
                          <td className="px-4 py-1.5">{row.employer || "—"}</td>
                          <td className="px-4 py-1.5">{row.duties || "—"}</td>
                          <td className="px-4 py-1.5">{row.remarks || "—"}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── Medical / Private info ── */}
          <div className={`grid grid-cols-1 gap-4 lg:grid-cols-2 ${!isLoggedIn ? "select-none blur-sm" : ""}`}>
            <div className="rounded-lg border overflow-hidden">
              <SectionHeader>Medical / Dietary</SectionHeader>
              <div className="grid grid-cols-[130px_1fr] p-4 text-sm">
                {medicalRows.map(([label, value]) => <KVRow key={label} label={label} value={value} />)}
              </div>
              {Object.keys(pastIllnesses).length > 0 && (
                <div className="border-t p-3">
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-2">Past Illnesses</p>
                  <div className="space-y-1">
                    {Object.entries(pastIllnesses).map(([illness, value]) => (
                      <div key={illness} className="flex items-center justify-between text-xs">
                        <span>{illness}</span>
                        {value ? <Check className="h-3.5 w-3.5 text-primary" /> : <span className="text-muted-foreground">—</span>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="rounded-lg border overflow-hidden">
              <SectionHeader>Private Information</SectionHeader>
              {canViewPrivateIntro ? (
                <div className="grid grid-cols-[130px_1fr] p-4 text-sm">
                  {privateRows.map(([label, value]) => <KVRow key={label} label={label} value={value} />)}
                </div>
              ) : (
                <div className="p-4 text-sm text-muted-foreground">
                  Private fields are hidden until employer login and email verification.
                </div>
              )}
            </div>
          </div>

          {/* ── Public / Private introduction ── */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div className="rounded-lg border overflow-hidden">
              <SectionHeader>Public Introduction</SectionHeader>
              <p className="p-4 text-sm whitespace-pre-wrap text-foreground leading-relaxed">
                {publicIntro || "No public introduction added yet."}
              </p>
            </div>
            {canViewPrivateIntro && (
              <div className="rounded-lg border border-amber-200 bg-amber-50/30 overflow-hidden">
                <SectionHeader>Private Introduction</SectionHeader>
                <p className="p-4 text-sm whitespace-pre-wrap text-foreground leading-relaxed">{String(introduction?.intro || "—")}</p>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between border-t pt-3 text-[11px] text-muted-foreground">
            <span>Last updated: {formatDate(maid.updatedAt)}</span>
            <span className={!isLoggedIn ? "blur-sm select-none" : ""}>Ref: {maid.referenceCode}</span>
          </div>
        </div>

        {/* ── Shortlist dialog ── */}
        <Dialog open={isShortlistOpen} onOpenChange={setIsShortlistOpen}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Star className="h-4 w-4 fill-amber-400 text-amber-500" />
                My Shortlist
                {shortlistRefs.length > 0 && (
                  <span className="inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-amber-100 px-1.5 text-[11px] font-bold text-amber-700">
                    {shortlistRefs.length}
                  </span>
                )}
              </DialogTitle>
              <DialogDescription>
                Click any profile to view full details. Tap the star to remove from shortlist.
              </DialogDescription>
            </DialogHeader>

            {shortlistRefs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-amber-50">
                  <Star className="h-7 w-7 text-amber-300" />
                </div>
                <p className="text-sm font-semibold text-foreground">No maids shortlisted yet</p>
                <p className="mt-1 max-w-xs text-xs text-muted-foreground">
                  Tap the star that appears on any profile card to add it to your shortlist.
                </p>
              </div>
            ) : (
              <div className="max-h-[68vh] overflow-y-auto pr-1">
                {isShortlistLoading ? (
                  <p className="py-8 text-center text-sm text-muted-foreground">Loading shortlist…</p>
                ) : (
                  <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-4 md:grid-cols-5">
                    {shortlistMaids.map((shortlistedMaid) => (
                      <article
                        key={`shortlist-${shortlistedMaid.referenceCode}`}
                        className="overflow-hidden rounded-xl border border-border bg-background"
                        style={{ aspectRatio: "3 / 4" }}
                      >
                        <div className="relative flex h-full flex-col">
                          <Link
                            to={`/maids/${encodeURIComponent(shortlistedMaid.referenceCode)}`}
                            className="relative flex-1 bg-muted"
                            onClick={() => setIsShortlistOpen(false)}
                          >
                            {getPrimaryPhoto(shortlistedMaid) ? (
                              <img
                                src={getPrimaryPhoto(shortlistedMaid)}
                                alt={shortlistedMaid.fullName}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center">
                                <svg className="h-6 w-6 text-muted-foreground/25" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0" />
                                </svg>
                              </div>
                            )}
                          </Link>
                          <div className="p-2">
                            <Link
                              to={`/maids/${encodeURIComponent(shortlistedMaid.referenceCode)}`}
                              className="line-clamp-1 text-[11px] font-semibold text-foreground hover:text-primary"
                              onClick={() => setIsShortlistOpen(false)}
                            >
                              {shortlistedMaid.fullName || `${shortlistedMaid.nationality || "Maid"} Maid`}
                            </Link>
                            <p className="line-clamp-1 text-[10px] text-muted-foreground">
                              {shortlistedMaid.nationality || "—"}
                              {calculateAge(shortlistedMaid.dateOfBirth) !== null
                                ? `, ${calculateAge(shortlistedMaid.dateOfBirth)} yrs`
                                : ""}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleToggleShortlist(shortlistedMaid.referenceCode)}
                            className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-white/80 shadow backdrop-blur-sm transition hover:bg-white"
                            title="Remove from shortlist"
                          >
                            <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-500" />
                          </button>
                        </div>
                      </article>
                    ))}

                    {missingShortlistRefs.map((ref) => (
                      <div
                        key={`missing-${ref}`}
                        className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-muted/20 p-3 text-center"
                        style={{ aspectRatio: "3 / 4" }}
                      >
                        <svg
                          className="h-6 w-6 text-muted-foreground/25"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={1.5}
                        >
                          <circle cx="12" cy="12" r="10" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01" />
                        </svg>
                        <p className="break-all font-mono text-[9px] text-muted-foreground/70">{ref}</p>
                        <p className="text-[9px] text-muted-foreground/50">Profile not found</p>
                        <button
                          type="button"
                          onClick={() => handleToggleShortlist(ref)}
                          className="text-[10px] font-medium text-destructive hover:underline"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="mt-4 flex items-center justify-between border-t border-border/60 pt-3">
                  <p className="text-xs text-muted-foreground">
                    <span className="font-medium text-foreground">{shortlistMaids.length}</span>{" "}
                    {shortlistMaids.length === 1 ? "profile" : "profiles"} shortlisted
                    {missingShortlistRefs.length > 0 && (
                      <span className="ml-1 text-muted-foreground/60">
                        · {missingShortlistRefs.length} not found
                      </span>
                    )}
                  </p>
                  <button
                    type="button"
                    onClick={() => shortlistRefs.forEach((ref) => handleToggleShortlist(ref))}
                    className="text-xs font-medium text-destructive hover:underline"
                  >
                    Clear all
                  </button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default PublicMaidProfile;
