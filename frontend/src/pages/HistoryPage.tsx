import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { getCompletedTasks, TaskRow } from "@/lib/api";
import { format, parseISO } from "date-fns";
import TaskCard from "@/components/TaskCard";
import { toast } from "sonner";
import LoadingSpinner from "@/components/LoadingSpinner";

export default function HistoryPage() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<TaskRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    getCompletedTasks(user.id).then(setTasks).catch(() => toast.error("Failed to load")).finally(() => setLoading(false));
  }, [user]);

  if (loading) return <LoadingSpinner />;

  // Group by date
  const grouped: Record<string, TaskRow[]> = {};
  tasks.forEach(t => {
    const date = t.completed_at ? format(parseISO(t.completed_at), "yyyy-MM-dd") : "Unknown";
    if (!grouped[date]) grouped[date] = [];
    grouped[date].push(t);
  });

  const dates = Object.keys(grouped).sort((a, b) => b.localeCompare(a));

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-20 md:pb-0">
      <h1 className="text-lg font-semibold text-foreground">History</h1>

      {dates.length === 0 ? (
        <p className="text-sm text-muted-foreground py-8 text-center">No completed tasks yet. Start learning!</p>
      ) : (
        dates.map(date => (
          <div key={date} className="space-y-2">
            <h2 className="text-xs font-medium text-muted-foreground font-mono px-1">
              {date === "Unknown" ? "Unknown" : format(parseISO(date), "EEEE, MMM d, yyyy")}
            </h2>
            <div className="space-y-1">
              {grouped[date].map(task => (
                <TaskCard key={task.id} task={task} onToggle={() => {}} />
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
