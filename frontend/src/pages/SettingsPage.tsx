import { useCallback, useEffect, useMemo, useState } from "react";
import { Activity, Bot, CheckCircle2, CircleAlert, Database, RefreshCw, ShieldCheck, Volume2, Workflow } from "lucide-react";
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
  blueprintUrl?: string;
  setupInstructions?: string;
  mode: string;
  purpose?: string;
  trigger?: string;
};

type AiSettings = {
  commandCenter: { ready: boolean; primaryProvider: string; fallbackProvider: string | null; model: string | null; note: string };
  agencyData: { enabled: boolean; scope: string; approval: string };
  approvedKnowledge: { retrievalConfigured: boolean; availableFor: string; note: string };
  conversationMemory: { storage: string; syncedAcrossDevices: boolean; recentHistorySentWithMessage: boolean };
  voice: { fishAudioConfigured: boolean; transcriptionConfigured: boolean };
};

export default function SettingsPage() {
  const [workflows, setWorkflows] = useState<WorkflowStatus[]>([]);
  const [aiSettings, setAiSettings] = useState<AiSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [unavailable, setUnavailable] = useState(false);
  const [filter, setFilter] = useState<"all" | "connected" | "setup">("all");

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/dashboard/automations", {
        headers: { ...getAgencyAdminAuthHeaders() },
        cache: "no-store",
      });
      const result = await readSafeJson<{ workflows?: WorkflowStatus[]; aiSettings?: AiSettings; error?: string }>(response);
      if (!response.ok) throw new Error(result.error || "Could not load settings");
      setWorkflows(result.workflows ?? []);
      setAiSettings(result.aiSettings ?? null);
      setUnavailable(false);
    } catch {
      setUnavailable(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);

  const dashboardWorkflows = useMemo(() => workflows.filter((item) => !["fdw-application-chat", "hr-email"].includes(item.id)), [workflows]);
  const visible = useMemo(() => dashboardWorkflows.filter((item) => filter === "all" || (filter === "connected" ? item.configured : !item.configured)), [dashboardWorkflows, filter]);
  const configuredCount = dashboardWorkflows.filter((item) => item.configured).length;

  return <main className="admin-dashboard technical-settings">
    <header className="dash-head">
      <div><p className="dash-kicker">Workspace configuration</p><h1>Settings</h1><p>Review AI services, voice, knowledge search, and website-to-Make connections.</p></div>
      <button type="button" className="dash-refresh" onClick={() => void refresh()} disabled={loading}><RefreshCw size={15} className={loading ? "animate-spin" : ""} />{loading ? "Checking" : "Refresh settings"}</button>
    </header>

    <section className="dash-automation" aria-labelledby="ai-settings-title">
      <div className="dash-automation-head"><div><p className="dash-kicker"><Bot size={14} /> Assistant configuration</p><h2 id="ai-settings-title">AI settings</h2><p>Sanitized service status only. API keys, tokens, and webhook URLs are never shown.</p></div><Bot size={24} aria-hidden="true" /></div>
      {!aiSettings ? <p role={unavailable ? "alert" : "status"} className="dash-automation-empty">{unavailable ? "AI settings are temporarily unavailable. Refresh to try again." : loading ? "Loading AI settings…" : "AI status details are unavailable from this Worker version. Deploy the latest Worker, then refresh."}</p> : <div className="grid gap-3 pt-4 md:grid-cols-2 xl:grid-cols-3">
        <article className="rounded-2xl border border-slate-200 bg-white p-4">
          <p className="flex items-center gap-2 text-sm font-bold text-slate-900"><Bot size={17} className="text-violet-700" /> AI Command Center</p>
          <p className="mt-3 text-xs leading-5 text-slate-600">Response provider: <strong className="text-slate-900">{aiSettings.commandCenter.primaryProvider}</strong></p>
          {aiSettings.commandCenter.fallbackProvider && <p className="mt-1 text-xs leading-5 text-slate-600">Fallback: <strong className="text-slate-900">{aiSettings.commandCenter.fallbackProvider}</strong></p>}
          {aiSettings.commandCenter.model && <p className="mt-1 break-all text-xs leading-5 text-slate-600">Model: <code className="text-slate-800">{aiSettings.commandCenter.model}</code></p>}
          <p className={`mt-3 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${aiSettings.commandCenter.ready ? "bg-emerald-50 text-emerald-800" : "bg-amber-50 text-amber-900"}`}>{aiSettings.commandCenter.ready ? <CheckCircle2 size={13} /> : <CircleAlert size={13} />}{aiSettings.commandCenter.ready ? "Provider configured" : "Provider setup needed"}</p>
          <p className="mt-2 text-[11px] leading-5 text-slate-500">{aiSettings.commandCenter.note}</p>
          <Link to={adminPath("/ai-command-center")} className="mt-3 inline-block text-xs font-semibold text-violet-700 underline">Open AI Command Center</Link>
        </article>

        <article className="rounded-2xl border border-slate-200 bg-white p-4">
          <p className="flex items-center gap-2 text-sm font-bold text-slate-900"><Database size={17} className="text-sky-700" /> Agency data and knowledge</p>
          <p className="mt-3 text-xs leading-5 text-slate-600"><strong className="text-slate-900">Agency records:</strong> {aiSettings.agencyData.enabled ? aiSettings.agencyData.scope : "Unavailable"}</p>
          <p className="mt-2 text-xs leading-5 text-slate-600"><strong className="text-slate-900">Approved knowledge search:</strong> {aiSettings.approvedKnowledge.retrievalConfigured ? "Supabase and Workers AI are configured" : "Needs Supabase knowledge and Workers AI setup"}</p>
          <p className="mt-1 text-[11px] leading-5 text-slate-500">{aiSettings.approvedKnowledge.note}</p>
          <Link to={adminPath("/operations-center?tab=knowledge")} className="mt-3 inline-block text-xs font-semibold text-violet-700 underline">Open Knowledge Library</Link>
        </article>

        <article className="rounded-2xl border border-slate-200 bg-white p-4">
          <p className="flex items-center gap-2 text-sm font-bold text-slate-900"><Volume2 size={17} className="text-fuchsia-700" /> Voice and chat memory</p>
          <p className="mt-3 text-xs leading-5 text-slate-600"><strong className="text-slate-900">Fish Audio voice:</strong> {aiSettings.voice.fishAudioConfigured ? "Configured" : "Not configured"}</p>
          <p className="mt-1 text-xs leading-5 text-slate-600"><strong className="text-slate-900">Voice transcription:</strong> {aiSettings.voice.transcriptionConfigured ? "Configured" : "Not configured"}</p>
          <p className="mt-2 text-xs leading-5 text-slate-600"><strong className="text-slate-900">Conversation memory:</strong> {aiSettings.conversationMemory.storage}</p>
          <p className="mt-1 text-[11px] leading-5 text-slate-500">{aiSettings.conversationMemory.syncedAcrossDevices ? "Chat history syncs with your account." : "Chat history is not synced across devices."} Recent history is sent with each message: {aiSettings.conversationMemory.recentHistorySentWithMessage ? "yes" : "no"}.</p>
        </article>

        <article className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4 md:col-span-2 xl:col-span-3">
          <p className="flex items-center gap-2 text-sm font-bold text-emerald-950"><ShieldCheck size={17} /> Human approval and access</p>
          <p className="mt-2 text-xs leading-5 text-emerald-950">{aiSettings.agencyData.approval}</p>
          <p className="mt-1 text-xs leading-5 text-emerald-900">{aiSettings.agencyData.scope}</p>
        </article>
      </div>}
    </section>

    <section className="dash-automation" aria-labelledby="workflow-monitor-title">
      <div className="dash-automation-head"><div><p className="dash-kicker"><Activity size={14} /> Make.com connections</p><h2 id="workflow-monitor-title">Scenario monitor</h2><p>Shows whether the website has a webhook configured for each workflow. Scenario activation and run status are reported separately when evidence is available.</p></div><Workflow size={24} aria-hidden="true" /></div>
      {!unavailable && dashboardWorkflows.length > 0 && <div className="dash-automation-filters" role="group" aria-label="Filter Make workflows">{([["all", `All ${dashboardWorkflows.length}`], ["connected", `Webhook configured ${configuredCount}`], ["setup", `Needs setup ${dashboardWorkflows.length - configuredCount}`]] as const).map(([key, label]) => <button type="button" key={key} onClick={() => setFilter(key)} aria-pressed={filter === key} className={filter === key ? "is-selected" : ""}>{label}</button>)}</div>}
      {unavailable ? <p role="alert" className="dash-automation-empty">Make connection status is temporarily unavailable. Check the Worker and refresh.</p> : <div className="dash-automation-list">{visible.map((workflow) => {
        const screenshotOnly = workflow.scenarioStatus === "on_in_user_screenshot";
        return <article className="dash-automation-item" key={workflow.id}>
          <span className={`dash-automation-indicator ${workflow.configured ? "is-ready" : "is-off"}`} aria-hidden="true" />
          <div className="dash-automation-name">{workflow.name}<small>{workflow.purpose || "Workflow connection"}</small>{workflow.trigger && <small className="dash-automation-trigger"><strong>Runs when:</strong> {workflow.trigger}</small>}{workflow.setupInstructions && <small>{workflow.setupInstructions}</small>}{workflow.blueprintUrl && <small><a href={workflow.blueprintUrl} download className="font-semibold underline">Download Make blueprint</a></small>}
            <small><strong>Website hook:</strong> {workflow.configured ? "Configured" : "Missing"}</small>
            <small><strong>Make scenario:</strong> {screenshotOnly ? `Shown On in a supplied screenshot; not live-verified. ${workflow.scenarioStatusEvidence || ""}` : "Current activation and run status are not connected to this dashboard."}</small>
          </div>
          <span className={`dash-automation-status ${workflow.configured ? "is-ready" : "is-off"}`}>{workflow.configured ? <><CheckCircle2 size={13} /> Webhook ready</> : <><CircleAlert size={13} /> Needs setup</>}</span>
        </article>;
      })}{!loading && visible.length === 0 && <p className="dash-automation-empty">No workflows match this filter.</p>}</div>}
      <p className="dash-monitor-footnote">A configured webhook does not prove a scenario is active or that a message was delivered. Open Make.com to verify the scenario and its run history. Secret values and webhook URLs are not displayed here.</p>
    </section>
  </main>;
}
