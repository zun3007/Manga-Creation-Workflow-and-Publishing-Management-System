import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, apiErrorMessage } from "../../lib/api";
import { useToast } from "../../components/ui/Toast";
import { Panel } from "../../components/ui/Panel";
import { Button } from "../../components/ui/Button";
import { Stamp } from "../../components/ui/Stamp";

type ImportedSeries = {
  seriesId: number;
  readerRankingId: number;
  rankPosition: number;
  seriesTitle: string;
  publicationYear: number;
  chapterCount: number;
  author: string;
  genres: string;
  averageReaderStars: number;
  sales: number;
  riskLevel: "LOW" | "MEDIUM" | "HIGH";
};

type ImportResult = {
  importedCount: number;
  periodType: "WEEKLY" | "MONTHLY";
  startDate: string;
  endDate: string;
  rankings: ImportedSeries[];
};

const today = new Date().toISOString().slice(0, 10);
const money = new Intl.NumberFormat("vi-VN");
const IMPORT_CACHE_KEY = "board.readerVoteImport.lastResult";

type ImportCache = {
  periodType: "WEEKLY" | "MONTHLY";
  startDate: string;
  endDate: string;
  csvPreview: string;
  result: ImportResult | null;
  selectedSeriesId: number | null;
};

function readImportCache(): ImportCache | null {
  try {
    const raw = sessionStorage.getItem(IMPORT_CACHE_KEY);
    return raw ? (JSON.parse(raw) as ImportCache) : null;
  } catch {
    return null;
  }
}

function BoardRankingTabs() {
  return (
    <div className="flex flex-wrap gap-2 rounded-xl border border-line bg-surface p-2">
      <Link
        to="/board/rankings"
        className="rounded-lg px-4 py-2 text-sm font-medium text-ink-soft transition hover:bg-bg hover:text-ink"
      >
        Biểu quyết Hội đồng
      </Link>
      <Link
        to="/board/reader-votes/import"
        className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white"
      >
        Nhập vote độc giả
      </Link>
    </div>
  );
}

export default function ReaderVoteImport() {
  const toast = useToast();
  const cached = readImportCache();
  const [periodType, setPeriodType] = useState<"WEEKLY" | "MONTHLY">(
    cached?.periodType ?? "WEEKLY",
  );
  const [startDate, setStartDate] = useState(cached?.startDate ?? today);
  const [endDate, setEndDate] = useState(cached?.endDate ?? today);
  const [file, setFile] = useState<File | null>(null);
  const [csvPreview, setCsvPreview] = useState(cached?.csvPreview ?? "");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(
    cached?.result ?? null,
  );
  const [selectedSeries, setSelectedSeries] = useState<ImportedSeries | null>(
    cached?.result?.rankings.find(
      (ranking) => ranking.seriesId === cached.selectedSeriesId,
    ) ??
      cached?.result?.rankings[0] ??
      null,
  );

  useEffect(() => {
    const cache: ImportCache = {
      periodType,
      startDate,
      endDate,
      csvPreview,
      result,
      selectedSeriesId: selectedSeries?.seriesId ?? null,
    };
    sessionStorage.setItem(IMPORT_CACHE_KEY, JSON.stringify(cache));
  }, [periodType, startDate, endDate, csvPreview, result, selectedSeries]);

  async function handleFileChange(nextFile?: File) {
    setFile(nextFile ?? null);
    setResult(null);
    setSelectedSeries(null);
    if (!nextFile) {
      setCsvPreview("");
      return;
    }
    if (!nextFile.name.toLowerCase().endsWith(".csv")) {
      toast.error("Vui lòng chọn file CSV.");
      setFile(null);
      setCsvPreview("");
      return;
    }
    const content = await nextFile.text();
    setCsvPreview(content.slice(0, 1200));
  }

  async function importCsv() {
    if (!file) {
      toast.error("Vui lòng chọn file CSV.");
      return;
    }
    if (!startDate || !endDate) {
      toast.error("Vui lòng chọn ngày bắt đầu và kết thúc kỳ phát hành.");
      return;
    }
    if (endDate < startDate) {
      toast.error("Ngày kết thúc không thể trước ngày bắt đầu.");
      return;
    }

    setLoading(true);
    try {
      const csv = await file.text();
      const response = await api.post<ImportResult>(
        "/reader-vote-imports/csv",
        {
          periodType,
          startDate,
          endDate,
          fileName: file.name,
          csv,
        },
      );
      setResult(response.data);
      setSelectedSeries(response.data.rankings[0] ?? null);
      toast.success("Đã import dữ liệu độc giả và cập nhật bảng xếp hạng.");
    } catch (err) {
      toast.error(apiErrorMessage(err, "Không import được file CSV"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6 p-8">
      <div className="space-y-4">
        <BoardRankingTabs />
        <div>
          <div className="rounded-2xl border border-line bg-gradient-to-br from-accent/12 via-surface to-bg p-6 shadow-sm">
            <p className="mb-2 font-mono text-xs uppercase tracking-wider text-accent">
              Reader vote import
            </p>
            <h1 className="font-display text-3xl font-bold text-ink">
              Nhập dữ liệu vote độc giả
            </h1>
            <p className="mt-2 max-w-3xl text-sm text-muted">
              Import CSV sau mỗi kỳ phát hành. Điểm Hội đồng và sao độc giả là 2
              nguồn dữ liệu riêng. CSV chỉ nhập sao độc giả và doanh số; số
              chương được lấy trực tiếp từ hệ thống.
            </p>
          </div>
        </div>
      </div>

      <Panel className="space-y-5 p-6 shadow-sm">
        <div>
          <h2 className="text-lg font-semibold text-ink">Import CSV</h2>
          <p className="mt-1 text-sm text-muted">
            Cột bắt buộc:{" "}
            <code>
              seriesTitle,publicationYear,author,genres,averageReaderStars,sales
            </code>
            . Có thể thêm <code>seriesId</code> để match chính xác hơn.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <label className="block text-sm font-medium text-ink">
            Loại kỳ
            <select
              value={periodType}
              onChange={(event) =>
                setPeriodType(event.target.value as "WEEKLY" | "MONTHLY")
              }
              className="mt-2 w-full rounded-lg border border-line bg-surface p-3 text-sm"
            >
              <option value="WEEKLY">Hàng tuần</option>
              <option value="MONTHLY">Hàng tháng</option>
            </select>
          </label>

          <label className="block text-sm font-medium text-ink">
            Ngày bắt đầu kỳ
            <input
              type="date"
              value={startDate}
              onChange={(event) => setStartDate(event.target.value)}
              className="mt-2 w-full rounded-lg border border-line bg-surface p-3 text-sm"
            />
          </label>

          <label className="block text-sm font-medium text-ink">
            Ngày kết thúc kỳ
            <input
              type="date"
              value={endDate}
              min={startDate}
              onChange={(event) => setEndDate(event.target.value)}
              className="mt-2 w-full rounded-lg border border-line bg-surface p-3 text-sm"
            />
          </label>
        </div>

        <label className="block text-sm font-medium text-ink">
          File CSV
          <input
            type="file"
            accept=".csv,text/csv"
            onChange={(event) => void handleFileChange(event.target.files?.[0])}
            className="mt-2 w-full rounded-lg border border-line bg-surface p-3 text-sm"
          />
        </label>

        {csvPreview && (
          <div>
            <p className="mb-2 text-sm font-medium text-ink">Preview</p>
            <pre className="max-h-56 overflow-auto rounded-lg border border-line bg-bg p-3 text-xs text-ink-soft">
              {csvPreview}
            </pre>
            {!file && result && (
              <p className="mt-2 text-xs text-muted">
                Dữ liệu này được giữ lại từ lần import gần nhất trong phiên làm
                việc để bạn đối chiếu khi chuyển trang.
              </p>
            )}
          </div>
        )}

        <div className="flex justify-end">
          <Button onClick={importCsv} loading={loading}>
            Import và tính xếp hạng
          </Button>
        </div>
      </Panel>

      {result && (
        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-3">
            <SummaryCard
              label="Series import"
              value={String(result.importedCount)}
            />
            <SummaryCard
              label="Sao độc giả cao nhất"
              value={Math.max(
                ...result.rankings.map((row) => row.averageReaderStars),
              ).toFixed(2)}
            />
            <SummaryCard
              label="Tổng doanh số"
              value={money.format(
                result.rankings.reduce((sum, row) => sum + row.sales, 0),
              )}
            />
          </div>

          <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
            <Panel className="overflow-hidden">
              <div className="border-b border-line p-6">
                <h2 className="text-lg font-semibold text-ink">
                  Kết quả import: {result.importedCount} series
                </h2>
                <p className="mt-1 text-sm text-muted">
                  {result.periodType === "WEEKLY" ? "Hàng tuần" : "Hàng tháng"}{" "}
                  · {result.startDate} → {result.endDate}
                </p>
              </div>
              <table className="min-w-full text-sm">
                <thead className="bg-bg">
                  <tr className="border-b border-line text-left">
                    <th className="px-4 py-4 font-semibold">Hạng</th>
                    <th className="px-4 py-4 font-semibold">Series</th>
                    <th className="px-4 py-4 font-semibold">Năm bắt đầu</th>
                    <th className="px-4 py-4 font-semibold">
                      Số lượng chapeter
                    </th>
                    <th className="px-4 py-4 font-semibold">Sao độc giả</th>
                    <th className="px-4 py-4 font-semibold">Doanh số</th>
                  </tr>
                </thead>
                <tbody>
                  {result.rankings.map((ranking) => (
                    <tr key={ranking.seriesId} className="border-b border-line">
                      <td className="px-4 py-5 font-mono">
                        #{ranking.rankPosition}
                      </td>
                      <td className="relative px-4 py-5">
                        <button
                          type="button"
                          title={`${ranking.seriesTitle} · ${ranking.author} · ${ranking.genres} · ${ranking.averageReaderStars.toFixed(2)} sao · ${money.format(ranking.sales)} doanh số`}
                          onClick={() => setSelectedSeries(ranking)}
                          className="group text-left font-semibold text-accent hover:underline"
                        >
                          {ranking.seriesTitle}
                          <span className="pointer-events-none absolute left-4 top-11 z-10 hidden w-72 rounded-lg border border-line bg-surface p-3 text-xs text-ink-soft shadow-lg group-hover:block">
                            <strong className="block text-ink">
                              {ranking.seriesTitle}
                            </strong>
                            Tác giả: {ranking.author}
                            <br />
                            Thể loại: {ranking.genres}
                            <br />
                            Sao độc giả: {ranking.averageReaderStars.toFixed(2)}
                            <br />
                            Doanh số: {money.format(ranking.sales)}
                          </span>
                        </button>
                      </td>
                      <td className="px-4 py-5">{ranking.publicationYear}</td>
                      <td className="px-4 py-5">{ranking.chapterCount}</td>
                      <td className="px-4 py-5">
                        {ranking.averageReaderStars.toFixed(2)}
                      </td>
                      <td className="px-4 py-5">
                        {money.format(ranking.sales)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Panel>

            <Panel className="p-6">
              <h2 className="text-lg font-semibold text-ink">
                Chi tiết series
              </h2>
              {selectedSeries ? (
                <dl className="mt-4 space-y-3 text-sm">
                  <Detail
                    label="Tên series"
                    value={selectedSeries.seriesTitle}
                  />
                  <Detail
                    label="Series ID"
                    value={String(selectedSeries.seriesId)}
                  />
                  <Detail label="Tác giả" value={selectedSeries.author} />
                  <Detail label="Thể loại" value={selectedSeries.genres} />
                  <Detail
                    label="Năm bắt đầu series"
                    value={String(selectedSeries.publicationYear)}
                  />
                  <Detail
                    label="Số chương trong hệ thống"
                    value={String(selectedSeries.chapterCount)}
                  />
                  <Detail
                    label="Sao trung bình độc giả"
                    value={selectedSeries.averageReaderStars.toFixed(2)}
                  />
                  <Detail
                    label="Doanh số"
                    value={money.format(selectedSeries.sales)}
                  />
                  <Detail
                    label="Reader ranking ID"
                    value={String(selectedSeries.readerRankingId)}
                  />
                  <div className="pt-2">
                    <dt className="text-muted">Rủi ro</dt>
                    <dd className="mt-1">
                      <Stamp
                        status={selectedSeries.riskLevel}
                        label={`RISK ${selectedSeries.riskLevel}`}
                      />
                    </dd>
                  </div>
                </dl>
              ) : (
                <p className="mt-4 text-sm text-muted">
                  Bấm vào tên series trong bảng để xem toàn bộ thông tin chi
                  tiết.
                </p>
              )}
            </Panel>
          </div>
        </div>
      )}
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <Panel className="p-5">
      <p className="font-mono text-xs uppercase tracking-wider text-muted">
        {label}
      </p>
      <p className="mt-2 text-2xl font-bold text-ink">{value}</p>
    </Panel>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-muted">{label}</dt>
      <dd className="mt-1 font-medium text-ink">{value}</dd>
    </div>
  );
}
