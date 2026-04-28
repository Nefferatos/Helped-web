import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { lazy, Suspense, useEffect, useState, type ComponentType, type LazyExoticComponent, type ReactNode } from "react";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import AppLayout from "@/components/AppLayout";
import {
  clearAgencyAdminAuth,
  getAgencyAdminAuthHeaders,
  getAgencyAdminToken,
  getStoredAgencyAdmin,
  saveAgencyAdminAuth,
} from "@/lib/agencyAdminAuth";
import { clearClientAuth } from "@/lib/clientAuth";
import { supabase } from "@/lib/supabaseClient";
import {
  clearSupabaseSessionStorage,
  hasActiveClientSession,
  isClientLogoutPending,
  syncClientProfileFromSession,
} from "@/lib/supabaseAuth";
import { adminPath } from "@/lib/routes";
import ProtectedClientRoute from "@/components/ProtectedClientRoute";

// FIX: Import ClientPortalLayout eagerly so it doesn't cause a second
// sequential chunk fetch when the user first hits any /client/* route.
// The layout is a lightweight shell that's always needed on the portal —
// making it lazy only adds a waterfall without saving meaningful bytes.
import ClientPortalLayout from "@/ClientPage/ClientPortalLayout";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

const RouteLoader = () => (
  <div className="flex min-h-[40vh] items-center justify-center p-6">
    <div className="rounded-xl border bg-card px-5 py-4 text-sm text-muted-foreground shadow-sm">
      Loading...
    </div>
  </div>
);

const lazyRoute = <T extends ComponentType<object>>(
  factory: () => Promise<{ default: T }>,
): LazyExoticComponent<T> => lazy(factory);

const AgenciesPage = lazyRoute(() => import("@/pages/AgenciesPage"));
const AgencyDetailsPage = lazyRoute(() => import("@/pages/AgencyDetailsPage"));
const HiringProcessPage = lazyRoute(() => import("@/pages/HiringProcessPage"));
const HomePage = lazyRoute(() => import("@/pages/HomePage"));
const AgencyProfile = lazyRoute(() => import("@/pages/AgencyProfile"));
const AgencyProfileEdit = lazyRoute(() => import("@/pages/AgencyProfileEdit"));
const AgencyAdminLogin = lazyRoute(() => import("@/pages/AgencyAdminLogin"));
const AddMaid = lazyRoute(() => import("@/pages/AddMaid"));
const EditMaids = lazyRoute(() => import("@/pages/EditMaids"));
const MaidProfile = lazyRoute(() => import("@/pages/MaidProfile"));
const MaidProfileFullView = lazyRoute(() => import("@/pages/MaidProfileFullView"));
const EditMaid = lazyRoute(() => import("@/pages/EditMaidProfile"));
const PublicMaidProfile = lazyRoute(() => import("@/pages/PublicMaidProfile"));
const ChangePassword = lazyRoute(() => import("@/pages/ChangePassword"));
const Enquiry = lazyRoute(() => import("@/pages/Enquiry"));
const EmploymentContracts = lazyRoute(() => import("@/pages/EmploymentContracts"));
const AddEmployment = lazyRoute(() => import("@/pages/AddEmployment"));
const EmploymentContractView = lazyRoute(() => import("@/pages/EmploymentContractView"));
const EditEmployer = lazyRoute(() => import("@/pages/EditEmployer"));
const AdminSupportChat = lazyRoute(() => import("@/pages/AdminSupportChat"));
const RequestsPage = lazyRoute(() => import("@/pages/RequestsPage"));
const NotFound = lazyRoute(() => import("@/pages/NotFound"));
const AuthCallback = lazyRoute(() => import("@/pages/AuthCallback"));
const PrivacyPolicy = lazyRoute(() => import("@/pages/PrivacyPolicy"));
const DataDeletion = lazyRoute(() => import("@/pages/DataDeletion"));
const AiAutomationPage = lazyRoute(() => import("@/pages/AiAutomationPage"));
const ClientEmployerLogin = lazyRoute(() => import("@/ClientPage/ClientEmployerLogin"));
const ClientSupportChat = lazyRoute(() => import("@/ClientPage/ClientSupportChat"));
const ClientDashboard = lazyRoute(() => import("@/ClientPage/ClientDashboard"));
const ClientHistoryPage = lazyRoute(() => import("@/ClientPage/ClientHistoryPage"));
const ClientLandingPage = lazyRoute(() => import("@/ClientPage/ClientLandingPage"));
const ClientMaidsPage = lazyRoute(() => import("@/ClientPage/ClientMaidsPage"));
const MaidSearchPage = lazyRoute(() => import("@/ClientPage/MaidSearchPage"));
const ClientProfilePage = lazyRoute(() => import("@/ClientPage/ClientProfilePage"));
const ClientPortalHome = lazyRoute(() => import("@/ClientPage/ClientPortalHome"));
const ClientRequestsPage = lazyRoute(() => import("@/ClientPage/ClientRequestsPage"));
const ClientChangePasswordPage = lazyRoute(() => import("@/ClientPage/ClientChangePasswordPage"));
const AboutUs = lazyRoute(() => import("./ClientPage/AboutUs"));
const ContactUS = lazyRoute(() => import("./ClientPage/ContactUs"));
const Enquiry2 = lazyRoute(() => import("./ClientPage/Enquiry"));
const ServiceDetail = lazyRoute(() => import("./ClientPage/ServiceDetails"));
const FaqPage = lazyRoute(() => import("./ClientPage/FAQPage"));
const AgencyPortal = lazyRoute(() => import("./ClientPage/AgencyPortal"));

const AdminShell = ({ children }: { children: ReactNode }) => <AppLayout>{children}</AppLayout>;
const withRouteLoader = (element: ReactNode) => <Suspense fallback={<RouteLoader />}>{element}</Suspense>;

interface AgencyAdminMeResponse {
  error?: string;
    admin?: {
      id: number;
      agencyId: number;
      username: string;
      email?: string;
      role?: "admin" | "agency" | "staff";
      agencyName: string;
      profileImageUrl?: string;
      createdAt: string;
  };
}

const ProtectedAdminRoute = ({ children }: { children: ReactNode }) => {
  const token = getAgencyAdminToken();
  const storedAdmin = getStoredAgencyAdmin();
  const [status, setStatus] = useState<"checking" | "allowed" | "denied">(
    token ? (storedAdmin ? "allowed" : "checking") : "denied",
  );

  useEffect(() => {
    if (!token) {
      setStatus("denied");
      return;
    }

    let cancelled = false;

    if (storedAdmin) {
      setStatus("allowed");
    }

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
  }, [token, storedAdmin]);

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
  const [status, setStatus] = useState<"checking" | "portal" | "landing">(
    "checking",
  );

  useEffect(() => {
    let cancelled = false;

    const resolveHome = async () => {
      try {
        const isAuthenticated = await hasActiveClientSession();
        if (!cancelled) setStatus(isAuthenticated ? "portal" : "landing");
      } catch {
        clearSupabaseSessionStorage();
        if (!cancelled) setStatus("landing");
      }
    };

    void resolveHome();

    return () => {
      cancelled = true;
    };
  }, []);

  if (status === "checking") {
    return <RouteLoader />;
  }

  return status === "portal" ? <Navigate to="/client/home" replace /> : <ClientLandingPage />;
};

const App = () => {
  useEffect(() => {
    if (!supabase) return;
    const path = window.location.pathname;
    if (path.startsWith("/agencyadmin")) {
      return;
    }

    void (async () => {
      if (isClientLogoutPending()) {
        clearSupabaseSessionStorage();

        try {
          const { data } = await supabase.auth.getSession();
          if (data.session) {
            await supabase.auth.signOut({ scope: "global" });
          }
        } catch (error) {
          console.error("Failed to clear Supabase session after logout:", error);
        }
        return;
      }

      const { data: { session } = { session: null } } = await supabase.auth.getSession();
      if (session?.access_token) {
        try {
          // syncClientProfileFromSession is now cached + deduplicated, so this
          // won't race with the navbar's own call on initial load.
          await syncClientProfileFromSession();
        } catch (error) {
          console.error("Failed to sync Supabase session:", error);
        }
      }
    })();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT") {
        clearSupabaseSessionStorage();
        return;
      }

      if (session?.user) {
        if (isClientLogoutPending()) {
          void supabase.auth.signOut({ scope: "global" }).finally(() => {
            clearClientAuth();
            clearSupabaseSessionStorage();
          });
          return;
        }

        if (session.access_token) {
          // Deduplication in syncClientProfileFromSession means this is safe
          // to call even if the navbar already triggered a sync.
          void syncClientProfileFromSession().catch((error) => {
            console.error("Failed to sync Supabase session:", error);
          });
        }
        return;
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
            <Route path="/employer-login" element={withRouteLoader(<ClientEmployerLogin />)} />
            <Route path="/auth/callback" element={withRouteLoader(<AuthCallback />)} />
            <Route path="/agencies" element={withRouteLoader(<AgenciesPage />)} />
            <Route path="/agencies/:id" element={withRouteLoader(<AgencyDetailsPage />)} />
            <Route path="/agencyadmin/login" element={withRouteLoader(<AgencyAdminLogin />)} />
            <Route path="/agencyadmin" element={<AdminIndexRedirect />} />
            <Route path="/agencyadmin/dashboard" element={withRouteLoader(<ProtectedAdminRoute><AdminShell><HomePage /></AdminShell></ProtectedAdminRoute>)} />
            <Route path="/agencyadmin/agency-profile" element={withRouteLoader(<ProtectedAdminRoute><AdminShell><AgencyProfile /></AdminShell></ProtectedAdminRoute>)} />
            <Route path="/agencyadmin/agency-profile/edit" element={withRouteLoader(<ProtectedAdminRoute><AdminShell><AgencyProfileEdit /></AdminShell></ProtectedAdminRoute>)} />
            <Route path="/agencyadmin/add-maid" element={withRouteLoader(<ProtectedAdminRoute><AdminShell><AddMaid /></AdminShell></ProtectedAdminRoute>)} />
            <Route path="/agencyadmin/edit-maids" element={withRouteLoader(<ProtectedAdminRoute><AdminShell><EditMaids /></AdminShell></ProtectedAdminRoute>)} />
            <Route path="/agencyadmin/maid/:refCode" element={withRouteLoader(<ProtectedAdminRoute><AdminShell><MaidProfile /></AdminShell></ProtectedAdminRoute>)} />
            <Route path="/agencyadmin/maid/:refCode/full" element={withRouteLoader(<ProtectedAdminRoute><AdminShell><MaidProfileFullView /></AdminShell></ProtectedAdminRoute>)} />
            <Route path="/agencyadmin/maid/:refCode/edit" element={withRouteLoader(<ProtectedAdminRoute><AdminShell><EditMaid /></AdminShell></ProtectedAdminRoute>)} />
            <Route path="/agencyadmin/change-password" element={withRouteLoader(<ProtectedAdminRoute><AdminShell><ChangePassword /></AdminShell></ProtectedAdminRoute>)} />
            <Route path="/agencyadmin/enquiry" element={withRouteLoader(<ProtectedAdminRoute><AdminShell><Enquiry /></AdminShell></ProtectedAdminRoute>)} />
            <Route path="/agencyadmin/requests" element={withRouteLoader(<ProtectedAdminRoute><AdminShell><RequestsPage /></AdminShell></ProtectedAdminRoute>)} />
            <Route path="/agencyadmin/chat-support" element={withRouteLoader(<ProtectedAdminRoute><AdminShell><AdminSupportChat /></AdminShell></ProtectedAdminRoute>)} />
            <Route path="/agencyadmin/employment-contracts" element={withRouteLoader(<ProtectedAdminRoute><AdminShell><EmploymentContracts /></AdminShell></ProtectedAdminRoute>)} />
            <Route path="/agencyadmin/employment-contracts/new" element={withRouteLoader(<ProtectedAdminRoute><AdminShell><AddEmployment /></AdminShell></ProtectedAdminRoute>)} />
            <Route path="/agencyadmin/employment-contracts/:refCode" element={withRouteLoader(<ProtectedAdminRoute><AdminShell><EmploymentContractView /></AdminShell></ProtectedAdminRoute>)} />
            <Route path="/agencyadmin/employment-contracts/:refCode/edit" element={withRouteLoader(<ProtectedAdminRoute><AdminShell><EditEmployer /></AdminShell></ProtectedAdminRoute>)} />

            {/* FIX: ClientPortalLayout is now imported eagerly at the top of this
                file, so this route renders the layout shell immediately without
                a second sequential chunk fetch. */}
            <Route path="/client" element={withRouteLoader(<ProtectedClientRoute><ClientPortalLayout /></ProtectedClientRoute>)}>
              <Route index element={<Navigate to="home" replace />} />
              <Route path="home" element={withRouteLoader(<ClientPortalHome />)} />
              <Route path="about" element={withRouteLoader(<AboutUs embedded />)} />
              <Route path="enquiry" element={withRouteLoader(<Enquiry2 embedded />)} />
              <Route path="contact" element={withRouteLoader(<ContactUS embedded />)} />
              <Route path="maids" element={withRouteLoader(<ClientMaidsPage embedded />)} />
              <Route path="maids/search" element={withRouteLoader(<MaidSearchPage embedded />)} />
              <Route path="faq" element={withRouteLoader(<FaqPage />)} />
              <Route path="requests" element={withRouteLoader(<ClientRequestsPage />)} />
              <Route path="messages" element={<Navigate to="../support-chat" replace />} />
              <Route path="support-chat" element={withRouteLoader(<ClientSupportChat />)} />
              <Route path="profile" element={withRouteLoader(<ClientProfilePage />)} />
              <Route path="change-password" element={withRouteLoader(<ClientChangePasswordPage />)} />
              <Route path="history" element={withRouteLoader(<ClientHistoryPage />)} />
              {/* Keep existing dashboard route working */}
              <Route path="dashboard" element={withRouteLoader(<ClientDashboard />)} />
            </Route>

            <Route path="/hire/:refCode" element={withRouteLoader(<HiringProcessPage />)} />
            <Route path="/maids/:refCode" element={withRouteLoader(<PublicMaidProfile />)} />
            <Route path="/agency-portal" element={withRouteLoader(<AgenciesPage />)} />
            <Route path="/agencyportal" element={withRouteLoader(<AgenciesPage />)} />
            <Route path="/agency-admin-portal" element={<Navigate to="/agencyadmin/login" replace />} />
            <Route path="/agencyadminportal" element={<Navigate to="/agencyadmin/login" replace />} />
            <Route path="/user-portal" element={withRouteLoader(<ClientHomeRedirect />)} />
            <Route path="/userportal" element={withRouteLoader(<ClientHomeRedirect />)} />
            <Route path="/search-maids" element={withRouteLoader(<ClientMaidsPage resultsPath="/search-maids/results" />)} />
            <Route path="/search-maids/results" element={withRouteLoader(<MaidSearchPage basePath="/search-maids" />)} />
            <Route path="/privacy-policy" element={withRouteLoader(<PrivacyPolicy />)} />
            <Route path="/data-deletion" element={withRouteLoader(<DataDeletion />)} />
            <Route path="/ai-workflows" element={withRouteLoader(<AiAutomationPage />)} />
            <Route path="/" element={withRouteLoader(<ClientHomeRedirect />)} />
            <Route path="*" element={withRouteLoader(<NotFound />)} />
            <Route path="/about" element={withRouteLoader(<AboutUs />)} />
            <Route path="/contact" element={withRouteLoader(<ContactUS />)} />
            <Route path="/enquiry2" element={withRouteLoader(<Enquiry2 />)} />
            <Route path="/services/:slug" element={withRouteLoader(<ServiceDetail />)} />
            <Route path="/employer/new" element={<Navigate to="/agencyadmin/employment-contracts/new" replace />} />
            <Route path="/employer/:refCode" element={<Navigate to="/agencyadmin/employment-contracts" replace />} />
            <Route path="/faq" element={withRouteLoader(<FaqPage />)} />
            <Route path="/agency" element={withRouteLoader(<AgencyPortal />)} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;