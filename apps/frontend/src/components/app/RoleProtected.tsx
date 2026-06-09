import type { ReactNode } from "react";
import { useAuth } from "../../lib/auth";
import type { Role } from "@manga/shared";
import Forbidden from "../../pages/Forbidden";

function Splash() {
  return (
    <div className="grid h-full place-items-center bg-bg text-ink">
      <div className="font-mono text-xs uppercase tracking-wider animate-pulse">Manga Studio — đang tải…</div>
    </div>
  );
}

export function RoleProtected({ roles, children }: { roles: Role[]; children: ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) return <Splash />;

  if (!user) {
    // This shouldn't happen since RoleProtected is wrapped by Protected, but just in case
    return <Forbidden />;
  }

  if (!roles.includes(user.role)) {
    return <Forbidden />;
  }

  return <>{children}</>;
}
