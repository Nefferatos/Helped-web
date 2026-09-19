import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CheckCircle2, ExternalLink, Loader2, Sheet, AlertTriangle } from "lucide-react";
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

