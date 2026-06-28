import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ToastProvider } from "../../components/ui/Toast";
import PublicationSchedule from "./PublicationSchedule";

const mockGet = vi.fn();
const mockPost = vi.fn();
const mockPatch = vi.fn();

vi.mock("../../lib/api", () => ({
  apiErrorMessage: (_err: unknown, fallback: string) => fallback,
  api: {
    get: (url: string) => mockGet(url),
    post: (url: string, body: unknown) => mockPost(url, body),
    patch: (url: string) => mockPatch(url),
  },
}));

describe("PublicationSchedule", () => {
  beforeEach(() => {
    mockGet.mockReset();
    mockPost.mockReset();
    mockPatch.mockReset();

    mockGet.mockImplementation((url: string) => {
      if (url === "/publication-schedules") {
        return Promise.resolve({
          data: [
            {
              id: 1,
              chapterId: 10,
              chapterNumber: 2,
              chapterTitle: "The First Battle",
              seriesId: 5,
              seriesTitle: "Dragon Hunter",
              releaseDate: "2026-07-01",
              status: "SCHEDULED",
            },
          ],
        });
      }
      if (url === "/publication-schedules/eligible-chapters") {
        return Promise.resolve({
          data: [
            {
              id: 11,
              number: 3,
              title: "Into The Forest",
              seriesId: 5,
              seriesTitle: "Dragon Hunter",
            },
          ],
        });
      }
      return Promise.resolve({ data: [] });
    });

    mockPost.mockResolvedValue({ data: { id: 2 } });
    mockPatch.mockResolvedValue({ data: { ok: true } });
  });

  it("loads publication schedules from the API", async () => {
    render(
      <ToastProvider>
        <PublicationSchedule />
      </ToastProvider>,
    );

    expect((await screen.findAllByText("Dragon Hunter")).length).toBeGreaterThan(0);
    expect(screen.getByText("Chapter 2 - The First Battle")).toBeInTheDocument();
    expect(screen.getByText("2026-07-01")).toBeInTheDocument();
  });

  it("creates a publication schedule through the API", async () => {
    render(
      <ToastProvider>
        <PublicationSchedule />
      </ToastProvider>,
    );

    const seriesSelect = await screen.findByLabelText(/series/i);
    fireEvent.change(seriesSelect, { target: { value: "5" } });

    const chapterSelect = screen.getByLabelText(/chapter/i);
    fireEvent.change(chapterSelect, { target: { value: "11" } });
    fireEvent.change(screen.getByLabelText(/release date/i), {
      target: { value: "2026-07-08" },
    });
    fireEvent.click(screen.getByRole("button", { name: /create schedule/i }));

    await waitFor(() =>
      expect(mockPost).toHaveBeenCalledWith("/publication-schedules", {
        chapterId: 11,
        releaseDate: "2026-07-08",
      }),
    );
  });
});
