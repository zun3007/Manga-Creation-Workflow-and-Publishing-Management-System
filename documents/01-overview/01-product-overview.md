# Product Overview

An internal manga-studio production and publishing management tool that digitizes a publisher's complete pipeline from proposal through editorial decision and assistant earnings.

## What It Is / What It Is NOT

**What it is:** A digital workflow platform for manga studios to coordinate series proposals, editorial approvals, chapter production, quality review, publication scheduling, reader voting/rankings, executive decisions, assistant compensation, and dispute resolution. It automates state-driven processes, tracks deliverables, enforces governance, and provides earnings transparency.

**What it is NOT:**
- Not a manga reader (no public-facing reader interface).
- Not a payment gateway (earnings are tracked internally; no financial transactions processed).
- Not a full audit/compliance system (audit tables exist in schema but not yet wired by code).
- Not a configuration management interface (system config tables exist but not yet exposed).
- The AI assists (region detection, smart selection, colorization) are optional, on-device, and serve only the in-browser Studio tool.

## Why It Exists

A manga publisher managing a studio of freelance mangaka and assistants faces coordination chaos:
- Mangaka submit series ideas, but approval workflows are ad-hoc and lack transparency.
- Chapters move through production (drawing, inking, lettering) across multiple assistants with manual task assignment and pricing disputes.
- Editors need to review work and give structured feedback, but lack a centralized annotation system.
- Published series need reader engagement data and editorial guidance to decide cancellations, frequency changes, or hiatuses.
- Assistants lack visibility into their earnings or a formal dispute resolution process.
- Leadership has no real-time dashboard of series health, rankings, or voting decisions.

This platform consolidates the end-to-end pipeline—from proposal to decision to payout—with role-based access, state machines, notifications, and audit trails.

## The Operating Model

**Pipeline (one line):**
Series Proposal → Board approval → Series → Tantou Editor assigned → Chapter → Page (+versions) → Region (panel/bubble/...) → Task (priced) → Assistant Submission → Mangaka review → Editor chapter review (+annotations) → Publish (schedule) → Board Vote period → Ranking (+risk) → Decision (continue/cancel/freq/hiatus) → Assistant Earnings → Earning Disputes

**Expanded narrative:**

1. **Series Proposal**: Mangaka drafts a series idea (title, synopsis, genres, proposed frequency) and submits for Editorial Board review. The proposal enters a state machine: DRAFT → SUBMITTED → UNDER_REVIEW → APPROVED or REJECTED.

2. **Board Approval**: The Editorial Board reviews pending proposals, votes, and approves. Approval auto-creates a Series record and notifies the mangaka.

3. **Series & Editor Assignment**: The approved Series is assigned a Tantou Editor (lead editorial contact) who oversees all chapters and owns the editorial review gate.

4. **Chapter & Page Breakdown**: The Mangaka creates chapters (numbered per series) and uploads pages (numbered per chapter) as raw manuscript. Each page can have multiple versions as revisions.

5. **Region Definition & Task Creation**: The Mangaka defines regions on pages (panels, speech bubbles, backgrounds, characters, effects) and creates tasks for each region. Tasks are auto-priced based on region type (PANEL, BACKGROUND, CHARACTER, DIALOGUE_BUBBLE, EFFECT) using active Task_Price_Rules.

6. **Assistant Work & Submission**: Assistants claim tasks (ASSIGNED → IN_PROGRESS → SUBMITTED) and upload their work (inking, coloring, lettering). Submissions can be UNDER_REVIEW → APPROVED (accrues earnings) or REVISION_REQUIRED (loops back).

7. **Mangaka Review**: The Mangaka reviews submissions, approves to finalize work, or requests revisions.

8. **Tantou Editor Review**: The editor reviews the completed chapter, adds annotations (CONTENT_ISSUE, DIALOGUE_ISSUE, SCRIPT_ISSUE, VISUAL_ISSUE, GENERAL) with spatial coordinates, and approves or requests changes. Chapter state: DRAFT → IN_PROGRESS → READY_FOR_EDITOR_REVIEW → EDITOR_APPROVED → PUBLISHED.

9. **Publishing**: Editor approval transitions the chapter to PUBLISHED and auto-creates a Publication_Schedule row (sets release_date, publish_status).

10. **Voting Period & Ranking**: The Editorial Board opens a Vote_Period (WEEKLY or MONTHLY per series) and each member votes with a numeric score and optional comment. Period closes, triggering Ranking computation (rank_position, total_score, risk_level). Series with HIGH risk are flagged.

11. **Executive Decision**: Based on rankings, the Board makes decisions: CONTINUE (next period), CANCEL (end series), CHANGE_FREQUENCY (WEEKLY ↔ MONTHLY), or HIATUS (pause). Series updates to ACTIVE, AT_RISK, HIATUS, CANCELLED, or COMPLETED.

12. **Assistant Earnings & Disputes**: Assistants see their total earnings (sum of approved task payments) and can open disputes on individual tasks if they believe the price is unfair. Admins review disputes and can resolve with an adjusted amount, which updates the assistant's total.

## The Five Roles at a Glance

| Role | Real-world Analogue | Core Responsibility | Primary Screens |
|------|-------------------|---------------------|-----------------|
| **MANGAKA** | Creator / Author | Submit series ideas; create chapters, pages, regions, and tasks; review assistant submissions; publish chapters. | `/` (dashboard), `/proposals`, `/series`, `/series/:id`, `/series/:seriesId/chapters/:chapterId`, `/review` (submissions) |
| **ASSISTANT** | Freelance Illustrator / Letterer | Complete assigned tasks (inking, coloring, lettering); submit work; monitor earnings and dispute payments. | `/` (dashboard), `/my-tasks`, `/earnings` |
| **TANTOU_EDITOR** | Lead Editor / Quality Gate | Review chapters and pages; add editorial feedback; approve or request revisions; enforce publication readiness. | `/` (dashboard), `/editor/review`, `/editor/review/:chapterId` |
| **EDITORIAL_BOARD** | Executive Leadership / Governance | Approve/reject series proposals; assign editors; manage vote periods; rank and vote on series; make editorial decisions (cancel, hiatus, frequency). | `/` (dashboard), `/board/proposals`, `/board/series`, `/board/rankings` |
| **ADMIN** | System Administrator | Activate users; manage system roles; resolve earning disputes; view audit logs and system config. | `/` (dashboard), `/admin`, `/admin/disputes` |

## Core Capability Areas

**Proposal & Approval**
- Mangaka author series proposals with genres and frequency.
- Editorial Board reviews, votes, and approves or rejects; auto-creates Series on approval.

**Production (Chapter / Page / Region / Task / Submission)**
- Mangaka create chapters and pages; upload page versions.
- Define regions (panel/background/character/dialogue/effect) with spatial coordinates.
- Auto-price tasks by region type via Task_Price_Rules.
- Assistants complete tasks and submit work (with version history).
- Earnings accrue on submission approval.

**Review (Mangaka + Editor + Annotations)**
- Mangaka review assistant submissions and approve/request revisions.
- Tantou Editor reviews chapters, adds polymorphic annotations (content, dialogue, script, visual, general) with spatial coordinates and resolution tracking.
- Chapter publication gated on editor approval.

**Publishing**
- Auto-create Publication_Schedule on chapter approval.
- Publish_status transitions: SCHEDULED → PUBLISHED or CANCELLED.

**Voting, Ranking, & Decision (Governance)**
- Board opens Vote_Period (WEEKLY/MONTHLY per series).
- Board members cast numeric scores; one vote per member per period.
- Close period auto-computes Ranking (rank_position, total_score, risk_level).
- Board decides per ranking: CONTINUE, CANCEL, CHANGE_FREQUENCY, HIATUS.
- Series status updated; mangaka notified of risk alerts and decisions.

**Earnings & Disputes**
- Assistants see total_earnings (sum of approved task payments) and task-level history.
- Assistants open disputes on approved tasks (expected vs. actual price).
- Admins review disputes, resolve with optional amount adjustment.
- Dispute resolution notifies the assistant.

**Notifications**
- Real-time alerts on task assignment, submission, review decision, editor review outcome, proposal decisions, editor (un)assignment, ranking risk, board decisions, dispute status.

**Admin & Audit**
- User activation and role management.
- Audit logs table (schema present; wiring in progress).
- System config table (schema present; wiring in progress).

**In-Browser Studio + On-Device AI**
- Full-screen canvas editor for assistants/mangaka to draw, paint, and manipulate artwork.
- Optional on-device AI (ONNX Runtime Web): panel detection (YOLO), smart selection (MobileSAM), colorization (DeOldify).
- Fallback heuristic AI if models unavailable.
- All inference client-side (no server cost or external dependency).
- Studio saves work to persistent document storage.

## Scope & Boundaries

**In-scope:**
- Complete workflow from proposal to decision to earnings.
- RBAC, JWT authentication, optional Google OAuth.
- Notification system (created but delivery channel is in-app only).
- Audit log schema and basic tracking hooks.
- Role-specific UI skins via `data-role` theming.

**Out-of-scope:**
- Payment gateway or financial transaction processing.
- Public-facing manga reader or analytics.
- Audit or compliance report generation (schema present; wiring pending).
- System configuration UI (schema present; wiring pending).
- Third-party integrations (email, SMS, external payment).

## Technology at a Glance

| Layer | Tech | Version |
|-------|------|---------|
| **Frontend** | React | 19.2 |
| | Vite | 8 |
| | TypeScript | ~6.0 |
| | Tailwind CSS | 4.3 |
| | react-router-dom | 7.16 |
| | axios | 1.16 |
| | framer-motion | 12.40 |
| | lucide-react | (latest) |
| | ONNX Runtime Web | 1.26 |
| | vitest | 4 |
| **Backend** | NestJS | 11 |
| | TypeScript | 5.7 |
| | MySQL | 8 (Docker, port 3308) |
| | mysql2 | 3.22 |
| | JWT (@nestjs/jwt) | 11 |
| | Passport (JWT + Google OAuth) | (latest) |
| | Multer | 2 |
| | jest | 30 |
| **Shared** | TypeScript enums & types | (monorepo) |
| | WASM (AssemblyScript) | (canvas pixel ops) |
| **Deployment** | Docker Compose | (local dev) |
| **Monorepo** | pnpm | 11.0.9+ |
| **Node.js** | >= 20 | (required) |

## Project Status

**As of 2026-05-31:**
- API: 46 jest tests + build green.
- Web: 124 vitest tests + `tsc -b` type check + build green.
- Live smoke tests: 3 integration runs (sprints 5, 6, 7) with 19, 13, 11 scenarios; 0 failures.
- Integration branch: `dev/sprint3-studio` → base `development`.
- PR #5 open (Sprint 7 final review).
- All feature gates active; demo credentials available.

---

**Related documentation:**
- [Requirements & Use Cases](02-requirements-and-use-cases.md)
- [System Architecture](../02-architecture/01-system-architecture.md)
- [Glossary & Status Reference](03-glossary.md)
