import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { LogOut, KeyRound } from "lucide-react";
import { useAuth } from "../../lib/auth";
import { Avatar } from "../ui/Avatar";
import { NotificationsBell } from "./NotificationsBell";
import { ChangePasswordModal } from "./ChangePasswordModal";
import { roleLabel } from "../../lib/roleLabel";

interface HeaderProps {
  title?: string;
}

export function Header({ title }: HeaderProps) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [pwOpen, setPwOpen] = useState(false);

  if (!user) return null;

  function handleLogout() {
    logout();
    navigate("/login");
  }

  return (
    <>
    <header className="sticky top-0 z-50 flex items-center justify-between border-b border-line bg-bg/95 px-6 py-3 backdrop-blur">
      <div className="text-sm font-mono uppercase tracking-wider text-ink-soft">
        {title ?? "Manga Studio"}
      </div>

      <div className="flex items-center gap-3">
        <NotificationsBell />

        <div className="h-6 w-px bg-line" />

        <div className="flex items-center gap-2">
          {user.avatarUrl && <Avatar url={user.avatarUrl} name={user.name} />}
          <div className="hidden sm:flex flex-col">
            <div className="text-sm font-semibold text-ink">{user.name}</div>
            <div className="text-xs text-ink-soft">{roleLabel(user.role)}</div>
          </div>
        </div>

        <div className="h-6 w-px bg-line" />

        <button
          onClick={() => setPwOpen(true)}
          aria-label="change password"
          title="Đổi mật khẩu"
          className="p-2 text-ink hover:text-accent transition-colors"
        >
          <KeyRound className="h-5 w-5" />
        </button>

        <button
          onClick={handleLogout}
          aria-label="logout"
          className="p-2 text-ink hover:text-accent transition-colors"
        >
          <LogOut className="h-5 w-5" />
        </button>
      </div>
    </header>
    <ChangePasswordModal open={pwOpen} onClose={() => setPwOpen(false)} />
    </>
  );
}
