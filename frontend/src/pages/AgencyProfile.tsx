import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Edit, MessageCircle, Building2, Phone, Globe, MapPin, Clock, Users, Star, Image as ImageIcon } from "lucide-react";
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

const SectionHeader = ({ children }: { children: React.ReactNode }) => (
  <div className="border-b bg-muted/30 px-4 py-2">
    <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">{children}</p>
  </div>
);

const KVRow = ({ label, value }: { label: string; value: string }) => (
  <div className="contents">
    <p className="py-1 pr-3 text-[11px] font-medium text-muted-foreground border-b border-dashed border-muted/60 leading-snug">{label}</p>
    <p className="py-1 text-[12px] border-b border-dashed border-muted/60 leading-snug break-all">{value || "—"}</p>
  </div>
);

const StatCard = ({ label, value }: { label: string; value: number }) => (
  <div className="rounded-lg border bg-muted/20 px-3 py-2.5">
    <p className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">{label}</p>
    <p className="mt-0.5 text-xl font-bold text-foreground">{value}</p>
  </div>
);

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
      if (!response.ok || !data.companyProfile) throw new Error(data.error || "Failed to load company profile");
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
      const message = error instanceof Error ? error.message : "Failed to load company profile";
      setLoadError(message);
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { void loadCompanyProfile(); }, []);

  if (isLoading) {
    return (
      <div className="page-container">
        <div className="content-card py-10 text-center text-sm text-muted-foreground">Loading agency profile…</div>
      </div>
    );
  }

  if (loadError || !company) {
    return (
      <div className="page-container">
        <div className="content-card space-y-4 py-8 text-center">
          <p className="text-sm text-red-600">{loadError || "Failed to load company profile"}</p>
          <Button type="button" variant="outline" onClick={() => void loadCompanyProfile()}>Retry</Button>
        </div>
      </div>
    );
  }

  const gallery = company.gallery_image_data_urls ?? [];

  const contactRows: Array<[string, string]> = [
    ["Company Name", company.company_name || "N/A"],
    ["Short Name", company.short_name || "N/A"],
    ["License No.", company.license_no || "N/A"],
    ["Address", [company.address_line1, company.address_line2].filter(Boolean).join(", ") || "N/A"],
    ["Postal Code", company.postal_code || "N/A"],
    ["Country", company.country || "N/A"],
    ["Contact Person", company.contact_person || "N/A"],
    ["Phone", company.contact_phone || "N/A"],
    ["Email", company.contact_email || "N/A"],
    ["Fax", company.contact_fax || "N/A"],
    ["Website", company.contact_website || "N/A"],
    ["Facebook", company.social_facebook || "N/A"],
    ["WhatsApp No.", company.social_whatsapp_number || "N/A"],
    ["WhatsApp Msg", company.social_whatsapp_message || "N/A"],
    ["Office Hours", company.office_hours_regular || "N/A"],
    ["Other Hours", company.office_hours_other || "N/A"],
  ];

  return (
    <div className="page-container">

      {lightboxImage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm" onClick={() => setLightboxImage(null)}>
          <div className="relative" onClick={(e) => e.stopPropagation()}>
            <img src={lightboxImage} alt="Gallery preview" className="max-h-[90vh] max-w-[90vw] rounded-lg object-contain" />
            <button className="absolute -top-3 -right-3 flex h-7 w-7 items-center justify-center rounded-full bg-white text-black text-xs font-bold shadow" onClick={() => setLightboxImage(null)}>✕</button>
          </div>
        </div>
      )}

      <div className="content-card animate-fade-in-up space-y-4">

        <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-3">
          <div>
            <h1 className="text-lg font-bold text-foreground">{company.company_name || "Agency Profile"}</h1>
            <p className="text-xs text-muted-foreground">Lic. No.: {company.license_no || "N/A"}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link to={adminPath("/agency-profile/edit")}><Edit className="h-3.5 w-3.5 mr-1" />Edit Profile</Link>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link to={adminPath("/employment-contracts")}>Contracts</Link>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link to={adminPath("/staff")}>Staff</Link>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link to={adminPath("/chat-support")}><MessageCircle className="h-3.5 w-3.5 mr-1" />Chat</Link>
            </Button>
          </div>
        </div>


        <div className="grid grid-cols-1 gap-4 md:grid-cols-[1fr_220px_auto]">

          <div className="relative min-h-[180px] overflow-hidden rounded-lg border bg-muted/20">
            {company.intro_video_data_url ? (
              <video controls className="absolute inset-0 h-full w-full object-cover rounded-lg" src={company.intro_video_data_url}>
                Your browser does not support the video tag.
              </video>
            ) : (
              <div className="flex min-h-[180px] items-center justify-center text-center p-4">
                <p className="text-xs text-muted-foreground">No introduction video uploaded yet.</p>
              </div>
            )}
          </div>

          <div className="rounded-lg border bg-muted/10 p-3 text-xs space-y-1.5">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-2">Quick Contact</p>
            <div className="flex items-start gap-2">
              <Building2 className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" />
              <span className="font-semibold text-foreground leading-snug">{company.company_name}</span>
            </div>
            {company.contact_person && (
              <div className="flex items-center gap-2">
                <span className="h-3.5 w-3.5 shrink-0" />
                <span>{company.contact_person}</span>
              </div>
            )}
            {company.contact_phone && (
              <div className="flex items-center gap-2">
                <Phone className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <span className="font-semibold text-primary">{company.contact_phone}</span>
              </div>
            )}
            {company.contact_website && (
              <div className="flex items-center gap-2">
                <Globe className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <a href={company.contact_website} target="_blank" rel="noreferrer" className="text-primary hover:underline truncate">{company.contact_website}</a>
              </div>
            )}
            {company.address_line1 && (
              <div className="flex items-start gap-2">
                <MapPin className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" />
                <span className="leading-snug">{[company.address_line1, company.address_line2, company.postal_code, company.country].filter(Boolean).join(", ")}</span>
              </div>
            )}
            {company.office_hours_regular && (
              <div className="flex items-start gap-2">
                <Clock className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" />
                <span className="text-muted-foreground leading-snug">{company.office_hours_regular}</span>
              </div>
            )}
          </div>

          <div className="flex flex-col items-center gap-2">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground self-start">Logo</p>
            <div className="flex h-32 w-32 items-center justify-center overflow-hidden rounded-lg border bg-muted/20 text-xs text-muted-foreground">
              {company.logo_data_url ? (
                <img src={company.logo_data_url} alt={`${company.company_name} logo`} className="h-full w-full object-contain" />
              ) : (
                <span>No logo</span>
              )}
            </div>
            <p className="text-[10px] text-muted-foreground">{summary?.galleryImages ?? gallery.length} gallery images</p>
          </div>
        </div>

        <div className="rounded-lg border overflow-hidden">
          <SectionHeader>About Us</SectionHeader>
          <p className="p-4 text-sm whitespace-pre-wrap text-foreground leading-relaxed">
            {company.about_us || "No About Us content yet."}
          </p>
        </div>

        <div className="rounded-lg border overflow-hidden">
          <SectionHeader>Full Contact Details</SectionHeader>
          <div className="grid grid-cols-[160px_1fr] p-4 text-sm">
            {contactRows.map(([label, value]) => <KVRow key={label} label={label} value={value} />)}
          </div>
        </div>

        <div className="rounded-lg border overflow-hidden">
          <SectionHeader>Gallery ({gallery.length})</SectionHeader>
          {gallery.length === 0 ? (
            <div className="flex items-center gap-2 p-4 text-xs text-muted-foreground">
              <ImageIcon className="h-4 w-4" />
              No gallery images uploaded yet.
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-2 p-3 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8">
              {gallery.map((image, index) => (
                <button
                  key={`${image}-${index}`}
                  type="button"
                  onClick={() => setLightboxImage(image)}
                  className="group relative h-20 overflow-hidden rounded-md border bg-muted/20 transition hover:border-primary/40"
                >
                  <img src={image} alt={`Gallery ${index + 1}`} className="h-full w-full object-cover" />
                  <span className="absolute inset-0 bg-black/20 opacity-0 transition-opacity group-hover:opacity-100" />
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">

          <div className="rounded-lg border overflow-hidden">
            <SectionHeader>MOM Registered Personnel ({momPersonnel.length})</SectionHeader>
            {momPersonnel.length === 0 ? (
              <div className="flex items-center gap-2 p-4 text-xs text-muted-foreground">
                <Users className="h-4 w-4" />
                No MOM personnel added yet.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b bg-muted/30 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                      <th className="px-4 py-2 text-left">#</th>
                      <th className="px-4 py-2 text-left">Name</th>
                      <th className="px-4 py-2 text-left">Registration No.</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y text-xs">
                    {momPersonnel.map((person, i) => (
                      <tr key={person.id} className="hover:bg-muted/20">
                        <td className="px-4 py-2 text-muted-foreground">{i + 1}</td>
                        <td className="px-4 py-2 font-medium">{person.name}</td>
                        <td className="px-4 py-2 font-mono text-muted-foreground">{person.registration_number}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="rounded-lg border overflow-hidden">
            <SectionHeader>Testimonials ({testimonials.length})</SectionHeader>
            {testimonials.length === 0 ? (
              <div className="flex items-center gap-2 p-4 text-xs text-muted-foreground">
                <Star className="h-4 w-4" />
                No testimonials added yet.
              </div>
            ) : (
              <div className="divide-y max-h-72 overflow-y-auto">
                {testimonials.map((t) => (
                  <div key={t.id} className="px-4 py-3">
                    <p className="text-[11px] font-semibold text-foreground">{t.author}</p>
                    <p className="mt-0.5 text-[11px] text-muted-foreground leading-relaxed">{t.message}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

      </div>
    </div>
  );
};

export default AgencyProfile;
