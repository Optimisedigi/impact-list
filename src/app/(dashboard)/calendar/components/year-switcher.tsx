"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface YearSwitcherProps {
  year: number;
  variant?: "default" | "band";
}

export function YearSwitcher({ year, variant = "default" }: YearSwitcherProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  function navigate(to: number) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("year", String(to));
    startTransition(() => {
      router.push(`/calendar?${params.toString()}`);
    });
  }

  const options: number[] = [];
  for (let y = year - 5; y <= year + 5; y++) options.push(y);

  if (variant === "band") {
    // Renders inside the yellow year-band: arrows on the edges, year (clickable
    // dropdown) centered. Uses dark text + transparent hover to read against
    // the band's color.
    const bandBtn =
      "h-full px-4 flex items-center justify-center text-[oklch(0.25_0_0)] hover:bg-black/10 focus-visible:outline-none";
    return (
      <div className="relative flex h-full w-full items-center justify-center">
        <button
          type="button"
          onClick={() => navigate(year - 1)}
          disabled={isPending}
          aria-label="Previous year"
          className={`absolute left-0 top-0 bottom-0 ${bandBtn}`}
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className={`${bandBtn} text-base font-semibold tabular-nums`}
            >
              {year}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="center" className="min-w-[100px]">
            {options.map((y) => (
              <DropdownMenuItem
                key={y}
                onSelect={() => navigate(y)}
                className={y === year ? "font-semibold" : ""}
              >
                {y}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
        <button
          type="button"
          onClick={() => navigate(year + 1)}
          disabled={isPending}
          aria-label="Next year"
          className={`absolute right-0 top-0 bottom-0 ${bandBtn}`}
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1">
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8"
        onClick={() => navigate(year - 1)}
        disabled={isPending}
        aria-label="Previous year"
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="h-8 px-2 text-base font-semibold tabular-nums">
            {year}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="center" className="min-w-[100px]">
          {options.map((y) => (
            <DropdownMenuItem
              key={y}
              onSelect={() => navigate(y)}
              className={y === year ? "font-semibold" : ""}
            >
              {y}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8"
        onClick={() => navigate(year + 1)}
        disabled={isPending}
        aria-label="Next year"
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
}
