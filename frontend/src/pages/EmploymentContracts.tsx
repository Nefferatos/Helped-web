import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "@/components/ui/sonner";
import {
  Copy,
  Search,
  Trash2,
  Plus,
  FileText,
  User,
  Users,
  Star,
  ChevronLeft,
  ChevronRight,
  ChevronsRight,
  X,
  AlertTriangle,
  CheckSquare,
  Square,
} from "lucide-react";
import { adminPath } from "@/lib/routes";

const mockEmployers = [
  {
    ref: "06579",
    date: "01-11-2014",
    employer: "Suresh Satyanarayana Balasubramanian",
    spouse: "Anupama Shivaprasad",
    maid: "Saraswathi Murugan",
  },
];

type EmployerRow = {
  ref: string;
  date: string;
  employer: string;
  employerNationality: string;
  spouse: string;
  spouseNationality: string;
  maid: string;
  maidNationality: string;
};

const PAGE_SIZE = 20;

/* ─── Skeleton row ─────────────────────────────────────────────────────── */
function SkeletonRow() {
  return (
    <div className="animate-pulse flex items-center gap-4 rounded-2xl border border-gray-100 bg-white px-5 py-4">
      <div className="h-5 w-16 rounded-lg bg-gray-100" />
      <div className="h-5 w-24 rounded-lg bg-gray-100" />
      <div className="h-5 flex-1 rounded-lg bg-gray-100" />
      <div className="h-5 w-32 rounded-lg bg-gray-100" />
      <div className="h-5 w-32 rounded-lg bg-gray-100" />
      <div className="h-5 w-8 rounded bg-gray-100" />
    </div>
  );
}

/* ─── Confirm delete modal ─────────────────────────────────────────────── */
function ConfirmModal({
  count,
  onConfirm,
  onCancel,
}: {
  count: number;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="mx-4 w-full max-w-sm rounded-3xl border border-red-100 bg-white p-6 shadow-2xl">
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-red-100">
          <AlertTriangle className="h-7 w-7 text-red-600" />
        </div>
        <p className="text-[20px] font-bold text-gray-900 mb-1.5">Delete {count} contract{count !== 1 ? "s" : ""}?</p>
        <p className="text-[15px] text-gray-500 leading-relaxed mb-6">
          This action cannot be undone. All selected employment records will be permanently removed.
        </p>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 rounded-2xl border border-gray-200 bg-gray-50 py-3 text-[15px] font-semibold text-gray-700 hover:bg-gray-100 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 rounded-2xl bg-red-600 py-3 text-[15px] font-semibold text-white hover:bg-red-700 transition-colors"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Main component ───────────────────────────────────────────────────── */
const EmploymentContracts = () => {
  const navigate = useNavigate();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(1);
  const [employers, setEmployers] = useState<EmployerRow[]>(() =>
    mockEmployers.map((item) => ({
      ...item,
      employerNationality: "",
      spouseNationality: "",
      maidNationality: "",
    })),
  );
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isMutating, setIsMutating] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  /* ── Selection helpers ── */
  const toggleSelect = (ref: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(ref)) next.delete(ref);
      else next.add(ref);
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === paginatedEmployers.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(paginatedEmployers.map((e) => e.ref)));
    }
  };

  /* ── Filtering & pagination ── */
  const filteredEmployers = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return employers;
    return employers.filter((r) =>
      [r.ref, r.employer, r.employerNationality, r.spouse, r.spouseNationality, r.maid, r.maidNationality]
        .join(" ")
        .toLowerCase()
        .includes(term),
    );
  }, [employers, searchTerm]);

  const totalPages = Math.max(1, Math.ceil(filteredEmployers.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);

  const paginatedEmployers = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredEmployers.slice(start, start + PAGE_SIZE);
  }, [currentPage, filteredEmployers]);

  useEffect(() => { if (page !== currentPage) setPage(currentPage); }, [currentPage, page]);
  useEffect(() => { setPage(1); setSelected(new Set()); }, [searchTerm]);

  /* ── Load ── */
  const loadEmployers = async () => {
    try {
      setIsLoading(true);
      setLoadError(null);
      const response = await fetch("/api/employers");
      const data = (await response.json().catch(() => ({}))) as {
        employers?: Array<{
          refCode?: string;
          createdAt?: string;
          updatedAt?: string;
          maid?: Record<string, unknown>;
          agency?: Record<string, unknown>;
          employer?: Record<string, unknown>;
          spouse?: Record<string, unknown>;
        }>;
        error?: string;
      };
      if (!response.ok) throw new Error(data.error || "Failed to load employers");
      if (!Array.isArray(data.employers)) return;

      const rows: EmployerRow[] = data.employers.map((record) => {
        const emp = (record.employer as Record<string, unknown>) || {};
        const sp = (record.spouse as Record<string, unknown>) || {};
        const maid = (record.maid as Record<string, unknown>) || {};
        const agency = (record.agency as Record<string, unknown>) || {};
        const contractDate = String(agency.contractDate ?? "");
        return {
          ref: String(record.refCode ?? "").trim(),
          date: contractDate || String(record.updatedAt ?? record.createdAt ?? ""),
          employer: String(emp.name ?? ""),
          employerNationality: String(emp.nationality ?? ""),
          spouse: String(sp.name ?? ""),
          spouseNationality: String(sp.nationality ?? ""),
          maid: String(maid.name ?? ""),
          maidNationality: String(maid.nationality ?? ""),
        };
      });

      setEmployers(rows.filter((r) => r.ref));
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "Failed to load employers");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { void loadEmployers(); }, []);

  /* ── Duplicate ── */
  const handleDuplicate = async () => {
    if (isMutating) return;
    const refs = Array.from(selected);
    if (refs.length === 0) return;
    try {
      setIsMutating(true);
      for (const ref of refs) {
        const existingResponse = await fetch(`/api/employers/${encodeURIComponent(ref)}`);
        const existingData = (await existingResponse.json().catch(() => ({}))) as {
          employer?: {
            maid?: Record<string, unknown>;
            agency?: Record<string, unknown>;
            employer?: Record<string, unknown>;
            spouse?: Record<string, unknown>;
            familyMembers?: Array<Record<string, unknown>>;
            documents?: Array<Record<string, unknown>>;
          };
          error?: string;
        };
        if (!existingResponse.ok || !existingData.employer) {
          throw new Error(existingData.error || `Failed to load ${ref}`);
        }
        const createResponse = await fetch("/api/employers", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            refCode: null,
            maid: existingData.employer.maid ?? {},
            agency: existingData.employer.agency ?? {},
            employer: existingData.employer.employer ?? {},
            spouse: existingData.employer.spouse ?? {},
            familyMembers: existingData.employer.familyMembers ?? [],
            documents: existingData.employer.documents ?? [],
          }),
        });
        const createData = (await createResponse.json().catch(() => ({}))) as { error?: string };
        if (!createResponse.ok) throw new Error(createData.error || `Failed to duplicate ${ref}`);
      }
      toast.success(`${refs.length} contract${refs.length === 1 ? "" : "s"} duplicated`);
      setSelected(new Set());
      await loadEmployers();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to duplicate");
    } finally {
      setIsMutating(false);
    }
  };

  /* ── Delete ── */
  const handleDelete = async () => {
    if (isMutating) return;
    const refs = Array.from(selected);
    if (refs.length === 0) return;
    setShowDeleteModal(false);
    try {
      setIsMutating(true);
      for (const ref of refs) {
        const response = await fetch(`/api/employers/${encodeURIComponent(ref)}`, { method: "DELETE" });
        const data = (await response.json().catch(() => ({}))) as { error?: string };
        if (!response.ok) throw new Error(data.error || `Failed to delete ${ref}`);
      }
      toast.success(`${refs.length} contract${refs.length === 1 ? "" : "s"} deleted`);
      setSelected(new Set());
      await loadEmployers();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete");
    } finally {
      setIsMutating(false);
    }
  };

  /* ── Page numbers ── */
  const pageNumbers = useMemo(() => {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
    const pages: (number | "...")[] = [];
    for (let i = 1; i <= totalPages; i++) {
      if (i === 1 || i === totalPages || (i >= currentPage - 2 && i <= currentPage + 2)) {
        pages.push(i);
      } else if (pages[pages.length - 1] !== "...") {
        pages.push("...");
      }
    }
    return pages;
  }, [totalPages, currentPage]);

  const allSelected =
    paginatedEmployers.length > 0 && paginatedEmployers.every((e) => selected.has(e.ref));

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap');
        .ec-root, .ec-root * { font-family: 'DM Sans', sans-serif; }

        @keyframes ecFadeUp {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .ec-row-enter { animation: ecFadeUp 0.28s cubic-bezier(0.16,1,0.3,1) both; }

        .ec-row-hover:hover { background: linear-gradient(135deg, #f0fdf9 0%, #f8faff 100%); }
      `}</style>

      {showDeleteModal && (
        <ConfirmModal
          count={selected.size}
          onConfirm={() => void handleDelete()}
          onCancel={() => setShowDeleteModal(false)}
        />
      )}

      <div className="ec-root space-y-5">

        {/* ── Page header ── */}
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex h-13 w-13 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 shadow-lg" style={{ height: 52, width: 52 }}>
              <FileText className="h-6 w-6 text-white" />
            </div>
            <div>
              <h2 className="text-[22px] font-bold leading-tight text-gray-900">
                Employment Contracts
              </h2>
              <p className="text-[14px] text-gray-500 font-medium mt-0.5">
                Manage contracts &amp; employment forms
              </p>
            </div>
          </div>

          {/* Summary pills */}
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="flex items-center gap-2 rounded-2xl bg-emerald-50 border border-emerald-100 px-4 py-2">
              <div className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
              <span className="text-[15px] font-bold text-emerald-800">{filteredEmployers.length}</span>
              <span className="text-[13px] text-emerald-700 font-medium">
                {searchTerm ? "matching" : "total"}
              </span>
            </div>
            {searchTerm && (
              <div className="flex items-center gap-2 rounded-2xl bg-gray-100 border border-gray-200 px-4 py-2">
                <span className="text-[13px] text-gray-500 font-medium">of</span>
                <span className="text-[15px] font-bold text-gray-800">{employers.length}</span>
                <span className="text-[13px] text-gray-500 font-medium">total</span>
              </div>
            )}
            {selected.size > 0 && (
              <div className="flex items-center gap-2 rounded-2xl bg-violet-50 border border-violet-200 px-4 py-2">
                <span className="text-[15px] font-bold text-violet-800">{selected.size}</span>
                <span className="text-[13px] text-violet-700 font-medium">selected</span>
              </div>
            )}
          </div>
        </div>

        {/* ── Stat strip ── */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: "Total Contracts", value: employers.length, color: "text-emerald-700", bg: "bg-emerald-50 border-emerald-100", icon: <FileText className="h-5 w-5 text-emerald-600" /> },
            { label: "Employers", value: employers.filter((e) => e.employer).length, color: "text-sky-700", bg: "bg-sky-50 border-sky-100", icon: <User className="h-5 w-5 text-sky-600" /> },
            { label: "With Spouse", value: employers.filter((e) => e.spouse).length, color: "text-violet-700", bg: "bg-violet-50 border-violet-100", icon: <Users className="h-5 w-5 text-violet-600" /> },
            { label: "Maids Placed", value: employers.filter((e) => e.maid).length, color: "text-amber-700", bg: "bg-amber-50 border-amber-100", icon: <Star className="h-5 w-5 text-amber-500" /> },
          ].map((s) => (
            <div key={s.label} className={`rounded-2xl border px-4 py-3.5 ${s.bg} flex items-center gap-3`}>
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white shadow-sm">
                {s.icon}
              </div>
              <div>
                <p className={`text-[24px] font-bold leading-none ${s.color}`}>{s.value}</p>
                <p className="mt-1 text-[12px] font-semibold text-gray-500">{s.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* ── Main card ── */}
        <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">

          {/* Toolbar */}
          <div className="border-b border-gray-100 bg-gray-50/60 px-5 py-4 space-y-3">
            {/* Action buttons */}
            <div className="flex flex-wrap gap-2.5">
              <button
                onClick={() => navigate(adminPath("/employment-contracts/new"))}
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-[14px] font-bold text-white shadow-sm hover:bg-emerald-700 active:scale-95 transition-all"
              >
                <Plus className="h-4 w-4" />
                Add New Contract
              </button>
              <button
                disabled={selected.size === 0 || isMutating}
                onClick={() => void handleDuplicate()}
                className="inline-flex items-center gap-2 rounded-xl border border-sky-200 bg-sky-50 px-5 py-2.5 text-[14px] font-bold text-sky-700 hover:bg-sky-100 disabled:opacity-40 disabled:cursor-default active:scale-95 transition-all"
              >
                <Copy className="h-4 w-4" />
                Duplicate
                {selected.size > 0 && (
                  <span className="ml-0.5 rounded-full bg-sky-200 px-2 py-0.5 text-[12px]">
                    {selected.size}
                  </span>
                )}
              </button>
              <button
                disabled={selected.size === 0 || isMutating}
                onClick={() => setShowDeleteModal(true)}
                className="inline-flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-5 py-2.5 text-[14px] font-bold text-red-700 hover:bg-red-100 disabled:opacity-40 disabled:cursor-default active:scale-95 transition-all"
              >
                <Trash2 className="h-4 w-4" />
                Delete
                {selected.size > 0 && (
                  <span className="ml-0.5 rounded-full bg-red-200 px-2 py-0.5 text-[12px]">
                    {selected.size}
                  </span>
                )}
              </button>
            </div>

            {/* Helper text */}
            <p className="text-[13px] text-gray-500 leading-relaxed">
              Click <span className="font-bold text-emerald-700">Add New Contract</span> for a blank form,
              click a row to <span className="font-bold text-gray-700">view or edit</span> it, or
              check the boxes to <span className="font-bold text-sky-700">duplicate</span> /
              <span className="font-bold text-red-600"> delete</span> selected records.
            </p>

            {/* Search */}
            <div className="relative max-w-lg">
              <Search
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
                style={{ height: 18, width: 18 }}
              />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by name, ref number, spouse, or maid…"
                className="h-11 w-full rounded-xl border border-gray-200 bg-white pl-10 pr-10 text-[15px] text-gray-800 outline-none placeholder:text-gray-400 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 transition-all"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 flex h-6 w-6 items-center justify-center rounded-full bg-gray-200 text-gray-500 hover:bg-gray-300 transition-colors"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Table-style list header */}
          {!isLoading && !loadError && paginatedEmployers.length > 0 && (
            <div className="grid items-center gap-3 border-b border-gray-100 bg-gray-50 px-5 py-2.5"
              style={{ gridTemplateColumns: "72px 110px 1fr 1fr 1fr 44px" }}
            >
              <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400">Ref #</p>
              <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400">Date</p>
              <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400">Employer</p>
              <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400">Spouse</p>
              <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400">Maid</p>
              <button
                onClick={toggleAll}
                className="flex items-center justify-center text-gray-400 hover:text-emerald-600 transition-colors"
                title={allSelected ? "Deselect all" : "Select all on this page"}
              >
                {allSelected ? (
                  <CheckSquare className="h-5 w-5 text-emerald-600" />
                ) : (
                  <Square className="h-5 w-5" />
                )}
              </button>
            </div>
          )}

          {/* List body */}
          <div className="divide-y divide-gray-100 px-3 py-2">
            {isLoading ? (
              <div className="space-y-2 py-2">
                {Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)}
              </div>
            ) : loadError ? (
              <div className="flex flex-col items-center justify-center py-14 text-center">
                <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-red-100">
                  <AlertTriangle className="h-6 w-6 text-red-500" />
                </div>
                <p className="text-[16px] font-bold text-red-600">{loadError}</p>
                <button
                  onClick={() => void loadEmployers()}
                  className="mt-4 rounded-xl bg-red-600 px-5 py-2 text-[14px] font-semibold text-white hover:bg-red-700 transition-colors"
                >
                  Try Again
                </button>
              </div>
            ) : paginatedEmployers.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-14 text-center">
                <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-100">
                  <FileText className="h-6 w-6 text-gray-400" />
                </div>
                <p className="text-[17px] font-bold text-gray-700">No contracts found</p>
                <p className="mt-1.5 text-[14px] text-gray-400 max-w-[240px] leading-relaxed">
                  {searchTerm ? "Try a different search term." : "Add your first employment contract to get started."}
                </p>
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm("")}
                    className="mt-4 rounded-xl bg-emerald-600 px-5 py-2 text-[14px] font-semibold text-white hover:bg-emerald-700 transition-colors"
                  >
                    Clear search
                  </button>
                )}
              </div>
            ) : (
              paginatedEmployers.map((emp, i) => {
                const isSelected = selected.has(emp.ref);
                return (
                  <div
                    key={emp.ref}
                    className={`ec-row-enter ec-row-hover group grid cursor-pointer items-center gap-3 rounded-xl px-3 py-3.5 transition-all ${
                      isSelected ? "bg-emerald-50 border border-emerald-200" : "border border-transparent"
                    }`}
                    style={{
                      gridTemplateColumns: "72px 110px 1fr 1fr 1fr 44px",
                      animationDelay: `${i * 0.035}s`,
                    }}
                    onClick={() => navigate(adminPath(`/employment-contracts/${encodeURIComponent(emp.ref)}`))}
                  >
                    {/* Ref */}
                    <div>
                      <span className="inline-block rounded-lg bg-gray-100 px-2.5 py-1 text-[13px] font-bold text-gray-600 font-mono">
                        {emp.ref}
                      </span>
                    </div>

                    {/* Date */}
                    <p className="text-[13px] font-semibold text-gray-500">{emp.date || "—"}</p>

                    {/* Employer */}
                    <div className="min-w-0 flex items-center gap-2.5">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sky-100 text-sky-700 font-bold text-[12px]">
                        {emp.employer.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase() || "?"}
                      </div>
                      <p className="text-[14px] font-bold text-gray-900 truncate leading-snug">
                        {emp.employer || "—"}
                      </p>
                    </div>

                    {/* Spouse */}
                    <div className="min-w-0 flex items-center gap-2">
                      {emp.spouse ? (
                        <>
                          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-violet-100 text-violet-700 font-bold text-[11px]">
                            {emp.spouse.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase()}
                          </div>
                          <p className="text-[14px] font-semibold text-gray-700 truncate">{emp.spouse}</p>
                        </>
                      ) : (
                        <p className="text-[14px] text-gray-300 font-medium">—</p>
                      )}
                    </div>

                    {/* Maid */}
                    <div className="min-w-0 flex items-center gap-2">
                      {emp.maid ? (
                        <>
                          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-700 font-bold text-[11px]">
                            {emp.maid.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase()}
                          </div>
                          <p className="text-[14px] font-bold text-emerald-800 truncate">{emp.maid}</p>
                        </>
                      ) : (
                        <p className="text-[14px] text-gray-300 font-medium">—</p>
                      )}
                    </div>

                    {/* Checkbox */}
                    <div
                      className="flex justify-center"
                      onClick={(e) => { e.stopPropagation(); toggleSelect(emp.ref); }}
                    >
                      {isSelected ? (
                        <CheckSquare className="h-5 w-5 text-emerald-600" />
                      ) : (
                        <Square className="h-5 w-5 text-gray-300 group-hover:text-gray-400 transition-colors" />
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex flex-wrap items-center justify-between border-t border-gray-100 bg-gray-50/50 px-5 py-3.5 gap-3">
              <button
                disabled={currentPage <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-4 py-2 text-[14px] font-semibold text-gray-700 hover:border-emerald-300 hover:text-emerald-700 disabled:opacity-40 disabled:cursor-default transition-all"
              >
                <ChevronLeft className="h-4 w-4" /> Previous
              </button>

              <div className="flex items-center gap-1.5 flex-wrap justify-center">
                {pageNumbers.map((p, idx) =>
                  p === "..." ? (
                    <span key={`e-${idx}`} className="px-1 text-[14px] text-gray-400 font-medium">…</span>
                  ) : (
                    <button
                      key={p}
                      onClick={() => setPage(p as number)}
                      className={`flex h-9 w-9 items-center justify-center rounded-xl text-[14px] font-bold transition-all ${
                        p === currentPage
                          ? "bg-emerald-600 text-white shadow-sm"
                          : "bg-white border border-gray-200 text-gray-600 hover:border-emerald-300 hover:text-emerald-700"
                      }`}
                    >
                      {p}
                    </button>
                  ),
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  disabled={currentPage >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-4 py-2 text-[14px] font-semibold text-gray-700 hover:border-emerald-300 hover:text-emerald-700 disabled:opacity-40 disabled:cursor-default transition-all"
                >
                  Next <ChevronRight className="h-4 w-4" />
                </button>
                <button
                  disabled={currentPage >= totalPages}
                  onClick={() => setPage(totalPages)}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-2 text-[14px] font-semibold text-gray-700 hover:border-emerald-300 hover:text-emerald-700 disabled:opacity-40 disabled:cursor-default transition-all"
                  title="Last page"
                >
                  Last <ChevronsRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Results count footer */}
        {!isLoading && paginatedEmployers.length > 0 && (
          <p className="text-center text-[13px] text-gray-400 font-medium">
            Showing{" "}
            <span className="font-bold text-gray-700">
              {(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, filteredEmployers.length)}
            </span>{" "}
            of <span className="font-bold text-gray-700">{filteredEmployers.length}</span> contracts
          </p>
        )}
      </div>
    </>
  );
};

export default EmploymentContracts;