import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface LoadingSpinnerProps {
  className?: string;
  text?: string;
}

export default function LoadingSpinner({ className, text = "Loading..." }: LoadingSpinnerProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center min-h-[50vh] gap-4 w-full", className)}>
      <div className="relative">
        <div className="absolute inset-0 rounded-full blur-xl bg-primary/20 animate-pulse"></div>
        <Loader2 className="h-10 w-10 animate-spin text-primary relative z-10" />
      </div>
      <p className="text-sm font-medium text-muted-foreground animate-pulse">
        {text}
      </p>
    </div>
  );
}
