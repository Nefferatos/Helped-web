import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import type { ReactNode } from "react";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import AppLayout from "@/components/AppLayout";
import ClientEmployerLogin from "@/ClientPage/ClientEmployerLogin";
import ClientDashboard from "@/ClientPage/ClientDashboard";
import ClientLandingPage from "@/ClientPage/ClientLandingPage";
import HomePage from "@/pages/HomePage";
import AgencyProfile from "@/pages/AgencyProfile";
import AgencyProfileEdit from "@/pages/AgencyProfileEdit";
import AddMaid from "@/pages/AddMaid";
import EditMaid from "@/pages/EditMaid";
import EditMaids from "@/pages/EditMaids";
import MaidProfile from "@/pages/MaidProfile";
import PublicMaidProfile from "@/pages/PublicMaidProfile";
import ChangePassword from "@/pages/ChangePassword";
import Enquiry from "@/pages/Enquiry";
import EmploymentContracts from "@/pages/EmploymentContracts";
import NotFound from "@/pages/NotFound";
import { adminPath } from "@/lib/routes";

const queryClient = new QueryClient();

const AdminShell = ({ children }: { children: ReactNode }) => <AppLayout>{children}</AppLayout>;

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<ClientLandingPage />} />
          <Route path="/employer-login" element={<ClientEmployerLogin />} />
          <Route path="/client/dashboard" element={<ClientDashboard />} />
          <Route path="/maids/:refCode" element={<PublicMaidProfile />} />

          <Route path={adminPath()} element={<Navigate to={adminPath("/agency-profile")} replace />} />
          <Route path={adminPath("/dashboard")} element={<AdminShell><HomePage /></AdminShell>} />
          <Route path={adminPath("/agency-profile")} element={<AdminShell><AgencyProfile /></AdminShell>} />
          <Route path={adminPath("/agency-profile/edit")} element={<AdminShell><AgencyProfileEdit /></AdminShell>} />
          <Route path={adminPath("/add-maid")} element={<AdminShell><AddMaid /></AdminShell>} />
          <Route path={adminPath("/edit-maids")} element={<AdminShell><EditMaids /></AdminShell>} />
          <Route path={adminPath("/maid/:refCode")} element={<AdminShell><MaidProfile /></AdminShell>} />
          <Route path={adminPath("/maid/:refCode/edit")} element={<AdminShell><EditMaid /></AdminShell>} />
          <Route path={adminPath("/change-password")} element={<AdminShell><ChangePassword /></AdminShell>} />
          <Route path={adminPath("/enquiry")} element={<AdminShell><Enquiry /></AdminShell>} />
          <Route path={adminPath("/employment-contracts")} element={<AdminShell><EmploymentContracts /></AdminShell>} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
