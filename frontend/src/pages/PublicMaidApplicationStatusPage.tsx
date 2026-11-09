import { useQuery } from "@tanstack/react-query";
import { FormEvent, useEffect, useRef, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { fetchPublicAtsApplicationSummary, fetchPublicAtsDataSubjectRequests, fetchPublicAtsProfileWorkflow, submitPublicAtsDataSubjectRequest, updatePublicAtsProfileWorkflow, type PublicAtsDataSubjectRequest, type PublicAtsProfileWorkflow } from "@/lib/ats";
import { Bot, Check, CheckCircle2, Clock3, Copy, FileCheck2, LoaderCircle, Mail, MessageSquareText, Send, ShieldCheck, Star, UserRound } from "lucide-react";

const formatDate = (value?: string) => {
  if (!value) return "N/A";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
};

const ProfileAssistantPanel = ({ applicationId, token }: { applicationId: string; token: string }) => {
  const [message, setMessage] = useState("");
  const [chatMessages, setChatMessages] = useState<Array<{ role: "assistant" | "user"; content: string }>>([]);
  const [preferredLanguage, setPreferredLanguage] = useState("English");
  const [processingConsent, setProcessingConsent] = useState(false);
  const [publicationConsent, setPublicationConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [workflow, setWorkflow] = useState<PublicAtsProfileWorkflow | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

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
    const submittedMessage = message.trim();
    if (!submittedMessage || busy) return;
    setBusy(true); setError(""); setMessage("");
    setChatMessages((current) => [...current, { role: "user", content: submittedMessage }]);
    try {
      const result = await updatePublicAtsProfileWorkflow(applicationId, {
        token, action: "chat", message: submittedMessage, preferredLanguage,
        ...(workflow?.processingConsent ? {} : {
          consentToAiProcessing: processingConsent,
          consentSource: "Applicant checked the profile assistant consent on the application status page.",
        }),
      });
      setWorkflow(result.workflow ?? null);
      const reply = result.workflow?.reply?.trim();
      if (reply) setChatMessages((current) => [...current, { role: "assistant", content: reply }]);
      await workflowQuery.refetch();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "The profile assistant could not respond");
      setChatMessages((current) => [...current, { role: "assistant", content: "I couldn’t process that message just now. Please try sending it again." }]);
      setMessage(submittedMessage);
    }
    finally { setBusy(false); }
  };

  useEffect(() => {
    if (workflow?.reply?.trim()) {
      setChatMessages((current) => current.length ? current : [{ role: "assistant", content: workflow.reply }]);
    }
  }, [workflow?.reply]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [chatMessages, busy]);

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
      <div><p className="text-xs font-bold uppercase tracking-[0.16em] text-violet-700">Optional profile chatbot</p><h2 className="text-2xl font-black text-slate-950">Complete or clarify your profile</h2><p className="text-sm text-slate-600">Tell the assistant about your experience, languages, availability, and other application details. It identifies information you provide, asks about missing or unclear answers, and prepares your details for you to review and confirm. It does not make hiring decisions.</p></div>
    </div>
    {workflowQuery.isLoading && <p className="mt-4 text-sm text-slate-600">Loading profile assistant…</p>}
    {workflowQuery.isError && <p role="alert" className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-900">{workflowQuery.error instanceof Error ? workflowQuery.error.message : "Profile assistant is currently unavailable."}</p>}
    {workflowQuery.data && !workflowQuery.data.agents.collectorConfigured && <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950">The profile assistant is not configured yet. Your submitted application remains available to recruitment staff.</p>}
    <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
      <div className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3">
        <div className="flex items-center gap-2.5">
          <span className="grid h-9 w-9 place-items-center rounded-full bg-violet-100 text-violet-700"><Bot className="h-5 w-5" /></span>
          <div><p className="text-sm font-bold text-slate-900">Application assistant</p><p className="text-xs text-slate-500">Here to help clarify your application</p></div>
        </div>
        <span className={`flex items-center gap-1.5 text-xs font-medium ${workflowQuery.isLoading ? "text-slate-500" : workflowQuery.data?.agents.collectorConfigured ? "text-emerald-700" : "text-amber-700"}`}><span className={`h-2 w-2 rounded-full ${workflowQuery.isLoading ? "bg-slate-400" : workflowQuery.data?.agents.collectorConfigured ? "bg-emerald-500" : "bg-amber-500"}`} />{workflowQuery.isLoading ? "Connecting" : workflowQuery.data?.agents.collectorConfigured ? "Ready" : "Unavailable"}</span>
      </div>
      <div className="max-h-[26rem] min-h-64 space-y-4 overflow-y-auto p-4 sm:p-6" aria-live="polite" aria-label="Chat messages">
        {chatMessages.length === 0 && <div className="flex items-end gap-2.5">
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-violet-100 text-violet-700"><Bot className="h-4 w-4" /></span>
          <div className="max-w-[85%] rounded-2xl rounded-bl-md border border-slate-200 bg-white px-4 py-3 shadow-sm">
            <p className="text-sm leading-6 text-slate-800">Hello! I can help you complete or clarify your application. What would you like to update?</p>
            <p className="mt-2 text-[11px] text-slate-400">Application assistant</p>
          </div>
        </div>}
        {chatMessages.map((chatMessage, index) => <div key={`${index}-${chatMessage.role}`} className={`flex items-end gap-2.5 ${chatMessage.role === "user" ? "justify-end" : ""}`}>
          {chatMessage.role === "assistant" && <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-violet-100 text-violet-700"><Bot className="h-4 w-4" /></span>}
          <div className={`max-w-[85%] rounded-2xl px-4 py-3 shadow-sm ${chatMessage.role === "user" ? "rounded-br-md bg-violet-700 text-white" : "rounded-bl-md border border-slate-200 bg-white text-slate-800"}`}>
            <p className="whitespace-pre-wrap text-sm leading-6">{chatMessage.content}</p>
            <p className={`mt-2 text-[11px] ${chatMessage.role === "user" ? "text-violet-200" : "text-slate-400"}`}>{chatMessage.role === "user" ? "You" : "Application assistant"}</p>
          </div>
          {chatMessage.role === "user" && <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-slate-200 text-slate-600"><UserRound className="h-4 w-4" /></span>}
        </div>)}
        {busy && <div className="flex items-end gap-2.5"><span className="grid h-8 w-8 place-items-center rounded-full bg-violet-100 text-violet-700"><Bot className="h-4 w-4" /></span><div className="flex items-center gap-2 rounded-2xl rounded-bl-md border border-slate-200 bg-white px-4 py-3 text-sm text-slate-500"><LoaderCircle className="h-4 w-4 animate-spin" />Assistant is typing…</div></div>}
        <div ref={chatEndRef} />
      </div>
      {!workflow?.applicantConfirmed && <form onSubmit={(event) => void submit(event)} className="border-t border-slate-200 bg-white p-3 sm:p-4">
        {!workflow?.processingConsent && <label className="mb-3 flex items-start gap-2.5 rounded-xl border border-violet-200 bg-violet-50 p-3 text-xs leading-5 text-slate-700"><input type="checkbox" checked={processingConsent} onChange={(event) => setProcessingConsent(event.target.checked)} className="mt-0.5" /><span>I agree to share selected application details with At The Agency’s Make.com assistant to clarify my answers. I can continue with staff instead.</span></label>}
        <div className="mb-2 flex items-center justify-between gap-3">
          <label htmlFor="profile-chat-language" className="text-xs font-semibold text-slate-600">Reply language</label>
          <select id="profile-chat-language" value={preferredLanguage} onChange={(event) => setPreferredLanguage(event.target.value)} className="h-8 rounded-lg border border-slate-200 bg-white px-2 text-xs text-slate-700"><option>English</option><option>Nepali</option><option>Bahasa Indonesia</option><option>Tagalog</option><option>Hindi</option><option>Burmese</option><option>Sinhala</option><option>Tamil</option></select>
        </div>
        <div className="flex items-end gap-2 rounded-2xl border border-slate-300 bg-white p-2 shadow-sm focus-within:border-violet-400 focus-within:ring-2 focus-within:ring-violet-100">
          <textarea aria-label="Your message" value={message} onChange={(event) => setMessage(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); if (message.trim() && !busy) event.currentTarget.form?.requestSubmit(); } }} maxLength={2000} rows={2} placeholder="Type your message… (Enter to send)" className="max-h-32 min-h-12 flex-1 resize-y border-0 bg-transparent px-2 py-2 text-sm outline-none ring-0 placeholder:text-slate-400 focus:ring-0" />
          <Button type="submit" size="icon" aria-label="Send message" className="mb-0.5 h-10 w-10 shrink-0 rounded-xl bg-violet-700 text-white hover:bg-violet-800" disabled={busy || !message.trim() || !workflowQuery.data?.agents.collectorConfigured || (!workflow?.processingConsent && !processingConsent)}>{busy ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}</Button>
        </div>
        <div className="mt-2 flex items-center justify-between gap-2 text-[11px] text-slate-400"><span>Do not send identity document numbers or medical details.</span><span>{message.length}/2000</span></div>
      </form>}
    </div>
    {workflow?.processingConsent && <p className="mt-3 flex items-start gap-2 text-xs text-slate-500"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />The assistant receives only selected recruitment details and your latest message. It does not receive identity-document contents, medical records, contact details, or your address.</p>}
    {workflow?.applicantConfirmed && <p className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600">Chat is closed because you confirmed your profile. Contact agency staff if you need to make a correction.</p>}
    {workflowQuery.data?.agents.collectorConfigured && chatMessages.length === 0 && !workflow?.applicantConfirmed && <div className="mt-3 flex flex-wrap gap-2">{["What information is still missing?", "I want to update my experience", "Can you help me add my languages?"] .map((suggestion) => <button key={suggestion} type="button" onClick={() => setMessage(suggestion)} className="rounded-full border border-violet-200 bg-white px-3 py-1.5 text-xs font-medium text-violet-800 transition hover:bg-violet-50">{suggestion}</button>)}</div>}
    {Object.keys(fields).length > 0 && <div className="mt-4 grid gap-2 sm:grid-cols-2">{Object.entries(fields).map(([key, value]) => <div key={key} className="rounded-xl border border-slate-200 p-3"><p className="text-xs font-semibold uppercase text-slate-500">{prettyField(key)}</p><p className="mt-1 text-sm text-slate-900">{Array.isArray(value) ? value.join(", ") || "Not provided" : value == null || value === "" ? "Not provided" : String(value)}</p></div>)}</div>}
    {workflow?.missingFields.length ? <p className="mt-3 text-sm text-slate-600">Still to clarify: {workflow.missingFields.map(prettyField).join(", ")}</p> : null}
    {workflow?.readyForConfirmation && !workflow.applicantConfirmed && <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4"><p className="font-bold text-slate-900">Please confirm your details</p><p className="mt-2 text-sm text-slate-700">{workflow.confirmationSummary || "Review the profile information above. Confirm only if it is accurate."}</p><Button className="mt-3 bg-emerald-700 text-white hover:bg-emerald-800" disabled={busy} onClick={() => void runAction({ action: "confirm_profile", confirmed: true })}>I confirm these details</Button></div>}
    {workflow?.applicantConfirmed && <p className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-950">You confirmed these details. Contact agency staff if you need to correct anything.</p>}
    {workflow?.applicantConfirmed && workflow.draftStatus !== "pending_staff_review" && workflow.draftStatus !== "approved" && <div className="mt-4 rounded-xl border border-slate-200 p-4"><label className="flex items-start gap-3 text-sm text-slate-800"><input type="checkbox" checked={publicationConsent} onChange={(event) => setPublicationConsent(event.target.checked)} className="mt-1" /><span>I give permission for the agency to prepare a profile from these confirmed details for potential employers to review. Staff approval is still required before publication.</span></label><Button className="mt-3" disabled={busy || !publicationConsent || !workflowQuery.data?.agents.profileBuilderConfigured} onClick={() => void runAction({ action: "create_public_profile_draft", publicationConsent, publicationConsentSource: "Applicant checked the profile preparation permission on the application status page." })}>{busy ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> : null}Prepare profile draft</Button>{!workflowQuery.data?.agents.profileBuilderConfigured && <p className="mt-2 text-xs text-slate-500">The profile drafting agent is not configured yet.</p>}</div>}
    {workflow?.draftStatus === "approved" && <p className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-950">Agency staff approved the profile draft. Contact the agency if you have questions about publication.</p>}
    {workflow?.draftStatus === "rejected" && <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950">Agency staff requested changes to the profile draft. Please contact the agency for next steps.</p>}
    {workflow?.draftStatus === "pending_staff_review" && <p className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-950">Your profile draft is waiting for staff review. It has not been published.</p>}
    {workflow?.publicationConsent && ["pending_staff_review", "approved", "rejected"].includes(workflow.draftStatus) && <Button variant="outline" className="mt-3" disabled={busy} onClick={() => void runAction({ action: "withdraw_publication_consent" })}>Withdraw profile preparation permission</Button>}
    {workflow?.processingConsent && <Button variant="ghost" size="sm" className="mt-3 text-slate-600" disabled={busy} onClick={() => void runAction({ action: "withdraw_processing_consent" })}>Stop using the profile assistant</Button>}
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
  const [trackingLinkCopied, setTrackingLinkCopied] = useState(false);
  const token = searchParams.get("token") ?? "";

  const summaryQuery = useQuery({
    queryKey: ["public-ats-application", applicationId, token],
    enabled: Boolean(applicationId && token),
    queryFn: () => fetchPublicAtsApplicationSummary(applicationId, token),
  });

  const summary = summaryQuery.data;
  const copyTrackingLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setTrackingLinkCopied(true);
      window.setTimeout(() => setTrackingLinkCopied(false), 2500);
    } catch {
      window.prompt("Copy and save your private application tracking link:", window.location.href);
    }
  };

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,_#f8fafc_0%,_#ecfdf5_100%)] px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-screen-2xl flex-col gap-6">
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
          {summary && <div className="mt-5 flex flex-col gap-3 rounded-2xl border border-emerald-100 bg-emerald-50/70 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-bold text-emerald-950">Save your private tracking link</p>
              <p className="mt-1 text-sm text-emerald-900">Use it to return to your application, chatbot, documents, and interview updates. Anyone with this link can view your application.</p>
            </div>
            <Button type="button" variant="outline" className="shrink-0 border-emerald-300 bg-white text-emerald-900 hover:bg-emerald-100" onClick={() => void copyTrackingLink()}>
              {trackingLinkCopied ? <Check className="mr-2 h-4 w-4" /> : <Copy className="mr-2 h-4 w-4" />}
              {trackingLinkCopied ? "Link copied" : "Copy private link"}
            </Button>
          </div>}
        </section>

        {summary && <TelegramApplicantInvite />}

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

        {summary && <section aria-label="Applicant profile chatbot">
          <ProfileAssistantPanel applicationId={applicationId} token={token} />
        </section>}

        {summary ? (
          <div className="grid items-start gap-5 xl:grid-cols-12">
            <div className="space-y-6 xl:col-span-7">
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
                <div className="mt-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Formal FDW experience</p>
                  <p className="mt-2 text-sm font-medium text-slate-900">{summary.profile?.yearsOfExperience ?? 0} years</p>
                  <p className="mt-4 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Care and skill ratings <span className="font-normal normal-case tracking-normal">(stars out of 5)</span></p>
                  <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    {([
                      ["Childcare", summary.profile?.skillRatings?.childcare],
                      ["Newborn care", summary.profile?.skillRatings?.newbornCare],
                      ["Elderly care", summary.profile?.skillRatings?.elderlyCare],
                      ["Disability care", summary.profile?.skillRatings?.disabledCare],
                      ["Housekeeping", summary.profile?.skillRatings?.housekeeping],
                      ["Pet care", summary.profile?.skillRatings?.petCare],
                    ] as const).map(([label, rawRating]) => {
                      const rating = Math.max(0, Math.min(5, Math.round(Number(rawRating) || 0)));
                      return <div key={label} aria-label={`${label}: ${rating} out of 5 stars`} className="rounded-xl border border-slate-200 bg-white px-3 py-2.5">
                        <div className="flex items-center justify-between gap-2"><span className="text-sm font-semibold text-slate-800">{label}</span><span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-bold tabular-nums text-slate-800">{rating}/5</span></div>
                        <div className="mt-2 flex items-center gap-1" aria-hidden="true">{Array.from({ length: 5 }, (_, index) => <Star key={index} className={`h-4 w-4 ${index < rating ? "fill-amber-400 text-amber-400" : "text-slate-300"}`} />)}</div>
                      </div>;
                    })}
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

              <ApplicantInterviewConfirmation applicationId={applicationId} token={token} />
              <ApplicantDataRightsPanel applicationId={applicationId} token={token} />
            </div>

            <div className="space-y-6 xl:col-span-5">
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

const TelegramApplicantInvite = () => {
  const [link, setLink] = useState("");
  useEffect(() => { void fetch("/api/telegram/invitation").then((response) => response.json()).then((data: { invitationLink?: string }) => setLink(data.invitationLink || "")).catch(() => undefined); }, []);
  if (!link) return null;
  return <Card className="rounded-2xl border-sky-200 bg-sky-50 p-5"><h2 className="font-bold text-slate-950">Get application updates on Telegram</h2><p className="mt-1 text-sm text-slate-700">You can choose to start our Telegram bot for recruitment updates and applicant support. Starting the bot is voluntary.</p><Button asChild className="mt-3 bg-sky-600 text-white hover:bg-sky-700"><a href={link} target="_blank" rel="noreferrer">Open Telegram bot</a></Button></Card>;
};

export default PublicMaidApplicationStatusPage;
