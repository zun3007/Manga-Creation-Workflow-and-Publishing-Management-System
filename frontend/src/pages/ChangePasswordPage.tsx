import { useState } from "react";
import type { FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { changePassword } from "../features/auth/auth.api";
import "./ChangePasswordPage.css";

export function ChangePasswordPage() {
  const navigate = useNavigate();

  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (newPassword.length < 6) {
      setMessage("Mật khẩu mới phải có ít nhất 6 ký tự.");
      return;
    }

    if (oldPassword === newPassword) {
      setMessage("Mật khẩu mới phải khác mật khẩu hiện tại.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setMessage("Mật khẩu xác nhận chưa khớp.");
      return;
    }

    setIsSubmitting(true);
    setMessage("");

    try {
      const data = await changePassword({
        oldPassword,
        newPassword,
      });

      localStorage.setItem("accessToken", data.accessToken);
      localStorage.setItem("user", JSON.stringify(data.user));

      setMessage("Đổi mật khẩu thành công. Đang chuyển vào hệ thống...");

      setTimeout(() => {
        navigate("/dashboard", { replace: true });
      }, 700);
    } catch {
      setMessage("Đổi mật khẩu thất bại. Vui lòng kiểm tra mật khẩu hiện tại.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="change-password-shell">
      <section className="change-password-window">
        <section className="change-password-content">
          <aside className="change-password-illustration">
            <div className="security-chip">🔐 Security</div>

            <h1>Set a new password.</h1>
            <p>Protect your account before entering the studio.</p>

            <div className="bunny-face">
              <span className="bunny-ear bunny-ear-left" />
              <span className="bunny-ear bunny-ear-right" />
              <span className="bunny-eye bunny-eye-left" />
              <span className="bunny-eye bunny-eye-right" />
            </div>

            <div className="green-hill" />
          </aside>

          <section className="change-password-form-panel">
            <div className="change-password-form-wrap">
              <h2>Change password</h2>
              <p>Create a secure password to continue.</p>

              <form className="change-password-form" onSubmit={handleSubmit}>
                <input
                  type="password"
                  value={oldPassword}
                  placeholder="Current password"
                  onChange={(event) => setOldPassword(event.target.value)}
                  required
                />

                <input
                  type="password"
                  value={newPassword}
                  placeholder="New password"
                  onChange={(event) => setNewPassword(event.target.value)}
                  required
                />

                <input
                  type="password"
                  value={confirmPassword}
                  placeholder="Confirm new password"
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  required
                />

                {message && <p className="change-password-message">{message}</p>}

                <button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? "Updating..." : "Update password"}
                </button>
              </form>
            </div>
          </section>
        </section>
      </section>
    </main>
  );
}