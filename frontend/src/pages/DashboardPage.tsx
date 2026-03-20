import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { getTasksForDateRange, getOverdueTasks, toggleTaskComplete, getStreak, updateStreak, revertStreak, deleteTopic, TaskRow } from "@/lib/api";
import { format, addDays } from "date-fns";
import TaskCard from "@/components/TaskCard";
import AddTopicForm from "@/components/AddTopicForm";
import LoadingSpinner from "@/components/LoadingSpinner";
import { Flame, Target, AlertTriangle, Calendar, ChevronRight } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";

export default function DashboardPage() {
  const { user } = useAuth();
  const [todayTasks, setTodayTasks] = useState<TaskRow[]>([]);
  const [overdueTasks, setOverdueTasks] = useState<TaskRow[]>([]);
  const [upcomingTasks, setUpcomingTasks] = useState<TaskRow[]>([]);
  const [streak, setStreak] = useState({ current: 0, longest: 0 });
  const [loading, setLoading] = useState(true);

  const today = format(new Date(), "yyyy-MM-dd");
  const threeDaysLater = format(addDays(new Date(), 3), "yyyy-MM-dd");
  const tomorrow = format(addDays(new Date(), 1), "yyyy-MM-dd");

  const fetchData = useCallback(async () => {
    if (!user) return;
    try {
      const [todayData, overdueData, upcomingData, streakData] = await Promise.all([
        getTasksForDateRange(user.id, today, today),
        getOverdueTasks(user.id),
        getTasksForDateRange(user.id, tomorrow, threeDaysLater),
        getStreak(user.id),
      ]);
      setTodayTasks(todayData);
      setOverdueTasks(overdueData);
      setUpcomingTasks(upcomingData);
      if (streakData) setStreak({ current: streakData.current_streak, longest: streakData.longest_streak });
    } catch (err: any) {
      toast.error("Failed to load data");
    } finally {
      setLoading(false);
    }
  }, [user, today, tomorrow, threeDaysLater]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleToggle = async (taskId: string, completed: boolean) => {
    const updateTasks = (prev: TaskRow[]) => 
      prev.map(t => t.id === taskId ? { ...t, completed } as TaskRow : t);
    
    setTodayTasks(updateTasks);
    setOverdueTasks(updateTasks);
    setUpcomingTasks(updateTasks);

    try {
      await toggleTaskComplete(taskId, completed);
      if (user) {
        if (completed) await updateStreak(user.id);
        else await revertStreak(user.id);
      }
      fetchData();
    } catch (err: any) {
      toast.error("Failed to update task");
      fetchData();
    }
  };

  const handleDelete = async (topicId: string) => {
    try {
      await deleteTopic(topicId);
      toast.success("Topic deleted");
      fetchData();
    } catch {
      toast.error("Failed to delete topic");
    }
  };

  const todayCompleted = todayTasks.filter(t => t.completed).length;
  const todayTotal = todayTasks.length;
  const progressPercent = todayTotal > 0 ? (todayCompleted / todayTotal) * 100 : 0;

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-20 md:pb-0">
      {/* Focus Header */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex items-center gap-4 p-4 rounded-lg border border-border bg-card flex-1">
          <div className="h-10 w-10 rounded-full bg-destructive/10 flex items-center justify-center">
            <Flame className="h-5 w-5 text-destructive" />
          </div>
          <div>
            <p className="text-2xl font-bold text-foreground">{streak.current}</p>
            <p className="text-xs text-muted-foreground">Day Streak · Best: {streak.longest}</p>
          </div>
        </div>

        <div className="p-4 rounded-lg border border-border bg-card flex-1">
          <div className="flex items-center gap-2 mb-2">
            <Target className="h-4 w-4 text-primary" />
            <p className="text-xs font-medium text-muted-foreground">Daily Goal</p>
            <span className="ml-auto text-xs font-mono text-foreground">{todayCompleted}/{todayTotal}</span>
          </div>
          <Progress value={progressPercent} className="h-2" />
        </div>
      </div>

      {/* Add Topic */}
      <AddTopicForm onAdded={fetchData} />

      {/* Task Columns */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Overdue */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 px-1">
            <AlertTriangle className="h-4 w-4 text-destructive" />
            <h2 className="text-sm font-semibold text-foreground">Overdue</h2>
            <span className="text-xs font-mono text-muted-foreground">({overdueTasks.length})</span>
          </div>
          <div className="space-y-2">
            {overdueTasks.length === 0 ? (
              <p className="text-xs text-muted-foreground px-1 py-4">All caught up! 🎉</p>
            ) : (
              overdueTasks.map(task => (
                <div key={task.id} className="border-l-2 border-destructive pl-0 rounded-r-md">
                  <TaskCard task={task} onToggle={handleToggle} onDelete={handleDelete} showDate />
                </div>
              ))
            )}
          </div>
        </div>

        {/* Today */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 px-1">
            <Calendar className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-semibold text-foreground">Today</h2>
            <span className="text-xs font-mono text-muted-foreground">({todayTasks.length})</span>
          </div>
          <div className="space-y-2">
            {todayTasks.length === 0 ? (
              <p className="text-xs text-muted-foreground px-1 py-4">No tasks for today. Add a topic!</p>
            ) : (
              todayTasks.map(task => (
                <div key={task.id} className="border-l-2 border-primary pl-0 rounded-r-md">
                  <TaskCard task={task} onToggle={handleToggle} onDelete={handleDelete} />
                </div>
              ))
            )}
          </div>
        </div>

        {/* Upcoming */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 px-1">
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold text-foreground">Upcoming</h2>
            <span className="text-xs font-mono text-muted-foreground">({upcomingTasks.length})</span>
          </div>
          <div className="space-y-2">
            {upcomingTasks.length === 0 ? (
              <p className="text-xs text-muted-foreground px-1 py-4">Nothing scheduled yet.</p>
            ) : (
              upcomingTasks.map(task => <TaskCard key={task.id} task={task} onToggle={handleToggle} onDelete={handleDelete} showDate />)
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
