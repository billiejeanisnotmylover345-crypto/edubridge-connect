import { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addDays,
  addMonths,
  subMonths,
  isSameMonth,
  isSameDay,
  isToday,
} from "date-fns";

interface Session {
  id: string;
  title: string;
  scheduled_at: string;
  status: string;
  meeting_link: string | null;
}

interface SessionCalendarProps {
  sessions: Session[];
  currentMonth: Date;
  onMonthChange: (date: Date) => void;
  onSessionClick?: (session: Session) => void;
}

const SessionCalendar = ({ sessions, currentMonth, onMonthChange, onSessionClick }: SessionCalendarProps) => {
  const days = useMemo(() => {
    const start = startOfWeek(startOfMonth(currentMonth), { weekStartsOn: 1 });
    const end = endOfWeek(endOfMonth(currentMonth), { weekStartsOn: 1 });
    const result: Date[] = [];
    let day = start;
    while (day <= end) {
      result.push(day);
      day = addDays(day, 1);
    }
    return result;
  }, [currentMonth]);

  const sessionsByDay = useMemo(() => {
    const map: Record<string, Session[]> = {};
    sessions.forEach((s) => {
      const key = format(new Date(s.scheduled_at), "yyyy-MM-dd");
      if (!map[key]) map[key] = [];
      map[key].push(s);
    });
    return map;
  }, [sessions]);

  const statusDot = (status: string) => {
    switch (status) {
      case "upcoming": return "bg-secondary";
      case "completed": return "bg-emerald-500";
      case "cancelled": return "bg-destructive";
      default: return "bg-muted-foreground";
    }
  };

  return (
    <Card>
      <CardContent className="pt-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <Button variant="ghost" size="icon" onClick={() => onMonthChange(subMonths(currentMonth, 1))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <h3 className="text-lg font-semibold font-['Space_Grotesk']">
            {format(currentMonth, "MMMM yyyy")}
          </h3>
          <Button variant="ghost" size="icon" onClick={() => onMonthChange(addMonths(currentMonth, 1))}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {/* Day headers */}
        <div className="grid grid-cols-7 gap-1 mb-1">
          {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
            <div key={d} className="text-center text-xs font-medium text-muted-foreground py-2">
              {d}
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7 gap-1">
          {days.map((day, i) => {
            const key = format(day, "yyyy-MM-dd");
            const daySessions = sessionsByDay[key] || [];
            const inMonth = isSameMonth(day, currentMonth);
            const today = isToday(day);

            return (
              <div
                key={i}
                className={`min-h-[80px] rounded-lg border p-1 transition-colors ${
                  !inMonth
                    ? "bg-muted/30 border-border/30"
                    : today
                    ? "bg-primary/5 border-primary/30"
                    : "border-border/50 hover:bg-muted/30"
                }`}
              >
                <div className={`text-xs font-medium mb-1 px-1 ${!inMonth ? "text-muted-foreground/50" : today ? "text-primary" : "text-muted-foreground"}`}>
                  {format(day, "d")}
                </div>
                <div className="space-y-0.5">
                  {daySessions.slice(0, 3).map((s) => (
                    <button
                      key={s.id}
                      className="w-full text-left px-1 py-0.5 rounded text-[10px] leading-tight truncate hover:bg-muted/60 transition-colors flex items-center gap-1"
                      onClick={() => onSessionClick?.(s)}
                    >
                      <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${statusDot(s.status)}`} />
                      <span className="truncate">{s.title}</span>
                    </button>
                  ))}
                  {daySessions.length > 3 && (
                    <p className="text-[10px] text-muted-foreground px-1">
                      +{daySessions.length - 3} more
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};

export default SessionCalendar;
