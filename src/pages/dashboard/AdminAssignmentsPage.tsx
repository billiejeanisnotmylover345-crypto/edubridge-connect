import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import DashboardLayout from "@/components/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ClipboardList, UserPlus, ArrowRightLeft, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { logMockEmail } from "@/lib/emailLogger";

interface Assignment {
  id: string;
  mentor_id: string;
  learner_id: string;
  status: string;
  created_at: string;
  mentor_name: string;
  learner_name: string;
}

interface ProfileItem {
  user_id: string;
  full_name: string;
}

const AdminAssignmentsPage = () => {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [mentors, setMentors] = useState<ProfileItem[]>([]);
  const [unassignedLearners, setUnassignedLearners] = useState<ProfileItem[]>([]);
  const [waitingList, setWaitingList] = useState<{ id: string; learner_id: string; learner_name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [reassignDialog, setReassignDialog] = useState<Assignment | null>(null);
  const [newMentorId, setNewMentorId] = useState("");
  const [assignDialog, setAssignDialog] = useState(false);
  const [selectedLearner, setSelectedLearner] = useState("");
  const [selectedMentor, setSelectedMentor] = useState("");

  const fetchData = async () => {
    const [assignRes, mentorRolesRes, learnerRolesRes, waitRes] = await Promise.all([
      supabase.from("mentor_assignments").select("*").order("created_at", { ascending: false }),
      supabase.from("user_roles").select("user_id").eq("role", "mentor"),
      supabase.from("user_roles").select("user_id").eq("role", "learner"),
      supabase.from("waiting_list").select("*"),
    ]);

    const allAssignments = assignRes.data || [];
    const mentorIds = mentorRolesRes.data?.map((r) => r.user_id) || [];
    const learnerIds = learnerRolesRes.data?.map((r) => r.user_id) || [];
    const allUserIds = [...new Set([...mentorIds, ...learnerIds])];

    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, full_name")
      .in("user_id", allUserIds);

    const nameMap: Record<string, string> = {};
    profiles?.forEach((p) => (nameMap[p.user_id] = p.full_name));

    setAssignments(
      allAssignments.map((a) => ({
        ...a,
        mentor_name: nameMap[a.mentor_id] || "Unknown",
        learner_name: nameMap[a.learner_id] || "Unknown",
      }))
    );

    setMentors(mentorIds.map((id) => ({ user_id: id, full_name: nameMap[id] || "Unknown" })));

    // Learners without active assignments
    const assignedLearnerIds = new Set(
      allAssignments.filter((a) => a.status === "active").map((a) => a.learner_id)
    );
    setUnassignedLearners(
      learnerIds
        .filter((id) => !assignedLearnerIds.has(id))
        .map((id) => ({ user_id: id, full_name: nameMap[id] || "Unknown" }))
    );

    setWaitingList(
      (waitRes.data || []).map((w) => ({
        ...w,
        learner_name: nameMap[w.learner_id] || "Unknown",
      }))
    );

    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleReassign = async () => {
    if (!reassignDialog || !newMentorId) return;
    try {
      // Deactivate old
      await supabase
        .from("mentor_assignments")
        .update({ status: "inactive" })
        .eq("id", reassignDialog.id);

      // Create new
      const { error } = await supabase.from("mentor_assignments").insert({
        mentor_id: newMentorId,
        learner_id: reassignDialog.learner_id,
      });
      if (error) throw error;

      // Notify learner
      await supabase.from("notifications").insert({
        user_id: reassignDialog.learner_id,
        title: "Mentor Reassigned",
        message: `You've been assigned a new mentor.`,
        type: "assignment",
        link: "/dashboard/mentor",
      });

      await logMockEmail({
        recipientId: reassignDialog.learner_id,
        emailType: "mentor_assignment",
        subject: "Your mentor has been reassigned",
        body: `You have been reassigned to a new mentor on EduBridge.`,
      });

      toast.success("Mentor reassigned!");
      setReassignDialog(null);
      setNewMentorId("");
      fetchData();
    } catch (err: any) {
      toast.error(err.message || "Failed to reassign");
    }
  };

  const handleNewAssignment = async () => {
    if (!selectedLearner || !selectedMentor) return;
    try {
      const { error } = await supabase.from("mentor_assignments").insert({
        mentor_id: selectedMentor,
        learner_id: selectedLearner,
      });
      if (error) throw error;

      // Remove from waiting list
      await supabase.from("waiting_list").delete().eq("learner_id", selectedLearner);

      await supabase.from("notifications").insert({
        user_id: selectedLearner,
        title: "Mentor Assigned",
        message: `You've been assigned a mentor!`,
        type: "assignment",
        link: "/dashboard/mentor",
      });

      await logMockEmail({
        recipientId: selectedLearner,
        emailType: "mentor_assignment",
        subject: "You've been assigned a mentor!",
        body: `A mentor has been assigned to you on EduBridge. Log in to see your mentor's profile.`,
      });

      toast.success("Assignment created!");
      setAssignDialog(false);
      setSelectedLearner("");
      setSelectedMentor("");
      fetchData();
    } catch (err: any) {
      toast.error(err.message || "Failed to create assignment");
    }
  };

  const handleDeactivate = async (id: string) => {
    await supabase.from("mentor_assignments").update({ status: "inactive" }).eq("id", id);
    toast.success("Assignment deactivated");
    fetchData();
  };

  const initials = (name: string) =>
    name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);

  const activeAssignments = assignments.filter((a) => a.status === "active");
  const inactiveAssignments = assignments.filter((a) => a.status !== "active");

  return (
    <DashboardLayout>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold font-['Space_Grotesk']">Assignments</h1>
          <p className="text-muted-foreground mt-1">Manage mentor-learner assignments.</p>
        </div>
        <Button onClick={() => setAssignDialog(true)}>
          <UserPlus className="h-4 w-4 mr-2" /> New Assignment
        </Button>
      </div>

      {/* Waiting List */}
      {waitingList.length > 0 && (
        <Card className="mb-6 border-warning/30 bg-warning/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-['Space_Grotesk']">
              Waiting List ({waitingList.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {waitingList.map((w) => (
                <Badge key={w.id} variant="outline" className="border-warning text-warning">
                  {w.learner_name}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* New Assignment Dialog */}
      <Dialog open={assignDialog} onOpenChange={setAssignDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-['Space_Grotesk']">Create Assignment</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Learner</label>
              <Select value={selectedLearner} onValueChange={setSelectedLearner}>
                <SelectTrigger><SelectValue placeholder="Select learner" /></SelectTrigger>
                <SelectContent>
                  {unassignedLearners.map((l) => (
                    <SelectItem key={l.user_id} value={l.user_id}>{l.full_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Mentor</label>
              <Select value={selectedMentor} onValueChange={setSelectedMentor}>
                <SelectTrigger><SelectValue placeholder="Select mentor" /></SelectTrigger>
                <SelectContent>
                  {mentors.map((m) => (
                    <SelectItem key={m.user_id} value={m.user_id}>{m.full_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button className="w-full" onClick={handleNewAssignment} disabled={!selectedLearner || !selectedMentor}>
              Create Assignment
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Reassign Dialog */}
      <Dialog open={!!reassignDialog} onOpenChange={(open) => !open && setReassignDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-['Space_Grotesk']">Reassign Mentor</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground mb-4">
            Reassigning <strong>{reassignDialog?.learner_name}</strong> from{" "}
            <strong>{reassignDialog?.mentor_name}</strong> to a new mentor.
          </p>
          <Select value={newMentorId} onValueChange={setNewMentorId}>
            <SelectTrigger><SelectValue placeholder="Select new mentor" /></SelectTrigger>
            <SelectContent>
              {mentors
                .filter((m) => m.user_id !== reassignDialog?.mentor_id)
                .map((m) => (
                  <SelectItem key={m.user_id} value={m.user_id}>{m.full_name}</SelectItem>
                ))}
            </SelectContent>
          </Select>
          <Button className="w-full mt-4" onClick={handleReassign} disabled={!newMentorId}>
            Confirm Reassignment
          </Button>
        </DialogContent>
      </Dialog>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="font-['Space_Grotesk']">Active Assignments ({activeAssignments.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Learner</TableHead>
                    <TableHead>Mentor</TableHead>
                    <TableHead>Since</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {activeAssignments.map((a) => (
                    <TableRow key={a.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Avatar className="h-7 w-7">
                            <AvatarFallback className="bg-primary/10 text-primary text-xs">
                              {initials(a.learner_name)}
                            </AvatarFallback>
                          </Avatar>
                          <span className="font-medium">{a.learner_name}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Avatar className="h-7 w-7">
                            <AvatarFallback className="bg-secondary/10 text-secondary text-xs">
                              {initials(a.mentor_name)}
                            </AvatarFallback>
                          </Avatar>
                          <span>{a.mentor_name}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {format(new Date(a.created_at), "MMM d, yyyy")}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" onClick={() => { setReassignDialog(a); setNewMentorId(""); }}>
                            <ArrowRightLeft className="h-3.5 w-3.5 mr-1" /> Reassign
                          </Button>
                          <Button size="sm" variant="ghost" className="text-destructive" onClick={() => handleDeactivate(a.id)}>
                            <Trash2 className="h-3.5 w-3.5 mr-1" /> Deactivate
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {activeAssignments.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                        No active assignments.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {inactiveAssignments.length > 0 && (
            <Card className="border-border/30">
              <CardHeader>
                <CardTitle className="font-['Space_Grotesk'] text-muted-foreground">
                  Inactive Assignments ({inactiveAssignments.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Learner</TableHead>
                      <TableHead>Mentor</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {inactiveAssignments.map((a) => (
                      <TableRow key={a.id} className="opacity-60">
                        <TableCell>{a.learner_name}</TableCell>
                        <TableCell>{a.mentor_name}</TableCell>
                        <TableCell className="text-sm">{format(new Date(a.created_at), "MMM d, yyyy")}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="capitalize">{a.status}</Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </DashboardLayout>
  );
};

export default AdminAssignmentsPage;
