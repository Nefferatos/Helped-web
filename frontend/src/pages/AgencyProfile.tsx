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

/* ─── Design tokens ──────────────────────────────────────────────────── */
const C = {
  primary: "#0D6E56",
  primaryDark: "#085041",
  primaryLight: "#E1F5EE",
  primaryBorder: "#9FE1CB",
  bg: "#F4F6F9",
  card: "#ffffff",
  border: "#E8ECF2",
  borderLight: "#F1F4F8",
  text: "#1A2332",
  textMid: "#4A5568",
  textSoft: "#8A96A8",
  headerFrom: "#0a2540",
  headerTo: "#0D6E56",
};

/* ─── Card wrapper ───────────────────────────────────────────────────── */
const Card = ({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) => (
  <div style={{
    background: C.card, borderRadius: 16, border: `1.5px solid ${C.border}`,
    boxShadow: "0 2px 12px rgba(0,0,0,0.06)", overflow: "hidden", ...style,
  }}>
    {children}
  </div>
);

/* ─── Card header ────────────────────────────────────────────────────── */
const CardHeader = ({ icon, title, count }: { icon: string; title: string; count?: number }) => (
  <div style={{
    display: "flex", alignItems: "center", justifyContent: "space-between",
    padding: "12px 16px", borderBottom: `1.5px solid ${C.borderLight}`,
    background: "linear-gradient(135deg, #FAFBFC 0%, #F4F6F9 100%)",
  }}>
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <span style={{ fontSize: 16 }}>{icon}</span>
      <span style={{ fontSize: 13, fontWeight: 800, color: C.text, letterSpacing: "0.01em" }}>{title}</span>
    </div>
    {count !== undefined && (
      <span style={{
        fontSize: 11, fontWeight: 700, padding: "2px 9px", borderRadius: 20,
        background: C.primaryLight, color: C.primary, border: `1px solid ${C.primaryBorder}`,
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
      display: "flex", alignItems: "flex-start", gap: 12,
      padding: "10px 0", borderBottom: `1px solid ${C.borderLight}`,
    }}>
      <div style={{
        width: 32, height: 32, borderRadius: 8, flexShrink: 0,
        background: C.primaryLight, border: `1.5px solid ${C.primaryBorder}`,
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <Icon size={14} color={C.primary} />
      </div>
      <div style={{ minWidth: 0, flex: 1 }}>
        <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: C.textSoft, margin: "0 0 2px" }}>
          {label}
        </p>
        {href ? (
          <a href={href} target="_blank" rel="noreferrer" style={{
            fontSize: 13, color: C.primary, textDecoration: "none",
            fontWeight: 600, wordBreak: "break-all", lineHeight: 1.4,
          }}>{value}</a>
        ) : (
          <p style={{ fontSize: 13, color: C.text, fontWeight: 500, wordBreak: "break-all", margin: 0, lineHeight: 1.4 }}>
            {value}
          </p>
        )}
      </div>
    </div>
  );
};

/* ─── Stat chip ──────────────────────────────────────────────────────── */
const statPalette = [
  { bg: "#E8F5E9", text: "#2E7D32", border: "#A5D6A7" },
  { bg: "#E3F2FD", text: "#1565C0", border: "#90CAF9" },
  { bg: "#FFF3E0", text: "#E65100", border: "#FFCC80" },
  { bg: "#F3E5F5", text: "#6A1B9A", border: "#CE93D8" },
  { bg: "#FCE4EC", text: "#880E4F", border: "#F48FB1" },
  { bg: "#E0F7FA", text: "#00695C", border: "#80DEEA" },
  { bg: "#FFF8E1", text: "#F57F17", border: "#FFE082" },
  { bg: "#F1F8E9", text: "#33691E", border: "#C5E1A5" },
];

const StatChip = ({ label, value, index }: { label: string; value: number; index: number }) => {
  const p = statPalette[index % statPalette.length];
  return (
    <div style={{
      background: p.bg, border: `1.5px solid ${p.border}`, borderRadius: 12,
      padding: "10px 14px", display: "flex", flexDirection: "column", gap: 2,
    }}>
      <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: p.text, opacity: 0.8 }}>
        {label}
      </span>
      <span style={{ fontSize: 26, fontWeight: 800, color: p.text, lineHeight: 1 }}>{value}</span>
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
        <div style={{ width: 40, height: 40, borderRadius: "50%", border: `3px solid ${C.primaryLight}`, borderTopColor: C.primary, animation: "spin 0.8s linear infinite" }} />
        <span style={{ fontSize: 13, color: C.textSoft, fontWeight: 600 }}>Loading profile…</span>
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  if (loadError || !company) return (
    <div style={{ display: "flex", height: "16rem", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12 }}>
      <p style={{ fontSize: 14, color: "#ef4444", fontWeight: 600 }}>{loadError || "Failed to load"}</p>
      <button onClick={() => void loadCompanyProfile()} style={{
        fontSize: 13, padding: "8px 18px", borderRadius: 8, border: `1.5px solid ${C.border}`,
        background: "#fff", color: C.textMid, cursor: "pointer", fontWeight: 600,
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
        .gallery-thumb:hover { transform: scale(1.04); box-shadow: 0 6px 20px rgba(13,110,86,0.18) !important; }
        .action-btn:hover { opacity: 0.88; transform: translateY(-1px); }
      `}</style>

      {/* Lightbox */}
      {lightboxImage && (
        <div style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.85)" }}
          onClick={() => setLightboxImage(null)}>
          <div style={{ position: "relative" }} onClick={e => e.stopPropagation()}>
            <img src={lightboxImage} alt="Gallery preview" style={{ maxHeight: "90vh", maxWidth: "92vw", borderRadius: 14, objectFit: "contain", boxShadow: "0 30px 80px rgba(0,0,0,0.6)" }} />
            <button onClick={() => setLightboxImage(null)} style={{ position: "absolute", top: -14, right: -14, width: 32, height: 32, borderRadius: "50%", background: "#fff", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 2px 12px rgba(0,0,0,0.25)" }}>
              <X size={15} color="#374151" />
            </button>
          </div>
        </div>
      )}

      <div className="ap-fadein" style={{ display: "flex", flexDirection: "column", gap: 16, fontSize: 14, color: C.text, lineHeight: 1.6 }}>

        {/* ── Hero header ───────────────────────────────────────────── */}
        <div style={{
          background: `linear-gradient(135deg, ${C.headerFrom} 0%, ${C.headerTo} 100%)`,
          borderRadius: 18, padding: isMobile ? "18px 16px" : "22px 28px",
          boxShadow: "0 8px 32px rgba(13,110,86,0.25)",
          display: "flex", flexWrap: "wrap", alignItems: "center",
          justifyContent: "space-between", gap: 16, position: "relative", overflow: "hidden",
        }}>
          {/* Decorative circles */}
          <div style={{ position: "absolute", top: -40, right: -40, width: 160, height: 160, borderRadius: "50%", background: "rgba(255,255,255,0.05)", pointerEvents: "none" }} />
          <div style={{ position: "absolute", bottom: -30, left: "40%", width: 100, height: 100, borderRadius: "50%", background: "rgba(255,255,255,0.04)", pointerEvents: "none" }} />

          {/* Logo + name */}
          <div style={{ display: "flex", alignItems: "center", gap: 16, zIndex: 1 }}>
            <div style={{
              width: isMobile ? 56 : 70, height: isMobile ? 56 : 70, flexShrink: 0,
              borderRadius: 14, border: "2.5px solid rgba(255,255,255,0.28)",
              background: "rgba(255,255,255,0.12)", overflow: "hidden",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              {company.logo_data_url
                ? <img src={company.logo_data_url} alt="logo" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
                : <Building2 size={isMobile ? 24 : 30} color="rgba(255,255,255,0.5)" />}
            </div>
            <div>
              <h1 style={{ fontSize: isMobile ? 18 : 22, fontWeight: 800, color: "#fff", margin: 0, lineHeight: 1.2 }}>
                {company.company_name || "Agency Profile"}
              </h1>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 6 }}>
                <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 10px", borderRadius: 6, background: "rgba(255,255,255,0.18)", color: "#a7f3d0", letterSpacing: "0.05em" }}>
                  Lic. {company.license_no || "N/A"}
                </span>
                {company.short_name && (
                  <span style={{ fontSize: 12, color: "rgba(255,255,255,0.7)", fontWeight: 500, alignSelf: "center" }}>
                    {company.short_name}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, zIndex: 1 }}>
            {[
              { to: adminPath("/agency-profile/edit"), label: "Edit Profile", icon: <Edit size={14} />, solid: false },
              { to: adminPath("/employment-contracts"), label: "Contracts", icon: <Shield size={14} />, solid: false },
              { to: adminPath("/chat-support"), label: "Chat", icon: <MessageCircle size={14} />, solid: true },
            ].map(btn => (
              <Link key={btn.to} to={btn.to} className="action-btn" style={{
                display: "inline-flex", alignItems: "center", gap: 6,
                fontSize: 12, fontWeight: 700, padding: "8px 14px", borderRadius: 9,
                textDecoration: "none", transition: "all 0.15s",
                ...(btn.solid
                  ? { background: "#fff", color: C.primary, border: "none" }
                  : { background: "rgba(255,255,255,0.14)", color: "#fff", border: "1.5px solid rgba(255,255,255,0.35)" }
                ),
              }}>
                {btn.icon} {btn.label}
              </Link>
            ))}
          </div>
        </div>

        {/* ── Stat chips ─────────────────────────────────────────────── */}
        {summary && (
          <div style={{ display: "grid", gridTemplateColumns: `repeat(${isMobile ? 2 : isTablet ? 4 : 8}, 1fr)`, gap: 8 }}>
            {statItems.map(({ label, value }, i) => (
              <StatChip key={label} label={label} value={value} index={i} />
            ))}
          </div>
        )}

        {/* ── Main layout ────────────────────────────────────────────── */}
        <div style={{
          display: "grid",
          gridTemplateColumns: isMobile ? "1fr" : isTablet ? "1fr" : "1fr 300px",
          gap: 16, alignItems: "start",
        }}>

          {/* LEFT: main content */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

            {/* Intro Video */}
            <Card>
              <CardHeader icon="🎬" title="Introduction Video" />
              <div style={{ padding: 16 }}>
                {company.intro_video_data_url ? (
                  <div style={{ borderRadius: 12, overflow: "hidden", background: "#0f172a", border: "2px solid #1e293b" }}>
                    <div style={{ background: "linear-gradient(90deg,#1e3a5f,#0D6E56)", padding: "8px 14px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <span style={{ fontSize: 12, color: "#fff", fontWeight: 700 }}>🎬 Agency Introduction</span>
                      <span style={{ fontSize: 10, background: "rgba(255,255,255,0.15)", color: "#a7f3d0", padding: "2px 8px", borderRadius: 20, fontWeight: 700, letterSpacing: "0.06em" }}>PREVIEW</span>
                    </div>
                    <video controls style={{ display: "block", width: "100%", maxHeight: 300, background: "#000" }} src={company.intro_video_data_url} />
                  </div>
                ) : (
                  <div style={{ borderRadius: 12, background: "#F8FAFC", border: `1.5px dashed ${C.border}`, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8, padding: "28px 20px" }}>
                    <div style={{ width: 48, height: 48, borderRadius: 12, background: C.primaryLight, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <Camera size={22} color={C.primary} />
                    </div>
                    <p style={{ margin: 0, fontSize: 13, color: C.textSoft, fontWeight: 500 }}>No introduction video uploaded yet</p>
                    <Link to={adminPath("/agency-profile/edit")} style={{ fontSize: 12, color: C.primary, fontWeight: 700, textDecoration: "none" }}>
                      Upload video →
                    </Link>
                  </div>
                )}
              </div>
            </Card>

            {/* About Us */}
            <Card>
              <CardHeader icon="📋" title="About Us" />
              <div style={{ padding: "14px 16px" }}>
                {company.about_us ? (
                  <p style={{ margin: 0, fontSize: 13, lineHeight: 1.8, color: C.textMid, whiteSpace: "pre-wrap" }}>
                    {company.about_us}
                  </p>
                ) : (
                  <p style={{ margin: 0, fontSize: 13, color: C.textSoft, fontStyle: "italic" }}>No about us content yet.</p>
                )}
              </div>
            </Card>

            {/* Gallery */}
            <Card>
              <CardHeader icon="🖼" title="Gallery" count={gallery.length} />
              {gallery.length === 0 ? (
                <div style={{ display: "flex", height: "5rem", alignItems: "center", justifyContent: "center", gap: 8, color: C.textSoft, fontSize: 13 }}>
                  <ImageIcon size={16} /> No gallery images uploaded yet
                </div>
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: `repeat(auto-fill, minmax(${isMobile ? 80 : 100}px, 1fr))`, gap: 8, padding: 14 }}>
                  {gallery.map((img, idx) => (
                    <button key={`${img.slice(-10)}-${idx}`} type="button" className="gallery-thumb"
                      onClick={() => setLightboxImage(img)}
                      style={{ aspectRatio: "1/1", overflow: "hidden", borderRadius: 10, border: `1.5px solid ${C.border}`, background: C.bg, cursor: "pointer", padding: 0, transition: "transform 0.18s ease, box-shadow 0.18s ease" }}>
                      <img src={img} alt={`Gallery ${idx + 1}`} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                    </button>
                  ))}
                </div>
              )}
            </Card>

            {/* MOM + Testimonials */}
            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 16, alignItems: "start" }}>

              {/* MOM Personnel */}
              <Card>
                <CardHeader icon="👤" title="MOM Personnel" count={momPersonnel.length} />
                {momPersonnel.length === 0 ? (
                  <div style={{ display: "flex", height: "5rem", alignItems: "center", justifyContent: "center", gap: 8, color: C.textSoft, fontSize: 13 }}>
                    <Users size={16} /> No MOM personnel added yet
                  </div>
                ) : (
                  <div style={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse" }}>
                      <thead>
                        <tr style={{ background: "#F8FAFC", borderBottom: `1.5px solid ${C.borderLight}` }}>
                          {["#", "Name", "Reg. No."].map(h => (
                            <th key={h} style={{ padding: "8px 14px", textAlign: "left", fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: C.textSoft }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {momPersonnel.map((p, i) => (
                          <tr key={p.id} style={{ borderBottom: `1px solid ${C.borderLight}` }}
                            onMouseEnter={e => (e.currentTarget as HTMLTableRowElement).style.background = "#F8FAFC"}
                            onMouseLeave={e => (e.currentTarget as HTMLTableRowElement).style.background = "transparent"}>
                            <td style={{ padding: "9px 14px", fontSize: 12, color: C.textSoft }}>{i + 1}</td>
                            <td style={{ padding: "9px 14px", fontSize: 13, fontWeight: 600, color: C.text }}>{p.name}</td>
                            <td style={{ padding: "9px 14px", fontSize: 12, fontFamily: "monospace", color: C.textMid }}>{p.registration_number}</td>
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
                  <div style={{ display: "flex", height: "5rem", alignItems: "center", justifyContent: "center", gap: 8, color: C.textSoft, fontSize: 13 }}>
                    <Star size={16} /> No testimonials added yet
                  </div>
                ) : (
                  <div style={{ maxHeight: 320, overflowY: "auto" }}>
                    {testimonials.map((t, i) => (
                      <div key={t.id} style={{ padding: "12px 16px", borderBottom: `1px solid ${C.borderLight}`, background: i % 2 === 0 ? "#fff" : "#FAFBFC" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                          <div style={{ display: "flex", gap: 1 }}>
                            {[...Array(5)].map((_, j) => <Star key={j} size={11} fill="#F59E0B" color="#F59E0B" />)}
                          </div>
                          <span style={{ fontSize: 13, fontWeight: 700, color: C.text }}>{t.author}</span>
                        </div>
                        <p style={{ margin: 0, fontSize: 12, color: C.textMid, lineHeight: 1.7 }}>{t.message}</p>
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
    <div style={{ display: "flex", flexDirection: isWide ? "column" : "row", flexWrap: "wrap", gap: 16, alignItems: "start" }}>

      {/* Contact Details */}
      <Card style={{ flex: isWide ? undefined : "1 1 280px", minWidth: 0 }}>
        <CardHeader icon="📞" title="Contact Details" />
        <div style={{ padding: "4px 14px 8px" }}>
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
      <Card style={{ flex: isWide ? undefined : "1 1 220px", minWidth: 0 }}>
        <CardHeader icon="📍" title="Location" />
        <div style={{ padding: "4px 14px 8px" }}>
          <ContactRow icon={MapPin} label="Address"
            value={[company.address_line1, company.address_line2, company.postal_code, company.country].filter(Boolean).join(", ") || undefined} />
          <ContactRow icon={Clock} label="Office Hours" value={company.office_hours_regular} />
          <ContactRow icon={Clock} label="Other Hours" value={company.office_hours_other} />
        </div>
      </Card>

      {/* Registration */}
      <Card style={{ flex: isWide ? undefined : "1 1 200px", minWidth: 0 }}>
        <CardHeader icon="🏛" title="Registration" />
        <div style={{ padding: "4px 14px 8px" }}>
          <ContactRow icon={Shield} label="License No." value={company.license_no} />
          <ContactRow icon={Building2} label="Short Name" value={company.short_name} />
        </div>
      </Card>
    </div>
  );
};

export default AgencyProfile;