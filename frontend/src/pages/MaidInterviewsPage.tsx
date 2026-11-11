import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { CalendarDays, Clock3, LoaderCircle, Mail, RefreshCw, Video } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getAgencyAdminAuthHeaders, getStoredAgencyAdmin } from "@/lib/agencyAdminAuth";
import type { MaidProfile } from "@/lib/maids";

type Interview = {
  id: string;
  maid_reference_code: string;
  scheduled_at: string;
  duration_minutes: number;
  mode: "video" | "phone" | "in_person";
  meeting_url: string | null;
  status: string;
  notes: string;
  candidate_name: string;
  candidate_email: string;
  candidate_invitation_sent_at: string | null;
  outcome: string;
  employer_name: string;
  employer_email: string;
  employer_contact_verified_at: string | null;
  employer_invitation_sent_at: string | null;
  employer_confirmed_at: string | null;
};

type InterviewDraft = {
  scheduledAt: string;
  mode: Interview["mode"];
  status: string;
  candidateEmail: string;
  meetingUrl: string;
  notes: string;
  outcome: string;
  employerName: string;
  employerEmail: string;
  employerContactVerified: boolean;
};
type CoordinationDraft = { employerMessage: string; applicantMessage: string; checklist: string[]; knowledgeSources: string[]; requiresStaffReview: true };

const interviewStatuses = ["SCHEDULED", "CONFIRMED", "COMPLETED", "PASSED", "FAILED", "SECOND_INTERVIEW", "CANCELLED", "NO_SHOW"];
const isValidEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
const modes: Array<{ value: Interview["mode"]; label: string }> = [
  { value: "video", label: "Video call" },
  { value: "phone", label: "Phone call" },
  { value: "in_person", label: "In person" },
];

const toLocalDateTimeInput = (value: string | Date) => {
  const date = new Date(value);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
};

const defaultInterviewTime = () => {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  date.setHours(10, 0, 0, 0);
  return toLocalDateTimeInput(date);
};

const api = async <T,>(path: string, init?: RequestInit): Promise<T> => {
  const response = await fetch(path, {
    ...init,
    headers: { ...getAgencyAdminAuthHeaders(), ...(init?.headers ?? {}) },
  });
  const data = await response.json().catch(() => ({})) as { error?: string } & T;
  if (!response.ok) throw new Error(data.error || `Request failed (${response.status})`);
  return data;
};

const MaidInterviewsPage = () => {
  const admin = getStoredAgencyAdmin();
  const [searchParams] = useSearchParams();
  const requestedCandidateReferences = useMemo(() => [...new Set((searchParams.get("references") ?? "").split(",").map((reference) => reference.trim()).filter(Boolean))].slice(0, 5), [searchParams]);
  const hiringRequestId = searchParams.get("requestId") ?? "";
  const [maids, setMaids] = useState<MaidProfile[]>([]);
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [drafts, setDrafts] = useState<Record<string, InterviewDraft>>({});
  const [selectedMaid, setSelectedMaid] = useState("");
  const [scheduledAt, setScheduledAt] = useState(defaultInterviewTime);
  const [mode, setMode] = useState<Interview["mode"]>("video");
  const [candidateEmail, setCandidateEmail] = useState("");
  const [employerName, setEmployerName] = useState("");
  const [employerEmail, setEmployerEmail] = useState("");
  const [employerContactVerified, setEmployerContactVerified] = useState(false);
  const [meetingUrl, setMeetingUrl] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [coordinationGuidance, setCoordinationGuidance] = useState<Record<string, string>>({});
  const [coordinationDrafts, setCoordinationDrafts] = useState<Record<string, CoordinationDraft>>({});
  const [coordinationLoadingId, setCoordinationLoadingId] = useState<string | null>(null);

  const maidByReference = useMemo(
    () => new Map(maids.map((maid) => [maid.referenceCode, maid])),
    [maids],
  );

  const loadPage = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const maidParams = new URLSearchParams({ visibility: "public", page: "1", pageSize: "500", noPhotos: "1" });
      if (admin?.agencyId) maidParams.set("agencyId", String(admin.agencyId));
      const [maidResult, interviewResult] = await Promise.all([
        api<{ maids: MaidProfile[] }>(`/api/maids?${maidParams}`),
        api<{ interviews: Interview[] }>("/api/operations-board/maid-interviews"),
      ]);
      const maidRows = maidResult.maids ?? [];
      const interviewRows = interviewResult.interviews ?? [];
      setMaids(maidRows);
      setInterviews(interviewRows);
      setDrafts(Object.fromEntries(interviewRows.map((interview) => [interview.id, {
        scheduledAt: toLocalDateTimeInput(interview.scheduled_at),
        mode: interview.mode,
        status: interview.status,
        candidateEmail: interview.candidate_email ?? "",
        meetingUrl: interview.meeting_url ?? "",
        notes: interview.notes ?? "",
        outcome: interview.outcome ?? "",
        employerName: interview.employer_name ?? "",
        employerEmail: interview.employer_email ?? "",
        employerContactVerified: Boolean(interview.employer_contact_verified_at),
      }])));
      setSelectedMaid((current) => {
        if (current && requestedCandidateReferences.includes(current) && maidRows.some((maid) => maid.referenceCode === current)) return current;
        const firstRequested = requestedCandidateReferences.find((reference) => maidRows.some((maid) => maid.referenceCode === reference));
        return firstRequested || current || maidRows[0]?.referenceCode || "";
      });
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load maid interviews");
    } finally {
      setLoading(false);
    }
  }, [admin?.agencyId, requestedCandidateReferences]);

  useEffect(() => { void loadPage(); }, [loadPage]);

  const createInterview = async (sendEmployerInvitation = false) => {
    setCreating(true);
    setError("");
    setNotice("");
    try {
      const result = await api<{ interview: Interview }>("/api/operations-board/maid-interviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          maidReferenceCode: selectedMaid,
          scheduledAt: new Date(scheduledAt).toISOString(),
          mode,
          candidateEmail,
          employerName,
          employerEmail,
          employerContactVerified,
          meetingUrl,
          notes,
        }),
      });
      let invitationError = "";
      if (sendEmployerInvitation) {
        try {
          await api(`/api/operations-board/maid-interviews/${encodeURIComponent(result.interview.id)}/employer-invitation`, { method: "POST" });
        } catch (sendError) {
          invitationError = sendError instanceof Error ? sendError.message : "Unable to send employer invitation";
        }
      }
      if (invitationError) {
        setError(`Interview scheduled, but the employer invitation was not sent: ${invitationError}`);
      } else {
        setNotice(sendEmployerInvitation
          ? `Interview scheduled and employer invitation sent to ${employerEmail}.`
          : `Interview scheduled for ${result.interview.candidate_name}.`);
      }
      setCandidateEmail("");
      setEmployerName("");
      setEmployerEmail("");
      setEmployerContactVerified(false);
      setMeetingUrl("");
      setNotes("");
      setScheduledAt(defaultInterviewTime());
      await loadPage();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to schedule interview");
    } finally {
      setCreating(false);
    }
  };

  const updateDraft = (interviewId: string, patch: Partial<InterviewDraft>) => {
    setDrafts((current) => ({ ...current, [interviewId]: { ...current[interviewId], ...patch } }));
  };

  const saveInterview = async (interview: Interview): Promise<boolean> => {
    const draft = drafts[interview.id];
    if (!draft) return false;
    setSavingId(interview.id);
    setError("");
    setNotice("");
    try {
      const scheduleChanged = draft.scheduledAt !== toLocalDateTimeInput(interview.scheduled_at);
      await api(`/api/operations-board/maid-interviews/${encodeURIComponent(interview.id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(scheduleChanged ? { scheduledAt: new Date(draft.scheduledAt).toISOString() } : {}),
          mode: draft.mode,
          status: draft.status,
          candidateEmail: draft.candidateEmail,
          employerName: draft.employerName,
          employerEmail: draft.employerEmail,
          employerContactVerified: draft.employerContactVerified,
          meetingUrl: draft.meetingUrl,
          notes: draft.notes,
          outcome: draft.outcome,
        }),
      });
      setNotice("Interview details saved.");
      await loadPage();
      return true;
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to save interview");
      return false;
    } finally {
      setSavingId(null);
    }
  };

  const sendInvitation = async (interview: Interview) => {
    setSavingId(interview.id);
    setError("");
    setNotice("");
    try {
      const result = await api<{ sent: boolean; meetingUrl?: string | null }>(
        `/api/operations-board/maid-interviews/${encodeURIComponent(interview.id)}/invitation`,
        { method: "POST" },
      );
      setNotice(result.meetingUrl
        ? `Invitation sent to ${interview.candidate_email}; the meeting link was saved.`
        : `Invitation sent to ${interview.candidate_email}.`);
      await loadPage();
    } catch (sendError) {
      setError(sendError instanceof Error ? sendError.message : "Unable to send interview invitation");
    } finally {
      setSavingId(null);
    }
  };

  const sendEmployerInvitation = async (interviewId: string, email: string) => {
    setSavingId(interviewId);
    setError("");
    setNotice("");
    try {
      await api(`/api/operations-board/maid-interviews/${encodeURIComponent(interviewId)}/employer-invitation`, { method: "POST" });
      setNotice(`Employer invitation sent to ${email}.`);
      await loadPage();
    } catch (sendError) {
      setError(sendError instanceof Error ? sendError.message : "Unable to send employer invitation");
    } finally {
      setSavingId(null);
    }
  };

  const prepareCoordinationDraft = async (interview: Interview) => {
    setCoordinationLoadingId(interview.id);
    setError("");
    setNotice("");
    try {
      const result = await api<{ draft: CoordinationDraft; aiUsed: boolean; knowledgeRetrieved: boolean }>(
        `/api/operations-board/maid-interviews/${encodeURIComponent(interview.id)}/coordination-draft`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ availabilityAndGuidance: coordinationGuidance[interview.id] || "" }),
        },
      );
      setCoordinationDrafts((current) => ({ ...current, [interview.id]: result.draft }));
      setNotice(`${result.aiUsed ? "Coordination drafts are ready" : "Template coordination drafts are ready"} for staff review.${result.knowledgeRetrieved ? " Approved agency guidance was retrieved." : " No matching approved guidance was found."}`);
    } catch (draftError) {
      setError(draftError instanceof Error ? draftError.message : "Could not prepare interview coordination drafts");
    } finally {
      setCoordinationLoadingId(null);
    }
  };

  return (
    <main className="space-y-6 p-4 text-slate-950 md:p-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-violet-800">Maid profile management</p>
          <h1 className="mt-1 text-3xl font-bold">Maid interviews</h1>
          <p className="mt-2 max-w-3xl text-sm text-slate-600">Schedule and track interviews for profiles created in Add Maid. Recruitment ATS applicants are managed separately.</p>
        </div>
        <Button type="button" variant="outline" onClick={() => void loadPage()} disabled={loading}>
          <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />Refresh
        </Button>
      </header>

      {error && <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900">{error}</div>}
      {notice && <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">{notice}</div>}

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center gap-3">
          <CalendarDays className="h-5 w-5 text-violet-700" />
          <div>
            <h2 className="text-lg font-bold">Schedule an interview</h2>
            <p className="text-sm text-slate-600">Choose a maid profile from the public list. Email is entered here because Add Maid profiles do not store an email address.</p>
          </div>
        </div>
        {requestedCandidateReferences.length > 0 && <div className="mb-4 rounded-xl border border-violet-200 bg-violet-50 p-3"><p className="text-sm font-semibold text-violet-950">Shortlist loaded from hiring request{hiringRequestId ? ` · ${hiringRequestId.slice(0, 8)}` : ""}</p><p className="mt-1 text-xs text-violet-900">Choose each requested profile below to schedule it. Confirm the time and contact details with the employer and candidate before sending any invitation.</p><div className="mt-2 flex flex-wrap gap-2">{requestedCandidateReferences.map((reference) => { const available = maids.some((maid) => maid.referenceCode === reference); return <button key={reference} type="button" disabled={!available} onClick={() => setSelectedMaid(reference)} className={`rounded-full border px-3 py-1 text-xs font-semibold ${selectedMaid === reference ? "border-violet-700 bg-violet-700 text-white" : available ? "border-violet-300 bg-white text-violet-950" : "border-slate-300 bg-slate-100 text-slate-500"}`}>{reference}{!available ? " · unavailable" : ""}</button>; })}</div></div>}
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <label className="text-sm font-semibold">Maid profile
            <select value={selectedMaid} onChange={(event) => setSelectedMaid(event.target.value)} className="mt-1 block h-11 w-full rounded-lg border border-slate-300 bg-white px-3 font-normal" disabled={loading || maids.length === 0}>
              {maids.length === 0 && <option value="">No maid profiles available</option>}
              {maids.map((maid) => <option key={maid.referenceCode} value={maid.referenceCode}>{maid.fullName} · {maid.referenceCode}</option>)}
            </select>
          </label>
          <label className="text-sm font-semibold">Interview date and time
            <input type="datetime-local" value={scheduledAt} min={toLocalDateTimeInput(new Date())} onChange={(event) => setScheduledAt(event.target.value)} className="mt-1 block h-11 w-full rounded-lg border border-slate-300 bg-white px-3 font-normal" />
          </label>
          <label className="text-sm font-semibold">Interview format
            <select value={mode} onChange={(event) => setMode(event.target.value as Interview["mode"])} className="mt-1 block h-11 w-full rounded-lg border border-slate-300 bg-white px-3 font-normal">
              {modes.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
            </select>
          </label>
          <label className="text-sm font-semibold">Maid email <span className="font-normal text-slate-500">(optional; sends the maid invitation)</span>
            <input type="email" value={candidateEmail} onChange={(event) => setCandidateEmail(event.target.value)} placeholder="name@example.com" className="mt-1 block h-11 w-full rounded-lg border border-slate-300 bg-white px-3 font-normal" />
          </label>
          <label className="text-sm font-semibold">Employer contact name <span className="font-normal text-slate-500">(optional)</span>
            <input value={employerName} onChange={(event) => setEmployerName(event.target.value)} maxLength={120} placeholder="Employer name" className="mt-1 block h-11 w-full rounded-lg border border-slate-300 bg-white px-3 font-normal" />
          </label>
          <label className="text-sm font-semibold">Employer email <span className="font-normal text-slate-500">(needed for employer invitation)</span>
            <input type="email" value={employerEmail} onChange={(event) => { setEmployerEmail(event.target.value); setEmployerContactVerified(false); }} maxLength={254} placeholder="employer@example.com" className="mt-1 block h-11 w-full rounded-lg border border-slate-300 bg-white px-3 font-normal" />
          </label>
          <label className={`flex items-start gap-2 rounded-lg border p-3 text-sm font-normal ${employerEmail.trim() && isValidEmail(employerEmail) ? "border-slate-200 bg-slate-50" : "border-slate-100 bg-slate-50/50 text-slate-500"}`}>
            <input type="checkbox" className="mt-0.5" checked={employerContactVerified} disabled={!employerEmail.trim() || !isValidEmail(employerEmail)} onChange={(event) => setEmployerContactVerified(event.target.checked)} />
            <span>I verified this employer email and may send interview details to it.</span>
          </label>
          <label className="text-sm font-semibold">Existing meeting link <span className="font-normal text-slate-500">(optional)</span>
            <input type="url" value={meetingUrl} onChange={(event) => setMeetingUrl(event.target.value)} placeholder="https://..." className="mt-1 block h-11 w-full rounded-lg border border-slate-300 bg-white px-3 font-normal" />
          </label>
          <label className="text-sm font-semibold">Staff notes <span className="font-normal text-slate-500">(optional)</span>
            <input value={notes} onChange={(event) => setNotes(event.target.value)} maxLength={4000} className="mt-1 block h-11 w-full rounded-lg border border-slate-300 bg-white px-3 font-normal" />
          </label>
        </div>
        <div className="mt-4 flex flex-wrap justify-end gap-2">
          <Button type="button" onClick={() => void createInterview()} disabled={creating || loading || !selectedMaid || !scheduledAt}>
            {creating ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> : <CalendarDays className="mr-2 h-4 w-4" />}
            Save interview
          </Button>
          <Button type="button" variant="outline" onClick={() => void createInterview(true)} disabled={creating || loading || !selectedMaid || !scheduledAt || !employerContactVerified || !isValidEmail(employerEmail)}>
            {creating ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> : <Mail className="mr-2 h-4 w-4" />}
            Schedule and send employer invitation
          </Button>
        </div>
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="text-xl font-bold">Scheduled and previous interviews</h2>
          <p className="text-sm text-slate-600">Send employer confirmation invitations, optionally invite the maid, reschedule, and record outcomes.</p>
        </div>
        {loading && interviews.length === 0 ? <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-600">Loading interviews…</div>
          : interviews.length === 0 ? <div className="rounded-xl border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-600">No maid interviews yet. Schedule the first one above.</div>
            : <div className="space-y-4">{interviews.map((interview) => {
              const draft = drafts[interview.id];
              if (!draft) return null;
              const maid = maidByReference.get(interview.maid_reference_code);
              const displayName = maid?.fullName || interview.candidate_name || "Maid profile unavailable";
              const scheduleChanged = draft.scheduledAt !== toLocalDateTimeInput(interview.scheduled_at);
              const employerInvitationNeedsSending = !interview.employer_invitation_sent_at
                || draft.employerEmail !== interview.employer_email
                || scheduleChanged;
              const maidInvitationNeedsSending = !interview.candidate_invitation_sent_at
                || draft.candidateEmail !== interview.candidate_email
                || scheduleChanged;
              return <article key={interview.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-bold">{displayName}</h3>
                    <p className="text-xs text-slate-500">{interview.maid_reference_code}</p>
                    <p className="mt-1 flex items-center gap-2 text-sm text-slate-700"><Clock3 className="h-4 w-4" />{new Date(interview.scheduled_at).toLocaleString()}</p>
                    {interview.meeting_url && <a className="mt-1 inline-block text-sm font-medium text-blue-700 underline" href={interview.meeting_url} target="_blank" rel="noreferrer">Open meeting link</a>}
                  </div>
                  <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-bold">{interview.status.replace(/_/g, " ")}</span>
                </div>
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  <label className="text-sm font-semibold">Date and time
                    <input type="datetime-local" value={draft.scheduledAt} onChange={(event) => updateDraft(interview.id, { scheduledAt: event.target.value })} className="mt-1 block h-10 w-full rounded-lg border border-slate-300 px-3 font-normal" />
                  </label>
                  <label className="text-sm font-semibold">Format
                    <select value={draft.mode} onChange={(event) => updateDraft(interview.id, { mode: event.target.value as Interview["mode"] })} className="mt-1 block h-10 w-full rounded-lg border border-slate-300 bg-white px-3 font-normal">
                      {modes.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                    </select>
                  </label>
                  <label className="text-sm font-semibold">Status
                    <select value={draft.status} onChange={(event) => updateDraft(interview.id, { status: event.target.value })} className="mt-1 block h-10 w-full rounded-lg border border-slate-300 bg-white px-3 font-normal">
                      {interviewStatuses.map((status) => <option key={status} value={status}>{status.replace(/_/g, " ")}</option>)}
                    </select>
                  </label>
                  <label className="text-sm font-semibold">Maid email
                    <input type="email" value={draft.candidateEmail} onChange={(event) => updateDraft(interview.id, { candidateEmail: event.target.value })} className="mt-1 block h-10 w-full rounded-lg border border-slate-300 px-3 font-normal" placeholder="name@example.com" />
                  </label>
                  <label className="text-sm font-semibold">Employer contact name
                    <input value={draft.employerName} onChange={(event) => updateDraft(interview.id, { employerName: event.target.value })} maxLength={120} className="mt-1 block h-10 w-full rounded-lg border border-slate-300 px-3 font-normal" placeholder="Employer name" />
                  </label>
                  <label className="text-sm font-semibold">Employer email
                    <input type="email" value={draft.employerEmail} onChange={(event) => updateDraft(interview.id, { employerEmail: event.target.value, employerContactVerified: false })} maxLength={254} className="mt-1 block h-10 w-full rounded-lg border border-slate-300 px-3 font-normal" placeholder="employer@example.com" />
                  </label>
                  <label className={`flex items-start gap-2 rounded-lg border p-3 text-sm font-normal ${draft.employerEmail.trim() && isValidEmail(draft.employerEmail) ? "border-slate-200 bg-slate-50" : "border-slate-100 bg-slate-50/50 text-slate-500"}`}>
                    <input type="checkbox" className="mt-0.5" checked={draft.employerContactVerified} disabled={!draft.employerEmail.trim() || !isValidEmail(draft.employerEmail)} onChange={(event) => updateDraft(interview.id, { employerContactVerified: event.target.checked })} />
                    <span>I verified this employer email and may send interview details to it.</span>
                  </label>
                  <label className="text-sm font-semibold">Meeting link
                    <input type="url" value={draft.meetingUrl} onChange={(event) => updateDraft(interview.id, { meetingUrl: event.target.value })} className="mt-1 block h-10 w-full rounded-lg border border-slate-300 px-3 font-normal" placeholder="https://..." />
                  </label>
                  <label className="text-sm font-semibold">Interview outcome
                    <input value={draft.outcome} onChange={(event) => updateDraft(interview.id, { outcome: event.target.value })} maxLength={4000} className="mt-1 block h-10 w-full rounded-lg border border-slate-300 px-3 font-normal" placeholder="Staff-recorded outcome" />
                  </label>
                  <label className="text-sm font-semibold md:col-span-2 xl:col-span-3">Staff notes
                    <textarea value={draft.notes} onChange={(event) => updateDraft(interview.id, { notes: event.target.value })} maxLength={4000} rows={2} className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 font-normal" />
                  </label>
                </div>
                <section className="mt-4 rounded-xl border border-violet-200 bg-violet-50/60 p-4" aria-label="AI interview coordination assistant">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h4 className="font-semibold text-violet-950">Agent 4 · Interview coordination</h4>
                      <p className="mt-1 text-xs text-violet-900">Prepare reviewable drafts and a staff checklist. Nothing is sent and the interview status is not changed.</p>
                    </div>
                    <Button type="button" variant="outline" disabled={coordinationLoadingId === interview.id || savingId === interview.id} onClick={() => void prepareCoordinationDraft(interview)}>
                      {coordinationLoadingId === interview.id ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> : <Mail className="mr-2 h-4 w-4" />}
                      Prepare coordination drafts
                    </Button>
                  </div>
                  <label className="mt-3 block text-xs font-semibold text-violet-950">Availability and approved agency guidance <span className="font-normal">(optional; don’t include contact details)</span>
                    <textarea maxLength={2000} rows={2} value={coordinationGuidance[interview.id] || ""} onChange={(event) => setCoordinationGuidance((current) => ({ ...current, [interview.id]: event.target.value }))} placeholder="Add confirmed availability windows or approved interview instructions" className="mt-1 w-full rounded-lg border border-violet-200 bg-white p-2 text-sm font-normal text-slate-900" />
                  </label>
                  {coordinationDrafts[interview.id] && <div className="mt-3 space-y-3">
                    <p role="status" className="text-xs font-semibold text-violet-900">Staff review required before sending.</p>
                    <label className="block text-xs font-semibold text-violet-950">Employer draft<textarea readOnly rows={3} value={coordinationDrafts[interview.id].employerMessage} className="mt-1 w-full rounded-lg border border-violet-200 bg-white p-2 text-sm font-normal text-slate-900" /></label>
                    <label className="block text-xs font-semibold text-violet-950">Applicant draft<textarea readOnly rows={3} value={coordinationDrafts[interview.id].applicantMessage} className="mt-1 w-full rounded-lg border border-violet-200 bg-white p-2 text-sm font-normal text-slate-900" /></label>
                    {coordinationDrafts[interview.id].knowledgeSources.length > 0 && <p className="text-xs text-violet-900">Grounded in: {coordinationDrafts[interview.id].knowledgeSources.join(", ")}</p>}
                    <div className="text-xs text-violet-950"><p className="font-semibold">Staff checklist</p><ul className="mt-1 list-disc pl-5">{coordinationDrafts[interview.id].checklist.map((item, index) => <li key={`${interview.id}-coord-${index}`}>{item}</li>)}</ul></div>
                  </div>}
                </section>
                {interview.employer_email && <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm">
                  <p className="font-semibold">Employer participant: {interview.employer_name || "Employer"} · {interview.employer_email}</p>
                  <p className="mt-1 text-xs text-slate-600">
                    {interview.employer_contact_verified_at ? "Email verified by agency staff" : "Email not verified"} · {interview.employer_invitation_sent_at
                      ? `Invitation sent ${new Date(interview.employer_invitation_sent_at).toLocaleString()}`
                      : "Invitation not sent"}
                    {interview.employer_confirmed_at ? ` · Attendance confirmed ${new Date(interview.employer_confirmed_at).toLocaleString()}` : ""}
                  </p>
                </div>}
                <div className="mt-4 flex flex-wrap justify-end gap-2">
                  {employerInvitationNeedsSending && <Button type="button" variant="outline" disabled={savingId === interview.id || !draft.employerContactVerified || !isValidEmail(draft.employerEmail)} onClick={() => void saveInterview(interview).then((saved) => saved && sendEmployerInvitation(interview.id, draft.employerEmail))}>
                    {savingId === interview.id ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> : <Mail className="mr-2 h-4 w-4" />}Save and send employer invitation
                  </Button>}
                  {maidInvitationNeedsSending && <Button type="button" variant="outline" disabled={savingId === interview.id || !draft.candidateEmail.trim() || !isValidEmail(draft.candidateEmail)} onClick={() => void saveInterview(interview).then((saved) => saved && sendInvitation(interview))}>
                    {savingId === interview.id ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> : <Mail className="mr-2 h-4 w-4" />}Save and send maid invitation
                  </Button>}
                  <Button type="button" disabled={savingId === interview.id} onClick={() => void saveInterview(interview)}>
                    {savingId === interview.id ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> : <Video className="mr-2 h-4 w-4" />}Save interview
                  </Button>
                </div>
                {interview.candidate_invitation_sent_at && <p className="mt-3 text-right text-xs text-emerald-700">Invitation sent {new Date(interview.candidate_invitation_sent_at).toLocaleString()}</p>}
              </article>;
            })}</div>}
      </section>
    </main>
  );
};

export default MaidInterviewsPage;
