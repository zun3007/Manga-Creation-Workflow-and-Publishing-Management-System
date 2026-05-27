import { useState } from 'react';
import {
  LayoutGrid,
  BookOpen,
  Layers,
  CheckSquare,
  UploadCloud,
  Trophy,
  LogOut,
} from 'lucide-react';
import { useAuth } from '../../lib/auth';

const NAV = [
  { icon: LayoutGrid, label: 'Studio' },
  { icon: BookOpen, label: 'Series' },
  { icon: Layers, label: 'Chapters' },
  { icon: CheckSquare, label: 'Tasks' },
  { icon: UploadCloud, label: 'Submissions' },
  { icon: Trophy, label: 'Ranking' },
];

function initials(name: string) {
  return name
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

export function Sidebar() {
  const { user, logout } = useAuth();
  const [active, setActive] = useState('Studio');

  return (
    <aside className="sticky top-0 flex h-screen w-60 shrink-0 flex-col border-r-2 border-ink bg-paper-2">
      <div className="flex items-center gap-3 border-b-2 border-ink px-5 py-5">
        <span className="grid h-9 w-9 place-items-center border-2 border-vermilion font-display text-xl text-vermilion">
          墨
        </span>
        <span className="font-display text-xl">
          Ink<span className="text-vermilion">frame</span>
        </span>
      </div>

      <nav className="flex-1 px-3 py-5">
        <p className="label px-2 pb-2">Studio</p>
        {NAV.map(({ icon: Icon, label }) => {
          const on = active === label;
          return (
            <button
              key={label}
              onClick={() => setActive(label)}
              className={`relative mb-1 flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm transition-colors ${
                on ? 'bg-ink font-bold text-paper' : 'text-ink-2 hover:bg-paper-3'
              }`}
            >
              {on && <span className="absolute left-0 top-0 h-full w-1 bg-vermilion" />}
              <Icon size={18} />
              {label}
            </button>
          );
        })}
      </nav>

      <div className="border-t-2 border-ink p-3">
        <div className="flex items-center gap-3 px-2 py-2">
          <span className="grid h-9 w-9 place-items-center bg-ink font-mono text-xs text-paper">
            {user ? initials(user.name) : '–'}
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-bold">{user?.name}</p>
            <p className="label leading-none">{user?.role}</p>
          </div>
        </div>
        <button
          onClick={logout}
          className="mt-2 flex w-full items-center gap-2 px-3 py-2 text-sm text-ink-3 transition-colors hover:bg-vermilion hover:text-paper"
        >
          <LogOut size={16} />
          Đăng xuất
        </button>
      </div>
    </aside>
  );
}
