import { useEffect, useState } from "react";
import { ArrowLeft, Eye, EyeOff } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/sonner";
import {
  clearAgencyAdminAuth,
  getAgencyAdminToken,
  saveAgencyAdminAuth,
} from "@/lib/agencyAdminAuth";
import { adminPath } from "@/lib/routes";

interface AgencyAuthResponse {
  error?: string;
  token?: string;
  admin?: {
    id: number;
    username: string;
    agencyName: string;
    createdAt: string;
  };
}

const AgencyAdminLogin = () => {
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [agencyName, setAgencyName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (getAgencyAdminToken()) {
      navigate(adminPath("/dashboard"));
    }
  }, [navigate]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    try {
      setIsSubmitting(true);
      const endpoint = isLogin
        ? "/api/agency-auth/login"
        : "/api/agency-auth/register";
      const payload = isLogin
        ? { username, password }
        : { username, password, agencyName };

      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await response
        .json()
        .catch(() => ({}))) as AgencyAuthResponse;

      if (!response.ok || !data.token || !data.admin) {
        throw new Error(data.error || "Agency admin authentication failed");
      }

      saveAgencyAdminAuth(data.token, data.admin);
      toast.success(
        isLogin ? "Agency admin logged in" : "Agency admin account created",
      );
      navigate(adminPath("/dashboard"));
    } catch (error) {
      clearAgencyAdminAuth();
      toast.error(
        error instanceof Error ? error.message : "Unable to continue",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="client-page-theme flex min-h-screen items-center justify-center bg-muted p-4">
      <div className="w-full max-w-md">
        <Link
          to="/"
          className="mb-8 inline-flex items-center gap-2 font-body text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Home
        </Link>

        <div className="rounded-2xl bg-card p-8 shadow-lg">
          <div className="mb-8 text-center">
            <h1 className="mb-1 font-display text-2xl font-bold text-foreground">
              {isLogin ? "Agency Portal Login" : "Create Agency Portal Account"}
            </h1>
            <p className="font-body text-sm text-muted-foreground">
              {!isLogin &&
                "Register a new agency portal account to access the admin dashboard."}
            </p>
          </div>

          <form
            onSubmit={(event) => void handleSubmit(event)}
            className="space-y-4"
          >
            {!isLogin ? (
              <div>
                <label className="mb-1 block font-body text-xs uppercase tracking-wider text-muted-foreground">
                  Agency Name
                </label>
                <input
                  type="text"
                  value={agencyName}
                  onChange={(event) => setAgencyName(event.target.value)}
                  className="w-full rounded-lg border bg-background px-3 py-2.5 font-body text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  placeholder="Your agency name"
                  required
                />
              </div>
            ) : null}

            <div>
              <label className="mb-1 block font-body text-xs uppercase tracking-wider text-muted-foreground">
                Username
              </label>
              <input
                type="text"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                className="w-full rounded-lg border bg-background px-3 py-2.5 font-body text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="username or email"
                required
              />
            </div>

            <div>
              <label className="mb-1 block font-body text-xs uppercase tracking-wider text-muted-foreground">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="w-full rounded-lg border bg-background px-3 py-2.5 pr-10 font-body text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  placeholder="Password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((value) => !value)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              size="lg"
              className="w-full font-body"
              disabled={isSubmitting}
            >
              {isSubmitting
                ? "Please wait..."
                : isLogin
                  ? "Sign In to Agency Portal"
                  : "Create Agency Portal"}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="font-body text-sm text-muted-foreground">
              {isLogin
                ? "Need a new agency portal?"
                : "Already have an agency portal?"}{" "}
              <button
                onClick={() => setIsLogin((value) => !value)}
                className="font-medium text-primary hover:underline"
              >
                {isLogin ? "Register Here" : "Sign In"}
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AgencyAdminLogin;
