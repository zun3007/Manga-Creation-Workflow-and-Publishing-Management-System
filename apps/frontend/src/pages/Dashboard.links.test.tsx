import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ role: "ASSISTANT" }));

vi.mock("../lib/auth", () => ({
  useAuth: () => ({
    user: { id: 1, role: mocks.role, name: "Test User" },
  }),
}));

vi.mock("../lib/api", () => ({
  api: {
    get: vi.fn().mockResolvedValue({
      data: {
        assigned: 1,
        inProgress: 2,
        submitted: 3,
        revisions: 4,
        chaptersToReview: 5,
        managedSeries: 6,
        proposalsToReview: 7,
        underReview: 8,
        users: 9,
        mangaka: 10,
        assistants: 11,
        series: 12,
        chapters: 13,
        proposals: 14,
      },
    }),
  },
}));

vi.mock("./mangaka/Dashboard", () => ({
  default: () => <div>Mangaka Dashboard</div>,
}));

import Dashboard from "./Dashboard";

function renderDashboard(role: string) {
  mocks.role = role;
  return render(
    <MemoryRouter>
      <Dashboard />
    </MemoryRouter>,
  );
}

describe("role dashboard stat links", () => {
  beforeEach(() => {
    mocks.role = "ASSISTANT";
  });

  it("routes every assistant task status to My Tasks", async () => {
    renderDashboard("ASSISTANT");

    for (const name of ["Được giao: 1", "Đang làm: 2", "Đã nộp: 3", "Cần sửa: 4"]) {
      expect(await screen.findByRole("link", { name })).toHaveAttribute("href", "/my-tasks");
    }
  });

  it("routes editor stats to review and managed series", async () => {
    renderDashboard("TANTOU_EDITOR");

    expect(await screen.findByRole("link", { name: "Chương chờ duyệt: 5" })).toHaveAttribute(
      "href",
      "/editor/review",
    );
    expect(screen.getByRole("link", { name: "Series phụ trách: 6" })).toHaveAttribute(
      "href",
      "/editor/series",
    );
  });

  it("routes board proposal stats to the proposal queue", async () => {
    renderDashboard("EDITORIAL_BOARD");

    expect(await screen.findByRole("link", { name: "Đề xuất chờ duyệt: 7" })).toHaveAttribute(
      "href",
      "/board/proposals",
    );
    expect(screen.getByRole("link", { name: "Đang xem xét: 8" })).toHaveAttribute(
      "href",
      "/board/proposals",
    );
  });

  it("routes admin stats to the admin console", async () => {
    renderDashboard("ADMIN");

    expect(await screen.findByRole("link", { name: "Người dùng: 9" })).toHaveAttribute(
      "href",
      "/admin",
    );
    expect(screen.getByRole("link", { name: "Series: 12" })).toHaveAttribute("href", "/admin");
    expect(screen.getByRole("link", { name: "Đề xuất: 14" })).toHaveAttribute("href", "/admin");
  });
});
