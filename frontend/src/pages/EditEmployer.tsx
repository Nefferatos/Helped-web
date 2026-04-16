import { useEffect, useState, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { useNavigate, useParams, Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  FileText,
  Download,
  Upload,
  Eye,
  Search,
  X,
  Check,
  Plus,
  User,
  Loader2,
  ArrowUp,
  FileCheck2,
} from "lucide-react";
import { toast } from "@/components/ui/sonner";
import { downloadMergedEmployerPdf, printMergedEmployerPdf } from "@/lib/employerPdf";
import { adminPath } from "@/lib/routes";

// ─── Mock maid directory ──────────────────────────────────────────────────────
const MAID_DIRECTORY = [
  { id: "M001", name: "Saraswathi Murugan", nationality: "Indian maid", workPermitNo: "G1234567P", finNo: "G1234567P", passportNo: "N1234567", salary: "800", numberOfOffDays: "4", compensationNoOffday: "0", nameOfReplacement: "Alpha Ranger", passportOfMaid: "" },
  { id: "M002", name: "Dewi Susanti", nationality: "Indonesian maid", workPermitNo: "G7654321P", finNo: "G7654321P", passportNo: "B7654321", salary: "700", numberOfOffDays: "4", compensationNoOffday: "0", nameOfReplacement: "", passportOfMaid: "" },
  { id: "M003", name: "Maria Santos", nationality: "Filipino maid", workPermitNo: "G9876543P", finNo: "G9876543P", passportNo: "AA9876543", salary: "750", numberOfOffDays: "4", compensationNoOffday: "0", nameOfReplacement: "", passportOfMaid: "" },
];

type MaidSelectionValue = {
  id?: number | string;
  referenceCode?: string;
  photoDataUrl?: string;
  photoDataUrls?: string[];
  name: string;
  nationality: string;
  workPermitNo: string;
  finNo: string;
  passportNo: string;
  salary: string;
  numberOfOffDays: string;
  compensationNoOffday: string;
  nameOfReplacement: string;
  passportOfMaid: string;
};
type PublicMaidRecord = {
  id: number | string;
  fullName: string;
  referenceCode: string;
  nationality?: string;
  photoDataUrl?: string;
  photoDataUrls?: string[];
  agencyContact?: Record<string, unknown>;
  introduction?: Record<string, unknown>;
  isPublic?: boolean;
};
type UploadedFile = { name: string; url: string; category: string };

const getTodayValue = () => new Date().toISOString().slice(0, 10);

const GENERATED_FORMS: { category: string; files: { name: string; isNew?: boolean }[]; hasTemplate: boolean }[] = [
  { category: "Maid Biodata Form", files: [{ name: "Maid_Biodata.pdf", isNew: true }], hasTemplate: true },
  { category: "Official Receipt", files: [{ name: "Official_Receipt.pdf", isNew: true }], hasTemplate: false },
  { category: "Standard Contract Between Employer and Employment Agency", files: [{ name: "Service_Contract_Between_Employer_And_Agency_Format_1.pdf" }, { name: "Service_Contract_Between_Employer_And_Agency_Format_2.pdf" }], hasTemplate: true },
  { category: "Form A", files: [{ name: "FormA.pdf" }], hasTemplate: true },
  { category: "Form C", files: [{ name: "FormC.pdf" }], hasTemplate: true },
  { category: "Salary Schedule Form", files: [{ name: "Salary_Form.pdf" }], hasTemplate: true },
  { category: "Employee Income Tax Declaration", files: [{ name: "Employee_Income_Tax_Declaration.pdf" }], hasTemplate: true },
  { category: "Insurance Forms", files: [{ name: "ticpanel_mh_insurance.pdf" }, { name: "Zurich_Life_Insurance.pdf" }, { name: "indian_network_maid_insurance_form.pdf" }, { name: "Liberty_Insurance_Form.pdf" }], hasTemplate: true },
  { category: "Standard Contract Between Maid and Employer", files: [{ name: "Terms_Contract_Between_Maid_and_Employer.pdf" }], hasTemplate: true },
  { category: "Rest Day Agreement Form Between Maid and Employer", files: [{ name: "Rest_Day_Agreement_Form_between_Maid_and_Employer.pdf" }], hasTemplate: true },
  { category: "Safety Agreement Form Between Maid And Employer", files: [{ name: "Safety_Agreement_Form_between_Maid_and_Employer_Topology.pdf" }, { name: "Safety_Agreement_Form_between_Maid_and_Employer_Indonesian.pdf" }, { name: "Safety_Agreement_Form_between_Maid_and_Employer_Burmese.pdf" }, { name: "Safety_Agreement_Form_between_Maid_and_Employer_Tamil.pdf" }], hasTemplate: true },
  { category: "Handing and Taking Over Checklist", files: [{ name: "Handing_Taking_Over_Checklist.pdf" }], hasTemplate: true },
  { category: "Form S10", files: [{ name: "FormS10.pdf" }], hasTemplate: false },
];

const CATEGORY_NAMES = GENERATED_FORMS.map((f) => f.category);

/* ═══════════════════════════════════════════════════════
   SHARED LAYOUT PRIMITIVES
═══════════════════════════════════════════════════════ */

/** Blue header bar */
const SectionHeader = ({ title }: { title: string }) => (
  <div className="mt-4 mb-0 rounded-t-sm bg-[#4a7bb5] px-3 py-1.5">
    <h3 className="text-sm font-semibold text-white">{title}</h3>
  </div>
);

/** Bordered white panel beneath a SectionHeader */
const SectionBody = ({ children }: { children: React.ReactNode }) => (
  <div className="rounded-b-sm border border-[#c5d3e8] bg-white px-4 py-3">
    {children}
  </div>
);

/**
 * Horizontal field row — label on the left, control on the right.
 */
const Field = ({
  label,
  required,
  hint,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  children: React.ReactNode;
}) => (
  <div className="grid grid-cols-[220px_1fr] items-start gap-x-2 py-0.5">
    <label className="pt-1.5 text-right text-xs text-gray-600">
      {label}
      {required && <span className="ml-0.5 text-rose-500">*</span>}
    </label>
    <div className="space-y-0.5">
      {children}
      {hint && <p className="text-[10px] text-gray-400">{hint}</p>}
    </div>
  </div>
);

/** Thin sub-divider line with a centred label */
const SubHeader = ({ label }: { label: string }) => (
  <div className="col-span-2 flex items-center gap-3 py-1">
    <div className="flex-1 h-px bg-[#c5d3e8]" />
    <span className="text-[10px] font-bold tracking-widest uppercase text-gray-400">{label}</span>
    <div className="flex-1 h-px bg-[#c5d3e8]" />
  </div>
);

/** Inline radio group */
const RadioGroup = ({
  name, options, value, onChange,
}: {
  name: string; options: string[]; value: string; onChange: (v: string) => void;
}) => (
  <div className="flex flex-wrap gap-2 pt-0.5">
    {options.map((opt) => (
      <label
        key={opt}
        className={`flex cursor-pointer items-center gap-1.5 rounded border px-2.5 py-1 text-xs transition-colors ${
          value === opt
            ? "border-blue-300 bg-blue-50 font-semibold text-blue-700"
            : "border-gray-200 text-gray-600 hover:border-gray-300"
        }`}
      >
        <input type="radio" name={name} checked={value === opt} onChange={() => onChange(opt)} className="sr-only" />
        {value === opt && <Check className="h-2.5 w-2.5 text-blue-500" />}
        {opt}
      </label>
    ))}
  </div>
);

/** Day / Month / Year dropdowns */
const DatePicker = ({
  day, month, year, onDay, onMonth, onYear,
}: {
  day: string; month: string; year: string;
  onDay: (v: string) => void; onMonth: (v: string) => void; onYear: (v: string) => void;
}) => (
  <div className="flex flex-wrap items-center gap-1.5">
    <Select value={day || undefined} onValueChange={onDay}>
      <SelectTrigger className="h-7 w-16 text-xs"><SelectValue placeholder="01" /></SelectTrigger>
      <SelectContent>{Array.from({ length: 31 }, (_, i) => <SelectItem key={i} value={String(i + 1).padStart(2, "0")}>{String(i + 1).padStart(2, "0")}</SelectItem>)}</SelectContent>
    </Select>
    <Select value={month || undefined} onValueChange={onMonth}>
      <SelectTrigger className="h-7 w-16 text-xs"><SelectValue placeholder="01" /></SelectTrigger>
      <SelectContent>{Array.from({ length: 12 }, (_, i) => <SelectItem key={i} value={String(i + 1).padStart(2, "0")}>{String(i + 1).padStart(2, "0")}</SelectItem>)}</SelectContent>
    </Select>
    <Select value={year || undefined} onValueChange={onYear}>
      <SelectTrigger className="h-7 w-20 text-xs"><SelectValue placeholder="1910" /></SelectTrigger>
      <SelectContent>{Array.from({ length: 120 }, (_, i) => <SelectItem key={i} value={String(1910 + i)}>{1910 + i}</SelectItem>)}</SelectContent>
    </Select>
    <span className="text-[10px] text-gray-400">(day-month-year)</span>
  </div>
);

/* ═══════════════════════════════════════════════════════
   CATEGORY FILE UPLOAD ROW
═══════════════════════════════════════════════════════ */
const CategoryFileUpload = ({
  category, hasTemplate, refCode, uploads, onUpload,
}: {
  category: string; hasTemplate: boolean; refCode: string; uploads: UploadedFile[]; onUpload: (files: UploadedFile[]) => void;
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    setIsUploading(true);
    try {
      const uploaded: UploadedFile[] = [];
      for (const file of files) {
        const fd = new FormData();
        fd.append("file", file); fd.append("category", category); fd.append("refCode", refCode);
        const res = await fetch("/api/employer-files", { method: "POST", body: fd });
        const data = (await res.json().catch(() => ({}))) as { error?: string; fileUrl?: string; fileName?: string; category?: string };
        if (!res.ok || !data.fileUrl || !data.fileName) throw new Error(data.error || `Failed to upload ${file.name}`);
        uploaded.push({ name: data.fileName, url: data.fileUrl, category: data.category || category });
      }
      onUpload([...uploads, ...uploaded]);
      toast.success(`${uploaded.length} file${uploaded.length === 1 ? "" : "s"} uploaded`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to upload file");
    } finally { setIsUploading(false); e.target.value = ""; }
  };

  const removeUpload = (idx: number) => onUpload(uploads.filter((_, i) => i !== idx));

  return (
    <div className="space-y-1.5 py-1">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-1.5">
          <FileText className="h-3.5 w-3.5 flex-shrink-0 text-gray-400" />
          <span className="truncate text-xs text-gray-700">{category}</span>
        </div>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={isUploading}
          className="flex items-center gap-1 text-[11px] font-medium text-blue-600 hover:text-blue-800 disabled:opacity-50"
        >
          {isUploading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Upload className="h-3 w-3" />}
          {hasTemplate ? "Upload Signed File" : "Upload File"}
        </button>
      </div>
      <input ref={inputRef} type="file" multiple className="hidden" onChange={handleFileChange} />
      {uploads.length > 0 && (
        <div className="space-y-1 pl-5">
          {uploads.map((u, i) => (
            <div key={i} className="flex items-center gap-2 rounded border border-gray-100 bg-gray-50 px-2 py-1 text-xs">
              <FileCheck2 className="h-3.5 w-3.5 flex-shrink-0 text-emerald-500" />
              <a href={u.url} target="_blank" rel="noopener noreferrer" className="flex-1 truncate text-blue-600 hover:underline">{u.name}</a>
              <button type="button" onClick={() => removeUpload(i)} className="text-gray-300 hover:text-rose-400"><X className="h-3 w-3" /></button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

/* ═══════════════════════════════════════════════════════
   BULK UPLOAD MODAL
═══════════════════════════════════════════════════════ */
type BulkPendingFile = { id: string; file: File; category: string; status: "pending" | "uploading" | "done" | "error"; errorMsg?: string };

const BulkUploadModal = ({
  open, onClose, refCode, onUploadComplete,
}: {
  open: boolean; onClose: () => void; refCode: string; onUploadComplete: (by: Record<string, UploadedFile[]>) => void;
}) => {
  const [pendingFiles, setPendingFiles] = useState<BulkPendingFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const bulkInputRef = useRef<HTMLInputElement>(null);

  const handleClose = useCallback(() => { if (isUploading) return; setPendingFiles([]); onClose(); }, [isUploading, onClose]);

  useEffect(() => {
    if (!open) return;
    const orig = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") { e.preventDefault(); handleClose(); } };
    window.addEventListener("keydown", onKey);
    return () => { document.body.style.overflow = orig; window.removeEventListener("keydown", onKey); };
  }, [open, handleClose]);

  const addFiles = (files: File[]) => setPendingFiles((p) => [...p, ...files.map((f) => ({ id: `${f.name}-${Date.now()}-${Math.random()}`, file: f, category: CATEGORY_NAMES[0], status: "pending" as const }))]);
  const handleDrop = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(false); addFiles(Array.from(e.dataTransfer.files)); };
  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => { addFiles(Array.from(e.target.files ?? [])); e.target.value = ""; };
  const updateCategory = (id: string, cat: string) => setPendingFiles((p) => p.map((f) => f.id === id ? { ...f, category: cat } : f));
  const removeFile = (id: string) => setPendingFiles((p) => p.filter((f) => f.id !== id));

  const uploadAll = async () => {
    const pending = pendingFiles.filter((f) => f.status === "pending");
    if (!pending.length) return;
    setIsUploading(true);
    const results: Record<string, UploadedFile[]> = {};
    for (const pf of pending) {
      setPendingFiles((p) => p.map((f) => f.id === pf.id ? { ...f, status: "uploading" } : f));
      try {
        const fd = new FormData(); fd.append("file", pf.file); fd.append("category", pf.category); fd.append("refCode", refCode);
        const res = await fetch("/api/employer-files", { method: "POST", body: fd });
        const data = (await res.json().catch(() => ({}))) as { error?: string; fileUrl?: string; fileName?: string };
        if (!res.ok || !data.fileUrl || !data.fileName) throw new Error(data.error || `Failed to upload ${pf.file.name}`);
        results[pf.category] = [...(results[pf.category] ?? []), { name: data.fileName, url: data.fileUrl, category: pf.category }];
        setPendingFiles((p) => p.map((f) => f.id === pf.id ? { ...f, status: "done" } : f));
      } catch (err) {
        setPendingFiles((p) => p.map((f) => f.id === pf.id ? { ...f, status: "error", errorMsg: err instanceof Error ? err.message : "Upload failed" } : f));
      }
    }
    setIsUploading(false); onUploadComplete(results); toast.success("Bulk upload complete");
  };

  const pendingCount = pendingFiles.filter((f) => f.status === "pending").length;
  const doneCount = pendingFiles.filter((f) => f.status === "done").length;
  const allDone = pendingFiles.length > 0 && pendingFiles.every((f) => f.status === "done" || f.status === "error");

  if (!open) return null;
  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm" onMouseDown={(e) => { if (e.target === e.currentTarget) handleClose(); }}>
      <div className="flex max-h-[90vh] w-full max-w-xl flex-col overflow-hidden rounded-xl border border-[#c5d3e8] bg-white shadow-2xl" onMouseDown={(e) => e.stopPropagation()}>
        {/* header */}
        <div className="rounded-t-xl bg-[#4a7bb5] px-4 py-2.5">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-white">Bulk File Upload</h2>
            <button type="button" onClick={handleClose} disabled={isUploading} className="text-white/70 hover:text-white disabled:opacity-40"><X className="h-4 w-4" /></button>
          </div>
          <p className="text-[10px] text-blue-100">Add files and assign each to a document category</p>
        </div>

        {/* body */}
        <div className="flex-1 space-y-3 overflow-y-auto p-4">
          <div
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={() => bulkInputRef.current?.click()}
            className={`flex cursor-pointer select-none flex-col items-center gap-2 rounded border-2 border-dashed py-7 px-4 transition-all ${isDragging ? "border-blue-400 bg-blue-50" : "border-gray-200 bg-gray-50 hover:border-gray-300"}`}
          >
            <Upload className={`h-5 w-5 ${isDragging ? "text-blue-500" : "text-gray-400"}`} />
            <p className="text-xs font-medium text-gray-600">{isDragging ? "Release to add files" : "Click or drag & drop files here"}</p>
            <p className="text-[10px] text-gray-400">PDF, images, documents — select multiple at once</p>
            <input ref={bulkInputRef} type="file" multiple className="hidden" onChange={handleFileInput} />
          </div>

          {pendingFiles.length > 0 && (
            <div className="space-y-1.5">
              {pendingFiles.map((pf) => (
                <div key={pf.id} className={`flex items-start gap-2 rounded border px-2.5 py-2 text-xs ${pf.status === "done" ? "border-emerald-100 bg-emerald-50" : pf.status === "error" ? "border-rose-100 bg-rose-50" : pf.status === "uploading" ? "border-blue-100 bg-blue-50" : "border-gray-100 bg-gray-50"}`}>
                  <div className="mt-0.5 flex-shrink-0">
                    {pf.status === "done" && <Check className="h-3.5 w-3.5 text-emerald-500" />}
                    {pf.status === "error" && <X className="h-3.5 w-3.5 text-rose-400" />}
                    {pf.status === "uploading" && <Loader2 className="h-3.5 w-3.5 animate-spin text-blue-500" />}
                    {pf.status === "pending" && <FileText className="h-3.5 w-3.5 text-gray-400" />}
                  </div>
                  <div className="min-w-0 flex-1 space-y-1">
                    <p className="truncate font-medium text-gray-700">{pf.file.name}</p>
                    {pf.status === "error" && <p className="text-rose-500">{pf.errorMsg}</p>}
                    {pf.status === "pending" && (
                      <select value={pf.category} onChange={(e) => updateCategory(pf.id, e.target.value)} className="w-full rounded border border-gray-200 bg-white px-1.5 py-1 text-[10px] text-gray-700 focus:border-blue-400 focus:outline-none">
                        {CATEGORY_NAMES.map((c) => <option key={c} value={c}>{c}</option>)}
                      </select>
                    )}
                    {pf.status === "done" && <p className="text-[10px] font-medium text-emerald-600">Saved to "{pf.category}"</p>}
                    {pf.status === "uploading" && <p className="text-[10px] text-blue-500">Uploading to "{pf.category}"…</p>}
                  </div>
                  {(pf.status === "pending" || pf.status === "error") && (
                    <button type="button" onClick={() => removeFile(pf.id)} className="mt-0.5 flex-shrink-0 text-gray-300 hover:text-rose-400"><X className="h-3 w-3" /></button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* footer */}
        <div className="flex items-center justify-between gap-2 border-t border-[#c5d3e8] bg-gray-50 px-4 py-3">
          <button type="button" onClick={handleClose} disabled={isUploading} className="text-xs text-gray-500 hover:text-gray-700 disabled:opacity-40">{allDone ? "Close" : "Cancel"}</button>
          <div className="flex items-center gap-2">
            {pendingFiles.length > 0 && !allDone && doneCount > 0 && <span className="text-[10px] text-gray-400">{doneCount}/{pendingFiles.length} done</span>}
            <button type="button" onClick={uploadAll} disabled={pendingCount === 0 || isUploading} className={`flex items-center gap-1.5 rounded px-4 py-1.5 text-xs font-semibold transition-all ${pendingCount > 0 && !isUploading ? "bg-[#4a7bb5] text-white hover:bg-[#3a6aa5]" : "cursor-not-allowed bg-gray-100 text-gray-400"}`}>
              {isUploading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Upload className="h-3 w-3" />}
              {isUploading ? "Uploading…" : pendingCount === 0 && allDone ? "All Done" : `Upload ${pendingCount} File${pendingCount !== 1 ? "s" : ""}`}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

/* ═══════════════════════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════════════════════ */
const EditEmployer = () => {
  const { refCode } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const isNew = location.pathname === adminPath("/employment-contracts/new") || refCode === "new";

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showBackToTop, setShowBackToTop] = useState(false);
  const [maidSearch, setMaidSearch] = useState("");
  const [publicMaids, setPublicMaids] = useState<PublicMaidRecord[]>([]);
  const [isLoadingPublicMaids, setIsLoadingPublicMaids] = useState(false);
  const [publicMaidsError, setPublicMaidsError] = useState<string | null>(null);
  const [selectedMaidId, setSelectedMaidId] = useState<number | string | null>(null);
  const [selectedPublicMaid, setSelectedPublicMaid] = useState<PublicMaidRecord | null>(null);
  const [categoryUploads, setCategoryUploads] = useState<Record<string, UploadedFile[]>>({});
  const [bulkUploadOpen, setBulkUploadOpen] = useState(false);


      const [maid, setMaid] = useState({
      referenceCode: "",
      name: isNew ? "" : "Saraswathi Murugan",
      nationality: isNew ? "" : "Filipino maid",
      workPermitNo: "",
      finNo: "",
      passportNo: "",
      salary: "",
      numberOfOffDays: "",
      compensationNoOffday: isNew ? "" : "0",
      nameOfReplacement: "",
      passportOfMaid: "",
      photoDataUrl: "",
      photoDataUrls: [] as string[],

      numberOfTerms: "",
      communicationToBuy: "",
    });

    const [agency, setAgency] = useState({
    caseReferenceNumber: refCode || "",
    contractDate: isNew ? "" : "13-04-2026",
    dateOfEmploymentDay: isNew ? "" : "01",
    dateOfEmploymentMonth: isNew ? "" : "01",
    dateOfEmploymentYear: isNew ? "" : "2014",
    invoiceNumber: isNew ? "" : "1",
    serviceFee: isNew ? "" : "1",
    deposit: isNew ? "" : "0",
    sipFee: isNew ? "" : "1",
    medicalFee: isNew ? "" : "1",
    transportFee: isNew ? "" : "1",
    documentFee: isNew ? "" : "1",
    placementFee: isNew ? "" : "0",
    insuranceFee: "",
    agencyWitness: isNew ? "" : "Balamurugan S/O Subramaniam (R1218275)",
    maidId: "",

    handlingInHospitalFee: "",
    extensionFee: "",
    discountedFee: "",
    balanceFee: "",
  });

    const [employer, setEmployer] = useState({
    name: "",
    gender: "",
    dateOfBirthDay: isNew ? "" : "01",
    dateOfBirthMonth: isNew ? "" : "01",
    dateOfBirthYear: isNew ? "" : "1910",
    nationality: isNew ? "" : "Singapore",
    residentialStatus: isNew ? "" : "Singapore Citizen",
    nric: "",
    addressLine1: "",
    addressLine2: "",
    postalCode: "",
    typeOfResidence: isNew ? "" : "HDB 3-ROOM",
    occupation: "",
    company: "",
    email: "",
    residentialPhone: "",
    mobileNumber: "",
    monthlyCombinedIncome: "",
    existingEmployer: "",
    existingEmployerNric: "",

    monthlyContribution: "",
    dateOfEmployment: "",
  });

  const [notificationDate, setNotificationDate] = useState({
    month: isNew ? "" : "JANUARY",
    year: isNew ? "" : "2017",
  });

  const [spouse, setSpouse] = useState({
    name: "",
    gender: "",
    dateOfBirthDay: isNew ? "" : "01",
    dateOfBirthMonth: isNew ? "" : "01",
    dateOfBirthYear: isNew ? "" : "1910",
    nationality: isNew ? "" : "Singapore",
    residentialStatus: isNew ? "" : "Singapore Citizen",
    nric: "",
    occupation: "",
    company: "",
  });

  const emptyFamilyMember = () => ({
    name: "",
    relationship: "",
    birthCertIcFin: "",
    dateOfBirthDay: "01",
    dateOfBirthMonth: "01",
    dateOfBirthYear: "1910",
  });
  
  const [familyMembers, setFamilyMembers] = useState(
    isNew
      ? [emptyFamilyMember()]
      : [
          { name: "", relationship: "", birthCertIcFin: "", dateOfBirthDay: "01", dateOfBirthMonth: "01", dateOfBirthYear: "1910" },
          { name: "", relationship: "", birthCertIcFin: "", dateOfBirthDay: "01", dateOfBirthMonth: "01", dateOfBirthYear: "1910" },
          { name: "", relationship: "", birthCertIcFin: "", dateOfBirthDay: "01", dateOfBirthMonth: "01", dateOfBirthYear: "1910" },
        ]
  );

  const addFamilyMember = () => setFamilyMembers((p) => [...p, emptyFamilyMember()]);
  const removeFamilyMember = (idx: number) => setFamilyMembers((p) => p.filter((_, i) => i !== idx));
  const updateFamilyMember = (idx: number, field: string, value: string) =>
    setFamilyMembers((p) => p.map((fm, i) => i === idx ? { ...fm, [field]: value } : fm));

  const updateCategoryUploads = (cat: string, files: UploadedFile[]) =>
    setCategoryUploads((p) => ({ ...p, [cat]: files }));
  const uploadedDocuments = Object.values(categoryUploads).flat();
  const displayedCaseRef = agency.caseReferenceNumber || refCode || "Auto-generated on save";

  const filteredPublicMaids = publicMaids.filter((m) => {
    const t = maidSearch.trim().toLowerCase();
    return !t || m.fullName.toLowerCase().includes(t) || m.referenceCode.toLowerCase().includes(t);
  });

  const handleBulkUploadComplete = (by: Record<string, UploadedFile[]>) => {
    setCategoryUploads((p) => {
      const m = { ...p };
      for (const [c, fs] of Object.entries(by)) m[c] = [...(m[c] ?? []), ...fs];
      return m;
    });
  };

  const handleMaidSelect = (sel: MaidSelectionValue | null) => {
    if (!sel) {
      setSelectedMaidId(null);
      setSelectedPublicMaid(null);
      setAgency((p) => ({ ...p, maidId: "" }));
      return;
    }
    setMaid((p) => ({
      ...p,
      name: sel.name,
      referenceCode: sel.referenceCode ?? "",
      nationality: sel.nationality,
      workPermitNo: sel.workPermitNo,
      finNo: sel.finNo,
      passportNo: sel.passportNo,
      salary: sel.salary,
      numberOfOffDays: sel.numberOfOffDays,
      compensationNoOffday: sel.compensationNoOffday,
      nameOfReplacement: sel.nameOfReplacement,
      passportOfMaid: sel.passportOfMaid,
      photoDataUrl: sel.photoDataUrl ?? "",
      photoDataUrls: Array.isArray(sel.photoDataUrls) ? sel.photoDataUrls : [],
    }));
    setSelectedMaidId(sel.id ?? null);
    setAgency((p) => ({ ...p, maidId: String(sel.id ?? "") }));
  };

  useEffect(() => {
    if (!isNew || agency.contractDate) return;
    setAgency((p) => ({ ...p, contractDate: getTodayValue() }));
  }, [agency.contractDate, isNew]);

  useEffect(() => { setStep(isNew ? 1 : 3); }, [isNew, refCode]);

  useEffect(() => {
    if (!isNew) return;
    const load = async () => {
      try {
        setIsLoadingPublicMaids(true);
        setPublicMaidsError(null);
        const r = await fetch("/api/public-maids");
        const d = (await r.json().catch(() => ({}))) as { maids?: PublicMaidRecord[]; error?: string };
        if (!r.ok) throw new Error(d.error || "Failed to load public maids");
        setPublicMaids(Array.isArray(d.maids) ? d.maids.filter((m) => m?.isPublic !== false) : []);
      } catch (e) {
        setPublicMaidsError(e instanceof Error ? e.message : "Failed to load");
      } finally {
        setIsLoadingPublicMaids(false);
      }
    };
    void load();
  }, [isNew]);

  useEffect(() => {
    if (isNew) { setCategoryUploads({}); return; }
    if (!refCode) return;
    const load = async () => {
      try {
        const r = await fetch(`/api/employers/${encodeURIComponent(refCode)}`);
        const d = (await r.json().catch(() => ({}))) as {
          employer?: {
            maid?: Record<string, unknown>;
            agency?: Record<string, unknown>;
            employer?: Record<string, unknown>;
            spouse?: Record<string, unknown>;
            familyMembers?: Array<Record<string, unknown>>;
            documents?: Array<{ category?: string; fileUrl?: string; fileName?: string }>;
          };
        };
        if (!r.ok || !d.employer) return;
        if (d.employer.maid) setMaid(d.employer.maid as typeof maid);
        if (d.employer.agency) setAgency(d.employer.agency as typeof agency);
        if (d.employer.employer) setEmployer(d.employer.employer as typeof employer);
        if (d.employer.spouse) setSpouse(d.employer.spouse as typeof spouse);
        if (d.employer.familyMembers) setFamilyMembers(d.employer.familyMembers as typeof familyMembers);
        if (Array.isArray(d.employer.documents)) {
          setCategoryUploads(
            d.employer.documents.reduce<Record<string, UploadedFile[]>>((acc, doc) => {
              const cat = String(doc.category ?? "").trim();
              const url = String(doc.fileUrl ?? "").trim();
              const name = String(doc.fileName ?? "").trim();
              if (!cat || !url || !name) return acc;
              acc[cat] = [...(acc[cat] ?? []), { category: cat, url, name }];
              return acc;
            }, {})
          );
        } else {
          setCategoryUploads({});
        }
      } catch { /* no-op */ }
    };
    void load();
  }, [isNew, refCode]);

  useEffect(() => {
    const onScroll = () => setShowBackToTop(window.scrollY > 320);
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const scrollToTop = useCallback(() => window.scrollTo({ top: 0, behavior: "smooth" }), []);

  const goToNextStep = () => {
    if (step === 1) {
      if (!agency.contractDate.trim()) { toast.error("Contract date is required"); return; }
      if (!agency.serviceFee.trim()) { toast.error("Service fee is required"); return; }
      if (!agency.placementFee.trim()) { toast.error("Placement fee is required"); return; }
      if (!agency.agencyWitness.trim()) { toast.error("Agency witness is required"); return; }
    }
    if (step === 2 && !selectedMaidId) { toast.error("Please select a maid before continuing"); return; }
    setStep((p) => (p < 3 ? (p + 1) as 1 | 2 | 3 : p));
    scrollToTop();
  };
  const goToPreviousStep = () => { setStep((p) => (p > 1 ? (p - 1) as 1 | 2 | 3 : p)); scrollToTop(); };

  const submitEmployerContract = async () => {
    if (isSubmitting) return;
    if (isNew && !selectedMaidId) { toast.error("Please select a maid first"); return; }
    if (!employer.name.trim()) { toast.error("Employer name is required"); return; }
    try {
      setIsSubmitting(true);
      const body = isNew
        ? {
            case_reference_number: agency.caseReferenceNumber || null,
            contract_date: agency.contractDate,
            service_fee: agency.serviceFee,
            placement_fee: agency.placementFee,
            agency_witness: agency.agencyWitness,
            maid_id: selectedMaidId,
            refCode: null,
            maid,
            agency: { ...agency, maidId: selectedMaidId },
            employer,
            spouse,
            familyMembers,
          }
        : {
            refCode: isNew ? null : refCode,
            maid,
            agency,
            employer,
            spouse,
            familyMembers,
            documents: uploadedDocuments.map((f) => ({ category: f.category, fileUrl: f.url, fileName: f.name })),
          };
      const r = await fetch(isNew ? "/api/employment-contract" : "/api/employers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const d = (await r.json().catch(() => ({}))) as { error?: string; employer?: { refCode?: string } };
      if (!r.ok || !d.employer?.refCode) throw new Error(d.error || "Failed to submit employer contract");
      toast.success("Employer contract saved");
      navigate(adminPath("/employment-contracts"), { replace: true });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to submit employer contract");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDownloadForms = async () => {
    if (!uploadedDocuments.length) { toast.error("Upload at least one document first"); return; }
    try {
      const { skippedCount } = await downloadMergedEmployerPdf(uploadedDocuments, `employer-${!isNew && refCode ? refCode : "temp"}-forms.pdf`);
      if (skippedCount > 0) { toast.success(`Merged PDF downloaded. Skipped ${skippedCount} non-PDF file${skippedCount === 1 ? "" : "s"}.`); return; }
      toast.success("Merged PDF downloaded");
    } catch (e) { toast.error(e instanceof Error ? e.message : "Failed to download forms"); }
  };

const transformFamilyMembers = (members: typeof familyMembers) => 
  members.map(({ name, relationship, dateOfBirthDay: day, dateOfBirthMonth: month, dateOfBirthYear: year }) => ({
    name,
    type: ['Daughter', 'Son'].includes(relationship) ? 'child' : 'parent',
    relationship,
    dateOfBirth: `${day.padStart(2, '0')}-${month.padStart(2, '0')}-${year}`
  } as const));

const handlePrintForms = async () => {
    if (!uploadedDocuments.length) { toast.error("Upload at least one document first"); return; }
    try {
      const printResult = await printMergedEmployerPdf(uploadedDocuments, { maid, agency, employer, spouse, familyMembers: transformFamilyMembers(familyMembers), notificationDate });
      const { skippedCount } = printResult;
      if (skippedCount > 0) { toast.success(`Print preview opened. Skipped ${skippedCount} non-PDF file${skippedCount === 1 ? "" : "s"}.`); return; }
      toast.success("Print preview opened");
    } catch (e) { toast.error(e instanceof Error ? e.message : "Failed to print forms"); }
  };


  const ordinal = (n: number) => ["1st", "2nd", "3rd", "4th", "5th", "6th", "7th", "8th", "9th", "10th"][n - 1] ?? `${n}th`;

  const inp = "h-7 rounded border border-gray-300 bg-white px-2 py-0 text-xs focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400/30 disabled:bg-gray-50 disabled:text-gray-400";
  const sel = "h-7 text-xs";

  const nationalityOptions = [
    "Singaporean", "Singapore", "Indian", "Filipino", "Indonesian",
    "Myanmar", "Sri Lankan", "Bangladeshi", "Malaysian", "Chinese",
  ];

  const incomeOptions = [
    "$1,000 - $1,499",
    "$1,500 - $1,999",
    "$2,000 - $2,499",
    "$2,500 - $2,999",
    "$3,000 - $3,499",
    "$3,500 - $3,999",
    "$4,000 - $4,499",
    "$4,500 - $4,999",
    "$5,000 - $5,499",
    "$5,500 - $5,999",
    "$6,000 and above",
  ];

  return (
    <>
      

      <div className="page-container max-w-4xl py-4 text-sm">

        <div className="mb-1">
          <Link to={adminPath("/employment-contracts")} className="text-xs text-blue-600 hover:underline">← Back to Employer Listing</Link>
        </div>
        <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
          <div>
            <h2 className="text-base font-bold text-gray-800">{isNew ? "Add a New Employer" : "Edit an Existing Employer"}</h2>
            {!isNew && <p className="text-xs text-gray-500">Reference Number: <span className="font-semibold text-[#4a7bb5]">{refCode || "—"}</span></p>}
          </div>
          {(!isNew || step === 3) && (
            <Button size="sm" onClick={() => void submitEmployerContract()} disabled={isSubmitting} className="hidden sm:flex items-center gap-1.5">
              {isSubmitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
              {isNew ? "Generate Contract" : "Save Changes"}
            </Button>
          )}
        </div>

        {isNew && (
          <div className="mb-3 flex flex-wrap gap-2">
            {[{ id: 1, label: "1. Contract Setup" }, { id: 2, label: "2. Select Maid" }, { id: 3, label: "3. Employer Details" }].map((s) => (
              <div
                key={s.id}
                className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                  step === s.id ? "border-[#4a7bb5] bg-[#4a7bb5] text-white"
                  : step > s.id ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                  : "border-gray-200 bg-white text-gray-500"
                }`}
              >
                {s.label}
              </div>
            ))}
          </div>
        )}

        {isNew && step === 1 && (
          <>
            <SectionHeader title="Employer Contract Setup" />
            <SectionBody>
              <dl className="space-y-1">
                <Field label="Case Reference Number">
                  <Input className={inp} value={displayedCaseRef} readOnly />
                </Field>
                <Field label="Contract Date" required>
                  <Input type="date" className={`${inp} max-w-[160px]`} value={agency.contractDate} onChange={(e) => setAgency({ ...agency, contractDate: e.target.value })} />
                </Field>
                <Field label="Service Fee (S$)" required>
                  <Input className={`${inp} max-w-[140px]`} value={agency.serviceFee} onChange={(e) => setAgency({ ...agency, serviceFee: e.target.value })} placeholder="0.00" />
                </Field>
                <Field label="Placement Fee (Maid Loan) (S$)" required>
                  <Input className={`${inp} max-w-[140px]`} value={agency.placementFee} onChange={(e) => setAgency({ ...agency, placementFee: e.target.value })} placeholder="0.00" />
                </Field>
                <Field label="Agency Witness" required>
                  <Select value={agency.agencyWitness || undefined} onValueChange={(v) => setAgency({ ...agency, agencyWitness: v })}>
                    <SelectTrigger className={sel}><SelectValue placeholder="Select witness" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Balamurugan S/O Subramaniam (R1218275)">Balamurugan S/O Subramaniam (R1218275)</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
              </dl>
            </SectionBody>
            <div className="mt-3 flex flex-wrap justify-between gap-2">
              <Button variant="outline" size="sm" onClick={() => navigate(adminPath("/employment-contracts"))}>Back to Employer Listing</Button>
              <Button size="sm" onClick={goToNextStep}>Next →</Button>
            </div>
          </>
        )}

        {isNew && step === 2 && (
          <>
            <SectionHeader title="The Maid Employed" />
            <SectionBody>
              <div className="space-y-2">
                <Field label="Search Maid">
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
                    <Input
                      className={`${inp} pl-7`}
                      value={maidSearch}
                      onChange={(e) => setMaidSearch(e.target.value)}
                      placeholder="Search by name or reference code"
                    />
                  </div>
                </Field>
                {publicMaidsError && <p className="pl-[226px] text-xs text-rose-500">{publicMaidsError}</p>}
                <div className="overflow-x-auto rounded border border-[#c5d3e8]">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-[#4a7bb5]/10">
                        <th className="px-3 py-2 text-left font-semibold text-gray-600">Reference</th>
                        <th className="px-3 py-2 text-left font-semibold text-gray-600">Name</th>
                        <th className="px-3 py-2 text-left font-semibold text-gray-600">Nationality</th>
                        <th className="px-3 py-2 text-left font-semibold text-gray-600">Passport</th>
                        <th className="px-3 py-2 text-left font-semibold text-gray-600">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {isLoadingPublicMaids ? (
                        <tr><td colSpan={5} className="px-3 py-5 text-center text-gray-400">Loading maids…</td></tr>
                      ) : filteredPublicMaids.length === 0 ? (
                        <tr><td colSpan={5} className="px-3 py-5 text-center text-gray-400">No public maids found.</td></tr>
                      ) : filteredPublicMaids.map((pm) => {
                        const passportNo = String(pm.agencyContact?.passportNo ?? "");
                        const isSelected = selectedMaidId === pm.id;
                        return (
                          <tr key={String(pm.id)} className={isSelected ? "bg-blue-50" : "bg-white"}>
                            <td className="border-t border-gray-100 px-3 py-2">{pm.referenceCode}</td>
                            <td className="border-t border-gray-100 px-3 py-2 font-medium text-gray-800">{pm.fullName}</td>
                            <td className="border-t border-gray-100 px-3 py-2">{pm.nationality || "—"}</td>
                            <td className="border-t border-gray-100 px-3 py-2">{passportNo || "—"}</td>
                            <td className="border-t border-gray-100 px-3 py-2">
                              <Button
                                type="button" size="sm" variant={isSelected ? "default" : "outline"} className="h-6 px-2 text-xs"
                                onClick={() => {
                                  setSelectedPublicMaid(pm);
                                  handleMaidSelect({
                                    id: pm.id,
                                    referenceCode: pm.referenceCode,
                                    photoDataUrl: pm.photoDataUrl,
                                    photoDataUrls: pm.photoDataUrls,
                                    name: pm.fullName,
                                    nationality: String(pm.nationality || ""),
                                    workPermitNo: "",
                                    finNo: "",
                                    passportNo,
                                    salary: String(pm.introduction?.expectedSalary || ""),
                                    numberOfOffDays: "",
                                    compensationNoOffday: "0",
                                    nameOfReplacement: "",
                                    passportOfMaid: "",
                                  });
                                }}
                              >
                                {isSelected ? "✓ Selected" : "Select"}
                              </Button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </SectionBody>
            <div className="mt-3 flex flex-wrap justify-between gap-2">
              <Button variant="outline" size="sm" onClick={goToPreviousStep}>← Back</Button>
              <Button size="sm" onClick={goToNextStep} disabled={!selectedMaidId}>Next →</Button>
            </div>
          </>
        )}

        {(!isNew || step === 3) && (
          <>
            {isNew && (
              <>
                <SectionHeader title="Selected Maid" />
                <SectionBody>
                  <div className="grid grid-cols-[1fr_130px] gap-4">
                    <dl className="space-y-1">
                      <Field label="Name"><Input className={`${inp} bg-gray-50`} value={selectedPublicMaid?.fullName || maid.name} readOnly /></Field>
                      <Field label="Reference Code"><Input className={`${inp} bg-gray-50`} value={selectedPublicMaid?.referenceCode || ""} readOnly /></Field>
                      <Field label="Nationality"><Input className={`${inp} bg-gray-50`} value={selectedPublicMaid?.nationality || maid.nationality} readOnly /></Field>
                      <Field label="Passport / FIN"><Input className={`${inp} bg-gray-50`} value={maid.passportNo || maid.finNo} readOnly /></Field>
                    </dl>
                    <div className="overflow-hidden rounded border border-gray-300 bg-gray-100" style={{ width: 120, height: 150 }}>
                      {((Array.isArray(maid.photoDataUrls) && maid.photoDataUrls[0]) || maid.photoDataUrl)
                        ? <img src={(Array.isArray(maid.photoDataUrls) && maid.photoDataUrls[0]) || maid.photoDataUrl} alt="Selected maid" className="h-full w-full object-cover" />
                        : <div className="flex h-full w-full flex-col items-center justify-center text-gray-300"><User className="h-10 w-10" /><span className="text-[10px]">No photo</span></div>
                      }
                    </div>
                  </div>
                </SectionBody>
              </>
            )}

            {!isNew && (
              <>
                <SectionHeader title="The Maid Employed" />
                <SectionBody>
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <label className="text-xs font-semibold text-rose-600">Reference Number:</label>
                    <Input
                      className={`${inp} w-32`}
                      value={agency.caseReferenceNumber}
                      onChange={(e) => setAgency({ ...agency, caseReferenceNumber: e.target.value })}
                      placeholder="e.g. 06583"
                    />
                  </div>
                  <div className="mb-3 flex gap-2">
                    <Input
                      className={`${inp} flex-1`}
                      value={maidSearch}
                      onChange={(e) => setMaidSearch(e.target.value)}
                      placeholder="Please search the Name or Ref. Code of the Maid hired."
                    />
                    <button
                      type="button"
                      className="flex items-center gap-1.5 rounded bg-[#4a7bb5] px-3 py-1 text-xs font-semibold text-white hover:bg-[#3a6aa5]"
                      onClick={() => { /* trigger search */ }}
                    >
                      <Search className="h-3 w-3" />
                      SEARCH MAID
                    </button>
                  </div>
                  <dl className="space-y-1">
                    <Field label="Maid's Name">
                      <Input className={inp} value={maid.name} onChange={(e) => setMaid({ ...maid, name: e.target.value })} placeholder="Full name as per passport" />
                    </Field>
                    <Field label="Maid's Nationality">
                      <Select value={maid.nationality || undefined} onValueChange={(v) => setMaid({ ...maid, nationality: v })}>
                        <SelectTrigger className={`${sel} w-44`}><SelectValue placeholder="Select nationality" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Filipino maid">Filipino maid</SelectItem>
                          <SelectItem value="Indian maid">Indian maid</SelectItem>
                          <SelectItem value="Indonesian maid">Indonesian maid</SelectItem>
                          <SelectItem value="Myanmar maid">Myanmar maid</SelectItem>
                          <SelectItem value="Sri Lankan maid">Sri Lankan maid</SelectItem>
                        </SelectContent>
                      </Select>
                    </Field>
                    <Field label="Maid's Work Permit No.">
                      <Input className={inp} value={maid.workPermitNo} onChange={(e) => setMaid({ ...maid, workPermitNo: e.target.value })} placeholder="e.g. G1234567P" />
                    </Field>
                    <Field label="Maid's FIN No.">
                      <Input className={inp} value={maid.finNo} onChange={(e) => setMaid({ ...maid, finNo: e.target.value })} placeholder="e.g. G1234567P" />
                    </Field>
                    <Field label="Maid's Passport No.">
                      <Input className={inp} value={maid.passportNo} onChange={(e) => setMaid({ ...maid, passportNo: e.target.value })} placeholder="Passport number" />
                    </Field>
                    <Field label="Salary">
                      <Input className={`${inp} max-w-[200px]`} value={maid.salary} onChange={(e) => setMaid({ ...maid, salary: e.target.value })} placeholder="e.g. 800" />
                    </Field>
                    <Field label="Number of Off-days">
                      <Input className={`${inp} max-w-[200px]`} value={maid.numberOfOffDays} onChange={(e) => setMaid({ ...maid, numberOfOffDays: e.target.value })} placeholder="e.g. 4" />
                    </Field>
                    <Field label="Compensation for No Offday">
                      <Input className={`${inp} max-w-[200px]`} value={maid.compensationNoOffday} onChange={(e) => setMaid({ ...maid, compensationNoOffday: e.target.value })} placeholder="0" />
                    </Field>
                    <Field label="Name of Maid Replaced">
                      <Input className={inp} value={maid.nameOfReplacement} onChange={(e) => setMaid({ ...maid, nameOfReplacement: e.target.value })} placeholder="Previous maid's name (if applicable)" />
                    </Field>
                    <Field label="Passport of Maid Replaced">
                      <Input className={inp} value={maid.passportOfMaid} onChange={(e) => setMaid({ ...maid, passportOfMaid: e.target.value })} placeholder="Previous maid's passport no." />
                    </Field>
                  </dl>
                </SectionBody>
              </>
            )}

            <SectionHeader title="Agency" />
            <SectionBody>
              <dl className="space-y-1">
                <Field label="Contract Date">
                  <Input className={`${inp} max-w-[160px]`} value={agency.contractDate} onChange={(e) => setAgency({ ...agency, contractDate: e.target.value })} placeholder="e.g. 13-04-2026" />
                </Field>
                <Field label="Date Of Employment">
                  <div className="flex flex-wrap items-center gap-1">
                    <Select value={agency.dateOfEmploymentDay || undefined} onValueChange={(v) => setAgency({ ...agency, dateOfEmploymentDay: v })}>
                      <SelectTrigger className={`${sel} w-16`}><SelectValue placeholder="01" /></SelectTrigger>
                      <SelectContent>{Array.from({ length: 31 }, (_, i) => <SelectItem key={i} value={String(i + 1).padStart(2, "0")}>{String(i + 1).padStart(2, "0")}</SelectItem>)}</SelectContent>
                    </Select>
                    <Select value={agency.dateOfEmploymentMonth || undefined} onValueChange={(v) => setAgency({ ...agency, dateOfEmploymentMonth: v })}>
                      <SelectTrigger className={`${sel} w-16`}><SelectValue placeholder="01" /></SelectTrigger>
                      <SelectContent>{Array.from({ length: 12 }, (_, i) => <SelectItem key={i} value={String(i + 1).padStart(2, "0")}>{String(i + 1).padStart(2, "0")}</SelectItem>)}</SelectContent>
                    </Select>
                    <Select value={agency.dateOfEmploymentYear || undefined} onValueChange={(v) => setAgency({ ...agency, dateOfEmploymentYear: v })}>
                      <SelectTrigger className={`${sel} w-20`}><SelectValue placeholder="2014" /></SelectTrigger>
                      <SelectContent>{Array.from({ length: 20 }, (_, i) => <SelectItem key={i} value={String(2010 + i)}>{2010 + i}</SelectItem>)}</SelectContent>
                    </Select>
                    <span className="text-[10px] text-gray-400">(day-month-year)</span>
                  </div>
                </Field>

                <div className="my-1 rounded border border-[#b8cde8] bg-[#dce8f5] px-3 py-2 space-y-1">
                  <Field label="Invoice Number">
                    <Input className={`${inp} max-w-[140px] bg-white`} value={agency.invoiceNumber} onChange={(e) => setAgency({ ...agency, invoiceNumber: e.target.value })} placeholder="1" />
                  </Field>
                  <Field label="Service Fee">
                    <Input className={`${inp} max-w-[140px] bg-white`} value={agency.serviceFee} onChange={(e) => setAgency({ ...agency, serviceFee: e.target.value })} placeholder="1" />
                  </Field>
                  <Field label="Deposit">
                    <Input className={`${inp} max-w-[140px] bg-white`} value={agency.deposit} onChange={(e) => setAgency({ ...agency, deposit: e.target.value })} placeholder="0" />
                  </Field>
                  <Field label="Settling In Program (SIP) Fee">
                    <Input className={`${inp} max-w-[140px] bg-white`} value={agency.sipFee} onChange={(e) => setAgency({ ...agency, sipFee: e.target.value })} placeholder="1" />
                  </Field>
                  <Field label="Medical Fee">
                    <Input className={`${inp} max-w-[140px] bg-white`} value={agency.medicalFee} onChange={(e) => setAgency({ ...agency, medicalFee: e.target.value })} placeholder="1" />
                  </Field>
                  <Field label="Transport Fee">
                    <Input className={`${inp} max-w-[140px] bg-white`} value={agency.transportFee} onChange={(e) => setAgency({ ...agency, transportFee: e.target.value })} placeholder="1" />
                  </Field>
                  <Field label="Document Fee">
                    <Input className={`${inp} max-w-[140px] bg-white`} value={agency.documentFee} onChange={(e) => setAgency({ ...agency, documentFee: e.target.value })} placeholder="1" />
                  </Field>
                </div>

                <Field label="Placement Fee (Maid Loan)">
                  <Input className={`${inp} max-w-[140px]`} value={agency.placementFee} onChange={(e) => setAgency({ ...agency, placementFee: e.target.value })} placeholder="0" />
                </Field>
                <Field label="Insurance Fee">
                  <Input className={`${inp} max-w-[140px]`} value={agency.insuranceFee} onChange={(e) => setAgency({ ...agency, insuranceFee: e.target.value })} placeholder="0.00" />
                </Field>
                <Field label="Agency Witness">
                  <Select value={agency.agencyWitness || undefined} onValueChange={(v) => setAgency({ ...agency, agencyWitness: v })}>
                    <SelectTrigger className={sel}><SelectValue placeholder="Select witness" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Balamurugan S/O Subramaniam (R1218275)">Balamurugan S/O Subramaniam (R1218275)</SelectItem>
                      <SelectItem value="Rahimunisha Binti Muhammadhan (R1107570)">Rahimunisha Binti Muhammadhan (R1107570)</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
              </dl>
            </SectionBody>

            <SectionHeader title="Employer" />
            <SectionBody>
              <dl className="space-y-1">
                <Field label="Name" required>
                  <Input className={inp} value={employer.name} onChange={(e) => setEmployer({ ...employer, name: e.target.value })} placeholder="Employer's full legal name" />
                </Field>
                <Field label="Gender">
                  <RadioGroup name="emp-gender" options={["Male", "Female"]} value={employer.gender} onChange={(v) => setEmployer({ ...employer, gender: v })} />
                </Field>
                <Field label="Date Of Birth">
                  <DatePicker
                    day={employer.dateOfBirthDay} month={employer.dateOfBirthMonth} year={employer.dateOfBirthYear}
                    onDay={(v) => setEmployer({ ...employer, dateOfBirthDay: v })}
                    onMonth={(v) => setEmployer({ ...employer, dateOfBirthMonth: v })}
                    onYear={(v) => setEmployer({ ...employer, dateOfBirthYear: v })}
                  />
                </Field>
                <Field label="Nationality">
                  <Select value={employer.nationality || undefined} onValueChange={(v) => setEmployer({ ...employer, nationality: v })}>
                    <SelectTrigger className={`${sel} w-48`}><SelectValue placeholder="Select nationality" /></SelectTrigger>
                    <SelectContent>
                      {nationalityOptions.map((n) => <SelectItem key={n} value={n}>{n}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Residential Status">
                  <Select value={employer.residentialStatus || undefined} onValueChange={(v) => setEmployer({ ...employer, residentialStatus: v })}>
                    <SelectTrigger className={`${sel} w-56`}><SelectValue placeholder="Select status" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Singapore Citizen">Singapore Citizen</SelectItem>
                      <SelectItem value="Singapore Permanent Resident">Singapore Permanent Resident</SelectItem>
                      <SelectItem value="Employment Pass">Employment Pass</SelectItem>
                      <SelectItem value="S Pass">S Pass</SelectItem>
                      <SelectItem value="Work Permit">Work Permit</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="NRIC / FIN / PP">
                  <Input className={`${inp} max-w-[180px]`} value={employer.nric} onChange={(e) => setEmployer({ ...employer, nric: e.target.value })} placeholder="e.g. S1234567A" />
                </Field>
                <Field label="Address (Line 1)">
                  <Input className={inp} value={employer.addressLine1} onChange={(e) => setEmployer({ ...employer, addressLine1: e.target.value })} placeholder="Street address, unit no." />
                </Field>
                <Field label="Address (Line 2)">
                  <Input className={inp} value={employer.addressLine2} onChange={(e) => setEmployer({ ...employer, addressLine2: e.target.value })} placeholder="Block / building name (optional)" />
                </Field>
                <Field label="Postal Code">
                  <Input className={`${inp} max-w-[120px]`} value={employer.postalCode} onChange={(e) => setEmployer({ ...employer, postalCode: e.target.value })} placeholder="6-digit postal code" />
                </Field>
                <Field label="Type Of Residence">
                  <div className="flex flex-wrap gap-1.5">
                    {["HDB 2-ROOM", "HDB 3-ROOM", "HDB 4-ROOM", "HDB 5-ROOM", "HDB Executive", "Condo", "Terrace", "Bungalow"].map((t) => (
                      <label
                        key={t}
                        className={`flex cursor-pointer items-center gap-1 text-xs ${employer.typeOfResidence === t ? "font-semibold text-blue-700" : "text-gray-600"}`}
                      >
                        <input
                          type="radio"
                          name="residence"
                          checked={employer.typeOfResidence === t}
                          onChange={() => setEmployer({ ...employer, typeOfResidence: t })}
                          className="h-3 w-3 accent-blue-600"
                        />
                        {t}
                      </label>
                    ))}
                  </div>
                </Field>
                <Field label="Occupation">
                  <Input className={inp} value={employer.occupation} onChange={(e) => setEmployer({ ...employer, occupation: e.target.value })} placeholder="e.g. Manager" />
                </Field>
                <Field label="Name Of Company">
                  <Input className={inp} value={employer.company} onChange={(e) => setEmployer({ ...employer, company: e.target.value })} placeholder="Company name" />
                </Field>
                <Field label="E-mail Address">
                  <Input type="email" className={inp} value={employer.email} onChange={(e) => setEmployer({ ...employer, email: e.target.value })} placeholder="email@example.com" />
                </Field>
                <Field label="Residential Phone">
                  <Input className={`${inp} max-w-[200px]`} value={employer.residentialPhone} onChange={(e) => setEmployer({ ...employer, residentialPhone: e.target.value })} placeholder="e.g. 64643212" />
                </Field>
                <Field label="Handphone Number">
                  <Input className={`${inp} max-w-[200px]`} value={employer.mobileNumber} onChange={(e) => setEmployer({ ...employer, mobileNumber: e.target.value })} placeholder="e.g. 91234567" />
                </Field>
                <Field label="Monthly Combined Income">
                  <Select value={employer.monthlyContribution || undefined} onValueChange={(v) => setEmployer({ ...employer, monthlyContribution: v })}>
                    <SelectTrigger className={`${sel} w-48`}><SelectValue placeholder="-- Select --" /></SelectTrigger>
                    <SelectContent>
                      {incomeOptions.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Notification of Assessment" hint="Based on Annual Income or Bank Statement">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Select value={notificationDate.year || undefined} onValueChange={(v) => setNotificationDate({ ...notificationDate, year: v })}>
                      <SelectTrigger className={`${sel} w-24`}><SelectValue placeholder="Year" /></SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: 20 }, (_, i) => (
                          <SelectItem key={i} value={String(2010 + i)}>{2010 + i}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select value={notificationDate.month || undefined} onValueChange={(v) => setNotificationDate({ ...notificationDate, month: v })}>
                      <SelectTrigger className={`${sel} w-36`}><SelectValue placeholder="-- Select --" /></SelectTrigger>
                      <SelectContent>
                        {["JANUARY","FEBRUARY","MARCH","APRIL","MAY","JUNE","JULY","AUGUST","SEPTEMBER","OCTOBER","NOVEMBER","DECEMBER"].map((m) => (
                          <SelectItem key={m} value={m}>{m}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </Field>
                <Field label="Existing Employer">
                  <Input className={inp} value={employer.existingEmployer} onChange={(e) => setEmployer({ ...employer, existingEmployer: e.target.value })} placeholder="Previous employer name (if applicable)" />
                </Field>
                <Field label="Existing Employer's NRIC">
                  <Input className={inp} value={employer.existingEmployerNric} onChange={(e) => setEmployer({ ...employer, existingEmployerNric: e.target.value })} placeholder="e.g. S1234567A" />
                </Field>
              </dl>
            </SectionBody>

            <SectionHeader title="Spouse" />
            <SectionBody>
              <dl className="space-y-1">
                <Field label="Spouse's Name">
                  <Input className={inp} value={spouse.name} onChange={(e) => setSpouse({ ...spouse, name: e.target.value })} placeholder="Full legal name" />
                </Field>
                <Field label="Gender">
                  <RadioGroup name="sp-gender" options={["Male", "Female"]} value={spouse.gender} onChange={(v) => setSpouse({ ...spouse, gender: v })} />
                </Field>
                <Field label="Date Of Birth">
                  <DatePicker
                    day={spouse.dateOfBirthDay} month={spouse.dateOfBirthMonth} year={spouse.dateOfBirthYear}
                    onDay={(v) => setSpouse({ ...spouse, dateOfBirthDay: v })}
                    onMonth={(v) => setSpouse({ ...spouse, dateOfBirthMonth: v })}
                    onYear={(v) => setSpouse({ ...spouse, dateOfBirthYear: v })}
                  />
                </Field>
                <Field label="Nationality">
                  <Select value={spouse.nationality || undefined} onValueChange={(v) => setSpouse({ ...spouse, nationality: v })}>
                    <SelectTrigger className={`${sel} w-48`}><SelectValue placeholder="Select nationality" /></SelectTrigger>
                    <SelectContent>
                      {nationalityOptions.map((n) => <SelectItem key={n} value={n}>{n}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Residential Status">
                  <Select value={spouse.residentialStatus || undefined} onValueChange={(v) => setSpouse({ ...spouse, residentialStatus: v })}>
                    <SelectTrigger className={`${sel} w-56`}><SelectValue placeholder="Select status" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Singapore Citizen">Singapore Citizen</SelectItem>
                      <SelectItem value="Singapore Permanent Resident">Singapore Permanent Resident</SelectItem>
                      <SelectItem value="Employment Pass">Employment Pass</SelectItem>
                      <SelectItem value="S Pass">S Pass</SelectItem>
                      <SelectItem value="Work Permit">Work Permit</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Spouse's NRIC / FIN / PP">
                  <Input className={`${inp} max-w-[180px]`} value={spouse.nric} onChange={(e) => setSpouse({ ...spouse, nric: e.target.value })} placeholder="e.g. S1234567B" />
                </Field>
                <Field label="Occupation">
                  <Input className={inp} value={spouse.occupation} onChange={(e) => setSpouse({ ...spouse, occupation: e.target.value })} placeholder="e.g. Housewife" />
                </Field>
                <Field label="Name Of Company">
                  <Input className={inp} value={spouse.company} onChange={(e) => setSpouse({ ...spouse, company: e.target.value })} placeholder="Company name (if applicable)" />
                </Field>
              </dl>
            </SectionBody>

            {familyMembers.map((fm, idx) => (
              <div key={idx}>
                <div className="mt-4 mb-0 rounded-t-sm bg-[#4a7bb5] px-3 py-1.5 flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-white">{ordinal(idx + 1)} Family Member</h3>
                  {familyMembers.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeFamilyMember(idx)}
                      className="flex items-center gap-1 rounded px-1.5 py-0.5 text-white/70 hover:bg-white/20 hover:text-white transition-colors"
                      title={`Remove ${ordinal(idx + 1)} family member`}
                    >
                      <X className="h-3.5 w-3.5" />
                      <span className="text-[10px] font-medium">Remove</span>
                    </button>
                  )}
                </div>
                <SectionBody>
                  <dl className="space-y-1">
                    <Field label="Name">
                      <Input
                        className={inp}
                        value={fm.name}
                        onChange={(e) => updateFamilyMember(idx, "name", e.target.value)}
                        placeholder="Full name"
                      />
                    </Field>
                    <Field label="Relationship">
                      <div className="space-y-1 pt-0.5">
                        <div className="flex gap-4">
                          {["Daughter", "Son"].map((opt) => (
                            <label key={opt} className="flex cursor-pointer items-center gap-1.5 text-xs text-gray-700">
                              <input
                                type="radio"
                                name={`fm-type-${idx}`}
                                checked={fm.relationship === opt}
                                onChange={() => updateFamilyMember(idx, "relationship", opt)}
                                className="h-3 w-3 accent-blue-600"
                              />
                              {opt}
                            </label>
                          ))}
                        </div>
                        <div className="flex gap-4">
                          {["Father", "Mother"].map((opt) => (
                            <label key={opt} className="flex cursor-pointer items-center gap-1.5 text-xs text-gray-700">
                              <input
                                type="radio"
                                name={`fm-type-${idx}`}
                                checked={fm.relationship === opt}
                                onChange={() => updateFamilyMember(idx, "relationship", opt)}
                                className="h-3 w-3 accent-blue-600"
                              />
                              {opt}
                            </label>
                          ))}
                        </div>
                        <div className="flex gap-4">
                          {["Father-in-Law", "Mother-in-Law"].map((opt) => (
                            <label key={opt} className="flex cursor-pointer items-center gap-1.5 text-xs text-gray-700">
                              <input
                                type="radio"
                                name={`fm-type-${idx}`}
                                checked={fm.relationship === opt}
                                onChange={() => updateFamilyMember(idx, "relationship", opt)}
                                className="h-3 w-3 accent-blue-600"
                              />
                              {opt}
                            </label>
                          ))}
                        </div>
                      </div>
                    </Field>
                    <Field label="Birth Cert. / IC / FIN">
                      <Input
                        className={inp}
                        value={fm.birthCertIcFin}
                        onChange={(e) => updateFamilyMember(idx, "birthCertIcFin", e.target.value)}
                        placeholder="Birth cert / IC / FIN number"
                      />
                    </Field>
                    <Field label="Date Of Birth">
                      <DatePicker
                        day={fm.dateOfBirthDay}
                        month={fm.dateOfBirthMonth}
                        year={fm.dateOfBirthYear}
                        onDay={(v) => updateFamilyMember(idx, "dateOfBirthDay", v)}
                        onMonth={(v) => updateFamilyMember(idx, "dateOfBirthMonth", v)}
                        onYear={(v) => updateFamilyMember(idx, "dateOfBirthYear", v)}
                      />
                    </Field>
                  </dl>
                </SectionBody>
              </div>
            ))}

            <button
              type="button"
              onClick={addFamilyMember}
              className="mt-2 flex w-full items-center justify-center gap-1.5 rounded border border-dashed border-[#4a7bb5] bg-white px-3 py-2 text-xs font-medium text-[#4a7bb5] transition-colors hover:bg-blue-50 hover:border-[#3a6aa5]"
            >
              <Plus className="h-3.5 w-3.5" />
              Add Family Member
            </button>

            <div className="mt-4 flex flex-wrap items-center justify-center gap-2 rounded border border-[#c5d3e8] bg-gray-50 px-4 py-3">
              {isNew && <Button variant="outline" size="sm" onClick={goToPreviousStep}>← Back</Button>}
              <Button size="sm" onClick={() => void submitEmployerContract()} disabled={isSubmitting} className="flex items-center gap-1.5">
                {isSubmitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                {isNew ? "Generate Contract" : "Submit & Generate Forms"}
              </Button>
              {!isNew && (
                <>
                  <Button variant="outline" size="sm" onClick={() => void handleDownloadForms()} className="flex items-center gap-1.5">
                    <Download className="h-3.5 w-3.5" />Download Forms and Print
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => void handlePrintForms()} className="flex items-center gap-1.5">
                    <Eye className="h-3.5 w-3.5" />Print Preview
                  </Button>
                </>
              )}
            </div>
            <p className="mt-1 text-center text-[10px] text-gray-400">The PDF Forms are for demo purposes only. Please approach admin for customization works.</p>

            {!isNew && (
              <>
                <div className="mt-1 flex items-center justify-end">
                  <button
                    type="button"
                    onClick={() => setBulkUploadOpen(true)}
                    className="mt-3 flex items-center gap-1.5 rounded border border-[#4a7bb5] bg-[#4a7bb5] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#3a6aa5]"
                  >
                    <Upload className="h-3 w-3" />Bulk Upload
                  </button>
                </div>
                {GENERATED_FORMS.map((cat) => (
                  <div key={cat.category}>
                    <SectionHeader title={cat.category} />
                    <SectionBody>
                      <CategoryFileUpload
                        category={cat.category}
                        hasTemplate={cat.hasTemplate}
                        refCode={refCode || "temp"}
                        uploads={categoryUploads[cat.category] ?? []}
                        onUpload={(files) => updateCategoryUploads(cat.category, files)}
                      />
                    </SectionBody>
                  </div>
                ))}
                <BulkUploadModal
                  open={bulkUploadOpen}
                  onClose={() => setBulkUploadOpen(false)}
                  refCode={refCode || "temp"}
                  onUploadComplete={handleBulkUploadComplete}
                />
              </>
            )}
          </>
        )}
      </div>

      {showBackToTop && (
        <button
          type="button"
          onClick={scrollToTop}
          className="fixed bottom-4 right-4 z-50 flex items-center gap-1.5 rounded-full bg-[#4a7bb5] px-4 py-2 text-xs font-semibold text-white shadow-lg transition hover:bg-[#3a6aa5]"
        >
          <ArrowUp className="h-3.5 w-3.5" />Top
        </button>
      )}
    </>
  );
};

export default EditEmployer;