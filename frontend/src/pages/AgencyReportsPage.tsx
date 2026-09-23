import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CheckCircle2, ExternalLink, Loader2, FileSpreadsheet, AlertTriangle, KeyRound, LayoutGrid, Circle } from "lucide-react";
import { toast } from "@/components/ui/sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { clearAgencyAdminAuth, getStoredAgencyAdmin } from "@/lib/agencyAdminAuth";
import { adminPath } from "@/lib/routes";
import {
  fetchAgencyReportSections,
  fetchAgencyReportStatus,
  isAgencyReportUnauthorized,
  runAgencyGoogleSheetReport,
  saveAgencyReportConfig,
  testAgencyGoogleSheetConnection,
  type AgencyReportRunResult,
  type AgencyReportSection,
  type AgencyReportStatus,
} from "@/lib/agencyReports";

/**
 * Agency Reports — Google Sheets export.
 *
 * Each data category in the portal (Maids, Enquiries, Requests, Contracts,
 * Applicants, Chat Messages, ...) is written to its OWN Google Sheet tab, so
 * categories are never blended into one shared sheet.
 *
 * Layout note: this is presented as a 3-step setup flow (Connect → Choose
 * data → Send) since that's the actual sequence an agency admin follows the
 * first time, and the primary actions live in a sticky bar so they're
 * reachable no matter how many categories are on screen. All data-fetching,
 * handlers, and API calls are unchanged from before.
 */

const SECTION_ORDER_HINTS = [
  "Agency Profile",
  "Maids",
  "Leads",
  "Requests",
  "Messages",
  "Contracts",
  "Applicants",
  "Integrations",
];

const groupSections = (sections: AgencyReportSection[]) => {
  const byGroup = new Map<string, AgencyReportSection[]>();
  for (const section of sections) {
    const list = byGroup.get(section.group) ?? [];
    list.push(section);
    byGroup.set(section.group, list);
  }

  // Keep the backend's declared order, but pull well-known groups to the front
  // so the page reads in the same order as the sidebar.
  return Array.from(byGroup.entries()).sort((left, right) => {
    const leftHint = SECTION_ORDER_HINTS.indexOf(left[0]);
    const rightHint = SECTION_ORDER_HINTS.indexOf(right[0]);
    if (leftHint === -1 && rightHint === -1) return 0;
    if (leftHint === -1) return 1;
    if (rightHint === -1) return -1;
    return leftHint - rightHint;
  });
};

const formatTimestamp = (value: string) => {
  if (!value) return "Never";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString();
};

// Same accent colors the page already used: emerald for good/connected,
// amber for needs-attention, slate for neutral text and chrome.
const primaryButton = 'rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50'
const secondaryButton = 'rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50'

// Every subject on the page is one of these — same soft shape, same accent, no clutter.
function Card({
  icon: Icon,
  title,
  description,
  right,
  children,
}: {
  icon: React.ElementType
  title: string
  description: string
  right?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm sm:p-7">
      <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
            <Icon className="h-5 w-5" />
          </span>
          <div>
            <h2 className="text-base font-semibold text-slate-900">{title}</h2>
            <p className="text-sm text-slate-500">{description}</p>
          </div>
        </div>
        {right}
      </div>
      {children}
    </section>
  )
}

// The three-step rail at the top of the page — purely visual, driven by the
// same status/exportMode/selection state the page already tracks.
function SetupRail({
  step1Done,
  step2Done,
  step3Done,
  activeStep,
}: {
  step1Done: boolean
  step2Done: boolean
  step3Done: boolean
  activeStep: 1 | 2 | 3
}) {
  const steps = [
    { n: 1 as const, label: "Connect", done: step1Done },
    { n: 2 as const, label: "Choose data", done: step2Done },
    { n: 3 as const, label: "Send", done: step3Done },
  ]

  return (
    <div className="flex items-center gap-2 overflow-x-auto rounded-2xl border border-slate-200 bg-white px-4 py-3 sm:gap-3">
      {steps.map((step, index) => {
        const isActive = step.n === activeStep
        return (
          <div key={step.n} className="flex shrink-0 items-center gap-2">
            <span
              className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                step.done
                  ? "bg-emerald-600 text-white"
                  : isActive
                    ? "bg-emerald-50 text-emerald-700 ring-2 ring-emerald-200"
                    : "bg-slate-100 text-slate-400"
              }`}
            >
              {step.done ? <CheckCircle2 className="h-4 w-4" /> : step.n}
            </span>
            <span className={`text-sm font-medium ${isActive ? "text-slate-900" : step.done ? "text-slate-600" : "text-slate-400"}`}>
              {step.label}
            </span>
            {index < steps.length - 1 ? <span className="mx-1 h-px w-6 shrink-0 bg-slate-200 sm:w-10" /> : null}
          </div>
        )
      })}
    </div>
  )
}

const AgencyReportsPage = () => {
  const navigate = useNavigate();
  const agencyAdmin = getStoredAgencyAdmin();

  const [sections, setSections] = useState<AgencyReportSection[]>([]);
  const [status, setStatus] = useState<AgencyReportStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [lastResult, setLastResult] = useState<AgencyReportRunResult | null>(null);

  // "all" = export every category; "selected" = only the ticked categories.
  const [exportMode, setExportMode] = useState<"all" | "selected">("all");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [spreadsheetInput, setSpreadsheetInput] = useState("");

  // Purely visual: which category groups are expanded. Defaults to all open
  // so behavior on first load matches the old always-expanded layout.
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});

  const handleUnauthorized = () => {
    clearAgencyAdminAuth();
    navigate(adminPath("/login"), { replace: true });
  };

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        setIsLoading(true);
        const [sectionList, statusPayload] = await Promise.all([
          fetchAgencyReportSections(),
          fetchAgencyReportStatus(),
        ]);
        if (!active) return;

        setSections(sectionList);
        setStatus(statusPayload);
        setSpreadsheetInput(statusPayload.savedSpreadsheetIdOrUrl);
        setSelectedIds(statusPayload.includedSectionIds);
        setExportMode(
          statusPayload.includedSectionIds.length > 0 ? "selected" : "all",
        );
      } catch (error) {
        if (isAgencyReportUnauthorized(error)) {
          handleUnauthorized();
          return;
        }
        toast.error(
          error instanceof Error ? error.message : "Failed to load report settings",
        );
      } finally {
        if (active) setIsLoading(false);
      }
    };

    void load();
    return () => {
      active = false;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const groupedSections = useMemo(() => groupSections(sections), [sections]);

  const effectiveSectionCount =
    exportMode === "all" ? sections.length : selectedIds.length;

  const toggleSection = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  };

  const selectGroup = (groupList: AgencyReportSection[], select: boolean) => {
    const ids = groupList.map((section) => section.id);
    setSelectedIds((prev) =>
      select
        ? Array.from(new Set([...prev, ...ids]))
        : prev.filter((id) => !ids.includes(id)),
    );
  };

  const toggleGroupCollapsed = (group: string) => {
    setCollapsedGroups((prev) => ({ ...prev, [group]: !prev[group] }));
  };

  const buildPayload = () => ({
    spreadsheetIdOrUrl: spreadsheetInput.trim(),
    // An empty array tells the Worker "export every section".
    includedSectionIds: exportMode === "all" ? [] : selectedIds,
  });

  const persistConfig = async () => {
    const saved = await saveAgencyReportConfig(buildPayload());
    setStatus(saved);
    return saved;
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      await persistConfig();
      toast.success("Report configuration saved");
    } catch (error) {
      if (isAgencyReportUnauthorized(error)) {
        handleUnauthorized();
        return;
      }
      toast.error(
        error instanceof Error ? error.message : "Failed to save configuration",
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleTest = async () => {
    try {
      setIsTesting(true);
      // Save first so the test targets what the user just typed.
      await persistConfig();
      const result = await testAgencyGoogleSheetConnection();
      toast.success(
        `Connected. Spreadsheet ${result.spreadsheetId} has ${result.existingTabs.length} existing tab(s).`,
      );
    } catch (error) {
      if (isAgencyReportUnauthorized(error)) {
        handleUnauthorized();
        return;
      }
      toast.error(error instanceof Error ? error.message : "Connection test failed");
    } finally {
      setIsTesting(false);
    }
  };

  const handleRun = async () => {
    if (exportMode === "selected" && selectedIds.length === 0) {
      toast.error("Select at least one data category, or switch to “All data”.");
      return;
    }

    try {
      setIsRunning(true);
      setLastResult(null);
      // Persist the current picks so the Worker exports exactly what is shown.
      await persistConfig();

      const result = await runAgencyGoogleSheetReport();
      setLastResult(result);
      setStatus((prev) =>
        prev
          ? {
              ...prev,
              lastRunAt: new Date().toISOString(),
              lastRunSummary: `${result.tabsWritten} tabs · ${result.rowsWritten} rows`,
            }
          : prev,
      );
      toast.success(
        `Report pushed — ${result.tabsWritten} tab(s), ${result.rowsWritten} row(s).`,
      );
    } catch (error) {
      if (isAgencyReportUnauthorized(error)) {
        handleUnauthorized();
        return;
      }
      toast.error(error instanceof Error ? error.message : "Report failed");
    } finally {
      setIsRunning(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center p-6">
        <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-4 text-sm text-slate-600 shadow-sm">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading report settings…
        </div>
      </div>
    );
  }

  const isReady = Boolean(status?.ready);
  const step1Done = Boolean(status?.serviceAccountConfigured && status?.spreadsheetConfigured);
  const step2Done = exportMode === "all" || selectedIds.length > 0;
  const step3Done = Boolean(status?.lastRunAt);
  const activeStep: 1 | 2 | 3 = !step1Done ? 1 : !step2Done ? 2 : 3;

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4 pb-28 pt-8 md:p-8 md:pb-28">
      {/* ── Page header ───────────────────────────────────────────── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Google Sheet Reports</h1>
          <p className="mt-1 text-sm text-slate-500">Push your data to Sheets — one tab per category, nothing mixed.</p>
        </div>
        <span className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium ${isReady ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
          <span className={`h-1.5 w-1.5 rounded-full ${isReady ? "bg-emerald-500" : "bg-amber-500"}`} />
          {isReady ? "Ready to run" : "Setup needed"}
        </span>
      </div>

      {/* ── Setup progress rail ───────────────────────────────────── */}
      <SetupRail step1Done={step1Done} step2Done={step2Done} step3Done={step3Done} activeStep={activeStep} />

      {/* ── Connection ────────────────────────────────────────────── */}
      <Card icon={KeyRound} title="1. Connection" description="A service account and a spreadsheet, both set up">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl bg-slate-50 p-4">
            <p className="text-xs font-medium text-slate-500">Service account</p>
            {status?.serviceAccountConfigured ? (
              <p className="mt-1 flex items-center gap-1.5 text-sm font-medium text-emerald-700">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                {status.serviceAccountEmail || "Connected"}
              </p>
            ) : (
              <p className="mt-1 flex items-start gap-1.5 text-sm text-amber-700">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>Not set up yet — ask your developer to add the service account.</span>
              </p>
            )}
            {status?.serviceAccountEmail ? (
              <p className="mt-2 text-xs text-slate-500">Share your spreadsheet with this address as an Editor.</p>
            ) : null}
          </div>

          <div className="rounded-2xl bg-slate-50 p-4">
            <p className="text-xs font-medium text-slate-500">Spreadsheet</p>
            {status?.spreadsheetConfigured ? (
              <p className="mt-1 flex items-center gap-1.5 text-sm font-medium text-emerald-700">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                Connected
              </p>
            ) : (
              <p className="mt-1 flex items-start gap-1.5 text-sm text-amber-700">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>Paste a spreadsheet link below.</span>
              </p>
            )}
            {status?.spreadsheetUrl ? (
              <a href={status.spreadsheetUrl} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-emerald-700 hover:underline">
                Open spreadsheet <ExternalLink className="h-3 w-3" />
              </a>
            ) : null}
          </div>
        </div>

        {status && !isReady && status.blockingReason ? (
          <p className="mt-4 rounded-2xl bg-amber-50 p-4 text-sm text-amber-800">{status.blockingReason}</p>
        ) : null}

        <div className="mt-5 space-y-1.5">
          <Label htmlFor="spreadsheet" className="text-sm text-slate-600">Spreadsheet link for this agency</Label>
          <Input
            id="spreadsheet"
            value={spreadsheetInput}
            onChange={(event) => setSpreadsheetInput(event.target.value)}
            placeholder="https://docs.google.com/spreadsheets/d/1AbC.../edit"
            className="rounded-2xl border-slate-200 px-4 py-5"
          />
          <p className="text-xs text-slate-400">
            Optional — leave blank to use the shared default. This only affects {agencyAdmin?.agencyName || "this agency"}.
          </p>
        </div>
      </Card>

      {/* ── Data categories ───────────────────────────────────────── */}
      <Card
        icon={LayoutGrid}
        title="2. What to send"
        description={`Each category becomes its own tab · ${effectiveSectionCount} ${effectiveSectionCount === 1 ? "tab" : "tabs"} selected`}
        right={
          <div className="flex shrink-0 rounded-full bg-slate-100 p-1 text-sm">
            <button
              type="button"
              onClick={() => setExportMode("all")}
              className={`rounded-full px-4 py-2 font-medium transition-colors ${exportMode === "all" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"}`}
            >
              Everything
            </button>
            <button
              type="button"
              onClick={() => setExportMode("selected")}
              className={`rounded-full px-4 py-2 font-medium transition-colors ${exportMode === "selected" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"}`}
            >
              Just a few
            </button>
          </div>
        }
      >
        <div className="divide-y divide-slate-100">
          {groupedSections.map(([group, groupList]) => {
            const isCollapsed = Boolean(collapsedGroups[group]);
            const selectedInGroup = groupList.filter((s) => exportMode === "all" || selectedIds.includes(s.id)).length;

            return (
              <div key={group} className="py-4 first:pt-0 last:pb-0">
                <button
                  type="button"
                  onClick={() => toggleGroupCollapsed(group)}
                  className="flex w-full items-center justify-between gap-3 text-left"
                >
                  <span className="flex items-center gap-2">
                    <span className="text-sm font-medium text-slate-700">{group}</span>
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500">
                      {selectedInGroup}/{groupList.length}
                    </span>
                  </span>
                  <span className="text-xs font-medium text-slate-400">{isCollapsed ? "Show" : "Hide"}</span>
                </button>

                {!isCollapsed ? (
                  <div className="mt-3 grid gap-2.5 md:grid-cols-2">
                    {groupList.map((section) => {
                      const checked = exportMode === "all" || selectedIds.includes(section.id);

                      return (
                        <label
                          key={section.id}
                          className={`flex cursor-pointer items-center gap-3 rounded-2xl p-4 transition-colors ${
                            checked ? "bg-emerald-50" : "bg-slate-50 hover:bg-slate-100"
                          } ${exportMode === "all" ? "cursor-default opacity-80" : ""}`}
                        >
                          <input
                            type="checkbox"
                            className="h-4 w-4 shrink-0 accent-emerald-600"
                            disabled={exportMode === "all"}
                            checked={checked}
                            onChange={() => toggleSection(section.id)}
                          />
                          <span className="min-w-0 flex-1">
                            <span className="block text-sm font-medium text-slate-800">{section.title}</span>
                            <span className="block text-xs text-slate-500">{section.description}</span>
                          </span>
                        </label>
                      );
                    })}
                  </div>
                ) : null}

                {!isCollapsed && exportMode === "selected" && groupList.length > 1 ? (
                  <div className="mt-2 flex gap-3 pl-1">
                    <button type="button" className="text-xs font-medium text-emerald-700 hover:underline" onClick={() => selectGroup(groupList, true)}>
                      Select all in {group}
                    </button>
                    <button type="button" className="text-xs font-medium text-slate-400 hover:underline" onClick={() => selectGroup(groupList, false)}>
                      Clear
                    </button>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>

        {exportMode === "selected" && selectedIds.length === 0 ? (
          <p className="mt-5 rounded-2xl bg-amber-50 p-4 text-sm text-amber-800">
            Pick at least one category, or switch back to "Everything".
          </p>
        ) : null}
      </Card>

      {/* ── Send history / result ────────────────────────────────── */}
      <Card icon={FileSpreadsheet} title="3. Send" description={status?.lastRunAt ? `Last sent ${formatTimestamp(status.lastRunAt)} · ${status.lastRunSummary}` : "Nothing sent yet"}>
        {!isReady ? (
          <p className="flex items-center gap-2 rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">
            <Circle className="h-3.5 w-3.5 shrink-0" />
            Finish the connection above before you can send a report.
          </p>
        ) : lastResult ? (
          <div className="rounded-2xl bg-emerald-50 p-5">
            <p className="flex items-center gap-2 text-sm font-medium text-emerald-800">
              <CheckCircle2 className="h-4 w-4" />
              Sent — {lastResult.tabsWritten} tab(s), {lastResult.rowsWritten} row(s)
            </p>
            <a href={lastResult.spreadsheetUrl} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-emerald-700 hover:underline">
              Open the spreadsheet <ExternalLink className="h-3 w-3" />
            </a>

            <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {lastResult.tabs.map((tab) => (
                <div key={tab.title} className="flex items-center justify-between gap-2 rounded-xl bg-white px-3 py-2 text-xs">
                  <span className="truncate font-medium text-slate-700">{tab.title}</span>
                  <span className="shrink-0 text-slate-400">{tab.rows} {tab.rows === 1 ? "row" : "rows"}</span>
                </div>
              ))}
            </div>

            {lastResult.skippedSectionIds.length > 0 ? (
              <p className="mt-3 text-xs text-amber-700">Skipped: {lastResult.skippedSectionIds.join(", ")}</p>
            ) : null}
          </div>
        ) : (
          <p className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">
            Everything's connected. Use “Push to Google Sheets” below whenever you're ready.
          </p>
        )}
      </Card>

      {/* ── Sticky action bar — always reachable, whatever is on screen ── */}
      <div className="fixed inset-x-0 bottom-0 z-10 border-t border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 p-4">
          <p className="text-xs text-slate-500">
            {effectiveSectionCount} {effectiveSectionCount === 1 ? "tab" : "tabs"} will be written
            {agencyAdmin?.agencyName ? ` for ${agencyAdmin.agencyName}` : ""}
          </p>
          <div className="flex flex-wrap gap-3">
            <button type="button" onClick={handleTest} disabled={isTesting || !status?.serviceAccountConfigured} className={secondaryButton}>
              {isTesting ? (<span className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Testing…</span>) : "Test connection"}
            </button>
            <button type="button" onClick={handleSave} disabled={isSaving} className={secondaryButton}>
              {isSaving ? (<span className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Saving…</span>) : "Save settings"}
            </button>
            <button type="button" onClick={handleRun} disabled={isRunning || !isReady} className={primaryButton}>
              {isRunning ? (<span className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Sending…</span>) : "Push to Google Sheets"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AgencyReportsPage;