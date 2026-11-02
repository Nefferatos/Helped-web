import { FormEvent, useEffect, useState } from "react";
import { CheckCircle2, ClipboardList, LoaderCircle, ShieldCheck } from "lucide-react";

type Assignment = { taskType: string; dueAt: string | null; placementReference: string; contractorName: string; expiresAt: string; acknowledgedAt: string | null };

const formatDate = (value: string | null) => value
  ? new Intl.DateTimeFormat("en-SG", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Singapore" }).format(new Date(value))
  : "No due date set";

export default function ContractorAcknowledgementPage() {
  const token = new URLSearchParams(window.location.search).get("token") ?? "";
  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [complete, setComplete] = useState(false);
  const [acknowledged, setAcknowledged] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (token) window.history.replaceState(null, "", "/contractor/acknowledge");
    const load = async () => {
      if (!token) { setError("This acknowledgement link is missing its token."); setLoading(false); return; }
      try {
        const response = await fetch(`/api/contractor/public/acknowledgement?token=${encodeURIComponent(token)}`, { cache: "no-store" });
        const data = await response.json().catch(() => ({})) as { task?: Assignment; error?: string };
        if (!response.ok) throw new Error(data.error || "This acknowledgement link is invalid or expired.");
        if (!cancelled) { setAssignment(data.task ?? null); setAcknowledged(Boolean(data.task?.acknowledgedAt)); }
      } catch (loadError) {
        if (!cancelled) setError(loadError instanceof Error ? loadError.message : "Unable to load this assignment.");
      } finally { if (!cancelled) setLoading(false); }
    };
    void load();
    return () => { cancelled = true; };
  }, [token]);

  const submitAction = async (event: FormEvent) => {
    event.preventDefault();
    if (!token) return;
    const action = acknowledged ? "report_completion" : "acknowledge";
    setSaving(true); setError("");
    try {
      const response = await fetch("/api/contractor/public/acknowledgement", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, action, note: note.trim() }),
      });
      const data = await response.json().catch(() => ({})) as { ok?: boolean; error?: string; acknowledgedAt?: string };
      if (!response.ok || !data.ok) throw new Error(data.error || "Unable to update this assignment.");
      if (action === "acknowledge") { setAcknowledged(true); setNote(""); }
      else setComplete(true);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to record your acknowledgement.");
    } finally { setSaving(false); }
  };

  return <main className="flex min-h-screen items-center justify-center bg-slate-50 p-4 text-black">
    <section className="w-full max-w-xl rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
      <div className="flex items-center gap-3"><span className="rounded-2xl bg-emerald-100 p-3 text-emerald-800"><ClipboardList className="h-6 w-6" /></span><div><p className="text-xs font-bold uppercase tracking-widest text-emerald-800">At The Agency</p><h1 className="text-2xl font-black">Contractor task acknowledgement</h1></div></div>
      {loading && <p className="mt-6 flex items-center gap-2 text-sm text-slate-700"><LoaderCircle className="h-4 w-4 animate-spin" />Loading assignment…</p>}
      {!loading && error && <p role="alert" className="mt-6 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900">{error}</p>}
      {complete && <div role="status" className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50 p-4"><p className="flex items-center gap-2 font-bold text-emerald-950"><CheckCircle2 className="h-5 w-5" />Completion reported</p><p className="mt-2 text-sm text-emerald-900">The agency has been notified. Staff must verify the report before the task is marked complete.</p></div>}
      {!loading && !error && assignment && acknowledged && !complete && <p role="status" className="mt-5 rounded-xl border border-sky-200 bg-sky-50 p-3 text-sm text-sky-950">Assignment acknowledged{assignment.acknowledgedAt ? ` on ${formatDate(assignment.acknowledgedAt)}` : ""}. When the work is finished, report it below. The agency will verify it.</p>}
      {!loading && !error && assignment && !complete && <>
        <p className="mt-5 text-sm text-slate-700">Please review the assignment. Acknowledgement confirms receipt. After you complete the work, use the same link to report it for staff verification.</p>
        <dl className="mt-4 space-y-3 rounded-2xl bg-slate-50 p-4 text-sm"><div><dt className="text-xs font-semibold uppercase text-slate-600">Assigned contractor</dt><dd className="mt-1 font-semibold">{assignment.contractorName}</dd></div><div><dt className="text-xs font-semibold uppercase text-slate-600">Placement</dt><dd className="mt-1 font-semibold">{assignment.placementReference}</dd></div><div><dt className="text-xs font-semibold uppercase text-slate-600">Task</dt><dd className="mt-1 font-semibold">{assignment.taskType}</dd></div><div><dt className="text-xs font-semibold uppercase text-slate-600">Due</dt><dd className="mt-1 font-semibold">{formatDate(assignment.dueAt)}</dd></div><div><dt className="text-xs font-semibold uppercase text-slate-600">Link expires</dt><dd className="mt-1">{formatDate(assignment.expiresAt)}</dd></div></dl>
        {!complete && <form onSubmit={(event) => void submitAction(event)} className="mt-5 space-y-3"><label className="block text-sm font-semibold">{acknowledged ? "Completion note (optional)" : "Acknowledgement note (optional)"}<textarea value={note} onChange={(event) => setNote(event.target.value)} maxLength={1000} rows={3} className="mt-1.5 w-full rounded-xl border border-slate-300 p-3 text-sm font-normal" placeholder="Add a short note for the agency" /></label><button type="submit" disabled={saving} className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-emerald-800 px-4 py-2 font-bold text-white hover:bg-emerald-900 disabled:opacity-60">{saving ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}{acknowledged ? "Report work complete for staff review" : "Acknowledge assignment"}</button></form>}
        <p className="mt-4 flex items-start gap-2 text-xs text-slate-600"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />This secure link is for the assigned contractor and expires in seven days. Do not forward it. Only agency staff can verify completion.</p>
      </>}
      {error && assignment && !complete && <button type="button" onClick={() => window.location.reload()} className="mt-3 rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold">Try again</button>}
    </section>
  </main>;
}
