import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const tabs = ["PROFILE", "SKILLS", "EMPLOYMENT HISTORY", "AVAILABILITY/REMARK", "INTRODUCTION", "PUBLIC INTRODUCTION", "PRIVATE INFO"];

const AddMaid = () => {
  const [activeTab, setActiveTab] = useState(0);

  return (
    <div className="page-container">
      <div className="flex items-center gap-3 mb-6">
        <h2 className="text-xl font-bold">Add Maid</h2>
      </div>

      <div className="flex flex-wrap gap-1 mb-6">
        {tabs.map((tab, i) => (
          <button
            key={tab}
            onClick={() => setActiveTab(i)}
            className={`px-3 py-2 text-xs font-medium rounded-t-md border border-b-0 transition-colors active:scale-[0.97] ${
              activeTab === i
                ? "bg-card text-primary border-border"
                : "bg-muted text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {activeTab === 0 && <ProfileTab />}
      {activeTab === 1 && <SkillsTab />}
      {activeTab === 2 && <EmploymentHistoryTab />}
      {activeTab === 3 && <AvailabilityRemarkTab />}
      {activeTab === 4 && <IntroductionTab />}
      {activeTab === 5 && <PublicIntroductionTab />}
      {activeTab === 6 && <PrivateInfoTab />}
    </div>
  );
};


const FormRow = ({ label, children }: { label: string; children: React.ReactNode; fullWidth?: boolean }) => (
  <div className="grid grid-cols-[auto_1fr] gap-2 items-center">
    <Label className="text-xs font-medium text-right whitespace-nowrap">{label}</Label>
    <div className="min-w-0">{children}</div>
  </div>
);

const FormRow2Col = ({ left, right }: { left: React.ReactNode; right?: React.ReactNode }) => (
  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3">
    <div>{left}</div>
    {right ? <div>{right}</div> : <div />}
  </div>
);

const RadioGroup = ({ name, options }: { name: string; options: string[] }) => (
  <div className="flex gap-4">
    {options.map((opt) => (
      <label key={opt} className="flex items-center gap-1 text-sm">
        <input type="radio" name={name} className="accent-primary" />
        {opt}
      </label>
    ))}
  </div>
);

const YesNo = ({ name }: { name: string }) => (
  <div className="flex gap-3">
    <label className="flex items-center gap-1 text-sm"><input type="radio" name={name} className="accent-primary" /> Yes</label>
    <label className="flex items-center gap-1 text-sm"><input type="radio" name={name} className="accent-primary" /> No</label>
  </div>
);

const SelectInput = ({ options, className }: { options: string[]; className?: string }) => (
  <select className={`rounded-md border bg-background px-3 py-2 text-sm ${className || "w-full"}`}>
    {options.map((o) => <option key={o}>{o}</option>)}
  </select>
);

const SaveButtons = () => (
  <div className="flex justify-center gap-4 pt-6">
    <Button className="px-8 bg-success text-success-foreground hover:bg-success/90">Save &amp; Continue</Button>
  </div>
);


const ProfileTab = () => {
  const currentYear = new Date().getFullYear(); 
  const futureYears = 10; 
  const years = Array.from(
    { length: currentYear - 1960 + 1 + futureYears }, 
    (_, i) => String(1960 + i)
  );

console.log(years);
  const days = Array.from({ length: 31 }, (_, i) => String(i + 1).padStart(2, "0"));
  const months = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, "0"));
  
  

  return (
    <div className="content-card animate-fade-in-up space-y-6">
      <h3 className="text-center font-bold text-lg">(A) PROFILE OF FDW</h3>

      <div className="section-header">A1. Personal Information</div>
      <div className="space-y-3 pt-2">
        <FormRow2Col
          left={<FormRow label="Maid Name:"><Input /></FormRow>}
          right={<FormRow label="Ref Code:"><Input /></FormRow>}
        />
        <FormRow2Col
          left={<FormRow label="Type:"><SelectInput options={["New maid", "Transfer maid","APS maid", "Ex-Singapore maid", "Ex-Hong Kong maid", "Ex-Middle East maid", "Ex-Taiwan maid", "Applying to work in Hong Kong", "Applying to work in Canada", "Applying to work in Taiwan"]} /></FormRow>}
          right={<FormRow label="Nationality:"><SelectInput options={["Filipino maid", "Indonesian maid", "Indian maid", "Myanmar maid", "Sri Lankan maid", "Bangladeshi maid", "Nepali maid", "Cambodian maid", "Others"]} /></FormRow>}
        />
        <FormRow2Col
          left={<div />}
          right={<FormRow label="Indian Maid Category:"><SelectInput options={["Select", "Mizoram maid", "Darjeeling maid", "Manipur maid", "Punjabi maid", "Others"]} /></FormRow>}
        />
        <FormRow2Col
          left={<FormRow label="Date of Birth:"><div className="flex gap-1"><SelectInput options={days} className="w-16" /><SelectInput options={months} className="w-16" /><SelectInput options={years} className="w-24" /></div></FormRow>}
          right={<FormRow label="Place Of Birth:"><Input /></FormRow>}
        />
        <FormRow2Col
          left={<FormRow label="Height:"><SelectInput options={["150cm (4'11\")", "152cm (5'0\")", "155cm (5'1\")", "156cm (5'1\")", "157cm (5'2\")", "160cm (5'3\")", "163cm (5'4\")", "165cm (5'5\")", "168cm (5'6\")", "170cm (5'7\")", "173cm (5'8\")", "175cm (5'9\")", "178cm (5'10\")", "180cm (5'11\")"]} /></FormRow>}
          right={<FormRow label="Weight:"><SelectInput options={["40Kg (88 lbs)", "42Kg (93 lbs)", "45Kg (99 lbs)", "48Kg (106 lbs)", "50Kg (110 lbs)", "52Kg (115 lbs)", "55Kg (121 lbs)", "58Kg (128 lbs)", "60Kg (132 lbs)", "63Kg (139 lbs)", "65Kg (143 lbs)", "68Kg (150 lbs)", "70Kg (154 lbs)"]} /></FormRow>}
        />

        <FormRow label="Residential Address in Home Country:"><Input /></FormRow>
        <FormRow label="Name of Port/Airport to be Repatriated:"><Input /></FormRow>
        <FormRow label="Contact Number in Home Country:"><Input /></FormRow>

        <FormRow2Col
          left={<FormRow label="Education:"><SelectInput options={["Primary Level(<=6 yrs)", "Secondary Level(7~9 yrs)", "High School(10~12 yrs)", "College/Degree (>=13 yrs)", "Diploma", "Undergraduate", "Others" ]} /></FormRow>}
          right={<FormRow label="Religion:"><SelectInput options={["Catholic", "Christian", "Muslim", "Hindu", "Buddhist", "Sikh", "Free Thinker", "Others"]} /></FormRow>}
        />
        <FormRow2Col
          left={<FormRow label="Number of Siblings:"><Input /></FormRow>}
          right={<FormRow label="Marital Status:"><SelectInput options={["Single", "Married", "Divorced", "Widowed", "Separated", "Others"]} /></FormRow>}
        />
        <FormRow2Col
          left={<FormRow label="Number of Children:"><SelectInput options={["0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10"]} /></FormRow>}
          right={<FormRow label="Ages of Children:"><Input /></FormRow>}
        />
        <FormRow2Col
          left={<FormRow label="Present Salary (S$):"><Input /></FormRow>}
          right={<FormRow label="Expected Salary:"><Input /></FormRow>}
        />
        <FormRow2Col
          left={<FormRow label="When will this maid be Available?"><Input /></FormRow>}
          right={<FormRow label="Contract Ends:"><div className="flex gap-1"><SelectInput options={["--", ...days]} className="w-16" /><SelectInput options={["--", ...months]} className="w-16" /><SelectInput options={["--", ...years.slice(0)]} className="w-24" /></div></FormRow>}
        />
        <FormRow2Col
          left={<FormRow label="Maid Loan (S$):"><Input /></FormRow>}
          right={<FormRow label="Offday Compensation (S$/day):"><Input defaultValue="0" /></FormRow>}
        />
      </div>

      <div className="section-header">Language Skills:</div>
      <div className="space-y-3 pt-2">
        {["English", "Mandarin/Chinese-Dialect", "Bahasa Indonesia/Malaysia", "Hindi", "Tamil", "Malayalam", "Telegu", "Karnataka"].map((lang) => (
          <div key={lang} className="flex flex-col sm:flex-row sm:items-center gap-2">
            <Label className="text-sm w-52 text-right font-medium">{lang}:</Label>
            <RadioGroup name={`lang_${lang}`} options={["Poor", "Little", "Fair", "Good"]} />
          </div>
        ))}
      </div>

      <div className="section-header">Other Information:</div>
      <div className="space-y-2 pt-2">
        {[
          "Able to handle pork?",
          "Able to eat pork?",
          "Able to care for dog/cat?",
          "Able to do simple sewing?",
          "Able to do gardening work?",
          "Willing to wash car?",
          "Willing to work on off-days with  compensation?",
        ].map((q) => (
          <div key={q} className="flex items-center gap-4">
            <span className="text-sm flex-1 text-right">{q}</span>
            <YesNo name={`other_${q}`} />
          </div>
        ))}
        <div className="flex items-center gap-4">
          <span className="text-sm flex-1 text-right">Number of off-days per month</span>
          <div className="flex items-center gap-2">
            <Input className="w-20" defaultValue="02" />
            <span className="text-sm">rest day(s) per month.</span>
          </div>
        </div>
      </div>

      <div className="section-header">A2. Medical History/Dietary Restrictions</div>
      <div className="space-y-3 pt-2">
        <FormRow label="Allergies (if any):"><Input /></FormRow>

        <p className="text-sm font-medium">Past and existing illnesses (including chronic ailments and illnesses requiring medication):</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2">
          {[
            ["(I) Mental illness", "illness_mental"],
            ["(II) Epilepsy", "illness_epilepsy"],
            ["(III) Asthma", "illness_asthma"],
            ["(IV) Diabetes", "illness_diabetes"],
            ["(V) Hypertension", "illness_hypertension"],
            ["(VI) Tuberculosis", "illness_tuberculosis"],
            ["(VII) Heart disease", "illness_heart"],
            ["(VIII) Malaria", "illness_malaria"],
            ["(IX) Operations", "illness_operations"],
          ].map(([label, name]) => (
            <div key={name} className="flex items-center gap-3">
              <span className="text-sm flex-1">{label}</span>
              <YesNo name={name} />
            </div>
          ))}
          <div className="flex items-center gap-3">
            <span className="text-sm flex-1">(X) Others:</span>
            <Input className="w-32" />
          </div>
        </div>

        <FormRow label="Physical disabilities:"><Input /></FormRow>
        <FormRow label="Dietary restrictions:"><Input /></FormRow>

        <div className="flex items-center gap-4 flex-wrap">
          <span className="text-sm font-medium">Food handling preferences:</span>
          <label className="flex items-center gap-1 text-sm">
            <input type="checkbox" className="accent-primary" /> No Pork
          </label>
          <label className="flex items-center gap-1 text-sm">
            <input type="checkbox" className="accent-primary" /> No Beef
          </label>
          <div className="flex items-center gap-1">
            <span className="text-sm">Others</span>
            <Input className="w-32" />
          </div>
        </div>
      </div>

      <div className="section-header">A3. Others</div>
      <div className="pt-2">
        <FormRow label="Any other remarks:"><Input /></FormRow>
      </div>

      <SaveButtons />
    </div>
  );
};


const skillRows = [
  { no: 1, label: "Care of infants/children", sub: "Please specify age range:", subField: true },
  { no: 2, label: "Care of elderly" },
  { no: 3, label: "Care of disabled" },
  { no: 4, label: "General housework" },
  { no: 5, label: "Cooking", sub: "Please specify cuisines:", subField: true },
  { no: 6, label: "Language abilities (spoken)", sub: "Please specify:", subField: true },
  { no: 7, label: "Other skills, if any", sub: "Please specify:", subField: true },
];

const SkillsTab = () => (
  <div className="content-card animate-fade-in-up space-y-6">
    <h3 className="text-center font-bold text-lg">(B) MAID's SKILLS</h3>

    <div className="section-header">B1. Method of Evaluation of Skills</div>
    <p className="text-sm pt-2">Please indicate the method(s) used to evaluate the FDW's skills (can tick more than one):</p>
    <div className="space-y-2 pl-2">
      {[
        "Based on FDW's declaration, no evaluation/observation by Singapore EA or overseas training centre/EA",
        "Interviewed by Singapore EA",
      ].map((opt) => (
        <label key={opt} className="flex items-start gap-2 text-sm">
          <input type="checkbox" className="accent-primary mt-0.5" />
          {opt}
        </label>
      ))}
      <div className="pl-6 space-y-2">
        {[
          "Interviewed via telephone/teleconference",
          "Interviewed via videoconference",
          "Interviewed in person",
          "Interviewed in person and also made observation of FDW in the areas of work listed in table",
        ].map((opt) => (
          <label key={opt} className="flex items-start gap-2 text-sm">
            <input type="checkbox" className="accent-primary mt-0.5" />
            {opt}
          </label>
        ))}
      </div>
    </div>

    <div className="overflow-x-auto">
      <table className="w-full text-sm border border-border">
        <thead>
          <tr className="bg-muted">
            <th className="border border-border px-2 py-2 text-center w-12">S/No</th>
            <th className="border border-border px-3 py-2 text-center">Areas of Work</th>
            <th className="border border-border px-2 py-2 text-center w-24">Willingness<br />Yes/No</th>
            <th className="border border-border px-2 py-2 text-center w-40">
              Experience<br />Yes/No<br />
              <span className="font-normal text-xs">If yes, state the no. of years</span>
            </th>
            <th className="border border-border px-2 py-2 text-center w-64">
              Assessment/Observation<br />
              <span className="font-normal text-xs">Please state qualitative observations of FDW and/or rate the FDW<br />(indicate N.A. if no evaluation was done)<br />1 2 3 4 5 N.A.</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {skillRows.map((row) => (
            <tr key={row.no}>
              <td className="border border-border px-2 py-3 text-center align-top">{row.no}</td>
              <td className="border border-border px-3 py-3 align-top">
                <span className="font-bold">{row.label}</span>
                {row.sub && (
                  <div className="mt-1">
                    <span className="text-xs">{row.sub}</span>
                    {row.subField && <Input className="mt-1 w-48 h-7 text-xs" />}
                  </div>
                )}
              </td>
              <td className="border border-border px-2 py-3 text-center align-top">
                <div className="flex items-center justify-center gap-2">
                  <label className="flex items-center gap-1 text-xs"><input type="radio" name={`will_${row.no}`} className="accent-primary" />Yes</label>
                  <label className="flex items-center gap-1 text-xs"><input type="radio" name={`will_${row.no}`} className="accent-primary" />No</label>
                </div>
              </td>
              <td className="border border-border px-2 py-3 text-center align-top">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <label className="flex items-center gap-1 text-xs"><input type="radio" name={`exp_${row.no}`} className="accent-primary" />Yes</label>
                  <label className="flex items-center gap-1 text-xs"><input type="radio" name={`exp_${row.no}`} className="accent-primary" />No</label>
                </div>
                <div className="flex items-center justify-center gap-1">
                  <Input className="w-16 h-7 text-xs" />
                  <span className="text-xs">(years)</span>
                </div>
              </td>
              <td className="border border-border px-2 py-3 align-top">
                <div className="flex items-center justify-center gap-1 mb-2 flex-wrap">
                  {["1", "2", "3", "4", "5", "N.A."].map((v) => (
                    <label key={v} className="flex items-center gap-0.5 text-xs">
                      <input type="radio" name={`assess_${row.no}`} className="accent-primary" />{v}
                    </label>
                  ))}
                </div>
                <textarea className="w-full min-h-[50px] rounded border bg-background px-2 py-1 text-xs" />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>

    <SaveButtons />
  </div>
);


const EmploymentHistoryTab = () => {
  const years = ["--", ...Array.from({ length: 30 }, (_, i) => String(2000 + i))];
  const countries = ["--", "Singapore", "Hong Kong", "Taiwan", "Malaysia", "Saudi Arabia", "UAE", "Kuwait", "Bahrain", "Qatar", "Oman", "Jordan", "Lebanon", "Brunei", "Others"];

  const [employers, setEmployers] = useState([0]);

  const addEmployer = () => {
    setEmployers([...employers, employers.length]);
  };

  const removeEmployer = (index: number) => {
    setEmployers(employers.filter((_, i) => i !== index));
  };

  return (
    <div className="content-card animate-fade-in-up space-y-6">
      <h3 className="text-center font-bold text-lg">(C) EMPLOYMENT HISTORY OF THE FDW</h3>

      <div className="section-header">C1. Employment History</div>

      <div className="space-y-6 pt-2">
        {employers.map((_, idx) => (
          <div key={idx} className="space-y-2 border p-4 rounded-md relative">

            {employers.length > 1 && (
              <button
                onClick={() => removeEmployer(idx)}
                className="absolute top-2 right-2 text-red-500 text-xs">
                Remove
              </button>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-[180px_1fr] gap-2">
              <Label className="form-label text-sm font-bold sm:text-right">
                Employer {idx + 1}:
              </Label>
              <div />
            </div>

            {[
              { label: "From Year", type: "select" as const, options: years },
              { label: "To Year", type: "select" as const, options: years },
              { label: "Country", type: "select" as const, options: countries },
              { label: "Employer's Name", type: "input" as const },
              { label: "Main Duties", type: "textarea" as const },
              { label: "Remarks", type: "textarea" as const },
            ].map((field) => (
              <div
                key={field.label}
                className="grid grid-cols-1 sm:grid-cols-[180px_1fr] gap-2 items-start"
              >
                <Label className="form-label text-xs sm:text-right pt-1">
                  {field.label}
                </Label>

                {field.type === "select" ? (
                  <SelectInput options={field.options!} className="w-48" />
                ) : field.type === "textarea" ? (
                  <textarea className="w-full max-w-md min-h-[60px] rounded-md border bg-background px-3 py-2 text-sm" />
                ) : (
                  <Input className="max-w-md" />
                )}
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* Add Employer Button */}
      <div className="flex justify-center">
        <button
          onClick={addEmployer}
          className="px-4 py-2 bg-primary text-white rounded-md text-sm hover:bg-primary/90"
        >
          + Add Employer
        </button>
      </div>

      {/* C2 Section */}
      <div className="section-header">C2. Employment History in Singapore</div>
      <div className="space-y-2 pt-2">
        <div className="flex items-center gap-4">
          <span className="text-sm font-medium">
            Previous working experience in Singapore
          </span>
          <YesNo name="sg_experience" />
        </div>
        <p className="text-xs text-muted-foreground">
          (The EA is required to obtain the FDW&apos;s employment history from MOM and furnish the employer with the employment history of the FDW. The employer may also verify the FDW&apos;s employment history in Singapore through WPOL using SingPass)
        </p>
      </div>

      {/* C3 Section */}
      <div className="section-header">
        C3. Feedback from previous employers in Singapore
      </div>
      <div className="space-y-3 pt-2">
        <p className="text-sm">
          If feedback was obtained by the EA from the previous employers,
          please indicate the feedback in the table below:
        </p>
        <FormRow label="Feedback from Singapore Employer 1:">
          <Input />
        </FormRow>
        <FormRow label="Feedback from Singapore Employer 2:">
          <Input />
        </FormRow>
      </div>

      <SaveButtons />
    </div>
  );
};


const AvailabilityRemarkTab = () => (
  <div className="content-card animate-fade-in-up space-y-6">
    <h3 className="text-center font-bold text-lg">(D) MAID&apos;s AVAILABILITY and REMARK</h3>

    <div className="space-y-3">
      {[
        "FDW is not available for interview",
        "FDW can be interviewed by phone",
        "FDW can be interviewed by video-conference",
        "FDW can be interviewed in person",
      ].map((opt) => (
        <label key={opt} className="flex items-center gap-2 text-sm">
          <input type="checkbox" className="accent-primary" />
          {opt}
        </label>
      ))}
    </div>

    <h3 className="font-bold text-lg">(E) OTHER REMARKS</h3>
    <div className="grid grid-cols-1 sm:grid-cols-[220px_1fr] gap-2 items-start">
      <Label className="form-label text-sm font-bold sm:text-right pt-2">OTHER REMARKS:</Label>
      <textarea className="w-full min-h-[100px] rounded-md border bg-background px-3 py-2 text-sm" />
    </div>

    <SaveButtons />
  </div>
);


const IntroductionTab = () => (
  <div className="content-card animate-fade-in-up space-y-4">
    <h3 className="text-center font-bold text-lg">MAID&apos;s INTRODUCTION</h3>
    <p className="text-center text-sm text-muted-foreground">
      This Introduction will be hidden from public. Employers need to login to view this introduction.
    </p>

    <div className="grid grid-cols-1 sm:grid-cols-[220px_1fr] gap-2 items-start">
      <Label className="form-label text-sm font-bold sm:text-right pt-2">MAID INTRODUCTION:</Label>
      <textarea className="w-full min-h-[250px] rounded-md border bg-background px-3 py-2 text-sm" />
    </div>

    <SaveButtons />
  </div>
);


const PublicIntroductionTab = () => (
  <div className="content-card animate-fade-in-up space-y-4">
    <h3 className="text-center font-bold text-lg">PUBLIC INTRODUCTION</h3>
    <p className="text-center text-sm text-muted-foreground">
      This is maid introduction for public, employers can view this without login.
    </p>

    <div className="text-sm space-y-2 border rounded-lg p-4 bg-muted/30">
      <p>
        EAs must comply with MOM&apos;s{" "}
        <a href="https://www.mom.gov.sg/employment-practices/employment-agencies/ealc" className="text-primary underline" target="_blank" rel="noopener noreferrer">
          EALC #17
        </a>{" "}
        and only disclose the following list of the FDW&apos;s personal information publicly: FDW Name, FDW Nationality, FDW skills and experience in said skills, Food handling preferences, Previous employment history (as stated in MOM&apos;s work permit application system), Language abilities.
      </p>
      <p>
        EAs must not cast FDWs in an insensitive and undignified light. This includes avoiding transactional terms that liken FDWs to commodities, e.g. &quot;condition new&quot;, &quot;chat to buy&quot;.
      </p>
    </div>

    <div className="grid grid-cols-1 sm:grid-cols-[220px_1fr] gap-2 items-start">
      <Label className="form-label text-sm font-bold sm:text-right pt-2">MAID INTRODUCTION:</Label>
      <textarea className="w-full min-h-[250px] rounded-md border bg-background px-3 py-2 text-sm" />
    </div>

    <SaveButtons />
  </div>
);


const PrivateInfoTab = () => (
  <div className="content-card animate-fade-in-up space-y-4">
    <h3 className="text-center font-bold text-lg">MAID&apos;s PRIVATE INFORMATION</h3>

    <div className="space-y-3">
      <FormRow label="This maid was interviewed by:"><Input /></FormRow>
      <FormRow label="Who Referred This Maid?"><Input /></FormRow>
      <FormRow label="Passport Number of the Maid"><Input placeholder="e.g. R8833831 Expiry: 28/01/2028" /></FormRow>
      <FormRow label="Telephone Number of Maid/Foreign Agency">
        <div className="flex items-center gap-2">
          <Input />
          <span className="text-sm text-muted-foreground whitespace-nowrap">WhatsApp</span>
        </div>
      </FormRow>

      <div className="grid grid-cols-1 sm:grid-cols-[220px_1fr] gap-2 items-start">
        <Label className="form-label text-sm sm:text-right pt-2">Agency&apos;s Historical Record of the Maid</Label>
        <textarea className="w-full min-h-[200px] rounded-md border bg-background px-3 py-2 text-sm" />
      </div>
    </div>

    <SaveButtons />
  </div>
);

export default AddMaid;