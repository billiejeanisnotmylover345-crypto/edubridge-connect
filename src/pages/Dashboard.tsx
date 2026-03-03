import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import DashboardLayout from "@/components/DashboardLayout";
import LearnerDashboard from "./dashboard/LearnerDashboard";
import MentorDashboard from "./dashboard/MentorDashboard";
import AdminDashboard from "./dashboard/AdminDashboard";

const Dashboard = () => {
  const { user, profile, role, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;
  if (profile && !profile.profile_completed) return <Navigate to="/complete-profile" replace />;

  const DashboardContent = () => {
    switch (role) {
      case "admin":
        return <AdminDashboard />;
      case "mentor":
        return <MentorDashboard />;
      default:
        return <LearnerDashboard />;
    }
  };

  return (
    <DashboardLayout>
      <DashboardContent />
    </DashboardLayout>
  );
};

export default Dashboard;
