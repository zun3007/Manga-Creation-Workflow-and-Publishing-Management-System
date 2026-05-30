export interface User {
  id: number;
  email: string;
  name: string;
  role: string;
  avatarUrl: string | null;
  authProvider?: string;
}

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
  createdAt: string;
}
