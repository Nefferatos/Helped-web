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
  Eye, Download, Upload, Search, X, Check, Plus, User, Loader2,
  ArrowUp, FileText, FileCheck2, Printer, ChevronRight, ChevronLeft,
  Save, Users, Building2, Home, FilePlus2, AlertCircle, Wand2, Lock,
} from "lucide-react";
import { downloadMergedEmployerPdf, printMergedEmployerPdf } from "@/lib/employerPdf";
import { getAgencyAdminAuthHeaders } from "@/lib/agencyAdminAuth";
import { adminPath } from "@/lib/routes";
import { getExperienceBucket } from "@/lib/maids";

/* ─── types ─── */
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
type MaidSearchResult = {
  id?: string | number;
  referenceCode?: string;
  fullName?: string;
  nationality?: string;
  employmentHistory?: unknown;
  agencyContact?: unknown;
  introduction?: unknown;
  skillsPreferences?: unknown;
  photoDataUrl?: string;
  photoDataUrls?: string[];
  /* NEW: populated by the API when the maid is already assigned */
  assignedEmployerRefCode?: string | null;
  assignedEmployerName?: string | null;
  isAssigned?: boolean;
};
type EmploymentContractPageMode = "create" | "edit" | "view";

/* ─── constants ─── */
const GENERATED_FORMS = [
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
const NATIONALITY_OPTIONS = ["Singaporean","Singapore","Indian","Filipino","Indonesian","Myanmar","Sri Lankan","Bangladeshi","Malaysian","Chinese"];
const INCOME_OPTIONS = ["$1,000 - $1,499","$1,500 - $1,999","$2,000 - $2,499","$2,500 - $2,999","$3,000 - $3,499","$3,500 - $3,999","$4,000 - $4,499","$4,500 - $4,999","$5,000 - $5,499","$5,500 - $5,999","$6,000 and above"];
const MONTHS = ["JANUARY","FEBRUARY","MARCH","APRIL","MAY","JUNE","JULY","AUGUST","SEPTEMBER","OCTOBER","NOVEMBER","DECEMBER"];
const DEFAULT_CASE_REFERENCE_NUMBER = "06583";

/* ─── helpers ─── */
const toText = (v: unknown) => String(v ?? "").trim();
const getPrimaryPhoto = (maid: Record<string, unknown>) => {
  const arr = Array.isArray(maid.photoDataUrls)
    ? maid.photoDataUrls.filter((v): v is string => typeof v === "string" && v.trim().length > 0) : [];
  return arr[0] || toText(maid.photoDataUrl);
};
const todayIsoDate = () => new Date().toISOString().slice(0, 10);
const getMaidExperienceLabel = (maid: MaidSearchResult) => getExperienceBucket(maid as any);
const getMaidPassportNo = (maid: MaidSearchResult) => toText((maid.agencyContact as Record<string, unknown> | undefined)?.passportNo);
const parseNotificationOfAssessment = (value: string) => {
  const parts = value.trim().split(/\s+/);
  if (parts.length < 2) return { month: "", year: "" };
  return { month: parts[0].toUpperCase(), year: parts[1] };
};
const normalizeEmploymentDateParts = (value: string) => {
  const match = value.trim().match(/^(\d{2})-(\d{2})-(\d{4})$/);
  if (match) return { day: match[1], month: match[2], year: match[3] };
  if (/^\d{4}$/.test(value.trim())) return { day: "", month: "", year: value.trim() };
  return { day: "", month: "", year: "" };
};
const fileIdentity = (file: UploadedFile) => `${file.category}::${file.name}::${file.url}`;
const mergeUploadedFiles = (current: UploadedFile[], incoming: UploadedFile[]) => {
  const merged = [...current];
  const seen = new Set(current.map(fileIdentity));
  for (const file of incoming) {
    const key = fileIdentity(file);
    if (!seen.has(key)) { seen.add(key); merged.push(file); }
  }
  return merged;
};

/**
 * Determine if a maid result is already assigned to a DIFFERENT employer.
 * - If editing an existing contract (currentRefCode), the maid already assigned
 *   to that same contract is still selectable.
 * - Any maid whose `isAssigned` flag is true and belongs to a different contract
 *   is blocked.
 */
const isMaidAlreadyAssigned = (
  result: MaidSearchResult,
  currentRefCode: string | undefined
): boolean => {
  if (!result.isAssigned) return false;
  // Allow re-selection if the maid is already on this exact contract
  if (
    currentRefCode &&
    result.assignedEmployerRefCode &&
    result.assignedEmployerRefCode === currentRefCode
  ) {
    return false;
  }
  return true;
};

/* ─── shared styles ─── */
const inp = "h-10 w-full rounded-lg border border-gray-200 bg-gray-50 px-3 text-[13px] text-gray-900 font-medium outline-none transition-all placeholder:text-gray-400 placeholder:font-normal focus:border-emerald-400 focus:bg-white focus:ring-2 focus:ring-emerald-100";
const selTrigger = "h-10 rounded-lg border border-gray-200 bg-gray-50 px-3 text-[13px] text-gray-900 font-medium focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100";

/* ─── Two-column field layout ─── */
function Field2({ label, required, hint, children, half }: {
  label: string; required?: boolean; hint?: string; children: React.ReactNode; half?: boolean;
}) {
  return (
    <div className={`flex flex-col gap-1 ${half ? "" : ""}`}>
      <label className="text-[12px] font-bold text-gray-500 uppercase tracking-wide">
        {label}{required && <span className="ml-0.5 text-red-500">*</span>}
      </label>
      <div>
        {children}
        {hint && <p className="mt-0.5 text-[11px] text-gray-400">{hint}</p>}
      </div>
    </div>
  );
}

/* ─── Section panel ─── */
function Panel({ title, icon, color = "emerald", children, action }: {
  title: string; icon: React.ReactNode; color?: string; children: React.ReactNode; action?: React.ReactNode;
}) {
  const colors: Record<string, string> = {
    emerald: "from-emerald-600 to-teal-600",
    sky: "from-sky-600 to-blue-600",
    violet: "from-violet-600 to-purple-600",
    amber: "from-amber-500 to-orange-500",
    slate: "from-slate-600 to-gray-700",
  };
  return (
    <div className="rounded-xl border border-gray-200 shadow-sm overflow-hidden bg-white">
      <div className={`bg-gradient-to-r ${colors[color] || colors.emerald} px-4 py-2.5 flex items-center justify-between`}>
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-white/20">{icon}</div>
          <h3 className="text-[14px] font-bold text-white">{title}</h3>
        </div>
        {action && <div>{action}</div>}
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

/* ─── RadioGroup ─── */
function RadioGroup({ name, options, value, onChange, accent = "emerald" }: {
  name: string; options: string[]; value: string; onChange: (v: string) => void; accent?: string;
}) {
  const accentMap: Record<string, string> = {
    emerald: "border-emerald-400 bg-emerald-50 text-emerald-800",
    violet: "border-violet-400 bg-violet-50 text-violet-800",
    amber: "border-amber-400 bg-amber-50 text-amber-800",
  };
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((opt) => (
        <label key={opt} className={`flex cursor-pointer items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[12px] font-semibold transition-all ${value === opt ? accentMap[accent] || accentMap.emerald : "border-gray-200 text-gray-600 hover:border-gray-300 bg-gray-50"}`}>
          <input type="radio" name={name} checked={value === opt} onChange={() => onChange(opt)} className="sr-only" />
          {value === opt && <Check className="h-3 w-3" />}
          {opt}
        </label>
      ))}
    </div>
  );
}

/* ─── DatePicker ─── */
function DatePicker({ day, month, year, onDay, onMonth, onYear }: {
  day: string; month: string; year: string;
  onDay: (v: string) => void; onMonth: (v: string) => void; onYear: (v: string) => void;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <Select value={day || undefined} onValueChange={onDay}>
        <SelectTrigger className={`${selTrigger} w-[68px]`}><SelectValue placeholder="DD" /></SelectTrigger>
        <SelectContent>{Array.from({ length: 31 }, (_, i) => <SelectItem key={i} value={String(i + 1).padStart(2, "0")}>{String(i + 1).padStart(2, "0")}</SelectItem>)}</SelectContent>
      </Select>
      <Select value={month || undefined} onValueChange={onMonth}>
        <SelectTrigger className={`${selTrigger} w-[68px]`}><SelectValue placeholder="MM" /></SelectTrigger>
        <SelectContent>{Array.from({ length: 12 }, (_, i) => <SelectItem key={i} value={String(i + 1).padStart(2, "0")}>{String(i + 1).padStart(2, "0")}</SelectItem>)}</SelectContent>
      </Select>
      <Select value={year || undefined} onValueChange={onYear}>
        <SelectTrigger className={`${selTrigger} w-[88px]`}><SelectValue placeholder="YYYY" /></SelectTrigger>
        <SelectContent>{Array.from({ length: 120 }, (_, i) => <SelectItem key={i} value={String(1910 + i)}>{1910 + i}</SelectItem>)}</SelectContent>
      </Select>
    </div>
  );
}

/* ─── CategoryFileUpload ─── */
const CategoryFileUpload = ({ category, hasTemplate, refCode, uploads, onUpload, readOnly = false }: {
  category: string; hasTemplate: boolean; refCode: string; uploads: UploadedFile[];
  onUpload: (updater: (files: UploadedFile[]) => UploadedFile[]) => void; readOnly?: boolean;
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
        const res = await fetch("/api/employer-files", { method: "POST", headers: getAgencyAdminAuthHeaders(), body: fd });
        const data = (await res.json().catch(() => ({}))) as { error?: string; fileUrl?: string; fileName?: string; category?: string };
        if (!res.ok || !data.fileUrl || !data.fileName) throw new Error(data.error || `Failed to upload ${file.name}`);
        uploaded.push({ name: data.fileName, url: data.fileUrl, category: data.category || category });
      }
      onUpload((current) => mergeUploadedFiles(current, uploaded));
      toast.success(`${uploaded.length} file${uploaded.length === 1 ? "" : "s"} uploaded`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to upload file");
    } finally { setIsUploading(false); e.target.value = ""; }
  };

  const removeUpload = (idx: number) => onUpload((current) => current.filter((_, i) => i !== idx));

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-1.5">
          <FileText className="h-3.5 w-3.5 shrink-0 text-gray-400" />
          <span className="truncate text-[12px] font-semibold text-gray-700">{category}</span>
        </div>
        {!readOnly && (
          <button type="button" onClick={() => inputRef.current?.click()} disabled={isUploading}
            className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-700 hover:bg-emerald-100 disabled:opacity-50 transition-colors shrink-0">
            {isUploading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Upload className="h-3 w-3" />}
            {hasTemplate ? "Upload Signed" : "Upload"}
          </button>
        )}
      </div>
      <input ref={inputRef} type="file" accept=".pdf,application/pdf" multiple className="hidden" onChange={handleFileChange} />
      {uploads.length > 0 && (
        <div className="space-y-1 pl-5">
          {uploads.map((u, i) => (
            <div key={i} className="flex items-center gap-1.5 rounded-lg border border-emerald-100 bg-emerald-50 px-2.5 py-1.5">
              <FileCheck2 className="h-3.5 w-3.5 shrink-0 text-emerald-500" />
              <a href={u.url} target="_blank" rel="noopener noreferrer" className="flex-1 truncate text-[11px] font-semibold text-sky-700 hover:underline">{u.name}</a>
              <a href={u.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-0.5 rounded border border-sky-200 bg-white px-1.5 py-0.5 text-[10px] font-semibold text-sky-700 hover:bg-sky-50">
                <Eye className="h-2.5 w-2.5" />View
              </a>
              <a href={u.url} download={u.name} className="inline-flex items-center rounded border border-gray-200 bg-white p-0.5 text-gray-500 hover:bg-gray-50">
                <Download className="h-3 w-3" />
              </a>
              {!readOnly && (
                <button type="button" onClick={() => removeUpload(i)} className="text-gray-300 hover:text-red-400">
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

/* ─── BulkUploadModal ─── */
type BulkPendingFile = { id: string; file: File; category: string; status: "pending" | "uploading" | "done" | "error"; errorMsg?: string };

const BulkUploadModal = ({ open, onClose, refCode, onUploadComplete }: {
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
        const res = await fetch("/api/employer-files", { method: "POST", headers: getAgencyAdminAuthHeaders(), body: fd });
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
      <div className="flex max-h-[90vh] w-full max-w-xl flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl" onMouseDown={(e) => e.stopPropagation()}>
        <div className="bg-gradient-to-r from-emerald-600 to-teal-600 px-5 py-3.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/20"><Upload className="h-4 w-4 text-white" /></div>
              <div>
                <h2 className="text-[15px] font-bold text-white">Bulk File Upload</h2>
                <p className="text-[11px] text-white/70">Assign each file to a document category</p>
              </div>
            </div>
            <button type="button" onClick={handleClose} disabled={isUploading} className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/20 text-white hover:bg-white/30 disabled:opacity-40">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
        <div className="flex-1 space-y-3 overflow-y-auto p-4">
          <div onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }} onDragLeave={() => setIsDragging(false)} onDrop={handleDrop} onClick={() => bulkInputRef.current?.click()}
            className={`flex cursor-pointer flex-col items-center gap-2.5 rounded-xl border-2 border-dashed py-8 px-5 transition-all ${isDragging ? "border-emerald-400 bg-emerald-50" : "border-gray-200 bg-gray-50 hover:border-gray-300"}`}>
            <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${isDragging ? "bg-emerald-100" : "bg-gray-200"}`}>
              <Upload className={`h-5 w-5 ${isDragging ? "text-emerald-600" : "text-gray-400"}`} />
            </div>
            <p className="text-[14px] font-bold text-gray-600">{isDragging ? "Release to add files" : "Click or drag & drop PDF files"}</p>
            <input ref={bulkInputRef} type="file" accept=".pdf,application/pdf" multiple className="hidden" onChange={handleFileInput} />
          </div>
          {pendingFiles.length > 0 && (
            <div className="space-y-1.5">
              {pendingFiles.map((pf) => (
                <div key={pf.id} className={`flex items-start gap-2.5 rounded-lg border px-3 py-2.5 ${pf.status === "done" ? "border-emerald-100 bg-emerald-50" : pf.status === "error" ? "border-red-100 bg-red-50" : pf.status === "uploading" ? "border-sky-100 bg-sky-50" : "border-gray-100 bg-white"}`}>
                  <div className="mt-0.5 shrink-0">
                    {pf.status === "done" && <Check className="h-4 w-4 text-emerald-500" />}
                    {pf.status === "error" && <X className="h-4 w-4 text-red-400" />}
                    {pf.status === "uploading" && <Loader2 className="h-4 w-4 animate-spin text-sky-500" />}
                    {pf.status === "pending" && <FileText className="h-4 w-4 text-gray-400" />}
                  </div>
                  <div className="min-w-0 flex-1 space-y-1">
                    <p className="truncate text-[13px] font-bold text-gray-800">{pf.file.name}</p>
                    {pf.status === "error" && <p className="text-[12px] text-red-500">{pf.errorMsg}</p>}
                    {pf.status === "pending" && (
                      <select value={pf.category} onChange={(e) => updateCategory(pf.id, e.target.value)}
                        className="w-full rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-[12px] font-medium text-gray-700 focus:border-emerald-400 focus:outline-none">
                        {CATEGORY_NAMES.map((c) => <option key={c} value={c}>{c}</option>)}
                      </select>
                    )}
                    {pf.status === "done" && <p className="text-[12px] font-bold text-emerald-700">→ "{pf.category}"</p>}
                    {pf.status === "uploading" && <p className="text-[12px] text-sky-600">Uploading to "{pf.category}"…</p>}
                  </div>
                  {(pf.status === "pending" || pf.status === "error") && (
                    <button type="button" onClick={() => removeFile(pf.id)} className="mt-0.5 shrink-0 text-gray-300 hover:text-red-400">
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="flex items-center justify-between gap-3 border-t border-gray-100 bg-gray-50/80 px-4 py-3">
          <button type="button" onClick={handleClose} disabled={isUploading} className="text-[13px] font-semibold text-gray-500 hover:text-gray-700 disabled:opacity-40">{allDone ? "Close" : "Cancel"}</button>
          <div className="flex items-center gap-2">
            {!allDone && doneCount > 0 && <span className="text-[12px] text-gray-400">{doneCount}/{pendingFiles.length} done</span>}
            <button type="button" onClick={uploadAll} disabled={pendingCount === 0 || isUploading}
              className={`inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-[13px] font-bold transition-all ${pendingCount > 0 && !isUploading ? "bg-emerald-600 text-white hover:bg-emerald-700" : "cursor-not-allowed bg-gray-100 text-gray-400"}`}>
              {isUploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
              {isUploading ? "Uploading…" : pendingCount === 0 && allDone ? "All Done ✓" : `Upload ${pendingCount} File${pendingCount !== 1 ? "s" : ""}`}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

/* ══════════════════════════════════════════════════════════ */
/*              EmploymentContractPage (2-col)               */
/* ══════════════════════════════════════════════════════════ */
export const EmploymentContractPage = ({ mode = "view" }: { mode?: EmploymentContractPageMode }) => {
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

  const [maid, setMaid] = useState({
    referenceCode: "",
    name: "",
    nationality: "",
    workPermitNo: "",
    finNo: "",
    passportNo: "",
    salary: "",
    numberOfOffDays: "",
    compensationNoOffday: "",
    nameOfReplacement: "",
    passportOfMaid: "",
    photoDataUrl: "",
    photoDataUrls: [] as string[],
    numberOfTerms: "",
    communicationToBuy: "",
  });

  const [agency, setAgency] = useState({ caseReferenceNumber: isCreateMode ? DEFAULT_CASE_REFERENCE_NUMBER : refCode || "", contractDate: todayIsoDate(), dateOfEmploymentDay: "", dateOfEmploymentMonth: "", dateOfEmploymentYear: "", invoiceNumber: "", serviceFee: "", deposit: "", sipFee: "", medicalFee: "", transportFee: "", documentFee: "", placementFee: "", insuranceFee: "", agencyWitness: "", maidId: "", handlingInHospitalFee: "", extensionFee: "", discountedFee: "", balanceFee: "" });
  const [employer, setEmployer] = useState({ name: "", gender: "", dateOfBirthDay: "", dateOfBirthMonth: "", dateOfBirthYear: "", nationality: "", residentialStatus: "", nric: "", addressLine1: "", addressLine2: "", postalCode: "", typeOfResidence: "", occupation: "", company: "", email: "", residentialPhone: "", mobileNumber: "", monthlyCombinedIncome: "", existingEmployer: "", existingEmployerNric: "", monthlyContribution: "", dateOfEmployment: "" });
  const [notificationDate, setNotificationDate] = useState({ month: "", year: "" });
  const [spouse, setSpouse] = useState({ name: "", gender: "", dateOfBirthDay: "", dateOfBirthMonth: "", dateOfBirthYear: "", nationality: "", residentialStatus: "", nric: "", occupation: "", company: "" });
  const emptyFamilyMember = () => ({ name: "", relationship: "", birthCertIcFin: "", dateOfBirthDay: "01", dateOfBirthMonth: "01", dateOfBirthYear: "1910" });
  const [familyMembers, setFamilyMembers] = useState([emptyFamilyMember()]);
  const [selectedDocs, setSelectedDocs] = useState<Set<string>>(new Set());

  const uploadedDocuments = useMemo(() => Object.values(categoryUploads).flat(), [categoryUploads]);
  const docKey = (file: UploadedFile) => `${file.category}||${file.name}`;
  const allDocKeys = useMemo(() => uploadedDocuments.map(docKey), [uploadedDocuments]);
  const allSelected = allDocKeys.length > 0 && allDocKeys.every((k) => selectedDocs.has(k));
  const toggleDoc = (key: string) => setSelectedDocs((prev) => { const next = new Set(prev); if (next.has(key)) next.delete(key); else next.add(key); return next; });
  const handleSelectAll = () => setSelectedDocs(allSelected ? new Set() : new Set(allDocKeys));
  const handleDownloadSelected = () => {
    const toDownload = uploadedDocuments.filter((f) => selectedDocs.has(docKey(f)));
    if (!toDownload.length) { toast.error("No documents selected."); return; }
    toDownload.forEach((file) => { const a = document.createElement("a"); a.href = file.url; a.download = file.name; a.target = "_blank"; document.body.appendChild(a); a.click(); document.body.removeChild(a); });
  };

  const applyMaidResult = useCallback((selectedMaid: MaidSearchResult) => {
    // ── GUARD: block selection of maids already assigned to another employer ──
    if (isMaidAlreadyAssigned(selectedMaid, refCode)) {
      const assignedTo = selectedMaid.assignedEmployerName
        ? `employer "${selectedMaid.assignedEmployerName}" (Ref: ${selectedMaid.assignedEmployerRefCode})`
        : `another employer (Ref: ${selectedMaid.assignedEmployerRefCode || "unknown"})`;
      toast.error(`This maid is already assigned to ${assignedTo}. Please select a different maid.`);
      return; // abort — do not populate the form
    }

    const introduction = (selectedMaid.introduction as Record<string, unknown> | undefined) ?? {};
    const skillsPreferences = (selectedMaid.skillsPreferences as Record<string, unknown> | undefined) ?? {};

    const photoUrls: string[] = Array.isArray(selectedMaid.photoDataUrls)
      ? selectedMaid.photoDataUrls.filter((i): i is string => typeof i === "string" && i.trim().length > 0)
      : [];
    const singlePhoto = toText(selectedMaid.photoDataUrl);
    if (singlePhoto && !photoUrls.includes(singlePhoto)) photoUrls.unshift(singlePhoto);

    setMaid((c) => ({
      ...c,
      referenceCode: toText(selectedMaid.referenceCode),
      name: toText(selectedMaid.fullName),
      nationality: toText(selectedMaid.nationality),
      passportNo: getMaidPassportNo(selectedMaid),
      salary: toText(introduction.expectedSalary),
      numberOfOffDays: toText(skillsPreferences.offDaysPerMonth),
      compensationNoOffday: toText(introduction.offdayCompensation),
      photoDataUrl: photoUrls[0] ?? singlePhoto,
      photoDataUrls: photoUrls,
    }));
    setAgency((c) => ({ ...c, maidId: selectedMaid.id ? String(selectedMaid.id) : c.maidId }));
    setSelectedMaidExperience(getMaidExperienceLabel(selectedMaid));
    setMaidSearch("");
    setShowMaidResults(false);
    toast.success("Maid details added to the employment form");
  }, [refCode]);

  /* ── Load contract from API ── */
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
          const m = r.maid as Record<string, unknown>;
          const storedUrls: string[] = Array.isArray(m.photoDataUrls)
            ? (m.photoDataUrls as unknown[]).filter((v): v is string => typeof v === "string" && v.trim().length > 0)
            : [];
          const singleUrl = toText(m.photoDataUrl);
          if (singleUrl && !storedUrls.includes(singleUrl)) storedUrls.unshift(singleUrl);

          setMaid((p) => ({
            ...p,
            ...(r.maid as any),
            name: toText(m.name ?? m.fullName),
            compensationNoOffday: toText(m.compensationNoOffday ?? m.compensationForOffDay),
            passportOfMaid: toText(m.passportOfMaid ?? m.passportOfReplacement),
            photoDataUrl: storedUrls[0] ?? "",
            photoDataUrls: storedUrls,
          }));
        }
        if (r.agency) {
          const a = r.agency as Record<string, unknown>;
          const norm = normalizeEmploymentDateParts(toText(a.dateOfEmployment));
          setAgency((p) => ({ ...p, ...(r.agency as any), dateOfEmploymentDay: toText(a.dateOfEmploymentDay) || norm.day, dateOfEmploymentMonth: toText(a.dateOfEmploymentMonth) || norm.month, dateOfEmploymentYear: toText(a.dateOfEmploymentYear) || norm.year }));
        }
        if (r.employer) {
          const e = r.employer as Record<string, unknown>;
          setEmployer((p) => ({ ...p, ...(r.employer as any), monthlyContribution: toText(e.monthlyContribution) || toText(e.monthlyCombinedIncome) }));
          if (!r.notificationDate) { const nd = parseNotificationOfAssessment(toText(e.notificationOfAssessment)); if (nd.month || nd.year) setNotificationDate(nd); }
        }
        if (r.spouse) setSpouse((p) => ({ ...p, ...(r.spouse as any) }));
        if (r.notificationDate) setNotificationDate((p) => ({ ...p, ...(r.notificationDate as any) }));
        if (Array.isArray(r.familyMembers) && r.familyMembers.length) {
          setFamilyMembers(r.familyMembers.map((fm) => ({ name: toText(fm.name), relationship: toText(fm.relationship), birthCertIcFin: toText(fm.birthCertIcFin ?? fm.birthCert), dateOfBirthDay: toText(fm.dateOfBirthDay ?? "01"), dateOfBirthMonth: toText(fm.dateOfBirthMonth ?? "01"), dateOfBirthYear: toText(fm.dateOfBirthYear ?? "1910") })));
        }
        if (Array.isArray(r.documents)) {
          setCategoryUploads(r.documents.reduce<Record<string, UploadedFile[]>>((acc, doc) => {
            const cat = toText(doc.category), url = toText(doc.fileUrl), name = toText(doc.fileName);
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

  /* ── Maid search autocomplete ── */
  useEffect(() => {
    const term = maidSearch.trim();
    if (term.length < 2) { setMaidResults([]); return; }
    let cancelled = false;
    const controller = new AbortController();
    const loadMaids = async () => {
      try {
        setMaidSearchLoading(true);
        /*
         * Pass the current contract's refCode so the API can annotate results
         * with `isAssigned`, `assignedEmployerRefCode`, and `assignedEmployerName`.
         * The API should still return assigned maids in the list (so we can show
         * them greyed-out); the frontend decides whether to block selection.
         */
        const params = new URLSearchParams({ search: term });
        if (refCode) params.set("currentRefCode", refCode);
        const response = await fetch(`/api/maids?${params.toString()}`, { signal: controller.signal });
        const data = (await response.json().catch(() => ({}))) as { maids?: MaidSearchResult[] };
        if (!response.ok || !Array.isArray(data.maids)) throw new Error();
        if (!cancelled) setMaidResults(data.maids.slice(0, 8));
      } catch { if (!cancelled) setMaidResults([]); }
      finally { if (!cancelled) setMaidSearchLoading(false); }
    };
    void loadMaids();
    return () => { cancelled = true; controller.abort(); };
  }, [maidSearch, refCode]);

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
  const updateFamilyMember = (idx: number, field: string, value: string) => setFamilyMembers((p) => p.map((fm, i) => i === idx ? { ...fm, [field]: value } : fm));
  const updateCategoryUploads = (cat: string, updater: (files: UploadedFile[]) => UploadedFile[]) => setCategoryUploads((p) => ({ ...p, [cat]: updater(p[cat] ?? []) }));
  const handleBulkUploadComplete = (by: Record<string, UploadedFile[]>) => {
    setCategoryUploads((p) => { const next = { ...p }; for (const [cat, files] of Object.entries(by)) { next[cat] = mergeUploadedFiles(next[cat] ?? [], files); } return next; });
  };
  const transformFamilyMembers = (members: typeof familyMembers) =>
    members.map(({ name, relationship, dateOfBirthDay: day, dateOfBirthMonth: month, dateOfBirthYear: year }) => ({ name, type: ["Daughter","Son"].includes(relationship) ? "child" : "parent" as const, relationship, dateOfBirth: `${day.padStart(2,"0")}-${month.padStart(2,"0")}-${year}` }));

  const submitContract = async () => {
    if (isSubmitting) return;
    if (!employer.name.trim()) { toast.error("Employer name is required"); return; }
    try {
      setIsSubmitting(true);

      const maidPayload = {
        ...maid,
        photoDataUrl: maid.photoDataUrl || (maid.photoDataUrls[0] ?? ""),
        photoDataUrls: maid.photoDataUrls.length
          ? maid.photoDataUrls
          : maid.photoDataUrl
            ? [maid.photoDataUrl]
            : [],
      };

      const body = {
        existingRefCode: refCode || null,
        refCode: agency.caseReferenceNumber || refCode || null,
        maid: maidPayload,
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
      toast.success("Employer contract saved successfully!");
      if (showStepTabs) navigate(adminPath(`/employment-contracts/${encodeURIComponent(d.employer.refCode)}/edit?step=4`));
      else navigate(adminPath(`/employment-contracts/${encodeURIComponent(d.employer.refCode)}`));
    } catch (e) { toast.error(e instanceof Error ? e.message : "Failed to save employer contract"); }
    finally { setIsSubmitting(false); }
  };

  const handleDownloadForms = async () => {
    if (!uploadedDocuments.length) { toast.error("Upload at least one document first"); return; }
    try {
      const { skippedCount } = await downloadMergedEmployerPdf(uploadedDocuments, `employer-${refCode || "temp"}-forms.pdf`);
      toast.success(skippedCount > 0 ? `Merged PDF downloaded. Skipped ${skippedCount} non-PDF.` : "Merged PDF downloaded");
    } catch (e) { toast.error(e instanceof Error ? e.message : "Failed to download forms"); }
  };

  const handlePrintForms = async () => {
    if (!uploadedDocuments.length) { toast.error("Upload at least one document first"); return; }
    try {
      const { skippedCount } = await printMergedEmployerPdf(uploadedDocuments, { maid, agency, employer, spouse, familyMembers: transformFamilyMembers(familyMembers), notificationDate });
      toast.success(skippedCount > 0 ? `Print preview opened. Skipped ${skippedCount} non-PDF.` : "Print preview opened");
    } catch (e) { toast.error(e instanceof Error ? e.message : "Failed to print forms"); }
  };

  const ordinal = (n: number) => ["1st","2nd","3rd","4th","5th","6th","7th","8th","9th","10th"][n - 1] ?? `${n}th`;
  const maidPhoto = useMemo(() => getPrimaryPhoto(maid as unknown as Record<string, unknown>), [maid]);
  const displayReferenceNumber = isCreateMode ? agency.caseReferenceNumber : refCode || agency.caseReferenceNumber;
  const showStepOne = !showStepTabs || activeStep === 1;
  const showStepTwo = !showStepTabs || activeStep === 2;
  const showStepThree = !showStepTabs || activeStep === 3;
  const showStepFour = !showStepTabs || activeStep === 4;

  const stepItems = [
    { id: 1 as const, label: "Maid", icon: <User className="h-3.5 w-3.5" />, color: "emerald" },
    { id: 2 as const, label: "Agency", icon: <Building2 className="h-3.5 w-3.5" />, color: "sky" },
    { id: 3 as const, label: "Employer", icon: <Home className="h-3.5 w-3.5" />, color: "violet" },
    { id: 4 as const, label: "Documents", icon: <FilePlus2 className="h-3.5 w-3.5" />, color: "amber" },
  ];

  if (isLoading) return (
    <div className="flex min-h-[40vh] items-center justify-center gap-3">
      <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
      <span className="text-[15px] font-semibold text-gray-500">Loading employment contract…</span>
    </div>
  );

  if (loadError) return (
    <div className="mx-auto max-w-2xl p-6">
      <div className="flex items-start gap-3 rounded-xl border border-red-100 bg-red-50 p-4">
        <AlertCircle className="h-5 w-5 shrink-0 text-red-500 mt-0.5" />
        <div>
          <p className="text-[15px] font-bold text-red-700">Failed to load contract</p>
          <p className="text-[13px] text-red-600 mt-1">{loadError}</p>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap');
        .ecp-root, .ecp-root * { font-family: 'DM Sans', sans-serif; }
        @keyframes ecpFadeUp { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
        .ecp-section { animation: ecpFadeUp 0.22s cubic-bezier(0.16,1,0.3,1) both; }
      `}</style>

      <div className="ecp-root w-full px-4 py-4 space-y-4">

        {/* Breadcrumb + Header */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <Link to={adminPath("/employment-contracts")}
              className="inline-flex items-center gap-1 text-[13px] font-semibold text-emerald-700 hover:text-emerald-800 hover:underline mb-2">
              <ChevronLeft className="h-3.5 w-3.5" /> Back to Employment Listing
            </Link>
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 shadow-md">
                <FileText className="h-5 w-5 text-white" />
              </div>
              <div>
                <h2 className="text-[19px] font-bold text-gray-900 leading-tight">
                  {isCreateMode ? "Add New Employment Contract" : "Employment Contract Form"}
                </h2>
                <p className="text-[12px] text-gray-500 font-medium">
                  Reference: <span className="font-bold text-emerald-700">{displayReferenceNumber || "—"}</span>
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Step tabs */}
        {showStepTabs && (
          <div className="flex flex-wrap gap-1.5 rounded-xl border border-gray-200 bg-gray-50 p-2">
            {stepItems.map((step) => {
              const isActive = activeStep === step.id;
              const colorMap: Record<string, string> = {
                emerald: isActive ? "bg-emerald-600 text-white shadow-sm" : "text-gray-500 hover:bg-emerald-50 hover:text-emerald-700",
                sky:     isActive ? "bg-sky-600 text-white shadow-sm"     : "text-gray-500 hover:bg-sky-50 hover:text-sky-700",
                violet:  isActive ? "bg-violet-600 text-white shadow-sm"  : "text-gray-500 hover:bg-violet-50 hover:text-violet-700",
                amber:   isActive ? "bg-amber-500 text-white shadow-sm"   : "text-gray-500 hover:bg-amber-50 hover:text-amber-700",
              };
              return (
                <button key={step.id} type="button" onClick={() => setActiveStep(step.id)}
                  className={`flex items-center gap-2 rounded-lg px-4 py-2 text-[13px] font-bold transition-all ${colorMap[step.color]}`}>
                  <span className={`flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-black ${isActive ? "bg-white/20" : "bg-gray-200"}`}>{step.id}</span>
                  {step.icon}
                  {step.label}
                </button>
              );
            })}
          </div>
        )}

        {/* ═══ STEP 1: MAID ═══ */}
        {showStepOne && (
          <div className="ecp-section space-y-3">
            <Panel title="The Maid Employed" icon={<User className="h-3.5 w-3.5 text-white" />} color="emerald">
              {/* Maid search bar */}
              <div className="mb-4 flex gap-2">
                <div className="relative flex-1">
                  <input
                    className={`${inp} pr-8`}
                    value={maidSearch}
                    onChange={(e) => { setMaidSearch(e.target.value); setShowMaidResults(true); }}
                    onFocus={() => setShowMaidResults(true)}
                    placeholder="Search maid by name or reference code…"
                  />
                  {maidSearch.length > 0 && (
                    <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => { setMaidSearch(""); setShowMaidResults(false); }}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center justify-center rounded-full p-0.5 text-gray-400 hover:bg-gray-200 hover:text-gray-600 transition-colors">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}

                  {/* ── Search dropdown ── */}
                  {showMaidResults && maidSearch.trim().length > 0 && (
                    <div className="absolute left-0 right-0 top-full z-30 mt-1.5 max-h-72 overflow-y-auto rounded-xl border border-gray-200 bg-white shadow-xl">
                      {maidSearch.trim().length < 2 ? (
                        <div className="px-4 py-3 text-[13px] text-gray-400">Type at least 2 characters…</div>
                      ) : maidSearchLoading ? (
                        <div className="flex items-center gap-2 px-4 py-3 text-[13px] text-gray-400"><Loader2 className="h-3.5 w-3.5 animate-spin" /> Searching…</div>
                      ) : maidResults.length === 0 ? (
                        <div className="px-4 py-3 text-[13px] text-gray-400">No maids found.</div>
                      ) : (
                        maidResults.map((result) => {
                          const assigned = isMaidAlreadyAssigned(result, refCode);
                          return (
                            <div
                              key={`${result.referenceCode}-${result.id ?? "maid"}`}
                              title={assigned ? `Already assigned to ${result.assignedEmployerName || "another employer"} (Ref: ${result.assignedEmployerRefCode || "N/A"})` : undefined}
                            >
                              <button
                                type="button"
                                disabled={assigned}
                                className={`flex w-full items-start gap-2.5 border-b border-gray-100 px-3 py-2.5 text-left last:border-0 transition-colors
                                  ${assigned
                                    ? "cursor-not-allowed opacity-60 bg-gray-50"
                                    : "hover:bg-emerald-50 cursor-pointer"
                                  }`}
                                onMouseDown={(e) => e.preventDefault()}
                                onClick={() => !assigned && applyMaidResult(result)}
                              >
                                {/* Photo */}
                                <div className="shrink-0 overflow-hidden border border-gray-200 bg-gray-50 relative" style={{ width: 36, height: 44, borderRadius: 4 }}>
                                  {getPrimaryPhoto(result as unknown as Record<string, unknown>) ? (
                                    <img src={getPrimaryPhoto(result as unknown as Record<string, unknown>)} alt={result.fullName} className="h-full w-full object-cover object-top" />
                                  ) : (
                                    <div className="flex h-full w-full items-center justify-center text-gray-300"><User className="h-4 w-4" /></div>
                                  )}
                                  {/* Lock overlay for assigned maids */}
                                  {assigned && (
                                    <div className="absolute inset-0 flex items-center justify-center bg-black/30 rounded-sm">
                                      <Lock className="h-3.5 w-3.5 text-white" />
                                    </div>
                                  )}
                                </div>

                                {/* Info */}
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <p className="text-[13px] font-bold text-gray-900 truncate">{result.fullName || "Unnamed"}</p>
                                    {assigned && (
                                      <span className="inline-flex items-center gap-0.5 rounded-md border border-red-200 bg-red-50 px-1.5 py-0.5 text-[10px] font-bold text-red-600 shrink-0">
                                        <Lock className="h-2.5 w-2.5" /> Assigned
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-[12px] text-gray-500">{result.nationality} · {getMaidExperienceLabel(result)} exp</p>
                                  {assigned ? (
                                    <p className="text-[11px] text-red-500 font-semibold truncate">
                                      Assigned to: {result.assignedEmployerName || "another employer"}
                                      {result.assignedEmployerRefCode ? ` (Ref: ${result.assignedEmployerRefCode})` : ""}
                                    </p>
                                  ) : (
                                    <p className="text-[12px] text-emerald-700 font-semibold">
                                      Ref: {result.referenceCode} · Salary: {toText((result.introduction as any)?.expectedSalary) || "—"}
                                    </p>
                                  )}
                                </div>
                              </button>
                            </div>
                          );
                        })
                      )}
                    </div>
                  )}
                </div>
                <button type="button" onClick={() => setShowMaidResults(true)}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-[13px] font-bold text-white hover:bg-emerald-700 transition-colors shadow-sm">
                  <Search className="h-3.5 w-3.5" /> Search
                </button>
              </div>

              {/* 2-col maid fields */}
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_120px]">
                <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                  <Field2 label="Maid's Full Name">
                    <input className={inp} value={maid.name} onChange={(e) => setMaid({ ...maid, name: e.target.value })} placeholder="Full name as per passport" />
                  </Field2>
                  <Field2 label="Nationality">
                    <Select value={maid.nationality || undefined} onValueChange={(v) => setMaid({ ...maid, nationality: v })}>
                      <SelectTrigger className={selTrigger}><SelectValue placeholder="Select nationality" /></SelectTrigger>
                      <SelectContent>
                        {["Filipino maid","Indian maid","Indonesian maid","Myanmar maid","Sri Lankan maid"].map((n) => <SelectItem key={n} value={n}>{n}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </Field2>
                  <Field2 label="Work Permit No.">
                    <input className={inp} value={maid.workPermitNo} onChange={(e) => setMaid({ ...maid, workPermitNo: e.target.value })} placeholder="e.g. G1234567P" />
                  </Field2>
                  <Field2 label="FIN No.">
                    <input className={inp} value={maid.finNo} onChange={(e) => setMaid({ ...maid, finNo: e.target.value })} placeholder="e.g. G1234567P" />
                  </Field2>
                  <Field2 label="Passport No.">
                    <input className={inp} value={maid.passportNo} onChange={(e) => setMaid({ ...maid, passportNo: e.target.value })} placeholder="Passport number" />
                  </Field2>
                  <Field2 label="Monthly Salary">
                    <input className={inp} value={maid.salary} onChange={(e) => setMaid({ ...maid, salary: e.target.value })} placeholder="e.g. $800" />
                  </Field2>
                  <Field2 label="Number of Off-days">
                    <input className={inp} value={maid.numberOfOffDays} onChange={(e) => setMaid({ ...maid, numberOfOffDays: e.target.value })} placeholder="e.g. 4" />
                  </Field2>
                  <Field2 label="Compensation (No Offday)">
                    <input className={inp} value={maid.compensationNoOffday} onChange={(e) => setMaid({ ...maid, compensationNoOffday: e.target.value })} placeholder="0" />
                  </Field2>
                  <Field2 label="Name of Maid Replaced">
                    <input className={inp} value={maid.nameOfReplacement} onChange={(e) => setMaid({ ...maid, nameOfReplacement: e.target.value })} placeholder="Previous maid's name" />
                  </Field2>
                  <Field2 label="Passport of Maid Replaced">
                    <input className={inp} value={maid.passportOfMaid} onChange={(e) => setMaid({ ...maid, passportOfMaid: e.target.value })} placeholder="Previous passport no." />
                  </Field2>
                </div>
                {/* Photo column */}
                <div className="flex flex-col items-center pt-0.5">
                  <div className="overflow-hidden border border-gray-200 bg-gray-50 shadow-sm" style={{ width: 110, height: 136 }}>
                    {maidPhoto ? (
                      <img src={maidPhoto} alt={maid.name} className="h-full w-full object-cover object-top" />
                    ) : (
                      <div className="flex h-full w-full flex-col items-center justify-center text-gray-300">
                        <User className="h-8 w-8" />
                        <span className="mt-1 text-[11px] text-gray-400 font-medium">No photo</span>
                      </div>
                    )}
                  </div>
                  {maid.referenceCode && (
                    <span className="mt-1.5 rounded-lg bg-emerald-100 px-2 py-0.5 text-[11px] font-bold text-emerald-800">
                      Ref: {maid.referenceCode}
                    </span>
                  )}
                </div>
              </div>
            </Panel>

            {showStepTabs && (
              <div className="flex justify-end">
                <button onClick={() => setActiveStep(2)} className="inline-flex items-center gap-1.5 rounded-lg bg-sky-600 px-4 py-2 text-[13px] font-bold text-white hover:bg-sky-700 transition-colors">
                  Next: Agency Info <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>
        )}

        {/* ═══ STEP 2: AGENCY ═══ */}
        {showStepTwo && (
          <div className="ecp-section space-y-3">
            <Panel title="Agency Information" icon={<Building2 className="h-3.5 w-3.5 text-white" />} color="sky">
              <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                <Field2 label="Case Reference Number">
                  <input className={inp} value={agency.caseReferenceNumber} onChange={(e) => setAgency({ ...agency, caseReferenceNumber: e.target.value })} placeholder="e.g. 06583" />
                </Field2>
                <Field2 label="Contract Date">
                  <input className={inp} value={agency.contractDate} onChange={(e) => setAgency({ ...agency, contractDate: e.target.value })} placeholder="YYYY-MM-DD" />
                </Field2>
                <div className="col-span-2">
                  <Field2 label="Date of Employment">
                    <DatePicker day={agency.dateOfEmploymentDay} month={agency.dateOfEmploymentMonth} year={agency.dateOfEmploymentYear}
                      onDay={(v) => setAgency({ ...agency, dateOfEmploymentDay: v })} onMonth={(v) => setAgency({ ...agency, dateOfEmploymentMonth: v })} onYear={(v) => setAgency({ ...agency, dateOfEmploymentYear: v })} />
                  </Field2>
                </div>

                {/* Fee breakdown sub-grid */}
                <div className="col-span-2">
                  <div className="rounded-lg border border-sky-100 bg-sky-50 p-3">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-sky-700 mb-2.5">Fee Breakdown</p>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-2.5 sm:grid-cols-4">
                      {[
                        { label: "Invoice Number", key: "invoiceNumber", ph: "1" },
                        { label: "Service Fee", key: "serviceFee", ph: "$0.00" },
                        { label: "Deposit", key: "deposit", ph: "$0.00" },
                        { label: "SIP Fee", key: "sipFee", ph: "$0.00" },
                        { label: "Medical Fee", key: "medicalFee", ph: "$0.00" },
                        { label: "Transport Fee", key: "transportFee", ph: "$0.00" },
                        { label: "Document Fee", key: "documentFee", ph: "$0.00" },
                        { label: "Placement Fee", key: "placementFee", ph: "$0.00" },
                      ].map(({ label, key, ph }) => (
                        <Field2 key={key} label={label}>
                          <input className={`${inp} bg-white`} value={agency[key as keyof typeof agency] as string}
                            onChange={(e) => setAgency({ ...agency, [key]: e.target.value })} placeholder={ph} />
                        </Field2>
                      ))}
                    </div>
                  </div>
                </div>

                <Field2 label="Insurance Fee">
                  <input className={inp} value={agency.insuranceFee} onChange={(e) => setAgency({ ...agency, insuranceFee: e.target.value })} placeholder="$0.00" />
                </Field2>
                <div className="col-span-1">
                  <Field2 label="Agency Witness">
                    <Select value={agency.agencyWitness || undefined} onValueChange={(v) => setAgency({ ...agency, agencyWitness: v })}>
                      <SelectTrigger className={selTrigger}><SelectValue placeholder="Select witness" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Balamurugan S/O Subramaniam (R1218275)">Balamurugan S/O Subramaniam (R1218275)</SelectItem>
                        <SelectItem value="HO BAH WANG (R1106320)">HO BAH WANG (R1106320)</SelectItem>
                      </SelectContent>
                    </Select>
                  </Field2>
                </div>
              </div>
            </Panel>

            {showStepTabs && (
              <div className="flex justify-between">
                <button onClick={() => setActiveStep(1)} className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-4 py-2 text-[13px] font-bold text-gray-700 hover:bg-gray-50 transition-colors">
                  <ChevronLeft className="h-4 w-4" /> Back
                </button>
                <button onClick={() => setActiveStep(3)} className="inline-flex items-center gap-1.5 rounded-lg bg-violet-600 px-4 py-2 text-[13px] font-bold text-white hover:bg-violet-700 transition-colors">
                  Next: Employer Info <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>
        )}

        {/* ═══ STEP 3: EMPLOYER, SPOUSE, FAMILY ═══ */}
        {showStepThree && (
          <div className="ecp-section space-y-3">
            <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">

              {/* Employer */}
              <Panel title="Employer Details" icon={<User className="h-3.5 w-3.5 text-white" />} color="violet">
                <div className="grid grid-cols-2 gap-x-3 gap-y-2.5">
                  <div className="col-span-2">
                    <Field2 label="Full Name" required>
                      <input className={inp} value={employer.name} onChange={(e) => setEmployer({ ...employer, name: e.target.value })} placeholder="Employer's full legal name" />
                    </Field2>
                  </div>
                  <Field2 label="Gender">
                    <RadioGroup name="emp-gender" options={["Male","Female"]} value={employer.gender} onChange={(v) => setEmployer({ ...employer, gender: v })} accent="violet" />
                  </Field2>
                  <Field2 label="Date of Birth">
                    <DatePicker day={employer.dateOfBirthDay} month={employer.dateOfBirthMonth} year={employer.dateOfBirthYear}
                      onDay={(v) => setEmployer({ ...employer, dateOfBirthDay: v })} onMonth={(v) => setEmployer({ ...employer, dateOfBirthMonth: v })} onYear={(v) => setEmployer({ ...employer, dateOfBirthYear: v })} />
                  </Field2>
                  <Field2 label="Nationality">
                    <Select value={employer.nationality || undefined} onValueChange={(v) => setEmployer({ ...employer, nationality: v })}>
                      <SelectTrigger className={selTrigger}><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>{NATIONALITY_OPTIONS.map((n) => <SelectItem key={n} value={n}>{n}</SelectItem>)}</SelectContent>
                    </Select>
                  </Field2>
                  <Field2 label="Residential Status">
                    <Select value={employer.residentialStatus || undefined} onValueChange={(v) => setEmployer({ ...employer, residentialStatus: v })}>
                      <SelectTrigger className={selTrigger}><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>{["Singapore Citizen","Singapore Permanent Resident","Employment Pass","S Pass","Work Permit"].map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                    </Select>
                  </Field2>
                  <Field2 label="NRIC / FIN / Passport">
                    <input className={inp} value={employer.nric} onChange={(e) => setEmployer({ ...employer, nric: e.target.value })} placeholder="e.g. S1234567A" />
                  </Field2>
                  <Field2 label="Postal Code">
                    <input className={inp} value={employer.postalCode} onChange={(e) => setEmployer({ ...employer, postalCode: e.target.value })} placeholder="6-digit code" />
                  </Field2>
                  <div className="col-span-2">
                    <Field2 label="Address (Line 1)">
                      <input className={inp} value={employer.addressLine1} onChange={(e) => setEmployer({ ...employer, addressLine1: e.target.value })} placeholder="Street address, unit no." />
                    </Field2>
                  </div>
                  <div className="col-span-2">
                    <Field2 label="Address (Line 2)">
                      <input className={inp} value={employer.addressLine2} onChange={(e) => setEmployer({ ...employer, addressLine2: e.target.value })} placeholder="Block / building name (optional)" />
                    </Field2>
                  </div>
                  <div className="col-span-2">
                    <Field2 label="Type of Residence">
                      <div className="flex flex-wrap gap-1.5">
                        {["HDB 2-ROOM","HDB 3-ROOM","HDB 4-ROOM","HDB 5-ROOM","HDB Executive","Condo","Terrace","Bungalow"].map((t) => (
                          <label key={t} className={`flex cursor-pointer items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[11px] font-semibold transition-all ${employer.typeOfResidence === t ? "border-violet-400 bg-violet-50 text-violet-800" : "border-gray-200 text-gray-600 hover:border-gray-300 bg-gray-50"}`}>
                            <input type="radio" name="residence" checked={employer.typeOfResidence === t} onChange={() => setEmployer({ ...employer, typeOfResidence: t })} className="sr-only" />
                            {employer.typeOfResidence === t && <Check className="h-2.5 w-2.5 text-violet-600" />}
                            {t}
                          </label>
                        ))}
                      </div>
                    </Field2>
                  </div>
                  <Field2 label="Occupation">
                    <input className={inp} value={employer.occupation} onChange={(e) => setEmployer({ ...employer, occupation: e.target.value })} placeholder="e.g. Manager" />
                  </Field2>
                  <Field2 label="Company Name">
                    <input className={inp} value={employer.company} onChange={(e) => setEmployer({ ...employer, company: e.target.value })} placeholder="Company name" />
                  </Field2>
                  <div className="col-span-2">
                    <Field2 label="Email Address">
                      <input type="email" className={inp} value={employer.email} onChange={(e) => setEmployer({ ...employer, email: e.target.value })} placeholder="email@example.com" />
                    </Field2>
                  </div>
                  <Field2 label="Residential Phone">
                    <input className={inp} value={employer.residentialPhone} onChange={(e) => setEmployer({ ...employer, residentialPhone: e.target.value })} placeholder="e.g. 64643212" />
                  </Field2>
                  <Field2 label="Handphone Number">
                    <input className={inp} value={employer.mobileNumber} onChange={(e) => setEmployer({ ...employer, mobileNumber: e.target.value })} placeholder="e.g. 91234567" />
                  </Field2>
                  <div className="col-span-2">
                    <Field2 label="Monthly Combined Income">
                      <Select value={employer.monthlyContribution || undefined} onValueChange={(v) => setEmployer({ ...employer, monthlyContribution: v })}>
                        <SelectTrigger className={selTrigger}><SelectValue placeholder="-- Select --" /></SelectTrigger>
                        <SelectContent>{INCOME_OPTIONS.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
                      </Select>
                    </Field2>
                  </div>
                  <div className="col-span-2">
                    <Field2 label="Notification of Assessment" hint="Annual Income or Bank Statement">
                      <div className="flex items-center gap-1.5">
                        <Select value={notificationDate.year || undefined} onValueChange={(v) => setNotificationDate({ ...notificationDate, year: v })}>
                          <SelectTrigger className={`${selTrigger} w-24`}><SelectValue placeholder="Year" /></SelectTrigger>
                          <SelectContent>{Array.from({ length: 20 }, (_, i) => <SelectItem key={i} value={String(2010 + i)}>{2010 + i}</SelectItem>)}</SelectContent>
                        </Select>
                        <Select value={notificationDate.month || undefined} onValueChange={(v) => setNotificationDate({ ...notificationDate, month: v })}>
                          <SelectTrigger className={`${selTrigger} w-36`}><SelectValue placeholder="-- Month --" /></SelectTrigger>
                          <SelectContent>{MONTHS.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                    </Field2>
                  </div>
                  <Field2 label="Existing Employer">
                    <input className={inp} value={employer.existingEmployer} onChange={(e) => setEmployer({ ...employer, existingEmployer: e.target.value })} placeholder="Previous employer name" />
                  </Field2>
                  <Field2 label="Existing Employer NRIC">
                    <input className={inp} value={employer.existingEmployerNric} onChange={(e) => setEmployer({ ...employer, existingEmployerNric: e.target.value })} placeholder="e.g. S1234567A" />
                  </Field2>
                </div>
              </Panel>

              {/* Spouse */}
              <Panel title="Spouse Details" icon={<Users className="h-3.5 w-3.5 text-white" />} color="violet">
                <div className="grid grid-cols-2 gap-x-3 gap-y-2.5">
                  <div className="col-span-2">
                    <Field2 label="Spouse's Full Name">
                      <input className={inp} value={spouse.name} onChange={(e) => setSpouse({ ...spouse, name: e.target.value })} placeholder="Full legal name" />
                    </Field2>
                  </div>
                  <Field2 label="Gender">
                    <RadioGroup name="sp-gender" options={["Male","Female"]} value={spouse.gender} onChange={(v) => setSpouse({ ...spouse, gender: v })} accent="violet" />
                  </Field2>
                  <Field2 label="Date of Birth">
                    <DatePicker day={spouse.dateOfBirthDay} month={spouse.dateOfBirthMonth} year={spouse.dateOfBirthYear}
                      onDay={(v) => setSpouse({ ...spouse, dateOfBirthDay: v })} onMonth={(v) => setSpouse({ ...spouse, dateOfBirthMonth: v })} onYear={(v) => setSpouse({ ...spouse, dateOfBirthYear: v })} />
                  </Field2>
                  <Field2 label="Nationality">
                    <Select value={spouse.nationality || undefined} onValueChange={(v) => setSpouse({ ...spouse, nationality: v })}>
                      <SelectTrigger className={selTrigger}><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>{NATIONALITY_OPTIONS.map((n) => <SelectItem key={n} value={n}>{n}</SelectItem>)}</SelectContent>
                    </Select>
                  </Field2>
                  <Field2 label="Residential Status">
                    <Select value={spouse.residentialStatus || undefined} onValueChange={(v) => setSpouse({ ...spouse, residentialStatus: v })}>
                      <SelectTrigger className={selTrigger}><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>{["Singapore Citizen","Singapore Permanent Resident","Employment Pass","S Pass","Work Permit"].map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                    </Select>
                  </Field2>
                  <Field2 label="Spouse NRIC / FIN / PP">
                    <input className={inp} value={spouse.nric} onChange={(e) => setSpouse({ ...spouse, nric: e.target.value })} placeholder="e.g. S1234567B" />
                  </Field2>
                  <Field2 label="Occupation">
                    <input className={inp} value={spouse.occupation} onChange={(e) => setSpouse({ ...spouse, occupation: e.target.value })} placeholder="e.g. Housewife" />
                  </Field2>
                  <div className="col-span-2">
                    <Field2 label="Company Name">
                      <input className={inp} value={spouse.company} onChange={(e) => setSpouse({ ...spouse, company: e.target.value })} placeholder="Company name (if applicable)" />
                    </Field2>
                  </div>
                </div>
              </Panel>
            </div>

            {/* Family Members — 2 per row */}
            <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
              {familyMembers.map((fm, idx) => (
                <Panel key={idx} title={`${ordinal(idx + 1)} Family Member`} icon={<User className="h-3.5 w-3.5 text-white" />} color="amber"
                  action={familyMembers.length > 1 ? (
                    <button type="button" onClick={() => removeFamilyMember(idx)}
                      className="inline-flex items-center gap-1 rounded-lg bg-white/20 px-2.5 py-1 text-[11px] font-bold text-white hover:bg-white/30 transition-colors">
                      <X className="h-3 w-3" /> Remove
                    </button>
                  ) : undefined}>
                  <div className="grid grid-cols-2 gap-x-3 gap-y-2.5">
                    <div className="col-span-2">
                      <Field2 label="Full Name">
                        <input className={inp} value={fm.name} onChange={(e) => updateFamilyMember(idx, "name", e.target.value)} placeholder="Full name" />
                      </Field2>
                    </div>
                    <div className="col-span-2">
                      <Field2 label="Relationship">
                        <div className="flex flex-wrap gap-1.5">
                          {["Daughter","Son","Father","Mother","Father-in-Law","Mother-in-Law"].map((opt) => (
                            <label key={opt} className={`flex cursor-pointer items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[11px] font-semibold transition-all ${fm.relationship === opt ? "border-amber-400 bg-amber-50 text-amber-800" : "border-gray-200 text-gray-600 bg-gray-50 hover:border-gray-300"}`}>
                              <input type="radio" name={`fm-type-${idx}`} checked={fm.relationship === opt} onChange={() => updateFamilyMember(idx, "relationship", opt)} className="sr-only" />
                              {fm.relationship === opt && <Check className="h-2.5 w-2.5 text-amber-600" />}
                              {opt}
                            </label>
                          ))}
                        </div>
                      </Field2>
                    </div>
                    <Field2 label="Birth Cert / IC / FIN">
                      <input className={inp} value={fm.birthCertIcFin} onChange={(e) => updateFamilyMember(idx, "birthCertIcFin", e.target.value)} placeholder="ID number" />
                    </Field2>
                    <Field2 label="Date of Birth">
                      <DatePicker day={fm.dateOfBirthDay} month={fm.dateOfBirthMonth} year={fm.dateOfBirthYear}
                        onDay={(v) => updateFamilyMember(idx, "dateOfBirthDay", v)} onMonth={(v) => updateFamilyMember(idx, "dateOfBirthMonth", v)} onYear={(v) => updateFamilyMember(idx, "dateOfBirthYear", v)} />
                    </Field2>
                  </div>
                </Panel>
              ))}

              <button type="button" onClick={addFamilyMember}
                className="col-span-1 xl:col-span-2 flex items-center justify-center gap-2 rounded-xl border-2 border-dashed border-amber-300 bg-amber-50 px-4 py-3 text-[13px] font-bold text-amber-700 hover:bg-amber-100 transition-colors">
                <Plus className="h-4 w-4" /> Add Family Member
              </button>
            </div>

            {showStepTabs && (
              <div className="flex justify-between">
                <button onClick={() => setActiveStep(2)} className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-4 py-2 text-[13px] font-bold text-gray-700 hover:bg-gray-50 transition-colors">
                  <ChevronLeft className="h-4 w-4" /> Back
                </button>
                <button onClick={() => setActiveStep(4)} className="inline-flex items-center gap-1.5 rounded-lg bg-amber-500 px-4 py-2 text-[13px] font-bold text-white hover:bg-amber-600 transition-colors">
                  Next: Documents <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>
        )}

        {/* ═══ STEP 4: DOCUMENTS ═══ */}
        {showStepFour && (
          <div className="ecp-section space-y-3">
            <div className="rounded-xl border border-amber-100 bg-amber-50 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-[14px] font-bold text-amber-800 mb-2">4 Steps For Uploading Employer PDF Documents</p>
                  <div className="grid gap-1.5 text-[12px] text-amber-700 sm:grid-cols-2">
                    {[
                      "Save the employer form first so the contract gets a reference number.",
                      "Search the maid and confirm the preview before uploading files.",
                      "Use bulk upload and choose the required PDF documents only.",
                      "Review the uploaded forms, then select files for download or print.",
                    ].map((step, i) => (
                      <div key={i} className="flex items-start gap-1.5">
                        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-500 text-[10px] font-black text-white">{i + 1}</span>
                        <span className="font-medium leading-snug">{step}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <button type="button" onClick={() => setBulkUploadOpen(true)}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-amber-600 px-4 py-2 text-[13px] font-bold text-white hover:bg-amber-700 shadow-sm transition-colors">
                  <Upload className="h-3.5 w-3.5" /> Bulk Upload PDF
                </button>
              </div>
            </div>

            <div className="rounded-xl border border-gray-200 overflow-hidden shadow-sm">
              <div className="bg-gradient-to-r from-slate-600 to-gray-700 px-4 py-2.5 flex items-center gap-2">
                <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-white/20"><FilePlus2 className="h-3.5 w-3.5 text-white" /></div>
                <h3 className="text-[14px] font-bold text-white">Documents &amp; Forms</h3>
              </div>
              <div className="bg-white p-4">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {GENERATED_FORMS.map((cat) => {
                    const uploads = categoryUploads[cat.category] ?? [];
                    return (
                      <div key={cat.category} className="rounded-lg border border-gray-100 p-3 hover:border-gray-200 transition-colors">
                        <CategoryFileUpload
                          category={cat.category}
                          hasTemplate={cat.hasTemplate}
                          refCode={refCode || agency.caseReferenceNumber || "temp"}
                          uploads={uploads}
                          onUpload={(updater) => updateCategoryUploads(cat.category, updater)}
                        />
                        {uploads.length > 0 && (
                          <div className="mt-1.5 pl-5 space-y-1">
                            {uploads.map((file) => {
                              const key = docKey(file);
                              return (
                                <label key={key} className="flex cursor-pointer items-center gap-1.5 text-[11px] text-gray-500 font-medium select-none">
                                  <input type="checkbox" checked={selectedDocs.has(key)} onChange={() => toggleDoc(key)} className="h-3.5 w-3.5 accent-emerald-600 rounded" />
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
            </div>

            <p className="text-center text-[12px] text-gray-400 font-medium">
              PDF forms are for demo purposes only. Contact admin for customization.
            </p>

            {showStepTabs && (
              <div className="flex justify-start">
                <button onClick={() => setActiveStep(3)} className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-4 py-2 text-[13px] font-bold text-gray-700 hover:bg-gray-50 transition-colors">
                  <ChevronLeft className="h-4 w-4" /> Back
                </button>
              </div>
            )}
          </div>
        )}

        {/* ── Bottom action bar ── */}
        {isCreateMode ? (
          <div className="flex justify-end pt-2 pb-6">
            <button type="button" onClick={() => void submitContract()} disabled={isSubmitting}
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-6 py-2.5 text-[14px] font-bold text-white shadow-md hover:bg-emerald-700 active:scale-95 disabled:opacity-50 disabled:cursor-default transition-all">
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {isSubmitting ? "Saving…" : "Save Contract"}
            </button>
          </div>
        ) : (
          <div className="sticky bottom-0 z-40 -mx-4 px-4 pb-4">
            <div className="rounded-xl border border-gray-200 bg-white/95 shadow-xl backdrop-blur-md px-4 py-3">
              <div className="flex flex-wrap items-center justify-between gap-2.5">
                <div className="flex flex-wrap items-center gap-2">
                  <button type="button" onClick={handleSelectAll}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3.5 py-2 text-[13px] font-bold text-gray-700 hover:border-gray-300 hover:bg-gray-50 transition-colors">
                    <Check className="h-3.5 w-3.5" />
                    {allSelected ? "Deselect All" : "Select All"}
                  </button>
                  <button type="button" onClick={handleDownloadSelected} disabled={selectedDocs.size === 0}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-sky-200 bg-sky-50 px-3.5 py-2 text-[13px] font-bold text-sky-700 hover:bg-sky-100 disabled:opacity-40 disabled:cursor-default transition-colors">
                    <Download className="h-3.5 w-3.5" />
                    Download
                    {selectedDocs.size > 0 && <span className="rounded-full bg-sky-200 px-1.5 py-0.5 text-[11px] font-black">{selectedDocs.size}</span>}
                  </button>
                </div>
                <button type="button" onClick={() => void submitContract()} disabled={isSubmitting}
                  className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2 text-[14px] font-bold text-white shadow-md hover:bg-emerald-700 active:scale-95 disabled:opacity-50 disabled:cursor-default transition-all">
                  {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  {isSubmitting ? "Saving…" : "Submit & Save"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <BulkUploadModal open={bulkUploadOpen} onClose={() => setBulkUploadOpen(false)} refCode={refCode || agency.caseReferenceNumber || "temp"} onUploadComplete={handleBulkUploadComplete} />

      {showBackToTop && (
        <button type="button" onClick={scrollToTop}
          className={`fixed right-6 z-50 flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2.5 text-[13px] font-bold text-white shadow-xl hover:bg-emerald-700 active:scale-95 transition-all ${isCreateMode ? "bottom-6" : "bottom-20"}`}>
          <ArrowUp className="h-3.5 w-3.5" /> Top
        </button>
      )}
    </>
  );
};

export default EmploymentContractPage;