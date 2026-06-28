import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  ShieldCheck,
  RotateCw,
  ArrowLeft,
  AlertTriangle,
  MailCheck,
} from "lucide-react";
import type { TwoFactorRequired } from "@manga/shared";
import { useAuth } from "../../lib/auth";
import { Button } from "../ui/Button";

const LEN = 6;
const RESEND_COOLDOWN = 60;

function mmss(total: number): string {
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function TwoFactorChallenge({
  challenge,
  onVerified,
  onBack,
}: {
  challenge: TwoFactorRequired;
  onVerified: () => void;
  onBack: () => void;
}) {
  const { verifyTwoFactor, resendOtp } = useAuth();

  const [digits, setDigits] = useState<string[]>(Array(LEN).fill(""));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [resending, setResending] = useState(false);
  const [resentAt, setResentAt] = useState(false);
  const [cooldown, setCooldown] = useState(RESEND_COOLDOWN); // a code was just sent at login
  const [secondsLeft, setSecondsLeft] = useState(challenge.expiresIn);
  const [devCode, setDevCode] = useState(challenge.devCode);
  const [focused, setFocused] = useState(false);

  const inputRef = useRef<HTMLInputElement | null>(null);
  const code = useMemo(() => digits.join(""), [digits]);
  const expired = secondsLeft <= 0;
  const activeIndex = Math.min(code.length, LEN - 1);

  // expiry + resend countdowns (single 1s tick)
  useEffect(() => {
    const id = setInterval(() => {
      setSecondsLeft((s) => (s > 0 ? s - 1 : 0));
      setCooldown((c) => (c > 0 ? c - 1 : 0));
    }, 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  function reset() {
    setDigits(Array(LEN).fill(""));
    inputRef.current?.focus();
  }

  async function submit(value: string) {
    setBusy(true);
    setError("");
    try {
      await verifyTwoFactor(challenge.challengeToken, value);
      onVerified();
    } catch (err: any) {
      setError(err?.response?.data?.message ?? "Xác thực thất bại");
      reset();
    } finally {
      setBusy(false);
    }
  }

  // Auto-submit the moment the final digit lands — done inline (not in an effect)
  // to avoid setState-in-effect cascading renders.
  function maybeAutoSubmit(next: string[]) {
    if (next.every((d) => d !== "") && !busy && !expired) submit(next.join(""));
  }

  function setCode(raw: string) {
    const nextCode = raw.replace(/\D/g, "").slice(0, LEN);
    const next = Array(LEN).fill("");
    for (let i = 0; i < nextCode.length; i++) next[i] = nextCode[i];
    setDigits(next);
    maybeAutoSubmit(next);
  }

  async function onResend() {
    if (cooldown > 0 || resending) return;
    setResending(true);
    setError("");
    setResentAt(false);
    try {
      const res = await resendOtp(challenge.challengeToken);
      setCooldown(res.cooldownSeconds || RESEND_COOLDOWN);
      setSecondsLeft(challenge.expiresIn);
      if (res.devCode) setDevCode(res.devCode);
      setResentAt(true);
      reset();
    } catch (err: any) {
      setError(err?.response?.data?.message ?? "Không gửi lại được mã");
    } finally {
      setResending(false);
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
        <ShieldCheck size={22} />
      </span>

      <p className="mt-5 font-mono text-xs uppercase tracking-wider text-ink-soft">
        Xác thực hai lớp
      </p>
      <h2 className="mt-1 text-3xl font-semibold text-ink">Nhập mã xác thực</h2>
      <p className="mt-2 text-sm text-ink-soft">
        Mã gồm 6 chữ số đã gửi tới{" "}
        <span className="font-medium text-ink">{challenge.emailMasked}</span>.
      </p>

      {resentAt && !error && (
        <div className="mt-5 flex items-start gap-2 border-l-4 border-ok bg-ok/5 p-3 text-sm text-ok">
          <MailCheck size={16} className="mt-0.5 shrink-0" />
          <span>Đã gửi lại mã mới. Kiểm tra hộp thư của bạn.</span>
        </div>
      )}

      {error && (
        <div className="mt-5 flex items-start gap-2 border-l-4 border-accent bg-accent/5 p-3 text-sm text-accent">
          <AlertTriangle size={16} className="mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div
        className="relative mt-6"
        onClick={() => inputRef.current?.focus()}
      >
        <input
          ref={inputRef}
          value={code}
          onChange={(e) => setCode(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          disabled={busy || expired}
          inputMode="numeric"
          pattern="[0-9]*"
          autoComplete="one-time-code"
          aria-label="Mã xác thực 6 chữ số"
          maxLength={LEN}
          className="absolute inset-0 z-10 h-full w-full cursor-text opacity-0"
        />

        <div
          aria-hidden="true"
          className={`grid grid-cols-6 gap-2 ${busy || expired ? "opacity-50" : ""}`}
        >
          {digits.map((digit, i) => (
            <div
              key={i}
              data-testid="otp-digit-box"
              className={`grid h-14 place-items-center rounded-[calc(var(--app-radius)*0.6)] border bg-surface text-center font-mono text-2xl text-ink outline-none transition ${
                focused && i === activeIndex ? "border-accent" : "border-line"
              }`}
            >
              {digit}
            </div>
          ))}
        </div>
      </div>

      <div className="mt-3 text-xs text-ink-soft">
        {expired ? (
          <span className="text-danger">
            Mã đã hết hạn. Hãy gửi lại mã hoặc quay lại đăng nhập.
          </span>
        ) : (
          <span>
            Mã hết hạn sau{" "}
            <span className="font-mono text-ink">{mmss(secondsLeft)}</span>
          </span>
        )}
      </div>

      {devCode && (
        <p className="mt-2 font-mono text-xs text-ink-soft">
          DEV · mã hiện tại: <span className="text-ink">{devCode}</span>
        </p>
      )}

      <Button
        type="button"
        loading={busy}
        disabled={code.length !== LEN || expired}
        onClick={() => submit(code)}
        className="mt-6 w-full"
      >
        Xác nhận
      </Button>

      <div className="mt-4 flex items-center justify-between text-sm">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-ink-soft transition hover:text-ink"
        >
          <ArrowLeft size={15} />
          Quay lại
        </button>

        <button
          type="button"
          onClick={onResend}
          disabled={cooldown > 0 || resending}
          className="inline-flex items-center gap-1.5 text-accent transition hover:brightness-95 disabled:cursor-not-allowed disabled:text-ink-soft disabled:opacity-70"
        >
          <RotateCw size={15} className={resending ? "animate-spin" : ""} />
          {cooldown > 0 ? `Gửi lại sau ${cooldown}s` : "Gửi lại mã"}
        </button>
      </div>
    </motion.div>
  );
}
