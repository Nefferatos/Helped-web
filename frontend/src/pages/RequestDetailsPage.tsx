import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, BriefcaseBusiness, CalendarDays, CheckCircle2, Clock, Loader2, Mail, Phone, Sparkles, UserRound, XCircle } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { toast } from "@/components/ui/sonner";
import { fetchRequest, requestStateMessage, requestStatusMeta, type RequestStatus, updateRequestStatus } from "@/lib/requests";
import { cn } from "@/lib/utils";

const formatDate = (value: string) =>
  new Intl.DateTimeFormat("en-SG", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(value));

const labelFor = (key: string) =>
  key.replace(/([a-z])([A-Z])/g, "$1 $2").replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim().replace(/^./, (letter) => letter.toUpperCase());

const visibleDetails = (details: Record<string, unknown>) =>
  Object.entries(details).filter(([key, value]) =>
    key !== "agencyViewedAt" && value !== null && value !== undefined && String(value).trim() !== "",
  );

const statusIcons = { pending: Clock, interested: Sparkles, direct_hire: CheckCircle2, rejected: XCircle } as const;

const RequestDetailsPage = () => {
  const { requestId = "" } = useParams();
  const queryClient = useQueryClient();
  const requestQuery = useQuery({
    queryKey: ["agency-request", requestId],
    queryFn: () => fetchRequest(requestId),
    enabled: Boolean(requestId),
  });
  const statusMutation = useMutation({
    mutationFn: (status: RequestStatus) => updateRequestStatus(requestId, status),
    onSuccess: (request) => {
      queryClient.setQueryData(["agency-request", requestId], request);
      queryClient.invalidateQueries({ queryKey: ["agency-requests"] });
      toast.success("Request status updated");
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Could not update request"),
  });

  if (requestQuery.isLoading) {
    return <div className="flex min-h-[50vh] items-center justify-center text-slate-500"><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading request…</div>;
  }
  if (requestQuery.isError || !requestQuery.data) {
    return <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-rose-800">This request could not be found or is no longer available.</div>;
  }

  const request = requestQuery.data;
  const meta = requestStatusMeta[request.status];
  const StatusIcon = statusIcons[request.status];

  return (
    <div className="request-details-root mx-auto max-w-7xl space-y-8 pb-10 text-base text-black">
      <style>{`
        .request-details-root p,
        .request-details-root a,
        .request-details-root button,
        .request-details-root span {
          color: #000 !important;
          font-size: max(16px, 1em);
        }
      `}</style>
      <Link to="/agencyadmin/requests" className="inline-flex items-center gap-2 text-sm font-bold text-slate-600 transition hover:text-slate-950">
        <ArrowLeft className="h-4 w-4" /> Back to requests
      </Link>

      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 bg-gradient-to-br from-slate-50 via-white to-indigo-50 px-8 py-9 sm:px-10">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex min-w-0 gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-lg shadow-indigo-200"><BriefcaseBusiness className="h-5 w-5" /></div>
              <div className="min-w-0">
                <p className="font-black uppercase tracking-[0.16em]">Client request</p>
                <h1 className="mt-2 text-4xl font-black tracking-tight text-black">{request.client?.name || "Client request"}</h1>
                <p className="mt-2 font-medium">Received {formatDate(request.createdAt)}</p>
              </div>
            </div>
            <span className={cn("inline-flex w-fit items-center gap-2 rounded-full border px-4 py-2 font-bold", meta.badgeClassName)}>
              <span className={cn("h-2 w-2 rounded-full", meta.dotClassName)} /> {meta.label}
            </span>
          </div>
        </div>

        <div className="grid gap-8 p-8 sm:p-10 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="space-y-8">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6">
              <p className="font-black uppercase tracking-[0.14em]">What they need</p>
              <p className="mt-3 text-xl font-bold leading-relaxed">{request.summary}</p>
              {request.budget && <p className="mt-4 font-semibold">Budget: <span>{request.budget}</span></p>}
            </div>

            <div>
              <h2 className="text-2xl font-black text-black">Request requirements</h2>
              {visibleDetails(request.details).length === 0 ? (
                <p className="mt-3">No additional requirements were provided.</p>
              ) : (
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  {visibleDetails(request.details).map(([key, value]) => (
                    <div key={key} className="rounded-xl border border-slate-200 bg-white p-5">
                      <p className="font-black uppercase tracking-widest">{labelFor(key)}</p>
                      <p className="mt-2 text-lg font-semibold leading-relaxed">{String(value)}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="hidden">
              <h2 className="text-base font-black text-slate-950">Matched maids</h2>
              {request.maids.length === 0 ? <p className="mt-3 text-sm text-slate-500">No maids have been matched to this request yet.</p> : (
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  {request.maids.map((maid) => (
                    <div key={maid.referenceCode} className="flex items-center gap-3 rounded-xl border border-violet-100 bg-violet-50 p-3.5">
                      <UserRound className="h-5 w-5 text-violet-600" />
                      <div className="min-w-0"><p className="truncate text-sm font-bold text-slate-950">{maid.fullName}</p><p className="text-xs font-medium text-violet-800">{maid.referenceCode} · {maid.nationality}</p></div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <aside className="space-y-5">
            <div className="rounded-2xl border border-slate-200 bg-white p-6">
              <p className="font-black uppercase tracking-[0.14em]">Client contact</p>
              <div className="mt-5 space-y-4 font-semibold">
                <p className="flex items-center gap-2"><Mail className="h-4 w-4 text-slate-400" /> {request.client?.email || "No email"}</p>
                {request.client?.phone && <p className="flex items-center gap-2"><Phone className="h-4 w-4 text-slate-400" /> {request.client.phone}</p>}
                <p className="flex items-center gap-2"><CalendarDays className="h-4 w-4 text-slate-400" /> {request.agencyName}</p>
              </div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-6">
              <p className="font-black uppercase tracking-[0.14em]">Update status</p>
              <p className="mt-3 leading-relaxed">{requestStateMessage(request.status)}</p>
              <div className="mt-5 grid gap-3">
                {(Object.entries(requestStatusMeta) as Array<[RequestStatus, typeof meta]>).map(([status, item]) => {
                  const Icon = statusIcons[status];
                  return <button key={status} type="button" disabled={status === request.status || statusMutation.isPending} onClick={() => statusMutation.mutate(status)} className={cn("flex items-center gap-2 rounded-xl border px-4 py-3 text-left font-bold transition disabled:cursor-default disabled:opacity-55", status === request.status ? item.badgeClassName : "border-slate-200 hover:border-slate-300 hover:bg-slate-50")}><Icon className="h-5 w-5" />{item.label}</button>;
                })}
              </div>
            </div>
          </aside>
        </div>
      </section>
    </div>
  );
};

export default RequestDetailsPage;
