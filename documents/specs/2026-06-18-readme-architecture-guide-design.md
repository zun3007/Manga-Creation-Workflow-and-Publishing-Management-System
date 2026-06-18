# README Architecture Guide Design

## Goal

Extend the root README with practical architecture, API, role-demo, testing, and
production-readiness guidance while keeping detailed reference material in the
existing `documents/` tree.

## Audience

- Reviewers evaluating the complete product workflow.
- Developers learning how requests travel through the system.
- Demonstrators preparing a role-by-role walkthrough.
- Maintainers validating tests and production configuration.

## Additions

### Navigation

Add a compact table of contents so readers can reach setup, architecture, API,
demo, testing, troubleshooting, and contribution sections directly.

### Architecture overview

Add one Mermaid flowchart covering the browser, Vite development proxy, NestJS
API, shared contracts, MySQL, and SeaweedFS. Follow it with a short request flow
that explains token attachment, guards, validation, service execution, storage,
and response handling.

### API examples

Document verified local examples for:

- Password login and the optional 2FA challenge.
- 2FA verification.
- Listing an assistant's tasks.
- Starting an assigned task.
- Creating a submission.

Examples must use existing endpoint paths and payload fields from backend
controllers and DTOs. Tokens and OTPs must use obvious placeholders.

### Role-based demo walkthrough

Provide a concise scenario that moves work from proposal and production setup to
assistant execution, mangaka review, editor review, governance, and administration.
Each step should name the acting role, UI destination, action, and resulting state.

### Testing strategy

Describe package, frontend, and backend test responsibilities. Include root and
workspace-filtered commands that already work in the pnpm monorepo.

### Production checklist

Document checks for secrets, JWT, OAuth, SMTP, CORS, development OTP echo, database
initialization, object storage, build output, tests, and observability. The section
must avoid claiming the repository provides deployment automation that does not
exist.

### Expanded FAQ

Add concise answers for selecting the correct clone/branch, refreshing a stale
frontend, locating API documentation, and diagnosing unavailable uploads.

## Boundaries

- Modify `README.md` only for implementation; retain this design as an artifact.
- Do not add generated filler, fake statistics, or duplicate full documents.
- Do not expose real secrets, access tokens, OTPs, or production credentials.
- Do not add screenshots unless a repository-owned image asset is available.
- Keep the README in English to match the current root documentation.

## Validation

- Verify every endpoint and request field against controllers and DTOs.
- Verify every command against package scripts and installed workspace names.
- Verify all relative Markdown links resolve.
- Render-check Mermaid syntax structurally.
- Run `git diff --check` and the full `pnpm test` suite.

## Success Criteria

- A developer can explain the system request path without opening source files.
- A reviewer can execute a complete role-based demo from the README.
- API examples are safe to copy after replacing explicit placeholders.
- Test and production checklists accurately describe repository capabilities.
- Existing deep documentation remains the source of detailed reference material.
