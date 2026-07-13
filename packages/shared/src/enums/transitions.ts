import { ProposalStatus } from "./proposal";
import { ChapterStatus } from "./chapter";
import { PageStatus } from "./page";
import { TaskStatus } from "./task";
import { SubmissionStatus } from "./submission";
import { EarningDisputeStatus } from "./dispute";

export const PROPOSAL_TRANSITIONS: Record<ProposalStatus, ProposalStatus[]> = {
  [ProposalStatus.DRAFT]: [ProposalStatus.SUBMITTED],
  [ProposalStatus.SUBMITTED]: [
    ProposalStatus.UNDER_REVIEW,
    ProposalStatus.APPROVED,
    ProposalStatus.REJECTED,
  ],
  [ProposalStatus.UNDER_REVIEW]: [
    ProposalStatus.APPROVED,
    ProposalStatus.REJECTED,
  ],
  [ProposalStatus.APPROVED]: [],
  [ProposalStatus.REJECTED]: [],
};

export const CHAPTER_TRANSITIONS: Record<ChapterStatus, ChapterStatus[]> = {
  [ChapterStatus.DRAFT]: [ChapterStatus.IN_PROGRESS],

  [ChapterStatus.IN_PROGRESS]: [ChapterStatus.READY_FOR_EDITOR_REVIEW],

  [ChapterStatus.READY_FOR_EDITOR_REVIEW]: [
    ChapterStatus.EDITOR_APPROVED,
    ChapterStatus.IN_PROGRESS,
  ],

  [ChapterStatus.EDITOR_APPROVED]: [ChapterStatus.BOARD_APPROVED, ChapterStatus.IN_PROGRESS],

  [ChapterStatus.BOARD_APPROVED]: [ChapterStatus.PUBLISHED],

  [ChapterStatus.PUBLISHED]: [],
};

/**
 * Transitions a MANGAKA may drive directly on their own chapter via
 * `PATCH /chapters/:id/status`. Editor approval, board approval and publishing
 * are intentionally excluded — they happen only through their own role-guarded
 * endpoints (editor-review, board-review, publication-schedule). This prevents
 * a mangaka from self-approving past the editor/board or self-publishing.
 */
export const MANGAKA_CHAPTER_TRANSITIONS: Record<ChapterStatus, ChapterStatus[]> =
  {
    [ChapterStatus.DRAFT]: [ChapterStatus.IN_PROGRESS],
    [ChapterStatus.IN_PROGRESS]: [ChapterStatus.READY_FOR_EDITOR_REVIEW],
    [ChapterStatus.READY_FOR_EDITOR_REVIEW]: [],
    [ChapterStatus.EDITOR_APPROVED]: [],
    [ChapterStatus.BOARD_APPROVED]: [],
    [ChapterStatus.PUBLISHED]: [],
  };

export const PAGE_TRANSITIONS: Record<PageStatus, PageStatus[]> = {
  [PageStatus.RAW]: [PageStatus.ASSIGNED],
  [PageStatus.ASSIGNED]: [PageStatus.IN_PROGRESS],
  [PageStatus.IN_PROGRESS]: [PageStatus.REVIEWING],
  [PageStatus.REVIEWING]: [PageStatus.COMPLETED, PageStatus.IN_PROGRESS],
  [PageStatus.COMPLETED]: [],
};

export const TASK_TRANSITIONS: Record<TaskStatus, TaskStatus[]> = {
  [TaskStatus.ASSIGNED]: [TaskStatus.IN_PROGRESS],
  [TaskStatus.IN_PROGRESS]: [TaskStatus.SUBMITTED],
  [TaskStatus.SUBMITTED]: [TaskStatus.APPROVED, TaskStatus.REVISION_REQUIRED],
  [TaskStatus.REVISION_REQUIRED]: [
    TaskStatus.IN_PROGRESS,
    TaskStatus.SUBMITTED,
  ],
  [TaskStatus.APPROVED]: [],
};

export const SUBMISSION_TRANSITIONS: Record<
  SubmissionStatus,
  SubmissionStatus[]
> = {
  [SubmissionStatus.PENDING]: [
    SubmissionStatus.UNDER_REVIEW,
    SubmissionStatus.APPROVED,
    SubmissionStatus.REVISION_REQUIRED,
    SubmissionStatus.REJECTED,
  ],
  [SubmissionStatus.UNDER_REVIEW]: [
    SubmissionStatus.APPROVED,
    SubmissionStatus.REVISION_REQUIRED,
    SubmissionStatus.REJECTED,
  ],
  [SubmissionStatus.REVISION_REQUIRED]: [],
  [SubmissionStatus.APPROVED]: [],
  [SubmissionStatus.REJECTED]: [],
};

export const EARNING_DISPUTE_TRANSITIONS: Record<
  EarningDisputeStatus,
  EarningDisputeStatus[]
> = {
  [EarningDisputeStatus.OPEN]: [
    EarningDisputeStatus.UNDER_REVIEW,
    EarningDisputeStatus.RESOLVED,
    EarningDisputeStatus.REJECTED,
  ],
  [EarningDisputeStatus.UNDER_REVIEW]: [
    EarningDisputeStatus.RESOLVED,
    EarningDisputeStatus.REJECTED,
  ],
  [EarningDisputeStatus.RESOLVED]: [],
  [EarningDisputeStatus.REJECTED]: [],
};

export function canTransition<T extends string>(
  map: Record<T, T[]>,
  from: T,
  to: T,
): boolean {
  return map[from]?.includes(to) ?? false;
}
