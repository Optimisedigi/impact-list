"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { STATUS_OPTIONS } from "@/lib/constants";
import type { CategoryOption } from "@/lib/constants";
import { cn } from "@/lib/utils";

const DEFAULT_STATUSES = ["not_started", "in_progress"];

export function TaskFilters({
  clients,
  categoryOptions,
  initialFilters,
}: {
  clients: string[];
  categoryOptions: CategoryOption[];
  initialFilters: { status?: string; category?: string; client?: string; search?: string };
}) {
  const router = useRouter();
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null);

  // Parse status from comma-separated URL param, default to not_started + in_progress
  const initialStatuses = initialFilters.status
    ? initialFilters.status.split(",")
    : DEFAULT_STATUSES;

  const [selectedStatuses, setSelectedStatuses] = useState<string[]>(initialStatuses);
  const [category, setCategory] = useState(initialFilters.category);
  const [client, setClient] = useState(initialFilters.client);
  const [search, setSearch] = useState(initialFilters.search);

  function pushFilters(statuses: string[], cat?: string, cl?: string, s?: string) {
    const params = new URLSearchParams();
    // Only set status param if not the default selection
    const isDefault =
      statuses.length === DEFAULT_STATUSES.length &&
      DEFAULT_STATUSES.every((d) => statuses.includes(d));
    if (statuses.length > 0 && !isDefault) {
      params.set("status", statuses.join(","));
    }
    if (cat) params.set("category", cat);
    if (cl) params.set("client", cl);
    if (s) params.set("search", s);
    router.replace(`/tasks?${params.toString()}`);
  }

  function toggleStatus(value: string) {
    const next = selectedStatuses.includes(value)
      ? selectedStatuses.filter((s) => s !== value)
      : [...selectedStatuses, value];
    // Don't allow empty selection
    if (next.length === 0) return;
    setSelectedStatuses(next);
    pushFilters(next, category, client, search);
  }

  function selectAllStatuses() {
    const all = STATUS_OPTIONS.map((s) => s.value);
    setSelectedStatuses(all);
    pushFilters(all, category, client, search);
  }

  function updateCategory(value: string) {
    const v = value === "all" ? undefined : value;
    setCategory(v);
    pushFilters(selectedStatuses, v, client, search);
  }

  function updateClient(value: string) {
    const v = value === "all" ? undefined : value;
    setClient(v);
    pushFilters(selectedStatuses, category, v, search);
  }

  function debouncedSearch(value: string) {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      const v = value || undefined;
      setSearch(v);
      pushFilters(selectedStatuses, category, client, v);
    }, 300);
  }

  return (
    <div className="flex flex-wrap items-center gap-2 sm:gap-3">
      <Input
        placeholder="Search tasks..."
        className="w-full sm:w-56"
        defaultValue={initialFilters.search ?? ""}
        onChange={(e) => debouncedSearch(e.target.value)}
      />
      <div className="flex items-center gap-1 overflow-x-auto">
        {STATUS_OPTIONS.map((s) => (
          <Button
            key={s.value}
            variant={selectedStatuses.includes(s.value) ? "default" : "outline"}
            size="sm"
            className={cn(
              "h-6 sm:h-7 text-[10px] sm:text-xs px-1.5 sm:px-2 shrink-0",
              selectedStatuses.includes(s.value) ? "" : "opacity-50"
            )}
            onClick={() => toggleStatus(s.value)}
          >
            {s.label}
          </Button>
        ))}
        <Button
          variant="ghost"
          size="sm"
          className="h-6 sm:h-7 text-[10px] sm:text-xs shrink-0"
          onClick={selectAllStatuses}
        >
          All
        </Button>
      </div>
      <Select
        value={category ?? "all"}
        onValueChange={updateCategory}
      >
        <SelectTrigger className="w-full sm:w-52">
          <SelectValue placeholder="Category" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Categories</SelectItem>
          {categoryOptions.map((c) => (
            <SelectItem key={c.value} value={c.value}>
              {c.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {clients.length > 0 && (
        <Select
          value={client ?? "all"}
          onValueChange={updateClient}
        >
          <SelectTrigger className="w-full sm:w-36">
            <SelectValue placeholder="Client" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Clients</SelectItem>
            {clients.map((c) => (
              <SelectItem key={c} value={c}>
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </div>
  );
}
