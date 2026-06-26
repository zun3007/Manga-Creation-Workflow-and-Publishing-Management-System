import { useState } from "react";
import { Panel } from "../../components/ui/Panel";
import { Button } from "../../components/ui/Button";
import { Stamp } from "../../components/ui/Stamp";

type ChapterStatus =
    | "PENDING"
    | "APPROVED"
    | "REJECTED";

type Chapter = {
    id: number;
    title: string;
    series: string;
    submittedAt: string;
    status: ChapterStatus;
};

const MOCK_CHAPTERS: Chapter[] = [
    {
        id: 1,
        title: "Chapter 12 - The Return",
        series: "Dragon Hunter",
        submittedAt: "2026-06-24",
        status: "PENDING",
    },
    {
        id: 2,
        title: "Chapter 13 - The Last Battle",
        series: "Dragon Hunter",
        submittedAt: "2026-06-25",
        status: "PENDING",
    },
    {
        id: 3,
        title: "Chapter 8 - Moonlight",
        series: "Moon Princess",
        submittedAt: "2026-06-23",
        status: "APPROVED",
    },
];

export default function ChapterApproval() {
    const [chapters, setChapters] =
        useState<Chapter[]>(MOCK_CHAPTERS);

    function approveChapter(id: number) {
        setChapters((prev) =>
            prev.map((chapter) =>
                chapter.id === id
                    ? {
                        ...chapter,
                        status: "APPROVED",
                    }
                    : chapter
            )
        );
    }

    function rejectChapter(id: number) {
        setChapters((prev) =>
            prev.map((chapter) =>
                chapter.id === id
                    ? {
                        ...chapter,
                        status: "REJECTED",
                    }
                    : chapter
            )
        );
    }

    return (
        <div className="space-y-6 p-8">
            {/* Header */}
            <div>
                <h1 className="font-display text-3xl font-bold text-ink">
                    Phê duyệt chương
                </h1>

                <p className="mt-2 text-sm text-muted">
                    Xem xét và phê duyệt cuối cùng trước khi
                    các chương được phát hành
                </p>
            </div>

            {/* Table */}
            <Panel className="overflow-hidden">
                <div className="border-b border-line px-8 py-6">
                    <h2 className="font-display text-lg text-ink">
                        Chương đang chờ đánh giá
                    </h2>
                </div>

                <div className="p-8">
                    {chapters.length === 0 ? (
                        <div className="text-sm text-muted">
                            No chapters are waiting for review.
                        </div>
                    ) : (
                        <table className="min-w-full text-sm">
                            <thead className="bg-bg">
                            <tr className="border-b border-line text-left">
                                <th className="px-4 py-4 font-semibold">
                                    Chương
                                </th>

                                <th className="px-4 py-4 font-semibold">
                                    Series
                                </th>

                                <th className="px-4 py-4 font-semibold">
                                    Ngày đã nộp
                                </th>

                                <th className="px-4 py-4 font-semibold">
                                    Trạng thái
                                </th>

                                <th className="px-4 py-4 font-semibold">
                                    Quyết định
                                </th>
                            </tr>
                            </thead>

                            <tbody>
                            {chapters.map((chapter) => (
                                <tr
                                    key={chapter.id}
                                    className="border-b border-line"
                                >
                                    <td className="px-4 py-6">
                                        {chapter.title}
                                    </td>

                                    <td className="px-4 py-6">
                                        {chapter.series}
                                    </td>

                                    <td className="px-4 py-6">
                                        {chapter.submittedAt}
                                    </td>

                                    <td className="px-4 py-6">
                                        <Stamp
                                            status={chapter.status}
                                        />
                                    </td>

                                    <td className="px-4 py-6">
                                        {chapter.status ===
                                        "PENDING" ? (
                                            <div className="flex gap-3">
                                                <Button
                                                    onClick={() =>
                                                        approveChapter(
                                                            chapter.id
                                                        )
                                                    }
                                                >
                                                    Chấp nhận
                                                </Button>

                                                <Button
                                                    variant="ghost"
                                                    onClick={() =>
                                                        rejectChapter(
                                                            chapter.id
                                                        )
                                                    }
                                                >
                                                    Từ chối
                                                </Button>
                                            </div>
                                        ) : (
                                            <span className="text-sm text-muted">
                          Không có quyết định khả dụng
                        </span>
                                        )}
                                    </td>
                                </tr>
                            ))}
                            </tbody>
                        </table>
                    )}

                    <div className="mt-6 text-xs text-muted">
                        TODO: Replace mock data with backend API
                        in Sprint 4.
                    </div>
                </div>
            </Panel>
        </div>
    );
}