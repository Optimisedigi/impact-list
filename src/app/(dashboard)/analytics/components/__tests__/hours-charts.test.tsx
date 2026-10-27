import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { HoursValueLabel, RecentWeeksHoursChart } from "../hours-charts";
import type { WeekHours } from "@/server/queries/daily-logs";

const week = (weekCommencing: string, label: string, total: number, isCurrentWeek = false): WeekHours => ({
  weekCommencing,
  label,
  total,
  isCurrentWeek,
});

// Fourteen weeks, Mar 2 to Jun 1 2026; Jun 1 is the in-progress week.
const history: WeekHours[] = Array.from({ length: 14 }, (_, i) => {
  const d = new Date(2026, 2, 2 + i * 7);
  const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const label = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  // Week 0 is 40h, week 11 is empty, the rest are 10h + i.
  const total = i === 0 ? 40 : i === 11 ? 0 : 10 + i;
  return week(iso, label, total, i === 13);
});

function mockViewport(desktop: boolean) {
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    writable: true,
    value: (query: string) => ({
      matches: desktop && query === "(min-width: 768px)",
      media: query,
      addEventListener: () => {},
      removeEventListener: () => {},
    }),
  });
}

function visibleWeeks(): string[] {
  return screen.getAllByRole("listitem").map((li) => li.textContent ?? "");
}

afterEach(() => {
  Reflect.deleteProperty(window, "matchMedia");
});

describe("RecentWeeksHoursChart", () => {
  it("shows the last twelve weeks on desktop, including zero-hour weeks", () => {
    mockViewport(true);
    render(<RecentWeeksHoursChart data={history} />);
    expect(screen.getByText("Weekly Hours")).toBeInTheDocument();
    const weeks = visibleWeeks();
    expect(weeks).toHaveLength(12);
    expect(weeks[0]).toBe("Week of Mar 16: 12h");
    expect(weeks[9]).toBe("Week of May 18: 0h");
    expect(weeks[11]).toBe("Week of Jun 1: 23h");
    expect(screen.getByText("Mar 16 to Jun 7, 2026")).toBeInTheDocument();
  });

  it("shows the last six weeks on mobile", () => {
    mockViewport(false);
    render(<RecentWeeksHoursChart data={history} />);
    expect(visibleWeeks()).toEqual([
      "Week of Apr 27: 18h",
      "Week of May 4: 19h",
      "Week of May 11: 20h",
      "Week of May 18: 0h",
      "Week of May 25: 22h",
      "Week of Jun 1: 23h",
    ]);
    expect(screen.getByText("Apr 27 to Jun 7, 2026")).toBeInTheDocument();
  });

  it("falls back to the mobile window when matchMedia is unavailable", () => {
    render(<RecentWeeksHoursChart data={history} />);
    expect(visibleWeeks()).toHaveLength(6);
  });

  it("shows the average of completed weeks with hours in the visible window", () => {
    mockViewport(false);
    render(<RecentWeeksHoursChart data={history} />);
    // Apr 27 to May 25 minus the empty week: (18 + 19 + 20 + 22) / 4; the current week is left out.
    expect(screen.getByText("Average weekly hours")).toHaveTextContent("Average weekly hours 19.8h");
  });

  it("steps back one week at a time and keeps the window size in view", () => {
    mockViewport(true);
    render(<RecentWeeksHoursChart data={history} />);
    const later = screen.getByRole("button", { name: "Show later week" });
    const earlier = screen.getByRole("button", { name: "Show earlier week" });
    expect(later).toBeDisabled();

    fireEvent.click(earlier);
    expect(visibleWeeks()[0]).toBe("Week of Mar 9: 11h");
    expect(visibleWeeks()[11]).toBe("Week of May 25: 22h");
    expect(later).toBeEnabled();

    fireEvent.click(earlier);
    expect(visibleWeeks()[0]).toBe("Week of Mar 2: 40h");
    expect(visibleWeeks()).toHaveLength(12);
    expect(earlier).toBeDisabled();
    // Mar 2 to May 18 minus the empty week: (40 + 11 + ... + 20) / 11.
    expect(screen.getByText("Average weekly hours")).toHaveTextContent("17.7h");

    fireEvent.click(screen.getByRole("button", { name: "Latest" }));
    expect(visibleWeeks()[11]).toBe("Week of Jun 1: 23h");
    expect(screen.queryByRole("button", { name: "Latest" })).not.toBeInTheDocument();
  });

  it("shows an empty state when no hours have been logged", () => {
    render(<RecentWeeksHoursChart data={history.map((w) => ({ ...w, total: 0 }))} />);
    expect(screen.getByText("No hours logged yet.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Show earlier week" })).not.toBeInTheDocument();
  });
});

describe("HoursValueLabel", () => {
  it("renders zero values above the bar instead of hiding them", () => {
    const { container } = render(
      <svg>
        <HoursValueLabel x={10} y={50} width={20} value={0} />
      </svg>,
    );
    const text = container.querySelector("text");
    expect(text).toHaveTextContent("0h");
    expect(text).toHaveAttribute("x", "20");
    expect(text).toHaveAttribute("y", "44");
  });
});
