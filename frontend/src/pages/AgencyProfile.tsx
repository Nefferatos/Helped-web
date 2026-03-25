import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Edit } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/sonner";

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

const AgencyProfile = () => {
  const navigate = useNavigate();
  const [company, setCompany] = useState<CompanyProfileApi | null>(null);
  const [momPersonnel, setMomPersonnel] = useState<MomPersonnelApi[]>([]);
  const [testimonials, setTestimonials] = useState<TestimonialApi[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const loadCompanyProfile = async () => {
    try {
      setIsLoading(true);
      setLoadError(null);
      const response = await fetch("/api/company");
      const data = (await response.json().catch(() => ({}))) as Partial<CompanyResponse> & { error?: string };
      if (!response.ok || !data.companyProfile) {
        throw new Error(data.error || "Failed to load company profile");
      }
      setCompany(data.companyProfile);
      setMomPersonnel(data.momPersonnel ?? []);
      setTestimonials(data.testimonials ?? []);
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
      <div className="page-container">
        <div className="content-card py-10 text-center text-muted-foreground">Loading agency profile...</div>
      </div>
    );
  }

  if (loadError || !company) {
    return (
      <div className="page-container">
        <div className="content-card space-y-4 py-8 text-center">
          <p className="text-sm text-red-600">{loadError || "Failed to load company profile"}</p>
          <Button type="button" variant="outline" onClick={() => void loadCompanyProfile()}>
            Retry Loading
          </Button>
        </div>
      </div>
    );
  }

  const gallery = company.gallery_image_data_urls ?? [];
  const profileRows: Array<[string, string]> = [
    ["Company Name", company.company_name || "N/A"],
    ["Short Name", company.short_name || "N/A"],
    ["License No.", company.license_no || "N/A"],
    ["Address", [company.address_line1, company.address_line2].filter(Boolean).join(", ") || "N/A"],
    ["Postal Code", company.postal_code || "N/A"],
    ["Country", company.country || "N/A"],
    ["Contact Person", company.contact_person || "N/A"],
    ["Contact Phone", company.contact_phone || "N/A"],
    ["Email", company.contact_email || "N/A"],
    ["Fax", company.contact_fax || "N/A"],
    ["Website", company.contact_website || "N/A"],
    ["Facebook", company.social_facebook || "N/A"],
    ["WhatsApp Number", company.social_whatsapp_number || "N/A"],
  ];

  return (
    <div className="page-container">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-xl font-bold">Agency Profile</h2>
        <button
          className="flex items-center gap-1 text-sm text-primary hover:underline"
          onClick={() => navigate("/agency-profile/edit")}
        >
          <Edit className="h-4 w-4" /> Edit Agency Profile
        </button>
      </div>

      <div className="content-card animate-fade-in-up space-y-6">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          <div className="flex min-h-[220px] flex-col items-center justify-center gap-3 rounded-lg border bg-muted/30 p-6 text-center">
            {company.intro_video_data_url ? (
              <video controls className="max-h-[220px] w-full rounded-md border bg-black" src={company.intro_video_data_url}>
                Your browser does not support the video tag.
              </video>
            ) : (
              <p className="text-sm text-muted-foreground">No introduction video uploaded yet.</p>
            )}
          </div>

          <div className="space-y-2">
            <p className="text-sm font-semibold text-primary">Agency Contact</p>
            <p className="text-sm font-bold">{company.company_name || "N/A"}</p>
            <p className="text-sm">License No: {company.license_no || "N/A"}</p>
            <p className="text-sm">Contact Person: <span className="font-semibold">{company.contact_person || "N/A"}</span></p>
            <p className="text-sm">Phone: <span className="font-semibold text-primary">{company.contact_phone || "N/A"}</span></p>
            <p className="pt-2 text-xs text-muted-foreground">
              {company.office_hours_regular || "Office hours not provided."}
            </p>
          </div>

          <div className="flex flex-col items-center gap-3">
            <div className="flex h-28 w-24 items-center justify-center overflow-hidden rounded border bg-muted text-xs text-muted-foreground">
              {company.logo_data_url ? (
                <img src={company.logo_data_url} alt={`${company.company_name} logo`} className="h-full w-full object-cover" />
              ) : (
                "No Logo"
              )}
            </div>
            <p className="text-xs text-muted-foreground">{gallery.length} gallery images uploaded</p>
          </div>
        </div>

        <div className="rounded-lg border p-4">
          <h3 className="mb-2 text-sm font-semibold text-muted-foreground">About Us</h3>
          <p className="whitespace-pre-wrap text-sm">{company.about_us || "No About Us content yet."}</p>
        </div>

        <div className="grid grid-cols-1 gap-x-6 gap-y-1 text-sm md:grid-cols-[220px_1fr]">
          {profileRows.map(([label, value]) => (
            <div key={label} className="contents">
              <p className="py-1 font-semibold text-muted-foreground md:text-right">{label}</p>
              <p className="py-1">{value}</p>
            </div>
          ))}

          <p className="py-1 font-semibold text-muted-foreground md:text-right">WhatsApp Message</p>
          <p className="py-1 whitespace-pre-wrap">{company.social_whatsapp_message || "N/A"}</p>
          <p className="py-1 font-semibold text-muted-foreground md:text-right">Office Hours (Other)</p>
          <p className="py-1 whitespace-pre-wrap">{company.office_hours_other || "N/A"}</p>
        </div>

        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-muted-foreground">Gallery</h3>
          {gallery.length === 0 ? (
            <p className="text-sm text-muted-foreground">No gallery images uploaded yet.</p>
          ) : (
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              {gallery.map((image, index) => (
                <div key={`${image}-${index}`} className="h-28 overflow-hidden rounded border">
                  <img src={image} alt={`Agency gallery ${index + 1}`} className="h-full w-full object-cover" />
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-muted-foreground">MOM Registered Personnel</h3>
          {momPersonnel.length === 0 ? (
            <p className="text-sm text-muted-foreground">No MOM personnel added yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border text-sm">
                <thead>
                  <tr className="bg-muted/50">
                    <th className="border px-3 py-2 text-left">Name</th>
                    <th className="border px-3 py-2 text-left">Registration Number</th>
                  </tr>
                </thead>
                <tbody>
                  {momPersonnel.map((person) => (
                    <tr key={person.id}>
                      <td className="border px-3 py-2">{person.name}</td>
                      <td className="border px-3 py-2">{person.registration_number}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-muted-foreground">Testimonials</h3>
          {testimonials.length === 0 ? (
            <p className="text-sm text-muted-foreground">No testimonials added yet.</p>
          ) : (
            testimonials.map((testimonial) => (
              <div key={testimonial.id} className="rounded-lg border p-4">
                <p className="font-semibold">{testimonial.author}</p>
                <p className="mt-1 text-sm text-muted-foreground">{testimonial.message}</p>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default AgencyProfile;
