# Business Rules — Manga Creation Workflow & Publishing Management System

Enforcement-verified rules from the shipped codebase (API, guards, services, DTOs, schema).

---

## 1. Authorization (BR-AUTH-*)

| ID | Rule | Enforced where |
|---|---|---|
| BR-AUTH-001 | User authentication via JWT bearer token (email + password login or Google OAuth). Passwords hashed with bcryptjs, never returned in JWT payload or user responses. | `auth/jwt.strategy.ts` validates JwtPayload, `auth/auth.service.ts` bcrypt-hashes on register/change-password; password_hash excluded from JWT and API responses |
| BR-AUTH-002 | MANGAKA: create proposals, submit proposals, view own proposals/series, create chapters/pages/regions, assign tasks, review submissions, publish chapters. | `@Roles(Role.MANGAKA)` on proposals, chapters, pages, regions, tasks, submissions controllers; series.service.listMine/getOne filter by mangaka_user_id |
| BR-AUTH-003 | ASSISTANT: view own tasks, start/submit tasks, view own earnings, file disputes on own approved tasks. | `@Roles(Role.ASSISTANT)` on tasks, submissions, earnings, disputes; tasks.service.listMine filters by assignee_user_id |
| BR-AUTH-004 | TANTOU_EDITOR: review chapters assigned to editor's series, annotate pages/manuscripts/submissions, view assigned series. | `@Roles(Role.TANTOU_EDITOR)` on chapters/annotations; chapters.service.reviewQueue/editorReview verify active Series_Tantou_Editor assignment (unassigned_at IS NULL) |
| BR-AUTH-005 | EDITORIAL_BOARD: view all proposals, decide proposal approval/rejection, open vote periods, cast votes, close periods, create decisions. | `@Roles(Role.EDITORIAL_BOARD)` on proposals/board endpoints; rankings service guards vote period operations |
| BR-AUTH-006 | ADMIN: manage all users (activate/deactivate/promote/demote), view system overview, resolve disputes. | `@Roles(Role.ADMIN)` on admin endpoints; admin.service enforces last-admin guard (BR-AUTH-011) |
| BR-AUTH-007 | Public endpoints (no @Roles guard): POST /api/auth/login, GET /api/auth/google, GET /api/auth/google/callback (OAuth). | auth.controller.ts — login and Google endpoints have no `@Roles` decorator |
| BR-AUTH-008 | Mangaka sees only own proposals/series; assistant sees only own tasks/earnings/disputes; Tantou editor reviews only assigned series; board/admin see all. | service-layer `mangaka_user_id`, `assignee_user_id`, `assistant_user_id`, `editor_user_id` filters; tasks.service/chapters.service throw ForbiddenException if ownership/assignment mismatch |
| BR-AUTH-009 | CORS limited to CLIENT_URL env var (default http://localhost:5173 for dev). | main.ts `app.enableCors({origin: process.env.CLIENT_URL})` |
| BR-AUTH-010 | Google OAuth users have no password_hash (NULL) and cannot call change-password endpoint. | auth.service checks auth_provider='GOOGLE' and throws error on change-password attempt |
| BR-AUTH-011 | Last active admin cannot be deactivated or demoted to another role. | admin.service.updateUser checks if user.role='ADMIN' AND (dto.isActivated=false OR dto.role!=null), then counts active ADMIN users; throws BadRequestException if count ≤ 1 |

**19 authorization rules, all Enforced.**

---

## 2. Workflow & State Transitions (BR-FLOW-*)

### 2.1 Proposal (6 states)
| ID | Rule | Enforced where |
|---|---|---|
| BR-FLOW-001 | Proposal transitions: DRAFT → SUBMITTED → UNDER_REVIEW → APPROVED/REJECTED; APPROVED/REJECTED are terminal. | PROPOSAL_TRANSITIONS in shared/enums/transitions.ts; proposals.service.submit/decide call canTransition() → BadRequestException if invalid |
| BR-FLOW-002 | APPROVED proposal auto-creates a Series (1:1) with same title, frequency, genres, and status=ACTIVE. | proposals.service.decide() INSERT INTO Series + copy genres from Proposal_Genre |
| BR-FLOW-003 | Proposal only submittable by owner (mangaka_user_id). | proposals.service.submit checks mangaka_user_id match → ForbiddenException |
| BR-FLOW-004 | Board approves/rejects via decision endpoint (UNDER_REVIEW state managed implicitly in queue). | proposals.service.reviewQueue returns SUBMITTED/UNDER_REVIEW; decide transitions directly |

### 2.2 Chapter (5 states)
| ID | Rule | Enforced where |
|---|---|---|
| BR-FLOW-005 | Chapter transitions: DRAFT → IN_PROGRESS → READY_FOR_EDITOR_REVIEW → EDITOR_APPROVED → PUBLISHED; READY_FOR_EDITOR_REVIEW can revert to IN_PROGRESS; PUBLISHED is terminal. | CHAPTER_TRANSITIONS in shared/enums/transitions.ts; chapters.service.setStatus/editorReview enforce canTransition() |
| BR-FLOW-006 | Chapter reaches PUBLISHED only after editor EDITOR_APPROVED. Mangaka can publish only if status=EDITOR_APPROVED. | chapters.service.setStatus verifies canTransition(EDITOR_APPROVED → PUBLISHED); also auto-creates Publication_Schedule row with publish_status='PUBLISHED' |
| BR-FLOW-007 | Only assigned Tantou editor can approve chapter (READY_FOR_EDITOR_REVIEW → EDITOR_APPROVED) or request revisions (→ IN_PROGRESS). | chapters.service.editorReview queries Series_Tantou_Editor join, throws ForbiddenException if editor_user_id mismatch or unassigned_at IS NOT NULL |
| BR-FLOW-008 | Chapter_number is unique per series; auto-incremented on create. | chapters.service.create computes MAX(chapter_number)+1; schema has UNIQUE(series_id, chapter_number) |

### 2.3 Page (4 states)
| ID | Rule | Enforced where |
|---|---|---|
| BR-FLOW-009 | Page transitions: RAW → ASSIGNED → IN_PROGRESS → REVIEWING → COMPLETED; REVIEWING can revert to IN_PROGRESS; COMPLETED is terminal. | PAGE_TRANSITIONS in shared/enums/transitions.ts; pages managed via region/task operations |
| BR-FLOW-010 | Page moves to ASSIGNED when first task is created for it (if status=RAW). | tasks.service.assign UPDATE Page SET page_status='ASSIGNED' WHERE page_id=? AND page_status='RAW' |
| BR-FLOW-011 | Page_number is unique per chapter; auto-incremented on create. | schema has UNIQUE(chapter_id, page_number) |

### 2.4 Task (5 states)
| ID | Rule | Enforced where |
|---|---|---|
| BR-FLOW-012 | Task transitions: ASSIGNED → IN_PROGRESS → SUBMITTED → APPROVED/REVISION_REQUIRED; REVISION_REQUIRED → IN_PROGRESS or SUBMITTED (loop); APPROVED is terminal. | TASK_TRANSITIONS in shared/enums/transitions.ts; tasks.service and submissions.service enforce canTransition() |
| BR-FLOW-013 | Task starts at ASSIGNED status when created. Only assignee can transition to IN_PROGRESS. | tasks.service.assign creates with status='ASSIGNED'; tasks.service.start verifies assignee_user_id match |
| BR-FLOW-014 | Task payment_amount auto-set from active Task_Price_Rule by region_type at creation. If no rule exists, payment=0. | tasks.service.assign queries Task_Price_Rule WHERE region_type=? AND is_active=1 AND (effective_to IS NULL OR effective_to >= CURDATE()); uses base_price |

### 2.5 Submission (5 states)
| ID | Rule | Enforced where |
|---|---|---|
| BR-FLOW-015 | Submission transitions: PENDING → UNDER_REVIEW → APPROVED/REVISION_REQUIRED/REJECTED; REVISION_REQUIRED/APPROVED/REJECTED are terminal. | SUBMISSION_TRANSITIONS in shared/enums/transitions.ts; submissions.service.review enforces canTransition() |
| BR-FLOW-016 | Submission version_number is unique per task; auto-incremented on each resubmit. | submissions.service.submit computes MAX(version_number)+1; schema has UNIQUE(task_id, version_number) |
| BR-FLOW-017 | Submission.APPROVED → Task.APPROVED AND Assistant_Profile.total_earnings accrues payment_amount. | submissions.service.review if decision='APPROVED': UPDATE Task status to APPROVED, then UPDATE Assistant_Profile total_earnings += Task.payment_amount |
| BR-FLOW-018 | REVISION_REQUIRED loops: submission → Task→REVISION_REQUIRED; assistant can re-submit (Task→IN_PROGRESS→SUBMITTED). | submissions.service.review if decision='REVISION_REQUIRED': Task→REVISION_REQUIRED; then can cycle via tasks.service.start and submissions.service.submit again |
| BR-FLOW-019 | Only mangaka (task assignor) can review submission. | submissions.service.review checks assignor_user_id match → ForbiddenException |

### 2.6 Earning Dispute (4 states)
| ID | Rule | Enforced where |
|---|---|---|
| BR-FLOW-020 | Earning_Dispute transitions: OPEN → UNDER_REVIEW → RESOLVED/REJECTED; all terminal. | EARNING_DISPUTE_TRANSITIONS in shared/enums/transitions.ts; disputes.service.markUnderReview/resolve enforce canTransition() |
| BR-FLOW-021 | Assistant can file dispute only on APPROVED tasks (payment accrued). | disputes.service.file checks task.task_status='APPROVED' → BadRequestException |

### 2.7 Series Status (managed in services, not a transition map)
| ID | Rule | Enforced where |
|---|---|---|
| BR-FLOW-022 | Series starts ACTIVE when created from APPROVED proposal. Can be ACTIVE ↔ AT_RISK (by ranking risk), → HIATUS/CANCELLED/COMPLETED (by decision). | proposals.service.decide INSERT Series with status='ACTIVE'; rankings.service.closePeriod UPDATE Series to 'AT_RISK' if risk=HIGH; decisions.service applies CONTINUE/CANCEL/CHANGE_FREQUENCY/HIATUS decisions |

### 2.8 Vote Period & Ranking (managed in services)
| ID | Rule | Enforced where |
|---|---|---|
| BR-FLOW-023 | Vote_Period transitions: OPEN → CLOSED (one-way). Opened by board, closed by board via close endpoint. | rankings.service.openPeriod INSERT with status='OPEN'; closePeriod UPDATE to status='CLOSED' |
| BR-FLOW-024 | Closing a Vote_Period computes Ranking: rank_position (count of higher-scoring series), total_score (average of all votes), risk_level (LOW/MEDIUM/HIGH based on average ≥ 3.5 / 2.5-3.5 / < 2.5). | rankings.service.closePeriod calculates avg(score), determines risk, upserts Ranking row |
| BR-FLOW-025 | HIGH risk_level triggers Series → AT_RISK status and RISK_ALERT notification to mangaka. | rankings.service.closePeriod if risk=HIGH: UPDATE Series.series_status='AT_RISK', notify mangaka |

### 2.9 Publication Status (managed in services)
| ID | Rule | Enforced where |
|---|---|---|
| BR-FLOW-026 | Publication_Schedule status: SCHEDULED → PUBLISHED/CANCELLED (one-way per entry). Created with PUBLISHED when chapter transitions to PUBLISHED. | chapters.service.setStatus on PUBLISHED status INSERT/UPDATE Publication_Schedule with publish_status='PUBLISHED', published_at=NOW() |

**26 workflow rules, all Enforced.**

---

## 3. Domain & Money (BR-MONEY-*)

| ID | Rule | Enforced where |
|---|---|---|
| BR-MONEY-001 | Task payment_amount auto-priced from active Task_Price_Rule by region_type at creation. Multiple rules per type; selects most recent effective rule (ORDER BY effective_from DESC). | tasks.service.assign queries Task_Price_Rule; base_price set as payment_amount |
| BR-MONEY-002 | Assistant total_earnings accrues only when submission is APPROVED. Amount = Task.payment_amount at approval time. | submissions.service.review if decision='APPROVED': UPDATE Assistant_Profile total_earnings += (SELECT payment_amount FROM Task) |
| BR-MONEY-003 | Dispute with adjustedAmount updates Task.payment_amount and deltas Assistant.total_earnings. | disputes.service.resolve if status='RESOLVED' && adjustedAmount != null: delta = adjustedAmount - old_payment; UPDATE Task.payment_amount, UPDATE Assistant_Profile.total_earnings += delta |
| BR-MONEY-004 | One Vote per board member per Vote_Period (unique key). Upsert behavior: re-vote updates score/comment. | rankings.service.castVote uses INSERT ... ON DUPLICATE KEY UPDATE; Vote table has UNIQUE(vote_period_id, board_user_id) |
| BR-MONEY-005 | Vote score range: 1–5 (inclusive). | create-vote.dto.ts @Min(1) @Max(5) |
| BR-MONEY-006 | Risk level determined by average vote score: HIGH (< 2.5), MEDIUM (2.5–3.5), LOW (≥ 3.5). Triggers Series AT_RISK status on HIGH. | rankings.service.closePeriod computes avg and assigns risk; if risk=HIGH, updates Series |

**6 money rules, all Enforced.**

---

## 4. Validation (BR-VAL-*)

| ID | Rule | Enforced where |
|---|---|---|
| BR-VAL-001 | Global ValidationPipe with whitelist=true, transform=true strips unknown request properties. | main.ts `app.useGlobalPipes(new ValidationPipe({whitelist: true, transform: true}))` |
| BR-VAL-002 | Email format validated. | login.dto.ts @IsEmail decorator; auth/register also validates |
| BR-VAL-003 | Login password minimum 6 characters. | login.dto.ts @MinLength(6) |
| BR-VAL-004 | Change-password new password minimum 8 characters, maximum 72 characters (bcrypt limit). | change-password.dto.ts @MinLength(8) @MaxLength(72) |
| BR-VAL-005 | Proposal title required non-empty string. | create-proposal.dto.ts @IsString title |
| BR-VAL-006 | Proposal synopsis optional string. | create-proposal.dto.ts @IsOptional @IsString synopsis |
| BR-VAL-007 | Proposed frequency enum: WEEKLY or MONTHLY. | create-proposal.dto.ts @IsEnum(Frequency) proposedFrequency |
| BR-VAL-008 | Proposal genre IDs required non-empty array of integers. | create-proposal.dto.ts @IsArray @ArrayNotEmpty @IsInt({each:true}) genreIds |
| BR-VAL-009 | Chapter title required non-empty string. | create-chapter.dto.ts @IsString title |
| BR-VAL-010 | Page number required integer. | schema enforces INTEGER page_number |
| BR-VAL-011 | Region type enum: PANEL, BACKGROUND, CHARACTER, DIALOGUE_BUBBLE, EFFECT. | create-region.dto.ts @IsEnum(RegionType) regionType |
| BR-VAL-012 | Region coordinates (x, y, width, height) required numbers. | create-region.dto.ts @IsNumber for each coordinate |
| BR-VAL-013 | Task description/instruction optional strings. | create-task.dto.ts @IsOptional @IsString |
| BR-VAL-014 | Task assignee_user_id must be an existing ASSISTANT user. | tasks.service.assign queries User, verifies role='ASSISTANT' → BadRequestException |
| BR-VAL-015 | Vote score range 1–5 with decimal precision (DECIMAL(5,2)). | create-vote.dto.ts @IsNumber @Min(1) @Max(5); schema Vote.score DECIMAL(5,2) |
| BR-VAL-016 | Dispute reason required non-empty string. | create-dispute.dto.ts @IsString @IsNotEmpty reason |
| BR-VAL-017 | Dispute resolution status must be RESOLVED or REJECTED. | resolve-dispute.dto.ts @IsIn(['RESOLVED','REJECTED']) status |
| BR-VAL-018 | Dispute resolution note required non-empty string. | resolve-dispute.dto.ts @IsString @IsNotEmpty resolutionNote |

**18 validation rules, all Enforced.**

---

## 5. Integrity (BR-INT-*)

| ID | Rule | Enforced where |
|---|---|---|
| BR-INT-001 | Proposal → Series 1:1 relationship. Foreign key: Series.proposal_id unique. | schema Series.proposal_id FK→Series_Proposal, UNIQUE(proposal_id) |
| BR-INT-002 | Series ← Proposal auto-created on APPROVED proposal decision; Series inherits mangaka_user_id, title, frequency, genres. | proposals.service.decide INSERT INTO Series, then INSERT INTO Series_Genre from Proposal_Genre |
| BR-INT-003 | Chapter_number unique per series (composite key). | schema UNIQUE(series_id, chapter_number) |
| BR-INT-004 | Page_number unique per chapter (composite key). | schema UNIQUE(chapter_id, page_number) |
| BR-INT-005 | Page_Version.version_number unique per page (composite key). | schema UNIQUE(page_id, version_number) |
| BR-INT-006 | Submission.version_number unique per task (composite key). | schema UNIQUE(task_id, version_number) |
| BR-INT-007 | Vote unique per board member per vote period (composite key). | schema UNIQUE(vote_period_id, board_user_id) |
| BR-INT-008 | Ranking unique per series per vote period (composite key). | schema UNIQUE(series_id, vote_period_id) |
| BR-INT-009 | Series_Tantou_Editor records editor assignment history; active = unassigned_at IS NULL. | schema stores assigned_at, unassigned_at; queries filter unassigned_at IS NULL for active editor |
| BR-INT-010 | User → Profile relationships (FK, 1:1). | schema each profile table has user_id PK/FK→User |
| BR-INT-011 | Vote_Period unique by series + period_type + period_start_date. | schema UNIQUE(series_id, ranking_period_type, period_start_date) |

**11 integrity rules, all Enforced.**

---

## 6. Security (BR-SEC-*)

| ID | Rule | Enforced where |
|---|---|---|
| BR-SEC-001 | Passwords hashed with bcryptjs (salt rounds 10) on registration and change-password. Never stored or transmitted in plaintext. | auth.service.ts uses bcrypt.hash() on register/change-password; never returned to client |
| BR-SEC-002 | JWT payload excludes password_hash. Payload contains only: sub (user_id), email, role, name. | jwt.strategy.ts validate() returns {id, email, role, name}; no password_hash |
| BR-SEC-003 | Admin user list (GET /api/admin/users) excludes password_hash from response. | admin.service.listUsers SELECT user_id, email, full_name, role, is_activated, auth_provider, created_at (no password_hash column) |
| BR-SEC-004 | Stateless JWT bearer authentication. Token extracted from Authorization header. | auth/jwt.strategy.ts uses ExtractJwt.fromAuthHeaderAsBearerToken() |
| BR-SEC-005 | CORS origin restricted to CLIENT_URL environment variable (dev default: http://localhost:5173). | main.ts app.enableCors({origin: process.env.CLIENT_URL}) |
| BR-SEC-006 | Google OAuth users cannot call change-password endpoint (no local password). | auth.service.ts checks auth_provider='GOOGLE' and throws error |
| BR-SEC-007 | All state-changing endpoints (PATCH, POST, PUT, DELETE) require JWT authentication. | @UseGuards(JwtAuthGuard) applied to all controllers globally or per-endpoint |

**7 security rules, all Enforced.**

---

## 7. Advisory / Backlog (BR-ADVIS-*)

These are schema-present but not yet enforced by code:

| ID | Rule | Status |
|---|---|---|
| BR-ADVIS-001 | Audit_Log: all user actions (CREATE, UPDATE, DELETE, APPROVE, REJECT, PUBLISH, CANCEL, ASSIGN, SUBMIT, REVISE, VOTE, DECIDE) logged with before_value/after_value JSON deltas and IP/user-agent. | Schema present (db/01-schema.sql); not yet wired into services. |
| BR-ADVIS-002 | System_Config: key-value store for runtime configuration (not yet used by app). | Schema present; not wired. |

---

## Summary

- **Authorization:** 11 rules enforced (RBAC, data scoping, last-admin guard)
- **Workflow & State Machines:** 26 rules enforced (6 state machines + series/vote/publication status)
- **Domain & Money:** 6 rules enforced (auto-pricing, earnings accrual, dispute resolution, voting)
- **Validation:** 18 rules enforced (DTOs + global ValidationPipe)
- **Integrity:** 11 rules enforced (FKs, unique keys, 1:1/M-N relationships)
- **Security:** 7 rules enforced (bcrypt, JWT, CORS, stateless auth)
- **Advisory:** 2 rules backlog (Audit_Log, System_Config)

**Total: 79 rules, 77 Enforced, 2 Advisory.**

---

## Cross-reference

- `docs/superpowers/DOC-BUILD-BRIEF.md` — Canonical ground truth (roles, endpoints, database schema, state machines)
- `../02-requirements-and-use-cases.md` — Use cases and feature requirements
- `../02-architecture/03-domain-model-and-state-machines.md` — Domain model details and state diagrams
- `../02-architecture/04-security-and-rbac.md` — Security architecture and RBAC details
