import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { calculateAge, formatDate, MaidProfile } from "@/lib/maids";
import { Search, Eye, EyeOff, Trash2, Download, Upload } from "lucide-react";
import { toast } from "@/components/ui/sonner";

type ViewMode = "menu" | "public" | "hidden";
const PAGE_SIZE = 15;

const EditMaids = () => {
  const navigate = useNavigate();
  const [view, setView] = useState<ViewMode>("menu");
  const [search, setSearch] = useState("");
  const [maids, setMaids] = useState<MaidProfile[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [page, setPage] = useState(1);

  const visibility = useMemo(() => {
    if (view === "public") return "public";
    if (view === "hidden") return "hidden";
    return null;
  }, [view]);

  useEffect(() => {
    if (!visibility) return;

    const controller = new AbortController();
    const load = async () => {
      try {
        setIsLoading(true);
        const params = new URLSearchParams({ visibility });
        if (search.trim()) params.set("search", search.trim());
        const response = await fetch(`/api/maids?${params.toString()}`, { signal: controller.signal });
        const data = (await response.json()) as { error?: string; maids?: MaidProfile[] };
        if (!response.ok || !data.maids) throw new Error(data.error || "Failed to load maids");
        setMaids(data.maids);
      } catch (error) {
        if (!(error instanceof DOMException && error.name === "AbortError")) {
          toast.error(error instanceof Error ? error.message : "Failed to load maids");
        }
      } finally {
        setIsLoading(false);
      }
    };

    void load();
    return () => controller.abort();
  }, [search, visibility]);

  useEffect(() => {
    setPage(1);
    setSelected(new Set());
  }, [search, view]);

  const totalPages = Math.max(1, Math.ceil(maids.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paginatedMaids = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return maids.slice(start, start + PAGE_SIZE);
  }, [currentPage, maids]);

  useEffect(() => {
    if (page !== currentPage) {
      setPage(currentPage);
    }
  }, [currentPage, page]);

  const toggle = (ref: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(ref) ? next.delete(ref) : next.add(ref);
      return next;
    });
  };

  const removeLocal = (referenceCode: string) => {
    setMaids((prev) => prev.filter((maid) => maid.referenceCode !== referenceCode));
    setSelected((prev) => {
      const next = new Set(prev);
      next.delete(referenceCode);
      return next;
    });
  };

  const deleteMaid = async (referenceCode: string) => {
    const response = await fetch(`/api/maids/${encodeURIComponent(referenceCode)}`, { method: "DELETE" });
    const data = (await response.json()) as { error?: string };
    if (!response.ok) throw new Error(data.error || "Failed to delete maid");
    removeLocal(referenceCode);
  };

  const toggleVisibility = async (maid: MaidProfile, isPublic: boolean) => {
    const response = await fetch(`/api/maids/${encodeURIComponent(maid.referenceCode)}/visibility`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isPublic }),
    });
    const data = (await response.json()) as { error?: string };
    if (!response.ok) throw new Error(data.error || "Failed to update visibility");
    removeLocal(maid.referenceCode);
  };

  const handleDeleteSelected = async () => {
    try {
      for (const ref of selected) {
        await deleteMaid(ref);
      }
      toast.success("Selected maids deleted");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete maids");
    }
  };

  const handleToggleSelected = async () => {
    try {
      const targetPublic = view !== "public";
      for (const maid of maids.filter((item) => selected.has(item.referenceCode))) {
        await toggleVisibility(maid, targetPublic);
      }
      toast.success(targetPublic ? "Selected maids made public" : "Selected maids hidden");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update selected maids");
    }
  };

  const handleExportCsv = async () => {
    try {
      setIsExporting(true);
      const response = await fetch("/api/maids/export.csv");
      if (!response.ok) {
        const data = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error || "Failed to export CSV");
      }
      const csv = await response.text();
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `maids-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      toast.success("CSV exported");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to export CSV");
    } finally {
      setIsExporting(false);
    }
  };

  const handleImportCsv = async (file?: File) => {
    if (!file) return;
    try {
      setIsImporting(true);
      const csvText = await file.text();
      const response = await fetch("/api/maids/import.csv", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ csv: csvText }),
      });
      const data = (await response.json()) as {
        error?: string;
        created?: number;
        updated?: number;
        failed?: number;
        errors?: string[];
      };

      if (!response.ok && response.status !== 207) {
        throw new Error(data.error || "Failed to import CSV");
      }

      const created = data.created ?? 0;
      const updated = data.updated ?? 0;
      const failed = data.failed ?? 0;
      toast.success(`Import done: ${created} created, ${updated} updated${failed ? `, ${failed} failed` : ""}`);
      if (failed && data.errors?.length) {
        toast.error(data.errors.slice(0, 2).join(" | "));
      }

      if (visibility) {
        const params = new URLSearchParams({ visibility });
        if (search.trim()) params.set("search", search.trim());
        const reload = await fetch(`/api/maids?${params.toString()}`);
        const reloadData = (await reload.json()) as { maids?: MaidProfile[] };
        if (reload.ok && reloadData.maids) setMaids(reloadData.maids);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to import CSV");
    } finally {
      setIsImporting(false);
    }
  };

  if (view === "menu") {
    return (
      <div className="page-container">
        <h2 className="mb-6 text-xl font-bold">Edit/Delete Maid</h2>
        <div className="content-card animate-fade-in-up space-y-6">
        <div className="flex gap-2">
          <Input placeholder="Maid name or Code" value={search} onChange={(e) => setSearch(e.target.value)} />
          <Button variant="outline"><Search className="mr-2 h-4 w-4" /> Search</Button>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => void handleExportCsv()} disabled={isExporting}>
            <Download className="mr-2 h-4 w-4" />
            {isExporting ? "Exporting..." : "Export Maids CSV"}
          </Button>
          <label className="inline-flex cursor-pointer">
            <input
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              disabled={isImporting}
              onChange={(event) => {
                const file = event.target.files?.[0];
                void handleImportCsv(file);
                event.currentTarget.value = "";
              }}
            />
            <span className="inline-flex items-center rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm hover:bg-accent hover:text-accent-foreground font-semibold">
              <Upload className="mr-2 h-4 w-4" />
              {isImporting ? "Importing..." : "Import CSV"}
            </span>
          </label>
        </div>
          <hr />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <button onClick={() => setView("public")} className="flex flex-col items-center gap-2 rounded-lg border p-6 transition-all hover:border-primary/30 hover:bg-secondary/50 active:scale-[0.98]">
              <Eye className="h-8 w-8 text-primary" />
              <span className="font-semibold text-primary">Maids In Public</span>
              <span className="text-xs text-black">Click to edit/delete maids in public</span>
            </button>
            <button onClick={() => setView("hidden")} className="flex flex-col items-center gap-2 rounded-lg border p-6 transition-all hover:border-primary/30 hover:bg-secondary/50 active:scale-[0.98]">
              <EyeOff className="h-8 w-8 text-muted-foreground" />
              <span className="font-semibold">Maids Hidden</span>
              <span className="text-xs text-black">Click to edit/delete hidden maids</span>
            </button>
          </div>
          <p className="text-center text-xs text-accent">Please note: maids without photos will not be displayed in public. After adding photos, you can make them searchable.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="mb-6 flex items-center gap-3">
        <button onClick={() => setView("menu")} className="text-sm text-primary hover:underline">Back</button>
        <h2 className="text-xl font-bold">{view === "public" ? "Maids in Public" : "Maids Hidden"}</h2>
      </div>

      <div className="content-card animate-fade-in-up space-y-4">
        <div className="flex gap-2">
          <Input placeholder="Maid name or Code" value={search} onChange={(e) => setSearch(e.target.value)} />
          <Button variant="outline"><Search className="mr-2 h-4 w-4" /> Search</Button>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => void handleExportCsv()} disabled={isExporting}>
            <Download className="mr-2 h-4 w-4" />
            {isExporting ? "Exporting..." : "Export Maids CSV"}
          </Button>
          <label className="inline-flex cursor-pointer">
            <input
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              disabled={isImporting}
              onChange={(event) => {
                const file = event.target.files?.[0];
                void handleImportCsv(file);
                event.currentTarget.value = "";
              }}
            />
            <span className="inline-flex items-center rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm hover:bg-accent hover:text-accent-foreground">
              <Upload className="mr-2 h-4 w-4" />
              {isImporting ? "Importing..." : "Import CSV"}
            </span>
          </label>
        </div>

        {isLoading ? (
          <div className="py-10 text-center text-black">Loading maids...</div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {paginatedMaids.map((maid, i) => {
              const age = calculateAge(maid.dateOfBirth);
              const photoPreview =
                Array.isArray(maid.photoDataUrls) && maid.photoDataUrls.length > 0
                  ? maid.photoDataUrls[0]
                  : maid.photoDataUrl;
              return (
                <div
                  key={maid.referenceCode}
                  className="flex flex-col items-center gap-2 rounded-lg border p-3 text-center transition-all hover:border-primary/30 hover:shadow-md"
                  style={{ animation: "fade-in-up 0.4s cubic-bezier(0.16,1,0.3,1) forwards", animationDelay: `${i * 0.04}s`, opacity: 0 }}
                >
                  <div
                    className="flex h-28 w-24 cursor-pointer items-center justify-center overflow-hidden rounded-md border bg-muted text-xs text-black transition-all hover:ring-2 hover:ring-primary/40"
                    onClick={() => navigate(`/maid/${encodeURIComponent(maid.referenceCode)}`)}
                  >
                    {photoPreview ? (
                      <img src={photoPreview} alt={`${maid.fullName}`} className="h-full w-full object-cover" />
                    ) : maid.hasPhoto ? (
                      "Photo"
                    ) : (
                      "No Photo"
                    )}
                  </div>
                  <p className="cursor-pointer text-xs font-semibold leading-tight transition-colors hover:text-primary" onClick={() => navigate(`/maid/${encodeURIComponent(maid.referenceCode)}`)}>{maid.fullName}</p>
                  <p className="text-[10px] text-black">{maid.referenceCode}</p>
                  <div className="flex flex-wrap justify-center gap-1">
                    <span className="rounded bg-secondary px-1.5 py-0.5 text-[10px]">{maid.nationality}</span>
                    <span className="rounded bg-accent/20 px-1.5 py-0.5 text-[10px] text-accent-foreground">{maid.type}</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground">{maid.maritalStatus}{age !== null ? `(${age})` : ""}</p>
                  <p className="text-[10px] text-muted-foreground">Upd: {formatDate(maid.updatedAt)}</p>
                  <div className="mt-auto flex w-full flex-col gap-1 border-t pt-2">
                    <label className="flex items-center justify-center gap-1 text-[10px]">
                      <input type="checkbox" checked={selected.has(maid.referenceCode)} onChange={() => toggle(maid.referenceCode)} className="accent-primary" />
                      Select
                    </label>
                  </div>
                </div>
              );
            })}
            {!isLoading && maids.length === 0 && <div className="col-span-full py-10 text-center text-muted-foreground">No maid records found.</div>}
          </div>
        )}

        <div className="flex justify-center gap-3 pt-4">
          <Button variant="destructive" size="sm" disabled={selected.size === 0} onClick={() => void handleDeleteSelected()}>
            <Trash2 className="mr-1 h-4 w-4" /> Delete Selected
          </Button>
          <Button variant="outline" size="sm" disabled={selected.size === 0} onClick={() => void handleToggleSelected()}>
            <EyeOff className="mr-1 h-4 w-4" /> {view === "public" ? "Hide Selected" : "Publish Selected"}
          </Button>
        </div>

        {maids.length > 0 && (
          <div className="flex flex-wrap items-center justify-center gap-2 pt-2 text-sm">
            <button
              className="h-7 rounded border px-2 text-xs disabled:cursor-not-allowed disabled:opacity-50"
              disabled={currentPage <= 1}
              onClick={() => setPage((prev) => Math.max(1, prev - 1))}
            >
              Prev
            </button>
            {Array.from({ length: totalPages }, (_, i) => (
              <button
                key={i}
                onClick={() => setPage(i + 1)}
                className={`h-7 w-7 rounded ${i + 1 === currentPage ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
              >
                {i + 1}
              </button>
            ))}
            <button
              className="h-7 rounded border px-2 text-xs disabled:cursor-not-allowed disabled:opacity-50"
              disabled={currentPage >= totalPages}
              onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default EditMaids;
