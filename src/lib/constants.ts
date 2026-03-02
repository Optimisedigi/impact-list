export const CATEGORIES = {
  client_delivery: { label: "Client Delivery", color: "var(--cat-client-delivery)" },
  systems_automation: { label: "Systems & Automation", color: "var(--cat-systems-automation)" },
  client_growth: { label: "Client Growth Work", color: "var(--cat-client-growth)" },
  team_management: { label: "Team Management", color: "var(--cat-team-management)" },
  admin: { label: "Admin", color: "var(--cat-admin)" },
} as const;

export const CATEGORY_OPTIONS = Object.entries(CATEGORIES).map(([value, { label }]) => ({
  value,
  label,
}));

export const STATUS_OPTIONS = [
  { value: "not_started", label: "Not Started" },
  { value: "in_progress", label: "In Progress" },
  { value: "done", label: "Done" },
] as const;

export const STATUS_COLORS: Record<string, string> = {
  not_started: "bg-muted text-muted-foreground",
  in_progress: "bg-blue-500/20 text-blue-400",
  done: "bg-green-500/20 text-green-400",
};

export const TO_COMPLETE_OPTIONS = [
  { value: "today", label: "Today" },
  { value: "next_2_days", label: "Next 2 Days" },
  { value: "this_week", label: "This Week" },
] as const;

export type CategoryKey = keyof typeof CATEGORIES;
export type StatusKey = (typeof STATUS_OPTIONS)[number]["value"];

export const NAV_ITEMS = [
  { href: "/tasks", label: "Tasks", icon: "list-checks" },
  { href: "/focus", label: "Focus", icon: "target" },
  { href: "/matrix", label: "Matrix", icon: "scatter-chart" },
  { href: "/treemap", label: "Treemap", icon: "layout-grid" },
  { href: "/analytics", label: "Analytics", icon: "bar-chart-3" },
  { href: "/settings", label: "Settings", icon: "settings" },
] as const;
