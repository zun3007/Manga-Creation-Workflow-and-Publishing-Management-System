import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import Earnings from "./Earnings";

vi.mock("../../lib/api", () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

import { api } from "../../lib/api";
const mockApi = api as unknown as {
  get: ReturnType<typeof vi.fn>;
  post: ReturnType<typeof vi.fn>;
};

describe("Earnings", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders earnings page with total and ledger", async () => {
    mockApi.get.mockImplementation((url: string) => {
      if (url === "/earnings/mine") {
        return Promise.resolve({
          data: {
            total: 540,
            tasks: [
              {
                id: 7,
                description: "Tô màu",
                amount: 120,
                series: "Series X",
                chapter: "Ch 1",
                page: 3,
                regionType: "BACKGROUND",
                earnedAt: "2026-05-01",
                hasDispute: 0,
              },
            ],
          },
        });
      }
      if (url === "/disputes/mine") {
        return Promise.resolve({ data: [] });
      }
      return Promise.reject(new Error("Unknown URL"));
    });

    render(<Earnings />);

    await waitFor(() => {
      expect(screen.getByText("Tô màu")).toBeInTheDocument();
    });

    expect(screen.getByText(/540.*₫/)).toBeInTheDocument();
    expect(screen.getByText(/Series X · Ch 1 · Trang 3/)).toBeInTheDocument();
  });

  it("opens dispute form when clicking Khiếu nại button", async () => {
    mockApi.get.mockImplementation((url: string) => {
      if (url === "/earnings/mine") {
        return Promise.resolve({
          data: {
            total: 540,
            tasks: [
              {
                id: 7,
                description: "Tô màu",
                amount: 120,
                series: "Series X",
                chapter: "Ch 1",
                page: 3,
                regionType: "BACKGROUND",
                earnedAt: "2026-05-01",
                hasDispute: 0,
              },
            ],
          },
        });
      }
      if (url === "/disputes/mine") {
        return Promise.resolve({ data: [] });
      }
      return Promise.reject(new Error("Unknown URL"));
    });

    render(<Earnings />);

    await waitFor(() => {
      expect(screen.getByText("Tô màu")).toBeInTheDocument();
    });

    const disputeButton = screen.getByText("Khiếu nại");
    disputeButton.click();

    await waitFor(() => {
      expect(screen.getByPlaceholderText("Nhập lý do khiếu nại...")).toBeInTheDocument();
    });
  });

  it("can open dispute form for tasks without disputes", async () => {
    mockApi.get.mockImplementation((url: string) => {
      if (url === "/earnings/mine") {
        return Promise.resolve({
          data: {
            total: 540,
            tasks: [
              {
                id: 7,
                description: "Tô màu",
                amount: 120,
                series: "Series X",
                chapter: "Ch 1",
                page: 3,
                regionType: "BACKGROUND",
                earnedAt: "2026-05-01",
                hasDispute: 0,
              },
            ],
          },
        });
      }
      if (url === "/disputes/mine") {
        return Promise.resolve({ data: [] });
      }
      return Promise.reject(new Error("Unknown URL"));
    });

    render(<Earnings />);

    await waitFor(() => {
      expect(screen.getByText("Tô màu")).toBeInTheDocument();
    });

    const disputeButton = screen.getByText("Khiếu nại");
    expect(disputeButton).toBeInTheDocument();
    disputeButton.click();

    await waitFor(() => {
      expect(screen.getByPlaceholderText("Nhập lý do khiếu nại...")).toBeInTheDocument();
    });
  });

  it("displays disputes in the disputes section", async () => {
    mockApi.get.mockImplementation((url: string) => {
      if (url === "/earnings/mine") {
        return Promise.resolve({
          data: {
            total: 540,
            tasks: [
              {
                id: 7,
                description: "Tô màu",
                amount: 120,
                series: "Series X",
                chapter: "Ch 1",
                page: 3,
                regionType: "BACKGROUND",
                earnedAt: "2026-05-01",
                hasDispute: 1,
              },
            ],
          },
        });
      }
      if (url === "/disputes/mine") {
        return Promise.resolve({
          data: [
            {
              id: 1,
              taskId: 7,
              reason: "Chất lượng không đạt yêu cầu",
              expectedAmount: 150,
              status: "OPEN",
              resolutionNote: null,
              resolvedAt: null,
              createdAt: "2026-05-10",
              currentAmount: 120,
              task: "Tô màu",
            },
          ],
        });
      }
      return Promise.reject(new Error("Unknown URL"));
    });

    render(<Earnings />);

    await waitFor(() => {
      expect(screen.getByText("Chất lượng không đạt yêu cầu")).toBeInTheDocument();
    });

    expect(screen.getByText(/Đề xuất: 150.*₫/)).toBeInTheDocument();
    expect(screen.getByText(/Hiện tại: 120.*₫/)).toBeInTheDocument();
  });
});
