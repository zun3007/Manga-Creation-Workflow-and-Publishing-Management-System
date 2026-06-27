import { useEffect, useRef, useState } from "react";
import { AppLayout } from "../layouts/AppLayout";
import { DrawingWorkspace } from "../features/pages/DrawingWorkspace";
import {
  createPage,
  createPageVersion,
  createRegion,
  getPagesByChapter,
  getRegionsByPage,
} from "../features/pages/pages.api";
import { createTask, getAssistantOptions } from "../features/tasks/tasks.api";
import type { MangaPage, Region } from "../types/page";
import type { AssistantOption } from "../types/task";
import "./PageWorkspacePage.css";

const CANVAS_WIDTH = 900;
const CANVAS_HEIGHT = 1200;

const regionTypes = [
  "PANEL",
  "CHARACTER",
  "BACKGROUND",
  "SPEECH_BUBBLE",
  "EFFECT",
  "LINE_ART",
  "COLORING",
  "OTHER",
];

type DraftRegion = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export function PageWorkspacePage() {
  const stageRef = useRef<HTMLDivElement | null>(null);

  const regionStartRef = useRef({ x: 0, y: 0 });
  const isDraggingRegionRef = useRef(false);

  const [chapterId, setChapterId] = useState(1);
  const [pages, setPages] = useState<MangaPage[]>([]);
  const [selectedPage, setSelectedPage] = useState<MangaPage | null>(null);
  const [regions, setRegions] = useState<Region[]>([]);
  const [isWorkspaceOpen, setIsWorkspaceOpen] = useState(false);

  const [pageNumber, setPageNumber] = useState(1);
  const [imageUrl, setImageUrl] = useState("/demo-pages/manga-page-blank.svg");
  const [uploadNote, setUploadNote] = useState("");

  const [regionType, setRegionType] = useState("BACKGROUND");
  const [regionNote, setRegionNote] = useState("Background area for assistant");
  const [isMarkingRegion, setIsMarkingRegion] = useState(false);
  const [, setIsDraggingRegion] = useState(false);
  const [, setRegionStart] = useState({ x: 0, y: 0 });
  const [draftRegion, setDraftRegion] = useState<DraftRegion | null>(null);

  const [editedImageByPage, setEditedImageByPage] = useState<
    Record<number, string>
  >({});

  const [assistants, setAssistants] = useState<AssistantOption[]>([]);
  const [selectedRegion, setSelectedRegion] = useState<Region | null>(null);
  const [selectedAssistantId, setSelectedAssistantId] = useState<number>(0);
  const [taskDescription, setTaskDescription] = useState("");
  const [taskInstruction, setTaskInstruction] = useState("");
  const [taskDeadline, setTaskDeadline] = useState("");
  const [taskPayment, setTaskPayment] = useState(120000);

  const [message, setMessage] = useState("");

  async function loadPages() {
    setMessage("Đang tải page...");

    try {
      const data = await getPagesByChapter(chapterId);
      setPages(data);

      if (data.length > 0) {
        setSelectedPage(data[0]);
        await loadRegions(data[0].id);
      } else {
        setSelectedPage(null);
        setRegions([]);
      }

      setMessage("");
    } catch {
      setMessage(
        "Không tải được page. Kiểm tra Chapter ID hoặc backend /pages/chapter/:chapterId.",
      );
    }
  }

  async function loadRegions(pageId: number) {
    try {
      const data = await getRegionsByPage(pageId);
      setRegions(data);
    } catch {
      setMessage("Không tải được region của page.");
    }
  }

  async function loadAssistants() {
    try {
      const data = await getAssistantOptions();

      setAssistants(data);

      const preferredAssistantId = Number(
        localStorage.getItem("preferredAssistantId") || 0,
      );

      const preferredAssistant = data.find((assistant) => {
        return assistant.id === preferredAssistantId;
      });

      if (preferredAssistant) {
        setSelectedAssistantId(preferredAssistant.id);
        setMessage(
          `Đã chọn sẵn assistant: ${preferredAssistant.displayName}. Hãy chọn region để giao task.`,
        );
        return;
      }

      if (data.length > 0) {
        setSelectedAssistantId(data[0].id);
      }
    } catch {
      setMessage("Không tải được danh sách Assistant.");
    }
  }

  useEffect(() => {
    loadPages();
    loadAssistants();
  }, []);

  async function handleSelectPage(page: MangaPage) {
    setSelectedPage(page);
    setSelectedRegion(null);
    setDraftRegion(null);
    setIsMarkingRegion(false);
    await loadRegions(page.id);
  }

  async function handleCreatePage(event: React.FormEvent) {
    event.preventDefault();
    setMessage("Đang tạo page...");

    try {
      await createPage({
        chapterId,
        pageNumber,
        imageUrl,
        uploadNote: uploadNote || undefined,
      });

      setPageNumber((current) => current + 1);
      setUploadNote("");
      setMessage("Tạo page thành công.");
      await loadPages();
    } catch {
      setMessage("Tạo page thất bại. Kiểm tra Chapter ID có tồn tại không.");
    }
  }

  function getSelectedImageUrl() {
    if (!selectedPage) {
      return imageUrl;
    }

    return (
      editedImageByPage[selectedPage.id] ??
      selectedPage.versions?.[0]?.imageUrl ??
      imageUrl
    );
  }

  function getStagePoint(event: React.PointerEvent<HTMLDivElement>) {
    const stage = stageRef.current;

    if (!stage) {
      return { x: 0, y: 0 };
    }

    const rect = stage.getBoundingClientRect();

    const x = ((event.clientX - rect.left) / rect.width) * CANVAS_WIDTH;
    const y = ((event.clientY - rect.top) / rect.height) * CANVAS_HEIGHT;

    return {
      x: Math.max(0, Math.min(CANVAS_WIDTH, x)),
      y: Math.max(0, Math.min(CANVAS_HEIGHT, y)),
    };
  }

  function startMarkRegion(event: React.PointerEvent<HTMLDivElement>) {
    if (!isMarkingRegion || !selectedPage) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    event.currentTarget.setPointerCapture(event.pointerId);

    const point = getStagePoint(event);

    regionStartRef.current = point;
    isDraggingRegionRef.current = true;

    setRegionStart(point);
    setDraftRegion({
      x: point.x,
      y: point.y,
      width: 1,
      height: 1,
    });

    setIsDraggingRegion(true);
  }

  function moveMarkRegion(event: React.PointerEvent<HTMLDivElement>) {
    if (!isDraggingRegionRef.current || !isMarkingRegion || !selectedPage) {
      return;
    }

    event.preventDefault();

    const point = getStagePoint(event);
    const start = regionStartRef.current;

    const x = Math.min(start.x, point.x);
    const y = Math.min(start.y, point.y);
    const width = Math.max(1, Math.abs(point.x - start.x));
    const height = Math.max(1, Math.abs(point.y - start.y));

    setDraftRegion({
      x,
      y,
      width,
      height,
    });
  }

  function stopMarkRegion(event?: React.PointerEvent<HTMLDivElement>) {
    if (event?.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    isDraggingRegionRef.current = false;
    setIsDraggingRegion(false);
  }

  async function handleSaveDraftRegion() {
    if (!selectedPage || !draftRegion) {
      setMessage("Vui lòng kéo chuột trên page để tạo vùng trước.");
      return;
    }

    if (draftRegion.width < 20 || draftRegion.height < 20) {
      setMessage("Region quá nhỏ. Hãy kéo vùng lớn hơn.");
      return;
    }

    setMessage("Đang lưu region...");

    try {
      await createRegion({
        pageId: selectedPage.id,
        regionType,
        x: Math.round(draftRegion.x),
        y: Math.round(draftRegion.y),
        width: Math.round(draftRegion.width),
        height: Math.round(draftRegion.height),
        note: regionNote || undefined,
      });

      setDraftRegion(null);
      setIsMarkingRegion(false);
      setMessage("Tạo region thành công.");
      await loadRegions(selectedPage.id);
    } catch {
      setMessage("Tạo region thất bại. Kiểm tra page đã có version chưa.");
    }
  }

  function handleCancelDraftRegion() {
    setDraftRegion(null);
    setIsMarkingRegion(false);
    setIsDraggingRegion(false);
  }

  function handleOpenAssignTask(region: Region) {
    setSelectedRegion(region);
    setTaskDescription(`Work on ${region.type} region`);
    setTaskInstruction(
      `Please complete the ${region.type.toLowerCase()} area carefully and keep the manga style consistent.`,
    );
    setTaskDeadline("");
    setTaskPayment(120000);
  }

  async function handleCreateTask(event: React.FormEvent) {
    event.preventDefault();

    if (!selectedRegion) {
      setMessage("Vui lòng chọn region trước khi tạo task.");
      return;
    }

    if (!selectedAssistantId) {
      setMessage("Vui lòng chọn Assistant.");
      return;
    }

    if (taskDescription.trim().length < 3) {
      setMessage("Description phải có ít nhất 3 ký tự.");
      return;
    }

    setMessage("Đang tạo task cho Assistant...");

    try {
      await createTask({
        regionId: selectedRegion.id,
        assigneeUserId: selectedAssistantId,
        description: taskDescription,
        instruction: taskInstruction || undefined,
        deadline: taskDeadline || undefined,
        paymentAmount: taskPayment,
      });

      setMessage("Tạo task thành công.");
      setSelectedRegion(null);
      localStorage.removeItem("preferredAssistantId");
      localStorage.removeItem("preferredAssistantName");
    } catch {
      setMessage(
        "Tạo task thất bại. Kiểm tra backend /tasks hoặc dữ liệu region.",
      );
    }
  }

  function regionStyle(region: Region | DraftRegion) {
    const x =
      "xCoordinate" in region ? Number(region.xCoordinate) : Number(region.x);
    const y =
      "yCoordinate" in region ? Number(region.yCoordinate) : Number(region.y);
    const width = Number(region.width);
    const height = Number(region.height);

    return {
      left: `${(x / CANVAS_WIDTH) * 100}%`,
      top: `${(y / CANVAS_HEIGHT) * 100}%`,
      width: `${(width / CANVAS_WIDTH) * 100}%`,
      height: `${(height / CANVAS_HEIGHT) * 100}%`,
    };
  }

  return (
    <AppLayout
      title="Page Workspace"
      subtitle="Draw directly on manga pages, create page versions and mark regions for assistant tasks."
    >
      <section className="page-workspace-v5">
        <aside className="page-left-panel">
          <div className="section-chip">Chapter</div>

          <h2>Pages</h2>

          <label>Chapter ID</label>
          <div className="chapter-load-row">
            <input
              type="number"
              min={1}
              value={chapterId}
              onChange={(event) => setChapterId(Number(event.target.value))}
            />

            <button type="button" onClick={loadPages}>
              Load
            </button>
          </div>

          <form className="quick-page-form" onSubmit={handleCreatePage}>
            <label>New page number</label>
            <input
              type="number"
              min={1}
              value={pageNumber}
              onChange={(event) => setPageNumber(Number(event.target.value))}
            />

            <label>Image URL</label>
            <input
              value={imageUrl}
              onChange={(event) => setImageUrl(event.target.value)}
              placeholder="https://..."
            />

            <label>Upload note</label>
            <input
              value={uploadNote}
              onChange={(event) => setUploadNote(event.target.value)}
              placeholder="First sketch version"
            />

            <button type="submit">Create Page</button>
          </form>

          <div className="page-list-v5">
            {pages.length === 0 && (
              <p className="empty-text">Chưa có page nào trong chapter này.</p>
            )}

            {pages.map((page) => (
              <button
                key={page.id}
                type="button"
                className={
                  selectedPage?.id === page.id
                    ? "page-list-item-v5 active"
                    : "page-list-item-v5"
                }
                onClick={() => handleSelectPage(page)}
              >
                <span>Page {page.pageNumber}</span>
                <small>{page.status}</small>
              </button>
            ))}
          </div>
        </aside>

        <main className="page-canvas-panel">
          <div className="canvas-toolbar-v5">
            <div>
              <span className="v5-kicker">Page canvas</span>
              <h2>
                {selectedPage
                  ? `Page ${selectedPage.pageNumber}`
                  : "No page selected"}
              </h2>
            </div>

            <div className="canvas-toolbar-actions">
              <button
                type="button"
                disabled={!selectedPage}
                onClick={() => setIsWorkspaceOpen(true)}
              >
                Open Drawing
              </button>

              <button
                type="button"
                disabled={!selectedPage}
                className={isMarkingRegion ? "active" : ""}
                onClick={() => {
                  setIsMarkingRegion((current) => !current);
                  setDraftRegion(null);
                }}
              >
                Mark Region
              </button>
            </div>
          </div>

          {message && <p className="workspace-message">{message}</p>}

          <div className="canvas-stage-wrap">
            {!selectedPage && (
              <div className="canvas-empty-state">
                <strong>Select a page</strong>
                <p>Choose a page from the left panel to start working.</p>
              </div>
            )}

            {selectedPage && (
              <div
                ref={stageRef}
                className={
                  isMarkingRegion
                    ? "page-region-stage marking"
                    : "page-region-stage"
                }
                onPointerDown={startMarkRegion}
                onPointerMove={moveMarkRegion}
                onPointerUp={(event) => stopMarkRegion(event)}
                onPointerCancel={(event) => stopMarkRegion(event)}
              >
                <img src={getSelectedImageUrl()} alt="Manga page" />

                {regions.map((region, index) => (
                  <button
                    key={region.id}
                    type="button"
                    className={
                      selectedRegion?.id === region.id
                        ? "region-overlay active"
                        : "region-overlay"
                    }
                    style={regionStyle(region)}
                    onClick={(event) => {
                      event.stopPropagation();
                      handleOpenAssignTask(region);
                    }}
                  >
                    R-{String(index + 1).padStart(2, "0")}
                  </button>
                ))}

                {draftRegion && (
                  <div
                    className="region-overlay draft"
                    style={regionStyle(draftRegion)}
                  >
                    New
                  </div>
                )}
              </div>
            )}
          </div>
        </main>

        <aside className="page-right-panel">
          <section className="region-inspector-section">
            <div className="section-chip">Mark settings</div>

            <div className="region-inspector-heading">
              <div>
                <h2>Region Marker</h2>
                <p>Draw a region directly on the selected page.</p>
              </div>

              <span
                className={isMarkingRegion ? "mark-mode active" : "mark-mode"}
              >
                {isMarkingRegion ? "Marking" : "Idle"}
              </span>
            </div>

            <div className="region-create-box">
              <label>Region type</label>
              <select
                value={regionType}
                onChange={(event) => setRegionType(event.target.value)}
              >
                {regionTypes.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>

              <label>Note</label>
              <textarea
                value={regionNote}
                onChange={(event) => setRegionNote(event.target.value)}
                placeholder="Describe what this region is for..."
              />

              <div className="region-guide-card">
                <strong>How to mark</strong>
                <p>
                  Bấm <b>Mark Region</b> ở phía trên canvas, sau đó kéo chuột
                  trực tiếp trên page để tạo vùng làm việc.
                </p>
              </div>

              {draftRegion ? (
                <div className="draft-preview-box">
                  <span>Draft region</span>

                  <div className="draft-metrics">
                    <strong>x={Math.round(draftRegion.x)}</strong>
                    <strong>y={Math.round(draftRegion.y)}</strong>
                    <strong>w={Math.round(draftRegion.width)}</strong>
                    <strong>h={Math.round(draftRegion.height)}</strong>
                  </div>

                  <div className="draft-region-actions">
                    <button type="button" onClick={handleCancelDraftRegion}>
                      Cancel
                    </button>

                    <button type="button" onClick={handleSaveDraftRegion}>
                      Save Region
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  className={
                    isMarkingRegion
                      ? "mark-start-button active"
                      : "mark-start-button"
                  }
                  type="button"
                  disabled={!selectedPage}
                  onClick={() => {
                    setIsMarkingRegion((current) => !current);
                    setDraftRegion(null);
                  }}
                >
                  {isMarkingRegion ? "Stop Marking" : "Start Marking Region"}
                </button>
              )}
            </div>
          </section>

          <section className="region-inspector-section">
            <div className="section-chip">Region list</div>

            <div className="region-list-header">
              <h2>Marked Regions</h2>
              <span>{regions.length}</span>
            </div>

            <div className="region-list-v5">
              {regions.length === 0 && (
                <p className="empty-text">
                  Chưa có region nào. Hãy bấm Mark Region và kéo vùng trên page.
                </p>
              )}

              {regions.map((region, index) => (
                <article
                  key={region.id}
                  className={
                    selectedRegion?.id === region.id
                      ? "region-item-v5 active"
                      : "region-item-v5"
                  }
                >
                  <button
                    className="region-info-button"
                    type="button"
                    onClick={() => handleOpenAssignTask(region)}
                  >
                    <strong>
                      R-{String(index + 1).padStart(2, "0")} · {region.type}
                    </strong>

                    <span>
                      x={String(region.xCoordinate)} · y=
                      {String(region.yCoordinate)}
                      <br />
                      w={String(region.width)} · h={String(region.height)}
                    </span>
                  </button>

                  <button
                    className="assign-mini-button"
                    type="button"
                    onClick={() => handleOpenAssignTask(region)}
                  >
                    Assign
                  </button>
                </article>
              ))}
            </div>
          </section>

          {selectedRegion && (
            <section className="assign-task-card">
              <div className="section-chip">Task assignment</div>

              <div className="assign-heading">
                <div>
                  <h2>Assign Task</h2>
                  <p>
                    Selected region: <strong>{selectedRegion.type}</strong> · #
                    {selectedRegion.id}
                  </p>
                </div>

                <button type="button" onClick={() => setSelectedRegion(null)}>
                  ×
                </button>
              </div>

              <form onSubmit={handleCreateTask}>
                <label>Assistant</label>
                <select
                  value={selectedAssistantId}
                  onChange={(event) =>
                    setSelectedAssistantId(Number(event.target.value))
                  }
                >
                  {assistants.map((assistant) => (
                    <option key={assistant.id} value={assistant.id}>
                      {assistant.displayName} · {assistant.email}
                    </option>
                  ))}
                </select>

                <label>Description</label>
                <input
                  value={taskDescription}
                  onChange={(event) => setTaskDescription(event.target.value)}
                />

                <label>Instruction</label>
                <textarea
                  value={taskInstruction}
                  onChange={(event) => setTaskInstruction(event.target.value)}
                />

                <div className="assign-task-grid">
                  <div>
                    <label>Deadline</label>
                    <input
                      type="datetime-local"
                      value={taskDeadline}
                      onChange={(event) => setTaskDeadline(event.target.value)}
                    />
                  </div>

                  <div>
                    <label>Payment</label>
                    <input
                      type="number"
                      min={0}
                      value={taskPayment}
                      onChange={(event) =>
                        setTaskPayment(Number(event.target.value))
                      }
                    />
                  </div>
                </div>

                <div className="assign-task-actions">
                  <button type="button" onClick={() => setSelectedRegion(null)}>
                    Cancel
                  </button>

                  <button type="submit">Create Task</button>
                </div>
              </form>
            </section>
          )}
        </aside>
      </section>

      {isWorkspaceOpen && selectedPage && (
        <DrawingWorkspace
          pageTitle={`Page ${selectedPage.pageNumber}`}
          imageUrl={getSelectedImageUrl()}
          onClose={() => setIsWorkspaceOpen(false)}
          onApplyDrawing={(imageData) => {
            setEditedImageByPage((current) => ({
              ...current,
              [selectedPage.id]: imageData,
            }));
          }}
          onSaveVersion={async (imageData) => {
            await createPageVersion(selectedPage.id, {
              imageUrl: imageData,
              uploadNote: "Drawing version from MangaFlow workspace",
            });

            setEditedImageByPage((current) => ({
              ...current,
              [selectedPage.id]: imageData,
            }));

            await loadPages();
          }}
        />
      )}
    </AppLayout>
  );
}
