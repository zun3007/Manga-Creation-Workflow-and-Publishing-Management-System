# Project Overview — Manga Creation Workflow & Publishing Management System

- **Code:** SU26SWP05 · **Course:** SWP391 (FPT) · **Type:** RBL topic
- **Last updated:** 2026-05-28
- **Source of this overview:** synthesized from `docs/SWP391/` (topic list, Requirements Matrix, Business Rules, SQL schema, Timeline). The given docs are reference material with known gaps; this file is our authored understanding.

---

## 1. What it is (and is NOT)
A **web app that manages the internal workflow** of creating and publishing manga — coordinating author, assistants, editor, and editorial board.

- ✅ It **is**: a workflow / production-management tool. Proposal → review → task assignment per page region → submission → review → publishing → ranking → decision.
- ❌ It is **NOT**: a manga reader / reader-facing platform.

**Problem it solves:** today studios juggle Chat + Drive + Trello + Photoshop + Excel + Email — no shared view of who's doing which page/region, progress, file versions, or data for publish/cancel decisions.

## 2. Actors (5 roles)
| Role | Does |
|---|---|
| **Mangaka** | Author. Creates proposals, chapters, pages; selects regions on a page; assigns tasks to assistants; reviews/approves submissions. |
| **Assistant** | Helper. Receives region-based tasks, downloads page + references, uploads submissions, tracks monthly earnings. |
| **Tantou Editor** | Editor assigned to a series. Reviews chapters, adds annotations (content/dialogue/script/visual), defends the series to the board. |
| **Editorial Board** | Highest authority. Approves proposals, schedules publication, votes, decides continue/cancel/change-frequency. |
| **Admin** | System: user/role management, thresholds, price rules, audit log. |

> ⚠️ Team note: the role titles assigned to teammates in the course docs are partly cosmetic (for grading). See `docs/STATUS.md` for the real working ownership.

## 3. Core flow (the MVP spine)
```
Series Proposal ──Board approve──▶ Series ──▶ Chapter ──▶ Page (upload)
   ──▶ Region (select area on page) ──▶ Task (assign to Assistant)
   ──▶ Submission (assistant uploads) ──▶ Mangaka Review (approve / request revision)
   ──▶ all tasks approved ⇒ Chapter "Ready for Editor Review"
   ──▶ Tantou Editor review + annotation (approve / send back)
   ──▶ Editorial Board: schedule + final approve ⇒ Published
   ──▶ Board imports vote data ──▶ system computes Ranking + risk level
   ──▶ Board Decision: continue / cancel / change frequency
```

## 4. Scope
**MVP (must-have):** Auth/RBAC · Series Proposal · Series mgmt · Chapter mgmt · Page Workspace (canvas + region) · Task Assignment · Submission · Mangaka Review/Revision · Editor Review/Annotation · Publishing · Voting/Ranking/Risk/Decision · Notifications · Admin · Assistant earnings (basic).

**Out of scope (future enhancement):** AI auto-coloring · advanced AI panel/bubble/character segmentation · realtime collaboration · payment automation · mobile app.

> The AI segmentation piece is the **RBL research question** (compare U-Net / YOLOv8 / SAM for manga region segmentation) — demo/research only, not part of the core product build.

## 5. Domain entities (high level)
Full schema: `docs/SWP391/sql-script.sql` (~30 tables). Main clusters:
- **Users & profiles:** `User` (+ Mangaka/Assistant/TantouEditor/EditorialBoard profiles).
- **Series:** `Series_Proposal`, `Series`, `Genre`, editor assignment.
- **Production:** `Chapter`, `Page`, `Page_Version`, `Region`, `Manuscript`.
- **Work:** `Task`, `Task_Price_Rule`, `Submission`, `Annotation` (polymorphic on Page/Manuscript/Submission).
- **Publishing & governance:** `Publication_Schedule`, `Vote_Period`, `Vote`, `Ranking`, `Decision`.
- **Support:** `Earning_Dispute`, `Notification`, `Audit_Log`, `System_Config`.

Heavy use of **status enums / state machines** (proposal, series, chapter, page, task, submission, manuscript, schedule, vote period, dispute) — these are the heart of the workflow and must be modeled carefully (single source in `packages/shared`).

## 6. Requirements scale
- **101 Functional Requirements** across 13 sections (53 High priority).
- **46 Non-functional Requirements** (perf, security, usability, reliability, scalability, maintainability, compatibility, backup, auditability).
- **~154 Business Rules** (Ross Method: Constraint / Authorization / Derivation / Inference / Action-Enabler / Validation), enforced at DB / Application / Workflow / UI / Manual layers.
- Source: `docs/SWP391/SU26SWP05_Requirements_Matrix.xlsx`, `docs/SWP391/Business Rules.docx`.

## 7. Timeline & method
- **10 weeks:** 2026-05-18 → 2026-07-26. Agile/Scrum.
- Weeks 1–4: understanding, BA diagrams, requirements, system design + setup. Weeks 5–9: 5 sprints (×2 wk). Week 10: testing, report, slide, demo.
- **Today (2026-05-28) ≈ Week 2** (Business Analysis phase).
- 4-person team. See `docs/roadmap.md` (planned) for the FR→sprint mapping.

## 8. Stack (our decision)
React + Vite + TypeScript (frontend) · NestJS + TypeScript (backend) · MySQL · JWT auth · monorepo. No Next.js (internal tool). See `CLAUDE.md` and `docs/architecture.md` (planned).
