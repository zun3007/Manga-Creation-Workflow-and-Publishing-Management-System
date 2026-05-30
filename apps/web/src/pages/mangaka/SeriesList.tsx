import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../../lib/api";
import { Panel } from "../../components/ui/Panel";
import { Stamp } from "../../components/ui/Stamp";
import { Button } from "../../components/ui/Button";
import type { SeriesItem } from "../../types";

export default function SeriesList() {
  const navigate = useNavigate();
  const [series, setSeries] = useState<SeriesItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  async function load() {
    setLoading(true);
    setError(false);
    try {
      const res = await api.get("/series/mine");
      setSeries(res.data || []);
    } catch (e) {
      console.error("Failed to load series", e);
      setError(true);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const handleSelectSeries = (id: number) => {
    navigate(`/series/${id}`);
  };

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-line bg-bg/95 px-8 py-5 backdrop-blur">
        <h1 className="text-3xl">Series của bạn</h1>
      </header>

      {loading ? (
        <div className="grid h-[60vh] place-items-center p-8">
          <span className="font-mono text-xs uppercase tracking-wider animate-pulse text-ink-soft">
            Đang tải series…
          </span>
        </div>
      ) : error ? (
        <div className="grid h-[60vh] place-items-center p-8">
          <Panel className="p-6 text-center">
            <p className="text-ink">Không tải được danh sách series.</p>
            <Button className="mt-4" onClick={load}>
              Thử lại
            </Button>
          </Panel>
        </div>
      ) : series.length === 0 ? (
        <div className="grid h-[60vh] place-items-center p-8">
          <Panel className="p-8 text-center max-w-sm">
            <p className="text-ink-soft">Chưa có series — được tạo khi Board duyệt đề xuất.</p>
            <Button className="mt-4" onClick={() => navigate("/proposals")}>
              Xem đề xuất
            </Button>
          </Panel>
        </div>
      ) : (
        <div className="space-y-4 p-8">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {series.map((s) => (
              <button
                key={s.id}
                onClick={() => handleSelectSeries(s.id)}
                className="text-left transition hover:-translate-x-0.5 hover:-translate-y-0.5"
              >
                <Panel className="h-full p-5 flex flex-col">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <h3 className="text-lg font-semibold text-ink line-clamp-2 flex-1">{s.title}</h3>
                    <Stamp status={s.status} />
                  </div>

                  {s.genres && (
                    <p className="font-mono text-[0.6rem] uppercase tracking-wider text-ink-soft mb-3">
                      {s.genres}
                    </p>
                  )}

                  <div className="flex-1">
                    <p className="font-mono text-[0.62rem] uppercase tracking-wider text-ink-soft">
                      {s.frequency} · {s.chapters} chương
                    </p>
                  </div>

                  <div className="mt-4 pt-4 border-t border-line">
                    <p className="font-mono text-[0.62rem] uppercase tracking-wider text-accent">
                      {s.chapters} chương
                    </p>
                  </div>
                </Panel>
              </button>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
