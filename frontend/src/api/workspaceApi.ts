const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(options?.headers || {}),
    },
    ...options,
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(data?.message || "Request failed");
  }

  return data as T;
}

export type AnyRecord = Record<string, any>;

export const workspaceApi = {
  getAssistantWorkspace(assistantUserId: number) {
    return request<AnyRecord>(`/assistant-workspace/${assistantUserId}`);
  },

  getAssistantEarningsSummary(assistantUserId: number) {
    return request<AnyRecord>(`/earnings/assistant/${assistantUserId}/summary`);
  },
  getReviewWorkspace() {
    return request<AnyRecord>("/review-workspace");
  },

  getPendingSubmissions() {
    return request<AnyRecord[]>("/review-workspace/pending");
  },

  reviewSubmission(
    submissionId: number,
    body: {
      status: string;
      feedback: string;
      reviewedByUserId: number;
    },
  ) {
    return request<AnyRecord>(`/submissions/${submissionId}/review`, {
      method: "PATCH",
      body: JSON.stringify(body),
    });
  },

  getPublicationWorkspace() {
    return request<AnyRecord>("/publication-workspace");
  },

  createPublicationSchedule(body: {
    chapterId: number;
    scheduledByUserId: number;
    releaseDate: string;
  }) {
    return request<AnyRecord>("/publication-workspace/schedules", {
      method: "POST",
      body: JSON.stringify(body),
    });
  },

  publishSchedule(scheduleId: number) {
    return request<AnyRecord>(
      `/publication-workspace/schedules/${scheduleId}/publish`,
      {
        method: "PATCH",
      },
    );
  },

  cancelSchedule(scheduleId: number) {
    return request<AnyRecord>(
      `/publication-workspace/schedules/${scheduleId}/cancel`,
      {
        method: "PATCH",
      },
    );
  },

  seedTaskSubmission() {
    return request<AnyRecord>("/dev/seed-task-submission", {
      method: "POST",
    });
  },
};
