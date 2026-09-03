import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getAgencyAdminAuthHeaders } from "@/lib/agencyAdminAuth";
import { adminPath } from "@/lib/routes";
import { toast } from "@/components/ui/sonner";

/**
 * TikTok OAuth callback page.
 * TikTok redirects here after the user authorizes the app.
 * We exchange the authorization code for an access token via the backend.
 */
const TikTokCallback = () => {
  const navigate = useNavigate();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("Connecting your TikTok account...");

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      try {
        const params = new URLSearchParams(window.location.search);
        const code = params.get("code");
        const error = params.get("error");
        const allParams = window.location.search;

        if (error) {
          throw new Error(
            params.get("error_description") || `TikTok authorization failed: ${error}`
          );
        }

        if (!code) {
          const debugInfo = allParams
            ? `TikTok returned: ${allParams}`
            : "TikTok redirected without any parameters. Check your TikTok Developer Portal: ensure the redirect URI is exactly https://rinzinagency.com/auth/tiktok/callback";
          throw new Error(`No authorization code received from TikTok. ${debugInfo}`);
        }

        // Exchange code for token via backend
        const res = await fetch("/api/tiktok/callback", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...getAgencyAdminAuthHeaders(),
          },
          body: JSON.stringify({ code }),
        });

        const data = (await res.json().catch(() => ({}))) as {
          ok?: boolean;
          message?: string;
          profile?: { displayName?: string };
          error?: string;
        };

        if (!res.ok || !data.ok) {
          throw new Error(data.error || "Failed to connect TikTok account.");
        }

        if (!cancelled) {
          setStatus("success");
          setMessage(
            `TikTok account connected${data.profile?.displayName ? ` as ${data.profile.displayName}` : ""}!`
          );
          toast.success("TikTok account connected successfully!");
          setTimeout(() => navigate(adminPath("/tiktok"), { replace: true }), 2000);
        }
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : "TikTok connection failed";
        if (!cancelled) {
          setStatus("error");
          setMessage(errorMsg);
          toast.error(errorMsg);
        }
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted p-6">
      <div className="rounded-xl border bg-card px-8 py-6 text-center shadow-sm max-w-md">
        {status === "loading" && (
          <div className="space-y-3">
            <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            <p className="text-sm text-muted-foreground">{message}</p>
          </div>
        )}
        {status === "success" && (
          <div className="space-y-3">
            <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-green-100">
              <svg
                className="h-5 w-5 text-green-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <p className="text-sm font-medium text-green-700">{message}</p>
            <p className="text-xs text-muted-foreground">Redirecting to dashboard...</p>
          </div>
        )}
        {status === "error" && (
          <div className="space-y-3">
            <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-red-100">
              <svg
                className="h-5 w-5 text-red-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </div>
            <p className="text-sm font-medium text-red-700">{message}</p>
            <button
              onClick={() => navigate(adminPath("/tiktok"), { replace: true })}
              className="mt-2 text-xs text-primary underline hover:no-underline"
            >
              Return to dashboard
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default TikTokCallback;