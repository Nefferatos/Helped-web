import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import AppLayout from "@/components/AppLayout";
import HomePage from "@/pages/HomePage";
import AgencyProfile from "@/pages/AgencyProfile";
import AddMaid from "@/pages/AddMaid";
import EditMaids from "@/pages/EditMaids";
import MaidProfile from "@/pages/MaidProfile";
import ChangePassword from "@/pages/ChangePassword";
import Enquiry from "@/pages/Enquiry";
import EmploymentContracts from "@/pages/EmploymentContracts";
import NotFound from "@/pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AppLayout>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/agency-profile" element={<AgencyProfile />} />
            <Route path="/add-maid" element={<AddMaid />} />
            <Route path="/edit-maids" element={<EditMaids />} />
            <Route path="/maid/:refCode" element={<MaidProfile />} />
            <Route path="/change-password" element={<ChangePassword />} />
            <Route path="/enquiry" element={<Enquiry />} />
            <Route path="/employment-contracts" element={<EmploymentContracts />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AppLayout>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
