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
  Phone,
  MapPin,
  Mail,
  Clock,
  Facebook,
} from "lucide-react";
import PublicSiteNavbar from "@/components/PublicSiteNavbar";

// ─── Data ────────────────────────────────────────────────────────────────────

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
      <div className="fq-rich">
        <div>
          <p className="fq-sub-head">Local Employers</p>
          <ul>
            <li>Identity Card (IC) of employer and household members</li>
            <li>Proof of income — Notice of Assessment or CPF contribution statements for the last 3 months</li>
          </ul>
        </div>
        <div>
          <p className="fq-sub-head">Expatriate Employers</p>
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
      <div className="fq-rich">
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
      <div className="fq-rich">
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
      <div className="fq-rich">
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
      <div className="fq-rich">
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
      <div className="fq-rich">
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

// ─── Hooks ────────────────────────────────────────────────────────────────────

function useInView(threshold = 0.06) {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setInView(true); obs.disconnect(); } },
      { threshold }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return { ref, inView };
}

// ─── Accordion Item ───────────────────────────────────────────────────────────

function AccordionItem({
  item,
  isOpen,
  onToggle,
  displayIndex,
}: {
  item: (typeof faqItems)[0];
  isOpen: boolean;
  onToggle: () => void;
  displayIndex: number;
}) {
  const numStr = String(displayIndex + 1).padStart(2, "0");

  return (
    <div className={`fq-item${isOpen ? " fq-item--open" : ""}`}>
      <button
        onClick={onToggle}
        aria-expanded={isOpen}
        className="fq-trigger"
      >
        <span className="fq-num" aria-hidden="true">
          {numStr}
        </span>
        <span className="fq-q">{item.q}</span>
        <span className="fq-chevron-badge" aria-hidden="true">
          <ChevronDown className="fq-chevron-icon" />
        </span>
      </button>

      <div
        className={`fq-panel${isOpen ? " fq-panel--open" : ""}`}
        role="region"
      >
        <div className="fq-answer">
          <div className="fq-answer-inner">
            {typeof item.a === "string" ? <p>{item.a}</p> : item.a}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

type FAQPageProps = { embedded?: boolean };

const FAQPage = ({ embedded = false }: FAQPageProps) => {
  const location = useLocation();
  const isEmbedded = embedded || location.pathname.startsWith("/client/");

  const [activeCategory, setActiveCategory] = useState("all");
  const [openIds, setOpenIds]     = useState(new Set<number>());
  const [search, setSearch]       = useState("");
  const [heroReady, setHeroReady] = useState(false);

  const heroRef = useRef<HTMLDivElement>(null);
  const { ref: bodyRef, inView: bodyInView } = useInView(0.04);

  useEffect(() => {
    const t = setTimeout(() => setHeroReady(true), 60);
    return () => clearTimeout(t);
  }, []);

  const filteredItems = useMemo(() => {
    let items =
      activeCategory === "all"
        ? faqItems
        : faqItems.filter((i) => i.cat === activeCategory);
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

  const toggle = (id: number) =>
    setOpenIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const switchCategory = (id: string) => {
    setActiveCategory(id);
    setOpenIds(new Set());
  };

  const catCounts = useMemo(() => {
    const m: Record<string, number> = {};
    CATEGORIES.forEach(({ id }) => {
      m[id] =
        id === "all" ? faqItems.length : faqItems.filter((i) => i.cat === id).length;
    });
    return m;
  }, []);

  return (
    <>
      <style>{CSS}</style>

      <div className="fq-page">
        {!isEmbedded && <PublicSiteNavbar />}

        {/* ══════════════════════════════════════════════════════
            HERO
        ══════════════════════════════════════════════════════ */}
        <header
          ref={heroRef}
          className={`fq-hero${heroReady ? " fq-hero--ready" : ""}`}
        >
          <div className="fq-hero-grid" aria-hidden="true" />
          <div className="fq-hero-topbar" aria-hidden="true" />
          <div className="fq-hero-wm" aria-hidden="true">FAQ</div>

          <div className="fq-hero-inner">
            {/* Left column */}
            <div className="fq-hero-copy">
              <div className="fq-hero-eyebrow">
                <span className="fq-hero-tag">
                  <Shield size={9} />
                  MOM Compliant
                </span>
                <span className="fq-hero-eyebrow-rule" />
                <span className="fq-hero-eyebrow-text">Singapore Employer Guide</span>
              </div>

              <h1 className="fq-hero-h1">
                <span className="fq-hero-h1-word">Frequently</span>
                <span className="fq-hero-h1-word">Asked</span>
                <span className="fq-hero-h1-word fq-hero-h1-word--gold">
                  Questions.
                </span>
              </h1>

              <p className="fq-hero-sub">
                Everything you need to know about hiring and managing domestic
                workers in Singapore — from levy rates to legal obligations.
              </p>

              <div className="fq-search-shell">
                <Search className="fq-search-icon" />
                <input
                  type="text"
                  placeholder="Search any question…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="fq-search-input"
                  aria-label="Search FAQ"
                />
                {search && (
                  <button
                    className="fq-search-clear"
                    onClick={() => setSearch("")}
                    aria-label="Clear search"
                  >
                    ×
                  </button>
                )}
              </div>

              <div className="fq-hero-stats">
                {[
                  { val: faqItems.length, label: "Questions" },
                  { val: CATEGORIES.length - 1, label: "Topics" },
                  { val: "MOM", label: "Verified" },
                ].map(({ val, label }, i) => (
                  <div key={label} className="fq-hero-stat">
                    {i > 0 && <div className="fq-hero-stat-div" />}
                    <span className="fq-hero-stat-val">{val}</span>
                    <span className="fq-hero-stat-label">{label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Right column: quick-jump topic card */}
            <div className="fq-hero-card">
              <div className="fq-hero-card-head">
                <span className="fq-hero-card-title">Browse Topics</span>
                <span className="fq-live-dot" aria-hidden="true" />
              </div>
              <div className="fq-hero-card-list">
                {CATEGORIES.slice(1).map(({ id, label, Icon }) => (
                  <button
                    key={id}
                    className="fq-hero-card-row"
                    onClick={() => switchCategory(id)}
                    aria-label={`Browse ${label}`}
                  >
                    <span className="fq-hero-card-icon">
                      <Icon size={14} />
                    </span>
                    <span className="fq-hero-card-label">{label}</span>
                    <span className="fq-hero-card-count">{catCounts[id]}</span>
                    <ArrowRight size={12} className="fq-hero-card-arrow" />
                  </button>
                ))}
              </div>
            </div>
          </div>
        </header>

        {/* SVG wave transition */}
        <div className="fq-wave" aria-hidden="true">
          <svg
            viewBox="0 0 1440 56"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            preserveAspectRatio="none"
          >
            <path
              d="M0 56 C240 20 480 4 720 22 C960 40 1200 56 1440 38 L1440 0 L0 0 Z"
              fill="#061d26"
            />
          </svg>
        </div>

        {/* ══════════════════════════════════════════════════════
            BODY
        ══════════════════════════════════════════════════════ */}
        <div
          ref={bodyRef}
          className={`fq-body${bodyInView ? " fq-body--visible" : ""}`}
        >
          {/* Sidebar */}
          <aside className="fq-sidebar" aria-label="FAQ categories">
            <span className="fq-sidebar-label">Filter by topic</span>
            {CATEGORIES.map(({ id, label, Icon }) => (
              <button
                key={id}
                onClick={() => switchCategory(id)}
                className={`fq-cat-btn${activeCategory === id ? " fq-cat-btn--on" : ""}`}
                aria-pressed={activeCategory === id}
              >
                <span className="fq-cat-icon">
                  <Icon size={14} />
                </span>
                <span className="fq-cat-name">{label}</span>
                <span className="fq-cat-pill">{catCounts[id]}</span>
              </button>
            ))}
          </aside>

          {/* Main */}
          <div className="fq-main">
            {/* Toolbar */}
            <div className="fq-toolbar">
              <p className="fq-result-copy">
                <strong>{filteredItems.length}</strong>{" "}
                {filteredItems.length === 1 ? "question" : "questions"}
                {search ? <em> matching "{search}"</em> : ""}
              </p>
              <div className="fq-toolbar-actions">
                <button
                  className="fq-action-btn fq-action-btn--expand"
                  onClick={() => setOpenIds(new Set(filteredItems.map((i) => i.id)))}
                >
                  Expand all
                </button>
                <button
                  className="fq-action-btn fq-action-btn--collapse"
                  onClick={() => setOpenIds(new Set())}
                >
                  Collapse all
                </button>
              </div>
            </div>

            {/* List or empty */}
            {filteredItems.length === 0 ? (
              <div className="fq-empty">
                <div className="fq-empty-icon">
                  <Search size={22} />
                </div>
                <h3>No results</h3>
                <p>Try a different keyword or pick a topic from the left.</p>
              </div>
            ) : (
              <div className="fq-list" role="list">
                {filteredItems.map((item, idx) => (
                  <AccordionItem
                    key={item.id}
                    item={item}
                    isOpen={openIds.has(item.id)}
                    onToggle={() => toggle(item.id)}
                    displayIndex={idx}
                  />
                ))}
              </div>
            )}

            {/* Contact strip */}
            <div className="fq-contact">
              <div className="fq-contact-copy">
                <p className="fq-contact-over">Still have questions?</p>
                <h2 className="fq-contact-h2">Talk to our team directly</h2>
                <p className="fq-contact-sub">
                  We're happy to answer anything not covered here.
                </p>
              </div>
              <div className="fq-contact-btns">
                <Link to="/contact" className="fq-contact-btn fq-contact-btn--ghost">
                  <Phone size={14} />
                  Call Us
                </Link>
                <Link to="/contact" className="fq-contact-btn fq-contact-btn--primary">
                  <MessageCircle size={14} />
                  Send a message
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════
            FOOTER  (matches ClientLandingPage footer)
        ══════════════════════════════════════════════════════ */}
        <footer style={{ background: "var(--teal-deep)", padding: "64px 0 0", fontFamily: "'Inter', sans-serif" }}>
          <div style={{ maxWidth: 1280, margin: "0 auto", padding: "0 24px" }}>

            {/* 5-column grid */}
            <div
              className="fq-footer-grid"
              style={{
                display: "grid",
                gridTemplateColumns: "1.4fr 1fr 1.2fr 1.2fr 0.8fr",
                gap: 36,
                marginBottom: 48,
              }}
            >
              {/* Brand */}
              <div>
                <h4
                  style={{
                    fontFamily: "'Playfair Display', Georgia, serif",
                    fontSize: 17,
                    fontWeight: 700,
                    color: "#fff",
                    margin: "0 0 12px",
                  }}
                >
                  "Find Maids" At The Agency
                </h4>
                <p style={{ fontSize: 13, color: "rgba(255,255,255,0.7)", lineHeight: 1.7, margin: 0 }}>
                  Matching trusted domestic professionals with families since 2009.
                </p>
              </div>

              {/* Quick Links */}
              <div>
                <h5 className="fq-footer-col-head">Quick Links</h5>
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
                      <Link
                        to={item.to}
                        style={{
                          color: "rgba(255,255,255,0.65)",
                          fontSize: 13,
                          textDecoration: "none",
                          transition: "color 0.15s",
                          fontFamily: "'Inter',sans-serif",
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.color = "var(--gold)")}
                        onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.65)")}
                      >
                        {item.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Contact Us */}
              <div>
                <h5 className="fq-footer-col-head">Contact Us</h5>
                <ul
                  style={{
                    listStyle: "none",
                    margin: 0,
                    padding: 0,
                    display: "flex",
                    flexDirection: "column",
                    gap: 10,
                    fontSize: 13,
                    color: "rgba(255,255,255,0.7)",
                    fontFamily: "'Inter',sans-serif",
                    lineHeight: 1.6,
                  }}
                >
                  <li style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                    <MapPin size={16} color="var(--gold)" style={{ flexShrink: 0, marginTop: 2 }} />
                    <span>3 Jalan Kukoh, #01-115<br />Singapore 161003</span>
                  </li>
                  <li style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <Mail size={16} color="var(--gold)" style={{ flexShrink: 0 }} />
                    <a
                      href="mailto:enquiries.j1@gmail.com"
                      style={{ color: "rgba(255,255,255,0.7)", textDecoration: "none", transition: "color 0.15s" }}
                      onMouseEnter={(e) => (e.currentTarget.style.color = "var(--gold)")}
                      onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.7)")}
                    >
                      enquiries.j1@gmail.com
                    </a>
                  </li>
                  <li style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <Phone size={16} color="var(--gold)" style={{ flexShrink: 0 }} />
                    <a
                      href="tel:+6580730757"
                      style={{ color: "rgba(255,255,255,0.7)", textDecoration: "none", transition: "color 0.15s" }}
                      onMouseEnter={(e) => (e.currentTarget.style.color = "var(--gold)")}
                      onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.7)")}
                    >
                      8073 0757
                    </a>
                  </li>
                </ul>
              </div>

              {/* Opening Hours */}
              <div>
                <h5 className="fq-footer-col-head">Opening Hours</h5>
                <ul
                  style={{
                    listStyle: "none",
                    margin: 0,
                    padding: 0,
                    display: "flex",
                    flexDirection: "column",
                    gap: 10,
                    fontSize: 13,
                    color: "rgba(255,255,255,0.7)",
                    fontFamily: "'Inter',sans-serif",
                    lineHeight: 1.6,
                  }}
                >
                  <li style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                    <Clock size={16} color="var(--gold)" style={{ flexShrink: 0, marginTop: 2 }} />
                    <span>Mon to Sun: 11:00am to 11:00pm</span>
                  </li>
                  <li style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                    <MessageCircle size={16} color="var(--gold)" style={{ flexShrink: 0, marginTop: 2 }} />
                    <span>Other hours: by mobile. If unable to reach us urgently, please SMS.</span>
                  </li>
                </ul>
              </div>

              {/* Follow Us */}
              <div>
                <h5 className="fq-footer-col-head">Follow Us</h5>
                <div style={{ display: "flex", gap: 10 }}>
                  <a
                    href="#"
                    aria-label="Facebook"
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      width: 36,
                      height: 36,
                      borderRadius: 8,
                      border: "1.5px solid rgba(255,255,255,0.18)",
                      color: "#1877F2",
                      transition: "all 0.15s",
                      textDecoration: "none",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.color = "var(--teal-deep)";
                      e.currentTarget.style.background = "#1877F2";
                      e.currentTarget.style.borderColor = "#1877F2";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.color = "#1877F2";
                      e.currentTarget.style.background = "transparent";
                      e.currentTarget.style.borderColor = "rgba(255,255,255,0.18)";
                    }}
                  >
                    <Facebook size={18} />
                  </a>
                </div>
              </div>
            </div>

            {/* Bottom bar */}
            <div
              style={{
                borderTop: "1px solid rgba(255,255,255,0.1)",
                padding: "20px 0",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                flexWrap: "wrap",
                gap: 12,
              }}
            >
              <p style={{ fontSize: 12, color: "rgba(255,255,255,0.45)", margin: 0, fontFamily: "'Inter',sans-serif" }}>
                © 2026 "Find Maids" At The Agency. All rights reserved.
              </p>
              <div style={{ display: "flex", gap: 6 }}>
                {["Privacy", "Terms", "Contact"].map((item) => (
                  <Link
                    key={item}
                    to="/contact"
                    style={{
                      fontSize: 12,
                      color: "rgba(255,255,255,0.45)",
                      textDecoration: "none",
                      padding: "0 8px",
                      fontFamily: "'Inter',sans-serif",
                      transition: "color 0.15s",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = "var(--gold)")}
                    onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.45)")}
                  >
                    {item}
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
};

// ─── CSS ─────────────────────────────────────────────────────────────────────

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;800;900&family=Inter:wght@400;500;600;700;800&display=swap');

/* ── Tokens ── */
.fq-page {
  --teal:        #0E4E5E;
  --teal-dk:     #0a3845;
  --teal-deep:   #061d26;
  --teal-mid:    #1a6b80;
  --teal-pale:   #edf8fb;
  --teal-mist:   #d8eef4;
  --gold:        #FCD34D;
  --gold-dk:     #d4a000;
  --gold-warm:   #fde68a;
  --gold-pale:   #fffbeb;
  --ink:         #0A2830;
  --mid:         #3d5c66;
  --soft:        #6e8f9a;
  --border:      #c8e4ec;
  --bg:          #f2f9fb;
  --surface:     #ffffff;
  --sans:        'Inter', system-ui, -apple-system, sans-serif;
  --serif:       'Playfair Display', Georgia, 'Times New Roman', serif;
  --mono:        'SF Mono', 'Fira Mono', Consolas, monospace;
  --r:           14px;
  --r-lg:        22px;
  --shadow:      0 4px 20px rgba(14,78,94,.09);
  --shadow-lg:   0 12px 48px rgba(14,78,94,.16);

  font-family: var(--sans);
  background: var(--bg);
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
}
.fq-page *, .fq-page *::before, .fq-page *::after { box-sizing: border-box; }

/* ══════════════════════════════════════════
   HERO
══════════════════════════════════════════ */
.fq-hero {
  background: var(--teal-deep);
  position: relative;
  overflow: hidden;
  isolation: isolate;
}

.fq-hero-grid {
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(rgba(255,255,255,.028) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255,255,255,.028) 1px, transparent 1px);
  background-size: 48px 48px;
  pointer-events: none;
  z-index: 0;
}

.fq-hero-topbar {
  position: absolute;
  top: 0; left: 0; right: 0;
  height: 4px;
  background: linear-gradient(90deg, var(--teal-deep) 0%, var(--gold) 30%, var(--gold-warm) 60%, var(--teal-deep) 100%);
  transform: scaleX(0);
  transform-origin: left;
  transition: transform 1s cubic-bezier(.16,1,.3,1) .05s;
  z-index: 2;
}
.fq-hero--ready .fq-hero-topbar { transform: scaleX(1); }

.fq-hero-wm {
  position: absolute;
  right: -3%;
  bottom: -10%;
  font-size: clamp(160px, 20vw, 320px);
  font-family: var(--serif);
  font-weight: 900;
  color: transparent;
  -webkit-text-stroke: 1.5px rgba(255,255,255,.045);
  line-height: 1;
  letter-spacing: -.04em;
  user-select: none;
  pointer-events: none;
  z-index: 0;
}

.fq-hero-inner {
  position: relative;
  z-index: 2;
  max-width: 1240px;
  margin: 0 auto;
  padding: 68px 40px 0;
  display: grid;
  grid-template-columns: 1fr 340px;
  gap: 60px;
  align-items: end;
}
.fq-hero-copy { padding-bottom: 60px; }

.fq-hero-eyebrow,
.fq-hero-h1,
.fq-hero-sub,
.fq-search-shell,
.fq-hero-stats {
  opacity: 0;
  transform: translateY(24px);
  transition: opacity .5s ease, transform .5s ease;
}
.fq-hero--ready .fq-hero-eyebrow  { opacity:1; transform:none; transition-delay:.10s; }
.fq-hero--ready .fq-hero-h1       { opacity:1; transform:none; transition-delay:.20s; }
.fq-hero--ready .fq-hero-sub      { opacity:1; transform:none; transition-delay:.30s; }
.fq-hero--ready .fq-search-shell  { opacity:1; transform:none; transition-delay:.40s; }
.fq-hero--ready .fq-hero-stats    { opacity:1; transform:none; transition-delay:.50s; }

.fq-hero-eyebrow {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 24px;
}
.fq-hero-tag {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-family: var(--mono);
  font-size: 10px;
  font-weight: 700;
  letter-spacing: .1em;
  text-transform: uppercase;
  color: var(--gold);
  background: rgba(252,211,77,.11);
  border: 1px solid rgba(252,211,77,.26);
  padding: 5px 11px;
  border-radius: 5px;
}
.fq-hero-eyebrow-rule {
  width: 28px; height: 1px;
  background: rgba(252,211,77,.35);
  flex-shrink: 0;
}
.fq-hero-eyebrow-text {
  font-family: var(--mono);
  font-size: 10px;
  font-weight: 500;
  letter-spacing: .09em;
  text-transform: uppercase;
  color: rgba(255,255,255,.3);
}

.fq-hero-h1 {
  font-family: var(--serif);
  font-size: clamp(38px, 5.2vw, 66px);
  font-weight: 800;
  line-height: 1.05;
  letter-spacing: -.03em;
  margin: 0 0 20px;
  color: #fff;
  display: flex;
  flex-direction: column;
}
.fq-hero-h1-word { display: block; }
.fq-hero-h1-word--gold {
  color: var(--gold);
  position: relative;
  width: fit-content;
}
.fq-hero-h1-word--gold::after {
  content: '';
  position: absolute;
  left: 0; right: 0;
  bottom: 3px;
  height: 3px;
  background: var(--gold);
  border-radius: 2px;
  transform: scaleX(0);
  transform-origin: left;
  transition: transform .75s cubic-bezier(.16,1,.3,1) .8s;
}
.fq-hero--ready .fq-hero-h1-word--gold::after { transform: scaleX(1); }

.fq-hero-sub {
  font-size: 15px;
  color: rgba(255,255,255,.52);
  line-height: 1.8;
  margin: 0 0 32px;
  max-width: 480px;
}

.fq-search-shell {
  position: relative;
  max-width: 480px;
  margin-bottom: 0;
}
.fq-search-icon {
  position: absolute;
  left: 15px; top: 50%; transform: translateY(-50%);
  width: 15px; height: 15px;
  color: rgba(255,255,255,.28);
  pointer-events: none;
  transition: color .2s;
}
.fq-search-shell:focus-within .fq-search-icon { color: var(--gold); }
.fq-search-input {
  width: 100%;
  padding: 14px 44px 14px 44px;
  background: rgba(255,255,255,.07);
  border: 1.5px solid rgba(255,255,255,.12);
  border-radius: var(--r);
  color: #fff;
  font-size: 14px;
  font-family: var(--sans);
  outline: none;
  transition: border-color .2s, background .2s, box-shadow .2s;
}
.fq-search-input::placeholder { color: rgba(255,255,255,.28); }
.fq-search-input:focus {
  border-color: var(--gold);
  background: rgba(255,255,255,.10);
  box-shadow: 0 0 0 4px rgba(252,211,77,.10);
}
.fq-search-clear {
  position: absolute;
  right: 14px; top: 50%; transform: translateY(-50%);
  background: rgba(255,255,255,.12);
  border: none;
  color: rgba(255,255,255,.6);
  width: 22px; height: 22px;
  border-radius: 50%;
  font-size: 15px;
  display: flex; align-items: center; justify-content: center;
  cursor: pointer;
  transition: background .15s;
  line-height: 1;
}
.fq-search-clear:hover { background: rgba(255,255,255,.2); }

.fq-hero-stats {
  display: flex;
  align-items: center;
  gap: 0;
  margin-top: 30px;
  padding-top: 26px;
  border-top: 1px solid rgba(255,255,255,.08);
}
.fq-hero-stat {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 0 28px 0 0;
}
.fq-hero-stat:first-child { padding-left: 0; }
.fq-hero-stat-div {
  width: 1px; height: 30px;
  background: rgba(255,255,255,.09);
  margin-right: 28px;
}
.fq-hero-stat-val {
  font-family: var(--serif);
  font-size: 26px;
  font-weight: 800;
  color: var(--gold);
  line-height: 1;
  letter-spacing: -.02em;
}
.fq-hero-stat-label {
  font-family: var(--mono);
  font-size: 9px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: .1em;
  color: rgba(255,255,255,.3);
  line-height: 1.4;
}

.fq-hero-card {
  margin-bottom: 44px;
  background: rgba(255,255,255,.055);
  border: 1px solid rgba(255,255,255,.09);
  border-radius: var(--r-lg);
  overflow: hidden;
  backdrop-filter: blur(10px);
  opacity: 0;
  transform: translateX(24px);
  transition: opacity .6s ease .45s, transform .6s ease .45s;
}
.fq-hero--ready .fq-hero-card { opacity: 1; transform: none; }

.fq-hero-card-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px 13px;
  border-bottom: 1px solid rgba(255,255,255,.07);
}
.fq-hero-card-title {
  font-family: var(--mono);
  font-size: 10px;
  font-weight: 700;
  letter-spacing: .12em;
  text-transform: uppercase;
  color: var(--gold);
}
.fq-live-dot {
  width: 8px; height: 8px;
  border-radius: 50%;
  background: var(--gold);
  animation: fq-pulse 2.2s ease-in-out infinite;
}
@keyframes fq-pulse {
  0%,100% { opacity: 1; transform: scale(1); }
  50%      { opacity: .45; transform: scale(.65); }
}

.fq-hero-card-list { padding: 10px 12px 12px; display: flex; flex-direction: column; gap: 3px; }
.fq-hero-card-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border-radius: 11px;
  border: 1px solid transparent;
  background: transparent;
  cursor: pointer;
  width: 100%; text-align: left;
  transition: background .16s, border-color .16s, transform .16s;
  font-family: var(--sans);
}
.fq-hero-card-row:hover {
  background: rgba(252,211,77,.09);
  border-color: rgba(252,211,77,.22);
  transform: translateX(5px);
}
.fq-hero-card-icon {
  width: 30px; height: 30px;
  border-radius: 8px;
  background: rgba(252,211,77,.12);
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
  color: var(--gold);
  transition: background .16s;
}
.fq-hero-card-row:hover .fq-hero-card-icon { background: rgba(252,211,77,.2); }
.fq-hero-card-label {
  flex: 1;
  font-size: 13px;
  font-weight: 500;
  color: rgba(255,255,255,.78);
}
.fq-hero-card-count {
  font-family: var(--mono);
  font-size: 11px;
  font-weight: 600;
  color: rgba(255,255,255,.25);
}
.fq-hero-card-arrow {
  color: rgba(255,255,255,.18);
  flex-shrink: 0;
  transition: color .16s, transform .16s;
}
.fq-hero-card-row:hover .fq-hero-card-arrow {
  color: var(--gold);
  transform: translateX(3px);
}

/* Wave */
.fq-wave {
  background: var(--bg);
  margin-bottom: -1px;
  line-height: 0;
  display: block;
  overflow: hidden;
}
.fq-wave svg { display: block; width: 100%; height: 56px; }

/* ══════════════════════════════════════════
   BODY LAYOUT
══════════════════════════════════════════ */
.fq-body {
  flex: 1;
  max-width: 1240px;
  margin: 0 auto;
  width: 100%;
  padding: 40px 40px 80px;
  display: grid;
  grid-template-columns: 210px 1fr;
  gap: 40px;
  align-items: start;
}

.fq-body > * {
  opacity: 0;
  transform: translateY(16px);
  transition: opacity .5s ease, transform .5s ease;
}
.fq-body--visible > * { opacity: 1; transform: none; }
.fq-body--visible > .fq-main { transition-delay: .10s; }

/* ── Sidebar ── */
.fq-sidebar {
  position: sticky;
  top: 88px;
}
.fq-sidebar-label {
  display: block;
  font-family: var(--mono);
  font-size: 9px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: .14em;
  color: var(--soft);
  padding: 0 4px 12px;
}
.fq-cat-btn {
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 9px 12px 9px 10px;
  border-radius: 11px;
  border: 1.5px solid transparent;
  background: transparent;
  cursor: pointer;
  transition: background .16s, border-color .16s, transform .16s;
  text-align: left;
  width: 100%;
  font-family: var(--sans);
  margin-bottom: 2px;
  position: relative;
}
.fq-cat-btn::before {
  content: '';
  position: absolute;
  left: 0; top: 20%; bottom: 20%;
  width: 3px;
  border-radius: 0 3px 3px 0;
  background: var(--teal);
  transform: scaleY(0);
  transform-origin: center;
  transition: transform .2s ease;
}
.fq-cat-btn--on::before { transform: scaleY(1); }
.fq-cat-btn:hover:not(.fq-cat-btn--on) {
  background: var(--teal-pale);
  border-color: var(--teal-mist);
  transform: translateX(3px);
}
.fq-cat-btn--on {
  background: var(--teal);
  border-color: var(--teal);
  box-shadow: 0 4px 18px rgba(14,78,94,.22);
}
.fq-cat-icon {
  width: 28px; height: 28px;
  border-radius: 8px;
  background: var(--teal-mist);
  border: 1px solid var(--border);
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
  color: var(--teal);
  transition: background .16s, border-color .16s, color .16s;
}
.fq-cat-btn--on .fq-cat-icon {
  background: rgba(255,255,255,.16);
  border-color: transparent;
  color: #fff;
}
.fq-cat-name {
  flex: 1;
  font-size: 13px;
  font-weight: 500;
  color: var(--mid);
  white-space: nowrap;
  transition: color .16s;
}
.fq-cat-btn--on .fq-cat-name { color: #fff; }
.fq-cat-pill {
  font-family: var(--mono);
  font-size: 10px;
  font-weight: 700;
  background: var(--teal-mist);
  color: var(--teal);
  padding: 2px 7px;
  border-radius: 100px;
  transition: background .16s, color .16s;
}
.fq-cat-btn--on .fq-cat-pill {
  background: rgba(252,211,77,.22);
  color: var(--gold-warm);
}

/* ── Toolbar ── */
.fq-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 14px;
}
.fq-result-copy {
  font-size: 13px;
  font-family: var(--mono);
  color: var(--soft);
  letter-spacing: .03em;
  margin: 0;
}
.fq-result-copy strong { color: var(--teal); }
.fq-result-copy em { font-style: italic; color: var(--mid); }
.fq-toolbar-actions { display: flex; gap: 6px; }
.fq-action-btn {
  font-family: var(--mono);
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: .08em;
  padding: 7px 14px;
  border-radius: 9px;
  border: 1.5px solid transparent;
  cursor: pointer;
  transition: background .14s, transform .14s;
}
.fq-action-btn:hover { transform: translateY(-1px); }
.fq-action-btn--expand {
  background: var(--gold-pale);
  color: #7a5500;
  border-color: var(--gold-warm);
}
.fq-action-btn--expand:hover { background: #fef3c7; }
.fq-action-btn--collapse {
  background: var(--teal-pale);
  color: var(--teal);
  border-color: var(--teal-mist);
}
.fq-action-btn--collapse:hover { background: var(--teal-mist); }

/* ══════════════════════════════════════════
   FAQ LIST & ACCORDION
══════════════════════════════════════════ */
.fq-list {
  background: var(--surface);
  border: 1.5px solid var(--border);
  border-radius: var(--r-lg);
  overflow: hidden;
  box-shadow: var(--shadow);
}

.fq-item {
  border-bottom: 1px solid var(--border);
  position: relative;
}
.fq-item:last-child { border-bottom: none; }

.fq-item::before {
  content: '';
  position: absolute;
  left: 0; top: 0; bottom: 0;
  width: 4px;
  background: linear-gradient(180deg, var(--gold-dk) 0%, var(--gold) 50%, var(--gold-warm) 100%);
  transform: scaleY(0);
  transform-origin: top;
  transition: transform .32s cubic-bezier(.4,0,.2,1);
  border-radius: 0 3px 3px 0;
  z-index: 1;
}
.fq-item--open::before { transform: scaleY(1); }

.fq-trigger {
  display: grid;
  grid-template-columns: 52px 1fr 34px;
  align-items: center;
  width: 100%;
  padding: 22px 22px 22px 20px;
  background: transparent;
  border: none;
  cursor: pointer;
  text-align: left;
  transition: background .15s;
  gap: 0;
}
.fq-trigger:hover { background: var(--teal-pale); }
.fq-item--open .fq-trigger { background: #eef8fb; }

.fq-num {
  font-family: var(--serif);
  font-size: 28px;
  font-weight: 800;
  line-height: 1;
  letter-spacing: -.03em;
  color: var(--teal-mist);
  transition: color .22s;
  padding-left: 4px;
  user-select: none;
}
.fq-item--open .fq-num { color: var(--teal); }

.fq-q {
  font-family: var(--serif);
  font-size: 15.5px;
  font-weight: 500;
  line-height: 1.45;
  color: var(--ink);
  padding: 0 16px;
  transition: color .15s;
}
.fq-item--open .fq-q { color: var(--teal-dk); font-weight: 600; }

.fq-chevron-badge {
  width: 28px; height: 28px;
  border-radius: 8px;
  background: var(--bg);
  border: 1.5px solid var(--border);
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
  transition: background .2s, border-color .2s;
}
.fq-item--open .fq-chevron-badge {
  background: var(--teal);
  border-color: var(--teal);
}
.fq-chevron-icon {
  width: 14px; height: 14px;
  color: var(--soft);
  transition: transform .3s cubic-bezier(.4,0,.2,1), color .2s;
}
.fq-item--open .fq-chevron-icon {
  transform: rotate(180deg);
  color: #fff;
}

.fq-panel {
  max-height: 0;
  overflow: hidden;
  transition: max-height .38s cubic-bezier(.4,0,.2,1);
}
.fq-panel--open { max-height: 1600px; }

.fq-answer {
  padding: 16px 24px 26px 76px;
  border-top: 1px solid var(--border);
  background: linear-gradient(135deg, #fafeff 0%, #f4fafc 100%);
  position: relative;
}
.fq-answer::before {
  content: '';
  position: absolute;
  left: 52px; top: 20px; bottom: 20px;
  width: 2px;
  background: linear-gradient(180deg, var(--gold), rgba(252,211,77,.2));
  border-radius: 2px;
}

.fq-answer-inner {
  font-size: 14px;
  font-family: var(--sans);
  line-height: 1.82;
  color: var(--mid);
  padding-left: 16px;
}
.fq-answer-inner p { margin: 0 0 10px; }
.fq-answer-inner p:last-child { margin: 0; }
.fq-answer-inner strong { color: var(--ink); font-weight: 700; }

.fq-rich { display: flex; flex-direction: column; gap: 14px; }
.fq-rich ul, .fq-rich ol {
  margin: 4px 0 0; padding: 0;
  list-style: none;
  display: flex; flex-direction: column; gap: 7px;
}
.fq-rich ul li {
  display: flex; align-items: flex-start; gap: 10px;
  font-size: 14px; color: var(--mid); line-height: 1.68;
}
.fq-rich ul li::before {
  content: '';
  display: inline-block;
  width: 5px; height: 5px;
  border-radius: 50%;
  background: var(--gold-dk);
  margin-top: 8px;
  flex-shrink: 0;
}
.fq-rich ol { counter-reset: fq-ol; }
.fq-rich ol li {
  counter-increment: fq-ol;
  display: flex; align-items: flex-start; gap: 10px;
  font-size: 14px; color: var(--mid); line-height: 1.68;
}
.fq-rich ol li::before {
  content: counter(fq-ol);
  font-family: var(--mono);
  font-size: 10px; font-weight: 700;
  background: var(--teal-mist);
  color: var(--teal);
  width: 20px; height: 20px;
  display: flex; align-items: center; justify-content: center;
  border-radius: 5px;
  flex-shrink: 0; margin-top: 2px;
}
.fq-rich strong { color: var(--ink); font-weight: 700; }
.fq-sub-head {
  font-family: var(--mono);
  font-size: 10px; font-weight: 700;
  text-transform: uppercase;
  letter-spacing: .1em;
  color: var(--teal);
  margin: 0 0 6px;
}

/* ── Empty state ── */
.fq-empty {
  display: flex; flex-direction: column; align-items: center;
  padding: 80px 32px; text-align: center;
  background: var(--surface);
  border: 1.5px solid var(--border);
  border-radius: var(--r-lg);
}
.fq-empty-icon {
  width: 56px; height: 56px;
  background: var(--teal-pale);
  border: 1.5px solid var(--border);
  border-radius: 14px;
  display: flex; align-items: center; justify-content: center;
  color: var(--teal);
  margin-bottom: 16px;
}
.fq-empty h3 {
  font-family: var(--serif);
  font-size: 16px; font-weight: 700;
  color: var(--ink); margin: 0 0 6px;
}
.fq-empty p {
  font-size: 13px; color: var(--soft);
  margin: 0; font-family: var(--sans);
}

/* ══════════════════════════════════════════
   CONTACT STRIP
══════════════════════════════════════════ */
.fq-contact {
  margin-top: 24px;
  padding: 28px 32px 28px 36px;
  background: var(--teal);
  border-radius: var(--r-lg);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  position: relative;
  overflow: hidden;
}
.fq-contact::before {
  content: '';
  position: absolute;
  left: 0; top: 0; bottom: 0;
  width: 4px;
  background: linear-gradient(180deg, var(--gold-dk), var(--gold), var(--gold-warm));
}
.fq-contact::after {
  content: '';
  position: absolute;
  width: 260px; height: 260px;
  border-radius: 50%;
  background: rgba(252,211,77,.07);
  right: -60px; bottom: -90px;
  pointer-events: none;
}
.fq-contact-copy { position: relative; z-index: 1; }
.fq-contact-over {
  font-family: var(--mono);
  font-size: 10px; font-weight: 700;
  text-transform: uppercase; letter-spacing: .12em;
  color: var(--gold); margin: 0 0 5px;
}
.fq-contact-h2 {
  font-family: var(--serif);
  font-size: 18px; font-weight: 700;
  color: #fff; margin: 0 0 4px;
}
.fq-contact-sub {
  font-size: 13px; font-family: var(--sans);
  color: rgba(255,255,255,.55); margin: 0;
}
.fq-contact-btns {
  position: relative; z-index: 1;
  display: flex; gap: 10px; flex-shrink: 0;
}
.fq-contact-btn {
  display: inline-flex; align-items: center; gap: 8px;
  font-size: 13px; font-family: var(--sans); font-weight: 700;
  padding: 12px 20px;
  border-radius: 11px;
  text-decoration: none;
  transition: background .16s, transform .16s, box-shadow .16s;
  white-space: nowrap;
}
.fq-contact-btn--ghost {
  background: rgba(255,255,255,.1);
  color: rgba(255,255,255,.82);
  border: 1.5px solid rgba(255,255,255,.14);
}
.fq-contact-btn--ghost:hover {
  background: rgba(255,255,255,.17);
  transform: translateY(-2px);
}
.fq-contact-btn--primary {
  background: var(--gold);
  color: var(--teal-deep);
}
.fq-contact-btn--primary:hover {
  background: var(--gold-warm);
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(252,211,77,.28);
}

/* ══════════════════════════════════════════
   FOOTER (matches ClientLandingPage)
══════════════════════════════════════════ */
.fq-footer-col-head {
  font-size: 11px;
  font-weight: 700;
  color: #fff;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  margin: 0 0 16px;
  font-family: 'Inter', sans-serif;
}

/* Responsive footer grid */
@media (max-width: 900px) {
  .fq-footer-grid { grid-template-columns: 1fr 1fr !important; gap: 28px !important; }
}
@media (max-width: 520px) {
  .fq-footer-grid { grid-template-columns: 1fr !important; }
}

/* ══════════════════════════════════════════
   RESPONSIVE
══════════════════════════════════════════ */
@media (max-width: 980px) {
  .fq-hero-inner { grid-template-columns: 1fr; padding: 52px 28px 0; gap: 0; }
  .fq-hero-copy { padding-bottom: 40px; }
  .fq-hero-card { display: none; }
  .fq-body { grid-template-columns: 1fr; padding: 24px 24px 56px; gap: 20px; }
  .fq-sidebar { position: static; display: flex; flex-wrap: wrap; gap: 6px; }
  .fq-sidebar-label { display: none; }
  .fq-cat-btn { width: auto; padding: 7px 10px; }
  .fq-cat-btn::before { display: none; }
  .fq-cat-name { display: none; }
}
@media (max-width: 600px) {
  .fq-hero-inner { padding: 44px 20px 0; }
  .fq-hero-h1 { font-size: 36px; }
  .fq-trigger { grid-template-columns: 36px 1fr 30px; padding: 16px 14px 16px 14px; }
  .fq-num { font-size: 18px; }
  .fq-q { font-size: 14px; padding: 0 10px; }
  .fq-answer { padding: 14px 16px 20px 56px; }
  .fq-answer::before { left: 36px; }
  .fq-answer-inner { padding-left: 12px; }
  .fq-contact { flex-direction: column; align-items: flex-start; padding: 22px 22px 22px 28px; }
}

/* ══════════════════════════════════════════
   REDUCED MOTION
══════════════════════════════════════════ */
@media (prefers-reduced-motion: reduce) {
  .fq-hero-eyebrow, .fq-hero-h1, .fq-hero-sub,
  .fq-search-shell, .fq-hero-stats, .fq-hero-card,
  .fq-body > * { opacity: 1 !important; transform: none !important; transition: none !important; }
  .fq-hero-topbar { transform: none !important; }
  .fq-hero--ready .fq-hero-h1-word--gold::after { transform: scaleX(1); }
  .fq-live-dot { animation: none !important; }
}
`;

export default FAQPage;