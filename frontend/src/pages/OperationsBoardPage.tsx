import { Fragment, useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Check, ChevronDown, ChevronRight, CircleAlert, ClipboardCheck, Download, LoaderCircle, RefreshCw, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getAgencyAdminAuthHeaders } from "@/lib/agencyAdminAuth";

type Placement = {
  id: string; maid_reference_code: string | null; employer_id: string | null; status: string;
  target_start_date: string | null; last_status_at: string; last_actor: string;
  flight_booked: boolean; medical_completed: boolean; sip_completed: boolean; handover_completed: boolean;
};
type Interview = {
  id: string; application_id: string | null; placement_id: string | null; scheduled_at: string;
  duration_minutes: number; mode: string; meeting_url: string | null; status: string;
  notes: string; outcome: string; cancellation_reason: string; reschedule_reason: string;
  employer_name: string; employer_email: string; employer_contact_verified_at: string | null; employer_invitation_sent_at: string | null;
  employer_confirmed_at: string | null; applicant_confirmed_at: string | null;
  reminders_enabled: boolean; reminder_24h_sent_at: string | null; reminder_morning_sent_at: string | null; reminder_2h_sent_at: string | null;
  employer_reminder_24h_sent_at: string | null; employer_reminder_morning_sent_at: string | null; employer_reminder_2h_sent_at: string | null;
};
type InterviewDraft = {
  scheduledAt: string; status: string; notes: string; outcome: string;
  cancellationReason: string; rescheduleReason: string;
  employerConfirmed: boolean; applicantConfirmed: boolean;
  employerName: string; employerEmail: string; employerContactVerified: boolean;
};
type DeploymentTask = {
  id: string; placement_id: string; task_key: string; task_group: string; title: string; description: string;
  status: string; assigned_to: string | null; planned_at: string | null; due_at: string | null;
  completed_at: string | null; evidence_document_id: string | null; verification_note: string;
  verified_at: string | null; verified_by: string | null; notes: string;
};
type PlacementDocument = { id: string; category: string; original_name: string; mime_type: string; size_bytes: number; uploaded_by: string; created_at: string };
type MomApplication = { id: string; agency_id: number; placement_id: string; applicant_id: string; employer_id: string; submission_date: string | null; application_reference: string; ipa_status: string; ipa_document_id: string | null; approval_date: string | null; rejection_reason: string; assigned_to: string; notes: string; updated_by: string; created_at: string; updated_at: string };
type MomApplicationDraft = { submissionDate: string; applicationReference: string; ipaStatus: string; ipaDocumentId: string; approvalDate: string; rejectionReason: string; assignedTo: string; notes: string };
type ArrivalReportDay = { date: string; label: string; arrivals: Array<{ flight_id: string; placement_id: string; applicant_reference: string; applicant_name: string; applicant_photo: string; employer_reference: string; airline: string; flight_number: string; arrival_airport: string; arrival_at: string; status: string; notes: string; terminal: string; pickup_contact: string; transport_arrangement: string; accommodation_destination: string; special_instructions: string }> };
type PlacementFlight = { id: string; placement_id: string; airline: string; flight_number: string; arrival_airport: string; arrival_at: string | null; status: string; notes: string; terminal: string; pickup_contact: string; transport_arrangement: string; accommodation_destination: string; special_instructions: string };
type FlightDraft = { airline: string; flightNumber: string; arrivalAirport: string; arrivalAt: string; notes: string; terminal?: string; pickupContact?: string; transportArrangement?: string; accommodationDestination?: string; specialInstructions?: string };
type TaskDraft = { assignedTo: string; dueAt: string; notes: string; verificationNote: string; evidenceDocumentId: string };

const milestones: Array<[keyof Placement, string]> = [
  ["flight_booked", "Flight"], ["medical_completed", "Medical"], ["sip_completed", "SIP"], ["handover_completed", "Handover"],
];
const statusOptions = ["NOT_STARTED", "PLANNED", "IN_PROGRESS", "VERIFICATION_PENDING", "REJECTED", "RESUBMISSION_REQUIRED", "BLOCKED", "NOT_APPLICABLE"];
const statusLabels: Record<string, string> = {
  NOT_STARTED: "Not started", PLANNED: "Planned", IN_PROGRESS: "In progress", VERIFICATION_PENDING: "Needs verification",
  VERIFIED: "Verified", REJECTED: "Rejected", RESUBMISSION_REQUIRED: "Resubmission required", BLOCKED: "Blocked", NOT_APPLICABLE: "Not applicable",
};
const statusTone = (status: string) => {
  if (status === "VERIFIED") return "border-emerald-300 bg-emerald-100";
  if (["REJECTED", "RESUBMISSION_REQUIRED", "BLOCKED"].includes(status)) return "border-rose-300 bg-rose-100";
  if (["PLANNED", "IN_PROGRESS", "VERIFICATION_PENDING"].includes(status)) return "border-amber-300 bg-amber-100";
  if (status === "NOT_APPLICABLE") return "border-slate-300 bg-slate-100";
  return "border-slate-300 bg-white";
};
const momStatusOptions = ["NOT_STARTED", "DOCUMENTS_PREPARING", "READY_FOR_SUBMISSION", "AWAITING_HUMAN_APPROVAL", "SUBMITTED_TO_MOM", "PENDING_APPROVAL", "APPROVED", "REJECTED", "ADDITIONAL_INFORMATION_REQUIRED"];
const momStatusLabel = (status: string) => status.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());

const api = async <T,>(path: string, init?: RequestInit): Promise<T> => {
  const response = await fetch(path, { ...init, headers: { ...getAgencyAdminAuthHeaders(), ...(init?.headers ?? {}) } });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || `Request failed (HTTP ${response.status})`);
  return data as T;
};
const toInputDate = (value: string | null) => value ? new Date(value).toISOString().slice(0, 16) : "";
const toLocalDateTimeInput = (value: string | null) => {
  if (!value) return "";
  const date = new Date(value);
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
};

const blankMomDraft: MomApplicationDraft = { submissionDate: "", applicationReference: "", ipaStatus: "NOT_STARTED", ipaDocumentId: "", approvalDate: "", rejectionReason: "", assignedTo: "", notes: "" };

const MomApplicationPanel = ({ placementId, application, context, draft, error, documents, saving, onChange, onSave }: {
  placementId: string; application: MomApplication | null | undefined; context: { applicantId: string; employerId: string } | undefined;
  draft: MomApplicationDraft; error: string; documents: PlacementDocument[]; saving: boolean;
  onChange: (patch: Partial<MomApplicationDraft>) => void; onSave: () => void;
}) => <section className="mb-4 rounded-xl border border-slate-200 bg-white p-4" aria-label="MOM application and IPA tracking">
  <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="font-bold text-black">MOM application &amp; IPA tracking</h2><p className="mt-1 max-w-3xl text-xs leading-5 text-slate-700">Staff-recorded status from the authorized MOM process. This page does not submit to MOM or make an immigration decision.</p></div>{application && <span className="rounded-full border border-slate-300 bg-slate-50 px-3 py-1 text-xs font-semibold text-black">Updated {new Date(application.updated_at).toLocaleString()}</span>}</div>
  {error && <p role="alert" className="mt-3 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950">{error}. Apply the MOM tracking migration and deploy the updated Worker.</p>}
  <div className="mt-3 grid gap-2 sm:grid-cols-2"><p className="rounded-lg bg-slate-50 p-2 text-xs text-slate-700"><b className="text-black">Applicant ID:</b> {context?.applicantId || application?.applicant_id || "Not linked"}</p><p className="rounded-lg bg-slate-50 p-2 text-xs text-slate-700"><b className="text-black">Employer ID:</b> {context?.employerId || application?.employer_id || "Not linked"}</p></div>
  <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
    <label className="text-xs font-semibold text-black">MOM / IPA status<select value={draft.ipaStatus} onChange={(event) => onChange({ ipaStatus: event.target.value })} className="mt-1 block h-10 w-full rounded-lg border border-slate-300 bg-white px-2 text-sm font-normal text-black">{momStatusOptions.map((status) => <option key={status} value={status}>{momStatusLabel(status)}</option>)}</select></label>
    <label className="text-xs font-semibold text-black">Submission date<input type="date" value={draft.submissionDate} onChange={(event) => onChange({ submissionDate: event.target.value })} className="mt-1 block h-10 w-full rounded-lg border border-slate-300 bg-white px-2 text-sm font-normal text-black" /></label>
    <label className="text-xs font-semibold text-black">MOM application reference<input maxLength={120} value={draft.applicationReference} onChange={(event) => onChange({ applicationReference: event.target.value })} placeholder="Reference from authorized portal" className="mt-1 block h-10 w-full rounded-lg border border-slate-300 bg-white px-2 text-sm font-normal text-black" /></label>
    <label className="text-xs font-semibold text-black">Assigned staff member<input maxLength={120} value={draft.assignedTo} onChange={(event) => onChange({ assignedTo: event.target.value })} placeholder="Staff owner" className="mt-1 block h-10 w-full rounded-lg border border-slate-300 bg-white px-2 text-sm font-normal text-black" /></label>
    <label className="text-xs font-semibold text-black">IPA approval date<input type="date" value={draft.approvalDate} onChange={(event) => onChange({ approvalDate: event.target.value })} className="mt-1 block h-10 w-full rounded-lg border border-slate-300 bg-white px-2 text-sm font-normal text-black" /></label>
    <label className="text-xs font-semibold text-black">IPA decision evidence<select value={draft.ipaDocumentId} onChange={(event) => onChange({ ipaDocumentId: event.target.value })} className="mt-1 block h-10 w-full rounded-lg border border-slate-300 bg-white px-2 text-sm font-normal text-black"><option value="">No evidence selected</option>{documents.map((document) => <option key={document.id} value={document.id}>{document.original_name}</option>)}</select></label>
    {draft.ipaStatus === "REJECTED" && <label className="text-xs font-semibold text-black md:col-span-2">Rejection reason<textarea maxLength={1000} rows={2} value={draft.rejectionReason} onChange={(event) => onChange({ rejectionReason: event.target.value })} className="mt-1 block w-full rounded-lg border border-slate-300 bg-white p-2 text-sm font-normal text-black" /></label>}
    <label className="text-xs font-semibold text-black md:col-span-2">Staff notes<textarea maxLength={2000} rows={2} value={draft.notes} onChange={(event) => onChange({ notes: event.target.value })} placeholder="Operational notes; do not record unnecessary sensitive details" className="mt-1 block w-full rounded-lg border border-slate-300 bg-white p-2 text-sm font-normal text-black" /></label>
  </div>
  <div className="mt-3 flex flex-wrap items-center justify-between gap-2"><p className="text-xs text-slate-600">Final Approved and Rejected states require a decision document; approval also requires its date.</p><Button type="button" disabled={saving || Boolean(error)} onClick={onSave} className="bg-emerald-200 text-black hover:bg-emerald-300">{saving ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> : null}Save MOM tracking</Button></div>
</section>;

export default function OperationsBoardPage() {
  const { placementId } = useParams<{ placementId?: string }>();
  const [placements, setPlacements] = useState<Placement[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [tasksByPlacement, setTasksByPlacement] = useState<Record<string, DeploymentTask[]>>({});
  const [documentsByPlacement, setDocumentsByPlacement] = useState<Record<string, PlacementDocument[]>>({});
  const [drafts, setDrafts] = useState<Record<string, TaskDraft>>({});
  const [busyId, setBusyId] = useState<string | null>(null);
  const [uploadingPlacementId, setUploadingPlacementId] = useState<string | null>(null);
  const [openingDocumentId, setOpeningDocumentId] = useState<string | null>(null);
  const [documentCategory, setDocumentCategory] = useState("other");
  const [notice, setNotice] = useState("");
  const [arrivalDays, setArrivalDays] = useState<ArrivalReportDay[]>([]);
  const [arrivalReportError, setArrivalReportError] = useState("");
  const [arrivalReportLoading, setArrivalReportLoading] = useState(false);
  const [flightsByPlacement, setFlightsByPlacement] = useState<Record<string, PlacementFlight[]>>({});
  const [flightDrafts, setFlightDrafts] = useState<Record<string, Partial<FlightDraft>>>({});
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [interviewDrafts, setInterviewDrafts] = useState<Record<string, InterviewDraft>>({});
  const [savingInterviewId, setSavingInterviewId] = useState<string | null>(null);
  const [momApplicationsByPlacement, setMomApplicationsByPlacement] = useState<Record<string, MomApplication | null>>({});
  const [momDraftsByPlacement, setMomDraftsByPlacement] = useState<Record<string, MomApplicationDraft>>({});
  const [momContextByPlacement, setMomContextByPlacement] = useState<Record<string, { applicantId: string; employerId: string }>>({});
  const [momErrorsByPlacement, setMomErrorsByPlacement] = useState<Record<string, string>>({});
  const [savingMomPlacementId, setSavingMomPlacementId] = useState<string | null>(null);

  const setFlightField = (placementId: string, field: keyof FlightDraft, value: string) => {
    setFlightDrafts((current) => ({ ...current, [placementId]: { ...current[placementId], [field]: value } }));
  };

  const loadPlacements = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api<{ placements: Placement[] }>("/api/operations-board");
      setPlacements(data.placements ?? []);
      setError("");
    } catch (loadError) { setError(loadError instanceof Error ? loadError.message : "Unable to load operations"); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { void loadPlacements(); }, [loadPlacements]);

  const loadInterviews = useCallback(async () => {
    try {
      const result = await api<{ interviews: Interview[] }>("/api/operations-board/interviews");
      const rows = result.interviews ?? [];
      setInterviews(rows);
      setInterviewDrafts(Object.fromEntries(rows.map((interview) => [interview.id, {
        scheduledAt: toLocalDateTimeInput(interview.scheduled_at), status: interview.status,
        notes: interview.notes ?? "", outcome: interview.outcome ?? "",
        cancellationReason: interview.cancellation_reason ?? "", rescheduleReason: interview.reschedule_reason ?? "",
        employerConfirmed: Boolean(interview.employer_confirmed_at), applicantConfirmed: Boolean(interview.applicant_confirmed_at),
        employerName: interview.employer_name ?? "", employerEmail: interview.employer_email ?? "", employerContactVerified: Boolean(interview.employer_contact_verified_at),
      }])));
    } catch (loadError) {
      setNotice(loadError instanceof Error ? loadError.message : "Unable to load interview schedule");
    }
  }, []);

  useEffect(() => { void loadInterviews(); }, [loadInterviews]);

  const saveInterview = async (interview: Interview) => {
    const draft = interviewDrafts[interview.id];
    if (!draft) return;
    setSavingInterviewId(interview.id); setNotice("");
    try {
      const originalTime = toLocalDateTimeInput(interview.scheduled_at);
      const payload: Record<string, unknown> = {
        status: draft.status, notes: draft.notes, outcome: draft.outcome,
        cancellationReason: draft.cancellationReason,
        employerConfirmed: draft.employerConfirmed, applicantConfirmed: draft.applicantConfirmed,
      };
      if (draft.employerName !== (interview.employer_name ?? "")) payload.employerName = draft.employerName;
      if (draft.employerEmail !== (interview.employer_email ?? "")) {
        payload.employerEmail = draft.employerEmail;
        payload.employerContactVerified = draft.employerContactVerified;
      } else if (draft.employerContactVerified !== Boolean(interview.employer_contact_verified_at)) {
        payload.employerContactVerified = draft.employerContactVerified;
      }
      if (draft.scheduledAt && draft.scheduledAt !== originalTime) {
        payload.scheduledAt = new Date(draft.scheduledAt).toISOString();
        payload.rescheduleReason = draft.rescheduleReason;
      }
      await api(`/api/operations-board/interviews/${encodeURIComponent(interview.id)}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
      });
      setNotice("Interview status and details saved to the agency record.");
      await loadInterviews();
    } catch (saveError) {
      setNotice(saveError instanceof Error ? saveError.message : "Unable to save interview");
    } finally { setSavingInterviewId(null); }
  };

  const sendEmployerInvitation = async (interview: Interview) => {
    setSavingInterviewId(interview.id); setNotice("");
    try {
      const result = await api<{ sent: boolean; alreadySent?: boolean }>(`/api/operations-board/interviews/${encodeURIComponent(interview.id)}/employer-invitation`, { method: "POST" });
      setNotice(result.alreadySent ? "Employer invitation was already sent." : "Employer invitation sent.");
      await loadInterviews();
    } catch (inviteError) { setNotice(inviteError instanceof Error ? inviteError.message : "Unable to send employer invitation"); }
    finally { setSavingInterviewId(null); }
  };

  const loadArrivalReport = useCallback(async () => {
    setArrivalReportLoading(true);
    try {
      const result = await api<{ days: ArrivalReportDay[] }>("/api/operations-board/arrivals/rolling-three-day");
      setArrivalDays(result.days ?? []); setArrivalReportError("");
    } catch (reportError) { setArrivalReportError(reportError instanceof Error ? reportError.message : "Unable to load arrivals"); }
    finally { setArrivalReportLoading(false); }
  }, []);

  useEffect(() => { void loadArrivalReport(); }, [loadArrivalReport]);

  const loadTasks = useCallback(async (placementId: string) => {
    const [result, documentResult, flightResult] = await Promise.all([
      api<{ tasks: DeploymentTask[] }>(`/api/operations-board/placements/${encodeURIComponent(placementId)}/tasks`),
      api<{ documents: PlacementDocument[] }>(`/api/operations-board/placements/${encodeURIComponent(placementId)}/documents`),
      api<{ flights: PlacementFlight[] }>(`/api/operations-board/placements/${encodeURIComponent(placementId)}/flights`),
    ]);
    const tasks = result.tasks ?? [];
    setTasksByPlacement((current) => ({ ...current, [placementId]: tasks }));
    setDocumentsByPlacement((current) => ({ ...current, [placementId]: documentResult.documents ?? [] }));
    setFlightsByPlacement((current) => ({ ...current, [placementId]: flightResult.flights ?? [] }));
    setDrafts((current) => {
      const next = { ...current };
      for (const task of tasks) next[task.id] = {
        assignedTo: task.assigned_to ?? "", dueAt: toInputDate(task.due_at), notes: task.notes ?? "", verificationNote: task.verification_note ?? "", evidenceDocumentId: task.evidence_document_id ?? "",
      };
      return next;
    });
    try {
      const momResult = await api<{ application: MomApplication | null; applicantId: string; employerId: string }>(`/api/operations-board/placements/${encodeURIComponent(placementId)}/mom-application`);
      setMomApplicationsByPlacement((current) => ({ ...current, [placementId]: momResult.application }));
      setMomContextByPlacement((current) => ({ ...current, [placementId]: { applicantId: momResult.applicantId, employerId: momResult.employerId } }));
      const application = momResult.application;
      setMomDraftsByPlacement((current) => ({ ...current, [placementId]: {
        submissionDate: application?.submission_date ?? "", applicationReference: application?.application_reference ?? "",
        ipaStatus: application?.ipa_status ?? "NOT_STARTED", ipaDocumentId: application?.ipa_document_id ?? "",
        approvalDate: application?.approval_date ?? "", rejectionReason: application?.rejection_reason ?? "",
        assignedTo: application?.assigned_to ?? "", notes: application?.notes ?? "",
      } }));
      setMomErrorsByPlacement((current) => ({ ...current, [placementId]: "" }));
    } catch (momError) {
      setMomErrorsByPlacement((current) => ({ ...current, [placementId]: momError instanceof Error ? momError.message : "MOM application tracker is unavailable" }));
    }
  }, []);

  useEffect(() => {
    if (!placementId || !placements.some((placement) => placement.id === placementId) || tasksByPlacement[placementId]) return;
    setExpandedId(placementId);
    setBusyId(placementId);
    void loadTasks(placementId)
      .catch((loadError) => setNotice(loadError instanceof Error ? loadError.message : "Unable to load this placement"))
      .finally(() => setBusyId((current) => current === placementId ? null : current));
  }, [loadTasks, placementId, placements, tasksByPlacement]);

  const saveMomApplication = async (placementId: string) => {
    const draft = momDraftsByPlacement[placementId];
    if (!draft) return;
    setSavingMomPlacementId(placementId); setNotice("");
    try {
      const result = await api<{ deploymentTaskSynced: boolean; workflowEventLogged: boolean }>(`/api/operations-board/placements/${encodeURIComponent(placementId)}/mom-application`, {
        method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(draft),
      });
      setNotice(result.deploymentTaskSynced
        ? result.workflowEventLogged ? "MOM/IPA tracking saved and linked to the placement checklist." : "MOM/IPA tracking saved; activity history could not be recorded."
        : "MOM/IPA tracking saved, but the checklist status did not synchronize. Refresh the checklist and review it.");
      await loadTasks(placementId);
    } catch (saveError) { setNotice(saveError instanceof Error ? saveError.message : "Unable to save MOM/IPA tracking"); }
    finally { setSavingMomPlacementId(null); }
  };

  const saveFlight = async (placementId: string) => {
    const draft = flightDrafts[placementId];
    if (!draft?.arrivalAt) { setNotice("Enter the confirmed arrival date and time first."); return; }
    setBusyId(`flight-${placementId}`); setNotice("");
    try {
      await api(`/api/operations-board/placements/${encodeURIComponent(placementId)}/flights`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(draft) });
      await Promise.all([loadTasks(placementId), loadArrivalReport()]);
      setFlightDrafts((current) => ({ ...current, [placementId]: { airline: "", flightNumber: "", arrivalAirport: "", arrivalAt: "", notes: "" } }));
      setNotice("Flight saved. It now appears in the rolling arrival report when its arrival falls within the next three days.");
    } catch (saveError) { setNotice(saveError instanceof Error ? saveError.message : "Unable to save flight"); }
    finally { setBusyId(null); }
  };

  const openPlacementDocument = async (placementId: string, documentId: string) => {
    const viewer = window.open("about:blank", "_blank");
    if (viewer) viewer.opener = null;
    setOpeningDocumentId(documentId);
    try {
      const result = await api<{ signedUrl: string }>(`/api/operations-board/placements/${encodeURIComponent(placementId)}/documents/${encodeURIComponent(documentId)}/url`);
      if (viewer) viewer.location.href = result.signedUrl;
      else window.location.assign(result.signedUrl);
    } catch (openError) {
      viewer?.close();
      setNotice(openError instanceof Error ? openError.message : "Unable to open document");
    } finally { setOpeningDocumentId(null); }
  };

  const updateFlight = async (flight: PlacementFlight, patch: Record<string, unknown>) => {
    setBusyId(flight.id); setNotice("");
    try {
      await api(`/api/operations-board/flights/${encodeURIComponent(flight.id)}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(patch) });
      await Promise.all([loadTasks(flight.placement_id), loadArrivalReport()]);
      setNotice("Flight details updated.");
    } catch (saveError) { setNotice(saveError instanceof Error ? saveError.message : "Unable to update flight"); }
    finally { setBusyId(null); }
  };

  const uploadDocument = async (placementId: string, file?: File) => {
    if (!file) return;
    setUploadingPlacementId(placementId); setNotice("");
    try {
      const formData = new FormData(); formData.set("file", file); formData.set("category", documentCategory);
      const result = await api<{ document: PlacementDocument }>(`/api/operations-board/placements/${encodeURIComponent(placementId)}/documents`, { method: "POST", body: formData });
      setDocumentsByPlacement((current) => ({ ...current, [placementId]: [result.document, ...(current[placementId] ?? [])] }));
      setNotice("Document uploaded to private placement storage. Select it on a task to use it as verification evidence.");
    } catch (uploadError) { setNotice(uploadError instanceof Error ? uploadError.message : "Document upload failed"); }
    finally { setUploadingPlacementId(null); }
  };

  const toggleTasks = async (placement: Placement) => {
    if (expandedId === placement.id) { setExpandedId(null); return; }
    setExpandedId(placement.id);
    setNotice("");
    setBusyId(placement.id);
    try { await loadTasks(placement.id); }
    catch (loadError) { setNotice(loadError instanceof Error ? loadError.message : "Unable to load this checklist"); }
    finally { setBusyId(null); }
  };

  const initializeTasks = async (placementId: string) => {
    setBusyId(placementId); setNotice("");
    try {
      const result = await api<{ tasks: DeploymentTask[] }>(`/api/operations-board/placements/${encodeURIComponent(placementId)}/tasks/initialize`, { method: "POST" });
      setTasksByPlacement((current) => ({ ...current, [placementId]: result.tasks ?? [] }));
      setNotice("Placement checklist initialized. Each item stays unverified until staff records evidence.");
      await loadTasks(placementId);
    } catch (initError) { setNotice(initError instanceof Error ? initError.message : "Unable to initialize checklist"); }
    finally { setBusyId(null); }
  };

  const saveTask = async (task: DeploymentTask, patch: Record<string, unknown>) => {
    setBusyId(task.id); setNotice("");
    try {
      const result = await api<{ task: DeploymentTask; auditLogged: boolean }>(`/api/operations-board/deployment-tasks/${encodeURIComponent(task.id)}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(patch),
      });
      setNotice(result.auditLogged ? "Checklist update saved and added to activity history." : "Checklist update saved. Activity history could not be recorded; ask an administrator to check the workflow log.");
      await loadTasks(task.placement_id);
    } catch (saveError) { setNotice(saveError instanceof Error ? saveError.message : "Unable to save checklist update"); }
    finally { setBusyId(null); }
  };

  const visiblePlacements = placementId
    ? placements.filter((placement) => placement.id === placementId)
    : placements;

  return <main className="space-y-6 p-4 text-black md:p-8">
    <header className="flex flex-wrap items-end justify-between gap-4">
      <div>{placementId && <Link to="/agencyadmin/operations" className="mb-2 inline-flex text-sm font-semibold text-emerald-800 underline">← All placements</Link>}<p className="text-sm font-medium text-black">Placement lifecycle</p><h1 className="mt-1 text-3xl font-bold text-black">{placementId ? `Placement ${visiblePlacements[0]?.maid_reference_code || "details"}` : "Operations board"}</h1><p className="mt-2 max-w-3xl text-sm text-black">Track placement milestones and verified deployment tasks in one view. A green status requires a staff verification note or placement evidence.</p></div>
      <Button type="button" variant="outline" onClick={() => void loadPlacements()} disabled={loading} className="border-slate-300 text-black"><RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />Refresh board</Button>
    </header>
    {!placementId && <>
    <section aria-labelledby="interview-management-title" className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-wide text-violet-800">Recruitment operations</p><h2 id="interview-management-title" className="mt-1 text-xl font-bold text-black">Interview schedule and outcomes</h2><p className="mt-1 text-sm text-slate-700">Record confirmations, reschedule or cancel interviews, and save staff outcomes.</p></div><Button type="button" variant="outline" onClick={() => void loadInterviews()} className="border-slate-300 text-black"><RefreshCw className="h-4 w-4" />Refresh interviews</Button></div>
      {interviews.length === 0 ? <p className="mt-4 rounded-xl border border-dashed border-slate-300 p-5 text-sm text-slate-700">No interview records are available for this agency.</p> : <div className="mt-4 space-y-3">{interviews.slice(0, 50).map((interview) => {
        const draft = interviewDrafts[interview.id];
        if (!draft) return null;
        const setDraft = (patch: Partial<InterviewDraft>) => setInterviewDrafts((current) => ({ ...current, [interview.id]: { ...current[interview.id], ...patch } }));
        return <article key={interview.id} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-wide text-slate-600">{interview.application_id ? `Applicant ${interview.application_id}` : "Interview"}{interview.placement_id ? ` · Placement ${interview.placement_id}` : ""}</p><p className="mt-1 text-sm font-semibold text-black">{new Date(interview.scheduled_at).toLocaleString()} · {interview.mode.replace("_", " ")} · {interview.duration_minutes} min</p>{interview.meeting_url && <a className="mt-1 inline-block text-sm font-medium text-blue-800 underline" href={interview.meeting_url} target="_blank" rel="noreferrer">Open meeting link</a>}<p className="mt-2 text-xs text-slate-700">{interview.reminders_enabled ? `Applicant reminders enabled · 24h ${interview.reminder_24h_sent_at ? "sent" : "pending"} · morning ${interview.reminder_morning_sent_at ? "sent" : "pending"} · 2h ${interview.reminder_2h_sent_at ? "sent" : "pending"}` : "Automatic applicant reminders were not enabled for this interview."}</p>{interview.employer_email && <div className="mt-2 rounded-lg border border-slate-200 bg-white p-3 text-xs text-slate-700"><p className="font-semibold text-black">Employer participant: {interview.employer_name || "Employer"} · {interview.employer_email}</p><p className="mt-1">{interview.employer_contact_verified_at ? "Contact verified by agency staff" : "Contact not verified"} · Invitation {interview.employer_invitation_sent_at ? `sent ${new Date(interview.employer_invitation_sent_at).toLocaleString()}` : "not sent"}</p>{interview.employer_invitation_sent_at && <p className="mt-1">Employer reminders · 24h {interview.employer_reminder_24h_sent_at ? "sent" : "pending"} · morning {interview.employer_reminder_morning_sent_at ? "sent" : "pending"} · 2h {interview.employer_reminder_2h_sent_at ? "sent" : "pending"}</p>}{interview.employer_contact_verified_at && !interview.employer_invitation_sent_at && <Button type="button" variant="outline" className="mt-2 h-8 border-slate-300 text-black" disabled={savingInterviewId === interview.id} onClick={() => void sendEmployerInvitation(interview)}>{savingInterviewId === interview.id ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : null}Send employer invitation</Button>}</div>}</div><span className="rounded-full border border-slate-300 bg-white px-3 py-1 text-xs font-bold text-black">{interview.status.replace(/_/g, " ")}</span></div>
          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <label className="text-xs font-semibold text-black">Status<select value={draft.status} onChange={(event) => setDraft({ status: event.target.value })} className="mt-1 block h-10 w-full rounded-lg border border-slate-300 bg-white px-2 text-sm font-normal text-black">{["REQUESTED", "AWAITING_EMPLOYER_CONFIRMATION", "AWAITING_APPLICANT_CONFIRMATION", "SCHEDULED", "CONFIRMED", "COMPLETED", "PASSED", "FAILED", "SECOND_INTERVIEW", "CANCELLED", "NO_SHOW"].map((status) => <option key={status} value={status}>{status.replace(/_/g, " ")}</option>)}</select></label>
            <label className="text-xs font-semibold text-black">Reschedule date and time<input type="datetime-local" value={draft.scheduledAt} onChange={(event) => setDraft({ scheduledAt: event.target.value })} className="mt-1 block h-10 w-full rounded-lg border border-slate-300 bg-white px-2 text-sm font-normal text-black" /></label>
            <label className="text-xs font-semibold text-black">Employer contact name<input value={draft.employerName} maxLength={120} onChange={(event) => setDraft({ employerName: event.target.value })} className="mt-1 block h-10 w-full rounded-lg border border-slate-300 bg-white px-2 text-sm font-normal text-black" placeholder="Optional" /></label>
            <label className="text-xs font-semibold text-black">Employer contact email<input type="email" value={draft.employerEmail} maxLength={254} onChange={(event) => setDraft({ employerEmail: event.target.value, employerContactVerified: false })} className="mt-1 block h-10 w-full rounded-lg border border-slate-300 bg-white px-2 text-sm font-normal text-black" placeholder="name@example.com" /></label>
            <label className="flex items-center gap-2 self-end rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-black"><input type="checkbox" checked={draft.employerContactVerified} disabled={!draft.employerEmail.trim()} onChange={(event) => setDraft({ employerContactVerified: event.target.checked })} />Employer email verified</label>
            <label className="flex items-center gap-2 self-end rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-black"><input type="checkbox" checked={draft.employerConfirmed} onChange={(event) => setDraft({ employerConfirmed: event.target.checked })} />Employer confirmed interview</label>
            <label className="flex items-center gap-2 self-end rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-black"><input type="checkbox" checked={draft.applicantConfirmed} onChange={(event) => setDraft({ applicantConfirmed: event.target.checked })} />Applicant confirmed</label>
            <label className="text-xs font-semibold text-black">Outcome<textarea value={draft.outcome} onChange={(event) => setDraft({ outcome: event.target.value })} maxLength={4000} rows={2} placeholder="Staff-recorded outcome" className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-normal text-black" /></label>
            <label className="text-xs font-semibold text-black">Cancellation reason<textarea value={draft.cancellationReason} onChange={(event) => setDraft({ cancellationReason: event.target.value })} maxLength={1000} rows={2} className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-normal text-black" /></label>
            <label className="text-xs font-semibold text-black">Reschedule reason<textarea value={draft.rescheduleReason} onChange={(event) => setDraft({ rescheduleReason: event.target.value })} maxLength={1000} rows={2} className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-normal text-black" /></label>
            <label className="text-xs font-semibold text-black">Staff notes<textarea value={draft.notes} onChange={(event) => setDraft({ notes: event.target.value })} maxLength={4000} rows={2} className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-normal text-black" /></label>
          </div>
          <div className="mt-3 flex justify-end"><Button type="button" disabled={savingInterviewId === interview.id} onClick={() => void saveInterview(interview)} className="bg-violet-700 text-white hover:bg-violet-800">{savingInterviewId === interview.id ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}Save interview update</Button></div>
        </article>;
      })}</div>}
    </section>
    </>}
    {!placementId && <section aria-labelledby="rolling-arrivals-title" className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-wide text-emerald-800">Airport dispatch</p><h2 id="rolling-arrivals-title" className="mt-1 text-xl font-bold text-black">Rolling three-day arrivals</h2><p className="mt-1 text-sm text-slate-700">Confirmed flight records for today and the next two days · Singapore time</p></div><Button type="button" variant="outline" onClick={() => void loadArrivalReport()} disabled={arrivalReportLoading} className="border-slate-300 text-black"><RefreshCw className={`h-4 w-4 ${arrivalReportLoading ? "animate-spin" : ""}`} />Refresh report</Button></div>
      {arrivalReportError && <p role="alert" className="mt-4 rounded-lg border border-rose-300 bg-rose-50 p-3 text-sm text-black">Arrival report unavailable: {arrivalReportError}</p>}
      {arrivalReportLoading && <p className="mt-4 text-sm text-slate-700">Loading arrival schedule…</p>}
      {!arrivalReportLoading && !arrivalReportError && <div className="mt-4 grid gap-3 lg:grid-cols-3">{arrivalDays.map((day) => <article key={day.date} className="rounded-xl border border-slate-200 bg-slate-50 p-4"><div className="flex items-baseline justify-between gap-2"><h3 className="font-bold text-black">{day.label}</h3><time className="text-xs text-slate-700">{new Date(`${day.date}T00:00:00+08:00`).toLocaleDateString()}</time></div>{day.arrivals.length === 0 ? <p className="mt-3 text-sm text-slate-700">No scheduled arrivals</p> : <ul className="mt-3 space-y-3">{day.arrivals.map((arrival) => <li key={arrival.flight_id} className="rounded-lg border border-slate-200 bg-white p-3 text-sm"><div className="flex items-center gap-3">{arrival.applicant_photo ? <img src={arrival.applicant_photo} alt={`${arrival.applicant_name} profile`} className="h-12 w-12 rounded-full border border-slate-200 object-cover" /> : <div aria-hidden="true" className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 font-bold text-emerald-900">{arrival.applicant_name.slice(0, 1).toUpperCase()}</div>}<div><p className="font-semibold text-black">{arrival.applicant_name}</p><p className="text-xs text-slate-600">{arrival.applicant_reference} · {arrival.flight_number || "Flight number pending"}</p></div></div><p className="mt-1 text-slate-700">{new Date(arrival.arrival_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Singapore" })} · {arrival.airline || "Airline pending"} · {arrival.arrival_airport || "Airport pending"} · Terminal {arrival.terminal || "TBC"}</p><p className="text-xs text-slate-600">Employer {arrival.employer_reference} · {arrival.status.replace(/_/g, " ")}</p>{arrival.pickup_contact && <p className="mt-1 text-xs text-slate-700">Pickup contact: {arrival.pickup_contact}</p>}{arrival.transport_arrangement && <p className="text-xs text-slate-700">Transport: {arrival.transport_arrangement}</p>}{arrival.accommodation_destination && <p className="text-xs text-slate-700">Destination: {arrival.accommodation_destination}</p>}{arrival.special_instructions && <p className="text-xs text-slate-700">Instructions: {arrival.special_instructions}</p>}{arrival.notes && <p className="mt-1 text-xs text-slate-700">{arrival.notes}</p>}</li>)}</ul>}</article>)}</div>}
    </section>}
    <div className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-black"><ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-black" /><p><strong>Verification rule:</strong> marking a task complete requires a staff verification note or document evidence already attached to that placement.</p></div>
    {notice && <p role="status" className="rounded-xl border border-slate-300 bg-white p-3 text-sm text-black">{notice}</p>}
    {error && <p role="alert" className="rounded-md border border-rose-300 bg-rose-50 p-3 text-sm text-black">{error}</p>}
    {loading && <div className="flex items-center justify-center gap-2 py-12 text-black"><LoaderCircle className="h-5 w-5 animate-spin" />Loading placements…</div>}
    {!loading && placementId && visiblePlacements.length === 0 && <p role="alert" className="rounded-lg border border-rose-300 bg-rose-50 p-6 text-black">This placement was not found or is not available to your account.</p>}
    {!loading && !error && placements.length === 0 && <p className="rounded-lg border border-slate-300 bg-white p-6 text-black">No active placements yet.</p>}
    {!loading && placements.length > 0 && <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
      <table className="w-full min-w-[1050px] text-sm text-black"><thead className="bg-slate-50 text-left"><tr><th className="p-3">Candidate</th><th className="p-3">Employer</th><th className="p-3">Current state</th>{milestones.map(([, label]) => <th key={label} className="p-3">{label}</th>)}<th className="p-3">Last update</th><th className="p-3">Checklist</th></tr></thead>
        <tbody>{visiblePlacements.map((placement) => <Fragment key={placement.id}>
          <tr key={placement.id} className="border-t border-slate-200 align-top hover:bg-slate-50"><td className="p-3 font-semibold text-black">{placement.maid_reference_code || "Unassigned"}</td><td className="p-3 text-black">{placement.employer_id || "Unassigned"}</td><td className="p-3"><span className="rounded-full border border-slate-300 bg-slate-100 px-2 py-1 text-xs font-semibold text-black">{placement.status.replace(/_/g, " ")}</span></td>{milestones.map(([key, label]) => <td key={label} className="p-3 text-black">{placement[key] ? "Complete" : "Pending"}</td>)}<td className="p-3 text-black">{placement.last_status_at ? new Date(placement.last_status_at).toLocaleString() : "—"}<br />{placement.last_actor || "—"}</td><td className="p-3"><div className="flex flex-wrap gap-2"><Button type="button" size="sm" variant="outline" onClick={() => void toggleTasks(placement)} disabled={busyId === placement.id} className="border-slate-300 text-black">{busyId === placement.id ? <LoaderCircle className="h-4 w-4 animate-spin" /> : expandedId === placement.id ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}{expandedId === placement.id ? "Hide" : "Tasks"}</Button>{!placementId && <Link to={`/agencyadmin/operations/placements/${encodeURIComponent(placement.id)}`} className="inline-flex h-9 items-center rounded-md border border-slate-300 px-3 text-sm font-medium text-black hover:bg-slate-100">Details</Link>}</div></td></tr>
          {expandedId === placement.id && <tr className="border-t border-slate-200 bg-slate-50"><td colSpan={9} className="p-4 md:p-6">
            {placementId && <section className="mb-4 rounded-xl border border-slate-200 bg-white p-4" aria-label="Placement progress timeline"><h2 className="font-bold text-black">Placement progress timeline</h2><p className="mt-1 text-xs text-slate-700">Progress reflects staff-recorded checklist states. A triggered automation alone does not complete a milestone.</p>{tasksByPlacement[placement.id]?.length ? <ol className="mt-4 grid gap-2 md:grid-cols-2 xl:grid-cols-3">{tasksByPlacement[placement.id].map((task, index) => <li key={task.id} className="flex gap-3 rounded-lg border border-slate-200 p-3"><span className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${task.status === "VERIFIED" || task.status === "NOT_APPLICABLE" ? "bg-emerald-100 text-emerald-800" : ["REJECTED", "RESUBMISSION_REQUIRED", "BLOCKED"].includes(task.status) ? "bg-rose-100 text-rose-800" : "bg-slate-100 text-slate-700"}`}>{task.status === "VERIFIED" || task.status === "NOT_APPLICABLE" ? <Check className="h-4 w-4" /> : index + 1}</span><div className="min-w-0"><p className="text-xs font-semibold uppercase tracking-wide text-slate-600">{task.task_group}</p><p className="font-semibold text-black">{task.title}</p><p className="mt-1 text-xs font-medium text-slate-700">{statusLabels[task.status] ?? task.status}{task.verified_at ? ` · ${new Date(task.verified_at).toLocaleDateString()}` : task.due_at ? ` · Due ${new Date(task.due_at).toLocaleDateString()}` : ""}</p></div></li>)}</ol> : <p className="mt-3 rounded-lg border border-dashed border-slate-300 p-4 text-sm text-slate-700">Create the placement checklist to build its timeline.</p>}</section>}
            <section className="mb-4 rounded-xl border border-slate-200 bg-white p-4" aria-label="Placement flight schedule"><h2 className="font-bold text-black">Flight schedule</h2><p className="mt-1 text-xs text-slate-700">Arrival date and time use Singapore time (UTC+08:00). Record confirmed arrivals here. Update delays, reschedules, or cancellations so the rolling report stays current.</p>{(flightsByPlacement[placement.id] ?? []).map((flight) => <div key={flight.id} className="mt-3 flex flex-wrap items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm"><span className="min-w-48 flex-1 font-medium text-black">{flight.airline || "Airline pending"} {flight.flight_number || "Flight pending"} · {flight.arrival_at ? new Date(flight.arrival_at).toLocaleString([], { timeZone: "Asia/Singapore" }) : "Arrival time pending"} · {flight.arrival_airport || "Airport pending"}</span><select aria-label="Flight status" value={flight.status} disabled={busyId === flight.id} onChange={(event) => void updateFlight(flight, { status: event.target.value })} className="h-9 rounded-lg border border-slate-300 bg-white px-2 text-black">{["PENDING", "SCHEDULED", "IN_PROGRESS", "COMPLETED", "BLOCKED", "CANCELLED"].map((status) => <option key={status} value={status}>{status.replace(/_/g, " ")}</option>)}</select><Button type="button" size="sm" variant="outline" disabled={busyId === flight.id} onClick={() => { const next = window.prompt("Enter the new Singapore arrival time (YYYY-MM-DDTHH:mm, or include an explicit timezone)", flight.arrival_at ?? ""); if (next) void updateFlight(flight, { arrivalAt: next }); }} className="border-slate-300 text-black">Reschedule</Button><div className="basis-full text-xs text-slate-700">Terminal {flight.terminal || "TBC"} · Pickup {flight.pickup_contact || "not assigned"}{flight.transport_arrangement ? ` · ${flight.transport_arrangement}` : ""}{flight.accommodation_destination ? ` · Stay: ${flight.accommodation_destination}` : ""}{flight.special_instructions ? ` · Note: ${flight.special_instructions}` : ""}</div></div>)}<div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-5"><input aria-label="Airline" placeholder="Airline" value={flightDrafts[placement.id]?.airline ?? ""} onChange={(event) => setFlightDrafts((current) => ({ ...current, [placement.id]: { airline: event.target.value, flightNumber: current[placement.id]?.flightNumber ?? "", arrivalAirport: current[placement.id]?.arrivalAirport ?? "", arrivalAt: current[placement.id]?.arrivalAt ?? "", notes: current[placement.id]?.notes ?? "" } }))} className="h-9 rounded-lg border border-slate-300 px-2 text-sm text-black" /><input aria-label="Flight number" placeholder="Flight number" value={flightDrafts[placement.id]?.flightNumber ?? ""} onChange={(event) => setFlightDrafts((current) => ({ ...current, [placement.id]: { airline: current[placement.id]?.airline ?? "", flightNumber: event.target.value, arrivalAirport: current[placement.id]?.arrivalAirport ?? "", arrivalAt: current[placement.id]?.arrivalAt ?? "", notes: current[placement.id]?.notes ?? "" } }))} className="h-9 rounded-lg border border-slate-300 px-2 text-sm text-black" /><input aria-label="Arrival airport" placeholder="Arrival airport" value={flightDrafts[placement.id]?.arrivalAirport ?? ""} onChange={(event) => setFlightDrafts((current) => ({ ...current, [placement.id]: { airline: current[placement.id]?.airline ?? "", flightNumber: current[placement.id]?.flightNumber ?? "", arrivalAirport: event.target.value, arrivalAt: current[placement.id]?.arrivalAt ?? "", notes: current[placement.id]?.notes ?? "" } }))} className="h-9 rounded-lg border border-slate-300 px-2 text-sm text-black" /><input aria-label="Arrival date and time (Singapore time)" type="datetime-local" value={flightDrafts[placement.id]?.arrivalAt ?? ""} onChange={(event) => setFlightDrafts((current) => ({ ...current, [placement.id]: { airline: current[placement.id]?.airline ?? "", flightNumber: current[placement.id]?.flightNumber ?? "", arrivalAirport: current[placement.id]?.arrivalAirport ?? "", arrivalAt: event.target.value, notes: current[placement.id]?.notes ?? "" } }))} className="h-9 rounded-lg border border-slate-300 px-2 text-sm text-black" /><Button type="button" size="sm" disabled={busyId === `flight-${placement.id}`} onClick={() => void saveFlight(placement.id)} className="bg-emerald-200 text-black hover:bg-emerald-300">{busyId === `flight-${placement.id}` ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}Add flight</Button></div><div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{([['terminal', 'Arrival terminal'], ['pickupContact', 'Pickup contact'], ['transportArrangement', 'Transport arrangement'], ['accommodationDestination', 'Accommodation destination'], ['specialInstructions', 'Special instructions']] as const).map(([field, label]) => <input key={field} aria-label={label} placeholder={label} value={flightDrafts[placement.id]?.[field] ?? ""} onChange={(event) => setFlightField(placement.id, field, event.target.value)} className="h-9 rounded-lg border border-slate-300 px-2 text-sm text-black" />)}</div><input aria-label="Flight notes" placeholder="Additional flight notes" value={flightDrafts[placement.id]?.notes ?? ""} onChange={(event) => setFlightDrafts((current) => ({ ...current, [placement.id]: { airline: current[placement.id]?.airline ?? "", flightNumber: current[placement.id]?.flightNumber ?? "", arrivalAirport: current[placement.id]?.arrivalAirport ?? "", arrivalAt: current[placement.id]?.arrivalAt ?? "", notes: event.target.value } }))} className="mt-2 h-9 w-full rounded-lg border border-slate-300 px-2 text-sm text-black" /></section>
            <div className="mb-4 rounded-xl border border-slate-200 bg-white p-4"><div className="flex flex-wrap items-end gap-3"><label className="text-xs font-semibold text-black">Document category<select value={documentCategory} onChange={(event) => setDocumentCategory(event.target.value)} className="mt-1 block h-9 rounded-lg border border-slate-300 bg-white px-2 text-sm font-normal text-black"><option value="employer">Employer</option><option value="contract">Contract</option><option value="insurance">Insurance</option><option value="security_bond">Security bond</option><option value="flight">Flight</option><option value="arrival">Arrival</option><option value="medical">Medical</option><option value="sip">SIP</option><option value="work_permit">Work permit</option><option value="handover">Handover</option><option value="other">Other</option></select></label><label className="text-xs font-semibold text-black">Upload private placement evidence<input type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.txt,.jpg,.jpeg,.png" disabled={uploadingPlacementId === placement.id} onChange={(event) => { void uploadDocument(placement.id, event.currentTarget.files?.[0]); event.currentTarget.value = ""; }} className="mt-1 block max-w-full text-sm font-normal text-black file:mr-3 file:rounded-lg file:border-0 file:bg-emerald-100 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-black" /></label>{uploadingPlacementId === placement.id && <span className="inline-flex items-center gap-2 text-sm text-black"><LoaderCircle className="h-4 w-4 animate-spin" />Uploading…</span>}</div><p className="mt-2 text-xs text-black">Private storage · PDF, Office, CSV, text, JPG, or PNG · up to 25 MB. Uploaded files are only linked to this placement.</p>{(documentsByPlacement[placement.id] ?? []).length > 0 && <ul className="mt-3 flex flex-wrap gap-2">{documentsByPlacement[placement.id].map((document) => <li key={document.id}><Button type="button" size="sm" variant="outline" disabled={openingDocumentId === document.id} onClick={() => void openPlacementDocument(placement.id, document.id)} className="h-auto min-h-9 max-w-full justify-start gap-2 border-slate-300 px-3 py-2 text-left text-xs text-black"><span className="break-all font-semibold">{document.original_name}</span><span className="shrink-0 text-slate-600">{document.category.replace(/_/g, " ")}</span>{openingDocumentId === document.id ? <LoaderCircle className="h-3.5 w-3.5 shrink-0 animate-spin" /> : <Download className="h-3.5 w-3.5 shrink-0" />}</Button></li>)}</ul>}</div>
            <MomApplicationPanel placementId={placement.id} application={momApplicationsByPlacement[placement.id]} context={momContextByPlacement[placement.id]} draft={momDraftsByPlacement[placement.id] ?? blankMomDraft} error={momErrorsByPlacement[placement.id] ?? ""} documents={documentsByPlacement[placement.id] ?? []} saving={savingMomPlacementId === placement.id} onChange={(patch) => setMomDraftsByPlacement((current) => ({ ...current, [placement.id]: { ...(current[placement.id] ?? blankMomDraft), ...patch } }))} onSave={() => void saveMomApplication(placement.id)} />
            {busyId === placement.id && !tasksByPlacement[placement.id] ? <div className="flex items-center gap-2 py-6 text-black"><LoaderCircle className="h-4 w-4 animate-spin" />Loading checklist…</div> : !tasksByPlacement[placement.id]?.length ? <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-dashed border-slate-300 bg-white p-5"><div><p className="font-semibold text-black">No deployment checklist yet</p><p className="mt-1 text-sm text-black">Create the standard checklist for documents, contract, travel, arrival, work permit, and handover.</p></div><Button type="button" onClick={() => void initializeTasks(placement.id)} disabled={busyId === placement.id} className="bg-emerald-200 text-black hover:bg-emerald-300"><ClipboardCheck className="h-4 w-4" />Create checklist</Button></div> : <>
              <div className="mb-4 flex flex-wrap items-center justify-between gap-2"><div><h2 className="text-lg font-bold text-black">Deployment checklist</h2><p className="text-sm text-black">{tasksByPlacement[placement.id].filter((task) => task.status === "VERIFIED" || task.status === "NOT_APPLICABLE").length} of {tasksByPlacement[placement.id].length} verified or not applicable</p></div><div className="flex flex-wrap items-center gap-2"><Button type="button" size="sm" variant="outline" disabled={busyId === placement.id} onClick={() => void initializeTasks(placement.id)} className="border-slate-300 text-black">Add missing standard tasks</Button><span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-3 py-1.5 text-xs font-semibold text-black"><CircleAlert className="h-3.5 w-3.5" />Review every green status</span></div></div>
              <div className="grid gap-3 xl:grid-cols-2">{tasksByPlacement[placement.id].map((task) => {
                const draft = drafts[task.id] ?? { assignedTo: task.assigned_to ?? "", dueAt: toInputDate(task.due_at), notes: task.notes ?? "", verificationNote: task.verification_note ?? "", evidenceDocumentId: task.evidence_document_id ?? "" };
                return <article key={task.id} className="rounded-xl border border-slate-200 bg-white p-4 text-black shadow-sm">
                  <div className="flex flex-wrap items-start justify-between gap-3"><div className="min-w-0"><p className="text-xs font-semibold uppercase tracking-wide text-black">{task.task_group}</p><h3 className="mt-1 font-bold text-black">{task.title}</h3><p className="mt-1 text-sm text-black">{task.description}</p>{["contract_generated", "contract_signature", "signed_contract_saved", "ipa_approval", "insurance", "personal_accident_insurance", "security_bond", "work_permit_issuance"].includes(task.task_key) && <p className="mt-2 rounded-md bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-950">A private placement document is required before this task can be verified.</p>}</div><span className={`shrink-0 rounded-full border px-2.5 py-1 text-xs font-bold text-black ${statusTone(task.status)}`}>{task.status === "VERIFIED" && <Check className="mr-1 inline h-3 w-3" />}{statusLabels[task.status] ?? task.status}</span></div>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2"><label className="text-xs font-semibold text-black">Assigned to<input value={draft.assignedTo} onChange={(event) => setDrafts((current) => ({ ...current, [task.id]: { ...draft, assignedTo: event.target.value } }))} placeholder="Staff member" className="mt-1 h-9 w-full rounded-lg border border-slate-300 px-2 text-sm font-normal text-black" /></label><label className="text-xs font-semibold text-black">Due date<input type="datetime-local" value={draft.dueAt} onChange={(event) => setDrafts((current) => ({ ...current, [task.id]: { ...draft, dueAt: event.target.value } }))} className="mt-1 h-9 w-full rounded-lg border border-slate-300 px-2 text-sm font-normal text-black" /></label></div>
                  <div className="mt-3 grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] sm:items-end"><label className="text-xs font-semibold text-black">Staff notes / reason<input value={draft.notes} onChange={(event) => setDrafts((current) => ({ ...current, [task.id]: { ...draft, notes: event.target.value } }))} placeholder="Add task notes or reason not applicable" className="mt-1 h-9 w-full rounded-lg border border-slate-300 px-2 text-sm font-normal text-black" /></label><label className="text-xs font-semibold text-black">Update status<select value={task.status} onChange={(event) => void saveTask(task, { status: event.target.value, notes: draft.notes })} disabled={busyId === task.id} className="mt-1 h-9 w-full rounded-lg border border-slate-300 bg-white px-2 text-sm font-normal text-black">{statusOptions.map((status) => <option key={status} value={status}>{statusLabels[status]}</option>)}{task.status === "VERIFIED" && <option value="VERIFIED">Verified</option>}</select></label><Button type="button" variant="outline" size="sm" disabled={busyId === task.id} onClick={() => void saveTask(task, { assignedTo: draft.assignedTo, dueAt: draft.dueAt || null, notes: draft.notes, evidenceDocumentId: draft.evidenceDocumentId || null })} className="h-9 border-slate-300 text-black">{busyId === task.id ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}Save details</Button></div>
                  <div className="mt-3 grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] sm:items-end"><label className="text-xs font-semibold text-black">Linked document evidence<select value={draft.evidenceDocumentId} onChange={(event) => setDrafts((current) => ({ ...current, [task.id]: { ...draft, evidenceDocumentId: event.target.value } }))} className="mt-1 h-9 w-full rounded-lg border border-slate-300 bg-white px-2 text-sm font-normal text-black"><option value="">No document selected</option>{(documentsByPlacement[placement.id] ?? []).map((document) => <option key={document.id} value={document.id}>{document.original_name}</option>)}</select></label>{task.evidence_document_id && <p className="text-xs text-black">Document linked</p>}</div>
                  {task.status !== "VERIFIED" && task.status !== "NOT_APPLICABLE" && <div className="mt-3 flex flex-wrap items-end gap-2"><label className="min-w-48 flex-1 text-xs font-semibold text-black">Verification note<input value={draft.verificationNote} onChange={(event) => setDrafts((current) => ({ ...current, [task.id]: { ...draft, verificationNote: event.target.value } }))} placeholder="What did staff verify?" className="mt-1 h-9 w-full rounded-lg border border-slate-300 px-2 text-sm font-normal text-black" /></label><Button type="button" size="sm" disabled={busyId === task.id} onClick={() => void saveTask(task, { status: "VERIFIED", verificationNote: draft.verificationNote, evidenceDocumentId: draft.evidenceDocumentId || null })} className="h-9 bg-emerald-200 text-black hover:bg-emerald-300"><Check className="h-4 w-4" />Verify complete</Button></div>}
                  {task.status === "VERIFIED" && <p className="mt-3 rounded-lg bg-emerald-50 p-2 text-xs text-black"><Check className="mr-1 inline h-3.5 w-3.5" />Verified by {task.verified_by || "staff"}{task.verified_at ? ` · ${new Date(task.verified_at).toLocaleString()}` : ""}{task.verification_note ? ` · ${task.verification_note}` : ""}</p>}
                  {task.status === "NOT_APPLICABLE" && <p className="mt-3 rounded-lg bg-slate-100 p-2 text-xs text-black">Reason: {task.notes || "Not recorded"}</p>}
                </article>;
              })}</div>
            </>}
          </td></tr>}
        </Fragment>)}</tbody>
      </table>
    </div>}
  </main>;
}
