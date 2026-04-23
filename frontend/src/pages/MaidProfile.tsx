import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { FileDown, Check, AlertTriangle, Star, Search } from "lucide-react";
import { MaidProfile, formatDate } from "@/lib/maids";
import { toast } from "@/components/ui/sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getClientToken, getStoredClient } from "@/lib/clientAuth";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { adminPath } from "@/lib/routes";
import { exportMaidProfileToPdf } from "@/lib/maidExport";
import SendMaidToClientDialog from "@/components/SendMaidToClientDialog";

type LocationState = { fromView?: "public" | "hidden" };

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

const fileToDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Failed to read image file"));
    reader.onload = () => resolve(String(reader.result || ""));
    reader.readAsDataURL(file);
  });

const SectionHeader = ({ children }: { children: React.ReactNode }) => (
  <div className="border-b bg-muted/30 px-4 py-2">
    <p className="text-sm font-bold uppercase tracking-widest text-black">{children}</p>
  </div>
);

const YesNoBadge = ({ yes }: { yes: boolean }) => (
  <span className={`inline-flex rounded-full px-2 py-0.5 text-sm font-semibold ${yes ? "bg-emerald-50 text-emerald-700" : "bg-muted text-black"}`}>
    {yes ? "Yes" : "No"}
  </span>
);

const KVRow = ({ label, value }: { label: string; value: string }) => (
  <div className="contents">
    <p className="py-1.5 pr-3 text-sm font-bold text-black border-b border-dashed border-muted/60 leading-snug">{label}</p>
    <p className="py-1.5 text-sm text-black border-b border-dashed border-muted/60 leading-snug">{value || "—"}</p>
  </div>
);

const StarDisplay = ({ evaluation }: { evaluation?: string }) => {
  const raw = String(evaluation || "").trim();
  if (!raw || raw === "—" || raw === "N.A." || raw === "-") {
    return <span className="text-black text-sm">N.A.</span>;
  }
  const match = raw.match(/^(\d+)\/5/);
  const rating = match ? parseInt(match[1], 10) : null;
  const note = raw.replace(/^\d+\/5\s*[-–]?\s*/, "").trim();
  if (rating === null) {
    return <span className="text-sm text-black">{raw}</span>;
  }
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="flex items-center gap-0.5">
        {Array.from({ length: 5 }, (_, i) => (
          <Star key={i} className={`h-5 w-5 ${i < rating ? "fill-primary text-primary" : "text-muted-foreground/30"}`} />
        ))}
      </div>
      {note && <span className="text-sm text-black leading-tight text-center">{note}</span>}
    </div>
  );
};

const MaidProfilePage = () => {
  const location = useLocation();
  const fromView = (location.state as LocationState | null)?.fromView;
  const { refCode } = useParams();
  const navigate = useNavigate();

  const [maid, setMaid] = useState<MaidProfile | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isThroughAgencyDialogOpen, setIsThroughAgencyDialogOpen] = useState(false);
  const [isDirectHireDialogOpen, setIsDirectHireDialogOpen] = useState(false);
  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false);
  const [isManagePhotosOpen, setIsManagePhotosOpen] = useState(false);
  const [isVideoModalOpen, setIsVideoModalOpen] = useState(false);
  const [isMediaSaving, setIsMediaSaving] = useState(false);
  const [videoLinkDraft, setVideoLinkDraft] = useState("");
  const [confirmExportOpen, setConfirmExportOpen] = useState(false);
  const [showOtherLanguages, setShowOtherLanguages] = useState(false);
  const [lightboxPhoto, setLightboxPhoto] = useState<string | null>(null);
  const [isBringingToTop, setIsBringingToTop] = useState(false);

  // ── Inline switch-maid search ──
  const [replaceSearch, setReplaceSearch] = useState("");
  const [replaceResults, setReplaceResults] = useState<MaidProfile[]>([]);
  const [isReplaceSearching, setIsReplaceSearching] = useState(false);
  const [showReplaceResults, setShowReplaceResults] = useState(false);
  const replaceRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (replaceRef.current && !replaceRef.current.contains(e.target as Node)) {
        setShowReplaceResults(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleReplaceSearch = async () => {
    const q = replaceSearch.trim();
    if (!q) return;
    try {
      setIsReplaceSearching(true);
      setShowReplaceResults(true);
      const response = await fetch(`/api/maids?search=${encodeURIComponent(q)}`);
      const data = (await response.json()) as { maids?: MaidProfile[]; error?: string };
      if (!response.ok) throw new Error(data.error || "Search failed");
      setReplaceResults((data.maids || []).filter((m) => m.referenceCode !== maid?.referenceCode));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Search failed");
    } finally {
      setIsReplaceSearching(false);
    }
  };

  const handleSelectReplace = (targetRefCode: string) => {
    setShowReplaceResults(false);
    setReplaceSearch("");
    setReplaceResults([]);
    navigate(adminPath(`/maid/${encodeURIComponent(targetRefCode)}`), { replace: true });
  };

  const otherLanguages = useMemo(() => {
    const allowedKeys = new Set<string>(fixedLanguageKeyMap.flatMap((item) => item.keys).map(String));
    return Object.entries(maid?.languageSkills || {})
      .map(([language, level]) => [language, String(level || "")] as const)
      .filter(([language, level]) => !allowedKeys.has(language) && level.trim());
  }, [maid?.languageSkills]);

  useEffect(() => { setShowOtherLanguages(false); }, [maid?.referenceCode]);

  const handleBack = () => {
    if (fromView) navigate(adminPath("/edit-maids"), { state: { fromView } });
    else navigate(adminPath("/edit-maids"));
  };

  const handleBringToTop = async () => {
    if (!maid || isBringingToTop) return;
    try {
      setIsBringingToTop(true);
      // Try dedicated endpoint first; fallback to a PUT that bumps updatedAt
      const response = await fetch(`/api/maids/${encodeURIComponent(maid.referenceCode)}/bring-to-top`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
      });
      if (response.status === 404) {
        const putResponse = await fetch(`/api/maids/${encodeURIComponent(maid.referenceCode)}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...maid, updatedAt: new Date().toISOString() }),
        });
        const putData = (await putResponse.json().catch(() => ({}))) as { error?: string; maid?: MaidProfile };
        if (!putResponse.ok || !putData.maid) throw new Error(putData.error || "Failed to bring to top");
        setMaid(putData.maid);
      } else {
        const data = (await response.json().catch(() => ({}))) as { error?: string; maid?: MaidProfile };
        if (!response.ok) throw new Error(data.error || "Failed to bring to top");
        if (data.maid) setMaid(data.maid);
      }
      toast.success(`"${maid.fullName}" brought to the top of listings`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to bring maid to top");
    } finally {
      setIsBringingToTop(false);
    }
  };

  useEffect(() => {
    const loadMaid = async () => {
      if (!refCode) return;
      try {
        const response = await fetch(`/api/maids/${encodeURIComponent(refCode)}`);
        const data = (await response.json()) as { error?: string; maid?: MaidProfile };
        if (!response.ok || !data.maid) throw new Error(data.error || "Failed to load maid");
        setMaid(data.maid);
        setVideoLinkDraft(data.maid.videoDataUrl || "");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to load maid");
        navigate(adminPath("/edit-maids"));
      }
    };
    void loadMaid();
  }, [navigate, refCode]);

  const handleDelete = async () => {
    if (!maid) return;
    try {
      setIsDeleting(true);
      const response = await fetch(`/api/maids/${encodeURIComponent(maid.referenceCode)}`, { method: "DELETE" });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error || "Failed to delete maid");
      toast.success("Maid profile deleted successfully");
      navigate(adminPath("/edit-maids"));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete maid");
    } finally {
      setIsDeleting(false);
      setIsDeleteDialogOpen(false);
    }
  };

  const handleExportPdf = () => {
    try { exportMaidProfileToPdf(maid); toast.success("Print dialog opened"); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Export failed"); }
  };

  if (!maid) {
    return (
      <div className="page-container">
        <div className="content-card py-10 text-center text-black text-base">Loading maid profile…</div>
      </div>
    );
  }

  const agencyContact = maid.agencyContact as Record<string, unknown>;
  const introduction = maid.introduction as Record<string, unknown>;
  const skillsPreferences = maid.skillsPreferences as Record<string, unknown>;
  const otherInformation = (skillsPreferences.otherInformation as Record<string, boolean>) || {};
  const workAreaNotes = (skillsPreferences.workAreaNotes as Record<string, string>) || {};
  const pastIllnesses = (introduction.pastIllnesses as Record<string, boolean>) || {};
  const workAreasOrder = ["Care of infants/children","Care of elderly","Care of disabled","General housework","Cooking","Language abilities (spoken)","Other skills, if any"] as const;
  const rawWorkAreas = Object.entries(maid.workAreas || {}) as Array<[string, { willing?: boolean; experience?: boolean; evaluation?: string; yearsOfExperience?: string; rating?: number; note?: string }]>;
  const workAreas = workAreasOrder.map((area) => rawWorkAreas.find(([key]) => key === area) ?? null).filter(Boolean) as Array<[string, { willing?: boolean; experience?: boolean; evaluation?: string; yearsOfExperience?: string; rating?: number; note?: string }]>;
  const employment = Array.isArray(maid.employmentHistory) ? maid.employmentHistory : [];

  const fixedLanguages = fixedLanguageKeyMap
    .map((item) => { const level = item.keys.map((key) => (maid.languageSkills || {})[key]).find((val) => String(val || "").trim()); return level ? [item.label, String(level)] as const : null; })
    .filter(Boolean) as Array<[string, string]>;

  const photos = Array.isArray(maid.photoDataUrls) && maid.photoDataUrls.length > 0 ? maid.photoDataUrls : maid.photoDataUrl ? [maid.photoDataUrl] : [];
  const passportOrTwoByTwoPhoto = photos[0] ?? "";
  const fullBodyPhoto = photos[1] ?? "";
  const extraPhotos = photos.slice(2);
  const youtubeEmbedUrl = getYouTubeEmbedUrl(maid.videoDataUrl);
  const storedClient = getStoredClient() as (ReturnType<typeof getStoredClient> & { emailVerified?: boolean }) | null;
  const canViewPrivateIntro = Boolean(getClientToken() && storedClient?.emailVerified === true);

  const savePhotos = async (nextPhotos: string[]) => {
    const cleaned = nextPhotos.filter(Boolean).slice(0, 5);
    try {
      setIsMediaSaving(true);
      const response = await fetch(`/api/maids/${encodeURIComponent(maid.referenceCode)}`, {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...maid, photoDataUrls: cleaned, photoDataUrl: cleaned[0] || "", hasPhoto: cleaned.length > 0 } satisfies MaidProfile),
      });
      const data = (await response.json().catch(() => ({}))) as { error?: string; maid?: MaidProfile };
      if (!response.ok || !data.maid) throw new Error(data.error || "Failed to update photos");
      setMaid(data.maid); toast.success("Photos updated");
    } catch (error) { toast.error(error instanceof Error ? error.message : "Failed to update photos"); }
    finally { setIsMediaSaving(false); }
  };

  const replacePhotoAt = async (index: number, file?: File) => { if (!file) return; try { const dataUrl = await fileToDataUrl(file); const next = [...photos]; next[index] = dataUrl; await savePhotos(next); } catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); } };
  const addExtraPhoto = async (file?: File) => { if (!file) return; try { const dataUrl = await fileToDataUrl(file); await savePhotos([...photos, dataUrl]); } catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); } };
  const removePhotoAt = async (index: number) => { await savePhotos(photos.filter((_, i) => i !== index)); };

  const saveVideoLink = async () => {
    try {
      setIsMediaSaving(true);
      const response = await fetch(`/api/maids/${encodeURIComponent(maid.referenceCode)}/video`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ videoDataUrl: videoLinkDraft.trim() }),
      });
      const data = (await response.json().catch(() => ({}))) as { error?: string; maid?: MaidProfile };
      if (!response.ok || !data.maid) throw new Error(data.error || "Failed to update video link");
      setMaid(data.maid); toast.success("Video link updated"); setIsVideoModalOpen(false);
    } catch (error) { toast.error(error instanceof Error ? error.message : "Failed to update video link"); }
    finally { setIsMediaSaving(false); }
  };

  const detailRows: Array<[string, string]> = [
    ["Maid Name", maid.fullName],
    ["Ref. Code", maid.referenceCode],
    ["Type", maid.type],
    ["Nationality", maid.nationality],
    ["Category", String((agencyContact["indianMaidCategory"] ?? introduction["indianMaidCategory"] ?? skillsPreferences["indianMaidCategory"] ?? "N/A") as string | number | boolean)],
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
    ["Home Contact No.", String(agencyContact.homeCountryContactNumber || "N/A")],
  ];

  const medicalRows: Array<[string, string]> = [
    ["Allergies", String(introduction.allergies || "N/A")],
    ["Disabilities", String(introduction.physicalDisabilities || "N/A")],
    ["Dietary", String(introduction.dietaryRestrictions || "N/A")],
    ["Food Handling", String(introduction.foodHandlingPreferences || "N/A")],
    ["Other Illnesses", String(introduction.otherIllnesses || "N/A")],
    ["Remarks", String(introduction.otherRemarks || "N/A")],
  ];

  const availabilityRows: Array<[string, string]> = [
    ["Available From", String(introduction.availability || "N/A")],
    ["Contract Ends", String(introduction.contractEnds || "N/A")],
    ["Present Salary", String(introduction.presentSalary || "N/A")],
    ["Expected Salary", String(introduction.expectedSalary || "N/A")],
    ["Offday Comp.", String(introduction.offdayCompensation || "N/A")],
    ["Off-days/Month", String(skillsPreferences.offDaysPerMonth || "N/A")],
    ["Avail. Remark", String(skillsPreferences.availabilityRemark || "N/A")],
  ];

  const privateRows: Array<[string, string]> = [
    ["Passport No.", String(agencyContact.passportNo || "N/A")],
    ["Ages of Children", String(introduction.agesOfChildren || "N/A")],
    ["Maid Loan", String(introduction.maidLoan || "N/A")],
    ["Private Info", String(skillsPreferences.privateInfo || "N/A")],
  ];

  /* ── nav link styles ── */
  const navLink = "text-blue-700 underline text-sm font-medium cursor-pointer hover:text-blue-900 transition-colors whitespace-nowrap";
  const navSep = <span className="text-black select-none mx-1.5 text-sm">|</span>;

  return (
    <div className="page-container text-black">

      {/* ── Lightbox ── */}
      {lightboxPhoto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm" onClick={() => setLightboxPhoto(null)}>
          <div className="relative" onClick={(e) => e.stopPropagation()}>
            <img src={lightboxPhoto} alt="Full size" className="max-h-[90vh] max-w-[90vw] rounded-lg object-contain" />
            <button className="absolute -top-3 -right-3 flex h-7 w-7 items-center justify-center rounded-full bg-white text-black text-xs font-bold shadow" onClick={() => setLightboxPhoto(null)}>✕</button>
          </div>
        </div>
      )}

      {/* ── Edit/Delete Maid header + Search Bar ── */}
      <div className="mb-4">
        {/* Header row: icon + title */}
        <div className="flex items-center justify-center gap-3 mb-3">
          {/* Maid+magnifier icon — matches the screenshot */}
          <div className="relative shrink-0 w-14 h-14">
            {/* person silhouette */}
            <svg viewBox="0 0 56 56" xmlns="http://www.w3.org/2000/svg" className="absolute inset-0 w-full h-full">
              <circle cx="22" cy="14" r="10" fill="#5a3e2b" />
              <ellipse cx="22" cy="36" rx="14" ry="12" fill="#5a3e2b" />
              {/* magnifier glass */}
              <circle cx="36" cy="36" r="10" fill="none" stroke="#cc2200" strokeWidth="3.5" />
              <line x1="43" y1="43" x2="51" y2="51" stroke="#cc2200" strokeWidth="4" strokeLinecap="round" />
              {/* white glare on lens */}
              <circle cx="33" cy="33" r="2.5" fill="white" fillOpacity="0.4" />
            </svg>
          </div>
          <h1
            className="text-2xl font-bold text-black"
            style={{ fontFamily: "Tahoma, MS Sans Serif, sans-serif" }}
          >
            Edit/Delete Maid
          </h1>
        </div>

        {/* Search row */}
        <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1" ref={replaceRef}>
          <label
            className="text-sm text-black select-none"
            style={{ fontFamily: "Tahoma, MS Sans Serif, sans-serif" }}
          >
            Maid name or Code:
          </label>
          <div className="relative flex items-center">
            <Search className="absolute left-1.5 h-3.5 w-3.5 text-gray-500 pointer-events-none" />
            <input
              type="text"
              value={replaceSearch}
              onChange={(e) => {
                setReplaceSearch(e.target.value);
                if (!e.target.value.trim()) setShowReplaceResults(false);
              }}
              onKeyDown={(e) => { if (e.key === "Enter") void handleReplaceSearch(); }}
              className="text-sm text-black pl-6 pr-1.5 py-[2px] w-52 bg-white focus:outline-none"
              style={{
                border: "2px inset #808080",
                boxShadow: "inset 1px 1px 2px rgba(0,0,0,0.2)",
                fontFamily: "Tahoma, MS Sans Serif, sans-serif",
              }}
            />

            {/* Results dropdown */}
            {showReplaceResults && (
              <div className="absolute left-0 top-full z-50 w-80 border border-gray-400 bg-white shadow-lg max-h-72 overflow-y-auto"
                style={{ borderColor: "#808080" }}
              >
                {isReplaceSearching ? (
                  <div className="px-3 py-2 text-sm text-black">Searching…</div>
                ) : replaceResults.length === 0 ? (
                  <div className="px-3 py-2 text-sm text-black">No results found.</div>
                ) : (
                  replaceResults.map((result) => {
                    const thumb =
                      Array.isArray(result.photoDataUrls) && result.photoDataUrls.length > 0
                        ? result.photoDataUrls[0]
                        : result.photoDataUrl ?? null;
                    return (
                      <button
                        key={result.referenceCode}
                        type="button"
                        onClick={() => handleSelectReplace(result.referenceCode)}
                        className="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-[#0a246a] hover:text-white border-b border-gray-100 last:border-b-0 group"
                      >
                        <div className="h-10 w-8 shrink-0 overflow-hidden border border-gray-200 bg-gray-100 flex items-center justify-center">
                          {thumb
                            ? <img src={thumb} alt={result.fullName} className="h-full w-full object-contain" />
                            : <span className="text-[9px] text-gray-400 text-center leading-tight">No photo</span>}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold truncate">{result.fullName}</p>
                          <p className="text-xs opacity-70">
                            {result.referenceCode}
                            {result.nationality ? ` · ${result.nationality}` : ""}
                            {result.type ? ` · ${result.type}` : ""}
                          </p>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            )}
          </div>

          {/* Classic Windows "Search" button */}
          <button
            type="button"
            onClick={() => void handleReplaceSearch()}
            disabled={isReplaceSearching || !replaceSearch.trim()}
            className="text-black text-sm px-4 py-[2px] disabled:opacity-50 disabled:cursor-not-allowed active:translate-y-px select-none"
            style={{
              fontFamily: "Tahoma, MS Sans Serif, sans-serif",
              background: "linear-gradient(to bottom, #f5f5f5, #e0e0e0)",
              border: "1px solid #808080",
              boxShadow: "inset 1px 1px 0 #ffffff, inset -1px -1px 0 #7a7a7a, 1px 1px 0 #000000",
              minWidth: 64,
            }}
          >
            {isReplaceSearching ? "Searching…" : "Search"}
          </button>
        </div>{/* end search row */}
      </div>{/* end header+search block */}

      {/* ══════════════════════════════════════════════
          BOND PAPER WRAPPER — all biodata content inside
      ══════════════════════════════════════════════ */}
      <div
        className="bg-white mx-auto px-8 py-6"
        style={{
          border: "1px solid #c8c4b8",
          boxShadow:
            "0 1px 0 #e8e4dc, 0 2px 0 #d8d4cc, 0 3px 0 #c8c4bc, " +
            "2px 4px 12px rgba(0,0,0,0.18), 4px 8px 24px rgba(0,0,0,0.09)",
          backgroundColor: "#fefefe",
          backgroundImage:
            "repeating-linear-gradient(to bottom, transparent, transparent 27px, rgba(0,0,80,0.03) 27px, rgba(0,0,80,0.03) 28px)",
          maxWidth: "100%",
        }}
      >
        {/* ── Top Navigation Bar — inside bond paper ── */}
        <div className="mb-5 pb-2 border-b-2 border-gray-300">
          <div className="flex flex-wrap items-center gap-y-1.5">
            <span
              onClick={() => void handleBringToTop()}
              className={`${navLink} ${isBringingToTop ? "opacity-60 cursor-wait" : ""}`}
            >
              {isBringingToTop ? "Moving to Top…" : "Bring this Maid to Top"}
            </span>
            {navSep}
            <span onClick={handleBack} className={navLink}>View All Maids</span>
            {navSep}
            <span onClick={() => navigate(adminPath(`/maid/${encodeURIComponent(maid.referenceCode)}/edit`))} className={navLink}>Edit This Maid</span>
            {navSep}
            <span onClick={() => setIsManagePhotosOpen(true)} className={navLink}>Manage Photos</span>
            {navSep}
            <span onClick={() => setIsVideoModalOpen(true)} className={navLink}>YouTube Video</span>
            {navSep}
            <span
              onClick={() => setIsDeleteDialogOpen(true)}
              className="text-red-600 underline text-sm font-medium cursor-pointer hover:text-red-800 transition-colors whitespace-nowrap"
            >
              {isDeleting ? "Deleting…" : "Delete"}
            </span>
          </div>
        </div>

        {/* ── Main Top Row: Video | Agency | Photos+PDF ── */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-[1fr_230px_auto] mb-6 items-start">

          {/* Left: Video Box */}
          <div className="relative min-h-[210px] overflow-hidden rounded border-2 border-gray-400 bg-gray-50">
            {youtubeEmbedUrl ? (
              <iframe className="absolute inset-0 h-full w-full" src={youtubeEmbedUrl} title="YouTube video"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                referrerPolicy="strict-origin-when-cross-origin" allowFullScreen />
            ) : maid.videoDataUrl ? (
              <video controls className="absolute inset-0 h-full w-full object-cover" src={maid.videoDataUrl} />
            ) : (
              <div className="flex min-h-[210px] flex-col items-start justify-center p-5 gap-3">
                <p className="text-sm text-black leading-relaxed">
                  It appears that you do not have a video on-line for this maid. You can upload a video file to accompany this maid.
                </p>
                <button
                  onClick={() => setIsVideoModalOpen(true)}
                  className="text-blue-700 underline text-sm font-medium hover:text-blue-900 transition-colors"
                >
                  Click here to upload the video file for this maid.
                </button>
              </div>
            )}
          </div>

          {/* Middle: Agency Info */}
          <div className="rounded border-2 border-gray-400 bg-white p-4 space-y-1">
            <p className="text-base font-bold text-black leading-snug">To contact her agency,</p>
            <p className="text-sm font-bold text-black leading-snug">
              {String(agencyContact.companyName || "At The Agency (formerly Rinzin Agency Pte. Ltd)")}
            </p>
            <p className="text-sm text-black">(License No.: {String(agencyContact.licenseNo || "25C3114")}),</p>
            <p className="text-sm text-black">
              Please call <span className="font-bold">{String(agencyContact.contactPerson || "Bala")}</span>
            </p>
            <p className="text-sm text-black">
              at <span className="font-bold text-blue-700 text-base">{String(agencyContact.phone || "80730757")}</span>
            </p>
          </div>

          {/* Right: PDF Download + Photos */}
          <div className="flex flex-col gap-3 items-start">
            <button
              onClick={handleExportPdf}
              className="flex items-center gap-2 text-blue-700 underline text-sm font-medium hover:text-blue-900 transition-colors"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded bg-red-600 shrink-0">
                <FileDown className="h-5 w-5 text-white" />
              </span>
              Download Maid Bio-data in PDF
            </button>

            <p className="text-sm font-bold text-black">{photos.length}/5 photos</p>

            <div className="flex gap-2">
              <div className="flex flex-col items-center gap-1">
                <button
                  type="button"
                  disabled={!passportOrTwoByTwoPhoto}
                  onClick={() => passportOrTwoByTwoPhoto && setLightboxPhoto(passportOrTwoByTwoPhoto)}
                  className="group relative flex h-36 w-28 items-center justify-center overflow-hidden rounded border-2 border-gray-400 bg-gray-100 transition hover:border-blue-400 disabled:cursor-default"
                >
                  {passportOrTwoByTwoPhoto ? (
                    <>
                      <img src={passportOrTwoByTwoPhoto} alt="passport" className="h-full w-full object-contain" />
                      <span className="absolute inset-0 flex items-end justify-center bg-black/20 pb-1 opacity-0 transition-opacity group-hover:opacity-100">
                        <span className="rounded bg-black/60 px-1.5 py-0.5 text-xs text-white">View</span>
                      </span>
                    </>
                  ) : <span className="text-sm text-black">No photo</span>}
                </button>
                {maid.type && (
                  <span className="text-xs font-bold text-white bg-green-600 px-2 py-0.5 rounded uppercase">
                    {maid.type.replace(" maid", "").toUpperCase()}
                  </span>
                )}
              </div>
              <div className="flex flex-col items-center gap-1">
                <button
                  type="button"
                  disabled={!fullBodyPhoto}
                  onClick={() => fullBodyPhoto && setLightboxPhoto(fullBodyPhoto)}
                  className="group relative flex h-52 w-28 items-center justify-center overflow-hidden rounded border-2 border-gray-400 bg-gray-100 transition hover:border-blue-400 disabled:cursor-default"
                >
                  {fullBodyPhoto ? (
                    <>
                      <img src={fullBodyPhoto} alt="full body" className="h-full w-full object-contain" />
                      <span className="absolute inset-0 flex items-end justify-center bg-black/20 pb-1 opacity-0 transition-opacity group-hover:opacity-100">
                        <span className="rounded bg-black/60 px-1.5 py-0.5 text-xs text-white">View</span>
                      </span>
                    </>
                  ) : <span className="text-sm text-black">No photo</span>}
                </button>
                {maid.type && (
                  <span className="text-xs font-bold text-white bg-green-600 px-2 py-0.5 rounded uppercase">
                    {maid.type.replace(" maid", "").toUpperCase()}
                  </span>
                )}
              </div>
            </div>

            {extraPhotos.length > 0 && (
              <div className="flex gap-1.5 flex-wrap">
                {extraPhotos.map((photo, index) => (
                  <button
                    key={`${photo}-${index}`}
                    type="button"
                    onClick={() => setLightboxPhoto(photo)}
                    className="group relative h-16 w-16 overflow-hidden rounded border border-gray-400 bg-gray-100 transition hover:border-blue-400"
                  >
                    <img src={photo} alt={`extra ${index + 1}`} className="h-full w-full object-contain" />
                    <span className="absolute inset-0 bg-black/20 opacity-0 transition-opacity group-hover:opacity-100" />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── Personal Details + Other Info ── */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_280px] mb-4">
          <div className="rounded border border-gray-300 overflow-hidden">
            <SectionHeader>Personal Details</SectionHeader>
            <div className="grid grid-cols-[165px_1fr] p-4">
              {detailRows.map(([label, value]) => <KVRow key={label} label={label} value={value} />)}
              <p className="py-1.5 pr-3 text-sm font-bold text-black border-b border-dashed border-muted/60">Languages</p>
              <div className="py-1.5 text-sm text-black border-b border-dashed border-muted/60 space-y-0.5">
                {fixedLanguages.map(([lang, level]) => (
                  <p key={lang}>{lang} <span className="text-black">({level})</span></p>
                ))}
                {otherLanguages.length > 0 && (
                  <button type="button" className="text-blue-700 underline text-sm hover:text-blue-900" onClick={() => setShowOtherLanguages((p) => !p)}>
                    {showOtherLanguages ? "Hide others" : `+${otherLanguages.length} more`}
                  </button>
                )}
                {showOtherLanguages && otherLanguages.map(([lang, level]) => (
                  <p key={lang}>{lang} <span className="text-black">({level})</span></p>
                ))}
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-4">
            <div className="rounded border border-gray-300 overflow-hidden">
              <SectionHeader>Other Information</SectionHeader>
              <div className="p-3 space-y-2">
                {availabilityRemarkItems.map((item) => {
                  const yes = item.keys.some((key) => Boolean(otherInformation[key]));
                  return (
                    <div key={item.label} className="flex items-center justify-between gap-2">
                      <span className="text-sm text-black">{item.label}</span>
                      <YesNoBadge yes={yes} />
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="rounded border border-gray-300 overflow-hidden">
              <SectionHeader>Availability</SectionHeader>
              <div className="grid grid-cols-[auto_1fr] p-3">
                {availabilityRows.map(([label, value]) => <KVRow key={label} label={label} value={value} />)}
              </div>
            </div>
          </div>
        </div>

        {/* ── Skills Table ── */}
        <div className="rounded border border-gray-300 overflow-hidden mb-4">
          <SectionHeader>Maid Skills</SectionHeader>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-muted/30 text-sm font-bold uppercase tracking-wide text-black">
                  <th className="px-4 py-3 text-left">Area of Work</th>
                  <th className="px-4 py-3 text-center w-24">Willing</th>
                  <th className="px-4 py-3 text-center w-40">
                    Experience<br />
                    <span className="font-normal normal-case text-sm text-black">If yes, no. of years</span>
                  </th>
                  <th className="px-4 py-3 text-center w-44">
                    Evaluation<br />
                    <span className="font-normal normal-case text-sm text-black">Stars out of 5</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y text-sm">
                {workAreas
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
                      <tr key={area} className="hover:bg-gray-50">
                        <td className="px-4 py-2.5 text-black">{areaLabel}</td>
                        <td className="px-4 py-2.5 text-center"><YesNoBadge yes={Boolean(config.willing)} /></td>
                        <td className="px-4 py-2.5 text-center">
                          <div className="flex flex-col items-center gap-1">
                            <YesNoBadge yes={Boolean(config.experience)} />
                            {config.experience && yrs && (
                              <span className="text-sm text-black">{yrs} {Number(yrs) === 1 ? "year" : "years"}</span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-2.5 text-center">
                          <StarDisplay evaluation={config.evaluation} />
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── Cooking / Other Skill Notes ── */}
        {(workAreaNotes["Cooking"] || workAreaNotes["Other Skill"]) && (
          <div className="grid gap-3 sm:grid-cols-2 mb-4">
            {workAreaNotes["Cooking"] && (
              <div className="rounded border border-gray-300 overflow-hidden">
                <SectionHeader>Cooking Notes</SectionHeader>
                <p className="p-3 text-sm whitespace-pre-wrap text-black">{workAreaNotes["Cooking"]}</p>
              </div>
            )}
            {workAreaNotes["Other Skill"] && (
              <div className="rounded border border-gray-300 overflow-hidden">
                <SectionHeader>Other Skill Notes</SectionHeader>
                <p className="p-3 text-sm whitespace-pre-wrap text-black">{workAreaNotes["Other Skill"]}</p>
              </div>
            )}
          </div>
        )}

        {/* ── Employment History ── */}
        {employment.length > 0 && (
          <div className="rounded border border-gray-300 overflow-hidden mb-4">
            <SectionHeader>Employment History</SectionHeader>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-muted/30 text-sm font-bold uppercase tracking-wide text-black">
                    {["From","To","Country","Employer","Duties","Remarks"].map((h) => (
                      <th key={h} className="px-4 py-3 text-left">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y text-sm">
                  {employment.map((e, i) => {
                    const row = e as Record<string, string>;
                    return (
                      <tr key={i} className="hover:bg-gray-50">
                        <td className="px-4 py-2 whitespace-nowrap text-black">{formatDate(row.from) === "N/A" ? "—" : formatDate(row.from)}</td>
                        <td className="px-4 py-2 whitespace-nowrap text-black">{formatDate(row.to) === "N/A" ? "—" : formatDate(row.to)}</td>
                        <td className="px-4 py-2 text-black">{row.country || "—"}</td>
                        <td className="px-4 py-2 text-black">{row.employer || "—"}</td>
                        <td className="px-4 py-2 text-black">{row.duties || "—"}</td>
                        <td className="px-4 py-2 text-black">{row.remarks || "—"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── Medical / Private ── */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 mb-4">
          <div className="rounded border border-gray-300 overflow-hidden">
            <SectionHeader>Medical / Dietary</SectionHeader>
            <div className="grid grid-cols-[145px_1fr] p-4">
              {medicalRows.map(([label, value]) => <KVRow key={label} label={label} value={value} />)}
            </div>
            {Object.keys(pastIllnesses).length > 0 && (
              <div className="border-t p-3">
                <p className="text-sm font-bold uppercase tracking-widest text-black mb-2">Past Illnesses</p>
                <div className="space-y-1.5">
                  {Object.entries(pastIllnesses).map(([illness, value]) => (
                    <div key={illness} className="flex items-center justify-between text-sm">
                      <span className="text-black">{illness}</span>
                      <YesNoBadge yes={Boolean(value)} />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          <div className="rounded border border-gray-300 overflow-hidden">
            <SectionHeader>Private Information</SectionHeader>
            <div className="grid grid-cols-[145px_1fr] p-4">
              {privateRows.map(([label, value]) => <KVRow key={label} label={label} value={value} />)}
            </div>
          </div>
        </div>

        {/* ── Introductions ── */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 mb-4">
          <div className="rounded border border-gray-300 overflow-hidden">
            <SectionHeader>Public Introduction</SectionHeader>
            <p className="p-4 text-sm whitespace-pre-wrap text-black leading-relaxed">
              {String(introduction.publicIntro || "No public introduction added yet.")}
            </p>
          </div>
          {canViewPrivateIntro && (
            <div className="rounded border border-amber-300 bg-amber-50/30 overflow-hidden">
              <SectionHeader>Private Introduction</SectionHeader>
              <p className="p-4 text-sm whitespace-pre-wrap text-black leading-relaxed">
                {String(introduction.intro || "—")}
              </p>
            </div>
          )}
        </div>

        {/* ── Footer ── */}
        <div className="flex items-center justify-between border-t pt-3 text-sm text-black">
          <span>Last updated: {formatDate(maid.updatedAt)}</span>
          <span>Hits: 1</span>
        </div>

      </div>
      {/* ══ end bond paper ══ */}

      {/* ── Delete Dialog ── */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={(open) => { if (!isDeleting) setIsDeleteDialogOpen(open); }}>
        <DialogContent className="max-w-sm p-0 overflow-hidden">
          <div className="bg-red-50 px-6 pt-6 pb-4 text-center border-b border-red-200">
            <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-red-100 ring-4 ring-red-50">
              <AlertTriangle className="h-5 w-5 text-red-600" />
            </div>
            <DialogTitle className="text-base font-bold text-black">Delete this profile?</DialogTitle>
            <DialogDescription className="mt-1 text-sm text-black">
              <span className="font-bold">{maid.fullName}</span>{" "}
              <span className="font-mono text-sm">({maid.referenceCode})</span>
            </DialogDescription>
          </div>
          <div className="px-6 py-4 space-y-3">
            <p className="text-sm font-bold uppercase tracking-widest text-red-600">This will permanently remove:</p>
            <div className="space-y-1.5">
              {["All bio-data and personal information","Uploaded photos and video link","Employment history and skill records","This action cannot be undone"].map((item, i) => (
                <div key={item} className="flex items-start gap-2.5 text-sm text-black">
                  <span className={`mt-1.5 h-1.5 w-1.5 rounded-full shrink-0 ${i === 3 ? "bg-red-600" : "bg-red-300"}`} />
                  <span className={i === 3 ? "font-bold text-red-600" : ""}>{item}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="flex gap-2 border-t bg-gray-50 px-6 py-4">
            <Button variant="outline" className="flex-1 text-sm font-medium" onClick={() => setIsDeleteDialogOpen(false)} disabled={isDeleting}>Cancel</Button>
            <Button variant="destructive" className="flex-1 text-sm font-medium" disabled={isDeleting} onClick={() => void handleDelete()}>
              {isDeleting
                ? <span className="flex items-center gap-2"><span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />Deleting…</span>
                : "Yes, delete permanently"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Export PDF Confirm Dialog ── */}
      <Dialog open={confirmExportOpen} onOpenChange={setConfirmExportOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-black">Export PDF?</DialogTitle>
            <DialogDescription className="text-sm text-black">
              Export bio-data for <span className="font-bold">{maid.fullName}</span> ({maid.referenceCode}). This will open the print dialog.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmExportOpen(false)}>Cancel</Button>
            <Button onClick={() => { setConfirmExportOpen(false); handleExportPdf(); }}>Export PDF</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <SendMaidToClientDialog maid={maid} open={isThroughAgencyDialogOpen} onOpenChange={setIsThroughAgencyDialogOpen} actionType="interested" onSuccess={(u) => setMaid(u)} />
      <SendMaidToClientDialog maid={maid} open={isDirectHireDialogOpen} onOpenChange={setIsDirectHireDialogOpen} actionType="direct_hire" onSuccess={(u) => setMaid(u)} />
      <SendMaidToClientDialog maid={maid} open={isRejectDialogOpen} onOpenChange={setIsRejectDialogOpen} actionType="rejected" onSuccess={(u) => setMaid(u)} />

      {/* ── Manage Photos Dialog ── */}
      <Dialog open={isManagePhotosOpen} onOpenChange={setIsManagePhotosOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-black">Manage Photos</DialogTitle>
            <DialogDescription className="text-sm text-black">Slot 1: Passport Size · Slot 2: Full body · Slots 3–5: Extra</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
            <div className="space-y-2">
              <p className="text-sm font-bold text-black">Passport Size</p>
              <div className="h-36 overflow-hidden rounded border bg-gray-100 flex items-center justify-center text-sm text-black">
                {passportOrTwoByTwoPhoto ? <img src={passportOrTwoByTwoPhoto} alt="passport" className="h-full w-full object-contain" /> : "No photo"}
              </div>
              <p className="text-sm text-blue-600">Required: 100×125 px</p>
              <input type="file" accept="image/*" disabled={isMediaSaving} className="text-sm" onChange={(e) => void replacePhotoAt(0, e.target.files?.[0])} />
              <Button type="button" variant="outline" size="sm" disabled={isMediaSaving || !passportOrTwoByTwoPhoto} onClick={() => void removePhotoAt(0)}>Remove</Button>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-bold text-black">Full body</p>
              <div className="h-52 overflow-hidden rounded border bg-gray-100 flex items-center justify-center text-sm text-black">
                {fullBodyPhoto ? <img src={fullBodyPhoto} alt="full body" className="h-full w-full object-contain" /> : "No photo"}
              </div>
              <p className="text-sm text-blue-600">Required: 240×400 px</p>
              <input type="file" accept="image/*" disabled={isMediaSaving} className="text-sm" onChange={(e) => void replacePhotoAt(1, e.target.files?.[0])} />
              <Button type="button" variant="outline" size="sm" disabled={isMediaSaving || !fullBodyPhoto} onClick={() => void removePhotoAt(1)}>Remove</Button>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-bold text-black">Extra ({extraPhotos.length}/3)</p>
              <div className="grid grid-cols-3 gap-1.5">
                {extraPhotos.map((photo, index) => (
                  <div key={`${photo}-${index}`} className="relative h-16 overflow-hidden rounded border bg-gray-100">
                    <img src={photo} alt={`extra ${index + 1}`} className="h-full w-full object-contain" />
                    <button type="button" className="absolute right-0.5 top-0.5 rounded bg-black/70 text-white px-1 text-sm" onClick={() => void removePhotoAt(index + 2)} disabled={isMediaSaving}>✕</button>
                  </div>
                ))}
              </div>
              <input type="file" accept="image/*" disabled={isMediaSaving || photos.length >= 5} className="text-sm" onChange={(e) => void addExtraPhoto(e.target.files?.[0])} />
              <p className="text-sm text-black">Max 5 total</p>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsManagePhotosOpen(false)} disabled={isMediaSaving}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Video Dialog ── */}
      <Dialog open={isVideoModalOpen} onOpenChange={(next) => { setIsVideoModalOpen(next); if (next) setVideoLinkDraft(maid.videoDataUrl || ""); }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-black">Video Link</DialogTitle>
            <DialogDescription className="text-sm text-black">Paste a YouTube or direct video URL.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="flex gap-2">
              <Input value={videoLinkDraft} onChange={(e) => setVideoLinkDraft(e.target.value)} placeholder="https://youtube.com/watch?v=..." className="flex-1 text-sm text-black" />
              <Button type="button" onClick={() => void saveVideoLink()} disabled={isMediaSaving}>{isMediaSaving ? "Saving…" : "Save"}</Button>
              {videoLinkDraft.trim() && !getYouTubeEmbedUrl(videoLinkDraft) && (
                <a className="inline-flex h-10 items-center justify-center rounded-md border px-3 text-sm text-black hover:bg-muted" href={videoLinkDraft.trim()} download target="_blank" rel="noreferrer">Download</a>
              )}
            </div>
            <div className="relative min-h-[200px] overflow-hidden rounded border bg-gray-50">
              {getYouTubeEmbedUrl(videoLinkDraft) ? (
                <iframe className="absolute inset-0 h-full w-full" src={getYouTubeEmbedUrl(videoLinkDraft) ?? undefined} title="YouTube video"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  referrerPolicy="strict-origin-when-cross-origin" allowFullScreen />
              ) : videoLinkDraft.trim() ? (
                <video controls className="absolute inset-0 h-full w-full object-cover" src={videoLinkDraft.trim()} />
              ) : (
                <div className="flex min-h-[200px] items-center justify-center text-sm text-black">No video link yet.</div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsVideoModalOpen(false)} disabled={isMediaSaving}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
};

export default MaidProfilePage;