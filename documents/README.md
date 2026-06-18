# Documentation — Manga Creation Workflow & Publishing Management System

The complete documentation set for the **internal manga-studio production & publishing platform**
(this is an operational tool, **not** a public manga reader). Every document here is written from the
**actual shipped code** as of **2026-06-05** (database schema, shared enums + state machines,
NestJS controllers, React routes) — not from aspirational design notes.

> These documents **supersede** the older `docs/architecture.md` and `docs/domain-model.md`, which are
> stale design-era notes whose enum values no longer match the implemented system.

---

## How to read this

| You are a… | Start here |
|---|---|
| **Newcomer / reviewer** | [Product Overview](01-overview/01-product-overview.md) → [Requirements & Use Cases](01-overview/02-requirements-and-use-cases.md) → [System Architecture](02-architecture/01-system-architecture.md) |
| **Backend / API developer** | [System Architecture](02-architecture/01-system-architecture.md) → [Database Design](02-architecture/02-database-design.md) → [API Reference](03-api/01-api-reference.md) → [Security & RBAC](02-architecture/04-security-and-rbac.md) |
| **Frontend developer** | [System Architecture](02-architecture/01-system-architecture.md) → [Role Guides](05-roles/) → [Sequence Diagrams](04-diagrams/02-sequence-diagrams.md) |
| **Understanding a single role** | [Role Guides](05-roles/) (one file per role) |
| **Presenting / defending the project** | [Master Deck](06-presentation/01-master-deck.md) + [Role & Feature Walkthrough](06-presentation/02-role-and-feature-walkthrough.md) |

---

## Contents

### 01 · Overview
- [01 Product Overview](01-overview/01-product-overview.md) — what it is (and is not), why it exists, the operating model, the five roles, scope, tech at a glance.
- [02 Requirements & Use Cases](01-overview/02-requirements-and-use-cases.md) — functional + non-functional requirements and detailed use cases (SRS).
- [03 Glossary](01-overview/03-glossary.md) — domain terms + a quick reference of every status enum.
- [04 Business Rules](01-overview/04-business-rules.md) — the enforced authorization, workflow, money, validation, integrity & security rules (with where each is enforced).

### 02 · Architecture
- [01 System Architecture](02-architecture/01-system-architecture.md) — context, monorepo layout, containers, backend modules, frontend, Studio/AI, request lifecycle, build & deploy.
- [02 Database Design](02-architecture/02-database-design.md) — ER diagram + full data dictionary for all 29 tables, enums, indexes, design notes.
- [03 Domain Model & State Machines](02-architecture/03-domain-model-and-state-machines.md) — aggregates, every state machine (Mermaid), transition enforcement, business rules.
- [04 Security & RBAC](02-architecture/04-security-and-rbac.md) — authentication (JWT + Google OAuth), guards, the full permission matrix, data-level authorization, secrets handling.

### 03 · API
- [01 API Reference](03-api/01-api-reference.md) — all 72 REST endpoints across the backend modules: roles, params, request/response bodies, side effects.

### 04 · Diagrams
- [01 Use-Case Diagrams](04-diagrams/01-use-case-diagrams.md) — system + per-role use cases (Mermaid).
- [02 Sequence Diagrams](04-diagrams/02-sequence-diagrams.md) — 12 key end-to-end flows (Mermaid).
- [03 Activity & Workflow Diagrams](04-diagrams/03-activity-and-workflow-diagrams.md) — 6 workflows with decision branches & swimlanes (Mermaid).
- [04 Class Diagrams](04-diagrams/04-class-diagrams.md) — backend layering, shared enums/transitions, the Studio engine OO model, frontend service layer (Mermaid).

### 05 · Role Guides
- [01 Mangaka](05-roles/01-mangaka.md) — series author: proposals, production, task assignment, submission review.
- [02 Assistant](05-roles/02-assistant.md) — production artist: tasks, the Studio + AI, submissions, earnings, disputes.
- [03 Tantou Editor](05-roles/03-tantou-editor.md) — series editor: chapter review queue, annotations, approve/request-changes.
- [04 Editorial Board](05-roles/04-editorial-board.md) — governance: proposal approval, editor assignment, voting/ranking, decisions.
- [05 Admin](05-roles/05-admin.md) — platform admin: user management (last-admin guard), dispute resolution.

### 06 · Presentation
- [01 Master Deck](06-presentation/01-master-deck.md) — the project pitch/defense deck (Marp).
- [02 Role & Feature Walkthrough](06-presentation/02-role-and-feature-walkthrough.md) — per-role + per-feature demo deck (Marp).

---

## Viewing the diagrams & decks

- **Mermaid diagrams** render automatically on GitHub and in most Markdown viewers (VS Code with a Mermaid
  extension, Obsidian, etc.). No tooling needed to read them inline.
- **Presentation decks** are [Marp](https://marp.app/) Markdown. To export slides:
  ```bash
  # PDF
  npx -y @marp-team/marp-cli documents/06-presentation/01-master-deck.md --pdf
  # PowerPoint
  npx -y @marp-team/marp-cli documents/06-presentation/01-master-deck.md --pptx
  ```

## At a glance

- **5 roles** · **29 database tables** · **72 REST endpoints** · **6 enforced state machines**
- **58 Mermaid diagrams** (ER, class, sequence, state, use-case, activity) · **2 slide decks**
- Verified state (2026-06-05): api 50 tests + build · web 185 tests + `tsc -b` + build · 5 live end-to-end smokes (all green) · self-hosted SeaweedFS S3 storage.
