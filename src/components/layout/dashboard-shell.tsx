"use client";

import { Menu } from "lucide-react";
import { Sidebar } from "./sidebar";
import { useSidebar } from "./sidebar-context";
import { Button } from "@/components/ui/button";

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const { collapsed, toggleMobile } = useSidebar();

  return (
    <div className="min-h-screen">
      <Sidebar />
      {/* Mobile header with hamburger */}
      <div className="sticky top-0 z-30 flex h-14 items-center border-b border-border bg-background px-4 md:hidden">
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9"
          onClick={toggleMobile}
          aria-label="Toggle menu"
        >
          <Menu className="h-5 w-5" />
        </Button>
        <span className="ml-2 text-base font-semibold">Impact List</span>
      </div>
      <main
        className="min-h-screen p-3 transition-all duration-200 md:p-6 overflow-x-hidden"
        style={
          { "--sidebar-width": collapsed ? "3.5rem" : "11rem" } as React.CSSProperties
        }
      >
        <div className="min-w-0 md:ml-[var(--sidebar-width)] md:transition-[margin] md:duration-200">
          {children}
        </div>
      </main>
    </div>
  );
}
