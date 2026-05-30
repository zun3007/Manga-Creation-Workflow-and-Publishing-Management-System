import { useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../lib/auth";

export default function AuthCallback() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { loginWithToken } = useAuth();
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;
    const token = params.get("token");
    (async () => {
      if (!token) {
        navigate("/login?error=google_not_configured", { replace: true });
        return;
      }
      try {
        await loginWithToken(token);
        navigate("/", { replace: true });
      } catch (err) {
        console.error("[auth] Google callback failed", err);
        navigate("/login?error=google_auth_failed", { replace: true });
      }
    })();
  }, [params, navigate, loginWithToken]);

  return (
    <div data-role="mangaka" className="grid h-full place-items-center bg-bg text-ink">
      <div className="font-mono text-xs uppercase tracking-wider animate-pulse">Đang xác thực với Google…</div>
    </div>
  );
}
