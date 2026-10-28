import { useCallback, useMemo, useRef, useState } from "react";
import { useEffect } from "react";
import {
  Activity,
  CheckCircle2,
  CircleAlert,
  Clock3,
  FileSpreadsheet,
  Image as ImageIcon,
  LoaderCircle,
  MessageCircle,
  Radio,
  Send,
  ShieldCheck,
  Sparkles,
  Upload,
  Users,
  Video,
  X,
  Zap,
} from "lucide-react";
import { toast } from "@/components/ui/sonner";
import { getAgencyAdminAuthHeaders } from "@/lib/agencyAdminAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type Contact = { name: string; phone: string; language: string };
type SheetData = { headers: string[]; rows: unknown[][]; fileName: string; nameColumn: number; languageColumn: number };
type AutomationStatus = { configured: boolean; optOutCaptureConfigured: boolean };
type BroadcastRunStatus = { state: "accepted" | "failed"; detail: string; checkedAt: Date };

const findPhone = (value: unknown) => {
  const text = String(value ?? "").trim();
  const match = /\+?\d[\d\s().-]{6,}\d/.exec(text);
  if (!match) return null;
  let digits = match[0].replace(/\D/g, "");
  if (digits.length === 8) digits = `65${digits}`;
  if (digits.length < 8 || digits.length > 15) return null;
  return { phone: `+${digits}`, match: match[0], index: match.index };
};

const isPhoneHeader = (value: string) => /phone|mobile|whatsapp|telephone|contact number|number/i.test(value);
const isNameHeader = (value: string) => /^(name|full name|contact name|customer)$/i.test(value.trim());
const isLanguageHeader = (value: string) => /^(native language|mother tongue|preferred language|language|lang)$/i.test(value.trim());
const isOtherHeader = (value: string) => /^(date|month|period|status|id|no\.?|#)$/i.test(value.trim());

export default function WhatsAppBroadcastPage() {
  const fileInput = useRef<HTMLInputElement>(null);
  const mediaInput = useRef<HTMLInputElement>(null);
  const [sheet, setSheet] = useState<SheetData | null>(null);
  const [message, setMessage] = useState("");
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [sending, setSending] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [automationStatus, setAutomationStatus] = useState<AutomationStatus | null>(null);
  const [statusLoading, setStatusLoading] = useState(true);
  const [statusError, setStatusError] = useState("");
  const [lastStatusCheck, setLastStatusCheck] = useState<Date | null>(null);
  const [lastBroadcastRun, setLastBroadcastRun] = useState<BroadcastRunStatus | null>(null);

  const refreshAutomationStatus = useCallback(async () => {
    setStatusLoading(true);
    try {
      const response = await fetch("/api/whatsapp-broadcast/status", { headers: getAgencyAdminAuthHeaders(), cache: "no-store" });
      if (!response.ok) throw new Error("Could not read automation setup status.");
      const status = await response.json() as AutomationStatus;
      setAutomationStatus(status);
      setStatusError("");
      setLastStatusCheck(new Date());
    } catch (error) {
      setAutomationStatus(null);
      setStatusError(error instanceof Error ? error.message : "Status check failed.");
    } finally {
      setStatusLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshAutomationStatus();
    const checkWhenVisible = () => {
      if (document.visibilityState === "visible") void refreshAutomationStatus();
    };
    const timer = window.setInterval(checkWhenVisible, 30_000);
    document.addEventListener("visibilitychange", checkWhenVisible);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", checkWhenVisible);
    };
  }, [refreshAutomationStatus]);

  const parseFile = useCallback(async (file?: File) => {
    if (!file) return;
    if (!/\.(xlsx|xls|csv)$/i.test(file.name)) {
      toast.error("Choose an Excel or CSV file.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error("The file must be smaller than 10 MB.");
      return;
    }
    try {
      const XLSX = await import("xlsx");
      const workbook = XLSX.read(await file.arrayBuffer(), { type: "array" });
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      if (!firstSheet) throw new Error("The file has no worksheet.");
      const matrix = XLSX.utils.sheet_to_json<unknown[]>(firstSheet, { header: 1, defval: "", raw: false });
      if (matrix.length < 2 || matrix[0].length === 0) throw new Error("Add a header row and at least one contact.");
      const firstRow = matrix[0].map((value) => String(value ?? "").trim());
      const hasHeader = firstRow.some((value) => isPhoneHeader(value) || isNameHeader(value) || isLanguageHeader(value) || isOtherHeader(value));
      const headers = hasHeader
        ? firstRow.map((value, index) => value || `Column ${String.fromCharCode(65 + index)}`)
        : firstRow.map((_, index) => `Column ${String.fromCharCode(65 + index)}`);
      const rows = (hasHeader ? matrix.slice(1) : matrix).filter((row) => row.some((value) => String(value).trim()));
      const nameColumn = hasHeader ? headers.findIndex(isNameHeader) : -1;
      const languageColumn = hasHeader ? headers.findIndex(isLanguageHeader) : -1;
      setSheet({ headers, rows, fileName: file.name, nameColumn, languageColumn });
      toast.success("Spreadsheet ready to preview.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not read this spreadsheet.");
    }
  }, []);

  const contacts = useMemo(() => {
    if (!sheet) return [];
    const seen = new Set<string>();
    return sheet.rows.flatMap((row) => {
      const cells = row.map((cell) => String(cell ?? "").trim());
      const phoneCell = cells
        .map((value, index) => ({ value, index, parsed: findPhone(value) }))
        .find((cell) => cell.parsed);
      if (!phoneCell?.parsed || seen.has(phoneCell.parsed.phone)) return [];
      const { phone, match, index } = phoneCell.parsed;
      seen.add(phone);
      const nameFromCell = phoneCell.value.slice(0, index).replace(/[\s,;|\-]+$/g, "").trim();
      const nameFromOtherColumn = cells
        .filter((_, cellIndex) => cellIndex !== phoneCell.index && cellIndex !== sheet.nameColumn && cellIndex !== sheet.languageColumn)
        .find((cell) => /[A-Za-z]{2}/.test(cell) && !isOtherHeader(cell) && !/^(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[- ]\d{2,4}$/i.test(cell)) ?? "";
      const name = sheet.nameColumn >= 0
        ? String(row[sheet.nameColumn] ?? "").trim().replace(match, "").trim()
        : nameFromCell || nameFromOtherColumn;
      const language = sheet.languageColumn >= 0 ? String(row[sheet.languageColumn] ?? "").trim().slice(0, 80) : "";
      return [{ phone, name: name.slice(0, 120), language }];
    });
  }, [sheet]);

  const invalidRows = sheet ? sheet.rows.length - contacts.length : 0;
  const contactsMissingLanguage = contacts.filter((contact) => !contact.language).length;

  const submitBroadcast = async () => {
    if (!sheet || !contacts.length || !message.trim()) return;
    setSending(true);
    try {
      let uploadedMedia: { mediaType: "image" | "video"; mediaUrl: string } | undefined;
      if (mediaFile) {
        const mediaForm = new FormData();
        mediaForm.set("file", mediaFile);
        const uploadResponse = await fetch("/api/whatsapp-broadcast/media", {
          method: "POST",
          headers: getAgencyAdminAuthHeaders(),
          body: mediaForm,
        });
        const uploaded = await uploadResponse.json().catch(() => ({}));
        if (!uploadResponse.ok) throw new Error(uploaded.error || "Could not upload broadcast media.");
        uploadedMedia = { mediaType: uploaded.mediaType, mediaUrl: uploaded.mediaUrl };
      }
      const response = await fetch("/api/whatsapp-broadcast", {
        method: "POST",
        headers: { ...getAgencyAdminAuthHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ contacts, message: message.trim(), mediaType: uploadedMedia?.mediaType ?? "text", mediaUrl: uploadedMedia?.mediaUrl }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || "Could not queue this broadcast.");
      setLastBroadcastRun({ state: "accepted", detail: `Make accepted the request for ${result.contactCount} contacts.`, checkedAt: new Date() });
      toast.success(`Broadcast accepted by Make.com for ${result.contactCount} contacts${result.optedOutSkipped ? `; ${result.optedOutSkipped} opted-out contacts skipped` : ""}.`);
      void refreshAutomationStatus();
      setConfirmOpen(false);
      setSheet(null);
      setMessage("");
      setMediaFile(null);
      if (fileInput.current) fileInput.current.value = "";
    } catch (error) {
      setLastBroadcastRun({ state: "failed", detail: error instanceof Error ? error.message : "Could not send the broadcast.", checkedAt: new Date() });
      toast.error(error instanceof Error ? error.message : "Could not send the broadcast.");
    } finally {
      setSending(false);
    }
  };

  return (
    <main className="wa-command-center relative isolate mx-auto w-full max-w-7xl space-y-6 overflow-hidden rounded-[2rem] p-4 text-black md:p-8">
      <style>{`
        @keyframes wa-enter { from { opacity:0; transform:translateY(12px) } to { opacity:1; transform:translateY(0) } }
        .wa-enter { animation:wa-enter .55s cubic-bezier(.2,.8,.2,1) both }
        @media (prefers-reduced-motion: reduce) { .wa-enter { animation:none !important } }
      `}</style>
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 overflow-hidden rounded-[2rem] bg-[#f1f7f5]">
        <div className="absolute inset-0 opacity-[0.12]" style={{ backgroundImage: "radial-gradient(circle at 88% 8%, rgba(110,231,183,.7), transparent 28%), radial-gradient(circle at 4% 84%, rgba(103,232,249,.55), transparent 30%), linear-gradient(rgba(15,23,42,.1) 1px, transparent 1px), linear-gradient(90deg, rgba(15,23,42,.1) 1px, transparent 1px)", backgroundSize: "auto, auto, 32px 32px, 32px 32px" }} />
      </div>
      <header className="wa-enter relative overflow-hidden rounded-[1.75rem] border border-white/80 bg-white p-6 shadow-[0_24px_80px_-40px_rgba(15,118,110,.25)] md:p-8">
        <div className="relative flex flex-wrap items-center justify-between gap-5">
          <div className="max-w-3xl">
            <p className="mb-3 inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-bold uppercase tracking-[.2em] text-black"><MessageCircle className="h-4 w-4" /> WhatsApp tools · AI communications</p>
            <h1 className="text-3xl font-black tracking-tight text-black md:text-5xl">Broadcast command center</h1>
            <p className="mt-3 max-w-2xl text-base leading-relaxed text-black">Prepare a multilingual broadcast, review every recipient, and monitor the Make connection from one place.</p>
          </div>
          <div className="relative flex h-24 w-24 items-center justify-center rounded-full border border-emerald-200 bg-emerald-50 text-black shadow-[0_0_32px_rgba(16,185,129,.14)]" aria-hidden="true">
            <div className="absolute inset-2 rounded-full border border-dashed border-emerald-300" />
            <Sparkles className="h-9 w-9 text-black" />
            <span className="absolute right-2 top-2 h-3 w-3 rounded-full bg-emerald-400 ring-4 ring-emerald-100" />
          </div>
        </div>
      </header>

      <section className="wa-enter rounded-[1.5rem] border border-white bg-white p-5 shadow-md md:p-6" aria-labelledby="wa-monitor-title" aria-live="polite">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="mb-1 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[.18em] text-black"><Activity className="h-4 w-4" /> System monitor</p>
            <h2 id="wa-monitor-title" className="text-xl font-bold text-black">Automation readiness</h2>
            <p className="mt-1 text-sm text-black">Setup is checked automatically every 30 seconds.</p>
          </div>
          <Button type="button" variant="outline" onClick={() => void refreshAutomationStatus()} disabled={statusLoading} className="border-emerald-300 bg-white text-black hover:bg-emerald-50">
            {statusLoading ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> : <Radio className="mr-2 h-4 w-4" />} Refresh status
          </Button>
        </div>
        <div className="mt-5 grid gap-3 md:grid-cols-2">
          {[
            { label: "Make broadcast webhook", ready: automationStatus?.configured ?? false },
            { label: "STOP opt-out capture", ready: automationStatus?.optOutCaptureConfigured ?? false },
          ].map((item) => (
            <div key={item.label} className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 text-black">
              {statusLoading && !automationStatus ? <LoaderCircle className="h-5 w-5 animate-spin text-black" /> : item.ready ? <CheckCircle2 className="h-5 w-5 text-emerald-700" /> : <CircleAlert className="h-5 w-5 text-amber-700" />}
              <div><p className="text-sm font-semibold text-black">{item.label}</p><p className="text-xs font-medium text-black">{statusLoading && !automationStatus ? "Checking" : statusError ? "Unavailable" : item.ready ? "Configured" : "Needs setup"}</p></div>
            </div>
          ))}
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 pt-3 text-xs text-black">
          <span className="inline-flex items-center gap-1.5"><Clock3 className="h-3.5 w-3.5" />{statusError || (lastStatusCheck ? `Last checked ${lastStatusCheck.toLocaleTimeString()}` : "Waiting for first check")}</span>
          <span className="font-medium">This checks saved connections, not Make’s On/Off switch. Replies are not automated.</span>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2 rounded-xl bg-slate-50 px-4 py-3 text-sm text-black">
          <Zap className="h-4 w-4 text-black" />
          <span className="font-semibold text-black">Latest broadcast:</span>
          <span className="text-black">{lastBroadcastRun ? `${lastBroadcastRun.detail} ${lastBroadcastRun.checkedAt.toLocaleTimeString()}` : "No broadcast submitted this session."}</span>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(340px,0.8fr)]">
        <Card className="wa-enter border-white bg-white text-black shadow-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg"><Upload className="h-5 w-5 text-emerald-700" /> Prepare broadcast</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <label className="mb-2 block text-base font-semibold text-black">1. Upload Excel or CSV contacts</label>
              {!sheet ? (
                <button type="button" onClick={() => fileInput.current?.click()} onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); void parseFile(event.dataTransfer.files[0]); }} className="group flex min-h-40 w-full flex-col items-center justify-center rounded-2xl border-2 border-dashed border-emerald-300 bg-gradient-to-br from-emerald-50 to-cyan-50 px-4 text-center text-base text-black transition duration-300 hover:-translate-y-0.5 hover:border-emerald-500 hover:shadow-[0_14px_40px_-24px_rgba(16,185,129,.6)]">
                  <FileSpreadsheet className="mb-2 h-8 w-8 text-emerald-700" />
                  <span className="font-semibold">Drop a spreadsheet here or browse</span>
                  <span className="mt-1 text-base text-black">.xlsx, .xls or .csv detects names and numbers in any column</span>
                </button>
              ) : (
                <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50/60 p-4">
                  <FileSpreadsheet className="h-8 w-8 shrink-0 text-emerald-700" />
                  <div className="min-w-0 flex-1"><p className="truncate font-semibold">{sheet.fileName}</p><p className="text-base text-black">{sheet.rows.length} spreadsheet rows</p></div>
                  <Button variant="ghost" size="icon" aria-label="Remove spreadsheet" onClick={() => { setSheet(null); if (fileInput.current) fileInput.current.value = ""; }}><X className="h-4 w-4" /></Button>
                </div>
              )}
              <input ref={fileInput} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={(event) => void parseFile(event.target.files?.[0])} />
            </div>

            {sheet && <div className="space-y-3">
              <p className="text-base font-semibold text-black">2. Contacts detected automatically from all columns</p>
              <div className="flex flex-wrap gap-3 text-base text-black">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 font-medium text-black"><Users className="h-4 w-4" /> {contacts.length} unique valid numbers</span>
                {invalidRows > 0 && <span className="rounded-full bg-slate-100 px-3 py-1.5 text-black">{invalidRows} invalid or duplicate rows skipped</span>}
              </div>
              {contacts.length > 500 && <p className="text-base text-black">This file has more than 500 contacts. Split it into smaller broadcasts.</p>}
              {contacts.length > 0 && <div className="max-h-72 overscroll-contain overflow-y-auto rounded-lg border border-slate-200" aria-label={`Detected contacts, ${contacts.length} total`}>
                <div className="sticky top-0 z-10 grid grid-cols-[minmax(0,1fr)_minmax(5rem,auto)_auto] gap-4 bg-slate-50 px-3 py-2 text-base font-semibold uppercase text-black"><span>Contact</span><span>Language</span><span>Phone</span></div>
                {contacts.map((contact, index) => <div key={`${contact.phone}-${index}`} className="grid grid-cols-[minmax(0,1fr)_minmax(5rem,auto)_auto] gap-4 border-t border-slate-100 px-3 py-2 text-base text-black"><span className="truncate">{contact.name || `Contact ${index + 1}`}</span><span>{contact.language || "Missing"}</span><span className="font-mono text-black">{contact.phone}</span></div>)}
              </div>}
              {contactsMissingLanguage > 0 && <p className="text-sm font-medium text-black">Add a “Language” or “Preferred Language” column and fill it for every contact. We can’t reliably infer someone’s language from their phone number.</p>}
            </div>}

            <div>
              <label htmlFor="broadcast-message" className="mb-2 block text-base font-semibold text-black">{sheet ? "3." : "2."} Write your message</label>
              <Textarea id="broadcast-message" value={message} onChange={(event) => setMessage(event.target.value.slice(0, 1000))} placeholder="Type the WhatsApp message to send to every contact" rows={5} maxLength={1000} className="resize-y rounded-xl border-slate-300 bg-white text-base text-black placeholder:text-black focus-visible:ring-emerald-500" />
              <div className="mt-1 text-right text-base text-black">{message.length}/1000</div>
              <p className="mt-2 text-sm text-black">Make’s AI Agent detects the language and translates this caption into each contact’s preferred language from the spreadsheet.</p>
            </div>

            <div>
              <label htmlFor="broadcast-media" className="mb-2 block text-base font-semibold text-black">4. Add an image or video (optional)</label>
              {mediaFile ? (
                <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-black">
                  {mediaFile.type.startsWith("image/") ? <ImageIcon className="h-7 w-7 shrink-0 text-black" /> : <Video className="h-7 w-7 shrink-0 text-black" />}
                  <div className="min-w-0 flex-1"><p className="truncate font-semibold text-black">{mediaFile.name}</p><p className="text-sm text-black">{mediaFile.type.startsWith("image/") ? "Image poster" : "Video"} · {(mediaFile.size / (1024 * 1024)).toFixed(1)} MB</p></div>
                  <Button type="button" variant="ghost" size="icon" aria-label="Remove broadcast media" onClick={() => { setMediaFile(null); if (mediaInput.current) mediaInput.current.value = ""; }}><X className="h-4 w-4 text-black" /></Button>
                </div>
              ) : (
                <button type="button" onClick={() => mediaInput.current?.click()} className="flex min-h-28 w-full items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-cyan-300 bg-cyan-50 px-4 text-center text-base text-black transition hover:border-cyan-500 hover:bg-cyan-100">
                  <Upload className="h-5 w-5 text-black" /><span>Choose JPEG/PNG poster or MP4/3GP video</span>
                </button>
              )}
              <input ref={mediaInput} id="broadcast-media" type="file" accept="image/jpeg,image/png,video/mp4,video/3gpp,video/3gp" className="hidden" onChange={(event) => {
                const file = event.target.files?.[0];
                if (!file) return;
                const isImage = ["image/jpeg", "image/png"].includes(file.type);
                const isVideo = ["video/mp4", "video/3gpp", "video/3gp"].includes(file.type);
                const maxBytes = isImage ? 5 * 1024 * 1024 : 16 * 1024 * 1024;
                if ((!isImage && !isVideo) || file.size > maxBytes) {
                  toast.error(isImage || isVideo ? `This file exceeds the ${isImage ? "5 MB image" : "16 MB video"} limit.` : "Choose a JPEG, PNG, MP4, or 3GP media file.");
                  event.target.value = "";
                  return;
                }
                setMediaFile(file);
              }} />
              <p className="mt-2 text-sm text-black">The same media goes to everyone; AI personalizes the caption. Images up to 5 MB and videos up to 16 MB.</p>
            </div>

            <Button onClick={() => setConfirmOpen(true)} disabled={!sheet || contacts.length === 0 || contacts.length > 500 || contactsMissingLanguage > 0 || !message.trim() || sending} className="w-full rounded-xl bg-emerald-300 text-base font-bold text-black shadow-[0_10px_30px_-16px_rgba(5,150,105,.8)] transition hover:-translate-y-0.5 hover:bg-emerald-400 sm:w-auto">
              <Send className="mr-2 h-4 w-4" />
              Review and send{contacts.length ? ` to ${contacts.length}` : ""}
            </Button>
          </CardContent>
        </Card>

        <aside className="space-y-5">
          <Card className="wa-enter border-white bg-white text-black shadow-md">
            <CardHeader><CardTitle className="text-lg">How it works</CardTitle></CardHeader>
            <CardContent className="space-y-4 text-base text-black">
              {["Upload contacts with a Language or Preferred Language column.", "Review each contact and their language; missing languages block sending.", "Write your message and confirm the recipient count.", "Make’s AI Agent detects your message language, writes it in each contact’s preferred language, and sends it to that contact."].map((step, index) => <div className="flex gap-3" key={step}><span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-50 font-semibold text-black">{index + 1}</span><p className="pt-1">{step}</p></div>)}
            </CardContent>
          </Card>
          <Card className="wa-enter border-cyan-200 bg-cyan-50/90 text-black shadow-[0_18px_60px_-36px_rgba(8,145,178,.35)]">
            <CardContent className="space-y-2 p-5 text-base text-black">
              <p className="font-semibold text-black">Before sending</p>
              <p>Use this only for people who agreed to receive WhatsApp messages. Make sure your scenario uses an approved WhatsApp Business template when required and handles send failures.</p>
              <p>This is a one-way broadcast; incoming messages do not receive AI replies. If Meta’s opt-out webhook is configured, “STOP” and similar messages are recorded to suppress future broadcasts.</p>
              <p className="text-base text-black">A successful response means Make.com accepted the broadcast request; delivery status depends on your scenario.</p>
            </CardContent>
          </Card>
        </aside>
      </div>

      <AlertDialog open={confirmOpen} onOpenChange={(open) => { if (!sending) setConfirmOpen(open); }}>
        <AlertDialogContent className="max-w-lg rounded-2xl border-slate-200 bg-white p-0 text-black shadow-2xl">
          <div className="rounded-t-2xl border-b border-emerald-200 bg-gradient-to-r from-emerald-100 to-cyan-100 p-6 text-black">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white ring-1 ring-emerald-200">
                <MessageCircle className="h-6 w-6" />
              </div>
              <div>
                <AlertDialogTitle className="text-xl font-bold text-black">Review your broadcast</AlertDialogTitle>
                <AlertDialogDescription className="mt-1 text-sm text-black">Check the audience and message before continuing.</AlertDialogDescription>
              </div>
            </div>
          </div>

          <AlertDialogHeader className="space-y-4 px-6 pt-5 text-left">
            <div className="flex items-center gap-3 rounded-xl border border-emerald-100 bg-emerald-50 p-4">
              <Users className="h-5 w-5 shrink-0 text-emerald-700" />
              <div>
                <p className="text-lg font-bold text-black">{contacts.length} unique recipients</p>
                <p className="text-sm text-black">From {sheet?.fileName || "your uploaded spreadsheet"}</p>
              </div>
            </div>
            <div>
              <p className="mb-2 text-sm font-semibold text-black">WhatsApp message</p>
              <div className="max-h-36 overflow-y-auto whitespace-pre-wrap break-words rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm leading-relaxed text-black">{message}</div>
              <p className="mt-2 text-sm text-black">Make’s AI Agent will detect the original language and generate one message per recipient in the language listed for that contact. This uses one AI generation per recipient ({contacts.length} maximum).</p>
              {mediaFile && <p className="mt-2 text-sm font-semibold text-black">Attached for all recipients: {mediaFile.name}</p>}
            </div>
            <div className="flex gap-2 rounded-lg bg-amber-50 px-3 py-2.5 text-sm text-black">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />
              <p>Only send to people who agreed to receive WhatsApp messages. Sending cannot be undone.</p>
            </div>
          </AlertDialogHeader>

          <AlertDialogFooter className="gap-2 px-6 pb-6 pt-5 sm:justify-end">
            <AlertDialogCancel disabled={sending} className="mt-0 rounded-xl border-slate-300 px-5 text-black">Go back</AlertDialogCancel>
            <AlertDialogAction
              disabled={sending}
              onClick={(event) => { event.preventDefault(); void submitBroadcast(); }}
              className="rounded-xl bg-emerald-300 px-5 font-bold text-black hover:bg-emerald-400"
            >
              {sending ? <><LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> Sending…</> : <><Send className="mr-2 h-4 w-4" /> Send to {contacts.length}</>}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  );
}
