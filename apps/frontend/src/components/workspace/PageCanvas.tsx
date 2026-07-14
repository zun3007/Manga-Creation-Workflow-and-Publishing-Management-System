import { useEffect, useRef, useState } from "react";
import { Coins, MousePointerClick } from "lucide-react";
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

interface PriceRule {
  id: number;
  name: string;
  regionType: RegionType;
  basePrice: string | number;
}

interface PageCanvasProps {
  pageId: number;
  onRegionClick?: (region: RegionItem) => void;
  readOnly?: boolean;
  refreshKey?: number;
}

export function PageCanvas({
  pageId,
  onRegionClick,
  readOnly = false,
  refreshKey = 0,
}: PageCanvasProps) {
  const toast = useToast();
  const boxRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  const [page, setPage] = useState<PageDetail | null>(null);
  const [regions, setRegions] = useState<Region[]>([]);
  const [priceByType, setPriceByType] = useState<Partial<Record<RegionType, number>>>({});
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

  async function loadPriceRules() {
    try {
      const res = await api.get<PriceRule[]>("/tasks/price-rules");
      const next: Partial<Record<RegionType, number>> = {};
      for (const rule of res.data || []) {
        if (next[rule.regionType] !== undefined) continue;
        const value = Number(rule.basePrice);
        next[rule.regionType] = Number.isFinite(value) ? value : 0;
      }
      setPriceByType(next);
    } catch (e) {
      console.error("Failed to load task price rules", e);
      setPriceByType({});
    }
  }

  useEffect(() => {
    if (pageId) {
      loadPage();
      loadPriceRules();
    }
  }, [pageId, refreshKey]);

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
    if (readOnly) return;
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
    if (readOnly) return;
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

  function formatMoney(value?: number) {
    if (value === undefined) return "Chưa có giá";
    return `${value.toLocaleString("vi-VN")} ₫`;
  }

  function regionLabel(type: RegionType) {
    const labels: Record<RegionType, string> = {
      [RegionType.PANEL]: "Khung truyện",
      [RegionType.BACKGROUND]: "Nền",
      [RegionType.CHARACTER]: "Nhân vật",
      [RegionType.DIALOGUE_BUBBLE]: "Bong bóng thoại",
      [RegionType.EFFECT]: "Hiệu ứng",
    };
    return labels[type] ?? type;
  }

  const selectedPrice = priceByType[newRegionType];

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
        {!readOnly && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              cursor: "crosshair",
            }}
          />
        )}

        {/* Live drag rectangle */}
        {!readOnly && dragging && startPos && currentPos && (
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
              className="group bg-accent/10 hover:bg-accent/20 hover:brightness-110"
            >
              <div className="absolute bottom-1 left-1 overflow-hidden rounded-lg border border-accent/25 bg-surface/95 text-left shadow-md backdrop-blur">
                <div className="bg-accent px-2 py-0.5 font-mono text-[0.52rem] uppercase tracking-wider text-white">
                  {region.type}
                </div>
                <div className="flex items-center gap-1 px-2 py-1 text-[0.68rem] font-semibold text-ink">
                  <Coins size={11} className="text-accent" aria-hidden="true" />
                  {formatMoney(priceByType[region.type])}
                </div>
              </div>
            </button>
          ))}

        {/* New region popover */}
        {!readOnly && newRegionRect && boxSize && (
          <div
            style={{
              position: "absolute",
              left: `${newRegionRect.left + newRegionRect.width / 2 - 140}px`,
              top: `${Math.max(8, newRegionRect.top - 190)}px`,
            }}
          >
            <Panel className="w-[280px] !border-line !bg-surface p-5 text-ink shadow-xl shadow-accent/10">
              <div className="mb-4 border-b border-line pb-3">
                <div className="mb-2 flex items-center gap-2">
                  <span className="grid h-8 w-8 place-items-center rounded-full bg-accent/10 text-accent">
                    <MousePointerClick size={16} aria-hidden="true" />
                  </span>
                  <div>
                    <p className="font-mono text-[0.58rem] uppercase tracking-[0.22em] text-ink-soft">
                      Vùng giao việc
                    </p>
                    <h3 className="font-[var(--font-display)] text-xl leading-tight text-ink">
                      Chọn loại vùng
                    </h3>
                  </div>
                </div>
              </div>

              <label className="block mb-3">
                <span className="mb-2 block text-sm font-semibold text-ink">
                  Loại vùng
                </span>
                <select
                  value={newRegionType}
                  onChange={(e) => setNewRegionType(e.target.value as RegionType)}
                  className="w-full rounded-xl border border-line bg-bg px-4 py-3 text-sm font-semibold text-ink outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20"
                >
                  {REGION_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {regionLabel(t)} - {formatMoney(priceByType[t])}
                    </option>
                  ))}
                </select>
              </label>

              <div className="mb-4 rounded-2xl border border-accent/20 bg-accent/10 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-mono text-[0.58rem] uppercase tracking-wider text-ink-soft">
                      Task sẽ tạo
                    </p>
                    <p className="mt-1 font-semibold text-ink">
                      {regionLabel(newRegionType)}
                    </p>
                  </div>
                  <span className="rounded-full border border-accent/25 bg-surface px-2 py-1 font-mono text-[0.6rem] text-accent">
                    {newRegionType}
                  </span>
                </div>
                <div className="mt-3 flex items-center justify-between rounded-xl border border-line bg-surface px-3 py-2">
                  <span className="flex items-center gap-2 text-sm font-medium text-ink">
                    <Coins size={16} className="text-accent" aria-hidden="true" />
                    Tiền task
                  </span>
                  <strong className="text-lg text-accent">{formatMoney(selectedPrice)}</strong>
                </div>
              </div>

              <div className="flex gap-3">
                <Button
                  variant="soft"
                  className="flex-1 !border-line !bg-surface !text-ink hover:!bg-bg"
                  onClick={() => setNewRegionRect(null)}
                >
                  Hủy
                </Button>
                <Button className="flex-1 !bg-accent text-white hover:brightness-105" onClick={handleSaveRegion}>
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
