import { FloatingAddTask } from "@/components/layout/floating-add-task";
import { TaskTimerProvider } from "@/components/timer/task-timer-context";
import { FloatingTimerWidget } from "@/components/timer/floating-timer-widget";
import { SidebarProvider } from "@/components/layout/sidebar-context";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { WeekBanner } from "@/components/layout/week-banner";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <TaskTimerProvider>
      <SidebarProvider>
        <DashboardShell>
          <WeekBanner />
          {children}
        </DashboardShell>
        <FloatingTimerWidget />
        <FloatingAddTask />
      </SidebarProvider>
    </TaskTimerProvider>
  );
}
