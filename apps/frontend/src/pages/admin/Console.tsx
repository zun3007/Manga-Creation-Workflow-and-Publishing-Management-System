import { useState, useEffect, type FormEvent } from "react";
import { Role } from "@manga/shared";
import { api, apiErrorMessage } from "../../lib/api";
import { useToast } from "../../components/ui/Toast";
import { useConfirm } from "../../lib/confirm";
import type { AdminUser } from "../../types";
import { Panel } from "../../components/ui/Panel";
import { Button } from "../../components/ui/Button";
import { EmptyState } from "../../components/ui/EmptyState";
import { roleLabel } from "../../lib/roleLabel";

const creatableRoles = [
  Role.MANGAKA,
  Role.ASSISTANT,
  Role.TANTOU_EDITOR,
  Role.EDITORIAL_BOARD,
] as const;

type CreateUserForm = {
  fullName: string;
  email: string;
  password: string;
  role: (typeof creatableRoles)[number];
};

const emptyCreateForm: CreateUserForm = {
  fullName: "",
  email: "",
  password: "",
  role: Role.ASSISTANT,
};

export default function Console() {
  const toast = useToast();
  const { confirm } = useConfirm();
  const [overview, setOverview] = useState<Record<string, number> | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");
  const [savingId, setSavingId] = useState<number | null>(null);
  const [creating, setCreating] = useState(false);
  const [createForm, setCreateForm] = useState<CreateUserForm>(emptyCreateForm);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    setError("");
    try {
      const [overviewRes, usersRes] = await Promise.all([
        api.get("/admin/overview"),
        api.get<AdminUser[]>("/admin/users"),
      ]);
      setOverview(overviewRes.data);
      setUsers(usersRes.data || []);
    } catch (e) {
      console.error("Failed to load admin data", e);
      setError("Không thể tải dữ liệu quản trị. Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  }

  async function save(id: number, patch: Partial<AdminUser>) {
    setSavingId(id);
    setActionError("");

    // Confirm on deactivate
    if (patch.isActivated === false) {
      if (!(await confirm({ title: 'Khoá (vô hiệu hoá) người dùng này?', tone: 'danger' }))) {
        setSavingId(null);
        return;
      }
    }

    try {
      await api.patch(`/admin/users/${id}`, patch);
      setUsers((prev) =>
        prev.map((u) => (u.id === id ? { ...u, ...patch } : u))
      );
      toast.success('Đã cập nhật người dùng.');
    } catch (e: any) {
      const message =
        e?.response?.data?.message || "Không thể cập nhật người dùng.";
      setActionError(message);
      console.error("Failed to save user", e);
    } finally {
      setSavingId(null);
    }
  }

  async function createUser(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setCreating(true);
    setActionError("");

    try {
      await api.post("/admin/users", {
        ...createForm,
        email: createForm.email.trim(),
        fullName: createForm.fullName.trim(),
      });
      setCreateForm(emptyCreateForm);
      await loadData();
      toast.success("Đã tạo tài khoản nội bộ.");
    } catch (e) {
      setActionError(apiErrorMessage(e, "Không thể tạo tài khoản."));
      console.error("Failed to create user", e);
    } finally {
      setCreating(false);
    }
  }

  if (loading) {
    return (
      <div className="p-8">
        <h1 className="text-3xl text-ink mb-6">Quản trị hệ thống</h1>
        <Panel className="p-6 text-ink-soft">Đang tải…</Panel>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8">
        <h1 className="text-3xl text-ink mb-6">Quản trị hệ thống</h1>
        <Panel className="p-4 bg-danger/10 border-danger/20 text-danger">
          {error}
        </Panel>
      </div>
    );
  }

  return (
    <div className="p-8">
      <h1 className="text-3xl text-ink mb-6">Quản trị hệ thống</h1>

      {/* Overview Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: "Người dùng", key: "users" },
          { label: "Hoạ sĩ", key: "mangaka" },
          { label: "Trợ lý", key: "assistants" },
          { label: "Biên tập", key: "editors" },
          { label: "Series", key: "series" },
          { label: "Chương", key: "chapters" },
          { label: "Đề xuất", key: "proposals" },
          { label: "Việc", key: "openTasks" },
        ].map(({ label, key }) => (
          <Panel key={key} className="p-4 text-center">
            <p className="text-2xl font-semibold text-accent">
              {overview?.[key] ?? 0}
            </p>
            <p className="text-sm text-ink-soft mt-1">{label}</p>
          </Panel>
        ))}
      </div>

      {/* Action Error */}
      {actionError && (
        <Panel className="mb-6 p-4 bg-danger/10 border-danger/20 text-danger">
          {actionError}
        </Panel>
      )}

      {/* Create Account */}
      <Panel className="mb-8 p-6">
        <div className="mb-5">
          <h2 className="text-xl font-semibold text-ink">Tạo tài khoản nội bộ</h2>
          <p className="text-sm text-ink-soft mt-1">
            Chỉ admin được tạo tài khoản. Hệ thống giữ đúng 1 admin nên không cho tạo thêm role ADMIN.
          </p>
        </div>
        <form onSubmit={createUser} className="grid grid-cols-1 lg:grid-cols-5 gap-4 items-end">
          <label className="block lg:col-span-1">
            <span className="block text-sm font-semibold text-ink mb-2">Họ tên</span>
            <input
              value={createForm.fullName}
              onChange={(e) =>
                setCreateForm((prev) => ({ ...prev, fullName: e.target.value }))
              }
              required
              minLength={2}
              maxLength={100}
              className="w-full px-3 py-2 rounded border border-line bg-surface text-ink"
              placeholder="VD: Nguyễn Văn A"
            />
          </label>
          <label className="block lg:col-span-1">
            <span className="block text-sm font-semibold text-ink mb-2">Email</span>
            <input
              type="email"
              value={createForm.email}
              onChange={(e) =>
                setCreateForm((prev) => ({ ...prev, email: e.target.value }))
              }
              required
              maxLength={255}
              className="w-full px-3 py-2 rounded border border-line bg-surface text-ink"
              placeholder="name@inkframe.studio"
            />
          </label>
          <label className="block lg:col-span-1">
            <span className="block text-sm font-semibold text-ink mb-2">Mật khẩu</span>
            <input
              type="password"
              value={createForm.password}
              onChange={(e) =>
                setCreateForm((prev) => ({ ...prev, password: e.target.value }))
              }
              required
              minLength={8}
              maxLength={72}
              className="w-full px-3 py-2 rounded border border-line bg-surface text-ink"
              placeholder="Tối thiểu 8 ký tự"
            />
          </label>
          <label className="block lg:col-span-1">
            <span className="block text-sm font-semibold text-ink mb-2">Vai trò</span>
            <select
              value={createForm.role}
              onChange={(e) =>
                setCreateForm((prev) => ({
                  ...prev,
                  role: e.target.value as CreateUserForm["role"],
                }))
              }
              className="w-full px-3 py-2 rounded border border-line bg-surface text-ink"
            >
              {creatableRoles.map((role) => (
                <option key={role} value={role}>
                  {roleLabel(role)}
                </option>
              ))}
            </select>
          </label>
          <Button type="submit" loading={creating} className="lg:col-span-1 h-10">
            Tạo tài khoản
          </Button>
        </form>
      </Panel>

      {/* Users Table */}
      {users.length === 0 ? (
        <EmptyState title="Chưa có người dùng." />
      ) : (
        <Panel className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line bg-bg">
                <th className="p-4 text-left font-semibold text-ink">Tên</th>
                <th className="p-4 text-left font-semibold text-ink">Email</th>
                <th className="p-4 text-left font-semibold text-ink">
                  Vai trò
                </th>
                <th className="p-4 text-left font-semibold text-ink">
                  Trạng thái
                </th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => {
                const isActivated = user.isActivated === true || user.isActivated === 1;
                const isSaving = savingId === user.id;
                const isAdmin = user.role === Role.ADMIN;
                const roleOptions = isAdmin ? [Role.ADMIN] : creatableRoles;
                return (
                  <tr key={user.id} className="border-b border-line hover:bg-bg">
                    <td className="p-4 text-ink">{user.name}</td>
                    <td className="p-4 text-ink-soft">{user.email}</td>
                    <td className="p-4">
                      <select
                        value={user.role}
                        onChange={(e) =>
                          save(user.id, { role: e.target.value as AdminUser["role"] })
                        }
                        disabled={isSaving || isAdmin}
                        className="px-3 py-1 rounded border border-line bg-surface text-ink text-sm cursor-pointer disabled:opacity-50"
                      >
                        {roleOptions.map((role) => (
                          <option key={role} value={role}>
                            {roleLabel(role)}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="p-4">
                      <Button
                        variant="soft"
                        onClick={() =>
                          save(user.id, { isActivated: !isActivated })
                        }
                        disabled={isSaving || isAdmin}
                        className="text-xs w-24"
                      >
                        {isAdmin ? "Admin chính" : isActivated ? "Khoá" : "Mở khoá"}
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Panel>
      )}
    </div>
  );
}
