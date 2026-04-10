import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/sonner";
import { Copy, Trash2, Plus } from "lucide-react";

const mockEmployers = [
  { ref: "06579", date: "01-11-2014", employer: "Suresh Satyanarayana Balasubramanian", spouse: "Anupama Shivaprasad", maid: "Saraswathi Murugan" },
  { ref: "06578", date: "01-03-2026", employer: "Ling", spouse: "", maid: "Siamngaihmen" },
  { ref: "06577", date: "01-03-2026", employer: "Kushnaaz", spouse: "", maid: "Priya Rai" },
  { ref: "06576", date: "09-03-2022", employer: "GURJAR OMKAR RAMAKANT", spouse: "PURNIMA GURJAR", maid: "Aruna Bhujel" },
  { ref: "06575", date: "23-02-2020", employer: "KACHROO RUCHI", spouse: "GANDHAM ASHISH ARUN", maid: "Jina Thapa" },
  { ref: "06574", date: "05-03-2024", employer: "Yasha Shukla", spouse: "", maid: "Leiki Drema" },
  { ref: "06573", date: "27-02-2026", employer: "Ting Ying Tan", spouse: "", maid: "Chinzaniangi Cindy" },
  { ref: "06572", date: "23-02-2025", employer: "RAMAN CHOKANA THAPURAM SHIVRAMAKRISHNAN", spouse: "Usha Raman Iyer", maid: "Sunita Biswakarma" },
  { ref: "06571", date: "23-02-2026", employer: "Senthil Kumar", spouse: "", maid: "VahNeiChong Lhouvum" },
  { ref: "06570", date: "23-02-2026", employer: "ERPINI NIKITA", spouse: "GAMBHIR RAJAT", maid: "Laranjo Arlene Villarubia" },
  { ref: "06569", date: "20-02-2026", employer: "MUHAMMAD KHAIRULNIZAM BIN MOHAMED TAIB", spouse: "RENEWAL ONLY", maid: "FADRIQUELA LOVELY CASTANAS" },
  { ref: "06568", date: "17-02-2026", employer: "CHAUDHARY SHIVANI PUSHKAR", spouse: "CHAUDHARY PUSHKAR RAMESHCHANDRA", maid: "Deepika Subba" },
  { ref: "06567", date: "13-02-2026", employer: "KULDEEP SINGH J", spouse: "ASHA KUMARI JASTAUL / hp: 92396069", maid: "Chan Chan Nyein" },
  { ref: "06566", date: "10-02-2026", employer: "LAW CHEW LEE (LIU QIULI)", spouse: "TAN MENG GIE (CHEN MINGJIE)", maid: "EVA YULINA" },
  { ref: "06565", date: "08-02-2026", employer: "CHATTERJEE SHAIVAL", spouse: "PRIYANKA CHATTERJEE", maid: "HoiNeiLhing Singsit" },
  { ref: "06564", date: "08-02-2026", employer: "BIPASHA DOWERAH", spouse: "SANJEEV SAIKIA", maid: "Anita Rai" },
  { ref: "06563", date: "04-02-2026", employer: "MATHIVANAN S/O KASI", spouse: "", maid: "Haimiksung Pame" },
  { ref: "06562", date: "01-02-2026", employer: "NANDA ASHOK KUMAR (back out)", spouse: "PANI DEVEE ARCHANA", maid: "Pem Doma Sherpa" },
  { ref: "06561", date: "31-01-2026", employer: "SHANN CHOW PUI WING", spouse: "LU JIANAN", maid: "Ngahkhokim Lhouvum" },
  { ref: "06560", date: "28-01-2026", employer: "HULLENALLI NARASEGOWDA PREMA LATHA", spouse: "SHIVASANDRA GANGANNA SOMASHEKAR", maid: "Anu Khawas" },
];

type EmployerRow = {
  ref: string;
  date: string;
  employer: string;
  spouse: string;
  maid: string;
};

const PAGE_SIZE = 20;

const EmploymentContracts = () => {
  const navigate = useNavigate();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(1);
  const [employers, setEmployers] = useState<EmployerRow[]>(() => [...mockEmployers]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isMutating, setIsMutating] = useState(false);

  const toggleSelect = (ref: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(ref)) next.delete(ref);
      else next.add(ref);
      return next;
    });
  };

  const totalPages = Math.max(1, Math.ceil(employers.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paginatedEmployers = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return employers.slice(start, start + PAGE_SIZE);
  }, [currentPage, employers]);

  useEffect(() => {
    if (page !== currentPage) setPage(currentPage);
  }, [currentPage, page]);

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
        const employer = (record.employer as Record<string, unknown>) || {};
        const spouse = (record.spouse as Record<string, unknown>) || {};
        const maid = (record.maid as Record<string, unknown>) || {};
        const agency = (record.agency as Record<string, unknown>) || {};
        const contractDate = String(agency.contractDate ?? "");
        return {
          ref: String(record.refCode ?? "").trim(),
          date: contractDate || String(record.updatedAt ?? record.createdAt ?? ""),
          employer: String(employer.name ?? ""),
          spouse: String(spouse.name ?? ""),
          maid: String(maid.name ?? ""),
        };
      });

      setEmployers(rows.filter((r) => r.ref));
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "Failed to load employers");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadEmployers();
  }, []);

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
          }),
        });
        const createData = (await createResponse.json().catch(() => ({}))) as { error?: string };
        if (!createResponse.ok) {
          throw new Error(createData.error || `Failed to duplicate ${ref}`);
        }
      }

      toast.success(`${refs.length} employer${refs.length === 1 ? "" : "s"} duplicated`);
      setSelected(new Set());
      await loadEmployers();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to duplicate employer");
    } finally {
      setIsMutating(false);
    }
  };

  const handleDelete = async () => {
    if (isMutating) return;
    const refs = Array.from(selected);
    if (refs.length === 0) return;
    try {
      setIsMutating(true);
      for (const ref of refs) {
        const response = await fetch(`/api/employers/${encodeURIComponent(ref)}`, { method: "DELETE" });
        const data = (await response.json().catch(() => ({}))) as { error?: string };
        if (!response.ok) throw new Error(data.error || `Failed to delete ${ref}`);
      }
      toast.success(`${refs.length} employer${refs.length === 1 ? "" : "s"} deleted`);
      setSelected(new Set());
      await loadEmployers();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete employer");
    } finally {
      setIsMutating(false);
    }
  };

  return (
    <div className="page-container">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <h2 className="text-xl font-bold">Employment Contracts & Forms</h2>
        <p className="text-sm">
          Total <span className="text-success font-bold">{employers.length}</span> Employers found
        </p>
      </div>

      <div className="content-card animate-fade-in-up space-y-4">
        <div className="flex gap-2">
          <Button size="sm" onClick={() => navigate("/employer/new")}>
            <Plus className="w-3 h-3 mr-1" /> Add New Employer
          </Button>
          <Button variant="outline" size="sm" disabled={selected.size === 0 || isMutating} onClick={() => void handleDuplicate()}>
            <Copy className="w-3 h-3 mr-1" /> Duplicate Employer
          </Button>
          <Button variant="destructive" size="sm" disabled={selected.size === 0 || isMutating} onClick={() => void handleDelete()}>
            <Trash2 className="w-3 h-3 mr-1" /> Delete Employer
          </Button>
        </div>

        <div className="overflow-x-auto border rounded-lg">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-secondary">
                <th className="border-b px-3 py-2 text-left font-semibold text-xs">Ref.</th>
                <th className="border-b px-3 py-2 text-left font-semibold text-xs">Contract Date</th>
                <th className="border-b px-3 py-2 text-left font-semibold text-xs">Employer Name</th>
                <th className="border-b px-3 py-2 text-left font-semibold text-xs">Spouse Name</th>
                <th className="border-b px-3 py-2 text-left font-semibold text-xs">Maid Name</th>
                <th className="border-b px-3 py-2 text-center font-semibold text-xs w-16">Select</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td className="border-b px-3 py-6 text-center text-sm text-muted-foreground" colSpan={6}>
                    Loading…
                  </td>
                </tr>
              ) : loadError ? (
                <tr>
                  <td className="border-b px-3 py-6 text-center text-sm text-destructive" colSpan={6}>
                    {loadError}
                  </td>
                </tr>
              ) : paginatedEmployers.length === 0 ? (
                <tr>
                  <td className="border-b px-3 py-6 text-center text-sm text-muted-foreground" colSpan={6}>
                    No contracts found.
                  </td>
                </tr>
              ) : paginatedEmployers.map((emp, i) => (
                <tr
                  key={emp.ref}
                  className={`hover:bg-accent/10 transition-colors cursor-pointer ${i % 2 === 0 ? "bg-card" : "bg-secondary/30"}`}
                  style={{
                    animation: "fade-in-up 0.3s cubic-bezier(0.16,1,0.3,1) forwards",
                    animationDelay: `${i * 0.02}s`,
                    opacity: 0,
                  }}
                  onClick={() => navigate(`/employer/${emp.ref}`)}
                >
                  <td className="border-b px-3 py-2 text-xs text-muted-foreground">{emp.ref}</td>
                  <td className="border-b px-3 py-2 text-xs">{emp.date}</td>
                  <td className="border-b px-3 py-2 text-xs font-medium text-primary">{emp.employer}</td>
                  <td className="border-b px-3 py-2 text-xs">{emp.spouse || "—"}</td>
                  <td className="border-b px-3 py-2 text-xs text-primary">{emp.maid}</td>
                  <td className="border-b px-3 py-2 text-center" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={selected.has(emp.ref)}
                      onChange={() => toggleSelect(emp.ref)}
                      onClick={(e) => e.stopPropagation()}
                      className="accent-primary"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-1 text-sm">
          {Array.from({ length: totalPages }, (_, i) => (
            <button
              key={i}
              onClick={() => setPage(i + 1)}
              className={`w-7 h-7 rounded text-xs ${i + 1 === page ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
            >
              {i + 1}
            </button>
          ))}
          <button
            className="px-2 h-7 rounded border text-xs ml-1 disabled:cursor-not-allowed disabled:opacity-50"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
          >
            Next
          </button>
          <button
            className="px-2 h-7 rounded border text-xs disabled:cursor-not-allowed disabled:opacity-50"
            onClick={() => setPage(totalPages)}
            disabled={page >= totalPages}
          >
            Last
          </button>
        </div>
      </div>
    </div>
  );
};

export default EmploymentContracts;
