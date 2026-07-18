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

const { apiPost } = vi.hoisted(() => ({ apiPost: vi.fn() }));

vi.mock("../lib/api", () => ({
  api: { post: apiPost },
  googleLoginUrl: "/api/auth/google",
  apiErrorMessage: (error: any, fallback: string) =>
    error?.response?.data?.message ?? fallback,
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

describe("Login — forgot password frontend flow", () => {
  beforeEach(() => {
    apiPost.mockReset();
  });

  it("moves from email to OTP and then to the new password form", async () => {
    apiPost
      .mockResolvedValueOnce({
        data: { challengeToken: "forgot.jwt", devCode: "123456" },
      })
      .mockResolvedValueOnce({ data: { resetToken: "reset.jwt" } })
      .mockResolvedValueOnce({ data: { ok: true } });

    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole("button", { name: /quên mật khẩu/i }));
    expect(screen.getByRole("heading", { name: /quên mật khẩu/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /gửi otp/i }));

    await waitFor(() =>
      expect(screen.getByRole("heading", { name: /nhập mã otp/i })).toBeInTheDocument(),
    );
    expect(screen.getAllByTestId("forgot-otp-digit-box")).toHaveLength(6);
    fireEvent.change(screen.getByLabelText("Mã OTP"), {
      target: { value: "123456" },
    });
    fireEvent.click(screen.getByRole("button", { name: /xác nhận otp/i }));

    await waitFor(() =>
      expect(screen.getByRole("heading", { name: /cập nhật mật khẩu/i })).toBeInTheDocument(),
    );
    expect(apiPost).toHaveBeenNthCalledWith(2, "/auth/password/forgot/verify", {
      challengeToken: "forgot.jwt",
      code: "123456",
    });
    expect(screen.getByLabelText(/^mật khẩu mới$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^xác nhận mật khẩu mới$/i)).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/^mật khẩu mới$/i), {
      target: { value: "NewPassword123!" },
    });
    fireEvent.change(screen.getByLabelText(/^xác nhận mật khẩu mới$/i), {
      target: { value: "NewPassword123!" },
    });
    fireEvent.click(screen.getByRole("button", { name: /^cập nhật mật khẩu$/i }));

    await waitFor(() =>
      expect(screen.getByText(/mật khẩu đã cập nhật/i)).toBeInTheDocument(),
    );
    expect(apiPost).toHaveBeenNthCalledWith(3, "/auth/password/reset", {
      resetToken: "reset.jwt",
      newPassword: "NewPassword123!",
    });
  });

  it("validates the OTP and matching passwords", async () => {
    apiPost
      .mockResolvedValueOnce({ data: { challengeToken: "forgot.jwt" } })
      .mockRejectedValueOnce({
        response: { data: { message: "Mã OTP không đúng." } },
      })
      .mockResolvedValueOnce({ data: { resetToken: "reset.jwt" } });

    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole("button", { name: /quên mật khẩu/i }));
    fireEvent.click(screen.getByRole("button", { name: /gửi otp/i }));

    await waitFor(() =>
      expect(screen.getByRole("heading", { name: /nhập mã otp/i })).toBeInTheDocument(),
    );

    fireEvent.change(screen.getByLabelText("Mã OTP"), {
      target: { value: "111111" },
    });
    fireEvent.click(screen.getByRole("button", { name: /xác nhận otp/i }));
    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent(/otp không đúng/i),
    );

    fireEvent.change(screen.getByLabelText("Mã OTP"), {
      target: { value: "123456" },
    });
    fireEvent.click(screen.getByRole("button", { name: /xác nhận otp/i }));

    await waitFor(() =>
      expect(screen.getByRole("heading", { name: /cập nhật mật khẩu/i })).toBeInTheDocument(),
    );

    fireEvent.change(screen.getByLabelText(/^mật khẩu mới$/i), {
      target: { value: "NewPassword123!" },
    });
    fireEvent.change(screen.getByLabelText(/^xác nhận mật khẩu mới$/i), {
      target: { value: "Different123!" },
    });
    fireEvent.click(screen.getByRole("button", { name: /^cập nhật mật khẩu$/i }));
    expect(screen.getByRole("alert")).toHaveTextContent(/không khớp/i);
  });
});
