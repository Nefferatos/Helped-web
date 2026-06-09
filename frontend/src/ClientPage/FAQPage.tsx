import { useState, useMemo, useEffect, useRef } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  ChevronDown,
  Search,
  Home,
  Shield,
  Heart,
  FileText,
  DollarSign,
  AlertCircle,
  UserCheck,
  ArrowRight,
  CreditCard,
  MessageCircle,
} from "lucide-react";
import PublicSiteNavbar from "@/components/PublicSiteNavbar";

const CATEGORIES = [
  { id: "all",        label: "All Topics",       Icon: Home },
  { id: "hiring",     label: "Hiring Process",   Icon: UserCheck },
  { id: "costs",      label: "Costs & Levy",     Icon: DollarSign },
  { id: "legal",      label: "Legal & Permits",  Icon: FileText },
  { id: "welfare",    label: "Maid Welfare",     Icon: Heart },
  { id: "salaries",   label: "Salaries",         Icon: CreditCard },
  { id: "situations", label: "Situations",       Icon: AlertCircle },
];

const faqItems = [
  {
    id: 1,
    cat: "hiring",
    q: "Why should you hire us?",
    a: "Our maid agencies provide selected, well-trained and quality maids, and we genuinely value the needs of our customers. Every agency listed on Bestmaid is vetted and licensed.",
  },
  {
    id: 2,
    cat: "hiring",
    q: "Are you a licensed maid agency?",
    a: "Yes. All maid agencies listed at Bestmaid are licensed. The Ministry of Manpower (MOM) issues the licence to operate the Maids Recruitment and Deployment business.",
  },
  {
    id: 3,
    cat: "hiring",
    q: "How long does it take to get a maid from overseas?",
    a: "If the Work Permit application is processed correctly, it typically takes one to four weeks for the maid to arrive and begin work. The timeline may vary depending on the maid's country of origin.",
  },
  {
    id: 6,
    cat: "hiring",
    q: "What countries can I employ a maid from?",
    a: "You may only employ maids from MOM-approved source countries: Indonesia, Philippines, India, Myanmar, Bangladesh, Cambodia, Sri Lanka, Hong Kong, Macau, Malaysia, South Korea, Taiwan, and Thailand.",
  },
  {
    id: 17,
    cat: "hiring",
    q: "What is a 'Transfer Maid'?",
    a: "Transfer maids are already residing locally in Singapore, meaning they do not need to be brought in from their country of origin. They are typically from another employer and are seeking a new placement — for example, due to expiry of a two-year contract or the employer discontinuing the arrangement.",
  },
  {
    id: 29,
    cat: "hiring",
    q: "What are transfer maids? (advantages)",
    a: "Transfer maids are currently residing in Singapore and can be interviewed in person before hiring, which is a key advantage over new maids who are overseas.",
  },
  {
    id: 30,
    cat: "hiring",
    q: "What are new maids?",
    a: "New maids are currently not residing in Singapore. Even if they have previously worked in Singapore or abroad, they are classified as 'new maids' as long as they are not currently in Singapore.",
  },
  {
    id: 31,
    cat: "hiring",
    q: "Why should I approach a maid agency?",
    a: "Maid agencies provide professional and comprehensive services covering recruitment, training, Work Permit applications, security bonds, insurance, travel arrangements, immigration clearance, and medical screening — saving you significant time and effort.",
  },
  {
    id: 20,
    cat: "hiring",
    q: "What documents are needed for a first-time employer?",
    a: (
      <div className="faq-rich">
        <div>
          <p className="faq-sub-heading">Local Employers</p>
          <ul>
            <li>Identity Card (IC) of employer and household members</li>
            <li>Proof of income — Notice of Assessment or CPF contribution statements for the last 3 months</li>
          </ul>
        </div>
        <div>
          <p className="faq-sub-heading">Expatriate Employers</p>
          <ul>
            <li>Passport copies of self and all family members</li>
            <li>Employment Pass and Dependent Passes for family members residing in Singapore</li>
            <li>Proof of income or employment letter stating position, salary, and commencement date</li>
          </ul>
        </div>
      </div>
    ),
  },
  {
    id: 4,
    cat: "costs",
    q: "What is the Maid Levy?",
    a: "As per MOM regulation, an employer must pay a maid levy — a monthly tax paid to the government for every Foreign Domestic Worker (FDW) employed in Singapore.",
  },
  {
    id: 5,
    cat: "costs",
    q: "How much is the maid levy?",
    a: (
      <div className="faq-rich">
        <p>The standard levy is <strong>$300.00 per month</strong> ($9.87 per day) for the duration of the valid work permit.</p>
        <p>A <strong>concessionary rate of $60/month</strong> applies if you have in the same household:</p>
        <ul>
          <li>A child below 16 years old</li>
          <li>An elderly person at least 67 years old</li>
          <li>A Person with Disabilities (PWD) certified by a Singapore-registered doctor</li>
        </ul>
        <p>Payment must be made via GIRO (General Interbank Recurring Order).</p>
      </div>
    ),
  },
  {
    id: 12,
    cat: "costs",
    q: "What are the criteria to claim tax relief for maid levy?",
    a: (
      <div className="faq-rich">
        <p>You may be eligible for tax relief (two times the levy paid for one maid) if you meet any of the following:</p>
        <ul>
          <li>You are a married woman and have elected for separate assessment.</li>
          <li>You are married and your husband is not resident in Singapore.</li>
          <li>You are separated, divorced, or widowed and living with an unmarried child for whom you can claim child relief.</li>
        </ul>
        <p>The relief can only be offset against the wife's earned income. Single taxpayers are not eligible.</p>
      </div>
    ),
  },
  {
    id: 7,
    cat: "legal",
    q: "What is a security bond and how much is it?",
    a: "Employers must post a security deposit (bond) of $5,000 per maid with the Work Permit Department, MOM. You are responsible for repatriating the maid when the two-year contract expires or is terminated. Failure to repatriate risks forfeiture of the deposit.",
  },
  {
    id: 8,
    cat: "legal",
    q: "What are the alternatives to the $5,000 security deposit?",
    a: "You may purchase an insurance policy from ANDA or NTUC Income instead of making the full $5,000 cash deposit — a significantly cheaper alternative.",
  },
  {
    id: 16,
    cat: "legal",
    q: "Can I employ a maid on a part-time basis?",
    a: "No. Current MOM regulations do not permit part-time employment of Foreign Domestic Workers.",
  },
  {
    id: 19,
    cat: "legal",
    q: "What are the employer's obligations to the Immigration Department?",
    a: "The obligations of the employer to the Immigration Department are stated clearly in the Security Bond. Employers should read and understand all terms before signing.",
  },
  {
    id: 21,
    cat: "legal",
    q: "What is the procedure for cancellation of a work permit?",
    a: (
      <div className="faq-rich">
        <p>Submit the following to MOM:</p>
        <ol>
          <li>A letter to MOM requesting termination of services and repatriation</li>
          <li>Return ticket to the maid's country of origin</li>
          <li>A copy of the maid's passport</li>
          <li>The maid's Work Permit card</li>
        </ol>
      </div>
    ),
  },
  {
    id: 9,
    cat: "welfare",
    q: "What is the Personal Accident Insurance?",
    a: (
      <div className="faq-rich">
        <p>Employers must purchase personal accident insurance for their maid with a minimum insured sum of <strong>$10,000</strong>. Approved insurers include:</p>
        <ul>
          <li><strong>Augaries Insurance</strong> — 116 Lavender Street, #02-05 Pek Chuan Building. Tel: 6293 6232</li>
          <li><strong>ANDA Insurance Agencies Pte Ltd</strong> — 60 Eu Tong Sen Street, #01-13/14 Furama Hotel. Tel: 6534-2288</li>
          <li><strong>NTUC Income Insurance</strong> — 75 Bras Basah Road, NTUC Income Centre. Tel: 6336-3322</li>
        </ul>
      </div>
    ),
  },
  {
    id: 10,
    cat: "welfare",
    q: "Do maids need to undergo medical check-ups and how often?",
    a: "Yes. Within 14 days of arriving in Singapore, the maid must be examined by a certified medical institution. She may only begin work upon passing. Medical screening — covering VDRL, pregnancy, and HIV — is required every six months.",
  },
  {
    id: 11,
    cat: "welfare",
    q: "Who bears the responsibility for a maid's medical expenses?",
    a: "As the employer, you are liable for the full cost of medical expenses, including hospitalisation. It is strongly recommended that you obtain hospitalization insurance coverage for your maid.",
  },
  {
    id: 13,
    cat: "welfare",
    q: "How does a maid remit money to her home country?",
    a: "Several licensed remittance service providers operate in Singapore, including ActionPlus Remittance Services, Ameertech Remittance Services, Metro Remittance Centre, and MoneyNet Remittance Service. Your maid can use any MAS-registered provider to send money home.",
  },
  {
    id: 18,
    cat: "welfare",
    q: "What are the employer's obligations to the maid?",
    a: (
      <div className="faq-rich">
        <p>Per MOM regulations, employers are responsible for:</p>
        <ul>
          <li>Paying salary on time</li>
          <li>Providing adequate food and suitable accommodation</li>
          <li>Providing medical care including hospitalisation</li>
          <li>Providing a safe working environment</li>
          <li>Treating the maid with respect and dignity</li>
        </ul>
      </div>
    ),
  },
  {
    id: 22,
    cat: "salaries",
    q: "What is the average salary of a Myanmar maid?",
    a: "Myanmar maid salary ranges from approximately $450–$550, depending on skill level. Experienced or transfer Myanmar maids typically earn $500–$650 or more.",
  },
  {
    id: 23,
    cat: "salaries",
    q: "What is the average salary of a Filipino maid?",
    a: "The Philippine Overseas Employment Administration stipulates a minimum salary of $570. New or transfer Filipino maids typically earn $570–$650, while more experienced maids may command $600–$750 or higher.",
  },
  {
    id: 24,
    cat: "salaries",
    q: "What is the average salary of an Indonesian maid?",
    a: "New Indonesian maids typically earn $550–$570. Experienced Indonesian maids earn $600–$750 or more, depending on skill sets and years of experience.",
  },
  {
    id: 25,
    cat: "salaries",
    q: "What is the average salary of a Sri Lankan maid?",
    a: "New Sri Lankan maids earn approximately $480–$550. Experienced Sri Lankan maids start from $650 and above.",
  },
  {
    id: 26,
    cat: "salaries",
    q: "What is the average salary of an Indian maid?",
    a: "Indian maid salaries range from approximately $400–$600, increasing with experience and specialised skills.",
  },
  {
    id: 27,
    cat: "salaries",
    q: "What is the salary of a Bangladeshi maid?",
    a: "Approximately $400–$600. Salary increases with experience.",
  },
  {
    id: 28,
    cat: "salaries",
    q: "What is the salary of a Punjabi maid?",
    a: "Starting from approximately $480. The salary increases with experience and skill level.",
  },
  {
    id: 14,
    cat: "situations",
    q: "What should I do if my maid goes missing?",
    a: "Cancel her work permit immediately to stop the levy payment. You are given one month to locate and repatriate her. Failure to do so risks forfeiture of the $5,000 security deposit.",
  },
  {
    id: 15,
    cat: "situations",
    q: "What happens if my maid gets pregnant?",
    a: "You must repatriate the maid immediately. FDWs are not permitted to remain in Singapore while pregnant as per MOM regulations.",
  },
];

function useInView(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setInView(true); obs.disconnect(); } }, { threshold });
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return { ref, inView };
}

function AccordionItem({ item, isOpen, onToggle, index }) {
  return (
    <div
      className={`faq-item ${isOpen ? "faq-item--open" : ""}`}
      style={{ "--i": index } as React.CSSProperties}
    >
      <button onClick={onToggle} aria-expanded={isOpen} className="faq-trigger">
        <span className="faq-q-num">{String(index + 1).padStart(2, "0")}</span>
        <span className="faq-q">{item.q}</span>
        <span className="faq-chevron-wrap">
          <ChevronDown className={`faq-chevron ${isOpen ? "faq-chevron--open" : ""}`} />
        </span>
      </button>
      <div className={`faq-body ${isOpen ? "faq-body--open" : ""}`}>
        <div className="faq-answer">
          {typeof item.a === "string" ? <p>{item.a}</p> : item.a}
        </div>
      </div>
    </div>
  );
}

type FAQPageProps = { embedded?: boolean };

const FAQPage = ({ embedded = false }: FAQPageProps) => {
  const location = useLocation();
  const isEmbedded = embedded || location.pathname.startsWith("/client/");

  const [activeCategory, setActiveCategory] = useState("all");
  const [openIds, setOpenIds] = useState(new Set());
  const [search, setSearch] = useState("");
  const [heroVisible, setHeroVisible] = useState(false);
  const heroRef = useRef<HTMLDivElement>(null);
  const { ref: bodyRef, inView: bodyInView } = useInView(0.05);

  useEffect(() => {
    const t = setTimeout(() => setHeroVisible(true), 80);
    return () => clearTimeout(t);
  }, []);

  const filteredItems = useMemo(() => {
    let items = activeCategory === "all" ? faqItems : faqItems.filter((i) => i.cat === activeCategory);
    const q = search.trim().toLowerCase();
    if (q) {
      items = items.filter(
        (item) =>
          item.q.toLowerCase().includes(q) ||
          (typeof item.a === "string" && item.a.toLowerCase().includes(q))
      );
    }
    return items;
  }, [search, activeCategory]);

  const toggle = (id) => {
    setOpenIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const expandAll = () => setOpenIds(new Set(filteredItems.map((i) => i.id)));
  const collapseAll = () => setOpenIds(new Set());

  const switchCategory = (id) => {
    setActiveCategory(id);
    setOpenIds(new Set());
  };

  const catCounts = useMemo(() => {
    const m = {};
    CATEGORIES.forEach(({ id }) => {
      m[id] = id === "all" ? faqItems.length : faqItems.filter((i) => i.cat === id).length;
    });
    return m;
  }, []);

  return (
    <>
      <style>{`
        /* ── TOKENS ── */
        :root {
          --teal:        #0E4E5E;
          --teal-dark:   #0a3a47;
          --teal-deeper: #071f28;
          --teal-light:  #1a6880;
          --teal-mist:   #e8f4f7;
          --teal-pale:   #f0f8fb;
          --gold:        #FCD34D;
          --gold-deep:   #f5b800;
          --gold-pale:   #fffbeb;
          --gold-muted:  #fef3c7;
          --ink:         #0d1f24;
          --mid:         #4a6570;
          --soft:        #8ba5ae;
          --border:      #d1e8ed;
          --surface:     #ffffff;
          --bg:          #f7fbfc;
          --radius:      14px;
          --radius-xl:   22px;
          --shadow:      0 2px 12px rgba(14,78,94,.08);
          --shadow-md:   0 6px 28px rgba(14,78,94,.13);
        }

        /* ── GLOBAL ── */
        .faq-page * { box-sizing: border-box; }

        /* ── HERO ── */
        .faq-hero {
          background: var(--teal-deeper);
          position: relative;
          overflow: hidden;
          padding: 0;
        }

        /* animated teal wave blobs */
        .faq-blob {
          position: absolute;
          border-radius: 50%;
          filter: blur(72px);
          pointer-events: none;
          will-change: transform;
        }
        .faq-blob-1 {
          width: 520px; height: 520px;
          background: rgba(14,78,94,.55);
          top: -160px; left: -80px;
          animation: blobDrift1 14s ease-in-out infinite alternate;
        }
        .faq-blob-2 {
          width: 380px; height: 380px;
          background: rgba(252,211,77,.18);
          top: 60px; right: -60px;
          animation: blobDrift2 18s ease-in-out infinite alternate;
        }
        .faq-blob-3 {
          width: 260px; height: 260px;
          background: rgba(26,104,128,.4);
          bottom: -60px; left: 38%;
          animation: blobDrift3 20s ease-in-out infinite alternate;
        }

        @keyframes blobDrift1 {
          from { transform: translate(0,0) scale(1); }
          to   { transform: translate(40px, 30px) scale(1.08); }
        }
        @keyframes blobDrift2 {
          from { transform: translate(0,0) scale(1); }
          to   { transform: translate(-30px, 20px) scale(1.12); }
        }
        @keyframes blobDrift3 {
          from { transform: translate(0,0) scale(1); }
          to   { transform: translate(20px, -25px) scale(1.06); }
        }

        /* dot grid */
        .faq-hero::before {
          content: '';
          position: absolute;
          inset: 0;
          background-image: radial-gradient(circle, rgba(255,255,255,.07) 1px, transparent 1px);
          background-size: 28px 28px;
          pointer-events: none;
        }

        .faq-hero-inner {
          position: relative;
          z-index: 1;
          max-width: 1200px;
          margin: 0 auto;
          padding: 64px 32px 0;
          display: grid;
          grid-template-columns: 1fr 340px;
          gap: 48px;
          align-items: end;
        }
        .faq-hero-left { padding-bottom: 48px; }

        /* ── entrance animations ── */
        .faq-hero-left .faq-badge,
        .faq-hero-left h1,
        .faq-hero-left .faq-hero-sub,
        .faq-hero-left .faq-search-wrap,
        .faq-hero-left .faq-stats {
          opacity: 0;
          transform: translateY(22px);
          transition: opacity .6s ease, transform .6s ease;
        }
        .hero-visible .faq-hero-left .faq-badge   { opacity: 1; transform: none; transition-delay: .05s; }
        .hero-visible .faq-hero-left h1            { opacity: 1; transform: none; transition-delay: .15s; }
        .hero-visible .faq-hero-left .faq-hero-sub { opacity: 1; transform: none; transition-delay: .25s; }
        .hero-visible .faq-hero-left .faq-search-wrap { opacity: 1; transform: none; transition-delay: .35s; }
        .hero-visible .faq-hero-left .faq-stats    { opacity: 1; transform: none; transition-delay: .45s; }

        .faq-badge {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          background: rgba(252,211,77,.14);
          border: 1px solid rgba(252,211,77,.35);
          border-radius: 100px;
          padding: 6px 16px;
          font-size: 11px;
          font-family: system-ui, sans-serif;
          color: var(--gold);
          letter-spacing: .07em;
          text-transform: uppercase;
          margin-bottom: 20px;
          font-weight: 600;
        }
        .faq-badge svg { color: var(--gold); }

        .faq-hero h1 {
          font-size: clamp(30px, 4.5vw, 54px);
          color: #fff;
          font-weight: 800;
          line-height: 1.1;
          margin: 0 0 14px;
          letter-spacing: -.025em;
          font-family: Georgia, 'Times New Roman', serif;
        }
        .faq-hero h1 span {
          color: var(--gold);
          position: relative;
          display: inline-block;
        }
        /* underline accent on "Questions" */
        .faq-hero h1 span::after {
          content: '';
          position: absolute;
          bottom: 4px; left: 0; right: 0;
          height: 3px;
          background: var(--gold);
          border-radius: 2px;
          transform: scaleX(0);
          transform-origin: left;
          transition: transform .7s cubic-bezier(.16,1,.3,1) .6s;
        }
        .hero-visible .faq-hero h1 span::after { transform: scaleX(1); }

        .faq-hero-sub {
          font-size: 15px;
          font-family: system-ui, sans-serif;
          color: rgba(255,255,255,.62);
          line-height: 1.7;
          margin: 0 0 30px;
          max-width: 480px;
        }

        /* search */
        .faq-search-wrap { position: relative; max-width: 480px; margin-bottom: 0; }
        .faq-search-wrap .faq-search-icon {
          position: absolute; left: 16px; top: 50%; transform: translateY(-50%);
          color: rgba(255,255,255,.4); width: 16px; height: 16px;
          pointer-events: none;
        }
        .faq-search-input {
          width: 100%;
          padding: 14px 18px 14px 46px;
          background: rgba(255,255,255,.1);
          border: 1.5px solid rgba(255,255,255,.18);
          border-radius: var(--radius);
          color: #fff;
          font-size: 14px;
          font-family: system-ui, sans-serif;
          outline: none;
          transition: border-color .2s, background .2s, box-shadow .2s;
          box-sizing: border-box;
        }
        .faq-search-input::placeholder { color: rgba(255,255,255,.38); }
        .faq-search-input:focus {
          border-color: var(--gold);
          background: rgba(255,255,255,.14);
          box-shadow: 0 0 0 3px rgba(252,211,77,.18);
        }

        /* stats */
        .faq-stats {
          display: flex;
          gap: 0;
          padding: 22px 0 0;
          margin-top: 28px;
          border-top: 1px solid rgba(255,255,255,.1);
        }
        .faq-stat {
          flex: 1;
          padding-right: 24px;
          border-right: 1px solid rgba(255,255,255,.1);
          margin-right: 24px;
        }
        .faq-stat:last-child { border-right: none; margin-right: 0; padding-right: 0; }
        .faq-stat-val {
          font-size: 26px;
          font-weight: 800;
          color: var(--gold);
          line-height: 1;
          font-family: Georgia, serif;
        }
        .faq-stat-lbl {
          font-size: 10px;
          font-family: system-ui, sans-serif;
          color: rgba(255,255,255,.45);
          text-transform: uppercase;
          letter-spacing: .08em;
          margin-top: 5px;
          font-weight: 600;
        }

        /* hero right card */
        .faq-hero-card {
          background: rgba(255,255,255,.07);
          border: 1px solid rgba(255,255,255,.12);
          border-radius: var(--radius-xl);
          padding: 28px 24px;
          margin-bottom: 32px;
          opacity: 0;
          transform: translateX(24px);
          transition: opacity .6s ease .4s, transform .6s ease .4s;
          backdrop-filter: blur(8px);
        }
        .hero-visible .faq-hero-card { opacity: 1; transform: none; }
        .faq-hero-card-label {
          font-size: 10px;
          letter-spacing: .1em;
          text-transform: uppercase;
          color: var(--gold);
          font-weight: 700;
          font-family: system-ui, sans-serif;
          margin-bottom: 14px;
        }
        .faq-hero-card-items { display: flex; flex-direction: column; gap: 10px; }
        .faq-hero-card-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 10px 14px;
          background: rgba(255,255,255,.06);
          border-radius: 10px;
          border: 1px solid rgba(255,255,255,.08);
          cursor: pointer;
          transition: background .2s, border-color .2s, transform .2s;
          text-decoration: none;
        }
        .faq-hero-card-item:hover {
          background: rgba(252,211,77,.12);
          border-color: rgba(252,211,77,.3);
          transform: translateX(4px);
        }
        .faq-hero-card-item-icon {
          width: 34px; height: 34px;
          border-radius: 9px;
          background: rgba(252,211,77,.15);
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
        }
        .faq-hero-card-item-icon svg { color: var(--gold); width: 15px; height: 15px; }
        .faq-hero-card-item-text { flex: 1; }
        .faq-hero-card-item-title { font-size: 13px; font-weight: 600; color: #fff; font-family: system-ui, sans-serif; }
        .faq-hero-card-item-sub   { font-size: 11px; color: rgba(255,255,255,.45); font-family: system-ui, sans-serif; }
        .faq-hero-card-item-arrow { color: rgba(255,255,255,.3); width: 14px; height: 14px; flex-shrink: 0; }

        /* wavy divider */
        .faq-wave {
          display: block;
          width: 100%;
          margin-bottom: -2px;
          position: relative;
          z-index: 1;
        }

        /* ── BODY ── */
        .faq-body-wrap {
          max-width: 1200px;
          margin: 0 auto;
          width: 100%;
          padding: 40px 32px 72px;
          display: grid;
          grid-template-columns: 230px 1fr;
          gap: 36px;
          align-items: start;
          background: var(--bg);
        }

        /* sidebar */
        .faq-sidebar {
          position: sticky;
          top: 80px;
          display: flex;
          flex-direction: column;
          gap: 3px;
        }
        .faq-sidebar-label {
          font-size: 10px;
          font-family: system-ui, sans-serif;
          text-transform: uppercase;
          letter-spacing: .1em;
          color: var(--soft);
          font-weight: 700;
          padding: 0 10px 10px;
        }
        .faq-cat-btn {
          display: flex;
          align-items: center;
          gap: 11px;
          padding: 10px 12px;
          border-radius: 11px;
          border: 1.5px solid transparent;
          background: transparent;
          cursor: pointer;
          transition: background .18s, color .18s, border-color .18s, transform .18s;
          text-align: left;
          width: 100%;
          font-family: system-ui, sans-serif;
        }
        .faq-cat-btn:hover {
          background: var(--teal-pale);
          border-color: var(--border);
          transform: translateX(3px);
        }
        .faq-cat-btn--active {
          background: var(--teal) !important;
          border-color: var(--teal) !important;
          transform: translateX(0) !important;
          box-shadow: 0 4px 16px rgba(14,78,94,.25) !important;
        }
        .faq-cat-btn--active .faq-cat-count { background: rgba(252,211,77,.2); color: var(--gold); }
        .faq-cat-icon {
          width: 34px; height: 34px;
          border-radius: 9px;
          background: var(--teal-pale);
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
          transition: background .18s;
          border: 1px solid var(--border);
        }
        .faq-cat-btn--active .faq-cat-icon { background: rgba(255,255,255,.15); border-color: transparent; }
        .faq-cat-icon svg { width: 15px; height: 15px; color: var(--teal); }
        .faq-cat-btn--active .faq-cat-icon svg { color: #fff; }
        .faq-cat-name { flex: 1; font-size: 13px; font-weight: 500; color: var(--mid); transition: color .18s; }
        .faq-cat-btn--active .faq-cat-name { color: #fff; }
        .faq-cat-count {
          font-size: 11px;
          font-weight: 700;
          background: var(--teal-mist);
          color: var(--teal);
          padding: 2px 8px;
          border-radius: 100px;
          font-family: system-ui, sans-serif;
          transition: background .18s, color .18s;
        }

        /* right col */
        .faq-right {}

        /* toolbar */
        .faq-toolbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 16px;
          opacity: 0;
          transform: translateY(12px);
          transition: opacity .45s ease, transform .45s ease;
        }
        .body-visible .faq-toolbar { opacity: 1; transform: none; transition-delay: .05s; }
        .faq-result-label { font-size: 13px; font-family: system-ui, sans-serif; color: var(--soft); }
        .faq-result-label strong { color: var(--teal); }
        .faq-actions { display: flex; gap: 6px; }
        .faq-action-btn {
          font-size: 11px;
          font-family: system-ui, sans-serif;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: .06em;
          padding: 7px 14px;
          border-radius: 9px;
          border: 1.5px solid transparent;
          cursor: pointer;
          transition: background .15s, border-color .15s, transform .15s;
        }
        .faq-action-btn:hover { transform: translateY(-1px); }
        .faq-action-btn--expand {
          background: var(--gold-pale);
          color: #92650a;
          border-color: var(--gold-muted);
        }
        .faq-action-btn--expand:hover { background: var(--gold-muted); }
        .faq-action-btn--collapse {
          background: var(--teal-pale);
          color: var(--teal);
          border-color: var(--border);
        }
        .faq-action-btn--collapse:hover { background: var(--teal-mist); }

        /* list */
        .faq-list {
          background: var(--surface);
          border: 1.5px solid var(--border);
          border-radius: var(--radius-xl);
          overflow: hidden;
          box-shadow: var(--shadow);
          opacity: 0;
          transform: translateY(16px);
          transition: opacity .5s ease, transform .5s ease;
        }
        .body-visible .faq-list { opacity: 1; transform: none; transition-delay: .12s; }

        /* accordion item */
        .faq-item {
          border-bottom: 1px solid var(--border);
          animation: fadeSlide .4s ease both;
          animation-delay: calc(var(--i) * 40ms);
        }
        .faq-item:last-child { border-bottom: none; }

        @keyframes fadeSlide {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: none; }
        }

        .faq-trigger {
          width: 100%;
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 20px 26px;
          background: transparent;
          border: none;
          cursor: pointer;
          text-align: left;
          transition: background .18s;
          position: relative;
        }
        .faq-trigger::before {
          content: '';
          position: absolute;
          left: 0; top: 0; bottom: 0;
          width: 3px;
          background: var(--gold);
          transform: scaleY(0);
          transform-origin: bottom;
          transition: transform .25s ease;
          border-radius: 0 2px 2px 0;
        }
        .faq-item--open .faq-trigger::before { transform: scaleY(1); }
        .faq-trigger:hover { background: var(--teal-pale); }
        .faq-item--open .faq-trigger { background: var(--teal-pale); }

        .faq-q-num {
          font-size: 11px;
          font-weight: 800;
          color: var(--soft);
          font-family: system-ui, sans-serif;
          letter-spacing: .04em;
          flex-shrink: 0;
          width: 26px;
          transition: color .2s;
        }
        .faq-item--open .faq-q-num { color: var(--teal); }

        .faq-q {
          flex: 1;
          font-size: 15px;
          font-family: Georgia, 'Times New Roman', serif;
          font-weight: 500;
          color: var(--ink);
          line-height: 1.45;
          transition: color .18s;
        }
        .faq-item--open .faq-q { color: var(--teal-dark); font-weight: 600; }

        .faq-chevron-wrap {
          width: 30px; height: 30px;
          border-radius: 8px;
          background: var(--bg);
          border: 1.5px solid var(--border);
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
          transition: background .2s, border-color .2s;
        }
        .faq-item--open .faq-chevron-wrap {
          background: var(--teal);
          border-color: var(--teal);
        }
        .faq-chevron {
          width: 15px; height: 15px;
          color: var(--soft);
          transition: transform .32s cubic-bezier(.4,0,.2,1), color .2s;
          flex-shrink: 0;
        }
        .faq-item--open .faq-chevron { transform: rotate(180deg); color: #fff; }

        /* accordion body */
        .faq-body {
          max-height: 0;
          overflow: hidden;
          transition: max-height .38s cubic-bezier(.4,0,.2,1);
        }
        .faq-body--open { max-height: 1200px; }

        .faq-answer {
          padding: 0 26px 24px 68px;
          font-size: 14px;
          font-family: system-ui, sans-serif;
          line-height: 1.8;
          color: var(--mid);
          border-top: 1px solid var(--border);
          padding-top: 18px;
        }
        .faq-answer p { margin: 0 0 10px; }
        .faq-answer p:last-child { margin-bottom: 0; }

        .faq-rich { display: flex; flex-direction: column; gap: 12px; }
        .faq-rich ul, .faq-rich ol {
          margin: 4px 0 0 0;
          padding: 0;
          display: flex;
          flex-direction: column;
          gap: 5px;
          list-style: none;
        }
        .faq-rich ul li::before {
          content: '';
          display: inline-block;
          width: 6px; height: 6px;
          border-radius: 50%;
          background: var(--gold-deep);
          margin-right: 10px;
          vertical-align: middle;
          flex-shrink: 0;
        }
        .faq-rich ul li { display: flex; align-items: baseline; font-size: 14px; color: var(--mid); line-height: 1.65; }
        .faq-rich ol { counter-reset: faq-ol; }
        .faq-rich ol li {
          counter-increment: faq-ol;
          display: flex; align-items: baseline; gap: 10px;
          font-size: 14px; color: var(--mid); line-height: 1.65;
        }
        .faq-rich ol li::before {
          content: counter(faq-ol);
          font-size: 11px; font-weight: 700;
          background: var(--teal-mist); color: var(--teal);
          width: 20px; height: 20px;
          display: flex; align-items: center; justify-content: center;
          border-radius: 5px; flex-shrink: 0;
        }
        .faq-rich strong { color: var(--ink); font-weight: 700; }
        .faq-sub-heading {
          font-weight: 700;
          color: var(--teal-dark);
          margin: 0 0 5px;
          font-size: 13px;
          font-family: system-ui, sans-serif;
          text-transform: uppercase;
          letter-spacing: .05em;
        }

        /* empty */
        .faq-empty {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 72px 32px;
          text-align: center;
          background: var(--surface);
          border: 1.5px solid var(--border);
          border-radius: var(--radius-xl);
        }
        .faq-empty-icon-wrap {
          width: 64px; height: 64px;
          background: var(--teal-pale);
          border-radius: 18px;
          display: flex; align-items: center; justify-content: center;
          margin-bottom: 18px;
          border: 1.5px solid var(--border);
        }
        .faq-empty-icon { width: 26px; height: 26px; color: var(--teal); }
        .faq-empty h3 { font-size: 17px; color: var(--ink); margin: 0 0 7px; font-family: Georgia, serif; }
        .faq-empty p { font-size: 13px; font-family: system-ui, sans-serif; color: var(--soft); margin: 0; }

        /* contact strip */
        .faq-contact-strip {
          margin-top: 24px;
          padding: 24px 28px;
          background: var(--teal);
          border-radius: var(--radius-xl);
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          position: relative;
          overflow: hidden;
          opacity: 0;
          transform: translateY(16px);
          transition: opacity .5s ease, transform .5s ease;
        }
        .body-visible .faq-contact-strip { opacity: 1; transform: none; transition-delay: .25s; }
        .faq-contact-strip::before {
          content: '';
          position: absolute;
          width: 240px; height: 240px;
          background: rgba(252,211,77,.1);
          border-radius: 50%;
          right: -60px; bottom: -80px;
          pointer-events: none;
        }
        .faq-contact-strip::after {
          content: '';
          position: absolute;
          width: 120px; height: 120px;
          background: rgba(255,255,255,.06);
          border-radius: 50%;
          right: 120px; top: -40px;
          pointer-events: none;
        }
        .faq-contact-text { position: relative; z-index: 1; }
        .faq-contact-strip p { font-size: 14px; font-family: system-ui, sans-serif; color: rgba(255,255,255,.75); margin: 0 0 3px; }
        .faq-contact-strip strong { color: #fff; font-size: 16px; display: block; margin-bottom: 4px; }
        .faq-contact-link {
          position: relative; z-index: 1;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          background: var(--gold);
          color: var(--teal-deeper);
          font-size: 13px;
          font-family: system-ui, sans-serif;
          font-weight: 800;
          padding: 11px 22px;
          border-radius: 11px;
          text-decoration: none;
          white-space: nowrap;
          transition: background .2s, transform .2s, box-shadow .2s;
          flex-shrink: 0;
          letter-spacing: .02em;
        }
        .faq-contact-link:hover {
          background: #fde06b;
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(252,211,77,.35);
        }

        /* footer */
        .faq-footer {
          background: var(--teal-deeper);
          padding: 56px 32px 32px;
        }
        .faq-footer-inner {
          max-width: 1200px;
          margin: 0 auto;
          display: grid;
          grid-template-columns: 1.4fr 1fr 1fr 1.4fr;
          gap: 40px;
          padding-bottom: 32px;
        }
        .faq-footer h4 {
          font-size: 15px;
          font-weight: 700;
          color: #fff;
          font-family: Georgia, serif;
          margin: 0 0 10px;
          line-height: 1.3;
        }
        .faq-footer p { font-size: 13px; font-family: system-ui, sans-serif; color: rgba(255,255,255,.5); margin: 0; line-height: 1.7; }
        .faq-footer h5 {
          font-size: 10px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: .1em;
          color: var(--gold);
          margin: 0 0 12px;
          font-family: system-ui, sans-serif;
        }
        .faq-footer ul { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 8px; }
        .faq-footer ul li a {
          font-size: 13px;
          font-family: system-ui, sans-serif;
          color: rgba(255,255,255,.5);
          text-decoration: none;
          transition: color .15s;
        }
        .faq-footer ul li a:hover { color: rgba(255,255,255,.9); }
        .faq-footer-newsletter p { font-size: 13px; font-family: system-ui, sans-serif; color: rgba(255,255,255,.5); margin: 0 0 12px; line-height: 1.65; }
        .faq-footer-input-row { display: flex; gap: 8px; }
        .faq-footer-input {
          flex: 1;
          padding: 10px 14px;
          background: rgba(255,255,255,.08);
          border: 1.5px solid rgba(255,255,255,.12);
          border-radius: 10px;
          color: #fff;
          font-size: 13px;
          font-family: system-ui, sans-serif;
          outline: none;
          transition: border-color .2s;
        }
        .faq-footer-input::placeholder { color: rgba(255,255,255,.3); }
        .faq-footer-input:focus { border-color: var(--gold); }
        .faq-footer-submit {
          padding: 10px 18px;
          background: var(--gold);
          color: var(--teal-deeper);
          font-size: 12px;
          font-weight: 800;
          font-family: system-ui, sans-serif;
          border: none;
          border-radius: 10px;
          cursor: pointer;
          white-space: nowrap;
          transition: background .2s, transform .2s;
          letter-spacing: .03em;
        }
        .faq-footer-submit:hover { background: #fde06b; transform: translateY(-1px); }
        .faq-footer-bottom {
          border-top: 1px solid rgba(255,255,255,.08);
          padding-top: 24px;
          text-align: center;
          font-size: 12px;
          font-family: system-ui, sans-serif;
          color: rgba(255,255,255,.3);
          max-width: 1200px;
          margin: 0 auto;
        }

        /* responsive */
        @media (max-width: 900px) {
          .faq-hero-inner { grid-template-columns: 1fr; }
          .faq-hero-card { display: none; }
          .faq-body-wrap { grid-template-columns: 1fr; padding: 24px 20px 48px; }
          .faq-sidebar { position: static; flex-direction: row; flex-wrap: wrap; gap: 6px; }
          .faq-sidebar-label { display: none; }
          .faq-cat-btn { width: auto; padding: 8px 10px; }
          .faq-cat-name { display: none; }
          .faq-footer-inner { grid-template-columns: 1fr 1fr; }
        }
        @media (max-width: 560px) {
          .faq-hero-inner { padding: 40px 20px 0; }
          .faq-hero-left { padding-bottom: 36px; }
          .faq-trigger { padding: 16px 18px; gap: 10px; }
          .faq-answer { padding: 14px 18px 18px 18px; }
          .faq-contact-strip { flex-direction: column; align-items: flex-start; }
          .faq-footer-inner { grid-template-columns: 1fr; }
          .faq-q-num { display: none; }
        }

        @media (prefers-reduced-motion: reduce) {
          .faq-blob-1, .faq-blob-2, .faq-blob-3 { animation: none; }
          .faq-hero-left .faq-badge,
          .faq-hero-left h1,
          .faq-hero-left .faq-hero-sub,
          .faq-hero-left .faq-search-wrap,
          .faq-hero-left .faq-stats,
          .faq-hero-card,
          .faq-toolbar,
          .faq-list,
          .faq-contact-strip {
            opacity: 1 !important;
            transform: none !important;
            transition: none !important;
          }
          .faq-item { animation: none; }
        }
      `}</style>

      <div className="faq-page min-h-screen flex flex-col" style={{ background: "var(--bg)" }}>

        {!isEmbedded && <PublicSiteNavbar />}

        {/* ── HERO ── */}
        <div className={`faq-hero ${heroVisible ? "hero-visible" : ""}`} ref={heroRef}>
          <div className="faq-blob faq-blob-1" />
          <div className="faq-blob faq-blob-2" />
          <div className="faq-blob faq-blob-3" />

          <div className="faq-hero-inner">
            <div className="faq-hero-left">
              <div className="faq-badge">
                <Shield size={11} />
                Employer Guide · Singapore MOM Regulations
              </div>

              <h1>
                Frequently Asked<br />
                <span>Questions</span>
              </h1>

              <p className="faq-hero-sub">
                Everything you need to know about hiring and managing domestic workers in Singapore — from levy rates to legal obligations.
              </p>

              <div className="faq-search-wrap">
                <Search className="faq-search-icon" />
                <input
                  type="text"
                  placeholder="Search questions…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="faq-search-input"
                />
              </div>

              <div className="faq-stats">
                <div className="faq-stat">
                  <div className="faq-stat-val">{faqItems.length}</div>
                  <div className="faq-stat-lbl">Total Questions</div>
                </div>
                <div className="faq-stat">
                  <div className="faq-stat-val">{CATEGORIES.length - 1}</div>
                  <div className="faq-stat-lbl">Topics Covered</div>
                </div>
                <div className="faq-stat">
                  <div className="faq-stat-val">MOM</div>
                  <div className="faq-stat-lbl">Compliant Info</div>
                </div>
              </div>
            </div>

            {/* Quick-links card */}
            <div className="faq-hero-card">
              <div className="faq-hero-card-label">Popular Topics</div>
              <div className="faq-hero-card-items">
                {CATEGORIES.slice(1, 6).map(({ id, label, Icon }) => (
                  <button
                    key={id}
                    className="faq-hero-card-item"
                    onClick={() => switchCategory(id)}
                    style={{ background: "none", border: "none", padding: 0, width: "100%", textAlign: "left" }}
                  >
                    <span className="faq-hero-card-item-icon"><Icon /></span>
                    <span className="faq-hero-card-item-text">
                      <span className="faq-hero-card-item-title">{label}</span>
                      <span className="faq-hero-card-item-sub">{catCounts[id]} questions</span>
                    </span>
                    <ArrowRight className="faq-hero-card-item-arrow" />
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* wave divider */}
        <svg className="faq-wave" viewBox="0 0 1440 48" fill="none" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none" style={{ background: "var(--bg)", display: "block" }}>
          <path d="M0 48 C240 16 480 0 720 16 C960 32 1200 48 1440 32 L1440 0 L0 0 Z" fill="#071f28" />
        </svg>

        {/* ── BODY ── */}
        <div
          ref={bodyRef}
          className={`faq-body-wrap ${bodyInView ? "body-visible" : ""}`}
        >
          <aside className="faq-sidebar">
            <div className="faq-sidebar-label">Browse Topics</div>
            {CATEGORIES.map(({ id, label, Icon }) => (
              <button
                key={id}
                onClick={() => switchCategory(id)}
                className={`faq-cat-btn ${activeCategory === id ? "faq-cat-btn--active" : ""}`}
              >
                <span className="faq-cat-icon"><Icon /></span>
                <span className="faq-cat-name">{label}</span>
                <span className="faq-cat-count">{catCounts[id]}</span>
              </button>
            ))}
          </aside>

          <div className="faq-right">
            <div className="faq-toolbar">
              <span className="faq-result-label">
                <strong>{filteredItems.length}</strong> question{filteredItems.length !== 1 ? "s" : ""}
                {search ? ` matching "${search}"` : ""}
              </span>
              <div className="faq-actions">
                <button className="faq-action-btn faq-action-btn--expand" onClick={expandAll}>Expand all</button>
                <button className="faq-action-btn faq-action-btn--collapse" onClick={collapseAll}>Collapse all</button>
              </div>
            </div>

            {filteredItems.length === 0 ? (
              <div className="faq-empty">
                <div className="faq-empty-icon-wrap">
                  <Search className="faq-empty-icon" />
                </div>
                <h3>No results found</h3>
                <p>Try a different keyword or browse a category on the left.</p>
              </div>
            ) : (
              <div className="faq-list">
                {filteredItems.map((item, index) => (
                  <AccordionItem
                    key={item.id}
                    item={item}
                    isOpen={openIds.has(item.id)}
                    onToggle={() => toggle(item.id)}
                    index={index}
                  />
                ))}
              </div>
            )}

            <div className="faq-contact-strip">
              <div className="faq-contact-text">
                <strong>Still have questions?</strong>
                <p>Our team is happy to answer anything not covered here.</p>
              </div>
              <Link to="/contact" className="faq-contact-link">
                <MessageCircle size={15} />
                Contact Us
              </Link>
            </div>
          </div>
        </div>

        {/* ── FOOTER ── */}
        <footer className="faq-footer">
          <div className="faq-footer-inner">
            <div>
              <h4>"Find Maids"<br />At The Agency</h4>
              <p>Matching trusted domestic professionals with families since 2009.</p>
            </div>
            <div>
              <h5>Company</h5>
              <ul>
                <li><a href="#why">About Us</a></li>
                <li><a href="#services">Our Services</a></li>
                <li><a href="#contact">Contact</a></li>
              </ul>
            </div>
            <div>
              <h5>Legal</h5>
              <ul>
                <li><a href="#contact">Legal Information</a></li>
                <li><a href="#contact">Privacy Policy</a></li>
                <li><a href="#contact">Terms of Service</a></li>
              </ul>
            </div>
            <div className="faq-footer-newsletter">
              <h5>Newsletter</h5>
              <p>Stay updated on care tips, industry news, and agency updates.</p>
              <div className="faq-footer-input-row">
                <input className="faq-footer-input" placeholder="Your email" type="email" />
                <button className="faq-footer-submit">Join</button>
              </div>
            </div>
          </div>
          <div className="faq-footer-bottom">
            Copyright 2026 "Find Maids" At The Agency. All rights reserved.
          </div>
        </footer>

      </div>
    </>
  );
};

export default FAQPage;