import { useEffect, useMemo, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { calculateAge, formatDate, MaidProfile } from "@/lib/maids";
import { Search, Eye, EyeOff, Trash2, Download, Upload } from "lucide-react";
import { toast } from "@/components/ui/sonner";
import { adminPath } from "@/lib/routes";
import SendMaidToClientDialog from "@/components/SendMaidToClientDialog";
import { ArrowLeft } from "lucide-react";

type ViewMode = "menu" | "public" | "hidden";
const PAGE_SIZE = 15;

const EditMaids = () => {
  const navigate = useNavigate();
  const location = useLocation(); // <-- Added for back navigation
  const [view, setView] = useState<ViewMode>("menu");
  const [search, setSearch] = useState("");
  const [maids, setMaids] = useState<MaidProfile[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [page, setPage] = useState(1);
  const [maidToSendThroughAgency, setMaidToSendThroughAgency] = useState<MaidProfile | null>(null);
  const [maidToDirectHire, setMaidToDirectHire] = useState<MaidProfile | null>(null);
  const [maidToReject, setMaidToReject] = useState<MaidProfile | null>(null);
  const [confirmExportOpen, setConfirmExportOpen] = useState(false);
  const [confirmImportOpen, setConfirmImportOpen] = useState(false);
  const [pendingImportFile, setPendingImportFile] = useState<File | null>(null);


  useEffect(() => {
    if (location.state?.fromView) {
      setView(location.state.fromView);
    }
  }, [location.state]);

  const handleBack = () => {
  if (view !== "menu") {
    setView("menu");
    return;
  }

  navigate(adminPath("/")); 
};

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
      if (next.has(ref)) {
        next.delete(ref);
      } else {
        next.add(ref);
      }
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

  const decodeBase64Utf8 = (value: string) => {
    const binary = atob(value);
    const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
    return new TextDecoder().decode(bytes);
  };

  const extractBase64Marker = (content: string, marker: string) => {
    const match = content.match(new RegExp(`<!--${marker}:([A-Za-z0-9+/=]+)-->`));
    return match?.[1] ?? null;
  };

  const importCsvText = async (csvText: string) => {
    try {
      setIsImporting(true);
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

  const handleExportXls = async () => {
    try {
      setIsExporting(true);
      const response = await fetch("/api/maids/export.xls");
      if (!response.ok) {
        if (response.status === 404) {
          await handleExportCsv();
          return;
        }
        const data = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error || "Failed to export Excel");
      }
      const html = await response.text();
      const blob = new Blob([html], { type: "application/vnd.ms-excel;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `maids-${new Date().toISOString().slice(0, 10)}.xls`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      toast.success("Excel exported");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to export Excel");
    } finally {
      setIsExporting(false);
    }
  };

  const importSingleMaidProfile = async (payload: MaidProfile) => {
    const referenceCode = String(payload.referenceCode || "").trim();
    if (!referenceCode) {
      throw new Error("referenceCode is required in the imported file");
    }

    try {
      setIsImporting(true);
      const probe = await fetch(`/api/maids/${encodeURIComponent(referenceCode)}`);
      const exists = probe.ok;

      const response = await fetch(exists ? `/api/maids/${encodeURIComponent(referenceCode)}` : "/api/maids", {
        method: exists ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await response.json().catch(() => ({}))) as { error?: string; maid?: MaidProfile };
      if (!response.ok || !data.maid) {
        throw new Error(data.error || "Failed to import maid profile");
      }

      toast.success(exists ? "Maid profile updated" : "Maid profile created");

      if (visibility) {
        const params = new URLSearchParams({ visibility });
        if (search.trim()) params.set("search", search.trim());
        const reload = await fetch(`/api/maids?${params.toString()}`);
        const reloadData = (await reload.json().catch(() => ({}))) as { maids?: MaidProfile[] };
        if (reload.ok && reloadData.maids) setMaids(reloadData.maids);
      }
    } finally {
      setIsImporting(false);
    }
  };

  const handleImportFile = async (file: File) => {
    const name = file.name.toLowerCase();
    const ext = name.includes(".") ? name.split(".").pop() ?? "" : "";

    if (ext === "csv") {
      await importCsvText(await file.text());
      return;
    }

    if (ext === "xls" || ext === "doc") {
      const content = await file.text();
      const maidsCsvBase64 = extractBase64Marker(content, "MAIDS_CSV_BASE64");
      if (maidsCsvBase64) {
        await importCsvText(decodeBase64Utf8(maidsCsvBase64));
        return;
      }

      const maidProfileBase64 = extractBase64Marker(content, "MAID_PROFILE_JSON_BASE64");
      if (maidProfileBase64) {
        await importSingleMaidProfile(JSON.parse(decodeBase64Utf8(maidProfileBase64)) as MaidProfile);
        return;
      }

      throw new Error('This file is missing import data. Please import files exported from "Export Maids" or from a maid bio-data export.');
    }

    throw new Error("Unsupported file type. Supported: .csv, .xls, .doc");
  };

  const requestExport = () => {
    if (isExporting) return;
    setConfirmExportOpen(true);
  };

  const confirmExportCsv = () => {
    setConfirmExportOpen(false);
    void handleExportCsv();
  };

  const confirmExportXls = () => {
    setConfirmExportOpen(false);
    void handleExportXls();
  };

  const requestImportFile = (file?: File) => {
    if (!file || isImporting) return;
    setPendingImportFile(file);
    setConfirmImportOpen(true);
  };

  const confirmImportFile = () => {
    const file = pendingImportFile;
    setConfirmImportOpen(false);
    setPendingImportFile(null);
    if (file) {
      void handleImportFile(file);
    }
  };

  if (view === "menu") {
    return (
      <div className="page-container">
        <div className="content-card animate-fade-in-up space-y-6">
          <div className="flex gap-2">
            <Input placeholder="Maid name or Code" value={search} onChange={(e) => setSearch(e.target.value)} />
            <Button variant="outline"><Search className="mr-2 h-4 w-4" /> Search</Button>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={requestExport} disabled={isExporting}>
              <Download className="mr-2 h-4 w-4" />
              {isExporting ? "Exporting..." : "Export Maids"}
            </Button>
            <label className="inline-flex cursor-pointer">
              <input
                type="file"
                accept=".csv,.xls,.doc,text/csv,application/vnd.ms-excel,application/msword"
                className="hidden"
                disabled={isImporting}
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  requestImportFile(file);
                  event.currentTarget.value = "";
                }}
              />
              <span className="inline-flex items-center rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm hover:bg-accent hover:text-accent-foreground font-semibold">
                <Upload className="mr-2 h-4 w-4" />
                {isImporting ? "Importing..." : "Import File (Maids)"}
              </span>
            </label>
          </div>
          <p className="text-xs text-muted-foreground">
            Import supports <span className="font-semibold">.csv</span> (recommended), or <span className="font-semibold">.xls</span>/<span className="font-semibold">.doc</span> exported from this system. Required columns (CSV): <span className="font-semibold">referenceCode</span>, <span className="font-semibold">fullName</span>. Photos &amp; history are not imported.
          </p>

          <Dialog open={confirmExportOpen} onOpenChange={setConfirmExportOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Export maids file?</DialogTitle>
                <DialogDescription>
                  Download as an easy-to-read Excel table (<span className="font-semibold">.xls</span>) or as a raw CSV (<span className="font-semibold">.csv</span>).
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button variant="outline" onClick={() => setConfirmExportOpen(false)} disabled={isExporting}>
                  Cancel
                </Button>
                <Button variant="outline" onClick={confirmExportCsv} disabled={isExporting}>
                  {isExporting ? "Exporting..." : "Download CSV"}
                </Button>
                <Button onClick={confirmExportXls} disabled={isExporting}>
                  {isExporting ? "Exporting..." : "Download Excel (.xls)"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={confirmImportOpen} onOpenChange={(open) => {
            setConfirmImportOpen(open);
            if (!open) setPendingImportFile(null);
          }}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Import maids file?</DialogTitle>
                <DialogDescription>
                  Supported: <span className="font-semibold">.csv</span>, <span className="font-semibold">.xls</span>, <span className="font-semibold">.doc</span> exported from this system.
                  <br />
                  For CSV: required columns <span className="font-semibold">referenceCode</span>, <span className="font-semibold">fullName</span>. Existing maids are updated by <span className="font-semibold">referenceCode</span>.
                </DialogDescription>
              </DialogHeader>
              <div className="rounded-md border bg-muted/30 p-3 text-sm">
                <span className="font-semibold">Selected file:</span> {pendingImportFile?.name ?? "None"}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setConfirmImportOpen(false)} disabled={isImporting}>
                  Cancel
                </Button>
                <Button onClick={confirmImportFile} disabled={isImporting || !pendingImportFile}>
                  {isImporting ? "Importing..." : "Import"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
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
      <button
        onClick={handleBack}
        className="group inline-flex items-center gap-1 text-sm font-medium text-primary
                  focus:outline-none focus:ring-2 focus:ring-primary/30 rounded-md">
        <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
        <span className="relative">
          Back
          <span className="absolute left-0 -bottom-0.5 h-px w-0 bg-primary transition-all group-hover:w-full" />
        </span>
      </button>
   

      <div className="content-card animate-fade-in-up space-y-4">
        <div className="flex gap-2">
          <Input placeholder="Maid name or Code" value={search} onChange={(e) => setSearch(e.target.value)} />
          <Button variant="outline"><Search className="mr-2 h-4 w-4" /> Search</Button>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={requestExport} disabled={isExporting}>
            <Download className="mr-2 h-4 w-4" />
            {isExporting ? "Exporting..." : "Export Maids"}
          </Button>
          <label className="inline-flex cursor-pointer">
            <input
              type="file"
              accept=".csv,.xls,.doc,text/csv,application/vnd.ms-excel,application/msword"
              className="hidden"
              disabled={isImporting}
              onChange={(event) => {
                const file = event.target.files?.[0];
                requestImportFile(file);
                event.currentTarget.value = "";
              }}
            />
            <span className="inline-flex items-center rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm hover:bg-accent hover:text-accent-foreground">
              <Upload className="mr-2 h-4 w-4" />
              {isImporting ? "Importing..." : "Import File (Maids)"}
            </span>
          </label>
        </div>
        <p className="text-xs text-muted-foreground">
          Import supports <span className="font-semibold">.csv</span> (recommended), or <span className="font-semibold">.xls</span>/<span className="font-semibold">.doc</span> exported from this system. Required columns (CSV): <span className="font-semibold">referenceCode</span>, <span className="font-semibold">fullName</span>. Photos &amp; history are not imported.
        </p>

        <Dialog open={confirmExportOpen} onOpenChange={setConfirmExportOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Export maids file?</DialogTitle>
              <DialogDescription>
                Download as an easy-to-read Excel table (<span className="font-semibold">.xls</span>) or as a raw CSV (<span className="font-semibold">.csv</span>).
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setConfirmExportOpen(false)} disabled={isExporting}>
                Cancel
              </Button>
              <Button variant="outline" onClick={confirmExportCsv} disabled={isExporting}>
                {isExporting ? "Exporting..." : "Download CSV"}
              </Button>
              <Button onClick={confirmExportXls} disabled={isExporting}>
                {isExporting ? "Exporting..." : "Download Excel (.xls)"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={confirmImportOpen} onOpenChange={(open) => {
          setConfirmImportOpen(open);
          if (!open) setPendingImportFile(null);
        }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Import maids file?</DialogTitle>
              <DialogDescription>
                Supported: <span className="font-semibold">.csv</span>, <span className="font-semibold">.xls</span>, <span className="font-semibold">.doc</span> exported from this system.
                <br />
                For CSV: required columns <span className="font-semibold">referenceCode</span>, <span className="font-semibold">fullName</span>. Existing maids are updated by <span className="font-semibold">referenceCode</span>.
              </DialogDescription>
            </DialogHeader>
            <div className="rounded-md border bg-muted/30 p-3 text-sm">
              <span className="font-semibold">Selected file:</span> {pendingImportFile?.name ?? "None"}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setConfirmImportOpen(false)} disabled={isImporting}>
                Cancel
              </Button>
              <Button onClick={confirmImportFile} disabled={isImporting || !pendingImportFile}>
                {isImporting ? "Importing..." : "Import"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

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
                  className="flex flex-col items-center gap-2 rounded-lg border p-2 text-center text-[11px] leading-tight transition-all hover:border-primary/30 hover:shadow-md"
                  style={{
                    animation: "fade-in-up 0.4s cubic-bezier(0.16,1,0.3,1) forwards",
                    animationDelay: `${i * 0.04}s`,
                    opacity: 0,
                  }}
                >
                  <div
                    className="flex h-36 w-full cursor-pointer items-center justify-center overflow-hidden rounded-md border bg-muted text-xs"
                    onClick={() =>
                      navigate(adminPath(`/maid/${encodeURIComponent(maid.referenceCode)}`), {
                        state: { fromView: view } // <-- pass current view for back button
                      })
                    }
                  >
                    {photoPreview ? (
                      <img
                        src={photoPreview}
                        alt={maid.fullName}
                        className="h-full w-full object-cover"
                      />
                    ) : maid.hasPhoto ? (
                      "Photo"
                    ) : (
                      "No Photo"
                    )}
                  </div>

                  <p
                    className="cursor-pointer font-semibold hover:text-primary"
                    onClick={() =>
                      navigate(adminPath(`/maid/${encodeURIComponent(maid.referenceCode)}`), {
                        state: { fromView: view } // <-- pass current view for back button
                      })
                    }
                  >
                    {maid.fullName}
                  </p>

                  <div className="font-medium space-y-[2px]">
                    <p>
                      {maid.maritalStatus}
                      {age !== null ? `(${age})` : ""}
                    </p>

                    <p>
                      {maid.nationality} {maid.type}
                    </p>

                    <p className="font-bold">Rinzin Maids</p>

                    <p className="font-semibold">
                      Ref: {maid.referenceCode}
                    </p>

                    <p className="text-gray-500">
                      Upd on {formatDate(maid.updatedAt)}
                    </p>
                  </div>

                  <div className="mt-1 w-full border-t pt-1">
                    <label className="flex items-center justify-center gap-1 text-[10px]">
                      <input
                        type="checkbox"
                        checked={selected.has(maid.referenceCode)}
                        onChange={() => toggle(maid.referenceCode)}
                        className="accent-primary" />
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

      <SendMaidToClientDialog
        maid={maidToSendThroughAgency}
        open={Boolean(maidToSendThroughAgency)}
        onOpenChange={(open) => {
          if (!open) setMaidToSendThroughAgency(null);
        }}
        actionType="interested"
        onSuccess={(updatedMaid) => {
          setMaids((prev) =>
            prev.map((item) =>
              item.referenceCode === updatedMaid.referenceCode ? updatedMaid : item
            )
          );
          setMaidToSendThroughAgency(null);
        }}
      />
      <SendMaidToClientDialog
        maid={maidToDirectHire}
        open={Boolean(maidToDirectHire)}
        onOpenChange={(open) => {
          if (!open) setMaidToDirectHire(null);
        }}
        actionType="direct_hire"
        onSuccess={(updatedMaid) => {
          setMaids((prev) =>
            prev.map((item) =>
              item.referenceCode === updatedMaid.referenceCode ? updatedMaid : item
            )
          );
          setMaidToDirectHire(null);
        }}
      />
      <SendMaidToClientDialog
        maid={maidToReject}
        open={Boolean(maidToReject)}
        onOpenChange={(open) => {
          if (!open) setMaidToReject(null);
        }}
        actionType="rejected"
        onSuccess={(updatedMaid) => {
          setMaids((prev) =>
            prev.map((item) =>
              item.referenceCode === updatedMaid.referenceCode ? updatedMaid : item
            )
          );
          setMaidToReject(null);
        }}
      />
    </div>
  );
};

export default EditMaids;
