import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, X } from "lucide-react";
import { addTopic, getUserSubjects } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import type { Database } from "@/integrations/supabase/types";

type DifficultyLevel = Database["public"]["Enums"]["difficulty_level"];

const DEFAULT_SUBJECTS = ["DSA", "DBMS", "NPTEL", "OS", "CN", "OOP"];

interface AddTopicFormProps {
  onAdded: () => void;
}

export default function AddTopicForm({ onAdded }: AddTopicFormProps) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState("DSA");
  const [difficulty, setDifficulty] = useState<DifficultyLevel>("medium");
  const [notes, setNotes] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [subjects, setSubjects] = useState<string[]>(DEFAULT_SUBJECTS);

  useEffect(() => {
    if (!user) return;
    getUserSubjects(user.id).then(dbSubjects => {
      const merged = Array.from(new Set([...DEFAULT_SUBJECTS, ...dbSubjects]));
      setSubjects(merged);
    }).catch(() => {});
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);
    try {
      await addTopic(user.id, title, subject, difficulty, notes || null, new Date(date));
      toast.success("Topic added with revision schedule!");
      setTitle("");
      setNotes("");
      setOpen(false);
      onAdded();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!open) {
    return (
      <Button onClick={() => setOpen(true)} className="gap-2">
        <Plus className="h-4 w-4" />
        Add Topic
      </Button>
    );
  }

  return (
    <div className="border border-border rounded-lg p-4 bg-card animate-fade-in">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-foreground">New Topic</h3>
        <Button variant="ghost" size="icon" onClick={() => setOpen(false)}>
          <X className="h-4 w-4" />
        </Button>
      </div>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <Label htmlFor="title" className="text-xs">Title</Label>
          <Input id="title" value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Binary Search Trees" required />
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <Label className="text-xs">Subject</Label>
            <Select value={subject} onValueChange={setSubject}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {subjects.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
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
          <div>
            <Label className="text-xs">Date</Label>
            <Input type="date" value={date} onChange={e => setDate(e.target.value)} />
          </div>
        </div>
        <div>
          <Label htmlFor="notes" className="text-xs">Notes (optional)</Label>
          <Textarea id="notes" value={notes} onChange={e => setNotes(e.target.value)} rows={2} placeholder="Key points to remember..." />
        </div>
        <Button type="submit" disabled={loading} className="w-full">
          {loading ? "Adding..." : "Add Topic & Create Revisions"}
        </Button>
      </form>
    </div>
  );
}
