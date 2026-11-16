import { BrowserRouter as Router, Navigate, Routes, Route } from "react-router-dom";
import { EBDRegistrationForm } from "./components/EBDRegistrationForm";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Admin from "./pages/Admin";
import NotFound from "./pages/NotFound";
import ChoirView from "./pages/Choir";
import Professor from "./pages/Professor";
import Signup from "./pages/Signup";
import OAuthConsent from "./pages/OAuthConsent";
import { BrandingApplier } from "./components/BrandingApplier";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as SonnerToaster } from "@/components/ui/sonner";
import { PlatformDashboard } from "@/platform/pages/PlatformDashboard";
import { SynapSysSite } from "@/platform/pages/SynapSysSite";
import { ContractRouter } from "@/platform/components/ContractRouter";
import { SimulationFloatingPill } from "@/platform/components/SimulationFloatingPill";

function App() {
  return (
    <Router>
      <BrandingApplier />
      <Toaster />
      <SonnerToaster />
      <SimulationFloatingPill />
      <Routes>
        <Route path="/" element={<SynapSysSite />} />
        <Route path="/site" element={<Navigate to="/" replace />} />
        <Route path="/plataforma" element={<PlatformDashboard />} />
        <Route path="/c/:contractId/*" element={<ContractRouter />} />
        <Route path="/ebd" element={<Index />} />
        <Route path="/form" element={<EBDRegistrationForm />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="/professor" element={<Professor />} />
        <Route path="/coristas" element={<ChoirView />} />
        <Route path="/.lovable/oauth/consent" element={<OAuthConsent />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Router>
  );
}

export default App;
