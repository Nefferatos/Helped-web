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


const SectionHeader = ({ title }: { title: string }) => (
  <div className="border-b bg-muted/50 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-foreground">
    {title}
  </div>
);

const SubHeader = ({ title }: { title: string }) => (
  <div className="border-b bg-muted/30 px-4 py-1 text-[11px] font-semibold text-foreground">
    {title}
  </div>
);

const Row = ({ label, value }: { label: string; value: string }) => (
  <div className="grid grid-cols-[180px_1fr] border-b last:border-b-0">
    <span className="border-r px-4 py-[5px] text-[13px] leading-snug text-foreground font-medium">
      {label}
    </span>
    <span className="px-3 py-[5px] text-[13px] leading-snug whitespace-pre-wrap text-foreground break-words">
      {value}
    </span>
  </div>
);

const YesNo = ({ value }: { value: boolean }) =>
  value ? (
    <span className="rounded px-2 py-0.5 text-[11px] font-medium bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300">
      YES
    </span>
  ) : (
    <span className="rounded px-2 py-0.5 text-[11px] font-medium bg-muted text-muted-foreground">
      NO
    </span>
  );

const YesNoRow = ({ label, value }: { label: string; value: boolean }) => (
  <div className="grid grid-cols-[1fr_56px] border-b last:border-b-0">
    <span className="border-r px-4 py-[5px] text-[13px] leading-snug text-foreground">
      {label}
    </span>
    <span className="flex items-center justify-center py-[5px]">
      <YesNo value={value} />
    </span>
  </div>
);


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
    const allowedKeys = new Set<string>(fixedLanguageKeyMap.flatMap((item) => [...item.keys]));
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
      <div className="mb-3 flex items-center gap-3">
        <button
          onClick={() => navigate(adminPath(`/maid/${encodeURIComponent(maid.referenceCode)}`))}
          className="group inline-flex items-center gap-1 text-sm font-medium text-primary transition-colors hover:text-primary/80 active:scale-95 focus:outline-none focus:ring-2 focus:ring-primary/30 rounded-md"
        >
          <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
          Back to Profile
        </button>
      </div>

      <div className="animate-fade-in-up overflow-hidden rounded-lg border bg-background">

        <div className="border-b px-4 py-3">
          <h2 className="text-base font-semibold">Full View: {maid.fullName}</h2>
          <p className="text-xs text-muted-foreground">{maid.referenceCode}</p>
        </div>

        <SectionHeader title="Profile" />
        <Row label="Maid Name" value={maid.fullName} />
        <Row label="Ref Code" value={maid.referenceCode} />
        <Row label="Type" value={maid.type ?? ""} />
        <Row label="Nationality" value={maid.nationality ?? ""} />
        <Row label="Indian Maid Category" value={String(skillsPreferences.indianMaidCategory || "")} />
        <Row label="Date of Birth" value={maid.dateOfBirth ?? ""} />
        <Row label="Place of Birth" value={maid.placeOfBirth ?? ""} />
        <Row label="Height" value={`${String(maid.height)} cm`} />
        <Row label="Weight" value={`${String(maid.weight)} kg`} />
        <Row label="Residential Address" value={maid.homeAddress ?? ""} />
        <Row label="Airport / Port" value={maid.airportRepatriation ?? ""} />
        <Row label="Home Country Contact" value={String(agencyContact.homeCountryContactNumber || "")} />
        <Row label="Education" value={maid.educationLevel ?? ""} />
        <Row label="Religion" value={maid.religion ?? ""} />
        <Row label="Marital Status" value={maid.maritalStatus ?? ""} />
        <Row label="Number of Siblings" value={String(maid.numberOfSiblings)} />
        <Row label="Number of Children" value={String(maid.numberOfChildren)} />
        <Row label="Ages of Children" value={String(introduction.agesOfChildren || "")} />
        <Row label="Present Salary (S$)" value={String(introduction.presentSalary || "")} />
        <Row label="Expected Salary" value={String(introduction.expectedSalary || "")} />
        <Row label="When Available?" value={String(introduction.availability || "")} />
        <Row label="Contract Ends" value={String(introduction.contractEnds || "")} />
        <Row label="Maid Loan (S$)" value={String(introduction.maidLoan || "")} />
        <Row label="Offday Compensation (S$/day)" value={String(introduction.offdayCompensation || "")} />
        <Row label="Off-days Per Month" value={String(skillsPreferences.offDaysPerMonth || "")} />
        <Row label="Status" value={String(maid.status || "available")} />
        <Row label="Public" value={String(Boolean(maid.isPublic))} />
        <Row label="Video Link" value={String(maid.videoDataUrl || "")} />

        <SubHeader title="Photos" />
        <div className="border-b px-4 py-3">
          <div className="grid grid-cols-5 gap-2">
            {Array.from({ length: 5 }, (_, index) => {
              const url = photos[index] || "";
              const label = index === 0 ? "Passport / 2×2" : index === 1 ? "Full body" : `Extra ${index - 1}`;
              return (
                <div key={label} className="space-y-1">
                  <p className="text-[10px] text-muted-foreground">{label}</p>
                  <div className="aspect-[3/4] w-full overflow-hidden rounded border bg-muted/30 flex items-center justify-center">
                    {url
                      ? <img src={url} alt={label} className="h-full w-full object-cover" />
                      : <span className="text-[10px] text-muted-foreground">Empty</span>
                    }
                  </div>
                </div>
              );
            })}
          </div>
          <p className="mt-1.5 text-[11px] text-muted-foreground">{photos.length}/5 photos uploaded</p>
        </div>

        <SectionHeader title="Skills" />

        <SubHeader title="Language Skills" />
        {fixedLanguageKeyMap.map((item) => {
          const level = item.keys.map((key) => (maid.languageSkills || {})[key]).find((val) => String(val || "").trim());
          if (!level) return null;
          return <Row key={item.label} label={item.label} value={String(level)} />;
        })}
        {otherLanguages.length > 0 && (
          <div className="border-b px-4 py-1.5">
            <button
              type="button"
              className="text-[12px] text-primary hover:underline"
              onClick={() => setShowOtherLanguages((prev) => !prev)}
            >
              {showOtherLanguages ? "Hide other languages" : `Show ${otherLanguages.length} other language(s)`}
            </button>
          </div>
        )}
        {showOtherLanguages && otherLanguages.map(([language, level]) => (
          <Row key={language} label={language} value={level} />
        ))}

        <SubHeader title="Other Information" />
        {availabilityRemarkItems.map((item) => (
          <YesNoRow
            key={item.label}
            label={item.label}
            value={item.keys.some((key) => Boolean(otherInformation[key]))}
          />
        ))}

        <SubHeader title="Work Area Notes" />
        <Row label="Care of infants/children" value={String(workAreaNotes["Care of infants/children"] || "")} />
        <Row label="Cooking" value={String(workAreaNotes.Cooking || "")} />
        <Row label="Language abilities (spoken)" value={String(workAreaNotes["Language abilities (spoken)"] || "")} />
        <Row label="Other skills, if any" value={String(workAreaNotes["Other Skill"] || "")} />

        <SectionHeader title="Work Areas" />
        <div className="overflow-x-auto border-b">
          <table className="w-full border-collapse text-[13px] text-foreground">
            <thead>
              <tr className="bg-muted/50">
                {["Area", "Willing", "Experience", "Years", "Rating", "Note", "Evaluation"].map((h) => (
                  <th key={h} className="border-b border-r last:border-r-0 px-3 py-1.5 text-left text-[12px] font-semibold text-foreground whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {workAreas.map(([area, config]) => (
                <tr key={area} className="border-b last:border-b-0 hover:bg-muted/30">
                  <td className="border-r px-3 py-[6px]">{area}</td>
                  <td className="border-r px-3 py-[6px] text-center">{config.willing ? "Yes" : "No"}</td>
                  <td className="border-r px-3 py-[6px] text-center">{config.experience ? "Yes" : "No"}</td>
                  <td className="border-r px-3 py-[6px] text-center">{String(config.yearsOfExperience || "")}</td>
                  <td className="border-r px-3 py-[6px] text-center">
                    {config.rating === null || config.rating === undefined ? "N.A." : String(config.rating)}
                  </td>
                  <td className="border-r px-3 py-[6px] whitespace-pre-wrap">{String(config.note || "")}</td>
                  <td className="px-3 py-[6px] whitespace-pre-wrap">{String(config.evaluation || "")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <SectionHeader title="Employment History" />
        <div className="overflow-x-auto border-b">
          <table className="w-full border-collapse text-[13px] text-foreground">
            <thead>
              <tr className="bg-muted/50">
                {["From", "To", "Country", "Employer", "Duties", "Remarks"].map((h) => (
                  <th key={h} className="border-b border-r last:border-r-0 px-3 py-1.5 text-left text-[12px] font-semibold text-foreground whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {employment.map((row, index) => {
                const r = row as Record<string, unknown>;
                return (
                  <tr key={index} className="border-b last:border-b-0 hover:bg-muted/30">
                    <td className="border-r px-3 py-[6px] whitespace-nowrap">{String(r.from || "")}</td>
                    <td className="border-r px-3 py-[6px] whitespace-nowrap">{String(r.to || "")}</td>
                    <td className="border-r px-3 py-[6px]">{String(r.country || "")}</td>
                    <td className="border-r px-3 py-[6px]">{String(r.employer || "")}</td>
                    <td className="border-r px-3 py-[6px] whitespace-pre-wrap">{String(r.duties || "")}</td>
                    <td className="px-3 py-[6px] whitespace-pre-wrap">{String(r.remarks || "")}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* ── AVAILABILITY / REMARK ── */}
        <SectionHeader title="Availability / Remark" />
        <Row label="Availability Remark" value={String(skillsPreferences.availabilityRemark || "")} />
        <Row
          label="Interview Availability"
          value={interviewAvailabilityOptions.filter((opt) => availabilityInterviewOptions.includes(opt)).join(", ")}
        />
        <Row label="Previous SG Experience" value={String(skillsPreferences.sgExperience ?? "")} />

        {/* ── INTRODUCTION ── */}
        <SectionHeader title="Introduction" />
        <Row label="Intro (Private)" value={String(introduction.intro || "")} />

        {/* ── PUBLIC INTRODUCTION ── */}
        <SectionHeader title="Public Introduction" />
        <Row label="Public Intro" value={String(introduction.publicIntro || "")} />

        {/* ── PRIVATE INFO ── */}
        <SectionHeader title="Private Info" />
        <Row label="Interviewed by" value={String(skillsPreferences.interviewedBy || "")} />
        <Row label="Who Referred This Maid?" value={String(skillsPreferences.referredBy || "")} />
        <Row label="Passport Number" value={String(agencyContact.passportNo || "")} />
        <Row label="Telephone (Maid / Foreign Agency)" value={String(agencyContact.phone || "")} />
        <Row label="Agency Historical Record" value={String(skillsPreferences.privateInfo || "")} />

        {/* ── MEDICAL HISTORY ── */}
        <SectionHeader title="Medical History / Dietary Restrictions" />
        <Row label="Allergies (if any)" value={String(introduction.allergies || "")} />
        <Row label="Physical disabilities" value={String(introduction.physicalDisabilities || "")} />
        <Row label="Dietary restrictions" value={String(introduction.dietaryRestrictions || "")} />
        <Row label="Food handling preferences" value={String(introduction.foodHandlingPreferences || "")} />
        <Row label="Other Illnesses" value={String(introduction.otherIllnesses || "")} />
        <Row label="Any other remarks" value={String(introduction.otherRemarks || "")} />

        <SubHeader title="Past and existing illnesses" />
        {Object.entries(pastIllnesses).map(([key, value]) => (
          <YesNoRow key={key} label={key} value={Boolean(value)} />
        ))}

        <SectionHeader title="Agency Contact" />
        <Row label="Company Name" value={String(agencyContact.companyName || "")} />
        <Row label="License No." value={String(agencyContact.licenseNo || "")} />
        <Row label="Contact Person" value={String(agencyContact.contactPerson || "")} />
        <Row label="Phone" value={String(agencyContact.phone || "")} />
        <Row label="Passport No." value={String(agencyContact.passportNo || "")} />
        <Row label="Home Country Contact Number" value={String(agencyContact.homeCountryContactNumber || "")} />

      </div>
    </div>
  );
};

export default MaidProfileFullView;