import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Login from './Login';

const { login, verifyTwoFactor, resendOtp } = vi.hoisted(() => ({
  login: vi.fn(),
  verifyTwoFactor: vi.fn(),
  resendOtp: vi.fn(),
}));

vi.mock('../lib/auth', () => ({
  useAuth: () => ({ login, verifyTwoFactor, resendOtp, user: null }),
}));

describe('Login — 2FA branch', () => {
  beforeEach(() => {
    login.mockReset();
    verifyTwoFactor.mockReset().mockResolvedValue(undefined);
    resendOtp.mockReset().mockResolvedValue({ ok: true, cooldownSeconds: 60 });
  });

  it('switches to the OTP step when login returns twoFactorRequired', async () => {
    login.mockResolvedValue({
      twoFactorRequired: true,
      challengeToken: 'ch.jwt',
      emailMasked: 'd•••@example.com',
      expiresIn: 600,
    });

    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>,
    );

    // default demo credentials are prefilled — just submit
    fireEvent.click(screen.getByRole('button', { name: /đăng nhập/i }));

    await waitFor(() => expect(login).toHaveBeenCalled());
    await waitFor(() =>
      expect(screen.getByText(/nhập mã xác thực/i)).toBeInTheDocument(),
    );
    expect(screen.getByText('d•••@example.com')).toBeInTheDocument();
    expect(screen.getAllByRole('textbox')).toHaveLength(6);
  });
});
