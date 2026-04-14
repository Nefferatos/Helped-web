import { useState, useMemo } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Menu,
  ChevronDown,
  Search,
  Home,
  Building2,
  Shield,
  Heart,
  FileText,
  DollarSign,
  Globe,
  Users,
  AlertCircle,
  Briefcase,
  Clock,
  CreditCard,
  UserCheck,
  ArrowRight,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  getStoredClient,
  clearClientAuth,
  getClientAuthHeaders,
} from "@/lib/clientAuth";

// ── category config ──────────────────────────────────────────────────────────
const CATEGORIES = [
  { id: "all",        label: "All Topics",       Icon: Home },
  { id: "hiring",     label: "Hiring Process",   Icon: UserCheck },
  { id: "costs",      label: "Costs & Levy",     Icon: DollarSign },
  { id: "legal",      label: "Legal & Permits",  Icon: FileText },
  { id: "welfare",    label: "Maid Welfare",     Icon: Heart },
  { id: "salaries",   label: "Salaries",         Icon: CreditCard },
  { id: "situations", label: "Situations",        Icon: AlertCircle },
];

const faqItems = [
  // hiring
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
  // costs
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
        <p>The standard levy is <strong>S$300.00 per month</strong> (S$9.87 per day) for the duration of the valid work permit.</p>
        <p>A <strong>concessionary rate of S$60/month</strong> applies if you have in the same household:</p>
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
  // legal
  {
    id: 7,
    cat: "legal",
    q: "What is a security bond and how much is it?",
    a: "Employers must post a security deposit (bond) of S$5,000 per maid with the Work Permit Department, MOM. You are responsible for repatriating the maid when the two-year contract expires or is terminated. Failure to repatriate risks forfeiture of the deposit.",
  },
  {
    id: 8,
    cat: "legal",
    q: "What are the alternatives to the S$5,000 security deposit?",
    a: "You may purchase an insurance policy from ANDA or NTUC Income instead of making the full S$5,000 cash deposit — a significantly cheaper alternative.",
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
  // welfare
  {
    id: 9,
    cat: "welfare",
    q: "What is the Personal Accident Insurance?",
    a: (
      <div className="faq-rich">
        <p>Employers must purchase personal accident insurance for their maid with a minimum insured sum of <strong>S$10,000</strong>. Approved insurers include:</p>
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
  // salaries
  {
    id: 22,
    cat: "salaries",
    q: "What is the average salary of a Myanmar maid?",
    a: "Myanmar maid salary ranges from approximately S$450–S$550, depending on skill level. Experienced or transfer Myanmar maids typically earn S$500–S$650 or more.",
  },
  {
    id: 23,
    cat: "salaries",
    q: "What is the average salary of a Filipino maid?",
    a: "The Philippine Overseas Employment Administration stipulates a minimum salary of S$570. New or transfer Filipino maids typically earn S$570–S$650, while more experienced maids may command S$600–S$750 or higher.",
  },
  {
    id: 24,
    cat: "salaries",
    q: "What is the average salary of an Indonesian maid?",
    a: "New Indonesian maids typically earn S$550–S$570. Experienced Indonesian maids earn S$600–S$750 or more, depending on skill sets and years of experience.",
  },
  {
    id: 25,
    cat: "salaries",
    q: "What is the average salary of a Sri Lankan maid?",
    a: "New Sri Lankan maids earn approximately S$480–S$550. Experienced Sri Lankan maids start from S$650 and above.",
  },
  {
    id: 26,
    cat: "salaries",
    q: "What is the average salary of an Indian maid?",
    a: "Indian maid salaries range from approximately S$400–S$600, increasing with experience and specialised skills.",
  },
  {
    id: 27,
    cat: "salaries",
    q: "What is the salary of a Bangladeshi maid?",
    a: "Approximately S$400–S$600. Salary increases with experience.",
  },
  {
    id: 28,
    cat: "salaries",
    q: "What is the salary of a Punjabi maid?",
    a: "Starting from approximately S$480. The salary increases with experience and skill level.",
  },
  {
    id: 14,
    cat: "situations",
    q: "What should I do if my maid goes missing?",
    a: "Cancel her work permit immediately to stop the levy payment. You are given one month to locate and repatriate her. Failure to do so risks forfeiture of the S$5,000 security deposit.",
  },
  {
    id: 15,
    cat: "situations",
    q: "What happens if my maid gets pregnant?",
    a: "You must repatriate the maid immediately. FDWs are not permitted to remain in Singapore while pregnant as per MOM regulations.",
  },
];

function AccordionItem({ item, isOpen, onToggle, index }) {
  return (
    <div
      className={`faq-item ${isOpen ? "faq-item--open" : ""}`}
      style={{ "--i": index } as React.CSSProperties}
    >
      <button
        onClick={onToggle}
        aria-expanded={isOpen}
        className="faq-trigger"
      >
        <span className="faq-q">{item.q}</span>
        <ChevronDown className={`faq-chevron ${isOpen ? "faq-chevron--open" : ""}`} />
      </button>

      <div className={`faq-body ${isOpen ? "faq-body--open" : ""}`}>
        <div className="faq-answer">
          {typeof item.a === "string" ? <p>{item.a}</p> : item.a}
        </div>
      </div>
    </div>
  );
}

const FAQPage = () => {
  const [clientUser, setClientUser] = useState(getStoredClient());
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const navigate = useNavigate();

  const [activeCategory, setActiveCategory] = useState("all");
  const [openIds, setOpenIds] = useState(new Set());
  const [search, setSearch] = useState("");

  const handleLogout = async () => {
    try {
      await fetch("/api/client-auth/logout", {
        method: "POST",
        headers: { ...getClientAuthHeaders() },
      });
    } catch {}
    clearClientAuth();
    setClientUser(null);
    navigate("/");
  };

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
        /* ── tokens ── */
        :root {
          --green-950: #052e16;
          --green-900: #14532d;
          --green-800: #166534;
          --green-700: #15803d;
          --green-600: #16a34a;
          --green-100: #dcfce7;
          --green-50:  #f0fdf4;
          --sand:      #faf8f5;
          --border:    #e8e3db;
          --text-main: #1a1a1a;
          --text-mid:  #4b5563;
          --text-soft: #9ca3af;
          --radius-lg: 16px;
          --radius-xl: 24px;
          --shadow-sm: 0 1px 3px rgba(0,0,0,.06), 0 1px 2px rgba(0,0,0,.04);
          --shadow-md: 0 4px 16px rgba(0,0,0,.08);
        }

        /* ── layout ── */
        .faq-page { min-height: 100vh; display: flex; flex-direction: column; background: var(--sand); font-family: 'Georgia', serif; }

        /* ── hero ── */
        .faq-hero {
          background: linear-gradient(135deg, var(--green-950) 0%, var(--green-800) 55%, var(--green-600) 100%);
          position: relative;
          overflow: hidden;
          padding: 56px 24px 0;
        }
        .faq-hero::before {
          content: '';
          position: absolute;
          inset: 0;
          background: url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.03'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E");
        }
        .faq-hero-inner {
          position: relative;
          max-width: 1200px;
          margin: 0 auto;
          display: grid;
          grid-template-columns: 1fr auto;
          gap: 40px;
          align-items: end;
          padding-bottom: 0;
        }
        .faq-hero-left { padding-bottom: 40px; }
        .faq-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: rgba(255,255,255,.12);
          border: 1px solid rgba(255,255,255,.2);
          border-radius: 100px;
          padding: 5px 14px;
          font-size: 12px;
          font-family: sans-serif;
          color: rgba(255,255,255,.85);
          letter-spacing: .04em;
          text-transform: uppercase;
          margin-bottom: 18px;
        }
        .faq-hero h1 {
          font-size: clamp(28px, 4vw, 48px);
          color: #fff;
          font-weight: 700;
          line-height: 1.15;
          margin: 0 0 12px;
          letter-spacing: -.02em;
        }
        .faq-hero p {
          font-size: 15px;
          font-family: sans-serif;
          color: rgba(255,255,255,.7);
          line-height: 1.65;
          margin: 0 0 28px;
          max-width: 460px;
        }
        .faq-search-wrap { position: relative; max-width: 460px; }
        .faq-search-wrap svg { position: absolute; left: 14px; top: 50%; transform: translateY(-50%); color: rgba(255,255,255,.5); width: 16px; height: 16px; }
        .faq-search-input {
          width: 100%;
          padding: 12px 16px 12px 42px;
          background: rgba(255,255,255,.12);
          border: 1px solid rgba(255,255,255,.25);
          border-radius: 12px;
          color: #fff;
          font-size: 14px;
          font-family: sans-serif;
          outline: none;
          transition: border-color .2s, background .2s;
          box-sizing: border-box;
        }
        .faq-search-input::placeholder { color: rgba(255,255,255,.45); }
        .faq-search-input:focus { border-color: rgba(255,255,255,.6); background: rgba(255,255,255,.18); }

        /* stats strip */
        .faq-stats {
          display: flex;
          gap: 32px;
          padding: 20px 0 22px;
          border-top: 1px solid rgba(255,255,255,.1);
          margin-top: 32px;
        }
        .faq-stat-val { font-size: 22px; font-weight: 700; color: #fff; line-height: 1; }
        .faq-stat-lbl { font-size: 11px; font-family: sans-serif; color: rgba(255,255,255,.55); text-transform: uppercase; letter-spacing: .06em; margin-top: 4px; }

        /* ── body layout ── */
        .faq-body-wrap {
          flex: 1;
          max-width: 1200px;
          margin: 0 auto;
          width: 100%;
          padding: 36px 24px 64px;
          display: grid;
          grid-template-columns: 220px 1fr;
          gap: 32px;
          align-items: start;
        }

        /* ── sidebar ── */
        .faq-sidebar {
          position: sticky;
          top: 80px;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .faq-sidebar-label {
          font-size: 10px;
          font-family: sans-serif;
          text-transform: uppercase;
          letter-spacing: .1em;
          color: var(--text-soft);
          font-weight: 600;
          padding: 0 10px 8px;
        }
        .faq-cat-btn {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px 12px;
          border-radius: 10px;
          border: none;
          background: transparent;
          cursor: pointer;
          transition: background .15s, color .15s;
          text-align: left;
          width: 100%;
          font-family: sans-serif;
        }
        .faq-cat-btn:hover { background: var(--green-50); color: var(--green-800); }
        .faq-cat-btn--active { background: var(--green-900) !important; color: #fff !important; }
        .faq-cat-btn--active .faq-cat-count { background: rgba(255,255,255,.2); color: #fff; }
        .faq-cat-icon {
          width: 32px;
          height: 32px;
          border-radius: 8px;
          background: var(--green-50);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          transition: background .15s;
        }
        .faq-cat-btn--active .faq-cat-icon { background: rgba(255,255,255,.15); }
        .faq-cat-icon svg { width: 15px; height: 15px; color: var(--green-700); }
        .faq-cat-btn--active .faq-cat-icon svg { color: #fff; }
        .faq-cat-name { flex: 1; font-size: 13px; font-weight: 500; color: var(--text-mid); }
        .faq-cat-btn--active .faq-cat-name { color: #fff; }
        .faq-cat-count {
          font-size: 11px;
          font-weight: 600;
          background: var(--green-100);
          color: var(--green-800);
          padding: 2px 7px;
          border-radius: 100px;
          font-family: sans-serif;
        }

        /* ── right column ── */
        .faq-right {}
        .faq-toolbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 16px;
        }
        .faq-result-label { font-size: 13px; font-family: sans-serif; color: var(--text-soft); }
        .faq-actions { display: flex; gap: 4px; }
        .faq-action-btn {
          font-size: 11px;
          font-family: sans-serif;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: .05em;
          padding: 6px 12px;
          border-radius: 8px;
          border: none;
          cursor: pointer;
          transition: background .15s;
        }
        .faq-action-btn--expand { background: var(--green-50); color: var(--green-800); }
        .faq-action-btn--expand:hover { background: var(--green-100); }
        .faq-action-btn--collapse { background: #f3f4f6; color: var(--text-mid); }
        .faq-action-btn--collapse:hover { background: #e5e7eb; }

        /* ── accordion list ── */
        .faq-list {
          background: #fff;
          border: 1px solid var(--border);
          border-radius: var(--radius-xl);
          overflow: hidden;
          box-shadow: var(--shadow-sm);
        }

        .faq-item {
          border-bottom: 1px solid var(--border);
          animation: fadeUp .3s ease both;
          animation-delay: calc(var(--i) * 35ms);
        }
        .faq-item:last-child { border-bottom: none; }

        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        .faq-trigger {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          padding: 20px 28px;
          background: transparent;
          border: none;
          cursor: pointer;
          text-align: left;
          transition: background .15s;
        }
        .faq-trigger:hover { background: #fafaf9; }
        .faq-item--open .faq-trigger { background: var(--green-50); }

        .faq-q {
          flex: 1;
          font-size: 15px;
          font-family: Georgia, serif;
          font-weight: 500;
          color: var(--text-main);
          line-height: 1.45;
          transition: color .15s;
        }
        .faq-item--open .faq-q { color: var(--green-900); font-weight: 600; }

        .faq-chevron {
          width: 18px;
          height: 18px;
          flex-shrink: 0;
          color: var(--text-soft);
          transition: transform .3s ease, color .15s;
        }
        .faq-chevron--open { transform: rotate(180deg); color: var(--green-700); }

        .faq-body {
          max-height: 0;
          overflow: hidden;
          transition: max-height .35s cubic-bezier(.4,0,.2,1);
        }
        .faq-body--open { max-height: 1200px; }

        .faq-answer {
          padding: 0 28px 22px 28px;
          font-size: 14px;
          font-family: sans-serif;
          line-height: 1.75;
          color: var(--text-mid);
          border-top: 1px solid var(--border);
          padding-top: 18px;
        }
        .faq-answer p { margin: 0 0 10px; }
        .faq-answer p:last-child { margin-bottom: 0; }

        /* rich answer helpers */
        .faq-rich { display: flex; flex-direction: column; gap: 12px; }
        .faq-rich ul, .faq-rich ol { margin: 4px 0 0 18px; padding: 0; display: flex; flex-direction: column; gap: 4px; }
        .faq-rich li { font-size: 14px; color: var(--text-mid); line-height: 1.6; }
        .faq-rich strong { color: var(--text-main); font-weight: 600; }
        .faq-sub-heading { font-weight: 600; color: var(--text-main); margin: 0 0 4px; font-size: 13px; }

        /* empty */
        .faq-empty {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 64px 32px;
          text-align: center;
          background: #fff;
          border: 1px solid var(--border);
          border-radius: var(--radius-xl);
        }
        .faq-empty-icon { width: 48px; height: 48px; color: var(--text-soft); margin-bottom: 16px; }
        .faq-empty h3 { font-size: 16px; color: var(--text-main); margin: 0 0 6px; }
        .faq-empty p { font-size: 13px; font-family: sans-serif; color: var(--text-soft); margin: 0; }

        /* contact strip */
        .faq-contact-strip {
          margin-top: 24px;
          padding: 20px 28px;
          background: linear-gradient(135deg, var(--green-950), var(--green-800));
          border-radius: var(--radius-lg);
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
        }
        .faq-contact-strip p { font-size: 14px; font-family: sans-serif; color: rgba(255,255,255,.8); margin: 0; }
        .faq-contact-strip strong { color: #fff; }
        .faq-contact-link {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: #fff;
          color: var(--green-900);
          font-size: 13px;
          font-family: sans-serif;
          font-weight: 600;
          padding: 9px 18px;
          border-radius: 8px;
          text-decoration: none;
          white-space: nowrap;
          transition: opacity .15s;
          flex-shrink: 0;
        }
        .faq-contact-link:hover { opacity: .88; }

        /* ── responsive ── */
        @media (max-width: 768px) {
          .faq-hero-inner { grid-template-columns: 1fr; }
          .faq-body-wrap { grid-template-columns: 1fr; }
          .faq-sidebar { position: static; flex-direction: row; flex-wrap: wrap; }
          .faq-sidebar-label { display: none; }
          .faq-cat-btn { width: auto; }
          .faq-cat-name { display: none; }
          .faq-contact-strip { flex-direction: column; align-items: flex-start; }
          .faq-trigger { padding: 16px 20px; }
          .faq-answer { padding: 16px 20px 18px; }
        }
      `}</style>

      <div className="faq-page client-page-theme">

        <header className="sticky top-0 z-50 border-b bg-card/95 backdrop-blur">
          <div className="container flex h-16 items-center justify-between">

            <Link to="/" className="font-display text-xl font-bold text-foreground">
              Find Maids At The Agency
            </Link>

            <nav className="hidden md:flex items-center gap-8 text-sm font-medium">

              <a href="/" className="hover:text-primary">Home</a>
              <a href="/#services" className="hover:text-primary">Services</a>
              <a href="/#search" className="hover:text-primary">Search Maids</a>

              <NavLink to="/about" className={({ isActive }) => isActive ? "text-primary font-semibold" : "hover:text-primary"}>
                About Us
              </NavLink>

              <NavLink to="/enquiry2" className={({ isActive }) => isActive ? "text-primary font-semibold" : "hover:text-primary"}>
                Enquiry
              </NavLink>

              <NavLink to="/faq" className={({ isActive }) => isActive ? "text-primary font-semibold" : "hover:text-primary"}>
                FAQ
              </NavLink>

              <NavLink to="/contact" className={({ isActive }) => isActive ? "text-primary font-semibold" : "hover:text-primary"}>
                Contact Us
              </NavLink>
            </nav>

            <div className="flex items-center gap-2">

              <div className="hidden md:flex">
                {clientUser ? (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="flex items-center gap-2 border px-2 py-1 rounded-full hover:bg-muted transition">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={clientUser.profileImageUrl} />
                          <AvatarFallback>
                            {clientUser.name.slice(0, 1).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm">{clientUser.name}</span>
                      </button>
                    </DropdownMenuTrigger>

                    <DropdownMenuContent align="end" className="w-44">
                      <DropdownMenuLabel>My Account</DropdownMenuLabel>
                      <DropdownMenuSeparator />

                      <DropdownMenuItem asChild>
                        <Link to="/client/dashboard">Dashboard</Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link to="/client/profile">Profile</Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link to="/client/history">History</Link>
                      </DropdownMenuItem>

                      <DropdownMenuSeparator />

                      <DropdownMenuItem onClick={() => void handleLogout()}>
                        Logout
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                ) : (
                  <Link to="/employer-login">
                    <Button size="sm">Employer Login</Button>
                  </Link>
                )}
              </div>

              <button
                className="md:hidden"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              >
                <Menu />
              </button>
            </div>
          </div>

          {isMobileMenuOpen && (
            <div className="md:hidden absolute top-16 left-0 w-full bg-white shadow-lg border-t animate-in slide-in-from-top duration-200">

              <div className="flex flex-col p-4 space-y-3 text-sm font-medium">

                <Link to="/" className="py-2 px-3 rounded-lg hover:bg-muted">
                  Home
                </Link>

                <a href="/#services" className="py-2 px-3 rounded-lg hover:bg-muted">
                  Services
                </a>

                <a href="/#search" className="py-2 px-3 rounded-lg hover:bg-muted">
                  Search Maids
                </a>

                <Link to="/about" className="py-2 px-3 rounded-lg hover:bg-muted">
                  About Us
                </Link>

                <Link to="/enquiry2" className="py-2 px-3 rounded-lg hover:bg-muted">
                  Enquiry
                </Link>

                <Link to="/faw" className="py-2 px-3 rounded-lg hover:bg-muted">
                  FAQ
                </Link>

                <Link to="/contact" className="py-2 px-3 rounded-lg hover:bg-muted">
                  Contact
                </Link>

                <div className="border-t pt-3">
                  {!clientUser ? (
                    <Button className="w-40 mx-auto rounded-lg text-sm font-semibold shadow-sm">
                      <Link to="/employer-login" className="w-full block text-center">
                        Employer Login
                      </Link>
                    </Button>
                  ) : (
                    <Button variant="destructive" className="w-full" onClick={handleLogout}>
                      Logout
                    </Button>
                  )}
                </div>

              </div>
            </div>
          )}
      </header>

        {/* ── HERO ── */}
        <div className="faq-hero">
          <div className="faq-hero-inner">
            <div className="faq-hero-left">
              <div className="faq-badge">
                <Shield size={12} />
                Employer Guide · Singapore MOM Regulations
              </div>
              <h1>Frequently Asked<br />Questions</h1>
              <p>Everything you need to know about hiring and managing domestic workers in Singapore — from levy rates to legal obligations.</p>
              <div className="faq-search-wrap">
                <Search />
                <input
                  type="text"
                  placeholder="Search questions…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="faq-search-input"
                />
              </div>
              <div className="faq-stats">
                <div>
                  <div className="faq-stat-val">{faqItems.length}</div>
                  <div className="faq-stat-lbl">Total Questions</div>
                </div>
                <div>
                  <div className="faq-stat-val">{CATEGORIES.length - 1}</div>
                  <div className="faq-stat-lbl">Topics Covered</div>
                </div>
                <div>
                  <div className="faq-stat-val">MOM</div>
                  <div className="faq-stat-lbl">Compliant Info</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── BODY ── */}
        <div className="faq-body-wrap">

          {/* sidebar */}
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

          {/* right */}
          <div className="faq-right">
            <div className="faq-toolbar">
              <span className="faq-result-label">
                {filteredItems.length} question{filteredItems.length !== 1 ? "s" : ""}
                {search ? ` matching "${search}"` : ""}
              </span>
              <div className="faq-actions">
                <button className="faq-action-btn faq-action-btn--expand" onClick={expandAll}>Expand all</button>
                <button className="faq-action-btn faq-action-btn--collapse" onClick={collapseAll}>Collapse all</button>
              </div>
            </div>

            {filteredItems.length === 0 ? (
              <div className="faq-empty">
                <Search className="faq-empty-icon" />
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
              <p><strong>Can't find what you're looking for?</strong><br />Our team is happy to answer your questions directly.</p>
              <Link to="/contact" className="faq-contact-link">
                Contact Us <ArrowRight size={14} />
              </Link>
            </div>
          </div>
        </div>

        {/* ── FOOTER ── */}
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
    </>
  );
};

export default FAQPage;