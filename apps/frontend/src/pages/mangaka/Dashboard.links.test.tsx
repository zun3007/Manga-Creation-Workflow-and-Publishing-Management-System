import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";

vi.mock("../../lib/auth", () => ({
  useAuth: () => ({
    user: { id: 1, role: "MANGAKA", name: "Nguyễn Tiến Dũng" },
  }),
}));

vi.mock("../../lib/api", () => ({
  api: {
    get: vi.fn((url: string) => {
      if (url === "/dashboard/summary") {
        return Promise.resolve({
          data: {
            activeSeries: 2,
            chaptersInProgress: 3,
            pendingReview: 4,
            openTasks: 5,
            atRiskSeries: 1,
          },
        });
      }
      return Promise.resolve({ data: [] });
    }),
  },
}));

import Dashboard from "./Dashboard";

describe("mangaka dashboard stat links", () => {
  it("routes each stat card to its related workflow", async () => {
    render(
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>,
    );

    expect(await screen.findByRole("link", { name: "Series hoạt động: 2" })).toHaveAttribute(
      "href",
      "/series",
    );
    expect(screen.getByRole("link", { name: "Chương đang vẽ: 3" })).toHaveAttribute(
      "href",
      "/series",
    );
    expect(screen.getByRole("link", { name: "Chờ bạn duyệt: 4" })).toHaveAttribute(
      "href",
      "/review",
    );
    expect(screen.getByRole("link", { name: "Task đang mở: 5" })).toHaveAttribute(
      "href",
      "/series",
    );
    expect(screen.getByRole("link", { name: "Series rủi ro: 1" })).toHaveAttribute(
      "href",
      "/series",
    );
  });
});
