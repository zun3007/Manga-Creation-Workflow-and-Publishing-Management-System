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

  const refs = useRef<(HTMLInputElement | null)[]>([]);
  const code = useMemo(() => digits.join(""), [digits]);
  const expired = secondsLeft <= 0;

  // expiry + resend countdowns (single 1s tick)
  useEffect(() => {
    const id = setInterval(() => {
      setSecondsLeft((s) => (s > 0 ? s - 1 : 0));
      setCooldown((c) => (c > 0 ? c - 1 : 0));
    }, 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    refs.current[0]?.focus();
  }, []);

  function reset() {
    setDigits(Array(LEN).fill(""));
    refs.current[0]?.focus();
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

  function setDigit(i: number, raw: string) {
    const v = raw.replace(/\D/g, "").slice(-1);
    const next = [...digits];
    next[i] = v;
    setDigits(next);
    if (v && i < LEN - 1) refs.current[i + 1]?.focus();
    if (v) maybeAutoSubmit(next);
  }

  function onKeyDown(i: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace" && !digits[i] && i > 0) {
      refs.current[i - 1]?.focus();
    } else if (e.key === "ArrowLeft" && i > 0) {
      refs.current[i - 1]?.focus();
    } else if (e.key === "ArrowRight" && i < LEN - 1) {
      refs.current[i + 1]?.focus();
    }
  }

  function onPaste(e: React.ClipboardEvent<HTMLInputElement>) {
    e.preventDefault();
    const text = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, LEN);
    if (!text) return;
    const next = Array(LEN).fill("");
    for (let k = 0; k < text.length; k++) next[k] = text[k];
    setDigits(next);
    refs.current[Math.min(text.length, LEN - 1)]?.focus();
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
        role="group"
        aria-label="Mã xác thực 6 chữ số"
        className="mt-6 flex gap-2"
        onPaste={onPaste}
      >
        {digits.map((d, i) => (
          <input
            key={i}
            ref={(el) => {
              refs.current[i] = el;
            }}
            value={d}
            onChange={(e) => setDigit(i, e.target.value)}
            onKeyDown={(e) => onKeyDown(i, e)}
            disabled={busy || expired}
            inputMode="numeric"
            autoComplete={i === 0 ? "one-time-code" : "off"}
            aria-label={`Chữ số ${i + 1}`}
            maxLength={1}
            className="h-14 w-full rounded-[calc(var(--app-radius)*0.6)] border border-line bg-surface text-center font-mono text-2xl text-ink outline-none transition focus:border-accent disabled:opacity-50"
          />
        ))}
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
