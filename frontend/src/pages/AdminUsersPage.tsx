import { useEffect, useMemo, useState } from 'react';
import { AppLayout } from '../layouts/AppLayout';
import {
  getUsers,
  updateUserRole,
  type AdminUser,
  type UserRole,
} from '../features/users/users.api';
import './AdminUsersPage.css';

const roleLabels: Record<UserRole, string> = {
  ADMIN: 'Admin',
  MANGAKA: 'Mangaka',
  ASSISTANT: 'Assistant',
  TANTOU_EDITOR: 'Tantou Editor',
  EDITORIAL_BOARD: 'Editorial Board',
};

const roles: UserRole[] = [
  'ADMIN',
  'MANGAKA',
  'ASSISTANT',
  'TANTOU_EDITOR',
  'EDITORIAL_BOARD',
];

export function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [message, setMessage] = useState('Đang tải danh sách user...');
  const [updatingUserId, setUpdatingUserId] = useState<number | null>(null);

  async function loadUsers() {
    setMessage('Đang tải danh sách user...');

    try {
      const data = await getUsers();

      setUsers(data);
      setMessage('');
    } catch {
      setMessage('Không tải được users. Kiểm tra backend /users.');
    }
  }

  useEffect(() => {
    loadUsers();
  }, []);

  const summary = useMemo(() => {
    return {
      total: users.length,
      admins: users.filter((user) => user.role === 'ADMIN').length,
      creators: users.filter((user) => user.role === 'MANGAKA').length,
      assistants: users.filter((user) => user.role === 'ASSISTANT').length,
    };
  }, [users]);

  async function handleRoleChange(user: AdminUser, role: UserRole) {
    if (user.role === role) {
      return;
    }

    setUpdatingUserId(user.id);
    setMessage(`Đang đổi role cho ${user.email}...`);

    try {
      await updateUserRole(user.id, role);
      setMessage('Đổi role thành công.');
      await loadUsers();
    } catch {
      setMessage('Đổi role thất bại. Kiểm tra API PATCH /users/:id.');
    } finally {
      setUpdatingUserId(null);
    }
  }

  function formatDate(value?: string) {
    if (!value) {
      return 'No date';
    }

    return new Date(value).toLocaleString('vi-VN');
  }

  return (
    <AppLayout
      title="User Management"
      subtitle="Manage MangaFlow accounts, roles and access permissions."
    >
      <section className="admin-users-page">
        <div className="admin-summary-grid">
          <article className="admin-summary-card highlight">
            <span>Total users</span>
            <strong>{summary.total.toString().padStart(2, '0')}</strong>
            <p>All registered accounts</p>
          </article>

          <article className="admin-summary-card">
            <span>Admins</span>
            <strong>{summary.admins.toString().padStart(2, '0')}</strong>
            <p>System managers</p>
          </article>

          <article className="admin-summary-card">
            <span>Mangaka</span>
            <strong>{summary.creators.toString().padStart(2, '0')}</strong>
            <p>Manga creators</p>
          </article>

          <article className="admin-summary-card">
            <span>Assistants</span>
            <strong>{summary.assistants.toString().padStart(2, '0')}</strong>
            <p>Production assistants</p>
          </article>
        </div>

        <section className="admin-toolbar-card">
          <div>
            <span className="v5-kicker">Admin</span>
            <h2>Account and role control</h2>
            <p>
              Review user accounts and update role access for each MangaFlow
              member.
            </p>
          </div>

          <button type="button" onClick={loadUsers}>
            Refresh
          </button>
        </section>

        {message && (
          <section className="admin-message-card">
            <p>{message}</p>
          </section>
        )}

        <section className="admin-user-list">
          {users.length === 0 && !message && (
            <article className="admin-message-card">
              <p>Chưa có user nào.</p>
            </article>
          )}

          {users.map((user) => (
            <article key={user.id} className="admin-user-card">
              <div className="admin-user-main">
                <span>USER #{user.id}</span>
                <h3>{user.displayName || user.email}</h3>
                <p>{user.email}</p>
              </div>

              <div className="admin-user-meta">
                <div>
                  <span>Current role</span>
                  <strong>{roleLabels[user.role] ?? user.role}</strong>
                </div>

                <div>
                  <span>Status</span>
                  <strong>{user.isActive === false ? 'Inactive' : 'Active'}</strong>
                </div>

                <div>
                  <span>Created at</span>
                  <strong>{formatDate(user.createdAt)}</strong>
                </div>
              </div>

              <div className="admin-user-actions">
                <label htmlFor={`role-${user.id}`}>Role</label>

                <select
                  id={`role-${user.id}`}
                  value={user.role}
                  disabled={updatingUserId === user.id}
                  onChange={(event) =>
                    handleRoleChange(user, event.target.value as UserRole)
                  }
                >
                  {roles.map((role) => (
                    <option key={role} value={role}>
                      {roleLabels[role]}
                    </option>
                  ))}
                </select>
              </div>
            </article>
          ))}
        </section>
      </section>
    </AppLayout>
  );
}