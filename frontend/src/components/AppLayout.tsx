import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/hooks/useTheme";
import { LayoutDashboard, BarChart3, History, LogOut, BookOpen, Flame, Moon, Sun, Menu, X, GraduationCap, CalendarDays } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Page = "dashboard" | "analytics" | "history" | "subjects" | "calendar";

interface AppLayoutProps {
  currentPage: Page;
  onPageChange: (page: Page) => void;
  children: React.ReactNode;
}

const NAV_ITEMS: { id: Page; label: string; icon: React.ReactNode }[] = [
  { id: "dashboard", label: "Dashboard", icon: <LayoutDashboard className="h-4 w-4" /> },
  { id: "subjects", label: "Subjects", icon: <GraduationCap className="h-4 w-4" /> },
  { id: "calendar", label: "Calendar", icon: <CalendarDays className="h-4 w-4" /> },
  { id: "analytics", label: "Analytics", icon: <BarChart3 className="h-4 w-4" /> },
  { id: "history", label: "History", icon: <History className="h-4 w-4" /> },
];

export default function AppLayout({ currentPage, onPageChange, children }: AppLayoutProps) {
  const { signOut } = useAuth();
  const { isDark, toggle } = useTheme();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-background">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-56 border-r border-border bg-card p-4 gap-1">
        <div className="flex items-center gap-2 px-2 py-3 mb-4">
          <BookOpen className="h-5 w-5 text-primary" />
          <span className="font-semibold text-foreground text-sm">Lumina Study</span>
          <Flame className="h-4 w-4 text-destructive" />
        </div>

        <nav className="flex-1 space-y-1">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.id}
              onClick={() => onPageChange(item.id)}
              className={cn(
                "flex items-center gap-3 w-full px-3 py-2 rounded-md text-sm transition-colors",
                currentPage === item.id
                  ? "bg-primary/10 text-primary font-medium"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground"
              )}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </nav>

        <div className="space-y-2 pt-4 border-t border-border">
          <button
            onClick={toggle}
            className="flex items-center gap-3 w-full px-3 py-2 rounded-md text-sm text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
          >
            {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            {isDark ? "Light Mode" : "Dark Mode"}
          </button>
          <button
            onClick={signOut}
            className="flex items-center gap-3 w-full px-3 py-2 rounded-md text-sm text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
          >
            <LogOut className="h-4 w-4" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Mobile Header */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-50 bg-card border-b border-border px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BookOpen className="h-5 w-5 text-primary" />
          <span className="font-semibold text-foreground text-sm">Lumina Study</span>
        </div>
        <Button variant="ghost" size="icon" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
          {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>
      </div>

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-40 bg-background/80 backdrop-blur-sm" onClick={() => setMobileMenuOpen(false)}>
          <div className="absolute top-14 right-4 bg-card border border-border rounded-lg shadow-lg p-2 min-w-[180px]" onClick={e => e.stopPropagation()}>
            {NAV_ITEMS.map((item) => (
              <button
                key={item.id}
                onClick={() => { onPageChange(item.id); setMobileMenuOpen(false); }}
                className={cn(
                  "flex items-center gap-3 w-full px-3 py-2 rounded-md text-sm transition-colors",
                  currentPage === item.id
                    ? "bg-primary/10 text-primary font-medium"
                    : "text-muted-foreground hover:bg-accent"
                )}
              >
                {item.icon}
                {item.label}
              </button>
            ))}
            <div className="border-t border-border my-1" />
            <button onClick={toggle} className="flex items-center gap-3 w-full px-3 py-2 rounded-md text-sm text-muted-foreground hover:bg-accent">
              {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              {isDark ? "Light" : "Dark"}
            </button>
            <button onClick={signOut} className="flex items-center gap-3 w-full px-3 py-2 rounded-md text-sm text-muted-foreground hover:bg-accent">
              <LogOut className="h-4 w-4" />
              Sign Out
            </button>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 overflow-auto md:p-6 p-4 pt-16 md:pt-6">
        {children}
      </main>

      {/* Mobile Bottom Nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-card border-t border-border flex justify-around py-2 z-50">
        {NAV_ITEMS.map((item) => (
          <button
            key={item.id}
            onClick={() => onPageChange(item.id)}
            className={cn(
              "flex flex-col items-center gap-1 px-2 py-1 text-[10px] transition-colors",
              currentPage === item.id ? "text-primary" : "text-muted-foreground"
            )}
          >
            {item.icon}
            {item.label}
          </button>
        ))}
      </nav>
    </div>
  );
}