import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { BookOpen, Calendar, MessageSquare, UserCircle, Target, MessageCircle } from "lucide-react";
import { motion } from "framer-motion";

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.08, duration: 0.4, ease: "easeOut" as const },
  }),
};

const LearnerDashboard = () => {
  const { user, profile } = useAuth();
  const [mentorCount, setMentorCount] = useState(0);
  const [isOnWaitingList, setIsOnWaitingList] = useState(false);
  const [resourceCount, setResourceCount] = useState(0);
  const [sessionCount, setSessionCount] = useState(0);
  const [questionCount, setQuestionCount] = useState(0);
  const [milestoneProgress, setMilestoneProgress] = useState({ total: 0, completed: 0 });
  const [unreadMessages, setUnreadMessages] = useState(0);

  useEffect(() => {
    if (!user) return;
    const fetchData = async () => {
      const [assignRes, waitRes, resCount, sessCount, qCount, milestonesRes, unreadRes] = await Promise.all([
        supabase.from("mentor_assignments").select("mentor_id", { count: "exact", head: true }).eq("learner_id", user.id).eq("status", "active"),
        supabase.from("waiting_list").select("id").eq("learner_id", user.id).maybeSingle(),
        supabase.from("resources").select("*", { count: "exact", head: true }),
        supabase.from("sessions").select("*", { count: "exact", head: true }).eq("learner_id", user.id),
        supabase.from("questions").select("*", { count: "exact", head: true }).eq("asked_by", user.id),
        supabase.from("milestones").select("id, completed").eq("learner_id", user.id),
        supabase.from("messages").select("*", { count: "exact", head: true }).eq("receiver_id", user.id).eq("read", false),
      ]);

      setMentorCount(assignRes.count || 0);
      if ((assignRes.count || 0) === 0) {
        setIsOnWaitingList(!!waitRes.data);
      }
      setResourceCount(resCount.count || 0);
      setSessionCount(sessCount.count || 0);
      setQuestionCount(qCount.count || 0);
      const milestones = milestonesRes.data || [];
      setMilestoneProgress({
        total: milestones.length,
        completed: milestones.filter((m: any) => m.completed).length,
      });
      setUnreadMessages(unreadRes.count || 0);
    };
    fetchData();
  }, [user]);

  const progressLabel = milestoneProgress.total > 0
    ? `${milestoneProgress.completed}/${milestoneProgress.total}`
    : "0";

  const stats = [
    { label: "My Mentors", value: mentorCount > 0 ? mentorCount.toString() : (isOnWaitingList ? "Waiting..." : "None"), icon: UserCircle, gradient: "gradient-cool" },
    { label: "Progress", value: progressLabel, icon: Target, gradient: "gradient-fresh" },
    { label: "Resources", value: resourceCount.toString(), icon: BookOpen, gradient: "gradient-warm" },
    { label: "Sessions", value: sessionCount.toString(), icon: Calendar, gradient: "gradient-fun" },
    { label: "Questions", value: questionCount.toString(), icon: MessageSquare, gradient: "gradient-cool" },
    { label: "Messages", value: unreadMessages.toString(), icon: MessageCircle, gradient: "gradient-warm" },
  ];

  return (
    <div>
      <div className="mb-8">
        <motion.h1
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="text-3xl font-bold font-['Space_Grotesk']"
        >
          Welcome back, {profile?.full_name || "Learner"}! 👋
        </motion.h1>
        <p className="text-muted-foreground mt-1">Here's an overview of your learning journey ✨</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {stats.map((stat, i) => (
          <motion.div key={stat.label} custom={i} initial="hidden" animate="visible" variants={cardVariants}>
            <Card className="border-border/50 fun-card group relative overflow-hidden">
              <div className={`absolute inset-0 ${stat.gradient} opacity-0 group-hover:opacity-[0.06] transition-opacity duration-300`} />
              <CardContent className="pt-6 relative z-10">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground font-medium">{stat.label}</p>
                    <p className="text-3xl font-bold mt-1 font-['Space_Grotesk']">{stat.value}</p>
                  </div>
                  <div className="text-3xl animate-float" style={{ animationDelay: `${i * 0.3}s` }}>
                    {stat.emoji}
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {isOnWaitingList && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
          <Card className="mt-6 border-warning/30 bg-warning/5">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <span className="text-2xl">⏳</span>
                <div>
                  <Badge variant="outline" className="border-warning text-warning mb-1">Waiting List</Badge>
                  <p className="text-sm">Hang tight! A mentor will be assigned to you soon! 🎯</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  );
};

export default LearnerDashboard;
