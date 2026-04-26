import { useEffect, useState, type ReactNode } from "react";
import { Navigate } from "react-router-dom";
import {
  clearSupabaseSessionStorage,
  hasActiveClientSession,
  isClientLogoutPending,
  syncClientProfileFromSession,
} from "@/lib/supabaseAuth";

const ProtectedClientRoute = ({ children }: { children: ReactNode }) => {
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
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

export default ProtectedClientRoute;

