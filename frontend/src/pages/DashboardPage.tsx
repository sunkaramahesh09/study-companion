import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { getTasksForDateRange, getOverdueTasks, toggleTaskComplete, getStreak, updateStreak, revertStreak, deleteTopic, addDailyTask, TaskRow } from "@/lib/api";
import { format, addDays } from "date-fns";
import TaskCard from "@/components/TaskCard";
import AddTopicForm from "@/components/AddTopicForm";
import LoadingSpinner from "@/components/LoadingSpinner";
import { Flame, Target, AlertTriangle, Calendar, ChevronRight, Plus, Sparkles } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const DAILY_PRESETS = [
  { label: "💧 Water", title: "Drink Water" },
  { label: "🏋️ Gym", title: "Do Gym" },
  { label: "📚 Read", title: "Read a Book" },
  { label: "🧘 Meditate", title: "Meditate" },
  { label: "🚶 Walk", title: "Go for a Walk" },
  { label: "🛌 Sleep Early", title: "Sleep Early" },
];

export default function DashboardPage() {
  const { user } = useAuth();
  const [todayTasks, setTodayTasks] = useState<TaskRow[]>([]);
  const [overdueTasks, setOverdueTasks] = useState<TaskRow[]>([]);
  const [upcomingTasks, setUpcomingTasks] = useState<TaskRow[]>([]);
  const [streak, setStreak] = useState({ current: 0, longest: 0 });
  const [loading, setLoading] = useState(true);
  const [quickTaskTitle, setQuickTaskTitle] = useState("");
  const [isAddingQuick, setIsAddingQuick] = useState(false);
  const [addingPreset, setAddingPreset] = useState<string | null>(null);

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

  const handleAddDailyTask = async (title: string) => {
    if (!title.trim() || !user) return;
    setIsAddingQuick(true);
    try {
      await addDailyTask(user.id, title.trim());
      setQuickTaskTitle("");
      toast.success(`"${title.trim()}" added to today!`);
      fetchData();
    } catch {
      toast.error("Failed to add daily task");
    } finally {
      setIsAddingQuick(false);
      setAddingPreset(null);
    }
  };

  const handlePresetClick = async (preset: { label: string; title: string }) => {
    if (!user || addingPreset) return;
    setAddingPreset(preset.label);
    await handleAddDailyTask(preset.title);
  };

  const handleQuickAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    await handleAddDailyTask(quickTaskTitle);
  };

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

  const studyTasks = todayTasks.filter(t => t.task_type !== "daily_task");
  const dailyHabitTasks = todayTasks.filter(t => t.task_type === "daily_task");
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

      {/* Daily Habits */}
      <div className="border border-teal-500/30 rounded-lg p-4 bg-teal-500/5 space-y-3">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-teal-500" />
          <h2 className="text-sm font-semibold text-foreground">Daily Habits</h2>
          <span className="text-xs text-muted-foreground ml-1">— no revisions needed</span>
        </div>

        {/* Preset buttons */}
        <div className="flex flex-wrap gap-2">
          {DAILY_PRESETS.map(preset => (
            <button
              key={preset.label}
              onClick={() => handlePresetClick(preset)}
              disabled={!!addingPreset || isAddingQuick}
              className="px-3 py-1.5 rounded-full text-xs font-medium border border-teal-500/30 bg-teal-500/10 text-teal-700 dark:text-teal-300 hover:bg-teal-500/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {addingPreset === preset.label ? "Adding…" : preset.label}
            </button>
          ))}
        </div>

        {/* Custom daily task input */}
        <form onSubmit={handleQuickAdd} className="flex gap-2">
          <Input
            value={quickTaskTitle}
            onChange={e => setQuickTaskTitle(e.target.value)}
            placeholder="Or type a custom habit for today…"
            className="h-9 text-sm"
            disabled={isAddingQuick}
          />
          <Button type="submit" size="sm" className="h-9 px-3" disabled={!quickTaskTitle.trim() || isAddingQuick}>
            <Plus className="h-4 w-4" />
          </Button>
        </form>

        {/* Today's daily habit tasks */}
        {dailyHabitTasks.length > 0 && (
          <div className="space-y-1 pt-1 border-t border-teal-500/20">
            {dailyHabitTasks.map(task => (
              <TaskCard key={task.id} task={task} onToggle={handleToggle} onDelete={handleDelete} />
            ))}
          </div>
        )}
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
            <span className="text-xs font-mono text-muted-foreground">({studyTasks.length})</span>
          </div>
          <div className="space-y-2">
            {studyTasks.length === 0 ? (
              <p className="text-xs text-muted-foreground px-1 py-4">No study tasks for today. Add a topic!</p>
            ) : (
              studyTasks.map(task => (
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
