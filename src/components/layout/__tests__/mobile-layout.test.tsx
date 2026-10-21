import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { buttonVariants } from "@/components/ui/button";

const read = (rel: string): string =>
  readFileSync(join(process.cwd(), "src", rel), "utf8");

describe("mobile layout contracts", () => {
  it("lets users pinch-zoom and extends into safe areas", () => {
    const root = read("app/layout.tsx");
    expect(root).not.toContain("maximumScale");
    expect(root).not.toContain("userScalable");
    expect(root).toContain('viewportFit: "cover"');
  });

  it("enlarges buttons for coarse pointers only", () => {
    expect(buttonVariants({ size: "icon" })).toContain("pointer-coarse:size-11");
    expect(buttonVariants({ size: "default" })).toContain("pointer-coarse:h-11");
    expect(buttonVariants({ size: "default" })).toContain("h-9");
  });

  it("keeps dialogs inside the dynamic viewport and scrollable", () => {
    const dialog = read("components/ui/dialog.tsx");
    expect(dialog).toContain("max-h-[calc(100dvh-2rem)]");
    expect(dialog).toContain("overflow-y-auto");
  });

  it("uses dynamic viewport height and keeps desktop sidebar breakpoint", () => {
    const shell = read("components/layout/dashboard-shell.tsx");
    const sidebar = read("components/layout/sidebar.tsx");
    expect(shell).not.toContain("min-h-screen");
    expect(sidebar).toContain("h-dvh");
    expect(sidebar).toContain("hidden md:flex");
    expect(shell).toContain("md:hidden");
  });

  it("insets floating actions from the safe area on mobile", () => {
    expect(read("components/layout/floating-add-task.tsx")).toContain("env(safe-area-inset-bottom)");
    expect(read("components/timer/floating-timer-widget.tsx")).toContain("env(safe-area-inset-bottom)");
  });
});
