import { useEffect, useState } from "react";
import { getAgencyAdminAuthHeaders } from "@/lib/agencyAdminAuth";
import { toast } from "@/components/ui/sonner";
import { Button } from "@/components/ui/button";

interface TikTokStatus {
  connected: boolean;
  profile?: { displayName?: string; avatarUrl?: string; openId?: string };
  connectedAt?: string;
  expiresAt?: string;
}

const TikTokIntegrationCard = () => {
  const [status, setStatus] = useState<TikTokStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);

  const fetchStatus = async () => {
    try {
      const res = await fetch("/api/tiktok/status", {
        headers: { ...getAgencyAdminAuthHeaders() },
      });
      setStatus((await res.json()) as TikTokStatus);
    } catch {
      setStatus({ connected: false });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void fetchStatus(); }, []);

  const handleConnect = async () => {
    setConnecting(true);
    try {
      const res = await fetch("/api/tiktok/auth-url", {
        headers: { ...getAgencyAdminAuthHeaders() },
      });
      const data = (await res.json().catch(() => ({}))) as { authUrl?: string; error?: string };
      if (!res.ok || !data.authUrl) throw new Error(data.error || "Failed to generate TikTok authorization URL");
      window.location.href = data.authUrl;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to connect TikTok");
      setConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      const res = await fetch("/api/tiktok/disconnect", {
        method: "POST",
        headers: { ...getAgencyAdminAuthHeaders() },
      });
      if (!res.ok) throw new Error("Failed to disconnect");
      toast.success("TikTok account disconnected");
      setStatus({ connected: false });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to disconnect");
    }
  };

  if (loading) {
    return (
      <div className="rounded-[32px] border bg-card/95 p-6 shadow-sm sm:p-8">
        <div className="flex items-center gap-3">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <span className="text-sm text-muted-foreground">Checking TikTok connection...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-[32px] border bg-card/95 p-6 shadow-sm sm:p-8">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-primary">Social Integration</p>
          <h2 className="mt-2 font-display text-xl font-bold text-foreground sm:text-2xl">TikTok Connection</h2>
          <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
            Connect your TikTok account to enable automated content posting via the Content Engine.
          </p>
        </div>
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-black">
          <svg viewBox="0 0 24 24" className="h-6 w-6 text-white" fill="currentColor">
            <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1v-3.5a6.37 6.37 0 0 0-.79-.05A6.34 6.34 0 0 0 3.15 15a6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.34-6.34V8.73a8.19 8.19 0 0 0 4.76 1.52v-3.4a4.85 4.85 0 0 1-1-.16z" />
          </svg>
        </div>
      </div>

      {status?.connected ? (
        <div className="mt-6 space-y-4">
          <div className="flex items-center gap-3 rounded-2xl border border-green-200 bg-green-50 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100">
              <svg className="h-5 w-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-green-800">
                Connected{status.profile?.displayName ? ` as ${status.profile.displayName}` : ""}
              </p>
              {status.connectedAt && (
                <p className="text-xs text-green-600">Connected on {new Date(status.connectedAt).toLocaleDateString()}</p>
              )}
            </div>
            {status.profile?.avatarUrl && (
              <img src={status.profile.avatarUrl} alt="TikTok avatar" className="h-10 w-10 rounded-full" />
            )}
          </div>
          <Button variant="outline" onClick={() => void handleDisconnect()} className="rounded-xl">
            Disconnect TikTok
          </Button>
        </div>
      ) : (
        <div className="mt-6">
          <div className="rounded-2xl border border-dashed p-6 text-center">
            <p className="text-sm text-muted-foreground">
              No TikTok account connected. Connect your account to enable content posting.
            </p>
            <Button
              onClick={() => void handleConnect()}
              disabled={connecting}
              className="mt-4 rounded-xl bg-black text-white hover:bg-gray-800"
            >
              {connecting ? "Connecting..." : "Connect TikTok Account"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

const AiAutomationPage = () => {
  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,hsl(var(--background))_0%,hsl(var(--muted))_100%)]">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-8 sm:px-6 lg:px-8">
        <section className="rounded-[32px] border bg-card/95 p-6 shadow-sm sm:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-primary">Social Integration</p>
          <h1 className="mt-3 font-display text-3xl font-bold text-foreground sm:text-4xl">
            TikTok Integration
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">
            Connect your TikTok account to enable automated content posting via Make.com.
            Authorize access through TikTok Login Kit to get started.
          </p>
        </section>

        <TikTokIntegrationCard />
      </div>
    </div>
  );
};

export default AiAutomationPage;
