# Requirements & Use Cases

A comprehensive specification of functional, non-functional requirements, and detailed use cases for the Manga Creation Workflow & Publishing Management System—derived from the shipped REST API, database schema, and web routes (as of 2026-06-05).

**Table of Contents**
- [Actors](#actors)
- [Functional Requirements](#functional-requirements)
- [Non-Functional Requirements](#non-functional-requirements)
- [Use Cases](#use-cases)
- [Traceability](#traceability)

---

## Actors

The system serves six primary actors, each with distinct responsibilities:

| Actor | Role | Primary Goal | Scope |
|-------|------|--------------|-------|
| **Mangaka** | Content Creator | Author manga series, submit chapters, manage page workflow, review assistant submissions. | Creates/owns series, pages, tasks; reviews submissions & earnings. |
| **Assistant** | Production Worker | Work on assigned tasks (drawing, coloring, effects), submit work, track earnings & dispute payments. | Executes tasks, uploads submissions, views earnings & dispute history. |
| **Tantou Editor** | Series Editor | Review chapters for quality, provide editorial feedback via annotations, approve for publication. | Reviews chapters, creates annotations, approves/requests revision. |
| **Editorial Board** | Leadership | Review & approve proposals, assign editors to series, open voting periods, cast rankings, make editorial decisions. | Votes on series, manages editor assignment, decides series status (continue/cancel/hiatus/frequency change). |
| **Admin** | System Operator | Manage user accounts, activate/deactivate, enforce role constraints, resolve earning disputes with amount adjustments. | Activates users, enforces last-admin guard, resolves disputes. |
| **System** | Automation | Send notifications on state transitions, enforce task pricing by region type, accrue earnings on task approval, compute rankings. | Notifications, pricing accrual, earnings calculation, ranking computation. |

---

## Functional Requirements

Grouped by module, each requirement maps to an endpoint and/or web page. All endpoints are prefixed `/api` and JWT-guarded unless noted as public.

### FR-1: Authentication & Account Management

| ID | Requirement | Actor(s) | Realized by |
|----|-------------|----------|-------------|
| FR-AUTH-1 | Users shall log in with email+password locally or via Google OAuth. | Any | `POST /auth/login`, `GET /auth/google`, `GET /auth/google/callback` [public]; web: `/login` |
| FR-AUTH-2 | System shall issue a JWT token on successful authentication. | System | `POST /auth/login`, OAuth callback; token stored client-side |
| FR-AUTH-3 | Users shall view their own profile (email, name, avatar, role). | Any | `GET /auth/me`; web: profile dropdown in Header |
| FR-AUTH-4 | Users shall log out; client shall discard token. | Any | `POST /auth/logout` (informational); web: Logout button |
| FR-AUTH-5 | Admin shall activate newly registered users (initially inactive). | Admin | `PATCH /admin/users/:id` with activation flag; web: `/admin` Console |
| FR-AUTH-6 | Admin shall assign or change a user's role (MANGAKA/ASSISTANT/TANTOU_EDITOR/EDITORIAL_BOARD/ADMIN). | Admin | `PATCH /admin/users/:id` with role; web: `/admin` role picker |
| FR-AUTH-7 | System shall prevent role assignment if it would leave zero active admins. | System | Last-admin guard in `PATCH /admin/users/:id`; rejects edit if last admin |

### FR-2: Proposals (Mangaka → Board)

| ID | Requirement | Actor(s) | Realized by |
|----|-------------|----------|-------------|
| FR-PROP-1 | Mangaka shall create a proposal (title, synopsis, genres, frequency) in DRAFT state. | Mangaka | `POST /proposals`; web: form in `/proposals` |
| FR-PROP-2 | Mangaka shall view their own proposals across all statuses. | Mangaka | `GET /proposals/mine`; web: `/proposals` list |
| FR-PROP-3 | Mangaka shall submit a DRAFT proposal → SUBMITTED (triggers notification to board). | Mangaka | `PATCH /proposals/:id/submit`; web: "Submit" button in proposal detail |
| FR-PROP-4 | Board shall view all submitted & under-review proposals in review queue. | Editorial Board | `GET /proposals/review-queue`; web: `/board/proposals` queue |
| FR-PROP-5 | Board shall approve a SUBMITTED/UNDER_REVIEW proposal → APPROVED (auto-creates Series with same title, genres, frequency). | Editorial Board | `PATCH /proposals/:id/decision` with decision='APPROVED'; web: "Approve" button |
| FR-PROP-6 | Board shall reject a SUBMITTED/UNDER_REVIEW proposal → REJECTED (notifies mangaka). | Editorial Board | `PATCH /proposals/:id/decision` with decision='REJECTED'; web: "Reject" button |
| FR-PROP-7 | System shall track proposal lifecycle (submitted_at, created_at, updated_at) and transition state via canTransition map. | System | Transitions.ts: DRAFT→SUBMITTED→UNDER_REVIEW→[APPROVED or REJECTED]; final states terminal |

### FR-3: Series & Editor Assignment

| ID | Requirement | Actor(s) | Realized by |
|----|-------------|----------|-------------|
| FR-SER-1 | System shall auto-create a Series record when a proposal is APPROVED. | System | Service logic in proposal decision handler |
| FR-SER-2 | Mangaka shall view all their active/completed series. | Mangaka | `GET /series/mine`; web: `/series` list |
| FR-SER-3 | Board shall view all studio series (paginated). | Editorial Board | `GET /series/all`; web: `/board/series` list |
| FR-SER-4 | Any authenticated user shall retrieve a series detail (title, mangaka, frequency, status, editor). | Any | `GET /series/:id`; web: `/series/:id` detail page |
| FR-SER-5 | Board shall assign a Tantou Editor to a series → creates `Series_Tantou_Editor` with assigned_at; unassigned_at=NULL. | Editorial Board | `PUT /series/:id/editor` with editor_user_id; web: `/board/series` editor picker |
| FR-SER-6 | Board shall unassign an editor → sets unassigned_at; notifies editor. | Editorial Board | `DELETE /series/:id/editor`; web: "Remove" button in editor section |
| FR-SER-7 | System shall track series status lifecycle (ACTIVE, AT_RISK, HIATUS, CANCELLED, COMPLETED) via service state transitions. | System | Series status managed in decision service; AT_RISK set on ranking close if risk_level≥MEDIUM |
| FR-SER-8 | System shall maintain series publication frequency (WEEKLY or MONTHLY) from proposal; Board may change via Decision. | System | Series.publication_frequency; mutable via `POST /decisions` with CHANGE_FREQUENCY |

### FR-4: Chapters & Lifecycle

| ID | Requirement | Actor(s) | Realized by |
|----|-------------|----------|-------------|
| FR-CHP-1 | Mangaka shall create a chapter (series_id, chapter_number, title, deadline). | Mangaka | `POST /chapters`; web: form in `/series/:seriesId/chapters/new` |
| FR-CHP-2 | Mangaka shall view all chapters of a series. | Mangaka | `GET /chapters?seriesId=:seriesId`; web: chapter list in series detail |
| FR-CHP-3 | Mangaka shall transition chapter status via lifecycle: DRAFT → IN_PROGRESS → READY_FOR_EDITOR_REVIEW → (EDITOR_APPROVED or IN_PROGRESS) → PUBLISHED. | Mangaka | `PATCH /chapters/:id/status` with target state; web: status dropdown in ChapterWorkspace |
| FR-CHP-4 | On chapter PUBLISHED transition, system shall auto-create Publication_Schedule record with release_date & publish_status=SCHEDULED. | System | Service logic in chapter status update |
| FR-CHP-5 | Tantou Editor shall view all chapters of their assigned series in a review queue. | Tantou Editor | `GET /chapters/review-queue` (filters by editor's series); web: `/editor/review` list |
| FR-CHP-6 | Tantou Editor shall view all pages of a chapter. | Tantou Editor | `GET /chapters/:id/pages` (page list with version + status); web: ChapterReview detail |
| FR-CHP-7 | Tantou Editor shall review a chapter (READY_FOR_EDITOR_REVIEW → EDITOR_APPROVED or IN_PROGRESS with feedback). | Tantou Editor | `PATCH /chapters/:id/editor-review` with decision & optional feedback; web: "Approve" / "Request Changes" button |
| FR-CHP-8 | System shall prevent chapter status changes if chapter is_locked=true. | System | Validation in service; unneeded for basic flow but schema supports it |

### FR-5: Pages & Versioning

| ID | Requirement | Actor(s) | Realized by |
|----|-------------|----------|-------------|
| FR-PAGE-1 | Mangaka shall create a page in a chapter (page_number, chapter_id). | Mangaka | `POST /pages`; web: form in ChapterWorkspace |
| FR-PAGE-2 | Mangaka shall view all pages of a chapter (list with current_version, status). | Mangaka | `GET /pages?chapterId=:chapterId`; web: ChapterWorkspace page list |
| FR-PAGE-3 | System shall initialize page status to RAW on creation. | System | Service logic in `POST /pages` |
| FR-PAGE-4 | Page status lifecycle: RAW → ASSIGNED → IN_PROGRESS → REVIEWING → (COMPLETED or IN_PROGRESS). | System | Transitions.ts enforces; managed via page version creation or task transitions |
| FR-PAGE-5 | Mangaka shall upload a new page version (image_url, upload_note). | Mangaka | `POST /pages/:id/upload` (implied by studio POST `/api/studio/page-versions`); web: ChapterWorkspace upload / Studio export |
| FR-PAGE-6 | System shall track page_version history (version_number, uploaded_by, upload_note, created_at). | System | Page_Version table; incremented per upload |
| FR-PAGE-7 | System shall track current_version on Page record. | System | Page.current_version updated on Page_Version creation |

### FR-6: Regions & Task Pricing

| ID | Requirement | Actor(s) | Realized by |
|----|-------------|----------|-------------|
| FR-REG-1 | Mangaka shall create a region on a page version (region_type, x/y/width/height, z-index). | Mangaka | `POST /regions`; web: Studio region drawing tool |
| FR-REG-2 | Region types: PANEL, BACKGROUND, CHARACTER, DIALOGUE_BUBBLE, EFFECT. | System | Region.region_type ENUM; used for pricing |
| FR-REG-3 | Mangaka shall view all regions of a page. | Mangaka | `GET /regions?pageId=:pageId`; web: Studio region list |
| FR-REG-4 | Mangaka shall delete a region (region_id). | Mangaka | `DELETE /regions/:id`; web: Studio region delete button |
| FR-REG-5 | System shall mark region as AI-suggested (ai_suggested=true) if detected by region detection model. | System | AI heuristic or YOLO model sets flag in Studio service |
| FR-REG-6 | System shall auto-price a task by querying active Task_Price_Rule matching the region_type at task creation. | System | `POST /tasks` queries Task_Price_Rule; payment_amount = base_price (modified by business rules if any) |

### FR-7: Tasks & Assignment

| ID | Requirement | Actor(s) | Realized by |
|----|-------------|----------|-------------|
| FR-TASK-1 | Mangaka shall create a task for a region (region_id, page_id, assignee_user_id, description, deadline). | Mangaka | `POST /tasks`; web: Task creation form in ChapterWorkspace or region context menu |
| FR-TASK-2 | System shall auto-set task payment_amount from active Task_Price_Rule matching region.region_type at creation. | System | Service queries Task_Price_Rule; fails gracefully if no rule found |
| FR-TASK-3 | System shall create a task in ASSIGNED state. | System | Task.task_status=ASSIGNED on creation |
| FR-TASK-4 | System shall notify the assigned assistant immediately (TASK_ASSIGNMENT notification). | System | `NotificationsService.notify(assignee, TASK_ASSIGNMENT, ...)` on task creation |
| FR-TASK-5 | Assistant shall view all tasks assigned to them (current & past). | Assistant | `GET /tasks/mine`; web: `/my-tasks` list |
| FR-TASK-6 | Assistant shall transition task ASSIGNED → IN_PROGRESS when starting work. | Assistant | `PATCH /tasks/:id/start`; web: "Start" button in task detail |
| FR-TASK-7 | Task status lifecycle: ASSIGNED → IN_PROGRESS → SUBMITTED → (APPROVED or REVISION_REQUIRED); REVISION_REQUIRED → IN_PROGRESS or SUBMITTED. | System | Transitions.ts enforces; SUBMITTED state reached on submission creation |
| FR-TASK-8 | Mangaka shall view all tasks for a page. | Mangaka | `GET /tasks?pageId=:pageId`; web: ChapterWorkspace task list |

### FR-8: Submissions & Mangaka Review

| ID | Requirement | Actor(s) | Realized by |
|----|-------------|----------|-------------|
| FR-SUB-1 | Assistant shall submit work on a task (file_url, version_note, submission_status=PENDING). | Assistant | `POST /submissions`; web: Studio export → upload in region modal or `/my-tasks` detail |
| FR-SUB-2 | System shall update task status to SUBMITTED on first submission. | System | Task.task_status=SUBMITTED when Submission created |
| FR-SUB-3 | System shall track submission history (version_number, Submission records). | System | Submission.version_number per task; uniq(task_id, version_number) |
| FR-SUB-4 | Mangaka shall view all assistant submissions awaiting review for their series. | Mangaka | `GET /submissions/review-queue`; web: `/review` submission queue |
| FR-SUB-5 | Mangaka shall review a submission & decide: APPROVED or REVISION_REQUIRED (with optional feedback). | Mangaka | `PATCH /submissions/:id/review` with decision & feedback; web: "Approve" / "Request Changes" button |
| FR-SUB-6 | On submission APPROVED, system shall update Task.task_status=APPROVED & accrue earnings to Assistant_Profile.total_earnings += Task.payment_amount. | System | Service logic in review handler; earnings calculation |
| FR-SUB-7 | On submission REVISION_REQUIRED, system shall update Task.task_status=REVISION_REQUIRED & notify assistant (REVISION notification). | System | Task status & Submission status updated; notification sent |
| FR-SUB-8 | Assistant shall resubmit work after REVISION_REQUIRED (new Submission version, Task back to REVISION_REQUIRED then SUBMITTED on new submission). | Assistant | `POST /submissions` with task_id; Task cycles REVISION_REQUIRED → SUBMITTED |

### FR-9: Editor Review & Annotations

| ID | Requirement | Actor(s) | Realized by |
|----|-------------|----------|-------------|
| FR-ANN-1 | Tantou Editor shall create an annotation on a page, manuscript, or submission (target_type, target_id, category, context, x/y coordinates). | Tantou Editor | `POST /annotations`; web: ChapterReview annotation tool (click to create) |
| FR-ANN-2 | Annotation categories: CONTENT_ISSUE, DIALOGUE_ISSUE, SCRIPT_ISSUE, VISUAL_ISSUE, GENERAL. | System | Annotation.annotation_category ENUM |
| FR-ANN-3 | Tantou Editor shall view all annotations for a target (page/manuscript/submission). | Tantou Editor | `GET /annotations?targetType=&targetId=`; web: ChapterReview annotation list |
| FR-ANN-4 | Tantou Editor shall resolve an annotation → sets is_resolved=true, resolved_at. | Tantou Editor | `PATCH /annotations/:id/resolve`; web: "Resolve" button in annotation detail |
| FR-ANN-5 | System shall link annotations to chapter review feedback; editor includes annotation summary when approving/requesting changes. | System | Annotations queried in chapter review UI; feedback field in `/api/chapters/:id/editor-review` |

### FR-10: Publishing & Schedule

| ID | Requirement | Actor(s) | Realized by |
|----|-------------|----------|-------------|
| FR-PUB-1 | System shall auto-create Publication_Schedule on chapter PUBLISHED transition (schedule_id, chapter_id uniq, release_date, publish_status=SCHEDULED). | System | Service logic in chapter status update to PUBLISHED |
| FR-PUB-2 | Publication_Schedule tracks release_date (when the chapter goes live for readers) & publish_status lifecycle. | System | Publication_Schedule table; publish_status: SCHEDULED → PUBLISHED/CANCELLED |
| FR-PUB-3 | Board may cancel a scheduled publication (publish_status=SCHEDULED → CANCELLED). | Editorial Board | Implied by service; cancellation handler updates Publication_Schedule |

### FR-11: Voting & Ranking Periods

| ID | Requirement | Actor(s) | Realized by |
|----|-------------|----------|-------------|
| FR-VOTE-1 | Board shall open a voting period for a series (ranking_period_type: WEEKLY or MONTHLY, period_start_date, period_end_date). | Editorial Board | `POST /vote-periods`; web: `/board/rankings` "Open Period" form |
| FR-VOTE-2 | Board shall view all open voting periods. | Editorial Board | `GET /vote-periods/open`; web: `/board/rankings` active periods list |
| FR-VOTE-3 | Board member shall cast one vote per series per voting period (score 0.00–5.00, optional comment). | Editorial Board | `POST /votes` with vote_period_id, score, comment; uniq(vote_period_id, board_user_id); web: voting form |
| FR-VOTE-4 | Board shall close a voting period → system computes Ranking records (rank_position, total_score, risk_level). | Editorial Board | `POST /vote-periods/:id/close`; web: "Close Period" button |
| FR-VOTE-5 | On period close, system shall calculate risk_level per series (LOW/MEDIUM/HIGH based on score thresholds) & update Series.series_status=AT_RISK if risk_level≥MEDIUM. | System | Service logic in close handler; Ranking record creation |
| FR-VOTE-6 | Board shall view leaderboard (series sorted by rank, total_score, risk_level). | Editorial Board | `GET /rankings?...`; web: `/board/rankings` leaderboard table |

### FR-12: Editorial Decisions

| ID | Requirement | Actor(s) | Realized by |
|----|-------------|----------|-------------|
| FR-DEC-1 | Board shall make a decision on a series (decision_type, reason, optional new_frequency). | Editorial Board | `POST /decisions` with series_id, decision_type, reason, new_frequency; web: `/board/rankings` decision form |
| FR-DEC-2 | Decision types: CONTINUE (keep series active), CANCEL (end series), CHANGE_FREQUENCY (WEEKLY↔MONTHLY), HIATUS (pause publication). | System | Decision.decision_type ENUM(4) |
| FR-DEC-3 | CONTINUE decision → Series.series_status remains ACTIVE. | System | Service logic; no status change |
| FR-DEC-4 | CANCEL decision → Series.series_status=CANCELLED; notifies mangaka. | System | Series status update; DECISION notification |
| FR-DEC-5 | HIATUS decision → Series.series_status=HIATUS; notifies mangaka. | System | Series status update; DECISION notification |
| FR-DEC-6 | CHANGE_FREQUENCY decision → Series.publication_frequency updates; notifies mangaka. | System | Series.publication_frequency = new_frequency; DECISION notification |
| FR-DEC-7 | Board shall view decision history for a series. | Editorial Board | `GET /decisions?seriesId=:seriesId`; web: `/series/:id` decision timeline |

### FR-13: Earnings & Accrual

| ID | Requirement | Actor(s) | Realized by |
|----|-------------|----------|-------------|
| FR-EARN-1 | On task approval (submission APPROVED), system shall accrue Assistant_Profile.total_earnings += Task.payment_amount. | System | Service logic in submission review handler |
| FR-EARN-2 | Assistant shall view their total earnings & list of approved tasks (with earnedAt timestamp & dispute flag). | Assistant | `GET /earnings/mine`; web: `/earnings` dashboard |
| FR-EARN-3 | Assistant shall view task list with earned_amount (from Task.payment_amount) & hasDispute flag. | Assistant | Earnings summary response includes task array; web: earnings list |

### FR-14: Earning Disputes

| ID | Requirement | Actor(s) | Realized by |
|----|-------------|----------|-------------|
| FR-DISP-1 | Assistant shall open a dispute on an APPROVED task (dispute_reason, expected_amount) → Earning_Dispute.dispute_status=OPEN. | Assistant | `POST /disputes` with task_id, reason, expected_amount; web: `/earnings` "Dispute" button on task |
| FR-DISP-2 | System shall notify all admins immediately (DISPUTE notification) on dispute creation. | System | `NotificationsService.notify(admin_user_ids, DISPUTE, ...)` |
| FR-DISP-3 | Assistant shall view their own open & resolved disputes. | Assistant | `GET /disputes/mine`; web: `/earnings` disputes tab |
| FR-DISP-4 | Admin shall view all studio disputes (open, under review, resolved). | Admin | `GET /disputes`; web: `/admin/disputes` list |
| FR-DISP-5 | Admin shall review a dispute → Earning_Dispute.dispute_status=UNDER_REVIEW. | Admin | `PATCH /disputes/:id/review`; web: "Under Review" button |
| FR-DISP-6 | Admin shall resolve a dispute with outcome (RESOLVED or REJECTED) & optional resolution_note. | Admin | `PATCH /disputes/:id/resolve` with outcome; web: decision form |
| FR-DISP-7 | On dispute RESOLVED with adjustedAmount, system shall update Task.payment_amount & recalculate Assistant_Profile.total_earnings (delta accrual). | System | Service logic: delta = adjustedAmount − original Task.payment_amount; update total_earnings |
| FR-DISP-8 | System shall notify assistant on dispute resolution (DISPUTE notification with outcome). | System | `NotificationsService.notify(assistant, DISPUTE, ...)` |

### FR-15: Notifications

| ID | Requirement | Actor(s) | Realized by |
|----|-------------|----------|-------------|
| FR-NOTIF-1 | System shall generate notifications for: DEADLINE, TASK_ASSIGNMENT, SUBMISSION, REVISION, REVIEW, PROPOSAL_DECISION, RISK_ALERT, DECISION, DISPUTE, GENERAL. | System | Notification.notification_type ENUM(10) |
| FR-NOTIF-2 | Notifications shall include title, content, related_entity_type, related_entity_id for deep linking. | System | Notification table schema |
| FR-NOTIF-3 | User shall view all their notifications (paginated, is_read flag). | Any | `GET /notifications`; web: notification bell dropdown in Header |
| FR-NOTIF-4 | User shall mark a notification as read. | Any | `PATCH /notifications/:id/read`; web: click notification |
| FR-NOTIF-5 | User shall mark all notifications as read. | Any | `PATCH /notifications/read-all`; web: "Mark all read" button |

### FR-16: Dashboard & Role-Aware Summary

| ID | Requirement | Actor(s) | Realized by |
|----|-------------|----------|-------------|
| FR-DASH-1 | Each role shall see a customized dashboard on `/` (data-role theming). | Any | `GET /api/dashboard/summary`; web: `/` Dashboard component |
| FR-DASH-2 | Mangaka dashboard: active series, pending chapters, awaiting submissions, recent decisions. | Mangaka | Dashboard query returns mangaka-filtered data |
| FR-DASH-3 | Assistant dashboard: assigned tasks, earnings summary, open disputes. | Assistant | Dashboard query returns assistant-filtered data |
| FR-DASH-4 | Tantou Editor dashboard: assigned series, pending chapter reviews, annotations. | Tantou Editor | Dashboard query returns editor-filtered data |
| FR-DASH-5 | Board dashboard: series overview, open voting periods, pending proposals, ranking stats. | Editorial Board | Dashboard query returns board-level aggregate data |
| FR-DASH-6 | Admin dashboard: user overview (activate count, role distribution), dispute stats, system health. | Admin | Dashboard query returns admin-level metrics |

### FR-17: Admin & User Management

| ID | Requirement | Actor(s) | Realized by |
|----|-------------|----------|-------------|
| FR-ADM-1 | Admin shall view all users (list with email, name, role, activation status). | Admin | `GET /admin/users`; web: `/admin` user table |
| FR-ADM-2 | Admin shall activate a newly registered user. | Admin | `PATCH /admin/users/:id` with is_activated=true; web: "Activate" button |
| FR-ADM-3 | Admin shall change a user's role. | Admin | `PATCH /admin/users/:id` with role; web: role dropdown |
| FR-ADM-4 | System shall enforce last-admin guard: prevent demotion/deactivation of last ADMIN. | System | Guard in `PATCH /admin/users/:id`; rejects if would leave zero admins |
| FR-ADM-5 | Admin shall view system overview (total users, total series, total earnings distributed). | Admin | `GET /admin/overview`; web: `/admin` overview cards |

### FR-18: File Uploads

| ID | Requirement | Actor(s) | Realized by |
|----|-------------|----------|-------------|
| FR-UPL-1 | User shall upload a file (multipart form, Multer→disk). | Any | `POST /uploads` (expects `file` part); web: file input elements |
| FR-UPL-2 | System shall return upload metadata (url: `/uploads/:filename`, originalName). | System | Upload response with url path |
| FR-UPL-3 | System shall serve uploaded files at `/uploads/:filename` (static middleware). | System | Express static `/uploads` serving uploads/ directory |
| FR-UPL-4 | Page version images stored via upload endpoint; referenced by Page_Version.image_url. | System | Studio page export → upload → Page_Version.image_url |

### FR-19: Studio & Drawing Canvas

| ID | Requirement | Actor(s) | Realized by |
|----|-------------|----------|-------------|
| FR-STU-1 | Mangaka/Assistant shall access in-browser Studio at `/studio/page/:pageId` (full-screen, no shell). | Mangaka/Assistant | web: `/studio/page/:pageId` StudioPage component |
| FR-STU-2 | Studio shall provide raster drawing tools: brush, fill, selection, transform, text, bubbles, panels, lines. | System | Studio modules: brush, fill, selection, transform, text, bubbles, tools/* |
| FR-STU-3 | Studio shall support layer management (document module). | System | Studio layers system; document.ts |
| FR-STU-4 | Studio shall support undo/redo. | System | Studio history module |
| FR-STU-5 | Studio shall support pan & zoom (view module). | System | Studio view module; pan/zoom logic |
| FR-STU-6 | Studio shall provide region creation/editing tool (draw regions, auto-detect with AI, link to tasks). | System | Studio region tool; calls `POST /regions` |
| FR-STU-7 | Studio shall export page as image & upload via `POST /api/studio/page-versions`. | System | Studio export → upload handler; creates Page_Version |
| FR-STU-8 | Studio shall access region detection AI (YOLO for panels; MobileSAM for smart select; DeOldify for colorize) via on-device ONNX Runtime Web. | System | AI models in studio/ai/onnx/; runtime loads lazily |
| FR-STU-9 | Studio shall fall back to heuristic AI if ONNX models unavailable. | System | Heuristic.ts fallback logic |
| FR-STU-10 | All inference runs in-browser (no server calls); no images leave the browser. | System | Client-side ONNX Runtime; ai_suggested flag set locally |
| FR-STU-11 | Assistant shall access Studio for a task region at `/studio/region/:taskId`. | Assistant | web: `/studio/region/:taskId` StudioRegion component |
| FR-STU-12 | Studio shall persist canvas documents via `POST /api/studio/docs` & `GET /api/studio/docs/:pageId`. | System | Studio document persistence endpoints |

### FR-20: Genres & Metadata

| ID | Requirement | Actor(s) | Realized by |
|----|-------------|----------|-------------|
| FR-GEN-1 | System shall provide a list of genres for proposal/series tagging. | System | `GET /genres`; web: genre picker in proposal form |
| FR-GEN-2 | Proposal may have one or more genres (Proposal_Genre bridge table). | System | M-N relationship; filled on proposal creation |
| FR-GEN-3 | Series inherits genres from approved proposal (Series_Genre bridge table). | System | Service copies genres on Series creation from Proposal |

### FR-21: User Lookups

| ID | Requirement | Actor(s) | Realized by |
|----|-------------|----------|-------------|
| FR-USER-1 | Mangaka shall view available assistants (list for task assignment). | Mangaka | `GET /users/assistants`; web: task creation form assistant picker |
| FR-USER-2 | Board shall view available Tantou Editors (list for series assignment). | Editorial Board | `GET /users/editors`; web: `/board/series` editor picker |

### FR-22: Health & Root

| ID | Requirement | Actor(s) | Realized by |
|----|-------------|----------|-------------|
| FR-HEALTH-1 | System shall provide a health/root endpoint for monitoring. | System | `GET /api`; returns {message: "API is running"} or similar |

### FR-23: Profile & Avatar Management

| ID | Requirement | Actor(s) | Realized by |
|----|-------------|----------|-------------|
| FR-PROF-1 | User shall view their own profile (email, fullName, avatarUrl, role). | Any | `GET /api/users/me`; web: Profile page (accessible from Header) |
| FR-PROF-2 | User shall update their profile (fullName ≤120 chars, avatarUrl ≤500 chars). | Any | `PATCH /api/users/me` with optional fullName and avatarUrl; web: Profile form with save button |
| FR-PROF-3 | User shall upload an avatar image (PNG, JPEG, WebP, GIF; ≤5MB) to S3 object storage. | Any | File upload via `POST /api/uploads` → S3 → returns `/uploads/:key` URL; assigned to avatarUrl on PATCH |
| FR-PROF-4 | System shall validate avatar image format and size before upload. | System | Client-side validation in Profile.tsx; server-side Multer limit 30MB (files culled at upload if mimetype/size mismatch) |

### FR-24: Self-Hosted Object Storage (SeaweedFS S3)

| ID | Requirement | Actor(s) | Realized by |
|----|-------------|----------|-------------|
| FR-S3-1 | System shall store uploaded files (page versions, avatars, submissions) in S3-compatible object storage (SeaweedFS Docker container). | System | `StorageService` (s3/storage.service.ts) uses AWS SDK with S3Client endpoint=http://localhost:8333 (dev) |
| FR-S3-2 | File upload endpoint POST `/api/uploads` accepts multipart file, stores to S3, returns stable `/uploads/:key` URL. | Any | UploadsController.uploadFile() → StorageService.put(key, buffer) → returns {url: `/uploads/:key`, originalName} |
| FR-S3-3 | File retrieval GET `/api/uploads/:key` serves from S3 with path-traversal protection; fallback to disk for migration. | System | main.ts express.get('/uploads/:key') validates key against regex `[A-Za-z0-9._-]+`; calls StorageService.get(); 404 if not found |
| FR-S3-4 | S3 credentials and endpoint driven by environment variables (S3_ENDPOINT, S3_ACCESS_KEY, S3_SECRET_KEY, S3_BUCKET, S3_REGION). | System | StorageService constructor reads process.env; dev defaults: endpoint=http://localhost:8333, bucket=manga-uploads, region=us-east-1 |
| FR-S3-5 | S3 bucket auto-created on module init if not present. | System | StorageService.onModuleInit() attempts HeadBucketCommand; catches error and CreateBucketCommand on 404 |
| FR-S3-6 | File size limit: 30MB per file. | System | Multer fileSize limit: 30 * 1024 * 1024 bytes in UploadsController |

### FR-25: Near-Real-Time Notifications

| ID | Requirement | Actor(s) | Realized by |
|----|-------------|----------|-------------|
| FR-NOTIF-6 | Editor notified when chapter transitions to READY_FOR_EDITOR_REVIEW (multi-user fan-out if multiple editors assigned). | System | chapters.service.setStatus sends REVIEW notification to all active Series_Tantou_Editor (unassigned_at IS NULL) |
| FR-NOTIF-7 | Editor notified when chapter transitions to PUBLISHED (multi-user fan-out). | System | chapters.service.setStatus sends GENERAL notification to all active editors after Publication_Schedule created in transaction |
| FR-NOTIF-8 | Board members notified when proposal is approved. | System | proposals.service.decide sends PROPOSAL_DECISION notification to all EDITORIAL_BOARD users |
| FR-NOTIF-9 | Mangaka notified when assigned a Tantou Editor. | System | series.service.assignEditor sends REVIEW notification with "You have been assigned to series..." message |
| FR-NOTIF-10 | Web notifications fetched via 20-second polling; bell icon in Header shows unread count and displays dropdown list. | Any | Notifications page / Header bell component calls `GET /api/notifications` on 20s interval; lists unread first |

### FR-26: Transactional Integrity (ACID Data Safety)

| ID | Requirement | Actor(s) | Realized by |
|----|-------------|----------|-------------|
| FR-TRANS-1 | Proposal approval (decision→Series creation + genre copy + notification) executes atomically: all succeed or all rollback. | System | proposals.service.decide() wraps writes in DbService.transaction(); notification sent AFTER commit |
| FR-TRANS-2 | Submission review (decision→Task status update + earnings accrual + notification) executes atomically. | System | submissions.service.review() uses DbService.transaction() for Task + Assistant_Profile updates; notify AFTER commit |
| FR-TRANS-3 | Dispute resolution (outcome→Task payment delta + earnings adjustment + notification) executes atomically. | System | disputes.service.resolve() wraps all writes in transaction; mangaka notified AFTER commit |
| FR-TRANS-4 | Chapter publication (status→Publication_Schedule creation + notification) executes atomically. | System | chapters.service.setStatus(PUBLISHED) wraps Chapter + Publication_Schedule writes in transaction; notify AFTER commit |

---

## Non-Functional Requirements

| ID | Category | Requirement | Realization |
|----|----------|-------------|-------------|
| NFR-SEC-1 | Security | All endpoints (except `/auth/login`, `GET /auth/google`, callback) shall be guarded by JWT + `@UseGuards(JwtAuthGuard, RolesGuard)`. | NestJS JwtAuthGuard + custom RolesGuard; token validation on every request. |
| NFR-SEC-2 | Security | Role-based access control (RBAC) enforced via `@Roles(Role.X)` decorator. | RolesGuard checks JWT payload role against decorator; rejects 403 if mismatch. |
| NFR-SEC-3 | Security | Sensitive input validated & whitelist-transformed via `ValidationPipe({whitelist,transform})`. | Global pipe in main.ts; DTO field decorators (class-validator). |
| NFR-SEC-4 | Security | Password hashing (bcryptjs) on login/registration; passwords never stored plaintext. | Auth service bcryptjs.hash() on register; bcryptjs.compare() on login. |
| NFR-SEC-5 | Security | Cross-Origin Resource Sharing (CORS) configured to CLIENT_URL only; no wildcard. | NestJS CORS middleware in main.ts; origin validated against env var. |
| NFR-SEC-6 | Security | Ownership checks enforced: user can only modify own entities (proposals, series submissions, disputes, notifications). | Service layer validates user_id matches entity user_id before update/delete. |
| NFR-SEC-7 | Security | Last-admin guard prevents demotion/deactivation of sole ADMIN. | Admin controller checks count of active ADMIN role before patch; rejects if count=1. |
| NFR-SEC-8 | Security | Path-traversal attack prevention on GET `/uploads/:key`: key validated against safe pattern `[A-Za-z0-9._-]+`. | main.ts express.get('/uploads/:key') rejects keys with `/`, `..`, or special chars; returns 400 Bad Request. |
| NFR-SEC-9 | Security | All exception responses sanitized: HTTP status codes returned, no SQL errors or stack traces leaked to client. | AllExceptionsFilter catches all exceptions; returns generic 500 message in Vietnamese ("Lỗi máy chủ...") for non-HttpException errors. |
| NFR-SEC-10 | Security | JWT secret required and warned if missing; should be at least 32 chars in production. | Bootstrap logs warn if JWT_SECRET not set; env var required for AppModule forRoot. |
| NFR-ABUSE-1 | Abuse Prevention | Global rate-limiting: 120 requests per minute per IP (default throttle). | @nestjs/throttler ThrottlerModule.forRoot applied globally via AppModule. |
| NFR-ABUSE-2 | Abuse Prevention | Login endpoint rate-limited to 20 attempts per minute (stricter than global). | auth.controller.ts @Throttle({default: {ttl: 60000, limit: 20}}) on POST login to block brute-force. |
| NFR-STORAGE-1 | Data Persistence | Object storage (SeaweedFS) provides durable file persistence for avatars, page versions, submissions. | StorageService S3Client with CreateBucketCommand auto-init; files persisted server-side in SeaweedFS container. |
| NFR-STORAGE-2 | Data Persistence | File URLs stable across restarts and deployments: `/uploads/:key` format consistent. | StorageService keys generated as UUID + original extension; same key always maps to same object. |
| NFR-PERF-1 | Performance | Database connection pooling via mysql2 pool (configurable max connections). | mysql2.createPool() in DbService; reused connections per request. |
| NFR-PERF-2 | Performance | AI models (YOLO, MobileSAM, DeOldify) lazy-loaded in browser; do not block page load. | onnx runtime loads on-demand in Studio; heuristic fallback available. |
| NFR-PERF-3 | Performance | Pagination supported on list endpoints (series, proposals, tasks, notifications, users). | Query params limit/offset passed to service; SQL LIMIT/OFFSET applied. |
| NFR-USAB-1 | Usability | Role-aware navigation: each role sees only relevant nav items (data-role styling). | AppShell renders nav from nav.ts Role map; CSS scopes tokens by data-role. |
| NFR-USAB-2 | Usability | Loading, empty, and error states displayed on all data lists & forms. | UI components conditional render; placeholder/skeleton on fetch; error boundary fallback. |
| NFR-USAB-3 | Usability | Dark/light theme support (CSS tokens). | Tailwind v4 token system; theme selector in Header. |
| NFR-USAB-4 | Usability | Accessibility (a11y): ARIA labels, semantic HTML, keyboard navigation. | lucide-react icons with aria-label; form inputs with associated labels; tabindex hierarchy. |
| NFR-USAB-5 | Usability | Vietnamese UI strings (app copy in web components); English in API/docs. | App UI messages in Vietnamese (hardcoded or i18n; config TBD). |
| NFR-PRIV-1 | Privacy | All AI inference runs in-browser; no image/data sent to external APIs. | Studio ai/ modules run ONNX Runtime Web client-side; no fetch to server. |
| NFR-PRIV-2 | Privacy | On-device AI models stored locally; cached by browser; no central model registry exposed. | ONNX models via import/embed in JS bundles or downloaded once. |
| NFR-MAINT-1 | Maintainability | Shared enums (Role, ProposalStatus, etc.) defined once in `@manga/shared`. | packages/shared/src/enums/; no duplication across apps. |
| NFR-MAINT-2 | Maintainability | Database queries written as raw SQL (mysql2 native); no ORM abstraction. | DbService.query<T>(sql, params); services use raw SQL strings. |
| NFR-MAINT-3 | Maintainability | State transitions validated via `canTransition()` utility from shared. | packages/shared/src/transitions.ts; Service layer calls canTransition() before state update. |
| NFR-MAINT-4 | Maintainability | Monorepo structure (pnpm workspace): apps/{web,api}, packages/{shared,canvas-wasm}. | pnpm-workspace.yaml defines workspace; pnpm -F filter by package. |
| NFR-PORT-1 | Portability | Minimum Node.js version: 20; TypeScript 5.7 (api), ~6.0 (web). | package.json engines.node; tsc config via tsconfig.json per package. |
| NFR-PORT-2 | Portability | MySQL 8 (Docker, host port 3308→container 3306). | docker-compose.yml defines MySQL service; DbService connects via env var. |
| NFR-PORT-3 | Portability | Environment variables: NODE_ENV, DATABASE_URL, JWT_SECRET, CLIENT_URL, GOOGLE_CLIENT_ID/SECRET. | Loaded via @nestjs/config; .env file (dev only, not committed). |
| NFR-TEST-1 | Testability | API: jest 30 + ts-jest; 50+ test suites; build green. | test files in apps/api/src/**/*.spec.ts; jest.config.js in root. |
| NFR-TEST-2 | Testability | Web: vitest 4 + @testing-library/react + jsdom; 185+ test suites; tsc -b green. | test files in apps/web/src/**/*.test.tsx; vitest.config.ts; no testing-library/user-event (use fireEvent). |
| NFR-TEST-3 | Testability | Live smoke tests (5 suites: sprint5/6/7, storage, ux-upgrade) run against real DB; 70+ scenarios / 0 fail. | node docs/superpowers/smoke-sprint{5,6,7}.mjs + smoke-storage.mjs + smoke-ux-upgrade.mjs (real MySQL + login + workflows). |
| NFR-BUILD-1 | Build & Delivery | Build: `pnpm build` compiles web (Vite) & api (tsc); outputs dist/ or .next/. | apps/web build → dist/; apps/api build → dist/. |
| NFR-BUILD-2 | Build & Delivery | TypeScript strict mode enabled (api decorators OK, web erasableSyntaxOnly=NO enums). | tsconfig.json compilerOptions.strict; api allows decorators, web forbids enums. |

---

## Use Cases

### UC-01: User Login (Local Email/Password)

**Actor:** New or Returning User  
**Goal:** Authenticate and gain access to role-specific features.  
**Preconditions:**
- User account exists (created by admin activation or self-registration) and is activated.
- Database contains User record with password_hash.

**Main Flow:**
1. User navigates to `/login`.
2. User enters email and password.
3. System calls `POST /auth/login` with credentials.
4. System hashes provided password and compares to User.password_hash.
5. On match, system issues JWT token (sub=user_id, role).
6. System returns token to client.
7. Client stores token in localStorage/sessionStorage.
8. System redirects user to `/` (Dashboard) with authenticated context.

**Alternate/Exception Flows:**
- **A1:** Email not found → system returns 401 Unauthorized; user sees "Invalid email or password" message.
- **A2:** Password does not match → system returns 401 Unauthorized; user sees "Invalid email or password" message.
- **A3:** User account not activated → system returns 403 Forbidden; user sees "Contact admin to activate your account" message.

**Postconditions:**
- User has a valid JWT token in client.
- Subsequent requests include `Authorization: Bearer <token>`.
- User is redirected to role-specific Dashboard.

**Related FRs:** FR-AUTH-1, FR-AUTH-2, FR-AUTH-3, NFR-SEC-2, NFR-SEC-4

---

### UC-02: User Login (Google OAuth)

**Actor:** New or Returning User  
**Goal:** Authenticate via Google without local password.  
**Preconditions:**
- Google OAuth app configured (CLIENT_ID, CLIENT_SECRET in env).
- User has a Google account.

**Main Flow:**
1. User clicks "Sign in with Google" on `/login`.
2. Browser redirects to `GET /auth/google`.
3. System initiates passport-google-oauth20 flow.
4. User is directed to Google consent screen.
5. User grants permission.
6. Google redirects to `/auth/google/callback` with auth code.
7. System exchanges code for Google profile (email, name, picture).
8. System checks if User record exists by google_id.
9. If exists, system issues JWT.
10. If not exists, system creates new User (email, full_name=googleName, avatar_url=picture, auth_provider='GOOGLE', is_activated=false).
11. System redirects to `/auth/callback` route with token in URL or cookie.
12. Client stores token and redirects to `/` if activated; else to "Awaiting Admin Activation" page.

**Alternate/Exception Flows:**
- **A1:** OAuth consent denied → user returns to `/login` with error message.
- **A2:** New user created but not yet activated → user sees "Awaiting Admin Activation" and is notified to admin.

**Postconditions:**
- JWT token stored in client.
- User record created/updated with Google profile data.
- User redirected to Dashboard (if activated) or activation notice (if pending).

**Related FRs:** FR-AUTH-1, FR-AUTH-2, NFR-SEC-4, NFR-SEC-5

---

### UC-03: Create & Submit Series Proposal

**Actor:** Mangaka  
**Goal:** Submit a manga series proposal for board approval.  
**Preconditions:**
- Mangaka is authenticated and logged in.

**Main Flow:**
1. Mangaka navigates to `/proposals`.
2. Mangaka clicks "New Proposal".
3. Mangaka fills form: title, synopsis, genres (M-select), proposed_frequency (WEEKLY/MONTHLY).
4. System creates Series_Proposal (proposal_status=DRAFT, created_at).
5. System optionally creates Proposal_Genre records.
6. Mangaka saves as DRAFT (can edit later).
7. Mangaka navigates back to `/proposals` and selects proposal.
8. Mangaka clicks "Submit".
9. System calls `PATCH /proposals/:id/submit`.
10. System transitions DRAFT→SUBMITTED, sets submitted_at.
11. System notifies EDITORIAL_BOARD (PROPOSAL_DECISION notification: "New proposal submitted by <Mangaka>").
12. Mangaka sees confirmation "Proposal submitted; awaiting board review".

**Alternate/Exception Flows:**
- **A1:** Mangaka edits DRAFT proposal before submission → system allows updates on DRAFT state only; rejects SUBMITTED/APPROVED/REJECTED.
- **A2:** Board requires changes → board rejects proposal (REJECTED); Mangaka may resubmit by creating new proposal.

**Postconditions:**
- Proposal.proposal_status = SUBMITTED.
- Proposal.submitted_at recorded.
- Board members notified.
- Proposal visible in `/board/proposals` review queue.

**Related FRs:** FR-PROP-1, FR-PROP-2, FR-PROP-3, FR-PROP-7, FR-GEN-2

---

### UC-04: Board Reviews & Approves Proposal

**Actor:** Editorial Board Member  
**Goal:** Review and approve a proposal → auto-create Series.  
**Preconditions:**
- Proposal.proposal_status = SUBMITTED or UNDER_REVIEW.
- Board member is authenticated.

**Main Flow:**
1. Board member navigates to `/board/proposals`.
2. System displays review queue (SUBMITTED/UNDER_REVIEW proposals).
3. Board member clicks on proposal to view details (title, synopsis, genres, frequency, mangaka).
4. Board member clicks "Approve".
5. System calls `PATCH /proposals/:id/decision` with decision='APPROVED'.
6. System transitions SUBMITTED→APPROVED (or UNDER_REVIEW→APPROVED).
7. System auto-creates Series_Proposal.proposal_id FK → Series record (series_id, title, mangaka_user_id, publication_frequency, series_status=ACTIVE).
8. System copies Proposal_Genre → Series_Genre.
9. System notifies Mangaka (PROPOSAL_DECISION: "Your proposal '<title>' has been approved!").
10. Board member sees confirmation "Proposal approved; Series created".

**Alternate/Exception Flows:**
- **A1:** Board rejects proposal → system transitions SUBMITTED→REJECTED; notifies Mangaka with rejection reason (optional).
- **A2:** Multiple board members review same proposal → transition SUBMITTED→UNDER_REVIEW first; any member can approve/reject from UNDER_REVIEW.

**Postconditions:**
- Proposal.proposal_status = APPROVED.
- Series record created.
- Series.series_status = ACTIVE.
- Mangaka notified.
- Series visible in `/series/mine` (for mangaka) and `/board/series` (for board).

**Related FRs:** FR-PROP-4, FR-PROP-5, FR-PROP-7, FR-SER-1, FR-SER-7, FR-GEN-3

---

### UC-05: Board Assigns Tantou Editor to Series

**Actor:** Editorial Board Member  
**Goal:** Assign a Tantou Editor to manage a series.  
**Preconditions:**
- Series exists (series_status = ACTIVE).
- Tantou Editor account exists and is activated.
- Board member is authenticated.

**Main Flow:**
1. Board member navigates to `/board/series`.
2. System displays all studio series (status, mangaka, current editor).
3. Board member clicks on series to edit.
4. Board member opens editor assignment section.
5. Board member selects editor from dropdown (`GET /users/editors`).
6. System calls `PUT /series/:id/editor` with editor_user_id.
7. System creates Series_Tantou_Editor (series_id, editor_user_id, assigned_at=NOW, unassigned_at=NULL).
8. System notifies editor (REVIEW: "You have been assigned to series '<title>'").
9. Board member sees confirmation "Editor assigned".

**Alternate/Exception Flows:**
- **A1:** Reassign editor to different person → system creates new Series_Tantou_Editor record (previous record unassigned_at=NOW remains in history).
- **A2:** Unassign editor → system calls `DELETE /series/:id/editor`; sets unassigned_at=NOW on latest record; notifies editor "You have been unassigned from series '<title>'".

**Postconditions:**
- Series_Tantou_Editor.editor_user_id updated.
- assigned_at recorded (unassigned_at NULL for active assignment).
- Editor notified and aware of series responsibility.
- Editor can now view series chapters in `/editor/review` queue.

**Related FRs:** FR-SER-5, FR-SER-6, FR-USER-2

---

### UC-06: Mangaka Creates Chapter & Pages & Regions

**Actor:** Mangaka  
**Goal:** Create a chapter with pages and define work regions for assistants.  
**Preconditions:**
- Series exists and belongs to Mangaka.
- Mangaka is authenticated.

**Main Flow:**
1. Mangaka navigates to `/series/:seriesId`.
2. Mangaka clicks "New Chapter".
3. Mangaka fills chapter form: chapter_number, title, deadline.
4. System creates Chapter (series_id, chapter_number, chapter_status=DRAFT, created_at).
5. System validates uniq(series_id, chapter_number).
6. Mangaka is redirected to `/series/:seriesId/chapters/:chapterId` (ChapterWorkspace).
7. Mangaka clicks "Add Page".
8. Mangaka enters page_number.
9. System creates Page (chapter_id, page_number, page_status=RAW, current_version=0).
10. Mangaka uploads page image via Studio or file upload.
11. System creates Page_Version (page_id, version_number=1, image_url, uploaded_by=mangaka).
12. Mangaka updates Page.current_version = 1, page_status = ASSIGNED (if page is ready).
13. Mangaka uses Studio drawing tool to draw/define regions on the page.
14. Mangaka draws region boxes on canvas (x, y, width, height, region_type: PANEL/BACKGROUND/CHARACTER/DIALOGUE_BUBBLE/EFFECT).
15. System creates Region records (page_id, page_version_id, region_type, coordinates).
16. Mangaka optionally uses AI region detection (YOLO model) → Region.ai_suggested=true for auto-detected regions.
17. Chapter structure complete; Mangaka moves chapter to IN_PROGRESS status.

**Alternate/Exception Flows:**
- **A1:** Mangaka uploads multiple page versions → system creates new Page_Version per upload; Page.current_version increments.
- **A2:** Mangaka deletes a region → system calls `DELETE /regions/:id`; region removed from workflow.

**Postconditions:**
- Chapter created with pages and regions defined.
- Page_Version records track upload history.
- Regions ready for task assignment.
- Chapter status = DRAFT or IN_PROGRESS.

**Related FRs:** FR-CHP-1, FR-CHP-3, FR-PAGE-1, FR-PAGE-4, FR-PAGE-6, FR-REG-1, FR-REG-3, FR-REG-5, FR-STU-1, FR-STU-6, FR-STU-8

---

### UC-07: Mangaka Creates Priced Task & Assigns Assistant

**Actor:** Mangaka  
**Goal:** Create a task for a region and assign an assistant.  
**Preconditions:**
- Region exists on a page.
- Assistants are available in the system.
- Mangaka is authenticated.

**Main Flow:**
1. Mangaka navigates to ChapterWorkspace and views page with regions.
2. Mangaka right-clicks or opens context menu on region.
3. Mangaka clicks "Create Task".
4. Mangaka fills task form: assignee (assistant user), description, deadline, instruction (optional).
5. System queries Task_Price_Rule WHERE region_type = region.region_type AND is_active=true AND effective_from <= NOW <= effective_to.
6. System calculates payment_amount = base_price (from matching rule).
7. System creates Task (region_id, page_id, assignee_user_id, assignor=mangaka, payment_amount, task_status=ASSIGNED, task_price_rule_id).
8. System notifies assistant (TASK_ASSIGNMENT: "New task assigned: '<description>' due <deadline>"; related_entity_id=task_id).
9. Mangaka sees confirmation "Task created; assistant will be notified".

**Alternate/Exception Flows:**
- **A1:** No active Task_Price_Rule found → system fails with error "No pricing rule for region type <type>"; Mangaka must admin configure rule first.
- **A2:** Mangaka reassigns task to different assistant → system updates Task.assignee_user_id; notifies old and new assignees.

**Postconditions:**
- Task created with auto-calculated payment_amount.
- Task.task_status = ASSIGNED.
- Assistant notified immediately.
- Task visible in `/my-tasks` for assigned assistant.

**Related FRs:** FR-TASK-1, FR-TASK-2, FR-TASK-3, FR-TASK-4, FR-REG-6

---

### UC-08: Assistant Starts & Submits Task Work

**Actor:** Assistant  
**Goal:** Accept task, perform work in Studio, and submit for review.  
**Preconditions:**
- Task exists with assistant as assignee (task_status=ASSIGNED).
- Assistant is authenticated.

**Main Flow:**
1. Assistant navigates to `/my-tasks`.
2. System displays assigned tasks (status, description, deadline, region link).
3. Assistant clicks on task to view details.
4. Assistant clicks "Start Task".
5. System calls `PATCH /tasks/:id/start`.
6. System transitions ASSIGNED→IN_PROGRESS (via canTransition check).
7. System updates Task.task_status = IN_PROGRESS, updated_at.
8. Assistant clicks "Open Studio" (button links to `/studio/region/:taskId`).
9. Assistant navigates to Studio with region context.
10. Assistant uses Studio tools (brush, fill, selection, AI assists) to complete work.
11. Assistant can save canvas state via `POST /api/studio/docs` (persistence).
12. Assistant clicks "Submit Work" button in Studio.
13. Assistant uploads final image via `POST /api/studio/page-versions` (or manual file upload).
14. System creates Page_Version (version_number++, image_url, uploaded_by=assistant).
15. System creates Submission (task_id, page_id, assistant_user_id, version_number, file_url, submission_status=PENDING, submitted_at=NOW).
16. System transitions Task.task_status = SUBMITTED (via submission creation trigger).
17. System notifies Mangaka (SUBMISSION: "Task '<description>' submitted for review"; related_entity_id=submission_id).
18. Assistant sees confirmation "Work submitted; awaiting mangaka review".

**Alternate/Exception Flows:**
- **A1:** Task deadline passed → system may show warning but allows submission; Mangaka sees "overdue" flag on submission.
- **A2:** Assistant needs revision → Mangaka marks submission REVISION_REQUIRED; system moves task back to REVISION_REQUIRED state; Assistant resubmits (new Submission version).

**Postconditions:**
- Task.task_status = SUBMITTED.
- Submission created with file_url.
- Submission.submission_status = PENDING (awaiting mangaka review).
- Mangaka notified immediately.
- Submission visible in `/review` review queue for mangaka.

**Related FRs:** FR-TASK-6, FR-TASK-7, FR-SUB-1, FR-SUB-2, FR-STU-1, FR-STU-11, FR-STU-12

---

### UC-09: Mangaka Reviews & Approves Submission

**Actor:** Mangaka  
**Goal:** Review assistant submission and approve (→ earnings accrual) or request revision.  
**Preconditions:**
- Submission exists (submission_status=PENDING).
- Mangaka is authenticated and is series/task owner.

**Main Flow:**
1. Mangaka navigates to `/review`.
2. System displays review queue (submissions for mangaka's series).
3. Mangaka clicks submission to view.
4. Mangaka views assistant's submitted image & task description.
5. Mangaka clicks "Approve".
6. System calls `PATCH /submissions/:id/review` with decision='APPROVED'.
7. System transitions Submission.submission_status = UNDER_REVIEW (optional) → APPROVED.
8. System transitions Task.task_status = APPROVED.
9. System accrues Assistant_Profile.total_earnings += Task.payment_amount.
10. System notifies assistant (SUBMISSION: "Your work has been approved! Earned <amount>"; related_entity_id=submission_id).
11. Mangaka sees confirmation "Submission approved; assistant earnings updated".

**Alternate/Exception Flows:**
- **A1:** Mangaka requests revision → Mangaka clicks "Request Changes" and provides feedback.
  - System sets Submission.submission_status = REVISION_REQUIRED, Submission.feedback = feedback.
  - System transitions Task.task_status = REVISION_REQUIRED.
  - System notifies assistant (REVISION: "Revisions requested: <feedback>").
  - Assistant resubmits (new Submission version); Task cycles REVISION_REQUIRED → SUBMITTED.
- **A2:** Mangaka rejects submission entirely → Submission.submission_status = REJECTED (terminal); Task → REVISION_REQUIRED (assistant can resubmit).

**Postconditions:**
- Submission.submission_status = APPROVED (or REVISION_REQUIRED/REJECTED).
- Task.task_status = APPROVED (or REVISION_REQUIRED).
- Assistant.total_earnings += Task.payment_amount (if approved).
- Assistant notified.
- Task visible in Assistant's `/earnings` if approved.

**Related FRs:** FR-SUB-4, FR-SUB-5, FR-SUB-6, FR-SUB-7, FR-EARN-1

---

### UC-10: Tantou Editor Reviews Chapter & Approves

**Actor:** Tantou Editor  
**Goal:** Review chapter pages, provide editorial feedback via annotations, and approve for publication.  
**Preconditions:**
- Chapter exists with chapter_status = READY_FOR_EDITOR_REVIEW.
- Tantou Editor is assigned to the series.
- All pages are COMPLETED (or REVIEWING).

**Main Flow:**
1. Tantou Editor navigates to `/editor/review`.
2. System displays chapters assigned to editor's series (READY_FOR_EDITOR_REVIEW status).
3. Tantou Editor clicks chapter.
4. System navigates to `/editor/review/:chapterId`.
5. Editor views all pages (list with status, current version).
6. Editor clicks page to review.
7. Editor views page image and annotates as needed.
8. Editor draws annotation boxes and fills annotation form: category (CONTENT_ISSUE/DIALOGUE_ISSUE/SCRIPT_ISSUE/VISUAL_ISSUE/GENERAL), context (feedback text), x/y coordinates.
9. System creates Annotation (target_type='PAGE', target_id=page_id, annotation_category, context, coordinates, is_resolved=false).
10. Editor may create multiple annotations per page.
11. After reviewing all pages, editor clicks "Approve Chapter".
12. System calls `PATCH /chapters/:id/editor-review` with decision='APPROVED'.
13. System transitions Chapter.chapter_status = EDITOR_APPROVED.
14. System includes annotation summary in feedback (optional).
15. System notifies Mangaka (REVIEW: "Chapter '<title>' has been approved by editor").
16. Editor sees confirmation "Chapter approved".

**Alternate/Exception Flows:**
- **A1:** Editor requests changes → decision='IN_PROGRESS'; Chapter.chapter_status → IN_PROGRESS; Mangaka notified to revise.
- **A2:** Editor resolves annotation after Mangaka fixes it → Editor calls `PATCH /annotations/:id/resolve`; Annotation.is_resolved=true, resolved_at=NOW.

**Postconditions:**
- Chapter.chapter_status = EDITOR_APPROVED (or IN_PROGRESS if revision needed).
- Annotations created and linked to pages/chapter.
- Mangaka notified.
- Chapter ready for publication (if EDITOR_APPROVED).

**Related FRs:** FR-CHP-5, FR-CHP-6, FR-CHP-7, FR-ANN-1, FR-ANN-3, FR-ANN-4, FR-ANN-5

---

### UC-11: Mangaka Publishes Chapter

**Actor:** Mangaka  
**Goal:** Move chapter to published state and schedule for reader release.  
**Preconditions:**
- Chapter.chapter_status = EDITOR_APPROVED.
- Mangaka is authenticated and owns series.

**Main Flow:**
1. Mangaka navigates to `/series/:seriesId/chapters/:chapterId` (ChapterWorkspace).
2. Mangaka views chapter status (EDITOR_APPROVED).
3. Mangaka clicks "Publish".
4. System calls `PATCH /chapters/:id/status` with target_status='PUBLISHED'.
5. System validates transition EDITOR_APPROVED→PUBLISHED (via canTransition).
6. System sets Chapter.chapter_status = PUBLISHED, updated_at.
7. System auto-creates Publication_Schedule (chapter_id uniq, release_date=NOW or mangaka-specified date, publish_status=SCHEDULED).
8. System notifies editorial board (DECISION: "Chapter '<title>' has been published").
9. Mangaka sees confirmation "Chapter published; scheduled for release on <date>".

**Alternate/Exception Flows:**
- **A1:** Mangaka schedules future release → Mangaka specifies release_date in publish form; Publication_Schedule.release_date = future date; publish_status=SCHEDULED (not yet PUBLISHED).
- **A2:** Board cancels publication → Board calls service to set Publication_Schedule.publish_status=CANCELLED; Chapter may revert to EDITOR_APPROVED (service logic).

**Postconditions:**
- Chapter.chapter_status = PUBLISHED.
- Publication_Schedule created.
- Publication_Schedule.publish_status = SCHEDULED (or PUBLISHED if immediate).
- Board notified.
- Chapter visible to readers at release_date.

**Related FRs:** FR-CHP-3, FR-PUB-1, FR-PUB-2

---

### UC-12: Board Opens Voting Period & Members Vote

**Actor:** Editorial Board Member  
**Goal:** Open a voting period for ranking series and cast votes.  
**Preconditions:**
- Series exists (series_status = ACTIVE or AT_RISK).
- Multiple board members are activated.

**Main Flow:**
1. Board member navigates to `/board/rankings`.
2. Board member clicks "Open Voting Period".
3. Board member fills form: series selection, period_type (WEEKLY or MONTHLY), period_start_date, period_end_date.
4. System calls `POST /vote-periods` with series_id, ranking_period_type, dates.
5. System validates uniq(series_id, ranking_period_type, period_start_date).
6. System creates Vote_Period (series_id, ranking_period_type, period_start_date, period_end_date, status=OPEN).
7. System notifies all board members (RISK_ALERT or GENERAL: "Voting period open for series '<title>'").
8. Board member 1 navigates to voting form.
9. Board member 1 enters score (0.00–5.00 scale) and optional comment.
10. System calls `POST /votes` with vote_period_id, board_user_id, score, comment.
11. System validates uniq(vote_period_id, board_user_id); rejects if already voted.
12. System creates Vote record.
13. Board members 2, 3, 4, 5 each cast their votes similarly.
14. All votes recorded in Vote table.

**Alternate/Exception Flows:**
- **A1:** Board member changes vote → System allows update (or disallows; service defines); Vote updated or new Vote created (if uniq constraint per period/member prevents duplicate).

**Postconditions:**
- Vote_Period.status = OPEN.
- Vote records created (one per board member per period).
- Board members can view voting form and submit scores.
- Voting period visible in `/board/rankings` list.

**Related FRs:** FR-VOTE-1, FR-VOTE-2, FR-VOTE-3

---

### UC-13: Board Closes Voting Period & System Computes Rankings

**Actor:** Editorial Board Member  
**Goal:** Close voting period and compute rankings (total_score, risk_level).  
**Preconditions:**
- Vote_Period.status = OPEN.
- Multiple votes cast.
- Board member is authenticated.

**Main Flow:**
1. Board member navigates to `/board/rankings`.
2. Board member clicks "Close Period" on open period.
3. System calls `POST /vote-periods/:id/close`.
4. System transitions Vote_Period.status = OPEN → CLOSED.
5. System queries all Votes for the period; calculates total_score = SUM(Vote.score) / COUNT(votes).
6. System queries all series in period; ranks by total_score (rank_position = 1, 2, 3, ...).
7. System calculates risk_level per series (business rule: HIGH if total_score < 2.5, MEDIUM if 2.5–4.0, LOW if > 4.0; adjustable).
8. System creates Ranking record per series (series_id, vote_period_id, rank_position, total_score, risk_level, calculated_at=NOW).
9. System updates Series.series_status = AT_RISK for series with risk_level ≥ MEDIUM.
10. System notifies affected Mangakas (RISK_ALERT: "Series '<title>' is AT_RISK (rank <position>, score <score>)").
11. Board member sees confirmation "Period closed; rankings computed".

**Alternate/Exception Flows:**
- **A1:** Single series in period → rank_position=1; no other series to rank.

**Postconditions:**
- Vote_Period.status = CLOSED.
- Ranking records created (one per series per period).
- Series.series_status updated to AT_RISK (if applicable).
- Mangakas notified of risk status.
- Rankings visible in `/board/rankings` leaderboard.

**Related FRs:** FR-VOTE-4, FR-VOTE-5, FR-VOTE-6

---

### UC-14: Board Makes Editorial Decision (Continue/Cancel/Hiatus/Frequency Change)

**Actor:** Editorial Board Member  
**Goal:** Apply a decision to a series based on ranking/performance.  
**Preconditions:**
- Series exists.
- Ranking may exist (optional; decision can be made anytime).
- Board member is authenticated.

**Main Flow:**
1. Board member navigates to `/board/rankings`.
2. Board member selects series and clicks "Make Decision".
3. Board member opens decision form (series, decision_type, reason, new_frequency if applicable).
4. Board member chooses decision_type: CONTINUE, CANCEL, HIATUS, or CHANGE_FREQUENCY.
5. If CHANGE_FREQUENCY, board member selects new_frequency (WEEKLY or MONTHLY).
6. Board member enters reason (optional).
7. System calls `POST /decisions` with series_id, decision_type, reason, new_frequency.
8. System creates Decision (series_id, decision_type, reason, decided_by=board_member, decided_at=NOW).
9. System applies decision:
   - **CONTINUE:** Series.series_status = ACTIVE (no change if already ACTIVE).
   - **CANCEL:** Series.series_status = CANCELLED; notifies Mangaka (DECISION: "Series '<title>' has been cancelled").
   - **HIATUS:** Series.series_status = HIATUS; notifies Mangaka (DECISION: "Series '<title>' is on hiatus").
   - **CHANGE_FREQUENCY:** Series.publication_frequency = new_frequency; notifies Mangaka (DECISION: "Series '<title>' frequency changed to <new_frequency>").
10. System notifies Mangaka with decision details.
11. Board member sees confirmation "Decision applied".

**Alternate/Exception Flows:**
- **A1:** Decision contradicts series status → System allows; decision overrides status (e.g., CANCELLED overrides AT_RISK).

**Postconditions:**
- Decision record created.
- Series status/frequency updated.
- Mangaka notified.
- Decision visible in series history (`GET /decisions?seriesId=`).

**Related FRs:** FR-DEC-1, FR-DEC-2, FR-DEC-3, FR-DEC-4, FR-DEC-5, FR-DEC-6, FR-DEC-7

---

### UC-15: Assistant Views Earnings & Earned Tasks

**Actor:** Assistant  
**Goal:** Track earnings from approved tasks.  
**Preconditions:**
- Assistant is authenticated.
- One or more tasks have been approved (submission APPROVED).

**Main Flow:**
1. Assistant navigates to `/earnings`.
2. System calls `GET /earnings/mine`.
3. System queries all approved Submissions for assistant.
4. System sums Assistant_Profile.total_earnings (accrued from task approvals).
5. System compiles task list: task_id, page description, region_type, earned_amount (Task.payment_amount), earnedAt (Submission.reviewed_at), hasDispute (bool: Earning_Dispute exists & OPEN).
6. System displays summary card: "Total Earnings: <total>".
7. System displays task table: earnings, dates, dispute status.
8. Assistant sees all earned tasks and cumulative total.

**Alternate/Exception Flows:**
- **A1:** No approved tasks → System displays "No earnings yet. Complete and submit tasks to earn."
- **A2:** Task has open dispute → System marks hasDispute=true; "Dispute Pending" label shown.

**Postconditions:**
- Assistant has visibility into earned amounts.
- Assistant can drill into task details for additional info.
- Earnings used in `/earnings` interface.

**Related FRs:** FR-EARN-1, FR-EARN-2, FR-EARN-3

---

### UC-16: Assistant Opens Earning Dispute on Approved Task

**Actor:** Assistant  
**Goal:** Challenge the earned amount and request admin review/adjustment.  
**Preconditions:**
- Task exists with status APPROVED.
- Assistant is authenticated and is task assignee.
- No prior dispute exists (or prior dispute is REJECTED/RESOLVED).

**Main Flow:**
1. Assistant navigates to `/earnings`.
2. Assistant reviews task list and identifies task with incorrect payment (e.g., incorrect base_price rule applied).
3. Assistant clicks "Dispute" on task.
4. System opens dispute form: dispute_reason (text), expected_amount (decimal).
5. Assistant fills form: reason ("Pricing rule should have been applied per <detail>"), expected_amount (desired amount).
6. System calls `POST /disputes` with task_id, dispute_reason, expected_amount.
7. System creates Earning_Dispute (assistant_user_id, task_id, dispute_reason, expected_amount, dispute_status=OPEN, created_at=NOW).
8. System notifies all ADMIN users (DISPUTE: "New dispute open by <assistant> for task <task_id>; expected <expected_amount>").
9. Assistant sees confirmation "Dispute submitted; awaiting admin review".

**Alternate/Exception Flows:**
- **A1:** Dispute already exists for task → System rejects; "Dispute already open for this task".

**Postconditions:**
- Earning_Dispute created with status=OPEN.
- Admins notified immediately.
- Dispute visible in `/admin/disputes` and Assistant's `/earnings` disputes tab.

**Related FRs:** FR-DISP-1, FR-DISP-2, FR-DISP-3

---

### UC-17: Admin Reviews & Resolves Dispute (with Adjustment)

**Actor:** Admin  
**Goal:** Investigate dispute claim and resolve with optional payment adjustment.  
**Preconditions:**
- Earning_Dispute exists (dispute_status=OPEN or UNDER_REVIEW).
- Admin is authenticated.

**Main Flow:**
1. Admin navigates to `/admin/disputes`.
2. System displays all open disputes (assistant, task, reason, expected_amount, status).
3. Admin clicks dispute to view details.
4. Admin reviews: task history, original pricing rule applied, assistant's claim.
5. Admin clicks "Review".
6. System calls `PATCH /disputes/:id/review`.
7. System transitions Earning_Dispute.dispute_status = OPEN → UNDER_REVIEW.
8. Admin investigates (manual review in admin interface; may check task_price_rule history, etc.).
9. Admin determines adjustment needed (e.g., expected_amount is valid; Task.payment_amount was incorrect).
10. Admin clicks "Resolve".
11. System opens resolution form: outcome (RESOLVED or REJECTED), adjustedAmount (if RESOLVED), resolution_note.
12. Admin enters: outcome='RESOLVED', adjustedAmount=2500 (higher than original 2000), resolution_note="Pricing rule should have applied higher base_price per region type UPDATE dated 2026-05-20".
13. System calls `PATCH /disputes/:id/resolve` with outcome, adjustedAmount, resolution_note.
14. System sets Earning_Dispute.dispute_status = RESOLVED, resolved_by=admin, resolved_at=NOW, resolution_note.
15. System calculates delta = adjustedAmount − original Task.payment_amount = 2500 − 2000 = 500.
16. System updates Task.payment_amount = adjustedAmount = 2500.
17. System updates Assistant_Profile.total_earnings += delta = +500 (assistant previously earned 2000; now total includes additional 500).
18. System notifies assistant (DISPUTE: "Dispute resolved! Adjustment: +500. New earned amount: 2500").
19. Admin sees confirmation "Dispute resolved; adjustment applied".

**Alternate/Exception Flows:**
- **A1:** Admin rejects dispute → outcome='REJECTED'; resolution_note="Pricing was correct per rule version at task creation date"; Earning_Dispute.dispute_status=REJECTED; no adjustment; Assistant notified (DISPUTE: "Dispute rejected. Original payment stands.").
- **A2:** Assistant expected amount is lower than original → delta is negative; Assistant_Profile.total_earnings -= |delta| (recovery; used for fraud/overpayment reversal).

**Postconditions:**
- Earning_Dispute.dispute_status = RESOLVED (or REJECTED).
- Task.payment_amount updated (if resolved with adjustment).
- Assistant_Profile.total_earnings adjusted by delta.
- Assistant notified with outcome.
- Dispute visible in admin/assistant history.

**Related FRs:** FR-DISP-4, FR-DISP-5, FR-DISP-6, FR-DISP-7, FR-DISP-8

---

### UC-18: Admin Manages Users (Activate, Role Assignment, Last-Admin Guard)

**Actor:** Admin  
**Goal:** Activate newly registered users and assign/modify roles safely.  
**Preconditions:**
- Admin is authenticated.
- User exists (e.g., created via Google OAuth but not yet activated).

**Main Flow:**
1. Admin navigates to `/admin`.
2. System displays user list (email, name, role, is_activated).
3. Admin identifies unactivated user (is_activated=false).
4. Admin clicks on user row to edit.
5. Admin views user detail form: email, full_name, role dropdown, is_activated toggle.
6. Admin checks is_activated toggle (false → true).
7. Admin selects role (e.g., ASSISTANT).
8. System calls `PATCH /admin/users/:id` with is_activated=true, role=ASSISTANT.
9. Service validates: User.is_activated = true, User.role = ASSISTANT, updated_at=NOW.
10. System records update in audit log (if implemented).
11. Admin clicks "Save".
12. System confirms "User activated as ASSISTANT".

**Alternate/Exception Flows (Last-Admin Guard):**
- **A1:** Admin attempts to demote last ADMIN user → User is authenticated as ADMIN, only ADMIN in system.
  - Admin clicks on self user to edit.
  - Admin changes role to MANGAKA (via dropdown).
  - System calls `PATCH /admin/users/:id` with role=MANGAKA.
  - Service validates: COUNT(User WHERE role=ADMIN AND is_activated=true) = 1 (only self).
  - Service rejects with 400 Bad Request: "Cannot demote the last active admin. Ensure another admin exists before demotion."
  - Admin sees error message; user role unchanged.

- **A2:** Admin deactivates last ADMIN user → Similar guard; rejects deactivation if would leave zero active admins.

- **A3:** Two admins exist; one admin demotes other → Service allows (at least one admin remains). First admin remains ADMIN; second is changed.

**Postconditions:**
- User.is_activated = true (or unchanged if already true).
- User.role updated (if modified; last-admin guard may prevent).
- User can now log in and access role-based features.
- Audit log recorded.

**Related FRs:** FR-AUTH-5, FR-AUTH-6, FR-AUTH-7, FR-ADM-2, FR-ADM-3, FR-ADM-4

---

## Traceability

Every functional requirement maps to one or more REST API endpoints (documented in `../03-api/01-api-reference.md`) and web pages (documented in `../05-roles/`). Non-functional requirements address security (JWT+RBAC, ownership checks), performance (connection pooling, lazy AI), usability (role-aware nav, a11y), privacy (on-device AI), and maintainability (shared enums, raw SQL, transitions). Use cases document complete workflows (login, proposal→approval→series→chapter→task→submission→earnings→dispute) and demonstrate how actors interact with the system via endpoints and pages. Traceability is enforced at implementation: each endpoint validates role (RolesGuard), each page checks auth and role (Protected component), and each state transition validates via canTransition utility. This ensures requirements and code remain aligned across all 29 database tables, 50+ API routes, and 10+ web pages.