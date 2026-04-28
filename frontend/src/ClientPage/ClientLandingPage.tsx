import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight, CheckCircle, HeartHandshake, Users, X, Star,
  Shield, ChevronRight, Search, Home, Heart, Baby, Backpack,
  BadgeCheck, Sparkles, PhoneCall, Lock, UserCheck, TrendingUp,
  Award, SlidersHorizontal, LayoutGrid,
} from "lucide-react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import PublicSiteNavbar from "@/components/PublicSiteNavbar";
import ClientPortalNavbar from "@/ClientPage/ClientPortalNavbar";
import { toast } from "@/components/ui/sonner";
import { getStoredClient, getClientToken, type ClientUser } from "@/lib/clientAuth";
import { buildEmployerLoginPath } from "@/lib/clientNavigation";
import { calculateAge, MaidProfile } from "@/lib/maids";
import { filterMaids } from "@/lib/maidFilter";
import { syncClientProfileFromSession } from "@/lib/supabaseAuth";
import culinaryImg from "./assets/culinary.png";
import elderlyImg from "./assets/elderly-care.png";
import familyImg from "./assets/family.jpg";
import heroImage from "./assets/maid1.png";
import housekeepingImg from "./assets/housekeeping.png";
import infantImg from "./assets/infant-care.png";
import "./ClientTheme.css";

/* ─────────────────────────────────────────────────────────────────────────────
   GLOBAL STYLES
───────────────────────────────────────────────────────────────────────────── */
const GLOBAL_STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Unbounded:wght@700;800;900&family=DM+Sans:ital,wght@0,300;0,400;0,500;0,600;0,700;1,400&display=swap');

  :root {
    --yellow: #FFE000;
    --yellow-light: #FFF176;
    --yellow-dark: #F5C800;
    --green-neon: #39FF14;
    --green-bright: #5DD800;
    --green-mid: #2E8B00;
    --green-deep: #145200;
    --green-darkest: #0B2E00;
    --green-ink: #061800;
    --card-bg: #F9FFE8;
    --card-border: #C5E87A;
  }

  *, *::before, *::after { box-sizing: border-box; }

  @keyframes floatY {
    0%,100% { transform: translateY(0); }
    50%      { transform: translateY(-9px); }
  }
  @keyframes pulse-ring {
    0%   { box-shadow: 0 0 0 0 rgba(255,224,0,0.55); }
    70%  { box-shadow: 0 0 0 14px rgba(255,224,0,0); }
    100% { box-shadow: 0 0 0 0   rgba(255,224,0,0); }
  }
  @keyframes shimmer {
    0%   { background-position: -400px 0; }
    100% { background-position:  400px 0; }
  }
  @keyframes ticker {
    0%   { transform: translateX(0); }
    100% { transform: translateX(-50%); }
  }
  @keyframes fadeSlideUp {
    from { opacity:0; transform:translateY(22px); }
    to   { opacity:1; transform:translateY(0); }
  }
  @keyframes rotateSlow {
    from { transform: rotate(0deg); }
    to   { transform: rotate(360deg); }
  }

  .hero-headline { font-family: 'Unbounded', sans-serif; }
  .dm { font-family: 'DM Sans', sans-serif; }

  .btn-yellow {
    background: var(--yellow);
    color: var(--green-ink);
    font-family: 'Unbounded', sans-serif;
    font-size: 12px;
    font-weight: 800;
    letter-spacing: 0.03em;
    padding: 14px 26px;
    border-radius: 100px;
    border: none;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    gap: 8px;
    transition: transform 0.18s, box-shadow 0.18s, background 0.18s;
    box-shadow: 0 4px 0 #C8A800, 0 8px 28px rgba(255,224,0,0.35);
    text-decoration: none;
    white-space: nowrap;
  }
  .btn-yellow:hover {
    transform: translateY(-3px);
    box-shadow: 0 7px 0 #C8A800, 0 14px 38px rgba(255,224,0,0.42);
    background: var(--yellow-light);
  }
  .btn-yellow:active { transform: translateY(1px); box-shadow: 0 2px 0 #C8A800; }

  .btn-outline-white {
    background: transparent;
    color: rgba(255,255,255,0.88);
    font-family: 'Unbounded', sans-serif;
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.04em;
    padding: 14px 24px;
    border-radius: 100px;
    border: 2px solid rgba(255,255,255,0.25);
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    gap: 8px;
    transition: all 0.18s;
    text-decoration: none;
    white-space: nowrap;
  }
  .btn-outline-white:hover {
    border-color: var(--yellow);
    color: var(--yellow);
    background: rgba(255,224,0,0.07);
  }

  .stat-card {
    background: rgba(255,255,255,0.06);
    border: 1px solid rgba(255,255,255,0.12);
    border-radius: 16px;
    padding: 16px;
    display: flex;
    flex-direction: column;
    gap: 4px;
    transition: background 0.2s, border-color 0.2s;
  }
  .stat-card:hover {
    background: rgba(255,224,0,0.08);
    border-color: rgba(255,224,0,0.3);
  }

  .maid-card {
    background: #fff;
    border: 2px solid #E8F4C8;
    border-radius: 0;
    overflow: hidden;
    transition: all 0.22s cubic-bezier(0.34,1.56,0.64,1);
    cursor: pointer;
  }
  .maid-card:hover {
    border-color: var(--yellow-dark);
    transform: translateY(-6px) scale(1.03);
    box-shadow: 0 24px 56px rgba(93,216,0,0.2), 0 4px 0 var(--yellow-dark);
  }
  .maid-card img {
    width: 100%;
    height: auto;
    aspect-ratio: 3/4;
    object-fit: contain;
    display: block;
    background: #f8f8f8;
  }

  .feature-card {
    background: #fff;
    border: 2px solid #DCF0A0;
    border-radius: 22px;
    padding: 24px;
    display: flex;
    gap: 18px;
    align-items: flex-start;
    transition: all 0.25s;
  }
  .feature-card:hover {
    border-color: var(--yellow-dark);
    box-shadow: 0 16px 50px rgba(93,216,0,0.14);
    transform: translateY(-4px);
  }

  .ticker-track { display: flex; gap: 0; width: max-content; animation: ticker 28s linear infinite; }
  .ticker-track:hover { animation-play-state: paused; }

  .search-card {
    background: #fff;
    border-radius: 24px;
    border: 2px solid #C8E87A;
    box-shadow: 0 8px 0 #AACF50, 0 24px 60px rgba(46,139,0,0.12);
    overflow: hidden;
  }

  .tag-pill {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 8px 16px;
    border-radius: 100px;
    font-size: 12px;
    font-weight: 600;
    border: 2px solid #D4ECA0;
    background: #F5FFDF;
    color: #2E6000;
    cursor: pointer;
    transition: all 0.15s;
    font-family: 'DM Sans', sans-serif;
  }
  .tag-pill.active {
    background: var(--yellow);
    border-color: #C8A800;
    color: var(--green-ink);
    box-shadow: 0 3px 0 #9E8200;
  }
  .tag-pill:hover:not(.active) { border-color: #8EC83A; background: #EDFFC0; }

  .floating-badge {
    background: #fff;
    border-radius: 18px;
    padding: 12px 16px;
    display: flex;
    align-items: center;
    gap: 12px;
    box-shadow: 0 12px 40px rgba(0,0,0,0.15);
    border: 2px solid #F0F7E0;
  }

  .hero-noise {
    background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='1'/%3E%3C/svg%3E");
    background-size: 160px;
    opacity: 0.04;
    mix-blend-mode: overlay;
  }

  .select-styled {
    appearance: none;
    width: 100%;
    padding: 11px 14px;
    border: 2px solid #C8E87A;
    border-radius: 14px;
    font-size: 13px;
    font-weight: 600;
    color: #1A3D00;
    background: #F5FFF0;
    font-family: 'DM Sans', sans-serif;
    outline: none;
    cursor: pointer;
    transition: border-color 0.2s, box-shadow 0.2s;
  }
  .select-styled:focus { border-color: var(--green-mid); box-shadow: 0 0 0 3px rgba(46,139,0,0.14); }

  .input-styled {
    width: 100%;
    padding: 11px 40px 11px 14px;
    border: 2px solid #C8E87A;
    border-radius: 14px;
    font-size: 13px;
    font-weight: 500;
    color: #1A3D00;
    background: #F5FFF0;
    font-family: 'DM Sans', sans-serif;
    outline: none;
    transition: border-color 0.2s, box-shadow 0.2s;
  }
  .input-styled::placeholder { color: #9EC860; }
  .input-styled:focus { border-color: var(--green-mid); box-shadow: 0 0 0 3px rgba(46,139,0,0.14); }

  .section-chip {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 6px 14px;
    border-radius: 100px;
    font-size: 10px;
    font-weight: 800;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    font-family: 'Unbounded', sans-serif;
  }

  .service-card {
    border-radius: 24px;
    overflow: hidden;
    position: relative;
    height: 320px;
    transition: transform 0.3s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.3s;
  }
  .service-card:hover { transform: translateY(-8px) scale(1.02); box-shadow: 0 32px 70px rgba(0,0,0,0.35); }
  .service-card img { width:100%; height:100%; object-fit:cover; transition: transform 0.5s; }
  .service-card:hover img { transform: scale(1.08); }
  .service-overlay {
    position: absolute; inset: 0;
    background: linear-gradient(to top, rgba(6,24,0,0.92) 0%, rgba(6,24,0,0.3) 52%, transparent 100%);
  }
  .service-card-badge {
    position: absolute;
    top: 16px; right: 16px;
    background: var(--yellow);
    color: var(--green-ink);
    font-family: 'Unbounded', sans-serif;
    font-size: 9px;
    font-weight: 900;
    padding: 4px 10px;
    border-radius: 100px;
    letter-spacing: 0.05em;
  }

  .pagination-btn {
    min-width: 40px;
    height: 40px;
    padding: 0 12px;
    border-radius: 12px;
    border: 2px solid #D8ECA0;
    background: #fff;
    font-family: 'DM Sans', sans-serif;
    font-size: 13px;
    font-weight: 700;
    color: #2E6000;
    cursor: pointer;
    transition: all 0.15s;
  }
  .pagination-btn:hover:not(:disabled) { border-color: var(--yellow-dark); background: var(--yellow); color: var(--green-ink); }
  .pagination-btn.active { background: var(--green-mid); border-color: var(--green-mid); color: #fff; }
  .pagination-btn:disabled { opacity: 0.35; cursor: not-allowed; }

  @media (max-width: 900px) {
    .hero-grid { grid-template-columns: 1fr !important; }
    .hero-image-col { display: none !important; }
    .stats-grid { grid-template-columns: repeat(2, 1fr) !important; }
    .hero-headline-size { font-size: clamp(1.8rem, 7vw, 2.8rem) !important; }
  }
  @media (max-width: 768px) {
    .filter-row { flex-direction: column !important; gap: 10px !important; }
    .filter-label { width: auto !important; }
    .nat-lang-row { flex-direction: column !important; gap: 12px !important; }
    .search-body { padding: 16px 18px !important; }
    .search-actions { flex-direction: column !important; align-items: stretch !important; }
    .search-actions .btn-yellow,
    .search-actions .btn-search-now { width: 100%; justify-content: center; }
  }
  @media (max-width: 900px) {
    .why-grid { grid-template-columns: 1fr !important; }
    .why-image-col { display: none !important; }
  }
  @media (max-width: 900px) {
    .footer-grid { grid-template-columns: 1fr 1fr !important; gap: 28px !important; }
  }
  @media (max-width: 520px) {
    .footer-grid { grid-template-columns: 1fr !important; }
  }
  @media (max-width: 600px) {
    .services-grid { grid-template-columns: 1fr !important; }
  }
  .maid-grid {
    display: grid;
    gap: 16px;
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  }
  @media (max-width: 900px) {
    .maid-grid { grid-template-columns: repeat(auto-fill, minmax(170px, 1fr)); gap: 12px; }
  }
  @media (max-width: 600px) {
    .maid-grid { grid-template-columns: repeat(2, 1fr); gap: 10px; }
  }
  @media (max-width: 360px) {
    .maid-grid { grid-template-columns: 1fr; }
  }
  .maid-card-info { padding: 14px 14px 16px; }
  @media (max-width: 480px) {
    .maid-card-info { padding: 10px 10px 12px; }
  }
  @media (max-width: 640px) {
    .section-pad { padding: 48px 0 !important; }
    .section-pad-lg { padding: 56px 0 !important; }
    .hero-section { padding: 40px 16px 0 !important; }
  }
`;

/* ─────────────────────────────────────────────────────────────────────────────
   HELPERS
───────────────────────────────────────────────────────────────────────────── */
const ClipboardList = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="8" y="2" width="8" height="4" rx="1" ry="1"/>
    <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/>
    <line x1="9" y1="12" x2="15" y2="12"/>
    <line x1="9" y1="16" x2="13" y2="16"/>
  </svg>
);

const NATIONALITY_FLAGS: Record<string, string> = {
  filipino: "ph", philippines: "ph", indonesian: "id", indonesia: "id",
  myanmar: "mm", burmese: "mm", cambodian: "kh", cambodia: "kh",
  vietnamese: "vn", vietnam: "vn", thai: "th", thailand: "th",
  malaysian: "my", malaysia: "my", singaporean: "sg", singapore: "sg",
  indian: "in", india: "in", "sri lankan": "lk", "sri lanka": "lk",
  bangladeshi: "bd", bangladesh: "bd", nepali: "np", nepalese: "np", nepal: "np",
  pakistani: "pk", pakistan: "pk", chinese: "cn", china: "cn",
  hongkong: "hk", "hong kong": "hk", taiwanese: "tw", taiwan: "tw",
  korean: "kr", "south korea": "kr", japanese: "jp", japan: "jp",
  ethiopian: "et", ethiopia: "et", kenyan: "ke", kenya: "ke",
  ugandan: "ug", uganda: "ug", ghanaian: "gh", ghana: "gh",
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
    <span style={{ display:"inline-flex",alignItems:"center",justifyContent:"center",width:16,height:16,borderRadius:"50%",overflow:"hidden",border:"1px solid rgba(0,0,0,0.12)",background:"#e5e7eb",flexShrink:0,verticalAlign:"middle" }}>
      <img src={`https://flagcdn.com/w40/${code.toLowerCase()}.png`} alt={code} style={{ width:"100%",height:"100%",objectFit:"cover",display:"block" }} />
    </span>
  );
};

/* ─────────────────────────────────────────────────────────────────────────────
   DATA
───────────────────────────────────────────────────────────────────────────── */
const services = [
  { title: "Housekeeping",  slug: "housekeeping", description: "Meticulous cleaning & organization — your home, immaculate.",   image: housekeepingImg, Icon: Home,    badge: "Most Popular" },
  { title: "Elderly Care",  slug: "elderly-care", description: "Compassionate professional support for your loved ones.",        image: elderlyImg,      Icon: Heart,   badge: "Specialist" },
  { title: "Infant Care",   slug: "infant-care",  description: "Expert caregivers providing nurturing support for newborns.",   image: infantImg,       Icon: Baby,    badge: "Certified" },
  { title: "Kid Care",      slug: "kid-care",     description: "Safe, engaging, developmental care for growing children.",      image: culinaryImg,     Icon: Backpack,badge: "Top Rated" },
];

const features = [
  { Icon: BadgeCheck,      title: "Vigorously Vetted",   description: "Rigorous multi-stage screening — only the most trustworthy candidates join our network.", stat: "100%",  statLabel: "Background Checked" },
  { Icon: Sparkles,        title: "Smart Matching",      description: "Advanced compatibility matching finds helpers perfectly tailored to your household.",       stat: "98%",   statLabel: "Match Satisfaction" },
  { Icon: HeartHandshake,  title: "Ongoing Support",     description: "We provide continued mediation and after-placement care — service beyond placement.",      stat: "24/7",  statLabel: "Support Available" },
];

const stats = [
  { value: "2,500+", label: "Placements Made",     Icon: TrendingUp },
  { value: "15+",    label: "Years Experience",    Icon: Award },
  { value: "98%",    label: "Client Satisfaction", Icon: Star },
  { value: "500+",   label: "Active Helpers",      Icon: Users },
];

const TICKER_ITEMS = ["✦ Trusted Agency", "✦ 15+ Years", "✦ MOM Approved", "✦ 2,500+ Placements", "✦ 500+ Helpers", "✦ 98% Satisfaction", "✦ Background Checked", "✦ Smart Matching", "✦ 24/7 Support"];

const MAID_TYPES = ["New Maid", "Transfer Maid", "Ex-Singapore Maid", "Willing to work on off-days"] as const;
const ITEMS_PER_PAGE = 14;

// Cache key for maid list — avoids re-fetching on every visit within the same session
const MAIDS_CACHE_KEY = "landing_maids_cache";
const MAIDS_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

const getPrimaryPhoto = (maid: MaidProfile): string => {
  if (Array.isArray(maid.photoDataUrls) && maid.photoDataUrls.length > 0) return maid.photoDataUrls[0];
  return maid.photoDataUrl || "";
};
const hasPhoto = (maid: MaidProfile): boolean => {
  const p = getPrimaryPhoto(maid);
  return typeof p === "string" && p.trim().length > 0;
};

type ClientLandingPageProps = { embedded?: boolean };

/* ═════════════════════════════════════════════════════════════════════════════
   COMPONENT
═════════════════════════════════════════════════════════════════════════════*/
const ClientLandingPage = ({ embedded = false }: ClientLandingPageProps) => {
  const navigate = useNavigate();
  const [allPublicMaids, setAllPublicMaids] = useState<MaidProfile[]>([]);
  // FIX 1: Initialise from localStorage immediately — no flicker, no waiting
  const [clientUser, setClientUser] = useState<ClientUser | null>(getStoredClient());
  const [isLoading, setIsLoading] = useState(true);
  const [loginPromptOpen, setLoginPromptOpen] = useState(false);
  const [pendingLoginPath, setPendingLoginPath] = useState("/employer-login");

  const [keyword, setKeyword] = useState("");
  const [maidTypes, setMaidTypes] = useState<string[]>([]);
  const [nationality, setNationality] = useState("No Preference");
  const [language, setLanguage] = useState("No Preference");
  const [currentPage, setCurrentPage] = useState(1);

  // FIX 2: Derive login state from token synchronously — no async needed
  const isLoggedIn = !!getClientToken();
  const searchMaidsHref = isLoggedIn ? "/client/maids" : "/search-maids";

  const location = useLocation();
  useEffect(() => {
    if (location.hash === "#services") {
      const el = document.getElementById("services");
      if (el) setTimeout(() => el.scrollIntoView({ behavior: "smooth" }), 100);
    }
  }, [location]);

  // FIX 3: Load maids with in-memory cache to skip repeat fetches
  useEffect(() => {
    const load = async () => {
      try {
        setIsLoading(true);

        // Check memory cache first
        const cached = sessionStorage.getItem(MAIDS_CACHE_KEY);
        if (cached) {
          const { data, ts } = JSON.parse(cached) as { data: MaidProfile[]; ts: number };
          if (Date.now() - ts < MAIDS_CACHE_TTL) {
            setAllPublicMaids(data);
            setIsLoading(false);
            return;
          }
        }

        const mr = await fetch("/api/maids?visibility=public");
        const md = (await mr.json().catch(() => ({}))) as { error?: string; maids?: MaidProfile[] };
        if (!mr.ok || !md.maids) throw new Error(md.error || "Failed to load public maids");
        const filtered = md.maids.filter((m) => m.isPublic && hasPhoto(m));
        setAllPublicMaids(filtered);

        // Save to session cache
        sessionStorage.setItem(MAIDS_CACHE_KEY, JSON.stringify({ data: filtered, ts: Date.now() }));
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed to load public maids");
      } finally {
        setIsLoading(false);
      }
    };
    void load();
  }, []);

  // FIX 4: Session sync runs in background — doesn't block page render at all.
  // If getStoredClient() already returned a user above, the page is instantly usable.
  // This effect quietly refreshes the profile in the background.
  useEffect(() => {
    if (!isLoggedIn) return; // skip entirely for guests — saves the network call
    const syncInBackground = async () => {
      try {
        const c = await syncClientProfileFromSession();
        if (c) setClientUser(c);
      } catch {
        // Silently fail — stored client is still usable
      }
    };
    void syncInBackground();
  }, [isLoggedIn]);

  const nationalityOptions = useMemo(() => {
    const vals = Array.from(new Set(allPublicMaids.map((m) => m.nationality?.trim()).filter(Boolean) as string[])).sort();
    return ["No Preference", ...vals];
  }, [allPublicMaids]);

  const languageOptions = ["No Preference", "English", "Mandarin/Chinese-Dialect", "Bahasa Indonesia/Malaysia", "Hindi", "Tamil"];
  const toggleMaidType = (t: string) => setMaidTypes((p) => p.includes(t) ? p.filter((x) => x !== t) : [...p, t]);

  const filteredMaids = useMemo(() =>
    filterMaids(allPublicMaids, { keyword, nationality: nationality === "No Preference" ? [] : [nationality], maidTypes, language }),
    [allPublicMaids, keyword, maidTypes, nationality, language]);

  useEffect(() => { setCurrentPage(1); }, [keyword, maidTypes, nationality, language]);

  const totalPages = Math.ceil(filteredMaids.length / ITEMS_PER_PAGE);
  const pagedMaids = filteredMaids.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  const pageNumbers = useMemo(() => {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
    const pages: (number | "...")[] = [1];
    if (currentPage > 3) pages.push("...");
    for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++) pages.push(i);
    if (currentPage < totalPages - 2) pages.push("...");
    pages.push(totalPages);
    return pages;
  }, [totalPages, currentPage]);

  const buildParams = () => {
    const params = new URLSearchParams();
    const draft: Record<string, unknown> = {};
    if (keyword.trim()) { params.set("q", keyword.trim()); draft.keyword = keyword.trim(); }
    if (maidTypes.length === 1) { params.set("type", maidTypes[0]); draft.maidType = maidTypes[0]; }
    if (nationality !== "No Preference") {
      params.set("nationality", nationality); draft.natNoPreference = false;
      if (nationality === "Filipino") draft.natFilipino = true;
      if (nationality === "Indonesian") draft.natIndonesian = true;
      if (nationality === "Myanmar") draft.natMyanmar = true;
      if (nationality === "Indian") draft.natIndian = true;
      if (nationality === "Sri Lankan") draft.natSriLankan = true;
      if (nationality === "Cambodian") draft.natCambodian = true;
      if (nationality === "Bangladeshi") draft.natBangladeshi = true;
    }
    if (language !== "No Preference") {
      params.set("language", language); draft.langNoPreference = false;
      if (language === "English") draft.langEnglish = true;
      if (language === "Mandarin/Chinese-Dialect") draft.langMandarin = true;
      if (language === "Bahasa Indonesia/Malaysia") draft.langBahasaIndonesia = true;
      if (language === "Hindi") draft.langHindi = true;
      if (language === "Tamil") draft.langTamil = true;
    }
    if (Object.keys(draft).length > 0) params.set("filters", JSON.stringify(draft));
    return params;
  };

  const handleSearch = () => navigate(`${searchMaidsHref}?${buildParams().toString()}`);
  const handleRequestMaid = () => {
    const params = buildParams();
    params.set("intent", "request");
    const target = `/client/maids?${params.toString()}`;
    if (!isLoggedIn) { setPendingLoginPath(buildEmployerLoginPath(target)); setLoginPromptOpen(true); return; }
    navigate(target);
  };
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.setTimeout(() => document.getElementById("maid-results")?.scrollIntoView({ behavior: "smooth", block: "start" }), 0);
  };
  const clearFilters = () => { setKeyword(""); setMaidTypes([]); setNationality("No Preference"); setLanguage("No Preference"); setCurrentPage(1); };
  const hasFilters = keyword || maidTypes.length > 0 || nationality !== "No Preference" || language !== "No Preference";

  return (
    <div className="dm" style={{ minHeight: "100vh", background: "#fff", fontFamily: "'DM Sans', sans-serif" }}>
      <style>{GLOBAL_STYLES}</style>

      {!embedded && (isLoggedIn ? <ClientPortalNavbar /> : <PublicSiteNavbar />)}

      {/* ══════════════════════════════════════════════════
          HERO
      ══════════════════════════════════════════════════ */}
      <section style={{ background: "linear-gradient(135deg, #061800 0%, #0B2E00 40%, #145200 100%)", position: "relative", overflow: "hidden" }}>
        <div className="hero-noise" style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 0 }} />
        <div style={{ position: "absolute", top: "-80px", right: "-80px", width: 420, height: 420, borderRadius: "50%", background: "radial-gradient(circle, rgba(255,224,0,0.18) 0%, transparent 70%)", pointerEvents: "none", zIndex: 0 }} />
        <div style={{ position: "absolute", bottom: "-60px", left: "-40px", width: 280, height: 280, borderRadius: "50%", background: "radial-gradient(circle, rgba(93,216,0,0.15) 0%, transparent 70%)", pointerEvents: "none", zIndex: 0 }} />
        <div style={{ position: "absolute", top: "50%", right: "30%", transform: "translateY(-50%)", width: 600, height: 600, borderRadius: "50%", border: "1px solid rgba(255,224,0,0.07)", pointerEvents: "none", zIndex: 0 }} />

        <div className="hero-section" style={{ position: "relative", zIndex: 1, maxWidth: 1280, margin: "0 auto", padding: "60px 24px 0" }}>
          <div className="hero-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 48, alignItems: "center" }}>

            {/* Left copy */}
            <div style={{ animation: "fadeSlideUp 0.7s ease both" }}>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 28 }}>
                {[
                  { Icon: Shield,     label: "Licensed Agency",  color: "#FFE000" },
                  { Icon: Award,      label: "15+ Years",         color: "#5DD800" },
                  { Icon: BadgeCheck, label: "MOM Approved",      color: "#FFE000" },
                ].map(({ Icon, label, color }) => (
                  <span key={label} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "7px 14px", borderRadius: 100, background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.14)", color: "rgba(255,255,255,0.85)", fontSize: 11, fontWeight: 700, fontFamily: "'Unbounded', sans-serif", letterSpacing: "0.03em" }}>
                    <Icon size={11} color={color} /> {label}
                  </span>
                ))}
              </div>

              <h1 className="hero-headline hero-headline-size" style={{ fontSize: "clamp(2rem,4.2vw,3.6rem)", lineHeight: 1.06, fontWeight: 900, color: "#fff", margin: "0 0 10px", letterSpacing: "-0.03em" }}>
                Find Your<br />
                <span style={{ color: "#FFE000", display: "inline-block", position: "relative" }}>
                  Perfect Helper
                  <span style={{ display: "block", position: "absolute", bottom: -4, left: 0, right: 0, height: 4, background: "linear-gradient(90deg, #FFE000, #5DD800)", borderRadius: 4 }} />
                </span><br />
                <span style={{ color: "rgba(255,255,255,0.55)", fontSize: "0.7em", fontWeight: 700 }}>With Confidence.</span>
              </h1>

              <p style={{ color: "rgba(255,255,255,0.58)", fontSize: 15, lineHeight: 1.75, maxWidth: 440, margin: "20px 0 32px" }}>
                Trusted by thousands of Singapore families. We match you with thoroughly vetted, professional domestic helpers tailored to your household.
              </p>

              {clientUser && (
                <div style={{ display: "inline-flex", alignItems: "center", gap: 10, padding: "10px 18px", borderRadius: 14, background: "rgba(255,224,0,0.12)", border: "1px solid rgba(255,224,0,0.3)", marginBottom: 24 }}>
                  <UserCheck size={16} color="#FFE000" />
                  <span style={{ color: "#fff", fontWeight: 700, fontSize: 14 }}>Welcome back, {clientUser.name}</span>
                </div>
              )}

              <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginBottom: 48 }}>
                <button className="btn-yellow" onClick={() => document.getElementById("search")?.scrollIntoView({ behavior: "smooth" })}>
                  Search Maids Now <ArrowRight size={15} />
                </button>
                <Link to="/employer-login" className="btn-outline-white">
                  Employer Login <ChevronRight size={15} />
                </Link>
              </div>

              {/* Stats grid */}
              <div className="stats-grid" style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10 }}>
                {stats.map(({ value, label, Icon }) => (
                  <div key={label} className="stat-card">
                    <div style={{ width: 30, height: 30, borderRadius: 10, background: "rgba(255,224,0,0.14)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 8 }}>
                      <Icon size={14} color="#FFE000" />
                    </div>
                    <span className="hero-headline" style={{ color: "#FFE000", fontSize: "clamp(18px,2.5vw,26px)", fontWeight: 900, lineHeight: 1 }}>{value}</span>
                    <span style={{ fontSize: 10, color: "rgba(255,255,255,0.42)", marginTop: 4, lineHeight: 1.4 }}>{label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Right image */}
            <div className="hero-image-col" style={{ position: "relative", animation: "fadeSlideUp 0.7s 0.15s ease both" }}>
              <div style={{ position: "absolute", inset: -12, borderRadius: 32, border: "2px dashed rgba(255,224,0,0.2)", zIndex: 0, animation: "rotateSlow 40s linear infinite" }} />
              <div style={{ position: "relative", borderRadius: 24, overflow: "hidden", border: "3px solid rgba(255,224,0,0.25)", boxShadow: "0 40px 100px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,255,255,0.05)", zIndex: 1 }}>
                <img src={heroImage} alt="Professional domestic helper" fetchPriority="high" decoding="async"
                  style={{ display: "block", width: "100%", objectFit: "cover", height: "clamp(280px,42vw,520px)" }} />
                <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: "40%", background: "linear-gradient(to top, rgba(6,24,0,0.8) 0%, transparent 100%)" }} />
                <div style={{ position: "absolute", top: 0, left: 0, bottom: 0, width: 5, background: "linear-gradient(to bottom, #FFE000, #5DD800)" }} />
              </div>

              <div className="floating-badge" style={{ position: "absolute", bottom: 56, left: -24, animation: "floatY 3.5s ease-in-out infinite", zIndex: 2 }}>
                <div style={{ width: 38, height: 38, borderRadius: 12, background: "linear-gradient(135deg, #FFE000, #F5C800)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, animation: "pulse-ring 2.4s ease infinite" }}>
                  <BadgeCheck size={18} color="#061800" />
                </div>
                <div>
                  <p style={{ fontFamily:"'Unbounded',sans-serif", fontWeight: 800, fontSize: 12, color: "#0B2E00", margin: 0 }}>Fully Verified</p>
                  <p style={{ fontSize: 10, color: "#6B9A50", margin: "3px 0 0" }}>Background checked</p>
                </div>
              </div>

              <div className="floating-badge" style={{ position: "absolute", top: 16, right: -20, animation: "floatY 3.5s 1.8s ease-in-out infinite", zIndex: 2 }}>
                <div style={{ width: 38, height: 38, borderRadius: 12, background: "linear-gradient(135deg, #5DD800, #39FF14)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <Star size={18} color="#fff" fill="#fff" />
                </div>
                <div>
                  <p style={{ fontFamily:"'Unbounded',sans-serif", fontWeight: 800, fontSize: 12, color: "#0B2E00", margin: 0 }}>Top Rated</p>
                  <p style={{ fontSize: 10, color: "#6B9A50", margin: "3px 0 0" }}>4.9 / 5 stars</p>
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* Ticker tape */}
        <div style={{ marginTop: 56, background: "#FFE000", padding: "12px 0", overflow: "hidden", position: "relative" }}>
          <div className="ticker-track">
            {[...TICKER_ITEMS, ...TICKER_ITEMS].map((item, i) => (
              <span key={i} style={{ fontFamily: "'Unbounded', sans-serif", fontSize: 10, fontWeight: 800, color: "#061800", padding: "0 28px", whiteSpace: "nowrap", letterSpacing: "0.04em" }}>{item}</span>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════
          SEARCH
      ══════════════════════════════════════════════════ */}
      <section id="search" className="section-pad" style={{ background: "#F4FFDF", padding: "64px 0" }}>
        <div style={{ maxWidth: 1280, margin: "0 auto", padding: "0 24px" }}>

          <div style={{ textAlign: "center", marginBottom: 40 }}>
            <span className="section-chip" style={{ background: "#FFE000", color: "#061800", marginBottom: 14, display: "inline-flex" }}>
              <SlidersHorizontal size={11} /> Maid Search
            </span>
            <h2 className="hero-headline" style={{ fontSize: "clamp(1.5rem,3.5vw,2.5rem)", color: "#061800", margin: "0 0 10px", letterSpacing: "-0.025em" }}>
              Find the Right Helper<br />for Your Home
            </h2>
            <p style={{ color: "#4A7A20", fontSize: 14, margin: 0 }}>Use the smart filters below to narrow down your perfect match.</p>
          </div>

          <div className="search-card" style={{ maxWidth: 940, margin: "0 auto" }}>

            {/* Card header */}
            <div style={{ background: "linear-gradient(105deg, #061800 0%, #145200 60%, #2E8B00 100%)", padding: "16px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
              <span style={{ display: "flex", alignItems: "center", gap: 10, color: "#fff", fontFamily: "'Unbounded', sans-serif", fontSize: 12, fontWeight: 800 }}>
                <Search size={15} color="rgba(255,255,255,0.6)" /> Maid Search Filter
              </span>
              <span style={{ padding: "5px 14px", borderRadius: 100, background: "rgba(255,224,0,0.18)", border: "1px solid rgba(255,224,0,0.4)", color: "#FFE000", fontSize: 11, fontWeight: 800, fontFamily: "'Unbounded', sans-serif" }}>
                {isLoading ? "Loading…" : `${filteredMaids.length} matches`}
              </span>
            </div>

            {/* Card body */}
            <div className="search-body" style={{ padding: "24px 28px", display: "flex", flexDirection: "column", gap: 22 }}>

              {/* Keywords */}
              <div className="filter-row" style={{ display: "flex", alignItems: "center", gap: 16 }}>
                <label className="filter-label" style={{ flexShrink: 0, fontFamily: "'Unbounded', sans-serif", fontSize: 10, fontWeight: 800, color: "#145200", width: 100, letterSpacing: "0.04em" }}>KEYWORDS</label>
                <div style={{ position: "relative", flex: 1 }}>
                  <input
                    className="input-styled"
                    value={keyword}
                    onChange={(e) => setKeyword(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                    placeholder="e.g. Filipino maid, baby sitter, elderly care…"
                  />
                  {keyword ? (
                    <button onClick={() => setKeyword("")} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#888", display: "flex", padding: 2 }}>
                      <X size={14} />
                    </button>
                  ) : (
                    <Search size={14} color="#9EC860" style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} />
                  )}
                </div>
              </div>

              {/* Maid Type */}
              <div className="filter-row" style={{ display: "flex", alignItems: "flex-start", gap: 16 }}>
                <label className="filter-label" style={{ flexShrink: 0, fontFamily: "'Unbounded', sans-serif", fontSize: 10, fontWeight: 800, color: "#145200", width: 100, letterSpacing: "0.04em", paddingTop: 8 }}>MAID TYPE</label>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {MAID_TYPES.map((t) => {
                    const active = maidTypes.includes(t);
                    return (
                      <button key={t} type="button" onClick={() => toggleMaidType(t)} className={`tag-pill${active ? " active" : ""}`}>
                        {active && <CheckCircle size={11} />} {t}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Nationality + Language */}
              <div className="nat-lang-row" style={{ display: "flex", gap: 20 }}>
                <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 16 }}>
                  <label className="filter-label" style={{ flexShrink: 0, fontFamily: "'Unbounded', sans-serif", fontSize: 10, fontWeight: 800, color: "#145200", width: 100, letterSpacing: "0.04em" }}>NATIONALITY</label>
                  <select className="select-styled" value={nationality} onChange={(e) => setNationality(e.target.value)}>
                    {nationalityOptions.map((o) => <option key={o}>{o}</option>)}
                  </select>
                </div>
                <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 16 }}>
                  <label className="filter-label" style={{ flexShrink: 0, fontFamily: "'Unbounded', sans-serif", fontSize: 10, fontWeight: 800, color: "#145200", width: 80, letterSpacing: "0.04em" }}>LANGUAGE</label>
                  <select className="select-styled" value={language} onChange={(e) => setLanguage(e.target.value)}>
                    {languageOptions.map((o) => <option key={o}>{o}</option>)}
                  </select>
                </div>
              </div>

              {/* Actions */}
              <div className="search-actions" style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 12, paddingTop: 16, borderTop: "2px solid #E8F4C8" }}>
                <button type="button" onClick={handleRequestMaid} className="btn-yellow">
                  <ClipboardList size={14} /> Request Maid
                </button>
                <button
                  type="button"
                  className="btn-search-now"
                  onClick={() => navigate(searchMaidsHref)}
                  style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "12px 22px", borderRadius: 100, fontFamily: "'Unbounded', sans-serif", fontSize: 11, fontWeight: 800, color: "#145200", background: "#fff", border: "2px solid #5DD800", cursor: "pointer", transition: "all 0.18s", letterSpacing: "0.03em" }}
                >
                  <Search size={14} /> Search Now
                </button>
                {hasFilters && (
                  <button type="button" onClick={clearFilters}
                    style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 12, color: "#8EB060", textDecoration: "underline", background: "none", border: "none", cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>
                    <X size={13} /> Clear filters
                  </button>
                )}
              </div>
            </div>
          </div>

          <p style={{ textAlign: "center", marginTop: 16, fontSize: 12, color: "#7AAA45" }}>
            {isLoading ? "Loading available maids…" : `${filteredMaids.length} public maid${filteredMaids.length !== 1 ? "s" : ""} matching your criteria`}
          </p>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════
          MAID RESULTS
      ══════════════════════════════════════════════════ */}
      <section id="maid-results" className="section-pad" style={{ background: "#fff", padding: "64px 0" }}>
        <div style={{ maxWidth: 1280, margin: "0 auto", padding: "0 24px" }}>

          <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 32, gap: 16, flexWrap: "wrap" }}>
            <div>
              <span className="section-chip" style={{ background: "#F4FFDF", color: "#2E6000", border: "1px solid #A8D858", marginBottom: 10, display: "inline-flex" }}>
                <LayoutGrid size={11} /> Available Now
              </span>
              <h2 className="hero-headline" style={{ fontSize: "clamp(1.3rem,2.8vw,2rem)", color: "#061800", margin: "0 0 6px", letterSpacing: "-0.02em" }}>Available Public Maids</h2>
              <p style={{ fontSize: 13, color: "#7A9A55", margin: 0 }}>Browse currently available profiles matching your filters.</p>
            </div>
            {totalPages > 1 && <p style={{ fontSize: 13, color: "#aaa", flexShrink: 0 }}>Page {currentPage} of {totalPages}</p>}
          </div>

          {isLoading ? (
            <div className="maid-grid">
              {Array.from({ length: 14 }).map((_, i) => (
                <div key={i} style={{ borderRadius: 0, overflow: "hidden", border: "2px solid #F0F7E0", background: "#fff" }}>
                  <div style={{ aspectRatio: "3/4", background: "linear-gradient(90deg, #f0f0f0 25%, #e8f5d0 50%, #f0f0f0 75%)", backgroundSize: "400px 100%", animation: "shimmer 1.5s infinite" }} />
                  <div style={{ padding: "14px 14px 16px", display: "flex", flexDirection: "column", gap: 8 }}>
                    <div style={{ height: 10, width: "75%", borderRadius: 4, background: "#f0f0f0" }} />
                    <div style={{ height: 8, width: "50%", borderRadius: 4, background: "#f0f0f0" }} />
                    <div style={{ height: 24, width: "100%", borderRadius: 8, background: "#f0f0f0", marginTop: 4 }} />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredMaids.length === 0 ? (
            <div style={{ borderRadius: 24, border: "2px dashed #D8ECA0", background: "#F8FFF0", padding: 48, textAlign: "center" }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>🔍</div>
              <p style={{ fontFamily: "'Unbounded', sans-serif", fontSize: 15, fontWeight: 800, color: "#2E6000", margin: "0 0 6px" }}>No matching maids found</p>
              <p style={{ fontSize: 13, color: "#7A9A55", margin: 0 }}>Try a different nationality, maid type, or a broader keyword.</p>
            </div>
          ) : (
            <>
              {!isLoggedIn && (
                <div style={{ marginBottom: 24, borderRadius: 20, padding: "20px 24px", display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 16, background: "linear-gradient(110deg, #061800 0%, #145200 50%, #2E8B00 100%)", border: "2px solid rgba(255,224,0,0.2)" }}>
                  <div>
                    <p style={{ color: "#fff", fontFamily: "'Unbounded', sans-serif", fontSize: 13, fontWeight: 800, display: "flex", alignItems: "center", gap: 8, margin: "0 0 6px" }}>
                      <Lock size={14} color="#FFE000" /> Unlock Full Maid Profiles
                    </p>
                    <p style={{ color: "rgba(255,255,255,0.6)", fontSize: 13, margin: 0, maxWidth: 420 }}>
                      Guests see blurred previews only. Login to view full biodata, photos & begin hiring.
                    </p>
                  </div>
                  <Link to="/employer-login" className="btn-yellow">
                    Employer Login <ArrowRight size={14} />
                  </Link>
                </div>
              )}

              <div className="maid-grid">
                {pagedMaids.map((maid) => {
                  const photo = getPrimaryPhoto(maid);
                  const age = calculateAge(maid.dateOfBirth);
                  const typeLower = (maid.type || "").toLowerCase();
                  const typeBg   = typeLower.includes("new")      ? "#ECFCE0" : typeLower.includes("transfer") ? "#E0EEFF" : "#FFF8E0";
                  const typeColor= typeLower.includes("new")      ? "#1A6E00" : typeLower.includes("transfer") ? "#1A4A8E" : "#8A6000";
                  const flagCode = getNationalityCode(maid.nationality);

                  return isLoggedIn ? (
                    <Link key={maid.referenceCode} to={`/maids/${encodeURIComponent(maid.referenceCode)}`} className="maid-card" style={{ textDecoration: "none" }}>
                      <div style={{ position: "relative", width: "100%", background: "#f8f8f8" }}>
                        <img src={photo} alt={maid.fullName} loading="lazy" decoding="async" />
                        {maid.type && (
                          <span style={{ position: "absolute", top: 10, left: 10, background: typeBg, color: typeColor, fontSize: 9, fontWeight: 700, padding: "4px 10px", borderRadius: 100, fontFamily: "'Unbounded', sans-serif", letterSpacing: "0.03em" }}>
                            {maid.type}
                          </span>
                        )}
                      </div>
                      <div className="maid-card-info" style={{ background: "#fff" }}>
                        <h3 style={{ margin: "0 0 3px", fontSize: 13, fontWeight: 700, color: "#0B2E00", lineHeight: 1.3, fontFamily: "'Unbounded', sans-serif", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{maid.fullName}</h3>
                        <p style={{ margin: "0 0 8px", fontSize: 10, color: "#8AAA65", fontFamily: "monospace" }}>{maid.referenceCode}</p>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                          {maid.nationality && (
                            <span style={{ display: "inline-flex", alignItems: "center", gap: 5, background: "#F0FBD8", padding: "4px 9px", fontSize: 10, color: "#2E6000", borderRadius: 100, border: "1px solid #C8E880", fontWeight: 600 }}>
                              <FlagCircle code={flagCode} />{maid.nationality}
                            </span>
                          )}
                          {age && <span style={{ background: "#F0FBD8", padding: "4px 9px", fontSize: 10, color: "#2E6000", borderRadius: 100, border: "1px solid #C8E880", fontWeight: 600 }}>{age} yrs</span>}
                        </div>
                      </div>
                    </Link>
                  ) : (
                    <div key={maid.referenceCode} className="maid-card">
                      <div style={{ position: "relative", width: "100%", filter: "blur(5px)", opacity: 0.7, userSelect: "none", pointerEvents: "none" }}>
                        <img src={photo} alt="Maid profile" loading="lazy" decoding="async" />
                        {maid.type && (
                          <span style={{ position: "absolute", top: 10, left: 10, background: typeBg, color: typeColor, fontSize: 9, fontWeight: 700, padding: "4px 10px", borderRadius: 100 }}>{maid.type}</span>
                        )}
                      </div>
                      <div className="maid-card-info" style={{ background: "#fff" }}>
                        <div style={{ height: 10, width: "75%", background: "#e8f5d0", borderRadius: 4, filter: "blur(2px)", marginBottom: 6 }} />
                        <div style={{ height: 8, width: "50%", background: "#e8f5d0", borderRadius: 4, filter: "blur(2px)", marginBottom: 8 }} />
                        <p style={{ textAlign: "center", fontSize: 10, color: "#7AAA45", margin: "8px 0 0" }}>🔒 Login to view</p>
                      </div>
                    </div>
                  );
                })}
              </div>

              {totalPages > 1 && (
                <div style={{ marginTop: 40, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, flexWrap: "wrap" }}>
                  <button className="pagination-btn" onClick={() => handlePageChange(Math.max(1, currentPage - 1))} disabled={currentPage === 1}>← Prev</button>
                  {pageNumbers.map((page, idx) =>
                    page === "..." ? (
                      <span key={`e-${idx}`} style={{ padding: "0 4px", fontSize: 13, color: "#aaa" }}>…</span>
                    ) : (
                      <button key={page} onClick={() => handlePageChange(page as number)} className={`pagination-btn${page === currentPage ? " active" : ""}`}>{page}</button>
                    )
                  )}
                  <button className="pagination-btn" onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))} disabled={currentPage === totalPages}>Next →</button>
                </div>
              )}
            </>
          )}
        </div>
      </section>

      {/* ══════════════════════════════════════════════════
          SERVICES
      ══════════════════════════════════════════════════ */}
      <section id="services" className="section-pad-lg" style={{ background: "#061800", padding: "80px 0", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", inset: 0, backgroundImage: "radial-gradient(circle, rgba(255,224,0,0.08) 1px, transparent 1px)", backgroundSize: "32px 32px", pointerEvents: "none" }} />
        <div style={{ position: "absolute", top: -100, right: -100, width: 500, height: 500, borderRadius: "50%", background: "radial-gradient(circle, rgba(93,216,0,0.12) 0%, transparent 70%)", pointerEvents: "none" }} />

        <div style={{ position: "relative", maxWidth: 1280, margin: "0 auto", padding: "0 24px" }}>
          <div style={{ textAlign: "center", marginBottom: 48 }}>
            <span className="section-chip" style={{ background: "rgba(255,224,0,0.12)", color: "#FFE000", border: "1px solid rgba(255,224,0,0.3)", marginBottom: 16, display: "inline-flex" }}>
              <Home size={11} /> Our Services
            </span>
            <h2 className="hero-headline" style={{ fontSize: "clamp(1.5rem,3.5vw,2.5rem)", color: "#fff", margin: "0 0 10px", letterSpacing: "-0.025em" }}>
              Specialized Care for{" "}
              <span style={{ color: "#FFE000" }}>Every Need</span>
            </h2>
            <p style={{ color: "rgba(255,255,255,0.48)", fontSize: 14, margin: 0, maxWidth: 420, marginInline: "auto" }}>
              From daily housekeeping to specialized elder care — the right professional for your home.
            </p>
          </div>

          <div className="services-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 20 }}>
            {services.map(({ title, slug, description, image, Icon, badge }) => (
              <Link key={title} to={`/services/${slug}`} className="service-card" style={{ display: "block", textDecoration: "none" }}>
                <img src={image} alt={title} loading="lazy" decoding="async" />
                <div className="service-overlay" />
                <span className="service-card-badge">{badge}</span>
                <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: 20 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 12, background: "rgba(255,224,0,0.18)", backdropFilter: "blur(10px)", border: "1px solid rgba(255,224,0,0.3)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 10 }}>
                    <Icon size={18} color="#FFE000" />
                  </div>
                  <h3 style={{ color: "#fff", fontFamily: "'Unbounded', sans-serif", fontSize: 15, fontWeight: 800, margin: "0 0 6px" }}>{title}</h3>
                  <p style={{ color: "rgba(255,255,255,0.68)", fontSize: 12, lineHeight: 1.6, margin: "0 0 10px" }}>{description}</p>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 4, color: "#FFE000", fontSize: 12, fontWeight: 700, fontFamily: "'Unbounded', sans-serif" }}>
                    Learn More <ChevronRight size={13} />
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════
          WHY CHOOSE US
      ══════════════════════════════════════════════════ */}
      <section id="why" className="section-pad-lg" style={{ background: "#F4FFDF", padding: "80px 0" }}>
        <div style={{ maxWidth: 1280, margin: "0 auto", padding: "0 24px" }}>
          <div style={{ textAlign: "center", marginBottom: 56 }}>
            <span className="section-chip" style={{ background: "#FFE000", color: "#061800", marginBottom: 14, display: "inline-flex" }}>
              <Award size={11} /> Why Choose Us
            </span>
            <h2 className="hero-headline" style={{ fontSize: "clamp(1.5rem,3.5vw,2.5rem)", color: "#061800", margin: "0 0 10px", letterSpacing: "-0.025em" }}>
              Singapore's Most Trusted{" "}
              <span style={{ color: "#2E8B00" }}>Maid Agency</span>
            </h2>
            <p style={{ color: "#4A7A20", fontSize: 14, margin: 0, maxWidth: 420, marginInline: "auto" }}>
              We go beyond placement — ensuring you and your helper thrive together.
            </p>
          </div>

          <div className="why-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 48, alignItems: "center" }}>
            <div className="why-image-col" style={{ position: "relative" }}>
              <div style={{ position: "absolute", inset: -8, borderRadius: 32, border: "3px solid #FFE000", zIndex: 0, transform: "rotate(-1.5deg)" }} />
              <div style={{ position: "relative", borderRadius: 24, overflow: "hidden", boxShadow: "0 30px 70px rgba(46,139,0,0.2)", zIndex: 1 }}>
                <img src={familyImg} alt="Happy family" loading="lazy" decoding="async"
                  style={{ width: "100%", objectFit: "cover", display: "block", height: "clamp(280px,38vw,440px)" }} />
                <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: "45%", background: "linear-gradient(to top, rgba(6,24,0,0.75) 0%, transparent 100%)" }} />
                <div style={{ position: "absolute", bottom: 24, left: 24, right: 24 }}>
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    {[...Array(5)].map((_, i) => <Star key={i} size={14} fill="#FFE000" color="#FFE000" />)}
                    <span style={{ fontFamily: "'Unbounded', sans-serif", fontWeight: 900, fontSize: 13, color: "#FFE000" }}>4.9</span>
                  </div>
                  <p style={{ color: "rgba(255,255,255,0.7)", fontSize: 12, margin: "4px 0 0" }}>2,500+ satisfied families</p>
                </div>
              </div>
              <div style={{ position: "absolute", top: -16, right: -24, borderRadius: 20, padding: "16px 20px", background: "linear-gradient(135deg, #FFE000, #F5C800)", boxShadow: "0 12px 36px rgba(255,224,0,0.45), 0 4px 0 #C8A800", zIndex: 2 }}>
                <p className="hero-headline" style={{ fontSize: 34, fontWeight: 900, color: "#061800", margin: 0, lineHeight: 1 }}>15+</p>
                <p style={{ fontSize: 10, color: "#3A2800", margin: "4px 0 0", fontWeight: 700, lineHeight: 1.3 }}>Years of Excellence<br />in Domestic Care</p>
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {features.map(({ Icon, title, description, stat, statLabel }) => (
                <div key={title} className="feature-card">
                  <div style={{ width: 48, height: 48, borderRadius: 16, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "linear-gradient(135deg, #FFE000 0%, #F5C800 100%)", boxShadow: "0 4px 0 #C8A800" }}>
                    <Icon size={22} color="#061800" />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, marginBottom: 8 }}>
                      <h3 style={{ fontFamily: "'Unbounded', sans-serif", fontSize: 13, fontWeight: 800, color: "#061800", margin: 0 }}>{title}</h3>
                      <div style={{ textAlign: "right", flexShrink: 0 }}>
                        <p className="hero-headline" style={{ fontSize: 22, fontWeight: 900, color: "#2E8B00", margin: 0, lineHeight: 1 }}>{stat}</p>
                        <p style={{ fontSize: 9, color: "#8AAA65", margin: "3px 0 0", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>{statLabel}</p>
                      </div>
                    </div>
                    <p style={{ fontSize: 12, color: "#4A7A20", lineHeight: 1.65, margin: 0 }}>{description}</p>
                  </div>
                </div>
              ))}

              <div style={{ borderRadius: 22, padding: 24, background: "linear-gradient(110deg, #061800 0%, #145200 55%, #2E8B00 100%)", border: "2px solid rgba(255,224,0,0.2)", position: "relative", overflow: "hidden" }}>
                <div style={{ position: "absolute", top: -30, right: -30, width: 120, height: 120, borderRadius: "50%", background: "radial-gradient(circle, rgba(255,224,0,0.15) 0%, transparent 70%)", pointerEvents: "none" }} />
                <p style={{ fontFamily: "'Unbounded', sans-serif", fontWeight: 800, fontSize: 14, color: "#fff", margin: "0 0 8px" }}>Ready to find your perfect helper?</p>
                <p style={{ color: "rgba(255,255,255,0.58)", fontSize: 13, lineHeight: 1.65, margin: "0 0 18px" }}>Browse 500+ verified profiles or speak with our placement specialists today.</p>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  <button className="btn-yellow" onClick={() => navigate(searchMaidsHref)} style={{ padding: "11px 20px", fontSize: 11 }}>
                    <Users size={13} /> Browse Helpers
                  </button>
                  <a href="#contact" style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "11px 18px", borderRadius: 100, background: "rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.85)", border: "1px solid rgba(255,255,255,0.2)", fontSize: 11, fontWeight: 700, fontFamily: "'Unbounded', sans-serif", textDecoration: "none", letterSpacing: "0.03em", transition: "all 0.18s" }}>
                    <PhoneCall size={13} /> Contact Us
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <footer className="bg-foreground py-12 text-primary-foreground">
        <div className="container">
          <div className="mb-8 grid grid-cols-1 gap-8 md:grid-cols-4">
            <div>
              <h4 className="mb-3 font-display text-lg font-bold">"Find Maids" At The Agency</h4>
              <p className="font-body text-sm opacity-70">Matching trusted domestic professionals with families since 2009.</p>
            </div>
            <div>
              <h5 className="mb-3 font-body text-sm font-semibold uppercase tracking-wider">Company</h5>
              <ul className="space-y-2 font-body text-sm opacity-70">
                <li><a href="#why" className="transition-opacity hover:opacity-100">About Us</a></li>
                <li><a href="#services" className="transition-opacity hover:opacity-100">Our Services</a></li>
                <li><a href="#contact" className="transition-opacity hover:opacity-100">Contact</a></li>
              </ul>
            </div>
            <div>
              <h5 className="mb-3 font-body text-sm font-semibold uppercase tracking-wider">Legal</h5>
              <ul className="space-y-2 font-body text-sm opacity-70">
                <li><a href="#contact" className="transition-opacity hover:opacity-100">Legal Information</a></li>
                <li><a href="#contact" className="transition-opacity hover:opacity-100">Privacy Policy</a></li>
                <li><a href="#contact" className="transition-opacity hover:opacity-100">Terms of Service</a></li>
              </ul>
            </div>
            <div>
              <h5 className="mb-3 font-body text-sm font-semibold uppercase tracking-wider">Join Our Newsletter</h5>
              <p className="mb-3 font-body text-sm opacity-70">Stay updated on care tips, industry news, and agency updates.</p>
              <div className="flex gap-2">
                <input className="flex-1 rounded-lg border border-primary-foreground/20 bg-primary-foreground/10 px-3 py-2 font-body text-sm placeholder:opacity-50" placeholder="Email" />
                <button className="rounded-lg bg-primary px-4 py-2 font-body text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90">Join</button>
              </div>
            </div>
          </div>
          <div className="border-t border-primary-foreground/20 pt-6 text-center font-body text-xs opacity-50">
            Copyright 2026 "Find Maids" At The Agency. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
};

export default ClientLandingPage;