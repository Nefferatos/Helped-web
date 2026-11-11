import { useCallback, useEffect, useState } from "react";
import { Activity, Bot, CheckCircle2, CircleAlert, Copy, ExternalLink, MessageCircle, Radio, RefreshCw, Send, Users } from "lucide-react";
import { toast } from "@/components/ui/sonner";
import { getAgencyAdminAuthHeaders } from "@/lib/agencyAdminAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Status = { configured: boolean; chatbotConfigured: boolean; botConnected: boolean; botUsername: string; invitationLink: string; totalSubscribers: number; activeSubscribers: number; blockedSubscribers: number; unsubscribedSubscribers: number };
type Subscriber = { id: string; applicant_id?: string | null; telegram_username?: string | null; first_name: string; language_code?: string | null; nationality?: string | null; applicant_status?: string | null; experience_years?: number | null; subscription_status: string; consent_status: string; last_interaction_at?: string | null };
type Conversation = { id: string; telegram_chat_id: string; conversation_status: string; last_message_at?: string | null; telegram_messages?: Array<{ sender_type: string; message_text: string; created_at: string }> };
type Broadcast = { id: string; title: string; message: string; status: string; total_recipients: number; successful_count: number; failed_count: number; created_at: string };

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

  const refresh = useCallback(async () => {
    try {
      const [s, p, c, b] = await Promise.all([
        fetch("/api/telegram/status", { headers: getAgencyAdminAuthHeaders(), cache: "no-store" }),
        fetch("/api/telegram/subscribers", { headers: getAgencyAdminAuthHeaders(), cache: "no-store" }),
        fetch("/api/telegram/conversations", { headers: getAgencyAdminAuthHeaders(), cache: "no-store" }),
        fetch("/api/telegram/broadcasts", { headers: getAgencyAdminAuthHeaders(), cache: "no-store" }),
      ]);
      const sj = await s.json(); const pj = await p.json(); const cj = await c.json(); const bj = await b.json();
      if (!s.ok) throw new Error(sj.error || "Could not read Telegram status.");
      setStatus(sj); setSubscribers(p.ok ? (pj.subscribers || []) : []); setConversations(c.ok ? (cj.conversations || []) : []); setBroadcasts(b.ok ? (bj.broadcasts || []) : []);
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

  const tabs = [{ id: "broadcast", label: "Broadcasting", icon: Send }, { id: "subscribers", label: "Subscribers", icon: Users }, { id: "conversations", label: "AI conversations", icon: MessageCircle }, { id: "history", label: "Broadcast history", icon: Activity }] as const;
  return <main className="mx-auto w-full max-w-7xl space-y-6 p-4 text-slate-900 md:p-8">
    <header className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-slate-200 bg-white p-6 text-black shadow-sm md:p-8">
      <div><p className="mb-2 flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-sky-700"><Send className="h-4 w-4" /> Telegram · Applicant communications</p><h1 className="text-3xl font-black text-black md:text-5xl">Telegram command center</h1><p className="mt-3 max-w-2xl text-slate-700">Broadcast to applicants who started the bot, and review incoming applicant conversations.</p></div>
      <Button variant="outline" onClick={() => void refresh()}><RefreshCw className="mr-2 h-4 w-4" />Refresh</Button>
    </header>
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {[["Bot connection", status?.botConnected ? `@${status.botUsername}` : "Not connected", status?.botConnected], ["Active subscribers", status?.activeSubscribers ?? "—", true], ["Blocked", status?.blockedSubscribers ?? "—", false], ["Unsubscribed", status?.unsubscribedSubscribers ?? "—", false]].map(([label, value, ok]) => <Card key={String(label)}><CardContent className="flex items-center gap-3 p-5">{ok ? <CheckCircle2 className="h-6 w-6 text-emerald-600" /> : <CircleAlert className="h-6 w-6 text-amber-600" />}<div><div className="text-sm text-slate-500">{label}</div><div className="font-bold">{value}</div></div></CardContent></Card>)}
    </section>
    <p className="text-sm text-slate-600">Registered Telegram subscribers: <strong>{status?.totalSubscribers ?? "—"}</strong></p>
    <section className="flex flex-wrap gap-2" role="tablist">{tabs.map(({ id, label, icon: Icon }) => <Button key={id} role="tab" aria-selected={section === id} variant={section === id ? "default" : "outline"} onClick={() => setSection(id)}><Icon className="mr-2 h-4 w-4" />{label}</Button>)}</section>
    {section === "broadcast" && <div className="grid gap-6 xl:grid-cols-2">
      <Card className="border-slate-200"><CardHeader><CardTitle className="flex items-center gap-2 text-black"><Radio className="h-5 w-5 text-sky-700" />Compose broadcast</CardTitle><p className="text-sm text-slate-700">Write the message your Telegram subscribers will receive. Add a photo, video, or document if needed.</p></CardHeader><CardContent className="space-y-5 text-black">
        <label className="block text-sm font-semibold text-black">Message<textarea aria-label="Broadcast message" className="mt-2 min-h-40 w-full rounded-xl border border-slate-300 bg-white p-3 text-black placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-700" value={message} onChange={e => setMessage(e.target.value.slice(0, 4096))} rows={7} maxLength={4096} placeholder="Write a recruitment update for Telegram applicants" /><span className="mt-1 block text-right text-xs font-normal text-slate-600">{message.length}/4,096</span></label>
        <label className="block text-sm font-semibold text-black">Attachment <span className="font-normal text-slate-600">(optional)</span><input className="mt-2 block w-full cursor-pointer rounded-xl border border-slate-300 bg-white p-2 text-sm text-black file:mr-3 file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:font-semibold file:text-black" type="file" accept="image/*,video/*,.pdf,.doc,.docx" onChange={e => setMediaFile(e.target.files?.[0] || null)} /><span className="mt-2 block text-xs font-normal text-slate-700">Photos, videos, PDF, or Word documents up to 10 MB. Files are staged in your private Telegram chat.</span></label>
        {mediaFile && <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-black"><span className="min-w-0 break-all">Selected: {mediaFile.name} <span className="text-slate-600">({Math.ceil(mediaFile.size / 1024)} KB)</span></span><button type="button" className="shrink-0 font-semibold text-sky-800 underline" onClick={() => setMediaFile(null)}>Remove</button></div>}
        <div><p className="mb-2 text-sm font-semibold text-black">Message preview</p><div className="max-w-xl overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 text-black shadow-sm"><div className="space-y-3 p-4"><p className="whitespace-pre-wrap break-words text-sm">{message || <span className="text-slate-600">Your message will appear here.</span>}</p>{mediaFile && mediaPreviewUrl && (mediaFile.type.startsWith("image/") ? <img src={mediaPreviewUrl} alt={`Preview of ${mediaFile.name}`} className="max-h-72 w-full rounded-xl object-contain" /> : mediaFile.type.startsWith("video/") ? <video src={mediaPreviewUrl} controls className="max-h-72 w-full rounded-xl bg-black" /> : <div className="rounded-xl border border-slate-200 bg-white p-3 text-sm font-medium text-black">📎 {mediaFile.name}</div>)}</div></div></div>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-4"><span className="text-sm text-slate-700">Eligible subscribers: <strong className="text-black">{status?.activeSubscribers ?? 0}</strong></span><Button onClick={() => void sendBroadcast()} disabled={sending || !message.trim() || !status?.configured || !status.activeSubscribers}><Send className="mr-2 h-4 w-4" />{sending ? "Queueing…" : "Queue broadcast"}</Button></div>
        {lastBroadcast && <p className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">{lastBroadcast}</p>}
        {!status?.configured && <p className="text-sm text-amber-700">Configure MAKE_TELEGRAM_BROADCAST_WEBHOOK_URL to enable delivery.</p>}
      </CardContent></Card>
      <Card><CardHeader><CardTitle className="flex items-center gap-2"><Bot className="h-5 w-5 text-sky-600" />Telegram registration</CardTitle></CardHeader><CardContent className="space-y-4">
        <p className="text-sm text-slate-600">Applicants must press Start on the bot to subscribe. Imported phone numbers are never used as recipients.</p>
        {status?.invitationLink ? <div className="flex flex-wrap items-center gap-2 rounded-xl bg-slate-50 p-4"><a className="break-all font-medium text-sky-700 underline" href={status.invitationLink} target="_blank" rel="noreferrer">{status.invitationLink}</a><Button variant="outline" size="sm" onClick={() => { void navigator.clipboard.writeText(status.invitationLink); toast.success("Invitation link copied."); }}><Copy className="mr-1 h-4 w-4" />Copy</Button><a href={status.invitationLink} target="_blank" rel="noreferrer" aria-label="Open Telegram invitation"><ExternalLink className="h-4 w-4" /></a></div> : <p className="rounded-xl bg-amber-50 p-4 text-sm">Set TELEGRAM_BOT_USERNAME and a valid TELEGRAM_BOT_TOKEN on the Worker.</p>}
        <div className="rounded-xl border p-4 text-sm"><p className="font-semibold">Registration flow</p><p className="mt-1 text-slate-600">/start records Telegram consent and the chat ID. /stop revokes consent immediately. Make handles AI replies using its existing approved knowledge base.</p></div>
      </CardContent></Card>
    </div>}
    {section === "subscribers" && <Card><CardHeader><CardTitle>Registered Telegram subscribers ({subscribers.length})</CardTitle></CardHeader><CardContent><input aria-label="Search subscribers" className="mb-3 w-full rounded-lg border px-3 py-2 sm:max-w-md" value={subscriberSearch} onChange={e => setSubscriberSearch(e.target.value)} placeholder="Search name, username, applicant reference" /><div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr className="border-b text-slate-500"><th className="p-2">Applicant</th><th className="p-2">Nationality / experience</th><th className="p-2">Language</th><th className="p-2">Status</th><th className="p-2">Last interaction</th></tr></thead><tbody>{subscribers.filter(s => `${s.first_name} ${s.telegram_username || ""} ${s.applicant_id || ""}`.toLowerCase().includes(subscriberSearch.toLowerCase())).map(s => <tr key={s.id} className="border-b"><td className="p-2">{s.first_name}{s.telegram_username ? ` · @${s.telegram_username}` : ""}{s.applicant_id ? ` · ${s.applicant_id}` : ""}</td><td className="p-2">{s.nationality || "—"} / {s.experience_years ?? "—"} yrs</td><td className="p-2">{s.language_code || "—"}</td><td className="p-2">{s.subscription_status} / {s.consent_status}</td><td className="p-2">{s.last_interaction_at ? new Date(s.last_interaction_at).toLocaleString() : "—"}</td></tr>)}</tbody></table></div></CardContent></Card>}
    {section === "conversations" && <Card><CardHeader><CardTitle>Telegram conversations</CardTitle></CardHeader><CardContent className="space-y-3">{conversations.map(c => <article key={c.id} className="rounded-xl border p-4"><div className="flex flex-wrap justify-between gap-3"><strong>Telegram chat {c.telegram_chat_id}</strong><div className="flex items-center gap-2"><span className="text-sm text-slate-500">{c.conversation_status}</span><Button size="sm" variant="outline" onClick={async () => { const next = c.conversation_status === "human" ? "active" : "human"; const r = await fetch(`/api/telegram/conversations/${encodeURIComponent(c.id)}`, { method: "PATCH", headers: headers(), body: JSON.stringify({ conversationStatus: next }) }); if (!r.ok) toast.error("Could not change conversation assignment."); else { toast.success(next === "human" ? "Human handover enabled. You can now reply below." : "AI responses resumed."); await refresh(); } }}>{c.conversation_status === "human" ? "Resume AI" : "Take over"}</Button></div></div><div className="mt-3 space-y-2">{(c.telegram_messages || []).slice(-20).map((m, i) => <p key={`${c.id}-${i}`} className="whitespace-pre-wrap text-sm"><b className="capitalize">{m.sender_type}: </b>{m.message_text}</p>)}</div>{c.conversation_status === "human" ? <form className="mt-4 flex flex-col gap-2 sm:flex-row" onSubmit={(event) => { event.preventDefault(); void sendConversationReply(c); }}><textarea aria-label="Reply to applicant on Telegram" className="min-h-20 flex-1 rounded-lg border p-3 text-sm" maxLength={4096} placeholder="Write a reply to the applicant…" value={conversationReplies[c.id] || ""} onChange={(event) => setConversationReplies((current) => ({ ...current, [c.id]: event.target.value }))} /><Button type="submit" disabled={sendingReplyFor === c.id || !(conversationReplies[c.id] || "").trim()}><Send className="mr-2 h-4 w-4" />{sendingReplyFor === c.id ? "Sending…" : "Send reply"}</Button></form> : <p className="mt-3 text-xs text-slate-500">Take over this conversation to pause AI and reply as the agency.</p>}</article>)}{conversations.length === 0 && <p className="text-sm text-slate-500">No Telegram conversations yet.</p>}</CardContent></Card>}
    {section === "history" && <Card><CardHeader><CardTitle>Broadcast history</CardTitle></CardHeader><CardContent className="space-y-3">{broadcasts.map(b => <article key={b.id} className="rounded-xl border p-4"><div className="flex flex-wrap justify-between gap-2"><strong>{b.title || b.message.slice(0, 90)}</strong><span className="text-sm capitalize text-slate-500">{b.status}</span></div><p className="mt-2 whitespace-pre-wrap text-sm">{b.message}</p><p className="mt-3 text-xs text-slate-500">{new Date(b.created_at).toLocaleString()} · {b.total_recipients} recipients · {b.successful_count} sent · {b.failed_count} failed</p></article>)}{broadcasts.length === 0 && <p className="text-sm text-slate-500">No broadcasts yet.</p>}</CardContent></Card>}
    <p className="flex items-center gap-2 text-xs text-slate-500"><Activity className="h-4 w-4" />Telegram API and Make scenario health are checked through the backend.</p>
  </main>;
}
