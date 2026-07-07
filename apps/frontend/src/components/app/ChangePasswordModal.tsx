import { useCallback, useState } from 'react';
import { Eye, EyeOff, Lock } from 'lucide-react';
import { api } from '../../lib/api';
import { useToast } from '../ui/Toast';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';

const field =
  'w-full rounded-xl border border-[#4a3430] bg-[#211817] px-4 py-3 pr-12 text-sm text-[#fff8f1] outline-none transition placeholder:text-[#9d8178] focus:border-accent focus:ring-2 focus:ring-accent/25';

type PasswordFieldProps = {
  id: string;
  label: string;
  autoComplete: string;
  value: string;
  onChange: (value: string) => void;
  show: boolean;
  onToggle: () => void;
  minLength?: number;
};

function PasswordField({
  id,
  label,
  autoComplete,
  value,
  onChange,
  show,
  onToggle,
  minLength,
}: PasswordFieldProps) {
  return (
    <div className="space-y-2">
      <label
        htmlFor={id}
        className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-[#d8bbb1]"
      >
        <Lock size={14} className="text-accent" aria-hidden="true" />
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          type={show ? 'text' : 'password'}
          autoComplete={autoComplete}
          required
          minLength={minLength}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={field}
        />
        <button
          type="button"
          onClick={onToggle}
          className="absolute right-3 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-full text-[#d8bbb1] transition hover:bg-white/10 hover:text-[#fff8f1] focus:outline-none focus:ring-2 focus:ring-accent/35"
          aria-label={show ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
        >
          {show ? <EyeOff size={17} /> : <Eye size={17} />}
        </button>
      </div>
    </div>
  );
}

function getPasswordStrength(password: string) {
  if (!password) return { score: 0, label: 'Chưa nhập', width: '0%', color: 'bg-transparent' };

  let score = 0;
  if (password.length >= 8) score += 1;
  if (password.length >= 12) score += 1;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score += 1;
  if (/\d/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password)) score += 1;

  if (score <= 2) return { score, label: 'Yếu', width: '33%', color: 'bg-[#d87970]' };
  if (score <= 4) return { score, label: 'Vừa', width: '66%', color: 'bg-[#d9b45f]' };
  return { score, label: 'Mạnh', width: '100%', color: 'bg-[#76b88a]' };
}

export function ChangePasswordModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const toast = useToast();
  const [cur, setCur] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showCur, setShowCur] = useState(false);
  const [showNext, setShowNext] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const strength = getPasswordStrength(next);

  const close = useCallback(() => {
    setCur('');
    setNext('');
    setConfirm('');
    setShowCur(false);
    setShowNext(false);
    setShowConfirm(false);
    setErr('');
    onClose();
  }, [onClose]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr('');
    if (next.length < 8) return setErr('Mật khẩu mới tối thiểu 8 ký tự.');
    if (next !== confirm) return setErr('Xác nhận mật khẩu không khớp.');
    if (next === cur) return setErr('Mật khẩu mới phải khác mật khẩu hiện tại.');
    setBusy(true);
    try {
      await api.patch('/auth/password', { currentPassword: cur, newPassword: next });
      toast.success('Đổi mật khẩu thành công.');
      close();
    } catch {
      // The global axios interceptor already surfaces the server message as a toast.
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={close}
      title="Đổi mật khẩu"
      className="w-full max-w-md !border-[#3a2725] !bg-[#161110] p-7 text-[#fff8f1] shadow-2xl shadow-black/45"
    >
      <form onSubmit={submit} className="space-y-6">
        <div className="space-y-2">
          <p className="font-mono text-[0.65rem] uppercase tracking-[0.28em] text-accent/80">
            Account Security
          </p>
          <h2 className="font-[var(--font-display)] text-3xl text-[#fff8f1]">Đổi mật khẩu</h2>
          <p className="text-sm leading-6 text-[#c6aaa1]">
            Cập nhật mật khẩu để bảo vệ tài khoản trong hệ thống xuất bản.
          </p>
        </div>

        <PasswordField
          id="cur-pw"
          label="Mật khẩu hiện tại"
          autoComplete="current-password"
          value={cur}
          onChange={setCur}
          show={showCur}
          onToggle={() => setShowCur((v) => !v)}
        />

        <div className="space-y-3">
          <PasswordField
            id="new-pw"
            label="Mật khẩu mới (tối thiểu 8 ký tự)"
            autoComplete="new-password"
            value={next}
            onChange={setNext}
            show={showNext}
            onToggle={() => setShowNext((v) => !v)}
            minLength={8}
          />
          <div className="space-y-1.5" aria-live="polite">
            <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
              <div
                className={`h-full rounded-full transition-all duration-300 ${strength.color}`}
                style={{ width: strength.width }}
              />
            </div>
            <p className="text-[0.7rem] text-[#b99d95]">Độ mạnh: {strength.label}</p>
          </div>
        </div>

        <PasswordField
          id="confirm-pw"
          label="Xác nhận mật khẩu mới"
          autoComplete="new-password"
          value={confirm}
          onChange={setConfirm}
          show={showConfirm}
          onToggle={() => setShowConfirm((v) => !v)}
        />

        {err && <p className="rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-[#f0a39b]">{err}</p>}
        <div className="flex justify-end gap-3 pt-2">
          <Button
            type="button"
            variant="ghost"
            onClick={close}
            disabled={busy}
            className="!bg-transparent !text-[#ead7d0] border border-[#4a3430] px-5 hover:!bg-white/10 hover:!text-white"
          >
            Huỷ
          </Button>
          <Button
            type="submit"
            loading={busy}
            className="!bg-accent px-5 text-white shadow-lg shadow-accent/20 hover:brightness-110"
          >
            Đổi mật khẩu
          </Button>
        </div>
      </form>
    </Modal>
  );
}
