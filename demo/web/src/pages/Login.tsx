import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mail, Lock, Eye, EyeOff, ArrowRight, AlertTriangle } from 'lucide-react';
import { useAuth } from '../lib/auth';
import { googleLoginUrl } from '../lib/api';

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

  const [email, setEmail] = useState('dungminer69@gmail.com');
  const [password, setPassword] = useState('Dung123456@');
  const [show, setShow] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (user) navigate('/', { replace: true });
  }, [user, navigate]);

  useEffect(() => {
    if (params.get('error') === 'google_not_configured') {
      setError('Google OAuth chưa cấu hình — xem demo/README.md để thêm credentials.');
    }
  }, [params]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await login(email, password);
      navigate('/', { replace: true });
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Đăng nhập thất bại');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-[1.1fr_0.9fr]">
      {/* LEFT — ink studio cover */}
      <motion.section
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="relative hidden overflow-hidden bg-ink p-12 text-paper lg:flex lg:flex-col lg:justify-between"
      >
        {/* ink moon */}
        <motion.div
          initial={{ scale: 0.7, opacity: 0 }}
          animate={{ scale: 1, opacity: 0.5 }}
          transition={{ duration: 0.9, ease: 'easeOut' }}
          className="halftone-v absolute -right-24 -top-24 h-[28rem] w-[28rem] rounded-full"
        />
        {/* speed-lines wedge */}
        <div className="speed-lines absolute -bottom-10 -left-10 h-72 w-72 rotate-12 opacity-[0.12]" />

        <div className="relative z-10 flex items-center gap-3">
          <span className="grid h-9 w-9 place-items-center border-2 border-vermilion text-vermilion font-display text-xl">
            墨
          </span>
          <span className="label text-paper/70">SU26SWP05 · Manga Studio</span>
        </div>

        <div className="relative z-10">
          <motion.h1
            initial={{ y: 16, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.15, duration: 0.6 }}
            className="font-display text-7xl leading-[0.95] tracking-tight"
          >
            Ink<span className="text-vermilion">frame</span>
          </motion.h1>
          <motion.p
            initial={{ y: 16, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.28, duration: 0.6 }}
            className="mt-5 max-w-sm text-balance text-paper/75"
          >
            Nơi bản thảo thành chương truyện. Quản lý sáng tác, giao việc theo từng
            khung tranh, duyệt và xuất bản — tất cả trong một studio.
          </motion.p>
        </div>

        <div className="relative z-10 flex items-end justify-between">
          <div className="label text-paper/60">
            Mangaka · Assistant · Editor · Board
          </div>
          <div className="label rotate-180 [writing-mode:vertical-rl] text-paper/40">
            墨と紙
          </div>
        </div>
      </motion.section>

      {/* RIGHT — access form */}
      <section className="flex items-center justify-center bg-paper px-6 py-12">
        <motion.div
          initial={{ y: 18, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className="w-full max-w-sm"
        >
          {/* mobile brand */}
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <span className="grid h-9 w-9 place-items-center border-2 border-vermilion font-display text-xl text-vermilion">
              墨
            </span>
            <span className="font-display text-2xl">
              Ink<span className="text-vermilion">frame</span>
            </span>
          </div>

          <p className="label">Studio Access</p>
          <h2 className="mt-1 text-3xl">Đăng nhập</h2>
          <p className="mt-2 text-sm text-ink-3">Vào studio để tiếp tục sản xuất chương mới.</p>

          {error && (
            <div className="mt-5 flex items-start gap-2 border-l-4 border-vermilion bg-vermilion/5 p-3 text-sm text-vermilion-2">
              <AlertTriangle size={16} className="mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={onSubmit} className="mt-6 space-y-5">
            <div>
              <label className="label mb-1 block">Email</label>
              <div className="flex items-center gap-2 border-b-2 border-ink-3 focus-within:border-vermilion">
                <Mail size={18} className="text-ink-3" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input-ink border-none"
                  placeholder="ban@studio.com"
                  required
                />
              </div>
            </div>

            <div>
              <label className="label mb-1 block">Mật khẩu</label>
              <div className="flex items-center gap-2 border-b-2 border-ink-3 focus-within:border-vermilion">
                <Lock size={18} className="text-ink-3" />
                <input
                  type={show ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input-ink border-none"
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShow((s) => !s)}
                  className="text-ink-3 hover:text-ink"
                  aria-label="toggle password"
                >
                  {show ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button type="submit" disabled={busy} className="btn btn-vermilion w-full">
              {busy ? 'Đang vào studio…' : 'Đăng nhập'}
              {!busy && <ArrowRight size={18} />}
            </button>
          </form>

          <div className="my-6 flex items-center gap-3 text-ink-3">
            <span className="h-px flex-1 bg-ink-3/40" />
            <span className="label">hoặc</span>
            <span className="h-px flex-1 bg-ink-3/40" />
          </div>

          <a href={googleLoginUrl} className="btn btn-ghost w-full">
            <GoogleG />
            Tiếp tục với Google
          </a>

          <div className="mt-8 border-2 border-dashed border-ink-3/40 p-3">
            <p className="label mb-1">Demo account</p>
            <p className="font-mono text-xs text-ink-2">dungminer69@gmail.com · Dung123456@</p>
          </div>
        </motion.div>
      </section>
    </div>
  );
}
