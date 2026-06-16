import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getAgencyAdminAuthHeaders } from "@/lib/agencyAdminAuth";
import {
  Edit, MessageCircle, Building2, Phone, Globe, MapPin, Clock,
  Users, Star, Image as ImageIcon, Mail, Printer, Facebook, X,
  Shield, Camera, Eye, EyeOff, TrendingUp, ChevronRight, FileText,
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

/* ─── Global CSS ─────────────────────────────────────────────────────── */
const GLOBAL_CSS = `
  :root {
    --teal:        #0E4E5E;
    --teal-dark:   #093845;
    --teal-deeper: #061d26;
    --teal-mid:    #155f72;
    --teal-light:  #1a7a91;
    --teal-mist:   #dff0f4;
    --teal-pale:   #eef8fb;
    --gold:        #FCD34D;
    --gold-deep:   #e8b800;
    --gold-warm:   #fde68a;
    --gold-pale:   #fffbeb;
    --ink:         #0b1c22;
    --mid:         #3d5c66;
    --soft:        #7a9daa;
    --border:      #cbe6ed;
    --surface:     #ffffff;
    --bg:          #f4fafc;
    --font-serif:  Georgia, 'Times New Roman', serif;
    --font-mono:   'SF Mono', 'Fira Mono', 'Consolas', monospace;
    --font-sans:   system-ui, -apple-system, sans-serif;
    --radius:      12px;
    --radius-lg:   18px;
    --shadow-sm:   0 1px 4px rgba(14,78,94,.06);
    --shadow:      0 3px 14px rgba(14,78,94,.09);
    --shadow-lg:   0 10px 36px rgba(14,78,94,.14);
  }

  .ap2 * { box-sizing: border-box; }

  @keyframes ap2-fadeup {
    from { opacity: 0; transform: translateY(12px); }
    to   { opacity: 1; transform: none; }
  }
  @keyframes ap2-spin { to { transform: rotate(360deg); } }
  @keyframes ap2-pulse {
    0%,100% { opacity: 1; transform: scale(1); }
    50%      { opacity: .5; transform: scale(.65); }
  }

  .ap2-fadein { animation: ap2-fadeup .38s ease both; }

  /* ── Card ── */
  .ap2-card {
    background: var(--surface);
    border-radius: var(--radius-lg);
    border: 1.5px solid var(--border);
    box-shadow: var(--shadow-sm);
    overflow: hidden;
  }

  /* ── Section header ── */
  .ap2-section-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 13px 20px;
    border-bottom: 1.5px solid var(--border);
    background: linear-gradient(135deg, #fafeff 0%, #f0f8fb 100%);
  }
  .ap2-section-head-left {
    display: flex;
    align-items: center;
    gap: 10px;
  }
  .ap2-section-icon {
    width: 32px; height: 32px;
    border-radius: 9px;
    background: var(--teal-pale);
    border: 1.5px solid var(--border);
    display: flex; align-items: center; justify-content: center;
    flex-shrink: 0;
  }
  .ap2-section-title {
    font-family: var(--font-serif);
    font-size: 15px;
    font-weight: 700;
    color: var(--ink);
    letter-spacing: -.015em;
  }
  .ap2-count-badge {
    font-family: var(--font-mono);
    font-size: 11px;
    font-weight: 700;
    padding: 2px 9px;
    border-radius: 100px;
    background: var(--teal-mist);
    color: var(--teal);
    border: 1px solid var(--border);
  }

  /* ── Contact rows ── */
  .ap2-info-row {
    display: flex;
    align-items: flex-start;
    gap: 12px;
    padding: 10px 0;
    border-bottom: 1px solid var(--teal-pale);
  }
  .ap2-info-row:last-child { border-bottom: none; }
  .ap2-info-icon {
    width: 30px; height: 30px;
    border-radius: 8px;
    background: var(--teal-pale);
    border: 1px solid var(--border);
    display: flex; align-items: center; justify-content: center;
    flex-shrink: 0;
    margin-top: 1px;
  }
  .ap2-info-label {
    font-family: var(--font-mono);
    font-size: 9px;
    font-weight: 700;
    letter-spacing: .12em;
    text-transform: uppercase;
    color: var(--soft);
    margin: 0 0 2px;
    line-height: 1;
  }
  .ap2-info-value {
    font-family: var(--font-sans);
    font-size: 13px;
    color: var(--mid);
    font-weight: 600;
    margin: 0;
    line-height: 1.55;
    word-break: break-word;
  }
  .ap2-info-link {
    font-family: var(--font-sans);
    font-size: 13px;
    color: var(--teal);
    font-weight: 600;
    text-decoration: none;
    line-height: 1.55;
    word-break: break-word;
    transition: color .15s;
  }
  .ap2-info-link:hover { color: var(--teal-mid); text-decoration: underline; }

  /* ── Action buttons ── */
  .ap2-btn {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    font-family: var(--font-sans);
    font-size: 13px;
    font-weight: 700;
    padding: 9px 17px;
    border-radius: 10px;
    text-decoration: none;
    cursor: pointer;
    border: none;
    transition: transform .14s ease, box-shadow .14s ease, background .14s ease;
    line-height: 1;
    white-space: nowrap;
  }
  .ap2-btn:hover { transform: translateY(-1px); box-shadow: 0 4px 16px rgba(14,78,94,.18); }

  .ap2-btn--ghost {
    background: rgba(255,255,255,.12);
    color: #fff;
    border: 1.5px solid rgba(255,255,255,.25);
  }
  .ap2-btn--ghost:hover { background: rgba(255,255,255,.2); box-shadow: none; }

  .ap2-btn--gold {
    background: var(--gold);
    color: var(--teal-deeper);
  }
  .ap2-btn--gold:hover { background: var(--gold-warm); box-shadow: 0 6px 20px rgba(252,211,77,.3); }

  .ap2-btn--teal {
    background: var(--teal);
    color: #fff;
  }
  .ap2-btn--teal:hover { background: var(--teal-dark); }

  .ap2-btn--outline {
    background: var(--teal-pale);
    color: var(--teal);
    border: 1.5px solid var(--border);
  }
  .ap2-btn--outline:hover { background: var(--teal-mist); box-shadow: var(--shadow-sm); }

  /* ── Gallery ── */
  .ap2-gallery-thumb {
    aspect-ratio: 1;
    overflow: hidden;
    border-radius: 10px;
    border: 1.5px solid var(--border);
    background: var(--bg);
    cursor: pointer;
    padding: 0;
    transition: transform .18s ease, box-shadow .18s ease, border-color .18s ease;
  }
  .ap2-gallery-thumb:hover {
    transform: scale(1.05);
    box-shadow: 0 8px 28px rgba(14,78,94,.2);
    border-color: var(--teal-light);
  }

  /* ── Table ── */
  .ap2-table-row:hover { background: var(--teal-pale) !important; }

  /* ── Testimonials ── */
  .ap2-testimonial:nth-child(even) { background: var(--bg); }
  .ap2-testimonial:nth-child(odd)  { background: var(--surface); }

  /* ── Empty state ── */
  .ap2-empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 40px 20px;
    gap: 10px;
    text-align: center;
  }
  .ap2-empty-icon {
    width: 48px; height: 48px;
    border-radius: 13px;
    background: var(--teal-pale);
    border: 1.5px solid var(--border);
    display: flex; align-items: center; justify-content: center;
  }
  .ap2-empty-text {
    font-family: var(--font-sans);
    font-size: 13px;
    color: var(--soft);
    font-weight: 600;
    margin: 0;
  }

  /* ── Lightbox ── */
  .ap2-lightbox {
    position: fixed; inset: 0; z-index: 9999;
    display: flex; align-items: center; justify-content: center;
    background: rgba(6,29,38,.93);
    animation: ap2-fadeup .2s ease both;
  }

  /* ── Ledger stat strip ── */
  .ap2-ledger {
    display: flex;
    align-items: stretch;
    background: var(--surface);
    border: 1.5px solid var(--border);
    border-radius: var(--radius-lg);
    box-shadow: var(--shadow-sm);
    overflow: hidden;
  }
  .ap2-ledger-cell {
    flex: 1;
    padding: 18px 14px 16px;
    border-right: 1px solid var(--border);
    display: flex;
    flex-direction: column;
    gap: 6px;
    transition: background .15s;
    min-width: 0;
  }
  .ap2-ledger-cell:last-child { border-right: none; }
  .ap2-ledger-cell:hover { background: var(--teal-pale); }
  .ap2-ledger-label {
    font-family: var(--font-mono);
    font-size: 9px;
    font-weight: 700;
    letter-spacing: .12em;
    text-transform: uppercase;
    color: var(--soft);
    line-height: 1;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .ap2-ledger-value {
    font-family: var(--font-serif);
    font-size: 28px;
    font-weight: 800;
    line-height: 1;
    letter-spacing: -.03em;
    color: var(--teal);
  }
  .ap2-ledger-icon {
    width: 20px; height: 20px;
    color: var(--soft);
    flex-shrink: 0;
  }
  .ap2-ledger-icon-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  /* ── Gold dot indicator ── */
  .ap2-live-dot {
    width: 7px; height: 7px;
    border-radius: 50%;
    background: var(--gold);
    animation: ap2-pulse 2.2s ease-in-out infinite;
    flex-shrink: 0;
  }

  /* ── Star rating ── */
  .ap2-stars { display: flex; gap: 2px; }

  @media (prefers-reduced-motion: reduce) {
    .ap2-fadein { animation: none; }
    .ap2-live-dot { animation: none; }
  }
`;

/* ─── Sub-components ─────────────────────────────────────────────────── */

const SectionCard = ({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) => (
  <div className="ap2-card" style={style}>{children}</div>
);

const SectionHead = ({ icon: Icon, title, count }: { icon: React.ElementType; title: string; count?: number }) => (
  <div className="ap2-section-head">
    <div className="ap2-section-head-left">
      <div className="ap2-section-icon"><Icon size={15} color="var(--teal)" /></div>
      <span className="ap2-section-title">{title}</span>
    </div>
    {count !== undefined && <span className="ap2-count-badge">{count}</span>}
  </div>
);

const InfoRow = ({ icon: Icon, label, value, href }: { icon: React.ElementType; label: string; value?: string; href?: string }) => {
  if (!value) return null;
  return (
    <div className="ap2-info-row">
      <div className="ap2-info-icon"><Icon size={14} color="var(--teal)" /></div>
      <div style={{ minWidth: 0, flex: 1 }}>
        <p className="ap2-info-label">{label}</p>
        {href
          ? <a href={href} target="_blank" rel="noreferrer" className="ap2-info-link">{value}</a>
          : <p className="ap2-info-value">{value}</p>}
      </div>
    </div>
  );
};

const Empty = ({ icon: Icon, message }: { icon: React.ElementType; message: string }) => (
  <div className="ap2-empty">
    <div className="ap2-empty-icon"><Icon size={20} color="var(--teal)" /></div>
    <p className="ap2-empty-text">{message}</p>
  </div>
);

/* ─── Sidebar ────────────────────────────────────────────────────────── */
const Sidebar = ({ company }: { company: CompanyProfileApi }) => (
  <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
    <SectionCard>
      <SectionHead icon={Phone} title="Contact Details" />
      <div style={{ padding: "6px 18px 12px" }}>
        <InfoRow icon={Building2} label="Company"        value={company.company_name} />
        <InfoRow icon={Users}     label="Contact Person" value={company.contact_person} />
        <InfoRow icon={Phone}     label="Phone"          value={company.contact_phone} href={`tel:${company.contact_phone}`} />
        <InfoRow icon={Mail}      label="Email"          value={company.contact_email} href={`mailto:${company.contact_email}`} />
        <InfoRow icon={Printer}   label="Fax"            value={company.contact_fax} />
        <InfoRow icon={Globe}     label="Website"        value={company.contact_website} href={company.contact_website} />
        <InfoRow icon={Facebook}  label="Facebook"       value={company.social_facebook} href={company.social_facebook} />
        <InfoRow icon={MessageCircle} label="WhatsApp"   value={company.social_whatsapp_number}
          href={`https://wa.me/${company.social_whatsapp_number?.replace(/\D/g, "")}`} />
      </div>
    </SectionCard>

    <SectionCard>
      <SectionHead icon={MapPin} title="Location" />
      <div style={{ padding: "6px 18px 12px" }}>
        <InfoRow icon={MapPin} label="Address"
          value={[company.address_line1, company.address_line2, company.postal_code, company.country].filter(Boolean).join(", ") || undefined} />
        <InfoRow icon={Clock} label="Office Hours" value={company.office_hours_regular} />
        <InfoRow icon={Clock} label="Other Hours"  value={company.office_hours_other} />
      </div>
    </SectionCard>

    <SectionCard>
      <SectionHead icon={Shield} title="Registration" />
      <div style={{ padding: "6px 18px 12px" }}>
        <InfoRow icon={Shield}    label="License No." value={company.license_no} />
        <InfoRow icon={Building2} label="Short Name"  value={company.short_name} />
      </div>
    </SectionCard>
  </div>
);

/* ─── Ledger stats ───────────────────────────────────────────────────── */
const statDef = [
  { key: "totalMaids",     label: "Total Maids",  icon: Users },
  { key: "publicMaids",    label: "Public",        icon: Eye },
  { key: "hiddenMaids",    label: "Hidden",        icon: EyeOff },
  { key: "maidsWithPhotos",label: "With Photos",  icon: Camera },
  { key: "enquiries",      label: "Enquiries",    icon: MessageCircle },
  { key: "momPersonnel",   label: "MOM Staff",    icon: Shield },
  { key: "testimonials",   label: "Reviews",      icon: Star },
  { key: "galleryImages",  label: "Gallery",      icon: ImageIcon },
] as const;

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

  const load = async () => {
    try {
      setIsLoading(true); setLoadError(null);
      const [r, rs] = await Promise.all([
        fetch("/api/company",         { headers: getAgencyAdminAuthHeaders() }),
        fetch("/api/company/summary", { headers: getAgencyAdminAuthHeaders() }),
      ]);
      const data = (await r.json().catch(() => ({}))) as Partial<CompanyResponse> & { error?: string };
      if (!r.ok || !data.companyProfile) throw new Error(data.error || "Failed to load profile");
      setCompany(data.companyProfile);
      setMomPersonnel(data.momPersonnel ?? []);
      setTestimonials(data.testimonials ?? []);
      if (rs.ok) {
        const s = (await rs.json().catch(() => ({}))) as Partial<AgencySummary>;
        setSummary({
          publicMaids: s.publicMaids ?? 0, hiddenMaids: s.hiddenMaids ?? 0,
          totalMaids: s.totalMaids ?? 0, maidsWithPhotos: s.maidsWithPhotos ?? 0,
          enquiries: s.enquiries ?? 0, momPersonnel: s.momPersonnel ?? 0,
          testimonials: s.testimonials ?? 0, galleryImages: s.galleryImages ?? 0,
        });
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to load";
      setLoadError(msg); toast.error(msg);
    } finally { setIsLoading(false); }
  };

  useEffect(() => { void load(); }, []);

  /* ── Loading ── */
  if (isLoading) return (
    <div style={{ display: "flex", height: "20rem", alignItems: "center", justifyContent: "center" }}>
      <style>{GLOBAL_CSS}</style>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14 }}>
        <div style={{
          width: 40, height: 40, borderRadius: "50%",
          border: "3.5px solid var(--teal-mist)", borderTopColor: "var(--teal)",
          animation: "ap2-spin .75s linear infinite",
        }} />
        <span style={{ fontFamily: "var(--font-sans)", fontSize: 14, color: "var(--mid)", fontWeight: 600 }}>
          Loading profile…
        </span>
      </div>
    </div>
  );

  /* ── Error ── */
  if (loadError || !company) return (
    <div style={{ display: "flex", height: "20rem", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 14 }}>
      <style>{GLOBAL_CSS}</style>
      <p style={{ fontFamily: "var(--font-sans)", fontSize: 14, color: "#dc2626", fontWeight: 700, margin: 0 }}>
        {loadError || "Failed to load profile"}
      </p>
      <button onClick={() => void load()} className="ap2-btn ap2-btn--outline" style={{ fontSize: 13 }}>
        Retry
      </button>
    </div>
  );

  const gallery = company.gallery_image_data_urls ?? [];

  return (
    <div className="ap2 ap2-fadein" style={{
      display: "flex", flexDirection: "column", gap: 14,
      color: "var(--ink)", lineHeight: 1.7,
      fontFamily: "var(--font-sans)",
      background: "var(--bg)",
    }}>
      <style>{GLOBAL_CSS}</style>

      {/* ── Lightbox ── */}
      {lightboxImage && (
        <div className="ap2-lightbox" onClick={() => setLightboxImage(null)}>
          <div style={{ position: "relative" }} onClick={e => e.stopPropagation()}>
            <img
              src={lightboxImage}
              alt="Gallery preview"
              style={{ maxHeight: "90vh", maxWidth: "92vw", borderRadius: 14, objectFit: "contain", display: "block" }}
            />
            <button
              onClick={() => setLightboxImage(null)}
              style={{
                position: "absolute", top: -14, right: -14,
                width: 34, height: 34, borderRadius: "50%",
                background: "#fff", border: "none", cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center",
                boxShadow: "0 2px 10px rgba(0,0,0,.3)",
              }}>
              <X size={15} color="#111" />
            </button>
          </div>
        </div>
      )}

      {/* ── Hero Identity Card ── */}
      <div style={{
        background: "var(--teal-deeper)",
        borderRadius: "var(--radius-lg)",
        overflow: "hidden",
        position: "relative",
        boxShadow: "var(--shadow-lg)",
      }}>
        {/* Background texture: dot grid */}
        <div style={{
          position: "absolute", inset: 0,
          backgroundImage: "radial-gradient(circle, rgba(255,255,255,.055) 1px, transparent 1px)",
          backgroundSize: "28px 28px",
          pointerEvents: "none",
          zIndex: 0,
        }} />

        {/* Top gold streak */}
        <div style={{
          position: "absolute", top: 0, left: 0, right: 0, height: "3px",
          background: "linear-gradient(90deg, transparent 0%, var(--gold) 30%, #fde68a 60%, transparent 100%)",
          zIndex: 2,
        }} />

        {/* Right diagonal panel */}
        <div style={{
          position: "absolute", inset: 0,
          background: "linear-gradient(155deg, transparent 50%, rgba(14,78,94,.35) 100%)",
          zIndex: 0, pointerEvents: "none",
        }} />

        {/* Large watermark */}
        <div style={{
          position: "absolute", right: "-1%", bottom: "-18%",
          fontSize: "clamp(120px, 14vw, 200px)",
          fontFamily: "var(--font-serif)",
          fontWeight: 900,
          color: "transparent",
          WebkitTextStroke: "1.5px rgba(255,255,255,.05)",
          lineHeight: 1,
          userSelect: "none",
          pointerEvents: "none",
          zIndex: 0,
          letterSpacing: "-.04em",
        }} aria-hidden="true">
          {company.short_name || "AG"}
        </div>

        {/* Content */}
        <div style={{
          position: "relative", zIndex: 1,
          padding: isMobile ? "22px 18px 24px" : "28px 32px 30px",
          display: "flex",
          flexDirection: isMobile ? "column" : "row",
          alignItems: isMobile ? "flex-start" : "center",
          justifyContent: "space-between",
          gap: 20,
        }}>
          {/* Left: logo + identity */}
          <div style={{ display: "flex", alignItems: "center", gap: isMobile ? 14 : 20 }}>
            {/* Logo container */}
            <div style={{
              width: isMobile ? 64 : 80, height: isMobile ? 64 : 80,
              borderRadius: 16,
              border: "2px solid rgba(252,211,77,.35)",
              background: "rgba(255,255,255,.1)",
              display: "flex", alignItems: "center", justifyContent: "center",
              overflow: "hidden", flexShrink: 0,
              boxShadow: "0 4px 20px rgba(0,0,0,.25)",
            }}>
              {company.logo_data_url
                ? <img src={company.logo_data_url} alt="Agency logo" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
                : <Building2 size={isMobile ? 26 : 34} color="rgba(255,255,255,.4)" />}
            </div>

            {/* Name block */}
            <div>
              {/* Eyebrow */}
              <div style={{
                fontFamily: "var(--font-mono)",
                fontSize: 9,
                fontWeight: 700,
                letterSpacing: ".14em",
                textTransform: "uppercase",
                color: "var(--gold)",
                marginBottom: 6,
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}>
                <span className="ap2-live-dot" />
                MOM Licensed Agency
              </div>

              <h1 style={{
                fontFamily: "var(--font-serif)",
                fontSize: isMobile ? 20 : 26,
                fontWeight: 800,
                color: "#fff",
                margin: "0 0 10px",
                lineHeight: 1.12,
                letterSpacing: "-.025em",
              }}>
                {company.company_name || "Agency Profile"}
              </h1>

              {/* License + shortname chips */}
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
                <span style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 11,
                  fontWeight: 700,
                  padding: "4px 12px",
                  borderRadius: 6,
                  background: "rgba(252,211,77,.15)",
                  color: "var(--gold-warm)",
                  border: "1px solid rgba(252,211,77,.3)",
                  letterSpacing: ".06em",
                  textTransform: "uppercase",
                }}>
                  Lic. {company.license_no || "N/A"}
                </span>
                {company.short_name && (
                  <span style={{
                    fontFamily: "var(--font-sans)",
                    fontSize: 13,
                    color: "rgba(255,255,255,.55)",
                    fontWeight: 600,
                  }}>
                    {company.short_name}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Right: action buttons */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            <Link to={adminPath("/agency-profile/edit")} className="ap2-btn ap2-btn--ghost">
              <Edit size={13} /> Edit Profile
            </Link>
            <Link to={adminPath("/employment-contracts")} className="ap2-btn ap2-btn--ghost">
              <FileText size={13} /> Contracts
            </Link>
            <Link to={adminPath("/chat-support")} className="ap2-btn ap2-btn--gold">
              <MessageCircle size={13} /> Chat
            </Link>
          </div>
        </div>
      </div>

      {/* ── Ledger stats strip ── */}
      {summary && (
        <div className="ap2-ledger" style={{
          display: "grid",
          gridTemplateColumns: isMobile
            ? "repeat(4, 1fr)"
            : "repeat(8, 1fr)",
          gap: 0,
        }}>
          {statDef.map(({ key, label, icon: Icon }) => (
            <div key={key} className="ap2-ledger-cell">
              <div className="ap2-ledger-icon-row">
                <span className="ap2-ledger-label">{label}</span>
                <Icon className="ap2-ledger-icon" size={14} />
              </div>
              <span className="ap2-ledger-value">{summary[key as keyof AgencySummary]}</span>
            </div>
          ))}
        </div>
      )}

      {/* ── Body ── */}
      <div style={{
        display: "grid",
        gridTemplateColumns: isMobile || isTablet ? "1fr" : "1fr 290px",
        gap: 14,
        alignItems: "start",
      }}>
        {/* Left column */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

          {/* Intro Video */}
          <SectionCard>
            <SectionHead icon={Camera} title="Introduction Video" />
            <div style={{ padding: 16 }}>
              {company.intro_video_data_url ? (
                <div style={{ borderRadius: 12, overflow: "hidden", border: "1.5px solid var(--border)" }}>
                  {/* Video header */}
                  <div style={{
                    padding: "10px 16px",
                    background: "var(--teal-deeper)",
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <Camera size={14} color="var(--gold)" />
                      <span style={{
                        fontFamily: "var(--font-sans)", fontSize: 13,
                        fontWeight: 700, color: "#fff",
                      }}>Agency Introduction</span>
                    </div>
                    <span style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: 9, fontWeight: 700, letterSpacing: ".1em",
                      textTransform: "uppercase",
                      background: "rgba(252,211,77,.15)",
                      color: "var(--gold)",
                      border: "1px solid rgba(252,211,77,.28)",
                      padding: "3px 9px", borderRadius: 4,
                    }}>PREVIEW</span>
                  </div>
                  <video controls style={{ display: "block", width: "100%", maxHeight: 300, background: "#000" }}
                    src={company.intro_video_data_url} />
                </div>
              ) : (
                <Empty icon={Camera} message="No introduction video uploaded yet" />
              )}
            </div>
          </SectionCard>

          {/* About Us */}
          <SectionCard>
            <SectionHead icon={Building2} title="About Us" />
            <div style={{ padding: "18px 22px" }}>
              {company.about_us ? (
                <p style={{
                  margin: 0,
                  fontFamily: "var(--font-sans)",
                  fontSize: 14,
                  lineHeight: 1.85,
                  color: "var(--mid)",
                  whiteSpace: "pre-wrap",
                  fontWeight: 500,
                }}>
                  {company.about_us}
                </p>
              ) : (
                <p style={{
                  margin: 0, fontSize: 14,
                  color: "var(--soft)", fontStyle: "italic",
                  fontFamily: "var(--font-sans)",
                }}>
                  No about us content has been added yet.
                </p>
              )}
            </div>
          </SectionCard>

          {/* Gallery */}
          <SectionCard>
            <SectionHead icon={ImageIcon} title="Gallery" count={gallery.length} />
            {gallery.length === 0 ? (
              <Empty icon={ImageIcon} message="No gallery images uploaded yet" />
            ) : (
              <div style={{
                display: "grid",
                gridTemplateColumns: `repeat(auto-fill, minmax(${isMobile ? 80 : 100}px, 1fr))`,
                gap: 8,
                padding: 14,
              }}>
                {gallery.map((img, idx) => (
                  <button
                    key={`${img.slice(-10)}-${idx}`}
                    type="button"
                    className="ap2-gallery-thumb"
                    onClick={() => setLightboxImage(img)}
                  >
                    <img src={img} alt={`Gallery ${idx + 1}`} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                  </button>
                ))}
              </div>
            )}
          </SectionCard>

          {/* MOM Personnel + Testimonials */}
          <div style={{
            display: "grid",
            gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr",
            gap: 14,
            alignItems: "start",
          }}>
            {/* MOM Personnel */}
            <SectionCard>
              <SectionHead icon={Shield} title="MOM Personnel" count={momPersonnel.length} />
              {momPersonnel.length === 0 ? (
                <Empty icon={Users} message="No MOM personnel added yet" />
              ) : (
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                      <tr style={{ background: "var(--teal-pale)", borderBottom: "1.5px solid var(--border)" }}>
                        {["#", "Name", "Reg. No."].map(h => (
                          <th key={h} style={{
                            padding: "9px 14px", textAlign: "left",
                            fontFamily: "var(--font-mono)",
                            fontSize: 9, fontWeight: 700,
                            letterSpacing: ".1em", textTransform: "uppercase",
                            color: "var(--soft)", whiteSpace: "nowrap",
                          }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {momPersonnel.map((p, i) => (
                        <tr key={p.id} className="ap2-table-row"
                          style={{ borderBottom: "1px solid var(--teal-pale)" }}>
                          <td style={{ padding: "11px 14px", fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--soft)", fontWeight: 700 }}>
                            {String(i + 1).padStart(2, "0")}
                          </td>
                          <td style={{ padding: "11px 14px", fontSize: 13, fontWeight: 700, color: "var(--ink)", fontFamily: "var(--font-sans)" }}>
                            {p.name}
                          </td>
                          <td style={{ padding: "11px 14px", fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--mid)", fontWeight: 600 }}>
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
              <SectionHead icon={Star} title="Testimonials" count={testimonials.length} />
              {testimonials.length === 0 ? (
                <Empty icon={Star} message="No testimonials added yet" />
              ) : (
                <div style={{ maxHeight: 340, overflowY: "auto" }}>
                  {testimonials.map((t) => (
                    <div key={t.id} className="ap2-testimonial"
                      style={{ padding: "14px 18px", borderBottom: "1px solid var(--teal-pale)" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                        <div className="ap2-stars">
                          {[...Array(5)].map((_, j) => (
                            <Star key={j} size={11} fill="var(--gold-deep)" color="var(--gold-deep)" />
                          ))}
                        </div>
                        <span style={{
                          fontFamily: "var(--font-sans)",
                          fontSize: 13, fontWeight: 800, color: "var(--ink)",
                        }}>{t.author}</span>
                      </div>
                      <p style={{
                        margin: 0,
                        fontFamily: "var(--font-sans)",
                        fontSize: 13, color: "var(--mid)", lineHeight: 1.75, fontWeight: 500,
                      }}>
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

        {/* Right sidebar — desktop only */}
        {!isMobile && !isTablet && <Sidebar company={company} />}
      </div>
    </div>
  );
};

export default AgencyProfile;