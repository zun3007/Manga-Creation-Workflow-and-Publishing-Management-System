import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { Header } from "./Header";

// Mock api module
vi.mock("../../lib/api", () => ({
  api: {
    get: vi.fn().mockResolvedValue({ data: [] }),
    patch: vi.fn().mockResolvedValue({}),
  },
}));

// Mock auth module
vi.mock("../../lib/auth", () => ({
  useAuth: () => ({
    user: {
      id: 1,
      email: "test@example.com",
      name: "Test User",
      role: "MANGAKA",
      avatarUrl: null,
    },
    logout: vi.fn(),
  }),
}));

describe("Header", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders logout button", async () => {
    render(
      <MemoryRouter>
        <Header />
      </MemoryRouter>
    );
    const logoutBtn = await screen.findByLabelText("logout");
    expect(logoutBtn).toBeTruthy();
  });

  it("renders notifications button", async () => {
    render(
      <MemoryRouter>
        <Header />
      </MemoryRouter>
    );
    const notificationsBtn = await screen.findByLabelText(/notifications/);
    expect(notificationsBtn).toBeTruthy();
  });

  it("displays user name", async () => {
    render(
      <MemoryRouter>
        <Header />
      </MemoryRouter>
    );
    const userName = await screen.findByText("Test User");
    expect(userName).toBeTruthy();
  });

  it("displays default title when not provided", async () => {
    render(
      <MemoryRouter>
        <Header />
      </MemoryRouter>
    );
    const title = await screen.findByText("Manga Studio");
    expect(title).toBeTruthy();
  });

  it("displays custom title when provided", async () => {
    render(
      <MemoryRouter>
        <Header title="My Custom Title" />
      </MemoryRouter>
    );
    const title = await screen.findByText("My Custom Title");
    expect(title).toBeTruthy();
  });
});
