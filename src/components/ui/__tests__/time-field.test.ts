import * as React from "react";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  formatTimeLabel,
  parseLooseTime,
  timeValueToMinutes,
  TimeField,
} from "../time-field";

// The popper's content commits on a later render than the one that flips
// `open` (Radix Presence mounts content from a follow-up pass), so the options
// list does not exist in the popover's opening commit. Model that here: the
// content appears on a timer tick after `open` flips.
vi.mock("@/components/ui/popover", async () => {
  const R = await import("react");

  interface CtxValue {
    open: boolean;
    onOpenChange: (open: boolean) => void;
  }
  const Ctx = R.createContext<CtxValue>({ open: false, onOpenChange: () => {} });

  function Popover({
    open,
    onOpenChange,
    children,
  }: CtxValue & { children?: import("react").ReactNode }): import("react").ReactElement {
    return R.createElement(Ctx.Provider, { value: { open, onOpenChange } }, children);
  }

  function PopoverTrigger({
    children,
  }: {
    children?: import("react").ReactNode;
  }): import("react").ReactElement {
    const { onOpenChange } = R.useContext(Ctx);
    const child = R.Children.only(children) as import("react").ReactElement<{
      onClick?: () => void;
    }>;
    return R.cloneElement(child, { onClick: () => onOpenChange(true) });
  }

  function PopoverContent({
    children,
  }: {
    children?: import("react").ReactNode;
  }): import("react").ReactElement | null {
    const { open } = R.useContext(Ctx);
    const [mounted, setMounted] = R.useState(false);
    R.useEffect(() => {
      if (!open) {
        setMounted(false);
        return;
      }
      const t = setTimeout(() => setMounted(true), 0);
      return () => clearTimeout(t);
    }, [open]);
    if (!open || !mounted) return null;
    return R.createElement("div", null, children);
  }

  return { Popover, PopoverTrigger, PopoverContent };
});

describe("parseLooseTime", () => {
  it("accepts the shorthand people actually type", () => {
    expect(parseLooseTime("9")).toBe("09:00");
    expect(parseLooseTime("930")).toBe("09:30");
    expect(parseLooseTime("9:30")).toBe("09:30");
    expect(parseLooseTime("9.30")).toBe("09:30");
    expect(parseLooseTime("1430")).toBe("14:30");
  });

  it("handles am/pm, including the 12 o'clock edge cases", () => {
    expect(parseLooseTime("9pm")).toBe("21:00");
    expect(parseLooseTime("9:30 PM")).toBe("21:30");
    expect(parseLooseTime("12am")).toBe("00:00");
    expect(parseLooseTime("12pm")).toBe("12:00");
  });

  it("rejects impossible or empty input", () => {
    expect(parseLooseTime("")).toBeNull();
    expect(parseLooseTime("25:00")).toBeNull();
    expect(parseLooseTime("9:75")).toBeNull();
    expect(parseLooseTime("13pm")).toBeNull();
    expect(parseLooseTime("lunch")).toBeNull();
  });
});

describe("formatTimeLabel", () => {
  it("renders 24-hour HH:MM labels", () => {
    expect(formatTimeLabel("00:00")).toBe("00:00");
    expect(formatTimeLabel("09:05")).toBe("09:05");
    expect(formatTimeLabel("12:00")).toBe("12:00");
    expect(formatTimeLabel("22:15")).toBe("22:15");
    expect(formatTimeLabel("")).toBe("");
  });

  it("pads single-digit hours from loose input", () => {
    expect(formatTimeLabel("9:05")).toBe("09:05");
  });
});

describe("timeValueToMinutes", () => {
  it("converts HH:MM and rejects junk", () => {
    expect(timeValueToMinutes("10:30")).toBe(630);
    expect(timeValueToMinutes("24:00")).toBeNull();
    expect(timeValueToMinutes("nope")).toBeNull();
  });
});

describe("TimeField open scroll", () => {
  const ROW_HEIGHT = 28;
  const LIST_TOP = 49;
  // 09:07 system time -> nearest quarter-hour is 09:00, option index 36.
  const NOW_INDEX = 36;

  let scrolls: Map<Element, number>;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-25T09:07:00"));
    scrolls = new Map();

    Object.defineProperty(HTMLElement.prototype, "offsetTop", {
      configurable: true,
      get(this: HTMLElement): number {
        if (this.getAttribute("role") === "listbox") return LIST_TOP;
        const parent = this.parentElement;
        if (parent && parent.getAttribute("role") === "listbox") {
          return (
            LIST_TOP +
            Array.prototype.indexOf.call(parent.children, this) * ROW_HEIGHT
          );
        }
        return 0;
      },
    });
    Object.defineProperty(HTMLElement.prototype, "scrollTop", {
      configurable: true,
      get(this: HTMLElement): number {
        return scrolls.get(this) ?? 0;
      },
      set(this: HTMLElement, value: number) {
        scrolls.set(this, value);
      },
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    Reflect.deleteProperty(HTMLElement.prototype, "offsetTop");
    Reflect.deleteProperty(HTMLElement.prototype, "scrollTop");
  });

  const cases = [
    {
      name: "lands near now when nothing is selected",
      value: "",
      expectedIndex: NOW_INDEX,
    },
    {
      name: "lands on the selected time when one is set",
      value: "22:15",
      expectedIndex: 89,
    },
  ];

  for (const c of cases) {
    it(c.name, () => {
      render(
        React.createElement(TimeField, {
          value: c.value,
          onChange: () => {},
          label: "Start time",
        }),
      );

      fireEvent.click(screen.getByRole("button", { name: "Start time" }));
      act(() => {
        vi.runOnlyPendingTimers();
      });

      const list = screen.getByRole("listbox");
      expect(scrolls.get(list)).toBe(c.expectedIndex * ROW_HEIGHT);
    });
  }

  it("follows the typed time as it is typed", () => {
    render(
      React.createElement(TimeField, {
        value: "",
        onChange: () => {},
        label: "Start time",
      }),
    );

    fireEvent.click(screen.getByRole("button", { name: "Start time" }));
    act(() => {
      vi.runOnlyPendingTimers();
    });

    fireEvent.change(screen.getByRole("textbox", { name: /type a time/ }), {
      target: { value: "14:30" },
    });

    // "14:30" is option index 58; the list must follow the match, not stay
    // where the open-scroll landed.
    const list = screen.getByRole("listbox");
    expect(scrolls.get(list)).toBe(58 * ROW_HEIGHT);
  });
});
