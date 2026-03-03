import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Register from "./pages/Register";
import CompleteProfile from "./pages/CompleteProfile";
import Dashboard from "./pages/Dashboard";
import PlaceholderPage from "./pages/dashboard/PlaceholderPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/complete-profile" element={<CompleteProfile />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/dashboard/mentor" element={<PlaceholderPage title="My Mentor" />} />
            <Route path="/dashboard/students" element={<PlaceholderPage title="My Students" />} />
            <Route path="/dashboard/users" element={<PlaceholderPage title="User Management" />} />
            <Route path="/dashboard/assignments" element={<PlaceholderPage title="Assignments" />} />
            <Route path="/dashboard/resources" element={<PlaceholderPage title="Resources" />} />
            <Route path="/dashboard/sessions" element={<PlaceholderPage title="Sessions" />} />
            <Route path="/dashboard/qa" element={<PlaceholderPage title="Q&A" />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
