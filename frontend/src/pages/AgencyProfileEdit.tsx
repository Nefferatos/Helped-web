import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/sonner";
import { adminPath } from "@/lib/routes";

interface CompanyProfileApi {
  id?: number;
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
  branding_theme_color?: string;
  branding_button_color?: string;
  about_us?: string;
  logo_data_url?: string;
  gallery_image_data_urls?: string[];
  intro_video_data_url?: string;
}

interface MomPersonnelApi {
  id: number;
  company_id: number;
  name: string;
  registration_number: string;
}

interface TestimonialApi {
  id: number;
  company_id: number;
  message: string;
  author: string;
}

interface CompanyResponse {
  companyProfile: CompanyProfileApi;
  momPersonnel: MomPersonnelApi[];
  testimonials: TestimonialApi[];
}

interface CompanyFormData {
  companyName: string;
  shortName: string;
  licenseNo: string;
  address1: string;
  address2: string;
  postalCode: string;
  country: string;
  contactPerson: string;
  contactPhone: string;
  email: string;
  fax: string;
  website: string;
  officeHoursRegular: string;
  officeHoursOther: string;
  facebook: string;
  whatsappNumber: string;
  whatsappMessage: string;
  themeColor: string;
  buttonColor: string;
  aboutUs: string;
  logoDataUrl: string;
  galleryImageDataUrls: string[];
  introVideoDataUrl: string;
}

interface PersonnelRow {
  localId: string;
  id?: number;
  name: string;
  registrationNumber: string;
  isNew: boolean;
}

interface NewTestimonialForm {
  author: string;
  message: string;
}

const emptyFormData: CompanyFormData = {
  companyName: "",
  shortName: "",
  licenseNo: "",
  address1: "",
  address2: "",
  postalCode: "",
  country: "",
  contactPerson: "",
  contactPhone: "",
  email: "",
  fax: "",
  website: "",
  officeHoursRegular: "",
  officeHoursOther: "",
  facebook: "",
  whatsappNumber: "",
  whatsappMessage: "",
  themeColor: "",
  buttonColor: "",
  aboutUs: "",
  logoDataUrl: "",
  galleryImageDataUrls: [],
  introVideoDataUrl: "",
};

const emptyTestimonialForm: NewTestimonialForm = {
  author: "",
  message: "",
};

const profileFields: Array<{ label: string; field: keyof CompanyFormData }> = [
  { label: "Company Name", field: "companyName" },
  { label: "Short Name", field: "shortName" },
  { label: "License No", field: "licenseNo" },
  { label: "Address Line 1", field: "address1" },
  { label: "Address Line 2", field: "address2" },
  { label: "Postal Code", field: "postalCode" },
  { label: "Country", field: "country" },
  { label: "Contact Person", field: "contactPerson" },
  { label: "Contact Phone", field: "contactPhone" },
  { label: "Email", field: "email" },
  { label: "Fax", field: "fax" },
  { label: "Website", field: "website" },
  { label: "Facebook", field: "facebook" },
  { label: "WhatsApp Number", field: "whatsappNumber" },
  { label: "Theme Color", field: "themeColor" },
  { label: "Button Color", field: "buttonColor" },
];

const toFormData = (company: CompanyProfileApi): CompanyFormData => ({
  companyName: company.company_name ?? "",
  shortName: company.short_name ?? "",
  licenseNo: company.license_no ?? "",
  address1: company.address_line1 ?? "",
  address2: company.address_line2 ?? "",
  postalCode: company.postal_code ?? "",
  country: company.country ?? "",
  contactPerson: company.contact_person ?? "",
  contactPhone: company.contact_phone ?? "",
  email: company.contact_email ?? "",
  fax: company.contact_fax ?? "",
  website: company.contact_website ?? "",
  officeHoursRegular: company.office_hours_regular ?? "",
  officeHoursOther: company.office_hours_other ?? "",
  facebook: company.social_facebook ?? "",
  whatsappNumber: company.social_whatsapp_number ?? "",
  whatsappMessage: company.social_whatsapp_message ?? "",
  themeColor: company.branding_theme_color ?? "",
  buttonColor: company.branding_button_color ?? "",
  aboutUs: company.about_us ?? "",
  logoDataUrl: company.logo_data_url ?? "",
  galleryImageDataUrls: company.gallery_image_data_urls ?? [],
  introVideoDataUrl: company.intro_video_data_url ?? "",
});

const toProfilePayload = (formData: CompanyFormData) => ({
  company_name: formData.companyName,
  short_name: formData.shortName,
  license_no: formData.licenseNo,
  address_line1: formData.address1,
  address_line2: formData.address2,
  postal_code: formData.postalCode,
  country: formData.country,
  contact_person: formData.contactPerson,
  contact_phone: formData.contactPhone,
  contact_email: formData.email,
  contact_fax: formData.fax,
  contact_website: formData.website,
  office_hours_regular: formData.officeHoursRegular,
  office_hours_other: formData.officeHoursOther,
  social_facebook: formData.facebook,
  social_whatsapp_number: formData.whatsappNumber,
  social_whatsapp_message: formData.whatsappMessage,
  branding_theme_color: formData.themeColor,
  branding_button_color: formData.buttonColor,
  about_us: formData.aboutUs,
  logo_data_url: formData.logoDataUrl,
  gallery_image_data_urls: formData.galleryImageDataUrls,
  intro_video_data_url: formData.introVideoDataUrl,
});

const toPersonnelRow = (person: MomPersonnelApi): PersonnelRow => ({
  localId: String(person.id),
  id: person.id,
  name: person.name,
  registrationNumber: person.registration_number,
  isNew: false,
});

const createPersonnelRow = (): PersonnelRow => ({
  localId: `new-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  name: "",
  registrationNumber: "",
  isNew: true,
});

const getErrorMessage = async (response: Response, fallback: string) => {
  try {
    const data = (await response.json()) as { error?: string; message?: string };
    return data.error || data.message || fallback;
  } catch {
    return fallback;
  }
};

/* ─── Elderly-friendly shared styles ─── */
const inputStyle: React.CSSProperties = {
  fontSize: "1.05rem",
  padding: "0.6rem 0.85rem",
  height: "auto",
  borderRadius: "0.5rem",
  border: "2px solid #c7d2e0",
  lineHeight: 1.5,
};

const labelStyle: React.CSSProperties = {
  fontSize: "1rem",
  fontWeight: 600,
  color: "#374151",
  lineHeight: 1.4,
};

const textareaStyle: React.CSSProperties = {
  fontSize: "1.05rem",
  padding: "0.65rem 0.85rem",
  borderRadius: "0.5rem",
  border: "2px solid #c7d2e0",
  lineHeight: 1.6,
  width: "100%",
};

const sectionHeaderStyle: React.CSSProperties = {
  fontSize: "1.25rem",
  fontWeight: 700,
  color: "#1e3a5f",
  borderBottom: "3px solid #3b82f6",
  paddingBottom: "0.4rem",
  marginTop: "2rem",
};

const AgencyProfileEdit = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState<CompanyFormData>(emptyFormData);
  const [momPersonnel, setMomPersonnel] = useState<PersonnelRow[]>([]);
  const [testimonials, setTestimonials] = useState<TestimonialApi[]>([]);
  const [newTestimonial, setNewTestimonial] = useState<NewTestimonialForm>(emptyTestimonialForm);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [busyPersonnelId, setBusyPersonnelId] = useState<string | null>(null);
  const [isAddingTestimonial, setIsAddingTestimonial] = useState(false);
  const [busyTestimonialId, setBusyTestimonialId] = useState<number | null>(null);
  const [isProcessingLogo, setIsProcessingLogo] = useState(false);
  const [isProcessingGallery, setIsProcessingGallery] = useState(false);
  const [isProcessingIntroVideo, setIsProcessingIntroVideo] = useState(false);

  const handleFileToDataUrl = async (file: File) => {
    const reader = new FileReader();
    return await new Promise<string>((resolve, reject) => {
      reader.onload = () => resolve(String(reader.result || ""));
      reader.onerror = () => reject(new Error("Failed to process file"));
      reader.readAsDataURL(file);
    });
  };

  const handleLogoUpload = async (file?: File) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file for logo");
      return;
    }
    try {
      setIsProcessingLogo(true);
      const dataUrl = await handleFileToDataUrl(file);
      setFormData((prev) => ({ ...prev, logoDataUrl: dataUrl }));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to upload logo");
    } finally {
      setIsProcessingLogo(false);
    }
  };

  const handleGalleryUpload = async (file?: File) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }
    if (formData.galleryImageDataUrls.length >= 6) {
      toast.error("Maximum 6 gallery images allowed");
      return;
    }
    try {
      setIsProcessingGallery(true);
      const dataUrl = await handleFileToDataUrl(file);
      setFormData((prev) => ({
        ...prev,
        galleryImageDataUrls: [...prev.galleryImageDataUrls, dataUrl],
      }));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to upload gallery image");
    } finally {
      setIsProcessingGallery(false);
    }
  };

  const handleIntroVideoUpload = async (file?: File) => {
    if (!file) return;
    if (!file.type.startsWith("video/")) {
      toast.error("Please select a video file");
      return;
    }
    try {
      setIsProcessingIntroVideo(true);
      const dataUrl = await handleFileToDataUrl(file);
      setFormData((prev) => ({ ...prev, introVideoDataUrl: dataUrl }));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to upload intro video");
    } finally {
      setIsProcessingIntroVideo(false);
    }
  };

  const loadCompanyProfile = async () => {
    try {
      setIsLoading(true);
      setLoadError(null);
      const response = await fetch("/api/company");
      if (!response.ok) {
        throw new Error(await getErrorMessage(response, "Failed to load company profile"));
      }

      const data = (await response.json()) as Partial<CompanyResponse>;
      if (!data.companyProfile) {
        throw new Error("Company profile response is incomplete");
      }

      setFormData(toFormData(data.companyProfile));
      setMomPersonnel((data.momPersonnel ?? []).map(toPersonnelRow));
      setTestimonials(data.testimonials ?? []);
    } catch (error) {
      const baseMessage = error instanceof Error ? error.message : "Failed to load company profile";
      const isConnectionIssue = /Failed to fetch|NetworkError|network|connect|Load failed/i.test(baseMessage);
      const finalMessage = isConnectionIssue
        ? "Cannot connect to backend API. Start backend with `npm run dev` from project root, then retry."
        : baseMessage;
      setLoadError(finalMessage);
      toast.error(finalMessage);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadCompanyProfile();
  }, []);

  const handleChange = (field: keyof CompanyFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handlePersonnelChange = (localId: string, field: "name" | "registrationNumber", value: string) => {
    setMomPersonnel((prev) =>
      prev.map((person) => (person.localId === localId ? { ...person, [field]: value } : person)),
    );
  };

  const handleSaveProfile = async () => {
    try {
      setIsSavingProfile(true);
      const response = await fetch("/api/company", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(toProfilePayload(formData)),
      });

      if (!response.ok) {
        throw new Error(await getErrorMessage(response, "Failed to save company profile"));
      }

      const data = (await response.json()) as { companyProfile: CompanyProfileApi };
      setFormData(toFormData(data.companyProfile));
      toast.success("Agency profile saved");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save company profile");
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleSavePersonnel = async (person: PersonnelRow) => {
    if (!person.name.trim() || !person.registrationNumber.trim()) {
      toast.error("Personnel name and registration number are required");
      return;
    }

    try {
      setBusyPersonnelId(person.localId);

      const response = await fetch(
        person.isNew ? "/api/company/mom-personnel" : `/api/company/mom-personnel/${person.id}`,
        {
          method: person.isNew ? "POST" : "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: person.name,
            registration_number: person.registrationNumber,
          }),
        },
      );

      if (!response.ok) {
        throw new Error(await getErrorMessage(response, "Failed to save personnel"));
      }

      const data = (await response.json()) as { momPersonnel?: MomPersonnelApi };

      if (data.momPersonnel) {
        const savedRow = toPersonnelRow(data.momPersonnel);
        setMomPersonnel((prev) =>
          prev.map((current) => (current.localId === person.localId ? savedRow : current)),
        );
      }

      toast.success(person.isNew ? "Personnel added" : "Personnel updated");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save personnel");
    } finally {
      setBusyPersonnelId(null);
    }
  };

  const handleDeletePersonnel = async (person: PersonnelRow) => {
    if (person.isNew || !person.id) {
      setMomPersonnel((prev) => prev.filter((item) => item.localId !== person.localId));
      return;
    }

    try {
      setBusyPersonnelId(person.localId);
      const response = await fetch(`/api/company/mom-personnel/${person.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error(await getErrorMessage(response, "Failed to delete personnel"));
      }

      setMomPersonnel((prev) => prev.filter((item) => item.localId !== person.localId));
      toast.success("Personnel removed");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete personnel");
    } finally {
      setBusyPersonnelId(null);
    }
  };

  const handleAddTestimonial = async () => {
    if (!newTestimonial.author.trim() || !newTestimonial.message.trim()) {
      toast.error("Testimonial author and message are required");
      return;
    }

    try {
      setIsAddingTestimonial(true);
      const response = await fetch("/api/company/testimonials", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newTestimonial),
      });

      if (!response.ok) {
        throw new Error(await getErrorMessage(response, "Failed to add testimonial"));
      }

      const data = (await response.json()) as { testimonial: TestimonialApi };
      setTestimonials((prev) => [data.testimonial, ...prev]);
      setNewTestimonial(emptyTestimonialForm);
      toast.success("Testimonial added");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to add testimonial");
    } finally {
      setIsAddingTestimonial(false);
    }
  };

  const handleDeleteTestimonial = async (testimonialId: number) => {
    try {
      setBusyTestimonialId(testimonialId);
      const response = await fetch(`/api/company/testimonials/${testimonialId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error(await getErrorMessage(response, "Failed to delete testimonial"));
      }

      setTestimonials((prev) => prev.filter((item) => item.id !== testimonialId));
      toast.success("Testimonial removed");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete testimonial");
    } finally {
      setBusyTestimonialId(null);
    }
  };

  return (
    <div
      className="container mx-auto py-10 px-4 lg:px-8 max-w-7xl space-y-8"
      style={{ fontSize: "1.05rem", lineHeight: 1.7, color: "#1a2636" }}
    >
      {/* ── Page Header ── */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "1rem",
          padding: "1.25rem 1.5rem",
          background: "linear-gradient(135deg, #1e3a5f 0%, #2563eb 100%)",
          borderRadius: "1rem",
          boxShadow: "0 4px 16px rgba(37,99,235,0.18)",
        }}
      >
        <h1 style={{ fontSize: "1.7rem", fontWeight: 800, color: "#fff", margin: 0, letterSpacing: "-0.01em" }}>
          ✏️ Edit Agency Profile
        </h1>
        <button
          onClick={() => navigate(adminPath("/agency-profile"))}
          style={{
            fontSize: "1rem",
            fontWeight: 600,
            color: "#fff",
            background: "rgba(255,255,255,0.15)",
            border: "2px solid rgba(255,255,255,0.4)",
            borderRadius: "0.6rem",
            padding: "0.55rem 1.1rem",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "0.4rem",
            whiteSpace: "nowrap",
          }}
        >
          ← Back to Profile
        </button>
      </div>

      <div
        style={{
          background: "#fff",
          borderRadius: "1rem",
          border: "1.5px solid #dbeafe",
          boxShadow: "0 2px 12px rgba(37,99,235,0.07)",
          padding: "2rem",
        }}
      >
        {isLoading ? (
          <div style={{ padding: "3rem 0", textAlign: "center", fontSize: "1.15rem", color: "#6b7280" }}>
            ⏳ Loading agency profile...
          </div>
        ) : loadError ? (
          <div style={{ padding: "2.5rem 0", textAlign: "center", display: "flex", flexDirection: "column", gap: "1rem", alignItems: "center" }}>
            <p style={{ fontSize: "1.05rem", color: "#dc2626", fontWeight: 600 }}>{loadError}</p>
            <button
              onClick={() => void loadCompanyProfile()}
              style={{
                fontSize: "1rem",
                padding: "0.6rem 1.4rem",
                borderRadius: "0.5rem",
                border: "2px solid #2563eb",
                background: "#fff",
                color: "#2563eb",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              🔄 Retry Loading
            </button>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>

            {/* ── Profile Form ── */}
            <form
              style={{ display: "flex", flexDirection: "column", gap: "1rem" }}
              onSubmit={(e) => { e.preventDefault(); void handleSaveProfile(); }}
            >
              {/* ── Basic Fields ── */}
              <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
                {profileFields.map(({ label, field }) => (
                  <div
                    key={field}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "200px 1fr",
                      alignItems: "center",
                      gap: "0.75rem",
                    }}
                    className="form-row-responsive"
                  >
                    <label style={{ ...labelStyle, textAlign: "right" }}>{label}:</label>
                    <input
                      style={inputStyle}
                      value={formData[field] as string}
                      onChange={(e) => handleChange(field, e.target.value)}
                    />
                  </div>
                ))}

                {/* Textarea fields */}
                {[
                  { label: "Office Hours", field: "officeHoursRegular" as keyof CompanyFormData, rows: 4 },
                  { label: "Other Office Hours", field: "officeHoursOther" as keyof CompanyFormData, rows: 4 },
                  { label: "WhatsApp Message", field: "whatsappMessage" as keyof CompanyFormData, rows: 4 },
                  { label: "About Us", field: "aboutUs" as keyof CompanyFormData, rows: 5 },
                ].map(({ label, field, rows }) => (
                  <div
                    key={field}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "200px 1fr",
                      alignItems: "start",
                      gap: "0.75rem",
                    }}
                  >
                    <label style={{ ...labelStyle, textAlign: "right", paddingTop: "0.55rem" }}>{label}:</label>
                    <textarea
                      rows={rows}
                      style={textareaStyle}
                      value={formData[field] as string}
                      onChange={(e) => handleChange(field, e.target.value)}
                    />
                  </div>
                ))}

                {/* ── Logo Upload ── */}
                <div style={{ display: "grid", gridTemplateColumns: "200px 1fr", alignItems: "start", gap: "0.75rem" }}>
                  <label style={{ ...labelStyle, textAlign: "right", paddingTop: "0.55rem" }}>Logo:</label>
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.65rem" }}>
                    {formData.logoDataUrl ? (
                      <img
                        src={formData.logoDataUrl}
                        alt="Agency logo"
                        style={{ height: "88px", width: "88px", borderRadius: "0.5rem", border: "2px solid #dbeafe", objectFit: "cover" }}
                      />
                    ) : (
                      <div style={{ height: "88px", width: "88px", borderRadius: "0.5rem", border: "2px dashed #c7d2e0", background: "#f8fafc" }} />
                    )}
                    <div style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap" }}>
                      <label
                        style={{
                          cursor: "pointer",
                          fontSize: "1rem",
                          fontWeight: 600,
                          padding: "0.55rem 1.1rem",
                          borderRadius: "0.5rem",
                          border: "2px solid #2563eb",
                          color: "#2563eb",
                          background: "#eff6ff",
                          display: "inline-block",
                        }}
                      >
                        {isProcessingLogo ? "⏳ Uploading..." : "📷 Upload Logo"}
                        <input
                          type="file"
                          accept="image/*"
                          style={{ display: "none" }}
                          disabled={isProcessingLogo}
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            void handleLogoUpload(file);
                            e.currentTarget.value = "";
                          }}
                        />
                      </label>
                      {formData.logoDataUrl && (
                        <button
                          type="button"
                          onClick={() => handleChange("logoDataUrl", "")}
                          style={{
                            fontSize: "1rem",
                            fontWeight: 600,
                            padding: "0.55rem 1.1rem",
                            borderRadius: "0.5rem",
                            border: "2px solid #ef4444",
                            color: "#ef4444",
                            background: "#fff1f1",
                            cursor: "pointer",
                          }}
                        >
                          🗑 Remove
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* ── Gallery Images ── */}
                <div style={{ display: "grid", gridTemplateColumns: "200px 1fr", alignItems: "start", gap: "0.75rem" }}>
                  <label style={{ ...labelStyle, textAlign: "right", paddingTop: "0.55rem" }}>Gallery Images:</label>
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.65rem" }}>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "0.6rem" }}>
                      {formData.galleryImageDataUrls.map((image, index) => (
                        <div
                          key={`${image}-${index}`}
                          style={{ position: "relative", borderRadius: "0.5rem", overflow: "hidden", border: "2px solid #dbeafe" }}
                        >
                          <img
                            src={image}
                            alt={`Gallery ${index + 1}`}
                            style={{ height: "88px", width: "100%", objectFit: "cover", display: "block" }}
                          />
                          <button
                            type="button"
                            onClick={() =>
                              setFormData((prev) => ({
                                ...prev,
                                galleryImageDataUrls: prev.galleryImageDataUrls.filter((_, i) => i !== index),
                              }))
                            }
                            style={{
                              position: "absolute",
                              top: "4px",
                              right: "4px",
                              background: "rgba(0,0,0,0.72)",
                              color: "#fff",
                              border: "none",
                              borderRadius: "0.3rem",
                              fontSize: "0.8rem",
                              fontWeight: 700,
                              padding: "2px 6px",
                              cursor: "pointer",
                              lineHeight: 1,
                            }}
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>
                    <label
                      style={{
                        cursor: formData.galleryImageDataUrls.length >= 6 ? "not-allowed" : "pointer",
                        fontSize: "1rem",
                        fontWeight: 600,
                        padding: "0.55rem 1.1rem",
                        borderRadius: "0.5rem",
                        border: "2px solid #10b981",
                        color: "#10b981",
                        background: "#f0fdf4",
                        display: "inline-block",
                        opacity: formData.galleryImageDataUrls.length >= 6 ? 0.5 : 1,
                      }}
                    >
                      {isProcessingGallery ? "⏳ Uploading..." : "🖼 Add Gallery Image"}
                      <input
                        type="file"
                        accept="image/*"
                        style={{ display: "none" }}
                        disabled={isProcessingGallery || formData.galleryImageDataUrls.length >= 6}
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          void handleGalleryUpload(file);
                          e.currentTarget.value = "";
                        }}
                      />
                    </label>
                    <p style={{ fontSize: "0.9rem", color: "#6b7280", margin: 0 }}>
                      {formData.galleryImageDataUrls.length} / 6 images uploaded
                    </p>
                  </div>
                </div>

                {/* ── Intro Video Upload ── */}
                <div style={{ display: "grid", gridTemplateColumns: "200px 1fr", alignItems: "start", gap: "0.75rem" }}>
                  <label style={{ ...labelStyle, textAlign: "right", paddingTop: "0.55rem" }}>Introduction Video:</label>
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                    {formData.introVideoDataUrl ? (
                      /* Colorful video wrapper — no width change */
                      <div
                        style={{
                          borderRadius: "0.9rem",
                          padding: "4px",
                          background: "linear-gradient(135deg, #6366f1 0%, #06b6d4 50%, #10b981 100%)",
                          boxShadow: "0 4px 18px rgba(99,102,241,0.22)",
                          display: "inline-block",
                          width: "100%",
                          boxSizing: "border-box",
                        }}
                      >
                        <div
                          style={{
                            background: "#0f172a",
                            borderRadius: "0.6rem",
                            overflow: "hidden",
                          }}
                        >
                          {/* Coloured title bar */}
                          <div
                            style={{
                              background: "linear-gradient(90deg, #4f46e5 0%, #0891b2 60%, #059669 100%)",
                              padding: "0.35rem 0.85rem",
                              display: "flex",
                              alignItems: "center",
                              gap: "0.5rem",
                            }}
                          >
                            <span style={{ fontSize: "0.85rem", color: "#fff", fontWeight: 700, letterSpacing: "0.03em" }}>
                              🎬 Introduction Video
                            </span>
                            <span
                              style={{
                                marginLeft: "auto",
                                fontSize: "0.72rem",
                                background: "rgba(255,255,255,0.18)",
                                color: "#fff",
                                padding: "1px 8px",
                                borderRadius: "999px",
                                fontWeight: 600,
                              }}
                            >
                              PREVIEW
                            </span>
                          </div>
                          <video
                            controls
                            style={{
                              display: "block",
                              width: "100%",
                              maxHeight: "220px",
                              background: "#000",
                            }}
                            src={formData.introVideoDataUrl}
                          />
                        </div>
                      </div>
                    ) : (
                      <div
                        style={{
                          borderRadius: "0.9rem",
                          padding: "4px",
                          background: "linear-gradient(135deg, #6366f1 0%, #06b6d4 50%, #10b981 100%)",
                          boxSizing: "border-box",
                          width: "100%",
                        }}
                      >
                        <div
                          style={{
                            background: "#0f172a",
                            borderRadius: "0.6rem",
                            overflow: "hidden",
                          }}
                        >
                          <div
                            style={{
                              background: "linear-gradient(90deg, #4f46e5 0%, #0891b2 60%, #059669 100%)",
                              padding: "0.35rem 0.85rem",
                              display: "flex",
                              alignItems: "center",
                              gap: "0.5rem",
                            }}
                          >
                            <span style={{ fontSize: "0.85rem", color: "#fff", fontWeight: 700 }}>
                              🎬 Introduction Video
                            </span>
                          </div>
                          <div
                            style={{
                              padding: "1.5rem",
                              textAlign: "center",
                              color: "#94a3b8",
                              fontSize: "1rem",
                              display: "flex",
                              flexDirection: "column",
                              alignItems: "center",
                              gap: "0.4rem",
                            }}
                          >
                            <span style={{ fontSize: "2rem" }}>🎥</span>
                            <span>No intro video uploaded yet.</span>
                          </div>
                        </div>
                      </div>
                    )}

                    <div style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap" }}>
                      <label
                        style={{
                          cursor: "pointer",
                          fontSize: "1rem",
                          fontWeight: 600,
                          padding: "0.55rem 1.1rem",
                          borderRadius: "0.5rem",
                          border: "2px solid #6366f1",
                          color: "#6366f1",
                          background: "#eef2ff",
                          display: "inline-block",
                        }}
                      >
                        {isProcessingIntroVideo
                          ? "⏳ Uploading..."
                          : formData.introVideoDataUrl
                          ? "🔄 Replace Video"
                          : "🎬 Upload Video"}
                        <input
                          type="file"
                          accept="video/*"
                          style={{ display: "none" }}
                          disabled={isProcessingIntroVideo}
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            void handleIntroVideoUpload(file);
                            e.currentTarget.value = "";
                          }}
                        />
                      </label>
                      {formData.introVideoDataUrl && (
                        <button
                          type="button"
                          onClick={() => handleChange("introVideoDataUrl", "")}
                          style={{
                            fontSize: "1rem",
                            fontWeight: 600,
                            padding: "0.55rem 1.1rem",
                            borderRadius: "0.5rem",
                            border: "2px solid #ef4444",
                            color: "#ef4444",
                            background: "#fff1f1",
                            cursor: "pointer",
                          }}
                        >
                          🗑 Remove
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* ── Save Profile Button ── */}
              <div style={{ display: "flex", justifyContent: "center", paddingTop: "1.25rem" }}>
                <button
                  type="submit"
                  disabled={isSavingProfile}
                  style={{
                    fontSize: "1.15rem",
                    fontWeight: 700,
                    padding: "0.75rem 2.5rem",
                    borderRadius: "0.6rem",
                    border: "none",
                    background: isSavingProfile
                      ? "#93c5fd"
                      : "linear-gradient(135deg, #1d4ed8 0%, #2563eb 100%)",
                    color: "#fff",
                    cursor: isSavingProfile ? "not-allowed" : "pointer",
                    boxShadow: "0 3px 12px rgba(37,99,235,0.3)",
                    letterSpacing: "0.01em",
                    minWidth: "180px",
                  }}
                >
                  {isSavingProfile ? "⏳ Saving..." : "💾 Save Profile"}
                </button>
              </div>
            </form>

            {/* ── Post Preview ── */}
            <h3 style={sectionHeaderStyle}>👁 Agency Profile Post Preview</h3>
            <article
              style={{
                borderRadius: "0.85rem",
                border: "1.5px solid #dbeafe",
                padding: "1.25rem",
                background: "#f8faff",
              }}
            >
              <div style={{ display: "flex", alignItems: "start", gap: "1rem" }}>
                {formData.logoDataUrl ? (
                  <img
                    src={formData.logoDataUrl}
                    alt="Agency logo preview"
                    style={{ height: "70px", width: "70px", borderRadius: "0.5rem", border: "2px solid #dbeafe", objectFit: "cover", flexShrink: 0 }}
                  />
                ) : (
                  <div style={{ height: "70px", width: "70px", borderRadius: "0.5rem", border: "2px dashed #c7d2e0", background: "#f1f5f9", flexShrink: 0 }} />
                )}
                <div>
                  <h4 style={{ fontSize: "1.2rem", fontWeight: 700, margin: 0, color: "#1e3a5f" }}>
                    {formData.companyName || "Agency Name"}
                  </h4>
                  <p style={{ fontSize: "0.95rem", color: "#6b7280", margin: "0.2rem 0 0" }}>
                    {formData.shortName || "Short name"}
                  </p>
                </div>
              </div>
              <p style={{ marginTop: "1rem", fontSize: "1rem", lineHeight: 1.7, whiteSpace: "pre-wrap", color: "#374151" }}>
                {formData.aboutUs || "Write About Us content to display here..."}
              </p>
              {formData.galleryImageDataUrls.length > 0 && (
                <div style={{ marginTop: "1rem", display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "0.5rem" }}>
                  {formData.galleryImageDataUrls.map((image, index) => (
                    <img
                      key={`${image}-preview-${index}`}
                      src={image}
                      alt={`Gallery preview ${index + 1}`}
                      style={{ height: "100px", width: "100%", borderRadius: "0.5rem", border: "2px solid #dbeafe", objectFit: "cover" }}
                    />
                  ))}
                </div>
              )}
              {formData.introVideoDataUrl && (
                <div style={{ marginTop: "1rem" }}>
                  <div
                    style={{
                      borderRadius: "0.9rem",
                      padding: "4px",
                      background: "linear-gradient(135deg, #6366f1 0%, #06b6d4 50%, #10b981 100%)",
                      boxSizing: "border-box",
                      width: "100%",
                    }}
                  >
                    <div style={{ background: "#0f172a", borderRadius: "0.6rem", overflow: "hidden" }}>
                      <div
                        style={{
                          background: "linear-gradient(90deg, #4f46e5 0%, #0891b2 60%, #059669 100%)",
                          padding: "0.35rem 0.85rem",
                        }}
                      >
                        <span style={{ fontSize: "0.85rem", color: "#fff", fontWeight: 700 }}>🎬 Introduction Video</span>
                      </div>
                      <video
                        controls
                        style={{ display: "block", width: "100%", maxHeight: "260px", background: "#000" }}
                        src={formData.introVideoDataUrl}
                      />
                    </div>
                  </div>
                </div>
              )}
            </article>

            {/* ── MOM Personnel ── */}
            <h3 style={sectionHeaderStyle}>👤 MOM Registered Personnel</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem", paddingTop: "0.5rem" }}>
              {momPersonnel.map((person, index) => (
                <form
                  key={person.localId}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "auto 1fr auto 1fr auto auto",
                    alignItems: "center",
                    gap: "0.65rem",
                    borderRadius: "0.75rem",
                    border: "1.5px solid #dbeafe",
                    padding: "1rem 1.15rem",
                    background: "#f8faff",
                  }}
                  onSubmit={(e) => { e.preventDefault(); void handleSavePersonnel(person); }}
                >
                  <label style={{ ...labelStyle, whiteSpace: "nowrap" }}>#{index + 1}:</label>
                  <input
                    placeholder="Full Name"
                    value={person.name}
                    style={inputStyle}
                    onChange={(e) => handlePersonnelChange(person.localId, "name", e.target.value)}
                  />
                  <label style={{ ...labelStyle, whiteSpace: "nowrap", color: "#6b7280" }}>Reg. No:</label>
                  <input
                    placeholder="Registration Number"
                    value={person.registrationNumber}
                    style={inputStyle}
                    onChange={(e) => handlePersonnelChange(person.localId, "registrationNumber", e.target.value)}
                  />
                  <button
                    type="submit"
                    disabled={busyPersonnelId === person.localId}
                    style={{
                      fontSize: "1rem",
                      fontWeight: 700,
                      padding: "0.55rem 1.1rem",
                      borderRadius: "0.5rem",
                      border: "2px solid #2563eb",
                      color: "#2563eb",
                      background: "#eff6ff",
                      cursor: busyPersonnelId === person.localId ? "not-allowed" : "pointer",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {busyPersonnelId === person.localId ? "..." : "💾 Save"}
                  </button>
                  <button
                    type="button"
                    disabled={busyPersonnelId === person.localId}
                    onClick={() => void handleDeletePersonnel(person)}
                    style={{
                      fontSize: "1rem",
                      fontWeight: 700,
                      padding: "0.55rem 1.1rem",
                      borderRadius: "0.5rem",
                      border: "2px solid #ef4444",
                      color: "#ef4444",
                      background: "#fff1f1",
                      cursor: busyPersonnelId === person.localId ? "not-allowed" : "pointer",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {busyPersonnelId === person.localId ? "..." : "🗑 Delete"}
                  </button>
                </form>
              ))}

              {momPersonnel.length === 0 && (
                <p style={{ fontSize: "1rem", color: "#6b7280" }}>No MOM personnel added yet.</p>
              )}

              <button
                type="button"
                onClick={() => setMomPersonnel((prev) => [...prev, createPersonnelRow()])}
                style={{
                  alignSelf: "flex-start",
                  fontSize: "1rem",
                  fontWeight: 700,
                  padding: "0.6rem 1.3rem",
                  borderRadius: "0.5rem",
                  border: "2px solid #10b981",
                  color: "#10b981",
                  background: "#f0fdf4",
                  cursor: "pointer",
                }}
              >
                ➕ Add Personnel
              </button>
            </div>

            {/* ── Testimonials ── */}
            <h3 style={sectionHeaderStyle}>💬 Testimonials</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem", paddingTop: "0.5rem" }}>
              {/* Add testimonial form */}
              <form
                style={{
                  display: "grid",
                  gridTemplateColumns: "160px 1fr",
                  gap: "0.85rem",
                  borderRadius: "0.75rem",
                  border: "1.5px solid #dbeafe",
                  padding: "1.25rem",
                  background: "#f8faff",
                  alignItems: "start",
                }}
                onSubmit={(e) => { e.preventDefault(); void handleAddTestimonial(); }}
              >
                <label style={{ ...labelStyle, textAlign: "right", paddingTop: "0.5rem" }}>Author:</label>
                <input
                  style={inputStyle}
                  value={newTestimonial.author}
                  onChange={(e) => setNewTestimonial((prev) => ({ ...prev, author: e.target.value }))}
                />
                <label style={{ ...labelStyle, textAlign: "right", paddingTop: "0.55rem" }}>Message:</label>
                <textarea
                  rows={4}
                  style={textareaStyle}
                  value={newTestimonial.message}
                  onChange={(e) => setNewTestimonial((prev) => ({ ...prev, message: e.target.value }))}
                />
                <div style={{ gridColumn: "2" }}>
                  <button
                    type="submit"
                    disabled={isAddingTestimonial}
                    style={{
                      fontSize: "1rem",
                      fontWeight: 700,
                      padding: "0.6rem 1.4rem",
                      borderRadius: "0.5rem",
                      border: "none",
                      background: isAddingTestimonial ? "#93c5fd" : "linear-gradient(135deg, #1d4ed8 0%, #2563eb 100%)",
                      color: "#fff",
                      cursor: isAddingTestimonial ? "not-allowed" : "pointer",
                      boxShadow: "0 2px 8px rgba(37,99,235,0.22)",
                    }}
                  >
                    {isAddingTestimonial ? "⏳ Adding..." : "➕ Add Testimonial"}
                  </button>
                </div>
              </form>

              {testimonials.length === 0 ? (
                <p style={{ fontSize: "1rem", color: "#6b7280" }}>No testimonials added yet.</p>
              ) : (
                testimonials.map((testimonial) => (
                  <div
                    key={testimonial.id}
                    style={{
                      borderRadius: "0.75rem",
                      border: "1.5px solid #dbeafe",
                      padding: "1.1rem 1.25rem",
                      background: "#f8faff",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "start", justifyContent: "space-between", gap: "1rem" }}>
                      <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                        <p style={{ fontSize: "1.05rem", fontWeight: 700, margin: 0, color: "#1e3a5f" }}>
                          {testimonial.author}
                        </p>
                        <p style={{ fontSize: "1rem", color: "#4b5563", margin: 0, lineHeight: 1.65 }}>
                          {testimonial.message}
                        </p>
                      </div>
                      <button
                        type="button"
                        disabled={busyTestimonialId === testimonial.id}
                        onClick={() => void handleDeleteTestimonial(testimonial.id)}
                        style={{
                          fontSize: "1rem",
                          fontWeight: 700,
                          padding: "0.5rem 1rem",
                          borderRadius: "0.5rem",
                          border: "2px solid #ef4444",
                          color: "#ef4444",
                          background: "#fff1f1",
                          cursor: busyTestimonialId === testimonial.id ? "not-allowed" : "pointer",
                          flexShrink: 0,
                          whiteSpace: "nowrap",
                        }}
                      >
                        {busyTestimonialId === testimonial.id ? "⏳..." : "🗑 Delete"}
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

          </div>
        )}
      </div>
    </div>
  );
};

export default AgencyProfileEdit;