import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const AgencyProfile = () => {
  const [formData, setFormData] = useState({
    companyName: "At The Agency (formerly Rinzin Agency Pte. Ltd.)",
    shopName: "Accu Store",
    address1: "",
    address2: "",
    postalCode: "769512",
    country: "Singapore",
    hpNumber: "89012168",
    email: "",
    telephone: "",
    fax: "",
    contactPerson: "Bala",
    contactPersonHp: "",
    officeHour: "Mon-Sat: 9-5:30am to 7:30pm\nSun & Public Holidays: By appointment\nEmail: info@theagency.sg",
  });

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <div className="page-container">
      <div className="flex items-center gap-3 mb-6">
        <h2 className="text-xl font-bold">Agency Profile</h2>
      </div>

      <div className="content-card animate-fade-in-up">
        <form className="space-y-4">
          <div className="space-y-4">
            {[
              { label: "Company Name", field: "companyName" },
              { label: "Shop Name", field: "shopName" },
              { label: "Address Line 1", field: "address1" },
              { label: "Address Line 2", field: "address2" },
              { label: "Postal Code", field: "postalCode" },
              { label: "Country", field: "country" },
              { label: "HP Number", field: "hpNumber" },
              { label: "Email", field: "email" },
              { label: "Telephone", field: "telephone" },
              { label: "Fax", field: "fax" },
              { label: "Contact Person", field: "contactPerson" },
              { label: "Contact Person HP", field: "contactPersonHp" },
            ].map(({ label, field }) => (
              <div key={field} className="grid grid-cols-1 sm:grid-cols-[180px_1fr] gap-2 items-center">
                <Label className="form-label sm:text-right">{label}:</Label>
                <Input
                  value={formData[field as keyof typeof formData]}
                  onChange={(e) => handleChange(field, e.target.value)}
                />
              </div>
            ))}

            <div className="grid grid-cols-1 sm:grid-cols-[180px_1fr] gap-2 items-start">
              <Label className="form-label sm:text-right pt-2">Office Hour:</Label>
              <textarea
                className="w-full min-h-[100px] rounded-md border bg-background px-3 py-2 text-sm"
                value={formData.officeHour}
                onChange={(e) => handleChange("officeHour", e.target.value)}
              />
            </div>
          </div>

          <h3 className="section-header mt-8">MOM Registered Personnel</h3>
          <div className="space-y-3 pt-2">
            {Array.from({ length: 5 }, (_, i) => (
              <div key={i} className="grid grid-cols-1 sm:grid-cols-[180px_1fr_120px_1fr] gap-2 items-center">
                <Label className="form-label sm:text-right">Personnel #{i + 1}:</Label>
                <Input placeholder="Name" />
                <Label className="text-sm text-muted-foreground text-right">Reg. Number:</Label>
                <Input placeholder="Registration Number" />
              </div>
            ))}
          </div>

          <h3 className="section-header mt-8">Branch Offices</h3>
          {Array.from({ length: 2 }, (_, i) => (
            <div key={i} className="border rounded-lg p-4 space-y-3 mt-4">
              <p className="font-semibold text-sm">Branch {i + 1}</p>
              {["Name", "Address Line 1", "Address Line 2", "Postal Code", "Contact Person", "WhatsApp Number", "Telephone", "Fax"].map((label) => (
                <div key={label} className="grid grid-cols-1 sm:grid-cols-[140px_1fr] gap-2 items-center">
                  <Label className="form-label sm:text-right text-xs">{label}:</Label>
                  <Input className="text-sm" />
                </div>
              ))}
              <div className="grid grid-cols-1 sm:grid-cols-[140px_1fr] gap-2 items-start">
                <Label className="form-label sm:text-right text-xs pt-2">Office Hour:</Label>
                <textarea className="w-full min-h-[60px] rounded-md border bg-background px-3 py-2 text-sm" />
              </div>
            </div>
          ))}

          <div className="pt-6 flex justify-center">
            <Button type="button" className="px-8">Save Profile</Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AgencyProfile;
