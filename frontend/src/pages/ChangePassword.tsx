import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/sonner";
import {
  KeyRound,
  RefreshCw,
  ShieldCheck,
  Eye,
  EyeOff,
  Lock,
  CheckCircle2,
  XCircle,
  Info,
} from "lucide-react";

interface FormState {
  current: string;
  newPw: string;
  confirm: string;
  captcha: string;
}

const CAPTCHA_CODE = "5533";

const fields: {
  label: string;
  key: keyof Omit<FormState, "captcha">;
  placeholder: string;
}[] = [
  { label: "Current Password", key: "current", placeholder: "Enter your current password" },
  { label: "New Password", key: "newPw", placeholder: "Enter your new password" },
  { label: "Confirm New Password", key: "confirm", placeholder: "Re-enter your new password" },
];

// Password strength checker
function getStrength(pw: string): { score: number; label: string; color: string } {
  if (!pw) return { score: 0, label: "", color: "" };
  let score = 0;
  if (pw.length >= 8) score++;
  if (pw.length >= 12) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  if (score <= 1) return { score, label: "Weak", color: "#EF4444" };
  if (score <= 2) return { score, label: "Fair", color: "#F59E0B" };
  if (score <= 3) return { score, label: "Good", color: "#3B82F6" };
  return { score, label: "Strong", color: "#0D6E56" };
}

const ChangePassword = () => {
  const [form, setForm] = useState<FormState>({ current: "", newPw: "", confirm: "", captcha: "" });
  const [showFields, setShowFields] = useState<Record<string, boolean>>({});
  const [submitted, setSubmitted] = useState(false);

  const toggleShow = (key: string) =>
    setShowFields((prev) => ({ ...prev, [key]: !prev[key] }));

  const strength = getStrength(form.newPw);
  const passwordsMatch = form.newPw && form.confirm && form.newPw === form.confirm;
  const passwordsMismatch = form.newPw && form.confirm && form.newPw !== form.confirm;

  const handleSubmit = () => {
    if (!form.current) { toast.error("Please enter your current password."); return; }
    if (!form.newPw || !form.confirm) { toast.error("Please enter and confirm your new password."); return; }
    if (form.newPw !== form.confirm) { toast.error("New passwords do not match."); return; }
    if (form.newPw.length < 6) { toast.error("New password must be at least 6 characters."); return; }
    if (form.captcha !== CAPTCHA_CODE) { toast.error("Invalid security code. Please try again."); return; }
    setSubmitted(true);
    toast.success("Password changed successfully.");
    setTimeout(() => {
      setForm({ current: "", newPw: "", confirm: "", captcha: "" });
      setSubmitted(false);
    }, 2000);
  };

  const handleReset = () => {
    setForm({ current: "", newPw: "", confirm: "", captcha: "" });
    setSubmitted(false);
  };

  return (
    <div className="flex items-start justify-center pt-4 pb-8 px-4">
      <div className="w-full max-w-lg">

        {/* ── Page heading ── */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-1">
            <div
              className="flex items-center justify-center rounded-lg"
              style={{ width: 28, height: 28, background: "rgba(13,110,86,0.10)" }}
            >
              <Lock style={{ width: 13, height: 13, color: "#0D6E56" }} />
            </div>
            <h2
              className="font-bold tracking-tight text-gray-900"
              style={{ fontSize: 20, letterSpacing: "-0.4px" }}
            >
              Password Management
            </h2>
          </div>
          <p className="text-gray-400 ml-9" style={{ fontSize: 12.5 }}>
            Keep your account secure by using a strong, unique password.
          </p>
        </div>

        {/* ── Main card ── */}
        <div
          className="overflow-hidden bg-white"
          style={{
            borderRadius: 16,
            border: "1px solid #E5EAF0",
            boxShadow: "0 2px 16px rgba(0,0,0,0.07), 0 1px 3px rgba(0,0,0,0.04)",
          }}
        >

          {/* Card header */}
          <div
            style={{
              background: "linear-gradient(135deg, #0D6E56 0%, #0f8567 100%)",
              padding: "18px 22px",
              display: "flex",
              alignItems: "center",
              gap: 14,
              position: "relative",
              overflow: "hidden",
            }}
          >
            {/* Decorative rings */}
            <div style={{
              position: "absolute", right: -24, top: -24,
              width: 100, height: 100, borderRadius: "50%",
              border: "1px solid rgba(255,255,255,0.12)",
            }} />
            <div style={{
              position: "absolute", right: 8, top: -48,
              width: 130, height: 130, borderRadius: "50%",
              border: "1px solid rgba(255,255,255,0.07)",
            }} />

            <div
              style={{
                width: 42, height: 42, borderRadius: 12,
                background: "rgba(255,255,255,0.18)",
                backdropFilter: "blur(4px)",
                display: "flex", alignItems: "center", justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <Lock style={{ width: 18, height: 18, color: "#fff" }} />
            </div>
            <div>
              <p style={{ fontSize: 15, fontWeight: 700, color: "#fff", letterSpacing: "-0.2px" }}>
                Change Password
              </p>
              <p style={{ fontSize: 11.5, color: "rgba(255,255,255,0.65)", marginTop: 2 }}>
                All fields are required to proceed
              </p>
            </div>
          </div>

          {/* Card body */}
          <div style={{ padding: "22px 22px 0" }}>

            {/* Security tip banner */}
            <div
              style={{
                display: "flex", gap: 10, alignItems: "flex-start",
                background: "linear-gradient(135deg, #E8F5EF, #F0FAF5)",
                border: "1px solid rgba(13,110,86,0.18)",
                borderRadius: 10, padding: "11px 14px", marginBottom: 20,
              }}
            >
              <ShieldCheck style={{ width: 15, height: 15, color: "#0D6E56", flexShrink: 0, marginTop: 1 }} />
              <p style={{ fontSize: 12, color: "#374151", lineHeight: 1.55 }}>
                Enter your current password, then choose a new one. Both new password fields must match exactly before saving.
              </p>
            </div>

            {/* Password fields */}
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {fields.map(({ label, key, placeholder }) => {
                const isConfirm = key === "confirm";
                const isNew = key === "newPw";
                const inputBorder = isConfirm && passwordsMismatch
                  ? "1.5px solid #FCA5A5"
                  : isConfirm && passwordsMatch
                  ? "1.5px solid #6EE7B7"
                  : "1.5px solid #E5EAF0";
                const inputBg = isConfirm && passwordsMismatch
                  ? "#FFF5F5"
                  : isConfirm && passwordsMatch
                  ? "#F0FAF5"
                  : "#FAFBFC";

                return (
                  <div key={key}>
                    <Label
                      style={{ fontSize: 12, fontWeight: 600, color: "#374151", marginBottom: 6, display: "block" }}
                    >
                      {label}
                    </Label>
                    <div style={{ position: "relative" }}>
                      <Input
                        type={showFields[key] ? "text" : "password"}
                        value={form[key]}
                        placeholder={placeholder}
                        onChange={(e) => setForm((prev) => ({ ...prev, [key]: e.target.value }))}
                        style={{
                          height: 40,
                          borderRadius: 10,
                          border: inputBorder,
                          background: inputBg,
                          fontSize: 13,
                          paddingRight: 38,
                          paddingLeft: 12,
                          outline: "none",
                          transition: "border-color .15s, box-shadow .15s",
                          boxShadow: "none",
                          width: "100%",
                        }}
                        className="focus-visible:ring-0 focus-visible:ring-offset-0 focus:border-[#0D6E56] focus:shadow-[0_0_0_3px_rgba(13,110,86,0.12)]"
                      />
                      {/* Eye toggle */}
                      <button
                        type="button"
                        tabIndex={-1}
                        onClick={() => toggleShow(key)}
                        style={{
                          position: "absolute", right: 10, top: "50%",
                          transform: "translateY(-50%)",
                          background: "none", border: "none", cursor: "pointer",
                          color: "#9CA3AF", padding: 2, display: "flex",
                        }}
                      >
                        {showFields[key]
                          ? <EyeOff style={{ width: 14, height: 14 }} />
                          : <Eye style={{ width: 14, height: 14 }} />
                        }
                      </button>
                      {/* Match/mismatch icon */}
                      {isConfirm && (passwordsMatch || passwordsMismatch) && (
                        <div style={{ position: "absolute", right: 32, top: "50%", transform: "translateY(-50%)" }}>
                          {passwordsMatch
                            ? <CheckCircle2 style={{ width: 14, height: 14, color: "#0D6E56" }} />
                            : <XCircle style={{ width: 14, height: 14, color: "#EF4444" }} />
                          }
                        </div>
                      )}
                    </div>

                    {/* Inline hints */}
                    {isConfirm && passwordsMismatch && (
                      <p style={{ fontSize: 11, color: "#EF4444", marginTop: 5, display: "flex", alignItems: "center", gap: 4 }}>
                        <XCircle style={{ width: 11, height: 11 }} /> Passwords do not match
                      </p>
                    )}
                    {isConfirm && passwordsMatch && (
                      <p style={{ fontSize: 11, color: "#0D6E56", marginTop: 5, display: "flex", alignItems: "center", gap: 4 }}>
                        <CheckCircle2 style={{ width: 11, height: 11 }} /> Passwords match
                      </p>
                    )}

                    {/* Strength meter for new password */}
                    {isNew && form.newPw && (
                      <div style={{ marginTop: 7 }}>
                        <div style={{ display: "flex", gap: 4, marginBottom: 4 }}>
                          {[1, 2, 3, 4].map((i) => (
                            <div
                              key={i}
                              style={{
                                flex: 1, height: 3, borderRadius: 4,
                                background: i <= strength.score
                                  ? strength.color
                                  : "#E5EAF0",
                                transition: "background .25s",
                              }}
                            />
                          ))}
                        </div>
                        <p style={{ fontSize: 11, color: strength.color, fontWeight: 600 }}>
                          {strength.label} password
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Divider */}
            <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "20px 0 16px" }}>
              <div style={{ flex: 1, height: 1, background: "#F1F3F6" }} />
              <span style={{
                fontSize: 9.5, fontWeight: 700, letterSpacing: "0.09em",
                color: "#CBD5E1", textTransform: "uppercase",
              }}>Security Verification</span>
              <div style={{ flex: 1, height: 1, background: "#F1F3F6" }} />
            </div>

            {/* CAPTCHA */}
            <div style={{ marginBottom: 22 }}>
              <Label style={{ fontSize: 12, fontWeight: 600, color: "#374151", marginBottom: 6, display: "block" }}>
                Security Code
              </Label>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <Input
                  type="text"
                  value={form.captcha}
                  placeholder="Enter code"
                  maxLength={6}
                  onChange={(e) => setForm((prev) => ({ ...prev, captcha: e.target.value }))}
                  style={{
                    height: 40, width: 120, borderRadius: 10,
                    border: "1.5px solid #E5EAF0", background: "#FAFBFC",
                    fontSize: 14, fontWeight: 600, letterSpacing: 3,
                    paddingLeft: 12, outline: "none",
                  }}
                  className="focus-visible:ring-0 focus:border-[#0D6E56] focus:shadow-[0_0_0_3px_rgba(13,110,86,0.12)]"
                />

                {/* CAPTCHA display */}
                <div
                  style={{
                    height: 40, borderRadius: 10, paddingInline: 18,
                    background: "linear-gradient(135deg, #0D6E56, #0f8567)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    userSelect: "none", position: "relative", overflow: "hidden",
                    boxShadow: "0 2px 8px rgba(13,110,86,0.3)",
                  }}
                >
                  {/* Noise overlay */}
                  <div style={{
                    position: "absolute", inset: 0,
                    backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 100 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.08'/%3E%3C/svg%3E\")",
                    opacity: 0.3,
                  }} />
                  <span
                    style={{
                      fontFamily: "'Courier New', monospace",
                      fontSize: 17, fontWeight: 800,
                      letterSpacing: 7, color: "#fff",
                      fontStyle: "italic", position: "relative",
                      textShadow: "0 1px 3px rgba(0,0,0,0.2)",
                    }}
                  >
                    {CAPTCHA_CODE}
                  </span>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                  <Info style={{ width: 12, height: 12, color: "#CBD5E1" }} />
                  <span style={{ fontSize: 11, color: "#9CA3AF" }}>enter this code</span>
                </div>
              </div>
            </div>
          </div>

          {/* Card footer */}
          <div
            style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "14px 22px",
              borderTop: "1px solid #F1F3F6",
              background: "#FAFBFC",
            }}
          >
            {/* Left hint */}
            <p style={{ fontSize: 11, color: "#CBD5E1" }}>
              Min. 6 characters required
            </p>

            <div style={{ display: "flex", gap: 8 }}>
              <Button
                onClick={handleReset}
                variant="outline"
                style={{
                  height: 36, paddingInline: 16, borderRadius: 9,
                  border: "1.5px solid #E5EAF0", background: "#fff",
                  fontSize: 12.5, fontWeight: 600, color: "#6B7280",
                  display: "flex", alignItems: "center", gap: 6,
                }}
                className="hover:bg-gray-50 hover:border-gray-300"
              >
                <RefreshCw style={{ width: 12, height: 12 }} />
                Reset
              </Button>

              <Button
                onClick={handleSubmit}
                disabled={submitted}
                style={{
                  height: 36, paddingInline: 18, borderRadius: 9,
                  background: submitted ? "#6EE7B7" : "linear-gradient(135deg, #0D6E56, #0f8567)",
                  fontSize: 12.5, fontWeight: 700, color: "#fff",
                  display: "flex", alignItems: "center", gap: 6,
                  border: "none",
                  boxShadow: submitted ? "none" : "0 2px 8px rgba(13,110,86,0.35)",
                  transition: "all .2s",
                  letterSpacing: "0.01em",
                }}
                className="active:scale-[0.97]"
              >
                {submitted
                  ? <><CheckCircle2 style={{ width: 13, height: 13 }} /> Updated!</>
                  : <><KeyRound style={{ width: 13, height: 13 }} /> Update Password</>
                }
              </Button>
            </div>
          </div>
        </div>

        {/* Bottom note */}
        <p style={{ marginTop: 14, textAlign: "center", fontSize: 11.5, color: "#94A3B8" }}>
          Forgotten your password?{" "}
          <span style={{ color: "#0D6E56", fontWeight: 600, cursor: "pointer" }}>
            Contact your system administrator.
          </span>
        </p>

      </div>
    </div>
  );
};

export default ChangePassword;