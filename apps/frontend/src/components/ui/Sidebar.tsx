import { NavLink } from "react-router-dom";
import type { ComponentType } from "react";

export interface NavItem {
  label: string;
  to: string;
  icon?: ComponentType<{ size?: number }>;
  end?: boolean;
}

export function Sidebar({ items, brand = "Manga Studio" }: { items: NavItem[]; brand?: string }) {
  return (
    <aside className="flex w-60 shrink-0 flex-col border-r border-line bg-surface p-4">
      <div className="mb-6 px-2 font-display text-lg text-ink">{brand}</div>
      <nav className="flex flex-col gap-1">
        {items.map((it) => (
          <NavLink
            key={it.to}
            to={it.to}
            end={it.end}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-[calc(var(--app-radius)*0.66)] px-3 py-2 text-sm transition ${
                isActive ? "bg-accent/12 text-accent font-semibold" : "text-ink hover:bg-bg"
              }`
            }
          >
            {it.icon && <it.icon size={18} />}
            {it.label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
