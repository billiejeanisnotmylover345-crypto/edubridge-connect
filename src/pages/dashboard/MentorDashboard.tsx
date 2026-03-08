import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import NotificationFeed from "@/components/NotificationFeed";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Users, Calendar, MessageSquare, BookOpen } from "lucide-react";
import { motion } from "framer-motion";

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.08, duration: 0.4, ease: "easeOut" as const },
  }),
};

const MentorDashboard = () => {
  const { user, profile } = useAuth();
  const [studentCount, setStudentCount] = useState(0);
  const [resourceCount, setResourceCount] = useState(0);
  const [sessionCount, setSessionCount] = useState(0);
  const [questionCount, setQuestionCount] = useState(0);

  useEffect(() => {
    if (!user) return;
    const fetchData = async () => {
      const [students, resources, sessions, questions] = await Promise.all([
        supabase.from("mentor_assignments").select("*", { count: "exact", head: true }).eq("mentor_id", user.id).eq("status", "active"),
        supabase.from("resources").select("*", { count: "exact", head: true }),
        supabase.from("sessions").select("*", { count: "exact", head: true }).eq("mentor_id", user.id),
        supabase.from("questions").select("*", { count: "exact", head: true }).eq("status", "open"),
      ]);
      setStudentCount(students.count || 0);
      setResourceCount(resources.count || 0);
      setSessionCount(sessions.count || 0);
      setQuestionCount(questions.count || 0);
    };
    fetchData();
  }, [user]);

  const stats = [
    { label: "Active Students", value: studentCount.toString(), icon: Users, gradient: "gradient-cool" },
    { label: "Resources", value: resourceCount.toString(), icon: BookOpen, gradient: "gradient-warm" },
    { label: "Sessions", value: sessionCount.toString(), icon: Calendar, gradient: "gradient-fun" },
    { label: "Open Questions", value: questionCount.toString(), icon: MessageSquare, gradient: "gradient-fresh" },
  ];

  return (
    <div>
      <div className="mb-8">
        <motion.h1
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="text-3xl font-bold font-['Space_Grotesk']"
        >
          Welcome back, {profile?.full_name || "Mentor"}!
        </motion.h1>
        <p className="text-muted-foreground mt-1">Here's your mentorship overview.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, i) => (
          <motion.div key={stat.label} custom={i} initial="hidden" animate="visible" variants={cardVariants}>
            <Card className="border-border/50 fun-card group relative overflow-hidden glass-card shadow-md">
              <div className={`absolute inset-0 ${stat.gradient} opacity-0 group-hover:opacity-[0.06] transition-opacity duration-300`} />
              <CardContent className="pt-6 relative z-10">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground font-medium">{stat.label}</p>
                    <p className="text-3xl font-bold mt-1 font-['Space_Grotesk']">{stat.value}</p>
                  </div>
                  <div className={`h-10 w-10 rounded-xl ${stat.gradient} flex items-center justify-center shadow-sm`}>
                    <stat.icon className="h-5 w-5 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <NotificationFeed />
    </div>
  );
};

export default MentorDashboard;
