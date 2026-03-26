import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowUp, Edit, Image, Trash2, Youtube, FileDown, Check, FileText, Sheet, Send } from "lucide-react";
import { MaidProfile } from "@/lib/maids";
import { toast } from "@/components/ui/sonner";
import { adminPath } from "@/lib/routes";
import { exportMaidProfileToExcel, exportMaidProfileToPdf, exportMaidProfileToWord } from "@/lib/maidExport";
import SendMaidToClientDialog from "@/components/SendMaidToClientDialog";

const formatDate = (value?: string) => {
  if (!value) return "N/A";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString();
};

const MaidProfilePage = () => {
  const { refCode } = useParams();
  const navigate = useNavigate();
  const [maid, setMaid] = useState<MaidProfile | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isThroughAgencyDialogOpen, setIsThroughAgencyDialogOpen] = useState(false);
  const [isDirectHireDialogOpen, setIsDirectHireDialogOpen] = useState(false);
  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false);

  useEffect(() => {
    const loadMaid = async () => {
      if (!refCode) return;
      try {
        const response = await fetch(`/api/maids/${encodeURIComponent(refCode)}`);
        const data = (await response.json()) as { error?: string; maid?: MaidProfile };
        if (!response.ok || !data.maid) throw new Error(data.error || "Failed to load maid");
        setMaid(data.maid);
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
  const pastIllnesses = (introduction.pastIllnesses as Record<string, boolean>) || {};
  const workAreas = Object.entries(maid.workAreas || {}) as Array<[string, { willing?: boolean; experience?: boolean; evaluation?: string }]>;
  const employment = Array.isArray(maid.employmentHistory) ? maid.employmentHistory : [];
  const languages = Object.entries(maid.languageSkills || {});
  const photos =
    Array.isArray(maid.photoDataUrls) && maid.photoDataUrls.length > 0
      ? maid.photoDataUrls
      : maid.photoDataUrl
      ? [maid.photoDataUrl]
      : [];
  const detailRows: Array<[string, string]> = [
    ["Maid Name", maid.fullName],
    ["Ref. Code", maid.referenceCode],
    ["Type", maid.type],
    ["Nationality", maid.nationality],
    ["Date of Birth", formatDate(maid.dateOfBirth)],
    ["Place of Birth", maid.placeOfBirth],
    ["Height/Weight", `${maid.height}cm/${maid.weight}Kg`],
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
        <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-sm text-primary hover:underline">
          <ArrowLeft className="h-4 w-4" /> Back
        </button>
        <h2 className="text-xl font-bold">Edit/Delete Maid</h2>
      </div>

      <div className="content-card animate-fade-in-up space-y-6">
        <div className="flex flex-wrap gap-3 border-b pb-3 text-sm">
          <button className="flex items-center gap-1 text-primary hover:underline"><ArrowUp className="h-3 w-3" /> Bring to Top</button>
          <button className="text-primary hover:underline" onClick={() => navigate(adminPath("/edit-maids"))}>View All Maids</button>
          <button className="flex items-center gap-1 text-primary hover:underline" onClick={() => navigate(adminPath(`/maid/${encodeURIComponent(maid.referenceCode)}/edit`))}><Edit className="h-3 w-3" /> Edit This Maid</button>
          <span className="flex items-center gap-1 text-muted-foreground"><Image className="h-3 w-3" /> Manage Photos in Edit Maid</span>
          <span className="flex items-center gap-1 text-muted-foreground"><Youtube className="h-3 w-3" /> Manage Video in Edit Maid</span>
          <button className="flex items-center gap-1 text-destructive hover:underline" onClick={() => void handleDelete()}><Trash2 className="h-3 w-3" /> {isDeleting ? "Deleting..." : "Delete"}</button>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          <div className="flex min-h-[200px] flex-col items-center justify-center gap-3 rounded-lg border bg-muted/30 p-6 text-center">
            {maid.videoDataUrl ? (
              <video controls className="max-h-[220px] w-full rounded-md border bg-black" src={maid.videoDataUrl}>
                Your browser does not support the video tag.
              </video>
            ) : (
              <p className="text-sm text-muted-foreground">No uploaded video yet. Upload via Edit Maid.</p>
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
            <div className="flex h-28 w-24 items-center justify-center overflow-hidden rounded border bg-muted text-xs text-muted-foreground">
              {photos[0] ? (
                <img src={photos[0]} alt={`${maid.fullName} profile`} className="h-full w-full object-cover" />
              ) : (
                "No Photo"
              )}
            </div>
            {photos.length > 1 && (
              <div className="grid w-full grid-cols-4 gap-2">
                {photos.slice(1).map((photo, index) => (
                  <div key={`${photo}-${index}`} className="h-14 overflow-hidden rounded border">
                    <img src={photo} alt={`${maid.fullName} ${index + 2}`} className="h-full w-full object-cover" />
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
              <button className="flex items-center gap-2 text-primary hover:underline" onClick={handleExportPdf}>
                <FileDown className="h-4 w-4" /> Export PDF
              </button>
              <button className="flex items-center gap-2 text-primary hover:underline" onClick={handleExportWord}>
                <FileText className="h-4 w-4" /> Export Word
              </button>
              <button className="flex items-center gap-2 text-primary hover:underline" onClick={handleExportExcel}>
                <Sheet className="h-4 w-4" /> Export Excel
              </button>
            </div>
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
            {languages.map(([lang, level]) => (
              <p key={lang}>{lang} ({String(level)})</p>
            ))}
          </div>
        </div>

        <div className="space-y-1">
          <h3 className="mb-2 text-sm font-semibold text-muted-foreground">Other Information</h3>
          <div className="grid max-w-2xl grid-cols-1 gap-y-1 text-sm md:grid-cols-[1fr_40px]">
            {Object.entries(otherInformation).map(([question, value]) => (
              <div key={question} className="contents">
                <p>{question}</p>
                <p className="text-center">{value ? <Check className="inline h-4 w-4 text-primary" /> : "-"}</p>
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
              {workAreas.map(([area, config]) => (
                <tr key={area}>
                  <td className="border px-3 py-2">{area}</td>
                  <td className="border px-3 py-2 text-center">{config.willing ? "Yes" : "No"}</td>
                  <td className="border px-3 py-2 text-center">{config.experience ? "Yes" : "No"}</td>
                  <td className="border px-3 py-2 text-center">{config.evaluation || "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

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
                        <td className="border px-3 py-1.5">{row.from || ""}</td>
                        <td className="border px-3 py-1.5">{row.to || ""}</td>
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

        <div className="space-y-1 text-sm">
          <h3 className="font-semibold text-muted-foreground">Introduction (Employer login is required to view this Introduction)</h3>
          <p className="whitespace-pre-wrap">{String(introduction.intro || "(Employer login is required to view this Introduction)")}</p>
        </div>

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
    </div>
  );
};

export default MaidProfilePage;
