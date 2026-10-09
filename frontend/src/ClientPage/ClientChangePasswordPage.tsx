import { useEffect, useState } from "react";
import { toast } from "@/components/ui/sonner";
import { Input } from "@/components/ui/input";
import { requireSupabase, supabase } from "@/lib/supabaseClient";
import { buildClientPasswordRecoveryUrl } from "@/lib/clientNavigation";
import { Link } from "react-router-dom";
import { ShieldCheck, Lock, Mail, ArrowRight, ArrowLeft, Loader2, Eye, EyeOff, CheckCircle2, MailCheck, RefreshCw, Sparkles } from "lucide-react";
import "./ClientTheme.css";

type Step = "checking" | "verify" | "pending" | "change" | "expired" | "done";
const RESEND_COOLDOWN_SECONDS = 60;
const PASSWORD_RESET_LINK_EXPIRY_MINUTES = 5;

const getPasswordResetRequestError = (error: unknown) => {
  const message = error instanceof Error
    ? error.message
    : typeof error === "object" && error !== null && "message" in error && typeof error.message === "string"
      ? error.message
      : "";
  const normalized = message.toLowerCase();

  if (/redirect|redirect_to|not allowed/.test(normalized)) {
    return "The password-reset destination is not allowed by Supabase. Add https://rinzinagency.com/client/change-password to Authentication → URL Configuration → Redirect URLs.";
  }
  if (/rate limit|too many requests|email.*limit/.test(normalized)) {
    return "Too many reset emails were requested. Wait a few minutes before trying again.";
  }
  if (/smtp|email.*send|sending.*email|mailer/.test(normalized)) {
    return "Supabase could not send the reset email. Check the project's authentication email provider and Reset Password template.";
  }
  if (/fetch|network|connection/.test(normalized)) {
    return "We couldn't reach the password service. Check your connection and try again.";
  }
  return "We couldn't send the reset link right now. Please try again shortly. If it keeps failing, contact agency support.";
};

const ClientChangePasswordPage = () => {
  const [step, setStep] = useState<Step>("checking");
  const [recoveryError, setRecoveryError] = useState(`This password reset link is invalid, expired after ${PASSWORD_RESET_LINK_EXPIRY_MINUTES} minutes, or has already been used. Request a new link to continue.`);
  const [requestError, setRequestError] = useState("");
  const [resendCountdown, setResendCountdown] = useState(0);
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

  useEffect(() => {
    if (resendCountdown <= 0) return;
    const timer = window.setTimeout(() => {
      setResendCountdown((seconds) => Math.max(0, seconds - 1));
    }, 1000);
    return () => window.clearTimeout(timer);
  }, [resendCountdown]);

  useEffect(() => {
    let active = true;
    const url = new URL(window.location.href);
    const hashParams = new URLSearchParams(url.hash.slice(1));
    const errorCode = url.searchParams.get("error_code") || hashParams.get("error_code");
    const errorDescription = url.searchParams.get("error_description") || hashParams.get("error_description");
    const recoveryFlow =
      hashParams.get("type") === "recovery";

    if (errorCode || errorDescription) {
      setRecoveryError(
        errorCode === "otp_expired" || /expired|invalid/i.test(errorDescription || "")
          ? `This password reset link has expired (links are valid for ${PASSWORD_RESET_LINK_EXPIRY_MINUTES} minutes) or has already been used. Request a new link to set your password.`
          : "We couldn't verify this password reset link. Request a new link and try again.",
      );
      setStep("expired");
      window.history.replaceState({}, document.title, url.pathname);
      return () => { active = false; };
    }

    if (!supabase) {
      setStep("verify");
      return () => { active = false; };
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        window.history.replaceState({}, document.title, window.location.pathname);
        setStep("change");
      }
    });

    void supabase.auth.getSession()
      .then(({ data, error }) => {
        if (!active) return;
        if (error) {
          setRecoveryError("We couldn't verify this password reset link. Request a new link and try again.");
          setStep("expired");
        } else if (data.session) {
          setStep("change");
        } else if (recoveryFlow) {
          setStep("expired");
        } else {
          setStep("verify");
        }
      })
      .catch(() => {
        if (!active) return;
        setRecoveryError("We couldn't verify this password reset link. Request a new link and try again.");
        setStep("expired");
      });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setRequestError("");
    if (!email.trim()) {
      setRequestError("Enter the email address linked to your employer account.");
      return;
    }

    try {
      setIsSaving(true);
      const sb = requireSupabase();
      const { error } = await sb.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: buildClientPasswordRecoveryUrl(window.location.origin),
      });
      if (error) throw error;

      toast.success("If an account exists for this email, a password reset link will arrive shortly.");
      setResendCountdown(RESEND_COOLDOWN_SECONDS);
      setStep("pending");
    } catch (error) {
      console.error("Password reset email request failed:", error);
      setRequestError(getPasswordResetRequestError(error));
    } finally {
      setIsSaving(false);
    }
  };

  const handleResend = async () => {
    if (!email.trim() || isSaving || resendCountdown > 0) return;
    setRequestError("");
    try {
      setIsSaving(true);
      const sb = requireSupabase();
      const { error } = await sb.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: buildClientPasswordRecoveryUrl(window.location.origin),
      });
      if (error) throw error;
      toast.success("If an account exists for this email, a password reset link will arrive shortly.");
      setResendCountdown(RESEND_COOLDOWN_SECONDS);
    } catch (error) {
      console.error("Password reset email resend failed:", error);
      setRequestError(getPasswordResetRequestError(error));
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
          <Link to="/" className="cpp-back-link">
            <ArrowLeft size={14} />
            Back to Home
          </Link>

          {/* Card */}
          <div className="cpp-card">

            {step === "checking" && (
              <div className="cpp-pane cpp-pane--center" role="status">
                <Loader2 size={24} className="cpp-spin" />
                <h1 className="cpp-title">Checking reset link</h1>
                <p className="cpp-desc">Please wait while we verify your secure password reset link.</p>
              </div>
            )}

            {/* ── Step 1: Request reset email ── */}
            {step === "verify" && (
              <div className="cpp-pane">
                <div className="cpp-badge">
                  <Sparkles size={10} />
                  Account Recovery
                </div>
                <h1 className="cpp-title">Reset your password</h1>
                <p className="cpp-desc">
                  Enter your account email and we’ll send you a secure password reset link. For your security,
                  the link is valid for {PASSWORD_RESET_LINK_EXPIRY_MINUTES} minutes.
                </p>

                <form onSubmit={(e) => void handleVerify(e)} className="cpp-form">
                  <div className="cpp-field">
                    <label className="cpp-label" htmlFor="cpp-reset-email">Email Address</label>
                    <div className="cpp-input-wrap">
                      <Input
                        id="cpp-reset-email"
                        type="email"
                        value={email}
                        onChange={(e) => { setEmail(e.target.value); setRequestError(""); }}
                        placeholder="employer@company.com"
                        className="cpp-input"
                        required
                      />
                    </div>
                  </div>

                  <button type="submit" className="cpp-btn cpp-btn--primary" disabled={isSaving}>
                    {isSaving && <Loader2 size={16} className="cpp-spin" />}
                    {isSaving ? "Sending…" : "Send reset link"}
                  </button>
                  {requestError && <p className="cpp-request-error" role="alert">{requestError}</p>}
                </form>
                <Link to="/employer-login" className="cpp-btn cpp-btn--secondary">
                  Back to sign in
                </Link>
              </div>
            )}

            {/* ── Step 1.5: Waiting for reset link click ── */}
            {step === "pending" && (
              <div className="cpp-pane cpp-pane--center">
                <div className="cpp-icon-wrap">
                  <MailCheck size={22} />
                </div>
                <h1 className="cpp-title">Check your email</h1>
                <p className="cpp-desc">
                  If an account exists for <strong>{email.trim()}</strong>, a reset link has been sent. Open it
                  to continue — this page will update automatically. The link is single-use and expires
                  {` ${PASSWORD_RESET_LINK_EXPIRY_MINUTES} minutes after it is issued`}. If you request another
                  link, use the newest email.
                </p>

                <button
                  type="button"
                  className="cpp-btn cpp-btn--primary"
                  onClick={() => void handleResend()}
                  disabled={isSaving || resendCountdown > 0}
                >
                  {isSaving
                    ? <Loader2 size={16} className="cpp-spin" />
                    : resendCountdown > 0
                      ? <RefreshCw size={16} className="cpp-countdown-icon" />
                      : <Mail size={16} />}
                  {isSaving
                    ? "Sending…"
                    : resendCountdown > 0
                      ? `Resend link in ${resendCountdown}s`
                      : "Resend reset link"}
                </button>
                {resendCountdown > 0 && (
                  <p className="cpp-resend-countdown" role="status">
                    You can request another reset email in {resendCountdown} seconds.
                  </p>
                )}
                {requestError && <p className="cpp-request-error" role="alert">{requestError}</p>}

                <button
                  type="button"
                  className="cpp-btn cpp-btn--secondary"
                  onClick={() => setStep("verify")}
                >
                  Use a different email
                </button>
              </div>
            )}

            {step === "expired" && (
              <div className="cpp-pane cpp-pane--center">
                <div className="cpp-icon-wrap">
                  <Mail size={22} />
                </div>
                <h1 className="cpp-title">Reset link expired</h1>
                <p className="cpp-desc">{recoveryError}</p>
                <button type="button" className="cpp-btn cpp-btn--primary" onClick={() => setStep("verify")}>
                  <Mail size={16} />
                  Request a new reset link
                </button>
                <Link to="/employer-login" className="cpp-btn cpp-btn--secondary">
                  Back to sign in
                </Link>
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
                  Create a new password for your account.
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
                <Link to="/employer-login" className="cpp-btn cpp-btn--primary">
                  <ArrowRight size={16} />
                  Back to Login
                </Link>
              </div>
            )}

          </div>

        </div>
      </div>
    </>
  );
};

/* ─────────────────────── Scoped styles ─────────────────────── */
const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700&family=DM+Sans:wght@400;500;600;700;800&display=swap');

  :root {
    --teal:        #0a3a47;
    --teal-mid:    #124b59;
    --teal-light:  #204f58;
    --amber:       #FCD34D;
    --amber-dark:  #f0ab00;
    --white:       #0a303a;
    --off:         #082b35;
    --border:      rgba(255,255,255,0.15);
    --text-main:   #ffffff;
    --text-muted:  #9eb3b9;
    --radius-lg:   22px;
    --radius-md:   13px;
  }

  .cpp-root {
    position: relative;
    min-height: 100dvh;
    background: #0a3a47;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 40px 16px;
    overflow: hidden;
    font-family: 'DM Sans', sans-serif;
  }
  .cpp-root::before {
    content: "";
    position: absolute;
    inset: 0;
    background-image:
      linear-gradient(rgba(252,211,77,0.025) 1px, transparent 1px),
      linear-gradient(90deg, rgba(252,211,77,0.025) 1px, transparent 1px);
    background-size: 48px 48px;
    pointer-events: none;
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
    background: radial-gradient(circle, rgba(252,211,77,0.09), transparent 70%);
    top: -60px; right: -80px;
  }
  .cpp-orb-2 {
    width: 300px; height: 300px;
    background: radial-gradient(circle, rgba(252,211,77,0.07), transparent 70%);
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
    max-width: 436px;
    display: flex;
    flex-direction: column;
    align-items: stretch;
    gap: 22px;
    opacity: 0;
    transform: translateY(20px);
    transition: opacity 0.5s cubic-bezier(.22,1,.36,1), transform 0.5s cubic-bezier(.22,1,.36,1);
  }
  .cpp-shell--in {
    opacity: 1;
    transform: translateY(0);
  }
  .cpp-back-link {
    position: relative;
    z-index: 1;
    display: inline-flex;
    align-items: center;
    align-self: flex-start;
    gap: 7px;
    color: #d9b83f;
    font-size: 0.78rem;
    font-weight: 600;
    text-decoration: none;
    transition: color 0.2s;
  }
  .cpp-back-link:hover { color: var(--amber); }

  /* Step indicator */
  .cpp-steps {
    display: none;
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
    position: relative;
    z-index: 1;
    background: rgba(8, 45, 56, 0.86);
    border: 1px solid rgba(252,211,77,0.18);
    border-radius: var(--radius-lg);
    box-shadow: 0 24px 64px rgba(0,0,0,0.28), inset 0 1px 0 rgba(255,255,255,0.035);
    backdrop-filter: blur(18px);
    -webkit-backdrop-filter: blur(18px);
    overflow: hidden;
  }

  /* Pane */
  .cpp-pane {
    padding: 30px;
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
    background: rgba(252,211,77,0.13);
    color: var(--amber);
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 16px;
    box-shadow: 0 4px 14px rgba(0,0,0,0.18);
  }
  .cpp-badge {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 4px 12px;
    margin-bottom: 14px;
    border: 1px solid rgba(252,211,77,0.35);
    border-radius: 999px;
    background: rgba(252,211,77,0.12);
    color: var(--amber);
    font-size: 0.66rem;
    font-weight: 800;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  /* Success ring */
  .cpp-success-ring {
    width: 72px; height: 72px;
    border-radius: 50%;
    background: rgba(252,211,77,0.13);
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
    font-family: 'Playfair Display', serif;
    font-size: 1.45rem;
    font-weight: 800;
    color: #ffffff;
    letter-spacing: -0.02em;
    margin: 0 0 6px;
  }
  .cpp-desc {
    font-size: 0.875rem;
    color: rgba(255,255,255,0.67);
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
    color: var(--amber);
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
    border-color: rgba(255,255,255,0.15) !important;
    border-radius: var(--radius-md) !important;
    background: var(--off) !important;
    color: #ffffff !important;
    font-size: 0.93rem !important;
    height: 46px !important;
    width: 100%;
    transition: border-color 0.2s, box-shadow 0.2s, background 0.2s !important;
  }
  .cpp-input--padded { padding-left: 36px !important; }
  .cpp-input--padded-r { padding-right: 40px !important; }
  .cpp-input:focus {
    border-color: rgba(252,211,77,0.7) !important;
    background: #0a303a !important;
    box-shadow: 0 0 0 3px rgba(252,211,77,0.10) !important;
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
  .cpp-request-error {
    margin: 0;
    padding: 11px 12px;
    border: 1px solid rgba(252, 165, 165, 0.35);
    border-radius: 10px;
    background: rgba(127, 29, 29, 0.2);
    color: #fecaca;
    font-size: 0.82rem;
    line-height: 1.5;
  }
  .cpp-resend-countdown {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    margin: -7px 0 0;
    color: rgba(255,255,255,0.62);
    font-size: 0.78rem;
    font-variant-numeric: tabular-nums;
    text-align: center;
  }
  .cpp-countdown-icon { animation: cpp-countdown-spin 2s linear infinite; }
  @keyframes cpp-countdown-spin { to { transform: rotate(360deg); } }

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
    background: linear-gradient(135deg, #ffdc63 0%, #f0ab00 100%);
    color: #0a3a47;
    box-shadow: 0 4px 18px rgba(252,211,77,0.22);
  }
  .cpp-btn--primary:hover:not(:disabled) {
    background: linear-gradient(135deg, #ffe27b 0%, #f4b923 100%);
    box-shadow: 0 6px 24px rgba(252,211,77,0.32);
    transform: translateY(-1px);
  }
  .cpp-btn--primary:disabled {
    opacity: 0.55;
    cursor: not-allowed;
  }
  .cpp-btn--secondary {
    margin-top: 9px;
    border: 1px solid rgba(255,255,255,0.15);
    background: transparent;
    color: rgba(255,255,255,0.7);
    box-shadow: none;
  }
  .cpp-btn--secondary:hover {
    border-color: rgba(255,255,255,0.28);
    background: rgba(255,255,255,0.06);
    color: #fff;
  }

  /* Security note */
  .cpp-security-note {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 0.78rem;
    color: rgba(255,255,255,0.55);
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
    .cpp-countdown-icon { animation: none !important; }
  }
  @media (max-width: 480px) {
    .cpp-root { padding: 28px 16px; }
    .cpp-pane { padding: 26px 22px; }
  }
`;

export default ClientChangePasswordPage;