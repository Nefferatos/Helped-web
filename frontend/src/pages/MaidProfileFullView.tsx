import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { toast } from "@/components/ui/sonner";
import { adminPath } from "@/lib/routes";
import type { MaidProfile } from "@/lib/maids";

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

const workAreaOrder = [
  "Care of infants/children",
  "Care of elderly",
  "Care of disabled",
  "General housework",
  "Cooking",
  "Language abilities (spoken)",
  "Other skills, if any",
] as const;

const interviewAvailabilityOptions = [
  "FDW is not available for interview",
  "FDW can be interviewed by phone",
  "FDW can be interviewed by video-conference",
  "FDW can be interviewed in person",
] as const;

const fixedLanguageKeyMap = [
  { label: "ENGLISH", keys: ["English"] },
  { label: "MANDARIN/CHINESE dialect", keys: ["Mandarin/Chinese-Dialect", "Mandarin / Chinese Dialect", "Mandarin/Chinese Dialect", "Mandarin"] },
  { label: "Hindi", keys: ["Hindi"] },
  { label: "Tamil", keys: ["Tamil"] },
  { label: "Bahasa Indonesia/Malaysia", keys: ["Bahasa Indonesia/Malaysia", "Bahasa Indonesia / Malaysia", "Bahasa"] },
] as const;

const MaidProfileFullView = () => {
  const { refCode } = useParams<{ refCode: string }>();
  const navigate = useNavigate();
  const [maid, setMaid] = useState<MaidProfile | null>(null);
  const [showOtherLanguages, setShowOtherLanguages] = useState(false);

  useEffect(() => {
    const load = async () => {
      if (!refCode) return;
      try {
        const response = await fetch(`/api/maids/${encodeURIComponent(refCode)}`);
        const data = (await response.json().catch(() => ({}))) as { error?: string; maid?: MaidProfile };
        if (!response.ok || !data.maid) throw new Error(data.error || "Failed to load maid");
        setMaid(data.maid);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to load maid");
        navigate(adminPath("/edit-maids"));
      }
    };

    void load();
  }, [navigate, refCode]);

  useEffect(() => {
    setShowOtherLanguages(false);
  }, [maid?.referenceCode]);

  const skillsPreferences = useMemo(() => (maid?.skillsPreferences as Record<string, unknown>) || {}, [maid]);
  const introduction = useMemo(() => (maid?.introduction as Record<string, unknown>) || {}, [maid]);
  const agencyContact = useMemo(() => (maid?.agencyContact as Record<string, unknown>) || {}, [maid]);
  const otherLanguages = useMemo(() => {
    const allowedKeys = new Set(fixedLanguageKeyMap.flatMap((item) => item.keys));
    return Object.entries(maid?.languageSkills || {})
      .map(([language, level]) => [language, String(level || "")] as const)
      .filter(([language, level]) => !allowedKeys.has(language) && level.trim());
  }, [maid?.languageSkills]);

  if (!maid) {
    return (
      <div className="page-container">
        <div className="content-card py-10 text-center text-muted-foreground">Loading full view...</div>
      </div>
    );
  }

  const photos =
    Array.isArray(maid.photoDataUrls) && maid.photoDataUrls.length > 0
      ? maid.photoDataUrls
      : maid.photoDataUrl
      ? [maid.photoDataUrl]
      : [];

  const otherInformation = (skillsPreferences.otherInformation as Record<string, boolean>) || {};
  const workAreaNotes = (skillsPreferences.workAreaNotes as Record<string, string>) || {};
  const availabilityInterviewOptions = (skillsPreferences.availabilityInterviewOptions as string[]) || [];
  const pastIllnesses = (introduction.pastIllnesses as Record<string, boolean>) || {};
  const workAreasMap = (maid.workAreas as Record<string, unknown>) || {};
  const workAreas = workAreaOrder.map((area) => [area, ((workAreasMap[area] as Record<string, unknown>) || {})] as const);
  const employment = Array.isArray(maid.employmentHistory) ? maid.employmentHistory : [];

  return (
    <div className="page-container">
      <div className="mb-4 flex items-center gap-3">
        <button
          onClick={() => navigate(adminPath(`/maid/${encodeURIComponent(maid.referenceCode)}`))}
          className="group inline-flex items-center gap-1 text-sm font-medium text-primary transition-colors hover:text-primary/80 active:scale-95 focus:outline-none focus:ring-2 focus:ring-primary/30 rounded-md"
        >
          <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
          Back to Profile
        </button>
      </div>

      <div className="content-card animate-fade-in-up space-y-8">
        <div className="border-b pb-4">
          <h2 className="text-lg font-bold">Full View: {maid.fullName}</h2>
          <p className="text-sm text-muted-foreground">{maid.referenceCode}</p>
        </div>

        <section className="space-y-2 text-sm">
          <h3 className="text-sm font-semibold text-muted-foreground">PROFILE</h3>
          <div className="grid grid-cols-1 gap-x-6 gap-y-1 md:grid-cols-[220px_1fr]">
            {[
              ["Maid Name", maid.fullName],
              ["Ref Code", maid.referenceCode],
              ["Type", maid.type],
              ["Nationality", maid.nationality],
              ["Indian Maid Category", String(skillsPreferences.indianMaidCategory || "")],
              ["Date of Birth", maid.dateOfBirth],
              ["Place of Birth", maid.placeOfBirth],
              ["Height", `${String(maid.height)} cm`],
              ["Weight", `${String(maid.weight)} Kg`],
              ["Residential Address in Home Country", maid.homeAddress],
              ["Airport / Port to be repatriated", maid.airportRepatriation],
              ["Contact Number in Home Country", String(agencyContact.homeCountryContactNumber || "")],
              ["Education", maid.educationLevel],
              ["Religion", maid.religion],
              ["Marital Status", maid.maritalStatus],
              ["Number of Siblings", String(maid.numberOfSiblings)],
              ["Number of Children", String(maid.numberOfChildren)],
              ["Ages of Children", String(introduction.agesOfChildren || "")],
              ["Present Salary (S$)", String(introduction.presentSalary || "")],
              ["Expected Salary", String(introduction.expectedSalary || "")],
              ["When will this maid be Available?", String(introduction.availability || "")],
              ["Contract Ends", String(introduction.contractEnds || "")],
              ["Maid Loan (S$)", String(introduction.maidLoan || "")],
              ["Offday Compensation (S$/day)", String(introduction.offdayCompensation || "")],
              ["Off-days Per Month", String(skillsPreferences.offDaysPerMonth || "")],
              ["Status", String(maid.status || "available")],
              ["Public", String(Boolean(maid.isPublic))],
              ["Video Link", String(maid.videoDataUrl || "")],
            ].map(([label, value]) => (
              <div key={label} className="contents">
                <p className="py-1 font-semibold text-muted-foreground md:text-right">{label}</p>
                <p className="py-1 whitespace-pre-wrap">{String(value || "")}</p>
              </div>
            ))}
          </div>

          <div className="space-y-2">
            <p className="text-sm font-semibold text-muted-foreground">Photos</p>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
              {Array.from({ length: 5 }, (_, index) => {
                const url = photos[index] || "";
                const label =
                  index === 0 ? "Passport / 2x2" : index === 1 ? "Full body" : `Extra ${index - 1}`;
                return (
                  <div key={label} className="space-y-1">
                    <p className="text-xs text-muted-foreground">{label}</p>
                    <div className="h-30 w-full overflow-hidden rounded border bg-muted/30">
                      {url ? <img src={url} alt={label} className="h-full w-full object-cover" /> : null}
                    </div>
                  </div>
                );
              })}
            </div>
            <p className="text-xs text-muted-foreground">{photos.length}/5 photos uploaded</p>
          </div>
        </section>

        <section className="space-y-2 text-sm">
          <h3 className="text-sm font-semibold text-muted-foreground">SKILLS</h3>
          <div className="space-y-2">
            <p className="text-sm font-semibold text-muted-foreground">Language Skills</p>
            <div className="grid grid-cols-1 gap-x-6 gap-y-1 md:grid-cols-[220px_1fr]">
              {fixedLanguageKeyMap.map((item) => {
                const level = item.keys.map((key) => (maid.languageSkills || {})[key]).find((val) => String(val || "").trim());
                if (!level) return null;
                return (
                  <div key={item.label} className="contents">
                    <p className="py-1 font-semibold text-muted-foreground md:text-right">{item.label}</p>
                    <p className="py-1">{String(level)}</p>
                  </div>
                );
              })}
            </div>
            {otherLanguages.length > 0 && (
              <button
                type="button"
                className="text-primary hover:underline text-sm"
                onClick={() => setShowOtherLanguages((prev) => !prev)}
              >
                {showOtherLanguages ? "Hide other languages" : "Show other languages"}
              </button>
            )}
            {showOtherLanguages && (
              <div className="mt-2 grid grid-cols-1 gap-x-6 gap-y-1 md:grid-cols-[220px_1fr]">
                {otherLanguages.map(([language, level]) => (
                  <div key={language} className="contents">
                    <p className="py-1 font-semibold text-muted-foreground md:text-right">{language}</p>
                    <p className="py-1">{level}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-1">
            <p className="text-sm font-semibold text-muted-foreground">Other Information</p>
            <div className="grid max-w-2xl grid-cols-1 gap-y-1 text-sm md:grid-cols-[1fr_60px]">
              {availabilityRemarkItems.map((item) => (
                <div key={item.label} className="contents">
                  <p>{item.label}</p>
                  <p className="text-center">{item.keys.some((key) => Boolean(otherInformation[key])) ? "YES" : "NO"}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-1">
            <p className="text-sm font-semibold text-muted-foreground">Work Area Notes</p>
            <div className="grid grid-cols-1 gap-x-6 gap-y-1 md:grid-cols-[220px_1fr]">
              {[
                ["Care of infants/children", String(workAreaNotes["Care of infants/children"] || "")],
                ["Cooking", String(workAreaNotes.Cooking || "")],
                ["Language abilities (spoken)", String(workAreaNotes["Language abilities (spoken)"] || "")],
                ["Other skills, if any", String(workAreaNotes["Other Skill"] || "")],
              ].map(([label, value]) => (
                <div key={label} className="contents">
                  <p className="py-1 font-semibold text-muted-foreground md:text-right">{label}</p>
                  <p className="py-1 whitespace-pre-wrap">{value}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="space-y-2 text-sm">
          <h3 className="text-sm font-semibold text-muted-foreground">Work Areas</h3>
          <div className="overflow-x-auto">
            <table className="w-full border text-sm">
              <thead>
                <tr className="bg-muted/50">
                  <th className="border px-3 py-2 text-left">Area</th>
                  <th className="border px-3 py-2 text-center">Willing</th>
                  <th className="border px-3 py-2 text-center">Experience</th>
                  <th className="border px-3 py-2 text-center">Years</th>
                  <th className="border px-3 py-2 text-center">Rating</th>
                  <th className="border px-3 py-2 text-left">Note</th>
                  <th className="border px-3 py-2 text-left">Evaluation</th>
                </tr>
              </thead>
              <tbody>
                {workAreas.map(([area, config]) => (
                  <tr key={area} className="hover:bg-muted/30">
                    <td className="border px-3 py-2">{area}</td>
                    <td className="border px-3 py-2 text-center">{config.willing ? "Yes" : "No"}</td>
                    <td className="border px-3 py-2 text-center">{config.experience ? "Yes" : "No"}</td>
                    <td className="border px-3 py-2 text-center">{String(config.yearsOfExperience || "")}</td>
                    <td className="border px-3 py-2 text-center">{config.rating === null || config.rating === undefined ? "N.A." : String(config.rating)}</td>
                    <td className="border px-3 py-2 whitespace-pre-wrap">{String(config.note || "")}</td>
                    <td className="border px-3 py-2 whitespace-pre-wrap">{String(config.evaluation || "")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="space-y-2 text-sm">
          <h3 className="text-sm font-semibold text-muted-foreground">EMPLOYMENT HISTORY</h3>
          <div className="overflow-x-auto">
            <table className="w-full border text-sm">
              <thead>
                <tr className="bg-muted/50">
                  {["From", "To", "Country", "Employer", "Duties", "Remarks"].map((h) => (
                    <th key={h} className="border px-3 py-1.5 text-left font-semibold">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {employment.map((row, index) => {
                  const r = row as Record<string, unknown>;
                  return (
                    <tr key={index} className="hover:bg-muted/30">
                      <td className="border px-3 py-1.5">{String(r.from || "")}</td>
                      <td className="border px-3 py-1.5">{String(r.to || "")}</td>
                      <td className="border px-3 py-1.5">{String(r.country || "")}</td>
                      <td className="border px-3 py-1.5">{String(r.employer || "")}</td>
                      <td className="border px-3 py-1.5 whitespace-pre-wrap">{String(r.duties || "")}</td>
                      <td className="border px-3 py-1.5 whitespace-pre-wrap">{String(r.remarks || "")}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        <section className="space-y-2 text-sm">
          <h3 className="text-sm font-semibold text-muted-foreground">AVAILABILITY/REMARK</h3>
          <div className="grid grid-cols-1 gap-x-6 gap-y-1 md:grid-cols-[220px_1fr]">
            {[
              ["Availability Remark", String(skillsPreferences.availabilityRemark || "")],
              ["Interview Availability", interviewAvailabilityOptions.filter((opt) => availabilityInterviewOptions.includes(opt)).join(", ")],
              ["Previous working experience in Singapore", String(skillsPreferences.sgExperience ?? "")],
            ].map(([label, value]) => (
              <div key={label} className="contents">
                <p className="py-1 font-semibold text-muted-foreground md:text-right">{label}</p>
                <p className="py-1 whitespace-pre-wrap">{value}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="space-y-2 text-sm">
          <h3 className="text-sm font-semibold text-muted-foreground">INTRODUCTION</h3>
          <div className="grid grid-cols-1 gap-x-6 gap-y-1 md:grid-cols-[220px_1fr]">
            {[
              ["Intro (Private)", String(introduction.intro || "")],
            ].map(([label, value]) => (
              <div key={label} className="contents">
                <p className="py-1 font-semibold text-muted-foreground md:text-right">{label}</p>
                <p className="py-1 whitespace-pre-wrap">{value}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="space-y-2 text-sm">
          <h3 className="text-sm font-semibold text-muted-foreground">PUBLIC INTRODUCTION</h3>
          <div className="grid grid-cols-1 gap-x-6 gap-y-1 md:grid-cols-[220px_1fr]">
            <div className="contents">
              <p className="py-1 font-semibold text-muted-foreground md:text-right">Public Intro</p>
              <p className="py-1 whitespace-pre-wrap">{String(introduction.publicIntro || "")}</p>
            </div>
          </div>
        </section>

        <section className="space-y-2 text-sm">
          <h3 className="text-sm font-semibold text-muted-foreground">PRIVATE INFO</h3>
          <div className="grid grid-cols-1 gap-x-6 gap-y-1 md:grid-cols-[220px_1fr]">
            {[
              ["This maid was interviewed by", String(skillsPreferences.interviewedBy || "")],
              ["Who Referred This Maid?", String(skillsPreferences.referredBy || "")],
              ["Passport Number of the Maid", String(agencyContact.passportNo || "")],
              ["Telephone Number of Maid/Foreign Agency", String(agencyContact.phone || "")],
              ["Agency's Historical Record of the Maid", String(skillsPreferences.privateInfo || "")],
            ].map(([label, value]) => (
              <div key={label} className="contents">
                <p className="py-1 font-semibold text-muted-foreground md:text-right">{label}</p>
                <p className="py-1 whitespace-pre-wrap">{value}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="space-y-2 text-sm">
          <h3 className="text-sm font-semibold text-muted-foreground">Medical History / Dietary Restrictions</h3>
          <div className="grid grid-cols-1 gap-x-6 gap-y-1 md:grid-cols-[220px_1fr]">
            {[
              ["Allergies (if any)", String(introduction.allergies || "")],
              ["Physical disabilities", String(introduction.physicalDisabilities || "")],
              ["Dietary restrictions", String(introduction.dietaryRestrictions || "")],
              ["Food handling preferences", String(introduction.foodHandlingPreferences || "")],
              ["Other Illnesses", String(introduction.otherIllnesses || "")],
              ["Any other remarks", String(introduction.otherRemarks || "")],
            ].map(([label, value]) => (
              <div key={label} className="contents">
                <p className="py-1 font-semibold text-muted-foreground md:text-right">{label}</p>
                <p className="py-1 whitespace-pre-wrap">{value}</p>
              </div>
            ))}
          </div>

          <div className="space-y-1">
            <p className="text-sm font-semibold text-muted-foreground">Past and existing illnesses</p>
            <div className="grid max-w-2xl grid-cols-1 gap-y-1 text-sm md:grid-cols-[1fr_80px]">
              {Object.entries(pastIllnesses).map(([key, value]) => (
                <div key={key} className="contents">
                  <p>{key}</p>
                  <p className="text-center">{value ? "YES" : "NO"}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="space-y-2 text-sm">
          <h3 className="text-sm font-semibold text-muted-foreground">Agency Contact</h3>
          <div className="grid grid-cols-1 gap-x-6 gap-y-1 md:grid-cols-[220px_1fr]">
            {[
              ["Company Name", String(agencyContact.companyName || "")],
              ["License No.", String(agencyContact.licenseNo || "")],
              ["Contact Person", String(agencyContact.contactPerson || "")],
              ["Phone", String(agencyContact.phone || "")],
              ["Passport No.", String(agencyContact.passportNo || "")],
              ["Home Country Contact Number", String(agencyContact.homeCountryContactNumber || "")],
            ].map(([label, value]) => (
              <div key={label} className="contents">
                <p className="py-1 font-semibold text-muted-foreground md:text-right">{label}</p>
                <p className="py-1 whitespace-pre-wrap">{value}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
};

export default MaidProfileFullView;
