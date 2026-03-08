import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import {
  Users, GraduationCap, Calendar, ClipboardList,
  ArrowRight, TrendingUp, BookOpen, MessageSquare,
  Bell, UserPlus, FileText
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, AreaChart, Area
} from "recharts";

interface UserRow {
  user_id: string;
  full_name: string;
  role: string;
  profile_completed: boolean;
}

interface RecentActivity {
  id: string;
  type: "session" | "question" | "resource" | "assignment";
  title: string;
  time: string;
}

const CHART_COLORS = [
  "hsl(262, 83%, 58%)",
  "hsl(199, 89%, 48%)",
  "hsl(340, 82%, 52%)",
  "hsl(152, 69%, 40%)",
  "hsl(38, 92%, 50%)",
];

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    learners: 0, mentors: 0, admins: 0,
    assignments: 0, waiting: 0,
    sessions: 0, resources: 0, questions: 0,
  });
  const [recentUsers, setRecentUsers] = useState<UserRow[]>([]);
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [roleData, setRoleData] = useState<{ name: string; value: number }[]>([]);
  const [sessionData, setSessionData] = useState<{ name: string; count: number }[]>([]);
  const [signupTrend, setSignupTrend] = useState<{ date: string; count: number }[]>([]);
  const [activityTrend, setActivityTrend] = useState<{ date: string; sessions: number; questions: number }[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      const [rolesRes, assignRes, waitRes, profilesRes, sessionsRes, resourcesRes, questionsRes] =
        await Promise.all([
          supabase.from("user_roles").select("user_id, role"),
          supabase.from("mentor_assignments").select("*", { count: "exact", head: true }).eq("status", "active"),
          supabase.from("waiting_list").select("*", { count: "exact", head: true }),
          supabase.from("profiles").select("user_id, full_name, profile_completed, created_at").order("created_at", { ascending: false }),
          supabase.from("sessions").select("id, title, scheduled_at, status, created_at").order("created_at", { ascending: false }),
          supabase.from("resources").select("*", { count: "exact", head: true }),
          supabase.from("questions").select("id, title, status, created_at").order("created_at", { ascending: false }),
        ]);

      const roles = rolesRes.data || [];
      const learners = roles.filter((r) => r.role === "learner").length;
      const mentors = roles.filter((r) => r.role === "mentor").length;
      const admins = roles.filter((r) => r.role === "admin").length;

      setStats({
        learners, mentors, admins,
        assignments: assignRes.count || 0,
        waiting: waitRes.count || 0,
        sessions: (sessionsRes.data || []).length,
        resources: resourcesRes.count || 0,
        questions: (questionsRes.data || []).length,
      });

      // Role distribution for pie chart
      setRoleData([
        { name: "Learners", value: learners },
        { name: "Mentors", value: mentors },
        { name: "Admins", value: admins },
      ]);

      // Session status distribution for bar chart
      const sessions = sessionsRes.data || [];
      const statusCounts: Record<string, number> = {};
      sessions.forEach((s) => {
        statusCounts[s.status] = (statusCounts[s.status] || 0) + 1;
      });
      setSessionData(
        Object.entries(statusCounts).map(([name, count]) => ({
          name: name.charAt(0).toUpperCase() + name.slice(1),
          count,
        }))
      );

      // Recent users (last 5)
      const profiles = profilesRes.data || [];
      const merged: UserRow[] = profiles.slice(0, 5).map((p) => ({
        user_id: p.user_id,
        full_name: p.full_name,
        role: roles.find((r) => r.user_id === p.user_id)?.role || "unknown",
        profile_completed: p.profile_completed,
      }));
      setRecentUsers(merged);

      // Recent activity feed
      const activities: RecentActivity[] = [];
      (sessionsRes.data || []).slice(0, 3).forEach((s) =>
        activities.push({ id: s.id, type: "session", title: s.title, time: s.created_at })
      );
      (questionsRes.data || []).slice(0, 3).forEach((q) =>
        activities.push({ id: q.id, type: "question", title: q.title, time: q.created_at })
      );
      activities.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());
      setRecentActivity(activities.slice(0, 6));
    };
    fetchData();
  }, []);

  const statCards = [
    { label: "Total Learners", value: stats.learners, icon: GraduationCap, color: "hsl(262, 83%, 58%)" },
    { label: "Total Mentors", value: stats.mentors, icon: Users, color: "hsl(199, 89%, 48%)" },
    { label: "Active Assignments", value: stats.assignments, icon: Calendar, color: "hsl(340, 82%, 52%)" },
    { label: "Waiting List", value: stats.waiting, icon: ClipboardList, color: "hsl(152, 69%, 40%)" },
    { label: "Total Sessions", value: stats.sessions, icon: Calendar, color: "hsl(38, 92%, 50%)" },
    { label: "Resources", value: stats.resources, icon: BookOpen, color: "hsl(262, 83%, 58%)" },
    { label: "Questions", value: stats.questions, icon: MessageSquare, color: "hsl(199, 89%, 48%)" },
  ];

  const quickActions = [
    { label: "Manage Users", icon: Users, path: "/dashboard/users" },
    { label: "Assignments", icon: ClipboardList, path: "/dashboard/assignments" },
    { label: "Resources", icon: BookOpen, path: "/dashboard/resources" },
    { label: "Sessions", icon: Calendar, path: "/dashboard/sessions" },
  ];

  const activityIcon = (type: string) => {
    switch (type) {
      case "session": return <Calendar className="h-4 w-4 text-[hsl(var(--accent))]" />;
      case "question": return <MessageSquare className="h-4 w-4 text-[hsl(var(--secondary))]" />;
      case "resource": return <FileText className="h-4 w-4 text-[hsl(var(--success))]" />;
      default: return <Bell className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHrs = Math.floor(diffMins / 60);
    if (diffHrs < 24) return `${diffHrs}h ago`;
    return d.toLocaleDateString();
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold font-['Space_Grotesk']">Admin Dashboard</h1>
        <p className="text-muted-foreground mt-1">Platform overview and management.</p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.slice(0, 4).map((stat) => (
          <Card key={stat.label} className="border-border/50 hover:shadow-md transition-shadow">
            <CardContent className="pt-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                  <p className="text-3xl font-bold mt-1 font-['Space_Grotesk']">{stat.value}</p>
                </div>
                <div
                  className="h-12 w-12 rounded-xl flex items-center justify-center"
                  style={{ backgroundColor: `${stat.color}15` }}
                >
                  <stat.icon className="h-6 w-6" style={{ color: stat.color }} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Secondary stats row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {statCards.slice(4).map((stat) => (
          <Card key={stat.label} className="border-border/50">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div
                  className="h-10 w-10 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: `${stat.color}15` }}
                >
                  <stat.icon className="h-5 w-5" style={{ color: stat.color }} />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                  <p className="text-2xl font-bold font-['Space_Grotesk']">{stat.value}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Role Distribution Pie */}
        <Card>
          <CardHeader>
            <CardTitle className="font-['Space_Grotesk'] text-lg">User Distribution</CardTitle>
            <CardDescription>Breakdown by role</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={roleData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={4}
                    dataKey="value"
                    label={({ name, value }) => `${name}: ${value}`}
                  >
                    {roleData.map((_, index) => (
                      <Cell key={index} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Session Status Bar Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="font-['Space_Grotesk'] text-lg">Sessions by Status</CardTitle>
            <CardDescription>Current session breakdown</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[250px]">
              {sessionData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={sessionData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 13%, 91%)" />
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Bar dataKey="count" fill="hsl(262, 83%, 58%)" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground">
                  No sessions yet
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions + Activity Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="font-['Space_Grotesk'] text-lg">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {quickActions.map((action) => (
              <Button
                key={action.label}
                variant="outline"
                className="w-full justify-between"
                onClick={() => navigate(action.path)}
              >
                <span className="flex items-center gap-2">
                  <action.icon className="h-4 w-4" />
                  {action.label}
                </span>
                <ArrowRight className="h-4 w-4" />
              </Button>
            ))}
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="font-['Space_Grotesk'] text-lg">Recent Activity</CardTitle>
            <CardDescription>Latest sessions and questions</CardDescription>
          </CardHeader>
          <CardContent>
            {recentActivity.length > 0 ? (
              <div className="space-y-4">
                {recentActivity.map((item) => (
                  <div key={item.id} className="flex items-start gap-3 pb-3 border-b border-border/50 last:border-0">
                    <div className="mt-0.5 h-8 w-8 rounded-full bg-muted flex items-center justify-center shrink-0">
                      {activityIcon(item.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{item.title}</p>
                      <p className="text-xs text-muted-foreground capitalize">{item.type}</p>
                    </div>
                    <span className="text-xs text-muted-foreground whitespace-nowrap">{formatTime(item.time)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">No recent activity</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Users Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="font-['Space_Grotesk'] text-lg">Recent Users</CardTitle>
            <CardDescription>Newest platform members</CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={() => navigate("/dashboard/users")}>
            View All <ArrowRight className="h-4 w-4 ml-1" />
          </Button>
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
              {recentUsers.map((u) => (
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
              {recentUsers.length === 0 && (
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
