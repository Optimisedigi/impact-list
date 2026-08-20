"use client";

import { useEffect, useSyncExternalStore } from "react";
import { Sun, Moon } from "lucide-react";
import { Button } from "@/components/ui/button";

// localStorage is the source of truth for the theme; the toggle notifies
// subscribers to re-read it. Keeps the value out of component state so nothing
// has to setState from an effect.
const listeners = new Set<() => void>();
const subscribe = (onChange: () => void) => {
  listeners.add(onChange);
  return () => {
    listeners.delete(onChange);
  };
};

export function ThemeToggle() {
  const dark = useSyncExternalStore(
    subscribe,
    () => localStorage.getItem("theme") === "dark",
    () => false
  );

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
  }, [dark]);

  function toggle() {
    localStorage.setItem("theme", dark ? "light" : "dark");
    listeners.forEach((l) => l());
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      className="h-8 gap-2 text-sidebar-foreground"
      onClick={toggle}
      aria-label="Toggle theme"
    >
      {dark ? (
        <>
          <Sun className="h-4 w-4" />
          <span className="text-xs">Light Mode</span>
        </>
      ) : (
        <>
          <Moon className="h-4 w-4" />
          <span className="text-xs">Dark Mode</span>
        </>
      )}
    </Button>
  );
}
