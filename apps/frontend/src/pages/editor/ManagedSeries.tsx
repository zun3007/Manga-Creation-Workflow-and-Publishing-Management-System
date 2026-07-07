import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../../lib/api";
import { Panel } from "../../components/ui/Panel";
import { Stamp } from "../../components/ui/Stamp";
import { EmptyState } from "../../components/ui/EmptyState";

type ManagedSeries = {
  id: number;
  title: string;
  status: string;
  frequency: string;
  createdAt: string | null;
  assignedAt: string | null;
  mangaka: string;
  mangakaEmail: string;
  genres: string | null;
  chapters: number;
  publishedChapters: number;
  chaptersToReview: number;
  nextDeadline: string | null;
};

const date = (value: string | null) =>
  value ? new Date(value).toLocaleDateString("vi-VN") : "—";

const num = (value: unknown) => Number(value ?? 0);

export default function ManagedSeriesPage() {
  const [rows, setRows] = useState<ManagedSeries[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    void loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    setError("");
    try {
      const response = await api.get<ManagedSeries[]>("/dashboard/editor-series");
      setRows(response.data || []);
    } catch (err) {
      console.error("Failed to load managed series", err);
      setError("Không thể tải danh sách series đang quản lý.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6 p-8">
      <div>
        <p className="font-mono text-xs uppercase tracking-wider text-accent">
          Tantou Editor
        </p>
        <h1 className="mt-2 text-3xl text-ink">Series đang quản lý</h1>
        <p className="mt-2 text-sm text-muted">
          Toàn bộ thông tin các series mà bạn đang được phân công phụ trách.
        </p>
      </div>

      {error && (
        <Panel className="border-danger/20 bg-danger/10 p-4 text-danger">
          {error}
        </Panel>
      )}

      {loading ? (
        <Panel className="p-6 text-sm text-muted">Đang tải series…</Panel>
      ) : rows.length === 0 ? (
        <EmptyState title="Bạn chưa được phân công quản lý series nào." />
      ) : (
        <Panel className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-bg">
                <tr className="border-b border-line text-left">
                  <th className="px-4 py-4 font-semibold">Series</th>
                  <th className="px-4 py-4 font-semibold">Mangaka</th>
                  <th className="px-4 py-4 font-semibold">Trạng thái</th>
                  <th className="px-4 py-4 font-semibold">Tần suất</th>
                  <th className="px-4 py-4 font-semibold">Thể loại</th>
                  <th className="px-4 py-4 font-semibold">Chương</th>
                  <th className="px-4 py-4 font-semibold">Chờ duyệt</th>
                  <th className="px-4 py-4 font-semibold">Deadline gần nhất</th>
                  <th className="px-4 py-4 font-semibold">Ngày nhận</th>
                  <th className="px-4 py-4 font-semibold">Hồ sơ</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id} className="border-b border-line">
                    <td className="px-4 py-5">
                      <div className="font-semibold text-ink">{row.title}</div>
                      <div className="mt-1 text-xs text-muted">
                        ID #{row.id} · Tạo {date(row.createdAt)}
                      </div>
                    </td>
                    <td className="px-4 py-5">
                      <div className="text-ink">{row.mangaka}</div>
                      <div className="mt-1 text-xs text-muted">
                        {row.mangakaEmail}
                      </div>
                    </td>
                    <td className="px-4 py-5">
                      <Stamp status={row.status} />
                    </td>
                    <td className="px-4 py-5 font-mono text-xs uppercase">
                      {row.frequency}
                    </td>
                    <td className="px-4 py-5">{row.genres || "—"}</td>
                    <td className="px-4 py-5">
                      {num(row.publishedChapters)}/{num(row.chapters)}
                    </td>
                    <td className="px-4 py-5">
                      {num(row.chaptersToReview) > 0 ? (
                        <Stamp
                          status="REVISION_REQUIRED"
                          label={`${num(row.chaptersToReview)} chương`}
                        />
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-4 py-5">{date(row.nextDeadline)}</td>
                    <td className="px-4 py-5">{date(row.assignedAt)}</td>
                    <td className="px-4 py-5">
                      {row.status === "CANCELLED" ? (
                        <Link
                          to={`/editor/series/${row.id}/dossier`}
                          className="inline-flex whitespace-nowrap rounded-[calc(var(--app-radius)*0.66)] border border-line bg-surface px-3 py-2 text-sm font-semibold text-ink transition hover:bg-bg"
                        >
                          Hồ sơ bảo vệ
                        </Link>
                      ) : (
                        <span className="text-muted">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      )}
    </div>
  );
}
