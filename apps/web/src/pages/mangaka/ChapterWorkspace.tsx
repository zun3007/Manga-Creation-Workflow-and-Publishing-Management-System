import { useEffect, useState, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "../../lib/api";
import type { PageItem, RegionItem } from "../../types";
import { Panel } from "../../components/ui/Panel";
import { Button } from "../../components/ui/Button";
import { PageCanvas } from "../../components/workspace/PageCanvas";
import { TaskAssignDialog } from "../../components/workspace/TaskAssignDialog";

export default function ChapterWorkspace() {
  const navigate = useNavigate();
  const { seriesId, chapterId } = useParams<{
    seriesId: string;
    chapterId: string;
  }>();

  const fileInputRef = useRef<HTMLInputElement>(null);

  const [pages, setPages] = useState<PageItem[]>([]);
  const [selectedPageId, setSelectedPageId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  // Upload state
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");

  // Task assignment
  const [assignRegion, setAssignRegion] = useState<RegionItem | null>(null);

  const id = parseInt(chapterId || "0");
  const seriesIdNum = parseInt(seriesId || "0");

  async function loadPages() {
    setLoading(true);
    setError(false);
    try {
      const res = await api.get(`/pages?chapterId=${id}`);
      const pagesList = res.data || [];
      setPages(pagesList);
      if (pagesList.length > 0 && !selectedPageId) {
        setSelectedPageId(pagesList[0].id);
      }
    } catch (e) {
      console.error("Failed to load pages", e);
      setError(true);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (id) loadPages();
  }, [id]);

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setUploadError("");

    try {
      // Upload file
      const fd = new FormData();
      fd.append("file", file);
      const uploadRes = await api.post<{ url: string }>("/uploads", fd);

      // Create page
      const pageRes = await api.post("/pages", {
        chapterId: id,
        imageUrl: uploadRes.data.url,
      });

      // Add to list and select
      const newPage = pageRes.data;
      setPages([...pages, newPage]);
      setSelectedPageId(newPage.id);
    } catch (e) {
      console.error("Failed to upload page", e);
      setUploadError("Không thể tải trang lên. Vui lòng thử lại.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }

  if (loading) {
    return (
      <div className="grid h-[60vh] place-items-center p-8">
        <span className="font-mono text-xs uppercase tracking-wider animate-pulse text-ink-soft">
          Đang tải chương…
        </span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="grid h-[60vh] place-items-center p-8">
        <Panel className="p-6 text-center">
          <p className="text-ink">Không tải được chương.</p>
          <Button className="mt-4" onClick={() => navigate("/series")}>
            Quay lại
          </Button>
        </Panel>
      </div>
    );
  }

  return (
    <>
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-line bg-bg/95 px-8 py-5 backdrop-blur">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate(`/series/${seriesIdNum}`)}
            className="px-3 py-2 text-ink-soft hover:text-ink transition"
          >
            ← Quay lại
          </button>
          <div>
            <h1 className="text-3xl text-ink">Không gian làm việc Chương</h1>
            <p className="font-mono text-[0.62rem] uppercase tracking-wider text-ink-soft mt-1">
              Tải trang và vẽ vùng để giao việc
            </p>
          </div>
        </div>
      </header>

      <div className="flex gap-8 p-8 h-[calc(100vh-120px)]">
        {/* Left: Pages list and upload */}
        <div className="w-48 flex flex-col gap-4 overflow-y-auto">
          <Panel className="p-4">
            <h2 className="font-mono text-[0.62rem] uppercase tracking-wider text-ink-soft mb-3">
              Trang
            </h2>
            <div className="space-y-2">
              {pages.length === 0 ? (
                <p className="text-xs text-ink-soft">Chưa có trang nào.</p>
              ) : (
                pages.map((page) => (
                  <button
                    key={page.id}
                    onClick={() => setSelectedPageId(page.id)}
                    className={`w-full text-left px-3 py-2 rounded transition text-sm font-medium ${
                      selectedPageId === page.id
                        ? "bg-accent text-white"
                        : "bg-surface text-ink hover:bg-surface/80 border border-line"
                    }`}
                  >
                    Trang {page.number}
                  </button>
                ))
              )}
            </div>
          </Panel>

          {/* Upload control */}
          <Panel className="p-4">
            <label className="block">
              <span className="mb-2 block font-mono text-[0.62rem] uppercase tracking-wider text-ink-soft">
                Tải trang
              </span>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                disabled={uploading}
                className="w-full text-xs"
              />
            </label>
            {uploading && (
              <p className="mt-2 text-xs text-ink-soft animate-pulse">Đang tải…</p>
            )}
            {uploadError && (
              <p className="mt-2 text-xs text-red-500">{uploadError}</p>
            )}
          </Panel>
        </div>

        {/* Right: Canvas and regions */}
        <div className="flex-1 flex flex-col gap-4 overflow-hidden">
          {selectedPageId && (
            <div className="flex justify-end">
              <Button onClick={() => navigate(`/studio/page/${selectedPageId}`)}>🎨 Mở Studio</Button>
            </div>
          )}
          <div className="flex-1 overflow-auto border border-line rounded-[var(--app-radius)] bg-surface p-4">
            {selectedPageId ? (
              <PageCanvas
                pageId={selectedPageId}
                onRegionClick={(region) => setAssignRegion(region)}
              />
            ) : (
              <div className="grid h-full place-items-center text-ink-soft">
                <p>Tải trang đầu tiên để bắt đầu.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Task assign dialog */}
      {assignRegion && (
        <TaskAssignDialog
          region={assignRegion}
          onClose={() => setAssignRegion(null)}
          onAssigned={() => {
            setAssignRegion(null);
            // Optionally reload page to see updated regions
          }}
        />
      )}
    </>
  );
}
