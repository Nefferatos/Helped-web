import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowRight, CheckCircle, HeartHandshake, Users, X, Star,
  Shield, ChevronRight, Search, Home, Heart, Baby, Backpack,
  BadgeCheck, Sparkles, Lock, UserCheck, TrendingUp,
  Award, SlidersHorizontal, LayoutGrid, ArrowUp,
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
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,700;0,800;0,900;1,700;1,800&family=Inter:wght@300;400;500;600;700&display=swap');

  :root {
    --teal:        #0E4E5E;
    --teal-deep:   #0B3340;
    --teal-mid:    #1A6678;
    --teal-light:  #2A8FA6;
    --teal-pale:   #E0F4F7;
    --teal-frost:  #F0F9FF;
    --amber:       #FCD34D;
    --amber-dark:  #E8B800;
    --amber-deep:  #C49A00;
    --amber-light: #FEF3C7;
    --ink:         #0B1F25;
    --mist:        #F7FBFC;
    --border:      #C8E8EF;
  }

  *, *::before, *::after { box-sizing: border-box; }

  @keyframes morphOrb {
    0%,100% { border-radius: 60% 40% 55% 45% / 50% 60% 40% 50%; transform: scale(1) rotate(0deg); }
    33%      { border-radius: 40% 60% 45% 55% / 60% 40% 60% 40%; transform: scale(1.05) rotate(3deg); }
    66%      { border-radius: 55% 45% 60% 40% / 40% 55% 45% 55%; transform: scale(0.97) rotate(-2deg); }
  }
  @keyframes floatY {
    0%,100% { transform: translateY(0); }
    50%      { transform: translateY(-10px); }
  }
  @keyframes ticker {
    0%   { transform: translateX(0); }
    100% { transform: translateX(-50%); }
  }
  @keyframes fadeUp {
    from { opacity: 0; transform: translateY(28px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes fadeIn {
    from { opacity: 0; }
    to   { opacity: 1; }
  }
  @keyframes shimmer {
    0%   { background-position: -600px 0; }
    100% { background-position:  600px 0; }
  }
  @keyframes pulseAmber {
    0%,100% { box-shadow: 0 0 0 0 rgba(252,211,77,0.5); }
    50%      { box-shadow: 0 0 0 10px rgba(252,211,77,0); }
  }
  @keyframes slideInLeft {
    from { opacity: 0; transform: translateX(-32px); }
    to   { opacity: 1; transform: translateX(0); }
  }
  @keyframes slideInRight {
    from { opacity: 0; transform: translateX(32px); }
    to   { opacity: 1; transform: translateX(0); }
  }
  @keyframes rotateSlow {
    from { transform: rotate(0deg); }
    to   { transform: rotate(360deg); }
  }
  @keyframes backToTopIn {
    from { opacity: 0; transform: translateY(14px) scale(0.85); }
    to   { opacity: 1; transform: translateY(0) scale(1); }
  }
  @keyframes backToTopOut {
    from { opacity: 1; }
    to   { opacity: 0; }
  }
  @keyframes drawLine {
    from { width: 0; }
    to   { width: 100%; }
  }
  @keyframes countUp {
    from { opacity: 0; transform: translateY(12px); }
    to   { opacity: 1; transform: translateY(0); }
  }

  /* ── Fonts ── */
  .pf  { font-family: 'Playfair Display', Georgia, serif; }
  .int { font-family: 'Inter', system-ui, sans-serif; }

  /* ── Buttons ── */
  .btn-amber {
    background: var(--amber);
    color: var(--ink);
    font-family: 'Inter', sans-serif;
    font-size: 13px;
    font-weight: 700;
    letter-spacing: 0.01em;
    padding: 13px 26px;
    border-radius: 6px;
    border: none;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    gap: 8px;
    transition: transform 0.18s, box-shadow 0.18s, background 0.18s;
    box-shadow: 0 3px 0 var(--amber-deep), 0 6px 20px rgba(252,211,77,0.3);
    text-decoration: none;
    white-space: nowrap;
    position: relative;
    overflow: hidden;
  }
  .btn-amber::after {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(105deg, transparent 30%, rgba(255,255,255,0.35) 50%, transparent 70%);
    transform: translateX(-100%);
    transition: transform 0.45s ease;
  }
  .btn-amber:hover::after { transform: translateX(100%); }
  .btn-amber:hover {
    transform: translateY(-2px);
    box-shadow: 0 5px 0 var(--amber-deep), 0 12px 32px rgba(252,211,77,0.4);
    background: #fdd96a;
  }
  .btn-amber:active { transform: translateY(1px); box-shadow: 0 2px 0 var(--amber-deep); }

  .btn-outline-teal {
    background: transparent;
    color: var(--teal-pale);
    font-family: 'Inter', sans-serif;
    font-size: 13px;
    font-weight: 600;
    letter-spacing: 0.01em;
    padding: 13px 24px;
    border-radius: 6px;
    border: 1.5px solid rgba(224,244,247,0.35);
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    gap: 8px;
    transition: all 0.2s;
    text-decoration: none;
    white-space: nowrap;
  }
  .btn-outline-teal:hover {
    border-color: var(--amber);
    color: var(--amber);
    background: rgba(252,211,77,0.08);
  }

  .btn-ghost-teal {
    background: transparent;
    color: var(--teal);
    font-family: 'Inter', sans-serif;
    font-size: 13px;
    font-weight: 600;
    padding: 12px 22px;
    border-radius: 6px;
    border: 1.5px solid var(--teal-light);
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    gap: 8px;
    transition: all 0.18s;
    white-space: nowrap;
  }
  .btn-ghost-teal:hover {
    background: var(--teal);
    color: #fff;
    border-color: var(--teal);
  }

  /* ── Ticker ── */
  .ticker-track {
    display: flex;
    gap: 0;
    width: max-content;
    animation: ticker 32s linear infinite;
  }
  .ticker-track:hover { animation-play-state: paused; }

  /* ── Search card ── */
  .search-card {
    background: #fff;
    border-radius: 12px;
    border: 1.5px solid var(--border);
    box-shadow: 0 6px 0 var(--teal-pale), 0 20px 60px rgba(14,78,94,0.1);
    overflow: hidden;
  }

  /* ── Tag pill ── */
  .tag-pill {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 8px 16px;
    border-radius: 4px;
    font-size: 12px;
    font-weight: 600;
    border: 1.5px solid var(--border);
    background: var(--teal-frost);
    color: var(--teal);
    cursor: pointer;
    transition: all 0.15s;
    font-family: 'Inter', sans-serif;
  }
  .tag-pill.active {
    background: var(--teal);
    border-color: var(--teal-deep);
    color: #fff;
    box-shadow: 0 2px 0 var(--teal-deep);
  }
  .tag-pill:hover:not(.active) {
    border-color: var(--teal-light);
    background: var(--teal-pale);
  }

  /* ── Inputs ── */
  .select-styled {
    appearance: none;
    width: 100%;
    padding: 11px 14px;
    border: 1.5px solid var(--border);
    border-radius: 6px;
    font-size: 13px;
    font-weight: 500;
    color: var(--teal-deep);
    background: var(--teal-frost);
    font-family: 'Inter', sans-serif;
    outline: none;
    cursor: pointer;
    transition: border-color 0.2s, box-shadow 0.2s;
  }
  .select-styled:focus {
    border-color: var(--teal);
    box-shadow: 0 0 0 3px rgba(14,78,94,0.12);
  }

  .input-styled {
    width: 100%;
    padding: 11px 40px 11px 14px;
    border: 1.5px solid var(--border);
    border-radius: 6px;
    font-size: 13px;
    font-weight: 500;
    color: var(--teal-deep);
    background: var(--teal-frost);
    font-family: 'Inter', sans-serif;
    outline: none;
    transition: border-color 0.2s, box-shadow 0.2s;
  }
  .input-styled::placeholder { color: #9BBFC8; }
  .input-styled:focus {
    border-color: var(--teal);
    box-shadow: 0 0 0 3px rgba(14,78,94,0.12);
  }

  /* ── Section chip ── */
  .section-chip {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 5px 12px;
    border-radius: 3px;
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    font-family: 'Inter', sans-serif;
  }

  /* ── Feature card ── */
  .feature-card {
    background: #fff;
    border: 1.5px solid var(--border);
    border-radius: 10px;
    padding: 24px;
    display: flex;
    gap: 18px;
    align-items: flex-start;
    transition: all 0.25s;
    position: relative;
    overflow: hidden;
  }
  .feature-card::before {
    content: '';
    position: absolute;
    left: 0; top: 0; bottom: 0;
    width: 3px;
    background: var(--amber);
    transform: scaleY(0);
    transform-origin: bottom;
    transition: transform 0.3s ease;
  }
  .feature-card:hover::before { transform: scaleY(1); }
  .feature-card:hover {
    border-color: var(--teal-light);
    box-shadow: 0 12px 40px rgba(14,78,94,0.12);
    transform: translateY(-3px);
  }

  /* ── Service card ── */
  .service-card {
    border-radius: 10px;
    overflow: hidden;
    position: relative;
    height: 340px;
    transition: transform 0.3s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.3s;
  }
  .service-card:hover { transform: translateY(-6px); box-shadow: 0 28px 60px rgba(11,51,64,0.35); }
  .service-card img { width:100%; height:100%; object-fit:cover; transition: transform 0.6s ease; }
  .service-card:hover img { transform: scale(1.07); }
  .service-overlay {
    position: absolute; inset: 0;
    background: linear-gradient(to top, rgba(11,51,64,0.95) 0%, rgba(11,51,64,0.4) 50%, transparent 100%);
  }
  .service-card-badge {
    position: absolute;
    top: 14px; right: 14px;
    background: var(--amber);
    color: var(--ink);
    font-family: 'Inter', sans-serif;
    font-size: 10px;
    font-weight: 700;
    padding: 4px 10px;
    border-radius: 3px;
    letter-spacing: 0.04em;
    text-transform: uppercase;
  }

  /* ── Stat card ── */
  .stat-card {
    background: rgba(255,255,255,0.07);
    border: 1px solid rgba(255,255,255,0.12);
    border-radius: 10px;
    padding: 18px 16px;
    display: flex;
    flex-direction: column;
    gap: 4px;
    transition: background 0.2s, border-color 0.2s, transform 0.2s;
    animation: countUp 0.6s ease both;
  }
  .stat-card:hover {
    background: rgba(252,211,77,0.1);
    border-color: rgba(252,211,77,0.35);
    transform: translateY(-2px);
  }

  /* ── Maid grid: 6 cols × 2 rows ── */
  .maid-grid {
    display: grid;
    gap: 16px;
    grid-template-columns: repeat(6, 1fr);
  }
  @media (max-width: 1100px) { .maid-grid { grid-template-columns: repeat(4, 1fr); gap: 12px; } }
  @media (max-width: 700px)  { .maid-grid { grid-template-columns: repeat(3, 1fr); gap: 10px; } }
  @media (max-width: 480px)  { .maid-grid { grid-template-columns: repeat(2, 1fr); gap: 8px; } }

  /* ── Maid card (unchanged structure) ── */
  .maid-card {
    background: #fff;
    border: 2px solid var(--border);
    border-radius: 0;
    overflow: hidden;
    transition: all 0.22s cubic-bezier(0.34,1.56,0.64,1);
    cursor: pointer;
    display: flex;
    flex-direction: column;
  }
  .maid-card:hover {
    border-color: var(--amber-dark);
    transform: translateY(-5px) scale(1.025);
    box-shadow: 0 20px 50px rgba(14,78,94,0.18), 0 3px 0 var(--amber-dark);
  }
  .maid-card img {
    width: 100%;
    height: auto;
    aspect-ratio: 3/4;
    object-fit: contain;
    display: block;
    background: #f5f9fa;
  }
  .maid-card-info { padding: 10px 12px 12px; }
  @media (max-width: 480px) { .maid-card-info { padding: 8px 10px 10px; } }

  /* ── Pagination ── */
  .pagination-wrap {
    margin-top: 40px;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    flex-wrap: wrap;
  }
  .pagination-btn {
    min-width: 40px;
    height: 40px;
    padding: 0 12px;
    border-radius: 6px;
    border: 1.5px solid var(--border);
    background: #fff;
    font-family: 'Inter', sans-serif;
    font-size: 13px;
    font-weight: 600;
    color: var(--teal);
    cursor: pointer;
    transition: all 0.15s;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 4px;
  }
  .pagination-btn:hover:not(:disabled) {
    border-color: var(--teal);
    background: var(--teal);
    color: #fff;
  }
  .pagination-btn.active {
    background: var(--teal);
    border-color: var(--teal-deep);
    color: #fff;
    box-shadow: 0 2px 0 var(--teal-deep);
  }
  .pagination-btn:disabled { opacity: 0.35; cursor: not-allowed; }
  .pag-icon  { display: none; font-size: 22px; line-height: 1; }
  .pag-label { display: inline; }
  @media (max-width: 480px) {
    .pagination-btn { min-width: 38px; height: 38px; padding: 0 8px; font-size: 12px; border-radius: 5px; }
    .pag-icon  { display: inline; }
    .pag-label { display: none; }
  }

  /* ── Back to top ── */
  .back-to-top-btn {
    position: fixed;
    bottom: 28px;
    left: 28px;
    z-index: 9999;
    width: 46px;
    height: 46px;
    border-radius: 8px;
    border: none;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--amber);
    box-shadow: 0 3px 0 var(--amber-deep), 0 8px 24px rgba(252,211,77,0.4);
    transition: transform 0.18s, box-shadow 0.18s;
    outline: none;
  }
  .back-to-top-btn:hover {
    transform: translateY(-2px);
    box-shadow: 0 5px 0 var(--amber-deep), 0 14px 36px rgba(252,211,77,0.5);
  }
  .back-to-top-btn:active { transform: translateY(1px); box-shadow: 0 2px 0 var(--amber-deep); }
  .back-to-top-btn.visible { animation: backToTopIn 0.25s cubic-bezier(0.34,1.56,0.64,1) both; pointer-events: auto; opacity: 1; }
  .back-to-top-btn.hidden  { animation: backToTopOut 0.2s ease both; pointer-events: none; opacity: 0; }

  /* ── Floating badge ── */
  .floating-badge {
    background: #fff;
    border-radius: 10px;
    padding: 12px 16px;
    display: flex;
    align-items: center;
    gap: 12px;
    box-shadow: 0 12px 40px rgba(11,51,64,0.18);
    border: 1.5px solid var(--teal-pale);
  }

  /* ── Scroll reveal ── */
  .reveal {
    opacity: 0;
    transform: translateY(24px);
    transition: opacity 0.6s ease, transform 0.6s ease;
  }
  .reveal.visible { opacity: 1; transform: translateY(0); }

  /* ── Decorative rule ── */
  .amber-rule {
    display: block;
    width: 48px;
    height: 3px;
    background: var(--amber);
    border-radius: 2px;
    margin: 12px 0 0;
  }

  /* ── Responsive ── */
  @media (max-width: 900px) {
    .hero-grid     { grid-template-columns: 1fr !important; }
    .hero-image-col { display: none !important; }
    .stats-grid    { grid-template-columns: repeat(2,1fr) !important; }
    .hero-h1       { font-size: clamp(2rem, 8vw, 3rem) !important; }
    .why-grid      { grid-template-columns: 1fr !important; }
    .why-image-col { display: none !important; }
    .footer-grid   { grid-template-columns: 1fr 1fr !important; gap: 28px !important; }
  }
  @media (max-width: 768px) {
    .filter-row        { flex-direction: column !important; gap: 10px !important; }
    .filter-label      { width: auto !important; }
    .nat-lang-row      { flex-direction: column !important; gap: 12px !important; }
    .search-body       { padding: 16px 18px !important; }
    .search-actions    { flex-direction: column !important; align-items: stretch !important; }
    .search-actions .btn-amber,
    .search-actions .btn-ghost-teal { width: 100%; justify-content: center; }
  }
  @media (max-width: 600px) {
    .services-grid { grid-template-columns: 1fr !important; }
    .section-pad   { padding: 48px 0 !important; }
    .section-pad-lg { padding: 56px 0 !important; }
    .hero-section  { padding: 40px 16px 0 !important; }
  }
  @media (max-width: 520px) {
    .footer-grid { grid-template-columns: 1fr !important; }
  }
  @media (max-width: 480px) {
    .back-to-top-btn { bottom: 18px; left: 18px; width: 40px; height: 40px; }
  }

  @media (prefers-reduced-motion: reduce) {
    *, *::before, *::after {
      animation-duration: 0.01ms !important;
      transition-duration: 0.01ms !important;
    }
  }
`;

/* ─────────────────────────────────────────────────────────────────────────────
   SMALL SVG COMPONENTS
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

const LockIconSvg = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
    strokeLinecap="round" strokeLinejoin="round" style={{ width: 16, height: 16 }}>
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
);

/* ─────────────────────────────────────────────────────────────────────────────
   BLURRED CANVAS (unchanged logic)
───────────────────────────────────────────────────────────────────────────── */
const BlurredCanvas = ({ src }: { src: string }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!src || !canvasRef.current) return;
    let revoked = false;
    let blobUrl = "";

    const draw = (img: HTMLImageElement) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      const w = canvas.offsetWidth || 240;
      const h = Math.round(w * (4 / 3));
      canvas.width = w; canvas.height = h;
      const scale = Math.max(w / img.naturalWidth, h / img.naturalHeight);
      const sw = img.naturalWidth * scale, sh = img.naturalHeight * scale;
      ctx.filter = "blur(10px) brightness(0.85)";
      ctx.globalAlpha = 0.9;
      ctx.drawImage(img, (w - sw) / 2, (h - sh) / 2, sw, sh);
      if (!revoked && blobUrl) { URL.revokeObjectURL(blobUrl); revoked = true; }
    };

    const img = new Image();
    img.crossOrigin = "anonymous";
    fetch(src, { credentials: "same-origin" })
      .then(r => { if (!r.ok) throw new Error(); return r.blob(); })
      .then(blob => {
        blobUrl = URL.createObjectURL(blob);
        img.onload = () => draw(img);
        img.onerror = drawFallback;
        img.src = blobUrl;
      })
      .catch(drawFallback);

    function drawFallback() {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      const w = canvas.offsetWidth || 240;
      canvas.width = w; canvas.height = Math.round(w * (4 / 3));
      ctx.fillStyle = "#d8edf2";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    return () => { if (!revoked && blobUrl) { URL.revokeObjectURL(blobUrl); revoked = true; } };
  }, [src]);

  return (
    <canvas ref={canvasRef} style={{
      width: "100%", aspectRatio: "3/4", display: "block",
      background: "#f0f9fa", userSelect: "none", pointerEvents: "none", filter: "blur(2px)",
    }} />
  );
};

/* ─────────────────────────────────────────────────────────────────────────────
   NATIONALITY FLAGS
───────────────────────────────────────────────────────────────────────────── */
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
  for (const [k, code] of Object.entries(NATIONALITY_FLAGS))
    if (key.includes(k)) return code;
  return "";
};

const FlagCircle = ({ code }: { code: string }) => {
  if (!code) return null;
  return (
    <span style={{ display:"inline-flex",alignItems:"center",justifyContent:"center",width:14,height:14,borderRadius:"50%",overflow:"hidden",border:"1px solid rgba(0,0,0,0.12)",background:"#e5e7eb",flexShrink:0,verticalAlign:"middle" }}>
      <img src={`https://flagcdn.com/w40/${code.toLowerCase()}.png`} alt={code} style={{ width:"100%",height:"100%",objectFit:"cover",display:"block" }} />
    </span>
  );
};

const getTypeLabel = (type: string) => {
  const lower = type.toLowerCase();
  if (lower.includes("new")) return "NEW";
  if (lower.includes("transfer")) return "TRANSFER";
  if (lower.includes("ex")) return "EX-SG";
  return type.toUpperCase();
};

const getTypeBadgeStyle = (type?: string): { bg: string; color: string } => {
  const t = (type || "").toLowerCase();
  if (t.includes("new"))      return { bg: "#E0F4F7", color: "#0E4E5E" };
  if (t.includes("transfer")) return { bg: "#E0EEFF", color: "#1A4A8E" };
  return { bg: "#FEF3C7", color: "#92400E" };
};

/* ─────────────────────────────────────────────────────────────────────────────
   SCROLL REVEAL HOOK
───────────────────────────────────────────────────────────────────────────── */
const useReveal = () => {
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => entries.forEach(e => {
        if (e.isIntersecting) { e.target.classList.add("visible"); observer.unobserve(e.target); }
      }),
      { threshold: 0.12 }
    );
    document.querySelectorAll(".reveal").forEach(el => observer.observe(el));
    return () => observer.disconnect();
  }, []);
};

/* ─────────────────────────────────────────────────────────────────────────────
   MAID CARDS (structure unchanged, colors updated)
───────────────────────────────────────────────────────────────────────────── */
const LockedMaidCard = ({
  maid,
  loginPath = "/employer-login",
}: {
  maid: MaidProfile;
  loginPath?: string;
}) => {
  const photo = getPrimaryPhoto(maid);
  const { bg: typeBg, color: typeColor } = getTypeBadgeStyle(maid.type);

  return (
    <div className="maid-card">
      <div style={{ position: "relative", width: "100%", overflow: "hidden" }}>
        {photo ? (
          <BlurredCanvas src={photo} />
        ) : (
          <div style={{ aspectRatio:"3/4", background:"#e8f4f7", display:"flex", alignItems:"center", justifyContent:"center" }}>
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#aacccc" strokeWidth={1}>
              <path strokeLinecap="round" strokeLinejoin="round"
                d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"
              />
            </svg>
          </div>
        )}
        {maid.type && (
          <div style={{ position:"absolute", top:10, left:10, filter:"blur(3px)", pointerEvents:"none" }}>
            <span style={{ background:typeBg, color:typeColor, fontSize:9, fontWeight:700, padding:"4px 10px", borderRadius:3, fontFamily:"'Inter',sans-serif", letterSpacing:"0.04em", textTransform:"uppercase" as const }}>
              {getTypeLabel(maid.type)}
            </span>
          </div>
        )}
        <div style={{ position:"absolute", inset:0, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:6, pointerEvents:"none" }}>
          <div style={{ borderRadius:"50%", background:"rgba(11,51,64,0.5)", padding:10, backdropFilter:"blur(4px)", display:"flex", alignItems:"center", justifyContent:"center" }}>
            <LockIconSvg />
          </div>
        </div>
      </div>
      <div className="maid-card-info" style={{ background:"#fff", display:"flex", flexDirection:"column", gap:6, flex:1 }}>
        <div style={{ height:10, width:"75%", background:"#d8edf2", borderRadius:3, filter:"blur(2px)" }} />
        <div style={{ height:8,  width:"50%", background:"#d8edf2", borderRadius:3, filter:"blur(2px)" }} />
        <div style={{ height:8,  width:"60%", background:"#d8edf2", borderRadius:3, filter:"blur(2px)" }} />
      </div>
      <div style={{ padding:"0 10px 10px" }}>
        <Link to={loginPath} style={{
          display:"flex", width:"100%", alignItems:"center", justifyContent:"center", gap:6,
          borderRadius:4, background:"linear-gradient(105deg,#0B3340 0%,#0E4E5E 60%,#1A6678 100%)",
          padding:"8px 10px", fontSize:9, fontWeight:700, letterSpacing:"0.05em",
          textTransform:"uppercase" as const, color:"#FCD34D", fontFamily:"'Inter',sans-serif",
          textDecoration:"none", transition:"opacity 0.15s", boxSizing:"border-box" as const,
        }}>
          <LockIconSvg />
          Log in to view
        </Link>
      </div>
    </div>
  );
};

const MaidCardFull = ({
  maid,
  searchMaidsHref,
}: {
  maid: MaidProfile;
  searchMaidsHref: string;
}) => {
  const photo = getPrimaryPhoto(maid);
  const age = calculateAge(maid.dateOfBirth);
  const flagCode = getNationalityCode(maid.nationality);
  const { bg: typeBg, color: typeColor } = getTypeBadgeStyle(maid.type);

  const langs = Object.entries(maid.languageSkills || {})
    .filter(([, level]) => { const l = String(level||"").trim().toLowerCase(); return l && l !== "zero" && l !== "none"; })
    .map(([key]) => key.charAt(0).toUpperCase() + key.slice(1))
    .slice(0, 3);

  return (
    <Link to={`/maids/${encodeURIComponent(maid.referenceCode)}`} className="maid-card" style={{ textDecoration:"none" }}>
      <div style={{ position:"relative", width:"100%", background:"#f5f9fa" }}>
        <img src={photo} alt={maid.fullName} loading="lazy" decoding="async" />
        {maid.type && (
          <span style={{ position:"absolute", top:10, left:10, background:typeBg, color:typeColor, fontSize:9, fontWeight:700, padding:"4px 10px", borderRadius:3, fontFamily:"'Inter',sans-serif", letterSpacing:"0.04em", textTransform:"uppercase" as const }}>
            {getTypeLabel(maid.type)}
          </span>
        )}
      </div>
      <div className="maid-card-info" style={{ background:"#fff", display:"flex", flexDirection:"column", gap:3, flex:1 }}>
        <h3 style={{ margin:0, fontSize:12, fontWeight:700, color:"#0B3340", lineHeight:1.3, fontFamily:"'Inter',sans-serif", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
          {maid.fullName}
        </h3>
        <p style={{ margin:0, fontSize:9, color:"#7AAABB", fontFamily:"monospace", lineHeight:1.4 }}>
          {maid.referenceCode}
        </p>
        {maid.nationality && (
          <p style={{ margin:0, display:"inline-flex", alignItems:"center", gap:5, fontSize:10, color:"#0E4E5E", fontWeight:600, lineHeight:1.4 }}>
            <FlagCircle code={flagCode} />
            {maid.nationality}
          </p>
        )}
        <div style={{ borderTop:"1px solid var(--border)", margin:"4px 0" }} />
        {(age || maid.maritalStatus) && (
          <div style={{ display:"flex", alignItems:"center", gap:5, fontSize:10, color:"#3A7A8A", lineHeight:1.4 }}>
            {age && <span style={{ fontWeight:700, color:"#0E4E5E" }}>{age} yrs</span>}
            {age && maid.maritalStatus && <span style={{ color:"#b0d8e0" }}>·</span>}
            {maid.maritalStatus && <span style={{ overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{maid.maritalStatus}</span>}
          </div>
        )}
        {maid.religion && (
          <p style={{ margin:0, fontSize:9, color:"#6AAABB", lineHeight:1.4, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
            {maid.religion}
          </p>
        )}
        {langs.length > 0 && (
          <p style={{ margin:0, fontSize:9, color:"#8ABBC8", lineHeight:1.4, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
            {langs.join(" · ")}
          </p>
        )}
      </div>
    </Link>
  );
};

/* ─────────────────────────────────────────────────────────────────────────────
   BACK TO TOP
───────────────────────────────────────────────────────────────────────────── */
const BackToTopButton = () => {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 400);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  return (
    <button className={`back-to-top-btn ${visible ? "visible" : "hidden"}`}
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      aria-label="Back to top">
      <ArrowUp size={19} color="#0B3340" strokeWidth={2.5} />
    </button>
  );
};

/* ─────────────────────────────────────────────────────────────────────────────
   STATIC DATA
───────────────────────────────────────────────────────────────────────────── */
const services = [
  { title: "Housekeeping",  slug: "housekeeping", description: "Meticulous cleaning & organization — your home, immaculate.",   image: housekeepingImg, Icon: Home,    badge: "Most Popular" },
  { title: "Elderly Care",  slug: "elderly-care", description: "Compassionate professional support for your loved ones.",        image: elderlyImg,      Icon: Heart,   badge: "Specialist"   },
  { title: "Infant Care",   slug: "infant-care",  description: "Expert caregivers providing nurturing support for newborns.",   image: infantImg,       Icon: Baby,    badge: "Certified"    },
  { title: "Kid Care",      slug: "kid-care",     description: "Safe, engaging, developmental care for growing children.",      image: culinaryImg,     Icon: Backpack, badge: "Top Rated"   },
];

const features = [
  { Icon: BadgeCheck,     title: "Rigorously Vetted",  description: "Multi-stage screening — only the most trustworthy candidates join our network.", stat: "100%", statLabel: "Background Checked" },
  { Icon: Sparkles,       title: "Smart Matching",      description: "Advanced compatibility matching finds helpers precisely tailored to your household.", stat: "98%",  statLabel: "Match Satisfaction"  },
  { Icon: HeartHandshake, title: "Ongoing Support",     description: "Continued mediation and after-placement care — service that doesn't end at signing.", stat: "24/7", statLabel: "Support Available"   },
];

const stats = [
  { value: "2,500+", label: "Placements Made",     Icon: TrendingUp, delay: "0s"    },
  { value: "15+",    label: "Years Experience",    Icon: Award,      delay: "0.1s"  },
  { value: "98%",    label: "Client Satisfaction", Icon: Star,       delay: "0.2s"  },
  { value: "500+",   label: "Active Helpers",      Icon: Users,      delay: "0.3s"  },
];

const TICKER_ITEMS = [
  "✦ Trusted Agency", "✦ 15+ Years", "✦ MOM Approved", "✦ 2,500+ Placements",
  "✦ 500+ Helpers", "✦ 98% Satisfaction", "✦ Background Checked",
  "✦ Smart Matching", "✦ 24/7 Support",
];

const MAID_TYPES = [
  "New Maid", "Transfer Maid", "Ex-Singapore Maid", "Willing to work on off-days",
] as const;

const ITEMS_PER_PAGE = 12;
const MAIDS_CACHE_KEY = "landing_maids_cache";
const MAIDS_CACHE_TTL = 5 * 60 * 1000;

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
   MAIN COMPONENT
═════════════════════════════════════════════════════════════════════════════*/
const ClientLandingPage = ({ embedded = false }: ClientLandingPageProps) => {
  const navigate = useNavigate();
  const [allPublicMaids, setAllPublicMaids] = useState<MaidProfile[]>([]);
  const [clientUser, setClientUser] = useState<ClientUser | null>(getStoredClient());
  const [isLoading, setIsLoading] = useState(true);
  const [loginPromptOpen, setLoginPromptOpen] = useState(false);
  const [pendingLoginPath, setPendingLoginPath] = useState("/employer-login");

  const [keyword, setKeyword] = useState("");
  const [maidTypes, setMaidTypes] = useState<string[]>([]);
  const [nationality, setNationality] = useState("No Preference");
  const [language, setLanguage] = useState("No Preference");
  const [currentPage, setCurrentPage] = useState(1);

  const isLoggedIn = !!getClientToken();
  const searchMaidsHref = isLoggedIn ? "/client/maids" : "/search-maids";

  useReveal();

  const location = useLocation();
  useEffect(() => {
    if (location.hash === "#services") {
      const el = document.getElementById("services");
      if (el) setTimeout(() => el.scrollIntoView({ behavior: "smooth" }), 100);
    }
  }, [location]);

  useEffect(() => {
    const load = async () => {
      try {
        setIsLoading(true);
        const cached = sessionStorage.getItem(MAIDS_CACHE_KEY);
        if (cached) {
          const { data, ts } = JSON.parse(cached) as { data: MaidProfile[]; ts: number };
          if (Date.now() - ts < MAIDS_CACHE_TTL) {
            setAllPublicMaids(data); setIsLoading(false); return;
          }
        }
        const mr = await fetch("/api/maids?visibility=public");
        const md = (await mr.json().catch(() => ({}))) as { error?: string; maids?: MaidProfile[] };
        if (!mr.ok || !md.maids) throw new Error(md.error || "Failed to load");
        const filtered = md.maids.filter(m => m.isPublic && hasPhoto(m));
        setAllPublicMaids(filtered);
        sessionStorage.setItem(MAIDS_CACHE_KEY, JSON.stringify({ data: filtered, ts: Date.now() }));
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed to load public maids");
      } finally {
        setIsLoading(false);
      }
    };
    void load();
  }, []);

  useEffect(() => {
    if (!isLoggedIn) return;
    const sync = async () => {
      try { const c = await syncClientProfileFromSession(); if (c) setClientUser(c); } catch {}
    };
    void sync();
  }, [isLoggedIn]);

  const nationalityOptions = useMemo(() => {
    const vals = Array.from(new Set(allPublicMaids.map(m => m.nationality?.trim()).filter(Boolean) as string[])).sort();
    return ["No Preference", ...vals];
  }, [allPublicMaids]);

  const languageOptions = ["No Preference","English","Mandarin/Chinese-Dialect","Bahasa Indonesia/Malaysia","Hindi","Tamil"];

  const toggleMaidType = (t: string) =>
    setMaidTypes(p => p.includes(t) ? p.filter(x => x !== t) : [...p, t]);

  const filteredMaids = useMemo(() =>
    filterMaids(allPublicMaids, { keyword, nationality: nationality === "No Preference" ? [] : [nationality], maidTypes, language }),
    [allPublicMaids, keyword, maidTypes, nationality, language],
  );

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
      if (nationality === "Filipino")    draft.natFilipino    = true;
      if (nationality === "Indonesian")  draft.natIndonesian  = true;
      if (nationality === "Myanmar")     draft.natMyanmar     = true;
      if (nationality === "Indian")      draft.natIndian      = true;
      if (nationality === "Sri Lankan")  draft.natSriLankan   = true;
      if (nationality === "Cambodian")   draft.natCambodian   = true;
      if (nationality === "Bangladeshi") draft.natBangladeshi = true;
    }
    if (language !== "No Preference") {
      params.set("language", language); draft.langNoPreference = false;
      if (language === "English")                   draft.langEnglish         = true;
      if (language === "Mandarin/Chinese-Dialect")  draft.langMandarin        = true;
      if (language === "Bahasa Indonesia/Malaysia") draft.langBahasaIndonesia = true;
      if (language === "Hindi")                     draft.langHindi           = true;
      if (language === "Tamil")                     draft.langTamil           = true;
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
  const clearFilters = () => {
    setKeyword(""); setMaidTypes([]); setNationality("No Preference"); setLanguage("No Preference"); setCurrentPage(1);
  };
  const hasFilters = keyword || maidTypes.length > 0 || nationality !== "No Preference" || language !== "No Preference";

  /* ── RENDER ── */
  return (
    <div className="int" style={{ minHeight: "100vh", background: "#fff", fontFamily: "'Inter', sans-serif" }}>
      <style>{GLOBAL_STYLES}</style>
      <BackToTopButton />

      {!embedded && (isLoggedIn ? <ClientPortalNavbar /> : <PublicSiteNavbar />)}

      {/* ── MAID JOB SEEKER BANNER ── */}
      {!isLoggedIn && (
        <div style={{ background: "linear-gradient(90deg, #0B3340 0%, #0E4E5E 100%)", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
          <div style={{ maxWidth: 1280, margin: "0 auto", padding: "12px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 32, height: 32, borderRadius: 8, background: "rgba(252,211,77,0.15)", border: "1px solid rgba(252,211,77,0.3)" }}>
                <Users size={15} color="#FCD34D" />
              </span>
              <div>
                <p className="pf" style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "#fff", fontStyle: "italic" }}>Looking for maid work?</p>
                <p style={{ margin: 0, fontSize: 12, color: "rgba(255,255,255,0.6)" }}>Apply through our recruitment portal — send your documents online.</p>
              </div>
            </div>
            <Link to="/apply-as-maid" className="btn-amber" style={{ flexShrink: 0, fontSize: 12 }}>
              Apply Now <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────────
          HERO
      ───────────────────────────────────────────────────────────────────────── */}
      <section style={{ background: "linear-gradient(150deg, #0B2A35 0%, #0E4E5E 55%, #1A6678 100%)", position: "relative", overflow: "hidden" }}>

        {/* Morphing orb — the page's signature ambient element */}
        <div style={{
          position: "absolute", top: "-120px", right: "-80px",
          width: 580, height: 580,
          background: "radial-gradient(circle at 40% 40%, rgba(252,211,77,0.22) 0%, rgba(26,102,120,0.15) 50%, transparent 75%)",
          animation: "morphOrb 14s ease-in-out infinite",
          pointerEvents: "none", zIndex: 0,
        }} />
        <div style={{
          position: "absolute", bottom: "-60px", left: "-80px",
          width: 360, height: 360,
          background: "radial-gradient(circle, rgba(252,211,77,0.1) 0%, transparent 70%)",
          animation: "morphOrb 18s 4s ease-in-out infinite",
          pointerEvents: "none", zIndex: 0,
        }} />
        {/* Subtle grid texture */}
        <div style={{ position: "absolute", inset: 0, backgroundImage: "linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px)", backgroundSize: "48px 48px", pointerEvents: "none", zIndex: 0 }} />

        <div className="hero-section" style={{ position: "relative", zIndex: 1, maxWidth: 1280, margin: "0 auto", padding: "72px 24px 0" }}>
          <div className="hero-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 56, alignItems: "center" }}>

            {/* ── Left copy ── */}
            <div style={{ animation: "slideInLeft 0.75s ease both" }}>
              {/* Trust badges */}
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 32 }}>
                {[
                  { Icon: Shield,     label: "Licensed Agency" },
                  { Icon: Award,      label: "15+ Years"        },
                  { Icon: BadgeCheck, label: "MOM Approved"     },
                ].map(({ Icon, label }) => (
                  <span key={label} style={{
                    display: "inline-flex", alignItems: "center", gap: 6,
                    padding: "7px 14px", borderRadius: 4,
                    background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.13)",
                    color: "rgba(255,255,255,0.8)", fontSize: 11, fontWeight: 600, letterSpacing: "0.03em",
                  }}>
                    <Icon size={11} color="#FCD34D" /> {label}
                  </span>
                ))}
              </div>

              {/* Headline */}
              <h1 className="pf hero-h1" style={{
                fontSize: "clamp(2.2rem,4.2vw,3.8rem)", lineHeight: 1.08,
                fontWeight: 900, color: "#fff", margin: "0 0 6px",
                letterSpacing: "-0.02em",
              }}>
                Find a Helper<br />
                <em style={{ color: "#FCD34D", fontStyle: "italic" }}>You Can Trust,</em><br />
                <span style={{ color: "rgba(255,255,255,0.45)", fontWeight: 700, fontSize: "0.62em" }}>
                  at a Price You'll Love.
                </span>
              </h1>

              {/* Amber rule — signature decorative motif */}
              <span className="amber-rule" style={{ marginBottom: 20 }} />

              <p style={{ color: "rgba(255,255,255,0.55)", fontSize: 15, lineHeight: 1.8, maxWidth: 420, margin: "0 0 32px" }}>
                Transparent fees. Verified professionals. A placement process built around your family's real needs — not just paperwork.
              </p>

              {clientUser && (
                <div style={{ display: "inline-flex", alignItems: "center", gap: 10, padding: "10px 18px", borderRadius: 8, background: "rgba(252,211,77,0.12)", border: "1px solid rgba(252,211,77,0.3)", marginBottom: 24 }}>
                  <UserCheck size={16} color="#FCD34D" />
                  <span style={{ color: "#fff", fontWeight: 600, fontSize: 14 }}>Welcome back, {clientUser.name}</span>
                </div>
              )}

              <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginBottom: 52 }}>
                <button className="btn-amber" onClick={() => document.getElementById("search")?.scrollIntoView({ behavior: "smooth" })}>
                  Browse Available Maids <ArrowRight size={15} />
                </button>
                <Link to="/employer-login" className="btn-outline-teal">
                  Employer Login <ChevronRight size={15} />
                </Link>
              </div>

              {/* Stats */}
              <div className="stats-grid" style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10 }}>
                {stats.map(({ value, label, Icon, delay }) => (
                  <div key={label} className="stat-card" style={{ animationDelay: delay }}>
                    <div style={{ width: 32, height: 32, borderRadius: 8, background: "rgba(252,211,77,0.14)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 8 }}>
                      <Icon size={15} color="#FCD34D" />
                    </div>
                    <span className="pf" style={{ color: "#FCD34D", fontSize: "clamp(18px,2.4vw,26px)", fontWeight: 900, lineHeight: 1 }}>{value}</span>
                    <span style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", marginTop: 4, lineHeight: 1.4 }}>{label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* ── Right image ── */}
            <div className="hero-image-col" style={{ position: "relative", animation: "slideInRight 0.75s 0.1s ease both" }}>
              {/* Rotating amber ring */}
              <div style={{
                position: "absolute", inset: -16, borderRadius: 20,
                border: "1.5px dashed rgba(252,211,77,0.25)",
                animation: "rotateSlow 50s linear infinite",
                zIndex: 0, pointerEvents: "none",
              }} />
              {/* Amber corner accent */}
              <div style={{
                position: "absolute", top: -6, left: -6, width: 60, height: 60,
                border: "3px solid var(--amber)", borderRight: "none", borderBottom: "none",
                borderRadius: "12px 0 0 0", zIndex: 2, pointerEvents: "none",
              }} />
              <div style={{
                position: "absolute", bottom: -6, right: -6, width: 60, height: 60,
                border: "3px solid var(--amber)", borderLeft: "none", borderTop: "none",
                borderRadius: "0 0 12px 0", zIndex: 2, pointerEvents: "none",
              }} />

              <div style={{
                position: "relative", borderRadius: 12, overflow: "hidden",
                border: "2px solid rgba(252,211,77,0.2)",
                boxShadow: "0 40px 90px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.04)",
                zIndex: 1,
              }}>
                <img src={heroImage} alt="Professional domestic helper" fetchPriority="high" decoding="async"
                  style={{ display: "block", width: "100%", objectFit: "cover", height: "clamp(280px,42vw,520px)" }} />
                <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: "45%", background: "linear-gradient(to top, rgba(11,51,64,0.85) 0%, transparent 100%)" }} />
                {/* Teal left-edge accent */}
                <div style={{ position: "absolute", top: 0, left: 0, bottom: 0, width: 4, background: "linear-gradient(to bottom, #FCD34D, #0E4E5E)" }} />
              </div>

              {/* Floating badges */}
              <div className="floating-badge" style={{ position: "absolute", bottom: 52, left: -28, animation: "floatY 3.8s ease-in-out infinite", zIndex: 3 }}>
                <div style={{ width: 38, height: 38, borderRadius: 10, background: "linear-gradient(135deg, #FCD34D, #E8B800)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, animation: "pulseAmber 2.5s ease infinite" }}>
                  <BadgeCheck size={18} color="#0B3340" />
                </div>
                <div>
                  <p className="int" style={{ fontWeight: 700, fontSize: 12, color: "#0B3340", margin: 0 }}>Fully Verified</p>
                  <p style={{ fontSize: 10, color: "#5A8A98", margin: "3px 0 0" }}>Background checked</p>
                </div>
              </div>

              <div className="floating-badge" style={{ position: "absolute", top: 20, right: -24, animation: "floatY 3.8s 2s ease-in-out infinite", zIndex: 3 }}>
                <div style={{ width: 38, height: 38, borderRadius: 10, background: "linear-gradient(135deg, #0E4E5E, #1A6678)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <Star size={18} color="#FCD34D" fill="#FCD34D" />
                </div>
                <div>
                  <p className="int" style={{ fontWeight: 700, fontSize: 12, color: "#0B3340", margin: 0 }}>Top Rated</p>
                  <p style={{ fontSize: 10, color: "#5A8A98", margin: "3px 0 0" }}>4.9 / 5 stars</p>
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* ── Ticker ── */}
        <div style={{ marginTop: 60, background: "#FCD34D", padding: "11px 0", overflow: "hidden" }}>
          <div className="ticker-track">
            {[...TICKER_ITEMS, ...TICKER_ITEMS].map((item, i) => (
              <span key={i} style={{
                fontFamily: "'Inter', sans-serif", fontSize: 10, fontWeight: 700,
                color: "#0B3340", padding: "0 32px", whiteSpace: "nowrap", letterSpacing: "0.06em",
                textTransform: "uppercase",
              }}>
                {item}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────────────
          SEARCH
      ───────────────────────────────────────────────────────────────────────── */}
      <section id="search" className="section-pad" style={{ background: "#F0F9FF", padding: "72px 0" }}>
        <div style={{ maxWidth: 1280, margin: "0 auto", padding: "0 24px" }}>

          <div className="reveal" style={{ textAlign: "center", marginBottom: 44 }}>
            <span className="section-chip" style={{ background: "#FCD34D", color: "#0B3340", marginBottom: 14, display: "inline-flex" }}>
              <SlidersHorizontal size={10} /> Smart Maid Search
            </span>
            <h2 className="pf" style={{ fontSize: "clamp(1.6rem,3.5vw,2.6rem)", color: "#0B3340", margin: "0 0 10px", fontStyle: "italic", letterSpacing: "-0.01em" }}>
              Find the Right Helper<br />for Your Home
            </h2>
            <span className="amber-rule" style={{ margin: "0 auto 16px", display: "block", width: 40 }} />
            <p style={{ color: "#3A7A8A", fontSize: 14, margin: 0 }}>Use the filters below to narrow down your perfect match.</p>
          </div>

          <div className="reveal search-card" style={{ maxWidth: 960, margin: "0 auto" }}>
            {/* Card header */}
            <div style={{
              background: "linear-gradient(105deg, #0B3340 0%, #0E4E5E 55%, #1A6678 100%)",
              padding: "16px 24px",
              display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10,
            }}>
              <span style={{ display: "flex", alignItems: "center", gap: 10, color: "#fff", fontFamily: "'Inter',sans-serif", fontSize: 12, fontWeight: 700 }}>
                <Search size={14} color="rgba(255,255,255,0.55)" /> Helper Search Filter
              </span>
              <span style={{ padding: "5px 14px", borderRadius: 4, background: "rgba(252,211,77,0.18)", border: "1px solid rgba(252,211,77,0.4)", color: "#FCD34D", fontSize: 11, fontWeight: 700, letterSpacing: "0.03em" }}>
                {isLoading ? "Loading…" : `${filteredMaids.length} matches`}
              </span>
            </div>

            {/* Card body */}
            <div className="search-body" style={{ padding: "26px 30px", display: "flex", flexDirection: "column", gap: 22 }}>
              {/* Keywords */}
              <div className="filter-row" style={{ display: "flex", alignItems: "center", gap: 16 }}>
                <label className="filter-label" style={{ flexShrink: 0, fontFamily: "'Inter',sans-serif", fontSize: 10, fontWeight: 700, color: "#0E4E5E", width: 100, letterSpacing: "0.06em", textTransform: "uppercase" as const }}>Keywords</label>
                <div style={{ position: "relative", flex: 1 }}>
                  <input className="input-styled" value={keyword} onChange={e => setKeyword(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && handleSearch()}
                    placeholder="e.g. Filipino, baby sitter, elderly care…" />
                  {keyword ? (
                    <button onClick={() => setKeyword("")} style={{ position:"absolute",right:12,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",cursor:"pointer",color:"#888",display:"flex",padding:2 }}>
                      <X size={14} />
                    </button>
                  ) : (
                    <Search size={14} color="#9BBFC8" style={{ position:"absolute",right:14,top:"50%",transform:"translateY(-50%)",pointerEvents:"none" }} />
                  )}
                </div>
              </div>

              {/* Maid Type */}
              <div className="filter-row" style={{ display: "flex", alignItems: "flex-start", gap: 16 }}>
                <label className="filter-label" style={{ flexShrink:0,fontFamily:"'Inter',sans-serif",fontSize:10,fontWeight:700,color:"#0E4E5E",width:100,letterSpacing:"0.06em",textTransform:"uppercase" as const,paddingTop:8 }}>Maid Type</label>
                <div style={{ display:"flex",flexWrap:"wrap",gap:8 }}>
                  {MAID_TYPES.map(t => {
                    const active = maidTypes.includes(t);
                    return (
                      <button key={t} type="button" onClick={() => toggleMaidType(t)} className={`tag-pill${active?" active":""}`}>
                        {active && <CheckCircle size={11} />} {t}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Nationality + Language */}
              <div className="nat-lang-row" style={{ display:"flex",gap:20 }}>
                <div style={{ flex:1,display:"flex",alignItems:"center",gap:16 }}>
                  <label className="filter-label" style={{ flexShrink:0,fontFamily:"'Inter',sans-serif",fontSize:10,fontWeight:700,color:"#0E4E5E",width:100,letterSpacing:"0.06em",textTransform:"uppercase" as const }}>Nationality</label>
                  <select className="select-styled" value={nationality} onChange={e => setNationality(e.target.value)}>
                    {nationalityOptions.map(o => <option key={o}>{o}</option>)}
                  </select>
                </div>
                <div style={{ flex:1,display:"flex",alignItems:"center",gap:16 }}>
                  <label className="filter-label" style={{ flexShrink:0,fontFamily:"'Inter',sans-serif",fontSize:10,fontWeight:700,color:"#0E4E5E",width:80,letterSpacing:"0.06em",textTransform:"uppercase" as const }}>Language</label>
                  <select className="select-styled" value={language} onChange={e => setLanguage(e.target.value)}>
                    {languageOptions.map(o => <option key={o}>{o}</option>)}
                  </select>
                </div>
              </div>

              {/* Actions */}
              <div className="search-actions" style={{ display:"flex",flexWrap:"wrap",alignItems:"center",gap:12,paddingTop:16,borderTop:"1.5px solid var(--border)" }}>
                <button type="button" onClick={handleRequestMaid} className="btn-amber">
                  <ClipboardList size={14} /> Request a Maid
                </button>
                <button type="button" className="btn-ghost-teal" onClick={() => navigate(searchMaidsHref)}>
                  <Search size={14} /> Browse All
                </button>
                {hasFilters && (
                  <button type="button" onClick={clearFilters} style={{ display:"inline-flex",alignItems:"center",gap:4,fontSize:12,color:"#6AAABB",textDecoration:"underline",background:"none",border:"none",cursor:"pointer" }}>
                    <X size={13} /> Clear filters
                  </button>
                )}
              </div>
            </div>
          </div>

          <p style={{ textAlign:"center",marginTop:16,fontSize:12,color:"#7AAABB" }}>
            {isLoading ? "Loading available maids…" : `${filteredMaids.length} public maid${filteredMaids.length!==1?"s":""} matching your criteria`}
          </p>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────────────
          MAID RESULTS
      ───────────────────────────────────────────────────────────────────────── */}
      <section id="maid-results" className="section-pad" style={{ background: "#fff", padding: "72px 0" }}>
        <div style={{ maxWidth: 1280, margin: "0 auto", padding: "0 24px" }}>

          <div className="reveal" style={{ display:"flex",alignItems:"flex-end",justifyContent:"space-between",marginBottom:32,gap:16,flexWrap:"wrap" }}>
            <div>
              <span className="section-chip" style={{ background:var_tealPale, color:"#0E4E5E", border:"1px solid var(--border)", marginBottom:10, display:"inline-flex" }}>
                <LayoutGrid size={10} /> Available Now
              </span>
              <h2 className="pf" style={{ fontSize:"clamp(1.4rem,2.8vw,2.1rem)",color:"#0B3340",margin:"0 0 6px",fontStyle:"italic" }}>
                Available Public Profiles
              </h2>
              <span className="amber-rule" />
              <p style={{ fontSize:13,color:"#6AAABB",margin:"8px 0 0" }}>Browse currently available profiles matching your filters.</p>
            </div>
            {totalPages > 1 && (
              <p style={{ fontSize:13,color:"#aaa",flexShrink:0 }}>Page {currentPage} of {totalPages}</p>
            )}
          </div>

          {isLoading ? (
            <div className="maid-grid">
              {Array.from({ length: 12 }).map((_, i) => (
                <div key={i} style={{ borderRadius:0,overflow:"hidden",border:"2px solid var(--teal-pale)",background:"#fff" }}>
                  <div style={{ aspectRatio:"3/4",background:"linear-gradient(90deg,#e8f4f7 25%,#c8e8ef 50%,#e8f4f7 75%)",backgroundSize:"600px 100%",animation:"shimmer 1.6s infinite" }} />
                  <div style={{ padding:"10px 12px 12px",display:"flex",flexDirection:"column",gap:6 }}>
                    <div style={{ height:10,width:"75%",borderRadius:3,background:"#e0f0f4" }} />
                    <div style={{ height:8,width:"50%",borderRadius:3,background:"#e0f0f4" }} />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredMaids.length === 0 ? (
            <div style={{ borderRadius:12,border:"2px dashed var(--border)",background:"var(--teal-frost)",padding:48,textAlign:"center" }}>
              <div style={{ fontSize:48,marginBottom:12 }}>🔍</div>
              <p className="pf" style={{ fontSize:16,fontWeight:700,color:"#0E4E5E",margin:"0 0 6px",fontStyle:"italic" }}>No matching helpers found</p>
              <p style={{ fontSize:13,color:"#6AAABB",margin:0 }}>Try a different nationality, maid type, or a broader keyword.</p>
            </div>
          ) : (
            <>
              {!isLoggedIn && (
                <div className="reveal" style={{ marginBottom:24,borderRadius:10,padding:"20px 24px",display:"flex",flexWrap:"wrap",alignItems:"center",justifyContent:"space-between",gap:16,background:"linear-gradient(110deg,#0B3340 0%,#0E4E5E 55%,#1A6678 100%)",border:"1.5px solid rgba(252,211,77,0.2)" }}>
                  <div>
                    <p style={{ color:"#fff",fontFamily:"'Inter',sans-serif",fontSize:13,fontWeight:700,display:"flex",alignItems:"center",gap:8,margin:"0 0 6px" }}>
                      <Lock size={14} color="#FCD34D" /> Unlock Full Maid Profiles
                    </p>
                    <p style={{ color:"rgba(255,255,255,0.58)",fontSize:13,margin:0,maxWidth:420 }}>
                      Guests see blurred previews only. Log in to view full biodata, photos &amp; begin hiring.
                    </p>
                  </div>
                  <Link to="/employer-login" className="btn-amber">
                    Employer Login <ArrowRight size={14} />
                  </Link>
                </div>
              )}

              <div className="maid-grid">
                {pagedMaids.map(maid =>
                  isLoggedIn ? (
                    <MaidCardFull key={maid.referenceCode} maid={maid} searchMaidsHref={searchMaidsHref} />
                  ) : (
                    <LockedMaidCard key={maid.referenceCode} maid={maid} loginPath="/employer-login" />
                  )
                )}
              </div>

              {totalPages > 1 && (
                <div className="pagination-wrap">
                  <button className="pagination-btn" onClick={() => setCurrentPage(p => Math.max(1,p-1))} disabled={currentPage===1} aria-label="Previous page">
                    <span className="pag-label">← Prev</span>
                    <span className="pag-icon" aria-hidden>‹</span>
                  </button>
                  {pageNumbers.map((page, idx) =>
                    page === "..." ? (
                      <span key={`e-${idx}`} style={{ padding:"0 2px",fontSize:13,color:"#aaa",userSelect:"none" }}>…</span>
                    ) : (
                      <button key={page} onClick={() => setCurrentPage(page as number)}
                        className={`pagination-btn${page===currentPage?" active":""}`}
                        aria-label={`Page ${page}`} aria-current={page===currentPage?"page":undefined}>
                        {page}
                      </button>
                    )
                  )}
                  <button className="pagination-btn" onClick={() => setCurrentPage(p => Math.min(totalPages,p+1))} disabled={currentPage===totalPages} aria-label="Next page">
                    <span className="pag-label">Next →</span>
                    <span className="pag-icon" aria-hidden>›</span>
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────────────
          SERVICES
      ───────────────────────────────────────────────────────────────────────── */}
      <section id="services" className="section-pad-lg" style={{ background: "#0B3340", padding: "88px 0", position: "relative", overflow: "hidden" }}>
        {/* Subtle dot grid */}
        <div style={{ position:"absolute",inset:0,backgroundImage:"radial-gradient(circle, rgba(252,211,77,0.07) 1px, transparent 1px)",backgroundSize:"30px 30px",pointerEvents:"none" }} />
        <div style={{ position:"absolute",top:-80,right:-80,width:440,height:440,borderRadius:"50%",background:"radial-gradient(circle, rgba(252,211,77,0.1) 0%, transparent 70%)",pointerEvents:"none" }} />

        <div style={{ position:"relative",maxWidth:1280,margin:"0 auto",padding:"0 24px" }}>
          <div className="reveal" style={{ textAlign:"center",marginBottom:52 }}>
            <span className="section-chip" style={{ background:"rgba(252,211,77,0.12)",color:"#FCD34D",border:"1px solid rgba(252,211,77,0.3)",marginBottom:14,display:"inline-flex" }}>
              <Home size={10} /> Our Services
            </span>
            <h2 className="pf" style={{ fontSize:"clamp(1.6rem,3.5vw,2.6rem)",color:"#fff",margin:"0 0 10px",fontStyle:"italic" }}>
              Specialized Care for{" "}
              <span style={{ color:"#FCD34D" }}>Every Need</span>
            </h2>
            <span className="amber-rule" style={{ margin:"0 auto",display:"block",width:40 }} />
            <p style={{ color:"rgba(255,255,255,0.45)",fontSize:14,margin:"16px auto 0",maxWidth:380 }}>
              From daily housekeeping to specialized elder care — the right professional for your home.
            </p>
          </div>

          <div className="services-grid reveal" style={{ display:"grid",gridTemplateColumns:"repeat(auto-fill, minmax(260px,1fr))",gap:20 }}>
            {services.map(({ title, slug, description, image, Icon, badge }) => (
              <Link key={title} to={`/services/${slug}`} className="service-card" style={{ display:"block",textDecoration:"none" }}>
                <img src={image} alt={title} loading="lazy" decoding="async" />
                <div className="service-overlay" />
                <span className="service-card-badge">{badge}</span>
                <div style={{ position:"absolute",bottom:0,left:0,right:0,padding:20 }}>
                  <div style={{ width:36,height:36,borderRadius:8,background:"rgba(252,211,77,0.18)",backdropFilter:"blur(8px)",border:"1px solid rgba(252,211,77,0.3)",display:"flex",alignItems:"center",justifyContent:"center",marginBottom:10 }}>
                    <Icon size={18} color="#FCD34D" />
                  </div>
                  <h3 className="pf" style={{ color:"#fff",fontStyle:"italic",fontSize:16,fontWeight:700,margin:"0 0 6px" }}>{title}</h3>
                  <p style={{ color:"rgba(255,255,255,0.65)",fontSize:12,lineHeight:1.6,margin:"0 0 10px" }}>{description}</p>
                  <span style={{ display:"inline-flex",alignItems:"center",gap:4,color:"#FCD34D",fontSize:12,fontWeight:600 }}>
                    Learn More <ChevronRight size={13} />
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────────────
          WHY US
      ───────────────────────────────────────────────────────────────────────── */}
      <section id="why" className="section-pad-lg" style={{ background: "#F0F9FF", padding: "88px 0" }}>
        <div style={{ maxWidth:1280,margin:"0 auto",padding:"0 24px" }}>
          <div className="reveal" style={{ textAlign:"center",marginBottom:56 }}>
            <span className="section-chip" style={{ background:"#FCD34D",color:"#0B3340",marginBottom:14,display:"inline-flex" }}>
              <Award size={10} /> Why Choose Us
            </span>
            <h2 className="pf" style={{ fontSize:"clamp(1.6rem,3.5vw,2.6rem)",color:"#0B3340",margin:"0 0 8px",fontStyle:"italic" }}>
              Singapore's Most Trusted{" "}
              <span style={{ color:"#0E4E5E" }}>Maid Agency</span>
            </h2>
            <span className="amber-rule" style={{ margin:"0 auto 16px",display:"block",width:40 }} />
            <p style={{ color:"#3A7A8A",fontSize:14,margin:0,maxWidth:400,marginInline:"auto" }}>
              We go beyond placement — ensuring you and your helper thrive together.
            </p>
          </div>

          <div className="why-grid" style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:52,alignItems:"center" }}>

            {/* Image col */}
            <div className="why-image-col reveal" style={{ position:"relative" }}>
              {/* Amber bracket frame */}
              <div style={{ position:"absolute",inset:-10,borderRadius:14,border:"2px solid var(--amber)",zIndex:0,transform:"rotate(-1.2deg)" }} />
              <div style={{ position:"relative",borderRadius:12,overflow:"hidden",boxShadow:"0 24px 60px rgba(14,78,94,0.2)",zIndex:1 }}>
                <img src={familyImg} alt="Happy family" loading="lazy" decoding="async"
                  style={{ width:"100%",objectFit:"cover",display:"block",height:"clamp(280px,38vw,440px)" }} />
                <div style={{ position:"absolute",bottom:0,left:0,right:0,height:"45%",background:"linear-gradient(to top,rgba(11,51,64,0.8) 0%,transparent 100%)" }} />
                <div style={{ position:"absolute",bottom:24,left:24,right:24 }}>
                  <div style={{ display:"flex",gap:6,alignItems:"center" }}>
                    {[...Array(5)].map((_,i)=><Star key={i} size={13} fill="#FCD34D" color="#FCD34D" />)}
                    <span className="pf" style={{ fontWeight:900,fontSize:14,color:"#FCD34D",fontStyle:"italic" }}>4.9</span>
                  </div>
                  <p style={{ color:"rgba(255,255,255,0.65)",fontSize:12,margin:"4px 0 0" }}>2,500+ satisfied families</p>
                </div>
              </div>
              <div style={{ position:"absolute",top:-18,right:-22,borderRadius:10,padding:"16px 20px",background:"#FCD34D",boxShadow:"0 10px 32px rgba(252,211,77,0.45),0 3px 0 var(--amber-deep)",zIndex:2 }}>
                <p className="pf" style={{ fontSize:34,fontWeight:900,color:"#0B3340",margin:0,lineHeight:1 }}>15+</p>
                <p style={{ fontSize:10,color:"#6B4900",margin:"4px 0 0",fontWeight:700,lineHeight:1.3 }}>Years of Excellence<br/>in Domestic Care</p>
              </div>
            </div>

            {/* Features */}
            <div className="reveal" style={{ display:"flex",flexDirection:"column",gap:14 }}>
              {features.map(({ Icon, title, description, stat, statLabel }) => (
                <div key={title} className="feature-card">
                  <div style={{ width:46,height:46,borderRadius:10,flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center",background:"linear-gradient(135deg,#FCD34D 0%,#E8B800 100%)",boxShadow:"0 3px 0 var(--amber-deep)" }}>
                    <Icon size={20} color="#0B3340" />
                  </div>
                  <div style={{ flex:1,minWidth:0 }}>
                    <div style={{ display:"flex",alignItems:"flex-start",justifyContent:"space-between",gap:12,marginBottom:6 }}>
                      <h3 className="pf" style={{ fontStyle:"italic",fontSize:14,fontWeight:700,color:"#0B3340",margin:0 }}>{title}</h3>
                      <div style={{ textAlign:"right",flexShrink:0 }}>
                        <p className="pf" style={{ fontSize:22,fontWeight:900,color:"#0E4E5E",margin:0,lineHeight:1 }}>{stat}</p>
                        <p style={{ fontSize:9,color:"#7AAABB",margin:"3px 0 0",fontWeight:600,textTransform:"uppercase",letterSpacing:"0.05em" }}>{statLabel}</p>
                      </div>
                    </div>
                    <p style={{ fontSize:12,color:"#3A7A8A",lineHeight:1.7,margin:0 }}>{description}</p>
                  </div>
                </div>
              ))}

              {/* CTA block */}
              <div style={{ borderRadius:10,padding:24,background:"linear-gradient(110deg,#0B3340 0%,#0E4E5E 55%,#1A6678 100%)",border:"1.5px solid rgba(252,211,77,0.2)",position:"relative",overflow:"hidden" }}>
                <div style={{ position:"absolute",top:-30,right:-30,width:120,height:120,borderRadius:"50%",background:"radial-gradient(circle,rgba(252,211,77,0.18) 0%,transparent 70%)",pointerEvents:"none" }} />
                <p className="pf" style={{ fontStyle:"italic",fontWeight:700,fontSize:15,color:"#fff",margin:"0 0 8px" }}>
                  Ready to find your perfect helper?
                </p>
                <p style={{ color:"rgba(255,255,255,0.55)",fontSize:13,lineHeight:1.7,margin:"0 0 18px" }}>
                  Browse 500+ verified profiles or speak with our placement team today.
                </p>
                <button className="btn-amber" onClick={() => navigate(searchMaidsHref)} style={{ padding:"11px 20px",fontSize:12 }}>
                  <Users size={14} /> Browse Helpers
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────────────
          FOOTER
      ───────────────────────────────────────────────────────────────────────── */}
      <footer style={{ background: "#0B2A35", borderTop: "1px solid rgba(255,255,255,0.06)", padding: "56px 0 32px" }}>
        <div style={{ maxWidth:1280,margin:"0 auto",padding:"0 24px" }}>
          <div className="footer-grid" style={{ display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:36,marginBottom:40 }}>
            <div>
              <h4 className="pf" style={{ fontStyle:"italic",color:"#FCD34D",fontSize:17,fontWeight:700,margin:"0 0 12px" }}>
                "Find Maids" At The Agency
              </h4>
              <p style={{ fontSize:13,color:"rgba(255,255,255,0.48)",lineHeight:1.7,margin:0 }}>
                Matching trusted domestic professionals with families since 2009.
              </p>
            </div>
            <div>
              <h5 style={{ color:"rgba(255,255,255,0.55)",fontSize:10,fontWeight:700,letterSpacing:"0.1em",textTransform:"uppercase",margin:"0 0 14px" }}>Company</h5>
              <ul style={{ listStyle:"none",padding:0,margin:0,display:"flex",flexDirection:"column",gap:8 }}>
                {[["#why","About Us"],["#services","Our Services"],["#contact","Contact"]].map(([href,label])=>(
                  <li key={label}><a href={href} style={{ color:"rgba(255,255,255,0.5)",fontSize:13,textDecoration:"none",transition:"color 0.15s" }} onMouseEnter={e=>(e.currentTarget.style.color="#FCD34D")} onMouseLeave={e=>(e.currentTarget.style.color="rgba(255,255,255,0.5)")}>{label}</a></li>
                ))}
              </ul>
            </div>
            <div>
              <h5 style={{ color:"rgba(255,255,255,0.55)",fontSize:10,fontWeight:700,letterSpacing:"0.1em",textTransform:"uppercase",margin:"0 0 14px" }}>Legal</h5>
              <ul style={{ listStyle:"none",padding:0,margin:0,display:"flex",flexDirection:"column",gap:8 }}>
                {[["#contact","Legal Information"],["#contact","Privacy Policy"],["#contact","Terms of Service"]].map(([href,label])=>(
                  <li key={label}><a href={href} style={{ color:"rgba(255,255,255,0.5)",fontSize:13,textDecoration:"none",transition:"color 0.15s" }} onMouseEnter={e=>(e.currentTarget.style.color="#FCD34D")} onMouseLeave={e=>(e.currentTarget.style.color="rgba(255,255,255,0.5)")}>{label}</a></li>
                ))}
              </ul>
            </div>
            <div>
              <h5 style={{ color:"rgba(255,255,255,0.55)",fontSize:10,fontWeight:700,letterSpacing:"0.1em",textTransform:"uppercase",margin:"0 0 14px" }}>Newsletter</h5>
              <p style={{ fontSize:13,color:"rgba(255,255,255,0.45)",lineHeight:1.6,margin:"0 0 14px" }}>Care tips, industry news, and agency updates.</p>
              <div style={{ display:"flex",gap:8 }}>
                <input style={{ flex:1,padding:"9px 12px",borderRadius:6,border:"1px solid rgba(255,255,255,0.15)",background:"rgba(255,255,255,0.07)",color:"#fff",fontSize:12,fontFamily:"'Inter',sans-serif",outline:"none" }} placeholder="Email address" />
                <button className="btn-amber" style={{ padding:"9px 16px",fontSize:12 }}>Join</button>
              </div>
            </div>
          </div>

          {/* Divider + copyright */}
          <div style={{ borderTop:"1px solid rgba(255,255,255,0.07)",paddingTop:24,display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:12 }}>
            <p style={{ fontSize:12,color:"rgba(255,255,255,0.28)",margin:0 }}>
              © 2026 "Find Maids" At The Agency. All rights reserved.
            </p>
            <div style={{ display:"flex",alignItems:"center",gap:6 }}>
              <div style={{ width:8,height:8,borderRadius:"50%",background:"#FCD34D",animation:"pulseAmber 2s ease infinite" }} />
              <span style={{ fontSize:11,color:"rgba(255,255,255,0.35)",letterSpacing:"0.04em" }}>MOM Licensed Agency</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default ClientLandingPage;

const var_tealPale = "var(--teal-pale)";