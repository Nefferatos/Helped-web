import { useState } from "react";
import { AlertCircle, Loader, CheckCircle2, Copy } from "lucide-react";
import { toast } from "@/components/ui/sonner";

interface ExtractedEnquiry {
  employer_summary: string;
  requirements: {
    nationality_preference: string | null;
    live_in_out: string | null;
    budget_band: string | null;
    start_date: string | null;
    household_size: string | null;
    other_notes: string | null;
  };
  urgency: "High" | "Medium" | "Low";
  suggested_tags: string[];
}

export function EnquiryIntakeForm() {
  const [rawText, setRawText] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [extracted, setExtracted] = useState<ExtractedEnquiry | null>(null);
  const [jsonOutput, setJsonOutput] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleExtract = async () => {
    if (!rawText.trim()) {
      toast.error("Please enter enquiry text");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/enquiries/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rawText,
          username: username || "Anonymous",
          email: email || "noemail@example.com",
          phone: phone || "Not provided",
        }),
      });

      if (!response.ok) throw new Error("Extraction failed");

      const data = await response.json();
      setExtracted(data.extracted);
      setJsonOutput(data.json);
      setSubmitted(true);
      toast.success("Enquiry extracted successfully!");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to extract enquiry",
      );
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(jsonOutput);
    toast.success("JSON copied to clipboard!");
  };

  const downloadJSON = () => {
    const element = document.createElement("a");
    element.setAttribute(
      "href",
      "data:text/plain;charset=utf-8," + encodeURIComponent(jsonOutput),
    );
    element.setAttribute("download", `enquiry-${Date.now()}.json`);
    element.style.display = "none";
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
    toast.success("JSON downloaded!");
  };

  const reset = () => {
    setRawText("");
    setUsername("");
    setEmail("");
    setPhone("");
    setExtracted(null);
    setJsonOutput("");
    setSubmitted(false);
  };

  const urgencyColors = {
    High: "text-red-600 bg-red-50 border-red-200",
    Medium: "text-amber-600 bg-amber-50 border-amber-200",
    Low: "text-green-600 bg-green-50 border-green-200",
  };

  return (
    <div className="w-full max-w-6xl mx-auto p-6 space-y-6">
      <div className="bg-white rounded-lg shadow-md border border-gray-200">
        {/* Header */}
        <div className="border-b border-gray-200 p-6">
          <h1 className="text-3xl font-bold text-gray-900">
            Enquiry Intake Assistant
          </h1>
          <p className="text-gray-600 mt-2">
            Helped Maids - Extract and structure employer enquiries into
            standardized JSON format
          </p>
        </div>

        {!submitted ? (
          <div className="p-6 space-y-6">
            {/* Raw Text Input */}
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-gray-900">
                Raw Employer Enquiry *
              </label>
              <p className="text-xs text-gray-500">
                Paste the complete enquiry text from email, form, or any source
              </p>
              <textarea
                value={rawText}
                onChange={(e) => setRawText(e.target.value)}
                placeholder="Paste raw enquiry text here..."
                className="w-full h-32 p-4 border border-gray-300 rounded-lg font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Contact Information */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-900">
                  Name (Optional)
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Employer name"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-900">
                  Email (Optional)
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="email@example.com"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-900">
                  Phone (Optional)
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+65 XXXX XXXX"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Extract Button */}
            <button
              onClick={handleExtract}
              disabled={loading || !rawText.trim()}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold py-3 px-6 rounded-lg flex items-center justify-center gap-2 transition"
            >
              {loading ? (
                <>
                  <Loader className="w-5 h-5 animate-spin" />
                  Extracting...
                </>
              ) : (
                "Extract & Structure"
              )}
            </button>
          </div>
        ) : extracted ? (
          <div className="p-6 space-y-6">
            {/* Success Banner */}
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex gap-3">
              <CheckCircle2 className="w-6 h-6 text-green-600 flex-shrink-0" />
              <div>
                <p className="font-semibold text-green-900">
                  Extraction Successful
                </p>
                <p className="text-sm text-green-800">
                  Your enquiry has been structured and is ready to download.
                </p>
              </div>
            </div>

            {/* Extracted Summary */}
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-4">
              <h3 className="font-bold text-lg text-gray-900">
                Extracted Summary
              </h3>
              <p className="text-gray-700">{extracted.employer_summary}</p>
            </div>

            {/* Requirements */}
            <div className="space-y-3">
              <h3 className="font-bold text-lg text-gray-900">
                Structured Requirements
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  {
                    label: "Nationality Preference",
                    value: extracted.requirements.nationality_preference,
                  },
                  {
                    label: "Live-in / Live-out",
                    value: extracted.requirements.live_in_out,
                  },
                  {
                    label: "Budget Band",
                    value: extracted.requirements.budget_band,
                  },
                  {
                    label: "Start Date",
                    value: extracted.requirements.start_date,
                  },
                  {
                    label: "Household Size",
                    value: extracted.requirements.household_size,
                  },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="bg-white border border-gray-200 rounded-lg p-3"
                  >
                    <p className="text-xs font-semibold text-gray-600 uppercase">
                      {item.label}
                    </p>
                    <p className="text-sm text-gray-900 font-medium mt-1">
                      {item.value || "Not specified"}
                    </p>
                  </div>
                ))}
              </div>

              {extracted.requirements.other_notes && (
                <div className="bg-white border border-gray-200 rounded-lg p-4">
                  <p className="text-xs font-semibold text-gray-600 uppercase mb-2">
                    Additional Notes
                  </p>
                  <p className="text-sm text-gray-700">
                    {extracted.requirements.other_notes}
                  </p>
                </div>
              )}
            </div>

            {/* Urgency & Tags */}
            <div className="grid grid-cols-2 gap-4">
              <div
                className={`border-2 rounded-lg p-4 ${urgencyColors[extracted.urgency]}`}
              >
                <p className="text-xs font-semibold uppercase mb-1">Urgency</p>
                <p className="text-lg font-bold">{extracted.urgency}</p>
              </div>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-xs font-semibold text-blue-600 uppercase mb-2">
                  Suggested Tags
                </p>
                <div className="flex flex-wrap gap-2">
                  {extracted.suggested_tags.map((tag) => (
                    <span
                      key={tag}
                      className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs font-medium"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* JSON Output */}
            <div className="space-y-2">
              <h3 className="font-bold text-lg text-gray-900">
                Minified JSON Output
              </h3>
              <div className="bg-gray-900 text-gray-100 rounded-lg p-4 font-mono text-sm overflow-x-auto">
                <pre>{jsonOutput}</pre>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 flex-wrap">
              <button
                onClick={copyToClipboard}
                className="flex items-center gap-2 bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg font-medium transition"
              >
                <Copy className="w-4 h-4" />
                Copy JSON
              </button>
              <button
                onClick={downloadJSON}
                className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition"
              >
                Download JSON
              </button>
              <button
                onClick={reset}
                className="flex items-center gap-2 bg-gray-300 hover:bg-gray-400 text-gray-900 px-4 py-2 rounded-lg font-medium transition"
              >
                Process New Enquiry
              </button>
            </div>
          </div>
        ) : null}
      </div>

      {/* Documentation */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <div className="flex gap-3">
          <AlertCircle className="w-6 h-6 text-blue-600 flex-shrink-0" />
          <div className="space-y-2">
            <h4 className="font-bold text-blue-900">API Integration</h4>
            <p className="text-sm text-blue-800">
              Use{" "}
              <code className="bg-blue-100 px-2 py-1 rounded">
                POST /api/enquiries/extract
              </code>{" "}
              to programmatically extract enquiries
            </p>
            <p className="text-xs text-blue-700 mt-2">
              Request body:{" "}
              <code className="bg-blue-100 px-1">
                {
                  '{ "rawText": string, "email"?: string, "phone"?: string, "username"?: string }'
                }
              </code>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
