import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import DashboardLayout from "@/components/DashboardLayout";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { MessageSquare, Plus, Send, CheckCircle2 } from "lucide-react";
import { format } from "date-fns";
import { logMockEmail } from "@/lib/emailLogger";

interface Answer {
  id: string;
  body: string;
  answered_by: string;
  created_at: string;
  author_name?: string;
}

interface Question {
  id: string;
  asked_by: string;
  title: string;
  body: string;
  status: string;
  created_at: string;
  author_name?: string;
  answers: Answer[];
}

const QAPage = () => {
  const { user, role } = useAuth();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [replyText, setReplyText] = useState<Record<string, string>>({});
  const [expandedQ, setExpandedQ] = useState<string | null>(null);

  const fetchQuestions = async () => {
    const { data: qData } = await supabase
      .from("questions")
      .select("*")
      .order("created_at", { ascending: false });

    if (!qData) { setLoading(false); return; }

    const { data: aData } = await supabase
      .from("answers")
      .select("*")
      .order("created_at", { ascending: true });

    const allUserIds = [
      ...new Set([
        ...qData.map((q) => q.asked_by),
        ...(aData || []).map((a) => a.answered_by),
      ]),
    ];

    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, full_name")
      .in("user_id", allUserIds);

    const nameMap: Record<string, string> = {};
    profiles?.forEach((p) => (nameMap[p.user_id] = p.full_name));

    const answers = (aData || []).map((a) => ({
      ...a,
      author_name: nameMap[a.answered_by] || "Unknown",
    }));

    setQuestions(
      qData.map((q) => ({
        ...q,
        author_name: nameMap[q.asked_by] || "Unknown",
        answers: answers.filter((a) => a.question_id === q.id),
      }))
    );
    setLoading(false);
  };

  useEffect(() => {
    fetchQuestions();
  }, []);

  const handleAsk = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSubmitting(true);
    try {
      const { error } = await supabase.from("questions").insert({
        asked_by: user.id,
        title,
        body,
      });
      if (error) throw error;
      toast.success("Question posted!");
      setDialogOpen(false);
      setTitle("");
      setBody("");
      fetchQuestions();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleReply = async (questionId: string, askedBy: string) => {
    if (!user || !replyText[questionId]?.trim()) return;
    try {
      const { error } = await supabase.from("answers").insert({
        question_id: questionId,
        answered_by: user.id,
        body: replyText[questionId],
      });
      if (error) throw error;

      // Notify the question asker
      if (askedBy !== user.id) {
        await supabase.from("notifications").insert({
          user_id: askedBy,
          title: "New Answer",
          message: `Someone answered your question`,
          type: "qa",
          link: "/dashboard/qa",
        });

        await logMockEmail({
          recipientId: askedBy,
          emailType: "question_answered",
          subject: "Your question received an answer",
          body: `Someone answered your question on EduBridge. Log in to view the response.`,
        });
      }

      toast.success("Answer posted!");
      setReplyText((prev) => ({ ...prev, [questionId]: "" }));
      fetchQuestions();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const markResolved = async (id: string) => {
    await supabase.from("questions").update({ status: "resolved" }).eq("id", id);
    toast.success("Marked as resolved");
    fetchQuestions();
  };

  const initials = (name: string) =>
    name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);

  return (
    <DashboardLayout>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold font-['Space_Grotesk']">Q&A Forum</h1>
          <p className="text-muted-foreground mt-1">Ask questions and get answers from mentors.</p>
        </div>
        {role === "learner" && (
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 mr-2" />Ask Question</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle className="font-['Space_Grotesk']">Ask a Question</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleAsk} className="space-y-4">
                <div className="space-y-2">
                  <Label>Title</Label>
                  <Input value={title} onChange={(e) => setTitle(e.target.value)} required placeholder="Short summary of your question" />
                </div>
                <div className="space-y-2">
                  <Label>Details</Label>
                  <Textarea value={body} onChange={(e) => setBody(e.target.value)} rows={4} placeholder="Provide more context..." />
                </div>
                <Button type="submit" className="w-full" disabled={submitting}>
                  {submitting ? "Posting..." : "Post Question"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : questions.length === 0 ? (
        <Card className="border-border/50">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="h-16 w-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
                <MessageSquare className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold font-['Space_Grotesk'] mb-2">No Questions Yet</h3>
              <p className="text-sm text-muted-foreground">Be the first to ask a question!</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {questions.map((q) => (
            <Card key={q.id} className="border-border/50">
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1 cursor-pointer" onClick={() => setExpandedQ(expandedQ === q.id ? null : q.id)}>
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold font-['Space_Grotesk']">{q.title}</h3>
                      <Badge variant="outline" className={`capitalize text-xs ${q.status === "resolved" ? "bg-success/10 text-success border-success/30" : "bg-warning/10 text-warning border-warning/30"}`}>
                        {q.status}
                      </Badge>
                      <span className="text-xs text-muted-foreground ml-auto">
                        {q.answers.length} {q.answers.length === 1 ? "answer" : "answers"}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">{q.body}</p>
                    <p className="text-xs text-muted-foreground mt-2">
                      Asked by {q.author_name} · {format(new Date(q.created_at), "MMM d, yyyy")}
                    </p>
                  </div>
                  {q.asked_by === user?.id && q.status === "open" && q.answers.length > 0 && (
                    <Button variant="ghost" size="sm" className="text-success ml-2" onClick={() => markResolved(q.id)}>
                      <CheckCircle2 className="h-4 w-4 mr-1" /> Resolve
                    </Button>
                  )}
                </div>

                {expandedQ === q.id && (
                  <div className="mt-4">
                    <Separator className="mb-4" />
                    {q.answers.length > 0 && (
                      <div className="space-y-3 mb-4">
                        {q.answers.map((a) => (
                          <div key={a.id} className="flex gap-3">
                            <Avatar className="h-7 w-7 mt-0.5">
                              <AvatarFallback className="bg-primary/10 text-primary text-xs">
                                {initials(a.author_name || "U")}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium">{a.author_name}</span>
                                <span className="text-xs text-muted-foreground">{format(new Date(a.created_at), "MMM d 'at' h:mm a")}</span>
                              </div>
                              <p className="text-sm mt-1">{a.body}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    {(role === "mentor" || role === "admin") && q.status === "open" && (
                      <div className="flex gap-2">
                        <Input
                          placeholder="Write an answer..."
                          value={replyText[q.id] || ""}
                          onChange={(e) => setReplyText((prev) => ({ ...prev, [q.id]: e.target.value }))}
                          onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleReply(q.id, q.asked_by)}
                        />
                        <Button size="icon" onClick={() => handleReply(q.id, q.asked_by)} disabled={!replyText[q.id]?.trim()}>
                          <Send className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </DashboardLayout>
  );
};

export default QAPage;
