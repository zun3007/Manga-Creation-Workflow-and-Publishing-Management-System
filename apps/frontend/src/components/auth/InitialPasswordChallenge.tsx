import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  ArrowLeft,
  Eye,
  EyeOff,
  KeyRound,
  Lock,
} from "lucide-react";
import type { LoginResponse, PasswordChangeRequired } from "@manga/shared";
import { useAuth } from "../../lib/auth";
import { Button } from "../ui/Button";

function mmss(total: number): string {
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;

  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

export function InitialPasswordChallenge({
  challenge,
  onCompleted,
  onBack,
}: {
  challenge: PasswordChangeRequired;
  onCompleted: (result: LoginResponse) => void;
  onBack: () => void;
}) {
  const { completeInitialPassword } = useAuth();

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(challenge.expiresIn);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const expired = secondsLeft <= 0;

  useEffect(() => {
    const timer = window.setInterval(() => {
      setSecondsLeft((current) => (current > 0 ? current - 1 : 0));
    }, 1000);

    return () => window.clearInterval(timer);
  }, []);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError("");

    if (expired) {
      setError("Phiên đổi mật khẩu đã hết hạn. Vui lòng đăng nhập lại.");
      return;
    }

    if (newPassword.length < 8) {
      setError("Mật khẩu mới phải có ít nhất 8 ký tự.");
      return;
    }

    if (newPassword.length > 72) {
      setError("Mật khẩu mới không được vượt quá 72 ký tự.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Xác nhận mật khẩu không khớp.");
      return;
    }

    setBusy(true);

    try {
      const result = await completeInitialPassword(
        challenge.challengeToken,
        newPassword,
      );

      onCompleted(result);
    } catch (err: any) {
      setError(
        err?.response?.data?.message ?? "Không thể đổi mật khẩu ban đầu.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <motion.div
      initial={{ y: 18, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="w-full max-w-sm"
    >
      <span className="grid h-11 w-11 place-items-center rounded-[calc(var(--app-radius)*0.6)] border-2 border-accent text-accent">
        <KeyRound size={22} />
      </span>

      <p className="mt-5 font-mono text-xs uppercase tracking-wider text-ink-soft">
        Bảo mật tài khoản
      </p>

      <h2 className="mt-1 text-3xl font-semibold text-ink">
        Đổi mật khẩu ban đầu
      </h2>

      <p className="mt-2 text-sm leading-6 text-ink-soft">
        Đây là tài khoản nội bộ mới. Bạn phải thay mật khẩu tạm thời trước khi
        truy cập hệ thống.
      </p>

      {error && (
        <div className="mt-5 flex items-start gap-2 border-l-4 border-accent bg-accent/5 p-3 text-sm text-accent">
          <AlertTriangle size={16} className="mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={submit} className="mt-6 space-y-5">
        <div>
          <label
            htmlFor="initial-new-password"
            className="mb-1 block font-mono text-xs uppercase tracking-wider text-ink-soft"
          >
            Mật khẩu mới
          </label>

          <div className="flex items-center gap-2 rounded-[calc(var(--app-radius)*0.6)] border border-line bg-surface px-3 py-2 focus-within:border-accent">
            <Lock size={18} className="shrink-0 text-ink-soft" />

            <input
              id="initial-new-password"
              type={showNew ? "text" : "password"}
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              minLength={8}
              maxLength={72}
              autoComplete="new-password"
              placeholder="Tối thiểu 8 ký tự"
              disabled={busy || expired}
              required
              className="flex-1 bg-transparent text-ink outline-none placeholder:text-ink-soft"
            />

            <button
              type="button"
              onClick={() => setShowNew((current) => !current)}
              className="text-ink-soft transition hover:text-ink"
              aria-label={showNew ? "Ẩn mật khẩu mới" : "Hiện mật khẩu mới"}
            >
              {showNew ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>

        <div>
          <label
            htmlFor="initial-confirm-password"
            className="mb-1 block font-mono text-xs uppercase tracking-wider text-ink-soft"
          >
            Xác nhận mật khẩu mới
          </label>

          <div className="flex items-center gap-2 rounded-[calc(var(--app-radius)*0.6)] border border-line bg-surface px-3 py-2 focus-within:border-accent">
            <Lock size={18} className="shrink-0 text-ink-soft" />

            <input
              id="initial-confirm-password"
              type={showConfirm ? "text" : "password"}
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              minLength={8}
              maxLength={72}
              autoComplete="new-password"
              placeholder="Nhập lại mật khẩu"
              disabled={busy || expired}
              required
              className="flex-1 bg-transparent text-ink outline-none placeholder:text-ink-soft"
            />

            <button
              type="button"
              onClick={() => setShowConfirm((current) => !current)}
              className="text-ink-soft transition hover:text-ink"
              aria-label={
                showConfirm ? "Ẩn mật khẩu xác nhận" : "Hiện mật khẩu xác nhận"
              }
            >
              {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>

        <p className="text-xs text-ink-soft">
          {expired ? (
            <span className="text-danger">
              Phiên đã hết hạn. Hãy quay lại đăng nhập.
            </span>
          ) : (
            <>
              Phiên hết hạn sau{" "}
              <span className="font-mono text-ink">{mmss(secondsLeft)}</span>
            </>
          )}
        </p>

        <Button
          type="submit"
          loading={busy}
          disabled={expired}
          className="w-full"
        >
          Đổi mật khẩu và tiếp tục
        </Button>
      </form>

      <button
        type="button"
        onClick={onBack}
        className="mt-4 inline-flex items-center gap-1.5 text-sm text-ink-soft transition hover:text-ink"
      >
        <ArrowLeft size={15} />
        Quay lại đăng nhập
      </button>
    </motion.div>
  );
}
