import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { getAllTasks, TaskRow } from "@/lib/api";
import { format, subDays, startOfWeek, endOfWeek, eachDayOfInterval, parseISO } from "date-fns";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";
import LoadingSpinner from "@/components/LoadingSpinner";
import { toast } from "sonner";

const CHART_COLORS = ["hsl(142,71%,45%)", "hsl(142,71%,35%)", "hsl(152,60%,52%)", "hsl(158,64%,40%)", "hsl(138,50%,55%)", "hsl(165,60%,42%)"];

export default function AnalyticsPage() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<TaskRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    getAllTasks(user.id).then(setTasks).catch(() => toast.error("Failed to load")).finally(() => setLoading(false));
  }, [user]);

  if (loading) return <LoadingSpinner />;

  const completedTasks = tasks.filter(t => t.completed);

  // Daily completed (last 14 days)
  const dailyData = Array.from({ length: 14 }, (_, i) => {
    const date = format(subDays(new Date(), 13 - i), "yyyy-MM-dd");
    const count = completedTasks.filter(t => t.completed_at && format(parseISO(t.completed_at), "yyyy-MM-dd") === date).length;
    return { date: format(subDays(new Date(), 13 - i), "MMM d"), count };
  });

  // Subject distribution
  const subjectMap: Record<string, number> = {};
  tasks.forEach(t => {
    const subject = t.topic?.subject || "Other";
    subjectMap[subject] = (subjectMap[subject] || 0) + 1;
  });
  const subjectData = Object.entries(subjectMap).map(([name, value]) => ({ name, value }));

  // Weekly consistency (last 4 weeks)
  const weeklyData = Array.from({ length: 4 }, (_, i) => {
    const weekStart = startOfWeek(subDays(new Date(), (3 - i) * 7));
    const weekEnd = endOfWeek(subDays(new Date(), (3 - i) * 7));
    const days = eachDayOfInterval({ start: weekStart, end: weekEnd });
    const activeDays = days.filter(day => {
      const dateStr = format(day, "yyyy-MM-dd");
      return completedTasks.some(t => t.completed_at && format(parseISO(t.completed_at), "yyyy-MM-dd") === dateStr);
    }).length;
    return { week: `W${4 - i}`, activeDays, total: 7 };
  });

  // Revision completion rate
  const todayStr = format(new Date(), "yyyy-MM-dd");
  const revisionTasks = tasks.filter(t => t.task_type !== "learning" && t.due_date <= todayStr);
  const completedRevisions = revisionTasks.filter(t => t.completed).length;
  const revisionRate = revisionTasks.length > 0 ? Math.round((completedRevisions / revisionTasks.length) * 100) : 0;

  const learningTasks = tasks.filter(t => t.task_type === "learning");
  const completedLearning = learningTasks.filter(t => t.completed).length;
  const learningRate = learningTasks.length > 0 ? Math.round((completedLearning / learningTasks.length) * 100) : 0;

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-20 md:pb-0">
      <h1 className="text-lg font-semibold text-foreground">Analytics</h1>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Total Topics" value={tasks.filter(t => t.task_type === "learning").length} />
        <StatCard label="Completed" value={completedTasks.length} />
        <StatCard label="Revision Rate" value={`${revisionRate}%`} />
        <StatCard label="Learning Rate" value={`${learningRate}%`} />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="border border-border rounded-lg p-4 bg-card">
          <h3 className="text-sm font-medium text-foreground mb-4">Daily Completed (14 days)</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={dailyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
              <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} allowDecimals={false} />
              <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 6, fontSize: 12 }} />
              <Bar dataKey="count" fill="hsl(142,71%,45%)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="border border-border rounded-lg p-4 bg-card">
          <h3 className="text-sm font-medium text-foreground mb-4">Subject Distribution</h3>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={subjectData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={2} dataKey="value">
                {subjectData.map((_, i) => (
                  <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 6, fontSize: 12 }} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="border border-border rounded-lg p-4 bg-card md:col-span-2">
          <h3 className="text-sm font-medium text-foreground mb-4">Weekly Consistency</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={weeklyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="week" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
              <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} domain={[0, 7]} />
              <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 6, fontSize: 12 }} />
              <Bar dataKey="activeDays" fill="hsl(152,60%,52%)" radius={[4, 4, 0, 0]} name="Active Days" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="border border-border rounded-lg p-3 bg-card">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-xl font-bold text-foreground mt-1">{value}</p>
    </div>
  );
}
