import { useEffect, useState } from "react";
import { toast } from "@/components/ui/sonner";
import { Input } from "@/components/ui/input";
import { requireSupabase, supabase } from "@/lib/supabaseClient";
import { ShieldCheck, Lock, Mail, ArrowRight, Loader2, Eye, EyeOff, CheckCircle2, MailCheck } from "lucide-react";
import "./ClientTheme.css";

type Step = "verify" | "pending" | "change" | "done";

const ClientChangePasswordPage = () => {
  const [step, setStep] = useState<Step>("verify");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [mounted] = useState(true);

  const strength = (() => {
    if (password.length === 0) return 0;
    let s = 0;
    if (password.length >= 8) s++;
    if (/[A-Z]/.test(password)) s++;
    if (/[0-9]/.test(password)) s++;
    if (/[^A-Za-z0-9]/.test(password)) s++;
    return s;
  })();

  const strengthLabel = ["", "Weak", "Fair", "Good", "Strong"][strength];
  const strengthColor = ["", "#e53e3e", "#dd6b20", "#d69e2e", "#38a169"][strength];

  // Only unlock the "set new password" step once the user has actually
  // clicked the verification link from their email.
  useEffect(() => {
    // By the time this page mounts, ProtectedClientRoute has already called
    // getSession(), which triggers Supabase's detectSessionInUrl handling of
    // the recovery link — so the PASSWORD_RECOVERY event below may have
    // already fired and been missed. Checking the URL directly catches that.
    const hash = window.location.hash;
    const search = window.location.search;
    if (hash.includes("type=recovery") || search.includes("type=recovery")) {
      setStep("change");
    }

    if (!supabase) return;
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setStep("change");
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      toast.error("Please enter your email address.");
      return;
    }

    try {
      setIsSaving(true);
      const sb = requireSupabase();
      // Check if the email matches the current authenticated user
      const { data: { user }, error: userError } = await sb.auth.getUser();
      if (userError || !user) throw new Error("Not authenticated");
      if (user.email?.toLowerCase() !== email.trim().toLowerCase()) {
        throw new Error("Email does not match your account.");
      }
      // Send a verification link. Clicking it returns the user to this page
      // with a recovery session, which unlocks the "set new password" step.
      const { error } = await sb.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/client/change-password`,
      });
      if (error) throw error;

      toast.success("Verification email sent! Check your inbox.");
      setStep("pending");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Verification failed");
    } finally {
      setIsSaving(false);
    }
  };

  const handleResend = async () => {
    if (!email.trim()) return;
    try {
      setIsSaving(true);
      const sb = requireSupabase();
      const { error } = await sb.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/client/change-password`,
      });
      if (error) throw error;
      toast.success("Verification email resent!");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to resend email");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) {
      toast.error("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirmPassword) {
      toast.error("Passwords do not match.");
      return;
    }

    try {
      setIsSaving(true);
      const sb = requireSupabase();
      const { error } = await sb.auth.updateUser({ password });
      if (error) throw error;

      setStep("done");
      toast.success("Password updated successfully");
      setPassword("");
      setConfirmPassword("");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update password");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <style>{styles}</style>
      <div className="cpp-root">
        <div className="cpp-orb cpp-orb-1" />
        <div className="cpp-orb cpp-orb-2" />

        <div className={`cpp-shell ${mounted ? "cpp-shell--in" : ""}`}>

          {/* Step indicator */}
          <div className="cpp-steps">
            {(["verify", "change", "done"] as Step[]).map((s, i) => {
              const displayStep = step === "pending" ? "verify" : step;
              const isDone = (displayStep === "change" && i === 0) || displayStep === "done";
              return (
                <div key={s} className="cpp-step-wrap">
                  <div className={`cpp-step-dot ${displayStep === s ? "cpp-step-dot--active" : ""} ${
                    isDone ? "cpp-step-dot--done" : ""
                  }`}>
                    {isDone ? <CheckCircle2 size={13} /> : <span>{i + 1}</span>}
                  </div>
                  {i < 2 && <div className={`cpp-step-line ${isDone ? "cpp-step-line--done" : ""}`} />}
                </div>
              );
            })}
          </div>

          {/* Card */}
          <div className="cpp-card">

            {/* ── Step 1: Verify email ── */}
            {step === "verify" && (
              <div className="cpp-pane">
                <div className="cpp-icon-wrap">
                  <Mail size={22} />
                </div>
                <h1 className="cpp-title">Confirm your email</h1>
                <p className="cpp-desc">
                  Enter the email linked to your account. We'll send a verification before you can set a new password.
                </p>

                <form onSubmit={(e) => void handleVerify(e)} className="cpp-form">
                  <div className="cpp-field">
                    <label className="cpp-label">Email Address</label>
                    <div className="cpp-input-wrap">
                      <Mail size={15} className="cpp-input-icon" />
                      <Input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@company.com"
                        className="cpp-input cpp-input--padded"
                        required
                      />
                    </div>
                  </div>

                  <button type="submit" className="cpp-btn cpp-btn--primary" disabled={isSaving}>
                    {isSaving ? <Loader2 size={16} className="cpp-spin" /> : <ArrowRight size={16} />}
                    {isSaving ? "Verifying…" : "Send Verification"}
                  </button>
                </form>
              </div>
            )}

            {/* ── Step 1.5: Waiting for email link click ── */}
            {step === "pending" && (
              <div className="cpp-pane cpp-pane--center">
                <div className="cpp-icon-wrap">
                  <MailCheck size={22} />
                </div>
                <h1 className="cpp-title">Check your email</h1>
                <p className="cpp-desc">
                  We sent a verification link to <strong>{email.trim()}</strong>. Open it and click the link
                  to continue — this page will update automatically once it's confirmed.
                </p>

                <button
                  type="button"
                  className="cpp-btn cpp-btn--primary"
                  onClick={() => void handleResend()}
                  disabled={isSaving}
                >
                  {isSaving ? <Loader2 size={16} className="cpp-spin" /> : <Mail size={16} />}
                  {isSaving ? "Resending…" : "Resend Email"}
                </button>

                <button
                  type="button"
                  className="cpp-btn"
                  style={{ background: "transparent", color: "var(--text-muted)", boxShadow: "none" }}
                  onClick={() => setStep("verify")}
                >
                  Use a different email
                </button>
              </div>
            )}

            {/* ── Step 2: New password ── */}
            {step === "change" && (
              <div className="cpp-pane">
                <div className="cpp-icon-wrap">
                  <Lock size={22} />
                </div>
                <h1 className="cpp-title">Set new password</h1>
                <p className="cpp-desc">
                  Your email has been verified. Create your new password below.
                </p>

                <form onSubmit={(e) => void handleSubmit(e)} className="cpp-form">
                  <div className="cpp-field">
                    <label className="cpp-label">New Password</label>
                    <div className="cpp-input-wrap">
                      <Lock size={15} className="cpp-input-icon" />
                      <Input
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="At least 8 characters"
                        className="cpp-input cpp-input--padded cpp-input--padded-r"
                        required
                      />
                      <button
                        type="button"
                        className="cpp-eye-btn"
                        onClick={() => setShowPassword((v) => !v)}
                        tabIndex={-1}
                      >
                        {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                    </div>

                    {/* Strength bar */}
                    {password.length > 0 && (
                      <div className="cpp-strength">
                        <div className="cpp-strength-bars">
                          {[1, 2, 3, 4].map((n) => (
                            <div
                              key={n}
                              className="cpp-strength-bar"
                              style={{
                                background: n <= strength ? strengthColor : "var(--border)",
                                transition: "background 0.3s",
                              }}
                            />
                          ))}
                        </div>
                        <span className="cpp-strength-label" style={{ color: strengthColor }}>
                          {strengthLabel}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="cpp-field">
                    <label className="cpp-label">Confirm Password</label>
                    <div className="cpp-input-wrap">
                      <ShieldCheck size={15} className="cpp-input-icon" />
                      <Input
                        type={showConfirm ? "text" : "password"}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Repeat new password"
                        className="cpp-input cpp-input--padded cpp-input--padded-r"
                        required
                      />
                      <button
                        type="button"
                        className="cpp-eye-btn"
                        onClick={() => setShowConfirm((v) => !v)}
                        tabIndex={-1}
                      >
                        {showConfirm ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                    </div>

                    {confirmPassword.length > 0 && password !== confirmPassword && (
                      <p className="cpp-mismatch">Passwords don't match yet</p>
                    )}
                  </div>

                  <button
                    type="submit"
                    className="cpp-btn cpp-btn--primary"
                    disabled={isSaving || password !== confirmPassword || password.length < 8}
                  >
                    {isSaving ? <Loader2 size={16} className="cpp-spin" /> : <ShieldCheck size={16} />}
                    {isSaving ? "Updating…" : "Update Password"}
                  </button>
                </form>
              </div>
            )}

            {/* ── Step 3: Done ── */}
            {step === "done" && (
              <div className="cpp-pane cpp-pane--center">
                <div className="cpp-success-ring">
                  <CheckCircle2 size={36} />
                </div>
                <h1 className="cpp-title">Password updated</h1>
                <p className="cpp-desc">
                  Your account password has been changed. You can now log in with your new credentials.
                </p>
                <a href="/employer-login" className="cpp-btn cpp-btn--primary" style={{ textDecoration: "none" }}>
                  <ArrowRight size={16} />
                  Back to Login
                </a>
              </div>
            )}

          </div>

          {/* Security note */}
          {step !== "done" && (
            <p className="cpp-security-note">
              <ShieldCheck size={13} />
              Your password is encrypted and never stored in plain text.
            </p>
          )}
        </div>
      </div>
    </>
  );
};

/* ─────────────────────── Scoped styles ─────────────────────── */
const styles = `
  :root {
    --teal:        #0E4E5E;
    --teal-mid:    #1a6678;
    --teal-light:  #e8f4f7;
    --amber:       #FCD34D;
    --amber-dark:  #e6b800;
    --white:       #ffffff;
    --off:         #f5f9fa;
    --border:      rgba(14,78,94,0.13);
    --text-main:   #0d2f38;
    --text-muted:  #5b7d88;
    --radius-lg:   24px;
    --radius-md:   14px;
  }

  .cpp-root {
    position: relative;
    min-height: calc(100dvh - 4rem);
    background: linear-gradient(160deg, #e8f4f7 0%, #d0eaf1 55%, #f0f8fb 100%);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 48px 16px 72px;
    overflow: hidden;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  }

  /* Orbs */
  .cpp-orb {
    position: absolute;
    border-radius: 50%;
    filter: blur(72px);
    pointer-events: none;
    animation: cpp-drift 14s ease-in-out infinite alternate;
  }
  .cpp-orb-1 {
    width: 380px; height: 380px;
    background: radial-gradient(circle, rgba(14,78,94,0.17), transparent 70%);
    top: -60px; right: -80px;
  }
  .cpp-orb-2 {
    width: 300px; height: 300px;
    background: radial-gradient(circle, rgba(252,211,77,0.19), transparent 70%);
    bottom: 40px; left: -60px;
    animation-delay: -6s;
  }
  @keyframes cpp-drift {
    from { transform: translate(0,0) scale(1); }
    to   { transform: translate(28px, 18px) scale(1.09); }
  }

  /* Shell */
  .cpp-shell {
    width: 100%;
    max-width: 440px;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 18px;
    opacity: 0;
    transform: translateY(20px);
    transition: opacity 0.5s cubic-bezier(.22,1,.36,1), transform 0.5s cubic-bezier(.22,1,.36,1);
  }
  .cpp-shell--in {
    opacity: 1;
    transform: translateY(0);
  }

  /* Step indicator */
  .cpp-steps {
    display: flex;
    align-items: center;
    gap: 0;
    margin-bottom: 4px;
  }
  .cpp-step-wrap {
    display: flex;
    align-items: center;
  }
  .cpp-step-dot {
    width: 30px; height: 30px;
    border-radius: 50%;
    border: 2px solid var(--border);
    background: var(--white);
    color: var(--text-muted);
    font-size: 0.75rem;
    font-weight: 700;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.35s;
    position: relative;
    z-index: 1;
  }
  .cpp-step-dot--active {
    border-color: var(--amber);
    background: var(--teal);
    color: var(--amber);
    box-shadow: 0 0 0 4px rgba(252,211,77,0.2);
  }
  .cpp-step-dot--done {
    border-color: var(--teal);
    background: var(--teal);
    color: var(--amber);
  }
  .cpp-step-line {
    width: 52px;
    height: 2px;
    background: var(--border);
    transition: background 0.4s;
  }
  .cpp-step-line--done {
    background: var(--teal);
  }

  /* Card */
  .cpp-card {
    width: 100%;
    background: var(--white);
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    box-shadow: 0 4px 28px rgba(14,78,94,0.09);
    overflow: hidden;
  }

  /* Pane */
  .cpp-pane {
    padding: 32px 28px;
    animation: cpp-pane-in 0.4s cubic-bezier(.22,1,.36,1);
  }
  .cpp-pane--center {
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    gap: 12px;
  }
  @keyframes cpp-pane-in {
    from { opacity: 0; transform: translateX(14px); }
    to   { opacity: 1; transform: translateX(0); }
  }

  /* Icon wrap */
  .cpp-icon-wrap {
    width: 48px; height: 48px;
    border-radius: 14px;
    background: var(--teal);
    color: var(--amber);
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 16px;
    box-shadow: 0 4px 14px rgba(14,78,94,0.22);
  }

  /* Success ring */
  .cpp-success-ring {
    width: 72px; height: 72px;
    border-radius: 50%;
    background: var(--teal);
    color: var(--amber);
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 0 0 10px rgba(252,211,77,0.15), 0 0 0 20px rgba(14,78,94,0.07);
    animation: cpp-pop 0.5s cubic-bezier(.34,1.56,.64,1);
    margin-bottom: 8px;
  }
  @keyframes cpp-pop {
    from { transform: scale(0.5); opacity: 0; }
    to   { transform: scale(1); opacity: 1; }
  }

  .cpp-title {
    font-size: 1.45rem;
    font-weight: 800;
    color: var(--teal);
    letter-spacing: -0.02em;
    margin: 0 0 6px;
  }
  .cpp-desc {
    font-size: 0.875rem;
    color: var(--text-muted);
    line-height: 1.65;
    margin: 0 0 22px;
  }
  .cpp-pane--center .cpp-desc { margin-bottom: 0; }

  /* Form */
  .cpp-form {
    display: flex;
    flex-direction: column;
    gap: 18px;
  }
  .cpp-field {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .cpp-label {
    font-size: 0.75rem;
    font-weight: 700;
    letter-spacing: 0.07em;
    text-transform: uppercase;
    color: var(--teal);
  }
  .cpp-input-wrap {
    position: relative;
    display: flex;
    align-items: center;
  }
  .cpp-input-icon {
    position: absolute;
    left: 13px;
    color: var(--text-muted);
    pointer-events: none;
    z-index: 1;
  }
  .cpp-input {
    border-color: var(--border) !important;
    border-radius: var(--radius-md) !important;
    background: var(--off) !important;
    color: var(--text-main) !important;
    font-size: 0.93rem !important;
    height: 46px !important;
    width: 100%;
    transition: border-color 0.2s, box-shadow 0.2s, background 0.2s !important;
  }
  .cpp-input--padded { padding-left: 36px !important; }
  .cpp-input--padded-r { padding-right: 40px !important; }
  .cpp-input:focus {
    border-color: var(--teal) !important;
    background: var(--white) !important;
    box-shadow: 0 0 0 3px rgba(14,78,94,0.10) !important;
    outline: none !important;
  }
  .cpp-eye-btn {
    position: absolute;
    right: 12px;
    background: none;
    border: none;
    cursor: pointer;
    color: var(--text-muted);
    display: flex;
    align-items: center;
    padding: 4px;
    border-radius: 6px;
    transition: color 0.2s;
  }
  .cpp-eye-btn:hover { color: var(--teal); }

  /* Strength */
  .cpp-strength {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-top: 6px;
  }
  .cpp-strength-bars {
    display: flex;
    gap: 4px;
    flex: 1;
  }
  .cpp-strength-bar {
    height: 4px;
    border-radius: 4px;
    flex: 1;
  }
  .cpp-strength-label {
    font-size: 0.72rem;
    font-weight: 700;
    letter-spacing: 0.05em;
    min-width: 36px;
    text-align: right;
  }
  .cpp-mismatch {
    font-size: 0.78rem;
    color: #e53e3e;
    margin: 2px 0 0;
  }

  /* Button */
  .cpp-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    height: 48px;
    padding: 0 24px;
    border-radius: 14px;
    font-size: 0.92rem;
    font-weight: 700;
    border: none;
    cursor: pointer;
    text-decoration: none;
    transition: transform 0.15s, box-shadow 0.2s, background 0.2s;
    width: 100%;
  }
  .cpp-btn:active { transform: scale(0.97); }
  .cpp-btn--primary {
    background: var(--teal);
    color: var(--amber);
    box-shadow: 0 4px 18px rgba(14,78,94,0.28);
  }
  .cpp-btn--primary:hover:not(:disabled) {
    background: var(--teal-mid);
    box-shadow: 0 6px 24px rgba(14,78,94,0.36);
    transform: translateY(-1px);
  }
  .cpp-btn--primary:disabled {
    opacity: 0.55;
    cursor: not-allowed;
  }

  /* Security note */
  .cpp-security-note {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 0.78rem;
    color: var(--text-muted);
    margin: 0;
  }

  /* Utility */
  .cpp-spin {
    animation: cpp-spin 0.8s linear infinite;
  }
  @keyframes cpp-spin { to { transform: rotate(360deg); } }

  @media (prefers-reduced-motion: reduce) {
    .cpp-orb { animation: none !important; }
    .cpp-shell { transition: none !important; }
    .cpp-pane { animation: none !important; }
    .cpp-success-ring { animation: none !important; }
  }
`;

export default ClientChangePasswordPage;