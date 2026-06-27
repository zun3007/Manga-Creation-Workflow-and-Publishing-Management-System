import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import type { TwoFactorRequired } from '@manga/shared';
import { TwoFactorChallenge } from './TwoFactorChallenge';

const { verifyTwoFactor, resendOtp } = vi.hoisted(() => ({
  verifyTwoFactor: vi.fn(),
  resendOtp: vi.fn(),
}));

vi.mock('../../lib/auth', () => ({
  useAuth: () => ({ verifyTwoFactor, resendOtp }),
}));

const challenge: TwoFactorRequired = {
  twoFactorRequired: true,
  challengeToken: 'ch.jwt',
  emailMasked: 'd•••@example.com',
  expiresIn: 600,
};

function fill(code: string) {
  const inputs = screen.getAllByRole('textbox');
  for (let i = 0; i < code.length; i++) {
    fireEvent.change(inputs[i], { target: { value: code[i] } });
  }
}

describe('TwoFactorChallenge', () => {
  beforeEach(() => {
    verifyTwoFactor.mockReset().mockResolvedValue(undefined);
    resendOtp.mockReset().mockResolvedValue({ ok: true, cooldownSeconds: 60 });
  });

  it('shows the masked email and six code inputs', () => {
    render(
      <TwoFactorChallenge challenge={challenge} onVerified={vi.fn()} onBack={vi.fn()} />,
    );
    expect(screen.getByText('d•••@example.com')).toBeInTheDocument();
    expect(screen.getAllByRole('textbox')).toHaveLength(6);
  });

  it('auto-submits when all six digits are entered and calls onVerified', async () => {
    const onVerified = vi.fn();
    render(
      <TwoFactorChallenge challenge={challenge} onVerified={onVerified} onBack={vi.fn()} />,
    );
    fill('123456');
    await waitFor(() =>
      expect(verifyTwoFactor).toHaveBeenCalledWith('ch.jwt', '123456'),
    );
    await waitFor(() => expect(onVerified).toHaveBeenCalled());
  });

  it('shows an inline error and clears the inputs on a wrong code', async () => {
    verifyTwoFactor.mockRejectedValue({
      response: { data: { message: 'Mã không đúng. Còn 4 lần thử.' } },
    });
    const onVerified = vi.fn();
    render(
      <TwoFactorChallenge challenge={challenge} onVerified={onVerified} onBack={vi.fn()} />,
    );
    fill('000000');
    await waitFor(() =>
      expect(screen.getByText(/không đúng/i)).toBeInTheDocument(),
    );
    expect(onVerified).not.toHaveBeenCalled();
    // inputs reset to empty
    for (const input of screen.getAllByRole('textbox')) {
      expect((input as HTMLInputElement).value).toBe('');
    }
  });

  it('disables resend during the initial cooldown', () => {
    render(
      <TwoFactorChallenge challenge={challenge} onVerified={vi.fn()} onBack={vi.fn()} />,
    );
    const resend = screen.getByRole('button', { name: /gửi lại/i });
    expect(resend).toBeDisabled();
    expect(resend).toHaveTextContent(/gửi lại sau/i);
  });

  it('calls onBack when the back button is clicked', () => {
    const onBack = vi.fn();
    render(
      <TwoFactorChallenge challenge={challenge} onVerified={vi.fn()} onBack={onBack} />,
    );
    fireEvent.click(screen.getByRole('button', { name: /quay lại/i }));
    expect(onBack).toHaveBeenCalled();
  });
});
