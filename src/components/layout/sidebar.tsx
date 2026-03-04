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
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "./theme-toggle";
import { Button } from "@/components/ui/button";
import { useSidebar } from "./sidebar-context";

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
  const { collapsed, setCollapsed } = useSidebar();

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 z-40 flex h-screen flex-col border-r border-border bg-sidebar transition-all duration-200",
        collapsed ? "w-14 cursor-pointer hover:bg-sidebar-accent/50" : "w-44"
      )}
      onClick={collapsed ? () => setCollapsed(false) : undefined}
    >
      <div className={cn("flex h-14 items-center border-b border-border", collapsed ? "justify-center px-2" : "gap-2 px-3")}>
        <Zap className="h-5 w-5 shrink-0 text-sidebar-foreground" />
        {!collapsed && <span className="text-base font-semibold tracking-tight">Impact List</span>}
      </div>
      <nav className="flex-1 space-y-1 px-1.5 py-3">
        {NAV_ITEMS.map((item) => {
          const Icon = icons[item.icon];
          const isActive = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              title={collapsed ? item.label : undefined}
              className={cn(
                "flex items-center rounded-lg py-2 text-sm font-medium transition-colors",
                collapsed ? "justify-center px-2" : "gap-2.5 px-3",
                isActive
                  ? "bg-sidebar-accent text-sidebar-primary"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {!collapsed && item.label}
            </Link>
          );
        })}
      </nav>
      <div className={cn("border-t border-border py-2", collapsed ? "px-1.5" : "px-3")}>
        {!collapsed && <ThemeToggle />}
        <Button
          variant="ghost"
          size="icon"
          className={cn("h-8 w-8", collapsed ? "mx-auto flex" : "mt-1")}
          onClick={() => setCollapsed(!collapsed)}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
        </Button>
      </div>
    </aside>
  );
}
