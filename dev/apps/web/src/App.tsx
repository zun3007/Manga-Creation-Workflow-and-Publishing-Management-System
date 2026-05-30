import { Routes, Route, Navigate, BrowserRouter } from "react-router-dom";
import type { ReactNode } from "react";
import { useAuth } from "./lib/auth";
import { AuthProvider } from "./lib/auth";
import Login from "./pages/Login";
import AuthCallback from "./pages/AuthCallback";
import { AppShell } from "./components/app/AppShell";

function Splash() {
  return (
    <div className="grid h-full place-items-center bg-bg text-ink">
      <div className="font-mono text-xs uppercase tracking-wider animate-pulse">Inkframe — đang tải…</div>
    </div>
  );
}

function Protected({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <Splash />;
  return user ? <>{children}</> : <Navigate to="/login" replace />;
}

function DashboardPlaceholder() {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-semibold text-ink">Tổng quan</h1>
      <p className="text-ink-soft mt-2">Dashboard sẽ được thêm ở bước kế.</p>
    </div>
  );
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/auth/callback" element={<AuthCallback />} />
      <Route
        path="/"
        element={
          <Protected>
            <AppShell>
              <DashboardPlaceholder />
            </AppShell>
          </Protected>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
