import { Link } from "react-router-dom";
import { ChevronRight, MapPin, Mail, Phone, Clock, MessageCircle, PhoneCall, Facebook, } from "lucide-react";
import PublicSiteNavbar from "@/components/PublicSiteNavbar";



type AboutUsProps = {
  embedded?: boolean;
};

const AboutUs = ({ embedded = false }: AboutUsProps) => {
  return (
    <div className="au-root">
      {!embedded && <PublicSiteNavbar />}

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300;0,9..144,600;0,9..144,700;0,9..144,900;1,9..144,300;1,9..144,600;1,9..144,700&family=Inter:wght@300;400;500;600&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        .au-root {
          --teal:       #0E4E5E;
          --teal-dk:    #092F3A;
          --teal-mid:   #1A6880;
          --teal-lt:    #C8E8EF;
          --amber:      #FCD34D;
          --amber-dk:   #E8B800;
          --amber-pale: #FFFAE8;
          --white:      #FFFFFF;
          --off:        #F7F9FA;
          --ink:        #0D1E24;
          --text:       #2A3C42;
          --muted:      #5C7A84;
          --faint:      #A0B5BC;
          --rule:       #D6E6EA;
          font-family: 'Inter', sans-serif;
          color: var(--text);
          background: var(--white);
          min-height: 100vh;
          display: flex;
          flex-direction: column;
        }

        /* ══════════════════════════════════════════
           HERO
        ══════════════════════════════════════════ */
        .au-hero {
          background: var(--teal);
          position: relative;
          overflow: hidden;
        }

        /* diagonal stripe texture */
        .au-hero::before {
          content: '';
          position: absolute;
          inset: 0;
          background-image: repeating-linear-gradient(
            -55deg,
            transparent 0px,
            transparent 28px,
            rgba(255,255,255,0.025) 28px,
            rgba(255,255,255,0.025) 29px
          );
          pointer-events: none;
        }

        .au-hero-layout {
          display: grid;
          grid-template-columns: 1fr 380px;
          min-height: 620px;
          max-width: 1140px;
          margin: 0 auto;
          padding: 0 2rem;
          position: relative;
          z-index: 1;
        }
        @media (max-width: 860px) {
          .au-hero-layout { grid-template-columns: 1fr; min-height: auto; }
        }

        .au-hero-left {
          padding: 5.5rem 3rem 5.5rem 0;
          display: flex;
          flex-direction: column;
          justify-content: center;
        }
        @media (max-width: 860px) {
          .au-hero-left { padding: 4rem 0 2rem; }
        }

        .au-pill {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          background: rgba(252,211,77,0.15);
          border: 1px solid rgba(252,211,77,0.35);
          border-radius: 100px;
          padding: 0.35rem 0.9rem;
          font-size: 0.7rem;
          font-weight: 600;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: var(--amber);
          margin-bottom: 1.75rem;
          width: fit-content;
        }
        .au-pill-dot {
          width: 5px;
          height: 5px;
          border-radius: 50%;
          background: var(--amber);
          flex-shrink: 0;
        }

        .au-hero-h1 {
          font-family: 'Fraunces', serif;
          font-size: clamp(2.8rem, 5.5vw, 4.4rem);
          font-weight: 900;
          line-height: 1.04;
          color: var(--white);
          letter-spacing: -0.03em;
          margin-bottom: 1.75rem;
        }
        .au-hero-h1 .hi {
          color: var(--amber);
          font-style: italic;
        }
        .au-hero-h1 .ul-wrap {
          position: relative;
          display: inline-block;
        }
        .au-hero-h1 .ul-wrap::after {
          content: '';
          position: absolute;
          left: 0;
          bottom: -4px;
          width: 100%;
          height: 3px;
          background: var(--amber);
          border-radius: 2px;
        }

        .au-hero-sub {
          color: rgba(255,255,255,0.58);
          font-size: 1rem;
          line-height: 1.85;
          max-width: 500px;
          margin-bottom: 2.5rem;
          font-weight: 300;
        }

        .au-hero-actions {
          display: flex;
          align-items: center;
          gap: 1rem;
          flex-wrap: wrap;
        }

        .au-btn-amber {
          display: inline-flex;
          align-items: center;
          gap: 0.4rem;
          background: var(--amber);
          color: var(--teal-dk);
          padding: 0.8rem 1.6rem;
          border-radius: 6px;
          font-size: 0.8rem;
          font-weight: 700;
          letter-spacing: 0.05em;
          text-transform: uppercase;
          text-decoration: none;
          border: none;
          cursor: pointer;
          transition: background 0.2s, transform 0.15s;
          white-space: nowrap;
        }
        .au-btn-amber:hover { background: var(--amber-dk); transform: translateY(-1px); }

        .au-btn-ghost-light {
          display: inline-flex;
          align-items: center;
          gap: 0.4rem;
          background: transparent;
          color: rgba(255,255,255,0.65);
          padding: 0.8rem 1.5rem;
          border-radius: 6px;
          font-size: 0.8rem;
          font-weight: 500;
          text-decoration: none;
          border: 1px solid rgba(255,255,255,0.2);
          cursor: pointer;
          transition: border-color 0.2s, color 0.2s;
          white-space: nowrap;
        }
        .au-btn-ghost-light:hover { border-color: rgba(255,255,255,0.5); color: var(--white); }

        /* stats panel */
        .au-hero-right {
          display: flex;
          align-items: center;
          padding: 3rem 0 3rem 2.5rem;
          border-left: 1px solid rgba(255,255,255,0.08);
        }
        @media (max-width: 860px) {
          .au-hero-right { display: none; }
        }

        .au-stats-panel {
          width: 100%;
        }
        .au-stats-kicker {
          font-size: 0.65rem;
          font-weight: 700;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          color: rgba(255,255,255,0.35);
          margin-bottom: 1.5rem;
        }
        .au-stat-row {
          display: flex;
          gap: 1.5rem;
          margin-bottom: 1.5rem;
        }
        .au-stat {
          flex: 1;
        }
        .au-stat-num {
          font-family: 'Fraunces', serif;
          font-size: 2.6rem;
          font-weight: 700;
          color: var(--white);
          line-height: 1;
          letter-spacing: -0.04em;
        }
        .au-stat-num span {
          color: var(--amber);
        }
        .au-stat-lbl {
          font-size: 0.72rem;
          color: rgba(255,255,255,0.4);
          text-transform: uppercase;
          letter-spacing: 0.08em;
          margin-top: 0.35rem;
        }
        .au-stat-divider {
          height: 1px;
          background: rgba(255,255,255,0.08);
          margin-bottom: 1.5rem;
        }
        .au-panel-note {
          font-size: 0.78rem;
          color: rgba(255,255,255,0.38);
          line-height: 1.65;
          padding: 1rem 1.25rem;
          background: rgba(255,255,255,0.04);
          border-radius: 8px;
          border-left: 3px solid rgba(252,211,77,0.4);
        }

        /* ══════════════════════════════════════════
           NATIONALITY STRIP
        ══════════════════════════════════════════ */
        .au-strip {
          background: var(--amber);
          padding: 0.75rem 2rem;
          display: flex;
          align-items: center;
          gap: 1.5rem;
          overflow-x: auto;
          scrollbar-width: none;
        }
        .au-strip::-webkit-scrollbar { display: none; }
        .au-strip-label {
          font-size: 0.65rem;
          font-weight: 700;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          color: rgba(14,78,94,0.6);
          white-space: nowrap;
          flex-shrink: 0;
        }
        .au-strip-pipe {
          width: 1px;
          height: 14px;
          background: rgba(14,78,94,0.25);
          flex-shrink: 0;
        }
        .au-strip-items {
          display: flex;
          gap: 0.4rem;
          flex-shrink: 0;
        }
        .au-strip-tag {
          background: rgba(14,78,94,0.12);
          color: var(--teal-dk);
          font-size: 0.75rem;
          font-weight: 600;
          padding: 0.3rem 0.85rem;
          border-radius: 100px;
          white-space: nowrap;
        }

        /* ══════════════════════════════════════════
           SHARED LAYOUT
        ══════════════════════════════════════════ */
        .au-wrap {
          max-width: 1140px;
          margin: 0 auto;
          padding: 0 2rem;
          width: 100%;
        }

        /* ══════════════════════════════════════════
           STORY SECTION
        ══════════════════════════════════════════ */
        .au-story {
          padding: 6rem 0;
          background: var(--white);
        }
        .au-story-grid {
          display: grid;
          grid-template-columns: 1fr 400px;
          gap: 5rem;
          align-items: start;
        }
        @media (max-width: 860px) {
          .au-story-grid { grid-template-columns: 1fr; gap: 3rem; }
        }

        .au-eyebrow {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          font-size: 0.68rem;
          font-weight: 700;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          color: var(--teal);
          margin-bottom: 1rem;
        }
        .au-eyebrow::before {
          content: '';
          width: 2rem;
          height: 2px;
          background: var(--amber);
          flex-shrink: 0;
        }

        .au-h2 {
          font-family: 'Fraunces', serif;
          font-size: clamp(2rem, 3.5vw, 2.9rem);
          font-weight: 700;
          line-height: 1.12;
          color: var(--ink);
          letter-spacing: -0.025em;
          margin-bottom: 1.5rem;
        }
        .au-h2 em {
          font-style: italic;
          color: var(--teal);
        }

        .au-body p {
          color: var(--muted);
          font-size: 0.9375rem;
          line-height: 1.9;
          font-weight: 300;
          margin-bottom: 1.1rem;
        }
        .au-body strong { color: var(--text); font-weight: 600; }

        .au-pullquote {
          margin-top: 2rem;
          padding: 1.5rem 1.75rem;
          background: var(--amber-pale);
          border-left: 4px solid var(--amber);
          border-radius: 0 10px 10px 0;
        }
        .au-pullquote p {
          font-family: 'Fraunces', serif;
          font-size: 1.15rem;
          font-style: italic;
          color: var(--teal-dk);
          margin: 0;
          line-height: 1.55;
        }

        /* card on story right */
        .au-origin-card {
          background: var(--teal);
          border-radius: 18px;
          overflow: hidden;
          position: sticky;
          top: 1.5rem;
        }
        .au-oc-head {
          padding: 1.75rem 2rem 1.5rem;
          position: relative;
          overflow: hidden;
          background: var(--teal-dk);
        }
        .au-oc-head::after {
          content: '';
          position: absolute;
          right: -30px;
          top: -30px;
          width: 100px;
          height: 100px;
          border-radius: 50%;
          background: rgba(252,211,77,0.12);
        }
        .au-oc-head-title {
          font-family: 'Fraunces', serif;
          font-size: 1.15rem;
          font-weight: 700;
          color: var(--white);
          margin-bottom: 0.25rem;
          position: relative;
          z-index: 1;
        }
        .au-oc-head-sub {
          font-size: 0.75rem;
          color: rgba(255,255,255,0.45);
          position: relative;
          z-index: 1;
        }
        .au-oc-list {}
        .au-oc-item {
          display: flex;
          align-items: center;
          gap: 0.85rem;
          padding: 0.85rem 2rem;
          font-size: 0.875rem;
          color: rgba(255,255,255,0.75);
          border-bottom: 1px solid rgba(255,255,255,0.06);
          transition: background 0.15s;
        }
        .au-oc-item:hover { background: rgba(255,255,255,0.04); }
        .au-oc-item:last-child { border-bottom: none; }
        .au-oc-bullet {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: var(--amber);
          flex-shrink: 0;
          opacity: 0.85;
        }
        .au-oc-foot {
          padding: 1.5rem 2rem;
          background: rgba(0,0,0,0.15);
          border-top: 1px solid rgba(255,255,255,0.06);
        }
        .au-oc-foot p {
          font-size: 0.78rem;
          color: rgba(255,255,255,0.4);
          margin-bottom: 0.875rem;
        }
        .au-btn-amber-sm {
          display: inline-flex;
          align-items: center;
          gap: 0.35rem;
          background: var(--amber);
          color: var(--teal-dk);
          padding: 0.6rem 1.1rem;
          border-radius: 5px;
          font-size: 0.75rem;
          font-weight: 700;
          letter-spacing: 0.05em;
          text-transform: uppercase;
          text-decoration: none;
          border: none;
          cursor: pointer;
          transition: background 0.2s;
        }
        .au-btn-amber-sm:hover { background: var(--amber-dk); }

        /* ══════════════════════════════════════════
           PLACEMENTS
        ══════════════════════════════════════════ */
        .au-placements {
          padding: 6rem 0;
          background: var(--off);
        }
        .au-pl-header {
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          gap: 2rem;
          margin-bottom: 3rem;
          flex-wrap: wrap;
        }
        .au-pl-header-left {}
        .au-pl-header-sub {
          color: var(--muted);
          font-size: 0.9375rem;
          max-width: 380px;
          line-height: 1.75;
          font-weight: 300;
          margin-top: 0.5rem;
        }

        .au-pl-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 1.25rem;
          margin-bottom: 1.5rem;
        }
        @media (max-width: 800px) {
          .au-pl-grid { grid-template-columns: 1fr 1fr; }
        }
        @media (max-width: 500px) {
          .au-pl-grid { grid-template-columns: 1fr; }
        }

        .au-pl-card {
          background: var(--white);
          border-radius: 14px;
          overflow: hidden;
          border: 1px solid var(--rule);
          transition: box-shadow 0.25s, transform 0.2s;
        }
        .au-pl-card:hover {
          box-shadow: 0 14px 40px rgba(14,78,94,0.1);
          transform: translateY(-3px);
        }
        .au-pl-card-bar { height: 5px; }
        .au-pl-card-body { padding: 1.5rem; }
        .au-pl-tag {
          display: inline-block;
          font-size: 0.65rem;
          font-weight: 700;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          padding: 0.28rem 0.7rem;
          border-radius: 100px;
          margin-bottom: 1rem;
        }
        .au-pl-region {
          font-family: 'Fraunces', serif;
          font-size: 1.05rem;
          font-weight: 700;
          color: var(--ink);
          margin-bottom: 1rem;
        }
        .au-pl-list { list-style: none; padding: 0; }
        .au-pl-list li {
          display: flex;
          align-items: center;
          gap: 0.65rem;
          padding: 0.42rem 0;
          font-size: 0.84rem;
          color: var(--muted);
          border-bottom: 1px solid var(--off);
        }
        .au-pl-list li:last-child { border-bottom: none; }
        .au-pl-dot {
          width: 5px;
          height: 5px;
          border-radius: 50%;
          flex-shrink: 0;
        }

        .au-cta-band {
          background: var(--teal-dk);
          border-radius: 14px;
          padding: 1.75rem 2.25rem;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 1.5rem;
          flex-wrap: wrap;
        }
        .au-cta-band p {
          font-size: 0.9375rem;
          color: rgba(255,255,255,0.65);
          margin: 0;
          line-height: 1.65;
          font-weight: 300;
        }
        .au-cta-band strong { color: var(--white); font-weight: 600; }

        /* ══════════════════════════════════════════
           WHY US (VALUES)
        ══════════════════════════════════════════ */
        .au-why {
          padding: 6rem 0;
          background: var(--white);
        }
        .au-why-grid {
          display: grid;
          grid-template-columns: 400px 1fr;
          gap: 5rem;
          align-items: start;
        }
        @media (max-width: 860px) {
          .au-why-grid { grid-template-columns: 1fr; gap: 3rem; }
        }

        .au-why-lede {
          font-family: 'Fraunces', serif;
          font-size: clamp(1.7rem, 3.2vw, 2.5rem);
          font-weight: 700;
          line-height: 1.15;
          color: var(--ink);
          letter-spacing: -0.025em;
          margin-bottom: 1.25rem;
        }
        .au-why-lede em { font-style: italic; color: var(--teal); }
        .au-why-body {
          color: var(--muted);
          font-size: 0.9375rem;
          line-height: 1.85;
          font-weight: 300;
          margin-bottom: 1.75rem;
        }
        .au-online-badge {
          display: inline-flex;
          align-items: center;
          gap: 0.65rem;
          background: #E8F6F9;
          border: 1px solid #A8D4DC;
          border-radius: 8px;
          padding: 0.75rem 1.1rem;
        }
        .au-online-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #0E9ABF;
          box-shadow: 0 0 0 3px rgba(14,154,191,0.2);
          flex-shrink: 0;
        }
        .au-online-text {
          font-size: 0.8rem;
          color: var(--teal);
          font-weight: 600;
        }

        .au-cards-2x2 {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1.1rem;
        }
        @media (max-width: 480px) {
          .au-cards-2x2 { grid-template-columns: 1fr; }
        }
        .au-vcard {
          border-radius: 14px;
          padding: 1.6rem;
          border: 1px solid var(--rule);
          transition: box-shadow 0.25s, transform 0.2s;
          position: relative;
          overflow: hidden;
        }
        .au-vcard:hover {
          box-shadow: 0 10px 32px rgba(14,78,94,0.09);
          transform: translateY(-2px);
        }
        .au-vcard::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 3px;
          border-radius: 14px 14px 0 0;
        }
        .au-vcard-ico {
          width: 38px;
          height: 38px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 1rem;
          font-size: 1.2rem;
        }
        .au-vcard-title {
          font-family: 'Fraunces', serif;
          font-size: 1rem;
          font-weight: 700;
          color: var(--ink);
          margin-bottom: 0.4rem;
        }
        .au-vcard-desc {
          font-size: 0.82rem;
          color: var(--muted);
          line-height: 1.7;
        }

        /* ══════════════════════════════════════════
           INTL BANNER
        ══════════════════════════════════════════ */
        .au-intl {
          padding: 0 0 6rem;
          background: var(--white);
        }
        .au-intl-inner {
          background: var(--teal);
          border-radius: 22px;
          padding: 4rem;
          display: grid;
          grid-template-columns: 1fr auto;
          gap: 3rem;
          align-items: center;
          position: relative;
          overflow: hidden;
        }
        @media (max-width: 680px) {
          .au-intl-inner { grid-template-columns: 1fr; padding: 2.5rem 2rem; }
        }
        .au-intl-bg {
          position: absolute;
          inset: 0;
          background-image:
            radial-gradient(ellipse at 90% 50%, rgba(252,211,77,0.12) 0%, transparent 55%),
            radial-gradient(ellipse at 10% 90%, rgba(255,255,255,0.04) 0%, transparent 40%);
          pointer-events: none;
        }
        /* big decorative text */
        .au-intl-bg-word {
          position: absolute;
          bottom: -0.5rem;
          right: -0.5rem;
          font-family: 'Fraunces', serif;
          font-size: 9rem;
          font-weight: 700;
          font-style: italic;
          color: rgba(255,255,255,0.04);
          line-height: 1;
          pointer-events: none;
          user-select: none;
        }
        .au-intl-kicker {
          display: flex;
          align-items: center;
          gap: 0.45rem;
          font-size: 0.68rem;
          font-weight: 700;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          color: var(--amber);
          margin-bottom: 0.875rem;
          position: relative;
          z-index: 1;
        }
        .au-intl-title {
          font-family: 'Fraunces', serif;
          font-size: clamp(1.6rem, 3vw, 2.2rem);
          font-weight: 700;
          color: var(--white);
          line-height: 1.18;
          margin-bottom: 0.875rem;
          position: relative;
          z-index: 1;
        }
        .au-intl-desc {
          color: rgba(255,255,255,0.6);
          font-size: 0.9375rem;
          line-height: 1.8;
          max-width: 480px;
          font-weight: 300;
          position: relative;
          z-index: 1;
        }
        .au-intl-desc strong { color: rgba(255,255,255,0.9); font-weight: 600; }
        .au-intl-action { position: relative; z-index: 1; flex-shrink: 0; }
        .au-btn-outline-amber {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          border: 2px solid var(--amber);
          color: var(--amber);
          padding: 0.9rem 1.75rem;
          border-radius: 8px;
          font-size: 0.8rem;
          font-weight: 700;
          letter-spacing: 0.04em;
          text-transform: uppercase;
          text-decoration: none;
          white-space: nowrap;
          transition: background 0.2s, color 0.2s;
        }
        .au-btn-outline-amber:hover {
          background: var(--amber);
          color: var(--teal-dk);
        }

        /* ══════════════════════════════════════════
           FOOTER
        ══════════════════════════════════════════ */
        .au-footer {
          background: var(--teal-dk);
          padding: 4.5rem 0 2rem;
          color: rgba(255,255,255,0.55);
        }
        .au-footer-grid {
          display: grid;
          grid-template-columns: 2fr 1fr 1fr 1.5fr;
          gap: 3rem;
          margin-bottom: 3.5rem;
        }
        @media (max-width: 820px) {
          .au-footer-grid { grid-template-columns: 1fr 1fr; }
        }
        @media (max-width: 480px) {
          .au-footer-grid { grid-template-columns: 1fr; }
        }
        .au-footer-brand {
          font-family: 'Fraunces', serif;
          font-size: 1.25rem;
          font-weight: 700;
          color: var(--white);
          margin-bottom: 0.7rem;
          letter-spacing: -0.02em;
        }
        .au-footer-tagline {
          font-size: 0.85rem;
          line-height: 1.75;
          margin-bottom: 1.25rem;
        }
        .au-footer-accent {
          display: inline-block;
          width: 28px;
          height: 3px;
          background: var(--amber);
          border-radius: 2px;
        }
        .au-footer-col-h {
          font-size: 0.65rem;
          font-weight: 700;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          color: rgba(255,255,255,0.3);
          margin-bottom: 1rem;
        }
        .au-footer-links { list-style: none; padding: 0; display: flex; flex-direction: column; gap: 0.6rem; }
        .au-footer-links a {
          font-size: 0.875rem;
          color: rgba(255,255,255,0.55);
          text-decoration: none;
          transition: color 0.2s;
        }
        .au-footer-links a:hover { color: var(--white); }
        .au-nl-row { display: flex; gap: 0.5rem; }
        .au-nl-row input {
          flex: 1;
          background: rgba(255,255,255,0.06);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 5px;
          padding: 0.65rem 0.875rem;
          font-size: 0.82rem;
          color: var(--white);
          outline: none;
          font-family: 'Inter', sans-serif;
          transition: border-color 0.2s;
          min-width: 0;
        }
        .au-nl-row input::placeholder { color: rgba(255,255,255,0.25); }
        .au-nl-row input:focus { border-color: rgba(252,211,77,0.5); }
        .au-nl-row button {
          background: var(--amber);
          color: var(--teal-dk);
          border: none;
          border-radius: 5px;
          padding: 0.65rem 1rem;
          font-size: 0.78rem;
          font-weight: 700;
          cursor: pointer;
          font-family: 'Inter', sans-serif;
          white-space: nowrap;
          transition: background 0.2s;
        }
        .au-nl-row button:hover { background: var(--amber-dk); }
        .au-footer-bottom {
          border-top: 1px solid rgba(255,255,255,0.07);
          padding-top: 1.75rem;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 1rem;
          flex-wrap: wrap;
        }
        .au-footer-copy { font-size: 0.78rem; color: rgba(255,255,255,0.28); }
        .au-footer-badge {
          display: inline-flex;
          align-items: center;
          gap: 0.4rem;
          font-size: 0.68rem;
          font-weight: 700;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: var(--amber);
          background: rgba(252,211,77,0.08);
          border: 1px solid rgba(252,211,77,0.2);
          padding: 0.3rem 0.8rem;
          border-radius: 100px;
        }
      `}</style>

      <main style={{ flex: 1 }}>

        {/* ── HERO ── */}
        <section className="au-hero">
          <div className="au-hero-layout">

            <div className="au-hero-left">
              <div className="au-pill">
                <span className="au-pill-dot" />
                Trusted Since 2005 · Singapore's Pioneer
              </div>
              <h1 className="au-hero-h1">
                Placing{" "}
                <span className="hi">trusted</span>
                <br />helpers in families
                <br />
                <span className="ul-wrap">worldwide.</span>
              </h1>
              <p className="au-hero-sub">
                Rinzin Agency specialises in carefully selected domestic helpers from North East India, the Philippines, Myanmar and beyond — matched to your family's unique needs.
              </p>
              <div className="au-hero-actions">
                <Link to="/search-maids" className="au-btn-amber">
                  Find a Helper <ChevronRight size={14} />
                </Link>
                <a href="#about-story" className="au-btn-ghost-light">
                  Our Story
                </a>
              </div>
            </div>

            <div className="au-hero-right">
              <div className="au-stats-panel">
                <div className="au-stats-kicker">Agency at a Glance</div>
                <div className="au-stat-row">
                  <div className="au-stat">
                    <div className="au-stat-num">2,000<span>+</span></div>
                    <div className="au-stat-lbl">Families Served</div>
                  </div>
                  <div className="au-stat">
                    <div className="au-stat-num">20<span>+</span></div>
                    <div className="au-stat-lbl">Years Active</div>
                  </div>
                </div>
                <div className="au-stat-divider" />
                <div className="au-stat-row">
                  <div className="au-stat">
                    <div className="au-stat-num">6<span>+</span></div>
                    <div className="au-stat-lbl">Source Countries</div>
                  </div>
                  <div className="au-stat">
                    <div className="au-stat-num">100<span>%</span></div>
                    <div className="au-stat-lbl">Verified</div>
                  </div>
                </div>
                <div className="au-stat-divider" />
                <div className="au-panel-note">
                  First agency to introduce helpers from Lahaul, Spiti &amp; Ladakh to Singapore families.
                </div>
              </div>
            </div>

          </div>
        </section>

        {/* ── STRIP ── */}
        <div className="au-strip">
          <span className="au-strip-label">We Place</span>
          <div className="au-strip-pipe" />
          <div className="au-strip-items">
            {["North East Indian", "Filipino", "Myanmar", "Nepalese", "Tibetan", "Punjabi", "Indonesian"].map((n) => (
              <span className="au-strip-tag" key={n}>{n}</span>
            ))}
          </div>
        </div>

        {/* ── STORY ── */}
        <section className="au-story" id="about-story">
          <div className="au-wrap">
            <div className="au-story-grid">

              <div>
                <div className="au-eyebrow">Our Story</div>
                <h2 className="au-h2">
                  A pioneer in<br /><em>North East Indian</em><br />domestic helpers
                </h2>
                <div className="au-body">
                  <p>In 2005, as a Singaporean Chinese who had traveled India far and wide, we became the <strong>first agency</strong> to introduce helpers from Lahaul and Spiti, Himachal Pradesh, and Ladakh to Singapore families.</p>
                  <p>RINZIN has been providing quality Indian, Filipino and Myanmar domestic helpers to Singapore families for over two decades, building a fresh team for an ever-wider choice of origin and background.</p>
                  <p>We deal with real people from different cultures. When problems arise, we face and solve them swiftly — every challenge has made us a better agency.</p>
                </div>
                <div className="au-pullquote">
                  <p>"The right worker, delivered on time."</p>
                </div>
              </div>

              <div className="au-origin-card">
                <div className="au-oc-head">
                  <div className="au-oc-head-title">North East Indian Specialists</div>
                  <div className="au-oc-head-sub">Our founding strength &amp; core expertise</div>
                </div>
                <div className="au-oc-list">
                  {[
                    "Darjeeling & Sikkim Maids",
                    "Nepalese – Hindu (Veg & Non-veg)",
                    "Tibetan – Buddhist",
                    "Manipur – English Speaking",
                    "Filipino – Video Interview Available",
                    "Myanmar Helpers",
                  ].map((item) => (
                    <div className="au-oc-item" key={item}>
                      <span className="au-oc-bullet" />
                      {item}
                    </div>
                  ))}
                </div>
                <div className="au-oc-foot">
                  <p>Interested in a specific region or background?</p>
                  <Link to="/enquiry2" className="au-btn-amber-sm">
                    Enquire Now <ChevronRight size={12} />
                  </Link>
                </div>
              </div>

            </div>
          </div>
        </section>

        {/* ── PLACEMENTS ── */}
        <section className="au-placements">
          <div className="au-wrap">
            <div className="au-pl-header">
              <div className="au-pl-header-left">
                <div className="au-eyebrow">Placement Origins</div>
                <h2 className="au-h2" style={{ marginBottom: 0 }}>
                  New &amp; Transfer<br /><em>Foreign Domestic Helpers</em>
                </h2>
                <p className="au-pl-header-sub">
                  Six source countries, matched by culture, language, and dietary preference.
                </p>
              </div>
            </div>

            <div className="au-pl-grid">
              {[
                {
                  bar: "#0E4E5E",
                  tagBg: "#E0EFF2",
                  tagColor: "#0E4E5E",
                  dot: "#0E4E5E",
                  tag: "North East Indian",
                  region: "India & Himalayan Region",
                  items: ["Darjeeling & Sikkim", "Nepalese – Hindu", "Tibetan – Buddhist", "Manipur – Christian"],
                },
                {
                  bar: "#FCD34D",
                  tagBg: "#FFFAE8",
                  tagColor: "#8A6E00",
                  dot: "#C9A000",
                  tag: "Southeast Asian",
                  region: "Philippines & Myanmar",
                  items: ["Filipino – Video Interview", "Myanmar – Fresh & Transfer", "Indonesian (Selective)", "South Indian"],
                },
                {
                  bar: "#1A6880",
                  tagBg: "#EAF4F7",
                  tagColor: "#1A5C70",
                  dot: "#1A6880",
                  tag: "Selective Placements",
                  region: "Extended Origins",
                  items: ["Punjabi", "Lahaul & Spiti", "Himachal Pradesh", "Ladakh"],
                },
              ].map(({ bar, tagBg, tagColor, dot, tag, region, items }) => (
                <div className="au-pl-card" key={tag}>
                  <div className="au-pl-card-bar" style={{ background: bar }} />
                  <div className="au-pl-card-body">
                    <div className="au-pl-tag" style={{ background: tagBg, color: tagColor }}>{tag}</div>
                    <div className="au-pl-region">{region}</div>
                    <ul className="au-pl-list">
                      {items.map((i) => (
                        <li key={i}>
                          <span className="au-pl-dot" style={{ background: dot }} />
                          {i}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              ))}
            </div>

            <div className="au-cta-band">
              <p>Have a specific language or culture preference? <strong>We'll shortlist the right candidates for you.</strong></p>
              <Link to="/enquiry2" className="au-btn-amber-sm">
                Get Started <ChevronRight size={13} />
              </Link>
            </div>
          </div>
        </section>

        {/* ── WHY US ── */}
        <section className="au-why">
          <div className="au-wrap">
            <div className="au-why-grid">

              <div>
                <div className="au-eyebrow">Why Rinzin</div>
                <h2 className="au-why-lede">
                  We're <em>different.</em><br />Call us and<br />find out.
                </h2>
                <p className="au-why-body">
                  Our crisis management team is reachable via SMS to ensure placing a helper with us is completely stress-free. We are result-oriented and driven to match you with the best candidate.
                </p>
                <div className="au-online-badge">
                  <span className="au-online-dot" />
                  <span className="au-online-text">SMS Crisis Support — always on standby</span>
                </div>
              </div>

              <div className="au-cards-2x2">
                {[
                  {
                    emoji: "🛡️",
                    title: "Verified & Screened",
                    desc: "Every helper is personally vetted, including video interviews for Filipino candidates.",
                    bg: "#F0F8FA",
                    accent: "#0E4E5E",
                  },
                  {
                    emoji: "🤝",
                    title: "Cultural Matching",
                    desc: "We match language, diet and religious background for a harmonious household.",
                    bg: "#FFFAE8",
                    accent: "#FCD34D",
                  },
                  {
                    emoji: "💬",
                    title: "SMS Crisis Support",
                    desc: "Dedicated team on standby — any issue resolved swiftly and personally.",
                    bg: "#EAF4F7",
                    accent: "#1A6880",
                  },
                  {
                    emoji: "🏆",
                    title: "Pioneer Since 2005",
                    desc: "First to bring helpers from Lahaul, Spiti and Ladakh to Singapore families.",
                    bg: "#F5F0FA",
                    accent: "#7A3A9A",
                  },
                ].map(({ emoji, title, desc, bg, accent }) => (
                  <div className="au-vcard" key={title} style={{ background: bg }}>
                    <div
                      className="au-vcard"
                      style={{
                        background: bg,
                        border: `1px solid ${accent}18`,
                        borderTop: `3px solid ${accent}`,
                        borderRadius: "14px",
                        padding: "1.6rem",
                        position: "relative",
                      }}
                    >
                      <div className="au-vcard-ico" style={{ background: `${accent}12`, fontSize: "1.3rem" }}>
                        {emoji}
                      </div>
                      <div className="au-vcard-title">{title}</div>
                      <div className="au-vcard-desc">{desc}</div>
                    </div>
                  </div>
                ))}
              </div>

            </div>
          </div>
        </section>

        {/* ── INTL ── */}
        <section className="au-intl">
          <div className="au-wrap">
            <div className="au-intl-inner">
              <div className="au-intl-bg" />
              <div className="au-intl-bg-word">Global</div>
              <div>
                <div className="au-intl-kicker">
                  <MapPin size={10} />
                  International Placements
                </div>
                <h3 className="au-intl-title">Serving Clients in<br />Europe &amp; the UK</h3>
                <p className="au-intl-desc">
                  We relocate fresh and experienced helpers to reputable clients in <strong>Europe</strong> and the <strong>United Kingdom</strong>. Email your requirements and we'll shortlist the best candidates for you.
                </p>
              </div>
              <div className="au-intl-action">
                <a href="mailto:enquiry@rinzinagency.com" className="au-btn-outline-amber">
                  <Mail size={14} />
                  Email Requirements
                </a>
              </div>
            </div>
          </div>
        </section>

      </main>

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

export default AboutUs;