import { useState } from "react";
import { ArrowLeft, Eye, EyeOff } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { saveClientAuth } from "@/lib/clientAuth";
import { supabase, requireSupabase } from "@/lib/supabaseClient";
import { finalizeClientLoginFromSupabase } from "@/lib/supabaseAuth";
import SocialOAuthButtons from "@/components/SocialOAuthButtons";
import "./ClientTheme.css";

interface AuthResponse {
  error?: string;
  token?: string;
  requiresConfirmation?: boolean;
  email?: string;
  delivery?: "sent" | "not_configured";
  devConfirmationCode?: string;
  client?: {
    id: number;
    name: string;
    company?: string;
    phone?: string;
    email: string;
    emailVerified?: boolean;
    createdAt: string;
  };
}

const ClientEmployerLogin = () => {
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(true);
  const [step, setStep] = useState<"auth" | "confirm">("auth");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [name, setName] = useState("");
  const [company, setCompany] = useState("");
  const [phone, setPhone] = useState("");
  const [confirmationEmail, setConfirmationEmail] = useState("");
  const [confirmationCode, setConfirmationCode] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const { toast } = useToast();

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

    try {
      setIsSubmitting(true);

      const sb = requireSupabase();
      const normalizedEmail = email.trim();

      if (isLogin) {
        const { data, error } = await sb.auth.signInWithPassword({
          email: normalizedEmail,
          password,
        });
        if (error) {
          console.error("Login error:", error);
          throw error;
        }

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
          await sb.auth.signOut();
          return;
        }

        const accessToken = data.session?.access_token || (await sb.auth.getSession()).data.session?.access_token;
        if (!accessToken) {
          throw new Error("No session returned from Supabase");
        }

        await finalizeClientLoginFromSupabase(accessToken);
        toast({
          title: "Login Successful",
          description: "You can now view your assigned maids.",
        });
        navigate("/client/home");
        return;
      }

      try {
        const { data, error } = await sb.auth.signUp({
          email: normalizedEmail,
          password,
        });

        if (error) {
          console.error("Supabase signup error:", error);
          throw error;
        }

        console.log("Signup success:", data);
      } catch (err) {
        console.error("Signup failed:", err);
        throw err;
      }

      toast({
        title: "Check your Gmail for verification",
        description: "We sent a verification email. Please verify before logging in.",
      });
      setIsLogin(true);
      setConfirmPassword("");
      return;

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

  const handleConfirm = async (event: React.FormEvent) => {
    event.preventDefault();

    toast({
      title: "Email verification",
      description: "Please verify via the email link from Supabase, then log in.",
    });
    setStep("auth");
    setIsLogin(true);
    return;

    try {
      setIsConfirming(true);
    } catch (error) {
      toast({
        title: "Confirmation failed",
        description: error instanceof Error ? error.message : "Unable to continue",
        variant: "destructive",
      });
    } finally {
      setIsConfirming(false);
    }
  };

  const handleResend = async () => {
    if (!confirmationEmail.trim()) return;
    try {
      const { error } = await requireSupabase().auth.resend({
        type: "signup",
        email: confirmationEmail.trim(),
      });
      if (error) throw error;
      toast({
        title: "Verification email resent",
        description: `We resent the verification email to ${confirmationEmail.trim()}.`,
      });
    } catch (error) {
      toast({
        title: "Resend failed",
        description: error instanceof Error ? error.message : "Unable to resend",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="client-page-theme flex min-h-screen items-center justify-center bg-muted p-4">
      <div className="w-full max-w-md">
        <Link to="/" className="mb-8 inline-flex items-center gap-2 font-body text-sm text-muted-foreground transition-colors hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Back to Home
        </Link>

        {step === "auth" ? (
          <Tabs
            value={isLogin ? "login" : "signup"}
            onValueChange={(value) => {
              setIsLogin(value === "login");
              setStep("auth");
              setConfirmPassword("");
            }}
            className="mb-4"
          >
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">Employer Login</TabsTrigger>
              <TabsTrigger value="signup">Employer Signup</TabsTrigger>
            </TabsList>
          </Tabs>
        ) : null}

        <div className="rounded-2xl bg-card p-8 shadow-lg">
          <div className="mb-8 text-center">
            <h1 className="mb-1 font-display text-2xl font-bold text-foreground">
              {step === "confirm" ? "Confirm Email" : isLogin ? "Employer Login" : "Employer Signup"}
            </h1>
            <p className="font-body text-sm text-muted-foreground">
              {step === "confirm"
                ? "Enter the 6-digit code we sent to your email."
                : isLogin
                  ? "Sign in to view only the maids assigned to you."
                  : "Register as a client to receive assigned maid profiles."}
            </p>
          </div>

          {step === "confirm" ? (
            <form onSubmit={(event) => void handleConfirm(event)} className="space-y-4">
              <div>
                <label className="mb-1 block font-body text-xs uppercase tracking-wider text-muted-foreground">Email Address</label>
                <input
                  type="email"
                  value={confirmationEmail}
                  onChange={(event) => setConfirmationEmail(event.target.value)}
                  className="w-full rounded-lg border bg-background px-3 py-2.5 font-body text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  placeholder="employer@company.com"
                  required
                />
              </div>

              <div>
                <label className="mb-1 block font-body text-xs uppercase tracking-wider text-muted-foreground">Confirmation Code</label>
                <input
                  inputMode="numeric"
                  value={confirmationCode}
                  onChange={(event) => setConfirmationCode(event.target.value)}
                  className="w-full rounded-lg border bg-background px-3 py-2.5 font-body text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  placeholder="6-digit code"
                  required
                />
              </div>

              <Button type="submit" size="lg" className="w-full font-body" disabled={isConfirming}>
                {isConfirming ? "Verifying..." : "Confirm & Sign In"}
              </Button>

              <Button type="button" variant="outline" size="lg" className="w-full font-body" onClick={() => void handleResend()}>
                Resend Code
              </Button>

              <Button type="button" variant="ghost" size="lg" className="w-full font-body" onClick={() => setStep("auth")}>
                Back
              </Button>
            </form>
          ) : (
            <div className="space-y-4">
              <SocialOAuthButtons disabled={isSubmitting} enableFacebook />

              <div className="flex items-center gap-3">
                <div className="h-px flex-1 bg-border" />
                <div className="text-xs text-muted-foreground">or</div>
                <div className="h-px flex-1 bg-border" />
              </div>

              <form onSubmit={(event) => void handleSubmit(event)} className="space-y-4">
                {!isLogin && (
                  <>
                    <div>
                      <label className="mb-1 block font-body text-xs uppercase tracking-wider text-muted-foreground">Full Name</label>
                      <input
                        type="text"
                        value={name}
                        onChange={(event) => setName(event.target.value)}
                        className="w-full rounded-lg border bg-background px-3 py-2.5 font-body text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                        placeholder="John Doe"
                        required
                      />
                    </div>

                    <div>
                      <label className="mb-1 block font-body text-xs uppercase tracking-wider text-muted-foreground">Phone Number</label>
                      <input
                        type="tel"
                        value={phone}
                        onChange={(event) => setPhone(event.target.value)}
                        className="w-full rounded-lg border bg-background px-3 py-2.5 font-body text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                        placeholder="+65 9123 4567"
                      />
                    </div>
                  </>
                )}

                <div>
                  <label className="mb-1 block font-body text-xs uppercase tracking-wider text-muted-foreground">Email Address</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    className="w-full rounded-lg border bg-background px-3 py-2.5 font-body text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    placeholder="employer@company.com"
                    required
                  />
                </div>

                <div>
                  <label className="mb-1 block font-body text-xs uppercase tracking-wider text-muted-foreground">Password</label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      className="w-full rounded-lg border bg-background px-3 py-2.5 pr-10 font-body text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                      placeholder="........"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((value) => !value)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {!isLogin && (
                  <div>
                    <label className="mb-1 block font-body text-xs uppercase tracking-wider text-muted-foreground">Confirm Password</label>
                    <div className="relative">
                      <input
                        type={showConfirmPassword ? "text" : "password"}
                        value={confirmPassword}
                        onChange={(event) => setConfirmPassword(event.target.value)}
                        className={`w-full rounded-lg border bg-background px-3 py-2.5 pr-10 font-body text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring ${
                          confirmPassword && password !== confirmPassword
                            ? "border-destructive focus:ring-destructive"
                            : ""
                        }`}
                        placeholder="........"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword((value) => !value)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    {confirmPassword && password !== confirmPassword && (
                      <p className="mt-1 font-body text-xs text-destructive">Passwords do not match.</p>
                    )}
                  </div>
                )}

                <Button type="submit" size="lg" className="w-full font-body" disabled={isSubmitting}>
                  {isSubmitting ? "Please wait..." : isLogin ? "Sign In" : "Create Account"}
                </Button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ClientEmployerLogin;