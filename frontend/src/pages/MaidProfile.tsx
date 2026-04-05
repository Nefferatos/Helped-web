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

type LocationState = {
  fromView?: "public" | "hidden";
};

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
      if (url.pathname.startsWith("/watch")) {
        const id = url.searchParams.get("v");
        return id ? `https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}` : null;
      }

      if (url.pathname.startsWith("/embed/")) {
        const id = url.pathname.split("/embed/")[1]?.split("/")[0];
        return id ? `https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}` : null;
      }

      if (url.pathname.startsWith("/shorts/")) {
        const id = url.pathname.split("/shorts/")[1]?.split("/")[0];
        return id ? `https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}` : null;
      }
    }
  } catch {
    // Not a URL -> ignore
  }

  return null;
};

const fileToDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Failed to read image file"));
    reader.onload = () => resolve(String(reader.result || ""));
    reader.readAsDataURL(file);
  });

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

  const otherLanguages = useMemo(() => {
    const allowedKeys = new Set<string>(fixedLanguageKeyMap.flatMap((item) => item.keys).map(String));
    return Object.entries(maid?.languageSkills || {})
      .map(([language, level]) => [language, String(level || "")] as const)
      .filter(([language, level]) => !allowedKeys.has(language) && level.trim());
  }, [maid?.languageSkills]);

  useEffect(() => {
    setShowOtherLanguages(false);
  }, [maid?.referenceCode]);

  const handleBack = () => {
    if (fromView) {
      navigate(adminPath("/edit-maids"), {
        state: { fromView },
      });
    } else {
      navigate(adminPath("/edit-maids"));
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
      toast.success("Maid deleted");
      navigate(adminPath("/edit-maids"));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete maid");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleExportWord = () => {
    try {
      exportMaidProfileToWord(maid);
      toast.success("Word bio-data downloaded");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to export Word bio-data");
    }
  };

  const handleExportExcel = () => {
    try {
      exportMaidProfileToExcel(maid);
      toast.success("Excel bio-data downloaded");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to export Excel bio-data");
    }
  };

  const handleExportPdf = () => {
    try {
      exportMaidProfileToPdf(maid);
      toast.success("Print dialog opened for PDF export");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to export PDF bio-data");
    }
  };

  const requestExport = (type: "pdf" | "word" | "excel") => {
    setPendingExportType(type);
    setConfirmExportOpen(true);
  };

  const confirmExport = () => {
    const type = pendingExportType;
    setConfirmExportOpen(false);
    setPendingExportType(null);
    if (!type) return;
    if (type === "pdf") handleExportPdf();
    if (type === "word") handleExportWord();
    if (type === "excel") handleExportExcel();
  };

  if (!maid) {
    return (
      <div className="page-container">
        <div className="content-card py-10 text-center text-muted-foreground">Loading maid profile...</div>
      </div>
    );
  }

  const agencyContact = maid.agencyContact as Record<string, unknown>;
  const introduction = maid.introduction as Record<string, unknown>;
  const skillsPreferences = maid.skillsPreferences as Record<string, unknown>;
  const otherInformation = (skillsPreferences.otherInformation as Record<string, boolean>) || {};
  const workAreaNotes = (skillsPreferences.workAreaNotes as Record<string, string>) || {};
  const pastIllnesses = (introduction.pastIllnesses as Record<string, boolean>) || {};
  const workAreasOrder = [
    "Care of infants/children",
    "Care of elderly",
    "Care of disabled",
    "General housework",
    "Cooking",
    "Language abilities (spoken)",
    "Other skills, if any",
  ] as const;

  const rawWorkAreas = Object.entries(maid.workAreas || {}) as Array<[string, { willing?: boolean; experience?: boolean; evaluation?: string }]>;
  const workAreas = workAreasOrder
    .map((area) => rawWorkAreas.find(([key]) => key === area) ?? null)
    .filter(Boolean) as Array<[string, { willing?: boolean; experience?: boolean; evaluation?: string; yearsOfExperience?: string; rating?: number | null; note?: string }]>;
  const employment = Array.isArray(maid.employmentHistory) ? maid.employmentHistory : [];

  const fixedLanguages = fixedLanguageKeyMap
    .map((item) => {
      const level = item.keys.map((key) => (maid.languageSkills || {})[key]).find((val) => String(val || "").trim());
      return level ? [item.label, String(level)] as const : null;
    })
    .filter(Boolean) as Array<[string, string]>;
  const photos =
    Array.isArray(maid.photoDataUrls) && maid.photoDataUrls.length > 0
      ? maid.photoDataUrls
      : maid.photoDataUrl
      ? [maid.photoDataUrl]
      : [];
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
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...maid,
          photoDataUrls: cleaned,
          photoDataUrl: cleaned[0] || "",
          hasPhoto: cleaned.length > 0,
        } satisfies MaidProfile),
      });
      const data = (await response.json().catch(() => ({}))) as { error?: string; maid?: MaidProfile };
      if (!response.ok || !data.maid) {
        throw new Error(data.error || "Failed to update photos");
      }
      setMaid(data.maid);
      toast.success("Photos updated");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update photos");
    } finally {
      setIsMediaSaving(false);
    }
  };

  const replacePhotoAt = async (index: number, file?: File) => {
    if (!file) return;
    try {
      const dataUrl = await fileToDataUrl(file);
      const next = [...photos];
      next[index] = dataUrl;
      await savePhotos(next);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to read photo");
    }
  };

  const addExtraPhoto = async (file?: File) => {
    if (!file) return;
    try {
      const dataUrl = await fileToDataUrl(file);
      await savePhotos([...photos, dataUrl]);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to read photo");
    }
  };

  const removePhotoAt = async (index: number) => {
    await savePhotos(photos.filter((_, i) => i !== index));
  };

  const saveVideoLink = async () => {
    try {
      setIsMediaSaving(true);
      const response = await fetch(`/api/maids/${encodeURIComponent(maid.referenceCode)}/video`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ videoDataUrl: videoLinkDraft.trim() }),
      });
      const data = (await response.json().catch(() => ({}))) as { error?: string; maid?: MaidProfile };
      if (!response.ok || !data.maid) {
        throw new Error(data.error || "Failed to update video link");
      }
      setMaid(data.maid);
      toast.success("Video link updated");
      setIsVideoModalOpen(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update video link");
    } finally {
      setIsMediaSaving(false);
    }
  };
  const detailRows: Array<[string, string]> = [
    ["Maid Name", maid.fullName],
    ["Ref. Code", maid.referenceCode],
    ["Type", maid.type],
    ["Nationality", maid.nationality],
    [
      "Category",
      String(
        (agencyContact["indianMaidCategory"] ?? introduction["indianMaidCategory"] ?? skillsPreferences["indianMaidCategory"] ?? "N/A") as
          | string
          | number
          | boolean,
      ),
    ],
    ["Date of Birth", formatDate(maid.dateOfBirth)],
    ["Place of Birth", maid.placeOfBirth],
    ["Height/Weight", `${maid.height}cm / ${maid.weight}Kg`],
    ["Religion", maid.religion],
    ["Marital Status", maid.maritalStatus],
    ["Number of Children", String(maid.numberOfChildren)],
    ["Number Of Siblings", String(maid.numberOfSiblings)],
    ["Address in Home Country", maid.homeAddress],
    ["Airport To Be Repatriated", maid.airportRepatriation],
    ["Education", maid.educationLevel],
    ["Home Country Contact No.", String(agencyContact.homeCountryContactNumber || "N/A")],
  ];
  const medicalRows: Array<[string, string]> = [
    ["Allergies", String(introduction.allergies || "N/A")],
    ["Physical Disabilities", String(introduction.physicalDisabilities || "N/A")],
    ["Dietary Restrictions", String(introduction.dietaryRestrictions || "N/A")],
    ["Food Handling Preferences", String(introduction.foodHandlingPreferences || "N/A")],
    ["Other Illnesses", String(introduction.otherIllnesses || "N/A")],
    ["Other Remarks", String(introduction.otherRemarks || "N/A")],
  ];
  const availabilityRows: Array<[string, string]> = [
    ["Available From", String(introduction.availability || "N/A")],
    ["Contract Ends", String(introduction.contractEnds || "N/A")],
    ["Present Salary", String(introduction.presentSalary || "N/A")],
    ["Expected Salary", String(introduction.expectedSalary || "N/A")],
    ["Offday Compensation", String(introduction.offdayCompensation || "N/A")],
    ["Off-days Per Month", String(skillsPreferences.offDaysPerMonth || "N/A")],
    ["Availability Remark", String(skillsPreferences.availabilityRemark || "N/A")],
  ];
  const privateRows: Array<[string, string]> = [
    ["Passport No.", String(agencyContact.passportNo || "N/A")],
    ["Ages of Children", String(introduction.agesOfChildren || "N/A")],
    ["Maid Loan", String(introduction.maidLoan || "N/A")],
    ["Private Info", String(skillsPreferences.privateInfo || "N/A")],
  ];

  return (
    <div className="page-container">
      <div className="mb-4 flex items-center gap-3">
        <button
          onClick={handleBack}
          className="group inline-flex items-center gap-1 text-sm font-medium text-primary
                    transition-colors hover:text-primary/80 active:scale-95
                    focus:outline-none focus:ring-2 focus:ring-primary/30 rounded-md">
          <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
          Back
        </button>
      </div>

      <div className="content-card animate-fade-in-up space-y-6">
        <div className="flex flex-wrap items-center gap-4 border-b pb-4 text-sm">
          <button className="text-primary hover:underline" onClick={handleBack} >View All Maids</button>
          <button
            className="text-primary hover:underline"
            onClick={() => navigate(adminPath(`/maid/${encodeURIComponent(maid.referenceCode)}/full`))}
          >
            Full View
          </button>
          <button
            className="flex items-center gap-1 text-primary hover:underline"
            onClick={() => navigate(adminPath(`/maid/${encodeURIComponent(maid.referenceCode)}/edit`))}
          >
            <Edit className="h-3 w-3" /> Edit This Maid
          </button>
          <button className="flex items-center gap-1 text-primary hover:underline" onClick={() => setIsManagePhotosOpen(true)}><Image className="h-3 w-3" /> Manage Photos</button>
          <button className="flex items-center gap-1 text-primary hover:underline" onClick={() => setIsVideoModalOpen(true)}><Youtube className="h-3 w-3" /> Video Link</button>
          <button className="flex items-center gap-1 text-destructive hover:underline" onClick={() => void handleDelete()}><Trash2 className="h-3 w-3" /> {isDeleting ? "Deleting..." : "Delete"}</button>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          <div className="relative min-h-[200px] w-full overflow-hidden rounded-lg border bg-muted/30">
            {youtubeEmbedUrl ? (
              <iframe
                className="absolute top-0 left-0 h-full w-full"
                src={youtubeEmbedUrl}
                title="YouTube video"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                referrerPolicy="strict-origin-when-cross-origin"
                allowFullScreen
              />
            ) : maid.videoDataUrl ? (
              <video controls className="absolute top-0 left-0 h-full w-full object-cover" src={maid.videoDataUrl}>
                Your browser does not support the video tag.
              </video>
            ) : (
              <div className="flex h-full w-full items-center justify-center text-center p-4">
                <p className="text-sm text-muted-foreground">No uploaded video yet. Upload via Edit Maid.</p>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <p className="text-sm font-semibold text-primary">To contact her agency,</p>
            <p className="text-sm font-bold">{String(agencyContact.companyName || "At The Agency (formerly Rinzin Agency Pte. Ltd)")}</p>
            <p className="text-sm">(License No.: {String(agencyContact.licenseNo || "2503114")}),</p>
            <p className="text-sm">Please call <span className="font-bold">{String(agencyContact.contactPerson || "Bala")}</span></p>
            <p className="text-sm">at <span className="font-bold text-primary">{String(agencyContact.phone || "80730757")}</span></p>
            <p className="pt-2 text-sm font-semibold">{String(agencyContact.passportNo || "")}</p>
          </div>

          <div className="flex flex-col items-center gap-4">
            <div className="grid w-full grid-cols-2 gap-3">
              <div className="space-y-2">
                <p className="text-xs font-semibold text-muted-foreground text-center">Passport / 2x2</p>
                <div className="mx-auto flex h-28 w-28 items-center justify-center overflow-hidden rounded border bg-muted text-xs text-muted-foreground">
                  {passportOrTwoByTwoPhoto ? (
                    <img src={passportOrTwoByTwoPhoto} alt={`${maid.fullName} passport`} className="h-full w-full object-cover" />
                  ) : (
                    "No Photo"
                  )}
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-xs font-semibold text-muted-foreground text-center">Full body</p>
                <div className="mx-auto flex h-44 w-28 items-center justify-center overflow-hidden rounded border bg-muted text-xs text-muted-foreground">
                  {fullBodyPhoto ? (
                    <img src={fullBodyPhoto} alt={`${maid.fullName} full body`} className="h-full w-full object-cover" />
                  ) : (
                    "No Photo"
                  )}
                </div>
              </div>
            </div>

            {extraPhotos.length > 0 && (
              <div className="grid w-full grid-cols-4 gap-2">
                {extraPhotos.map((photo, index) => (
                  <div key={`${photo}-${index}`} className="h-14 overflow-hidden rounded border">
                    <img src={photo} alt={`${maid.fullName} extra ${index + 1}`} className="h-full w-full object-cover" />
                  </div>
                ))}
              </div>
            )}
            <p className="text-xs text-muted-foreground">{photos.length}/5 photos uploaded</p>
            <p className="text-xs text-muted-foreground">Status: {maid.status || "available"}</p>
            <div className="flex flex-wrap items-center justify-center gap-3 text-sm">
              <button className="flex items-center gap-2 text-primary hover:underline" onClick={() => setIsThroughAgencyDialogOpen(true)}>
                <Send className="h-4 w-4" /> Through Agency
              </button>
              <button className="flex items-center gap-2 text-primary hover:underline" onClick={() => setIsDirectHireDialogOpen(true)}>
                <Send className="h-4 w-4" /> Direct Hire (Fast Process)
              </button>
              <button className="flex items-center gap-2 text-primary hover:underline" onClick={() => setIsRejectDialogOpen(true)}>
                <Send className="h-4 w-4" /> Reject
              </button>
              <button className="flex items-center gap-2 text-primary hover:underline" onClick={() => requestExport("pdf")}>
                <FileDown className="h-4 w-4" /> Export PDF
              </button>
              <button className="flex items-center gap-2 text-primary hover:underline" onClick={() => requestExport("word")}>
                <FileText className="h-4 w-4" /> Export Word
              </button>
              <button className="flex items-center gap-2 text-primary hover:underline" onClick={() => requestExport("excel")}>
                <Sheet className="h-4 w-4" /> Export Excel
              </button>
            </div>

            <Dialog open={confirmExportOpen} onOpenChange={(open) => {
              setConfirmExportOpen(open);
              if (!open) setPendingExportType(null);
            }}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>
                    {pendingExportType === "pdf"
                      ? "Export PDF bio-data?"
                      : pendingExportType === "word"
                      ? "Export Word bio-data?"
                      : "Export Excel bio-data?"}
                  </DialogTitle>
                  <DialogDescription>
                    Export for <span className="font-semibold">{maid.fullName}</span> ({maid.referenceCode}).{" "}
                    {pendingExportType === "pdf" ? "This will open the print dialog." : "A file will be downloaded to your device."}
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setConfirmExportOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={confirmExport}>
                    {pendingExportType === "pdf" ? "Export PDF" : pendingExportType === "word" ? "Export Word" : "Export Excel"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-x-6 gap-y-1 text-sm md:grid-cols-[220px_1fr]">
          {detailRows.map(([label, value]) => (
            <div key={label} className="contents">
              <p className="py-1 font-semibold text-muted-foreground md:text-right">{label}</p>
              <p className="py-1">{value}</p>
            </div>
          ))}

          <p className="py-1 font-semibold text-muted-foreground md:text-right">Language Skill</p>
          <div className="py-1 space-y-1">
            {fixedLanguages.map(([lang, level]) => (
              <p key={lang}>{lang} ({String(level)})</p>
            ))}
            {otherLanguages.length > 0 && (
              <button
                type="button"
                className="text-primary hover:underline text-sm"
                onClick={() => setShowOtherLanguages((prev) => !prev)}
              >
                {showOtherLanguages ? "Hide other languages" : "Show other languages"}
              </button>
            )}
            {showOtherLanguages &&
              otherLanguages.map(([lang, level]) => (
                <p key={lang}>
                  {lang} ({String(level)})
                </p>
              ))}
          </div>
        </div>

        <div className="space-y-1">
          <h3 className="mb-2 text-sm font-semibold text-muted-foreground">Other Information</h3>
          <div className="grid max-w-2xl grid-cols-1 gap-y-1 text-sm md:grid-cols-[1fr_40px]">
            {/* Render the full Availability/Remarks checklist (YES/NO) */}
            {availabilityRemarkItems.map((item) => (
              <div key={item.label} className="contents">
                <p>{item.label}</p>
                <p className="text-center">
                  {item.keys.some((key) => Boolean(otherInformation[key])) ? "YES" : "NO"}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-muted-foreground">Maid Skills</h3>
          <table className="w-full border text-sm">
            <thead>
              <tr className="bg-muted/50">
                <th className="border px-3 py-2 text-left">Areas of Work</th>
                <th className="border px-3 py-2 text-center">Willingness</th>
                <th className="border px-3 py-2 text-center">Experience</th>
                <th className="border px-3 py-2 text-center">Evaluation</th>
              </tr>
            </thead>
            <tbody>
              {workAreas
                .filter(([, config]) => {
                  const evalValue = String(config.evaluation || "").trim();
                  return Boolean(config.willing || config.experience || (evalValue && evalValue !== "-" && evalValue !== "N.A."));
                })
                .map(([area, config]) => {
                  const rawAge = String(workAreaNotes["Care of infants/children"] || "").trim();
                  const formattedAge = rawAge ? rawAge.replace(/\s*-\s*/g, "–") : "";
                  const needsYears = formattedAge && !/year/i.test(formattedAge);
                  const areaLabel =
                    area === "Care of infants/children" && formattedAge
                      ? `Care of infants/children (${formattedAge}${needsYears ? " years" : ""})`
                      : area;

                  return (
                <tr key={area}>
                  <td className="border px-3 py-2">{areaLabel}</td>
                  <td className="border px-3 py-2 text-center">{config.willing ? "Yes" : "No"}</td>
                  <td className="border px-3 py-2 text-center">{config.experience ? "Yes" : "No"}</td>
                  <td className="border px-3 py-2 text-center">{config.evaluation || "-"}</td>
                </tr>
                  );
                })}
            </tbody>
          </table>
        </div>

        {(workAreaNotes["Cooking"] || workAreaNotes["Other Skill"]) ? (
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-muted-foreground">Skill Feedback</h3>
            {workAreaNotes["Cooking"] ? (
              <div className="rounded-lg border bg-muted/20 p-3 text-sm">
                <p className="font-semibold">Cooking</p>
                <p className="mt-1 whitespace-pre-wrap text-muted-foreground">
                  {workAreaNotes["Cooking"]}
                </p>
              </div>
            ) : null}
            {workAreaNotes["Other Skill"] ? (
              <div className="rounded-lg border bg-muted/20 p-3 text-sm">
                <p className="font-semibold">Other</p>
                <p className="mt-1 whitespace-pre-wrap text-muted-foreground">
                  {workAreaNotes["Other Skill"]}
                </p>
              </div>
            ) : null}
          </div>
        ) : null}

        {employment.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-muted-foreground">Employment History</h3>
            <div className="overflow-x-auto">
              <table className="w-full border text-sm">
                <thead>
                  <tr className="bg-muted/50">
                    {["From", "To", "Country", "Employer", "Maid Duties", "Remarks"].map((h) => (
                      <th key={h} className="border px-3 py-1.5 text-left font-semibold">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {employment.map((e, i) => {
                    const row = e as Record<string, string>;
                    return (
                      <tr key={i} className="hover:bg-muted/30">
                        <td className="border px-3 py-1.5">{formatDate(row.from) === "N/A" ? "" : formatDate(row.from)}</td>
                        <td className="border px-3 py-1.5">{formatDate(row.to) === "N/A" ? "" : formatDate(row.to)}</td>
                        <td className="border px-3 py-1.5">{row.country || ""}</td>
                        <td className="border px-3 py-1.5">{row.employer || ""}</td>
                        <td className="border px-3 py-1.5">{row.duties || ""}</td>
                        <td className="border px-3 py-1.5">{row.remarks || ""}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="space-y-2 text-sm">
            <h3 className="font-semibold text-muted-foreground">Medical History / Dietary Restrictions</h3>
            <div className="grid grid-cols-[180px_1fr] gap-x-4 gap-y-2">
              {medicalRows.map(([label, value]) => (
                <div key={label} className="contents">
                  <p className="font-semibold text-muted-foreground">{label}</p>
                  <p className="whitespace-pre-wrap">{value}</p>
                </div>
              ))}
            </div>
            {Object.keys(pastIllnesses).length > 0 && (
              <div className="pt-2">
                <p className="mb-2 font-semibold text-muted-foreground">Past and Existing Illnesses</p>
                <div className="grid grid-cols-1 gap-y-1 md:grid-cols-[1fr_40px]">
                  {Object.entries(pastIllnesses).map(([illness, value]) => (
                    <div key={illness} className="contents">
                      <p>{illness}</p>
                      <p className="text-center">{value ? <Check className="inline h-4 w-4 text-primary" /> : "-"}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="space-y-2 text-sm">
            <h3 className="font-semibold text-muted-foreground">Availability / Remark</h3>
            <div className="grid grid-cols-[180px_1fr] gap-x-4 gap-y-2">
              {availabilityRows.map(([label, value]) => (
                <div key={label} className="contents">
                  <p className="font-semibold text-muted-foreground">{label}</p>
                  <p className="whitespace-pre-wrap">{value}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-2 text-sm">
          <h3 className="font-semibold text-muted-foreground">Public Introduction (Employer Login is not required)</h3>
          <p className="whitespace-pre-wrap">{String(introduction.publicIntro || "Maid Introduction in Public is empty, please add to have more employers view this bio-data.")}</p>
        </div>

        {/* Only show private introduction if client is authenticated AND emailVerified === true */}
        {canViewPrivateIntro && (
          <div className="space-y-1 text-sm">
            <h3 className="font-semibold text-muted-foreground">Introduction (Employer login is required to view this Introduction)</h3>
            <p className="whitespace-pre-wrap">{String(introduction.intro || "")}</p>
          </div>
        )}

        <div className="space-y-2 text-sm">
          <h3 className="font-semibold text-muted-foreground">Private Information</h3>
          <div className="grid grid-cols-[180px_1fr] gap-x-4 gap-y-2">
            {privateRows.map(([label, value]) => (
              <div key={label} className="contents">
                <p className="font-semibold text-muted-foreground">{label}</p>
                <p className="whitespace-pre-wrap">{value}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-1 border-t pt-4 text-sm">
          <p><span className="font-semibold text-muted-foreground">Last updated On</span> {formatDate(maid.updatedAt)}</p>
          <p><span className="font-semibold text-muted-foreground">Hits</span> 1</p>
        </div>
      </div>

      <SendMaidToClientDialog
        maid={maid}
        open={isThroughAgencyDialogOpen}
        onOpenChange={setIsThroughAgencyDialogOpen}
        actionType="interested"
        onSuccess={(updatedMaid) => setMaid(updatedMaid)}
      />
      <SendMaidToClientDialog
        maid={maid}
        open={isDirectHireDialogOpen}
        onOpenChange={setIsDirectHireDialogOpen}
        actionType="direct_hire"
        onSuccess={(updatedMaid) => setMaid(updatedMaid)}
      />
      <SendMaidToClientDialog
        maid={maid}
        open={isRejectDialogOpen}
        onOpenChange={setIsRejectDialogOpen}
        actionType="rejected"
        onSuccess={(updatedMaid) => setMaid(updatedMaid)}
      />

      <Dialog open={isManagePhotosOpen} onOpenChange={setIsManagePhotosOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Manage Photos</DialogTitle>
            <DialogDescription>
              Slot 1: Passport/2x2, Slot 2: Full body, then up to 3 extra photos.
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            <div className="space-y-3">
              <p className="text-sm font-semibold">Passport / 2x2</p>
              <div className="h-40 w-40 overflow-hidden rounded border bg-muted/30 flex items-center justify-center text-xs text-muted-foreground">
                {passportOrTwoByTwoPhoto ? (
                  <img src={passportOrTwoByTwoPhoto} alt="passport" className="h-full w-full object-cover" />
                ) : (
                  "No photo"
                )}
              </div>
              <input type="file" accept="image/*" disabled={isMediaSaving} onChange={(e) => void replacePhotoAt(0, e.target.files?.[0])} />
              <Button type="button" variant="outline" disabled={isMediaSaving || !passportOrTwoByTwoPhoto} onClick={() => void removePhotoAt(0)}>
                Remove
              </Button>
            </div>

            <div className="space-y-3">
              <p className="text-sm font-semibold">Full body</p>
              <div className="h-64 w-44 overflow-hidden rounded border bg-muted/30 flex items-center justify-center text-xs text-muted-foreground">
                {fullBodyPhoto ? (
                  <img src={fullBodyPhoto} alt="full body" className="h-full w-full object-cover" />
                ) : (
                  "No photo"
                )}
              </div>
              <input type="file" accept="image/*" disabled={isMediaSaving} onChange={(e) => void replacePhotoAt(1, e.target.files?.[0])} />
              <Button type="button" variant="outline" disabled={isMediaSaving || !fullBodyPhoto} onClick={() => void removePhotoAt(1)}>
                Remove
              </Button>
            </div>

            <div className="space-y-3">
              <p className="text-sm font-semibold">Extra photos ({extraPhotos.length}/3)</p>
              <div className="grid grid-cols-3 gap-2">
                {extraPhotos.map((photo, index) => (
                  <div key={`${photo}-${index}`} className="relative h-20 overflow-hidden rounded border bg-muted/30">
                    <img src={photo} alt={`extra ${index + 1}`} className="h-full w-full object-cover" />
                    <button
                      type="button"
                      className="absolute right-1 top-1 rounded bg-background/80 px-2 py-0.5 text-xs"
                      onClick={() => void removePhotoAt(index + 2)}
                      disabled={isMediaSaving}
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
              <input type="file" accept="image/*" disabled={isMediaSaving || photos.length >= 5} onChange={(e) => void addExtraPhoto(e.target.files?.[0])} />
              <p className="text-xs text-muted-foreground">Max 5 total photos.</p>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsManagePhotosOpen(false)} disabled={isMediaSaving}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={isVideoModalOpen}
        onOpenChange={(next) => {
          setIsVideoModalOpen(next);
          if (next) setVideoLinkDraft(maid.videoDataUrl || "");
        }}
      >
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Video Link</DialogTitle>
            <DialogDescription>Paste a YouTube link or a direct video URL. Preview and update it here.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="flex flex-col gap-2 md:flex-row md:items-center">
              <Input value={videoLinkDraft} onChange={(e) => setVideoLinkDraft(e.target.value)} placeholder="https://youtube.com/watch?v=... or https://..." />
              <Button type="button" onClick={() => void saveVideoLink()} disabled={isMediaSaving}>
                {isMediaSaving ? "Saving..." : "Save"}
              </Button>
              {videoLinkDraft.trim() && !getYouTubeEmbedUrl(videoLinkDraft) && (
                <a
                  className="inline-flex h-10 items-center justify-center rounded-md border px-3 text-sm hover:bg-muted"
                  href={videoLinkDraft.trim()}
                  download
                  target="_blank"
                  rel="noreferrer"
                >
                  Download
                </a>
              )}
            </div>

            <div className="relative min-h-[220px] w-full overflow-hidden rounded-lg border bg-muted/30">
              {getYouTubeEmbedUrl(videoLinkDraft) ? (
                <iframe
                  className="absolute top-0 left-0 h-full w-full"
                  src={getYouTubeEmbedUrl(videoLinkDraft) ?? undefined}
                  title="YouTube video"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  referrerPolicy="strict-origin-when-cross-origin"
                  allowFullScreen
                />
              ) : videoLinkDraft.trim() ? (
                <video controls className="absolute top-0 left-0 h-full w-full object-cover" src={videoLinkDraft.trim()}>
                  Your browser does not support the video tag.
                </video>
              ) : (
                <div className="flex h-full w-full items-center justify-center text-center p-4">
                  <p className="text-sm text-muted-foreground">No video link yet.</p>
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsVideoModalOpen(false)} disabled={isMediaSaving}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MaidProfilePage;
