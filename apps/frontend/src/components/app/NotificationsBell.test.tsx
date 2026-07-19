import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "../../lib/api";
import { NotificationsBell } from "./NotificationsBell";

vi.mock("../../lib/api", () => ({
  api: {
    get: vi.fn(),
    patch: vi.fn(),
  },
}));

const mockedApi = vi.mocked(api);

describe("NotificationsBell", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedApi.get.mockResolvedValue({
      data: [
        {
          id: 12,
          type: "REVIEW",
          title: "Chương đã được duyệt",
          content: "Biên tập viên đã duyệt chương 5 và để lại nhận xét chi tiết.",
          isRead: 0,
          relatedEntityType: "Chapter",
          relatedEntityId: 5,
          createdAt: "2026-07-19T09:30:00.000Z",
        },
      ],
    } as never);
    mockedApi.patch.mockResolvedValue({ data: { ok: true } } as never);
  });

  it("opens the selected notification detail and marks it as read", async () => {
    render(<NotificationsBell />);

    fireEvent.click(await screen.findByRole("button", { name: /notifications/i }));
    fireEvent.click(await screen.findByRole("button", { name: /chương đã được duyệt/i }));

    expect(screen.getByRole("dialog", { name: "Chi tiết thông báo" })).toBeInTheDocument();
    expect(screen.getByText("Chương đã được duyệt")).toBeInTheDocument();
    expect(
      screen.getByText("Biên tập viên đã duyệt chương 5 và để lại nhận xét chi tiết."),
    ).toBeInTheDocument();
    await waitFor(() =>
      expect(mockedApi.patch).toHaveBeenCalledWith("/notifications/12/read"),
    );
  });

  it("closes the detail dialog", async () => {
    render(<NotificationsBell />);

    fireEvent.click(await screen.findByRole("button", { name: /notifications/i }));
    fireEvent.click(await screen.findByRole("button", { name: /chương đã được duyệt/i }));
    fireEvent.click(screen.getByRole("button", { name: "Đóng chi tiết thông báo" }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
