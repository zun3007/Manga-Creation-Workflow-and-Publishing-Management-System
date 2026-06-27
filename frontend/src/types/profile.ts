export type UserRole =
  | "ADMIN"
  | "MANGAKA"
  | "ASSISTANT"
  | "TANTOU_EDITOR"
  | "EDITORIAL_BOARD";

export type ProfileUser = {
  id: number;
  email: string;
  displayName: string;
  avatarUrl?: string | null;
  role: UserRole;
  isActive: boolean;
  mustChangePassword: boolean;
  createdAt: string;
  updatedAt: string;
  lastLoginAt?: string | null;

  mangakaProfile?: {
    userId: number;
    penName: string;
    biography?: string | null;
    yearsExperience: number;
    studioName?: string | null;
  } | null;

  assistantProfile?: {
    userId: number;
    salaryRate?: string | number;
    skillSet?: string | null;
    totalEarnings?: string | number;
  } | null;

  tantouEditorProfile?: {
    userId: number;
    departmentName?: string | null;
    specialization?: string | null;
    yearsExperience: number;
    managedSeriesCount?: number;
  } | null;

  editorialBoardProfile?: {
    userId: number;
    departmentName?: string | null;
    specialization?: string | null;
    yearsExperience: number;
    managedSeriesCount?: number;
  } | null;
};

export type UpdateProfilePayload = {
  displayName?: string;
  penName?: string;
  biography?: string;
  yearsExperience?: number;
  studioName?: string;
  skillSet?: string;
  departmentName?: string;
  specialization?: string;
};

export type ChangePasswordPayload = {
  oldPassword: string;
  newPassword: string;
};
