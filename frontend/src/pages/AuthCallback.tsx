import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import { finalizeClientLoginFromSupabase } from "@/lib/supabaseAuth";
import { toast } from "@/components/ui/sonner";

// OAuth callback landing page.
// Supabase parses the auth response and stores the session. We then fetch `/api/client-auth/me`
// to create/link an app client record and redirect to the dashboard.
const AuthCallback = () => {
  const navigate = useNavigate();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      try {
        if (!supabase) {
          throw new Error("Supabase is not configured for this build.");
        }
        const { data, error } = await supabase.auth.getSession();
        if (error) throw error;
        const accessToken = data.session?.access_token;
        if (!accessToken) {
          throw new Error("No Supabase session found. Please try signing in again.");
        }

        await finalizeClientLoginFromSupabase(accessToken);
        toast.success("Signed in successfully");
        navigate("/client/dashboard", { replace: true });
      } catch (err) {
        const message = err instanceof Error ? err.message : "OAuth sign-in failed";
        if (!cancelled) setErrorMessage(message);
        toast.error(message);
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted p-6">
      <div className="rounded-xl border bg-card px-6 py-5 text-sm text-muted-foreground shadow-sm">
        {errorMessage ? errorMessage : "Completing sign-in..."}
      </div>
    </div>
  );
};

export default AuthCallback;
