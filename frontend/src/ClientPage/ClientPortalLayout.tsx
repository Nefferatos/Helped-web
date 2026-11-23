import { useEffect } from "react";
import { Outlet } from "react-router-dom";
import ClientPortalNavbar from "@/ClientPage/ClientPortalNavbar";
import { clientFetch } from "@/lib/supabaseAuth";
import "@/ClientPage/ClientPortalText.css";

const ClientPortalLayout = () => {
  useEffect(() => {
    const heartbeat = () => {
      if (document.visibilityState !== "visible") return;
      void clientFetch("/api/chats/client/heartbeat", { method: "POST", keepalive: true }).catch(() => {});
    };
    heartbeat();
    const interval = window.setInterval(heartbeat, 20_000);
    document.addEventListener("visibilitychange", heartbeat);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", heartbeat);
    };
  }, []);

  return (
    <div className="client-portal-shell min-h-screen bg-background">
      <ClientPortalNavbar />
      <Outlet />
    </div>
  );
};

export default ClientPortalLayout;

