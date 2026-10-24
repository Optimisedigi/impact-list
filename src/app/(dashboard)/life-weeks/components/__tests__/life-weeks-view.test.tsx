import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { LifeWeeksView } from "../life-weeks-view";

vi.mock("@/server/actions/life-weeks", () => ({ saveLifeWeeksSettings: vi.fn() }));

const settings = { dateOfBirth: "1990-05-03", lifeExpectancyYears: 90 };

describe("LifeWeeksView mobile layout", () => {
  it("collapses the important numbers on mobile once they are set, with a toggle", () => {
    render(<LifeWeeksView initial={settings} />);

    const toggle = screen.getByRole("button", { name: /important numbers/i });
    const panel = document.getElementById("lw-numbers");
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(toggle).toHaveAttribute("aria-controls", "lw-numbers");
    expect(toggle).toHaveTextContent("Born 3 May 1990, to 90 years");
    expect(panel).toHaveClass("hidden", "md:flex");

    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    expect(panel).not.toHaveClass("hidden");
    expect(screen.getByLabelText("I was born on")).toBeInTheDocument();
  });

  it("starts expanded when no numbers have been saved yet", () => {
    render(<LifeWeeksView initial={null} />);
    expect(screen.getByRole("button", { name: /important numbers/i })).toHaveAttribute(
      "aria-expanded",
      "true",
    );
  });

  it("lays out the summary stats in two columns on mobile", () => {
    render(<LifeWeeksView initial={settings} />);
    const stats = screen.getByTestId("lw-stats");
    expect(stats).toHaveClass("grid-cols-2");
    expect(stats.children).toHaveLength(4);
  });
});
