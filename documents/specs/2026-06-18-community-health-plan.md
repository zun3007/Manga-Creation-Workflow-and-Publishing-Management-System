# Community Health Files Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add focused contribution, pull-request, security, conduct, and issue-reporting guidance without expanding the root README into another policy manual.

**Architecture:** Keep each community concern in the repository path GitHub recognizes for that concern. The root README remains an entry point and links to the detailed policies; Markdown issue templates use GitHub-supported front matter and avoid issue-form schema maintenance.

**Tech Stack:** Markdown, GitHub community health files, pnpm workspace validation

---

### Task 1: Contributor and pull-request guidance

**Files:**
- Create: `CONTRIBUTING.md`
- Create: `.github/PULL_REQUEST_TEMPLATE.md`

- [ ] **Step 1: Add contributor onboarding**

Document prerequisites, setup commands, branch names, Conventional Commits, validation, pull-request expectations, and secret/generated-file safety.

- [ ] **Step 2: Add the pull-request template**

Collect summary, change type, validation evidence, screenshots, risks, and a final quality checklist.

- [ ] **Step 3: Check formatting**

Run: `git diff --check -- CONTRIBUTING.md .github/PULL_REQUEST_TEMPLATE.md`

Expected: exit code 0 with no whitespace errors.

### Task 2: Security and conduct policies

**Files:**
- Create: `SECURITY.md`
- Create: `CODE_OF_CONDUCT.md`

- [ ] **Step 1: Add private vulnerability reporting guidance**

Define supported branches, private reporting routes, report contents, prohibited public disclosure, and the expected handling stages without promising deadlines.

- [ ] **Step 2: Add project-specific conduct guidance**

Define expected and unacceptable behavior, scope, private reporting, confidentiality, and proportionate enforcement.

- [ ] **Step 3: Check formatting**

Run: `git diff --check -- SECURITY.md CODE_OF_CONDUCT.md`

Expected: exit code 0 with no whitespace errors.

### Task 3: Issue templates

**Files:**
- Create: `.github/ISSUE_TEMPLATE/bug_report.md`
- Create: `.github/ISSUE_TEMPLATE/feature_request.md`

- [ ] **Step 1: Add the bug-report template**

Collect affected role, environment, prerequisites, reproduction steps, expected and actual behavior, regression information, and sanitized evidence. Redirect security reports away from public issues.

- [ ] **Step 2: Add the feature-request template**

Collect the user problem, affected roles, desired outcome, alternatives, acceptance criteria, workflow impact, and context.

- [ ] **Step 3: Validate template front matter**

Run a deterministic script that confirms each template starts and ends front matter and defines `name`, `about`, `title`, `labels`, and `assignees` exactly once.

Expected: both templates report valid front matter.

### Task 4: README integration and repository validation

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Add policy links to the Contributing section**

Link `CONTRIBUTING.md`, `SECURITY.md`, and `CODE_OF_CONDUCT.md` before the existing short branch workflow.

- [ ] **Step 2: Validate links and unfinished markers**

Run a deterministic PowerShell check over the seven community files and README links. Confirm every target exists and no `TODO`, `TBD`, credential, token, or private-key marker appears.

Expected: all checks pass.

- [ ] **Step 3: Run repository verification**

Run: `pnpm test`

Expected: all workspace tests pass.

Run: `pnpm build`

Expected: all workspace builds pass.

Run: `git diff --check`

Expected: exit code 0.

- [ ] **Step 4: Review branch state**

Run: `git status --short && git diff --stat && git log -1 --format="%h %ae %s"`

Expected: only the planned community-health files and README are changed, and the existing design commit uses the intended author identity.
