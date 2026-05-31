import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach } from "vitest";

const mockGet = vi.fn();
const mockPost = vi.fn();
const mockPatch = vi.fn();
const mockNavigate = vi.fn();

vi.mock("../../lib/api", () => ({
  api: {
    get: (...args: unknown[]) => mockGet(...args),
    post: (...args: unknown[]) => mockPost(...args),
    patch: (...args: unknown[]) => mockPatch(...args),
  },
}));

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useParams: () => ({ chapterId: "8" }),
    useNavigate: () => mockNavigate,
  };
});

import ChapterReview from "./ChapterReview";

describe("ChapterReview", () => {
  beforeEach(() => {
    mockGet.mockClear();
    mockPost.mockClear();
    mockPatch.mockClear();
    mockNavigate.mockClear();
  });

  it("renders page image and allows adding annotation", async () => {
    mockGet
      .mockResolvedValueOnce({
        data: [
          {
            id: 50,
            number: 1,
            status: "IN_PROGRESS",
            imageUrl: "/test-page.png",
          },
        ],
      })
      .mockResolvedValueOnce({
        data: [],
      });
    mockPost.mockResolvedValue({});

    render(<ChapterReview />);

    // Wait for page to load
    const img = await screen.findByRole("img");
    expect(img).toBeTruthy();
    expect(img.getAttribute("src")).toBe("/test-page.png");
  });

  it("opens annotation form when image is clicked", async () => {
    mockGet
      .mockResolvedValueOnce({
        data: [
          {
            id: 50,
            number: 1,
            status: "IN_PROGRESS",
            imageUrl: "/test-page.png",
          },
        ],
      })
      .mockResolvedValueOnce({
        data: [],
      });

    render(<ChapterReview />);

    const img = await screen.findByRole("img");
    fireEvent.click(img);

    // Check that form appears
    const categorySelect = await screen.findByRole("combobox");
    expect(categorySelect).toBeTruthy();

    const textarea = screen.getByPlaceholderText("Nhập nội dung góp ý...");
    expect(textarea).toBeTruthy();
  });

  it("submits annotation with correct payload", async () => {
    mockGet
      .mockResolvedValueOnce({
        data: [
          {
            id: 50,
            number: 1,
            status: "IN_PROGRESS",
            imageUrl: "/test-page.png",
          },
        ],
      })
      .mockResolvedValueOnce({
        data: [],
      });
    mockPost.mockResolvedValue({});

    render(<ChapterReview />);

    const img = await screen.findByRole("img");
    fireEvent.click(img);

    // Fill form
    const textarea = await screen.findByPlaceholderText("Nhập nội dung góp ý...");
    fireEvent.change(textarea, { target: { value: "Cần cải thiện chất lượng" } });

    // Submit
    const saveButton = screen.getByText("Lưu góp ý");
    fireEvent.click(saveButton);

    // Verify API call
    await waitFor(() =>
      expect(mockPost).toHaveBeenCalledWith(
        "/annotations",
        expect.objectContaining({
          targetType: "PAGE",
          targetId: 50,
          category: "GENERAL",
          context: "Cần cải thiện chất lượng",
          x: expect.any(Number),
          y: expect.any(Number),
        })
      )
    );
  });

  it("approves chapter and navigates back", async () => {
    mockGet
      .mockResolvedValueOnce({
        data: [
          {
            id: 50,
            number: 1,
            status: "IN_PROGRESS",
            imageUrl: "/test-page.png",
          },
        ],
      })
      .mockResolvedValueOnce({
        data: [],
      });
    mockPatch.mockResolvedValue({});

    render(<ChapterReview />);

    await screen.findByRole("img");

    const approveButton = screen.getByText("Duyệt chương");
    fireEvent.click(approveButton);

    await waitFor(() =>
      expect(mockPatch).toHaveBeenCalledWith("/chapters/8/editor-review", {
        decision: "APPROVE",
      })
    );

    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith("/editor/review"));
  });

  it("shows empty state when chapter has no pages", async () => {
    mockGet.mockResolvedValue({ data: [] });

    render(<ChapterReview />);

    expect(
      await screen.findByText("Chương chưa có trang.")
    ).toBeTruthy();
  });

  it("shows error message on load failure", async () => {
    mockGet.mockRejectedValueOnce(new Error("Network error"));

    render(<ChapterReview />);

    expect(
      await screen.findByText("Không thể tải trang của chương. Vui lòng thử lại.")
    ).toBeTruthy();
  });

  it("resolves annotation when mark as resolved button clicked", async () => {
    mockGet
      .mockResolvedValueOnce({
        data: [
          {
            id: 50,
            number: 1,
            status: "IN_PROGRESS",
            imageUrl: "/test-page.png",
          },
        ],
      })
      .mockResolvedValueOnce({
        data: [
          {
            id: 100,
            targetType: "PAGE",
            targetId: 50,
            category: "VISUAL_ISSUE",
            context: "Ảnh mờ",
            x: 50,
            y: 50,
            isResolved: 0,
            createdAt: "2026-05-31T10:00:00Z",
          },
        ],
      });
    mockPatch.mockResolvedValue({});

    render(<ChapterReview />);

    await screen.findByRole("img");

    const resolveButton = await screen.findByText("Đã xử lý");
    fireEvent.click(resolveButton);

    await waitFor(() =>
      expect(mockPatch).toHaveBeenCalledWith("/annotations/100/resolve")
    );
  });

  it("opens revise form and submits with feedback", async () => {
    mockGet
      .mockResolvedValueOnce({
        data: [
          {
            id: 50,
            number: 1,
            status: "IN_PROGRESS",
            imageUrl: "/test-page.png",
          },
        ],
      })
      .mockResolvedValueOnce({
        data: [],
      });
    mockPatch.mockResolvedValue({});

    render(<ChapterReview />);

    await screen.findByRole("img");

    const reviseButton = screen.getByText("Yêu cầu sửa");
    fireEvent.click(reviseButton);

    const feedbackTextarea = await screen.findByPlaceholderText(
      "Nhập phản hồi chi tiết..."
    );
    fireEvent.change(feedbackTextarea, {
      target: { value: "Cần sửa lại các trang 1-5" },
    });

    const submitButton = screen.getByText("Yêu cầu sửa");
    fireEvent.click(submitButton);

    await waitFor(() =>
      expect(mockPatch).toHaveBeenCalledWith(
        "/chapters/8/editor-review",
        expect.objectContaining({
          decision: "REVISE",
          feedback: "Cần sửa lại các trang 1-5",
        })
      )
    );

    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith("/editor/review"));
  });
});
