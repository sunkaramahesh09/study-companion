import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import {
  getTasksBySubject, toggleTaskComplete, updateStreak, revertStreak, deleteTopic,
  addTopic, addPastEntry, getUserSubjects, deleteSubject, renameSubject, TaskRow
} from "@/lib/api";
import TaskCard from "@/components/TaskCard";
import LoadingSpinner from "@/components/LoadingSpinner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle
} from "@/components/ui/alert-dialog";
import { BookOpen, Clock, Plus, X, Trash2, Pencil, CalendarPlus } from "lucide-react";
import { toast } from "sonner";
import { format, addDays } from "date-fns";
import type { Database } from "@/integrations/supabase/types";

type DifficultyLevel = Database["public"]["Enums"]["difficulty_level"];

const DEFAULT_SUBJECTS = ["DSA", "DBMS", "NPTEL", "OS", "CN", "OOP"];
const LOCAL_STORAGE_DELETED_SUBJECTS_KEY = "deletedSubjects";

export default function SubjectsPage() {
  const { user } = useAuth();
  const [deletedSubjects, setDeletedSubjects] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem(LOCAL_STORAGE_DELETED_SUBJECTS_KEY) || "[]");
    } catch {
      return [];
    }
  });

  const [subjects, setSubjects] = useState<string[]>(() => {
    try {
      const storedDeleted = JSON.parse(localStorage.getItem(LOCAL_STORAGE_DELETED_SUBJECTS_KEY) || "[]");
      return DEFAULT_SUBJECTS.filter(s => !storedDeleted.includes(s));
    } catch {
      return DEFAULT_SUBJECTS;
    }
  });
  
  const [selectedSubject, setSelectedSubject] = useState("DSA");
  const [tasks, setTasks] = useState<TaskRow[]>([]);
  const [loading, setLoading] = useState(true);

  // Add entry form
  const [showAddForm, setShowAddForm] = useState(false);
  const [title, setTitle] = useState("");
  const [difficulty, setDifficulty] = useState<DifficultyLevel>("medium");

  // Past entry form
  const [showPastForm, setShowPastForm] = useState(false);
  const [pastTitle, setPastTitle] = useState("");
  const [pastDate, setPastDate] = useState("");
  const [pastDifficulty, setPastDifficulty] = useState<DifficultyLevel>("medium");
  const [pastRev1Done, setPastRev1Done] = useState(false);
  const [pastRev1Date, setPastRev1Date] = useState("");
  const [pastRev2Done, setPastRev2Done] = useState(false);
  const [pastRev2Date, setPastRev2Date] = useState("");
  const [pastRev3Done, setPastRev3Done] = useState(false);
  const [pastRev3Date, setPastRev3Date] = useState("");

  // Subject management
  const [showAddSubject, setShowAddSubject] = useState(false);
  const [newSubjectName, setNewSubjectName] = useState("");
  const [renamingSubject, setRenamingSubject] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [deleteConfirmSubject, setDeleteConfirmSubject] = useState<string | null>(null);

  const fetchSubjects = useCallback(async () => {
    if (!user) return;
    try {
      const dbSubjects = await getUserSubjects(user.id);
      const merged = Array.from(new Set([...DEFAULT_SUBJECTS, ...dbSubjects]))
        .filter(s => !deletedSubjects.includes(s));
      setSubjects(merged);
    } catch {
      // silent
    }
  }, [user, deletedSubjects]);

  const fetchData = useCallback(async (showLoader = false) => {
    if (!user) return;
    try {
      if (showLoader) setLoading(true);
      const data = await getTasksBySubject(user.id, selectedSubject);
      setTasks(data);
    } catch {
      toast.error("Failed to load subject data");
    } finally {
      if (showLoader) setLoading(false);
    }
  }, [user, selectedSubject]);

  useEffect(() => { fetchSubjects(); }, [fetchSubjects]);
  useEffect(() => { fetchData(true); }, [fetchData]);

  const handleToggle = async (taskId: string, completed: boolean) => {
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, completed } as TaskRow : t));
    
    try {
      await toggleTaskComplete(taskId, completed);
      if (user) {
        if (completed) await updateStreak(user.id);
        else await revertStreak(user.id);
      }
      fetchData(false);
    } catch {
      toast.error("Failed to update task");
      fetchData(false);
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

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !title.trim()) return;
    try {
      await addTopic(user.id, title, selectedSubject, difficulty, null, new Date());
      toast.success("Entry added with revision schedule!");
      setTitle("");
      setShowAddForm(false);
      fetchData();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleAddPast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !pastTitle.trim() || !pastDate) return;
    try {
      const date = new Date(pastDate + "T00:00:00");
      await addPastEntry(
        user.id, pastTitle, selectedSubject, pastDifficulty, null, date,
        pastRev1Done, pastRev1Date || null,
        pastRev2Done, pastRev2Date || null,
        pastRev3Done, pastRev3Date || null
      );
      toast.success("Past entry added with revision schedule!");
      setPastTitle("");
      setPastDate("");
      setPastRev1Done(false);
      setPastRev1Date("");
      setPastRev2Done(false);
      setPastRev2Date("");
      setPastRev3Done(false);
      setPastRev3Date("");
      setShowPastForm(false);
      fetchData();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleAddSubject = () => {
    const name = newSubjectName.trim();
    if (!name) return;
    if (subjects.includes(name)) {
      toast.error("Subject already exists");
      return;
    }
    setSubjects(prev => [...prev, name]);
    setSelectedSubject(name);
    setNewSubjectName("");
    setShowAddSubject(false);
    toast.success(`Subject "${name}" added`);
  };

  const handleRenameSubject = async () => {
    if (!user || !renamingSubject || !renameValue.trim()) return;
    if (subjects.includes(renameValue.trim()) && renameValue.trim() !== renamingSubject) {
      toast.error("Subject name already exists");
      return;
    }
    try {
      await renameSubject(user.id, renamingSubject, renameValue.trim());
      const newName = renameValue.trim();
      setSubjects(prev => prev.map(s => s === renamingSubject ? newName : s));
      if (selectedSubject === renamingSubject) setSelectedSubject(newName);
      setRenamingSubject(null);
      setRenameValue("");
      toast.success("Subject renamed");
      fetchData();
    } catch {
      toast.error("Failed to rename subject");
    }
  };

  const handleDeleteSubject = async () => {
    if (!user || !deleteConfirmSubject) return;
    try {
      await deleteSubject(user.id, deleteConfirmSubject);
      
      if (DEFAULT_SUBJECTS.includes(deleteConfirmSubject)) {
        const newDeleted = [...deletedSubjects, deleteConfirmSubject];
        setDeletedSubjects(newDeleted);
        localStorage.setItem(LOCAL_STORAGE_DELETED_SUBJECTS_KEY, JSON.stringify(newDeleted));
      }

      setSubjects(prev => prev.filter(s => s !== deleteConfirmSubject));
      if (selectedSubject === deleteConfirmSubject) {
        const nextSubject = subjects.find(s => s !== deleteConfirmSubject);
        if (nextSubject) {
          setSelectedSubject(nextSubject);
        } else {
          const fallback = DEFAULT_SUBJECTS.find(s => !deletedSubjects.includes(s) && s !== deleteConfirmSubject);
          if (fallback) setSelectedSubject(fallback);
        }
      }
      setDeleteConfirmSubject(null);
      toast.success("Subject and all related data deleted");
      fetchData();
    } catch {
      toast.error("Failed to delete subject");
    }
  };

  const learned = tasks.filter(t => t.task_type === "learning" && t.completed);
  const completedRev1 = tasks.filter(t => t.task_type === "revision_1" && t.completed);
  const completedRev2 = tasks.filter(t => t.task_type === "revision_2" && t.completed);
  const completedRev3 = tasks.filter(t => t.task_type === "revision_3" && t.completed);
  
  const pendingRev1 = tasks.filter(t => t.task_type === "revision_1" && !t.completed);
  const pendingRev2 = tasks.filter(t => t.task_type === "revision_2" && !t.completed);
  const pendingRev3 = tasks.filter(t => t.task_type === "revision_3" && !t.completed);

  const today = format(new Date(), "yyyy-MM-dd");

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-20 md:pb-0">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-xl font-bold text-foreground">Subjects</h1>
        <div className="flex gap-2">
          <Button onClick={() => { setShowPastForm(!showPastForm); setShowAddForm(false); }} variant="outline" size="sm" className="gap-2">
            {showPastForm ? <X className="h-4 w-4" /> : <CalendarPlus className="h-4 w-4" />}
            {showPastForm ? "Cancel" : "Add Past Entry"}
          </Button>
          <Button onClick={() => { setShowAddForm(!showAddForm); setShowPastForm(false); }} size="sm" className="gap-2">
            {showAddForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
            {showAddForm ? "Cancel" : "Add Entry"}
          </Button>
        </div>
      </div>

      {/* Subject Tabs */}
      <div className="flex flex-wrap items-center gap-1.5">
        {subjects.map(s => (
          <div key={s} className="group relative">
            <button
              onClick={() => setSelectedSubject(s)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                selectedSubject === s
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-secondary-foreground hover:bg-accent"
              }`}
            >
              {s}
            </button>
            {selectedSubject === s && (
              <div className="absolute -top-1 -right-1 flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => { setRenamingSubject(s); setRenameValue(s); }}
                  className="h-4 w-4 rounded-full bg-card border border-border flex items-center justify-center hover:bg-accent"
                >
                  <Pencil className="h-2.5 w-2.5 text-muted-foreground" />
                </button>
                <button
                  onClick={() => setDeleteConfirmSubject(s)}
                  className="h-4 w-4 rounded-full bg-card border border-border flex items-center justify-center hover:bg-destructive/10"
                >
                  <Trash2 className="h-2.5 w-2.5 text-destructive" />
                </button>
              </div>
            )}
          </div>
        ))}
        {showAddSubject ? (
          <div className="flex items-center gap-1">
            <Input
              value={newSubjectName}
              onChange={e => setNewSubjectName(e.target.value)}
              placeholder="Subject name"
              className="h-8 w-32 text-xs"
              onKeyDown={e => e.key === "Enter" && handleAddSubject()}
              autoFocus
            />
            <Button size="sm" variant="ghost" className="h-8 px-2" onClick={handleAddSubject}>
              <Plus className="h-3.5 w-3.5" />
            </Button>
            <Button size="sm" variant="ghost" className="h-8 px-2" onClick={() => { setShowAddSubject(false); setNewSubjectName(""); }}>
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        ) : (
          <button
            onClick={() => setShowAddSubject(true)}
            className="px-3 py-1.5 rounded-md text-xs font-medium border border-dashed border-border text-muted-foreground hover:bg-accent transition-colors"
          >
            + Add Subject
          </button>
        )}
      </div>

      {/* Rename Dialog */}
      {renamingSubject && (
        <Card className="animate-fade-in">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Input
                value={renameValue}
                onChange={e => setRenameValue(e.target.value)}
                placeholder="New name"
                className="flex-1"
                onKeyDown={e => e.key === "Enter" && handleRenameSubject()}
                autoFocus
              />
              <Button size="sm" onClick={handleRenameSubject}>Rename</Button>
              <Button size="sm" variant="ghost" onClick={() => setRenamingSubject(null)}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Add Entry Form */}
      {showAddForm && (
        <Card className="animate-fade-in">
          <CardContent className="pt-4">
            <form onSubmit={handleAdd} className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Concept Title</Label>
                  <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Binary Search" required />
                </div>
                <div>
                  <Label className="text-xs">Difficulty</Label>
                  <Select value={difficulty} onValueChange={v => setDifficulty(v as DifficultyLevel)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="easy">Easy</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="hard">Hard</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button type="submit" className="w-full">Add to {selectedSubject}</Button>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Past Entry Form */}
      {showPastForm && (
        <Card className="animate-fade-in border-primary/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <CalendarPlus className="h-4 w-4 text-primary" />
              Add Past Entry to {selectedSubject}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAddPast} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <Label className="text-xs">Concept Title</Label>
                  <Input value={pastTitle} onChange={e => setPastTitle(e.target.value)} placeholder="e.g. Dijkstra's Algorithm" required />
                </div>
                <div>
                  <Label className="text-xs">Learning Date</Label>
                  <Input type="date" value={pastDate} onChange={e => setPastDate(e.target.value)} max={today} required />
                </div>
                <div>
                  <Label className="text-xs">Difficulty</Label>
                  <Select value={pastDifficulty} onValueChange={v => setPastDifficulty(v as DifficultyLevel)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="easy">Easy</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="hard">Hard</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {pastDate && (
                <div className="space-y-3 border-t border-border pt-3">
                  <p className="text-xs text-muted-foreground">Revision Status (based on {pastDate})</p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Checkbox
                          checked={pastRev1Done}
                          onCheckedChange={v => setPastRev1Done(!!v)}
                        />
                        <Label className="text-xs">
                          Rev 1 done (due {format(addDays(new Date(pastDate + "T00:00:00"), 7), "MMM d")})
                        </Label>
                      </div>
                      {pastRev1Done && (
                        <Input
                          type="date"
                          value={pastRev1Date}
                          onChange={e => setPastRev1Date(e.target.value)}
                          max={today}
                          className="ml-6"
                          placeholder="Completion date"
                        />
                      )}
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Checkbox
                          checked={pastRev2Done}
                          onCheckedChange={v => setPastRev2Done(!!v)}
                        />
                        <Label className="text-xs">
                          Rev 2 done (due {format(addDays(new Date(pastDate + "T00:00:00"), 10), "MMM d")})
                        </Label>
                      </div>
                      {pastRev2Done && (
                        <Input
                          type="date"
                          value={pastRev2Date}
                          onChange={e => setPastRev2Date(e.target.value)}
                          max={today}
                          className="ml-6"
                          placeholder="Completion date"
                        />
                      )}
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Checkbox
                          checked={pastRev3Done}
                          onCheckedChange={v => setPastRev3Done(!!v)}
                        />
                        <Label className="text-xs">
                          Rev 3 done (due {format(addDays(new Date(pastDate + "T00:00:00"), 30), "MMM d")})
                        </Label>
                      </div>
                      {pastRev3Done && (
                        <Input
                          type="date"
                          value={pastRev3Date}
                          onChange={e => setPastRev3Date(e.target.value)}
                          max={today}
                          className="ml-6"
                          placeholder="Completion date"
                        />
                      )}
                    </div>
                  </div>
                </div>
              )}

              <Button type="submit" className="w-full">Add Past Entry</Button>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteConfirmSubject} onOpenChange={() => setDeleteConfirmSubject(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete "{deleteConfirmSubject}"?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete all concepts, tasks, and revision data for this subject. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteSubject} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete Subject
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Content */}
      {loading ? (
        <LoadingSpinner />
      ) : (
        <div className="grid grid-cols-1 gap-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-primary" />
                Concepts Learned
                <span className="text-xs font-mono text-muted-foreground ml-auto">({learned.length})</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {learned.length === 0 ? (
                <p className="text-xs text-muted-foreground py-2">No concepts learned yet.</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {learned.map(t => <TaskCard key={t.id} task={t} onToggle={handleToggle} onDelete={handleDelete} showDate disableStrikeThrough />)}
                </div>
              )}
            </CardContent>
          </Card>

          {(completedRev1.length > 0 || completedRev2.length > 0 || completedRev3.length > 0) && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <BookOpen className="h-4 w-4 text-green-600" />
                  Completed Revisions
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <h3 className="text-xs font-semibold text-muted-foreground border-b border-border pb-1 mb-3">Revision 1 ({completedRev1.length})</h3>
                  {completedRev1.length === 0 ? (
                    <p className="text-xs text-muted-foreground py-2">No completed Rev 1 yet.</p>
                  ) : completedRev1.map(t => <TaskCard key={t.id} task={t} onToggle={handleToggle} onDelete={handleDelete} showDate />)}
                </div>
                <div className="space-y-2">
                  <h3 className="text-xs font-semibold text-muted-foreground border-b border-border pb-1 mb-3">Revision 2 ({completedRev2.length})</h3>
                  {completedRev2.length === 0 ? (
                    <p className="text-xs text-muted-foreground py-2">No completed Rev 2 yet.</p>
                  ) : completedRev2.map(t => <TaskCard key={t.id} task={t} onToggle={handleToggle} onDelete={handleDelete} showDate />)}
                </div>
                <div className="space-y-2">
                  <h3 className="text-xs font-semibold text-muted-foreground border-b border-border pb-1 mb-3">Revision 3 ({completedRev3.length})</h3>
                  {completedRev3.length === 0 ? (
                    <p className="text-xs text-muted-foreground py-2">No completed Rev 3 yet.</p>
                  ) : completedRev3.map(t => <TaskCard key={t.id} task={t} onToggle={handleToggle} onDelete={handleDelete} showDate />)}
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Clock className="h-4 w-4 text-destructive" />
                Pending Revisions
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <h3 className="text-xs font-semibold text-muted-foreground border-b border-border pb-1 mb-3">Revision 1 ({pendingRev1.length})</h3>
                {pendingRev1.length === 0 ? (
                  <p className="text-xs text-muted-foreground py-2">All caught up! 🎉</p>
                ) : pendingRev1.map(t => <TaskCard key={t.id} task={t} onToggle={handleToggle} onDelete={handleDelete} showDate />)}
              </div>
              <div className="space-y-2">
                <h3 className="text-xs font-semibold text-muted-foreground border-b border-border pb-1 mb-3">Revision 2 ({pendingRev2.length})</h3>
                {pendingRev2.length === 0 ? (
                  <p className="text-xs text-muted-foreground py-2">All caught up! 🎉</p>
                ) : pendingRev2.map(t => <TaskCard key={t.id} task={t} onToggle={handleToggle} onDelete={handleDelete} showDate />)}
              </div>
              <div className="space-y-2">
                <h3 className="text-xs font-semibold text-muted-foreground border-b border-border pb-1 mb-3">Revision 3 ({pendingRev3.length})</h3>
                {pendingRev3.length === 0 ? (
                  <p className="text-xs text-muted-foreground py-2">All caught up! 🎉</p>
                ) : pendingRev3.map(t => <TaskCard key={t.id} task={t} onToggle={handleToggle} onDelete={handleDelete} showDate />)}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
