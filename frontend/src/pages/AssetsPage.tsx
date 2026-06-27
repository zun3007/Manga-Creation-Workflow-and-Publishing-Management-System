import { useEffect, useMemo, useState } from "react";
import { AppLayout } from "../layouts/AppLayout";
import {
  deleteStudioAsset,
  getMyAssets,
  updateStudioAsset,
  uploadStudioAsset,
  type StudioAsset,
} from "../features/assets/assets.api";
import "./AssetsPage.css";

type AssetType = "Character" | "Background" | "Page Reference" | "Manuscript";

const assetTypes: AssetType[] = [
  "Character",
  "Background",
  "Page Reference",
  "Manuscript",
];

const API_BASE_URL = "http://localhost:3000";

export function AssetsPage() {
  const [assets, setAssets] = useState<StudioAsset[]>([]);
  const [assetType, setAssetType] = useState<AssetType>("Character");
  const [search, setSearch] = useState("");
  const [message, setMessage] = useState("Đang tải assets...");
  const [isUploading, setIsUploading] = useState(false);
  const [previewAsset, setPreviewAsset] = useState<StudioAsset | null>(null);
  const [editingAsset, setEditingAsset] = useState<StudioAsset | null>(null);
  const [editName, setEditName] = useState("");
  const [editType, setEditType] = useState<AssetType>("Character");

  async function loadAssets() {
    try {
      const data = await getMyAssets();
      setAssets(data);
      setMessage("");
    } catch {
      setMessage(
        "Không tải được assets. Kiểm tra backend /studio-assets/my hoặc đăng nhập Mangaka.",
      );
    }
  }

  useEffect(() => {
    loadAssets();
  }, []);

  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setPreviewAsset(null);
      }
    }

    window.addEventListener("keydown", handleEscape);

    return () => window.removeEventListener("keydown", handleEscape);
  }, []);

  const filteredAssets = useMemo(() => {
    return assets.filter((asset) =>
      asset.name.toLowerCase().includes(search.toLowerCase()),
    );
  }, [assets, search]);

  function formatFileSize(size: number) {
    if (size < 1024 * 1024) {
      return `${Math.max(1, Math.round(size / 1024))} KB`;
    }

    return `${(size / 1024 / 1024).toFixed(1)} MB`;
  }

  function isImageAsset(asset: StudioAsset) {
    return asset.mimeType?.startsWith("image/");
  }

  function isPdfAsset(asset: StudioAsset) {
    return asset.mimeType === "application/pdf";
  }

  function getAssetUrl(asset: StudioAsset) {
    return `${API_BASE_URL}${asset.fileUrl}`;
  }

  async function handleUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    setIsUploading(true);
    setMessage("Đang upload asset...");

    try {
      await uploadStudioAsset(file, assetType);
      setMessage("Upload asset thành công.");
      await loadAssets();
    } catch {
      setMessage(
        "Upload thất bại. Kiểm tra backend /studio-assets hoặc quyền Mangaka.",
      );
    } finally {
      setIsUploading(false);
      event.target.value = "";
    }
  }

  async function removeAsset(id: number) {
    const confirmRemove = window.confirm("Xoá asset này khỏi thư viện?");

    if (!confirmRemove) {
      return;
    }

    setMessage("Đang xoá asset...");

    try {
      await deleteStudioAsset(id);
      setMessage("Đã xoá asset.");
      setPreviewAsset(null);
      await loadAssets();
    } catch {
      setMessage("Xoá asset thất bại.");
    }
  }

  function openEditAsset(asset: StudioAsset) {
    setEditingAsset(asset);
    setEditName(asset.name);
    setEditType(asset.type as AssetType);
  }

  async function handleUpdateAsset(event: React.FormEvent) {
    event.preventDefault();

    if (!editingAsset) {
      return;
    }

    if (!editName.trim()) {
      setMessage("Tên asset không được để trống.");
      return;
    }

    setMessage("Đang cập nhật asset...");

    try {
      await updateStudioAsset(editingAsset.id, {
        originalName: editName.trim(),
        assetType: editType,
      });

      setMessage("Cập nhật asset thành công.");
      setEditingAsset(null);
      await loadAssets();
    } catch {
      setMessage("Cập nhật asset thất bại.");
    }
  }

  return (
    <AppLayout
      title="Assets"
      subtitle="Manage studio references, manga files and production resources."
    >
      <main className="assets-page">
        <section className="assets-summary-grid">
          <article className="assets-summary-card highlight">
            <span>Total assets</span>
            <strong>{assets.length.toString().padStart(2, "0")}</strong>
            <p>Files saved in backend storage</p>
          </article>

          <article className="assets-summary-card">
            <span>Image assets</span>
            <strong>
              {assets
                .filter((asset) => isImageAsset(asset))
                .length.toString()
                .padStart(2, "0")}
            </strong>
            <p>Previewable manga references</p>
          </article>

          <article className="assets-summary-card">
            <span>Selected type</span>
            <strong>{assetType}</strong>
            <p>Used when uploading new files</p>
          </article>
        </section>

        <section className="assets-workspace">
          <section className="asset-upload-card">
            <div className="section-chip">Asset upload</div>

            <h2>Add Studio Asset</h2>
            <p>
              Upload reference files for character design, backgrounds,
              manuscripts or page production.
            </p>

            <label className="asset-field">
              Asset type
              <select
                value={assetType}
                onChange={(event) =>
                  setAssetType(event.target.value as AssetType)
                }
              >
                {assetTypes.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </label>

            <label className="asset-dropzone">
              <span>📦</span>
              <strong>{isUploading ? "Uploading..." : "Choose file"}</strong>
              <small>PNG, JPG, PDF or manuscript file</small>
              <input
                type="file"
                onChange={handleUpload}
                disabled={isUploading}
              />
            </label>

            {message && <p className="asset-message">{message}</p>}
          </section>

          <section className="asset-library-card">
            <div className="asset-library-header">
              <div>
                <div className="section-chip">Asset library</div>
                <h2>Studio Assets</h2>
              </div>

              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search asset..."
              />
            </div>

            <div className="asset-list">
              {filteredAssets.length === 0 && (
                <p className="empty-text">
                  Chưa có asset nào. Upload file ở khung bên trái.
                </p>
              )}

              {filteredAssets.map((asset) => (
                <article key={asset.id} className="asset-card">
                  <div className="asset-preview">
                    {isImageAsset(asset) ? (
                      <img src={getAssetUrl(asset)} alt={asset.name} />
                    ) : (
                      <span>📄</span>
                    )}
                  </div>

                  <div className="asset-info">
                    <span>{asset.type}</span>
                    <h3>{asset.name}</h3>
                    <p>
                      {formatFileSize(asset.size)} · Added{" "}
                      {new Date(asset.createdAt).toLocaleDateString("vi-VN")}
                    </p>
                  </div>

                  <div className="asset-actions">
                    <button
                      className="asset-preview-button"
                      type="button"
                      onClick={() => setPreviewAsset(asset)}
                    >
                      Preview
                    </button>

                    <button
                      className="asset-edit-button"
                      type="button"
                      onClick={() => openEditAsset(asset)}
                    >
                      Edit
                    </button>

                    <button
                      className="asset-remove-button"
                      type="button"
                      onClick={() => removeAsset(asset.id)}
                    >
                      Remove
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </section>
        </section>

        {previewAsset && (
          <div
            className="asset-preview-modal-backdrop"
            onClick={() => setPreviewAsset(null)}
          >
            <section
              className="asset-preview-modal"
              onClick={(event) => event.stopPropagation()}
            >
              <header className="asset-preview-modal-header">
                <div>
                  <span>{previewAsset.type}</span>
                  <h2>{previewAsset.name}</h2>
                  <p>
                    {formatFileSize(previewAsset.size)} ·{" "}
                    {previewAsset.mimeType ?? "Unknown file type"}
                  </p>
                </div>

                <button type="button" onClick={() => setPreviewAsset(null)}>
                  ×
                </button>
              </header>

              <div className="asset-preview-modal-body">
                {isImageAsset(previewAsset) && (
                  <img
                    src={getAssetUrl(previewAsset)}
                    alt={previewAsset.name}
                  />
                )}

                {isPdfAsset(previewAsset) && (
                  <iframe
                    src={getAssetUrl(previewAsset)}
                    title={previewAsset.name}
                  />
                )}

                {!isImageAsset(previewAsset) && !isPdfAsset(previewAsset) && (
                  <div className="asset-preview-empty">
                    <span>📄</span>
                    <h3>Không preview trực tiếp được file này</h3>
                    <p>
                      File này đã được lưu trong backend, nhưng trình duyệt
                      không hỗ trợ xem trực tiếp loại file này trong modal.
                    </p>
                  </div>
                )}
              </div>
            </section>
          </div>
        )}

        {editingAsset && (
          <div
            className="asset-preview-modal-backdrop"
            onClick={() => setEditingAsset(null)}
          >
            <section
              className="asset-edit-modal"
              onClick={(event) => event.stopPropagation()}
            >
              <header className="asset-preview-modal-header">
                <div>
                  <span>Edit asset</span>
                  <h2>{editingAsset.name}</h2>
                  <p>Đổi tên hiển thị và loại asset.</p>
                </div>

                <button type="button" onClick={() => setEditingAsset(null)}>
                  ×
                </button>
              </header>

              <form className="asset-edit-form" onSubmit={handleUpdateAsset}>
                <label>
                  Display name
                  <input
                    value={editName}
                    onChange={(event) => setEditName(event.target.value)}
                    placeholder="Poster Coming Soon"
                  />
                </label>

                <label>
                  Asset type
                  <select
                    value={editType}
                    onChange={(event) =>
                      setEditType(event.target.value as AssetType)
                    }
                  >
                    {assetTypes.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                </label>

                <button type="submit">Save changes</button>
              </form>
            </section>
          </div>
        )}
      </main>
    </AppLayout>
  );
}
