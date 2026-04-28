import { useEffect, useState } from "react";
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

/* ─── Responsive hook ───────────────────────────────────────────────────── */
const useWindowWidth = () => {
  const [w, setW] = useState(typeof window !== "undefined" ? window.innerWidth : 1280);
  useEffect(() => {
    const h = () => setW(window.innerWidth);
    window.addEventListener("resize", h);
    return () => window.removeEventListener("resize", h);
  }, []);
  return w;
};

const ChangePassword = () => {
  const [form, setForm] = useState<FormState>({ current: "", newPw: "", confirm: "", captcha: "" });
  const [showFields, setShowFields] = useState<Record<string, boolean>>({});
  const [submitted, setSubmitted] = useState(false);

  const width = useWindowWidth();
  const isSm = width < 640;

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

  /* ── dynamic sizes ── */
  const cardPadX = isSm ? 14 : 24;
  const headerPadX = isSm ? 16 : 24;

  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "center",
        paddingTop: isSm ? 12 : 16,
        paddingBottom: isSm ? 24 : 32,
        paddingLeft: isSm ? 10 : 16,
        paddingRight: isSm ? 10 : 16,
        boxSizing: "border-box",
        width: "100%",
      }}
    >
      <div style={{ width: "100%", maxWidth: 520 }}>

        {/* ── Page heading ── */}
        <div style={{ marginBottom: isSm ? 16 : 24 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
            <div
              style={{
                width: isSm ? 30 : 34, height: isSm ? 30 : 34,
                borderRadius: 9, flexShrink: 0,
                background: "rgba(13,110,86,0.10)",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}
            >
              <Lock style={{ width: isSm ? 15 : 17, height: isSm ? 15 : 17, color: "#0D6E56" }} />
            </div>
            <h2
              style={{
                fontSize: isSm ? 20 : 26,
                fontWeight: 900,
                letterSpacing: "-0.4px",
                color: "#000000",
                margin: 0,
                lineHeight: 1.15,
              }}
            >
              Password Management
            </h2>
          </div>
          <p
            style={{
              fontSize: isSm ? 13 : 15,
              color: "#1a1a1a",
              fontWeight: 600,
              margin: 0,
              // On mobile, don't indent — just align flush
              marginLeft: isSm ? 0 : 44,
            }}
          >
            Keep your account secure by using a strong, unique password.
          </p>
        </div>

        {/* ── Main card ── */}
        <div
          style={{
            overflow: "hidden",
            background: "#fff",
            borderRadius: isSm ? 14 : 16,
            border: "1px solid #D1D9E0",
            boxShadow: "0 2px 16px rgba(0,0,0,0.09), 0 1px 3px rgba(0,0,0,0.05)",
          }}
        >

          {/* Card header */}
          <div
            style={{
              background: "linear-gradient(135deg, #0D6E56 0%, #0f8567 100%)",
              padding: isSm ? `16px ${headerPadX}px` : `20px ${headerPadX}px`,
              display: "flex",
              alignItems: "center",
              gap: isSm ? 10 : 14,
              position: "relative",
              overflow: "hidden",
            }}
          >
            <div style={{ position: "absolute", right: -24, top: -24, width: 100, height: 100, borderRadius: "50%", border: "1px solid rgba(255,255,255,0.12)" }} />
            <div style={{ position: "absolute", right: 8, top: -48, width: 130, height: 130, borderRadius: "50%", border: "1px solid rgba(255,255,255,0.07)" }} />

            <div
              style={{
                width: isSm ? 40 : 48, height: isSm ? 40 : 48,
                borderRadius: 12,
                background: "rgba(255,255,255,0.18)",
                display: "flex", alignItems: "center", justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <Lock style={{ width: isSm ? 18 : 22, height: isSm ? 18 : 22, color: "#fff" }} />
            </div>
            <div>
              <p style={{ fontSize: isSm ? 16 : 19, fontWeight: 800, color: "#fff", letterSpacing: "-0.2px", margin: 0 }}>
                Change Password
              </p>
              <p style={{ fontSize: isSm ? 12 : 14, color: "rgba(255,255,255,0.85)", marginTop: 2, fontWeight: 600 }}>
                All fields are required to proceed
              </p>
            </div>
          </div>

          {/* Card body */}
          <div style={{ padding: `${isSm ? 16 : 24}px ${cardPadX}px 0` }}>

            {/* Security tip banner */}
            <div
              style={{
                display: "flex", gap: 10, alignItems: "flex-start",
                background: "#E8F5EF",
                border: "1px solid rgba(13,110,86,0.25)",
                borderRadius: 10,
                padding: isSm ? "10px 12px" : "13px 16px",
                marginBottom: isSm ? 16 : 22,
              }}
            >
              <ShieldCheck style={{ width: 17, height: 17, color: "#0D6E56", flexShrink: 0, marginTop: 1 }} />
              <p style={{ fontSize: isSm ? 12 : 14, color: "#000000", lineHeight: 1.55, fontWeight: 600, margin: 0 }}>
                Enter your current password, then choose a new one. Both new password fields must match exactly before saving.
              </p>
            </div>

            {/* Password fields */}
            <div style={{ display: "flex", flexDirection: "column", gap: isSm ? 14 : 18 }}>
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
                        fontSize: isSm ? 13 : 15,
                        fontWeight: 800,
                        color: "#000000",
                        marginBottom: 6,
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
                          height: isSm ? 44 : 48,
                          borderRadius: 10,
                          border: inputBorder,
                          background: inputBg,
                          fontSize: isSm ? 15 : 16,
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
                      <p style={{ fontSize: 12, color: "#B91C1C", marginTop: 5, fontWeight: 700, display: "flex", alignItems: "center", gap: 5 }}>
                        <XCircle style={{ width: 13, height: 13 }} /> Passwords do not match
                      </p>
                    )}
                    {isConfirm && passwordsMatch && (
                      <p style={{ fontSize: 12, color: "#0D6E56", marginTop: 5, fontWeight: 700, display: "flex", alignItems: "center", gap: 5 }}>
                        <CheckCircle2 style={{ width: 13, height: 13 }} /> Passwords match
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
                        <p style={{ fontSize: 12, color: strength.color, fontWeight: 800, margin: 0 }}>
                          {strength.label} password
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Divider */}
            <div style={{ display: "flex", alignItems: "center", gap: 10, margin: isSm ? "18px 0 14px" : "22px 0 18px" }}>
              <div style={{ flex: 1, height: 1, background: "#E5EAF0" }} />
              <span style={{
                fontSize: 10, fontWeight: 800, letterSpacing: "0.08em",
                color: "#94A3B8", textTransform: "uppercase", whiteSpace: "nowrap",
              }}>Security Verification</span>
              <div style={{ flex: 1, height: 1, background: "#E5EAF0" }} />
            </div>

            {/* CAPTCHA — stacks on mobile */}
            <div style={{ marginBottom: isSm ? 16 : 24 }}>
              <Label style={{ fontSize: isSm ? 13 : 15, fontWeight: 800, color: "#000000", marginBottom: 7, display: "block" }}>
                Security Code
              </Label>

              {isSm ? (
                /* ── Mobile layout: CAPTCHA display full-width, then input + hint row ── */
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {/* CAPTCHA box — full width on mobile */}
                  <div
                    style={{
                      height: 48, borderRadius: 10,
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
                        fontSize: 26, fontWeight: 900,
                        letterSpacing: 12, color: "#fff",
                        fontStyle: "italic", position: "relative",
                        textShadow: "0 1px 3px rgba(0,0,0,0.25)",
                      }}
                    >
                      {CAPTCHA_CODE}
                    </span>
                  </div>

                  {/* Input + hint on same row */}
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <Input
                      type="text"
                      value={form.captcha}
                      placeholder="Enter code"
                      maxLength={6}
                      onChange={(e) => setForm((prev) => ({ ...prev, captcha: e.target.value }))}
                      style={{
                        height: 44, flex: 1, borderRadius: 10,
                        border: "2px solid #D1D9E0", background: "#FAFBFC",
                        fontSize: 18, fontWeight: 800, color: "#000000",
                        letterSpacing: 5, paddingLeft: 14, outline: "none",
                      }}
                      className="focus-visible:ring-0 focus:border-[#0D6E56] focus:shadow-[0_0_0_3px_rgba(13,110,86,0.14)]"
                    />
                    <div style={{ display: "flex", alignItems: "center", gap: 5, flexShrink: 0 }}>
                      <Info style={{ width: 14, height: 14, color: "#64748B" }} />
                      <span style={{ fontSize: 12, color: "#000000", fontWeight: 700 }}>enter code</span>
                    </div>
                  </div>
                </div>
              ) : (
                /* ── Desktop layout: horizontal row ── */
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
                      letterSpacing: 5, paddingLeft: 14, outline: "none",
                    }}
                    className="focus-visible:ring-0 focus:border-[#0D6E56] focus:shadow-[0_0_0_3px_rgba(13,110,86,0.14)]"
                  />
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
              )}
            </div>
          </div>

          {/* Card footer */}
          <div
            style={{
              padding: isSm ? `12px ${cardPadX}px 14px` : `16px ${cardPadX}px`,
              borderTop: "1px solid #E5EAF0",
              background: "#F8FAFB",
              // On mobile: stack hint above, buttons below full-width
              display: "flex",
              flexDirection: isSm ? "column" : "row",
              alignItems: isSm ? "stretch" : "center",
              justifyContent: isSm ? "flex-start" : "space-between",
              gap: isSm ? 10 : 0,
            }}
          >
            <p style={{ fontSize: isSm ? 12 : 13, color: "#000000", fontWeight: 700, margin: 0 }}>
              Minimum 6 characters required
            </p>

            <div style={{ display: "flex", gap: 8, flexDirection: isSm ? "column" : "row" }}>
              <Button
                onClick={handleReset}
                variant="outline"
                style={{
                  height: isSm ? 42 : 44,
                  paddingInline: isSm ? 0 : 20,
                  borderRadius: 10,
                  border: "2px solid #D1D9E0",
                  background: "#fff",
                  fontSize: isSm ? 13 : 14,
                  fontWeight: 800,
                  color: "#000000",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 7,
                  width: isSm ? "100%" : "auto",
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
                  height: isSm ? 44 : 44,
                  paddingInline: isSm ? 0 : 22,
                  borderRadius: 10,
                  background: submitted ? "#6EE7B7" : "linear-gradient(135deg, #0D6E56, #0f8567)",
                  fontSize: isSm ? 13 : 14,
                  fontWeight: 800,
                  color: "#fff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 7,
                  border: "none",
                  boxShadow: submitted ? "none" : "0 2px 10px rgba(13,110,86,0.4)",
                  transition: "all .2s",
                  letterSpacing: "0.01em",
                  width: isSm ? "100%" : "auto",
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
        <p style={{ marginTop: isSm ? 14 : 16, textAlign: "center", fontSize: isSm ? 13 : 14, color: "#000000", fontWeight: 600 }}>
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