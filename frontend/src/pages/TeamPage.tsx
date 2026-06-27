import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "../layouts/AppLayout";
import {
  getAssistantOptions,
  type AssistantOption,
} from "../features/team/team.api";
import "./TeamPage.css";

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
  return name?.trim()?.charAt(0)?.toUpperCase() || "A";
}

function formatMoney(value?: number | null) {
  return Number(value ?? 0).toLocaleString("vi-VN") + "đ";
}

export function TeamPage() {
  const navigate = useNavigate();

  const userText = localStorage.getItem("user");
  const user = userText ? JSON.parse(userText) : null;
  const userRole = user?.role ?? "GUEST";

  const [assistants, setAssistants] = useState<AssistantOption[]>([]);
  const [selectedAssistantId, setSelectedAssistantId] = useState<number | null>(
    null,
  );
  const [message, setMessage] = useState("Đang tải danh sách assistant...");

  async function loadAssistants() {
    setMessage("Đang tải danh sách assistant...");

    try {
      const data = await getAssistantOptions();

      setAssistants(data);
      setMessage("");

      if (data.length > 0 && selectedAssistantId === null) {
        setSelectedAssistantId(data[0].id);
      }
    } catch {
      setMessage(
        "Không tải được danh sách assistant. Kiểm tra API /tasks/assistant-options.",
      );
    }
  }

  useEffect(() => {
    loadAssistants();
  }, []);

  const selectedAssistant = useMemo(() => {
    return (
      assistants.find((assistant) => assistant.id === selectedAssistantId) ??
      null
    );
  }, [assistants, selectedAssistantId]);

  function handlePrepareAssignment() {
    if (!selectedAssistant) {
      setMessage("Vui lòng chọn assistant trước.");
      return;
    }

    if (userRole === "MANGAKA") {
      localStorage.setItem("preferredAssistantId", String(selectedAssistant.id));
      localStorage.setItem(
        "preferredAssistantName",
        selectedAssistant.displayName,
      );

      navigate("/mangaka/pages");
      return;
    }

    if (userRole === "TANTOU_EDITOR") {
      navigate("/editor/production");
      return;
    }

    setMessage("Role hiện tại không có quyền thao tác Team.");
  }

  return (
    <AppLayout
      title="Team"
      subtitle="Manage assistant members and prepare task assignment."
    >
      <main className="team-page">
        <section className="team-summary-grid">
          <article className="team-summary-card highlight">
            <span>Total assistants</span>
            <strong>{assistants.length.toString().padStart(2, "0")}</strong>
            <p>Available for task assignment</p>
          </article>

          <article className="team-summary-card">
            <span>Selected member</span>
            <strong>{selectedAssistant ? selectedAssistant.id : "--"}</strong>
            <p>{selectedAssistant?.displayName ?? "No assistant selected"}</p>
          </article>
        </section>

        <section className="team-workspace">
          <section className="team-list-card">
            <div className="section-chip">Assistant members</div>

            <div className="team-card-heading">
              <h2>Studio Team</h2>
              <p>Danh sách assistant có thể nhận task từ Mangaka.</p>
            </div>

            {message && <p className="team-message">{message}</p>}

            <div className="team-list">
              {assistants.length === 0 && !message && (
                <p className="empty-text">Chưa có assistant nào.</p>
              )}

              {assistants.map((assistant) => {
                const avatarUrl = resolveAvatarUrl(assistant.avatarUrl);

                return (
                  <button
                    key={assistant.id}
                    type="button"
                    className={
                      selectedAssistantId === assistant.id
                        ? "team-member-card is-selected"
                        : "team-member-card"
                    }
                    onClick={() => setSelectedAssistantId(assistant.id)}
                  >
                    <span className="team-avatar">
                      {avatarUrl ? (
                        <img src={avatarUrl} alt={assistant.displayName} />
                      ) : (
                        getInitialName(assistant.displayName)
                      )}
                    </span>

                    <span className="team-member-info">
                      <strong>{assistant.displayName}</strong>
                      <small>{assistant.email}</small>
                    </span>

                    <span className="team-role">
                      {assistant.status ?? "Available"}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>

          <section className="team-detail-card">
            <div className="section-chip">Member detail</div>

            {selectedAssistant ? (
              <>
                <div className="team-detail-head">
                  <div className="team-detail-avatar">
                    {resolveAvatarUrl(selectedAssistant.avatarUrl) ? (
                      <img
                        src={resolveAvatarUrl(selectedAssistant.avatarUrl)}
                        alt={selectedAssistant.displayName}
                      />
                    ) : (
                      getInitialName(selectedAssistant.displayName)
                    )}
                  </div>

                  <div>
                    <h2>{selectedAssistant.displayName}</h2>
                    <p>{selectedAssistant.email}</p>
                  </div>
                </div>

                <div className="team-detail-grid">
                  <article>
                    <span>Role</span>
                    <strong>Assistant</strong>
                  </article>

                  <article>
                    <span>Status</span>
                    <strong>{selectedAssistant.status ?? "Available"}</strong>
                  </article>

                  <article>
                    <span>Current tasks</span>
                    <strong>{selectedAssistant.currentTasks ?? 0}</strong>
                  </article>

                  <article>
                    <span>Completed</span>
                    <strong>{selectedAssistant.completedTasks ?? 0}</strong>
                  </article>

                  <article>
                    <span>Total assigned</span>
                    <strong>{selectedAssistant.totalAssignedTasks ?? 0}</strong>
                  </article>

                  <article>
                    <span>Total earnings</span>
                    <strong>{formatMoney(selectedAssistant.totalEarnings)}</strong>
                  </article>
                </div>

                <div className="team-skill-box">
                  <strong>Skill set</strong>
                  <p>
                    {selectedAssistant.skillSet?.trim() ||
                      "Chưa cập nhật skill set trong hồ sơ cá nhân."}
                  </p>
                </div>

                <div className="team-next-box">
                  <strong>
                    {userRole === "MANGAKA"
                      ? "Assign task"
                      : "Production tracking"}
                  </strong>

                  <p>
                    {userRole === "MANGAKA"
                      ? "Chọn assistant này, chuyển sang Page Workspace, sau đó chọn region để giao task."
                      : "Tantou Editor theo dõi tiến độ assistant trong Production Overview."}
                  </p>

                  <button
                    className="team-primary-button"
                    type="button"
                    onClick={handlePrepareAssignment}
                  >
                    {userRole === "MANGAKA"
                      ? "Assign task to this assistant"
                      : "View production"}
                  </button>
                </div>
              </>
            ) : (
              <>
                <h2>No assistant selected</h2>
                <p>Chọn một assistant bên trái để xem thông tin.</p>
              </>
            )}
          </section>
        </section>
      </main>
    </AppLayout>
  );
}