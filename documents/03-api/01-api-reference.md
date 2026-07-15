# REST API Reference

Complete REST API documentation for the Manga Creation Workflow & Publishing Management System. This is an internal production & publishing management tool (not a reader) digitizing a manga studio's pipeline: proposal → approval → production → review → publish → vote → ranking → decision → earnings → disputes.

**Table of Contents**

- [Conventions](#conventions)
- [Auth](#auth)
- [Proposals](#proposals)
- [Series](#series)
- [Chapters](#chapters)
- [Pages](#pages)
- [Regions](#regions)
- [Tasks](#tasks)
- [Submissions](#submissions)
- [Annotations](#annotations)
- [Rankings](#rankings)
- [Decisions](#decisions)
- [Earnings](#earnings)
- [Disputes](#disputes)
- [Notifications](#notifications)
- [Dashboard](#dashboard)
- [Admin](#admin)
- [Users](#users)
- [Genres](#genres)
- [Uploads](#uploads)
- [Studio](#studio)
- [Health](#health)
- [Endpoint Index](#endpoint-index)

## Conventions

**Base URL:** `http://localhost:3000/api` (global prefix `api`)

**Authentication:** Most endpoints require JWT bearer token via `Authorization: Bearer <JWT>` header (obtained from login or OAuth). Some endpoints (login, Google OAuth) are public.

**Request Format:** JSON bodies; unknown properties are stripped by global `ValidationPipe`. Multipart file uploads use `multipart/form-data`.

**Response Format:** Standard Nest error shape on failure: `{ statusCode: number, message: string, error: string }` (sanitized via `AllExceptionsFilter` to remove stack traces and SQL details). Success payloads vary by endpoint (see examples below).

**Status Codes:**

- `200` OK (GET, PATCH success)
- `201` Created (POST success)
- `400` Bad Request (validation error, invalid state transition)
- `401` Unauthorized (missing/invalid token)
- `403` Forbidden (insufficient role)
- `404` Not Found (entity missing)
- `500` Internal Server Error

**Roles:** Guarded by `@Roles(Role.X)`. Five roles: `MANGAKA`, `ASSISTANT`, `TANTOU_EDITOR`, `EDITORIAL_BOARD`, `ADMIN`.

---

## Auth

Public endpoints for login and OAuth. All other endpoints require `Authorization: Bearer <JWT>`.

#### POST /api/auth/login

**Roles:** Public

**Rate Limit:** 20 requests per minute per IP (via `@Throttle()`)

**Request body:**

```json
{
  "email": "mangaka@studio.local",
  "password": "Dung123456@"
}
```

**Response (201):**

```json
{
  "accessToken": "eyJhbGc...",
  "user": {
    "id": 1,
    "email": "mangaka@studio.local",
    "name": "Taro Mangaka",
    "role": "MANGAKA",
    "avatarUrl": "https://lh3.googleusercontent.com/..."
  }
}
```

**Notes:** Rate-limited to prevent brute-force attacks while tolerating shared NAT scenarios. Token valid for JWT lifetime (configured in app). Password must be ≥6 chars. Email case-insensitive.

---

#### GET /api/auth/me

**Roles:** Any authenticated user

**Request body:** None

**Response (200):**

```json
{
  "id": 1,
  "email": "mangaka@studio.local",
  "name": "Taro Mangaka",
  "role": "MANGAKA",
  "avatarUrl": "https://lh3.googleusercontent.com/..."
}
```

**Notes:** Returns current user from JWT payload. No database hit (payload-driven).

---

#### POST /api/auth/logout

**Roles:** Any authenticated user

**Request body:** None

**Response (200):**

```json
{
  "ok": true
}
```

**Notes:** Endpoint kept for symmetry; JWT is stateless. Client drops token on logout.

---

#### PATCH /api/auth/password

**Roles:** Any authenticated user

**Request body:**

```json
{
  "currentPassword": "Dung123456@",
  "newPassword": "NewPassword123@"
}
```

**Response (200):**

```json
{
  "ok": true
}
```

**Notes:** Changes password for authenticated user. Current password validation enforced. Only available for LOCAL auth (not Google OAuth users).

---

#### GET /api/auth/google

**Roles:** Public

**Notes:** Redirects to Google OAuth consent screen. Handled by `GoogleOauthGuard` + passport. Client navigates to this endpoint.

---

#### GET /api/auth/google/callback

**Roles:** Public

**Query params:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| code | string | yes | OAuth authorization code from Google |

**Notes:** Passport handler validates with Google, links or creates user, issues JWT, redirects to `{CLIENT_URL}/auth/callback?token={accessToken}`. Client extracts token from URL.

---

## Proposals

Mangaka authors proposals; Editorial Board reviews and approves. Approved proposals auto-create Series.

#### POST /api/proposals

**Roles:** MANGAKA

**Request body:**

```json
{
  "title": "My Manga Series",
  "synopsis": "A story about...",
  "proposedFrequency": "WEEKLY",
  "genreIds": [1, 3, 5]
}
```

**Response (201):**

```json
{
  "id": 10,
  "mangakaUserId": 1,
  "title": "My Manga Series",
  "synopsis": "A story about...",
  "status": "DRAFT",
  "proposedFrequency": "WEEKLY",
  "genres": "Action,Comedy,Slice of Life",
  "reviewDueDate": null,
  "submittedAt": null,
  "createdAt": "2026-05-31T10:00:00Z",
  "updatedAt": "2026-05-31T10:00:00Z"
}
```

**Notes:** Proposal created in DRAFT status. genreIds must be non-empty; validating that genres exist is handled server-side.

---

#### GET /api/proposals/mine

**Roles:** MANGAKA

**Request body:** None

**Response (200):**

```json
[
  {
    "id": 10,
    "mangakaUserId": 1,
    "title": "My Manga Series",
    "synopsis": "A story about...",
    "status": "DRAFT",
    "proposedFrequency": "WEEKLY",
    "genres": "Action,Comedy",
    "reviewDueDate": null,
    "submittedAt": null,
    "createdAt": "2026-05-31T10:00:00Z",
    "updatedAt": "2026-05-31T10:00:00Z"
  }
]
```

**Notes:** Ordered by creation date descending. Each proposal shows genre names comma-separated.

---

#### PATCH /api/proposals/:id/submit

**Roles:** MANGAKA

**Path params:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| id | number | yes | Proposal ID |

**Request body:** None

**Response (200):**

```json
{
  "id": 10,
  "status": "SUBMITTED",
  "submittedAt": "2026-05-31T10:15:00Z",
  "updatedAt": "2026-05-31T10:15:00Z"
}
```

**Notes:** Transitions DRAFT → SUBMITTED. Owner check enforced. Cannot submit non-owned proposals. State machine enforces valid transitions.

---

#### GET /api/proposals/review-queue

**Roles:** EDITORIAL_BOARD

**Request body:** None

**Response (200):**

```json
[
  {
    "id": 10,
    "mangakaUserId": 1,
    "title": "My Manga Series",
    "status": "SUBMITTED",
    "genres": "Action,Comedy",
    "proposedFrequency": "WEEKLY",
    "createdAt": "2026-05-31T10:00:00Z",
    "submittedAt": "2026-05-31T10:15:00Z"
  }
]
```

**Notes:** Board sees all SUBMITTED/UNDER_REVIEW proposals ready for decision.

---

#### PATCH /api/proposals/:id/decision

**Roles:** EDITORIAL_BOARD

**Path params:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| id | number | yes | Proposal ID |

**Request body:**

```json
{
  "decision": "APPROVED"
}
```

**Response (200):**

```json
{
  "id": 10,
  "status": "APPROVED",
  "series": {
    "id": 5,
    "title": "My Manga Series",
    "status": "ACTIVE",
    "createdAt": "2026-05-31T10:20:00Z"
  },
  "updatedAt": "2026-05-31T10:20:00Z"
}
```

**Notes:** APPROVED auto-creates Series with status ACTIVE. Mangaka receives notification. REJECTED updates proposal status to REJECTED (no Series created). Decision logged.

---

## Series

Approved proposals → Series. Mangaka manages series; Board assigns Tantou editors and monitors status.

#### GET /api/series/all

**Roles:** EDITORIAL_BOARD, ADMIN

**Request body:** None

**Response (200):**

```json
[
  {
    "id": 5,
    "title": "My Manga Series",
    "status": "ACTIVE",
    "publicationFrequency": "WEEKLY",
    "mangakaUserId": 1,
    "mangakaName": "Taro Mangaka",
    "createdAt": "2026-05-31T10:20:00Z",
    "updatedAt": "2026-05-31T10:20:00Z",
    "tantouEditor": null
  }
]
```

**Notes:** Board oversight view. Shows current editor assignment (null if unassigned).

---

#### GET /api/series/mine

**Roles:** MANGAKA

**Request body:** None

**Response (200):**

```json
[
  {
    "id": 5,
    "title": "My Manga Series",
    "status": "ACTIVE",
    "publicationFrequency": "WEEKLY",
    "createdAt": "2026-05-31T10:20:00Z",
    "updatedAt": "2026-05-31T10:20:00Z",
    "tantouEditor": {
      "id": 2,
      "name": "Editor Hanako",
      "assignedAt": "2026-05-31T10:25:00Z"
    }
  }
]
```

**Notes:** Mangaka sees own series; includes active editor assignment if any.

---

#### GET /api/series/:id

**Roles:** MANGAKA (owner only)

**Path params:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| id | number | yes | Series ID |

**Response (200):**

```json
{
  "id": 5,
  "title": "My Manga Series",
  "status": "ACTIVE",
  "publicationFrequency": "WEEKLY",
  "mangakaUserId": 1,
  "createdAt": "2026-05-31T10:20:00Z",
  "updatedAt": "2026-05-31T10:20:00Z",
  "tantouEditor": {
    "id": 2,
    "name": "Editor Hanako",
    "assignedAt": "2026-05-31T10:25:00Z"
  }
}
```

**Notes:** Ownership enforced; Mangaka cannot view other's series.

---

#### PUT /api/series/:id/editor

**Roles:** EDITORIAL_BOARD, ADMIN

**Path params:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| id | number | yes | Series ID |

**Request body:**

```json
{
  "editorUserId": 2
}
```

**Response (200):**

```json
{
  "id": 5,
  "title": "My Manga Series",
  "tantouEditor": {
    "id": 2,
    "name": "Editor Hanako",
    "assignedAt": "2026-05-31T10:30:00Z"
  }
}
```

**Notes:** Assigns Tantou Editor to series. Previous assignment soft-unassigned (unassigned_at set). Mangaka and new editor receive notifications.

---

#### DELETE /api/series/:id/editor

**Roles:** EDITORIAL_BOARD, ADMIN

**Path params:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| id | number | yes | Series ID |

**Request body:** None

**Response (200):**

```json
{
  "ok": true
}
```

**Notes:** Soft-unassigns editor (unassigned_at = now). Editor and Mangaka notified.

---

## Chapters

Mangaka creates chapters under series. Tantou editors review before publication.

#### POST /api/chapters

**Roles:** MANGAKA

**Request body:**

```json
{
  "seriesId": 5,
  "title": "Chapter 1: The Beginning",
  "deadline": "2026-06-07"
}
```

**Response (201):**

```json
{
  "id": 1,
  "seriesId": 5,
  "chapterNumber": 1,
  "title": "Chapter 1: The Beginning",
  "status": "DRAFT",
  "deadline": "2026-06-07",
  "isLocked": false,
  "createdAt": "2026-05-31T11:00:00Z",
  "updatedAt": "2026-05-31T11:00:00Z"
}
```

**Notes:** Ownership and series authorization checked. chapterNumber auto-incremented per series. Deadline optional.

---

#### GET /api/chapters?seriesId=

**Roles:** MANGAKA

**Query params:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| seriesId | number | yes | Series ID |

**Response (200):**

```json
[
  {
    "id": 1,
    "seriesId": 5,
    "chapterNumber": 1,
    "title": "Chapter 1: The Beginning",
    "status": "DRAFT",
    "deadline": "2026-06-07",
    "isLocked": false,
    "createdAt": "2026-05-31T11:00:00Z",
    "updatedAt": "2026-05-31T11:00:00Z"
  }
]
```

**Notes:** Ownership enforced; Mangaka lists chapters from own series only.

---

#### PATCH /api/chapters/:id/status

**Roles:** MANGAKA

**Path params:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| id | number | yes | Chapter ID |

**Request body:**

```json
{
  "status": "READY_FOR_EDITOR_REVIEW"
}
```

**Response (200):**

```json
{
  "id": 1,
  "status": "READY_FOR_EDITOR_REVIEW",
  "updatedAt": "2026-05-31T11:15:00Z"
}
```

**Notes:** Lifecycle: DRAFT → IN_PROGRESS → READY_FOR_EDITOR_REVIEW → EDITOR_APPROVED → PUBLISHED. Mangaka advances state. When status = PUBLISHED, a Publication_Schedule row is auto-created with status SCHEDULED.

---

#### GET /api/chapters/review-queue

**Roles:** TANTOU_EDITOR

**Request body:** None

**Response (200):**

```json
[
  {
    "id": 1,
    "seriesId": 5,
    "seriesTitle": "My Manga Series",
    "chapterNumber": 1,
    "title": "Chapter 1: The Beginning",
    "status": "READY_FOR_EDITOR_REVIEW",
    "pageCount": 20,
    "createdAt": "2026-05-31T11:00:00Z"
  }
]
```

**Notes:** Editor sees chapters from assigned series only. Filtered to READY_FOR_EDITOR_REVIEW status.

---

#### GET /api/chapters/:id/pages

**Roles:** TANTOU_EDITOR

**Path params:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| id | number | yes | Chapter ID |

**Response (200):**

```json
[
  {
    "id": 101,
    "pageNumber": 1,
    "status": "COMPLETED",
    "currentVersion": 2,
    "imageUrl": "/uploads/uuid-1.png"
  },
  {
    "id": 102,
    "pageNumber": 2,
    "status": "REVIEWING",
    "currentVersion": 1,
    "imageUrl": "/uploads/uuid-2.png"
  }
]
```

**Notes:** Editor views all pages in chapter. Series ownership of chapter verified.

---

#### PATCH /api/chapters/:id/editor-review

**Roles:** TANTOU_EDITOR

**Path params:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| id | number | yes | Chapter ID |

**Request body:**

```json
{
  "decision": "APPROVE",
  "feedback": "Great work! Small dialogue fix on page 5."
}
```

**Response (200):**

```json
{
  "id": 1,
  "status": "EDITOR_APPROVED",
  "feedback": "Great work! Small dialogue fix on page 5.",
  "reviewedAt": "2026-05-31T11:30:00Z",
  "updatedAt": "2026-05-31T11:30:00Z"
}
```

**Notes:** decision=APPROVE → status=EDITOR_APPROVED (advances to PUBLISHED). decision=REVISE → status=IN_PROGRESS (mangaka revises, resubmits). Mangaka receives notification. Feedback stored.

---

## Pages

Mangaka uploads page images per chapter. Versions tracked for audit.

#### POST /api/pages

**Roles:** MANGAKA

**Request body:**

```json
{
  "chapterId": 1,
  "imageUrl": "/uploads/uuid-1.png",
  "uploadNote": "High-res scanned original"
}
```

**Response (201):**

```json
{
  "id": 101,
  "chapterId": 1,
  "pageNumber": 1,
  "status": "RAW",
  "currentVersion": 1,
  "imageUrl": "/uploads/uuid-1.png",
  "createdAt": "2026-05-31T11:45:00Z",
  "updatedAt": "2026-05-31T11:45:00Z"
}
```

**Notes:** pageNumber auto-incremented per chapter. Page_Version row created. Ownership verified.

---

#### GET /api/pages?chapterId=

**Roles:** MANGAKA

**Query params:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| chapterId | number | yes | Chapter ID |

**Response (200):**

```json
[
  {
    "id": 101,
    "chapterId": 1,
    "pageNumber": 1,
    "status": "RAW",
    "currentVersion": 1,
    "imageUrl": "/uploads/uuid-1.png",
    "createdAt": "2026-05-31T11:45:00Z"
  }
]
```

**Notes:** Ownership enforced.

---

#### GET /api/pages/:id

**Roles:** MANGAKA

**Path params:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| id | number | yes | Page ID |

**Response (200):**

```json
{
  "id": 101,
  "chapterId": 1,
  "pageNumber": 1,
  "status": "RAW",
  "currentVersion": 1,
  "imageUrl": "/uploads/uuid-1.png",
  "versions": [
    {
      "versionNumber": 1,
      "imageUrl": "/uploads/uuid-1.png",
      "uploadedByUserId": 1,
      "uploadNote": "High-res scanned original",
      "createdAt": "2026-05-31T11:45:00Z"
    }
  ],
  "createdAt": "2026-05-31T11:45:00Z"
}
```

**Notes:** Includes version history. Ownership verified.

---

## Regions

Mangaka defines regions (panels, bubbles, backgrounds) on pages for task assignment and AI region detection.

#### POST /api/regions

**Roles:** MANGAKA

**Request body:**

```json
{
  "pageId": 101,
  "regionType": "DIALOGUE_BUBBLE",
  "x": 150.5,
  "y": 200.0,
  "width": 100.0,
  "height": 75.5
}
```

**Response (201):**

```json
{
  "id": 1001,
  "pageId": 101,
  "regionType": "DIALOGUE_BUBBLE",
  "x": 150.5,
  "y": 200.0,
  "width": 100.0,
  "height": 75.5,
  "zIndex": 0,
  "aiSuggested": false,
  "createdAt": "2026-05-31T12:00:00Z"
}
```

**Notes:** regionType enum: PANEL, BACKGROUND, CHARACTER, DIALOGUE_BUBBLE, EFFECT. Coordinates are floats (pixel/percentage). Ownership verified.

---

#### GET /api/regions?pageId=

**Roles:** MANGAKA

**Query params:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| pageId | number | yes | Page ID |

**Response (200):**

```json
[
  {
    "id": 1001,
    "pageId": 101,
    "regionType": "DIALOGUE_BUBBLE",
    "x": 150.5,
    "y": 200.0,
    "width": 100.0,
    "height": 75.5,
    "zIndex": 0,
    "aiSuggested": false,
    "createdAt": "2026-05-31T12:00:00Z"
  }
]
```

**Notes:** Ownership enforced.

---

#### DELETE /api/regions/:id

**Roles:** MANGAKA

**Path params:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| id | number | yes | Region ID |

**Request body:** None

**Response (200):**

```json
{
  "ok": true
}
```

**Notes:** Soft or hard delete depending on cascade rules. Ownership verified. Associated tasks are updated.

---

## Tasks

Mangaka creates tasks for Assistants by assigning regions. Payment auto-calculated from Task_Price_Rule by region type.

#### POST /api/tasks

**Roles:** MANGAKA

**Request body:**

```json
{
  "regionId": 1001,
  "assigneeUserId": 3,
  "description": "Add dialogue to bubble",
  "instruction": "Use Arial 12pt, white text with black outline",
  "deadline": "2026-06-07"
}
```

**Response (201):**

```json
{
  "id": 2001,
  "regionId": 1001,
  "pageId": 101,
  "assignorUserId": 1,
  "assigneeUserId": 3,
  "description": "Add dialogue to bubble",
  "instruction": "Use Arial 12pt, white text with black outline",
  "deadline": "2026-06-07",
  "status": "ASSIGNED",
  "paymentAmount": 5000,
  "taskPriceRuleId": 10,
  "createdAt": "2026-05-31T12:15:00Z"
}
```

**Notes:** paymentAmount auto-set from Task_Price_Rule matching region_type (DIALOGUE_BUBBLE → 5000, etc.). State = ASSIGNED. Assistant receives notification of assignment. Ownership/authorization verified.

---

#### GET /api/tasks/mine

**Roles:** ASSISTANT

**Request body:** None

**Response (200):**

```json
[
  {
    "id": 2001,
    "regionId": 1001,
    "pageId": 101,
    "seriesTitle": "My Manga Series",
    "chapterNumber": 1,
    "description": "Add dialogue to bubble",
    "instruction": "Use Arial 12pt, white text with black outline",
    "deadline": "2026-06-07",
    "status": "ASSIGNED",
    "paymentAmount": 5000,
    "assignorName": "Taro Mangaka",
    "createdAt": "2026-05-31T12:15:00Z"
  }
]
```

**Notes:** Assistant's assigned work. Includes payment and deadline info. Ordered by assignment date.

---

#### GET /api/tasks?pageId=

**Roles:** MANGAKA

**Query params:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| pageId | number | yes | Page ID |

**Response (200):**

```json
[
  {
    "id": 2001,
    "regionId": 1001,
    "status": "ASSIGNED",
    "assigneeName": "Yamada Helper",
    "paymentAmount": 5000,
    "deadline": "2026-06-07"
  }
]
```

**Notes:** Mangaka views tasks on own page. Shows assignment status and payment.

---

#### PATCH /api/tasks/:id/start

**Roles:** ASSISTANT

**Path params:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| id | number | yes | Task ID |

**Request body:** None

**Response (200):**

```json
{
  "id": 2001,
  "status": "IN_PROGRESS",
  "updatedAt": "2026-05-31T12:30:00Z"
}
```

**Notes:** Transitions ASSIGNED → IN_PROGRESS. Assignee check enforced.

---

## Submissions

Assistants submit completed work. Mangaka reviews and approves or requests revisions. Approval triggers earnings accrual.

#### POST /api/submissions

**Roles:** ASSISTANT

**Request body:**

```json
{
  "taskId": 2001,
  "fileUrl": "/uploads/uuid-submission.png",
  "versionNote": "Added white outline as instructed"
}
```

**Response (201):**

```json
{
  "id": 3001,
  "taskId": 2001,
  "pageId": 101,
  "assistantUserId": 3,
  "versionNumber": 1,
  "fileUrl": "/uploads/uuid-submission.png",
  "versionNote": "Added white outline as instructed",
  "status": "PENDING",
  "feedback": null,
  "submittedAt": "2026-05-31T13:00:00Z",
  "createdAt": "2026-05-31T13:00:00Z"
}
```

**Notes:** Task state transitions to SUBMITTED. Assignee verification enforced. versionNumber auto-incremented per task. Mangaka receives notification.

---

#### GET /api/submissions/review-queue

**Roles:** MANGAKA

**Request body:** None

**Response (200):**

```json
[
  {
    "id": 3001,
    "taskId": 2001,
    "pageNumber": 1,
    "seriesTitle": "My Manga Series",
    "assistantName": "Yamada Helper",
    "status": "PENDING",
    "submittedAt": "2026-05-31T13:00:00Z",
    "fileUrl": "/uploads/uuid-submission.png"
  }
]
```

**Notes:** Mangaka reviews submissions on own series. Pending and under-review only.

---

#### PATCH /api/submissions/:id/review

**Roles:** MANGAKA

**Path params:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| id | number | yes | Submission ID |

**Request body:**

```json
{
  "decision": "APPROVED",
  "feedback": "Perfect! Ready to publish."
}
```

**Response (200):**

```json
{
  "id": 3001,
  "taskId": 2001,
  "status": "APPROVED",
  "feedback": "Perfect! Ready to publish.",
  "reviewedByUserId": 1,
  "reviewedAt": "2026-05-31T13:15:00Z"
}
```

**Notes:** APPROVED → Task state = APPROVED; Assistant_Profile.total_earnings += Task.payment_amount. REVISION_REQUIRED → Task state = REVISION_REQUIRED (Assistant can resubmit). Ownership verified. Assistant receives notification.

---

## Annotations

Editorial feedback on pages, manuscripts, or submissions. Polymorphic storage with resolution tracking.

#### POST /api/annotations

**Roles:** TANTOU_EDITOR

**Request body:**

```json
{
  "targetType": "SUBMISSION",
  "targetId": 3001,
  "category": "DIALOGUE_ISSUE",
  "context": "This line is cut off at the edge.",
  "x": 145.5,
  "y": 210.0
}
```

**Response (201):**

```json
{
  "id": 4001,
  "targetType": "SUBMISSION",
  "targetId": 3001,
  "createdByUserId": 2,
  "category": "DIALOGUE_ISSUE",
  "context": "This line is cut off at the edge.",
  "x": 145.5,
  "y": 210.0,
  "isResolved": false,
  "createdAt": "2026-05-31T13:30:00Z"
}
```

**Notes:** targetType enum: PAGE, MANUSCRIPT, SUBMISSION. category enum: CONTENT_ISSUE, DIALOGUE_ISSUE, SCRIPT_ISSUE, VISUAL_ISSUE, GENERAL. Coordinates optional for spatial context.

---

#### GET /api/annotations?targetType=&targetId=

**Roles:** TANTOU_EDITOR, MANGAKA

**Query params:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| targetType | string | yes | Target type: PAGE, MANUSCRIPT, SUBMISSION |
| targetId | number | yes | Target entity ID |

**Response (200):**

```json
[
  {
    "id": 4001,
    "targetType": "SUBMISSION",
    "targetId": 3001,
    "createdByUserId": 2,
    "createdByName": "Editor Hanako",
    "category": "DIALOGUE_ISSUE",
    "context": "This line is cut off at the edge.",
    "x": 145.5,
    "y": 210.0,
    "isResolved": false,
    "createdAt": "2026-05-31T13:30:00Z"
  }
]
```

**Notes:** Filtered to unresolved (isResolved = false). Creator name included.

---

#### PATCH /api/annotations/:id/resolve

**Roles:** TANTOU_EDITOR

**Path params:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| id | number | yes | Annotation ID |

**Request body:** None

**Response (200):**

```json
{
  "id": 4001,
  "isResolved": true,
  "resolvedAt": "2026-05-31T13:45:00Z"
}
```

**Notes:** Marks annotation as resolved. Editor can close their own feedback.

---

## Rankings

Editorial Board opens voting periods, casts votes, closes periods to compute rankings and detect at-risk series.

#### POST /api/vote-periods

**Roles:** EDITORIAL_BOARD, ADMIN

**Request body:**

```json
{
  "seriesId": 5,
  "periodType": "WEEKLY",
  "startDate": "2026-06-01",
  "endDate": "2026-06-07"
}
```

**Response (201):**

```json
{
  "id": 101,
  "seriesId": 5,
  "rankingPeriodType": "WEEKLY",
  "periodStartDate": "2026-06-01",
  "periodEndDate": "2026-06-07",
  "status": "OPEN",
  "createdAt": "2026-05-31T14:00:00Z"
}
```

**Notes:** One period per series per period_type per start_date (unique constraint). Status = OPEN for voting. Creator logged.

---

#### GET /api/vote-periods/open

**Roles:** EDITORIAL_BOARD

**Request body:** None

**Response (200):**

```json
[
  {
    "id": 101,
    "seriesId": 5,
    "seriesTitle": "My Manga Series",
    "rankingPeriodType": "WEEKLY",
    "periodStartDate": "2026-06-01",
    "periodEndDate": "2026-06-07",
    "status": "OPEN",
    "createdAt": "2026-05-31T14:00:00Z"
  }
]
```

**Notes:** Board member's current voting assignments. Only OPEN periods.

---

#### POST /api/votes

**Roles:** EDITORIAL_BOARD

**Request body:**

```json
{
  "votePeriodId": 101,
  "score": 4.5,
  "comment": "Strong artwork this week"
}
```

**Response (201):**

```json
{
  "id": 201,
  "votePeriodId": 101,
  "boardUserId": 2,
  "score": 4.5,
  "comment": "Strong artwork this week",
  "votedAt": "2026-05-31T14:15:00Z"
}
```

**Notes:** One vote per board member per period (unique constraint). score range 1–5 (decimals allowed). Replaces previous vote if exists. Comment optional.

---

#### POST /api/vote-periods/:id/close

**Roles:** EDITORIAL_BOARD, ADMIN

**Path params:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| id | number | yes | Vote Period ID |

**Request body:** None

**Response (200):**

```json
{
  "id": 101,
  "status": "CLOSED",
  "rankings": [
    {
      "id": 501,
      "seriesId": 5,
      "rankPosition": 1,
      "totalScore": 18.5,
      "riskLevel": "LOW",
      "calculatedAt": "2026-05-31T14:30:00Z"
    }
  ],
  "updatedAt": "2026-05-31T14:30:00Z"
}
```

**Notes:** Computes Ranking rows: rank_position (order by total_score DESC), total_score (sum of votes), risk_level (HIGH if avg < threshold, LOW/MEDIUM otherwise). If risk_level = HIGH, Series.series_status → AT_RISK + notification sent.

---

#### GET /api/rankings?...

**Roles:** EDITORIAL_BOARD, ADMIN, MANGAKA

**Query params:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| seriesId | number | no | Filter by series |
| periodType | string | no | Filter by period type (WEEKLY, MONTHLY) |

**Response (200):**

```json
[
  {
    "id": 501,
    "seriesId": 5,
    "seriesTitle": "My Manga Series",
    "votePeriodId": 101,
    "rankPosition": 1,
    "totalScore": 18.5,
    "riskLevel": "LOW",
    "periodStartDate": "2026-06-01",
    "periodEndDate": "2026-06-07",
    "calculatedAt": "2026-05-31T14:30:00Z"
  }
]
```

**Notes:** Leaderboard. Ordered by rank_position. Includes period info and series title.

---

## Decisions

Editorial Board applies post-voting decisions to series: continue, cancel, change frequency, or hiatus. Notifies Mangaka.

#### POST /api/decisions

**Roles:** EDITORIAL_BOARD

**Request body:**

```json
{
  "seriesId": 5,
  "decisionType": "CONTINUE",
  "reason": "Strong reader feedback, maintain weekly schedule"
}
```

**Response (201):**

```json
{
  "id": 601,
  "seriesId": 5,
  "decisionType": "CONTINUE",
  "newFrequency": null,
  "reason": "Strong reader feedback, maintain weekly schedule",
  "decidedByUserId": 2,
  "decidedAt": "2026-05-31T14:45:00Z"
}
```

**Notes:** decisionType enum: CONTINUE, CANCEL, CHANGE_FREQUENCY, HIATUS. newFrequency required for CHANGE_FREQUENCY. Series.series_status updated: CONTINUE → ACTIVE, CANCEL → CANCELLED, HIATUS → HIATUS. Mangaka receives notification.

---

#### GET /api/decisions?seriesId=

**Roles:** EDITORIAL_BOARD, ADMIN, MANGAKA

**Query params:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| seriesId | number | yes | Series ID |

**Response (200):**

```json
[
  {
    "id": 601,
    "seriesId": 5,
    "decisionType": "CONTINUE",
    "newFrequency": null,
    "reason": "Strong reader feedback, maintain weekly schedule",
    "decidedByUserId": 2,
    "decidedByName": "Board Chair",
    "decidedAt": "2026-05-31T14:45:00Z"
  }
]
```

**Notes:** Decision history per series. Ordered by date descending.

---

## Earnings

Assistants view their accumulated earnings from approved submissions.

#### GET /api/earnings/mine

**Roles:** ASSISTANT

**Request body:** None

**Response (200):**

```json
{
  "total": 15000,
  "tasks": [
    {
      "id": 2001,
      "description": "Add dialogue to bubble",
      "paymentAmount": 5000,
      "earnedAt": "2026-05-31T13:15:00Z",
      "hasDispute": false,
      "series": "My Manga Series",
      "chapter": 1
    },
    {
      "id": 2002,
      "description": "Background inking",
      "paymentAmount": 10000,
      "earnedAt": "2026-05-31T13:30:00Z",
      "hasDispute": false,
      "series": "My Manga Series",
      "chapter": 1
    }
  ]
}
```

**Notes:** total = sum of Assistant_Profile.total_earnings (accrued on submission approval). tasks = all approved submissions, including dispute status. Dispute adjustment amounts reflected in payment_amount (delta applied when resolving).

---

## Disputes

Assistants can dispute approved earnings. Admins review and resolve.

#### POST /api/disputes

**Roles:** ASSISTANT

**Request body:**

```json
{
  "taskId": 2001,
  "reason": "Work was significantly more complex than quoted",
  "expectedAmount": 7500
}
```

**Response (201):**

```json
{
  "id": 701,
  "assistantUserId": 3,
  "taskId": 2001,
  "reason": "Work was significantly more complex than quoted",
  "expectedAmount": 7500,
  "currentAmount": 5000,
  "status": "OPEN",
  "createdAt": "2026-05-31T15:00:00Z"
}
```

**Notes:** Task must be APPROVED. Status = OPEN. Admin receives notification.

---

#### GET /api/disputes/mine

**Roles:** ASSISTANT

**Request body:** None

**Response (200):**

```json
[
  {
    "id": 701,
    "taskId": 2001,
    "reason": "Work was significantly more complex than quoted",
    "expectedAmount": 7500,
    "currentAmount": 5000,
    "status": "OPEN",
    "resolutionNote": null,
    "createdAt": "2026-05-31T15:00:00Z"
  }
]
```

**Notes:** Assistant's open and resolved disputes.

---

#### GET /api/disputes

**Roles:** ADMIN

**Request body:** None

**Response (200):**

```json
[
  {
    "id": 701,
    "assistantUserId": 3,
    "assistantName": "Yamada Helper",
    "taskId": 2001,
    "seriesTitle": "My Manga Series",
    "reason": "Work was significantly more complex than quoted",
    "expectedAmount": 7500,
    "currentAmount": 5000,
    "status": "OPEN",
    "createdAt": "2026-05-31T15:00:00Z"
  }
]
```

**Notes:** Admin oversight of all disputes. Includes assistant and series context.

---

#### PATCH /api/disputes/:id/review

**Roles:** ADMIN

**Path params:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| id | number | yes | Dispute ID |

**Request body:** None

**Response (200):**

```json
{
  "id": 701,
  "status": "UNDER_REVIEW",
  "reviewedByUserId": 4,
  "updatedAt": "2026-05-31T15:10:00Z"
}
```

**Notes:** Transitions OPEN → UNDER_REVIEW. Admin claim-to-review.

---

#### PATCH /api/disputes/:id/resolve

**Roles:** ADMIN

**Path params:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| id | number | yes | Dispute ID |

**Request body:**

```json
{
  "status": "RESOLVED",
  "resolutionNote": "Approved partial adjustment based on submission analysis",
  "adjustedAmount": 6000
}
```

**Response (200):**

```json
{
  "id": 701,
  "taskId": 2001,
  "status": "RESOLVED",
  "resolutionNote": "Approved partial adjustment based on submission analysis",
  "currentAmount": 5000,
  "adjustedAmount": 6000,
  "amountDelta": 1000,
  "resolvedByUserId": 4,
  "resolvedAt": "2026-05-31T15:20:00Z"
}
```

**Notes:** status = RESOLVED or REJECTED. If adjustedAmount provided: delta = adjustedAmount - currentAmount; Task.payment_amount += delta; Assistant_Profile.total_earnings += delta. Assistant receives notification of outcome.

---

## Notifications

All authenticated users receive notifications on key events.

#### GET /api/notifications

**Roles:** Any authenticated user

**Request body:** None

**Response (200):**

```json
[
  {
    "id": 801,
    "notificationType": "TASK_ASSIGNMENT",
    "title": "New task assigned",
    "content": "You have been assigned a new task: Add dialogue to bubble",
    "relatedEntityType": "TASK",
    "relatedEntityId": 2001,
    "isRead": false,
    "createdAt": "2026-05-31T12:15:00Z"
  },
  {
    "id": 802,
    "notificationType": "SUBMISSION",
    "title": "Submission received",
    "content": "Yamada Helper submitted work on task 2001",
    "relatedEntityType": "SUBMISSION",
    "relatedEntityId": 3001,
    "isRead": false,
    "createdAt": "2026-05-31T13:00:00Z"
  }
]
```

**Notes:** Unread first. notificationType enum: DEADLINE, TASK_ASSIGNMENT, SUBMISSION, REVISION, REVIEW, PROPOSAL_DECISION, RISK_ALERT, DECISION, DISPUTE, GENERAL.

---

#### PATCH /api/notifications/read-all

**Roles:** Any authenticated user

**Request body:** None

**Response (200):**

```json
{
  "ok": true
}
```

**Notes:** Marks all user notifications as read.

---

#### PATCH /api/notifications/:id/read

**Roles:** Any authenticated user

**Path params:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| id | number | yes | Notification ID |

**Request body:** None

**Response (200):**

```json
{
  "ok": true
}
```

**Notes:** Marks single notification as read. Ownership verified.

---

## Dashboard

Role-aware summary endpoints for quick overview.

#### GET /api/dashboard/summary

**Roles:** Any authenticated user

**Request body:** None

**Response (200):**

```json
{
  "role": "MANGAKA",
  "activeSeries": 3,
  "pendingSubmissions": 2,
  "upcomingDeadlines": 4,
  "unreadNotifications": 5,
  "summary": "You have 3 active series with 2 pending submissions and 4 deadlines this week"
}
```

**Notes:** Summarizes key metrics for user's role. Mangaka sees series/submissions/deadlines; Assistant sees earnings/task status; etc.

---

#### GET /api/dashboard/series

**Roles:** MANGAKA

**Request body:** None

**Response (200):**

```json
[
  {
    "id": 5,
    "title": "My Manga Series",
    "status": "ACTIVE",
    "chapters": 3,
    "pages": 45,
    "editor": "Editor Hanako",
    "lastActivity": "2026-05-31T11:30:00Z"
  }
]
```

**Notes:** Mangaka's series with chapter/page counts and editor info.

---

#### GET /api/dashboard/tasks

**Roles:** MANGAKA

**Request body:** None

**Response (200):**

```json
[
  {
    "id": 2001,
    "description": "Add dialogue to bubble",
    "assignee": "Yamada Helper",
    "status": "IN_PROGRESS",
    "deadline": "2026-06-07",
    "payment": 5000
  }
]
```

**Notes:** Mangaka's open task assignments. Grouped by status.

---

#### GET /api/dashboard/submissions

**Roles:** MANGAKA

**Request body:** None

**Response (200):**

```json
[
  {
    "id": 3001,
    "taskId": 2001,
    "assistant": "Yamada Helper",
    "status": "PENDING",
    "submittedAt": "2026-05-31T13:00:00Z"
  }
]
```

**Notes:** Pending and under-review submissions awaiting Mangaka action.

---

#### GET /api/dashboard/notifications

**Roles:** Any authenticated user

**Request body:** None

**Response (200):**

```json
{
  "unread": 5,
  "recent": [
    {
      "id": 802,
      "type": "SUBMISSION",
      "title": "Submission received",
      "createdAt": "2026-05-31T13:00:00Z"
    }
  ]
}
```

**Notes:** Count of unread notifications + recent 3–5. Quick summary for header/bell icon.

---

## Admin

Admin-only tools for user management and system overview.

#### POST /api/admin/users

**Roles:** ADMIN

**Request body:**

````json
{
  "email": "assistant@studio.local",
  "password": "TemporaryPassword123@",
  "fullName": "Internal Assistant",
  "role": "ASSISTANT"
}

#### GET /api/admin/users

**Roles:** ADMIN

**Request body:** None

**Response (200):**
```json
[
  {
    "id": 1,
    "email": "mangaka@studio.local",
    "fullName": "Taro Mangaka",
    "role": "MANGAKA",
    "isActivated": true,
    "authProvider": "LOCAL",
    "createdAt": "2026-05-15T10:00:00Z"
  },
  {
    "id": 3,
    "email": "assistant@studio.local",
    "fullName": "Yamada Helper",
    "role": "ASSISTANT",
    "isActivated": false,
    "authProvider": "GOOGLE",
    "createdAt": "2026-05-20T14:30:00Z"
  }
]
````

**Notes:** All users in system. isActivated = false blocks login (except GOOGLE auth auto-activates). Ordered by creation date.

---

#### GET /api/admin/overview

**Roles:** ADMIN

**Request body:** None

**Response (200):**

```json
{
  "totalUsers": 12,
  "usersByRole": {
    "MANGAKA": 2,
    "ASSISTANT": 5,
    "TANTOU_EDITOR": 3,
    "EDITORIAL_BOARD": 2,
    "ADMIN": 1
  },
  "totalSeries": 5,
  "seriesByStatus": {
    "ACTIVE": 3,
    "AT_RISK": 1,
    "HIATUS": 1
  },
  "pendingProposals": 2,
  "openDisputes": 1
}
```

**Notes:** System health snapshot.

---

#### PATCH /api/admin/users/:id

**Roles:** ADMIN

**Path params:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| id | number | yes | User ID |

**Request body:**

```json
{
  "isActivated": true,
  "role": "TANTOU_EDITOR"
}
```

**Response (200):**

```json
{
  "id": 3,
  "email": "assistant@studio.local",
  "fullName": "Yamada Helper",
  "role": "TANTOU_EDITOR",
  "isActivated": true,
  "updatedAt": "2026-05-31T15:30:00Z"
}
```

**Notes:** Activate/deactivate users. Change role. Last-admin guard: cannot deactivate last ADMIN.

---

## Users

User profile management and staff roster endpoints.

#### GET /api/users/me

**Roles:** Any authenticated user

**Request body:** None

**Response (200):**

```json
{
  "id": 1,
  "email": "mangaka@studio.local",
  "fullName": "Taro Mangaka",
  "avatarUrl": "https://lh3.googleusercontent.com/...",
  "role": "MANGAKA"
}
```

**Notes:** Returns current authenticated user's profile. Includes full name and avatar URL.

---

#### PATCH /api/users/me

**Roles:** Any authenticated user

**Request body:**

```json
{
  "fullName": "Taro Mangaka Updated",
  "avatarUrl": "https://new-avatar-url.com/avatar.png"
}
```

**Request validation:**

- `fullName`: optional, max 120 characters
- `avatarUrl`: optional, max 500 characters

**Response (200):**

```json
{
  "id": 1,
  "email": "mangaka@studio.local",
  "fullName": "Taro Mangaka Updated",
  "avatarUrl": "https://new-avatar-url.com/avatar.png",
  "role": "MANGAKA"
}
```

**Notes:** Updates user profile. Email and role cannot be changed via this endpoint. Both fields optional; omitted fields remain unchanged.

---

#### GET /api/users/assistants

**Roles:** MANGAKA

**Request body:** None

**Response (200):**

```json
[
  {
    "id": 3,
    "name": "Yamada Helper",
    "avatar": "https://lh3.googleusercontent.com/..."
  },
  {
    "id": 4,
    "name": "Sato Assist",
    "avatar": null
  }
]
```

**Notes:** Active assistants only. Ordered by name. Used for task assignment dropdowns.

---

#### GET /api/users/editors

**Roles:** EDITORIAL_BOARD

**Request body:** None

**Response (200):**

```json
[
  {
    "id": 2,
    "name": "Editor Hanako",
    "avatar": "https://..."
  }
]
```

**Notes:** Active Tantou editors. Used for series editor assignment.

---

## Genres

Available manga genres for proposal/series tagging.

#### GET /api/genres

**Roles:** Any authenticated user

**Request body:** None

**Response (200):**

```json
[
  {
    "id": 1,
    "name": "Action"
  },
  {
    "id": 2,
    "name": "Comedy"
  },
  {
    "id": 3,
    "name": "Slice of Life"
  }
]
```

**Notes:** Static list. Ordered by ID or name. Used for proposal/series genre selection.

---

## Uploads

File upload to SeaweedFS S3-compatible storage. Public read via `GET /uploads/:key`.

#### POST /api/uploads

**Roles:** Any authenticated user

**Request body:** multipart/form-data

```
file: <binary file, max 30MB>
```

**Response (201):**

```json
{
  "url": "/uploads/550e8400-e29b-41d4-a716-446655440000.png",
  "originalName": "page-01.png"
}
```

**Notes:**

- File uploaded to SeaweedFS S3 storage with UUID filename + original extension
- 30MB file size cap enforced by multer
- Returns stable `/uploads/<key>` URL for retrieval
- Requires JWT authentication

---

#### GET /uploads/:key

**Roles:** Public (no authentication required)

**Path params:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| key | string | yes | File key (UUID + extension, e.g., `550e8400-e29b-41d4-a716-446655440000.png`) |

**Response (200):**
Binary file content with appropriate `Content-Type` and `Cache-Control: public, max-age=86400` headers.

**Response (404):**

```
Not found
```

**Response (400):**

```
Invalid key
```

**Notes:**

- Public endpoint served from main.ts express route (not a controller endpoint)
- Key validated with regex `^[A-Za-z0-9._-]+$` to prevent path traversal attacks
- Falls back to legacy on-disk storage at `./uploads/:key` if S3 fetch fails
- Suitable for `<img src="/uploads/...">` embedding in web pages (no auth required)
- Cache-Control header allows browser caching of images for 24 hours

---

## Studio

In-browser drawing app persistence. Pages are documents with layers, history, viewport state.

#### POST /api/studio/page-versions

**Roles:** MANGAKA

**Request body:**

```json
{
  "pageId": 101,
  "imageUrl": "/uploads/uuid-canvas-export.png",
  "note": "v2: Fixed perspective, added screentone"
}
```

**Response (201):**

```json
{
  "id": 1,
  "pageId": 101,
  "versionNumber": 2,
  "imageUrl": "/uploads/uuid-canvas-export.png",
  "uploadedByUserId": 1,
  "uploadNote": "v2: Fixed perspective, added screentone",
  "createdAt": "2026-05-31T16:00:00Z"
}
```

**Notes:** Creates Page_Version record. Increments version number. Ownership verified.

---

#### POST /api/studio/docs

**Roles:** MANGAKA

**Request body:**

```json
{
  "pageId": 101,
  "manifest": {
    "layers": [...],
    "viewport": {...},
    "history": [...]
  }
}
```

**Response (201):**

```json
{
  "id": 1,
  "pageId": 101,
  "manifest": {
    "layers": [...],
    "viewport": {...},
    "history": [...]
  },
  "savedAt": "2026-05-31T16:00:00Z"
}
```

**Notes:** Persists studio document manifest (layers, undo/redo history, view state). Ownership verified.

---

#### GET /api/studio/docs/:pageId

**Roles:** MANGAKA

**Path params:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| pageId | number | yes | Page ID |

**Response (200):**

```json
{
  "id": 1,
  "pageId": 101,
  "manifest": {
    "layers": [...],
    "viewport": {...},
    "history": [...]
  },
  "savedAt": "2026-05-31T16:00:00Z"
}
```

**Notes:** Retrieves latest saved manifest for page. Ownership verified.

---

## Health

Root endpoint for app health check.

#### GET /api

**Roles:** Public (no auth required)

**Request body:** None

**Response (200):**

```
Hello from the API
```

**Notes:** Plain text. Used for deployment health checks and API availability probing.

---

## Endpoint Index

| Method | Path                                     | Roles                           | Purpose                                                                                    |
| ------ | ---------------------------------------- | ------------------------------- | ------------------------------------------------------------------------------------------ |
| POST   | `/api/auth/login`                        | Public                          | Email+password login → JWT (rate-limited 20/min per IP)                                    |
| GET    | `/api/auth/me`                           | Any auth                        | Current user from JWT                                                                      |
| POST   | `/api/auth/logout`                       | Any auth                        | Client-side token drop                                                                     |
| PATCH  | `/api/auth/password`                     | Any auth                        | Change password (LOCAL auth only)                                                          |
| GET    | `/api/auth/google`                       | Public                          | Start Google OAuth flow                                                                    |
| GET    | `/api/auth/google/callback`              | Public                          | OAuth redirect → token                                                                     |
| POST   | `/api/proposals`                         | MANGAKA                         | Create proposal (DRAFT)                                                                    |
| GET    | `/api/proposals/mine`                    | MANGAKA                         | List own proposals                                                                         |
| PATCH  | `/api/proposals/:id/submit`              | MANGAKA                         | Submit for review (DRAFT→SUBMITTED)                                                        |
| GET    | `/api/proposals/review-queue`            | EDITORIAL_BOARD                 | Board review queue                                                                         |
| PATCH  | `/api/proposals/:id/decision`            | EDITORIAL_BOARD                 | Approve/reject proposal (auto-creates Series)                                              |
| GET    | `/api/series/all`                        | EDITORIAL_BOARD, ADMIN          | All series with editor info                                                                |
| GET    | `/api/series/mine`                       | MANGAKA                         | Own series list                                                                            |
| GET    | `/api/series/:id`                        | MANGAKA                         | Series details                                                                             |
| PUT    | `/api/series/:id/editor`                 | EDITORIAL_BOARD, ADMIN          | Assign Tantou editor                                                                       |
| DELETE | `/api/series/:id/editor`                 | EDITORIAL_BOARD, ADMIN          | Unassign editor                                                                            |
| POST   | `/api/chapters`                          | MANGAKA                         | Create chapter (DRAFT)                                                                     |
| GET    | `/api/chapters?seriesId=`                | MANGAKA                         | List chapters in series                                                                    |
| PATCH  | `/api/chapters/:id/status`               | MANGAKA                         | Lifecycle (PUBLISHED triggers Publication_Schedule)                                        |
| GET    | `/api/chapters/review-queue`             | TANTOU_EDITOR                   | Editor's assigned chapters ready for review                                                |
| GET    | `/api/chapters/:id/pages`                | TANTOU_EDITOR                   | View pages in chapter (editing)                                                            |
| PATCH  | `/api/chapters/:id/editor-review`        | TANTOU_EDITOR                   | Approve/revise chapter (notifies Mangaka)                                                  |
| POST   | `/api/pages`                             | MANGAKA                         | Upload page image (RAW status)                                                             |
| GET    | `/api/pages?chapterId=`                  | MANGAKA                         | List pages in chapter                                                                      |
| GET    | `/api/pages/:id`                         | MANGAKA                         | Page details + version history                                                             |
| POST   | `/api/regions`                           | MANGAKA                         | Define region (panel, bubble, etc.)                                                        |
| GET    | `/api/regions?pageId=`                   | MANGAKA                         | List regions on page                                                                       |
| DELETE | `/api/regions/:id`                       | MANGAKA                         | Delete region                                                                              |
| POST   | `/api/tasks`                             | MANGAKA                         | Create task for Assistant (auto-prices from Task_Price_Rule)                               |
| GET    | `/api/tasks/mine`                        | ASSISTANT                       | Assigned tasks                                                                             |
| GET    | `/api/tasks?pageId=`                     | MANGAKA                         | Tasks on page                                                                              |
| PATCH  | `/api/tasks/:id/start`                   | ASSISTANT                       | Start task (ASSIGNED→IN_PROGRESS)                                                          |
| POST   | `/api/submissions`                       | ASSISTANT                       | Submit work (task→SUBMITTED, notify Mangaka)                                               |
| GET    | `/api/submissions/review-queue`          | MANGAKA                         | Submissions awaiting review                                                                |
| PATCH  | `/api/submissions/:id/review`            | MANGAKA                         | Approve/revise (APPROVED accrues earnings, REVISION_REQUIRED loops)                        |
| POST   | `/api/annotations`                       | TANTOU_EDITOR                   | Create editorial feedback                                                                  |
| GET    | `/api/annotations?targetType=&targetId=` | TANTOU_EDITOR, MANGAKA          | Query annotations on entity                                                                |
| PATCH  | `/api/annotations/:id/resolve`           | TANTOU_EDITOR                   | Mark feedback resolved                                                                     |
| POST   | `/api/vote-periods`                      | EDITORIAL_BOARD, ADMIN          | Open voting period                                                                         |
| GET    | `/api/vote-periods/open`                 | EDITORIAL_BOARD                 | Current open periods                                                                       |
| POST   | `/api/votes`                             | EDITORIAL_BOARD                 | Cast score (1–5)                                                                           |
| POST   | `/api/vote-periods/:id/close`            | EDITORIAL_BOARD, ADMIN          | Close period → compute Ranking (detect AT_RISK)                                            |
| GET    | `/api/rankings`                          | EDITORIAL_BOARD, ADMIN, MANGAKA | Leaderboard                                                                                |
| POST   | `/api/decisions`                         | EDITORIAL_BOARD                 | Apply decision (CONTINUE/CANCEL/CHANGE_FREQUENCY/HIATUS, notifies Mangaka)                 |
| GET    | `/api/decisions?seriesId=`               | EDITORIAL_BOARD, ADMIN, MANGAKA | Decision history                                                                           |
| GET    | `/api/earnings/mine`                     | ASSISTANT                       | Total + approved task breakdown                                                            |
| POST   | `/api/disputes`                          | ASSISTANT                       | Open dispute on APPROVED task                                                              |
| GET    | `/api/disputes/mine`                     | ASSISTANT                       | Own disputes                                                                               |
| GET    | `/api/disputes`                          | ADMIN                           | All disputes                                                                               |
| PATCH  | `/api/disputes/:id/review`               | ADMIN                           | Mark under review (OPEN→UNDER_REVIEW)                                                      |
| PATCH  | `/api/disputes/:id/resolve`              | ADMIN                           | Resolve/reject (adjustedAmount updates Task.payment_amount + Assistant earnings, notifies) |
| GET    | `/api/notifications`                     | Any auth                        | User's notifications (unread first)                                                        |
| PATCH  | `/api/notifications/read-all`            | Any auth                        | Mark all as read                                                                           |
| PATCH  | `/api/notifications/:id/read`            | Any auth                        | Mark one as read                                                                           |
| GET    | `/api/dashboard/summary`                 | Any auth                        | Role-aware summary                                                                         |
| GET    | `/api/dashboard/series`                  | MANGAKA                         | Series with counts + editor                                                                |
| GET    | `/api/dashboard/tasks`                   | MANGAKA                         | Open task assignments                                                                      |
| GET    | `/api/dashboard/submissions`             | MANGAKA                         | Pending submissions                                                                        |
| GET    | `/api/dashboard/notifications`           | Any auth                        | Unread count + recent                                                                      |
| GET    | `/api/admin/users`                       | ADMIN                           | All users (with activation/role)                                                           |
| GET    | `/api/admin/overview`                    | ADMIN                           | System metrics                                                                             |
| PATCH  | `/api/admin/users/:id`                   | ADMIN                           | Activate/deactivate, change role (last-admin guard)                                        |
| GET    | `/api/users/me`                          | Any auth                        | Current user profile (fullName, avatarUrl, role, email)                                    |
| PATCH  | `/api/users/me`                          | Any auth                        | Update profile (fullName ≤120, avatarUrl ≤500)                                             |
| GET    | `/api/users/assistants`                  | MANGAKA                         | Active assistants for task assignment                                                      |
| GET    | `/api/users/editors`                     | EDITORIAL_BOARD                 | Active Tantou editors for assignment                                                       |
| GET    | `/api/genres`                            | Any auth                        | All genres                                                                                 |
| POST   | `/api/uploads`                           | Any auth                        | Upload file (multipart, 30MB max) to SeaweedFS S3 → {url, originalName}                    |
| GET    | `/uploads/:key`                          | Public                          | Retrieve uploaded file from S3 (path-traversal guarded, cache-friendly)                    |
| POST   | `/api/studio/page-versions`              | MANGAKA                         | Save canvas export as page version                                                         |
| POST   | `/api/studio/docs`                       | MANGAKA                         | Save studio manifest (layers, history, state)                                              |
| GET    | `/api/studio/docs/:pageId`               | MANGAKA                         | Load latest manifest                                                                       |
| GET    | `/api`                                   | Public                          | Health check                                                                               |

---

**Total endpoints documented:** 70

**Last updated:** 2026-06-05 (verified from controllers + DTOs, AllExceptionsFilter, main.ts)
