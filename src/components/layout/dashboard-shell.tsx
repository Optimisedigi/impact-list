"use client";

import { Sidebar } from "./sidebar";
import { useSidebar } from "./sidebar-context";

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const { collapsed } = useSidebar();

  return (
    <div className="min-h-screen">
      <Sidebar />
      <main
        className="min-h-screen p-6 transition-all duration-200"
        style={{ marginLeft: collapsed ? "3.5rem" : "11rem" }}
      >
        {children}
      </main>
    </div>
  );
}
