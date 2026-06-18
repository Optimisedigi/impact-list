// Default fallback - dynamic categories from DB take precedence
export const DEFAULT_CATEGORIES: Record<string, { label: string; color: string }> = {
  client_delivery: { label: "Client Delivery", color: "oklch(0.55 0.15 90)" },
  systems_automation: { label: "Systems & Automation", color: "oklch(0.45 0.18 160)" },
  client_growth: { label: "Client Growth Work", color: "oklch(0.48 0.18 250)" },
  team_management: { label: "Team Management", color: "oklch(0.5 0.18 310)" },
  admin: { label: "Admin", color: "oklch(0.45 0.03 260)" },
};

// CategoryOption type used throughout the app
export interface CategoryOption {
  value: string;
  label: string;
  color: string;
}

// Build category lookup from DB rows or fallback
export function buildCategoryMap(dbCategories?: { key: string; label: string; color: string }[]): Record<string, { label: string; color: string }> {
  if (dbCategories && dbCategories.length > 0) {
    const map: Record<string, { label: string; color: string }> = {};
    for (const c of dbCategories) {
      map[c.key] = { label: c.label, color: c.color };
    }
    return map;
  }
  return DEFAULT_CATEGORIES;
}

export function buildCategoryOptions(dbCategories?: { key: string; label: string; color: string }[]): CategoryOption[] {
  if (dbCategories && dbCategories.length > 0) {
    return dbCategories.map((c) => ({ value: c.key, label: c.label, color: c.color }));
  }
  return Object.entries(DEFAULT_CATEGORIES).map(([value, { label, color }]) => ({ value, label, color }));
}

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

export type CategoryKey = string;
export type StatusKey = (typeof STATUS_OPTIONS)[number]["value"];

export const NAV_ITEMS = [
  { href: "/tasks", label: "Tasks", icon: "list-checks" },
  { href: "/focus", label: "Focus", icon: "target" },
  { href: "/matrix", label: "Matrix", icon: "scatter-chart" },
  { href: "/treemap", label: "Treemap", icon: "layout-grid" },
  { href: "/analytics", label: "Analytics", icon: "bar-chart-3" },
  { href: "/settings", label: "Settings", icon: "settings" },
] as const;
