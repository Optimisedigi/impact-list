import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { DashboardShell } from "../dashboard-shell";

vi.mock("../sidebar", () => ({ Sidebar: () => null }));

describe("DashboardShell mobile header", () => {
  it("omits the app title so the banner gets the full header width", () => {
    const { container } = render(
      <DashboardShell mobileBanner={<span>2 months — Brick by brick</span>}>
        <p>content</p>
      </DashboardShell>,
    );

    const slot = container.querySelector("#mobile-banner-slot");
    const header = slot?.parentElement;
    expect(header).toBeTruthy();
    expect(header).not.toHaveTextContent("Impact List");
    expect(slot).toHaveTextContent("2 months — Brick by brick");
  });
});
