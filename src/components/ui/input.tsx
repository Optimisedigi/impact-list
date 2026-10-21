import * as React from "react"

import { cn } from "@/lib/utils"

// Input types that render a native calendar/clock picker. Browsers only open
// that picker when the small icon is hit, which is a tiny target — we open it
// from a click anywhere in the field instead.
const PICKER_TYPES = new Set([
  "date",
  "time",
  "datetime-local",
  "month",
  "week",
])

/**
 * Click handler that opens the browser's native date/time picker.
 * Exported for the handful of places that render a raw `<input type="date">`
 * instead of this component.
 */
export function openNativePicker(
  event: React.MouseEvent<HTMLInputElement>,
): void {
  const el = event.currentTarget
  if (el.readOnly || el.disabled) return
  try {
    el.showPicker()
  } catch {
    // Not supported for this type, or the browser refused (no user gesture).
    // Typing and the built-in icon still work, so there is nothing to report.
  }
}

function Input({
  className,
  type,
  onClick,
  ...props
}: React.ComponentProps<"input">) {
  const hasPicker = !!type && PICKER_TYPES.has(type)

  function handleClick(event: React.MouseEvent<HTMLInputElement>) {
    onClick?.(event)
    if (!hasPicker || event.defaultPrevented) return
    openNativePicker(event)
  }

  return (
    <input
      type={type}
      data-slot="input"
      onClick={hasPicker ? handleClick : onClick}
      className={cn(
        "h-9 w-full min-w-0 rounded-md border border-input bg-transparent px-3 py-1 text-base text-blue-400 shadow-xs transition-[color,box-shadow] outline-none selection:bg-primary selection:text-primary-foreground file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm dark:bg-input/30",
        "focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50",
        "aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40",
        hasPicker && "cursor-pointer",
        className
      )}
      {...props}
    />
  )
}

export { Input }
