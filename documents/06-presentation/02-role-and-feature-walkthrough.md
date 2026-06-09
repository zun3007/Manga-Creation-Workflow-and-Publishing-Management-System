---
marp: true
theme: gaia
paginate: true
header: 'Role & Feature Walkthrough'
---

# Role & Feature Walkthrough
## Manga Creation Workflow & Publishing Management System

How each role uses the system, screen by screen, with deep dives into core features.

---

## Agenda

**Part A — Role Walkthroughs** (5 sections)
- Mangaka (creator & proposal author)
- Assistant (task executor & earner)
- Tantou Editor (chapter-level reviewer)
- Editorial Board (governance & risk)
- Admin (user management & disputes)

**Part B — Feature Deep-Dives** (8 sections)
- Proposal to Series Auto-Creation
- Production Setup (Chapter → Region → Task)
- Submission & Earnings Accrual
- Editor Review & Annotations
- Publishing & Schedule
- Governance: Voting, Ranking, Decisions
- Earnings Disputes & Admin Resolution
- Studio & On-Device AI

---

# Part A: Role Walkthroughs

---

## Role: Mangaka (Tổng quan / Đề xuất / Series / Chờ duyệt / Hồ sơ)

### Navigation & Screens
| VN Label | Route | Purpose |
|----------|-------|---------|
| Tổng quan | `/` | Dashboard (series count, submissions pending, tasks in progress, notifications bell) |
| Đề xuất | `/proposals` | Author series proposals; see review queue status |
| Series | `/series` | Manage chapters, pages, regions, tasks for approved series; chapter publish requires ALL pages COMPLETED |
| Chờ duyệt | `/review` | Review assistant submissions; approve or request changes |
| Hồ sơ | `/users/me` | Edit profile (name, bio), upload avatar to S3; view account settings |

**Key Endpoints:**
- `POST /api/proposals` — create new proposal (DRAFT)
- `PATCH /api/proposals/:id/submit` — submit to board review
- `GET /api/series/mine` — list approved series
- `POST /api/chapters` — create chapter for a series
- `POST /api/pages` — add pages to chapter
- `POST /api/regions` — define panels/bubbles on page (auto-prices tasks)
- `GET /api/submissions/review-queue` — pending submissions for approval
- `PATCH /api/submissions/:id/review` — APPROVED (accrues earnings) or REVISION_REQUIRED

### Demo Click-Path (Submission Lifecycle)
1. Go to `/review` → see pending submissions list
2. Click submission → expand editor annotations (if any)
3. Review artwork/work against page region + annotation feedback
4. Click **Approve** (state: SUBMISSION.UNDER_REVIEW → APPROVED; Assistant.total_earnings += Task.payment_amount)
   OR click **Request Changes** (state: → REVISION_REQUIRED; assistant notified to revise)
5. Notification bell shows activity; submission removed from queue on approval

See: `../05-roles/01-mangaka.md`

---

## Role: Assistant (Tổng quan / Việc của tôi / Thu nhập / Hồ sơ)

### Navigation & Screens
| VN Label | Route | Purpose |
|----------|-------|---------|
| Tổng quan | `/` | Dashboard (total earnings, current tasks, disputes, notifications bell) |
| Việc của tôi | `/my-tasks` | List assigned tasks; start work, upload submission; optimistic revert on error |
| Thu nhập | `/earnings` | Lifetime earnings; per-task breakdown; open disputes; optimistic revert on error |
| Hồ sơ | `/users/me` | Edit profile (name, bio), upload avatar to S3; view account settings |

**Key Endpoints:**
- `GET /api/tasks/mine` — assigned tasks (ASSIGNED, IN_PROGRESS, SUBMITTED)
- `PATCH /api/tasks/:id/start` — begin work (ASSIGNED → IN_PROGRESS)
- `POST /api/submissions` — upload completed work + version note (task → SUBMITTED)
- `GET /api/earnings/mine` — total + per-task approved amounts
- `POST /api/disputes` — open dispute on an APPROVED task (if disagree with payment)
- `GET /api/disputes/mine` — own open/resolved disputes

### Demo Click-Path (Task Execution)
1. Go to `/my-tasks` → see panel of assigned regions
2. Click a task → see region on page (Studio draw canvas embedded or linked)
3. Click **Start Work** (ASSIGNED → IN_PROGRESS; task locked from reassignment)
4. Open `/studio/region/:taskId` → in-browser drawing + AI assists
   - Use Studio tools: **Brush, Fill, Eraser, Selection (marching ants), Transform, Text, Bubble, Panel Border**
   - **Colors**: pick foreground/background; swap with **X** or **D** key
   - **Layer Ops**: duplicate, merge, flatten, paste layers; all reversible with **Undo/Redo**
   - **Autosave**: work auto-saves every 30s to IndexedDB; restore-draft on crash; unsaved-changes guard
   - Enable **AI** (if available): YOLO panel detect, SAM smart-select, DeOldify colorize; **cancellable** with fallback
5. Click **Save & Submit** → upload file + note (SUBMITTED; mangaka notified)
6. Check `/earnings` → on mangaka's APPROVE, earnings show + "earnedAt" timestamp with optimistic revert on error
7. If disputed by admin later, see resolution note + possible amount adjustment
8. **Notifications bell** shows task assignments, revision requests, approvals, dispute resolutions (20s polling)

See: `../05-roles/02-assistant.md`

---

## Role: Tantou Editor (Tổng quan / Duyệt chương / Hồ sơ)

### Navigation & Screens
| VN Label | Route | Purpose |
|----------|-------|---------|
| Tổng quan | `/` | Dashboard (assigned series count, reviews pending, notifications bell) |
| Duyệt chương | `/editor/review` | Chapter review queue (scoped to assigned series only); series assignments and chapter updates (20s polling) |
| Hồ sơ | `/users/me` | Edit profile (name, bio), upload avatar to S3; view account settings |

**Key Endpoints:**
- `GET /api/chapters/review-queue` — chapters READY_FOR_EDITOR_REVIEW (assigned series only)
- `GET /api/chapters/:id/pages` — view all pages + regions + submissions
- `POST /api/annotations` — add editorial feedback (content/dialogue/script/visual/general issues)
- `GET /api/annotations?targetType=PAGE&targetId=` — retrieve annotations per page/manuscript/submission
- `PATCH /api/annotations/:id/resolve` — mark feedback as addressed
- `PATCH /api/chapters/:id/editor-review` — EDITOR_APPROVED (releases to publishing) or request revisions

### Demo Click-Path (Chapter Review)
1. Go to `/editor/review` → see chapters awaiting approval (scoped to your assigned series)
2. Click chapter → expand all pages, regions, submissions
3. For each region/page:
   - Review submitted artwork (final submission image + version history)
   - If issues found: click **Add Annotation** → select category (DIALOGUE_ISSUE, VISUAL_ISSUE, etc.)
   - Draw annotation on page (x, y coordinates); add context comment
   - Annotations persist until editor marks "resolved"
4. Once all feedback added, click **Submit Review** → choose:
   - **EDITOR_APPROVED** (chapter → PUBLISHED; mangaka notified; auto-triggers Publication_Schedule)
   - **Request Revisions** (chapter → IN_PROGRESS; mangaka + assistants notified; loop)
5. Dashboard updates: "Chapters Reviewed" counter increments

See: `../05-roles/03-tantou-editor.md`

---

## Role: Editorial Board (Tổng quan / Duyệt đề xuất / Phân công BT / Xếp hạng / Hồ sơ)

### Navigation & Screens
| VN Label | Route | Purpose |
|----------|-------|---------|
| Tổng quan | `/` | Dashboard (proposals pending, series at risk, pending votes, notifications bell) |
| Duyệt đề xuất | `/board/proposals` | Review & approve/reject proposals → auto-creates Series; proposal submissions (20s polling) |
| Phân công BT | `/board/series` | Assign Tantou editors to series (1 editor per series at a time); series status updates |
| Xếp hạng | `/board/rankings` | Open vote periods, cast votes, close period → compute rankings, decide fate; risk alerts |
| Hồ sơ | `/users/me` | Edit profile (name, bio), upload avatar to S3; view account settings |

**Key Endpoints:**
- `GET /api/proposals/review-queue` — proposals SUBMITTED/UNDER_REVIEW
- `PATCH /api/proposals/:id/decision` — APPROVED (auto-creates Series) or REJECTED
- `GET /api/series/all` — all series (for editor assignment)
- `PUT /api/series/:id/editor` — assign active Tantou editor
- `DELETE /api/series/:id/editor` — unassign (sets unassigned_at)
- `POST /api/vote-periods` — open WEEKLY/MONTHLY voting
- `GET /api/vote-periods/open` — current open periods
- `POST /api/votes` — cast board vote (uniq per member per period; score + comment)
- `POST /api/vote-periods/:id/close` — compute Ranking (rank_position, total_score, risk_level); set Series AT_RISK if risk=HIGH
- `GET /api/rankings` — leaderboard (sortable)
- `POST /api/decisions` — apply CONTINUE/CANCEL/CHANGE_FREQUENCY/HIATUS to series (updates Series.series_status)

### Demo Click-Path (End-to-End Governance)
1. Go to `/board/proposals` → see SUBMITTED proposals
2. Click proposal → see title, synopsis, genres, proposed frequency
   - Click **Approve** (creates Series with same title, status=ACTIVE, publication_frequency matches proposal)
   - OR **Reject** (notifies mangaka)
3. Go to `/board/series` → list all series
   - Click series → assign Tantou editor (notify editor; editor gains visibility in `/editor/review`)
4. Go to `/board/rankings` → click **Open New Period** (WEEKLY/MONTHLY)
   - Period now OPEN; all board members can vote
5. (As a board member) cast vote on series: score (1–100) + optional comment
   - Vote recorded (uniq per member per period)
6. Once voting period done, click **Close Period**
   - System computes Ranking for each series: rank_position, total_score, risk_level (LOW/MEDIUM/HIGH based on score)
   - Series with risk=HIGH → Series.series_status = AT_RISK; mangaka notified
7. Click **Make Decision** on a ranking
   - Select decision type (CONTINUE/CANCEL/CHANGE_FREQUENCY/HIATUS)
   - For CHANGE_FREQUENCY, choose new frequency (WEEKLY/MONTHLY)
   - Decision applied; Series updated; mangaka + editor notified

See: `../05-roles/04-editorial-board.md`

---

## Role: Admin (Tổng quan / Quản trị / Khiếu nại / Hồ sơ)

### Navigation & Screens
| VN Label | Route | Purpose |
|----------|-------|---------|
| Tổng quan | `/` | Dashboard (active users, recent disputes, system health, notifications bell) |
| Quản trị | `/admin` | User management: activate accounts, assign roles (with last-admin guard); rate-limiting & security monitoring |
| Khiếu nại | `/admin/disputes` | Resolve assistant earning disputes (with amount adjustment); exception filtering & path-traversal guards |
| Hồ sơ | `/users/me` | Edit profile (name, bio), upload avatar to S3; view account settings |

**Key Endpoints:**
- `GET /api/admin/users` — list all users (created, activated, role)
- `PATCH /api/admin/users/:id` — activate/change role (guard: cannot remove last ADMIN)
- `GET /api/admin/overview` — system summary (user count, active series, revenue)
- `GET /api/disputes` — all disputes (OPEN, UNDER_REVIEW, RESOLVED, REJECTED)
- `PATCH /api/disputes/:id/review` — begin investigation (OPEN → UNDER_REVIEW)
- `PATCH /api/disputes/:id/resolve` — finalize (UNDER_REVIEW → RESOLVED or REJECTED)
  - Optional `adjustedAmount`: if supplied, Task.payment_amount += delta, Assistant_Profile.total_earnings += delta
  - Notify assistant of outcome + new balance

### Demo Click-Path (Dispute Resolution)
1. Go to `/admin/disputes` → filter by OPEN status
2. Click dispute → see:
   - Assistant name, task region, original payment_amount
   - Dispute reason (e.g., "price too low for complexity")
   - Expected amount (what assistant claims should be paid)
3. Click **Begin Review** (OPEN → UNDER_REVIEW)
4. Investigate (check task, region type, base_price_rule, submission quality)
5. Click **Resolve**
   - If justified: set adjustedAmount = (expected_amount - original_amount)
     - Task.payment_amount updated
     - Assistant.total_earnings += delta (reflected in `/earnings`)
   - If not: leave blank (no adjustment)
   - Add resolution note (shared with assistant)
6. Mark RESOLVED → assistant notified; appears in their dispute history

See: `../05-roles/05-admin.md`

---

# Part B: Feature Deep-Dives

---

## Feature: Proposal → Board Approval → Series Auto-Creation

### State Machine
```
Proposal:
  DRAFT → [SUBMITTED]
  SUBMITTED → [UNDER_REVIEW, APPROVED, REJECTED]
  UNDER_REVIEW → [APPROVED, REJECTED]
  APPROVED → [] (terminal)
  REJECTED → [] (terminal)
```

### Lifecycle & Endpoints
1. **Mangaka creates proposal** `POST /api/proposals`
   - Body: title, synopsis, proposed_frequency (WEEKLY/MONTHLY), genres (M-N via Proposal_Genre)
   - Initial state: DRAFT
   - Stored in Series_Proposal table

2. **Mangaka submits to board** `PATCH /api/proposals/:id/submit`
   - Proposal: DRAFT → SUBMITTED
   - Board members notified: "New proposal from [Mangaka]"

3. **Board reviews** (visible in `/board/proposals`)
   - Proposal: SUBMITTED → UNDER_REVIEW (implicit on first board view or explicit state)

4. **Board decision** `PATCH /api/proposals/:id/decision` [EDITORIAL_BOARD]
   - **Approve:**
     - Proposal: UNDER_REVIEW → APPROVED
     - **Auto-creates Series:** `INSERT Series (proposal_id, mangaka_user_id, title, publication_frequency, series_status='ACTIVE')`
     - All data copied from Proposal (title, mangaka, frequency)
     - Series.series_id returned to caller
     - Mangaka + board notified: "Proposal approved! Series created."
   - **Reject:**
     - Proposal: UNDER_REVIEW → REJECTED
     - Mangaka notified: "Proposal rejected."

### Key Tables & Transitions
- Series_Proposal (enum proposal_status; uniq constraint on proposal_id→series_id)
- Series (FK proposal_id UNIQ; enum series_status)
- Series_Genre (copied from Proposal_Genre on approval)

---

## Feature: Production Setup (Chapter → Page → Region → Priced Task)

### Workflow
Once a Series is ACTIVE, Mangaka begins production:

1. **Create Chapter** `POST /api/chapters` [MANGAKA]
   - Body: series_id, chapter_number, chapter_title, deadline
   - Initial state: DRAFT; locked=false
   - Notification: mangaka confirms chapter structure

2. **Create Pages** `POST /api/pages` [MANGAKA]
   - Body: chapter_id, page_number
   - Initial state: RAW
   - Page_Version auto-created (v1; empty image_url until upload)

3. **Define Regions** `POST /api/regions` [MANGAKA]
   - Body: page_id, page_version_id, region_type (PANEL/BACKGROUND/CHARACTER/DIALOGUE_BUBBLE/EFFECT), x, y, width, height, z_index
   - Regions are drawable containers (panel coords on the raster)

4. **Auto-Price Task** `POST /api/tasks` [MANGAKA]
   - Triggered by region creation (or explicit endpoint)
   - Lookup active Task_Price_Rule where region_type matches
   - Task.payment_amount = base_price (PANEL=$50, DIALOGUE_BUBBLE=$20, etc.)
   - Task state: ASSIGNED (awaits assistant pickup)
   - Notification: assigned assistant receives task assignment

### State Transitions
```
Chapter:  DRAFT → IN_PROGRESS → READY_FOR_EDITOR_REVIEW → EDITOR_APPROVED → PUBLISHED
Page:     RAW → ASSIGNED → IN_PROGRESS → REVIEWING → COMPLETED
Task:     ASSIGNED → IN_PROGRESS → SUBMITTED → [APPROVED | REVISION_REQUIRED]
Submission: PENDING → UNDER_REVIEW → [APPROVED | REVISION_REQUIRED | REJECTED]
```

### Key Endpoints
- `POST /api/chapters`
- `POST /api/pages`
- `POST /api/regions`
- `POST /api/tasks` (auto-pricing via Task_Price_Rule join on region_type)

---

## Feature: Submission & Earnings Accrual

### Assistant Workflow
1. **Assistant picks up task** `PATCH /api/tasks/:id/start` [ASSISTANT]
   - Task: ASSIGNED → IN_PROGRESS
   - Assistant locks task (cannot be reassigned)
   - Page: RAW → ASSIGNED (if not already)

2. **Assistant completes work** (in Studio or external tool)
   - Opens `/studio/region/:taskId` (optional in-browser Studio)
   - Uses brushes, fill, text, AI assists (YOLO, SAM, colorize)
   - Downloads or saves to canvas doc

3. **Submit work** `POST /api/submissions` [ASSISTANT]
   - Body: task_id, file_url (upload via POST /api/uploads), version_note
   - Submission record created (uniq on task_id, version_number)
   - Submission state: PENDING
   - Task state: SUBMITTED
   - Page state: IN_PROGRESS → REVIEWING
   - Mangaka notified: "New submission ready for review"

### Mangaka Review (Approval Path)
4. **Mangaka reviews** `GET /api/submissions/review-queue` [MANGAKA]
   - Lists all submissions awaiting approval for mangaka's series

5. **Mangaka approves** `PATCH /api/submissions/:id/review` [MANGAKA]
   - Body: review_status, feedback (optional)
   - **If APPROVED:**
     - Submission: PENDING → UNDER_REVIEW → APPROVED
     - Task: SUBMITTED → APPROVED
     - **Earnings Accrual:** `Assistant_Profile.total_earnings += Task.payment_amount`
     - Assistant.earnedAt = now
     - Page: REVIEWING → COMPLETED (if all regions approved)
     - Assistant notified: "Work approved! +$X earned."
     - Earnings appear in `/earnings/mine`
   - **If REVISION_REQUIRED:**
     - Submission: → REVISION_REQUIRED
     - Task: → REVISION_REQUIRED
     - Assistant notified: "Please revise. Feedback: [mangaka comment]"
     - Assistant can resubmit new version (Submission.version_number increments)

### Key Tables
- Submission (uniq task_id, version_number; references Submission → many versions per task)
- Assistant_Profile (total_earnings DECIMAL; accrues on APPROVED)
- Task (payment_amount auto-set from Task_Price_Rule)

---

## Feature: Editor Review & Polymorphic Annotations

### Tantou Editor Workflow
1. **Editor assigned to series** `PUT /api/series/:id/editor` [EDITORIAL_BOARD]
   - Notification: new editor receives "You've been assigned to Series [X]"
   - Editor now sees series in `/editor/review` queue

2. **Chapter ready for editor review**
   - Mangaka submits all regions' work and approves (or all APPROVED via revision loop)
   - Chapter: IN_PROGRESS → READY_FOR_EDITOR_REVIEW
   - Editor notified: "Chapter [X] ready for editorial review"

3. **Editor views chapter** `GET /api/chapters/:id/pages` [TANTOU_EDITOR]
   - Retrieves all pages, regions, final submissions (APPROVED work)
   - Displays page canvas + submission images

4. **Editor adds annotations** `POST /api/annotations` [TANTOU_EDITOR]
   - Body: target_type (PAGE/MANUSCRIPT/SUBMISSION), target_id, annotation_category, x, y, context
   - Annotation_category: CONTENT_ISSUE, DIALOGUE_ISSUE, SCRIPT_ISSUE, VISUAL_ISSUE, GENERAL
   - Stored as Annotation record (not on submission — can annotate page, manuscript, or submission independently)
   - Mangaka can view all annotations on chapter pages

5. **Editor resolves/closes feedback** `PATCH /api/annotations/:id/resolve` [TANTOU_EDITOR]
   - Sets is_resolved=true, resolved_at=now (optional)
   - Annotations remain in history

6. **Editor submits chapter review** `PATCH /api/chapters/:id/editor-review` [TANTOU_EDITOR]
   - Body: approval_decision (APPROVED or REQUEST_REVISIONS), feedback (optional)
   - **If APPROVED:**
     - Chapter: READY_FOR_EDITOR_REVIEW → EDITOR_APPROVED
     - Triggers auto-publish workflow: Chapter → PUBLISHED, Publication_Schedule created with release_date=now
     - Mangaka + assistants notified: "Chapter approved for publication!"
   - **If REQUEST_REVISIONS:**
     - Chapter: → IN_PROGRESS (loops back for mangaka/assistant fixes)
     - Mangaka notified with feedback; can reassign pages/tasks

### Annotation Polymorphism
Annotations are **not tied to submissions**; they target PAGE, MANUSCRIPT, or SUBMISSION independently. An editor can:
- Annotate a page region (VISUAL_ISSUE on panel composition)
- Annotate the manuscript (SCRIPT_ISSUE on dialogue)
- Annotate a submission (CONTENT_ISSUE on specific assistant's work)

This decouples editorial feedback from submission approval (mangaka may approve submission, but editor may request story changes at chapter level).

### Key Endpoints
- `GET /api/chapters/review-queue` [TANTOU_EDITOR]
- `GET /api/chapters/:id/pages` [TANTOU_EDITOR]
- `POST /api/annotations` [TANTOU_EDITOR]
- `GET /api/annotations?targetType=PAGE&targetId=`
- `PATCH /api/annotations/:id/resolve`
- `PATCH /api/chapters/:id/editor-review` [TANTOU_EDITOR]

---

## Feature: Publishing & Schedule

### Publication Workflow
1. **Editor approves chapter**
   - `PATCH /api/chapters/:id/editor-review` with APPROVED decision
   - System auto-triggers:
     - Chapter: EDITOR_APPROVED → PUBLISHED
     - `INSERT Publication_Schedule (chapter_id, release_date=now, publish_status='PUBLISHED', scheduled_by_user_id=editor_id, published_at=now)`

2. **Manual schedule (optional)**
   - Mangaka or editor can call `POST /api/publication-schedule` (if endpoint exists; verify in code)
   - Body: chapter_id, release_date (future date)
   - Publication_Schedule: SCHEDULED
   - Automated job (external) can transition SCHEDULED → PUBLISHED at release_date

3. **Publication visible to readers** (outside scope of studio tool, but implies downstream reader system)
   - Chapter data + all Page versions + regions available via public API (if enabled)

### Key Tables
- Publication_Schedule (uniq chapter_id; enum publish_status: SCHEDULED/PUBLISHED/CANCELLED)
- Chapter (enum chapter_status: DRAFT → IN_PROGRESS → READY_FOR_EDITOR_REVIEW → EDITOR_APPROVED → PUBLISHED)

### State Transition
```
Chapter:            EDITOR_APPROVED → PUBLISHED
Publication_Schedule: SCHEDULED → PUBLISHED (scheduled job)
                     or SCHEDULED → CANCELLED (if editor cancels)
```

---

## Feature: Governance — Voting, Ranking, Decisions

### Vote Period Lifecycle
1. **Board opens a vote period** `POST /api/vote-periods` [EDITORIAL_BOARD]
   - Body: series_id, ranking_period_type (WEEKLY/MONTHLY)
   - Creates Vote_Period (status=OPEN; period_start_date, period_end_date auto-computed from period_type)
   - Board notified: "Voting period open for [Series]"

2. **Board members vote** `POST /api/votes` [EDITORIAL_BOARD]
   - Body: vote_period_id, score (1–100), comment (optional)
   - Constraint: uniq(vote_period_id, board_user_id) — one vote per member per period
   - Vote stored in Vote table
   - Board member sees live vote count updating

3. **Board closes period** `POST /api/vote-periods/:id/close` [EDITORIAL_BOARD]
   - Triggers ranking computation:
     - For each series in period, create Ranking record:
       - rank_position = rank (by total_score descending, uniq per vote_period)
       - total_score = SUM(votes.score) / COUNT(board members)
       - risk_level = LOW (score ≥ 80), MEDIUM (60–79), HIGH (< 60)
     - Series with risk=HIGH: Series.series_status = AT_RISK
     - Series with risk=LOW/MEDIUM: remain ACTIVE
     - Mangaka of AT_RISK series notified: "Series at risk; board may decide to cancel/hiatus"
   - Vote_Period: OPEN → CLOSED

4. **Board makes decision** `POST /api/decisions` [EDITORIAL_BOARD]
   - Body: ranking_id (or series_id), decision_type (CONTINUE/CANCEL/CHANGE_FREQUENCY/HIATUS), new_frequency (if CHANGE_FREQUENCY)
   - Decision applied:
     - CONTINUE: Series.series_status remains ACTIVE
     - CANCEL: Series.series_status = CANCELLED (no new chapters allowed)
     - HIATUS: Series.series_status = HIATUS (temporary pause; can resume)
     - CHANGE_FREQUENCY: Series.publication_frequency = new_frequency (WEEKLY → MONTHLY, etc.)
   - Decision stored; mangaka notified: "Board decided: [decision_type]"

### Key Endpoints & Tables
- `POST /api/vote-periods` — create period
- `GET /api/vote-periods/open` — list open periods
- `POST /api/votes` — cast vote (uniq constraint)
- `POST /api/vote-periods/:id/close` — compute ranking + risk
- `GET /api/rankings` — leaderboard (sortable)
- `POST /api/decisions` — apply decision to series

### Tables
- Vote_Period (enum status: OPEN/CLOSED; uniq series_id, ranking_period_type, period_start_date)
- Vote (uniq vote_period_id, board_user_id)
- Ranking (uniq series_id, vote_period_id; enum risk_level: LOW/MEDIUM/HIGH)
- Decision (FK ranking_id; enum decision_type: CONTINUE/CANCEL/CHANGE_FREQUENCY/HIATUS)

---

## Feature: Earnings & Disputes (Admin Resolution)

### Earnings Accrual
- On Submission APPROVED by Mangaka:
  - `Assistant_Profile.total_earnings += Task.payment_amount`
  - Timestamp earnedAt recorded
  - Entry visible in `GET /api/earnings/mine` (list approved tasks + amounts)

### Dispute Lifecycle
1. **Assistant opens dispute** `POST /api/disputes` [ASSISTANT]
   - Body: task_id (must be APPROVED), dispute_reason, expected_amount
   - Dispute state: OPEN
   - Admin notified: "New earning dispute from [Assistant]"

2. **Admin begins review** `PATCH /api/disputes/:id/review` [ADMIN]
   - Dispute: OPEN → UNDER_REVIEW

3. **Admin investigates & resolves** `PATCH /api/disputes/:id/resolve` [ADMIN]
   - Body: resolution_status (RESOLVED or REJECTED), resolution_note, adjustedAmount (optional, signed decimal)
   - **If RESOLVED with adjustedAmount:**
     - Task.payment_amount += adjustedAmount (e.g., +$10 or −$5)
     - Assistant_Profile.total_earnings += adjustedAmount
     - Dispute: UNDER_REVIEW → RESOLVED
     - Assistant notified: "Dispute resolved. New amount: $X. Note: [admin reason]"
   - **If REJECTED:**
     - No payment adjustment
     - Dispute: UNDER_REVIEW → REJECTED
     - Assistant notified: "Dispute rejected. Original amount stands: $X."

### Key Tables & State
```
Earning_Dispute:
  OPEN → UNDER_REVIEW → [RESOLVED | REJECTED]
  (RESOLVED and REJECTED are terminal)
```

- Earning_Dispute (FK task_id, assistant_user_id; enum dispute_status)
- Task (payment_amount mutable via admin adjustment)
- Assistant_Profile (total_earnings: SUM of approved task payments)

### Key Endpoints
- `GET /api/earnings/mine` [ASSISTANT] — list approved tasks + totals
- `POST /api/disputes` [ASSISTANT] — open dispute
- `GET /api/disputes/mine` [ASSISTANT] — own disputes
- `GET /api/disputes` [ADMIN] — all disputes
- `PATCH /api/disputes/:id/review` [ADMIN]
- `PATCH /api/disputes/:id/resolve` [ADMIN] — finalize + optional adjustment

---

## Feature: Studio & On-Device AI

### Studio (In-Browser Drawing)
**Location:** `/studio/page/:pageId` (full-screen, no shell) or `/studio/region/:taskId` (focused on region)

**Architecture:** `apps/frontend/src/lib/studio/` modules:
- **document** — layers, page structure, layer ops (duplicate, merge, flatten, paste)
- **history** — undo/redo stack with full reversibility for all operations
- **view** — pan, zoom, viewport, grid overlay
- **engine** — rendering loop, event dispatch, marching-ants animation
- **tools/** — brush (with high-speed gap-fill), fill, eraser, selection (marching ants, 8-connected), transform, panel outline, line, text, bubble
- **color** — foreground/background picker, swap with X/D keys, per-layer opacity
- **io** — import/export (PNG, JSON), auto-save to IndexedDB, draft recovery
- **persist** — IndexedDB-backed autosave (every 30s), unsaved-changes guard, restore-draft

**Capabilities (shipped 2026-06-05):**
- Raster drawing (brush with opacity/hardness, fill, eraser)
- Shape tools (panel outline, line, text with re-editing, bubble containers)
- Transform (move, scale, rotate, skew)
- **Undo/redo** with full history (linear, no branching)
- **Layer ops**: add, delete, duplicate, merge, flatten, paste; each reversible
- **Selection**: rectangle, freehand, magic-wand 8-connected with marching-ants animation
- **Colors**: foreground/background with swap keys (X, D)
- **Text**: fully re-editable regions; change font, size, color
- **Autosave**: IndexedDB auto-save every 30s; unsaved-changes warning; restore-draft button
- Zoom & pan
- Multi-layer support with opacity and blend modes

### On-Device AI (Optional, Privacy-First)
**Architecture:** `apps/frontend/src/lib/studio/ai/` + `packages/canvas-wasm`

**Models (lazy-loaded, in-browser inference via ONNX Runtime Web):**
1. **YOLO Panel Detection** — auto-detect manga panel boundaries on raw artwork
   - Creates panel outlines (Region records with ai_suggested=true)
   - No server cost; runs on user's device
   - **Cancellable**: user can abort during inference; heuristic fallback automatically used

2. **MobileSAM Smart-Select** — intelligent selection tool
   - Runs in web worker (sam.worker.ts)
   - Click to select character/object outline
   - Returns smart polygon; integrates with marching-ants selection
   - **Cancellable**: halt search during inference

3. **DeOldify Colorization** — auto-colorize grayscale artwork
   - In-browser ONNX model; chunked processing
   - Worker-based (colorize.worker.ts)
   - Integrates into undo/redo history
   - **Cancellable**: stop colorization mid-process

4. **Heuristic Fallback** — always-on edge-detection + color analysis
   - Runs if ONNX models unavailable, user disables AI, or cancels AI inference
   - Region detection, baseline smart-select
   - Fallback note displayed: "AI inference cancelled; using heuristic fallback"

**Privacy & Cost:**
- **Zero server calls** — all inference on client device (WASM + ONNX Runtime Web)
- **Zero API cost** — no per-use charge (unlike cloud AI services)
- **User device requirements** — GPU optional (falls back to CPU; slower but works)
- **Model availability probe** — system checks if models can load; disables features if unavailable
- **Cancellation UX** — immediate halt; fallback note explains what happened

**Demo Path (AI-Assisted Drawing):**
1. Open `/studio/region/:taskId` for panel region
2. Upload raw manga artwork (or draw rough sketch)
3. Enable AI → click **Detect Panels** (YOLO runs)
   - Panels auto-outlined; Region records created with ai_suggested=true
4. For character: **Smart-Select** (SAM)
   - Click on character edge → tool auto-traces outline
5. For coloring: **Colorize** (DeOldify)
   - Select B&W area → auto-colorize
6. Refine manually with brush/fill as needed
7. Submit to mangaka for review

### Key Modules & Endpoints
- **Studio Canvas:** `/studio/page/:pageId`, `/studio/region/:taskId` (client-side only)
- **Document Persistence:** `POST /api/studio/docs` — save canvas work
- **Retrieve Docs:** `GET /api/studio/docs/:pageId` — load saved state
- **WASM:** `packages/canvas-wasm` (pixel ops: blur, sharpen, blend)

---

## Closing: References & Further Reading

For deeper dives into system design, architecture, and reference documentation:

### Documentation Tree
- **Project Overview:** `../01-overview.md` — product vision, use cases, constraints
- **Architecture:** `../02-architecture/01-architecture-overview.md` — layered design, monorepo structure, deployment
- **API Reference:** `../03-api/01-api-reference.md` — endpoint catalog, DTOs, auth flows
- **Diagrams:** `../04-diagrams/` (Mermaid ERD, sequence, state machines)
- **Role Guides:** `../05-roles/{01-mangaka,02-assistant,03-tantou-editor,04-editorial-board,05-admin}.md` — detailed role workflows
- **Feature Specs:** `../07-features/` (proposal, production, editing, publishing, governance, earnings)
- **Code Organization:** `../10-code-structure.md` — monorepo layout, key files per module

### Live Verification
- **Test Coverage:** `api/` 50 jest tests, `web/` 185 vitest tests (all green)
- **Build:** `pnpm -F @manga/api build && pnpm -F @manga/web build` (verified 2026-06-05)
- **Live Smoke Tests:** `node docs/superpowers/smoke-{sprint5,sprint6,sprint7,ux-upgrade,storage}.mjs` (5 end-to-end flows)
- **Database:** Docker MySQL `localhost:3308` (dev environment)
- **Demo Logins:** see `../01-overview.md` (pwd: Dung123456@)

### Questions?
Refer to role-specific guides or feature specs in `documents/{05-roles,07-features}/`. API endpoint details in controller source: `apps/backend/src/<module>/*.controller.ts`.

---

# Questions?

**For live demo or deep questions on:**
- **Proposal workflow** → see `../05-roles/01-mangaka.md`
- **Task execution & earnings** → see `../05-roles/02-assistant.md`
- **Editorial review & annotations** → see `../05-roles/03-tantou-editor.md`
- **Governance & voting** → see `../05-roles/04-editorial-board.md`
- **User management & disputes** → see `../05-roles/05-admin.md`

**For architecture or API details:**
- Controller source: `apps/backend/src/<module>/`
- State machine enums: `packages/shared/src/enums/transitions.ts`
- Database schema: `db/01-schema.sql`

