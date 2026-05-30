# Domain Model — Entities, Status Machines, Business Rules

This document maps the workflow entities and the status state machines that control the core flow. See `docs/SWP391/sql-script.sql` for the complete SQL schema.

---

## 1. Entity clusters

### Users & Roles

**User** — person with an account (email + password, or OAuth).
- `id` (PK)
- `email` (unique)
- `password_hash` (bcrypt, nullable for OAuth-only)
- `google_id` (nullable)
- `auth_provider` (email | google | both)
- `name`
- `avatar_url` (nullable)
- `role` (MANGAKA | ASSISTANT | TANTOU_EDITOR | EDITORIAL_BOARD | ADMIN)
- `created_at`, `updated_at`

**Role enum** (shared across API + Web, source of truth in `@manga/shared`):
```ts
export enum Role {
  MANGAKA = "MANGAKA",
  ASSISTANT = "ASSISTANT",
  TANTOU_EDITOR = "TANTOU_EDITOR",
  EDITORIAL_BOARD = "EDITORIAL_BOARD",
  ADMIN = "ADMIN",
}
```

**Profile tables** (Mangaka, Assistant, TantouEditor, EditorialBoard) — role-specific details (bio, specialization, earnings, etc.), linked to User.

---

### Series (Proposal → Published)

**Series_Proposal** — mangaka's pitch, board approval gate.
- `id` (PK)
- `mangaka_id` (FK User)
- `title`, `synopsis`, `genre_id` (FK Genre)
- `status` (DRAFT, SUBMITTED, APPROVED, REJECTED) ← **state machine**
- `submitted_at`, `decided_at` (nullable)
- `decision_reason` (nullable)
- `created_at`, `updated_at`

**Series** — approved proposal becomes series.
- `id` (PK)
- `proposal_id` (FK Series_Proposal)
- `mangaka_id` (FK User)
- `tantou_editor_id` (FK User, nullable)
- `title`, `genre_id` (FK Genre)
- `status` (PLANNING, ACTIVE, ON_HOLD, COMPLETED, CANCELLED) ← **state machine**
- `start_date`, `end_date` (nullable)
- `created_at`, `updated_at`

**Genre** — manga category (action, romance, etc.).
- `id` (PK), `name`, `description`

---

### Production (Chapter → Task → Submission)

**Chapter** — part of series.
- `id` (PK)
- `series_id` (FK Series)
- `chapter_number`, `title`
- `status` (DRAFT, READY_FOR_REVIEW, APPROVED, SCHEDULED, PUBLISHED) ← **state machine**
- `created_at`, `updated_at`

**Page** — image in chapter.
- `id` (PK)
- `chapter_id` (FK Chapter)
- `page_number`, `file_url` (path to uploaded image)
- `status` (DRAFT, IN_REGIONS, TASKS_ASSIGNED, SUBMITTED, APPROVED_BY_MANGAKA, APPROVED_BY_EDITOR, PUBLISHED) ← **state machine**
- `created_at`, `updated_at`

**Page_Version** — history of page uploads (versioning).
- `id` (PK)
- `page_id` (FK Page)
- `version_number`, `file_url`, `uploaded_by` (FK User)
- `uploaded_at`

**Region** — area on page assigned to assistant.
- `id` (PK)
- `page_id` (FK Page)
- `task_id` (FK Task, nullable)
- `coordinates` (JSON: x, y, width, height — canvas selection)
- `created_at`

**Task** — work unit assigned to assistant.
- `id` (PK)
- `region_id` (FK Region)
- `assigned_to` (FK User, Assistant)
- `price_rule_id` (FK Task_Price_Rule, nullable)
- `status` (CREATED, ASSIGNED, IN_PROGRESS, SUBMITTED, APPROVED_MANGAKA, APPROVED_EDITOR, CANCELLED) ← **state machine**
- `due_date`, `created_at`, `updated_at`

**Task_Price_Rule** — mangaka sets rates per region type / difficulty.
- `id` (PK)
- `series_id` (FK Series)
- `region_type` (e.g., "background", "character", "effect")
- `base_price` (JPY)

**Submission** — assistant's work on a task.
- `id` (PK)
- `task_id` (FK Task)
- `submitted_by` (FK User, Assistant)
- `file_url` (path to submission file)
- `status` (DRAFT, SUBMITTED, APPROVED_MANGAKA, REVISION_REQUIRED, APPROVED_EDITOR, PUBLISHED) ← **state machine**
- `submitted_at`, `updated_at`

**Manuscript** — interim entity between submission approval and editor review.
- `id` (PK)
- `submission_id` (FK Submission)
- `page_id` (FK Page)
- `status` (DRAFT, SUBMITTED_FOR_REVIEW, APPROVED, REJECTED, REVISION_REQUIRED) ← **state machine**
- `created_at`, `updated_at`

**Annotation** — editorial feedback (polymorphic: on Page, Manuscript, or Submission).
- `id` (PK)
- `annotatable_type` (enum: page | manuscript | submission)
- `annotatable_id` (FK to respective table)
- `annotated_by` (FK User, Editor)
- `category` (content | dialogue | script | visual)
- `text`, `x`, `y` (location on image, nullable)
- `created_at`

---

### Publishing & Governance

**Publication_Schedule** — board decides release timing.
- `id` (PK)
- `chapter_id` (FK Chapter)
- `scheduled_date`, `published_date` (nullable)
- `status` (DRAFT, SCHEDULED, PUBLISHED, CANCELLED) ← **state machine**
- `created_at`, `updated_at`

**Vote_Period** — reader voting window (e.g., monthly).
- `id` (PK)
- `series_id` (FK Series)
- `start_date`, `end_date`
- `status` (OPEN, CLOSED, FINALIZED) ← **state machine**
- `created_at`, `updated_at`

**Vote** — reader vote on series.
- `id` (PK)
- `vote_period_id` (FK Vote_Period)
- `series_id` (FK Series)
- `score` (1–5 or numeric)
- `voted_at`

**Ranking** — computed from votes.
- `id` (PK)
- `vote_period_id` (FK Vote_Period)
- `series_id` (FK Series)
- `rank` (1, 2, 3, …)
- `average_score`, `vote_count`
- `status` (COMPUTED, PUBLISHED) ← **state machine**
- `computed_at`

**Decision** — board's final call on series.
- `id` (PK)
- `series_id` (FK Series)
- `decided_by` (FK User, Board member)
- `decision` (continue | cancel | change_frequency)
- `new_frequency` (weekly | monthly | quarterly, nullable)
- `status` (PENDING, MADE, EXECUTED) ← **state machine**
- `reason`, `decided_at`, `executed_at` (nullable)

---

### Support

**Earning_Dispute** — assistant disputes payment.
- `id` (PK)
- `submission_id` (FK Submission)
- `opened_by` (FK User, Assistant)
- `reason`, `amount_claimed`
- `status` (OPEN, RESOLVED, REJECTED) ← **state machine**
- `resolved_by` (FK User, Admin, nullable)
- `opened_at`, `resolved_at` (nullable)

**Notification** — in-app + email notifications.
- `id` (PK)
- `recipient_id` (FK User)
- `type` (task_assigned | submission_ready | approval_requested | series_published | decision_made)
- `related_entity_type`, `related_entity_id`
- `title`, `message`, `read` (boolean)
- `created_at`, `read_at` (nullable)

**Audit_Log** — admin actions tracked.
- `id` (PK)
- `user_id` (FK User)
- `action` (user_created | user_role_changed | config_updated)
- `entity_type`, `entity_id`, `old_value`, `new_value` (JSON, nullable)
- `created_at`

**System_Config** — thresholds and settings.
- `id` (PK)
- `key` (e.g., `max_series_per_mangaka`, `min_vote_threshold`)
- `value` (JSON)
- `updated_at`

---

## 2. Status state machines (enums to build in S2)

Each status enum drives workflow validation. Illegal transitions are rejected at the service layer. Enums live in `@manga/shared` (single source for API + Web).

| Entity | States | Triggers | Notes |
|---|---|---|---|
| **Series_Proposal** | DRAFT → SUBMITTED → APPROVED ⊢ Series created \| REJECTED | mangaka submit, board vote | One-way progression (no reversal). |
| **Series** | PLANNING → ACTIVE → ON_HOLD ↔ ACTIVE → COMPLETED \| CANCELLED | board schedule, editor assigns, decision made | Board can cancel at any point. |
| **Chapter** | DRAFT → READY_FOR_REVIEW → APPROVED → SCHEDULED → PUBLISHED | mangaka mark ready, editor approve, board schedule, publish | No reversal once published. |
| **Page** | DRAFT → IN_REGIONS → TASKS_ASSIGNED → SUBMITTED → APPROVED_BY_MANGAKA → APPROVED_BY_EDITOR → PUBLISHED | mangaka upload, select regions, assign tasks, collect submissions, approve, editor approve, board publish | Submission blocks advance. |
| **Task** | CREATED → ASSIGNED → IN_PROGRESS → SUBMITTED → APPROVED_MANGAKA → APPROVED_EDITOR \| CANCELLED | mangaka create, assign, assistant upload, mangaka approve, editor approve | Can be cancelled anytime. Submission required before approval. |
| **Submission** | DRAFT → SUBMITTED → APPROVED_MANGAKA ⊣ REVISION_REQUIRED (loop) → APPROVED_EDITOR → PUBLISHED | assistant upload, mangaka review, editor review | Looped revision until approved by mangaka. |
| **Manuscript** | DRAFT → SUBMITTED_FOR_REVIEW → APPROVED \| REJECTED ⊣ REVISION_REQUIRED | page → manuscript auto-create, editor review, board final | Gated by all submissions on page approved. |
| **Publication_Schedule** | DRAFT → SCHEDULED → PUBLISHED \| CANCELLED | board schedule, publish date reached | Once published, no reversal. |
| **Vote_Period** | OPEN → CLOSED → FINALIZED | end date reached, board finalize | Finalize computes ranking. |
| **Ranking** | COMPUTED → PUBLISHED | ranking compute, board publish | Snapshot of votes at a point in time. |
| **Decision** | PENDING → MADE → EXECUTED | board vote, execute (e.g., send notice) | Execution is manual (for now). |
| **Earning_Dispute** | OPEN → RESOLVED \| REJECTED | admin review, settle or reject | Payment system processes settlement. |

---

## 3. Business rules (sampling)

See `docs/SWP391/Business Rules.docx` for the full list (~154 rules). These are key workflow rules:

**Authorization:**
- Only MANGAKA can create a series proposal.
- Only EDITORIAL_BOARD can approve a proposal.
- Only TANTOU_EDITOR assigned to a series can annotate.
- Only ADMIN can manage users and system config.

**State transitions:**
- A page cannot transition TASKS_ASSIGNED → SUBMITTED until all tasks on that page are APPROVED_MANGAKA.
- A chapter cannot publish until all pages are APPROVED_BY_EDITOR.
- An assistant cannot submit a task after its due_date has passed.
- A series cannot cancel once it has PUBLISHED chapters.

**Validation:**
- Series title must be unique.
- Task.price_rule_id must belong to the same series.
- Vote scores must be within 1–5 (or the defined range).
- Submission file must be <= 50MB (NFR spec).

**Derivation:**
- Ranking.rank is computed from Vote aggregates (ORDER BY average_score DESC).
- Total earnings = SUM(Submission.approved_amount) per assistant per month.
- At-risk indicator = series with average_score < threshold AND high cancellation rate.

**Action-enabler:**
- When Submission.status = APPROVED_MANGAKA, notify TANTOU_EDITOR assigned to that series.
- When Decision.status = EXECUTED, update Series.status and notify MANGAKA.
- When Vote_Period.status = FINALIZED, auto-create Ranking and notify EDITORIAL_BOARD.

---

## 4. Implementation roadmap

**S1 (Done):** User + Role enum + Auth (JWT + Google OAuth) + RolesGuard.

**S2 (Planned):** Series, Chapter, Page, Region, Task, Submission, Manuscript (CRUD + state machines). Extract status enums from this doc into `@manga/shared`. Service layer validates transitions. Controllers enforce RBAC.

**S3 (Planned):** Annotation, Publishing, Vote, Ranking, Decision. Admin user/config mgmt. Notification dispatcher. Earning calculation. Dispute resolution.

---

## 5. Notes for future sprints

- **Polymorphic Annotation:** Annotation.annotatable_type + annotatable_id is a classic polymorphic pattern. Normalize carefully — consider a `JSON` column for flexible annotation data (category + text + coords).
- **Enum consistency:** Always import status enums from `@manga/shared` in both API services + Web components. Never hardcode string literals.
- **Testing:** Each state machine deserves a unit test (valid transitions pass, invalid ones throw). Service tests cover the happy path + rejection cases.
- **Migration strategy:** For production, use a versioned migration tool (Liquibase, Flyway, or custom Node scripts in `db/migrations/`). Keep schema in sync with code.

