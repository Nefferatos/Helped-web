import { useCallback, useEffect, useState } from "react";
import { Download, FileText, LoaderCircle, RefreshCw, ShieldCheck, Upload } from "lucide-react";
import { toast } from "@/components/ui/sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getClientAuthHeaders } from "@/lib/clientAuth";

type PlacementDocument = {
  id: string;
  original_name: string;
  category: string;
  size_bytes: number;
  created_at: string;
};

type Placement = {
  id: string;
  maid_reference_code: string | null;
  status: string;
  created_at?: string;
  documents: PlacementDocument[];
};

const formatSize = (bytes: number) => bytes < 1024 * 1024 ? `${Math.max(1, Math.ceil(bytes / 1024))} KB` : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;

export default function ClientPlacementDocumentsPage() {
  const [placements, setPlacements] = useState<Placement[]>([]);
  const [accountLinked, setAccountLinked] = useState(true);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState<string | null>(null);
  const [opening, setOpening] = useState<string | null>(null);

  const loadPlacements = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/client/placements", { headers: getClientAuthHeaders(), cache: "no-store" });
      const payload = await response.json().catch(() => ({})) as { placements?: Placement[]; accountLinked?: boolean; error?: string };
      if (!response.ok) throw new Error(payload.error || "Could not load your placement documents");
      setPlacements(payload.placements ?? []);
      setAccountLinked(payload.accountLinked !== false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not load your placement documents");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void loadPlacements(); }, [loadPlacements]);

  const uploadFile = async (placementId: string, file?: File) => {
    if (!file) return;
    setUploading(placementId);
    try {
      const form = new FormData();
      form.set("file", file);
      const response = await fetch(`/api/client/placements/${encodeURIComponent(placementId)}/documents`, {
        method: "POST", headers: getClientAuthHeaders(), body: form,
      });
      const payload = await response.json().catch(() => ({})) as { error?: string };
      if (!response.ok) throw new Error(payload.error || "Document upload failed");
      toast.success("Document uploaded for agency review");
      await loadPlacements();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Document upload failed");
    } finally {
      setUploading(null);
    }
  };

  const openDocument = async (placementId: string, documentId: string) => {
    const key = `${placementId}:${documentId}`;
    const viewer = window.open("about:blank", "_blank");
    if (viewer) viewer.opener = null;
    setOpening(key);
    try {
      const response = await fetch(`/api/client/placements/${encodeURIComponent(placementId)}/documents/${encodeURIComponent(documentId)}/url`, {
        headers: getClientAuthHeaders(), cache: "no-store",
      });
      const payload = await response.json().catch(() => ({})) as { signedUrl?: string; error?: string };
      if (!response.ok || !payload.signedUrl) throw new Error(payload.error || "Could not open this document");
      if (viewer) viewer.location.href = payload.signedUrl;
      else window.location.assign(payload.signedUrl);
    } catch (error) {
      viewer?.close();
      toast.error(error instanceof Error ? error.message : "Could not open this document");
    } finally {
      setOpening(null);
    }
  };

  return (
    <main className="mx-auto min-h-[calc(100vh-5rem)] w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mb-2 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-emerald-800"><ShieldCheck className="h-4 w-4" /> Secure placement area</p>
          <h1 className="text-3xl font-bold tracking-tight text-slate-950">Placement documents</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">Upload documents for your placement. Files are stored privately and shared with authorized agency staff for review.</p>
        </div>
        <Button variant="outline" className="gap-2" onClick={() => void loadPlacements()} disabled={loading}>
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Refresh
        </Button>
      </div>

      {loading ? (
        <div className="flex min-h-48 items-center justify-center gap-3 text-slate-600"><LoaderCircle className="h-5 w-5 animate-spin" /> Loading your placements…</div>
      ) : !accountLinked ? (
        <Card className="rounded-2xl border-dashed"><CardContent className="p-8 text-center"><h2 className="font-semibold text-slate-900">This account is not linked to an employer record</h2><p className="mt-2 text-sm text-slate-600">Please contact the agency and ask them to link your portal email to your placement.</p></CardContent></Card>
      ) : placements.length === 0 ? (
        <Card className="rounded-2xl border-dashed"><CardContent className="flex flex-col items-center p-10 text-center"><FileText className="mb-3 h-8 w-8 text-slate-400" /><h2 className="font-semibold text-slate-900">No placements are linked to your account yet</h2><p className="mt-2 text-sm text-slate-600">When the agency links a placement to this email, its document area will appear here.</p></CardContent></Card>
      ) : (
        <div className="space-y-5">
          {placements.map((placement) => (
            <Card key={placement.id} className="overflow-hidden rounded-2xl border-slate-200 shadow-sm">
              <CardContent className="p-5 sm:p-6">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div><p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Placement</p><h2 className="mt-1 text-lg font-bold text-slate-950">{placement.maid_reference_code || "Placement in progress"}</h2><p className="mt-1 text-sm text-slate-600">Status: {placement.status.replace(/_/g, " ").toLowerCase()}</p></div>
                  <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-800">
                    {uploading === placement.id ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                    {uploading === placement.id ? "Uploading…" : "Upload document"}
                    <input type="file" className="sr-only" disabled={Boolean(uploading)} accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.txt,.jpg,.jpeg,.png" onChange={(event) => { void uploadFile(placement.id, event.currentTarget.files?.[0]); event.currentTarget.value = ""; }} />
                  </label>
                </div>
                <p className="mt-3 text-xs text-slate-500">PDF, Office, CSV, text, JPG, or PNG · maximum 25 MB per file.</p>
                <div className="mt-5 border-t border-slate-100 pt-4">
                  <h3 className="mb-3 text-sm font-semibold text-slate-900">Uploaded documents ({placement.documents.length})</h3>
                  {placement.documents.length === 0 ? <p className="rounded-xl bg-slate-50 px-4 py-5 text-sm text-slate-500">No documents uploaded for this placement.</p> : (
                    <ul className="divide-y divide-slate-100">
                      {placement.documents.map((document) => {
                        const key = `${placement.id}:${document.id}`;
                        return <li key={document.id} className="flex flex-wrap items-center justify-between gap-3 py-3"><div className="flex min-w-0 items-center gap-3"><FileText className="h-5 w-5 shrink-0 text-emerald-700" /><div className="min-w-0"><p className="truncate text-sm font-medium text-slate-900">{document.original_name}</p><p className="text-xs text-slate-500">{formatSize(document.size_bytes)} · {new Date(document.created_at).toLocaleDateString()}</p></div></div><Button variant="ghost" size="sm" className="gap-2" onClick={() => void openDocument(placement.id, document.id)} disabled={opening === key}>{opening === key ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />} Open</Button></li>;
                      })}
                    </ul>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </main>
  );
}
