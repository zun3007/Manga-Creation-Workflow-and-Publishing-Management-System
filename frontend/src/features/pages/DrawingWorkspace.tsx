import { useEffect, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import "./DrawingWorkspace.css";

type Tool = "brush" | "eraser" | "select" | "pan";

type BrushPreset =
  | "pencil"
  | "ink"
  | "gpen"
  | "brushpen"
  | "marker"
  | "airbrush";

type DrawingRegion = {
  id: number;
  type: string;
  xCoordinate: string | number;
  yCoordinate: string | number;
  width: string | number;
  height: string | number;
};

type DrawingWorkspaceProps = {
  pageTitle: string;
  imageUrl?: string;
  targetRegion?: DrawingRegion | null;
  onClose: () => void;
  onApplyDrawing?: (imageData: string) => void;
  onSaveVersion?: (imageData: string) => Promise<void>;
};

const CANVAS_WIDTH = 900;
const CANVAS_HEIGHT = 1200;
const MAX_HISTORY_LENGTH = 40;

const brushPresets: {
  id: BrushPreset;
  label: string;
  icon: string;
  description: string;
  defaultSize: number;
}[] = [
  {
    id: "pencil",
    label: "Pencil",
    icon: "✏️",
    description: "Sketch line",
    defaultSize: 3,
  },
  {
    id: "ink",
    label: "Ink Pen",
    icon: "🖊️",
    description: "Clean ink",
    defaultSize: 5,
  },
  {
    id: "gpen",
    label: "G-Pen",
    icon: "🖋️",
    description: "Manga line",
    defaultSize: 7,
  },
  {
    id: "brushpen",
    label: "Brush Pen",
    icon: "🖌️",
    description: "Soft stroke",
    defaultSize: 10,
  },
  {
    id: "marker",
    label: "Marker",
    icon: "▰",
    description: "Wide marker",
    defaultSize: 18,
  },
  {
    id: "airbrush",
    label: "Airbrush",
    icon: "☁️",
    description: "Soft spray",
    defaultSize: 22,
  },
];

const swatches = [
  "#111111",
  "#ef4444",
  "#f97316",
  "#facc15",
  "#22c55e",
  "#3b82f6",
  "#8b5cf6",
  "#ffffff",
];

function getToolIcon(tool: Tool) {
  if (tool === "brush") {
    return "🖌️";
  }

  if (tool === "eraser") {
    return "⌫";
  }

  if (tool === "select") {
    return "▣";
  }

  return "✥";
}

function getToolLabel(tool: Tool) {
  if (tool === "brush") {
    return "Brush";
  }

  if (tool === "eraser") {
    return "Eraser";
  }

  if (tool === "select") {
    return "Select";
  }

  return "Pan";
}

export function DrawingWorkspace({
  pageTitle,
  imageUrl,
  targetRegion,
  onClose,
  onApplyDrawing,
  onSaveVersion,
}: DrawingWorkspaceProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const canvasAreaRef = useRef<HTMLDivElement | null>(null);

  /*
    Quan trọng:
    Chỉ lấy imageUrl ban đầu khi mở workspace.
    Không dùng imageUrl thay đổi sau mỗi lần vẽ, vì sẽ làm reset canvas và mất undo history.
  */
  const initialImageUrlRef = useRef(imageUrl);

  const isDrawingRef = useRef(false);
  const undoStackRef = useRef<string[]>([]);
  const redoStackRef = useRef<string[]>([]);

  const panStartRef = useRef({
    x: 0,
    y: 0,
    scrollLeft: 0,
    scrollTop: 0,
  });

  const [tool, setTool] = useState<Tool>("brush");
  const [brushPreset, setBrushPreset] = useState<BrushPreset>("ink");
  const [brushColor, setBrushColor] = useState("#111111");
  const [brushSize, setBrushSize] = useState(6);
  const [isPanning, setIsPanning] = useState(false);
  const [message, setMessage] = useState("");
  const [selectedRegionText, setSelectedRegionText] =
    useState("No region selected");

  const [zoom, setZoom] = useState(1);

  const [historyState, setHistoryState] = useState({
    undo: 0,
    redo: 0,
  });

  useEffect(() => {
    prepareCanvas();
  }, []);

  function syncHistoryState() {
    setHistoryState({
      undo: undoStackRef.current.length,
      redo: redoStackRef.current.length,
    });
  }

  function getContext() {
    const canvas = canvasRef.current;

    if (!canvas) {
      return null;
    }

    return canvas.getContext("2d");
  }

  function getCanvasSnapshot() {
    const canvas = canvasRef.current;

    if (!canvas) {
      return "";
    }

    try {
      return canvas.toDataURL("image/png");
    } catch {
      setMessage(
        "Không thể lưu lịch sử canvas. Ảnh nguồn có thể bị chặn CORS.",
      );
      return "";
    }
  }

  function pushHistorySnapshot(clearRedo = true) {
    const snapshot = getCanvasSnapshot();

    if (!snapshot) {
      syncHistoryState();
      return;
    }

    const lastSnapshot = undoStackRef.current[undoStackRef.current.length - 1];

    if (lastSnapshot === snapshot) {
      syncHistoryState();
      return;
    }

    undoStackRef.current.push(snapshot);

    if (undoStackRef.current.length > MAX_HISTORY_LENGTH) {
      undoStackRef.current.shift();
    }

    if (clearRedo) {
      redoStackRef.current = [];
    }

    syncHistoryState();
  }

  function restoreCanvasSnapshot(snapshot: string) {
    const canvas = canvasRef.current;
    const context = getContext();

    if (!canvas || !context || !snapshot) {
      return;
    }

    const image = new Image();

    image.onload = () => {
      resetContext(context);
      context.clearRect(0, 0, canvas.width, canvas.height);
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
    };

    image.src = snapshot;
  }

  function undo() {
    if (undoStackRef.current.length <= 1) {
      setMessage("Không còn bước để Undo.");
      syncHistoryState();
      return;
    }

    const currentSnapshot = undoStackRef.current.pop();

    if (currentSnapshot) {
      redoStackRef.current.push(currentSnapshot);
    }

    const previousSnapshot =
      undoStackRef.current[undoStackRef.current.length - 1];

    if (previousSnapshot) {
      restoreCanvasSnapshot(previousSnapshot);
      setMessage("Đã Undo.");
    }

    syncHistoryState();
  }

  function redo() {
    if (redoStackRef.current.length === 0) {
      setMessage("Không còn bước để Redo.");
      syncHistoryState();
      return;
    }

    const nextSnapshot = redoStackRef.current.pop();

    if (!nextSnapshot) {
      syncHistoryState();
      return;
    }

    undoStackRef.current.push(nextSnapshot);
    restoreCanvasSnapshot(nextSnapshot);
    setMessage("Đã Redo.");
    syncHistoryState();
  }

  function prepareCanvas() {
    const canvas = canvasRef.current;

    if (!canvas) {
      return;
    }

    canvas.width = CANVAS_WIDTH;
    canvas.height = CANVAS_HEIGHT;

    undoStackRef.current = [];
    redoStackRef.current = [];
    syncHistoryState();

    paintBaseCanvas(() => {
      pushHistorySnapshot(true);
    });
  }

  function paintBaseCanvas(afterPaint?: () => void) {
    const canvas = canvasRef.current;
    const context = getContext();

    if (!canvas || !context) {
      return;
    }

    resetContext(context);

    context.fillStyle = "#fff8e7";
    context.fillRect(0, 0, canvas.width, canvas.height);

    const sourceImageUrl = initialImageUrlRef.current;

    if (!sourceImageUrl) {
      drawEmptyPage(context);
      afterPaint?.();
      return;
    }

    const image = new Image();
    image.crossOrigin = "anonymous";

    image.onload = () => {
      resetContext(context);
      context.fillStyle = "#fff8e7";
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      afterPaint?.();
    };

    image.onerror = () => {
      drawEmptyPage(context);
      afterPaint?.();
      setMessage("Không tải được ảnh page, đang dùng canvas mặc định.");
    };

    image.src = sourceImageUrl;
  }

  function resetContext(context: CanvasRenderingContext2D) {
    context.globalAlpha = 1;
    context.shadowBlur = 0;
    context.shadowColor = "transparent";
    context.globalCompositeOperation = "source-over";
    context.lineCap = "round";
    context.lineJoin = "round";
  }

  function drawEmptyPage(context: CanvasRenderingContext2D) {
    resetContext(context);

    context.fillStyle = "#fff8e7";
    context.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    context.strokeStyle = "#f0dfc8";
    context.lineWidth = 4;
    context.strokeRect(70, 70, 760, 1060);

    context.fillStyle = "#9ca3af";
    context.font = "bold 42px Arial";
    context.textAlign = "center";
    context.fillText("Manga Page Canvas", 450, 560);

    context.font = "20px Arial";
    context.fillText("Draw directly on this page", 450, 600);
  }

  function getCanvasPoint(event: ReactPointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;

    if (!canvas) {
      return { x: 0, y: 0 };
    }

    const rect = canvas.getBoundingClientRect();

    return {
      x: ((event.clientX - rect.left) / rect.width) * canvas.width,
      y: ((event.clientY - rect.top) / rect.height) * canvas.height,
    };
  }

  function startDrawing(event: ReactPointerEvent<HTMLCanvasElement>) {
    if (tool === "select") {
      handleSelectCanvas(event);
      return;
    }

    if (tool === "pan") {
      return;
    }

    event.preventDefault();

    const canvas = canvasRef.current;
    const context = getContext();

    if (!canvas || !context) {
      return;
    }

    try {
      canvas.setPointerCapture(event.pointerId);
    } catch {
      // Ignore pointer capture issues.
    }

    const { x, y } = getCanvasPoint(event);

    isDrawingRef.current = true;

    applyBrushStyle(context, event);
    context.beginPath();
    context.moveTo(x, y);

    if (brushPreset === "airbrush" && tool === "brush") {
      drawAirbrush(context, x, y);
    }
  }

  function draw(event: ReactPointerEvent<HTMLCanvasElement>) {
    if (!isDrawingRef.current || tool === "select" || tool === "pan") {
      return;
    }

    event.preventDefault();

    const context = getContext();

    if (!context) {
      return;
    }

    const { x, y } = getCanvasPoint(event);

    if (brushPreset === "airbrush" && tool === "brush") {
      drawAirbrush(context, x, y);
      return;
    }

    applyBrushStyle(context, event);
    context.lineTo(x, y);
    context.stroke();
  }

  function stopDrawing() {
    if (!isDrawingRef.current) {
      return;
    }

    isDrawingRef.current = false;

    const context = getContext();

    if (context) {
      context.closePath();
      resetContext(context);
    }

    pushHistorySnapshot(true);
  }

  function startPan(event: ReactPointerEvent<HTMLDivElement>) {
    if (tool !== "pan") {
      return;
    }

    const area = canvasAreaRef.current;

    if (!area) {
      return;
    }

    event.preventDefault();

    setIsPanning(true);

    panStartRef.current = {
      x: event.clientX,
      y: event.clientY,
      scrollLeft: area.scrollLeft,
      scrollTop: area.scrollTop,
    };
  }

  function movePan(event: ReactPointerEvent<HTMLDivElement>) {
    if (!isPanning || tool !== "pan") {
      return;
    }

    const area = canvasAreaRef.current;

    if (!area) {
      return;
    }

    event.preventDefault();

    const dx = event.clientX - panStartRef.current.x;
    const dy = event.clientY - panStartRef.current.y;

    area.scrollLeft = panStartRef.current.scrollLeft - dx;
    area.scrollTop = panStartRef.current.scrollTop - dy;
  }

  function stopPan() {
    setIsPanning(false);
  }

  function clearCanvas() {
    paintBaseCanvas(() => {
      pushHistorySnapshot(true);
      setMessage("Đã Clear Canvas. Có thể Undo để quay lại.");
    });
  }

  function getImageData() {
    const canvas = canvasRef.current;

    if (!canvas) {
      return "";
    }

    try {
      return canvas.toDataURL("image/png");
    } catch {
      setMessage("Không thể export canvas. Ảnh nguồn có thể bị chặn CORS.");
      return "";
    }
  }

  function exportPng() {
    const imageData = getImageData();

    if (!imageData) {
      return;
    }

    const safeTitle = pageTitle
      .trim()
      .replace(/[^a-zA-Z0-9-_]+/g, "_")
      .replace(/_+/g, "_");

    const link = document.createElement("a");
    link.href = imageData;
    link.download = `${safeTitle || "mangaflow-drawing"}.png`;
    link.click();

    setMessage("Đã export PNG.");
  }

  function useThisDrawing() {
    const imageData = getImageData();

    if (!imageData) {
      return;
    }

    onApplyDrawing?.(imageData);
    setMessage("Đã đưa bản vẽ về preview.");
    onClose();
  }

  async function saveVersion() {
    const imageData = getImageData();

    if (!imageData || !onSaveVersion) {
      setMessage("Không có API lưu version cho workspace này.");
      return;
    }

    setMessage("Đang lưu / submit bản vẽ...");

    try {
      await onSaveVersion(imageData);
      setMessage("Đã lưu / submit bản vẽ thành công.");
      onClose();
    } catch {
      setMessage("Lưu / submit thất bại. Kiểm tra API backend.");
    }
  }

  async function submitToEditor() {
    const imageData = getImageData();

    if (!imageData) {
      return;
    }

    if (!onSaveVersion) {
      setMessage("Submit to Editor sẽ nối API ở bước sau.");
      return;
    }

    try {
      setMessage("Đang submit bản vẽ...");
      await onSaveVersion(imageData);
      setMessage("Đã submit bản vẽ.");
      onClose();
    } catch {
      setMessage("Submit thất bại. Kiểm tra API backend.");
    }
  }

  function getTargetRegionStyle() {
    if (!targetRegion) {
      return undefined;
    }

    const x = Number(targetRegion.xCoordinate);
    const y = Number(targetRegion.yCoordinate);
    const width = Number(targetRegion.width);
    const height = Number(targetRegion.height);

    if (
      Number.isNaN(x) ||
      Number.isNaN(y) ||
      Number.isNaN(width) ||
      Number.isNaN(height)
    ) {
      return undefined;
    }

    return {
      left: `${(x / CANVAS_WIDTH) * 100}%`,
      top: `${(y / CANVAS_HEIGHT) * 100}%`,
      width: `${(width / CANVAS_WIDTH) * 100}%`,
      height: `${(height / CANVAS_HEIGHT) * 100}%`,
    };
  }

  function selectBrushPreset(nextPreset: BrushPreset) {
    const preset = brushPresets.find((item) => item.id === nextPreset);

    setTool("brush");
    setBrushPreset(nextPreset);

    if (preset) {
      setBrushSize(preset.defaultSize);
    }
  }

  function applyBrushStyle(
    context: CanvasRenderingContext2D,
    event?: PointerEvent | ReactPointerEvent<HTMLCanvasElement>,
  ) {
    resetContext(context);

    context.globalCompositeOperation =
      tool === "eraser" ? "destination-out" : "source-over";

    context.strokeStyle = brushColor;
    context.fillStyle = brushColor;

    if (tool === "eraser") {
      context.lineWidth = Math.max(4, brushSize * 1.8);
      return;
    }

    const pressure =
      event && "pressure" in event && event.pressure > 0
        ? event.pressure
        : 0.65;

    if (brushPreset === "pencil") {
      context.lineWidth = Math.max(1, brushSize * 0.55);
      context.globalAlpha = 0.62;
      return;
    }

    if (brushPreset === "ink") {
      context.lineWidth = brushSize;
      context.globalAlpha = 1;
      return;
    }

    if (brushPreset === "gpen") {
      context.lineWidth = brushSize * (0.7 + pressure * 0.8);
      context.globalAlpha = 1;
      return;
    }

    if (brushPreset === "brushpen") {
      context.lineWidth = brushSize * (0.85 + pressure * 0.7);
      context.globalAlpha = 0.88;
      context.shadowBlur = 0.6;
      context.shadowColor = brushColor;
      return;
    }

    if (brushPreset === "marker") {
      context.lineWidth = brushSize * 1.4;
      context.globalAlpha = 0.38;
      return;
    }

    if (brushPreset === "airbrush") {
      context.lineWidth = brushSize;
      context.globalAlpha = 0.14;
      context.shadowBlur = brushSize * 0.55;
      context.shadowColor = brushColor;
    }
  }

  function drawAirbrush(
    context: CanvasRenderingContext2D,
    x: number,
    y: number,
  ) {
    const dots = Math.max(10, Math.floor(brushSize * 1.3));
    const radius = brushSize * 0.9;

    context.save();
    applyBrushStyle(context);

    for (let index = 0; index < dots; index += 1) {
      const angle = Math.random() * Math.PI * 2;
      const distance = Math.random() * radius;
      const dotX = x + Math.cos(angle) * distance;
      const dotY = y + Math.sin(angle) * distance;

      context.beginPath();
      context.arc(dotX, dotY, Math.max(0.8, brushSize * 0.08), 0, Math.PI * 2);
      context.fill();
    }

    context.restore();
  }

  const currentBrushPreset = brushPresets.find((preset) => {
    return preset.id === brushPreset;
  });

  function zoomIn() {
    setZoom((current) => {
      return Math.min(2.5, Number((current + 0.1).toFixed(2)));
    });
  }

  function zoomOut() {
    setZoom((current) => {
      return Math.max(0.5, Number((current - 0.1).toFixed(2)));
    });
  }

  function resetZoom() {
    setZoom(1);
  }

  function handleSelectCanvas(event: ReactPointerEvent<HTMLCanvasElement>) {
    if (tool !== "select") {
      return;
    }

    const { x, y } = getCanvasPoint(event);

    if (!targetRegion) {
      setSelectedRegionText("No assigned region");
      return;
    }

    const regionX = Number(targetRegion.xCoordinate);
    const regionY = Number(targetRegion.yCoordinate);
    const regionWidth = Number(targetRegion.width);
    const regionHeight = Number(targetRegion.height);

    const isInsideRegion =
      x >= regionX &&
      x <= regionX + regionWidth &&
      y >= regionY &&
      y <= regionY + regionHeight;

    if (isInsideRegion) {
      setSelectedRegionText(
        `Selected #${targetRegion.id} · ${targetRegion.type}`,
      );
      setMessage("Đã chọn assigned region.");
      return;
    }

    setSelectedRegionText("No region selected");
    setMessage("Không chọn trúng region nào.");
  }

  function handleCanvasWheel(event: React.WheelEvent<HTMLDivElement>) {
    if (!event.ctrlKey && !event.metaKey) {
      return;
    }

    event.preventDefault();

    if (event.deltaY < 0) {
      zoomIn();
      return;
    }

    zoomOut();
  }

  return (
    <div className="drawing-backdrop">
      <section className="drawing-shell">
        <header className="drawing-header">
          <div className="drawing-title-group">
            <div className="section-chip">Manga drawing workspace</div>
            <h2>{pageTitle}</h2>
            <p>
              Draw, erase, select and save page versions before sending work to
              editor.
            </p>
          </div>

          <div className="drawing-header-actions">
            <button
              className="header-ghost-button"
              type="button"
              onClick={zoomOut}
            >
              −
            </button>

            <button
              className="header-ghost-button"
              type="button"
              onClick={resetZoom}
            >
              {Math.round(zoom * 100)}%
            </button>

            <button
              className="header-ghost-button"
              type="button"
              onClick={zoomIn}
            >
              +
            </button>
            <button
              className="header-ghost-button"
              type="button"
              onClick={undo}
              disabled={historyState.undo <= 1}
            >
              Undo
            </button>

            <button
              className="header-ghost-button"
              type="button"
              onClick={redo}
              disabled={historyState.redo === 0}
            >
              Redo
            </button>

            <button
              className="drawing-close-button"
              type="button"
              onClick={onClose}
            >
              Close
            </button>
          </div>
        </header>

        <div className="drawing-body">
          <aside className="drawing-toolbar">
            <div className="toolbar-title">Tools</div>

            <div className="drawing-tool-group compact">
              {(["brush", "eraser", "select", "pan"] as Tool[]).map((item) => (
                <button
                  key={item}
                  type="button"
                  className={
                    tool === item
                      ? "drawing-tool-btn active"
                      : "drawing-tool-btn"
                  }
                  onClick={() => setTool(item)}
                  title={getToolLabel(item)}
                  aria-label={getToolLabel(item)}
                >
                  <span className="drawing-tool-icon">{getToolIcon(item)}</span>
                </button>
              ))}
            </div>

            <div className="brush-library compact">
              <div className="drawing-divider" />

              <div className="brush-preset-grid compact">
                {brushPresets.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    className={
                      tool === "brush" && brushPreset === preset.id
                        ? "brush-preset-card active"
                        : "brush-preset-card"
                    }
                    onClick={() => selectBrushPreset(preset.id)}
                    title={`${preset.label} - ${preset.description}`}
                    aria-label={`${preset.label} - ${preset.description}`}
                  >
                    <span className="brush-preset-icon">{preset.icon}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="toolbar-divider" />

            <label>Color swatches</label>
            <div className="color-swatches">
              {swatches.map((color) => (
                <button
                  key={color}
                  className={
                    brushColor === color
                      ? "color-swatch active"
                      : "color-swatch"
                  }
                  style={{ backgroundColor: color }}
                  type="button"
                  onClick={() => {
                    setTool("brush");
                    setBrushColor(color);
                  }}
                  aria-label={`Choose ${color}`}
                />
              ))}
            </div>

            <label>Custom color</label>
            <input
              type="color"
              value={brushColor}
              onChange={(event) => {
                setTool("brush");
                setBrushColor(event.target.value);
              }}
            />

            <label>Brush size: {brushSize}px</label>
            <input
              type="range"
              min={2}
              max={40}
              value={brushSize}
              onChange={(event) => setBrushSize(Number(event.target.value))}
            />

            <div className="toolbar-divider" />

            <button className="tool-action" type="button" onClick={clearCanvas}>
              Clear Canvas
            </button>

            <button className="tool-action" type="button" onClick={exportPng}>
              Export PNG
            </button>
          </aside>

          <main
            ref={canvasAreaRef}
            className={
              tool === "pan"
                ? "drawing-canvas-area pan-mode"
                : "drawing-canvas-area"
            }
            onPointerDown={startPan}
            onPointerMove={movePan}
            onPointerUp={stopPan}
            onPointerLeave={stopPan}
            onPointerCancel={stopPan}
            onWheel={handleCanvasWheel}
          >
            <div
              className="drawing-canvas-frame"
              style={{
                width: `${760 * zoom}px`,
                maxWidth: "none",
              }}
            >
              <div className="drawing-canvas-stage">
                <canvas
                  ref={canvasRef}
                  className={
                    tool === "pan"
                      ? "drawing-canvas pan-cursor"
                      : "drawing-canvas"
                  }
                  onPointerDown={startDrawing}
                  onPointerMove={draw}
                  onPointerUp={stopDrawing}
                  onPointerLeave={stopDrawing}
                  onPointerCancel={stopDrawing}
                />

                {targetRegion && (
                  <div
                    className="assigned-region-overlay"
                    style={getTargetRegionStyle()}
                  >
                    <span>
                      Assigned · {targetRegion.type} #{targetRegion.id}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </main>

          <aside className="drawing-inspector">
            <div className="inspector-header">
              <span>Inspector</span>
              <strong>{tool.toUpperCase()}</strong>
            </div>

            <div className="inspector-card">
              <span>Current tool</span>
              <strong>{getToolLabel(tool)}</strong>
            </div>

            <div className="inspector-card">
              <span>Brush preset</span>
              <strong>
                {currentBrushPreset
                  ? `${currentBrushPreset.label} · ${currentBrushPreset.description}`
                  : brushPreset}
              </strong>
            </div>

            <div className="inspector-card">
              <span>Brush color</span>
              <strong>{brushColor}</strong>
            </div>

            <div className="inspector-card">
              <span>Brush size</span>
              <strong>{brushSize}px</strong>
            </div>

            <div className="inspector-card">
              <span>History</span>
              <strong>
                Undo {Math.max(0, historyState.undo - 1)} · Redo{" "}
                {historyState.redo}
              </strong>
            </div>

            <div className="inspector-card">
              <span>Zoom</span>
              <strong>{Math.round(zoom * 100)}%</strong>
            </div>

            <div className="inspector-card">
              <span>Selection</span>
              <strong>{selectedRegionText}</strong>
            </div>

            <div className="inspector-card">
              <span>Assigned region</span>
              <strong>
                {targetRegion
                  ? `#${targetRegion.id} · ${targetRegion.type} · x=${targetRegion.xCoordinate}, y=${targetRegion.yCoordinate}, w=${targetRegion.width}, h=${targetRegion.height}`
                  : "No assigned region"}
              </strong>
            </div>

            <div className="inspector-card">
              <span>Canvas</span>
              <strong>
                {CANVAS_WIDTH} × {CANVAS_HEIGHT}
              </strong>
            </div>

            <div className="inspector-actions">
              <button type="button" onClick={useThisDrawing}>
                Use This Drawing
              </button>

              <button type="button" className="save" onClick={saveVersion}>
                Save / Submit
              </button>

              <button type="button" className="submit" onClick={submitToEditor}>
                Submit to Editor
              </button>
            </div>

            {message && <p className="drawing-message">{message}</p>}
          </aside>
        </div>
      </section>
    </div>
  );
}
