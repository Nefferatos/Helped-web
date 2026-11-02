import { useQuery } from "@tanstack/react-query";
import { FormEvent, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { fetchPublicAtsApplicationSummary, fetchPublicAtsDataSubjectRequests, fetchPublicAtsProfileWorkflow, submitPublicAtsDataSubjectRequest, updatePublicAtsProfileWorkflow, type PublicAtsDataSubjectRequest, type PublicAtsProfileWorkflow } from "@/lib/ats";
import { CheckCircle2, Clock3, FileCheck2, LoaderCircle, Mail, MessageSquareText, ShieldCheck } from "lucide-react";

const formatDate = (value?: string) => {
  if (!value) return "N/A";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
};

const ProfileAssistantPanel = ({ applicationId, token }: { applicationId: string; token: string }) => {
  const [message, setMessage] = useState("");
  const [preferredLanguage, setPreferredLanguage] = useState("English");
  const [processingConsent, setProcessingConsent] = useState(false);
  const [publicationConsent, setPublicationConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [workflow, setWorkflow] = useState<PublicAtsProfileWorkflow | null>(null);

  const workflowQuery = useQuery({
    queryKey: ["public-ats-profile-agent", applicationId, token],
    queryFn: async () => {
      const result = await fetchPublicAtsProfileWorkflow(applicationId, token);
      setWorkflow(result.workflow);
      return result;
    },
    enabled: Boolean(applicationId && token),
  });

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!message.trim()) return;
    setBusy(true); setError("");
    try {
      const result = await updatePublicAtsProfileWorkflow(applicationId, {
        token, action: "chat", message: message.trim(), preferredLanguage,
        ...(workflow?.processingConsent ? {} : {
          consentToAiProcessing: processingConsent,
          consentSource: "Applicant checked the profile assistant consent on the application status page.",
        }),
      });
      setWorkflow(result.workflow ?? null);
      setMessage("");
      await workflowQuery.refetch();
    } catch (submitError) { setError(submitError instanceof Error ? submitError.message : "The profile assistant could not respond"); }
    finally { setBusy(false); }
  };

  const runAction = async (payload: Record<string, unknown>) => {
    setBusy(true); setError("");
    try {
      const result = await updatePublicAtsProfileWorkflow(applicationId, { token, ...payload });
      if (result.workflow) setWorkflow(result.workflow);
      await workflowQuery.refetch();
    } catch (actionError) { setError(actionError instanceof Error ? actionError.message : "The request could not be completed"); }
    finally { setBusy(false); }
  };

  const fields = workflow?.profileState ?? {};
  const prettyField = (key: string) => key.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());

  return <Card className="rounded-[2rem] border-slate-200 bg-white p-6">
    <div className="flex items-center gap-3">
      <div className="rounded-2xl bg-violet-100 p-3 text-violet-700"><MessageSquareText className="h-5 w-5" /></div>
      <div><h2 className="text-2xl font-black text-slate-950">Complete or clarify your profile</h2><p className="text-sm text-slate-600">You can continue with staff if you prefer not to use the assistant.</p></div>
    </div>
    {workflowQuery.isLoading && <p className="mt-4 text-sm text-slate-600">Loading profile assistant…</p>}
    {workflowQuery.isError && <p role="alert" className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-900">{workflowQuery.error instanceof Error ? workflowQuery.error.message : "Profile assistant is currently unavailable."}</p>}
    {workflowQuery.data && !workflowQuery.data.agents.collectorConfigured && <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950">The profile assistant is not configured yet. Your submitted application remains available to recruitment staff.</p>}
    {workflow?.reply && <div className="mt-5 rounded-2xl bg-slate-50 p-4"><p className="whitespace-pre-wrap text-sm leading-6 text-slate-800">{workflow.reply}</p></div>}
    {Object.keys(fields).length > 0 && <div className="mt-4 grid gap-2 sm:grid-cols-2">{Object.entries(fields).map(([key, value]) => <div key={key} className="rounded-xl border border-slate-200 p-3"><p className="text-xs font-semibold uppercase text-slate-500">{prettyField(key)}</p><p className="mt-1 text-sm text-slate-900">{Array.isArray(value) ? value.join(", ") || "Not provided" : value == null || value === "" ? "Not provided" : String(value)}</p></div>)}</div>}
    {workflow?.missingFields.length ? <p className="mt-3 text-sm text-slate-600">Still to clarify: {workflow.missingFields.map(prettyField).join(", ")}</p> : null}
    {!workflow?.processingConsent && <label className="mt-5 flex items-start gap-3 rounded-xl border border-violet-200 bg-violet-50 p-3 text-sm text-slate-800"><input type="checkbox" checked={processingConsent} onChange={(event) => setProcessingConsent(event.target.checked)} className="mt-1" /><span>I agree that my application details may be shared with At The Agency’s Make.com profile assistant to help collect or clarify my answers. I can continue with staff instead.</span></label>}
    {workflow?.processingConsent && <p className="mt-4 flex items-start gap-2 text-xs text-slate-500"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />The assistant receives only selected recruitment details and your latest message. It does not receive identity-document contents, medical records, contact details, or your address.</p>}
    {workflow?.readyForConfirmation && !workflow.applicantConfirmed && <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4"><p className="font-bold text-slate-900">Please confirm your details</p><p className="mt-2 text-sm text-slate-700">{workflow.confirmationSummary || "Review the profile information above. Confirm only if it is accurate."}</p><Button className="mt-3 bg-emerald-700 text-white hover:bg-emerald-800" disabled={busy} onClick={() => void runAction({ action: "confirm_profile", confirmed: true })}>I confirm these details</Button></div>}
    {workflow?.applicantConfirmed && <p className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-950">You confirmed these details. Contact agency staff if you need to correct anything.</p>}
    {workflow?.applicantConfirmed && workflow.draftStatus !== "pending_staff_review" && workflow.draftStatus !== "approved" && <div className="mt-4 rounded-xl border border-slate-200 p-4"><label className="flex items-start gap-3 text-sm text-slate-800"><input type="checkbox" checked={publicationConsent} onChange={(event) => setPublicationConsent(event.target.checked)} className="mt-1" /><span>I give permission for the agency to prepare a profile from these confirmed details for potential employers to review. Staff approval is still required before publication.</span></label><Button className="mt-3" disabled={busy || !publicationConsent || !workflowQuery.data?.agents.profileBuilderConfigured} onClick={() => void runAction({ action: "create_public_profile_draft", publicationConsent, publicationConsentSource: "Applicant checked the profile preparation permission on the application status page." })}>{busy ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> : null}Prepare profile draft</Button>{!workflowQuery.data?.agents.profileBuilderConfigured && <p className="mt-2 text-xs text-slate-500">The profile drafting agent is not configured yet.</p>}</div>}
    {workflow?.draftStatus === "approved" && <p className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-950">Agency staff approved the profile draft. Contact the agency if you have questions about publication.</p>}
    {workflow?.draftStatus === "rejected" && <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950">Agency staff requested changes to the profile draft. Please contact the agency for next steps.</p>}
    {workflow?.draftStatus === "pending_staff_review" && <p className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-950">Your profile draft is waiting for staff review. It has not been published.</p>}
    {workflow?.publicationConsent && ["pending_staff_review", "approved", "rejected"].includes(workflow.draftStatus) && <Button variant="outline" className="mt-3" disabled={busy} onClick={() => void runAction({ action: "withdraw_publication_consent" })}>Withdraw profile preparation permission</Button>}
    {workflow?.processingConsent && <Button variant="ghost" size="sm" className="mt-3 text-slate-600" disabled={busy} onClick={() => void runAction({ action: "withdraw_processing_consent" })}>Stop using the profile assistant</Button>}
    {!workflow?.applicantConfirmed && <form onSubmit={(event) => void submit(event)} className="mt-5 space-y-3"><label className="block text-sm font-semibold text-slate-800">Preferred language<select value={preferredLanguage} onChange={(event) => setPreferredLanguage(event.target.value)} className="mt-1.5 h-10 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm"><option>English</option><option>Nepali</option><option>Bahasa Indonesia</option><option>Tagalog</option><option>Hindi</option><option>Burmese</option><option>Sinhala</option><option>Tamil</option></select></label><label className="block text-sm font-semibold text-slate-800">Your message<textarea value={message} onChange={(event) => setMessage(event.target.value)} maxLength={2000} rows={3} placeholder="Ask a question or clarify one of your answers" className="mt-1.5 w-full rounded-xl border border-slate-300 p-3 text-sm" /></label><Button type="submit" disabled={busy || !message.trim() || !workflowQuery.data?.agents.collectorConfigured || (!workflow?.processingConsent && !processingConsent)}>{busy ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> : null}Send message</Button></form>}
    {error && <p role="alert" className="mt-3 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-900">{error}</p>}
  </Card>;
};

type PublicInterview = { id: string; scheduled_at: string; duration_minutes: number; mode: string; meeting_url: string | null; status: string; applicant_confirmed_at: string | null };

const ApplicantInterviewConfirmation = ({ applicationId, token }: { applicationId: string; token: string }) => {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const interviewQuery = useQuery({
    queryKey: ["public-ats-interview", applicationId, token],
    enabled: Boolean(applicationId && token),
    queryFn: async () => {
      const response = await fetch(`/api/ats/public/applications/${encodeURIComponent(applicationId)}/interview?token=${encodeURIComponent(token)}`);
      const data = await response.json().catch(() => ({})) as { interview?: PublicInterview | null; error?: string };
      if (!response.ok) throw new Error(data.error || "Unable to load interview details");
      return data.interview ?? null;
    },
  });
  const interview = interviewQuery.data;
  const confirm = async () => {
    if (!interview) return;
    setBusy(true); setError("");
    try {
      const response = await fetch(`/api/ats/public/applications/${encodeURIComponent(applicationId)}/interview/confirm`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token, interviewId: interview.id }),
      });
      const data = await response.json().catch(() => ({})) as { error?: string };
      if (!response.ok) throw new Error(data.error || "Unable to confirm this interview");
      await interviewQuery.refetch();
    } catch (confirmError) { setError(confirmError instanceof Error ? confirmError.message : "Unable to confirm this interview"); }
    finally { setBusy(false); }
  };

  return <Card className="rounded-[2rem] border-slate-200 bg-white p-6">
    <div className="flex items-center gap-3"><div className="rounded-2xl bg-sky-100 p-3 text-sky-700"><Clock3 className="h-5 w-5" /></div><div><h2 className="text-2xl font-black text-slate-950">Interview</h2><p className="text-sm text-slate-600">Review the scheduled time and confirm that you can attend.</p></div></div>
    {interviewQuery.isLoading && <p className="mt-4 text-sm text-slate-600">Checking for a scheduled interview…</p>}
    {interviewQuery.isError && <p role="alert" className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-900">{interviewQuery.error instanceof Error ? interviewQuery.error.message : "Interview details are unavailable."}</p>}
    {!interviewQuery.isLoading && !interviewQuery.isError && !interview && <p className="mt-4 rounded-xl border border-dashed border-slate-300 p-4 text-sm text-slate-600">No upcoming interview is scheduled yet.</p>}
    {interview && <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4"><p className="font-bold text-slate-950">{formatDate(interview.scheduled_at)}</p><p className="mt-1 text-sm text-slate-700">{interview.mode.replace(/_/g, " ")} · {interview.duration_minutes} minutes · {interview.status.replace(/_/g, " ")}</p>{interview.meeting_url && <a href={interview.meeting_url} target="_blank" rel="noreferrer" className="mt-2 inline-block text-sm font-semibold text-emerald-800 underline">Open meeting link</a>}{interview.applicant_confirmed_at ? <p className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">You confirmed this interview on {formatDate(interview.applicant_confirmed_at)}. Contact agency staff if you need to change the time.</p> : <Button className="mt-3 bg-emerald-700 text-white hover:bg-emerald-800" disabled={busy || Date.parse(interview.scheduled_at) <= Date.now()} onClick={() => void confirm()}>{busy ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> : null}Confirm I can attend</Button>}</div>}
    {error && <p role="alert" className="mt-3 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-900">{error}</p>}
  </Card>;
};

const ApplicantDataRightsPanel = ({ applicationId, token }: { applicationId: string; token: string }) => {
  const [requestType, setRequestType] = useState<PublicAtsDataSubjectRequest["requestType"]>("ACCESS");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const requestsQuery = useQuery({ queryKey: ["public-ats-data-requests", applicationId, token], enabled: Boolean(applicationId && token), queryFn: () => fetchPublicAtsDataSubjectRequests(applicationId, token) });
  const activeRequest = requestsQuery.data?.requests.find((request) => request.requestType === requestType && ["PENDING", "IN_REVIEW"].includes(request.status));
  const submitRequest = async (event: FormEvent) => {
    event.preventDefault(); setBusy(true); setError(""); setNotice("");
    try {
      const result = await submitPublicAtsDataSubjectRequest(applicationId, { token, requestType, note: note.trim() });
      setNote(""); setNotice(result.alreadyOpen ? "You already have an open request of this type." : result.auditLogged === false ? "Your request was saved, but the activity log needs staff review." : "Your request was sent to agency staff for review.");
      await requestsQuery.refetch();
    } catch (submitError) { setError(submitError instanceof Error ? submitError.message : "Could not submit your request"); }
    finally { setBusy(false); }
  };
  return <Card className="rounded-[2rem] border-slate-200 bg-white p-6">
    <div className="flex items-center gap-3"><div className="rounded-2xl bg-slate-100 p-3 text-slate-700"><ShieldCheck className="h-5 w-5" /></div><div><h2 className="text-2xl font-black text-slate-950">Personal data request</h2><p className="text-sm text-slate-600">Ask to access, correct, or request erasure of your application data.</p></div></div>
    <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm leading-6 text-amber-950">Requests are reviewed by agency staff. An erasure request does not automatically delete records; staff must review applicable placement, legal, and record-retention requirements and tell you the outcome.</p>
    {requestsQuery.isError && <p role="alert" className="mt-3 text-sm text-rose-800">{requestsQuery.error instanceof Error ? requestsQuery.error.message : "Could not load request history."}</p>}
    {(requestsQuery.data?.requests ?? []).length > 0 && <div className="mt-4 space-y-2">{requestsQuery.data?.requests.map((request) => <div key={request.id} className="rounded-xl border border-slate-200 bg-slate-50 p-3"><div className="flex flex-wrap items-center justify-between gap-2"><p className="font-semibold text-slate-900">{request.requestType === "ERASURE" ? "Erasure" : request.requestType === "CORRECTION" ? "Correction" : "Access"} request</p><span className="rounded-full bg-white px-2.5 py-1 text-xs font-bold text-slate-700">{request.status.replace(/_/g, " ")}</span></div><p className="mt-1 text-xs text-slate-600">Sent {formatDate(request.submittedAt)}</p>{request.resolutionNote && <p className="mt-2 text-sm text-slate-700">Agency update: {request.resolutionNote}</p>}</div>)}</div>}
    {activeRequest ? <p className="mt-4 text-sm font-medium text-slate-700">Your {requestType.toLowerCase()} request is already open. Choose another request type or wait for the agency update.</p> : <form onSubmit={(event) => void submitRequest(event)} className="mt-4 space-y-3"><label className="block text-sm font-semibold text-slate-800">Request type<select value={requestType} onChange={(event) => setRequestType(event.target.value as PublicAtsDataSubjectRequest["requestType"])} className="mt-1.5 h-10 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm"><option value="ACCESS">Access my data</option><option value="CORRECTION">Correct my data</option><option value="ERASURE">Request erasure</option></select></label><label className="block text-sm font-semibold text-slate-800">Details (optional)<textarea value={note} onChange={(event) => setNote(event.target.value)} maxLength={500} rows={3} placeholder="Describe what you need. Do not include identity-document numbers or medical details." className="mt-1.5 w-full rounded-xl border border-slate-300 p-3 text-sm" /></label><Button type="submit" disabled={busy}>{busy ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> : null}Send request</Button></form>}
    {notice && <p role="status" className="mt-3 text-sm text-emerald-800">{notice}</p>}{error && <p role="alert" className="mt-3 text-sm text-rose-800">{error}</p>}
  </Card>;
};

const PublicMaidApplicationStatusPage = () => {
  const { applicationId = "" } = useParams();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") ?? "";

  const summaryQuery = useQuery({
    queryKey: ["public-ats-application", applicationId, token],
    enabled: Boolean(applicationId && token),
    queryFn: () => fetchPublicAtsApplicationSummary(applicationId, token),
  });

  const summary = summaryQuery.data;

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,_#f8fafc_0%,_#ecfdf5_100%)] px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
        <section className="rounded-[2rem] border border-emerald-200 bg-white p-6 shadow-[0_22px_70px_-32px_rgba(16,185,129,0.35)] sm:p-8">
          <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100">Application Status</Badge>
          <h1 className="mt-4 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
            {summary?.profile?.fullName || "Your application"} is now in the recruitment system.
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">
            Keep this page for tracking. It shows your application reference, uploaded documents, and each status change made by the agency.
          </p>
          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <Card className="border-slate-200 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Reference</p>
              <p className="mt-2 text-xl font-black text-slate-950">{summary?.application.applicationCode || "Loading..."}</p>
            </Card>
            <Card className="border-slate-200 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Current Stage</p>
              <p className="mt-2 text-xl font-black text-slate-950">{summary?.application.status || "Loading..."}</p>
            </Card>
            <Card className="border-slate-200 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Submitted</p>
              <p className="mt-2 text-base font-semibold text-slate-950">{formatDate(summary?.application.appliedAt)}</p>
            </Card>
          </div>
        </section>

        {summaryQuery.isError ? (
          <Card className="rounded-[2rem] border-rose-200 bg-white p-6">
            <h2 className="text-2xl font-black text-slate-950">We could not load this application.</h2>
            <p className="mt-3 text-sm text-slate-600">
              The tracking link may be incomplete or expired. Try the full link from your confirmation page.
            </p>
            <div className="mt-5">
              <Button asChild>
                <Link to="/apply-as-maid">Start a new application</Link>
              </Button>
            </div>
          </Card>
        ) : null}

        {summary ? (
          <div className="grid items-start gap-6 xl:grid-cols-2">
            <div className="space-y-6">
              <ProfileAssistantPanel applicationId={applicationId} token={token} />
              <Card className="rounded-[2rem] border-slate-200 bg-white p-6">
                <div className="flex items-center gap-3">
                  <div className="rounded-2xl bg-emerald-100 p-3 text-emerald-700">
                    <CheckCircle2 className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-black text-slate-950">Submission Summary</h2>
                    <p className="text-sm text-slate-600">{summary.application.aiParseSummary}</p>
                  </div>
                </div>
                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Email</p>
                    <p className="mt-2 text-sm font-medium text-slate-900">{summary.profile?.email || "N/A"}</p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Phone / WhatsApp</p>
                    <p className="mt-2 text-sm font-medium text-slate-900">{summary.profile?.contactNumber || "N/A"}</p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Nationality</p>
                    <p className="mt-2 text-sm font-medium text-slate-900">{summary.profile?.nationality || "N/A"}</p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Available Date</p>
                    <p className="mt-2 text-sm font-medium text-slate-900">{summary.profile?.availableDate || "Not provided"}</p>
                  </div>
                </div>
              </Card>

              <Card className="rounded-[2rem] border-slate-200 bg-white p-6">
                <div className="flex items-center gap-3">
                  <div className="rounded-2xl bg-amber-100 p-3 text-amber-700">
                    <FileCheck2 className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-black text-slate-950">Uploaded Documents</h2>
                    <p className="text-sm text-slate-600">Recruiters will review these files during screening.</p>
                  </div>
                </div>
                <div className="mt-5 grid gap-3">
                  {summary.documents.map((document) => (
                    <div key={document.id} className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="font-semibold text-slate-900">{document.name}</p>
                        <p className="text-xs uppercase tracking-[0.16em] text-slate-500">{document.type}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge variant={document.status === "submitted" ? "default" : "secondary"}>{document.status}</Badge>
                        {document.url ? (
                          <a href={document.url} target="_blank" rel="noreferrer" className="text-sm font-medium text-emerald-700 hover:text-emerald-800">
                            View file
                          </a>
                        ) : null}
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </div>

            <div className="space-y-6">
              <ApplicantInterviewConfirmation applicationId={applicationId} token={token} />
              <ApplicantDataRightsPanel applicationId={applicationId} token={token} />
              <Card className="rounded-[2rem] border-slate-200 bg-white p-6">
                <div className="flex items-center gap-3">
                  <div className="rounded-2xl bg-sky-100 p-3 text-sky-700">
                    <Clock3 className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-black text-slate-950">Timeline</h2>
                    <p className="text-sm text-slate-600">Every stage change appears here.</p>
                  </div>
                </div>
                <div className="mt-5 space-y-4">
                  {summary.history.map((item) => (
                    <div key={item.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <p className="font-semibold text-slate-900">{item.toStage}</p>
                      <p className="mt-1 text-sm text-slate-600">{item.reason}</p>
                      <p className="mt-2 text-xs uppercase tracking-[0.16em] text-slate-500">{formatDate(item.createdAt)}</p>
                    </div>
                  ))}
                </div>
              </Card>

              <Card className="rounded-[2rem] border-slate-200 bg-slate-950 p-6 text-white">
                <div className="flex items-center gap-3">
                  <div className="rounded-2xl bg-white/10 p-3 text-emerald-300">
                    <MessageSquareText className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-black">Notifications Logged</h2>
                    <p className="text-sm text-slate-300">Confirmation activity captured by the system.</p>
                  </div>
                </div>
                <div className="mt-5 space-y-3">
                  {summary.notifications.map((item) => (
                    <div key={item.id} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                      <div className="flex items-center gap-2">
                        {item.channel === "email" ? <Mail className="h-4 w-4 text-emerald-300" /> : <MessageSquareText className="h-4 w-4 text-emerald-300" />}
                        <p className="text-sm font-semibold uppercase tracking-[0.14em] text-emerald-300">{item.channel}</p>
                      </div>
                      <p className="mt-2 text-sm text-slate-100">{item.message}</p>
                      <p className="mt-2 text-xs uppercase tracking-[0.16em] text-slate-400">{formatDate(item.createdAt)}</p>
                    </div>
                  ))}
                </div>
                <div className="mt-6">
                  <Button asChild className="w-full bg-emerald-500 text-white hover:bg-emerald-600">
                    <Link to="/apply-as-maid">Submit another application</Link>
                  </Button>
                </div>
              </Card>

            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default PublicMaidApplicationStatusPage;
