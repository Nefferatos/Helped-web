import { useEffect, useState, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { useNavigate, useParams, Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  FileText,
  Download,
  Upload,
  Eye,
  Search,
  ChevronDown,
  X,
  Check,
  Plus,
  User,
  Building2,
  Scroll,
  Users,
  FileCheck2,
  Loader2,
} from "lucide-react";
import { toast } from "@/components/ui/sonner";
import { downloadMergedEmployerPdf, printMergedEmployerPdf } from "@/lib/employerPdf";
import { adminPath } from "@/lib/routes";

// TODO (Codex):
// Refactor maid selection into a reusable searchable component.
// Should support:
// - Selecting existing maid (auto-fill form fields)
// - Option to add new maid if not found
// - Future support for status filtering (Available, Deployed, etc.)

// ─── Mock maid directory (replace with API data) ──────────────────────────────
const MAID_DIRECTORY = [
  {
    id: "M001",
    name: "Saraswathi Murugan",
    nationality: "Indian maid",
    workPermitNo: "G1234567P",
    finNo: "G1234567P",
    passportNo: "N1234567",
    salary: "800",
    numberOfTerms: "2",
    communicationToBuy: "",
    nameOfReplacement: "Alpha Ranger",
    passportOfMaid: "",
  },
  {
    id: "M002",
    name: "Dewi Susanti",
    nationality: "Indonesian maid",
    workPermitNo: "G7654321P",
    finNo: "G7654321P",
    passportNo: "B7654321",
    salary: "700",
    numberOfTerms: "1",
    communicationToBuy: "",
    nameOfReplacement: "",
    passportOfMaid: "",
  },
  {
    id: "M003",
    name: "Maria Santos",
    nationality: "Filipino maid",
    workPermitNo: "G9876543P",
    finNo: "G9876543P",
    passportNo: "AA9876543",
    salary: "750",
    numberOfTerms: "2",
    communicationToBuy: "",
    nameOfReplacement: "",
    passportOfMaid: "",
  },
];

// ─── Generated forms with template flags ──────────────────────────────────────
const GENERATED_FORMS: {
  category: string;
  files: { name: string; isNew?: boolean }[];
  hasTemplate: boolean;
}[] = [
  { category: "Maid Biodata Form", files: [{ name: "Maid_Biodata.pdf", isNew: true }], hasTemplate: true },
  { category: "Official Receipt", files: [{ name: "Official_Receipt.pdf", isNew: true }], hasTemplate: false },
  {
    category: "Standard Contract Between Employer and Employment Agency",
    files: [
      { name: "Service_Contract_Between_Employer_And_Agency_Format_1.pdf" },
      { name: "Service_Contract_Between_Employer_And_Agency_Format_2.pdf" },
    ],
    hasTemplate: true,
  },
  { category: "Form A", files: [{ name: "FormA.pdf" }], hasTemplate: true },
  { category: "Form C", files: [{ name: "FormC.pdf" }], hasTemplate: true },
  { category: "Salary Schedule Form", files: [{ name: "Salary_Form.pdf" }], hasTemplate: true },
  { category: "Employee Income Tax Declaration", files: [{ name: "Employee_Income_Tax_Declaration.pdf" }], hasTemplate: true },
  {
    category: "Insurance Forms",
    files: [
      { name: "ticpanel_mh_insurance.pdf" },
      { name: "Zurich_Life_Insurance.pdf" },
      { name: "indian_network_maid_insurance_form.pdf" },
      { name: "Liberty_Insurance_Form.pdf" },
    ],
    hasTemplate: true,
  },
  {
    category: "Standard Contract Between Maid and Employer",
    files: [{ name: "Terms_Contract_Between_Maid_and_Employer.pdf" }],
    hasTemplate: true,
  },
  {
    category: "Rest Day Agreement Form Between Maid and Employer",
    files: [{ name: "Rest_Day_Agreement_Form_between_Maid_and_Employer.pdf" }],
    hasTemplate: true,
  },
  {
    category: "Safety Agreement Form Between Maid And Employer",
    files: [
      { name: "Safety_Agreement_Form_between_Maid_and_Employer_Topology.pdf" },
      { name: "Safety_Agreement_Form_between_Maid_and_Employer_Indonesian.pdf" },
      { name: "Safety_Agreement_Form_between_Maid_and_Employer_Burmese.pdf" },
      { name: "Safety_Agreement_Form_between_Maid_and_Employer_Tamil.pdf" },
    ],
    hasTemplate: true,
  },
  { category: "Handing and Taking Over Checklist", files: [{ name: "Handing_Taking_Over_Checklist.pdf" }], hasTemplate: true },
  { category: "Form S10", files: [{ name: "FormS10.pdf" }], hasTemplate: false },
];

// ─── Section Card ─────────────────────────────────────────────────────────────
const ACCENT_MAP: Record<string, string> = {
  blue:   "border-l-blue-500   bg-blue-50/40",
  indigo: "border-l-indigo-500 bg-indigo-50/40",
  violet: "border-l-violet-500 bg-violet-50/40",
  emerald:"border-l-emerald-500 bg-emerald-50/40",
  amber:  "border-l-amber-500  bg-amber-50/40",
  rose:   "border-l-rose-500   bg-rose-50/40",
  slate:  "border-l-slate-400  bg-slate-50/40",
};

const SectionCard = ({
  title,
  icon: Icon,
  children,
  accent = "blue",
}: {
  title: string;
  icon?: React.ElementType;
  children: React.ReactNode;
  accent?: string;
}) => (
  <div className="rounded-xl border border-gray-100 shadow-sm overflow-hidden bg-white">
    <div className={`border-l-4 ${ACCENT_MAP[accent] ?? ACCENT_MAP.blue} px-5 py-3 border-b border-gray-100 flex items-center gap-2`}>
      {Icon && <Icon className="w-4 h-4 text-gray-500" />}
      <h3 className="text-xs font-semibold tracking-widest uppercase text-gray-600">{title}</h3>
    </div>
    <div className="p-5 space-y-4">{children}</div>
  </div>
);

// ─── Sub-section divider ──────────────────────────────────────────────────────
const SubHeader = ({ label }: { label: string }) => (
  <div className="flex items-center gap-3 pt-2">
    <span className="text-[10px] font-bold tracking-widest uppercase text-gray-400">{label}</span>
    <div className="flex-1 h-px bg-gray-100" />
  </div>
);

// ─── Form Field ───────────────────────────────────────────────────────────────
const Field = ({
  label,
  required,
  hint,
  children,
  fullWidth,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  children: React.ReactNode;
  fullWidth?: boolean;
}) => (
  <div className={`grid gap-1.5 ${fullWidth ? "" : "sm:grid-cols-[200px_1fr] sm:items-start"}`}>
    <label className="text-sm text-gray-600 font-medium sm:pt-2 leading-snug">
      {label}
      {required && <span className="text-rose-500 ml-0.5">*</span>}
    </label>
    <div className="space-y-1">
      {children}
      {hint && <p className="text-xs text-gray-400">{hint}</p>}
    </div>
  </div>
);

// ─── Radio Group ──────────────────────────────────────────────────────────────
const RadioGroup = ({
  name,
  options,
  value,
  onChange,
}: {
  name: string;
  options: string[];
  value: string;
  onChange: (v: string) => void;
}) => (
  <div className="flex flex-wrap gap-3 pt-1">
    {options.map((opt) => (
      <label
        key={opt}
        className={`flex items-center gap-1.5 text-sm cursor-pointer px-3 py-1.5 rounded-lg border transition-colors ${
          value === opt
            ? "border-blue-300 bg-blue-50 text-blue-700 font-medium"
            : "border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50"
        }`}
      >
        <input
          type="radio"
          name={name}
          checked={value === opt}
          onChange={() => onChange(opt)}
          className="accent-primary sr-only"
        />
        {value === opt && <Check className="w-3 h-3 text-blue-500" />}
        {opt}
      </label>
    ))}
  </div>
);

// ─── Date Picker Row ──────────────────────────────────────────────────────────
const DatePicker = ({
  day, month, year,
  onDay, onMonth, onYear,
}: {
  day: string; month: string; year: string;
  onDay: (v: string) => void; onMonth: (v: string) => void; onYear: (v: string) => void;
}) => (
  <div className="flex flex-wrap gap-2 items-center">
    <Select value={day || undefined} onValueChange={onDay}>
      <SelectTrigger className="w-20"><SelectValue placeholder="DD" /></SelectTrigger>
      <SelectContent>
        {Array.from({ length: 31 }, (_, i) => (
          <SelectItem key={i} value={String(i + 1).padStart(2, "0")}>
            {String(i + 1).padStart(2, "0")}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
    <Select value={month || undefined} onValueChange={onMonth}>
      <SelectTrigger className="w-20"><SelectValue placeholder="MM" /></SelectTrigger>
      <SelectContent>
        {Array.from({ length: 12 }, (_, i) => (
          <SelectItem key={i} value={String(i + 1).padStart(2, "0")}>
            {String(i + 1).padStart(2, "0")}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
    <Select value={year || undefined} onValueChange={onYear}>
      <SelectTrigger className="w-24"><SelectValue placeholder="YYYY" /></SelectTrigger>
      <SelectContent>
        {Array.from({ length: 60 }, (_, i) => (
          <SelectItem key={i} value={String(1950 + i)}>{1950 + i}</SelectItem>
        ))}
      </SelectContent>
    </Select>
    <span className="text-xs text-gray-400">DD / MM / YYYY</span>
  </div>
);

// ─── Maid Search Select ───────────────────────────────────────────────────────
const MaidSearchSelect = ({
  onSelect,
}: {
  onSelect: (maid: (typeof MAID_DIRECTORY)[0] | null) => void;
}) => {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<(typeof MAID_DIRECTORY)[0] | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  const filtered = MAID_DIRECTORY.filter(
    (m) =>
      m.name.toLowerCase().includes(query.toLowerCase()) ||
      m.nationality.toLowerCase().includes(query.toLowerCase()) ||
      m.workPermitNo.toLowerCase().includes(query.toLowerCase())
  );

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const handleSelect = (m: (typeof MAID_DIRECTORY)[0]) => {
    setSelected(m);
    setQuery(m.name);
    setOpen(false);
    onSelect(m);
  };

  const handleClear = () => {
    setSelected(null);
    setQuery("");
    onSelect(null);
  };

  return (
    <div ref={ref} className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
        <input
          className="w-full pl-9 pr-8 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition placeholder:text-gray-400"
          placeholder="Search by name, nationality, or permit no…"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
        />
        {selected ? (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        ) : (
          <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
        )}
      </div>

      {open && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden">
          {filtered.length === 0 ? (
            <div className="px-4 py-6 text-center space-y-2">
              <p className="text-sm text-gray-500">No maid found for "{query}"</p>
              <button
                type="button"
                className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1 mx-auto font-medium"
              >
                <Plus className="w-3 h-3" /> Add new maid
              </button>
            </div>
          ) : (
            <ul className="max-h-56 overflow-y-auto divide-y divide-gray-50">
              {filtered.map((m) => (
                <li
                  key={m.id}
                  onClick={() => handleSelect(m)}
                  className="flex items-center justify-between px-4 py-3 hover:bg-blue-50/60 cursor-pointer transition-colors"
                >
                  <div>
                    <p className="text-sm font-semibold text-gray-800">{m.name}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {m.nationality} · Permit: {m.workPermitNo}
                    </p>
                  </div>
                  {selected?.id === m.id && <Check className="w-4 h-4 text-blue-500" />}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {selected && (
        <p className="mt-1.5 text-xs text-emerald-600 flex items-center gap-1 font-medium">
          <Check className="w-3 h-3" /> Maid selected — fields below have been auto-filled
        </p>
      )}
    </div>
  );
};

// ─── Category File Upload Row ─────────────────────────────────────────────────
type UploadedFile = {
  name: string;
  url: string;
  category: string;
};

const CategoryFileUpload = ({
  category,
  hasTemplate,
  refCode,
  uploads,
  onUpload,
}: {
  category: string;
  hasTemplate: boolean;
  refCode: string;
  uploads: UploadedFile[];
  onUpload: (files: UploadedFile[]) => void;
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;

    setIsUploading(true);
    try {
      const uploadedFiles: UploadedFile[] = [];

      for (const file of files) {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("category", category);
        formData.append("refCode", refCode);

        const response = await fetch("/api/employer-files", {
          method: "POST",
          body: formData,
        });
        const data = (await response.json().catch(() => ({}))) as {
          error?: string;
          fileUrl?: string;
          fileName?: string;
          category?: string;
        };

        if (!response.ok || !data.fileUrl || !data.fileName) {
          throw new Error(data.error || `Failed to upload ${file.name}`);
        }

        uploadedFiles.push({
          name: data.fileName,
          url: data.fileUrl,
          category: data.category || category,
        });
      }

      onUpload([...uploads, ...uploadedFiles]);
      toast.success(`${uploadedFiles.length} file${uploadedFiles.length === 1 ? "" : "s"} uploaded`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to upload file");
    } finally {
      setIsUploading(false);
      e.target.value = "";
    }
  };

  const removeUpload = (idx: number) => onUpload(uploads.filter((_, i) => i !== idx));

  return (
    <div className="rounded-lg border border-gray-100 bg-gray-50/60 px-4 py-3 space-y-2">
      {/* Header row */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <FileText className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
          <span className="text-xs font-medium text-gray-700 truncate">{category}</span>
          {hasTemplate ? (
            <span className="flex-shrink-0 text-[10px] bg-blue-50 text-blue-600 border border-blue-200 px-1.5 py-0.5 rounded-full font-semibold">
              Template available
            </span>
          ) : (
            <span className="flex-shrink-0 text-[10px] bg-gray-100 text-gray-500 border border-gray-200 px-1.5 py-0.5 rounded-full font-semibold">
              No template
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {hasTemplate ? (
            <>
              <button
                type="button"
                onClick={() => toast.info(`Opening template for "${category}"…`)}
                className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-medium transition-colors"
              >
                <Eye className="w-3 h-3" /> View Template
              </button>
              <span className="w-px h-3.5 bg-gray-200" />
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                disabled={isUploading}
                className="flex items-center gap-1 text-xs text-emerald-600 hover:text-emerald-700 font-medium transition-colors"
              >
                {isUploading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />} Upload Signed File
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={isUploading}
              className="flex items-center gap-1 text-xs text-gray-600 hover:text-gray-800 font-medium transition-colors"
            >
              {isUploading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />} Upload File
            </button>
          )}
        </div>
      </div>

      <input ref={inputRef} type="file" multiple className="hidden" onChange={handleFileChange} />

      {/* Uploaded files */}
      {uploads.length > 0 && (
        <div className="space-y-1 pt-0.5">
          {uploads.map((u, i) => (
            <div
              key={i}
              className="flex items-center gap-2 text-xs text-gray-600 bg-white rounded-md border border-gray-100 px-2.5 py-1.5"
            >
              <FileCheck2 className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
              <a
                href={u.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 truncate text-blue-600 hover:text-blue-700 hover:underline"
              >
                {u.name}
              </a>
              <button
                type="button"
                onClick={() => removeUpload(i)}
                className="text-gray-300 hover:text-rose-400 transition-colors"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ─── Bulk Upload Modal ────────────────────────────────────────────────────────
type BulkPendingFile = {
  id: string;
  file: File;
  category: string;
  status: "pending" | "uploading" | "done" | "error";
  errorMsg?: string;
};

const CATEGORY_NAMES = GENERATED_FORMS.map((f) => f.category);

const BulkUploadModal = ({
  open,
  onClose,
  refCode,
  onUploadComplete,
}: {
  open: boolean;
  onClose: () => void;
  refCode: string;
  onUploadComplete: (byCategory: Record<string, UploadedFile[]>) => void;
}) => {
  const [pendingFiles, setPendingFiles] = useState<BulkPendingFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const bulkInputRef = useRef<HTMLInputElement>(null);

  const handleClose = useCallback(() => {
    if (isUploading) return;
    setPendingFiles([]);
    onClose();
  }, [isUploading, onClose]);

  useEffect(() => {
    if (!open) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        handleClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, isUploading, handleClose]);

  const addFiles = (files: File[]) => {
    const newEntries: BulkPendingFile[] = files.map((file) => ({
      id: `${file.name}-${Date.now()}-${Math.random()}`,
      file,
      category: CATEGORY_NAMES[0],
      status: "pending",
    }));
    setPendingFiles((prev) => [...prev, ...newEntries]);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    addFiles(Array.from(e.dataTransfer.files));
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    addFiles(Array.from(e.target.files ?? []));
    e.target.value = "";
  };

  const updateCategory = (id: string, category: string) => {
    setPendingFiles((prev) =>
      prev.map((f) => (f.id === id ? { ...f, category } : f))
    );
  };

  const removeFile = (id: string) => {
    setPendingFiles((prev) => prev.filter((f) => f.id !== id));
  };

  const uploadAll = async () => {
    const pending = pendingFiles.filter((f) => f.status === "pending");
    if (pending.length === 0) return;
    setIsUploading(true);

    const resultsByCategory: Record<string, UploadedFile[]> = {};

    for (const pf of pending) {
      setPendingFiles((prev) =>
        prev.map((f) => (f.id === pf.id ? { ...f, status: "uploading" } : f))
      );
      try {
        const formData = new FormData();
        formData.append("file", pf.file);
        formData.append("category", pf.category);
        formData.append("refCode", refCode);

        const response = await fetch("/api/employer-files", {
          method: "POST",
          body: formData,
        });
        const data = (await response.json().catch(() => ({}))) as {
          error?: string;
          fileUrl?: string;
          fileName?: string;
          category?: string;
        };

        if (!response.ok || !data.fileUrl || !data.fileName) {
          throw new Error(data.error || `Failed to upload ${pf.file.name}`);
        }

        const uploaded: UploadedFile = {
          name: data.fileName,
          url: data.fileUrl,
          category: pf.category,
        };
        resultsByCategory[pf.category] = [
          ...(resultsByCategory[pf.category] ?? []),
          uploaded,
        ];
        setPendingFiles((prev) =>
          prev.map((f) => (f.id === pf.id ? { ...f, status: "done" } : f))
        );
      } catch (err) {
        setPendingFiles((prev) =>
          prev.map((f) =>
            f.id === pf.id
              ? {
                  ...f,
                  status: "error",
                  errorMsg: err instanceof Error ? err.message : "Upload failed",
                }
              : f
          )
        );
      }
    }

    setIsUploading(false);
    onUploadComplete(resultsByCategory);
    toast.success("Bulk upload complete");
  };

  const pendingCount = pendingFiles.filter((f) => f.status === "pending").length;
  const doneCount = pendingFiles.filter((f) => f.status === "done").length;
  const allDone = pendingFiles.length > 0 && pendingFiles.every((f) => f.status === "done" || f.status === "error");

  if (!open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] flex flex-col overflow-hidden"
        onMouseDown={(e) => e.stopPropagation()}
      >

        {/* ── Modal Header ── */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center">
              <Upload className="w-3.5 h-3.5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-gray-800">Bulk File Upload</h2>
              <p className="text-[10px] text-gray-400">Add files and assign each to a document category</p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            disabled={isUploading}
            className="text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-40"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* ── Modal Body ── */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">

          {/* Drop zone */}
          <div
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={() => bulkInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl py-8 px-4 flex flex-col items-center gap-2 cursor-pointer select-none transition-all ${
              isDragging
                ? "border-blue-400 bg-blue-50 scale-[1.01]"
                : "border-gray-200 bg-gray-50/80 hover:border-gray-300 hover:bg-gray-100/60"
            }`}
          >
            <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${isDragging ? "bg-blue-100" : "bg-gray-100"}`}>
              <Upload className={`w-5 h-5 transition-colors ${isDragging ? "text-blue-500" : "text-gray-400"}`} />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-gray-600">
                {isDragging ? "Release to add files" : "Click or drag & drop files here"}
              </p>
              <p className="text-xs text-gray-400 mt-0.5">PDF, images, and documents — select multiple at once</p>
            </div>
            <input ref={bulkInputRef} type="file" multiple className="hidden" onChange={handleFileInput} />
          </div>

          {/* File list */}
          {pendingFiles.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <span className="text-[10px] font-bold tracking-widest uppercase text-gray-400">
                  {pendingFiles.length} file{pendingFiles.length !== 1 ? "s" : ""} — assign each to a category
                </span>
                <div className="flex-1 h-px bg-gray-100" />
                {pendingCount > 0 && (
                  <span className="text-[10px] text-gray-400">{doneCount}/{pendingFiles.length} uploaded</span>
                )}
              </div>

              {pendingFiles.map((pf) => (
                <div
                  key={pf.id}
                  className={`flex items-start gap-3 rounded-lg border px-3 py-2.5 transition-colors ${
                    pf.status === "done"
                      ? "border-emerald-100 bg-emerald-50/40"
                      : pf.status === "error"
                      ? "border-rose-100 bg-rose-50/40"
                      : pf.status === "uploading"
                      ? "border-blue-100 bg-blue-50/30"
                      : "border-gray-100 bg-gray-50"
                  }`}
                >
                  {/* Status icon */}
                  <div className="mt-0.5 flex-shrink-0">
                    {pf.status === "done"     && <Check     className="w-3.5 h-3.5 text-emerald-500" />}
                    {pf.status === "error"    && <X         className="w-3.5 h-3.5 text-rose-400" />}
                    {pf.status === "uploading"&& <Loader2   className="w-3.5 h-3.5 text-blue-500 animate-spin" />}
                    {pf.status === "pending"  && <FileText  className="w-3.5 h-3.5 text-gray-400" />}
                  </div>

                  {/* File info + category selector */}
                  <div className="flex-1 min-w-0 space-y-1.5">
                    <p className="text-xs font-medium text-gray-700 truncate">{pf.file.name}</p>

                    {pf.status === "error" && (
                      <p className="text-[10px] text-rose-500">{pf.errorMsg}</p>
                    )}

                    {pf.status === "pending" && (
                      <div className="space-y-1">
                        <p className="text-[10px] text-gray-400">
                          {(pf.file.size / 1024).toFixed(1)} KB · Assign category:
                        </p>
                        <select
                          value={pf.category}
                          onChange={(e) => updateCategory(pf.id, e.target.value)}
                          className="w-full text-[11px] border border-gray-200 rounded-md px-2 py-1.5 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-colors"
                        >
                          {CATEGORY_NAMES.map((cat) => (
                            <option key={cat} value={cat}>{cat}</option>
                          ))}
                        </select>
                      </div>
                    )}

                    {pf.status === "done" && (
                      <p className="text-[10px] text-emerald-600 font-medium flex items-center gap-1">
                        <Check className="w-2.5 h-2.5" /> Saved to "{pf.category}"
                      </p>
                    )}

                    {pf.status === "uploading" && (
                      <p className="text-[10px] text-blue-500">Uploading to "{pf.category}"…</p>
                    )}
                  </div>

                  {/* Remove button */}
                  {(pf.status === "pending" || pf.status === "error") && (
                    <button
                      type="button"
                      onClick={() => removeFile(pf.id)}
                      className="mt-0.5 flex-shrink-0 text-gray-300 hover:text-rose-400 transition-colors"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Empty state hint */}
          {pendingFiles.length === 0 && (
            <p className="text-center text-xs text-gray-400 py-2">
              No files added yet — use the drop zone above to get started.
            </p>
          )}
        </div>

        {/* ── Modal Footer ── */}
        <div className="flex items-center justify-between gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50/40">
          <button
            type="button"
            onClick={handleClose}
            disabled={isUploading}
            className="text-sm text-gray-500 hover:text-gray-700 transition-colors disabled:opacity-40"
          >
            {allDone ? "Close" : "Cancel"}
          </button>

          <div className="flex items-center gap-3">
            {pendingFiles.length > 0 && !allDone && doneCount > 0 && (
              <span className="text-xs text-gray-400">{doneCount} of {pendingFiles.length} done</span>
            )}
            <button
              type="button"
              onClick={uploadAll}
              disabled={pendingCount === 0 || isUploading}
              className={`flex items-center gap-2 text-sm font-semibold px-5 py-2 rounded-lg transition-all ${
                pendingCount > 0 && !isUploading
                  ? "bg-blue-600 text-white hover:bg-blue-700 shadow-sm shadow-blue-200"
                  : "bg-gray-100 text-gray-400 cursor-not-allowed"
              }`}
            >
              {isUploading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Upload className="w-3.5 h-3.5" />
              )}
              {isUploading
                ? "Uploading…"
                : pendingCount === 0 && allDone
                ? "All Done"
                : `Upload ${pendingCount} File${pendingCount !== 1 ? "s" : ""}`}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────
const EditEmployer = () => {
  const { refCode } = useParams();
  const isNew = refCode === "new";
  const navigate = useNavigate();
  const location = useLocation();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const navItems = [
    { label: "HOME", path: adminPath("/dashboard") },
    { label: "AGENCY PROFILE", path: adminPath("/agency-profile") },
    { label: "ADD", path: adminPath("/add-maid") },
    { label: "EDIT/DELETE", path: adminPath("/edit-maids") },
    { label: "REQUESTS", path: adminPath("/requests") },
    { label: "CHAT SUPPORT", path: adminPath("/chat-support") },
    { label: "PASSWORD MANAGEMENT", path: adminPath("/change-password") },
    { label: "INCOMING INQUIRIES", path: adminPath("/enquiry") },
  ];

  // ── State (unchanged field names & structure) ─────────────────────────────
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

  const [notificationDate, setNotificationDate] = useState({
    month: isNew ? "" : "JANUARY",
    year: isNew ? "" : "2017",
  });

  // Tracks whether maid fields were auto-filled from search
  const [maidAutoFilled, setMaidAutoFilled] = useState(false);

  // Tracks uploaded files per category: key = category name
  const [categoryUploads, setCategoryUploads] = useState<Record<string, UploadedFile[]>>({});

  const updateCategoryUploads = (cat: string, files: UploadedFile[]) =>
    setCategoryUploads((prev) => ({ ...prev, [cat]: files }));

  // Bulk upload
  const [bulkUploadOpen, setBulkUploadOpen] = useState(false);

  const handleBulkUploadComplete = (byCategory: Record<string, UploadedFile[]>) => {
    setCategoryUploads((prev) => {
      const merged = { ...prev };
      for (const [cat, files] of Object.entries(byCategory)) {
        merged[cat] = [...(merged[cat] ?? []), ...files];
      }
      return merged;
    });
  };

  const uploadedDocuments = Object.values(categoryUploads).flat();

  const handleDownloadForms = async () => {
    if (uploadedDocuments.length === 0) {
      toast.error("Upload at least one document first");
      return;
    }

    try {
      const code = !isNew && refCode ? refCode : "temp";
      const { skippedCount } = await downloadMergedEmployerPdf(
        uploadedDocuments,
        `employer-${code}-forms.pdf`
      );
      if (skippedCount > 0) {
        toast.success(`Merged PDF downloaded. Skipped ${skippedCount} non-PDF file${skippedCount === 1 ? "" : "s"}.`);
        return;
      }
      toast.success("Merged PDF downloaded");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to download forms");
    }
  };

  const handlePrintForms = async () => {
    if (uploadedDocuments.length === 0) {
      toast.error("Upload at least one document first");
      return;
    }

    try {
      const formData = { maid, agency, employer, spouse, familyMembers, notificationDate };
      const { skippedCount } = await printMergedEmployerPdf(uploadedDocuments, formData);
      if (skippedCount > 0) {
        toast.success(`Print preview opened. Skipped ${skippedCount} non-PDF file${skippedCount === 1 ? "" : "s"}.`);
        return;
      }
      toast.success("Print preview opened");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to print forms");
    }
  };

  // ── Load existing data ────────────────────────────────────────────────────
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
            documents?: Array<{
              category?: string;
              fileUrl?: string;
              fileName?: string;
            }>;
          };
        };
        if (!response.ok || !data.employer) return;
        if (data.employer.maid) setMaid((data.employer.maid as typeof maid) ?? maid);
        if (data.employer.agency) setAgency((data.employer.agency as typeof agency) ?? agency);
        if (data.employer.employer) setEmployer((data.employer.employer as typeof employer) ?? employer);
        if (data.employer.spouse) setSpouse((data.employer.spouse as typeof spouse) ?? spouse);
        if (data.employer.familyMembers) setFamilyMembers((data.employer.familyMembers as typeof familyMembers) ?? familyMembers);
        if (Array.isArray(data.employer.documents)) {
          const uploadsByCategory = data.employer.documents.reduce<Record<string, UploadedFile[]>>((acc, document) => {
            const category = String(document.category ?? "").trim();
            const url = String(document.fileUrl ?? "").trim();
            const name = String(document.fileName ?? "").trim();
            if (!category || !url || !name) return acc;
            const entry: UploadedFile = { category, url, name };
            acc[category] = [...(acc[category] ?? []), entry];
            return acc;
          }, {});
          setCategoryUploads(uploadsByCategory);
        }
      } catch {
        // no-op
      }
    };
    void load();
  }, [isNew, refCode, agency, employer, familyMembers, maid, spouse]);

  // ── Submit (unchanged) ────────────────────────────────────────────────────
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
          documents: Object.values(categoryUploads).flat().map((file) => ({
            category: file.category,
            fileUrl: file.url,
            fileName: file.name,
          })),
        }),
      });
      const data = (await response.json().catch(() => ({}))) as {
        error?: string;
        employer?: { refCode?: string };
      };
      if (!response.ok || !data.employer?.refCode)
        throw new Error(data.error || "Failed to submit employer contract");
      toast.success("Employer contract saved");
      if (isNew)
        navigate(`/employer/${encodeURIComponent(data.employer.refCode)}`, { replace: true });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to submit employer contract");
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Handle maid auto-fill ─────────────────────────────────────────────────
  const handleMaidSelect = (selected: (typeof MAID_DIRECTORY)[0] | null) => {
    if (!selected) {
      setMaidAutoFilled(false);
      return;
    }
    setMaid((prev) => ({
      ...prev,
      name: selected.name,
      nationality: selected.nationality,
      workPermitNo: selected.workPermitNo,
      finNo: selected.finNo,
      passportNo: selected.passportNo,
      salary: selected.salary,
      numberOfTerms: selected.numberOfTerms,
      communicationToBuy: selected.communicationToBuy,
      nameOfReplacement: selected.nameOfReplacement,
      passportOfMaid: selected.passportOfMaid,
    }));
    setMaidAutoFilled(true);
  };

  // ─── Ordinal helper ───────────────────────────────────────────────────────
  const ordinal = (n: number) => {
    if (n === 1) return "1st";
    if (n === 2) return "2nd";
    if (n === 3) return "3rd";
    return `${n}th`;
  };

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <>
      <nav className="bg-secondary border-b">
        <div className="max-w-5xl mx-auto px-4 flex flex-wrap justify-center items-center gap-1 py-1">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`px-3 py-2 text-xs font-bold uppercase tracking-wide rounded-sm transition-colors active:scale-[0.97] ${
                location.pathname === item.path || location.pathname.startsWith(`${item.path}/`)
                  ? "bg-primary text-primary-foreground"
                  : "text-primary hover:bg-primary/10"
              }`}
            >
              {item.label}
            </Link>
          ))}
        </div>
      </nav>
      <div className="page-container max-w-4xl">
      {/* ── Page header ──────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <Link
            to="/agencyadmin/employment-contracts"
            className="text-xs text-primary hover:underline flex items-center gap-1 mb-2"
          >
            ← Back to Employment Listing
          </Link>
          <h2 className="text-xl font-bold text-gray-900">
            {isNew ? "Add a New Employer" : "Edit Employer Record"}
          </h2>
          {!isNew && (
            <p className="text-sm text-gray-500 mt-0.5">
              Reference:{" "}
              <span className="font-semibold text-primary">{refCode}</span>
            </p>
          )}
        </div>

        {/* Quick-save button in header for convenience */}
        <Button
          onClick={() => void submitEmployerContract()}
          disabled={isSubmitting}
          className="hidden sm:flex items-center gap-2"
        >
          {isSubmitting ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Check className="w-4 h-4" />
          )}
          {isNew ? "Create Record" : "Save Changes"}
        </Button>
      </div>

      {/* ── Form body ─────────────────────────────────────────────────────── */}
      <div className="space-y-5 animate-fade-in-up">

        {/* ── SECTION 1: Maid Information ──────────────────────────────── */}
        <SectionCard title="Maid Information" icon={User} accent="blue">

          {/* Maid search / select */}
          <div className="bg-blue-50/50 rounded-lg border border-blue-100 p-3 space-y-1.5">
            <p className="text-xs font-semibold text-blue-700">Quick Select — Existing Maid</p>
            <p className="text-xs text-gray-500">Search the maid directory to auto-fill the fields below.</p>
            <MaidSearchSelect onSelect={handleMaidSelect} />
          </div>

          {/* Maid fields */}
          <div className="space-y-3.5">
            <Field label="Maid's Name" required>
              <Input
                value={maid.name}
                onChange={(e) => setMaid({ ...maid, name: e.target.value })}
                placeholder="Full name as per passport"
                readOnly={maidAutoFilled}
                className={maidAutoFilled ? "bg-gray-50 text-gray-500 cursor-not-allowed" : ""}
              />
            </Field>

            <Field label="Maid's Nationality">
              <Select
                value={maid.nationality || undefined}
                onValueChange={(v) => setMaid({ ...maid, nationality: v })}
                disabled={maidAutoFilled}
              >
                <SelectTrigger className={maidAutoFilled ? "bg-gray-50 text-gray-500" : ""}>
                  <SelectValue placeholder="Select nationality" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Indian maid">Indian</SelectItem>
                  <SelectItem value="Filipino maid">Filipino</SelectItem>
                  <SelectItem value="Indonesian maid">Indonesian</SelectItem>
                  <SelectItem value="Myanmar maid">Myanmar</SelectItem>
                </SelectContent>
              </Select>
            </Field>

            <div className="grid sm:grid-cols-2 gap-3.5">
              <Field label="Work Permit No.">
                <Input
                  value={maid.workPermitNo}
                  onChange={(e) => setMaid({ ...maid, workPermitNo: e.target.value })}
                  placeholder="e.g. G1234567P"
                  readOnly={maidAutoFilled}
                  className={maidAutoFilled ? "bg-gray-50 text-gray-500 cursor-not-allowed" : ""}
                />
              </Field>
              <Field label="FIN No.">
                <Input
                  value={maid.finNo}
                  onChange={(e) => setMaid({ ...maid, finNo: e.target.value })}
                  placeholder="e.g. G1234567P"
                  readOnly={maidAutoFilled}
                  className={maidAutoFilled ? "bg-gray-50 text-gray-500 cursor-not-allowed" : ""}
                />
              </Field>
            </div>

            <Field label="Passport No.">
              <Input
                value={maid.passportNo}
                onChange={(e) => setMaid({ ...maid, passportNo: e.target.value })}
                placeholder="Passport number"
                readOnly={maidAutoFilled}
                className={maidAutoFilled ? "bg-gray-50 text-gray-500 cursor-not-allowed" : ""}
              />
            </Field>

            <div className="grid sm:grid-cols-2 gap-3.5">
              <Field label="Monthly Salary (S$)">
                <Input
                  value={maid.salary}
                  onChange={(e) => setMaid({ ...maid, salary: e.target.value })}
                  placeholder="e.g. 800"
                />
              </Field>
              <Field label="Number of Terms">
                <Input
                  value={maid.numberOfTerms}
                  onChange={(e) => setMaid({ ...maid, numberOfTerms: e.target.value })}
                  placeholder="e.g. 2"
                />
              </Field>
            </div>

            <Field label="Communication to Buy">
              <Input
                value={maid.communicationToBuy}
                onChange={(e) => setMaid({ ...maid, communicationToBuy: e.target.value })}
                placeholder="e.g. Mobile phone"
              />
            </Field>

            <SubHeader label="Replacement Details" />

            <Field label="Name of Maid Replaced">
              <Input
                value={maid.nameOfReplacement}
                onChange={(e) => setMaid({ ...maid, nameOfReplacement: e.target.value })}
                placeholder="Previous maid's name (if applicable)"
              />
            </Field>
            <Field label="Passport of Maid Replaced">
              <Input
                value={maid.passportOfMaid}
                onChange={(e) => setMaid({ ...maid, passportOfMaid: e.target.value })}
                placeholder="Previous maid's passport no."
              />
            </Field>
          </div>
        </SectionCard>

        {/* ── SECTION 2: Employer Information ──────────────────────────── */}
        <SectionCard title="Employer Information" icon={Building2} accent="indigo">
          <div className="space-y-3.5">
            <Field label="Full Name" required>
              <Input
                value={employer.name}
                onChange={(e) => setEmployer({ ...employer, name: e.target.value })}
                placeholder="Employer's full legal name"
              />
            </Field>

            <Field label="Gender">
              <RadioGroup
                name="emp-gender"
                options={["Male", "Female"]}
                value={employer.gender}
                onChange={(v) => setEmployer({ ...employer, gender: v })}
              />
            </Field>

            <Field label="Date of Birth">
              <DatePicker
                day={employer.dateOfBirthDay}
                month={employer.dateOfBirthMonth}
                year={employer.dateOfBirthYear}
                onDay={(v) => setEmployer({ ...employer, dateOfBirthDay: v })}
                onMonth={(v) => setEmployer({ ...employer, dateOfBirthMonth: v })}
                onYear={(v) => setEmployer({ ...employer, dateOfBirthYear: v })}
              />
            </Field>

            <div className="grid sm:grid-cols-2 gap-3.5">
              <Field label="Nationality">
                <Input
                  value={employer.nationality}
                  onChange={(e) => setEmployer({ ...employer, nationality: e.target.value })}
                  placeholder="e.g. Indian"
                />
              </Field>
              <Field label="Residential Status">
                <Select
                  value={employer.residentialStatus || undefined}
                  onValueChange={(v) => setEmployer({ ...employer, residentialStatus: v })}
                >
                  <SelectTrigger><SelectValue placeholder="Select status" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Singapore Permanent Resident">Singapore Permanent Resident</SelectItem>
                    <SelectItem value="Singapore Citizen">Singapore Citizen</SelectItem>
                    <SelectItem value="Employment Pass">Employment Pass</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
            </div>

            <Field label="NRIC / FIN / Passport">
              <Input
                value={employer.nric}
                onChange={(e) => setEmployer({ ...employer, nric: e.target.value })}
                placeholder="e.g. S1234567A"
              />
            </Field>

            <SubHeader label="Address" />

            <Field label="Address Line 1">
              <Input
                value={employer.addressLine1}
                onChange={(e) => setEmployer({ ...employer, addressLine1: e.target.value })}
                placeholder="Street address, unit no."
              />
            </Field>
            <Field label="Address Line 2">
              <Input
                value={employer.addressLine2}
                onChange={(e) => setEmployer({ ...employer, addressLine2: e.target.value })}
                placeholder="Block / building name (optional)"
              />
            </Field>
            <Field label="Postal Code">
              <Input
                value={employer.postalCode}
                onChange={(e) => setEmployer({ ...employer, postalCode: e.target.value })}
                placeholder="6-digit postal code"
                className="max-w-[140px]"
              />
            </Field>

            <Field label="Type of Residence">
              <div className="flex flex-wrap gap-2">
                {["HDB 2-ROOM","HDB 3-ROOM","HDB 4-ROOM","HDB 5-ROOM","HDB Executive","Condo","Terrace","Semi-D","Bungalow"].map((t) => (
                  <label
                    key={t}
                    className={`text-xs px-2.5 py-1.5 rounded-lg border cursor-pointer transition-colors ${
                      employer.typeOfResidence === t
                        ? "bg-indigo-50 border-indigo-300 text-indigo-700 font-semibold"
                        : "border-gray-200 text-gray-600 hover:border-gray-300"
                    }`}
                  >
                    <input
                      type="radio"
                      name="residence"
                      checked={employer.typeOfResidence === t}
                      onChange={() => setEmployer({ ...employer, typeOfResidence: t })}
                      className="sr-only"
                    />
                    {t}
                  </label>
                ))}
              </div>
            </Field>

            <SubHeader label="Contact & Employment" />

            <div className="grid sm:grid-cols-2 gap-3.5">
              <Field label="Occupation">
                <Input
                  value={employer.occupation}
                  onChange={(e) => setEmployer({ ...employer, occupation: e.target.value })}
                  placeholder="e.g. Manager"
                />
              </Field>
              <Field label="Company">
                <Input
                  value={employer.company}
                  onChange={(e) => setEmployer({ ...employer, company: e.target.value })}
                  placeholder="Company name"
                />
              </Field>
              <Field label="Email Address">
                <Input
                  type="email"
                  value={employer.email}
                  onChange={(e) => setEmployer({ ...employer, email: e.target.value })}
                  placeholder="email@example.com"
                />
              </Field>
              <Field label="Monthly Contribution (S$)">
                <Input
                  value={employer.monthlyContribution}
                  onChange={(e) => setEmployer({ ...employer, monthlyContribution: e.target.value })}
                  placeholder="e.g. 5,700"
                />
              </Field>
              <Field label="Residential Phone">
                <Input
                  value={employer.residentialPhone}
                  onChange={(e) => setEmployer({ ...employer, residentialPhone: e.target.value })}
                  placeholder="e.g. 64643212"
                />
              </Field>
              <Field label="Handphone Number">
                <Input
                  value={employer.mobileNumber}
                  onChange={(e) => setEmployer({ ...employer, mobileNumber: e.target.value })}
                  placeholder="e.g. 91234567"
                />
              </Field>
            </div>

            <SubHeader label="Notification of Assessment" />

            <Field label="Assessment Month / Year" hint="Based on Annual Income or Bank Statement">
              <div className="flex flex-wrap gap-2 items-center">
                <Select
                  value={notificationDate.month || undefined}
                  onValueChange={(v) => setNotificationDate({ ...notificationDate, month: v })}
                >
                  <SelectTrigger className="w-36"><SelectValue placeholder="Month" /></SelectTrigger>
                  <SelectContent>
                    {["JANUARY","FEBRUARY","MARCH","APRIL","MAY","JUNE","JULY","AUGUST","SEPTEMBER","OCTOBER","NOVEMBER","DECEMBER"].map((m) => (
                      <SelectItem key={m} value={m}>{m}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  className="w-24"
                  value={notificationDate.year}
                  onChange={(e) => setNotificationDate({ ...notificationDate, year: e.target.value })}
                  placeholder="YYYY"
                />
              </div>
            </Field>

            <SubHeader label="Previous Employer" />

            <div className="grid sm:grid-cols-2 gap-3.5">
              <Field label="Existing Employer">
                <Input defaultValue="" placeholder="Previous employer's name" />
              </Field>
              <Field label="Existing Employer's NRIC">
                <Input defaultValue="" placeholder="Previous employer's NRIC" />
              </Field>
            </div>
          </div>
        </SectionCard>

        {/* ── SECTION 3: Spouse ─────────────────────────────────────────── */}
        <SectionCard title="Spouse" icon={Users} accent="violet">
          <div className="space-y-3.5">
            <Field label="Spouse's Name">
              <Input
                value={spouse.name}
                onChange={(e) => setSpouse({ ...spouse, name: e.target.value })}
                placeholder="Full legal name"
              />
            </Field>

            <Field label="Gender">
              <RadioGroup
                name="sp-gender"
                options={["Male", "Female"]}
                value={spouse.gender}
                onChange={(v) => setSpouse({ ...spouse, gender: v })}
              />
            </Field>

            <Field label="Date of Birth">
              <DatePicker
                day={spouse.dateOfBirthDay}
                month={spouse.dateOfBirthMonth}
                year={spouse.dateOfBirthYear}
                onDay={(v) => setSpouse({ ...spouse, dateOfBirthDay: v })}
                onMonth={(v) => setSpouse({ ...spouse, dateOfBirthMonth: v })}
                onYear={(v) => setSpouse({ ...spouse, dateOfBirthYear: v })}
              />
            </Field>

            <div className="grid sm:grid-cols-2 gap-3.5">
              <Field label="Nationality">
                <Input
                  value={spouse.nationality}
                  onChange={(e) => setSpouse({ ...spouse, nationality: e.target.value })}
                  placeholder="e.g. Indian"
                />
              </Field>
              <Field label="Residential Status">
                <Select
                  value={spouse.residentialStatus || undefined}
                  onValueChange={(v) => setSpouse({ ...spouse, residentialStatus: v })}
                >
                  <SelectTrigger><SelectValue placeholder="Select status" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Singapore Permanent Resident">Singapore Permanent Resident</SelectItem>
                    <SelectItem value="Singapore Citizen">Singapore Citizen</SelectItem>
                    <SelectItem value="Employment Pass">Employment Pass</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
            </div>

            <Field label="NRIC / FIN / Passport">
              <Input
                value={spouse.nric}
                onChange={(e) => setSpouse({ ...spouse, nric: e.target.value })}
                placeholder="e.g. S1234567B"
              />
            </Field>

            <div className="grid sm:grid-cols-2 gap-3.5">
              <Field label="Occupation">
                <Input
                  value={spouse.occupation}
                  onChange={(e) => setSpouse({ ...spouse, occupation: e.target.value })}
                  placeholder="e.g. Housewife"
                />
              </Field>
              <Field label="Company">
                <Input
                  value={spouse.company}
                  onChange={(e) => setSpouse({ ...spouse, company: e.target.value })}
                  placeholder="Company name (if applicable)"
                />
              </Field>
            </div>
          </div>
        </SectionCard>

        {/* ── SECTION 4: Family Members ─────────────────────────────────── */}
        {familyMembers.map((fm, idx) => (
          <SectionCard
            key={idx}
            title={`${ordinal(idx + 1)} Family Member`}
            icon={Users}
            accent="emerald"
          >
            <div className="space-y-3.5">
              <Field label="Name">
                <Input
                  value={fm.name}
                  onChange={(e) => {
                    const u = [...familyMembers];
                    u[idx] = { ...fm, name: e.target.value };
                    setFamilyMembers(u);
                  }}
                  placeholder="Full name"
                />
              </Field>

              <Field label="Type">
                <RadioGroup
                  name={`fm-type-${idx}`}
                  options={["Son", "Daughter"]}
                  value={fm.type}
                  onChange={(v) => {
                    const u = [...familyMembers];
                    u[idx] = { ...fm, type: v };
                    setFamilyMembers(u);
                  }}
                />
              </Field>

              <Field label="Relationship">
                <RadioGroup
                  name={`fm-rel-${idx}`}
                  options={["Father", "Mother", "Father-in-law", "Mother-in-law"]}
                  value={fm.relationship}
                  onChange={(v) => {
                    const u = [...familyMembers];
                    u[idx] = { ...fm, relationship: v };
                    setFamilyMembers(u);
                  }}
                />
              </Field>

              <Field label="Date of Birth">
                <Input
                  value={fm.dateOfBirth}
                  onChange={(e) => {
                    const u = [...familyMembers];
                    u[idx] = { ...fm, dateOfBirth: e.target.value };
                    setFamilyMembers(u);
                  }}
                  placeholder="DD/MM/YYYY"
                  className="max-w-[160px]"
                />
              </Field>
            </div>
          </SectionCard>
        ))}

        {/* ── SECTION 5: Contract Details (Agency / Invoice) ────────────── */}
        <SectionCard title="Contract Details" icon={Scroll} accent="amber">
          <div className="space-y-3.5">
            <Field label="Contract Date">
              <Input
                value={agency.contractDate}
                onChange={(e) => setAgency({ ...agency, contractDate: e.target.value })}
                placeholder="e.g. 25.11.2016"
                className="max-w-[160px]"
              />
            </Field>

            <Field label="Date of Employment">
              <div className="flex flex-wrap gap-2 items-center">
                <Select><SelectTrigger className="w-20"><SelectValue placeholder="DD" /></SelectTrigger>
                  <SelectContent>{Array.from({ length: 31 }, (_, i) => <SelectItem key={i} value={String(i + 1).padStart(2, "0")}>{String(i + 1).padStart(2, "0")}</SelectItem>)}</SelectContent>
                </Select>
                <Select><SelectTrigger className="w-20"><SelectValue placeholder="MM" /></SelectTrigger>
                  <SelectContent>{Array.from({ length: 12 }, (_, i) => <SelectItem key={i} value={String(i + 1).padStart(2, "0")}>{String(i + 1).padStart(2, "0")}</SelectItem>)}</SelectContent>
                </Select>
                <Select><SelectTrigger className="w-24"><SelectValue placeholder="YYYY" /></SelectTrigger>
                  <SelectContent>{Array.from({ length: 20 }, (_, i) => <SelectItem key={i} value={String(2010 + i)}>{2010 + i}</SelectItem>)}</SelectContent>
                </Select>
                <span className="text-xs text-gray-400">DD / MM / YYYY</span>
              </div>
            </Field>

            <SubHeader label="Invoice Manifest" />

            <div className="grid sm:grid-cols-2 gap-3.5">
              <Field label="Service Fee (S$)">
                <Input
                  value={agency.serviceFee}
                  onChange={(e) => setAgency({ ...agency, serviceFee: e.target.value })}
                  placeholder="0.00"
                />
              </Field>
              <Field label="Deposit (S$)">
                <Input
                  value={agency.deposit}
                  onChange={(e) => setAgency({ ...agency, deposit: e.target.value })}
                  placeholder="0.00"
                />
              </Field>
              <Field label="Handling / Hospital (S&T) Fee">
                <Input
                  value={agency.handlingInHospitalFee}
                  onChange={(e) => setAgency({ ...agency, handlingInHospitalFee: e.target.value })}
                  placeholder="0.00"
                />
              </Field>
              <Field label="Medical Fee (S$)">
                <Input
                  value={agency.medicalFee}
                  onChange={(e) => setAgency({ ...agency, medicalFee: e.target.value })}
                  placeholder="0.00"
                />
              </Field>
              <Field label="Extension Fee (S$)">
                <Input
                  value={agency.extensionFee}
                  onChange={(e) => setAgency({ ...agency, extensionFee: e.target.value })}
                  placeholder="0.00"
                />
              </Field>
              <Field label="Discounted Fee (S$)">
                <Input
                  value={agency.discountedFee}
                  onChange={(e) => setAgency({ ...agency, discountedFee: e.target.value })}
                  placeholder="0.00"
                />
              </Field>
              <Field label="Placement Fee — Maid (S$)">
                <Input
                  value={agency.placementFee}
                  onChange={(e) => setAgency({ ...agency, placementFee: e.target.value })}
                  placeholder="0.00"
                />
              </Field>
              <Field label="Balance Fee (S$)">
                <Input
                  value={agency.balanceFee}
                  onChange={(e) => setAgency({ ...agency, balanceFee: e.target.value })}
                  placeholder="0.00"
                />
              </Field>
            </div>

            <Field label="Agency Witness">
              <Select
                value={agency.agencyWitness || undefined}
                onValueChange={(v) => setAgency({ ...agency, agencyWitness: v })}
              >
                <SelectTrigger><SelectValue placeholder="Select witness" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Rahimunisha Binti Muhammadhan (R1107570)">
                    Rahimunisha Binti Muhammadhan (R1107570)
                  </SelectItem>
                </SelectContent>
              </Select>
            </Field>
          </div>
        </SectionCard>

        {/* ── CTA Buttons ───────────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2 pb-1 border-t border-gray-100">
          <Button
            onClick={() => void submitEmployerContract()}
            disabled={isSubmitting}
            className="w-full sm:w-auto min-w-[180px] flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Check className="w-4 h-4" />
            )}
            {isSubmitting
              ? "Saving…"
              : isNew
              ? "Create & Generate Forms"
              : "Save & Generate Forms"}
          </Button>
          <Button
            variant="outline"
            onClick={() => void handleDownloadForms()}
            className="w-full sm:w-auto min-w-[180px] flex items-center justify-center gap-2"
          >
            <Download className="w-4 h-4" />
            Download Merged PDF
          </Button>
          <Button
            variant="outline"
            onClick={() => void handlePrintForms()}
            className="w-full sm:w-auto min-w-[180px] flex items-center justify-center gap-2"
          >
            <Eye className="w-4 h-4" />
            Print Forms
          </Button>
        </div>

        <p className="text-xs text-gray-400 text-center pb-2">
          Auto-generated forms are for reference only. Please review before distribution.
        </p>

        {/* ── SECTION 6: Document Upload per Category ───────────────────── */}
        <SectionCard title="Documents & File Uploads" icon={FileCheck2} accent="slate">
          <div className="-mt-1 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
            <p className="text-xs text-gray-500">
              For categories with a template, you can preview it before uploading the signed copy.
              Categories without a template accept any file directly.
            </p>
            <button
              type="button"
              onClick={() => setBulkUploadOpen(true)}
              className="flex-shrink-0 flex items-center gap-2 text-xs font-semibold px-3.5 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 shadow-sm shadow-blue-200 transition-all"
            >
              <Upload className="w-3.5 h-3.5" />
              Bulk Upload
            </button>
          </div>
          <div className="space-y-2">
            {GENERATED_FORMS.map((cat) => (
              <CategoryFileUpload
                key={cat.category}
                category={cat.category}
                hasTemplate={cat.hasTemplate}
                refCode={refCode || "temp"}
                uploads={categoryUploads[cat.category] ?? []}
                onUpload={(files) => updateCategoryUploads(cat.category, files)}
              />
            ))}
          </div>
        </SectionCard>

        {/* ── Bulk Upload Modal ──────────────────────────────────────────── */}
        <BulkUploadModal
          open={bulkUploadOpen}
          onClose={() => setBulkUploadOpen(false)}
          refCode={refCode || "temp"}
          onUploadComplete={handleBulkUploadComplete}
        />

      </div>
    </div>
  </>
  );
};

export default EditEmployer;
