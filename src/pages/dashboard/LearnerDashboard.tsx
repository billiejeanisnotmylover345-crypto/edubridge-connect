import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { BookOpen, Calendar, MessageSquare, UserCircle } from "lucide-react";

const LearnerDashboard = () => {
  const { user, profile } = useAuth();
  const [mentorName, setMentorName] = useState<string | null>(null);
  const [isOnWaitingList, setIsOnWaitingList] = useState(false);

  useEffect(() => {
    if (!user) return;
    const fetchMentor = async () => {
      const { data: assignment } = await supabase
        .from("mentor_assignments")
        .select("mentor_id")
        .eq("learner_id", user.id)
        .eq("status", "active")
        .single();

      if (assignment) {
        const { data: mentorProfile } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("user_id", assignment.mentor_id)
          .single();
        setMentorName(mentorProfile?.full_name || "Unknown Mentor");
      } else {
        const { data: waiting } = await supabase
          .from("waiting_list")
          .select("id")
          .eq("learner_id", user.id)
          .single();
        setIsOnWaitingList(!!waiting);
      }
    };
    fetchMentor();
  }, [user]);

  const stats = [
    { label: "My Mentor", value: mentorName || (isOnWaitingList ? "Waiting..." : "None"), icon: UserCircle, color: "hsl(262, 83%, 58%)" },
    { label: "Resources", value: "0", icon: BookOpen, color: "hsl(199, 89%, 48%)" },
    { label: "Sessions", value: "0", icon: Calendar, color: "hsl(340, 82%, 52%)" },
    { label: "Questions", value: "0", icon: MessageSquare, color: "hsl(152, 69%, 40%)" },
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
                <div
                  className="h-10 w-10 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: `${stat.color}15` }}
                >
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
