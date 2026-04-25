import { useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { MapPin, Mail, Phone, Globe, Clock, Send, Menu, ArrowUpRight } from "lucide-react";
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
  type ClientUser,
} from "@/lib/clientAuth";
import { logoutClientPortal } from "@/lib/supabaseAuth";

type ContactUsProps = {
  embedded?: boolean;
};

const ContactUs = ({ embedded = false }: ContactUsProps) => {
  const [clientUser, setClientUser] = useState<ClientUser | null>(getStoredClient());
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [mobile, setMobile] = useState("");
  const [message, setMessage] = useState("");
  const { toast } = useToast();

  const handleLogout = async () => {
    await logoutClientPortal("/");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !mobile.trim()) {
      toast({ title: "Missing Fields", description: "Please fill in all required fields.", variant: "destructive" });
      return;
    }
    toast({ title: "Message Sent", description: "We will get back to you shortly." });
    setName(""); setEmail(""); setMobile(""); setMessage("");
  };

  return (
    <>
      <style>{`
        /* ── tokens ── */
        :root {
          --g950: #052e16; --g900: #14532d; --g800: #166534;
          --g700: #15803d; --g600: #16a34a; --g100: #dcfce7; --g50: #f0fdf4;
          --sand: #faf8f5; --border: #e8e3db;
          --tm: #1a1a1a; --mid: #4b5563; --soft: #9ca3af;
        }

        /* ── page ── */
        // .cp { min-height:100vh; display:flex; flex-direction:column; background:var(--sand); font-family:'Georgia',serif; }

        /* ── hero ── */
        .ct-hero {
          background: linear-gradient(135deg, var(--g950) 0%, var(--g800) 55%, var(--g600) 100%);
          position: relative; overflow: hidden;
          padding: 64px 24px 56px;
        }
        .ct-hero::before {
          content:''; position:absolute; inset:0;
          background: url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none'%3E%3Cg fill='%23ffffff' fill-opacity='0.03'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E");
        }
        .ct-hero-inner { position:relative; max-width:960px; margin:0 auto; text-align:center; }
        .ct-badge {
          display:inline-flex; align-items:center; gap:6px;
          background:rgba(255,255,255,.12); border:1px solid rgba(255,255,255,.2);
          border-radius:100px; padding:5px 16px; margin-bottom:20px;
          font-size:11px; font-family:sans-serif; color:rgba(255,255,255,.85);
          letter-spacing:.06em; text-transform:uppercase;
        }
        .ct-hero h1 {
          font-size: clamp(32px,5vw,52px); color:#fff; font-weight:700;
          line-height:1.1; letter-spacing:-.025em; margin:0 0 14px;
        }
        .ct-hero h1 span { color: #86efac; }
        .ct-hero p { font-size:15px; font-family:sans-serif; color:rgba(255,255,255,.7); line-height:1.65; margin:0 auto; max-width:440px; }

        /* ── main grid ── */
        .ct-body { flex:1; max-width:1060px; margin:0 auto; width:100%; padding:48px 24px 72px; }

        /* ── form card ── */
        .ct-grid { display:grid; grid-template-columns:1fr 360px; gap:28px; margin-bottom:32px; }
        .ct-card {
          background:#fff; border:1px solid var(--border);
          border-radius:20px; padding:36px;
          box-shadow:0 1px 3px rgba(0,0,0,.05);
        }
        .ct-card-title { font-size:18px; font-weight:700; color:var(--tm); margin:0 0 24px; letter-spacing:-.01em; }

        /* form elements */
        .ct-row { display:grid; grid-template-columns:1fr 1fr; gap:14px; margin-bottom:14px; }
        .ct-field {
          width:100%; padding:12px 16px; border:1.5px solid var(--border);
          border-radius:10px; font-family:sans-serif; font-size:14px; color:var(--tm);
          background:#fafaf9; outline:none; transition:border-color .2s, background .2s;
          box-sizing:border-box;
        }
        .ct-field:focus { border-color: var(--g700); background:#fff; }
        .ct-field::placeholder { color:var(--soft); }
        textarea.ct-field { resize:none; height:120px; }
        .ct-submit {
          width:100%; padding:13px; background:var(--g900);
          color:#fff; border:none; border-radius:10px; font-family:sans-serif;
          font-size:14px; font-weight:600; letter-spacing:.04em; text-transform:uppercase;
          cursor:pointer; display:flex; align-items:center; justify-content:center; gap:8px;
          transition:background .2s, transform .1s;
        }
        .ct-submit:hover { background:var(--g800); }
        .ct-submit:active { transform:scale(.98); }

        /* hours card */
        .ct-hours-card { display:flex; flex-direction:column; gap:0; }
        .ct-hours-header {
          background: linear-gradient(135deg, var(--g900), var(--g700));
          border-radius:16px 16px 0 0; padding:24px 28px;
        }
        .ct-hours-header h2 { font-size:16px; font-weight:700; color:#fff; margin:0 0 4px; }
        .ct-hours-header p { font-size:12px; font-family:sans-serif; color:rgba(255,255,255,.6); margin:0; }
        .ct-hours-body { flex:1; padding:24px 28px; display:flex; flex-direction:column; gap:16px; }
        .ct-hour-row { display:flex; gap:12px; align-items:flex-start; }
        .ct-hour-icon {
          width:34px; height:34px; background:var(--g50); border-radius:8px;
          display:flex; align-items:center; justify-content:center; flex-shrink:0;
        }
        .ct-hour-icon svg { width:15px; height:15px; color:var(--g700); }
        .ct-hour-text { font-family:sans-serif; font-size:13px; color:var(--mid); line-height:1.55; }
        .ct-hour-text strong { color:var(--tm); font-weight:600; display:block; margin-bottom:1px; }

        /* ── info cards ── */
        .ct-info-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:20px; margin-bottom:32px; }
        .ct-info-card {
          background:#fff; border:1px solid var(--border); border-radius:16px;
          padding:24px; box-shadow:0 1px 3px rgba(0,0,0,.04);
          transition:box-shadow .2s, transform .2s;
        }
        .ct-info-card:hover { box-shadow:0 6px 20px rgba(0,0,0,.08); transform:translateY(-2px); }
        .ct-info-icon {
          width:40px; height:40px; background:var(--g50); border-radius:10px;
          display:flex; align-items:center; justify-content:center; margin-bottom:14px;
        }
        .ct-info-icon svg { width:18px; height:18px; color:var(--g700); }
        .ct-info-card h3 { font-size:14px; font-weight:700; color:var(--tm); margin:0 0 10px; letter-spacing:-.01em; }
        .ct-info-row { display:flex; gap:8px; align-items:flex-start; margin-bottom:6px; }
        .ct-info-row svg { width:13px; height:13px; color:var(--g700); margin-top:2px; flex-shrink:0; }
        .ct-info-row span, .ct-info-row a {
          font-family:sans-serif; font-size:13px; color:var(--mid); line-height:1.5;
        }
        .ct-info-row a { color:var(--g700); text-decoration:none; }
        .ct-info-row a:hover { text-decoration:underline; }

        /* ── map ── */
        .ct-map { border-radius:20px; overflow:hidden; border:1px solid var(--border); box-shadow:0 1px 3px rgba(0,0,0,.05); }
        .ct-map iframe { display:block; }

        /* ── responsive ── */
        @media(max-width:820px) {
          .ct-grid { grid-template-columns:1fr; }
          .ct-info-grid { grid-template-columns:1fr 1fr; }
          .ct-row { grid-template-columns:1fr; }
        }
        @media(max-width:560px) {
          .ct-info-grid { grid-template-columns:1fr; }
          .ct-card { padding:24px; }
          .ct-hero { padding:48px 20px 40px; }
        }
      `}</style>

      <div className="cp client-page-theme">

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

        <div className="ct-hero">
          <div className="ct-hero-inner">
            <div className="ct-badge">
              <Mail size={11} /> Get In Touch
            </div>
            <h1>Contact <span>Us</span></h1>
            <p>We're here to help. Reach out with any questions about hiring domestic workers in Singapore.</p>
          </div>
        </div>

        <main className="ct-body">

          <div className="ct-grid">

            <div className="ct-card">
              <h2 className="ct-card-title">Send Us a Message</h2>
              <form onSubmit={handleSubmit}>
                <div className="ct-row">
                  <input type="text" value={name} onChange={e => setName(e.target.value)}
                    className="ct-field" placeholder="Full Name" required />
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                    className="ct-field" placeholder="Email Address" required />
                </div>
                <input type="tel" value={mobile} onChange={e => setMobile(e.target.value)}
                  className="ct-field" placeholder="Mobile Number" required
                  style={{ marginBottom: 14, display: 'block' }} />
                <textarea value={message} onChange={e => setMessage(e.target.value)}
                  className="ct-field" placeholder="Your message…"
                  style={{ marginBottom: 20, display: 'block' }} />
                <button type="submit" className="ct-submit">
                  <Send size={15} /> Send Message
                </button>
              </form>
            </div>

            <div className="ct-card" style={{ padding: 0, overflow: 'hidden' }}>
              <div className="ct-hours-header">
                <h2>Opening Hours</h2>
                <p>We're available most days</p>
              </div>
              <div className="ct-hours-body">
                <div className="ct-hour-row">
                  <div className="ct-hour-icon"><Clock /></div>
                  <div className="ct-hour-text">
                    <strong>Monday – Sunday</strong>
                    11:00 am – 11:00 pm
                  </div>
                </div>
                <div className="ct-hour-row">
                  <div className="ct-hour-icon"><Phone /></div>
                  <div className="ct-hour-text">
                    <strong>After Hours</strong>
                    By mobile — if urgent, please SMS us directly.
                  </div>
                </div>
                <div className="ct-hour-row">
                  <div className="ct-hour-icon"><Phone /></div>
                  <div className="ct-hour-text">
                    <strong>Bala (Direct)</strong>
                    <a href="tel:80730757" style={{ color: 'var(--g700)', fontFamily: 'sans-serif', fontSize: 13 }}>
                      8073 0757
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="ct-info-grid">

            <div className="ct-info-card">
              <div className="ct-info-icon"><MapPin /></div>
              <h3>Our Office</h3>
              <div className="ct-info-row">
                <MapPin size={13} />
                <span>3 Jalan Kukoh, #01-115<br />Singapore 161003</span>
              </div>
              <div className="ct-info-row">
                <Mail size={13} />
                <a href="mailto:enquiries.j1@gmail.com">enquiries.j1@gmail.com</a>
              </div>
            </div>

            <div className="ct-info-card">
              <div className="ct-info-icon"><Globe /></div>
              <h3>Website</h3>
              <div className="ct-info-row">
                <Globe size={13} />
                <a href="http://www.rinzinmaid.com" target="_blank" rel="noopener noreferrer"
                  style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  www.rinzinmaid.com <ArrowUpRight size={11} />
                </a>
              </div>
              <p style={{ fontFamily: 'sans-serif', fontSize: 12, color: 'var(--soft)', marginTop: 10, lineHeight: 1.5 }}>
                Browse available maids and agency profiles online.
              </p>
            </div>

            <div className="ct-info-card">
              <div className="ct-info-icon"><Phone /></div>
              <h3>Call Us</h3>
              <div className="ct-info-row">
                <Phone size={13} />
                <span><strong style={{ color: 'var(--tm)', fontFamily: 'sans-serif' }}>Bala</strong></span>
              </div>
              <div className="ct-info-row">
                <Phone size={13} />
                <a href="tel:80730757">8073 0757</a>
              </div>
            </div>

          </div>

          <div className="ct-map">
            <iframe
              src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3988.8!2d103.838!3d1.289!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x31da19a340000001%3A0x1!2s3+Jalan+Kukoh%2C+Singapore+161003!5e0!3m2!1sen!2ssg!4v1"
              width="100%" height="380" style={{ border: 0 }} allowFullScreen loading="lazy"
              referrerPolicy="no-referrer-when-downgrade" title="Office Location"
            />
          </div>

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

export default ContactUs;
