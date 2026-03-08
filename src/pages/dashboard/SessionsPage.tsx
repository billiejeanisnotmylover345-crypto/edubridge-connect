import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import DashboardLayout from "@/components/DashboardLayout";
import SessionCalendar from "@/components/SessionCalendar";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Calendar, Plus, Clock, User, Link as LinkIcon, ExternalLink, Pencil, List, CalendarDays, Star } from "lucide-react";
import SessionRatingDialog from "@/components/SessionRatingDialog";
import { format } from "date-fns";
import { logMockEmail } from "@/lib/emailLogger";

interface Session {
  id: string;
  mentor_id: string;
  learner_id: string;
  title: string;
  description: string;
  scheduled_at: string;
  duration_minutes: number;
  status: string;
  meeting_link: string | null;
  created_at: string;
  mentor_name?: string;
  learner_name?: string;
}

const SessionsPage = () => {
  const { user, role } = useAuth();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [duration, setDuration] = useState("60");
  const [meetingLink, setMeetingLink] = useState("");
  const [selectedLearner, setSelectedLearner] = useState("");
  const [learners, setLearners] = useState<{ id: string; name: string }[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [editingSession, setEditingSession] = useState<Session | null>(null);
  const [viewMode, setViewMode] = useState<"list" | "calendar">("list");
  const [calendarMonth, setCalendarMonth] = useState(new Date());
  const [ratingSession, setRatingSession] = useState<Session | null>(null);
  const [ratedSessionIds, setRatedSessionIds] = useState<Set<string>>(new Set());

  const canCreate = role === "mentor" || role === "admin";

  const fetchSessions = async () => {
    const { data } = await supabase
      .from("sessions")
      .select("*")
      .order("scheduled_at", { ascending: true });

    if (data) {
      const userIds = [...new Set(data.flatMap((s) => [s.mentor_id, s.learner_id]))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name")
        .in("user_id", userIds);

      const nameMap: Record<string, string> = {};
      profiles?.forEach((p) => (nameMap[p.user_id] = p.full_name));

      setSessions(
        data.map((s) => ({
          ...s,
          mentor_name: nameMap[s.mentor_id] || "Unknown",
          learner_name: nameMap[s.learner_id] || "Unknown",
        }))
      );
    }
    setLoading(false);
  };

  const fetchLearners = async () => {
    if (!user || role !== "mentor") return;
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

  const fetchRatedSessions = async () => {
    if (!user || role !== "learner") return;
    const { data } = await supabase
      .from("session_ratings")
      .select("session_id")
      .eq("learner_id", user.id);
    setRatedSessionIds(new Set(data?.map((d: any) => d.session_id) || []));
  };

  useEffect(() => {
    fetchSessions();
    fetchLearners();
    fetchRatedSessions();
  }, [user]);

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setScheduledAt("");
    setDuration("60");
    setMeetingLink("");
    setSelectedLearner("");
    setEditingSession(null);
  };

  const openCreate = () => {
    resetForm();
    setDialogOpen(true);
  };

  const openEdit = (s: Session) => {
    setEditingSession(s);
    setTitle(s.title);
    setDescription(s.description || "");
    setScheduledAt(format(new Date(s.scheduled_at), "yyyy-MM-dd'T'HH:mm"));
    setDuration(String(s.duration_minutes));
    setMeetingLink(s.meeting_link || "");
    setSelectedLearner(s.learner_id);
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSubmitting(true);

    try {
      if (editingSession) {
        const { error } = await supabase
          .from("sessions")
          .update({
            title,
            description,
            scheduled_at: new Date(scheduledAt).toISOString(),
            duration_minutes: parseInt(duration),
            meeting_link: meetingLink || null,
          })
          .eq("id", editingSession.id);
        if (error) throw error;
        toast.success("Session updated!");
      } else {
        const { error } = await supabase.from("sessions").insert({
          mentor_id: user.id,
          learner_id: selectedLearner,
          title,
          description,
          scheduled_at: new Date(scheduledAt).toISOString(),
          duration_minutes: parseInt(duration),
          meeting_link: meetingLink || null,
        });
        if (error) throw error;

        await supabase.from("notifications").insert({
          user_id: selectedLearner,
          title: "New Session Scheduled",
          message: `Your mentor scheduled "${title}" for ${format(new Date(scheduledAt), "MMM d, yyyy 'at' h:mm a")}`,
          type: "session",
          link: "/dashboard/sessions",
        });

        await logMockEmail({
          recipientId: selectedLearner,
          emailType: "session_scheduled",
          subject: `New Session: ${title}`,
          body: `Your mentor has scheduled a session "${title}" for ${format(new Date(scheduledAt), "MMM d, yyyy 'at' h:mm a")}. Log in to EduBridge to view details.`,
        });

        toast.success("Session created!");
      }

      setDialogOpen(false);
      resetForm();
      fetchSessions();
    } catch (err: any) {
      toast.error(err.message || "Failed to save session");
    } finally {
      setSubmitting(false);
    }
  };

  const updateStatus = async (id: string, status: string) => {
    const { error } = await supabase.from("sessions").update({ status }).eq("id", id);
    if (error) toast.error("Failed to update");
    else {
      toast.success(`Session marked as ${status}`);
      fetchSessions();
    }
  };

  const statusColor = (status: string) => {
    switch (status) {
      case "upcoming": return "bg-secondary/10 text-secondary border-secondary/30";
      case "completed": return "bg-success/10 text-success border-success/30";
      case "cancelled": return "bg-destructive/10 text-destructive border-destructive/30";
      default: return "";
    }
  };

  const handleSessionClick = (session: Session) => {
    if (role === "learner" && session.meeting_link && session.status === "upcoming") {
      window.open(session.meeting_link, "_blank", "noopener,noreferrer");
    }
  };

  const handleCalendarSessionClick = (session: Session) => {
    // Find the full session with names
    const fullSession = sessions.find((s) => s.id === session.id);
    if (fullSession && canCreate) {
      openEdit(fullSession);
    } else if (fullSession) {
      handleSessionClick(fullSession);
    }
  };

  return (
    <DashboardLayout>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold font-['Space_Grotesk']">Mentorship Sessions</h1>
          <p className="text-muted-foreground mt-1">View and manage your sessions.</p>
        </div>
        <div className="flex items-center gap-3">
          <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as "list" | "calendar")}>
            <TabsList>
              <TabsTrigger value="list" className="gap-1.5">
                <List className="h-3.5 w-3.5" /> List
              </TabsTrigger>
              <TabsTrigger value="calendar" className="gap-1.5">
                <CalendarDays className="h-3.5 w-3.5" /> Calendar
              </TabsTrigger>
            </TabsList>
          </Tabs>
          {canCreate && (
            <Button onClick={openCreate}><Plus className="h-4 w-4 mr-2" />New Session</Button>
          )}
        </div>
      </div>

      <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-['Space_Grotesk']">
              {editingSession ? "Edit Session" : "Schedule Session"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Title</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5">
                <LinkIcon className="h-3.5 w-3.5" />
                Meeting Link
              </Label>
              <Input
                type="url"
                placeholder="https://meet.google.com/... or https://zoom.us/..."
                value={meetingLink}
                onChange={(e) => setMeetingLink(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">Paste a Zoom, Google Meet, or Teams link</p>
            </div>
            {!editingSession && role === "mentor" && (
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
            )}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Date & Time</Label>
                <Input type="datetime-local" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label>Duration (min)</Label>
                <Input type="number" value={duration} onChange={(e) => setDuration(e.target.value)} min="15" max="180" />
              </div>
            </div>
            <Button type="submit" className="w-full" disabled={submitting || (!editingSession && !selectedLearner && role === "mentor")}>
              {submitting ? "Saving..." : (editingSession ? "Save Changes" : "Schedule Session")}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : viewMode === "calendar" ? (
        <SessionCalendar
          sessions={sessions}
          currentMonth={calendarMonth}
          onMonthChange={setCalendarMonth}
          onSessionClick={handleCalendarSessionClick}
        />
      ) : sessions.length === 0 ? (
        <Card className="border-border/50">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="h-16 w-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
                <Calendar className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold font-['Space_Grotesk'] mb-2">No Sessions Yet</h3>
              <p className="text-sm text-muted-foreground max-w-sm">
                {canCreate ? "Schedule your first mentorship session." : "Sessions will appear here once your mentor schedules them."}
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {sessions.map((s) => {
            const isClickable = role === "learner" && s.meeting_link && s.status === "upcoming";
            return (
              <Card
                key={s.id}
                className={`border-border/50 transition-colors ${isClickable ? "cursor-pointer hover:border-primary/50 hover:bg-accent/30" : ""}`}
                onClick={() => handleSessionClick(s)}
              >
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold font-['Space_Grotesk']">{s.title}</h3>
                        <Badge variant="outline" className={`capitalize text-xs ${statusColor(s.status)}`}>{s.status}</Badge>
                        {isClickable && (
                          <span className="flex items-center gap-1 text-xs text-primary font-medium">
                            <ExternalLink className="h-3 w-3" /> Join
                          </span>
                        )}
                      </div>
                      {s.description && <p className="text-sm text-muted-foreground mb-3">{s.description}</p>}
                      <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3.5 w-3.5" />
                          {format(new Date(s.scheduled_at), "MMM d, yyyy 'at' h:mm a")}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5" />
                          {s.duration_minutes} min
                        </span>
                        <span className="flex items-center gap-1">
                          <User className="h-3.5 w-3.5" />
                          {role === "learner" ? `Mentor: ${s.mentor_name}` : `Student: ${s.learner_name}`}
                        </span>
                        {s.meeting_link && canCreate && (
                          <a
                            href={s.meeting_link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-primary hover:underline"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <LinkIcon className="h-3.5 w-3.5" />
                            Meeting Link
                          </a>
                        )}
                      </div>
                    </div>
                    {canCreate && s.status === "upcoming" && (
                      <div className="flex gap-2 ml-4" onClick={(e) => e.stopPropagation()}>
                        <Button size="sm" variant="outline" onClick={() => openEdit(s)}>
                          <Pencil className="h-3.5 w-3.5 mr-1" /> Edit
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => updateStatus(s.id, "completed")}>
                          Complete
                        </Button>
                        <Button size="sm" variant="ghost" className="text-destructive" onClick={() => updateStatus(s.id, "cancelled")}>
                          Cancel
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </DashboardLayout>
  );
};

export default SessionsPage;
