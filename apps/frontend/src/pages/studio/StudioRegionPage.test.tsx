import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import StudioRegionPage from "./StudioRegionPage";

const mocks = vi.hoisted(() => ({
  navigate: vi.fn(),
  apiPost: vi.fn(),
}));

vi.mock("react-router-dom", () => ({
  useNavigate: () => mocks.navigate,
  useParams: () => ({ taskId: "42" }),
  useLocation: () => ({
    state: {
      task: {
        id: 42,
        pageId: 7,
        regionId: 9,
        regionX: 10,
        regionY: 20,
        regionWidth: 300,
        regionHeight: 200,
        regionType: "LINE_ART",
      },
    },
  }),
}));

vi.mock("../../lib/api", () => ({
  api: {
    get: vi.fn(),
    post: mocks.apiPost,
  },
}));

vi.mock("../../lib/auth", () => ({
  useAuth: () => ({ user: { role: "ASSISTANT" } }),
}));

vi.mock("../../lib/confirm", () => ({
  useConfirm: () => ({ confirm: vi.fn().mockResolvedValue(false) }),
}));

vi.mock("../../components/ui/Toast", () => ({
  useToast: () => ({
    loading: vi.fn(() => "toast-1"),
    update: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    success: vi.fn(),
  }),
}));

vi.mock("@manga/canvas-wasm", () => ({
  InkforgeWasm: {
    load: vi.fn().mockResolvedValue({}),
  },
}));

vi.mock("../../lib/studio/engine", () => ({
  StudioEngine: class {
    doc = { activeLayerId: "layer-1" };
    onChange = vi.fn(() => vi.fn());
    isDirty = vi.fn(() => false);
    markSaved = vi.fn();
    setBuffer = vi.fn();
  },
}));

vi.mock("../../lib/studio/document", () => ({
  createDocument: vi.fn(() => ({
    width: 1000,
    height: 1414,
    activeLayerId: "layer-1",
  })),
}));

vi.mock("../../lib/studio/ai/heuristic", () => ({
  HeuristicAI: class {},
}));

vi.mock("../../lib/studio/ai/onnx/available", () => ({
  modelExists: vi.fn().mockResolvedValue(false),
}));

vi.mock("../../lib/studio/ai/onnx/models", () => ({
  MODELS: { panels: "panels.onnx" },
}));

vi.mock("../../lib/studio/io", () => ({
  exportPNG: vi.fn().mockResolvedValue(new Blob(["png"], { type: "image/png" })),
  serializeDoc: vi.fn().mockResolvedValue({
    manifest: { layerImages: {} },
    blobs: {},
  }),
  deserializeDoc: vi.fn(),
  loadImageFromBlob: vi.fn(),
  imageToBuffer: vi.fn(),
}));

vi.mock("../../lib/studio/persist", () => ({
  draftKey: vi.fn(() => "task:42"),
  saveDraft: vi.fn(),
  loadDraft: vi.fn(),
  getDraftMeta: vi.fn().mockResolvedValue(null),
  clearDraft: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("../../components/studio/Studio", () => ({
  Studio: ({ onSave }: { onSave: () => void | Promise<void> }) => (
    <button type="button" onClick={() => void onSave()}>
      Lưu Studio
    </button>
  ),
}));

describe("StudioRegionPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.apiPost.mockImplementation((url: string) => {
      if (url === "/uploads") return Promise.resolve({ data: { url: "/uploads/task-42.png" } });
      return Promise.resolve({ data: {} });
    });
  });

  it("saves the Studio version without submitting the task", async () => {
    render(<StudioRegionPage />);

    fireEvent.click(await screen.findByRole("button", { name: "Lưu Studio" }));

    await waitFor(() => {
      expect(mocks.apiPost).toHaveBeenCalledWith(
        "/studio/page-versions",
        expect.objectContaining({ pageId: 7, imageUrl: "/uploads/task-42.png" }),
      );
    });
    expect(mocks.apiPost).toHaveBeenCalledWith(
      "/studio/docs",
      expect.objectContaining({ pageId: 7 }),
    );
    expect(mocks.apiPost).not.toHaveBeenCalledWith(
      "/submissions",
      expect.objectContaining({ taskId: 42 }),
    );
    expect(mocks.navigate).not.toHaveBeenCalledWith("/my-tasks");
  });
});
