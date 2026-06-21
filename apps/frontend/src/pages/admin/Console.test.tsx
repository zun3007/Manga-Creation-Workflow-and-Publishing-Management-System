import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import { ConfirmProvider } from "../../lib/confirm";
import { ToastProvider } from "../../components/ui/Toast";
import Console from "./Console";

const mockGet = vi.fn();
const mockPatch = vi.fn();

vi.mock("../../lib/api", async (importOriginal) => ({
  // Keep the real helpers (apiErrorMessage, ...) — only the HTTP layer is mocked.
  ...(await importOriginal<typeof import("../../lib/api")>()),
  api: {
    get: (url: string) => mockGet(url),
    patch: (url: string, body: unknown) => mockPatch(url, body),
  },
}));

describe("Console", () => {
  beforeEach(() => {
    mockGet.mockClear();
    mockPatch.mockClear();

    // Set up default mocks
    mockGet.mockImplementation((url: string) => {
      if (url === "/admin/overview") {
        return Promise.resolve({
          data: {
            users: 3,
            mangaka: 1,
            assistants: 1,
            editors: 1,
            series: 2,
            chapters: 5,
            proposals: 1,
            openTasks: 4,
          },
        });
      }
      if (url === "/admin/users") {
        return Promise.resolve({
          data: [
            {
              id: 9,
              email: "user@example.io",
              name: "Người Dùng Kiểm Thử",
              role: "ASSISTANT",
              isActivated: 1,
              authProvider: "LOCAL",
              createdAt: "2026-01-01",
            },
          ],
        });
      }
      return Promise.reject(new Error("Unknown URL"));
    });

    mockPatch.mockResolvedValue({});
  });

  it("renders overview cards with stats", async () => {
    render(
      <BrowserRouter>
        <ToastProvider>
          <ConfirmProvider>
            <Console />
          </ConfirmProvider>
        </ToastProvider>
      </BrowserRouter>
    );

    expect(await screen.findByText("Quản trị hệ thống")).toBeTruthy();
    expect(await screen.findByText("Người dùng")).toBeTruthy();
    expect(screen.getByText("3")).toBeTruthy(); // users count
  });

  it("renders a user row with name and email", async () => {
    render(
      <BrowserRouter>
        <ToastProvider>
          <ConfirmProvider>
            <Console />
          </ConfirmProvider>
        </ToastProvider>
      </BrowserRouter>
    );

    expect(await screen.findByText("Người Dùng Kiểm Thử")).toBeTruthy();
    expect(screen.getByText("user@example.io")).toBeTruthy();
  });

  it("changes user role via select and calls api.patch", async () => {
    render(
      <BrowserRouter>
        <ToastProvider>
          <ConfirmProvider>
            <Console />
          </ConfirmProvider>
        </ToastProvider>
      </BrowserRouter>
    );

    // Wait for the user row to appear
    await screen.findByText("Người Dùng Kiểm Thử");

    // Find the select (it should show "Trợ lý" / ASSISTANT)
    const selects = screen.getAllByRole("combobox");
    expect(selects.length).toBeGreaterThan(0);
    const roleSelect = selects[0];

    // Change to a different role
    fireEvent.change(roleSelect, { target: { value: "TANTOU_EDITOR" } });

    // Verify api.patch was called
    await waitFor(() => {
      expect(mockPatch).toHaveBeenCalledWith(
        "/admin/users/9",
        expect.objectContaining({ role: "TANTOU_EDITOR" })
      );
    });
  });

  it("toggles user activation status via button", async () => {
    render(
      <BrowserRouter>
        <ToastProvider>
          <ConfirmProvider>
            <Console />
          </ConfirmProvider>
        </ToastProvider>
      </BrowserRouter>
    );

    await screen.findByText("Người Dùng Kiểm Thử");

    // Find the button that says "Khoá" (since isActivated is 1/true)
    const buttons = screen.getAllByRole("button");
    const lockButton = buttons.find((btn) => btn.textContent?.includes("Khoá"));
    expect(lockButton).toBeTruthy();

    fireEvent.click(lockButton!);

    // Confirm the styled confirm dialog
    fireEvent.click(await screen.findByText("Xác nhận"));

    // Verify api.patch was called with isActivated: false
    await waitFor(() => {
      expect(mockPatch).toHaveBeenCalledWith(
        "/admin/users/9",
        expect.objectContaining({ isActivated: false })
      );
    });
  });

  it("displays action error when patch fails", async () => {
    mockPatch.mockRejectedValueOnce({
      // Make axios.isAxiosError() recognize this mock so apiErrorMessage
      // extracts the server-provided message (axios v1 checks this flag).
      isAxiosError: true,
      response: {
        data: {
          message: "Không thể khoá admin cuối cùng.",
        },
      },
    });

    render(
      <BrowserRouter>
        <ToastProvider>
          <ConfirmProvider>
            <Console />
          </ConfirmProvider>
        </ToastProvider>
      </BrowserRouter>
    );

    await screen.findByText("Người Dùng Kiểm Thử");

    const buttons = screen.getAllByRole("button");
    const lockButton = buttons.find((btn) => btn.textContent?.includes("Khoá"));
    fireEvent.click(lockButton!);

    // Confirm the styled confirm dialog
    fireEvent.click(await screen.findByText("Xác nhận"));

    expect(
      await screen.findByText("Không thể khoá admin cuối cùng.")
    ).toBeTruthy();
  });

  it("shows empty state when no users", async () => {
    mockGet.mockImplementation((url: string) => {
      if (url === "/admin/overview") {
        return Promise.resolve({
          data: { users: 0 },
        });
      }
      if (url === "/admin/users") {
        return Promise.resolve({ data: [] });
      }
      return Promise.reject(new Error("Unknown URL"));
    });

    render(
      <BrowserRouter>
        <ToastProvider>
          <ConfirmProvider>
            <Console />
          </ConfirmProvider>
        </ToastProvider>
      </BrowserRouter>
    );

    expect(await screen.findByText("Chưa có người dùng.")).toBeTruthy();
  });
});
