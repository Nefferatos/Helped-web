import { useCallback, useEffect, useRef, useState } from "react";
import {
  Bell,
  Bot,
  Briefcase,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  ClipboardCopy,
  Coffee,
  ExternalLink,
  Gift,
  Heart,
  Loader2,
  Megaphone,
  MessageSquare,
  Pencil,
  Phone,
  RefreshCw,
  Search,
  Sparkles,
  Tag,
  UserPlus,
  Users,
  Zap,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/sonner";
import { getAgencyAdminAuthHeaders } from "@/lib/agencyAdminAuth";

// ─── Types ────────────────────────────────────────────────────────────────────

type CampaignGoal = "new_arrivals" | "re_engage" | "promotion" | "holiday" | "follow_up" | "custom";
type CampaignTone = "professional" | "warm" | "urgent" | "casual";
type AudienceType = "all_clients" | "enquiry_leads" | "direct_sale_leads" | "all_contacts";

type Maid = { id: number; referenceCode: string; fullName: string; nationality: string; type: string; status?: string; isPublic?: boolean };
type Contact = { id: string; name: string; phone: string; email: string; source: string };
type MarketingMessage = { contactId: string; contactName: string; contactPhone: string; contactEmail: string; contactSource: string; message: string; whatsappLink: string; charCount: number; whatsappReady: boolean };
type Campaign = { id: string; goal: CampaignGoal; tone: CampaignTone; audienceType: AudienceType; maidReferences: string[]; messageTemplate: string; subject: string; messages: MarketingMessage[]; contactCount: number; whatsappReadyCount: number; emailOnlyCount: number; generatedAt: string; aiUsed: boolean };
type CampaignSummary = Omit<Campaign, "messages" | "messageTemplate"> & { maidReferences: string[] };

// ─── Config ───────────────────────────────────────────────────────────────────

const GOALS: { value: CampaignGoal; label: string; desc: string; icon: React.ElementType; color: string; bg: string }[] = [
  { value: "new_arrivals", label: "New Arrivals",    desc: "Promote newly available helpers",          icon: UserPlus,     color: "text-emerald-700", bg: "bg-emerald-50 border-emerald-200" },
  { value: "re_engage",    label: "Re-engage",        desc: "Win back past enquiries & leads",          icon: RefreshCw,    color: "text-blue-700",    bg: "bg-blue-50 border-blue-200" },
  { value: "promotion",    label: "Promotion",         desc: "Announce a limited-time offer",            icon: Tag,          color: "text-orange-700",  bg: "bg-orange-50 border-orange-200" },
  { value: "holiday",      label: "Holiday Greeting",  desc: "Festive outreach + availability",          icon: Gift,         color: "text-pink-700",    bg: "bg-pink-50 border-pink-200" },
  { value: "follow_up",    label: "Follow-up",         desc: "Follow up on pending inquiries",           icon: Bell,         color: "text-violet-700",  bg: "bg-violet-50 border-violet-200" },
  { value: "custom",       label: "Custom",             desc: "Free-form AI-generated outreach",         icon: Pencil,       color: "text-slate-700",   bg: "bg-slate-50 border-slate-200" },
];

const TONES: { value: CampaignTone; label: string; desc: string; icon: React.ElementType; color: string; bg: string }[] = [
  { value: "warm",         label: "Warm & Friendly",   desc: "Personal, caring, approachable",           icon: Heart,        color: "text-rose-700",    bg: "bg-rose-50 border-rose-200" },
  { value: "professional", label: "Professional",       desc: "Formal, polished, credible",               icon: Briefcase,    color: "text-blue-700",    bg: "bg-blue-50 border-blue-200" },
  { value: "casual",       label: "Casual",             desc: "Relaxed, conversational, light",           icon: Coffee,       color: "text-amber-700",   bg: "bg-amber-50 border-amber-200" },
  { value: "urgent",       label: "Urgent",             desc: "Direct, action-oriented, time-sensitive",  icon: Zap,          color: "text-red-700",     bg: "bg-red-50 border-red-200" },
];

const AUDIENCES: { value: AudienceType; label: string; desc: string; icon: React.ElementType }[] = [
  { value: "all_contacts",     label: "All Contacts",      desc: "Clients + enquiries + leads",         icon: Users },
  { value: "all_clients",      label: "Registered Clients", desc: "Signed-up client accounts",          icon: UserPlus },
  { value: "enquiry_leads",    label: "Enquiry Leads",      desc: "People who submitted enquiries",     icon: MessageSquare },
  { value: "direct_sale_leads",label: "Direct Sale Leads",  desc: "Direct sale assignment contacts",   icon: Tag },
];

const GOAL_LABELS: Record<CampaignGoal, string> = { new_arrivals: "New Arrivals", re_engage: "Re-engage", promotion: "Promotion", holiday: "Holiday", follow_up: "Follow-up", custom: "Custom" };
const TONE_LABELS: Record<CampaignTone, string>  = { professional: "Professional", warm: "Warm", urgent: "Urgent", casual: "Casual" };
const AUD_LABELS:  Record<AudienceType, string>  = { all_contacts: "All Contacts", all_clients: "Clients", enquiry_leads: "Enquiries", direct_sale_leads: "Leads" };

const SOURCE_STYLE: Record<string, { label: string; cls: string }> = {
  client:       { label: "Client",   cls: "border-blue-200 bg-blue-50 text-blue-700" },
  enquiry:      { label: "Enquiry",  cls: "border-violet-200 bg-violet-50 text-violet-700" },
  direct_sale:  { label: "Lead",     cls: "border-amber-200 bg-amber-50 text-amber-700" },
};

const INNER_STEPS = ["goal", "tone", "audience", "helpers", "options"] as const;
type InnerStep = typeof INNER_STEPS[number];
const STEP_LABEL: Record<InnerStep, string> = { goal: "Goal", tone: "Tone", audience: "Audience", helpers: "Helpers", options: "Options" };

// ─── Utility components ───────────────────────────────────────────────────────

const initials = (name: string) =>
  name.split(" ").filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase() || "?";

const CopyBtn = ({ text, size = "sm" }: { text: string; size?: "sm" | "xs" }) => {
  const [done, setDone] = useState(false);
  const copy = async () => { await navigator.clipboard.writeText(text); setDone(true); setTimeout(() => setDone(false), 1800); };
  const sz = size === "xs" ? "h-6 w-6" : "h-7 w-7";
  return (
    <button onClick={copy} title="Copy" className={`${sz} flex items-center justify-center rounded-md border bg-muted/60 text-muted-foreground transition hover:bg-muted hover:text-foreground`}>
      {done ? <Check className="h-3 w-3 text-emerald-600" /> : <ClipboardCopy className="h-3 w-3" />}
    </button>
  );
};

// ─── Message card ─────────────────────────────────────────────────────────────

const MessageCard = ({ msg }: { msg: MarketingMessage }) => {
  const [open, setOpen] = useState(false);
  const src = SOURCE_STYLE[msg.contactSource] ?? { label: msg.contactSource, cls: "border-slate-200 bg-slate-50 text-slate-600" };
  const overLimit = msg.charCount > 300;

  return (
    <div className={`rounded-xl border bg-card transition hover:shadow-sm ${open ? "shadow-sm" : ""}`}>
      <div className="flex items-center gap-3 p-3.5">
        {/* Avatar */}
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary/20 to-primary/40 text-xs font-bold text-primary">
          {initials(msg.contactName)}
        </div>

        {/* Info */}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="font-semibold text-sm text-foreground truncate">{msg.contactName}</span>
            <span className={`inline-flex rounded-full border px-1.5 py-0.5 text-[9px] font-bold ${src.cls}`}>{src.label}</span>
            {overLimit && (
              <span className="inline-flex rounded-full border border-amber-200 bg-amber-50 px-1.5 py-0.5 text-[9px] font-bold text-amber-700">
                {msg.charCount} chars
              </span>
            )}
          </div>
          <div className="mt-0.5 flex items-center gap-3 text-xs text-muted-foreground">
            {msg.contactPhone && <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{msg.contactPhone}</span>}
            {msg.contactEmail && <span className="truncate max-w-[160px]">{msg.contactEmail}</span>}
          </div>
        </div>

        {/* Actions */}
        <div className="flex shrink-0 items-center gap-1.5">
          <CopyBtn text={msg.message} />
          {msg.whatsappLink ? (
            <a href={msg.whatsappLink} target="_blank" rel="noopener noreferrer"
              className="flex h-7 items-center gap-1.5 rounded-md border border-emerald-300 bg-emerald-50 px-2.5 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100">
              <ExternalLink className="h-3 w-3" /> Send
            </a>
          ) : (
            <span className="flex h-7 items-center rounded-md border border-dashed px-2.5 text-xs text-muted-foreground/60">No phone</span>
          )}
          <button onClick={() => setOpen((o) => !o)} className="flex h-7 w-7 items-center justify-center rounded-md border text-muted-foreground hover:bg-muted">
            {open ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </button>
        </div>
      </div>

      {open && (
        <div className="border-t bg-muted/30 px-3.5 py-3">
          <p className="text-xs leading-relaxed text-foreground whitespace-pre-wrap">{msg.message}</p>
          <div className="mt-2 flex items-center justify-between text-[10px] text-muted-foreground">
            <span>{msg.charCount} characters{overLimit ? " — consider shortening for WhatsApp previews" : ""}</span>
            <CopyBtn text={msg.message} size="xs" />
          </div>
        </div>
      )}
    </div>
  );
};

// ─── Main page ────────────────────────────────────────────────────────────────

export default function AiDirectMarketingPage() {
  // Builder state
  const [goal, setGoal]             = useState<CampaignGoal>("new_arrivals");
  const [tone, setTone]             = useState<CampaignTone>("warm");
  const [audienceType, setAudience] = useState<AudienceType>("all_contacts");
  const [customNote, setNote]       = useState("");
  const [selectedMaids, setSelected]= useState<string[]>([]);
  const [helperSearch, setHSearch]  = useState("");
  const [innerStep, setInner]       = useState<InnerStep>("goal");

  // Data
  const [maids, setMaids]           = useState<Maid[]>([]);
  const [maidsLoading, setML]       = useState(true);
  const [contacts, setContacts]     = useState<Contact[]>([]);
  const [contactsLoading, setCL]    = useState(false);
  const [contactsError, setCErr]    = useState(false);
  const [audienceCounts, setCounts] = useState<Partial<Record<AudienceType, number>>>({});

  // Campaign
  const [campaign, setCampaign]     = useState<Campaign | null>(null);
  const [generating, setGenerating] = useState(false);
  const [msgFilter, setMsgFilter]   = useState<"all" | "client" | "enquiry" | "direct_sale">("all");
  const resultsRef = useRef<HTMLDivElement>(null);

  // History
  const [history, setHistory]       = useState<CampaignSummary[]>([]);
  const [outerTab, setOuter]        = useState("builder");

  // Load maids
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/maids", { headers: getAgencyAdminAuthHeaders() });
        if (!res.ok) return;
        const d = (await res.json()) as { maids?: Maid[] };
        setMaids((d.maids ?? []).filter((m) => !/unavailable|hidden|archived/i.test(m.status ?? "")));
      } catch { /* ignore */ } finally { setML(false); }
    })();
  }, []);

  // Pre-load counts for all audience types
  useEffect(() => {
    const types: AudienceType[] = ["all_contacts", "all_clients", "enquiry_leads", "direct_sale_leads"];
    types.forEach(async (t) => {
      try {
        const res = await fetch(`/api/ai/direct-marketing/audience?type=${t}`, { headers: getAgencyAdminAuthHeaders() });
        if (!res.ok) return;
        const d = (await res.json()) as { total?: number };
        setCounts((prev) => ({ ...prev, [t]: d.total ?? 0 }));
      } catch { /* ignore */ }
    });
  }, []);

  // Load contacts for selected audience
  const loadContacts = useCallback(async (type: AudienceType) => {
    setCL(true);
    setCErr(false);
    try {
      const res = await fetch(`/api/ai/direct-marketing/audience?type=${type}`, { headers: getAgencyAdminAuthHeaders() });
      if (!res.ok) { setCErr(true); return; }
      const d = (await res.json()) as { contacts?: Contact[] };
      setContacts(d.contacts ?? []);
      setCounts((prev) => ({ ...prev, [type]: d.contacts?.length ?? 0 }));
    } catch { setCErr(true); } finally { setCL(false); }
  }, []);

  useEffect(() => { void loadContacts(audienceType); }, [audienceType, loadContacts]);

  const loadHistory = useCallback(async () => {
    try {
      const res = await fetch("/api/ai/direct-marketing/campaigns", { headers: getAgencyAdminAuthHeaders() });
      if (!res.ok) return;
      const d = (await res.json()) as { campaigns?: CampaignSummary[] };
      setHistory(d.campaigns ?? []);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => { void loadHistory(); }, [loadHistory]);

  const toggleMaid = (ref: string) =>
    setSelected((p) => p.includes(ref) ? p.filter((r) => r !== ref) : [...p, ref]);

  const generate = async () => {
    setGenerating(true);
    setCampaign(null);
    try {
      const res = await fetch("/api/ai/direct-marketing/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAgencyAdminAuthHeaders() },
        body: JSON.stringify({ goal, tone, maidReferences: selectedMaids, audienceType, customNote }),
      });
      const d = (await res.json()) as { campaign?: Campaign; error?: string };
      if (!res.ok) throw new Error(d.error ?? `Failed (${res.status})`);
      setCampaign(d.campaign ?? null);
      setMsgFilter("all");
      await loadHistory();
      toast.success(`${d.campaign?.contactCount ?? 0} messages generated`);
      setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 100);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Generation failed");
    } finally { setGenerating(false); }
  };

  const publicMaids = maids.filter((m) => m.isPublic !== false);
  const filteredMaids = publicMaids.filter((m) =>
    !helperSearch || m.fullName.toLowerCase().includes(helperSearch.toLowerCase()) ||
    m.referenceCode.toLowerCase().includes(helperSearch.toLowerCase()) ||
    m.nationality?.toLowerCase().includes(helperSearch.toLowerCase())
  );
  const contactCount = contacts.length;
  const goalCfg = GOALS.find((g) => g.value === goal)!;
  const toneCfg  = TONES.find((t) => t.value === tone)!;

  const filteredMessages = campaign?.messages.filter(
    (m) => msgFilter === "all" || m.contactSource === msgFilter
  ) ?? [];

  const stepIdx = INNER_STEPS.indexOf(innerStep);
  const nextStep = () => { if (stepIdx < INNER_STEPS.length - 1) setInner(INNER_STEPS[stepIdx + 1]); };

  return (
    <div className="mx-auto max-w-5xl space-y-4">

      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-2xl border bg-gradient-to-br from-pink-600 via-rose-500 to-orange-500 p-6 text-white shadow-lg">
        <div className="absolute -right-8 -top-8 h-40 w-40 rounded-full bg-white/10" />
        <div className="absolute -bottom-4 right-16 h-24 w-24 rounded-full bg-white/10" />
        <div className="relative">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/20">
              <Megaphone className="h-5 w-5 text-white" />
            </div>
            <p className="text-xs font-semibold uppercase tracking-widest text-white/80">AI Marketing Console</p>
          </div>
          <h1 className="mt-2 text-3xl font-extrabold tracking-tight">AI Direct Marketing</h1>
          <p className="mt-1.5 max-w-xl text-sm leading-relaxed text-white/85">
            Generate personalised WhatsApp campaigns for every client and lead in seconds.
            Configure your goal, pick your helpers, and let AI write the perfect message.
          </p>

          {/* Quick stats */}
          <div className="mt-4 flex flex-wrap gap-3">
            {[
              { label: "All Contacts", value: audienceCounts.all_contacts ?? "…" },
              { label: "Clients",      value: audienceCounts.all_clients ?? "…" },
              { label: "Enquiries",    value: audienceCounts.enquiry_leads ?? "…" },
              { label: "Leads",        value: audienceCounts.direct_sale_leads ?? "…" },
            ].map((s) => (
              <div key={s.label} className="rounded-xl bg-white/15 px-3 py-1.5 text-center backdrop-blur-sm">
                <p className="text-lg font-bold leading-none">{s.value}</p>
                <p className="mt-0.5 text-[10px] font-medium text-white/75">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Outer tabs ────────────────────────────────────────────────────── */}
      <Tabs value={outerTab} onValueChange={setOuter} className="space-y-4">
        <div className="rounded-xl border bg-card px-4 py-2.5 shadow-sm">
          <TabsList className="h-9 gap-1 bg-muted/50 p-1">
            <TabsTrigger value="builder" className="gap-2 text-sm data-[state=active]:bg-background data-[state=active]:shadow-sm">
              <Sparkles className="h-4 w-4" /> Campaign Builder
            </TabsTrigger>
            <TabsTrigger value="history" className="gap-2 text-sm data-[state=active]:bg-background data-[state=active]:shadow-sm">
              <MessageSquare className="h-4 w-4" /> History
              {history.length > 0 && (
                <span className="rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-bold text-primary-foreground">{history.length}</span>
              )}
            </TabsTrigger>
          </TabsList>
        </div>

        {/* ── Builder ───────────────────────────────────────────────────── */}
        <TabsContent value="builder" className="space-y-4">

          {/* Inner step tabs */}
          <div className="overflow-hidden rounded-2xl border bg-card shadow-sm">
            <Tabs value={innerStep} onValueChange={(v) => setInner(v as InnerStep)}>

              {/* Step bar */}
              <div className="border-b bg-muted/30 px-2 pt-0">
                <TabsList className="h-auto gap-0 rounded-none bg-transparent p-0 w-full justify-start overflow-x-auto">
                  {INNER_STEPS.map((step, i) => (
                    <TabsTrigger
                      key={step}
                      value={step}
                      className="group relative h-11 gap-2 rounded-none border-b-2 border-transparent px-4 text-sm font-medium text-muted-foreground transition-none data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=active]:shadow-none"
                    >
                      <span className="flex h-5 w-5 items-center justify-center rounded-full border-2 border-current text-[10px] font-bold transition group-data-[state=active]:bg-primary group-data-[state=active]:border-primary group-data-[state=active]:text-primary-foreground">
                        {i + 1}
                      </span>
                      {STEP_LABEL[step]}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </div>

              {/* ① Goal */}
              <TabsContent value="goal" className="p-6">
                <p className="mb-1 text-base font-semibold text-foreground">What is the purpose of this campaign?</p>
                <p className="mb-5 text-sm text-muted-foreground">Choose a goal — the AI will tailor tone, copy, and structure accordingly.</p>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {GOALS.map((g) => {
                    const Icon = g.icon;
                    const active = goal === g.value;
                    return (
                      <button key={g.value} onClick={() => setGoal(g.value)}
                        className={`group relative rounded-xl border p-4 text-left transition ${active ? "border-primary bg-primary/5 ring-2 ring-primary shadow-sm" : "border-border hover:border-primary/40 hover:bg-muted/30"}`}
                      >
                        <div className={`mb-3 flex h-9 w-9 items-center justify-center rounded-lg border ${active ? "bg-primary/10 border-primary/30" : g.bg}`}>
                          <Icon className={`h-4.5 w-4.5 ${active ? "text-primary" : g.color}`} />
                        </div>
                        <p className="font-semibold text-foreground">{g.label}</p>
                        <p className="mt-0.5 text-xs text-muted-foreground">{g.desc}</p>
                        {active && <Check className="absolute right-3 top-3 h-4 w-4 text-primary" />}
                      </button>
                    );
                  })}
                </div>
                <div className="mt-5 flex justify-end">
                  <Button onClick={nextStep} className="gap-2">Next: Tone <ChevronRight className="h-4 w-4" /></Button>
                </div>
              </TabsContent>

              {/* ② Tone */}
              <TabsContent value="tone" className="p-6">
                <p className="mb-1 text-base font-semibold text-foreground">How should your message sound?</p>
                <p className="mb-5 text-sm text-muted-foreground">The tone shapes the writing style — from formal and polished to casual and conversational.</p>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {TONES.map((t) => {
                    const Icon = t.icon;
                    const active = tone === t.value;
                    return (
                      <button key={t.value} onClick={() => setTone(t.value)}
                        className={`group relative rounded-xl border p-4 text-left transition ${active ? "border-primary bg-primary/5 ring-2 ring-primary shadow-sm" : "border-border hover:border-primary/40 hover:bg-muted/30"}`}
                      >
                        <div className={`mb-3 flex h-9 w-9 items-center justify-center rounded-lg border ${active ? "bg-primary/10 border-primary/30" : t.bg}`}>
                          <Icon className={`h-4.5 w-4.5 ${active ? "text-primary" : t.color}`} />
                        </div>
                        <p className="font-semibold text-foreground">{t.label}</p>
                        <p className="mt-0.5 text-xs text-muted-foreground">{t.desc}</p>
                        {active && <Check className="absolute right-3 top-3 h-4 w-4 text-primary" />}
                      </button>
                    );
                  })}
                </div>
                <div className="mt-5 flex justify-end">
                  <Button onClick={nextStep} className="gap-2">Next: Audience <ChevronRight className="h-4 w-4" /></Button>
                </div>
              </TabsContent>

              {/* ③ Audience */}
              <TabsContent value="audience" className="p-6">
                <div className="mb-5 flex items-start justify-between">
                  <div>
                    <p className="text-base font-semibold text-foreground">Who will receive the messages?</p>
                    <p className="text-sm text-muted-foreground">Select a contact pool. Duplicates are automatically removed.</p>
                  </div>
                  {contactsLoading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                </div>

                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {AUDIENCES.map((a) => {
                    const Icon = a.icon;
                    const active = audienceType === a.value;
                    const count = audienceCounts[a.value];
                    return (
                      <button key={a.value} onClick={() => setAudience(a.value)}
                        className={`relative rounded-xl border p-4 text-left transition ${active ? "border-primary bg-primary/5 ring-2 ring-primary shadow-sm" : "border-border hover:border-primary/40 hover:bg-muted/30"}`}
                      >
                        <div className="mb-2 flex items-center justify-between">
                          <Icon className={`h-4 w-4 ${active ? "text-primary" : "text-muted-foreground"}`} />
                          {count !== undefined && (
                            <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${active ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"}`}>{count}</span>
                          )}
                        </div>
                        <p className="font-semibold text-sm text-foreground">{a.label}</p>
                        <p className="mt-0.5 text-xs text-muted-foreground">{a.desc}</p>
                        {active && <Check className="absolute right-3 top-3 h-4 w-4 text-primary" />}
                      </button>
                    );
                  })}
                </div>

                {/* Contact preview table */}
                {contacts.length > 0 && (
                  <div className="mt-5 overflow-hidden rounded-xl border">
                    <div className="flex items-center justify-between border-b bg-muted/40 px-4 py-2">
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        {contacts.length} contacts in this audience
                      </p>
                      <div className="flex gap-1.5 text-[10px] font-semibold">
                        <span className="rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-blue-700">{contacts.filter((c) => c.source === "client").length} clients</span>
                        <span className="rounded-full border border-violet-200 bg-violet-50 px-2 py-0.5 text-violet-700">{contacts.filter((c) => c.source === "enquiry").length} enquiries</span>
                        <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-amber-700">{contacts.filter((c) => c.source === "direct_sale").length} leads</span>
                      </div>
                    </div>
                    <div className="max-h-52 overflow-y-auto divide-y">
                      {contacts.slice(0, 25).map((c) => {
                        const s = SOURCE_STYLE[c.source] ?? { label: c.source, cls: "border-slate-200 bg-slate-50 text-slate-600" };
                        return (
                          <div key={c.id} className="flex items-center gap-3 px-4 py-2.5 text-sm">
                            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-bold text-muted-foreground">
                              {initials(c.name)}
                            </div>
                            <span className={`shrink-0 rounded-full border px-1.5 py-0.5 text-[9px] font-bold ${s.cls}`}>{s.label}</span>
                            <span className="min-w-0 flex-1 truncate font-medium text-foreground">{c.name}</span>
                            <span className="shrink-0 text-xs text-muted-foreground">{c.phone || c.email}</span>
                            {c.phone && <span className="shrink-0 rounded-full bg-emerald-100 px-1.5 py-0.5 text-[9px] font-bold text-emerald-700">WA</span>}
                          </div>
                        );
                      })}
                      {contacts.length > 25 && (
                        <div className="px-4 py-2.5 text-xs text-muted-foreground">+{contacts.length - 25} more contacts</div>
                      )}
                    </div>
                  </div>
                )}

                {contacts.length === 0 && !contactsLoading && !contactsError && (
                  <div className="mt-5 rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
                    No contacts found for this audience. Add clients or enquiry leads first.
                  </div>
                )}

                {contactsError && (
                  <div className="mt-5 rounded-xl border border-red-200 bg-red-50 p-5 text-center">
                    <p className="text-sm font-semibold text-red-700">Could not load contacts</p>
                    <p className="mt-1 text-xs text-red-600">The request failed — your session may have expired or the server is unavailable.</p>
                    <button
                      onClick={() => loadContacts(audienceType)}
                      className="mt-3 rounded-lg border border-red-300 bg-white px-4 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-50"
                    >
                      Retry
                    </button>
                  </div>
                )}

                <div className="mt-5 flex justify-end">
                  <Button onClick={nextStep} className="gap-2">Next: Helpers <ChevronRight className="h-4 w-4" /></Button>
                </div>
              </TabsContent>

              {/* ④ Helpers */}
              <TabsContent value="helpers" className="p-6">
                <div className="mb-5 flex items-start justify-between gap-4">
                  <div>
                    <p className="text-base font-semibold text-foreground">Feature specific helpers</p>
                    <p className="text-sm text-muted-foreground">
                      Select helpers to highlight. Leave blank and the AI picks from all available profiles.
                    </p>
                  </div>
                  {selectedMaids.length > 0 && (
                    <button onClick={() => setSelected([])} className="shrink-0 rounded-lg border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground">
                      Clear {selectedMaids.length}
                    </button>
                  )}
                </div>

                {/* Search */}
                <div className="relative mb-3">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    value={helperSearch}
                    onChange={(e) => setHSearch(e.target.value)}
                    placeholder="Search by name, reference, nationality…"
                    className="h-9 w-full rounded-lg border bg-background pl-9 pr-3 text-sm outline-none placeholder:text-muted-foreground/60 focus:ring-2 focus:ring-ring"
                  />
                </div>

                {maidsLoading ? (
                  <div className="flex items-center justify-center py-12"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
                ) : filteredMaids.length === 0 ? (
                  <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">No matching helpers.</div>
                ) : (
                  <div className="overflow-hidden rounded-xl border">
                    <div className="border-b bg-muted/40 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      {filteredMaids.length} helper{filteredMaids.length !== 1 ? "s" : ""}
                      {selectedMaids.length > 0 && ` — ${selectedMaids.length} selected`}
                    </div>
                    <div className="max-h-80 overflow-y-auto divide-y">
                      {filteredMaids.map((m) => {
                        const sel = selectedMaids.includes(m.referenceCode);
                        return (
                          <button key={m.referenceCode} onClick={() => toggleMaid(m.referenceCode)}
                            className={`flex w-full items-center gap-3 px-4 py-3 text-left transition ${sel ? "bg-primary/5" : "hover:bg-muted/30"}`}
                          >
                            <div className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 transition ${sel ? "border-primary bg-primary" : "border-muted-foreground/30"}`}>
                              {sel && <Check className="h-3 w-3 text-primary-foreground" />}
                            </div>
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-muted to-muted-foreground/20 text-xs font-bold text-foreground">
                              {initials(m.fullName)}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-semibold text-foreground">{m.fullName}</p>
                              <p className="truncate text-xs text-muted-foreground">{m.referenceCode} · {m.nationality} · {m.type}</p>
                            </div>
                            {sel && <span className="shrink-0 rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">Featured</span>}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div className="mt-5 flex justify-end">
                  <Button onClick={nextStep} className="gap-2">Next: Options <ChevronRight className="h-4 w-4" /></Button>
                </div>
              </TabsContent>

              {/* ⑤ Options */}
              <TabsContent value="options" className="p-6">
                <p className="mb-1 text-base font-semibold text-foreground">Additional instructions (optional)</p>
                <p className="mb-4 text-sm text-muted-foreground">
                  Give the AI a specific instruction — mention a promo, focus on a skill, request shorter copy, etc.
                </p>
                <Textarea
                  value={customNote}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="E.g. Mention our June placement fee discount. Focus on elderly care helpers. Keep under 200 characters."
                  rows={5}
                  maxLength={500}
                  className="text-sm"
                />
                <div className="mt-1.5 flex items-center justify-between text-xs text-muted-foreground">
                  <span>{customNote.length > 400 ? `${500 - customNote.length} characters left` : ""}</span>
                  <span>{customNote.length}/500</span>
                </div>

                {/* Quick suggestions */}
                <div className="mt-4">
                  <p className="mb-2 text-xs font-semibold text-muted-foreground">Quick suggestions</p>
                  <div className="flex flex-wrap gap-2">
                    {[
                      "Keep it under 200 characters",
                      "Focus on elderly care experience",
                      "Mention transfer helpers available",
                      "Highlight Filipino helpers",
                      "Include availability date",
                    ].map((s) => (
                      <button key={s} onClick={() => setNote((n) => n ? `${n} ${s}` : s)}
                        className="rounded-full border px-3 py-1 text-xs text-muted-foreground transition hover:border-primary/40 hover:text-primary">
                        + {s}
                      </button>
                    ))}
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </div>

          {/* ── Summary + Generate bar ──────────────────────────────────── */}
          <div className="rounded-2xl border bg-card p-4 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Campaign:</span>
                {[
                  { label: GOAL_LABELS[goal],    Icon: goalCfg.icon },
                  { label: TONE_LABELS[tone],    Icon: toneCfg.icon },
                  { label: AUD_LABELS[audienceType], Icon: Users },
                ].map(({ label, Icon }) => (
                  <span key={label} className="flex items-center gap-1.5 rounded-lg border bg-muted/50 px-2.5 py-1 text-xs font-semibold text-foreground">
                    <Icon className="h-3.5 w-3.5 text-muted-foreground" /> {label}
                  </span>
                ))}
                {selectedMaids.length > 0 && (
                  <span className="rounded-lg border border-primary/30 bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
                    {selectedMaids.length} helper{selectedMaids.length !== 1 ? "s" : ""} featured
                  </span>
                )}
                {contactsError ? (
                  <button onClick={() => loadContacts(audienceType)} className="flex items-center gap-1 text-xs font-medium text-red-600 hover:underline">
                    <RefreshCw className="h-3 w-3" /> Failed to load — retry
                  </button>
                ) : (
                  <span className="text-xs text-muted-foreground">
                    {contactsLoading ? "Loading contacts…" : `${contactCount} contact${contactCount !== 1 ? "s" : ""}`}
                  </span>
                )}
              </div>

              <Button onClick={generate} disabled={generating || contactCount === 0} size="lg"
                className="gap-2 bg-gradient-to-r from-pink-600 to-rose-500 font-bold text-white shadow-md hover:from-pink-700 hover:to-rose-600">
                {generating
                  ? <><Loader2 className="h-4 w-4 animate-spin" /> Generating…</>
                  : <><Sparkles className="h-4 w-4" /> Generate {contactCount} Messages</>
                }
              </Button>
            </div>
          </div>

          {/* ── Generated results ──────────────────────────────────────── */}
          {campaign && (
            <div ref={resultsRef} className="overflow-hidden rounded-2xl border bg-card shadow-sm">

              {/* Results header */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-b bg-emerald-50/50 px-6 py-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-100">
                    <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-foreground">{campaign.messages.length} Messages Ready</span>
                      {campaign.aiUsed
                        ? <Badge className="border-violet-200 bg-violet-50 text-violet-700">AI Generated</Badge>
                        : <Badge className="border-slate-200 bg-slate-50 text-slate-600">Template</Badge>
                      }
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {GOAL_LABELS[campaign.goal]} · {TONE_LABELS[campaign.tone]} · {new Date(campaign.generatedAt).toLocaleString()}
                    </p>
                  </div>
                </div>
                <Button variant="outline" size="sm" onClick={generate} disabled={generating} className="gap-1.5">
                  <RefreshCw className="h-3.5 w-3.5" /> Regenerate
                </Button>
              </div>

              {/* Stats row */}
              <div className="grid grid-cols-3 divide-x border-b bg-muted/20">
                {[
                  { label: "Total Messages",     value: campaign.contactCount,       color: "text-foreground" },
                  { label: "WhatsApp Ready",      value: campaign.whatsappReadyCount, color: "text-emerald-600" },
                  { label: "Copy Only",           value: campaign.emailOnlyCount,     color: "text-muted-foreground" },
                ].map((s) => (
                  <div key={s.label} className="px-4 py-3 text-center">
                    <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
                    <p className="text-[11px] text-muted-foreground">{s.label}</p>
                  </div>
                ))}
              </div>

              <div className="p-5 space-y-5">
                {/* Template card */}
                <div className="rounded-xl border-2 border-dashed border-primary/25 bg-primary/5 p-4">
                  <div className="mb-2 flex items-center justify-between">
                    <p className="text-xs font-bold uppercase tracking-widest text-primary">Message Template</p>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-muted-foreground">{campaign.messageTemplate.length} chars</span>
                      <CopyBtn text={campaign.messageTemplate} />
                    </div>
                  </div>
                  <p className="text-sm leading-relaxed text-foreground whitespace-pre-wrap">{campaign.messageTemplate}</p>
                  <p className="mt-2 text-[10px] text-muted-foreground">
                    <code className="rounded bg-muted px-1">{"{{name}}"}</code> and <code className="rounded bg-muted px-1">{"{{agencyPhone}}"}</code> are substituted per contact
                  </p>
                </div>

                {/* Source filter tabs + bulk copy */}
                {campaign.messages.length > 0 && (
                  <Tabs value={msgFilter} onValueChange={(v) => setMsgFilter(v as typeof msgFilter)}>
                    <div className="flex items-center justify-between border-b pb-0">
                      <TabsList className="h-auto gap-0 rounded-none bg-transparent p-0">
                        {(["all", "client", "enquiry", "direct_sale"] as const)
                          .map((src) => {
                            const count = src === "all" ? campaign.messages.length : campaign.messages.filter((m) => m.contactSource === src).length;
                            if (src !== "all" && count === 0) return null;
                            const labels = { all: "All", client: "Clients", enquiry: "Enquiries", direct_sale: "Leads" };
                            return (
                              <TabsTrigger key={src} value={src}
                                className="h-9 rounded-none border-b-2 border-transparent px-4 text-sm data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=active]:shadow-none">
                                {labels[src]} <span className="ml-1.5 rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-bold text-muted-foreground">{count}</span>
                              </TabsTrigger>
                            );
                          })}
                      </TabsList>

                      <button
                        onClick={async () => {
                          const all = filteredMessages.map((m) => m.message).join("\n\n---\n\n");
                          await navigator.clipboard.writeText(all);
                          toast.success(`Copied ${filteredMessages.length} messages`);
                        }}
                        className="mb-1 flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium text-muted-foreground transition hover:border-foreground/40 hover:text-foreground"
                      >
                        <ClipboardCopy className="h-3.5 w-3.5" /> Copy all
                      </button>
                    </div>

                    {(["all", "client", "enquiry", "direct_sale"] as const).map((src) => (
                      <TabsContent key={src} value={src} className="mt-4 space-y-2">
                        {campaign.messages
                          .filter((m) => src === "all" || m.contactSource === src)
                          .map((msg) => <MessageCard key={msg.contactId} msg={msg} />)}
                      </TabsContent>
                    ))}
                  </Tabs>
                )}

                {campaign.messages.length === 0 && (
                  <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
                    No contacts matched the selected audience.
                  </div>
                )}
              </div>
            </div>
          )}
        </TabsContent>

        {/* ── History ───────────────────────────────────────────────────── */}
        <TabsContent value="history">
          <div className="overflow-hidden rounded-2xl border bg-card shadow-sm">
            <div className="flex items-center justify-between border-b px-6 py-4">
              <div>
                <h2 className="font-semibold text-foreground">Campaign History</h2>
                <p className="text-xs text-muted-foreground">Last {history.length} campaigns this session</p>
              </div>
              <button onClick={loadHistory} className="flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground">
                <RefreshCw className="h-3.5 w-3.5" /> Refresh
              </button>
            </div>

            {history.length === 0 ? (
              <div className="flex flex-col items-center gap-4 py-16 text-center text-muted-foreground">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted">
                  <Megaphone className="h-8 w-8 opacity-30" />
                </div>
                <div>
                  <p className="font-medium">No campaigns yet</p>
                  <p className="mt-1 text-sm">Generate your first campaign in the Builder tab.</p>
                </div>
                <Button variant="outline" onClick={() => setOuter("builder")}>Open Builder</Button>
              </div>
            ) : (
              <div className="divide-y">
                {history.map((c) => {
                  const g = GOALS.find((x) => x.value === c.goal);
                  const Icon = g?.icon ?? Megaphone;
                  const timeAgo = (() => {
                    const diff = Date.now() - new Date(c.generatedAt).getTime();
                    if (diff < 60000) return "Just now";
                    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
                    return new Date(c.generatedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
                  })();
                  return (
                    <div key={c.id} className="flex items-center gap-4 px-5 py-4 transition hover:bg-muted/20">
                      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${g?.bg ?? "bg-muted border-border"}`}>
                        <Icon className={`h-5 w-5 ${g?.color ?? "text-muted-foreground"}`} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-foreground">{GOAL_LABELS[c.goal]}</span>
                          <span className="text-muted-foreground">·</span>
                          <span className="text-sm text-muted-foreground">{TONE_LABELS[c.tone]}</span>
                          {c.aiUsed && <Badge className="border-violet-200 bg-violet-50 text-violet-700 text-[10px]">AI</Badge>}
                        </div>
                        <div className="mt-0.5 flex items-center gap-3 text-xs text-muted-foreground">
                          <span>{AUD_LABELS[c.audienceType]}</span>
                          <span>·</span>
                          <span className="font-medium text-foreground">{c.contactCount} contacts</span>
                          {c.whatsappReadyCount > 0 && <span className="text-emerald-600">{c.whatsappReadyCount} WA-ready</span>}
                          <span>·</span>
                          <span>{timeAgo}</span>
                        </div>
                      </div>
                      <button
                        onClick={async () => {
                          try {
                            const res = await fetch(`/api/ai/direct-marketing/campaigns/${c.id}`, { headers: getAgencyAdminAuthHeaders() });
                            if (!res.ok) return;
                            const d = (await res.json()) as { campaign?: Campaign };
                            if (d.campaign) {
                              setCampaign(d.campaign);
                              setOuter("builder");
                              setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: "smooth" }), 200);
                            }
                          } catch { toast.error("Failed to load campaign"); }
                        }}
                        className="shrink-0 rounded-lg border px-3 py-1.5 text-xs font-medium text-muted-foreground transition hover:border-foreground/40 hover:text-foreground"
                      >
                        View
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
