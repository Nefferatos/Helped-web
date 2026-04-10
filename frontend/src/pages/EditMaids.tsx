import { useEffect, useMemo, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { calculateAge, formatDate, MaidProfile } from "@/lib/maids";
import { Search, Eye, EyeOff, Trash2, Download, Upload, ArrowLeft, AlertTriangle, CheckSquare, Square } from "lucide-react";
import { toast } from "@/components/ui/sonner";
import { adminPath } from "@/lib/routes";
import SendMaidToClientDialog from "@/components/SendMaidToClientDialog";
import { scanUploadedFile } from "@/lib/fileScan";
import JSZip from "jszip";
import * as XLSX from "xlsx";

type ViewMode = "menu" | "public" | "hidden";
type VisibilityTarget =
  | { maid: MaidProfile; makePublic: boolean }
  | { bulk: true; makePublic: boolean };

const PAGE_SIZE = 10;

const EditMaids = () => {
  const navigate = useNavigate();
  const location = useLocation();
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
  const [pendingImportFiles, setPendingImportFiles] = useState<File[]>([]);

  // Delete validation state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<"selected" | MaidProfile | null>(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");

  // Visibility confirmation state
  const [visibilityDialogOpen, setVisibilityDialogOpen] = useState(false);
  const [pendingVisibilityTarget, setPendingVisibilityTarget] = useState<VisibilityTarget | null>(null);

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
    if (page !== currentPage) setPage(currentPage);
  }, [currentPage, page]);

  const toggle = (ref: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(ref)) next.delete(ref);
      else next.add(ref);
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === paginatedMaids.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(paginatedMaids.map((m) => m.referenceCode)));
    }
  };

  const removeLocal = (referenceCode: string) => {
    setMaids((prev) => prev.filter((m) => m.referenceCode !== referenceCode));
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

  // ── Delete with validation ─────────────────────────────────────────────────
  const openDeleteDialog = (target: "selected" | MaidProfile) => {
    setDeleteTarget(target);
    setDeleteConfirmText("");
    setDeleteDialogOpen(true);
  };

  const getDeleteLabel = () => {
    if (!deleteTarget) return "";
    if (deleteTarget === "selected") return `${selected.size} maid${selected.size !== 1 ? "s" : ""}`;
    return (deleteTarget as MaidProfile).fullName;
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleteDialogOpen(false);
    try {
      if (deleteTarget === "selected") {
        for (const ref of selected) await deleteMaid(ref);
        toast.success(`${selected.size} maid${selected.size !== 1 ? "s" : ""} deleted`);
      } else {
        await deleteMaid((deleteTarget as MaidProfile).referenceCode);
        toast.success("Maid deleted");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete");
    }
  };

  // ── Visibility with confirmation ───────────────────────────────────────────
  const openVisibilityDialog = (target: VisibilityTarget) => {
    setPendingVisibilityTarget(target);
    setVisibilityDialogOpen(true);
  };

  const confirmVisibilityChange = async () => {
    if (!pendingVisibilityTarget) return;
    setVisibilityDialogOpen(false);
    try {
      if ("bulk" in pendingVisibilityTarget) {
        for (const maid of maids.filter((m) => selected.has(m.referenceCode))) {
          await toggleVisibility(maid, pendingVisibilityTarget.makePublic);
        }
        toast.success(
          pendingVisibilityTarget.makePublic ? "Selected maids made public" : "Selected maids hidden"
        );
      } else {
        await toggleVisibility(pendingVisibilityTarget.maid, pendingVisibilityTarget.makePublic);
        toast.success(pendingVisibilityTarget.makePublic ? "Maid published" : "Maid hidden");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update visibility");
    } finally {
      setPendingVisibilityTarget(null);
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
      if (!response.ok && response.status !== 207) throw new Error(data.error || "Failed to import CSV");
      const created = data.created ?? 0;
      const updated = data.updated ?? 0;
      const failed = data.failed ?? 0;
      toast.success(`Import done: ${created} created, ${updated} updated${failed ? `, ${failed} failed` : ""}`);
      if (failed && data.errors?.length) toast.error(data.errors.slice(0, 2).join(" | "));
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
        if (response.status === 404) { await handleExportCsv(); return; }
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
    if (!referenceCode) throw new Error("referenceCode is required in the imported file");
    try {
      setIsImporting(true);
      const probe = await fetch(`/api/maids/${encodeURIComponent(referenceCode)}`);
      const exists = probe.ok;
      const response = await fetch(
        exists ? `/api/maids/${encodeURIComponent(referenceCode)}` : "/api/maids",
        {
          method: exists ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );
      const data = (await response.json().catch(() => ({}))) as { error?: string; maid?: MaidProfile };
      if (!response.ok || !data.maid) throw new Error(data.error || "Failed to import maid profile");
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
    if (ext === "pdf") {
      const bytes = new Uint8Array(await file.arrayBuffer());
      const max = Math.min(bytes.length, 1024 * 1024);
      let printable = "";
      for (let i = 0; i < max && printable.length < 6000; i += 1) {
        const b = bytes[i];
        if (b === 0x0a || b === 0x0d || b === 0x09) printable += " ";
        else if (b >= 0x20 && b <= 0x7e) printable += String.fromCharCode(b);
        else printable += " ";
      }
      const text = printable.replace(/\s+/g, " ").trim();
      const refMatch = text.match(/\breference\s*code\b\s*[:-]?\s*([a-z0-9_-]{2,})/i);
      const nameMatch = text.match(/\bfull\s*name\b\s*[:-]?\s*([a-z][^:]{1,80}?)(?=\s{2,}|$)/i);
      if (!text || text.length < 40 || !refMatch?.[1] || !nameMatch?.[1]) {
        throw new Error("PDF does not contain importable data");
      }
      const escapeCsv = (value: string) => {
        const v = String(value ?? "");
        if (/[",\n\r]/.test(v)) return `"${v.replace(/"/g, '""')}"`;
        return v;
      };
      await importCsvText(`referenceCode,fullName\n${escapeCsv(refMatch[1])},${escapeCsv(nameMatch[1].trim())}`);
      return;
    }
    if (ext === "docx") {
      const zip = await JSZip.loadAsync(await file.arrayBuffer());
      const docXml = await zip.file("word/document.xml")?.async("text");
      if (!docXml) throw new Error("DOCX does not contain importable data");
      const xml = new DOMParser().parseFromString(docXml, "application/xml");
      const text = Array.from(xml.getElementsByTagName("w:t"))
        .map((n) => n.textContent ?? "")
        .join(" ")
        .replace(/\s+/g, " ")
        .trim();
      const refMatch = text.match(/\breference\s*code\b\s*[:-]?\s*([a-z0-9_-]{2,})/i);
      const nameMatch = text.match(/\bfull\s*name\b\s*[:-]?\s*([a-z][^:]{1,80}?)(?=\s{2,}|$)/i);
      if (!refMatch?.[1] || !nameMatch?.[1]) throw new Error("DOCX is missing required fields: referenceCode, fullName");
      const escapeCsv = (value: string) => {
        const v = String(value ?? "");
        if (/[",\n\r]/.test(v)) return `"${v.replace(/"/g, '""')}"`;
        return v;
      };
      await importCsvText(`referenceCode,fullName\n${escapeCsv(refMatch[1])},${escapeCsv(nameMatch[1].trim())}`);
      return;
    }
    if (ext === "xlsx") {
      const workbook = XLSX.read(await file.arrayBuffer(), { type: "array" });
      const sheetName = workbook.SheetNames[0];
      const sheet = sheetName ? workbook.Sheets[sheetName] : undefined;
      if (!sheet) throw new Error("XLSX does not contain importable data");
      const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, blankrows: false }) as unknown[][];
      const header = Array.isArray(rows[0]) ? rows[0] : [];
      const headerIndexes = new Map<string, number>();
      header.forEach((h, idx) => headerIndexes.set(String(h ?? "").trim().toLowerCase(), idx));
      if (!headerIndexes.has("referencecode") || !headerIndexes.has("fullname")) {
        throw new Error("XLSX is missing required columns: referenceCode, fullName");
      }
      const csvText = XLSX.utils.sheet_to_csv(sheet);
      await importCsvText(csvText);
      return;
    }
    if (ext === "csv") { await importCsvText(await file.text()); return; }
    if (ext === "xls" || ext === "doc") {
      const content = await file.text();
      const maidsCsvBase64 = extractBase64Marker(content, "MAIDS_CSV_BASE64");
      if (maidsCsvBase64) { await importCsvText(decodeBase64Utf8(maidsCsvBase64)); return; }
      const maidProfileBase64 = extractBase64Marker(content, "MAID_PROFILE_JSON_BASE64");
      if (maidProfileBase64) { await importSingleMaidProfile(JSON.parse(decodeBase64Utf8(maidProfileBase64)) as MaidProfile); return; }
      throw new Error('This file is missing import data. Please import files exported from "Export Maids" or from a maid bio-data export.');
    }
    throw new Error("Unsupported file type. Supported: .csv, .xls, .xlsx, .doc, .docx, .pdf");
  };

  const requestExport = () => { if (!isExporting) setConfirmExportOpen(true); };
  const confirmExportCsv = () => { setConfirmExportOpen(false); void handleExportCsv(); };
  const confirmExportXls = () => { setConfirmExportOpen(false); void handleExportXls(); };
  const requestImportFiles = async (files?: FileList | File[]) => {
    if (!files || isImporting) return;
    const all = Array.from(files);
    if (all.length > 10) toast.error("Max 10 files per upload");
    const list = all.slice(0, 10);
    if (list.length === 0) return;

    const approved: File[] = [];
    for (const file of list) {
      const scan = await scanUploadedFile(file);
      if (!scan.success) {
        toast.error(`${file.name}: ${scan.message}`);
        continue;
      }
      approved.push(file);
    }

    if (approved.length === 0) return;
    setPendingImportFiles(approved);
    setConfirmImportOpen(true);
  };
  const confirmImportFiles = async () => {
    const files = pendingImportFiles;
    setConfirmImportOpen(false);
    setPendingImportFiles([]);
    if (files.length === 0) return;

    for (const file of files) {
      try {
        await handleImportFile(file);
      } catch (error) {
        toast.error(error instanceof Error ? `${file.name}: ${error.message}` : `${file.name}: Failed to import`);
      }
    }
  };

  const SharedDialogs = () => (
    <>
      {/* Export */}
      <Dialog open={confirmExportOpen} onOpenChange={setConfirmExportOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Export maids file?</DialogTitle>
            <DialogDescription>
              Download as an easy-to-read Excel table (<strong>.xls</strong>) or as a raw CSV (<strong>.csv</strong>).
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmExportOpen(false)} disabled={isExporting}>Cancel</Button>
            <Button variant="outline" onClick={confirmExportCsv} disabled={isExporting}>{isExporting ? "Exporting..." : "Download CSV"}</Button>
            <Button onClick={confirmExportXls} disabled={isExporting}>{isExporting ? "Exporting..." : "Download Excel (.xls)"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Import */}
      <Dialog open={confirmImportOpen} onOpenChange={(open) => { setConfirmImportOpen(open); if (!open) setPendingImportFiles([]); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Import maids file?</DialogTitle>
            <DialogDescription>
              Supported: <strong>.csv</strong>, <strong>.xls</strong>, <strong>.xlsx</strong>, <strong>.doc</strong>, <strong>.docx</strong>, <strong>.pdf</strong> exported from this system.<br />
              Required columns: <strong>referenceCode</strong>, <strong>fullName</strong>. Existing maids are updated by referenceCode.
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-md border bg-muted/30 p-3 text-sm">
            <span className="font-semibold">Selected file{pendingImportFiles.length === 1 ? "" : "s"}:</span>{" "}
            {pendingImportFiles.length ? pendingImportFiles.map((f) => f.name).join(", ") : "None"}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmImportOpen(false)} disabled={isImporting}>Cancel</Button>
            <Button onClick={() => void confirmImportFiles()} disabled={isImporting || pendingImportFiles.length === 0}>{isImporting ? "Importing..." : "Import"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete validation dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={(open) => { setDeleteDialogOpen(open); if (!open) setDeleteConfirmText(""); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-destructive/10">
                <AlertTriangle className="h-5 w-5 text-destructive" />
              </div>
              <div>
                <DialogTitle className="text-destructive">Confirm Deletion</DialogTitle>
                <DialogDescription className="mt-0.5">
                  This action <strong>cannot be undone</strong>.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-4 py-1">
            <div className="rounded-lg border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">
              You are about to permanently delete <strong>{getDeleteLabel()}</strong>. All associated data will be removed.
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">
                Type <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs font-semibold">DELETE</span> to confirm
              </label>
              <Input
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                placeholder="Type DELETE here"
                className="font-mono"
                autoFocus
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
            <Button
              variant="destructive"
              disabled={deleteConfirmText !== "DELETE"}
              onClick={() => void confirmDelete()}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Yes, Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Visibility confirmation dialog */}
      <Dialog
        open={visibilityDialogOpen}
        onOpenChange={(open) => {
          setVisibilityDialogOpen(open);
          if (!open) setPendingVisibilityTarget(null);
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${pendingVisibilityTarget?.makePublic ? "bg-primary/10" : "bg-muted"}`}>
                {pendingVisibilityTarget?.makePublic
                  ? <Eye className="h-5 w-5 text-primary" />
                  : <EyeOff className="h-5 w-5 text-muted-foreground" />}
              </div>
              <div>
                <DialogTitle>
                  {pendingVisibilityTarget?.makePublic ? "Publish maid?" : "Hide maid?"}
                </DialogTitle>
                <DialogDescription className="mt-0.5">
                  This can be reversed at any time.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="rounded-lg border bg-muted/30 px-4 py-3 text-sm text-foreground">
            {pendingVisibilityTarget && "bulk" in pendingVisibilityTarget ? (
              <>
                <strong>{selected.size} maid{selected.size !== 1 ? "s" : ""}</strong> will be{" "}
                <strong>
                  {pendingVisibilityTarget.makePublic ? "made visible to the public" : "hidden from public view"}
                </strong>.
              </>
            ) : (
              <>
                <strong>{(pendingVisibilityTarget as { maid: MaidProfile } | null)?.maid?.fullName}</strong> will be{" "}
                <strong>
                  {pendingVisibilityTarget?.makePublic ? "visible to the public" : "hidden from public view"}
                </strong>.
              </>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setVisibilityDialogOpen(false);
                setPendingVisibilityTarget(null);
              }}
            >
              Cancel
            </Button>
            <Button
              variant={pendingVisibilityTarget?.makePublic ? "default" : "secondary"}
              onClick={() => void confirmVisibilityChange()}
            >
              {pendingVisibilityTarget?.makePublic
                ? <><Eye className="mr-2 h-4 w-4" /> Publish</>
                : <><EyeOff className="mr-2 h-4 w-4" /> Hide</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );

  if (view === "menu") {
    return (
      <div className="page-container">
        <div className="content-card animate-fade-in-up space-y-6">

          <div className="flex flex-wrap gap-2">
            <div className="flex flex-1 min-w-48 items-center gap-2 rounded-lg border bg-background px-3 shadow-sm">
              <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
              <Input
                placeholder="Search maid name or code…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="border-0 shadow-none focus-visible:ring-0 px-0"
              />
            </div>
            <Button variant="outline" onClick={requestExport} disabled={isExporting}>
              <Download className="mr-2 h-4 w-4" />
              {isExporting ? "Exporting…" : "Export"}
            </Button>
            <label className="inline-flex cursor-pointer">
              <input
                type="file"
                accept=".csv,.xls,.xlsx,.doc,.docx,.pdf,text/csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/pdf"
                className="hidden"
                disabled={isImporting}
                multiple
                onChange={(e) => { void requestImportFiles(e.target.files); e.currentTarget.value = ""; }}
              />
              <span className="inline-flex items-center gap-2 rounded-md border border-input bg-background px-3 py-2 text-sm font-semibold shadow-sm hover:bg-accent hover:text-accent-foreground transition-colors">
                <Upload className="h-4 w-4" />
                {isImporting ? "Importing…" : "Import"}
              </span>
            </label>
          </div>

          <p className="rounded-md bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
            Import supports <strong>.csv</strong> (recommended), or <strong>.xls</strong>/<strong>.xlsx</strong>/<strong>.doc</strong>/<strong>.docx</strong>/<strong>.pdf</strong> exported from this system.
            Required columns: <strong>referenceCode</strong>, <strong>fullName</strong>. Photos &amp; history are not imported.
          </p>

          <hr className="border-border" />

          {/* View selector cards */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <button
              onClick={() => setView("public")}
              className="group relative flex flex-col items-center gap-3 overflow-hidden rounded-xl border-2 border-primary/20 bg-primary/5 p-8 text-center transition-all hover:border-primary/50 hover:bg-primary/10 hover:shadow-md active:scale-[0.98]"
            >
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 ring-4 ring-primary/10 transition-all group-hover:ring-primary/20">
                <Eye className="h-7 w-7 text-primary" />
              </div>
              <div>
                <p className="text-base font-bold text-primary">Maids In Public</p>
                <p className="mt-1 text-xs text-muted-foreground">View, edit or delete publicly visible maids</p>
              </div>
            </button>

            <button
              onClick={() => setView("hidden")}
              className="group relative flex flex-col items-center gap-3 overflow-hidden rounded-xl border-2 border-border bg-muted/30 p-8 text-center transition-all hover:border-muted-foreground/30 hover:bg-muted/60 hover:shadow-md active:scale-[0.98]"
            >
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted ring-4 ring-muted transition-all group-hover:ring-muted-foreground/10">
                <EyeOff className="h-7 w-7 text-muted-foreground" />
              </div>
              <div>
                <p className="text-base font-bold text-foreground">Maids Hidden</p>
                <p className="mt-1 text-xs text-muted-foreground">View, edit or delete hidden/draft maids</p>
              </div>
            </button>
          </div>

          <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-center text-xs text-amber-700 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-400">
            Maids without photos will not be displayed publicly. Add photos first, then make them searchable.
          </p>
        </div>

        <SharedDialogs />
      </div>
    );
  }

  const allPageSelected = paginatedMaids.length > 0 && paginatedMaids.every((m) => selected.has(m.referenceCode));

  return (
    <div className="page-container">

      <div className="mb-4 flex items-center justify-between gap-4">
        <button
          onClick={handleBack}
          className="group inline-flex items-center gap-1.5 rounded-md px-1 py-1 text-sm font-medium text-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
        >
          <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
          <span className="relative">
            Back
            <span className="absolute left-0 -bottom-0.5 h-px w-0 bg-primary transition-all group-hover:w-full" />
          </span>
        </button>

        <div className="flex items-center gap-2">
          <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${view === "public" ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
            {view === "public" ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
            {view === "public" ? "Public Maids" : "Hidden Maids"}
          </span>
          {!isLoading && (
            <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
              {maids.length} total
            </span>
          )}
        </div>
      </div>

      <div className="content-card animate-fade-in-up space-y-4">

        <div className="flex flex-wrap gap-2">
          <div className="flex flex-1 min-w-48 items-center gap-2 rounded-lg border bg-background px-3 shadow-sm">
            <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
            <Input
              placeholder="Search maid name or code…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="border-0 shadow-none focus-visible:ring-0 px-0"
            />
          </div>
          <Button variant="outline" onClick={requestExport} disabled={isExporting}>
            <Download className="mr-2 h-4 w-4" />
            {isExporting ? "Exporting…" : "Export"}
          </Button>
          <label className="inline-flex cursor-pointer">
            <input
              type="file"
              accept=".csv,.xls,.xlsx,.doc,.docx,.pdf,text/csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/pdf"
              className="hidden"
              disabled={isImporting}
              multiple
              onChange={(e) => { void requestImportFiles(e.target.files); e.currentTarget.value = ""; }}
            />
            <span className="inline-flex items-center gap-2 rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm hover:bg-accent hover:text-accent-foreground transition-colors">
              <Upload className="h-4 w-4" />
              {isImporting ? "Importing…" : "Import"}
            </span>
          </label>
        </div>

        {maids.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-muted/30 px-4 py-2.5">
            <label className="flex cursor-pointer items-center gap-2 text-sm font-medium select-none">
              <button type="button" onClick={toggleAll} className="text-primary">
                {allPageSelected
                  ? <CheckSquare className="h-4 w-4" />
                  : <Square className="h-4 w-4 text-muted-foreground" />}
              </button>
              {selected.size > 0
                ? <span>{selected.size} selected</span>
                : <span className="text-muted-foreground">Select all on page</span>}
            </label>

            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={selected.size === 0}
                onClick={() =>
                  openVisibilityDialog({ bulk: true, makePublic: view !== "public" })
                }
                className="h-8 text-xs"
              >
                <EyeOff className="mr-1.5 h-3.5 w-3.5" />
                {view === "public" ? "Hide Selected" : "Publish Selected"}
              </Button>
              <Button
                variant="destructive"
                size="sm"
                disabled={selected.size === 0}
                onClick={() => openDeleteDialog("selected")}
                className="h-8 text-xs"
              >
                <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                Delete Selected ({selected.size})
              </Button>
            </div>
          </div>
        )}

        {isLoading ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {Array.from({ length: PAGE_SIZE }).map((_, i) => (
              <div key={i} className="animate-pulse rounded-xl border bg-muted/40">
                <div className="aspect-[3/4] rounded-t-xl bg-muted" />
                <div className="space-y-2 p-2">
                  <div className="h-3 w-3/4 rounded bg-muted" />
                  <div className="h-2.5 w-1/2 rounded bg-muted" />
                  <div className="h-2.5 w-2/3 rounded bg-muted" />
                </div>
              </div>
            ))}
          </div>
        ) : maids.length === 0 ? (
          <div className="rounded-xl border border-dashed py-16 text-center">
            <EyeOff className="mx-auto mb-3 h-8 w-8 text-muted-foreground/40" />
            <p className="text-sm font-medium text-muted-foreground">No maid records found.</p>
            <p className="mt-1 text-xs text-muted-foreground/60">Try a different search or adjust filters.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {paginatedMaids.map((maid, i) => {
              const age = calculateAge(maid.dateOfBirth);
              const photoPreview =
                Array.isArray(maid.photoDataUrls) && maid.photoDataUrls.length > 0
                  ? maid.photoDataUrls[0]
                  : maid.photoDataUrl;
              const isSelected = selected.has(maid.referenceCode);

              return (
                <div
                  key={maid.referenceCode}
                  className={`group relative flex flex-col overflow-hidden rounded-xl border text-[11px] leading-tight transition-all hover:shadow-md ${isSelected ? "border-primary ring-2 ring-primary/20" : "hover:border-primary/30"}`}
                  style={{
                    animation: "fade-in-up 0.4s cubic-bezier(0.16,1,0.3,1) forwards",
                    animationDelay: `${i * 0.04}s`,
                    opacity: 0,
                  }}
                >
                  {/* ── Photo area ── */}
                  <div
                    className="relative w-full cursor-pointer overflow-hidden bg-muted"
                    style={{ aspectRatio: "3/4" }}
                    onClick={() =>
                      navigate(adminPath(`/maid/${encodeURIComponent(maid.referenceCode)}`), {
                        state: { fromView: view },
                      })
                    }
                  >
                    {photoPreview ? (
                      <img
                        src={photoPreview}
                        alt={maid.fullName}
                        className="absolute inset-0 h-full w-full object-contain transition duration-300 group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-[10px] text-muted-foreground">No Photo</div>
                    )}

                    {/* Checkbox */}
                    <div
                      className="absolute left-2 top-2"
                      onClick={(e) => { e.stopPropagation(); toggle(maid.referenceCode); }}
                    >
                      <div className={`flex h-5 w-5 items-center justify-center rounded border-2 transition-colors ${isSelected ? "border-primary bg-primary text-primary-foreground" : "border-white/70 bg-black/20 backdrop-blur-sm"}`}>
                        {isSelected && <svg className="h-3 w-3" viewBox="0 0 12 12" fill="none"><path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>}
                      </div>
                    </div>

                    {/* Delete button */}
                    <button
                      onClick={(e) => { e.stopPropagation(); openDeleteDialog(maid); }}
                      className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded border border-white/20 bg-black/40 text-white opacity-0 backdrop-blur-sm transition-opacity group-hover:opacity-100 hover:bg-destructive"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>

                  <div className="flex flex-1 flex-col gap-1 p-2">
                    <p
                      className="cursor-pointer truncate font-semibold text-foreground hover:text-primary"
                      onClick={() =>
                        navigate(adminPath(`/maid/${encodeURIComponent(maid.referenceCode)}`), {
                          state: { fromView: view },
                        })
                      }
                    >
                      {maid.fullName}
                    </p>

                    <div className="space-y-0.5 text-[10px] text-muted-foreground">
                      <p>{maid.maritalStatus}{age !== null ? ` · ${age} yrs` : ""}</p>
                      <p>{maid.nationality} · {maid.type}</p>
                      <p className="font-semibold text-foreground">Ref: {maid.referenceCode}</p>
                      <p>Upd: {formatDate(maid.updatedAt)}</p>
                    </div>

                    <div className="mt-auto pt-1">
                      <button
                        onClick={() =>
                          openVisibilityDialog({ maid, makePublic: view !== "public" })
                        }
                        className={`inline-flex w-full items-center justify-center gap-1 rounded-md px-2 py-1 text-[10px] font-medium transition-colors ${view === "public" ? "bg-primary/10 text-primary hover:bg-primary/20" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}
                      >
                        {view === "public"
                          ? <><Eye className="h-3 w-3" /> Public — Hide</>
                          : <><EyeOff className="h-3 w-3" /> Hidden — Publish</>}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {maids.length > PAGE_SIZE && (
          <div className="flex flex-wrap items-center justify-center gap-1.5 pt-2">
            <button
              className="h-8 rounded-lg border px-3 text-xs disabled:cursor-not-allowed disabled:opacity-50 hover:bg-muted transition-colors"
              disabled={currentPage <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Previous
            </button>
            {Array.from({ length: totalPages }, (_, i) => (
              <button
                key={i}
                onClick={() => setPage(i + 1)}
                className={`h-8 min-w-[2rem] rounded-lg border px-2.5 text-xs transition-colors ${i + 1 === currentPage ? "bg-primary text-primary-foreground border-primary font-semibold" : "hover:bg-muted"}`}
              >
                {i + 1}
              </button>
            ))}
            <button
              className="h-8 rounded-lg border px-3 text-xs disabled:cursor-not-allowed disabled:opacity-50 hover:bg-muted transition-colors"
              disabled={currentPage >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              Next
            </button>
          </div>
        )}
      </div>

      <SharedDialogs />

      <SendMaidToClientDialog
        maid={maidToSendThroughAgency}
        open={Boolean(maidToSendThroughAgency)}
        onOpenChange={(open) => { if (!open) setMaidToSendThroughAgency(null); }}
        actionType="interested"
        onSuccess={(updatedMaid) => {
          setMaids((prev) => prev.map((m) => m.referenceCode === updatedMaid.referenceCode ? updatedMaid : m));
          setMaidToSendThroughAgency(null);
        }}
      />
      <SendMaidToClientDialog
        maid={maidToDirectHire}
        open={Boolean(maidToDirectHire)}
        onOpenChange={(open) => { if (!open) setMaidToDirectHire(null); }}
        actionType="direct_hire"
        onSuccess={(updatedMaid) => {
          setMaids((prev) => prev.map((m) => m.referenceCode === updatedMaid.referenceCode ? updatedMaid : m));
          setMaidToDirectHire(null);
        }}
      />
      <SendMaidToClientDialog
        maid={maidToReject}
        open={Boolean(maidToReject)}
        onOpenChange={(open) => { if (!open) setMaidToReject(null); }}
        actionType="rejected"
        onSuccess={(updatedMaid) => {
          setMaids((prev) => prev.map((m) => m.referenceCode === updatedMaid.referenceCode ? updatedMaid : m));
          setMaidToReject(null);
        }}
      />
    </div>
  );
};

export default EditMaids;