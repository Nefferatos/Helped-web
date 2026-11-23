import { useCallback, useEffect, useState } from "react";
import { AlertCircle, Download, FileText, LoaderCircle, RefreshCw, ShieldCheck, Upload } from "lucide-react";
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
  documentReview?: { employerDocuments: string; signedContract: string; employerNote?: string; signedContractNote?: string };
};

const formatSize = (bytes: number) => bytes < 1024 * 1024 ? `${Math.max(1, Math.ceil(bytes / 1024))} KB` : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;

export default function ClientPlacementDocumentsPage() {
  const [placements, setPlacements] = useState<Placement[]>([]);
  const [accountLinked, setAccountLinked] = useState(true);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [uploading, setUploading] = useState<string | null>(null);
  const [opening, setOpening] = useState<string | null>(null);
  const [uploadCategory, setUploadCategory] = useState<Record<string, string>>({});

  const loadPlacements = useCallback(async () => {
    setLoading(true);
    setLoadError("");
    try {
      const response = await fetch("/api/client/placements", { headers: getClientAuthHeaders(), cache: "no-store" });
      const payload = await response.json().catch(() => ({})) as { placements?: Placement[]; accountLinked?: boolean; error?: string };
      if (!response.ok) throw new Error(payload.error || "Could not load your placement documents");
      setPlacements(payload.placements ?? []);
      setAccountLinked(payload.accountLinked !== false);
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "Could not load your placement documents");
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
      form.set("category", uploadCategory[placementId] || "employer");
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
    <main className="min-h-[calc(100vh-5rem)] bg-slate-50/70">
      <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <header className="mb-8 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-3xl">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.14em] text-emerald-900">
              <ShieldCheck className="h-4 w-4" /> Secure placement area
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">Placement documents</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-700">
              Upload documents for your placement and track agency review. Files are stored privately and available to authorized agency staff.
            </p>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              When the agency uploads a contract, open it, complete the required signatures, then upload the returned file as “Signed contract.”
            </p>
          </div>
          <Button variant="outline" className="h-10 shrink-0 gap-2 border-slate-300 bg-white text-slate-900 shadow-sm hover:bg-slate-50" onClick={() => void loadPlacements()} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Refresh
          </Button>
        </header>

        {loading ? (
          <div className="flex min-h-56 items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-white text-slate-700 shadow-sm"><LoaderCircle className="h-5 w-5 animate-spin text-emerald-700" /> Loading your placements…</div>
        ) : loadError ? (
          <Card role="alert" className="rounded-2xl border-rose-200 bg-rose-50/60"><CardContent className="flex flex-col items-start gap-3 p-6 sm:flex-row sm:items-center sm:justify-between"><div className="flex items-start gap-3"><AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-rose-700" /><div><h2 className="font-semibold text-rose-950">We couldn’t load your placement documents</h2><p className="mt-1 text-sm text-rose-900">{loadError === "Unauthorized" ? "Your portal session may have expired. Sign in again, then retry." : /something went wrong|internal server error/i.test(loadError) ? "The service could not retrieve your placements. Please retry in a moment." : loadError}</p><p className="mt-1 text-xs text-rose-800">Your documents have not been changed. Contact the agency if this continues.</p></div></div><Button variant="outline" className="shrink-0 gap-2 border-rose-300 bg-white" onClick={() => void loadPlacements()}><RefreshCw className="h-4 w-4" /> Try again</Button></CardContent></Card>
        ) : !accountLinked ? (
          <Card className="rounded-2xl border-dashed bg-white"><CardContent className="p-8 text-center"><h2 className="font-semibold text-slate-900">This account is not linked to an employer record</h2><p className="mt-2 text-sm text-slate-700">Ask the agency to link this portal using the same email address on your employer record.</p></CardContent></Card>
        ) : placements.length === 0 ? (
          <Card className="rounded-2xl border-dashed bg-white"><CardContent className="flex flex-col items-center p-10 text-center"><div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50"><FileText className="h-7 w-7 text-emerald-800" /></div><h2 className="font-semibold text-slate-900">No placements are linked to your account yet</h2><p className="mt-2 max-w-xl text-sm leading-6 text-slate-700">Your employer account is linked. Ask the agency to assign the placement to that employer record; its document area will appear here.</p></CardContent></Card>
        ) : (
          <div className="space-y-6">
            {placements.map((placement) => (
              <Card key={placement.id} className="overflow-hidden rounded-2xl border-slate-200 bg-white shadow-sm shadow-slate-200/70">
                <div className="border-b border-slate-200 bg-gradient-to-r from-emerald-50 via-white to-white px-5 py-5 sm:px-7">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-start gap-4">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-emerald-100 bg-white text-emerald-800 shadow-sm"><FileText className="h-6 w-6" /></div>
                      <div>
                        <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-600">Placement</p>
                        <h2 className="mt-1 text-xl font-bold tracking-tight text-slate-950">{placement.maid_reference_code || "Placement in progress"}</h2>
                        <p className="mt-1 text-sm capitalize text-slate-700">{placement.status.replace(/_/g, " ").toLowerCase()}</p>
                      </div>
                    </div>
                    <span className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-white px-3 py-1.5 text-xs font-semibold text-emerald-900">
                      <ShieldCheck className="h-4 w-4" /> Secure file exchange
                    </span>
                  </div>
                </div>

                <CardContent className="p-5 sm:p-7">
                  {placement.documentReview && (
                    <section aria-label="Document review status" className="mb-6 rounded-xl border border-slate-200 bg-slate-50 p-4">
                      <div className="mb-3 flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-emerald-800" /><h3 className="text-sm font-semibold text-slate-950">Review status</h3></div>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div className="rounded-lg border border-slate-200 bg-white p-3"><p className="text-xs font-semibold uppercase tracking-wide text-slate-600">Employer documents</p><p className="mt-1 text-sm font-semibold capitalize text-slate-900">{placement.documentReview.employerDocuments.replace(/_/g, " ").toLowerCase()}</p>{placement.documentReview.employerNote && <p className="mt-2 rounded-md bg-rose-50 p-2 text-sm font-medium text-rose-800">{placement.documentReview.employerNote}</p>}</div>
                        <div className="rounded-lg border border-slate-200 bg-white p-3"><p className="text-xs font-semibold uppercase tracking-wide text-slate-600">Signed contract</p><p className="mt-1 text-sm font-semibold capitalize text-slate-900">{placement.documentReview.signedContract.replace(/_/g, " ").toLowerCase()}</p>{placement.documentReview.signedContractNote && <p className="mt-2 rounded-md bg-rose-50 p-2 text-sm font-medium text-rose-800">{placement.documentReview.signedContractNote}</p>}</div>
                      </div>
                    </section>
                  )}

                  <section aria-label="Upload a document" className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-4 sm:p-5">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                        <label className="text-sm font-semibold text-slate-900">Document type
                          <select aria-label="Document type" value={uploadCategory[placement.id] || "employer"} onChange={(event) => setUploadCategory((current) => ({ ...current, [placement.id]: event.target.value }))} className="mt-1.5 block h-11 w-full min-w-56 rounded-lg border border-slate-300 bg-white px-3 text-sm font-normal text-slate-900 shadow-sm focus:border-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-700/20">
                            <option value="employer">Employer document</option><option value="signed_contract">Signed contract</option><option value="contract">Contract for review</option><option value="insurance">Insurance</option><option value="security_bond">Security bond</option><option value="other">Other</option>
                          </select>
                        </label>
                        <label className="inline-flex h-11 cursor-pointer items-center justify-center gap-2 rounded-lg bg-emerald-800 px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-900 focus-within:outline-none focus-within:ring-2 focus-within:ring-emerald-700 focus-within:ring-offset-2">
                          {uploading === placement.id ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                          {uploading === placement.id ? "Uploading…" : "Upload document"}
                          <input type="file" className="sr-only" disabled={Boolean(uploading)} accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.txt,.jpg,.jpeg,.png" onChange={(event) => { void uploadFile(placement.id, event.currentTarget.files?.[0]); event.currentTarget.value = ""; }} />
                        </label>
                      </div>
                      <p className="text-xs leading-5 text-slate-700">PDF, Office, CSV, text, JPG, or PNG<br />Maximum 25 MB per file</p>
                    </div>
                  </section>

                  <section aria-label="Uploaded documents" className="mt-7">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <div><h3 className="text-base font-bold text-slate-950">Uploaded documents</h3><p className="mt-1 text-sm text-slate-600">Files attached to this placement</p></div>
                      <span className="inline-flex min-w-8 items-center justify-center rounded-full bg-slate-100 px-2.5 py-1 text-sm font-semibold text-slate-800">{placement.documents.length}</span>
                    </div>
                    {placement.documents.length === 0 ? (
                      <div className="flex flex-col items-center rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center">
                        <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-white text-slate-600 shadow-sm"><FileText className="h-5 w-5" /></div>
                        <p className="text-sm font-semibold text-slate-900">No documents uploaded yet</p>
                        <p className="mt-1 text-sm text-slate-600">Choose a document type above to add a file for agency review.</p>
                      </div>
                    ) : (
                      <ul className="space-y-2">
                        {placement.documents.map((document) => {
                          const key = `${placement.id}:${document.id}`;
                          return (
                            <li key={document.id} className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-3 transition hover:border-emerald-300 hover:shadow-sm sm:flex-row sm:items-center sm:justify-between sm:p-4">
                              <div className="flex min-w-0 items-center gap-3">
                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-800"><FileText className="h-5 w-5" /></div>
                                <div className="min-w-0">
                                  <p className="truncate text-sm font-semibold text-slate-950">{document.original_name}</p>
                                  <p className="mt-1 text-xs text-slate-600">{formatSize(document.size_bytes)} · {new Date(document.created_at).toLocaleDateString()}</p>
                                </div>
                                <span className="hidden rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium capitalize text-slate-700 sm:inline-flex">{document.category.replace(/_/g, " ")}</span>
                              </div>
                              <div className="flex items-center justify-between gap-3 sm:justify-end">
                                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium capitalize text-slate-700 sm:hidden">{document.category.replace(/_/g, " ")}</span>
                                <Button variant="outline" size="sm" className="gap-2 border-slate-300 text-slate-900 hover:border-emerald-300 hover:bg-emerald-50" onClick={() => void openDocument(placement.id, document.id)} disabled={opening === key}>{opening === key ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />} Open file</Button>
                              </div>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </section>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}