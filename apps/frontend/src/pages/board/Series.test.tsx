import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import { ConfirmProvider } from "../../lib/confirm";
import { ToastProvider } from "../../components/ui/Toast";
import BoardSeries from "./Series";

const mockGet = vi.fn();
const mockPut = vi.fn();
const mockDelete = vi.fn();

vi.mock("../../lib/api", () => ({
  apiErrorMessage: (_err: unknown, fallback: string) => fallback,
  api: {
    get: (url: string) => mockGet(url),
    put: (url: string, body: unknown) => mockPut(url, body),
    delete: (url: string) => mockDelete(url),
  },
}));

describe("BoardSeries", () => {
  beforeEach(() => {
    mockGet.mockClear();
    mockPut.mockClear();
    mockDelete.mockClear();

    // Set up default mocks
    mockGet.mockImplementation((url: string) => {
      if (url === "/users/editors") {
        return Promise.resolve({
          data: [{ id: 5, name: "Editor A", avatar: null }],
        });
      }
      if (url === "/series/all") {
        return Promise.resolve({
          data: [
            {
              id: 1,
              title: "Series X",
              frequency: "WEEKLY",
              status: "ACTIVE",
              mangakaUserId: 2,
              mangaka: "Mangaka B",
              chapters: 3,
              editorUserId: null,
              editor: null,
            },
          ],
        });
      }
      return Promise.reject(new Error("Unknown URL"));
    });

    mockPut.mockResolvedValue({});
    mockDelete.mockResolvedValue({});
  });

  it("lists series and assigns an editor", async () => {
    render(
      <BrowserRouter>
        <ToastProvider>
          <ConfirmProvider>
            <BoardSeries />
          </ConfirmProvider>
        </ToastProvider>
      </BrowserRouter>
    );
    expect(await screen.findByText("Series X")).toBeTruthy();
    const sel = await screen.findByRole("combobox");
    fireEvent.change(sel, { target: { value: "5" } });
    await waitFor(() =>
      expect(mockPut).toHaveBeenCalledWith("/series/1/editor", {
        editorUserId: 5,
      })
    );
  });
});
