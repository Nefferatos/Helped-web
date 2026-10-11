import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { adminPath } from "@/lib/routes";
import { getAgencyAdminAuthHeaders, getStoredAgencyAdmin } from "@/lib/agencyAdminAuth";
import { subscribeToRequestsChanged } from "@/lib/requests";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Building2,
  CheckCircle2,
  HardHat,
  HeartHandshake,
  Pause,
  Play,
  Plane,
  Radio,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  UserSearch,
  Video,
  Wifi,
  X,
} from "lucide-react";
import "./operations-center.css";

/**
 * One row of the agency activity transcript
 * (GET /api/operations-board/transcript). The API returns the raw workflow
 * event plus whatever reference it could resolve, so this console owns all the
 * presentational mapping — a new event type needs no API change to appear.
 */
interface TranscriptEntry {
  id: string;
  event_type: string;
  entity_type: string;
  entity_id: string;
  actor: string | null;
  payload: Record<string, unknown> | null;
  status: string | null;
  created_at: string;
  /** Placement reference code (e.g. MM-1001) when the event belongs to a placement. */
  placement_reference?: string | null;
  /** Application the interview belongs to, when the event belongs to an interview. */
  interview_application_id?: string | null;
}

/**
 * The transcript IS the dashboard, so it refreshes on the same live cadence the
 * counters used to: polling only while this tab is visible, plus an immediate
 * refresh on focus and whenever another page reports a change.
 */
const TRANSCRIPT_POLL_MS = 5_000;
const TRANSCRIPT_LIMIT = 200;
const TRANSCRIPT_ENDPOINT = `/api/operations-board/transcript?limit=${TRANSCRIPT_LIMIT}`;

type ToneKey = "teal" | "green" | "amber" | "red" | "blue" | "violet" | "slate";

/**
 * The dashboard keeps the app's own light template: white surfaces, near-black
 * text, and the palette used everywhere else (green #0D6E56, amber #B8781E,
 * red #EF4444, muted #6B7280) with the same soft tints the old stat tiles used.
 */
const TONE: Record<ToneKey, { a: string; soft: string; line: string }> = {
  teal: { a: "#0D6E56", soft: "#E1F5EE", line: "rgba(13,110,86,.35)" },
  green: { a: "#0D6E56", soft: "#E1F5EE", line: "rgba(13,110,86,.35)" },
  amber: { a: "#B8781E", soft: "#FEF3E2", line: "rgba(184,120,30,.35)" },
  red: { a: "#EF4444", soft: "#FEF2F2", line: "rgba(239,68,68,.35)" },
  blue: { a: "#2563EB", soft: "#EFF6FF", line: "rgba(37,99,235,.32)" },
  violet: { a: "#7C3AED", soft: "#F5F3FF", line: "rgba(124,58,237,.32)" },
  slate: { a: "#6B7280", soft: "#F8FAFC", line: "rgba(107,114,128,.28)" },
};

const INK = { bright: "#000000", dim: "#111111", faint: "#333333" };

/** Every page that writes to the event spine, and the page a row links back to. */
type SourceKey = "operations" | "recruitment" | "hr" | "contractor" | "automation" | "system";

interface SourceDef {
  key: SourceKey;
  label: string;
  short: string;
  tone: ToneKey;
  page: string;
  icon: React.ReactNode;
}

const SOURCES: SourceDef[] = [
  { key: "operations", label: "Operations Center", short: "Ops Center", tone: "teal", page: adminPath("/operations-center"), icon: <HeartHandshake size={11} /> },
  { key: "recruitment", label: "Recruitment & screening", short: "Recruitment", tone: "violet", page: adminPath("/recruitment"), icon: <UserSearch size={11} /> },
  { key: "hr", label: "AI HR interviewer", short: "AI HR", tone: "blue", page: adminPath("/ai-hr-interviewer"), icon: <Video size={11} /> },
  { key: "contractor", label: "Contractor tasks", short: "Contractor", tone: "amber", page: adminPath("/contractor-tasks"), icon: <HardHat size={11} /> },
  { key: "automation", label: "Automation (Make)", short: "Automation", tone: "green", page: adminPath("/ai-agents"), icon: <Sparkles size={11} /> },
  { key: "system", label: "System", short: "System", tone: "slate", page: adminPath("/dashboard"), icon: <Activity size={11} /> },
];

const SOURCE_BY_KEY = SOURCES.reduce<Record<SourceKey, SourceDef>>((accumulator, source) => {
  accumulator[source.key] = source;
  return accumulator;
}, {} as Record<SourceKey, SourceDef>);

/**
 * Sources withheld from the dashboard. The AI HR interviewer ("hr") is hidden on
 * request: its filter chip is dropped from the bar and its lines are left out of
 * the transcript. It is kept in SOURCES/SOURCE_BY_KEY so the mapping and its
 * deep link stay intact — delete it from this list to bring it back.
 */
const HIDDEN_SOURCES: SourceKey[] = ["hr"];

const VISIBLE_SOURCES = SOURCES.filter((source) => !HIDDEN_SOURCES.includes(source.key));

interface EventMeta {
  title: string;
  source: SourceKey;
  tone: ToneKey;
  icon: React.ReactNode;
}

/**
 * Dotted event names → readable transcript lines. This covers the vocabulary
 * the app records today; an unlisted event still renders (see eventMeta), so a
 * newly added AI page never leaves the console blank.
 */
const EVENT_META: Record<string, EventMeta> = {
  "candidate.created": { title: "Applicant received", source: "recruitment", tone: "violet", icon: <UserSearch size={13} /> },
  "candidate.screened": { title: "Applicant screened by AI", source: "recruitment", tone: "violet", icon: <Sparkles size={13} /> },
  "screening.completed": { title: "AI screening completed", source: "recruitment", tone: "violet", icon: <Sparkles size={13} /> },
  "interview.scheduled": { title: "Interview scheduled", source: "hr", tone: "blue", icon: <Video size={13} /> },
  "interview.schedule_saved": { title: "Interview scheduled", source: "hr", tone: "blue", icon: <Video size={13} /> },
  "interview.completed": { title: "Interview completed", source: "hr", tone: "blue", icon: <Video size={13} /> },
  "placement.started": { title: "Placement started", source: "operations", tone: "teal", icon: <HeartHandshake size={13} /> },
  "flight.booked": { title: "Flight booked", source: "operations", tone: "blue", icon: <Plane size={13} /> },
  "medical.completed": { title: "Medical completed", source: "operations", tone: "violet", icon: <Stethoscope size={13} /> },
  "sip.completed": { title: "SIP settled in", source: "operations", tone: "amber", icon: <ShieldCheck size={13} /> },
  "handover.completed": { title: "Handover signed off", source: "operations", tone: "green", icon: <HeartHandshake size={13} /> },
  "arrival.completed": { title: "Arrival confirmed", source: "contractor", tone: "amber", icon: <HardHat size={13} /> },
  "test.ping": { title: "Connectivity probe", source: "system", tone: "slate", icon: <Activity size={13} /> },
};

/* ─── Transcript formatting ──────────────────────────────────────────────── */

type ActorKind = "user" | "ai" | "automation" | "system";
interface ActorMeta { kind: ActorKind; label: string; tone: ToneKey }

/**
 * Actors are recorded as `user:<name>`, `ai:<agent>`, `make:<scenario>` or a
 * bare system string, so the console can say who acted without another API
 * field — and without trusting a label the writer forgot to send.
 */
const actorMeta = (actor?: string | null): ActorMeta => {
  const raw = (actor ?? "").trim();
  if (!raw) return { kind: "system", label: "system", tone: "slate" };
  const separator = raw.indexOf(":");
  if (separator === -1) return { kind: "system", label: raw, tone: "slate" };
  const prefix = raw.slice(0, separator).toLowerCase();
  const value = raw.slice(separator + 1).trim() || prefix;
  if (prefix === "user") return { kind: "user", label: value, tone: "green" };
  if (prefix === "ai") return { kind: "ai", label: value, tone: "violet" };
  if (prefix === "make") return { kind: "automation", label: value, tone: "blue" };
  return { kind: "system", label: value, tone: "slate" };
};

const entitySource = (entry: TranscriptEntry): SourceKey => {
  if (entry.entity_type === "placement") return "operations";
  if (entry.entity_type === "application") return "recruitment";
  if (entry.entity_type === "interview") return "hr";
  return "system";
};

/**
 * Known event types get a hand-written line; an unlisted event is titled from
 * its dotted name and attributed to the page that owns the entity, so the
 * console keeps working as new AI pages start writing events.
 */
const eventMeta = (entry: TranscriptEntry): EventMeta => {
  const known = EVENT_META[entry.event_type];
  if (known) return known;

  const title =
    entry.event_type
      .split(/[._]/)
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ") || "Activity";

  const source = entitySource(entry);
  return {
    title,
    source,
    tone: entry.status === "failed" ? "red" : SOURCE_BY_KEY[source].tone,
    icon: <Activity size={13} />,
  };
};

const asText = (value: unknown) => (typeof value === "string" ? value.trim() : "");

/** The human part of the line: staff notes first, then whatever the writer sent. */
const entryDetail = (entry: TranscriptEntry): string => {
  const payload = entry.payload ?? {};

  const notes = asText(payload.notes);
  if (notes) return notes;

  const scheduledAt = asText(payload.scheduledAt) || asText(payload.scheduled_at);
  if (scheduledAt) {
    const when = new Date(scheduledAt);
    return Number.isNaN(when.getTime())
      ? `Scheduled ${scheduledAt}`
      : `Scheduled ${when.toLocaleString([], { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}`;
  }

  const parts = [asText(payload.fullName), asText(payload.nationality)];
  if (typeof payload.attachmentCount === "number") parts.push(`${payload.attachmentCount} files`);
  const applicant = parts.filter(Boolean).join(" · ");
  if (applicant) return applicant;

  const completedBy = asText(payload.completedBy);
  if (completedBy) return `Completed by ${completedBy}`;

  return "";
};

const entryReference = (entry: TranscriptEntry): string => {
  const placement = asText(entry.placement_reference);
  if (placement) return placement;
  return asText(entry.payload?.applicationCode);
};

const timeLabel = (iso: string) => {
  const date = new Date(iso);
  return Number.isNaN(date.getTime())
    ? "--:--:--"
    : date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false });
};

const dayKey = (iso: string) => {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "unknown";
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
};

const dayLabel = (iso: string) => {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "Unknown date";
  const key = dayKey(iso);
  const short = date.toLocaleDateString([], { day: "numeric", month: "short" });
  if (key === dayKey(new Date().toISOString())) return `Today · ${short}`;
  if (key === dayKey(new Date(Date.now() - 86_400_000).toISOString())) return `Yesterday · ${short}`;
  return date.toLocaleDateString([], { weekday: "short", day: "numeric", month: "short", year: "numeric" });
};

const useWindowWidth = () => {
  const [width, setWidth] = useState(typeof window !== "undefined" ? window.innerWidth : 1280);
  useEffect(() => {
    const handle = () => setWidth(window.innerWidth);
    window.addEventListener("resize", handle);
    return () => window.removeEventListener("resize", handle);
  }, []);
  return width;
};

/* ─── Console pieces ─────────────────────────────────────────────────────── */

const Led = ({ color, pulse = false, size = 8 }: { color: string; pulse?: boolean; size?: number }) => (
  <span
    className={pulse ? "oc-led oc-led--pulse" : "oc-led"}
    style={{ width: size, height: size, background: color, color }}
  />
);

const LiveClock = () => {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 1_000);
    return () => window.clearInterval(id);
  }, []);

  return (
    <span className="oc-readout" style={{ fontSize: 12.5, fontWeight: 700, color: INK.bright }}>
      {now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false })}
    </span>
  );
};

const SkeletonRow = () => (
  <div
    aria-hidden="true"
    style={{
      height: 42,
      margin: "5px 8px",
      borderRadius: 10,
      border: "1px solid #eef3f5",
      background: "#f1f5f9",
      animation: "oc-led-pulse 1.6s ease-in-out infinite",
    }}
  />
);

/**
 * One transcript line: time, severity light, owning page, what happened, the
 * reference it happened to and who did it. The whole row links to the page that
 * produced the event — that is what makes the transcript navigable.
 */
const TranscriptRow = ({ entry }: { entry: TranscriptEntry }) => {
  const failed = entry.status === "failed";
  const meta = eventMeta(entry);
  const actor = actorMeta(entry.actor);
  const source = SOURCE_BY_KEY[meta.source];
  const tone = TONE[failed ? "red" : meta.tone];
  const actorTone = TONE[actor.tone];
  const detail = entryDetail(entry);
  const reference = entryReference(entry);

  return (
    <Link to={source.page} className="oc-log__row" title={`${entry.event_type} · ${source.label}`}>
      <span className="oc-log__time oc-readout">{timeLabel(entry.created_at)}</span>
      <span className="oc-log__dot" style={{ background: tone.a, color: tone.a }} />
      <span className="oc-log__source oc-chip" style={{ color: INK.dim, background: tone.soft, borderColor: tone.line }}>
        {source.icon}
        {source.short}
      </span>

      <span className="oc-log__body">
        <span style={{ color: tone.a, display: "flex", flexShrink: 0 }}>{meta.icon}</span>
        <span style={{ minWidth: 0, flex: 1 }}>
          <span className="oc-log__title">{meta.title}</span>
          {detail ? <span className="oc-log__detail">{detail}</span> : null}
        </span>
      </span>

      <span className="oc-log__right">
        {reference ? (
          <span className="oc-chip oc-readout" style={{ color: INK.dim }}>
            {reference}
          </span>
        ) : null}
        <span
          className="oc-chip"
          style={{
            color: INK.dim,
            background: actorTone.soft,
            borderColor: actorTone.line,
            maxWidth: 180,
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {actor.label}
        </span>
        {failed ? <AlertTriangle size={13} className="oc-log__failed" /> : null}
        <ArrowRight size={12} color={tone.a} className="oc-arrow" />
      </span>
    </Link>
  );
};

/* ═══════════════════════════════════════════════════════════════════════════
   HOME PAGE — the agency activity transcript.
   The dashboard is no longer a wall of counters: it is one full-page console of
   everything the Operations Center and the AI pages have recorded, newest first.
   ═══════════════════════════════════════════════════════════════════════════ */

const HomePage = () => {
  const [entries, setEntries] = useState<TranscriptEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [syncedAt, setSyncedAt] = useState<Date | null>(null);
  const [activeSource, setActiveSource] = useState<SourceKey | "all">("all");
  const [query, setQuery] = useState("");
  const [following, setFollowing] = useState(true);
  const [admin] = useState(() => getStoredAgencyAdmin());
  const logRef = useRef<HTMLDivElement | null>(null);
  const location = useLocation();
  const width = useWindowWidth();
  const isSm = width < 768;

  const loadTranscript = useCallback(async () => {
    try {
      const response = await fetch(TRANSCRIPT_ENDPOINT, {
        headers: { ...getAgencyAdminAuthHeaders() },
        cache: "no-store",
      });
      const data = (await response.json().catch(() => ({}))) as { entries?: TranscriptEntry[]; error?: string };
      if (!response.ok) throw new Error(data.error || "The activity transcript is unavailable");
      setEntries(Array.isArray(data.entries) ? data.entries : []);
      setError("");
      setSyncedAt(new Date());
    } catch (e) {
      // The transcript needs the event spine (Postgres/Supabase). When it cannot
      // be read, the console says so instead of pretending nothing happened.
      setEntries([]);
      setError(e instanceof Error ? e.message : "The activity transcript is unavailable");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadTranscript();
  }, [loadTranscript, location.pathname]);

  // Live console: poll while this tab is visible, refresh on focus and whenever
  // another page reports a change — the same contract the counters used to have.
  useEffect(() => {
    let active = true;
    let intervalId: number | undefined;
    let refreshTimer: number | null = null;

    const refresh = () => {
      if (!active) return;
      void loadTranscript();
    };

    // Collapses a burst of triggers (poll tick + focus + in-app event) into one
    // request so the console never fans out duplicate fetches.
    const scheduleRefresh = () => {
      if (!active) return;
      if (refreshTimer !== null) window.clearTimeout(refreshTimer);
      refreshTimer = window.setTimeout(refresh, 350);
    };

    const startPolling = () => {
      if (intervalId !== undefined) return;
      intervalId = window.setInterval(refresh, TRANSCRIPT_POLL_MS);
    };

    const stopPolling = () => {
      if (intervalId === undefined) return;
      window.clearInterval(intervalId);
      intervalId = undefined;
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        refresh();
        startPolling();
      } else {
        stopPolling();
      }
    };

    const unsubscribeRequestsChanged = subscribeToRequestsChanged(scheduleRefresh);
    window.addEventListener("focus", scheduleRefresh);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    if (document.visibilityState === "visible") startPolling();

    return () => {
      active = false;
      if (refreshTimer !== null) window.clearTimeout(refreshTimer);
      stopPolling();
      window.removeEventListener("focus", scheduleRefresh);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      unsubscribeRequestsChanged();
    };
  }, [loadTranscript]);

  const decorated = useMemo(
    () =>
      entries
        .map((entry) => ({ entry, meta: eventMeta(entry), actor: actorMeta(entry.actor) }))
        .filter((item) => !HIDDEN_SOURCES.includes(item.meta.source)),
    [entries],
  );

  const countsBySource = useMemo(() => {
    const counts = new Map<SourceKey, number>();
    for (const item of decorated) counts.set(item.meta.source, (counts.get(item.meta.source) ?? 0) + 1);
    return counts;
  }, [decorated]);

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return decorated.filter((item) => {
      if (activeSource !== "all" && item.meta.source !== activeSource) return false;
      if (!needle) return true;
      const haystack = [
        item.meta.title,
        item.entry.event_type,
        item.entry.actor ?? "",
        entryDetail(item.entry),
        entryReference(item.entry),
        SOURCE_BY_KEY[item.meta.source].label,
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(needle);
    });
  }, [decorated, activeSource, query]);

  // Newest first, split into day groups so long transcripts stay readable.
  const groups = useMemo(() => {
    const out: Array<{ key: string; label: string; items: typeof visible }> = [];
    for (const item of visible) {
      const key = dayKey(item.entry.created_at);
      const last = out[out.length - 1];
      if (last && last.key === key) last.items.push(item);
      else out.push({ key, label: dayLabel(item.entry.created_at), items: [item] });
    }
    return out;
  }, [visible]);

  const failedCount = useMemo(
    () => decorated.filter((item) => item.entry.status === "failed").length,
    [decorated],
  );

  // Follow mode keeps the newest line in view; scrolling away pauses it, so
  // reading history is never fought by the poll.
  useEffect(() => {
    if (!following) return;
    const node = logRef.current;
    if (node) node.scrollTop = 0;
  }, [following, entries.length]);

  const handleLogScroll = () => {
    const node = logRef.current;
    if (!node) return;
    const atTop = node.scrollTop <= 24;
    setFollowing((current) => (current === atTop ? current : atTop));
  };

  const syncLabel = syncedAt
    ? syncedAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false })
    : null;

  return (
    <div className="oc-deck oc-deck--console">

      {/* ══ Console header ══ */}
      <header className="oc-console__head">
        <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
          <div className="oc-radar" style={{ width: isSm ? 40 : 50, height: isSm ? 40 : 50 }}>
            <span style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", color: "#0D6E56" }}>
              <Radio size={isSm ? 15 : 17} />
            </span>
          </div>

          <div style={{ minWidth: 0 }}>
            <p className="oc-eyebrow">Agency overview</p>
            <h1 style={{ margin: "2px 0 0", fontSize: isSm ? 18 : 22, fontWeight: 900, letterSpacing: "-.02em", color: INK.bright, lineHeight: 1.15 }}>
              Dashboard
            </h1>
            <p className="oc-note" style={{ marginTop: 4 }}>
              Live activity transcript from the Operations Center and the AI pages, newest first
            </p>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <span className="oc-chip" style={{ color: INK.dim }}>
            <Building2 size={11} /> {admin?.agencyName || "Agency"}
          </span>
          <span className="oc-chip" style={{ color: INK.dim, background: TONE.green.soft, borderColor: TONE.green.line }}>
            <Led color={TONE.green.a} pulse size={6} /> Live
          </span>
          <span
            style={{
              display: "inline-flex", alignItems: "center", gap: 8, padding: "5px 11px",
              borderRadius: 99, border: "1px solid #dde6ea", background: "#fff",
            }}
          >
            <Wifi size={12} color={error ? TONE.amber.a : TONE.green.a} />
            <LiveClock />
          </span>
          {syncLabel ? <span className="oc-note">synced {syncLabel}</span> : null}
        </div>
      </header>

      {/* ══ Filter bar ══ */}
      <div className="oc-console__bar">
        <button
          type="button"
          className={`oc-chip oc-chip--filter${activeSource === "all" ? " oc-chip--on" : ""}`}
          onClick={() => setActiveSource("all")}
          aria-pressed={activeSource === "all"}
        >
          <span style={{ color: TONE.teal.a, display: "flex" }}>
            <Activity size={11} />
          </span>
          All sources
          <span className="oc-readout">{decorated.length}</span>
        </button>

        {VISIBLE_SOURCES.map((source) => {
          const count = countsBySource.get(source.key) ?? 0;
          const isActive = activeSource === source.key;
          return (
            <button
              key={source.key}
              type="button"
              className={`oc-chip oc-chip--filter${isActive ? " oc-chip--on" : ""}`}
              style={{ opacity: count === 0 ? 0.45 : 1 }}
              onClick={() => setActiveSource((current) => (current === source.key ? "all" : source.key))}
              aria-pressed={isActive}
              title={source.label}
            >
              {/* Copy stays black; the source colour lives in the icon, tint and border. */}
              <span style={{ color: TONE[source.tone].a, display: "flex" }}>{source.icon}</span>
              {source.short}
              <span className="oc-readout">{count}</span>
            </button>
          );
        })}

        <label className="oc-search">
          <Search size={12} />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Filter by event, reference or person…"
            aria-label="Filter the transcript"
          />
          {query ? (
            <button
              type="button"
              onClick={() => setQuery("")}
              aria-label="Clear the transcript filter"
              style={{ background: "none", border: 0, padding: 0, color: "inherit", cursor: "pointer", display: "flex" }}
            >
              <X size={12} />
            </button>
          ) : null}
        </label>

        <button
          type="button"
          className={`oc-iconbtn${following ? " oc-iconbtn--on" : ""}`}
          onClick={() => setFollowing((current) => !current)}
          aria-pressed={following}
          title={following ? "Newest line stays in view" : "Reading paused — click to follow the newest line again"}
        >
          {following ? <Pause size={11} /> : <Play size={11} />}
          {following ? "Following" : "Paused"}
        </button>

        <button type="button" className="oc-iconbtn" onClick={() => void loadTranscript()}>
          <RefreshCw size={11} /> Refresh
        </button>
      </div>

      {/* ══ The transcript ══ */}
      <div className="oc-log" ref={logRef} onScroll={handleLogScroll}>
        {loading ? (
          Array.from({ length: 9 }).map((_, index) => <SkeletonRow key={index} />)
        ) : error ? (
          <p className="oc-log__state">
            <span
              style={{
                width: 34, height: 34, borderRadius: 11, flexShrink: 0,
                display: "flex", alignItems: "center", justifyContent: "center",
                background: TONE.red.soft, border: `1px solid ${TONE.red.line}`, color: TONE.red.a,
              }}
            >
              <AlertTriangle size={16} />
            </span>
            <span>
              <strong>Transcript unavailable.</strong> {error}{" "}
              <Link to={adminPath("/operations-center")} style={{ color: INK.bright, fontWeight: 800, textDecoration: "underline" }}>
                Open the Operations Center
              </Link>
            </span>
          </p>
        ) : visible.length === 0 ? (
          <p className="oc-log__state">
            <span
              style={{
                width: 34, height: 34, borderRadius: 11, flexShrink: 0,
                display: "flex", alignItems: "center", justifyContent: "center",
                background: TONE.green.soft, border: `1px solid ${TONE.green.line}`, color: TONE.green.a,
              }}
            >
              <CheckCircle2 size={16} />
            </span>
            <span>
              <strong>{decorated.length === 0 ? "Nothing recorded yet." : "No lines match that filter."}</strong>{" "}
              {decorated.length === 0
                ? "The transcript fills up as placements, applicants, interviews and automations run."
                : "Try another source, or clear the filter to see the whole transcript."}
            </span>
          </p>
        ) : (
          groups.map((group) => (
            <section key={group.key}>
              <p className="oc-log__day">
                {group.label}
                <span className="oc-readout" style={{ letterSpacing: 0 }}>{group.items.length} lines</span>
              </p>
              {group.items.map((item) => <TranscriptRow key={item.entry.id} entry={item.entry} />)}
            </section>
          ))
        )}
      </div>

      {/* ══ Footer readout ══ */}
      <p className="oc-console__foot">
        <Led color={error ? TONE.amber.a : TONE.teal.a} pulse size={6} />
        {error
          ? `Transcript offline — ${error}`
          : `${decorated.length} events loaded · refreshed every 5s while this tab is visible · newest first`}
        {failedCount > 0 ? <span className="oc-log__failed">· {failedCount} failed</span> : null}
        <span style={{ marginLeft: "auto", display: "inline-flex", alignItems: "center", gap: 6 }}>
          <ArrowRight size={11} /> every line opens the page that wrote it
        </span>
      </p>
    </div>
  );
};

export default HomePage;







