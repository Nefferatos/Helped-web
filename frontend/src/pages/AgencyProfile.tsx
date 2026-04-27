import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getAgencyAdminAuthHeaders } from "@/lib/agencyAdminAuth";
import {
  Edit, MessageCircle, Building2, Phone, Globe, MapPin, Clock,
  Users, Star, Image as ImageIcon, Mail, Printer, Facebook, X,
  ChevronRight, Shield, Camera,
} from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "@/components/ui/sonner";
import { adminPath } from "@/lib/routes";

/* ─── Types ──────────────────────────────────────────────────────────── */
interface CompanyProfileApi {
  company_name: string; short_name: string; license_no: string;
  address_line1: string; address_line2?: string; postal_code: string; country: string;
  contact_person?: string; contact_phone?: string; contact_email?: string;
  contact_fax?: string; contact_website?: string;
  office_hours_regular?: string; office_hours_other?: string;
  social_facebook?: string; social_whatsapp_number?: string; social_whatsapp_message?: string;
  about_us?: string; logo_data_url?: string;
  gallery_image_data_urls?: string[]; intro_video_data_url?: string;
}
interface MomPersonnelApi { id: number; name: string; registration_number: string; }
interface TestimonialApi { id: number; message: string; author: string; }
interface CompanyResponse {
  companyProfile: CompanyProfileApi; momPersonnel: MomPersonnelApi[]; testimonials: TestimonialApi[];
}
interface AgencySummary {
  publicMaids: number; hiddenMaids: number; totalMaids: number; maidsWithPhotos: number;
  enquiries: number; momPersonnel: number; testimonials: number; galleryImages: number;
}

/* ─── Responsive hook ────────────────────────────────────────────────── */
const useWindowWidth = () => {
  const [w, setW] = useState(typeof window !== "undefined" ? window.innerWidth : 1280);
  useEffect(() => {
    const h = () => setW(window.innerWidth);
    window.addEventListener("resize", h);
    return () => window.removeEventListener("resize", h);
  }, []);
  return w;
};

/* ─── Design tokens — senior-citizen friendly ────────────────────────── */
const C = {
  primary: "#0D6E56",
  primaryDark: "#085041",
  primaryLight: "#E1F5EE",
  primaryBorder: "#9FE1CB",
  bg: "#F4F6F9",
  card: "#ffffff",
  border: "#D0D7E2",
  borderLight: "#E8ECF2",
  // ALL text is near-black for maximum readability
  text: "#0A0F1A",        // primary text — almost black
  textMid: "#1A2332",     // secondary text — dark navy
  textSoft: "#2D3748",    // "soft" text — still dark
  headerFrom: "#0a2540",
  headerTo: "#0D6E56",
};

/* ─── Typography scale — large for farsighted users ─────────────────── */
const T = {
  label: 12,      // uppercase labels
  caption: 14,    // small supporting text
  body: 16,       // main body text
  bodyLg: 18,     // slightly larger body
  sub: 16,        // card subtitles / descriptions
  title: 18,      // card titles
  heading: 22,    // section headings
  hero: 28,       // hero name
};

/* ─── Card wrapper ───────────────────────────────────────────────────── */
const Card = ({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) => (
  <div style={{
    background: C.card, borderRadius: 18, border: `2px solid ${C.border}`,
    boxShadow: "0 3px 16px rgba(0,0,0,0.08)", overflow: "hidden", ...style,
  }}>
    {children}
  </div>
);

/* ─── Card header ────────────────────────────────────────────────────── */
const CardHeader = ({ icon, title, count }: { icon: string; title: string; count?: number }) => (
  <div style={{
    display: "flex", alignItems: "center", justifyContent: "space-between",
    padding: "16px 20px", borderBottom: `2px solid ${C.borderLight}`,
    background: "linear-gradient(135deg, #FAFBFC 0%, #F0F4F8 100%)",
  }}>
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <span style={{ fontSize: 22 }}>{icon}</span>
      <span style={{ fontSize: T.title, fontWeight: 800, color: C.text, letterSpacing: "0.01em" }}>{title}</span>
    </div>
    {count !== undefined && (
      <span style={{
        fontSize: T.caption, fontWeight: 700, padding: "4px 14px", borderRadius: 20,
        background: C.primaryLight, color: C.primaryDark, border: `2px solid ${C.primaryBorder}`,
      }}>{count}</span>
    )}
  </div>
);

/* ─── Contact row ────────────────────────────────────────────────────── */
const ContactRow = ({ icon: Icon, label, value, href }: {
  icon: React.ElementType; label: string; value?: string; href?: string;
}) => {
  if (!value) return null;
  return (
    <div style={{
      display: "flex", alignItems: "flex-start", gap: 14,
      padding: "13px 0", borderBottom: `1.5px solid ${C.borderLight}`,
    }}>
      <div style={{
        width: 40, height: 40, borderRadius: 10, flexShrink: 0,
        background: C.primaryLight, border: `2px solid ${C.primaryBorder}`,
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <Icon size={18} color={C.primary} />
      </div>
      <div style={{ minWidth: 0, flex: 1 }}>
        <p style={{
          fontSize: T.label, fontWeight: 800, letterSpacing: "0.1em",
          textTransform: "uppercase", color: C.textSoft, margin: "0 0 3px",
        }}>
          {label}
        </p>
        {href ? (
          <a href={href} target="_blank" rel="noreferrer" style={{
            fontSize: T.bodyLg, color: C.primary, textDecoration: "none",
            fontWeight: 700, wordBreak: "break-all", lineHeight: 1.5,
          }}>{value}</a>
        ) : (
          <p style={{ fontSize: T.bodyLg, color: C.text, fontWeight: 600, wordBreak: "break-all", margin: 0, lineHeight: 1.5 }}>
            {value}
          </p>
        )}
      </div>
    </div>
  );
};

/* ─── Stat chip ──────────────────────────────────────────────────────── */
const statPalette = [
  { bg: "#E8F5E9", text: "#1B5E20", border: "#81C784" },
  { bg: "#E3F2FD", text: "#0D47A1", border: "#64B5F6" },
  { bg: "#FFF3E0", text: "#BF360C", border: "#FFAB40" },
  { bg: "#F3E5F5", text: "#4A148C", border: "#BA68C8" },
  { bg: "#FCE4EC", text: "#880E4F", border: "#F06292" },
  { bg: "#E0F7FA", text: "#004D40", border: "#4DD0E1" },
  { bg: "#FFF8E1", text: "#E65100", border: "#FFD54F" },
  { bg: "#F1F8E9", text: "#1B5E20", border: "#AED581" },
];

const StatChip = ({ label, value, index }: { label: string; value: number; index: number }) => {
  const p = statPalette[index % statPalette.length];
  return (
    <div style={{
      background: p.bg, border: `2px solid ${p.border}`, borderRadius: 14,
      padding: "14px 16px", display: "flex", flexDirection: "column", gap: 4,
    }}>
      <span style={{
        fontSize: T.label, fontWeight: 800, letterSpacing: "0.1em",
        textTransform: "uppercase", color: p.text,
      }}>
        {label}
      </span>
      <span style={{ fontSize: 30, fontWeight: 900, color: p.text, lineHeight: 1 }}>{value}</span>
    </div>
  );
};

/* ─── Main ───────────────────────────────────────────────────────────── */
const AgencyProfile = () => {
  const [company, setCompany] = useState<CompanyProfileApi | null>(null);
  const [momPersonnel, setMomPersonnel] = useState<MomPersonnelApi[]>([]);
  const [testimonials, setTestimonials] = useState<TestimonialApi[]>([]);
  const [summary, setSummary] = useState<AgencySummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  const width = useWindowWidth();
  const isMobile = width < 768;
  const isTablet = width < 1100;

  const loadCompanyProfile = async () => {
    try {
      setIsLoading(true); setLoadError(null);
      const [response, summaryResponse] = await Promise.all([
        fetch("/api/company", { headers: { ...getAgencyAdminAuthHeaders() } }),
        fetch("/api/company/summary", { headers: { ...getAgencyAdminAuthHeaders() } }),
      ]);
      const data = (await response.json().catch(() => ({}))) as Partial<CompanyResponse> & { error?: string };
      if (!response.ok || !data.companyProfile) throw new Error(data.error || "Failed to load");
      setCompany(data.companyProfile);
      setMomPersonnel(data.momPersonnel ?? []);
      setTestimonials(data.testimonials ?? []);
      if (summaryResponse.ok) {
        const s = (await summaryResponse.json().catch(() => ({}))) as Partial<AgencySummary>;
        setSummary({
          publicMaids: s.publicMaids ?? 0, hiddenMaids: s.hiddenMaids ?? 0,
          totalMaids: s.totalMaids ?? 0, maidsWithPhotos: s.maidsWithPhotos ?? 0,
          enquiries: s.enquiries ?? 0, momPersonnel: s.momPersonnel ?? 0,
          testimonials: s.testimonials ?? 0, galleryImages: s.galleryImages ?? 0,
        });
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Failed to load";
      setLoadError(msg); toast.error(msg);
    } finally { setIsLoading(false); }
  };

  useEffect(() => { void loadCompanyProfile(); }, []);

  if (isLoading) return (
    <div style={{ display: "flex", height: "16rem", alignItems: "center", justifyContent: "center" }}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
        <div style={{ width: 48, height: 48, borderRadius: "50%", border: `4px solid ${C.primaryLight}`, borderTopColor: C.primary, animation: "spin 0.8s linear infinite" }} />
        <span style={{ fontSize: T.body, color: C.text, fontWeight: 700 }}>Loading profile…</span>
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  if (loadError || !company) return (
    <div style={{ display: "flex", height: "16rem", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12 }}>
      <p style={{ fontSize: T.bodyLg, color: "#C62828", fontWeight: 700 }}>{loadError || "Failed to load"}</p>
      <button onClick={() => void loadCompanyProfile()} style={{
        fontSize: T.body, padding: "12px 24px", borderRadius: 10, border: `2px solid ${C.border}`,
        background: "#fff", color: C.text, cursor: "pointer", fontWeight: 700,
      }}>🔄 Retry</button>
    </div>
  );

  const gallery = company.gallery_image_data_urls ?? [];
  const statItems = summary ? [
    { label: "Total Maids", value: summary.totalMaids },
    { label: "Public", value: summary.publicMaids },
    { label: "Hidden", value: summary.hiddenMaids },
    { label: "With Photos", value: summary.maidsWithPhotos },
    { label: "Enquiries", value: summary.enquiries },
    { label: "MOM Staff", value: summary.momPersonnel },
    { label: "Testimonials", value: summary.testimonials },
    { label: "Gallery", value: summary.galleryImages },
  ] : [];

  return (
    <>
      <style>{`
        @keyframes fadeUp { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:translateY(0); } }
        .ap-fadein { animation: fadeUp 0.35s ease both; }
        .gallery-thumb:hover { transform: scale(1.04); box-shadow: 0 8px 24px rgba(13,110,86,0.22) !important; }
        .action-btn:hover { opacity: 0.88; transform: translateY(-2px); }
      `}</style>

      {/* Lightbox */}
      {lightboxImage && (
        <div style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.88)" }}
          onClick={() => setLightboxImage(null)}>
          <div style={{ position: "relative" }} onClick={e => e.stopPropagation()}>
            <img src={lightboxImage} alt="Gallery preview" style={{ maxHeight: "90vh", maxWidth: "92vw", borderRadius: 16, objectFit: "contain", boxShadow: "0 30px 80px rgba(0,0,0,0.6)" }} />
            <button onClick={() => setLightboxImage(null)} style={{ position: "absolute", top: -16, right: -16, width: 40, height: 40, borderRadius: "50%", background: "#fff", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 2px 12px rgba(0,0,0,0.3)" }}>
              <X size={18} color="#111" />
            </button>
          </div>
        </div>
      )}

      <div className="ap-fadein" style={{ display: "flex", flexDirection: "column", gap: 18, fontSize: T.body, color: C.text, lineHeight: 1.7 }}>

        {/* ── Hero header ───────────────────────────────────────────── */}
        <div style={{
          background: `linear-gradient(135deg, ${C.headerFrom} 0%, ${C.headerTo} 100%)`,
          borderRadius: 20, padding: isMobile ? "20px 18px" : "26px 32px",
          boxShadow: "0 10px 36px rgba(13,110,86,0.28)",
          display: "flex", flexWrap: "wrap", alignItems: "center",
          justifyContent: "space-between", gap: 18, position: "relative", overflow: "hidden",
        }}>
          <div style={{ position: "absolute", top: -40, right: -40, width: 180, height: 180, borderRadius: "50%", background: "rgba(255,255,255,0.05)", pointerEvents: "none" }} />
          <div style={{ position: "absolute", bottom: -30, left: "40%", width: 120, height: 120, borderRadius: "50%", background: "rgba(255,255,255,0.04)", pointerEvents: "none" }} />

          {/* Logo + name */}
          <div style={{ display: "flex", alignItems: "center", gap: 18, zIndex: 1 }}>
            <div style={{
              width: isMobile ? 64 : 80, height: isMobile ? 64 : 80, flexShrink: 0,
              borderRadius: 16, border: "3px solid rgba(255,255,255,0.3)",
              background: "rgba(255,255,255,0.14)", overflow: "hidden",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              {company.logo_data_url
                ? <img src={company.logo_data_url} alt="logo" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
                : <Building2 size={isMobile ? 28 : 36} color="rgba(255,255,255,0.55)" />}
            </div>
            <div>
              <h1 style={{ fontSize: isMobile ? T.heading : T.hero, fontWeight: 900, color: "#ffffff", margin: 0, lineHeight: 1.2 }}>
                {company.company_name || "Agency Profile"}
              </h1>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 8 }}>
                <span style={{ fontSize: T.caption, fontWeight: 800, padding: "4px 12px", borderRadius: 7, background: "rgba(255,255,255,0.2)", color: "#a7f3d0", letterSpacing: "0.05em" }}>
                  Lic. {company.license_no || "N/A"}
                </span>
                {company.short_name && (
                  <span style={{ fontSize: T.body, color: "rgba(255,255,255,0.85)", fontWeight: 600, alignSelf: "center" }}>
                    {company.short_name}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10, zIndex: 1 }}>
            {[
              { to: adminPath("/agency-profile/edit"), label: "Edit Profile", icon: <Edit size={16} />, solid: false },
              { to: adminPath("/employment-contracts"), label: "Contracts", icon: <Shield size={16} />, solid: false },
              { to: adminPath("/chat-support"), label: "Chat", icon: <MessageCircle size={16} />, solid: true },
            ].map(btn => (
              <Link key={btn.to} to={btn.to} className="action-btn" style={{
                display: "inline-flex", alignItems: "center", gap: 8,
                fontSize: T.body, fontWeight: 800, padding: "10px 18px", borderRadius: 11,
                textDecoration: "none", transition: "all 0.15s",
                ...(btn.solid
                  ? { background: "#fff", color: C.primary, border: "none" }
                  : { background: "rgba(255,255,255,0.16)", color: "#fff", border: "2px solid rgba(255,255,255,0.38)" }
                ),
              }}>
                {btn.icon} {btn.label}
              </Link>
            ))}
          </div>
        </div>

        {/* ── Stat chips ─────────────────────────────────────────────── */}
        {summary && (
          <div style={{ display: "grid", gridTemplateColumns: `repeat(${isMobile ? 2 : isTablet ? 4 : 8}, 1fr)`, gap: 10 }}>
            {statItems.map(({ label, value }, i) => (
              <StatChip key={label} label={label} value={value} index={i} />
            ))}
          </div>
        )}

        {/* ── Main layout ────────────────────────────────────────────── */}
        <div style={{
          display: "grid",
          gridTemplateColumns: isMobile ? "1fr" : isTablet ? "1fr" : "1fr 320px",
          gap: 18, alignItems: "start",
        }}>

          {/* LEFT: main content */}
          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>

            {/* Intro Video */}
            <Card>
              <CardHeader icon="🎬" title="Introduction Video" />
              <div style={{ padding: 18 }}>
                {company.intro_video_data_url ? (
                  <div style={{ borderRadius: 14, overflow: "hidden", background: "#0f172a", border: "2px solid #1e293b" }}>
                    <div style={{ background: "linear-gradient(90deg,#1e3a5f,#0D6E56)", padding: "10px 16px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <span style={{ fontSize: T.body, color: "#fff", fontWeight: 700 }}>🎬 Agency Introduction</span>
                      <span style={{ fontSize: T.caption, background: "rgba(255,255,255,0.18)", color: "#a7f3d0", padding: "3px 10px", borderRadius: 20, fontWeight: 700, letterSpacing: "0.06em" }}>PREVIEW</span>
                    </div>
                    <video controls style={{ display: "block", width: "100%", maxHeight: 320, background: "#000" }} src={company.intro_video_data_url} />
                  </div>
                ) : (
                  <div style={{ borderRadius: 14, background: "#F8FAFC", border: `2px dashed ${C.border}`, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10, padding: "36px 24px" }}>
                    <div style={{ width: 56, height: 56, borderRadius: 14, background: C.primaryLight, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <Camera size={26} color={C.primary} />
                    </div>
                    <p style={{ margin: 0, fontSize: T.bodyLg, color: C.textSoft, fontWeight: 600 }}>No introduction video uploaded yet</p>
                    <Link to={adminPath("/agency-profile/edit")} style={{ fontSize: T.body, color: C.primary, fontWeight: 800, textDecoration: "none" }}>
                      Upload video →
                    </Link>
                  </div>
                )}
              </div>
            </Card>

            {/* About Us */}
            <Card>
              <CardHeader icon="📋" title="About Us" />
              <div style={{ padding: "16px 20px" }}>
                {company.about_us ? (
                  <p style={{ margin: 0, fontSize: T.bodyLg, lineHeight: 1.9, color: C.text, whiteSpace: "pre-wrap", fontWeight: 500 }}>
                    {company.about_us}
                  </p>
                ) : (
                  <p style={{ margin: 0, fontSize: T.bodyLg, color: C.textSoft, fontStyle: "italic", fontWeight: 500 }}>No about us content yet.</p>
                )}
              </div>
            </Card>

            {/* Gallery */}
            <Card>
              <CardHeader icon="🖼" title="Gallery" count={gallery.length} />
              {gallery.length === 0 ? (
                <div style={{ display: "flex", height: "6rem", alignItems: "center", justifyContent: "center", gap: 10, color: C.textSoft, fontSize: T.bodyLg, fontWeight: 600 }}>
                  <ImageIcon size={20} /> No gallery images uploaded yet
                </div>
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: `repeat(auto-fill, minmax(${isMobile ? 90 : 110}px, 1fr))`, gap: 10, padding: 16 }}>
                  {gallery.map((img, idx) => (
                    <button key={`${img.slice(-10)}-${idx}`} type="button" className="gallery-thumb"
                      onClick={() => setLightboxImage(img)}
                      style={{ aspectRatio: "1/1", overflow: "hidden", borderRadius: 12, border: `2px solid ${C.border}`, background: C.bg, cursor: "pointer", padding: 0, transition: "transform 0.18s ease, box-shadow 0.18s ease" }}>
                      <img src={img} alt={`Gallery ${idx + 1}`} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                    </button>
                  ))}
                </div>
              )}
            </Card>

            {/* MOM + Testimonials */}
            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 18, alignItems: "start" }}>

              {/* MOM Personnel */}
              <Card>
                <CardHeader icon="👤" title="MOM Personnel" count={momPersonnel.length} />
                {momPersonnel.length === 0 ? (
                  <div style={{ display: "flex", height: "6rem", alignItems: "center", justifyContent: "center", gap: 10, color: C.textSoft, fontSize: T.bodyLg, fontWeight: 600 }}>
                    <Users size={20} /> No MOM personnel added yet
                  </div>
                ) : (
                  <div style={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse" }}>
                      <thead>
                        <tr style={{ background: "#F0F4F8", borderBottom: `2px solid ${C.borderLight}` }}>
                          {["#", "Name", "Reg. No."].map(h => (
                            <th key={h} style={{ padding: "12px 16px", textAlign: "left", fontSize: T.caption, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase", color: C.text }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {momPersonnel.map((p, i) => (
                          <tr key={p.id} style={{ borderBottom: `1.5px solid ${C.borderLight}` }}
                            onMouseEnter={e => (e.currentTarget as HTMLTableRowElement).style.background = "#F4F7FA"}
                            onMouseLeave={e => (e.currentTarget as HTMLTableRowElement).style.background = "transparent"}>
                            <td style={{ padding: "12px 16px", fontSize: T.body, color: C.textSoft, fontWeight: 600 }}>{i + 1}</td>
                            <td style={{ padding: "12px 16px", fontSize: T.bodyLg, fontWeight: 700, color: C.text }}>{p.name}</td>
                            <td style={{ padding: "12px 16px", fontSize: T.body, fontFamily: "monospace", color: C.text, fontWeight: 600 }}>{p.registration_number}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </Card>

              {/* Testimonials */}
              <Card>
                <CardHeader icon="💬" title="Testimonials" count={testimonials.length} />
                {testimonials.length === 0 ? (
                  <div style={{ display: "flex", height: "6rem", alignItems: "center", justifyContent: "center", gap: 10, color: C.textSoft, fontSize: T.bodyLg, fontWeight: 600 }}>
                    <Star size={20} /> No testimonials added yet
                  </div>
                ) : (
                  <div style={{ maxHeight: 380, overflowY: "auto" }}>
                    {testimonials.map((t, i) => (
                      <div key={t.id} style={{ padding: "16px 20px", borderBottom: `1.5px solid ${C.borderLight}`, background: i % 2 === 0 ? "#fff" : "#F8FAFB" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                          <div style={{ display: "flex", gap: 2 }}>
                            {[...Array(5)].map((_, j) => <Star key={j} size={14} fill="#F59E0B" color="#F59E0B" />)}
                          </div>
                          <span style={{ fontSize: T.bodyLg, fontWeight: 800, color: C.text }}>{t.author}</span>
                        </div>
                        <p style={{ margin: 0, fontSize: T.body, color: C.text, lineHeight: 1.8, fontWeight: 500 }}>{t.message}</p>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </div>

            {/* On tablet/mobile, sidebar moves here */}
            {(isMobile || isTablet) && <SidebarContent company={company} />}
          </div>

          {/* RIGHT: sidebar — desktop only */}
          {!isMobile && !isTablet && <SidebarContent company={company} />}
        </div>
      </div>
    </>
  );
};

/* ─── Sidebar content extracted ─────────────────────────────────────── */
const SidebarContent = ({ company }: { company: CompanyProfileApi }) => {
  const width = useWindowWidth();
  const isMobile = width < 768;
  const isTablet = width < 1100;
  const isWide = !isMobile && !isTablet;

  return (
    <div style={{ display: "flex", flexDirection: isWide ? "column" : "row", flexWrap: "wrap", gap: 18, alignItems: "start" }}>

      {/* Contact Details */}
      <Card style={{ flex: isWide ? undefined : "1 1 300px", minWidth: 0 }}>
        <CardHeader icon="📞" title="Contact Details" />
        <div style={{ padding: "6px 18px 12px" }}>
          <ContactRow icon={Building2} label="Company" value={company.company_name} />
          <ContactRow icon={Users} label="Contact Person" value={company.contact_person} />
          <ContactRow icon={Phone} label="Phone" value={company.contact_phone} href={`tel:${company.contact_phone}`} />
          <ContactRow icon={Mail} label="Email" value={company.contact_email} href={`mailto:${company.contact_email}`} />
          <ContactRow icon={Printer} label="Fax" value={company.contact_fax} />
          <ContactRow icon={Globe} label="Website" value={company.contact_website} href={company.contact_website} />
          <ContactRow icon={Facebook} label="Facebook" value={company.social_facebook} href={company.social_facebook} />
          <ContactRow icon={MessageCircle} label="WhatsApp" value={company.social_whatsapp_number}
            href={`https://wa.me/${company.social_whatsapp_number?.replace(/\D/g, "")}`} />
        </div>
      </Card>

      {/* Location */}
      <Card style={{ flex: isWide ? undefined : "1 1 240px", minWidth: 0 }}>
        <CardHeader icon="📍" title="Location" />
        <div style={{ padding: "6px 18px 12px" }}>
          <ContactRow icon={MapPin} label="Address"
            value={[company.address_line1, company.address_line2, company.postal_code, company.country].filter(Boolean).join(", ") || undefined} />
          <ContactRow icon={Clock} label="Office Hours" value={company.office_hours_regular} />
          <ContactRow icon={Clock} label="Other Hours" value={company.office_hours_other} />
        </div>
      </Card>

      {/* Registration */}
      <Card style={{ flex: isWide ? undefined : "1 1 220px", minWidth: 0 }}>
        <CardHeader icon="🏛" title="Registration" />
        <div style={{ padding: "6px 18px 12px" }}>
          <ContactRow icon={Shield} label="License No." value={company.license_no} />
          <ContactRow icon={Building2} label="Short Name" value={company.short_name} />
        </div>
      </Card>
    </div>
  );
};

export default AgencyProfile;