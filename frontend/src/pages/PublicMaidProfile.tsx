import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Check, Copy, Eye, Heart, Link2, MessageCircle, Send, Share2, Star, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { getStoredClient } from "@/lib/clientAuth";
import { calculateAge, formatDate, getExperienceBucket, getPublicIntro, MaidProfile } from "@/lib/maids";
import { getSavedShortlistRefs, subscribeToShortlistRefs, toggleShortlistRef } from "@/lib/shortlist";
import { toast } from "@/components/ui/sonner";
import PublicSiteNavbar from "@/components/PublicSiteNavbar";
import ClientPortalNavbar from "@/ClientPage/ClientPortalNavbar";
import { hasActiveClientSession, syncClientProfileFromSession } from "@/lib/supabaseAuth";

interface CompanyProfileApi {
  company_name?: string;
  short_name?: string;
  license_no?: string;
  contact_person?: string;
  contact_phone?: string;
  contact_email?: string;
  contact_website?: string;
  office_hours_regular?: string;
  office_hours_other?: string;
  about_us?: string;
  logo_data_url?: string;
}

interface CompanyResponse {
  companyProfile?: CompanyProfileApi;
}

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
      width: 15, height: 15, borderRadius: "50%", overflow: "hidden",
      border: "1px solid rgba(0,0,0,0.15)", flexShrink: 0,
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

// ── Card helpers ──────────────────────────────────────────────────────────────
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

// ── Shortlist maid card ───────────────────────────────────────────────────────
const ShortlistMaidCard = ({
  maid,
  isShortlisted,
  onToggleShortlist,
  onNavigate,
}: {
  maid: MaidProfile;
  isShortlisted: boolean;
  onToggleShortlist: (ref: string) => void;
  onNavigate?: () => void;
}) => {
  const photo =
    Array.isArray(maid.photoDataUrls) && maid.photoDataUrls.length > 0
      ? maid.photoDataUrls[0]
      : maid.photoDataUrl || "";
  const age = calculateAge(maid.dateOfBirth);
  const flagCode = getNationalityCode(maid.nationality);
  const typeColorClass = getMaidTypeBadgeClass(maid.type);
  const experienceBucket = getExperienceBucket(maid);

  return (
    <article className="group flex flex-col overflow-hidden border bg-card shadow-sm transition-all hover:shadow-md hover:border-primary/50 cursor-pointer">
      <div className="relative w-full bg-white overflow-hidden">
        <Link to={`/maids/${encodeURIComponent(maid.referenceCode)}`} onClick={onNavigate}>
          {photo ? (
            <img
              src={photo}
              alt={maid.fullName}
              className="block w-full h-auto"
              style={{
                aspectRatio: "3/4",
                objectFit: "contain",
                objectPosition: "top center",
                minHeight: 130,
                background: "#fff",
              }}
              loading="lazy"
              decoding="async"
            />
          ) : (
            <div
              className="w-full flex items-center justify-center bg-gray-50"
              style={{ aspectRatio: "3/4", minHeight: 130 }}
            >
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
            <span className={`inline-block px-1.5 py-px text-[11px] font-semibold border bg-white/90 backdrop-blur-sm ${typeColorClass}`}>
              {getTypeLabel(maid.type)}
            </span>
          </div>
        )}

        <button
          onClick={(e) => { e.preventDefault(); onToggleShortlist(maid.referenceCode); }}
          className={`absolute bottom-0 left-0 right-0 flex items-center justify-center gap-1 py-1.5 text-[11px] font-bold uppercase tracking-wide text-white transition-all ${
            isShortlisted ? "bg-amber-500" : "bg-black/60 opacity-0 group-hover:opacity-100"
          }`}
        >
          <Star className={`h-3 w-3 ${isShortlisted ? "fill-white" : ""}`} />
          {isShortlisted ? "Shortlisted" : "Shortlist"}
        </button>
      </div>

      <div className="flex flex-col gap-0.5 p-2.5 flex-1 bg-white">
        <h3 className="text-xs font-bold text-black line-clamp-1 leading-tight">
          {maid.fullName || "Unnamed maid"}
        </h3>
        {maid.referenceCode && (
          <p className="text-[11px] text-black font-mono leading-tight">{maid.referenceCode}</p>
        )}
        {maid.nationality && (
          <p className="inline-flex items-center gap-1 text-[11px] text-black leading-tight mt-0.5">
            <FlagCircle code={flagCode} />
            {maid.nationality}
          </p>
        )}
        <div className="my-1 border-t border-gray-100" />
        <div className="flex items-center gap-1.5 text-[11px] text-black leading-tight">
          {age !== null && <span className="font-semibold">{age} yrs</span>}
          {age !== null && maid.maritalStatus && <span className="text-gray-300">·</span>}
          {maid.maritalStatus && <span className="truncate">{maid.maritalStatus}</span>}
        </div>
        {maid.religion && (
          <p className="text-[11px] text-black leading-tight line-clamp-1">{maid.religion}</p>
        )}
        {experienceBucket && (
          <p className="text-[11px] text-black leading-tight mt-0.5 line-clamp-1">{experienceBucket}</p>
        )}
        {maid.languageSkills && (() => {
          const langs = Object.entries(maid.languageSkills)
            .filter(([, level]) => {
              const l = String(level || "").trim().toLowerCase();
              return l && l !== "zero" && l !== "none";
            })
            .map(([key]) => key.charAt(0).toUpperCase() + key.slice(1))
            .slice(0, 3);
          return langs.length > 0 ? (
            <p className="text-[11px] text-black leading-tight line-clamp-1 mt-0.5">
              {langs.join(" · ")}
            </p>
          ) : null;
        })()}
      </div>
    </article>
  );
};

// ── Tell Friend Modal ─────────────────────────────────────────────────────────
interface TellFriendModalProps {
  maid: MaidProfile;
  agencyName: string;
  agencyPhone: string;
  agencyContactPerson: string;
  onClose: () => void;
}

const TellFriendModal = ({ maid, agencyName, agencyPhone, agencyContactPerson, onClose }: TellFriendModalProps) => {
  const [toName, setToName] = useState("");
  const [toEmail, setToEmail] = useState("");
  const [fromName, setFromName] = useState("");
  const [fromEmail, setFromEmail] = useState("");
  const [subject, setSubject] = useState("Please find this maid info.");
  const profileUrl = typeof window !== "undefined" ? window.location.href : "";
  const shareText = [
    "Hi! Check out this maid profile.",
    `Agency: ${agencyName}${agencyContactPerson ? `. Call ${agencyContactPerson}` : ""}${agencyPhone ? ` at ${agencyPhone}` : ""}.`,
    `Ref: ${maid.referenceCode}`,
    profileUrl ? `Link: ${profileUrl}` : "",
  ].filter(Boolean).join("\n");
  const [message, setMessage] = useState(shareText);
  const [isSending, setIsSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [copied, setCopied] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const toNameRef = useRef<HTMLInputElement>(null);
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(profileUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Could not copy link. Please copy it manually from the address bar.");
    }
  };

  const handleWhatsApp = () => {
    const waUrl = `https://wa.me/?text=${encodeURIComponent(shareText)}`;
    window.open(waUrl, "_blank", "noopener,noreferrer");
  };

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!toEmail.trim()) errs.toEmail = "Required";
    if (!fromEmail.trim()) errs.fromEmail = "Required";
    if (toEmail.trim() && !emailPattern.test(toEmail.trim())) errs.toEmail = "Invalid email";
    if (fromEmail.trim() && !emailPattern.test(fromEmail.trim())) errs.fromEmail = "Invalid email";
    return errs;
  };

  const handleSubmit = async () => {
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setErrors({});
    setIsSending(true);
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 10000);
    try {
      const res = await fetch("/api/tell-friend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({ toName, toEmail, fromName, fromEmail, subject, message, maidRefCode: maid.referenceCode }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        if (res.status === 503) {
          const lines = [message.trim(), "", fromName.trim() ? `From: ${fromName.trim()} <${fromEmail.trim()}>` : `From: ${fromEmail.trim()}`].filter(Boolean);
          window.location.href = `mailto:${encodeURIComponent(toEmail.trim())}?subject=${encodeURIComponent(subject.trim())}&body=${encodeURIComponent(lines.join("\n"))}`;
          toast.success("Email app opened as a fallback.");
          onClose();
          return;
        }
        throw new Error(data.error || "Failed to send.");
      }
      setSent(true);
      setTimeout(() => onClose(), 2000);
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        toast.error("Email request timed out. Please try again later.");
      } else {
        toast.error(err instanceof Error ? err.message : "Could not send message.");
      }
    } finally {
      window.clearTimeout(timeout);
      setIsSending(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md rounded-xl bg-white shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b bg-gray-50 px-5 py-3.5">
          <h2 className="text-sm font-semibold text-black">
            Tell your friend about this {maid.nationality || "maid"}.
          </h2>
          <button
            onClick={onClose}
            className="flex h-6 w-6 items-center justify-center rounded-full text-black hover:bg-gray-200 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {sent ? (
          <div className="flex flex-col items-center justify-center gap-3 py-12 px-6 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100">
              <Check className="h-6 w-6 text-emerald-600" />
            </div>
            <p className="text-sm font-semibold text-black">Message sent!</p>
            <p className="text-xs text-black">Your friend will receive the maid info shortly.</p>
          </div>
        ) : (
          <div className="px-5 py-4 space-y-4">

            {/* ── Quick share ── */}
            <div className="space-y-2">
              <p className="text-[11px] font-bold uppercase tracking-widest text-black">Quick Share</p>
              <div className="flex gap-2">
                <button
                  onClick={handleWhatsApp}
                  className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-sm font-semibold text-emerald-700 hover:bg-emerald-100 active:scale-95 transition-all"
                >
                  <svg className="h-4 w-4 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                  </svg>
                  WhatsApp
                </button>
                <button
                  onClick={handleCopyLink}
                  className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm font-semibold text-black hover:bg-gray-100 active:scale-95 transition-all"
                >
                  {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Link2 className="h-4 w-4" />}
                  {copied ? "Copied!" : "Copy Link"}
                </button>
              </div>
            </div>

            {/* ── Divider ── */}
            <div className="flex items-center gap-3">
              <div className="flex-1 border-t border-gray-200" />
              <span className="text-[11px] font-medium text-gray-400 uppercase tracking-wide">or send by email</span>
              <div className="flex-1 border-t border-gray-200" />
            </div>

            {/* ── Email form ── */}
            <div className="grid grid-cols-[60px_1fr] items-start gap-x-3 gap-y-2">
              <label className="pt-2 text-right text-xs font-semibold text-black">To</label>
              <div className="space-y-1.5">
                <input
                  ref={toNameRef}
                  type="text"
                  placeholder="Your Friend's name"
                  value={toName}
                  onChange={(e) => setToName(e.target.value)}
                  className="w-full rounded border border-gray-300 px-3 py-1.5 text-sm text-black placeholder:text-gray-400 focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400 transition"
                />
                <div>
                  <input
                    type="email"
                    placeholder="Your Friend's email *"
                    value={toEmail}
                    onChange={(e) => { setToEmail(e.target.value); setErrors((p) => ({ ...p, toEmail: "" })); }}
                    className={`w-full rounded border px-3 py-1.5 text-sm text-black placeholder:text-gray-400 focus:outline-none focus:ring-1 transition ${errors.toEmail ? "border-red-400 focus:border-red-400 focus:ring-red-400" : "border-gray-300 focus:border-blue-400 focus:ring-blue-400"}`}
                  />
                  {errors.toEmail && <p className="mt-0.5 text-[11px] text-red-500">{errors.toEmail}</p>}
                </div>
              </div>

              <label className="pt-2 text-right text-xs font-semibold text-black">From</label>
              <div className="space-y-1.5">
                <input
                  type="text"
                  placeholder="Your name"
                  value={fromName}
                  onChange={(e) => setFromName(e.target.value)}
                  className="w-full rounded border border-gray-300 px-3 py-1.5 text-sm text-black placeholder:text-gray-400 focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400 transition"
                />
                <div>
                  <input
                    type="email"
                    placeholder="Your email *"
                    value={fromEmail}
                    onChange={(e) => { setFromEmail(e.target.value); setErrors((p) => ({ ...p, fromEmail: "" })); }}
                    className={`w-full rounded border px-3 py-1.5 text-sm text-black placeholder:text-gray-400 focus:outline-none focus:ring-1 transition ${errors.fromEmail ? "border-red-400 focus:border-red-400 focus:ring-red-400" : "border-gray-300 focus:border-blue-400 focus:ring-blue-400"}`}
                  />
                  {errors.fromEmail && <p className="mt-0.5 text-[11px] text-red-500">{errors.fromEmail}</p>}
                </div>
              </div>

              <label className="pt-2 text-right text-xs font-semibold text-black">Subject</label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full rounded border border-gray-300 px-3 py-1.5 text-sm text-black focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400 transition"
              />

              <label className="pt-2 text-right text-xs font-semibold text-black">Message</label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={5}
                className="w-full resize-none rounded border border-gray-300 px-3 py-2 text-sm text-black leading-relaxed focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400 transition"
              />
            </div>

            <div className="flex items-center justify-between border-t pt-3">
              <button onClick={onClose} className="text-xs text-black hover:underline transition-colors">
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={isSending}
                className="flex items-center gap-2 rounded-lg bg-amber-500 hover:bg-amber-600 active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed px-5 py-2 text-sm font-semibold text-white transition-all"
              >
                <Send className="h-3.5 w-3.5" />
                {isSending ? "Sending…" : "Send Email"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// ── Profile helpers ───────────────────────────────────────────────────────────
const availabilityRemarkItems = [
  { label: "Able to handle pork",   keys: ["Able to handle pork?"] },
  { label: "Able to eat pork",      keys: ["Able to eat pork?"] },
  { label: "Able to care for pets", keys: ["Able to care for dog/cat?"] },
  { label: "Able to do sewing",     keys: ["Able to do simple sewing?"] },
  { label: "Able to do gardening",  keys: ["Able to do gardening work?"] },
  { label: "Willing to wash car",   keys: ["Willing to wash car?"] },
  {
    label: "Can work on off-days",
    keys: [
      "Can work on off-days with compensation?",
      "Willing to work on off-days with compensation?",
      "Willing to work on off-days with  compensation?",
    ],
  },
] as const;

const fixedLanguageKeyMap = [
  { label: "ENGLISH",                   keys: ["English"] },
  { label: "MANDARIN/CHINESE dialect",  keys: ["Mandarin/Chinese-Dialect", "Mandarin / Chinese Dialect", "Mandarin/Chinese Dialect", "Mandarin"] },
  { label: "Hindi",                     keys: ["Hindi"] },
  { label: "Tamil",                     keys: ["Tamil"] },
  { label: "Bahasa Indonesia/Malaysia", keys: ["Bahasa Indonesia/Malaysia", "Bahasa Indonesia / Malaysia", "Bahasa"] },
] as const;

const getYouTubeEmbedUrl = (value?: string) => {
  const raw = String(value || "").trim();
  if (!raw) return null;
  try {
    const url = new URL(raw);
    const host = url.hostname.replace(/^www\./, "").toLowerCase();
    if (host === "youtu.be") {
      const id = url.pathname.replace(/^\//, "").split("/")[0];
      return id ? `https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}` : null;
    }
    if (host.endsWith("youtube.com")) {
      if (url.pathname.startsWith("/watch"))   { const id = url.searchParams.get("v");                           return id ? `https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}` : null; }
      if (url.pathname.startsWith("/embed/"))  { const id = url.pathname.split("/embed/")[1]?.split("/")[0];     return id ? `https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}` : null; }
      if (url.pathname.startsWith("/shorts/")) { const id = url.pathname.split("/shorts/")[1]?.split("/")[0];    return id ? `https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}` : null; }
    }
  } catch { /* ignore */ }
  return null;
};

// ── Shared small components ───────────────────────────────────────────────────

const SectionHeader = ({ children }: { children: React.ReactNode }) => (
  <div className="border-b bg-gray-50 px-4 py-2">
    <p className="text-[11px] font-bold uppercase tracking-widest text-black">{children}</p>
  </div>
);

const YesNoBadge = ({ yes }: { yes: boolean }) => (
  <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${
    yes ? "bg-emerald-50 text-emerald-700" : "bg-gray-100 text-black"
  }`}>
    {yes ? "Yes" : "No"}
  </span>
);

const StarDisplay = ({ evaluation }: { evaluation?: string }) => {
  const raw = String(evaluation || "").trim();
  if (!raw || raw === "—" || raw === "N.A." || raw === "-") {
    return <span className="text-xs text-black">N.A.</span>;
  }
  const match = raw.match(/^(\d+)\/5/);
  const rating = match ? parseInt(match[1], 10) : null;
  const note = raw.replace(/^\d+\/5\s*[-–]?\s*/, "").trim();
  if (rating === null) {
    return <span className="text-xs text-black">{raw}</span>;
  }
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="flex items-center gap-0.5">
        {Array.from({ length: 5 }, (_, i) => (
          <Star key={i} className={`h-4 w-4 ${i < rating ? "fill-primary text-primary" : "text-gray-200"}`} />
        ))}
      </div>
      {note && <span className="text-[11px] text-black leading-tight text-center">{note}</span>}
    </div>
  );
};

const getLanguageStarRating = (level?: string) => {
  const normalized = String(level || "").trim().toLowerCase();
  switch (normalized) {
    case "good": return 4;
    case "fair": return 3;
    case "little": return 2;
    case "poor": return 1;
    case "zero": return 0;
    default: return null;
  }
};

const LanguageRating = ({ level }: { level?: string }) => {
  const rating = getLanguageStarRating(level);
  if (rating === null) {
    return <span className="text-[11px] text-black">{String(level || "N.A.")}</span>;
  }
  return (
    <div className="flex items-center gap-0.5 flex-shrink-0" title={String(level)}>
      {Array.from({ length: 5 }, (_, i) => (
        <Star key={i} className={`h-3.5 w-3.5 ${i < rating ? "fill-amber-500 text-amber-500" : "text-gray-200"}`} />
      ))}
    </div>
  );
};

// ── KVRow — responsive label width ───────────────────────────────────────────
const KVRow = ({ label, value }: { label: string; value: string }) => (
  <div className="contents">
    <p className="py-1 pr-2 text-[12px] font-semibold text-black border-b border-dashed border-gray-200 leading-snug break-words">{label}</p>
    <p className="py-1 text-[12px] text-black border-b border-dashed border-gray-200 leading-snug break-words">{value || "—"}</p>
  </div>
);

type PublicMaidProfileProps = { embedded?: boolean };

// ── Main component ────────────────────────────────────────────────────────────
const PublicMaidProfile = ({ embedded = false }: PublicMaidProfileProps) => {
  const { refCode } = useParams();
  const [maid, setMaid]                   = useState<MaidProfile | null>(null);
  const [company, setCompany]             = useState<CompanyProfileApi | null>(null);
  const [isLoading, setIsLoading]         = useState(true);
  const [shortlistRefs, setShortlistRefs] = useState<string[]>([]);
  const [shortlistMaids, setShortlistMaids] = useState<MaidProfile[]>([]);
  const [isShortlistLoading, setIsShortlistLoading] = useState(false);
  const [isShortlistOpen, setIsShortlistOpen]       = useState(false);
  const [isTellFriendOpen, setIsTellFriendOpen]     = useState(false);
  const [lightboxPhoto, setLightboxPhoto] = useState<string | null>(null);
  const [showOtherLanguages, setShowOtherLanguages] = useState(false);
  const [isLoggedIn, setIsLoggedIn]       = useState(false);

  useEffect(() => {
    const loadData = async () => {
      if (!refCode) return;
      try {
        setIsLoading(true);
        const [maidResponse, companyResponse] = await Promise.all([
          fetch(`/api/maids/${encodeURIComponent(refCode)}`),
          fetch("/api/company"),
        ]);
        const maidData = (await maidResponse.json().catch(() => ({}))) as { error?: string; maid?: MaidProfile };
        if (!maidResponse.ok || !maidData.maid) throw new Error(maidData.error || "Failed to load maid profile");
        setMaid(maidData.maid.isPublic ? maidData.maid : null);
        if (companyResponse.ok) {
          const companyData = (await companyResponse.json().catch(() => ({}))) as CompanyResponse;
          setCompany(companyData.companyProfile ?? null);
        }
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to load maid profile");
      } finally {
        setIsLoading(false);
      }
    };
    void loadData();
  }, [refCode]);

  useEffect(() => {
    setShortlistRefs(getSavedShortlistRefs());
    return subscribeToShortlistRefs(setShortlistRefs);
  }, []);

  useEffect(() => {
    if (!isShortlistOpen || shortlistRefs.length === 0) {
      if (shortlistRefs.length === 0) setShortlistMaids([]);
      return;
    }
    const controller = new AbortController();
    const loadShortlistMaids = async () => {
      try {
        setIsShortlistLoading(true);
        const res = await fetch("/api/maids?visibility=public", { signal: controller.signal });
        const data = (await res.json()) as { maids?: MaidProfile[]; error?: string };
        if (!res.ok || !data.maids) throw new Error(data.error || "Failed to load shortlist");
        setShortlistMaids(data.maids.filter((item) => item.isPublic && shortlistRefs.includes(item.referenceCode)));
      } catch (error) {
        if (!(error instanceof DOMException && error.name === "AbortError")) {
          toast.error(error instanceof Error ? error.message : "Failed to load shortlist");
        }
      } finally {
        setIsShortlistLoading(false);
      }
    };
    void loadShortlistMaids();
    return () => controller.abort();
  }, [isShortlistOpen, shortlistRefs]);

  useEffect(() => { setShowOtherLanguages(false); }, [maid?.referenceCode]);

  useEffect(() => {
    if (!lightboxPhoto) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") setLightboxPhoto(null); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [lightboxPhoto]);

  useEffect(() => {
    void hasActiveClientSession()
      .then((active) => { setIsLoggedIn(active); if (active) void syncClientProfileFromSession(); })
      .catch(() => setIsLoggedIn(false));
  }, []);

  const agencyContact    = useMemo(() => (maid ? maid.agencyContact as Record<string, unknown> : null), [maid]);
  const isShortlisted    = Boolean(maid?.referenceCode && shortlistRefs.includes(maid.referenceCode));
  const missingShortlistRefs = useMemo(
    () => shortlistRefs.filter((ref) => !shortlistMaids.some((m) => m.referenceCode === ref)),
    [shortlistRefs, shortlistMaids],
  );

  const handleToggleShortlist = (refOverride?: string) => {
    const ref = refOverride ?? maid?.referenceCode;
    if (!ref) return;
    const nextRefs = toggleShortlistRef(ref);
    setShortlistRefs(nextRefs);
    toast.success(shortlistRefs.includes(ref) ? "Removed from shortlist" : "Added to shortlist");
  };

  const employment = useMemo(() => (maid && Array.isArray(maid.employmentHistory) ? maid.employmentHistory : []), [maid]);

  const photos = useMemo(() => {
    if (!maid) return [] as string[];
    return Array.isArray(maid.photoDataUrls) && maid.photoDataUrls.length > 0
      ? maid.photoDataUrls
      : maid.photoDataUrl ? [maid.photoDataUrl] : [];
  }, [maid]);

  const otherLanguages = useMemo(() => {
    const allowedKeys = new Set<string>(fixedLanguageKeyMap.flatMap((item) => item.keys).map(String));
    return Object.entries(maid?.languageSkills || {})
      .map(([language, level]) => [language, String(level || "")] as const)
      .filter(([language, level]) => !allowedKeys.has(language) && level.trim());
  }, [maid?.languageSkills]);

  if (isLoading) {
    return (
      <div className="client-page-theme min-h-screen bg-card">
        <PublicSiteNavbar />
        <div className="page-container">
          <div className="content-card py-10 text-center text-black text-sm">Loading maid profile…</div>
        </div>
      </div>
    );
  }

  if (!maid) {
    return (
      <div className="client-page-theme min-h-screen bg-card">
        <PublicSiteNavbar />
        <div className="page-container">
          <div className="mb-3">
            <Link to="/client/maids" className="group inline-flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors">
              <ArrowLeft className="h-3 w-3 transition-transform group-hover:-translate-x-0.5" /> Back to all maids
            </Link>
          </div>
          <div className="content-card p-10 text-center">
            <p className="text-sm font-semibold text-black">Profile Not Available</p>
            <p className="mt-1 text-xs text-black">This maid profile is not currently available for public viewing.</p>
          </div>
        </div>
      </div>
    );
  }

  // ── Data prep ────────────────────────────────────────────────────────────
  const introduction      = maid.introduction as Record<string, unknown>;
  const skillsPreferences = maid.skillsPreferences as Record<string, unknown>;
  const otherInformation  = (skillsPreferences?.otherInformation as Record<string, boolean>) || {};
  const workAreaNotes     = (skillsPreferences?.workAreaNotes as Record<string, string>) || {};
  const pastIllnesses     = (introduction?.pastIllnesses as Record<string, boolean>) || {};

  const workAreasOrder = ["Care of infants/children", "Care of elderly", "Care of disabled", "General housework", "Cooking", "Language abilities (spoken)", "Other skills, if any"] as const;
  const rawWorkAreas   = Object.entries(maid.workAreas || {}) as Array<[string, { willing?: boolean; experience?: boolean; evaluation?: string; yearsOfExperience?: string }]>;
  const orderedWorkAreas = workAreasOrder
    .map((area) => rawWorkAreas.find(([key]) => key === area) ?? null)
    .filter(Boolean) as Array<[string, { willing?: boolean; experience?: boolean; evaluation?: string; yearsOfExperience?: string }]>;

  const fixedLanguages = fixedLanguageKeyMap
    .map((item) => {
      const level = item.keys.map((key) => (maid.languageSkills || {})[key]).find((val) => String(val || "").trim());
      return level ? [item.label, String(level)] as const : null;
    })
    .filter(Boolean) as Array<[string, string]>;

  const passportOrTwoByTwoPhoto = photos[0] ?? "";
  const fullBodyPhoto           = photos[1] ?? "";
  const extraPhotos             = photos.slice(2);
  const youtubeEmbedUrl         = getYouTubeEmbedUrl(maid.videoDataUrl);

  const storedClient       = getStoredClient() as (ReturnType<typeof getStoredClient> & { emailVerified?: boolean }) | null;
  const canViewPrivateIntro = Boolean(isLoggedIn && storedClient?.emailVerified === true);

  const agencyName          = company?.company_name || company?.short_name || String(agencyContact?.companyName || "Agency");
  const agencyPhone         = company?.contact_phone || String(agencyContact?.phone || "");
  const agencyContactPerson = company?.contact_person || String(agencyContact?.contactPerson || "");
  const publicIntro         = getPublicIntro(maid);

  const detailRows: Array<[string, string]> = [
    ["Name",                maid.fullName],
    ["Ref. Code",           maid.referenceCode],
    ["Type",                maid.type],
    ["Nationality",         maid.nationality],
    ["Category",            String((agencyContact?.["indianMaidCategory"] ?? introduction["indianMaidCategory"] ?? skillsPreferences["indianMaidCategory"] ?? "N/A") as string | number | boolean)],
    ["Date of Birth",       formatDate(maid.dateOfBirth)],
    ["Place of Birth",      maid.placeOfBirth],
    ["Height / Weight",     `${maid.height}cm / ${maid.weight}kg`],
    ["Religion",            maid.religion],
    ["Marital Status",      maid.maritalStatus],
    ["Children",            String(maid.numberOfChildren)],
    ["Siblings",            String(maid.numberOfSiblings)],
    ["Home Address",        maid.homeAddress],
    ["Repatriation Airport",maid.airportRepatriation],
    ["Education",           maid.educationLevel],
    ["Home Contact No.",    String(agencyContact?.homeCountryContactNumber || "N/A")],
  ];

  const medicalRows: Array<[string, string]> = [
    ["Allergies",       String(introduction?.allergies || "N/A")],
    ["Disabilities",    String(introduction?.physicalDisabilities || "N/A")],
    ["Dietary",         String(introduction?.dietaryRestrictions || "N/A")],
    ["Food Handling",   String(introduction?.foodHandlingPreferences || "N/A")],
    ["Other Illnesses", String(introduction?.otherIllnesses || "N/A")],
    ["Remarks",         String(introduction?.otherRemarks || "N/A")],
  ];

  const availabilityRows: Array<[string, string]> = [
    ["Available From",   String(introduction?.availability || "N/A")],
    ["Contract Ends",    String(introduction?.contractEnds || "N/A")],
    ["Present Salary",   String(introduction?.presentSalary || "N/A")],
    ["Expected Salary",  String(introduction?.expectedSalary || "N/A")],
    ["Offday Comp.",     String(introduction?.offdayCompensation || "N/A")],
    ["Off-days/Month",   String(skillsPreferences?.offDaysPerMonth || "N/A")],
    ["Avail. Remark",    String(skillsPreferences?.availabilityRemark || "N/A")],
  ];

  const privateRows: Array<[string, string]> = [
    ["Passport No.",     String(agencyContact?.passportNo || "N/A")],
    ["Ages of Children", String(introduction?.agesOfChildren || "N/A")],
    ["Maid Loan",        String(introduction?.maidLoan || "N/A")],
    ["Private Info",     String(skillsPreferences?.privateInfo || "N/A")],
  ];

  // Filtered work areas for skills table
  const filteredWorkAreas = orderedWorkAreas.filter(([, config]) => {
    const ev = String(config.evaluation || "").trim();
    return Boolean(config.willing || config.experience || (ev && ev !== "-" && ev !== "N.A."));
  });

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="client-page-theme min-h-screen bg-card">
      {!embedded && (isLoggedIn ? <ClientPortalNavbar /> : <PublicSiteNavbar />)}

      {/* Lightbox */}
      {lightboxPhoto && (
        <div role="dialog" aria-modal="true" aria-label="Photo viewer" className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm" onClick={() => setLightboxPhoto(null)}>
          <div className="relative" onClick={(e) => e.stopPropagation()}>
            <img src={lightboxPhoto} alt="Full size" className="max-h-[90vh] max-w-[90vw] rounded-lg object-contain" />
            <button type="button" aria-label="Close" className="absolute -top-3 -right-3 flex h-10 w-10 items-center justify-center rounded-full bg-white text-black text-xs font-bold shadow" onClick={() => setLightboxPhoto(null)}>✕</button>
          </div>
        </div>
      )}

      {/* Tell Friend Modal */}
      {isTellFriendOpen && (
        <TellFriendModal
          maid={maid}
          agencyName={agencyName}
          agencyPhone={agencyPhone}
          agencyContactPerson={agencyContactPerson}
          onClose={() => setIsTellFriendOpen(false)}
        />
      )}

      <div className="page-container">
        {/* Back link */}
        <div className="mb-5">
          <Link
            to="/client/maids/search"
            className="group inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-sm font-semibold text-black shadow-sm transition-all duration-200"
          >
            <ArrowLeft className="h-4 w-4 transition-transform duration-200 group-hover:-translate-x-1" />
            <span>Back to all maids</span>
          </Link>
        </div>

        <div className="content-card animate-fade-in-up space-y-4">

          {/* ── Action toolbar ── */}
          <div className="flex flex-wrap items-center gap-x-0.5 gap-y-1 rounded-lg border bg-gray-50 px-2 py-1.5">
            <Link to="/client/maids/search" className="rounded px-2.5 py-1 text-xs font-semibold text-black hover:bg-gray-100 transition-colors">All Maids</Link>
            <span className="mx-1 text-gray-300 select-none">|</span>

            <button
              onClick={() => handleToggleShortlist()}
              className={`flex items-center gap-1 rounded px-2.5 py-1 text-xs font-semibold transition-colors hover:bg-gray-100 ${isShortlisted ? "text-rose-500" : "text-black"}`}
            >
              <Heart className={`h-3.5 w-3.5 ${isShortlisted ? "fill-rose-500" : ""}`} />
              {isShortlisted ? "Shortlisted" : "Shortlist"}
            </button>

            <button
              onClick={() => setIsTellFriendOpen(true)}
              className="flex items-center gap-1 rounded px-2.5 py-1 text-xs font-semibold text-black hover:bg-gray-100 transition-colors"
            >
              <Share2 className="h-3.5 w-3.5" /> Tell Friend
            </button>

            <button
              onClick={() => setIsShortlistOpen(true)}
              className="flex items-center gap-1 rounded px-2.5 py-1 text-xs font-semibold text-black hover:bg-gray-100 transition-colors"
            >
              <Eye className="h-3.5 w-3.5" /> My Shortlist ({shortlistRefs.length})
            </button>

            <span className="mx-1 text-gray-300 select-none">|</span>

            <Link
              to={
                isLoggedIn
                  ? `/client/support-chat?type=agency&agencyId=${encodeURIComponent(String(maid.agencyId ?? 1))}&agencyName=${encodeURIComponent(maid.agencyName || agencyName)}&maidRef=${encodeURIComponent(maid.referenceCode)}&maidName=${encodeURIComponent(maid.fullName)}`
                  : "/employer-login"
              }
              className="flex items-center gap-1 rounded px-2.5 py-1 text-xs font-semibold text-black hover:bg-gray-100 transition-colors"
            >
              <MessageCircle className="h-3.5 w-3.5" /> Contact Agency
            </Link>
          </div>

          {/* Login prompt */}
          {!isLoggedIn && (
            <div className="rounded-lg border bg-gray-50 p-4 text-center">
              <p className="text-sm text-black font-medium">Photos and detailed biodata are blurred until employer login.</p>
              <div className="mt-3">
                <Button asChild><Link to="/employer-login">Employer Login</Link></Button>
              </div>
            </div>
          )}

          {/* ── Top grid: video / agency / photos ── */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-[1fr_200px_auto]">

            {/* Video */}
            <div className={`relative min-h-[180px] overflow-hidden rounded-lg border bg-gray-50 ${!isLoggedIn ? "blur-md" : ""}`}>
              {youtubeEmbedUrl ? (
                <iframe className="absolute inset-0 h-full w-full" src={youtubeEmbedUrl} title="YouTube video"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  referrerPolicy="strict-origin-when-cross-origin" allowFullScreen />
              ) : maid.videoDataUrl ? (
                <video controls className="absolute inset-0 h-full w-full object-cover" src={maid.videoDataUrl} />
              ) : (
                <div className="flex min-h-[180px] items-center justify-center p-4 text-center">
                  <p className="text-xs text-black">No video introduction available.</p>
                </div>
              )}
            </div>

            {/* Agency card */}
            <div className="rounded-lg border bg-gray-50 p-3 space-y-1 text-xs">
              <p className="text-[11px] font-bold uppercase tracking-widest text-black mb-2">Agency</p>
              <p className="font-bold text-black text-sm leading-snug">{agencyName}</p>
              <p className="text-black">Lic. No.: {company?.license_no || String(agencyContact?.licenseNo || "N/A")}</p>
              <p className="text-sm text-black">
                Please call: <span className="font-bold">{String(agencyContact.contactPerson || "Bala/Ricky")}</span>
              </p>
              <p className="text-black">Phone: <span className="font-semibold text-primary">{agencyPhone || "N/A"}</span></p>
              <div className="pt-2 mt-1 border-t">
                <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-semibold ${(maid.status || "available") === "available" ? "bg-emerald-50 text-emerald-700" : "bg-gray-100 text-black"}`}>
                  <span className="h-1.5 w-1.5 rounded-full bg-current" />
                  {maid.status || "available"}
                </span>
              </div>
            </div>

            {/* Photos */}
            <div className={`flex flex-col gap-2 ${!isLoggedIn ? "select-none blur-sm" : ""}`}>
              <p className="text-[11px] font-bold uppercase tracking-widest text-black">{photos.length}/5 photos</p>
              <div className="flex gap-2">
                <div className="flex flex-col items-center gap-1">
                  <span className="text-[11px] font-semibold text-black uppercase tracking-wide">Passport</span>
                  <button type="button" disabled={!passportOrTwoByTwoPhoto || !isLoggedIn}
                    onClick={() => passportOrTwoByTwoPhoto && setLightboxPhoto(passportOrTwoByTwoPhoto)}
                    className="group relative flex h-32 w-24 items-center justify-center overflow-hidden rounded-lg border-2 border-dashed border-gray-200 bg-gray-50 transition hover:border-primary/40 disabled:cursor-default">
                    {passportOrTwoByTwoPhoto ? (
                      <>
                        <img src={passportOrTwoByTwoPhoto} alt="passport" className="h-full w-full object-contain" />
                        <span className="absolute inset-0 flex items-end justify-center bg-black/20 pb-1 opacity-0 transition-opacity group-hover:opacity-100">
                          <span className="rounded bg-black/60 px-1.5 py-0.5 text-[11px] text-white">View</span>
                        </span>
                      </>
                    ) : <span className="text-xs text-black">No photo</span>}
                  </button>
                </div>
                <div className="flex flex-col items-center gap-1">
                  <span className="text-[11px] font-semibold text-black uppercase tracking-wide">Full body</span>
                  <button type="button" disabled={!fullBodyPhoto || !isLoggedIn}
                    onClick={() => fullBodyPhoto && setLightboxPhoto(fullBodyPhoto)}
                    className="group relative flex h-48 w-24 items-center justify-center overflow-hidden rounded-lg border-2 border-dashed border-gray-200 bg-gray-50 transition hover:border-primary/40 disabled:cursor-default">
                    {fullBodyPhoto ? (
                      <>
                        <img src={fullBodyPhoto} alt="full body" className="h-full w-full object-contain" />
                        <span className="absolute inset-0 flex items-end justify-center bg-black/20 pb-1 opacity-0 transition-opacity group-hover:opacity-100">
                          <span className="rounded bg-black/60 px-1.5 py-0.5 text-[11px] text-white">View</span>
                        </span>
                      </>
                    ) : <span className="text-xs text-black">No photo</span>}
                  </button>
                </div>
              </div>
              {extraPhotos.length > 0 && (
                <div className="flex gap-1.5">
                  {extraPhotos.map((photo, index) => (
                    <button key={`${photo}-${index}`} type="button" disabled={!isLoggedIn}
                      onClick={() => setLightboxPhoto(photo)}
                      className="group relative h-14 w-14 overflow-hidden rounded-md border border-gray-200 bg-gray-50 transition hover:border-primary/40 disabled:cursor-default">
                      <img src={photo} alt={`extra ${index + 1}`} className="h-full w-full object-contain" />
                      <span className="absolute inset-0 bg-black/20 opacity-0 transition-opacity group-hover:opacity-100" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* ── Personal details + Other info / Availability ── */}
          <div className={`grid grid-cols-1 gap-4 lg:grid-cols-[1fr_260px] ${!isLoggedIn ? "select-none blur-sm" : ""}`}>

            {/* Personal details */}
            <div className="rounded-lg border overflow-hidden">
              <SectionHeader>Personal Details</SectionHeader>
              {/*
                ── MOBILE FIX ──
                On mobile the fixed 140px label column was too wide relative to the content column,
                causing the language stars to overflow. We now use:
                  - grid-cols-[100px_1fr]  on mobile (< sm)
                  - grid-cols-[130px_1fr]  on sm+
                And the language row inner flex uses flex-wrap + min-w-0 on the label so it never
                pushes the stars off-screen.
              */}
              <div className="grid grid-cols-[100px_1fr] sm:grid-cols-[130px_1fr] p-3 sm:p-4 text-sm">
                {detailRows.map(([label, value]) => <KVRow key={label} label={label} value={value} />)}

                {/* ── LANGUAGES — always star ratings ── */}
                <p className="py-1 pr-2 text-[12px] font-semibold text-black border-b border-dashed border-gray-200 leading-snug">Languages</p>
                <div className="py-1 text-[13px] border-b border-dashed border-gray-200 space-y-2 min-w-0">
                  {fixedLanguages.map(([lang, level]) => (
                    <div key={lang} className="flex items-center gap-2 min-w-0">
                      {/* Label shrinks; stars stay right but don't overflow */}
                      <span className="font-medium text-black text-[12px] leading-tight flex-1 min-w-0 break-words">{lang}</span>
                      <LanguageRating level={level} />
                    </div>
                  ))}
                  {otherLanguages.length > 0 && (
                    <button
                      type="button"
                      className="text-primary text-[12px] hover:underline"
                      onClick={() => setShowOtherLanguages((p) => !p)}
                    >
                      {showOtherLanguages ? "Hide others" : `+${otherLanguages.length} more`}
                    </button>
                  )}
                  {showOtherLanguages && otherLanguages.map(([lang, level]) => (
                    <div key={lang} className="flex items-center gap-2 min-w-0">
                      <span className="text-black text-[12px] leading-tight flex-1 min-w-0 break-words">{lang}</span>
                      <LanguageRating level={level} />
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Other info + Availability */}
            <div className="flex flex-col gap-4">
              <div className="rounded-lg border overflow-hidden">
                <SectionHeader>Other Information</SectionHeader>
                <div className="p-3 space-y-1.5">
                  {availabilityRemarkItems.map((item) => {
                    const yes = item.keys.some((key) => Boolean(otherInformation[key]));
                    return (
                      <div key={item.label} className="flex items-center justify-between gap-2">
                        <span className="text-[12px] text-black font-medium">{item.label}</span>
                        <YesNoBadge yes={yes} />
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="rounded-lg border overflow-hidden">
                <SectionHeader>Availability</SectionHeader>
                <div className="grid grid-cols-[auto_1fr] p-3">
                  {availabilityRows.map(([label, value]) => <KVRow key={label} label={label} value={value} />)}
                </div>
              </div>
            </div>
          </div>

          {/* ── Maid Skills ── */}
          <div className={`rounded-lg border overflow-hidden ${!isLoggedIn ? "select-none blur-sm" : ""}`}>
            <SectionHeader>Maid Skills</SectionHeader>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[480px]">
                <thead>
                  <tr className="border-b bg-gray-50 text-[11px] font-bold uppercase tracking-wide text-black">
                    <th className="px-4 py-2.5 text-left">Area of Work</th>
                    <th className="px-4 py-2.5 text-center w-20">Willing</th>
                    <th className="px-4 py-2.5 text-center w-32">Experience</th>
                    <th className="px-4 py-2.5 text-center w-36">
                      Evaluation<br />
                      <span className="font-normal normal-case text-[11px]">Stars out of 5</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y text-xs">
                  {filteredWorkAreas.map(([area, config]) => {
                    const rawAge       = String(workAreaNotes["Care of infants/children"] || "").trim();
                    const formattedAge = rawAge ? rawAge.replace(/\s*-\s*/g, "–") : "";
                    const needsYears   = formattedAge && !/year/i.test(formattedAge);
                    const areaLabel    = area === "Care of infants/children" && formattedAge
                      ? `Care of infants/children (${formattedAge}${needsYears ? " years" : ""})`
                      : area;
                    const yrs = String(config.yearsOfExperience || "").trim();
                    return (
                      <tr key={area} className="hover:bg-gray-50">
                        <td className="px-4 py-2 text-[13px] text-black">{areaLabel}</td>
                        <td className="px-4 py-2 text-center"><YesNoBadge yes={Boolean(config.willing)} /></td>
                        <td className="px-4 py-2 text-center">
                          <div className="flex flex-col items-center gap-1">
                            <YesNoBadge yes={Boolean(config.experience)} />
                            {config.experience && yrs && (
                              <span className="text-[11px] text-black">{yrs} {Number(yrs) === 1 ? "year" : "years"}</span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-2 text-center"><StarDisplay evaluation={config.evaluation} /></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* ── Cooking / Other skill notes ── */}
          {(workAreaNotes["Cooking"] || workAreaNotes["Other Skill"]) && (
            <div className={`grid gap-3 sm:grid-cols-2 ${!isLoggedIn ? "select-none blur-sm" : ""}`}>
              {workAreaNotes["Cooking"] && (
                <div className="rounded-lg border overflow-hidden">
                  <SectionHeader>Cooking Notes</SectionHeader>
                  <p className="p-3 text-[13px] whitespace-pre-wrap text-black">{workAreaNotes["Cooking"]}</p>
                </div>
              )}
              {workAreaNotes["Other Skill"] && (
                <div className="rounded-lg border overflow-hidden">
                  <SectionHeader>Other Skill Notes</SectionHeader>
                  <p className="p-3 text-[13px] whitespace-pre-wrap text-black">{workAreaNotes["Other Skill"]}</p>
                </div>
              )}
            </div>
          )}

          {/* ── Employment history ── */}
          {employment.length > 0 && (
            <div className={`rounded-lg border overflow-hidden ${!isLoggedIn ? "select-none blur-sm" : ""}`}>
              <SectionHeader>Employment History</SectionHeader>

              {/* Desktop table (md+) */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b bg-gray-50 text-[11px] font-bold uppercase tracking-wide text-black">
                      {["From", "To", "Country", "Employer", "Duties", "Remarks"].map((h) => (
                        <th key={h} className="px-4 py-2.5 text-left">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {employment.map((item, index) => {
                      const row = item as Record<string, string>;
                      return (
                        <tr key={`${maid.referenceCode}-${index}`} className="hover:bg-gray-50">
                          <td className="px-4 py-2 text-[13px] text-black whitespace-nowrap">{formatDate(row.from) === "N/A" ? "—" : formatDate(row.from)}</td>
                          <td className="px-4 py-2 text-[13px] text-black whitespace-nowrap">{formatDate(row.to)   === "N/A" ? "—" : formatDate(row.to)}</td>
                          <td className="px-4 py-2 text-[13px] text-black">{row.country  || "—"}</td>
                          <td className="px-4 py-2 text-[13px] text-black">{row.employer || "—"}</td>
                          <td className="px-4 py-2 text-[13px] text-black">{row.duties   || "—"}</td>
                          <td className="px-4 py-2 text-[13px] text-black">{row.remarks  || "—"}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile stacked cards (< md) */}
              <div className="block md:hidden divide-y">
                {employment.map((item, index) => {
                  const row = item as Record<string, string>;
                  const from    = formatDate(row.from) === "N/A" ? "—" : formatDate(row.from);
                  const to      = formatDate(row.to)   === "N/A" ? "—" : formatDate(row.to);
                  const country  = row.country  || "—";
                  const employer = row.employer || "—";
                  const duties   = row.duties   || "—";
                  const remarks  = row.remarks  || "—";
                  return (
                    <div key={`${maid.referenceCode}-mob-${index}`} className="px-4 py-3 space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-gray-100 text-[11px] font-bold text-black flex-shrink-0">
                          {index + 1}
                        </span>
                        <span className="text-[12px] font-semibold text-black flex-1 text-right">
                          {from} — {to}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-x-3 gap-y-1">
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400">Country</p>
                          <p className="text-[13px] text-black leading-snug">{country}</p>
                        </div>
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400">Employer</p>
                          <p className="text-[13px] text-black leading-snug">{employer}</p>
                        </div>
                      </div>
                      {duties !== "—" && (
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400">Duties</p>
                          <p className="text-[13px] text-black leading-snug">{duties}</p>
                        </div>
                      )}
                      {remarks !== "—" && (
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400">Remarks</p>
                          <p className="text-[13px] text-black leading-snug">{remarks}</p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── Medical / Private info ── */}
          <div className={`grid grid-cols-1 gap-4 lg:grid-cols-2 ${!isLoggedIn ? "select-none blur-sm" : ""}`}>

            {/* Medical */}
            <div className="rounded-lg border overflow-hidden">
              <SectionHeader>Medical / Dietary</SectionHeader>
              <div className="grid grid-cols-[100px_1fr] sm:grid-cols-[130px_1fr] p-3 sm:p-4 text-sm">
                {medicalRows.map(([label, value]) => <KVRow key={label} label={label} value={value} />)}
              </div>
              {Object.keys(pastIllnesses).length > 0 && (
                <div className="border-t p-3">
                  <p className="text-[11px] font-bold uppercase tracking-widest text-black mb-2">Past Illnesses</p>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {Object.entries(pastIllnesses).map(([illness, value]) => (
                      <div key={illness} className="flex items-center justify-between gap-3">
                        <span className="text-[13px] text-black">{illness}</span>
                        {value
                          ? <Check className="h-3.5 w-3.5 text-primary" />
                          : <YesNoBadge yes={false} />
                        }
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Private */}
            <div className="rounded-lg border overflow-hidden">
              <SectionHeader>Private Information</SectionHeader>
              {canViewPrivateIntro ? (
                <div className="grid grid-cols-[100px_1fr] sm:grid-cols-[130px_1fr] p-3 sm:p-4 text-sm">
                  {privateRows.map(([label, value]) => <KVRow key={label} label={label} value={value} />)}
                </div>
              ) : (
                <div className="p-4 text-sm text-black">
                  Private fields are hidden until employer login and email verification.
                </div>
              )}
            </div>
          </div>

          {/* ── Public / Private introduction ── */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div className="rounded-lg border overflow-hidden">
              <SectionHeader>Public Introduction</SectionHeader>
              <p className="p-4 text-[13px] whitespace-pre-wrap text-black leading-relaxed">
                {publicIntro || "No public introduction added yet."}
              </p>
            </div>
            {canViewPrivateIntro && (
              <div className="rounded-lg border border-amber-200 bg-amber-50/30 overflow-hidden">
                <SectionHeader>Private Introduction</SectionHeader>
                <p className="p-4 text-[13px] whitespace-pre-wrap text-black leading-relaxed">
                  {String(introduction?.intro || "—")}
                </p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between border-t pt-3 text-[12px] font-medium text-black">
            <span>Last updated: {formatDate(maid.updatedAt)}</span>
            <span className={!isLoggedIn ? "blur-sm select-none" : ""}>Ref: {maid.referenceCode}</span>
          </div>
        </div>

        {/* ── Shortlist dialog ── */}
        <Dialog open={isShortlistOpen} onOpenChange={setIsShortlistOpen}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-black">
                <Star className="h-4 w-4 fill-amber-400 text-amber-500" />
                My Shortlist
                {shortlistRefs.length > 0 && (
                  <span className="inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-amber-100 px-1.5 text-[11px] font-bold text-amber-700">
                    {shortlistRefs.length}
                  </span>
                )}
              </DialogTitle>
              <DialogDescription className="text-[13px] text-black">
                Click any profile to view full details. Tap the star to remove from shortlist.
              </DialogDescription>
            </DialogHeader>

            {shortlistRefs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-amber-50">
                  <Star className="h-7 w-7 text-amber-300" />
                </div>
                <p className="text-sm font-semibold text-black">No maids shortlisted yet</p>
                <p className="mt-1 max-w-xs text-xs text-black">
                  Tap the star that appears on any profile card to add it to your shortlist.
                </p>
              </div>
            ) : (
              <div className="max-h-[68vh] overflow-y-auto pr-1">
                {isShortlistLoading ? (
                  <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5">
                    {Array.from({ length: 10 }).map((_, i) => (
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
                ) : (
                  <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5">
                    {shortlistMaids.map((shortlistedMaid) => (
                      <ShortlistMaidCard
                        key={`sl-${shortlistedMaid.referenceCode}`}
                        maid={shortlistedMaid}
                        isShortlisted={shortlistRefs.includes(shortlistedMaid.referenceCode)}
                        onToggleShortlist={handleToggleShortlist}
                        onNavigate={() => setIsShortlistOpen(false)}
                      />
                    ))}
                    {missingShortlistRefs.map((ref) => (
                      <div
                        key={`missing-${ref}`}
                        className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-muted/20 p-3 text-center"
                        style={{ aspectRatio: "3/4" }}
                      >
                        <svg className="h-6 w-6 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                          <circle cx="12" cy="12" r="10" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01" />
                        </svg>
                        <p className="break-all font-mono text-[11px] text-black">{ref}</p>
                        <p className="text-[11px] text-black">Profile not found</p>
                        <button
                          type="button"
                          onClick={() => handleToggleShortlist(ref)}
                          className="text-[11px] font-semibold text-destructive hover:underline"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="mt-4 flex items-center justify-between border-t border-border/60 pt-3">
                  <p className="text-xs text-black">
                    <span className="font-semibold">{shortlistMaids.length}</span>{" "}
                    {shortlistMaids.length === 1 ? "profile" : "profiles"} shortlisted
                    {missingShortlistRefs.length > 0 && (
                      <span className="ml-1 text-black"> · {missingShortlistRefs.length} not found</span>
                    )}
                  </p>
                  <button
                    type="button"
                    onClick={() => shortlistRefs.forEach((ref) => handleToggleShortlist(ref))}
                    className="text-xs font-semibold text-destructive hover:underline"
                  >
                    Clear all
                  </button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default PublicMaidProfile;