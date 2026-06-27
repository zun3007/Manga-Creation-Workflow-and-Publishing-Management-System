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
              border: "2px dashed var(--accent)",
              pointerEvents: "none",
            }}
            className="bg-accent/10"
          />
        )}

        {/* Existing regions */}
        {boxSize &&
          regions.map((region) => (
            <button
              key={region.id}
              onClick={() => onRegionClick?.(region)}
              aria-label={`Vùng ${region.type}`}
              style={{
                position: "absolute",
                left: `${region.x * boxSize.width}px`,
                top: `${region.y * boxSize.height}px`,
                width: `${region.width * boxSize.width}px`,
                height: `${region.height * boxSize.height}px`,
                border: "1px solid var(--accent)",
                cursor: "pointer",
                transition: "all 0.2s",
              }}
              className="bg-accent/10 hover:brightness-110"
            >
              <div className="absolute bottom-0.5 left-0.5 bg-accent text-white px-1 py-0.5 font-mono text-[0.5rem] uppercase rounded-[2px]">
                {region.type}
              </div>
            </button>
          ))}

        {/* New region popover */}
        {newRegionRect && boxSize && (
          <div
            style={{
              position: "absolute",
              left: `${newRegionRect.left + newRegionRect.width / 2 - 100}px`,
              top: `${newRegionRect.top - 120}px`,
            }}
          >
            <Panel className="p-4 w-[200px] shadow-lg">
              <label className="block mb-3">
                <span className="mb-1 block font-mono text-[0.62rem] uppercase tracking-wider text-ink-soft">
                  Loại vùng
                </span>
                <select
                  value={newRegionType}
                  onChange={(e) => setNewRegionType(e.target.value as RegionType)}
                  className="w-full rounded-[calc(var(--app-radius)*0.6)] border border-line bg-surface px-3 py-2 text-ink outline-none transition focus:border-accent"
                >
                  {REGION_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </label>
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
