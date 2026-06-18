import { useEffect, useState } from "react";
import { api } from "../../lib/api";
import { useAuth } from "../../lib/auth";
import { useToast } from "../../components/ui/Toast";
import { Panel } from "../../components/ui/Panel";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { Stamp } from "../../components/ui/Stamp";
import type { Proposal } from "../../types";

interface Genre {
  id: number;
  name: string;
}

export default function Proposals() {
  useAuth();
  const toast = useToast();
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [genres, setGenres] = useState<Genre[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    title: "",
    synopsis: "",
    proposedFrequency: "WEEKLY",
    genreIds: [] as number[],
  });

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      setLoading(true);
      const [proposalsRes, genresRes] = await Promise.all([
        api.get("/proposals/mine"),
        api.get("/genres"),
      ]);
      setProposals(proposalsRes.data);
      setGenres(genresRes.data);
      setError(null);
    } catch (err) {
      console.error("Failed to load data:", err);
      setError("Lỗi khi tải dữ liệu");
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmitForm(e: React.FormEvent) {
    e.preventDefault();
    if (!formData.title.trim()) {
      setError("Vui lòng nhập tiêu đề");
      return;
    }
    if (formData.genreIds.length === 0) {
      setError("Vui lòng chọn ít nhất một thể loại");
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      const res = await api.post("/proposals", {
        title: formData.title,
        synopsis: formData.synopsis || null,
        proposedFrequency: formData.proposedFrequency,
        genreIds: formData.genreIds,
      });
      setProposals([res.data, ...proposals]);
      toast.success("Đã tạo đề xuất.");
      setFormData({
        title: "",
        synopsis: "",
        proposedFrequency: "WEEKLY",
        genreIds: [],
      });
    } catch (err: any) {
      console.error("Failed to create proposal:", err);
      setError(err.response?.data?.message || "Lỗi khi tạo đề xuất");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSubmitProposal(proposalId: number) {
    try {
      const res = await api.patch(`/proposals/${proposalId}/submit`);
      setProposals(proposals.map((p) => (p.id === proposalId ? res.data : p)));
      toast.success("Đã gửi đề xuất cho hội đồng.");
    } catch (err: any) {
      console.error("Failed to submit proposal:", err);
      setError(err.response?.data?.message || "Lỗi khi gửi đề xuất");
    }
  }

  const toggleGenre = (genreId: number) => {
    setFormData((prev) => ({
      ...prev,
      genreIds: prev.genreIds.includes(genreId)
        ? prev.genreIds.filter((id) => id !== genreId)
        : [...prev.genreIds, genreId],
    }));
  };

  if (loading) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold text-ink">Đề xuất Series</h1>
        <Panel className="mt-4 p-6 text-ink-soft">Đang tải...</Panel>
      </div>
    );
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-ink">Đề xuất Series</h1>

      {error && (
        <Panel className="mt-4 bg-danger/10 border-danger/20 text-danger p-4">
          {error}
        </Panel>
      )}

      {/* Form Panel */}
      <Panel className="mt-6 p-6">
        <h2 className="text-lg font-semibold text-ink mb-4">Đề xuất mới</h2>
        <form onSubmit={handleSubmitForm} className="space-y-4">
          <Input
            label="Tiêu đề"
            type="text"
            placeholder="Nhập tiêu đề series"
            value={formData.title}
            onChange={(e) =>
              setFormData({ ...formData, title: e.target.value })
            }
          />

          <div>
            <label className="block">
              <span className="mb-1 block font-mono text-[0.62rem] uppercase tracking-wider text-ink-soft">
                Tóm tắt
              </span>
              <textarea
                className="w-full rounded-[calc(var(--app-radius)*0.6)] border border-line bg-surface px-3 py-2 text-ink outline-none transition focus:border-accent resize-none"
                placeholder="Mô tả ngắn về series..."
                rows={3}
                value={formData.synopsis}
                onChange={(e) =>
                  setFormData({ ...formData, synopsis: e.target.value })
                }
              />
            </label>
          </div>

          <div>
            <label className="block">
              <span className="mb-1 block font-mono text-[0.62rem] uppercase tracking-wider text-ink-soft">
                Tần suất xuất bản
              </span>
              <select
                className="w-full rounded-[calc(var(--app-radius)*0.6)] border border-line bg-surface px-3 py-2 text-ink outline-none transition focus:border-accent"
                value={formData.proposedFrequency}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    proposedFrequency: e.target.value,
                  })
                }
              >
                <option value="WEEKLY">Hàng tuần</option>
                <option value="MONTHLY">Hàng tháng</option>
              </select>
            </label>
          </div>

          <div>
            <label className="block">
              <span className="mb-1 block font-mono text-[0.62rem] uppercase tracking-wider text-ink-soft">
                Thể loại
              </span>
              <div className="grid grid-cols-2 gap-2 bg-bg p-3 rounded-[calc(var(--app-radius)*0.6)] border border-line">
                {genres.map((g) => (
                  <label
                    key={g.id}
                    className="flex items-center gap-2 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={formData.genreIds.includes(g.id)}
                      onChange={() => toggleGenre(g.id)}
                      className="w-4 h-4"
                    />
                    <span className="text-sm text-ink">{g.name}</span>
                  </label>
                ))}
              </div>
            </label>
          </div>

          <Button
            type="submit"
            disabled={submitting}
            variant="accent"
            className="w-full"
          >
            {submitting ? "Đang tạo..." : "Tạo đề xuất"}
          </Button>
        </form>
      </Panel>

      {/* Proposals List */}
      <div className="mt-8">
        <h2 className="text-lg font-semibold text-ink mb-4">
          Các đề xuất của bạn
        </h2>
        {proposals.length === 0 ? (
          <Panel className="p-6 text-ink-soft text-center">
            Chưa có đề xuất nào
          </Panel>
        ) : (
          <div className="space-y-3">
            {proposals.map((proposal) => (
              <Panel
                key={proposal.id}
                className="p-4 flex items-start justify-between"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold text-ink">
                      {proposal.title}
                    </h3>
                    <Stamp status={proposal.status || "DRAFT"} />
                  </div>
                  {proposal.synopsis && (
                    <p className="text-sm text-ink-soft mb-2">
                      {proposal.synopsis}
                    </p>
                  )}
                  <div className="flex gap-2 flex-wrap">
                    {proposal.genres && (
                      <>
                        {proposal.genres.split(",").map((genre, idx) => (
                          <span
                            key={idx}
                            className="text-xs bg-bg text-ink-soft px-2 py-1 rounded border border-line"
                          >
                            {genre}
                          </span>
                        ))}
                      </>
                    )}
                  </div>
                </div>
                {proposal.status === "DRAFT" && (
                  <Button
                    variant="accent"
                    onClick={() => handleSubmitProposal(proposal.id)}
                    className="ml-4"
                  >
                    Gửi duyệt
                  </Button>
                )}
              </Panel>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
