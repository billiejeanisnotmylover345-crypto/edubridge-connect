import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import DashboardLayout from "@/components/DashboardLayout";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Target, Plus, Trash2, CheckCircle2, Circle } from "lucide-react";
import { format } from "date-fns";

interface Milestone {
  id: string;
  learner_id: string;
  mentor_id: string;
  title: string;
  description: string | null;
  completed: boolean;
  completed_at: string | null;
  created_at: string;
  learner_name?: string;
}

const ProgressPage = () => {
  const { user, role } = useAuth();
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [selectedLearner, setSelectedLearner] = useState("");
  const [learners, setLearners] = useState<{ id: string; name: string }[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const isMentor = role === "mentor";
  const isAdmin = role === "admin";
  const canManage = isMentor || isAdmin;

  const fetchMilestones = async () => {
    const { data } = await supabase
      .from("milestones")
      .select("*")
      .order("created_at", { ascending: true });

    if (data) {
      const learnerIds = [...new Set(data.map((m: any) => m.learner_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name")
        .in("user_id", learnerIds);

      const nameMap: Record<string, string> = {};
      profiles?.forEach((p) => (nameMap[p.user_id] = p.full_name));

      setMilestones(
        data.map((m: any) => ({ ...m, learner_name: nameMap[m.learner_id] || "Unknown" }))
      );
    }
    setLoading(false);
  };

  const fetchLearners = async () => {
    if (!user || !isMentor) return;
    const { data } = await supabase
      .from("mentor_assignments")
      .select("learner_id")
      .eq("mentor_id", user.id)
      .eq("status", "active");

    if (data && data.length > 0) {
      const ids = data.map((d) => d.learner_id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name")
        .in("user_id", ids);
      setLearners(profiles?.map((p) => ({ id: p.user_id, name: p.full_name })) || []);
    }
  };

  useEffect(() => {
    fetchMilestones();
    fetchLearners();
  }, [user]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSubmitting(true);
    try {
      const { error } = await supabase.from("milestones").insert({
        mentor_id: user.id,
        learner_id: selectedLearner,
        title,
        description,
      });
      if (error) throw error;
      toast.success("Milestone added!");
      setDialogOpen(false);
      setTitle("");
      setDescription("");
      setSelectedLearner("");
      fetchMilestones();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const toggleComplete = async (milestone: Milestone) => {
    const newCompleted = !milestone.completed;
    const { error } = await supabase
      .from("milestones")
      .update({
        completed: newCompleted,
        completed_at: newCompleted ? new Date().toISOString() : null,
      })
      .eq("id", milestone.id);
    if (error) toast.error("Failed to update");
    else fetchMilestones();
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("milestones").delete().eq("id", id);
    if (error) toast.error("Failed to delete");
    else {
      toast.success("Milestone removed");
      setMilestones((prev) => prev.filter((m) => m.id !== id));
    }
  };

  // Group milestones by learner
  const grouped = milestones.reduce<Record<string, Milestone[]>>((acc, m) => {
    const key = role === "learner" ? "My Milestones" : (m.learner_name || "Unknown");
    if (!acc[key]) acc[key] = [];
    acc[key].push(m);
    return acc;
  }, {});

  const getProgress = (items: Milestone[]) => {
    if (items.length === 0) return 0;
    return Math.round((items.filter((m) => m.completed).length / items.length) * 100);
  };

  return (
    <DashboardLayout>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold font-['Space_Grotesk']">Progress Tracking</h1>
          <p className="text-muted-foreground mt-1">
            {canManage ? "Set and track milestones for your learners." : "Track your learning milestones."}
          </p>
        </div>
        {canManage && (
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />Add Milestone
          </Button>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-['Space_Grotesk']">Add Milestone</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="space-y-2">
              <Label>Student</Label>
              <Select value={selectedLearner} onValueChange={setSelectedLearner}>
                <SelectTrigger><SelectValue placeholder="Select student" /></SelectTrigger>
                <SelectContent>
                  {learners.map((l) => (
                    <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Title</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
            </div>
            <Button type="submit" className="w-full" disabled={submitting || !selectedLearner}>
              {submitting ? "Adding..." : "Add Milestone"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : Object.keys(grouped).length === 0 ? (
        <Card className="border-border/50">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="h-16 w-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
                <Target className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold font-['Space_Grotesk'] mb-2">No Milestones Yet</h3>
              <p className="text-sm text-muted-foreground max-w-sm">
                {canManage ? "Add milestones to track your students' progress." : "Your mentor will add milestones for you to track."}
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).map(([name, items]) => {
            const progress = getProgress(items);
            return (
              <Card key={name} className="border-border/50">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="font-['Space_Grotesk'] text-lg">{name}</CardTitle>
                    <span className="text-sm font-medium text-muted-foreground">{progress}% complete</span>
                  </div>
                  <Progress value={progress} className="mt-2" />
                </CardHeader>
                <CardContent className="space-y-3">
                  {items.map((m) => (
                    <div key={m.id} className="flex items-start gap-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                      <button
                        onClick={() => canManage && toggleComplete(m)}
                        className={canManage ? "cursor-pointer mt-0.5" : "mt-0.5"}
                        disabled={!canManage}
                      >
                        {m.completed ? (
                          <CheckCircle2 className="h-5 w-5 text-[hsl(var(--success))]" />
                        ) : (
                          <Circle className="h-5 w-5 text-muted-foreground" />
                        )}
                      </button>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium ${m.completed ? "line-through text-muted-foreground" : ""}`}>
                          {m.title}
                        </p>
                        {m.description && (
                          <p className="text-xs text-muted-foreground mt-0.5">{m.description}</p>
                        )}
                        {m.completed_at && (
                          <p className="text-xs text-[hsl(var(--success))] mt-1">
                            Completed {format(new Date(m.completed_at), "MMM d, yyyy")}
                          </p>
                        )}
                      </div>
                      {canManage && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          onClick={() => handleDelete(m.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </DashboardLayout>
  );
};

export default ProgressPage;
