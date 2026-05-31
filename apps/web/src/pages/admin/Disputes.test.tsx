import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import Disputes from "./Disputes";

vi.mock("../../lib/api", () => ({
  api: {
    get: vi.fn().mockResolvedValue({
      data: [
        {
          id: 3,
          taskId: 7,
          reason: "Trả ít",
          expectedAmount: 150,
          status: "OPEN",
          resolutionNote: null,
          resolvedAt: null,
          createdAt: "2026-05-01",
          currentAmount: 100,
          task: "Tô màu",
          assistant: "Mai",
        },
      ],
    }),
    patch: vi.fn().mockResolvedValue({
      data: {},
    }),
  },
}));

vi.stubGlobal("confirm", () => true);

import { api as mockApi } from "../../lib/api";

describe("Disputes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders disputes table with data", async () => {
    render(<Disputes />);

    await waitFor(() => {
      expect(screen.getByText("Mai")).toBeInTheDocument();
      expect(screen.getByText("Tô màu")).toBeInTheDocument();
    });
  });

  it("calls /disputes on mount", async () => {
    render(<Disputes />);

    await waitFor(() => {
      expect(mockApi.get).toHaveBeenCalledWith("/disputes");
    });
  });

  it("calls patch /disputes/:id/review on review button click", async () => {
    render(<Disputes />);

    await waitFor(() => {
      expect(screen.getByText("Bắt đầu xem xét")).toBeInTheDocument();
    });

    const reviewBtn = screen.getByText("Bắt đầu xem xét");
    reviewBtn.click();

    await waitFor(() => {
      expect(mockApi.patch).toHaveBeenCalledWith("/disputes/3/review");
    });
  });

  it("shows empty state when no disputes", async () => {
    vi.mocked(mockApi.get).mockResolvedValueOnce({
      data: [],
    } as any);

    render(<Disputes />);

    await waitFor(() => {
      expect(screen.getByText("Không có khiếu nại nào.")).toBeInTheDocument();
    });
  });

  it("shows loading state initially", () => {
    vi.mocked(mockApi.get).mockImplementationOnce(
      () => new Promise(() => {})
    );

    render(<Disputes />);

    expect(screen.getByText("Đang tải…")).toBeInTheDocument();
  });

  it("shows error panel on API failure", async () => {
    vi.mocked(mockApi.get).mockRejectedValueOnce(new Error("API Error"));

    render(<Disputes />);

    await waitFor(() => {
      expect(
        screen.getByText("Không thể tải danh sách khiếu nại. Vui lòng thử lại.")
      ).toBeInTheDocument();
    });
  });

  it("updates status to UNDER_REVIEW after review", async () => {
    render(<Disputes />);

    await waitFor(() => {
      expect(screen.getByText("Bắt đầu xem xét")).toBeInTheDocument();
    });

    const reviewBtn = screen.getByText("Bắt đầu xem xét");
    reviewBtn.click();

    await waitFor(() => {
      expect(mockApi.patch).toHaveBeenCalledWith("/disputes/3/review");
    });
  });
});
