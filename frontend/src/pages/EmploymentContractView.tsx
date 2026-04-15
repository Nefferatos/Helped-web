import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/sonner";
import { Eye, Pencil, Download, User } from "lucide-react";
import { adminPath } from "@/lib/routes";

/* ─────────────────── types ─────────────────── */

type UploadedFile = { name: string; url: string; category: string };

type EmployerContractRecord = {
  maid?: Record<string, unknown>;
  agency?: Record<string, unknown>;
  employer?: Record<string, unknown>;
  spouse?: Record<string, unknown>;
  familyMembers?: Array<Record<string, unknown>>;
  documents?: Array<{ category?: string; fileUrl?: string; fileName?: string }>;
};

/* ─────────────────── helpers ─────────────────── */

const toText = (v: unknown) => String(v ?? "").trim();

const getPrimaryPhoto = (maid: Record<string, unknown>) => {
  const arr = Array.isArray(maid.photoDataUrls)
    ? maid.photoDataUrls.filter((v): v is string => typeof v === "string" && v.trim().length > 0)
    : [];
  return arr[0] || toText(maid.photoDataUrl);
};

/* ─────────────────── primitives ─────────────────── */

/** Blue section header bar — matches the image exactly */
const SectionHeader = ({ title }: { title: string }) => (
  <div className="mt-4 mb-0 rounded-t-sm bg-[#4a7bb5] px-3 py-1.5">
    <h3 className="text-sm font-semibold text-white">{title}</h3>
  </div>
);

/** Bordered panel that sits below a SectionHeader */
const SectionBody = ({ children }: { children: React.ReactNode }) => (
  <div className="rounded-b-sm border border-[#c5d3e8] bg-white px-4 py-3">
    {children}
  </div>
);

/** Two-column label + value row */
const FieldRow = ({
  label,
  value,
}: {
  label: string;
  value: string;
}) => (
  <div className="grid grid-cols-[190px_1fr] items-start gap-x-2 py-0.5">
    <dt className="text-right text-xs text-gray-600">{label}</dt>
    <dd className="min-h-[22px] rounded border border-gray-300 bg-gray-50 px-2 py-0.5 text-xs text-gray-900">
      {value || <span className="text-gray-300">—</span>}
    </dd>
  </div>
);

/* ─────────────────── document row ─────────────────── */

const DocRow = ({ file }: { file: UploadedFile }) => (
  <div className="flex items-center gap-2 py-1">
    {/* green PDF icon */}
    <div className="flex h-7 w-6 flex-shrink-0 flex-col items-center justify-center rounded-sm bg-green-600 text-[8px] font-bold leading-none text-white shadow-sm">
      PDF
    </div>
    <span className="flex-1 text-xs text-blue-700 hover:underline cursor-pointer">{file.name}</span>
    <div className="flex gap-1">
      <a
        href={file.url}
        target="_blank"
        rel="noreferrer"
        className="inline-flex items-center gap-1 rounded border border-gray-300 bg-white px-2 py-0.5 text-xs text-blue-700 hover:bg-blue-50"
      >
        <Eye className="h-3 w-3" />
        View
      </a>
      <a
        href={file.url}
        download={file.name}
        className="inline-flex items-center gap-1 rounded border border-gray-300 bg-white px-2 py-0.5 text-xs text-gray-600 hover:bg-gray-50"
      >
        <Download className="h-3 w-3" />
      </a>
    </div>
  </div>
);

/* ═══════════════════════════════════════════════════════ */
/*                  EmploymentContractView                */
/* ═══════════════════════════════════════════════════════ */

const EmploymentContractView = () => {
  const { refCode } = useParams();
  const navigate = useNavigate();
  const [record, setRecord] = useState<EmployerContractRecord | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (!refCode) { setLoadError("Missing employment contract reference"); setIsLoading(false); return; }
    const load = async () => {
      try {
        setIsLoading(true);
        const res = await fetch(`/api/employers/${encodeURIComponent(refCode)}`);
        const data = (await res.json().catch(() => ({}))) as { employer?: EmployerContractRecord; error?: string };
        if (!res.ok || !data.employer) throw new Error(data.error || "Failed to load employment contract");
        setRecord(data.employer);
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Failed to load employment contract";
        setLoadError(msg); toast.error(msg);
      } finally { setIsLoading(false); }
    };
    void load();
  }, [refCode]);

  const maid          = useMemo(() => record?.maid ?? {}, [record]);
  const agency        = useMemo(() => record?.agency ?? {}, [record]);
  const employer      = useMemo(() => record?.employer ?? {}, [record]);
  const spouse        = useMemo(() => record?.spouse ?? {}, [record]);
  const familyMembers = useMemo(() => record?.familyMembers ?? [], [record]);
  const maidPhoto     = useMemo(() => getPrimaryPhoto(maid), [maid]);

  const documents = useMemo<UploadedFile[]>(
    () => (record?.documents ?? []).flatMap((d) => {
      const category = toText(d.category); const url = toText(d.fileUrl); const name = toText(d.fileName);
      if (!category || !url || !name) return [];
      return [{ category, url, name }];
    }),
    [record],
  );

  const documentGroups = useMemo(
    () => documents.reduce<Record<string, UploadedFile[]>>((acc, d) => {
      acc[d.category] = [...(acc[d.category] ?? []), d]; return acc;
    }, {}),
    [documents],
  );

  const dob = (obj: Record<string, unknown>) =>
    [toText(obj.dateOfBirthDay), toText(obj.dateOfBirthMonth), toText(obj.dateOfBirthYear)].filter(Boolean).join(" / ") || "—";

  /* ordinal labels */
  const ordinal = (i: number) => ["1st", "2nd", "3rd", "4th", "5th"][i] ?? `${i + 1}th`;

  /* ── loading / error ── */
  if (isLoading) return (
    <div className="page-container max-w-4xl flex min-h-[30vh] items-center justify-center text-sm text-gray-400">
      Loading employment contract…
    </div>
  );
  if (loadError || !record) return (
    <div className="page-container max-w-4xl">
      <div className="rounded border border-red-200 bg-red-50 p-4 text-sm text-red-600">{loadError ?? "No employment contract found."}</div>
    </div>
  );

  /* ── document category fallback list (from image) ── */
  const docCategoryFallback = [
    "Maid Agency Form",
    "Official Receipt",
    "Standard Contract Between Employer and Employment Agency",
    "Form A",
    "Form B",
    "Salary Deduction Form",
    "Prescribed authorisation form for employment agency (Only for country domestic worker)",
    "Employer's Income Tax Declarations",
    "Insurance Forms",
    "Government Bond Form",
    "Standard Contract Between Maid and Employer",
    "Rest Day Agreement Form Between Maid and Employer",
    "Application For Inservice COOL",
    "Consent To Transfer Domestic Worker",
    "Handling and Taking Over Checklist",
    "Form 1368",
    "Safety Agreement Form Between Maid and Employer",
    "Existing Employer's Authorization Form",
  ];

  /* ─────────── render ─────────── */
  return (
    <div className="page-container max-w-4xl py-4 text-sm">

      {/* breadcrumb */}
      <div className="mb-1">
        <Link to={adminPath("/employment-contracts")} className="text-xs text-blue-600 hover:underline">
          ← Back to Employment Listing
        </Link>
      </div>

      {/* page title */}
      <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="text-base font-bold text-gray-800">Edit an Existing Employer</h2>
          <p className="text-xs text-gray-500">
            Reference Number:{" "}
            <span className="font-semibold text-[#4a7bb5]">{refCode || "—"}</span>
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => navigate(adminPath("/employment-contracts"))}>
            Back to List
          </Button>
          <Button size="sm" onClick={() => navigate(adminPath(`/employment-contracts/${encodeURIComponent(refCode || "")}/edit`))}>
            <Pencil className="mr-1.5 h-3.5 w-3.5" />
            Edit Contract
          </Button>
        </div>
      </div>

      {/* ══ THE MAID EMPLOYED ══ */}
      <SectionHeader title="The Maid Employed" />
      <SectionBody>
        <div className="grid grid-cols-[1fr_140px] gap-4">
          <dl className="space-y-1">
            <FieldRow label="Maid's Name"                value={toText(maid.name)} />
            <FieldRow label="Maid's Nationality"         value={toText(maid.nationality)} />
            <FieldRow label="Maid's Date of Birth"       value={dob(maid)} />
            <FieldRow label="Maid's FIN No"              value={toText(maid.finNo)} />
            <FieldRow label="Maid's Passport No"         value={toText(maid.passportNo)} />
            <FieldRow label="Salary"                     value={toText(maid.salary)} />
            <FieldRow label="Number Of Off Days"         value={toText(maid.numberOfOffDays)} />
            <FieldRow label="Compensation for Off Day"   value={toText(maid.compensationForOffDay)} />
            <FieldRow label="Name of Next Replace"       value={toText(maid.nameOfReplacement)} />
            <FieldRow label="Passport of Maid Replace"   value={toText(maid.passportOfReplacement)} />
          </dl>
          {/* photo */}
          <div className="flex flex-col items-center pt-1">
            <div className="overflow-hidden rounded border border-gray-300 bg-gray-100" style={{ width: 120, height: 150 }}>
              {maidPhoto ? (
                <img src={maidPhoto} alt={toText(maid.name)} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full flex-col items-center justify-center text-gray-300">
                  <User className="h-10 w-10" />
                  <span className="mt-1 text-[10px]">No photo</span>
                </div>
              )}
            </div>
            {toText(maid.referenceCode) && (
              <span className="mt-1 text-[10px] text-gray-500">Ref: {toText(maid.referenceCode)}</span>
            )}
          </div>
        </div>
      </SectionBody>

      {/* ══ AGENCY ══ */}
      <SectionHeader title="Agency" />
      <SectionBody>
        <dl className="space-y-1">
          <FieldRow label="Contract Date"                value={toText(agency.contractDate)} />
          <FieldRow label="Date Of Employment"           value={toText(agency.dateOfEmployment)} />
          <FieldRow label="Invoice Number"               value={toText(agency.invoiceNumber)} />
          <FieldRow label="Service Fee"                  value={toText(agency.serviceFee)} />
          <FieldRow label="Deposit"                      value={toText(agency.deposit)} />
          <FieldRow label="Getting By Regular (SIP) Fee" value={toText(agency.sipFee)} />
          <FieldRow label="Placement Fee"                value={toText(agency.placementFee)} />
          <FieldRow label="Transport Fee"                value={toText(agency.transportFee)} />
          <FieldRow label="Document Fee"                 value={toText(agency.documentFee)} />
          <FieldRow label="Renewal Fee (First Line)"     value={toText(agency.renewalFee)} />
          <FieldRow label="Insurance Fee"                value={toText(agency.insuranceFee)} />
          <FieldRow label="Agency Address"               value={toText(agency.agencyAddress)} />
          <FieldRow label="Agency Witness"               value={toText(agency.agencyWitness)} />
        </dl>
      </SectionBody>

      {/* ══ EMPLOYER ══ */}
      <SectionHeader title="Employer" />
      <SectionBody>
        <dl className="space-y-1">
          <FieldRow label="Name"                         value={toText(employer.name)} />
          <FieldRow label="Gender"                       value={toText(employer.gender)} />
          <FieldRow label="Date of Birth"                value={dob(employer)} />
          <FieldRow label="Nationality Title"            value={toText(employer.nationality)} />
          <FieldRow label="Residential Status"           value={toText(employer.residentialStatus)} />
          <FieldRow label="NRIC / FIN / PP"              value={toText(employer.nric)} />
          <FieldRow label="Address Line 1"               value={toText(employer.addressLine1)} />
          <FieldRow label="Address Line 2"               value={toText(employer.addressLine2)} />
          <FieldRow label="Postal Code"                  value={toText(employer.postalCode)} />
          <FieldRow label="Type of Deployment"           value={toText(employer.typeOfDeployment)} />
          <FieldRow label="Type of Residence"            value={toText(employer.typeOfResidence)} />
          <FieldRow label="Occupation"                   value={toText(employer.occupation)} />
          <FieldRow label="Name Of Company"              value={toText(employer.company)} />
          <FieldRow label="Residential Phone"            value={toText(employer.residentialPhone)} />
          <FieldRow label="Email Address"                value={toText(employer.email)} />
          <FieldRow label="Mobile Number"                value={toText(employer.mobileNumber)} />
          <FieldRow label="Monthly Combined Income"      value={toText(employer.monthlyContribution)} />
          <FieldRow label="Notification of Assessment"   value={toText(employer.notificationOfAssessment)} />
          <FieldRow label="Existing Employer's NRIC"     value={toText(employer.existingEmployerNric)} />
        </dl>
      </SectionBody>

      {/* ══ SPOUSE ══ */}
      <SectionHeader title="Spouse" />
      <SectionBody>
        <dl className="space-y-1">
          <FieldRow label="Spouse Name"        value={toText(spouse.name)} />
          <FieldRow label="Gender"             value={toText(spouse.gender)} />
          <FieldRow label="Date of Birth"      value={dob(spouse)} />
          <FieldRow label="Nationality Title"  value={toText(spouse.nationality)} />
          <FieldRow label="Residential Status" value={toText(spouse.residentialStatus)} />
          <FieldRow label="NRIC / FIN / PP"    value={toText(spouse.nric)} />
          <FieldRow label="Occupation"         value={toText(spouse.occupation)} />
          <FieldRow label="Name Of Company"    value={toText(spouse.company)} />
        </dl>
      </SectionBody>

      {/* ══ FAMILY MEMBERS ══ */}
      {(familyMembers.length > 0 ? familyMembers : new Array(3).fill({})).map((member, i) => (
        <div key={i}>
          <SectionHeader title={`${ordinal(i)} Family Member`} />
          <SectionBody>
            <dl className="space-y-1">
              <FieldRow label="Name"          value={toText(member.name)} />
              <FieldRow label="Relationship"  value={toText(member.relationship)} />
              <FieldRow label="Birth Cert"    value={toText(member.birthCert)} />
              <FieldRow label="Date of Birth" value={toText(member.dateOfBirth)} />
            </dl>
          </SectionBody>
        </div>
      ))}

      {/* ══ ACTION BUTTONS ══ */}
      <div className="mt-4 flex flex-wrap items-center justify-center gap-3 rounded border border-gray-200 bg-gray-50 px-4 py-3">
        <Button size="sm" variant="outline">Submit &amp; Generate Forms</Button>
        <Button size="sm" variant="outline">Select All</Button>
        <Button size="sm">
          <Download className="mr-1.5 h-3.5 w-3.5" />
          Download Forms and Print
        </Button>
      </div>
      <p className="mt-1 text-center text-[11px] text-gray-400">
        The PDF Forms are for demo purposes only. Please approach admin for customization works.
      </p>

      {/* ══ DOCUMENTS & FORMS ══ */}
      <div className="mt-1">
        {documents.length > 0
          ? Object.entries(documentGroups).map(([category, files]) => (
              <div key={category}>
                <SectionHeader title={category} />
                <SectionBody>
                  <div className="divide-y divide-gray-100">
                    {files.map((file) => <DocRow key={`${file.category}-${file.name}`} file={file} />)}
                  </div>
                </SectionBody>
              </div>
            ))
          : docCategoryFallback.map((cat) => (
              <div key={cat}>
                <SectionHeader title={cat} />
                <SectionBody>
                  <p className="py-1 text-xs text-gray-400">No documents uploaded yet.</p>
                </SectionBody>
              </div>
            ))}
      </div>
    </div>
  );
};

export default EmploymentContractView;