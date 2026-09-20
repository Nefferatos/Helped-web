import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CheckCircle2, ExternalLink, Loader2, FileSpreadsheet, AlertTriangle } from "lucide-react";
import { toast } from "@/components/ui/sonner";
import { Button } from "@/components/ui/button";
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
        <div className="flex items-center gap-2 rounded-xl border bg-card px-5 py-4 text-sm text-muted-foreground shadow-sm">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading report settings...
        </div>
      </div>
    );
  }

  const isReady = Boolean(status?.ready);

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold text-slate-900">Google Sheet Reports</h1>
        <p className="text-sm text-slate-600">
          Push every data category in your portal to Google Sheets. Each category is
          written to its{" "}
          <span className="font-medium text-slate-800">own separate tab</span> — maids,
          enquiries, requests, contracts and applicants are never mixed together.
        </p>
      </div>

      {/* ── Connection status ─────────────────────────────────────────── */}
      <section className="rounded-3xl border bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center gap-2">
          <FileSpreadsheet className="h-5 w-5 text-emerald-600" />
          <h2 className="text-lg font-semibold text-slate-900">Google Sheets connection</h2>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Service account
            </p>
            {status?.serviceAccountConfigured ? (
              <p className="mt-1 flex items-center gap-1.5 text-sm text-emerald-700">
                <CheckCircle2 className="h-4 w-4" />
                {status.serviceAccountEmail || "Configured"}
              </p>
            ) : (
              <p className="mt-1 flex items-start gap-1.5 text-sm text-amber-700">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>
                  Not configured. Set the Worker secret{" "}
                  <code className="rounded bg-slate-100 px-1">
                    GOOGLE_SHEETS_SERVICE_ACCOUNT_JSON
                  </code>
                  .
                </span>
              </p>
            )}
            {status?.serviceAccountEmail ? (
              <p className="mt-2 text-xs text-slate-500">
                Share your spreadsheet with this address as an{" "}
                <span className="font-medium">Editor</span>, or writes will be rejected.
              </p>
            ) : null}
          </div>

          <div className="rounded-2xl border p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Target spreadsheet
            </p>
            {status?.spreadsheetConfigured ? (
              <>
                <p className="mt-1 flex items-center gap-1.5 text-sm text-emerald-700">
                  <CheckCircle2 className="h-4 w-4" />
                  {status.spreadsheetId}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Source:{" "}
                  {status.spreadsheetSource === "agency"
                    ? "saved below for this agency"
                    : "Worker default (GOOGLE_SHEETS_SPREADSHEET_ID)"}
                </p>
              </>
            ) : (
              <p className="mt-1 flex items-start gap-1.5 text-sm text-amber-700">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                No spreadsheet set. Paste an id or URL below.
              </p>
            )}
            {status?.spreadsheetUrl ? (
              <a
                href={status.spreadsheetUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-emerald-700 hover:underline"
              >
                Open spreadsheet <ExternalLink className="h-3 w-3" />
              </a>
            ) : null}
          </div>
        </div>

        {status && !isReady && status.blockingReason ? (
          <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
            {status.blockingReason}
          </p>
        ) : null}

        <div className="mt-4 space-y-2">
          <Label htmlFor="spreadsheet">Spreadsheet id or URL for this agency</Label>
          <Input
            id="spreadsheet"
            value={spreadsheetInput}
            onChange={(event) => setSpreadsheetInput(event.target.value)}
            placeholder="https://docs.google.com/spreadsheets/d/1AbC.../edit"
          />
          <p className="text-xs text-slate-500">
            Optional — leave blank to use the Worker-wide default spreadsheet. Saving
            here only affects {agencyAdmin?.agencyName || "this agency"}.
          </p>
        </div>
      </section>

      {/* ── Data categories (one Google Sheet tab each) ───────────────── */}
      <section className="rounded-3xl border bg-white p-6 shadow-sm">
        <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Data categories</h2>
            <p className="text-sm text-slate-600">
              Every category below becomes its own tab in the spreadsheet. Pick exactly
              what you want — nothing is merged.
            </p>
          </div>
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="radio"
                name="report-mode"
                checked={exportMode === "all"}
                onChange={() => setExportMode("all")}
              />
              All data ({sections.length} tabs)
            </label>
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="radio"
                name="report-mode"
                checked={exportMode === "selected"}
                onChange={() => setExportMode("selected")}
              />
              Selected only ({selectedIds.length})
            </label>
          </div>
        </div>

        <div className="space-y-5">
          {groupedSections.map(([group, groupList]) => {
            const selectedInGroup = groupList.filter((section) =>
              selectedIds.includes(section.id),
            ).length;

            return (
              <div key={group}>
                <div className="mb-2 flex items-center justify-between gap-3">
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                    {group}
                    <span className="ml-2 font-normal normal-case text-slate-400">
                      {selectedInGroup}/{groupList.length} selected
                    </span>
                  </h3>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={exportMode !== "selected"}
                      onClick={() => selectGroup(groupList, true)}
                    >
                      Select
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={exportMode !== "selected"}
                      onClick={() => selectGroup(groupList, false)}
                    >
                      Clear
                    </Button>
                  </div>
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  {groupList.map((section) => {
                    const checked =
                      exportMode === "all" || selectedIds.includes(section.id);

                    return (
                      <label
                        key={section.id}
                        className={`flex cursor-pointer items-start gap-3 rounded-2xl border p-4 transition-colors ${
                          checked
                            ? "border-emerald-300 bg-emerald-50/60"
                            : "border-slate-200 bg-white hover:border-slate-300"
                        } ${exportMode === "all" ? "opacity-90" : ""}`}
                      >
                        <input
                          type="checkbox"
                          className="mt-0.5"
                          disabled={exportMode === "all"}
                          checked={checked}
                          onChange={() => toggleSection(section.id)}
                        />
                        <span className="min-w-0 flex-1">
                          <span className="flex items-center justify-between gap-2">
                            <span className="text-sm font-medium text-slate-900">
                              {section.title}
                            </span>
                            <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">
                              Tab: {section.title}
                            </span>
                          </span>
                          <span className="mt-1 block text-xs text-slate-600">
                            {section.description}
                          </span>
                          <span className="mt-1 block text-[11px] text-slate-400">
                            {section.columnCount} columns · section id{" "}
                            <code className="rounded bg-slate-100 px-1">{section.id}</code>
                          </span>
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {exportMode === "selected" && selectedIds.length === 0 ? (
          <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
            No categories selected. Tick at least one, or switch back to “All data”.
          </p>
        ) : null}
      </section>

      {/* ── Actions ───────────────────────────────────────────────────── */}
      <section className="rounded-3xl border bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Run the report</h2>
            <p className="text-sm text-slate-600">
              Writing <span className="font-medium">{effectiveSectionCount}</span>{" "}
              {effectiveSectionCount === 1 ? "tab" : "tabs"} — one per data category.
              Existing tabs are refreshed in place; tabs you did not select are left
              untouched.
            </p>
            {status?.lastRunAt ? (
              <p className="mt-1 text-xs text-slate-500">
                Last run: {formatTimestamp(status.lastRunAt)} · {status.lastRunSummary}
              </p>
            ) : null}
          </div>

          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" onClick={handleSave} disabled={isSaving}>
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving…
                </>
              ) : (
                "Save settings"
              )}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={handleTest}
              disabled={isTesting || !status?.serviceAccountConfigured}
            >
              {isTesting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Testing…
                </>
              ) : (
                "Test connection"
              )}
            </Button>
            <Button
              type="button"
              onClick={handleRun}
              disabled={isRunning || !isReady}
              className="bg-emerald-600 text-white hover:bg-emerald-700"
            >
              {isRunning ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Pushing to Google Sheets…
                </>
              ) : (
                <>
                  <FileSpreadsheet className="mr-2 h-4 w-4" /> Push report to Google Sheets
                </>
              )}
            </Button>
          </div>
        </div>

        {!isReady ? (
          <p className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
            Configure the service account secret and a target spreadsheet above before
            running the report.
          </p>
        ) : null}

        {lastResult ? (
          <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4">
            <p className="flex items-center gap-2 text-sm font-medium text-emerald-800">
              <CheckCircle2 className="h-4 w-4" />
              Report written to {lastResult.tabsWritten} tab(s) · {lastResult.rowsWritten} row(s)
            </p>
            <a
              href={lastResult.spreadsheetUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-emerald-700 hover:underline"
            >
              Open the spreadsheet <ExternalLink className="h-3 w-3" />
            </a>

            <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {lastResult.tabs.map((tab) => (
                <div
                  key={tab.title}
                  className="flex items-center justify-between gap-2 rounded-xl border border-emerald-200 bg-white px-3 py-2 text-xs"
                >
                  <span className="truncate font-medium text-slate-700">{tab.title}</span>
                  <span className="shrink-0 text-slate-500">
                    {tab.rows} {tab.rows === 1 ? "row" : "rows"}
                  </span>
                </div>
              ))}
            </div>

            {lastResult.skippedSectionIds.length > 0 ? (
              <p className="mt-3 text-xs text-amber-700">
                Skipped (could not be built): {lastResult.skippedSectionIds.join(", ")}
              </p>
            ) : null}
          </div>
        ) : null}
      </section>
    </div>
  );
};

export default AgencyReportsPage;

