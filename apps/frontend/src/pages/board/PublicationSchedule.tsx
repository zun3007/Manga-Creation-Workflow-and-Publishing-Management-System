import { useMemo, useState } from "react";
import { Panel } from "../../components/ui/Panel";
import { Button } from "../../components/ui/Button";
import { Stamp } from "../../components/ui/Stamp";

type Chapter = {
    id: number;
    number: number;
    title: string;
};

type Series = {
    id: number;
    title: string;
    chapters: Chapter[];
};

type Schedule = {
    id: number;
    seriesId: number;
    chapterId: number;
    chapterName: string;
    releaseDate: string;
};

const MOCK_SERIES: Series[] = [
    {
        id: 1,
        title: "Dragon Hunter",
        chapters: [
            { id: 1, number: 1, title: "The Beginning" },
            { id: 2, number: 2, title: "The First Battle" },
            { id: 3, number: 3, title: "Into The Forest" },
        ],
    },
    {
        id: 2,
        title: "Moon Princess",
        chapters: [
            { id: 4, number: 1, title: "A New World" },
            { id: 5, number: 2, title: "The Secret Palace" },
        ],
    },
];

export default function PublicationSchedule() {
    const [seriesId, setSeriesId] = useState<number | undefined>();
    const [chapterId, setChapterId] = useState<number | undefined>();
    const [releaseDate, setReleaseDate] = useState("");

    const [schedules, setSchedules] = useState<Schedule[]>([
        {
            id: 1,
            seriesId: 1,
            chapterId: 1,
            chapterName: "Chapter 1 - The Beginning",
            releaseDate: "2026-07-01",
        },
    ]);

    const selectedSeries = useMemo(
        () => MOCK_SERIES.find((s) => s.id === seriesId),
        [seriesId]
    );

    function createSchedule() {
        if (!selectedSeries || !chapterId || !releaseDate) {
            alert("Please fill all fields.");
            return;
        }

        const chapter = selectedSeries.chapters.find(
            (c) => c.id === chapterId
        );

        if (!chapter) return;

        const newSchedule: Schedule = {
            id: Date.now(),
            seriesId: selectedSeries.id,
            chapterId,
            chapterName: `Chapter ${chapter.number} - ${chapter.title}`,
            releaseDate,
        };

        setSchedules((prev) => [...prev, newSchedule]);

        alert("Publication schedule created successfully.");

        setChapterId(undefined);
        setReleaseDate("");
    }

    return (
        <div className="space-y-6 p-8">
            {/* Header */}
            <div>
                <h1 className="font-display text-3xl font-bold text-ink">
                    Lịch xuất bản
                </h1>

                <p className="mt-2 text-sm text-muted">
                    Lên kế hoạch và quản lý lịch phát hành các chương truyện tranh đã được phê duyệt.
                </p>
            </div>

            {/* Create Schedule */}
            <Panel className="overflow-hidden">
                <div className="border-b border-line px-8 py-6">
                    <h2 className="font-display text-lg text-ink">
                        Tạo lịch trình
                    </h2>
                </div>

                <div className="space-y-6 p-8">
                    <div className="grid gap-6 md:grid-cols-3">
                        {/* Series */}
                        <div>
                            <label className="mb-2 block text-sm font-medium text-ink">
                                Series
                            </label>

                            <select
                                className="w-full rounded-lg border border-line bg-surface p-3 text-sm"
                                value={seriesId ?? ""}
                                onChange={(e) => {
                                    const value = e.target.value;

                                    setSeriesId(
                                        value ? Number(value) : undefined
                                    );

                                    setChapterId(undefined);
                                }}
                            >
                                <option value="">
                                    Chọn Series
                                </option>

                                {MOCK_SERIES.map((series) => (
                                    <option
                                        key={series.id}
                                        value={series.id}
                                    >
                                        {series.title}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Chapter */}
                        <div>
                            <label className="mb-2 block text-sm font-medium text-ink">
                                Chương
                            </label>

                            <select
                                className="w-full rounded-lg border border-line bg-surface p-3 text-sm"
                                value={chapterId ?? ""}
                                disabled={!selectedSeries}
                                onChange={(e) =>
                                    setChapterId(
                                        e.target.value
                                            ? Number(e.target.value)
                                            : undefined
                                    )
                                }
                            >
                                <option value="">
                                    Chọn chương
                                </option>

                                {selectedSeries?.chapters.map((chapter) => (
                                    <option
                                        key={chapter.id}
                                        value={chapter.id}
                                    >
                                        Chapter {chapter.number} - {chapter.title}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Release Date */}
                        <div>
                            <label className="mb-2 block text-sm font-medium text-ink text-sm">
                                Ngày phát hành
                            </label>

                            <input
                                type="date"
                                className="w-full rounded-lg border border-line bg-surface p-3"
                                value={releaseDate}
                                onChange={(e) =>
                                    setReleaseDate(e.target.value)
                                }
                            />
                        </div>
                    </div>

                    <div className="flex justify-end">
                        <Button onClick={createSchedule}>
                            Tạo lịch trình
                        </Button>
                    </div>
                </div>
            </Panel>

            {/* Schedule List */}
            <Panel className="overflow-hidden">
                <div className="border-b border-line px-8 py-6">
                    <h2 className="font-display text-lg text-ink">
                        Lịch phát hành
                    </h2>
                </div>

                <div className="p-8">
                    {schedules.length === 0 ? (
                        <div className="text-sm text-muted">
                            No publication schedules yet.
                        </div>
                    ) : (
                        <table className="min-w-full text-sm">
                            <thead className="bg-bg">
                            <tr className="border-b border-line text-left">
                                <th className="px-4 py-4 font-semibold">
                                    Chương
                                </th>

                                <th className="px-4 py-4 font-semibold">
                                    Ngày phát hành
                                </th>

                                <th className="px-4 py-4 font-semibold">
                                    Trạng thái
                                </th>
                            </tr>
                            </thead>

                            <tbody>
                            {schedules.map((schedule) => (
                                <tr key={schedule.id}
                                    className="border-b border-line">
                                    <td className="px-4 py-6">
                                        {schedule.chapterName}
                                    </td>

                                    <td className="px-4 py-6">
                                        {schedule.releaseDate}
                                    </td>

                                    <td className="px-4 py-6">
                                        <Stamp
                                            status="ACTIVE"
                                            label="Scheduled"
                                        />
                                    </td>
                                </tr>
                            ))}
                            </tbody>
                        </table>
                    )}

                    <div className="mt-6 text-xs text-muted">
                        TODO: Replace mock data with backend API in Sprint 4.
                    </div>
                </div>
            </Panel>
        </div>
    );
}