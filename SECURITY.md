# Security Policy

## Supported Branches

Security fixes are developed and reviewed against `development`. Maintainers may
promote a verified fix to `main` through the release workflow or prepare a
targeted backport when an affected release requires it. Do not push a security
fix directly to either protected branch.

## Report a Vulnerability Privately

Do not open a public issue, discussion, or pull request for a suspected
vulnerability.

Use the repository's **Security** tab and its private vulnerability reporting
option when it is available. If that option is unavailable, contact the
repository owner or maintainers through the project's existing private team
channel and ask for a private reporting route. Do not send exploit details until
the private channel is confirmed.

Never include credentials, access tokens, personal data, production records, or
private keys in a report. Use sanitized samples and remove secrets from logs and
screenshots.

## What to Include

A useful report contains:

- The affected component, route, workflow, and role.
- The observed impact and realistic attack conditions.
- Reproduction steps using non-sensitive test data.
- The affected branch, commit, or release when known.
- Sanitized logs, screenshots, or a minimal proof of concept.
- Any mitigation already tested.
- Whether the issue may already be public or actively exploited.

## What to Expect

Maintainers will privately acknowledge the report, reproduce and assess the
impact, coordinate a fix and validation, and decide when disclosure is safe.
Response and remediation time depend on severity, reproducibility, and maintainer
availability; this policy does not promise a fixed deadline.

Reporters should keep details private until maintainers confirm that disclosure
is appropriate. Maintainers will credit reporters when requested and safe to do
so, subject to legal, privacy, and project constraints.

## Out of Scope

General bugs, feature requests, setup problems, and questions without a security
impact belong in the normal issue workflow. Reports based only on automated scan
output should include a demonstrated impact and reproducible evidence.
