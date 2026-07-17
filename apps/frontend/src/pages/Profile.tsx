import { useEffect, useRef, useState } from "react";
import { api } from "../lib/api";
import { useToast } from "../components/ui/Toast";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Panel } from "../components/ui/Panel";
import { Progress } from "../components/ui/Progress";
import { Spinner } from "../components/ui/Spinner";
import { validateUpload } from "../lib/fileValidation";

interface ProfileData {
  id: number;
  email: string;
  fullName: string;
  avatarUrl: string | null;
  role: string;
}

export default function Profile() {
  const toast = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [fullName, setFullName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState("");

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

  async function handleAvatarFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    const v = validateUpload(f, {
      maxMB: 5,
      accept: ["image/png", "image/jpeg", "image/webp", "image/gif"],
    });
    if (!v.ok) {
      setUploadError(v.message);
      return;
    }
    setUploadError("");
    setUploading(true);
    setUploadProgress(0);
    try {
      const fd = new FormData();
      fd.append("file", f);
      const { data } = await api.post<{ url: string }>("/uploads", fd, {
        onUploadProgress: (ev) =>
          setUploadProgress(Math.round((ev.loaded / (ev.total || ev.loaded)) * 100)),
      });
      setAvatarUrl(data.url);
      toast.success("Đã tải ảnh lên — bấm Lưu để áp dụng.");
    } catch (err) {
      console.error("avatar upload failed", err);
      setUploadError("Tải ảnh thất bại. Thử lại nhé.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

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
      <div className="p-8">
        <Panel className="p-6">
          <p className="text-ink-soft">Không tải được hồ sơ</p>
        </Panel>
      </div>
    );
  }

  const hasChanges = fullName !== profile.fullName || avatarUrl !== (profile.avatarUrl || "");

  return (
    <div className="space-y-6 p-8">
      <div>
        <h1 className="text-3xl text-ink">Hồ sơ</h1>
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

        {/* Avatar — upload to self-hosted storage */}
        <div>
          <span className="mb-2 block font-mono text-[0.62rem] uppercase tracking-wider text-ink-soft">
            Ảnh đại diện
          </span>
          <div className="flex items-center gap-4">
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt="Ảnh đại diện"
                className="h-16 w-16 shrink-0 rounded-full border border-line object-cover"
              />
            ) : (
              <div className="grid h-16 w-16 shrink-0 place-items-center rounded-full border border-line bg-bg text-xs text-ink-soft">
                —
              </div>
            )}
            <div className="flex-1">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="sr-only"
                disabled={uploading}
                onChange={handleAvatarFile}
              />
              <Button
                type="button"
                variant="soft"
                loading={uploading}
                onClick={() => fileInputRef.current?.click()}
              >
                Tải ảnh lên
              </Button>
              {uploading && (
                <div className="mt-2">
                  <Progress value={uploadProgress} max={100} />
                </div>
              )}
              {uploadError && <p className="mt-1 text-sm text-danger">{uploadError}</p>}
            </div>
          </div>
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

        {/* Avatar URL (advanced / fallback — auto-filled by upload above) */}
        <div>
          <Input
            label="URL ảnh đại diện"
            type="text"
            value={avatarUrl}
            onChange={(e) => setAvatarUrl(e.target.value)}
            maxLength={500}
            placeholder="/uploads/… hoặc https://…"
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
