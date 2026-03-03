import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { Users, GraduationCap, Calendar, ClipboardList } from "lucide-react";

interface UserRow {
  user_id: string;
  full_name: string;
  role: string;
  profile_completed: boolean;
}

const AdminDashboard = () => {
  const [stats, setStats] = useState({ learners: 0, mentors: 0, assignments: 0, waiting: 0 });
  const [users, setUsers] = useState<UserRow[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      const [rolesRes, assignRes, waitRes, profilesRes] = await Promise.all([
        supabase.from("user_roles").select("user_id, role"),
        supabase.from("mentor_assignments").select("*", { count: "exact", head: true }).eq("status", "active"),
        supabase.from("waiting_list").select("*", { count: "exact", head: true }),
        supabase.from("profiles").select("user_id, full_name, profile_completed"),
      ]);

      const roles = rolesRes.data || [];
      const learners = roles.filter((r) => r.role === "learner").length;
      const mentors = roles.filter((r) => r.role === "mentor").length;

      setStats({
        learners,
        mentors,
        assignments: assignRes.count || 0,
        waiting: waitRes.count || 0,
      });

      // Merge profiles with roles
      const profiles = profilesRes.data || [];
      const merged: UserRow[] = profiles.map((p) => ({
        user_id: p.user_id,
        full_name: p.full_name,
        role: roles.find((r) => r.user_id === p.user_id)?.role || "unknown",
        profile_completed: p.profile_completed,
      }));
      setUsers(merged);
    };
    fetchData();
  }, []);

  const statCards = [
    { label: "Total Learners", value: stats.learners, icon: GraduationCap, color: "hsl(262, 83%, 58%)" },
    { label: "Total Mentors", value: stats.mentors, icon: Users, color: "hsl(199, 89%, 48%)" },
    { label: "Active Assignments", value: stats.assignments, icon: Calendar, color: "hsl(340, 82%, 52%)" },
    { label: "Waiting List", value: stats.waiting, icon: ClipboardList, color: "hsl(152, 69%, 40%)" },
  ];

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold font-['Space_Grotesk']">Admin Dashboard</h1>
        <p className="text-muted-foreground mt-1">Platform overview and user management.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {statCards.map((stat) => (
          <Card key={stat.label} className="border-border/50">
            <CardContent className="pt-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                  <p className="text-2xl font-bold mt-1 font-['Space_Grotesk']">{stat.value}</p>
                </div>
                <div
                  className="h-10 w-10 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: `${stat.color}15` }}
                >
                  <stat.icon className="h-5 w-5" style={{ color: stat.color }} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="font-['Space_Grotesk']">All Users</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Profile Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((u) => (
                <TableRow key={u.user_id}>
                  <TableCell className="font-medium">{u.full_name || "—"}</TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="capitalize">{u.role}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={u.profile_completed ? "default" : "outline"}>
                      {u.profile_completed ? "Complete" : "Incomplete"}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
              {users.length === 0 && (
                <TableRow>
                  <TableCell colSpan={3} className="text-center text-muted-foreground">
                    No users yet.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminDashboard;
