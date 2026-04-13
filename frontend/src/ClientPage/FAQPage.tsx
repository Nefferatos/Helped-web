import { useState, useMemo } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Menu, ChevronDown, Search } from "lucide-react";
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
  type ClientUser,
} from "@/lib/clientAuth";


const faqData = [
  {
    id: "employer",
    title: "For Employers",
    icon: "🏠",
    items: [
      {
        id: 1,
        q: "Why should you hire us?",
        a: "Our maid agencies provide selected, well-trained and quality maids, and we genuinely value the needs of our customers. Every agency listed on Bestmaid is vetted and licensed.",
      },
      {
        id: 2,
        q: "Are you a licensed maid agency?",
        a: "Yes. All maid agencies listed at Bestmaid are licensed. The Ministry of Manpower (MOM) issues the licence to operate the Maids Recruitment and Deployment business.",
      },
      {
        id: 3,
        q: "How long does it take to get a maid from overseas?",
        a: "If the Work Permit application is processed correctly, it typically takes one to four weeks for the maid to arrive and begin work. The timeline may vary depending on the maid's country of origin.",
      },
      {
        id: 4,
        q: "What is the Maid Levy?",
        a: "As per MOM regulation, an employer must pay a maid levy — a monthly tax paid to the government for every Foreign Domestic Worker (FDW) employed in Singapore.",
      },
      {
        id: 5,
        q: "How much is the maid levy?",
        a: (
          <div className="space-y-2 text-sm leading-relaxed text-gray-600">
            <p>The standard levy is <strong>S$300.00 per month</strong> (S$9.87 per day) for the duration of the valid work permit.</p>
            <p>A <strong>concessionary rate of S$60/month</strong> applies if you have in the same household:</p>
            <ul className="list-disc pl-5 space-y-1 mt-1">
              <li>A child below 16 years old</li>
              <li>An elderly person at least 67 years old</li>
              <li>A Person with Disabilities (PWD) certified by a Singapore-registered doctor</li>
            </ul>
            <p>Payment must be made via GIRO (General Interbank Recurring Order).</p>
          </div>
        ),
      },
      {
        id: 6,
        q: "What countries can I employ a maid from?",
        a: "You may only employ maids from MOM-approved source countries: Indonesia, Philippines, India, Myanmar, Bangladesh, Cambodia, Sri Lanka, Hong Kong, Macau, Malaysia, South Korea, Taiwan, and Thailand.",
      },
      {
        id: 7,
        q: "What is a security bond and how much is it?",
        a: "Employers must post a security deposit (bond) of S$5,000 per maid with the Work Permit Department, MOM. You are responsible for repatriating the maid when the two-year contract expires or is terminated. Failure to repatriate risks forfeiture of the deposit.",
      },
      {
        id: 8,
        q: "What are the alternatives to the S$5,000 security deposit?",
        a: "You may purchase an insurance policy from ANDA or NTUC Income instead of making the full S$5,000 cash deposit — a significantly cheaper alternative.",
      },
      {
        id: 9,
        q: "What is the Personal Accident Insurance?",
        a: (
          <div className="space-y-2 text-sm leading-relaxed text-gray-600">
            <p>Employers must purchase personal accident insurance for their maid with a minimum insured sum of <strong>S$10,000</strong>. Approved insurers include:</p>
            <ul className="list-disc pl-5 space-y-1 mt-1">
              <li><strong>Augaries Insurance</strong> — 116 Lavender Street, #02-05 Pek Chuan Building. Tel: 6293 6232</li>
              <li><strong>ANDA Insurance Agencies Pte Ltd</strong> — 60 Eu Tong Sen Street, #01-13/14 Furama Hotel. Tel: 6534-2288</li>
              <li><strong>NTUC Income Insurance</strong> — 75 Bras Basah Road, NTUC Income Centre. Tel: 6336-3322</li>
            </ul>
          </div>
        ),
      },
      {
        id: 10,
        q: "Do maids need to undergo medical check-ups and how often?",
        a: "Yes. Within 14 days of arriving in Singapore, the maid must be examined by a certified medical institution. She may only begin work upon passing. Medical screening — covering VDRL, pregnancy, and HIV — is required every six months.",
      },
      {
        id: 11,
        q: "Who bears the responsibility for a maid's medical expenses?",
        a: "As the employer, you are liable for the full cost of medical expenses, including hospitalisation. It is strongly recommended that you obtain hospitalization insurance coverage for your maid.",
      },
      {
        id: 12,
        q: "What are the criteria to claim tax relief for maid levy?",
        a: (
          <div className="space-y-2 text-sm leading-relaxed text-gray-600">
            <p>You may be eligible for tax relief (two times the levy paid for one maid) if you meet any of the following:</p>
            <ul className="list-disc pl-5 space-y-1 mt-1">
              <li>You are a married woman and have elected for separate assessment.</li>
              <li>You are married and your husband is not resident in Singapore.</li>
              <li>You are separated, divorced, or widowed and living with an unmarried child for whom you can claim child relief.</li>
            </ul>
            <p>The relief can only be offset against the wife's earned income. Single taxpayers are not eligible.</p>
          </div>
        ),
      },
      {
        id: 13,
        q: "How does a maid remit money to her home country?",
        a: "Several licensed remittance service providers operate in Singapore, including ActionPlus Remittance Services, Ameertech Remittance Services, Metro Remittance Centre, and MoneyNet Remittance Service. Your maid can use any MAS-registered provider to send money home.",
      },
      {
        id: 14,
        q: "What should I do if my maid goes missing?",
        a: "Cancel her work permit immediately to stop the levy payment. You are given one month to locate and repatriate her. Failure to do so risks forfeiture of the S$5,000 security deposit.",
      },
      {
        id: 15,
        q: "What happens if my maid gets pregnant?",
        a: "You must repatriate the maid immediately. FDWs are not permitted to remain in Singapore while pregnant as per MOM regulations.",
      },
      {
        id: 16,
        q: "Can I employ a maid on a part-time basis?",
        a: "No. Current MOM regulations do not permit part-time employment of Foreign Domestic Workers.",
      },
      {
        id: 17,
        q: "What is a 'Transfer Maid'?",
        a: "Transfer maids are already residing locally in Singapore, meaning they do not need to be brought in from their country of origin. They are typically from another employer and are seeking a new placement — for example, due to expiry of a two-year contract or the employer discontinuing the arrangement.",
      },
      {
        id: 18,
        q: "What are the employer's obligations to the maid?",
        a: (
          <div className="space-y-2 text-sm leading-relaxed text-gray-600">
            <p>Per MOM regulations, employers are responsible for:</p>
            <ul className="list-disc pl-5 space-y-1 mt-1">
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
        id: 19,
        q: "What are the employer's obligations to the Immigration Department?",
        a: "The obligations of the employer to the Immigration Department are stated clearly in the Security Bond. Employers should read and understand all terms before signing.",
      },
      {
        id: 20,
        q: "What documents are needed for a first-time employer?",
        a: (
          <div className="space-y-3 text-sm leading-relaxed text-gray-600">
            <div>
              <p className="font-semibold text-gray-700">Local Employers need to provide:</p>
              <ul className="list-disc pl-5 space-y-1 mt-1">
                <li>Identity Card (IC) of employer and household members</li>
                <li>Proof of income — Notice of Assessment or CPF contribution statements for the last 3 months</li>
              </ul>
            </div>
            <div>
              <p className="font-semibold text-gray-700">Expatriate Employers need to provide:</p>
              <ul className="list-disc pl-5 space-y-1 mt-1">
                <li>Passport copies of self and all family members</li>
                <li>Employment Pass and Dependent Passes for family members residing in Singapore</li>
                <li>Proof of income or employment letter stating position, salary, and commencement date</li>
              </ul>
            </div>
          </div>
        ),
      },
      {
        id: 21,
        q: "What is the procedure for cancellation of a work permit?",
        a: (
          <div className="space-y-2 text-sm leading-relaxed text-gray-600">
            <p>Submit the following to MOM:</p>
            <ol className="list-decimal pl-5 space-y-1 mt-1">
              <li>A letter to MOM requesting termination of services and repatriation</li>
              <li>Return ticket to the maid's country of origin</li>
              <li>A copy of the maid's passport</li>
              <li>The maid's Work Permit card</li>
            </ol>
          </div>
        ),
      },
      {
        id: 22,
        q: "What is the average salary of a Myanmar maid?",
        a: "Myanmar maid salary ranges from approximately S$450–S$550, depending on skill level. Experienced or transfer Myanmar maids typically earn S$500–S$650 or more.",
      },
      {
        id: 23,
        q: "What is the average salary of a Filipino maid?",
        a: "The Philippine Overseas Employment Administration stipulates a minimum salary of S$570. New or transfer Filipino maids typically earn S$570–S$650, while more experienced maids may command S$600–S$750 or higher.",
      },
      {
        id: 24,
        q: "What is the average salary of an Indonesian maid?",
        a: "New Indonesian maids typically earn S$550–S$570. Experienced Indonesian maids earn S$600–S$750 or more, depending on skill sets and years of experience.",
      },
      {
        id: 25,
        q: "What is the average salary of a Sri Lankan maid?",
        a: "New Sri Lankan maids earn approximately S$480–S$550. Experienced Sri Lankan maids start from S$650 and above.",
      },
      {
        id: 26,
        q: "What is the average salary of an Indian maid?",
        a: "Indian maid salaries range from approximately S$400–S$600, increasing with experience and specialised skills.",
      },
      {
        id: 27,
        q: "What is the salary of a Bangladeshi maid?",
        a: "Approximately S$400–S$600. Salary increases with experience.",
      },
      {
        id: 28,
        q: "What is the salary of a Punjabi maid?",
        a: "Starting from approximately S$480. The salary increases with experience and skill level.",
      },
      {
        id: 29,
        q: "What are transfer maids?",
        a: "Transfer maids are currently residing in Singapore and can be interviewed in person before hiring, which is a key advantage over new maids who are overseas.",
      },
      {
        id: 30,
        q: "What are new maids?",
        a: "New maids are currently not residing in Singapore. Even if they have previously worked in Singapore or abroad, they are classified as 'new maids' as long as they are not currently in Singapore.",
      },
      {
        id: 31,
        q: "Why should I approach a maid agency?",
        a: "Maid agencies provide professional and comprehensive services covering recruitment, training, Work Permit applications, security bonds, insurance, travel arrangements, immigration clearance, and medical screening — saving you significant time and effort.",
      },
      {
        id: 32,
        q: "Which countries can I employ a maid from?",
        a: "MOM-approved source countries for Foreign Domestic Workers (FDWs) include: Malaysia, Philippines, Indonesia, Thailand, Myanmar, Sri Lanka, India, and Bangladesh.",
      },
      {
        id: 33,
        q: "Can I claim tax relief for maid levy?",
        a: "Yes, if you are a married woman under separate assessment, married with a non-resident husband, or separated/divorced/widowed with an unmarried child. The relief is two times the levy paid for one maid, applied against the wife's earned income only.",
      },
    ],
  },
  {
    id: "agency",
    title: "For Maid Agencies",
    icon: "🏢",
    items: [
      {
        id: 34,
        q: "How do I hide an existing maid listing?",
        a: (
          <div className="space-y-2 text-sm leading-relaxed text-gray-600">
            <p>To hide a maid (e.g. if reserved or blacklisted), use the <strong>Hide this Maid</strong> function:</p>
            <ol className="list-decimal pl-5 space-y-1 mt-1">
              <li>Log in to your agency account.</li>
              <li>Click <strong>EDIT/DELETE MAIDS</strong>.</li>
              <li>Under the maid you want to hide, click <strong>Select for hide</strong>.</li>
              <li>Click the <strong>Hide the selected maids</strong> button.</li>
            </ol>
            <p>You can still access hidden maids via <strong>EDIT/DELETE MAIDS → Maids Hided</strong>, where you can un-hide or delete them.</p>
          </div>
        ),
      },
      {
        id: 35,
        q: "Why should maid agencies list maids at Bestmaid?",
        a: "It's all about reaching more employers. Bestmaid actively advertises across the top search engines — Google, Yahoo, and MSN — driving potential employers directly to your listings and helping you grow your placement business.",
      },
      {
        id: 36,
        q: "How do I log in to Bestmaid?",
        a: (
          <div className="space-y-2 text-sm leading-relaxed text-gray-600">
            <p>There are two ways to log in:</p>
            <ol className="list-decimal pl-5 space-y-1 mt-1">
              <li>From the <strong>homepage</strong> — use the login form at the top of the page.</li>
              <li>From <strong>any other page</strong> — a login link is available in the top navigation area.</li>
            </ol>
            <p>After logging in, your admin dashboard gives you access to <strong>ADD MAIDS</strong>, <strong>EDIT/DELETE MAIDS</strong>, <strong>COMPANY PROFILE</strong>, and <strong>CHANGE PASSWORD</strong>.</p>
            <p>To try a demo, use <strong>Username: demo</strong> / <strong>Password: demo</strong>.</p>
          </div>
        ),
      },
      {
        id: 37,
        q: "How do I add a maid profile?",
        a: (
          <div className="space-y-2 text-sm leading-relaxed text-gray-600">
            <p>Click <strong>ADD MAIDS</strong> in the top navigation bar. You can enter:</p>
            <ul className="list-disc pl-5 space-y-1 mt-1">
              <li>Bio-data: name, code, nationality, height, weight, English level, experience, preferences</li>
              <li>A detailed introduction</li>
              <li>Up to 5 photos (first must be passport-sized: 100×125 px)</li>
              <li>A compressed video file</li>
            </ul>
            <p>Once submitted, click <strong>ADD MAIDS</strong> again to add another profile.</p>
          </div>
        ),
      },
      {
        id: 38,
        q: "How do I edit or delete an existing maid profile?",
        a: (
          <div className="space-y-2 text-sm leading-relaxed text-gray-600">
            <p>Click <strong>EDIT/DELETE MAIDS</strong> from the top navigation. Select <strong>MAIDS IN PUBLIC</strong> or <strong>MAIDS HIDED</strong> to view your listings.</p>
            <p>Click a maid's photo to access options to:</p>
            <ul className="list-disc pl-5 space-y-1 mt-1">
              <li>Modify her bio-data</li>
              <li>Change her photos</li>
              <li>Change her video file</li>
              <li>Delete the profile</li>
            </ul>
          </div>
        ),
      },
      {
        id: 39,
        q: "How do I update my company profile?",
        a: (
          <div className="space-y-2 text-sm leading-relaxed text-gray-600">
            <p>Click <strong>COMPANY PROFILE</strong> from the top navigation bar. Fill in or update your details and submit. You can review and re-edit your profile at any time by clicking the same link.</p>
            <p>For custom formatting or advanced web design requests, contact the Bestmaid team directly at <strong>admin@danapte.com</strong> or call (+65) 6640-8017.</p>
          </div>
        ),
      },
    ],
  },
];


function AccordionItem({ item, isOpen, onToggle }) {
  return (
    <div className="border-b border-gray-100 last:border-b-0">
      <button
        onClick={onToggle}
        aria-expanded={isOpen}
        className={`w-full flex items-center justify-between gap-4 px-6 py-[18px] text-left transition-colors hover:bg-gray-50 ${
          isOpen ? "text-green-900" : "text-gray-800"
        }`}
      >
        <span
          className={`flex-1 font-serif text-[15px] leading-snug transition-all ${
            isOpen ? "font-semibold" : "font-medium"
          }`}
        >
          {item.q}
        </span>
        <ChevronDown
          className={`w-[18px] h-[18px] flex-shrink-0 transition-all duration-300 ${
            isOpen ? "rotate-180 text-green-600" : "text-gray-400"
          }`}
        />
      </button>

      <div
        className={`overflow-hidden transition-all duration-300 ease-in-out ${
          isOpen ? "max-h-[1200px]" : "max-h-0"
        }`}
      >
        <div className="px-6 pb-5 text-sm leading-relaxed text-gray-500">
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

  const [activeSection, setActiveSection] = useState("employer");
  const [openIds, setOpenIds] = useState(new Set());
  const [search, setSearch] = useState("");

  const handleLogout = async () => {
    try {
      await fetch("/api/client-auth/logout", {
        method: "POST",
        headers: { ...getClientAuthHeaders() },
      });
    } catch {
      // ignore
    }
    clearClientAuth();
    setClientUser(null);
    navigate("/");
  };

  const currentSection = faqData.find((s) => s.id === activeSection);

  const filteredItems = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return currentSection.items;
    return currentSection.items.filter(
      (item) =>
        item.q.toLowerCase().includes(q) ||
        (typeof item.a === "string" && item.a.toLowerCase().includes(q))
    );
  }, [search, currentSection]);

  const toggle = (id) => {
    setOpenIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const expandAll = () => setOpenIds(new Set(filteredItems.map((i) => i.id)));
  const collapseAll = () => setOpenIds(new Set());

  const switchSection = (sectionId) => {
    setActiveSection(sectionId);
    setOpenIds(new Set());
    setSearch("");
  };

  return (
    <div className="client-page-theme min-h-screen flex flex-col bg-[#f9f7f4]">

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

                <Link to="/faq" className="py-2 px-3 rounded-lg hover:bg-muted">
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

      <div className="relative overflow-hidden bg-gradient-to-br from-green-900 via-green-700 to-green-500">
        <div className="absolute -top-16 -right-16 w-64 h-64 rounded-full bg-white/[0.04]" />
        <div className="absolute -bottom-10 -left-10 w-44 h-44 rounded-full bg-white/[0.04]" />

        <div className="relative max-w-3xl mx-auto px-6 py-14 md:py-[56px]">
          <div className="inline-flex items-center gap-1.5 bg-white/10 border border-white/20 rounded-full px-4 py-1.5 mb-5">
            <span className="text-[13px] text-white/85 font-medium tracking-wide">
              Maid Employment in Singapore
            </span>
          </div>

          <h1 className="font-display text-[clamp(26px,5vw,40px)] font-bold text-white leading-tight mb-3 tracking-tight">
            Frequently Asked Questions
          </h1>
          <p className="text-[15px] text-white/75 leading-relaxed mb-7 max-w-md">
            Everything you need to know about hiring and managing domestic workers in Singapore.
          </p>

          <div className="relative max-w-[460px]">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/55" />
            <input
              type="text"
              placeholder="Search questions…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-white/12 border border-white/25 rounded-xl text-white text-sm placeholder:text-white/50 outline-none focus:border-white/60 focus:ring-2 focus:ring-white/10 transition-all"
            />
          </div>
        </div>
      </div>

      <main className="flex-1 max-w-3xl mx-auto w-full px-6 py-8 md:py-10 pb-20">

        <div className="flex gap-2.5 flex-wrap mb-7">
          {faqData.map((section) => {
            const isActive = section.id === activeSection;
            return (
              <button
                key={section.id}
                onClick={() => switchSection(section.id)}
                className={`inline-flex items-center gap-1.5 px-5 py-2 rounded-full text-[13px] font-medium border transition-all duration-200 ${
                  isActive
                    ? "bg-green-900 text-white border-green-900"
                    : "bg-white text-gray-500 border-gray-200 hover:bg-green-50 hover:text-green-900 hover:border-green-200"
                }`}
              >
                <span>{section.icon}</span>
                {section.title}
                <span
                  className={`inline-flex items-center justify-center w-[22px] h-[22px] rounded-full text-[10px] font-semibold ml-1 ${
                    isActive ? "bg-white/20 text-white" : "bg-gray-100 text-gray-500"
                  }`}
                >
                  {section.items.length}
                </span>
              </button>
            );
          })}
        </div>

        <div className="flex items-center justify-between mb-3.5 pb-3 border-b border-gray-200">
          <span className="text-[13px] text-gray-400">
            {filteredItems.length} question{filteredItems.length !== 1 ? "s" : ""}
            {search ? ` matching "${search}"` : ""}
          </span>
          <div className="flex gap-1">
            <button
              onClick={expandAll}
              className="text-[12px] font-medium text-green-700 uppercase tracking-wide px-2.5 py-1 rounded-md hover:bg-green-50 transition-colors"
            >
              Expand all
            </button>
            <button
              onClick={collapseAll}
              className="text-[12px] font-medium text-gray-400 uppercase tracking-wide px-2.5 py-1 rounded-md hover:bg-gray-50 transition-colors"
            >
              Collapse all
            </button>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-[#ede8e0] overflow-hidden shadow-sm">
          {filteredItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-8 text-center">
              <div className="text-4xl mb-3">🔍</div>
              <p className="text-base font-medium text-gray-600 mb-1">No results found</p>
              <p className="text-sm text-gray-400">Try a different keyword or clear the search.</p>
            </div>
          ) : (
            filteredItems.map((item) => (
              <AccordionItem
                key={item.id}
                item={item}
                isOpen={openIds.has(item.id)}
                onToggle={() => toggle(item.id)}
              />
            ))
          )}
        </div>

        <p className="text-[13px] text-gray-400 text-center mt-9 leading-relaxed">
          Can't find what you're looking for?{" "}
          <Link to="/contact" className="text-green-700 font-medium hover:underline">
            Contact us directly
          </Link>{" "}
          via Find Maids At The Agency.
        </p>
      </main>

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
                <input
                  className="flex-1 rounded-lg border border-primary-foreground/20 bg-primary-foreground/10 px-3 py-2 font-body text-sm placeholder:opacity-50"
                  placeholder="Email"
                />
                <button className="rounded-lg bg-primary px-4 py-2 font-body text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90">
                  Join
                </button>
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

export default FAQPage;