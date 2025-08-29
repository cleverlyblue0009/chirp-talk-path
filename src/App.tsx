import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Splash from "./pages/Splash";
import Welcome from "./pages/Welcome";
import KidHome from "./pages/kid/KidHome";
import SubMap from "./pages/kid/SubMap";
import Scenario from "./pages/kid/Scenario";
import CompanionNest from "./pages/kid/CompanionNest";
import Assessment from "./pages/kid/Assessment";
import AssessmentResult from "./pages/kid/AssessmentResult";
import ParentDashboard from "./pages/parent/ParentDashboard";
import TherapistDashboard from "./pages/therapist/TherapistDashboard";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Splash />} />
          <Route path="/welcome" element={<Welcome />} />
          <Route path="/kid/home" element={<KidHome />} />
          <Route path="/kid/submap" element={<SubMap />} />
          <Route path="/kid/scenario" element={<Scenario />} />
          <Route path="/kid/companion-nest" element={<CompanionNest />} />
          <Route path="/kid/assessment" element={<Assessment />} />
          <Route path="/kid/assessment-result" element={<AssessmentResult />} />
          <Route path="/parent/dashboard" element={<ParentDashboard />} />
          <Route path="/therapist/dashboard" element={<TherapistDashboard />} />
          {/* Legacy index route for reference */}
          <Route path="/old-index" element={<Index />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
