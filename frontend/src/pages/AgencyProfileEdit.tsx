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
        headers: {
          "Content-Type": "application/json",
        },
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
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: person.name,
            registration_number: person.registrationNumber,
          }),
        },
      );

      if (!response.ok) {
        throw new Error(await getErrorMessage(response, "Failed to save personnel"));
      }

      const data = (await response.json()) as {
        momPersonnel?: MomPersonnelApi;
      };

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
        headers: {
          "Content-Type": "application/json",
        },
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
    <div className="container mx-auto py-10 px-4 lg:px-8 max-w-7xl space-y-8">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-3xl font-bold tracking-tight">Edit Agency Profile</h1>
        <Button variant="outline" asChild>
          <button onClick={() => navigate(adminPath("/agency-profile"))}>
            ← Back to Profile
          </button>
        </Button>
      </div>

      <div className="content-card animate-fade-in-up">
        {isLoading ? (
          <div className="py-10 text-center text-muted-foreground">Loading agency profile...</div>
        ) : loadError ? (
          <div className="space-y-4 py-8 text-center">
            <p className="text-sm text-red-600">{loadError}</p>
            <Button type="button" variant="outline" onClick={() => void loadCompanyProfile()}>
              Retry Loading
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <form
              className="space-y-4"
              onSubmit={(event) => {
                event.preventDefault();
                void handleSaveProfile();
              }}
            >
            <div className="space-y-4">
              {profileFields.map(({ label, field }) => (
                <div key={field} className="grid grid-cols-1 items-center gap-2 sm:grid-cols-[180px_1fr]">
                  <Label className="form-label sm:text-right">{label}:</Label>
                  <Input value={formData[field]} onChange={(e) => handleChange(field, e.target.value)} />
                </div>
              ))}

              <div className="grid grid-cols-1 items-start gap-2 sm:grid-cols-[180px_1fr]">
                <Label className="form-label pt-2 sm:text-right">Office Hours:</Label>
                <textarea
                  className="min-h-[100px] w-full rounded-md border bg-background px-3 py-2 text-sm"
                  value={formData.officeHoursRegular}
                  onChange={(e) => handleChange("officeHoursRegular", e.target.value)}
                />
              </div>

              <div className="grid grid-cols-1 items-start gap-2 sm:grid-cols-[180px_1fr]">
                <Label className="form-label pt-2 sm:text-right">Other Office Hours:</Label>
                <textarea
                  className="min-h-[100px] w-full rounded-md border bg-background px-3 py-2 text-sm"
                  value={formData.officeHoursOther}
                  onChange={(e) => handleChange("officeHoursOther", e.target.value)}
                />
              </div>

              <div className="grid grid-cols-1 items-start gap-2 sm:grid-cols-[180px_1fr]">
                <Label className="form-label pt-2 sm:text-right">WhatsApp Message:</Label>
                <textarea
                  className="min-h-[100px] w-full rounded-md border bg-background px-3 py-2 text-sm"
                  value={formData.whatsappMessage}
                  onChange={(e) => handleChange("whatsappMessage", e.target.value)}
                />
              </div>

              <div className="grid grid-cols-1 items-start gap-2 sm:grid-cols-[180px_1fr]">
                <Label className="form-label pt-2 sm:text-right">About Us:</Label>
                <textarea
                  className="min-h-[140px] w-full rounded-md border bg-background px-3 py-2 text-sm"
                  value={formData.aboutUs}
                  onChange={(e) => handleChange("aboutUs", e.target.value)}
                />
              </div>

              <div className="grid grid-cols-1 items-start gap-2 sm:grid-cols-[180px_1fr]">
                <Label className="form-label pt-2 sm:text-right">Logo:</Label>
                <div className="space-y-2">
                  {formData.logoDataUrl ? (
                    <img src={formData.logoDataUrl} alt="Agency logo" className="h-20 w-20 rounded border object-cover" />
                  ) : (
                    <div className="h-20 w-20 rounded border bg-muted/40" />
                  )}
                  <div className="flex gap-2">
                    <label className="cursor-pointer rounded border px-3 py-2 text-sm">
                      {isProcessingLogo ? "Uploading..." : "Upload Logo"}
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        disabled={isProcessingLogo}
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          void handleLogoUpload(file);
                          e.currentTarget.value = "";
                        }}
                      />
                    </label>
                    {formData.logoDataUrl && (
                      <Button type="button" variant="outline" onClick={() => handleChange("logoDataUrl", "")}>
                        Remove
                      </Button>
                    )}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 items-start gap-2 sm:grid-cols-[180px_1fr]">
                <Label className="form-label pt-2 sm:text-right">Gallery Images:</Label>
                <div className="space-y-2">
                  <div className="grid grid-cols-3 gap-2">
                    {formData.galleryImageDataUrls.map((image, index) => (
                      <div key={`${image}-${index}`} className="relative overflow-hidden rounded border">
                        <img src={image} alt={`Gallery ${index + 1}`} className="h-20 w-full object-cover" />
                        <button
                          type="button"
                          className="absolute right-1 top-1 rounded bg-black/70 px-1 text-[10px] text-white"
                          onClick={() =>
                            setFormData((prev) => ({
                              ...prev,
                              galleryImageDataUrls: prev.galleryImageDataUrls.filter((_, i) => i !== index),
                            }))
                          }
                        >
                          X
                        </button>
                      </div>
                    ))}
                  </div>
                  <label className="inline-flex cursor-pointer rounded border px-3 py-2 text-sm">
                    {isProcessingGallery ? "Uploading..." : "Add Gallery Image"}
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      disabled={isProcessingGallery || formData.galleryImageDataUrls.length >= 6}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        void handleGalleryUpload(file);
                        e.currentTarget.value = "";
                      }}
                    />
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-1 items-start gap-2 sm:grid-cols-[180px_1fr]">
                <Label className="form-label pt-2 sm:text-right">Introduction Video:</Label>
                <div className="space-y-2">
                  {formData.introVideoDataUrl ? (
                    <video controls className="max-h-[220px] w-full rounded border bg-black" src={formData.introVideoDataUrl} />
                  ) : (
                    <div className="rounded border bg-muted/30 p-3 text-sm text-muted-foreground">No intro video uploaded.</div>
                  )}
                  <div className="flex gap-2">
                    <label className="cursor-pointer rounded border px-3 py-2 text-sm">
                      {isProcessingIntroVideo ? "Uploading..." : formData.introVideoDataUrl ? "Replace Video" : "Upload Video"}
                      <input
                        type="file"
                        accept="video/*"
                        className="hidden"
                        disabled={isProcessingIntroVideo}
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          void handleIntroVideoUpload(file);
                          e.currentTarget.value = "";
                        }}
                      />
                    </label>
                    {formData.introVideoDataUrl && (
                      <Button type="button" variant="outline" onClick={() => handleChange("introVideoDataUrl", "")}>
                        Remove
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-center pt-4">
              <Button type="submit" className="px-8" disabled={isSavingProfile}>
                {isSavingProfile ? "Saving..." : "Save Profile"}
              </Button>
            </div>
            </form>

            <h3 className="section-header mt-8">Agency Profile Post Preview</h3>
            <article className="rounded-lg border p-4">
              <div className="flex items-start gap-4">
                {formData.logoDataUrl ? (
                  <img src={formData.logoDataUrl} alt="Agency logo preview" className="h-16 w-16 rounded border object-cover" />
                ) : (
                  <div className="h-16 w-16 rounded border bg-muted/30" />
                )}
                <div>
                  <h4 className="text-lg font-semibold">{formData.companyName || "Agency Name"}</h4>
                  <p className="text-sm text-muted-foreground">{formData.shortName || "Short name"}</p>
                </div>
              </div>
              <p className="mt-4 whitespace-pre-wrap text-sm">{formData.aboutUs || "Write About Us content to display here..."}</p>
              {formData.galleryImageDataUrls.length > 0 && (
                <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {formData.galleryImageDataUrls.map((image, index) => (
                    <img key={`${image}-preview-${index}`} src={image} alt={`Gallery preview ${index + 1}`} className="h-24 w-full rounded border object-cover" />
                  ))}
                </div>
              )}
              {formData.introVideoDataUrl && (
                <div className="mt-4">
                  <video controls className="max-h-[260px] w-full rounded border bg-black" src={formData.introVideoDataUrl} />
                </div>
              )}
            </article>

            <h3 className="section-header mt-8">MOM Registered Personnel</h3>
            <div className="space-y-3 pt-2">
              {momPersonnel.map((person, index) => (
                <form
                  key={person.localId}
                  className="grid grid-cols-1 gap-2 rounded-lg border p-4 sm:grid-cols-[160px_1fr_120px_1fr_auto_auto]"
                  onSubmit={(event) => {
                    event.preventDefault();
                    void handleSavePersonnel(person);
                  }}
                >
                  <Label className="form-label self-center sm:text-right">Personnel #{index + 1}:</Label>
                  <Input
                    placeholder="Name"
                    value={person.name}
                    onChange={(e) => handlePersonnelChange(person.localId, "name", e.target.value)}
                  />
                  <Label className="self-center text-right text-sm text-muted-foreground">Reg. Number:</Label>
                  <Input
                    placeholder="Registration Number"
                    value={person.registrationNumber}
                    onChange={(e) => handlePersonnelChange(person.localId, "registrationNumber", e.target.value)}
                  />
                  <Button
                    type="submit"
                    variant="outline"
                    disabled={busyPersonnelId === person.localId}
                  >
                    {busyPersonnelId === person.localId ? "Saving..." : "Save"}
                  </Button>
                  <Button
                    type="button"
                    variant="destructive"
                    disabled={busyPersonnelId === person.localId}
                    onClick={() => void handleDeletePersonnel(person)}
                  >
                    Delete
                  </Button>
                </form>
              ))}

              {momPersonnel.length === 0 && (
                <p className="text-sm text-muted-foreground">No MOM personnel added yet.</p>
              )}

              <Button
                type="button"
                variant="secondary"
                onClick={() => setMomPersonnel((prev) => [...prev, createPersonnelRow()])}
              >
                Add Personnel
              </Button>
            </div>

            <h3 className="section-header mt-8">Testimonials</h3>
            <div className="space-y-4 pt-2">
              <form
                className="grid grid-cols-1 gap-4 rounded-lg border p-4 sm:grid-cols-[180px_1fr]"
                onSubmit={(event) => {
                  event.preventDefault();
                  void handleAddTestimonial();
                }}
              >
                <Label className="form-label sm:text-right">Author:</Label>
                <Input
                  value={newTestimonial.author}
                  onChange={(e) =>
                    setNewTestimonial((prev) => ({
                      ...prev,
                      author: e.target.value,
                    }))
                  }
                />
                <Label className="form-label pt-2 sm:text-right">Message:</Label>
                <textarea
                  className="min-h-[100px] w-full rounded-md border bg-background px-3 py-2 text-sm"
                  value={newTestimonial.message}
                  onChange={(e) =>
                    setNewTestimonial((prev) => ({
                      ...prev,
                      message: e.target.value,
                    }))
                  }
                />
                <div className="sm:col-start-2">
                  <Button type="submit" disabled={isAddingTestimonial}>
                    {isAddingTestimonial ? "Adding..." : "Add Testimonial"}
                  </Button>
                </div>
              </form>

              {testimonials.length === 0 ? (
                <p className="text-sm text-muted-foreground">No testimonials added yet.</p>
              ) : (
                testimonials.map((testimonial) => (
                  <div key={testimonial.id} className="rounded-lg border p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-2">
                        <p className="font-semibold">{testimonial.author}</p>
                        <p className="text-sm text-muted-foreground">{testimonial.message}</p>
                      </div>
                      <Button
                        type="button"
                        variant="destructive"
                        disabled={busyTestimonialId === testimonial.id}
                        onClick={() => void handleDeleteTestimonial(testimonial.id)}
                      >
                        {busyTestimonialId === testimonial.id ? "Deleting..." : "Delete"}
                      </Button>
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
