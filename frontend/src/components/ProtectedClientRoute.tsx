import { useEffect, useState, type ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { clearClientAuth, getClientToken } from "@/lib/clientAuth";
import { finalizeClientLoginFromSupabase } from "@/lib/supabaseAuth";

const ProtectedClientRoute = ({ children }: { children: ReactNode }) => {
  const token = getClientToken();
  const [status, setStatus] = useState<"checking" | "allowed" | "denied">(token ? "checking" : "denied");

  useEffect(() => {
    if (!token) {
      setStatus("denied");
      return;
    }

    let cancelled = false;

    const validate = async () => {
      try {
        await finalizeClientLoginFromSupabase(token);
        if (!cancelled) setStatus("allowed");
      } catch {
        clearClientAuth();
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
    return <Navigate to="/employer-login" replace />;
  }

  return <>{children}</>;
};

export default ProtectedClientRoute;

