import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getAgencyAdminAuthHeaders } from "@/lib/agencyAdminAuth";
import {
  Edit, MessageCircle, Building2, Phone, Globe, MapPin, Clock,
  Users, Star, Image as ImageIcon, Mail, Printer, Facebook, X,
  Shield, Camera, Eye, EyeOff, TrendingUp, ChevronRight,
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

/* ─── Design Tokens ──────────────────────────────────────────────────── */
const C = {
  primary:       "#0D6E56",
  primaryDark:   "#085041",
  primaryLight:  "#E8F7F2",
  primaryMid:    "#C3EBE0",
  bg:            "#F5F7FA",
  card:          "#FFFFFF",
  border:        "#E4E9F0",
  borderLight:   "#EEF2F7",
  text:          "#0D1117",
  textMid:       "#2D3748",
  textSoft:      "#64748B",
  textMuted:     "#94A3B8",
  headerFrom:    "#0a2540",
  headerTo:      "#0D6E56",
  accent:        "#F59E0B",
  danger:        "#EF4444",
};

/* ─── Stat Config ────────────────────────────────────────────────────── */
const statConfig = [
  { label: "Total Maids",   icon: Users,         color: "#3730A3", bg: "#EEF2FF", border: "#C7D2FE", key: "totalMaids"      },
  { label: "Public",        icon: Eye,           color: "#065F46", bg: "#ECFDF5", border: "#6EE7B7", key: "publicMaids"    },
  { label: "Hidden",        icon: EyeOff,        color: "#9A3412", bg: "#FFF7ED", border: "#FDBA74", key: "hiddenMaids"    },
  { label: "With Photos",   icon: Camera,        color: "#6B21A8", bg: "#FAF5FF", border: "#D8B4FE", key: "maidsWithPhotos"},
  { label: "Enquiries",     icon: MessageCircle, color: "#9F1239", bg: "#FFF1F2", border: "#FECDD3", key: "enquiries"      },
  { label: "MOM Staff",     icon: Shield,        color: "#0C4A6E", bg: "#F0F9FF", border: "#BAE6FD", key: "momPersonnel"   },
  { label: "Testimonials",  icon: Star,          color: "#78350F", bg: "#FFFBEB", border: "#FDE68A", key: "testimonials"   },
  { label: "Gallery",       icon: ImageIcon,     color: "#14532D", bg: "#F0FDF4", border: "#86EFAC", key: "galleryImages"  },
] as const;

/* ─── Global CSS ─────────────────────────────────────────────────────── */
const GLOBAL_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&display=swap');

  * { box-sizing: border-box; }

  .ap-root { font-family: 'Plus Jakarta Sans', sans-serif; }

  @keyframes fadeUp {
    from { opacity: 0; transform: translateY(10px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes spin { to { transform: rotate(360deg); } }

  .ap-fadein { animation: fadeUp 0.35s ease both; }

  .ap-card {
    background: #fff;
    border-radius: 16px;
    border: 1.5px solid ${C.border};
    box-shadow: 0 1px 4px rgba(0,0,0,0.05), 0 4px 16px rgba(0,0,0,0.04);
    overflow: hidden;
  }

  .ap-card-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 14px 20px;
    border-bottom: 1.5px solid ${C.borderLight};
    background: linear-gradient(135deg, #FAFBFD 0%, #F4F7FB 100%);
  }

  .ap-card-header-left {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .ap-card-header-icon {
    width: 34px;
    height: 34px;
    border-radius: 9px;
    background: ${C.primaryLight};
    border: 1.5px solid ${C.primaryMid};
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  .ap-card-header-title {
    font-size: 15px;
    font-weight: 800;
    color: ${C.text};
    letter-spacing: -0.01em;
  }

  .ap-badge {
    font-size: 12px;
    font-weight: 700;
    padding: 3px 11px;
    border-radius: 20px;
    background: ${C.primaryLight};
    color: ${C.primaryDark};
    border: 1.5px solid ${C.primaryMid};
    line-height: 1;
  }

  .ap-stat-chip {
    border-radius: 14px;
    padding: 14px 16px;
    display: flex;
    flex-direction: column;
    gap: 10px;
    border-width: 1.5px;
    border-style: solid;
    transition: transform 0.15s ease, box-shadow 0.15s ease;
  }
  .ap-stat-chip:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(0,0,0,0.08);
  }

  .ap-stat-chip-top {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .ap-stat-label {
    font-size: 10px;
    font-weight: 800;
    letter-spacing: 0.1em;
    text-transform: uppercase;
  }

  .ap-stat-icon {
    width: 28px;
    height: 28px;
    border-radius: 8px;
    background: rgba(255,255,255,0.65);
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .ap-stat-value {
    font-size: 30px;
    font-weight: 900;
    line-height: 1;
    letter-spacing: -0.03em;
  }

  .ap-contact-row {
    display: flex;
    align-items: flex-start;
    gap: 12px;
    padding: 10px 0;
    border-bottom: 1px solid ${C.borderLight};
  }
  .ap-contact-row:last-child { border-bottom: none; }

  .ap-contact-icon {
    width: 34px;
    height: 34px;
    border-radius: 9px;
    flex-shrink: 0;
    background: ${C.primaryLight};
    border: 1.5px solid ${C.primaryMid};
    display: flex;
    align-items: center;
    justify-content: center;
    margin-top: 1px;
  }

  .ap-contact-label {
    font-size: 10px;
    font-weight: 800;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: ${C.textMuted};
    margin: 0 0 3px;
    line-height: 1;
  }

  .ap-contact-value {
    font-size: 14px;
    color: ${C.textMid};
    font-weight: 600;
    word-break: break-all;
    margin: 0;
    line-height: 1.5;
  }

  .ap-contact-link {
    font-size: 14px;
    color: ${C.primary};
    font-weight: 600;
    word-break: break-all;
    text-decoration: none;
    line-height: 1.5;
  }
  .ap-contact-link:hover { text-decoration: underline; }

  .ap-action-btn {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    font-size: 14px;
    font-weight: 700;
    padding: 9px 17px;
    border-radius: 10px;
    text-decoration: none;
    transition: transform 0.15s ease, opacity 0.15s ease, box-shadow 0.15s ease;
    cursor: pointer;
    font-family: 'Plus Jakarta Sans', sans-serif;
    line-height: 1;
  }
  .ap-action-btn:hover { transform: translateY(-1px); opacity: 0.9; }

  .ap-gallery-thumb {
    aspect-ratio: 1/1;
    overflow: hidden;
    border-radius: 10px;
    border: 1.5px solid ${C.border};
    background: ${C.bg};
    cursor: pointer;
    padding: 0;
    transition: transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease;
  }
  .ap-gallery-thumb:hover {
    transform: scale(1.04);
    box-shadow: 0 8px 24px rgba(13,110,86,0.18);
    border-color: ${C.primaryMid};
  }

  .ap-testimonial-item:nth-child(odd)  { background: #fff; }
  .ap-testimonial-item:nth-child(even) { background: #FAFBFD; }

  .ap-table-row:hover { background: #F5F8FC !important; }

  .ap-empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 10px;
    padding: 36px 20px;
  }
  .ap-empty-icon {
    width: 50px;
    height: 50px;
    border-radius: 13px;
    background: ${C.primaryLight};
    border: 1.5px solid ${C.primaryMid};
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .ap-empty-text {
    font-size: 14px;
    color: ${C.textSoft};
    font-weight: 600;
    text-align: center;
    margin: 0;
  }

  .ap-lightbox-overlay {
    position: fixed; inset: 0; z-index: 9999;
    display: flex; align-items: center; justify-content: center;
    background: rgba(0,0,0,0.92);
    animation: fadeUp 0.2s ease both;
  }

  .ap-section-divider {
    height: 1px;
    background: linear-gradient(90deg, transparent, ${C.border} 20%, ${C.border} 80%, transparent);
    margin: 2px 0;
  }
`;

/* ─── Sub-components ─────────────────────────────────────────────────── */

const SectionCard = ({
  children, style,
}: { children: React.ReactNode; style?: React.CSSProperties }) => (
  <div className="ap-card" style={style}>{children}</div>
);

const SectionHeader = ({
  icon: Icon, title, count,
}: { icon: React.ElementType; title: string; count?: number }) => (
  <div className="ap-card-header">
    <div className="ap-card-header-left">
      <div className="ap-card-header-icon">
        <Icon size={16} color={C.primary} />
      </div>
      <span className="ap-card-header-title">{title}</span>
    </div>
    {count !== undefined && (
      <span className="ap-badge">{count}</span>
    )}
  </div>
);

const StatChip = ({
  label, value, color, bg, border, icon: Icon,
}: { label: string; value: number; color: string; bg: string; border: string; icon: React.ElementType }) => (
  <div className="ap-stat-chip" style={{ background: bg, borderColor: border }}>
    <div className="ap-stat-chip-top">
      <span className="ap-stat-label" style={{ color }}>{label}</span>
      <div className="ap-stat-icon">
        <Icon size={14} color={color} />
      </div>
    </div>
    <span className="ap-stat-value" style={{ color }}>{value}</span>
  </div>
);

const ContactRow = ({
  icon: Icon, label, value, href,
}: { icon: React.ElementType; label: string; value?: string; href?: string }) => {
  if (!value) return null;
  return (
    <div className="ap-contact-row">
      <div className="ap-contact-icon"><Icon size={15} color={C.primary} /></div>
      <div style={{ minWidth: 0, flex: 1 }}>
        <p className="ap-contact-label">{label}</p>
        {href
          ? <a href={href} target="_blank" rel="noreferrer" className="ap-contact-link">{value}</a>
          : <p className="ap-contact-value">{value}</p>
        }
      </div>
    </div>
  );
};

const EmptyState = ({ icon: Icon, message }: { icon: React.ElementType; message: string }) => (
  <div className="ap-empty">
    <div className="ap-empty-icon"><Icon size={22} color={C.primary} /></div>
    <p className="ap-empty-text">{message}</p>
  </div>
);

/* ─── Sidebar ────────────────────────────────────────────────────────── */
const Sidebar = ({ company }: { company: CompanyProfileApi }) => (
  <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

    {/* Contact Details */}
    <SectionCard>
      <SectionHeader icon={Phone} title="Contact Details" />
      <div style={{ padding: "6px 18px 14px" }}>
        <ContactRow icon={Building2} label="Company"       value={company.company_name} />
        <ContactRow icon={Users}     label="Contact Person" value={company.contact_person} />
        <ContactRow icon={Phone}     label="Phone"         value={company.contact_phone}   href={`tel:${company.contact_phone}`} />
        <ContactRow icon={Mail}      label="Email"         value={company.contact_email}   href={`mailto:${company.contact_email}`} />
        <ContactRow icon={Printer}   label="Fax"           value={company.contact_fax} />
        <ContactRow icon={Globe}     label="Website"       value={company.contact_website} href={company.contact_website} />
        <ContactRow icon={Facebook}  label="Facebook"      value={company.social_facebook} href={company.social_facebook} />
        <ContactRow icon={MessageCircle} label="WhatsApp"  value={company.social_whatsapp_number}
          href={`https://wa.me/${company.social_whatsapp_number?.replace(/\D/g, "")}`} />
      </div>
    </SectionCard>

    {/* Location */}
    <SectionCard>
      <SectionHeader icon={MapPin} title="Location" />
      <div style={{ padding: "6px 18px 14px" }}>
        <ContactRow icon={MapPin} label="Address"
          value={[company.address_line1, company.address_line2, company.postal_code, company.country]
            .filter(Boolean).join(", ") || undefined} />
        <ContactRow icon={Clock} label="Office Hours" value={company.office_hours_regular} />
        <ContactRow icon={Clock} label="Other Hours"  value={company.office_hours_other} />
      </div>
    </SectionCard>

    {/* Registration */}
    <SectionCard>
      <SectionHeader icon={Shield} title="Registration" />
      <div style={{ padding: "6px 18px 14px" }}>
        <ContactRow icon={Shield}    label="License No." value={company.license_no} />
        <ContactRow icon={Building2} label="Short Name"  value={company.short_name} />
      </div>
    </SectionCard>
  </div>
);

/* ─── Main ───────────────────────────────────────────────────────────── */
const AgencyProfile = () => {
  const [company, setCompany]           = useState<CompanyProfileApi | null>(null);
  const [momPersonnel, setMomPersonnel] = useState<MomPersonnelApi[]>([]);
  const [testimonials, setTestimonials] = useState<TestimonialApi[]>([]);
  const [summary, setSummary]           = useState<AgencySummary | null>(null);
  const [isLoading, setIsLoading]       = useState(true);
  const [loadError, setLoadError]       = useState<string | null>(null);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  const width    = useWindowWidth();
  const isMobile = width < 768;
  const isTablet = width < 1100;

  const loadCompanyProfile = async () => {
    try {
      setIsLoading(true); setLoadError(null);
      const [response, summaryResponse] = await Promise.all([
        fetch("/api/company",         { headers: { ...getAgencyAdminAuthHeaders() } }),
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
          totalMaids: s.totalMaids ?? 0,   maidsWithPhotos: s.maidsWithPhotos ?? 0,
          enquiries: s.enquiries ?? 0,     momPersonnel: s.momPersonnel ?? 0,
          testimonials: s.testimonials ?? 0, galleryImages: s.galleryImages ?? 0,
        });
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Failed to load";
      setLoadError(msg); toast.error(msg);
    } finally { setIsLoading(false); }
  };

  useEffect(() => { void loadCompanyProfile(); }, []);

  /* ── Loading ── */
  if (isLoading) return (
    <div style={{ display: "flex", height: "18rem", alignItems: "center", justifyContent: "center" }}>
      <style>{GLOBAL_CSS}</style>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14 }}>
        <div style={{
          width: 44, height: 44, borderRadius: "50%",
          border: `4px solid ${C.primaryLight}`, borderTopColor: C.primary,
          animation: "spin 0.8s linear infinite",
        }} />
        <span style={{ fontSize: 15, color: C.textMid, fontWeight: 700, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
          Loading profile…
        </span>
      </div>
    </div>
  );

  /* ── Error ── */
  if (loadError || !company) return (
    <div style={{ display: "flex", height: "18rem", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 14 }}>
      <style>{GLOBAL_CSS}</style>
      <p style={{ fontSize: 15, color: C.danger, fontWeight: 700, fontFamily: "'Plus Jakarta Sans', sans-serif", margin: 0 }}>
        {loadError || "Failed to load"}
      </p>
      <button onClick={() => void loadCompanyProfile()} style={{
        fontSize: 14, padding: "10px 22px", borderRadius: 10, border: `1.5px solid ${C.border}`,
        background: "#fff", color: C.text, cursor: "pointer", fontWeight: 700,
        fontFamily: "'Plus Jakarta Sans', sans-serif",
      }}>🔄 Retry</button>
    </div>
  );

  const gallery = company.gallery_image_data_urls ?? [];

  return (
    <div className="ap-root ap-fadein" style={{ display: "flex", flexDirection: "column", gap: 16, color: C.text, lineHeight: 1.7 }}>
      <style>{GLOBAL_CSS}</style>

      {/* ── Lightbox ─────────────────────────────────────────────── */}
      {lightboxImage && (
        <div className="ap-lightbox-overlay" onClick={() => setLightboxImage(null)}>
          <div style={{ position: "relative" }} onClick={e => e.stopPropagation()}>
            <img
              src={lightboxImage} alt="Gallery preview"
              style={{ maxHeight: "90vh", maxWidth: "92vw", borderRadius: 14, objectFit: "contain", boxShadow: "0 30px 80px rgba(0,0,0,0.5)" }}
            />
            <button
              onClick={() => setLightboxImage(null)}
              style={{
                position: "absolute", top: -14, right: -14,
                width: 36, height: 36, borderRadius: "50%",
                background: "#fff", border: "none", cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center",
                boxShadow: "0 2px 12px rgba(0,0,0,0.3)",
              }}>
              <X size={16} color="#111" />
            </button>
          </div>
        </div>
      )}

      {/* ── Hero Banner ──────────────────────────────────────────── */}
      <div style={{
        background: `linear-gradient(135deg, ${C.headerFrom} 0%, ${C.headerTo} 100%)`,
        borderRadius: 18,
        padding: isMobile ? "20px 18px" : "28px 32px",
        boxShadow: "0 8px 32px rgba(13,110,86,0.22)",
        position: "relative",
        overflow: "hidden",
      }}>
        {/* Decorative orbs */}
        <div style={{ position: "absolute", top: -60, right: -60, width: 220, height: 220, borderRadius: "50%", background: "rgba(255,255,255,0.04)", pointerEvents: "none" }} />
        <div style={{ position: "absolute", bottom: -40, left: "40%", width: 160, height: 160, borderRadius: "50%", background: "rgba(255,255,255,0.03)", pointerEvents: "none" }} />
        <div style={{ position: "absolute", top: "30%", right: "25%", width: 80, height: 80, borderRadius: "50%", background: "rgba(255,255,255,0.02)", pointerEvents: "none" }} />

        {/* Top row: logo + name + actions */}
        <div style={{
          display: "flex", flexWrap: "wrap", alignItems: "center",
          justifyContent: "space-between", gap: 16, position: "relative", zIndex: 1,
        }}>
          {/* Logo + Identity */}
          <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
            <div style={{
              width: isMobile ? 64 : 80, height: isMobile ? 64 : 80, flexShrink: 0,
              borderRadius: 16, border: "2px solid rgba(255,255,255,0.25)",
              background: "rgba(255,255,255,0.12)", overflow: "hidden",
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: "0 4px 20px rgba(0,0,0,0.2)",
            }}>
              {company.logo_data_url
                ? <img src={company.logo_data_url} alt="logo" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
                : <Building2 size={isMobile ? 26 : 34} color="rgba(255,255,255,0.5)" />}
            </div>
            <div>
              <h1 style={{
                fontSize: isMobile ? 20 : 26, fontWeight: 900, color: "#fff",
                margin: "0 0 7px", lineHeight: 1.15, letterSpacing: "-0.02em",
              }}>
                {company.company_name || "Agency Profile"}
              </h1>
              <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8 }}>
                <span style={{
                  fontSize: 12, fontWeight: 800, padding: "3px 11px", borderRadius: 6,
                  background: "rgba(255,255,255,0.15)", color: "#a7f3d0",
                  letterSpacing: "0.06em", textTransform: "uppercase",
                  border: "1px solid rgba(255,255,255,0.18)",
                }}>
                  Lic. {company.license_no || "N/A"}
                </span>
                {company.short_name && (
                  <span style={{ fontSize: 14, color: "rgba(255,255,255,0.7)", fontWeight: 600 }}>
                    {company.short_name}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
            <Link to={adminPath("/agency-profile/edit")} className="ap-action-btn" style={{
              background: "rgba(255,255,255,0.13)",
              color: "#fff",
              border: "1.5px solid rgba(255,255,255,0.3)",
            }}>
              <Edit size={14} /> Edit Profile
            </Link>
            <Link to={adminPath("/employment-contracts")} className="ap-action-btn" style={{
              background: "rgba(255,255,255,0.13)",
              color: "#fff",
              border: "1.5px solid rgba(255,255,255,0.3)",
            }}>
              <Shield size={14} /> Contracts
            </Link>
            <Link to={adminPath("/chat-support")} className="ap-action-btn" style={{
              background: "#fff",
              color: C.primary,
              border: "none",
              boxShadow: "0 2px 10px rgba(0,0,0,0.15)",
            }}>
              <MessageCircle size={14} /> Chat
            </Link>
          </div>
        </div>
      </div>

      {/* ── Stat Grid ────────────────────────────────────────────── */}
      {summary && (
        <div style={{
          display: "grid",
          gridTemplateColumns: isMobile ? "repeat(2,1fr)" : isTablet ? "repeat(4,1fr)" : "repeat(8,1fr)",
          gap: 10,
        }}>
          {statConfig.map(({ label, color, bg, border, key, icon }) => (
            <StatChip key={label} label={label} value={summary[key as keyof AgencySummary]}
              color={color} bg={bg} border={border} icon={icon} />
          ))}
        </div>
      )}

      {/* ── Body: Left + Right ───────────────────────────────────── */}
      <div style={{
        display: "grid",
        gridTemplateColumns: isMobile || isTablet ? "1fr" : "1fr 300px",
        gap: 16,
        alignItems: "start",
      }}>

        {/* ── Left Column ─────────────────────────────────────────── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

          {/* Intro Video */}
          <SectionCard>
            <SectionHeader icon={Camera} title="Introduction Video" />
            <div style={{ padding: 16 }}>
              {company.intro_video_data_url ? (
                <div style={{ borderRadius: 12, overflow: "hidden", background: "#0f172a", border: `1.5px solid ${C.border}` }}>
                  <div style={{
                    background: "linear-gradient(90deg, #1e3a5f, #0D6E56)",
                    padding: "9px 16px",
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                  }}>
                    <span style={{ fontSize: 14, color: "#fff", fontWeight: 700 }}>🎬 Agency Introduction</span>
                    <span style={{
                      fontSize: 11, background: "rgba(255,255,255,0.16)", color: "#a7f3d0",
                      padding: "2px 10px", borderRadius: 20, fontWeight: 700, letterSpacing: "0.06em",
                    }}>PREVIEW</span>
                  </div>
                  <video controls style={{ display: "block", width: "100%", maxHeight: 300, background: "#000" }}
                    src={company.intro_video_data_url} />
                </div>
              ) : (
                <EmptyState icon={Camera} message="No introduction video uploaded yet" />
              )}
            </div>
          </SectionCard>

          {/* About Us */}
          <SectionCard>
            <SectionHeader icon={Building2} title="About Us" />
            <div style={{ padding: "16px 20px" }}>
              {company.about_us ? (
                <p style={{
                  margin: 0, fontSize: 15, lineHeight: 1.85,
                  color: C.textMid, whiteSpace: "pre-wrap", fontWeight: 500,
                }}>
                  {company.about_us}
                </p>
              ) : (
                <p style={{ margin: 0, fontSize: 15, color: C.textMuted, fontStyle: "italic", fontWeight: 500 }}>
                  No about us content yet.
                </p>
              )}
            </div>
          </SectionCard>

          {/* Gallery */}
          <SectionCard>
            <SectionHeader icon={ImageIcon} title="Gallery" count={gallery.length} />
            {gallery.length === 0 ? (
              <EmptyState icon={ImageIcon} message="No gallery images uploaded yet" />
            ) : (
              <div style={{
                display: "grid",
                gridTemplateColumns: `repeat(auto-fill, minmax(${isMobile ? 88 : 108}px, 1fr))`,
                gap: 8, padding: 14,
              }}>
                {gallery.map((img, idx) => (
                  <button
                    key={`${img.slice(-10)}-${idx}`} type="button" className="ap-gallery-thumb"
                    onClick={() => setLightboxImage(img)}>
                    <img src={img} alt={`Gallery ${idx + 1}`} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                  </button>
                ))}
              </div>
            )}
          </SectionCard>

          {/* MOM + Testimonials side by side */}
          <div style={{
            display: "grid",
            gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr",
            gap: 14, alignItems: "start",
          }}>

            {/* MOM Personnel */}
            <SectionCard>
              <SectionHeader icon={Shield} title="MOM Personnel" count={momPersonnel.length} />
              {momPersonnel.length === 0 ? (
                <EmptyState icon={Users} message="No MOM personnel added yet" />
              ) : (
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                      <tr style={{ background: "#F4F7FB", borderBottom: `1.5px solid ${C.borderLight}` }}>
                        {["#", "Name", "Reg. No."].map(h => (
                          <th key={h} style={{
                            padding: "10px 14px", textAlign: "left",
                            fontSize: 11, fontWeight: 800,
                            letterSpacing: "0.08em", textTransform: "uppercase", color: C.textSoft,
                            whiteSpace: "nowrap",
                          }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {momPersonnel.map((p, i) => (
                        <tr key={p.id} className="ap-table-row" style={{ borderBottom: `1px solid ${C.borderLight}` }}>
                          <td style={{ padding: "11px 14px", fontSize: 13, color: C.textMuted, fontWeight: 700 }}>{i + 1}</td>
                          <td style={{ padding: "11px 14px", fontSize: 14, fontWeight: 700, color: C.text }}>{p.name}</td>
                          <td style={{ padding: "11px 14px", fontSize: 13, fontFamily: "monospace", color: C.textMid, fontWeight: 600 }}>
                            {p.registration_number}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </SectionCard>

            {/* Testimonials */}
            <SectionCard>
              <SectionHeader icon={Star} title="Testimonials" count={testimonials.length} />
              {testimonials.length === 0 ? (
                <EmptyState icon={Star} message="No testimonials added yet" />
              ) : (
                <div style={{ maxHeight: 340, overflowY: "auto" }}>
                  {testimonials.map((t, i) => (
                    <div key={t.id} className="ap-testimonial-item"
                      style={{ padding: "14px 18px", borderBottom: `1px solid ${C.borderLight}` }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                        <div style={{ display: "flex", gap: 2 }}>
                          {[...Array(5)].map((_, j) => (
                            <Star key={j} size={12} fill={C.accent} color={C.accent} />
                          ))}
                        </div>
                        <span style={{ fontSize: 14, fontWeight: 800, color: C.text }}>{t.author}</span>
                      </div>
                      <p style={{ margin: 0, fontSize: 14, color: C.textMid, lineHeight: 1.75, fontWeight: 500 }}>
                        {t.message}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </SectionCard>
          </div>

          {/* Sidebar inline for tablet/mobile */}
          {(isMobile || isTablet) && <Sidebar company={company} />}
        </div>

        {/* ── Right Sidebar — desktop only ───────────────────────── */}
        {!isMobile && !isTablet && <Sidebar company={company} />}
      </div>
    </div>
  );
};

export default AgencyProfile;