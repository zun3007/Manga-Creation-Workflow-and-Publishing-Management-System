import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { useToast } from "../components/ui/Toast";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Panel } from "../components/ui/Panel";
import { Spinner } from "../components/ui/Spinner";

interface ProfileData {
  id: number;
  email: string;
  fullName: string;
  avatarUrl: string | null;
  role: string;
}

export default function Profile() {
  const toast = useToast();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [fullName, setFullName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");

  useEffect(() => {
    async function fetchProfile() {
      try {
        setLoading(true);
        const { data } = await api.get<ProfileData>("/users/me");
        setProfile(data);
        setFullName(data.fullName);
        setAvatarUrl(data.avatarUrl || "");
      } catch (err) {
        console.error("Failed to fetch profile:", err);
        toast.error("Không tải được hồ sơ");
      } finally {
        setLoading(false);
      }
    }
    fetchProfile();
  }, [toast]);

  async function handleSave() {
    if (!profile) return;

    try {
      setSaving(true);
      const { data } = await api.patch<ProfileData>("/users/me", {
        fullName: fullName !== profile.fullName ? fullName : undefined,
        avatarUrl: avatarUrl !== (profile.avatarUrl || "") ? avatarUrl : undefined,
      });
      setProfile(data);
      setFullName(data.fullName);
      setAvatarUrl(data.avatarUrl || "");
      toast.success("Đã lưu hồ sơ.");
    } catch (err) {
      console.error("Failed to save profile:", err);
      toast.error("Không lưu được hồ sơ");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Spinner size={32} />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="p-6">
        <Panel className="p-6">
          <p className="text-ink-soft">Không tải được hồ sơ</p>
        </Panel>
      </div>
    );
  }

  const hasChanges = fullName !== profile.fullName || avatarUrl !== (profile.avatarUrl || "");

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold text-ink">Hồ sơ</h1>
        <p className="mt-1 text-sm text-ink-soft">Quản lý thông tin cá nhân của bạn</p>
      </div>

      <Panel className="space-y-6 p-6">
        {/* Email (read-only) */}
        <div>
          <label className="block">
            <span className="mb-1 block font-mono text-[0.62rem] uppercase tracking-wider text-ink-soft">
              Email
            </span>
            <input
              type="email"
              disabled
              value={profile.email}
              className="w-full rounded-[calc(var(--app-radius)*0.6)] border border-line bg-bg px-3 py-2 text-ink-soft outline-none"
            />
          </label>
          <p className="mt-1 text-xs text-ink-soft">Không thể thay đổi</p>
        </div>

        {/* Role (read-only) */}
        <div>
          <label className="block">
            <span className="mb-1 block font-mono text-[0.62rem] uppercase tracking-wider text-ink-soft">
              Vai trò
            </span>
            <input
              type="text"
              disabled
              value={profile.role}
              className="w-full rounded-[calc(var(--app-radius)*0.6)] border border-line bg-bg px-3 py-2 text-ink-soft outline-none"
            />
          </label>
        </div>

        {/* Full Name */}
        <div>
          <Input
            label="Họ và tên"
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            maxLength={120}
            placeholder="Nhập họ và tên"
          />
        </div>

        {/* Avatar URL */}
        <div>
          <Input
            label="URL ảnh đại diện"
            type="url"
            value={avatarUrl}
            onChange={(e) => setAvatarUrl(e.target.value)}
            maxLength={500}
            placeholder="https://example.com/avatar.jpg"
          />
        </div>

        {/* Save Button */}
        <div className="flex gap-3">
          <Button
            variant="accent"
            disabled={!hasChanges}
            loading={saving}
            onClick={handleSave}
          >
            Lưu thay đổi
          </Button>
        </div>
      </Panel>
    </div>
  );
}
