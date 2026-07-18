import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  Lock,
  Mail,
  RotateCw,
} from "lucide-react";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { api, apiErrorMessage } from "../../lib/api";

type Step = "email" | "otp" | "password" | "success";

const OTP_LENGTH = 6;
const RESEND_COOLDOWN = 60;
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function ForgotPasswordFlow({
  initialEmail,
  onBack,
}: {
  initialEmail: string;
  onBack: () => void;
}) {
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState(initialEmail);
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState("");
  const [cooldown, setCooldown] = useState(0);
  const [busy, setBusy] = useState(false);
  const [challengeToken, setChallengeToken] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [devCode, setDevCode] = useState<string | undefined>();
  const [otpFocused, setOtpFocused] = useState(false);
  const otpInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = window.setInterval(
      () => setCooldown((value) => Math.max(0, value - 1)),
      1000,
    );
    return () => window.clearInterval(timer);
  }, [cooldown]);

  useEffect(() => {
    if (step === "otp") otpInputRef.current?.focus();
  }, [step]);

  async function sendOtp(event?: React.FormEvent) {
    event?.preventDefault();
    setError("");
    const normalizedEmail = email.trim().toLowerCase();

    if (!emailPattern.test(normalizedEmail)) {
      setError("Vui lòng nhập một địa chỉ email hợp lệ.");
      return;
    }

    setBusy(true);
    try {
      const { data } = await api.post<{
        challengeToken: string;
        devCode?: string;
      }>("/auth/password/forgot", { email: normalizedEmail });
      setEmail(normalizedEmail);
      setChallengeToken(data.challengeToken);
      setDevCode(data.devCode);
      setOtp("");
      setCooldown(RESEND_COOLDOWN);
      setStep("otp");
    } catch (requestError) {
      setError(
        apiErrorMessage(requestError, "Không thể gửi mã OTP. Vui lòng thử lại."),
      );
    } finally {
      setBusy(false);
    }
  }

  async function verifyOtp(event: React.FormEvent) {
    event.preventDefault();
    setError("");

    setBusy(true);
    try {
      const { data } = await api.post<{ resetToken: string }>(
        "/auth/password/forgot/verify",
        { challengeToken, code: otp },
      );
      setResetToken(data.resetToken);
      setStep("password");
    } catch (requestError) {
      setError(
        apiErrorMessage(
          requestError,
          "Mã OTP không đúng hoặc đã hết hạn. Vui lòng thử lại.",
        ),
      );
      setOtp("");
      window.setTimeout(() => otpInputRef.current?.focus(), 0);
    } finally {
      setBusy(false);
    }
  }

  async function updatePassword(event: React.FormEvent) {
    event.preventDefault();
    setError("");

    if (newPassword.length < 8) {
      setError("Mật khẩu mới phải có ít nhất 8 ký tự.");
      return;
    }
    if (newPassword.length > 72) {
      setError("Mật khẩu mới không được vượt quá 72 ký tự.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Xác nhận mật khẩu mới không khớp.");
      return;
    }

    setBusy(true);
    try {
      await api.post("/auth/password/reset", {
        resetToken,
        newPassword,
      });
      setStep("success");
    } catch (requestError) {
      setError(
        apiErrorMessage(
          requestError,
          "Không thể cập nhật mật khẩu. Vui lòng thử lại.",
        ),
      );
    } finally {
      setBusy(false);
    }
  }

  async function resendOtp() {
    if (!challengeToken || cooldown > 0 || busy) return;
    setBusy(true);
    setError("");
    try {
      const { data } = await api.post<{
        cooldownSeconds: number;
        devCode?: string;
      }>("/auth/password/forgot/resend", { challengeToken });
      setOtp("");
      setDevCode(data.devCode);
      setCooldown(data.cooldownSeconds || 60);
      window.setTimeout(() => otpInputRef.current?.focus(), 0);
    } catch (requestError) {
      setError(
        apiErrorMessage(
          requestError,
          "Không thể gửi lại mã OTP. Vui lòng thử lại.",
        ),
      );
    } finally {
      setBusy(false);
    }
  }

  function goTo(target: Step) {
    setError("");
    setStep(target);
  }

  const animation = {
    initial: { y: 18, opacity: 0 },
    animate: { y: 0, opacity: 1 },
    transition: { duration: 0.4, ease: "easeOut" as const },
  };

  if (step === "success") {
    return (
      <motion.div {...animation} className="w-full max-w-sm">
        <span className="grid h-11 w-11 place-items-center rounded-[calc(var(--app-radius)*0.6)] border-2 border-ok text-ok">
          <CheckCircle2 size={22} />
        </span>
        <p className="mt-5 font-mono text-xs uppercase tracking-wider text-ink-soft">
          Hoàn tất
        </p>
        <h2 className="mt-1 text-3xl font-semibold text-ink">
          Mật khẩu đã cập nhật
        </h2>
        <p className="mt-2 text-sm leading-6 text-ink-soft">
          Bạn có thể đăng nhập bằng mật khẩu mới vừa tạo.
        </p>
        <Button type="button" onClick={onBack} className="mt-6 w-full">
          Quay lại đăng nhập
          <ArrowRight size={18} />
        </Button>
      </motion.div>
    );
  }

  if (step === "password") {
    return (
      <motion.div {...animation} className="w-full max-w-sm">
        <span className="grid h-11 w-11 place-items-center rounded-[calc(var(--app-radius)*0.6)] border-2 border-accent text-accent">
          <KeyRound size={22} />
        </span>
        <p className="mt-5 font-mono text-xs uppercase tracking-wider text-ink-soft">
          Khôi phục tài khoản
        </p>
        <h2 className="mt-1 text-3xl font-semibold text-ink">
          Cập nhật mật khẩu
        </h2>
        <p className="mt-2 text-sm leading-6 text-ink-soft">
          Tạo mật khẩu mới cho tài khoản <span className="font-medium text-ink">{email}</span>.
        </p>

        {error && <ErrorMessage message={error} />}

        <form onSubmit={updatePassword} className="mt-6 space-y-5">
          <PasswordField
            id="forgot-new-password"
            label="Mật khẩu mới"
            value={newPassword}
            show={showNewPassword}
            onChange={setNewPassword}
            onToggle={() => setShowNewPassword((value) => !value)}
            placeholder="Tối thiểu 8 ký tự"
          />
          <PasswordField
            id="forgot-confirm-password"
            label="Xác nhận mật khẩu mới"
            value={confirmPassword}
            show={showConfirmPassword}
            onChange={setConfirmPassword}
            onToggle={() => setShowConfirmPassword((value) => !value)}
            placeholder="Nhập lại mật khẩu mới"
          />
          <Button type="submit" loading={busy} className="w-full">
            Cập nhật mật khẩu
            {!busy && <ArrowRight size={18} />}
          </Button>
        </form>

        <BackButton onClick={() => goTo("email")}>
          Bắt đầu lại quy trình
        </BackButton>
      </motion.div>
    );
  }

  if (step === "otp") {
    return (
      <motion.div {...animation} className="w-full max-w-sm">
        <span className="grid h-11 w-11 place-items-center rounded-[calc(var(--app-radius)*0.6)] border-2 border-accent text-accent">
          <KeyRound size={22} />
        </span>
        <p className="mt-5 font-mono text-xs uppercase tracking-wider text-ink-soft">
          Xác thực email
        </p>
        <h2 className="mt-1 text-3xl font-semibold text-ink">Nhập mã OTP</h2>
        <p className="mt-2 text-sm leading-6 text-ink-soft">
          Nhập mã gồm 6 chữ số đã gửi đến <span className="font-medium text-ink">{email}</span>.
        </p>

        {devCode && (
          <div className="mt-5 border-l-4 border-ok bg-ok/5 p-3 text-sm text-ok">
            DEV · mã hiện tại: <span className="font-mono font-semibold">{devCode}</span>
          </div>
        )}
        {error && <ErrorMessage message={error} />}

        <form onSubmit={verifyOtp} className="mt-6">
          <div
            className="relative"
            onClick={() => otpInputRef.current?.focus()}
          >
            <input
              ref={otpInputRef}
              value={otp}
              onChange={(event) => {
                setOtp(
                  event.target.value.replace(/\D/g, "").slice(0, OTP_LENGTH),
                );
                setError("");
              }}
              onFocus={() => setOtpFocused(true)}
              onBlur={() => setOtpFocused(false)}
              inputMode="numeric"
              pattern="[0-9]*"
              autoComplete="one-time-code"
              aria-label="Mã OTP"
              maxLength={OTP_LENGTH}
              className="absolute inset-0 z-10 h-full w-full cursor-text opacity-0"
            />

            <div aria-hidden="true" className="grid grid-cols-6 gap-2">
              {Array.from({ length: OTP_LENGTH }, (_, index) => {
                const activeIndex = Math.min(otp.length, OTP_LENGTH - 1);

                return (
                  <div
                    key={index}
                    data-testid="forgot-otp-digit-box"
                    className={`grid h-14 place-items-center rounded-[calc(var(--app-radius)*0.6)] border bg-surface text-center font-mono text-2xl text-ink outline-none transition ${
                      otpFocused && index === activeIndex
                        ? "border-accent"
                        : "border-line"
                    }`}
                  >
                    {otp[index] ?? ""}
                  </div>
                );
              })}
            </div>
          </div>
          <Button
            type="submit"
            loading={busy}
            disabled={otp.length !== OTP_LENGTH}
            className="mt-5 w-full"
          >
            Xác nhận OTP
            <ArrowRight size={18} />
          </Button>
        </form>

        <div className="mt-4 flex items-center justify-between text-sm">
          <button
            type="button"
            onClick={() => goTo("email")}
            className="inline-flex items-center gap-1.5 text-ink-soft transition hover:text-ink"
          >
            <ArrowLeft size={15} />
            Đổi email
          </button>
          <button
            type="button"
            onClick={resendOtp}
            disabled={cooldown > 0 || busy}
            className="inline-flex items-center gap-1.5 text-accent transition hover:brightness-95 disabled:cursor-not-allowed disabled:text-ink-soft disabled:opacity-70"
          >
            <RotateCw size={15} />
            {cooldown > 0 ? `Gửi lại sau ${cooldown}s` : "Gửi lại OTP"}
          </button>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div {...animation} className="w-full max-w-sm">
      <span className="grid h-11 w-11 place-items-center rounded-[calc(var(--app-radius)*0.6)] border-2 border-accent text-accent">
        <Mail size={22} />
      </span>
      <p className="mt-5 font-mono text-xs uppercase tracking-wider text-ink-soft">
        Khôi phục tài khoản
      </p>
      <h2 className="mt-1 text-3xl font-semibold text-ink">
        Quên mật khẩu?
      </h2>
      <p className="mt-2 text-sm leading-6 text-ink-soft">
        Nhập địa chỉ email của bạn. Chúng tôi sẽ gửi mã OTP để xác minh tài khoản.
      </p>

      {error && <ErrorMessage message={error} />}

      <form onSubmit={sendOtp} className="mt-6 space-y-5">
        <Input
          label="Địa chỉ email"
          type="email"
          value={email}
          onChange={(event) => {
            setEmail(event.target.value);
            setError("");
          }}
          placeholder="ban@studio.com"
          autoComplete="email"
          autoFocus
          required
        />
        <Button type="submit" loading={busy} className="w-full">
          Gửi OTP
          {!busy && <ArrowRight size={18} />}
        </Button>
      </form>

      <BackButton onClick={onBack}>Quay lại đăng nhập</BackButton>
    </motion.div>
  );
}

function ErrorMessage({ message }: { message: string }) {
  return (
    <div role="alert" className="mt-5 flex items-start gap-2 border-l-4 border-accent bg-accent/5 p-3 text-sm text-accent">
      <AlertTriangle size={16} className="mt-0.5 shrink-0" />
      <span>{message}</span>
    </div>
  );
}

function BackButton({
  children,
  onClick,
}: {
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="mt-4 inline-flex items-center gap-1.5 text-sm text-ink-soft transition hover:text-ink"
    >
      <ArrowLeft size={15} />
      {children}
    </button>
  );
}

function PasswordField({
  id,
  label,
  value,
  show,
  onChange,
  onToggle,
  placeholder,
}: {
  id: string;
  label: string;
  value: string;
  show: boolean;
  onChange: (value: string) => void;
  onToggle: () => void;
  placeholder: string;
}) {
  return (
    <div>
      <label htmlFor={id} className="mb-1 block font-mono text-xs uppercase tracking-wider text-ink-soft">
        {label}
      </label>
      <div className="flex items-center gap-2 rounded-[calc(var(--app-radius)*0.6)] border border-line bg-surface px-3 py-2 transition focus-within:border-accent">
        <Lock size={18} className="shrink-0 text-ink-soft" />
        <input
          id={id}
          type={show ? "text" : "password"}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          minLength={8}
          maxLength={72}
          autoComplete="new-password"
          placeholder={placeholder}
          required
          className="flex-1 bg-transparent text-ink outline-none placeholder:text-ink-soft"
        />
        <button
          type="button"
          onClick={onToggle}
          className="text-ink-soft transition hover:text-ink"
          aria-label={show ? `Ẩn ${label.toLowerCase()}` : `Hiện ${label.toLowerCase()}`}
        >
          {show ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </div>
    </div>
  );
}
