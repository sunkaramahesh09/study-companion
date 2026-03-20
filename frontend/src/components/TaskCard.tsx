import { TaskRow } from "@/lib/api";
import { Checkbox } from "@/components/ui/checkbox";
import confetti from "canvas-confetti";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { Trash2 } from "lucide-react";

interface TaskCardProps {
  task: TaskRow;
  onToggle: (taskId: string, completed: boolean) => void;
  onDelete?: (taskId: string) => void;
  showDate?: boolean;
  disableStrikeThrough?: boolean;
}

const TYPE_LABELS: Record<string, string> = {
  learning: "Learn",
  revision_1: "Rev 1",
  revision_2: "Rev 2",
};

const DIFFICULTY_COLORS: Record<string, string> = {
  easy: "text-success",
  medium: "text-primary",
  hard: "text-destructive",
};

export default function TaskCard({ task, onToggle, onDelete, showDate, disableStrikeThrough }: TaskCardProps) {
  const topic = task.topic;

  return (
    <div
      className={cn(
        "flex items-center gap-3 p-3 rounded-md border border-border bg-card transition-all hover:bg-accent/50",
        task.completed && !disableStrikeThrough && "opacity-60"
      )}
    >
      <Checkbox
        checked={task.completed}
        onCheckedChange={(checked) => {
          onToggle(task.id, !!checked);
          if (checked) {
            confetti({
              particleCount: 150,
              spread: 70,
              origin: { y: 0.6 }
            });
          }
        }}
        className="data-[state=checked]:bg-success data-[state=checked]:border-success"
      />

      <div className="flex-1 min-w-0">
        <p className={cn("text-sm font-medium text-foreground", task.completed && !disableStrikeThrough && "line-through")}>
          {topic?.title || "Unknown Topic"}
        </p>
        {showDate && (
          <p className="text-xs text-muted-foreground">{format(new Date(task.due_date), "MMM d, yyyy")}</p>
        )}
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <span className="font-mono text-xs px-1.5 py-0.5 rounded bg-secondary text-secondary-foreground">
          {topic?.subject || "—"}
        </span>
        <span className={cn("font-mono text-xs", DIFFICULTY_COLORS[topic?.difficulty || "medium"])}>
          {topic?.difficulty}
        </span>
        <span className="font-mono text-xs px-1.5 py-0.5 rounded bg-primary/10 text-primary">
          {TYPE_LABELS[task.task_type]}
        </span>
        {onDelete && (
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-destructive"
            onClick={(e) => { e.stopPropagation(); onDelete(task.topic_id); }}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>
    </div>
  );
}
