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

      {/* Tabs */}
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
      {activeTab === 3 && <PlaceholderTab title="Availability / Remark" />}
      {activeTab === 4 && <PlaceholderTab title="Introduction" />}
      {activeTab === 5 && <PlaceholderTab title="Public Introduction" />}
      {activeTab === 6 && <PlaceholderTab title="Private Info" />}
    </div>
  );
};

const ProfileTab = () => (
  <div className="content-card animate-fade-in-up space-y-6">
    <h3 className="text-center font-bold text-lg">(A) PROFILE OF FDW</h3>

    <div className="section-header">A1. Personal Information</div>
    <div className="space-y-3 pt-2">
      {[
        ["Maid Name", "Ref Code"],
        ["Type", "Nationality"],
        ["Date of Birth", "Place of Birth"],
        ["Height", "Weight"],
      ].map((row, i) => (
        <div key={i} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {row.map((label) => (
            <div key={label} className="flex flex-col gap-1">
              <Label className="text-xs font-medium text-muted-foreground">{label}</Label>
              {label === "Type" ? (
                <select className="w-full rounded-md border bg-background px-3 py-2 text-sm">
                  <option>New maid</option><option>Transfer maid</option><option>Ex-Singapore</option>
                </select>
              ) : label === "Nationality" ? (
                <select className="w-full rounded-md border bg-background px-3 py-2 text-sm">
                  <option>Filipino maid</option><option>Indonesian maid</option><option>Indian maid</option><option>Myanmar maid</option>
                </select>
              ) : (
                <Input />
              )}
            </div>
          ))}
        </div>
      ))}

      {["Residential Address in Home Country", "Name of Port/Airport to be Repatriated", "Contact Number in Home Country"].map((label) => (
        <div key={label} className="flex flex-col gap-1">
          <Label className="text-xs font-medium text-muted-foreground">{label}</Label>
          <Input />
        </div>
      ))}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="flex flex-col gap-1">
          <Label className="text-xs font-medium text-muted-foreground">Education</Label>
          <select className="w-full rounded-md border bg-background px-3 py-2 text-sm">
            <option>College/Degree (≥13 yrs)</option><option>High School (10-12 yrs)</option><option>Primary (≤6 yrs)</option>
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <Label className="text-xs font-medium text-muted-foreground">Religion</Label>
          <select className="w-full rounded-md border bg-background px-3 py-2 text-sm">
            <option>Catholic</option><option>Christian</option><option>Muslim</option><option>Hindu</option><option>Buddhist</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {["Number of Siblings", "Marital Status", "Number of Children", "Ages of Children", "Present Salary (S$)", "Expected Salary"].map((label) => (
          <div key={label} className="flex flex-col gap-1">
            <Label className="text-xs font-medium text-muted-foreground">{label}</Label>
            <Input />
          </div>
        ))}
      </div>
    </div>

    <div className="section-header">Language Skills</div>
    <div className="space-y-3 pt-2">
      {["English", "Mandarin/Chinese-Dialect", "Bahasa Indonesia/Malaysia", "Hindi", "Tamil"].map((lang) => (
        <div key={lang} className="flex flex-col sm:flex-row sm:items-center gap-2">
          <Label className="text-sm w-48">{lang}:</Label>
          <div className="flex gap-4">
            {["Poor", "Little", "Fair", "Good"].map((level) => (
              <label key={level} className="flex items-center gap-1 text-sm">
                <input type="radio" name={lang} className="accent-primary" />
                {level}
              </label>
            ))}
          </div>
        </div>
      ))}
    </div>

    <div className="section-header">Other Information</div>
    <div className="space-y-2 pt-2">
      {[
        "Able to handle pork?",
        "Able to eat pork?",
        "Able to care for dog/cat?",
        "Able to do simple sewing?",
        "Able to do gardening work?",
        "Willing to wash car?",
        "Willing to work on off-days with compensation?",
      ].map((q) => (
        <div key={q} className="flex items-center gap-4">
          <span className="text-sm flex-1">{q}</span>
          <div className="flex gap-3">
            <label className="flex items-center gap-1 text-sm"><input type="radio" name={q} className="accent-primary" /> Yes</label>
            <label className="flex items-center gap-1 text-sm"><input type="radio" name={q} className="accent-primary" /> No</label>
          </div>
        </div>
      ))}
    </div>

    <div className="section-header">A2. Medical History/Dietary Restrictions</div>
    <div className="space-y-3 pt-2">
      <div className="flex flex-col gap-1">
        <Label className="text-xs text-muted-foreground">Allergies (if any)</Label>
        <Input />
      </div>
      <p className="text-sm font-medium">Past and existing illnesses:</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {["Mental illness", "Epilepsy", "Asthma", "Diabetes", "Hypertension", "Tuberculosis", "Heart disease", "Malaria", "Operations", "Others"].map((illness) => (
          <div key={illness} className="flex items-center gap-3">
            <span className="text-sm flex-1">{illness}</span>
            <div className="flex gap-2">
              <label className="flex items-center gap-1 text-xs"><input type="radio" name={illness} className="accent-primary" /> Yes</label>
              <label className="flex items-center gap-1 text-xs"><input type="radio" name={illness} className="accent-primary" /> No</label>
            </div>
          </div>
        ))}
      </div>
    </div>

    <div className="section-header">A3. Others</div>
    <div className="pt-2">
      <Label className="text-xs text-muted-foreground">Any other remarks</Label>
      <Input />
    </div>

    <div className="flex justify-center pt-4">
      <Button className="px-8 bg-accent text-accent-foreground hover:bg-accent/90">Save and Continue</Button>
    </div>
  </div>
);

const SkillsTab = () => (
  <div className="content-card animate-fade-in-up space-y-4">
    <h3 className="font-bold text-center">Maid Skills</h3>
    <table className="w-full text-sm border">
      <thead>
        <tr className="bg-muted">
          <th className="border px-3 py-2 text-left">Areas of Work</th>
          <th className="border px-3 py-2">Willingness</th>
          <th className="border px-3 py-2">Experience</th>
          <th className="border px-3 py-2">Evaluation</th>
        </tr>
      </thead>
      <tbody>
        {["Care of infants/children", "Care of elderly", "Care of disabled", "General housework", "Cooking", "Language Skill", "Other Skill"].map((skill) => (
          <tr key={skill}>
            <td className="border px-3 py-2">{skill}</td>
            <td className="border px-3 py-2 text-center"><input type="checkbox" className="accent-primary" /></td>
            <td className="border px-3 py-2 text-center"><input type="checkbox" className="accent-primary" /></td>
            <td className="border px-3 py-2 text-center">
              <select className="border rounded px-2 py-1 text-xs bg-background">
                <option>-</option><option>★</option><option>★★</option><option>★★★</option><option>★★★★</option><option>★★★★★</option>
              </select>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
    <div className="flex justify-center pt-4">
      <Button className="px-8 bg-accent text-accent-foreground hover:bg-accent/90">Save and Continue</Button>
    </div>
  </div>
);

const EmploymentHistoryTab = () => (
  <div className="content-card animate-fade-in-up space-y-4">
    <h3 className="font-bold text-center">Employment History</h3>
    <table className="w-full text-sm border">
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
        {[1, 2, 3].map((row) => (
          <tr key={row}>
            {Array.from({ length: 6 }).map((_, i) => (
              <td key={i} className="border px-2 py-1"><Input className="h-8 text-xs" /></td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
    <div className="flex justify-center pt-4">
      <Button className="px-8 bg-accent text-accent-foreground hover:bg-accent/90">Save and Continue</Button>
    </div>
  </div>
);

const PlaceholderTab = ({ title }: { title: string }) => (
  <div className="content-card animate-fade-in-up">
    <h3 className="font-bold text-center mb-4">{title}</h3>
    <textarea className="w-full min-h-[200px] rounded-md border bg-background px-3 py-2 text-sm" placeholder={`Enter ${title.toLowerCase()} here...`} />
    <div className="flex justify-center pt-4">
      <Button className="px-8 bg-accent text-accent-foreground hover:bg-accent/90">Save and Continue</Button>
    </div>
  </div>
);

export default AddMaid;
