import { useEffect, useRef, useState } from 'react';
import './DrawingWorkspace.css';

type Tool = 'brush' | 'eraser';

type DrawingWorkspaceProps = {
  pageTitle: string;
  imageUrl?: string;
  onClose: () => void;
};

export function DrawingWorkspace({
  pageTitle,
  imageUrl,
  onClose,
}: DrawingWorkspaceProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);

  const [tool, setTool] = useState<Tool>('brush');
  const [brushColor, setBrushColor] = useState('#111111');
  const [brushSize, setBrushSize] = useState(6);
  const [isDrawing, setIsDrawing] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    prepareCanvas();
  }, [imageUrl]);

  function prepareCanvas() {
    const canvas = canvasRef.current;

    if (!canvas) {
      return;
    }

    canvas.width = 900;
    canvas.height = 1200;

    const context = canvas.getContext('2d');

    if (!context) {
      return;
    }

    context.fillStyle = '#fff8e7';
    context.fillRect(0, 0, canvas.width, canvas.height);

    if (!imageUrl) {
      drawEmptyPage(context);
      return;
    }

    const image = new Image();
    image.crossOrigin = 'anonymous';
    image.src = imageUrl;

    image.onload = () => {
      imageRef.current = image;

      context.fillStyle = '#fff8e7';
      context.fillRect(0, 0, canvas.width, canvas.height);

      context.drawImage(image, 0, 0, canvas.width, canvas.height);
    };

    image.onerror = () => {
      drawEmptyPage(context);
      setMessage('Không tải được ảnh page, đang dùng canvas trắng.');
    };
  }

  function drawEmptyPage(context: CanvasRenderingContext2D) {
    context.fillStyle = '#fff8e7';
    context.fillRect(0, 0, 900, 1200);

    context.fillStyle = '#9ca3af';
    context.font = 'bold 42px Arial';
    context.textAlign = 'center';
    context.fillText('Manga Page Canvas', 450, 560);

    context.font = '20px Arial';
    context.fillText('Draw directly on this page', 450, 600);
  }

  function getCanvasPoint(event: React.PointerEvent<HTMLCanvasElement>) {
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

  function startDrawing(event: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;
    const context = canvas?.getContext('2d');

    if (!canvas || !context) {
      return;
    }

    const point = getCanvasPoint(event);

    context.beginPath();
    context.moveTo(point.x, point.y);

    setIsDrawing(true);
  }

  function draw(event: React.PointerEvent<HTMLCanvasElement>) {
    if (!isDrawing) {
      return;
    }

    const canvas = canvasRef.current;
    const context = canvas?.getContext('2d');

    if (!canvas || !context) {
      return;
    }

    const point = getCanvasPoint(event);

    context.lineWidth = brushSize;
    context.lineCap = 'round';
    context.lineJoin = 'round';

    if (tool === 'eraser') {
      context.globalCompositeOperation = 'destination-out';
    } else {
      context.globalCompositeOperation = 'source-over';
      context.strokeStyle = brushColor;
    }

    context.lineTo(point.x, point.y);
    context.stroke();
  }

  function stopDrawing() {
    setIsDrawing(false);

    const canvas = canvasRef.current;
    const context = canvas?.getContext('2d');

    if (context) {
      context.closePath();
      context.globalCompositeOperation = 'source-over';
    }
  }

  function clearCanvas() {
    prepareCanvas();
    setMessage('Đã reset canvas.');
  }

  function exportPng() {
    const canvas = canvasRef.current;

    if (!canvas) {
      return;
    }

    const imageData = canvas.toDataURL('image/png');

    const link = document.createElement('a');
    link.href = imageData;
    link.download = `${pageTitle.replaceAll(' ', '_')}.png`;
    link.click();

    setMessage('Đã export PNG tạm.');
  }

  return (
    <div className="drawing-backdrop">
      <section className="drawing-shell">
        <header className="drawing-header">
          <div>
            <div className="section-chip">Drawing workspace</div>
            <h2>{pageTitle}</h2>
            <p>Vẽ trực tiếp lên page bằng Brush hoặc Eraser.</p>
          </div>

          <button
            className="drawing-close-button"
            type="button"
            onClick={onClose}
          >
            Close
          </button>
        </header>

        <div className="drawing-body">
          <aside className="drawing-toolbar">
            <button
              className={tool === 'brush' ? 'tool-button active' : 'tool-button'}
              type="button"
              onClick={() => setTool('brush')}
            >
              Brush
            </button>

            <button
              className={tool === 'eraser' ? 'tool-button active' : 'tool-button'}
              type="button"
              onClick={() => setTool('eraser')}
            >
              Eraser
            </button>

            <label>Color</label>
            <input
              type="color"
              value={brushColor}
              onChange={(event) => setBrushColor(event.target.value)}
            />

            <label>Size: {brushSize}px</label>
            <input
              type="range"
              min={2}
              max={40}
              value={brushSize}
              onChange={(event) => setBrushSize(Number(event.target.value))}
            />

            <button className="tool-action" type="button" onClick={clearCanvas}>
              Clear
            </button>

            <button className="tool-action gradient" type="button" onClick={exportPng}>
              Export PNG
            </button>
          </aside>

          <main className="drawing-canvas-area">
            <canvas
              ref={canvasRef}
              className="drawing-canvas"
              onPointerDown={startDrawing}
              onPointerMove={draw}
              onPointerUp={stopDrawing}
              onPointerLeave={stopDrawing}
            />
          </main>

          <aside className="drawing-inspector">
            <h3>Inspector</h3>

            <div className="inspector-card">
              <span>Current tool</span>
              <strong>{tool}</strong>
            </div>

            <div className="inspector-card">
              <span>Brush size</span>
              <strong>{brushSize}px</strong>
            </div>

            <div className="inspector-card">
              <span>Canvas</span>
              <strong>900 × 1200</strong>
            </div>

            {message && <p className="drawing-message">{message}</p>}
          </aside>
        </div>
      </section>
    </div>
  );
}