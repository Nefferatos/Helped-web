import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowRight, CheckCircle, HeartHandshake, Users, X, Star,
  Shield, ChevronRight, Search, Home, Heart, Baby, Backpack,
  BadgeCheck, Sparkles, Lock, UserCheck, TrendingUp,
  Award, SlidersHorizontal, LayoutGrid, ArrowUp, Phone,
  MapPin, Mail, Clock, MessageCircle, PhoneCall, Facebook,
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
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;800;900&family=Inter:wght@300;400;500;600;700&display=swap');

  :root {
    --teal:        #0E4E5E;
    --teal-light:  #165F72;
    --teal-mid:    #1A7A8A;
    --teal-pale:   #E8F4F6;
    --teal-ghost:  #F0F8FA;
    --amber:       #FCD34D;
    --amber-light: #FDE68A;
    --amber-dark:  #D4A017;
    --amber-deep:  #92700A;
    --ink:         #0A2830;
    --mist:        #F5FBFC;
    --border:      #C8E4EA;
  }

  *, *::before, *::after { box-sizing: border-box; }

  /* ── Keyframes ── */
  @keyframes fadeUp {
    from { opacity: 0; transform: translateY(28px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes fadeIn {
    from { opacity: 0; }
    to   { opacity: 1; }
  }
  @keyframes floatBob {
    0%, 100% { transform: translateY(0px) rotate(0deg); }
    33%       { transform: translateY(-8px) rotate(0.5deg); }
    66%       { transform: translateY(-4px) rotate(-0.3deg); }
  }
  @keyframes scaleIn {
    from { opacity: 0; transform: scale(0.88); }
    to   { opacity: 1; transform: scale(1); }
  }
  @keyframes ticker {
    0%   { transform: translateX(0); }
    100% { transform: translateX(-50%); }
  }
  @keyframes shimmer {
    0%   { background-position: -600px 0; }
    100% { background-position:  600px 0; }
  }
  @keyframes spinSlow {
    from { transform: rotate(0deg); }
    to   { transform: rotate(360deg); }
  }
  @keyframes pulseGlow {
    0%, 100% { box-shadow: 0 0 0 0 rgba(252, 211, 77, 0.5); }
    50%       { box-shadow: 0 0 0 12px rgba(252, 211, 77, 0); }
  }
  @keyframes drawLine {
    from { width: 0; }
    to   { width: 100%; }
  }
  @keyframes bttIn {
    from { opacity: 0; transform: translateY(12px) scale(0.8); }
    to   { opacity: 1; transform: translateY(0) scale(1); }
  }
  @keyframes bttOut {
    from { opacity: 1; transform: translateY(0) scale(1); }
    to   { opacity: 0; transform: translateY(12px) scale(0.8); }
  }
  @keyframes waveUnderline {
    0%   { background-position: 0% 50%; }
    100% { background-position: 200% 50%; }
  }
  @keyframes cardReveal {
    from { opacity: 0; transform: translateY(20px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes borderTrace {
    0%   { clip-path: inset(0 100% 0 0); }
    100% { clip-path: inset(0 0% 0 0); }
  }

  .playfair { font-family: 'Playfair Display', Georgia, serif; }
  .inter    { font-family: 'Inter', system-ui, sans-serif; }

  /* ── Primary Button ── */
  .btn-amber {
    background: var(--amber);
    color: var(--ink);
    font-family: 'Inter', sans-serif;
    font-size: 13px;
    font-weight: 700;
    letter-spacing: 0.01em;
    padding: 13px 26px;
    border-radius: 8px;
    border: none;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    gap: 8px;
    transition: transform 0.2s, box-shadow 0.2s, background 0.2s;
    box-shadow: 0 2px 0 var(--amber-deep), 0 8px 24px rgba(252,211,77,0.3);
    text-decoration: none;
    white-space: nowrap;
    position: relative;
    overflow: hidden;
  }
  .btn-amber::after {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(105deg, transparent 30%, rgba(255,255,255,0.25) 50%, transparent 70%);
    transform: translateX(-100%);
    transition: transform 0.45s;
  }
  .btn-amber:hover::after { transform: translateX(100%); }
  .btn-amber:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 0 var(--amber-deep), 0 16px 36px rgba(252,211,77,0.38);
    background: var(--amber-light);
  }
  .btn-amber:active { transform: translateY(1px); box-shadow: 0 1px 0 var(--amber-deep); }

  /* ── Ghost Button ── */
  .btn-ghost {
    background: transparent;
    color: rgba(255,255,255,0.82);
    font-family: 'Inter', sans-serif;
    font-size: 13px;
    font-weight: 600;
    padding: 13px 24px;
    border-radius: 8px;
    border: 1.5px solid rgba(255,255,255,0.22);
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    gap: 8px;
    transition: all 0.2s;
    text-decoration: none;
    white-space: nowrap;
  }
  .btn-ghost:hover {
    border-color: var(--amber);
    color: var(--amber);
    background: rgba(252,211,77,0.07);
  }

  /* ── Teal outline button ── */
  .btn-teal-outline {
    background: transparent;
    color: var(--teal);
    font-family: 'Inter', sans-serif;
    font-size: 13px;
    font-weight: 700;
    padding: 11px 22px;
    border-radius: 8px;
    border: 2px solid var(--teal-mid);
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    gap: 8px;
    transition: all 0.2s;
    text-decoration: none;
    white-space: nowrap;
  }
  .btn-teal-outline:hover {
    background: var(--teal);
    color: #fff;
    border-color: var(--teal);
  }

  /* ── Maid Cards ── */
  .maid-card {
    background: #fff;
    border: 1.5px solid var(--border);
    border-radius: 12px;
    overflow: hidden;
    transition: all 0.28s cubic-bezier(0.34, 1.56, 0.64, 1);
    cursor: pointer;
    display: flex;
    flex-direction: column;
  }
  .maid-card:hover {
    border-color: var(--amber-dark);
    transform: translateY(-6px) scale(1.02);
    box-shadow: 0 20px 50px rgba(14,78,94,0.18), 0 3px 0 var(--amber-dark);
  }
  .maid-card img {
    width: 100%;
    height: auto;
    aspect-ratio: 3/4;
    object-fit: contain;
    display: block;
    background: var(--teal-ghost);
  }

  /* ── Feature Cards ── */
  .feature-card {
    background: #fff;
    border: 1.5px solid var(--border);
    border-radius: 16px;
    padding: 26px;
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
    width: 4px;
    background: var(--amber);
    transform: scaleY(0);
    transform-origin: bottom;
    transition: transform 0.3s ease;
    border-radius: 0 2px 2px 0;
  }
  .feature-card:hover::before { transform: scaleY(1); }
  .feature-card:hover {
    border-color: rgba(14,78,94,0.3);
    box-shadow: 0 12px 40px rgba(14,78,94,0.12);
    transform: translateX(4px);
  }

  /* ── Service Cards ── */
  .service-card {
    border-radius: 16px;
    overflow: hidden;
    position: relative;
    height: 320px;
    transition: transform 0.3s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.3s;
  }
  .service-card:hover {
    transform: translateY(-8px) scale(1.02);
    box-shadow: 0 32px 60px rgba(0,0,0,0.32);
  }
  .service-card img {
    width: 100%; height: 100%;
    object-fit: cover;
    transition: transform 0.55s;
  }
  .service-card:hover img { transform: scale(1.07); }
  .service-overlay {
    position: absolute; inset: 0;
    background: linear-gradient(to top, rgba(10,40,48,0.92) 0%, rgba(10,40,48,0.35) 50%, transparent 100%);
  }
  .service-badge {
    position: absolute;
    top: 14px; right: 14px;
    background: var(--amber);
    color: var(--ink);
    font-family: 'Inter', sans-serif;
    font-size: 10px;
    font-weight: 700;
    padding: 4px 10px;
    border-radius: 4px;
    letter-spacing: 0.04em;
    text-transform: uppercase;
  }

  /* ── Stat Card ── */
  .stat-card {
    background: rgba(255,255,255,0.07);
    border: 1px solid rgba(255,255,255,0.13);
    border-radius: 12px;
    padding: 16px;
    display: flex;
    flex-direction: column;
    gap: 4px;
    transition: background 0.2s, border-color 0.2s;
  }
  .stat-card:hover {
    background: rgba(252,211,77,0.1);
    border-color: rgba(252,211,77,0.35);
  }

  /* ── Tag Pills ── */
  .tag-pill {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 8px 16px;
    border-radius: 6px;
    font-size: 12.5px;
    font-weight: 600;
    border: 1.5px solid var(--border);
    background: var(--teal-ghost);
    color: var(--teal);
    cursor: pointer;
    transition: all 0.15s;
    font-family: 'Inter', sans-serif;
  }
  .tag-pill.active {
    background: var(--teal);
    border-color: var(--teal);
    color: var(--amber);
    box-shadow: 0 2px 0 rgba(14,78,94,0.4);
  }
  .tag-pill:hover:not(.active) {
    border-color: var(--teal-mid);
    background: var(--teal-pale);
    color: var(--teal);
  }

  /* ── Search Card ── */
  .search-card {
    background: #fff;
    border-radius: 16px;
    border: 1.5px solid var(--border);
    box-shadow: 0 6px 0 rgba(14,78,94,0.12), 0 24px 60px rgba(14,78,94,0.1);
    overflow: hidden;
  }

  /* ── Select / Input ── */
  .select-styled {
    appearance: none;
    width: 100%;
    padding: 11px 14px;
    border: 1.5px solid var(--border);
    border-radius: 8px;
    font-size: 13px;
    font-weight: 500;
    color: var(--ink);
    background: var(--teal-ghost);
    font-family: 'Inter', sans-serif;
    outline: none;
    cursor: pointer;
    transition: border-color 0.2s, box-shadow 0.2s;
  }
  .select-styled:focus {
    border-color: var(--teal-mid);
    box-shadow: 0 0 0 3px rgba(14,78,94,0.12);
  }
  .input-styled {
    width: 100%;
    padding: 11px 40px 11px 14px;
    border: 1.5px solid var(--border);
    border-radius: 8px;
    font-size: 13px;
    font-weight: 500;
    color: var(--ink);
    background: var(--teal-ghost);
    font-family: 'Inter', sans-serif;
    outline: none;
    transition: border-color 0.2s, box-shadow 0.2s;
  }
  .input-styled::placeholder { color: #8FB8C2; }
  .input-styled:focus {
    border-color: var(--teal-mid);
    box-shadow: 0 0 0 3px rgba(14,78,94,0.12);
  }

  /* ── Section chip ── */
  .section-chip {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 5px 14px;
    border-radius: 4px;
    font-size: 10.5px;
    font-weight: 700;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    font-family: 'Inter', sans-serif;
  }

  /* ── Ticker ── */
  .ticker-track {
    display: flex;
    gap: 0;
    width: max-content;
    animation: ticker 30s linear infinite;
  }
  .ticker-track:hover { animation-play-state: paused; }

  /* ── Floating badge ── */
  .float-badge {
    background: #fff;
    border-radius: 12px;
    padding: 12px 16px;
    display: flex;
    align-items: center;
    gap: 12px;
    box-shadow: 0 16px 40px rgba(14,78,94,0.2);
    border: 1.5px solid var(--border);
  }

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
    border-radius: 8px;
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
    color: var(--amber);
  }
  .pagination-btn.active {
    background: var(--teal);
    border-color: var(--teal);
    color: var(--amber);
  }
  .pagination-btn:disabled { opacity: 0.35; cursor: not-allowed; }
  .pag-icon  { display: none; font-size: 22px; line-height: 1; }
  .pag-label { display: inline; }

  /* ── Back to Top ── */
  .back-to-top-btn {
    position: fixed;
    bottom: 32px;
    left: 32px;
    z-index: 9999;
    width: 48px;
    height: 48px;
    border-radius: 50%;
    border: none;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--amber);
    box-shadow: 0 4px 0 var(--amber-deep), 0 8px 28px rgba(252,211,77,0.4);
    transition: transform 0.18s, box-shadow 0.18s;
    outline: none;
  }
  .back-to-top-btn:hover {
    transform: translateY(-3px);
    box-shadow: 0 7px 0 var(--amber-deep), 0 14px 38px rgba(252,211,77,0.5);
  }
  .back-to-top-btn:active { transform: translateY(1px); box-shadow: 0 2px 0 var(--amber-deep); }
  .back-to-top-btn.visible { animation: bttIn 0.28s cubic-bezier(0.34,1.56,0.64,1) both; pointer-events: auto; opacity: 1; }
  .back-to-top-btn.hidden  { animation: bttOut 0.22s ease both; pointer-events: none; opacity: 0; }

  /* ── Maid Grid ── */
  .maid-grid {
    display: grid;
    gap: 16px;
    grid-template-columns: repeat(6, 1fr);
  }
  .maid-card-info { padding: 10px 12px 12px; }

  /* ── Decorative underline for headings ── */
  .amber-underline {
    position: relative;
    display: inline-block;
  }
  .amber-underline::after {
    content: '';
    position: absolute;
    left: 0; bottom: -4px;
    height: 4px;
    background: var(--amber);
    border-radius: 2px;
    animation: drawLine 0.8s 0.4s ease both;
    width: 100%;
  }

  /* ── Animated counter highlight ── */
  .stat-value {
    font-family: 'Playfair Display', serif;
    font-size: clamp(20px, 2.8vw, 30px);
    font-weight: 900;
    color: var(--amber);
    line-height: 1;
  }

  /* ── Hero diagonal accent ── */
  .hero-diagonal {
    position: absolute;
    bottom: 0; right: 0;
    width: 55%;
    height: 100%;
    background: rgba(255,255,255,0.03);
    clip-path: polygon(18% 0%, 100% 0%, 100% 100%, 0% 100%);
    pointer-events: none;
  }

  /* ── Dot grid pattern ── */
  .dot-pattern {
    background-image: radial-gradient(circle, rgba(252,211,77,0.12) 1px, transparent 1px);
    background-size: 28px 28px;
  }

  /* ── Animated entry for maid cards (staggered) ── */
  .maid-card-anim {
    animation: cardReveal 0.4s ease both;
  }

  /* ── Why us image frame ── */
  .why-frame {
    position: relative;
    border-radius: 20px;
    overflow: hidden;
    box-shadow: 0 30px 70px rgba(14,78,94,0.25);
  }
  .why-frame::before {
    content: '';
    position: absolute;
    inset: -3px;
    background: linear-gradient(135deg, var(--amber), var(--teal-mid));
    border-radius: 22px;
    z-index: -1;
  }

  /* Responsive */
  @media (max-width: 1100px) { .maid-grid { grid-template-columns: repeat(4,1fr); gap: 12px; } }
  @media (max-width: 700px)  { .maid-grid { grid-template-columns: repeat(3,1fr); gap: 10px; } }
  @media (max-width: 480px)  {
    .maid-grid { grid-template-columns: repeat(2,1fr); gap: 8px; }
    .maid-card-info { padding: 8px 10px 10px; }
    .pag-icon  { display: inline; }
    .pag-label { display: none; }
    .pagination-btn { min-width: 38px; height: 38px; padding: 0 8px; font-size: 12px; }
    .back-to-top-btn { bottom: 20px; left: 20px; width: 42px; height: 42px; }
  }
  @media (max-width: 900px) {
    .hero-grid  { grid-template-columns: 1fr !important; }
    .hero-img-col { display: none !important; }
    .stats-grid { grid-template-columns: repeat(2,1fr) !important; }
    .why-grid   { grid-template-columns: 1fr !important; }
    .why-img-col { display: none !important; }
  }
  @media (max-width: 768px) {
    .filter-row  { flex-direction: column !important; gap: 10px !important; }
    .filter-label { width: auto !important; }
    .nat-lang-row { flex-direction: column !important; gap: 12px !important; }
    .search-body  { padding: 16px 18px !important; }
    .search-actions { flex-direction: column !important; align-items: stretch !important; }
    .search-actions .btn-amber,
    .search-actions .btn-teal-outline { width: 100%; justify-content: center; }
  }
  @media (max-width: 600px) {
    .services-grid { grid-template-columns: 1fr !important; }
  }
  @media (max-width: 900px) {
    .footer-grid { grid-template-columns: 1fr 1fr !important; gap: 28px !important; }
  }
  @media (max-width: 520px) {
    .footer-grid { grid-template-columns: 1fr !important; }
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
   BLURRED CANVAS (for locked cards)
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
      const sw = img.naturalWidth * scale;
      const sh = img.naturalHeight * scale;
      const ox = (w - sw) / 2;
      const oy = (h - sh) / 2;
      ctx.filter = "blur(10px) brightness(0.8)";
      ctx.globalAlpha = 0.9;
      ctx.drawImage(img, ox, oy, sw, sh);
      if (!revoked && blobUrl) { URL.revokeObjectURL(blobUrl); revoked = true; }
    };

    const img = new Image();
    img.crossOrigin = "anonymous";

    fetch(src, { credentials: "same-origin" })
      .then((r) => { if (!r.ok) throw new Error("fetch failed"); return r.blob(); })
      .then((blob) => {
        blobUrl = URL.createObjectURL(blob);
        img.onload = () => draw(img);
        img.onerror = () => { if (!revoked && blobUrl) { URL.revokeObjectURL(blobUrl); revoked = true; } drawFallback(); };
        img.src = blobUrl;
      })
      .catch(() => drawFallback());

    const drawFallback = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      const w = canvas.offsetWidth || 240;
      canvas.width = w; canvas.height = Math.round(w * (4 / 3));
      ctx.fillStyle = "#D0EAF0";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    };

    return () => { if (!revoked && blobUrl) { URL.revokeObjectURL(blobUrl); revoked = true; } };
  }, [src]);

  return (
    <canvas ref={canvasRef} style={{ width:"100%", aspectRatio:"3/4", display:"block", background:"#D0EAF0",
      userSelect:"none", pointerEvents:"none", filter:"blur(2px)" }} />
  );
};

/* ─────────────────────────────────────────────────────────────────────────────
   NATIONALITY FLAGS
───────────────────────────────────────────────────────────────────────────── */
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
    <span style={{ display:"inline-flex", alignItems:"center", justifyContent:"center",
      width:14, height:14, borderRadius:"50%", overflow:"hidden",
      border:"1px solid rgba(0,0,0,0.1)", background:"#e5e7eb",
      flexShrink:0, verticalAlign:"middle" }}>
      <img src={`https://flagcdn.com/w40/${code.toLowerCase()}.png`} alt={code}
        style={{ width:"100%", height:"100%", objectFit:"cover", display:"block" }} />
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
  if (t.includes("transfer")) return { bg: "#FEF3C7", color: "#92400E" };
  return { bg: "#F0F9E8", color: "#2D6A4F" };
};

/* ─────────────────────────────────────────────────────────────────────────────
   MAID CARDS
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
      <div style={{ position:"relative", width:"100%", overflow:"hidden" }}>
        {photo ? (
          <BlurredCanvas src={photo} />
        ) : (
          <div style={{ aspectRatio:"3/4", background:"#D0EAF0", display:"flex",
            alignItems:"center", justifyContent:"center" }}>
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#8FBBC8" strokeWidth={1}>
              <path strokeLinecap="round" strokeLinejoin="round"
                d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
            </svg>
          </div>
        )}
        {maid.type && (
          <div style={{ position:"absolute", top:10, left:10, filter:"blur(3px)", pointerEvents:"none" }}>
            <span style={{ background:typeBg, color:typeColor, fontSize:9, fontWeight:700,
              padding:"4px 10px", borderRadius:4, fontFamily:"'Inter',sans-serif", letterSpacing:"0.04em" }}>
              {getTypeLabel(maid.type)}
            </span>
          </div>
        )}
        <div style={{ position:"absolute", inset:0, display:"flex", flexDirection:"column",
          alignItems:"center", justifyContent:"center", gap:6, pointerEvents:"none" }}>
          <div style={{ borderRadius:"50%", background:"rgba(14,78,94,0.5)", padding:10,
            backdropFilter:"blur(4px)", display:"flex", alignItems:"center", justifyContent:"center" }}>
            <LockIconSvg />
          </div>
        </div>
      </div>
      <div className="maid-card-info" style={{ background:"#fff", display:"flex",
        flexDirection:"column", gap:6, flex:1 }}>
        <div style={{ height:10, width:"75%", background:"#E0EEF2", borderRadius:4, filter:"blur(2px)" }} />
        <div style={{ height:8,  width:"50%", background:"#E0EEF2", borderRadius:4, filter:"blur(2px)" }} />
        <div style={{ height:8,  width:"60%", background:"#E0EEF2", borderRadius:4, filter:"blur(2px)" }} />
      </div>
      <div style={{ padding:"0 10px 10px" }}>
        <Link to={loginPath} style={{
          display:"flex", width:"100%", alignItems:"center", justifyContent:"center",
          gap:6, borderRadius:6, background:"var(--teal)",
          padding:"8px 10px", fontSize:9, fontWeight:700, letterSpacing:"0.05em",
          textTransform:"uppercase" as const, color:"var(--amber)",
          fontFamily:"'Inter',sans-serif", textDecoration:"none", boxSizing:"border-box" as const,
        }}>
          <LockIconSvg />
          Log in to view
        </Link>
      </div>
    </div>
  );
};

const MaidCardFull = ({ maid, searchMaidsHref }: { maid: MaidProfile; searchMaidsHref: string }) => {
  const photo = getPrimaryPhoto(maid);
  const age = calculateAge(maid.dateOfBirth);
  const flagCode = getNationalityCode(maid.nationality);
  const { bg: typeBg, color: typeColor } = getTypeBadgeStyle(maid.type);

  const langs = Object.entries(maid.languageSkills || {})
    .filter(([, level]) => { const l = String(level||"").trim().toLowerCase(); return l && l!=="zero" && l!=="none"; })
    .map(([key]) => key.charAt(0).toUpperCase() + key.slice(1))
    .slice(0, 3);

  return (
    <Link to={`/maids/${encodeURIComponent(maid.referenceCode)}`} className="maid-card" style={{ textDecoration:"none" }}>
      <div style={{ position:"relative", width:"100%", background:"var(--teal-ghost)" }}>
        <img src={photo} alt={maid.fullName} loading="lazy" decoding="async" />
        {maid.type && (
          <span style={{ position:"absolute", top:10, left:10, background:typeBg, color:typeColor,
            fontSize:9, fontWeight:700, padding:"4px 10px", borderRadius:4,
            fontFamily:"'Inter',sans-serif", letterSpacing:"0.04em", textTransform:"uppercase" }}>
            {getTypeLabel(maid.type)}
          </span>
        )}
      </div>
      <div className="maid-card-info" style={{ background:"#fff", display:"flex", flexDirection:"column", gap:3, flex:1 }}>
        <h3 style={{ margin:0, fontSize:12, fontWeight:700, color:"var(--ink)", lineHeight:1.3,
          fontFamily:"'Inter',sans-serif", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
          {maid.fullName}
        </h3>
        <p style={{ margin:0, fontSize:9, color:"#8FB8C2", fontFamily:"monospace", lineHeight:1.4 }}>
          {maid.referenceCode}
        </p>
        {maid.nationality && (
          <p style={{ margin:0, display:"inline-flex", alignItems:"center", gap:5,
            fontSize:10, color:"var(--teal)", fontWeight:600, lineHeight:1.4 }}>
            <FlagCircle code={flagCode} />
            {maid.nationality}
          </p>
        )}
        <div style={{ borderTop:"1px solid var(--border)", margin:"4px 0" }} />
        {(age || maid.maritalStatus) && (
          <div style={{ display:"flex", alignItems:"center", gap:5, fontSize:10, color:"#3A7080", lineHeight:1.4 }}>
            {age && <span style={{ fontWeight:700, color:"var(--teal)" }}>{age} yrs</span>}
            {age && maid.maritalStatus && <span style={{ color:"var(--border)" }}>·</span>}
            {maid.maritalStatus && <span style={{ overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{maid.maritalStatus}</span>}
          </div>
        )}
        {maid.religion && (
          <p style={{ margin:0, fontSize:9, color:"#7AABB8", lineHeight:1.4, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
            {maid.religion}
          </p>
        )}
        {langs.length > 0 && (
          <p style={{ margin:0, fontSize:9, color:"#9ABBC4", lineHeight:1.4, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
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
      onClick={() => window.scrollTo({ top:0, behavior:"smooth" })}
      aria-label="Back to top" title="Back to top">
      <ArrowUp size={20} color={`var(--ink)`} strokeWidth={2.5} />
    </button>
  );
};

/* ─────────────────────────────────────────────────────────────────────────────
   STATIC DATA
───────────────────────────────────────────────────────────────────────────── */
const services = [
  { title:"Housekeeping",  slug:"housekeeping", description:"Meticulous daily cleaning and organization — a home that always feels fresh.",        image:housekeepingImg, Icon:Home,    badge:"Most Popular" },
  { title:"Elderly Care",  slug:"elderly-care", description:"Compassionate, professional support for aging loved ones.",                           image:elderlyImg,      Icon:Heart,   badge:"Specialist"   },
  { title:"Infant Care",   slug:"infant-care",  description:"Nurturing expert caregivers for newborns and toddlers.",                              image:infantImg,       Icon:Baby,    badge:"Certified"    },
  { title:"Kid Care",      slug:"kid-care",     description:"Safe, engaging developmental care as your children grow.",                             image:culinaryImg,     Icon:Backpack,badge:"Top Rated"    },
];

const features = [
  { Icon:BadgeCheck,     title:"Rigorously Vetted",  description:"Multi-stage screening and background checks — only the most trustworthy helpers join our network.", stat:"100%", statLabel:"Background Checked" },
  { Icon:Sparkles,       title:"Smart Matching",     description:"We analyse your household's needs and find helpers who genuinely fit your lifestyle.",              stat:"98%",  statLabel:"Match Satisfaction"  },
  { Icon:HeartHandshake, title:"Ongoing Support",    description:"Post-placement mediation, check-ins, and support — because placement is just the beginning.",       stat:"24/7", statLabel:"Support Available"   },
];

const stats = [
  { value:"2,500+", label:"Families Served",     Icon:TrendingUp },
  { value:"15+",    label:"Years of Experience", Icon:Award      },
  { value:"98%",    label:"Client Satisfaction", Icon:Star       },
  { value:"500+",   label:"Active Helpers",      Icon:Users      },
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

  const location = useLocation();
  useEffect(() => {
    if (location.hash === "#services") {
      const el = document.getElementById("services");
      if (el) setTimeout(() => el.scrollIntoView({ behavior:"smooth" }), 100);
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
    const syncInBackground = async () => {
      try {
        const c = await syncClientProfileFromSession();
        if (c) setClientUser(c);
      } catch { /* silent */ }
    };
    void syncInBackground();
  }, [isLoggedIn]);

  const nationalityOptions = useMemo(() => {
    const vals = Array.from(
      new Set(allPublicMaids.map((m) => m.nationality?.trim()).filter(Boolean) as string[])
    ).sort();
    return ["No Preference", ...vals];
  }, [allPublicMaids]);

  const languageOptions = [
    "No Preference", "English", "Mandarin/Chinese-Dialect",
    "Bahasa Indonesia/Malaysia", "Hindi", "Tamil",
  ];

  const toggleMaidType = (t: string) =>
    setMaidTypes((p) => p.includes(t) ? p.filter((x) => x !== t) : [...p, t]);

  const filteredMaids = useMemo(() =>
    filterMaids(allPublicMaids, {
      keyword,
      nationality: nationality === "No Preference" ? [] : [nationality],
      maidTypes,
      language,
    }),
    [allPublicMaids, keyword, maidTypes, nationality, language],
  );

  useEffect(() => { setCurrentPage(1); }, [keyword, maidTypes, nationality, language]);

  const totalPages = Math.ceil(filteredMaids.length / ITEMS_PER_PAGE);
  const pagedMaids = filteredMaids.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  const pageNumbers = useMemo(() => {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
    const pages: (number | "...")[] = [1];
    if (currentPage > 3) pages.push("...");
    for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++)
      pages.push(i);
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
    if (!isLoggedIn) {
      setPendingLoginPath(buildEmployerLoginPath(target));
      setLoginPromptOpen(true);
      return;
    }
    navigate(target);
  };
  const clearFilters = () => {
    setKeyword(""); setMaidTypes([]); setNationality("No Preference"); setLanguage("No Preference"); setCurrentPage(1);
  };
  const hasFilters = keyword || maidTypes.length > 0 || nationality !== "No Preference" || language !== "No Preference";

  return (
    <div className="inter" style={{ minHeight:"100vh", background:"#fff", fontFamily:"'Inter',sans-serif" }}>
      <style>{GLOBAL_STYLES}</style>

      <BackToTopButton />

      {!embedded && (isLoggedIn ? <ClientPortalNavbar /> : <PublicSiteNavbar />)}

      {/* ── RECRUITMENT BANNER ── */}
      {!isLoggedIn && (
        <div style={{
          background: "var(--teal)",
          borderBottom: "1px solid rgba(255,255,255,0.1)",
        }}>
          <div style={{ maxWidth:1280, margin:"0 auto", padding:"12px 24px",
            display:"flex", alignItems:"center", justifyContent:"space-between", gap:16, flexWrap:"wrap" }}>
            <div style={{ display:"flex", alignItems:"center", gap:12 }}>
              <div style={{ width:32, height:32, borderRadius:8, background:"rgba(252,211,77,0.15)",
                display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                <Phone size={15} color="var(--amber)" />
              </div>
              <div>
                <p className="playfair" style={{ margin:0, fontSize:15, fontWeight:700, color:"#fff" }}>
                  Looking for maid work?
                </p>
                <p style={{ margin:"2px 0 0", fontSize:12, color:"rgba(255,255,255,0.62)" }}>
                  Apply directly through our recruitment portal.
                </p>
              </div>
            </div>
            <Link to="/apply-as-maid" className="btn-amber" style={{ fontSize:12, padding:"10px 20px" }}>
              Apply Now <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      )}

      {/* ── HERO ── */}
      <section style={{
        background: "linear-gradient(140deg, var(--ink) 0%, var(--teal) 55%, #1A7A8A 100%)",
        position: "relative",
        overflow: "hidden",
      }}>
        {/* Dot background */}
        <div className="dot-pattern" style={{ position:"absolute", inset:0, pointerEvents:"none", zIndex:0 }} />
        {/* Diagonal accent */}
        <div className="hero-diagonal" />
        {/* Ambient glow */}
        <div style={{ position:"absolute", top:"-100px", right:"-80px", width:480, height:480,
          borderRadius:"50%", background:"radial-gradient(circle, rgba(252,211,77,0.14) 0%, transparent 68%)",
          pointerEvents:"none", zIndex:0 }} />
        <div style={{ position:"absolute", bottom:"-80px", left:"-60px", width:320, height:320,
          borderRadius:"50%", background:"radial-gradient(circle, rgba(26,122,138,0.3) 0%, transparent 70%)",
          pointerEvents:"none", zIndex:0 }} />

        <div style={{ position:"relative", zIndex:1, maxWidth:1280, margin:"0 auto", padding:"64px 24px 0" }}>
          <div className="hero-grid" style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:52, alignItems:"center" }}>

            {/* Left */}
            <div style={{ animation:"fadeUp 0.65s ease both" }}>
              {/* Trust badges */}
              <div style={{ display:"flex", flexWrap:"wrap", gap:8, marginBottom:30 }}>
                {[
                  { Icon:Shield,     label:"Licensed Agency", accent:"var(--amber)" },
                  { Icon:Award,      label:"15+ Years",        accent:"#6FD4E4" },
                  { Icon:BadgeCheck, label:"MOM Approved",     accent:"var(--amber)" },
                ].map(({ Icon, label, accent }) => (
                  <span key={label} style={{ display:"inline-flex", alignItems:"center", gap:6,
                    padding:"6px 14px", borderRadius:6,
                    background:"rgba(255,255,255,0.07)", border:"1px solid rgba(255,255,255,0.14)",
                    color:"rgba(255,255,255,0.82)", fontSize:11, fontWeight:600, letterSpacing:"0.02em" }}>
                    <Icon size={11} color={accent} /> {label}
                  </span>
                ))}
              </div>

              <h1 className="playfair" style={{ fontSize:"clamp(2rem,4vw,3.4rem)", lineHeight:1.08,
                fontWeight:900, color:"#fff", margin:"0 0 10px", letterSpacing:"-0.02em" }}>
                Hiring a Helper<br />
                <span className="amber-underline" style={{ color:"var(--amber)" }}>
                  Now More Accessible
                </span><br />
                <span style={{ color:"rgba(255,255,255,0.45)", fontSize:"0.68em", fontWeight:700,
                  fontFamily:"'Inter',sans-serif", letterSpacing:"0" }}>
                  Than You Think.
                </span>
              </h1>

              <p style={{ color:"rgba(255,255,255,0.55)", fontSize:15, lineHeight:1.8,
                maxWidth:440, margin:"20px 0 32px" }}>
                Transparent fees, no hidden costs. More families can access reliable, professional domestic help without financial stress.
              </p>

              {clientUser && (
                <div style={{ display:"inline-flex", alignItems:"center", gap:10,
                  padding:"10px 18px", borderRadius:10,
                  background:"rgba(252,211,77,0.12)", border:"1px solid rgba(252,211,77,0.28)",
                  marginBottom:24 }}>
                  <UserCheck size={16} color="var(--amber)" />
                  <span style={{ color:"#fff", fontWeight:600, fontSize:14 }}>
                    Welcome back, {clientUser.name}
                  </span>
                </div>
              )}

              <div style={{ display:"flex", flexWrap:"wrap", gap:12, marginBottom:52 }}>
                <button className="btn-amber"
                  onClick={() => document.getElementById("search")?.scrollIntoView({ behavior:"smooth" })}>
                  Search Maids <ArrowRight size={15} />
                </button>
                <Link to="/employer-login" className="btn-ghost">
                  Employer Login <ChevronRight size={15} />
                </Link>
              </div>

              {/* Stats */}
              <div className="stats-grid" style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:10 }}>
                {stats.map(({ value, label, Icon }) => (
                  <div key={label} className="stat-card">
                    <div style={{ width:30, height:30, borderRadius:8,
                      background:"rgba(252,211,77,0.14)", display:"flex",
                      alignItems:"center", justifyContent:"center", marginBottom:8 }}>
                      <Icon size={14} color="var(--amber)" />
                    </div>
                    <span className="stat-value">{value}</span>
                    <span style={{ fontSize:10, color:"rgba(255,255,255,0.4)", marginTop:4, lineHeight:1.4 }}>
                      {label}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Right image */}
            <div className="hero-img-col" style={{ position:"relative", animation:"fadeUp 0.65s 0.18s ease both" }}>
              {/* Spinning orbit ring */}
              <div style={{ position:"absolute", inset:-16, borderRadius:32,
                border:"1.5px dashed rgba(252,211,77,0.22)", zIndex:0,
                animation:"spinSlow 45s linear infinite" }} />
              <div style={{ position:"relative", borderRadius:24, overflow:"hidden",
                border:"3px solid rgba(252,211,77,0.28)",
                boxShadow:"0 40px 100px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.04)", zIndex:1 }}>
                <img src={heroImage} alt="Professional domestic helper" fetchPriority="high" decoding="async"
                  style={{ display:"block", width:"100%", objectFit:"cover", height:"clamp(280px,42vw,510px)" }} />
                <div style={{ position:"absolute", bottom:0, left:0, right:0, height:"40%",
                  background:"linear-gradient(to top, rgba(10,40,48,0.82) 0%, transparent 100%)" }} />
                {/* Amber left stripe */}
                <div style={{ position:"absolute", top:0, left:0, bottom:0, width:5,
                  background:"linear-gradient(to bottom, var(--amber), var(--teal-mid))" }} />
              </div>

              {/* Floating badge: Verified */}
              <div className="float-badge" style={{ position:"absolute", bottom:52, left:-28,
                animation:"floatBob 4s ease-in-out infinite", zIndex:2 }}>
                <div style={{ width:38, height:38, borderRadius:10,
                  background:"linear-gradient(135deg, var(--amber), var(--amber-dark))",
                  display:"flex", alignItems:"center", justifyContent:"center",
                  flexShrink:0, animation:"pulseGlow 2.5s ease infinite" }}>
                  <BadgeCheck size={18} color="var(--ink)" />
                </div>
                <div>
                  <p style={{ fontFamily:"'Inter',sans-serif", fontWeight:700, fontSize:12,
                    color:"var(--ink)", margin:0 }}>Fully Verified</p>
                  <p style={{ fontSize:10, color:"#6A9BAA", margin:"3px 0 0" }}>Background checked</p>
                </div>
              </div>

              {/* Floating badge: Top Rated */}
              <div className="float-badge" style={{ position:"absolute", top:16, right:-22,
                animation:"floatBob 4s 2s ease-in-out infinite", zIndex:2 }}>
                <div style={{ width:38, height:38, borderRadius:10,
                  background:"linear-gradient(135deg, var(--teal-mid), var(--teal))",
                  display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                  <Star size={18} color="var(--amber)" fill="var(--amber)" />
                </div>
                <div>
                  <p style={{ fontFamily:"'Inter',sans-serif", fontWeight:700, fontSize:12,
                    color:"var(--ink)", margin:0 }}>Top Rated</p>
                  <p style={{ fontSize:10, color:"#6A9BAA", margin:"3px 0 0" }}>4.9 / 5 stars</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Ticker */}
        <div style={{ marginTop:56, background:"var(--amber)", padding:"11px 0", overflow:"hidden" }}>
          <div className="ticker-track">
            {[...TICKER_ITEMS, ...TICKER_ITEMS].map((item, i) => (
              <span key={i} style={{ fontFamily:"'Inter',sans-serif", fontSize:10, fontWeight:700,
                color:"var(--ink)", padding:"0 28px", whiteSpace:"nowrap", letterSpacing:"0.05em" }}>
                {item}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ── SEARCH ── */}
      <section id="search" style={{ background:"var(--teal-ghost)", padding:"72px 0" }}>
        <div style={{ maxWidth:1280, margin:"0 auto", padding:"0 24px" }}>
          <div style={{ textAlign:"center", marginBottom:44 }}>
            <span className="section-chip" style={{ background:"var(--teal)", color:"var(--amber)",
              marginBottom:14, display:"inline-flex" }}>
              <SlidersHorizontal size={11} /> Maid Search
            </span>
            <h2 className="playfair" style={{ fontSize:"clamp(1.6rem,3.5vw,2.4rem)", color:"var(--ink)",
              margin:"0 0 10px", letterSpacing:"-0.02em" }}>
              Find the Right Helper<br />for Your Home
            </h2>
            <p style={{ color:"#5A8C9A", fontSize:14, margin:0 }}>
              Use the smart filters below to narrow down your perfect match.
            </p>
          </div>

          <div className="search-card" style={{ maxWidth:960, margin:"0 auto" }}>
            {/* Header */}
            <div style={{ background:"var(--teal)", padding:"16px 24px",
              display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap", gap:10 }}>
              <span style={{ display:"flex", alignItems:"center", gap:10, color:"#fff",
                fontFamily:"'Inter',sans-serif", fontSize:13, fontWeight:700 }}>
                <Search size={15} color="rgba(255,255,255,0.55)" /> Maid Search Filter
              </span>
              <span style={{ padding:"5px 14px", borderRadius:4,
                background:"rgba(252,211,77,0.18)", border:"1px solid rgba(252,211,77,0.38)",
                color:"var(--amber)", fontSize:11, fontWeight:700, fontFamily:"'Inter',sans-serif" }}>
                {isLoading ? "Loading…" : `${filteredMaids.length} matches`}
              </span>
            </div>

            {/* Body */}
            <div className="search-body" style={{ padding:"26px 28px", display:"flex", flexDirection:"column", gap:22 }}>
              {/* Keywords */}
              <div className="filter-row" style={{ display:"flex", alignItems:"center", gap:16 }}>
                <label className="filter-label" style={{ flexShrink:0, fontFamily:"'Inter',sans-serif",
                  fontSize:10, fontWeight:700, color:"var(--teal)", width:100, letterSpacing:"0.05em",
                  textTransform:"uppercase" }}>
                  Keywords
                </label>
                <div style={{ position:"relative", flex:1 }}>
                  <input className="input-styled" value={keyword}
                    onChange={(e) => setKeyword(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                    placeholder="e.g. Filipino maid, baby sitter, elderly care…" />
                  {keyword ? (
                    <button onClick={() => setKeyword("")} style={{ position:"absolute", right:12,
                      top:"50%", transform:"translateY(-50%)", background:"none", border:"none",
                      cursor:"pointer", color:"#8FB8C2", display:"flex", padding:2 }}>
                      <X size={14} />
                    </button>
                  ) : (
                    <Search size={14} color="#8FB8C2" style={{ position:"absolute", right:14,
                      top:"50%", transform:"translateY(-50%)", pointerEvents:"none" }} />
                  )}
                </div>
              </div>

              {/* Maid Type */}
              <div className="filter-row" style={{ display:"flex", alignItems:"flex-start", gap:16 }}>
                <label className="filter-label" style={{ flexShrink:0, fontFamily:"'Inter',sans-serif",
                  fontSize:10, fontWeight:700, color:"var(--teal)", width:100,
                  letterSpacing:"0.05em", textTransform:"uppercase", paddingTop:8 }}>
                  Maid Type
                </label>
                <div style={{ display:"flex", flexWrap:"wrap", gap:8 }}>
                  {MAID_TYPES.map((t) => {
                    const active = maidTypes.includes(t);
                    return (
                      <button key={t} type="button" onClick={() => toggleMaidType(t)}
                        className={`tag-pill${active ? " active" : ""}`}>
                        {active && <CheckCircle size={11} />} {t}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Nationality + Language */}
              <div className="nat-lang-row" style={{ display:"flex", gap:20 }}>
                <div style={{ flex:1, display:"flex", alignItems:"center", gap:16 }}>
                  <label className="filter-label" style={{ flexShrink:0, fontFamily:"'Inter',sans-serif",
                    fontSize:10, fontWeight:700, color:"var(--teal)", width:100,
                    letterSpacing:"0.05em", textTransform:"uppercase" }}>
                    Nationality
                  </label>
                  <select className="select-styled" value={nationality}
                    onChange={(e) => setNationality(e.target.value)}>
                    {nationalityOptions.map((o) => <option key={o}>{o}</option>)}
                  </select>
                </div>
                <div style={{ flex:1, display:"flex", alignItems:"center", gap:16 }}>
                  <label className="filter-label" style={{ flexShrink:0, fontFamily:"'Inter',sans-serif",
                    fontSize:10, fontWeight:700, color:"var(--teal)", width:80,
                    letterSpacing:"0.05em", textTransform:"uppercase" }}>
                    Language
                  </label>
                  <select className="select-styled" value={language}
                    onChange={(e) => setLanguage(e.target.value)}>
                    {languageOptions.map((o) => <option key={o}>{o}</option>)}
                  </select>
                </div>
              </div>

              {/* Actions */}
              <div className="search-actions" style={{ display:"flex", flexWrap:"wrap",
                alignItems:"center", gap:12, paddingTop:18,
                borderTop:"1.5px solid var(--border)" }}>
                <button type="button" onClick={handleRequestMaid} className="btn-amber">
                  <ClipboardList size={14} /> Request Maid
                </button>
                <button type="button" className="btn-teal-outline"
                  onClick={() => navigate(searchMaidsHref)}>
                  <Search size={14} /> Browse All Maids
                </button>
                {hasFilters && (
                  <button type="button" onClick={clearFilters}
                    style={{ display:"inline-flex", alignItems:"center", gap:4, fontSize:12,
                      color:"#8FB8C2", textDecoration:"underline", background:"none",
                      border:"none", cursor:"pointer", fontFamily:"'Inter',sans-serif" }}>
                    <X size={13} /> Clear filters
                  </button>
                )}
              </div>
            </div>
          </div>

          <p style={{ textAlign:"center", marginTop:16, fontSize:12, color:"#7AABB8" }}>
            {isLoading ? "Loading available maids…"
              : `${filteredMaids.length} public maid${filteredMaids.length !== 1 ? "s" : ""} matching your criteria`}
          </p>
        </div>
      </section>

      {/* ── MAID RESULTS ── */}
      <section id="maid-results" style={{ background:"#fff", padding:"72px 0" }}>
        <div style={{ maxWidth:1280, margin:"0 auto", padding:"0 24px" }}>
          <div style={{ display:"flex", alignItems:"flex-end", justifyContent:"space-between",
            marginBottom:32, gap:16, flexWrap:"wrap" }}>
            <div>
              <span className="section-chip" style={{ background:"var(--teal-pale)", color:"var(--teal)",
                border:"1px solid var(--border)", marginBottom:10, display:"inline-flex" }}>
                <LayoutGrid size={11} /> Available Now
              </span>
              <h2 className="playfair" style={{ fontSize:"clamp(1.3rem,2.8vw,2rem)", color:"var(--ink)",
                margin:"0 0 6px", letterSpacing:"-0.02em" }}>
                Available Public Maids
              </h2>
              <p style={{ fontSize:13, color:"#7AABB8", margin:0 }}>
                Browse currently available profiles matching your filters.
              </p>
            </div>
            {totalPages > 1 && (
              <p style={{ fontSize:13, color:"#aaa", flexShrink:0 }}>
                Page {currentPage} of {totalPages}
              </p>
            )}
          </div>

          {isLoading ? (
            <div className="maid-grid">
              {Array.from({ length: 12 }).map((_, i) => (
                <div key={i} style={{ borderRadius:12, overflow:"hidden",
                  border:"1.5px solid var(--border)", background:"#fff" }}>
                  <div style={{ aspectRatio:"3/4",
                    background:"linear-gradient(90deg, #f0f0f0 25%, #e0eff3 50%, #f0f0f0 75%)",
                    backgroundSize:"600px 100%", animation:"shimmer 1.5s infinite" }} />
                  <div style={{ padding:"10px 12px 12px", display:"flex", flexDirection:"column", gap:6 }}>
                    <div style={{ height:10, width:"75%", borderRadius:4, background:"#e0eff3" }} />
                    <div style={{ height:8,  width:"50%", borderRadius:4, background:"#e0eff3" }} />
                    <div style={{ height:8,  width:"60%", borderRadius:4, background:"#e0eff3" }} />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredMaids.length === 0 ? (
            <div style={{ borderRadius:16, border:"1.5px dashed var(--border)",
              background:"var(--teal-ghost)", padding:48, textAlign:"center" }}>
              <div style={{ fontSize:48, marginBottom:12 }}>🔍</div>
              <p className="playfair" style={{ fontSize:16, fontWeight:700, color:"var(--teal)", margin:"0 0 6px" }}>
                No matching maids found
              </p>
              <p style={{ fontSize:13, color:"#7AABB8", margin:0 }}>
                Try a different nationality, maid type, or a broader keyword.
              </p>
            </div>
          ) : (
            <>
              {!isLoggedIn && (
                <div style={{ marginBottom:24, borderRadius:14, padding:"18px 24px",
                  display:"flex", flexWrap:"wrap", alignItems:"center",
                  justifyContent:"space-between", gap:16,
                  background:"var(--teal)", border:"1.5px solid rgba(252,211,77,0.2)" }}>
                  <div>
                    <p style={{ color:"#fff", fontFamily:"'Inter',sans-serif", fontSize:13,
                      fontWeight:700, display:"flex", alignItems:"center", gap:8, margin:"0 0 5px" }}>
                      <Lock size={14} color="var(--amber)" /> Unlock Full Maid Profiles
                    </p>
                    <p style={{ color:"rgba(255,255,255,0.58)", fontSize:13, margin:0, maxWidth:400 }}>
                      Guests see blurred previews only. Login to view full biodata, photos and begin hiring.
                    </p>
                  </div>
                  <Link to="/employer-login" className="btn-amber">
                    Employer Login <ArrowRight size={14} />
                  </Link>
                </div>
              )}

              <div className="maid-grid">
                {pagedMaids.map((maid, idx) =>
                  isLoggedIn ? (
                    <div key={maid.referenceCode} className="maid-card-anim"
                      style={{ animationDelay:`${idx * 40}ms` }}>
                      <MaidCardFull maid={maid} searchMaidsHref={searchMaidsHref} />
                    </div>
                  ) : (
                    <div key={maid.referenceCode} className="maid-card-anim"
                      style={{ animationDelay:`${idx * 40}ms` }}>
                      <LockedMaidCard maid={maid} loginPath="/employer-login" />
                    </div>
                  )
                )}
              </div>

              {totalPages > 1 && (
                <div className="pagination-wrap">
                  <button className="pagination-btn"
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1} aria-label="Previous page">
                    <span className="pag-label">← Prev</span>
                    <span className="pag-icon" aria-hidden="true">‹</span>
                  </button>
                  {pageNumbers.map((page, idx) =>
                    page === "..." ? (
                      <span key={`e-${idx}`} style={{ padding:"0 2px", fontSize:13, color:"#aaa", userSelect:"none" }}>…</span>
                    ) : (
                      <button key={page} onClick={() => setCurrentPage(page as number)}
                        className={`pagination-btn${page === currentPage ? " active" : ""}`}
                        aria-label={`Page ${page}`} aria-current={page === currentPage ? "page" : undefined}>
                        {page}
                      </button>
                    )
                  )}
                  <button className="pagination-btn"
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages} aria-label="Next page">
                    <span className="pag-label">Next →</span>
                    <span className="pag-icon" aria-hidden="true">›</span>
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </section>

      {/* ── SERVICES ── */}
      <section id="services" style={{ background:"var(--ink)", padding:"88px 0", position:"relative", overflow:"hidden" }}>
        <div className="dot-pattern" style={{ position:"absolute", inset:0, pointerEvents:"none" }} />
        <div style={{ position:"absolute", top:-120, right:-120, width:500, height:500, borderRadius:"50%",
          background:"radial-gradient(circle, rgba(14,78,94,0.4) 0%, transparent 70%)",
          pointerEvents:"none" }} />

        <div style={{ position:"relative", maxWidth:1280, margin:"0 auto", padding:"0 24px" }}>
          <div style={{ textAlign:"center", marginBottom:52 }}>
            <span className="section-chip" style={{ background:"rgba(252,211,77,0.1)", color:"var(--amber)",
              border:"1px solid rgba(252,211,77,0.28)", marginBottom:16, display:"inline-flex" }}>
              <Home size={11} /> Our Services
            </span>
            <h2 className="playfair" style={{ fontSize:"clamp(1.5rem,3.5vw,2.4rem)", color:"#fff",
              margin:"0 0 10px", letterSpacing:"-0.02em" }}>
              Specialized Care for{" "}
              <span style={{ color:"var(--amber)" }}>Every Need</span>
            </h2>
            <p style={{ color:"rgba(255,255,255,0.45)", fontSize:14, margin:0,
              maxWidth:400, marginInline:"auto" }}>
              From daily housekeeping to specialized elder care — the right professional for your home.
            </p>
          </div>

          <div className="services-grid" style={{ display:"grid",
            gridTemplateColumns:"repeat(auto-fill, minmax(260px,1fr))", gap:20 }}>
            {services.map(({ title, slug, description, image, Icon, badge }) => (
              <Link key={title} to={`/services/${slug}`} className="service-card"
                style={{ display:"block", textDecoration:"none" }}>
                <img src={image} alt={title} loading="lazy" decoding="async" />
                <div className="service-overlay" />
                <span className="service-badge">{badge}</span>
                <div style={{ position:"absolute", bottom:0, left:0, right:0, padding:22 }}>
                  <div style={{ width:36, height:36, borderRadius:10,
                    background:"rgba(252,211,77,0.16)", backdropFilter:"blur(10px)",
                    border:"1px solid rgba(252,211,77,0.28)",
                    display:"flex", alignItems:"center", justifyContent:"center", marginBottom:10 }}>
                    <Icon size={18} color="var(--amber)" />
                  </div>
                  <h3 style={{ color:"#fff", fontFamily:"'Playfair Display',serif", fontSize:16,
                    fontWeight:700, margin:"0 0 6px" }}>
                    {title}
                  </h3>
                  <p style={{ color:"rgba(255,255,255,0.62)", fontSize:12, lineHeight:1.65, margin:"0 0 10px" }}>
                    {description}
                  </p>
                  <span style={{ display:"inline-flex", alignItems:"center", gap:4,
                    color:"var(--amber)", fontSize:12, fontWeight:600 }}>
                    Learn More <ChevronRight size={13} />
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── WHY US ── */}
      <section id="why" style={{ background:"var(--teal-ghost)", padding:"88px 0" }}>
        <div style={{ maxWidth:1280, margin:"0 auto", padding:"0 24px" }}>
          <div style={{ textAlign:"center", marginBottom:60 }}>
            <span className="section-chip" style={{ background:"var(--teal)", color:"var(--amber)",
              marginBottom:14, display:"inline-flex" }}>
              <Award size={11} /> Why Choose Us
            </span>
            <h2 className="playfair" style={{ fontSize:"clamp(1.5rem,3.5vw,2.4rem)", color:"var(--ink)",
              margin:"0 0 10px", letterSpacing:"-0.02em" }}>
              Singapore's Most Trusted{" "}
              <span style={{ color:"var(--teal)" }}>Maid Agency</span>
            </h2>
            <p style={{ color:"#5A8C9A", fontSize:14, margin:0, maxWidth:400, marginInline:"auto" }}>
              We go beyond placement — ensuring you and your helper thrive together.
            </p>
          </div>

          <div className="why-grid" style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:52, alignItems:"center" }}>
            {/* Image */}
            <div className="why-img-col" style={{ position:"relative" }}>
              <div className="why-frame" style={{ zIndex:1 }}>
                <img src={familyImg} alt="Happy family" loading="lazy" decoding="async"
                  style={{ width:"100%", objectFit:"cover", display:"block",
                    height:"clamp(280px,38vw,440px)" }} />
                <div style={{ position:"absolute", bottom:0, left:0, right:0, height:"45%",
                  background:"linear-gradient(to top, rgba(10,40,48,0.78) 0%, transparent 100%)" }} />
                <div style={{ position:"absolute", bottom:24, left:24, right:24 }}>
                  <div style={{ display:"flex", gap:6, alignItems:"center" }}>
                    {[...Array(5)].map((_,i) => (
                      <Star key={i} size={14} fill="var(--amber)" color="var(--amber)" />
                    ))}
                    <span className="playfair" style={{ fontWeight:700, fontSize:13, color:"var(--amber)" }}>
                      4.9
                    </span>
                  </div>
                  <p style={{ color:"rgba(255,255,255,0.68)", fontSize:12, margin:"4px 0 0" }}>
                    2,500+ satisfied families
                  </p>
                </div>
              </div>
              {/* Year badge */}
              <div style={{ position:"absolute", top:-18, right:-22, borderRadius:14,
                padding:"16px 20px",
                background:"linear-gradient(135deg, var(--amber), var(--amber-dark))",
                boxShadow:"0 12px 36px rgba(252,211,77,0.4), 0 4px 0 var(--amber-deep)", zIndex:2 }}>
                <p className="playfair" style={{ fontSize:36, fontWeight:900, color:"var(--ink)",
                  margin:0, lineHeight:1 }}>15+</p>
                <p style={{ fontSize:10, color:"#4A3200", margin:"4px 0 0",
                  fontWeight:700, lineHeight:1.3 }}>
                  Years of Excellence<br />in Domestic Care
                </p>
              </div>
            </div>

            {/* Feature list */}
            <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
              {features.map(({ Icon, title, description, stat, statLabel }) => (
                <div key={title} className="feature-card">
                  <div style={{ width:48, height:48, borderRadius:14, flexShrink:0,
                    display:"flex", alignItems:"center", justifyContent:"center",
                    background:"var(--teal)", boxShadow:"0 4px 0 rgba(14,78,94,0.35)" }}>
                    <Icon size={22} color="var(--amber)" />
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ display:"flex", alignItems:"flex-start",
                      justifyContent:"space-between", gap:12, marginBottom:8 }}>
                      <h3 style={{ fontFamily:"'Inter',sans-serif", fontSize:14, fontWeight:700,
                        color:"var(--ink)", margin:0 }}>
                        {title}
                      </h3>
                      <div style={{ textAlign:"right", flexShrink:0 }}>
                        <p className="playfair" style={{ fontSize:22, fontWeight:900,
                          color:"var(--teal)", margin:0, lineHeight:1 }}>
                          {stat}
                        </p>
                        <p style={{ fontSize:9, color:"#8FB8C2", margin:"3px 0 0",
                          fontWeight:600, textTransform:"uppercase", letterSpacing:"0.06em" }}>
                          {statLabel}
                        </p>
                      </div>
                    </div>
                    <p style={{ fontSize:13, color:"#5A8C9A", lineHeight:1.7, margin:0 }}>
                      {description}
                    </p>
                  </div>
                </div>
              ))}

              {/* CTA card */}
              <div style={{ borderRadius:16, padding:26,
                background:"linear-gradient(130deg, var(--teal) 0%, var(--teal-mid) 100%)",
                border:"1.5px solid rgba(252,211,77,0.2)", position:"relative", overflow:"hidden" }}>
                <div style={{ position:"absolute", top:-40, right:-40, width:140, height:140,
                  borderRadius:"50%",
                  background:"radial-gradient(circle, rgba(252,211,77,0.12) 0%, transparent 70%)",
                  pointerEvents:"none" }} />
                <p style={{ fontFamily:"'Playfair Display',serif", fontWeight:700, fontSize:16,
                  color:"#fff", margin:"0 0 8px" }}>
                  Ready to find your perfect helper?
                </p>
                <p style={{ color:"rgba(255,255,255,0.55)", fontSize:13, lineHeight:1.7, margin:"0 0 18px" }}>
                  Browse 500+ verified profiles or speak with our placement specialists today.
                </p>
                <div style={{ display:"flex", gap:10, flexWrap:"wrap" }}>
                  <button className="btn-amber" onClick={() => navigate(searchMaidsHref)}
                    style={{ padding:"11px 20px", fontSize:12 }}>
                    <Users size={13} /> Browse Helpers
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>


      {/* ── FOOTER ── */}
        <footer style={{ background: "var(--ink)", padding: "64px 0 0" }}>
          <div style={{ maxWidth: 1280, margin: "0 auto", padding: "0 24px" }}>
            <div className="footer-grid" style={{
              display: "grid",
              gridTemplateColumns: "1.4fr 1fr 1.2fr 1.2fr 0.8fr",
              gap: 36,
              marginBottom: 48,
            }}>

              {/* Brand */}
              <div>
                <h4 className="playfair" style={{ fontSize: 17, fontWeight: 700, color: "#fff", margin: "0 0 12px" }}>
                  "Find Maids" At The Agency
                </h4>
                <p style={{ fontSize: 13, color: "rgba(255,255,255,0.7)", lineHeight: 1.7, margin: 0 }}>
                  Matching trusted domestic professionals with families since 2009.
                </p>
              </div>

              {/* Quick Links */}
              <div>
                <h5 style={{ fontSize: 11, fontWeight: 700, color: "#fff", letterSpacing: "0.1em",
                  textTransform: "uppercase", margin: "0 0 16px", fontFamily: "'Inter',sans-serif" }}>
                  Quick Links
                </h5>
                <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 10 }}>
                  {[
                    { label: "Home",         to: "/"             },
                    { label: "Search Maids", to: "/search-maids" },
                    { label: "About Us",     to: "/about"        },
                    { label: "Agency",       to: "/agency"       },
                    { label: "Enquiry",      to: "/enquiry2"     },
                    { label: "FAQ",          to: "/faq"          },
                  ].map((item) => (
                    <li key={item.to}>
                      <Link to={item.to}
                        style={{ color: "#fff", fontSize: 13, textDecoration: "none",
                          transition: "color 0.15s", fontFamily: "'Inter',sans-serif" }}
                        onMouseEnter={(e) => (e.currentTarget.style.color = "var(--amber)")}
                        onMouseLeave={(e) => (e.currentTarget.style.color = "#fff")}>
                        {item.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Contact Us */}
              <div>
                <h5 style={{ fontSize: 11, fontWeight: 700, color: "#fff", letterSpacing: "0.1em",
                  textTransform: "uppercase", margin: "0 0 16px", fontFamily: "'Inter',sans-serif" }}>
                  Contact Us
                </h5>
                <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 10,
                  fontSize: 13, color: "#fff", fontFamily: "'Inter',sans-serif", lineHeight: 1.6 }}>
                  <li style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                    <MapPin size={16} color="var(--amber)" style={{ flexShrink: 0, marginTop: 2 }} />
                    <span>3 Jalan Kukoh, #01-115<br />Singapore 161003</span>
                  </li>
                  <li style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <Mail size={16} color="var(--amber)" style={{ flexShrink: 0 }} />
                    <a href="mailto:enquiries.j1@gmail.com"
                      style={{ color: "#fff", textDecoration: "none", transition: "color 0.15s" }}
                      onMouseEnter={(e) => (e.currentTarget.style.color = "var(--amber)")}
                      onMouseLeave={(e) => (e.currentTarget.style.color = "#fff")}>
                      enquiries.j1@gmail.com
                    </a>
                  </li>
                  <li style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <Phone size={16} color="var(--amber)" style={{ flexShrink: 0 }} />
                    <a href="tel:+6580730757"
                      style={{ color: "#fff", textDecoration: "none", transition: "color 0.15s" }}
                      onMouseEnter={(e) => (e.currentTarget.style.color = "var(--amber)")}
                      onMouseLeave={(e) => (e.currentTarget.style.color = "#fff")}>
                      8073 0757
                    </a>
                  </li>
                </ul>
              </div>

              {/* Opening Hours */}
              <div>
                <h5 style={{ fontSize: 11, fontWeight: 700, color: "#fff", letterSpacing: "0.1em",
                  textTransform: "uppercase", margin: "0 0 16px", fontFamily: "'Inter',sans-serif" }}>
                  Opening Hours
                </h5>
                <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 10,
                  fontSize: 13, color: "#fff", fontFamily: "'Inter',sans-serif", lineHeight: 1.6 }}>
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
                <h5 style={{ fontSize: 11, fontWeight: 700, color: "#fff", letterSpacing: "0.1em",
                  textTransform: "uppercase", margin: "0 0 16px", fontFamily: "'Inter',sans-serif" }}>
                  Follow Us
                </h5>
                <div style={{ display: "flex", gap: 10 }}>
                  <a href="#" aria-label="Facebook"
                    style={{ display: "flex", alignItems: "center", justifyContent: "center",
                      width: 36, height: 36, borderRadius: 8,
                      border: "1.5px solid rgba(255,255,255,0.18)",
                      color: "#1877F2", transition: "all 0.15s" }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.color = "var(--ink)";
                      e.currentTarget.style.background = "#1877F2";
                      e.currentTarget.style.borderColor = "#1877F2";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.color = "#1877F2";
                      e.currentTarget.style.background = "transparent";
                      e.currentTarget.style.borderColor = "rgba(255,255,255,0.18)";
                    }}>
                    <Facebook size={18} />
                  </a>
                </div>
              </div>
            </div>

            {/* Bottom bar */}
            <div style={{ borderTop: "1px solid rgba(255,255,255,0.1)", padding: "20px 0",
              display: "flex", alignItems: "center", justifyContent: "space-between",
              flexWrap: "wrap", gap: 12 }}>
              <p style={{ fontSize: 12, color: "#fff", margin: 0, fontFamily: "'Inter',sans-serif" }}>
                © 2026 "Find Maids" At The Agency. All rights reserved.
              </p>
              <div style={{ display: "flex", gap: 6 }}>
                {["Privacy", "Terms", "Contact"].map((item) => (
                  <Link key={item} to="/contact"
                    style={{ fontSize: 12, color: "#fff", textDecoration: "none",
                      padding: "0 8px", fontFamily: "'Inter',sans-serif", transition: "color 0.15s" }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = "var(--amber)")}
                    onMouseLeave={(e) => (e.currentTarget.style.color = "#fff")}>
                    {item}
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </footer>
    </div>
  );
};

export default ClientLandingPage;