import { useState, type ElementType } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import PublicSiteNavbar from "@/components/PublicSiteNavbar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/sonner";
import { fetchAgencyOptions } from "@/lib/agencies";
import { submitPublicAtsApplication } from "@/lib/ats";
import {
  ArrowRight,
  BriefcaseBusiness,
  CheckCircle2,
  FileCheck2,
  Globe2,
  MessageSquareText,
  ShieldCheck,
  Sparkles,
  UserRound,
} from "lucide-react";

type ApplicantFormState = {
  agencyId: string;
  fullName: string;
  email: string;
  contactNumber: string;
  nationality: string;
  dateOfBirth: string;
  gender: string;
  maritalStatus: string;
  address: string;
  yearsOfExperience: string;
  previousCountriesWorkedIn: string;
  childcareExperience: string;
  newbornCareExperience: string;
  elderlyCareExperience: string;
  disabledCareExperience: string;
  housekeepingExperience: string;
  cookingSkills: string;
  petCareExperience: string;
  languageSkills: string;
  certifications: string;
  trainingRecords: string;
  availableDate: string;
  expectedSalary: string;
  employmentPreference: string;
  coverNote: string;
};

const initialState: ApplicantFormState = {
  agencyId: "1",
  fullName: "",
  email: "",
  contactNumber: "",
  nationality: "",
  dateOfBirth: "",
  gender: "Female",
  maritalStatus: "",
  address: "",
  yearsOfExperience: "0",
  previousCountriesWorkedIn: "",
  childcareExperience: "0",
  newbornCareExperience: "0",
  elderlyCareExperience: "0",
  disabledCareExperience: "0",
  housekeepingExperience: "0",
  cookingSkills: "",
  petCareExperience: "0",
  languageSkills: "",
  certifications: "",
  trainingRecords: "",
  availableDate: "",
  expectedSalary: "",
  employmentPreference: "",
  coverNote: "",
};

const fileLabels: Record<string, string> = {
  resume: "Resume / CV",
  passport: "Passport",
  workPermit: "Work Permit",
  medical: "Medical Records",
  certificates: "Certificates",
  references: "References",
  introVideo: "Introduction Video",
  otherDocuments: "Other Documents",
};

const fileFieldOrder = [
  "resume",
  "passport",
  "workPermit",
  "medical",
  "certificates",
  "references",
  "introVideo",
  "otherDocuments",
] as const;

const fileMultiple = new Set(["certificates", "references", "otherDocuments"]);

const fieldClassName =
  "h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm shadow-sm shadow-slate-200/40 transition focus-visible:border-emerald-400 focus-visible:ring-emerald-200";

const SectionHeader = ({
  step,
  title,
  description,
  icon: Icon,
}: {
  step: string;
  title: string;
  description: string;
  icon: ElementType;
}) => (
  <div className="mb-6 flex items-start gap-4">
    <div className="rounded-2xl bg-emerald-50 p-3 text-emerald-700 shadow-sm shadow-emerald-100">
      <Icon className="h-5 w-5" />
    </div>
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-700">{step}</p>
      <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-950">{title}</h2>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">{description}</p>
    </div>
  </div>
);

const PublicMaidApplicationPage = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState<ApplicantFormState>(initialState);
  const [files, setFiles] = useState<Record<string, File[]>>({});

  const agenciesQuery = useQuery({
    queryKey: ["public-agency-options"],
    queryFn: fetchAgencyOptions,
  });

  const submitMutation = useMutation({
    mutationFn: async () => {
      const formData = new FormData();
      Object.entries(form).forEach(([key, value]) => formData.set(key, value));
      Object.entries(files).forEach(([key, selected]) => {
        selected.forEach((file) => formData.append(key, file));
      });
      return submitPublicAtsApplication(formData);
    },
    onSuccess: (data) => {
      toast.success(`Application submitted. Reference: ${data.applicationCode}`);
      navigate(`/apply-as-maid/status/${encodeURIComponent(data.applicationId)}?token=${encodeURIComponent(data.applicantAccessToken)}`);
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Failed to submit application"),
  });

  const updateField = (key: keyof ApplicantFormState, value: string) =>
    setForm((current) => ({ ...current, [key]: value }));

  const handleFileChange = (field: string, selectedList: FileList | null) => {
    const nextFiles = selectedList ? Array.from(selectedList) : [];
    setFiles((current) => ({ ...current, [field]: nextFiles }));
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(16,185,129,0.10),_transparent_24%),radial-gradient(circle_at_right,_rgba(250,204,21,0.18),_transparent_30%),linear-gradient(180deg,_#f7fbf7_0%,_#f5f7ef_48%,_#edf4ee_100%)]">
      <PublicSiteNavbar />
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <section className="overflow-hidden rounded-[2rem] border border-emerald-100 bg-white shadow-[0_32px_120px_-48px_rgba(15,23,42,0.32)]">
          <div className="grid gap-8 px-6 py-8 lg:grid-cols-[1.15fr_0.85fr] lg:px-10 lg:py-10">
            <div>
              <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100">Public Applicant Portal</Badge>
              <h1 className="mt-4 max-w-3xl text-4xl font-black tracking-tight text-slate-950 sm:text-5xl">
                Apply as a maid with a professional profile recruiters can review quickly.
              </h1>
              <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600">
                Complete your personal details, work history, and supporting documents in one place. After submission, our recruitment team can review your application and follow up with you directly.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                {[
                  "Single online application",
                  "Resume and document upload",
                  "Private status tracking",
                  "WhatsApp-ready contact flow",
                ].map((item) => (
                  <span key={item} className="rounded-full border border-emerald-100 bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-900">
                    {item}
                  </span>
                ))}
              </div>
              <div className="mt-8 grid gap-3 sm:grid-cols-3">
                {[
                  { label: "Step 1", value: "Personal info" },
                  { label: "Step 2", value: "Experience & skills" },
                  { label: "Step 3", value: "Availability & files" },
                ].map((item) => (
                  <div key={item.label} className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{item.label}</p>
                    <p className="mt-2 text-sm font-semibold text-slate-900">{item.value}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid gap-3 self-start">
              {[
                { icon: FileCheck2, title: "Upload once", body: "Attach your resume, passport, certificates, references, and optional introduction video in one application." },
                { icon: Sparkles, title: "Professional formatting", body: "Your skills, availability, and experience are captured in a recruiter-friendly structure." },
                { icon: MessageSquareText, title: "Clear follow-up", body: "Use your latest WhatsApp number and email so recruiters can contact you faster." },
                { icon: ShieldCheck, title: "Private status page", body: "After you submit, you will receive a private application tracking link and reference." },
              ].map((item) => (
                <Card key={item.title} className="rounded-[1.5rem] border-slate-200 bg-white/95 p-4">
                  <div className="flex items-start gap-3">
                    <div className="rounded-2xl bg-amber-100 p-3 text-amber-700">
                      <item.icon className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-semibold text-slate-900">{item.title}</p>
                      <p className="mt-1 text-sm leading-6 text-slate-600">{item.body}</p>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </section>

        <form
          className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_360px]"
          onSubmit={(event) => {
            event.preventDefault();
            submitMutation.mutate();
          }}
        >
          <div className="space-y-6">
            <Card className="rounded-[2rem] border-slate-200 bg-white/95 p-6 shadow-sm shadow-slate-200/60">
              <SectionHeader
                step="Step 1"
                title="Personal Information"
                description="Share your main contact details so the recruitment team can identify your profile and contact you without delays."
                icon={UserRound}
              />
              <div className="grid gap-4 md:grid-cols-2">
                <label className="space-y-2">
                  <span className="text-sm font-medium text-slate-700">Agency</span>
                  <select
                    className={fieldClassName}
                    value={form.agencyId}
                    onChange={(event) => updateField("agencyId", event.target.value)}
                  >
                    {(agenciesQuery.data ?? [{ id: 1, name: "Default Agency", email: "", createdAt: "", totalMaids: 0, publicMaids: 0 }]).map((agency) => (
                      <option key={agency.id} value={agency.id}>
                        {agency.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="space-y-2">
                  <span className="text-sm font-medium text-slate-700">Full Name</span>
                  <Input className={fieldClassName} value={form.fullName} onChange={(event) => updateField("fullName", event.target.value)} required />
                </label>
                <label className="space-y-2">
                  <span className="text-sm font-medium text-slate-700">Email</span>
                  <Input className={fieldClassName} type="email" value={form.email} onChange={(event) => updateField("email", event.target.value)} required />
                </label>
                <label className="space-y-2">
                  <span className="text-sm font-medium text-slate-700">Contact Number / WhatsApp</span>
                  <Input className={fieldClassName} value={form.contactNumber} onChange={(event) => updateField("contactNumber", event.target.value)} required />
                </label>
                <label className="space-y-2">
                  <span className="text-sm font-medium text-slate-700">Nationality</span>
                  <Input className={fieldClassName} value={form.nationality} onChange={(event) => updateField("nationality", event.target.value)} />
                </label>
                <label className="space-y-2">
                  <span className="text-sm font-medium text-slate-700">Date of Birth</span>
                  <Input className={fieldClassName} type="date" value={form.dateOfBirth} onChange={(event) => updateField("dateOfBirth", event.target.value)} />
                </label>
                <label className="space-y-2">
                  <span className="text-sm font-medium text-slate-700">Gender</span>
                  <select className={fieldClassName} value={form.gender} onChange={(event) => updateField("gender", event.target.value)}>
                    <option value="Female">Female</option>
                    <option value="Male">Male</option>
                    <option value="Other">Other</option>
                  </select>
                </label>
                <label className="space-y-2">
                  <span className="text-sm font-medium text-slate-700">Marital Status</span>
                  <Input className={fieldClassName} value={form.maritalStatus} onChange={(event) => updateField("maritalStatus", event.target.value)} />
                </label>
                <label className="space-y-2 md:col-span-2">
                  <span className="text-sm font-medium text-slate-700">Address</span>
                  <Textarea className="min-h-[96px] rounded-xl border-slate-200 shadow-sm shadow-slate-200/40 focus-visible:border-emerald-400 focus-visible:ring-emerald-200" rows={3} value={form.address} onChange={(event) => updateField("address", event.target.value)} />
                </label>
              </div>
            </Card>

            <Card className="rounded-[2rem] border-slate-200 bg-white/95 p-6 shadow-sm shadow-slate-200/60">
              <SectionHeader
                step="Step 2"
                title="Experience and Skills"
                description="Describe your work history clearly so agencies can match you to the right family, care needs, and household responsibilities."
                icon={BriefcaseBusiness}
              />
              <div className="grid gap-4 md:grid-cols-2">
                <label className="space-y-2">
                  <span className="text-sm font-medium text-slate-700">Years of Experience</span>
                  <Input className={fieldClassName} type="number" min="0" value={form.yearsOfExperience} onChange={(event) => updateField("yearsOfExperience", event.target.value)} />
                </label>
                <label className="space-y-2">
                  <span className="text-sm font-medium text-slate-700">Previous Countries Worked In</span>
                  <Input className={fieldClassName} value={form.previousCountriesWorkedIn} onChange={(event) => updateField("previousCountriesWorkedIn", event.target.value)} placeholder="Singapore, Hong Kong, Dubai" />
                </label>
                <label className="space-y-2">
                  <span className="text-sm font-medium text-slate-700">Childcare Experience (years)</span>
                  <Input className={fieldClassName} type="number" min="0" value={form.childcareExperience} onChange={(event) => updateField("childcareExperience", event.target.value)} />
                </label>
                <label className="space-y-2">
                  <span className="text-sm font-medium text-slate-700">Newborn Care Experience (years)</span>
                  <Input className={fieldClassName} type="number" min="0" value={form.newbornCareExperience} onChange={(event) => updateField("newbornCareExperience", event.target.value)} />
                </label>
                <label className="space-y-2">
                  <span className="text-sm font-medium text-slate-700">Elderly Care Experience (years)</span>
                  <Input className={fieldClassName} type="number" min="0" value={form.elderlyCareExperience} onChange={(event) => updateField("elderlyCareExperience", event.target.value)} />
                </label>
                <label className="space-y-2">
                  <span className="text-sm font-medium text-slate-700">Disabled Care Experience (years)</span>
                  <Input className={fieldClassName} type="number" min="0" value={form.disabledCareExperience} onChange={(event) => updateField("disabledCareExperience", event.target.value)} />
                </label>
                <label className="space-y-2">
                  <span className="text-sm font-medium text-slate-700">Housekeeping Experience (years)</span>
                  <Input className={fieldClassName} type="number" min="0" value={form.housekeepingExperience} onChange={(event) => updateField("housekeepingExperience", event.target.value)} />
                </label>
                <label className="space-y-2">
                  <span className="text-sm font-medium text-slate-700">Pet Care Experience (years)</span>
                  <Input className={fieldClassName} type="number" min="0" value={form.petCareExperience} onChange={(event) => updateField("petCareExperience", event.target.value)} />
                </label>
                <label className="space-y-2 md:col-span-2">
                  <span className="text-sm font-medium text-slate-700">Cooking Skills</span>
                  <Textarea className="min-h-[96px] rounded-xl border-slate-200 shadow-sm shadow-slate-200/40 focus-visible:border-emerald-400 focus-visible:ring-emerald-200" rows={3} value={form.cookingSkills} onChange={(event) => updateField("cookingSkills", event.target.value)} placeholder="Chinese food, Indian food, halal cooking" />
                </label>
                <label className="space-y-2 md:col-span-2">
                  <span className="text-sm font-medium text-slate-700">Languages Spoken</span>
                  <Textarea className="min-h-[96px] rounded-xl border-slate-200 shadow-sm shadow-slate-200/40 focus-visible:border-emerald-400 focus-visible:ring-emerald-200" rows={3} value={form.languageSkills} onChange={(event) => updateField("languageSkills", event.target.value)} placeholder="English, Bahasa Indonesia, Mandarin" />
                </label>
                <label className="space-y-2">
                  <span className="text-sm font-medium text-slate-700">Certifications</span>
                  <Textarea className="min-h-[96px] rounded-xl border-slate-200 shadow-sm shadow-slate-200/40 focus-visible:border-emerald-400 focus-visible:ring-emerald-200" rows={3} value={form.certifications} onChange={(event) => updateField("certifications", event.target.value)} />
                </label>
                <label className="space-y-2">
                  <span className="text-sm font-medium text-slate-700">Training Records</span>
                  <Textarea className="min-h-[96px] rounded-xl border-slate-200 shadow-sm shadow-slate-200/40 focus-visible:border-emerald-400 focus-visible:ring-emerald-200" rows={3} value={form.trainingRecords} onChange={(event) => updateField("trainingRecords", event.target.value)} />
                </label>
              </div>
            </Card>

            <Card className="rounded-[2rem] border-slate-200 bg-white/95 p-6 shadow-sm shadow-slate-200/60">
              <SectionHeader
                step="Step 3"
                title="Availability and Documents"
                description="Tell us when you can start and upload the supporting files that help recruiters move your application forward faster."
                icon={FileCheck2}
              />
              <div className="grid gap-4 md:grid-cols-2">
                <label className="space-y-2">
                  <span className="text-sm font-medium text-slate-700">Available Date</span>
                  <Input className={fieldClassName} type="date" value={form.availableDate} onChange={(event) => updateField("availableDate", event.target.value)} />
                </label>
                <label className="space-y-2">
                  <span className="text-sm font-medium text-slate-700">Expected Salary</span>
                  <Input className={fieldClassName} type="number" min="0" value={form.expectedSalary} onChange={(event) => updateField("expectedSalary", event.target.value)} placeholder="700" />
                </label>
                <label className="space-y-2 md:col-span-2">
                  <span className="text-sm font-medium text-slate-700">Employment Preference</span>
                  <Input className={fieldClassName} value={form.employmentPreference} onChange={(event) => updateField("employmentPreference", event.target.value)} placeholder="Transfer, new placement, full-time live-in" />
                </label>
                <label className="space-y-2 md:col-span-2">
                  <span className="text-sm font-medium text-slate-700">Short Introduction / Cover Note</span>
                  <Textarea className="min-h-[128px] rounded-xl border-slate-200 shadow-sm shadow-slate-200/40 focus-visible:border-emerald-400 focus-visible:ring-emerald-200" rows={5} value={form.coverNote} onChange={(event) => updateField("coverNote", event.target.value)} placeholder="Tell us about your strengths, preferred work environment, and any recent experience." />
                </label>
              </div>

              <div className="mt-8">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-bold text-slate-950">Upload Supporting Documents</h3>
                    <p className="mt-1 text-sm text-slate-600">Add any files that help the agency review your application more confidently.</p>
                  </div>
                  <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-700">Optional except where required by agency</Badge>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                {fileFieldOrder.map((field) => (
                  <label key={field} className="space-y-3 rounded-2xl border border-dashed border-slate-300 bg-slate-50/80 p-4 transition hover:border-emerald-300 hover:bg-emerald-50/60">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-sm font-medium text-slate-800">{fileLabels[field]}</span>
                      <span className="text-xs font-medium text-slate-500">{field === "introVideo" ? "Video" : "File upload"}</span>
                    </div>
                    <Input
                      className={fieldClassName}
                      type="file"
                      multiple={fileMultiple.has(field)}
                      accept={field === "introVideo" ? "video/*" : undefined}
                      onChange={(event) => handleFileChange(field, event.target.files)}
                    />
                    <p className="text-xs text-slate-500">
                      {files[field]?.length ? `${files[field].length} file(s) selected` : "No file selected yet"}
                    </p>
                  </label>
                ))}
              </div>
            </Card>
          </div>

          <div className="space-y-6 xl:sticky xl:top-28 xl:self-start">
            <Card className="rounded-[2rem] border-slate-200 bg-slate-950 p-6 text-white shadow-[0_24px_80px_-40px_rgba(15,23,42,0.65)]">
              <div className="flex items-center gap-3">
                <div className="rounded-2xl bg-emerald-400/15 p-3 text-emerald-300">
                  <Globe2 className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-300">Before You Submit</p>
                  <h3 className="mt-1 text-2xl font-black">Make your profile easy to review.</h3>
                </div>
              </div>
              <div className="mt-5 space-y-3 text-sm leading-6 text-slate-300">
                <p>Include your latest phone number and WhatsApp so recruiters can contact you quickly.</p>
                <p>Adding a resume and passport helps the agency move you from intake to review faster.</p>
                <p>After submission, you will be redirected to a private status page with your application reference.</p>
              </div>
              <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-300">Application checklist</p>
                <div className="mt-3 space-y-2 text-sm text-slate-200">
                  {[
                    "Contact number is correct",
                    "Experience details are filled in",
                    "Availability date is updated",
                    "Resume / passport uploaded if available",
                  ].map((item) => (
                    <div key={item} className="flex items-start gap-2">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-300" />
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </div>
              <Button type="submit" className="mt-6 w-full bg-emerald-500 text-white hover:bg-emerald-600" disabled={submitMutation.isPending}>
                {submitMutation.isPending ? "Submitting Application..." : "Submit Application"}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              <p className="mt-3 text-xs text-slate-400">
                By submitting, you allow the agency to review your information and contact you about recruitment opportunities.
              </p>
            </Card>

            <Card className="rounded-[2rem] border-slate-200 bg-white/95 p-6 shadow-sm shadow-slate-200/60">
              <h3 className="text-lg font-black text-slate-950">What happens next</h3>
              <div className="mt-4 space-y-3 text-sm text-slate-600">
                <p>1. Your application is created in the agency recruitment system as a new applicant.</p>
                <p>2. Recruiters review your profile, documents, and qualification score.</p>
                <p>3. You may receive follow-ups for missing documents, interviews, or approvals.</p>
              </div>
              <div className="mt-5 rounded-2xl bg-amber-50 p-4 text-sm text-amber-900">
                Keep your phone nearby after submitting. The agency may contact you for clarifications or interview scheduling.
              </div>
              <div className="mt-5 border-t border-slate-200 pt-5">
                <Link to="/" className="text-sm font-medium text-emerald-700 hover:text-emerald-800">
                  Return to homepage
                </Link>
              </div>
            </Card>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PublicMaidApplicationPage;
