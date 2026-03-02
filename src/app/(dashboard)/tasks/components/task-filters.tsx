"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CATEGORY_OPTIONS, STATUS_OPTIONS } from "@/lib/constants";

export function TaskFilters({
  clients,
  initialFilters,
}: {
  clients: string[];
  initialFilters: { status?: string; category?: string; client?: string; search?: string };
}) {
  const router = useRouter();
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null);
  const [filters, setFilters] = useState(initialFilters);

  function updateFilter(key: string, value: string) {
    const next = { ...filters, [key]: value === "all" ? undefined : value || undefined };
    setFilters(next);

    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(next)) {
      if (v) params.set(k, v);
    }
    router.replace(`/tasks?${params.toString()}`);
  }

  function debouncedSearch(value: string) {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => updateFilter("search", value), 300);
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <Input
        placeholder="Search tasks..."
        className="w-56"
        defaultValue={initialFilters.search ?? ""}
        onChange={(e) => debouncedSearch(e.target.value)}
      />
      <Select
        value={filters.status ?? "all"}
        onValueChange={(v) => updateFilter("status", v)}
      >
        <SelectTrigger className="w-36">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Status</SelectItem>
          {STATUS_OPTIONS.map((s) => (
            <SelectItem key={s.value} value={s.value}>
              {s.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select
        value={filters.category ?? "all"}
        onValueChange={(v) => updateFilter("category", v)}
      >
        <SelectTrigger className="w-52">
          <SelectValue placeholder="Category" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Categories</SelectItem>
          {CATEGORY_OPTIONS.map((c) => (
            <SelectItem key={c.value} value={c.value}>
              {c.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {clients.length > 0 && (
        <Select
          value={filters.client ?? "all"}
          onValueChange={(v) => updateFilter("client", v)}
        >
          <SelectTrigger className="w-36">
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
