# README Overhaul Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the root README with a verified product overview and local-development guide that links to the repository's detailed documentation.

**Architecture:** Keep `README.md` as the concise entry point and preserve `documents/` as the source for deep architecture, API, workflow, and role material. All setup commands, environment variables, URLs, and paths must be verified against repository files before publication.

**Tech Stack:** Markdown, PowerShell validation, pnpm workspace scripts, React/Vite frontend, NestJS backend, MySQL/Docker Compose.

---

### Task 1: Verify README source facts

**Files:**
- Read: `package.json`
- Read: `apps/backend/.env.example`
- Read: `apps/frontend/vite.config.ts`
- Read: `apps/backend/src/main.ts`
- Read: `apps/backend/src/seed/seed.service.ts`
- Read: `documents/README.md`

- [ ] **Step 1: Verify root commands**

Run:

```powershell
(Get-Content -Raw package.json | ConvertFrom-Json).scripts | Format-List
```

Expected: output includes `dev:frontend`, `dev:backend`, `build`, `test`, `db:up`, and `db:down`.

- [ ] **Step 2: Verify local environment variables**

Run:

```powershell
Get-Content apps/backend/.env.example
Select-String -Path apps/backend/src/**/*.ts -Pattern 'OTP_DEV_ECHO|DEMO_USER_PASSWORD'
```

Expected: database, server, JWT, and Google OAuth variables are present; development OTP echo and demo-password behavior are confirmed from source.

- [ ] **Step 3: Verify application URLs**

Run:

```powershell
Select-String -Path apps/backend/src/main.ts,apps/frontend/vite.config.ts -Pattern '3000|5173|api/docs|proxy'
```

Expected: frontend uses port `5173`, backend uses port `3000`, and Swagger is mounted at `/api/docs`.

### Task 2: Rewrite the root README

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Replace the stale overview with the approved structure**

Write the following sections in English:

```markdown
# Manga Creation Workflow & Publishing Management System

## Overview
## Production Workflow
## Roles and Capabilities
## Technology Stack
## Repository Structure
## Prerequisites
## Quick Start
### 1. Install dependencies
### 2. Configure the backend
### 3. Start infrastructure
### 4. Start backend and frontend
## Local URLs
## Demo Authentication and Development OTP
## Available Commands
## Troubleshooting
## Documentation
## Contributing
```

The content must:

- Explain that the product is an internal studio workflow system, not a manga reader.
- Summarize the proposal-to-publishing lifecycle.
- Describe all five roles without duplicating role documents.
- Show `Copy-Item apps/backend/.env.example apps/backend/.env` for Windows setup and `cp apps/backend/.env.example apps/backend/.env` for POSIX setup.
- Explain that `OTP_DEV_ECHO=true` is development-only and must not be enabled in production.
- Document `http://localhost:5173`, `http://localhost:3000/api`, and `http://localhost:3000/api/docs`.
- Explain the `EADDRINUSE` and `No database selected` fixes without destructive commands.
- Link to the overview, architecture, API, workflow diagrams, and role documents under `documents/`.
- Describe branch creation, focused commits, push, and pull requests without encouraging direct pushes to protected branches.

- [ ] **Step 2: Review for secrets and unsupported claims**

Run:

```powershell
Select-String -Path README.md -Pattern 'your-secret-key|changeme|OTP_DEV_ECHO=true|password' -CaseSensitive:$false
```

Expected: example-only values are clearly labeled; no real credential or unsupported production configuration is present.

### Task 3: Validate the README

**Files:**
- Validate: `README.md`

- [ ] **Step 1: Verify documented repository links**

Run:

```powershell
@(
  'documents/README.md',
  'documents/01-overview/01-product-overview.md',
  'documents/02-architecture/01-system-architecture.md',
  'documents/03-api/01-api-reference.md',
  'documents/04-diagrams/03-activity-and-workflow-diagrams.md',
  'documents/05-roles/01-mangaka.md',
  'documents/05-roles/02-assistant.md',
  'documents/05-roles/03-tantou-editor.md',
  'documents/05-roles/04-editorial-board.md',
  'documents/05-roles/05-admin.md'
) | ForEach-Object { if (-not (Test-Path -LiteralPath $_)) { "MISSING: $_" } }
```

Expected: no output.

- [ ] **Step 2: Check Markdown diff hygiene**

Run:

```powershell
git diff --check -- README.md
git diff --stat -- README.md
```

Expected: `git diff --check` produces no output; the stat reports only the intentional README rewrite.

- [ ] **Step 3: Confirm only scoped files changed**

Run:

```powershell
git status --short
```

Expected: only `README.md` and the approved planning artifacts are changed or committed.

### Task 4: Commit the README

**Files:**
- Commit: `README.md`

- [ ] **Step 1: Stage only the README**

Run:

```powershell
git add -- README.md
git diff --cached --check
git diff --cached --stat
```

Expected: the staged diff contains only `README.md` and has no whitespace errors.

- [ ] **Step 2: Commit the documentation change**

Run:

```powershell
git commit -m "docs: expand project README"
```

Expected: one documentation commit is created on `feature/frontend-task-assignment`.

- [ ] **Step 3: Inspect final branch state**

Run:

```powershell
git status --short
git log -2 --oneline
```

Expected: working tree is clean and the README commit appears above the design commit.
