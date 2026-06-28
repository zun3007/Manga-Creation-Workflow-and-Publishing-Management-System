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
  fireEvent.change(screen.getByRole('textbox'), { target: { value: code } });
}

describe('TwoFactorChallenge', () => {
  beforeEach(() => {
    verifyTwoFactor.mockReset().mockResolvedValue(undefined);
    resendOtp.mockReset().mockResolvedValue({ ok: true, cooldownSeconds: 60 });
  });

  it('shows the masked email and one stable code input', () => {
    render(
      <TwoFactorChallenge challenge={challenge} onVerified={vi.fn()} onBack={vi.fn()} />,
    );
    expect(screen.getByText('d•••@example.com')).toBeInTheDocument();
    expect(screen.getAllByRole('textbox')).toHaveLength(1);
    expect(screen.getByLabelText('Mã xác thực 6 chữ số')).toBeInTheDocument();
    expect(screen.getAllByTestId('otp-digit-box')).toHaveLength(6);
  });

  it('keeps focus in one OTP input while typing consecutive digits', () => {
    render(
      <TwoFactorChallenge challenge={challenge} onVerified={vi.fn()} onBack={vi.fn()} />,
    );
    const textboxes = screen.getAllByRole('textbox') as HTMLInputElement[];
    expect(textboxes).toHaveLength(1);
    const input = textboxes[0];

    input.focus();
    fireEvent.change(input, { target: { value: '1' } });
    fireEvent.change(input, { target: { value: '12' } });

    expect(input.value).toBe('12');
    expect(document.activeElement).toBe(input);
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

  it('accepts multi-character OTP input in the same field', () => {
    render(
      <TwoFactorChallenge challenge={challenge} onVerified={vi.fn()} onBack={vi.fn()} />,
    );
    const input = screen.getByRole('textbox') as HTMLInputElement;

    input.focus();
    fireEvent.change(input, { target: { value: '12' } });

    expect(input.value).toBe('12');
    expect(document.activeElement).toBe(input);
  });

  it('preserves previous digits when typing single characters quickly', () => {
    render(
      <TwoFactorChallenge challenge={challenge} onVerified={vi.fn()} onBack={vi.fn()} />,
    );
    const input = screen.getByRole('textbox') as HTMLInputElement;

    input.focus();
    fireEvent.change(input, { target: { value: '1' } });
    fireEvent.change(input, { target: { value: '12' } });
    fireEvent.change(input, { target: { value: '123' } });

    expect(input.value).toBe('123');
    expect(document.activeElement).toBe(input);
  });

  it('sanitizes non-digits without moving focus', () => {
    render(
      <TwoFactorChallenge challenge={challenge} onVerified={vi.fn()} onBack={vi.fn()} />,
    );
    const input = screen.getByRole('textbox') as HTMLInputElement;

    input.focus();
    fireEvent.change(input, { target: { value: '1a2b3c' } });

    expect(input.value).toBe('123');
    expect(document.activeElement).toBe(input);
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
    expect((screen.getByRole('textbox') as HTMLInputElement).value).toBe('');
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
