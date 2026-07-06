import { useState, useEffect } from "react";
import { api } from "../../lib/api";
import { useToast } from "../../components/ui/Toast";
import { useConfirm } from "../../lib/confirm";
import { Panel } from "../../components/ui/Panel";
import { Button } from "../../components/ui/Button";
import { Stamp } from "../../components/ui/Stamp";
import { EmptyState } from "../../components/ui/EmptyState";

interface RankingRow {
  id: number;
  title: string;
  status: string;
  rankPosition: number | null;
  score: number | null;
  riskLevel: "LOW" | "MEDIUM" | "HIGH" | null;
}

interface OpenPeriod {
  id: number;
  seriesId: number;
  series: string;
  periodType: "WEEKLY" | "MONTHLY";
  startDate?: string;
  endDate: string;
  hasVoted: 0 | 1;
}

interface SeriesOption {
  id: number;
  title: string;
  status: string;
}

type DecisionType = "CONTINUE" | "CANCEL" | "HIATUS" | "CHANGE_FREQUENCY";
type FrequencyType = "WEEKLY" | "MONTHLY";

export default function BoardRankings() {
  const toast = useToast();
  const { confirm } = useConfirm();
  const [rankings, setRankings] = useState<RankingRow[]>([]);
  const [openPeriods, setOpenPeriods] = useState<OpenPeriod[]>([]);
  const [seriesOptions, setSeriesOptions] = useState<SeriesOption[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");
  const [busy, setBusy] = useState(false);

  // Decision form state
  const [decisionData, setDecisionData] = useState<
    Record<
      number,
      { type: DecisionType; frequency?: FrequencyType; reason: string }
    >
  >({});

  // Editorial Board decision poll form state
  const [voteData, setVoteData] = useState<
    Record<number, { score: number; comment: string }>
  >({});

  // New period form state
  const [newPeriodForm, setNewPeriodForm] = useState({
    seriesId: "",
    periodType: "WEEKLY" as FrequencyType,
    startDate: "",
    endDate: "",
  });
  const todayDate = new Date().toISOString().slice(0, 10);
  const endDateMin = newPeriodForm.startDate || todayDate;
  const dateOnly = (value?: string) => (value ? value.slice(0, 10) : "");

  const loadData = async () => {
    setLoading(true);
    setError("");
    try {
      const [rankingsRes, periodsRes, seriesRes] = await Promise.all([
        api.get<RankingRow[]>("/rankings"),
        api.get<OpenPeriod[]>("/vote-periods/open"),
        api.get<SeriesOption[]>("/series/all"),
      ]);
      setRankings(rankingsRes.data || []);
      setOpenPeriods(periodsRes.data || []);
      setSeriesOptions(seriesRes.data || []);
    } catch (e) {
      console.error("Failed to load board data", e);
      setError("Không thể tải dữ liệu. Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  };

  const handleDecision = async (seriesId: number): Promise<void> => {
    const decision = decisionData[seriesId];
    if (!decision || !decision.type || !decision.reason.trim()) {
      setActionError("Vui lòng điền đầy đủ thông tin quyết định.");
      return;
    }

    if (decision.type === "CHANGE_FREQUENCY" && !decision.frequency) {
      setActionError("Vui lòng chọn tần suất mới.");
      return;
    }

    if (decision.type === "CANCEL" || decision.type === "HIATUS") {
      if (
        !(await confirm({
          title: "Xác nhận quyết định cho series?",
          body: "Hành động sẽ đổi trạng thái series.",
          tone: "danger",
        }))
      ) {
        return;
      }
    }

    setBusy(true);
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

      // Refetch rankings
      const res = await api.get<RankingRow[]>("/rankings");
      setRankings(res.data || []);
      toast.success("Đã ghi nhận quyết định.");
    } catch (e) {
      const message =
        (e as any)?.response?.data?.message || "Thao tác thất bại.";
      setActionError(String(message));
      console.error("Failed to post decision", e);
    } finally {
      setBusy(false);
    }
  };

  const handleVote = async (periodId: number) => {
    const vote = voteData[periodId];
    if (!vote || !vote.score || vote.score < 1 || vote.score > 5) {
      setActionError("Vui lòng chọn điểm từ 1 đến 5.");
      return;
    }

    setBusy(true);
    setActionError("");
    try {
      const voteRes = await api.post("/votes", {
        votePeriodId: periodId,
        score: vote.score,
        comment: vote.comment || undefined,
      });

      setVoteData((prev) => {
        const next = { ...prev };
        delete next[periodId];
        return next;
      });

      const [periodsRes, rankingsRes] = await Promise.all([
        api.get<OpenPeriod[]>("/vote-periods/open"),
        voteRes.data?.closed
          ? api.get<RankingRow[]>("/rankings")
          : Promise.resolve(null),
      ]);
      setOpenPeriods(periodsRes.data || []);
      if (rankingsRes) {
        setRankings(rankingsRes.data || []);
      }
      toast.success(
        voteRes.data?.closed
          ? "Đã ghi nhận phiếu biểu quyết cuối cùng. Hệ thống đã tự chốt kỳ & cập nhật bảng đánh giá."
          : "Đã ghi nhận phiếu biểu quyết Hội đồng.",
      );
    } catch (e) {
      const message =
        (e as any)?.response?.data?.message || "Thao tác thất bại.";
      setActionError(String(message));
      console.error("Failed to post vote", e);
    } finally {
      setBusy(false);
    }
  };

  const handleOpenNewPeriod = async () => {
    if (
      !newPeriodForm.seriesId ||
      !newPeriodForm.startDate ||
      !newPeriodForm.endDate
    ) {
      setActionError("Vui lòng điền đầy đủ thông tin kỳ biểu quyết Hội đồng.");
      return;
    }

    if (newPeriodForm.startDate < todayDate) {
      setActionError("Ngày mở biểu quyết không thể ở quá khứ.");
      return;
    }

    if (newPeriodForm.endDate < newPeriodForm.startDate) {
      setActionError(
        "Ngày kết thúc biểu quyết không thể trước ngày mở biểu quyết.",
      );
      return;
    }

    setBusy(true);
    setActionError("");
    try {
      await api.post("/vote-periods", {
        seriesId: Number(newPeriodForm.seriesId),
        periodType: newPeriodForm.periodType,
        startDate: newPeriodForm.startDate,
        endDate: newPeriodForm.endDate,
      });

      setNewPeriodForm({
        seriesId: "",
        periodType: "WEEKLY",
        startDate: "",
        endDate: "",
      });

      // Refetch open periods
      const res = await api.get<OpenPeriod[]>("/vote-periods/open");
      setOpenPeriods(res.data || []);
      toast.success("Đã mở kỳ biểu quyết Hội đồng.");
    } catch (e) {
      const message =
        (e as any)?.response?.data?.message || "Thao tác thất bại.";
      setActionError(String(message));
      console.error("Failed to open new period", e);
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  if (loading) {
    return (
      <div className="p-8">
        <h1 className="text-3xl text-ink mb-6">
          Biểu quyết & Quyết định Hội đồng
        </h1>
        <Panel className="p-6 text-ink-soft">Đang tải…</Panel>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8">
        <h1 className="text-3xl text-ink mb-6">
          Biểu quyết & Quyết định Hội đồng
        </h1>
        <Panel className="p-4 bg-danger/10 border-danger/20 text-danger">
          {error}
        </Panel>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-3xl text-ink">Biểu quyết & Quyết định Hội đồng</h1>
      </div>

      {/* Action Error */}
      {actionError && (
        <Panel className="mb-6 p-4 bg-danger/10 border-danger/20 text-danger">
          {actionError}
        </Panel>
      )}

      {/* Section 1: Leaderboard */}
      <Panel className="mb-8">
        <div className="p-6 border-b border-line">
          <h2 className="text-lg font-semibold text-ink">
            Bảng đánh giá series
          </h2>
        </div>
        {rankings.length === 0 ? (
          <EmptyState title="Chưa có dữ liệu đánh giá Hội đồng." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line bg-bg">
                  <th className="p-4 text-left font-semibold text-ink">Hạng</th>
                  <th className="p-4 text-left font-semibold text-ink">
                    Series
                  </th>
                  <th className="p-4 text-left font-semibold text-ink">
                    Điểm Hội đồng
                  </th>
                  <th className="p-4 text-left font-semibold text-ink">
                    Rủi ro
                  </th>
                  <th className="p-4 text-left font-semibold text-ink">
                    Trạng thái
                  </th>
                  <th className="p-4 text-left font-semibold text-ink">
                    Quyết định
                  </th>
                </tr>
              </thead>
              <tbody>
                {rankings.map((row) => {
                  const decision = decisionData[row.id] || {
                    type: "CONTINUE" as DecisionType,
                    frequency: undefined,
                    reason: "",
                  };
                  return (
                    <tr
                      key={row.id}
                      className="border-b border-line hover:bg-bg"
                    >
                      <td className="p-4 text-ink font-mono">
                        #{row.rankPosition ?? "—"}
                      </td>
                      <td className="p-4 text-ink font-medium">{row.title}</td>
                      <td className="p-4 text-ink">{row.score ?? "—"}</td>
                      <td className="p-4">
                        <Stamp
                          status={row.riskLevel ?? "LOW"}
                          label={`RISK ${row.riskLevel ?? "—"}`}
                        />
                      </td>
                      <td className="p-4">
                        <Stamp status={row.status} />
                      </td>
                      <td className="p-4">
                        <div className="space-y-2">
                          <select
                            value={decision.type}
                            onChange={(e) =>
                              setDecisionData((prev) => ({
                                ...prev,
                                [row.id]: {
                                  ...decision,
                                  type: e.target.value as DecisionType,
                                },
                              }))
                            }
                            disabled={busy}
                            className="px-3 py-1 rounded border border-line bg-surface text-ink text-sm cursor-pointer disabled:opacity-50 w-40"
                          >
                            <option value="CONTINUE">Tiếp tục</option>
                            <option value="CANCEL">Hủy</option>
                            <option value="HIATUS">Tạm dừng</option>
                            <option value="CHANGE_FREQUENCY">
                              Đổi tần suất
                            </option>
                          </select>

                          {decision.type === "CHANGE_FREQUENCY" && (
                            <select
                              value={decision.frequency || ""}
                              onChange={(e) =>
                                setDecisionData((prev) => ({
                                  ...prev,
                                  [row.id]: {
                                    ...decision,
                                    frequency: e.target.value as FrequencyType,
                                  },
                                }))
                              }
                              disabled={busy}
                              className="px-3 py-1 rounded border border-line bg-surface text-ink text-sm cursor-pointer disabled:opacity-50 w-40"
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
                            onChange={(e) =>
                              setDecisionData((prev) => ({
                                ...prev,
                                [row.id]: {
                                  ...decision,
                                  reason: e.target.value,
                                },
                              }))
                            }
                            disabled={busy}
                            className="px-3 py-1 rounded border border-line bg-surface text-ink text-sm placeholder-ink-soft w-40 disabled:opacity-50"
                          />

                          <Button
                            variant="accent"
                            onClick={() => handleDecision(row.id)}
                            disabled={busy}
                            className="w-40 text-xs"
                          >
                            Ra quyết định
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      {/* Section 2: Open Editorial Board decision poll periods */}
      <Panel className="mb-8">
        <div className="p-6 border-b border-line">
          <h2 className="text-lg font-semibold text-ink">
            Kỳ biểu quyết Hội đồng đang mở
          </h2>
        </div>
        {openPeriods.length === 0 ? (
          <EmptyState title="Chưa có kỳ biểu quyết Hội đồng nào đang mở." />
        ) : (
          <div className="space-y-4 p-6">
            {openPeriods.map((period) => {
              const vote = voteData[period.id] || { score: 0, comment: "" };
              const alreadyVoted = period.hasVoted === 1;
              const startDate = dateOnly(period.startDate);
              const endDate = dateOnly(period.endDate);
              const hasStarted = !startDate || startDate <= todayDate;
              const hasExpired = !!endDate && endDate < todayDate;
              return (
                <Panel key={period.id} className="p-4 bg-bg">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <p className="font-semibold text-ink">{period.series}</p>
                      <p className="text-sm text-ink-soft">
                        {period.periodType === "WEEKLY"
                          ? "Hàng tuần"
                          : "Hàng tháng"}{" "}
                        {startDate ? `• Mở từ: ${startDate} ` : ""}• Hết hạn:{" "}
                        {endDate || period.endDate}
                      </p>
                    </div>

                    {!hasStarted ? (
                      <Stamp status="PENDING" label="Chưa đến ngày mở" />
                    ) : hasExpired ? (
                      <Stamp status="REJECTED" label="Đã quá hạn" />
                    ) : alreadyVoted ? (
                      <Stamp status="APPROVED" label="Đã biểu quyết" />
                    ) : (
                      <div className="space-y-2">
                        <input
                          type="number"
                          min="1"
                          max="5"
                          placeholder="Điểm đánh giá (1-5)"
                          value={vote.score || ""}
                          onChange={(e) =>
                            setVoteData((prev) => ({
                              ...prev,
                              [period.id]: {
                                ...vote,
                                score: Number(e.target.value),
                              },
                            }))
                          }
                          disabled={busy}
                          className="px-3 py-1 rounded border border-line bg-surface text-ink text-sm placeholder-ink-soft w-32 disabled:opacity-50"
                        />

                        <input
                          type="text"
                          placeholder="Nhận xét Hội đồng (tuỳ chọn)"
                          value={vote.comment}
                          onChange={(e) =>
                            setVoteData((prev) => ({
                              ...prev,
                              [period.id]: {
                                ...vote,
                                comment: e.target.value,
                              },
                            }))
                          }
                          disabled={busy}
                          className="px-3 py-1 rounded border border-line bg-surface text-ink text-sm placeholder-ink-soft w-full disabled:opacity-50"
                        />

                        <Button
                          variant="accent"
                          onClick={() => handleVote(period.id)}
                          disabled={busy}
                          className="w-full text-xs"
                        >
                          Gửi biểu quyết
                        </Button>
                      </div>
                    )}
                  </div>

                  <div className="mt-3 rounded border border-line bg-surface px-3 py-2 text-xs text-ink-soft">
                    Hệ thống sẽ tự chốt kết quả, cập nhật bảng đánh giá và tính
                    mức rủi ro sau khi toàn bộ Editorial Board đã gửi phiếu biểu
                    quyết.
                  </div>
                </Panel>
              );
            })}
          </div>
        )}
      </Panel>

      {/* Section 3: Open New Editorial Board decision poll period */}
      <Panel>
        <div className="p-6 border-b border-line">
          <h2 className="text-lg font-semibold text-ink">
            Mở kỳ biểu quyết Hội đồng mới
          </h2>
        </div>
        <div className="p-6 space-y-3">
          <select
            value={newPeriodForm.seriesId}
            onChange={(e) =>
              setNewPeriodForm((prev) => ({
                ...prev,
                seriesId: e.target.value,
              }))
            }
            disabled={busy}
            className="px-3 py-2 rounded border border-line bg-surface text-ink text-sm cursor-pointer disabled:opacity-50 w-full"
          >
            <option value="">— chọn series —</option>
            {seriesOptions.map((series) => (
              <option key={series.id} value={series.id}>
                {series.title}
              </option>
            ))}
          </select>

          <select
            value={newPeriodForm.periodType}
            onChange={(e) =>
              setNewPeriodForm((prev) => ({
                ...prev,
                periodType: e.target.value as FrequencyType,
              }))
            }
            disabled={busy}
            className="px-3 py-2 rounded border border-line bg-surface text-ink text-sm cursor-pointer disabled:opacity-50 w-full"
          >
            <option value="WEEKLY">Hàng tuần</option>
            <option value="MONTHLY">Hàng tháng</option>
          </select>

          <div className="flex gap-3">
            <input
              type="date"
              value={newPeriodForm.startDate}
              onChange={(e) =>
                setNewPeriodForm((prev) => ({
                  ...prev,
                  startDate: e.target.value,
                  endDate:
                    prev.endDate && prev.endDate < e.target.value
                      ? ""
                      : prev.endDate,
                }))
              }
              min={todayDate}
              disabled={busy}
              className="px-3 py-2 rounded border border-line bg-surface text-ink text-sm disabled:opacity-50 flex-1"
            />
            <input
              type="date"
              value={newPeriodForm.endDate}
              onChange={(e) =>
                setNewPeriodForm((prev) => ({
                  ...prev,
                  endDate: e.target.value,
                }))
              }
              min={endDateMin}
              disabled={busy}
              className="px-3 py-2 rounded border border-line bg-surface text-ink text-sm disabled:opacity-50 flex-1"
            />
          </div>

          <Button
            variant="accent"
            onClick={handleOpenNewPeriod}
            disabled={busy}
            className="w-full"
          >
            Mở kỳ biểu quyết
          </Button>
        </div>
      </Panel>
    </div>
  );
}
