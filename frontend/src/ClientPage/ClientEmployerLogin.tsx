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
  client?: {
    id: number;
    name: string;
    company?: string;
    email: string;
    createdAt: string;
  };
}

const ClientEmployerLogin = () => {
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [company, setCompany] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    try {
      setIsSubmitting(true);
      const endpoint = isLogin ? "/api/client-auth/login" : "/api/client-auth/register";
      const payload = isLogin
        ? { email, password }
        : { name, company, email, password };

      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await response.json().catch(() => ({}))) as AuthResponse;

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

  return (
    <div className="client-page-theme flex min-h-screen items-center justify-center bg-muted p-4">
      <div className="w-full max-w-md">
        <Link to="/" className="mb-8 inline-flex items-center gap-2 font-body text-sm text-muted-foreground transition-colors hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Back to Home
        </Link>

        <div className="rounded-2xl bg-card p-8 shadow-lg">
          <div className="mb-8 text-center">
            <h1 className="mb-1 font-display text-2xl font-bold text-foreground">
              {isLogin ? "Employer Login" : "Create Client Account"}
            </h1>
            <p className="font-body text-sm text-muted-foreground">
              {isLogin ? "Sign in to view only the maids assigned to you." : "Register as a client to receive assigned maid profiles."}
            </p>
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
                  <label className="mb-1 block font-body text-xs uppercase tracking-wider text-muted-foreground">Company Name</label>
                  <input
                    type="text"
                    value={company}
                    onChange={(event) => setCompany(event.target.value)}
                    className="w-full rounded-lg border bg-background px-3 py-2.5 font-body text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    placeholder="Your company"
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
