import { useState } from "react";
import { ArrowLeft, Eye, EyeOff } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { saveClientAuth } from "@/lib/clientAuth";
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
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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

    try {
      setIsSubmitting(true);
      const endpoint = isLogin ? "/api/client-auth/login" : "/api/client-auth/register";
      const payload = isLogin
        ? { email, password }
        : { name, company, phone, email, password };

      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await response.json().catch(() => ({}))) as AuthResponse;

      if (data.requiresConfirmation) {
        const targetEmail = data.email || email;
        setConfirmationEmail(targetEmail);
        setStep("confirm");
        setConfirmationCode("");
        toast({
          title: "Confirm your email",
          description:
            data.delivery === "not_configured"
              ? "Email delivery is not configured on the server. Ask your admin to configure email sending, or enable dev code exposure."
              : `We sent a 6-digit code to ${targetEmail}.`,
        });
        if (data.devConfirmationCode) {
          toast({
            title: "Dev confirmation code",
            description: data.devConfirmationCode,
          });
        }
        return;
      }

      if (!response.ok || !data.token || !data.client) {
        throw new Error(data.error || "Authentication failed");
      }

      saveClientAuth(data.token, data.client);
      toast({
        title: isLogin ? "Login Successful" : "Account Created",
        description: isLogin ? "You can now view your assigned maids." : "Your client account is ready.",
      });
      navigate("/client/dashboard");
    } catch (error) {
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
    if (!confirmationEmail.trim() || !confirmationCode.trim()) {
      toast({
        title: "Missing fields",
        description: "Enter the email and the 6-digit code.",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsConfirming(true);
      const response = await fetch("/api/client-auth/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: confirmationEmail, code: confirmationCode }),
      });
      const data = (await response.json().catch(() => ({}))) as AuthResponse;
      if (!response.ok || !data.token || !data.client) {
        throw new Error(data.error || "Confirmation failed");
      }
      saveClientAuth(data.token, data.client);
      toast({
        title: "Email confirmed",
        description: "Your client account is now active.",
      });
      navigate("/client/dashboard");
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
      const response = await fetch("/api/client-auth/resend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: confirmationEmail }),
      });
      const data = (await response.json().catch(() => ({}))) as AuthResponse;
      if (!response.ok) {
        throw new Error(data.error || "Failed to resend code");
      }
      toast({
        title: "Code resent",
        description: `We sent a new code to ${confirmationEmail}.`,
      });
      if (data.devConfirmationCode) {
        toast({ title: "Dev confirmation code", description: data.devConfirmationCode });
      }
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

        <div className="rounded-2xl bg-card p-8 shadow-lg">
          <div className="mb-8 text-center">
            <h1 className="mb-1 font-display text-2xl font-bold text-foreground">
              {step === "confirm" ? "Confirm Email" : isLogin ? "Employer Login" : "Create Client Account"}
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
                  <label className="mb-1 block font-body text-xs uppercase tracking-wider text-muted-foreground">Company Name</label>
                  <input
                    type="text"
                    value={company}
                    onChange={(event) => setCompany(event.target.value)}
                    className="w-full rounded-lg border bg-background px-3 py-2.5 font-body text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    placeholder="Your company"
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

            <Button type="submit" size="lg" className="w-full font-body" disabled={isSubmitting}>
              {isSubmitting ? "Please wait..." : isLogin ? "Sign In" : "Create Account"}
            </Button>
            </form>
          )}

          <div className="mt-6 text-center">
            <p className="font-body text-sm text-muted-foreground">
              {isLogin ? "Don't have an account?" : "Already have an account?"}{" "}
              <button onClick={() => setIsLogin((value) => !value)} className="font-medium text-primary hover:underline">
                {isLogin ? "Sign Up" : "Sign In"}
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClientEmployerLogin;
