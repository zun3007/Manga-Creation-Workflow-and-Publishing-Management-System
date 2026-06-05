import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../lib/auth";
import { Button } from "../components/ui/Button";

export default function AuthCallback() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { loginWithToken } = useAuth();
  const ran = useRef(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;
    const token = params.get("token");

    const timeoutId = setTimeout(() => {
      if (!failed) {
        setFailed(true);
      }
    }, 10000);

    (async () => {
      try {
        if (!token) {
          navigate("/login?error=google_not_configured", { replace: true });
          clearTimeout(timeoutId);
          return;
        }
        await loginWithToken(token);
        clearTimeout(timeoutId);
        navigate("/", { replace: true });
      } catch (err) {
        clearTimeout(timeoutId);
        console.error("[auth] Google callback failed", err);
        navigate("/login?error=google_auth_failed", { replace: true });
      }
    })();

    return () => clearTimeout(timeoutId);
  }, [params, navigate, loginWithToken, failed]);

  if (failed) {
    return (
      <div data-role="mangaka" className="grid h-full place-items-center bg-bg text-ink">
        <div className="text-center">
          <p className="text-lg font-semibold mb-4">Xác thực thất bại.</p>
          <Button onClick={() => navigate("/login", { replace: true })}>
            Quay lại đăng nhập
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div data-role="mangaka" className="grid h-full place-items-center bg-bg text-ink">
      <div className="font-mono text-xs uppercase tracking-wider animate-pulse">Đang xác thực với Google…</div>
    </div>
  );
}
