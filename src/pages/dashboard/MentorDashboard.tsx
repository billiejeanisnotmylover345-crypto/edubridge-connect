import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Users, Calendar, MessageSquare, BookOpen } from "lucide-react";

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
    { label: "Active Students", value: studentCount.toString(), icon: Users, color: "hsl(262, 83%, 58%)" },
    { label: "Resources", value: resourceCount.toString(), icon: BookOpen, color: "hsl(199, 89%, 48%)" },
    { label: "Sessions", value: sessionCount.toString(), icon: Calendar, color: "hsl(340, 82%, 52%)" },
    { label: "Open Questions", value: questionCount.toString(), icon: MessageSquare, color: "hsl(152, 69%, 40%)" },
  ];

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold font-['Space_Grotesk']">
          Welcome back, {profile?.full_name || "Mentor"} 👋
        </h1>
        <p className="text-muted-foreground mt-1">Here's your mentorship overview.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <Card key={stat.label} className="border-border/50">
            <CardContent className="pt-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                  <p className="text-2xl font-bold mt-1 font-['Space_Grotesk']">{stat.value}</p>
                </div>
                <div className="h-10 w-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${stat.color}15` }}>
                  <stat.icon className="h-5 w-5" style={{ color: stat.color }} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default MentorDashboard;
