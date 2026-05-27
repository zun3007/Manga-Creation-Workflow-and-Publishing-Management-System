import { Routes, Route, Navigate } from 'react-router-dom';
import type { ReactNode } from 'react';
import { useAuth } from './lib/auth';
import { GrainOverlay } from './components/ui/GrainOverlay';
import Login from './pages/Login';
import AuthCallback from './pages/AuthCallback';
import Dashboard from './pages/Dashboard';

function Splash() {
  return (
    <div className="grid h-full place-items-center bg-paper">
      <div className="label animate-pulse">Inkframe — đang tải…</div>
    </div>
  );
}

function Protected({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <Splash />;
  return user ? <>{children}</> : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <>
      <GrainOverlay />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/auth/callback" element={<AuthCallback />} />
        <Route
          path="/"
          element={
            <Protected>
              <Dashboard />
            </Protected>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}
