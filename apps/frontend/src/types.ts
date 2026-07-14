// Auth user shape lives in @manga/shared (AuthUser) — don't duplicate it here.
import type {
  ProposalStatus,
  Frequency,
  SeriesStatus,
  ChapterStatus,
  PageStatus,
  RegionType,
  TaskStatus,
  SubmissionStatus,
  Role,
} from "@manga/shared";

export interface Summary {
  totalSeries: number;
  activeSeries: number;
  atRiskSeries: number;
  chaptersInProgress: number;
  openTasks: number;
  pendingReview: number;
  unreadNotifications: number;
}

export interface Series {
  id: number;
  title: string;
  status: string;
  frequency: string;
  rankPosition: number | null;
  score: number | null;
  riskLevel: string | null;
  chapters: number;
  published: number;
}

export interface Task {
  id: number;
  description: string;
  status: string;
  deadline: string | null;
  payment: number;
  assignee: string;
  assigneeAvatar: string | null;
  chapter: string | null;
  series: string | null;
  page: number | null;
}

export interface Submission {
  id: number;
  status: string;
  note: string | null;
  submittedAt: string;
  task: string;
  assistant: string;
  assistantAvatar: string | null;
}

export interface AppNotification {
  id: number;
  type: string;
  title: string;
  content: string | null;
  isRead: number;
  relatedEntityType?: string | null;
  relatedEntityId?: number | null;
  createdAt: string;
}

// Sprint 2 types — use shared status enums
export interface Proposal {
  id: number;
  title: string;
  synopsis: string | null;
  status: ProposalStatus;
  proposedFrequency?: Frequency;
  genres?: string;
  sampleManuscriptUrl?: string | null;
  sampleManuscriptName?: string | null;
  sampleManuscriptUploadedAt?: string | null;
  reviewNote?: string | null;
  decisionNote?: string | null;
  mangaka?: string;
  mangakaUserId?: number;
  mangakaName?: string;
  reviewDueDate?: string | null;
  submittedAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface SeriesItem {
  id: number;
  title: string;
  frequency: Frequency;
  status: SeriesStatus;
  chapters: number;
  genres: string | null;
}

export interface ChapterItem {
  id: number;
  number: number;
  title: string;
  status: ChapterStatus;
  deadline: string | null;
  pages: number;
}

export interface RegionItem {
  id: number;
  type: RegionType;
  x: number;
  y: number;
  width: number;
  height: number;
  taskId?: number | null;
  taskStatus?: TaskStatus | null;
  assigneeId?: number | null;
  assigneeName?: string | null;
}

export interface PageDetail {
  id: number;
  number: number;
  status: PageStatus;
  imageUrl: string;
  pageVersionId: number;
  regions: RegionItem[];
}

export interface PageItem {
  id: number;
  number: number;
  status: PageStatus;
  imageUrl: string;
}

export interface TaskItem {
  id: number;
  pageId?: number;
  regionId?: number;
  description: string | null;
  status: TaskStatus;
  deadline: string | null;
  payment: string | number;
  instruction?: string | null;
  series?: string;
  chapter?: string;
  page?: number;
  regionType?: RegionType;
  pageImage?: string | null;
  assignee?: string;
}

export interface SubmissionItem {
  id: number;
  status: SubmissionStatus;
  note: string | null;
  fileUrl: string;
  submittedAt: string;
  taskId?: number;
  task?: string;
  assistant?: string;
  assistantAvatar?: string | null;
}

// Sprint 5 — editor review queue + admin console
export interface EditorChapter {
  id: number;
  number: number;
  title: string;
  status: ChapterStatus;
  deadline: string | null;
  seriesId: number;
  series: string;
  pages: number;
}

export interface AdminUser {
  id: number;
  email: string;
  name: string;
  role: Role;
  isActivated: number | boolean;
  authProvider: string;
  createdAt: string;
}
