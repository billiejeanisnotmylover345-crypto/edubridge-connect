import { useState, useEffect } from "react";
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
import DashboardLayout from "@/components/DashboardLayout";

interface ProfilePageProps {
  editMode?: boolean;
}

const ProfilePage = ({ editMode = false }: ProfilePageProps) => {
  const { user, role, profile, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [fullName, setFullName] = useState("");
  const [bio, setBio] = useState("");
  const [interests, setInterests] = useState("");
  const [learningGoals, setLearningGoals] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (editMode && profile) {
      setFullName(profile.full_name || "");
      setBio(profile.bio || "");
      setInterests(profile.interests?.join(", ") || "");
      setLearningGoals(profile.learning_goals || "");
    }
  }, [editMode, profile]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setIsLoading(true);
    try {
      const interestsArray = interests.split(",").map((s) => s.trim()).filter(Boolean);

      const updateData: Record<string, any> = {
        bio,
        interests: interestsArray,
        learning_goals: learningGoals,
        profile_completed: true,
      };
      if (editMode) {
        updateData.full_name = fullName;
      }

      const { error } = await supabase
        .from("profiles")
        .update(updateData)
        .eq("user_id", user.id);

      if (error) throw error;

      await refreshProfile();
      toast.success(editMode ? "Profile updated!" : "Profile completed!");
      if (!editMode) navigate("/dashboard");
    } catch (error: any) {
      toast.error(error.message || "Failed to save profile");
    } finally {
      setIsLoading(false);
    }
  };

  const formContent = (
    <Card className={editMode ? "border-border/50" : "w-full max-w-lg"}>
      <CardHeader className={editMode ? "" : "text-center"}>
        {!editMode && (
          <div className="h-12 w-12 rounded-lg bg-primary flex items-center justify-center mx-auto mb-3">
            <GraduationCap className="h-7 w-7 text-primary-foreground" />
          </div>
        )}
        <CardTitle className={`${editMode ? "text-xl" : "text-2xl"} font-['Space_Grotesk']`}>
          {editMode ? "Edit Profile" : "Complete Your Profile"}
        </CardTitle>
        <CardDescription>
          {editMode
            ? "Update your personal information."
            : `Tell us about yourself so we can match you with the right ${role === "learner" ? "mentor" : "learners"}.`}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {editMode && (
            <div className="space-y-2">
              <Label htmlFor="fullName">Full Name</Label>
              <Input
                id="fullName"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
              />
            </div>
          )}
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
          {(role === "learner" || (!editMode && role === "learner")) && (
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
            {isLoading ? "Saving..." : editMode ? "Save Changes" : "Complete Profile"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );

  if (editMode) {
    return (
      <DashboardLayout>
        <div className="mb-8">
          <h1 className="text-3xl font-bold font-['Space_Grotesk']">My Profile</h1>
          <p className="text-muted-foreground mt-1">Manage your personal information.</p>
        </div>
        <div className="max-w-2xl">{formContent}</div>
      </DashboardLayout>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      {formContent}
    </div>
  );
};

export default ProfilePage;