import { useEffect, useMemo, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import { AppLayout } from "../layouts/AppLayout";
import {
  changeMyPassword,
  getMyProfile,
  updateMyProfile,
  uploadMyAvatar,
} from "../features/profile/profile.api";
import type { ProfileUser, UpdateProfilePayload } from "../types/profile";
import "./ProfilePage.css";

type ProfileForm = {
  displayName: string;
  penName: string;
  biography: string;
  yearsExperience: string;
  studioName: string;
  skillSet: string;
  departmentName: string;
  specialization: string;
};

type PasswordForm = {
  oldPassword: string;
  newPassword: string;
  confirmPassword: string;
};

const emptyProfileForm: ProfileForm = {
  displayName: "",
  penName: "",
  biography: "",
  yearsExperience: "0",
  studioName: "",
  skillSet: "",
  departmentName: "",
  specialization: "",
};

const roleLabels: Record<string, string> = {
  ADMIN: "Admin",
  MANGAKA: "Mangaka",
  ASSISTANT: "Assistant",
  TANTOU_EDITOR: "Tantou Editor",
  EDITORIAL_BOARD: "Editorial Board",
};

function resolveAvatarUrl(avatarUrl?: string | null) {
  if (!avatarUrl) {
    return "";
  }

  if (avatarUrl.startsWith("http")) {
    return avatarUrl;
  }

  return `http://localhost:3000${avatarUrl}`;
}

function getInitialName(name?: string) {
  return name?.trim()?.charAt(0)?.toUpperCase() || "U";
}

function saveUserToLocalStorage(profile: ProfileUser) {
  const currentText = localStorage.getItem("user");
  let currentUser = {};

  try {
    currentUser = currentText ? JSON.parse(currentText) : {};
  } catch {
    currentUser = {};
  }

  localStorage.setItem(
    "user",
    JSON.stringify({
      ...currentUser,
      id: profile.id,
      email: profile.email,
      displayName: profile.displayName,
      avatarUrl: profile.avatarUrl,
      role: profile.role,
      mustChangePassword: profile.mustChangePassword,
    }),
  );
}

export function ProfilePage() {
  const [profile, setProfile] = useState<ProfileUser | null>(null);
  const [form, setForm] = useState<ProfileForm>(emptyProfileForm);
  const [passwordForm, setPasswordForm] = useState<PasswordForm>({
    oldPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [message, setMessage] = useState("");

  async function loadProfile() {
    setLoading(true);
    setMessage("");

    try {
      const data = await getMyProfile();
      setProfile(data);
      saveUserToLocalStorage(data);

      setForm({
        displayName: data.displayName ?? "",
        penName: data.mangakaProfile?.penName ?? "",
        biography: data.mangakaProfile?.biography ?? "",
        yearsExperience: String(
          data.mangakaProfile?.yearsExperience ??
            data.tantouEditorProfile?.yearsExperience ??
            data.editorialBoardProfile?.yearsExperience ??
            0,
        ),
        studioName: data.mangakaProfile?.studioName ?? "",
        skillSet: data.assistantProfile?.skillSet ?? "",
        departmentName:
          data.tantouEditorProfile?.departmentName ??
          data.editorialBoardProfile?.departmentName ??
          "",
        specialization:
          data.tantouEditorProfile?.specialization ??
          data.editorialBoardProfile?.specialization ??
          "",
      });
    } catch {
      setMessage(
        "Không tải được thông tin cá nhân. Em kiểm tra lại token hoặc backend.",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadProfile();
  }, []);

  const avatarUrl = useMemo(() => {
    return resolveAvatarUrl(profile?.avatarUrl);
  }, [profile]);

  function updateField(name: keyof ProfileForm, value: string) {
    setForm((current) => ({
      ...current,
      [name]: value,
    }));
  }

  function updatePasswordField(name: keyof PasswordForm, value: string) {
    setPasswordForm((current) => ({
      ...current,
      [name]: value,
    }));
  }

  async function handleAvatarChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    if (!file.type.startsWith("image/")) {
      setMessage("Avatar phải là file ảnh.");
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setMessage("Avatar tối đa 2MB.");
      return;
    }

    setUploadingAvatar(true);
    setMessage("");

    try {
      const updatedProfile = await uploadMyAvatar(file);
      setProfile(updatedProfile);
      saveUserToLocalStorage(updatedProfile);
      setMessage("Cập nhật avatar thành công.");
    } catch {
      setMessage(
        "Upload avatar thất bại. Kiểm tra backend hoặc kích thước ảnh.",
      );
    } finally {
      setUploadingAvatar(false);
      event.target.value = "";
    }
  }

  async function handleSaveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!form.displayName.trim()) {
      setMessage("Display name không được để trống.");
      return;
    }

    const payload: UpdateProfilePayload = {
      displayName: form.displayName.trim(),
    };

    if (profile?.role === "MANGAKA") {
      payload.penName = form.penName.trim();
      payload.biography = form.biography.trim();
      payload.studioName = form.studioName.trim();
      payload.yearsExperience = Number(form.yearsExperience || 0);
    }

    if (profile?.role === "ASSISTANT") {
      payload.skillSet = form.skillSet.trim();
    }

    if (
      profile?.role === "TANTOU_EDITOR" ||
      profile?.role === "EDITORIAL_BOARD"
    ) {
      payload.departmentName = form.departmentName.trim();
      payload.specialization = form.specialization.trim();
      payload.yearsExperience = Number(form.yearsExperience || 0);
    }

    setSavingProfile(true);
    setMessage("");

    try {
      const updatedProfile = await updateMyProfile(payload);
      setProfile(updatedProfile);
      saveUserToLocalStorage(updatedProfile);
      setMessage("Cập nhật thông tin cá nhân thành công.");
    } catch {
      setMessage("Cập nhật thất bại. Em kiểm tra dữ liệu hoặc backend.");
    } finally {
      setSavingProfile(false);
    }
  }

  async function handleChangePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (passwordForm.newPassword.length < 6) {
      setMessage("Mật khẩu mới cần ít nhất 6 ký tự.");
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setMessage("Xác nhận mật khẩu mới chưa khớp.");
      return;
    }

    if (passwordForm.oldPassword === passwordForm.newPassword) {
      setMessage("Mật khẩu mới phải khác mật khẩu cũ.");
      return;
    }

    setChangingPassword(true);
    setMessage("");

    try {
      const response = await changeMyPassword({
        oldPassword: passwordForm.oldPassword,
        newPassword: passwordForm.newPassword,
      });

      localStorage.setItem("accessToken", response.accessToken);
      localStorage.setItem("user", JSON.stringify(response.user));

      setPasswordForm({
        oldPassword: "",
        newPassword: "",
        confirmPassword: "",
      });

      setMessage("Đổi mật khẩu thành công.");
    } catch {
      setMessage("Đổi mật khẩu thất bại. Mật khẩu cũ có thể chưa đúng.");
    } finally {
      setChangingPassword(false);
    }
  }

  return (
    <AppLayout
      title="Hồ sơ cá nhân"
      subtitle="Cập nhật avatar, thông tin cá nhân và mật khẩu tài khoản."
    >
      <section className="profile-page">
        {message && <div className="profile-message">{message}</div>}

        {loading ? (
          <div className="profile-card">
            <p>Đang tải thông tin cá nhân...</p>
          </div>
        ) : (
          <>
            <section className="profile-hero-card">
              <div className="profile-avatar-wrap">
                <div className="profile-avatar-large">
                  {avatarUrl ? (
                    <img src={avatarUrl} alt="Avatar" />
                  ) : (
                    <span>{getInitialName(profile?.displayName)}</span>
                  )}
                </div>

                <label className="profile-upload-button">
                  {uploadingAvatar ? "Đang upload..." : "Tải avatar"}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarChange}
                    disabled={uploadingAvatar}
                  />
                </label>

                <p>Ảnh tối đa 2MB.</p>
              </div>

              <div className="profile-hero-info">
                <span className="v5-kicker">My profile</span>
                <h2>{profile?.displayName}</h2>
                <p>{profile?.email}</p>

                <div className="profile-badges">
                  <span>
                    {roleLabels[profile?.role ?? ""] ?? profile?.role}
                  </span>
                  <span>{profile?.isActive ? "Active" : "Inactive"}</span>
                </div>
              </div>
            </section>

            <div className="profile-grid">
              <form className="profile-card" onSubmit={handleSaveProfile}>
                <div className="profile-card-header">
                  <div>
                    <span className="v5-kicker">Personal information</span>
                    <h2>Thông tin cá nhân</h2>
                    <p>Cập nhật thông tin hiển thị theo từng vai trò.</p>
                  </div>
                </div>

                <div className="profile-form-grid">
                  <label>
                    <span>Display name</span>
                    <input
                      value={form.displayName}
                      onChange={(event) =>
                        updateField("displayName", event.target.value)
                      }
                      placeholder="Tên hiển thị"
                    />
                  </label>

                  <label>
                    <span>Email</span>
                    <input value={profile?.email ?? ""} disabled />
                  </label>

                  {profile?.role === "MANGAKA" && (
                    <>
                      <label>
                        <span>Pen name</span>
                        <input
                          value={form.penName}
                          onChange={(event) =>
                            updateField("penName", event.target.value)
                          }
                          placeholder="Bút danh"
                        />
                      </label>

                      <label>
                        <span>Studio name</span>
                        <input
                          value={form.studioName}
                          onChange={(event) =>
                            updateField("studioName", event.target.value)
                          }
                          placeholder="Tên studio"
                        />
                      </label>

                      <label>
                        <span>Years experience</span>
                        <input
                          type="number"
                          min="0"
                          value={form.yearsExperience}
                          onChange={(event) =>
                            updateField("yearsExperience", event.target.value)
                          }
                        />
                      </label>

                      <label className="profile-full">
                        <span>Biography</span>
                        <textarea
                          value={form.biography}
                          onChange={(event) =>
                            updateField("biography", event.target.value)
                          }
                          placeholder="Giới thiệu ngắn về tác giả..."
                        />
                      </label>
                    </>
                  )}

                  {profile?.role === "ASSISTANT" && (
                    <label className="profile-full">
                      <span>Skill set</span>
                      <textarea
                        value={form.skillSet}
                        onChange={(event) =>
                          updateField("skillSet", event.target.value)
                        }
                        placeholder="Ví dụ: line art, background, coloring, clean manga page..."
                      />
                    </label>
                  )}

                  {(profile?.role === "TANTOU_EDITOR" ||
                    profile?.role === "EDITORIAL_BOARD") && (
                    <>
                      <label>
                        <span>Department</span>
                        <input
                          value={form.departmentName}
                          onChange={(event) =>
                            updateField("departmentName", event.target.value)
                          }
                          placeholder="Tên phòng ban"
                        />
                      </label>

                      <label>
                        <span>Specialization</span>
                        <input
                          value={form.specialization}
                          onChange={(event) =>
                            updateField("specialization", event.target.value)
                          }
                          placeholder="Chuyên môn"
                        />
                      </label>

                      <label>
                        <span>Years experience</span>
                        <input
                          type="number"
                          min="0"
                          value={form.yearsExperience}
                          onChange={(event) =>
                            updateField("yearsExperience", event.target.value)
                          }
                        />
                      </label>
                    </>
                  )}
                </div>

                <button
                  className="profile-primary-button"
                  type="submit"
                  disabled={savingProfile}
                >
                  {savingProfile ? "Đang lưu..." : "Lưu thông tin"}
                </button>
              </form>

              <form className="profile-card" onSubmit={handleChangePassword}>
                <div className="profile-card-header">
                  <div>
                    <span className="v5-kicker">Security</span>
                    <h2>Đổi mật khẩu</h2>
                    <p>Cập nhật mật khẩu đăng nhập nội bộ.</p>
                  </div>
                </div>

                <div className="profile-form-grid one-column">
                  <label>
                    <span>Mật khẩu cũ</span>
                    <input
                      type="password"
                      value={passwordForm.oldPassword}
                      onChange={(event) =>
                        updatePasswordField("oldPassword", event.target.value)
                      }
                      placeholder="Nhập mật khẩu cũ"
                    />
                  </label>

                  <label>
                    <span>Mật khẩu mới</span>
                    <input
                      type="password"
                      value={passwordForm.newPassword}
                      onChange={(event) =>
                        updatePasswordField("newPassword", event.target.value)
                      }
                      placeholder="Ít nhất 6 ký tự"
                    />
                  </label>

                  <label>
                    <span>Xác nhận mật khẩu mới</span>
                    <input
                      type="password"
                      value={passwordForm.confirmPassword}
                      onChange={(event) =>
                        updatePasswordField(
                          "confirmPassword",
                          event.target.value,
                        )
                      }
                      placeholder="Nhập lại mật khẩu mới"
                    />
                  </label>
                </div>

                <button
                  className="profile-primary-button"
                  type="submit"
                  disabled={changingPassword}
                >
                  {changingPassword ? "Đang đổi..." : "Đổi mật khẩu"}
                </button>
              </form>
            </div>
          </>
        )}
      </section>
    </AppLayout>
  );
}
