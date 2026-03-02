"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ListChecks,
  Target,
  ScatterChart,
  LayoutGrid,
  BarChart3,
  Settings,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "./theme-toggle";

const icons = {
  "list-checks": ListChecks,
  target: Target,
  "scatter-chart": ScatterChart,
  "layout-grid": LayoutGrid,
  "bar-chart-3": BarChart3,
  settings: Settings,
} as const;

const NAV_ITEMS = [
  { href: "/tasks", label: "Tasks", icon: "list-checks" as const },
  { href: "/focus", label: "Focus", icon: "target" as const },
  { href: "/matrix", label: "Matrix", icon: "scatter-chart" as const },
  { href: "/treemap", label: "Treemap", icon: "layout-grid" as const },
  { href: "/analytics", label: "Analytics", icon: "bar-chart-3" as const },
  { href: "/settings", label: "Settings", icon: "settings" as const },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-0 z-40 flex h-screen w-56 flex-col border-r border-border bg-sidebar">
      <div className="flex h-14 items-center gap-2 border-b border-border px-4">
        <Zap className="h-5 w-5 text-sidebar-foreground" />
        <span className="text-lg font-semibold tracking-tight">Impact List</span>
      </div>
      <nav className="flex-1 space-y-1 px-2 py-4">
        {NAV_ITEMS.map((item) => {
          const Icon = icons[item.icon];
          const isActive = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-sidebar-accent text-sidebar-primary"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
              )}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-border px-4 py-3">
        <ThemeToggle />
      </div>
    </aside>
  );
}
