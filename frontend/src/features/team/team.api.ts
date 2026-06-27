import { api } from "../../api/axios";

export type AssistantOption = {
  id: number;
  email: string;
  displayName: string;
  avatarUrl?: string | null;
  role?: string;
  skillSet?: string | null;
  salaryRate?: number;
  totalEarnings?: number;
  currentTasks?: number;
  completedTasks?: number;
  totalAssignedTasks?: number;
  status?: "Available" | "Busy" | string;
};

export async function getAssistantOptions() {
  const response = await api.get<AssistantOption[]>("/tasks/assistant-options");

  return response.data;
}