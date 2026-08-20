"use client";

import * as React from "react";
import { Clock } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

// Options offered in the dropdown. 15-minute steps keeps the list short
// enough to scan; anything off-grid can still be typed or nudged.
const STEP_MINUTES = 15;

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

/** "HH:MM" -> minutes since midnight, or null when unparseable. */
export function timeValueToMinutes(value: string): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h < 0 || h > 23 || min < 0 || min > 59) return null;
  return h * 60 + min;
}

function minutesToValue(minutes: number): string {
  const wrapped = ((minutes % 1440) + 1440) % 1440;
  return `${pad(Math.floor(wrapped / 60))}:${pad(wrapped % 60)}`;
}

/** 12-hour label built by hand — `toLocaleTimeString` varies between the
 *  server and browser locale and would trip hydration. */
export function formatTimeLabel(value: string): string {
  const minutes = timeValueToMinutes(value);
  if (minutes === null) return "";
  const h24 = Math.floor(minutes / 60);
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${h12}:${pad(minutes % 60)} ${h24 < 12 ? "am" : "pm"}`;
}

/**
 * Accepts what people actually type: "9", "930", "9:30", "9.30", "9pm",
 * "9:30 PM", "21:30". Returns "HH:MM" or null.
 */
export function parseLooseTime(input: string): string | null {
  const text = input.trim().toLowerCase();
  if (!text) return null;
  const m = /^(\d{1,2})[:.]?(\d{2})?\s*(am|pm|a|p)?$/.exec(text);
  if (!m) return null;

  let hour = Number(m[1]);
  const minute = m[2] ? Number(m[2]) : 0;
  const meridiem = m[3]?.[0];

  if (minute > 59) return null;
  if (meridiem) {
    if (hour < 1 || hour > 12) return null;
    if (meridiem === "p" && hour !== 12) hour += 12;
    if (meridiem === "a" && hour === 12) hour = 0;
  } else if (hour > 23) {
    return null;
  }
  return `${pad(hour)}:${pad(minute)}`;
}

function buildOptions(selected: string): string[] {
  const options: string[] = [];
  for (let m = 0; m < 1440; m += STEP_MINUTES) options.push(minutesToValue(m));
  // Keep an off-grid value (e.g. 10:37) visible and selectable in the list.
  const selectedMinutes = timeValueToMinutes(selected);
  if (selectedMinutes !== null && selectedMinutes % STEP_MINUTES !== 0) {
    options.push(selected);
    options.sort();
  }
  return options;
}

interface TimeFieldProps {
  /** "HH:MM", or "" when unset. */
  value: string;
  onChange: (value: string) => void;
  label: string;
  className?: string;
  placeholder?: string;
}

export function TimeField({
  value,
  onChange,
  label,
  className,
  placeholder = "Set time",
}: TimeFieldProps) {
  const [open, setOpen] = React.useState(false);
  const [draft, setDraft] = React.useState("");
  const selectedRef = React.useRef<HTMLButtonElement | null>(null);

  const options = React.useMemo(() => buildOptions(value), [value]);

  // Jump the list to the current value each time the popover opens.
  React.useEffect(() => {
    if (!open) return;
    setDraft(value ? formatTimeLabel(value) : "");
    const el = selectedRef.current;
    if (el) el.scrollIntoView({ block: "nearest" });
  }, [open, value]);

  function commit(next: string) {
    onChange(next);
    setOpen(false);
  }

  function commitDraft() {
    const parsed = parseLooseTime(draft);
    if (parsed) commit(parsed);
  }

  return (
    // `modal` gives the popover its own scroll lock. Without it, when the
    // field sits inside a Dialog the dialog's lock blocks wheel/touch scroll
    // in the portalled options list — it looks stuck near midnight.
    <Popover open={open} onOpenChange={setOpen} modal>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={label}
          className={cn(
            "flex h-9 w-full min-w-0 items-center gap-2 rounded-md border border-input bg-transparent px-3 text-sm shadow-xs outline-none transition-[color,box-shadow]",
            "focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50",
            value ? "text-foreground tabular-nums" : "text-muted-foreground",
            className,
          )}
        >
          <Clock className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          <span className="truncate">
            {value ? formatTimeLabel(value) : placeholder}
          </span>
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-56 p-2">
        <div className="flex gap-1.5">
          <input
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                commitDraft();
              }
            }}
            onBlur={commitDraft}
            placeholder="e.g. 9:30pm"
            aria-label={`${label} — type a time`}
            className="h-8 w-full min-w-0 rounded-md border border-input bg-transparent px-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 shrink-0 px-2 text-xs"
            onClick={() => {
              const now = new Date();
              commit(`${pad(now.getHours())}:${pad(now.getMinutes())}`);
            }}
          >
            Now
          </Button>
        </div>

        <div className="mt-2 max-h-56 overflow-y-auto" role="listbox" aria-label={label}>
          {options.map((option) => {
            const isSelected = option === value;
            return (
              <button
                key={option}
                type="button"
                role="option"
                aria-selected={isSelected}
                ref={isSelected ? selectedRef : undefined}
                // Keep focus in the text box: without this the mousedown
                // blurs it, commits whatever was typed, and closes the
                // popover before this button's click ever fires.
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => commit(option)}
                className={cn(
                  "w-full rounded-sm px-2 py-1 text-left text-sm tabular-nums hover:bg-accent",
                  isSelected && "bg-primary text-primary-foreground hover:bg-primary",
                )}
              >
                {formatTimeLabel(option)}
              </button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}
