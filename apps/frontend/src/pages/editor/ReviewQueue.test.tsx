import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach } from "vitest";
import { ToastProvider } from "../../components/ui/Toast";

const mockGet = vi.fn();
const mockPatch = vi.fn();
const mockNavigate = vi.fn();

vi.mock("../../lib/api", () => ({
  api: {
    get: (...args: unknown[]) => mockGet(...args),
    patch: (...args: unknown[]) => mockPatch(...args),
  },
}));

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

import ReviewQueue from "./ReviewQueue";

describe("ReviewQueue", () => {
  beforeEach(() => {
    mockGet.mockClear();
    mockPatch.mockClear();
    mockNavigate.mockClear();
  });

  it("lists a chapter and approves it", async () => {
    mockGet.mockResolvedValue({
      data: [
        {
          id: 7,
          number: 3,
          title: "Khởi đầu",
          status: "READY_FOR_EDITOR_REVIEW",
          deadline: null,
          seriesId: 1,
          series: "Series A",
          pages: 12,
        },
      ],
    });
    mockPatch.mockResolvedValue({});

    render(
      <ToastProvider>
        <ReviewQueue />
      </ToastProvider>
    );

    // Wait for the chapter title to appear
    expect(await screen.findByText(/Khởi đầu/)).toBeTruthy();

    // Click the "Duyệt" button
    const approveButton = screen.getByText("Duyệt");
    fireEvent.click(approveButton);

    // Verify the patch was called with the correct parameters
    await waitFor(() =>
      expect(mockPatch).toHaveBeenCalledWith(
        "/chapters/7/editor-review",
        expect.objectContaining({ decision: "APPROVE" })
      )
    );

    // Verify success toast appears
    await waitFor(() =>
      expect(screen.getByText("Đã duyệt chương.")).toBeInTheDocument()
    );
  });

  it("renders empty state when no chapters", async () => {
    mockGet.mockResolvedValue({ data: [] });

    render(
      <ToastProvider>
        <ReviewQueue />
      </ToastProvider>
    );

    expect(
      await screen.findByText("Không có chương nào chờ duyệt.")
    ).toBeTruthy();
  });

  it("shows error message on load failure", async () => {
    mockGet.mockRejectedValue(new Error("Network error"));

    render(
      <ToastProvider>
        <ReviewQueue />
      </ToastProvider>
    );

    expect(
      await screen.findByText(
        "Không thể tải danh sách chương cần duyệt. Vui lòng thử lại."
      )
    ).toBeTruthy();
  });

  it("opens feedback form when requesting revision", async () => {
    mockGet.mockResolvedValue({
      data: [
        {
          id: 7,
          number: 3,
          title: "Khởi đầu",
          status: "READY_FOR_EDITOR_REVIEW",
          deadline: null,
          seriesId: 1,
          series: "Series A",
          pages: 12,
        },
      ],
    });

    render(
      <ToastProvider>
        <ReviewQueue />
      </ToastProvider>
    );

    await screen.findByText(/Khởi đầu/);

    // Click the "Yêu cầu sửa" button
    const reviseButton = screen.getByText("Yêu cầu sửa");
    fireEvent.click(reviseButton);

    // Verify the textarea appears
    expect(screen.getByPlaceholderText("Nhập phản hồi chi tiết...")).toBeTruthy();
  });

  it("submits revision with feedback", async () => {
    mockGet.mockResolvedValue({
      data: [
        {
          id: 7,
          number: 3,
          title: "Khởi đầu",
          status: "READY_FOR_EDITOR_REVIEW",
          deadline: null,
          seriesId: 1,
          series: "Series A",
          pages: 12,
        },
      ],
    });
    mockPatch.mockResolvedValue({});

    render(
      <ToastProvider>
        <ReviewQueue />
      </ToastProvider>
    );

    await screen.findByText(/Khởi đầu/);

    // Click "Yêu cầu sửa"
    const reviseButton = screen.getByText("Yêu cầu sửa");
    fireEvent.click(reviseButton);

    // Fill in feedback
    const textarea = screen.getByPlaceholderText("Nhập phản hồi chi tiết...");
    fireEvent.change(textarea, { target: { value: "Cần sửa chất lượng ảnh" } });

    // Click confirm
    const confirmButton = screen.getByText("Xác nhận");
    fireEvent.click(confirmButton);

    // Verify the patch was called with correct parameters
    await waitFor(() =>
      expect(mockPatch).toHaveBeenCalledWith(
        "/chapters/7/editor-review",
        expect.objectContaining({
          decision: "REVISE",
          feedback: "Cần sửa chất lượng ảnh",
        })
      )
    );

    // Verify success toast appears
    await waitFor(() =>
      expect(screen.getByText("Đã gửi yêu cầu sửa.")).toBeInTheDocument()
    );
  });
});
