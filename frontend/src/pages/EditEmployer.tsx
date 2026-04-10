import { useEffect, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileText, Download } from "lucide-react";
import { toast } from "@/components/ui/sonner";

const FormRow = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="grid grid-cols-[180px_1fr] gap-3 items-center">
    <label className="form-label">{label}</label>
    <div>{children}</div>
  </div>
);

const generatedForms = [
  { category: "Maid Biodata Form", files: [{ name: "Maid_Biodata.pdf", isNew: true }] },
  { category: "Official Receipt", files: [{ name: "Official_Receipt.pdf", isNew: true }] },
  { category: "Standard Contract Between Employer and Employment Agency", files: [
    { name: "Service_Contract_Between_Employer_And_Agency_Format_1.pdf" },
    { name: "Service_Contract_Between_Employer_And_Agency_Format_2.pdf" },
  ]},
  { category: "Form A", files: [{ name: "FormA.pdf" }] },
  { category: "Form C", files: [{ name: "FormC.pdf" }] },
  { category: "Salary Schedule Form", files: [{ name: "Salary_Form.pdf" }] },
  { category: "Employee Income Tax Declaration", files: [{ name: "Employee_Income_Tax_Declaration.pdf" }] },
  { category: "Insurance Forms", files: [
    { name: "ticpanel_mh_insurance.pdf" },
    { name: "Zurich_Life_Insurance.pdf" },
    { name: "indian_network_maid_insurance_form.pdf" },
    { name: "Liberty_Insurance_Form.pdf" },
  ]},
  { category: "Standard Contract Between Maid and Employer", files: [
    { name: "Terms_Contract_Between_Maid_and_Employer.pdf" },
  ]},
  { category: "Rest Day Agreement Form Between Maid and Employer", files: [
    { name: "Rest_Day_Agreement_Form_between_Maid_and_Employer.pdf" },
  ]},
  { category: "Safety Agreement Form Between Maid And Employer", files: [
    { name: "Safety_Agreement_Form_between_Maid_and_Employer_Topology.pdf" },
    { name: "Safety_Agreement_Form_between_Maid_and_Employer_Indonesian.pdf" },
    { name: "Safety_Agreement_Form_between_Maid_and_Employer_Burmese.pdf" },
    { name: "Safety_Agreement_Form_between_Maid_and_Employer_Tamil.pdf" },
  ]},
  { category: "Handing and Taking Over Checklist", files: [{ name: "Handing_Taking_Over_Checklist.pdf" }] },
  { category: "Form S10", files: [{ name: "FormS10.pdf" }] },
];

const EditEmployer = () => {
  const { refCode } = useParams();
  const isNew = refCode === "new";
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [maid, setMaid] = useState({
    name: isNew ? "" : "Saraswathi Murugan",
    nationality: isNew ? "" : "Indian maid",
    workPermitNo: "",
    finNo: "",
    passportNo: "",
    salary: isNew ? "" : "8",
    numberOfTerms: isNew ? "" : "2",
    communicationToBuy: "",
    nameOfReplacement: isNew ? "" : "Alpha Ranger",
    passportOfMaid: "",
  });

  const [agency, setAgency] = useState({
    contractDate: isNew ? "" : "25.11.2016",
    serviceFee: isNew ? "" : "1399",
    deposit: "",
    handlingInHospitalFee: "",
    medicalFee: "",
    extensionFee: "",
    discountedFee: "",
    placementFee: isNew ? "" : "1399",
    balanceFee: "",
    agencyWitness: isNew ? "" : "Rahimunisha Binti Muhammadhan (R1107570)",
  });

  const [employer, setEmployer] = useState({
    name: isNew ? "" : "Suresh Satyanarayana Balasubramanian",
    gender: isNew ? "" : "Male",
    dateOfBirthDay: isNew ? "" : "14",
    dateOfBirthMonth: isNew ? "" : "04",
    dateOfBirthYear: isNew ? "" : "1966",
    nationality: isNew ? "" : "Indian",
    residentialStatus: isNew ? "" : "Singapore Permanent Resident",
    nric: isNew ? "" : "S1704119L",
    addressLine1: isNew ? "" : "5 Kang Kok Road #10-45",
    addressLine2: "",
    postalCode: isNew ? "" : "448302",
    typeOfResidence: isNew ? "" : "HDB 5-ROOM",
    occupation: isNew ? "" : "Manager",
    company: isNew ? "" : "DHL Corp",
    email: "",
    residentialPhone: isNew ? "" : "64643212",
    mobileNumber: isNew ? "" : "89741990",
    monthlyContribution: isNew ? "" : "5,700",
    dateOfEmployment: "",
  });

  const [spouse, setSpouse] = useState({
    name: isNew ? "" : "Anupama Shivaprasad",
    gender: isNew ? "" : "Female",
    dateOfBirthDay: isNew ? "" : "15",
    dateOfBirthMonth: isNew ? "" : "04",
    dateOfBirthYear: isNew ? "" : "1975",
    nationality: isNew ? "" : "Indian",
    residentialStatus: isNew ? "" : "Singapore Permanent Resident",
    nric: isNew ? "" : "S1704119G",
    occupation: isNew ? "" : "Housewife",
    company: "",
  });

  const [familyMembers, setFamilyMembers] = useState(
    isNew
      ? [{ name: "", type: "", relationship: "", dateOfBirth: "" }]
      : [
          { name: "Ishan", type: "Son", relationship: "Father", dateOfBirth: "01/11/96" },
          { name: "Ishit", type: "Daughter", relationship: "Father", dateOfBirth: "01/11/96" },
          { name: "", type: "", relationship: "", dateOfBirth: "04/06/1928" },
        ]
  );

  useEffect(() => {
    if (!refCode || isNew) return;
    const load = async () => {
      try {
        const response = await fetch(`/api/employers/${encodeURIComponent(refCode)}`);
        const data = (await response.json().catch(() => ({}))) as {
          employer?: {
            maid?: Record<string, unknown>;
            agency?: Record<string, unknown>;
            employer?: Record<string, unknown>;
            spouse?: Record<string, unknown>;
            familyMembers?: Array<Record<string, unknown>>;
          };
        };
        if (!response.ok || !data.employer) return;
        if (data.employer.maid) setMaid((data.employer.maid as typeof maid) ?? maid);
        if (data.employer.agency) setAgency((data.employer.agency as typeof agency) ?? agency);
        if (data.employer.employer) setEmployer((data.employer.employer as typeof employer) ?? employer);
        if (data.employer.spouse) setSpouse((data.employer.spouse as typeof spouse) ?? spouse);
        if (data.employer.familyMembers) setFamilyMembers((data.employer.familyMembers as typeof familyMembers) ?? familyMembers);
      } catch {
        // no-op
      }
    };
    void load();
  }, [isNew, refCode]);

  const submitEmployerContract = async () => {
    if (isSubmitting) return;
    if (!employer.name.trim()) {
      toast.error("Employer name is required");
      return;
    }
    try {
      setIsSubmitting(true);
      const response = await fetch("/api/employers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          refCode: isNew ? null : refCode,
          maid,
          agency,
          employer,
          spouse,
          familyMembers,
        }),
      });
      const data = (await response.json().catch(() => ({}))) as { error?: string; employer?: { refCode?: string } };
      if (!response.ok || !data.employer?.refCode) throw new Error(data.error || "Failed to submit employer contract");
      toast.success("Employer contract saved");
      if (isNew) navigate(`/employer/${encodeURIComponent(data.employer.refCode)}`, { replace: true });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to submit employer contract");
    } finally {
      setIsSubmitting(false);
    }
  };

  const [notificationDate, setNotificationDate] = useState({ month: isNew ? "" : "JANUARY", year: isNew ? "" : "2017" });

  return (
    <div className="page-container max-w-4xl">
      <div className="flex items-center justify-between mb-4">
        <div>
          <Link to="/agencyadmin/employment-contracts" className="text-sm text-primary hover:underline">← Back to Employment Listing</Link>
          <h2 className="text-xl font-bold mt-1">{isNew ? "Add a New Employer" : "Edit an Existing Employer"}</h2>
        </div>
        {!isNew && <span className="text-sm">Reference Number: <span className="font-bold text-primary">{refCode}</span></span>}
      </div>

      <div className="content-card animate-fade-in-up space-y-8">
        <section>
          <div className="section-header mb-4">The Maid Employed</div>
          <div className="space-y-3">
            <FormRow label="Maid's Name"><Input value={maid.name} onChange={e => setMaid({...maid, name: e.target.value})} /></FormRow>
            <FormRow label="Maid's Nationality">
              <Select value={maid.nationality || undefined} onValueChange={v => setMaid({...maid, nationality: v})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Indian maid">Indian maid</SelectItem>
                  <SelectItem value="Filipino maid">Filipino maid</SelectItem>
                  <SelectItem value="Indonesian maid">Indonesian maid</SelectItem>
                  <SelectItem value="Myanmar maid">Myanmar maid</SelectItem>
                </SelectContent>
              </Select>
            </FormRow>
            <FormRow label="Maid's Work Permit No."><Input value={maid.workPermitNo} onChange={e => setMaid({...maid, workPermitNo: e.target.value})} /></FormRow>
            <FormRow label="Maid's FIN No."><Input value={maid.finNo} onChange={e => setMaid({...maid, finNo: e.target.value})} /></FormRow>
            <FormRow label="Maid's Passport No."><Input value={maid.passportNo} onChange={e => setMaid({...maid, passportNo: e.target.value})} /></FormRow>
            <FormRow label="Salary"><Input value={maid.salary} onChange={e => setMaid({...maid, salary: e.target.value})} /></FormRow>
            <FormRow label="Number of Terms"><Input value={maid.numberOfTerms} onChange={e => setMaid({...maid, numberOfTerms: e.target.value})} /></FormRow>
            <FormRow label="Communication To Buy"><Input value={maid.communicationToBuy} onChange={e => setMaid({...maid, communicationToBuy: e.target.value})} /></FormRow>
            <FormRow label="Name of Maid Replaced"><Input value={maid.nameOfReplacement} onChange={e => setMaid({...maid, nameOfReplacement: e.target.value})} /></FormRow>
            <FormRow label="Passport of Maid Replaced"><Input value={maid.passportOfMaid} onChange={e => setMaid({...maid, passportOfMaid: e.target.value})} /></FormRow>
          </div>
        </section>

        <section>
          <div className="section-header mb-4">Agency</div>
          <div className="space-y-3">
            <FormRow label="Contract Date"><Input value={agency.contractDate} onChange={e => setAgency({...agency, contractDate: e.target.value})} /></FormRow>
            <FormRow label="Date Of Employment">
              <div className="flex gap-2 items-center">
                <Select><SelectTrigger className="w-20"><SelectValue placeholder="04" /></SelectTrigger><SelectContent>{Array.from({length:31},(_,i)=><SelectItem key={i} value={String(i+1).padStart(2,'0')}>{String(i+1).padStart(2,'0')}</SelectItem>)}</SelectContent></Select>
                <Select><SelectTrigger className="w-20"><SelectValue placeholder="02" /></SelectTrigger><SelectContent>{Array.from({length:12},(_,i)=><SelectItem key={i} value={String(i+1).padStart(2,'0')}>{String(i+1).padStart(2,'0')}</SelectItem>)}</SelectContent></Select>
                <Select><SelectTrigger className="w-24"><SelectValue placeholder="2012" /></SelectTrigger><SelectContent>{Array.from({length:20},(_,i)=><SelectItem key={i} value={String(2010+i)}>{2010+i}</SelectItem>)}</SelectContent></Select>
                <span className="text-xs text-muted-foreground">(day-month-year)</span>
              </div>
            </FormRow>
            <div className="section-header text-xs">Invoice Manifest</div>
            <FormRow label="Service Fee"><Input value={agency.serviceFee} onChange={e => setAgency({...agency, serviceFee: e.target.value})} /></FormRow>
            <FormRow label="Deposit"><Input value={agency.deposit} onChange={e => setAgency({...agency, deposit: e.target.value})} /></FormRow>
            <FormRow label="Handling in Hospital (S&T) Fee"><Input value={agency.handlingInHospitalFee} onChange={e => setAgency({...agency, handlingInHospitalFee: e.target.value})} /></FormRow>
            <FormRow label="Medical Fee"><Input value={agency.medicalFee} onChange={e => setAgency({...agency, medicalFee: e.target.value})} /></FormRow>
            <FormRow label="Extension Fee"><Input value={agency.extensionFee} onChange={e => setAgency({...agency, extensionFee: e.target.value})} /></FormRow>
            <FormRow label="Discounted Fee"><Input value={agency.discountedFee} onChange={e => setAgency({...agency, discountedFee: e.target.value})} /></FormRow>
            <FormRow label="Placement Fee (Maid's part)"><Input value={agency.placementFee} onChange={e => setAgency({...agency, placementFee: e.target.value})} /></FormRow>
            <FormRow label="Balance Fee"><Input value={agency.balanceFee} onChange={e => setAgency({...agency, balanceFee: e.target.value})} /></FormRow>
            <FormRow label="Agency Witness">
              <Select value={agency.agencyWitness || undefined} onValueChange={v => setAgency({...agency, agencyWitness: v})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Rahimunisha Binti Muhammadhan (R1107570)">Rahimunisha Binti Muhammadhan (R1107570)</SelectItem>
                </SelectContent>
              </Select>
            </FormRow>
          </div>
        </section>

        <section>
          <div className="section-header mb-4">Employer</div>
          <div className="space-y-3">
            <FormRow label="Name"><Input value={employer.name} onChange={e => setEmployer({...employer, name: e.target.value})} /></FormRow>
            <FormRow label="Gender">
              <div className="flex gap-4">
                <label className="flex items-center gap-1 text-sm"><input type="radio" name="emp-gender" checked={employer.gender === "Male"} onChange={() => setEmployer({...employer, gender: "Male"})} className="accent-primary" /> Male</label>
                <label className="flex items-center gap-1 text-sm"><input type="radio" name="emp-gender" checked={employer.gender === "Female"} onChange={() => setEmployer({...employer, gender: "Female"})} className="accent-primary" /> Female</label>
              </div>
            </FormRow>
            <FormRow label="Date Of Birth">
              <div className="flex gap-2 items-center">
                <Select value={employer.dateOfBirthDay || undefined} onValueChange={v => setEmployer({...employer, dateOfBirthDay: v})}><SelectTrigger className="w-20"><SelectValue /></SelectTrigger><SelectContent>{Array.from({length:31},(_,i)=><SelectItem key={i} value={String(i+1).padStart(2,'0')}>{String(i+1).padStart(2,'0')}</SelectItem>)}</SelectContent></Select>
                <Select value={employer.dateOfBirthMonth || undefined} onValueChange={v => setEmployer({...employer, dateOfBirthMonth: v})}><SelectTrigger className="w-20"><SelectValue /></SelectTrigger><SelectContent>{Array.from({length:12},(_,i)=><SelectItem key={i} value={String(i+1).padStart(2,'0')}>{String(i+1).padStart(2,'0')}</SelectItem>)}</SelectContent></Select>
                <Select value={employer.dateOfBirthYear || undefined} onValueChange={v => setEmployer({...employer, dateOfBirthYear: v})}><SelectTrigger className="w-24"><SelectValue /></SelectTrigger><SelectContent>{Array.from({length:60},(_,i)=><SelectItem key={i} value={String(1950+i)}>{1950+i}</SelectItem>)}</SelectContent></Select>
                <span className="text-xs text-muted-foreground">(day-month-year)</span>
              </div>
            </FormRow>
            <FormRow label="Nationality"><Input value={employer.nationality} onChange={e => setEmployer({...employer, nationality: e.target.value})} /></FormRow>
            <FormRow label="Residential Status">
              <Select value={employer.residentialStatus || undefined} onValueChange={v => setEmployer({...employer, residentialStatus: v})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Singapore Permanent Resident">Singapore Permanent Resident</SelectItem>
                  <SelectItem value="Singapore Citizen">Singapore Citizen</SelectItem>
                  <SelectItem value="Employment Pass">Employment Pass</SelectItem>
                </SelectContent>
              </Select>
            </FormRow>
            <FormRow label="NRIC / FIN / PP"><Input value={employer.nric} onChange={e => setEmployer({...employer, nric: e.target.value})} /></FormRow>
            <FormRow label="Address (Line 1)"><Input value={employer.addressLine1} onChange={e => setEmployer({...employer, addressLine1: e.target.value})} /></FormRow>
            <FormRow label="Address (Line 2)"><Input value={employer.addressLine2} onChange={e => setEmployer({...employer, addressLine2: e.target.value})} /></FormRow>
            <FormRow label="Postal Code"><Input value={employer.postalCode} onChange={e => setEmployer({...employer, postalCode: e.target.value})} /></FormRow>
            <FormRow label="Type Of Residence">
              <div className="flex flex-wrap gap-3">
                {["HDB 2-ROOM","HDB 3-ROOM","HDB 5-ROOM","HDB 4-ROOM","HDB Executive","Condo","Terrace","Semi-D","Bungalow"].map(t => (
                  <label key={t} className="flex items-center gap-1 text-xs"><input type="radio" name="residence" checked={employer.typeOfResidence === t} onChange={() => setEmployer({...employer, typeOfResidence: t})} className="accent-primary" /> {t}</label>
                ))}
              </div>
            </FormRow>
            <FormRow label="Occupation"><Input value={employer.occupation} onChange={e => setEmployer({...employer, occupation: e.target.value})} /></FormRow>
            <FormRow label="Name Of Company"><Input value={employer.company} onChange={e => setEmployer({...employer, company: e.target.value})} /></FormRow>
            <FormRow label="E-mail address"><Input value={employer.email} onChange={e => setEmployer({...employer, email: e.target.value})} /></FormRow>
            <FormRow label="Residential Phone"><Input value={employer.residentialPhone} onChange={e => setEmployer({...employer, residentialPhone: e.target.value})} /></FormRow>
            <FormRow label="Handphone Number"><Input value={employer.mobileNumber} onChange={e => setEmployer({...employer, mobileNumber: e.target.value})} /></FormRow>
            <FormRow label="Monthly Contribution"><Input value={employer.monthlyContribution} onChange={e => setEmployer({...employer, monthlyContribution: e.target.value})} /></FormRow>
          </div>
        </section>

        <section>
          <div className="space-y-3">
            <FormRow label="Notification of Assessment">
              <div className="flex gap-2 items-center">
                <Select value={notificationDate.month || undefined} onValueChange={v => setNotificationDate({...notificationDate, month: v})}>
                  <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["JANUARY","FEBRUARY","MARCH","APRIL","MAY","JUNE","JULY","AUGUST","SEPTEMBER","OCTOBER","NOVEMBER","DECEMBER"].map(m => (
                      <SelectItem key={m} value={m}>{m}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <span className="text-xs text-muted-foreground">Year:</span>
                <Input className="w-20" value={notificationDate.year} onChange={e => setNotificationDate({...notificationDate, year: e.target.value})} />
              </div>
            </FormRow>
            <FormRow label="(based on Annual Income or Bank Statement)">
              <span className="text-xs text-muted-foreground">—</span>
            </FormRow>
          </div>
        </section>

        <section>
          <div className="space-y-3">
            <FormRow label="Existing Employer"><Input defaultValue="" /></FormRow>
            <FormRow label="Existing Employer's NRIC"><Input defaultValue="" /></FormRow>
          </div>
        </section>

        <section>
          <div className="section-header mb-4">Spouse</div>
          <div className="space-y-3">
            <FormRow label="Spouse's Name"><Input value={spouse.name} onChange={e => setSpouse({...spouse, name: e.target.value})} /></FormRow>
            <FormRow label="Gender">
              <div className="flex gap-4">
                <label className="flex items-center gap-1 text-sm"><input type="radio" name="sp-gender" checked={spouse.gender === "Male"} onChange={() => setSpouse({...spouse, gender: "Male"})} className="accent-primary" /> Male</label>
                <label className="flex items-center gap-1 text-sm"><input type="radio" name="sp-gender" checked={spouse.gender === "Female"} onChange={() => setSpouse({...spouse, gender: "Female"})} className="accent-primary" /> Female</label>
              </div>
            </FormRow>
            <FormRow label="Date of Birth">
              <div className="flex gap-2 items-center">
                <Select value={spouse.dateOfBirthDay || undefined} onValueChange={v => setSpouse({...spouse, dateOfBirthDay: v})}><SelectTrigger className="w-20"><SelectValue /></SelectTrigger><SelectContent>{Array.from({length:31},(_,i)=><SelectItem key={i} value={String(i+1).padStart(2,'0')}>{String(i+1).padStart(2,'0')}</SelectItem>)}</SelectContent></Select>
                <Select value={spouse.dateOfBirthMonth || undefined} onValueChange={v => setSpouse({...spouse, dateOfBirthMonth: v})}><SelectTrigger className="w-20"><SelectValue /></SelectTrigger><SelectContent>{Array.from({length:12},(_,i)=><SelectItem key={i} value={String(i+1).padStart(2,'0')}>{String(i+1).padStart(2,'0')}</SelectItem>)}</SelectContent></Select>
                <Select value={spouse.dateOfBirthYear || undefined} onValueChange={v => setSpouse({...spouse, dateOfBirthYear: v})}><SelectTrigger className="w-24"><SelectValue /></SelectTrigger><SelectContent>{Array.from({length:60},(_,i)=><SelectItem key={i} value={String(1950+i)}>{1950+i}</SelectItem>)}</SelectContent></Select>
                <span className="text-xs text-muted-foreground">(day-month-year)</span>
              </div>
            </FormRow>
            <FormRow label="Nationality"><Input value={spouse.nationality} onChange={e => setSpouse({...spouse, nationality: e.target.value})} /></FormRow>
            <FormRow label="Residential Status">
              <Select value={spouse.residentialStatus || undefined} onValueChange={v => setSpouse({...spouse, residentialStatus: v})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Singapore Permanent Resident">Singapore Permanent Resident</SelectItem>
                  <SelectItem value="Singapore Citizen">Singapore Citizen</SelectItem>
                  <SelectItem value="Employment Pass">Employment Pass</SelectItem>
                </SelectContent>
              </Select>
            </FormRow>
            <FormRow label="Spouse's NRIC / FIN / PP"><Input value={spouse.nric} onChange={e => setSpouse({...spouse, nric: e.target.value})} /></FormRow>
            <FormRow label="Occupation"><Input value={spouse.occupation} onChange={e => setSpouse({...spouse, occupation: e.target.value})} /></FormRow>
            <FormRow label="Name Of Company"><Input value={spouse.company} onChange={e => setSpouse({...spouse, company: e.target.value})} /></FormRow>
          </div>
        </section>

        {familyMembers.map((fm, idx) => (
          <section key={idx}>
            <div className="section-header mb-4">{idx === 0 ? "1st" : idx === 1 ? "2nd" : `${idx + 1}rd`} Family Member</div>
            <div className="space-y-3">
              <FormRow label="Name"><Input value={fm.name} onChange={e => { const updated = [...familyMembers]; updated[idx] = {...fm, name: e.target.value}; setFamilyMembers(updated); }} /></FormRow>
              <FormRow label="">
                <div className="flex gap-4">
                  <label className="flex items-center gap-1 text-sm"><input type="radio" name={`fm-type-${idx}`} checked={fm.type === "Daughter"} onChange={() => { const u = [...familyMembers]; u[idx] = {...fm, type: "Daughter"}; setFamilyMembers(u); }} className="accent-primary" /> Daughter</label>
                  <label className="flex items-center gap-1 text-sm"><input type="radio" name={`fm-type-${idx}`} checked={fm.type === "Son"} onChange={() => { const u = [...familyMembers]; u[idx] = {...fm, type: "Son"}; setFamilyMembers(u); }} className="accent-primary" /> Son</label>
                </div>
              </FormRow>
              <FormRow label="Relationship">
                <div className="flex gap-4">
                  {["Father","Mother","Father-in-law","Mother-in-law"].map(r => (
                    <label key={r} className="flex items-center gap-1 text-xs"><input type="radio" name={`fm-rel-${idx}`} checked={fm.relationship === r} onChange={() => { const u = [...familyMembers]; u[idx] = {...fm, relationship: r}; setFamilyMembers(u); }} className="accent-primary" /> {r}</label>
                  ))}
                </div>
              </FormRow>
              <FormRow label="Date of Birth"><Input value={fm.dateOfBirth} onChange={e => { const u = [...familyMembers]; u[idx] = {...fm, dateOfBirth: e.target.value}; setFamilyMembers(u); }} /></FormRow>
            </div>
          </section>
        ))}

        <div className="flex justify-center gap-4 pt-4 border-t">
          <Button onClick={() => void submitEmployerContract()} disabled={isSubmitting}>Submit & Generate Forms</Button>
          <Button variant="outline"><Download className="w-4 h-4 mr-2" /> Download Forms and Print</Button>
        </div>

        <p className="text-xs text-muted-foreground text-center">
          The auto forms are for demo purposes only, please append with for construction works.
        </p>

        <section className="space-y-3">
          {generatedForms.map((cat) => (
            <div key={cat.category}>
              <div className="section-header text-xs mb-2">{cat.category}</div>
              <div className="space-y-1 pl-4">
                {cat.files.map(f => (
                  <div key={f.name} className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-muted-foreground" />
                    <a href="#" className="text-sm text-primary hover:underline">{f.name}</a>
                    {f.isNew && <span className="text-[10px] bg-destructive text-destructive-foreground px-1.5 py-0.5 rounded">NEW</span>}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </section>
      </div>
    </div>
  );
};

export default EditEmployer;
