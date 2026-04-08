import { Outlet } from "react-router-dom";
import ClientPortalNavbar from "@/ClientPage/ClientPortalNavbar";

const ClientPortalLayout = () => {
  return (
    <div className="min-h-screen bg-background">
      <ClientPortalNavbar />
      <Outlet />
    </div>
  );
};

export default ClientPortalLayout;

