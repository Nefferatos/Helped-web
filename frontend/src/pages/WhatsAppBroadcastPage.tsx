import { useCallback, useMemo, useRef, useState } from "react";
import * as XLSX from "xlsx";
import {
  FileSpreadsheet,
  LoaderCircle,
  MessageCircle,
  Send,
  ShieldCheck,
  Upload,
  Users,
  X,
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

type Contact = { name: string; phone: string };
type SheetData = { headers: string[]; rows: unknown[][]; fileName: string; nameColumn: number };

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
const isOtherHeader = (value: string) => /^(date|month|period|status|id|no\.?|#)$/i.test(value.trim());

export default function WhatsAppBroadcastPage() {
  const fileInput = useRef<HTMLInputElement>(null);
  const [sheet, setSheet] = useState<SheetData | null>(null);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

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
      const workbook = XLSX.read(await file.arrayBuffer(), { type: "array" });
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      if (!firstSheet) throw new Error("The file has no worksheet.");
      const matrix = XLSX.utils.sheet_to_json<unknown[]>(firstSheet, { header: 1, defval: "", raw: false });
      if (matrix.length < 2 || matrix[0].length === 0) throw new Error("Add a header row and at least one contact.");
      const firstRow = matrix[0].map((value) => String(value ?? "").trim());
      const hasHeader = firstRow.some((value) => isPhoneHeader(value) || isNameHeader(value) || isOtherHeader(value));
      const headers = hasHeader
        ? firstRow.map((value, index) => value || `Column ${String.fromCharCode(65 + index)}`)
        : firstRow.map((_, index) => `Column ${String.fromCharCode(65 + index)}`);
      const rows = (hasHeader ? matrix.slice(1) : matrix).filter((row) => row.some((value) => String(value).trim()));
      const nameColumn = hasHeader ? headers.findIndex(isNameHeader) : -1;
      setSheet({ headers, rows, fileName: file.name, nameColumn });
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
        .filter((_, cellIndex) => cellIndex !== phoneCell.index && cellIndex !== sheet.nameColumn)
        .find((cell) => /[A-Za-z]{2}/.test(cell) && !isOtherHeader(cell) && !/^(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[- ]\d{2,4}$/i.test(cell)) ?? "";
      const name = sheet.nameColumn >= 0
        ? String(row[sheet.nameColumn] ?? "").trim().replace(match, "").trim()
        : nameFromCell || nameFromOtherColumn;
      return [{ phone, name: name.slice(0, 120) }];
    });
  }, [sheet]);

  const invalidRows = sheet ? sheet.rows.length - contacts.length : 0;

  const submitBroadcast = async () => {
    if (!sheet || !contacts.length || !message.trim()) return;
    setSending(true);
    try {
      const response = await fetch("/api/whatsapp-broadcast", {
        method: "POST",
        headers: { ...getAgencyAdminAuthHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ contacts, message: message.trim() }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || "Could not queue this broadcast.");
      toast.success(`Broadcast accepted by Make.com for ${result.contactCount} contacts.`);
      setConfirmOpen(false);
      setSheet(null);
      setMessage("");
      if (fileInput.current) fileInput.current.value = "";
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not send the broadcast.");
    } finally {
      setSending(false);
    }
  };

  return (
    <main className="mx-auto w-full max-w-7xl space-y-6 p-4 text-black md:p-8">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="mb-2 inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-base font-semibold uppercase tracking-wider text-black">
            <MessageCircle className="h-3.5 w-3.5" /> WhatsApp tools
          </p>
          <h1 className="text-3xl font-bold tracking-tight">WhatsApp Broadcast</h1>
          <p className="mt-2 max-w-2xl text-base text-black">Upload a contact spreadsheet, check the recipient list, and send your message to the Make.com scenario.</p>
        </div>
      </header>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(340px,0.8fr)]">
        <Card className="border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg"><Upload className="h-5 w-5 text-emerald-700" /> Prepare broadcast</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <label className="mb-2 block text-base font-semibold text-black">1. Upload Excel or CSV</label>
              {!sheet ? (
                <button type="button" onClick={() => fileInput.current?.click()} onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); void parseFile(event.dataTransfer.files[0]); }} className="flex min-h-36 w-full flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 px-4 text-center text-base text-black transition hover:border-emerald-500 hover:bg-emerald-50/50">
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
                <div className="sticky top-0 z-10 grid grid-cols-[minmax(0,1fr)_auto] gap-4 bg-slate-50 px-3 py-2 text-base font-semibold uppercase text-black"><span>Contact</span><span>Phone</span></div>
                {contacts.map((contact, index) => <div key={`${contact.phone}-${index}`} className="grid grid-cols-[minmax(0,1fr)_auto] gap-4 border-t border-slate-100 px-3 py-2 text-base text-black"><span className="truncate">{contact.name || `Contact ${index + 1}`}</span><span className="font-mono text-black">{contact.phone}</span></div>)}
              </div>}
            </div>}

            <div>
              <label htmlFor="broadcast-message" className="mb-2 block text-base font-semibold text-black">{sheet ? "3." : "2."} Write your message</label>
              <Textarea id="broadcast-message" value={message} onChange={(event) => setMessage(event.target.value.slice(0, 1000))} placeholder="Type the WhatsApp message to send to every contacts" rows={5} maxLength={1000} className="resize-y text-base text-black placeholder:text-black" />
              <div className="mt-1 text-right text-base text-black">{message.length}/1000</div>
            </div>

            <Button onClick={() => setConfirmOpen(true)} disabled={!sheet || contacts.length === 0 || contacts.length > 500 || !message.trim() || sending} className="w-full bg-emerald-700 text-base text-white hover:bg-emerald-800 sm:w-auto">
              <Send className="mr-2 h-4 w-4" />
              Review and send{contacts.length ? ` to ${contacts.length}` : ""}
            </Button>
          </CardContent>
        </Card>

        <aside className="space-y-5">
          <Card className="border-slate-200 shadow-sm">
            <CardHeader><CardTitle className="text-lg">How it works</CardTitle></CardHeader>
            <CardContent className="space-y-4 text-base text-black">
              {["Upload a spreadsheet; headers are optional and names may share a cell with phone numbers.", "Review contacts detected from all columns and skipped duplicate or invalid numbers.", "Write your message and confirm the recipient count before sending.", "The Worker securely forwards one broadcast payload to Make.com."].map((step, index) => <div className="flex gap-3" key={step}><span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-50 font-semibold text-black">{index + 1}</span><p className="pt-1">{step}</p></div>)}
            </CardContent>
          </Card>
          <Card className="border-blue-100 bg-blue-50/70 shadow-none">
            <CardContent className="space-y-2 p-5 text-base text-black">
              <p className="font-semibold text-black">Before sending</p>
              <p>Use this only for people who agreed to receive WhatsApp messages. Make sure your scenario uses an approved WhatsApp Business template when required and handles send failures.</p>
              <p className="text-base text-black">A successful response means Make.com accepted the broadcast request; delivery status depends on your scenario.</p>
            </CardContent>
          </Card>
        </aside>
      </div>

      <AlertDialog open={confirmOpen} onOpenChange={(open) => { if (!sending) setConfirmOpen(open); }}>
        <AlertDialogContent className="max-w-lg rounded-2xl border-slate-200 p-0 text-black shadow-2xl">
          <div className="rounded-t-2xl bg-gradient-to-r from-emerald-700 to-teal-700 p-6 text-white">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/15 ring-1 ring-white/25">
                <MessageCircle className="h-6 w-6" />
              </div>
              <div>
                <AlertDialogTitle className="text-xl font-bold text-white">Review your broadcast</AlertDialogTitle>
                <AlertDialogDescription className="mt-1 text-sm text-emerald-50">Check the audience and message before continuing.</AlertDialogDescription>
              </div>
            </div>
          </div>

          <AlertDialogHeader className="space-y-4 px-6 pt-5 text-left">
            <div className="flex items-center gap-3 rounded-xl border border-emerald-100 bg-emerald-50 p-4">
              <Users className="h-5 w-5 shrink-0 text-emerald-700" />
              <div>
                <p className="text-lg font-bold text-slate-900">{contacts.length} unique recipients</p>
                <p className="text-sm text-slate-600">From {sheet?.fileName || "your uploaded spreadsheet"}</p>
              </div>
            </div>
            <div>
              <p className="mb-2 text-sm font-semibold text-slate-800">WhatsApp message</p>
              <div className="max-h-36 overflow-y-auto whitespace-pre-wrap break-words rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm leading-relaxed text-slate-700">{message}</div>
            </div>
            <div className="flex gap-2 rounded-lg bg-amber-50 px-3 py-2.5 text-sm text-amber-900">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />
              <p>Only send to people who agreed to receive WhatsApp messages. Sending cannot be undone.</p>
            </div>
          </AlertDialogHeader>

          <AlertDialogFooter className="gap-2 px-6 pb-6 pt-5 sm:justify-end">
            <AlertDialogCancel disabled={sending} className="mt-0 rounded-xl border-slate-300 px-5 text-slate-700">Go back</AlertDialogCancel>
            <AlertDialogAction
              disabled={sending}
              onClick={(event) => { event.preventDefault(); void submitBroadcast(); }}
              className="rounded-xl bg-emerald-700 px-5 text-white hover:bg-emerald-800"
            >
              {sending ? <><LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> Sending…</> : <><Send className="mr-2 h-4 w-4" /> Send to {contacts.length}</>}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  );
}
