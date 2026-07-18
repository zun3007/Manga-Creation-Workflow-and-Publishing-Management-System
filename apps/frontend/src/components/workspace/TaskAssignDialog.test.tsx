import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { vi } from "vitest";
import { TaskAssignDialog } from "./TaskAssignDialog";

const { apiGet, apiPost, apiDelete } = vi.hoisted(() => ({
  apiGet: vi.fn(),
  apiPost: vi.fn(),
  apiDelete: vi.fn(),
}));

vi.mock("../../lib/api", () => ({
  api: { get: apiGet, post: apiPost, delete: apiDelete },
  apiErrorMessage: (_error: unknown, fallback: string) => fallback,
}));

function localDate(offsetDays: number): string {
  const date = new Date();
  date.setDate(date.getDate() + offsetDays);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

describe("TaskAssignDialog", () => {
  beforeEach(() => {
    apiPost.mockReset();
    apiDelete.mockReset();
    apiGet.mockImplementation((url: string) => {
      if (url === "/users/assistants") {
        return Promise.resolve({
          data: [{ id: 9, name: "Mai Nguyễn", avatar: null }],
        });
      }
      return Promise.resolve({
        data: [{ regionType: "PANEL", basePrice: 25000 }],
      });
    });
  });

  it("sets today as the earliest deadline and rejects a manually injected past date", async () => {
    render(
      <TaskAssignDialog
        region={{
          id: 12,
          type: "PANEL" as any,
          x: 0,
          y: 0,
          width: 100,
          height: 100,
        }}
        onClose={vi.fn()}
      />,
    );

    await screen.findByText("Mai Nguyễn");

    const deadline = screen.getByLabelText(/hạn chót/i) as HTMLInputElement;
    expect(deadline.min).toBe(localDate(0));

    fireEvent.change(deadline, { target: { value: localDate(-1) } });
    fireEvent.click(screen.getByRole("button", { name: /^giao việc$/i }));

    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent(
        /không được là ngày trong quá khứ/i,
      ),
    );
    expect(apiPost).not.toHaveBeenCalled();
  });
});
