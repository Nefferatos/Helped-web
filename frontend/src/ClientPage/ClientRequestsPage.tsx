import { useMemo, useState } from "react";
import { toast } from "@/components/ui/sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { getStoredClient } from "@/lib/clientAuth";
import "./ClientTheme.css";

const NATIONALITY_OPTIONS = [
  "No Preference",
  "Filipino",
  "Indonesian",
  "Indian",
  "Sri Lankan",
  "Myanmese",
  "Cambodian",
  "Bangladeshi",
  "Nepali",
] as const;

const PRIMARY_DUTY_OPTIONS = [
  "No Preference",
  "Housekeeping",
  "Elderly Care",
  "Infant Care",
  "Kid Care",
  "Cooking",
  "Other",
] as const;

const AGE_GROUP_OPTIONS = [
  "No Preference",
  "18-25",
  "26-35",
  "36-45",
  "46+",
] as const;

const LANGUAGE_OPTIONS = [
  "No Preference",
  "English",
  "Mandarin",
  "Malay",
  "Tamil",
  "Tagalog",
  "Bahasa Indonesia",
] as const;

type RequirementsState = {
  noOffDay: boolean;
  hasChildren: boolean;
  married: boolean;
  newMaid: boolean;
  transferMaid: boolean;
  exSingaporeMaid: boolean;
};

const defaultRequirements: RequirementsState = {
  noOffDay: false,
  hasChildren: false,
  married: false,
  newMaid: false,
  transferMaid: false,
  exSingaporeMaid: false,
};

const ClientRequestsPage = () => {
  const storedClient = useMemo(() => getStoredClient(), []);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [form, setForm] = useState({
    name: storedClient?.name || "",
    email: storedClient?.email || "",
    phone: storedClient?.phone || "",
    nationality: "No Preference",
    primaryDuty: "No Preference",
    ageGroup: "No Preference",
    language: "No Preference",
    otherRequirements: "",
  });

  const [requirements, setRequirements] = useState<RequirementsState>(defaultRequirements);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!form.name.trim() || !form.email.trim() || !form.phone.trim()) {
      toast.error("Please fill in Your Name, Your E-mail, and Your Phone.");
      return;
    }

    const requirementsList = [
      requirements.noOffDay ? "No Off-day" : null,
      requirements.hasChildren ? "Has child(ren)" : null,
      requirements.married ? "Married" : null,
      requirements.newMaid ? "New Maid" : null,
      requirements.transferMaid ? "Transfer Maid" : null,
      requirements.exSingaporeMaid ? "Ex-Singapore Maid" : null,
    ].filter(Boolean) as string[];

    const messageLines = [
      "REQUEST MAID (Client Portal)",
      "",
      `Requirements: ${requirementsList.length ? requirementsList.join(", ") : "None selected"}`,
      `Nationality: ${form.nationality || "No Preference"}`,
      `Primary Duty: ${form.primaryDuty || "No Preference"}`,
      `Age Group: ${form.ageGroup || "No Preference"}`,
      `Language: ${form.language || "No Preference"}`,
      form.otherRequirements.trim() ? "" : null,
      form.otherRequirements.trim() ? `Other Requirements: ${form.otherRequirements.trim()}` : null,
    ].filter((line) => line !== null) as string[];

    try {
      setIsSubmitting(true);
      const response = await fetch("/api/enquiries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: form.name.trim(),
          email: form.email.trim(),
          phone: form.phone.trim(),
          message: messageLines.join("\n"),
        }),
      });

      const data = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) {
        throw new Error(data.error || "Failed to submit request");
      }

      toast.success("Request sent to admin/agency");
      setRequirements(defaultRequirements);
      setForm((prev) => ({
        ...prev,
        nationality: "No Preference",
        primaryDuty: "No Preference",
        ageGroup: "No Preference",
        language: "No Preference",
        otherRequirements: "",
      }));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to submit request");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="client-page-theme min-h-screen bg-[linear-gradient(180deg,hsl(var(--background))_0%,hsl(var(--muted))_100%)]">
      <main className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6">
        <div className="rounded-[28px] border bg-card p-6 shadow-sm sm:p-7">
          <div className="mb-6">
            <h1 className="font-display text-3xl font-bold text-foreground">Requests</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Submit a Request Maid form to admin/agency. Required fields must be completed before sending.
            </p>
          </div>

          <form onSubmit={(e) => void handleSubmit(e)} className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <label className="text-sm font-medium text-foreground">Your Name *</label>
                <Input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} required />
              </div>
              <div className="grid gap-2">
                <label className="text-sm font-medium text-foreground">Your E-mail *</label>
                <Input type="email" value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} required />
              </div>
            </div>

            <div className="grid gap-2">
              <label className="text-sm font-medium text-foreground">Your Phone *</label>
              <Input value={form.phone} onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))} required />
            </div>

            <div className="rounded-2xl border bg-muted/30 p-4">
              <p className="text-sm font-semibold text-foreground">Your Requirements</p>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {[
                  { key: "noOffDay", label: "No Off-day" },
                  { key: "hasChildren", label: "Has child(ren)" },
                  { key: "married", label: "Married" },
                  { key: "newMaid", label: "New Maid" },
                  { key: "transferMaid", label: "Transfer Maid" },
                  { key: "exSingaporeMaid", label: "Ex-Singapore Maid" },
                ].map((item) => (
                  <label key={item.key} className="flex items-center gap-2 rounded-xl bg-background px-3 py-2 text-sm">
                    <input
                      type="checkbox"
                      checked={requirements[item.key as keyof RequirementsState]}
                      onChange={(e) =>
                        setRequirements((p) => ({
                          ...p,
                          [item.key]: e.target.checked,
                        }))
                      }
                    />
                    <span>{item.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <label className="text-sm font-medium text-foreground">Nationality</label>
                <select
                  className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                  value={form.nationality}
                  onChange={(e) => setForm((p) => ({ ...p, nationality: e.target.value }))}
                >
                  {NATIONALITY_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid gap-2">
                <label className="text-sm font-medium text-foreground">Primary Duty</label>
                <select
                  className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                  value={form.primaryDuty}
                  onChange={(e) => setForm((p) => ({ ...p, primaryDuty: e.target.value }))}
                >
                  {PRIMARY_DUTY_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <label className="text-sm font-medium text-foreground">Age Group</label>
                <select
                  className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                  value={form.ageGroup}
                  onChange={(e) => setForm((p) => ({ ...p, ageGroup: e.target.value }))}
                >
                  {AGE_GROUP_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid gap-2">
                <label className="text-sm font-medium text-foreground">Language</label>
                <select
                  className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                  value={form.language}
                  onChange={(e) => setForm((p) => ({ ...p, language: e.target.value }))}
                >
                  {LANGUAGE_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid gap-2">
              <label className="text-sm font-medium text-foreground">Other Requirements</label>
              <Textarea
                value={form.otherRequirements}
                onChange={(e) => setForm((p) => ({ ...p, otherRequirements: e.target.value }))}
                placeholder="Any additional requirements..."
              />
            </div>

            <div className="pt-2">
              <Button type="submit" size="lg" className="w-full rounded-2xl" disabled={isSubmitting}>
                {isSubmitting ? "Submitting..." : "Submit Request"}
              </Button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
};

export default ClientRequestsPage;
