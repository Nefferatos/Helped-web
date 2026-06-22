import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ChevronLeft, ChevronRight, Search, Star, X, Sparkles, Filter, Trash2, ExternalLink, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { calculateAge, getExperienceBucket, MaidProfile } from "@/lib/maids";
import { toast } from "@/components/ui/sonner";
import { getClientToken } from "@/lib/clientAuth";
import { getSavedShortlistRefs, subscribeToShortlistRefs, toggleShortlistRef } from "@/lib/shortlist";
import PublicSiteNavbar from "@/components/PublicSiteNavbar";
import ClientPortalNavbar from "@/ClientPage/ClientPortalNavbar";
import "./ClientTheme.css";

// ── Theme tokens ──────────────────────────────────────────────────────────────
const C = {
  green:       "#0E4E5E",
  greenMid:    "#1A6F82",
  greenLight:  "#2196A8",
  greenPale:   "#E6F4F7",
  greenBorder: "rgba(14,78,94,0.25)",
  yellow:      "#FCD34D",
  yellowWarm:  "#FBBF24",
  yellowPale:  "#FFFBEB",
  yellowBorder:"rgba(252,211,77,0.35)",
  dark:        "#072B35",
  darkMid:     "#0A3D4A",
  text:        "#072B35",
  textMuted:   "#1A5568",
  border:      "#B2D8E0",
  surface:     "#EEF8FA",
  white:       "#FFFFFF",
  slate:       "#EBF5F8",
};

// ── Nationality → ISO 3166-1 alpha-2 ─────────────────────────────────────────
const NATIONALITY_FLAGS: Record<string, string> = {
  filipino:"ph", philippines:"ph", indonesian:"id", indonesia:"id",
  myanmar:"mm", burmese:"mm", cambodian:"kh", cambodia:"kh",
  vietnamese:"vn", vietnam:"vn", thai:"th", thailand:"th",
  malaysian:"my", malaysia:"my", singaporean:"sg", singapore:"sg",
  indian:"in", india:"in", "sri lankan":"lk", "sri lanka":"lk",
  bangladeshi:"bd", bangladesh:"bd", nepali:"np", nepalese:"np", nepal:"np",
  pakistani:"pk", pakistan:"pk", chinese:"cn", china:"cn",
  hongkong:"hk", "hong kong":"hk", taiwanese:"tw", taiwan:"tw",
  korean:"kr", "south korea":"kr", japanese:"jp", japan:"jp",
  ethiopian:"et", ethiopia:"et", kenyan:"ke", kenya:"ke",
  ugandan:"ug", uganda:"ug", ghanaian:"gh", ghana:"gh",
  nigerian:"ng", nigeria:"ng",
};

const getNationalityCode = (nationality?: string): string => {
  if (!nationality) return "";
  const key = nationality.toLowerCase().trim();
  if (NATIONALITY_FLAGS[key]) return NATIONALITY_FLAGS[key];
  for (const [k, code] of Object.entries(NATIONALITY_FLAGS)) {
    if (key.includes(k)) return code;
  }
  return "";
};

const FlagCircle = ({ code }: { code: string }) => {
  if (!code) return null;
  return (
    <span style={{
      display:"inline-flex", alignItems:"center", justifyContent:"center",
      width:14, height:14, borderRadius:"50%", overflow:"hidden",
      border:"1px solid rgba(0,0,0,0.13)", flexShrink:0,
      verticalAlign:"middle", background:C.greenPale,
    }}>
      <img src={`https://flagcdn.com/w40/${code.toLowerCase()}.png`} alt={code}
        style={{ width:"100%", height:"100%", objectFit:"cover", display:"block" }} />
    </span>
  );
};

const LockIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
);

// ── Category helper ───────────────────────────────────────────────────────────
const getMaidCategory = (maid: MaidProfile): string => {
  const agencyContact    = (maid.agencyContact    as Record<string, unknown>) || {};
  const introduction     = (maid.introduction     as Record<string, unknown>) || {};
  const skillsPreferences = (maid.skillsPreferences as Record<string, unknown>) || {};
  const raw =
    agencyContact["indianMaidCategory"] ??
    introduction["indianMaidCategory"] ??
    skillsPreferences["indianMaidCategory"];
  const value = String(raw ?? "").trim();
  return value && value !== "N/A" && value !== "N.A." && value !== "-" ? value : "";
};

// ── Skills table helpers ──────────────────────────────────────────────────────
type SkillRow = { name: string; willing: boolean; evaluation: number };

const getSkillsRows = (maid: MaidProfile): SkillRow[] => {
  const sp = (maid.skillsPreferences as Record<string, unknown>) || {};
  const skills = (sp["skills"] || sp["Skills"]) as Record<string, unknown> | undefined;
  if (!skills || typeof skills !== "object") {
    const workAreas = Object.keys(maid.workAreas || {});
    return workAreas.map((name) => ({ name, willing: true, evaluation: 0 }));
  }
  return Object.entries(skills).map(([name, val]) => {
    const v = (val as Record<string, unknown>) || {};
    const willing = Boolean(v["willing"] ?? v["Willing"] ?? v["willingness"] ?? true);
    const evalRaw = Number(v["evaluation"] ?? v["Evaluation"] ?? v["rating"] ?? 0);
    return { name, willing, evaluation: Math.min(5, Math.max(0, evalRaw)) };
  });
};

const parseStarEval = (raw?: string): number => {
  if (!raw) return 0;
  const m = String(raw).match(/^(\d+)\//);
  return m ? Math.min(5, Math.max(0, parseInt(m[1], 10))) : 0;
};

type WorkAreaRow = { name: string; willing: boolean; experience: boolean; evaluation: number; years: string };

const getWorkAreaRows = (maid: MaidProfile): WorkAreaRow[] => {
  const raw = Object.entries(maid.workAreas || {}) as Array<
    [string, { willing?: boolean; experience?: boolean; evaluation?: string; yearsOfExperience?: string }]
  >;
  return raw.map(([name, cfg]) => ({
    name,
    willing: Boolean(cfg.willing),
    experience: Boolean(cfg.experience),
    evaluation: parseStarEval(cfg.evaluation),
    years: String(cfg.yearsOfExperience || "").trim(),
  }));
};

const StarRating = ({ count }: { count: number }) => (
  <span className="inline-flex items-center gap-px">
    {Array.from({ length: 5 }).map((_, i) => (
      <svg key={i} viewBox="0 0 16 16" style={{ height:12, width:12, color: i < count ? C.yellow : "#B2D8E0" }} fill="currentColor">
        <path d="M8 1l1.9 3.9 4.3.6-3.1 3 .7 4.3L8 10.8l-3.8 2 .7-4.3-3.1-3 4.3-.6z" />
      </svg>
    ))}
  </span>
);

// ── Hover popup helpers ───────────────────────────────────────────────────────
const getMaidPopupDetails = (maid: MaidProfile) => {
  const sp = (maid.skillsPreferences as Record<string, unknown>) || {};
  const intro = (maid.introduction as Record<string, unknown>) || {};
  const agencyContact = (maid.agencyContact as Record<string, unknown>) || {};
  const englishLevel = maid.languageSkills
    ? String((maid.languageSkills as Record<string, unknown>)["english"] || (maid.languageSkills as Record<string, unknown>)["English"] || "").trim() : "";
  const height = String(maid.height || sp["height"] || intro["height"] || "").trim();
  const weight = String(maid.weight || sp["weight"] || intro["weight"] || "").trim();
  const bioRaw = String(sp["remarks"] || intro["remarks"] || sp["biodata"] || intro["biodata"] || sp["summary"] || intro["summary"] || agencyContact["remarks"] || "").trim();
  const workAreas = Object.keys(maid.workAreas || {}).filter(Boolean);
  const otherInfo = (sp.otherInformation as Record<string, boolean>) || {};
  const willingKeys = ["Can work on off-days with compensation?", "Willing to work on off-days with compensation?", "Willing to work on off-days with  compensation?"];
  const willingOffDays = willingKeys.some((k) => Boolean(otherInfo[k]));
  const langs = maid.languageSkills
    ? Object.entries(maid.languageSkills as Record<string, unknown>)
        .filter(([, lvl]) => { const l = String(lvl || "").trim().toLowerCase(); return l && l !== "zero" && l !== "none"; })
        .map(([key, lvl]) => `${key.charAt(0).toUpperCase() + key.slice(1)}: ${String(lvl).trim()}`) : [];
  const expCountries: string[] = [];
  if (Array.isArray(maid.employmentHistory)) {
    for (const e of maid.employmentHistory) {
      const text = Object.values(e as Record<string, unknown>).map(String).join(" ").toLowerCase();
      if (text.includes("singapore")) expCountries.push("Singapore");
      else if (text.includes("hong kong") || text.includes("hongkong")) expCountries.push("Hong Kong");
      else if (text.includes("malaysia")) expCountries.push("Malaysia");
      else if (text.includes("taiwan")) expCountries.push("Taiwan");
      else if (text.includes("dubai") || text.includes("uae") || text.includes("saudi") || text.includes("middle east")) expCountries.push("Middle East");
    }
  }
  return { englishLevel, height, weight, bioRaw, workAreas, willingOffDays, langs, uniqueExp: [...new Set(expCountries)] };
};

// ── Maid Hover Popup (logged-in) ──────────────────────────────────────────────
const MaidHoverPopup = ({ maid, anchorRef, onDismiss }: { maid: MaidProfile; anchorRef: React.RefObject<HTMLElement>; onDismiss?: () => void }) => {
  const popupRef = useRef<HTMLDivElement>(null);
  const [style, setStyle] = useState<React.CSSProperties>({ visibility:"hidden" });
  const [pointerSide, setPointerSide] = useState<"left"|"right">("right");
  const [isMobile, setIsMobile] = useState(false);
  const details = useMemo(() => getMaidPopupDetails(maid), [maid]);
  const age = calculateAge(maid.dateOfBirth);
  const flagCode = getNationalityCode(maid.nationality);

  useEffect(() => {
    const mobile = window.innerWidth < 640;
    setIsMobile(mobile);
    if (mobile) {
      const w = Math.min(window.innerWidth - 32, 360);
      setStyle({ position:"fixed", top:"50%", left:"50%", transform:"translate(-50%, -50%)", width:w, zIndex:9999, visibility:"visible", maxHeight:"80vh", overflowY:"auto" });
      return;
    }
    const anchor = anchorRef.current;
    const popup = popupRef.current;
    if (!anchor || !popup) return;
    const rect = anchor.getBoundingClientRect();
    const popupWidth = 340;
    const popupHeight = popup.offsetHeight || 360;
    const gap = 8;
    const viewportW = window.innerWidth;
    const viewportH = window.innerHeight;
    const scrollY = window.scrollY;
    const scrollX = window.scrollX;
    let left = rect.right + scrollX + gap;
    let side: "left"|"right" = "right";
    if (left + popupWidth > scrollX + viewportW - 8) { left = rect.left + scrollX - popupWidth - gap; side = "left"; }
    left = Math.max(scrollX + 8, left);
    let top = rect.top + scrollY;
    if (top + popupHeight > scrollY + viewportH - 8) top = scrollY + viewportH - popupHeight - 8;
    top = Math.max(scrollY + 8, top);
    setPointerSide(side);
    setStyle({ position:"absolute", top, left, width:popupWidth, zIndex:9999, visibility:"visible" });
  }, [anchorRef]);

  return (
    <>
      {isMobile && onDismiss && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.5)", zIndex:9998 }} onClick={onDismiss} />
      )}
    <div ref={popupRef} style={style} className="relative">
      {!isMobile && (
        <div className={`absolute top-1/2 -translate-y-1/2 w-0 h-0 ${pointerSide === "right" ? "-left-4" : "-right-4"}`}
          style={{ borderWidth:"8px", borderStyle:"solid",
            borderColor: pointerSide === "right" ? `transparent white transparent transparent` : `transparent transparent transparent white` }} />
      )}
      <div className="bg-white overflow-hidden flex flex-col max-h-[500px]"
        style={{ border:`1.5px solid ${C.border}`, boxShadow:"0 20px 60px rgba(7,43,53,0.18)" }}>
        <div className="px-3 py-2.5" style={{ background:`linear-gradient(135deg, ${C.dark} 0%, ${C.darkMid} 100%)` }}>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", gap:8 }}>
            <div style={{ display:"flex", alignItems:"center", gap:8, minWidth:0, flex:1 }}>
              <div style={{ width:3, height:32, background:`linear-gradient(180deg, ${C.yellowWarm}, ${C.yellow})`, borderRadius:2, flexShrink:0 }} />
              <div style={{ minWidth:0 }}>
                <p className="text-xs font-bold text-white leading-tight line-clamp-1">
                  {maid.nationality ? `${maid.nationality} maid` : "Maid"}{maid.fullName ? `: ${maid.fullName}` : ""}
                </p>
                {maid.referenceCode && <p style={{ fontSize:10, color:C.yellowWarm, fontFamily:"monospace", marginTop:2 }}>{maid.referenceCode}</p>}
              </div>
            </div>
            {onDismiss && (
              <button type="button" onClick={onDismiss} style={{ flexShrink:0, padding:4, background:"rgba(255,255,255,0.12)", border:"none", borderRadius:6, cursor:"pointer", color:"rgba(255,255,255,0.7)", display:"flex", alignItems:"center", justifyContent:"center" }}
                onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.22)")}
                onMouseLeave={e => (e.currentTarget.style.background = "rgba(255,255,255,0.12)")}>
                <X style={{ width:14, height:14 }} />
              </button>
            )}
          </div>
        </div>
        <div className="p-3 space-y-2 overflow-y-auto flex-1">
          <div className="flex items-center gap-1.5 flex-wrap">
            {maid.type && <span className={`inline-block px-1.5 py-px text-[9px] font-bold border ${getMaidTypeBadgeClass(maid.type)}`}>{getTypeLabel(maid.type)}</span>}
            {maid.nationality && (
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold" style={{ color:C.text }}>
                <FlagCircle code={flagCode} />{maid.nationality}
              </span>
            )}
          </div>
          <div style={{ borderTop:`1px solid ${C.border}` }} />
          <div className="grid grid-cols-2 gap-x-2 gap-y-1">
            {details.englishLevel && <PopupRow label="English" value={details.englishLevel} />}
            {details.height && <PopupRow label="Height" value={`${details.height} cm`} />}
            {details.weight && <PopupRow label="Weight" value={`${details.weight} kg`} />}
            {age !== null && <PopupRow label="Age" value={`${age} yrs`} />}
            {maid.maritalStatus && <PopupRow label="Status" value={maid.maritalStatus} />}
            {maid.religion && <PopupRow label="Religion" value={maid.religion} />}
            {maid.educationLevel && <PopupRow label="Education" value={maid.educationLevel} />}
            {details.willingOffDays && <PopupRow label="Off-days" value="Willing ✓" valueClass="font-semibold" valueStyle={{ color:C.greenMid }} />}
          </div>
          {details.langs.length > 0 && (
            <><div style={{ borderTop:`1px solid ${C.border}` }} />
            <div>
              <p style={{ fontSize:9, fontWeight:800, textTransform:"uppercase", letterSpacing:"0.07em", color:C.textMuted, marginBottom:4 }}>Languages</p>
              <div className="space-y-0.5">
                {details.langs.slice(0, 4).map((l) => <p key={l} style={{ fontSize:10, color:C.text, lineHeight:1.4 }}>{l}</p>)}
              </div>
            </div></>
          )}
          {details.uniqueExp.length > 0 && (
            <><div style={{ borderTop:`1px solid ${C.border}` }} />
            <div>
              <p style={{ fontSize:9, fontWeight:800, textTransform:"uppercase", letterSpacing:"0.07em", color:C.textMuted, marginBottom:4 }}>Experience</p>
              <p style={{ fontSize:10, color:C.text }}>{details.uniqueExp.join(", ")}</p>
            </div></>
          )}
          {details.workAreas.length > 0 && (
            <><div style={{ borderTop:`1px solid ${C.border}` }} />
            <div>
              <p style={{ fontSize:9, fontWeight:800, textTransform:"uppercase", letterSpacing:"0.07em", color:C.textMuted, marginBottom:4 }}>Can handle</p>
              <p style={{ fontSize:10, color:C.text, lineHeight:1.4 }}>{details.workAreas.slice(0, 5).join(" · ")}</p>
            </div></>
          )}
          {details.bioRaw && (
            <><div style={{ borderTop:`1px solid ${C.border}` }} />
            <p style={{ fontSize:10, color:C.textMuted, lineHeight:1.5, fontStyle:"italic" }}>
              {details.bioRaw.slice(0, 160)}{details.bioRaw.length > 160 ? "…" : ""}
            </p></>
          )}
        </div>
      </div>
    </div>
    </>
  );
};

const PopupRow = ({ label, value, valueClass = "", valueStyle }: { label: string; value: string; valueClass?: string; valueStyle?: React.CSSProperties }) => (
  <div className="flex flex-col">
    <span style={{ fontSize:9, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.07em", color:C.textMuted }}>{label}</span>
    <span className={`text-[10px] leading-tight line-clamp-1 ${valueClass}`} style={{ color:C.text, ...valueStyle }}>{value}</span>
  </div>
);

// ════════════════════════════════════════════════════════════════════════════
//  LockedMaidHoverModal
// ════════════════════════════════════════════════════════════════════════════
const LOCKED_MODAL_WIDTH = 340;
const LOCKED_MODAL_GAP = 10;

const LockedMaidHoverModal = ({
  maid, loginPath, anchorRect, onClose, onMouseEnter, onMouseLeave,
}: {
  maid: MaidProfile; loginPath: string; anchorRect: DOMRect | null;
  onClose: () => void; onMouseEnter: () => void; onMouseLeave: () => void;
}) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<React.CSSProperties>({ position:"fixed", visibility:"hidden", top:0, left:0, width:LOCKED_MODAL_WIDTH, zIndex:9999 });
  const [side, setSide] = useState<"right"|"left">("right");

  useLayoutEffect(() => {
    if (!anchorRect) return;
    const viewportH = window.innerHeight;
    const viewportW = window.innerWidth;
    const fixedHeight = 480;
    if (viewportW < 640) {
      const w = Math.min(viewportW - 32, 360);
      setPos({ position:"fixed", top:"50%", left:"50%", transform:"translate(-50%, -50%)", width:w, height:fixedHeight, zIndex:9999, visibility:"visible" } as React.CSSProperties);
      return;
    }
    let left = anchorRect.right + LOCKED_MODAL_GAP;
    let chosenSide: "right"|"left" = "right";
    if (left + LOCKED_MODAL_WIDTH > viewportW - 8) { left = anchorRect.left - LOCKED_MODAL_WIDTH - LOCKED_MODAL_GAP; chosenSide = "left"; }
    left = Math.max(8, left);
    let top = anchorRect.top + anchorRect.height / 2 - fixedHeight / 2;
    if (top + fixedHeight > viewportH - 8) top = viewportH - fixedHeight - 8;
    top = Math.max(8, top);
    setSide(chosenSide);
    setPos({ position:"fixed", top, left, width:LOCKED_MODAL_WIDTH, height:fixedHeight, zIndex:9999, visibility:"visible" });
  }, [anchorRect]);

  const age = calculateAge(maid.dateOfBirth);
  const sp = (maid.skillsPreferences as Record<string, unknown>) || {};
  const agencyContact = (maid.agencyContact as Record<string, unknown>) || {};
  const intro = (maid.introduction as Record<string, unknown>) || {};
  const englishLevel = maid.languageSkills
    ? String((maid.languageSkills as Record<string, unknown>)["english"] || (maid.languageSkills as Record<string, unknown>)["English"] || "").trim() : "";
  const agencyName = String(agencyContact["agencyName"] || agencyContact["name"] || "");
  const publicIntro = String(intro["publicIntro"] || intro["publicIntroduction"] || "").trim();
  const bioRaw = String(sp["remarks"] || intro["remarks"] || sp["biodata"] || intro["biodata"] || sp["summary"] || intro["summary"] || agencyContact["remarks"] || "").trim();
  const empHistory = Array.isArray(maid.employmentHistory) ? (maid.employmentHistory as Record<string, unknown>[]) : [];
  const workAreaRows = getWorkAreaRows(maid);
  const skillRows = getSkillsRows(maid);
  const hasWorkAreaData = workAreaRows.some((r) => r.willing || r.experience || r.evaluation > 0);
  const displayRows: Array<{ name: string; willing: boolean; experience?: boolean; evaluation: number; years?: string }> =
    hasWorkAreaData ? workAreaRows : skillRows.map((s) => ({ name:s.name, willing:s.willing, evaluation:s.evaluation }));

  const isMobileModal = typeof pos.top === "string";

  return (
    <>
      {isMobileModal && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.5)", zIndex:9998 }} onClick={onClose} />
      )}
    <div ref={modalRef} style={{ ...pos, overflowY:"auto", overflowX:"hidden", border:`1.5px solid ${C.border}`, background:C.white, boxShadow:"0 20px 60px rgba(7,43,53,0.20)" }}
      className="relative"
      onMouseEnter={isMobileModal ? undefined : onMouseEnter} onMouseLeave={isMobileModal ? undefined : onMouseLeave}
    >
      {!isMobileModal && (
        <div className="pointer-events-none absolute top-1/2 -translate-y-1/2"
          style={{ [side === "right" ? "left" : "right"]:-8, width:0, height:0, borderWidth:"8px", borderStyle:"solid",
            borderColor: side === "right" ? `transparent white transparent transparent` : `transparent transparent transparent white` }} />
      )}

      {/* Header */}
      <div className="sticky top-0 z-10 flex items-start justify-between gap-3 px-4 py-3"
        style={{ background:`linear-gradient(135deg, ${C.dark} 0%, ${C.darkMid} 100%)` }}>
        <div style={{ position:"absolute", left:0, top:0, bottom:0, width:4, background:`linear-gradient(180deg, ${C.yellowWarm}, ${C.yellow})` }} />
        <div className="flex items-start gap-2 flex-1 min-w-0 pl-2">
          <div className="mt-0.5 flex-shrink-0 p-1.5" style={{ background:C.yellow }}>
            <span style={{ color:C.dark, display:"flex" }}>
            <LockIcon className="h-4 w-4" />
          </span>
          </div>
          <p className="text-sm font-semibold text-white leading-snug">
            Login / Register to see full bio-data and photos
          </p>
        </div>
        <button type="button" onClick={onClose} className="flex-shrink-0 p-1.5 text-white/60 hover:text-white transition-colors">
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Login button */}
      <div className="px-4 py-3 border-b" style={{ background:C.white, borderColor:C.border }}>
        <Link to={loginPath}
          className="flex w-full items-center justify-center gap-2 py-2.5 text-sm font-bold transition-colors"
          style={{ background:`linear-gradient(135deg, ${C.yellow}, ${C.yellowWarm})`, color:C.dark }}
          onMouseEnter={e => (e.currentTarget.style.opacity = "0.92")}
          onMouseLeave={e => (e.currentTarget.style.opacity = "1")}>
          <LockIcon className="h-3.5 w-3.5" />
          Login / Register
        </Link>
      </div>

      {/* Identity */}
      <div className="px-4 py-3 border-b text-xs space-y-1.5" style={{ background:C.white, borderColor:C.border, color:C.text }}>
        <p>
          <span style={{ fontWeight:800, color:C.text }}>{maid.nationality ? `${maid.nationality}:` : "Maid:"}</span>{" "}
          <span style={{ fontWeight:600, color:C.textMuted }}>{maid.fullName || "—"}</span>
        </p>
        {agencyName && <p><span style={{ fontWeight:800 }}>Agency:</span> <span style={{ color:C.textMuted }}>{agencyName}</span></p>}
        {maid.type && <p><span className={`inline-block px-1.5 py-px text-[9px] font-bold border ${getMaidTypeBadgeClass(maid.type)}`}>{getTypeLabel(maid.type)}</span></p>}
        {englishLevel && <p><span style={{ fontWeight:800 }}>English:</span> <span style={{ color:C.textMuted }}>{englishLevel}</span></p>}
        {age !== null && <p><span style={{ fontWeight:800 }}>Age:</span> <span style={{ color:C.textMuted }}>{age} yrs</span></p>}
        {maid.maritalStatus && <p><span style={{ fontWeight:800 }}>Status:</span> <span style={{ color:C.textMuted }}>{maid.maritalStatus}</span></p>}
        {maid.religion && <p><span style={{ fontWeight:800 }}>Religion:</span> <span style={{ color:C.textMuted }}>{maid.religion}</span></p>}
        {publicIntro && (
          <div className="mt-2 p-3" style={{ border:`1px solid ${C.yellowBorder}`, background:C.yellowPale }}>
            <p style={{ fontSize:9, fontWeight:800, textTransform:"uppercase", letterSpacing:"0.07em", color:"#92580A", marginBottom:4 }}>Public Introduction</p>
            <p className="text-xs leading-relaxed whitespace-pre-line" style={{ color:"#78480A" }}>{publicIntro}</p>
          </div>
        )}
      </div>

      {bioRaw && (
        <div className="px-4 py-3 border-b" style={{ background:C.white, borderColor:C.border }}>
          <p style={{ fontSize:9, fontWeight:800, textTransform:"uppercase", letterSpacing:"0.07em", color:C.textMuted, marginBottom:6 }}>About</p>
          <p className="text-xs leading-relaxed line-clamp-3 blur-[3px] select-none" style={{ color:C.text }}>{bioRaw}</p>
        </div>
      )}

      {empHistory.length > 0 && (
        <div className="px-4 py-3 border-b" style={{ background:C.white, borderColor:C.border }}>
          <p style={{ fontSize:9, fontWeight:800, textTransform:"uppercase", letterSpacing:"0.07em", color:C.textMuted, marginBottom:6 }}>Employment History</p>
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr style={{ background:C.surface }}>
                  {["From","To","Country","Duties"].map(h => (
                    <th key={h} className="px-2 py-1.5 text-left font-semibold" style={{ border:`1px solid ${C.border}`, color:C.text }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {empHistory.slice(0, 5).map((emp, idx) => {
                  const e = emp as Record<string, unknown>;
                  return (
                    <tr key={idx} style={{ background: idx % 2 === 0 ? C.white : C.surface }}>
                      <td className="px-2 py-1.5" style={{ border:`1px solid ${C.border}`, color:C.textMuted, whiteSpace:"normal", wordBreak:"break-word" }}>{String(e["from"]||e["From"]||e["startYear"]||e["startDate"]||"—")}</td>
                      <td className="px-2 py-1.5" style={{ border:`1px solid ${C.border}`, color:C.textMuted, whiteSpace:"normal", wordBreak:"break-word" }}>{String(e["to"]||e["To"]||e["endYear"]||e["endDate"]||"—")}</td>
                      <td className="px-2 py-1.5 blur-[3px] select-none" style={{ border:`1px solid ${C.border}`, color:C.textMuted }}>{String(e["country"]||e["Country"]||e["location"]||"—")}</td>
                      <td className="px-2 py-1.5 blur-[3px] select-none max-w-[70px] truncate" style={{ border:`1px solid ${C.border}`, color:C.textMuted }}>{String(e["duties"]||e["Duties"]||e["employer"]||"—")}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {displayRows.length > 0 && (
        <div className="px-4 py-3" style={{ background:C.white }}>
          <p style={{ fontSize:9, fontWeight:800, textTransform:"uppercase", letterSpacing:"0.07em", color:C.textMuted, marginBottom:6 }}>Skills</p>
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr style={{ background:C.surface }}>
                  {["Area","Willing","Exp.","Rating"].map((h, i) => (
                    <th key={h} className={`px-2 py-1.5 font-semibold ${i === 0 ? "text-left" : "text-center"}`}
                      style={{ border:`1px solid ${C.border}`, color:C.text }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {displayRows.map((row, idx) => (
                  <tr key={idx} style={{ background: idx % 2 === 0 ? C.white : C.surface }}>
                    <td className="px-2 py-1.5" style={{ border:`1px solid ${C.border}`, color:C.text }}>{row.name}</td>
                    <td className="px-2 py-1.5 text-center" style={{ border:`1px solid ${C.border}` }}>
                      {row.willing ? <span style={{ color:C.greenMid, fontWeight:800 }}>✓</span> : <span style={{ color:"#EF4444", fontWeight:800 }}>✗</span>}
                    </td>
                    <td className="px-2 py-1.5 text-center" style={{ border:`1px solid ${C.border}` }}>
                      {"experience" in row
                        ? (row.experience ? <span style={{ color:C.greenMid, fontWeight:800 }}>✓</span> : <span style={{ color:C.border }}>—</span>)
                        : <span style={{ color:C.border }}>—</span>}
                    </td>
                    <td className="px-2 py-1.5 text-center" style={{ border:`1px solid ${C.border}` }}>
                      {row.evaluation > 0 ? <StarRating count={row.evaluation} /> : <span style={{ color:C.border, fontSize:10 }}>N/A</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
    </>
  );
};

// ════════════════════════════════════════════════════════════════════════════
//  LockedMaidCard
// ════════════════════════════════════════════════════════════════════════════
const LockedMaidCard = ({ maid, loginPath, disableHoverModal = false }: { maid: MaidProfile; loginPath: string; disableHoverModal?: boolean }) => {
  const photo = getPrimaryPhoto(maid);
  const typeColorClass = getMaidTypeBadgeClass(maid.type);

  const [isOpen, setIsOpen] = useState(false);
  const [anchorRect, setAnchorRect] = useState<DOMRect | null>(null);
  const cardRef = useRef<HTMLElement>(null);
  const cardHovered = useRef(false);
  const modalHovered = useRef(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const openModal = useCallback(() => {
    if (disableHoverModal) return;
    if (closeTimer.current) clearTimeout(closeTimer.current);
    if (cardRef.current) setAnchorRect(cardRef.current.getBoundingClientRect());
    setIsOpen(true);
  }, [disableHoverModal]);

  const scheduleClose = useCallback(() => {
    if (disableHoverModal) return;
    closeTimer.current = setTimeout(() => {
      if (!cardHovered.current && !modalHovered.current) setIsOpen(false);
    }, 120);
  }, [disableHoverModal]);

  const handleLockedCardClick = (e: React.MouseEvent) => {
    if (disableHoverModal || window.innerWidth >= 640) return;
    if ((e.target as HTMLElement).closest("a, button")) return;
    if (isOpen) { setIsOpen(false); } else { openModal(); }
  };

  useEffect(() => {
    if (!isOpen) return;
    const update = () => { if (cardRef.current) setAnchorRect(cardRef.current.getBoundingClientRect()); };
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    return () => { window.removeEventListener("scroll", update, true); window.removeEventListener("resize", update); };
  }, [isOpen]);

  const arrowSide = anchorRect && anchorRect.right + LOCKED_MODAL_GAP + LOCKED_MODAL_WIDTH > window.innerWidth - 8 ? "left" : "right";

  return (
    <>
      <article
        ref={cardRef as React.RefObject<HTMLElement>}
        className="group relative flex flex-col overflow-visible cursor-pointer transition-all"
        style={{ border:`1px solid ${C.border}`, background:C.white, boxShadow:"0 2px 8px rgba(7,43,53,0.06)" }}
        onClick={handleLockedCardClick}
        onMouseEnter={disableHoverModal ? undefined : () => { if (window.innerWidth < 640) return; cardHovered.current = true; openModal(); }}
        onMouseLeave={disableHoverModal ? undefined : () => { if (window.innerWidth < 640) return; cardHovered.current = false; scheduleClose(); }}
      >
        {isOpen && (
          <div className="absolute top-1/2 -translate-y-1/2 z-10"
            style={{ [arrowSide === "right" ? "right" : "left"]:-6 }}>
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ background:C.yellow }} />
              <span className="relative inline-flex rounded-full h-3 w-3" style={{ background:C.yellow }} />
            </span>
          </div>
        )}
        <div className="relative w-full select-none pointer-events-none overflow-hidden">
          {photo ? (
            <img src={photo} alt="Maid profile" loading="lazy" decoding="async"
              className="block w-full h-auto"
              style={{ aspectRatio:"3/4", objectFit:"contain", objectPosition:"top center", minHeight:130,
                background:C.white, filter:"blur(10px)", opacity:0.9, transform:"scale(1.05)" }}
            />
          ) : (
            <div className="w-full flex items-center justify-center" style={{ aspectRatio:"3/4", minHeight:130, background:C.surface }}>
              <svg className="h-10 w-10" style={{ color:C.border }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
              </svg>
            </div>
          )}
          {maid.type && (
            <div className="absolute top-0 left-0" style={{ filter:"blur(3px)" }}>
              <span className={`inline-block px-1.5 py-px text-[9px] font-semibold border bg-white/90 ${typeColorClass}`}>{getTypeLabel(maid.type)}</span>
            </div>
          )}
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-1">
            <div className="p-2" style={{ background:"rgba(7,43,53,0.50)", backdropFilter:"blur(2px)" }}>
              <LockIcon className="h-4 w-4 text-white" />
            </div>
          </div>
        </div>
        <div className="flex flex-col gap-1 p-2.5 flex-1" style={{ background:C.white }}>
          <div className="h-2.5 w-3/4 blur-[3px] select-none" style={{ background:C.border }} />
          <div className="mt-1 h-2 w-1/2 blur-[3px] select-none" style={{ background:C.border }} />
          <div className="mt-1 flex gap-1">
            <div className="h-4 w-12 blur-[3px] select-none" style={{ background:C.border }} />
            <div className="h-4 w-8 blur-[3px] select-none" style={{ background:C.border }} />
          </div>
        </div>
        <div className="px-2 pb-2 pt-0 pointer-events-auto">
          <Link to={loginPath}
            className="flex w-full items-center justify-center gap-1.5 px-2 py-2 text-[10px] font-bold uppercase tracking-wide text-white transition-colors"
            style={{ background:`linear-gradient(135deg, ${C.dark} 0%, ${C.darkMid} 100%)` }}>
            <LockIcon className="h-3 w-3" />Log in to view
          </Link>
        </div>
      </article>
      {isOpen && !disableHoverModal && (
        <LockedMaidHoverModal
          maid={maid} loginPath={loginPath} anchorRect={anchorRect}
          onClose={() => { cardHovered.current = false; modalHovered.current = false; if (closeTimer.current) clearTimeout(closeTimer.current); setIsOpen(false); }}
          onMouseEnter={() => { modalHovered.current = true; if (closeTimer.current) clearTimeout(closeTimer.current); }}
          onMouseLeave={() => { modalHovered.current = false; scheduleClose(); }}
        />
      )}
    </>
  );
};

// ── Real maid card ────────────────────────────────────────────────────────────
const MaidCard = ({
  maid, isShortlisted, onToggleShortlist, onNavigate, isLoggedIn, loginPath, showCategory, disableHoverPopup = false,
}: {
  maid: MaidProfile; isShortlisted: boolean; onToggleShortlist: (ref: string) => void;
  onNavigate?: () => void; isLoggedIn: boolean; loginPath: string; showCategory?: boolean; disableHoverPopup?: boolean;
}) => {
  const [hovered, setHovered] = useState(false);
  const [clickedOpen, setClickedOpen] = useState(false);
  const hoverTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cardRef = useRef<HTMLElement>(null);

  useEffect(() => {
    return () => {
      if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
    };
  }, []);

  if (!isLoggedIn) return <LockedMaidCard maid={maid} loginPath={loginPath} disableHoverModal={disableHoverPopup} />;

  const photo = getPrimaryPhoto(maid);
  const age = calculateAge(maid.dateOfBirth);
  const flagCode = getNationalityCode(maid.nationality);
  const typeColorClass = getMaidTypeBadgeClass(maid.type);
  const experienceBucket = getExperienceBucket(maid);
  const category = getMaidCategory(maid);
  const displayLabel = showCategory && category ? category : (maid.nationality || "");

  const handleMouseEnter = () => {
    if (disableHoverPopup || window.innerWidth < 640) return;
    hoverTimerRef.current = setTimeout(() => setHovered(true), 300);
  };
  const handleMouseLeave = () => {
    if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
    if (disableHoverPopup || window.innerWidth < 640) return;
    setHovered(false);
  };
  const handleCardClick = (e: React.MouseEvent) => {
    if (disableHoverPopup || window.innerWidth >= 640) return;
    if ((e.target as HTMLElement).closest("a, button")) return;
    setClickedOpen((v) => !v);
  };
  const dismissPopup = () => { setHovered(false); setClickedOpen(false); };

  return (
    <>
      <article
        ref={cardRef}
        className="group flex flex-col overflow-hidden cursor-pointer transition-all"
        style={{ border:`1px solid ${C.border}`, background:C.white, boxShadow:"0 2px 8px rgba(7,43,53,0.06)" }}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onClick={handleCardClick}
      >
        <div className="relative w-full overflow-hidden" style={{ background:C.white }}>
          <Link to={`/maids/${encodeURIComponent(maid.referenceCode)}`} onClick={onNavigate}>
            {photo ? (
              <img src={photo} alt={maid.fullName}
                className="block w-full h-auto transition-transform duration-300 group-hover:scale-[1.03]"
                style={{ aspectRatio:"3/4", objectFit:"contain", objectPosition:"top center", minHeight:130, background:C.white }}
                loading="lazy" decoding="async"
              />
            ) : (
              <div className="w-full flex items-center justify-center" style={{ aspectRatio:"3/4", minHeight:130, background:C.surface }}>
                <svg className="h-8 w-8" style={{ color:C.border }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                </svg>
              </div>
            )}
          </Link>
          {maid.type && (
            <div className="absolute top-0 left-0">
              <span className={`inline-block px-1.5 py-px text-[9px] font-semibold border bg-white/90 backdrop-blur-sm ${typeColorClass}`}>{getTypeLabel(maid.type)}</span>
            </div>
          )}
          <button
            onClick={(e) => { e.preventDefault(); onToggleShortlist(maid.referenceCode); }}
            className={`absolute bottom-0 left-0 right-0 flex items-center justify-center gap-1 py-1.5 text-[9px] font-bold uppercase tracking-wide text-white transition-all ${
              isShortlisted ? "opacity-100" : "opacity-0 group-hover:opacity-100"
            }`}
            style={{ background: isShortlisted ? C.yellow : "rgba(7,43,53,0.75)" }}
          >
            <Star className={`h-2.5 w-2.5 ${isShortlisted ? "fill-current" : ""}`}
              style={{ color: isShortlisted ? C.dark : C.white }} />
            <span style={{ color: isShortlisted ? C.dark : C.white }}>{isShortlisted ? "Shortlisted" : "Shortlist"}</span>
          </button>
        </div>

        <div className="flex flex-col gap-0.5 p-2.5 flex-1" style={{ background:C.white }}>
          <h3 className="text-xs font-bold line-clamp-1 leading-tight" style={{ color:C.text }}>{maid.fullName || "Unnamed maid"}</h3>
          {maid.referenceCode && <p className="text-[9px] font-mono leading-tight" style={{ color:C.textMuted }}>{maid.referenceCode}</p>}
          {displayLabel && (
            <p className="inline-flex items-center gap-1 text-[10px] leading-tight mt-0.5">
              <FlagCircle code={flagCode} />
              <span className="font-semibold" style={{ color:C.text }}>{displayLabel}</span>
            </p>
          )}
          <div className="my-1" style={{ borderTop:`1px solid ${C.border}` }} />
          <div className="flex items-center gap-1.5 text-[10px] leading-tight" style={{ color:C.textMuted }}>
            {age !== null && <span className="font-medium" style={{ color:C.text }}>({age}) yrs</span>}
            {age !== null && maid.maritalStatus && <span style={{ color:C.border }}>·</span>}
            {maid.maritalStatus && <span className="truncate" style={{ color:C.text }}>{maid.maritalStatus}</span>}
          </div>
          {maid.religion && <p className="text-[9px] leading-tight line-clamp-1" style={{ color:C.text }}>{maid.religion}</p>}
          {experienceBucket && <p className="text-[9px] leading-tight mt-0.5 line-clamp-1" style={{ color:C.text }}>{experienceBucket}</p>}
        </div>
      </article>
      {(hovered || clickedOpen) && cardRef.current && !disableHoverPopup && (
        <MaidHoverPopup maid={maid} anchorRef={cardRef as React.RefObject<HTMLElement>} onDismiss={dismissPopup} />
      )}
    </>
  );
};

// ════════════════════════════════════════════════════════════════════════════
//  Improved Shortlist Dialog
// ════════════════════════════════════════════════════════════════════════════
const ShortlistDialog = ({
  open, onOpenChange, shortlistRefs, shortlistedMaids, missingShortlistRefs,
  onToggleShortlist, isLoggedIn, loginPath, isIndianSubcategoryActive, isShortlistOpen, setIsShortlistOpen,
}: {
  open: boolean; onOpenChange: (v: boolean) => void;
  shortlistRefs: string[]; shortlistedMaids: MaidProfile[]; missingShortlistRefs: string[];
  onToggleShortlist: (ref: string) => void;
  isLoggedIn: boolean; loginPath: string; isIndianSubcategoryActive: boolean;
  isShortlistOpen: boolean; setIsShortlistOpen: (v: boolean) => void;
}) => {
  const [confirmClear, setConfirmClear] = useState(false);

  const handleClearAll = () => {
    if (!confirmClear) { setConfirmClear(true); setTimeout(() => setConfirmClear(false), 3000); return; }
    shortlistRefs.forEach((ref) => onToggleShortlist(ref));
    setConfirmClear(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="p-0 gap-0 overflow-hidden [&>button:last-child]:hidden"
        style={{
          maxWidth:860,
          border:`1.5px solid ${C.border}`,
          borderRadius:20,
          boxShadow:`0 32px 80px rgba(7,43,53,0.22), 0 4px 20px rgba(7,43,53,0.10)`,
          background:C.white,
        }}
      >
        {/* ── Modal header ── */}
        <div style={{ background:`linear-gradient(135deg, ${C.dark} 0%, ${C.darkMid} 100%)`, position:"relative", overflow:"hidden" }}>
          {/* Amber left accent */}
          <div style={{ position:"absolute", left:0, top:0, bottom:0, width:5, background:`linear-gradient(180deg, ${C.yellowWarm}, ${C.yellow})` }} />
          {/* Decorative circles */}
          <div style={{ position:"absolute", right:-30, top:-30, width:130, height:130, borderRadius:"50%", background:"rgba(252,211,77,0.07)" }} />
          <div style={{ position:"absolute", right:50, bottom:-50, width:100, height:100, borderRadius:"50%", background:"rgba(26,111,130,0.10)" }} />

          <div className="flex items-center justify-between px-6 py-4 pl-8" style={{ position:"relative" }}>
            <div className="flex items-center gap-4">
              <div style={{
                width:46, height:46, borderRadius:13, flexShrink:0,
                background:"rgba(252,211,77,0.18)", border:`1.5px solid rgba(252,211,77,0.32)`,
                display:"flex", alignItems:"center", justifyContent:"center",
              }}>
                <Star className="h-5 w-5" style={{ color:C.yellowWarm, fill:C.yellowWarm }} />
              </div>
              <div>
                <DialogTitle className="text-white font-bold text-lg leading-tight m-0" style={{ letterSpacing:"-0.2px" }}>
                  My Shortlist
                </DialogTitle>
                <DialogDescription className="text-white/60 text-xs font-medium mt-0.5">
                  {shortlistRefs.length === 0
                    ? "No profiles saved yet"
                    : `${shortlistRefs.length} profile${shortlistRefs.length !== 1 ? "s" : ""} saved · compare your favourites`}
                </DialogDescription>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {shortlistRefs.length > 0 && (
                <div style={{
                  padding:"4px 14px", borderRadius:30,
                  background:`linear-gradient(135deg, ${C.yellow}, ${C.yellowWarm})`,
                  color:C.dark, fontSize:13, fontWeight:900,
                }}>
                  {shortlistRefs.length}
                </div>
              )}
              <DialogClose asChild>
                <button className="p-1.5 transition-colors" style={{ color:"rgba(255,255,255,0.5)", background:"rgba(255,255,255,0.08)", borderRadius:8, border:"none", cursor:"pointer" }}
                  onMouseEnter={e => (e.currentTarget.style.color = "rgba(255,255,255,0.9)")}
                  onMouseLeave={e => (e.currentTarget.style.color = "rgba(255,255,255,0.5)")}>
                  <X className="h-4 w-4" />
                </button>
              </DialogClose>
            </div>
          </div>
        </div>

        {/* ── Empty state ── */}
        {shortlistRefs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-8 text-center">
            <div style={{
              width:72, height:72, borderRadius:20, marginBottom:16,
              background:C.greenPale, border:`1.5px solid ${C.greenBorder}`,
              display:"flex", alignItems:"center", justifyContent:"center",
            }}>
              <Star className="h-8 w-8" style={{ color:C.greenMid }} />
            </div>
            <p className="font-bold text-lg mb-2" style={{ color:C.text }}>Your shortlist is empty</p>
            <p className="text-sm mb-6 max-w-sm" style={{ color:C.textMuted }}>
              Hover over any maid profile and tap the <strong style={{ color:C.yellow }}>★ Shortlist</strong> button to save them here for easy comparison.
            </p>
            <button type="button" onClick={() => onOpenChange(false)}
              className="font-bold text-sm px-6 py-2.5 transition-all"
              style={{ background:`linear-gradient(135deg, ${C.green}, ${C.greenMid})`, color:C.white, borderRadius:10, border:"none", cursor:"pointer", boxShadow:`0 4px 16px rgba(14,78,94,0.35)` }}>
              Browse Profiles
            </button>
          </div>
        ) : (
          <>
            {/* ── Card grid ── */}
            <div style={{ maxHeight:"62vh", overflowY:"auto", padding:"20px 24px 0" }}>
              {missingShortlistRefs.length > 0 && (
                <div className="mb-4 flex items-center gap-2 px-3 py-2 text-sm"
                  style={{ background:C.yellowPale, border:`1px solid ${C.yellowBorder}`, borderRadius:10, color:"#92580A" }}>
                  <span style={{ width:8, height:8, borderRadius:"50%", background:C.yellow, flexShrink:0, display:"inline-block" }} />
                  {missingShortlistRefs.length} profile{missingShortlistRefs.length !== 1 ? "s" : ""} in your list could not be found
                </div>
              )}

              <div className="grid gap-3" style={{ gridTemplateColumns:"repeat(auto-fill, minmax(140px, 1fr))" }}>
                {shortlistedMaids.map((maid) => (
                  <div key={`sl-${maid.referenceCode}`} className="relative group/card">
                    <MaidCard
                      maid={maid}
                      isShortlisted={true}
                      onToggleShortlist={onToggleShortlist}
                      onNavigate={() => onOpenChange(false)}
                      isLoggedIn={isLoggedIn}
                      loginPath={loginPath}
                      showCategory={isIndianSubcategoryActive}
                      disableHoverPopup={true}
                    />
                    {/* Quick-remove overlay */}
                    <button
                      onClick={() => onToggleShortlist(maid.referenceCode)}
                      title="Remove from shortlist"
                      className="absolute top-1.5 right-1.5 opacity-0 group-hover/card:opacity-100 transition-all"
                      style={{
                        width:22, height:22, borderRadius:6,
                        background:"rgba(239,68,68,0.90)", border:"none",
                        display:"flex", alignItems:"center", justifyContent:"center",
                        cursor:"pointer", color:"white",
                      }}
                    >
                      <X style={{ width:12, height:12 }} />
                    </button>
                  </div>
                ))}

                {/* Missing refs */}
                {missingShortlistRefs.map((ref) => (
                  <div key={`missing-${ref}`}
                    className="flex flex-col items-center justify-center gap-2 text-center p-4"
                    style={{
                      border:`1.5px dashed ${C.yellowBorder}`,
                      background:C.yellowPale, borderRadius:12,
                      minHeight:160,
                    }}>
                    <div style={{ width:34, height:34, borderRadius:10, background:"rgba(252,211,77,0.20)", display:"flex", alignItems:"center", justifyContent:"center" }}>
                      <svg style={{ width:16, height:16, color:"#B25209" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <circle cx="12" cy="12" r="10" /><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01" />
                      </svg>
                    </div>
                    <p className="font-mono text-[10px] break-all" style={{ color:"#92580A" }}>{ref}</p>
                    <p style={{ fontSize:11, color:"#B25209" }}>Not found</p>
                    <button type="button" onClick={() => onToggleShortlist(ref)}
                      style={{ fontSize:11, fontWeight:700, color:"#B25209", background:"none", border:"none", cursor:"pointer", textDecoration:"underline" }}>
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* ── Footer ── */}
            <div style={{
              padding:"16px 24px", borderTop:`1px solid ${C.border}`,
              background:C.surface,
              display:"flex", alignItems:"center", justifyContent:"space-between", gap:12, flexWrap:"wrap",
            }}>
              {/* Left: count info */}
              <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                <div style={{
                  padding:"4px 12px", borderRadius:30, fontSize:12, fontWeight:800,
                  background:C.greenPale, border:`1px solid ${C.greenBorder}`,
                  color:C.green, display:"flex", alignItems:"center", gap:6,
                }}>
                  <CheckCircle2 style={{ width:13, height:13 }} />
                  {shortlistedMaids.length} saved
                </div>
                {missingShortlistRefs.length > 0 && (
                  <span style={{ fontSize:12, color:C.textMuted }}>· {missingShortlistRefs.length} missing</span>
                )}
              </div>

              {/* Right: actions */}
              <div style={{ display:"flex", gap:8, alignItems:"center" }}>
                <button type="button" onClick={() => onOpenChange(false)}
                  className="font-semibold text-sm px-4 py-2 transition-colors"
                  style={{
                    border:`1.5px solid ${C.border}`, background:C.white, color:C.text,
                    borderRadius:9, cursor:"pointer",
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = C.surface)}
                  onMouseLeave={e => (e.currentTarget.style.background = C.white)}>
                  Continue browsing
                </button>
                <button type="button" onClick={handleClearAll}
                  className="font-bold text-sm px-4 py-2 transition-all flex items-center gap-2"
                  style={{
                    borderRadius:9, border:"none", cursor:"pointer",
                    background: confirmClear ? "#EF4444" : C.yellowPale,
                    color: confirmClear ? C.white : "#92580A",
                    boxShadow: confirmClear ? "0 4px 16px rgba(239,68,68,0.35)" : "none",
                  }}>
                  <Trash2 style={{ width:14, height:14 }} />
                  {confirmClear ? "Tap again to confirm" : "Clear all"}
                </button>
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

// ─── Main page ────────────────────────────────────────────────────────────────
const MaidSearchPage = ({
  basePath = "/client/maids",
  loginPath = "/employer-login",
  embedded = false,
}: MaidSearchPageProps) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const advancedFiltersRaw = searchParams.get("filters") || "";
  const advancedFilters = useMemo(() => parseAdvancedFilters(searchParams), [searchParams]);
  const quickLink = (searchParams.get("quick") || "") as QuickLinkKey | "";
  const isIndianSubcategoryActive = !!quickLink && INDIAN_SUBCATEGORY_KEYS.has(quickLink);

  const [filters, setFilters] = useState<SidebarFilters>(() => deriveSidebarFilters(searchParams, advancedFilters));
  const [committedFilters, setCommittedFilters] = useState<SidebarFilters>(() => deriveSidebarFilters(searchParams, advancedFilters));
  const [page, setPage] = useState(1);
  const [allMaids, setAllMaids] = useState<MaidProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [isShortlistOpen, setIsShortlistOpen] = useState(false);
  const [shortlistRefs, setShortlistRefs] = useState<string[]>(() => getSavedShortlistRefs());
  const shortlist = useMemo(() => new Set(shortlistRefs), [shortlistRefs]);
  const isLoggedIn = !!getClientToken();

  useEffect(() => {
    setShortlistRefs(getSavedShortlistRefs());
    return subscribeToShortlistRefs(setShortlistRefs);
  }, []);

  const handleToggleShortlist = (ref: string) => { setShortlistRefs(toggleShortlistRef(ref)); };

  useEffect(() => {
    const controller = new AbortController();
    const load = async () => {
      try {
        setIsLoading(true);
        const res = await fetch("/api/maids?visibility=public", { signal: controller.signal });
        const data = (await res.json()) as { maids?: MaidProfile[]; error?: string };
        if (!res.ok || !data.maids) throw new Error(data.error || "Failed to load");
        setAllMaids(data.maids.filter((m) => m.isPublic && hasPhoto(m)));
      } catch (error) {
        if (!(error instanceof DOMException && error.name === "AbortError"))
          toast.error(error instanceof Error ? error.message : "Failed to load maids");
      } finally { setIsLoading(false); }
    };
    void load();
    return () => controller.abort();
  }, []);

  useEffect(() => {
    const adv = parseAdvancedFilters(searchParams);
    const derived = deriveSidebarFilters(searchParams, adv);
    setFilters(derived);
    setCommittedFilters(derived);
    setPage(1);
  }, [searchParams]);

  const filteredMaids = useMemo(() => {
    const draft: ClientDraft = advancedFilters ?? {
      keyword:committedFilters.keyword, agencyPreference:"No Preference", biodataCreatedWithin:"No Preference",
      maidType:committedFilters.maidType, willingOffDays:committedFilters.willingOffDays, hasChildren:false, withVideo:false,
      natFilipino:committedFilters.nationality==="Filipino", natIndonesian:committedFilters.nationality==="Indonesian",
      natMyanmar:committedFilters.nationality==="Myanmar", natIndian:committedFilters.nationality==="Indian",
      natSriLankan:committedFilters.nationality==="Sri Lankan", natCambodian:committedFilters.nationality==="Cambodian",
      natBangladeshi:committedFilters.nationality==="Bangladeshi", natOthers:committedFilters.nationality==="Others",
      natNoPreference:committedFilters.nationality==="No Preference",
      expHomeCountry:false, expSingapore:false, expMalaysia:false, expHongKong:false,
      expTaiwan:false, expMiddleEast:false, expOtherCountries:false, expNoPreference:true,
      dutyCareInfant:false, dutyCareYoungChildren:false, dutyCareElderlyDisabled:false,
      dutyCooking:false, dutyGeneralHousekeeping:false, dutyNoPreference:true,
      eduCollege:false, eduHighSchool:false, eduSecondary:false, eduPrimary:false, eduNoPreference:true,
      langEnglish:committedFilters.language==="English", langMandarin:committedFilters.language==="Mandarin",
      langBahasaIndonesia:committedFilters.language==="Bahasa Indonesia / Malay",
      langHindi:committedFilters.language==="Hindi", langTamil:committedFilters.language==="Tamil",
      langNoPreference:committedFilters.language==="No Preference",
      age21to25:false, age26to30:false, age31to35:false, age36to40:false, age41above:false, ageNoPreference:true,
      marSingle:false, marMarried:false, marWidowed:false, marDivorced:false, marSeparated:false, marNoPreference:true,
      height150below:false, height151to155:false, height156to160:false, height161above:false, heightNoPreference:true,
      relFreeThinker:false, relChristian:false, relCatholic:false, relBuddhist:false,
      relMuslim:false, relHindu:false, relSikh:false, relOthers:false, relNoPreference:true,
    };
    let result = filterMaidsByDraft(allMaids, draft);
    if (quickLink) result = result.filter((m) => matchesQuickLink(m, quickLink));
    return result;
  }, [allMaids, advancedFilters, committedFilters, quickLink]);

  const totalPages = Math.max(1, Math.ceil(filteredMaids.length / PAGE_SIZE));
  const pagedMaids = filteredMaids.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const pages = pageNumbers(page, totalPages);

  const shortlistedMaids = useMemo(
    () => shortlistRefs.map((ref) => allMaids.find((m) => m.referenceCode === ref)).filter((m): m is MaidProfile => Boolean(m)),
    [allMaids, shortlistRefs]
  );
  const missingShortlistRefs = useMemo(
    () => shortlistRefs.filter((ref) => !shortlistedMaids.some((m) => m.referenceCode === ref)),
    [shortlistRefs, shortlistedMaids]
  );

  const activeFilterCount = useMemo(() => {
    if (advancedFilters) {
      let c = 0;
      if (advancedFilters.keyword?.trim()) c++;
      if (advancedFilters.maidType) c++;
      if (advancedFilters.willingOffDays) c++;
      if (!advancedFilters.natNoPreference) c++;
      if (!advancedFilters.langNoPreference) c++;
      if (!advancedFilters.dutyNoPreference) c++;
      if (!advancedFilters.expNoPreference) c++;
      if (!advancedFilters.ageNoPreference) c++;
      if (!advancedFilters.marNoPreference) c++;
      if (!advancedFilters.eduNoPreference) c++;
      if (!advancedFilters.heightNoPreference) c++;
      if (!advancedFilters.relNoPreference) c++;
      if (advancedFilters.biodataCreatedWithin && advancedFilters.biodataCreatedWithin !== "No Preference") c++;
      return c;
    }
    let c = 0;
    if (filters.keyword.trim()) c++;
    if (filters.maidType) c++;
    if (filters.nationality !== "No Preference") c++;
    if (filters.language !== "No Preference") c++;
    if (filters.willingOffDays) c++;
    return c;
  }, [advancedFilters, filters]);

  const advancedFilterSummary = useMemo(() => {
    if (!advancedFilters) return [];
    const items: string[] = [];
    if (advancedFilters.keyword?.trim()) items.push(`"${advancedFilters.keyword.trim()}"`);
    if (advancedFilters.maidType) items.push(advancedFilters.maidType);
    const nats = [advancedFilters.natFilipino&&"Filipino",advancedFilters.natIndonesian&&"Indonesian",
      advancedFilters.natMyanmar&&"Myanmar",advancedFilters.natIndian&&"Indian",
      advancedFilters.natSriLankan&&"Sri Lankan",advancedFilters.natCambodian&&"Cambodian",
      advancedFilters.natBangladeshi&&"Bangladeshi"].filter(Boolean) as string[];
    if (nats.length) items.push(nats.join(" / "));
    const duties = [advancedFilters.dutyCareInfant&&"Infant care",advancedFilters.dutyCareYoungChildren&&"Young children",
      advancedFilters.dutyCareElderlyDisabled&&"Elderly",advancedFilters.dutyCooking&&"Cooking",
      advancedFilters.dutyGeneralHousekeeping&&"Housekeeping"].filter(Boolean) as string[];
    if (duties.length) items.push(duties.join(", "));
    const langs = [advancedFilters.langEnglish&&"English",advancedFilters.langMandarin&&"Mandarin",
      advancedFilters.langBahasaIndonesia&&"Bahasa",advancedFilters.langHindi&&"Hindi",
      advancedFilters.langTamil&&"Tamil"].filter(Boolean) as string[];
    if (langs.length) items.push(langs.join(" / "));
    const exps = [advancedFilters.expSingapore&&"Singapore exp.",advancedFilters.expMalaysia&&"Malaysia exp.",
      advancedFilters.expHongKong&&"HK exp.",advancedFilters.expTaiwan&&"Taiwan exp.",
      advancedFilters.expMiddleEast&&"Middle East exp."].filter(Boolean) as string[];
    if (exps.length) items.push(exps.join(", "));
    if (advancedFilters.willingOffDays) items.push("Off-days OK");
    if (advancedFilters.withVideo) items.push("Has video");
    if (advancedFilters.biodataCreatedWithin && advancedFilters.biodataCreatedWithin !== "No Preference")
      items.push(`Within ${advancedFilters.biodataCreatedWithin}`);
    return items;
  }, [advancedFilters]);

  const handleSearch = () => {
    setPage(1);
    const next = new URLSearchParams();
    if (filters.keyword.trim()) next.set("q", filters.keyword.trim());
    if (filters.maidType.trim()) next.set("type", filters.maidType.trim());
    if (filters.nationality !== "No Preference") next.set("nationality", filters.nationality);
    if (filters.language !== "No Preference") next.set("language", filters.language);
    if (filters.willingOffDays) next.set("offDays", "true");
    setCommittedFilters(filters);
    setSearchParams(next);
    setMobileSidebarOpen(false);
  };

  const handleQuickLink = (label: string) => {
    const quickLinkKey = QUICK_LINKS_BY_LABEL[label] ?? "";
    const next = new URLSearchParams();
    if (quickLinkKey && quickLinkKey !== quickLink) {
      next.set("quick", quickLinkKey);
    }
    setFilters(defaultSidebarFilters);
    setCommittedFilters(defaultSidebarFilters);
    setPage(1);
    setSearchParams(next);
  };

  const handleReset = () => {
    setFilters(defaultSidebarFilters);
    setCommittedFilters(defaultSidebarFilters);
    setPage(1);
    setSearchParams(new URLSearchParams());
  };

  // ── Sidebar ──────────────────────────────────────────────────────────────
  const SidebarContent = () => (
    <div className="space-y-0">
      <div className="overflow-hidden" style={{ border:`1px solid ${C.border}`, boxShadow:"0 2px 12px rgba(7,43,53,0.08)" }}>
        {/* Header */}
        <div className="px-4 py-3" style={{ background:`linear-gradient(135deg, ${C.dark} 0%, ${C.darkMid} 100%)`, position:"relative" }}>
          <div style={{ position:"absolute", left:0, top:0, bottom:0, width:4, background:`linear-gradient(180deg, ${C.yellowWarm}, ${C.yellow})` }} />
          <div className="flex items-center gap-2 pl-2">
            <Search className="h-3.5 w-3.5" style={{ color:C.yellow }} />
            <p className="text-sm font-black tracking-wide" style={{ color:C.white, letterSpacing:"0.05em" }}>
              MAID <span style={{ color:C.yellowWarm }}>SEARCH</span>
            </p>
          </div>
          <p className="text-[10px] mt-0.5 pl-2" style={{ color:"rgba(255,255,255,0.55)" }}>Find your perfect household helper</p>
        </div>

        <div className="space-y-3 p-3" style={{ background:C.white }}>
          {/* Keyword */}
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3 w-3 pointer-events-none" style={{ color:C.textMuted }} />
            <input value={filters.keyword}
              onChange={(e) => setFilters((p) => ({ ...p, keyword:e.target.value }))}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              placeholder="Filipino maid, baby sitter…"
              className="w-full pl-8 pr-3 py-2 text-sm focus:outline-none transition-colors"
              style={{ border:`1.5px solid ${C.border}`, background:C.surface, color:C.text }}
            />
          </div>

          {/* Maid Type */}
          <div>
            <p className="mb-2 text-[10px] font-black uppercase tracking-widest" style={{ color:C.textMuted }}>Maid Type</p>
            <div className="space-y-0 overflow-hidden" style={{ border:`1px solid ${C.border}` }}>
              {MAID_TYPES.map((type, i) => (
                <label key={type}
                  className="flex cursor-pointer items-center gap-2.5 px-3 py-2 transition-colors"
                  style={{
                    background: filters.maidType === type ? C.dark : C.white,
                    color: filters.maidType === type ? C.white : C.text,
                    borderTop: i > 0 ? `1px solid ${C.border}` : "none",
                  }}>
                  <input type="radio" name="maidType" value={type}
                    checked={filters.maidType === type}
                    onChange={() => setFilters((p) => ({ ...p, maidType:p.maidType===type ? "" : type }))}
                    className="sr-only" />
                  <span style={{
                    width:14, height:14, border:`2px solid ${filters.maidType===type ? C.yellow : C.border}`,
                    background: filters.maidType===type ? C.yellow : C.white,
                    display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, transition:"all .15s",
                  }}>
                    {filters.maidType === type && <span style={{ display:"block", width:6, height:6, background:C.dark }} />}
                  </span>
                  <span className="text-sm font-medium">{type}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Nationality */}
          <div>
            <label className="mb-1.5 block text-[10px] font-black uppercase tracking-widest" style={{ color:C.textMuted }}>Nationality</label>
            <div className="relative">
              <select
                className="w-full appearance-none px-3 py-2 text-sm pr-8 focus:outline-none transition-colors"
                style={{
                  border:`1.5px solid ${filters.nationality!=="No Preference" ? C.green : C.border}`,
                  background: filters.nationality!=="No Preference" ? C.dark : C.white,
                  color: filters.nationality!=="No Preference" ? C.white : C.text,
                  fontWeight: filters.nationality!=="No Preference" ? 700 : 400,
                }}
                value={filters.nationality}
                onChange={(e) => setFilters((p) => ({ ...p, nationality:e.target.value }))}>
                <option>No Preference</option>
                <option>Filipino</option><option>Indonesian</option><option>Myanmar</option>
                <option>Indian</option><option>Sri Lankan</option><option>Cambodian</option>
                <option>Bangladeshi</option><option>Others</option>
              </select>
              <ChevronRight className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3 w-3 rotate-90 pointer-events-none"
                style={{ color: filters.nationality!=="No Preference" ? C.yellowWarm : C.textMuted }} />
            </div>
          </div>

          {/* Language */}
          <div>
            <label className="mb-1.5 block text-[10px] font-black uppercase tracking-widest" style={{ color:C.textMuted }}>Language</label>
            <div className="relative">
              <select
                className="w-full appearance-none px-3 py-2 text-sm pr-8 focus:outline-none transition-colors"
                style={{
                  border:`1.5px solid ${filters.language!=="No Preference" ? C.green : C.border}`,
                  background: filters.language!=="No Preference" ? C.dark : C.white,
                  color: filters.language!=="No Preference" ? C.white : C.text,
                  fontWeight: filters.language!=="No Preference" ? 700 : 400,
                }}
                value={filters.language}
                onChange={(e) => setFilters((p) => ({ ...p, language:e.target.value }))}>
                <option>No Preference</option>
                <option>English</option><option>Mandarin</option>
                <option>Bahasa Indonesia / Malay</option>
                <option>Hindi</option><option>Tamil</option>
              </select>
              <ChevronRight className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3 w-3 rotate-90 pointer-events-none"
                style={{ color: filters.language!=="No Preference" ? C.yellowWarm : C.textMuted }} />
            </div>
          </div>

          {/* Search button */}
          <button type="button" onClick={handleSearch}
            className="flex w-full items-center justify-center gap-2 py-2.5 text-sm font-black uppercase tracking-widest transition-all hover:opacity-90 active:scale-[0.99]"
            style={{ background:`linear-gradient(135deg, ${C.yellow}, ${C.yellowWarm})`, color:C.dark }}>
            <Search className="h-3.5 w-3.5" />
            Search Maids
            {activeFilterCount > 0 && (
              <span className="ml-1 inline-flex h-4 min-w-[16px] items-center justify-center px-1 text-[10px] font-black"
                style={{ background:C.dark, color:C.yellow }}>
                {activeFilterCount}
              </span>
            )}
          </button>

          {activeFilterCount > 0 && (
            <button type="button" onClick={handleReset}
              className="flex w-full items-center justify-center gap-1.5 py-1.5 text-xs font-medium transition-colors"
              style={{ border:`1px solid ${C.border}`, color:C.textMuted, background:C.white }}>
              <X className="h-3 w-3" />Clear all filters
            </button>
          )}
        </div>
      </div>

      {/* Quick links */}
      <div className="mt-3 overflow-hidden" style={{ border:`1px solid ${C.border}`, boxShadow:"0 2px 8px rgba(7,43,53,0.06)" }}>
        <div className="px-3 py-2" style={{ borderBottom:`1px solid ${C.border}`, background:C.surface }}>
          <p className="text-[10px] font-black uppercase tracking-widest" style={{ color:C.textMuted }}>Browse by Category</p>
        </div>
        <div style={{ background:C.white }}>
          {NATIONALITY_LINKS.map((label, i) => {
            const linkKey = QUICK_LINKS_BY_LABEL[label];
            const isActive = !!quickLink && quickLink === linkKey;
            return (
              <button key={label} onClick={() => handleQuickLink(label)}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs transition-colors"
                style={{
                  background: isActive ? `linear-gradient(135deg, ${C.dark}, ${C.darkMid})` : C.white,
                  color: isActive ? C.white : C.textMuted,
                  fontWeight: isActive ? 800 : 500,
                  borderTop: i > 0 ? `1px solid ${C.border}` : "none",
                }}>
                <span style={{ color: isActive ? C.yellow : C.border, fontSize:13 }}>›</span>
                {label}
                {isActive && <span className="ml-auto" style={{ width:6, height:6, borderRadius:"50%", background:C.yellow, display:"inline-block" }} />}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );

  // ── Pagination ────────────────────────────────────────────────────────────
  const PaginationBar = () => (
    <div className="flex flex-wrap items-center gap-1">
      <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
        className="flex h-7 w-7 items-center justify-center transition-colors disabled:cursor-not-allowed disabled:opacity-40"
        style={{ border:`1px solid ${C.border}`, background:C.white, color:C.text }}>
        <ChevronLeft className="h-3.5 w-3.5" />
      </button>
      {pages.map((item, index) =>
        item === "..." ? (
          <span key={`el-${index}`} className="px-1 text-xs" style={{ color:C.textMuted }}>…</span>
        ) : (
          <button key={item} onClick={() => setPage(item as number)}
            className="flex h-7 min-w-[1.75rem] items-center justify-center border px-2 text-xs font-bold transition-colors"
            style={{
              border: item === page ? "none" : `1px solid ${C.border}`,
              background: item === page ? `linear-gradient(135deg, ${C.green}, ${C.greenMid})` : C.white,
              color: item === page ? C.white : C.text,
            }}>
            {item}
          </button>
        )
      )}
      <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}
        className="flex h-7 w-7 items-center justify-center transition-colors disabled:cursor-not-allowed disabled:opacity-40"
        style={{ border:`1px solid ${C.border}`, background:C.white, color:C.text }}>
        <ChevronRight className="h-3.5 w-3.5" />
      </button>
    </div>
  );

  return (
    <div className="client-page-theme min-h-screen" style={{ background:C.slate }}>
      {!embedded && (isLoggedIn ? <ClientPortalNavbar /> : <PublicSiteNavbar />)}

      {/* Hero strip */}
      {!embedded && (
        <div className="hidden md:block" style={{ background:`linear-gradient(135deg, ${C.dark} 0%, ${C.darkMid} 100%)`, borderBottom:`1px solid ${C.greenBorder}` }}>
          <div className="container mx-auto px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Sparkles className="h-4 w-4" style={{ color:C.yellow }} />
              <span className="text-sm font-semibold text-white">Browse verified domestic helper profiles</span>
              <span style={{ color:"rgba(255,255,255,0.3)" }}>·</span>
              <span className="text-xs" style={{ color:"rgba(255,255,255,0.5)" }}>
                {isLoading ? "Loading…" : <><span style={{ color:C.yellowWarm, fontWeight:800 }}>{filteredMaids.length}</span> profiles available</>}
              </span>
            </div>
            {!isLoggedIn && (
              <Link to={loginPath} className="text-xs font-bold uppercase tracking-wide transition-colors"
                style={{ color:C.yellowWarm }}>
                Login to view full profiles →
              </Link>
            )}
          </div>
        </div>
      )}

      {/* Mobile top bar */}
      <div className="sticky top-0 z-20 flex items-center justify-between gap-3 px-4 py-2.5 md:hidden"
        style={{ borderBottom:`1px solid ${C.border}`, background:C.white, boxShadow:"0 1px 8px rgba(7,43,53,0.08)" }}>
        <p className="text-sm font-semibold" style={{ color:C.text }}>
          {isLoading ? "Loading…" : <><span style={{ color:C.text, fontWeight:800 }}>{filteredMaids.length}</span> results</>}
        </p>
        <button type="button" onClick={() => setMobileSidebarOpen((v) => !v)}
          className="flex items-center gap-2 px-3 py-1.5 text-sm font-semibold transition-colors"
          style={{ border:`1px solid ${C.border}`, background:C.white, color:C.text }}>
          <Filter className="h-3.5 w-3.5" />
          Filters
          {activeFilterCount > 0 && (
            <span className="inline-flex h-4 min-w-[16px] items-center justify-center px-1 text-[10px] font-bold"
              style={{ background:C.yellow, color:C.dark }}>
              {activeFilterCount}
            </span>
          )}
        </button>
      </div>

      {/* Mobile sidebar drawer */}
      {mobileSidebarOpen && (
        <div className="fixed inset-0 z-30 md:hidden">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setMobileSidebarOpen(false)} />
          <div className="absolute bottom-0 left-0 right-0 max-h-[88vh] overflow-y-auto p-4"
            style={{ background:C.surface, boxShadow:"0 -8px 40px rgba(7,43,53,0.20)" }}>
            <div className="mb-4 flex items-center justify-between">
              <p className="font-black text-sm uppercase tracking-wide" style={{ color:C.text }}>Filters</p>
              <button type="button" onClick={() => setMobileSidebarOpen(false)}
                className="p-1.5 transition-colors"
                style={{ border:`1px solid ${C.border}`, background:C.white, color:C.textMuted }}>
                <X className="h-4 w-4" />
              </button>
            </div>
            <SidebarContent />
          </div>
        </div>
      )}

      <div className="container mx-auto flex flex-col gap-4 px-3 py-4 sm:px-4 md:flex-row md:gap-5 md:py-5">
        {/* Sidebar */}
        <aside className="hidden w-60 shrink-0 md:block">
          <div className="sticky top-4"><SidebarContent /></div>
        </aside>

        {/* Main content */}
        <main className="min-w-0 flex-1">

          {/* Advanced filters banner */}
          {advancedFilters && advancedFilterSummary.length > 0 && (
            <div className="mb-3 px-4 py-3"
              style={{ borderLeft:`4px solid ${C.yellow}`, background:C.white, boxShadow:"0 1px 6px rgba(7,43,53,0.06)" }}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-black uppercase tracking-widest mb-2" style={{ color:C.textMuted }}>Advanced Filters Active</p>
                  <div className="flex flex-wrap gap-1.5">
                    {advancedFilterSummary.map((item) => <ActiveFilterPill key={item} label={item} />)}
                  </div>
                </div>
                <div className="flex shrink-0 flex-wrap gap-2">
                  <Button variant="outline" size="sm" asChild className="text-xs">
                    <Link to={advancedFiltersRaw ? `${basePath}?filters=${encodeURIComponent(advancedFiltersRaw)}` : basePath}>Edit Filters</Link>
                  </Button>
                  <Button variant="ghost" size="sm" onClick={handleReset} className="text-xs text-slate-400 hover:text-red-500">
                    <X className="h-3.5 w-3.5 mr-1" />Clear
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Shortlist bar */}
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2 px-4 py-2.5"
            style={{ border:`1px solid ${C.yellowBorder}`, background:C.yellowPale }}>
            <div className="flex items-center gap-2.5">
              <div style={{ width:28, height:28, background:C.yellow, display:"flex", alignItems:"center", justifyContent:"center", borderRadius:7, flexShrink:0 }}>
                <Star className="h-3.5 w-3.5" style={{ fill:C.dark, color:C.dark }} />
              </div>
              <span className="text-sm" style={{ color:"#78480A" }}>
                <span style={{ fontWeight:900, color:"#5A3608" }}>{shortlistRefs.length}</span>{" "}
                {shortlistRefs.length === 1 ? "maid" : "maids"} shortlisted
              </span>
            </div>
            <button type="button" onClick={() => setIsShortlistOpen(true)}
              className="text-xs font-black uppercase tracking-wider transition-colors"
              style={{ color:C.green, borderBottom:`1.5px solid ${C.green}`, paddingBottom:1, background:"none", border:"none", cursor:"pointer" }}>
              View Shortlist →
            </button>
          </div>

          {/* Results header */}
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3 px-4 py-2.5"
            style={{ background:C.white, border:`1px solid ${C.border}`, boxShadow:"0 1px 4px rgba(7,43,53,0.04)" }}>
            <p className="text-sm" style={{ color:C.textMuted }}>
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <span className="inline-block h-3 w-3 border-2 border-t-transparent animate-spin"
                    style={{ borderColor:`${C.border} ${C.border} ${C.border} ${C.greenMid}` }} />
                  Loading profiles…
                </span>
              ) : (
                <>
                  <span style={{ fontWeight:800, color:C.text }}>{filteredMaids.length}</span>{" "}
                  {filteredMaids.length !== 1 ? "profiles" : "profile"} found
                  {quickLink && (
                    <span className="ml-2 inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider"
                      style={{ border:`1px solid ${C.border}`, background:C.surface, color:C.textMuted }}>
                      {QUICK_LINKS[quickLink as QuickLinkKey]}
                    </span>
                  )}
                </>
              )}
            </p>
            <PaginationBar />
          </div>

          {/* Grid */}
          {isLoading ? (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
              {Array.from({ length: PAGE_SIZE }).map((_, i) => (
                <div key={i} className="overflow-hidden animate-pulse" style={{ border:`1px solid ${C.border}`, background:C.white }}>
                  <div className="aspect-[3/4]" style={{ background:C.surface }} />
                  <div className="space-y-1.5 p-2.5">
                    <div className="h-2 w-3/4" style={{ background:C.border }} />
                    <div className="h-2 w-1/2" style={{ background:C.border }} />
                    <div className="h-2 w-2/3" style={{ background:C.border }} />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredMaids.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center"
              style={{ border:`1px dashed ${C.border}`, background:C.white }}>
              <div style={{ width:64, height:64, background:C.surface, display:"flex", alignItems:"center", justifyContent:"center", marginBottom:16 }}>
                <Search className="h-7 w-7" style={{ color:C.border }} />
              </div>
              <p className="text-base font-bold" style={{ color:C.text }}>No profiles found</p>
              <p className="mt-1 text-sm" style={{ color:C.textMuted }}>Try adjusting your filters or search keywords.</p>
              {activeFilterCount > 0 && (
                <button type="button" onClick={handleReset}
                  className="mt-4 px-5 py-2 text-sm font-semibold transition-colors"
                  style={{ border:`1px solid ${C.border}`, background:C.white, color:C.text }}>
                  Clear all filters
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
              {pagedMaids.map((maid) => (
                <MaidCard
                  key={maid.referenceCode}
                  maid={maid}
                  isShortlisted={shortlist.has(maid.referenceCode)}
                  onToggleShortlist={handleToggleShortlist}
                  isLoggedIn={isLoggedIn}
                  loginPath={loginPath}
                  showCategory={isIndianSubcategoryActive}
                />
              ))}
            </div>
          )}

          {/* Bottom pagination */}
          {!isLoading && filteredMaids.length > 0 && (
            <div className="mt-5 flex flex-wrap items-center justify-between gap-3 px-4 py-3"
              style={{ background:C.white, border:`1px solid ${C.border}`, boxShadow:"0 1px 4px rgba(7,43,53,0.04)" }}>
              <p className="text-sm" style={{ color:C.textMuted }}>
                Page <span style={{ fontWeight:800, color:C.text }}>{page}</span> of{" "}
                <span style={{ fontWeight:800, color:C.text }}>{totalPages}</span>
              </p>
              <PaginationBar />
            </div>
          )}

          {/* ── Improved Shortlist Dialog ── */}
          <ShortlistDialog
            open={isShortlistOpen}
            onOpenChange={setIsShortlistOpen}
            shortlistRefs={shortlistRefs}
            shortlistedMaids={shortlistedMaids}
            missingShortlistRefs={missingShortlistRefs}
            onToggleShortlist={handleToggleShortlist}
            isLoggedIn={isLoggedIn}
            loginPath={loginPath}
            isIndianSubcategoryActive={isIndianSubcategoryActive}
            isShortlistOpen={isShortlistOpen}
            setIsShortlistOpen={setIsShortlistOpen}
          />
        </main>
      </div>
    </div>
  );
};

// ── Types ─────────────────────────────────────────────────────────────────────
type ClientDraft = {
  keyword:string; agencyPreference:string; biodataCreatedWithin:string;
  maidType:string; willingOffDays:boolean; hasChildren:boolean; withVideo:boolean;
  natFilipino:boolean; natIndonesian:boolean; natMyanmar:boolean; natIndian:boolean;
  natSriLankan:boolean; natCambodian:boolean; natBangladeshi:boolean; natOthers:boolean; natNoPreference:boolean;
  expHomeCountry:boolean; expSingapore:boolean; expMalaysia:boolean; expHongKong:boolean;
  expTaiwan:boolean; expMiddleEast:boolean; expOtherCountries:boolean; expNoPreference:boolean;
  dutyCareInfant:boolean; dutyCareYoungChildren:boolean; dutyCareElderlyDisabled:boolean;
  dutyCooking:boolean; dutyGeneralHousekeeping:false; dutyNoPreference:boolean;
  eduCollege:boolean; eduHighSchool:boolean; eduSecondary:boolean; eduPrimary:boolean; eduNoPreference:boolean;
  langEnglish:boolean; langMandarin:boolean; langBahasaIndonesia:boolean;
  langHindi:boolean; langTamil:boolean; langNoPreference:boolean;
  age21to25:boolean; age26to30:boolean; age31to35:boolean; age36to40:boolean; age41above:boolean; ageNoPreference:boolean;
  marSingle:boolean; marMarried:boolean; marWidowed:boolean; marDivorced:boolean; marSeparated:boolean; marNoPreference:boolean;
  height150below:boolean; height151to155:boolean; height156to160:boolean; height161above:boolean; heightNoPreference:boolean;
  relFreeThinker:boolean; relChristian:boolean; relCatholic:boolean; relBuddhist:boolean;
  relMuslim:boolean; relHindu:boolean; relSikh:boolean; relOthers:boolean; relNoPreference:boolean;
};

type SidebarFilters = { keyword:string; maidType:string; willingOffDays:boolean; nationality:string; language:string };
type MaidSearchPageProps = { basePath?:string; loginPath?:string; embedded?:boolean };

// ── Constants ─────────────────────────────────────────────────────────────────
const MAID_TYPES = ["New Maid", "Transfer Maid", "Ex-Singapore Maid"] as const;
const PAGE_SIZE = 18;
const INDIAN_SUBCATEGORY_KEYS = new Set(["mizoram", "darjeeling", "manipur", "punjabi"]);

const NATIONALITY_LINKS = [
  "Most Recent Maid in 3 days","English Speaking Maid","Mandarin Speaking Maid","Hokkien/Cantonese Speaking",
  "Filipino Maid","Indonesian Maid","Myanmar Maid","Indian Maid","Mizoram Maid","Darjeeling Maid",
  "Manipur Maid","Punjabi Maid","Sri Lankan Maid","Cambodian Maid","Bangladeshi Maid",
] as const;

const QUICK_LINKS = {
  mostRecent3Days:"Most Recent Maid in 3 days", english:"English Speaking Maid",
  mandarin:"Mandarin Speaking Maid", hokkienCantonese:"Hokkien/Cantonese Speaking",
  newMaid:"New Maid", transferMaid:"Transfer Maid", exSingapore:"Ex-Singapore Maid",
  filipino:"Filipino Maid", indonesian:"Indonesian Maid", myanmar:"Myanmar Maid",
  indian:"Indian Maid", mizoram:"Mizoram Maid", darjeeling:"Darjeeling Maid",
  manipur:"Manipur Maid", punjabi:"Punjabi Maid", sriLankan:"Sri Lankan Maid",
  cambodian:"Cambodian Maid", bangladeshi:"Bangladeshi Maid",
} as const;

type QuickLinkKey = keyof typeof QUICK_LINKS;

const QUICK_LINKS_BY_LABEL = Object.fromEntries(
  Object.entries(QUICK_LINKS).map(([k, v]) => [v, k])
) as Record<string, QuickLinkKey>;

const defaultSidebarFilters: SidebarFilters = {
  keyword:"", maidType:"", willingOffDays:false, nationality:"No Preference", language:"No Preference",
};

// ── Filter helpers ─────────────────────────────────────────────────────────────
const parseAdvancedFilters = (searchParams: URLSearchParams): ClientDraft | null => {
  const raw = searchParams.get("filters");
  if (!raw) return null;
  try { const p = JSON.parse(raw) as Record<string, unknown>; return p && typeof p === "object" ? (p as ClientDraft) : null; }
  catch { return null; }
};

const deriveSidebarFilters = (searchParams: URLSearchParams, adv: ClientDraft | null): SidebarFilters => ({
  keyword: searchParams.get("q") || adv?.keyword || "",
  maidType: searchParams.get("type") || adv?.maidType || "",
  willingOffDays: searchParams.get("offDays") === "true" || Boolean(adv?.willingOffDays),
  nationality: searchParams.get("nationality") ||
    (adv?.natFilipino ? "Filipino" : adv?.natIndonesian ? "Indonesian" : adv?.natMyanmar ? "Myanmar" :
     adv?.natIndian ? "Indian" : adv?.natSriLankan ? "Sri Lankan" : adv?.natCambodian ? "Cambodian" :
     adv?.natBangladeshi ? "Bangladeshi" : adv?.natOthers ? "Others" : "No Preference"),
  language: searchParams.get("language") ||
    (adv?.langEnglish ? "English" : adv?.langMandarin ? "Mandarin" :
     adv?.langBahasaIndonesia ? "Bahasa Indonesia / Malay" : adv?.langHindi ? "Hindi" :
     adv?.langTamil ? "Tamil" : "No Preference"),
});

const normalizeStr = (s: unknown) => String(s || "").toLowerCase().trim();

const matchesLanguageSkill = (maid: MaidProfile, lang: string) => {
  const t = lang.toLowerCase();
  if (t === "mandarin") {
    return Object.entries(maid.languageSkills || {}).some(([k, lvl]) => {
      const key = k.toLowerCase();
      if (!key.includes("mandarin") && !key.includes("chinese")) return false;
      const l = normalizeStr(lvl);
      return l === "little" || l === "fair" || l === "good";
    });
  }
  const skills = Object.entries(maid.languageSkills || {})
    .filter(([, lvl]) => { const l = normalizeStr(lvl); return l && l !== "zero" && l !== "none"; })
    .map(([k]) => k.toLowerCase());
  if (t === "bahasa" || t.includes("bahasa") || t.includes("malay") || t.includes("indonesia"))
    return skills.some((s) => s.includes("bahasa") || s.includes("malay") || s.includes("indonesia"));
  return skills.some((s) => s.includes(t));
};

const matchesHeight = (maid: MaidProfile, d: ClientDraft): boolean => {
  if (d.heightNoPreference) return true;
  const raw = parseFloat(String(maid.height || "0").replace(/[^\d.]/g, ""));
  if (!raw) return true;
  if (d.height150below && raw <= 150) return true;
  if (d.height151to155 && raw >= 151 && raw <= 155) return true;
  if (d.height156to160 && raw >= 156 && raw <= 160) return true;
  if (d.height161above && raw >= 161) return true;
  return false;
};

const matchesAge = (maid: MaidProfile, d: ClientDraft): boolean => {
  if (d.ageNoPreference) return true;
  const age = calculateAge(maid.dateOfBirth);
  if (age === null) return true;
  if (d.age21to25 && age >= 21 && age <= 25) return true;
  if (d.age26to30 && age >= 26 && age <= 30) return true;
  if (d.age31to35 && age >= 31 && age <= 35) return true;
  if (d.age36to40 && age >= 36 && age <= 40) return true;
  if (d.age41above && age >= 41) return true;
  return false;
};

const matchesEducation = (maid: MaidProfile, d: ClientDraft): boolean => {
  if (d.eduNoPreference) return true;
  const edu = normalizeStr(maid.educationLevel);
  if (d.eduCollege && (edu.includes("college")||edu.includes("degree")||edu.includes("bachelor")||edu.includes("university"))) return true;
  if (d.eduHighSchool && (edu.includes("high school")||edu.includes("senior high"))) return true;
  if (d.eduSecondary && (edu.includes("secondary")||edu.includes("junior high")||edu.includes("middle school"))) return true;
  if (d.eduPrimary && (edu.includes("primary")||edu.includes("elementary"))) return true;
  return false;
};

const matchesReligion = (maid: MaidProfile, d: ClientDraft): boolean => {
  if (d.relNoPreference) return true;
  const rel = normalizeStr(maid.religion);
  if (d.relFreeThinker && (rel.includes("free")||rel.includes("none")||rel.includes("atheist")||rel.includes("agnostic"))) return true;
  if (d.relChristian && rel.includes("christian") && !rel.includes("catholic")) return true;
  if (d.relCatholic && rel.includes("catholic")) return true;
  if (d.relBuddhist && rel.includes("buddh")) return true;
  if (d.relMuslim && (rel.includes("muslim")||rel.includes("islam"))) return true;
  if (d.relHindu && rel.includes("hindu")) return true;
  if (d.relSikh && rel.includes("sikh")) return true;
  if (d.relOthers) return true;
  return false;
};

const matchesMarital = (maid: MaidProfile, d: ClientDraft): boolean => {
  if (d.marNoPreference) return true;
  const mar = normalizeStr(maid.maritalStatus);
  if (d.marSingle && mar.includes("single")) return true;
  if (d.marMarried && mar.includes("married")) return true;
  if (d.marWidowed && mar.includes("widow")) return true;
  if (d.marDivorced && mar.includes("divorc")) return true;
  if (d.marSeparated && mar.includes("separat")) return true;
  return false;
};

const matchesNationality = (maid: MaidProfile, d: ClientDraft): boolean => {
  if (d.natNoPreference) return true;
  const nat = normalizeStr(maid.nationality);
  if (d.natFilipino && (nat.includes("filip")||nat.includes("pinoy"))) return true;
  if (d.natIndonesian && nat.includes("indo")) return true;
  if (d.natMyanmar && (nat.includes("myan")||nat.includes("burm"))) return true;
  if (d.natIndian && nat.includes("indian")) return true;
  if (d.natSriLankan && (nat.includes("sri")||nat.includes("lanka"))) return true;
  if (d.natCambodian && nat.includes("cambod")) return true;
  if (d.natBangladeshi && nat.includes("bangla")) return true;
  if (d.natOthers) {
    const kn = ["filip","pinoy","indo","myan","burm","indian","sri","lanka","cambod","bangla"];
    return !kn.some((k) => nat.includes(k));
  }
  return false;
};

const matchesExperience = (maid: MaidProfile, d: ClientDraft): boolean => {
  if (d.expNoPreference) return true;
  const expText = (Array.isArray(maid.employmentHistory)
    ? maid.employmentHistory.map((e: Record<string, unknown>) => Object.values(e).map(String).join(" "))
    : []).join(" ").toLowerCase();
  if (d.expSingapore && expText.includes("singapore")) return true;
  if (d.expMalaysia && expText.includes("malaysia")) return true;
  if (d.expHongKong && (expText.includes("hong kong")||expText.includes("hongkong"))) return true;
  if (d.expTaiwan && expText.includes("taiwan")) return true;
  if (d.expMiddleEast && (expText.includes("dubai")||expText.includes("uae")||expText.includes("saudi")||
    expText.includes("qatar")||expText.includes("kuwait")||expText.includes("middle east")||
    expText.includes("bahrain")||expText.includes("oman"))) return true;
  if (d.expHomeCountry||d.expOtherCountries) return true;
  return false;
};

const matchesDuties = (maid: MaidProfile, d: ClientDraft): boolean => {
  if (d.dutyNoPreference) return true;
  const dt = Object.keys(maid.workAreas||{}).join(" ").toLowerCase()+" "+
    Object.values((maid.skillsPreferences as Record<string,unknown>)||{}).map(String).join(" ").toLowerCase();
  if (d.dutyCareInfant && (dt.includes("infant")||dt.includes("baby")||dt.includes("newborn"))) return true;
  if (d.dutyCareYoungChildren && (dt.includes("child")||dt.includes("kid")||dt.includes("toddler"))) return true;
  if (d.dutyCareElderlyDisabled && (dt.includes("elder")||dt.includes("elderly")||dt.includes("disabled"))) return true;
  if (d.dutyCooking && dt.includes("cook")) return true;
  if (d.dutyGeneralHousekeeping && (dt.includes("housekeep")||dt.includes("household")||dt.includes("cleaning")||dt.includes("general"))) return true;
  return false;
};

const matchesBiodataAge = (maid: MaidProfile, d: ClientDraft): boolean => {
  if (!d.biodataCreatedWithin||d.biodataCreatedWithin==="No Preference") return true;
  const raw = String(maid.createdAt||maid.updatedAt||"").trim();
  if (!raw) return true;
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return true;
  const now = new Date();
  const cutoff = new Date(now);
  switch (d.biodataCreatedWithin) {
    case "1 week":   cutoff.setDate(now.getDate()-7); break;
    case "2 weeks":  cutoff.setDate(now.getDate()-14); break;
    case "1 month":  cutoff.setMonth(now.getMonth()-1); break;
    case "3 months": cutoff.setMonth(now.getMonth()-3); break;
    case "6 months": cutoff.setMonth(now.getMonth()-6); break;
    case "1 year":   cutoff.setFullYear(now.getFullYear()-1); break;
    default: return true;
  }
  return date >= cutoff;
};

const hasPhoto = (maid: MaidProfile): boolean => {
  if (Array.isArray(maid.photoDataUrls) && maid.photoDataUrls.length > 0)
    if (maid.photoDataUrls.some((url) => typeof url==="string" && url.trim().length>0)) return true;
  return typeof maid.photoDataUrl==="string" && maid.photoDataUrl.trim().length>0;
};

const filterMaidsByDraft = (maids: MaidProfile[], draft: ClientDraft): MaidProfile[] =>
  maids.filter((maid) => {
    if (!hasPhoto(maid)) return false;
    if (draft.keyword.trim()) {
      const kw = draft.keyword.trim().toLowerCase();
      const searchable = [maid.fullName,maid.referenceCode,maid.nationality,maid.type,maid.religion,
        maid.maritalStatus,getMaidCategory(maid),...Object.keys(maid.workAreas||{})].map(normalizeStr).join(" ");
      if (!searchable.includes(kw)) return false;
    }
    if (draft.maidType) {
      const t = normalizeStr(maid.type);
      if (draft.maidType==="New Maid" && !t.includes("new")) return false;
      if (draft.maidType==="Transfer Maid" && !t.includes("transfer")) return false;
      if (draft.maidType==="Ex-Singapore Maid" && !(t.includes("ex-singapore")||t.includes("ex singapore")||t.includes("exsg"))) return false;
    }
    if (draft.willingOffDays) {
      const sp = (maid.skillsPreferences as Record<string,unknown>)||{};
      const oi = (sp.otherInformation as Record<string,boolean>)||{};
      const wk = ["Can work on off-days with compensation?","Willing to work on off-days with compensation?","Willing to work on off-days with  compensation?"];
      if (!wk.some((k) => Boolean(oi[k]))) return false;
    }
    if (draft.withVideo && !maid.videoDataUrl) return false;
    if (!matchesBiodataAge(maid,draft)) return false;
    if (!matchesNationality(maid,draft)) return false;
    if (!matchesExperience(maid,draft)) return false;
    if (!matchesDuties(maid,draft)) return false;
    if (!matchesEducation(maid,draft)) return false;
    if (!draft.langNoPreference) {
      const lp = (draft.langEnglish&&matchesLanguageSkill(maid,"english"))||
        (draft.langMandarin&&matchesLanguageSkill(maid,"mandarin"))||
        (draft.langBahasaIndonesia&&matchesLanguageSkill(maid,"bahasa"))||
        (draft.langHindi&&matchesLanguageSkill(maid,"hindi"))||
        (draft.langTamil&&matchesLanguageSkill(maid,"tamil"));
      if (!lp) return false;
    }
    if (!matchesAge(maid,draft)) return false;
    if (!matchesMarital(maid,draft)) return false;
    if (!matchesHeight(maid,draft)) return false;
    if (!matchesReligion(maid,draft)) return false;
    return true;
  });

const normalizeNationality = (value: string) => {
  const lower = value.trim().toLowerCase();
  if (lower.includes("filip")) return "Filipino";
  if (lower.includes("indo")) return "Indonesian";
  if (lower.includes("myan")) return "Myanmar";
  if (lower.includes("indian")) return "Indian";
  if (lower.includes("sri")||lower.includes("lanka")) return "Sri Lankan";
  if (lower.includes("cambod")) return "Cambodian";
  if (lower.includes("bangla")) return "Bangladeshi";
  return "Others";
};

const matchesIndianSubcategory = (maid: MaidProfile, term: string): boolean => {
  const nat = normalizeStr(maid.nationality);
  const category = normalizeStr(getMaidCategory(maid));
  const ac = (maid.agencyContact as Record<string,unknown>)||{};
  const intro = (maid.introduction as Record<string,unknown>)||{};
  const sp = (maid.skillsPreferences as Record<string,unknown>)||{};
  const all = [category,normalizeStr(ac["indianMaidCategory"]),normalizeStr(intro["indianMaidCategory"]),normalizeStr(sp["indianMaidCategory"])].join(" ");
  return nat.includes(term)||all.includes(term);
};

const matchesQuickLink = (maid: MaidProfile, quickLink: QuickLinkKey) => {
  switch (quickLink) {
    case "mostRecent3Days": {
      const raw = String(maid.createdAt||maid.updatedAt||"").trim();
      if (!raw) return false;
      const date = new Date(raw);
      if (Number.isNaN(date.getTime())) return false;
      const cutoff = new Date(); cutoff.setDate(cutoff.getDate()-3);
      return date >= cutoff;
    }
    case "english": return matchesLanguageSkill(maid,"english");
    case "mandarin": return matchesLanguageSkill(maid,"mandarin");
    case "hokkienCantonese": return matchesLanguageSkill(maid,"hokkien")||matchesLanguageSkill(maid,"cantonese");
    case "newMaid": return normalizeStr(maid.type).includes("new");
    case "transferMaid": return normalizeStr(maid.type).includes("transfer");
    case "exSingapore": return normalizeStr(maid.type).includes("ex-singapore")||normalizeStr(maid.type).includes("ex singapore");
    case "filipino": return normalizeNationality(String(maid.nationality||""))==="Filipino";
    case "indonesian": return normalizeNationality(String(maid.nationality||""))==="Indonesian";
    case "myanmar": return normalizeNationality(String(maid.nationality||""))==="Myanmar";
    case "indian": return normalizeNationality(String(maid.nationality||""))==="Indian";
    case "mizoram": return matchesIndianSubcategory(maid,"mizoram");
    case "darjeeling": return matchesIndianSubcategory(maid,"darjeeling");
    case "manipur": return matchesIndianSubcategory(maid,"manipur");
    case "punjabi": return matchesIndianSubcategory(maid,"punjabi");
    case "sriLankan": return normalizeNationality(String(maid.nationality||""))==="Sri Lankan";
    case "cambodian": return normalizeNationality(String(maid.nationality||""))==="Cambodian";
    case "bangladeshi": return normalizeNationality(String(maid.nationality||""))==="Bangladeshi";
    default: return true;
  }
};

// ── UI helpers ─────────────────────────────────────────────────────────────────
const getPrimaryPhoto = (maid: MaidProfile) =>
  Array.isArray(maid.photoDataUrls) && maid.photoDataUrls.length > 0
    ? maid.photoDataUrls[0] : maid.photoDataUrl || "";

const getTypeLabel = (type: string) => {
  const lower = type.toLowerCase();
  if (lower.includes("new")) return "NEW";
  if (lower.includes("transfer")) return "TRANSFER";
  if (lower.includes("ex")) return "EX-SG";
  return type.toUpperCase();
};

const getMaidTypeBadgeClass = (type?: string) => {
  const t = (type||"").toLowerCase();
  if (t.includes("new")) return "text-emerald-700 border-emerald-200 bg-emerald-50";
  if (t.includes("transfer")) return "text-blue-700 border-blue-200 bg-blue-50";
  return "text-amber-700 border-amber-200 bg-amber-50";
};

const pageNumbers = (current: number, total: number): (number|"...")[] => {
  if (total <= 10) return Array.from({ length:total }, (_,i) => i+1);
  const pages: (number|"...")[] = [1];
  if (current > 3) pages.push("...");
  for (let i = Math.max(2,current-1); i <= Math.min(total-1,current+1); i++) pages.push(i);
  if (current < total-2) pages.push("...");
  pages.push(total);
  return pages;
};

const ActiveFilterPill = ({ label, onRemove }: { label:string; onRemove?:()=>void }) => (
  <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-black uppercase tracking-wide"
    style={{ border:`1px solid ${C.yellowBorder}`, background:C.yellowPale, color:"#92580A" }}>
    {label}
    {onRemove && (
      <button type="button" onClick={onRemove} className="ml-0.5 hover:text-red-500">
        <X className="h-2.5 w-2.5" />
      </button>
    )}
  </span>
);

export default MaidSearchPage;