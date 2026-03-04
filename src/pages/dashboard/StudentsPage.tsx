import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import DashboardLayout from "@/components/DashboardLayout";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Users } from "lucide-react";

interface Student {
  user_id: string;
  full_name: string;
  bio: string | null;
  interests: string[] | null;
}

const StudentsPage = () => {
  const { user } = useAuth();
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const fetch = async () => {
      const { data: assignments } = await supabase
        .from("mentor_assignments")
        .select("learner_id")
        .eq("mentor_id", user.id)
        .eq("status", "active");

      if (assignments && assignments.length > 0) {
        const ids = assignments.map((a) => a.learner_id);
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, full_name, bio, interests")
          .in("user_id", ids);
        setStudents(profiles || []);
      }
      setLoading(false);
    };
    fetch();
  }, [user]);

  const initials = (name: string) => name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);

  return (
    <DashboardLayout>
      <div className="mb-8">
        <h1 className="text-3xl font-bold font-['Space_Grotesk']">My Students</h1>
        <p className="text-muted-foreground mt-1">Manage your assigned learners.</p>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : students.length === 0 ? (
        <Card className="border-border/50">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="h-16 w-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
                <Users className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold font-['Space_Grotesk'] mb-2">No Students Yet</h3>
              <p className="text-sm text-muted-foreground">Students will appear here once they are assigned to you.</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-border/50">
          <CardContent className="pt-6">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead>Bio</TableHead>
                  <TableHead>Interests</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {students.map((s) => (
                  <TableRow key={s.user_id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="bg-primary/10 text-primary text-xs">{initials(s.full_name)}</AvatarFallback>
                        </Avatar>
                        <span className="font-medium">{s.full_name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm max-w-xs truncate">{s.bio || "—"}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {s.interests?.slice(0, 3).map((i) => (
                          <Badge key={i} variant="outline" className="text-xs">{i}</Badge>
                        )) || "—"}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </DashboardLayout>
  );
};

export default StudentsPage;
