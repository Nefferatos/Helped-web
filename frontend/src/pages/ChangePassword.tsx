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

function getStrength(pw: string): { score: number; label: string; color: string } {
  if (!pw) return { score: 0, label: "", color: "" };
  let score = 0;
  if (pw.length >= 8) score++;
  if (pw.length >= 12) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  if (score <= 1) return { score, label: "Weak", color: "#EF4444" };
  if (score <= 2) return { score, label: "Fair", color: "#D97706" };
  if (score <= 3) return { score, label: "Good", color: "#2563EB" };
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
              style={{ width: 34, height: 34, background: "rgba(13,110,86,0.10)" }}
            >
              <Lock style={{ width: 17, height: 17, color: "#0D6E56" }} />
            </div>
            <h2
              className="font-extrabold tracking-tight"
              style={{ fontSize: 26, letterSpacing: "-0.4px", color: "#000000" }}
            >
              Password Management
            </h2>
          </div>
          <p className="ml-11" style={{ fontSize: 15, color: "#1a1a1a", fontWeight: 600 }}>
            Keep your account secure by using a strong, unique password.
          </p>
        </div>

        {/* ── Main card ── */}
        <div
          className="overflow-hidden bg-white"
          style={{
            borderRadius: 16,
            border: "1px solid #D1D9E0",
            boxShadow: "0 2px 16px rgba(0,0,0,0.09), 0 1px 3px rgba(0,0,0,0.05)",
          }}
        >

          {/* Card header */}
          <div
            style={{
              background: "linear-gradient(135deg, #0D6E56 0%, #0f8567 100%)",
              padding: "20px 24px",
              display: "flex",
              alignItems: "center",
              gap: 14,
              position: "relative",
              overflow: "hidden",
            }}
          >
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
                width: 48, height: 48, borderRadius: 12,
                background: "rgba(255,255,255,0.18)",
                display: "flex", alignItems: "center", justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <Lock style={{ width: 22, height: 22, color: "#fff" }} />
            </div>
            <div>
              <p style={{ fontSize: 19, fontWeight: 800, color: "#fff", letterSpacing: "-0.2px" }}>
                Change Password
              </p>
              <p style={{ fontSize: 14, color: "rgba(255,255,255,0.85)", marginTop: 3, fontWeight: 600 }}>
                All fields are required to proceed
              </p>
            </div>
          </div>

          {/* Card body */}
          <div style={{ padding: "24px 24px 0" }}>

            {/* Security tip banner */}
            <div
              style={{
                display: "flex", gap: 10, alignItems: "flex-start",
                background: "#E8F5EF",
                border: "1px solid rgba(13,110,86,0.25)",
                borderRadius: 10, padding: "13px 16px", marginBottom: 22,
              }}
            >
              <ShieldCheck style={{ width: 18, height: 18, color: "#0D6E56", flexShrink: 0, marginTop: 1 }} />
              <p style={{ fontSize: 14, color: "#000000", lineHeight: 1.6, fontWeight: 600 }}>
                Enter your current password, then choose a new one. Both new password fields must match exactly before saving.
              </p>
            </div>

            {/* Password fields */}
            <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
              {fields.map(({ label, key, placeholder }) => {
                const isConfirm = key === "confirm";
                const isNew = key === "newPw";
                const inputBorder = isConfirm && passwordsMismatch
                  ? "2px solid #FCA5A5"
                  : isConfirm && passwordsMatch
                  ? "2px solid #6EE7B7"
                  : "2px solid #D1D9E0";
                const inputBg = isConfirm && passwordsMismatch
                  ? "#FFF5F5"
                  : isConfirm && passwordsMatch
                  ? "#F0FAF5"
                  : "#FAFBFC";

                return (
                  <div key={key}>
                    <Label
                      style={{
                        fontSize: 15,
                        fontWeight: 800,
                        color: "#000000",
                        marginBottom: 7,
                        display: "block",
                        letterSpacing: "-0.1px",
                      }}
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
                          height: 48,
                          borderRadius: 10,
                          border: inputBorder,
                          background: inputBg,
                          fontSize: 16,
                          fontWeight: 600,
                          color: "#000000",
                          paddingRight: 44,
                          paddingLeft: 14,
                          outline: "none",
                          transition: "border-color .15s, box-shadow .15s",
                          boxShadow: "none",
                          width: "100%",
                        }}
                        className="focus-visible:ring-0 focus-visible:ring-offset-0 focus:border-[#0D6E56] focus:shadow-[0_0_0_3px_rgba(13,110,86,0.14)]"
                      />
                      {/* Eye toggle */}
                      <button
                        type="button"
                        tabIndex={-1}
                        onClick={() => toggleShow(key)}
                        style={{
                          position: "absolute", right: 12, top: "50%",
                          transform: "translateY(-50%)",
                          background: "none", border: "none", cursor: "pointer",
                          color: "#4B5563", padding: 2, display: "flex",
                        }}
                      >
                        {showFields[key]
                          ? <EyeOff style={{ width: 18, height: 18 }} />
                          : <Eye style={{ width: 18, height: 18 }} />
                        }
                      </button>
                      {/* Match/mismatch icon */}
                      {isConfirm && (passwordsMatch || passwordsMismatch) && (
                        <div style={{ position: "absolute", right: 38, top: "50%", transform: "translateY(-50%)" }}>
                          {passwordsMatch
                            ? <CheckCircle2 style={{ width: 18, height: 18, color: "#0D6E56" }} />
                            : <XCircle style={{ width: 18, height: 18, color: "#EF4444" }} />
                          }
                        </div>
                      )}
                    </div>

                    {/* Inline hints */}
                    {isConfirm && passwordsMismatch && (
                      <p style={{ fontSize: 13, color: "#B91C1C", marginTop: 6, fontWeight: 700, display: "flex", alignItems: "center", gap: 5 }}>
                        <XCircle style={{ width: 14, height: 14 }} /> Passwords do not match
                      </p>
                    )}
                    {isConfirm && passwordsMatch && (
                      <p style={{ fontSize: 13, color: "#0D6E56", marginTop: 6, fontWeight: 700, display: "flex", alignItems: "center", gap: 5 }}>
                        <CheckCircle2 style={{ width: 14, height: 14 }} /> Passwords match
                      </p>
                    )}

                    {/* Strength meter */}
                    {isNew && form.newPw && (
                      <div style={{ marginTop: 8 }}>
                        <div style={{ display: "flex", gap: 5, marginBottom: 5 }}>
                          {[1, 2, 3, 4].map((i) => (
                            <div
                              key={i}
                              style={{
                                flex: 1, height: 5, borderRadius: 4,
                                background: i <= strength.score ? strength.color : "#E5EAF0",
                                transition: "background .25s",
                              }}
                            />
                          ))}
                        </div>
                        <p style={{ fontSize: 13, color: strength.color, fontWeight: 800 }}>
                          {strength.label} password
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Divider */}
            <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "22px 0 18px" }}>
              <div style={{ flex: 1, height: 1, background: "#E5EAF0" }} />
              <span style={{
                fontSize: 11, fontWeight: 800, letterSpacing: "0.09em",
                color: "#94A3B8", textTransform: "uppercase",
              }}>Security Verification</span>
              <div style={{ flex: 1, height: 1, background: "#E5EAF0" }} />
            </div>

            {/* CAPTCHA */}
            <div style={{ marginBottom: 24 }}>
              <Label style={{ fontSize: 15, fontWeight: 800, color: "#000000", marginBottom: 7, display: "block" }}>
                Security Code
              </Label>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <Input
                  type="text"
                  value={form.captcha}
                  placeholder="Enter code"
                  maxLength={6}
                  onChange={(e) => setForm((prev) => ({ ...prev, captcha: e.target.value }))}
                  style={{
                    height: 48, width: 130, borderRadius: 10,
                    border: "2px solid #D1D9E0", background: "#FAFBFC",
                    fontSize: 18, fontWeight: 800, color: "#000000",
                    letterSpacing: 5,
                    paddingLeft: 14, outline: "none",
                  }}
                  className="focus-visible:ring-0 focus:border-[#0D6E56] focus:shadow-[0_0_0_3px_rgba(13,110,86,0.14)]"
                />

                {/* CAPTCHA display */}
                <div
                  style={{
                    height: 48, borderRadius: 10, paddingInline: 20,
                    background: "linear-gradient(135deg, #0D6E56, #0f8567)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    userSelect: "none", position: "relative", overflow: "hidden",
                    boxShadow: "0 2px 8px rgba(13,110,86,0.3)",
                  }}
                >
                  <div style={{
                    position: "absolute", inset: 0,
                    backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 100 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.08'/%3E%3C/svg%3E\")",
                    opacity: 0.3,
                  }} />
                  <span
                    style={{
                      fontFamily: "'Courier New', monospace",
                      fontSize: 22, fontWeight: 900,
                      letterSpacing: 9, color: "#fff",
                      fontStyle: "italic", position: "relative",
                      textShadow: "0 1px 3px rgba(0,0,0,0.25)",
                    }}
                  >
                    {CAPTCHA_CODE}
                  </span>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <Info style={{ width: 15, height: 15, color: "#64748B" }} />
                  <span style={{ fontSize: 13, color: "#000000", fontWeight: 700 }}>enter this code</span>
                </div>
              </div>
            </div>
          </div>

          {/* Card footer */}
          <div
            style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "16px 24px",
              borderTop: "1px solid #E5EAF0",
              background: "#F8FAFB",
            }}
          >
            <p style={{ fontSize: 13, color: "#000000", fontWeight: 700 }}>
              Minimum 6 characters required
            </p>

            <div style={{ display: "flex", gap: 10 }}>
              <Button
                onClick={handleReset}
                variant="outline"
                style={{
                  height: 44, paddingInline: 20, borderRadius: 10,
                  border: "2px solid #D1D9E0", background: "#fff",
                  fontSize: 14, fontWeight: 800, color: "#000000",
                  display: "flex", alignItems: "center", gap: 7,
                }}
                className="hover:bg-gray-50 hover:border-gray-400"
              >
                <RefreshCw style={{ width: 15, height: 15 }} />
                Reset
              </Button>

              <Button
                onClick={handleSubmit}
                disabled={submitted}
                style={{
                  height: 44, paddingInline: 22, borderRadius: 10,
                  background: submitted ? "#6EE7B7" : "linear-gradient(135deg, #0D6E56, #0f8567)",
                  fontSize: 14, fontWeight: 800, color: "#fff",
                  display: "flex", alignItems: "center", gap: 7,
                  border: "none",
                  boxShadow: submitted ? "none" : "0 2px 10px rgba(13,110,86,0.4)",
                  transition: "all .2s",
                  letterSpacing: "0.01em",
                }}
                className="active:scale-[0.97]"
              >
                {submitted
                  ? <><CheckCircle2 style={{ width: 16, height: 16 }} /> Updated!</>
                  : <><KeyRound style={{ width: 16, height: 16 }} /> Update Password</>
                }
              </Button>
            </div>
          </div>
        </div>

        {/* Bottom note */}
        <p style={{ marginTop: 16, textAlign: "center", fontSize: 14, color: "#000000", fontWeight: 600 }}>
          Forgotten your password?{" "}
          <span style={{ color: "#0D6E56", fontWeight: 800, cursor: "pointer" }}>
            Contact your system administrator.
          </span>
        </p>

      </div>
    </div>
  );
};

export default ChangePassword;