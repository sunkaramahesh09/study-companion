import { supabase } from "@/integrations/supabase/client";
import { format, addDays } from "date-fns";
import type { Database } from "@/integrations/supabase/types";

type TaskType = Database["public"]["Enums"]["task_type"];
type DifficultyLevel = Database["public"]["Enums"]["difficulty_level"];

export interface TopicWithTasks {
  id: string;
  title: string;
  subject: string;
  difficulty: DifficultyLevel;
  notes: string | null;
  created_at: string;
  tasks: TaskRow[];
}

export interface TaskRow {
  id: string;
  topic_id: string;
  task_type: TaskType;
  due_date: string;
  completed: boolean;
  completed_at: string | null;
  created_at: string;
  topic?: {
    title: string;
    subject: string;
    difficulty: DifficultyLevel;
  };
}

// Revision schedule: Day 0, Day 7, Day 10, Day 30
const REVISION_SCHEDULE: { type: TaskType; daysOffset: number }[] = [
  { type: "learning", daysOffset: 0 },
  { type: "revision_1", daysOffset: 7 },
  { type: "revision_2", daysOffset: 10 },
  { type: "revision_3", daysOffset: 30 },
];

export async function addTopic(
  userId: string,
  title: string,
  subject: string,
  difficulty: DifficultyLevel,
  notes: string | null,
  date: Date
) {
  const { data: topic, error: topicError } = await supabase
    .from("topics")
    .insert({ user_id: userId, title, subject, difficulty, notes })
    .select()
    .single();

  if (topicError || !topic) throw topicError;

  const tasks = REVISION_SCHEDULE.map((rev) => ({
    user_id: userId,
    topic_id: topic.id,
    task_type: rev.type,
    due_date: format(addDays(date, rev.daysOffset), "yyyy-MM-dd"),
  }));

  const { error: tasksError } = await supabase.from("tasks").insert(tasks);
  if (tasksError) throw tasksError;

  return topic;
}

// Add a past entry with optional pre-completed revisions
export async function addPastEntry(
  userId: string,
  title: string,
  subject: string,
  difficulty: DifficultyLevel,
  notes: string | null,
  date: Date,
  rev1Completed: boolean,
  rev1Date: string | null,
  rev2Completed: boolean,
  rev2Date: string | null,
  rev3Completed: boolean = false,
  rev3Date: string | null = null
) {
  const { data: topic, error: topicError } = await supabase
    .from("topics")
    .insert({ user_id: userId, title, subject, difficulty, notes })
    .select()
    .single();

  if (topicError || !topic) throw topicError;

  const learningDate = format(date, "yyyy-MM-dd");
  const rev1DueDate = format(addDays(date, 7), "yyyy-MM-dd");
  const rev2DueDate = format(addDays(date, 10), "yyyy-MM-dd");
  const rev3DueDate = format(addDays(date, 30), "yyyy-MM-dd");

  const tasks = [
    {
      user_id: userId,
      topic_id: topic.id,
      task_type: "learning" as TaskType,
      due_date: learningDate,
      completed: true,
      completed_at: new Date(learningDate + "T12:00:00").toISOString(),
    },
    {
      user_id: userId,
      topic_id: topic.id,
      task_type: "revision_1" as TaskType,
      due_date: rev1DueDate,
      completed: rev1Completed,
      completed_at: rev1Completed && rev1Date ? new Date(rev1Date + "T12:00:00").toISOString() : null,
    },
    {
      user_id: userId,
      topic_id: topic.id,
      task_type: "revision_2" as TaskType,
      due_date: rev2DueDate,
      completed: rev2Completed,
      completed_at: rev2Completed && rev2Date ? new Date(rev2Date + "T12:00:00").toISOString() : null,
    },
    {
      user_id: userId,
      topic_id: topic.id,
      task_type: "revision_3" as TaskType,
      due_date: rev3DueDate,
      completed: rev3Completed,
      completed_at: rev3Completed && rev3Date ? new Date(rev3Date + "T12:00:00").toISOString() : null,
    },
  ];

  const { error: tasksError } = await supabase.from("tasks").insert(tasks);
  if (tasksError) throw tasksError;

  return topic;
}

// Add a one-time daily task (no revision schedule)
export async function addDailyTask(
  userId: string,
  title: string
) {
  const { data: topic, error: topicError } = await supabase
    .from("topics")
    .insert({ user_id: userId, title, subject: "Daily Task", difficulty: "medium" as DifficultyLevel, notes: null })
    .select()
    .single();

  if (topicError || !topic) throw topicError;

  const today = format(new Date(), "yyyy-MM-dd");
  const { error: taskError } = await supabase.from("tasks").insert({
    user_id: userId,
    topic_id: topic.id,
    task_type: "daily_task" as TaskType,
    due_date: today,
  });

  if (taskError) throw taskError;
  return topic;
}

export async function getTasksForDateRange(userId: string, startDate: string, endDate: string) {
  const { data, error } = await supabase
    .from("tasks")
    .select("*, topic:topics(title, subject, difficulty)")
    .eq("user_id", userId)
    .gte("due_date", startDate)
    .lte("due_date", endDate)
    .order("due_date", { ascending: true });

  if (error) throw error;
  return (data || []) as unknown as TaskRow[];
}

export async function getOverdueTasks(userId: string) {
  const today = format(new Date(), "yyyy-MM-dd");
  const { data, error } = await supabase
    .from("tasks")
    .select("*, topic:topics(title, subject, difficulty)")
    .eq("user_id", userId)
    .eq("completed", false)
    .lt("due_date", today)
    .order("due_date", { ascending: true });

  if (error) throw error;
  return (data || []) as unknown as TaskRow[];
}

export async function toggleTaskComplete(taskId: string, completed: boolean) {
  const { error } = await supabase
    .from("tasks")
    .update({
      completed,
      completed_at: completed ? new Date().toISOString() : null,
    })
    .eq("id", taskId);

  if (error) throw error;
}

export async function getStreak(userId: string) {
  const { data, error } = await supabase
    .from("streaks")
    .select("*")
    .eq("user_id", userId)
    .single();

  if (error && error.code !== "PGRST116") throw error;
  return data;
}

export async function updateStreak(userId: string) {
  const today = format(new Date(), "yyyy-MM-dd");
  const yesterday = format(addDays(new Date(), -1), "yyyy-MM-dd");

  const todayStart = new Date();
  todayStart.setHours(0,0,0,0);

  const { data: todayTasks } = await supabase
    .from("tasks")
    .select("id")
    .eq("user_id", userId)
    .eq("completed", true)
    .gte("completed_at", todayStart.toISOString())
    .limit(1);

  if (!todayTasks || todayTasks.length === 0) return;

  const existing = await getStreak(userId);

  if (!existing) {
    await supabase.from("streaks").insert({
      user_id: userId,
      current_streak: 1,
      longest_streak: 1,
      last_completed_date: today,
    });
    return;
  }

  let newStreak = 1;
  if (existing.last_completed_date === yesterday) {
    newStreak = existing.current_streak + 1;
  } else if (existing.last_completed_date === today) {
    return;
  }

  await supabase
    .from("streaks")
    .update({
      current_streak: newStreak,
      longest_streak: Math.max(newStreak, existing.longest_streak),
      last_completed_date: today,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId);
}

export async function revertStreak(userId: string) {
  const today = format(new Date(), "yyyy-MM-dd");
  const yesterday = format(addDays(new Date(), -1), "yyyy-MM-dd");
  const todayStart = new Date();
  todayStart.setHours(0,0,0,0);

  const { data: todayTasks } = await supabase
    .from("tasks")
    .select("id")
    .eq("user_id", userId)
    .eq("completed", true)
    .gte("completed_at", todayStart.toISOString())
    .limit(1);

  // If there are still tasks completed today, we don't revert
  if (todayTasks && todayTasks.length > 0) return;

  const existing = await getStreak(userId);
  if (!existing || existing.last_completed_date !== today) return;

  // Revert streak
  const newStreak = Math.max(0, existing.current_streak - 1);
  await supabase
    .from("streaks")
    .update({
      current_streak: newStreak,
      last_completed_date: newStreak > 0 ? yesterday : null,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId);
}

export async function getCompletedTasks(userId: string) {
  const { data, error } = await supabase
    .from("tasks")
    .select("*, topic:topics(title, subject, difficulty)")
    .eq("user_id", userId)
    .eq("completed", true)
    .order("completed_at", { ascending: false });

  if (error) throw error;
  return (data || []) as unknown as TaskRow[];
}

export async function getAllTasks(userId: string) {
  const { data, error } = await supabase
    .from("tasks")
    .select("*, topic:topics(title, subject, difficulty)")
    .eq("user_id", userId)
    .order("due_date", { ascending: true });

  if (error) throw error;
  return (data || []) as unknown as TaskRow[];
}

export async function deleteTask(taskId: string) {
  const { error } = await supabase.from("tasks").delete().eq("id", taskId);
  if (error) throw error;
}

export async function getTasksBySubject(userId: string, subject: string) {
  const { data, error } = await supabase
    .from("tasks")
    .select("*, topic:topics(title, subject, difficulty)")
    .eq("user_id", userId)
    .order("due_date", { ascending: true });

  if (error) throw error;
  return ((data || []) as unknown as TaskRow[]).filter(
    (t) => t.topic?.subject === subject
  );
}

export async function getTasksForDate(userId: string, date: string) {
  const { data, error } = await supabase
    .from("tasks")
    .select("*, topic:topics(title, subject, difficulty)")
    .eq("user_id", userId)
    .eq("due_date", date)
    .order("created_at", { ascending: true });

  if (error) throw error;
  return (data || []) as unknown as TaskRow[];
}

export async function getCompletedDates(userId: string) {
  const { data, error } = await supabase
    .from("tasks")
    .select("due_date")
    .eq("user_id", userId)
    .eq("completed", true);

  if (error) throw error;
  const dates = new Set((data || []).map((t) => t.due_date));
  return Array.from(dates);
}

// Get all unique subjects for a user
export async function getUserSubjects(userId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from("topics")
    .select("subject")
    .eq("user_id", userId);

  if (error) throw error;
  const subjects = new Set((data || []).map((t) => t.subject));
  return Array.from(subjects);
}

// Delete all topics and tasks for a subject
export async function deleteSubject(userId: string, subject: string) {
  // Get all topic IDs for this subject
  const { data: topics, error: topicsError } = await supabase
    .from("topics")
    .select("id")
    .eq("user_id", userId)
    .eq("subject", subject);

  if (topicsError) throw topicsError;

  const topicIds = (topics || []).map((t) => t.id);

  if (topicIds.length > 0) {
    // Delete all tasks for these topics
    const { error: tasksError } = await supabase
      .from("tasks")
      .delete()
      .in("topic_id", topicIds);
    if (tasksError) throw tasksError;

    // Delete all topics
    const { error: deleteError } = await supabase
      .from("topics")
      .delete()
      .eq("user_id", userId)
      .eq("subject", subject);
    if (deleteError) throw deleteError;
  }
}

// Rename a subject
export async function renameSubject(userId: string, oldName: string, newName: string) {
  const { error } = await supabase
    .from("topics")
    .update({ subject: newName })
    .eq("user_id", userId)
    .eq("subject", oldName);

  if (error) throw error;
}

// Delete a topic and all its tasks
export async function deleteTopic(topicId: string) {
  const { error: tasksError } = await supabase
    .from("tasks")
    .delete()
    .eq("topic_id", topicId);
  if (tasksError) throw tasksError;

  const { error } = await supabase.from("topics").delete().eq("id", topicId);
  if (error) throw error;
}
