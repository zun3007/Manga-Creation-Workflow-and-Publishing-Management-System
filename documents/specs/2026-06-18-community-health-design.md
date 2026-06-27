# Community Health Files Design

## Goal

Add a practical community-health baseline that helps contributors propose,
review, and report changes consistently without exposing sensitive information.

## Files and Responsibilities

### `CONTRIBUTING.md`

Provide the contributor onboarding path: prerequisites, local setup, branch naming,
change scope, commit style, validation commands, pull-request expectations, and
rules for protecting secrets and generated artifacts.

### `.github/PULL_REQUEST_TEMPLATE.md`

Prompt authors for a concise summary, change type, validation evidence, UI
screenshots when applicable, risk notes, and a final quality checklist.

### `SECURITY.md`

Explain which branch receives security fixes, how to report vulnerabilities
privately, what evidence a useful report needs, what information must never be
posted publicly, and what response steps reporters can expect.

### `CODE_OF_CONDUCT.md`

Define expected collaboration behavior, unacceptable conduct, scope, private
reporting, and proportionate enforcement. Use project-specific language rather
than copying a third-party policy without attribution.

### `.github/ISSUE_TEMPLATE/bug_report.md`

Collect reproducible bug reports with affected role, environment, prerequisites,
steps, expected and actual behavior, logs/screenshots, regression status, and
security screening.

### `.github/ISSUE_TEMPLATE/feature_request.md`

Collect the user problem, affected roles, proposed outcome, alternatives,
acceptance criteria, workflow impact, and additional context.

## Integration

- Link the contribution and security policies from the root README.
- Keep templates in Markdown so their behavior is transparent and requires no
  GitHub issue-form schema maintenance.
- Keep deep engineering documentation in `documents/`; community files only
  route contributors to the correct workflow.

## Safety Boundaries

- Do not publish a personal email address as a security contact.
- Do not ask reporters to post exploits, credentials, private data, or tokens in
  public issues.
- Do not promise response deadlines or support guarantees the project has not
  formally adopted.
- Do not permit direct pushes to `main` or `development` in contributor guidance.
- Do not add generated filler or duplicate existing architecture/API documents.

## Validation

- Confirm every new Markdown file exists at the expected repository path.
- Verify all relative links resolve.
- Scan new files for credential-like values and unfinished placeholders.
- Run `git diff --check`, the full test suite, and the full build.
- Review the final commits for the verified GitHub author email.

## Success Criteria

- A first-time contributor can create a focused branch and validated pull request.
- Reviewers receive consistent evidence and risk information in every PR.
- Bug and feature issues contain enough information for triage.
- Vulnerability reporters are directed away from public disclosure.
- Collaboration expectations and enforcement boundaries are explicit.
