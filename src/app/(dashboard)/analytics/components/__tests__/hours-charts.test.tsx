import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { HoursValueLabel, RecentWeeksHoursChart } from "../hours-charts";
import type { WeekHours } from "@/server/queries/daily-logs";

const week = (weekCommencing: string, label: string, total: number, isCurrentWeek = false): WeekHours => ({
  weekCommencing,
  label,
  total,
  isCurrentWeek,
});

const history: WeekHours[] = [
  week("2026-05-04", "May 4", 40),
  week("2026-05-11", "May 11", 12.25),
  week("2026-05-18", "May 18", 0),
  week("2026-05-25", "May 25", 30),
  week("2026-06-01", "Jun 1", 18),
  week("2026-06-08", "Jun 8", 6, true),
];

function visibleWeeks(): string[] {
  return screen.getAllByRole("listitem").map((li) => li.textContent ?? "");
}

describe("RecentWeeksHoursChart", () => {
  it("starts on the last four weeks, including zero-hour weeks", () => {
    render(<RecentWeeksHoursChart data={history} />);
    expect(screen.getByText("Weekly Hours")).toBeInTheDocument();
    expect(visibleWeeks()).toEqual([
      "Week of May 18: 0h",
      "Week of May 25: 30h",
      "Week of Jun 1: 18h",
      "Week of Jun 8: 6h",
    ]);
    expect(screen.getByText("May 18 to Jun 14, 2026")).toBeInTheDocument();
  });

  it("shows the average of completed weeks with hours in place of the old label", () => {
    render(<RecentWeeksHoursChart data={history} />);
    expect(screen.queryByText(/Last 4 weeks/)).not.toBeInTheDocument();
    // May 25 (30) and Jun 1 (18); the empty week and the current week are left out.
    expect(screen.getByText("Average weekly hours")).toHaveTextContent("Average weekly hours 24h");
  });

  it("steps back one week at a time and keeps four weeks in view", () => {
    render(<RecentWeeksHoursChart data={history} />);
    const later = screen.getByRole("button", { name: "Show later week" });
    const earlier = screen.getByRole("button", { name: "Show earlier week" });
    expect(later).toBeDisabled();

    fireEvent.click(earlier);
    expect(visibleWeeks()).toEqual([
      "Week of May 11: 12.3h",
      "Week of May 18: 0h",
      "Week of May 25: 30h",
      "Week of Jun 1: 18h",
    ]);
    expect(later).toBeEnabled();

    fireEvent.click(earlier);
    expect(visibleWeeks()[0]).toBe("Week of May 4: 40h");
    expect(visibleWeeks()).toHaveLength(4);
    expect(earlier).toBeDisabled();
    expect(screen.getByText("Average weekly hours")).toHaveTextContent("27.4h");

    fireEvent.click(screen.getByRole("button", { name: "Latest" }));
    expect(visibleWeeks()[3]).toBe("Week of Jun 8: 6h");
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
