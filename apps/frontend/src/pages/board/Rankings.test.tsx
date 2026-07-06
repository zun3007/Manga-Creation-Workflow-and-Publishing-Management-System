import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ConfirmProvider } from "../../lib/confirm";
import { ToastProvider } from "../../components/ui/Toast";
import BoardRankings from "./Rankings";

const mockGet = vi.fn();
const mockPost = vi.fn();

vi.mock("../../lib/api", () => ({
  api: {
    get: (url: string) => mockGet(url),
    post: (url: string, body: any) => mockPost(url, body),
  },
}));

describe("BoardRankings", () => {
  beforeEach(() => {
    mockGet.mockClear();
    mockPost.mockClear();

    // Set up default mocks
    mockGet.mockImplementation((url: string) => {
      if (url === "/rankings") {
        return Promise.resolve({
          data: [
            {
              id: 1,
              title: "Series X",
              status: "ACTIVE",
              rankPosition: 1,
              score: 4.2,
              riskLevel: "LOW",
            },
          ],
        });
      }
      if (url === "/vote-periods/open") {
        return Promise.resolve({
          data: [
            {
              id: 9,
              seriesId: 1,
              series: "Series X",
              periodType: "WEEKLY",
              endDate: "2999-01-17",
              hasVoted: 0,
            },
          ],
        });
      }
      if (url === "/series/all") {
        return Promise.resolve({ data: [] });
      }
      return Promise.resolve({ data: [] });
    });

    mockPost.mockResolvedValue({ data: {} });
  });

  it("renders loading state initially", () => {
    mockGet.mockImplementation(() => new Promise(() => {}));

    render(
      <ToastProvider>
        <ConfirmProvider>
          <BoardRankings />
        </ConfirmProvider>
      </ToastProvider>
    );

    expect(screen.getByText("Xếp hạng & Quyết định")).toBeInTheDocument();
    expect(screen.getByText("Đang tải…")).toBeInTheDocument();
  });

  it("renders rankings and open periods on load", async () => {
    render(
      <ToastProvider>
        <ConfirmProvider>
          <BoardRankings />
        </ConfirmProvider>
      </ToastProvider>
    );

    // Wait for data to load
    expect(await screen.findByText("4.2")).toBeInTheDocument();

    // Verify leaderboard section shows the series
    expect(screen.getByText("Bảng xếp hạng")).toBeInTheDocument();
    expect(screen.getAllByText("Series X")).toHaveLength(2); // one in rankings, one in open periods

    // Verify open periods section shows the period
    expect(screen.getByText("Kỳ bình chọn đang mở")).toBeInTheDocument();
  });

  it("allows voting on open periods", async () => {
    render(
      <ToastProvider>
        <ConfirmProvider>
          <BoardRankings />
        </ConfirmProvider>
      </ToastProvider>
    );

    // Wait for open periods to load
    await screen.findByText("Kỳ bình chọn đang mở");

    // Find and fill the score input
    const scoreInput = screen.getByPlaceholderText("Điểm (1-5)") as HTMLInputElement;
    fireEvent.change(scoreInput, { target: { value: "5" } });

    // Find and click the vote button
    const voteButton = screen.getByRole("button", { name: "Bình chọn" });
    fireEvent.click(voteButton);

    // Verify api.post was called with correct data
    await waitFor(() =>
      expect(mockPost).toHaveBeenCalledWith("/votes", {
        votePeriodId: 9,
        score: 5,
        comment: undefined,
      })
    );
  });

  it("shows confirmation when period is already voted", async () => {
    mockGet.mockImplementation((url: string) => {
      if (url === "/rankings") {
        return Promise.resolve({ data: [] });
      }
      if (url === "/vote-periods/open") {
        return Promise.resolve({
          data: [
            {
              id: 9,
              seriesId: 1,
              series: "Series X",
              periodType: "WEEKLY",
              endDate: "2999-01-17",
              hasVoted: 1,
            },
          ],
        });
      }
      if (url === "/series/all") {
        return Promise.resolve({ data: [] });
      }
      return Promise.resolve({ data: [] });
    });

    render(
      <ToastProvider>
        <ConfirmProvider>
          <BoardRankings />
        </ConfirmProvider>
      </ToastProvider>
    );

    await screen.findByText("Kỳ bình chọn đang mở");

    // Should show "Đã bình chọn" instead of vote inputs
    expect(screen.getByText("Đã bình chọn")).toBeInTheDocument();
    expect(screen.queryByPlaceholderText("Điểm (1-5)")).not.toBeInTheDocument();
  });

  it("does not expose a manual close action for a single board member", async () => {
    render(
      <ToastProvider>
        <ConfirmProvider>
          <BoardRankings />
        </ConfirmProvider>
      </ToastProvider>
    );

    await screen.findByText("Kỳ bình chọn đang mở");

    expect(
      screen.queryByRole("button", { name: "Đóng & tính hạng" })
    ).not.toBeInTheDocument();
    expect(
      screen.getByText(
        "Hệ thống sẽ tự chốt và xếp hạng sau khi toàn bộ Editorial Board đã bình chọn."
      )
    ).toBeInTheDocument();
  });

  it("shows scheduled future vote periods but disables voting until the start date", async () => {
    mockGet.mockImplementation((url: string) => {
      if (url === "/rankings") {
        return Promise.resolve({ data: [] });
      }
      if (url === "/vote-periods/open") {
        return Promise.resolve({
          data: [
            {
              id: 9,
              seriesId: 1,
              series: "Series Future",
              periodType: "WEEKLY",
              startDate: "2999-01-10",
              endDate: "2999-01-17",
              hasVoted: 0,
            },
          ],
        });
      }
      if (url === "/series/all") {
        return Promise.resolve({ data: [] });
      }
      return Promise.resolve({ data: [] });
    });

    render(
      <ToastProvider>
        <ConfirmProvider>
          <BoardRankings />
        </ConfirmProvider>
      </ToastProvider>
    );

    await screen.findByText("Series Future");

    expect(screen.getByText(/Mở từ: 2999-01-10/)).toBeInTheDocument();
    expect(screen.getByText("Chưa đến ngày mở")).toBeInTheDocument();
    expect(screen.queryByPlaceholderText("Điểm (1-5)")).not.toBeInTheDocument();
  });

  it("limits vote period dates to today-or-future and end date after start date", async () => {
    const { container } = render(
      <ToastProvider>
        <ConfirmProvider>
          <BoardRankings />
        </ConfirmProvider>
      </ToastProvider>
    );

    await screen.findByText("Mở kỳ bình chọn mới");

    const [startDateInput, endDateInput] = Array.from(
      container.querySelectorAll<HTMLInputElement>('input[type="date"]')
    );
    const today = new Date().toISOString().slice(0, 10);

    expect(startDateInput).toHaveAttribute("min", today);
    expect(endDateInput).toHaveAttribute("min", today);

    fireEvent.change(startDateInput, { target: { value: "2999-01-10" } });

    expect(endDateInput).toHaveAttribute("min", "2999-01-10");
  });

  it("renders empty states when no data", async () => {
    mockGet.mockResolvedValue({ data: [] });

    render(
      <ToastProvider>
        <ConfirmProvider>
          <BoardRankings />
        </ConfirmProvider>
      </ToastProvider>
    );

    expect(await screen.findByText("Chưa có dữ liệu xếp hạng.")).toBeInTheDocument();
    expect(
      screen.getByText("Chưa có kỳ bình chọn nào đang mở.")
    ).toBeInTheDocument();
  });

  it("handles API errors gracefully", async () => {
    mockGet.mockRejectedValue(new Error("Network error"));

    render(
      <ToastProvider>
        <ConfirmProvider>
          <BoardRankings />
        </ConfirmProvider>
      </ToastProvider>
    );

    expect(
      await screen.findByText("Không thể tải dữ liệu. Vui lòng thử lại.")
    ).toBeInTheDocument();
  });
});
