import { useEffect, useState } from "react";
import { FileText, Upload, X } from "lucide-react";
import { api, apiErrorMessage } from "../../lib/api";
import { useAuth } from "../../lib/auth";
import { useToast } from "../../components/ui/Toast";
import { Panel } from "../../components/ui/Panel";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { Stamp } from "../../components/ui/Stamp";
import { Modal } from "../../components/ui/Modal";
import type { Proposal } from "../../types";

interface Genre {
  id: number;
  name: string;
}

interface SampleManuscriptConfig {
  maxMB: number;
  extensions: string[];
  accept: string;
  hint: string;
}

export default function Proposals() {
  useAuth();
  const toast = useToast();
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [genres, setGenres] = useState<Genre[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitErrors, setSubmitErrors] = useState<Record<number, string>>({});
  const [sampleConfig, setSampleConfig] = useState<SampleManuscriptConfig | null>(null);
  const [sampleFile, setSampleFile] = useState<File | null>(null);
  const [uploadingProposalId, setUploadingProposalId] = useState<number | null>(null);
  const [preview, setPreview] = useState<{ url: string; name: string } | null>(null);

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
        api.get("/proposals/sample-manuscript-config").then((res) => {
          setSampleConfig(res.data);
          return res;
        }),
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
      let created = res.data;
      if (sampleFile) {
        created = await uploadSampleManuscript(created.id, sampleFile);
      }
      setProposals([created, ...proposals]);
      toast.success("Đã tạo đề xuất.");
      setFormData({
        title: "",
        synopsis: "",
        proposedFrequency: "WEEKLY",
        genreIds: [],
      });
      setSampleFile(null);
    } catch (err: any) {
      console.error("Failed to create proposal:", err);
      setError(apiErrorMessage(err, "Lỗi khi tạo đề xuất"));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSubmitProposal(proposalId: number) {
    const proposal = proposals.find((p) => p.id === proposalId);
    if (!proposal?.sampleManuscriptUrl) {
      const msg = "Vui lòng tải bản thảo mẫu trước khi gửi duyệt.";
      setSubmitErrors((prev) => ({ ...prev, [proposalId]: msg }));
      toast.error(msg);
      return;
    }

    try {
      const res = await api.patch(`/proposals/${proposalId}/submit`);
      setProposals(proposals.map((p) => (p.id === proposalId ? res.data : p)));
      setSubmitErrors((prev) => ({ ...prev, [proposalId]: "" }));
      toast.success("Đã gửi đề xuất cho hội đồng.");
    } catch (err: any) {
      console.error("Failed to submit proposal:", err);
      const msg = apiErrorMessage(err, "Lỗi khi gửi đề xuất");
      setSubmitErrors((prev) => ({ ...prev, [proposalId]: msg }));
    }
  }

  async function uploadSampleManuscript(proposalId: number, file: File) {
    const fd = new FormData();
    fd.append("file", file);
    const { data } = await api.post(`/proposals/${proposalId}/sample-manuscript`, fd, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return data;
  }

  async function replaceProposalSample(proposalId: number, file: File | null) {
    if (!file) return;
    try {
      setUploadingProposalId(proposalId);
      const updated = await uploadSampleManuscript(proposalId, file);
      setProposals(proposals.map((p) => (p.id === proposalId ? updated : p)));
      setSubmitErrors((prev) => ({ ...prev, [proposalId]: "" }));
      toast.success("Đã cập nhật bản thảo mẫu.");
    } catch (err) {
      setError(apiErrorMessage(err, "Không thể tải bản thảo mẫu."));
    } finally {
      setUploadingProposalId(null);
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

          <div>
            <span className="mb-1 block font-mono text-[0.62rem] uppercase tracking-wider text-ink-soft">
              Bản thảo mẫu
            </span>
            <label className="flex cursor-pointer items-center justify-between gap-3 rounded-[calc(var(--app-radius)*0.6)] border border-dashed border-line bg-bg px-4 py-3 transition hover:border-accent hover:bg-surface">
              <span className="flex items-center gap-3 text-sm text-ink">
                <span className="grid h-9 w-9 place-items-center rounded-full bg-accent/10 text-accent">
                  <Upload size={17} />
                </span>
                <span>
                  <span className="block font-semibold">
                    {sampleFile ? sampleFile.name : "Bản thảo mẫu (không bắt buộc ở bản nháp)"}
                  </span>
                  <span className="text-xs text-ink-soft">
                    {sampleConfig?.hint ?? "Đang tải cấu hình upload..."}
                  </span>
                </span>
              </span>
              <span className="rounded bg-surface px-3 py-1 text-xs font-semibold text-ink border border-line">
                Chọn file
              </span>
              <input
                type="file"
                className="hidden"
                accept={sampleConfig?.accept}
                onChange={(e) => setSampleFile(e.target.files?.[0] ?? null)}
              />
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
                    {proposal.sampleManuscriptUrl ? (
                      <button
                        type="button"
                        onClick={() =>
                          setPreview({
                            url: proposal.sampleManuscriptUrl!,
                            name: proposal.sampleManuscriptName || "Bản thảo mẫu",
                          })
                        }
                        className="inline-flex items-center gap-1 text-xs bg-accent/10 text-accent px-2 py-1 rounded border border-accent/20"
                      >
                        <FileText size={13} />
                        {proposal.sampleManuscriptName || "Bản thảo mẫu"}
                      </button>
                    ) : (
                      <span className="text-xs bg-danger/10 text-danger px-2 py-1 rounded border border-danger/20">
                        Chưa có bản thảo mẫu
                      </span>
                    )}
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
                  {submitErrors[proposal.id] && (
                    <p className="mt-2 text-sm text-danger">{submitErrors[proposal.id]}</p>
                  )}
                </div>
                {proposal.status === "DRAFT" && (
                  <div className="ml-4 flex shrink-0 flex-col gap-2">
                    <label className="inline-flex cursor-pointer items-center justify-center rounded-[calc(var(--app-radius)*0.66)] border border-line bg-surface px-4 py-2 text-sm font-semibold text-ink transition hover:bg-bg">
                      {uploadingProposalId === proposal.id
                        ? "Đang tải..."
                        : proposal.sampleManuscriptUrl
                          ? "Thay bản thảo"
                          : "Tải bản thảo"}
                      <input
                        type="file"
                        className="hidden"
                        accept={sampleConfig?.accept}
                        disabled={uploadingProposalId === proposal.id}
                        onChange={(e) => replaceProposalSample(proposal.id, e.target.files?.[0] ?? null)}
                      />
                    </label>
                    <Button
                      variant="accent"
                      onClick={() => handleSubmitProposal(proposal.id)}
                    >
                      Gửi duyệt
                    </Button>
                  </div>
                )}
              </Panel>
            ))}
          </div>
        )}
      </div>

      <Modal
        open={preview !== null}
        onClose={() => setPreview(null)}
        title={preview?.name || "Xem bản thảo mẫu"}
        className="w-[min(92vw,1100px)] !overflow-hidden !border-line !bg-surface p-4 text-ink shadow-2xl shadow-black/20"
      >
        {preview && (
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-4 border-b border-line pb-3">
              <div className="min-w-0">
                <p className="font-mono text-[0.62rem] uppercase tracking-wider text-ink-soft">
                  Bản thảo mẫu
                </p>
                <h2 className="truncate text-lg font-semibold text-ink">{preview.name}</h2>
              </div>
              <button
                type="button"
                onClick={() => setPreview(null)}
                className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-ink-soft transition hover:bg-bg hover:text-ink focus:outline-none focus:ring-2 focus:ring-accent/30"
                aria-label="Đóng bản xem trước"
              >
                <X size={20} />
              </button>
            </div>

            {preview.name.toLowerCase().endsWith(".pdf") ? (
              <iframe
                src={preview.url}
                title={preview.name}
                className="h-[75vh] w-full rounded-lg border border-line bg-bg"
              />
            ) : (
              <div className="grid max-h-[75vh] place-items-center overflow-hidden rounded-lg bg-bg p-2">
                <img
                  src={preview.url}
                  alt={`Bản thảo mẫu ${preview.name}`}
                  className="max-h-[72vh] max-w-full object-contain"
                />
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
