import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { ArrowLeft, Edit, Image, Trash2, Youtube, FileDown, Check, FileText, Sheet, Send } from "lucide-react";
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
import { exportMaidProfileToExcel, exportMaidProfileToPdf, exportMaidProfileToWord } from "@/lib/maidExport";
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
    <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">{children}</p>
  </div>
);

const MaidProfilePage = () => {
  const location = useLocation();
  const fromView = (location.state as LocationState | null)?.fromView;
  const { refCode } = useParams();
  const navigate = useNavigate();
  const [maid, setMaid] = useState<MaidProfile | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isThroughAgencyDialogOpen, setIsThroughAgencyDialogOpen] = useState(false);
  const [isDirectHireDialogOpen, setIsDirectHireDialogOpen] = useState(false);
  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false);
  const [isManagePhotosOpen, setIsManagePhotosOpen] = useState(false);
  const [isVideoModalOpen, setIsVideoModalOpen] = useState(false);
  const [isMediaSaving, setIsMediaSaving] = useState(false);
  const [videoLinkDraft, setVideoLinkDraft] = useState("");
  const [confirmExportOpen, setConfirmExportOpen] = useState(false);
  const [pendingExportType, setPendingExportType] = useState<"pdf" | "word" | "excel" | null>(null);
  const [showOtherLanguages, setShowOtherLanguages] = useState(false);
  const [lightboxPhoto, setLightboxPhoto] = useState<string | null>(null);

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
      toast.success("Maid deleted");
      navigate(adminPath("/edit-maids"));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete maid");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleExportWord = () => { try { exportMaidProfileToWord(maid); toast.success("Word downloaded"); } catch (e) { toast.error(e instanceof Error ? e.message : "Export failed"); } };
  const handleExportExcel = () => { try { exportMaidProfileToExcel(maid); toast.success("Excel downloaded"); } catch (e) { toast.error(e instanceof Error ? e.message : "Export failed"); } };
  const handleExportPdf = () => { try { exportMaidProfileToPdf(maid); toast.success("Print dialog opened"); } catch (e) { toast.error(e instanceof Error ? e.message : "Export failed"); } };
  const requestExport = (type: "pdf" | "word" | "excel") => { setPendingExportType(type); setConfirmExportOpen(true); };
  const confirmExport = () => {
    const type = pendingExportType;
    setConfirmExportOpen(false); setPendingExportType(null);
    if (type === "pdf") handleExportPdf();
    if (type === "word") handleExportWord();
    if (type === "excel") handleExportExcel();
  };

  if (!maid) {
    return (
      <div className="page-container">
        <div className="content-card py-10 text-center text-muted-foreground text-sm">Loading maid profile…</div>
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
  const rawWorkAreas = Object.entries(maid.workAreas || {}) as Array<[string, { willing?: boolean; experience?: boolean; evaluation?: string }]>;
  const workAreas = workAreasOrder.map((area) => rawWorkAreas.find(([key]) => key === area) ?? null).filter(Boolean) as Array<[string, { willing?: boolean; experience?: boolean; evaluation?: string }]>;
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
    ["Name", maid.fullName], ["Ref. Code", maid.referenceCode], ["Type", maid.type], ["Nationality", maid.nationality],
    ["Category", String((agencyContact["indianMaidCategory"] ?? introduction["indianMaidCategory"] ?? skillsPreferences["indianMaidCategory"] ?? "N/A") as string | number | boolean)],
    ["Date of Birth", formatDate(maid.dateOfBirth)], ["Place of Birth", maid.placeOfBirth],
    ["Height / Weight", `${maid.height}cm / ${maid.weight}kg`], ["Religion", maid.religion],
    ["Marital Status", maid.maritalStatus], ["Children", String(maid.numberOfChildren)],
    ["Siblings", String(maid.numberOfSiblings)], ["Home Address", maid.homeAddress],
    ["Repatriation Airport", maid.airportRepatriation], ["Education", maid.educationLevel],
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

  const YesNoBadge = ({ yes }: { yes: boolean }) => (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${yes ? "bg-emerald-50 text-emerald-700" : "bg-muted text-muted-foreground"}`}>
      {yes ? "Yes" : "No"}
    </span>
  );

  const KVRow = ({ label, value }: { label: string; value: string }) => (
    <div className="contents">
      <p className="py-1 pr-3 text-[11px] font-medium text-muted-foreground border-b border-dashed border-muted/60 leading-snug">{label}</p>
      <p className="py-1 text-[12px] border-b border-dashed border-muted/60 leading-snug">{value || "—"}</p>
    </div>
  );

  return (
    <div className="page-container">

      {lightboxPhoto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm" onClick={() => setLightboxPhoto(null)}>
          <div className="relative" onClick={(e) => e.stopPropagation()}>
            <img src={lightboxPhoto} alt="Full size" className="max-h-[90vh] max-w-[90vw] rounded-lg object-contain" />
            <button className="absolute -top-3 -right-3 flex h-7 w-7 items-center justify-center rounded-full bg-white text-black text-xs font-bold shadow" onClick={() => setLightboxPhoto(null)}>✕</button>
          </div>
        </div>
      )}

      <div className="mb-3">
        <button onClick={handleBack} className="group inline-flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors">
          <ArrowLeft className="h-3 w-3 transition-transform group-hover:-translate-x-0.5" /> Back to all maids
        </button>
      </div>

      <div className="content-card animate-fade-in-up space-y-4">

        <div className="flex flex-wrap items-center gap-x-0.5 gap-y-1 rounded-lg border bg-muted/20 px-2 py-1.5">
          <button onClick={handleBack} className="rounded px-2.5 py-1 text-[11px] text-primary hover:bg-muted transition-colors">All Maids</button>
          <button onClick={() => navigate(adminPath(`/maid/${encodeURIComponent(maid.referenceCode)}/full`))} className="rounded px-2.5 py-1 text-[11px] text-primary hover:bg-muted transition-colors">Full View</button>
          <span className="mx-1 text-muted-foreground/40 text-xs select-none">|</span>
          <button onClick={() => navigate(adminPath(`/maid/${encodeURIComponent(maid.referenceCode)}/edit`))} className="flex items-center gap-1 rounded px-2.5 py-1 text-[11px] text-primary hover:bg-muted transition-colors"><Edit className="h-3 w-3" />Edit</button>
          <button onClick={() => setIsManagePhotosOpen(true)} className="flex items-center gap-1 rounded px-2.5 py-1 text-[11px] text-primary hover:bg-muted transition-colors"><Image className="h-3 w-3" />Photos</button>
          <button onClick={() => setIsVideoModalOpen(true)} className="flex items-center gap-1 rounded px-2.5 py-1 text-[11px] text-primary hover:bg-muted transition-colors"><Youtube className="h-3 w-3" />Video</button>
          <span className="mx-1 text-muted-foreground/40 text-xs select-none">|</span>
          <button onClick={() => requestExport("pdf")} className="flex items-center gap-1 rounded px-2.5 py-1 text-[11px] text-primary hover:bg-muted transition-colors"><FileDown className="h-3 w-3" />PDF</button>
          <button onClick={() => requestExport("word")} className="flex items-center gap-1 rounded px-2.5 py-1 text-[11px] text-primary hover:bg-muted transition-colors"><FileText className="h-3 w-3" />Word</button>
          <button onClick={() => requestExport("excel")} className="flex items-center gap-1 rounded px-2.5 py-1 text-[11px] text-primary hover:bg-muted transition-colors"><Sheet className="h-3 w-3" />Excel</button>
          <span className="mx-1 text-muted-foreground/40 text-xs select-none">|</span>
          <button onClick={() => setIsThroughAgencyDialogOpen(true)} className="flex items-center gap-1 rounded px-2.5 py-1 text-[11px] text-primary hover:bg-muted transition-colors"><Send className="h-3 w-3" />Agency</button>
          <button onClick={() => setIsDirectHireDialogOpen(true)} className="flex items-center gap-1 rounded px-2.5 py-1 text-[11px] text-primary hover:bg-muted transition-colors"><Send className="h-3 w-3" />Direct Hire</button>
          <button onClick={() => setIsRejectDialogOpen(true)} className="flex items-center gap-1 rounded px-2.5 py-1 text-[11px] text-muted-foreground hover:bg-muted transition-colors"><Send className="h-3 w-3" />Reject</button>
          <span className="mx-1 text-muted-foreground/40 text-xs select-none">|</span>
          <button
            onClick={() => { if (isDeleting) return; if (!window.confirm("Delete this maid profile?")) return; void handleDelete(); }}
            disabled={isDeleting}
            className="flex items-center gap-1 rounded px-2.5 py-1 text-[11px] text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-50"
          >
            <Trash2 className="h-3 w-3" />{isDeleting ? "Deleting…" : "Delete"}
          </button>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-[1fr_200px_auto]">

          <div className="relative min-h-[180px] overflow-hidden rounded-lg border bg-muted/20">
            {youtubeEmbedUrl ? (
              <iframe className="absolute inset-0 h-full w-full" src={youtubeEmbedUrl} title="YouTube video"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                referrerPolicy="strict-origin-when-cross-origin" allowFullScreen />
            ) : maid.videoDataUrl ? (
              <video controls className="absolute inset-0 h-full w-full object-cover" src={maid.videoDataUrl} />
            ) : (
              <div className="flex min-h-[180px] items-center justify-center p-4 text-center">
                <p className="text-xs text-muted-foreground">No video yet — upload via Edit Maid.</p>
              </div>
            )}
          </div>

          <div className="rounded-lg border bg-muted/10 p-3 space-y-1 text-xs">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-2">Agency</p>
            <p className="font-semibold text-foreground leading-snug">{String(agencyContact.companyName || "At The Agency (formerly Rinzin Agency Pte. Ltd)")}</p>
            <p className="text-muted-foreground">Lic. No.: {String(agencyContact.licenseNo || "2503114")}</p>
            <p>Contact: <span className="font-semibold">{String(agencyContact.contactPerson || "Bala")}</span></p>
            <p>Phone: <span className="font-semibold text-primary">{String(agencyContact.phone || "80730757")}</span></p>
            {agencyContact.passportNo && <p className="text-muted-foreground">{String(agencyContact.passportNo)}</p>}
            <div className="pt-2 mt-1 border-t">
              <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-semibold ${(maid.status || "available") === "available" ? "bg-emerald-50 text-emerald-700" : "bg-muted text-muted-foreground"}`}>
                <span className="h-1.5 w-1.5 rounded-full bg-current" />{maid.status || "available"}
              </span>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">{photos.length}/5 photos</p>
            <div className="flex gap-2">
              <div className="flex flex-col items-center gap-1">
                <span className="text-[9px] text-muted-foreground uppercase tracking-wide">Passport</span>
                <button type="button" disabled={!passportOrTwoByTwoPhoto} onClick={() => passportOrTwoByTwoPhoto && setLightboxPhoto(passportOrTwoByTwoPhoto)}
                  className="group relative flex h-32 w-24 items-center justify-center overflow-hidden rounded-lg border-2 border-dashed border-muted bg-muted/20 transition hover:border-primary/40 disabled:cursor-default">
                  {passportOrTwoByTwoPhoto ? (
                    <><img src={passportOrTwoByTwoPhoto} alt="passport" className="h-full w-full object-contain" />
                    <span className="absolute inset-0 flex items-end justify-center bg-black/20 pb-1 opacity-0 transition-opacity group-hover:opacity-100"><span className="rounded bg-black/60 px-1.5 py-0.5 text-[9px] text-white">View</span></span></>
                  ) : <span className="text-[10px] text-muted-foreground">No photo</span>}
                </button>
              </div>
              <div className="flex flex-col items-center gap-1">
                <span className="text-[9px] text-muted-foreground uppercase tracking-wide">Full body</span>
                <button type="button" disabled={!fullBodyPhoto} onClick={() => fullBodyPhoto && setLightboxPhoto(fullBodyPhoto)}
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
                  <button key={`${photo}-${index}`} type="button" onClick={() => setLightboxPhoto(photo)}
                    className="group relative h-14 w-14 overflow-hidden rounded-md border border-muted bg-muted/20 transition hover:border-primary/40">
                    <img src={photo} alt={`extra ${index + 1}`} className="h-full w-full object-contain" />
                    <span className="absolute inset-0 bg-black/20 opacity-0 transition-opacity group-hover:opacity-100" />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_260px]">

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

        <div className="rounded-lg border overflow-hidden">
          <SectionHeader>Maid Skills</SectionHeader>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-muted/30 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  <th className="px-4 py-2 text-left">Area of Work</th>
                  <th className="px-4 py-2 text-center w-20">Willing</th>
                  <th className="px-4 py-2 text-center w-20">Exp.</th>
                  <th className="px-4 py-2 text-center w-24">Evaluation</th>
                </tr>
              </thead>
              <tbody className="divide-y text-xs">
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
                      ? `Care of infants/children (${formattedAge}${needsYears ? " years" : ""})` : area;
                    return (
                      <tr key={area} className="hover:bg-muted/20">
                        <td className="px-4 py-2">{areaLabel}</td>
                        <td className="px-4 py-2 text-center"><YesNoBadge yes={Boolean(config.willing)} /></td>
                        <td className="px-4 py-2 text-center"><YesNoBadge yes={Boolean(config.experience)} /></td>
                        <td className="px-4 py-2 text-center text-muted-foreground">{config.evaluation || "—"}</td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </div>

        {(workAreaNotes["Cooking"] || workAreaNotes["Other Skill"]) && (
          <div className="grid gap-3 sm:grid-cols-2">
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

        {employment.length > 0 && (
          <div className="rounded-lg border overflow-hidden">
            <SectionHeader>Employment History</SectionHeader>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-muted/30 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                    {["From","To","Country","Employer","Duties","Remarks"].map((h) => (
                      <th key={h} className="px-4 py-2 text-left">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y text-xs">
                  {employment.map((e, i) => {
                    const row = e as Record<string, string>;
                    return (
                      <tr key={i} className="hover:bg-muted/20">
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

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
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
            <div className="grid grid-cols-[130px_1fr] p-4 text-sm">
              {privateRows.map(([label, value]) => <KVRow key={label} label={label} value={value} />)}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="rounded-lg border overflow-hidden">
            <SectionHeader>Public Introduction</SectionHeader>
            <p className="p-4 text-sm whitespace-pre-wrap text-foreground leading-relaxed">
              {String(introduction.publicIntro || "No public introduction added yet.")}
            </p>
          </div>
          {canViewPrivateIntro && (
            <div className="rounded-lg border border-amber-200 bg-amber-50/30 overflow-hidden">
              <SectionHeader>Private Introduction</SectionHeader>
              <p className="p-4 text-sm whitespace-pre-wrap text-foreground leading-relaxed">
                {String(introduction.intro || "—")}
              </p>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between border-t pt-3 text-[11px] text-muted-foreground">
          <span>Last updated: {formatDate(maid.updatedAt)}</span>
          <span>Hits: 1</span>
        </div>

      </div>


      <Dialog open={confirmExportOpen} onOpenChange={(open) => { setConfirmExportOpen(open); if (!open) setPendingExportType(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{pendingExportType === "pdf" ? "Export PDF?" : pendingExportType === "word" ? "Export Word?" : "Export Excel?"}</DialogTitle>
            <DialogDescription>
              Export bio-data for <span className="font-semibold">{maid.fullName}</span> ({maid.referenceCode}).{" "}
              {pendingExportType === "pdf" ? "This will open the print dialog." : "A file will be downloaded."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmExportOpen(false)}>Cancel</Button>
            <Button onClick={confirmExport}>{pendingExportType === "pdf" ? "Export PDF" : pendingExportType === "word" ? "Export Word" : "Export Excel"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <SendMaidToClientDialog maid={maid} open={isThroughAgencyDialogOpen} onOpenChange={setIsThroughAgencyDialogOpen} actionType="interested" onSuccess={(u) => setMaid(u)} />
      <SendMaidToClientDialog maid={maid} open={isDirectHireDialogOpen} onOpenChange={setIsDirectHireDialogOpen} actionType="direct_hire" onSuccess={(u) => setMaid(u)} />
      <SendMaidToClientDialog maid={maid} open={isRejectDialogOpen} onOpenChange={setIsRejectDialogOpen} actionType="rejected" onSuccess={(u) => setMaid(u)} />

      <Dialog open={isManagePhotosOpen} onOpenChange={setIsManagePhotosOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Manage Photos</DialogTitle>
            <DialogDescription>Slot 1: Passport/2×2 · Slot 2: Full body · Slots 3–5: Extra</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
            <div className="space-y-2">
              <p className="text-xs font-semibold">Passport / 2×2</p>
              <div className="h-36 overflow-hidden rounded border bg-muted/20 flex items-center justify-center text-xs text-muted-foreground">
                {passportOrTwoByTwoPhoto ? <img src={passportOrTwoByTwoPhoto} alt="passport" className="h-full w-full object-contain" /> : "No photo"}
              </div>
              <p className="text-[10px] text-blue-600">Required: 100×125 px</p>
              <input type="file" accept="image/*" disabled={isMediaSaving} className="text-xs" onChange={(e) => void replacePhotoAt(0, e.target.files?.[0])} />
              <Button type="button" variant="outline" size="sm" disabled={isMediaSaving || !passportOrTwoByTwoPhoto} onClick={() => void removePhotoAt(0)}>Remove</Button>
            </div>
            <div className="space-y-2">
              <p className="text-xs font-semibold">Full body</p>
              <div className="h-52 overflow-hidden rounded border bg-muted/20 flex items-center justify-center text-xs text-muted-foreground">
                {fullBodyPhoto ? <img src={fullBodyPhoto} alt="full body" className="h-full w-full object-contain" /> : "No photo"}
              </div>
              <p className="text-[10px] text-blue-600">Required: 240×400 px</p>
              <input type="file" accept="image/*" disabled={isMediaSaving} className="text-xs" onChange={(e) => void replacePhotoAt(1, e.target.files?.[0])} />
              <Button type="button" variant="outline" size="sm" disabled={isMediaSaving || !fullBodyPhoto} onClick={() => void removePhotoAt(1)}>Remove</Button>
            </div>
            <div className="space-y-2">
              <p className="text-xs font-semibold">Extra ({extraPhotos.length}/3)</p>
              <div className="grid grid-cols-3 gap-1.5">
                {extraPhotos.map((photo, index) => (
                  <div key={`${photo}-${index}`} className="relative h-16 overflow-hidden rounded border bg-muted/20">
                    <img src={photo} alt={`extra ${index + 1}`} className="h-full w-full object-contain" />
                    <button type="button" className="absolute right-0.5 top-0.5 rounded bg-black/70 text-white px-1 text-[10px]" onClick={() => void removePhotoAt(index + 2)} disabled={isMediaSaving}>✕</button>
                  </div>
                ))}
              </div>
              <input type="file" accept="image/*" disabled={isMediaSaving || photos.length >= 5} className="text-xs" onChange={(e) => void addExtraPhoto(e.target.files?.[0])} />
              <p className="text-[10px] text-muted-foreground">Max 5 total</p>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsManagePhotosOpen(false)} disabled={isMediaSaving}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isVideoModalOpen} onOpenChange={(next) => { setIsVideoModalOpen(next); if (next) setVideoLinkDraft(maid.videoDataUrl || ""); }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Video Link</DialogTitle>
            <DialogDescription>Paste a YouTube or direct video URL.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="flex gap-2">
              <Input value={videoLinkDraft} onChange={(e) => setVideoLinkDraft(e.target.value)} placeholder="https://youtube.com/watch?v=..." className="flex-1" />
              <Button type="button" onClick={() => void saveVideoLink()} disabled={isMediaSaving}>{isMediaSaving ? "Saving…" : "Save"}</Button>
              {videoLinkDraft.trim() && !getYouTubeEmbedUrl(videoLinkDraft) && (
                <a className="inline-flex h-10 items-center justify-center rounded-md border px-3 text-sm hover:bg-muted" href={videoLinkDraft.trim()} download target="_blank" rel="noreferrer">Download</a>
              )}
            </div>
            <div className="relative min-h-[200px] overflow-hidden rounded-lg border bg-muted/20">
              {getYouTubeEmbedUrl(videoLinkDraft) ? (
                <iframe className="absolute inset-0 h-full w-full" src={getYouTubeEmbedUrl(videoLinkDraft) ?? undefined} title="YouTube video"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  referrerPolicy="strict-origin-when-cross-origin" allowFullScreen />
              ) : videoLinkDraft.trim() ? (
                <video controls className="absolute inset-0 h-full w-full object-cover" src={videoLinkDraft.trim()} />
              ) : (
                <div className="flex min-h-[200px] items-center justify-center text-xs text-muted-foreground">No video link yet.</div>
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