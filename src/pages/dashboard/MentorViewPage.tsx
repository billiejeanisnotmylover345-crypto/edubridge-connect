import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import DashboardLayout from "@/components/DashboardLayout";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { UserCircle, Mail, BookOpen } from "lucide-react";

interface MentorProfile {
  full_name: string;
  bio: string | null;
  interests: string[] | null;
}

const MentorViewPage = () => {
  const { user } = useAuth();
  const [mentor, setMentor] = useState<MentorProfile | null>(null);
  const [isOnWaitingList, setIsOnWaitingList] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const fetch = async () => {
      const { data: assignment } = await supabase
        .from("mentor_assignments")
        .select("mentor_id")
        .eq("learner_id", user.id)
        .eq("status", "active")
        .maybeSingle();

      if (assignment) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name, bio, interests")
          .eq("user_id", assignment.mentor_id)
          .maybeSingle();
        if (profile) setMentor(profile);
      } else {
        const { data: waiting } = await supabase
          .from("waiting_list")
          .select("id")
          .eq("learner_id", user.id)
          .maybeSingle();
        setIsOnWaitingList(!!waiting);
      }
      setLoading(false);
    };
    fetch();
  }, [user]);

  const initials = (name: string) => name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);

  return (
    <DashboardLayout>
      <div className="mb-8">
        <h1 className="text-3xl font-bold font-['Space_Grotesk']">My Mentor</h1>
        <p className="text-muted-foreground mt-1">View your assigned mentor's profile.</p>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : mentor ? (
        <Card className="border-border/50 max-w-lg">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4 mb-4">
              <Avatar className="h-16 w-16">
                <AvatarFallback className="bg-primary/10 text-primary text-lg">{initials(mentor.full_name)}</AvatarFallback>
              </Avatar>
              <div>
                <h2 className="text-xl font-bold font-['Space_Grotesk']">{mentor.full_name}</h2>
                <Badge variant="secondary" className="mt-1">Mentor</Badge>
              </div>
            </div>
            {mentor.bio && (
              <div className="mb-4">
                <h4 className="text-sm font-medium mb-1">Bio</h4>
                <p className="text-sm text-muted-foreground">{mentor.bio}</p>
              </div>
            )}
            {mentor.interests && mentor.interests.length > 0 && (
              <div>
                <h4 className="text-sm font-medium mb-2">Interests</h4>
                <div className="flex flex-wrap gap-2">
                  {mentor.interests.map((i) => (
                    <Badge key={i} variant="outline">{i}</Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card className="border-border/50">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="h-16 w-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
                <UserCircle className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold font-['Space_Grotesk'] mb-2">
                {isOnWaitingList ? "On Waiting List" : "No Mentor Assigned"}
              </h3>
              <p className="text-sm text-muted-foreground max-w-sm">
                {isOnWaitingList ? "You're on the waiting list. A mentor will be assigned to you soon!" : "Complete your profile to get matched with a mentor."}
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </DashboardLayout>
  );
};

export default MentorViewPage;
