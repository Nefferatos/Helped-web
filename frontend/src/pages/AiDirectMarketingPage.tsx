import { useCallback, useEffect, useRef, useState } from "react";
import {
  Bell,
  Bot,
  Briefcase,
  Calendar,
  Check,
  CheckCircle2,
  ChevronDown,
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

type CampaignGoal =
  | "new_arrivals"
  | "re_engage"
  | "promotion"
  | "holiday"
  | "follow_up"
  | "custom";
type CampaignTone = "professional" | "warm" | "urgent" | "casual";
type AudienceType =
  | "all_clients"
  | "enquiry_leads"
  | "direct_sale_leads"
  | "all_contacts";
type TriggerType =
  | "new_helpers"
  | "stale_enquiries"
  | "cold_leads"
  | "upcoming_holiday";
type CampaignMode = "agent" | "manual";

type Maid = {
  id: number;
  referenceCode: string;
  fullName: string;
  nationality: string;
  type: string;
  status?: string;
  isPublic?: boolean;
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
  charCount: number;
  whatsappReady: boolean;
};
type Campaign = {
  id: string;
  goal: CampaignGoal;
  tone: CampaignTone;
  audienceType: AudienceType;
  maidReferences: string[];
  messageTemplate: string;
  subject: string;
  messages: MarketingMessage[];
  contactCount: number;
  whatsappReadyCount: number;
  emailOnlyCount: number;
  generatedAt: string;
  aiUsed: boolean;
};
type CampaignSummary = Omit<Campaign, "messages" | "messageTemplate"> & {
  maidReferences: string[];
};

type AdvertisingOpportunity = {
  id: string;
  triggerType: TriggerType;
  title: string;
  reasoning: string;
  goal: CampaignGoal;
  tone: CampaignTone;
  audienceType: AudienceType;
  maidReferences: string[];
  estimatedReach: number;
  priority: "high" | "medium" | "low";
  detectedAt: string;
};

type ScanResult = {
  scannedAt: string;
  agencyId: number;
  opportunities: AdvertisingOpportunity[];
};

type DispatchCampaignLog = {
  goal: string;
  audience: string;
  totalContacts: number;
  emailsSent: number;
  whatsappQueued: number;
  skipped: number;
  errors?: string[];
};

type AutonomousStatus = {
  scannedAt: string;
  opportunitiesFound: number;
  aiUsed?: boolean;
  model?: string;
  campaigns: DispatchCampaignLog[];
  emailsTotal: number;
  whatsappTotal: number;
} | null;

// ─── Config ───────────────────────────────────────────────────────────────────

const GOALS: {
  value: CampaignGoal;
  label: string;
  desc: string;
  icon: React.ElementType;
}[] = [
  {
    value: "new_arrivals",
    label: "New Arrivals",
    desc: "Promote newly available helpers",
    icon: UserPlus,
  },
  {
    value: "re_engage",
    label: "Re-engage",
    desc: "Win back past enquiries & leads",
    icon: RefreshCw,
  },
  {
    value: "promotion",
    label: "Promotion",
    desc: "Announce a limited-time offer",
    icon: Tag,
  },
  {
    value: "holiday",
    label: "Holiday",
    desc: "Festive outreach + availability",
    icon: Gift,
  },
  {
    value: "follow_up",
    label: "Follow-up",
    desc: "Follow up on pending inquiries",
    icon: Bell,
  },
  {
    value: "custom",
    label: "Custom",
    desc: "Free-form AI-generated outreach",
    icon: Pencil,
  },
];

const TONES: {
  value: CampaignTone;
  label: string;
  desc: string;
  icon: React.ElementType;
}[] = [
  {
    value: "warm",
    label: "Warm",
    desc: "Personal, caring, approachable",
    icon: Heart,
  },
  {
    value: "professional",
    label: "Professional",
    desc: "Formal, polished, credible",
    icon: Briefcase,
  },
  {
    value: "casual",
    label: "Casual",
    desc: "Relaxed, conversational, light",
    icon: Coffee,
  },
  {
    value: "urgent",
    label: "Urgent",
    desc: "Direct, action-oriented, time-sensitive",
    icon: Zap,
  },
];

const AUDIENCES: {
  value: AudienceType;
  label: string;
  desc: string;
  icon: React.ElementType;
}[] = [
  {
    value: "all_contacts",
    label: "All Contacts",
    desc: "Clients + enquiries + leads",
    icon: Users,
  },
  {
    value: "all_clients",
    label: "Registered Clients",
    desc: "Signed-up client accounts",
    icon: UserPlus,
  },
  {
    value: "enquiry_leads",
    label: "Enquiry Leads",
    desc: "People who submitted enquiries",
    icon: MessageSquare,
  },
  {
    value: "direct_sale_leads",
    label: "Direct Sale Leads",
    desc: "Direct sale assignment contacts",
    icon: Tag,
  },
];

const GOAL_LABELS: Record<CampaignGoal, string> = {
  new_arrivals: "New Arrivals",
  re_engage: "Re-engage",
  promotion: "Promotion",
  holiday: "Holiday",
  follow_up: "Follow-up",
  custom: "Custom",
};
const TONE_LABELS: Record<CampaignTone, string> = {
  professional: "Professional",
  warm: "Warm",
  urgent: "Urgent",
  casual: "Casual",
};
const AUD_LABELS: Record<AudienceType, string> = {
  all_contacts: "All Contacts",
  all_clients: "Clients",
  enquiry_leads: "Enquiries",
  direct_sale_leads: "Leads",
};

const SOURCE_STYLE: Record<string, { label: string; cls: string }> = {
  client: { label: "Client", cls: "border-blue-200 bg-blue-50 text-blue-700" },
  enquiry: {
    label: "Enquiry",
    cls: "border-violet-200 bg-violet-50 text-violet-700",
  },
  direct_sale: {
    label: "Lead",
    cls: "border-amber-200 bg-amber-50 text-amber-700",
  },
};

const TRIGGER_META: Record<
  TriggerType,
  { label: string; icon: React.ElementType; color: string; bg: string }
> = {
  new_helpers: {
    label: "New Helpers",
    icon: UserPlus,
    color: "text-emerald-700",
    bg: "bg-emerald-50 border-emerald-200",
  },
  stale_enquiries: {
    label: "Stale Enquiries",
    icon: Bell,
    color: "text-violet-700",
    bg: "bg-violet-50 border-violet-200",
  },
  cold_leads: {
    label: "Cold Leads",
    icon: RefreshCw,
    color: "text-blue-700",
    bg: "bg-blue-50 border-blue-200",
  },
  upcoming_holiday: {
    label: "Upcoming Holiday",
    icon: Gift,
    color: "text-pink-700",
    bg: "bg-pink-50 border-pink-200",
  },
};

const PRIORITY_STYLE: Record<string, string> = {
  high: "border-red-200 bg-red-50 text-red-700",
  medium: "border-amber-200 bg-amber-50 text-amber-700",
  low: "border-slate-200 bg-slate-50 text-slate-600",
};

// ─── Utilities ────────────────────────────────────────────────────────────────

const initials = (name: string) =>
  name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase() || "?";

const timeAgo = (iso: string) => {
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 60_000) return "just now";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  return new Date(iso).toLocaleDateString();
};

const CopyBtn = ({
  text,
  size = "sm",
}: {
  text: string;
  size?: "sm" | "xs";
}) => {
  const [done, setDone] = useState(false);
  const copy = async () => {
    await navigator.clipboard.writeText(text);
    setDone(true);
    setTimeout(() => setDone(false), 1800);
  };
  const sz = size === "xs" ? "h-6 w-6" : "h-7 w-7";
  return (
    <button
      onClick={copy}
      title="Copy"
      className={`${sz} flex items-center justify-center rounded-md border bg-muted/60 text-muted-foreground transition hover:bg-muted hover:text-foreground`}
    >
      {done ? (
        <Check className="h-3 w-3 text-emerald-600" />
      ) : (
        <ClipboardCopy className="h-3 w-3" />
      )}
    </button>
  );
};

// ─── Compact single-row pill selector (replaces the old full-page card grids) ─

function PillSelect<T extends string>({
  options,
  value,
  onChange,
  counts,
}: {
  options: { value: T; label: string; desc: string; icon: React.ElementType }[];
  value: T;
  onChange: (v: T) => void;
  counts?: Partial<Record<T, number>>;
}) {
  const active = options.find((o) => o.value === value);
  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {options.map((o) => {
          const Icon = o.icon;
          const isActive = o.value === value;
          const count = counts?.[o.value];
          return (
            <button
              key={o.value}
              type="button"
              onClick={() => onChange(o.value)}
              className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition ${
                isActive
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {o.label}
              {count !== undefined && (
                <span
                  className={`rounded-full px-1.5 text-[10px] font-bold ${isActive ? "bg-primary/15" : "bg-muted"}`}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>
      {active && (
        <p className="mt-1.5 text-xs text-muted-foreground">{active.desc}</p>
      )}
    </div>
  );
}

// ─── Message card ─────────────────────────────────────────────────────────────

const MessageCard = ({ msg }: { msg: MarketingMessage }) => {
  const [open, setOpen] = useState(false);
  const src = SOURCE_STYLE[msg.contactSource] ?? {
    label: msg.contactSource,
    cls: "border-slate-200 bg-slate-50 text-slate-600",
  };
  const overLimit = msg.charCount > 300;

  return (
    <div
      className={`rounded-xl border bg-card transition hover:shadow-sm ${open ? "shadow-sm" : ""}`}
    >
      <div className="flex items-center gap-3 p-3.5">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary/20 to-primary/40 text-xs font-bold text-primary">
          {initials(msg.contactName)}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="font-semibold text-sm text-foreground truncate">
              {msg.contactName}
            </span>
            <span
              className={`inline-flex rounded-full border px-1.5 py-0.5 text-[9px] font-bold ${src.cls}`}
            >
              {src.label}
            </span>
            {overLimit && (
              <span className="inline-flex rounded-full border border-amber-200 bg-amber-50 px-1.5 py-0.5 text-[9px] font-bold text-amber-700">
                {msg.charCount} chars
              </span>
            )}
          </div>
          <div className="mt-0.5 flex items-center gap-3 text-xs text-muted-foreground">
            {msg.contactPhone && (
              <span className="flex items-center gap-1">
                <Phone className="h-3 w-3" />
                {msg.contactPhone}
              </span>
            )}
            {msg.contactEmail && (
              <span className="truncate max-w-[160px]">{msg.contactEmail}</span>
            )}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <CopyBtn text={msg.message} />
          {msg.whatsappLink ? (
            <a
              href={msg.whatsappLink}
              target="_blank"
              rel="noopener noreferrer"
              className="flex h-7 items-center gap-1.5 rounded-md border border-emerald-300 bg-emerald-50 px-2.5 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100"
            >
              <ExternalLink className="h-3 w-3" /> Send
            </a>
          ) : (
            <span className="flex h-7 items-center rounded-md border border-dashed px-2.5 text-xs text-muted-foreground/60">
              No phone
            </span>
          )}
          <button
            onClick={() => setOpen((o) => !o)}
            className="flex h-7 w-7 items-center justify-center rounded-md border text-muted-foreground hover:bg-muted"
          >
            {open ? (
              <ChevronUp className="h-3.5 w-3.5" />
            ) : (
              <ChevronDown className="h-3.5 w-3.5" />
            )}
          </button>
        </div>
      </div>
      {open && (
        <div className="border-t bg-muted/30 px-3.5 py-3">
          <p className="text-xs leading-relaxed text-foreground whitespace-pre-wrap">
            {msg.message}
          </p>
          <div className="mt-2 flex items-center justify-between text-[10px] text-muted-foreground">
            <span>
              {msg.charCount} characters
              {overLimit ? " — consider shortening for WhatsApp previews" : ""}
            </span>
            <CopyBtn text={msg.message} size="xs" />
          </div>
        </div>
      )}
    </div>
  );
};

// ─── Opportunity card (simplified: one line of meta, one action) ──────────────

const OpportunityCard = ({
  opp,
  onGenerate,
  generatedCampaign,
  generating,
}: {
  opp: AdvertisingOpportunity;
  onGenerate: (opp: AdvertisingOpportunity) => void;
  generatedCampaign: Campaign | null;
  generating: boolean;
}) => {
  const meta = TRIGGER_META[opp.triggerType];
  const Icon = meta.icon;
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="overflow-hidden rounded-2xl border bg-card shadow-sm">
      <div className="flex items-start gap-4 p-5">
        <div
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border ${meta.bg}`}
        >
          <Icon className={`h-5 w-5 ${meta.color}`} />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold text-foreground">{opp.title}</span>
            <span
              className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${PRIORITY_STYLE[opp.priority]}`}
            >
              {opp.priority} priority
            </span>
          </div>
          <p className="mt-1 text-sm text-muted-foreground leading-relaxed">
            {opp.reasoning}
          </p>
          <p className="mt-2 text-xs text-muted-foreground">
            <strong className="text-foreground">{opp.estimatedReach}</strong>{" "}
            recipients · {GOAL_LABELS[opp.goal]} · {TONE_LABELS[opp.tone]} ·{" "}
            {timeAgo(opp.detectedAt)}
          </p>
        </div>

        <Button
          onClick={() => onGenerate(opp)}
          disabled={generating}
          size="sm"
          className="shrink-0 gap-2"
        >
          {generating ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Generating…
            </>
          ) : (
            <>
              <Sparkles className="h-3.5 w-3.5" /> Generate
            </>
          )}
        </Button>
      </div>

      {generatedCampaign && (
        <div className="border-t bg-emerald-50/40">
          <div className="flex items-center justify-between px-5 py-3">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              <span className="text-sm font-semibold text-emerald-800">
                {generatedCampaign.contactCount} messages ready
              </span>
              <span className="text-xs text-emerald-700">
                · {generatedCampaign.whatsappReadyCount} WhatsApp-ready
              </span>
            </div>
            <button
              onClick={() => setExpanded((e) => !e)}
              className="flex items-center gap-1 rounded-lg border border-emerald-200 px-2.5 py-1 text-xs font-medium text-emerald-700 transition hover:bg-emerald-100"
            >
              {expanded
                ? "Collapse"
                : `View ${generatedCampaign.messages.length} messages`}
              {expanded ? (
                <ChevronUp className="h-3 w-3" />
              ) : (
                <ChevronDown className="h-3 w-3" />
              )}
            </button>
          </div>
          {expanded && (
            <div className="space-y-2 px-5 pb-5">
              {generatedCampaign.messages.map((msg) => (
                <MessageCard key={msg.contactId} msg={msg} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ─── Main page ────────────────────────────────────────────────────────────────

export default function AiDirectMarketingPage() {
  const [outerTab, setOuter] = useState<"campaigns" | "history">("campaigns");
  const [mode, setMode] = useState<CampaignMode>("agent");

  // ── Agent state ───────────────────────────────────────────────────────────
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [generatingFor, setGeneratingFor] = useState<string | null>(null);
  const [generatedCampaigns, setGeneratedCampaigns] = useState<
    Record<string, Campaign>
  >({});
  const [autonomousStatus, setAutonomousStatus] =
    useState<AutonomousStatus>(null);

  // ── History ───────────────────────────────────────────────────────────────
  const [history, setHistory] = useState<CampaignSummary[]>([]);

  // ── Manual builder state ──────────────────────────────────────────────────
  const [goal, setGoal] = useState<CampaignGoal>("new_arrivals");
  const [tone, setTone] = useState<CampaignTone>("warm");
  const [audienceType, setAudience] = useState<AudienceType>("all_contacts");
  const [customNote, setNote] = useState("");
  const [selectedMaids, setSelected] = useState<string[]>([]);
  const [helperSearch, setHSearch] = useState("");
  const [helpersOpen, setHelpersOpen] = useState(false);
  const [maids, setMaids] = useState<Maid[]>([]);
  const [maidsLoading, setML] = useState(true);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [contactsLoading, setCL] = useState(false);
  const [contactsError, setCErr] = useState(false);
  const [audienceCounts, setCounts] = useState<
    Partial<Record<AudienceType, number>>
  >({});
  const [manualCampaign, setManual] = useState<Campaign | null>(null);
  const [generating, setGenerating] = useState(false);
  const resultsRef = useRef<HTMLDivElement>(null);

  // ── Load maids ────────────────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/maids", {
          headers: getAgencyAdminAuthHeaders(),
        });
        if (!res.ok) return;
        const d = (await res.json()) as { maids?: Maid[] };
        setMaids(
          (d.maids ?? []).filter(
            (m) => !/unavailable|hidden|archived/i.test(m.status ?? ""),
          ),
        );
      } catch {
        /* ignore */
      } finally {
        setML(false);
      }
    })();
  }, []);

  useEffect(() => {
    const types: AudienceType[] = [
      "all_contacts",
      "all_clients",
      "enquiry_leads",
      "direct_sale_leads",
    ];
    types.forEach(async (t) => {
      try {
        const res = await fetch(`/api/ai/direct-marketing/audience?type=${t}`, {
          headers: getAgencyAdminAuthHeaders(),
        });
        if (!res.ok) return;
        const d = (await res.json()) as { total?: number };
        setCounts((prev) => ({ ...prev, [t]: d.total ?? 0 }));
      } catch {
        /* ignore */
      }
    });
  }, []);

  const loadContacts = useCallback(async (type: AudienceType) => {
    setCL(true);
    setCErr(false);
    try {
      const res = await fetch(
        `/api/ai/direct-marketing/audience?type=${type}`,
        { headers: getAgencyAdminAuthHeaders() },
      );
      if (!res.ok) {
        setCErr(true);
        return;
      }
      const d = (await res.json()) as { contacts?: Contact[] };
      setContacts(d.contacts ?? []);
      setCounts((prev) => ({ ...prev, [type]: d.contacts?.length ?? 0 }));
    } catch {
      setCErr(true);
    } finally {
      setCL(false);
    }
  }, []);

  useEffect(() => {
    void loadContacts(audienceType);
  }, [audienceType, loadContacts]);

  const loadHistory = useCallback(async () => {
    try {
      const res = await fetch("/api/ai/direct-marketing/campaigns", {
        headers: getAgencyAdminAuthHeaders(),
      });
      if (!res.ok) return;
      const d = (await res.json()) as { campaigns?: CampaignSummary[] };
      setHistory(d.campaigns ?? []);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    void loadHistory();
  }, [loadHistory]);

  // ── Agent actions ─────────────────────────────────────────────────────────

  const loadStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/ai/direct-marketing/autonomous/status", {
        headers: getAgencyAdminAuthHeaders(),
      });
      if (!res.ok) return;
      const d = (await res.json()) as { lastRun?: AutonomousStatus };
      setAutonomousStatus(d.lastRun ?? null);
    } catch {
      /* ignore */
    }
  }, []);

  const scan = async () => {
    setScanning(true);
    try {
      const res = await fetch("/api/ai/direct-marketing/autonomous/scan", {
        headers: getAgencyAdminAuthHeaders(),
      });
      if (!res.ok) throw new Error(`Scan failed (${res.status})`);
      const data = (await res.json()) as ScanResult;
      setScanResult(data);
      if (data.opportunities.length === 0) {
        toast.success("All clear — no campaigns needed right now");
      } else {
        toast.success(
          <div className="min-w-0 pr-2">
            <p className="text-sm font-extrabold tracking-tight text-emerald-950">
              {data.opportunities.length} advertising opportunit{data.opportunities.length > 1 ? "ies" : "y"} detected
            </p>
            <p className="mt-0.5 text-xs font-medium text-emerald-800">
              Your campaigns are ready to review and generate.
            </p>
          </div>,
          { duration: 5500 },
        );
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Scan failed");
    } finally {
      setScanning(false);
    }
  };

  // Run scan + load status on mount
  useEffect(() => {
    void scan();
    void loadStatus();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const generateForOpportunity = async (opp: AdvertisingOpportunity) => {
    setGeneratingFor(opp.id);
    try {
      const res = await fetch("/api/ai/direct-marketing/autonomous/run", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getAgencyAdminAuthHeaders(),
        },
        body: JSON.stringify({ opportunity: opp }),
      });
      const data = (await res.json()) as {
        campaigns?: Campaign[];
        error?: string;
      };
      if (!res.ok) throw new Error(data.error ?? `Failed (${res.status})`);
      const campaign = data.campaigns?.[0];
      if (campaign) {
        setGeneratedCampaigns((prev) => ({ ...prev, [opp.id]: campaign }));
        await loadHistory();
        toast.success(
          `${campaign.contactCount} messages generated for "${opp.title}"`,
        );
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Generation failed");
    } finally {
      setGeneratingFor(null);
    }
  };

  // ── Manual builder actions ────────────────────────────────────────────────

  const toggleMaid = (ref: string) =>
    setSelected((p) =>
      p.includes(ref) ? p.filter((r) => r !== ref) : [...p, ref],
    );

  const generateManual = async () => {
    setGenerating(true);
    setManual(null);
    try {
      const res = await fetch("/api/ai/direct-marketing/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getAgencyAdminAuthHeaders(),
        },
        body: JSON.stringify({
          goal,
          tone,
          maidReferences: selectedMaids,
          audienceType,
          customNote,
        }),
      });
      const d = (await res.json()) as { campaign?: Campaign; error?: string };
      if (!res.ok) throw new Error(d.error ?? `Failed (${res.status})`);
      setManual(d.campaign ?? null);
      await loadHistory();
      toast.success(`${d.campaign?.contactCount ?? 0} messages generated`);
      setTimeout(
        () =>
          resultsRef.current?.scrollIntoView({
            behavior: "smooth",
            block: "start",
          }),
        100,
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Generation failed");
    } finally {
      setGenerating(false);
    }
  };

  const publicMaids = maids.filter((m) => m.isPublic !== false);
  const filteredMaids = publicMaids.filter(
    (m) =>
      !helperSearch ||
      m.fullName.toLowerCase().includes(helperSearch.toLowerCase()) ||
      m.referenceCode.toLowerCase().includes(helperSearch.toLowerCase()) ||
      m.nationality?.toLowerCase().includes(helperSearch.toLowerCase()),
  );
  const contactCount = contacts.length;

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      {/* ── Header ───────────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-2xl border bg-gradient-to-br from-violet-700 via-purple-600 to-indigo-600 p-6 text-white shadow-lg">
        <div className="absolute -right-8 -top-8 h-40 w-40 rounded-full bg-white/10" />
        <div className="relative">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/20">
              <Bot className="h-5 w-5 text-white" />
            </div>
            <h1 className="text-2xl font-extrabold tracking-tight">
              AI Advertising Agent
            </h1>
          </div>
          <p className="mt-1.5 max-w-xl text-sm leading-relaxed text-white/85">
            The agent scans your data for advertising opportunities and drafts
            WhatsApp campaigns — or build your own in a few clicks.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            {[
              {
                label: "All Contacts",
                value: audienceCounts.all_contacts ?? "…",
              },
              { label: "Clients", value: audienceCounts.all_clients ?? "…" },
              {
                label: "Enquiries",
                value: audienceCounts.enquiry_leads ?? "…",
              },
              {
                label: "Leads",
                value: audienceCounts.direct_sale_leads ?? "…",
              },
            ].map((s) => (
              <div
                key={s.label}
                className="rounded-xl bg-white/15 px-3 py-1.5 text-center backdrop-blur-sm"
              >
                <p className="text-lg font-bold leading-none">{s.value}</p>
                <p className="mt-0.5 text-[10px] font-medium text-white/75">
                  {s.label}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Outer tabs: just Campaigns / History ────────────────────────── */}
      <Tabs
        value={outerTab}
        onValueChange={(v) => setOuter(v as "campaigns" | "history")}
        className="space-y-4"
      >
        <TabsList className="h-9 gap-1 bg-muted/50 p-1">
          <TabsTrigger
            value="campaigns"
            className="gap-2 text-sm data-[state=active]:bg-background data-[state=active]:shadow-sm"
          >
            <Sparkles className="h-4 w-4" /> Campaigns
          </TabsTrigger>
          <TabsTrigger
            value="history"
            className="gap-2 text-sm data-[state=active]:bg-background data-[state=active]:shadow-sm"
          >
            <MessageSquare className="h-4 w-4" /> History
            {history.length > 0 && (
              <span className="rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-bold text-primary-foreground">
                {history.length}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        {/* ── Campaigns tab ─────────────────────────────────────────────── */}
        <TabsContent value="campaigns" className="space-y-4">
          {/* Mode switch: two options, not three tabs */}
          <div className="inline-flex rounded-lg border bg-card p-1 shadow-sm">
            <button
              onClick={() => setMode("agent")}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition ${mode === "agent" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground"}`}
            >
              <Bot className="h-3.5 w-3.5" /> Agent suggestions
              {(scanResult?.opportunities.length ?? 0) > 0 && (
                <span className="rounded-full bg-violet-600 px-1.5 py-0.5 text-[10px] font-bold text-white">
                  {scanResult!.opportunities.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setMode("manual")}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition ${mode === "manual" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground"}`}
            >
              <Pencil className="h-3.5 w-3.5" /> Build my own
            </button>
          </div>

          {/* ── Agent mode ─────────────────────────────────────────────── */}
          {mode === "agent" && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-card px-5 py-3 shadow-sm">
                <div className="flex items-center gap-3 text-sm">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-100">
                    <Bot className="h-4 w-4 text-violet-700" />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {scanning
                      ? "Scanning your data for opportunities…"
                      : scanResult
                        ? `Last scanned ${timeAgo(scanResult.scannedAt)} · ${scanResult.opportunities.length} opportunit${scanResult.opportunities.length !== 1 ? "ies" : "y"} found`
                        : "Not yet scanned"}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Calendar className="h-3.5 w-3.5" /> Auto-runs every 30 min
                  </span>
                  <Button
                    onClick={scan}
                    disabled={scanning}
                    size="sm"
                    variant="outline"
                    className="gap-2"
                  >
                    {scanning ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />{" "}
                        Scanning…
                      </>
                    ) : (
                      <>
                        <RefreshCw className="h-3.5 w-3.5" /> Scan Now
                      </>
                    )}
                  </Button>
                </div>
              </div>

              {autonomousStatus && (
                <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
                  <div className="flex items-center gap-3 border-b bg-gradient-to-r from-emerald-50 to-teal-50 px-5 py-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-emerald-900">
                        Last autonomous dispatch
                      </p>
                      <p className="text-xs text-emerald-700">
                        {timeAgo(autonomousStatus.scannedAt)} ·{" "}
                        {autonomousStatus.emailsTotal} email
                        {autonomousStatus.emailsTotal !== 1 ? "s" : ""} sent ·{" "}
                        {autonomousStatus.whatsappTotal} WhatsApp queued
                      </p>
                    </div>
                    <button
                      onClick={loadStatus}
                      className="shrink-0 flex h-7 w-7 items-center justify-center rounded-md border text-muted-foreground hover:bg-muted"
                    >
                      <RefreshCw className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              )}

              {scanning && !scanResult && (
                <div className="flex flex-col items-center gap-4 rounded-2xl border bg-card py-16 text-center shadow-sm">
                  <Loader2 className="h-8 w-8 animate-spin text-violet-500" />
                  <div>
                    <p className="font-semibold text-foreground">
                      Agent is scanning your data…
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Checking for new helpers, stale enquiries, cold leads, and
                      upcoming holidays.
                    </p>
                  </div>
                </div>
              )}

              {!scanning &&
                scanResult &&
                scanResult.opportunities.length === 0 && (
                  <div className="flex flex-col items-center gap-4 rounded-2xl border bg-card py-16 text-center shadow-sm">
                    <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-100">
                      <CheckCircle2 className="h-8 w-8 text-emerald-600" />
                    </div>
                    <div>
                      <p className="font-semibold text-foreground">
                        All clear — no campaigns needed right now
                      </p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        The agent will alert you when new opportunities arise.
                      </p>
                    </div>
                  </div>
                )}

              {scanResult && scanResult.opportunities.length > 0 && (
                <div className="space-y-3">
                  {scanResult.opportunities.map((opp) => (
                    <OpportunityCard
                      key={opp.id}
                      opp={opp}
                      onGenerate={generateForOpportunity}
                      generatedCampaign={generatedCampaigns[opp.id] ?? null}
                      generating={generatingFor === opp.id}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── Manual mode: one form, no wizard ─────────────────────────── */}
          {mode === "manual" && (
            <div className="space-y-5">
              <div className="rounded-2xl border bg-card p-6 shadow-sm space-y-6">
                <div>
                  <p className="mb-2 text-sm font-semibold text-foreground">
                    Goal
                  </p>
                  <PillSelect
                    options={GOALS}
                    value={goal}
                    onChange={(next) => setGoal(next)}
                  />
                </div>

                <div>
                  <p className="mb-2 text-sm font-semibold text-foreground">
                    Tone
                  </p>
                  <PillSelect
                    options={TONES}
                    value={tone}
                    onChange={(next) => setTone(next)}
                  />
                </div>

                <div>
                  <p className="mb-2 text-sm font-semibold text-foreground">
                    Audience
                  </p>
                  <PillSelect
                    options={AUDIENCES}
                    value={audienceType}
                    onChange={setAudience}
                    counts={audienceCounts}
                  />
                  {contactsError && (
                    <div className="mt-2 flex items-center gap-2 text-xs text-red-600">
                      Could not load contacts.
                      <button
                        onClick={() => loadContacts(audienceType)}
                        className="font-semibold underline"
                      >
                        Retry
                      </button>
                    </div>
                  )}
                </div>

                {/* Helpers: collapsed by default since it's optional */}
                <div>
                  <button
                    onClick={() => setHelpersOpen((o) => !o)}
                    className="flex items-center gap-1.5 text-sm font-semibold text-foreground"
                  >
                    Feature specific helpers{" "}
                    <span className="font-normal text-muted-foreground">
                      (optional)
                    </span>
                    {selectedMaids.length > 0 && (
                      <span className="rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">
                        {selectedMaids.length} selected
                      </span>
                    )}
                    {helpersOpen ? (
                      <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                    )}
                  </button>
                  {helpersOpen && (
                    <div className="mt-3">
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
                        <div className="flex items-center justify-center py-8">
                          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                        </div>
                      ) : filteredMaids.length === 0 ? (
                        <div className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
                          No matching helpers.
                        </div>
                      ) : (
                        <div className="max-h-60 overflow-y-auto overflow-hidden rounded-xl border divide-y">
                          {filteredMaids.map((m) => {
                            const sel = selectedMaids.includes(m.referenceCode);
                            return (
                              <button
                                key={m.referenceCode}
                                onClick={() => toggleMaid(m.referenceCode)}
                                className={`flex w-full items-center gap-3 px-4 py-2.5 text-left transition ${sel ? "bg-primary/5" : "hover:bg-muted/30"}`}
                              >
                                <div
                                  className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 transition ${sel ? "border-primary bg-primary" : "border-muted-foreground/30"}`}
                                >
                                  {sel && (
                                    <Check className="h-3 w-3 text-primary-foreground" />
                                  )}
                                </div>
                                <div className="min-w-0 flex-1">
                                  <p className="truncate text-sm font-semibold text-foreground">
                                    {m.fullName}
                                  </p>
                                  <p className="truncate text-xs text-muted-foreground">
                                    {m.referenceCode} · {m.nationality} ·{" "}
                                    {m.type}
                                  </p>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Custom instructions */}
                <div>
                  <p className="mb-2 text-sm font-semibold text-foreground">
                    Additional instructions{" "}
                    <span className="font-normal text-muted-foreground">
                      (optional)
                    </span>
                  </p>
                  <Textarea
                    value={customNote}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="E.g. Mention our June placement fee discount. Focus on elderly care helpers."
                    rows={3}
                    maxLength={500}
                    className="text-sm"
                  />
                  <div className="mt-2 flex flex-wrap gap-2">
                    {[
                      "Keep it under 200 characters",
                      "Focus on elderly care experience",
                      "Mention transfer helpers available",
                      "Highlight Filipino helpers",
                    ].map((s) => (
                      <button
                        key={s}
                        onClick={() => setNote((n) => (n ? `${n} ${s}` : s))}
                        className="rounded-full border px-3 py-1 text-xs text-muted-foreground transition hover:border-primary/40 hover:text-primary"
                      >
                        + {s}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Generate bar */}
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border bg-card p-4 shadow-sm">
                <p className="text-sm text-muted-foreground">
                  {contactsLoading
                    ? "Loading contacts…"
                    : `${contactCount} contact${contactCount !== 1 ? "s" : ""} will receive this campaign`}
                </p>
                <Button
                  onClick={generateManual}
                  disabled={generating || contactCount === 0}
                  size="lg"
                  className="gap-2"
                >
                  {generating ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" /> Generating…
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4" /> Generate {contactCount}{" "}
                      Messages
                    </>
                  )}
                </Button>
              </div>

              {/* Manual results */}
              {manualCampaign && (
                <div
                  ref={resultsRef}
                  className="overflow-hidden rounded-2xl border bg-card shadow-sm"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b bg-emerald-50/50 px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-100">
                        <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-foreground">
                            {manualCampaign.messages.length} Messages Ready
                          </span>
                          {manualCampaign.aiUsed ? (
                            <Badge className="border-violet-200 bg-violet-50 text-violet-700">
                              AI Generated
                            </Badge>
                          ) : (
                            <Badge className="border-slate-200 bg-slate-50 text-slate-600">
                              Template
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {GOAL_LABELS[manualCampaign.goal]} ·{" "}
                          {TONE_LABELS[manualCampaign.tone]} ·{" "}
                          {new Date(
                            manualCampaign.generatedAt,
                          ).toLocaleString()}
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={generateManual}
                      disabled={generating}
                      className="gap-1.5"
                    >
                      <RefreshCw className="h-3.5 w-3.5" /> Regenerate
                    </Button>
                  </div>
                  <div className="grid grid-cols-3 divide-x border-b bg-muted/20">
                    {[
                      {
                        label: "Total",
                        value: manualCampaign.contactCount,
                        color: "text-foreground",
                      },
                      {
                        label: "WhatsApp",
                        value: manualCampaign.whatsappReadyCount,
                        color: "text-emerald-600",
                      },
                      {
                        label: "Copy Only",
                        value: manualCampaign.emailOnlyCount,
                        color: "text-muted-foreground",
                      },
                    ].map((s) => (
                      <div key={s.label} className="px-4 py-3 text-center">
                        <p className={`text-xl font-bold ${s.color}`}>
                          {s.value}
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          {s.label}
                        </p>
                      </div>
                    ))}
                  </div>
                  <div className="p-5 space-y-2">
                    {manualCampaign.messages.map((msg) => (
                      <MessageCard key={msg.contactId} msg={msg} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </TabsContent>

        {/* ── History tab ───────────────────────────────────────────────── */}
        <TabsContent value="history">
          <div className="overflow-hidden rounded-2xl border bg-card shadow-sm">
            <div className="flex items-center justify-between border-b px-6 py-4">
              <div>
                <h2 className="font-semibold text-foreground">
                  Campaign History
                </h2>
                <p className="text-xs text-muted-foreground">
                  Last {history.length} campaigns this session
                </p>
              </div>
              <button
                onClick={loadHistory}
                className="flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
              >
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
                  <p className="mt-1 text-sm">
                    Use Agent suggestions or Build my own to generate your first
                    campaign.
                  </p>
                </div>
              </div>
            ) : (
              <div className="divide-y">
                {history.map((c) => {
                  const g = GOALS.find((x) => x.value === c.goal);
                  const Icon = g?.icon ?? Megaphone;
                  const ago = (() => {
                    const diff = Date.now() - new Date(c.generatedAt).getTime();
                    if (diff < 60000) return "Just now";
                    if (diff < 3600000)
                      return `${Math.floor(diff / 60000)}m ago`;
                    return new Date(c.generatedAt).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    });
                  })();
                  return (
                    <div
                      key={c.id}
                      className="flex items-center gap-4 px-5 py-4 transition hover:bg-muted/20"
                    >
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border bg-muted">
                        <Icon className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-foreground">
                            {GOAL_LABELS[c.goal]}
                          </span>
                          <span className="text-muted-foreground">·</span>
                          <span className="text-sm text-muted-foreground">
                            {TONE_LABELS[c.tone]}
                          </span>
                          {c.aiUsed && (
                            <Badge className="border-violet-200 bg-violet-50 text-violet-700 text-[10px]">
                              AI
                            </Badge>
                          )}
                        </div>
                        <div className="mt-0.5 flex items-center gap-3 text-xs text-muted-foreground">
                          <span>{AUD_LABELS[c.audienceType]}</span>
                          <span>·</span>
                          <span className="font-medium text-foreground">
                            {c.contactCount} contacts
                          </span>
                          {c.whatsappReadyCount > 0 && (
                            <span className="text-emerald-600">
                              {c.whatsappReadyCount} WA-ready
                            </span>
                          )}
                          <span>·</span>
                          <span>{ago}</span>
                        </div>
                      </div>
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
