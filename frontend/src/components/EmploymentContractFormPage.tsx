import { useEffect, useMemo, useState, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
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
  ChevronRight,
  ChevronLeft,
  Save,
  Users,
  Building2,
  Home,
  FilePlus2,
  AlertCircle,
} from "lucide-react";
import { downloadMergedEmployerPdf, printMergedEmployerPdf } from "@/lib/employerPdf";
import { adminPath } from "@/lib/routes";
import { getExperienceBucket, type MaidProfile } from "@/lib/maids";

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
  | "employmentHistory"
  | "agencyContact"
  | "introduction"
  | "skillsPreferences"
  | "photoDataUrl"
  | "photoDataUrls"
>;

type EmploymentContractPageMode = "create" | "edit" | "view";

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

const DEFAULT_CASE_REFERENCE_NUMBER = "06583";

/* ─────────────────── helpers ─────────────────── */
const toText = (v: unknown) => String(v ?? "").trim();

const getPrimaryPhoto = (maid: Record<string, unknown>) => {
  const arr = Array.isArray(maid.photoDataUrls)
    ? maid.photoDataUrls.filter((v): v is string => typeof v === "string" && v.trim().length > 0)
    : [];
  return arr[0] || toText(maid.photoDataUrl);
};

const todayIsoDate = () => new Date().toISOString().slice(0, 10);

const getMaidExperienceLabel = (maid: MaidSearchResult | MaidProfile) => getExperienceBucket(maid as MaidProfile);
const getMaidPassportNo = (maid: MaidSearchResult) =>
  toText((maid.agencyContact as Record<string, unknown> | undefined)?.passportNo);
const parseNotificationOfAssessment = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) return { month: "", year: "" };
  const parts = trimmed.split(/\s+/);
  if (parts.length < 2) return { month: "", year: "" };
  return { month: parts[0].toUpperCase(), year: parts[1] };
};
const normalizeEmploymentDateParts = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) return { day: "", month: "", year: "" };
  const match = trimmed.match(/^(\d{2})-(\d{2})-(\d{4})$/);
  if (match) return { day: match[1], month: match[2], year: match[3] };
  if (/^\d{4}$/.test(trimmed)) return { day: "", month: "", year: trimmed };
  return { day: "", month: "", year: "" };
};

/* ─────────────────── shared UI primitives ─────────────────── */

const inp = [
  "h-11 w-full rounded-xl border-2 border-gray-200 bg-gray-50 px-3.5",
  "text-[15px] text-gray-900 font-medium outline-none transition-all",
  "placeholder:text-gray-400 placeholder:font-normal",
  "focus:border-emerald-400 focus:bg-white focus:ring-2 focus:ring-emerald-100",
  "disabled:bg-white disabled:opacity-100 disabled:border-gray-200",
].join(" ");

const selTrigger = [
  "h-11 rounded-xl border-2 border-gray-200 bg-gray-50 px-3.5",
  "text-[15px] text-gray-900 font-medium",
  "focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100",
  "disabled:bg-white disabled:opacity-100",
].join(" ");

function SectionCard({
  title,
  icon,
  color = "emerald",
  children,
  action,
}: {
  title: string;
  icon: React.ReactNode;
  color?: "emerald" | "sky" | "violet" | "amber" | "slate";
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  const colors: Record<string, { header: string; border: string; icon: string }> = {
    emerald: { header: "bg-gradient-to-r from-emerald-600 to-teal-600", border: "border-emerald-100", icon: "bg-emerald-100 text-emerald-700" },
    sky:     { header: "bg-gradient-to-r from-sky-600 to-blue-600",     border: "border-sky-100",     icon: "bg-sky-100 text-sky-700" },
    violet:  { header: "bg-gradient-to-r from-violet-600 to-purple-600",border: "border-violet-100",  icon: "bg-violet-100 text-violet-700" },
    amber:   { header: "bg-gradient-to-r from-amber-500 to-orange-500", border: "border-amber-100",   icon: "bg-amber-100 text-amber-700" },
    slate:   { header: "bg-gradient-to-r from-slate-600 to-gray-700",   border: "border-slate-100",   icon: "bg-slate-100 text-slate-700" },
  };
  const c = colors[color];
  return (
    <div className={`overflow-hidden rounded-2xl border-2 ${c.border} shadow-sm`}>
      <div className={`${c.header} px-5 py-3.5 flex items-center justify-between`}>
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/20">
            {icon}
          </div>
          <h3 className="text-[16px] font-bold text-white">{title}</h3>
        </div>
        {action && <div>{action}</div>}
      </div>
      <div className="bg-white px-5 py-5">{children}</div>
    </div>
  );
}

function Field({
  label, required, hint, children,
}: {
  label: string; required?: boolean; hint?: string; children: React.ReactNode;
}) {
  return (
    <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-[200px_1fr] sm:items-start sm:gap-x-4 py-1">
      <label className="pt-2.5 text-[14px] font-bold text-gray-700 sm:text-right">
        {label}{required && <span className="ml-0.5 text-red-500">*</span>}
      </label>
      <div className="space-y-1">
        {children}
        {hint && <p className="text-[12px] text-gray-400 leading-snug">{hint}</p>}
      </div>
    </div>
  );
}

function RadioGroup({
  name, options, value, onChange,
}: {
  name: string; options: string[]; value: string; onChange: (v: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2 pt-1">
      {options.map((opt) => (
        <label
          key={opt}
          className={`flex cursor-pointer items-center gap-2 rounded-xl border-2 px-4 py-2 text-[14px] font-semibold transition-all ${
            value === opt
              ? "border-emerald-400 bg-emerald-50 text-emerald-800"
              : "border-gray-200 text-gray-600 hover:border-gray-300 bg-gray-50"
          }`}
        >
          <input type="radio" name={name} checked={value === opt} onChange={() => onChange(opt)} className="sr-only" />
          {value === opt && <Check className="h-3.5 w-3.5 text-emerald-600" />}
          {opt}
        </label>
      ))}
    </div>
  );
}

function DatePicker({ day, month, year, onDay, onMonth, onYear }: {
  day: string; month: string; year: string;
  onDay: (v: string) => void; onMonth: (v: string) => void; onYear: (v: string) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select value={day || undefined} onValueChange={onDay}>
        <SelectTrigger className={`${selTrigger} w-[80px]`}><SelectValue placeholder="DD" /></SelectTrigger>
        <SelectContent>{Array.from({ length: 31 }, (_, i) => <SelectItem key={i} value={String(i + 1).padStart(2, "0")}>{String(i + 1).padStart(2, "0")}</SelectItem>)}</SelectContent>
      </Select>
      <Select value={month || undefined} onValueChange={onMonth}>
        <SelectTrigger className={`${selTrigger} w-[80px]`}><SelectValue placeholder="MM" /></SelectTrigger>
        <SelectContent>{Array.from({ length: 12 }, (_, i) => <SelectItem key={i} value={String(i + 1).padStart(2, "0")}>{String(i + 1).padStart(2, "0")}</SelectItem>)}</SelectContent>
      </Select>
      <Select value={year || undefined} onValueChange={onYear}>
        <SelectTrigger className={`${selTrigger} w-[100px]`}><SelectValue placeholder="YYYY" /></SelectTrigger>
        <SelectContent>{Array.from({ length: 120 }, (_, i) => <SelectItem key={i} value={String(1910 + i)}>{1910 + i}</SelectItem>)}</SelectContent>
      </Select>
      <span className="text-[12px] text-gray-400 font-medium">(day / month / year)</span>
    </div>
  );
}

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
    <div className="space-y-2 py-1.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <FileText className="h-4 w-4 shrink-0 text-gray-400" />
          <span className="truncate text-[14px] font-semibold text-gray-700">{category}</span>
        </div>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={isUploading}
          className="inline-flex items-center gap-1.5 rounded-xl border-2 border-emerald-200 bg-emerald-50 px-3 py-1.5 text-[13px] font-bold text-emerald-700 hover:bg-emerald-100 disabled:opacity-50 transition-colors"
        >
          {isUploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
          {hasTemplate ? "Upload Signed File" : "Upload File"}
        </button>
      </div>
      <input ref={inputRef} type="file" accept=".pdf,application/pdf" multiple className="hidden" onChange={handleFileChange} />
      {uploads.length > 0 && (
        <div className="space-y-1.5 pl-6">
          {uploads.map((u, i) => (
            <div key={i} className="flex items-center gap-2 rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-2">
              <FileCheck2 className="h-4 w-4 shrink-0 text-emerald-500" />
              <a href={u.url} target="_blank" rel="noopener noreferrer" className="flex-1 truncate text-[13px] font-semibold text-sky-700 hover:underline">{u.name}</a>
              <a href={u.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-lg border border-sky-200 bg-white px-2 py-1 text-[12px] font-semibold text-sky-700 hover:bg-sky-50 transition-colors">
                <Eye className="h-3 w-3" />View
              </a>
              <a href={u.url} download={u.name} className="inline-flex items-center rounded-lg border border-gray-200 bg-white p-1 text-gray-500 hover:bg-gray-50 transition-colors">
                <Download className="h-3.5 w-3.5" />
              </a>
              <button type="button" onClick={() => removeUpload(i)} className="text-gray-300 hover:text-red-400 transition-colors">
                <X className="h-4 w-4" />
              </button>
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
      <div className="flex max-h-[90vh] w-full max-w-xl flex-col overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-2xl" onMouseDown={(e) => e.stopPropagation()}>
        {/* Modal header */}
        <div className="bg-gradient-to-r from-emerald-600 to-teal-600 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/20">
                <Upload className="h-4 w-4 text-white" />
              </div>
              <div>
                <h2 className="text-[16px] font-bold text-white">Bulk File Upload</h2>
                <p className="text-[12px] text-white/70">Assign each file to a document category</p>
              </div>
            </div>
            <button type="button" onClick={handleClose} disabled={isUploading} className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/20 text-white hover:bg-white/30 disabled:opacity-40 transition-colors">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto p-5">
          {/* Drop zone */}
          <div
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={() => bulkInputRef.current?.click()}
            className={`flex cursor-pointer select-none flex-col items-center gap-3 rounded-2xl border-2 border-dashed py-10 px-6 transition-all ${
              isDragging ? "border-emerald-400 bg-emerald-50" : "border-gray-200 bg-gray-50 hover:border-gray-300 hover:bg-gray-100"
            }`}
          >
            <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${isDragging ? "bg-emerald-100" : "bg-gray-200"}`}>
              <Upload className={`h-5 w-5 ${isDragging ? "text-emerald-600" : "text-gray-400"}`} />
            </div>
            <p className="text-[15px] font-bold text-gray-600">{isDragging ? "Release to add files" : "Click or drag & drop files here"}</p>
            <p className="text-[13px] text-gray-400">PDF documents — select multiple at once</p>
            <input ref={bulkInputRef} type="file" accept=".pdf,application/pdf" multiple className="hidden" onChange={handleFileInput} />
          </div>

          {pendingFiles.length > 0 && (
            <div className="space-y-2">
              {pendingFiles.map((pf) => (
                <div key={pf.id} className={`flex items-start gap-3 rounded-xl border-2 px-4 py-3 ${
                  pf.status === "done" ? "border-emerald-100 bg-emerald-50"
                  : pf.status === "error" ? "border-red-100 bg-red-50"
                  : pf.status === "uploading" ? "border-sky-100 bg-sky-50"
                  : "border-gray-100 bg-white"
                }`}>
                  <div className="mt-0.5 shrink-0">
                    {pf.status === "done" && <Check className="h-4 w-4 text-emerald-500" />}
                    {pf.status === "error" && <X className="h-4 w-4 text-red-400" />}
                    {pf.status === "uploading" && <Loader2 className="h-4 w-4 animate-spin text-sky-500" />}
                    {pf.status === "pending" && <FileText className="h-4 w-4 text-gray-400" />}
                  </div>
                  <div className="min-w-0 flex-1 space-y-1.5">
                    <p className="truncate text-[14px] font-bold text-gray-800">{pf.file.name}</p>
                    {pf.status === "error" && <p className="text-[13px] text-red-500 font-medium">{pf.errorMsg}</p>}
                    {pf.status === "pending" && (
                      <select value={pf.category} onChange={(e) => updateCategory(pf.id, e.target.value)}
                        className="w-full rounded-xl border-2 border-gray-200 bg-white px-3 py-2 text-[13px] font-medium text-gray-700 focus:border-emerald-400 focus:outline-none">
                        {CATEGORY_NAMES.map((c) => <option key={c} value={c}>{c}</option>)}
                      </select>
                    )}
                    {pf.status === "done" && <p className="text-[13px] font-bold text-emerald-700">Saved to "{pf.category}"</p>}
                    {pf.status === "uploading" && <p className="text-[13px] text-sky-600 font-medium">Uploading to "{pf.category}"…</p>}
                  </div>
                  {(pf.status === "pending" || pf.status === "error") && (
                    <button type="button" onClick={() => removeFile(pf.id)} className="mt-0.5 shrink-0 text-gray-300 hover:text-red-400 transition-colors">
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Modal footer */}
        <div className="flex items-center justify-between gap-3 border-t border-gray-100 bg-gray-50/80 px-5 py-4">
          <button type="button" onClick={handleClose} disabled={isUploading}
            className="text-[14px] font-semibold text-gray-500 hover:text-gray-700 disabled:opacity-40">
            {allDone ? "Close" : "Cancel"}
          </button>
          <div className="flex items-center gap-3">
            {pendingFiles.length > 0 && !allDone && doneCount > 0 && (
              <span className="text-[13px] text-gray-400 font-medium">{doneCount}/{pendingFiles.length} done</span>
            )}
            <button type="button" onClick={uploadAll} disabled={pendingCount === 0 || isUploading}
              className={`inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-[14px] font-bold transition-all ${
                pendingCount > 0 && !isUploading
                  ? "bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm"
                  : "cursor-not-allowed bg-gray-100 text-gray-400"
              }`}>
              {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              {isUploading ? "Uploading…" : pendingCount === 0 && allDone ? "All Done ✓" : `Upload ${pendingCount} File${pendingCount !== 1 ? "s" : ""}`}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

/* ═══════════════════════════════════════════════════════ */
/*              EmploymentContractPage (always editable)  */
/* ═══════════════════════════════════════════════════════ */
export const EmploymentContractPage = ({
  mode = "view",
}: {
  mode?: EmploymentContractPageMode;
}) => {
  const { refCode } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const isCreateMode = mode === "create";
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
  const [selectedMaidExperience, setSelectedMaidExperience] = useState("");
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
    caseReferenceNumber: isCreateMode ? DEFAULT_CASE_REFERENCE_NUMBER : refCode || "",
    contractDate: todayIsoDate(),
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
  const [selectedDocs, setSelectedDocs] = useState<Set<string>>(new Set());

  const uploadedDocuments = useMemo(() => Object.values(categoryUploads).flat(), [categoryUploads]);
  const docKey = (file: UploadedFile) => `${file.category}||${file.name}`;
  const allDocKeys = useMemo(() => uploadedDocuments.map(docKey), [uploadedDocuments]);
  const allSelected = allDocKeys.length > 0 && allDocKeys.every((k) => selectedDocs.has(k));

  const toggleDoc = (key: string) =>
    setSelectedDocs((prev) => { const next = new Set(prev); if (next.has(key)) next.delete(key); else next.add(key); return next; });

  const handleSelectAll = () => setSelectedDocs(allSelected ? new Set() : new Set(allDocKeys));

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
      name: toText(selectedMaid.fullName),
      nationality: toText(selectedMaid.nationality),
      passportNo: getMaidPassportNo(selectedMaid),
      salary: toText(introduction.expectedSalary),
      numberOfOffDays: toText(skillsPreferences.offDaysPerMonth),
      compensationNoOffday: toText(introduction.offdayCompensation),
      photoDataUrl: toText(selectedMaid.photoDataUrl),
      photoDataUrls: Array.isArray(selectedMaid.photoDataUrls)
        ? selectedMaid.photoDataUrls.filter((item): item is string => typeof item === "string")
        : [],
    }));
    setAgency((current) => ({ ...current, maidId: selectedMaid.id ? String(selectedMaid.id) : current.maidId }));
    setSelectedMaidExperience(getMaidExperienceLabel(selectedMaid));
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
        if (r.maid) {
          const maidRecord = r.maid as Record<string, unknown>;
          setMaid((p) => ({
            ...p, ...(r.maid as typeof maid),
            name: toText(maidRecord.name ?? maidRecord.fullName),
            compensationNoOffday: toText(maidRecord.compensationNoOffday ?? maidRecord.compensationForOffDay),
            passportOfMaid: toText(maidRecord.passportOfMaid ?? maidRecord.passportOfReplacement),
          }));
          const savedName = toText(maidRecord.name ?? maidRecord.fullName);
          const savedRef = toText(maidRecord.referenceCode);
          if (savedName || savedRef) setMaidSearch(savedName && savedRef ? `${savedName} (${savedRef})` : savedName || savedRef);
        }
        if (r.agency) {
          const agencyRecord = r.agency as Record<string, unknown>;
          const norm = normalizeEmploymentDateParts(toText(agencyRecord.dateOfEmployment));
          setAgency((p) => ({
            ...p, ...(r.agency as typeof agency),
            dateOfEmploymentDay: toText(agencyRecord.dateOfEmploymentDay) || norm.day,
            dateOfEmploymentMonth: toText(agencyRecord.dateOfEmploymentMonth) || norm.month,
            dateOfEmploymentYear: toText(agencyRecord.dateOfEmploymentYear) || norm.year,
          }));
        }
        if (r.employer) {
          const empRecord = r.employer as Record<string, unknown>;
          setEmployer((p) => ({ ...p, ...(r.employer as typeof employer), monthlyContribution: toText(empRecord.monthlyContribution) || toText(empRecord.monthlyCombinedIncome) }));
          if (!r.notificationDate) {
            const nd = parseNotificationOfAssessment(toText(empRecord.notificationOfAssessment));
            if (nd.month || nd.year) setNotificationDate(nd);
          }
        }
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
          setCategoryUploads(r.documents.reduce<Record<string, UploadedFile[]>>((acc, doc) => {
            const cat = toText(doc.category); const url = toText(doc.fileUrl); const name = toText(doc.fileName);
            if (!cat || !url || !name) return acc;
            acc[cat] = [...(acc[cat] ?? []), { category: cat, url, name }];
            return acc;
          }, {}));
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
    if (term.length < 2) { setMaidResults([]); return; }
    let cancelled = false;
    const controller = new AbortController();
    const loadMaids = async () => {
      try {
        setMaidSearchLoading(true);
        const response = await fetch(`/api/maids?search=${encodeURIComponent(term)}`, { signal: controller.signal });
        const data = (await response.json().catch(() => ({}))) as { maids?: MaidSearchResult[] };
        if (!response.ok || !Array.isArray(data.maids)) throw new Error("Failed to search maids");
        if (!cancelled) setMaidResults(data.maids.slice(0, 8));
      } catch (error) {
        if (controller.signal.aborted) return;
        if (!cancelled) setMaidResults([]);
      } finally { if (!cancelled) setMaidSearchLoading(false); }
    };
    void loadMaids();
    return () => { cancelled = true; controller.abort(); };
  }, [maidSearch]);

  useEffect(() => {
    if (hasStepQuery) { setActiveStep(requestedStep as 1 | 2 | 3 | 4); return; }
    if (isCreateMode) setActiveStep(1);
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
    setCategoryUploads((p) => { const m = { ...p }; for (const [c, fs] of Object.entries(by)) m[c] = [...(m[c] ?? []), ...fs]; return m; });
  };

  const transformFamilyMembers = (members: typeof familyMembers) =>
    members.map(({ name, relationship, dateOfBirthDay: day, dateOfBirthMonth: month, dateOfBirthYear: year }) => ({
      name, type: ['Daughter', 'Son'].includes(relationship) ? 'child' : 'parent' as const,
      relationship, dateOfBirth: `${day.padStart(2,'0')}-${month.padStart(2,'0')}-${year}`,
    }));

  const submitContract = async () => {
    if (isSubmitting) return;
    if (!employer.name.trim()) { toast.error("Employer name is required"); return; }
    try {
      setIsSubmitting(true);
      const body = {
        refCode: refCode || agency.caseReferenceNumber || null,
        maid, agency, employer, spouse, familyMembers, notificationDate,
        documents: uploadedDocuments.map((f) => ({ category: f.category, fileUrl: f.url, fileName: f.name })),
      };
      const r = await fetch("/api/employers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const d = (await r.json().catch(() => ({}))) as { error?: string; employer?: { refCode?: string } };
      if (!r.ok || !d.employer?.refCode) throw new Error(d.error || "Failed to save employer contract");
      toast.success("Employer contract saved successfully!");
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
      toast.success(skippedCount > 0 ? `Merged PDF downloaded. Skipped ${skippedCount} non-PDF file${skippedCount === 1 ? "" : "s"}.` : "Merged PDF downloaded");
    } catch (e) { toast.error(e instanceof Error ? e.message : "Failed to download forms"); }
  };

  const handlePrintForms = async () => {
    if (!uploadedDocuments.length) { toast.error("Upload at least one document first"); return; }
    try {
      const { skippedCount } = await printMergedEmployerPdf(uploadedDocuments, { maid, agency, employer, spouse, familyMembers: transformFamilyMembers(familyMembers), notificationDate });
      toast.success(skippedCount > 0 ? `Print preview opened. Skipped ${skippedCount} non-PDF file${skippedCount === 1 ? "" : "s"}.` : "Print preview opened");
    } catch (e) { toast.error(e instanceof Error ? e.message : "Failed to print forms"); }
  };

  const ordinal = (n: number) => ["1st","2nd","3rd","4th","5th","6th","7th","8th","9th","10th"][n - 1] ?? `${n}th`;
  const maidPhoto = useMemo(() => getPrimaryPhoto(maid as unknown as Record<string, unknown>), [maid]);
  const displayReferenceNumber = isCreateMode ? agency.caseReferenceNumber : refCode || agency.caseReferenceNumber;

  const showStepOne = !showStepTabs || activeStep === 1;
  const showStepTwo = !showStepTabs || activeStep === 2;
  const showStepThree = !showStepTabs || activeStep === 3;
  const showStepFour = !showStepTabs || activeStep === 4;

  const stepItems: Array<{ id: 1 | 2 | 3 | 4; label: string; icon: React.ReactNode; color: string }> = [
    { id: 1, label: "Maid Details",   icon: <User className="h-4 w-4" />,      color: "emerald" },
    { id: 2, label: "Agency Info",    icon: <Building2 className="h-4 w-4" />, color: "sky" },
    { id: 3, label: "Employer Info",  icon: <Home className="h-4 w-4" />,      color: "violet" },
    { id: 4, label: "Upload Forms",   icon: <FilePlus2 className="h-4 w-4" />, color: "amber" },
  ];

  /* ── loading / error ── */
  if (isLoading) return (
    <div className="flex min-h-[40vh] items-center justify-center gap-3">
      <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
      <span className="text-[16px] font-semibold text-gray-500">Loading employment contract…</span>
    </div>
  );

  if (loadError) return (
    <div className="mx-auto max-w-2xl p-6">
      <div className="flex items-start gap-3 rounded-2xl border-2 border-red-100 bg-red-50 p-5">
        <AlertCircle className="h-6 w-6 shrink-0 text-red-500 mt-0.5" />
        <div>
          <p className="text-[16px] font-bold text-red-700">Failed to load contract</p>
          <p className="text-[14px] text-red-600 mt-1">{loadError}</p>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap');
        .ecp-root, .ecp-root * { font-family: 'DM Sans', sans-serif; }
        @keyframes ecpFadeUp {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .ecp-section { animation: ecpFadeUp 0.28s cubic-bezier(0.16,1,0.3,1) both; }
      `}</style>

      <div className="ecp-root max-w-4xl mx-auto px-4 py-5 space-y-5">

        {/* ── Breadcrumb ── */}
        <Link to={adminPath("/employment-contracts")}
          className="inline-flex items-center gap-1.5 text-[14px] font-semibold text-emerald-700 hover:text-emerald-800 hover:underline transition-colors">
          <ChevronLeft className="h-4 w-4" /> Back to Employment Listing
        </Link>

        {/* ── Page header ── */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 shadow-lg">
              <FileText className="h-7 w-7 text-white" />
            </div>
            <div>
              <h2 className="text-[22px] font-bold text-gray-900 leading-tight">
                {isCreateMode ? "Add New Employment Contract" : "Employment Contract Form"}
              </h2>
              <p className="text-[14px] text-gray-500 font-medium mt-0.5">
                Reference:{" "}
                <span className="font-bold text-emerald-700">{displayReferenceNumber || "—"}</span>
              </p>
            </div>
          </div>

          {/* Save button always visible */}
          <button
            type="button"
            onClick={() => void submitContract()}
            disabled={isSubmitting}
            className="inline-flex items-center gap-2 rounded-2xl bg-emerald-600 px-6 py-3 text-[15px] font-bold text-white shadow-md hover:bg-emerald-700 active:scale-95 disabled:opacity-50 disabled:cursor-default transition-all"
          >
            {isSubmitting ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />}
            {isSubmitting ? "Saving…" : isCreateMode ? "Save Contract" : "Save Changes"}
          </button>
        </div>

        {/* ── Step tabs ── */}
        {showStepTabs && (
          <div className="flex flex-wrap gap-2 rounded-2xl border border-gray-200 bg-gray-50 p-2.5">
            {stepItems.map((step) => {
              const isActive = activeStep === step.id;
              const colorMap: Record<string, string> = {
                emerald: isActive ? "bg-emerald-600 text-white shadow-sm" : "text-gray-500 hover:bg-emerald-50 hover:text-emerald-700",
                sky:     isActive ? "bg-sky-600 text-white shadow-sm"     : "text-gray-500 hover:bg-sky-50 hover:text-sky-700",
                violet:  isActive ? "bg-violet-600 text-white shadow-sm"  : "text-gray-500 hover:bg-violet-50 hover:text-violet-700",
                amber:   isActive ? "bg-amber-500 text-white shadow-sm"   : "text-gray-500 hover:bg-amber-50 hover:text-amber-700",
              };
              return (
                <button
                  key={step.id}
                  type="button"
                  onClick={() => setActiveStep(step.id)}
                  className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-[14px] font-bold transition-all ${colorMap[step.color]}`}
                >
                  <span className={`flex h-6 w-6 items-center justify-center rounded-full text-[12px] font-black ${isActive ? "bg-white/20" : "bg-gray-200"}`}>
                    {step.id}
                  </span>
                  {step.label}
                </button>
              );
            })}
          </div>
        )}

        {/* ═══ STEP 1: MAID ═══ */}
        {showStepOne && (
          <div className="ecp-section space-y-4">
            <SectionCard title="The Maid Employed" icon={<User className="h-4 w-4 text-white" />} color="emerald">

              {/* Maid search */}
              <div className="mb-5 flex gap-2.5">
                <div className="relative flex-1">
                  <input
                    className={`${inp} pr-4`}
                    value={maidSearch}
                    onChange={(e) => { setMaidSearch(e.target.value); setShowMaidResults(true); }}
                    onFocus={() => setShowMaidResults(true)}
                    placeholder="Search maid by name or reference code…"
                  />
                  {showMaidResults && maidSearch.trim().length > 0 && (
                    <div className="absolute left-0 right-0 top-full z-30 mt-2 max-h-72 overflow-y-auto rounded-2xl border-2 border-gray-200 bg-white shadow-xl">
                      {maidSearch.trim().length < 2 ? (
                        <div className="px-4 py-3 text-[14px] text-gray-400">Type at least 2 characters…</div>
                      ) : maidSearchLoading ? (
                        <div className="flex items-center gap-2 px-4 py-3 text-[14px] text-gray-400">
                          <Loader2 className="h-4 w-4 animate-spin" /> Searching maids…
                        </div>
                      ) : maidResults.length === 0 ? (
                        <div className="px-4 py-3 text-[14px] text-gray-400">No maids found.</div>
                      ) : (
                        maidResults.map((result) => (
                          <button
                            key={`${result.referenceCode}-${result.id ?? "maid"}`}
                            type="button"
                            className="flex w-full items-start gap-3 border-b border-gray-100 px-4 py-3 text-left last:border-b-0 hover:bg-emerald-50 transition-colors"
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => applyMaidResult(result)}
                          >
                            <div className="h-14 w-11 overflow-hidden rounded-xl border border-gray-200 bg-gray-50 shrink-0">
                              {getPrimaryPhoto(result as unknown as Record<string, unknown>) ? (
                                <img src={getPrimaryPhoto(result as unknown as Record<string, unknown>)} alt={result.fullName} className="h-full w-full object-cover" />
                              ) : (
                                <div className="flex h-full w-full items-center justify-center text-gray-300">
                                  <User className="h-5 w-5" />
                                </div>
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-[15px] font-bold text-gray-900 truncate">{result.fullName || "Unnamed maid"}</p>
                              <p className="text-[13px] text-gray-500 mt-0.5">
                                {result.nationality || "Unknown"} · {getMaidExperienceLabel(result)} exp
                              </p>
                              <p className="text-[13px] text-emerald-700 font-semibold">
                                Ref: {result.referenceCode || "N/A"} · Salary: {toText((result.introduction as Record<string, unknown> | undefined)?.expectedSalary) || "—"}
                              </p>
                            </div>
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setShowMaidResults(true)}
                  className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-[14px] font-bold text-white hover:bg-emerald-700 transition-colors shadow-sm"
                >
                  <Search className="h-4 w-4" /> Search
                </button>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_140px]">
                <div className="space-y-2">
                  <Field label="Maid's Full Name">
                    <input className={inp} value={maid.name} onChange={(e) => setMaid({ ...maid, name: e.target.value })} placeholder="Full name as per passport" />
                  </Field>
                  <Field label="Nationality">
                    <Select value={maid.nationality || undefined} onValueChange={(v) => setMaid({ ...maid, nationality: v })}>
                      <SelectTrigger className={`${selTrigger} w-52`}><SelectValue placeholder="Select nationality" /></SelectTrigger>
                      <SelectContent>
                        {["Filipino maid","Indian maid","Indonesian maid","Myanmar maid","Sri Lankan maid"].map((n) => (
                          <SelectItem key={n} value={n}>{n}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field label="Work Permit No.">
                    <input className={`${inp} max-w-[220px]`} value={maid.workPermitNo} onChange={(e) => setMaid({ ...maid, workPermitNo: e.target.value })} placeholder="e.g. G1234567P" />
                  </Field>
                  <Field label="FIN No.">
                    <input className={`${inp} max-w-[220px]`} value={maid.finNo} onChange={(e) => setMaid({ ...maid, finNo: e.target.value })} placeholder="e.g. G1234567P" />
                  </Field>
                  <Field label="Passport No.">
                    <input className={`${inp} max-w-[220px]`} value={maid.passportNo} onChange={(e) => setMaid({ ...maid, passportNo: e.target.value })} placeholder="Passport number" />
                  </Field>
                  <Field label="Monthly Salary">
                    <input className={`${inp} max-w-[200px]`} value={maid.salary} onChange={(e) => setMaid({ ...maid, salary: e.target.value })} placeholder="e.g. $800" />
                  </Field>
                  <Field label="Number of Off-days">
                    <input className={`${inp} max-w-[200px]`} value={maid.numberOfOffDays} onChange={(e) => setMaid({ ...maid, numberOfOffDays: e.target.value })} placeholder="e.g. 4" />
                  </Field>
                  <Field label="Compensation (No Offday)">
                    <input className={`${inp} max-w-[200px]`} value={maid.compensationNoOffday} onChange={(e) => setMaid({ ...maid, compensationNoOffday: e.target.value })} placeholder="0" />
                  </Field>
                  <Field label="Name of Maid Replaced">
                    <input className={inp} value={maid.nameOfReplacement} onChange={(e) => setMaid({ ...maid, nameOfReplacement: e.target.value })} placeholder="Previous maid's name (if applicable)" />
                  </Field>
                  <Field label="Passport of Maid Replaced">
                    <input className={inp} value={maid.passportOfMaid} onChange={(e) => setMaid({ ...maid, passportOfMaid: e.target.value })} placeholder="Previous maid's passport no." />
                  </Field>
                </div>

                {/* Photo */}
                <div className="flex flex-col items-center pt-1">
                  <div className="overflow-hidden rounded-2xl border-2 border-gray-200 bg-gray-50 shadow-sm" style={{ width: 130, height: 160 }}>
                    {maidPhoto ? (
                      <img src={maidPhoto} alt={maid.name} className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full flex-col items-center justify-center text-gray-300">
                        <User className="h-10 w-10" />
                        <span className="mt-2 text-[12px] text-gray-400 font-medium">No photo</span>
                      </div>
                    )}
                  </div>
                  {maid.referenceCode && (
                    <span className="mt-2 rounded-xl bg-emerald-100 px-3 py-1 text-[12px] font-bold text-emerald-800">
                      Ref: {maid.referenceCode}
                    </span>
                  )}
                </div>
              </div>
            </SectionCard>

            {showStepTabs && (
              <div className="flex justify-end">
                <button onClick={() => setActiveStep(2)} className="inline-flex items-center gap-2 rounded-xl bg-sky-600 px-5 py-2.5 text-[14px] font-bold text-white hover:bg-sky-700 transition-colors">
                  Next: Agency Info <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>
        )}

        {/* ═══ STEP 2: AGENCY ═══ */}
        {showStepTwo && (
          <div className="ecp-section space-y-4">
            <SectionCard title="Agency Information" icon={<Building2 className="h-4 w-4 text-white" />} color="sky">
              <div className="space-y-2">
                <Field label="Case Reference Number">
                  <input className={`${inp} max-w-[180px]`} value={agency.caseReferenceNumber} onChange={(e) => setAgency({ ...agency, caseReferenceNumber: e.target.value })} placeholder="e.g. 06583" />
                </Field>
                <Field label="Contract Date">
                  <input className={`${inp} max-w-[180px]`} value={agency.contractDate} onChange={(e) => setAgency({ ...agency, contractDate: e.target.value })} placeholder="YYYY-MM-DD" />
                </Field>
                <Field label="Date of Employment">
                  <DatePicker
                    day={agency.dateOfEmploymentDay} month={agency.dateOfEmploymentMonth} year={agency.dateOfEmploymentYear}
                    onDay={(v) => setAgency({ ...agency, dateOfEmploymentDay: v })}
                    onMonth={(v) => setAgency({ ...agency, dateOfEmploymentMonth: v })}
                    onYear={(v) => setAgency({ ...agency, dateOfEmploymentYear: v })}
                  />
                </Field>

                {/* Fee box */}
                <div className="mt-3 rounded-2xl border-2 border-sky-100 bg-sky-50 p-4 space-y-2">
                  <p className="text-[13px] font-bold uppercase tracking-wider text-sky-700 mb-3">Fee Breakdown</p>
                  {[
                    { label: "Invoice Number", key: "invoiceNumber", ph: "1" },
                    { label: "Service Fee", key: "serviceFee", ph: "$0.00" },
                    { label: "Deposit", key: "deposit", ph: "$0.00" },
                    { label: "SIP Fee", key: "sipFee", ph: "$0.00" },
                    { label: "Medical Fee", key: "medicalFee", ph: "$0.00" },
                    { label: "Transport Fee", key: "transportFee", ph: "$0.00" },
                    { label: "Document Fee", key: "documentFee", ph: "$0.00" },
                  ].map(({ label, key, ph }) => (
                    <Field key={key} label={label}>
                      <input className={`${inp} max-w-[180px] bg-white`} value={agency[key as keyof typeof agency] as string}
                        onChange={(e) => setAgency({ ...agency, [key]: e.target.value })} placeholder={ph} />
                    </Field>
                  ))}
                </div>

                <Field label="Placement Fee (Maid Loan)">
                  <input className={`${inp} max-w-[180px]`} value={agency.placementFee} onChange={(e) => setAgency({ ...agency, placementFee: e.target.value })} placeholder="$0.00" />
                </Field>
                <Field label="Insurance Fee">
                  <input className={`${inp} max-w-[180px]`} value={agency.insuranceFee} onChange={(e) => setAgency({ ...agency, insuranceFee: e.target.value })} placeholder="$0.00" />
                </Field>
                <Field label="Agency Witness">
                  <Select value={agency.agencyWitness || undefined} onValueChange={(v) => setAgency({ ...agency, agencyWitness: v })}>
                    <SelectTrigger className={selTrigger}><SelectValue placeholder="Select witness" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Balamurugan S/O Subramaniam (R1218275)">Balamurugan S/O Subramaniam (R1218275)</SelectItem>
                      <SelectItem value="Rahimunisha Binti Muhammadhan (R1107570)">Rahimunisha Binti Muhammadhan (R1107570)</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
              </div>
            </SectionCard>

            {showStepTabs && (
              <div className="flex justify-between">
                <button onClick={() => setActiveStep(1)} className="inline-flex items-center gap-2 rounded-xl border-2 border-gray-200 bg-white px-5 py-2.5 text-[14px] font-bold text-gray-700 hover:bg-gray-50 transition-colors">
                  <ChevronLeft className="h-4 w-4" /> Back
                </button>
                <button onClick={() => setActiveStep(3)} className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-5 py-2.5 text-[14px] font-bold text-white hover:bg-violet-700 transition-colors">
                  Next: Employer Info <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>
        )}

        {/* ═══ STEP 3: EMPLOYER, SPOUSE, FAMILY ═══ */}
        {showStepThree && (
          <div className="ecp-section space-y-4">
            <SectionCard title="Employer Details" icon={<User className="h-4 w-4 text-white" />} color="violet">
              <div className="space-y-2">
                <Field label="Full Name" required>
                  <input className={inp} value={employer.name} onChange={(e) => setEmployer({ ...employer, name: e.target.value })} placeholder="Employer's full legal name" />
                </Field>
                <Field label="Gender">
                  <RadioGroup name="emp-gender" options={["Male","Female"]} value={employer.gender} onChange={(v) => setEmployer({ ...employer, gender: v })} />
                </Field>
                <Field label="Date of Birth">
                  <DatePicker day={employer.dateOfBirthDay} month={employer.dateOfBirthMonth} year={employer.dateOfBirthYear}
                    onDay={(v) => setEmployer({ ...employer, dateOfBirthDay: v })}
                    onMonth={(v) => setEmployer({ ...employer, dateOfBirthMonth: v })}
                    onYear={(v) => setEmployer({ ...employer, dateOfBirthYear: v })} />
                </Field>
                <Field label="Nationality">
                  <Select value={employer.nationality || undefined} onValueChange={(v) => setEmployer({ ...employer, nationality: v })}>
                    <SelectTrigger className={`${selTrigger} w-56`}><SelectValue placeholder="Select nationality" /></SelectTrigger>
                    <SelectContent>{NATIONALITY_OPTIONS.map((n) => <SelectItem key={n} value={n}>{n}</SelectItem>)}</SelectContent>
                  </Select>
                </Field>
                <Field label="Residential Status">
                  <Select value={employer.residentialStatus || undefined} onValueChange={(v) => setEmployer({ ...employer, residentialStatus: v })}>
                    <SelectTrigger className={`${selTrigger} w-64`}><SelectValue placeholder="Select status" /></SelectTrigger>
                    <SelectContent>
                      {["Singapore Citizen","Singapore Permanent Resident","Employment Pass","S Pass","Work Permit"].map((s) => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="NRIC / FIN / Passport">
                  <input className={`${inp} max-w-[200px]`} value={employer.nric} onChange={(e) => setEmployer({ ...employer, nric: e.target.value })} placeholder="e.g. S1234567A" />
                </Field>
                <Field label="Address (Line 1)">
                  <input className={inp} value={employer.addressLine1} onChange={(e) => setEmployer({ ...employer, addressLine1: e.target.value })} placeholder="Street address, unit no." />
                </Field>
                <Field label="Address (Line 2)">
                  <input className={inp} value={employer.addressLine2} onChange={(e) => setEmployer({ ...employer, addressLine2: e.target.value })} placeholder="Block / building name (optional)" />
                </Field>
                <Field label="Postal Code">
                  <input className={`${inp} max-w-[140px]`} value={employer.postalCode} onChange={(e) => setEmployer({ ...employer, postalCode: e.target.value })} placeholder="6-digit code" />
                </Field>
                <Field label="Type of Residence">
                  <div className="flex flex-wrap gap-2 pt-1">
                    {["HDB 2-ROOM","HDB 3-ROOM","HDB 4-ROOM","HDB 5-ROOM","HDB Executive","Condo","Terrace","Bungalow"].map((t) => (
                      <label key={t} className={`flex cursor-pointer items-center gap-2 rounded-xl border-2 px-3 py-2 text-[13px] font-semibold transition-all ${
                        employer.typeOfResidence === t ? "border-violet-400 bg-violet-50 text-violet-800" : "border-gray-200 text-gray-600 hover:border-gray-300 bg-gray-50"
                      }`}>
                        <input type="radio" name="residence" checked={employer.typeOfResidence === t} onChange={() => setEmployer({ ...employer, typeOfResidence: t })} className="sr-only" />
                        {employer.typeOfResidence === t && <Check className="h-3 w-3 text-violet-600" />}
                        {t}
                      </label>
                    ))}
                  </div>
                </Field>
                <Field label="Occupation">
                  <input className={inp} value={employer.occupation} onChange={(e) => setEmployer({ ...employer, occupation: e.target.value })} placeholder="e.g. Manager" />
                </Field>
                <Field label="Company Name">
                  <input className={inp} value={employer.company} onChange={(e) => setEmployer({ ...employer, company: e.target.value })} placeholder="Company name" />
                </Field>
                <Field label="Email Address">
                  <input type="email" className={inp} value={employer.email} onChange={(e) => setEmployer({ ...employer, email: e.target.value })} placeholder="email@example.com" />
                </Field>
                <Field label="Residential Phone">
                  <input className={`${inp} max-w-[220px]`} value={employer.residentialPhone} onChange={(e) => setEmployer({ ...employer, residentialPhone: e.target.value })} placeholder="e.g. 64643212" />
                </Field>
                <Field label="Handphone Number">
                  <input className={`${inp} max-w-[220px]`} value={employer.mobileNumber} onChange={(e) => setEmployer({ ...employer, mobileNumber: e.target.value })} placeholder="e.g. 91234567" />
                </Field>
                <Field label="Monthly Combined Income">
                  <Select value={employer.monthlyContribution || undefined} onValueChange={(v) => setEmployer({ ...employer, monthlyContribution: v })}>
                    <SelectTrigger className={`${selTrigger} w-56`}><SelectValue placeholder="-- Select --" /></SelectTrigger>
                    <SelectContent>{INCOME_OPTIONS.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
                  </Select>
                </Field>
                <Field label="Notification of Assessment" hint="Based on Annual Income or Bank Statement">
                  <div className="flex flex-wrap items-center gap-2">
                    <Select value={notificationDate.year || undefined} onValueChange={(v) => setNotificationDate({ ...notificationDate, year: v })}>
                      <SelectTrigger className={`${selTrigger} w-28`}><SelectValue placeholder="Year" /></SelectTrigger>
                      <SelectContent>{Array.from({ length: 20 }, (_, i) => <SelectItem key={i} value={String(2010 + i)}>{2010 + i}</SelectItem>)}</SelectContent>
                    </Select>
                    <Select value={notificationDate.month || undefined} onValueChange={(v) => setNotificationDate({ ...notificationDate, month: v })}>
                      <SelectTrigger className={`${selTrigger} w-40`}><SelectValue placeholder="-- Select Month --" /></SelectTrigger>
                      <SelectContent>{MONTHS.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                </Field>
                <Field label="Existing Employer">
                  <input className={inp} value={employer.existingEmployer} onChange={(e) => setEmployer({ ...employer, existingEmployer: e.target.value })} placeholder="Previous employer name (if any)" />
                </Field>
                <Field label="Existing Employer NRIC">
                  <input className={inp} value={employer.existingEmployerNric} onChange={(e) => setEmployer({ ...employer, existingEmployerNric: e.target.value })} placeholder="e.g. S1234567A" />
                </Field>
              </div>
            </SectionCard>

            {/* Spouse */}
            <SectionCard title="Spouse Details" icon={<Users className="h-4 w-4 text-white" />} color="violet">
              <div className="space-y-2">
                <Field label="Spouse's Full Name">
                  <input className={inp} value={spouse.name} onChange={(e) => setSpouse({ ...spouse, name: e.target.value })} placeholder="Full legal name" />
                </Field>
                <Field label="Gender">
                  <RadioGroup name="sp-gender" options={["Male","Female"]} value={spouse.gender} onChange={(v) => setSpouse({ ...spouse, gender: v })} />
                </Field>
                <Field label="Date of Birth">
                  <DatePicker day={spouse.dateOfBirthDay} month={spouse.dateOfBirthMonth} year={spouse.dateOfBirthYear}
                    onDay={(v) => setSpouse({ ...spouse, dateOfBirthDay: v })}
                    onMonth={(v) => setSpouse({ ...spouse, dateOfBirthMonth: v })}
                    onYear={(v) => setSpouse({ ...spouse, dateOfBirthYear: v })} />
                </Field>
                <Field label="Nationality">
                  <Select value={spouse.nationality || undefined} onValueChange={(v) => setSpouse({ ...spouse, nationality: v })}>
                    <SelectTrigger className={`${selTrigger} w-56`}><SelectValue placeholder="Select nationality" /></SelectTrigger>
                    <SelectContent>{NATIONALITY_OPTIONS.map((n) => <SelectItem key={n} value={n}>{n}</SelectItem>)}</SelectContent>
                  </Select>
                </Field>
                <Field label="Residential Status">
                  <Select value={spouse.residentialStatus || undefined} onValueChange={(v) => setSpouse({ ...spouse, residentialStatus: v })}>
                    <SelectTrigger className={`${selTrigger} w-64`}><SelectValue placeholder="Select status" /></SelectTrigger>
                    <SelectContent>
                      {["Singapore Citizen","Singapore Permanent Resident","Employment Pass","S Pass","Work Permit"].map((s) => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Spouse NRIC / FIN / PP">
                  <input className={`${inp} max-w-[200px]`} value={spouse.nric} onChange={(e) => setSpouse({ ...spouse, nric: e.target.value })} placeholder="e.g. S1234567B" />
                </Field>
                <Field label="Occupation">
                  <input className={inp} value={spouse.occupation} onChange={(e) => setSpouse({ ...spouse, occupation: e.target.value })} placeholder="e.g. Housewife" />
                </Field>
                <Field label="Company Name">
                  <input className={inp} value={spouse.company} onChange={(e) => setSpouse({ ...spouse, company: e.target.value })} placeholder="Company name (if applicable)" />
                </Field>
              </div>
            </SectionCard>

            {/* Family members */}
            {familyMembers.map((fm, idx) => (
              <SectionCard
                key={idx}
                title={`${ordinal(idx + 1)} Family Member`}
                icon={<User className="h-4 w-4 text-white" />}
                color="amber"
                action={
                  familyMembers.length > 1 ? (
                    <button type="button" onClick={() => removeFamilyMember(idx)}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-white/20 px-3 py-1.5 text-[13px] font-bold text-white hover:bg-white/30 transition-colors">
                      <X className="h-3.5 w-3.5" /> Remove
                    </button>
                  ) : undefined
                }
              >
                <div className="space-y-2">
                  <Field label="Full Name">
                    <input className={inp} value={fm.name} onChange={(e) => updateFamilyMember(idx, "name", e.target.value)} placeholder="Full name" />
                  </Field>
                  <Field label="Relationship">
                    <div className="flex flex-wrap gap-2 pt-1">
                      {["Daughter","Son","Father","Mother","Father-in-Law","Mother-in-Law"].map((opt) => (
                        <label key={opt} className={`flex cursor-pointer items-center gap-2 rounded-xl border-2 px-3 py-2 text-[13px] font-semibold transition-all ${
                          fm.relationship === opt ? "border-amber-400 bg-amber-50 text-amber-800" : "border-gray-200 text-gray-600 hover:border-gray-300 bg-gray-50"
                        }`}>
                          <input type="radio" name={`fm-type-${idx}`} checked={fm.relationship === opt} onChange={() => updateFamilyMember(idx, "relationship", opt)} className="sr-only" />
                          {fm.relationship === opt && <Check className="h-3 w-3 text-amber-600" />}
                          {opt}
                        </label>
                      ))}
                    </div>
                  </Field>
                  <Field label="Birth Cert / IC / FIN">
                    <input className={inp} value={fm.birthCertIcFin} onChange={(e) => updateFamilyMember(idx, "birthCertIcFin", e.target.value)} placeholder="ID number" />
                  </Field>
                  <Field label="Date of Birth">
                    <DatePicker day={fm.dateOfBirthDay} month={fm.dateOfBirthMonth} year={fm.dateOfBirthYear}
                      onDay={(v) => updateFamilyMember(idx, "dateOfBirthDay", v)}
                      onMonth={(v) => updateFamilyMember(idx, "dateOfBirthMonth", v)}
                      onYear={(v) => updateFamilyMember(idx, "dateOfBirthYear", v)} />
                  </Field>
                </div>
              </SectionCard>
            ))}

            <button type="button" onClick={addFamilyMember}
              className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-amber-300 bg-amber-50 px-4 py-3.5 text-[14px] font-bold text-amber-700 hover:bg-amber-100 transition-colors">
              <Plus className="h-4 w-4" /> Add Family Member
            </button>

            {/* Save button */}
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-gray-200 bg-gray-50 px-5 py-4">
              <p className="text-[13px] text-gray-400 font-medium">All changes are saved when you click Save Contract</p>
              <div className="flex items-center gap-3">
                {showStepTabs && (
                  <button onClick={() => setActiveStep(2)} className="inline-flex items-center gap-2 rounded-xl border-2 border-gray-200 bg-white px-4 py-2.5 text-[14px] font-bold text-gray-700 hover:bg-gray-50 transition-colors">
                    <ChevronLeft className="h-4 w-4" /> Back
                  </button>
                )}
                <button type="button" onClick={() => void submitContract()} disabled={isSubmitting}
                  className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-6 py-2.5 text-[15px] font-bold text-white shadow-sm hover:bg-emerald-700 active:scale-95 disabled:opacity-50 disabled:cursor-default transition-all">
                  {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  {isSubmitting ? "Saving…" : "Save Contract"}
                </button>
                {showStepTabs && (
                  <button onClick={() => setActiveStep(4)} className="inline-flex items-center gap-2 rounded-xl bg-amber-500 px-5 py-2.5 text-[14px] font-bold text-white hover:bg-amber-600 transition-colors">
                    Next: Upload Forms <ChevronRight className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ═══ STEP 4: DOCUMENTS ═══ */}
        {showStepFour && (
          <div className="ecp-section space-y-4">

            {/* Instructions */}
            <div className="rounded-2xl border-2 border-amber-100 bg-amber-50 p-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-[16px] font-bold text-amber-800 mb-3">4 Steps For Uploading Employer PDF Documents</p>
                  <div className="grid gap-2 text-[14px] text-amber-700 sm:grid-cols-2">
                    {[
                      "Save the employer form first so the contract gets a reference number.",
                      "Search the maid and confirm the preview before uploading files.",
                      "Use bulk upload and choose the required PDF documents only.",
                      "Review the uploaded forms, then select files for download or print.",
                    ].map((step, i) => (
                      <div key={i} className="flex items-start gap-2">
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-500 text-[12px] font-black text-white">{i + 1}</span>
                        <span className="font-medium leading-snug">{step}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <button type="button" onClick={() => setBulkUploadOpen(true)}
                  className="inline-flex items-center gap-2 rounded-xl bg-amber-600 px-5 py-3 text-[14px] font-bold text-white hover:bg-amber-700 shadow-sm transition-colors">
                  <Upload className="h-4 w-4" /> Bulk Upload PDF
                </button>
              </div>
            </div>

            {/* Document categories */}
            <div className="rounded-2xl border-2 border-slate-100 overflow-hidden shadow-sm">
              <div className="bg-gradient-to-r from-slate-600 to-gray-700 px-5 py-3.5 flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/20">
                  <FilePlus2 className="h-4 w-4 text-white" />
                </div>
                <h3 className="text-[16px] font-bold text-white">Documents &amp; Forms</h3>
              </div>
              <div className="bg-white divide-y divide-gray-100 px-5">
                {GENERATED_FORMS.map((cat, i) => {
                  const uploads = categoryUploads[cat.category] ?? [];
                  return (
                    <div key={cat.category} className="py-2.5">
                      <CategoryFileUpload
                        category={cat.category}
                        hasTemplate={cat.hasTemplate}
                        refCode={refCode || agency.caseReferenceNumber || "temp"}
                        uploads={uploads}
                        onUpload={(files) => updateCategoryUploads(cat.category, files)}
                      />
                      {uploads.length > 0 && (
                        <div className="mt-1.5 pl-6 space-y-1">
                          {uploads.map((file) => {
                            const key = docKey(file);
                            return (
                              <label key={key} className="flex cursor-pointer items-center gap-2 text-[13px] text-gray-500 font-medium select-none">
                                <input type="checkbox" checked={selectedDocs.has(key)} onChange={() => toggleDoc(key)} className="h-4 w-4 accent-emerald-600 rounded" />
                                Select for bulk download
                              </label>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <p className="text-center text-[13px] text-gray-400 font-medium">
              PDF forms are for demo purposes only. Contact admin for customization.
            </p>

            {/* Download / print actions */}
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-gray-200 bg-gray-50 px-5 py-4">
              {showStepTabs && (
                <button onClick={() => setActiveStep(3)} className="inline-flex items-center gap-2 rounded-xl border-2 border-gray-200 bg-white px-4 py-2.5 text-[14px] font-bold text-gray-700 hover:bg-gray-50 transition-colors">
                  <ChevronLeft className="h-4 w-4" /> Back
                </button>
              )}
              <div className="flex flex-wrap gap-2.5 ml-auto">
                <button type="button" onClick={handleSelectAll}
                  className="inline-flex items-center gap-2 rounded-xl border-2 border-gray-200 bg-white px-4 py-2.5 text-[14px] font-bold text-gray-700 hover:border-gray-300 transition-colors">
                  {allSelected ? "Deselect All" : "Select All"}
                </button>
                <button type="button" onClick={handleDownloadSelected} disabled={selectedDocs.size === 0}
                  className="inline-flex items-center gap-2 rounded-xl border-2 border-sky-200 bg-sky-50 px-4 py-2.5 text-[14px] font-bold text-sky-700 hover:bg-sky-100 disabled:opacity-40 disabled:cursor-default transition-colors">
                  <Download className="h-4 w-4" />
                  Download Selected
                  {selectedDocs.size > 0 && (
                    <span className="rounded-full bg-sky-200 px-2 py-0.5 text-[12px]">{selectedDocs.size}</span>
                  )}
                </button>
                <button type="button" onClick={() => void handlePrintForms()}
                  className="inline-flex items-center gap-2 rounded-xl border-2 border-violet-200 bg-violet-50 px-4 py-2.5 text-[14px] font-bold text-violet-700 hover:bg-violet-100 transition-colors">
                  <Printer className="h-4 w-4" /> Print All
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <BulkUploadModal
        open={bulkUploadOpen}
        onClose={() => setBulkUploadOpen(false)}
        refCode={refCode || agency.caseReferenceNumber || "temp"}
        onUploadComplete={handleBulkUploadComplete}
      />

      {/* Back to top */}
      {showBackToTop && (
        <button type="button" onClick={scrollToTop}
          className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-2xl bg-emerald-600 px-5 py-3 text-[14px] font-bold text-white shadow-xl hover:bg-emerald-700 active:scale-95 transition-all">
          <ArrowUp className="h-4 w-4" /> Back to Top
        </button>
      )}
    </>
  );
};

export default EmploymentContractPage;