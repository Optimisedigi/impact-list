"use client";

import { Menu } from "lucide-react";
import { usePathname } from "next/navigation";
import { Sidebar } from "./sidebar";
import { useSidebar } from "./sidebar-context";
import { Button } from "@/components/ui/button";

export function DashboardShell({
  children,
  mobileBanner,
  desktopBanner,
}: {
  children: React.ReactNode;
  mobileBanner?: React.ReactNode;
  desktopBanner?: React.ReactNode;
}) {
  const { collapsed, toggleMobile } = useSidebar();
  const pathname = usePathname();
  // The calendar route needs every pixel of the mobile header for filter
  // chips, so we drop the title there.
  const hideTitle = pathname.startsWith("/calendar");

  return (
    <div className="min-h-screen">
      <Sidebar />
      {/* Mobile sticky header: hamburger + title + inline week banner */}
      <div className="sticky top-0 z-30 border-b border-border bg-background md:hidden">
        <div className="flex h-12 items-center gap-2 px-4">
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 shrink-0"
            onClick={toggleMobile}
            aria-label="Toggle menu"
          >
            <Menu className="h-5 w-5" />
          </Button>
          {!hideTitle && (
            <span className="text-base font-semibold shrink-0">Impact List</span>
          )}
          {/* Slot that page-level components can portal into via the id below.
              Renders to the right of the title on mobile only. */}
          <div
            id="mobile-banner-slot"
            className="ml-auto flex min-w-0 flex-1 items-center justify-end [&>div]:mb-0 [&>div]:justify-end"
          >
            {mobileBanner}
          </div>
        </div>
      </div>
      <main
        className="min-h-screen p-3 transition-all duration-200 md:p-6 overflow-x-hidden"
        style={
          { "--sidebar-width": collapsed ? "3.5rem" : "11rem" } as React.CSSProperties
        }
      >
        <div className="min-w-0 md:ml-[var(--sidebar-width)] md:transition-[margin] md:duration-200">
          {desktopBanner && (
            <div className="hidden md:block">{desktopBanner}</div>
          )}
          {children}
        </div>
      </main>
    </div>
  );
}
