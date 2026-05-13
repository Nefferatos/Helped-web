import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ChevronLeft, ChevronRight, Search, Star, SlidersHorizontal, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { calculateAge, getExperienceBucket, MaidProfile } from "@/lib/maids";
import { toast } from "@/components/ui/sonner";
import { getClientToken } from "@/lib/clientAuth";
import { getSavedShortlistRefs, subscribeToShortlistRefs, toggleShortlistRef } from "@/lib/shortlist";
import PublicSiteNavbar from "@/components/PublicSiteNavbar";
import ClientPortalNavbar from "@/ClientPage/ClientPortalNavbar";
import "./ClientTheme.css";

// ── Nationality → ISO 3166-1 alpha-2 ─────────────────────────────────────────
const NATIONALITY_FLAGS: Record<string, string> = {
  filipino: "ph", philippines: "ph",
  indonesian: "id", indonesia: "id",
  myanmar: "mm", burmese: "mm",
  cambodian: "kh", cambodia: "kh",
  vietnamese: "vn", vietnam: "vn",
  thai: "th", thailand: "th",
  malaysian: "my", malaysia: "my",
  singaporean: "sg", singapore: "sg",
  indian: "in", india: "in",
  "sri lankan": "lk", "sri lanka": "lk",
  bangladeshi: "bd", bangladesh: "bd",
  nepali: "np", nepalese: "np", nepal: "np",
  pakistani: "pk", pakistan: "pk",
  chinese: "cn", china: "cn",
  hongkong: "hk", "hong kong": "hk",
  taiwanese: "tw", taiwan: "tw",
  korean: "kr", "south korea": "kr",
  japanese: "jp", japan: "jp",
  ethiopian: "et", ethiopia: "et",
  kenyan: "ke", kenya: "ke",
  ugandan: "ug", uganda: "ug",
  ghanaian: "gh", ghana: "gh",
  nigerian: "ng", nigeria: "ng",
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
      display: "inline-flex", alignItems: "center", justifyContent: "center",
      width: 14, height: 14, borderRadius: "50%", overflow: "hidden",
      border: "1px solid rgba(0,0,0,0.13)", flexShrink: 0,
      verticalAlign: "middle", background: "#e5e7eb",
    }}>
      <img
        src={`https://flagcdn.com/w40/${code.toLowerCase()}.png`}
        alt={code}
        style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
      />
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

// ── Hover popup helper ────────────────────────────────────────────────────────
const getMaidPopupDetails = (maid: MaidProfile) => {
  const sp = (maid.skillsPreferences as Record<string, unknown>) || {};
  const intro = (maid.introduction as Record<string, unknown>) || {};
  const agencyContact = (maid.agencyContact as Record<string, unknown>) || {};

  const englishLevel = maid.languageSkills
    ? String(
        (maid.languageSkills as Record<string, unknown>)["english"] ||
        (maid.languageSkills as Record<string, unknown>)["English"] ||
        ""
      ).trim()
    : "";

  const height = String(maid.height || sp["height"] || intro["height"] || "").trim();
  const weight = String(maid.weight || sp["weight"] || intro["weight"] || "").trim();

  const bioRaw =
    String(sp["remarks"] || intro["remarks"] || sp["biodata"] || intro["biodata"] ||
      sp["summary"] || intro["summary"] || agencyContact["remarks"] || "").trim();

  const workAreas = Object.keys(maid.workAreas || {}).filter(Boolean);

  const otherInfo = (sp.otherInformation as Record<string, boolean>) || {};
  const willingKeys = [
    "Can work on off-days with compensation?",
    "Willing to work on off-days with compensation?",
    "Willing to work on off-days with  compensation?",
  ];
  const willingOffDays = willingKeys.some((k) => Boolean(otherInfo[k]));

  const langs = maid.languageSkills
    ? Object.entries(maid.languageSkills as Record<string, unknown>)
        .filter(([, lvl]) => {
          const l = String(lvl || "").trim().toLowerCase();
          return l && l !== "zero" && l !== "none";
        })
        .map(([key, lvl]) => `${key.charAt(0).toUpperCase() + key.slice(1)}: ${String(lvl).trim()}`)
    : [];

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
  const uniqueExp = [...new Set(expCountries)];

  return { englishLevel, height, weight, bioRaw, workAreas, willingOffDays, langs, uniqueExp };
};

// ── Skills table helper ───────────────────────────────────────────────────────
type SkillRow = {
  name: string;
  willing: boolean;
  evaluation: number; // 0-5
};

const getSkillsRows = (maid: MaidProfile): SkillRow[] => {
  const sp = (maid.skillsPreferences as Record<string, unknown>) || {};
  const skills = (sp["skills"] || sp["Skills"]) as Record<string, unknown> | undefined;
  if (!skills || typeof skills !== "object") {
    const workAreas = Object.keys(maid.workAreas || {});
    return workAreas.map((name) => ({ name, willing: true, evaluation: 0 }));
  }
  return Object.entries(skills).map(([name, val]) => {
    const v = val as Record<string, unknown> || {};
    const willing = Boolean(v["willing"] ?? v["Willing"] ?? v["willingness"] ?? true);
    const evalRaw = Number(v["evaluation"] ?? v["Evaluation"] ?? v["rating"] ?? 0);
    return { name, willing, evaluation: Math.min(5, Math.max(0, evalRaw)) };
  });
};

const StarRating = ({ count }: { count: number }) => (
  <span className="inline-flex items-center gap-px">
    {Array.from({ length: 5 }).map((_, i) => (
      <svg key={i} viewBox="0 0 16 16" className={`h-3 w-3 ${i < count ? "text-amber-400" : "text-gray-200"}`} fill="currentColor">
        <path d="M8 1l1.9 3.9 4.3.6-3.1 3 .7 4.3L8 10.8l-3.8 2 .7-4.3-3.1-3 4.3-.6z" />
      </svg>
    ))}
  </span>
);

// ── Locked maid modal ─────────────────────────────────────────────────────────
const LockedMaidModal = ({
  maid,
  loginPath,
  onClose,
}: {
  maid: MaidProfile;
  loginPath: string;
  onClose: () => void;
}) => {
  const photo = getPrimaryPhoto(maid);
  const age = calculateAge(maid.dateOfBirth);
  const flagCode = getNationalityCode(maid.nationality);
  const sp = (maid.skillsPreferences as Record<string, unknown>) || {};
  const agencyContact = (maid.agencyContact as Record<string, unknown>) || {};
  const intro = (maid.introduction as Record<string, unknown>) || {};

  // ── hover state: when true the photo is hidden ───────────────────────────
  const [imageHovered, setImageHovered] = useState(false);

  const agencyName = String(agencyContact["agencyName"] || agencyContact["name"] || "");
  const englishLevel = maid.languageSkills
    ? String(
        (maid.languageSkills as Record<string, unknown>)["english"] ||
        (maid.languageSkills as Record<string, unknown>)["English"] || ""
      ).trim()
    : "";

  const bioRaw = String(
    sp["remarks"] || intro["remarks"] || sp["biodata"] || intro["biodata"] ||
    sp["summary"] || intro["summary"] || agencyContact["remarks"] || ""
  ).trim();

  const skillRows = getSkillsRows(maid);
  const empHistory = Array.isArray(maid.employmentHistory) ? maid.employmentHistory : [];
  const typeLabel = getTypeLabel(maid.type || "");
  const typeColorClass = getMaidTypeBadgeClass(maid.type);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60" />
      <div
        className="relative w-full max-w-sm max-h-[90vh] overflow-y-auto rounded-lg border border-border bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-2 right-2 z-10 flex h-6 w-6 items-center justify-center rounded bg-black/50 text-white hover:bg-black/70"
        >
          <X className="h-3.5 w-3.5" />
        </button>

        {/* Login banner */}
        <div className="sticky top-0 z-10 bg-primary px-4 py-3 text-center">
          <div className="flex items-center justify-center gap-1.5 mb-2">
            <LockIcon className="h-3.5 w-3.5 text-primary-foreground/80" />
            <p className="text-xs font-bold text-primary-foreground">
              Login / Register to see full bio-data and photos
            </p>
          </div>
          <Link
            to={loginPath}
            className="inline-flex w-full items-center justify-center gap-2 rounded bg-amber-400 px-4 py-2 text-sm font-bold text-black transition-colors hover:bg-amber-300"
          >
            Login / Register
          </Link>
        </div>

        {/* Maid info header */}
        <div className="border-b border-border/60 bg-gray-50 px-4 py-3 text-xs text-gray-700 space-y-0.5">
          <p>
            <span className="font-semibold">{maid.nationality ? `${maid.nationality} maid` : "Maid"}:</span>{" "}
            <span className="blur-[4px] select-none">{maid.fullName || "Name hidden"}</span>
          </p>
          {agencyName && (
            <p><span className="font-semibold">Maid Agency:</span> {agencyName}</p>
          )}
          {maid.type && (
            <p>
              <span className={`inline-block px-1.5 py-px text-[9px] font-bold border rounded ${typeColorClass}`}>
                {typeLabel}
              </span>
            </p>
          )}
          {englishLevel && (
            <p><span className="font-semibold">English:</span> {englishLevel}</p>
          )}
        </div>

        

        {/* Basic details */}
        <div className="px-4 py-3 text-xs space-y-1 border-b border-border/60">
          <div className="grid grid-cols-2 gap-x-3 gap-y-1">
            {maid.referenceCode && (
              <div><span className="text-gray-500">Ref:</span> <span className="font-mono font-semibold blur-[3px] select-none">{maid.referenceCode}</span></div>
            )}
            {age !== null && (
              <div><span className="text-gray-500">Age:</span> <span className="font-semibold">{age} yrs</span></div>
            )}
            {maid.maritalStatus && (
              <div><span className="text-gray-500">Status:</span> <span className="font-semibold">{maid.maritalStatus}</span></div>
            )}
            {maid.religion && (
              <div><span className="text-gray-500">Religion:</span> <span className="font-semibold">{maid.religion}</span></div>
            )}
            {maid.educationLevel && (
              <div className="col-span-2"><span className="text-gray-500">Education:</span> <span className="font-semibold">{maid.educationLevel}</span></div>
            )}
            {maid.nationality && (
              <div className="col-span-2 flex items-center gap-1">
                <span className="text-gray-500">Nationality:</span>
                <FlagCircle code={flagCode} />
                <span className="font-semibold">{maid.nationality}</span>
              </div>
            )}
          </div>
        </div>

        {/* Bio / remarks (blurred) */}
        {bioRaw && (
          <div className="px-4 py-3 border-b border-border/60">
            <p className="text-[10px] font-bold uppercase tracking-wide text-gray-500 mb-1.5">About</p>
            <p className="text-xs text-gray-700 leading-relaxed line-clamp-4 blur-[3px] select-none">
              {bioRaw}
            </p>
          </div>
        )}

        {/* Employment History */}
        {empHistory.length > 0 && (
          <div className="px-4 py-3 border-b border-border/60">
            <p className="text-[10px] font-bold uppercase tracking-wide text-gray-500 mb-1.5">Employment History</p>
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border border-gray-200 px-2 py-1 text-left font-semibold text-gray-600">From</th>
                  <th className="border border-gray-200 px-2 py-1 text-left font-semibold text-gray-600">To</th>
                  <th className="border border-gray-200 px-2 py-1 text-left font-semibold text-gray-600">Country / Details</th>
                </tr>
              </thead>
              <tbody>
                {empHistory.slice(0, 4).map((emp, idx) => {
                  const e = emp as Record<string, unknown>;
                  const from = String(e["from"] || e["From"] || e["startYear"] || e["startDate"] || "");
                  const to = String(e["to"] || e["To"] || e["endYear"] || e["endDate"] || "");
                  const country = String(e["country"] || e["Country"] || e["employer"] || e["location"] || "");
                  return (
                    <tr key={idx} className={idx % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                      <td className="border border-gray-200 px-2 py-1 text-gray-700">{from}</td>
                      <td className="border border-gray-200 px-2 py-1 text-gray-700">{to}</td>
                      <td className="border border-gray-200 px-2 py-1 text-gray-700 blur-[3px] select-none">{country || "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Skills Table */}
        {skillRows.length > 0 && (
          <div className="px-4 py-3 border-b border-border/60">
            <p className="text-[10px] font-bold uppercase tracking-wide text-gray-500 mb-1.5">Skills</p>
            <table className="w-full text-xs border-collapse">
              <tbody>
                {skillRows.map((skill, idx) => (
                  <>
                    <tr key={`name-${idx}`} className="bg-gray-100">
                      <td colSpan={2} className="border border-gray-200 px-2 py-1 font-semibold text-gray-700 text-center">
                        {skill.name}
                      </td>
                    </tr>
                    <tr key={`willing-${idx}`} className="bg-white">
                      <td className="border border-gray-200 px-2 py-1 text-gray-500 w-24">Willingness</td>
                      <td className="border border-gray-200 px-2 py-1">
                        {skill.willing ? (
                          <span className="text-emerald-600 font-bold text-sm">✓</span>
                        ) : (
                          <span className="text-red-400 font-bold text-sm">✗</span>
                        )}
                      </td>
                    </tr>
                    {skill.evaluation > 0 && (
                      <tr key={`eval-${idx}`} className="bg-white">
                        <td className="border border-gray-200 px-2 py-1 text-gray-500">Evaluation</td>
                        <td className="border border-gray-200 px-2 py-1">
                          <StarRating count={skill.evaluation} />
                        </td>
                      </tr>
                    )}
                  </>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Fallback work areas as skills if no structured skills */}
        {skillRows.length === 0 && Object.keys(maid.workAreas || {}).length > 0 && (
          <div className="px-4 py-3 border-b border-border/60">
            <p className="text-[10px] font-bold uppercase tracking-wide text-gray-500 mb-1.5">Skills</p>
            <table className="w-full text-xs border-collapse">
              <tbody>
                {Object.keys(maid.workAreas || {}).map((area, idx) => (
                  <>
                    <tr key={`wa-name-${idx}`} className="bg-gray-100">
                      <td colSpan={2} className="border border-gray-200 px-2 py-1 font-semibold text-gray-700 text-center">
                        {area}
                      </td>
                    </tr>
                    <tr key={`wa-willing-${idx}`} className="bg-white">
                      <td className="border border-gray-200 px-2 py-1 text-gray-500 w-24">Willingness</td>
                      <td className="border border-gray-200 px-2 py-1">
                        <span className="text-emerald-600 font-bold text-sm">✓</span>
                      </td>
                    </tr>
                  </>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Bottom CTA */}
        <div className="px-4 py-4 text-center">
          <p className="text-[11px] text-gray-500 mb-3">
            Login to view full bio-data, contact details, and more photos.
          </p>
        </div>
      </div>
    </div>
  );
};

// ── Maid Hover Popup ──────────────────────────────────────────────────────────
const MaidHoverPopup = ({
  maid,
  anchorRef,
}: {
  maid: MaidProfile;
  anchorRef: React.RefObject<HTMLElement>;
}) => {
  const popupRef = useRef<HTMLDivElement>(null);
  const [style, setStyle] = useState<React.CSSProperties>({ visibility: "hidden" });

  const details = useMemo(() => getMaidPopupDetails(maid), [maid]);
  const age = calculateAge(maid.dateOfBirth);
  const flagCode = getNationalityCode(maid.nationality);

  useEffect(() => {
    const anchor = anchorRef.current;
    const popup = popupRef.current;
    if (!anchor || !popup) return;

    const rect = anchor.getBoundingClientRect();
    const popupWidth = 260;
    const popupHeight = popup.offsetHeight || 360;
    const gap = 8;
    const viewportW = window.innerWidth;
    const viewportH = window.innerHeight;
    const scrollY = window.scrollY;
    const scrollX = window.scrollX;

    let left = rect.right + scrollX + gap;
    if (left + popupWidth > scrollX + viewportW - 8) {
      left = rect.left + scrollX - popupWidth - gap;
    }
    left = Math.max(scrollX + 8, left);

    let top = rect.top + scrollY;
    if (top + popupHeight > scrollY + viewportH - 8) {
      top = scrollY + viewportH - popupHeight - 8;
    }
    top = Math.max(scrollY + 8, top);

    setStyle({
      position: "absolute",
      top,
      left,
      width: popupWidth,
      zIndex: 9999,
      visibility: "visible",
    });
  }, [anchorRef]);

  return (
    <div
      ref={popupRef}
      style={style}
      className="pointer-events-none rounded-xl border border-border bg-white shadow-2xl overflow-hidden"
    >
      <div className="bg-primary px-3 py-2">
        <p className="text-xs font-bold text-primary-foreground leading-tight line-clamp-1">
          {maid.nationality ? `${maid.nationality} maid` : "Maid"}{maid.fullName ? `: ${maid.fullName}` : ""}
        </p>
        {maid.referenceCode && (
          <p className="text-[10px] text-primary-foreground/70 font-mono mt-0.5">{maid.referenceCode}</p>
        )}
      </div>

      <div className="p-3 space-y-2">
        <div className="flex items-center gap-1.5 flex-wrap">
          {maid.type && (
            <span className={`inline-block px-1.5 py-px text-[9px] font-bold border rounded ${getMaidTypeBadgeClass(maid.type)}`}>
              {getTypeLabel(maid.type)}
            </span>
          )}
          {maid.nationality && (
            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-foreground">
              <FlagCircle code={flagCode} />
              {maid.nationality}
            </span>
          )}
        </div>

        <div className="border-t border-border/60" />

        <div className="grid grid-cols-2 gap-x-2 gap-y-1">
          {details.englishLevel && <PopupRow label="English" value={details.englishLevel} />}
          {details.height && <PopupRow label="Height" value={`${details.height} cm`} />}
          {details.weight && <PopupRow label="Weight" value={`${details.weight} kg`} />}
          {age !== null && <PopupRow label="Age" value={`${age} yrs`} />}
          {maid.maritalStatus && <PopupRow label="Status" value={maid.maritalStatus} />}
          {maid.religion && <PopupRow label="Religion" value={maid.religion} />}
          {maid.educationLevel && <PopupRow label="Education" value={maid.educationLevel} />}
          {details.willingOffDays && <PopupRow label="Off-days" value="Willing ✓" valueClass="text-emerald-600 font-semibold" />}
        </div>

        {details.langs.length > 0 && (
          <>
            <div className="border-t border-border/60" />
            <div>
              <p className="text-[9px] font-bold uppercase tracking-wide text-muted-foreground mb-1">Languages</p>
              <div className="space-y-0.5">
                {details.langs.slice(0, 4).map((l) => (
                  <p key={l} className="text-[10px] text-foreground leading-tight">{l}</p>
                ))}
              </div>
            </div>
          </>
        )}

        {details.uniqueExp.length > 0 && (
          <>
            <div className="border-t border-border/60" />
            <div>
              <p className="text-[9px] font-bold uppercase tracking-wide text-muted-foreground mb-1">Experience</p>
              <p className="text-[10px] text-foreground">{details.uniqueExp.join(", ")}</p>
            </div>
          </>
        )}

        {details.workAreas.length > 0 && (
          <>
            <div className="border-t border-border/60" />
            <div>
              <p className="text-[9px] font-bold uppercase tracking-wide text-muted-foreground mb-1">Can handle</p>
              <p className="text-[10px] text-foreground leading-snug line-clamp-2">
                {details.workAreas.slice(0, 5).join(" · ")}
              </p>
            </div>
          </>
        )}

        {details.bioRaw && (
          <>
            <div className="border-t border-border/60" />
            <p className="text-[10px] text-muted-foreground leading-snug line-clamp-3 italic">
              {details.bioRaw.slice(0, 160)}{details.bioRaw.length > 160 ? "…" : ""}
            </p>
          </>
        )}
      </div>
    </div>
  );
};

const PopupRow = ({
  label,
  value,
  valueClass = "",
}: {
  label: string;
  value: string;
  valueClass?: string;
}) => (
  <div className="flex flex-col">
    <span className="text-[9px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</span>
    <span className={`text-[10px] text-foreground leading-tight line-clamp-1 ${valueClass}`}>{value}</span>
  </div>
);

// ── Types ─────────────────────────────────────────────────────────────────────
type ClientDraft = {
  keyword: string;
  agencyPreference: string;
  biodataCreatedWithin: string;
  maidType: string;
  willingOffDays: boolean;
  hasChildren: boolean;
  withVideo: boolean;
  natFilipino: boolean; natIndonesian: boolean; natMyanmar: boolean; natIndian: boolean;
  natSriLankan: boolean; natCambodian: boolean; natBangladeshi: boolean; natOthers: boolean;
  natNoPreference: boolean;
  expHomeCountry: boolean; expSingapore: boolean; expMalaysia: boolean; expHongKong: boolean;
  expTaiwan: boolean; expMiddleEast: boolean; expOtherCountries: boolean; expNoPreference: boolean;
  dutyCareInfant: boolean; dutyCareYoungChildren: boolean; dutyCareElderlyDisabled: boolean;
  dutyCooking: boolean; dutyGeneralHousekeeping: boolean; dutyNoPreference: boolean;
  eduCollege: boolean; eduHighSchool: boolean; eduSecondary: boolean; eduPrimary: boolean;
  eduNoPreference: boolean;
  langEnglish: boolean; langMandarin: boolean; langBahasaIndonesia: boolean;
  langHindi: boolean; langTamil: boolean; langNoPreference: boolean;
  age21to25: boolean; age26to30: boolean; age31to35: boolean; age36to40: boolean;
  age41above: boolean; ageNoPreference: boolean;
  marSingle: boolean; marMarried: boolean; marWidowed: boolean; marDivorced: boolean;
  marSeparated: boolean; marNoPreference: boolean;
  height150below: boolean; height151to155: boolean; height156to160: boolean;
  height161above: boolean; heightNoPreference: boolean;
  relFreeThinker: boolean; relChristian: boolean; relCatholic: boolean; relBuddhist: boolean;
  relMuslim: boolean; relHindu: boolean; relSikh: boolean; relOthers: boolean;
  relNoPreference: boolean;
};

type SidebarFilters = {
  keyword: string;
  maidType: string;
  willingOffDays: boolean;
  nationality: string;
  language: string;
};

type MaidSearchPageProps = {
  basePath?: string;
  loginPath?: string;
  embedded?: boolean;
};

// ── Constants ─────────────────────────────────────────────────────────────────
const MAID_TYPES = ["New Maid", "Transfer Maid", "Ex-Singapore Maid"] as const;
const PAGE_SIZE = 18;

const INDIAN_SUBCATEGORY_KEYS = new Set(["mizoram", "darjeeling", "manipur", "punjabi"]);

const NATIONALITY_LINKS = [
  "Most Recent Maid in 3 days",
  "English Speaking Maid",
  "Mandarin Speaking Maid",
  "Hokkien/Cantonese Speaking",
  "New Maid",
  "Transfer Maid",
  "Ex-Singapore Maid",
  "Filipino Maid",
  "Indonesian Maid",
  "Myanmar Maid",
  "Indian Maid",
  "Mizoram Maid",
  "Darjeeling Maid",
  "Manipur Maid",
  "Punjabi Maid",
  "Sri Lankan Maid",
  "Cambodian Maid",
  "Bangladeshi Maid",
] as const;

const QUICK_LINKS = {
  mostRecent3Days: "Most Recent Maid in 3 days",
  english: "English Speaking Maid",
  mandarin: "Mandarin Speaking Maid",
  hokkienCantonese: "Hokkien/Cantonese Speaking",
  newMaid: "New Maid",
  transferMaid: "Transfer Maid",
  exSingapore: "Ex-Singapore Maid",
  filipino: "Filipino Maid",
  indonesian: "Indonesian Maid",
  myanmar: "Myanmar Maid",
  indian: "Indian Maid",
  mizoram: "Mizoram Maid",
  darjeeling: "Darjeeling Maid",
  manipur: "Manipur Maid",
  punjabi: "Punjabi Maid",
  sriLankan: "Sri Lankan Maid",
  cambodian: "Cambodian Maid",
  bangladeshi: "Bangladeshi Maid",
} as const;

type QuickLinkKey = keyof typeof QUICK_LINKS;

const QUICK_LINKS_BY_LABEL = Object.fromEntries(
  Object.entries(QUICK_LINKS).map(([k, v]) => [v, k])
) as Record<string, QuickLinkKey>;

const defaultSidebarFilters: SidebarFilters = {
  keyword: "",
  maidType: "",
  willingOffDays: false,
  nationality: "No Preference",
  language: "No Preference",
};

// ── Filter helpers ────────────────────────────────────────────────────────────
const parseAdvancedFilters = (searchParams: URLSearchParams): ClientDraft | null => {
  const raw = searchParams.get("filters");
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    return parsed && typeof parsed === "object" ? (parsed as ClientDraft) : null;
  } catch {
    return null;
  }
};

const deriveSidebarFilters = (
  searchParams: URLSearchParams,
  adv: ClientDraft | null
): SidebarFilters => ({
  keyword: searchParams.get("q") || adv?.keyword || "",
  maidType: searchParams.get("type") || adv?.maidType || "",
  willingOffDays: searchParams.get("offDays") === "true" || Boolean(adv?.willingOffDays),
  nationality:
    searchParams.get("nationality") ||
    (adv?.natFilipino ? "Filipino" :
     adv?.natIndonesian ? "Indonesian" :
     adv?.natMyanmar ? "Myanmar" :
     adv?.natIndian ? "Indian" :
     adv?.natSriLankan ? "Sri Lankan" :
     adv?.natCambodian ? "Cambodian" :
     adv?.natBangladeshi ? "Bangladeshi" :
     adv?.natOthers ? "Others" : "No Preference"),
  language:
    searchParams.get("language") ||
    (adv?.langEnglish ? "English" :
     adv?.langMandarin ? "Mandarin" :
     adv?.langBahasaIndonesia ? "Bahasa Indonesia / Malay" :
     adv?.langHindi ? "Hindi" :
     adv?.langTamil ? "Tamil" : "No Preference"),
});

// ── Core filter engine ────────────────────────────────────────────────────────
const normalizeStr = (s: unknown) => String(s || "").toLowerCase().trim();

const matchesLanguageSkill = (maid: MaidProfile, lang: string) => {
  const skills = Object.entries(maid.languageSkills || {})
    .filter(([, lvl]) => {
      const l = normalizeStr(lvl);
      return l && l !== "zero" && l !== "none";
    })
    .map(([k]) => k.toLowerCase());
  const t = lang.toLowerCase();
  if (t === "mandarin") return skills.some((s) => s.includes("mandarin") || s.includes("chinese"));
  if (t === "bahasa" || t.includes("bahasa") || t.includes("malay") || t.includes("indonesia"))
    return skills.some((s) => s.includes("bahasa") || s.includes("malay") || s.includes("indonesia"));
  return skills.some((s) => s.includes(t));
};

const matchesHeight = (maid: MaidProfile, draft: ClientDraft): boolean => {
  if (draft.heightNoPreference) return true;
  const raw = parseFloat(String(maid.height || "0").replace(/[^\d.]/g, ""));
  if (!raw) return true;
  if (draft.height150below && raw <= 150) return true;
  if (draft.height151to155 && raw >= 151 && raw <= 155) return true;
  if (draft.height156to160 && raw >= 156 && raw <= 160) return true;
  if (draft.height161above && raw >= 161) return true;
  return false;
};

const matchesAge = (maid: MaidProfile, draft: ClientDraft): boolean => {
  if (draft.ageNoPreference) return true;
  const age = calculateAge(maid.dateOfBirth);
  if (age === null) return true;
  if (draft.age21to25 && age >= 21 && age <= 25) return true;
  if (draft.age26to30 && age >= 26 && age <= 30) return true;
  if (draft.age31to35 && age >= 31 && age <= 35) return true;
  if (draft.age36to40 && age >= 36 && age <= 40) return true;
  if (draft.age41above && age >= 41) return true;
  return false;
};

const matchesEducation = (maid: MaidProfile, draft: ClientDraft): boolean => {
  if (draft.eduNoPreference) return true;
  const edu = normalizeStr(maid.educationLevel);
  if (draft.eduCollege && (edu.includes("college") || edu.includes("degree") || edu.includes("bachelor") || edu.includes("university"))) return true;
  if (draft.eduHighSchool && (edu.includes("high school") || edu.includes("senior high"))) return true;
  if (draft.eduSecondary && (edu.includes("secondary") || edu.includes("junior high") || edu.includes("middle school"))) return true;
  if (draft.eduPrimary && (edu.includes("primary") || edu.includes("elementary"))) return true;
  return false;
};

const matchesReligion = (maid: MaidProfile, draft: ClientDraft): boolean => {
  if (draft.relNoPreference) return true;
  const rel = normalizeStr(maid.religion);
  if (draft.relFreeThinker && (rel.includes("free") || rel.includes("none") || rel.includes("atheist") || rel.includes("agnostic"))) return true;
  if (draft.relChristian && rel.includes("christian") && !rel.includes("catholic")) return true;
  if (draft.relCatholic && rel.includes("catholic")) return true;
  if (draft.relBuddhist && rel.includes("buddh")) return true;
  if (draft.relMuslim && (rel.includes("muslim") || rel.includes("islam"))) return true;
  if (draft.relHindu && rel.includes("hindu")) return true;
  if (draft.relSikh && rel.includes("sikh")) return true;
  if (draft.relOthers) return true;
  return false;
};

const matchesMarital = (maid: MaidProfile, draft: ClientDraft): boolean => {
  if (draft.marNoPreference) return true;
  const mar = normalizeStr(maid.maritalStatus);
  if (draft.marSingle && mar.includes("single")) return true;
  if (draft.marMarried && mar.includes("married")) return true;
  if (draft.marWidowed && mar.includes("widow")) return true;
  if (draft.marDivorced && mar.includes("divorc")) return true;
  if (draft.marSeparated && mar.includes("separat")) return true;
  return false;
};

const matchesNationality = (maid: MaidProfile, draft: ClientDraft): boolean => {
  if (draft.natNoPreference) return true;
  const nat = normalizeStr(maid.nationality);
  if (draft.natFilipino && (nat.includes("filip") || nat.includes("pinoy"))) return true;
  if (draft.natIndonesian && nat.includes("indo")) return true;
  if (draft.natMyanmar && (nat.includes("myan") || nat.includes("burm"))) return true;
  if (draft.natIndian && nat.includes("indian")) return true;
  if (draft.natSriLankan && (nat.includes("sri") || nat.includes("lanka"))) return true;
  if (draft.natCambodian && nat.includes("cambod")) return true;
  if (draft.natBangladeshi && nat.includes("bangla")) return true;
  if (draft.natOthers) {
    const knownNats = ["filip","pinoy","indo","myan","burm","indian","sri","lanka","cambod","bangla"];
    return !knownNats.some((k) => nat.includes(k));
  }
  return false;
};

const matchesExperience = (maid: MaidProfile, draft: ClientDraft): boolean => {
  if (draft.expNoPreference) return true;
  const expText = (Array.isArray(maid.employmentHistory)
    ? maid.employmentHistory.map((e: Record<string, unknown>) =>
        Object.values(e).map(String).join(" "))
    : []
  ).join(" ").toLowerCase();

  if (draft.expSingapore && expText.includes("singapore")) return true;
  if (draft.expMalaysia && expText.includes("malaysia")) return true;
  if (draft.expHongKong && (expText.includes("hong kong") || expText.includes("hongkong"))) return true;
  if (draft.expTaiwan && expText.includes("taiwan")) return true;
  if (draft.expMiddleEast && (
    expText.includes("dubai") || expText.includes("uae") || expText.includes("saudi") ||
    expText.includes("qatar") || expText.includes("kuwait") || expText.includes("middle east") ||
    expText.includes("bahrain") || expText.includes("oman")
  )) return true;
  if (draft.expHomeCountry) return true;
  if (draft.expOtherCountries) return true;
  return false;
};

const matchesDuties = (maid: MaidProfile, draft: ClientDraft): boolean => {
  if (draft.dutyNoPreference) return true;
  const workAreaKeys = Object.keys(maid.workAreas || {}).join(" ").toLowerCase();
  const skillsText = Object.values(
    (maid.skillsPreferences as Record<string, unknown>) || {}
  ).map(String).join(" ").toLowerCase();
  const dutyText = workAreaKeys + " " + skillsText;

  if (draft.dutyCareInfant && (dutyText.includes("infant") || dutyText.includes("baby") || dutyText.includes("newborn"))) return true;
  if (draft.dutyCareYoungChildren && (dutyText.includes("child") || dutyText.includes("kid") || dutyText.includes("toddler"))) return true;
  if (draft.dutyCareElderlyDisabled && (dutyText.includes("elder") || dutyText.includes("elderly") || dutyText.includes("disabled") || dutyText.includes("老人"))) return true;
  if (draft.dutyCooking && dutyText.includes("cook")) return true;
  if (draft.dutyGeneralHousekeeping && (dutyText.includes("housekeep") || dutyText.includes("household") || dutyText.includes("cleaning") || dutyText.includes("general"))) return true;
  return false;
};

const matchesBiodataAge = (maid: MaidProfile, draft: ClientDraft): boolean => {
  if (!draft.biodataCreatedWithin || draft.biodataCreatedWithin === "No Preference") return true;
  const raw = String(maid.createdAt || maid.updatedAt || "").trim();
  if (!raw) return true;
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return true;
  const now = new Date();
  const cutoff = new Date(now);
  switch (draft.biodataCreatedWithin) {
    case "1 week":   cutoff.setDate(now.getDate() - 7); break;
    case "2 weeks":  cutoff.setDate(now.getDate() - 14); break;
    case "1 month":  cutoff.setMonth(now.getMonth() - 1); break;
    case "3 months": cutoff.setMonth(now.getMonth() - 3); break;
    case "6 months": cutoff.setMonth(now.getMonth() - 6); break;
    case "1 year":   cutoff.setFullYear(now.getFullYear() - 1); break;
    default: return true;
  }
  return date >= cutoff;
};

const hasPhoto = (maid: MaidProfile): boolean => {
  if (Array.isArray(maid.photoDataUrls) && maid.photoDataUrls.length > 0) {
    const hasValidUrl = maid.photoDataUrls.some(
      (url) => typeof url === "string" && url.trim().length > 0
    );
    if (hasValidUrl) return true;
  }
  return typeof maid.photoDataUrl === "string" && maid.photoDataUrl.trim().length > 0;
};

const filterMaidsByDraft = (maids: MaidProfile[], draft: ClientDraft): MaidProfile[] => {
  return maids.filter((maid) => {
    if (!hasPhoto(maid)) return false;

    if (draft.keyword.trim()) {
      const kw = draft.keyword.trim().toLowerCase();
      const searchable = [
        maid.fullName, maid.referenceCode, maid.nationality,
        maid.type, maid.religion, maid.maritalStatus,
        getMaidCategory(maid),
        ...Object.keys(maid.workAreas || {}),
      ].map(normalizeStr).join(" ");
      if (!searchable.includes(kw)) return false;
    }

    if (draft.maidType) {
      const t = normalizeStr(maid.type);
      const wantNew = draft.maidType === "New Maid";
      const wantTransfer = draft.maidType === "Transfer Maid";
      const wantExSg = draft.maidType === "Ex-Singapore Maid";
      if (wantNew && !t.includes("new")) return false;
      if (wantTransfer && !t.includes("transfer")) return false;
      if (wantExSg && !(t.includes("ex-singapore") || t.includes("ex singapore") || t.includes("exsg"))) return false;
    }

    if (draft.willingOffDays) {
      const sp = (maid.skillsPreferences as Record<string, unknown>) || {};
      const otherInfo = (sp.otherInformation as Record<string, boolean>) || {};
      const willingKeys = [
        "Can work on off-days with compensation?",
        "Willing to work on off-days with compensation?",
        "Willing to work on off-days with  compensation?",
      ];
      const isWilling = willingKeys.some((k) => Boolean(otherInfo[k]));
      if (!isWilling) return false;
    }

    if (draft.withVideo && !maid.videoDataUrl) return false;
    if (!matchesBiodataAge(maid, draft)) return false;
    if (!matchesNationality(maid, draft)) return false;
    if (!matchesExperience(maid, draft)) return false;
    if (!matchesDuties(maid, draft)) return false;
    if (!matchesEducation(maid, draft)) return false;

    if (!draft.langNoPreference) {
      const langPassed =
        (draft.langEnglish && matchesLanguageSkill(maid, "english")) ||
        (draft.langMandarin && matchesLanguageSkill(maid, "mandarin")) ||
        (draft.langBahasaIndonesia && matchesLanguageSkill(maid, "bahasa")) ||
        (draft.langHindi && matchesLanguageSkill(maid, "hindi")) ||
        (draft.langTamil && matchesLanguageSkill(maid, "tamil"));
      if (!langPassed) return false;
    }

    if (!matchesAge(maid, draft)) return false;
    if (!matchesMarital(maid, draft)) return false;
    if (!matchesHeight(maid, draft)) return false;
    if (!matchesReligion(maid, draft)) return false;

    return true;
  });
};

// ── Quick-link matcher ────────────────────────────────────────────────────────
const normalizeNationality = (value: string) => {
  const lower = value.trim().toLowerCase();
  if (lower.includes("filip")) return "Filipino";
  if (lower.includes("indo")) return "Indonesian";
  if (lower.includes("myan")) return "Myanmar";
  if (lower.includes("indian")) return "Indian";
  if (lower.includes("sri") || lower.includes("lanka")) return "Sri Lankan";
  if (lower.includes("cambod")) return "Cambodian";
  if (lower.includes("bangla")) return "Bangladeshi";
  return "Others";
};

const matchesIndianSubcategory = (maid: MaidProfile, term: string): boolean => {
  const nat = normalizeStr(maid.nationality);
  const category = normalizeStr(getMaidCategory(maid));
  const agencyContact = (maid.agencyContact as Record<string, unknown>) || {};
  const introduction = (maid.introduction as Record<string, unknown>) || {};
  const skillsPreferences = (maid.skillsPreferences as Record<string, unknown>) || {};

  const allCategoryText = [
    category,
    normalizeStr(agencyContact["indianMaidCategory"]),
    normalizeStr(introduction["indianMaidCategory"]),
    normalizeStr(skillsPreferences["indianMaidCategory"]),
  ].join(" ");

  return nat.includes(term) || allCategoryText.includes(term);
};

const matchesQuickLink = (maid: MaidProfile, quickLink: QuickLinkKey) => {
  switch (quickLink) {
    case "mostRecent3Days": {
      const raw = String(maid.createdAt || maid.updatedAt || "").trim();
      if (!raw) return false;
      const date = new Date(raw);
      if (Number.isNaN(date.getTime())) return false;
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - 3);
      return date >= cutoff;
    }
    case "english": return matchesLanguageSkill(maid, "english");
    case "mandarin": return matchesLanguageSkill(maid, "mandarin");
    case "hokkienCantonese":
      return matchesLanguageSkill(maid, "hokkien") || matchesLanguageSkill(maid, "cantonese");
    case "newMaid": return normalizeStr(maid.type).includes("new");
    case "transferMaid": return normalizeStr(maid.type).includes("transfer");
    case "exSingapore":
      return normalizeStr(maid.type).includes("ex-singapore") || normalizeStr(maid.type).includes("ex singapore");
    case "filipino": return normalizeNationality(String(maid.nationality || "")) === "Filipino";
    case "indonesian": return normalizeNationality(String(maid.nationality || "")) === "Indonesian";
    case "myanmar": return normalizeNationality(String(maid.nationality || "")) === "Myanmar";
    case "indian": return normalizeNationality(String(maid.nationality || "")) === "Indian";
    case "mizoram":    return matchesIndianSubcategory(maid, "mizoram");
    case "darjeeling": return matchesIndianSubcategory(maid, "darjeeling");
    case "manipur":    return matchesIndianSubcategory(maid, "manipur");
    case "punjabi":    return matchesIndianSubcategory(maid, "punjabi");
    case "sriLankan":  return normalizeNationality(String(maid.nationality || "")) === "Sri Lankan";
    case "cambodian":  return normalizeNationality(String(maid.nationality || "")) === "Cambodian";
    case "bangladeshi":return normalizeNationality(String(maid.nationality || "")) === "Bangladeshi";
    default: return true;
  }
};

// ── UI helpers ────────────────────────────────────────────────────────────────
const getPrimaryPhoto = (maid: MaidProfile) =>
  Array.isArray(maid.photoDataUrls) && maid.photoDataUrls.length > 0
    ? maid.photoDataUrls[0]
    : maid.photoDataUrl || "";

const getTypeLabel = (type: string) => {
  const lower = type.toLowerCase();
  if (lower.includes("new")) return "NEW";
  if (lower.includes("transfer")) return "TRANSFER";
  if (lower.includes("ex")) return "EX-SG";
  return type.toUpperCase();
};

const getMaidTypeBadgeClass = (type?: string) => {
  const t = (type || "").toLowerCase();
  if (t.includes("new")) return "bg-emerald-50 text-emerald-700 border-emerald-200";
  if (t.includes("transfer")) return "bg-blue-50 text-blue-700 border-blue-200";
  return "bg-amber-50 text-amber-700 border-amber-200";
};

const pageNumbers = (current: number, total: number): (number | "...")[] => {
  if (total <= 10) return Array.from({ length: total }, (_, i) => i + 1);
  const pages: (number | "...")[] = [1];
  if (current > 3) pages.push("...");
  for (let i = Math.max(2, current - 1); i <= Math.min(total - 1, current + 1); i++)
    pages.push(i);
  if (current < total - 2) pages.push("...");
  pages.push(total);
  return pages;
};

// ── Active filter badge strip ────────────────────────────────────────────────
const ActiveFilterPill = ({ label, onRemove }: { label: string; onRemove?: () => void }) => (
  <span className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
    {label}
    {onRemove && (
      <button type="button" onClick={onRemove} className="ml-0.5 hover:text-destructive">
        <X className="h-2.5 w-2.5" />
      </button>
    )}
  </span>
);

// ── Locked maid card ──────────────────────────────────────────────────────────
const LockedMaidCard = ({
  maid,
  loginPath,
  onOpenModal,
}: {
  maid: MaidProfile;
  loginPath: string;
  onOpenModal: () => void;
}) => {
  const photo = getPrimaryPhoto(maid);
  const typeColorClass = getMaidTypeBadgeClass(maid.type);
  return (
    <article
      className="group flex flex-col overflow-hidden border bg-card shadow-sm transition-all hover:shadow-md hover:border-primary/50 cursor-pointer"
      onClick={onOpenModal}
    >
      <div className="relative w-full select-none pointer-events-none overflow-hidden">
        {photo ? (
          <img src={photo} alt="Maid profile" loading="lazy" decoding="async"
            className="block w-full h-auto"
            style={{ aspectRatio: "3/4", objectFit: "contain", objectPosition: "top center",
              minHeight: 130, background: "#fff", filter: "blur(10px)", opacity: 0.9, transform: "scale(1.05)" }}
          />
        ) : (
          <div className="w-full flex items-center justify-center bg-gray-100"
            style={{ aspectRatio: "3/4", minHeight: 130 }}>
            <svg className="h-10 w-10 text-gray-300" fill="none" viewBox="0 0 24 24"
              stroke="currentColor" strokeWidth={1}>
              <path strokeLinecap="round" strokeLinejoin="round"
                d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
            </svg>
          </div>
        )}
        {maid.type && (
          <div className="absolute top-1.5 left-1.5" style={{ filter: "blur(3px)" }}>
            <span className={`inline-block px-1.5 py-px text-[9px] font-semibold border bg-white/90 ${typeColorClass}`}>
              {getTypeLabel(maid.type)}
            </span>
          </div>
        )}
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-1">
          <div className="rounded-full bg-black/40 p-2 backdrop-blur-sm">
            <LockIcon className="h-4 w-4 text-white" />
          </div>
        </div>
      </div>
      <div className="flex flex-col gap-1 p-2.5 flex-1 bg-white">
        <div className="h-2.5 w-3/4 bg-gray-200 rounded blur-[3px] select-none" />
        <div className="mt-1 h-2 w-1/2 bg-gray-200 rounded blur-[3px] select-none" />
        <div className="mt-1 flex gap-1">
          <div className="h-4 w-12 bg-gray-200 rounded blur-[3px] select-none" />
          <div className="h-4 w-8 bg-gray-200 rounded blur-[3px] select-none" />
        </div>
      </div>
      <div className="px-2 pb-2 pt-0">
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onOpenModal(); }}
          className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-primary px-2 py-2 text-[10px] font-bold uppercase tracking-wide text-primary-foreground transition-colors hover:bg-primary/90 active:bg-primary/80 pointer-events-auto"
        >
          <LockIcon className="h-3 w-3" />
          Log in to view
        </button>
      </div>
    </article>
  );
};

// ── Real maid card ────────────────────────────────────────────────────────────
const MaidCard = ({
  maid, isShortlisted, onToggleShortlist, onNavigate, isLoggedIn, loginPath, showCategory,
}: {
  maid: MaidProfile; isShortlisted: boolean; onToggleShortlist: (ref: string) => void;
  onNavigate?: () => void; isLoggedIn: boolean; loginPath: string;
  showCategory?: boolean;
}) => {
  const [lockedModalOpen, setLockedModalOpen] = useState(false);

  if (!isLoggedIn) {
    return (
      <>
        <LockedMaidCard
          maid={maid}
          loginPath={loginPath}
          onOpenModal={() => setLockedModalOpen(true)}
        />
        {lockedModalOpen && (
          <LockedMaidModal
            maid={maid}
            loginPath={loginPath}
            onClose={() => setLockedModalOpen(false)}
          />
        )}
      </>
    );
  }

  const photo = getPrimaryPhoto(maid);
  const age = calculateAge(maid.dateOfBirth);
  const flagCode = getNationalityCode(maid.nationality);
  const typeColorClass = getMaidTypeBadgeClass(maid.type);
  const experienceBucket = getExperienceBucket(maid);
  const category = getMaidCategory(maid);
  const displayLabel = showCategory && category ? category : (maid.nationality || "");

  const [hovered, setHovered] = useState(false);
  const hoverTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cardRef = useRef<HTMLElement>(null);

  const handleMouseEnter = () => {
    hoverTimerRef.current = setTimeout(() => setHovered(true), 300);
  };

  const handleMouseLeave = () => {
    if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
    setHovered(false);
  };

  return (
    <>
      <article
        ref={cardRef}
        className="group flex flex-col overflow-hidden border bg-card shadow-sm transition-all hover:shadow-md hover:border-primary/50 cursor-pointer"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <div className="relative w-full bg-white overflow-hidden">
          <Link to={`/maids/${encodeURIComponent(maid.referenceCode)}`} onClick={onNavigate}>
            {photo ? (
              <img src={photo} alt={maid.fullName}
                className="block w-full h-auto"
                style={{ aspectRatio: "3/4", objectFit: "contain", objectPosition: "top center",
                  minHeight: 130, background: "#fff" }}
                loading="lazy" decoding="async"
              />
            ) : (
              <div className="w-full flex items-center justify-center bg-gray-50"
                style={{ aspectRatio: "3/4", minHeight: 130 }}>
                <svg className="h-8 w-8 text-gray-300" fill="none" viewBox="0 0 24 24"
                  stroke="currentColor" strokeWidth={1}>
                  <path strokeLinecap="round" strokeLinejoin="round"
                    d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                </svg>
              </div>
            )}
          </Link>
          {maid.type && (
            <div className="absolute top-1.5 left-1.5">
              <span className={`inline-block px-1.5 py-px text-[9px] font-semibold border bg-white/90 backdrop-blur-sm ${typeColorClass}`}>
                {getTypeLabel(maid.type)}
              </span>
            </div>
          )}
          <button
            onClick={(e) => { e.preventDefault(); onToggleShortlist(maid.referenceCode); }}
            className={`absolute bottom-0 left-0 right-0 flex items-center justify-center gap-1 py-1.5 text-[9px] font-bold uppercase tracking-wide text-white transition-all ${
              isShortlisted ? "bg-amber-500" : "bg-black/60 opacity-0 group-hover:opacity-100"
            }`}
          >
            <Star className={`h-2.5 w-2.5 ${isShortlisted ? "fill-white" : ""}`} />
            {isShortlisted ? "Shortlisted" : "Shortlist"}
          </button>
        </div>

        <div className="flex flex-col gap-0.5 p-2.5 flex-1 bg-white">
          <h3 className="text-xs font-bold text-black line-clamp-1 leading-tight">
            {maid.fullName || "Unnamed maid"}
          </h3>
          {maid.referenceCode && (
            <p className="text-[9px] text-gray-600 font-mono leading-tight">{maid.referenceCode}</p>
          )}
          {displayLabel && (
            <p className="inline-flex items-center gap-1 text-[10px] leading-tight mt-0.5">
              <FlagCircle code={flagCode} />
              <span className="font-semibold text-black">{displayLabel}</span>
            </p>
          )}
          <div className="my-1 border-t border-gray-100" />
          <div className="flex items-center gap-1.5 text-[10px] text-gray-500 leading-tight">
            {age !== null && <span className="font-medium text-black">({age}) yrs</span>}
            {age !== null && maid.maritalStatus && <span className="text-gray-300">·</span>}
            {maid.maritalStatus && <span className="truncate text-black">{maid.maritalStatus}</span>}
          </div>
          {maid.religion && (
            <p className="text-[9px] text-black leading-tight line-clamp-1">{maid.religion}</p>
          )}
          {experienceBucket && (
            <p className="text-[9px] text-black leading-tight mt-0.5 line-clamp-1">{experienceBucket}</p>
          )}
        </div>
      </article>

      {hovered && cardRef.current && (
        <MaidHoverPopup maid={maid} anchorRef={cardRef as React.RefObject<HTMLElement>} />
      )}
    </>
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

  const [filters, setFilters] = useState<SidebarFilters>(() =>
    deriveSidebarFilters(searchParams, advancedFilters)
  );
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

  const handleToggleShortlist = (ref: string) => {
    setShortlistRefs(toggleShortlistRef(ref));
  };

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
      } finally {
        setIsLoading(false);
      }
    };
    void load();
    return () => controller.abort();
  }, []);

  useEffect(() => {
    const adv = parseAdvancedFilters(searchParams);
    setFilters(deriveSidebarFilters(searchParams, adv));
    setPage(1);
  }, [searchParams]);

  const filteredMaids = useMemo(() => {
    const draft: ClientDraft = advancedFilters ?? {
      keyword: filters.keyword,
      agencyPreference: "No Preference",
      biodataCreatedWithin: "No Preference",
      maidType: filters.maidType,
      willingOffDays: filters.willingOffDays,
      hasChildren: false,
      withVideo: false,
      natFilipino: filters.nationality === "Filipino",
      natIndonesian: filters.nationality === "Indonesian",
      natMyanmar: filters.nationality === "Myanmar",
      natIndian: filters.nationality === "Indian",
      natSriLankan: filters.nationality === "Sri Lankan",
      natCambodian: filters.nationality === "Cambodian",
      natBangladeshi: filters.nationality === "Bangladeshi",
      natOthers: filters.nationality === "Others",
      natNoPreference: filters.nationality === "No Preference",
      expHomeCountry: false, expSingapore: false, expMalaysia: false, expHongKong: false,
      expTaiwan: false, expMiddleEast: false, expOtherCountries: false, expNoPreference: true,
      dutyCareInfant: false, dutyCareYoungChildren: false, dutyCareElderlyDisabled: false,
      dutyCooking: false, dutyGeneralHousekeeping: false, dutyNoPreference: true,
      eduCollege: false, eduHighSchool: false, eduSecondary: false, eduPrimary: false, eduNoPreference: true,
      langEnglish: filters.language === "English",
      langMandarin: filters.language === "Mandarin",
      langBahasaIndonesia: filters.language === "Bahasa Indonesia / Malay",
      langHindi: filters.language === "Hindi",
      langTamil: filters.language === "Tamil",
      langNoPreference: filters.language === "No Preference",
      age21to25: false, age26to30: false, age31to35: false, age36to40: false,
      age41above: false, ageNoPreference: true,
      marSingle: false, marMarried: false, marWidowed: false, marDivorced: false,
      marSeparated: false, marNoPreference: true,
      height150below: false, height151to155: false, height156to160: false,
      height161above: false, heightNoPreference: true,
      relFreeThinker: false, relChristian: false, relCatholic: false, relBuddhist: false,
      relMuslim: false, relHindu: false, relSikh: false, relOthers: false, relNoPreference: true,
    };

    let result = filterMaidsByDraft(allMaids, draft);
    if (quickLink) result = result.filter((m) => matchesQuickLink(m, quickLink));
    return result;
  }, [allMaids, advancedFilters, filters, quickLink]);

  const totalPages = Math.max(1, Math.ceil(filteredMaids.length / PAGE_SIZE));
  const pagedMaids = filteredMaids.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const pages = pageNumbers(page, totalPages);

  const shortlistedMaids = useMemo(
    () => shortlistRefs.map((ref) => allMaids.find((m) => m.referenceCode === ref))
      .filter((m): m is MaidProfile => Boolean(m)),
    [allMaids, shortlistRefs]
  );
  const missingShortlistRefs = useMemo(
    () => shortlistRefs.filter((ref) => !shortlistedMaids.some((m) => m.referenceCode === ref)),
    [shortlistRefs, shortlistedMaids]
  );

  const activeFilterCount = useMemo(() => {
    if (advancedFilters) {
      let count = 0;
      if (advancedFilters.keyword?.trim()) count++;
      if (advancedFilters.maidType) count++;
      if (advancedFilters.willingOffDays) count++;
      if (!advancedFilters.natNoPreference) count++;
      if (!advancedFilters.langNoPreference) count++;
      if (!advancedFilters.dutyNoPreference) count++;
      if (!advancedFilters.expNoPreference) count++;
      if (!advancedFilters.ageNoPreference) count++;
      if (!advancedFilters.marNoPreference) count++;
      if (!advancedFilters.eduNoPreference) count++;
      if (!advancedFilters.heightNoPreference) count++;
      if (!advancedFilters.relNoPreference) count++;
      if (advancedFilters.biodataCreatedWithin && advancedFilters.biodataCreatedWithin !== "No Preference") count++;
      return count;
    }
    let count = 0;
    if (filters.keyword.trim()) count++;
    if (filters.maidType) count++;
    if (filters.nationality !== "No Preference") count++;
    if (filters.language !== "No Preference") count++;
    if (filters.willingOffDays) count++;
    return count;
  }, [advancedFilters, filters]);

  const advancedFilterSummary = useMemo(() => {
    if (!advancedFilters) return [];
    const items: string[] = [];
    if (advancedFilters.keyword?.trim()) items.push(`"${advancedFilters.keyword.trim()}"`);
    if (advancedFilters.maidType) items.push(advancedFilters.maidType);
    const nats = [
      advancedFilters.natFilipino && "Filipino",
      advancedFilters.natIndonesian && "Indonesian",
      advancedFilters.natMyanmar && "Myanmar",
      advancedFilters.natIndian && "Indian",
      advancedFilters.natSriLankan && "Sri Lankan",
      advancedFilters.natCambodian && "Cambodian",
      advancedFilters.natBangladeshi && "Bangladeshi",
    ].filter(Boolean) as string[];
    if (nats.length) items.push(nats.join(" / "));
    const duties = [
      advancedFilters.dutyCareInfant && "Infant care",
      advancedFilters.dutyCareYoungChildren && "Young children",
      advancedFilters.dutyCareElderlyDisabled && "Elderly",
      advancedFilters.dutyCooking && "Cooking",
      advancedFilters.dutyGeneralHousekeeping && "Housekeeping",
    ].filter(Boolean) as string[];
    if (duties.length) items.push(duties.join(", "));
    const langs = [
      advancedFilters.langEnglish && "English",
      advancedFilters.langMandarin && "Mandarin",
      advancedFilters.langBahasaIndonesia && "Bahasa",
      advancedFilters.langHindi && "Hindi",
      advancedFilters.langTamil && "Tamil",
    ].filter(Boolean) as string[];
    if (langs.length) items.push(langs.join(" / "));
    const exps = [
      advancedFilters.expSingapore && "Singapore exp.",
      advancedFilters.expMalaysia && "Malaysia exp.",
      advancedFilters.expHongKong && "HK exp.",
      advancedFilters.expTaiwan && "Taiwan exp.",
      advancedFilters.expMiddleEast && "Middle East exp.",
    ].filter(Boolean) as string[];
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
    if (quickLink) next.set("quick", quickLink);
    setSearchParams(next);
    setMobileSidebarOpen(false);
  };

  const handleQuickLink = (label: string) => {
    const quickLinkKey = QUICK_LINKS_BY_LABEL[label] ?? "";
    const next = new URLSearchParams();
    if (quickLinkKey) next.set("quick", quickLinkKey);
    setFilters(defaultSidebarFilters);
    setPage(1);
    setSearchParams(next);
  };

  const handleReset = () => {
    setFilters(defaultSidebarFilters);
    setPage(1);
    setSearchParams(new URLSearchParams());
  };

  const selectCls = (active: boolean) =>
    `w-full rounded border px-2 py-1.5 text-sm transition-colors focus:outline-none focus:ring-1 focus:ring-primary/30 ${
      active ? "border-primary/50 bg-primary/5 font-medium text-foreground"
              : "border-border bg-background text-foreground"
    }`;

  const SidebarContent = () => (
    <div className="space-y-0">
      <div className="overflow-hidden rounded-lg border border-border bg-card shadow-sm">
        <div className="bg-primary px-3 py-2">
          <p className="text-sm font-bold text-primary-foreground">
            Maid <span className="font-normal opacity-90">Search</span>
          </p>
        </div>

        <div className="space-y-3 p-3">
          <input
            value={filters.keyword}
            onChange={(e) => setFilters((p) => ({ ...p, keyword: e.target.value }))}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            placeholder="Filipino maid, baby sitter, etc."
            className="w-full rounded border border-border bg-background px-2.5 py-1.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/20"
          />

          <div>
            <p className="mb-1.5 text-xs font-semibold text-foreground">Maid Type</p>
            <div className="space-y-1">
              {MAID_TYPES.map((type) => (
                <label key={type} className="flex cursor-pointer items-center gap-2">
                  <input type="radio" name="maidType" value={type}
                    checked={filters.maidType === type}
                    onChange={() => setFilters((p) => ({ ...p, maidType: p.maidType === type ? "" : type }))}
                    className="h-3.5 w-3.5 accent-primary"
                  />
                  <span className="text-sm text-foreground">{type}</span>
                </label>
              ))}
              <label className="flex cursor-pointer items-center gap-2">
                <input type="checkbox" checked={filters.willingOffDays}
                  onChange={() => setFilters((p) => ({ ...p, willingOffDays: !p.willingOffDays }))}
                  className="h-3.5 w-3.5 accent-primary"
                />
                <span className="text-sm text-foreground">Willing to work on off-days</span>
              </label>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-foreground">Nationality</label>
            <select className={selectCls(filters.nationality !== "No Preference")}
              value={filters.nationality}
              onChange={(e) => setFilters((p) => ({ ...p, nationality: e.target.value }))}>
              <option>No Preference</option>
              <option>Filipino</option><option>Indonesian</option><option>Myanmar</option>
              <option>Indian</option><option>Sri Lankan</option><option>Cambodian</option>
              <option>Bangladeshi</option><option>Others</option>
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-foreground">Language</label>
            <select className={selectCls(filters.language !== "No Preference")}
              value={filters.language}
              onChange={(e) => setFilters((p) => ({ ...p, language: e.target.value }))}>
              <option>No Preference</option>
              <option>English</option><option>Mandarin</option>
              <option>Bahasa Indonesia / Malay</option>
              <option>Hindi</option><option>Tamil</option>
            </select>
          </div>

          <button type="button" onClick={handleSearch}
            className="flex w-full items-center justify-center gap-2 rounded bg-primary py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 active:bg-primary/80">
            <Search className="h-3.5 w-3.5" />
            Search Maid
            {activeFilterCount > 0 && (
              <span className="ml-1 inline-flex h-4 min-w-[16px] items-center justify-center rounded-full bg-primary-foreground/20 px-1 text-[10px] font-bold">
                {activeFilterCount}
              </span>
            )}
          </button>

          {activeFilterCount > 0 && (
            <button type="button" onClick={handleReset}
              className="flex w-full items-center justify-center gap-1.5 rounded border border-border py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:border-destructive/40 hover:text-destructive">
              <X className="h-3 w-3" />
              Clear all filters
            </button>
          )}
        </div>
      </div>

      <div className="mt-2 overflow-hidden rounded-lg border border-border bg-card shadow-sm">
        <div className="divide-y divide-border/50">
          {NATIONALITY_LINKS.map((label) => {
            const linkKey = QUICK_LINKS_BY_LABEL[label];
            const isActive = !!quickLink && quickLink === linkKey;
            return (
              <button key={label} onClick={() => handleQuickLink(label)}
                className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors ${
                  isActive ? "bg-primary/10 font-semibold text-primary"
                           : "text-foreground hover:bg-muted/50 hover:text-primary"
                }`}>
                <span className="shrink-0 text-primary opacity-60">›</span>
                {label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );

  const PaginationBar = () => (
    <div className="flex flex-wrap items-center gap-1">
      <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
        className="flex h-7 w-7 items-center justify-center rounded-lg border border-border bg-background text-foreground transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40">
        <ChevronLeft className="h-3.5 w-3.5" />
      </button>
      {pages.map((item, index) =>
        item === "..." ? (
          <span key={`el-${index}`} className="px-1 text-xs text-muted-foreground">…</span>
        ) : (
          <button key={item} onClick={() => setPage(item as number)}
            className={`flex h-7 min-w-[1.75rem] items-center justify-center rounded-lg border px-2 text-xs font-medium transition-colors ${
              item === page ? "border-primary bg-primary text-primary-foreground"
                           : "border-border bg-background text-foreground hover:bg-muted"
            }`}>
            {item}
          </button>
        )
      )}
      <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}
        className="flex h-7 w-7 items-center justify-center rounded-lg border border-border bg-background text-foreground transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40">
        <ChevronRight className="h-3.5 w-3.5" />
      </button>
    </div>
  );

  return (
    <div className="client-page-theme min-h-screen bg-background">
      {!embedded && (isLoggedIn ? <ClientPortalNavbar /> : <PublicSiteNavbar />)}

      {/* Mobile top bar */}
      <div className="sticky top-0 z-20 flex items-center justify-between gap-3 border-b border-border bg-background/95 px-4 py-2.5 backdrop-blur md:hidden">
        <p className="text-sm font-medium text-foreground">
          {isLoading ? "Loading…" : `${filteredMaids.length} result${filteredMaids.length !== 1 ? "s" : ""}`}
        </p>
        <button type="button" onClick={() => setMobileSidebarOpen((v) => !v)}
          className="flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-muted">
          <SlidersHorizontal className="h-3.5 w-3.5" />
          Filters
          {activeFilterCount > 0 && (
            <span className="inline-flex h-4 min-w-[16px] items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
              {activeFilterCount}
            </span>
          )}
        </button>
      </div>

      {/* Mobile sidebar drawer */}
      {mobileSidebarOpen && (
        <div className="fixed inset-0 z-30 md:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMobileSidebarOpen(false)} />
          <div className="absolute bottom-0 left-0 right-0 max-h-[85vh] overflow-y-auto rounded-t-2xl bg-background p-4">
            <div className="mb-4 flex items-center justify-between">
              <p className="font-semibold">Filters</p>
              <button type="button" onClick={() => setMobileSidebarOpen(false)}>
                <X className="h-5 w-5 text-muted-foreground" />
              </button>
            </div>
            <SidebarContent />
          </div>
        </div>
      )}

      <div className="container mx-auto flex flex-col gap-4 px-3 py-4 sm:px-4 md:flex-row md:gap-5 md:py-6">
        {/* Desktop sidebar */}
        <aside className="hidden w-56 shrink-0 md:block">
          <div className="sticky top-4">
            <SidebarContent />
          </div>
        </aside>

        <main className="min-w-0 flex-1">
          {/* Advanced filters banner */}
          {advancedFilters && advancedFilterSummary.length > 0 && (
            <div className="mb-3 rounded-xl border border-primary/20 bg-primary/5 px-4 py-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground">Advanced filters applied</p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {advancedFilterSummary.map((item) => (
                      <ActiveFilterPill key={item} label={item} />
                    ))}
                  </div>
                </div>
                <div className="flex shrink-0 flex-wrap gap-2">
                  <Button variant="outline" size="sm" asChild>
                    <Link to={advancedFiltersRaw
                      ? `${basePath}?filters=${encodeURIComponent(advancedFiltersRaw)}`
                      : basePath}>
                      Edit Filters
                    </Link>
                  </Button>
                  <Button variant="ghost" size="sm" onClick={handleReset}
                    className="text-muted-foreground hover:text-destructive">
                    <X className="h-3.5 w-3.5 mr-1" />
                    Clear
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Shortlist bar */}
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-800">
            <div className="flex items-center gap-2">
              <Star className="h-4 w-4 fill-amber-400 text-amber-500" />
              <span>
                <span className="font-bold">{shortlistRefs.length}</span>{" "}
                {shortlistRefs.length === 1 ? "maid" : "maids"} shortlisted
              </span>
            </div>
            <Button type="button" variant="link" size="sm"
              onClick={() => setIsShortlistOpen(true)}
              className="h-auto p-0 text-amber-800 hover:text-amber-900">
              My Shortlist
            </Button>
          </div>

          {/* Results header */}
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">
              {isLoading ? "Loading profiles…" : (
                <>
                  <span className="font-semibold text-foreground">{filteredMaids.length}</span>{" "}
                  {filteredMaids.length !== 1 ? "profiles" : "profile"} found
                  {quickLink && (
                    <span className="ml-1 text-muted-foreground/70">
                      · {QUICK_LINKS[quickLink as QuickLinkKey]}
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
                <div key={i} className="overflow-hidden rounded-xl border border-border bg-muted animate-pulse">
                  <div className="aspect-[3/4] bg-muted-foreground/10" />
                  <div className="space-y-1.5 p-2">
                    <div className="h-2 w-3/4 rounded-full bg-muted-foreground/15" />
                    <div className="h-2 w-1/2 rounded-full bg-muted-foreground/10" />
                    <div className="h-2 w-2/3 rounded-full bg-muted-foreground/10" />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredMaids.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border py-20 text-center">
              <Search className="mb-3 h-10 w-10 text-muted-foreground/25" />
              <p className="text-base font-semibold text-foreground">No profiles found</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Try adjusting your filters or search keywords.
              </p>
              {activeFilterCount > 0 && (
                <button type="button" onClick={handleReset}
                  className="mt-4 rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted">
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

          {!isLoading && filteredMaids.length > 0 && (
            <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-muted-foreground">
                Page <span className="font-medium text-foreground">{page}</span> of{" "}
                <span className="font-medium text-foreground">{totalPages}</span>
              </p>
              <PaginationBar />
            </div>
          )}

          {/* Shortlist dialog */}
          <Dialog open={isShortlistOpen} onOpenChange={setIsShortlistOpen}>
            <DialogContent className="max-w-3xl">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Star className="h-4 w-4 fill-amber-400 text-amber-500" />
                  My Shortlist
                  {shortlistRefs.length > 0 && (
                    <span className="inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-amber-100 px-1.5 text-[11px] font-bold text-amber-700">
                      {shortlistRefs.length}
                    </span>
                  )}
                </DialogTitle>
                <DialogDescription>
                  Click any profile to view full details. Tap the star to remove from shortlist.
                </DialogDescription>
              </DialogHeader>

              {shortlistRefs.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-amber-50">
                    <Star className="h-7 w-7 text-amber-300" />
                  </div>
                  <p className="text-sm font-semibold text-foreground">No maids shortlisted yet</p>
                  <p className="mt-1 max-w-xs text-xs text-muted-foreground">
                    Tap the star that appears on any profile card to add it to your shortlist.
                  </p>
                </div>
              ) : (
                <div className="max-h-[68vh] overflow-y-auto pr-1">
                  <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4 md:grid-cols-5">
                    {shortlistedMaids.map((maid) => (
                      <MaidCard
                        key={`sl-${maid.referenceCode}`}
                        maid={maid}
                        isShortlisted={true}
                        onToggleShortlist={handleToggleShortlist}
                        onNavigate={() => setIsShortlistOpen(false)}
                        isLoggedIn={isLoggedIn}
                        loginPath={loginPath}
                        showCategory={isIndianSubcategoryActive}
                      />
                    ))}
                    {missingShortlistRefs.map((ref) => (
                      <div key={`missing-${ref}`}
                        className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-muted/20 p-3 text-center"
                        style={{ aspectRatio: "3/4" }}>
                        <svg className="h-6 w-6 text-muted-foreground/25" fill="none"
                          viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                          <circle cx="12" cy="12" r="10" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01" />
                        </svg>
                        <p className="break-all font-mono text-[9px] text-muted-foreground/70">{ref}</p>
                        <p className="text-[9px] text-muted-foreground/50">Profile not found</p>
                        <button type="button" onClick={() => handleToggleShortlist(ref)}
                          className="text-[10px] font-medium text-destructive hover:underline">
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 flex items-center justify-between border-t border-border/60 pt-3">
                    <p className="text-xs text-muted-foreground">
                      <span className="font-medium text-foreground">{shortlistedMaids.length}</span>{" "}
                      {shortlistedMaids.length === 1 ? "profile" : "profiles"} shortlisted
                      {missingShortlistRefs.length > 0 && (
                        <span className="ml-1 text-muted-foreground/60">
                          · {missingShortlistRefs.length} not found
                        </span>
                      )}
                    </p>
                    <button type="button"
                      onClick={() => shortlistRefs.forEach((ref) => handleToggleShortlist(ref))}
                      className="text-xs font-medium text-destructive hover:underline">
                      Clear all
                    </button>
                  </div>
                </div>
              )}
            </DialogContent>
          </Dialog>
        </main>
      </div>
    </div>
  );
};

export default MaidSearchPage;