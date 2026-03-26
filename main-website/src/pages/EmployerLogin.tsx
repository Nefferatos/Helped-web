import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Eye, EyeOff } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const EmployerLogin = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [company, setCompany] = useState("");
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    toast({
      title: isLogin ? "Login Successful" : "Account Created",
      description: isLogin
        ? "Welcome back to MaidAgency!"
        : "Your employer account has been created successfully.",
    });
  };

  return (
    <div className="min-h-screen bg-muted flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Link to="/" className="inline-flex items-center gap-2 font-body text-sm text-muted-foreground hover:text-foreground transition-colors mb-8">
          <ArrowLeft className="w-4 h-4" /> Back to Home
        </Link>

        <div className="bg-card rounded-2xl shadow-lg p-8">
          <div className="text-center mb-8">
            <h1 className="font-display text-2xl font-bold text-foreground mb-1">
              {isLogin ? "Employer Login" : "Create Account"}
            </h1>
            <p className="font-body text-sm text-muted-foreground">
              {isLogin
                ? "Sign in to manage your domestic staff"
                : "Register as an employer to get started"}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <>
                <div>
                  <label className="font-body text-xs text-muted-foreground uppercase tracking-wider mb-1 block">Full Name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2.5 font-body text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    placeholder="John Doe"
                    required
                  />
                </div>
                <div>
                  <label className="font-body text-xs text-muted-foreground uppercase tracking-wider mb-1 block">Company Name</label>
                  <input
                    type="text"
                    value={company}
                    onChange={(e) => setCompany(e.target.value)}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2.5 font-body text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    placeholder="Your company"
                  />
                </div>
              </>
            )}

            <div>
              <label className="font-body text-xs text-muted-foreground uppercase tracking-wider mb-1 block">Email Address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg border border-border bg-background px-3 py-2.5 font-body text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="employer@company.com"
                required
              />
            </div>

            <div>
              <label className="font-body text-xs text-muted-foreground uppercase tracking-wider mb-1 block">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2.5 pr-10 font-body text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {isLogin && (
              <div className="text-right">
                <a href="#" className="font-body text-xs text-primary hover:underline">Forgot password?</a>
              </div>
            )}

            <Button type="submit" size="lg" className="w-full font-body">
              {isLogin ? "Sign In" : "Create Account"}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="font-body text-sm text-muted-foreground">
              {isLogin ? "Don't have an account?" : "Already have an account?"}{" "}
              <button
                onClick={() => setIsLogin(!isLogin)}
                className="text-primary font-medium hover:underline"
              >
                {isLogin ? "Sign Up" : "Sign In"}
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmployerLogin;
