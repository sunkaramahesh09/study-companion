import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { getCompletedDates, getTasksForDate, toggleTaskComplete, updateStreak, revertStreak, deleteTopic, TaskRow } from "@/lib/api";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import TaskCard from "@/components/TaskCard";
import LoadingSpinner from "@/components/LoadingSpinner";
import { format } from "date-fns";
import { CalendarDays } from "lucide-react";
import { toast } from "sonner";

export default function CalendarPage() {
  const { user } = useAuth();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [completedDates, setCompletedDates] = useState<Date[]>([]);
  const [dayTasks, setDayTasks] = useState<TaskRow[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchCompletedDates = useCallback(async () => {
    if (!user) return;
    try {
      const dates = await getCompletedDates(user.id);
      setCompletedDates(dates.map(d => new Date(d + "T00:00:00")));
    } catch {
      // silent
    }
  }, [user]);

  const fetchDayTasks = useCallback(async (date: Date) => {
    if (!user) return;
    try {
      setLoading(true);
      const dateStr = format(date, "yyyy-MM-dd");
      const data = await getTasksForDate(user.id, dateStr);
      setDayTasks(data);
    } catch {
      toast.error("Failed to load tasks");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { fetchCompletedDates(); }, [fetchCompletedDates]);
  useEffect(() => { fetchDayTasks(selectedDate); }, [selectedDate, fetchDayTasks]);

  const handleToggle = async (taskId: string, completed: boolean) => {
    try {
      await toggleTaskComplete(taskId, completed);
      if (user) {
        if (completed) await updateStreak(user.id);
        else await revertStreak(user.id);
      }
      fetchDayTasks(selectedDate);
      fetchCompletedDates();
    } catch {
      toast.error("Failed to update task");
    }
  };

  const handleDelete = async (topicId: string) => {
    try {
      await deleteTopic(topicId);
      toast.success("Topic deleted");
      fetchDayTasks(selectedDate);
      fetchCompletedDates();
    } catch {
      toast.error("Failed to delete topic");
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-20 md:pb-0">
      <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
        <CalendarDays className="h-5 w-5 text-primary" />
        Calendar
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-[auto_1fr] gap-6">
        <Card className="w-fit">
          <CardContent className="p-3">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={(d) => d && setSelectedDate(d)}
              modifiers={{ completed: completedDates }}
              modifiersClassNames={{ completed: "bg-primary/20 text-primary font-semibold" }}
              className="pointer-events-auto"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">
              Tasks for {format(selectedDate, "MMMM d, yyyy")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {loading ? (
              <LoadingSpinner className="min-h-[200px]" />
            ) : dayTasks.length === 0 ? (
              <p className="text-xs text-muted-foreground py-4">No tasks for this date.</p>
            ) : (
              dayTasks.map(task => (
                <TaskCard key={task.id} task={task} onToggle={handleToggle} onDelete={handleDelete} showDate />
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
