import { useState, useEffect } from "react";
import { api } from "../../lib/api";
import { Panel } from "../../components/ui/Panel";
import { EmptyState } from "../../components/ui/EmptyState";
import { Stamp } from "../../components/ui/Stamp";

interface SeriesRow {
  id: number;
  title: string;
  frequency: string;
  status: string;
  mangakaUserId: number;
  mangaka: string;
  chapters: number;
  editorUserId: number | null;
  editor: string | null;
}

interface Editor {
  id: number;
  name: string;
  avatar: string | null;
}

export default function BoardSeries() {
  const [rows, setRows] = useState<SeriesRow[]>([]);
  const [editors, setEditors] = useState<Editor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [savingId, setSavingId] = useState<number | null>(null);
  const [actionError, setActionError] = useState("");

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    setError("");
    try {
      const [seriesRes, editorsRes] = await Promise.all([
        api.get<SeriesRow[]>("/series/all"),
        api.get<Editor[]>("/users/editors"),
      ]);
      setRows(seriesRes.data || []);
      setEditors(editorsRes.data || []);
    } catch (e) {
      console.error("Failed to load data", e);
      setError("Không thể tải dữ liệu. Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  }

  async function handleEditorChange(seriesId: number, value: string) {
    setSavingId(seriesId);
    setActionError("");
    try {
      if (value === "") {
        // Unassign
        await api.delete(`/series/${seriesId}/editor`);
        setRows((prev) =>
          prev.map((row) =>
            row.id === seriesId
              ? { ...row, editorUserId: null, editor: null }
              : row
          )
        );
      } else {
        // Assign
        const editorId = Number(value);
        await api.put(`/series/${seriesId}/editor`, { editorUserId: editorId });
        const selectedEditor = editors.find((e) => e.id === editorId);
        setRows((prev) =>
          prev.map((row) =>
            row.id === seriesId
              ? {
                  ...row,
                  editorUserId: editorId,
                  editor: selectedEditor?.name || null,
                }
              : row
          )
        );
      }
    } catch (e: any) {
      const message =
        e?.response?.data?.message || "Không thể cập nhật.";
      setActionError(message);
      console.error("Failed to update editor", e);
    } finally {
      setSavingId(null);
    }
  }

  if (loading) {
    return (
      <div className="p-8">
        <h1 className="text-3xl text-ink mb-6">Phân công biên tập</h1>
        <Panel className="p-6 text-ink-soft">Đang tải…</Panel>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8">
        <h1 className="text-3xl text-ink mb-6">Phân công biên tập</h1>
        <Panel className="p-4 text-red-600 bg-red-50 border-red-200">
          {error}
        </Panel>
      </div>
    );
  }

  return (
    <div className="p-8">
      <h1 className="text-3xl text-ink mb-6">Phân công biên tập</h1>

      {/* Action Error */}
      {actionError && (
        <Panel className="mb-6 p-4 text-red-600 bg-red-50 border-red-200">
          {actionError}
        </Panel>
      )}

      {/* Series Table */}
      {rows.length === 0 ? (
        <EmptyState title="Chưa có series nào." />
      ) : (
        <Panel className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line bg-bg">
                <th className="p-4 text-left font-semibold text-ink">Series</th>
                <th className="p-4 text-left font-semibold text-ink">
                  Trạng thái
                </th>
                <th className="p-4 text-left font-semibold text-ink">Chương</th>
                <th className="p-4 text-left font-semibold text-ink">
                  Biên tập
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const isSaving = savingId === row.id;
                return (
                  <tr key={row.id} className="border-b border-line hover:bg-bg">
                    <td className="p-4">
                      <div className="text-ink font-medium">{row.title}</div>
                      <div className="text-xs text-ink-soft">{row.mangaka}</div>
                    </td>
                    <td className="p-4">
                      <Stamp status={row.status} />
                    </td>
                    <td className="p-4 text-ink">{row.chapters}</td>
                    <td className="p-4">
                      <select
                        value={row.editorUserId ?? ""}
                        onChange={(e) =>
                          handleEditorChange(row.id, e.target.value)
                        }
                        disabled={isSaving}
                        className="px-3 py-1 rounded border border-line bg-surface text-ink text-sm cursor-pointer disabled:opacity-50"
                      >
                        <option value="">— chưa gán —</option>
                        {editors.map((editor) => (
                          <option key={editor.id} value={editor.id}>
                            {editor.name}
                          </option>
                        ))}
                      </select>
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
