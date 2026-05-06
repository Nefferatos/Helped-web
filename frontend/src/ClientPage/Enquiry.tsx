import { useState } from "react";
import AiInquiryPanel from "@/components/ai/AiInquiryPanel";
import PublicSiteNavbar from "@/components/PublicSiteNavbar";
import { getStoredClient, getClientToken, type ClientUser } from "@/lib/clientAuth";
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
  {
    label: "Driver",
    icon: "🚗",
    desc: "Daily transport & errands",
    prefill:
      "I need a [full-time / part-time] driver for [daily commute / school runs / errands / airport transfers]. Working hours: [schedule]. Location: [area]. Start date: [date].",
  },
];

const STEPS = [
  { icon: Bot,          label: "AI classifies your request",   color: "text-violet-600" },
  { icon: Users,        label: "Matches found from agencies",  color: "text-emerald-600" },
  { icon: Zap,          label: "Automation pipeline triggered", color: "text-amber-600" },
  { icon: MessageSquare, label: "Agency contacts you",         color: "text-sky-600" },
];

/* ─── Confirmation screen ───────────────────────────────────────────────── */
function ConfirmationScreen({ onReset }: { onReset: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
      {/* Animated checkmark */}
      <div className="relative mb-8">
        <div className="flex h-24 w-24 items-center justify-center rounded-full bg-emerald-100">
          <CheckCircle2 className="h-12 w-12 text-emerald-600 animate-[appear_0.4s_cubic-bezier(0.16,1,0.3,1)_both]" />
        </div>
        <div className="absolute -top-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full bg-amber-400 shadow-md shadow-amber-200">
          <Sparkles className="h-4 w-4 text-white" />
        </div>
      </div>

      <h2 className="text-2xl md:text-3xl font-black text-gray-900 mb-3">
        Enquiry Received! 🎉
      </h2>
      <p className="text-gray-500 max-w-md mb-8 leading-relaxed">
        Your enquiry has been submitted and is being processed by our AI. Matched agencies will reach out to you shortly.
      </p>

      {/* What happens next */}
      <div className="w-full max-w-md rounded-2xl border border-gray-100 bg-white shadow-sm p-5 mb-8 text-left">
        <p className="text-[12px] font-black uppercase tracking-widest text-gray-400 mb-4">
          What happens next
        </p>
        <div className="space-y-3">
          {[
            { icon: Bot,          color: "bg-violet-50 text-violet-600", text: "AI is classifying your request now" },
            { icon: Users,        color: "bg-emerald-50 text-emerald-600", text: "Agency matches being identified" },
            { icon: CalendarClock, color: "bg-amber-50 text-amber-600", text: "Expect a reply within 1–2 business hours" },
            { icon: Inbox,        color: "bg-sky-50 text-sky-600", text: "Check your email & phone for agency contact" },
          ].map(({ icon: Icon, color, text }, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${color}`}>
                <Icon className="h-4 w-4" />
              </div>
              <p className="text-[14px] font-semibold text-gray-700">{text}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Typical response time */}
      <div className="flex items-center gap-2 rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 mb-8">
        <Clock className="h-4 w-4 text-emerald-600 shrink-0" />
        <p className="text-[13px] font-semibold text-emerald-800">
          Typical agency response: <span className="font-black">1–2 business hours</span>
        </p>
      </div>

      <button
        type="button"
        onClick={onReset}
        className="inline-flex items-center gap-2 rounded-2xl border-2 border-gray-200 bg-white px-5 py-3 text-[14px] font-bold text-gray-700 hover:border-indigo-300 hover:text-indigo-700 hover:bg-indigo-50 transition-all"
      >
        <ArrowLeft className="h-4 w-4" />
        Submit another enquiry
      </button>
    </div>
  );
}

/* ─── Main component ───────────────────────────────────────────────────── */
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
    <div className="client-page-theme min-h-screen flex flex-col bg-gradient-to-br from-slate-50 via-white to-emerald-50/30">
      {!embedded && (isLoggedIn ? <ClientPortalNavbar /> : <PublicSiteNavbar />)}

      <main className="flex-1 py-16 md:py-24">
        <div className="container max-w-6xl">

          {submitted ? (
            /* ── Confirmation screen ── */
            <div className="max-w-xl mx-auto">
              <ConfirmationScreen onReset={handleReset} />
            </div>
          ) : (
            <>
              {/* ── Hero ── */}
              <div className="text-center mb-12">
                <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-4 py-1.5 text-sm font-semibold text-emerald-700 mb-5">
                  <Sparkles className="h-3.5 w-3.5" />
                  AI-Powered Matching
                </div>
                <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-gray-900 mb-4">
                  Find Your Perfect{" "}
                  <span className="text-emerald-600">Domestic Helper</span>
                </h1>
                <p className="text-lg text-gray-500 max-w-xl mx-auto leading-relaxed">
                  Describe your needs. Our AI classifies your request, finds matches, and triggers your agency pipeline — all in seconds.
                </p>
              </div>

              {/* ── How it works ── */}
              <div className="mb-10 grid grid-cols-2 md:grid-cols-4 gap-3">
                {STEPS.map(({ icon: Icon, label, color }, i) => (
                  <div
                    key={label}
                    className="relative flex flex-col items-center gap-2.5 rounded-2xl border border-gray-100 bg-white px-4 py-5 text-center shadow-sm"
                  >
                    <div className={`flex h-10 w-10 items-center justify-center rounded-xl bg-gray-50 ${color}`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <span className="text-[13px] font-semibold text-gray-700 leading-snug">{label}</span>
                    <span className="absolute -top-2.5 -right-2.5 flex h-6 w-6 items-center justify-center rounded-full bg-gray-900 text-[11px] font-bold text-white">
                      {i + 1}
                    </span>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">

                {/* ── Left: Quick topic picker + tips ── */}
                <div className="lg:col-span-1 space-y-6">
                  <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
                    <p className="text-[13px] font-bold uppercase tracking-wider text-gray-400 mb-4">
                      Quick topics
                    </p>
                    <p className="text-[12px] text-gray-500 mb-3 leading-relaxed">
                      Pick a topic to auto-fill a message template — edit it to fit your exact needs.
                    </p>
                    <div className="space-y-2">
                      {QUICK_TOPICS.map((topic) => (
                        <button
                          key={topic.label}
                          onClick={() =>
                            setSelectedTopic(topic.label === selectedTopic ? null : topic.label)
                          }
                          className={`group flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left transition-all ${
                            selectedTopic === topic.label
                              ? "border-emerald-300 bg-emerald-50 text-emerald-900"
                              : "border-gray-100 bg-gray-50/50 hover:border-gray-200 hover:bg-gray-50 text-gray-700"
                          }`}
                        >
                          <span className="text-xl leading-none">{topic.icon}</span>
                          <div className="min-w-0 flex-1">
                            <p className={`text-[14px] font-semibold ${selectedTopic === topic.label ? "text-emerald-900" : "text-gray-800"}`}>
                              {topic.label}
                            </p>
                            <p className="text-[12px] text-gray-500 truncate">{topic.desc}</p>
                          </div>
                          <ChevronRight
                            className={`h-4 w-4 flex-shrink-0 transition-transform ${
                              selectedTopic === topic.label
                                ? "rotate-90 text-emerald-600"
                                : "text-gray-300 group-hover:text-gray-400"
                            }`}
                          />
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Tips card */}
                  <div className="rounded-2xl border border-amber-100 bg-amber-50 p-5">
                    <div className="flex items-center gap-2 mb-3">
                      <Star className="h-4 w-4 text-amber-600" />
                      <p className="text-[13px] font-bold text-amber-800">Tips for faster matching</p>
                    </div>
                    <ul className="space-y-2 text-[13px] text-amber-800 leading-relaxed">
                      {[
                        "Mention preferred start date",
                        "Specify live-in or live-out",
                        "Include budget range if you have one",
                        "Note any special requirements (languages, dietary, etc.)",
                      ].map((tip) => (
                        <li key={tip} className="flex items-start gap-2">
                          <CheckCircle2 className="h-3.5 w-3.5 text-amber-600 flex-shrink-0 mt-0.5" />
                          {tip}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Phone nudge */}
                  <div className="flex items-start gap-3 rounded-xl border border-indigo-100 bg-indigo-50 px-4 py-3">
                    <Phone className="h-5 w-5 text-indigo-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-[13px] font-bold text-indigo-800">Add your phone number</p>
                      <p className="text-[12px] text-indigo-700 mt-0.5 leading-relaxed">
                        Enquiries with a phone number get a response <strong>2× faster</strong> — agencies prefer to call for quick matches.
                      </p>
                    </div>
                  </div>

                  {/* Typical response time */}
                  <div className="flex items-center gap-3 rounded-xl border border-gray-100 bg-white px-4 py-3 shadow-sm">
                    <Clock className="h-5 w-5 text-gray-400 flex-shrink-0" />
                    <div>
                      <p className="text-[13px] font-semibold text-gray-700">Typical response</p>
                      <p className="text-[12px] text-gray-500">Agency replies within 1–2 business hours</p>
                    </div>
                  </div>
                </div>

                {/* ── Right: AI Inquiry Panel ── */}
                <div className="lg:col-span-2">
                  {selectedTopic && selectedTopicData && (
                    <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 flex items-start gap-2.5">
                      <span className="text-lg">{selectedTopicData.icon}</span>
                      <div>
                        <p className="text-[13px] font-bold text-emerald-800">
                          Template loaded: {selectedTopicData.label}
                        </p>
                        <p className="text-[12px] text-emerald-700 mt-0.5">
                          A message template has been pre-filled below — replace the <span className="font-bold">[bracketed]</span> parts with your details.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Prefill template hint — shown when a topic is selected */}
                  {selectedTopicData && (
                    <div className="mb-3 rounded-xl border border-indigo-100 bg-indigo-50 px-4 py-3 text-[13px] text-indigo-800">
                      <span className="font-bold">Tip: </span>
                      Copy this template into the message box and replace the{" "}
                      <span className="font-bold">[bracketed]</span> parts:
                      <pre className="mt-2 whitespace-pre-wrap rounded-lg bg-white border border-indigo-100 p-3 text-[12px] text-gray-700 leading-relaxed font-sans">
                        {selectedTopicData.prefill}
                      </pre>
                    </div>
                  )}

                  <AiInquiryPanel
                    title="Submit Your Inquiry"
                    description="Describe your hiring need. The AI will classify it, suggest matches, and trigger your automation pipeline."
                    initialName={clientUser?.name ?? ""}
                    initialContact={clientUser?.email ?? ""}
                    initialMessage={selectedTopicData?.prefill ?? ""}
                    onSuccess={() => setSubmitted(true)}
                  />

                  <div className="mt-4 rounded-xl border border-gray-100 bg-white/80 p-4 text-[13px] text-gray-500 leading-relaxed shadow-sm">
                    <span className="font-semibold text-gray-700">Automation note: </span>
                    Submissions are posted to the AI workflow, then relayed to Make with the{" "}
                    <code className="rounded bg-gray-100 px-1.5 py-0.5 font-mono text-[12px] text-gray-700">
                      inquiry_pipeline
                    </code>{" "}
                    scenario. Include agency-specific notes at the top of your message if needed.
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </main>

      {!embedded && (
        <footer className="bg-gray-900 py-12 text-gray-400">
          <div className="container">
            <div className="mb-8 grid grid-cols-1 gap-8 md:grid-cols-4">
              <div>
                <h4 className="mb-3 font-bold text-white text-base">"Find Maids" At The Agency</h4>
                <p className="text-sm opacity-70 leading-relaxed">Matching trusted domestic professionals with families since 2009.</p>
              </div>
              <div>
                <h5 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-500">Company</h5>
                <ul className="space-y-2 text-sm">
                  <li><a href="#why" className="hover:text-white transition-colors">About Us</a></li>
                  <li><a href="#services" className="hover:text-white transition-colors">Our Services</a></li>
                  <li><a href="#contact" className="hover:text-white transition-colors">Contact</a></li>
                </ul>
              </div>
              <div>
                <h5 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-500">Legal</h5>
                <ul className="space-y-2 text-sm">
                  <li><a href="#contact" className="hover:text-white transition-colors">Legal Information</a></li>
                  <li><a href="#contact" className="hover:text-white transition-colors">Privacy Policy</a></li>
                  <li><a href="#contact" className="hover:text-white transition-colors">Terms of Service</a></li>
                </ul>
              </div>
              <div>
                <h5 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-500">Newsletter</h5>
                <p className="mb-3 text-sm leading-relaxed">Stay updated on care tips, industry news, and agency updates.</p>
                <div className="flex gap-2">
                  <input
                    className="flex-1 rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white placeholder:text-gray-500 focus:border-emerald-500 focus:outline-none"
                    placeholder="Email"
                  />
                  <button className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500 transition-colors">
                    Join
                  </button>
                </div>
              </div>
            </div>
            <div className="border-t border-gray-800 pt-6 text-center text-xs opacity-50">
              Copyright 2026 "Find Maids" At The Agency. All rights reserved.
            </div>
          </div>
        </footer>
      )}
    </div>
  );
};

export default Enquiry;