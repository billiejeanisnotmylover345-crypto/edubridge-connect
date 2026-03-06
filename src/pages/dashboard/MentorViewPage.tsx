import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import DashboardLayout from "@/components/DashboardLayout";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { UserCircle, BookOpen, CheckCircle } from "lucide-react";
import { toast } from "sonner";

interface MentorProfile {
  user_id: string;
  full_name: string;
  bio: string | null;
  interests: string[] | null;
}

const MentorViewPage = () => {
  const { user } = useAuth();
  const [assignedMentor, setAssignedMentor] = useState<MentorProfile | null>(null);
  const [availableMentors, setAvailableMentors] = useState<MentorProfile[]>([]);
  const [studentCounts, setStudentCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [selecting, setSelecting] = useState<string | null>(null);
  const [switching, setSwitching] = useState(false);

  const fetchData = async () => {
    if (!user) return;
    setLoading(true);

    // Check if learner already has a mentor
    const { data: assignment } = await supabase
      .from("mentor_assignments")
      .select("mentor_id")
      .eq("learner_id", user.id)
      .eq("status", "active")
      .maybeSingle();

    if (assignment) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("user_id, full_name, bio, interests")
        .eq("user_id", assignment.mentor_id)
        .maybeSingle();
      if (profile) setAssignedMentor(profile);
    } else {
      // Fetch all mentor profiles
      const { data: mentorRoles } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "mentor");

      if (mentorRoles && mentorRoles.length > 0) {
        const mentorIds = mentorRoles.map((r) => r.user_id);
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, full_name, bio, interests")
          .in("user_id", mentorIds);
        setAvailableMentors(profiles || []);

        // Get student counts per mentor
        const { data: assignments } = await supabase
          .from("mentor_assignments")
          .select("mentor_id")
          .eq("status", "active");

        const counts: Record<string, number> = {};
        mentorIds.forEach((id) => (counts[id] = 0));
        assignments?.forEach((a) => {
          if (counts[a.mentor_id] !== undefined) counts[a.mentor_id]++;
        });
        setStudentCounts(counts);
      }
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, [user]);

  const selectMentor = async (mentorId: string) => {
    if (!user) return;
    setSelecting(mentorId);
    try {
      // If switching, deactivate current assignment first
      if (assignedMentor) {
        const { error: deactivateError } = await supabase
          .from("mentor_assignments")
          .update({ status: "inactive" })
          .eq("learner_id", user.id)
          .eq("status", "active");
        if (deactivateError) throw deactivateError;
      }

      const { error } = await supabase.from("mentor_assignments").insert({
        learner_id: user.id,
        mentor_id: mentorId,
      });
      if (error) throw error;

      await supabase.from("waiting_list").delete().eq("learner_id", user.id);

      toast.success(assignedMentor ? "Mentor switched successfully!" : "Mentor selected successfully!");
      setSwitching(false);
      await fetchData();
    } catch (err: any) {
      toast.error(err.message || "Failed to select mentor");
    } finally {
      setSelecting(null);
    }
  };

  const initials = (name: string) =>
    name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);

  return (
    <DashboardLayout>
      <div className="mb-8">
        <h1 className="text-3xl font-bold font-['Space_Grotesk']">My Mentor</h1>
        <p className="text-muted-foreground mt-1">
          {assignedMentor ? "View your mentor's profile." : "Browse and pick a mentor."}
        </p>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : assignedMentor && !switching ? (
        <Card className="border-border/50 max-w-lg">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4 mb-4">
              <Avatar className="h-16 w-16">
                <AvatarFallback className="bg-primary/10 text-primary text-lg">
                  {initials(assignedMentor.full_name)}
                </AvatarFallback>
              </Avatar>
              <div>
                <h2 className="text-xl font-bold font-['Space_Grotesk']">{assignedMentor.full_name}</h2>
                <Badge variant="secondary" className="mt-1">
                  <CheckCircle className="h-3 w-3 mr-1" /> Your Mentor
                </Badge>
              </div>
            </div>
            {assignedMentor.bio && (
              <div className="mb-4">
                <h4 className="text-sm font-medium mb-1">Bio</h4>
                <p className="text-sm text-muted-foreground">{assignedMentor.bio}</p>
              </div>
            )}
            {assignedMentor.interests && assignedMentor.interests.length > 0 && (
              <div className="mb-4">
                <h4 className="text-sm font-medium mb-2">Interests</h4>
                <div className="flex flex-wrap gap-2">
                  {assignedMentor.interests.map((i) => (
                    <Badge key={i} variant="outline">{i}</Badge>
                  ))}
                </div>
              </div>
            )}
            <Button variant="outline" className="w-full" onClick={() => { setSwitching(true); fetchData(); }}>
              Change Mentor
            </Button>
          </CardContent>
        </Card>
      ) : availableMentors.length === 0 ? (
        <Card className="border-border/50">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="h-16 w-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
                <UserCircle className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold font-['Space_Grotesk'] mb-2">No Mentors Available</h3>
              <p className="text-sm text-muted-foreground">Check back soon — mentors will appear here once they register.</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {availableMentors.map((m) => (
            <Card key={m.user_id} className="border-border/50 hover:border-primary/30 transition-colors">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3 mb-3">
                  <Avatar className="h-12 w-12">
                    <AvatarFallback className="bg-primary/10 text-primary">
                      {initials(m.full_name)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="font-semibold font-['Space_Grotesk']">{m.full_name}</h3>
                    <p className="text-xs text-muted-foreground">
                      {studentCounts[m.user_id] || 0} student{studentCounts[m.user_id] !== 1 ? "s" : ""}
                    </p>
                  </div>
                </div>
                {m.bio && (
                  <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{m.bio}</p>
                )}
                {m.interests && m.interests.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-4">
                    {m.interests.slice(0, 4).map((i) => (
                      <Badge key={i} variant="outline" className="text-xs">{i}</Badge>
                    ))}
                  </div>
                )}
                <Button
                  className="w-full"
                  onClick={() => selectMentor(m.user_id)}
                  disabled={selecting === m.user_id}
                >
                  {selecting === m.user_id ? "Selecting..." : "Choose Mentor"}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </DashboardLayout>
  );
};

export default MentorViewPage;
