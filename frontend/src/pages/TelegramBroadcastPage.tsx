import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Activity, Bot, CheckCircle2, CircleAlert, Copy, ExternalLink, MessageCircle, Radio, RefreshCw, Send, Users } from "lucide-react";
import { toast } from "@/components/ui/sonner";
import { getAgencyAdminAuthHeaders } from "@/lib/agencyAdminAuth";
import { readSharedBroadcastDraft, saveSharedBroadcastDraft } from "@/lib/sharedBroadcastDraft";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Status = { configured: boolean; chatbotConfigured: boolean; botConnected: boolean; botUsername: string; invitationLink: string; totalSubscribers: number; activeSubscribers: number; blockedSubscribers: number; unsubscribedSubscribers: number };
type DirectBroadcast = { id: string; message: string; total_recipients: number; matched_count: number; successful_count: number; failed_count: number; status: string; created_at: string; completed_at?: string | null };
type DirectStatus = { configured: boolean; connected: boolean; accountPhone?: string | null; maxRecipients?: number; error?: string; broadcasts?: DirectBroadcast[] };
type Subscriber = { id: string; applicant_id?: string | null; telegram_username?: string | null; first_name: string; language_code?: string | null; nationality?: string | null; applicant_status?: string | null; experience_years?: number | null; subscription_status: string; consent_status: string; last_interaction_at?: string | null };
type Conversation = { id: string; telegram_chat_id: string; conversation_status: string; last_message_at?: string | null; telegram_messages?: Array<{ sender_type: string; message_text: string; created_at: string }> };
type Broadcast = { id: string; title: string; message: string; status: string; scheduled_at?: string | null; total_recipients: number; successful_count: number; failed_count: number; created_at: string };

const headers = () => ({ ...getAgencyAdminAuthHeaders(), "Content-Type": "application/json" });

export default function TelegramBroadcastPage() {
  const [status, setStatus] = useState<Status | null>(null);
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [broadcasts, setBroadcasts] = useState<Broadcast[]>([]);
  const [section, setSection] = useState<"broadcast" | "subscribers" | "conversations" | "history">("broadcast");
  const [message, setMessage] = useState("");
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaPreviewUrl, setMediaPreviewUrl] = useState("");
  const [subscriberSearch, setSubscriberSearch] = useState("");
  const [sending, setSending] = useState(false);
  const [conversationReplies, setConversationReplies] = useState<Record<string, string>>({});
  const [sendingReplyFor, setSendingReplyFor] = useState<string | null>(null);
  const [lastBroadcast, setLastBroadcast] = useState("");
  const [broadcastRequestKey, setBroadcastRequestKey] = useState(() => crypto.randomUUID());
  const [directStatus, setDirectStatus] = useState<DirectStatus | null>(null);
  const [sendMode, setSendMode] = useState<"bot" | "phone">("bot");
  const [directAccountPhone, setDirectAccountPhone] = useState("");
  const [directLoginCode, setDirectLoginCode] = useState("");
  const [directPassword, setDirectPassword] = useState("");
  const [directLoginStarted, setDirectLoginStarted] = useState(false);
  const [directLoginBusy, setDirectLoginBusy] = useState(false);
  const [directPhoneNumbers, setDirectPhoneNumbers] = useState("");
  const [directConsentAcknowledged, setDirectConsentAcknowledged] = useState(false);
  const [directSending, setDirectSending] = useState(false);
  const [directBroadcastRequestKey, setDirectBroadcastRequestKey] = useState(() => crypto.randomUUID());
  const [lastDirectBroadcast, setLastDirectBroadcast] = useState("");

  const refresh = useCallback(async () => {
    try {
      const [s, p, c, b, d] = await Promise.all([
        fetch("/api/telegram/status", { headers: getAgencyAdminAuthHeaders(), cache: "no-store" }),
        fetch("/api/telegram/subscribers", { headers: getAgencyAdminAuthHeaders(), cache: "no-store" }),
        fetch("/api/telegram/conversations", { headers: getAgencyAdminAuthHeaders(), cache: "no-store" }),
        fetch("/api/telegram/broadcasts", { headers: getAgencyAdminAuthHeaders(), cache: "no-store" }),
        fetch("/api/telegram/direct/status", { headers: getAgencyAdminAuthHeaders(), cache: "no-store" }),
      ]);
      const sj = await s.json(); const pj = await p.json(); const cj = await c.json(); const bj = await b.json(); const dj = await d.json().catch(() => ({}));
      if (!s.ok) throw new Error(sj.error || "Could not read Telegram status.");
      setStatus(sj); setSubscribers(p.ok ? (pj.subscribers || []) : []); setConversations(c.ok ? (cj.conversations || []) : []); setBroadcasts(b.ok ? (bj.broadcasts || []) : []);
      setDirectStatus(d.ok ? dj : { configured: false, connected: false, error: dj.error });
    } catch (error) { toast.error(error instanceof Error ? error.message : "Could not load Telegram data."); }
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);

  useEffect(() => {
    if (!mediaFile) { setMediaPreviewUrl(""); return; }
    const previewUrl = URL.createObjectURL(mediaFile);
    setMediaPreviewUrl(previewUrl);
    return () => URL.revokeObjectURL(previewUrl);
  }, [mediaFile]);

  const sendBroadcast = async () => {
    if (!message.trim()) { toast.error("Write a message first."); return; }
    setSending(true);
    try {
      let mediaFileId: string | undefined;
      let mediaType: string | undefined;
      if (mediaFile) {
        const form = new FormData(); form.set("file", mediaFile);
        const upload = await fetch("/api/telegram/media", { method: "POST", headers: getAgencyAdminAuthHeaders(), body: form });
        const uploaded = await upload.json();
        if (!upload.ok) throw new Error(uploaded.error || "Could not upload media.");
        mediaFileId = uploaded.mediaFileId;
        mediaType = uploaded.mediaType;
      }
      const response = await fetch("/api/telegram/broadcasts", { method: "POST", headers: headers(), body: JSON.stringify({ message: message.trim(), mediaFileId, mediaType, filters: {}, idempotencyKey: broadcastRequestKey }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Broadcast could not be queued.");
      setLastBroadcast(`Queued for ${result.recipientCount} active Telegram subscribers.`); setMessage(""); setMediaFile(null); setBroadcastRequestKey(crypto.randomUUID());
      toast.success(`Telegram broadcast queued for ${result.recipientCount} subscribers.`); await refresh();
    } catch (error) { toast.error(error instanceof Error ? error.message : "Broadcast could not be queued."); }
    finally { setSending(false); }
  };

  const startDirectLogin = async () => {
    if (!/^\+[1-9]\d{7,14}$/.test(directAccountPhone.trim())) { toast.error("Enter the Telegram account number in international format, such as +639171234567."); return; }
    setDirectLoginBusy(true);
    try {
      const response = await fetch("/api/telegram/direct/login/start", { method: "POST", headers: headers(), body: JSON.stringify({ phoneNumber: directAccountPhone.trim() }) });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || "Could not request Telegram login code.");
      setDirectLoginStarted(true);
      toast.success(`Telegram sent a sign-in code via ${result.sentVia || "your account"}.`);
    } catch (error) { toast.error(error instanceof Error ? error.message : "Could not request Telegram login code."); }
    finally { setDirectLoginBusy(false); }
  };

  const completeDirectLogin = async (event: FormEvent) => {
    event.preventDefault();
    setDirectLoginBusy(true);
    try {
      const response = await fetch("/api/telegram/direct/login/complete", { method: "POST", headers: headers(), body: JSON.stringify({ code: directLoginCode, password: directPassword }) });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || "Could not complete Telegram sign-in.");
      setDirectLoginStarted(false); setDirectLoginCode(""); setDirectPassword("");
      toast.success("Telegram account connected for phone-number messages.");
      await refresh();
    } catch (error) { toast.error(error instanceof Error ? error.message : "Could not complete Telegram sign-in."); }
    finally { setDirectLoginBusy(false); }
  };

  const disconnectDirectAccount = async () => {
    if (!window.confirm("Disconnect this Telegram account from direct messaging?")) return;
    setDirectLoginBusy(true);
    try {
      const response = await fetch("/api/telegram/direct/logout", { method: "POST", headers: headers(), body: JSON.stringify({}) });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || "Could not disconnect the Telegram account.");
      toast.success("Telegram account disconnected.");
      await refresh();
    } catch (error) { toast.error(error instanceof Error ? error.message : "Could not disconnect the Telegram account."); }
    finally { setDirectLoginBusy(false); }
  };

  const sendPhoneBroadcast = async () => {
    if (!message.trim()) { toast.error("Write a message first."); return; }
    if (mediaFile) { toast.error("Phone-number direct messages currently support text only. Switch back to bot broadcast to send the attachment."); return; }
    if (!directStatus?.connected) { toast.error("Connect a Telegram account before sending direct messages."); return; }
    if (!directConsentAcknowledged) { toast.error("Confirm that all recipients agreed to receive Telegram messages."); return; }
    const phoneNumbers = [...new Set(directPhoneNumbers.split(/[\n,;\t ]+/).map((phone) => phone.trim()).filter(Boolean))];
    const limit = directStatus.maxRecipients || 25;
    if (!phoneNumbers.length || phoneNumbers.length > limit || phoneNumbers.some((phone) => !/^\+[1-9]\d{7,14}$/.test(phone))) { toast.error(`Enter 1 to ${limit} unique phone numbers in international format.`); return; }
    setDirectSending(true);
    try {
      const response = await fetch("/api/telegram/direct/broadcasts", { method: "POST", headers: headers(), body: JSON.stringify({ message: message.trim(), phoneNumbers, consentAcknowledged: directConsentAcknowledged, idempotencyKey: directBroadcastRequestKey }) });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || "Direct Telegram messages could not be sent.");
      setLastDirectBroadcast(`${result.sentCount || 0} sent · ${result.failedCount || 0} not sent · ${result.matchedCount || 0} Telegram accounts found.`);
      setDirectPhoneNumbers(""); setDirectConsentAcknowledged(false); setDirectBroadcastRequestKey(crypto.randomUUID());
      toast.success(`Direct message sent to ${result.sentCount || 0} Telegram account${result.sentCount === 1 ? "" : "s"}.`);
      await refresh();
    } catch (error) { toast.error(error instanceof Error ? error.message : "Direct Telegram messages could not be sent."); }
    finally { setDirectSending(false); }
  };

  const sendConversationReply = async (conversation: Conversation) => {
    const reply = (conversationReplies[conversation.id] || "").trim();
    if (!reply) return;
    setSendingReplyFor(conversation.id);
    try {
      const response = await fetch(`/api/telegram/conversations/${encodeURIComponent(conversation.id)}/messages`, {
        method: "POST",
        headers: headers(),
        body: JSON.stringify({ message: reply }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not send Telegram reply.");
      setConversationReplies((current) => ({ ...current, [conversation.id]: "" }));
      if (result.historySaved === false) toast.error(result.warning || "Reply was sent, but could not be saved in the conversation history. Do not resend it.");
      else toast.success("Reply sent to the applicant.");
      await refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not send Telegram reply.");
    } finally {
      setSendingReplyFor(null);
    }
  };

  const cancelScheduledBroadcast = async (broadcast: Broadcast) => {
    if (!window.confirm(`Cancel the scheduled Telegram broadcast “${broadcast.title || broadcast.message.slice(0, 60)}”?`)) return;
    try {
      const response = await fetch(`/api/telegram/broadcasts/${encodeURIComponent(broadcast.id)}/cancel`, { method: "PATCH", headers: headers() });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || "Could not cancel this scheduled broadcast.");
      toast.success("Scheduled Telegram broadcast cancelled.");
      await refresh();
    } catch (error) { toast.error(error instanceof Error ? error.message : "Could not cancel this scheduled broadcast."); }
  };

  const tabs = [{ id: "broadcast", label: "Broadcasting", icon: Send }, { id: "subscribers", label: "Subscribers", icon: Users }, { id: "conversations", label: "AI conversations", icon: MessageCircle }, { id: "history", label: "Broadcast history", icon: Activity }] as const;
  const parsedDirectNumbers = [...new Set(directPhoneNumbers.split(/[\n,;\t ]+/).map((phone) => phone.trim()).filter(Boolean))];
  return <main className="mx-auto w-full max-w-7xl space-y-6 p-4 text-slate-900 md:p-8">
    <header className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-slate-200 bg-white p-6 text-black shadow-sm md:p-8">
      <div><p className="mb-2 flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-sky-700"><Send className="h-4 w-4" /> Telegram · Applicant communications</p><h1 className="text-3xl font-black text-black md:text-5xl">Telegram command center</h1><p className="mt-3 max-w-2xl text-slate-700">Broadcast to bot subscribers or message consented phone-number recipients, and review applicant conversations.</p></div>
      <Button variant="outline" onClick={() => void refresh()}><RefreshCw className="mr-2 h-4 w-4" />Refresh</Button>
    </header>
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {[["Bot connection", status?.botConnected ? `@${status.botUsername}` : "Not connected", status?.botConnected], ["Active subscribers", status?.activeSubscribers ?? "—", true], ["Blocked", status?.blockedSubscribers ?? "—", false], ["Unsubscribed", status?.unsubscribedSubscribers ?? "—", false]].map(([label, value, ok]) => <Card key={String(label)}><CardContent className="flex items-center gap-3 p-5">{ok ? <CheckCircle2 className="h-6 w-6 text-emerald-600" /> : <CircleAlert className="h-6 w-6 text-amber-600" />}<div><div className="text-sm text-slate-500">{label}</div><div className="font-bold">{value}</div></div></CardContent></Card>)}
    </section>
    <p className="text-sm text-slate-600">Registered Telegram subscribers: <strong>{status?.totalSubscribers ?? "—"}</strong></p>
    <section className="flex flex-wrap gap-2" role="tablist">{tabs.map(({ id, label, icon: Icon }) => <Button key={id} role="tab" aria-selected={section === id} variant={section === id ? "default" : "outline"} onClick={() => setSection(id)}><Icon className="mr-2 h-4 w-4" />{label}</Button>)}</section>
    {section === "broadcast" && <div className="grid gap-6 xl:grid-cols-2">
      <Card className="border-slate-200"><CardHeader><CardTitle className="flex items-center gap-2 text-black"><Radio className="h-5 w-5 text-sky-700" />Compose broadcast</CardTitle><p className="text-sm text-slate-700">Choose bot delivery to subscribers or direct messages to consented phone numbers.</p></CardHeader><CardContent className="space-y-5 text-black">
        <div className="flex flex-wrap gap-2" aria-label="Telegram sending method"><Button type="button" variant={sendMode === "bot" ? "default" : "outline"} onClick={() => setSendMode("bot")}><Bot className="mr-2 h-4 w-4" />Bot subscribers</Button><Button type="button" variant={sendMode === "phone" ? "default" : "outline"} onClick={() => setSendMode("phone")}><MessageCircle className="mr-2 h-4 w-4" />Phone numbers</Button></div>
        <div className="flex flex-wrap gap-2"><Button type="button" variant="outline" size="sm" onClick={() => { saveSharedBroadcastDraft(message); toast.success("Draft shared with WhatsApp Broadcast."); }} disabled={!message.trim()}><Copy className="mr-2 h-4 w-4" />Share draft with WhatsApp</Button><Button type="button" variant="outline" size="sm" onClick={() => { const draft = readSharedBroadcastDraft(); if (!draft) toast.error("No shared broadcast draft is available yet."); else { setMessage(draft.slice(0, 4096)); toast.success("Shared draft loaded."); } }}><MessageCircle className="mr-2 h-4 w-4" />Load shared draft</Button></div>
        <label className="block text-sm font-semibold text-black">Message<textarea aria-label="Broadcast message" className="mt-2 min-h-40 w-full rounded-xl border border-slate-300 bg-white p-3 text-black placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-700" value={message} onChange={e => setMessage(e.target.value.slice(0, 4096))} rows={7} maxLength={4096} placeholder="Write a recruitment update for Telegram applicants" /><span className="mt-1 block text-right text-xs font-normal text-slate-600">{message.length}/4,096</span></label>
        {sendMode === "phone" && <div className="space-y-3 rounded-xl border border-sky-200 bg-sky-50 p-4"><label className="block text-sm font-semibold text-black">Recipient phone numbers<textarea aria-label="Recipient phone numbers" className="mt-2 min-h-28 w-full rounded-lg border border-slate-300 bg-white p-3 font-normal" value={directPhoneNumbers} onChange={event => setDirectPhoneNumbers(event.target.value)} placeholder={"+639171234567\n+6591234567"} /><span className="mt-1 block text-xs font-normal text-slate-600">One per line, or separated by commas. Use international format. Up to {directStatus?.maxRecipients || 25} numbers per send. {parsedDirectNumbers.length} entered.</span></label><label className="flex items-start gap-2 text-sm font-normal text-slate-800"><input type="checkbox" className="mt-1" checked={directConsentAcknowledged} onChange={event => setDirectConsentAcknowledged(event.target.checked)} /><span>I confirm every listed person agreed to receive direct messages from our agency on Telegram.</span></label><p className="text-xs text-slate-600">Telegram may not reveal every account because of phone number privacy settings. Numbers Telegram imports remain in the connected account's contacts. Direct messages support text only.</p></div>}
        <label className="block text-sm font-semibold text-black">Attachment <span className="font-normal text-slate-600">(optional)</span><input className="mt-2 block w-full cursor-pointer rounded-xl border border-slate-300 bg-white p-2 text-sm text-black file:mr-3 file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:font-semibold file:text-black" type="file" accept="image/*,video/*,.pdf,.doc,.docx" onChange={e => setMediaFile(e.target.files?.[0] || null)} /><span className="mt-2 block text-xs font-normal text-slate-700">Photos, videos, PDF, or Word documents up to 10 MB are supported through the bot broadcast. Direct messages support text only.</span></label>
        {mediaFile && <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-black"><span className="min-w-0 break-all">Selected: {mediaFile.name} <span className="text-slate-600">({Math.ceil(mediaFile.size / 1024)} KB)</span></span><button type="button" className="shrink-0 font-semibold text-sky-800 underline" onClick={() => setMediaFile(null)}>Remove</button></div>}
        <div><p className="mb-2 text-sm font-semibold text-black">Message preview</p><div className="max-w-xl overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 text-black shadow-sm"><div className="space-y-3 p-4"><p className="whitespace-pre-wrap break-words text-sm">{message || <span className="text-slate-600">Your message will appear here.</span>}</p>{mediaFile && mediaPreviewUrl && (mediaFile.type.startsWith("image/") ? <img src={mediaPreviewUrl} alt={`Preview of ${mediaFile.name}`} className="max-h-72 w-full rounded-xl object-contain" /> : mediaFile.type.startsWith("video/") ? <video src={mediaPreviewUrl} controls className="max-h-72 w-full rounded-xl bg-black" /> : <div className="rounded-xl border border-slate-200 bg-white p-3 text-sm font-medium text-black">📎 {mediaFile.name}</div>)}</div></div></div>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-4"><span className="text-sm text-slate-700">{sendMode === "bot" ? <>Eligible subscribers: <strong className="text-black">{status?.activeSubscribers ?? 0}</strong></> : <>Recipients entered: <strong className="text-black">{parsedDirectNumbers.length}</strong></>}</span>{sendMode === "bot" ? <Button onClick={() => void sendBroadcast()} disabled={sending || !message.trim() || !status?.configured || !status.activeSubscribers}><Send className="mr-2 h-4 w-4" />{sending ? "Queueing…" : "Queue broadcast"}</Button> : <Button onClick={() => void sendPhoneBroadcast()} disabled={directSending || !message.trim() || !directStatus?.connected || !directConsentAcknowledged || !parsedDirectNumbers.length || Boolean(mediaFile)}><Send className="mr-2 h-4 w-4" />{directSending ? "Sending…" : "Send direct messages"}</Button>}</div>
        {lastBroadcast && <p className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">{lastBroadcast}</p>}
        {lastDirectBroadcast && <p className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">Direct messages: {lastDirectBroadcast}</p>}
        {!status?.configured && <p className="text-sm text-amber-700">Configure MAKE_TELEGRAM_BROADCAST_WEBHOOK_URL to enable delivery.</p>}
      </CardContent></Card>
      <Card><CardHeader><CardTitle className="flex items-center gap-2"><Bot className="h-5 w-5 text-sky-600" />Telegram registration</CardTitle></CardHeader><CardContent className="space-y-4">
        <p className="text-sm text-slate-600">Bot broadcasts go only to applicants who pressed Start and subscribed. Phone-number direct messages use the separate connected account below.</p>
        {status?.invitationLink ? <div className="flex flex-wrap items-center gap-2 rounded-xl bg-slate-50 p-4"><a className="break-all font-medium text-sky-700 underline" href={status.invitationLink} target="_blank" rel="noreferrer">{status.invitationLink}</a><Button variant="outline" size="sm" onClick={() => { void navigator.clipboard.writeText(status.invitationLink); toast.success("Invitation link copied."); }}><Copy className="mr-1 h-4 w-4" />Copy</Button><a href={status.invitationLink} target="_blank" rel="noreferrer" aria-label="Open Telegram invitation"><ExternalLink className="h-4 w-4" /></a></div> : <p className="rounded-xl bg-amber-50 p-4 text-sm">Set TELEGRAM_BOT_USERNAME and a valid TELEGRAM_BOT_TOKEN on the Worker.</p>}
        <div className="rounded-xl border p-4 text-sm"><p className="font-semibold">Registration flow</p><p className="mt-1 text-slate-600">/start records Telegram consent and the chat ID. /stop revokes consent immediately. Make handles AI replies using its existing approved knowledge base.</p></div>
      </CardContent></Card>
      <Card><CardHeader><CardTitle className="flex items-center gap-2"><MessageCircle className="h-5 w-5 text-sky-600" />Telegram account for direct messages</CardTitle></CardHeader><CardContent className="space-y-4">
        {directStatus?.connected ? <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm"><p className="font-semibold text-emerald-900">Account connected</p><p className="mt-1 text-emerald-800">Sender: {directStatus.accountPhone || "Telegram account"}</p><p className="mt-2 text-xs text-emerald-800">This account will send one-to-one messages to numbers Telegram can match.</p><Button className="mt-3" type="button" variant="outline" size="sm" disabled={directLoginBusy} onClick={() => void disconnectDirectAccount()}>{directLoginBusy ? "Disconnecting…" : "Disconnect Telegram account"}</Button></div> : <>
          <p className="text-sm text-slate-600">Connect a Telegram account you control. Telegram may deliver the login code in the Telegram app and may request your two-step verification password.</p>
          {!directStatus?.configured && <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">{directStatus?.error || "The direct-message service is not configured yet. Check the Render MTProto credentials and the production Cloudflare Worker settings."}</p>}
          {!directLoginStarted ? <div className="space-y-3"><label className="block text-sm font-medium">Your Telegram account phone number<input className="mt-1 w-full rounded-lg border px-3 py-2" value={directAccountPhone} onChange={event => setDirectAccountPhone(event.target.value)} placeholder="+639171234567" autoComplete="tel" /></label><Button type="button" variant="outline" disabled={!directStatus?.configured || directLoginBusy} onClick={() => void startDirectLogin()}>{directLoginBusy ? "Requesting code…" : "Send Telegram sign-in code"}</Button></div> : <form className="space-y-3" onSubmit={completeDirectLogin}><label className="block text-sm font-medium">Sign-in code<input className="mt-1 w-full rounded-lg border px-3 py-2" value={directLoginCode} onChange={event => setDirectLoginCode(event.target.value)} inputMode="numeric" autoComplete="one-time-code" /></label><label className="block text-sm font-medium">Two-step verification password <span className="font-normal text-slate-500">(if enabled on your account)</span><input className="mt-1 w-full rounded-lg border px-3 py-2" type="password" value={directPassword} onChange={event => setDirectPassword(event.target.value)} autoComplete="current-password" /></label><div className="flex gap-2"><Button type="submit" disabled={directLoginBusy || !directLoginCode.trim()}>{directLoginBusy ? "Connecting…" : "Verify and connect"}</Button><Button type="button" variant="outline" disabled={directLoginBusy} onClick={() => setDirectLoginStarted(false)}>Cancel</Button></div></form>}
        </>}
        <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">Telegram controls contact discovery and messaging limits. Send only to people who agreed to be contacted. Keep the bot subscriber option for recipients who started your bot.</p>
      </CardContent></Card>
    </div>}
    {section === "subscribers" && <Card><CardHeader><CardTitle>Registered Telegram subscribers ({subscribers.length})</CardTitle></CardHeader><CardContent><input aria-label="Search subscribers" className="mb-3 w-full rounded-lg border px-3 py-2 sm:max-w-md" value={subscriberSearch} onChange={e => setSubscriberSearch(e.target.value)} placeholder="Search name, username, applicant reference" /><div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr className="border-b text-slate-500"><th className="p-2">Applicant</th><th className="p-2">Nationality / experience</th><th className="p-2">Language</th><th className="p-2">Status</th><th className="p-2">Last interaction</th></tr></thead><tbody>{subscribers.filter(s => `${s.first_name} ${s.telegram_username || ""} ${s.applicant_id || ""}`.toLowerCase().includes(subscriberSearch.toLowerCase())).map(s => <tr key={s.id} className="border-b"><td className="p-2">{s.first_name}{s.telegram_username ? ` · @${s.telegram_username}` : ""}{s.applicant_id ? ` · ${s.applicant_id}` : ""}</td><td className="p-2">{s.nationality || "—"} / {s.experience_years ?? "—"} yrs</td><td className="p-2">{s.language_code || "—"}</td><td className="p-2">{s.subscription_status} / {s.consent_status}</td><td className="p-2">{s.last_interaction_at ? new Date(s.last_interaction_at).toLocaleString() : "—"}</td></tr>)}</tbody></table></div></CardContent></Card>}
    {section === "conversations" && <Card><CardHeader><CardTitle>Telegram conversations</CardTitle></CardHeader><CardContent className="space-y-3">{conversations.map(c => <article key={c.id} className="rounded-xl border p-4"><div className="flex flex-wrap justify-between gap-3"><strong>Telegram chat {c.telegram_chat_id}</strong><div className="flex items-center gap-2"><span className="text-sm text-slate-500">{c.conversation_status}</span><Button size="sm" variant="outline" onClick={async () => { const next = c.conversation_status === "human" ? "active" : "human"; const r = await fetch(`/api/telegram/conversations/${encodeURIComponent(c.id)}`, { method: "PATCH", headers: headers(), body: JSON.stringify({ conversationStatus: next }) }); if (!r.ok) toast.error("Could not change conversation assignment."); else { toast.success(next === "human" ? "Human handover enabled. You can now reply below." : "AI responses resumed."); await refresh(); } }}>{c.conversation_status === "human" ? "Resume AI" : "Take over"}</Button></div></div><div className="mt-3 space-y-2">{(c.telegram_messages || []).slice(-20).map((m, i) => <p key={`${c.id}-${i}`} className="whitespace-pre-wrap text-sm"><b className="capitalize">{m.sender_type}: </b>{m.message_text}</p>)}</div>{c.conversation_status === "human" ? <form className="mt-4 flex flex-col gap-2 sm:flex-row" onSubmit={(event) => { event.preventDefault(); void sendConversationReply(c); }}><textarea aria-label="Reply to applicant on Telegram" className="min-h-20 flex-1 rounded-lg border p-3 text-sm" maxLength={4096} placeholder="Write a reply to the applicant…" value={conversationReplies[c.id] || ""} onChange={(event) => setConversationReplies((current) => ({ ...current, [c.id]: event.target.value }))} /><Button type="submit" disabled={sendingReplyFor === c.id || !(conversationReplies[c.id] || "").trim()}><Send className="mr-2 h-4 w-4" />{sendingReplyFor === c.id ? "Sending…" : "Send reply"}</Button></form> : <p className="mt-3 text-xs text-slate-500">Take over this conversation to pause AI and reply as the agency.</p>}</article>)}{conversations.length === 0 && <p className="text-sm text-slate-500">No Telegram conversations yet.</p>}</CardContent></Card>}
    {section === "history" && <><Card><CardHeader><CardTitle>Broadcast history</CardTitle></CardHeader><CardContent className="space-y-3">{broadcasts.map(b => <article key={b.id} className="rounded-xl border p-4"><div className="flex flex-wrap justify-between gap-2"><strong>{b.title || b.message.slice(0, 90)}</strong><span className="text-sm capitalize text-slate-500">{b.status}</span></div><p className="mt-2 whitespace-pre-wrap text-sm">{b.message}</p><p className="mt-3 text-xs text-slate-500">{new Date(b.created_at).toLocaleString()}{b.status === "scheduled" && b.scheduled_at ? ` · Scheduled for ${new Intl.DateTimeFormat("en-SG", { timeZone: "Asia/Singapore", dateStyle: "medium", timeStyle: "short" }).format(new Date(b.scheduled_at))} Singapore time` : ""} · {b.total_recipients} recipients · {b.successful_count} sent · {b.failed_count} failed</p>{b.status === "scheduled" && <Button variant="outline" size="sm" className="mt-3 border-red-200 text-red-700 hover:bg-red-50" onClick={() => void cancelScheduledBroadcast(b)}>Cancel scheduled broadcast</Button>}</article>)}{broadcasts.length === 0 && <p className="text-sm text-slate-500">No bot broadcasts yet.</p>}</CardContent></Card><Card><CardHeader><CardTitle>Direct-message history</CardTitle></CardHeader><CardContent className="space-y-3">{(directStatus?.broadcasts || []).map(b => <article key={b.id} className="rounded-xl border p-4"><div className="flex flex-wrap justify-between gap-2"><strong className="truncate">{b.message.slice(0, 90)}</strong><span className="text-sm capitalize text-slate-500">{b.status}</span></div><p className="mt-2 whitespace-pre-wrap text-sm">{b.message}</p><p className="mt-3 text-xs text-slate-500">{new Date(b.created_at).toLocaleString()} · {b.total_recipients} numbers · {b.matched_count} found · {b.successful_count} sent · {b.failed_count} failed</p></article>)}{!directStatus?.broadcasts?.length && <p className="text-sm text-slate-500">No direct messages yet.</p>}</CardContent></Card></>}
    <p className="flex items-center gap-2 text-xs text-slate-500"><Activity className="h-4 w-4" />Telegram API and Make scenario health are checked through the backend.</p>
  </main>;
}
