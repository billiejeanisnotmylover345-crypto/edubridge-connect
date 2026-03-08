import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, HashRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Register from "./pages/Register";
import CompleteProfile from "./pages/CompleteProfile";
import ProfilePage from "./pages/ProfilePage";
import Dashboard from "./pages/Dashboard";
import ResourcesPage from "./pages/dashboard/ResourcesPage";
import SessionsPage from "./pages/dashboard/SessionsPage";
import QAPage from "./pages/dashboard/QAPage";
import MentorViewPage from "./pages/dashboard/MentorViewPage";
import StudentsPage from "./pages/dashboard/StudentsPage";
import AdminUsersPage from "./pages/dashboard/AdminUsersPage";
import AdminAssignmentsPage from "./pages/dashboard/AdminAssignmentsPage";
import ProgressPage from "./pages/dashboard/ProgressPage";
import ChatPage from "./pages/dashboard/ChatPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => {
  const shouldUseHashRouter =
    typeof window !== "undefined" &&
    (window.location.hostname.endsWith("github.io") || import.meta.env.BASE_URL === "./");

  const appRoutes = (
    <AuthProvider>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/complete-profile" element={<CompleteProfile />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/dashboard/profile" element={<ProfilePage editMode />} />
        <Route path="/dashboard/mentor" element={<MentorViewPage />} />
        <Route path="/dashboard/students" element={<StudentsPage />} />
        <Route path="/dashboard/users" element={<AdminUsersPage />} />
        <Route path="/dashboard/assignments" element={<AdminAssignmentsPage />} />
        <Route path="/dashboard/resources" element={<ResourcesPage />} />
        <Route path="/dashboard/sessions" element={<SessionsPage />} />
        <Route path="/dashboard/qa" element={<QAPage />} />
        <Route path="/dashboard/progress" element={<ProgressPage />} />
        <Route path="/dashboard/chat" element={<ChatPage />} />
        {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </AuthProvider>
  );

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        {shouldUseHashRouter ? (
          <HashRouter>{appRoutes}</HashRouter>
        ) : (
          <BrowserRouter basename={import.meta.env.BASE_URL}>{appRoutes}</BrowserRouter>
        )}
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
