# Roadmap — 3-Sprint Plan

**Timeline:** 10 weeks (2026-05-18 → 2026-07-26). Three sprints of 2–2.5 weeks each; week 10 = testing, report, demo.

---

## Sprint 1 — Foundation (Closed)

**Window:** 2026-05-30 → 2026-06-13 ✅

**Scope:** Pastel multi-role design system · `dev/` monorepo on latest stack · `@manga/shared` (Role enum + auth DTOs) · Auth + RBAC (local + Google OAuth) · role-routed AppShell · Mangaka dashboard re-themed.

**Definition of Done:**
- `pnpm dev` boots web (Vite 5173) + api (NestJS 3000) + db (MySQL 3308) without error.
- Login flow works: email/password + Google OAuth both sign JWT with role claim.
- JWT decoded, user lands on role-routed AppShell with `data-role` set from role.
- Mangaka dashboard fetches + renders with pastel token colors (no hard black borders/heavy shadows).
- `pnpm test` passes (shared Role enum tests, api RolesGuard tests).
- Docs rewritten for Sakura multi-role design system + `dev/` monorepo layout + 3-sprint baseline.

**Deliverables:**
- `dev/` monorepo: `apps/web`, `apps/api`, `packages/shared`, `db/`.
- `@manga/shared`: `Role` enum, auth DTOs, barrel export.
- Auth guard (RolesGuard, Roles decorator).
- Token-driven UI components (Panel, Button, Stamp, Input, Avatar, Progress, Sidebar).
- Re-themed Mangaka dashboard (pastel, soft shadows, readable).

---

## Sprint 2 — Production Pipeline

**Window:** 2026-06-14 → 2026-07-04 (estimated)

**Scope:** Series Proposal → Board approve → Series → Chapter → Page upload → Region select → Task assign → Submission → Mangaka review/revision. Full CRUD + workflow state machines.

**Functional Requirements (by area):**
| Area | FRs | Example |
|---|---|---|
| Series Proposal | FR-5 to FR-10 | Create proposal, request board review, board approve/reject, proposal history. |
| Series Management | FR-11 to FR-15 | Create series, set editor/genre/status, view series list. |
| Chapter Management | FR-16 to FR-20 | Create chapter, set status (draft→ready→approved), upload pages. |
| Page Workspace | FR-21 to FR-30 | Upload page image, preview, select regions (canvas drawing), manage versions. |
| Task Assignment | FR-31 to FR-35 | Create task per region, assign to assistant, set due date, view task list. |
| Submission | FR-36 to FR-40 | Assistant uploads work, mangaka reviews, request revision or approve. |
| Mangaka Review | FR-41 to FR-45 | Review submissions, annotate, approve for editor review. |

**Status Enums to add to `@manga/shared`:**
- `ProposalStatus`: DRAFT, SUBMITTED, APPROVED, REJECTED.
- `SeriesStatus`: PLANNING, ACTIVE, ON_HOLD, COMPLETED, CANCELLED.
- `ChapterStatus`: DRAFT, READY_FOR_REVIEW, APPROVED, SCHEDULED, PUBLISHED.
- `PageStatus`: DRAFT, IN_REGIONS, TASKS_ASSIGNED, SUBMITTED, APPROVED_BY_MANGAKA, APPROVED_BY_EDITOR, PUBLISHED.
- `TaskStatus`: CREATED, ASSIGNED, IN_PROGRESS, SUBMITTED, APPROVED_MANGAKA, APPROVED_EDITOR, CANCELLED.
- `SubmissionStatus`: DRAFT, SUBMITTED, APPROVED_MANGAKA, REVISION_REQUIRED, APPROVED_EDITOR, PUBLISHED.

**Definition of Done:**
- Create a series proposal end-to-end: user (mangaka) creates → board approves → series created → chapter created → page uploaded → region selected → task assigned → assistant submits → mangaka approves.
- All state machines honored (no invalid transitions).
- RBAC enforced: only authorized roles can transition each state.
- API tests cover the happy path + rejection cases.
- Web pages for each workflow step (proposal form, series list, page canvas, task list, submission review).
- Notifications fired on key transitions (task assigned, submission ready, approval requested).

**Deliverables:**
- NestJS modules: Series, Chapter, Page, Region, Task, Submission (CRUD + state machines).
- Database tables: extend schema from `docs/SWP391/sql-script.sql` if needed.
- Web pages: Proposal, SeriesList, ChapterForm, PageWorkspace, TaskList, SubmissionReview.
- State machines unit tests (vitest for shared enums, jest for api services).
- Dashboards for TANTOU_EDITOR and EDITORIAL_BOARD (task queues, approval lists).

---

## Sprint 3 — Review, Publish, Govern + Admin

**Window:** 2026-07-05 → 2026-07-22 (estimated)

**Scope:** Tantou editor review/annotation → Editorial board schedule/approve → Publishing → Vote import → Ranking/Risk → Decision. Admin user/role/config mgmt. Notifications. Assistant earnings.

**Functional Requirements (by area):**
| Area | FRs | Example |
|---|---|---|
| Editor Review | FR-46 to FR-50 | Tantou reads submission, adds annotations (content/dialogue/visual), approves/rejects. |
| Publishing | FR-51 to FR-55 | Board schedules release, publishes to reader platform, update status. |
| Vote/Ranking | FR-56 to FR-60 | Import vote data, compute ranking, identify at-risk series, present to board. |
| Decision | FR-61 to FR-65 | Board votes continue/cancel/change frequency, update series status. |
| Admin | FR-66 to FR-80 | User management (create/edit/deactivate), role assignment, config thresholds, audit log. |
| Notifications | FR-81 to FR-85 | Task assigned, submission ready, approval requested, series published, decision made. |
| Assistant Earnings | FR-86 to FR-90 | Track monthly earnings per region submitted, view payment history, dispute resolution. |

**Status Enums (continued from S2):**
- `ManuscriptStatus`: DRAFT, SUBMITTED_FOR_REVIEW, APPROVED, REJECTED, REVISION_REQUIRED.
- `PublicationScheduleStatus`: DRAFT, SCHEDULED, PUBLISHED, CANCELLED.
- `VotePeriodStatus`: OPEN, CLOSED, FINALIZED.
- `RankingStatus`: COMPUTED, PUBLISHED.
- `DecisionStatus`: PENDING, MADE, EXECUTED.
- `EarningDisputeStatus`: OPEN, RESOLVED, REJECTED.

**Definition of Done:**
- Tantou can review, annotate, approve/reject a submission (uses Annotation polymorphic entity).
- Board can schedule → publish → view ranking/risk data → vote → decision on series.
- Admin can create users, assign roles, configure system thresholds, view audit log.
- Notifications fire on all major transitions (typed: in-app + email stubs).
- Assistant can view monthly earnings and open disputes.
- MVP spine fully demoable end-to-end (proposal → publication → decision).
- `pnpm test` passes all suites.

**Deliverables:**
- NestJS modules: ManuscriptReview, Publishing, Voting, Ranking, Decision, Admin, Notification, Earning.
- Web pages: EditorReviewList, AnnotationViewer, PublicationDashboard, VoteBoard, RankingChart, AdminPanel.
- Notification service (in-app + email template stubs).
- Earnings tracker + dispute UI.
- Full test coverage of state machines.

---

## Definition of Done (per sprint)

✅ **Code:**
- All new code is TypeScript with strict mode.
- Shared types/enums live in `@manga/shared`, imported by both api + web.
- API routes protected by `JwtAuthGuard` + `@Roles(...)` decorator.
- State machine transitions validated at the service layer.
- Unit tests pass (`pnpm test`), code review approved.

✅ **Frontend:**
- All new UI components use semantic token utilities (no hardcoded hex colors).
- Components render correctly under all five `[data-role="…"]` skins.
- Responsive, accessible (keyboard nav + screen reader support).
- Animations respect `prefers-reduced-motion`.

✅ **Database:**
- Schema matches the workflow (foreign keys + constraints).
- Migrations versioned and repeatable.
- Seed data includes realistic test cases for each sprint's workflows.

✅ **Documentation:**
- Code comments on complex logic.
- `docs/STATUS.md` updated with new phase and decisions.
- Design-system + architecture docs reflect any new patterns.

✅ **Build:**
- `pnpm build` passes (web vite + api nest).
- No console errors or warnings in dev mode.
- Docker compose brings up mysql + seed on first run.

---

## Risks / notes

- **Sprint 2 is the heaviest** (10+ tables, 5+ enums, 40+ FR). May borrow time from S3 if needed.
- **Annotation polymorphism** (on Page/Manuscript/Submission) requires careful DB design — scope in S2 discovery.
- **Vote import** (FR-58) assumes an external data source — integration details TBD with product.
- **ORM decision** still open (Prisma vs TypeORM vs raw mysql2). Recommend deciding at S2 kickoff.
- **Payment automation** (recurring) is out of MVP scope; S3 focuses on tracking + dispute resolution only.
