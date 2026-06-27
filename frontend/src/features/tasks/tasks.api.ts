import { api } from "../../api/axios";
import type {
  AssistantOption,
  CreateSubmissionRequest,
  CreateTaskRequest,
  EarningsOverview,
  EditorProductionOverview,
  ReviewSubmission,
  Submission,
  Task,
} from "../../types/task";

export async function getAssistantOptions() {
  const response = await api.get<AssistantOption[]>("/tasks/assistant-options");

  return response.data;
}

export async function createTask(data: CreateTaskRequest) {
  const response = await api.post<Task>("/tasks", data);

  return response.data;
}

export async function getCreatedTasks() {
  const response = await api.get<Task[]>("/tasks/created-by-me");

  return response.data;
}

export async function getAssignedTasks() {
  const response = await api.get<Task[]>("/tasks/assigned-to-me");

  return response.data;
}

export async function acceptTask(taskId: number) {
  const response = await api.patch<Task>(`/tasks/${taskId}/accept`);

  return response.data;
}

export async function submitTask(
  taskId: number,
  data: CreateSubmissionRequest,
) {
  const response = await api.post(`/tasks/${taskId}/submissions`, data);

  return response.data;
}

export async function getMySubmissions() {
  const response = await api.get<Submission[]>("/tasks/my-submissions");

  return response.data;
}

export async function getMyEarnings() {
  const response = await api.get<EarningsOverview>("/tasks/my-earnings");

  return response.data;
}

export async function getReviewSubmissions() {
  const userText = localStorage.getItem("user");
  const user = userText ? JSON.parse(userText) : null;

  const endpoint =
    user?.role === "TANTOU_EDITOR"
      ? "/tasks/editor/review-submissions"
      : "/tasks/review-submissions";

  const response = await api.get<ReviewSubmission[]>(endpoint);

  return response.data;
}

export async function approveSubmission(submissionId: number) {
  const response = await api.patch<ReviewSubmission>(
    `/tasks/submissions/${submissionId}/approve`,
  );

  return response.data;
}

export async function requestSubmissionRevision(
  submissionId: number,
  feedback: string,
) {
  const response = await api.patch<ReviewSubmission>(
    `/tasks/submissions/${submissionId}/revision`,
    { feedback },
  );

  return response.data;
}

export async function getEditorProductionOverview() {
  const response = await api.get<EditorProductionOverview>(
    "/tasks/editor/production-overview",
  );

  return response.data;
}
