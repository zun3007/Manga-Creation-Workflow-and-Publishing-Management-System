import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Login from "./Login";

const { login, completeInitialPassword, verifyTwoFactor, resendOtp } =
  vi.hoisted(() => ({
    login: vi.fn(),
    completeInitialPassword: vi.fn(),
    verifyTwoFactor: vi.fn(),
    resendOtp: vi.fn(),
  }));

vi.mock("../lib/auth", () => ({
  useAuth: () => ({
    login,
    completeInitialPassword,
    verifyTwoFactor,
    resendOtp,
    user: null,
  }),
}));

describe("Login — 2FA branch", () => {
  beforeEach(() => {
    login.mockReset();
    verifyTwoFactor.mockReset().mockResolvedValue(undefined);
    resendOtp.mockReset().mockResolvedValue({ ok: true, cooldownSeconds: 60 });
  });

  it("switches to the OTP step when login returns twoFactorRequired", async () => {
    login.mockResolvedValue({
      twoFactorRequired: true,
      challengeToken: "ch.jwt",
      emailMasked: "d•••@example.com",
      expiresIn: 600,
    });

    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>,
    );

    // default demo credentials are prefilled — just submit
    fireEvent.click(screen.getByRole("button", { name: /đăng nhập/i }));

    await waitFor(() => expect(login).toHaveBeenCalled());
    await waitFor(() =>
      expect(screen.getByText(/nhập mã xác thực/i)).toBeInTheDocument(),
    );
    expect(screen.getByText("d•••@example.com")).toBeInTheDocument();
    expect(screen.getAllByRole("textbox")).toHaveLength(1);
    expect(screen.getByLabelText("Mã xác thực 6 chữ số")).toBeInTheDocument();
  });
});

describe("Login — initial password branch", () => {
  beforeEach(() => {
    login.mockReset();
    completeInitialPassword.mockReset();
    verifyTwoFactor.mockReset().mockResolvedValue(undefined);
    resendOtp.mockReset().mockResolvedValue({
      ok: true,
      cooldownSeconds: 60,
    });
  });

  it("requires a new password and then continues to 2FA", async () => {
    login.mockResolvedValue({
      passwordChangeRequired: true,
      challengeToken: "password-change.jwt",
      expiresIn: 900,
    });

    completeInitialPassword.mockResolvedValue({
      twoFactorRequired: true,
      challengeToken: "otp.jwt",
      emailMasked: "d•••@example.com",
      expiresIn: 600,
    });

    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>,
    );

    fireEvent.click(
      screen.getByRole("button", {
        name: /đăng nhập/i,
      }),
    );

    await waitFor(() =>
      expect(screen.getByText(/đổi mật khẩu ban đầu/i)).toBeInTheDocument(),
    );

    fireEvent.change(screen.getByLabelText(/^mật khẩu mới$/i), {
      target: {
        value: "NewPassword123!",
      },
    });

    fireEvent.change(screen.getByLabelText(/^xác nhận mật khẩu mới$/i), {
      target: {
        value: "NewPassword123!",
      },
    });

    fireEvent.click(
      screen.getByRole("button", {
        name: /đổi mật khẩu và tiếp tục/i,
      }),
    );

    await waitFor(() =>
      expect(completeInitialPassword).toHaveBeenCalledWith(
        "password-change.jwt",
        "NewPassword123!",
      ),
    );

    await waitFor(() =>
      expect(screen.getByText(/nhập mã xác thực/i)).toBeInTheDocument(),
    );

    expect(screen.getByText("d•••@example.com")).toBeInTheDocument();
  });
});
