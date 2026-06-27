export type AssistantOption = {
  id: number;
  displayName: string;
  email: string;
  role: string;
};

export type Task = {
  id: number;
  regionId: number;
  pageId: number;
  assignorUserId: number;
  assigneeUserId: number;
  taskPriceRuleId: number | null;
  description: string;
  instruction: string | null;
  deadline: string | null;
  status: string;
  paymentAmount: string | number | null;
  createdAt: string;
  updatedAt: string;

  assignee?: {
    id: number;
    displayName: string;
    email: string;
  };

  region?: {
    id: number;
    type: string;
    xCoordinate: string | number;
    yCoordinate: string | number;
    width: string | number;
    height: string | number;
  };

  page?: {
    id: number;
    pageNumber: number;
    status: string;
    versions?: {
      id: number;
      versionNumber: number;
      imageUrl: string;
      uploadNote: string | null;
      createdAt: string;
    }[];
  };
};

export type CreateTaskRequest = {
  regionId: number;
  assigneeUserId: number;
  taskPriceRuleId?: number;
  description: string;
  instruction?: string;
  deadline?: string;
  paymentAmount?: number;
};

export type CreateSubmissionRequest = {
  fileUrl: string;
  feedback?: string;
};

export type Submission = {
  id: number;
  taskId: number;
  pageId: number;
  assistantUserId: number;
  versionNumber: number;
  fileUrl: string;
  feedback: string | null;
  status: string;
  submittedAt?: string;
  createdAt?: string;

  task?: {
    id: number;
    description: string;
    instruction: string | null;
    status: string;
    paymentAmount: string | number | null;
    deadline: string | null;
    region?: {
      id: number;
      type: string;
      xCoordinate: string | number;
      yCoordinate: string | number;
      width: string | number;
      height: string | number;
    };
  };

  page?: {
    id: number;
    pageNumber: number;
    status: string;
  };
};

export type EarningsSummary = {
  totalTasks: number;
  submittedTasks: number;
  approvedTasks: number;
  inProgressTasks: number;
  submittedAmount: number;
  approvedAmount: number;
  pendingAmount: number;
  totalPotentialAmount: number;
};

export type EarningsItem = {
  id: number;
  description: string;
  status: string;
  paymentAmount: string | number | null;
  deadline: string | null;
  createdAt: string;
  region?: {
    id: number;
    type: string;
  } | null;
  page?: {
    id: number;
    pageNumber: number;
  } | null;
  latestSubmission?: {
    id: number;
    versionNumber: number;
    status: string;
    fileUrl: string;
    feedback: string | null;
  } | null;
};

export type EarningsOverview = {
  summary: EarningsSummary;
  items: EarningsItem[];
};

export type ReviewSubmission = {
  id: number;
  taskId: number;
  pageId: number;
  assistantUserId: number;
  versionNumber: number;
  fileUrl: string;
  feedback: string | null;
  status: string;
  submittedAt?: string;
  reviewedAt?: string | null;

  assistant?: {
    id: number;
    displayName: string;
    email: string;
  };

  task?: {
    id: number;
    description: string;
    instruction: string | null;
    status: string;
    paymentAmount: string | number | null;
    deadline: string | null;
    region?: {
      id: number;
      type: string;
      xCoordinate: string | number;
      yCoordinate: string | number;
      width: string | number;
      height: string | number;
    };
  };

  page?: {
    id: number;
    pageNumber: number;
    status: string;
  };
};

export type EditorProductionOverview = {
  summary: {
    totalTasks: number;
    assignedTasks: number;
    inProgressTasks: number;
    submittedTasks: number;
    approvedTasks: number;
    revisionTasks: number;
    waitingReviewSubmissions: number;
    approvedSubmissions: number;
  };

  latestTasks: {
    id: number;
    description: string;
    status: string;
    paymentAmount: string | number | null;
    deadline: string | null;
    createdAt: string;
    assignee?: {
      id: number;
      displayName: string;
      email: string;
    } | null;
    assignor?: {
      id: number;
      displayName: string;
      email: string;
    } | null;
    page?: {
      id: number;
      pageNumber: number;
      status: string;
    } | null;
    region?: {
      id: number;
      type: string;
    } | null;
    latestSubmission?: {
      id: number;
      versionNumber: number;
      status: string;
      fileUrl: string;
      feedback: string | null;
    } | null;
  }[];

  latestSubmissions: ReviewSubmission[];
};
