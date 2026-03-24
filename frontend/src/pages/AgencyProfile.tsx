import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/sonner";

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

const AgencyProfile = () => {
  const [formData, setFormData] = useState<CompanyFormData>(emptyFormData);
  const [momPersonnel, setMomPersonnel] = useState<PersonnelRow[]>([]);
  const [testimonials, setTestimonials] = useState<TestimonialApi[]>([]);
  const [newTestimonial, setNewTestimonial] = useState<NewTestimonialForm>(emptyTestimonialForm);
  const [isLoading, setIsLoading] = useState(true);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [busyPersonnelId, setBusyPersonnelId] = useState<string | null>(null);
  const [isAddingTestimonial, setIsAddingTestimonial] = useState(false);
  const [busyTestimonialId, setBusyTestimonialId] = useState<number | null>(null);

  useEffect(() => {
    const loadCompanyProfile = async () => {
      try {
        setIsLoading(true);
        const response = await fetch("/api/company");
        if (!response.ok) {
          throw new Error(await getErrorMessage(response, "Failed to load company profile"));
        }

        const data = (await response.json()) as CompanyResponse;
        setFormData(toFormData(data.companyProfile));
        setMomPersonnel(data.momPersonnel.map(toPersonnelRow));
        setTestimonials(data.testimonials);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to load company profile");
      } finally {
        setIsLoading(false);
      }
    };

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
    <div className="page-container">
      <div className="mb-6 flex items-center gap-3">
        <h2 className="text-xl font-bold">Agency Profile</h2>
      </div>

      <div className="content-card animate-fade-in-up">
        {isLoading ? (
          <div className="py-10 text-center text-muted-foreground">Loading agency profile...</div>
        ) : (
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
            </div>

            <div className="flex justify-center pt-4">
              <Button type="submit" className="px-8" disabled={isSavingProfile}>
                {isSavingProfile ? "Saving..." : "Save Profile"}
              </Button>
            </div>

            <h3 className="section-header mt-8">MOM Registered Personnel</h3>
            <div className="space-y-3 pt-2">
              {momPersonnel.map((person, index) => (
                <div
                  key={person.localId}
                  className="grid grid-cols-1 gap-2 rounded-lg border p-4 sm:grid-cols-[160px_1fr_120px_1fr_auto_auto]"
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
                    type="button"
                    variant="outline"
                    disabled={busyPersonnelId === person.localId}
                    onClick={() => void handleSavePersonnel(person)}
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
                </div>
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
              <div className="grid grid-cols-1 gap-4 rounded-lg border p-4 sm:grid-cols-[180px_1fr]">
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
                  <Button type="button" onClick={() => void handleAddTestimonial()} disabled={isAddingTestimonial}>
                    {isAddingTestimonial ? "Adding..." : "Add Testimonial"}
                  </Button>
                </div>
              </div>

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
          </form>
        )}
      </div>
    </div>
  );
};

export default AgencyProfile;
