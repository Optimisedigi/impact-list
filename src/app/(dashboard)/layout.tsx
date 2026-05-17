export const dynamic = "force-dynamic";

import { FloatingAddTask } from "@/components/layout/floating-add-task";
import { TaskTimerProvider } from "@/components/timer/task-timer-context";
import { FloatingTimerWidget } from "@/components/timer/floating-timer-widget";
import { SidebarProvider } from "@/components/layout/sidebar-context";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { WeekBanner } from "@/components/layout/week-banner";
import { HideOnRoutes } from "@/components/layout/route-conditional";

const CALENDAR_ROUTES = ["/calendar"];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <TaskTimerProvider>
      <SidebarProvider>
        <DashboardShell
          mobileBanner={
            <HideOnRoutes hideOn={CALENDAR_ROUTES}>
              <WeekBanner />
            </HideOnRoutes>
          }
          desktopBanner={
            <HideOnRoutes hideOn={CALENDAR_ROUTES}>
              <WeekBanner />
            </HideOnRoutes>
          }
        >
          {children}
        </DashboardShell>
        <FloatingTimerWidget />
        <HideOnRoutes hideOn={CALENDAR_ROUTES}>
          <FloatingAddTask />
        </HideOnRoutes>
      </SidebarProvider>
    </TaskTimerProvider>
  );
}
