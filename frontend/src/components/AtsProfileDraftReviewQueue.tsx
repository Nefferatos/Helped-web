import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertCircle, Check, FileUser, LoaderCircle, RefreshCw, X } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getAgencyAdminAuthHeaders } from "@/lib/agencyAdminAuth";

type Draft = {
  applicationId: string;
  applicationCode: string;
  applicantName: string;
  nationality: string;
  updatedAt: string;
  draftStatus: "pending_staff_review" | "approved";
  publishedReferenceCode: string;
  draft: {
    display_name?: string | null;
    summary?: string | null;
    skills?: string[];
    languages?: string[];
    experience_summary?: string | null;
    availability?: string | null;
  };
};

const request = async <T,>(url: string, init?: RequestInit): Promise<T> => {
  const response = await fetch(url, { ...init, headers: { ...getAgencyAdminAuthHeaders(), ...(init?.headers ?? {}) } });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error || `Request failed (HTTP ${response.status})`);
  return body as T;
};

export default function AtsProfileDraftReviewQueue() {
  const queryClient = useQueryClient();
  const [rejectionNotes, setRejectionNotes] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const [approvedApplicationId, setApprovedApplicationId] = useState("");
  const [publishedReferenceCode, setPublishedReferenceCode] = useState("");
  const [publishReferences, setPublishReferences] = useState<Record<string, string>>({});
  const draftsQuery = useQuery({
    queryKey: ["ats-profile-drafts"],
    queryFn: () => request<{ drafts: Draft[] }>("/api/ats/profile-drafts"),
  });
  const reviewMutation = useMutation({
    mutationFn: ({ applicationId, decision }: { applicationId: string; decision: "approve" | "reject" }) => request(
      `/api/ats/profile-drafts/${encodeURIComponent(applicationId)}/review`,
      { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ decision, note: rejectionNotes[applicationId] ?? "" }) },
    ),
    onSuccess: (_result, variables) => {
      setError("");
      setApprovedApplicationId(variables.decision === "approve" ? variables.applicationId : "");
      void queryClient.invalidateQueries({ queryKey: ["ats-profile-drafts"] });
    },
    onError: (mutationError) => setError(mutationError instanceof Error ? mutationError.message : "Could not save the review"),
  });
  const publishMutation = useMutation({
    mutationFn: ({ applicationId, referenceCode }: { applicationId: string; referenceCode: string }) => request<{ referenceCode: string }>(
      `/api/ats/profile-drafts/${encodeURIComponent(applicationId)}/publish`,
      { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ referenceCode }) },
    ),
    onSuccess: (result) => {
      setError("");
      setPublishedReferenceCode(result.referenceCode ?? "");
      void queryClient.invalidateQueries({ queryKey: ["ats-profile-drafts"] });
    },
    onError: (mutationError) => setError(mutationError instanceof Error ? mutationError.message : "Could not publish the profile"),
  });

  return <Card className="overflow-hidden border-slate-200 bg-white">
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-5">
      <div className="flex items-center gap-3"><div className="rounded-xl bg-violet-100 p-2.5 text-violet-800"><FileUser className="h-5 w-5" /></div><div><h2 className="text-lg font-bold text-slate-950">Applicant profile drafts</h2><p className="text-sm text-slate-600">Review drafts created from applicant-confirmed details and separate publication permission.</p></div></div>
      <Button variant="outline" size="sm" onClick={() => void draftsQuery.refetch()} disabled={draftsQuery.isFetching}><RefreshCw className={`mr-2 h-4 w-4 ${draftsQuery.isFetching ? "animate-spin" : ""}`} />Refresh</Button>
    </div>
    {error && <p role="alert" className="m-4 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-900">{error}</p>}
    {publishedReferenceCode && <p role="status" className="mx-4 mt-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm font-semibold text-emerald-950">Public profile {publishedReferenceCode} is live.</p>}
    {approvedApplicationId && <div role="status" className="mx-4 mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-950"><p>Draft approved. Open the public-profile setup to review the draft text and finish the profile manually.</p><Link to={`/agencyadmin/add-maid?source=ats&applicationId=${encodeURIComponent(approvedApplicationId)}`} className="font-bold underline">Open public-profile setup</Link></div>}
    {draftsQuery.isLoading ? <p className="p-5 text-sm text-slate-600">Loading drafts…</p> : draftsQuery.isError ? <div className="flex items-center gap-2 p-5 text-sm text-rose-800"><AlertCircle className="h-4 w-4" />{draftsQuery.error instanceof Error ? draftsQuery.error.message : "Draft queue unavailable"}</div> : null}
    {draftsQuery.data?.drafts.length === 0 && <p className="p-5 text-sm text-slate-600">No applicant drafts are waiting for review.</p>}
    <div className="divide-y divide-slate-100">{draftsQuery.data?.drafts.map((item) => <article key={item.applicationId} className="p-5">
      <div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="font-bold text-slate-950">{item.draft.display_name || item.applicantName}</h3><p className="text-sm text-slate-600">{item.applicationCode} · {item.nationality || "Nationality not recorded"}</p></div><Link to={`/agencyadmin/recruitment/applicant/${encodeURIComponent(item.applicationId)}`} className="text-sm font-semibold text-emerald-800 underline">Open ATS application</Link></div>
      <div className="mt-4 grid gap-3 rounded-xl bg-slate-50 p-4 md:grid-cols-2"><div><p className="text-xs font-bold uppercase tracking-wide text-slate-500">Profile summary</p><p className="mt-1 text-sm leading-6 text-slate-800">{item.draft.summary || item.draft.experience_summary || "No summary supplied"}</p></div><div className="space-y-2 text-sm text-slate-800"><p><strong>Skills:</strong> {item.draft.skills?.join(", ") || "—"}</p><p><strong>Languages:</strong> {item.draft.languages?.join(", ") || "—"}</p><p><strong>Availability:</strong> {item.draft.availability || "—"}</p></div></div>
      <p className="mt-3 text-xs text-slate-500">Draft last updated {new Date(item.updatedAt).toLocaleString()} · {item.draftStatus === "approved" ? "Approved by staff; complete the profile setup before publishing." : "Awaiting staff review."}</p>
      {item.draftStatus === "approved" ? <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4"><div className="flex flex-wrap items-center justify-between gap-3"><p className="text-sm font-semibold text-emerald-950">Ready for controlled publication</p><Link to={`/agencyadmin/add-maid?source=ats&applicationId=${encodeURIComponent(item.applicationId)}`} className="font-bold text-emerald-900 underline">Open public-profile setup</Link></div><p className="mt-1 text-xs text-emerald-900">Finish the profile and its Public Introduction first. Publishing verifies the applicant and enables public visibility.</p><div className="mt-3 flex flex-wrap gap-2"><input aria-label={`Public profile reference code for ${item.applicantName}`} value={publishReferences[item.applicationId] ?? item.publishedReferenceCode} onChange={(event) => setPublishReferences((current) => ({ ...current, [item.applicationId]: event.target.value }))} placeholder="Public profile reference code" className="h-10 min-w-64 flex-1 rounded-lg border border-emerald-300 bg-white px-3 text-sm text-black" /><Button onClick={() => publishMutation.mutate({ applicationId: item.applicationId, referenceCode: (publishReferences[item.applicationId] ?? item.publishedReferenceCode).trim() })} disabled={publishMutation.isPending || !(publishReferences[item.applicationId] ?? item.publishedReferenceCode).trim()} className="bg-emerald-700 text-white hover:bg-emerald-800"><Check className="mr-2 h-4 w-4" />Publish public profile</Button></div>{publishMutation.isPending && <LoaderCircle className="mt-2 h-5 w-5 animate-spin text-emerald-800" />}</div> : <><label className="mt-4 block text-xs font-semibold text-slate-700">Review note<textarea value={rejectionNotes[item.applicationId] ?? ""} onChange={(event) => setRejectionNotes((current) => ({ ...current, [item.applicationId]: event.target.value }))} maxLength={1000} rows={2} placeholder="Required if rejecting; optional if approving" className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-sm font-normal" /></label><div className="mt-3 flex flex-wrap gap-2"><Button onClick={() => reviewMutation.mutate({ applicationId: item.applicationId, decision: "approve" })} disabled={reviewMutation.isPending} className="bg-emerald-700 text-white hover:bg-emerald-800"><Check className="mr-2 h-4 w-4" />Approve draft</Button><Button variant="outline" onClick={() => reviewMutation.mutate({ applicationId: item.applicationId, decision: "reject" })} disabled={reviewMutation.isPending || (rejectionNotes[item.applicationId] ?? "").trim().length < 5} className="border-rose-200 text-rose-800"><X className="mr-2 h-4 w-4" />Reject draft</Button>{reviewMutation.isPending && <LoaderCircle className="h-5 w-5 animate-spin text-slate-500" />}</div></>}
    </article>)}</div>
  </Card>;
}
