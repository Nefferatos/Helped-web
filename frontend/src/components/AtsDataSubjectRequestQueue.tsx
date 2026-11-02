import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { LoaderCircle, RefreshCw, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getAgencyAdminAuthHeaders } from "@/lib/agencyAdminAuth";

type DataRequest = {
  id: string; applicationId: string; requestType: "ACCESS" | "CORRECTION" | "ERASURE";
  status: "PENDING" | "IN_REVIEW" | "FULFILLED" | "DECLINED";
  applicantNote: string; resolutionNote: string; submittedAt: string;
  resolvedAt: string | null; resolvedBy: string | null;
};

const request = async <T,>(url: string, init?: RequestInit): Promise<T> => {
  const response = await fetch(url, { ...init, headers: { ...getAgencyAdminAuthHeaders(), ...(init?.headers ?? {}) } });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error || `Request failed (HTTP ${response.status})`);
  return body as T;
};

const formatDate = (value: string | null) => value ? new Date(value).toLocaleString() : "—";

export default function AtsDataSubjectRequestQueue() {
  const queryClient = useQueryClient();
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const requestsQuery = useQuery({ queryKey: ["ats-data-subject-requests"], queryFn: () => request<{ requests: DataRequest[] }>("/api/ats/data-subject-requests") });

  const updateRequest = async (item: DataRequest, status: "IN_REVIEW" | "FULFILLED" | "DECLINED") => {
    const resolutionNote = notes[item.id]?.trim() ?? "";
    if (status !== "IN_REVIEW" && resolutionNote.length < 10) {
      setError("Add at least 10 characters explaining how this request was handled before closing it.");
      return;
    }
    setBusyId(item.id); setError(""); setNotice("");
    try {
      const result = await request<{ auditLogged: boolean }>(`/api/ats/data-subject-requests/${encodeURIComponent(item.id)}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status, resolutionNote }),
      });
      setNotice(`Request ${status === "IN_REVIEW" ? "marked in review" : status.toLowerCase()}${result.auditLogged ? "." : "; activity history could not be recorded, so notify an administrator."}`);
      await queryClient.invalidateQueries({ queryKey: ["ats-data-subject-requests"] });
    } catch (updateError) { setError(updateError instanceof Error ? updateError.message : "Unable to update this request"); }
    finally { setBusyId(""); }
  };

  const requests = requestsQuery.data?.requests ?? [];
  return <Card className="mt-6 border border-slate-200 bg-white p-5 text-black shadow-sm sm:p-6">
    <div className="flex flex-wrap items-center justify-between gap-3"><div className="flex items-center gap-3"><span className="rounded-xl bg-slate-100 p-2.5 text-slate-700"><ShieldCheck className="h-5 w-5" /></span><div><h2 className="text-xl font-black">Applicant privacy requests</h2><p className="text-sm text-slate-600">Access, correction, and erasure requests sent through applicants’ secure status links.</p></div></div><Button type="button" variant="outline" onClick={() => void requestsQuery.refetch()} className="border-slate-300 text-black"><RefreshCw className="mr-2 h-4 w-4" />Refresh</Button></div>
    <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm leading-6 text-amber-950">Review placement, legal, and retention requirements before acting. Mark a request fulfilled only after carrying out the action in all relevant systems; this queue records the decision but does not delete applicant files.</p>
    {(requestsQuery.isError || error) && <p role="alert" className="mt-3 rounded-lg bg-rose-50 p-3 text-sm text-rose-800">{error || (requestsQuery.error instanceof Error ? requestsQuery.error.message : "Could not load requests")}</p>}
    {notice && <p role="status" className="mt-3 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">{notice}</p>}
    {requestsQuery.isLoading ? <p className="mt-5 flex items-center gap-2 text-sm text-slate-600"><LoaderCircle className="h-4 w-4 animate-spin" />Loading privacy requests…</p> : requests.length === 0 ? <p className="mt-5 rounded-xl border border-dashed border-slate-300 p-5 text-sm text-slate-600">No applicant privacy requests.</p> : <div className="mt-5 space-y-3">{requests.map((item) => <article key={item.id} className="rounded-xl border border-slate-200 bg-slate-50 p-4"><div className="flex flex-wrap items-start justify-between gap-2"><div><p className="font-bold">{item.requestType === "ERASURE" ? "Erasure" : item.requestType === "CORRECTION" ? "Correction" : "Access"} request · Application {item.applicationId}</p><p className="mt-1 text-xs text-slate-600">Submitted {formatDate(item.submittedAt)} · {item.status.replace(/_/g, " ")}</p></div>{item.resolvedBy && <p className="text-xs text-slate-600">Handled by {item.resolvedBy} · {formatDate(item.resolvedAt)}</p>}</div>
      {item.applicantNote && <p className="mt-3 whitespace-pre-wrap text-sm text-slate-800">Applicant details: {item.applicantNote}</p>}
      {item.status !== "FULFILLED" && item.status !== "DECLINED" ? <><label className="mt-3 block text-xs font-semibold text-slate-700">Resolution / staff notes<textarea value={notes[item.id] ?? item.resolutionNote ?? ""} maxLength={1000} rows={2} onChange={(event) => setNotes((current) => ({ ...current, [item.id]: event.target.value }))} className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-2 text-sm font-normal text-black" placeholder="Record the review or action taken" /></label><div className="mt-3 flex flex-wrap gap-2"><Button type="button" variant="outline" disabled={busyId === item.id || item.status === "IN_REVIEW"} onClick={() => void updateRequest(item, "IN_REVIEW")} className="border-slate-300 text-black">{busyId === item.id ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> : null}Start review</Button><Button type="button" disabled={busyId === item.id} onClick={() => void updateRequest(item, "FULFILLED")} className="bg-emerald-700 text-white hover:bg-emerald-800">Mark handled</Button><Button type="button" variant="outline" disabled={busyId === item.id} onClick={() => void updateRequest(item, "DECLINED")} className="border-rose-300 text-rose-800">Decline with reason</Button></div></> : <p className="mt-3 whitespace-pre-wrap text-sm text-slate-700">Staff response: {item.resolutionNote || "No response recorded"}</p>}</article>)}</div>}
  </Card>;
}
