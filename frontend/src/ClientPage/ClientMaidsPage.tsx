import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import {
  ArrowLeft,
  ChevronDown,
  Search,
  Sparkles,
  X,
  Users,
  CheckCircle2,
  Lock,
  MapPin,
  Star,
  Filter,
  Zap,
  ChevronRight,
  Globe,
  BookOpen,
  Heart,
  Shield,
  Clock,
  Mail,
  Phone,
  MessageCircle,
  Facebook,
  Youtube,
} from "lucide-react";
import { FaTiktok } from "react-icons/fa6";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { PhoneNumberInput } from "@/components/ui/phone-input";
import { toast } from "@/components/ui/sonner";
import { getClientAuthHeaders, getClientToken, getStoredClient, refreshClientToken } from "@/lib/clientAuth";
import { fetchAgencyOptions, type PublicAgencyOption } from "@/lib/agencies";
import { readSafeJson } from "@/lib/safeJson";
import PublicSiteNavbar from "@/components/PublicSiteNavbar";
import PublicSiteFooter from "@/components/PublicSiteFooter";
import "./ClientTheme.css";

/* ─── tokens ─────────────────────────────────────────────────────────────── */
const T = {
  teal:      "#0E4E5E",
  teal2:     "#156478",
  teal3:     "#1c7a93",
  amber:     "#FCD34D",
  amberDark: "#b45309",
} as const;

/* ─── Flag helpers ────────────────────────────────────────────────────────── */
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
const getNationalityCode = (nat?: string) => {
  if (!nat) return "";
  const k = nat.toLowerCase().trim();
  if (NATIONALITY_FLAGS[k]) return NATIONALITY_FLAGS[k];
  for (const [key, code] of Object.entries(NATIONALITY_FLAGS)) if (k.includes(key)) return code;
  return "";
};
const FlagCircle = ({ code }: { code: string }) =>
  !code ? null : (
    <span style={{
      display:"inline-flex", alignItems:"center", justifyContent:"center",
      width:16, height:16, borderRadius:"50%", overflow:"hidden",
      border:"1.5px solid rgba(0,0,0,0.1)", flexShrink:0,
      verticalAlign:"middle", background:"#e5e7eb",
    }}>
      <img src={`https://flagcdn.com/w40/${code.toLowerCase()}.png`} alt={code}
        style={{ width:"100%", height:"100%", objectFit:"cover", display:"block" }} />
    </span>
  );

/* ─── Types ───────────────────────────────────────────────────────────────── */
interface Filters {
  keyword: string; agencyPreference: string; biodataCreatedWithin: string; maidType: string;
  willingOffDays: boolean; hasChildren: boolean; withVideo: boolean;
  natFilipino:boolean; natIndonesian:boolean; natMyanmar:boolean; natIndian:boolean;
  natSriLankan:boolean; natCambodian:boolean; natBangladeshi:boolean; natOthers:boolean; natNoPreference:boolean;
  expHomeCountry:boolean; expSingapore:boolean; expMalaysia:boolean; expHongKong:boolean;
  expTaiwan:boolean; expMiddleEast:boolean; expOtherCountries:boolean; expNoPreference:boolean;
  dutyCareInfant:boolean; dutyCareYoungChildren:boolean; dutyCareElderlyDisabled:boolean;
  dutyCooking:boolean; dutyGeneralHousekeeping:boolean; dutyNoPreference:boolean;
  eduCollege:boolean; eduHighSchool:boolean; eduSecondary:boolean; eduPrimary:boolean; eduNoPreference:boolean;
  langEnglish:boolean; langMandarin:boolean; langBahasaIndonesia:boolean; langHindi:boolean;
  langTamil:boolean; langNoPreference:boolean;
  age21to25:boolean; age26to30:boolean; age31to35:boolean; age36to40:boolean; age41above:boolean; ageNoPreference:boolean;
  marSingle:boolean; marMarried:boolean; marWidowed:boolean; marDivorced:boolean; marSeparated:boolean; marNoPreference:boolean;
  height150below:boolean; height151to155:boolean; height156to160:boolean; height161above:boolean; heightNoPreference:boolean;
  relFreeThinker:boolean; relChristian:boolean; relCatholic:boolean; relBuddhist:boolean;
  relMuslim:boolean; relHindu:boolean; relSikh:boolean; relOthers:boolean; relNoPreference:boolean;
}
export interface MaidProfile {
  id: number|string; agencyId?: number|string; refCode?: string; name: string; photoUrl?: string;
  nationality: string; age?: number; maidType?: string; duties?: string[];
  languages?: string[]; experience?: string[]; maritalStatus?: string;
  education?: string; height?: string; religion?: string; hasVideo?: boolean;
  biodataCreatedAt?: string;
}

/** Normalise the API's full profile shape to the compact search-card shape. */
const toSearchCardMaid = (value: unknown): MaidProfile => {
  const maid = value as Record<string, unknown>;
  const photos = Array.isArray(maid.photoDataUrls) ? maid.photoDataUrls : [];
  return {
    ...(maid as unknown as MaidProfile),
    id: (maid.id ?? "") as number | string,
    agencyId: maid.agencyId as number | string | undefined,
    refCode: String(maid.refCode ?? maid.referenceCode ?? ""),
    name: String(maid.name ?? maid.fullName ?? "Profile available"),
    // Authenticated list responses deliberately use photoDataUrl.  Mapping it
    // here prevents a stale guest-only photoUrl from keeping the card blurred.
    photoUrl: String(maid.photoDataUrl ?? photos[0] ?? maid.photoUrl ?? "") || undefined,
    nationality: String(maid.nationality ?? ""),
    maidType: String(maid.maidType ?? maid.type ?? "") || undefined,
    education: String(maid.education ?? maid.educationLevel ?? "") || undefined,
  };
};

const AuthenticatedMaidImage = ({ maid }: { maid: MaidProfile }) => {
  const [originalUrl, setOriginalUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!maid.refCode) {
      setOriginalUrl(null);
      return;
    }

    let active = true;
    let objectUrl: string | null = null;
    const params = maid.agencyId != null ? `?agencyId=${encodeURIComponent(String(maid.agencyId))}` : "";
    void (async () => {
      const token = await refreshClientToken().catch(() => getClientToken());
      if (!token) {
        if (active) setOriginalUrl(null);
        return;
      }

      const response = await fetch(`/api/maids/${encodeURIComponent(maid.refCode)}/photo-authenticated${params}`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      if (!response.ok) throw new Error("Authenticated photo is unavailable");
      objectUrl = URL.createObjectURL(await response.blob());
      if (active) setOriginalUrl(objectUrl);
    })().catch(() => { if (active) setOriginalUrl(null); });

    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [maid.agencyId, maid.refCode]);

  return <img src={originalUrl ?? maid.photoUrl} alt={maid.name} loading="lazy" decoding="async" />;
};
type RequirementsState = {
  noOffDay:boolean; hasChildren:boolean; married:boolean;
  newMaid:boolean; transferMaid:boolean; exSingaporeMaid:boolean;
};
type ClientMaidsPageProps = { resultsPath?: string; loginPath?: string; embedded?: boolean; };

/* ─── Defaults ────────────────────────────────────────────────────────────── */
export const defaultFilters: Filters = { // eslint-disable-line react-refresh/only-export-components
  keyword:"", agencyPreference:"No Preference", biodataCreatedWithin:"No Preference", maidType:"",
  willingOffDays:false, hasChildren:false, withVideo:false,
  natFilipino:false, natIndonesian:false, natMyanmar:false, natIndian:false,
  natSriLankan:false, natCambodian:false, natBangladeshi:false, natOthers:false, natNoPreference:true,
  expHomeCountry:false, expSingapore:false, expMalaysia:false, expHongKong:false,
  expTaiwan:false, expMiddleEast:false, expOtherCountries:false, expNoPreference:true,
  dutyCareInfant:false, dutyCareYoungChildren:false, dutyCareElderlyDisabled:false,
  dutyCooking:false, dutyGeneralHousekeeping:false, dutyNoPreference:true,
  eduCollege:false, eduHighSchool:false, eduSecondary:false, eduPrimary:false, eduNoPreference:true,
  langEnglish:false, langMandarin:false, langBahasaIndonesia:false, langHindi:false,
  langTamil:false, langNoPreference:true,
  age21to25:false, age26to30:false, age31to35:false, age36to40:false, age41above:false, ageNoPreference:true,
  marSingle:false, marMarried:false, marWidowed:false, marDivorced:false, marSeparated:false, marNoPreference:true,
  height150below:false, height151to155:false, height156to160:false, height161above:false, heightNoPreference:true,
  relFreeThinker:false, relChristian:false, relCatholic:false, relBuddhist:false,
  relMuslim:false, relHindu:false, relSikh:false, relOthers:false, relNoPreference:true,
};
const defaultRequirements: RequirementsState = {
  noOffDay:false, hasChildren:false, married:false, newMaid:false, transferMaid:false, exSingaporeMaid:false,
};

/* ─── Preference groups ───────────────────────────────────────────────────── */
const PREFERENCE_GROUPS = [
  { noPreference:"natNoPreference" as const, specifics:["natFilipino","natIndonesian","natMyanmar","natIndian","natSriLankan","natCambodian","natBangladeshi","natOthers"] as const },
  { noPreference:"expNoPreference" as const, specifics:["expHomeCountry","expSingapore","expMalaysia","expHongKong","expTaiwan","expMiddleEast","expOtherCountries"] as const },
  { noPreference:"dutyNoPreference" as const, specifics:["dutyCareInfant","dutyCareYoungChildren","dutyCareElderlyDisabled","dutyCooking","dutyGeneralHousekeeping"] as const },
  { noPreference:"eduNoPreference" as const, specifics:["eduCollege","eduHighSchool","eduSecondary","eduPrimary"] as const },
  { noPreference:"langNoPreference" as const, specifics:["langEnglish","langMandarin","langBahasaIndonesia","langHindi","langTamil"] as const },
  { noPreference:"ageNoPreference" as const, specifics:["age21to25","age26to30","age31to35","age36to40","age41above"] as const },
  { noPreference:"marNoPreference" as const, specifics:["marSingle","marMarried","marWidowed","marDivorced","marSeparated"] as const },
  { noPreference:"heightNoPreference" as const, specifics:["height150below","height151to155","height156to160","height161above"] as const },
  { noPreference:"relNoPreference" as const, specifics:["relFreeThinker","relChristian","relCatholic","relBuddhist","relMuslim","relHindu","relSikh","relOthers"] as const },
];

const FILTER_LABELS: Partial<Record<keyof Filters, string>> = {
  natFilipino:"Filipino", natIndonesian:"Indonesian", natMyanmar:"Myanmar",
  natIndian:"Indian", natSriLankan:"Sri Lankan", natCambodian:"Cambodian",
  natBangladeshi:"Bangladeshi", natOthers:"Other nationality",
  expHomeCountry:"Home country", expSingapore:"Singapore", expMalaysia:"Malaysia",
  expHongKong:"Hong Kong", expTaiwan:"Taiwan", expMiddleEast:"Middle East", expOtherCountries:"Other countries",
  dutyCareInfant:"Infant care", dutyCareYoungChildren:"Young children",
  dutyCareElderlyDisabled:"Elderly / disabled", dutyCooking:"Cooking", dutyGeneralHousekeeping:"Housekeeping",
  eduCollege:"College / degree", eduHighSchool:"High school", eduSecondary:"Secondary", eduPrimary:"Primary level",
  langEnglish:"English", langMandarin:"Mandarin", langBahasaIndonesia:"Bahasa / Malay", langHindi:"Hindi", langTamil:"Tamil",
  age21to25:"21–25 yrs", age26to30:"26–30 yrs", age31to35:"31–35 yrs", age36to40:"36–40 yrs", age41above:"41+ yrs",
  marSingle:"Single", marMarried:"Married", marWidowed:"Widowed", marDivorced:"Divorced", marSeparated:"Separated",
  height150below:"≤150 cm", height151to155:"151–155 cm", height156to160:"156–160 cm", height161above:"161+ cm",
  relFreeThinker:"Free thinker", relChristian:"Christian", relCatholic:"Catholic", relBuddhist:"Buddhist",
  relMuslim:"Muslim", relHindu:"Hindu", relSikh:"Sikh", relOthers:"Other religion",
  willingOffDays:"Off-days OK", hasChildren:"Has children", withVideo:"With video",
};

const NATIONALITY_OPTIONS = ["No Preference","Filipino","Indonesian","Indian","Sri Lankan","Myanmar","Cambodian","Bangladeshi","Nepali"] as const;
const PRIMARY_DUTY_OPTIONS = ["No Preference","Housekeeping","Elderly Care","Infant Care","Kid Care","Cooking","Other"] as const;
const AGE_GROUP_OPTIONS    = ["No Preference","18–25","26–35","36–45","46+"] as const;
const LANGUAGE_OPTIONS     = ["No Preference","English","Mandarin","Malay","Tamil","Tagalog","Bahasa Indonesia"] as const;

/* ─── Filter helpers ──────────────────────────────────────────────────────── */
const parseDraftFromSearchParams = (sp: URLSearchParams): Filters|null => {
  const raw = sp.get("filters"); if (!raw) return null;
  try { const p = JSON.parse(raw) as Partial<Filters>; return p && typeof p==="object" ? {...defaultFilters,...p} : null; }
  catch { return null; }
};
const getSelectedNationalityFromDraft = (d: Filters) =>
  [d.natFilipino?"Filipino maid":"", d.natIndonesian?"Indonesian maid":"", d.natMyanmar?"Myanmar maid":"",
   d.natIndian?"Indian maid":"", d.natSriLankan?"Sri Lankan maid":"", d.natCambodian?"Cambodian maid":"",
   d.natBangladeshi?"Bangladeshi maid":"", d.natOthers?"Other nationality":""].find(Boolean)||"";
const getSelectedEducationFromDraft = (d: Filters) =>
  d.eduCollege?"College / Degree":d.eduHighSchool?"High School":d.eduSecondary?"Secondary":d.eduPrimary?"Primary":"";
const getSelectedLanguageFromDraft = (d: Filters) =>
  d.langEnglish?"English":d.langMandarin?"Mandarin":d.langBahasaIndonesia?"Bahasa Indonesia":d.langHindi?"Hindi":d.langTamil?"Tamil":"";
const getSelectedAgeFromDraft = (d: Filters) =>
  d.age21to25?"21 to 25":d.age26to30?"26 to 30":d.age31to35?"31 to 35":d.age36to40?"36 to 40":d.age41above?"41 and above":"";
const buildSearchParamsFromFilters = (d: Filters) => {
  const p = new URLSearchParams();
  p.set("filters", JSON.stringify(d));
  if (d.keyword.trim()) p.set("q", d.keyword.trim());
  if (d.maidType.trim()) p.set("type", d.maidType.trim());
  const nat=getSelectedNationalityFromDraft(d); if(nat) p.set("nationality",nat);
  const edu=getSelectedEducationFromDraft(d);   if(edu) p.set("education",edu);
  const lang=getSelectedLanguageFromDraft(d);   if(lang) p.set("language",lang);
  const age=getSelectedAgeFromDraft(d);         if(age) p.set("age",age);
  if(d.willingOffDays) p.set("offDays","true");
  if(d.withVideo) p.set("withVideo","true");
  return p;
};
const getRequestHighlights = (d: Filters) =>
  [d.maidType?`Type: ${d.maidType}`:"", getSelectedNationalityFromDraft(d),
   d.dutyCareInfant?"Infant care":"", d.dutyCareYoungChildren?"Young children":"",
   d.dutyCareElderlyDisabled?"Elderly / disabled":"", d.dutyCooking?"Cooking":"",
   d.dutyGeneralHousekeeping?"Housekeeping":"", getSelectedLanguageFromDraft(d),
   getSelectedAgeFromDraft(d), d.withVideo?"Video available":""].filter(Boolean).slice(0,6);

export const RequestForm = ({ prefillFilters, onBack }: { prefillFilters: Filters; onBack: () => void }) => {
  const client = useMemo(() => getStoredClient(), []);
  const [busy, setBusy] = useState(false);
  const [canSubmit, setCanSubmit] = useState(Boolean(getClientToken()));
  const [form, setForm] = useState({
    name: client?.name ?? "", email: client?.email ?? "", phone: client?.phone ?? "",
    nationality: prefillFilters.natFilipino ? "Filipino" : prefillFilters.natIndonesian ? "Indonesian" : prefillFilters.natIndian ? "Indian" : "No Preference",
    duty: prefillFilters.dutyCareInfant ? "Infant Care" : prefillFilters.dutyCareYoungChildren ? "Kid Care" : prefillFilters.dutyCareElderlyDisabled ? "Elderly Care" : prefillFilters.dutyCooking ? "Cooking" : prefillFilters.dutyGeneralHousekeeping ? "Housekeeping" : "No Preference",
    age: "No Preference", language: getSelectedLanguageFromDraft(prefillFilters), notes: "",
  });
  const [requirements, setRequirements] = useState<RequirementsState>({ ...defaultRequirements, hasChildren: prefillFilters.hasChildren, newMaid: prefillFilters.maidType === "New Maid", transferMaid: prefillFilters.maidType === "Transfer Maid", exSingaporeMaid: prefillFilters.maidType === "Ex-Singapore Maid" });
  const highlights = useMemo(() => getRequestHighlights(prefillFilters), [prefillFilters]);
  useEffect(() => {
    let active = true;
    void refreshClientToken().then((token) => { if (active) setCanSubmit(Boolean(token)); }).catch(() => { if (active) setCanSubmit(false); });
    return () => { active = false; };
  }, []);
  const update = (key: keyof typeof form, value: string) => setForm((current) => ({ ...current, [key]: value }));
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canSubmit) { toast.error("Please sign in to send a request."); return; }
    setBusy(true);
    try {
      const selected = Object.entries(requirements).filter(([, active]) => active).map(([key]) => key.replace(/([A-Z])/g, " $1").toLowerCase());
      const response = await fetch("/api/requests", {
        method: "POST", headers: { "Content-Type": "application/json", ...getClientAuthHeaders() },
        body: JSON.stringify({ ...(client?.id != null && { clientId: client.id }), agencyId: 1, type: "general", details: { clientName: form.name.trim(), clientEmail: form.email.trim(), clientPhone: form.phone.trim(), nationality: form.nationality, primaryDuty: form.duty, ageGroup: form.age, language: form.language, ...(form.notes.trim() && { otherRequirements: form.notes.trim() }), ...(selected.length && { requirements: selected.join(", ") }) } }),
      });
      const result = await response.json().catch(() => ({})) as { error?: string; message?: string };
      if (!response.ok) throw new Error(result.error || result.message || "Your request could not be sent.");
      toast.success("Your request has been sent to the agency.");
      onBack();
    } catch (error) { toast.error(error instanceof Error ? error.message : "Your request could not be sent."); }
    finally { setBusy(false); }
  };
  return <section className="cm-request w-full" aria-label="Request agency help">
    <style>{`
      .cm-request .cm-request-header{padding:1.2rem 1.5rem}
      .cm-request .cm-req-sub{max-width:680px;font-size:.8rem!important;line-height:1.4}
      .cm-request .cm-req-title{max-width:calc(100% - 5.5rem);font-size:clamp(1.1rem,2.2vw,1.35rem)}
      .cm-request .cm-req-eyebrow,.cm-request .cm-req-back{font-size:.72rem!important}
      .cm-request form p{font-size:.75rem!important;line-height:1.35}
      .cm-request .cm-lbl{font-size:.75rem!important;letter-spacing:0!important;text-transform:none!important;color:#334155!important;margin-bottom:0}
      .cm-request .cm-req-star{font-size:.68rem!important;color:#b45309!important}
      .cm-request .cm-form-input,.cm-request .cm-form-select,.cm-request .cm-form-textarea{background:#fff!important;color:#0f172a!important;font-size:.82rem!important;letter-spacing:normal!important;text-transform:none!important;padding-top:.48rem!important;padding-bottom:.48rem!important}
      .cm-request form > .grid > div{padding:12px!important}
      .cm-request form .grid label.flex{min-height:36px;padding:.4rem .55rem;font-size:.8rem;line-height:1.2}
      .cm-request .cm-form-textarea{min-height:3.5rem!important}
      .cm-request .cm-btn-submit,.cm-request .cm-btn-cancel,.cm-request form a{font-size:.8rem!important;padding-top:.55rem;padding-bottom:.55rem}
      .cm-request .cm-form-input:focus,.cm-request .cm-form-select:focus,.cm-request .cm-form-textarea:focus{border-color:#0e7490!important;box-shadow:0 0 0 3px rgba(14,116,144,.12)!important}
      @media(max-width:480px){.cm-request .cm-request-header{padding:1rem}.cm-request-header .cm-req-title{max-width:100%;padding-top:1.5rem}.cm-request-header .cm-req-back{top:.6rem;right:.6rem}}
    `}</style>
    <div className="cm-request-header">
      <button type="button" className="cm-req-back" onClick={onBack} aria-label="Close request form"><X size={17}/><span className="hidden sm:inline">Close</span></button>
      <div className="cm-req-eyebrow"><Sparkles size={11}/> Personalised agency matching</div>
      <h2 className="cm-req-title">Tell us what kind of helper you need</h2>
      <p className="cm-req-sub">Share your contact details and preferences. Our agency team will review your request and follow up with suitable profiles.</p>
      {highlights.length > 0 && <div className="cm-req-prefill"><p className="cm-req-prefill-lbl">We added these preferences from your search</p><div className="cm-req-prefill-pills">{highlights.map((item) => <span key={item} className="cm-req-prefill-pill">{item}</span>)}</div></div>}
    </div>
    <form onSubmit={(event) => void submit(event)} className="space-y-4 p-4 sm:p-5">
      {!canSubmit && <div role="status" className="flex flex-col gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950 sm:flex-row sm:items-center sm:justify-between"><span>Sign in to submit your request and keep track of the agency’s response.</span><Link to="/employer-login" className="inline-flex min-h-10 items-center justify-center rounded-lg bg-teal-800 px-4 font-bold text-white hover:bg-teal-900">Employer sign in</Link></div>}
      <div className="grid gap-4 lg:grid-cols-2 lg:items-start">
      <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
        <div className="mb-4 flex items-center gap-3"><span className="grid h-8 w-8 place-items-center rounded-full bg-teal-50 text-sm font-bold text-teal-800">1</span><div><h3 className="text-sm font-bold text-slate-900">Your contact details</h3><p className="text-xs text-slate-500">So the team knows how to reach you</p></div></div>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="cm-lbl">Full name <span className="cm-req-star">Required</span><input autoComplete="name" className="cm-form-input mt-1.5" required maxLength={120} value={form.name} onChange={(event) => update("name", event.target.value)} placeholder="Your name" /></label>
          <label className="cm-lbl">Email address <span className="cm-req-star">Required</span><input autoComplete="email" className="cm-form-input mt-1.5" required type="email" maxLength={254} value={form.email} onChange={(event) => update("email", event.target.value)} placeholder="you@example.com" /></label>
          <label className="cm-lbl sm:col-span-2">Phone number <span className="cm-req-star">Required</span><PhoneNumberInput className="cm-form-input mt-1.5" required value={form.phone} onChange={(value) => update("phone", value)} /></label>
        </div>
        <label className="cm-lbl mt-4 block">Additional notes <span className="font-normal normal-case tracking-normal text-slate-400">(optional)</span><textarea className="cm-form-textarea mt-1.5 min-h-20" rows={2} maxLength={1500} value={form.notes} onChange={(event) => update("notes", event.target.value)} placeholder="Tell us about your household, preferred start date, or anything else that may help us find a suitable match." /><span className="mt-1 block text-right text-[11px] font-normal normal-case tracking-normal text-slate-400">{form.notes.length}/1500</span></label>
      </div>
      <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
        <div className="mb-4 flex items-center gap-3"><span className="grid h-8 w-8 place-items-center rounded-full bg-teal-50 text-sm font-bold text-teal-800">2</span><div><h3 className="text-sm font-bold text-slate-900">Helper preferences</h3><p className="text-xs text-slate-500">Choose what matters to your household</p></div></div>
        <div className="grid gap-4 sm:grid-cols-2">{([ ["nationality", "Nationality", ["No Preference", ...NATIONALITY_OPTIONS.slice(1)]], ["duty", "Main responsibility", PRIMARY_DUTY_OPTIONS], ["age", "Age range", AGE_GROUP_OPTIONS], ["language", "Preferred language", LANGUAGE_OPTIONS] ] as const).map(([key, label, options]) => <label className="cm-lbl" key={key}>{label}<select className="cm-form-select mt-1.5" value={form[key]} onChange={(event) => update(key, event.target.value)}>{options.map((option) => <option key={option} value={option}>{option}</option>)}</select></label>)}</div>
        <p className="mb-2 mt-5 text-xs font-bold uppercase tracking-wider text-slate-500">Other preferences</p>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{([ ["noOffDay", "No off-day preference"], ["hasChildren", "Has children"], ["married", "Married"], ["newMaid", "New maid"], ["transferMaid", "Transfer maid"], ["exSingaporeMaid", "Ex-Singapore maid"] ] as const).map(([key, label]) => <label key={key} className="flex min-h-11 cursor-pointer items-center gap-2.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 transition hover:border-teal-300 hover:bg-teal-50"><input className="h-4 w-4 accent-teal-700" type="checkbox" checked={requirements[key]} onChange={() => setRequirements((current) => ({ ...current, [key]: !current[key] }))}/>{label}</label>)}</div>
      </div>
      </div>
      <div className="flex flex-col-reverse gap-3 border-t border-slate-200 pt-4 sm:flex-row sm:items-center sm:justify-between"><p className="text-xs leading-5 text-slate-500">Your details will be sent securely to the agency team for follow-up.</p><div className="flex gap-2"><button type="button" className="cm-btn-cancel" onClick={onBack} disabled={busy}>Cancel</button><button type="submit" className="cm-btn-submit" disabled={busy || !canSubmit}>{busy ? "Sending…" : "Send request"}</button></div></div>
    </form>
  </section>;
};
const getPublicProfilePath = (m: MaidProfile) =>
  m.refCode ? `/maids/${encodeURIComponent(m.refCode)}` : null;


export const GLOBAL_CSS = `
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Syne:wght@700;800&display=swap');

:root {
  --teal:       #0E4E5E;
  --teal-2:     #156478;
  --teal-3:     #1c7a93;
  --teal-4:     #2896b0;
  --teal-pale:  #eaf4f7;
  --amber:      #FCD34D;
  --amber-glow: rgba(252,211,77,0.22);
  --amber-ring: rgba(252,211,77,0.3);
  --surface:    #f0f7f9;
  --white:      #ffffff;
  --ink:        #091c22;
  --ink-2:      #1a3a44;
  --ink-3:      #4a6a74;
  --ink-4:      #8aaab4;
  --rule:       #cde0e6;
  --rule-2:     #ddeef2;
  --r-sm: 8px; --r-md: 12px; --r-lg: 16px; --r-xl: 22px;
}

/* ── Page root ── */
.cm-root {
  min-height: 100vh;
  background: var(--surface);
  font-family: 'Inter', system-ui, sans-serif;
  position: relative;
  overflow-x: hidden;
}

/* ── Ambient page orbs ── */
.cm-orb {
  position: fixed; border-radius: 50%;
  pointer-events: none; z-index: 0;
}
.cm-orb-1 {
  width:600px;height:600px;top:-200px;left:-180px;
  background: radial-gradient(circle, rgba(14,78,94,0.09) 0%, transparent 68%);
  animation: cmOrb1 22s ease-in-out infinite alternate;
}
.cm-orb-2 {
  width:460px;height:460px;bottom:-140px;right:-120px;
  background: radial-gradient(circle, rgba(252,211,77,0.13) 0%, transparent 65%);
  animation: cmOrb2 28s ease-in-out infinite alternate;
}
@keyframes cmOrb1 { from{transform:translate(0,0)} to{transform:translate(80px,100px)} }
@keyframes cmOrb2 { from{transform:translate(0,0)} to{transform:translate(-60px,-80px)} }

/* ── Hero ── */
.cm-hero {
  position: relative; overflow: hidden;
  padding: 3.5rem 1.5rem 3rem;
  background: linear-gradient(130deg, #091c22 0%, var(--teal) 45%, var(--teal-2) 100%);
}
.cm-hero::before {
  content:'';
  position:absolute;inset:0;
  background: repeating-linear-gradient(
    -52deg,transparent 0px,transparent 28px,
    rgba(255,255,255,0.018) 28px,rgba(255,255,255,0.018) 29px
  );
  pointer-events:none;
}
.cm-hero-blob-1 {
  position:absolute;top:-80px;right:-60px;
  width:340px;height:340px;border-radius:50%;
  background:radial-gradient(circle,rgba(252,211,77,0.16) 0%,transparent 68%);
  animation: blobPulse 6s ease-in-out infinite alternate;
}
.cm-hero-blob-2 {
  position:absolute;bottom:-60px;left:-40px;
  width:260px;height:260px;border-radius:50%;
  background:radial-gradient(circle,rgba(14,78,94,0.25) 0%,transparent 65%);
  animation: blobPulse 9s ease-in-out infinite alternate-reverse;
}
.cm-hero-blob-3 {
  position:absolute;top:50%;right:30%;
  width:180px;height:180px;border-radius:50%;
  background:radial-gradient(circle,rgba(252,211,77,0.08) 0%,transparent 65%);
  animation: blobPulse 12s ease-in-out infinite alternate;
}
@keyframes blobPulse {
  from { transform:scale(1); opacity:0.8; }
  to   { transform:scale(1.18); opacity:1; }
}

.cm-hero-inner {
  position:relative;z-index:1;
  max-width:960px;margin:0 auto;
  display:grid;gap:2rem;
  align-items:center;
}
@media(min-width:900px){ .cm-hero-inner { grid-template-columns: 1fr auto; } }

.cm-hero-eyebrow {
  display:inline-flex;align-items:center;gap:0.5rem;
  padding:0.35rem 0.9rem;
  border-radius:100px;
  background:rgba(252,211,77,0.12);
  border:1px solid rgba(252,211,77,0.25);
  font-size:0.7rem;font-weight:700;
  color:rgba(252,211,77,0.9);
  letter-spacing:0.08em;text-transform:uppercase;
  margin-bottom:1rem;
  animation: heroFade 0.6s ease 0.1s both;
}
.cm-hero-title {
  font-family:'Syne',sans-serif;
  font-size:clamp(1.9rem,4vw,3.2rem);
  font-weight:800;
  color:#fff;
  line-height:1.08;
  letter-spacing:-0.02em;
  margin:0 0 0.75rem;
  animation: heroFade 0.6s ease 0.18s both;
}
.cm-hero-accent { color:var(--amber); }
.cm-hero-sub {
  font-size:0.9rem;color:rgba(255,255,255,0.62);
  line-height:1.7;max-width:480px;margin:0 0 1.5rem;
  animation: heroFade 0.6s ease 0.26s both;
}
@keyframes heroFade {
  from{opacity:0;transform:translateY(14px)}
  to{opacity:1;transform:none}
}

.cm-hero-steps {
  display:flex;flex-wrap:wrap;gap:0.5rem;
  animation: heroFade 0.6s ease 0.34s both;
}
.cm-hero-step {
  display:flex;align-items:center;gap:0.55rem;
  padding:0.5rem 0.9rem;
  border-radius:var(--r-md);
  background:rgba(255,255,255,0.07);
  border:1px solid rgba(255,255,255,0.12);
  font-size:0.75rem;font-weight:600;color:rgba(255,255,255,0.8);
  backdrop-filter:blur(4px);
}
.cm-hero-step-num {
  width:20px;height:20px;border-radius:50%;
  background:var(--amber);
  display:flex;align-items:center;justify-content:center;
  font-size:0.65rem;font-weight:800;color:var(--teal);flex-shrink:0;
}

/* ── Trust pills ── */
.cm-trust-pills {
  display:flex;flex-direction:row;flex-wrap:wrap;gap:0.6rem;
  animation: heroFade 0.6s ease 0.4s both;
}
@media(min-width:900px){ .cm-trust-pills{flex-direction:column;} }
.cm-trust-pill {
  display:flex;align-items:center;gap:0.65rem;
  padding:0.65rem 1rem;
  border-radius:var(--r-md);
  background:rgba(255,255,255,0.07);
  border:1px solid rgba(255,255,255,0.12);
  backdrop-filter:blur(6px);
  transition:background 0.2s,transform 0.2s;
}
.cm-trust-pill:hover{background:rgba(255,255,255,0.12);transform:translateY(-1px);}
.cm-trust-icon {
  width:32px;height:32px;border-radius:var(--r-sm);
  background:rgba(252,211,77,0.15);border:1px solid rgba(252,211,77,0.25);
  display:flex;align-items:center;justify-content:center;flex-shrink:0;
}
.cm-trust-val { font-family:'Syne',sans-serif;font-size:1rem;font-weight:800;color:#fff;line-height:1; }
.cm-trust-lbl { font-size:0.66rem;color:rgba(255,255,255,0.5);margin-top:0.1rem;font-weight:500; }



/* ── Content wrapper ── */
.cm-content {
  position:relative;z-index:1;
  max-width:960px;margin:0 auto;
  padding:1.5rem 1.25rem 3rem;
  display:flex;flex-direction:column;gap:1.25rem;
}

/* ── Filter Panel ── */
.cm-panel {
  background:var(--white);
  border-radius:var(--r-xl);
  border:1px solid var(--rule);
  overflow:hidden;
  box-shadow:0 2px 16px rgba(14,78,94,0.07),0 1px 3px rgba(14,78,94,0.04);
  animation:panelIn 0.5s cubic-bezier(0.22,1,0.36,1) 0.1s both;
}
@keyframes panelIn{from{opacity:0;transform:translateY(18px)}to{opacity:1;transform:none}}

.cm-content > .cm-panel + .cm-panel { display:none; }
.cm-classic-filter{padding:0;color:#132f37;font:12px Arial,Helvetica,sans-serif}
.cm-classic-head{display:flex;align-items:center;justify-content:space-between;gap:16px;padding:14px 18px;background:linear-gradient(135deg,#0e4e5e,#176b7e);border-bottom:3px solid #f2c94c}
.cm-classic-title{margin:0;color:#fff;font-size:17px;font-weight:700}
.cm-classic-subtitle{margin:3px 0 0;color:rgba(255,255,255,.72);font-size:11px}
.cm-classic-count{display:inline-flex;align-items:center;justify-content:center;min-width:28px;height:28px;padding:0 7px;border-radius:4px;background:#f2c94c;color:#0e4e5e;font-weight:700}
.cm-classic-body{padding:16px 18px 18px}
.cm-classic-row{display:grid;grid-template-columns:145px minmax(0,420px);align-items:center;min-height:36px}
.cm-classic-label,.cm-classic-heading{font-weight:700;color:#173b44}
.cm-classic-input,.cm-classic-select{width:100%;height:30px;border:1px solid #a9bcc1;border-radius:3px;background:#fff;padding:4px 8px;box-sizing:border-box;color:#102e36;font:12px Arial,Helvetica,sans-serif;transition:border-color .15s,box-shadow .15s}
.cm-classic-input:focus,.cm-classic-select:focus{outline:none;border-color:#167086;box-shadow:0 0 0 2px rgba(22,112,134,.12)}
.cm-classic-input::placeholder{color:#80979d}
.cm-classic-select{max-width:300px;padding:3px 6px}
.cm-classic-radio-row,.cm-classic-check-row{display:flex;align-items:center;flex-wrap:wrap;gap:8px 12px}
.cm-classic-option{display:inline-flex;align-items:center;gap:5px;min-height:20px;padding:1px 3px;border-radius:3px;white-space:nowrap;cursor:pointer;transition:background .15s,color .15s}
.cm-classic-option:hover{background:#eaf4f7;color:#0e4e5e}
.cm-classic-option:has(input:checked){color:#0b596b;font-weight:700;background:transparent}
.cm-classic-option input{width:13px;height:13px;margin:0;accent-color:#087ff5}
.cm-classic-quick{padding:7px 0 12px}
.cm-classic-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:1px;background:#cbdadd;border:1px solid #cbdadd}
.cm-classic-group{padding:11px 10px 10px;min-width:0;background:#fff}
.cm-classic-heading{margin:0 0 6px;padding-bottom:5px;border-bottom:1px solid #e2ecee;font-size:12px;color:#0e4e5e}
.cm-classic-options{display:flex;flex-direction:column;align-items:flex-start}
.cm-classic-actions{display:flex;align-items:center;gap:9px;padding-top:14px}
.cm-classic-actions button{min-height:34px;padding:6px 19px;border-radius:4px;font:700 12px Arial,Helvetica,sans-serif;cursor:pointer;transition:transform .15s,box-shadow .15s,background .15s}
.cm-classic-search{border:1px solid #0e4e5e;background:linear-gradient(135deg,#0e4e5e,#176b7e);color:#fff;box-shadow:0 3px 8px rgba(14,78,94,.18)}
.cm-classic-search:hover{transform:translateY(-1px);box-shadow:0 5px 12px rgba(14,78,94,.25)}
.cm-classic-clear{border:1px solid #b7c8cc;background:#fff;color:#395860}.cm-classic-clear:hover{background:#f2f7f8}
@media(max-width:640px){.cm-classic-head{padding:12px 14px}.cm-classic-body{padding:13px 14px 15px}.cm-classic-row{grid-template-columns:1fr;gap:4px;padding:4px 0}.cm-classic-grid{grid-template-columns:1fr 1fr}}
@media(max-width:420px){.cm-classic-grid{grid-template-columns:1fr}.cm-classic-count{display:none}.cm-classic-actions button{flex:1}}

.cm-panel-header {
  display:flex;
  align-items:center;
  justify-content:space-between;
  gap:0.75rem;
  padding:0.85rem 1.25rem;
  background:linear-gradient(
    90deg,
    rgba(14,78,94,0.04),
    rgba(252,211,77,0.03)
  );
  border-bottom:1px solid var(--rule-2);

  position: sticky;
  top: 0;
  z-index: 1000;
}
.cm-panel-title {
  display:flex;align-items:center;gap:0.6rem;
  font-size:0.82rem;font-weight:700;color:var(--ink-2);
}
.cm-panel-icon {
  width:30px;height:30px;border-radius:var(--r-sm);
  background:linear-gradient(135deg,var(--teal),var(--teal-2));
  display:flex;align-items:center;justify-content:center;flex-shrink:0;
  box-shadow:0 2px 8px rgba(14,78,94,0.2);
}
.cm-count-badge {
  display:inline-flex;align-items:center;justify-content:center;
  height:18px;min-width:18px;padding:0 4px;
  border-radius:5px;
  background:linear-gradient(135deg,var(--teal),var(--teal-2));
  font-size:0.62rem;font-weight:800;color:#fff;
}
.cm-count-badge-amber {
  background:linear-gradient(135deg,var(--amber),#f59e0b);
  color:var(--teal);
}

/* Tags row */
.cm-tags-row {
  display:flex;flex-wrap:wrap;gap:0.5rem;
  padding:0.65rem 1.25rem;
  background:rgba(14,78,94,0.03);
  border-bottom:1px solid var(--rule-2);
  animation:fadeIn 0.25s ease both;
}
@keyframes fadeIn{from{opacity:0}to{opacity:1}}

.cm-tag {
  display:inline-flex;align-items:center;gap:0.3rem;
  padding:0.22rem 0.6rem;
  border-radius:var(--r-sm);
  background:var(--teal-pale);
  border:1px solid rgba(14,78,94,0.18);
  font-size:0.72rem;font-weight:600;color:var(--teal);
}
.cm-tag-x {
  background:none;border:none;cursor:pointer;padding:0.1rem;
  border-radius:3px;color:var(--ink-4);
  display:flex;align-items:center;
  transition:color 0.15s;
}
.cm-tag-x:hover{color:#dc2626;}

/* Section label */
.cm-section-lbl {
  font-size:0.62rem;font-weight:800;
  letter-spacing:0.14em;text-transform:uppercase;
  color:var(--ink-4);margin-bottom:0.65rem;
}

/* Primary grid */
.cm-primary-grid {
  display:grid;gap:1.1rem;padding:1.1rem 1.25rem;
  border-bottom:1px solid var(--rule-2);
}
@media(min-width:640px){.cm-primary-grid{grid-template-columns:1fr 1fr;}}

/* Input / select base */
.cm-input {
  width:100%;border:1.5px solid var(--rule);border-radius:var(--r-sm);
  background:var(--surface);
  padding:0.68rem 0.9rem 0.68rem 2.4rem;
  font-size:0.85rem;font-family:'Inter',sans-serif;color:var(--ink);
  outline:none;box-sizing:border-box;
  transition:border-color 0.2s,box-shadow 0.2s,background 0.2s;
}
.cm-input::placeholder{color:var(--ink-4);font-weight:300;}
.cm-input:focus{
  border-color:var(--teal-3);background:var(--white);
  box-shadow:0 0 0 3px rgba(14,78,94,0.1),0 1px 4px rgba(14,78,94,0.06);
}
.cm-select {
  width:100%;border:1.5px solid var(--rule);border-radius:var(--r-sm);
  background:var(--surface);
  padding:0.68rem 2.2rem 0.68rem 0.9rem;
  font-size:0.85rem;font-family:'Inter',sans-serif;color:var(--ink);
  outline:none;box-sizing:border-box;appearance:none;cursor:pointer;
  transition:border-color 0.2s,box-shadow 0.2s,background 0.2s;
}
.cm-select:focus{
  border-color:var(--teal-3);background:var(--white);
  box-shadow:0 0 0 3px rgba(14,78,94,0.1);
}
.cm-field{position:relative;}
.cm-field-icon{
  position:absolute;left:0.75rem;top:50%;transform:translateY(-50%);
  pointer-events:none;display:flex;color:var(--ink-4);
  transition:color 0.15s;
}
.cm-select-arrow{
  position:absolute;right:0.75rem;top:50%;transform:translateY(-50%);
  pointer-events:none;color:var(--ink-4);display:flex;
}
.cm-input-clear{
  position:absolute;right:0.75rem;top:50%;transform:translateY(-50%);
  background:none;border:none;cursor:pointer;padding:0.15rem;
  color:var(--ink-4);display:flex;align-items:center;border-radius:4px;
  transition:color 0.15s;
}
.cm-input-clear:hover{color:var(--ink-2);}

/* Chip (pill button) */
.cm-chip {
  display:inline-flex;align-items:center;gap:0.35rem;
  border-radius:var(--r-sm);border:1.5px solid var(--rule);
  padding:0.38rem 0.75rem;
  font-size:0.75rem;font-weight:600;
  background:var(--white);color:var(--ink-3);
  cursor:pointer;transition:all 0.15s;select:none;
}
.cm-chip:hover{border-color:rgba(14,78,94,0.35);background:var(--teal-pale);color:var(--teal-2);}
.cm-chip-on {
  background:linear-gradient(135deg,var(--teal),var(--teal-2));
  border-color:var(--teal);color:#fff;
  box-shadow:0 2px 8px rgba(14,78,94,0.2);
}
.cm-chip-on-amber {
  background:linear-gradient(135deg,var(--amber),#f59e0b);
  border-color:var(--amber);color:var(--teal);
  box-shadow:0 2px 8px rgba(252,211,77,0.35);
}
.cm-chip-on-blue {
  background:linear-gradient(135deg,#3b82f6,#2563eb);
  border-color:#3b82f6;color:#fff;
  box-shadow:0 2px 8px rgba(59,130,246,0.25);
}

/* Filter accordion */
.cm-accordion {
  border-radius:var(--r-md);border:1px solid var(--rule-2);
  background:var(--surface);overflow:hidden;
}
.cm-accordion-btn {
  width:100%;display:flex;align-items:center;justify-content:space-between;
  padding:0.6rem 0.85rem;
  background:none;border:none;cursor:pointer;
  transition:background 0.15s;
  text-align:left;
}
.cm-accordion-btn:hover{background:rgba(14,78,94,0.04);}
.cm-accordion-title {
  display:flex;align-items:center;gap:0.5rem;
  font-size:0.62rem;font-weight:800;letter-spacing:0.12em;
  text-transform:uppercase;color:var(--ink-4);
}
.cm-accordion-body{display:flex;flex-wrap:wrap;gap:0.5rem;padding:0.5rem 0.85rem 0.85rem;}

/* Detailed grid */
.cm-detail-grid {
  padding:1.1rem 1.25rem;
  display:grid;grid-template-columns:1fr;gap:0.75rem;
}
@media(min-width:640px){.cm-detail-grid{grid-template-columns:1fr 1fr;}}
@media(min-width:960px){.cm-detail-grid{grid-template-columns:1fr 1fr 1fr;}}

/* Action row */
.cm-action-row {
  display:flex;flex-wrap:wrap;gap:0.75rem;align-items:center;
  padding:1rem 1.25rem;
  background:linear-gradient(90deg,rgba(14,78,94,0.03),rgba(252,211,77,0.03));
  border-top:1px solid var(--rule-2);
}

/* Buttons */
.cm-btn-search {
  display:inline-flex;align-items:center;gap:0.55rem;
  padding:0.78rem 1.5rem;
  border-radius:var(--r-md);border:none;cursor:pointer;
  background:linear-gradient(130deg,var(--teal),var(--teal-2));
  color:#fff;font-size:0.85rem;font-weight:700;font-family:'Inter',sans-serif;
  box-shadow:0 3px 14px rgba(14,78,94,0.26),inset 0 1px 0 rgba(255,255,255,0.07);
  position:relative;overflow:hidden;
  transition:transform 0.18s,box-shadow 0.18s,background 0.18s;
}
.cm-btn-search::before{
  content:'';position:absolute;inset:0;
  background:linear-gradient(105deg,transparent 20%,rgba(252,211,77,0.15) 50%,transparent 80%);
  transform:translateX(-130%);transition:transform 0.55s ease;
}
.cm-btn-search:hover::before{transform:translateX(130%);}
.cm-btn-search:hover{
  background:linear-gradient(130deg,var(--teal-2),var(--teal-3));
  box-shadow:0 6px 24px rgba(14,78,94,0.3);transform:translateY(-1px);
}
.cm-btn-search:active{transform:none;box-shadow:0 1px 4px rgba(14,78,94,0.2);}

.cm-btn-request {
  display:inline-flex;align-items:center;gap:0.55rem;
  padding:0.78rem 1.25rem;
  border-radius:var(--r-md);cursor:pointer;
  background:rgba(252,211,77,0.12);
  border:1.5px solid rgba(252,211,77,0.4);
  color:var(--teal);font-size:0.85rem;font-weight:700;font-family:'Inter',sans-serif;
  transition:background 0.18s,border-color 0.18s,transform 0.15s;
}
.cm-btn-request:hover{
  background:rgba(252,211,77,0.2);border-color:rgba(252,211,77,0.6);
  transform:translateY(-1px);
}

.cm-btn-clear {
  display:inline-flex;align-items:center;gap:0.4rem;
  padding:0.65rem 1rem;
  border-radius:var(--r-md);cursor:pointer;
  background:#fff;border:1.5px solid rgba(220,38,38,0.25);
  color:#dc2626;font-size:0.8rem;font-weight:600;font-family:'Inter',sans-serif;
  transition:background 0.15s,border-color 0.15s;
  margin-left:auto;
}
.cm-btn-clear:hover{background:#fef2f2;border-color:rgba(220,38,38,0.4);}

.cm-btn-collapse {
  display:inline-flex;align-items:center;gap:0.35rem;
  padding:0.45rem 0.75rem;
  border-radius:var(--r-sm);cursor:pointer;
  background:#fff;border:1.5px solid var(--rule);
  color:var(--ink-3);font-size:0.75rem;font-weight:600;
  transition:background 0.15s;
}
.cm-btn-collapse:hover{background:var(--surface);}

/* ── Results panel ── */
.cm-results {
  border-radius:var(--r-xl);border:1px solid var(--rule);
  background:var(--white);overflow:hidden;
  box-shadow:0 2px 16px rgba(14,78,94,0.06);
  animation:panelIn 0.4s cubic-bezier(0.22,1,0.36,1) both;
}
.cm-results-header {
  display:flex;align-items:center;justify-content:space-between;
  padding:0.75rem 1.25rem;
  background:linear-gradient(90deg,rgba(14,78,94,0.03),transparent);
  border-bottom:1px solid var(--rule-2);
}
.cm-results-title {
  display:flex;align-items:center;gap:0.6rem;
  font-size:0.82rem;font-weight:700;color:var(--ink-2);
}

/* Maid grid */
.cm-maid-grid {
  display:grid;
  grid-template-columns:repeat(2,1fr);
  gap:0.85rem;padding:1rem;
}
@media(min-width:480px){.cm-maid-grid{grid-template-columns:repeat(3,1fr);}}
@media(min-width:640px){.cm-maid-grid{grid-template-columns:repeat(4,1fr);}}
@media(min-width:800px){.cm-maid-grid{grid-template-columns:repeat(5,1fr);}}
@media(min-width:960px){.cm-maid-grid{grid-template-columns:repeat(6,1fr);}}

/* Maid card */
.cm-maid-card {
  border-radius:var(--r-lg);border:1px solid var(--rule);
  background:var(--white);overflow:hidden;cursor:pointer;
  transition:transform 0.22s,box-shadow 0.22s,border-color 0.22s;
  animation:cardPop 0.4s cubic-bezier(0.22,1,0.36,1) both;
}
.cm-maid-card:hover{
  transform:translateY(-4px);
  box-shadow:0 12px 32px rgba(14,78,94,0.13);
  border-color:rgba(14,78,94,0.3);
}
@keyframes cardPop{from{opacity:0;transform:scale(0.94)}to{opacity:1;transform:none}}

.cm-maid-photo{position:relative;width:100%;aspect-ratio:3/4;background:#e5eef1;}
.cm-maid-photo img{width:100%;height:100%;object-fit:cover;object-position:top;display:block;}
.cm-maid-overlay{
  position:absolute;inset-x-0;bottom:0;height:60px;
  background:linear-gradient(to top,rgba(9,28,34,0.75),transparent);
}
.cm-maid-name{
  position:absolute;bottom:0.45rem;left:0.45rem;right:0.45rem;
  font-size:0.7rem;font-weight:700;color:#fff;
  text-shadow:0 1px 3px rgba(0,0,0,0.5);
  white-space:nowrap;overflow:hidden;text-overflow:ellipsis;
}
.cm-maid-badge{
  position:absolute;top:0.4rem;left:0.4rem;
  padding:0.15rem 0.45rem;
  border-radius:5px;font-size:0.6rem;font-weight:800;
  letter-spacing:0.06em;text-transform:uppercase;
}
.cm-maid-badge-new     {background:var(--teal);color:#fff;}
.cm-maid-badge-transfer{background:#3b82f6;color:#fff;}
.cm-maid-badge-exsg    {background:var(--amber);color:var(--teal);}
.cm-maid-video-badge{
  position:absolute;top:0.4rem;right:0.4rem;
  display:inline-flex;align-items:center;gap:0.2rem;
  padding:0.15rem 0.45rem;
  border-radius:5px;background:#7c3aed;
  font-size:0.6rem;font-weight:700;color:#fff;
}
.cm-maid-info{padding:0.6rem 0.65rem;display:flex;flex-direction:column;gap:0.35rem;}
.cm-maid-ref{font-size:0.6rem;color:var(--ink-4);font-family:monospace;letter-spacing:0.08em;text-transform:uppercase;}
.cm-maid-pills{display:flex;flex-wrap:wrap;gap:0.3rem;}
.cm-pill-nat{
  display:inline-flex;align-items:center;gap:0.3rem;
  background:var(--surface);border-radius:5px;
  padding:0.18rem 0.45rem;
  font-size:0.65rem;font-weight:600;color:var(--ink-3);
}
.cm-pill-duty{
  background:var(--teal-pale);border:1px solid rgba(14,78,94,0.14);
  border-radius:5px;padding:0.18rem 0.45rem;
  font-size:0.65rem;font-weight:600;color:var(--teal-2);
}

/* Locked card */
.cm-locked-card{
  border-radius:var(--r-lg);border:1px solid var(--rule-2);
  background:var(--surface);overflow:hidden;cursor:pointer;
  transition:border-color 0.2s,box-shadow 0.2s;
}
.cm-locked-card:hover{border-color:rgba(14,78,94,0.2);box-shadow:0 4px 16px rgba(14,78,94,0.07);}
.cm-locked-photo{
  aspect-ratio:3/4;
  display:flex;flex-direction:column;align-items:center;justify-content:center;gap:0.75rem;
  background:linear-gradient(135deg,#e8eef1,#d4e4ea);
}
.cm-locked-icon{
  width:40px;height:40px;border-radius:var(--r-md);
  background:rgba(14,78,94,0.08);
  display:flex;align-items:center;justify-content:center;
}
.cm-locked-lines{display:flex;flex-direction:column;gap:0.45rem;width:60%;}
.cm-locked-line{height:5px;border-radius:3px;background:rgba(14,78,94,0.12);}
.cm-locked-footer{
  padding:0.5rem;text-align:center;
  font-size:0.65rem;font-weight:700;color:var(--teal-2);
  letter-spacing:0.06em;text-transform:uppercase;
  border-top:1px solid var(--rule-2);
}

/* Login gate banner */
.cm-gate {
  border-radius:var(--r-xl);border:1.5px solid rgba(252,211,77,0.4);
  background:linear-gradient(120deg,rgba(252,211,77,0.06),rgba(14,78,94,0.04));
  overflow:hidden;
  animation:panelIn 0.45s ease both;
}
.cm-gate-inner {
  display:grid;gap:1.25rem;padding:1.25rem 1.5rem;
  align-items:center;
}
@media(min-width:640px){.cm-gate-inner{grid-template-columns:1fr auto;}}
.cm-gate-icon {
  width:44px;height:44px;border-radius:var(--r-md);flex-shrink:0;
  background:linear-gradient(135deg,var(--amber),#f59e0b);
  display:flex;align-items:center;justify-content:center;
  box-shadow:0 3px 12px rgba(252,211,77,0.4);
}
.cm-gate-title{font-size:0.95rem;font-weight:800;color:var(--teal);margin-bottom:0.25rem;}
.cm-gate-sub{font-size:0.82rem;color:var(--ink-3);line-height:1.6;}
.cm-gate-btns{display:flex;flex-wrap:wrap;gap:0.6rem;flex-shrink:0;}
.cm-gate-btn-primary{
  padding:0.65rem 1.25rem;border-radius:var(--r-md);border:none;cursor:pointer;
  background:linear-gradient(135deg,var(--amber),#f59e0b);
  color:var(--teal);font-size:0.82rem;font-weight:800;font-family:'Inter',sans-serif;
  box-shadow:0 2px 10px rgba(252,211,77,0.4);
  transition:transform 0.15s,box-shadow 0.15s;
}
.cm-gate-btn-primary:hover{transform:translateY(-1px);box-shadow:0 5px 18px rgba(252,211,77,0.45);}
.cm-gate-btn-outline{
  padding:0.65rem 1.25rem;border-radius:var(--r-md);cursor:pointer;
  background:#fff;border:1.5px solid rgba(252,211,77,0.45);
  color:var(--teal);font-size:0.82rem;font-weight:700;font-family:'Inter',sans-serif;
  transition:background 0.15s,border-color 0.15s;
}
.cm-gate-btn-outline:hover{background:rgba(252,211,77,0.08);border-color:rgba(252,211,77,0.65);}

/* Loading / empty states */
.cm-state-box{
  display:flex;flex-direction:column;align-items:center;justify-content:center;
  gap:1rem;padding:5rem 2rem;text-align:center;
}
.cm-spinner{
  width:36px;height:36px;border-radius:50%;
  border:3px solid var(--rule);border-top-color:var(--teal);
  animation:spin 0.7s linear infinite;
}
@keyframes spin{to{transform:rotate(360deg)}}
.cm-state-icon{
  width:56px;height:56px;border-radius:var(--r-lg);
  background:var(--teal-pale);
  display:flex;align-items:center;justify-content:center;
}
.cm-state-title{font-size:0.95rem;font-weight:800;color:var(--ink-2);}
.cm-state-sub{font-size:0.82rem;color:var(--ink-4);margin-top:0.25rem;}

/* ── Agency CTA strip ── */
.cm-cta {
  border-radius:var(--r-xl);overflow:hidden;
  background:linear-gradient(130deg,#091c22 0%,var(--teal) 50%,var(--teal-2) 100%);
  box-shadow:0 8px 32px rgba(14,78,94,0.18);
  animation:panelIn 0.5s ease 0.15s both;
  position:relative;
}
.cm-cta-blob-1{
  position:absolute;top:-60px;right:-40px;
  width:240px;height:240px;border-radius:50%;
  background:radial-gradient(circle,rgba(252,211,77,0.18) 0%,transparent 68%);
  animation:blobPulse 7s ease-in-out infinite alternate;
  pointer-events:none;
}
.cm-cta-blob-2{
  position:absolute;bottom:-50px;left:-30px;
  width:180px;height:180px;border-radius:50%;
  background:radial-gradient(circle,rgba(14,78,94,0.35) 0%,transparent 65%);
  animation:blobPulse 10s ease-in-out infinite alternate-reverse;
  pointer-events:none;
}
.cm-cta-inner {
  position:relative;z-index:1;
  display:grid;gap:1.5rem;align-items:center;
  padding:2rem 1.75rem;
}
@media(min-width:640px){.cm-cta-inner{grid-template-columns:1fr auto;}}
.cm-cta-eyebrow {
  display:inline-flex;align-items:center;gap:0.45rem;
  padding:0.28rem 0.8rem;border-radius:100px;
  background:rgba(252,211,77,0.12);border:1px solid rgba(252,211,77,0.25);
  font-size:0.65rem;font-weight:700;color:rgba(252,211,77,0.9);
  letter-spacing:0.08em;text-transform:uppercase;
  margin-bottom:0.85rem;
}
.cm-cta-title {
  font-family:'Syne',sans-serif;
  font-size:1.4rem;font-weight:800;color:#fff;
  line-height:1.15;letter-spacing:-0.01em;margin-bottom:0.6rem;
}
.cm-cta-sub{font-size:0.85rem;color:rgba(255,255,255,0.58);line-height:1.65;max-width:420px;margin-bottom:1rem;}
.cm-cta-features{display:flex;flex-wrap:wrap;gap:0.5rem;}
.cm-cta-feat {
  display:inline-flex;align-items:center;gap:0.45rem;
  padding:0.38rem 0.75rem;border-radius:var(--r-sm);
  background:rgba(255,255,255,0.07);border:1px solid rgba(255,255,255,0.12);
  font-size:0.73rem;font-weight:600;color:rgba(255,255,255,0.82);
}
.cm-cta-filter-preview{
  border-radius:var(--r-md);border:1px solid rgba(255,255,255,0.12);
  background:rgba(255,255,255,0.06);
  padding:0.85rem 1rem;margin-bottom:1rem;min-width:200px;
}
.cm-cta-filter-lbl{
  font-size:0.6rem;font-weight:800;letter-spacing:0.14em;
  text-transform:uppercase;color:rgba(255,255,255,0.45);margin-bottom:0.6rem;
}
.cm-cta-filter-pills{display:flex;flex-wrap:wrap;gap:0.4rem;}
.cm-cta-filter-pill {
  padding:0.22rem 0.6rem;border-radius:var(--r-sm);
  background:rgba(255,255,255,0.1);border:1px solid rgba(255,255,255,0.15);
  font-size:0.68rem;font-weight:600;color:rgba(255,255,255,0.85);
}
.cm-cta-btn {
  display:inline-flex;align-items:center;gap:0.55rem;
  padding:0.85rem 1.5rem;border-radius:var(--r-md);
  border:none;cursor:pointer;
  background:linear-gradient(135deg,var(--amber),#f59e0b);
  color:var(--teal);font-size:0.9rem;font-weight:800;font-family:'Inter',sans-serif;
  box-shadow:0 4px 20px rgba(252,211,77,0.35);
  transition:transform 0.18s,box-shadow 0.18s;
  position:relative;overflow:hidden;
}
.cm-cta-btn::before{
  content:'';position:absolute;inset:0;
  background:linear-gradient(105deg,transparent 20%,rgba(255,255,255,0.2) 50%,transparent 80%);
  transform:translateX(-130%);transition:transform 0.5s ease;
}
.cm-cta-btn:hover::before{transform:translateX(130%);}
.cm-cta-btn:hover{transform:translateY(-2px);box-shadow:0 8px 28px rgba(252,211,77,0.45);}

/* ── Request form ── */
.cm-request {
  border-radius:var(--r-xl);border:1px solid var(--rule);
  background:var(--white);overflow:hidden;
  box-shadow:0 8px 32px rgba(14,78,94,0.10);
  animation:panelIn 0.5s cubic-bezier(0.22,1,0.36,1) both;
}
.cm-request-header {
  padding:1.75rem 1.75rem 1.5rem;
  background:linear-gradient(130deg,#091c22 0%,var(--teal) 55%,var(--teal-2) 100%);
  position:relative;overflow:hidden;
}
.cm-request-header-blob{
  position:absolute;top:-40px;right:-20px;
  width:160px;height:160px;border-radius:50%;
  background:radial-gradient(circle,rgba(252,211,77,0.18) 0%,transparent 68%);
  pointer-events:none;
  animation:blobPulse 6s ease-in-out infinite alternate;
}
.cm-req-eyebrow{
  display:inline-flex;align-items:center;gap:0.45rem;
  padding:0.28rem 0.8rem;border-radius:100px;
  background:rgba(252,211,77,0.12);border:1px solid rgba(252,211,77,0.25);
  font-size:0.65rem;font-weight:700;color:rgba(252,211,77,0.9);
  letter-spacing:0.08em;text-transform:uppercase;
  margin-bottom:0.85rem;
}
.cm-req-title{
  font-family:'Syne',sans-serif;
  font-size:1.35rem;font-weight:800;color:#fff;line-height:1.15;
  letter-spacing:-0.01em;margin-bottom:0.4rem;
}
.cm-req-sub{font-size:0.82rem;color:rgba(255,255,255,0.88);line-height:1.6;max-width:380px;}
.cm-req-back{
  position:absolute;top:1.25rem;right:1.25rem;z-index:1;
  display:inline-flex;align-items:center;gap:0.4rem;
  padding:0.42rem 0.9rem;border-radius:var(--r-sm);
  background:rgba(255,255,255,0.1);border:1px solid rgba(255,255,255,0.2);
  color:#fff;font-size:0.75rem;font-weight:600;cursor:pointer;
  transition:background 0.15s;
}
.cm-req-back:hover{background:rgba(255,255,255,0.18);}
.cm-req-prefill{
  margin-top:1rem;padding:0.75rem 1rem;
  border-radius:var(--r-md);
  background:rgba(255,255,255,0.07);border:1px solid rgba(255,255,255,0.12);
}
.cm-req-prefill-lbl{
  font-size:0.6rem;font-weight:800;letter-spacing:0.14em;
  text-transform:uppercase;color:rgba(255,255,255,0.45);margin-bottom:0.55rem;
}
.cm-req-prefill-pills{display:flex;flex-wrap:wrap;gap:0.4rem;}
.cm-req-prefill-pill{
  padding:0.22rem 0.6rem;border-radius:var(--r-sm);
  background:rgba(255,255,255,0.1);border:1px solid rgba(255,255,255,0.15);
  font-size:0.7rem;font-weight:600;color:rgba(255,255,255,0.88);
}

/* Form sections */
.cm-form-section{padding:1.25rem 1.5rem;border-bottom:1px solid var(--rule-2);}
.cm-form-step{display:flex;align-items:center;gap:0.65rem;margin-bottom:1rem;}
.cm-step-num{
  width:26px;height:26px;border-radius:var(--r-sm);flex-shrink:0;
  background:linear-gradient(135deg,var(--teal),var(--teal-2));
  display:flex;align-items:center;justify-content:center;
  font-size:0.7rem;font-weight:800;color:#fff;
}
.cm-step-label{font-size:0.85rem;font-weight:700;color:#0b1f25;}
.cm-form-grid{display:grid;gap:0.9rem;}
@media(min-width:560px){.cm-form-grid{grid-template-columns:1fr 1fr;}}
.cm-lbl{
  display:block;font-size:0.62rem;font-weight:800;
  letter-spacing:0.1em;text-transform:uppercase;
  color:#274a55;margin-bottom:0.4rem;
}
.cm-req-star{color:#dc2626;font-size:0.7rem;font-weight:400;text-transform:none;letter-spacing:0;}
.cm-form-input{
  width:100%;border:1.5px solid var(--rule);border-radius:var(--r-sm);
  background:var(--surface);padding:0.68rem 0.9rem;
  font-size:0.85rem;font-family:'Inter',sans-serif;color:var(--ink);
  outline:none;box-sizing:border-box;
  transition:border-color 0.2s,box-shadow 0.2s,background 0.2s;
}
.cm-form-input::placeholder{color:var(--ink-4);font-weight:300;}
.cm-form-input:focus{
  border-color:var(--teal-3);background:var(--white);
  box-shadow:0 0 0 3px rgba(14,78,94,0.1);
}
.cm-form-select{
  width:100%;border:1.5px solid var(--rule);border-radius:var(--r-sm);
  background:var(--surface);padding:0.68rem 2.2rem 0.68rem 0.9rem;
  font-size:0.85rem;font-family:'Inter',sans-serif;color:var(--ink);
  outline:none;box-sizing:border-box;appearance:none;cursor:pointer;
  transition:border-color 0.2s,box-shadow 0.2s,background 0.2s;
}
.cm-form-select:focus{border-color:var(--teal-3);background:var(--white);box-shadow:0 0 0 3px rgba(14,78,94,0.1);}
.cm-form-textarea{
  width:100%;border:1.5px solid var(--rule);border-radius:var(--r-sm);
  background:var(--surface);padding:0.68rem 0.9rem;
  font-size:0.85rem;font-family:'Inter',sans-serif;color:var(--ink);
  outline:none;box-sizing:border-box;resize:none;
  transition:border-color 0.2s,box-shadow 0.2s,background 0.2s;
}
.cm-form-textarea:focus{border-color:var(--teal-3);background:var(--white);box-shadow:0 0 0 3px rgba(14,78,94,0.1);}

/* Form footer */
.cm-form-footer{
  display:flex;flex-wrap:wrap;gap:0.75rem;
  align-items:center;justify-content:flex-end;
  padding:1rem 1.5rem;
  background:rgba(14,78,94,0.02);
}
.cm-btn-submit{
  display:inline-flex;align-items:center;gap:0.55rem;
  padding:0.78rem 1.75rem;border-radius:var(--r-md);
  border:none;cursor:pointer;
  background:linear-gradient(130deg,var(--teal),var(--teal-2));
  color:#fff;font-size:0.875rem;font-weight:700;font-family:'Inter',sans-serif;
  box-shadow:0 3px 14px rgba(14,78,94,0.25),inset 0 1px 0 rgba(255,255,255,0.07);
  transition:transform 0.18s,box-shadow 0.18s,opacity 0.18s;
  position:relative;overflow:hidden;min-width:150px;justify-content:center;
}
.cm-btn-submit::before{
  content:'';position:absolute;inset:0;
  background:linear-gradient(105deg,transparent 20%,rgba(252,211,77,0.15) 50%,transparent 80%);
  transform:translateX(-130%);transition:transform 0.55s ease;
}
.cm-btn-submit:hover::before{transform:translateX(130%);}
.cm-btn-submit:hover:not(:disabled){
  background:linear-gradient(130deg,var(--teal-2),var(--teal-3));
  box-shadow:0 6px 22px rgba(14,78,94,0.28);transform:translateY(-1px);
}
.cm-btn-submit:disabled{opacity:0.55;cursor:not-allowed;}
.cm-btn-cancel{
  padding:0.68rem 1.25rem;border-radius:var(--r-md);cursor:pointer;
  background:#fff;border:1.5px solid var(--rule);
  color:var(--ink-3);font-size:0.85rem;font-weight:600;font-family:'Inter',sans-serif;
  transition:background 0.15s;
}
.cm-btn-cancel:hover{background:var(--surface);}
.cm-btn-spinner{
  width:14px;height:14px;border-radius:50%;
  border:2px solid rgba(255,255,255,0.25);border-top-color:#fff;
  animation:spin 0.65s linear infinite;
}

/* ── Footer ── */
.cm-footer {
  background: var(--ink);
  padding: 64px 0 0;
  position: relative;
  z-index: 1;
}
.cm-footer-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 36px;
  margin-bottom: 48px;
}
@media(min-width:640px) { .cm-footer-grid { grid-template-columns: 1fr 1fr; } }
@media(min-width:960px) { .cm-footer-grid { grid-template-columns: 1.4fr 1fr 1.2fr 1.2fr 0.8fr; } }
.cm-footer-inner {
  max-width: 1280px;
  margin: 0 auto;
  padding: 0 24px;
}
.cm-footer-heading {
  font-size: 11px;
  font-weight: 700;
  color: #fff;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  margin: 0 0 16px;
  font-family: 'Inter', sans-serif;
}
.cm-footer-link-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.cm-footer-link {
  color: #fff;
  font-size: 13px;
  text-decoration: none;
  transition: color 0.15s;
  font-family: 'Inter', sans-serif;
}
.cm-footer-link:hover { color: var(--amber); }
.cm-footer-contact-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
  font-size: 13px;
  color: #fff;
  font-family: 'Inter', sans-serif;
  line-height: 1.6;
}
.cm-footer-social-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: 8px;
  border: 1.5px solid rgba(255,255,255,0.18);
  color: #1877F2;
  transition: all 0.15s;
  text-decoration: none;
}
.cm-footer-social-btn:hover {
  color: var(--ink);
  background: #1877F2;
  border-color: #1877F2;
}
.cm-footer-bottom {
  border-top: 1px solid rgba(255,255,255,0.1);
  padding: 20px 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 12px;
}
.cm-footer-copyright {
  font-size: 12px;
  color: #fff;
  margin: 0;
  font-family: 'Inter', sans-serif;
}
.cm-footer-legal {
  display: flex;
  gap: 6px;
}
.cm-footer-legal-link {
  font-size: 12px;
  color: #fff;
  text-decoration: none;
  padding: 0 8px;
  font-family: 'Inter', sans-serif;
  transition: color 0.15s;
}
.cm-footer-legal-link:hover { color: var(--amber); }

/* Accessibility baseline: keep all readable UI copy at 16px or larger and
   use a high-contrast dark ink on light surfaces. Dark sections deliberately
   retain their light text for contrast. */
.cm-root {
  font-size:16px;
  color:#091c22;
  --ink-2:#091c22;
  --ink-3:#19353d;
  --ink-4:#294952;
}
.cm-classic-filter,
.cm-classic-input,.cm-classic-select,
.cm-classic-heading,
.cm-panel-title,.cm-btn-collapse,.cm-btn-clear,
.cm-tag,.cm-section-lbl,.cm-input,.cm-select,.cm-chip,
.cm-filter-section-title,.cm-maid-name,.cm-maid-ref,.cm-maid-meta,
.cm-gate-title,.cm-gate-sub,.cm-state-title,.cm-state-sub,
.cm-step-label,.cm-form-label,.cm-form-input,.cm-form-select,.cm-form-textarea {
  font-size:16px;
}
.cm-classic-filter,.cm-classic-input,.cm-classic-select,
.cm-classic-heading,.cm-panel-title,.cm-btn-collapse,.cm-btn-clear,
.cm-tag,.cm-section-lbl,.cm-input,.cm-select,.cm-chip,
.cm-filter-section-title,.cm-maid-name,.cm-maid-ref,.cm-maid-meta,
.cm-gate-title,.cm-gate-sub,.cm-state-title,.cm-state-sub,
.cm-step-label,.cm-form-label,.cm-form-input,.cm-form-select,.cm-form-textarea {
  color:#091c22;
}
.cm-root p,.cm-root button,.cm-root input,.cm-root select,.cm-root textarea,
.cm-hero-eyebrow,.cm-hero-sub,.cm-hero-step,.cm-trust-val,.cm-trust-lbl,
.cm-count-badge,.cm-maid-badge,.cm-maid-status,.cm-cta-eyebrow,.cm-cta-sub,
.cm-cta-feat,.cm-cta-filter-lbl,.cm-cta-filter-pill,.cm-req-eyebrow,
.cm-req-sub,.cm-req-back,.cm-req-filter-lbl,.cm-req-filter-pill,
.cm-step-num,.cm-req-star,.cm-footer-copyright,.cm-footer-legal-link {
  font-size:16px !important;
}
`;

/* ═══════════════════════════════════════════════════════════════════════════
   SMALL COMPONENTS
═══════════════════════════════════════════════════════════════════════════ */

/* Chip */
const Chip = ({ label, checked, onChange, variant = "teal" }: {
  label:string; checked:boolean; onChange:()=>void;
  variant?: "teal"|"amber"|"blue";
}) => {
  const onCls = variant==="amber" ? "cm-chip-on-amber" : variant==="blue" ? "cm-chip-on-blue" : "cm-chip-on";
  return (
    <button type="button" onClick={onChange}
      className={`cm-chip ${checked ? onCls : ""}`}>
      {checked && <CheckCircle2 size={10} style={{flexShrink:0}} />}
      {label}
    </button>
  );
};

/* Filter tag */
const FilterTag = ({ label, onRemove }: { label:string; onRemove:()=>void }) => (
  <span className="cm-tag">
    {label}
    <button type="button" className="cm-tag-x" onClick={onRemove} aria-label={`Remove ${label}`}>
      <X size={9} />
    </button>
  </span>
);

/* Accordion */
const FilterSection = ({ title, children, count, defaultOpen=false, icon }: {
  title:string; children:React.ReactNode; count?:number; defaultOpen?:boolean; icon?:React.ReactNode;
}) => {
  const [open, setOpen] = useState(defaultOpen || (!!count && count>0));
  return (
    <div className="cm-accordion">
      <button type="button" className="cm-accordion-btn" onClick={()=>setOpen(v=>!v)}>
        <span className="cm-accordion-title">
          {icon && <span style={{color:T.teal3}}>{icon}</span>}
          {title}
          {!!count && count>0 && <span className="cm-count-badge">{count}</span>}
        </span>
        <ChevronDown size={13} style={{color:"var(--ink-4)",flexShrink:0,
          transform:open?"rotate(180deg)":"none",transition:"transform 0.2s"}} />
      </button>
      {open && <div className="cm-accordion-body">{children}</div>}
    </div>
  );
};

/* Maid type badge class */
const maidBadgeCls = (mt?:string) => {
  const t=(mt||"").toLowerCase();
  if(t.includes("new"))      return {cls:"cm-maid-badge cm-maid-badge-new",     label:"New"};
  if(t.includes("transfer")) return {cls:"cm-maid-badge cm-maid-badge-transfer", label:"Transfer"};
  return                            {cls:"cm-maid-badge cm-maid-badge-exsg",     label:"Ex-SG"};
};

/* Locked maid card */
const LockedMaidCard = ({ onClick }: {onClick:()=>void}) => (
  <div
    className="cm-locked-card"
    onClick={onClick}
    role="button"
    tabIndex={0}
    aria-label="Log in to view maid profile"
    onKeyDown={(e)=>{
      if(e.key==="Enter"||e.key===" "){ if(e.key===" ") e.preventDefault(); onClick(); }
    }}
  >
    <div className="cm-locked-photo">
      <div className="cm-locked-icon"><Lock size={16} style={{color:"var(--teal-2)"}} /></div>
      <div className="cm-locked-lines">
        <div className="cm-locked-line" style={{width:"80%"}} />
        <div className="cm-locked-line" style={{width:"55%"}} />
      </div>
    </div>
    <div className="cm-locked-footer">🔒 Login to view</div>
  </div>
);

/* Maid card */
const MaidCard = ({ maid, onViewProfile, locked, onLoginClick }:{
  maid:MaidProfile; onViewProfile:(m:MaidProfile)=>void;
  locked:boolean; onLoginClick:()=>void;
}) => {
  if(locked) return <LockedMaidCard onClick={onLoginClick}/>;
  const flagCode = getNationalityCode(maid.nationality);
  const badge = maidBadgeCls(maid.maidType);
  return (
    <div
      className="cm-maid-card"
      onClick={()=>onViewProfile(maid)}
      role="button"
      tabIndex={0}
      aria-label={`View ${maid.name}'s profile`}
      onKeyDown={(e)=>{
        if(e.key==="Enter"||e.key===" "){ if(e.key===" ") e.preventDefault(); onViewProfile(maid); }
      }}
    >
      <div className="cm-maid-photo">
        {(maid.photoUrl || maid.refCode)
          ? <AuthenticatedMaidImage maid={maid} />
          : <div style={{width:"100%",height:"100%",display:"flex",alignItems:"center",
              justifyContent:"center",background:"linear-gradient(135deg,#e0edf1,#c8dde4)"}}>
              <Users size={24} style={{color:"var(--teal-4)",opacity:0.4}} />
            </div>
        }
        <div className="cm-maid-overlay" />
        {maid.maidType && <span className={badge.cls}>{badge.label}</span>}
        {maid.hasVideo && <span className="cm-maid-video-badge">▶ Video</span>}
        <div className="cm-maid-name">{maid.name}</div>
      </div>
      <div className="cm-maid-info">
        {maid.refCode && <p className="cm-maid-ref">{maid.refCode}</p>}
        <div className="cm-maid-pills">
          {maid.nationality && (
            <span className="cm-pill-nat">
              <FlagCircle code={flagCode} />{maid.nationality}
            </span>
          )}
          {maid.age && <span className="cm-pill-nat">{maid.age}y</span>}
        </div>
        {maid.duties?.slice(0,1).map(d=>(
          <span key={d} className="cm-pill-duty">{d}</span>
        ))}
      </div>
    </div>
  );
};

/* Login gate banner */
const LoginGateBanner = ({ onLoginClick }:{onLoginClick:()=>void}) => (
  <div className="cm-gate">
    <div className="cm-gate-inner">
      <div style={{display:"flex",alignItems:"flex-start",gap:"1rem"}}>
        <div className="cm-gate-icon"><Lock size={18} color={T.teal} /></div>
        <div>
          <p className="cm-gate-title">Profiles are hidden until you log in</p>
          <p className="cm-gate-sub">Create a free account or log in to view names, photos, full biodata, and contact details.</p>
        </div>
      </div>
      <div className="cm-gate-btns">
        <button className="cm-gate-btn-primary" onClick={onLoginClick}>Log in to unlock</button>
        <button className="cm-gate-btn-outline" onClick={onLoginClick}>Create account</button>
      </div>
    </div>
  </div>
);

const ClassicFilterPanel = ({draft,set,toggle,chooseNoPreference,onSearch,onClear}:{
  draft:Filters;
  set:(key:keyof Filters,value:boolean|string)=>void;
  toggle:(key:keyof Filters)=>void;
  chooseNoPreference:(key:keyof Filters,specifics:readonly (keyof Filters)[])=>void;
  onSearch:()=>void;
  onClear:()=>void;
}) => {
  const groups:[string,[keyof Filters,string][],keyof Filters][] = [
    ["Nationality",[["natFilipino","Filipino"],["natIndonesian","Indonesian"],["natMyanmar","Myanmar"],["natIndian","Indian"],["natSriLankan","Sri Lankan"],["natCambodian","Cambodian"],["natBangladeshi","Bangladeshi"],["natOthers","Others"]],"natNoPreference"],
    ["Working Experience",[["expHomeCountry","Home Country"],["expSingapore","Singapore"],["expMalaysia","Malaysia"],["expHongKong","Hong Kong"],["expTaiwan","Taiwan"],["expMiddleEast","Middle East"],["expOtherCountries","Other Countries"]],"expNoPreference"],
    ["Duty",[["dutyCareInfant","Care for Infant"],["dutyCareYoungChildren","Care for Young Children"],["dutyCareElderlyDisabled","Care for Elderly/Disabled"],["dutyCooking","Cooking"],["dutyGeneralHousekeeping","General Housekeeping"]],"dutyNoPreference"],
    ["Language",[["langEnglish","English"],["langMandarin","Mandarin/Chinese-Dialect"],["langBahasaIndonesia","Bahasa Indonesia/Malaysia"],["langHindi","Hindi"],["langTamil","Tamil"]],"langNoPreference"],
    ["Education",[["eduCollege","College"],["eduHighSchool","High School"],["eduSecondary","Secondary"],["eduPrimary","Primary"]],"eduNoPreference"],
    ["Religion",[["relFreeThinker","Free Thinker"],["relChristian","Christian"],["relCatholic","Catholic"],["relBuddhist","Buddhist"],["relMuslim","Muslim"],["relHindu","Hindu"],["relSikh","Sikh"],["relOthers","Others"]],"relNoPreference"],
  ];
  return (
    <div className="cm-panel">
      <div className="cm-classic-filter">
        <div className="cm-classic-head">
          <div>
            <h2 className="cm-classic-title">Search Maid Profiles</h2>
            <p className="cm-classic-subtitle">Select one or more preferences to narrow your results.</p>
          </div>
          <span className="cm-classic-count" title="Active filters">
            {Object.entries(draft).filter(([key,value])=>
              key !== "agencyPreference" &&
              ((typeof value==="boolean" && value && !key.endsWith("NoPreference")) ||
                (typeof value==="string" && value!=="" && value!=="No Preference"))
            ).length}
          </span>
        </div>
        <div className="cm-classic-body">
        <div className="cm-classic-row">
          <label className="cm-classic-label" htmlFor="maid-keywords">Keywords</label>
          <input id="maid-keywords" className="cm-classic-input"
            placeholder="Enter search keywords such as: Filipino maid, baby sitter, etc."
            value={draft.keyword} onChange={e=>set("keyword",e.target.value)}
            onKeyDown={e=>e.key==="Enter"&&onSearch()}/>
        </div>
        <div className="cm-classic-row">
          <label className="cm-classic-label" htmlFor="biodata-created">Bio-data Created within</label>
          <select id="biodata-created" className="cm-classic-select" value={draft.biodataCreatedWithin}
            onChange={e=>set("biodataCreatedWithin",e.target.value)}>
            {["No Preference","Last 3 days","Last 7 days","Last 15 days"].map(o=><option key={o}>{o}</option>)}
          </select>
        </div>
        <div className="cm-classic-row">
          <span className="cm-classic-label">Maid Type</span>
          <div className="cm-classic-radio-row">
            {(["New Maid","Transfer Maid","Ex-Singapore Maid"] as const).map(type=>(
              <label className="cm-classic-option" key={type}>
                <input type="radio" name="maid-type" checked={draft.maidType===type} onChange={()=>set("maidType",type)}/>{type}
              </label>
            ))}
          </div>
        </div>
        <div className="cm-classic-check-row cm-classic-quick">
          {([["willingOffDays","Willing to work on off-days"],["hasChildren","Has Children"],["withVideo","With Video"]] as [keyof Filters,string][]).map(([key,label])=>(
            <label className="cm-classic-option" key={key}>
              <input type="checkbox" checked={Boolean(draft[key])} onChange={()=>toggle(key)}/>{label}
            </label>
          ))}
        </div>
        <div className="cm-classic-grid">
          {groups.map(([title,options,noPreference])=>(
            <section className="cm-classic-group" key={title}>
              <h3 className="cm-classic-heading">{title}</h3>
              <div className="cm-classic-options">
                {options.map(([key,label])=>(
                  <label className="cm-classic-option" key={key}>
                    <input type="checkbox" checked={Boolean(draft[key])} onChange={()=>toggle(key)}/>{label}
                  </label>
                ))}
                <label className="cm-classic-option">
                  <input type="checkbox" checked={Boolean(draft[noPreference])}
                    onChange={()=>chooseNoPreference(noPreference,options.map(([key])=>key))}/>No Preference
                </label>
              </div>
            </section>
          ))}
        </div>
        <div className="cm-classic-actions">
          <button type="button" className="cm-classic-search" onClick={onSearch}>Search Maids</button>
          <button type="button" className="cm-classic-clear" onClick={onClear}>Clear</button>
        </div>
        </div>
      </div>
    </div>
  );
};

/* Search results */
const SearchResults = ({ maids, isLoggedIn, isLoading, onLoginClick, onViewProfile }:{
  maids:MaidProfile[]; isLoggedIn:boolean; isLoading:boolean;
  onLoginClick:()=>void; onViewProfile:(m:MaidProfile)=>void;
}) => {
  if(isLoading) return (
    <div className="cm-results">
      <div className="cm-state-box">
        <div className="cm-spinner" />
        <p className="cm-state-sub" style={{marginTop:0}}>Finding matches…</p>
      </div>
    </div>
  );
  if(maids.length===0) return (
    <div className="cm-results" style={{border:"2px dashed var(--rule)"}}>
      <div className="cm-state-box">
        <div className="cm-state-icon"><Search size={22} style={{color:"var(--ink-4)"}} /></div>
        <p className="cm-state-title">No profiles found</p>
        <p className="cm-state-sub">Try adjusting your filters or broadening your search.</p>
      </div>
    </div>
  );
  return (
    <div style={{display:"flex",flexDirection:"column",gap:"1rem"}}>
      {!isLoggedIn && <LoginGateBanner onLoginClick={onLoginClick}/>}
      <div className="cm-results">
        <div className="cm-results-header">
          <div className="cm-results-title">
            <div className="cm-panel-icon"><Users size={14} color="#fff" /></div>
            {maids.length} profile{maids.length!==1?"s":""} found
          </div>
          {!isLoggedIn && (
            <span style={{display:"flex",alignItems:"center",gap:"0.35rem",
              fontSize:"0.72rem",fontWeight:600,color:"var(--ink-4)"}}>
              <Lock size={11}/> Log in to see full details
            </span>
          )}
        </div>
        <div className="cm-maid-grid">
          {maids.map(m=>(
            <MaidCard key={m.id} maid={m} onViewProfile={onViewProfile}
              locked={!isLoggedIn} onLoginClick={onLoginClick}/>
          ))}
        </div>
      </div>
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════════════════════
   REQUEST FORM
═══════════════════════════════════════════════════════════════════════════ */


/* ═══════════════════════════════════════════════════════════════════════════
   FOOTER
═══════════════════════════════════════════════════════════════════════════ */
const SiteFooter = () => (
  <footer className="cm-footer">
    <div className="cm-footer-inner">
      <div className="cm-footer-grid">

        {/* Brand */}
        <div>
          <h4 style={{ fontSize: 17, fontWeight: 700, color: "#fff", margin: "0 0 12px", fontFamily: "'Inter', sans-serif" }}>
            "Find Maids" At The Agency
          </h4>
          <p style={{ fontSize: 13, color: "rgba(255,255,255,0.7)", lineHeight: 1.7, margin: 0, fontFamily: "'Inter', sans-serif" }}>
            Matching trusted domestic professionals with families since 2009.
          </p>
        </div>

        {/* Quick Links */}
        <div>
          <h5 className="cm-footer-heading">Quick Links</h5>
          <ul className="cm-footer-link-list">
            {[
              { label: "Home",         to: "/"             },
              { label: "Search Maids", to: "/search-maids" },
              { label: "About Us",     to: "/about"        },
              { label: "Agency",       to: "/agency"       },
              { label: "Enquiry",      to: "/enquiry2"     },
              { label: "FAQ",          to: "/faq"          },
            ].map((item) => (
              <li key={item.to}>
                <Link to={item.to} className="cm-footer-link">{item.label}</Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Contact Us */}
        <div>
          <h5 className="cm-footer-heading">Contact Us</h5>
          <ul className="cm-footer-contact-list">
            <li style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
              <MapPin size={16} color="var(--amber)" style={{ flexShrink: 0, marginTop: 2 }} />
              <span>3 Jalan Kukoh, #01-115<br />Singapore 161003</span>
            </li>
            <li style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <Mail size={16} color="var(--amber)" style={{ flexShrink: 0 }} />
              <a href="mailto:enquiries.j1@gmail.com" className="cm-footer-link">
                enquiries.j1@gmail.com
              </a>
            </li>
            <li style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <Phone size={16} color="var(--amber)" style={{ flexShrink: 0 }} />
              <a href="tel:+6580730757" className="cm-footer-link">+65 8073 0757</a>
            </li>
          </ul>
        </div>

        {/* Opening Hours */}
        <div>
          <h5 className="cm-footer-heading">Opening Hours</h5>
          <ul className="cm-footer-contact-list">
            <li style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
              <Clock size={16} color="var(--amber)" style={{ flexShrink: 0, marginTop: 2 }} />
              <span>Mon to Sun: 11:00am to 11:00pm</span>
            </li>
            <li style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
              <MessageCircle size={16} color="var(--amber)" style={{ flexShrink: 0, marginTop: 2 }} />
              <span>Other hours: by mobile. If unable to reach us urgently, please SMS.</span>
            </li>
          </ul>
        </div>

        {/* Follow Us */}
        <div>
          <h5 className="cm-footer-heading">Follow Us</h5>
          <div style={{ display: "flex", gap: 10 }}>
            <a href="https://www.facebook.com/share/1Bi1dLHTQw/" target="_blank" rel="noopener noreferrer" aria-label="Facebook" className="cm-footer-social-btn">
              <Facebook size={18} />
            </a>
            <a href="https://www.tiktok.com/@atagency.maid.sol?_r=1&_t=ZS-98H4zr4nZ4s" target="_blank" rel="noopener noreferrer" aria-label="TikTok" className="cm-footer-social-btn">
              <FaTiktok size={17} />
            </a>
            <a href="https://www.youtube.com/@atagencymaidsolutions?si=lNyfLWv6k6dcsKSK" target="_blank" rel="noopener noreferrer" aria-label="YouTube" className="cm-footer-social-btn">
              <Youtube size={18} />
            </a>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="cm-footer-bottom">
        <p className="cm-footer-copyright">
          © 2026 "Find Maids" At The Agency. All rights reserved.
        </p>
        <div className="cm-footer-legal">
          {["Privacy", "Terms", "Contact"].map((item) => (
            <Link key={item} to="/enquiry2" className="cm-footer-legal-link">{item}</Link>
          ))}
        </div>
      </div>
    </div>
  </footer>
);

/* ═══════════════════════════════════════════════════════════════════════════
   MAIN PAGE
═══════════════════════════════════════════════════════════════════════════ */
const ClientMaidsPage = ({
  resultsPath="/client/maids/search",
  loginPath="/employer-login",
  embedded=false,
}: ClientMaidsPageProps) => {
  const navigate      = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const requestRef    = useRef<HTMLDivElement|null>(null);
  const initialDraft  = useMemo(()=>parseDraftFromSearchParams(searchParams)??defaultFilters,[searchParams]);

  const [draft,           setDraft]           = useState<Filters>(initialDraft);
  const [filtersOpen,     setFiltersOpen]     = useState(true);
  const [requestOpen,     setRequestOpen]     = useState(searchParams.get("intent")==="request");
  const [searchedFilters, setSearchedFilters] = useState<Filters>(initialDraft);
  const [searchResults,   setSearchResults]   = useState<MaidProfile[]>([]);
  const [isSearching,     setIsSearching]     = useState(false);
  const [hasSearched,     setHasSearched]     = useState(false);
  const [isLoggedIn,      setIsLoggedIn]      = useState(() => Boolean(getClientToken()));
  const refreshedPhotosForSession = useRef(false);
  const isPublicSearchPage = resultsPath === "/search-maids/results";

  // The navbar restores the employer profile asynchronously. Restore the token here
  // as well so the first maid search is authenticated and receives original photos.
  useEffect(() => {
    let active = true;
    void refreshClientToken()
      .then((token) => { if (active) setIsLoggedIn(Boolean(token)); })
      .catch(() => { if (active) setIsLoggedIn(false); });
    return () => { active = false; };
  }, []);

  useEffect(()=>{
    const next=parseDraftFromSearchParams(searchParams);
    if(next){setDraft(next);setSearchedFilters(next);}
    setRequestOpen(searchParams.get("intent")==="request");
  },[searchParams]);

  useEffect(()=>{
    if(requestOpen) requestRef.current?.scrollIntoView({behavior:"smooth",block:"start"});
  },[requestOpen]);

  const activeFilterCount = useMemo(()=>{
    let c=0;
    if(draft.keyword.trim()) c++;
    if(draft.maidType) c++;
    if(draft.biodataCreatedWithin!=="No Preference") c++;
    for(const k of Object.keys(FILTER_LABELS) as (keyof typeof FILTER_LABELS)[])
      if(draft[k]===true) c++;
    return c;
  },[draft]);

  const activeTags = useMemo(()=>{
    const tags:{key:keyof Filters;label:string}[]=[];
    if(draft.keyword.trim()) tags.push({key:"keyword",label:`"${draft.keyword.trim()}"`});
    if(draft.maidType) tags.push({key:"maidType",label:`Type: ${draft.maidType}`});
    if(draft.biodataCreatedWithin!=="No Preference")
      tags.push({key:"biodataCreatedWithin",label:`Within: ${draft.biodataCreatedWithin}`});
    for(const [k,l] of Object.entries(FILTER_LABELS) as [keyof Filters,string][])
      if(draft[k]===true) tags.push({key:k,label:l});
    return tags;
  },[draft]);

  const requestHighlights = useMemo(()=>getRequestHighlights(draft),[draft]);


  const set    = (k:keyof Filters, v:boolean|string) => setDraft(p=>({...p,[k]:v}));
  const toggle = (k:keyof Filters) => setDraft(prev=>{
    const next=!prev[k];
    const grp=PREFERENCE_GROUPS.find(g=>(g.specifics as readonly (keyof Filters)[]).includes(k));
    if(!grp) return {...prev,[k]:next};
    const n={...prev,[k]:next,[grp.noPreference]:false};
    const allOff=(grp.specifics as readonly (keyof Filters)[]).every(gk=>gk===k?!next:!prev[gk]);
    if(allOff) n[grp.noPreference]=true;
    return n;
  });
  const chooseNoPreference = (noPreference:keyof Filters,specifics:readonly (keyof Filters)[]) =>
    setDraft(prev=>
      specifics.reduce<Filters>(
        (next,key)=>({...next,[key]:false}),
        {...prev,[noPreference]:true},
      )
    );
  const countGroup = (keys:readonly (keyof Filters)[]) => keys.filter(k=>draft[k]===true).length;

  const removeTag = (k:keyof Filters) => {
    if(k==="keyword")              { set("keyword",""); return; }
    if(k==="maidType")             { set("maidType",""); return; }
    if(k==="biodataCreatedWithin") { set("biodataCreatedWithin","No Preference"); return; }
    const grp=PREFERENCE_GROUPS.find(g=>(g.specifics as readonly (keyof Filters)[]).includes(k));
    if(grp){ toggle(k); return; }
    set(k,false);
  };

  const clearAllFilters = () => {
    setDraft(defaultFilters);
    setSearchedFilters(defaultFilters);
    setHasSearched(false);setSearchResults([]);
    setSearchParams(new URLSearchParams([["filters",JSON.stringify(defaultFilters)], ...(requestOpen ? [["intent","request"] as [string,string]] : [])]),{replace:true});
  };

  const handleSearch = async()=>{
    setRequestOpen(false);setSearchedFilters(draft);
    setHasSearched(true);setIsSearching(true);
    const params=buildSearchParamsFromFilters(draft);
    navigate(`${resultsPath}?${params.toString()}`);
    try {
      // Refresh before each search: the in-memory auth cache may be empty after a
      // direct navigation or a page refresh even when the employer has a session.
      const token = await refreshClientToken().catch(() => getClientToken());
      setIsLoggedIn(Boolean(token));
      const resp=await fetch(`/api/maids?${params.toString()}`,{
        headers: token ? { Authorization:`Bearer ${token}` } : {},
        cache: "no-store",
      });
      const data=await readSafeJson<{maids?:MaidProfile[];data?:MaidProfile[];error?:string}>(resp);
      if(!resp.ok) throw new Error(data.error||"Search failed");
      setSearchResults((data.maids ?? data.data ?? []).map(toSearchCardMaid));
    } catch { toast.error("Failed to load profiles. Please try again."); setSearchResults([]); }
    finally { setIsSearching(false); }
  };

  // A guest result can remain on screen while the login callback is completing.
  // Replace that response once per employer session with authenticated image URLs.
  useEffect(() => {
    if (!isLoggedIn) {
      refreshedPhotosForSession.current = false;
      return;
    }
    if (!hasSearched || refreshedPhotosForSession.current) return;
    refreshedPhotosForSession.current = true;
    void handleSearch();
  }, [hasSearched, isLoggedIn]);

  const handleViewProfile=(m:MaidProfile)=>{
    const p=getPublicProfilePath(m);
    if(!p){toast.error("Profile link is unavailable for this maid.");return;}
    navigate(p);
  };
  const handleOpenRequest=()=>{setSearchedFilters(draft);setRequestOpen(true);const next=new URLSearchParams();next.set("filters",JSON.stringify(draft));next.set("intent","request");setSearchParams(next,{replace:true});};
  const handleCloseRequest=()=>{setRequestOpen(false);const next=new URLSearchParams();next.set("filters",JSON.stringify(draft));setSearchParams(next,{replace:true});window.scrollTo({top:0,behavior:"smooth"});};
  const handleLoginClick=()=>navigate(loginPath);

  return (
    <>
      {!embedded && <PublicSiteNavbar />}
    <div className="cm-root">
      <style>{GLOBAL_CSS}</style>

      {/* Ambient orbs */}
      <div className="cm-orb cm-orb-1"/>
      <div className="cm-orb cm-orb-2"/>

      {/* Top shimmer bar */}
      <div className="cm-shimmer-bar"/>

      {/* ── Hero ── */}
      <div className="cm-hero">
        <div className="cm-hero-blob-1"/>
        <div className="cm-hero-blob-2"/>
        <div className="cm-hero-blob-3"/>
        <div className="cm-hero-inner">
          <div>
            <div className="cm-hero-eyebrow">
              <Star size={11} fill={T.amber} color={T.amber}/>
              Verified Domestic Helper Profiles
            </div>
            <h1 className="cm-hero-title">
              Find Your Perfect<br/>
              <span className="cm-hero-accent">Domestic Helper</span>
            </h1>
            <p className="cm-hero-sub">
              Browse verified profiles with advanced filters, or let our expert team personally shortlist the best candidates for your household.
            </p>
            <div className="cm-hero-steps">
              {[{n:"1",l:"Set Filters"},{n:"2",l:"Browse Profiles"},{n:"3",l:"Request Help"}].map(({n,l})=>(
                <span key={n} className="cm-hero-step">
                  <span className="cm-hero-step-num">{n}</span>{l}
                </span>
              ))}
            </div>
          </div>
          <div className="cm-trust-pills">
            {[
              {icon:<Shield size={15} color={T.amber}/>, val:"Verified", lbl:"All profiles checked"},
              {icon:<Clock  size={15} color={T.amber}/>, val:"Fast",     lbl:"Quick agency response"},
              {icon:<Heart  size={15} color={T.amber}/>, val:"Trusted",  lbl:"By families in SG"},
            ].map(p=>(
              <div key={p.lbl} className="cm-trust-pill">
                <div className="cm-trust-icon">{p.icon}</div>
                <div>
                  <div className="cm-trust-val">{p.val}</div>
                  <div className="cm-trust-lbl">{p.lbl}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="cm-content">
        <ClassicFilterPanel
          draft={draft}
          set={set}
          toggle={toggle}
          chooseNoPreference={chooseNoPreference}
          onSearch={()=>void handleSearch()}
          onClear={clearAllFilters}
        />

        {/* ── Filter Panel ── */}
        <div className="cm-panel">
          {/* Header */}
          <div className="cm-panel-header">
            <div className="cm-panel-title">
              <div className="cm-panel-icon"><Filter size={14} color="#fff"/></div>
              Search Filters
              {activeFilterCount>0 && <span className="cm-count-badge">{activeFilterCount}</span>}
            </div>
            <div style={{display:"flex",alignItems:"center",gap:"0.5rem"}}>
              {activeFilterCount>0&&(
                <button type="button" className="cm-btn-clear" onClick={clearAllFilters}
                  style={{padding:"0.38rem 0.75rem",fontSize:"0.75rem",marginLeft:0}}>
                  <X size={11}/> Clear all
                </button>
              )}
              <button type="button" className="cm-btn-collapse" onClick={()=>setFiltersOpen(v=>!v)}>
                <ChevronDown size={12}
                  style={{transform:filtersOpen?"rotate(180deg)":"none",transition:"transform 0.2s"}}/>
                {filtersOpen?"Collapse":"Expand"}
              </button>
            </div>
          </div>

          {/* Active tags */}
          {activeTags.length>0&&(
            <div className="cm-tags-row">
              {activeTags.map(({key,label})=>(
                <FilterTag key={`${key}-${label}`} label={label} onRemove={()=>removeTag(key)}/>
              ))}
            </div>
          )}

          {filtersOpen&&(
            <>
              {/* Primary fields */}
              <div className="cm-primary-grid">
                {/* Keyword */}
                <div>
                  <p className="cm-section-lbl">Keyword Search</p>
                  <div className="cm-field">
                    <span className="cm-field-icon"><Search size={14}/></span>
                    <input className="cm-input" placeholder="Name, ref code, nationality…"
                      value={draft.keyword}
                      onChange={e=>set("keyword",e.target.value)}
                      onKeyDown={e=>e.key==="Enter"&&void handleSearch()}/>
                    {draft.keyword&&(
                      <button type="button" className="cm-input-clear" onClick={()=>set("keyword","")}>
                        <X size={12}/>
                      </button>
                    )}
                  </div>
                </div>

                {/* Created within */}
                <div>
                  <p className="cm-section-lbl">Profile Created Within</p>
                  <div className="cm-field">
                    <select className="cm-select" value={draft.biodataCreatedWithin}
                      onChange={e=>set("biodataCreatedWithin",e.target.value)}>
                      {["No Preference","1 week","2 weeks","1 month","3 months","6 months","1 year"]
                        .map(o=><option key={o}>{o}</option>)}
                    </select>
                    <span className="cm-select-arrow"><ChevronDown size={14}/></span>
                  </div>
                </div>

                {/* Maid type */}
                <div>
                  <p className="cm-section-lbl">Maid Type</p>
                  <div style={{display:"flex",flexWrap:"wrap",gap:"0.4rem",marginTop:"0.35rem"}}>
                    {(["New Maid","Transfer Maid","Ex-Singapore Maid"] as const).map(t=>(
                      <Chip key={t} label={t} checked={draft.maidType===t}
                        onChange={()=>set("maidType",draft.maidType===t?"":t)}
                        variant={t==="New Maid"?"teal":t==="Transfer Maid"?"blue":"amber"}/>
                    ))}
                  </div>
                </div>

                {/* Quick filters */}
                <div>
                  <p className="cm-section-lbl">Quick Filters</p>
                  <div style={{display:"flex",flexWrap:"wrap",gap:"0.4rem",marginTop:"0.35rem"}}>
                    {([
                      ["willingOffDays","🌟 Off-days OK"],
                      ["hasChildren","👶 Has Children"],
                      ["withVideo","🎥 Has Video"],
                    ] as [keyof Filters,string][]).map(([k,l])=>(
                      <Chip key={k} label={l} checked={!!draft[k]} onChange={()=>toggle(k)}/>
                    ))}
                  </div>
                </div>
              </div>

              {/* Detailed filters */}
              <div className="cm-detail-grid">
                <p className="cm-section-lbl" style={{gridColumn:"1/-1"}}>Detailed Preferences</p>

                <FilterSection title="Nationality" defaultOpen
                  count={countGroup(["natFilipino","natIndonesian","natMyanmar","natIndian","natSriLankan","natCambodian","natBangladeshi","natOthers"])}
                  icon={<Globe size={12}/>}>
                  {[["natFilipino","Filipino"],["natIndonesian","Indonesian"],["natMyanmar","Myanmar"],
                    ["natIndian","Indian"],["natSriLankan","Sri Lankan"],["natCambodian","Cambodian"],
                    ["natBangladeshi","Bangladeshi"],["natOthers","Others"]].map(([k,l])=>(
                    <Chip key={k} label={l} checked={!!draft[k as keyof Filters]} onChange={()=>toggle(k as keyof Filters)}/>
                  ))}
                </FilterSection>

                <FilterSection title="Work Experience" defaultOpen
                  count={countGroup(["expHomeCountry","expSingapore","expMalaysia","expHongKong","expTaiwan","expMiddleEast","expOtherCountries"])}
                  icon={<MapPin size={12}/>}>
                  {[["expHomeCountry","Home Country"],["expSingapore","Singapore"],["expMalaysia","Malaysia"],
                    ["expHongKong","Hong Kong"],["expTaiwan","Taiwan"],["expMiddleEast","Middle East"],
                    ["expOtherCountries","Others"]].map(([k,l])=>(
                    <Chip key={k} label={l} checked={!!draft[k as keyof Filters]} onChange={()=>toggle(k as keyof Filters)}/>
                  ))}
                </FilterSection>

                <FilterSection title="Duties" defaultOpen
                  count={countGroup(["dutyCareInfant","dutyCareYoungChildren","dutyCareElderlyDisabled","dutyCooking","dutyGeneralHousekeeping"])}
                  icon={<Heart size={12}/>}>
                  {[["dutyCareInfant","Infant Care"],["dutyCareYoungChildren","Young Children"],
                    ["dutyCareElderlyDisabled","Elderly / Disabled"],["dutyCooking","Cooking"],
                    ["dutyGeneralHousekeeping","Housekeeping"]].map(([k,l])=>(
                    <Chip key={k} label={l} checked={!!draft[k as keyof Filters]} onChange={()=>toggle(k as keyof Filters)}/>
                  ))}
                </FilterSection>

                <FilterSection title="Language"
                  count={countGroup(["langEnglish","langMandarin","langBahasaIndonesia","langHindi","langTamil"])}>
                  {[["langEnglish","English"],["langMandarin","Mandarin"],
                    ["langBahasaIndonesia","Bahasa / Malay"],["langHindi","Hindi"],["langTamil","Tamil"]].map(([k,l])=>(
                    <Chip key={k} label={l} checked={!!draft[k as keyof Filters]} onChange={()=>toggle(k as keyof Filters)}/>
                  ))}
                </FilterSection>

                <FilterSection title="Age Group"
                  count={countGroup(["age21to25","age26to30","age31to35","age36to40","age41above"])}>
                  {[["age21to25","21–25"],["age26to30","26–30"],["age31to35","31–35"],
                    ["age36to40","36–40"],["age41above","41+"]].map(([k,l])=>(
                    <Chip key={k} label={l} checked={!!draft[k as keyof Filters]} onChange={()=>toggle(k as keyof Filters)}/>
                  ))}
                </FilterSection>

                <FilterSection title="Marital Status"
                  count={countGroup(["marSingle","marMarried","marWidowed","marDivorced","marSeparated"])}>
                  {[["marSingle","Single"],["marMarried","Married"],["marWidowed","Widowed"],
                    ["marDivorced","Divorced"],["marSeparated","Separated"]].map(([k,l])=>(
                    <Chip key={k} label={l} checked={!!draft[k as keyof Filters]} onChange={()=>toggle(k as keyof Filters)}/>
                  ))}
                </FilterSection>

                <FilterSection title="Education"
                  count={countGroup(["eduCollege","eduHighSchool","eduSecondary","eduPrimary"])}
                  icon={<BookOpen size={12}/>}>
                  {[["eduCollege","College / Degree"],["eduHighSchool","High School"],
                    ["eduSecondary","Secondary"],["eduPrimary","Primary Level"]].map(([k,l])=>(
                    <Chip key={k} label={l} checked={!!draft[k as keyof Filters]} onChange={()=>toggle(k as keyof Filters)}/>
                  ))}
                </FilterSection>

                <FilterSection title="Height"
                  count={countGroup(["height150below","height151to155","height156to160","height161above"])}>
                  {[["height150below","≤150 cm"],["height151to155","151–155 cm"],
                    ["height156to160","156–160 cm"],["height161above","161+ cm"]].map(([k,l])=>(
                    <Chip key={k} label={l} checked={!!draft[k as keyof Filters]} onChange={()=>toggle(k as keyof Filters)}/>
                  ))}
                </FilterSection>

                <FilterSection title="Religion"
                  count={countGroup(["relFreeThinker","relChristian","relCatholic","relBuddhist","relMuslim","relHindu","relSikh","relOthers"])}>
                  {[["relFreeThinker","Free Thinker"],["relChristian","Christian"],["relCatholic","Catholic"],
                    ["relBuddhist","Buddhist"],["relMuslim","Muslim"],["relHindu","Hindu"],
                    ["relSikh","Sikh"],["relOthers","Others"]].map(([k,l])=>(
                    <Chip key={k} label={l} checked={!!draft[k as keyof Filters]} onChange={()=>toggle(k as keyof Filters)}/>
                  ))}
                </FilterSection>
              </div>

              {/* Action row */}
              <div className="cm-action-row">
                <button type="button" className="cm-btn-search" onClick={()=>void handleSearch()}>
                  <Search size={14}/>
                  Search Maids
                  {activeFilterCount>0&&(
                    <span style={{padding:"0.1rem 0.45rem",borderRadius:5,
                      background:"rgba(255,255,255,0.18)",fontSize:"0.7rem",fontWeight:800}}>
                      {activeFilterCount}
                    </span>
                  )}
                </button>
                {!isPublicSearchPage && <button type="button" className="cm-btn-request" onClick={handleOpenRequest}><Sparkles size={14} style={{color:T.amber}}/> Request Agency Help</button>}
                {activeFilterCount>0&&(
                  <button type="button" className="cm-btn-clear" onClick={clearAllFilters}>
                    <X size={11}/> Clear
                  </button>
                )}
              </div>
            </>
          )}
        </div>

        {/* ── Search results ── */}
        {hasSearched&&(
          <SearchResults maids={searchResults} isLoggedIn={isLoggedIn}
            isLoading={isSearching} onLoginClick={handleLoginClick}
            onViewProfile={handleViewProfile}/>
        )}

        {/* ── Agency CTA ── */}
        {!isPublicSearchPage&&!requestOpen&&(
          <div className="cm-cta">
            <div className="cm-cta-blob-1"/>
            <div className="cm-cta-blob-2"/>
            <div className="cm-cta-inner">
              <div>
                <div className="cm-cta-eyebrow">
                  <Sparkles size={10}/> Prefer a personal touch?
                </div>
                <h2 className="cm-cta-title">Let the agency shortlist for you.</h2>
                <p className="cm-cta-sub">
                  Send your requirements and get curated candidate suggestions from our team.
                </p>
                <div className="cm-cta-features">{["Free service","Expert matching","Personal support"].map((item)=><span key={item} className="cm-cta-feat"><CheckCircle2 size={11} style={{color:"rgba(252,211,77,0.7)"}}/>{item}</span>)}</div>
              </div>
              <div>
                {requestHighlights.length>0&&<div className="cm-cta-filter-preview"><p className="cm-cta-filter-lbl">Your current filters</p><div className="cm-cta-filter-pills">{requestHighlights.slice(0,4).map((item)=><span key={item} className="cm-cta-filter-pill">{item}</span>)}</div></div>}
                <button type="button" className="cm-cta-btn" onClick={handleOpenRequest}>Open Request Form <ChevronRight size={15}/></button>
              </div>
            </div>
          </div>
        )}
        {!isPublicSearchPage&&requestOpen&&<div ref={requestRef}><RequestForm prefillFilters={searchedFilters} onBack={handleCloseRequest}/></div>}
      </div>

      {/* ── Footer ── */}
      {!embedded && <PublicSiteFooter />}
    </div>
    </>
  );
};

export default ClientMaidsPage;
