import { Outlet } from "react-router-dom";
import ClientPortalNavbar from "@/ClientPage/ClientPortalNavbar";
import "@/ClientPage/ClientPortalText.css";

const ClientPortalLayout = () => {
  return (
    <div className="client-portal-shell min-h-screen bg-background">
      <ClientPortalNavbar />
      <Outlet />
    </div>
  );
};

export default ClientPortalLayout;

