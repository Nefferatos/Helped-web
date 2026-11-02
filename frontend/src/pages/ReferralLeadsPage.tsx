import { ChangeEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowDownToLine, ArrowRight, BadgeCheck, Check, CheckCircle2, ChevronLeft, ChevronRight,
  CircleAlert, Clock3, FileSpreadsheet, Filter, LoaderCircle, MessageCircle, RefreshCw,
  Search, ShieldCheck, Sparkles, Upload, Users, X,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "@/components/ui/sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getAgencyAdminAuthHeaders } from "@/lib/agencyAdminAuth";
import { adminPath } from "@/lib/routes";

type ReferralLead = {
  id: string;
  name: string;
  phone: string;
  country: string;
  source: string;
  preferredLanguage: string;
  whatsappConsentAt: string | null;
  whatsappConsentSource: string;
  whatsappConsentActive: boolean;
  whatsappOptedOut: boolean;
  interestStatus: "new" | "interested" | "not_interested" | "replied";
  leadClassification?: "new_applicant" | "existing_applicant" | "referral" | "general_enquiry" | "unknown";
  leadHunterStatus?: "classified" | "not_configured" | "failed";
  eligibleForNextStep?: boolean;
  staffReviewRequired?: boolean;
  lastDeliveryStatus: "not_sent" | "accepted" | "delivered" | "failed";
  lastMessageAt: string | null;
  possibleDuplicateOf?: string;
  createdAt: string;
};

type ReferralLeadResponse = {
  leads: ReferralLead[];
  total: number;
  page: number;
  pageCount: number;
  countries: string[];
  summary: { total: number; eligible: number; awaitingConsent: number; optedOut: number; interested: number; needsReview: number; acceptedByMake: number; failed: number; countries: number };
};

type AutomationInventory = { workflows: Array<{ id: string; configured: boolean; scenarioStatus?: string }> };
type AutomationState = { referral: boolean | null; agent1: boolean | null; broadcast: boolean | null };
type Segment = "all" | "eligible" | "awaiting" | "optedOut" | "review";
type BroadcastContact = { name: string; phone: string; language: string; whatsappConsent: true; consentSource: string };

const BROADCAST_HANDOFF_KEY = "referral-leads:broadcast:v1";
const normalizeHeader = (value: unknown) => String(value ?? "").trim().toLowerCase().replace(/[^a-z0-9]+/g, "");
const phoneHeader = (value: string) => /^(phone|phoneno|phonenumber|mobile|mobileno|mobilenumber|whatsapp|whatsappno|whatsappnumber|contact|contactno|contactnumber|contactphone|telephone|tel|maidphone|maidphoneno|maidphonenumber|maidmobile|maidmobilenumber|maidwhatsapp|maidwhatsappno|maidwhatsappnumber|referredphone|referredphonenumber)$/.test(value);
const yesValue = (value: unknown) => /^(yes|true|1|active|opted.?in|consented|granted)$/i.test(String(value ?? "").trim());
const csvCell = (value: unknown) => `"${String(value ?? "").replace(/"/g, '""')}"`;
const formatDate = (value: string | null) => value ? new Date(value).toLocaleDateString() : "—";

const request = async <T,>(path: string, init?: RequestInit): Promise<T> => {
  const response = await fetch(path, { ...init, headers: { ...getAgencyAdminAuthHeaders(), ...(init?.headers ?? {}) } });
  const responseText = await response.text();
  let data: Record<string, unknown> = {};
  try {
    const parsed: unknown = JSON.parse(responseText);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) data = parsed as Record<string, unknown>;
  } catch { /* Report the HTTP status when the server did not return JSON. */ }
  if (!response.ok) throw new Error(typeof data.error === "string" ? data.error : `Request failed (HTTP ${response.status})`);
  if (!responseText.trim()) throw new Error("The referral API returned an empty response.");
  try { return JSON.parse(responseText) as T; } catch { throw new Error("The referral API returned an invalid response."); }
};

const segmentDetails: Record<Segment, { label: string; description: string }> = {
  all: { label: "All leads", description: "Every referral contact in this view." },
  eligible: { label: "Consented", description: "Active documented WhatsApp opt-in." },
  awaiting: { label: "Awaiting consent", description: "Saved, but not eligible for broadcast." },
  optedOut: { label: "Opted out", description: "Suppressed from future WhatsApp campaigns." },
  review: { label: "Staff review", description: "Needs a person to review the referral." },
};

export default function ReferralLeadsPage() {
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const [data, setData] = useState<ReferralLeadResponse | null>(null);
  const [search, setSearch] = useState("");
  const [country, setCountry] = useState("");
  const [page, setPage] = useState(1);
  const [segment, setSegment] = useState<Segment>("all");
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [googleSheetRange, setGoogleSheetRange] = useState("Referrals!A1:Z501");
  const [preparingBroadcast, setPreparingBroadcast] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [consentEvidence, setConsentEvidence] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const [automation, setAutomation] = useState<AutomationState>({ referral: null, agent1: null, broadcast: null });
  const [automationLoading, setAutomationLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: "100" });
      if (search.trim()) params.set("q", search.trim());
      if (country) params.set("country", country);
      setData(await request<ReferralLeadResponse>(`/api/ats/referral-leads?${params}`));
      setError("");
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Could not load referral leads");
    } finally { setLoading(false); }
  }, [country, page, search]);

  const loadAutomation = useCallback(async () => {
    setAutomationLoading(true);
    try {
      const inventory = await request<AutomationInventory>("/api/dashboard/automations");
      const configured = (id: string) => inventory.workflows.find((workflow) => workflow.id === id)?.configured ?? false;
      setAutomation({ referral: configured("maid-referral"), agent1: configured("agent-1-lead-hunter"), broadcast: configured("whatsapp-broadcast") });
    } catch {
      setAutomation({ referral: null, agent1: null, broadcast: null });
    } finally { setAutomationLoading(false); }
  }, []);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => { void loadAutomation(); }, [loadAutomation]);

  const importMatrix = async (matrix: unknown[][], defaultSource: string) => {
      if (matrix.length < 2) throw new Error("Add a header row and at least one contact.");
      const headers = matrix[0].map(normalizeHeader);
      const findColumn = (...names: string[]) => headers.findIndex((header) => names.includes(header));
      const nameColumn = findColumn("name", "fullname", "contactname", "referralname", "maidname", "maidfullname", "referredname", "referredpersonname");
      const phoneColumn = headers.findIndex(phoneHeader);
      const countryColumn = findColumn("country", "nationality", "countryoforigin", "maidnationality");
      const sourceColumn = findColumn("source", "referralsource", "leadsource");
      const languageColumn = findColumn("language", "preferredlanguage", "nativelanguage");
      const consentColumn = findColumn("whatsappconsent", "marketingconsent", "consent", "optin", "whatsappoptin");
      const consentSourceColumn = findColumn("consentsource", "whatsappconsentsource", "optinsource", "consentevidence");
      if (nameColumn < 0 || phoneColumn < 0) {
        const headerless = nameColumn < 0 && phoneColumn < 0 && matrix[0].some((value) => String(value ?? "").trim());
        throw new Error(headerless
          ? "This sheet appears to have no header row and no phone-number column. Add a header row with Name and Phone, then include a phone number for each person. A name and date alone cannot be imported as a referral lead."
          : "Include Name (or Maid Name) and Phone (or Maid Phone) columns, with a phone number for each person. Country, Language, WhatsApp Consent, and Consent Source are optional.");
      }
      const rows = matrix.slice(1).filter((row) => row.some((cell) => String(cell ?? "").trim()));
      const leads = rows.map((row) => ({
        name: String(row[nameColumn] ?? "").trim(), phone: String(row[phoneColumn] ?? "").trim(),
        country: countryColumn >= 0 ? String(row[countryColumn] ?? "").trim() : "",
        source: sourceColumn >= 0 ? String(row[sourceColumn] ?? "").trim() : defaultSource,
        preferredLanguage: languageColumn >= 0 ? String(row[languageColumn] ?? "").trim() : "",
        whatsappConsent: consentColumn >= 0 && yesValue(row[consentColumn]),
        whatsappConsentSource: consentSourceColumn >= 0 ? String(row[consentSourceColumn] ?? "").trim() : "",
      }));
      let imported = 0; let duplicateCount = 0; let invalidCount = 0;
      for (let offset = 0; offset < leads.length; offset += 250) {
        const result = await request<{ imported: number; duplicateCount: number; invalidCount: number }>("/api/ats/referral-leads/import", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ leads: leads.slice(offset, offset + 250), defaultSource }),
        });
        imported += result.imported; duplicateCount += result.duplicateCount; invalidCount += result.invalidCount;
      }
      return { imported, duplicateCount, invalidCount };
  };

  const showImportSummary = async (result: { imported: number; duplicateCount: number; invalidCount: number }) => {
    toast.success(`Imported ${result.imported}; skipped ${result.duplicateCount} duplicates and ${result.invalidCount} invalid rows.`);
    setPage(1); setSegment("all"); await load();
  };

  const importFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!/\.(xlsx|xls|csv)$/i.test(file.name) || file.size > 10 * 1024 * 1024) {
      toast.error("Choose an Excel or CSV file smaller than 10 MB."); event.target.value = ""; return;
    }
    setImporting(true);
    try {
      const XLSX = await import("xlsx");
      const workbook = XLSX.read(await file.arrayBuffer(), { type: "array" });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      if (!sheet) throw new Error("The spreadsheet does not contain a sheet.");
      const matrix = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: "", raw: false });
      await showImportSummary(await importMatrix(matrix, `Spreadsheet: ${file.name}`));
    } catch (importError) { toast.error(importError instanceof Error ? importError.message : "Could not import this spreadsheet."); }
    finally { setImporting(false); event.target.value = ""; }
  };

  const importGoogleSheet = async () => {
    const range = googleSheetRange.trim();
    if (!range) { toast.error("Enter the tab and cell range to import."); return; }
    setImporting(true);
    try {
      const result = await request<{ values: unknown[][] }>("/api/ats/referral-leads/google-sheets/read", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ range }),
      });
      await showImportSummary(await importMatrix(result.values ?? [], `Google Sheets: ${range}`));
    } catch (importError) { toast.error(importError instanceof Error ? importError.message : "Could not import this Google Sheet."); }
    finally { setImporting(false); }
  };

  const visibleLeads = useMemo(() => (data?.leads ?? []).filter((lead) => {
    if (segment === "eligible") return lead.whatsappConsentActive;
    if (segment === "awaiting") return !lead.whatsappConsentActive && !lead.whatsappOptedOut;
    if (segment === "optedOut") return lead.whatsappOptedOut;
    if (segment === "review") return lead.staffReviewRequired;
    return true;
  }), [data?.leads, segment]);

  const exportEligible = async () => {
    try {
      const all: ReferralLead[] = [];
      const first = await request<ReferralLeadResponse>(`/api/ats/referral-leads?page=1&pageSize=200`);
      all.push(...first.leads.filter((lead) => lead.whatsappConsentActive));
      for (let pageNumber = 2; pageNumber <= first.pageCount; pageNumber++) {
        const result = await request<ReferralLeadResponse>(`/api/ats/referral-leads?page=${pageNumber}&pageSize=200`);
        all.push(...result.leads.filter((lead) => lead.whatsappConsentActive));
      }
      const headings = ["name", "phone", "language", "whatsappConsent", "consentSource", "country", "source"];
      const csv = [headings, ...all.map((lead) => [lead.name, lead.phone, lead.preferredLanguage, "Yes", lead.whatsappConsentSource, lead.country, lead.source])]
        .map((row) => row.map(csvCell).join(",")).join("\r\n");
      const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
      const anchor = document.createElement("a"); anchor.href = url; anchor.download = "consented-referral-leads.csv"; anchor.click(); URL.revokeObjectURL(url);
      toast.success(`Exported ${all.length} contacts with active WhatsApp consent.`);
    } catch (exportError) { toast.error(exportError instanceof Error ? exportError.message : "Could not export eligible contacts."); }
  };

  const prepareBroadcast = async () => {
    setPreparingBroadcast(true);
    try {
      const params = new URLSearchParams({ page: "1", pageSize: "200" });
      if (search.trim()) params.set("q", search.trim());
      if (country) params.set("country", country);
      const first = await request<ReferralLeadResponse>(`/api/ats/referral-leads?${params}`);
      const matched = [...first.leads];
      for (let pageNumber = 2; pageNumber <= first.pageCount; pageNumber++) {
        params.set("page", String(pageNumber));
        const next = await request<ReferralLeadResponse>(`/api/ats/referral-leads?${params}`);
        matched.push(...next.leads);
      }
      const eligible = matched.filter((lead) => lead.whatsappConsentActive && !lead.whatsappOptedOut && lead.phone.trim());
      if (!eligible.length) throw new Error("No contacts in this view have an active opt-in and phone number yet.");
      if (eligible.length > 500) throw new Error("This view has more than 500 eligible contacts. Narrow the search or country filter, then prepare the broadcast again.");
      const contacts: BroadcastContact[] = eligible.map((lead) => ({
        name: lead.name, phone: lead.phone, language: lead.preferredLanguage,
        whatsappConsent: true, consentSource: lead.whatsappConsentSource,
      }));
      sessionStorage.setItem(BROADCAST_HANDOFF_KEY, JSON.stringify({ createdAt: Date.now(), contacts }));
      navigate(adminPath("/whatsapp-broadcast"));
    } catch (handoffError) { toast.error(handoffError instanceof Error ? handoffError.message : "Could not prepare the broadcast audience."); }
    finally { setPreparingBroadcast(false); }
  };

  const updateLead = async (lead: ReferralLead, update: { whatsappConsent?: boolean; whatsappConsentSource?: string; interestStatus?: ReferralLead["interestStatus"] }) => {
    if (update.whatsappConsent && (consentEvidence[lead.id]?.trim().length ?? 0) < 5) {
      toast.error("Record where and when the person gave permission before enabling messages."); return;
    }
    setSavingId(lead.id);
    try {
      await request(`/api/ats/referral-leads/${encodeURIComponent(lead.id)}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...update, ...(update.whatsappConsent ? { whatsappConsentSource: consentEvidence[lead.id]?.trim() } : {}) }),
      });
      toast.success(update.whatsappConsent === false ? "Contact suppressed from WhatsApp marketing." : "Referral lead updated.");
      await load();
    } catch (updateError) { toast.error(updateError instanceof Error ? updateError.message : "Could not update lead."); }
    finally { setSavingId(null); }
  };

  const summary = data?.summary;
  const workflowSteps = [
    { title: "Referral intake", detail: "Website form saves each referral to this list.", status: "Connected", ready: true, icon: Users },
    { title: "Agent 1 triage", detail: automation.agent1 === null ? "Connection status unavailable." : automation.agent1 ? "Make webhook configured; scenario run state is not checked here." : "Configure the Agent 1 Make webhook to classify website referrals.", status: automationLoading ? "Checking" : automation.agent1 === null ? "Unknown" : automation.agent1 ? "Webhook ready" : "Needs setup", ready: automation.agent1 === true, icon: Sparkles },
    { title: "WhatsApp broadcast", detail: automation.broadcast === null ? "Connection status unavailable." : automation.broadcast ? "Consented leads can be prepared for staff review before sending." : "Configure the broadcast Make webhook before sending.", status: automationLoading ? "Checking" : automation.broadcast === null ? "Unknown" : automation.broadcast ? "Webhook ready" : "Needs setup", ready: automation.broadcast === true, icon: MessageCircle },
  ];

  return (
    <main className="referral-page mx-auto -mt-6 w-full max-w-[1500px] space-y-6 p-4 text-black sm:-mt-8 sm:p-6 xl:-mt-12 xl:p-8">
      <style>{`
        @keyframes referral-enter { from { opacity:0; transform:translateY(14px) } to { opacity:1; transform:translateY(0) } }
        @keyframes referral-orbit { from { transform:rotate(0deg) } to { transform:rotate(360deg) } }
        .referral-enter { animation:referral-enter .55s cubic-bezier(.2,.8,.2,1) both }
        .referral-delay-1 { animation-delay:70ms } .referral-delay-2 { animation-delay:140ms } .referral-delay-3 { animation-delay:210ms }
        .referral-orbit { animation:referral-orbit 24s linear infinite }
        .referral-row { animation:referral-enter .35s ease both }
        .referral-page input::placeholder { color:#52525b; opacity:1 }
        @media (prefers-reduced-motion: reduce) { .referral-enter,.referral-row,.referral-orbit { animation:none !important } }
      `}</style>

      <header className="referral-enter relative isolate overflow-hidden rounded-[2rem] border border-emerald-100 bg-white p-6 shadow-[0_24px_80px_-44px_rgba(5,120,90,.34)] sm:p-8">
        <div aria-hidden="true" className="pointer-events-none absolute -right-12 -top-20 -z-10 h-72 w-72 rounded-full border border-emerald-100 bg-emerald-50/70" />
        <div aria-hidden="true" className="referral-orbit pointer-events-none absolute right-12 top-10 -z-10 hidden h-40 w-40 rounded-full border border-dashed border-emerald-300/80 lg:block"><span className="absolute -left-2 top-1/2 h-4 w-4 rounded-full bg-emerald-400 ring-4 ring-emerald-100" /></div>
        <div className="relative flex flex-wrap items-end justify-between gap-6">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-bold uppercase tracking-[.18em] text-black"><Sparkles className="h-4 w-4" /> Referral operations · Agent 1</div>
            <h1 className="mt-4 text-3xl font-black tracking-tight text-black sm:text-5xl">Referral leads</h1>
            <p className="mt-3 max-w-2xl text-base leading-7 text-black">Collect referrals, review Agent 1 triage, and move opted-in contacts to WhatsApp Broadcast without uploading the same list twice.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <input ref={inputRef} type="file" accept=".csv,.xls,.xlsx" className="hidden" onChange={(event) => void importFile(event)} />
            <Button variant="outline" onClick={() => inputRef.current?.click()} disabled={importing} className="h-11 border-slate-300 bg-white text-black hover:bg-emerald-50">
              {importing ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}{importing ? "Importing" : "Import leads"}
            </Button>
            <label className="sr-only" htmlFor="referral-google-sheet-range">Google Sheets tab and range</label>
            <input id="referral-google-sheet-range" value={googleSheetRange} onChange={(event) => setGoogleSheetRange(event.target.value)} placeholder="Referrals!A1:Z501" aria-label="Google Sheets tab and range" className="h-11 w-48 rounded-xl border border-slate-300 bg-white px-3 text-sm text-black placeholder:text-slate-600 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-100" />
            <Button variant="outline" onClick={() => void importGoogleSheet()} disabled={importing || !googleSheetRange.trim()} className="h-11 border-slate-300 bg-white text-black hover:bg-emerald-50">
              {importing ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <FileSpreadsheet className="h-4 w-4" />}Import Sheet
            </Button>
            <Button onClick={() => void prepareBroadcast()} disabled={preparingBroadcast || !summary?.eligible} className="h-11 bg-emerald-200 text-black hover:bg-emerald-300">
              {preparingBroadcast ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <MessageCircle className="h-4 w-4" />}Prepare broadcast<ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <div className="relative mt-7 grid gap-2 sm:grid-cols-3">
          {workflowSteps.map((step, index) => {
            const Icon = step.icon;
            return <div key={step.title} className={`referral-enter referral-delay-${index + 1} relative flex min-h-[90px] items-center gap-3 rounded-2xl border border-slate-200 bg-white/90 p-4 ${index < 2 ? "" : ""}`}>
              <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${step.ready ? "bg-emerald-100" : "bg-amber-100"}`}><Icon className="h-5 w-5 text-black" /></span>
              <span className="min-w-0"><span className="flex items-center gap-2 text-sm font-bold text-black">{step.title}{index < 2 && <ArrowRight className="hidden h-3 w-3 text-black sm:block" />}</span><span className="mt-1 block text-xs leading-5 text-black">{step.detail}</span></span>
              <span className={`absolute right-3 top-3 h-2.5 w-2.5 rounded-full ${step.ready ? "bg-emerald-500" : automationLoading && index > 0 ? "animate-pulse bg-amber-400" : "bg-amber-500"}`} aria-label={step.status} title={step.status} />
            </div>;
          })}
        </div>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-black"><span className="inline-flex items-center gap-1.5"><CircleAlert className="h-3.5 w-3.5" />Webhook configuration is shown here; Make’s live scenario switch and run history are not available to the website.</span><button type="button" onClick={() => void loadAutomation()} className="inline-flex items-center gap-1.5 font-semibold underline decoration-emerald-500 underline-offset-4 hover:text-emerald-800" disabled={automationLoading}><RefreshCw className={`h-3.5 w-3.5 ${automationLoading ? "animate-spin" : ""}`} />Refresh connections</button></div>
      </header>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6" aria-label="Referral lead summary">
        {[
          { id: "all" as const, label: "Total leads", value: summary?.total ?? 0, icon: Users, active: segment === "all" },
          { id: "eligible" as const, label: "Consented", value: summary?.eligible ?? 0, icon: BadgeCheck, active: segment === "eligible" },
          { id: "awaiting" as const, label: "Awaiting consent", value: summary?.awaitingConsent ?? 0, icon: Clock3, active: segment === "awaiting" },
          { id: "optedOut" as const, label: "Opted out", value: summary?.optedOut ?? 0, icon: X, active: segment === "optedOut" },
          { id: "review" as const, label: "Staff review", value: summary?.needsReview ?? 0, icon: FileSpreadsheet, active: segment === "review" },
          { id: null, label: "Interested / replied", value: summary?.interested ?? 0, icon: MessageCircle, active: false },
        ].map((item, index) => {
          const Icon = item.icon;
          const content = <><span className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50"><Icon className="h-5 w-5 text-black" /></span><span className="min-w-0"><span className="block text-2xl font-black leading-none text-black">{loading && !data ? "—" : item.value}</span><span className="mt-1 block text-xs font-semibold text-black">{item.label}</span></span></>;
          return item.id ? <button key={item.label} type="button" onClick={() => setSegment(item.id!)} aria-pressed={item.active} className={`referral-enter referral-delay-${Math.min(index + 1, 3)} flex min-h-[94px] items-center gap-3 rounded-2xl border p-4 text-left transition duration-200 hover:-translate-y-1 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 ${item.active ? "border-emerald-500 bg-emerald-50 shadow-sm" : "border-slate-200 bg-white"}`}>{content}</button> : <div key={item.label} className="referral-enter flex min-h-[94px] items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4">{content}</div>;
        })}
      </section>

      <Card className="referral-enter referral-delay-2 overflow-hidden border-slate-200 bg-white p-4 text-black shadow-sm sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div><div className="flex items-center gap-2"><Filter className="h-4 w-4 text-black" /><h2 className="text-lg font-bold text-black">Contact list</h2></div><p className="mt-1 text-sm text-black">{data?.total ?? 0} matches · {summary?.countries ?? 0} countries · {segmentDetails[segment].description}</p></div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <label className="relative"><Search className="absolute left-3 top-3 h-4 w-4 text-black" /><input value={search} onChange={(event) => { setPage(1); setSearch(event.target.value); }} placeholder="Search name, phone, source" aria-label="Search referral leads" className="h-10 w-full rounded-xl border border-slate-300 bg-white pl-9 pr-3 text-sm text-black focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-100 sm:w-64" /></label>
            <select value={country} onChange={(event) => { setPage(1); setCountry(event.target.value); }} aria-label="Filter by country" className="h-10 rounded-xl border border-slate-300 bg-white px-3 text-sm text-black focus:border-emerald-600 focus:outline-none"><option value="">All countries</option>{(data?.countries ?? []).map((value) => <option key={value} value={value}>{value}</option>)}</select>
            <Button type="button" variant="outline" size="icon" onClick={() => void load()} aria-label="Refresh leads" disabled={loading} className="h-10 w-10 border-slate-300 text-black"><RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /></Button>
            <Button type="button" variant="outline" onClick={() => void exportEligible()} disabled={!summary?.eligible} className="h-10 gap-2 border-slate-300 text-black"><ArrowDownToLine className="h-4 w-4" />Export opted-in</Button>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2" role="tablist" aria-label="Filter leads by status">
          {(Object.keys(segmentDetails) as Segment[]).map((key) => <button key={key} type="button" role="tab" aria-selected={segment === key} onClick={() => setSegment(key)} className={`rounded-full border px-3 py-1.5 text-xs font-bold transition ${segment === key ? "border-emerald-700 bg-emerald-700 text-white" : "border-slate-300 bg-white text-black hover:bg-emerald-50"}`}>{segmentDetails[key].label}</button>)}
        </div>

        {error ? <div role="alert" className="mt-4 flex items-center justify-between gap-3 rounded-xl border border-rose-300 bg-rose-50 p-4 text-black"><span>{error}</span><Button variant="outline" size="sm" onClick={() => void load()} className="border-slate-300 text-black">Try again</Button></div> : null}
        {loading ? <div className="flex items-center justify-center gap-3 py-16 text-black"><LoaderCircle className="h-5 w-5 animate-spin" />Loading referral contacts…</div> : !visibleLeads.length ? <div className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-6 py-16 text-center"><span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-white shadow-sm"><Users className="h-7 w-7 text-black" /></span><p className="mt-4 text-lg font-bold text-black">{data?.leads.length ? `No ${segmentDetails[segment].label.toLowerCase()} on this page` : "No referral leads yet"}</p><p className="mx-auto mt-2 max-w-md text-sm text-black">{data?.leads.length ? "Choose another status filter or adjust your search." : "Import a spreadsheet or collect a referral through the website form."}</p>{!data?.leads.length && <Button variant="outline" onClick={() => inputRef.current?.click()} className="mt-4 border-slate-300 text-black"><Upload className="h-4 w-4" />Import your first leads</Button>}</div> : (
          <>
            <div className="mt-4 overflow-x-auto rounded-2xl border border-slate-200">
              <table className="w-full min-w-[1050px] text-left text-sm text-black">
                <thead className="bg-slate-50 text-xs font-bold uppercase tracking-wide text-black"><tr><th className="px-4 py-3">Contact</th><th className="px-4 py-3">Location</th><th className="px-4 py-3">Source & triage</th><th className="px-4 py-3">WhatsApp consent</th><th className="px-4 py-3">Interest</th><th className="px-4 py-3">Last message</th></tr></thead>
                <tbody>
                  {visibleLeads.map((lead, index) => <tr key={lead.id} className="referral-row border-t border-slate-200 align-top transition-colors hover:bg-emerald-50/40" style={{ animationDelay: `${Math.min(index, 8) * 35}ms` }}>
                    <td className="px-4 py-4"><p className="font-bold text-black">{lead.name}</p><p className="mt-1 font-mono text-xs text-black">{lead.phone || "No phone"}</p>{lead.possibleDuplicateOf && <p className="mt-2 inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-1 text-xs font-semibold text-black"><CircleAlert className="h-3 w-3" />Possible duplicate · review {lead.possibleDuplicateOf}</p>}</td>
                    <td className="px-4 py-4"><p className="font-medium text-black">{lead.country || "Unknown"}</p><p className="mt-1 text-xs text-black">{lead.preferredLanguage || "Language not recorded"}</p></td>
                    <td className="px-4 py-4"><p className="max-w-48 truncate font-medium text-black" title={lead.source}>{lead.source || "Unspecified"}</p><p className="mt-1 text-xs text-black">Added {formatDate(lead.createdAt)}</p><span className={`mt-2 inline-flex rounded-full px-2 py-1 text-xs font-bold ${lead.leadHunterStatus === "classified" ? "bg-emerald-100" : lead.leadHunterStatus === "failed" ? "bg-rose-100" : "bg-slate-100"}`}><Sparkles className="mr-1 h-3 w-3" />{lead.leadHunterStatus === "classified" ? `Agent 1 · ${(lead.leadClassification ?? "unknown").replace(/_/g, " ")}` : lead.leadHunterStatus === "failed" ? "Agent 1 · needs retry" : "Agent 1 · not configured"}</span></td>
                    <td className="px-4 py-4">
                      {lead.whatsappConsentActive ? <><span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-bold text-black"><Check className="h-3 w-3" />Opted in</span><p className="mt-2 max-w-56 text-xs text-black">{lead.whatsappConsentSource || "Evidence not recorded"}</p><Button size="sm" variant="outline" className="mt-2 h-8 border-slate-300 text-black" disabled={savingId === lead.id} onClick={() => void updateLead(lead, { whatsappConsent: false })}>{savingId === lead.id ? <LoaderCircle className="h-3 w-3 animate-spin" /> : <ShieldCheck className="h-3 w-3" />}Suppress</Button></> : lead.whatsappOptedOut ? <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2.5 py-1 text-xs font-bold text-black"><X className="h-3 w-3" />Opted out</span> : <><span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-bold text-black"><Clock3 className="h-3 w-3" />Awaiting consent</span><input aria-label={`Consent evidence for ${lead.name}`} value={consentEvidence[lead.id] ?? ""} onChange={(event) => setConsentEvidence((current) => ({ ...current, [lead.id]: event.target.value }))} placeholder="Where and when was consent recorded?" className="mt-2 h-9 w-60 max-w-full rounded-lg border border-slate-300 px-2 text-xs text-black focus:border-emerald-600 focus:outline-none" /><Button size="sm" variant="outline" className="mt-2 h-8 border-slate-300 text-black" disabled={savingId === lead.id} onClick={() => void updateLead(lead, { whatsappConsent: true })}>{savingId === lead.id ? <LoaderCircle className="h-3 w-3 animate-spin" /> : <CheckCircle2 className="h-3 w-3" />}Record opt-in</Button></>}
                    </td>
                    <td className="px-4 py-4"><select value={lead.interestStatus} onChange={(event) => void updateLead(lead, { interestStatus: event.target.value as ReferralLead["interestStatus"] })} disabled={savingId === lead.id} aria-label={`Interest status for ${lead.name}`} className="rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-xs font-semibold text-black focus:border-emerald-600 focus:outline-none"><option value="new">New</option><option value="interested">Interested</option><option value="replied">Replied</option><option value="not_interested">Not interested</option></select></td>
                    <td className="px-4 py-4"><span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold capitalize text-black">{lead.lastDeliveryStatus.replace(/_/g, " ")}</span><p className="mt-2 text-xs text-black">{formatDate(lead.lastMessageAt)}</p></td>
                  </tr>)}
                </tbody>
              </table>
            </div>
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm text-black"><span>Page {data?.page ?? 1} of {Math.max(1, data?.pageCount ?? 1)} · {visibleLeads.length} shown</span><div className="flex gap-2"><Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((value) => Math.max(1, value - 1))} className="border-slate-300 text-black"><ChevronLeft className="h-4 w-4" />Previous</Button><Button variant="outline" size="sm" disabled={page >= (data?.pageCount ?? 1)} onClick={() => setPage((value) => Math.min(data?.pageCount ?? 1, value + 1))} className="border-slate-300 text-black">Next<ChevronRight className="h-4 w-4" /></Button></div></div>
          </>
        )}
      </Card>

      <section className="referral-enter referral-delay-3 grid gap-4 lg:grid-cols-[1fr_auto] lg:items-center rounded-2xl border border-emerald-200 bg-emerald-50 p-5 sm:p-6">
        <div className="flex items-start gap-3"><ShieldCheck className="mt-1 h-5 w-5 shrink-0 text-black" /><div><h2 className="font-bold text-black">Permission stays attached to the contact</h2><p className="mt-1 max-w-3xl text-sm leading-6 text-black">Sharing someone’s details as a referral does not give permission for marketing. Only active, documented WhatsApp opt-ins can move to the broadcast review screen. Staff still reviews and confirms each broadcast.</p></div></div>
        <div className="flex flex-wrap gap-2"><Button asChild variant="outline" className="border-slate-300 bg-white text-black"><Link to={adminPath("/whatsapp-broadcast")}>Open broadcast<ArrowRight className="h-4 w-4" /></Link></Button><Button asChild variant="outline" className="border-slate-300 bg-white text-black"><Link to={adminPath("/ai-marketing")}>Campaign tools</Link></Button></div>
      </section>
    </main>
  );
}
