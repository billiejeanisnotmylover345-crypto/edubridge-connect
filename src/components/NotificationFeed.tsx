import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { useNavigate } from "react-router-dom";
import { Bell, CheckCheck, Calendar, MessageSquare, UserPlus, Info } from "lucide-react";
import { motion } from "framer-motion";

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  read: boolean;
  link: string | null;
  created_at: string;
}

const typeConfig = (type: string) => {
  switch (type) {
    case "session":
      return { icon: Calendar, gradient: "gradient-cool", color: "text-secondary" };
    case "qa":
      return { icon: MessageSquare, gradient: "gradient-fresh", color: "text-success" };
    case "assignment":
      return { icon: UserPlus, gradient: "gradient-fun", color: "text-primary" };
    default:
      return { icon: Info, gradient: "gradient-warm", color: "text-accent" };
  }
};

const NotificationFeed = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const fetchNotifications = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(20);
    if (data) setNotifications(data);
  };

  useEffect(() => {
    fetchNotifications();

    if (!user) return;
    const channel = supabase
      .channel("notifications-feed")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
        (payload) => {
          setNotifications((prev) => [payload.new as Notification, ...prev]);
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const markAllRead = async () => {
    if (!user) return;
    await supabase
      .from("notifications")
      .update({ read: true })
      .eq("user_id", user.id)
      .eq("read", false);
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const handleClick = (n: Notification) => {
    if (!n.read) {
      supabase.from("notifications").update({ read: true }).eq("id", n.id).then(() => {
        setNotifications((prev) => prev.map((x) => (x.id === n.id ? { ...x, read: true } : x)));
      });
    }
    if (n.link) navigate(n.link);
  };

  return (
    <Card className="glass-card border-border/50 mt-6">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg gradient-fun flex items-center justify-center">
              <Bell className="h-4 w-4 text-white" />
            </div>
            <CardTitle className="text-lg font-['Space_Grotesk']">
              Notifications
              {unreadCount > 0 && (
                <span className="ml-2 inline-flex h-5 min-w-5 px-1.5 items-center justify-center rounded-full bg-accent text-accent-foreground text-xs font-bold">
                  {unreadCount}
                </span>
              )}
            </CardTitle>
          </div>
          {unreadCount > 0 && (
            <Button variant="ghost" size="sm" className="text-xs gap-1.5" onClick={markAllRead}>
              <CheckCheck className="h-3.5 w-3.5" />
              Mark all read
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="max-h-[400px]">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="h-12 w-12 rounded-2xl bg-muted flex items-center justify-center mb-3">
                <Bell className="h-6 w-6 text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground">No notifications yet</p>
              <p className="text-xs text-muted-foreground mt-1">You'll see updates here as they come in</p>
            </div>
          ) : (
            <div className="space-y-2">
              {notifications.map((n, i) => {
                const config = typeConfig(n.type);
                const Icon = config.icon;
                return (
                  <motion.div
                    key={n.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.03, duration: 0.3 }}
                    className={`flex gap-3 p-3 rounded-xl cursor-pointer transition-all hover:bg-muted/60 ${
                      !n.read ? "bg-primary/5 border border-primary/10" : "hover:bg-muted/40"
                    }`}
                    onClick={() => handleClick(n)}
                  >
                    <div className={`h-8 w-8 rounded-lg ${config.gradient} flex items-center justify-center shrink-0 shadow-sm`}>
                      <Icon className="h-4 w-4 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm leading-snug ${!n.read ? "font-semibold" : "font-medium"}`}>
                        {n.title}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.message}</p>
                      <p className="text-xs text-muted-foreground/70 mt-1">
                        {format(new Date(n.created_at), "MMM d 'at' h:mm a")}
                      </p>
                    </div>
                    {!n.read && (
                      <div className="h-2 w-2 rounded-full bg-primary shrink-0 mt-2" />
                    )}
                  </motion.div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
};

export default NotificationFeed;
