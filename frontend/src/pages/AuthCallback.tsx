import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import { getClientPostLoginPath } from "@/lib/clientNavigation";
import { finalizeClientLoginFromSupabase } from "@/lib/supabaseAuth";
import { toast } from "@/components/ui/sonner";
import { saveAgencyAdminAuth, type AgencyAdminUser } from "@/lib/agencyAdminAuth";
import { adminPath } from "@/lib/routes";

// OAuth callback landing page.
// Supabase parses the auth response and stores the session. We then fetch `/api/client-auth/me`
// to create/link an app client record and redirect to the dashboard.
const AuthCallback = () => {
  const navigate = useNavigate();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const params = new URLSearchParams(window.location.search);
    const mode = params.get("mode");
    const redirectTo = getClientPostLoginPath(params.get("redirectTo"));

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

        if (mode === "agency") {
          const response = await fetch("/api/agency-auth/me", {
            headers: {
              Authorization: `Bearer ${accessToken}`,
              Accept: "application/json",
            },
          });
          const payload = (await response.json().catch(() => ({}))) as {
            admin?: AgencyAdminUser;
            error?: string;
          };
          if (!response.ok || !payload.admin) {
            throw new Error(payload.error || "Unable to complete agency sign-in");
          }

          saveAgencyAdminAuth(accessToken, payload.admin);
          toast.success("Signed in successfully");
          navigate(adminPath("/dashboard"), { replace: true });
          return;
        }

        await finalizeClientLoginFromSupabase();
        toast.success("Signed in successfully");
        navigate(redirectTo, { replace: true });
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
