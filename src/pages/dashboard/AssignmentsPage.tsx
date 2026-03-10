import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import DashboardLayout from "@/components/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Plus, Clock, FileText, Send, CheckCircle2, AlertCircle, Pencil } from "lucide-react";
import { format, isPast, formatDistanceToNow } from "date-fns";

interface Assignment {
  id: string;
  mentor_id: string;
  title: string;
  description: string;
  deadline_at: string;
  submission_instructions: string;
  created_at: string;
}

interface Submission {
  id: string;
  assignment_id: string;
  learner_id: string;
  content: string;
  file_url: string | null;
  submitted_at: string;
  status: string;
  feedback: string | null;
  grade: string | null;
}

const AssignmentsPage = () => {
  const { user, role } = useAuth();
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [submissions, setSubmissions] = useState<Record<string, Submission>>({});
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [editDialog, setEditDialog] = useState<Assignment | null>(null);
  const [submitDialog, setSubmitDialog] = useState<Assignment | null>(null);
  const [viewDialog, setViewDialog] = useState<Assignment | null>(null);
  const [assignmentSubmissions, setAssignmentSubmissions] = useState<(Submission & { learner_name?: string })[]>([]);

  // Create/Edit form
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [deadlineDate, setDeadlineDate] = useState("");
  const [deadlineTime, setDeadlineTime] = useState("23:59");
  const [instructions, setInstructions] = useState("");

  // Submit form
  const [submitContent, setSubmitContent] = useState("");

  const isMentor = role === "mentor";
  const isLearner = role === "learner";

  const fetchAssignments = async () => {
    const { data, error } = await supabase
      .from("assignments")
      .select("*")
      .order("deadline_at", { ascending: true });

    if (error) {
      console.error(error);
      return;
    }
    setAssignments(data || []);

    // If learner, fetch own submissions
    if (isLearner && user && data?.length) {
      const { data: subs } = await supabase
        .from("assignment_submissions")
        .select("*")
        .eq("learner_id", user.id);

      const subMap: Record<string, Submission> = {};
      subs?.forEach((s) => (subMap[s.assignment_id] = s));
      setSubmissions(subMap);
    }

    setLoading(false);
  };

  useEffect(() => {
    fetchAssignments();
  }, []);

  const handleCreate = async () => {
    if (!title || !deadlineDate || !user) return;
    const deadlineAt = new Date(`${deadlineDate}T${deadlineTime}`).toISOString();

    const { error } = await supabase.from("assignments").insert({
      mentor_id: user.id,
      title,
      description,
      deadline_at: deadlineAt,
      submission_instructions: instructions,
    });

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success("Assignment created!");
    setCreateOpen(false);
    setTitle("");
    setDescription("");
    setDeadlineDate("");
    setDeadlineTime("23:59");
    setInstructions("");
    fetchAssignments();
  };

  const handleEdit = async () => {
    if (!editDialog || !title || !deadlineDate || !user) return;
    const deadlineAt = new Date(`${deadlineDate}T${deadlineTime}`).toISOString();

    const { error } = await supabase
      .from("assignments")
      .update({
        title,
        description,
        deadline_at: deadlineAt,
        submission_instructions: instructions,
      })
      .eq("id", editDialog.id);

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success("Assignment updated!");
    setEditDialog(null);
    resetForm();
    fetchAssignments();
  };

  const openEditDialog = (a: Assignment) => {
    const d = new Date(a.deadline_at);
    setTitle(a.title);
    setDescription(a.description || "");
    setDeadlineDate(d.toISOString().slice(0, 10));
    setDeadlineTime(d.toTimeString().slice(0, 5));
    setInstructions(a.submission_instructions || "");
    setEditDialog(a);
  };

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setDeadlineDate("");
    setDeadlineTime("23:59");
    setInstructions("");
  };

  const handleSubmit = async () => {
    if (!submitDialog || !user || !submitContent.trim()) return;

    const { error } = await supabase.from("assignment_submissions").insert({
      assignment_id: submitDialog.id,
      learner_id: user.id,
      content: submitContent,
    });

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success("Assignment submitted!");
    setSubmitDialog(null);
    setSubmitContent("");
    fetchAssignments();
  };

  const handleViewSubmissions = async (assignment: Assignment) => {
    setViewDialog(assignment);
    const { data: subs } = await supabase
      .from("assignment_submissions")
      .select("*")
      .eq("assignment_id", assignment.id);

    if (subs?.length) {
      const learnerIds = [...new Set(subs.map((s) => s.learner_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name")
        .in("user_id", learnerIds);

      const nameMap: Record<string, string> = {};
      profiles?.forEach((p) => (nameMap[p.user_id] = p.full_name));

      setAssignmentSubmissions(
        subs.map((s) => ({ ...s, learner_name: nameMap[s.learner_id] || "Unknown" }))
      );
    } else {
      setAssignmentSubmissions([]);
    }
  };

  const handleGrade = async (submissionId: string, grade: string, feedback: string) => {
    const { error } = await supabase
      .from("assignment_submissions")
      .update({ grade, feedback, status: "graded" })
      .eq("id", submissionId);

    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Graded!");
    if (viewDialog) handleViewSubmissions(viewDialog);
  };

  const getDeadlineStatus = (deadline: string) => {
    if (isPast(new Date(deadline))) return "overdue";
    const hoursLeft = (new Date(deadline).getTime() - Date.now()) / (1000 * 60 * 60);
    if (hoursLeft < 24) return "urgent";
    return "upcoming";
  };

  const deadlineBadge = (deadline: string) => {
    const status = getDeadlineStatus(deadline);
    if (status === "overdue")
      return <Badge variant="destructive">Overdue</Badge>;
    if (status === "urgent")
      return <Badge className="bg-orange-500/10 text-orange-600 border-orange-300">Due Soon</Badge>;
    return <Badge variant="outline" className="text-muted-foreground">Upcoming</Badge>;
  };

  return (
    <DashboardLayout>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold font-['Space_Grotesk']">Assignments</h1>
          <p className="text-muted-foreground mt-1">
            {isMentor ? "Create and manage assignments for your learners." : "View and submit your assignments."}
          </p>
        </div>
        {isMentor && (
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4 mr-2" /> New Assignment
          </Button>
        )}
      </div>

      {/* Create Assignment Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-['Space_Grotesk']">Create Assignment</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Title</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Assignment title" />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What should learners do?" rows={3} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Deadline Date</Label>
                <Input type="date" value={deadlineDate} onChange={(e) => setDeadlineDate(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Deadline Time</Label>
                <Input type="time" value={deadlineTime} onChange={(e) => setDeadlineTime(e.target.value)} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Submission Instructions</Label>
              <Textarea
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                placeholder="How should learners submit? (e.g., paste a link, write a summary, upload a file...)"
                rows={3}
              />
            </div>
            <Button className="w-full" onClick={handleCreate} disabled={!title || !deadlineDate}>
              Create Assignment
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Submit Dialog (Learner) */}
      <Dialog open={!!submitDialog} onOpenChange={(open) => !open && setSubmitDialog(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-['Space_Grotesk']">Submit: {submitDialog?.title}</DialogTitle>
          </DialogHeader>
          {submitDialog?.submission_instructions && (
            <div className="bg-muted/50 rounded-lg p-3 text-sm">
              <p className="font-medium mb-1">How to submit:</p>
              <p className="text-muted-foreground whitespace-pre-wrap">{submitDialog.submission_instructions}</p>
            </div>
          )}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Your Submission</Label>
              <Textarea
                value={submitContent}
                onChange={(e) => setSubmitContent(e.target.value)}
                placeholder="Write your answer or paste a link..."
                rows={5}
              />
            </div>
            <Button className="w-full" onClick={handleSubmit} disabled={!submitContent.trim()}>
              <Send className="h-4 w-4 mr-2" /> Submit Assignment
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* View Submissions Dialog (Mentor) */}
      <Dialog open={!!viewDialog} onOpenChange={(open) => !open && setViewDialog(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-['Space_Grotesk']">Submissions: {viewDialog?.title}</DialogTitle>
          </DialogHeader>
          {assignmentSubmissions.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No submissions yet.</p>
          ) : (
            <div className="space-y-4">
              {assignmentSubmissions.map((sub) => (
                <SubmissionCard key={sub.id} submission={sub} onGrade={handleGrade} />
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Assignment List */}
      {loading ? (
        <div className="flex justify-center py-16">
          <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : assignments.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <FileText className="h-12 w-12 mx-auto text-muted-foreground/40 mb-4" />
            <p className="text-muted-foreground">
              {isMentor ? "No assignments created yet. Click \"New Assignment\" to get started." : "No assignments available yet."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {assignments.map((a) => {
            const sub = submissions[a.id];
            const isOverdue = isPast(new Date(a.deadline_at));

            return (
              <Card key={a.id} className="flex flex-col">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-lg font-['Space_Grotesk']">{a.title}</CardTitle>
                    {deadlineBadge(a.deadline_at)}
                  </div>
                  {a.description && (
                    <CardDescription className="whitespace-pre-wrap">{a.description}</CardDescription>
                  )}
                </CardHeader>
                <CardContent className="flex-1 flex flex-col justify-between gap-4">
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Clock className="h-4 w-4" />
                      <span>
                        Due: {format(new Date(a.deadline_at), "MMM d, yyyy 'at' h:mm a")}
                        {!isOverdue && (
                          <span className="ml-1">({formatDistanceToNow(new Date(a.deadline_at), { addSuffix: true })})</span>
                        )}
                      </span>
                    </div>
                    {a.submission_instructions && (
                      <div className="flex items-start gap-2 text-muted-foreground">
                        <FileText className="h-4 w-4 mt-0.5 shrink-0" />
                        <span className="line-clamp-2">{a.submission_instructions}</span>
                      </div>
                    )}
                  </div>

                  {/* Learner actions */}
                  {isLearner && (
                    <div>
                      {sub ? (
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="h-4 w-4 text-green-500" />
                          <span className="text-sm text-green-600 font-medium">
                            Submitted {format(new Date(sub.submitted_at), "MMM d")}
                          </span>
                          {sub.grade && (
                            <Badge variant="secondary" className="ml-auto">Grade: {sub.grade}</Badge>
                          )}
                        </div>
                      ) : (
                        <Button
                          size="sm"
                          className="w-full"
                          onClick={() => { setSubmitDialog(a); setSubmitContent(""); }}
                          disabled={isOverdue}
                        >
                          {isOverdue ? (
                            <><AlertCircle className="h-4 w-4 mr-2" /> Deadline Passed</>
                          ) : (
                            <><Send className="h-4 w-4 mr-2" /> Submit</>
                          )}
                        </Button>
                      )}
                      {sub?.feedback && (
                        <div className="mt-2 bg-muted/50 rounded-lg p-2 text-sm">
                          <span className="font-medium">Feedback:</span> {sub.feedback}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Mentor actions */}
                  {isMentor && (
                    <Button size="sm" variant="outline" onClick={() => handleViewSubmissions(a)}>
                      View Submissions
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </DashboardLayout>
  );
};

// Submission card with inline grading
function SubmissionCard({
  submission,
  onGrade,
}: {
  submission: Submission & { learner_name?: string };
  onGrade: (id: string, grade: string, feedback: string) => void;
}) {
  const [grade, setGrade] = useState(submission.grade || "");
  const [feedback, setFeedback] = useState(submission.feedback || "");
  const [editing, setEditing] = useState(!submission.grade);

  return (
    <Card>
      <CardContent className="pt-4 space-y-3">
        <div className="flex items-center justify-between">
          <span className="font-medium">{submission.learner_name}</span>
          <span className="text-xs text-muted-foreground">
            {format(new Date(submission.submitted_at), "MMM d, yyyy h:mm a")}
          </span>
        </div>
        <div className="bg-muted/50 rounded-lg p-3 text-sm whitespace-pre-wrap">{submission.content}</div>
        {editing ? (
          <div className="space-y-2">
            <div className="grid grid-cols-3 gap-2">
              <div className="space-y-1">
                <Label className="text-xs">Grade</Label>
                <Input value={grade} onChange={(e) => setGrade(e.target.value)} placeholder="A, B+, 85%..." />
              </div>
              <div className="col-span-2 space-y-1">
                <Label className="text-xs">Feedback</Label>
                <Input value={feedback} onChange={(e) => setFeedback(e.target.value)} placeholder="Optional feedback" />
              </div>
            </div>
            <Button size="sm" onClick={() => { onGrade(submission.id, grade, feedback); setEditing(false); }} disabled={!grade}>
              Save Grade
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-3 text-sm">
            <Badge variant="secondary">Grade: {submission.grade}</Badge>
            {submission.feedback && <span className="text-muted-foreground">{submission.feedback}</span>}
            <Button size="sm" variant="ghost" className="ml-auto" onClick={() => setEditing(true)}>Edit</Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default AssignmentsPage;
