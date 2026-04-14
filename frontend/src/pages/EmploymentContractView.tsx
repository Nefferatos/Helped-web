import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/sonner";
import { Eye, FileText, Pencil } from "lucide-react";
import { adminPath } from "@/lib/routes";

type UploadedFile = {
  name: string;
  url: string;
  category: string;
};

type EmployerContractRecord = {
  maid?: Record<string, unknown>;
  agency?: Record<string, unknown>;
  employer?: Record<string, unknown>;
  spouse?: Record<string, unknown>;
  familyMembers?: Array<Record<string, unknown>>;
  documents?: Array<{
    category?: string;
    fileUrl?: string;
    fileName?: string;
  }>;
};

const toText = (value: unknown) => String(value ?? "").trim();

const getPrimaryPhoto = (maid: Record<string, unknown>) => {
  const photoDataUrls = Array.isArray(maid.photoDataUrls)
    ? maid.photoDataUrls.filter((value): value is string => typeof value === "string" && value.trim().length > 0)
    : [];
  return photoDataUrls[0] || toText(maid.photoDataUrl);
};

const FieldRow = ({
  label,
  value,
}: {
  label: string;
  value: string;
}) => (
  <div className="grid gap-1 sm:grid-cols-[200px_1fr] sm:items-start">
    <dt className="text-sm font-medium text-gray-500">{label}</dt>
    <dd className="text-sm text-gray-900">{value || "—"}</dd>
  </div>
);

const SectionCard = ({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) => (
  <section className="rounded-xl border bg-white p-5 shadow-sm">
    <h3 className="mb-4 text-sm font-semibold uppercase tracking-[0.18em] text-primary">{title}</h3>
    <div className="space-y-3">{children}</div>
  </section>
);

const EmploymentContractView = () => {
  const { refCode } = useParams();
  const navigate = useNavigate();
  const [record, setRecord] = useState<EmployerContractRecord | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (!refCode) {
      setLoadError("Missing employment contract reference");
      setIsLoading(false);
      return;
    }

    const loadRecord = async () => {
      try {
        setIsLoading(true);
        setLoadError(null);
        const response = await fetch(`/api/employers/${encodeURIComponent(refCode)}`);
        const data = (await response.json().catch(() => ({}))) as {
          employer?: EmployerContractRecord;
          error?: string;
        };

        if (!response.ok || !data.employer) {
          throw new Error(data.error || "Failed to load employment contract");
        }

        setRecord(data.employer);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to load employment contract";
        setLoadError(message);
        toast.error(message);
      } finally {
        setIsLoading(false);
      }
    };

    void loadRecord();
  }, [refCode]);

  const maid = useMemo(() => record?.maid ?? {}, [record]);
  const agency = useMemo(() => record?.agency ?? {}, [record]);
  const employer = useMemo(() => record?.employer ?? {}, [record]);
  const spouse = useMemo(() => record?.spouse ?? {}, [record]);
  const familyMembers = useMemo(() => record?.familyMembers ?? [], [record]);
  const documents = useMemo<UploadedFile[]>(
    () =>
      (record?.documents ?? []).flatMap((document) => {
        const category = toText(document.category);
        const url = toText(document.fileUrl);
        const name = toText(document.fileName);
        if (!category || !url || !name) return [];
        return [{ category, url, name }];
      }),
    [record],
  );

  const documentGroups = useMemo(() => {
    return documents.reduce<Record<string, UploadedFile[]>>((acc, document) => {
      acc[document.category] = [...(acc[document.category] ?? []), document];
      return acc;
    }, {});
  }, [documents]);

  const maidPhoto = useMemo(() => getPrimaryPhoto(maid), [maid]);

  return (
    <div className="page-container max-w-5xl">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link
            to={adminPath("/employment-contracts")}
            className="mb-2 inline-flex items-center gap-1 text-xs text-primary hover:underline"
          >
            ← Back to Employment Contracts & Forms
          </Link>
          <h2 className="text-xl font-bold text-gray-900">Employment Contract & Form</h2>
          <p className="mt-1 text-sm text-gray-500">
            Reference: <span className="font-semibold text-primary">{refCode || "—"}</span>
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => navigate(adminPath("/employment-contracts"))}>
            Back to List
          </Button>
          <Button onClick={() => navigate(adminPath(`/employment-contracts/${encodeURIComponent(refCode || "")}/edit`))}>
            <Pencil className="mr-2 h-4 w-4" />
            Edit Contract
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="content-card text-sm text-muted-foreground">Loading employment contract…</div>
      ) : loadError ? (
        <div className="content-card text-sm text-destructive">{loadError}</div>
      ) : !record ? (
        <div className="content-card text-sm text-muted-foreground">No employment contract found.</div>
      ) : (
        <div className="space-y-5">
          <SectionCard title="Contract Summary">
            <dl className="space-y-3">
              <FieldRow label="Reference Number" value={toText(refCode)} />
              <FieldRow label="Contract Date" value={toText(agency.contractDate)} />
              <FieldRow label="Service Fee" value={toText(agency.serviceFee)} />
              <FieldRow label="Placement Fee" value={toText(agency.placementFee)} />
              <FieldRow label="Agency Witness" value={toText(agency.agencyWitness)} />
            </dl>
          </SectionCard>

          <SectionCard title="Maid Information">
            <div className="grid gap-4 lg:grid-cols-[220px_1fr]">
              <div className="overflow-hidden rounded-xl border bg-gray-50">
                {maidPhoto ? (
                  <img
                    src={maidPhoto}
                    alt={toText(maid.name) || "Maid profile"}
                    className="h-full min-h-[240px] w-full object-cover"
                  />
                ) : (
                  <div className="flex min-h-[240px] items-center justify-center text-sm text-gray-400">
                    No profile photo
                  </div>
                )}
              </div>
              <dl className="space-y-3">
                <FieldRow label="Name" value={toText(maid.name)} />
                <FieldRow label="Reference Code" value={toText(maid.referenceCode)} />
                <FieldRow label="Nationality" value={toText(maid.nationality)} />
                <FieldRow label="Work Permit No." value={toText(maid.workPermitNo)} />
                <FieldRow label="FIN No." value={toText(maid.finNo)} />
                <FieldRow label="Passport No." value={toText(maid.passportNo)} />
                <FieldRow label="Salary" value={toText(maid.salary)} />
                <FieldRow label="Number of Terms" value={toText(maid.numberOfTerms)} />
                <FieldRow label="Name of Replacement" value={toText(maid.nameOfReplacement)} />
              </dl>
            </div>
          </SectionCard>

          <SectionCard title="Employer Information">
            <dl className="space-y-3">
              <FieldRow label="Name" value={toText(employer.name)} />
              <FieldRow label="Gender" value={toText(employer.gender)} />
              <FieldRow label="Date of Birth" value={[toText(employer.dateOfBirthDay), toText(employer.dateOfBirthMonth), toText(employer.dateOfBirthYear)].filter(Boolean).join(" / ")} />
              <FieldRow label="Nationality" value={toText(employer.nationality)} />
              <FieldRow label="Residential Status" value={toText(employer.residentialStatus)} />
              <FieldRow label="NRIC" value={toText(employer.nric)} />
              <FieldRow label="Address Line 1" value={toText(employer.addressLine1)} />
              <FieldRow label="Address Line 2" value={toText(employer.addressLine2)} />
              <FieldRow label="Postal Code" value={toText(employer.postalCode)} />
              <FieldRow label="Type of Residence" value={toText(employer.typeOfResidence)} />
              <FieldRow label="Occupation" value={toText(employer.occupation)} />
              <FieldRow label="Company" value={toText(employer.company)} />
              <FieldRow label="Email" value={toText(employer.email)} />
              <FieldRow label="Residential Phone" value={toText(employer.residentialPhone)} />
              <FieldRow label="Mobile Number" value={toText(employer.mobileNumber)} />
              <FieldRow label="Monthly Contribution" value={toText(employer.monthlyContribution)} />
            </dl>
          </SectionCard>

          <SectionCard title="Spouse Information">
            <dl className="space-y-3">
              <FieldRow label="Name" value={toText(spouse.name)} />
              <FieldRow label="Gender" value={toText(spouse.gender)} />
              <FieldRow label="Date of Birth" value={[toText(spouse.dateOfBirthDay), toText(spouse.dateOfBirthMonth), toText(spouse.dateOfBirthYear)].filter(Boolean).join(" / ")} />
              <FieldRow label="Nationality" value={toText(spouse.nationality)} />
              <FieldRow label="Residential Status" value={toText(spouse.residentialStatus)} />
              <FieldRow label="NRIC" value={toText(spouse.nric)} />
              <FieldRow label="Occupation" value={toText(spouse.occupation)} />
              <FieldRow label="Company" value={toText(spouse.company)} />
            </dl>
          </SectionCard>

          <SectionCard title="Family Members">
            {familyMembers.length === 0 ? (
              <p className="text-sm text-gray-500">No family members saved.</p>
            ) : (
              <div className="overflow-x-auto rounded-lg border">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-secondary">
                      <th className="border-b px-3 py-2 text-left text-xs font-semibold">Name</th>
                      <th className="border-b px-3 py-2 text-left text-xs font-semibold">Type</th>
                      <th className="border-b px-3 py-2 text-left text-xs font-semibold">Relationship</th>
                      <th className="border-b px-3 py-2 text-left text-xs font-semibold">Date of Birth</th>
                    </tr>
                  </thead>
                  <tbody>
                    {familyMembers.map((member, index) => (
                      <tr key={`${toText(member.name)}-${index}`} className="bg-white">
                        <td className="border-b px-3 py-2">{toText(member.name) || "—"}</td>
                        <td className="border-b px-3 py-2">{toText(member.type) || "—"}</td>
                        <td className="border-b px-3 py-2">{toText(member.relationship) || "—"}</td>
                        <td className="border-b px-3 py-2">{toText(member.dateOfBirth) || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </SectionCard>

          <SectionCard title="Documents & Forms">
            {documents.length === 0 ? (
              <p className="text-sm text-gray-500">No uploaded forms or documents yet.</p>
            ) : (
              <div className="space-y-4">
                {Object.entries(documentGroups).map(([category, files]) => (
                  <div key={category} className="rounded-lg border border-gray-100 bg-gray-50/60 p-4">
                    <h4 className="mb-2 text-sm font-semibold text-gray-800">{category}</h4>
                    <div className="space-y-2">
                      {files.map((file) => (
                        <div key={`${file.category}-${file.name}`} className="flex flex-wrap items-center justify-between gap-2 rounded-md border bg-white px-3 py-2">
                          <div className="flex items-center gap-2 text-sm text-gray-700">
                            <FileText className="h-4 w-4 text-gray-400" />
                            <span>{file.name}</span>
                          </div>
                          <a
                            href={file.url}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
                          >
                            <Eye className="h-4 w-4" />
                            View File
                          </a>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>
        </div>
      )}
    </div>
  );
};

export default EmploymentContractView;
