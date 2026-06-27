import { useEffect, useMemo, useState } from "react";
import { AppLayout } from "../layouts/AppLayout";
import { getMyEarnings } from "../features/tasks/tasks.api";
import type { EarningsOverview } from "../types/task";
import "./AssistantEarningsPage.css";

const statusLabels: Record<string, string> = {
  ASSIGNED: "Assigned",
  IN_PROGRESS: "In Progress",
  SUBMITTED: "Submitted",
  REVISION_REQUESTED: "Revision Requested",
  APPROVED: "Approved",
  CANCELLED: "Cancelled",
};

export function AssistantEarningsPage() {
  const [overview, setOverview] = useState<EarningsOverview | null>(null);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [message, setMessage] = useState("Đang tải earnings...");

  async function loadEarnings() {
    setMessage("Đang tải earnings...");

    try {
      const data = await getMyEarnings();
      setOverview(data);
      setMessage("");
    } catch {
      setMessage(
        "Không tải được earnings. Kiểm tra backend /tasks/my-earnings hoặc token đăng nhập.",
      );
    }
  }

  useEffect(() => {
    loadEarnings();
  }, []);

  const filteredItems = useMemo(() => {
    const items = overview?.items ?? [];

    if (statusFilter === "ALL") {
      return items;
    }

    return items.filter((item) => item.status === statusFilter);
  }, [overview, statusFilter]);

  function formatMoney(value: string | number | null | undefined) {
    if (value === null || value === undefined) {
      return "0đ";
    }

    return Number(value).toLocaleString("vi-VN") + "đ";
  }

  const summary = overview?.summary;

  return (
    <AppLayout
      title="Assistant Earnings"
      subtitle="Theo dõi tiền công từ các task đã nhận, đã submit và đã được approve."
    >
      <section className="assistant-earnings-page">
        <div className="earnings-summary-grid">
          <article className="earnings-summary-card">
            <span>Total tasks</span>
            <strong>{summary?.totalTasks ?? 0}</strong>
            <p>Tổng task được giao</p>
          </article>

          <article className="earnings-summary-card">
            <span>Approved amount</span>
            <strong>{formatMoney(summary?.approvedAmount)}</strong>
            <p>Tiền đã được duyệt</p>
          </article>

          <article className="earnings-summary-card">
            <span>Submitted amount</span>
            <strong>{formatMoney(summary?.submittedAmount)}</strong>
            <p>Tiền đang chờ review</p>
          </article>

          <article className="earnings-summary-card">
            <span>Pending amount</span>
            <strong>{formatMoney(summary?.pendingAmount)}</strong>
            <p>Tiền task đang làm</p>
          </article>
        </div>

        <section className="earnings-toolbar-card">
          <div>
            <span className="v5-kicker">Assistant finance</span>
            <h2>My earnings</h2>
            <p>Xem thu nhập theo trạng thái task.</p>
          </div>

          <div className="earnings-filter-group">
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
            >
              <option value="ALL">All status</option>
              <option value="ASSIGNED">Assigned</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="SUBMITTED">Submitted</option>
              <option value="APPROVED">Approved</option>
              <option value="REVISION_REQUESTED">Revision Requested</option>
              <option value="CANCELLED">Cancelled</option>
            </select>

            <button type="button" onClick={loadEarnings}>
              Refresh
            </button>
          </div>
        </section>

        {message && (
          <section className="earnings-message-card">
            <p>{message}</p>
          </section>
        )}

        <section className="earnings-list">
          {filteredItems.length === 0 && !message && (
            <article className="earnings-message-card">
              <p>Chưa có earnings nào.</p>
            </article>
          )}

          {filteredItems.map((item) => (
            <article key={item.id} className="earnings-card">
              <div className="earnings-card-heading">
                <div>
                  <span className="earnings-task-id">TASK #{item.id}</span>
                  <h3>{item.description}</h3>
                </div>

                <span className={`earnings-status status-${item.status}`}>
                  {statusLabels[item.status] ?? item.status}
                </span>
              </div>

              <div className="earnings-meta-grid">
                <div>
                  <span>Payment</span>
                  <strong>{formatMoney(item.paymentAmount)}</strong>
                </div>

                <div>
                  <span>Deadline</span>
                  <strong>
                    {item.deadline
                      ? new Date(item.deadline).toLocaleString("vi-VN")
                      : "No deadline"}
                  </strong>
                </div>

                <div>
                  <span>Region</span>
                  <strong>
                    {item.region
                      ? `#${item.region.id} · ${item.region.type}`
                      : "No region"}
                  </strong>
                </div>

                <div>
                  <span>Page</span>
                  <strong>
                    {item.page ? `Page ${item.page.pageNumber}` : "No page"}
                  </strong>
                </div>
              </div>
            </article>
          ))}
        </section>
      </section>
    </AppLayout>
  );
}
