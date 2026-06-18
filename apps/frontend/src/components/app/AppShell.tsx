import { useAuth } from "../../lib/auth";
import { roleScope } from "@manga/shared";
import { Sidebar } from "../ui/Sidebar";
import { Header } from "./Header";
import { NAV_BY_ROLE } from "./nav";
import type { ReactNode } from "react";

export function AppShell({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  if (!user) return null;
  return (
    <div data-role={roleScope(user.role)} className="min-h-screen bg-bg text-ink flex">
      <Sidebar items={NAV_BY_ROLE[user.role]} />
      <div className="min-w-0 flex-1 flex flex-col">
        <Header />
        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}
