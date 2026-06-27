import type { ReactNode } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import "./AppLayout.css";

type AppLayoutProps = {
  children: ReactNode;
  title: string;
  subtitle: string;
};

type NavItem = {
  icon: string;
  label: string;
  path: string;
  roles?: string[];
};

const navItems: NavItem[] = [
  {
    icon: "🏠",
    label: "Overview",
    path: "/dashboard",
  },
  {
    icon: "📝",
    label: "Proposal",
    path: "/mangaka/proposals",
    roles: ["MANGAKA"],
  },
  {
    icon: "📚",
    label: "Series",
    path: "/mangaka/series",
    roles: ["MANGAKA"],
  },
  {
    icon: "🧩",
    label: "Chapter",
    path: "/mangaka/chapters",
    roles: ["MANGAKA"],
  },
  {
    icon: "🖼️",
    label: "Pages",
    path: "/mangaka/pages",
    roles: ["MANGAKA"],
  },
  {
    icon: "✅",
    label: "My Tasks",
    path: "/assistant/tasks",
    roles: ["ASSISTANT"],
  },
  {
    icon: "✅",
    label: "Tasks",
    path: "/mangaka/tasks",
    roles: ["MANGAKA"],
  },
  {
    icon: "📊",
    label: "Production",
    path: "/editor/production",
    roles: ["TANTOU_EDITOR"],
  },
  {
    icon: "🔎",
    label: "Review",
    path: "/mangaka/review",
    roles: ["MANGAKA"],
  },
  {
    icon: "🔎",
    label: "Review",
    path: "/editor/review",
    roles: ["TANTOU_EDITOR"],
  },
  {
    icon: "📮",
    label: "Submissions",
    path: "/assistant/submissions",
    roles: ["ASSISTANT"],
  },
  {
    icon: "🏛️",
    label: "Decision Center",
    path: "/board/proposals",
    roles: ["EDITORIAL_BOARD"],
  },
  {
    icon: "⭐",
    label: "Ranking",
    path: "/board/ranking",
    roles: ["EDITORIAL_BOARD"],
  },
  {
    icon: "💰",
    label: "Earnings",
    path: "/assistant/earnings",
    roles: ["ASSISTANT"],
  },
  {
    icon: "🔔",
    label: "Notifications",
    path: "/notifications",
  },
  {
    icon: "👥",
    label: "Team",
    path: "/team",
    roles: ["MANGAKA", "TANTOU_EDITOR"],
  },
  {
    icon: "📦",
    label: "Assets",
    path: "/assets",
  },
];

export function AppLayout({ children, title, subtitle }: AppLayoutProps) {
  const navigate = useNavigate();
  const location = useLocation();

  const userText = localStorage.getItem("user");
  const user = userText ? JSON.parse(userText) : null;
  const userRole = user?.role ?? "GUEST";

  function handleLogout() {
    localStorage.clear();
    navigate("/");
  }

  function resolveAvatarUrl(avatarUrl?: string | null) {
    if (!avatarUrl) {
      return "";
    }

    if (avatarUrl.startsWith("http")) {
      return avatarUrl;
    }

    return `http://localhost:3000${avatarUrl}`;
  }

  function isAllowed(item: NavItem) {
    if (!item.roles) {
      return true;
    }

    return item.roles.includes(userRole);
  }

  return (
    <div className="mf-v5-page">
      <div className="app">
        <aside className="app-side">
          <div className="app-logo" onClick={() => navigate("/dashboard")}>
            <div className="mini">🐾</div>

            <div>
              MangaFlow
              <br />
              <small>Forest Studio</small>
            </div>
          </div>

          <nav>
            {navItems.filter(isAllowed).map((item) => (
              <button
                key={`${item.label}-${item.path}`}
                type="button"
                className={
                  location.pathname === item.path
                    ? "side-link active"
                    : "side-link"
                }
                onClick={() => navigate(item.path)}
              >
                <span>{item.icon}</span>
                <span>{item.label}</span>
              </button>
            ))}
          </nav>
        </aside>

        <main className="app-main">
          <div className="topbar">
            <div>
              <span className="badge orange">{userRole}</span>
              <h2>{title}</h2>
              <p className="mf-v5-subtitle">{subtitle}</p>
            </div>

            <div className="right">
              <div className="search">
                <span>⌕</span>
                <input placeholder="Search..." />
              </div>

              <button
                className="avatar"
                type="button"
                onClick={() => navigate("/profile")}
                title="Open profile"
              >
                {user?.avatarUrl ? (
                  <img src={resolveAvatarUrl(user.avatarUrl)} alt="Avatar" />
                ) : (
                  (user?.displayName?.charAt(0)?.toUpperCase() ?? "U")
                )}
              </button>

              <button
                className="btn mf-v5-logout"
                type="button"
                onClick={handleLogout}
              >
                Logout
              </button>
            </div>
          </div>

          {children}
        </main>
      </div>
    </div>
  );
}
