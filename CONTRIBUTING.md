# Contributing

Thanks for helping improve the Manga Creation Workflow & Publishing Management
System. Keep changes focused, reviewable, and safe for the studio workflow.

## Before You Start

Use the setup and troubleshooting instructions in the [README](README.md). The
local environment requires Node.js, pnpm, Docker, and Docker Compose.

From the repository root:

```powershell
pnpm install --frozen-lockfile
pnpm db:up
```

Run the backend and frontend in separate terminals:

```powershell
pnpm dev:backend
```

```powershell
pnpm dev:frontend
```

Do not commit local environment files, credentials, tokens, database volumes,
build output, coverage output, uploads, or editor-specific generated files.

## Choose a Focused Branch

Start from the team's integration branch and never push changes directly to
`development` or `main`.

```powershell
git fetch origin
git switch development
git pull --ff-only origin development
git switch -c feature/short-description
```

Use one of these prefixes:

- `feature/` for user-facing capabilities.
- `fix/` for defects and regressions.
- `docs/` for documentation-only changes.

Keep unrelated refactors and formatting out of the same branch.

## Commit Style

Use Conventional Commit subjects:

```text
feat: add chapter review filters
fix: prevent duplicate task submission
docs: clarify local database setup
test: cover proposal approval rules
refactor: isolate upload validation
```

Write imperative, specific subjects. Explain the reason in the commit body when
the behavior or trade-off is not obvious from the diff.

## Validate the Change

Run focused tests while developing, then run the repository checks before opening
a pull request:

```powershell
pnpm test
pnpm build
git diff --check
```

For UI changes, verify the affected states at desktop and narrow viewport widths,
check keyboard interaction, and include screenshots in the pull request. For API
changes, verify validation, authorization boundaries, error responses, and any
affected Swagger examples.

## Open a Pull Request

Push the branch and open a pull request into `development`:

```powershell
git push -u origin feature/short-description
```

Complete the pull-request template with:

- The user or engineering problem being solved.
- The scope and notable design decisions.
- Exact test and build evidence.
- Screenshots for visible UI changes.
- Migration, security, compatibility, and rollback risks.

Respond to review feedback with a new focused commit or a clear technical
explanation. Do not rewrite shared branch history without maintainer approval.

## Security and Conduct

Do not disclose suspected vulnerabilities in a public issue or pull request.
Follow [SECURITY.md](SECURITY.md) for private reporting. Participation in this
project is governed by [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md).
