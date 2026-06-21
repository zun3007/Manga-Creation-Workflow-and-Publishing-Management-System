import { describe, it, expect, vi, beforeEach } from "vitest";
import type { AxiosResponse } from "axios";
import { render, screen, waitFor } from "@testing-library/react";
import { ConfirmProvider } from "../../lib/confirm";
import { ToastProvider } from "../../components/ui/Toast";
import Disputes from "./Disputes";

vi.mock("../../lib/api", () => ({
  apiErrorMessage: (_err: unknown, fallback: string) => fallback,
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

import { api as mockApi } from "../../lib/api";

describe("Disputes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders disputes table with data", async () => {
    render(
      <ToastProvider>
        <ConfirmProvider>
          <Disputes />
        </ConfirmProvider>
      </ToastProvider>
    );

    await waitFor(() => {
      expect(screen.getByText("Mai")).toBeInTheDocument();
      expect(screen.getByText("Tô màu")).toBeInTheDocument();
    });
  });

  it("calls /disputes on mount", async () => {
    render(
      <ToastProvider>
        <ConfirmProvider>
          <Disputes />
        </ConfirmProvider>
      </ToastProvider>
    );

    await waitFor(() => {
      expect(mockApi.get).toHaveBeenCalledWith("/disputes");
    });
  });

  it("calls patch /disputes/:id/review on review button click", async () => {
    render(
      <ToastProvider>
        <ConfirmProvider>
          <Disputes />
        </ConfirmProvider>
      </ToastProvider>
    );

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
    } as unknown as AxiosResponse);

    render(
      <ToastProvider>
        <ConfirmProvider>
          <Disputes />
        </ConfirmProvider>
      </ToastProvider>
    );

    await waitFor(() => {
      expect(screen.getByText("Không có khiếu nại nào.")).toBeInTheDocument();
    });
  });

  it("shows loading state initially", () => {
    vi.mocked(mockApi.get).mockImplementationOnce(
      () => new Promise(() => {})
    );

    render(
      <ToastProvider>
        <ConfirmProvider>
          <Disputes />
        </ConfirmProvider>
      </ToastProvider>
    );

    expect(screen.getByText("Đang tải…")).toBeInTheDocument();
  });

  it("shows error panel on API failure", async () => {
    vi.mocked(mockApi.get).mockRejectedValueOnce(new Error("API Error"));

    render(
      <ToastProvider>
        <ConfirmProvider>
          <Disputes />
        </ConfirmProvider>
      </ToastProvider>
    );

    await waitFor(() => {
      expect(
        screen.getByText("Không thể tải danh sách khiếu nại. Vui lòng thử lại.")
      ).toBeInTheDocument();
    });
  });

  it("updates status to UNDER_REVIEW after review", async () => {
    render(
      <ToastProvider>
        <ConfirmProvider>
          <Disputes />
        </ConfirmProvider>
      </ToastProvider>
    );

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
