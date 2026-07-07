import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, apiErrorMessage } from "../../lib/api";
import { useAuth } from "../../lib/auth";
import { useToast } from "../../components/ui/Toast";
import { useConfirm } from "../../lib/confirm";
import { Panel } from "../../components/ui/Panel";
import { Button } from "../../components/ui/Button";
import { Stamp } from "../../components/ui/Stamp";
import { EmptyState } from "../../components/ui/EmptyState";

type ImportedSeries = {
  seriesId: number;
  readerRankingId: number;
  rankPosition: number;
  seriesTitle: string;
  status: string;
  publicationYear: number;
  chapterCount: number;
  author: string;
  genres: string;
  averageReaderStars: number;
  sales: number;
  riskLevel: "LOW" | "MEDIUM" | "HIGH";
};

type ImportResult = {
  importId?: number | null;
  fileName?: string | null;
  importedAt?: string | null;
  importedCount: number;
  periodType: "WEEKLY" | "MONTHLY";
  startDate: string;
  endDate: string;
  deleteRequest?: {
    importId: number;
    requestedByUserId: number;
    requestedByName: string | null;
    reason: string | null;
    status: string;
    requiredApprovals: number;
    approvalCount: number;
    approvedByCurrentUser: boolean;
    canCurrentUserApprove: boolean;
  } | null;
  rankings: ImportedSeries[];
};

type DeleteRequestSummary = NonNullable<ImportResult["deleteRequest"]>;

type PendingDeleteRequest = DeleteRequestSummary & {
  fileName?: string | null;
  periodType: "WEEKLY" | "MONTHLY";
  startDate: string;
  endDate: string;
  importedAt?: string | null;
};

type ConflictImport = {
  importId: number;
  fileName?: string | null;
  startDate: string;
  endDate: string;
};

type ImportConflictError = {
  message: string;
  conflictImport: ConflictImport;
};

const today = new Date().toISOString().slice(0, 10);
const money = new Intl.NumberFormat("vi-VN");
type DecisionType = "CONTINUE" | "CANCEL" | "HIATUS" | "CHANGE_FREQUENCY";
type FrequencyType = "WEEKLY" | "MONTHLY";
const addDays = (value: string, days: number) => {
  const date = new Date(`${value}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
};

function importConflictFromError(err: unknown): ImportConflictError | null {
  const responseData =
    typeof err === "object" && err !== null && "response" in err
      ? (
          err as {
            response?: {
              data?: {
                code?: string;
                message?: string | string[];
                conflictImport?: Partial<ConflictImport>;
              };
            };
          }
        ).response?.data
      : undefined;
  const conflictImport = responseData?.conflictImport;

  if (
    responseData?.code !== "READER_VOTE_IMPORT_PERIOD_CONFLICT" ||
    typeof conflictImport?.importId !== "number" ||
    typeof conflictImport.startDate !== "string" ||
    typeof conflictImport.endDate !== "string"
  ) {
    return null;
  }

  const message = Array.isArray(responseData.message)
    ? responseData.message.join("; ")
    : responseData.message || "Kỳ này đã có file import.";

  return {
    message,
    conflictImport: {
      importId: conflictImport.importId,
      fileName: conflictImport.fileName ?? null,
      startDate: conflictImport.startDate,
      endDate: conflictImport.endDate,
    },
  };
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
  const { confirm } = useConfirm();
  const { user } = useAuth();
  const periodType: "WEEKLY" = "WEEKLY";
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(addDays(today, 7));
  const [file, setFile] = useState<File | null>(null);
  const [csvPreview, setCsvPreview] = useState("");
  const [loading, setLoading] = useState(false);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [loadingLatest, setLoadingLatest] = useState(true);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [pendingDeleteRequests, setPendingDeleteRequests] = useState<
    PendingDeleteRequest[]
  >([]);
  const [selectedSeries, setSelectedSeries] = useState<ImportedSeries | null>(
    null,
  );
  const [decisionData, setDecisionData] = useState<
    Record<
      number,
      { type: DecisionType; frequency?: FrequencyType; reason: string }
    >
  >({});
  const [busyDecisionId, setBusyDecisionId] = useState<number | null>(null);
  const [actionError, setActionError] = useState("");

  function applyResult(next: ImportResult | null) {
    setResult(next);
    setSelectedSeries((current) => {
      if (!next) return null;
      return (
        next.rankings.find(
          (ranking) => ranking.seriesId === current?.seriesId,
        ) ??
        next.rankings[0] ??
        null
      );
    });
  }

  async function loadLatestReaderRankings() {
    setLoadingLatest(true);
    try {
      const response = await api.get<ImportResult | null>(
        "/reader-vote-rankings/latest",
      );
      applyResult(response.data);
    } catch (err) {
      const responseStatus =
        typeof err === "object" && err !== null && "response" in err
          ? (err as { response?: { status?: number } }).response?.status
          : undefined;
      const message = apiErrorMessage(
        err,
        "Không tải được bảng xếp hạng độc giả",
      );

      if (responseStatus === 404 && message.includes("Cannot GET")) {
        applyResult(null);
        setActionError("");
      } else {
        setActionError(message);
      }
    } finally {
      setLoadingLatest(false);
    }
  }

  async function loadPendingDeleteRequests() {
    try {
      const response = await api.get<PendingDeleteRequest[]>(
        "/reader-vote-imports/delete-requests/pending",
      );
      setPendingDeleteRequests(response.data);
    } catch (err) {
      setActionError(
        apiErrorMessage(err, "Không tải được danh sách yêu cầu xóa import."),
      );
    }
  }

  useEffect(() => {
    // Load once on page open. Keep this effect one-shot so an API error cannot spam toasts.
    // eslint-disable-next-line react-hooks/set-state-in-effect, react-hooks/exhaustive-deps
    void loadLatestReaderRankings();
    void loadPendingDeleteRequests();
  }, []);

  async function handleFileChange(nextFile?: File) {
    setFile(nextFile ?? null);
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
    const expectedEndDate = addDays(startDate, 7);
    if (!startDate || !endDate) {
      toast.error("Vui lòng chọn ngày bắt đầu và kết thúc kỳ phát hành.");
      return;
    }
    if (endDate !== expectedEndDate) {
      toast.error(
        `Kỳ hàng tuần phải kết thúc đúng 1 tuần sau ngày bắt đầu (${expectedEndDate}).`,
      );
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
      applyResult(response.data);
      toast.success("Đã import dữ liệu độc giả và cập nhật bảng xếp hạng.");
    } catch (err) {
      const conflict = importConflictFromError(err);
      if (conflict) {
        const fileLabel = conflict.conflictImport.fileName
          ? `File: ${conflict.conflictImport.fileName}`
          : `Import #${conflict.conflictImport.importId}`;
        const shouldRequestDelete = await confirm({
          title: "Kỳ này đã có file import",
          body: `${conflict.message}\n\n${fileLabel}. Bạn có muốn gửi yêu cầu xóa file đã import ở kỳ bị trùng không? Yêu cầu chỉ hoàn tất khi toàn bộ Board còn lại đồng ý.`,
          confirmText: "Gửi yêu cầu xóa",
          cancelText: "Giữ nguyên",
          tone: "danger",
        });

        if (shouldRequestDelete) {
          await sendDeleteRequest(
            conflict.conflictImport.importId,
            `Import file mới bị trùng kỳ ${startDate} → ${endDate}`,
          );
        }
      } else {
        toast.error(apiErrorMessage(err, "Không import được file CSV"));
      }
    } finally {
      setLoading(false);
    }
  }

  async function sendDeleteRequest(importId: number, reason: string) {
    setDeleteBusy(true);
    setActionError("");
    try {
      await api.post(`/reader-vote-imports/${importId}/delete-request`, {
        reason,
      });
      await loadLatestReaderRankings();
      await loadPendingDeleteRequests();
      toast.success("Đã gửi yêu cầu xóa tới các tài khoản Board còn lại.");
    } catch (err) {
      setActionError(apiErrorMessage(err, "Không thể gửi yêu cầu xóa import."));
    } finally {
      setDeleteBusy(false);
    }
  }

  async function approveDeleteImport(importId: number) {
    setDeleteBusy(true);
    setActionError("");
    try {
      await api.post(`/reader-vote-imports/${importId}/delete-approval`);
      await loadLatestReaderRankings();
      await loadPendingDeleteRequests();
      toast.success("Đã duyệt yêu cầu xóa import.");
    } catch (err) {
      setActionError(
        apiErrorMessage(err, "Không thể duyệt yêu cầu xóa import."),
      );
    } finally {
      setDeleteBusy(false);
    }
  }

  async function handleDecision(seriesId: number) {
    const decision = decisionData[seriesId];
    if (!decision || !decision.type || !decision.reason.trim()) {
      setActionError("Vui lòng chọn quyết định và nhập lý do.");
      return;
    }

    if (decision.type === "CHANGE_FREQUENCY" && !decision.frequency) {
      setActionError("Vui lòng chọn tần suất mới.");
      return;
    }

    if (
      (decision.type === "CANCEL" || decision.type === "HIATUS") &&
      !(await confirm({
        title: "Xác nhận quyết định cho series?",
        body: "Hành động sẽ đổi trạng thái series và thông báo cho tác giả/biên tập.",
        tone: "danger",
      }))
    ) {
      return;
    }

    setBusyDecisionId(seriesId);
    setActionError("");
    try {
      await api.post("/decisions", {
        seriesId,
        decisionType: decision.type,
        newFrequency: decision.frequency,
        reason: decision.reason,
      });
      setDecisionData((prev) => {
        const next = { ...prev };
        delete next[seriesId];
        return next;
      });
      await loadLatestReaderRankings();
      toast.success("Đã ghi nhận quyết định Hội đồng.");
    } catch (err) {
      setActionError(apiErrorMessage(err, "Không thể ra quyết định."));
    } finally {
      setBusyDecisionId(null);
    }
  }

  function renderDecisionControls(ranking: ImportedSeries) {
    const decision = decisionData[ranking.seriesId] ?? {
      type: "CONTINUE" as DecisionType,
      frequency: undefined,
      reason: "",
    };
    const isBusy = busyDecisionId === ranking.seriesId;

    return (
      <div className="flex flex-wrap gap-2">
        <select
          value={decision.type}
          onChange={(event) =>
            setDecisionData((prev) => ({
              ...prev,
              [ranking.seriesId]: {
                ...decision,
                type: event.target.value as DecisionType,
              },
            }))
          }
          disabled={isBusy}
          className="w-36 rounded border border-line bg-surface px-3 py-2 text-sm text-ink disabled:opacity-50"
        >
          <option value="CONTINUE">Tiếp tục</option>
          <option value="CANCEL">Hủy</option>
          <option value="HIATUS">Tạm dừng</option>
          <option value="CHANGE_FREQUENCY">Đổi tần suất</option>
        </select>

        {decision.type === "CHANGE_FREQUENCY" && (
          <select
            value={decision.frequency ?? ""}
            onChange={(event) =>
              setDecisionData((prev) => ({
                ...prev,
                [ranking.seriesId]: {
                  ...decision,
                  frequency: event.target.value as FrequencyType,
                },
              }))
            }
            disabled={isBusy}
            className="w-32 rounded border border-line bg-surface px-3 py-2 text-sm text-ink disabled:opacity-50"
          >
            <option value="">— chọn —</option>
            <option value="WEEKLY">Hàng tuần</option>
            <option value="MONTHLY">Hàng tháng</option>
          </select>
        )}

        <input
          type="text"
          placeholder="Lý do..."
          value={decision.reason}
          onChange={(event) =>
            setDecisionData((prev) => ({
              ...prev,
              [ranking.seriesId]: {
                ...decision,
                reason: event.target.value,
              },
            }))
          }
          disabled={isBusy}
          className="w-40 rounded border border-line bg-surface px-3 py-2 text-sm text-ink placeholder-ink-soft disabled:opacity-50"
        />

        <Button
          variant="accent"
          onClick={() => void handleDecision(ranking.seriesId)}
          disabled={isBusy}
          className="w-32 text-xs"
        >
          Ra quyết định
        </Button>
      </div>
    );
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
          </div>
        </div>
      </div>

      <Panel className="space-y-5 p-6 shadow-sm">
        <div>
          <h2 className="text-lg font-semibold text-ink">Import CSV</h2>
          <p className="mt-1 text-sm text-muted">
            Cột bắt buộc:{" "}
            <code>seriesTitle,author,genres,averageReaderStars,sales</code>. Có
            thể thêm <code>seriesId</code> để match chính xác hơn. Loại kỳ chỉ
            hỗ trợ hàng tuần, ngày kết thúc tự động là 1 tuần sau ngày bắt đầu.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <label className="block text-sm font-medium text-ink">
            Loại kỳ
            <input
              readOnly
              value="Hàng tuần"
              aria-label="Loại kỳ hàng tuần"
              className="mt-2 w-full rounded-lg border border-line bg-surface p-3 text-sm"
            />
          </label>

          <label className="block text-sm font-medium text-ink">
            Ngày bắt đầu kỳ
            <input
              type="date"
              value={startDate}
              onChange={(event) => {
                setStartDate(event.target.value);
                setEndDate(addDays(event.target.value, 7));
              }}
              className="mt-2 w-full rounded-lg border border-line bg-surface p-3 text-sm"
            />
          </label>

          <label className="block text-sm font-medium text-ink">
            Ngày kết thúc kỳ
            <input
              type="date"
              value={endDate}
              readOnly
              className="mt-2 w-full rounded-lg border border-line bg-surface p-3 text-sm text-muted"
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
          </div>
        )}

        <div className="flex justify-end">
          <Button onClick={importCsv} loading={loading}>
            Import và tính xếp hạng
          </Button>
        </div>
      </Panel>

      {loadingLatest && (
        <Panel className="p-6 text-sm text-muted">
          Đang tải bảng xếp hạng độc giả đã import…
        </Panel>
      )}

      {!loadingLatest && !result && (
        <Panel className="p-6">
          <EmptyState title="Chưa có bảng xếp hạng độc giả đã import." />
        </Panel>
      )}

      {actionError && (
        <Panel className="border-danger/20 bg-danger/10 p-4 text-danger">
          {actionError}
        </Panel>
      )}

      {pendingDeleteRequests.length > 0 && (
        <Panel className="space-y-3 border-accent/20 bg-accent/5 p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="font-semibold text-ink">
                Yêu cầu xóa dữ liệu import đang chờ Board duyệt
              </h3>
              <p className="mt-1 text-sm text-muted">
                File chỉ bị xóa khi toàn bộ tài khoản Board còn lại đồng ý.
              </p>
            </div>
            <Stamp
              status="PENDING"
              label={`${pendingDeleteRequests.length} yêu cầu đang chờ`}
            />
          </div>

          <div className="space-y-3">
            {pendingDeleteRequests.map((request) => (
              <div
                key={request.importId}
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-line bg-surface p-3 text-sm"
              >
                <div className="space-y-1">
                  <div className="font-medium text-ink">
                    Import #{request.importId}
                    {request.fileName ? ` · ${request.fileName}` : ""} ·{" "}
                    {request.startDate} → {request.endDate}
                  </div>
                  <div className="text-muted">
                    Người yêu cầu:{" "}
                    {request.requestedByName ||
                      `User #${request.requestedByUserId}`}
                  </div>
                  <div className="text-muted">
                    Lý do: {request.reason || "Không có lý do"}
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <Stamp
                    status={request.status}
                    label={`${request.approvalCount}/${request.requiredApprovals} Board đã duyệt`}
                  />
                  {request.canCurrentUserApprove ? (
                    <Button
                      onClick={() => approveDeleteImport(request.importId)}
                      loading={deleteBusy}
                    >
                      Duyệt xóa
                    </Button>
                  ) : (
                    <span className="text-xs text-muted">
                      {request.requestedByUserId === user?.id
                        ? "Bạn là người gửi yêu cầu, không cần duyệt."
                        : request.approvedByCurrentUser
                          ? "Bạn đã duyệt yêu cầu này."
                          : "Đang chờ Board khác duyệt."}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Panel>
      )}

      {!loadingLatest && result && (
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
                  Bảng xếp hạng độc giả đã import: {result.importedCount} series
                </h2>
                <p className="mt-1 text-sm text-muted">
                  {result.periodType === "WEEKLY" ? "Hàng tuần" : "Hàng tháng"}{" "}
                  · {result.startDate} → {result.endDate}
                  {result.fileName ? ` · File: ${result.fileName}` : ""}
                  {result.importId ? ` · Import #${result.importId}` : ""}
                </p>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-bg">
                    <tr className="border-b border-line text-left">
                      <th className="px-4 py-4 font-semibold">Hạng</th>
                      <th className="px-4 py-4 font-semibold">Series</th>
                      <th className="px-4 py-4 font-semibold">Năm bắt đầu</th>
                      <th className="px-4 py-4 font-semibold">
                        Số lượng chapter
                      </th>
                      <th className="px-4 py-4 font-semibold">Sao độc giả</th>
                      <th className="px-4 py-4 font-semibold">Doanh số</th>
                      <th className="px-4 py-4 font-semibold">Rủi ro</th>
                      <th className="px-4 py-4 font-semibold">Trạng thái</th>
                      <th className="px-4 py-4 font-semibold">Quyết định</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.rankings.map((ranking) => (
                      <tr
                        key={ranking.seriesId}
                        className="border-b border-line"
                      >
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
                              Sao độc giả:{" "}
                              {ranking.averageReaderStars.toFixed(2)}
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
                        <td className="px-4 py-5">
                          <Stamp
                            status={ranking.riskLevel}
                            label={`RISK ${ranking.riskLevel}`}
                          />
                        </td>
                        <td className="px-4 py-5">
                          <Stamp status={ranking.status} />
                        </td>
                        <td className="px-4 py-5">
                          {renderDecisionControls(ranking)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
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
                  {selectedSeries.status === "CANCELLED" && (
                    <div className="pt-2">
                      <Link
                        to={`/board/series/${selectedSeries.seriesId}/dossier`}
                        className="inline-flex rounded-lg border border-line bg-surface px-3 py-2 text-sm font-semibold text-ink transition hover:bg-bg"
                      >
                        Xem báo cáo bảo vệ
                      </Link>
                    </div>
                  )}
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
