import { useState } from 'react';
import { api } from '../../lib/api';
import { useToast } from '../ui/Toast';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';

const field =
  'w-full rounded-lg border border-line bg-bg px-3 py-2 text-sm text-ink outline-none focus:border-accent';

export function ChangePasswordModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const toast = useToast();
  const [cur, setCur] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

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
    <Modal open={open} onClose={close} title="Đổi mật khẩu" className="w-full max-w-sm">
      <form onSubmit={submit} className="space-y-4">
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
          <Button type="button" variant="soft" onClick={close} disabled={busy}>
            Huỷ
          </Button>
          <Button type="submit" loading={busy}>
            Đổi mật khẩu
          </Button>
        </div>
      </form>
    </Modal>
  );
}
