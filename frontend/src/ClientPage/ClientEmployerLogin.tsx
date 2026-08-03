import { useState } from "react";
import { ArrowLeft, Eye, EyeOff, Sparkles } from "lucide-react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { getClientPostLoginPath } from "@/lib/clientNavigation";
import { requireSupabase } from "@/lib/supabaseClient";
import { finalizeClientLoginFromSupabase } from "@/lib/supabaseAuth";
import SocialOAuthButtons from "@/components/SocialOAuthButtons";
import "./ClientTheme.css";

const ClientEmployerLogin = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [name, setName] = useState("");
  const [company, setCompany] = useState("");
  const [phone, setPhone] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const redirectTo = getClientPostLoginPath(searchParams.get("redirectTo"));

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!isLogin && password !== confirmPassword) {
      toast({
        title: "Passwords do not match",
        description: "Please make sure both passwords are the same.",
        variant: "destructive",
      });
      return;
    }

    if (!isLogin && password.length < 6) {
      toast({
        title: "Password too short",
        description: "Password must be at least 6 characters.",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsSubmitting(true);
      const sb = requireSupabase();
      const normalizedEmail = email.trim();

      if (isLogin) {
        const { data, error } = await sb.auth.signInWithPassword({
          email: normalizedEmail,
          password,
        });
        if (error) throw error;

        const confirmedAt =
          (data?.user as unknown as { email_confirmed_at?: string | null; confirmed_at?: string | null })
            ?.email_confirmed_at ??
          (data?.user as unknown as { confirmed_at?: string | null })?.confirmed_at ??
          null;

        if (data?.user && !confirmedAt) {
          toast({
            title: "Email not verified",
            description: "Please verify your email before logging in.",
            variant: "destructive",
          });
          await sb.auth.signOut({ scope: "local" });
          setIsSubmitting(false);
          return;
        }

        const accessToken = data.session?.access_token;
        if (!accessToken) throw new Error("No session returned from Supabase");

        toast({ title: "Login Successful", description: "You can now view your assigned maids." });
        navigate(redirectTo, { replace: true });
        void finalizeClientLoginFromSupabase();
        return;
      }

      const { data, error } = await sb.auth.signUp({
        email: normalizedEmail,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback?redirectTo=${encodeURIComponent(redirectTo)}`,
          data: {
            full_name: name.trim(),
            name: name.trim(),
            phone: phone.trim(),
            company: company.trim(),
          },
        },
      });

      if (error) throw error;

      toast({
        title: "Check your Gmail for verification",
        description: "We sent a verification email. Please verify before logging in.",
      });
      setIsLogin(true);
      setConfirmPassword("");
    } catch (error) {
      console.error("Authentication failed:", error);
      toast({
        title: "Authentication Failed",
        description: error instanceof Error ? error.message : "Unable to continue",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };


  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700&family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;1,9..40,400&display=swap');

        .cel-root {
          font-family: 'DM Sans', sans-serif;
          min-height: 100vh;
          background: #0a3a47;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 1.5rem;
          position: relative;
          overflow: hidden;
        }

        /* Ambient orbs */
        .cel-orb {
          position: absolute;
          border-radius: 9999px;
          filter: blur(90px);
          pointer-events: none;
          animation: cel-drift 14s ease-in-out infinite alternate;
        }
        .cel-orb-1 {
          width: 480px; height: 480px;
          background: radial-gradient(circle, rgba(252,211,77,0.14) 0%, transparent 70%);
          top: -120px; right: -100px;
        }
        .cel-orb-2 {
          width: 320px; height: 320px;
          background: radial-gradient(circle, rgba(252,211,77,0.07) 0%, transparent 70%);
          bottom: -80px; left: -80px;
          animation-delay: -6s;
        }
        .cel-orb-3 {
          width: 180px; height: 180px;
          background: radial-gradient(circle, rgba(252,211,77,0.09) 0%, transparent 70%);
          top: 38%; left: 8%;
          animation-delay: -3s;
        }
        @keyframes cel-drift {
          from { transform: translate(0, 0) scale(1); }
          to   { transform: translate(18px, 26px) scale(1.07); }
        }

        .cel-root::before {
          content: '';
          position: absolute;
          inset: 0;
          background-image:
            linear-gradient(rgba(252,211,77,0.025) 1px, transparent 1px),
            linear-gradient(90deg, rgba(252,211,77,0.025) 1px, transparent 1px);
          background-size: 52px 52px;
          pointer-events: none;
        }

        .cel-card {
          position: relative;
          z-index: 1;
          width: 100%;
          max-width: 460px;
          animation: cel-rise 0.55s cubic-bezier(0.16, 1, 0.3, 1) both;
        }
        @keyframes cel-rise {
          from { opacity: 0; transform: translateY(28px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        .cel-back-link {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: 0.82rem;
          font-weight: 500;
          color: rgba(252,211,77,0.7);
          text-decoration: none;
          margin-bottom: 1.5rem;
          transition: color 0.2s;
          letter-spacing: 0.01em;
        }
        .cel-back-link:hover { color: #FCD34D; }

        /* Tab switcher */
        .cel-tabs {
          display: flex;
          background: rgba(0,0,0,0.25);
          border: 1px solid rgba(252,211,77,0.2);
          border-radius: 14px;
          padding: 4px;
          margin-bottom: 1.25rem;
          gap: 4px;
        }
        .cel-tab {
          flex: 1;
          padding: 0.6rem 1rem;
          border-radius: 10px;
          border: none;
          background: transparent;
          color: rgba(255,255,255,0.45);
          font-family: 'DM Sans', sans-serif;
          font-size: 0.85rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .cel-tab:hover:not(.cel-tab--active) {
          color: rgba(255,255,255,0.75);
          background: rgba(255,255,255,0.06);
        }
        .cel-tab--active {
          background: #FCD34D;
          color: #0a3a47;
          font-weight: 700;
          font-size: 0.85rem;
          box-shadow: 0 2px 14px rgba(252,211,77,0.35);
        }

        /* Glass panel */
        .cel-panel {
          background: rgba(8, 45, 56, 0.75);
          border: 1px solid rgba(252,211,77,0.2);
          border-radius: 24px;
          padding: 2.25rem 2rem;
          backdrop-filter: blur(24px);
          -webkit-backdrop-filter: blur(24px);
          box-shadow:
            0 0 0 1px rgba(0,0,0,0.2),
            0 24px 64px rgba(0,0,0,0.4),
            inset 0 1px 0 rgba(255,255,255,0.07);
        }

        /* Badge */
        .cel-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: rgba(252,211,77,0.15);
          border: 1px solid rgba(252,211,77,0.35);
          border-radius: 999px;
          padding: 4px 12px;
          font-size: 0.7rem;
          font-weight: 700;
          color: #FCD34D;
          letter-spacing: 0.09em;
          text-transform: uppercase;
          margin-bottom: 0.85rem;
        }

        .cel-title {
          font-family: 'Playfair Display', serif;
          font-size: 1.8rem;
          font-weight: 700;
          color: #ffffff;
          margin: 0 0 0.5rem;
          line-height: 1.2;
          letter-spacing: -0.01em;
        }
        .cel-subtitle {
          font-size: 0.875rem;
          font-weight: 400;
          color: rgba(255,255,255,0.65);
          margin: 0 0 1.75rem;
          line-height: 1.6;
        }

        /* Divider */
        .cel-divider {
          display: flex;
          align-items: center;
          gap: 12px;
          margin: 1.25rem 0;
        }
        .cel-divider-line { flex: 1; height: 1px; background: rgba(255,255,255,0.1); }
        .cel-divider-text {
          font-size: 0.75rem;
          font-weight: 500;
          color: rgba(255,255,255,0.45);
          letter-spacing: 0.04em;
          white-space: nowrap;
        }

        /* Fields */
        .cel-field { margin-bottom: 1.1rem; }

        .cel-label {
          display: block;
          margin-bottom: 0.45rem;
          font-size: 0.775rem;
          font-weight: 700;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: #e2c84a;
        }

        .cel-input {
          width: 100%;
          border-radius: 11px;
          border: 1.5px solid rgba(255,255,255,0.14);
          background: rgba(0,0,0,0.2);
          padding: 0.78rem 1rem;
          font-size: 0.9rem;
          font-family: 'DM Sans', sans-serif;
          font-weight: 400;
          color: #ffffff;
          transition: border-color 0.2s, background 0.2s, box-shadow 0.2s;
          outline: none;
          box-sizing: border-box;
          caret-color: #FCD34D;
        }
        .cel-input::placeholder {
          color: rgba(255,255,255,0.28);
          font-weight: 300;
        }
        .cel-input:focus {
          border-color: rgba(252,211,77,0.55);
          background: rgba(0,0,0,0.3);
          box-shadow: 0 0 0 3px rgba(252,211,77,0.1);
        }
        .cel-input--error { border-color: rgba(239,68,68,0.65) !important; }
        .cel-input--error:focus { box-shadow: 0 0 0 3px rgba(239,68,68,0.12) !important; }

        .cel-input-wrap { position: relative; }
        .cel-eye-btn {
          position: absolute;
          right: 12px;
          top: 50%;
          transform: translateY(-50%);
          background: none;
          border: none;
          cursor: pointer;
          color: rgba(255,255,255,0.35);
          display: flex;
          padding: 4px;
          transition: color 0.2s;
          line-height: 1;
        }
        .cel-eye-btn:hover { color: #FCD34D; }

        .cel-error-msg {
          margin-top: 5px;
          font-size: 0.75rem;
          font-weight: 500;
          color: #f87171;
        }

        /* Optional tag inline */
        .cel-optional {
          font-size: 0.7rem;
          font-weight: 400;
          color: rgba(255,255,255,0.3);
          text-transform: none;
          letter-spacing: 0;
          margin-left: 4px;
        }

        /* Submit button */
        .cel-submit-btn {
          width: 100%;
          padding: 0.88rem 1rem;
          border-radius: 12px;
          border: none;
          background: linear-gradient(135deg, #FCD34D 0%, #f0ab00 100%);
          color: #0a3a47;
          font-family: 'DM Sans', sans-serif;
          font-size: 0.925rem;
          font-weight: 700;
          letter-spacing: 0.02em;
          cursor: pointer;
          transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
          box-shadow: 0 4px 18px rgba(252,211,77,0.28);
          margin-top: 0.35rem;
          position: relative;
          overflow: hidden;
        }
        .cel-submit-btn::after {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(135deg, rgba(255,255,255,0.15) 0%, transparent 55%);
          pointer-events: none;
        }
        .cel-submit-btn:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 8px 28px rgba(252,211,77,0.42);
        }
        .cel-submit-btn:active:not(:disabled) { transform: translateY(0); }
        .cel-submit-btn:disabled { opacity: 0.5; cursor: not-allowed; }

        /* Ghost buttons */
        .cel-ghost-btn {
          width: 100%;
          padding: 0.78rem 1rem;
          border-radius: 12px;
          border: 1.5px solid rgba(255,255,255,0.15);
          background: transparent;
          color: rgba(255,255,255,0.7);
          font-family: 'DM Sans', sans-serif;
          font-size: 0.875rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
          margin-top: 0.6rem;
          letter-spacing: 0.01em;
        }
        .cel-ghost-btn:hover {
          background: rgba(255,255,255,0.07);
          color: #ffffff;
          border-color: rgba(255,255,255,0.28);
        }

        /* Stagger animation */
        .cel-field:nth-child(1) { animation: cel-rise 0.4s 0.08s both; }
        .cel-field:nth-child(2) { animation: cel-rise 0.4s 0.14s both; }
        .cel-field:nth-child(3) { animation: cel-rise 0.4s 0.20s both; }
        .cel-field:nth-child(4) { animation: cel-rise 0.4s 0.26s both; }
        .cel-field:nth-child(5) { animation: cel-rise 0.4s 0.32s both; }
        .cel-field:nth-child(6) { animation: cel-rise 0.4s 0.38s both; }

        @media (max-width: 480px) {
          .cel-panel { padding: 1.75rem 1.25rem; border-radius: 18px; }
          .cel-title { font-size: 1.5rem; }
        }
      `}</style>

      <div className="cel-root">
        <div className="cel-orb cel-orb-1" />
        <div className="cel-orb cel-orb-2" />
        <div className="cel-orb cel-orb-3" />

        <div className="cel-card">
          <Link to="/" className="cel-back-link">
            <ArrowLeft size={14} /> Back to Home
          </Link>

          <div className="cel-tabs">
            <button
              className={`cel-tab${isLogin ? " cel-tab--active" : ""}`}
              onClick={() => { setIsLogin(true); setConfirmPassword(""); }}
            >
              Sign In
            </button>
            <button
              className={`cel-tab${!isLogin ? " cel-tab--active" : ""}`}
              onClick={() => { setIsLogin(false); setConfirmPassword(""); }}
            >
              Create Account
            </button>
          </div>

          <div className="cel-panel">
            <div style={{ marginBottom: "1.75rem" }}>
              <div className="cel-badge">
                <Sparkles size={10} />
                {isLogin ? "Employer Portal" : "Join Us"}
              </div>
              <h1 className="cel-title">
                {isLogin ? "Welcome back" : "Create your account"}
              </h1>
              <p className="cel-subtitle">
                {isLogin
                  ? "Sign in to view the maids assigned to you."
                  : "Register to receive maid profiles from our team."}
              </p>
            </div>

            <div>
              <SocialOAuthButtons disabled={isSubmitting} enableFacebook redirectTo={redirectTo} />

              <div className="cel-divider">
                <div className="cel-divider-line" />
                <span className="cel-divider-text">or continue with email</span>
                <div className="cel-divider-line" />
              </div>

              <form onSubmit={(event) => void handleSubmit(event)}>
                {!isLogin && (
                  <>
                    <div className="cel-field">
                      <label className="cel-label" htmlFor="cel-name">Full Name</label>
                      <input
                        id="cel-name"
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="cel-input"
                        placeholder="John Dela Cruz"
                        required
                      />
                    </div>

                    <div className="cel-field">
                      <label className="cel-label" htmlFor="cel-phone">Phone Number</label>
                      <input
                        id="cel-phone"
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className="cel-input"
                        placeholder="+65 9123 4567"
                      />
                    </div>

                    <div className="cel-field">
                      <label className="cel-label" htmlFor="cel-company">
                        Company <span className="cel-optional">(optional)</span>
                      </label>
                      <input
                        id="cel-company"
                        type="text"
                        value={company}
                        onChange={(e) => setCompany(e.target.value)}
                        className="cel-input"
                        placeholder="Your company name"
                      />
                    </div>
                  </>
                )}

                <div className="cel-field">
                  <label className="cel-label" htmlFor="cel-email">Email Address</label>
                  <input
                    id="cel-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="cel-input"
                    placeholder="employer@company.com"
                    required
                  />
                </div>

                <div className="cel-field">
                  <label className="cel-label" htmlFor="cel-password">Password</label>
                  <div className="cel-input-wrap">
                    <input
                      id="cel-password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className={`cel-input${!isLogin && password && password.length < 6 ? " cel-input--error" : ""}`}
                      style={{ paddingRight: "2.75rem" }}
                      placeholder="••••••••"
                      required
                    />
                    <button
                      type="button"
                      className="cel-eye-btn"
                      aria-label={showPassword ? "Hide password" : "Show password"}
                      onClick={() => setShowPassword((v) => !v)}
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  {!isLogin && password && password.length < 6 && (
                    <p className="cel-error-msg">Password must be at least 6 characters.</p>
                  )}
                </div>

                {!isLogin && (
                  <div className="cel-field">
                    <label className="cel-label" htmlFor="cel-confirm-password">Confirm Password</label>
                    <div className="cel-input-wrap">
                      <input
                        id="cel-confirm-password"
                        type={showConfirmPassword ? "text" : "password"}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className={`cel-input${confirmPassword && password !== confirmPassword ? " cel-input--error" : ""}`}
                        style={{ paddingRight: "2.75rem" }}
                        placeholder="••••••••"
                        required
                      />
                      <button
                        type="button"
                        className="cel-eye-btn"
                        aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                        onClick={() => setShowConfirmPassword((v) => !v)}
                      >
                        {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                    {confirmPassword && password !== confirmPassword && (
                      <p className="cel-error-msg">Passwords do not match.</p>
                    )}
                  </div>
                )}

                <button type="submit" className="cel-submit-btn" disabled={isSubmitting}>
                  {isSubmitting ? "Please wait…" : isLogin ? "Sign In" : "Create Account"}
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default ClientEmployerLogin;