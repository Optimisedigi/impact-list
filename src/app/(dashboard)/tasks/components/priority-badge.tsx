"use client";

import { Badge } from "@/components/ui/badge";
import { DEFAULT_CATEGORIES, STATUS_COLORS } from "@/lib/constants";

export function CategoryBadge({ category, categoryMap }: { category: string; categoryMap?: Record<string, { label: string; color: string }> }) {
  const map = categoryMap ?? DEFAULT_CATEGORIES;
  const cat = map[category] ?? { label: category, color: "oklch(0.5 0.03 260)" };
  return (
    <Badge
      variant="outline"
      className="border-0 text-xs font-medium pointer-events-none"
      style={{ backgroundColor: `color-mix(in oklch, ${cat.color} 20%, transparent)`, color: cat.color }}
    >
      {cat.label}
    </Badge>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const labels: Record<string, string> = {
    not_started: "Not Started",
    in_progress: "In Progress",
    done: "Done",
  };
  return (
    <Badge variant="outline" className={`border-0 text-xs pointer-events-none ${STATUS_COLORS[status] ?? ""}`}>
      {labels[status] ?? status}
    </Badge>
  );
}

export function LeverageBadge({ score }: { score: number | null }) {
  if (score === null || score === undefined) return <span className="text-muted-foreground">--</span>;
  const color =
    score >= 8
      ? "bg-green-500/20 text-green-400"
      : score >= 5
        ? "bg-yellow-500/20 text-yellow-400"
        : "bg-muted text-muted-foreground";
  return (
    <Badge variant="outline" className={`border-0 text-xs font-bold ${color}`}>
      {score}
    </Badge>
  );
}
