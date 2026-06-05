# Glossary & Status Reference

A comprehensive reference of terms, entities, and state enums used throughout the manga studio workflow system.

## Glossary (A–Z)

| Term | Meaning |
|------|---------|
| **Admin** | System administrator role; manages user activation, role assignments, earning disputes, and system configuration. |
| **Annotation** | Editorial feedback on a page, manuscript, or submission. Includes a spatial coordinate pair (x, y) and a category (CONTENT_ISSUE, DIALOGUE_ISSUE, SCRIPT_ISSUE, VISUAL_ISSUE, GENERAL). Can be marked resolved. |
| **Assistant** | Freelance contributor role; completes tasks (inking, coloring, lettering, etc.) and submits work for review. Earnings accrue on submission approval. |
| **Assistant Profile** | User profile record for the ASSISTANT role; tracks salary_rate, skill_set, and total_earnings (sum of approved task payments). |
| **Audit Log** | Cross-cutting log table recording who did what (CREATE, UPDATE, DELETE, APPROVE, REJECT, PUBLISH, ASSIGN, SUBMIT, VOTE, DECIDE, etc.) on which entity, with before/after values and IP/user-agent. Schema present; wiring in progress. |
| **Chapter** | A numbered section of a Series; contains ordered pages. Transitions: DRAFT → IN_PROGRESS → READY_FOR_EDITOR_REVIEW → EDITOR_APPROVED → PUBLISHED. |
| **Decision** | An Editorial Board choice affecting a Series: CONTINUE (next vote period), CANCEL (end series), CHANGE_FREQUENCY (WEEKLY ↔ MONTHLY), or HIATUS (pause production). Applied to a Ranking; updates Series status. |
| **Editorial Board** | Leadership role; approves series proposals, assigns editors, opens vote periods, votes on series, and makes editorial decisions. |
| **Editorial Board Profile** | User profile for the EDITORIAL_BOARD role; tracks position, seniority_level, voting_power, and joined_at. |
| **Earning Dispute** | A formal claim by an Assistant that a task's payment_amount is unfair; includes expected_amount and dispute_reason. Status: OPEN → UNDER_REVIEW → RESOLVED or REJECTED. Admin resolution can adjust the payment. |
| **Earnings** | Sum of all APPROVED task payments for an Assistant; stored as total_earnings in Assistant_Profile and updated on submission approval or dispute resolution. |
| **Genre** | A category tag (e.g., Action, Comedy, Slice-of-Life) assigned to a Proposal or Series via a bridge table (M–N relationship). |
| **JWT** | JSON Web Token; issued on login (email+password or Google OAuth) and required in the Authorization header for all protected API endpoints. Contains user_id, email, role. |
| **Mangaka** | Creator/author role; proposes series, creates chapters and pages, defines regions and tasks, reviews assistant submissions, and publishes chapters. |
| **Mangaka Profile** | User profile for the MANGAKA role; tracks pen_name, biography, years_experience, studio_name, and social_link. |
| **Manuscript** | A chapter-level version of the work (DRAFT, REVIEWING, FINAL status). Present in schema; largely unused by the current flow (Editor reviews via Chapter/Page instead). |
| **Notification** | An in-app alert sent to a user on specific events (task assignment, submission, review decision, proposal decision, risk alert, dispute, general). Recipient, type, title, content, and related entity tracked. |
| **Page** | A numbered visual element within a Chapter; can have multiple versions (Page_Version) as revisions. Status: RAW → ASSIGNED → IN_PROGRESS → REVIEWING → COMPLETED. |
| **Page Version** | A specific revision of a Page; includes version_number, image_url, uploaded_by user, and upload_note. Allows non-destructive revision tracking. |
| **Publication Schedule** | A record linking a Chapter to a release_date and publish_status (SCHEDULED, PUBLISHED, CANCELLED). Auto-created when Chapter transitions to PUBLISHED. |
| **Proposal** | A Series idea submitted by a Mangaka to the Editorial Board, including title, synopsis, genres, and proposed frequency. Status: DRAFT → SUBMITTED → UNDER_REVIEW → APPROVED or REJECTED. |
| **RBAC** | Role-Based Access Control; in this system, enforced via JWT + `@Roles(Role.X)` decorators on NestJS controllers and `ProtectedRoute` wrappers in React. |
| **Ranking** | A calculated Series standing within a Vote_Period, including rank_position, total_score (sum of board votes), and risk_level (LOW, MEDIUM, HIGH). Triggers notifications and decision-making. |
| **Region** | A spatial area on a Page_Version (panel, background, character, dialogue bubble, or effect); defined by x, y, width, height, z-index. Tasks are created per region. ai_suggested flag indicates AI-detected regions. |
| **Region Type** | One of: PANEL, BACKGROUND, CHARACTER, DIALOGUE_BUBBLE, EFFECT. Determines task auto-pricing via Task_Price_Rule. |
| **Risk Level** | A Ranking attribute (LOW, MEDIUM, HIGH) computed from vote totals; HIGH triggers a risk alert notification to Mangaka and Board. |
| **Series** | A published or in-progress manga, created from an APPROVED Proposal. Status: ACTIVE (normal), AT_RISK (high vote risk), HIATUS (paused), CANCELLED (ended), COMPLETED. Assigned to a Tantou_Editor. |
| **Studio** | In-browser raster drawing application (canvas editor) for assistants and mangaka to draw, paint, and manipulate artwork. Includes pixel ops via WASM and optional on-device AI assists. |
| **Submission** | An Assistant's uploaded work on a Task; includes version_number, file_url, version_note, feedback, and reviewed_by user. Status: PENDING → UNDER_REVIEW → APPROVED (accrues earnings), REVISION_REQUIRED (loops), or REJECTED. |
| **System Config** | Key–value configuration table for system-level settings (e.g., default task prices, notification thresholds). Schema present; wiring in progress. |
| **Tantou Editor** | Lead editorial role; assigned to a Series; reviews chapters, adds annotations, and approves or requests revisions before publication. |
| **Tantou Editor Profile** | User profile for the TANTOU_EDITOR role; tracks department_name, specialization, years_experience, and managed_series_count. |
| **Task** | A unit of work assigned to an Assistant on a Region, with deadline, task_description, instruction, and auto-priced payment_amount. Status: ASSIGNED → IN_PROGRESS → SUBMITTED → APPROVED or REVISION_REQUIRED. |
| **Task Price Rule** | A pricing template defining base_price for a region_type (PANEL, BACKGROUND, CHARACTER, DIALOGUE_BUBBLE, EFFECT) with effective_from/to dates. Active rules auto-price tasks at creation. |
| **User** | A system account with email (unique), password_hash (nullable; Google OAuth users omit), full_name, avatar_url, role (one of 5), auth_provider (LOCAL or GOOGLE), google_id (if OAuth), is_activated (account enabled), and timestamps. |
| **Vote** | A numeric score (with optional comment) cast by an Editorial Board member on a Series during an open Vote_Period. Uniq per (vote_period_id, board_user_id); sum totals into Ranking. |
| **Vote Period** | A time window (WEEKLY or MONTHLY) during which Board members vote on a Series. Status: OPEN → CLOSED. Closing triggers Ranking computation and risk alert notifications. |
| **WASM** | WebAssembly (AssemblyScript-compiled); used in the Studio for accelerated pixel operations (brush rendering, fill, layer blending, etc.). |
| **on-device AI** | Optional client-side AI inference (ONNX Runtime Web) running in the browser: panel detection (YOLO), smart selection (MobileSAM), colorization (DeOldify). No external API dependency; heuristic fallback if unavailable. |
| **Object Storage / S3** | SeaweedFS-based S3-compatible object storage (self-hosted in Docker, port 8333). Stores durable file objects (avatars, page versions, submissions) with stable keys; served at `/uploads/:key` with path-traversal protection. |
| **Transaction** | Database-level atomic operation (ACID): multiple statements grouped via `DbService.transaction()` such that all succeed or all rollback together. Used for proposal approval, submission review, dispute resolution, chapter publication to ensure data consistency. |
| **Rate Limiting / Throttling** | Request-per-minute limits enforced via `@nestjs/throttler` to prevent abuse: global 120/min, login 20/min. Returns 429 Too Many Requests if exceeded. |
| **Exception Filter** | Global error handler (`AllExceptionsFilter`) that sanitizes all exception responses: HTTP status codes returned, no SQL/stack traces leaked; generic Vietnamese error message for unhandled 500 errors. |

## Status Enum Quick Reference

### Proposal Status
| Status | Next Valid Transitions |
|--------|------------------------|
| DRAFT | SUBMITTED |
| SUBMITTED | UNDER_REVIEW, APPROVED, REJECTED |
| UNDER_REVIEW | APPROVED, REJECTED |
| APPROVED | (terminal) |
| REJECTED | (terminal) |

### Series Status
| Status | Trigger | Notes |
|--------|---------|-------|
| ACTIVE | Created from APPROVED proposal | Normal operating state. |
| AT_RISK | High-risk ranking detected | Board notified; decision may follow. |
| HIATUS | Decision.CHANGE_FREQUENCY applied | Paused, but can resume. |
| CANCELLED | Decision.CANCEL applied | Series ended by editorial decision. |
| COMPLETED | Manual or archive trigger | Series finished naturally. |

### Chapter Status
| Status | Next Valid Transitions |
|--------|------------------------|
| DRAFT | IN_PROGRESS |
| IN_PROGRESS | READY_FOR_EDITOR_REVIEW |
| READY_FOR_EDITOR_REVIEW | EDITOR_APPROVED, IN_PROGRESS |
| EDITOR_APPROVED | PUBLISHED |
| PUBLISHED | (terminal) |

### Page Status
| Status | Next Valid Transitions |
|--------|------------------------|
| RAW | ASSIGNED |
| ASSIGNED | IN_PROGRESS |
| IN_PROGRESS | REVIEWING |
| REVIEWING | COMPLETED, IN_PROGRESS |
| COMPLETED | (terminal) |

### Task Status
| Status | Next Valid Transitions |
|--------|------------------------|
| ASSIGNED | IN_PROGRESS |
| IN_PROGRESS | SUBMITTED |
| SUBMITTED | APPROVED, REVISION_REQUIRED |
| REVISION_REQUIRED | IN_PROGRESS, SUBMITTED |
| APPROVED | (terminal) |

### Submission Status
| Status | Next Valid Transitions |
|--------|------------------------|
| PENDING | UNDER_REVIEW, APPROVED, REVISION_REQUIRED, REJECTED |
| UNDER_REVIEW | APPROVED, REVISION_REQUIRED, REJECTED |
| REVISION_REQUIRED | (terminal; task loops) |
| APPROVED | (terminal; payment accrued) |
| REJECTED | (terminal; payment denied) |

### Vote Period Status
| Status | Trigger |
|--------|---------|
| OPEN | Created by Board |
| CLOSED | Board invokes close endpoint; Ranking computed |

### Publication Status
| Status | Trigger |
|--------|---------|
| SCHEDULED | Auto-created from Chapter → PUBLISHED |
| PUBLISHED | Board or system publishes |
| CANCELLED | Board cancels scheduled release |

### Earning Dispute Status
| Status | Next Valid Transitions |
|--------|------------------------|
| OPEN | UNDER_REVIEW, RESOLVED, REJECTED |
| UNDER_REVIEW | RESOLVED, REJECTED |
| RESOLVED | (terminal; payment adjusted) |
| REJECTED | (terminal; payment unchanged) |

### Annotation Categories
| Category | Purpose |
|----------|---------|
| CONTENT_ISSUE | Story, plot, or narrative feedback. |
| DIALOGUE_ISSUE | Dialogue, speech, or text problems. |
| SCRIPT_ISSUE | Script format or structure feedback. |
| VISUAL_ISSUE | Art, composition, or visual quality feedback. |
| GENERAL | Miscellaneous editorial comments. |

### Decision Types
| Type | Effect |
|------|--------|
| CONTINUE | Series remains ACTIVE; next vote period scheduled. |
| CANCEL | Series transitioned to CANCELLED; production ends. |
| CHANGE_FREQUENCY | Series frequency changed (WEEKLY ↔ MONTHLY); Series remains ACTIVE. |
| HIATUS | Series transitioned to HIATUS; production paused pending resumption. |

### Notification Types
| Type | Trigger |
|------|---------|
| DEADLINE | Task/chapter deadline approaching or passed. |
| TASK_ASSIGNMENT | Assistant assigned a new task. |
| SUBMISSION | Assistant submits work on a task. |
| REVISION | Mangaka requests revision on submission. |
| REVIEW | Editor or mangaka approves/rejects work. |
| PROPOSAL_DECISION | Board approves or rejects proposal. |
| RISK_ALERT | Series ranking risk level flagged. |
| DECISION | Board makes editorial decision (continue/cancel/frequency/hiatus). |
| DISPUTE | Earning dispute opened or resolved. |
| GENERAL | Miscellaneous system announcements. |

---

**Related documentation:**
- [Product Overview](01-product-overview.md)
- [Requirements & Use Cases](02-requirements-and-use-cases.md)
- [System Architecture](../02-architecture/01-system-architecture.md)
