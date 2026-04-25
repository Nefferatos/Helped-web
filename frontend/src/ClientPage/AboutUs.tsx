import { useState } from "react";
import { NavLink, Link, useNavigate } from "react-router-dom";
import { Clock, ChevronRight, Star, Users, Award, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Menu } from "lucide-react";

import {
  Avatar,
  AvatarFallback,
  AvatarImage
} from "@/components/ui/avatar";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";

import {
  getStoredClient,
  type ClientUser
} from "@/lib/clientAuth";
import { logoutClientPortal } from "@/lib/supabaseAuth";

type AboutUsProps = {
  embedded?: boolean;
};

const AboutUs = ({ embedded = false }: AboutUsProps) => {
  const [clientUser, setClientUser] = useState<ClientUser | null>(getStoredClient());
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    await logoutClientPortal("/");
  };

  return (
      <div className="client-page-theme min-h-screen flex flex-col">
  
        {!embedded && (
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
        )}

      {/* ── REDESIGNED BODY ── */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,600;0,700;1,400;1,600&display=swap');

        .ra-hero {
          background: linear-gradient(135deg, #1A3A2A 0%, #2D5A40 60%, #3D7054 100%);
          position: relative;
          overflow: hidden;
          padding: 5rem 1.5rem 4.5rem;
        }
        .ra-hero::before {
          content: '';
          position: absolute;
          inset: 0;
          background:
            radial-gradient(circle at 85% 15%, rgba(201,149,76,0.13) 0%, transparent 50%),
            radial-gradient(circle at 10% 85%, rgba(255,255,255,0.04) 0%, transparent 40%);
          pointer-events: none;
        }
        .ra-hero::after {
          content: 'RINZIN';
          position: absolute;
          right: -1rem;
          top: 50%;
          transform: translateY(-50%);
          font-family: 'Cormorant Garamond', serif;
          font-size: clamp(8rem, 18vw, 16rem);
          font-weight: 700;
          color: rgba(255,255,255,0.035);
          line-height: 1;
          pointer-events: none;
          white-space: nowrap;
        }
        .ra-hero-inner {
          position: relative;
          max-width: 860px;
          margin: 0 auto;
        }
        .ra-badge {
          display: inline-flex;
          align-items: center;
          gap: 0.4rem;
          background: rgba(201,149,76,0.15);
          border: 1px solid rgba(201,149,76,0.35);
          color: #E8B96A;
          padding: 0.35rem 0.9rem;
          border-radius: 100px;
          font-size: 0.7rem;
          font-weight: 600;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          margin-bottom: 1.25rem;
        }
        .ra-hero-title {
          font-family: 'Cormorant Garamond', serif;
          font-size: clamp(2.2rem, 5.5vw, 4rem);
          font-weight: 600;
          color: #F9F6F1;
          line-height: 1.12;
          margin: 0 0 1.25rem;
          letter-spacing: -0.01em;
        }
        .ra-hero-title em { font-style: italic; color: #E8B96A; }
        .ra-hero-lead {
          color: rgba(249,246,241,0.72);
          font-size: 1rem;
          line-height: 1.75;
          max-width: 520px;
          margin: 0 0 2.5rem;
        }
        .ra-stats-row {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 1px;
          background: rgba(255,255,255,0.1);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 10px;
          overflow: hidden;
          max-width: 580px;
        }
        @media (max-width: 520px) { .ra-stats-row { grid-template-columns: repeat(2,1fr); } }
        .ra-stat-cell {
          padding: 1.1rem 1rem;
          background: rgba(255,255,255,0.04);
          text-align: center;
          transition: background 0.2s;
        }
        .ra-stat-cell:hover { background: rgba(255,255,255,0.08); }
        .ra-stat-num {
          font-family: 'Cormorant Garamond', serif;
          font-size: 1.6rem;
          font-weight: 700;
          color: #F9F6F1;
          line-height: 1;
        }
        .ra-stat-lbl {
          font-size: 0.67rem;
          color: rgba(249,246,241,0.5);
          text-transform: uppercase;
          letter-spacing: 0.07em;
          margin-top: 0.2rem;
        }

        /* ── Wrap ── */
        .ra-wrap {
          max-width: 860px;
          margin: 0 auto;
          padding: 4rem 1.5rem;
        }
        .ra-section-lbl {
          font-size: 0.67rem;
          font-weight: 700;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: #5C8B6E;
          display: flex;
          align-items: center;
          gap: 0.6rem;
          margin-bottom: 0.6rem;
        }
        .ra-section-lbl::before {
          content: '';
          width: 1.75rem; height: 1.5px;
          background: #5C8B6E;
          display: block;
        }
        .ra-h2 {
          font-family: 'Cormorant Garamond', serif;
          font-size: clamp(1.75rem, 3.5vw, 2.6rem);
          font-weight: 600;
          line-height: 1.2;
          color: #1C1C1C;
          margin: 0 0 1rem;
        }

        /* ── Story ── */
        .ra-story {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 2.5rem;
          align-items: start;
          margin-bottom: 4rem;
        }
        @media (max-width: 640px) { .ra-story { grid-template-columns: 1fr; } }
        .ra-story-body p {
          color: #555;
          font-size: 0.9375rem;
          line-height: 1.8;
          margin-bottom: 0.875rem;
        }
        .ra-policy {
          display: inline-flex;
          align-items: center;
          gap: 0.4rem;
          margin-top: 0.5rem;
          background: #1A3A2A;
          color: #F9F6F1;
          padding: 0.6rem 1.2rem;
          border-radius: 4px;
          font-family: 'Cormorant Garamond', serif;
          font-size: 1.05rem;
          font-style: italic;
        }
        .ra-policy span { color: #E8B96A; font-size: 1.5rem; line-height: 0; margin-top: 5px; }
        .ra-dark-card {
          background: linear-gradient(145deg, #1A3A2A, #2D5A40);
          border-radius: 14px;
          padding: 1.75rem;
          position: relative;
          overflow: hidden;
        }
        .ra-dark-card::before {
          content: '';
          position: absolute;
          top: -30px; right: -30px;
          width: 130px; height: 130px;
          border-radius: 50%;
          background: rgba(201,149,76,0.1);
          pointer-events: none;
        }
        .ra-dc-title {
          font-family: 'Cormorant Garamond', serif;
          font-size: 1.2rem;
          font-weight: 600;
          color: #F9F6F1;
          margin-bottom: 0.2rem;
          position: relative;
        }
        .ra-dc-sub {
          font-size: 0.775rem;
          color: rgba(249,246,241,0.5);
          margin-bottom: 1.25rem;
          position: relative;
        }
        .ra-spec-list { list-style: none; padding: 0; margin: 0; position: relative; }
        .ra-spec-item {
          display: flex;
          align-items: center;
          gap: 0.65rem;
          padding: 0.55rem 0;
          font-size: 0.875rem;
          color: rgba(249,246,241,0.82);
          border-bottom: 1px solid rgba(255,255,255,0.07);
        }
        .ra-spec-item:last-child { border-bottom: none; }
        .ra-dot { width: 6px; height: 6px; border-radius: 50%; background: #E8B96A; flex-shrink: 0; }

        /* ── Helpers ── */
        .ra-helpers { margin-bottom: 4rem; }
        .ra-helpers-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1.25rem;
          margin-top: 1.75rem;
        }
        @media (max-width: 520px) { .ra-helpers-grid { grid-template-columns: 1fr; } }
        .ra-hcard {
          background: #fff;
          border: 1px solid rgba(92,139,110,0.14);
          border-radius: 12px;
          padding: 1.5rem;
          transition: box-shadow 0.25s, transform 0.2s;
        }
        .ra-hcard:hover {
          box-shadow: 0 10px 32px rgba(92,139,110,0.1);
          transform: translateY(-2px);
        }
        .ra-hcard-tag {
          font-size: 0.67rem;
          font-weight: 700;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: var(--tc);
          background: color-mix(in srgb, var(--tc) 10%, transparent);
          border: 1px solid color-mix(in srgb, var(--tc) 22%, transparent);
          display: inline-block;
          padding: 0.2rem 0.7rem;
          border-radius: 100px;
          margin-bottom: 1rem;
        }
        .ra-hcard-list { list-style: none; padding: 0; margin: 0; }
        .ra-hcard-list li {
          display: flex;
          align-items: center;
          gap: 0.6rem;
          padding: 0.45rem 0;
          font-size: 0.875rem;
          color: #444;
          border-bottom: 1px solid #F0EDE8;
        }
        .ra-hcard-list li:last-child { border-bottom: none; }
        .ra-hbullet { width: 5px; height: 5px; border-radius: 50%; background: var(--tc); flex-shrink: 0; }
        .ra-cta-row {
          margin-top: 1.25rem;
          background: linear-gradient(135deg, #F9F6F1, #F0EDE8);
          border: 1px solid rgba(92,139,110,0.12);
          border-radius: 12px;
          padding: 1.25rem 1.5rem;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 1rem;
          flex-wrap: wrap;
        }
        .ra-cta-row p { font-size: 0.875rem; color: #555; line-height: 1.6; margin: 0; }
        .ra-cta-row strong { color: #1C1C1C; }
        .ra-btn {
          display: inline-flex;
          align-items: center;
          gap: 0.4rem;
          background: #1A3A2A;
          color: #F9F6F1;
          padding: 0.6rem 1.2rem;
          border-radius: 4px;
          font-size: 0.775rem;
          font-weight: 600;
          letter-spacing: 0.05em;
          text-transform: uppercase;
          text-decoration: none;
          flex-shrink: 0;
          border: none;
          cursor: pointer;
          transition: background 0.2s, transform 0.15s;
        }
        .ra-btn:hover { background: #142E20; transform: translateY(-1px); }

        /* ── Values ── */
        .ra-values {
          background: #1A3A2A;
          border-radius: 16px;
          padding: 3rem;
          margin-bottom: 4rem;
          display: grid;
          grid-template-columns: 1fr 1.3fr;
          gap: 3rem;
          align-items: center;
        }
        @media (max-width: 640px) {
          .ra-values { grid-template-columns: 1fr; gap: 2rem; padding: 2rem; }
        }
        .ra-vl h2 {
          font-family: 'Cormorant Garamond', serif;
          font-size: clamp(1.6rem, 3.5vw, 2.4rem);
          font-weight: 600;
          color: #F9F6F1;
          line-height: 1.25;
          margin: 0 0 0.875rem;
        }
        .ra-vl h2 em { font-style: italic; color: #E8B96A; }
        .ra-vl p { color: rgba(249,246,241,0.65); font-size: 0.9rem; line-height: 1.75; margin: 0; }
        .ra-vpoints { display: flex; flex-direction: column; gap: 0.875rem; }
        .ra-vpoint {
          display: flex;
          align-items: flex-start;
          gap: 0.875rem;
          padding: 0.875rem 1rem;
          background: rgba(255,255,255,0.05);
          border-radius: 8px;
          border: 1px solid rgba(255,255,255,0.07);
          transition: background 0.2s;
        }
        .ra-vpoint:hover { background: rgba(255,255,255,0.08); }
        .ra-vico {
          width: 34px; height: 34px;
          background: rgba(201,149,76,0.15);
          border-radius: 6px;
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
          color: #E8B96A;
        }
        .ra-vico svg { width: 15px; height: 15px; stroke: #E8B96A; }
        .ra-vname { font-size: 0.825rem; font-weight: 600; color: #F9F6F1; margin-bottom: 0.2rem; }
        .ra-vdesc { font-size: 0.775rem; color: rgba(249,246,241,0.5); line-height: 1.55; }

        /* ── Intl Banner ── */
        .ra-intl {
          background: linear-gradient(135deg, #C9954C 0%, #E5B06E 100%);
          border-radius: 14px;
          padding: 2.5rem;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 1.5rem;
          flex-wrap: wrap;
          position: relative;
          overflow: hidden;
        }
        .ra-intl::after {
          content: '✈';
          position: absolute;
          right: 1.5rem; top: 50%;
          transform: translateY(-50%);
          font-size: 7rem;
          opacity: 0.08;
          pointer-events: none;
        }
        .ra-intl h3 {
          font-family: 'Cormorant Garamond', serif;
          font-size: 1.6rem;
          font-weight: 700;
          color: #1A1A1A;
          margin: 0 0 0.375rem;
        }
        .ra-intl p {
          color: rgba(26,26,26,0.72);
          font-size: 0.9rem;
          line-height: 1.6;
          max-width: 380px;
          margin: 0;
        }
      `}</style>

      <main className="flex-1">

        {/* Hero */}
        <section className="ra-hero">
          <div className="ra-hero-inner">
            <div className="ra-badge">
              <Star size={10} />
              Trusted Since 2005
            </div>
            <h1 className="ra-hero-title">
              Placing <em>trusted</em> helpers<br />in families worldwide.
            </h1>
            <p className="ra-hero-lead">
              Rinzin Agency specialises in carefully selected domestic helpers from North East India, the Philippines, Myanmar and beyond — matched to your family's unique needs.
            </p>
            <div className="ra-stats-row">
              {[
                { val: "2,000+", lbl: "Families Served" },
                { val: "20+",    lbl: "Years Experience" },
                { val: "6+",     lbl: "Countries" },
                { val: "100%",   lbl: "Verified" },
              ].map(({ val, lbl }) => (
                <div className="ra-stat-cell" key={lbl}>
                  <div className="ra-stat-num">{val}</div>
                  <div className="ra-stat-lbl">{lbl}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <div className="ra-wrap">

          {/* Story */}
          <section className="ra-story">
            <div className="ra-story-body">
              <div className="ra-section-lbl">Our Story</div>
              <h2 className="ra-h2">A pioneer in North East Indian domestic helpers</h2>
              <p>In 2005, as a Singaporean Chinese who had traveled India far and wide, we became the first agency to introduce helpers from Lahaul and Spiti, Himachal Pradesh, and Ladakh to Singapore families.</p>
              <p>RINZIN has been providing quality Indian, Filipino and Myanmar domestic helpers to Singapore families for the past years, building a fresh team for an ever-wider choice of origin and background.</p>
              <p>We deal with real people from different cultures. When problems arise, we face and solve them swiftly — because every challenge makes us better.</p>
              <div className="ra-policy">
                <span>"</span>The right worker, delivered on time.<span>"</span>
              </div>
            </div>

            <div className="ra-dark-card">
              <div className="ra-dc-title">North East Indian Specialists</div>
              <div className="ra-dc-sub">Our founding strength &amp; core expertise</div>
              <ul className="ra-spec-list">
                {[
                  "Darjeeling & Sikkim Maids",
                  "Nepalese – Hindu (Veg & Non-veg)",
                  "Tibetan – Buddhist",
                  "Manipur – English Speaking",
                  "Filipino – Video Interview Available",
                  "Myanmar Helpers",
                ].map((item) => (
                  <li key={item} className="ra-spec-item">
                    <span className="ra-dot" />{item}
                  </li>
                ))}
              </ul>
            </div>
          </section>

          {/* Helpers Origins */}
          <section className="ra-helpers">
            <div className="ra-section-lbl">Placement Origins</div>
            <h2 className="ra-h2" style={{ marginBottom: "0.4rem" }}>
              New &amp; Transfer Foreign Domestic Helpers
            </h2>
            <p style={{ color: "#666", fontSize: "0.9rem", lineHeight: 1.7, maxWidth: "480px", margin: 0 }}>
              We place helpers from six countries, carefully matching culture, language and dietary preferences.
            </p>

            <div className="ra-helpers-grid">
              <div className="ra-hcard" style={{ "--tc": "#5C8B6E" } as React.CSSProperties}>
                <div className="ra-hcard-tag">North East Indian</div>
                <ul className="ra-hcard-list">
                  {["Darjeeling & Sikkim", "Nepalese – Hindu", "Tibetan – Buddhist", "Manipur – Christian/Catholic", "Filipino", "Myanmar"].map(i => (
                    <li key={i}><span className="ra-hbullet" />{i}</li>
                  ))}
                </ul>
              </div>

              <div className="ra-hcard" style={{ "--tc": "#8B6E5C" } as React.CSSProperties}>
                <div className="ra-hcard-tag">Selective Placements</div>
                <ul className="ra-hcard-list">
                  {["South Indian", "Indonesian", "Punjabi", "Lahaul & Spiti", "Himachal Pradesh", "Ladakh"].map(i => (
                    <li key={i}><span className="ra-hbullet" />{i}</li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="ra-cta-row">
              <p>Interested in a specific origin or language preference? <strong>We'll shortlist suitable candidates for you.</strong></p>
              <Link to="/enquiry2" className="ra-btn">
                Enquire Now <ChevronRight size={13} />
              </Link>
            </div>
          </section>

          {/* Values */}
          <section className="ra-values">
            <div className="ra-vl">
              <div className="ra-section-lbl" style={{ color: "rgba(201,149,76,0.85)" }}>Why Rinzin</div>
              <h2>We are <em>different.</em><br />Call us and find out.</h2>
              <p>Our crisis management team is available via SMS to ensure that placing a helper with us is completely stress-free. We are result-oriented and driven to provide you the best.</p>
            </div>

            <div className="ra-vpoints">
              {[
                { icon: Shield, title: "Verified & Screened",    desc: "Every helper is personally vetted, including video interviews for Filipino candidates." },
                { icon: Users,  title: "Cultural Matching",      desc: "We match language, diet, and religious background for a harmonious household." },
                { icon: Clock,  title: "SMS Crisis Support",     desc: "Dedicated crisis management team on standby — issues resolved swiftly." },
                { icon: Award,  title: "Pioneer Since 2005",     desc: "First to bring helpers from Lahaul, Spiti, and Ladakh to Singapore families." },
              ].map(({ icon: Icon, title, desc }) => (
                <div className="ra-vpoint" key={title}>
                  <div className="ra-vico"><Icon /></div>
                  <div>
                    <div className="ra-vname">{title}</div>
                    <div className="ra-vdesc">{desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* International */}
          <section className="ra-intl">
            <div>
              <h3>Serving International Clients</h3>
              <p>We relocate fresh and experienced helpers to reputable clients in <strong>Europe</strong> and the <strong>UK</strong>. Email your requirements and we'll shortlist the best candidates for you.</p>
            </div>
            <a href="mailto:enquiry@rinzinagency.com" className="ra-btn">
              Email Your Requirements <ChevronRight size={13} />
            </a>
          </section>

        </div>
      </main>

      {/* ── ORIGINAL FOOTER (unchanged) ── */}
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

export default AboutUs;
