# P22 · Remaining development roadmap

**Status:** Approved by the repository owner on 2026-11-24. The planning documents are being aligned to this roadmap. Implementation still requires a separate approved plan for each milestone. Live deployments, including promotion and removal of the hosting gate, require explicit authorization.

## Progress through 2026-11-25

The checklist records completed work and verification evidence task by task; its total is not used as a milestone acceptance measure. M1a's login, upload, protected OCR results, private previews, and browser-to-worker workflow are implemented and verified. P22-36a remains incomplete: access events are written, but database-level append-only enforcement is not verified. M1b's mixed intake, OCR worker, quarantine retry/permanent-failure actions, protected queue, and real corrupt-then-valid workflow are implemented and verified. P22-14 currently persists document fingerprints and reports exact/reordered-image matches; save-time blocking remains deferred until the official-save flow exists. P22-45's queue and quarantine actions are present, while Editor navigation and review-ready integration remain pending. P22-49b, the owner-led completion of the 30-document Document Corpus inventory, is still open.

The Application is now connected through the actual React and Laravel workflows for login, upload, OCR status, protected results and previews, and the DS-004 review/quarantine queue. Search and browse, Editor publication, and the remaining M2–M5 workflows are still pending as recorded in the checklist.

DS-001, DS-003, DS-004 and DS-010 are implemented; DS-002, DS-007 and DS-011 are approved. DS-007's mock is `docs/design/mocks/DS-007.html`; the registry approval is recorded in commit `34c1ed4` (2026-11-24). Its design task P22-30b is complete. DS-005 and DS-006 have draft mocks, DS-009 has a draft mock that still needs its incorrect-password state, and DS-008 and DS-012 have no mock files. All five remain unapproved and require explicit owner approval before implementation.

See the [task checklist](p22-task-checklist.md), [Screen registry](../../design/registry.yaml), and the [P22 brief](../../brief.md). All completed implementation and verification evidence remains in the checklist.

## Estimate basis and delivery risk

Recorded active/verification windows are sparse: P22-01 took about 4 minutes, P22-02 about 6 minutes, and P22-06a's local implementation and verification window was about 8 minutes. These were small setup/conversion tasks, not comparable end-to-end Screen integrations. Most completed work has test results but no recorded active time, approval duration, or approval-to-verification turnaround. Owner review time is also not recorded. The ranges below are forecasts, not measured averages; record those five quantities separately as work proceeds.

| Milestone | Codex execution (implementation + automated verification) | Owner review/approval | Owner manual testing | Elapsed turnaround target |
|---|---:|---:|---:|---:|
| M1a · First usable workflow | 8–12 h | 1–1.5 h | 0.5–1 h | 1–2 days |
| M1b · Intake and queue completion | 8–12 h | 0.75–1.25 h | 1–1.5 h | 1–2 days |
| M2 · Safe review and publication | 18–25 h | 1–1.5 h | 1.5–2.5 h | 2–3 days |
| M3 · Search and secure archive access | 14–20 h | 0.75–1.25 h | 1–1.5 h | 1–2 days |
| M4 · Staff operations, sharing and retention | 18–26 h | 1.5–2.5 h | 1.5–2.5 h | 2–3 days |
| M5 · Integration, polish and release verification | 8–14 h | 0.5–1 h | 2–3 h | 1–2 days |
| **Total** | **74–109 h** | **5.5–9 h** | **7.5–12 h** | **8–14 days if fully serial** |

The seven-day implementation target (Nov 24–Dec 1) is a high-risk stretch: it needs sustained daily work, prompt mock and milestone reviews, and overlapping independent work. The elapsed targets overlap only where dependencies allow. The estimates exclude the owner's manual Document Corpus preparation. Live corpus acceptance adds an estimated 3–6 hours of owner testing, plus the Secretar Notarial's five searches. Record actual task active time, owner review time, manual testing time, and approval-to-verified turnaround so forecasts can be recalibrated after M1a and M1b.

## Milestones

### M1a · First usable, secure workflow — target Nov 24–25

Prepare and approve a separate implementation plan for each M1a part before coding. The owner approved the M1a.1 plan and DS-010/DS-001 Screens on 2026-11-24; plan M1a.2–M1a.4 after the preceding part is verified. The earliest browser checkpoint remains targeted for Nov 25.

**Owner experience:** Log in and out through DS-010, land on the D-042 default DS-001 Screen, upload one real Document Scan through DS-003, see its actual OCR status, open a protected preview, and read persisted OCR text in DS-011. DS-001 can initially show its true empty state; unimplemented archive search and browse controls remain disabled or hidden. Do not use mock data for application behavior.

**Scope:** P22-20a and P22-20b mock approvals (owner-approved 2026-11-24); P22-35 login Screen; the first thin slice of P22-23 and P22-34; complete P22-36a audit writer; the authenticated draft-preview slice of P22-38. Use the existing React/Laravel/PostgreSQL/Docker, queue worker, R2, C-001 Signed URL delivery and amended C-003 authentication infrastructure. Split delivery into M1a.1 Login and application foundation, M1a.2 Upload and OCR processing, M1a.3 Protected OCR results and preview, and M1a.4 Integration and milestone verification. Each part gets its own plan/build/verification; only M1a.1 is currently planned in detail. M1a.2 uses manual status refresh so background requests do not extend the approved 30-minute idle timeout. See [M1a.1 plan](p22-m1a-1-login-and-application-foundation.md).

**Security gate:** Enforce `admin`/`arhivar` authorization before draft data or preview access; issue expiring Signed URLs only after authorization; log the staff access before serving sensitive content; keep storage private; do not expose drafts, OCR or originals to `cititor`. Define safe initial live-admin provisioning without committed/default production credentials. Use the approved Sanctum first-party SPA session flow with HttpOnly cookies, CSRF protection, encrypted server-side sessions, a 30-minute idle timeout and 12-hour maximum; revoke legacy bearer tokens and do not accept bearer auth on application routes.

**Acceptance:** In the actual browser Screens, authenticate, upload a synthetic single document, follow its persisted queue status, see Romanian extracted text, preview the private source, and log out. Verify invalid credentials, 401/403 role boundaries, Signed URL expiry, audit entry, and no sensitive content in URLs/logs. Run the changed Screens in Playwright desktop/mobile and light/dark, then let the owner manually complete the same workflow.

### M1b · Complete intake, batch and quarantine — target Nov 25–26

**Owner experience:** Upload batches and ordered image collections; see independent per-document outcomes; resume private drafts; use the Human Review Queue and Quarantine Queue; retry or mark quarantined items permanently failed.

**Scope:** Complete P22-23; P22-14 exact SHA-256 duplicate enforcement; P22-13b corrupt-then-valid proof; P22-15 notification and quarantine actions; queue/list and action portions of P22-45. The existing P22-12a/b and P22-13a implementations remain intact.

**Acceptance:** Mixed valid/invalid batch members persist independently; the exact duplicate guard blocks final save; the corrupt Document Scan reaches quarantine after the initial failure and three retries without blocking a valid item; retry/permanent-failure actions are role-checked and auditable. Verify batch, resume, queue, status and error states in the browser. Unimplemented notification-panel behavior remains disabled until M4.

### M2 · Safe review and immutable publication — target Nov 27–28

**Owner experience:** Correct OCR, review PII candidates, draw manual Redactions, confirm metadata and retention, and approve an immutable Document Version.

**Scope:** P22-16, P22-17a/b, P22-19, P22-21a/b, P22-22, P22-24a/b, P22-26, P22-27a/b, P22-28a/b and P22-29. P22-45 completes when the queue's Editor navigation and review-ready actions work with the Editor.

**Acceptance:** Check CNP mod-11 and IBAN MOD-97 with Notarial Context Anchors, uncertainty routing and Notary Public exemptions; visual pixel Redaction and removal of covered PDF text; safe reader text/metadata; mandatory explicit human review even with no uncertain matches; required metadata and classification; all six retention bases and pending dates; exact duplicate blocking and the approved act-number/Act Date choices; immutable initial and replacement publication. Keep Q-021 OCR-similarity behavior out of scope until answered.

### M3 · Search, permissions and document viewing — target Nov 28–29

**Owner experience:** Search and browse approved documents, retrieve a Physical Dossier Number, open permitted Document Versions and inspect history. A `cititor` sees only approved redacted data in granted dossiers.

**Scope:** P22-31, P22-32, P22-33, P22-34, P22-36b, P22-37, P22-38 and P22-39. The first DS-001 home/empty state is in M1a; this milestone completes the search and browse Screen.

**Acceptance:** Test Romanian relevance and highlights, filters and browse modes, current-version-only indexing, denied-dossier behavior, default-deny Folder Permissions with individual precedence, staff/original versus `cititor`/redacted access, version history and downloads. Verify Append-Only Audit Log integrity and access records.

### M4 · Staff operations, sharing and retention — target Nov 29–Dec 1

Start backend services as their dependencies clear rather than waiting for Nov 30. Batch mock review by Screen, but retain explicit approval for every Screen.

**Owner experience:** Manage accounts and permissions, create/copy/revoke Share Links, view the audit log, use the retention and destruction workflows, see statistics and in-Application notifications, and browse/apply Notarial Nomenclature revisions.

**Scope:** P22-20c, P22-30a, P22-30c, P22-30d, P22-40a/b, P22-41a/b, P22-42a/b, P22-43, P22-44, P22-46a/b, P22-47 and P22-48, plus the existing unnumbered DS-012 design/build item. P22-30b is completed; do not repeat its approval.

**Acceptance:** Check server-side role boundaries, version/variant pinning, password, expiry, revocation and audit attribution; verify prior delivery access ends when a link is revoked or a document is destroyed; preserve required evidence indefinitely; ensure only `admin` can extend or confirm destruction and `arhivar` remains read-only on DS-005; verify Permanent Preservation exclusion, the exact five DS-007 sections, identical admin/arhivar statistics, and notifications outside DS-007.

### M5 · Integration and polish — target Dec 1

Introduce final shared header, sidebar, logo, branding and navigation styling only after the functional Screen integrations. Keep existing mocks as the source for each Screen's structure and workflow; pixel-perfect matching is not a precondition for initial implementation. Required Design Tokens, Romanian copy, accessibility, responsive behavior, interaction states and final screenshot comparisons remain required.

**Scope:** P22-50, P22-51, P22-52a/b, P22-53, P22-54b, P22-55, P22-56c and P22-57.

**Acceptance:** Complete PHPUnit, frontend build/type-check, Ledger lint and Playwright; capture every changed Screen at supported desktop/mobile sizes in both themes; review screenshots against approved mocks; prove corpus search relevance and privacy; run the release deployment/rollback matrix; ensure documentation matches the implementation. P22-56c and removal of the hosting gate remain blocked on explicit deployment authorization.

## Daily targets from the current date

| Date | Target |
|---|---|
| **Nov 24** | Update roadmap/checklist (this step). After that, prepare and approve the separate M1a plan; review DS-010 and DS-001 mocks. Begin implementation only after the M1a plan and those Screen approvals. Start backend PHPUnit and Ledger lint CI integration, API examples and AI_LOG updates with M1a. |
| **Nov 25** | Target M1a browser checkpoint as early as possible; begin M1b. |
| **Nov 26** | Complete M1b and corrupt-then-valid verification; complete P22-49b inventory in parallel. |
| **Nov 27** | M2 PII detection, Redaction, reader projections and exact duplicate behavior; add PHPUnit coverage alongside the code. |
| **Nov 28** | M2 metadata, retention, Editor and immutable publication; start M3/M4 service work as dependencies permit. |
| **Nov 29** | M3 permissions, search, audit and viewer; start Admin API, Share Link and audit Screen integrations when their dependencies pass. |
| **Nov 30** | Continue M4 account, sharing, audit, retention, destruction and Screen integrations. Run integration checks after each connected API/Screen slice. |
| **Dec 1** | Close M4, M5 shared UI polish, full verification matrix, release candidate and final technical-documentation review. |
| **Dec 2** | If the checked deployment is authorized and ready, process the first 15 Document Corpus entries live. |
| **Dec 3** | Process the remaining 15; conduct the five Secretar Notarial searches after 18:00 Europe/Bucharest and record them in `INTERVIEW.md`. |
| **Dec 4** | Contingency fix/rerun, final evidence verification, demo recording, defense rehearsal and submission before 23:59. |

## Integration, CI and documentation work

- Add a protected draft/review list endpoint and draft detail response containing persisted OCR pages, text, confidence and Bounding Boxes. The current `GET /api/drafts/{id}` only returns the draft ID and status.
- Add authenticated issuance of preview Signed URLs for authorized staff, reusing C-001. Authorization and access audit happen before sensitive content is served.
- Integrate the React API client with C-003, including bearer headers, role-aware routing, 401/expiry handling and the approved token constraints. No token in URLs or logs.
- Establish a safe live-admin bootstrap path; development seed credentials must not become production defaults.
- Add backend PHPUnit and Ledger lint to GitHub Actions in M1a. Extend CI with each milestone's tests; do not accumulate test integration until M5.
- Keep API examples and `AI_LOG.md` current from M1a. Update architecture and operational documentation alongside schema/data-flow changes. P22-57 is the final end-to-end accuracy and fresh-start check.
- At each milestone checkpoint, test the actual Screens through the real APIs. Prepare incremental live deployment checks behind the current hosting gate, but deploy only after explicit authorization. Public promotion is a separate decision.

## Parallel work and critical path

**Can proceed independently:** owner Document Corpus preparation/P22-49b; owner mock reviews; P22-19 nomenclature import and PII detector development (both join before publication); CI/API-doc updates alongside M1; and M4 service work as soon as its dependencies are satisfied. Separate contributors could handle these workstreams, but no parallel agent implementation is assumed.

**Critical path:** M1a authentication → protected intake/status/preview/OCR detail and audit → M1b complete queue → PII review and metadata/retention → immutable publication → safe indexing and Folder Permissions → authorized viewer/audit → Share Link and destruction safeguards → M5 release checks → live corpus acceptance.

Screen approvals are an external dependency: DS-001 and DS-010 before M1a; DS-005/006/008/009/012 before their M4 implementations. DS-007 is approved. Corpus completion and the Secretar Notarial's availability are external dependencies for acceptance. Q-021 remains open; do not invent an OCR-similarity threshold. Keep the 30-document live acceptance, five visual Redactions, under-two-second search result, all audit/privacy requirements, all 12 Screen deliverables and university submission evidence in scope.

## Contingency

If a checkpoint slips, update the observed effort and identify the critical-path blocker immediately. Defer optional visual refinements first; retain approved Screen structures, required states, accessibility, security and verification. Reallocate December 2–4 to the highest-priority required implementation and retests if necessary. Do not expose unfinished `cititor`, Redaction, Share Link or destruction flows, use simulated data, reduce mandatory requirements, or deploy without authorization. If a mandatory acceptance gate cannot be completed before the live corpus window, present the blocker and a scope/date/resource choice for the owner's decision.

## University deliverables and Definition of Done

Preserve the P22 brief and repository Definition of Done: process and approve all 30 synthetic Document Corpus entries live; document five Secretar Notarial searches with one successful result under two seconds; prove visual Redaction on at least five documents covering CNP, IBAN and Signatory Party names; pass the corrupt-then-valid queue test; demonstrate Append-Only Audit Log and retained destruction evidence; verify permissions, immutable versions, Share Link password/expiry/revocation, retention and destruction; and prepare the three defense answers.

Retain required evidence and deliverables: `INTERVIEW.md`, `CORPUS.md`, `AI_LOG.md` with at least 10 entries, `SUBMISSION.md`, README with five-minute Compose setup/environment template/architecture/status, API documentation and a linked C- contract, at least eight approved D- entries, GitHub Actions tests and Ledger lint, at least ten relevant automated tests (four covering business rules or the twist), local Docker Compose startup, server-side validation/authorization, two or more roles, hashed passwords, SQL injection/XSS protections, responsive and keyboard accessibility, 25 descriptive commits across eight days, the 3–5 minute narrated demo and the defense rehearsal.

No approved decision or contract changes are proposed. C-001, C-003, D-041, D-042 and all other approved decisions and contracts remain unchanged. Q-021 remains unanswered and out of scope.
