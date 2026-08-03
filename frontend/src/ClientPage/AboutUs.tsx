import { Link } from "react-router-dom";
import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  ChevronRight,
  MapPin,
  Mail,
  Phone,
  Clock,
  MessageCircle,
  PhoneCall,
  Facebook,
  ShieldCheck,
  Languages,
  Award,
  Plane,
} from "lucide-react";
import PublicSiteNavbar from "@/components/PublicSiteNavbar";
import PublicSiteFooter from "@/components/PublicSiteFooter";

type AboutUsProps = {
  embedded?: boolean;
};

/* ---------------------------------------------------------
   Shared Tailwind class strings (kept literal so the
   Tailwind content scanner can pick every utility up).
--------------------------------------------------------- */
const SERIF = "font-[Fraunces,serif]";
const MONO = "font-['JetBrains_Mono',monospace]";

const BTN_BASE =
  "inline-flex items-center gap-2 rounded text-[0.8rem] font-bold uppercase tracking-wide px-6 py-3 transition-all duration-200 active:scale-95 whitespace-nowrap focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FCD34D]";

const BTN_AMBER = `${BTN_BASE} bg-[#FCD34D] text-[#0B2024] shadow-[0_1px_0_rgba(0,0,0,0.08)] hover:bg-[#ffdd66] hover:-translate-y-0.5 hover:shadow-[0_10px_20px_rgba(0,0,0,0.22)]`;

const BTN_GHOST =
  `${BTN_BASE} bg-transparent text-white/70 border border-white/20 hover:border-white/55 hover:text-white hover:-translate-y-0.5`;

const BTN_AMBER_SM =
  "inline-flex items-center gap-1.5 rounded bg-[#FCD34D] text-[#0B2024] px-4 py-2.5 text-xs font-bold uppercase tracking-wide transition-all duration-200 hover:bg-[#ffdd66] hover:-translate-y-px active:scale-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FCD34D]";

const BTN_OUTLINE_AMBER =
  "inline-flex items-center gap-2 rounded border-2 border-[#FCD34D] text-[#FCD34D] px-6 py-3.5 text-[0.78rem] font-bold uppercase tracking-wide transition-all duration-200 hover:bg-[#FCD34D] hover:text-[#0B2024] hover:-translate-y-0.5 active:scale-95 whitespace-nowrap focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white";

/* ---------------------------------------------------------
   useMounted — drives the hero's one-time staggered
   entrance (above the fold, so it plays immediately).
--------------------------------------------------------- */
function useMounted() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(id);
  }, []);
  return mounted;
}

/* ---------------------------------------------------------
   useInView + Reveal — fades/lifts content in once it
   scrolls into the viewport. No keyframes required: just
   toggles Tailwind opacity/translate classes.
--------------------------------------------------------- */
function useInView<T extends HTMLElement>(threshold = 0.18) {
  const ref = useRef<T | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setVisible(true);
            obs.disconnect();
          }
        });
      },
      { threshold }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return { ref, visible };
}

const Reveal = ({
  children,
  className = "",
  delayClass = "",
}: {
  children: ReactNode;
  className?: string;
  delayClass?: string;
}) => {
  const { ref, visible } = useInView<HTMLDivElement>();
  return (
    <div
      ref={ref}
      className={`transition-all duration-700 ease-out motion-reduce:transition-none motion-reduce:transform-none ${delayClass} ${
        visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
      } ${className}`}
    >
      {children}
    </div>
  );
};

/* ---------------------------------------------------------
   Stamp badge — the page's signature element: an ink
   rubber-stamp, the kind a placement office would use,
   with the agency name set on a curved baseline.
--------------------------------------------------------- */
const StampBadge = ({
  size = 150,
  className = "",
}: {
  size?: number;
  className?: string;
}) => (
  <svg
    viewBox="0 0 200 200"
    width={size}
    height={size}
    className={className}
    aria-hidden="true"
  >
    <defs>
      <path id="rz-stamp-arc" d="M 100,100 m -76,0 a 76,76 0 1,1 152,0 a 76,76 0 1,1 -152,0" />
    </defs>
    <circle cx="100" cy="100" r="92" fill="none" stroke="#0E4E5E" strokeWidth={1} opacity={0.55} />
    <circle cx="100" cy="100" r="76" fill="none" stroke="#0E4E5E" strokeWidth={2.5} />
    <circle cx="100" cy="100" r="56" fill="#FFF6DC" stroke="#0E4E5E" strokeWidth={1.5} />
    <text className="fill-[#0E4E5E] text-[9.5px] font-bold tracking-[0.05em] font-['JetBrains_Mono',monospace]">
      <textPath href="#rz-stamp-arc" startOffset="2%">
        ✦ EST. 2005 ✦ SINGAPORE ✦ ON RECORD ✦
      </textPath>
    </text>
    <text x="100" y="95" textAnchor="middle" className="fill-[#0E4E5E] text-[20px] font-black tracking-[0.02em] font-[Fraunces,serif]">
      RINZIN
    </text>
    <text x="100" y="118" textAnchor="middle" className="fill-[#9C7300] text-[13px] font-bold tracking-[0.12em] font-[Fraunces,serif]">
      AGENCY
    </text>
  </svg>
);


const ORIGIN_ENTRIES = [
  { code: "F-01", label: "Darjeeling & Sikkim Maids" },
  { code: "F-01A", label: "Manipur, Mizoram, Arunachal & Assam" },
  { code: "F-01B", label: "Indian Nepalese & Nepalese Helpers" },
  { code: "F-02", label: "Nepalese — Hindu (Veg & Non-veg)" },
  { code: "F-03", label: "Tibetan — Buddhist" },
  { code: "F-04", label: "Manipur — English Speaking" },
  { code: "F-05", label: "Filipino — Video Interview Available" },
  { code: "F-06", label: "Myanmar Helpers" },
  { code: "F-07", label: "Indonesian Domestic Helpers" },
];

const PLACEMENT_GROUPS = [
  {
    code: "NE-IN",
    border: "border-l-[#0E4E5E]",
    codeBg: "bg-[#E1EFF1] text-[#0E4E5E]",
    dot: "bg-[#0E4E5E]",
    region: "India & Himalayan Region",
    items: ["Darjeeling & Sikkim", "Nepalese — Hindu", "Tibetan — Buddhist", "Manipur — Christian"],
  },
  {
    code: "SEA",
    border: "border-l-[#9C7300]",
    codeBg: "bg-[#FFF6DC] text-[#9C7300]",
    dot: "bg-[#9C7300]",
    region: "Philippines & Myanmar",
    items: ["Filipino — Video Interview", "Myanmar — Fresh & Transfer", "Indonesian (Selective)", "South Indian"],
  },
  {
    code: "SEL",
    border: "border-l-[#186B80]",
    codeBg: "bg-[#E6F1F4] text-[#186B80]",
    dot: "bg-[#186B80]",
    region: "Extended Origins",
    items: ["Punjabi", "Lahaul & Spiti", "Himachal Pradesh", "Ladakh"],
  },
];

const WHY_ROWS = [
  {
    icon: ShieldCheck,
    title: "Verified & screened",
    desc: "Every helper is personally vetted, including video interviews for Filipino candidates.",
  },
  {
    icon: Languages,
    title: "Cultural matching",
    desc: "We match language, diet and religious background for a harmonious household.",
  },
  {
    icon: PhoneCall,
    title: "SMS crisis support",
    desc: "A dedicated team on standby — any issue resolved swiftly and personally.",
  },
  {
    icon: Award,
    title: "Pioneer since 2005",
    desc: "First to bring helpers from Lahaul, Spiti and Ladakh to Singapore families.",
  },
];

const AboutUs = ({ embedded = false }: AboutUsProps) => {
  const mounted = useMounted();

  return (
    <div className={`${"font-[Inter,sans-serif]"} flex min-h-screen flex-col bg-white text-[#0B2024]`}>
      {!embedded && <PublicSiteNavbar />}

      {/* Only what Tailwind genuinely can't express: the font import
          and two looping keyframes (marquee + flight path dot). */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300;0,9..144,600;0,9..144,700;0,9..144,900;1,9..144,300;1,9..144,600;1,9..144,700&family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500;700&display=swap');

        @keyframes rz-marquee {
          from { transform: translateX(0); }
          to   { transform: translateX(-50%); }
        }
        @keyframes rz-fly {
          0%   { left: 6%;  top: 54%; opacity: 0; transform: translate(-50%,-50%) rotate(58deg) scale(.78); }
          10%  { opacity: 1; }
          28%  { left: 29%; top: 24%; transform: translate(-50%,-50%) rotate(50deg) scale(1); }
          50%  { left: 50%; top: 10%; transform: translate(-50%,-50%) rotate(45deg) scale(1.08); }
          72%  { left: 71%; top: 24%; transform: translate(-50%,-50%) rotate(40deg) scale(1); }
          90%  { opacity: 1; }
          100% { left: 94%; top: 54%; opacity: 0; transform: translate(-50%,-50%) rotate(32deg) scale(.78); }
        }
        .rz-flight {
          position: absolute;
          color: #FCD34D;
          filter: drop-shadow(0 3px 5px rgba(252,211,77,.35));
          animation: rz-fly 7s cubic-bezier(.45,.05,.55,.95) infinite;
          will-change: left, top, transform, opacity;
        }
        .rz-flight-trail {
          position: absolute;
          right: 11px;
          top: 50%;
          width: 28px;
          height: 1px;
          transform: translateY(-50%);
          background: linear-gradient(to left, rgba(252,211,77,.75), transparent);
        }
        @media (prefers-reduced-motion: reduce) {
          .rz-flight { animation: none; left: 50%; top: 10%; transform: translate(-50%,-50%) rotate(45deg); }
        }
      `}</style>

      <main className="flex-1">

        {/* ── HERO ── */}
        <section className="relative overflow-hidden bg-[#062930]">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(rgba(255,255,255,0.06)_1px,transparent_1px)] bg-[length:22px_22px]" />
          <div className="pointer-events-none absolute -right-[10%] -top-[20%] h-[140%] w-[60%] bg-[radial-gradient(closest-side,rgba(252,211,77,0.08),transparent_70%)]" />

          <div className="relative z-10 mx-auto grid max-w-[1180px] grid-cols-1 items-center gap-10 px-5 py-16 sm:px-8 sm:py-20 lg:grid-cols-[1fr_420px] lg:gap-10 lg:py-24">

            {/* left */}
            <div>
              <div
                className={`relative mb-7 inline-flex -rotate-2 items-center gap-2 bg-[#FCD34D] px-4 py-2 text-[0.7rem] font-bold tracking-wide text-[#0B2024] shadow-[3px_4px_0_rgba(0,0,0,0.22)] transition-all duration-500 ease-out ${
                  mounted ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-2"
                }`}
              >
                CASE FILE · OPENED 2005
                <span className="absolute -bottom-1.5 left-0 h-0 w-0 border-l-[6px] border-t-[6px] border-l-transparent border-t-black/30" />
              </div>

              <h1
                className={`${SERIF} mb-6 text-[clamp(2.4rem,8vw,4.1rem)] font-black leading-[1.05] tracking-[-0.03em] text-white transition-all delay-100 duration-700 ease-out ${
                  mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
                }`}
              >
                Placing{" "}
                <span className="italic text-[#FCD34D]">trusted</span>
                <br />helpers in families
                <br />
                <span className="relative inline-block">
                  worldwide.
                  <span
                    className={`absolute -bottom-0.5 left-0 h-[3px] w-full origin-left rounded bg-[#FCD34D] transition-transform duration-700 ease-out delay-500 ${
                      mounted ? "scale-x-100" : "scale-x-0"
                    }`}
                  />
                </span>
              </h1>

              <p
                className={`mb-9 max-w-[480px] text-base font-light leading-[1.85] text-white/60 transition-all delay-200 duration-700 ease-out ${
                  mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
                }`}
              >
                Rinzin Agency, also known as At The Agency, specialises in carefully selected maids and migrant domestic workers from North East India, Nepal, Myanmar, Indonesia and the Philippines — matched to your family's unique needs.
              </p>

              <div
                className={`flex flex-wrap items-center gap-4 transition-all delay-300 duration-700 ease-out ${
                  mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
                }`}
              >
                <Link to="/search-maids" className={BTN_AMBER}>
                  Find a Helper <ChevronRight size={14} />
                </Link>
                <a href="#about-story" className={BTN_GHOST}>
                  Our Story
                </a>
              </div>
            </div>

            {/* right — case card */}
            <div
              className={`mx-auto w-full max-w-[420px] transition-all delay-300 duration-700 ease-out lg:mx-0 ${
                mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
              }`}
            >
              <div className="relative rotate-[1.4deg] rounded-sm bg-[#F4F7F6] px-7 pb-10 pt-8 shadow-[0_36px_70px_rgba(0,0,0,0.4)] transition-transform duration-500 ease-out hover:-translate-y-1.5 hover:rotate-0">

                {/* staple dots */}
                <span className="absolute left-[18px] top-3.5 h-2.5 w-2.5 rounded-full bg-[radial-gradient(circle_at_35%_30%,#fff_0%,#aab4b6_45%,#6e7a7c_100%)] shadow-[0_1px_2px_rgba(0,0,0,0.4)]" />
                <span className="absolute left-[34px] top-3.5 h-2.5 w-2.5 rounded-full bg-[radial-gradient(circle_at_35%_30%,#fff_0%,#aab4b6_45%,#6e7a7c_100%)] shadow-[0_1px_2px_rgba(0,0,0,0.4)]" />

                <div className="mb-4 flex items-center gap-2 text-[0.66rem] font-bold uppercase tracking-wide text-[#9C7300]">
                  <span className="relative inline-flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#9C7300] opacity-60" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-[#9C7300]" />
                  </span>
                  Status: Active
                </div>

                <div className={`${SERIF} mb-5 border-b border-[#E1E9E8] pb-4 text-[1.2rem] font-bold text-[#0E4E5E]`}>
                  Placement Record
                </div>

                {[
                  { label: "Families served", value: "2,000", suffix: "+" },
                  { label: "Years active", value: "20", suffix: "+" },
                  { label: "Source countries", value: "6", suffix: "+" },
                  { label: "Verification", value: "100", suffix: "%" },
                ].map((row) => (
                  <div className="flex items-baseline gap-2 py-2.5" key={row.label}>
                    <span className="whitespace-nowrap text-[0.72rem] text-[#54707A]">{row.label}</span>
                    <span className="-translate-y-1 flex-1 border-b border-dotted border-[#8FA8AE]" />
                    <span className={`${SERIF} whitespace-nowrap text-[1.15rem] font-bold text-[#0B2024]`}>
                      {row.value}
                      <span className="text-[#0E4E5E]">{row.suffix}</span>
                    </span>
                  </div>
                ))}

                <div className="mt-5 border-t border-[#E1E9E8] pt-4 text-[0.78rem] leading-relaxed text-[#54707A]">
                  First agency to introduce helpers from Lahaul, Spiti &amp; Ladakh to Singapore families.
                </div>

                <div
                  className={`absolute -bottom-7 -right-5 transition-all duration-700 ease-out delay-700 sm:-bottom-8 sm:-right-6 ${
                    mounted ? "opacity-100 scale-100 rotate-[-10deg]" : "opacity-0 scale-[2] rotate-[-16deg]"
                  }`}
                >
                  <StampBadge size={120} className="block sm:w-[130px] sm:h-[130px]" />
                </div>
              </div>
            </div>

          </div>
        </section>

        {/* ── YELLOW DIVIDER ── */}
        <div className="h-[11px] w-full bg-[#FCD34D]" />

        {/* ── STORY ── */}
        <section className="bg-white py-16 sm:py-20 lg:py-24" id="about-story">
          <div className="mx-auto max-w-[1180px] px-5 sm:px-8">
            <div className="grid grid-cols-1 gap-12 lg:grid-cols-[1fr_380px] lg:gap-16">

              <Reveal>
                <div className={`${MONO} mb-4 flex items-center gap-2 text-[0.7rem] font-bold uppercase tracking-wide text-[#0E4E5E]`}>
                  <span className="text-[#9C7300]">§</span> Our Story
                </div>
                <h2 className={`${SERIF} mb-6 text-[clamp(1.9rem,5vw,2.7rem)] font-bold leading-[1.14] tracking-[-0.025em] text-[#0B2024]`}>
                  A pioneer in<br /><em className="font-normal italic text-[#0E4E5E]">North East Indian</em><br />domestic helpers
                </h2>
                <div className="space-y-4 text-[0.9375rem] font-light leading-[1.9] text-[#54707A]">
                  <p>In 2005, as a Singaporean Chinese who had traveled India far and wide, we became the <strong className="font-semibold text-[#0B2024]">first agency</strong> to introduce helpers from Lahaul and Spiti, Himachal Pradesh, and Ladakh to Singapore families.</p>
                  <p>RINZIN has been providing quality North East Indian, Indian Nepalese, Nepalese, Filipino, Myanmar and Indonesian domestic helpers to Singapore families for over two decades. We recruit from Darjeeling, Manipur, Sikkim, Mizoram, Arunachal Pradesh and Assam.</p>
                  <p>Our candidates include fresh and transfer maids, as well as domestic helpers with previous experience in Singapore, the Middle East and Hong Kong.</p>
                  <p>We deal with real people from different cultures. When problems arise, we face and solve them swiftly — every challenge has made us a better agency.</p>
                </div>
                <div className="mt-7 border-l-[3px] border-[#FCD34D] py-1 pl-6">
                  <p className={`${SERIF} text-[1.1rem] italic leading-[1.55] text-[#0E4E5E]`}>"The right worker, delivered on time."</p>
                </div>
              </Reveal>

              <Reveal delayClass="delay-150">
                <div className="lg:sticky lg:top-6">
                  <div className="rounded-sm bg-[#062930]">
                    <div className="border-b border-dashed border-white/15 px-7 pt-7 pb-5">
                      <div className={`${SERIF} mb-1 text-[1.1rem] font-bold text-white`}>North East Indian Specialists</div>
                      <div className="text-[0.74rem] text-white/45">Our founding strength &amp; core expertise</div>
                    </div>
                    <div className="py-2">
                      {ORIGIN_ENTRIES.map((entry) => (
                        <div
                          key={entry.code}
                          className="flex items-center gap-3.5 px-7 py-3 text-[0.85rem] text-white/80 transition-all duration-150 hover:bg-white/5 hover:px-8"
                        >
                          <span className={`${MONO} flex-shrink-0 rounded bg-[#FCD34D]/15 px-1.5 py-0.5 text-[0.68rem] font-bold text-[#FCD34D]`}>
                            {entry.code}
                          </span>
                          {entry.label}
                        </div>
                      ))}
                    </div>
                    <div className="mt-2 rounded-b-sm bg-black/20 px-7 py-6">
                      <p className="mb-3.5 text-[0.78rem] text-white/45">Interested in a specific region or background?</p>
                      <Link to="/enquiry2" className={BTN_AMBER_SM}>
                        Enquire Now <ChevronRight size={12} />
                      </Link>
                    </div>
                  </div>
                </div>
              </Reveal>

            </div>
          </div>
        </section>

        {/* ── PLACEMENTS ── */}
        <section className="bg-[#F4F7F6] py-16 sm:py-20 lg:py-24">
          <div className="mx-auto max-w-[1180px] px-5 sm:px-8">
            <Reveal className="mb-10 sm:mb-12">
              <div className={`${MONO} mb-4 flex items-center gap-2 text-[0.7rem] font-bold uppercase tracking-wide text-[#0E4E5E]`}>
                <span className="text-[#9C7300]">§</span> Placement Origins
              </div>
              <h2 className={`${SERIF} mb-0 text-[clamp(1.9rem,5vw,2.7rem)] font-bold leading-[1.14] tracking-[-0.025em] text-[#0B2024]`}>
                New &amp; Transfer<br /><em className="font-normal italic text-[#0E4E5E]">Foreign Domestic Helpers</em>
              </h2>
              <p className="mt-3 max-w-[380px] text-[0.9375rem] font-light leading-[1.75] text-[#54707A]">
                Six source countries, matched by culture, language, and dietary preference.
              </p>
            </Reveal>

            <div className="mb-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {PLACEMENT_GROUPS.map((group, i) => (
                <Reveal
                  key={group.code}
                  delayClass={i === 1 ? "delay-100" : i === 2 ? "delay-200" : ""}
                >
                  <div
                    className={`h-full rounded-md border border-[#DCE7E8] bg-white px-6 pb-5 pt-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_16px_40px_rgba(14,78,94,0.12)] border-l-4 ${group.border}`}
                  >
                    <span className={`${MONO} mb-4 inline-block rounded px-2 py-1 text-[0.68rem] font-bold tracking-wide ${group.codeBg}`}>
                      {group.code}
                    </span>
                    <div className={`${SERIF} mb-3.5 text-[1.05rem] font-bold text-[#0B2024]`}>{group.region}</div>
                    <ul>
                      {group.items.map((item) => (
                        <li
                          key={item}
                          className="flex items-center gap-2.5 border-b border-[#E1E9E8] py-2.5 text-[0.84rem] text-[#54707A] last:border-none"
                        >
                          <span className={`h-1.5 w-1.5 flex-shrink-0 rounded-full ${group.dot}`} />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                </Reveal>
              ))}
            </div>

            <Reveal>
              <div className="flex flex-col items-start gap-5 rounded-md bg-[#062930] px-6 py-7 sm:flex-row sm:items-center sm:justify-between sm:px-9">
                <p className="text-[0.9375rem] font-light leading-[1.65] text-white/65">
                  Have a specific language or culture preference? <strong className="font-semibold text-white">We'll shortlist the right candidates for you.</strong>
                </p>
                <Link to="/enquiry2" className={`${BTN_AMBER_SM} flex-shrink-0`}>
                  Get Started <ChevronRight size={13} />
                </Link>
              </div>
            </Reveal>
          </div>
        </section>

        {/* ── WHY US ── */}
        <section className="bg-white py-16 sm:py-20 lg:py-24">
          <div className="mx-auto max-w-[1180px] px-5 sm:px-8">
            <div className="grid grid-cols-1 gap-12 lg:grid-cols-[380px_1fr] lg:gap-16">

              <Reveal>
                <div className={`${MONO} mb-4 flex items-center gap-2 text-[0.7rem] font-bold uppercase tracking-wide text-[#0E4E5E]`}>
                  <span className="text-[#9C7300]">§</span> Why Rinzin
                </div>
                <h2 className={`${SERIF} mb-5 text-[clamp(1.7rem,4.5vw,2.4rem)] font-bold leading-[1.16] tracking-[-0.025em] text-[#0B2024]`}>
                  We're <em className="font-normal italic text-[#0E4E5E]">different.</em><br />Call us and<br />find out.
                </h2>
                <p className="mb-6 text-[0.9375rem] font-light leading-[1.85] text-[#54707A]">
                  Our crisis management team is reachable via SMS to ensure placing a helper with us is completely stress-free. We are result-oriented and driven to match you with the best candidate.
                </p>
                <div className="inline-flex items-center gap-2.5 rounded bg-[#E1EFF1] px-4 py-3">
                  <span className="flex h-6.5 w-6.5 flex-shrink-0 items-center justify-center rounded-full bg-[#0E4E5E] text-white">
                    <MessageCircle size={14} />
                  </span>
                  <span className="text-[0.8rem] font-semibold text-[#0E4E5E]">SMS Crisis Support — always on standby</span>
                </div>
              </Reveal>

              <Reveal delayClass="delay-100">
                <div className="border-t border-[#DCE7E8]">
                  {WHY_ROWS.map(({ icon: Icon, title, desc }) => (
                    <div
                      key={title}
                      className="flex items-start gap-5 border-b border-[#DCE7E8] border-l-[3px] border-l-transparent py-5 px-1 transition-all duration-200 hover:border-l-[#9C7300] hover:bg-[#F4F7F6] hover:px-3.5"
                    >
                      <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-[#E1EFF1] text-[#0E4E5E]">
                        <Icon size={18} />
                      </span>
                      <div>
                        <div className={`${SERIF} mb-1 text-base font-bold text-[#0B2024]`}>{title}</div>
                        <div className="text-[0.84rem] leading-[1.7] text-[#54707A]">{desc}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </Reveal>

            </div>
          </div>
        </section>

        {/* ── INTL ── */}
        <section className="bg-white pb-16 sm:pb-20 lg:pb-24">
          <div className="mx-auto max-w-[1180px] px-5 sm:px-8">
            <Reveal>
              <div className="relative overflow-hidden rounded-xl bg-[#0E4E5E] px-6 py-10 shadow-[0_18px_45px_rgba(7,43,53,0.16)] sm:px-10 sm:py-12 lg:px-14">
                <div className="relative z-10 grid grid-cols-1 items-center gap-7 md:grid-cols-[minmax(0,1fr)_auto] md:gap-12">
                  <div>
                    <div className={`${MONO} mb-3.5 flex items-center gap-2 text-[0.68rem] font-bold uppercase tracking-wide text-[#FCD34D]`}>
                      <MapPin size={11} />
                      International Placements
                    </div>
                    <h3 className={`${SERIF} mb-3.5 text-[clamp(1.5rem,4vw,2.1rem)] font-bold leading-[1.2] text-white`}>
                      Serving Clients in<br />Europe &amp; the UK
                    </h3>
                    <p className="max-w-[460px] text-[0.9375rem] font-light leading-[1.8] text-white/60">
                      We relocate fresh and experienced helpers to reputable clients in <strong className="font-semibold text-white/90">Europe</strong> and the <strong className="font-semibold text-white/90">United Kingdom</strong>. Email your requirements and we'll shortlist the best candidates for you.
                    </p>
                  </div>
                  <div className="md:justify-self-end">
                    <a href="mailto:enquiry@rinzinagency.com" className={`${BTN_OUTLINE_AMBER} w-full justify-center sm:w-auto`}>
                      <Mail size={14} />
                      Email Requirements
                    </a>
                  </div>
                </div>

                <div className="relative mt-12 h-20 sm:mt-14">
                  <div className="absolute left-[6%] right-[6%] top-[54%] h-px bg-[linear-gradient(to_right,rgba(255,255,255,0.32)_50%,transparent_50%)] bg-[length:10px_1px]" />
                  <div className="absolute left-[6%] top-[54%] flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-full bg-[#FCD34D]" />
                    <span className={`${MONO} whitespace-nowrap text-[0.64rem] font-bold tracking-wide text-white/65`}>SINGAPORE</span>
                  </div>
                  <div className="absolute left-[94%] top-[54%] flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-full bg-[#FCD34D]" />
                    <span className={`${MONO} whitespace-nowrap text-[0.64rem] font-bold tracking-wide text-white/65`}>EUROPE / UK</span>
                  </div>
                  <div className="rz-flight" aria-hidden="true">
                    <span className="rz-flight-trail" />
                    <Plane size={19} strokeWidth={2.4} />
                  </div>
                </div>
              </div>
            </Reveal>
          </div>
        </section>

      </main>

      {/* ── FOOTER ── */}
      <style>{`
        .au-footer-grid {
          display: grid;
          grid-template-columns: 1.4fr 1fr 1.2fr 1.2fr 0.8fr;
          gap: 36px;
          margin-bottom: 48px;
        }
        @media (max-width: 900px) {
          .au-footer-grid { grid-template-columns: 1fr 1fr !important; gap: 28px !important; }
        }
        @media (max-width: 520px) {
          .au-footer-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
      {false && <footer style={{ background: "#0B1F25", padding: "64px 0 0" }}>
        <div style={{ maxWidth: 1280, margin: "0 auto", padding: "0 24px" }}>
          <div className="au-footer-grid">

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
              <h5 style={{ fontSize: 11, fontWeight: 700, color: "#fff", letterSpacing: "0.1em", textTransform: "uppercase" as const, margin: "0 0 16px", fontFamily: "'Inter', sans-serif" }}>
                Quick Links
              </h5>
              <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column" as const, gap: 10 }}>
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
                      style={{ color: "#fff", fontSize: 13, textDecoration: "none", transition: "color 0.15s", fontFamily: "'Inter', sans-serif" }}
                      onMouseEnter={(e) => (e.currentTarget.style.color = "#FCD34D")}
                      onMouseLeave={(e) => (e.currentTarget.style.color = "#fff")}>
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Contact Us */}
            <div>
              <h5 style={{ fontSize: 11, fontWeight: 700, color: "#fff", letterSpacing: "0.1em", textTransform: "uppercase" as const, margin: "0 0 16px", fontFamily: "'Inter', sans-serif" }}>
                Contact Us
              </h5>
              <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column" as const, gap: 10, fontSize: 13, color: "#fff", fontFamily: "'Inter', sans-serif", lineHeight: 1.6 }}>
                <li style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                  <MapPin size={16} color="#FCD34D" style={{ flexShrink: 0, marginTop: 2 }} />
                  <span>3 Jalan Kukoh, #01-115<br />Singapore 161003</span>
                </li>
                <li style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <Mail size={16} color="#FCD34D" style={{ flexShrink: 0 }} />
                  <a href="mailto:enquiries.j1@gmail.com"
                    style={{ color: "#fff", textDecoration: "none", transition: "color 0.15s" }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = "#FCD34D")}
                    onMouseLeave={(e) => (e.currentTarget.style.color = "#fff")}>
                    enquiries.j1@gmail.com
                  </a>
                </li>
                <li style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <Phone size={16} color="#FCD34D" style={{ flexShrink: 0 }} />
                  <a href="tel:+6580730757"
                    style={{ color: "#fff", textDecoration: "none", transition: "color 0.15s" }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = "#FCD34D")}
                    onMouseLeave={(e) => (e.currentTarget.style.color = "#fff")}>
                    8073 0757
                  </a>
                </li>
              </ul>
            </div>

            {/* Opening Hours */}
            <div>
              <h5 style={{ fontSize: 11, fontWeight: 700, color: "#fff", letterSpacing: "0.1em", textTransform: "uppercase" as const, margin: "0 0 16px", fontFamily: "'Inter', sans-serif" }}>
                Opening Hours
              </h5>
              <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column" as const, gap: 10, fontSize: 13, color: "#fff", fontFamily: "'Inter', sans-serif", lineHeight: 1.6 }}>
                <li style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                  <Clock size={16} color="#FCD34D" style={{ flexShrink: 0, marginTop: 2 }} />
                  <span>Mon to Sun: 11:00am to 11:00pm</span>
                </li>
                <li style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                  <MessageCircle size={16} color="#FCD34D" style={{ flexShrink: 0, marginTop: 2 }} />
                  <span>Other hours: by mobile. If unable to reach us urgently, please SMS.</span>
                </li>
              </ul>
            </div>

            {/* Follow Us */}
            <div>
              <h5 style={{ fontSize: 11, fontWeight: 700, color: "#fff", letterSpacing: "0.1em", textTransform: "uppercase" as const, margin: "0 0 16px", fontFamily: "'Inter', sans-serif" }}>
                Follow Us
              </h5>
              <div style={{ display: "flex", gap: 10 }}>
                <a href="#" aria-label="Facebook"
                  style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 36, height: 36, borderRadius: 8, border: "1.5px solid rgba(255,255,255,0.18)", color: "#1877F2", transition: "all 0.15s" }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = "#0B1F25";
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
          <div style={{ borderTop: "1px solid rgba(255,255,255,0.1)", padding: "20px 0", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap" as const, gap: 12 }}>
            <p style={{ fontSize: 12, color: "#fff", margin: 0, fontFamily: "'Inter', sans-serif" }}>
              © 2026 "Find Maids" At The Agency. All rights reserved.
            </p>
            <div style={{ display: "flex", gap: 6 }}>
              {["Privacy", "Terms", "Contact"].map((item) => (
                <Link key={item} to="/enquiry2"
                  style={{ fontSize: 12, color: "#fff", textDecoration: "none", padding: "0 8px", fontFamily: "'Inter', sans-serif", transition: "color 0.15s" }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = "#FCD34D")}
                  onMouseLeave={(e) => (e.currentTarget.style.color = "#fff")}>
                  {item}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </footer>}
      <PublicSiteFooter />

    </div>
  );
};

export default AboutUs;
