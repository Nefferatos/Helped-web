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
  ChevronRight,
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
  <div className="flex items-center gap-2 mb-3">
    <h2 className="text-[11px] font-bold uppercase tracking-widest text-gray-400">{children}</h2>
    <div className="flex-1 h-px bg-gray-100" />
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
    <div className="flex items-start gap-3 py-2 border-b border-gray-50 last:border-0">
      <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-md bg-gray-50">
        <Icon className="h-3.5 w-3.5 text-gray-400" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-large uppercase tracking-wide text-black">{label}</p>
        {href ? (
          <a
            href={href}
            target="_blank"
            rel="noreferrer"
            className="text-[13px] text-[#0D6E56] hover:underline break-all leading-snug"
          >
            {value}
          </a>
        ) : (
          <p className="text-[13px] text-gray-800 leading-snug break-all">{value}</p>
        )}
      </div>
    </div>
  );
};

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
      const data = (await response.json().catch(() => ({}))) as Partial<CompanyResponse> & {
        error?: string;
      };
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
      const message =
        error instanceof Error ? error.message : "Failed to load company profile";
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
      <div className="flex h-64 items-center justify-center text-[13px] text-gray-400">
        Loading agency profile…
      </div>
    );
  }

  if (loadError || !company) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-4">
        <p className="text-[13px] text-red-500">{loadError || "Failed to load company profile"}</p>
        <Button variant="outline" size="sm" onClick={() => void loadCompanyProfile()}>
          Retry
        </Button>
      </div>
    );
  }

  const gallery = company.gallery_image_data_urls ?? [];

  return (
    <>
      {/* ── Lightbox ── */}
      {lightboxImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80"
          onClick={() => setLightboxImage(null)}
        >
          <div className="relative" onClick={(e) => e.stopPropagation()}>
            <img
              src={lightboxImage}
              alt="Gallery preview"
              className="max-h-[90vh] max-w-[90vw] rounded-xl object-contain shadow-2xl"
            />
            <button
              className="absolute -right-3 -top-3 flex h-8 w-8 items-center justify-center rounded-full bg-white shadow-lg"
              onClick={() => setLightboxImage(null)}
            >
              <X className="h-4 w-4 text-gray-700" />
            </button>
          </div>
        </div>
      )}

      <div className="space-y-5">

        {/* ── Header strip ── */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            {/* Logo */}
            <div className="h-14 w-14 flex-shrink-0 overflow-hidden rounded-xl border border-gray-200 bg-gray-50 shadow-sm">
              {company.logo_data_url ? (
                <img
                  src={company.logo_data_url}
                  alt={`${company.company_name} logo`}
                  className="h-full w-full object-contain"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center">
                  <Building2 className="h-6 w-6 text-gray-300" />
                </div>
              )}
            </div>
            <div>
              <h1 className="text-[18px] font-bold tracking-tight text-gray-900">
                {company.company_name || "Agency Profile"}
              </h1>
              <div className="mt-0.5 flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center rounded-md bg-[#E1F5EE] px-2 py-0.5 text-[11px] font-semibold text-[#0D6E56]">
                  Lic. {company.license_no || "N/A"}
                </span>
                {company.short_name && (
                  <span className="text-[16px] text-black">{company.short_name}</span>
                )}
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" asChild className="h-8 text-[12px]">
              <Link to={adminPath("/agency-profile/edit")}>
                <Edit className="mr-1.5 h-3.5 w-3.5" />
                Edit Profile
              </Link>
            </Button>
            <Button variant="outline" size="sm" asChild className="h-8 text-[12px]">
              <Link to={adminPath("/employment-contracts")}>Contracts</Link>
            </Button>
            <Button
              size="sm"
              asChild
              className="h-8 bg-[#0D6E56] text-[12px] text-white hover:bg-[#0a5c47]"
            >
              <Link to={adminPath("/chat-support")}>
                <MessageCircle className="mr-1.5 h-3.5 w-3.5" />
                Chat
              </Link>
            </Button>
          </div>
        </div>

        {/* ── Stat chips ── */}
        {summary && (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-8">
            {[
              { label: "Total Maids", value: summary.totalMaids },
              { label: "Public", value: summary.publicMaids },
              { label: "Hidden", value: summary.hiddenMaids },
              { label: "With Photos", value: summary.maidsWithPhotos },
              { label: "Enquiries", value: summary.enquiries },
              { label: "MOM Staff", value: summary.momPersonnel },
              { label: "Testimonials", value: summary.testimonials },
              { label: "Gallery", value: summary.galleryImages },
            ].map(({ label, value }) => (
              <div
                key={label}
                className="flex flex-col rounded-lg border border-gray-200 bg-white px-3 py-2.5 shadow-sm"
              >
                <span className="text-[14px] font-medium uppercase tracking-wide text-black">
                  {label}
                </span>
                <span className="mt-0.5 text-[20px] font-bold text-gray-900">{value}</span>
              </div>
            ))}
          </div>
        )}

        {/* ── Main two-column layout ── */}
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_300px]">

          {/* LEFT column */}
          <div className="space-y-5">

            {/* Intro video */}
            <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
              <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
                <SectionTitle>Introduction Video</SectionTitle>
              </div>
              <div className="p-4">
                {company.intro_video_data_url ? (
                  <video
                    controls
                    className="w-full rounded-lg object-cover"
                    style={{ maxHeight: 320 }}
                    src={company.intro_video_data_url}
                  />
                ) : (
                  <div className="flex h-40 items-center justify-center rounded-lg border-2 border-dashed border-gray-200 text-[13px] text-gray-400">
                    No introduction video uploaded yet
                  </div>
                )}
              </div>
            </div>

            {/* About Us */}
            <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
              <div className="border-b border-gray-100 px-4 py-3">
                <SectionTitle>About Us</SectionTitle>
              </div>
              <p className="p-4 text-[13px] leading-relaxed text-gray-700 whitespace-pre-wrap">
                {company.about_us || (
                  <span className="text-gray-400">No about us content yet.</span>
                )}
              </p>
            </div>

            {/* Gallery */}
            <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
              <div className="border-b border-gray-100 px-4 py-3">
                <SectionTitle>Gallery ({gallery.length})</SectionTitle>
              </div>
              {gallery.length === 0 ? (
                <div className="flex h-24 items-center justify-center gap-2 text-[13px] text-gray-400">
                  <ImageIcon className="h-4 w-4" />
                  No gallery images uploaded yet
                </div>
              ) : (
                <div className="grid grid-cols-4 gap-2 p-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-6 xl:grid-cols-8">
                  {gallery.map((image, index) => (
                    <button
                      key={`${image.slice(-12)}-${index}`}
                      type="button"
                      onClick={() => setLightboxImage(image)}
                      className="group relative aspect-square overflow-hidden rounded-lg border border-gray-200 bg-gray-50 transition hover:border-[#0D6E56]/40 hover:shadow-md"
                    >
                      <img
                        src={image}
                        alt={`Gallery ${index + 1}`}
                        className="h-full w-full object-cover"
                      />
                      <span className="absolute inset-0 bg-black/0 transition group-hover:bg-black/15" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* MOM Personnel + Testimonials side by side on large screens */}
            <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">

              {/* MOM Personnel */}
              <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
                <div className="border-b border-gray-100 px-4 py-3">
                  <SectionTitle>MOM Personnel ({momPersonnel.length})</SectionTitle>
                </div>
                {momPersonnel.length === 0 ? (
                  <div className="flex h-20 items-center justify-center gap-2 text-[13px] text-gray-400">
                    <Users className="h-4 w-4" />
                    No MOM personnel added yet
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-gray-100 bg-gray-50 text-[10px] font-semibold uppercase tracking-wide text-gray-400">
                          <th className="px-4 py-2.5 text-left w-8">#</th>
                          <th className="px-4 py-2.5 text-left">Name</th>
                          <th className="px-4 py-2.5 text-left">Reg. No.</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50 text-[13px]">
                        {momPersonnel.map((person, i) => (
                          <tr key={person.id} className="hover:bg-gray-50/70">
                            <td className="px-4 py-2.5 text-gray-400">{i + 1}</td>
                            <td className="px-4 py-2.5 font-medium text-gray-800">{person.name}</td>
                            <td className="px-4 py-2.5 font-mono text-[12px] text-gray-500">
                              {person.registration_number}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Testimonials */}
              <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
                <div className="border-b border-gray-100 px-4 py-3">
                  <SectionTitle>Testimonials ({testimonials.length})</SectionTitle>
                </div>
                {testimonials.length === 0 ? (
                  <div className="flex h-20 items-center justify-center gap-2 text-[13px] text-gray-400">
                    <Star className="h-4 w-4" />
                    No testimonials added yet
                  </div>
                ) : (
                  <div className="divide-y divide-gray-50 max-h-80 overflow-y-auto">
                    {testimonials.map((t) => (
                      <div key={t.id} className="px-4 py-3">
                        <div className="flex items-center gap-1.5 mb-1">
                          <div className="flex gap-0.5">
                            {[...Array(5)].map((_, i) => (
                              <Star
                                key={i}
                                className="h-3 w-3 fill-amber-400 text-amber-400"
                              />
                            ))}
                          </div>
                          <p className="text-[12px] font-semibold text-gray-800">{t.author}</p>
                        </div>
                        <p className="text-[12px] text-gray-500 leading-relaxed">{t.message}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>
          </div>

          {/* RIGHT column — contact sidebar */}
          <div className="space-y-5">

            {/* Quick contact card */}
            <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
              <div className="border-b border-gray-100 px-4 py-3">
                <SectionTitle>Contact Details</SectionTitle>
              </div>
              <div className="px-4 py-3">
                <ContactRow icon={Building2} label="Company" value={company.company_name} />
                <ContactRow icon={Users} label="Contact Person" value={company.contact_person} />
                <ContactRow
                  icon={Phone}
                  label="Phone"
                  value={company.contact_phone}
                  href={`tel:${company.contact_phone}`}
                />
                <ContactRow
                  icon={Mail}
                  label="Email"
                  value={company.contact_email}
                  href={`mailto:${company.contact_email}`}
                />
                <ContactRow icon={Printer} label="Fax" value={company.contact_fax} />
                <ContactRow
                  icon={Globe}
                  label="Website"
                  value={company.contact_website}
                  href={company.contact_website}
                />
                <ContactRow
                  icon={Facebook}
                  label="Facebook"
                  value={company.social_facebook}
                  href={company.social_facebook}
                />
                <ContactRow
                  icon={MessageCircle}
                  label="WhatsApp"
                  value={company.social_whatsapp_number}
                  href={`https://wa.me/${company.social_whatsapp_number?.replace(/\D/g, "")}`}
                />
              </div>
            </div>

            {/* Address card */}
            <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
              <div className="border-b border-gray-100 px-4 py-3">
                <SectionTitle>Location</SectionTitle>
              </div>
              <div className="px-4 py-3 space-y-0">
                <ContactRow
                  icon={MapPin}
                  label="Address"
                  value={
                    [
                      company.address_line1,
                      company.address_line2,
                      company.postal_code,
                      company.country,
                    ]
                      .filter(Boolean)
                      .join(", ") || undefined
                  }
                />
                <ContactRow icon={Clock} label="Office Hours" value={company.office_hours_regular} />
                <ContactRow icon={Clock} label="Other Hours" value={company.office_hours_other} />
              </div>
            </div>

            {/* License info */}
            <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
              <div className="border-b border-gray-100 px-4 py-3">
                <SectionTitle>Registration</SectionTitle>
              </div>
              <div className="px-4 py-3 space-y-0">
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