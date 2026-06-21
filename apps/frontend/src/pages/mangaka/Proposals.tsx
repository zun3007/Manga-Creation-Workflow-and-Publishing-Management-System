import { useEffect, useRef, useState } from "react";
import { api, apiErrorMessage } from "../../lib/api";
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

type FormState = {
  title: string;
  synopsis: string;
  proposedFrequency: string;
  genreIds: number[];
  sampleManuscriptUrl: string;
  manuscriptName: string;
};

const EMPTY_FORM: FormState = {
  title: "",
  synopsis: "",
  proposedFrequency: "WEEKLY",
  genreIds: [],
  sampleManuscriptUrl: "",
  manuscriptName: "",
};

export default function Proposals() {
  useAuth();
  const toast = useToast();
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [genres, setGenres] = useState<Genre[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState<FormState>(EMPTY_FORM);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLDivElement>(null);

  async function loadData() {
    try {
      setLoading(true);
      const [proposalsRes, genresRes] = await Promise.all([
        api.get<Proposal[]>("/proposals/mine"),
        api.get<Genre[]>("/genres"),
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

  useEffect(() => {
    loadData();
  }, []);

  function resetForm() {
    setFormData(EMPTY_FORM);
    setEditingId(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function startEdit(p: Proposal) {
    // proposal.genres is a comma-separated list of NAMES — map back to ids.
    const names = (p.genres ?? "").split(",").filter(Boolean);
    const genreIds = names
      .map((n) => genres.find((g) => g.name === n)?.id)
      .filter((id): id is number => typeof id === "number");
    setEditingId(p.id);
    setFormData({
      title: p.title,
      synopsis: p.synopsis ?? "",
      proposedFrequency: p.proposedFrequency ?? "WEEKLY",
      genreIds,
      sampleManuscriptUrl: p.sampleManuscriptUrl ?? "",
      manuscriptName: p.sampleManuscriptUrl ? "Bản thảo đã tải" : "",
    });
    setError(null);
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  async function handleManuscriptFile(file: File) {
    setUploading(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await api.post<{ url: string; originalName?: string }>(
        "/uploads",
        fd,
        { headers: { "Content-Type": "multipart/form-data" } },
      );
      setFormData((prev) => ({
        ...prev,
        sampleManuscriptUrl: res.data.url,
        manuscriptName: res.data.originalName || file.name,
      }));
      toast.success("Đã tải bản thảo lên.");
    } catch (err) {
      console.error("Manuscript upload failed:", err);
      setError(apiErrorMessage(err, "Tải bản thảo thất bại"));
    } finally {
      setUploading(false);
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

    const payload = {
      title: formData.title,
      synopsis: formData.synopsis || null,
      proposedFrequency: formData.proposedFrequency,
      genreIds: formData.genreIds,
      sampleManuscriptUrl: formData.sampleManuscriptUrl || null,
    };

    try {
      setSubmitting(true);
      setError(null);
      if (editingId !== null) {
        const res = await api.patch<Proposal>(`/proposals/${editingId}`, payload);
        setProposals((prev) => prev.map((p) => (p.id === editingId ? res.data : p)));
        toast.success("Đã lưu thay đổi.");
      } else {
        const res = await api.post<Proposal>("/proposals", payload);
        setProposals((prev) => [res.data, ...prev]);
        toast.success("Đã tạo đề xuất.");
      }
      resetForm();
    } catch (err) {
      console.error("Failed to save proposal:", err);
      setError(apiErrorMessage(err, "Lỗi khi lưu đề xuất"));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSubmitProposal(proposalId: number) {
    try {
      const res = await api.patch<Proposal>(`/proposals/${proposalId}/submit`);
      setProposals((prev) => prev.map((p) => (p.id === proposalId ? res.data : p)));
      toast.success("Đã gửi đề xuất cho hội đồng.");
    } catch (err) {
      console.error("Failed to submit proposal:", err);
      setError(apiErrorMessage(err, "Lỗi khi gửi đề xuất"));
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

      {/* Form Panel (create or edit) */}
      <div ref={formRef}>
        <Panel className="mt-6 p-6">
          <h2 className="text-lg font-semibold text-ink mb-4">
            {editingId !== null ? "Sửa đề xuất" : "Đề xuất mới"}
          </h2>
          <form onSubmit={handleSubmitForm} className="space-y-4">
            <Input
              label="Tiêu đề"
              type="text"
              placeholder="Nhập tiêu đề series"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
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
                  onChange={(e) => setFormData({ ...formData, synopsis: e.target.value })}
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
                    setFormData({ ...formData, proposedFrequency: e.target.value })
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
                    <label key={g.id} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.genreIds.includes(g.id)}
                        onChange={() => toggleGenre(g.id)}
                        className="w-4 h-4 accent-[var(--app-accent)]"
                      />
                      <span className="text-sm text-ink">{g.name}</span>
                    </label>
                  ))}
                </div>
              </label>
            </div>

            {/* Sample manuscript upload */}
            <div>
              <span className="mb-1 block font-mono text-[0.62rem] uppercase tracking-wider text-ink-soft">
                Bản thảo mẫu (không bắt buộc)
              </span>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,.pdf,.psd"
                className="sr-only"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleManuscriptFile(f);
                }}
              />
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="soft"
                  onClick={() => fileInputRef.current?.click()}
                  loading={uploading}
                  disabled={uploading}
                >
                  {formData.sampleManuscriptUrl ? "Đổi bản thảo" : "Tải bản thảo"}
                </Button>
                {formData.sampleManuscriptUrl && (
                  <>
                    <a
                      href={formData.sampleManuscriptUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="truncate text-sm text-accent hover:underline"
                    >
                      {formData.manuscriptName || "Xem bản thảo"}
                    </a>
                    <button
                      type="button"
                      onClick={() => {
                        setFormData((p) => ({ ...p, sampleManuscriptUrl: "", manuscriptName: "" }));
                        if (fileInputRef.current) fileInputRef.current.value = "";
                      }}
                      className="text-xs text-ink-soft transition hover:text-danger"
                    >
                      ✕ Xóa
                    </button>
                  </>
                )}
              </div>
            </div>

            <div className="flex gap-2">
              <Button type="submit" disabled={submitting || uploading} variant="accent" className="flex-1">
                {submitting
                  ? "Đang lưu..."
                  : editingId !== null
                    ? "Lưu thay đổi"
                    : "Tạo đề xuất"}
              </Button>
              {editingId !== null && (
                <Button type="button" variant="soft" onClick={resetForm} disabled={submitting}>
                  Hủy
                </Button>
              )}
            </div>
          </form>
        </Panel>
      </div>

      {/* Proposals List */}
      <div className="mt-8">
        <h2 className="text-lg font-semibold text-ink mb-4">Các đề xuất của bạn</h2>
        {proposals.length === 0 ? (
          <Panel className="p-6 text-ink-soft text-center">Chưa có đề xuất nào</Panel>
        ) : (
          <div className="space-y-3">
            {proposals.map((proposal) => (
              <Panel key={proposal.id} className="p-4 flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold text-ink">{proposal.title}</h3>
                    <Stamp status={proposal.status || "DRAFT"} />
                  </div>
                  {proposal.synopsis && (
                    <p className="text-sm text-ink-soft mb-2">{proposal.synopsis}</p>
                  )}
                  <div className="flex gap-2 flex-wrap">
                    {proposal.genres &&
                      proposal.genres.split(",").filter(Boolean).map((genre, idx) => (
                        <span
                          key={idx}
                          className="text-xs bg-bg text-ink-soft px-2 py-1 rounded border border-line"
                        >
                          {genre}
                        </span>
                      ))}
                  </div>
                  {proposal.sampleManuscriptUrl && (
                    <a
                      href={proposal.sampleManuscriptUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-2 inline-block text-xs font-semibold text-accent hover:underline"
                    >
                      → Bản thảo mẫu
                    </a>
                  )}
                </div>
                {proposal.status === "DRAFT" && (
                  <div className="flex shrink-0 flex-col gap-2">
                    <Button variant="accent" onClick={() => handleSubmitProposal(proposal.id)}>
                      Gửi duyệt
                    </Button>
                    <Button variant="soft" onClick={() => startEdit(proposal)}>
                      Sửa
                    </Button>
                  </div>
                )}
              </Panel>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
