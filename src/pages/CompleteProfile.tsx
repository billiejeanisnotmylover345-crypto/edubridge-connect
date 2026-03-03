import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { GraduationCap } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const CompleteProfile = () => {
  const { user, role, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [bio, setBio] = useState("");
  const [interests, setInterests] = useState("");
  const [learningGoals, setLearningGoals] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setIsLoading(true);
    try {
      const interestsArray = interests.split(",").map((s) => s.trim()).filter(Boolean);

      const { error } = await supabase
        .from("profiles")
        .update({
          bio,
          interests: interestsArray,
          learning_goals: learningGoals,
          profile_completed: true,
        })
        .eq("user_id", user.id);

      if (error) throw error;

      // Auto-assign mentor for learners
      if (role === "learner") {
        await autoAssignMentor(user.id);
      }

      await refreshProfile();
      toast.success("Profile completed!");
      navigate("/dashboard");
    } catch (error: any) {
      toast.error(error.message || "Failed to complete profile");
    } finally {
      setIsLoading(false);
    }
  };

  const autoAssignMentor = async (learnerId: string) => {
    // Find mentor with fewest active students
    const { data: mentors } = await supabase
      .from("user_roles")
      .select("user_id")
      .eq("role", "mentor");

    if (!mentors || mentors.length === 0) {
      // No mentors, add to waiting list
      await supabase.from("waiting_list").insert({ learner_id: learnerId });
      toast.info("No mentors available yet. You've been added to the waiting list.");
      return;
    }

    // Count assignments per mentor
    const { data: assignments } = await supabase
      .from("mentor_assignments")
      .select("mentor_id")
      .eq("status", "active");

    const counts: Record<string, number> = {};
    mentors.forEach((m) => (counts[m.user_id] = 0));
    assignments?.forEach((a) => {
      if (counts[a.mentor_id] !== undefined) counts[a.mentor_id]++;
    });

    // Get mentor with min students
    const bestMentor = Object.entries(counts).sort((a, b) => a[1] - b[1])[0];
    if (bestMentor) {
      const { error } = await supabase.from("mentor_assignments").insert({
        learner_id: learnerId,
        mentor_id: bestMentor[0],
      });
      if (error) {
        // Fallback: add to waiting list
        await supabase.from("waiting_list").insert({ learner_id: learnerId });
        toast.info("Added to waiting list. A mentor will be assigned soon.");
      } else {
        toast.success("A mentor has been assigned to you!");
      }
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          <div className="h-12 w-12 rounded-lg bg-primary flex items-center justify-center mx-auto mb-3">
            <GraduationCap className="h-7 w-7 text-primary-foreground" />
          </div>
          <CardTitle className="text-2xl font-['Space_Grotesk']">Complete Your Profile</CardTitle>
          <CardDescription>
            Tell us about yourself so we can match you with the right {role === "learner" ? "mentor" : "learners"}.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="bio">Bio</Label>
              <Textarea
                id="bio"
                placeholder="Tell us a bit about yourself..."
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="interests">Interests</Label>
              <Input
                id="interests"
                placeholder="e.g. Math, Science, Programming (comma separated)"
                value={interests}
                onChange={(e) => setInterests(e.target.value)}
              />
            </div>
            {role === "learner" && (
              <div className="space-y-2">
                <Label htmlFor="goals">Learning Goals</Label>
                <Textarea
                  id="goals"
                  placeholder="What do you hope to achieve?"
                  value={learningGoals}
                  onChange={(e) => setLearningGoals(e.target.value)}
                  rows={3}
                />
              </div>
            )}
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "Saving..." : "Complete Profile"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default CompleteProfile;
