import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { BookOpen, Calendar, MessageSquare, UserCircle, Target, MessageCircle } from "lucide-react";

const LearnerDashboard = () => {
  const { user, profile } = useAuth();
  const [mentorCount, setMentorCount] = useState(0);
  const [isOnWaitingList, setIsOnWaitingList] = useState(false);
  const [resourceCount, setResourceCount] = useState(0);
  const [sessionCount, setSessionCount] = useState(0);
  const [questionCount, setQuestionCount] = useState(0);

  useEffect(() => {
    if (!user) return;
    const fetchData = async () => {
      const [assignRes, waitRes, resCount, sessCount, qCount] = await Promise.all([
        supabase.from("mentor_assignments").select("mentor_id", { count: "exact", head: true }).eq("learner_id", user.id).eq("status", "active"),
        supabase.from("waiting_list").select("id").eq("learner_id", user.id).maybeSingle(),
        supabase.from("resources").select("*", { count: "exact", head: true }),
        supabase.from("sessions").select("*", { count: "exact", head: true }).eq("learner_id", user.id),
        supabase.from("questions").select("*", { count: "exact", head: true }).eq("asked_by", user.id),
      ]);

      setMentorCount(assignRes.count || 0);
      if ((assignRes.count || 0) === 0) {
        setIsOnWaitingList(!!waitRes.data);
      }
      setResourceCount(resCount.count || 0);
      setSessionCount(sessCount.count || 0);
      setQuestionCount(qCount.count || 0);
    };
    fetchData();
  }, [user]);

  const stats = [
    { label: "My Mentors", value: mentorCount > 0 ? mentorCount.toString() : (isOnWaitingList ? "Waiting..." : "None"), icon: UserCircle, color: "hsl(262, 83%, 58%)" },
    { label: "Resources", value: resourceCount.toString(), icon: BookOpen, color: "hsl(199, 89%, 48%)" },
    { label: "Sessions", value: sessionCount.toString(), icon: Calendar, color: "hsl(340, 82%, 52%)" },
    { label: "Questions", value: questionCount.toString(), icon: MessageSquare, color: "hsl(152, 69%, 40%)" },
  ];

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold font-['Space_Grotesk']">
          Welcome back, {profile?.full_name || "Learner"} 👋
        </h1>
        <p className="text-muted-foreground mt-1">Here's an overview of your learning journey.</p>
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

      {isOnWaitingList && (
        <Card className="mt-6 border-warning/30 bg-warning/5">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Badge variant="outline" className="border-warning text-warning">Waiting List</Badge>
              <p className="text-sm">You're on the waiting list. A mentor will be assigned to you soon!</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default LearnerDashboard;
