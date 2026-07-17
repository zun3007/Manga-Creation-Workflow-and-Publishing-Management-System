import { useEffect, useMemo, useState } from "react";
import { api, apiErrorMessage } from "../../lib/api";
import { useToast } from "../../components/ui/Toast";
import { Panel } from "../../components/ui/Panel";
import { Button } from "../../components/ui/Button";
import { Stamp } from "../../components/ui/Stamp";

type EligibleChapter = {
  id: number;
  number: number;
  title: string;
  seriesId: number;
  seriesTitle: string;
};

type Schedule = {
  id: number;
  seriesId: number;
  seriesTitle: string;
  chapterId: number;
  chapterNumber: number;
  chapterTitle: string;
  releaseDate: string;
  status: "SCHEDULED" | "PUBLISHED" | "CANCELLED";
  canCancel?: 0 | 1 | boolean;
  canPublish?: 0 | 1 | boolean;
};

export default function PublicationSchedule() {
  const toast = useToast();
  const [eligibleChapters, setEligibleChapters] = useState<EligibleChapter[]>(
    [],
  );
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [seriesId, setSeriesId] = useState<number | undefined>();
  const [chapterId, setChapterId] = useState<number | undefined>();
  const [releaseDate, setReleaseDate] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const minReleaseDate = todayDate();

  const seriesOptions = useMemo(() => {
    const byId = new Map<number, string>();
    eligibleChapters.forEach((chapter) =>
      byId.set(chapter.seriesId, chapter.seriesTitle),
    );
    return Array.from(byId, ([id, title]) => ({ id, title })).sort((a, b) =>
      a.title.localeCompare(b.title),
    );
  }, [eligibleChapters]);

  const chaptersForSeries = useMemo(
    () =>
      eligibleChapters
        .filter((chapter) => chapter.seriesId === seriesId)
        .sort((a, b) => a.number - b.number),
    [eligibleChapters, seriesId],
  );

  async function loadData() {
    setLoading(true);
    setError("");
    try {
      const [schedulesRes, chaptersRes] = await Promise.all([
        api.get<Schedule[]>("/publication-schedules"),
        api.get<EligibleChapter[]>("/publication-schedules/eligible-chapters"),
      ]);
      setSchedules(schedulesRes.data || []);
      setEligibleChapters(chaptersRes.data || []);
    } catch (err) {
      setError(apiErrorMessage(err, "Không thể tải lịch xuất bản"));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
  }, []);

  async function createSchedule() {
    if (!chapterId || !releaseDate) {
      toast.error("Vui lòng chọn chương và ngày phát hành.");
      return;
    }

    if (releaseDate < minReleaseDate) {
      toast.error("Ngày phát hành không thể ở quá khứ.");
      return;
    }

    setSaving(true);
    try {
      await api.post("/publication-schedules", {
        chapterId,
        releaseDate,
      });
      toast.success("Đã tạo lịch phát hành.");
      setChapterId(undefined);
      setSeriesId(undefined);
      setReleaseDate("");
      await loadData();
    } catch (err) {
      toast.error(apiErrorMessage(err, "Không tạo được lịch phát hành"));
    } finally {
      setSaving(false);
    }
  }

  async function cancelSchedule(id: number) {
    setSaving(true);
    try {
      await api.patch(`/publication-schedules/${id}/cancel`);
      toast.success("Đã huỷ lịch phát hành.");
      await loadData();
    } catch (err) {
      toast.error(apiErrorMessage(err, "Không huỷ được lịch phát hành"));
    } finally {
      setSaving(false);
    }
  }

  async function publishSchedule(id: number) {
    setSaving(true);
    try {
      await api.patch(`/publication-schedules/${id}/publish`);
      toast.success("Đã xuất bản chương theo lịch.");
      await loadData();
    } catch (err) {
      toast.error(apiErrorMessage(err, "Không xuất bản được chương"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6 p-8">
      <div>
        <h1 className="text-3xl text-ink">
          Lịch xuất bản
        </h1>
      </div>

      <Panel className="space-y-6 p-6">
        <h2 className="text-lg font-semibold text-ink">Tạo lịch trình</h2>

        <div className="grid gap-6 md:grid-cols-3">
          <div>
            <label
              htmlFor="publication-series"
              className="mb-2 block text-sm font-medium text-ink"
            >
              Series
            </label>
            <select
              id="publication-series"
              aria-label="Series"
              value={seriesId ?? ""}
              onChange={(event) => {
                const nextSeriesId = Number(event.target.value) || undefined;
                setSeriesId(nextSeriesId);
                setChapterId(undefined);
              }}
              className="w-full rounded-lg border border-line bg-surface p-3 text-sm"
            >
              <option value="">Chọn Series</option>
              {seriesOptions.map((series) => (
                <option key={series.id} value={series.id}>
                  {series.title}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="publication-chapter"
              className="mb-2 block text-sm font-medium text-ink"
            >
              Chương
            </label>
            <select
              id="publication-chapter"
              aria-label="Chapter"
              value={chapterId ?? ""}
              onChange={(event) =>
                setChapterId(Number(event.target.value) || undefined)
              }
              disabled={!seriesId || chaptersForSeries.length === 0}
              className="w-full rounded-lg border border-line bg-surface p-3 text-sm disabled:opacity-50"
            >
              <option value="">Chọn chương</option>
              {chaptersForSeries.map((chapter) => (
                <option key={chapter.id} value={chapter.id}>
                  Chapter {chapter.number} - {chapter.title}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="publication-release-date"
              className="mb-2 block text-sm font-medium text-ink"
            >
              Ngày phát hành
            </label>
            <input
              id="publication-release-date"
              aria-label="Release date"
              type="date"
              value={releaseDate}
              onChange={(event) => setReleaseDate(event.target.value)}
              min={minReleaseDate}
              className="w-full rounded-lg border border-line bg-surface p-3"
            />
          </div>
        </div>

        {error && <p className="text-sm text-danger">{error}</p>}

        <div className="flex justify-end">
          <Button onClick={createSchedule} loading={saving}>
            Tạo lịch phát hành
          </Button>
        </div>
      </Panel>

      <Panel className="overflow-hidden">
        <div className="border-b border-line p-6">
          <h2 className="text-lg font-semibold text-ink">Lịch phát hành</h2>
        </div>
        {loading ? (
          <p className="p-6 text-sm text-muted">Đang tải lịch phát hành...</p>
        ) : schedules.length === 0 ? (
          <div className="py-12 text-center text-muted">
            No publication schedules yet.
          </div>
        ) : (
          <table className="min-w-full text-sm">
            <thead className="bg-bg">
              <tr className="border-b border-line text-left">
                <th className="px-4 py-4 font-semibold">Series</th>
                <th className="px-4 py-4 font-semibold">Chương</th>
                <th className="px-4 py-4 font-semibold">Ngày phát hành</th>
                <th className="px-4 py-4 font-semibold">Trạng thái</th>
                <th className="px-4 py-4 font-semibold">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {schedules.map((schedule) => (
                <tr key={schedule.id} className="border-b border-line">
                  <td className="px-4 py-6">{schedule.seriesTitle}</td>
                  <td className="px-4 py-6">
                    {`Chapter ${schedule.chapterNumber} - ${schedule.chapterTitle}`}
                  </td>
                  <td className="px-4 py-6">{schedule.releaseDate}</td>
                  <td className="px-4 py-6">
                    <Stamp status={schedule.status} />
                  </td>
                  <td className="px-4 py-6">
                    {schedule.status === "SCHEDULED" ? (
                      <div className="flex flex-wrap gap-3">
                        {Boolean(schedule.canPublish) && (
                          <button
                            type="button"
                            onClick={() => void publishSchedule(schedule.id)}
                            disabled={saving}
                            className="text-sm font-medium text-accent transition hover:brightness-95 disabled:opacity-50"
                          >
                            Xuất bản
                          </button>
                        )}
                        {Boolean(schedule.canCancel) && (
                          <button
                            type="button"
                            onClick={() => void cancelSchedule(schedule.id)}
                            disabled={saving}
                            className="text-sm font-medium text-danger transition hover:brightness-95 disabled:opacity-50"
                          >
                            Huỷ
                          </button>
                        )}
                        {!schedule.canPublish && !schedule.canCancel && (
                          <span className="text-muted">Chờ ngày phát hành</span>
                        )}
                      </div>
                    ) : (
                      <span className="text-muted">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Panel>
    </div>
  );
}

function todayDate(): string {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
