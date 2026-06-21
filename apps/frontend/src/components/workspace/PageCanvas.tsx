import { useEffect, useRef, useState } from "react";
import { api } from "../../lib/api";
import type { PageDetail, RegionItem } from "../../types";
import { RegionType } from "@manga/shared";
import { Panel } from "../ui/Panel";
import { Button } from "../ui/Button";
import { useToast } from "../ui/Toast";

const REGION_TYPES = [
  RegionType.PANEL,
  RegionType.BACKGROUND,
  RegionType.CHARACTER,
  RegionType.DIALOGUE_BUBBLE,
  RegionType.EFFECT,
] as const;

const REGION_LABELS: Record<string, string> = {
  [RegionType.PANEL]: "Khung",
  [RegionType.BACKGROUND]: "Nền",
  [RegionType.CHARACTER]: "Nhân vật",
  [RegionType.DIALOGUE_BUBBLE]: "Thoại",
  [RegionType.EFFECT]: "Hiệu ứng",
};

interface Region extends RegionItem {
  isNew?: boolean;
}

interface PageCanvasProps {
  pageId: number;
  onRegionClick?: (region: RegionItem) => void;
}

export function PageCanvas({ pageId, onRegionClick }: PageCanvasProps) {
  const toast = useToast();
  const boxRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  const [page, setPage] = useState<PageDetail | null>(null);
  const [regions, setRegions] = useState<Region[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  // Canvas drawing state
  const [dragging, setDragging] = useState(false);
  const [startPos, setStartPos] = useState<{ x: number; y: number } | null>(null);
  const [currentPos, setCurrentPos] = useState<{ x: number; y: number } | null>(null);
  const [boxSize, setBoxSize] = useState<{ width: number; height: number } | null>(null);

  // New region popover
  const [newRegionRect, setNewRegionRect] = useState<{
    left: number;
    top: number;
    width: number;
    height: number;
  } | null>(null);
  const [newRegionType, setNewRegionType] = useState<RegionType>(RegionType.PANEL);
  // Editing the type of an existing region (S2-F07).
  const [editingRegionId, setEditingRegionId] = useState<number | null>(null);

  async function loadPage() {
    setLoading(true);
    setError(false);
    try {
      const res = await api.get<PageDetail>(`/pages/${pageId}`);
      setPage(res.data);
      setRegions(res.data.regions || []);
    } catch (e) {
      console.error("Failed to load page", e);
      setError(true);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (pageId) loadPage();
  }, [pageId]);

  // Measure box size on img load and window resize
  function updateBoxSize() {
    if (imgRef.current && boxRef.current) {
      const rect = boxRef.current.getBoundingClientRect();
      setBoxSize({ width: rect.width, height: rect.height });
    }
  }

  useEffect(() => {
    updateBoxSize();
    window.addEventListener("resize", updateBoxSize);
    return () => window.removeEventListener("resize", updateBoxSize);
  }, []);

  function handleMouseDown(e: React.MouseEvent<HTMLDivElement>) {
    if (e.button !== 0) return; // Left button only
    if (!boxRef.current) return;

    const rect = boxRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setDragging(true);
    setStartPos({ x, y });
    setCurrentPos({ x, y });
  }

  function handleMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    if (!dragging || !startPos) return;
    if (!boxRef.current) return;

    const rect = boxRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setCurrentPos({ x, y });
  }

  function handleMouseUp() {
    if (!dragging || !startPos || !currentPos || !boxSize) {
      setDragging(false);
      setStartPos(null);
      setCurrentPos(null);
      return;
    }

    const left = Math.min(startPos.x, currentPos.x);
    const top = Math.min(startPos.y, currentPos.y);
    const width = Math.abs(currentPos.x - startPos.x);
    const height = Math.abs(currentPos.y - startPos.y);

    // Ignore tiny drags
    if (width < 5 || height < 5) {
      setDragging(false);
      setStartPos(null);
      setCurrentPos(null);
      return;
    }

    setNewRegionRect({ left, top, width, height });
    setNewRegionType(RegionType.PANEL);

    setDragging(false);
    setStartPos(null);
    setCurrentPos(null);
  }

  async function handleSaveRegion() {
    if (!newRegionRect || !boxSize) return;

    const { left, top, width, height } = newRegionRect;
    const normalizedRegion = {
      x: left / boxSize.width,
      y: top / boxSize.height,
      width: width / boxSize.width,
      height: height / boxSize.height,
    };

    try {
      const res = await api.post(`/regions`, {
        pageId,
        regionType: newRegionType,
        ...normalizedRegion,
      });
      setRegions([...regions, res.data]);
      setNewRegionRect(null);
      toast.success("Đã thêm vùng.");
    } catch (e) {
      console.error("Failed to create region", e);
      toast.error("Không thể thêm vùng. Vui lòng thử lại.");
    }
  }

  async function handleDeleteRegion(region: Region) {
    try {
      await api.delete(`/regions/${region.id}`);
      setRegions((prev) => prev.filter((r) => r.id !== region.id));
      toast.success("Đã xoá vùng.");
    } catch (e) {
      console.error("Failed to delete region", e);
      // The Task→Region FK blocks deleting a region that already has a task.
      toast.error("Không thể xoá vùng đã được giao việc.");
    }
  }

  async function handleUpdateRegionType(region: Region, type: RegionType) {
    setEditingRegionId(null);
    if (type === region.type) return;
    try {
      const res = await api.patch<Region>(`/regions/${region.id}`, { regionType: type });
      setRegions((prev) => prev.map((r) => (r.id === region.id ? { ...r, ...res.data } : r)));
      toast.success("Đã đổi loại vùng.");
    } catch (e) {
      console.error("Failed to update region", e);
      toast.error("Không thể đổi loại vùng.");
    }
  }

  if (loading) {
    return (
      <div className="grid h-[60vh] place-items-center">
        <span className="font-mono text-xs uppercase tracking-wider animate-pulse text-ink-soft">
          Đang tải trang…
        </span>
      </div>
    );
  }

  if (error || !page) {
    return (
      <Panel className="p-6 text-center text-ink-soft">
        Không tải được trang.
      </Panel>
    );
  }

  return (
    <div className="space-y-4">
      {/* Canvas container */}
      <div
        ref={boxRef}
        style={{
          position: "relative",
          display: "inline-block",
          maxWidth: "100%",
        }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={() => {
          if (dragging) {
            setDragging(false);
            setStartPos(null);
            setCurrentPos(null);
          }
        }}
      >
        <img
          ref={imgRef}
          src={page.imageUrl}
          alt="Page"
          draggable={false}
          onLoad={updateBoxSize}
          style={{
            display: "block",
            maxWidth: "100%",
            cursor: dragging ? "crosshair" : "default",
            userSelect: "none",
          }}
        />

        {/* Overlay for region drawing */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            cursor: "crosshair",
          }}
        />

        {/* Live drag rectangle */}
        {dragging && startPos && currentPos && (
          <div
            style={{
              position: "absolute",
              left: `${Math.min(startPos.x, currentPos.x)}px`,
              top: `${Math.min(startPos.y, currentPos.y)}px`,
              width: `${Math.abs(currentPos.x - startPos.x)}px`,
              height: `${Math.abs(currentPos.y - startPos.y)}px`,
              border: "2px dashed var(--app-accent)",
              pointerEvents: "none",
            }}
            className="bg-accent/10"
          />
        )}

        {/* Existing regions */}
        {boxSize &&
          regions.map((region) => {
            const rx = region.x * boxSize.width;
            const ry = region.y * boxSize.height;
            const rw = region.width * boxSize.width;
            const rh = region.height * boxSize.height;
            const label = REGION_LABELS[region.type] ?? region.type;
            return (
              <div key={region.id}>
                <button
                  onClick={() => onRegionClick?.(region)}
                  aria-label={`Vùng ${label} — nhấn để giao việc`}
                  style={{
                    position: "absolute",
                    left: `${rx}px`,
                    top: `${ry}px`,
                    width: `${rw}px`,
                    height: `${rh}px`,
                    border: "1px solid var(--app-accent)",
                    cursor: "pointer",
                    transition: "all 0.2s",
                  }}
                  className="bg-accent/10 hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                >
                  <div className="absolute bottom-0.5 left-0.5 bg-accent text-white px-1 py-0.5 font-mono text-[0.5rem] uppercase rounded-[2px]">
                    {label}
                  </div>
                </button>
                {/* Edit type */}
                <button
                  type="button"
                  aria-label={`Đổi loại vùng ${label}`}
                  title="Đổi loại vùng"
                  onClick={() => setEditingRegionId(editingRegionId === region.id ? null : region.id)}
                  style={{ position: "absolute", left: `${rx + rw - 32}px`, top: `${ry - 10}px` }}
                  className="grid h-5 w-5 place-items-center rounded-full bg-accent text-[0.6rem] leading-none text-white opacity-80 transition hover:opacity-100 hover:brightness-110 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                >
                  ✎
                </button>
                {/* Delete */}
                <button
                  type="button"
                  aria-label={`Xoá vùng ${label}`}
                  title="Xoá vùng"
                  onClick={() => handleDeleteRegion(region)}
                  style={{ position: "absolute", left: `${rx + rw - 10}px`, top: `${ry - 10}px` }}
                  className="grid h-5 w-5 place-items-center rounded-full bg-danger text-xs leading-none text-white opacity-80 transition hover:opacity-100 hover:brightness-110 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-danger"
                >
                  ×
                </button>
                {/* Edit-type chip popover */}
                {editingRegionId === region.id && (
                  <div
                    style={{
                      position: "absolute",
                      left: `${Math.max(4, Math.min(rx, boxSize.width - 184))}px`,
                      top: ry + rh + 6 > boxSize.height - 64 ? `${Math.max(4, ry - 58)}px` : `${ry + rh + 6}px`,
                    }}
                  >
                    <Panel className="p-2 shadow-lg">
                      <div className="flex w-[170px] flex-wrap gap-1">
                        {REGION_TYPES.map((t) => (
                          <button
                            key={t}
                            type="button"
                            onClick={() => handleUpdateRegionType(region, t)}
                            className={`rounded-full px-2 py-1 font-mono text-[0.6rem] uppercase tracking-wider transition ${
                              t === region.type
                                ? "bg-accent text-white"
                                : "border border-line bg-bg text-ink-soft hover:text-ink"
                            }`}
                          >
                            {REGION_LABELS[t] ?? t}
                          </button>
                        ))}
                      </div>
                    </Panel>
                  </div>
                )}
              </div>
            );
          })}

        {/* Empty-state hint: invite the mangaka to draw the first region. */}
        {boxSize && regions.length === 0 && !dragging && !newRegionRect && (
          <div className="pointer-events-none absolute inset-0 grid place-items-center">
            <span className="rounded-full bg-ink/70 px-3 py-1.5 font-mono text-[0.62rem] uppercase tracking-wider text-bg">
              Kéo để vẽ vùng giao việc
            </span>
          </div>
        )}

        {/* New region popover — clamped within the canvas so it never clips off-edge. */}
        {newRegionRect && boxSize && (
          <div
            style={{
              position: "absolute",
              left: `${Math.max(4, Math.min(newRegionRect.left + newRegionRect.width / 2 - 100, boxSize.width - 204))}px`,
              top:
                newRegionRect.top - 120 < 4
                  ? `${newRegionRect.top + newRegionRect.height + 8}px`
                  : `${newRegionRect.top - 120}px`,
            }}
          >
            <Panel className="p-4 w-[210px] shadow-lg">
              <span className="mb-1.5 block font-mono text-[0.62rem] uppercase tracking-wider text-ink-soft">
                Loại vùng
              </span>
              <div className="mb-3 flex flex-wrap gap-1.5">
                {REGION_TYPES.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setNewRegionType(t)}
                    className={`rounded-full px-2.5 py-1 text-xs transition ${
                      newRegionType === t
                        ? "bg-accent text-white"
                        : "border border-line bg-bg text-ink-soft hover:border-accent/40 hover:text-ink"
                    }`}
                  >
                    {REGION_LABELS[t] ?? t}
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <Button
                  variant="soft"
                  className="flex-1"
                  onClick={() => setNewRegionRect(null)}
                >
                  Hủy
                </Button>
                <Button className="flex-1" onClick={handleSaveRegion}>
                  Lưu vùng
                </Button>
              </div>
            </Panel>
          </div>
        )}
      </div>
    </div>
  );
}
