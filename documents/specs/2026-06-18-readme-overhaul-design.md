# README Overhaul Design

## Goal

Replace the short root README with a reliable entry point that both presents the
product and helps a new developer run it locally without reading source code.

## Audience

- Reviewers who need a concise product and workflow overview.
- Developers setting up the monorepo for the first time.
- Contributors looking for deeper architecture, API, role, and workflow docs.

## Structure

The root README will contain:

1. Product purpose and non-goals.
2. End-to-end manga production workflow.
3. User roles and their primary capabilities.
4. Technology stack and monorepo layout.
5. Prerequisites and first-time installation.
6. Backend environment setup from `.env.example`.
7. Database, backend, and frontend startup instructions.
8. Local URLs for the application, API, and Swagger UI.
9. Demo authentication and development OTP guidance.
10. Build, test, and database commands.
11. Common local-development troubleshooting.
12. Links to detailed documents under `documents/`.
13. A branch, commit, push, and pull-request contribution workflow.

## Content Boundaries

- Keep detailed architecture, API tables, diagrams, and role specifications in
  `documents/`; the root README only summarizes and links to them.
- Document only commands and behavior verified against repository files.
- Do not include secrets, generated filler, fabricated metrics, or screenshots
  that are not stored in the repository.
- Use English to match the existing README and source identifiers.

## Validation

- Verify every referenced path exists.
- Verify every documented command exists in `package.json`.
- Verify local URLs and environment variable names against backend/frontend code.
- Scan the final Markdown for broken relative links and obsolete `docs/` paths.
- Review `git diff --check` before committing.

## Success Criteria

- A new developer can install and run database, backend, and frontend from the
  root README.
- A reviewer can understand the product, workflow, roles, and major technology
  choices in a few minutes.
- Detailed material is discoverable without duplicating the `documents/` tree.
