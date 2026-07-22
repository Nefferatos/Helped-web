import { useEffect, useState, type ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import {
  clearSupabaseSessionStorage,
  hasActiveClientSession,
  isClientLogoutPending,
  syncClientProfileFromSession,
} from "@/lib/supabaseAuth";
import { buildEmployerLoginPath } from "@/lib/clientNavigation";

const ProtectedClientRoute = ({ children }: { children: ReactNode }) => {
  const location = useLocation();
  const [status, setStatus] = useState<"checking" | "allowed" | "denied">("checking");

  useEffect(() => {
    let cancelled = false;

    const validate = async () => {
      try {
        if (isClientLogoutPending()) {
          throw new Error("Logout in progress");
        }

        const isAuthenticated = await hasActiveClientSession();
        if (!isAuthenticated) {
          throw new Error("No active Supabase session");
        }

        await syncClientProfileFromSession();
        if (!cancelled) setStatus("allowed");
      } catch {
        clearSupabaseSessionStorage();
        if (!cancelled) setStatus("denied");
      }
    };

    void validate();
    return () => {
      cancelled = true;
    };
  }, []);

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
    // Preserve the exact URL the user was trying to reach (path + filters) so
    // that after they sign in they land back on it, instead of dumping them on
    // the home page and losing their intended destination.
    const returnTo = `${location.pathname}${location.search}${location.hash}`;
    return <Navigate to={buildEmployerLoginPath(returnTo)} replace />;
  }

  return <>{children}</>;
};

export default ProtectedClientRoute;

