import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowRight,
  CheckCircle2,
  Clock3,
  Loader2,
  RefreshCcw,
  Users,
  Sparkles,
  Star,
  ExternalLink,
  UserCircle2,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getStoredClient } from "@/lib/clientAuth";
import { fetchAgencyOptions } from "@/lib/agencies";
import {
  createRequestMessage,
  createRequest,
  fetchRequests,
  fetchRequestConversation,
  fetchRequestMessages,
  subscribeToRequestsChanged,
  type RequestMessageRecord,
  requestStateMessage,
  requestStatusMeta,
} from "@/lib/requests";
import { toast } from "@/components/ui/sonner";

/* ─────────────────────────────────────────
   Theme — vivid green + electric yellow
───────────────────────────────────────── */
const C = {
  green:        "#0A5E2F",
  greenMid:     "#0D8040",
  greenLight:   "#10A050",
  greenBright:  "#13C460",
  greenPale:    "#E3F9EE",
  greenBorder:  "rgba(13,128,64,0.25)",
  greenGlow:    "rgba(13,128,64,0.20)",

  yellow:       "#F5C400",
  yellowBright: "#FFD23F",
  yellowPale:   "#FFFBE5",
  yellowBorder: "rgba(245,196,0,0.38)",
  yellowDeep:   "#B89100",

  dark:         "#050F09",
  darkMid:      "#0B2116",
  darkCard:     "#0F2A1C",

  text:         "#091509",
  textMuted:    "#35604A",
  border:       "#B8DEC8",
  surface:      "#EEF9F3",
  white:        "#FFFFFF",
};

/* ─────────────────────────────────────────
   Constants
───────────────────────────────────────── */
const NATIONALITY_OPTIONS = [
  "No Preference","Filipino","Indonesian","Indian",
  "Sri Lankan","Myanmese","Cambodian","Bangladeshi","Nepali",
] as const;

const PRIMARY_DUTY_OPTIONS = [
  "No Preference","Housekeeping","Elderly Care","Infant Care",
  "Kid Care","Cooking","Other",
] as const;

const AGE_GROUP_OPTIONS = ["No Preference","18-25","26-35","36-45","46+"] as const;

const LANGUAGE_OPTIONS = [
  "No Preference","English","Mandarin","Malay","Tamil","Tagalog","Bahasa Indonesia",
] as const;

type RequirementsState = {
  noOffDay: boolean; hasChildren: boolean; married: boolean;
  newMaid: boolean; transferMaid: boolean; exSingaporeMaid: boolean;
};

const defaultRequirements: RequirementsState = {
  noOffDay: false, hasChildren: false, married: false,
  newMaid: false, transferMaid: false, exSingaporeMaid: false,
};

const formatDate = (value: string) =>
  new Intl.DateTimeFormat("en-SG", { day: "2-digit", month: "short", year: "numeric" })
    .format(new Date(value));

/* ─────────────────────────────────────────
   getPrimaryPhoto
───────────────────────────────────────── */
const getPrimaryPhoto = (maid: {
  photoDataUrls?: string[];
  photoDataUrl?: string;
}): string => {
  if (Array.isArray(maid.photoDataUrls) && maid.photoDataUrls.length > 0) {
    const first = maid.photoDataUrls[0];
    if (typeof first === "string" && first.trim().length > 0) return first;
  }
  return typeof maid.photoDataUrl === "string" && maid.photoDataUrl.trim().length > 0
    ? maid.photoDataUrl
    : "";
};

/* ─────────────────────────────────────────
   MaidPhoto
───────────────────────────────────────── */
const MaidPhoto = ({
  maid,
  size = 80,
}: {
  maid: { fullName?: string; photoDataUrls?: string[]; photoDataUrl?: string };
  size?: number;
}) => {
  const [errored, setErrored] = useState(false);
  const photo = getPrimaryPhoto(maid);
  if (!photo || errored) {
    return (
      <div
        className="flex items-center justify-center shrink-0"
        style={{
          width: size, height: size, borderRadius: 0,
          background: `linear-gradient(135deg, ${C.greenPale}, ${C.yellowPale})`,
          border: `2px solid ${C.border}`,
        }}
      >
        <UserCircle2 style={{ width: size * 0.5, height: size * 0.5, color: C.greenMid, opacity: 0.6 }} />
      </div>
    );
  }
  return (
    <img
      src={photo} alt={maid.fullName ?? "Maid profile"}
      width={size} height={size} loading="lazy" decoding="async"
      onError={() => setErrored(true)}
      style={{
        width: size, height: size, borderRadius: 0,
        objectFit: "contain", objectPosition: "top center", flexShrink: 0,
        border: `2.5px solid ${C.border}`, background: C.greenPale,
        boxShadow: "0 4px 16px rgba(5,15,9,0.15)",
      }}
    />
  );
};

/* ─────────────────────────────────────────
   MaidPhotoLarge
───────────────────────────────────────── */
const MaidPhotoLarge = ({
  maid,
}: {
  maid: { fullName?: string; photoDataUrls?: string[]; photoDataUrl?: string };
}) => {
  const [errored, setErrored] = useState(false);
  const photo = getPrimaryPhoto(maid);
  if (!photo || errored) {
    return (
      <div className="w-full flex items-center justify-center"
        style={{ aspectRatio: "3/4", background: C.surface, borderRadius: 0 }}>
        <UserCircle2 style={{ width: 48, height: 48, color: C.border }} />
      </div>
    );
  }
  return (
    <img
      src={photo} alt={maid.fullName ?? "Maid"}
      loading="lazy" decoding="async" onError={() => setErrored(true)}
      style={{
        display: "block", width: "100%", aspectRatio: "3/4",
        objectFit: "contain", objectPosition: "top center",
        borderRadius: 0, background: C.surface,
      }}
    />
  );
};

/* ─────────────────────────────────────────
   Shared input styles
───────────────────────────────────────── */
const inputCls = "h-11 w-full rounded-2xl px-3 text-sm font-medium transition focus:outline-none focus:ring-2";
const inputStyle  = { border: `2px solid ${C.border}`,   background: C.white, color: C.text };
const inputFocus  = { border: `2px solid ${C.greenMid}`, background: C.white, color: C.text };

/* ─────────────────────────────────────────
   GradBtn
───────────────────────────────────────── */
const GradBtn = ({
  children, disabled, onClick, small,
}: {
  children: React.ReactNode; disabled?: boolean; onClick?: () => void; small?: boolean;
}) => (
  <button
    type="button" disabled={disabled} onClick={onClick}
    style={{
      background: disabled
        ? `linear-gradient(120deg, ${C.greenLight}, ${C.yellow})`
        : `linear-gradient(120deg, ${C.green} 0%, ${C.greenMid} 45%, ${C.yellowDeep} 100%)`,
      opacity: disabled ? 0.5 : 1,
      boxShadow: disabled ? "none" : `0 4px 22px ${C.greenGlow}, 0 0 0 1px rgba(245,196,0,0.18)`,
      border: "none",
      cursor: disabled ? "not-allowed" : "pointer",
    }}
    className={cn(
      "inline-flex items-center gap-2 rounded-full font-black text-white transition-all duration-200",
      small ? "px-5 py-2 text-xs" : "px-7 py-3 text-sm",
      !disabled && "hover:scale-105 hover:brightness-110 active:scale-100",
    )}
  >
    {children}
  </button>
);

/* ─────────────────────────────────────────
   StyledSelect
───────────────────────────────────────── */
const StyledSelect = ({
  value, onChange, children,
}: {
  value: string; onChange: (v: string) => void; children: React.ReactNode;
}) => {
  const active = value && value !== "No Preference";
  return (
    <div className="relative">
      <select
        className="w-full appearance-none h-11 rounded-2xl px-3 pr-8 text-sm font-medium focus:outline-none transition-all"
        style={{
          border: `2px solid ${active ? C.greenMid : C.border}`,
          background: active ? C.dark : C.white,
          color: active ? C.white : C.text,
          fontWeight: active ? 700 : 500,
        }}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {children}
      </select>
      <svg
        className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2"
        style={{ width: 12, height: 12, color: active ? C.yellowBright : C.textMuted }}
        viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth={2}
      >
        <path d="M2 4l4 4 4-4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
};

/* ─────────────────────────────────────────
   CSS injected into the iframe to:
   1. Hide nav / header bars
   2. Hide the action toolbar row (Back to all maids,
      All Maids, Shortlist, Tell Friend, My Shortlist,
      Contact Agency, the back link above the card)
   3. Remove the login-prompt banner
───────────────────────────────────────── */
const HIDE_CHROME_CSS = `
  /* ── navigation & site header ── */
  nav,
  header,
  [class*="navbar"],
  [class*="Navbar"],
  [class*="header"]:not([class*="card"]):not([class*="section"]):not([class*="Section"]):not([class*="Card"]),
  [class*="Header"]:not([class*="Card"]):not([class*="Section"]),
  [class*="nav-bar"],
  [class*="top-bar"],
  [class*="TopBar"],
  [id*="navbar"],
  [id*="header"],
  [role="navigation"],
  [role="banner"] {
    display: none !important;
  }

  /* ── "Back to all maids" link above the card ── */
  a[href*="/maids/search"],
  a[href*="/maids"][href$="search"] {
    display: none !important;
  }

  /* ── The toolbar strip that holds All Maids / Shortlist /
         Tell Friend / My Shortlist / Contact Agency ──
     It is a flex-wrap bar sitting just inside .content-card */
  .content-card > div:first-child:has(a[href*="/maids"]),
  .content-card > div:first-child:has(button),
  [class*="content-card"] > div:first-child:has(a[href*="/maids"]) {
    display: none !important;
  }

  /* Fallback: target every flex row whose first child is
     an <a> pointing to /maids or /employer-login —
     these are always toolbar rows */
  div.flex:has(> a[href*="/client/maids"]),
  div.flex:has(> a[href*="/employer-login"]) {
    display: none !important;
  }

  /* ── Login prompt banner ── */
  div:has(> p + div > a[href*="employer-login"]) {
    display: none !important;
  }

  /* ── "Back to all maids" anchor rendered as a Link ── */
  a[href*="maids/search"] {
    display: none !important;
  }

  /* ── Remove any top body padding left by hidden nav ── */
  body {
    padding-top: 0 !important;
    margin-top: 0 !important;
    /* GPU-accelerated scroll — eliminates jank inside the iframe */
    -webkit-overflow-scrolling: touch;
    scroll-behavior: auto;
    overscroll-behavior: contain;
  }

  /* Force GPU compositing on the main scroll containers so
     scroll is handled on the compositor thread (no main-thread lag) */
  html, body, .page-container, [class*="content-card"], main {
    transform: translateZ(0);
    will-change: scroll-position;
    backface-visibility: hidden;
  }

  /* Allow native touch scroll on all containers */
  html, body, * {
    touch-action: pan-y;
  }

  /* Prevent any CSS transition/animation from stealing scroll frames */
  *, *::before, *::after {
    animation-duration: 0.001ms !important;
    transition-duration: 0.001ms !important;
  }
`;

/* ─────────────────────────────────────────
   MaidProfileModal
   • iframe fills the panel (same as original)
   • Injects CSS to strip toolbar + back links
   • Smooth open / close animation
   • Floating close + new-tab buttons
───────────────────────────────────────── */
const MaidProfileModal = ({
  referenceCode,
  onClose,
}: {
  referenceCode: string;
  onClose: () => void;
}) => {
  const iframeRef  = useRef<HTMLIFrameElement>(null);
  const [visible, setVisible] = useState(false);   // drives the enter animation
  const [loaded,  setLoaded]  = useState(false);   // show spinner until iframe ready

  /* Trigger enter animation on next tick */
  useEffect(() => {
    const raf = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  /* Close with exit animation */
  const handleClose = () => {
    setVisible(false);
    setTimeout(onClose, 260); // matches transition duration
  };

  /* Keyboard */
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") handleClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  /* Lock body scroll */
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, []);

  /* Inject CSS once iframe loads */
  const handleIframeLoad = () => {
    setLoaded(true);
    try {
      const doc = iframeRef.current?.contentDocument;
      if (!doc) return;
      const style = doc.createElement("style");
      style.textContent = HIDE_CHROME_CSS;
      doc.head.appendChild(style);

      /* Extra JS pass — remove toolbar element directly if CSS :has()
         isn't supported in the embedded page's browser context.       */
      try {
        const toolbar = doc.querySelector<HTMLElement>(
          '.content-card > div:first-child, [class*="flex-wrap"]',
        );
        if (toolbar && toolbar.querySelector('a[href*="/maids"]')) {
          toolbar.style.display = "none";
        }
        doc.querySelectorAll<HTMLElement>('a[href*="maids/search"]').forEach((el) => {
          el.style.display = "none";
        });
      } catch { /* cross-origin guard */ }
    } catch { /* cross-origin — CSS injection blocked; floating buttons still work */ }
  };

  return (
    <>
      {/* ── Keyframe styles injected once ── */}
      <style>{`
        @keyframes crp-backdrop-in  { from { opacity: 0 } to { opacity: 1 } }
        @keyframes crp-backdrop-out { from { opacity: 1 } to { opacity: 0 } }
        @keyframes crp-panel-in     { from { opacity: 0; transform: scale(0.96) translateY(18px) } to { opacity: 1; transform: scale(1) translateY(0) } }
        @keyframes crp-panel-out    { from { opacity: 1; transform: scale(1) translateY(0) } to { opacity: 0; transform: scale(0.96) translateY(18px) } }

        .crp-backdrop {
          animation: crp-backdrop-in 0.22s cubic-bezier(0.22,1,0.36,1) forwards;
        }
        .crp-backdrop.crp-leaving {
          animation: crp-backdrop-out 0.26s cubic-bezier(0.22,1,0.36,1) forwards;
        }
        .crp-panel {
          animation: crp-panel-in 0.28s cubic-bezier(0.22,1,0.36,1) forwards;
        }
        .crp-panel.crp-leaving {
          animation: crp-panel-out 0.26s cubic-bezier(0.22,1,0.36,1) forwards;
        }
      `}</style>

      {/* ── Backdrop ── */}
      <div
        className={cn("crp-backdrop", !visible && "crp-leaving")}
        onClick={handleClose}
        style={{
          position: "fixed", inset: 0, zIndex: 9999,
          background: "rgba(5,15,9,0.88)",
          /* NO backdrop-filter blur here — it forces the browser to
             repaint the entire backdrop on every iframe scroll event,
             which is the primary cause of iframe scroll jank.        */
          display: "flex", alignItems: "center", justifyContent: "center",
          padding: "24px 16px",
        }}
      >
        {/* ── Panel ── */}
        <div
          className={cn("crp-panel", !visible && "crp-leaving")}
          onClick={(e) => e.stopPropagation()}
          style={{
            position: "relative",
            width: "100%", maxWidth: 1100,
            height: "calc(100vh - 48px)", maxHeight: 900,
            borderRadius: 20, overflow: "hidden",
            background: C.white,
            boxShadow: `0 32px 80px rgba(5,15,9,0.65), 0 0 0 2px ${C.greenBorder}`,
            display: "flex", flexDirection: "column",
          }}
        >
          {/* Yellow + green accent line at very top */}
          <div style={{
            position: "absolute", top: 0, left: 0, right: 0, height: 4, zIndex: 20,
            background: `linear-gradient(90deg, ${C.yellow}, ${C.yellowBright} 40%, ${C.greenBright} 70%, ${C.yellow})`,
            boxShadow: `0 2px 14px ${C.yellow}90`,
          }} />

          {/* Floating: open in new tab */}
          {/* <a
            href={`/maids/${encodeURIComponent(referenceCode)}`}
            target="_blank"
            rel="noreferrer"
            style={{
              position: "absolute", top: 14, right: 62, zIndex: 30,
              display: "inline-flex", alignItems: "center", gap: 5,
              padding: "7px 14px", borderRadius: 999,
              background: C.dark,
              border: `1.5px solid ${C.greenBorder}`,
              color: "rgba(255,255,255,0.75)",
              fontSize: 11, fontWeight: 800, textDecoration: "none",
              boxShadow: "0 4px 16px rgba(5,15,9,0.45)",
              transition: "background 0.15s, color 0.15s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = C.greenMid;
              e.currentTarget.style.color = C.white;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = C.dark;
              e.currentTarget.style.color = "rgba(255,255,255,0.75)";
            }}
          >
            <ExternalLink style={{ width: 11, height: 11 }} />
            New tab
          </a> */}

          {/* Floating: close */}
          <button
            type="button" onClick={handleClose} title="Close (Esc)"
            style={{
              position: "absolute", top: 10, right: 12, zIndex: 30,
              display: "flex", alignItems: "center", justifyContent: "center",
              width: 40, height: 40, borderRadius: 999,
              background: C.dark,
              border: `1.5px solid ${C.greenBorder}`,
              color: "rgba(255,255,255,0.85)",
              cursor: "pointer",
              boxShadow: "0 4px 16px rgba(5,15,9,0.45)",
              transition: "background 0.15s, border-color 0.15s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "#B91C1C";
              e.currentTarget.style.borderColor = "rgba(252,165,165,0.4)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = C.dark;
              e.currentTarget.style.borderColor = C.greenBorder;
            }}
          >
            <X style={{ width: 18, height: 18 }} />
          </button>

          {/* Loading spinner shown until iframe fires onLoad */}
          {!loaded && (
            <div style={{
              position: "absolute", inset: 0, zIndex: 10,
              display: "flex", flexDirection: "column",
              alignItems: "center", justifyContent: "center", gap: 12,
              background: C.surface,
              marginTop: 4,
            }}>
              <Loader2
                className="animate-spin"
                style={{ width: 32, height: 32, color: C.greenMid }}
              />
              <p style={{ fontSize: 12, fontWeight: 600, color: C.textMuted }}>
                Loading profile…
              </p>
            </div>
          )}

          {/* Iframe — fills the panel.
              will-change + translateZ forces the browser to composite the
              iframe on its own GPU layer so scrolling inside it never
              blocks the main thread → no jank.                          */}
          <iframe
            ref={iframeRef}
            src={`/maids/${encodeURIComponent(referenceCode)}`}
            title={`Maid profile ${referenceCode}`}
            onLoad={handleIframeLoad}
            scrolling="yes"
            style={{
              flex: 1, width: "100%", border: "none",
              display: "block",
              background: C.surface,
              marginTop: 4,
              opacity: loaded ? 1 : 0,
              transition: "opacity 0.25s ease",
              willChange: "transform",
              transform: "translateZ(0)",
              backfaceVisibility: "hidden" as const,
            }}
          />
        </div>
      </div>
    </>
  );
};

/* ─────────────────────────────────────────
   CardHeader — reusable dark header block
───────────────────────────────────────── */
const CardHeader = ({ eyebrow, title, subtitle }: { eyebrow: string; title: string; subtitle?: string }) => (
  <div
    className="relative overflow-hidden px-8 py-6"
    style={{
      background: `linear-gradient(130deg, ${C.dark} 0%, ${C.darkCard} 100%)`,
      borderRadius: "18px 18px 0 0",
    }}
  >
    <div style={{
      position: "absolute", left: 0, top: 0, bottom: 0, width: 5,
      background: `linear-gradient(180deg, ${C.yellowBright}, ${C.yellow})`,
      borderRadius: "18px 0 0 0",
      boxShadow: `3px 0 10px ${C.yellow}60`,
    }} />
    <div style={{
      position: "absolute", top: 0, left: 0, right: 0, height: 2,
      background: `linear-gradient(90deg, ${C.yellow}00, ${C.yellow}70, ${C.yellow}00)`,
    }} />
    <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full" style={{ background: "rgba(245,196,0,0.05)" }} />
    <div className="absolute right-20 bottom-0 h-20 w-20 rounded-full" style={{ background: "rgba(13,128,64,0.08)" }} />

    <div className="pl-4">
      <div style={{
        display: "inline-flex", alignItems: "center", gap: 5,
        padding: "2px 8px", borderRadius: 999, marginBottom: 4,
        background: "rgba(245,196,0,0.14)",
        border: "1px solid rgba(245,196,0,0.28)",
      }}>
        <span style={{ fontSize: 9, fontWeight: 900, letterSpacing: "0.22em", textTransform: "uppercase", color: C.yellowBright }}>
          {eyebrow}
        </span>
      </div>
      <h2 className="text-xl font-black text-white leading-tight">{title}</h2>
      {subtitle && <p className="mt-0.5 text-xs" style={{ color: "rgba(255,255,255,0.45)" }}>{subtitle}</p>}
    </div>
  </div>
);

/* ═══════════════════════════════════════
   Main page
═══════════════════════════════════════ */
const ClientRequestsPage = () => {
  const queryClient = useQueryClient();
  const storedClient = useMemo(() => getStoredClient(), []);
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);
  const [chatDraft, setChatDraft] = useState("");
  const [requirements, setRequirements] = useState<RequirementsState>(defaultRequirements);
  const chatScrollRef = useRef<HTMLDivElement | null>(null);
  const [profileModalRef, setProfileModalRef] = useState<string | null>(null);

  const [form, setForm] = useState({
    agencyId: "",
    nationality: "No Preference",
    primaryDuty: "No Preference",
    ageGroup: "No Preference",
    language: "No Preference",
    budget: "",
    otherRequirements: "",
  });

  /* ── Queries ── */
  const requestsQuery = useQuery({
    queryKey: ["client-requests", storedClient?.id],
    enabled: typeof storedClient?.id === "number",
    queryFn: () => fetchRequests({ clientId: storedClient?.id, page: 1, pageSize: 12 }),
    refetchInterval: 5000,
  });

  const agenciesQuery = useQuery({
    queryKey: ["public-agencies"],
    queryFn: fetchAgencyOptions,
    staleTime: 60_000,
  });

  // Auto-select the first agency once the list loads (functional update avoids dependency on form.agencyId)
  useEffect(() => {
    const agencies = agenciesQuery.data;
    if (!agencies || agencies.length === 0) return;
    setForm((c) => c.agencyId ? c : { ...c, agencyId: String(agencies[0].id) });
  }, [agenciesQuery.data]);

  const conversationQuery = useQuery({
    queryKey: ["request-conversation", selectedRequestId],
    enabled: Boolean(selectedRequestId),
    queryFn: () => fetchRequestConversation(selectedRequestId!),
    refetchInterval: 5000,
  });

  const messagesQuery = useQuery({
    queryKey: ["request-messages", conversationQuery.data?.id],
    enabled: Boolean(conversationQuery.data?.id),
    queryFn: () => fetchRequestMessages(conversationQuery.data!.id),
    refetchInterval: 5000,
  });

  /* ── Mutations ── */
  const createMutation = useMutation({
    mutationFn: () => {
      if (!storedClient?.id) throw new Error("Client session not found");
      const requirementsList = [
        requirements.noOffDay ? "No Off-day" : null,
        requirements.hasChildren ? "Has child(ren)" : null,
        requirements.married ? "Married" : null,
        requirements.newMaid ? "New Maid" : null,
        requirements.transferMaid ? "Transfer Maid" : null,
        requirements.exSingaporeMaid ? "Ex-Singapore Maid" : null,
      ].filter(Boolean);
      const agencyId = Number(form.agencyId);
      if (!agencyId || !Number.isInteger(agencyId) || agencyId <= 0) {
        throw new Error("Please select an agency before submitting.");
      }
      return createRequest({
        clientId: storedClient.id,
        type: "general",
        agencyId,
        details: {
          nationality: form.nationality,
          primaryDuty: form.primaryDuty,
          ageGroup: form.ageGroup,
          language: form.language,
          ...(form.budget.trim() && { budget: form.budget.trim() }),
          ...(form.otherRequirements.trim() && { otherRequirements: form.otherRequirements.trim() }),
          ...(requirementsList.length > 0 && { requirements: requirementsList.join(", ") }),
        },
      });
    },
    onSuccess: (request) => {
      void queryClient.invalidateQueries({ queryKey: ["agency-requests"] });
      void queryClient.invalidateQueries({ queryKey: ["client-requests"] });
      queryClient.setQueryData<Awaited<ReturnType<typeof fetchRequests>> | undefined>(
        ["client-requests", storedClient?.id],
        (prev) => {
          if (!prev) return { data: [request], pageInfo: { page: 1, pageSize: 12, total: 1, totalPages: 1 } };
          return {
            ...prev,
            data: [request, ...prev.data].slice(0, prev.pageInfo.pageSize),
            pageInfo: {
              ...prev.pageInfo,
              total: prev.pageInfo.total + 1,
              totalPages: Math.max(1, Math.ceil((prev.pageInfo.total + 1) / prev.pageInfo.pageSize)),
            },
          };
        },
      );
      setSelectedRequestId(request.id);
      setChatDraft("");
      setRequirements(defaultRequirements);
      setForm({
        agencyId: "", nationality: "No Preference", primaryDuty: "No Preference",
        ageGroup: "No Preference", language: "No Preference", budget: "", otherRequirements: "",
      });
      toast.success("Your request is now in review.");
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Failed to submit request"),
  });

  const messageMutation = useMutation({
    mutationFn: async () => {
      if (!conversationQuery.data?.id) throw new Error("Conversation not found");
      if (!chatDraft.trim()) throw new Error("Message cannot be empty");
      return createRequestMessage({ conversationId: conversationQuery.data.id, message: chatDraft.trim() });
    },
    onSuccess: (msg) => {
      queryClient.setQueryData<RequestMessageRecord[] | undefined>(
        ["request-messages", msg.conversationId],
        (prev) => [...(prev ?? []), msg],
      );
      setChatDraft("");
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Failed to send message"),
  });

  /* ── Effects ── */
  useEffect(() => {
    const unsub = subscribeToRequestsChanged(() => { void requestsQuery.refetch(); });
    return unsub;
  }, [requestsQuery.refetch]);

  const requests = useMemo(() => requestsQuery.data?.data ?? [], [requestsQuery.data]);

  useEffect(() => {
    if (!selectedRequestId && requests.length > 0) setSelectedRequestId(requests[0].id);
  }, [requests, selectedRequestId]);

  useEffect(() => {
    if (chatScrollRef.current) chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
  }, [messagesQuery.data]);

  const selectedRequest = requests.find((r) => r.id === selectedRequestId) ?? requests[0] ?? null;

  const timeline = selectedRequest
    ? [
        {
          label: "Submitted",
          text: "We received your request and added it to the agency queue.",
          active: true,
          date: formatDate(selectedRequest.createdAt),
          color: C.green,
          icon: <Clock3 className="h-4 w-4" />,
        },
        {
          label: "Updated",
          text: requestStateMessage(selectedRequest.status),
          active: selectedRequest.updatedAt !== selectedRequest.createdAt || selectedRequest.status !== "pending",
          date: formatDate(selectedRequest.updatedAt),
          color: C.yellow,
          icon: <Users className="h-4 w-4" />,
        },
        {
          label: "Outcome",
          text:
            selectedRequest.status === "direct_hire"
              ? "Your request has reached a successful direct hire outcome."
              : selectedRequest.status === "rejected"
              ? "This request was closed."
              : "We will keep this updated as the team works on it.",
          active: selectedRequest.status === "direct_hire" || selectedRequest.status === "rejected",
          date:
            selectedRequest.status === "direct_hire" || selectedRequest.status === "rejected"
              ? formatDate(selectedRequest.updatedAt) : "In progress",
          color: C.greenBright,
          icon: <CheckCircle2 className="h-4 w-4" />,
        },
      ]
    : [];

  const requestMessages = messagesQuery.data ?? [];

  /* ── Chat renderer ── */
  const renderMessage = (message: RequestMessageRecord) => {
    if (message.senderType === "system") {
      return (
        <div key={message.id} className="flex justify-center my-2">
          <div className="rounded-full px-4 py-1.5 text-center text-xs font-semibold"
            style={{
              background: `linear-gradient(135deg, ${C.greenPale}, ${C.yellowPale})`,
              border: `1px solid ${C.greenBorder}`, color: C.green,
            }}>
            {message.message}
          </div>
        </div>
      );
    }
    const isClient = message.senderType === "client";
    const senderLabel = isClient ? "You" : message.senderType === "staff" ? "Agency Staff" : "Agency Admin";
    return (
      <div key={message.id} className={cn("flex", isClient ? "justify-end" : "justify-start")}>
        <div
          className="max-w-[82%] px-4 py-3 text-sm"
          style={isClient
            ? {
                borderRadius: "22px 22px 4px 22px",
                background: `linear-gradient(135deg, ${C.dark}, ${C.darkCard})`,
                color: C.white,
                boxShadow: `0 4px 16px rgba(5,15,9,0.25)`,
              }
            : {
                borderRadius: "22px 22px 22px 4px",
                background: C.white,
                border: `1.5px solid ${C.border}`,
                color: C.text,
              }}
        >
          <p style={{ fontSize: 10, fontWeight: 800, marginBottom: 4, color: isClient ? C.yellowBright : C.greenMid }}>
            {senderLabel}
          </p>
          <p className="whitespace-pre-wrap leading-6">{message.message}</p>
          <p className="mt-2 text-right"
            style={{ fontSize: 10, color: isClient ? "rgba(255,255,255,0.45)" : C.textMuted }}>
            {new Date(message.createdAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
          </p>
        </div>
      </div>
    );
  };

  /* ═══════════════════════════════════════
     Render
  ═══════════════════════════════════════ */
  return (
    <div className="min-h-screen w-full" style={{ background: C.surface }}>

      {profileModalRef && (
        <MaidProfileModal
          referenceCode={profileModalRef}
          onClose={() => setProfileModalRef(null)}
        />
      )}

      {/* Decorative blobs */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 -left-32 h-[520px] w-[520px] rounded-full opacity-25"
          style={{ background: `radial-gradient(circle, ${C.greenPale}, transparent 70%)` }} />
        <div className="absolute top-1/3 -right-48 h-[420px] w-[420px] rounded-full opacity-20"
          style={{ background: `radial-gradient(circle, ${C.yellowPale}, transparent 70%)` }} />
        <div className="absolute bottom-0 left-1/4 h-[300px] w-[300px] rounded-full opacity-10"
          style={{ background: `radial-gradient(circle, ${C.greenBright}40, transparent 70%)` }} />
      </div>

      {/* ── Hero strip ── */}
      <div
        className="relative overflow-hidden w-full"
        style={{
          background: `linear-gradient(135deg, ${C.dark} 0%, ${C.darkCard} 55%, #041008 100%)`,
          borderBottom: `2px solid ${C.greenBorder}`,
        }}
      >
        <div style={{
          position: "absolute", top: 0, left: 0, right: 0, height: 4,
          background: `linear-gradient(90deg, ${C.yellow}, ${C.yellowBright} 35%, ${C.greenBright} 65%, ${C.yellow})`,
          boxShadow: `0 2px 14px ${C.yellow}80`,
        }} />
        <div className="absolute -right-16 -top-16 h-52 w-52 rounded-full" style={{ background: "rgba(245,196,0,0.05)" }} />
        <div className="absolute right-36 bottom-0 h-36 w-36 rounded-full" style={{ background: "rgba(13,128,64,0.08)" }} />

        <div className="relative w-full px-8 py-7 pt-8">
          <div className="flex items-center gap-4 mb-1.5">
            <div style={{
              width: 5, height: 44, borderRadius: 3, flexShrink: 0,
              background: `linear-gradient(180deg, ${C.yellowBright}, ${C.yellow})`,
              boxShadow: `0 0 14px ${C.yellow}90`,
            }} />
            <div>
              <div style={{
                display: "inline-flex", alignItems: "center", gap: 5,
                padding: "3px 10px", borderRadius: 999, marginBottom: 5,
                background: "rgba(245,196,0,0.13)",
                border: "1px solid rgba(245,196,0,0.28)",
              }}>
                <Sparkles style={{ width: 10, height: 10, color: C.yellow }} />
                <span style={{ fontSize: 9, fontWeight: 900, letterSpacing: "0.22em", textTransform: "uppercase", color: C.yellowBright }}>
                  Client Portal
                </span>
              </div>
              <h1 className="text-2xl font-black text-white leading-tight tracking-tight">
                Maid Placement Requests
              </h1>
            </div>
          </div>
          <p className="pl-11 text-sm" style={{ color: "rgba(255,255,255,0.42)" }}>
            Submit your requirements, track updates, and chat with your agency — all in one place.
          </p>
        </div>
      </div>

      {/* ── Main ── */}
      <main className="relative w-full px-6 py-6">
        <div className="grid gap-6 xl:grid-cols-[1.4fr_0.6fr] items-start" style={{ minHeight: "calc(100vh - 140px)" }}>

          {/* ═══════════ LEFT ═══════════ */}
          <div className="space-y-5 min-w-0">

            {/* New Request */}
            <div className="overflow-hidden w-full" style={{
              borderRadius: 20,
              border: `1.5px solid ${C.border}`,
              background: C.white,
              boxShadow: "0 4px 28px rgba(5,15,9,0.09)",
            }}>
              <CardHeader
                eyebrow="New request"
                title="Tell us what you need"
                subtitle="Fill in your preferences and we'll find the best candidates."
              />

              <div className="px-8 py-7 space-y-6">
                {/* Agency */}
                <div className="grid gap-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest" style={{ color: C.textMuted }}>Agency</label>
                  <StyledSelect
                    value={form.agencyId || "No Preference"}
                    onChange={(v) => setForm((c) => ({ ...c, agencyId: v }))}
                  >
                    <option value="">Choose an agency</option>
                    {(agenciesQuery.data ?? []).map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                  </StyledSelect>
                </div>

                {/* 4-col prefs */}
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  {[
                    { key: "nationality", label: "Nationality", opts: NATIONALITY_OPTIONS },
                    { key: "primaryDuty", label: "Primary Duty", opts: PRIMARY_DUTY_OPTIONS },
                    { key: "ageGroup",    label: "Age Group",    opts: AGE_GROUP_OPTIONS },
                    { key: "language",    label: "Language",     opts: LANGUAGE_OPTIONS },
                  ].map(({ key, label, opts }) => (
                    <div key={key} className="grid gap-1.5">
                      <label className="text-[10px] font-black uppercase tracking-widest" style={{ color: C.textMuted }}>{label}</label>
                      <StyledSelect
                        value={form[key as keyof typeof form]}
                        onChange={(v) => setForm((c) => ({ ...c, [key]: v }))}
                      >
                        {opts.map((o) => <option key={o} value={o}>{o}</option>)}
                      </StyledSelect>
                    </div>
                  ))}
                </div>

                {/* Budget + Notes */}
                <div className="grid gap-4 lg:grid-cols-2">
                  <div className="grid gap-1.5">
                    <label className="text-[10px] font-black uppercase tracking-widest" style={{ color: C.textMuted }}>Budget</label>
                    <input
                      className={inputCls} style={inputStyle}
                      value={form.budget}
                      onChange={(e) => setForm((c) => ({ ...c, budget: e.target.value }))}
                      placeholder="e.g. SGD 700 – 900"
                      onFocus={(e) => Object.assign(e.currentTarget.style, inputFocus)}
                      onBlur={(e) => Object.assign(e.currentTarget.style, inputStyle)}
                    />
                  </div>
                  <div className="grid gap-1.5">
                    <label className="text-[10px] font-black uppercase tracking-widest" style={{ color: C.textMuted }}>Additional notes</label>
                    <textarea
                      className="min-h-[44px] w-full resize-none rounded-2xl px-4 py-2.5 text-sm font-medium transition focus:outline-none"
                      style={{ border: `2px solid ${C.border}`, background: C.white, color: C.text }}
                      value={form.otherRequirements}
                      onChange={(e) => setForm((c) => ({ ...c, otherRequirements: e.target.value }))}
                      onFocus={(e) => { e.currentTarget.style.borderColor = C.greenMid; }}
                      onBlur={(e)  => { e.currentTarget.style.borderColor = C.border;  }}
                      placeholder="Share your household needs, caregiving priorities, or anything the agency should know."
                    />
                  </div>
                </div>

                {/* Special requirements */}
                <div className="p-5" style={{
                  borderRadius: 16,
                  border: `1.5px solid ${C.greenBorder}`,
                  background: `linear-gradient(135deg, ${C.greenPale}80, ${C.yellowPale}80)`,
                }}>
                  <p className="text-[10px] font-black uppercase tracking-widest mb-3" style={{ color: C.textMuted }}>Special requirements</p>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { key: "noOffDay",        label: "No Off-day" },
                      { key: "hasChildren",     label: "Has child(ren)" },
                      { key: "married",         label: "Married" },
                      { key: "newMaid",         label: "New Maid" },
                      { key: "transferMaid",    label: "Transfer Maid" },
                      { key: "exSingaporeMaid", label: "Ex-Singapore Maid" },
                    ].map((item) => {
                      const checked = requirements[item.key as keyof RequirementsState];
                      return (
                        <button
                          key={item.key} type="button"
                          onClick={() => setRequirements((c) => ({ ...c, [item.key]: !c[item.key as keyof RequirementsState] }))}
                          style={{
                            border: checked ? "none" : `1.5px solid ${C.border}`,
                            background: checked ? `linear-gradient(135deg, ${C.dark}, ${C.darkCard})` : C.white,
                            color: checked ? C.white : C.text,
                            boxShadow: checked ? `0 3px 14px rgba(5,15,9,0.32)` : "none",
                            fontWeight: 700, fontSize: 12,
                            padding: "6px 14px", borderRadius: 999,
                            cursor: "pointer", transition: "all .18s",
                          }}
                        >
                          {checked && <span style={{ color: C.yellowBright, marginRight: 5 }}>✓</span>}
                          {item.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="flex justify-end">
                  <GradBtn disabled={createMutation.isPending} onClick={() => createMutation.mutate()}>
                    {createMutation.isPending
                      ? <><Loader2 className="h-4 w-4 animate-spin" /> Sending...</>
                      : <><Sparkles className="h-4 w-4" /> Submit request <ArrowRight className="h-4 w-4" /></>}
                  </GradBtn>
                </div>
              </div>
            </div>

            {/* My Requests */}
            <div className="overflow-hidden w-full" style={{
              borderRadius: 20,
              border: `1.5px solid ${C.border}`,
              background: C.white,
              boxShadow: "0 4px 24px rgba(5,15,9,0.06)",
            }}>
              <div className="flex items-center justify-between gap-4 px-8 py-4"
                style={{ borderBottom: `1px solid ${C.border}`, background: C.surface, borderRadius: "18px 18px 0 0" }}>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.22em]" style={{ color: C.textMuted }}>My requests</p>
                  <h2 className="mt-0.5 text-lg font-black" style={{ color: C.text }}>Track every request</h2>
                </div>
                <button
                  type="button"
                  onClick={() => void requestsQuery.refetch()}
                  disabled={requestsQuery.isFetching}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-bold transition-all disabled:opacity-50"
                  style={{ border: `1.5px solid ${C.border}`, background: C.white, color: C.green, borderRadius: 999 }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = C.greenPale; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = C.white; }}
                >
                  {requestsQuery.isFetching
                    ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    : <RefreshCcw className="h-3.5 w-3.5" />}
                  Refresh
                </button>
              </div>

              <div className="px-8 py-5 space-y-2.5">
                {requestsQuery.isLoading ? (
                  <div className="py-10 text-center text-sm" style={{ color: C.textMuted }}>Loading your requests...</div>
                ) : requests.length === 0 ? (
                  <div className="p-10 text-center"
                    style={{ borderRadius: 14, border: `2px dashed ${C.border}`, background: C.surface }}>
                    <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center"
                      style={{ borderRadius: 12, background: C.greenPale, border: `1.5px solid ${C.greenBorder}` }}>
                      <Star className="h-6 w-6" style={{ color: C.greenMid }} />
                    </div>
                    <p className="font-bold" style={{ color: C.text }}>No requests yet</p>
                    <p className="mt-1 text-sm" style={{ color: C.textMuted }}>Submit your first request and it will appear here right away.</p>
                  </div>
                ) : (
                  <div className="grid gap-2.5 lg:grid-cols-2">
                    {requests.map((request) => {
                      const meta   = requestStatusMeta[request.status];
                      const active = selectedRequest?.id === request.id;
                      return (
                        <button
                          key={request.id} type="button"
                          onClick={() => setSelectedRequestId(request.id)}
                          className="w-full text-left transition-all duration-200"
                          style={{
                            borderRadius: 14,
                            border: active ? `2px solid ${C.greenMid}` : `1.5px solid ${C.border}`,
                            background: active ? `linear-gradient(135deg, ${C.greenPale}90, ${C.yellowPale}70)` : C.white,
                            padding: "14px 16px",
                            boxShadow: active ? `0 2px 20px ${C.greenGlow}` : "0 1px 4px rgba(5,15,9,0.04)",
                          }}
                          onMouseEnter={(e) => { if (!active) { e.currentTarget.style.borderColor = C.greenBorder; e.currentTarget.style.transform = "translateY(-1px)"; } }}
                          onMouseLeave={(e) => { if (!active) { e.currentTarget.style.borderColor = C.border;     e.currentTarget.style.transform = "";               } }}
                        >
                          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                            <div>
                              {active && (
                                <div className="inline-flex items-center gap-1 mb-1.5 px-2 py-0.5 text-[9px] font-black uppercase tracking-widest"
                                  style={{ background: C.yellow, color: C.dark, borderRadius: 4, boxShadow: `0 1px 8px ${C.yellow}70` }}>
                                  ● Viewing
                                </div>
                              )}
                              <p className="text-sm font-bold" style={{ color: C.text }}>{request.summary}</p>
                              <p className="mt-0.5 text-xs" style={{ color: C.textMuted }}>{formatDate(request.createdAt)}</p>
                              <p className="text-xs font-semibold" style={{ color: C.greenMid }}>{request.agencyName}</p>
                            </div>
                            <span className="shrink-0 self-start px-3 py-1 text-xs font-bold" style={{
                              borderRadius: 999,
                              background: meta.badgeClassName?.includes("emerald") ? C.greenPale : C.yellowPale,
                              color:      meta.badgeClassName?.includes("emerald") ? C.green     : C.yellowDeep,
                              border:     `1px solid ${meta.badgeClassName?.includes("emerald") ? C.greenBorder : C.yellowBorder}`,
                            }}>
                              {meta.label}
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ═══════════ RIGHT ═══════════ */}
          <div className="min-w-0">
            <div className="sticky top-6 overflow-hidden" style={{
              borderRadius: 20,
              border: `1.5px solid ${C.border}`,
              background: C.white,
              boxShadow: "0 8px 40px rgba(5,15,9,0.12)",
            }}>
              <CardHeader
                eyebrow="Status detail"
                title={selectedRequest ? "Live request status" : "Select a request"}
              />

              <div className="px-6 py-5 space-y-5 overflow-y-auto" style={{ maxHeight: "calc(100vh - 70px)" }}>
                {selectedRequest ? (
                  <>
                    {/* Summary */}
                    <div className="p-4" style={{
                      borderRadius: 14,
                      border: `1.5px solid ${C.greenBorder}`,
                      background: `linear-gradient(135deg, ${C.greenPale}80, ${C.yellowPale}60)`,
                    }}>
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-bold" style={{ color: C.text }}>{selectedRequest.summary}</p>
                          <p className="mt-0.5 text-xs" style={{ color: C.textMuted }}>
                            {selectedRequest.budget ? `Budget: ${selectedRequest.budget}` : "Budget not specified"}
                          </p>
                          <p className="text-xs font-semibold" style={{ color: C.greenMid }}>{selectedRequest.agencyName}</p>
                        </div>
                        <span className="shrink-0 px-2.5 py-0.5 text-[10px] font-black uppercase" style={{
                          borderRadius: 999, background: C.greenPale, color: C.green, border: `1px solid ${C.greenBorder}`,
                        }}>
                          {requestStatusMeta[selectedRequest.status].label}
                        </span>
                      </div>
                      <p className="mt-2 text-xs leading-relaxed" style={{ color: C.textMuted }}>
                        {requestStateMessage(selectedRequest.status)}
                      </p>
                    </div>

                    {/* Timeline */}
                    <div className="space-y-0">
                      {timeline.map((item, index) => (
                        <div key={item.label} className="flex gap-3">
                          <div className="flex flex-col items-center">
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center" style={{
                              borderRadius: 8,
                              background: item.active ? `linear-gradient(135deg, ${item.color}, ${item.color}bb)` : C.surface,
                              color:       item.active ? C.white : C.border,
                              border:      item.active ? "none"  : `1.5px solid ${C.border}`,
                              boxShadow:   item.active ? `0 3px 14px ${item.color}44` : "none",
                            }}>
                              {item.icon}
                            </div>
                            {index < timeline.length - 1 && (
                              <div className="mt-1 mb-1 w-0.5 flex-1 min-h-[28px]" style={{
                                background: item.active
                                  ? `linear-gradient(to bottom, ${C.greenBright}80, ${C.yellow}60)`
                                  : C.border,
                              }} />
                            )}
                          </div>
                          <div className="pb-4 pt-0.5">
                            <p className="text-sm font-bold" style={{ color: item.active ? C.text : C.textMuted }}>{item.label}</p>
                            <p className="text-xs leading-relaxed" style={{ color: C.textMuted }}>{item.text}</p>
                            <p className="text-[10px] font-bold mt-0.5" style={{ color: C.greenMid }}>{item.date}</p>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Suggested maids */}
                    {selectedRequest.status === "interested" && selectedRequest.maids.length > 0 && (
                      <div className="space-y-3">
                        <div className="flex items-center gap-2 px-3 py-2" style={{
                          borderRadius: 10, background: C.yellowPale,
                          border: `1px solid ${C.yellowBorder}`,
                          borderLeftWidth: 4, borderLeftColor: C.yellow,
                        }}>
                          <Star className="h-3.5 w-3.5 shrink-0" style={{ color: C.yellow, fill: C.yellow }} />
                          <div>
                            <p className="text-xs font-black uppercase tracking-widest" style={{ color: C.yellowDeep }}>Suggested helpers</p>
                            <p className="text-[10px]" style={{ color: "#92680A" }}>
                              {selectedRequest.maids.length} candidate{selectedRequest.maids.length !== 1 ? "s" : ""} shortlisted
                            </p>
                          </div>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          {selectedRequest.maids.map((maid) => (
                            <div
                              key={maid.referenceCode}
                              className="relative overflow-hidden transition-all duration-200"
                              style={{ borderRadius: 14, border: `1.5px solid ${C.border}`, background: C.white, boxShadow: "0 2px 8px rgba(5,15,9,0.06)" }}
                              onMouseEnter={(e) => { e.currentTarget.style.borderColor = C.greenMid; e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = `0 6px 22px ${C.greenGlow}`; }}
                              onMouseLeave={(e) => { e.currentTarget.style.borderColor = C.border;   e.currentTarget.style.transform = "";               e.currentTarget.style.boxShadow = "0 2px 8px rgba(5,15,9,0.06)"; }}
                            >
                              <div className="relative w-full overflow-hidden" style={{ background: C.surface }}>
                                <MaidPhotoLarge maid={maid} />
                                <div className="absolute top-0 left-0">
                                  <span className="inline-block px-1.5 py-px text-[9px] font-bold"
                                    style={{ background: "rgba(5,15,9,0.82)", color: C.yellowBright, backdropFilter: "blur(2px)", borderRadius: 0 }}>
                                    {maid.nationality?.toUpperCase() ?? "MAID"}
                                  </span>
                                </div>
                                <div className="absolute bottom-0 left-0 right-0 px-2 py-1.5"
                                  style={{ background: "linear-gradient(to top, rgba(5,15,9,0.88), transparent)" }}>
                                  <p className="font-mono text-[10px] font-black text-white">{maid.referenceCode}</p>
                                </div>
                              </div>
                              <div className="p-2">
                                <p className="text-xs font-bold leading-tight line-clamp-1" style={{ color: C.text }}>{maid.fullName || "—"}</p>
                                {maid.nationality && (
                                  <p className="text-[10px] font-semibold mt-0.5" style={{ color: C.greenMid }}>{maid.nationality}</p>
                                )}
                                <button
                                  type="button"
                                  onClick={() => setProfileModalRef(maid.referenceCode)}
                                  className="mt-2 flex w-full items-center justify-center gap-1 py-1.5 text-[10px] font-black uppercase tracking-wide transition-all"
                                  style={{
                                    borderRadius: 8,
                                    background: `linear-gradient(120deg, ${C.yellow}, ${C.yellowBright})`,
                                    color: C.dark, border: "none", cursor: "pointer",
                                    boxShadow: `0 2px 10px ${C.yellow}60`,
                                  }}
                                  onMouseEnter={(e) => { e.currentTarget.style.opacity = "0.88"; }}
                                  onMouseLeave={(e) => { e.currentTarget.style.opacity = "1"; }}
                                >
                                  <ExternalLink className="h-2.5 w-2.5" />
                                  View Profile
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Inline maid rows */}
                    {selectedRequest.status !== "interested" && selectedRequest.maids.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: C.textMuted }}>Associated helpers</p>
                        {selectedRequest.maids.map((maid) => (
                          <div key={maid.referenceCode} className="flex items-center gap-3 p-3"
                            style={{ borderRadius: 12, border: `1.5px solid ${C.border}`, background: C.surface }}>
                            <MaidPhoto maid={maid} size={56} />
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-bold truncate" style={{ color: C.text }}>{maid.fullName || "—"}</p>
                              <p className="text-[10px] font-semibold" style={{ color: C.greenMid }}>{maid.nationality}</p>
                              <p className="font-mono text-[9px]" style={{ color: C.textMuted }}>{maid.referenceCode}</p>
                            </div>
                            <button
                              type="button"
                              onClick={() => setProfileModalRef(maid.referenceCode)}
                              className="shrink-0 flex items-center gap-1 px-2.5 py-1.5 text-[10px] font-black uppercase transition-colors"
                              style={{ borderRadius: 8, border: `1.5px solid ${C.border}`, background: C.white, color: C.text, cursor: "pointer" }}
                              onMouseEnter={(e) => { e.currentTarget.style.background = C.greenPale; }}
                              onMouseLeave={(e) => { e.currentTarget.style.background = C.white; }}
                            >
                              <ExternalLink className="h-3 w-3" /> View
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Chat */}
                    <div className="space-y-2.5">
                      <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 16 }}>
                        <p className="text-xs font-black uppercase tracking-widest" style={{ color: C.textMuted }}>Request conversation</p>
                        <p className="text-xs mt-0.5" style={{ color: C.textMuted }}>Send updates and questions directly on this request.</p>
                      </div>
                      <div ref={chatScrollRef} className="space-y-2.5 overflow-y-auto p-3"
                        style={{ maxHeight: 320, borderRadius: 14, border: `1.5px solid ${C.border}`, background: C.surface }}>
                        {messagesQuery.isLoading || conversationQuery.isLoading ? (
                          <div className="py-6 text-center text-sm" style={{ color: C.textMuted }}>Loading conversation...</div>
                        ) : requestMessages.length === 0 ? (
                          <div className="py-6 text-center text-sm" style={{ color: C.textMuted }}>No messages yet.</div>
                        ) : (
                          requestMessages.map(renderMessage)
                        )}
                      </div>
                      <div style={{ borderRadius: 14, border: `1.5px solid ${C.border}`, background: C.white, overflow: "hidden" }}>
                        <textarea
                          value={chatDraft}
                          onChange={(e) => setChatDraft(e.target.value)}
                          placeholder="Reply to the agency about this request..."
                          className="min-h-[80px] w-full resize-none border-0 bg-transparent px-4 py-3 text-sm focus:outline-none"
                          style={{ color: C.text }}
                          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); messageMutation.mutate(); } }}
                        />
                        <div className="flex items-center justify-between gap-3 px-4 py-2.5"
                          style={{ borderTop: `1px solid ${C.border}`, background: C.surface }}>
                          <p className="text-[10px]" style={{ color: C.textMuted }}>↵ Enter · Shift+Enter new line</p>
                          <GradBtn
                            small
                            disabled={messageMutation.isPending || !chatDraft.trim() || !conversationQuery.data?.id}
                            onClick={() => messageMutation.mutate()}
                          >
                            {messageMutation.isPending
                              ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Sending...</>
                              : "Send message"}
                          </GradBtn>
                        </div>
                      </div>
                    </div>

                    {/* Rejected */}
                    {selectedRequest.status === "rejected" && (
                      <div className="p-4" style={{ borderRadius: 12, border: "1.5px solid #FECACA", background: "#FEF2F2" }}>
                        <p className="text-sm font-black" style={{ color: "#B91C1C" }}>Request closed</p>
                        <p className="mt-1 text-xs" style={{ color: "#DC2626" }}>You can retry with updated preferences whenever you're ready.</p>
                        <button
                          type="button"
                          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
                          className="mt-3 inline-flex items-center gap-2 px-4 py-2 text-xs font-bold transition-colors"
                          style={{ borderRadius: 999, border: "1.5px solid #FECACA", background: C.white, color: "#B91C1C", cursor: "pointer" }}
                          onMouseEnter={(e) => { e.currentTarget.style.background = "#FEF2F2"; }}
                          onMouseLeave={(e) => { e.currentTarget.style.background = C.white; }}
                        >
                          <ArrowRight className="h-3.5 w-3.5" /> Retry with a new request
                        </button>
                      </div>
                    )}

                    {/* Success */}
                    {selectedRequest.status === "direct_hire" && (
                      <div className="p-4" style={{
                        borderRadius: 12,
                        border: `1.5px solid ${C.greenBorder}`,
                        background: `linear-gradient(135deg, ${C.greenPale}, ${C.yellowPale})`,
                      }}>
                        <p className="text-sm font-black" style={{ color: C.green }}>🎉 Direct hire successful!</p>
                        <p className="mt-1 text-xs" style={{ color: C.textMuted }}>
                          Your request has progressed to a direct hire outcome. The agency will continue the next steps with you.
                        </p>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="p-12 text-center"
                    style={{ borderRadius: 14, border: `2px dashed ${C.border}`, background: C.surface }}>
                    <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center"
                      style={{ borderRadius: 12, background: C.greenPale, border: `1.5px solid ${C.greenBorder}` }}>
                      <Users className="h-6 w-6" style={{ color: C.greenMid }} />
                    </div>
                    <p className="font-bold text-sm" style={{ color: C.text }}>Select a request</p>
                    <p className="mt-1 text-xs" style={{ color: C.textMuted }}>
                      Pick a request from the left to see status, helper suggestions, and conversation.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

        </div>
      </main>
    </div>
  );
};

export default ClientRequestsPage;