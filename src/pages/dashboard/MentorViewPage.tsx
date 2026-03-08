import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import DashboardLayout from "@/components/DashboardLayout";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { UserCircle, CheckCircle, X } from "lucide-react";
import { toast } from "sonner";
import { logMockEmail } from "@/lib/emailLogger";

interface MentorProfile {
  user_id: string;
  full_name: string;
  bio: string | null;
  interests: string[] | null;
}

const MentorViewPage = () => {
  const { user } = useAuth();
  const [assignedMentors, setAssignedMentors] = useState<MentorProfile[]>([]);
  const [availableMentors, setAvailableMentors] = useState<MentorProfile[]>([]);
  const [studentCounts, setStudentCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [selecting, setSelecting] = useState<string | null>(null);
  const [removing, setRemoving] = useState<string | null>(null);

  const fetchData = async () => {
    if (!user) return;
    setLoading(true);

    // Get all active assignments for this learner
    const { data: assignments } = await supabase
      .from("mentor_assignments")
      .select("mentor_id")
      .eq("learner_id", user.id)
      .eq("status", "active");

    const assignedMentorIds = assignments?.map((a) => a.mentor_id) || [];

    if (assignedMentorIds.length > 0) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name, bio, interests")
        .in("user_id", assignedMentorIds);
      setAssignedMentors(profiles || []);
    } else {
      setAssignedMentors([]);
    }

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

      const { data: allAssignments } = await supabase
        .from("mentor_assignments")
        .select("mentor_id")
        .eq("status", "active");

      const counts: Record<string, number> = {};
      mentorIds.forEach((id) => (counts[id] = 0));
      allAssignments?.forEach((a) => {
        if (counts[a.mentor_id] !== undefined) counts[a.mentor_id]++;
      });
      setStudentCounts(counts);
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
      const { error } = await supabase.from("mentor_assignments").insert({
        learner_id: user.id,
        mentor_id: mentorId,
      });
      if (error) throw error;

      await supabase.from("waiting_list").delete().eq("learner_id", user.id);
      toast.success("Mentor added successfully!");
      await fetchData();
    } catch (err: any) {
      toast.error(err.message || "Failed to select mentor");
    } finally {
      setSelecting(null);
    }
  };

  const removeMentor = async (mentorId: string) => {
    if (!user) return;
    setRemoving(mentorId);
    try {
      const { error } = await supabase
        .from("mentor_assignments")
        .update({ status: "inactive" })
        .eq("learner_id", user.id)
        .eq("mentor_id", mentorId)
        .eq("status", "active");
      if (error) throw error;
      toast.success("Mentor removed.");
      await fetchData();
    } catch (err: any) {
      toast.error(err.message || "Failed to remove mentor");
    } finally {
      setRemoving(null);
    }
  };

  const initials = (name: string) =>
    name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);

  const assignedIds = new Set(assignedMentors.map((m) => m.user_id));
  const unassignedMentors = availableMentors.filter((m) => !assignedIds.has(m.user_id));

  return (
    <DashboardLayout>
      <div className="mb-8">
        <h1 className="text-3xl font-bold font-['Space_Grotesk']">My Mentors</h1>
        <p className="text-muted-foreground mt-1">
          Manage your mentors or browse and add new ones.
        </p>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="space-y-8">
          {/* Assigned Mentors */}
          {assignedMentors.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold font-['Space_Grotesk'] mb-4">Your Mentors</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {assignedMentors.map((m) => (
                  <Card key={m.user_id} className="border-primary/20 bg-primary/5">
                    <CardContent className="pt-6">
                      <div className="flex items-center gap-3 mb-3">
                        <Avatar className="h-12 w-12">
                          <AvatarFallback className="bg-primary/10 text-primary">
                            {initials(m.full_name)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <h3 className="font-semibold font-['Space_Grotesk']">{m.full_name}</h3>
                          <Badge variant="secondary" className="mt-1 text-xs">
                            <CheckCircle className="h-3 w-3 mr-1" /> Assigned
                          </Badge>
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
                        variant="outline"
                        className="w-full"
                        onClick={() => removeMentor(m.user_id)}
                        disabled={removing === m.user_id}
                      >
                        <X className="h-4 w-4 mr-1" />
                        {removing === m.user_id ? "Removing..." : "Remove Mentor"}
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Available Mentors */}
          <div>
            <h2 className="text-lg font-semibold font-['Space_Grotesk'] mb-4">
              {assignedMentors.length > 0 ? "Add More Mentors" : "Available Mentors"}
            </h2>
            {unassignedMentors.length === 0 ? (
              <Card className="border-border/50">
                <CardContent className="pt-6">
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <div className="h-16 w-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
                      <UserCircle className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <h3 className="text-lg font-semibold font-['Space_Grotesk'] mb-2">
                      {assignedMentors.length > 0 ? "No More Mentors Available" : "No Mentors Available"}
                    </h3>
                    <p className="text-sm text-muted-foreground">Check back soon — mentors will appear here once they register.</p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {unassignedMentors.map((m) => (
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
                        {selecting === m.user_id ? "Adding..." : "Add Mentor"}
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};

export default MentorViewPage;
