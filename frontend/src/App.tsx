import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { useEffect, useState, type ReactNode } from "react";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import AppLayout from "@/components/AppLayout";
import ClientEmployerLogin from "@/ClientPage/ClientEmployerLogin";
import ClientSupportChat from "@/ClientPage/ClientSupportChat";
import ClientDashboard from "@/ClientPage/ClientDashboard";
import ClientLandingPage from "@/ClientPage/ClientLandingPage";
import AgenciesPage from "@/pages/AgenciesPage";
import AgencyDetailsPage from "@/pages/AgencyDetailsPage";
import HiringProcessPage from "@/pages/HiringProcessPage";
import HomePage from "@/pages/HomePage";
import AgencyProfile from "@/pages/AgencyProfile";
import AgencyProfileEdit from "@/pages/AgencyProfileEdit";
import AgencyAdminLogin from "@/pages/AgencyAdminLogin";
import AddMaid from "@/pages/AddMaid";
import EditMaid from "@/pages/EditMaid";
import EditMaids from "@/pages/EditMaids";
import MaidProfile from "@/pages/MaidProfile";
import PublicMaidProfile from "@/pages/PublicMaidProfile";
import ChangePassword from "@/pages/ChangePassword";
import Enquiry from "@/pages/Enquiry";
import EmploymentContracts from "@/pages/EmploymentContracts";
import AdminSupportChat from "@/pages/AdminSupportChat";
import RequestsPage from "@/pages/RequestsPage";
import NotFound from "@/pages/NotFound";
import { clearAgencyAdminAuth, getAgencyAdminAuthHeaders, getAgencyAdminToken, saveAgencyAdminAuth } from "@/lib/agencyAdminAuth";
import { adminPath } from "@/lib/routes";

const queryClient = new QueryClient();

const AdminShell = ({ children }: { children: ReactNode }) => <AppLayout>{children}</AppLayout>;

interface AgencyAdminMeResponse {
  error?: string;
  admin?: {
    id: number;
    username: string;
    agencyName: string;
    createdAt: string;
  };
}

const ProtectedAdminRoute = ({ children }: { children: ReactNode }) => {
  const token = getAgencyAdminToken();
  const [status, setStatus] = useState<"checking" | "allowed" | "denied">(
    token ? "checking" : "denied",
  );

  useEffect(() => {
    if (!token) {
      setStatus("denied");
      return;
    }

    let cancelled = false;

    const validateSession = async () => {
      try {
        const response = await fetch("/api/agency-auth/me", {
          headers: { ...getAgencyAdminAuthHeaders() },
        });
        const data = (await response.json().catch(() => ({}))) as AgencyAdminMeResponse;

        if (!response.ok || !data.admin) {
          throw new Error(data.error || "Unauthorized");
        }

        if (!cancelled) {
          saveAgencyAdminAuth(token, data.admin);
          setStatus("allowed");
        }
      } catch {
        clearAgencyAdminAuth();
        if (!cancelled) {
          setStatus("denied");
        }
      }
    };

    void validateSession();

    return () => {
      cancelled = true;
    };
  }, [token]);

  if (status === "checking") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted p-6">
        <div className="rounded-xl border bg-card px-5 py-4 text-sm text-muted-foreground shadow-sm">
          Checking agency portal access...
        </div>
      </div>
    );
  }

  if (status === "denied") {
    return <Navigate to={adminPath("/login")} replace />;
  }

  return <>{children}</>;
};

const AdminIndexRedirect = () => {
  const token = getAgencyAdminToken();
  return <Navigate to={token ? adminPath("/dashboard") : adminPath("/login")} replace />;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<ClientLandingPage />} />
          <Route path="/employer-login" element={<ClientEmployerLogin />} />
          <Route path={adminPath("/login")} element={<AgencyAdminLogin />} />
          <Route path="/client/dashboard" element={<ClientDashboard />} />
          <Route path="/client/support-chat" element={<ClientSupportChat />} />
          <Route path="/agencies" element={<AgenciesPage />} />
          <Route path="/agencies/:id" element={<AgencyDetailsPage />} />
          <Route path="/hire/:refCode" element={<HiringProcessPage />} />
          <Route path="/maids/:refCode" element={<PublicMaidProfile />} />

          <Route path={adminPath()} element={<AdminIndexRedirect />} />
          <Route path={adminPath("/dashboard")} element={<ProtectedAdminRoute><AdminShell><HomePage /></AdminShell></ProtectedAdminRoute>} />
          <Route path={adminPath("/agency-profile")} element={<ProtectedAdminRoute><AdminShell><AgencyProfile /></AdminShell></ProtectedAdminRoute>} />
          <Route path={adminPath("/agency-profile/edit")} element={<ProtectedAdminRoute><AdminShell><AgencyProfileEdit /></AdminShell></ProtectedAdminRoute>} />
          <Route path={adminPath("/add-maid")} element={<ProtectedAdminRoute><AdminShell><AddMaid /></AdminShell></ProtectedAdminRoute>} />
          <Route path={adminPath("/edit-maids")} element={<ProtectedAdminRoute><AdminShell><EditMaids /></AdminShell></ProtectedAdminRoute>} />
          <Route path={adminPath("/maid/:refCode")} element={<ProtectedAdminRoute><AdminShell><MaidProfile /></AdminShell></ProtectedAdminRoute>} />
          <Route path={adminPath("/maid/:refCode/edit")} element={<ProtectedAdminRoute><AdminShell><EditMaid /></AdminShell></ProtectedAdminRoute>} />
          <Route path={adminPath("/change-password")} element={<ProtectedAdminRoute><AdminShell><ChangePassword /></AdminShell></ProtectedAdminRoute>} />
          <Route path={adminPath("/enquiry")} element={<ProtectedAdminRoute><AdminShell><Enquiry /></AdminShell></ProtectedAdminRoute>} />
          <Route path={adminPath("/requests")} element={<ProtectedAdminRoute><AdminShell><RequestsPage /></AdminShell></ProtectedAdminRoute>} />
          <Route path={adminPath("/chat-support")} element={<ProtectedAdminRoute><AdminShell><AdminSupportChat /></AdminShell></ProtectedAdminRoute>} />
          <Route path={adminPath("/employment-contracts")} element={<ProtectedAdminRoute><AdminShell><EmploymentContracts /></AdminShell></ProtectedAdminRoute>} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
