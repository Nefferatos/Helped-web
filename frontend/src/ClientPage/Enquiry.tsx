import { useEffect, useState, type FormEvent } from "react";
import PublicSiteNavbar from "@/components/PublicSiteNavbar";
import { getClientAuthHeaders, getStoredClient, getClientToken, type ClientUser } from "@/lib/clientAuth";
import ClientPortalNavbar from "@/ClientPage/ClientPortalNavbar";
import {
  CheckCircle2,
  Clock,
  Sparkles,
  Bot,
  Zap,
  ChevronRight,
  MessageSquare,
  Users,
  Star,
  Phone,
  ArrowLeft,
  CalendarClock,
  Inbox,
  Loader2,
} from "lucide-react";

type EnquiryProps = {
  embedded?: boolean;
};

const QUICK_TOPICS = [
  {
    label: "Hire a Full-Time Maid",
    icon: "🏠",
    desc: "Live-in or live-out domestic helper",
    prefill:
      "I'm looking for a full-time maid. I prefer [live-in / live-out]. My household has [number] people and I need help with [cleaning / cooking / laundry / etc.]. My preferred start date is [date] and my budget is around [amount] per month.",
  },
  {
    label: "Part-Time Cleaning",
    icon: "🧹",
    desc: "Regular or one-off deep cleans",
    prefill:
      "I'm interested in part-time cleaning services. I need [regular weekly/bi-weekly or a one-off deep clean] for my [apartment / house] in [area]. Preferred schedule: [days/times]. Budget: [range].",
  },
  {
    label: "Elderly Care",
    icon: "❤️",
    desc: "Companion or caretaker support",
    prefill:
      "I'm looking for elderly care support for my [family member]. They need [companionship / personal care / medical assistance]. Preferred hours: [full-time / part-time / live-in]. Start date: [date].",
  },
  {
    label: "Nanny / Babysitter",
    icon: "👶",
    desc: "Childcare at home",
    prefill:
      "I need a [nanny / babysitter] for my child/children aged [ages]. Hours needed: [full-time / part-time, days and times]. Key requirements: [languages, activities, experience with infants, etc.]. Start date: [date].",
  },
  {
    label: "Cook / Chef",
    icon: "🍳",
    desc: "Meal prep or full-time cook",
    prefill:
      "I'm looking for a [cook / personal chef] to [prepare daily meals / meal prep weekly / cook for events]. Cuisine preferences: [local / international / dietary requirements]. Hours: [full-time / part-time]. Start date: [date].",
  },
];

const STEPS = [
  { icon: Inbox, label: "You send your enquiry", color: "text-violet-600", bg: "bg-violet-50", ring: "ring-violet-100" },
  { icon: Users, label: "Agency team reviews it", color: "text-emerald-600", bg: "bg-emerald-50", ring: "ring-emerald-100" },
  { icon: Zap, label: "Admin inbox is updated", color: "text-amber-500", bg: "bg-amber-50", ring: "ring-amber-100" },
  { icon: MessageSquare, label: "Agency contacts you", color: "text-sky-600", bg: "bg-sky-50", ring: "ring-sky-100" },
];

function ConfirmationScreen({ onReset }: { onReset: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
      <div className="relative mb-8">
        <div className="flex h-28 w-28 items-center justify-center rounded-full bg-emerald-100 ring-8 ring-emerald-50">
          <CheckCircle2 className="h-14 w-14 text-emerald-500" />
        </div>
        <div className="absolute -top-1 -right-1 flex h-9 w-9 items-center justify-center rounded-full bg-amber-400 shadow-lg">
          <Sparkles className="h-5 w-5 text-white" />
        </div>
      </div>

      <h2 className="text-3xl md:text-4xl font-black text-gray-900 mb-3 tracking-tight">
        Enquiry Received!
      </h2>
      <p className="text-gray-500 max-w-md mb-10 leading-relaxed text-[15px]">
        Your enquiry has been sent to the agency team. They will review it and get back to you shortly.
      </p>

      <div className="w-full max-w-md rounded-2xl border border-gray-100 bg-white shadow-md p-6 mb-8 text-left">
        <p className="text-[11px] font-black uppercase tracking-widest text-gray-400 mb-5">
          What happens next
        </p>
        <div className="space-y-4">
          {[
            { icon: Inbox, color: "bg-sky-50 text-sky-600", text: "Your enquiry is now in the agency inbox" },
            { icon: Users, color: "bg-emerald-50 text-emerald-600", text: "The admin or agency team will review it" },
            { icon: CalendarClock, color: "bg-amber-50 text-amber-500", text: "Expect a reply within 1-2 business hours" },
            { icon: Phone, color: "bg-violet-50 text-violet-600", text: "Check your phone or email for follow-up" },
          ].map(({ icon: Icon, color, text }, i) => (
            <div key={i} className="flex items-center gap-4">
              <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${color}`}>
                <Icon className="h-5 w-5" />
              </div>
              <p className="text-[14px] font-semibold text-gray-700">{text}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-2.5 rounded-xl border border-emerald-100 bg-emerald-50 px-5 py-3.5 mb-8">
        <Clock className="h-4 w-4 text-emerald-600 shrink-0" />
        <p className="text-[13px] font-semibold text-emerald-800">
          Typical agency response: <span className="font-black">1-2 business hours</span>
        </p>
      </div>

      <button
        type="button"
        onClick={onReset}
        className="inline-flex items-center gap-2 rounded-2xl border-2 border-gray-200 bg-white px-6 py-3 text-[14px] font-bold text-gray-700 hover:border-emerald-300 hover:text-emerald-700 hover:bg-emerald-50 transition-all duration-200"
      >
        <ArrowLeft className="h-4 w-4" />
        Submit another enquiry
      </button>
    </div>
  );
}

function SimpleEnquiryForm({
  initialName,
  initialEmail,
  initialPhone,
  initialMessage,
  onSuccess,
}: {
  initialName: string;
  initialEmail: string;
  initialPhone: string;
  initialMessage: string;
  onSuccess: () => void;
}) {
  const [name, setName] = useState(initialName);
  const [email, setEmail] = useState(initialEmail);
  const [phone, setPhone] = useState(initialPhone);
  const [message, setMessage] = useState(initialMessage);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setName((current) => current || initialName);
  }, [initialName]);

  useEffect(() => {
    setEmail((current) => current || initialEmail);
  }, [initialEmail]);

  useEffect(() => {
    setPhone((current) => current || initialPhone);
  }, [initialPhone]);

  useEffect(() => {
    if (initialMessage) {
      setMessage(initialMessage);
    }
  }, [initialMessage]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!name.trim() || !email.trim() || !phone.trim() || !message.trim()) {
      setError("Name, email, phone, and message are required.");
      return;
    }

    if (!/^[^\s@]+@[^\s@.]+\.[^\s@]+$/.test(email.trim())) {
      setError("Please enter a valid email address.");
      return;
    }

    const phoneDigits = phone.replace(/\D/g, "");
    if (phoneDigits.length < 8) {
      setError("Please enter a valid phone number including country code, e.g. +65 9123 4567.");
      return;
    }

    try {
      setIsSubmitting(true);
      setError("");

      const response = await fetch("/api/enquiries", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getClientAuthHeaders(),
        },
        body: JSON.stringify({
          username: name.trim(),
          email: email.trim(),
          phone: phone.trim(),
          message: message.trim(),
        }),
      });

      const data = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) {
        throw new Error(data.error || "Failed to submit enquiry");
      }

      setMessage("");
      onSuccess();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Failed to submit enquiry");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={(event) => void handleSubmit(event)} className="space-y-5">
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="mb-2 block text-sm font-semibold text-gray-800">Name</label>
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Your full name"
            className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100"
          />
        </div>
        <div>
          <label className="mb-2 block text-sm font-semibold text-gray-800">Email</label>
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@example.com"
            className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100"
          />
        </div>
      </div>

      <div>
        <label className="mb-2 block text-sm font-semibold text-gray-800">Phone</label>
        <input
          type="tel"
          value={phone}
          onChange={(event) => setPhone(event.target.value)}
          placeholder="+65 9123 4567"
          className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100"
        />
        <p className="mt-1 text-xs text-gray-400">Include country code, e.g. +65 for Singapore</p>
      </div>

      <div>
        <label className="mb-2 block text-sm font-semibold text-gray-800">Message</label>
        <textarea
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          placeholder="Tell the agency what kind of help you need."
          rows={8}
          className="w-full resize-y rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm leading-relaxed text-gray-900 outline-none transition focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100"
        />
      </div>

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {error}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={isSubmitting}
          className="inline-flex items-center gap-2 rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Inbox className="h-4 w-4" />}
          {isSubmitting ? "Sending..." : "Send Enquiry"}
        </button>
        <p className="text-xs text-gray-500">This sends a simple enquiry directly to the agency admin inbox.</p>
      </div>
    </form>
  );
}

const Enquiry = ({ embedded = false }: EnquiryProps) => {
  const [clientUser] = useState<ClientUser | null>(getStoredClient());
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const isLoggedIn = !!getClientToken();

  const selectedTopicData = QUICK_TOPICS.find((t) => t.label === selectedTopic);

  const handleReset = () => {
    setSubmitted(false);
    setSelectedTopic(null);
  };

  return (
    <div className="client-page-theme min-h-screen flex flex-col bg-[#f8faf9]">
      {!embedded && (isLoggedIn ? <ClientPortalNavbar /> : <PublicSiteNavbar />)}

      <main className="flex-1 py-12 md:py-20">
        <div className="w-full max-w-[1380px] mx-auto px-4 sm:px-6 lg:px-10 xl:px-16">
          {submitted ? (
            <div className="max-w-2xl mx-auto">
              <ConfirmationScreen onReset={handleReset} />
            </div>
          ) : (
            <>
              <div className="text-center mb-10 md:mb-14">
                <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-white px-4 py-2 text-[13px] font-semibold text-emerald-700 mb-6 shadow-sm">
                  <Sparkles className="h-3.5 w-3.5 text-emerald-500" />
                  Direct Agency Enquiry
                </div>
                <h1 className="text-4xl sm:text-5xl md:text-6xl font-black tracking-tight text-gray-900 mb-5 leading-[1.08]">
                  Send Your{" "}
                  <span className="text-emerald-600 relative">
                    Enquiry
                    <span className="absolute -bottom-1 left-0 right-0 h-1 bg-emerald-200 rounded-full opacity-60" />
                  </span>
                </h1>
                <p className="text-lg md:text-xl text-gray-500 max-w-2xl mx-auto leading-relaxed">
                  Tell the agency what you need and your enquiry will go straight to the admin inbox for follow-up.
                </p>
              </div>

              <div className="mb-10 grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
                {STEPS.map(({ icon: Icon, label, color, bg, ring }, i) => (
                  <div
                    key={label}
                    className="relative flex flex-col items-center gap-3 rounded-2xl border border-gray-100 bg-white px-4 py-6 text-center shadow-sm hover:shadow-md transition-all duration-200 hover:-translate-y-0.5"
                  >
                    <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${bg} ring-4 ${ring} ${color}`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <span className="text-[13px] font-semibold text-gray-700 leading-snug">{label}</span>
                    <span className="absolute -top-3 -right-3 flex h-7 w-7 items-center justify-center rounded-full bg-gray-900 text-[11px] font-bold text-white shadow-md">
                      {i + 1}
                    </span>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-[340px_1fr] xl:grid-cols-[380px_1fr] gap-6 xl:gap-8 items-start">
                <div className="space-y-4">
                  <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
                    <p className="text-[11px] font-black uppercase tracking-widest text-gray-400 mb-1">
                      Quick topics
                    </p>
                    <p className="text-[12px] text-gray-400 mb-4 leading-relaxed">
                      Pick a topic to auto-fill a message template.
                    </p>
                    <div className="space-y-1.5">
                      {QUICK_TOPICS.map((topic) => (
                        <button
                          key={topic.label}
                          onClick={() => setSelectedTopic(topic.label === selectedTopic ? null : topic.label)}
                          className={`group flex w-full items-center gap-3 rounded-xl border px-3.5 py-3 text-left transition-all duration-150 ${
                            selectedTopic === topic.label
                              ? "border-emerald-300 bg-emerald-50 shadow-sm"
                              : "border-transparent bg-gray-50 hover:border-gray-200 hover:bg-gray-100/60"
                          }`}
                        >
                          <span className="text-lg leading-none w-7 text-center flex-shrink-0">{topic.icon}</span>
                          <div className="min-w-0 flex-1">
                            <p className={`text-[13px] font-semibold leading-tight ${selectedTopic === topic.label ? "text-emerald-900" : "text-gray-800"}`}>
                              {topic.label}
                            </p>
                            <p className={`text-[11px] mt-0.5 truncate ${selectedTopic === topic.label ? "text-emerald-600" : "text-gray-400"}`}>
                              {topic.desc}
                            </p>
                          </div>
                          <ChevronRight
                            className={`h-3.5 w-3.5 flex-shrink-0 transition-transform duration-150 ${
                              selectedTopic === topic.label ? "rotate-90 text-emerald-500" : "text-gray-300 group-hover:text-gray-400"
                            }`}
                          />
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-amber-100 bg-gradient-to-br from-amber-50 to-orange-50/40 p-5">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-amber-100">
                        <Star className="h-3.5 w-3.5 text-amber-600" />
                      </div>
                      <p className="text-[13px] font-bold text-amber-900">Tips for faster matching</p>
                    </div>
                    <ul className="space-y-2.5 text-[13px] text-amber-800 leading-relaxed">
                      {[
                        "Mention your preferred start date",
                        "Specify live-in or live-out",
                        "Include a monthly budget range",
                        "Note special requirements (languages, dietary, etc.)",
                      ].map((tip) => (
                        <li key={tip} className="flex items-start gap-2">
                          <CheckCircle2 className="h-3.5 w-3.5 text-amber-500 flex-shrink-0 mt-0.5" />
                          {tip}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="flex items-start gap-3 rounded-xl border border-indigo-100 bg-indigo-50 px-4 py-4">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-indigo-100">
                      <Phone className="h-4 w-4 text-indigo-600" />
                    </div>
                    <div>
                      <p className="text-[13px] font-bold text-indigo-900">Add your phone number</p>
                      <p className="text-[12px] text-indigo-700 mt-0.5 leading-relaxed">
                        Enquiries with a phone number get a response faster because agencies often call for quick follow-up.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 rounded-xl border border-gray-100 bg-white px-4 py-3.5 shadow-sm">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gray-50">
                      <Clock className="h-4 w-4 text-gray-400" />
                    </div>
                    <div>
                      <p className="text-[13px] font-semibold text-gray-700">Typical response</p>
                      <p className="text-[12px] text-gray-400">Agency replies within 1-2 business hours</p>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-4">
                  {selectedTopic && selectedTopicData && (
                    <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-5 py-4 flex items-start gap-3">
                      <span className="text-2xl leading-none mt-0.5">{selectedTopicData.icon}</span>
                      <div>
                        <p className="text-[14px] font-bold text-emerald-800">
                          Template loaded: {selectedTopicData.label}
                        </p>
                        <p className="text-[13px] text-emerald-700 mt-0.5 leading-relaxed">
                          A message has been pre-filled below. Replace the bracketed parts with your actual details.
                        </p>
                      </div>
                    </div>
                  )}

                  {selectedTopicData && (
                    <div className="rounded-xl border border-indigo-100 bg-indigo-50/60 px-5 py-4 text-[13px] text-indigo-800">
                      <p className="font-bold mb-2">Template preview</p>
                      <pre className="whitespace-pre-wrap rounded-xl bg-white border border-indigo-100/80 p-4 text-[12.5px] text-gray-600 leading-relaxed font-sans shadow-sm">
                        {selectedTopicData.prefill}
                      </pre>
                    </div>
                  )}

                  <div className="rounded-2xl border border-gray-200 bg-white shadow-md overflow-hidden">
                    <div className="bg-gradient-to-r from-emerald-600 to-emerald-500 px-6 py-5">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm">
                          <Bot className="h-5 w-5 text-white" />
                        </div>
                        <div>
                          <h2 className="text-lg font-black text-white tracking-tight">Submit Your Enquiry</h2>
                          <p className="text-[12px] text-emerald-100 mt-0.5">
                            Send a simple enquiry directly to the agency admin team.
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="p-6">
                      <SimpleEnquiryForm
                        initialName={clientUser?.name ?? ""}
                        initialEmail={clientUser?.email ?? ""}
                        initialPhone={clientUser?.phone ?? ""}
                        initialMessage={selectedTopicData?.prefill ?? ""}
                        onSuccess={() => setSubmitted(true)}
                      />
                    </div>
                  </div>

                  <div className="rounded-xl border border-gray-100 bg-white px-5 py-4 text-[13px] text-gray-500 leading-relaxed shadow-sm flex items-start gap-3">
                    <Zap className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
                    <p>
                      <span className="font-semibold text-gray-700">Submission note: </span>
                      This page sends a plain enquiry straight to the agency or admin enquiry inbox for follow-up.
                    </p>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
};

export default Enquiry;
