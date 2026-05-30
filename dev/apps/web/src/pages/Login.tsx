import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Lock, Eye, EyeOff, ArrowRight, AlertTriangle } from "lucide-react";
import { useAuth } from "../lib/auth";
import { googleLoginUrl } from "../lib/api";
import { Panel } from "../components/ui/Panel";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";

function GoogleG() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden>
      <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9 3.6l6.7-6.7C35.6 2.6 30.1 0 24 0 14.6 0 6.5 5.4 2.6 13.3l7.8 6c1.9-5.6 7.1-9.8 13.6-9.8z"/>
      <path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.8 7.2l7.4 5.7c4.3-4 6.8-9.9 6.8-17.4z"/>
      <path fill="#FBBC05" d="M10.4 28.7c-.5-1.4-.7-2.9-.7-4.7s.3-3.3.7-4.7l-7.8-6C.9 16.5 0 20.1 0 24s.9 7.5 2.6 10.7l7.8-6z"/>
      <path fill="#34A853" d="M24 48c6.1 0 11.3-2 15-5.5l-7.4-5.7c-2 1.4-4.7 2.3-7.6 2.3-6.5 0-11.7-4.2-13.6-9.8l-7.8 6C6.5 42.6 14.6 48 24 48z"/>
    </svg>
  );
}

export default function Login() {
  const { login, user } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();

  const [email, setEmail] = useState("dungminer69@gmail.com");
  const [password, setPassword] = useState("Dung123456@");
  const [show, setShow] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (user) navigate("/", { replace: true });
  }, [user, navigate]);

  useEffect(() => {
    if (params.get("error") === "google_not_configured") {
      setError("Google OAuth chưa cấu hình — xem dev/README.md để thêm credentials.");
    }
  }, [params]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await login(email, password);
      navigate("/", { replace: true });
    } catch (err: any) {
      setError(err?.response?.data?.message ?? "Đăng nhập thất bại");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div data-role="mangaka" className="min-h-screen bg-bg text-ink">
      <div className="grid min-h-screen lg:grid-cols-[1.1fr_0.9fr]">
        {/* LEFT — ink studio cover */}
        <motion.section
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="relative hidden overflow-hidden bg-ink p-12 text-surface lg:flex lg:flex-col lg:justify-between"
        >
          {/* soft accent glow (Sakura) */}
          <div className="absolute -right-24 -top-24 h-[28rem] w-[28rem] rounded-full bg-accent/20 blur-3xl" />
          <div className="absolute -bottom-16 -left-16 h-72 w-72 rounded-full bg-accent-2/20 blur-3xl" />

          <div className="relative z-10 flex items-center gap-3">
            <span className="grid h-9 w-9 place-items-center border-2 border-accent text-accent font-display text-xl">
              墨
            </span>
            <span className="font-mono text-xs uppercase tracking-wider text-surface/70">SU26SWP05 · Manga Studio</span>
          </div>

          <div className="relative z-10">
            <motion.h1
              initial={{ y: 16, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.15, duration: 0.6 }}
              className="font-display text-7xl leading-[0.95] tracking-tight text-surface"
            >
              Manga<span className="text-accent">Studio</span>
            </motion.h1>
            <motion.p
              initial={{ y: 16, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.28, duration: 0.6 }}
              className="mt-5 max-w-sm text-balance text-surface/75"
            >
              Nơi bản thảo thành chương truyện. Quản lý sáng tác, giao việc theo từng
              khung tranh, duyệt và xuất bản — tất cả trong một studio.
            </motion.p>
          </div>

          <div className="relative z-10 flex items-end justify-between">
            <div className="font-mono text-xs uppercase tracking-wider text-surface/60">
              Mangaka · Assistant · Editor · Board
            </div>
            <div className="font-mono text-xs uppercase tracking-wider rotate-180 [writing-mode:vertical-rl] text-surface/40">
              墨と紙
            </div>
          </div>
        </motion.section>

        {/* RIGHT — access form */}
        <section className="flex items-center justify-center bg-bg px-6 py-12">
          <motion.div
            initial={{ y: 18, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="w-full max-w-sm"
          >
            {/* mobile brand */}
            <div className="mb-8 flex items-center gap-3 lg:hidden">
              <span className="grid h-9 w-9 place-items-center border-2 border-accent font-display text-xl text-accent">
                墨
              </span>
              <span className="font-display text-2xl text-ink">
                Manga<span className="text-accent">Studio</span>
              </span>
            </div>

            <p className="font-mono text-xs uppercase tracking-wider text-ink-soft">Studio Access</p>
            <h2 className="mt-1 text-3xl font-semibold text-ink">Đăng nhập</h2>
            <p className="mt-2 text-sm text-ink-soft">Vào studio để tiếp tục sản xuất chương mới.</p>

            {error && (
              <div className="mt-5 flex items-start gap-2 border-l-4 border-accent bg-accent/5 p-3 text-sm text-accent">
                <AlertTriangle size={16} className="mt-0.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={onSubmit} className="mt-6 space-y-5">
              <Input
                label="Email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="ban@studio.com"
                required
              />

              <div>
                <label className="font-mono text-xs uppercase tracking-wider block text-ink-soft mb-1">
                  Mật khẩu
                </label>
                <div className="flex items-center gap-2 border border-line rounded-[calc(var(--app-radius)*0.6)] bg-surface px-3 py-2 focus-within:border-accent transition">
                  <Lock size={18} className="text-ink-soft shrink-0" />
                  <input
                    type={show ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="flex-1 bg-transparent text-ink outline-none placeholder:text-ink-soft"
                    placeholder="••••••••"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShow((s) => !s)}
                    className="text-ink-soft hover:text-ink transition"
                    aria-label="toggle password"
                  >
                    {show ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <Button type="submit" disabled={busy} className="w-full">
                {busy ? "Đang vào studio…" : "Đăng nhập"}
                {!busy && <ArrowRight size={18} />}
              </Button>
            </form>

            <div className="my-6 flex items-center gap-3 text-ink-soft">
              <span className="h-px flex-1 bg-line" />
              <span className="font-mono text-xs uppercase tracking-wider">hoặc</span>
              <span className="h-px flex-1 bg-line" />
            </div>

            <a href={googleLoginUrl} className="inline-flex w-full items-center justify-center gap-2 rounded-[calc(var(--app-radius)*0.66)] border border-line bg-surface px-4 py-2 font-semibold transition hover:bg-bg text-ink">
              <GoogleG />
              Tiếp tục với Google
            </a>

            <Panel className="mt-8 p-3">
              <p className="font-mono text-xs uppercase tracking-wider text-ink-soft mb-1">Demo account</p>
              <p className="font-mono text-xs text-ink">dungminer69@gmail.com · Dung123456@</p>
            </Panel>
          </motion.div>
        </section>
      </div>
    </div>
  );
}
