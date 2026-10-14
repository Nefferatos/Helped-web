import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { Bot, CheckCircle2, Loader2, RotateCcw, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/sonner";
import { submitFdwApplication, submitFdwReferral } from "@/lib/fdwChatbot";
import { writeMaidApplicationDraftFromChat } from "@/lib/maidApplicationDraft";

type Mode = "apply" | "refer";

type FieldDef = {
  name: string;
  label: string;
  placeholder?: string;
  type?: "text" | "email" | "tel" | "number" | "date";
  required?: boolean;
  multiline?: boolean;
  full?: boolean;
};

const APPLY_FIELDS: FieldDef[] = [
  { name: "full_name", label: "Full name", placeholder: "As written on your passport", required: true },
  { name: "email", label: "Email address", placeholder: "you@example.com", type: "email", required: true },
  { name: "contact_number", label: "Phone / WhatsApp", placeholder: "+65 9123 4567", type: "tel", required: true },
  { name: "nationality", label: "Nationality", placeholder: "e.g. Filipino, Indonesian, Myanmar", required: true },
  { name: "years_of_experience", label: "Years of experience", placeholder: "e.g. 3", type: "number", required: true },
  { name: "languages", label: "Languages spoken", placeholder: "e.g. English, Tagalog", required: true },
  { name: "employment_preference", label: "Preferred work", placeholder: "e.g. Live-in, elderly care", required: true },
  { name: "available_date", label: "Available from", type: "date", required: true },
  { name: "note", label: "Anything else?", placeholder: "Optional notes", multiline: true, full: true },
];

const REFER_FIELDS: FieldDef[] = [
  { name: "referrer_name", label: "Your name", placeholder: "Your full name", required: true },
  { name: "referrer_contact", label: "Your phone / WhatsApp", placeholder: "Your phone number", type: "tel", required: true },
  { name: "referred_name", label: "Who are you referring?", placeholder: "Their full name", required: true },
  { name: "relationship", label: "How do you know them?", placeholder: "e.g. Friend, relative" },
  { name: "referred_contact", label: "Their phone number", placeholder: "Their phone number", type: "tel" },
  { name: "note", label: "Anything else?", placeholder: "Optional notes", multiline: true, full: true },
];

const INTRO: Record<Mode, string> = {
  apply: "Hi! Fill in your details below and I'll register you with the agency. It only takes a minute.",
  refer: "Hi! Add the details of a domestic worker you'd like to refer and I'll pass them to the agency.",
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^[+\d()\s.-]{7,40}$/;

const emptyValues = (fields: FieldDef[]) =>
  Object.fromEntries(fields.map((field) => [field.name, ""])) as Record<string, string>;

const FdwApplicationChatbot = ({ initialMode = "apply" }: { initialMode?: Mode }) => {
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>(initialMode);
  const [values, setValues] = useState<Record<string, string>>(() => emptyValues(APPLY_FIELDS));
  const [consent, setConsent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const fields = mode === "apply" ? APPLY_FIELDS : REFER_FIELDS;

  const switchMode = (next: Mode) => {
    setMode(next);
    setValues(emptyValues(next === "apply" ? APPLY_FIELDS : REFER_FIELDS));
    setConsent(false);
    setSubmitted(false);
  };

  const setField = (name: string, value: string) =>
    setValues((prev) => ({ ...prev, [name]: value }));

  const validate = (): string | null => {
    for (const field of fields) {
      const value = (values[field.name] ?? "").trim();
      if (field.required && !value) return `${field.label} is required.`;
      if (field.type === "email" && value && !EMAIL_RE.test(value)) {
        return "Please enter a valid email address.";
      }
      if (field.type === "tel" && value && (!PHONE_RE.test(value) || value.replace(/\D/g, "").length < 7)) {
        return "Please enter a valid phone number.";
      }
    }
    return null;
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submitting) return;
    const error = validate();
    if (error) {
      toast.error(error);
      return;
    }
    if (!consent) {
      toast.error("Please tick the consent box before submitting.");
      return;
    }

    setSubmitting(true);
    try {
      if (mode === "apply") {
        // Pre-fill the long /apply-as-maid form so nothing is retyped.
        writeMaidApplicationDraftFromChat(values);
        await submitFdwApplication({
          full_name: values.full_name ?? "",
          email: values.email ?? "",
          contact_number: values.contact_number ?? "",
          nationality: values.nationality ?? "",
          years_of_experience: values.years_of_experience ?? "",
          languages: values.languages ?? "",
          employment_preference: values.employment_preference ?? "",
          available_date: values.available_date ?? "",
          note: values.note ?? "",
        });
      } else {
        await submitFdwReferral({
          referrer_name: values.referrer_name ?? "",
          referrer_contact: values.referrer_contact ?? "",
          relationship: values.relationship ?? "",
          referred_name: values.referred_name ?? "",
          referred_contact: values.referred_contact ?? "",
          note: values.note ?? "",
        });
      }
      setSubmitted(true);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const restart = () => {
    setValues(emptyValues(fields));
    setConsent(false);
    setSubmitted(false);
  };

  return (
    <section className="mx-auto flex w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-[#0E4E5E]/15 bg-white shadow-[0_22px_70px_-32px_rgba(14,78,94,0.45)]">
      <div
        className="h-1.5 w-full"
        style={{ background: "linear-gradient(90deg, #0E4E5E 0%, #FCD34D 60%, #0E4E5E 100%)" }}
      />
      <header className="flex items-center gap-3 border-b border-[#0E4E5E]/10 bg-[#E0F4F7] px-5 py-4">
        <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[#0E4E5E] text-white shadow-sm">
          <Bot className="h-6 w-6" />
        </span>
        <div className="min-w-0">
          <h1 className="truncate text-base font-black text-black">FDW Application Chatbot</h1>
          <p className="text-xs text-black">Fill in your details — it&apos;s quick and simple.</p>
        </div>
      </header>

      <div className="flex gap-2 border-b border-[#0E4E5E]/10 px-4 py-3">
        {(["apply", "refer"] as const).map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => switchMode(value)}
            className={`flex-1 rounded-full px-4 py-2 text-sm font-bold transition ${
              mode === value
                ? "bg-[#0E4E5E] text-white shadow-sm"
                : "bg-[#0E4E5E]/10 text-black hover:bg-[#0E4E5E]/20"
            }`}
          >
            {value === "apply" ? "Apply as FDW" : "Refer a friend"}
          </button>
        ))}
      </div>

      <div className="px-4 py-5 sm:px-5">
        <div className="mb-4 flex items-start gap-2.5">
          <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#E0F4F7] text-[#0E4E5E]">
            <Bot className="h-4 w-4" />
          </span>
          <p className="max-w-[85%] whitespace-pre-wrap rounded-2xl bg-[#F0F9FF] px-4 py-2.5 text-sm leading-6 text-black ring-1 ring-inset ring-[#0E4E5E]/10">
            {INTRO[mode]}
          </p>
        </div>

        {submitted ? (
          <div className="rounded-2xl border border-[#0E4E5E]/20 bg-[#E0F4F7] px-5 py-6 text-center">
            <CheckCircle2 className="mx-auto h-9 w-9 text-[#0E4E5E]" />
            <p className="mt-2 text-sm font-bold text-black">
              {mode === "apply" ? "Application submitted" : "Referral submitted"}
            </p>
            <p className="mt-1 text-xs text-black">
              {mode === "apply"
                ? "We've also pre-filled the full application form with your answers."
                : "Thank you — the agency will follow up if needed."}
            </p>
            {mode === "apply" && (
              <Button
                type="button"
                onClick={() => navigate("/apply-as-maid")}
                className="mt-4 w-full bg-[#0E4E5E] text-white shadow-[0_3px_0_#0a3a47] hover:bg-[#0a3a47]"
              >
                Continue to the pre-filled form
              </Button>
            )}
            <Button
              type="button"
              onClick={restart}
              variant="outline"
              className="mt-2 w-full border-[#0E4E5E]/30 text-black hover:bg-[#0E4E5E]/5"
            >
              <RotateCcw className="mr-2 h-4 w-4" /> Start over
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              {fields.map((field) => (
                <div key={field.name} className={field.full ? "sm:col-span-2" : undefined}>
                  <Label htmlFor={`fdw-${field.name}`} className="text-xs font-semibold text-black">
                    {field.label}
                    {field.required && <span className="ml-0.5 text-rose-500">*</span>}
                  </Label>
                  {field.multiline ? (
                    <Textarea
                      id={`fdw-${field.name}`}
                      value={values[field.name] ?? ""}
                      onChange={(event) => setField(field.name, event.target.value)}
                      placeholder={field.placeholder}
                      rows={3}
                      className="mt-1.5 min-h-[72px]"
                    />
                  ) : (
                    <Input
                      id={`fdw-${field.name}`}
                      type={field.type ?? "text"}
                      value={values[field.name] ?? ""}
                      onChange={(event) => setField(field.name, event.target.value)}
                      placeholder={field.placeholder}
                      className="mt-1.5"
                    />
                  )}
                </div>
              ))}
            </div>

            <label className="flex cursor-pointer items-start gap-2.5 rounded-xl border border-[#0E4E5E]/20 bg-[#E0F4F7] p-3 text-xs leading-5 text-black">
              <input
                type="checkbox"
                checked={consent}
                onChange={(event) => setConsent(event.target.checked)}
                className="mt-0.5 h-4 w-4 shrink-0 accent-[#0E4E5E]"
              />
              <span>
                {mode === "apply"
                  ? "I confirm the details are accurate and consent to the agency reviewing and contacting me about recruitment."
                  : "I have permission to share this person's contact details with the agency for this referral."}
              </span>
            </label>

            <Button
              type="submit"
              disabled={submitting}
              className="h-11 w-full bg-[#0E4E5E] text-white shadow-[0_3px_0_#0a3a47] hover:bg-[#0a3a47]"
            >
              {submitting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Send className="mr-2 h-4 w-4" />
              )}
              {submitting ? "Submitting…" : mode === "apply" ? "Submit application" : "Send referral"}
            </Button>
          </form>
        )}
      </div>
    </section>
  );
};

export default FdwApplicationChatbot;
