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
import ClientHistoryPage from "@/ClientPage/ClientHistoryPage";
import ClientLandingPage from "@/ClientPage/ClientLandingPage";
import ClientMaidsPage from "@/ClientPage/ClientMaidsPage";
import MaidSearchPage from "@/ClientPage/MaidSearchPage";
import ClientProfilePage from "@/ClientPage/ClientProfilePage";
import ClientPortalLayout from "@/ClientPage/ClientPortalLayout";
import ClientPortalHome from "@/ClientPage/ClientPortalHome";
import ClientRequestsPage from "@/ClientPage/ClientRequestsPage";
import ClientChangePasswordPage from "@/ClientPage/ClientChangePasswordPage";
import AgenciesPage from "@/pages/AgenciesPage";
import AgencyDetailsPage from "@/pages/AgencyDetailsPage";
import HiringProcessPage from "@/pages/HiringProcessPage";
import HomePage from "@/pages/HomePage";
import AgencyProfile from "@/pages/AgencyProfile";
import AgencyProfileEdit from "@/pages/AgencyProfileEdit";
import AgencyAdminLogin from "@/pages/AgencyAdminLogin";
import AddMaid from "@/pages/AddMaid";
import EditMaids from "@/pages/EditMaids";
import MaidProfile from "@/pages/MaidProfile";
import MaidProfileFullView from "@/pages/MaidProfileFullView";
import EditMaid from "@/pages/EditMaidProfile";
import PublicMaidProfile from "@/pages/PublicMaidProfile";
import ChangePassword from "@/pages/ChangePassword";
import Enquiry from "@/pages/Enquiry";
import EmploymentContracts from "@/pages/EmploymentContracts";
import EmploymentContractView from "@/pages/EmploymentContractView";
import AdminSupportChat from "@/pages/AdminSupportChat";
import RequestsPage from "@/pages/RequestsPage";
import NotFound from "@/pages/NotFound";
import AuthCallback from "@/pages/AuthCallback";
import { clearAgencyAdminAuth, getAgencyAdminAuthHeaders, getAgencyAdminToken, saveAgencyAdminAuth } from "@/lib/agencyAdminAuth";
import { getClientToken } from "@/lib/clientAuth";
import { clearClientAuth } from "@/lib/clientAuth";
import { supabase } from "@/lib/supabaseClient";
import { finalizeClientLoginFromSupabase } from "@/lib/supabaseAuth";
import { getSessionFromUrlCompat } from "@/lib/supabaseSessionFromUrl";
import { adminPath } from "@/lib/routes";
import ProtectedClientRoute from "@/components/ProtectedClientRoute";
import AboutUs from "./ClientPage/AboutUs";
import ContactUS from "./ClientPage/ContactUs";
import Enquiry2 from "./ClientPage/Enquiry";
import ServiceDetail from "./ClientPage/ServiceDetails";
import FaqPage from "./ClientPage/FAQPage";



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

const ClientHomeRedirect = () => {
  const token = getClientToken();
  return token ? <Navigate to="/client/home" replace /> : <ClientLandingPage />;
};

const App = () => {
  useEffect(() => {
    if (!supabase) return;

    // On app load, fetch session (important after email confirmation redirect).
    void (async () => {
      // 1) Restore session from URL (email confirmation / OAuth PKCE redirects).
      // Requested behavior:
      //   const { data, error } = await supabase.auth.getSessionFromUrl();
      //   if (data?.session) console.log("Session restored:", data.session);
      //   window.history.replaceState({}, document.title, window.location.pathname);
      try {
        const compat = await getSessionFromUrlCompat(supabase);
        const authAny = supabase.auth as unknown as {
          getSessionFromUrl?: () => Promise<{ data?: { session?: unknown | null }; error?: unknown | null }>;
        };

        if (!authAny.getSessionFromUrl) {
          authAny.getSessionFromUrl = async () => {
            return { data: compat.data, error: compat.error };
          };
        }

        const { data, error } = await authAny.getSessionFromUrl();
        if (error) {
          console.error("Error getting session from URL:", error);
        }
        if (data?.session) {
          console.log("Session restored:", data.session);
        }

        if (compat.urlHadAuthParams) {
          window.history.replaceState({}, document.title, window.location.pathname);
        }
      } catch (error) {
        console.error("Error getting session from URL:", error);
      }

      // 2) Fallback: existing session check
      const { data: { session } = { session: null } } = await supabase.auth.getSession();
      if (session?.user) {
        console.log("Existing session:", session.user);
        if (session.access_token) {
          try {
            await finalizeClientLoginFromSupabase(session.access_token);
          } catch (error) {
            console.error("Failed to mirror Supabase session into app auth:", error);
          }
        }
      }
    })();

    // Keep app auth in sync with Supabase auth state changes.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log("Auth state changed:", event, session);
      if (session?.user) {
        console.log("User logged in:", session.user);
        if (session.access_token) {
          void finalizeClientLoginFromSupabase(session.access_token).catch((error) => {
            console.error("Failed to mirror Supabase session into app auth:", error);
          });
        }
        return;
      }

      if (event === "SIGNED_OUT") {
        clearClientAuth();
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <Routes>
            <Route path="/employer-login" element={<ClientEmployerLogin />} />
            <Route path="/auth/callback" element={<AuthCallback />} />
            <Route path="/agencies" element={<AgenciesPage />} />
            <Route path="/agencies/:id" element={<AgencyDetailsPage />} />
            <Route path="/agencyadmin/login" element={<AgencyAdminLogin />} />
            <Route path="/agencyadmin" element={<AdminIndexRedirect />} />
            <Route path="/agencyadmin/dashboard" element={<ProtectedAdminRoute><AdminShell><HomePage /></AdminShell></ProtectedAdminRoute>} />
            <Route path="/agencyadmin/agency-profile" element={<ProtectedAdminRoute><AdminShell><AgencyProfile /></AdminShell></ProtectedAdminRoute>} />
            <Route path="/agencyadmin/agency-profile/edit" element={<ProtectedAdminRoute><AdminShell><AgencyProfileEdit /></AdminShell></ProtectedAdminRoute>} />
            <Route path="/agencyadmin/add-maid" element={<ProtectedAdminRoute><AdminShell><AddMaid /></AdminShell></ProtectedAdminRoute>} />
            <Route path="/agencyadmin/edit-maids" element={<ProtectedAdminRoute><AdminShell><EditMaids /></AdminShell></ProtectedAdminRoute>} />
            <Route path="/agencyadmin/maid/:refCode" element={<ProtectedAdminRoute><AdminShell><MaidProfile /></AdminShell></ProtectedAdminRoute>} />
            <Route path="/agencyadmin/maid/:refCode/full" element={<ProtectedAdminRoute><AdminShell><MaidProfileFullView /></AdminShell></ProtectedAdminRoute>} />
            <Route path="/agencyadmin/maid/:refCode/edit" element={<ProtectedAdminRoute><AdminShell><EditMaid /></AdminShell></ProtectedAdminRoute>} />
            <Route path="/agencyadmin/change-password" element={<ProtectedAdminRoute><AdminShell><ChangePassword /></AdminShell></ProtectedAdminRoute>} />
            <Route path="/agencyadmin/enquiry" element={<ProtectedAdminRoute><AdminShell><Enquiry /></AdminShell></ProtectedAdminRoute>} />
            <Route path="/agencyadmin/requests" element={<ProtectedAdminRoute><AdminShell><RequestsPage /></AdminShell></ProtectedAdminRoute>} />
            <Route path="/agencyadmin/chat-support" element={<ProtectedAdminRoute><AdminShell><AdminSupportChat /></AdminShell></ProtectedAdminRoute>} />
            <Route path="/agencyadmin/employment-contracts" element={<ProtectedAdminRoute><AdminShell><EmploymentContracts /></AdminShell></ProtectedAdminRoute>} />
            <Route path="/agencyadmin/employment-contracts/new" element={<ProtectedAdminRoute><AdminShell><EmploymentContractView /></AdminShell></ProtectedAdminRoute>} />
            <Route path="/agencyadmin/employment-contracts/:refCode" element={<ProtectedAdminRoute><AdminShell><EmploymentContractView /></AdminShell></ProtectedAdminRoute>} />
            <Route path="/agencyadmin/employment-contracts/:refCode/edit" element={<ProtectedAdminRoute><AdminShell><EmploymentContractView /></AdminShell></ProtectedAdminRoute>} />
            <Route path="/client" element={<ProtectedClientRoute><ClientPortalLayout /></ProtectedClientRoute>}>
              <Route index element={<Navigate to="home" replace />} />
              <Route path="home" element={<ClientPortalHome />} />
              <Route path="about" element={<AboutUs embedded />} />
              <Route path="enquiry" element={<Enquiry2 embedded />} />
              <Route path="contact" element={<ContactUS embedded />} />
              <Route path="maids" element={<ClientMaidsPage />} />
              <Route path="maids/search" element={<MaidSearchPage />} />
              <Route path="faq" element={<FaqPage />} />
              <Route path="requests" element={<ClientRequestsPage />} />
              <Route path="messages" element={<Navigate to="../support-chat" replace />} />
              <Route path="support-chat" element={<ClientSupportChat />} />
              <Route path="profile" element={<ClientProfilePage />} />
              <Route path="change-password" element={<ClientChangePasswordPage />} />
              <Route path="history" element={<ClientHistoryPage />} />
              {/* Keep existing dashboard route working */}
              <Route path="dashboard" element={<ClientDashboard />} />
            </Route>
            <Route path="/hire/:refCode" element={<HiringProcessPage />} />
            <Route path="/maids/:refCode" element={<PublicMaidProfile />} />
            <Route path="/agency-portal" element={<AgenciesPage />} />
            <Route path="/agencyportal" element={<AgenciesPage />} />
            <Route path="/agency-admin-portal" element={<Navigate to="/agencyadmin/login" replace />} />
            <Route path="/agencyadminportal" element={<Navigate to="/agencyadmin/login" replace />} />
            <Route path="/user-portal" element={<ClientHomeRedirect />} />
            <Route path="/userportal" element={<ClientHomeRedirect />} />
            <Route path="/" element={<ClientHomeRedirect />} />
            <Route path="*" element={<NotFound />} />
            <Route path="/about" element={<AboutUs />} />
            <Route path="/contact" element={<ContactUS />} />
            <Route path="/enquiry2" element={<Enquiry2 />} />
            <Route path="/services/:slug" element={<ServiceDetail />} />
            <Route path="/employer/new" element={<Navigate to="/agencyadmin/employment-contracts/new" replace />} />
            <Route path="/employer/:refCode" element={<Navigate to="/agencyadmin/employment-contracts" replace />} />
            <Route path="/faq" element={<FaqPage />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
