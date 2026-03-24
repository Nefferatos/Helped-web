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

      <div className="flex flex-wrap gap-2 mb-6 border-b pb-2">
        {tabs.map((tab, i) => (
          <button
            key={tab}
            onClick={() => setActiveTab(i)}
            className={`px-4 py-2 text-xs font-semibold rounded-full transition-all ${
              activeTab === i
                ? "bg-primary text-white shadow"
                : "bg-muted text-muted-foreground hover:bg-muted/70"
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
                  <option>New maid</option>
                  <option>Transfer maid</option>
                  <option>APS maid</option>
                  <option>Ex-Singapore maid</option>
                  <option>Ex-Hong Kong maid</option>
                  <option>Ex-Taiwan maid</option>
                  <option>Ex-Malaysia maid</option>
                  <option>Ex-Middle East maid</option>
                  <option>Applying to work in Hong Kong</option>
                  <option>Applying to work in Canada</option>
                  <option>Applying to work in Taiwan</option>
                </select>
              ) : label === "Date of Birth" ? (
                <div className="flex gap-2">
                  <select className="border rounded px-2 py-2 text-sm">{Array.from({length:31},(_,i)=>(<option key={i+1}>{String(i+1).padStart(2,'0')}</option>))}</select>
                  <select className="border rounded px-2 py-2 text-sm">{Array.from({length:12},(_,i)=>(<option key={i+1}>{String(i+1).padStart(2,'0')}</option>))}</select>
                  <select className="border rounded px-2 py-2 text-sm">{Array.from({length:60},(_,i)=>(<option key={1965+i}>{1965+i}</option>))}</select>
                </div>
              ) : label === "Height" ? (
                <select className="w-full rounded-md border bg-background px-3 py-2 text-sm">
                  {Array.from({length:41},(_,i)=>150+i).map(cm=>(
                  <option key={cm}>{cm}cm</option>
                ))}
                </select>
              ) : label === "Weight" ? (
                <select className="w-full rounded-md border bg-background px-3 py-2 text-sm">
                  {Array.from({length:51},(_,i)=>40+i).map(kg=>(
                  <option key={kg}>{kg}kg</option>
                ))}
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
        {[
          "Number of Siblings",
          "Marital Status",
          "Number of Children",
          "Ages of Children",
          "Present Salary (S$)",
          "Expected Salary",
          "When will this maid be Available?",
          "Contract Ends",
          "Maid Loan (S$)",
          "Offday Compensation (S$/day)",
          "Number of off-days per month",
        ].map((label) => (
          <div key={label} className="flex flex-col gap-1">
            <Label className="text-xs font-medium text-muted-foreground">{label}</Label>
            {label === "Marital Status" ? (
              <select className="w-full rounded-md border bg-background px-3 py-2 text-sm">
                <option>Single</option>
                <option>Married</option>
                <option>Divorced</option>
                <option>Widowed</option>
              </select>
            ) : label === "Number of Children" ? (
              <select className="w-full rounded-md border bg-background px-3 py-2 text-sm">
                {Array.from({length:11},(_,i)=>i).map(n => <option key={n}>{n}</option>)}
              </select>
            ) : label === "Contract Ends" ? (
              <div className="flex gap-2">
                  <select className="border rounded px-2 py-2 text-sm">{Array.from({length:31},(_,i)=>(<option key={i+1}>{String(i+1).padStart(2,'0')}</option>))}</select>
                  <select className="border rounded px-2 py-2 text-sm">{Array.from({length:12},(_,i)=>(<option key={i+1}>{String(i+1).padStart(2,'0')}</option>))}</select>
                  <select className="border rounded px-2 py-2 text-sm">{Array.from({length:60},(_,i)=>(<option key={2025+i}>{2025+i}</option>))}</select>
                </div>
            ) : (
              <Input />
            )}
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
            {["Zero", "Poor", "Little", "Fair", "Good"].map((level) => (
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
            <label className="flex items-center gap-1 text-sm"><input type="radio" name={q} /> Yes</label>
            <label className="flex items-center gap-1 text-sm"><input type="radio" name={q} /> No</label>
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

      <Input placeholder="Physical disabilities" />
      <Input placeholder="Dietary restrictions" />
      <Input placeholder="Food handling preferences (No Pork / No Beef / Others)" />

      <p className="text-sm font-medium">Past and existing illnesses:</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {["Mental illness", "Epilepsy", "Asthma", "Diabetes", "Hypertension", "Tuberculosis", "Heart disease", "Malaria", "Operations"].map((illness) => (
          <div key={illness} className="flex items-center gap-3">
            <span className="text-sm flex-1">{illness}</span>
            <div className="flex gap-2">
              <label className="flex items-center gap-1 text-xs"><input type="radio" name={illness} /> Yes</label>
              <label className="flex items-center gap-1 text-xs"><input type="radio" name={illness} /> No</label>
            </div>
          </div>
        ))}

        <div className="flex flex-col gap-1 col-span-1 sm:col-span-2">
          <Label className="text-xs text-muted-foreground">Others (please specify)</Label>
          <Input />
        </div>
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
            <td className="border px-3 py-2 text-center"><input type="checkbox" /></td>
            <td className="border px-3 py-2 text-center"><input type="checkbox" /></td>
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

const EmploymentHistoryTab = () => {
  const [rows, setRows] = useState([{ id: 1 }]); // initial row

  const addRow = () => {
    const newId = rows.length ? Math.max(...rows.map(r => r.id)) + 1 : 1;
    setRows([...rows, { id: newId }]);
  };

  const removeLastRow = () => {
    if (rows.length > 0) {
      setRows(rows.slice(0, -1));
    }
  };

  return (
    <div className="content-card animate-fade-in-up space-y-4">
      <h3 className="font-bold text-center">Employment History</h3>

      <table className="w-full text-sm border border-collapse">
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
          {rows.map((row) => (
            <tr key={row.id}>
              {Array.from({ length: 6 }).map((_, i) => (
                <td key={i} className="border px-2 py-1">
                  <Input className="h-8 text-xs" />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>

      <div className="flex justify-center gap-4 pt-4">
        <Button
          className="px-4 bg-green-600 text-white hover:bg-green-700"
          onClick={addRow}
        >
          Add Row
        </Button>
        <Button
          className="px-4 bg-red-500 text-white hover:bg-red-600"
          onClick={removeLastRow}
        >
          Remove Last Row
        </Button>
        <Button className="px-8 bg-accent text-accent-foreground hover:bg-accent/90">
          Save and Continue
        </Button>
      </div>
    </div>
  );
};

const PlaceholderTab = ({ title }) => (
  <div className="content-card animate-fade-in-up">
    <h3 className="font-bold text-center mb-4">{title}</h3>
    <textarea className="w-full min-h-[200px] rounded-md border bg-background px-3 py-2 text-sm" placeholder={`Enter ${title.toLowerCase()} here...`} />
    <div className="flex justify-center pt-4">
      <Button className="px-8 bg-accent text-accent-foreground hover:bg-accent/90">Save and Continue</Button>
    </div>
  </div>
);

export default AddMaid;
