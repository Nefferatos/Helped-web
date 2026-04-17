import { useEffect, useMemo, useState, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/components/ui/sonner";
import {
  Eye,
  Download,
  Upload,
  Search,
  X,
  Check,
  Plus,
  User,
  Loader2,
  ArrowUp,
  FileText,
  FileCheck2,
  Printer,
} from "lucide-react";
import { downloadMergedEmployerPdf, printMergedEmployerPdf } from "@/lib/employerPdf";
import { adminPath } from "@/lib/routes";
import type { MaidProfile } from "@/lib/maids";

/* ─────────────────── types ─────────────────── */
type UploadedFile = { name: string; url: string; category: string };

type EmployerContractRecord = {
  maid?: Record<string, unknown>;
  agency?: Record<string, unknown>;
  employer?: Record<string, unknown>;
  spouse?: Record<string, unknown>;
  familyMembers?: Array<Record<string, unknown>>;
  notificationDate?: Record<string, unknown>;
  documents?: Array<{ category?: string; fileUrl?: string; fileName?: string }>;
};

type MaidSearchResult = Pick<
  MaidProfile,
  | "id"
  | "referenceCode"
  | "fullName"
  | "nationality"
  | "introduction"
  | "skillsPreferences"
  | "photoDataUrl"
  | "photoDataUrls"
>;

/* ─────────────────── constants ─────────────────── */
const GENERATED_FORMS: { category: string; hasTemplate: boolean }[] = [
  { category: "Maid Biodata Form", hasTemplate: true },
  { category: "Official Receipt", hasTemplate: false },
  { category: "Standard Contract Between Employer and Employment Agency", hasTemplate: true },
  { category: "Form A", hasTemplate: true },
  { category: "Form C", hasTemplate: true },
  { category: "Salary Schedule Form", hasTemplate: true },
  { category: "Employee Income Tax Declaration", hasTemplate: true },
  { category: "Insurance Forms", hasTemplate: true },
  { category: "Standard Contract Between Maid and Employer", hasTemplate: true },
  { category: "Rest Day Agreement Form Between Maid and Employer", hasTemplate: true },
  { category: "Safety Agreement Form Between Maid And Employer", hasTemplate: true },
  { category: "Handing and Taking Over Checklist", hasTemplate: true },
  { category: "Form S10", hasTemplate: false },
];

const CATEGORY_NAMES = GENERATED_FORMS.map((f) => f.category);

const NATIONALITY_OPTIONS = [
  "Singaporean", "Singapore", "Indian", "Filipino", "Indonesian",
  "Myanmar", "Sri Lankan", "Bangladeshi", "Malaysian", "Chinese",
];

const INCOME_OPTIONS = [
  "$1,000 - $1,499", "$1,500 - $1,999", "$2,000 - $2,499", "$2,500 - $2,999",
  "$3,000 - $3,499", "$3,500 - $3,999", "$4,000 - $4,499", "$4,500 - $4,999",
  "$5,000 - $5,499", "$5,500 - $5,999", "$6,000 and above",
];

const MONTHS = ["JANUARY","FEBRUARY","MARCH","APRIL","MAY","JUNE",
  "JULY","AUGUST","SEPTEMBER","OCTOBER","NOVEMBER","DECEMBER"];

/* ─────────────────── helpers ─────────────────── */
const toText = (v: unknown) => String(v ?? "").trim();

const getPrimaryPhoto = (maid: Record<string, unknown>) => {
  const arr = Array.isArray(maid.photoDataUrls)
    ? maid.photoDataUrls.filter((v): v is string => typeof v === "string" && v.trim().length > 0)
    : [];
  return arr[0] || toText(maid.photoDataUrl);
};

const todayIsoDate = () => new Date().toISOString().slice(0, 10);

const fillIfEmpty = (current: string, next: string) => (current.trim() ? current : next);

/* ─────────────────── shared primitives ─────────────────── */
const SectionHeader = ({ title, children }: { title: string; children?: React.ReactNode }) => (
  <div className="mt-4 mb-0 rounded-t-sm bg-[#4a7bb5] px-3 py-1.5 flex items-center justify-between">
    <h3 className="text-sm font-semibold text-white">{title}</h3>
    {children}
  </div>
);

const SectionBody = ({
  children,
  disabled = false,
}: {
  children: React.ReactNode;
  disabled?: boolean;
}) => (
  <div className="rounded-b-sm border border-[#c5d3e8] bg-white px-4 py-3">
    <fieldset disabled={disabled} className={disabled ? "opacity-90" : undefined}>
      {children}
    </fieldset>
  </div>
);

const Field = ({
  label, required, hint, children,
}: {
  label: string; required?: boolean; hint?: string; children: React.ReactNode;
}) => (
  <div className="grid grid-cols-[220px_1fr] items-start gap-x-2 py-0.5">
    <label className="pt-1.5 text-right text-xs text-gray-600">
      {label}{required && <span className="ml-0.5 text-rose-500">*</span>}
    </label>
    <div className="space-y-0.5">
      {children}
      {hint && <p className="text-[10px] text-gray-400">{hint}</p>}
    </div>
  </div>
);

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

/* ─────────────────── category file upload ─────────────────── */
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
      <input ref={inputRef} type="file" accept=".pdf,application/pdf" multiple className="hidden" onChange={handleFileChange} />
      {uploads.length > 0 && (
        <div className="space-y-1 pl-5">
          {uploads.map((u, i) => (
            <div key={i} className="flex items-center gap-2 rounded border border-gray-100 bg-gray-50 px-2 py-1 text-xs">
              <FileCheck2 className="h-3.5 w-3.5 flex-shrink-0 text-emerald-500" />
              <Printer className="h-3.5 w-3.5 flex-shrink-0 text-[#4a7bb5]" />
              <a href={u.url} target="_blank" rel="noopener noreferrer" className="flex-1 truncate text-blue-600 hover:underline">{u.name}</a>
              <a href={u.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded border border-gray-200 bg-white px-1.5 py-0.5 text-[10px] text-blue-600 hover:bg-blue-50">
                <Eye className="h-2.5 w-2.5" />View
              </a>
              <a href={u.url} download={u.name} className="inline-flex items-center rounded border border-gray-200 bg-white p-0.5 text-gray-500 hover:bg-gray-50">
                <Download className="h-2.5 w-2.5" />
              </a>
              <button type="button" onClick={() => removeUpload(i)} className="text-gray-300 hover:text-rose-400"><X className="h-3 w-3" /></button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

/* ─────────────────── bulk upload modal ─────────────────── */
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
        <div className="rounded-t-xl bg-[#4a7bb5] px-4 py-2.5">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-white">Bulk File Upload</h2>
            <button type="button" onClick={handleClose} disabled={isUploading} className="text-white/70 hover:text-white disabled:opacity-40"><X className="h-4 w-4" /></button>
          </div>
          <p className="text-[10px] text-blue-100">Add files and assign each to a document category</p>
        </div>
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
            <input ref={bulkInputRef} type="file" accept=".pdf,application/pdf" multiple className="hidden" onChange={handleFileInput} />
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

/* ═══════════════════════════════════════════════════════ */
/*              EmploymentContractView (editable)         */
/* ═══════════════════════════════════════════════════════ */
const EmploymentContractView = () => {
  const { refCode } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const isCreateMode = !refCode || refCode === "new";
  const isEditMode = isCreateMode || location.pathname.endsWith("/edit");
  const isReadOnly = !isCreateMode && !isEditMode;
  const requestedStep = Number(new URLSearchParams(location.search).get("step") || "");
  const hasStepQuery = Number.isInteger(requestedStep) && requestedStep >= 1 && requestedStep <= 4;
  const showStepTabs = isCreateMode || hasStepQuery;

  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showBackToTop, setShowBackToTop] = useState(false);
  const [maidSearch, setMaidSearch] = useState("");
  const [maidResults, setMaidResults] = useState<MaidSearchResult[]>([]);
  const [maidSearchLoading, setMaidSearchLoading] = useState(false);
  const [showMaidResults, setShowMaidResults] = useState(false);
  const [bulkUploadOpen, setBulkUploadOpen] = useState(false);
  const [categoryUploads, setCategoryUploads] = useState<Record<string, UploadedFile[]>>({});
  const [activeStep, setActiveStep] = useState<1 | 2 | 3 | 4>(hasStepQuery ? (requestedStep as 1 | 2 | 3 | 4) : 1);

  /* ── form state ── */
  const [maid, setMaid] = useState({
    referenceCode: "", name: "", nationality: "", workPermitNo: "", finNo: "",
    passportNo: "", salary: "", numberOfOffDays: "", compensationNoOffday: "",
    nameOfReplacement: "", passportOfMaid: "", photoDataUrl: "", photoDataUrls: [] as string[],
    numberOfTerms: "", communicationToBuy: "",
  });

  const [agency, setAgency] = useState({
    caseReferenceNumber: isCreateMode ? "" : refCode || "", contractDate: todayIsoDate(),
    dateOfEmploymentDay: "", dateOfEmploymentMonth: "", dateOfEmploymentYear: "",
    invoiceNumber: "", serviceFee: "", deposit: "", sipFee: "", medicalFee: "",
    transportFee: "", documentFee: "", placementFee: "", insuranceFee: "",
    agencyWitness: "", maidId: "",
    handlingInHospitalFee: "", extensionFee: "", discountedFee: "", balanceFee: "",
  });

  const [employer, setEmployer] = useState({
    name: "", gender: "",
    dateOfBirthDay: "", dateOfBirthMonth: "", dateOfBirthYear: "",
    nationality: "", residentialStatus: "", nric: "",
    addressLine1: "", addressLine2: "", postalCode: "", typeOfResidence: "",
    occupation: "", company: "", email: "", residentialPhone: "", mobileNumber: "",
    monthlyCombinedIncome: "", existingEmployer: "", existingEmployerNric: "",
    monthlyContribution: "", dateOfEmployment: "",
  });

  const [notificationDate, setNotificationDate] = useState({ month: "", year: "" });

  const [spouse, setSpouse] = useState({
    name: "", gender: "",
    dateOfBirthDay: "", dateOfBirthMonth: "", dateOfBirthYear: "",
    nationality: "", residentialStatus: "", nric: "", occupation: "", company: "",
  });

  const emptyFamilyMember = () => ({
    name: "", relationship: "", birthCertIcFin: "",
    dateOfBirthDay: "01", dateOfBirthMonth: "01", dateOfBirthYear: "1910",
  });

  const [familyMembers, setFamilyMembers] = useState([emptyFamilyMember()]);

  /* ── document selection state ── */
  const [selectedDocs, setSelectedDocs] = useState<Set<string>>(new Set());

  const uploadedDocuments = useMemo(() => Object.values(categoryUploads).flat(), [categoryUploads]);

  const docKey = (file: UploadedFile) => `${file.category}||${file.name}`;
  const allDocKeys = useMemo(() => uploadedDocuments.map(docKey), [uploadedDocuments]);
  const allSelected = allDocKeys.length > 0 && allDocKeys.every((k) => selectedDocs.has(k));

  const toggleDoc = (key: string) =>
    setSelectedDocs((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });

  const handleSelectAll = () =>
    setSelectedDocs(allSelected ? new Set() : new Set(allDocKeys));

  const handleDownloadSelected = () => {
    const toDownload = uploadedDocuments.filter((f) => selectedDocs.has(docKey(f)));
    if (!toDownload.length) { toast.error("No documents selected."); return; }
    toDownload.forEach((file) => {
      const a = document.createElement("a"); a.href = file.url; a.download = file.name; a.target = "_blank";
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
    });
  };

  const applyMaidResult = useCallback((selectedMaid: MaidSearchResult) => {
    const introduction = (selectedMaid.introduction as Record<string, unknown> | undefined) ?? {};
    const skillsPreferences = (selectedMaid.skillsPreferences as Record<string, unknown> | undefined) ?? {};

    setMaid((current) => ({
      ...current,
      referenceCode: toText(selectedMaid.referenceCode),
      name: fillIfEmpty(current.name, toText(selectedMaid.fullName)),
      nationality: fillIfEmpty(current.nationality, toText(selectedMaid.nationality)),
      salary: fillIfEmpty(current.salary, toText(introduction.expectedSalary)),
      numberOfOffDays: fillIfEmpty(current.numberOfOffDays, toText(skillsPreferences.offDaysPerMonth)),
      compensationNoOffday: fillIfEmpty(current.compensationNoOffday, toText(introduction.offdayCompensation)),
      photoDataUrl: toText(selectedMaid.photoDataUrl),
      photoDataUrls: Array.isArray(selectedMaid.photoDataUrls)
        ? selectedMaid.photoDataUrls.filter((item): item is string => typeof item === "string")
        : [],
    }));

    setAgency((current) => ({
      ...current,
      maidId: selectedMaid.id ? String(selectedMaid.id) : current.maidId,
    }));

    setMaidSearch(`${toText(selectedMaid.fullName)} (${toText(selectedMaid.referenceCode)})`);
    setShowMaidResults(false);
    toast.success("Maid details added to the employment form");
  }, []);

  /* ── load data ── */
  useEffect(() => {
    if (isCreateMode) { setLoadError(null); setIsLoading(false); return; }
    const load = async () => {
      try {
        setIsLoading(true);
        const res = await fetch(`/api/employers/${encodeURIComponent(refCode)}`);
        const data = (await res.json().catch(() => ({}))) as { employer?: EmployerContractRecord; error?: string };
        if (!res.ok || !data.employer) throw new Error(data.error || "Failed to load employment contract");
        const r = data.employer;

        if (r.maid) setMaid((p) => ({ ...p, ...(r.maid as typeof maid) }));
        if (r.agency) setAgency((p) => ({ ...p, ...(r.agency as typeof agency) }));
        if (r.employer) setEmployer((p) => ({ ...p, ...(r.employer as typeof employer) }));
        if (r.spouse) setSpouse((p) => ({ ...p, ...(r.spouse as typeof spouse) }));
        if (r.notificationDate) setNotificationDate((p) => ({ ...p, ...(r.notificationDate as typeof notificationDate) }));
        if (Array.isArray(r.familyMembers) && r.familyMembers.length) {
          setFamilyMembers(r.familyMembers.map((fm) => ({
            name: toText(fm.name), relationship: toText(fm.relationship),
            birthCertIcFin: toText(fm.birthCertIcFin ?? fm.birthCert),
            dateOfBirthDay: toText(fm.dateOfBirthDay ?? "01"),
            dateOfBirthMonth: toText(fm.dateOfBirthMonth ?? "01"),
            dateOfBirthYear: toText(fm.dateOfBirthYear ?? "1910"),
          })));
        }
        if (Array.isArray(r.documents)) {
          setCategoryUploads(
            r.documents.reduce<Record<string, UploadedFile[]>>((acc, doc) => {
              const cat = toText(doc.category); const url = toText(doc.fileUrl); const name = toText(doc.fileName);
              if (!cat || !url || !name) return acc;
              acc[cat] = [...(acc[cat] ?? []), { category: cat, url, name }];
              return acc;
            }, {})
          );
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Failed to load employment contract";
        setLoadError(msg); toast.error(msg);
      } finally { setIsLoading(false); }
    };
    void load();
  }, [isCreateMode, refCode]);

  useEffect(() => {
    const term = maidSearch.trim();
    if (term.length < 2) {
      setMaidResults([]);
      return;
    }

    let cancelled = false;
    const controller = new AbortController();

    const loadMaids = async () => {
      try {
        setMaidSearchLoading(true);
        const response = await fetch(`/api/maids?search=${encodeURIComponent(term)}`, {
          signal: controller.signal,
        });
        const data = (await response.json().catch(() => ({}))) as { maids?: MaidSearchResult[] };
        if (!response.ok || !Array.isArray(data.maids)) {
          throw new Error("Failed to search maids");
        }
        if (!cancelled) {
          setMaidResults(data.maids.slice(0, 8));
        }
      } catch (error) {
        if (controller.signal.aborted) return;
        if (!cancelled) {
          setMaidResults([]);
        }
        console.error(error);
      } finally {
        if (!cancelled) {
          setMaidSearchLoading(false);
        }
      }
    };

    void loadMaids();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [maidSearch]);

  useEffect(() => {
    if (hasStepQuery) {
      setActiveStep(requestedStep as 1 | 2 | 3 | 4);
      return;
    }
    if (isCreateMode) {
      setActiveStep(1);
    }
  }, [hasStepQuery, isCreateMode, requestedStep]);

  useEffect(() => {
    const onScroll = () => setShowBackToTop(window.scrollY > 320);
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const scrollToTop = useCallback(() => window.scrollTo({ top: 0, behavior: "smooth" }), []);

  const addFamilyMember = () => setFamilyMembers((p) => [...p, emptyFamilyMember()]);
  const removeFamilyMember = (idx: number) => setFamilyMembers((p) => p.filter((_, i) => i !== idx));
  const updateFamilyMember = (idx: number, field: string, value: string) =>
    setFamilyMembers((p) => p.map((fm, i) => i === idx ? { ...fm, [field]: value } : fm));

  const updateCategoryUploads = (cat: string, files: UploadedFile[]) =>
    setCategoryUploads((p) => ({ ...p, [cat]: files }));

  const handleBulkUploadComplete = (by: Record<string, UploadedFile[]>) => {
    setCategoryUploads((p) => {
      const m = { ...p };
      for (const [c, fs] of Object.entries(by)) m[c] = [...(m[c] ?? []), ...fs];
      return m;
    });
  };

  const transformFamilyMembers = (members: typeof familyMembers) =>
    members.map(({ name, relationship, dateOfBirthDay: day, dateOfBirthMonth: month, dateOfBirthYear: year }) => ({
      name,
      type: ['Daughter', 'Son'].includes(relationship) ? 'child' : 'parent',
      relationship,
      dateOfBirth: `${day.padStart(2, '0')}-${month.padStart(2, '0')}-${year}`
    } as const));

  const submitContract = async () => {
    if (isSubmitting) return;
    if (!employer.name.trim()) { toast.error("Employer name is required"); return; }
    try {
      setIsSubmitting(true);
      const body = {
        refCode: refCode || agency.caseReferenceNumber || null,
        maid,
        agency,
        employer,
        spouse,
        familyMembers,
        notificationDate,
        documents: uploadedDocuments.map((f) => ({ category: f.category, fileUrl: f.url, fileName: f.name })),
      };
      const r = await fetch("/api/employers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const d = (await r.json().catch(() => ({}))) as { error?: string; employer?: { refCode?: string } };
      if (!r.ok || !d.employer?.refCode) throw new Error(d.error || "Failed to save employer contract");
      toast.success("Employer contract saved");
      if (showStepTabs) {
        navigate(adminPath(`/employment-contracts/${encodeURIComponent(d.employer.refCode)}/edit?step=4`));
      } else {
        navigate(adminPath(`/employment-contracts/${encodeURIComponent(d.employer.refCode)}`));
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save employer contract");
    } finally { setIsSubmitting(false); }
  };

  const handleDownloadForms = async () => {
    if (!uploadedDocuments.length) { toast.error("Upload at least one document first"); return; }
    try {
      const { skippedCount } = await downloadMergedEmployerPdf(uploadedDocuments, `employer-${refCode || "temp"}-forms.pdf`);
      if (skippedCount > 0) { toast.success(`Merged PDF downloaded. Skipped ${skippedCount} non-PDF file${skippedCount === 1 ? "" : "s"}.`); return; }
      toast.success("Merged PDF downloaded");
    } catch (e) { toast.error(e instanceof Error ? e.message : "Failed to download forms"); }
  };

  const handlePrintForms = async () => {
    if (!uploadedDocuments.length) { toast.error("Upload at least one document first"); return; }
    try {
      const { skippedCount } = await printMergedEmployerPdf(uploadedDocuments, { maid, agency, employer, spouse, familyMembers: transformFamilyMembers(familyMembers), notificationDate });
      if (skippedCount > 0) { toast.success(`Print preview opened. Skipped ${skippedCount} non-PDF file${skippedCount === 1 ? "" : "s"}.`); return; }
      toast.success("Print preview opened");
    } catch (e) { toast.error(e instanceof Error ? e.message : "Failed to print forms"); }
  };

  const ordinal = (n: number) => ["1st", "2nd", "3rd", "4th", "5th", "6th", "7th", "8th", "9th", "10th"][n - 1] ?? `${n}th`;

  const maidPhoto = useMemo(() => getPrimaryPhoto(maid as unknown as Record<string, unknown>), [maid]);
  const showStepOne = !showStepTabs || activeStep === 1;
  const showStepTwo = !showStepTabs || activeStep === 2;
  const showStepThree = !showStepTabs || activeStep === 3;
  const showStepFour = !showStepTabs || activeStep === 4;
  const stepItems: Array<{ id: 1 | 2 | 3 | 4; label: string }> = [
    { id: 1, label: "1. Maid" },
    { id: 2, label: "2. Agency" },
    { id: 3, label: "3. Employer" },
    { id: 4, label: "4. Upload PDF" },
  ];

  const inp = "h-7 rounded border border-gray-300 bg-white px-2 py-0 text-xs focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400/30 disabled:bg-gray-50 disabled:text-gray-400";
  const sel = "h-7 text-xs";

  /* ── loading / error ── */
  if (isLoading) return (
    <div className="page-container max-w-4xl flex min-h-[30vh] items-center justify-center text-sm text-gray-400">
      <Loader2 className="mr-2 h-4 w-4 animate-spin" />Loading employment contract…
    </div>
  );
  if (loadError) return (
    <div className="page-container max-w-4xl">
      <div className="rounded border border-red-200 bg-red-50 p-4 text-sm text-red-600">{loadError}</div>
    </div>
  );

  /* ── render ── */
  return (
    <>
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
            <h2 className="text-base font-bold text-gray-800">{isCreateMode ? "Add Employer Employment Form" : "Employment Contract Form"}</h2>
            <p className="text-xs text-gray-500">
              Reference Number: <span className="font-semibold text-[#4a7bb5]">{refCode || "—"}</span>
            </p>
          </div>
     
        </div>

        {/* ══ THE MAID EMPLOYED ══ */}
        {showStepTabs ? (
          <div className="mb-4 flex flex-wrap gap-2 rounded-lg border border-[#c5d3e8] bg-[#f7fbff] p-2">
            {stepItems.map((step) => (
              <button
                key={step.id}
                type="button"
                onClick={() => setActiveStep(step.id)}
                className={`rounded-md px-3 py-2 text-xs font-semibold transition-colors ${
                  activeStep === step.id
                    ? "bg-[#4a7bb5] text-white"
                    : "bg-white text-[#4a7bb5] hover:bg-blue-50"
                }`}
              >
                {step.label}
              </button>
            ))}
          </div>
        ) : null}
        {showStepOne ? <SectionHeader title="The Maid Employed" /> : null}
        {showStepOne ? (
        <SectionBody disabled={isReadOnly}>
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
            <div className="relative flex-1">
              <Input
                className={`${inp} w-full`}
                value={maidSearch}
                onChange={(e) => {
                  setMaidSearch(e.target.value);
                  setShowMaidResults(true);
                }}
                onFocus={() => setShowMaidResults(true)}
                placeholder="Please search the Name or Ref. Code of the Maid hired."
              />
              {showMaidResults && maidSearch.trim().length >= 2 ? (
                <div className="absolute left-0 right-0 top-full z-30 mt-1 max-h-72 overflow-y-auto rounded-md border border-[#c5d3e8] bg-white shadow-lg">
                  {maidSearchLoading ? (
                    <div className="px-3 py-2 text-xs text-gray-500">Searching maids...</div>
                  ) : maidResults.length === 0 ? (
                    <div className="px-3 py-2 text-xs text-gray-500">No maids found.</div>
                  ) : (
                    maidResults.map((result) => (
                      <button
                        key={`${result.referenceCode}-${result.id ?? "maid"}`}
                        type="button"
                        className="flex w-full items-start gap-3 border-b border-gray-100 px-3 py-2 text-left last:border-b-0 hover:bg-blue-50"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => applyMaidResult(result)}
                      >
                        <div className="h-12 w-10 overflow-hidden rounded border border-gray-200 bg-gray-50">
                          {getPrimaryPhoto(result as unknown as Record<string, unknown>) ? (
                            <img
                              src={getPrimaryPhoto(result as unknown as Record<string, unknown>)}
                              alt={result.fullName}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-gray-300">
                              <User className="h-4 w-4" />
                            </div>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-xs font-semibold text-gray-800">{result.fullName || "Unnamed maid"}</div>
                          <div className="mt-0.5 text-[11px] text-gray-500">
                            Ref: {result.referenceCode || "N/A"} | Nationality: {result.nationality || "Not set"}
                          </div>
                          <div className="mt-0.5 text-[11px] text-blue-600">
                            Salary: {toText((result.introduction as Record<string, unknown> | undefined)?.expectedSalary) || "Default display"}
                          </div>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              ) : null}
            </div>
            <button
              type="button"
              className="flex items-center gap-1.5 rounded bg-[#4a7bb5] px-3 py-1 text-xs font-semibold text-white hover:bg-[#3a6aa5]"
              onClick={() => setShowMaidResults(true)}
            >
              <Search className="h-3 w-3" />SEARCH MAID
            </button>
          </div>

          {maid.referenceCode ? (
            <div className="mb-3 rounded border border-blue-100 bg-blue-50 px-3 py-2 text-[11px] text-blue-700">
              Selected maid preview: {maid.name || "Default display"} | Ref {maid.referenceCode || "Default display"} | Salary {maid.salary || "Default display"}
            </div>
          ) : null}

          <div className="grid grid-cols-[1fr_130px] gap-4">
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
            {/* photo */}
            <div className="flex flex-col items-center pt-1">
              <div className="overflow-hidden rounded border border-gray-300 bg-gray-100" style={{ width: 120, height: 150 }}>
                {maidPhoto ? (
                  <img src={maidPhoto} alt={maid.name} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full flex-col items-center justify-center text-gray-300">
                    <User className="h-10 w-10" />
                    <span className="mt-1 text-[10px]">No photo</span>
                  </div>
                )}
              </div>
              {maid.referenceCode && (
                <span className="mt-1 text-[10px] text-gray-500">Ref: {maid.referenceCode}</span>
              )}
            </div>
          </div>
        </SectionBody>
        ) : null}

        {/* ══ AGENCY ══ */}
        {showStepTabs && showStepOne ? (
          <div className="mt-3 flex justify-end">
            <Button type="button" onClick={() => setActiveStep(2)}>Next: Agency</Button>
          </div>
        ) : null}
        {showStepTwo ? <SectionHeader title="Agency" /> : null}
        {showStepTwo ? (
        <SectionBody disabled={isReadOnly}>
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

        ) : null}
        {showStepTabs && showStepTwo ? (
          <div className="mt-3 flex justify-between">
            <Button type="button" variant="outline" onClick={() => setActiveStep(1)}>Back</Button>
            <Button type="button" onClick={() => setActiveStep(3)}>Next: Employer</Button>
          </div>
        ) : null}
        {showStepThree ? <SectionHeader title="Employer" /> : null}
        {showStepThree ? (
        <SectionBody disabled={isReadOnly}>
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
                <SelectContent>{NATIONALITY_OPTIONS.map((n) => <SelectItem key={n} value={n}>{n}</SelectItem>)}</SelectContent>
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
                  <label key={t} className={`flex cursor-pointer items-center gap-1 text-xs ${employer.typeOfResidence === t ? "font-semibold text-blue-700" : "text-gray-600"}`}>
                    <input type="radio" name="residence" checked={employer.typeOfResidence === t} onChange={() => setEmployer({ ...employer, typeOfResidence: t })} className="h-3 w-3 accent-blue-600" />
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
                <SelectContent>{INCOME_OPTIONS.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
            <Field label="Notification of Assessment" hint="Based on Annual Income or Bank Statement">
              <div className="flex flex-wrap items-center gap-1.5">
                <Select value={notificationDate.year || undefined} onValueChange={(v) => setNotificationDate({ ...notificationDate, year: v })}>
                  <SelectTrigger className={`${sel} w-24`}><SelectValue placeholder="Year" /></SelectTrigger>
                  <SelectContent>{Array.from({ length: 20 }, (_, i) => <SelectItem key={i} value={String(2010 + i)}>{2010 + i}</SelectItem>)}</SelectContent>
                </Select>
                <Select value={notificationDate.month || undefined} onValueChange={(v) => setNotificationDate({ ...notificationDate, month: v })}>
                  <SelectTrigger className={`${sel} w-36`}><SelectValue placeholder="-- Select --" /></SelectTrigger>
                  <SelectContent>{MONTHS.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
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

        ) : null}
        {showStepThree ? <SectionHeader title="Spouse" /> : null}
        {showStepThree ? (
        <SectionBody disabled={isReadOnly}>
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
                <SelectContent>{NATIONALITY_OPTIONS.map((n) => <SelectItem key={n} value={n}>{n}</SelectItem>)}</SelectContent>
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
        ) : null}

        {/* ══ FAMILY MEMBERS ══ */}
        {showStepThree ? familyMembers.map((fm, idx) => (
          <div key={idx}>
            <SectionHeader title={`${ordinal(idx + 1)} Family Member`}>
              {familyMembers.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeFamilyMember(idx)}
                  className="flex items-center gap-1 rounded px-1.5 py-0.5 text-white/70 hover:bg-white/20 hover:text-white transition-colors"
                >
                  <X className="h-3.5 w-3.5" /><span className="text-[10px] font-medium">Remove</span>
                </button>
              )}
            </SectionHeader>
            <SectionBody disabled={isReadOnly}>
              <dl className="space-y-1">
                <Field label="Name">
                  <Input className={inp} value={fm.name} onChange={(e) => updateFamilyMember(idx, "name", e.target.value)} placeholder="Full name" />
                </Field>
                <Field label="Relationship">
                  <div className="space-y-1 pt-0.5">
                    {[["Daughter", "Son"], ["Father", "Mother"], ["Father-in-Law", "Mother-in-Law"]].map((row, ri) => (
                      <div key={ri} className="flex gap-4">
                        {row.map((opt) => (
                          <label key={opt} className="flex cursor-pointer items-center gap-1.5 text-xs text-gray-700">
                            <input type="radio" name={`fm-type-${idx}`} checked={fm.relationship === opt} onChange={() => updateFamilyMember(idx, "relationship", opt)} className="h-3 w-3 accent-blue-600" />
                            {opt}
                          </label>
                        ))}
                      </div>
                    ))}
                  </div>
                </Field>
                <Field label="Birth Cert. / IC / FIN">
                  <Input className={inp} value={fm.birthCertIcFin} onChange={(e) => updateFamilyMember(idx, "birthCertIcFin", e.target.value)} placeholder="Birth cert / IC / FIN number" />
                </Field>
                <Field label="Date Of Birth">
                  <DatePicker
                    day={fm.dateOfBirthDay} month={fm.dateOfBirthMonth} year={fm.dateOfBirthYear}
                    onDay={(v) => updateFamilyMember(idx, "dateOfBirthDay", v)}
                    onMonth={(v) => updateFamilyMember(idx, "dateOfBirthMonth", v)}
                    onYear={(v) => updateFamilyMember(idx, "dateOfBirthYear", v)}
                  />
                </Field>
              </dl>
            </SectionBody>
          </div>
        )) : null}

        {showStepThree ? (
        <button
          type="button"
          onClick={addFamilyMember}
          className="mt-2 flex w-full items-center justify-center gap-1.5 rounded border border-dashed border-[#4a7bb5] bg-white px-3 py-2 text-xs font-medium text-[#4a7bb5] transition-colors hover:bg-blue-50 hover:border-[#3a6aa5]"
        >
          <Plus className="h-3.5 w-3.5" />Add Family Member
        </button>
        ) : null}

        {/* ══ ACTION BUTTONS ══ */}
        {showStepThree && !isReadOnly ? (
        <div className="mt-4 flex flex-wrap items-center justify-center gap-2 rounded border border-[#c5d3e8] bg-gray-50 px-4 py-3">
          <Button size="sm" onClick={() => void submitContract()} disabled={isSubmitting} className="flex items-center gap-1.5">
            {isSubmitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
            {showStepTabs ? "Save Employer Form" : "Submit &amp; Generate Forms"}
          </Button>
          {showStepTabs ? (
            <Button type="button" variant="outline" size="sm" onClick={() => setActiveStep(2)}>
              Back
            </Button>
          ) : (
            <>
              <Button variant="outline" size="sm" onClick={handleSelectAll}>
                {allSelected ? "Deselect All" : "Select All"}
              </Button>
              <Button variant="outline" size="sm" onClick={handleDownloadSelected} disabled={selectedDocs.size === 0} className="flex items-center gap-1.5">
                <Download className="h-3.5 w-3.5" />
                Download Forms and Print
                {selectedDocs.size > 0 && <span className="ml-0.5 rounded-full bg-[#4a7bb5]/10 px-1.5 py-0.5 text-[10px] font-semibold text-[#4a7bb5]">{selectedDocs.size}</span>}
              </Button>
            </>
          )}     
          {isReadOnly ? (
            <Button
              type="button"
              onClick={() => navigate(adminPath(`/employment-contracts/${encodeURIComponent(refCode || "")}/edit`))}
            >
              Edit
            </Button>
          ) : null}
        </div>
        ) : null}

        {showStepFour ? (
        <>
        <p className="mt-1 text-center text-[10px] text-gray-400">
          The PDF Forms are for demo purposes only. Please approach admin for customization works.
        </p>

        {/* ══ DOCUMENTS & FORMS ══ */}
        {/* <div className="mt-1 flex items-center justify-end">
          <button
            type="button"
            onClick={() => setBulkUploadOpen(true)}
            className="mt-3 flex items-center gap-1.5 rounded border border-[#4a7bb5] bg-[#4a7bb5] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#3a6aa5]"
          >
            <Upload className="h-3 w-3" />Bulk Upload
          </button>
        </div> */}

        {!isReadOnly ? (
        <div className="mt-3 rounded border border-[#c5d3e8] bg-[#f7fbff] p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold text-[#2f5f97]">4 Steps For Uploading Employer PDF Documents</h3>
              <div className="mt-2 grid gap-2 text-xs text-gray-600 md:grid-cols-2">
                <div><span className="font-semibold text-[#2f5f97]">1.</span> Save the employer form first so the contract gets a reference number.</div>
                <div><span className="font-semibold text-[#2f5f97]">2.</span> Search the maid and confirm the preview before uploading files.</div>
                <div><span className="font-semibold text-[#2f5f97]">3.</span> Use bulk upload and choose the required PDF documents only.</div>
                <div><span className="font-semibold text-[#2f5f97]">4.</span> Review the uploaded forms, then select files for download or print.</div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setBulkUploadOpen(true)}
              className="inline-flex items-center gap-1.5 rounded border border-[#4a7bb5] bg-[#4a7bb5] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#3a6aa5]"
            >
              <Upload className="h-3 w-3" />Bulk Upload PDF
            </button>
          </div>
        </div>
        ) : null}

        {GENERATED_FORMS.map((cat) => {
          const uploads = categoryUploads[cat.category] ?? [];
          return (
            <div key={cat.category}>
              <SectionHeader title={cat.category} />
              <SectionBody>
                <CategoryFileUpload
                  category={cat.category}
                  hasTemplate={cat.hasTemplate}
                  refCode={refCode || agency.caseReferenceNumber || "temp"}
                  uploads={uploads}
                  onUpload={(files) => updateCategoryUploads(cat.category, files)}
                />
                {/* checkbox selection for uploaded files */}
                {uploads.length > 0 && (
                  <div className="mt-1 pl-5 space-y-0.5">
                    {uploads.map((file) => {
                      const key = docKey(file);
                      return (
                        <label key={key} className="flex items-center gap-2 text-[11px] text-gray-500 cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={selectedDocs.has(key)}
                            onChange={() => toggleDoc(key)}
                            className="h-3 w-3 accent-[#4a7bb5]"
                          />
                          Select for bulk download
                        </label>
                      );
                    })}
                  </div>
                )}
              </SectionBody>
            </div>
          );
        })}

        <BulkUploadModal
          open={bulkUploadOpen}
          onClose={() => setBulkUploadOpen(false)}
          refCode={refCode || agency.caseReferenceNumber || "temp"}
          onUploadComplete={handleBulkUploadComplete}
        />
        {showStepTabs && !isReadOnly ? (
          <div className="mt-3 flex justify-between">
            <Button type="button" variant="outline" onClick={() => setActiveStep(3)}>Back</Button>
            <div className="flex gap-2">
              <Button variant="outline" type="button" onClick={handleSelectAll}>
                {allSelected ? "Deselect All" : "Select All"}
              </Button>
              <Button variant="outline" type="button" onClick={handleDownloadSelected} disabled={selectedDocs.size === 0} className="flex items-center gap-1.5">
                <Download className="h-3.5 w-3.5" />
                Download Forms
              </Button>
            </div>
          </div>
        ) : null}
        </>
        ) : null}
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

export default EmploymentContractView;
