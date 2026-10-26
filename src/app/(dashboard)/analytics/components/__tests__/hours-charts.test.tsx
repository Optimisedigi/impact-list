import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { HoursValueLabel, RecentWeeksHoursChart } from "../hours-charts";

const weeks = [
  { weekCommencing: "2026-05-18", label: "May 18", total: 12.25 },
  { weekCommencing: "2026-05-25", label: "May 25", total: 0 },
  { weekCommencing: "2026-06-01", label: "Jun 1", total: 30 },
  { weekCommencing: "2026-06-08", label: "Jun 8", total: 6 },
];

describe("RecentWeeksHoursChart", () => {
  it("lists every week with its hours, including zero-hour weeks", () => {
    render(<RecentWeeksHoursChart data={weeks} />);
    expect(screen.getByText("Weekly Hours")).toBeInTheDocument();
    expect(screen.getByText("Last 4 weeks")).toBeInTheDocument();
    expect(screen.getByText("Week of May 18: 12.3h")).toBeInTheDocument();
    expect(screen.getByText("Week of May 25: 0h")).toBeInTheDocument();
    expect(screen.getByText("Week of Jun 8: 6h")).toBeInTheDocument();
  });

  it("shows an empty state when no hours were logged in the window", () => {
    render(<RecentWeeksHoursChart data={weeks.map((w) => ({ ...w, total: 0 }))} />);
    expect(screen.getByText("No hours logged in the last 4 weeks.")).toBeInTheDocument();
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
