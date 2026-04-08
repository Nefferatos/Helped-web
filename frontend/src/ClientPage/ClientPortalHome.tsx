import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import ClientLandingPage from "@/ClientPage/ClientLandingPage";

const ClientPortalHome = () => {
  const location = useLocation();

  useEffect(() => {
    if (!location.hash) return;
    const id = location.hash.slice(1);
    const el = document.getElementById(id);
    if (!el) return;
    setTimeout(() => {
      el.scrollIntoView({ behavior: "smooth" });
    }, 50);
  }, [location.hash]);

  return <ClientLandingPage embedded />;
};

export default ClientPortalHome;

