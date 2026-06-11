import { useCallback, useEffect, useState } from "react";
import {
  Bot,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ClipboardCopy,
  ExternalLink,
  Loader2,
  MessageSquare,
  Phone,
  RefreshCw,
  Sparkles,
  Target,
  Users,
  Zap,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/sonner";
import { getAgencyAdminAuthHeaders } from "@/lib/agencyAdminAuth";

// ─── Types ────────────────────────────────────────────────────────────────────

type CampaignGoal = "new_arrivals" | "re_engage" | "promotion" | "holiday" | "follow_up" | "custom";
type CampaignTone = "professional" | "warm" | "urgent" | "casual";
type AudienceType = "all_clients" | "enquiry_leads" | "direct_sale_leads" | "all_contacts";

type Maid = {
  id: number;
  referenceCode: string;
  fullName: string;
  nationality: string;
  type: string;
  status?: string;
};

type Contact = {
  id: string;
  name: string;
  phone: string;
  email: string;
  source: string;
};

type MarketingMessage = {
  contactId: string;
  contactName: string;
  contactPhone: string;
  contactEmail: string;
  contactSource: string;
  message: string;
  whatsappLink: string;
};

type Campaign = {
  id: string;
  goal: CampaignGoal;
  tone: CampaignTone;
  audienceType: AudienceType;
  maidReferences: string[];
  messageTemplate: string;
  messages: MarketingMessage[];
  contactCount: number;
  generatedAt: string;
  aiUsed: boolean;
};

type CampaignSummary = {
  id: string;
  goal: CampaignGoal;
  tone: CampaignTone;
  audienceType: AudienceType;
  contactCount: number;
  generatedAt: string;
  aiUsed: boolean;
};

// ─── Config ───────────────────────────────────────────────────────────────────

const GOALS: { value: CampaignGoal; label: string; description: string }[] = [
  { value: "new_arrivals", label: "New Arrivals", description: "Promote newly available helpers" },
  { value: "re_engage", label: "Re-engage Clients", description: "Win back past enquiries & leads" },
  { value: "promotion", label: "Special Promotion", description: "Announce a limited-time offer" },
  { value: "holiday", label: "Holiday Greeting", description: "Festive outreach with availability update" },
  { value: "follow_up", label: "Follow-up", description: "Follow up on pending inquiries" },
  { value: "custom", label: "Custom", description: "Free-form AI-generated outreach" },
];

const TONES: { value: CampaignTone; label: string }[] = [
  { value: "warm", label: "Warm & Friendly" },
  { value: "professional", label: "Professional" },
  { value: "casual", label: "Casual" },
  { value: "urgent", label: "Urgent" },
];

const AUDIENCES: { value: AudienceType; label: string; description: string }[] = [
  { value: "all_contacts", label: "All Contacts", description: "Clients + enquiries + leads" },
  { value: "all_clients", label: "Registered Clients", description: "Signed-up client accounts" },
  { value: "enquiry_leads", label: "Enquiry Leads", description: "People who submitted enquiries" },
  { value: "direct_sale_leads", label: "Direct Sale Leads", description: "Direct sale assignment contacts" },
];

const GOAL_LABELS: Record<CampaignGoal, string> = {
  new_arrivals: "New Arrivals",
  re_engage: "Re-engage",
  promotion: "Promotion",
  holiday: "Holiday",
  follow_up: "Follow-up",
  custom: "Custom",
};

const AUDIENCE_LABELS: Record<AudienceType, string> = {
  all_contacts: "All Contacts",
  all_clients: "Registered Clients",
  enquiry_leads: "Enquiry Leads",
  direct_sale_leads: "Direct Sale Leads",
};

const SOURCE_STYLES: Record<string, { label: string; cls: string }> = {
  client: { label: "Client", cls: "border-blue-200 bg-blue-50 text-blue-700" },
  enquiry: { label: "Enquiry", cls: "border-purple-200 bg-purple-50 text-purple-700" },
  direct_sale: { label: "Lead", cls: "border-amber-200 bg-amber-50 text-amber-700" },
};

// ─── Small components ─────────────────────────────────────────────────────────

const SectionCard = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <div className={`rounded-2xl border bg-card p-6 shadow-sm ${className}`}>{children}</div>
);

const CopyButton = ({ text }: { text: string }) => {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  return (
    <button
      onClick={copy}
      title="Copy message"
      className="flex h-7 w-7 items-center justify-center rounded-md border bg-muted/60 text-muted-foreground transition hover:bg-muted hover:text-foreground"
    >
      {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <ClipboardCopy className="h-3.5 w-3.5" />}
    </button>
  );
};

// ─── Message card ─────────────────────────────────────────────────────────────

const MessageCard = ({ msg }: { msg: MarketingMessage }) => {
  const [expanded, setExpanded] = useState(false);
  const source = SOURCE_STYLES[msg.contactSource] ?? { label: msg.contactSource, cls: "border-slate-200 bg-slate-50 text-slate-600" };

  return (
    <div className="rounded-xl border bg-background p-4 transition hover:shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold text-foreground">{msg.contactName}</span>
            <span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold ${source.cls}`}>
              {source.label}
            </span>
          </div>
          <div className="mt-1 flex flex-wrap gap-3 text-xs text-muted-foreground">
            {msg.contactPhone && (
              <span className="flex items-center gap-1">
                <Phone className="h-3 w-3" /> {msg.contactPhone}
              </span>
            )}
            {msg.contactEmail && <span>{msg.contactEmail}</span>}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <CopyButton text={msg.message} />
          {msg.whatsappLink && (
            <a
              href={msg.whatsappLink}
              target="_blank"
              rel="noopener noreferrer"
              title="Open in WhatsApp"
              className="flex h-7 items-center gap-1 rounded-md border border-emerald-200 bg-emerald-50 px-2 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100"
            >
              <ExternalLink className="h-3 w-3" /> WhatsApp
            </a>
          )}
        </div>
      </div>

      <button
        onClick={() => setExpanded((e) => !e)}
        className="mt-3 flex w-full items-center gap-1 text-left text-xs font-medium text-muted-foreground hover:text-foreground"
      >
        {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
        {expanded ? "Hide message" : "Preview message"}
      </button>

      {expanded && (
        <div className="mt-2 rounded-lg bg-muted/50 p-3 text-sm leading-relaxed text-foreground whitespace-pre-wrap">
          {msg.message}
        </div>
      )}
    </div>
  );
};

// ─── Main page ─────────────────────────────────────────────────────────────────

export default function AiDirectMarketingPage() {
  const [goal, setGoal] = useState<CampaignGoal>("new_arrivals");
  const [tone, setTone] = useState<CampaignTone>("warm");
  const [audienceType, setAudienceType] = useState<AudienceType>("all_contacts");
  const [customNote, setCustomNote] = useState("");
  const [selectedMaids, setSelectedMaids] = useState<string[]>([]);

  const [maids, setMaids] = useState<Maid[]>([]);
  const [maidsLoading, setMaidsLoading] = useState(true);

  const [audiencePreview, setAudiencePreview] = useState<Contact[]>([]);
  const [audienceLoading, setAudienceLoading] = useState(false);

  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [generating, setGenerating] = useState(false);

  const [pastCampaigns, setPastCampaigns] = useState<CampaignSummary[]>([]);
  const [activeTab, setActiveTab] = useState<"builder" | "history">("builder");

  // Load public maids for selection
  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch("/api/maids", { headers: getAgencyAdminAuthHeaders() });
        if (!res.ok) return;
        const data = (await res.json()) as { maids?: Maid[] };
        setMaids((data.maids ?? []).filter((m) => (m.status ?? "").toLowerCase() !== "unavailable"));
      } catch {
        // silently ignore
      } finally {
        setMaidsLoading(false);
      }
    };
    void load();
  }, []);

  // Load audience preview when audience type changes
  const loadAudience = useCallback(async (type: AudienceType) => {
    setAudienceLoading(true);
    try {
      const res = await fetch(`/api/ai/direct-marketing/audience?type=${type}`, {
        headers: getAgencyAdminAuthHeaders(),
      });
      if (!res.ok) return;
      const data = (await res.json()) as { contacts?: Contact[] };
      setAudiencePreview(data.contacts ?? []);
    } catch {
      // silently ignore
    } finally {
      setAudienceLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadAudience(audienceType);
  }, [audienceType, loadAudience]);

  // Load past campaigns
  const loadHistory = useCallback(async () => {
    try {
      const res = await fetch("/api/ai/direct-marketing/campaigns", {
        headers: getAgencyAdminAuthHeaders(),
      });
      if (!res.ok) return;
      const data = (await res.json()) as { campaigns?: CampaignSummary[] };
      setPastCampaigns(data.campaigns ?? []);
    } catch {
      // silently ignore
    }
  }, []);

  useEffect(() => {
    void loadHistory();
  }, [loadHistory]);

  const toggleMaid = (ref: string) => {
    setSelectedMaids((prev) =>
      prev.includes(ref) ? prev.filter((r) => r !== ref) : [...prev, ref]
    );
  };

  const generate = async () => {
    setGenerating(true);
    setCampaign(null);
    try {
      const res = await fetch("/api/ai/direct-marketing/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAgencyAdminAuthHeaders() },
        body: JSON.stringify({ goal, tone, maidReferences: selectedMaids, audienceType, customNote }),
      });
      const data = (await res.json()) as { campaign?: Campaign; error?: string };
      if (!res.ok) throw new Error(data.error ?? `Failed (${res.status})`);
      setCampaign(data.campaign ?? null);
      await loadHistory();
      toast.success(`Campaign generated — ${data.campaign?.contactCount ?? 0} messages ready`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Generation failed");
    } finally {
      setGenerating(false);
    }
  };

  const publicMaids = maids.filter((m) => (m as unknown as { isPublic?: boolean }).isPublic !== false);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {/* Header */}
      <SectionCard>
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-primary">AI Marketing Console</p>
        <h1 className="mt-2 font-display text-3xl font-bold text-foreground">AI Direct Marketing</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
          Generate personalized WhatsApp marketing messages for your clients and leads using AI. Select
          your audience, choose helpers to feature, pick a goal and tone — the AI drafts and personalizes
          each message instantly.
        </p>

        {/* Tabs */}
        <div className="mt-5 flex gap-2">
          {(["builder", "history"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition ${
                activeTab === tab
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:bg-muted"
              }`}
            >
              {tab === "builder" ? <Sparkles className="h-4 w-4" /> : <MessageSquare className="h-4 w-4" />}
              {tab === "builder" ? "Campaign Builder" : `History${pastCampaigns.length > 0 ? ` (${pastCampaigns.length})` : ""}`}
            </button>
          ))}
        </div>
      </SectionCard>

      {activeTab === "builder" && (
        <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
          {/* Left: builder */}
          <div className="space-y-5">
            {/* Goal */}
            <SectionCard>
              <div className="mb-4 flex items-center gap-2">
                <Target className="h-4 w-4 text-primary" />
                <h2 className="text-sm font-semibold">Campaign Goal</h2>
              </div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {GOALS.map((g) => (
                  <button
                    key={g.value}
                    onClick={() => setGoal(g.value)}
                    className={`rounded-xl border p-3 text-left transition ${
                      goal === g.value
                        ? "border-primary bg-primary/5 ring-1 ring-primary"
                        : "border-border hover:border-muted-foreground/40 hover:bg-muted/40"
                    }`}
                  >
                    <p className="text-sm font-semibold text-foreground">{g.label}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">{g.description}</p>
                  </button>
                ))}
              </div>
            </SectionCard>

            {/* Tone */}
            <SectionCard>
              <div className="mb-4 flex items-center gap-2">
                <Zap className="h-4 w-4 text-primary" />
                <h2 className="text-sm font-semibold">Message Tone</h2>
              </div>
              <div className="flex flex-wrap gap-2">
                {TONES.map((t) => (
                  <button
                    key={t.value}
                    onClick={() => setTone(t.value)}
                    className={`rounded-lg border px-4 py-2 text-sm font-medium transition ${
                      tone === t.value
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border text-muted-foreground hover:border-foreground/40 hover:text-foreground"
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </SectionCard>

            {/* Audience */}
            <SectionCard>
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-primary" />
                  <h2 className="text-sm font-semibold">Target Audience</h2>
                </div>
                {audienceLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                ) : (
                  <span className="text-xs text-muted-foreground">
                    {audiencePreview.length} contact{audiencePreview.length !== 1 ? "s" : ""}
                  </span>
                )}
              </div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {AUDIENCES.map((a) => (
                  <button
                    key={a.value}
                    onClick={() => setAudienceType(a.value)}
                    className={`rounded-xl border p-3 text-left transition ${
                      audienceType === a.value
                        ? "border-primary bg-primary/5 ring-1 ring-primary"
                        : "border-border hover:border-muted-foreground/40 hover:bg-muted/40"
                    }`}
                  >
                    <p className="text-sm font-semibold text-foreground">{a.label}</p>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">{a.description}</p>
                  </button>
                ))}
              </div>

              {audiencePreview.length > 0 && (
                <div className="mt-4 max-h-40 overflow-y-auto rounded-lg border bg-muted/30 p-3">
                  <p className="mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Audience preview
                  </p>
                  <div className="space-y-1">
                    {audiencePreview.slice(0, 15).map((c) => {
                      const src = SOURCE_STYLES[c.source] ?? { label: c.source, cls: "border-slate-200 bg-slate-50 text-slate-600" };
                      return (
                        <div key={c.id} className="flex items-center gap-2 text-xs">
                          <span className={`inline-flex rounded-full border px-1.5 py-0.5 text-[9px] font-semibold ${src.cls}`}>
                            {src.label}
                          </span>
                          <span className="font-medium text-foreground">{c.name}</span>
                          {c.phone && <span className="text-muted-foreground">{c.phone}</span>}
                        </div>
                      );
                    })}
                    {audiencePreview.length > 15 && (
                      <p className="text-xs text-muted-foreground">
                        +{audiencePreview.length - 15} more contacts…
                      </p>
                    )}
                  </div>
                </div>
              )}
            </SectionCard>

            {/* Custom note */}
            <SectionCard>
              <h2 className="mb-3 text-sm font-semibold">Additional Instructions (optional)</h2>
              <Textarea
                value={customNote}
                onChange={(e) => setCustomNote(e.target.value)}
                placeholder="E.g. Mention that we have a special Easter discount this week. Emphasise elderly care helpers. Keep it short."
                rows={3}
                maxLength={500}
                className="text-sm"
              />
              <p className="mt-1 text-right text-xs text-muted-foreground">{customNote.length}/500</p>
            </SectionCard>

            {/* Generate button */}
            <Button
              onClick={generate}
              disabled={generating || audiencePreview.length === 0}
              className="w-full gap-2 py-5 text-base font-semibold"
            >
              {generating ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" /> Generating campaign…
                </>
              ) : (
                <>
                  <Sparkles className="h-5 w-5" /> Generate {audiencePreview.length} Messages
                </>
              )}
            </Button>
          </div>

          {/* Right: maid selector */}
          <div className="space-y-5">
            <SectionCard>
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Bot className="h-4 w-4 text-primary" />
                  <h2 className="text-sm font-semibold">Feature Helpers</h2>
                </div>
                {selectedMaids.length > 0 && (
                  <button
                    onClick={() => setSelectedMaids([])}
                    className="text-xs text-muted-foreground hover:text-foreground"
                  >
                    Clear all
                  </button>
                )}
              </div>
              <p className="mb-3 text-xs text-muted-foreground">
                Select helpers to highlight in the message. Leave blank to let AI pick from available profiles.
              </p>

              {maidsLoading ? (
                <div className="flex items-center justify-center py-8 text-muted-foreground">
                  <Loader2 className="h-5 w-5 animate-spin" />
                </div>
              ) : (
                <div className="max-h-[480px] space-y-1.5 overflow-y-auto pr-1">
                  {publicMaids.map((m) => {
                    const selected = selectedMaids.includes(m.referenceCode);
                    return (
                      <button
                        key={m.referenceCode}
                        onClick={() => toggleMaid(m.referenceCode)}
                        className={`flex w-full items-center gap-3 rounded-lg border p-2.5 text-left transition ${
                          selected
                            ? "border-primary bg-primary/5 ring-1 ring-primary"
                            : "border-border hover:border-muted-foreground/30 hover:bg-muted/30"
                        }`}
                      >
                        <div
                          className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 transition ${
                            selected ? "border-primary bg-primary" : "border-muted-foreground/30"
                          }`}
                        >
                          {selected && <Check className="h-3 w-3 text-primary-foreground" />}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-foreground">{m.fullName}</p>
                          <p className="truncate text-xs text-muted-foreground">
                            {m.referenceCode} · {m.nationality} {m.type}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                  {publicMaids.length === 0 && (
                    <p className="py-6 text-center text-sm text-muted-foreground">No public helper profiles found.</p>
                  )}
                </div>
              )}
            </SectionCard>
          </div>
        </div>
      )}

      {/* Generated messages */}
      {activeTab === "builder" && campaign && (
        <SectionCard>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                <h2 className="text-base font-semibold text-foreground">
                  {campaign.messages.length} Messages Generated
                </h2>
                {campaign.aiUsed && (
                  <Badge className="border-violet-200 bg-violet-50 text-violet-700">AI</Badge>
                )}
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Goal: {GOAL_LABELS[campaign.goal]} · Audience: {AUDIENCE_LABELS[campaign.audienceType]} ·{" "}
                {new Date(campaign.generatedAt).toLocaleString()}
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={generate}
              disabled={generating}
              className="gap-1.5"
            >
              <RefreshCw className="h-3.5 w-3.5" /> Regenerate
            </Button>
          </div>

          {/* Template preview */}
          <div className="mb-5 rounded-xl border-2 border-dashed border-primary/30 bg-primary/5 p-4">
            <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-primary">Message Template</p>
            <p className="text-sm leading-relaxed text-foreground whitespace-pre-wrap">{campaign.messageTemplate}</p>
            <div className="mt-2 flex gap-2">
              <CopyButton text={campaign.messageTemplate} />
              <span className="text-xs text-muted-foreground">Copy template · {"{{name}}"} is replaced per contact</span>
            </div>
          </div>

          {/* Per-contact messages */}
          <div className="space-y-2">
            {campaign.messages.map((msg) => (
              <MessageCard key={msg.contactId} msg={msg} />
            ))}
          </div>

          {campaign.messages.length === 0 && (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No contacts matched the selected audience. Add clients or leads first.
            </p>
          )}
        </SectionCard>
      )}

      {/* History tab */}
      {activeTab === "history" && (
        <SectionCard>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold">Campaign History</h2>
            <button
              onClick={loadHistory}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
            >
              <RefreshCw className="h-3.5 w-3.5" /> Refresh
            </button>
          </div>

          {pastCampaigns.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-12 text-center text-muted-foreground">
              <MessageSquare className="h-8 w-8 opacity-30" />
              <p className="text-sm">No campaigns generated yet this session.</p>
              <Button variant="outline" size="sm" onClick={() => setActiveTab("builder")}>
                Build your first campaign
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {pastCampaigns.map((c) => (
                <div key={c.id} className="flex items-center justify-between rounded-xl border bg-background p-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-foreground">{GOAL_LABELS[c.goal]}</span>
                      {c.aiUsed && (
                        <span className="rounded-full border border-violet-200 bg-violet-50 px-2 py-0.5 text-[10px] font-semibold text-violet-700">
                          AI
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {AUDIENCE_LABELS[c.audienceType]} · {c.contactCount} contacts ·{" "}
                      {new Date(c.generatedAt).toLocaleString()}
                    </p>
                  </div>
                  <button
                    onClick={async () => {
                      try {
                        const res = await fetch(`/api/ai/direct-marketing/campaigns/${c.id}`, {
                          headers: getAgencyAdminAuthHeaders(),
                        });
                        if (!res.ok) return;
                        const data = (await res.json()) as { campaign?: Campaign };
                        if (data.campaign) {
                          setCampaign(data.campaign);
                          setActiveTab("builder");
                        }
                      } catch {
                        toast.error("Failed to load campaign");
                      }
                    }}
                    className="rounded-lg border px-3 py-1.5 text-xs font-medium text-muted-foreground transition hover:border-foreground/40 hover:text-foreground"
                  >
                    View
                  </button>
                </div>
              ))}
            </div>
          )}
        </SectionCard>
      )}
    </div>
  );
}
