import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/sonner";
import { MaidProfile } from "@/lib/maids";

const tabs = ["PROFILE", "SKILLS", "EMPLOYMENT HISTORY", "AVAILABILITY/REMARK", "INTRODUCTION", "PUBLIC INTRODUCTION", "PRIVATE INFO"];
const languageOptions = [
  "English",
  "Mandarin/Chinese-Dialect",
  "Indonesian/Malaysian",
  "Hindi",
  "Tamil",
  "Malayalam",
  "Telegu",
  "Karnataka",
];
const skillAreas = [
  "Care of infants/children",
  "Care of elderly",
  "Care of disabled",
  "General housework",
  "Cooking",
  "Language Skill",
  "Other Skill",
];
const yesNoQuestions = [
  "Able to handle pork?",
  "Able to eat pork?",
  "Able to care for dog/cat?",
  "Able to do simple sewing?",
  "Able to do gardening work?",
  "Willing to wash car?",
  "Can work on off-days with compensation?",
];
const medicalQuestions = [
  "Mental illness",
  "Epilepsy",
  "Asthma",
  "Diabetes",
  "Hypertension",
  "Tuberculosis",
  "Heart disease",
  "Malaria",
  "Operations",
];

const AddMaid = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [profile, setProfile] = useState({
    fullName: "",
    referenceCode: "",
    type: "New maid",
    nationality: "Filipino maid",
    dateOfBirth: "",
    placeOfBirth: "",
    height: "150",
    weight: "50",
    religion: "Catholic",
    maritalStatus: "Single",
    numberOfChildren: "0",
    numberOfSiblings: "0",
    homeAddress: "",
    airportRepatriation: "",
    educationLevel: "High School (10-12 yrs)",
    offDaysPerMonth: "2",
    passportNo: "",
    homeCountryContactNumber: "",
  });
  const [languageSkills, setLanguageSkills] = useState<Record<string, string>>(
    Object.fromEntries(languageOptions.map((lang) => [lang, lang === "English" ? "Good" : "Poor"]))
  );
  const [workAreas, setWorkAreas] = useState<Record<string, { willing: boolean; experience: boolean; evaluation: string }>>(
    Object.fromEntries(skillAreas.map((skill) => [skill, { willing: false, experience: false, evaluation: "-" }]))
  );
  const [otherInformation, setOtherInformation] = useState<Record<string, boolean>>(
    Object.fromEntries(yesNoQuestions.map((question) => [question, false]))
  );
  const [employmentHistory, setEmploymentHistory] = useState<Array<Record<string, string>>>([
    { from: "", to: "", country: "", employer: "", duties: "", remarks: "" },
  ]);
  const [availabilityRemark, setAvailabilityRemark] = useState("");
  const [introduction, setIntroduction] = useState("");
  const [publicIntroduction, setPublicIntroduction] = useState("");
  const [privateInfo, setPrivateInfo] = useState("");
  const [medicalInfo, setMedicalInfo] = useState({
    allergies: "",
    physicalDisabilities: "",
    dietaryRestrictions: "",
    foodHandlingPreferences: "",
    pastIllnesses: Object.fromEntries(medicalQuestions.map((question) => [question, false])) as Record<string, boolean>,
    otherIllnesses: "",
    otherRemarks: "",
  });
  const [availabilityInfo, setAvailabilityInfo] = useState({
    availability: "",
    contractEnds: "",
    presentSalary: "",
    expectedSalary: "",
    offdayCompensation: "",
  });
  const [privateDetails, setPrivateDetails] = useState({
    agesOfChildren: "",
    maidLoan: "",
  });
  const [agencyContact, setAgencyContact] = useState({
    companyName: "At The Agency (formerly Rinzin Agency Pte. Ltd)",
    licenseNo: "2503114",
    contactPerson: "Bala",
    phone: "80730757",
  });

  const nextLabel = useMemo(() => (activeTab < tabs.length - 1 ? "Save and Continue" : "Save Maid"), [activeTab]);

  const handleProfileChange = (field: keyof typeof profile, value: string) => {
    setProfile((prev) => ({ ...prev, [field]: value }));
  };

  const updateWorkArea = (skill: string, field: "willing" | "experience" | "evaluation", value: boolean | string) => {
    setWorkAreas((prev) => ({
      ...prev,
      [skill]: {
        ...prev[skill],
        [field]: value,
      },
    }));
  };

  const updateEmploymentRow = (index: number, field: string, value: string) => {
    setEmploymentHistory((prev) => prev.map((row, rowIndex) => (rowIndex === index ? { ...row, [field]: value } : row)));
  };

  const addEmploymentRow = () => {
    setEmploymentHistory((prev) => [...prev, { from: "", to: "", country: "", employer: "", duties: "", remarks: "" }]);
  };

  const removeLastEmploymentRow = () => {
    setEmploymentHistory((prev) => (prev.length > 1 ? prev.slice(0, -1) : prev));
  };

  const buildPayload = (): MaidProfile => ({
    fullName: profile.fullName,
    referenceCode: profile.referenceCode,
    type: profile.type,
    nationality: profile.nationality,
    dateOfBirth: profile.dateOfBirth,
    placeOfBirth: profile.placeOfBirth,
    height: Number(profile.height) || 0,
    weight: Number(profile.weight) || 0,
    religion: profile.religion,
    maritalStatus: profile.maritalStatus,
    numberOfChildren: Number(profile.numberOfChildren) || 0,
    numberOfSiblings: Number(profile.numberOfSiblings) || 0,
    homeAddress: profile.homeAddress,
    airportRepatriation: profile.airportRepatriation,
    educationLevel: profile.educationLevel,
    languageSkills,
    skillsPreferences: {
      availabilityRemark,
      privateInfo,
      offDaysPerMonth: profile.offDaysPerMonth,
      otherInformation,
    },
    workAreas,
    employmentHistory,
    introduction: {
      intro: introduction,
      publicIntro: publicIntroduction,
      allergies: medicalInfo.allergies,
      physicalDisabilities: medicalInfo.physicalDisabilities,
      dietaryRestrictions: medicalInfo.dietaryRestrictions,
      foodHandlingPreferences: medicalInfo.foodHandlingPreferences,
      pastIllnesses: medicalInfo.pastIllnesses,
      otherIllnesses: medicalInfo.otherIllnesses,
      otherRemarks: medicalInfo.otherRemarks,
      availability: availabilityInfo.availability,
      contractEnds: availabilityInfo.contractEnds,
      presentSalary: availabilityInfo.presentSalary,
      expectedSalary: availabilityInfo.expectedSalary,
      offdayCompensation: availabilityInfo.offdayCompensation,
      agesOfChildren: privateDetails.agesOfChildren,
      maidLoan: privateDetails.maidLoan,
    },
    agencyContact: {
      ...agencyContact,
      passportNo: profile.passportNo,
      homeCountryContactNumber: profile.homeCountryContactNumber,
    },
    isPublic: false,
    hasPhoto: false,
  });

  const handleContinue = () => {
    if (activeTab < tabs.length - 1) {
      setActiveTab((prev) => prev + 1);
      return;
    }
    void handleSubmit();
  };

  const handleSubmit = async () => {
    try {
      setIsSubmitting(true);
      const payload = buildPayload();
      const response = await fetch("/api/maids", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await response.json()) as { error?: string; maid?: MaidProfile };
      if (!response.ok || !data.maid) {
        throw new Error(data.error || "Failed to create maid");
      }

      toast.success("Maid created successfully");
      navigate(`/maid/${encodeURIComponent(data.maid.referenceCode)}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create maid");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="page-container">
      <div className="mb-6 flex items-center gap-3">
        <h2 className="text-xl font-bold">Add Maid</h2>
      </div>

      <div className="mb-6 flex flex-wrap gap-2 border-b pb-2">
        {tabs.map((tab, i) => (
          <button
            key={tab}
            onClick={() => setActiveTab(i)}
            className={`rounded-full px-4 py-2 text-xs font-semibold transition-all ${
              activeTab === i ? "bg-primary text-white shadow" : "bg-muted text-muted-foreground hover:bg-muted/70"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {activeTab === 0 && (
        <div className="content-card animate-fade-in-up space-y-6">
          <h3 className="text-center text-lg font-bold">(A) PROFILE OF FDW</h3>

          <div className="section-header">A1. Personal Information</div>
          <div className="space-y-3 pt-2">
            {[
  ["Maid Name", "Ref Code"],
  ["Type", "Nationality"],
  ["Date of Birth", "Place of Birth"],
  ["Height", "Weight"],
].map((row, i) => (
  <div key={i} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
    {row.map((label) => (
      <div key={label} className="flex flex-col gap-1">
        <Label className="text-xs font-medium text-muted-foreground">
          {label === "Height"
            ? "Height (cm)"
            : label === "Weight"
            ? "Weight (kg)"
            : label}
        </Label>

        {label === "Maid Name" && (
          <Input
            value={profile.fullName}
            onChange={(e) => handleProfileChange("fullName", e.target.value)}
          />
        )}

        {label === "Ref Code" && (
          <Input
            value={profile.referenceCode}
            onChange={(e) => handleProfileChange("referenceCode", e.target.value)}
          />
        )}

        {label === "Type" && (
          <select
            className="w-full rounded-md border bg-background px-3 py-2 text-sm"
            value={profile.type}
            onChange={(e) => handleProfileChange("type", e.target.value)}
          >
            <option>New maid</option>
            <option>Transfer maid</option>
            <option>APS maid</option>
            <option>Ex-Singapore maid</option>
            <option>Ex-Hong Kong maid</option>
            <option>Ex-Taiwan maid</option>
            <option>Ex-Malaysia maid</option>
            <option>Ex-Middle East maid</option>
          </select>
        )}
                    {label === "Nationality" && (
                      <select className="w-full rounded-md border bg-background px-3 py-2 text-sm" value={profile.nationality} onChange={(e) => handleProfileChange("nationality", e.target.value)}>
                        <option>Filipino maid</option>
                        <option>Indonesian maid</option>
                        <option>Indian maid</option>
                        <option>Myanmar maid</option>
                      </select>
                    )}
                    {label === "Date of Birth" && <Input type="date" value={profile.dateOfBirth} onChange={(e) => handleProfileChange("dateOfBirth", e.target.value)} />}
                    {label === "Place of Birth" && <Input value={profile.placeOfBirth} onChange={(e) => handleProfileChange("placeOfBirth", e.target.value)} />}
                    {label === "Height" && <Input type="number" value={profile.height} onChange={(e) => handleProfileChange("height", e.target.value)} />}
                    {label === "Weight" && <Input type="number" value={profile.weight} onChange={(e) => handleProfileChange("weight", e.target.value)} />}
                  </div>
                ))}
              </div>
            ))}

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="flex flex-col gap-1">
                <Label className="text-xs font-medium text-muted-foreground">Number of Children</Label>
                <Input type="number" value={profile.numberOfChildren} onChange={(e) => handleProfileChange("numberOfChildren", e.target.value)} />
              </div>
              <div className="flex flex-col gap-1">
                <Label className="text-xs font-medium text-muted-foreground">Number of Siblings</Label>
                <Input type="number" value={profile.numberOfSiblings} onChange={(e) => handleProfileChange("numberOfSiblings", e.target.value)} />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="flex flex-col gap-1">
                <Label className="text-xs font-medium text-muted-foreground">Marital Status</Label>
                <select className="w-full rounded-md border bg-background px-3 py-2 text-sm" value={profile.maritalStatus} onChange={(e) => handleProfileChange("maritalStatus", e.target.value)}>
                  <option>Single</option>
                  <option>Married</option>
                  <option>Divorced</option>
                  <option>Widowed</option>
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <Label className="text-xs font-medium text-muted-foreground">Religion</Label>
                <select className="w-full rounded-md border bg-background px-3 py-2 text-sm" value={profile.religion} onChange={(e) => handleProfileChange("religion", e.target.value)}>
                  <option>Catholic</option>
                  <option>Christian</option>
                  <option>Muslim</option>
                  <option>Hindu</option>
                  <option>Buddhist</option>
                </select>
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <Label className="text-xs font-medium text-muted-foreground">Address in Home Country</Label>
              <Input value={profile.homeAddress} onChange={(e) => handleProfileChange("homeAddress", e.target.value)} />
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="flex flex-col gap-1">
                <Label className="text-xs font-medium text-muted-foreground">Airport To Be Repatriated</Label>
                <Input value={profile.airportRepatriation} onChange={(e) => handleProfileChange("airportRepatriation", e.target.value)} />
              </div>
              <div className="flex flex-col gap-1">
                <Label className="text-xs font-medium text-muted-foreground">Education</Label>
                <select className="w-full rounded-md border bg-background px-3 py-2 text-sm" value={profile.educationLevel} onChange={(e) => handleProfileChange("educationLevel", e.target.value)}>
                  <option>College/Degree (&gt;=13 yrs)</option>
                  <option>High School (10-12 yrs)</option>
                  <option>Primary (&lt;=6 yrs)</option>
                </select>
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <Label className="text-xs font-medium text-muted-foreground">Contact Number in Home Country</Label>
              <Input value={profile.homeCountryContactNumber} onChange={(e) => handleProfileChange("homeCountryContactNumber", e.target.value)} />
            </div>
          </div>

          <div className="section-header">Language Skills</div>
          <div className="space-y-3 pt-2">
            {languageOptions.map((lang) => (
              <div key={lang} className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <Label className="w-56 text-sm">{lang}:</Label>
                <div className="flex flex-wrap gap-4">
                  {["Zero", "Poor", "Little", "Fair", "Good"].map((level) => (
                    <label key={level} className="flex items-center gap-1 text-sm">
                      <input
                        type="radio"
                        name={lang}
                        checked={languageSkills[lang] === level}
                        onChange={() => setLanguageSkills((prev) => ({ ...prev, [lang]: level }))}
                        className="accent-primary"
                      />
                      {level}
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="section-header">Other Information</div>
          <div className="space-y-2 pt-2">
            {yesNoQuestions.map((question) => (
              <div key={question} className="flex items-center gap-4">
                <span className="flex-1 text-sm">{question}</span>
                <div className="flex gap-3">
                  <label className="flex items-center gap-1 text-sm"><input type="radio" name={question} checked={otherInformation[question] === true} onChange={() => setOtherInformation((prev) => ({ ...prev, [question]: true }))} /> Yes</label>
                  <label className="flex items-center gap-1 text-sm"><input type="radio" name={question} checked={otherInformation[question] === false} onChange={() => setOtherInformation((prev) => ({ ...prev, [question]: false }))} /> No</label>
                </div>
              </div>
            ))}
          </div>

          <div className="section-header">A2. Medical History / Dietary Restrictions</div>
          <div className="space-y-3 pt-2">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="flex flex-col gap-1">
                <Label className="text-xs text-muted-foreground">Allergies (if any)</Label>
                <Input value={medicalInfo.allergies} onChange={(e) => setMedicalInfo((prev) => ({ ...prev, allergies: e.target.value }))} />
              </div>
              <div className="flex flex-col gap-1">
                <Label className="text-xs text-muted-foreground">Physical disabilities</Label>
                <Input value={medicalInfo.physicalDisabilities} onChange={(e) => setMedicalInfo((prev) => ({ ...prev, physicalDisabilities: e.target.value }))} />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="flex flex-col gap-1">
                <Label className="text-xs text-muted-foreground">Dietary restrictions</Label>
                <Input value={medicalInfo.dietaryRestrictions} onChange={(e) => setMedicalInfo((prev) => ({ ...prev, dietaryRestrictions: e.target.value }))} />
              </div>
              <div className="flex flex-col gap-1">
                <Label className="text-xs text-muted-foreground">Food handling preferences</Label>
                <Input value={medicalInfo.foodHandlingPreferences} onChange={(e) => setMedicalInfo((prev) => ({ ...prev, foodHandlingPreferences: e.target.value }))} />
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium">Past and existing illnesses</p>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {medicalQuestions.map((illness) => (
                  <div key={illness} className="flex items-center gap-3">
                    <span className="flex-1 text-sm">{illness}</span>
                    <div className="flex gap-2">
                      <label className="flex items-center gap-1 text-xs">
                        <input
                          type="radio"
                          name={illness}
                          checked={medicalInfo.pastIllnesses[illness] === true}
                          onChange={() =>
                            setMedicalInfo((prev) => ({
                              ...prev,
                              pastIllnesses: { ...prev.pastIllnesses, [illness]: true },
                            }))
                          }
                        />
                        Yes
                      </label>
                      <label className="flex items-center gap-1 text-xs">
                        <input
                          type="radio"
                          name={illness}
                          checked={medicalInfo.pastIllnesses[illness] === false}
                          onChange={() =>
                            setMedicalInfo((prev) => ({
                              ...prev,
                              pastIllnesses: { ...prev.pastIllnesses, [illness]: false },
                            }))
                          }
                        />
                        No
                      </label>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <Label className="text-xs text-muted-foreground">Others (please specify)</Label>
              <Input value={medicalInfo.otherIllnesses} onChange={(e) => setMedicalInfo((prev) => ({ ...prev, otherIllnesses: e.target.value }))} />
            </div>
          </div>

          <div className="section-header">A3. Others</div>
          <div className="pt-2">
            <Label className="text-xs text-muted-foreground">Any other remarks</Label>
            <Input value={medicalInfo.otherRemarks} onChange={(e) => setMedicalInfo((prev) => ({ ...prev, otherRemarks: e.target.value }))} />
          </div>

          <div className="flex justify-center pt-4">
            <Button className="bg-accent px-8 text-accent-foreground hover:bg-accent/90" disabled={isSubmitting} onClick={handleContinue}>
              {isSubmitting ? "Saving..." : nextLabel}
            </Button>
          </div>
        </div>
      )}

      {activeTab === 1 && (
        <div className="content-card animate-fade-in-up space-y-4">
          <h3 className="text-center font-bold">Maid Skills</h3>
          <table className="w-full border text-sm">
            <thead>
              <tr className="bg-muted">
                <th className="border px-3 py-2 text-left">Areas of Work</th>
                <th className="border px-3 py-2">Willingness</th>
                <th className="border px-3 py-2">Experience</th>
                <th className="border px-3 py-2">Evaluation</th>
              </tr>
            </thead>
            <tbody>
              {skillAreas.map((skill) => (
                  <tr
                    key={skill}
                    className="hover:bg-muted/50 transition-colors">
                    <td className="border px-4 py-3 font-medium text-sm">
                      {skill}
                    </td>
                    <td className="border px-4 py-3 text-center">
                      <input
                        type="checkbox"
                        className="h-4 w-4 accent-primary cursor-pointer"
                        checked={workAreas[skill]?.willing ?? false}
                        onChange={(e) =>
                          updateWorkArea(skill, "willing", e.target.checked)
                        }
                      />
                    </td>
                    <td className="border px-4 py-3 text-center">
                      <input
                        type="checkbox"
                        className="h-4 w-4 accent-primary cursor-pointer"
                        checked={workAreas[skill]?.experience ?? false}
                        onChange={(e) =>
                          updateWorkArea(skill, "experience", e.target.checked)
                        }
                      />
                    </td>
                    <td className="border px-4 py-3 text-center">
                      <select
                        className="rounded-md border px-2 py-1 text-xs bg-background shadow-sm hover:border-primary focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
                        value={workAreas[skill]?.evaluation ?? "-"}
                        onChange={(e) =>
                          updateWorkArea(skill, "evaluation", e.target.value)
                        }
                      >
                        <option value="-">Select</option>
                        <option value="*">⭐</option>
                        <option value="**">⭐⭐</option>
                        <option value="***">⭐⭐⭐</option>
                        <option value="****">⭐⭐⭐⭐</option>
                        <option value="*****">⭐⭐⭐⭐⭐</option>
                      </select>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
          <div className="flex justify-center pt-4">
            <Button className="bg-accent px-8 text-accent-foreground hover:bg-accent/90" disabled={isSubmitting} onClick={handleContinue}>
              {nextLabel}
            </Button>
          </div>
        </div>
      )}

      {activeTab === 2 && (
        <div className="content-card animate-fade-in-up space-y-4">
          <h3 className="text-center font-bold">Employment History</h3>
          <table className="w-full border border-collapse text-sm">
            <thead>
              <tr className="bg-muted">
                <th className="border px-3 py-2">From</th>
                <th className="border px-3 py-2">To</th>
                <th className="border px-3 py-2">Country</th>
                <th className="border px-3 py-2">Employer</th>
                <th className="border px-3 py-2">Maid Duties</th>
                <th className="border px-3 py-2">Remarks</th>
              </tr>
            </thead>
            <tbody>
              {employmentHistory.map((row, index) => (
                <tr key={`${index}-${row.from}-${row.to}`} className="hover:bg-muted/50 transition-colors align-top">
                  {(["from", "to", "country", "employer", "duties", "remarks"] as const).map((field) => {
                    const isDateField = field === "from" || field === "to";
                    const isLongText = field === "duties" || field === "remarks";

                    return (
                      <td key={field} className="border px-2 py-1 align-top">
                        {isDateField ? (
                          <input
                            type="date"
                            className="h-8 w-full text-xs px-2 border rounded-md focus:outline-none focus:ring-1 focus:ring-primary"
                            value={row[field]}
                            onChange={(e) => updateEmploymentRow(index, field, e.target.value)}
                          />
                        ) : isLongText ? (
                          <textarea
                            className="w-full text-xs px-2 py-1 border rounded-md resize-none focus:outline-none focus:ring-1 focus:ring-primary"
                            rows={2}
                            value={row[field]}
                            onChange={(e) => updateEmploymentRow(index, field, e.target.value)}
                          />
                        ) : (
                          <Input
                            className="h-8 w-full text-xs px-2 border rounded-md focus:outline-none focus:ring-1 focus:ring-primary"
                            value={row[field]}
                            onChange={(e) => updateEmploymentRow(index, field, e.target.value)}
                          />
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>

          <div className="flex justify-center gap-4 pt-4">
            <Button className="bg-green-600 px-4 text-white hover:bg-green-700" onClick={addEmploymentRow}>Add Row</Button>
            <Button className="bg-red-500 px-4 text-white hover:bg-red-600" onClick={removeLastEmploymentRow}>Remove Last Row</Button>
            <Button className="bg-accent px-8 text-accent-foreground hover:bg-accent/90" disabled={isSubmitting} onClick={handleContinue}>
              {nextLabel}
            </Button>
          </div>
        </div>
      )}

      {activeTab === 3 && (
        <div className="content-card animate-fade-in-up space-y-4">
          <h3 className="mb-4 text-center font-bold">Availability / Remark</h3>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-1">
              <Label className="text-xs font-medium text-muted-foreground">When will this maid be available?</Label>
              <Input value={availabilityInfo.availability} onChange={(e) => setAvailabilityInfo((prev) => ({ ...prev, availability: e.target.value }))} />
            </div>
            <div className="flex flex-col gap-1">
              <Label className="text-xs font-medium text-muted-foreground">Contract Ends</Label>
              <Input value={availabilityInfo.contractEnds} onChange={(e) => setAvailabilityInfo((prev) => ({ ...prev, contractEnds: e.target.value }))} />
            </div>
            <div className="flex flex-col gap-1">
              <Label className="text-xs font-medium text-muted-foreground">Present Salary (S$)</Label>
              <Input value={availabilityInfo.presentSalary} onChange={(e) => setAvailabilityInfo((prev) => ({ ...prev, presentSalary: e.target.value }))} />
            </div>
            <div className="flex flex-col gap-1">
              <Label className="text-xs font-medium text-muted-foreground">Expected Salary</Label>
              <Input value={availabilityInfo.expectedSalary} onChange={(e) => setAvailabilityInfo((prev) => ({ ...prev, expectedSalary: e.target.value }))} />
            </div>
            <div className="flex flex-col gap-1">
              <Label className="text-xs font-medium text-muted-foreground">Offday Compensation (S$/day)</Label>
              <Input value={availabilityInfo.offdayCompensation} onChange={(e) => setAvailabilityInfo((prev) => ({ ...prev, offdayCompensation: e.target.value }))} />
            </div>
            <div className="flex flex-col gap-1">
              <Label className="text-xs font-medium text-muted-foreground">Number of off-days per month</Label>
              <Input value={profile.offDaysPerMonth} onChange={(e) => handleProfileChange("offDaysPerMonth", e.target.value)} />
            </div>
            <div className="flex flex-col gap-1">
              <Label className="text-xs font-medium text-muted-foreground">Passport No.</Label>
              <Input value={profile.passportNo} onChange={(e) => handleProfileChange("passportNo", e.target.value)} />
            </div>
          </div>
          <textarea className="min-h-[200px] w-full rounded-md border bg-background px-3 py-2 text-sm" placeholder="Enter availability / remark here..." value={availabilityRemark} onChange={(e) => setAvailabilityRemark(e.target.value)} />
          <div className="flex justify-center pt-4">
            <Button className="bg-accent px-8 text-accent-foreground hover:bg-accent/90" disabled={isSubmitting} onClick={handleContinue}>{nextLabel}</Button>
          </div>
        </div>
      )}

      {activeTab === 4 && (
        <div className="content-card animate-fade-in-up space-y-4">
          <h3 className="mb-4 text-center font-bold">Introduction</h3>
          <textarea className="min-h-[260px] w-full rounded-md border bg-background px-3 py-2 text-sm" placeholder="Enter employer-login introduction here..." value={introduction} onChange={(e) => setIntroduction(e.target.value)} />
          <div className="flex justify-center pt-4">
            <Button className="bg-accent px-8 text-accent-foreground hover:bg-accent/90" disabled={isSubmitting} onClick={handleContinue}>{nextLabel}</Button>
          </div>
        </div>
      )}

      {activeTab === 5 && (
        <div className="content-card animate-fade-in-up space-y-4">
          <h3 className="mb-4 text-center font-bold">Public Introduction</h3>
          <textarea className="min-h-[260px] w-full rounded-md border bg-background px-3 py-2 text-sm" placeholder="Enter public introduction here..." value={publicIntroduction} onChange={(e) => setPublicIntroduction(e.target.value)} />
          <div className="flex justify-center pt-4">
            <Button className="bg-accent px-8 text-accent-foreground hover:bg-accent/90" disabled={isSubmitting} onClick={handleContinue}>{nextLabel}</Button>
          </div>
        </div>
      )}

      {activeTab === 6 && (
        <div className="content-card animate-fade-in-up space-y-4">
          <h3 className="mb-4 text-center font-bold">Private Info</h3>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-1">
              <Label className="text-xs font-medium text-muted-foreground">Agency Name</Label>
              <Input value={agencyContact.companyName} onChange={(e) => setAgencyContact((prev) => ({ ...prev, companyName: e.target.value }))} />
            </div>
            <div className="flex flex-col gap-1">
              <Label className="text-xs font-medium text-muted-foreground">License No.</Label>
              <Input value={agencyContact.licenseNo} onChange={(e) => setAgencyContact((prev) => ({ ...prev, licenseNo: e.target.value }))} />
            </div>
            <div className="flex flex-col gap-1">
              <Label className="text-xs font-medium text-muted-foreground">Contact Person</Label>
              <Input value={agencyContact.contactPerson} onChange={(e) => setAgencyContact((prev) => ({ ...prev, contactPerson: e.target.value }))} />
            </div>
            <div className="flex flex-col gap-1">
              <Label className="text-xs font-medium text-muted-foreground">Phone</Label>
              <Input value={agencyContact.phone} onChange={(e) => setAgencyContact((prev) => ({ ...prev, phone: e.target.value }))} />
            </div>
            <div className="flex flex-col gap-1">
              <Label className="text-xs font-medium text-muted-foreground">Ages of Children</Label>
              <Input value={privateDetails.agesOfChildren} onChange={(e) => setPrivateDetails((prev) => ({ ...prev, agesOfChildren: e.target.value }))} />
            </div>
            <div className="flex flex-col gap-1">
              <Label className="text-xs font-medium text-muted-foreground">Maid Loan (S$)</Label>
              <Input value={privateDetails.maidLoan} onChange={(e) => setPrivateDetails((prev) => ({ ...prev, maidLoan: e.target.value }))} />
            </div>
          </div>
          <textarea className="min-h-[200px] w-full rounded-md border bg-background px-3 py-2 text-sm" placeholder="Enter private information here..." value={privateInfo} onChange={(e) => setPrivateInfo(e.target.value)} />
          <div className="flex justify-center pt-4">
            <Button className="bg-accent px-8 text-accent-foreground hover:bg-accent/90" disabled={isSubmitting} onClick={handleContinue}>
              {isSubmitting ? "Saving..." : nextLabel}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AddMaid;
