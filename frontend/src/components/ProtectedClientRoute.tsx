import { useEffect, useState, type ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { clearClientAuth, getClientToken } from "@/lib/clientAuth";
import { supabase } from "@/lib/supabaseClient";
import {
  clearSupabaseSessionStorage,
  finalizeClientLoginFromSupabase,
  isClientLogoutPending,
} from "@/lib/supabaseAuth";

const ProtectedClientRoute = ({ children }: { children: ReactNode }) => {
  const token = getClientToken();
  const [status, setStatus] = useState<"checking" | "allowed" | "denied">(
    token && !isClientLogoutPending() ? "checking" : "denied",
  );

  useEffect(() => {
    if (!token || isClientLogoutPending() || !supabase) {
      clearClientAuth();
      clearSupabaseSessionStorage();
      setStatus("denied");
      return;
    }

    let cancelled = false;

    const validate = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (error || !data.session?.access_token) {
          throw error || new Error("No active Supabase session");
        }

        await finalizeClientLoginFromSupabase(data.session.access_token);
        if (!cancelled) setStatus("allowed");
      } catch {
        clearClientAuth();
        clearSupabaseSessionStorage();
        if (!cancelled) setStatus("denied");
      }
    };

    void validate();
    return () => {
      cancelled = true;
    };
  }, [token]);

  if (status === "checking") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted p-6">
        <div className="rounded-xl border bg-card px-5 py-4 text-sm text-muted-foreground shadow-sm">
          Checking client session...
        </div>
      </div>
    );
  }

  if (status === "denied") {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

export default ProtectedClientRoute;

