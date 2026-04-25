import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Edit,
  MessageCircle,
  Building2,
  Phone,
  Globe,
  MapPin,
  Clock,
  Users,
  Star,
  Image as ImageIcon,
  Mail,
  Printer,
  Facebook,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { toast } from "@/components/ui/sonner";
import { adminPath } from "@/lib/routes";

interface CompanyProfileApi {
  company_name: string;
  short_name: string;
  license_no: string;
  address_line1: string;
  address_line2?: string;
  postal_code: string;
  country: string;
  contact_person?: string;
  contact_phone?: string;
  contact_email?: string;
  contact_fax?: string;
  contact_website?: string;
  office_hours_regular?: string;
  office_hours_other?: string;
  social_facebook?: string;
  social_whatsapp_number?: string;
  social_whatsapp_message?: string;
  about_us?: string;
  logo_data_url?: string;
  gallery_image_data_urls?: string[];
  intro_video_data_url?: string;
}

interface MomPersonnelApi {
  id: number;
  name: string;
  registration_number: string;
}

interface TestimonialApi {
  id: number;
  message: string;
  author: string;
}

interface CompanyResponse {
  companyProfile: CompanyProfileApi;
  momPersonnel: MomPersonnelApi[];
  testimonials: TestimonialApi[];
}

interface AgencySummary {
  publicMaids: number;
  hiddenMaids: number;
  totalMaids: number;
  maidsWithPhotos: number;
  enquiries: number;
  momPersonnel: number;
  testimonials: number;
  galleryImages: number;
}

/* ─── Sub-components ─────────────────────────────────────────────────── */

const SectionTitle = ({ children }: { children: React.ReactNode }) => (
  <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "0.75rem" }}>
    <h2
      style={{
        fontSize: "0.8rem",
        fontWeight: 800,
        letterSpacing: "0.12em",
        textTransform: "uppercase",
        color: "#64748b",
        margin: 0,
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </h2>
    <div style={{ flex: 1, height: "2px", background: "linear-gradient(90deg, #e2e8f0 0%, transparent 100%)" }} />
  </div>
);

const ContactRow = ({
  icon: Icon,
  label,
  value,
  href,
}: {
  icon: React.ElementType;
  label: string;
  value?: string;
  href?: string;
}) => {
  if (!value) return null;
  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: "0.85rem",
        padding: "0.75rem 0",
        borderBottom: "1px solid #f1f5f9",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: "36px",
          width: "36px",
          flexShrink: 0,
          borderRadius: "0.5rem",
          background: "#f0fdf4",
          border: "1.5px solid #bbf7d0",
        }}
      >
        <Icon size={16} color="#16a34a" />
      </div>
      <div style={{ minWidth: 0, flex: 1 }}>
        <p style={{ fontSize: "0.75rem", fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: "#94a3b8", margin: "0 0 2px" }}>
          {label}
        </p>
        {href ? (
          <a
            href={href}
            target="_blank"
            rel="noreferrer"
            style={{ fontSize: "1rem", color: "#0D6E56", textDecoration: "none", wordBreak: "break-all", lineHeight: 1.5, fontWeight: 600 }}
          >
            {value}
          </a>
        ) : (
          <p style={{ fontSize: "1rem", color: "#1e293b", wordBreak: "break-all", lineHeight: 1.5, margin: 0, fontWeight: 500 }}>
            {value}
          </p>
        )}
      </div>
    </div>
  );
};

/* ─── Stat Chip ─────────────────────────────────────────────────────── */
const statColors: { bg: string; text: string; border: string }[] = [
  { bg: "#eff6ff", text: "#1d4ed8", border: "#bfdbfe" },
  { bg: "#f0fdf4", text: "#16a34a", border: "#bbf7d0" },
  { bg: "#fef3c7", text: "#d97706", border: "#fde68a" },
  { bg: "#fdf4ff", text: "#9333ea", border: "#e9d5ff" },
  { bg: "#fff1f2", text: "#e11d48", border: "#fecdd3" },
  { bg: "#f0fdfa", text: "#0d9488", border: "#99f6e4" },
  { bg: "#fff7ed", text: "#ea580c", border: "#fed7aa" },
  { bg: "#f8fafc", text: "#475569", border: "#e2e8f0" },
];

/* ─── Main Component ─────────────────────────────────────────────────── */

const AgencyProfile = () => {
  const navigate = useNavigate();
  const [company, setCompany] = useState<CompanyProfileApi | null>(null);
  const [momPersonnel, setMomPersonnel] = useState<MomPersonnelApi[]>([]);
  const [testimonials, setTestimonials] = useState<TestimonialApi[]>([]);
  const [summary, setSummary] = useState<AgencySummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  const loadCompanyProfile = async () => {
    try {
      setIsLoading(true);
      setLoadError(null);
      const [response, summaryResponse] = await Promise.all([
        fetch("/api/company"),
        fetch("/api/company/summary"),
      ]);
      const data = (await response.json().catch(() => ({}))) as Partial<CompanyResponse> & { error?: string };
      if (!response.ok || !data.companyProfile)
        throw new Error(data.error || "Failed to load company profile");
      setCompany(data.companyProfile);
      setMomPersonnel(data.momPersonnel ?? []);
      setTestimonials(data.testimonials ?? []);
      if (summaryResponse.ok) {
        const s = (await summaryResponse.json().catch(() => ({}))) as Partial<AgencySummary>;
        setSummary({
          publicMaids: s.publicMaids ?? 0,
          hiddenMaids: s.hiddenMaids ?? 0,
          totalMaids: s.totalMaids ?? 0,
          maidsWithPhotos: s.maidsWithPhotos ?? 0,
          enquiries: s.enquiries ?? 0,
          momPersonnel: s.momPersonnel ?? 0,
          testimonials: s.testimonials ?? 0,
          galleryImages: s.galleryImages ?? 0,
        });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to load company profile";
      setLoadError(message);
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadCompanyProfile();
  }, []);

  if (isLoading) {
    return (
      <div style={{ display: "flex", height: "16rem", alignItems: "center", justifyContent: "center", fontSize: "1.05rem", color: "#94a3b8" }}>
        ⏳ Loading agency profile…
      </div>
    );
  }

  if (loadError || !company) {
    return (
      <div style={{ display: "flex", height: "16rem", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "1rem" }}>
        <p style={{ fontSize: "1rem", color: "#ef4444", fontWeight: 600 }}>{loadError || "Failed to load company profile"}</p>
        <button
          onClick={() => void loadCompanyProfile()}
          style={{
            fontSize: "1rem",
            padding: "0.55rem 1.3rem",
            borderRadius: "0.5rem",
            border: "2px solid #cbd5e1",
            background: "#fff",
            color: "#475569",
            cursor: "pointer",
            fontWeight: 600,
          }}
        >
          🔄 Retry
        </button>
      </div>
    );
  }

  const gallery = company.gallery_image_data_urls ?? [];
  const statItems = summary
    ? [
        { label: "Total Maids", value: summary.totalMaids },
        { label: "Public", value: summary.publicMaids },
        { label: "Hidden", value: summary.hiddenMaids },
        { label: "With Photos", value: summary.maidsWithPhotos },
        { label: "Enquiries", value: summary.enquiries },
        { label: "MOM Staff", value: summary.momPersonnel },
        { label: "Testimonials", value: summary.testimonials },
        { label: "Gallery", value: summary.galleryImages },
      ]
    : [];

  return (
    <>
      {/* ── Lightbox ── */}
      {lightboxImage && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 50,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "rgba(0,0,0,0.82)",
          }}
          onClick={() => setLightboxImage(null)}
        >
          <div style={{ position: "relative" }} onClick={(e) => e.stopPropagation()}>
            <img
              src={lightboxImage}
              alt="Gallery preview"
              style={{ maxHeight: "90vh", maxWidth: "90vw", borderRadius: "1rem", objectFit: "contain", boxShadow: "0 25px 60px rgba(0,0,0,0.5)" }}
            />
            <button
              style={{
                position: "absolute",
                top: "-14px",
                right: "-14px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                height: "34px",
                width: "34px",
                borderRadius: "50%",
                background: "#fff",
                border: "none",
                cursor: "pointer",
                boxShadow: "0 2px 10px rgba(0,0,0,0.2)",
              }}
              onClick={() => setLightboxImage(null)}
            >
              <X size={16} color="#374151" />
            </button>
          </div>
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem", fontSize: "1rem", color: "#1e293b", lineHeight: 1.65 }}>

        {/* ── Header strip ── */}
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "1rem",
            background: "linear-gradient(135deg, #0f2942 0%, #0D6E56 100%)",
            borderRadius: "1rem",
            padding: "1.25rem 1.5rem",
            boxShadow: "0 4px 20px rgba(13,110,86,0.2)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "1.1rem" }}>
            {/* Logo */}
            <div
              style={{
                height: "68px",
                width: "68px",
                flexShrink: 0,
                overflow: "hidden",
                borderRadius: "0.75rem",
                border: "3px solid rgba(255,255,255,0.25)",
                background: "rgba(255,255,255,0.12)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {company.logo_data_url ? (
                <img src={company.logo_data_url} alt={`${company.company_name} logo`} style={{ height: "100%", width: "100%", objectFit: "contain" }} />
              ) : (
                <Building2 size={28} color="rgba(255,255,255,0.5)" />
              )}
            </div>
            <div>
              <h1 style={{ fontSize: "1.4rem", fontWeight: 800, color: "#fff", margin: 0, letterSpacing: "-0.01em" }}>
                {company.company_name || "Agency Profile"}
              </h1>
              <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "0.5rem", marginTop: "0.3rem" }}>
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    borderRadius: "0.4rem",
                    background: "rgba(255,255,255,0.18)",
                    padding: "2px 10px",
                    fontSize: "0.82rem",
                    fontWeight: 700,
                    color: "#a7f3d0",
                    letterSpacing: "0.04em",
                  }}
                >
                  Lic. {company.license_no || "N/A"}
                </span>
                {company.short_name && (
                  <span style={{ fontSize: "1rem", color: "rgba(255,255,255,0.75)", fontWeight: 500 }}>
                    {company.short_name}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.6rem" }}>
            <Link
              to={adminPath("/agency-profile/edit")}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.4rem",
                fontSize: "0.95rem",
                fontWeight: 700,
                padding: "0.55rem 1.1rem",
                borderRadius: "0.5rem",
                border: "2px solid rgba(255,255,255,0.4)",
                background: "rgba(255,255,255,0.12)",
                color: "#fff",
                textDecoration: "none",
              }}
            >
              <Edit size={15} /> Edit Profile
            </Link>
            <Link
              to={adminPath("/employment-contracts")}
              style={{
                display: "inline-flex",
                alignItems: "center",
                fontSize: "0.95rem",
                fontWeight: 700,
                padding: "0.55rem 1.1rem",
                borderRadius: "0.5rem",
                border: "2px solid rgba(255,255,255,0.4)",
                background: "rgba(255,255,255,0.12)",
                color: "#fff",
                textDecoration: "none",
              }}
            >
              Contracts
            </Link>
            <Link
              to={adminPath("/chat-support")}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.4rem",
                fontSize: "0.95rem",
                fontWeight: 700,
                padding: "0.55rem 1.1rem",
                borderRadius: "0.5rem",
                border: "none",
                background: "#fff",
                color: "#0D6E56",
                textDecoration: "none",
              }}
            >
              <MessageCircle size={15} /> Chat
            </Link>
          </div>
        </div>

        {/* ── Stat chips ── */}
        {summary && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))",
              gap: "0.75rem",
            }}
          >
            {statItems.map(({ label, value }, i) => {
              const c = statColors[i % statColors.length];
              return (
                <div
                  key={label}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    borderRadius: "0.75rem",
                    border: `1.5px solid ${c.border}`,
                    background: c.bg,
                    padding: "0.85rem 1rem",
                    boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
                  }}
                >
                  <span style={{ fontSize: "0.78rem", fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: c.text, opacity: 0.75 }}>
                    {label}
                  </span>
                  <span style={{ marginTop: "0.25rem", fontSize: "1.65rem", fontWeight: 800, color: c.text, lineHeight: 1 }}>
                    {value}
                  </span>
                </div>
              );
            })}
          </div>
        )}

        {/* ── Main two-column layout ── */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 300px", gap: "1.5rem", alignItems: "start" }}>

          {/* LEFT column */}
          <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>

            {/* ── Intro Video ── */}
            <div
              style={{
                borderRadius: "1rem",
                overflow: "hidden",
                border: "1.5px solid #e2e8f0",
                background: "#fff",
                boxShadow: "0 2px 10px rgba(0,0,0,0.05)",
              }}
            >
              <div style={{ borderBottom: "1.5px solid #f1f5f9", padding: "0.85rem 1.1rem" }}>
                <SectionTitle>🎬 Introduction Video</SectionTitle>
              </div>
              <div style={{ padding: "1rem" }}>
                {company.intro_video_data_url ? (
                  /* Colorful gradient-border video player */
                  <div
                    style={{
                      borderRadius: "0.85rem",
                      padding: "4px",
                      background: "linear-gradient(135deg, #6366f1 0%, #06b6d4 50%, #10b981 100%)",
                      boxShadow: "0 4px 20px rgba(99,102,241,0.2)",
                      width: "100%",
                      boxSizing: "border-box",
                    }}
                  >
                    <div style={{ background: "#0f172a", borderRadius: "0.6rem", overflow: "hidden" }}>
                      <div
                        style={{
                          background: "linear-gradient(90deg, #4f46e5 0%, #0891b2 55%, #059669 100%)",
                          padding: "0.4rem 1rem",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                        }}
                      >
                        <span style={{ fontSize: "0.9rem", color: "#fff", fontWeight: 700, letterSpacing: "0.04em" }}>
                          🎬 Introduction Video
                        </span>
                        <span
                          style={{
                            fontSize: "0.7rem",
                            background: "rgba(255,255,255,0.18)",
                            color: "#e0f2fe",
                            padding: "2px 10px",
                            borderRadius: "999px",
                            fontWeight: 700,
                            letterSpacing: "0.06em",
                          }}
                        >
                          PREVIEW
                        </span>
                      </div>
                      <video
                        controls
                        style={{ display: "block", width: "100%", maxHeight: "320px", background: "#000" }}
                        src={company.intro_video_data_url}
                      />
                    </div>
                  </div>
                ) : (
                  <div
                    style={{
                      borderRadius: "0.85rem",
                      padding: "4px",
                      background: "linear-gradient(135deg, #6366f1 0%, #06b6d4 50%, #10b981 100%)",
                      boxSizing: "border-box",
                      width: "100%",
                    }}
                  >
                    <div style={{ background: "#0f172a", borderRadius: "0.6rem", overflow: "hidden" }}>
                      <div style={{ background: "linear-gradient(90deg, #4f46e5 0%, #0891b2 55%, #059669 100%)", padding: "0.4rem 1rem" }}>
                        <span style={{ fontSize: "0.9rem", color: "#fff", fontWeight: 700 }}>🎬 Introduction Video</span>
                      </div>
                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          justifyContent: "center",
                          height: "120px",
                          gap: "0.4rem",
                          color: "#64748b",
                        }}
                      >
                        <span style={{ fontSize: "2rem" }}>🎥</span>
                        <span style={{ fontSize: "0.95rem", color: "#94a3b8" }}>No introduction video uploaded yet</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* ── About Us ── */}
            <div
              style={{
                borderRadius: "1rem",
                overflow: "hidden",
                border: "1.5px solid #e2e8f0",
                background: "#fff",
                boxShadow: "0 2px 10px rgba(0,0,0,0.05)",
              }}
            >
              <div style={{ borderBottom: "1.5px solid #f1f5f9", padding: "0.85rem 1.1rem" }}>
                <SectionTitle>📋 About Us</SectionTitle>
              </div>
              <p
                style={{
                  padding: "1.1rem",
                  fontSize: "1rem",
                  lineHeight: 1.75,
                  color: "#374151",
                  whiteSpace: "pre-wrap",
                  margin: 0,
                }}
              >
                {company.about_us || <span style={{ color: "#94a3b8" }}>No about us content yet.</span>}
              </p>
            </div>

            {/* ── Gallery ── */}
            <div
              style={{
                borderRadius: "1rem",
                overflow: "hidden",
                border: "1.5px solid #e2e8f0",
                background: "#fff",
                boxShadow: "0 2px 10px rgba(0,0,0,0.05)",
              }}
            >
              <div style={{ borderBottom: "1.5px solid #f1f5f9", padding: "0.85rem 1.1rem" }}>
                <SectionTitle>🖼 Gallery ({gallery.length})</SectionTitle>
              </div>
              {gallery.length === 0 ? (
                <div style={{ display: "flex", height: "6rem", alignItems: "center", justifyContent: "center", gap: "0.5rem", fontSize: "1rem", color: "#94a3b8" }}>
                  <ImageIcon size={18} /> No gallery images uploaded yet
                </div>
              ) : (
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fill, minmax(90px, 1fr))",
                    gap: "0.6rem",
                    padding: "1rem",
                  }}
                >
                  {gallery.map((image, index) => (
                    <button
                      key={`${image.slice(-12)}-${index}`}
                      type="button"
                      onClick={() => setLightboxImage(image)}
                      style={{
                        position: "relative",
                        aspectRatio: "1 / 1",
                        overflow: "hidden",
                        borderRadius: "0.6rem",
                        border: "2px solid #e2e8f0",
                        background: "#f8fafc",
                        cursor: "pointer",
                        padding: 0,
                        transition: "border-color 0.15s, box-shadow 0.15s",
                      }}
                      onMouseOver={(e) => {
                        (e.currentTarget as HTMLButtonElement).style.borderColor = "#0D6E56";
                        (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 2px 10px rgba(13,110,86,0.18)";
                      }}
                      onMouseOut={(e) => {
                        (e.currentTarget as HTMLButtonElement).style.borderColor = "#e2e8f0";
                        (e.currentTarget as HTMLButtonElement).style.boxShadow = "none";
                      }}
                    >
                      <img
                        src={image}
                        alt={`Gallery ${index + 1}`}
                        style={{ height: "100%", width: "100%", objectFit: "cover", display: "block" }}
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* ── MOM Personnel + Testimonials ── */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem", alignItems: "start" }}>

              {/* MOM Personnel */}
              <div
                style={{
                  borderRadius: "1rem",
                  overflow: "hidden",
                  border: "1.5px solid #e2e8f0",
                  background: "#fff",
                  boxShadow: "0 2px 10px rgba(0,0,0,0.05)",
                }}
              >
                <div style={{ borderBottom: "1.5px solid #f1f5f9", padding: "0.85rem 1.1rem" }}>
                  <SectionTitle>👤 MOM Personnel ({momPersonnel.length})</SectionTitle>
                </div>
                {momPersonnel.length === 0 ? (
                  <div style={{ display: "flex", height: "5rem", alignItems: "center", justifyContent: "center", gap: "0.5rem", fontSize: "1rem", color: "#94a3b8" }}>
                    <Users size={18} /> No MOM personnel added yet
                  </div>
                ) : (
                  <div style={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse" }}>
                      <thead>
                        <tr style={{ borderBottom: "1.5px solid #f1f5f9", background: "#f8fafc" }}>
                          <th style={{ padding: "0.65rem 1rem", textAlign: "left", fontSize: "0.75rem", fontWeight: 700, letterSpacing: "0.07em", textTransform: "uppercase", color: "#94a3b8", width: "2rem" }}>#</th>
                          <th style={{ padding: "0.65rem 1rem", textAlign: "left", fontSize: "0.75rem", fontWeight: 700, letterSpacing: "0.07em", textTransform: "uppercase", color: "#94a3b8" }}>Name</th>
                          <th style={{ padding: "0.65rem 1rem", textAlign: "left", fontSize: "0.75rem", fontWeight: 700, letterSpacing: "0.07em", textTransform: "uppercase", color: "#94a3b8" }}>Reg. No.</th>
                        </tr>
                      </thead>
                      <tbody>
                        {momPersonnel.map((person, i) => (
                          <tr
                            key={person.id}
                            style={{ borderBottom: "1px solid #f1f5f9" }}
                          >
                            <td style={{ padding: "0.7rem 1rem", fontSize: "0.9rem", color: "#94a3b8" }}>{i + 1}</td>
                            <td style={{ padding: "0.7rem 1rem", fontSize: "1rem", fontWeight: 600, color: "#1e293b" }}>{person.name}</td>
                            <td style={{ padding: "0.7rem 1rem", fontSize: "0.9rem", fontFamily: "monospace", color: "#64748b" }}>{person.registration_number}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Testimonials */}
              <div
                style={{
                  borderRadius: "1rem",
                  overflow: "hidden",
                  border: "1.5px solid #e2e8f0",
                  background: "#fff",
                  boxShadow: "0 2px 10px rgba(0,0,0,0.05)",
                }}
              >
                <div style={{ borderBottom: "1.5px solid #f1f5f9", padding: "0.85rem 1.1rem" }}>
                  <SectionTitle>💬 Testimonials ({testimonials.length})</SectionTitle>
                </div>
                {testimonials.length === 0 ? (
                  <div style={{ display: "flex", height: "5rem", alignItems: "center", justifyContent: "center", gap: "0.5rem", fontSize: "1rem", color: "#94a3b8" }}>
                    <Star size={18} /> No testimonials added yet
                  </div>
                ) : (
                  <div style={{ maxHeight: "320px", overflowY: "auto" }}>
                    {testimonials.map((t) => (
                      <div key={t.id} style={{ padding: "0.9rem 1.1rem", borderBottom: "1px solid #f1f5f9" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.35rem" }}>
                          <div style={{ display: "flex", gap: "2px" }}>
                            {[...Array(5)].map((_, i) => (
                              <Star key={i} size={13} fill="#f59e0b" color="#f59e0b" />
                            ))}
                          </div>
                          <p style={{ fontSize: "0.95rem", fontWeight: 700, color: "#1e293b", margin: 0 }}>{t.author}</p>
                        </div>
                        <p style={{ fontSize: "0.95rem", color: "#64748b", margin: 0, lineHeight: 1.65 }}>{t.message}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* RIGHT column — contact sidebar */}
          <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>

            {/* Contact Details */}
            <div
              style={{
                borderRadius: "1rem",
                overflow: "hidden",
                border: "1.5px solid #e2e8f0",
                background: "#fff",
                boxShadow: "0 2px 10px rgba(0,0,0,0.05)",
              }}
            >
              <div style={{ borderBottom: "1.5px solid #f1f5f9", padding: "0.85rem 1.1rem" }}>
                <SectionTitle>📞 Contact Details</SectionTitle>
              </div>
              <div style={{ padding: "0.25rem 1rem 0.5rem" }}>
                <ContactRow icon={Building2} label="Company" value={company.company_name} />
                <ContactRow icon={Users} label="Contact Person" value={company.contact_person} />
                <ContactRow icon={Phone} label="Phone" value={company.contact_phone} href={`tel:${company.contact_phone}`} />
                <ContactRow icon={Mail} label="Email" value={company.contact_email} href={`mailto:${company.contact_email}`} />
                <ContactRow icon={Printer} label="Fax" value={company.contact_fax} />
                <ContactRow icon={Globe} label="Website" value={company.contact_website} href={company.contact_website} />
                <ContactRow icon={Facebook} label="Facebook" value={company.social_facebook} href={company.social_facebook} />
                <ContactRow
                  icon={MessageCircle}
                  label="WhatsApp"
                  value={company.social_whatsapp_number}
                  href={`https://wa.me/${company.social_whatsapp_number?.replace(/\D/g, "")}`}
                />
              </div>
            </div>

            {/* Location */}
            <div
              style={{
                borderRadius: "1rem",
                overflow: "hidden",
                border: "1.5px solid #e2e8f0",
                background: "#fff",
                boxShadow: "0 2px 10px rgba(0,0,0,0.05)",
              }}
            >
              <div style={{ borderBottom: "1.5px solid #f1f5f9", padding: "0.85rem 1.1rem" }}>
                <SectionTitle>📍 Location</SectionTitle>
              </div>
              <div style={{ padding: "0.25rem 1rem 0.5rem" }}>
                <ContactRow
                  icon={MapPin}
                  label="Address"
                  value={
                    [company.address_line1, company.address_line2, company.postal_code, company.country]
                      .filter(Boolean)
                      .join(", ") || undefined
                  }
                />
                <ContactRow icon={Clock} label="Office Hours" value={company.office_hours_regular} />
                <ContactRow icon={Clock} label="Other Hours" value={company.office_hours_other} />
              </div>
            </div>

            {/* Registration */}
            <div
              style={{
                borderRadius: "1rem",
                overflow: "hidden",
                border: "1.5px solid #e2e8f0",
                background: "#fff",
                boxShadow: "0 2px 10px rgba(0,0,0,0.05)",
              }}
            >
              <div style={{ borderBottom: "1.5px solid #f1f5f9", padding: "0.85rem 1.1rem" }}>
                <SectionTitle>🏛 Registration</SectionTitle>
              </div>
              <div style={{ padding: "0.25rem 1rem 0.5rem" }}>
                <ContactRow icon={Building2} label="License No." value={company.license_no} />
                <ContactRow icon={Building2} label="Short Name" value={company.short_name} />
              </div>
            </div>

          </div>
        </div>
      </div>
    </>
  );
};

export default AgencyProfile;