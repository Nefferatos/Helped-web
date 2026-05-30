import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { fetchPublicAtsApplicationSummary } from "@/lib/ats";
import { callAiAgent } from "@/lib/aiAgents";
import { Bot, CheckCircle2, Clock3, FileCheck2, Mail, MessageSquareText } from "lucide-react";

const formatDate = (value?: string) => {
  if (!value) return "N/A";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
};

const PublicMaidApplicationStatusPage = () => {
  const { applicationId = "" } = useParams();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const [screeningReply, setScreeningReply] = useState("");
  const [screeningLoading, setScreeningLoading] = useState(false);

  const summaryQuery = useQuery({
    queryKey: ["public-ats-application", applicationId, token],
    enabled: Boolean(applicationId && token),
    queryFn: () => fetchPublicAtsApplicationSummary(applicationId, token),
  });

  const summary = summaryQuery.data;

  const runScreeningAssistant = async () => {
    setScreeningLoading(true);
    try {
      const result = await callAiAgent("/api/ai/screen-applicant-public", {
        applicationId,
        applicantAccessToken: token,
        message: "Review my application readiness and explain missing documents or incomplete fields.",
      });
      setScreeningReply(result.response || "");
    } catch (error) {
      setScreeningReply(error instanceof Error ? error.message : "Screening assistant is unavailable right now.");
    } finally {
      setScreeningLoading(false);
    }
  };

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
          <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
            <div className="space-y-6">
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

              <Card className="rounded-[2rem] border-emerald-200 bg-white p-6">
                <div className="flex items-center gap-3">
                  <div className="rounded-2xl bg-emerald-100 p-3 text-emerald-700">
                    <Bot className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-black text-slate-950">Screening Assistant</h2>
                    <p className="text-sm text-slate-600">Check readiness using only this application link.</p>
                  </div>
                </div>
                <div className="mt-5">
                  <Button
                    className="w-full bg-emerald-600 text-white hover:bg-emerald-700"
                    onClick={() => void runScreeningAssistant()}
                    disabled={screeningLoading}
                  >
                    {screeningLoading ? "Reviewing..." : "Review My Application"}
                  </Button>
                </div>
                {screeningReply ? (
                  <div className="mt-4 max-h-80 overflow-auto whitespace-pre-wrap rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-700">
                    {screeningReply}
                  </div>
                ) : null}
              </Card>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default PublicMaidApplicationStatusPage;
