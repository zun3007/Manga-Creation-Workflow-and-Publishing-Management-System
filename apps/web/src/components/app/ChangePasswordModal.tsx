import { useState } from 'react';
import { api } from '../../lib/api';
import { useToast } from '../ui/Toast';
import { Spinner } from '../ui/Spinner';

const field =
  'w-full rounded-lg border border-line bg-bg px-3 py-2 text-sm text-ink outline-none focus:border-accent';

export function ChangePasswordModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const toast = useToast();
  const [cur, setCur] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  if (!open) return null;

  const close = () => {
    setCur('');
    setNext('');
    setConfirm('');
    setErr('');
    onClose();
  };

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
    <div
      className="fixed inset-0 z-[900] grid place-items-center bg-black/40 p-4"
      onClick={close}
      role="dialog"
      aria-modal="true"
      aria-label="Đổi mật khẩu"
    >
      <form
        onClick={(e) => e.stopPropagation()}
        onSubmit={submit}
        className="w-full max-w-sm space-y-4 rounded-2xl border border-line bg-surface p-6 shadow-xl"
      >
        <h2 className="text-lg font-semibold text-ink">Đổi mật khẩu</h2>
        <div className="space-y-1">
          <label htmlFor="cur-pw" className="text-xs font-medium text-ink-soft">Mật khẩu hiện tại</label>
          <input id="cur-pw" type="password" autoComplete="current-password" required value={cur} onChange={(e) => setCur(e.target.value)} className={field} />
        </div>
        <div className="space-y-1">
          <label htmlFor="new-pw" className="text-xs font-medium text-ink-soft">Mật khẩu mới (tối thiểu 8 ký tự)</label>
          <input id="new-pw" type="password" autoComplete="new-password" required minLength={8} value={next} onChange={(e) => setNext(e.target.value)} className={field} />
        </div>
        <div className="space-y-1">
          <label htmlFor="confirm-pw" className="text-xs font-medium text-ink-soft">Xác nhận mật khẩu mới</label>
          <input id="confirm-pw" type="password" autoComplete="new-password" required value={confirm} onChange={(e) => setConfirm(e.target.value)} className={field} />
        </div>
        {err && <p className="text-sm text-danger">{err}</p>}
        <div className="flex justify-end gap-2 pt-1">
          <button type="button" onClick={close} className="rounded-lg border border-line px-4 py-2 text-sm text-ink hover:bg-bg">
            Huỷ
          </button>
          <button type="submit" disabled={busy} className="flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm text-white hover:opacity-90 disabled:opacity-50">
            {busy && <Spinner size={15} />}
            Đổi mật khẩu
          </button>
        </div>
      </form>
    </div>
  );
}
