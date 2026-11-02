import { useCallback, useEffect, useMemo, useState } from "react";
import { Activity, CheckCircle2, CircleAlert, ExternalLink, RefreshCw, Workflow } from "lucide-react";
import { Link } from "react-router-dom";
import { adminPath } from "@/lib/routes";
import { getAgencyAdminAuthHeaders } from "@/lib/agencyAdminAuth";
import { readSafeJson } from "@/lib/safeJson";
import "./home-dashboard.css";

type WorkflowStatus = {
  id: string;
  name: string;
  configured: boolean;
  configurationVariable?: string;
  scenarioStatus?: string;
  scenarioStatusEvidence?: string;
  mode: string;
  purpose?: string;
  trigger?: string;
};
type MakeDelivery = { event_id: string; hook_key: string; status: "PENDING" | "SENDING" | "DELIVERED" | "FAILED"; attempts: number; max_attempts: number; next_attempt_at: string; last_error: string; delivered_at: string | null; created_at: string };

const requestInit = (): RequestInit => ({ headers: { ...getAgencyAdminAuthHeaders() }, cache: "no-store" });

export default function TechnicalSettingsPage() {
  const [workflows, setWorkflows] = useState<WorkflowStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [unavailable, setUnavailable] = useState(false);
  const [filter, setFilter] = useState<"all" | "connected" | "setup">("all");
  const [deliveries, setDeliveries] = useState<MakeDelivery[]>([]);
  const [deliveriesUnavailable, setDeliveriesUnavailable] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    const [workflowResult, deliveryResult] = await Promise.allSettled([
      fetch("/api/dashboard/automations", requestInit()).then(async (response) => {
        const result = await readSafeJson<{ workflows?: WorkflowStatus[]; error?: string }>(response);
        if (!response.ok) throw new Error(result.error || "Could not load workflow status");
        return result.workflows ?? [];
      }),
      fetch("/api/operations-board/make-deliveries", requestInit()).then(async (response) => {
        const result = await readSafeJson<{ deliveries?: MakeDelivery[]; error?: string }>(response);
        if (!response.ok) throw new Error(result.error || "Could not load delivery history");
        return result.deliveries ?? [];
      }),
    ]);
    if (workflowResult.status === "fulfilled") { setWorkflows(workflowResult.value); setUnavailable(false); }
    else setUnavailable(true);
    if (deliveryResult.status === "fulfilled") { setDeliveries(deliveryResult.value); setDeliveriesUnavailable(false); }
    else setDeliveriesUnavailable(true);
    setLoading(false);
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);

  const dashboardWorkflows = useMemo(() => workflows.filter((item) => !["fdw-application-chat", "hr-email"].includes(item.id)), [workflows]);
  const visible = useMemo(() => dashboardWorkflows.filter((item) => filter === "all" || (filter === "connected" ? item.configured : !item.configured)), [dashboardWorkflows, filter]);
  const connectedCount = dashboardWorkflows.filter((item) => item.configured).length;

  return <main className="admin-dashboard technical-settings">
    <header className="dash-head">
      <div><p className="dash-kicker">Technical configuration</p><h1>Technical settings</h1><p>Check website-to-Make webhook configuration and the applicant agent connections.</p></div>
      <button type="button" className="dash-refresh" onClick={() => void refresh()} disabled={loading}><RefreshCw size={15} className={loading ? "animate-spin" : ""} />{loading ? "Checking" : "Check connections"}</button>
    </header>

    <section className="dash-automation" aria-labelledby="workflow-monitor-title">
      <div className="dash-automation-head"><div><p className="dash-kicker"><Activity size={14} /> Automation health</p><h2 id="workflow-monitor-title">Workflow monitor</h2><p>Website webhook configuration for all tracked Make workflows.</p></div><Workflow size={24} aria-hidden="true" /></div>
      {!unavailable && dashboardWorkflows.length > 0 && <div className="dash-automation-filters" role="group" aria-label="Filter workflows">{([ ["all", `All ${dashboardWorkflows.length}`], ["connected", `Connected ${connectedCount}`], ["setup", `Needs setup ${dashboardWorkflows.length - connectedCount}`] ] as const).map(([key, label]) => <button type="button" key={key} onClick={() => setFilter(key)} aria-pressed={filter === key} className={filter === key ? "is-selected" : ""}>{label}</button>)}</div>}
      {unavailable ? <p role="alert" className="dash-automation-empty">Workflow status is temporarily unavailable. Check the Worker and try again.</p> : <div className="dash-automation-list">{visible.map((workflow) => <article className="dash-automation-item" key={workflow.id}><span className={`dash-automation-indicator ${workflow.configured ? "is-ready" : "is-off"}`} aria-hidden="true" /><div className="dash-automation-name">{workflow.name}<small>{workflow.purpose || "Workflow connection"}</small>{workflow.trigger && <small className="dash-automation-trigger"><strong>Runs when:</strong> {workflow.trigger}</small>}</div><span className={`dash-automation-status ${workflow.configured ? "is-ready" : "is-off"}`}>{workflow.configured ? <><CheckCircle2 size={13} /> Connected</> : <><CircleAlert size={13} /> Needs setup</>}</span></article>)}{!loading && visible.length === 0 && <p className="dash-automation-empty">No workflows match this filter.</p>}</div>}
      <p className="dash-monitor-footnote">Webhook configuration is not proof of a live Make connection. For setup help, see the <Link to={adminPath("/chatbot-config")} className="font-semibold underline">Chatbot Config</Link> page or inspect Make scenario run history.</p>
    </section>

    <section className="dash-automation" aria-labelledby="make-delivery-history-title">
      <div className="dash-automation-head"><div><p className="dash-kicker"><Activity size={14} /> Delivery history</p><h2 id="make-delivery-history-title">Recent Make events</h2><p>Agency scoped status for queued recruitment, campaign, and operations events. Request payloads and webhook URLs are hidden.</p></div><span className="dash-automation-status is-ready">Latest {deliveries.length}</span></div>
      {deliveriesUnavailable ? <p role="status" className="dash-automation-empty">Delivery history is unavailable. Apply the Make outbox migration and refresh.</p> : deliveries.length === 0 ? <p className="dash-automation-empty">No recent durable Make event deliveries for this agency.</p> : <div className="dash-automation-list">{deliveries.slice(0, 20).map((delivery) => <article className="dash-automation-item" key={delivery.event_id}><span className={`dash-automation-indicator ${delivery.status === "DELIVERED" ? "is-ready" : delivery.status === "FAILED" ? "is-off" : "is-pending"}`} aria-hidden="true" /><div className="dash-automation-name">{delivery.event_id}<small>{delivery.hook_key.replace(/_/g, " ")} · {new Date(delivery.created_at).toLocaleString()}</small><small>{delivery.status} · attempts {delivery.attempts}/{delivery.max_attempts}{delivery.status === "PENDING" ? ` · retry after ${new Date(delivery.next_attempt_at).toLocaleString()}` : ""}{delivery.last_error ? ` · ${delivery.last_error}` : ""}</small></div><span className={`dash-automation-status ${delivery.status === "DELIVERED" ? "is-ready" : delivery.status === "FAILED" ? "is-off" : "is-pending"}`}>{delivery.status}</span></article>)}</div>}
      <p className="dash-monitor-footnote">Delivery events expire after 30 days. This history covers the durable event hooks only; synchronous chat and AI agent calls are not queued here.</p>
    </section>

    <p className="dash-monitor-footnote technical-note"><ExternalLink size={14} /> Webhook URLs and secret values are never displayed on this page.</p>
  </main>;
}
