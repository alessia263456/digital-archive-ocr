# Plan — P22-14, P22-13b, and P22-15 · Coordinated intake and quarantine

## Size

**L — one coordinated backend and frontend delivery.** The work covers document fingerprints, real queue-worker acceptance, protected queue and quarantine actions, the approved DS-004 Screen, and isolated integration verification.

## Approach

Keep P22-12a/b and P22-13a intact. Add deterministic SHA-256 fingerprints for PDF/DOCX originals and ordered image collections, plus a tested duplicate-check service; because the official-save endpoint and Document Version store do not exist yet, this delivery records and checks fingerprints but the future save workflow (P22-21) must invoke the check and enforce the block. Verify the corrupt-then-valid case against a real isolated database queue and OCR worker. Add authenticated draft queue/list and quarantine action endpoints for `admin` and `arhivar`, persist retry and permanent-failure audit events, and implement the already-approved DS-004 queue and actions using its existing mock and Design Tokens. A permanently failed draft remains stored with a terminal status and audit event but leaves the active Carantină list; it is not deleted. Keep the notification panel out of scope until P22-48.

## Files

| Action | Path | What |
|---|---|---|
| Update | `backend/app/Services/DocumentDraftIntakeService.php`, `backend/app/Models/DocumentDraft.php`, `backend/database/migrations/` | Calculate and persist the original SHA-256 for PDF/DOCX and the deterministic document-level digest for image collections, using the ordered page digests and the D-040-defined unambiguous encoding. Preserve individual image digests so same-image multisets in a different order can be identified. |
| Add | `backend/app/Services/DocumentDuplicateChecker.php` (or a focused equivalent) | Compare candidate fingerprints with persisted document fingerprints and report exact and reordered-image matches. Do not add a save route or claim that saving is blocked here; the future official-save path must call this check. |
| Update | `backend/tests/Feature/DocumentDraftIntakeTest.php`, add focused duplicate-check tests under `backend/tests/` | Verify byte-identical PDF/DOCX fingerprints, ordered image collection identity, reordering behavior, and independent mixed-item intake. |
| Add/update | `backend/tests/Fixtures/`, isolated real-worker verification procedure | Use synthetic malformed PDF bytes and the existing valid rendering fixture. Run both drafts through the actual database queue and OCR worker; verify the malformed item reaches `quarantined` after four failures, its valid sibling reaches `review_ready`, and neither prevents the other from progressing. |
| Update | `backend/app/Http/Controllers/DocumentDraftController.php`, `backend/routes/api.php`, `backend/app/Models/DocumentDraft.php`, `backend/app/Services/DraftAccessLogger.php` | Add the role-protected queue/list response for review-ready and quarantined drafts, retry and permanent-failure mutations, and actor/draft/time audit events. Retry dispatches a fresh four-attempt job. Permanent failure records a terminal state and removes the draft from active queue responses without deleting its private objects or history. |
| Update | `backend/tests/Feature/DocumentDraftProcessingTest.php`, `backend/tests/Feature/DocumentDraftIntakeTest.php` or focused new feature tests | Cover queue membership, action state transitions, job dispatch, duplicate/repeated action handling, audit events, Romanian errors, and `admin`/`arhivar` versus `cititor`/anonymous role boundaries. |
| Update | `frontend/src/api.js`, `frontend/src/main.jsx`, `frontend/src/theme.css` | Connect DS-004 tabs and rows to the queue endpoint. Add retry feedback and the confirmed permanent-failure interaction; show review-ready handoff and remove permanently failed items from the active Carantină list after success. Use existing Design Tokens and Romanian copy. |
| Add | `frontend/tests/queue.spec.js` (or equivalent) | Cover queue tabs, review handoff, quarantine actions, loading/empty/error/success states, confirmation, keyboard/focus behavior, long names, responsive layout, and light/dark themes. |
| Update after verification | `docs/design/registry.yaml`, `docs/design/screens/DS-004.*.png` | Mark the existing approved DS-004 as implemented and save inspected desktop/mobile captures in both themes. No mock redraw or new Screen approval is needed. |
| Update after verification | `docs/agents/ARCHITECTURE.md`, `docs/agents/plans/p22-task-checklist.md`, `README.md` | Record queue/status/API behavior, the isolated real-worker procedure and its evidence, and completed task scope. Explicitly leave save-time SHA-256 blocking to P22-21. |

No provided contract changes are planned. The existing C-003 session and role boundary remains in force. No notification-list or notification-panel endpoint is added.

## Tests

| # | Behaviour | Test (file · kind) | Not automated? why |
|---|---|---|---|
| 1 | PDF/DOCX content and an ordered image collection produce deterministic SHA-256 fingerprints; reordered image collections are distinguishable from exact ordered matches. | Focused PHPUnit tests for the fingerprint/check service and `DocumentDraftIntakeTest.php`. | None. |
| 2 | Duplicate checking reports exact matches and reordered-image matches without treating one shared page as an exact document duplicate. | Focused PHPUnit service tests using synthetic stored fingerprints. | None. |
| 3 | A corrupt Document Scan exhausts the initial attempt and three retries, enters quarantine, and does not stop a valid sibling from reaching `review_ready`. | Opt-in isolated Compose real-worker workflow using synthetic documents and a disposable PostgreSQL database. | Owner can optionally repeat the browser workflow locally; no live corpus is needed. |
| 4 | Queue results include only review-ready and active quarantined drafts; permanent failure removes the item from the active Carantină response while retaining its row, private objects, and audit history. | PHPUnit feature tests for the list endpoint and terminal transition. | None. |
| 5 | Retry queues a fresh job; permanent failure requires the DS-004 confirmation interaction. Both actions record actor, draft, event, and time; state-changing requests require a live session and CSRF. | PHPUnit route/role/audit tests and frontend Playwright interaction checks. | None. |
| 6 | `admin` and `arhivar` can use DS-004; `cititor` and unauthenticated visitors cannot access its protected data or actions. | PHPUnit role matrix and frontend Playwright role tests. | None. |
| 7 | DS-004 covers empty, loading, error, success, one/many rows, long names, keyboard/focus, touch targets, no horizontal overflow at 320 px and 1600 px, and light/dark modes. | Existing containerized Playwright desktop/mobile and theme projects; inspect screenshots against `docs/design/DESIGN.md`. | None. |
| 8 | Backend and frontend regressions remain clear. | `docker compose run --build --rm backend vendor/bin/phpunit`; `docker compose run --build --rm frontend-test`; `python3 docs/agents/tools/ledger-lint.py`; `git diff --check`. | Real-worker verification is run separately in its isolated Compose project so tests cannot write to the default database. |

## Design (UI only)

**DS-004 · Human Review & Quarantine Queue** is approved in `docs/design/registry.yaml`; reuse `docs/design/mocks/DS-004.html`, existing DS-004 screenshots, and the tokens in `docs/design/DESIGN.md`. Implement the approved Revizuire and Carantină tabs, the DS-011 review handoff, retry feedback, and confirmed permanent-failure action. Cover default, hover, focus, active, disabled, empty, loading, error, success, long text, one/many items, and light/dark at mobile and desktop sizes. No new Design Token, mock revision, or Screen approval is planned.

## Sequencing

One builder, in this order: (1) fingerprints and duplicate-check service; (2) real corrupt-then-valid worker proof; (3) queue/list and action endpoints with role enforcement and audit rows; (4) DS-004 frontend integration; (5) full backend/frontend, isolated worker, screenshot, architecture, checklist, and Ledger verification. The duplicate-check service is groundwork only: P22-21 must invoke it from the official-save path and enforce D-025/D-040 blocks.

## Risks

- **Save enforcement is not possible in the current schema.** There is no official-save endpoint or Document Version table. This plan intentionally does not add one; P22-21 must consume the duplicate-check service before its save can satisfy the roadmap's exact-duplicate acceptance point.
- **Image hashing can become ambiguous.** Use a documented, unambiguous encoding of the ordered image digests as required by D-040 and test order and multiplicity explicitly.
- **A real OCR failure test can be flaky or touch shared data.** Run it only in an isolated Compose project with a disposable database and synthetic fixtures; do not use the default project database or Document Corpus.
- **Retry and final-failure actions can race with worker completion.** Make transitions conditional on the current quarantine state, return a safe conflict for stale actions, and verify repeated requests do not enqueue duplicate work or duplicate audit outcomes.
- **A terminal draft is no longer active but remains retained.** Keep its database row, source objects, notification, and audit event; exclude it only from active queue results. No deletion or retention policy is introduced here.
- **Notifications are persisted but not browsable in this delivery.** Continue the existing per-Arhivar database notification; keep the notification panel disabled until P22-48 as the roadmap directs.

## Out of scope

Official save or Document Version creation; invoking the duplicate checker during save (P22-21); UI for duplicate warnings; OCR text-similarity matching while Q-021 is open; notification badge/panel (P22-48); DS-011 editing, approval, indexing, PII review, Redaction, and retention; notification read/dismiss behavior; production sorting/pagination beyond what the approved DS-004 Screen needs; deletion or retention of permanently failed drafts; live deployment and real Document Corpus processing.

## Knowledge used

**10 entries confirmed before, unchanged** — D-001, D-002, D-003, D-006, D-018, D-025, D-026, D-038, D-040, and D-042. They govern the stack, archive and draft boundaries, PHPUnit/Playwright, Romanian UI, duplicate criteria, four-attempt quarantine and actions, image hashing, and role access.

| Entry | What it says | Why it applies | Call |
|---|---|---|---|
| D-019 | Notifications are delivered in-app. | The worker already stores a notification for each Arhivar; the panel remains deferred to P22-48. | Confirmed 2026-11-25 |
| D-043 | Browser sessions have idle/absolute limits and failed-login throttling. | Protected DS-004 queue and action calls use the existing session-authenticated API boundary. | Confirmed 2026-11-25 |
| C-003 | First-party session and CSRF contract; protected APIs enforce resource-specific roles. | The new queue and mutation endpoints remain consumers of this provided contract; no contract change is planned. | Confirmed 2026-11-25 |
| Q-021 | OCR similarity criterion remains open. | This delivery makes no OCR text-similarity match or warning. | Remains open; no effect on scope. |
| PATTERN-013 | Candidate: run a real draft OCR browser check in an isolated Compose project. | The corrupt-then-valid proof can reuse the documented isolated workflow approach. | For awareness only; not treated as an approved rule. |

### Considered, not applied

- P22-21 — Owns the future official-save path. It must invoke the duplicate-check service and enforce exact SHA-256 blocks before saving.
- P22-48 — Owns the notification badge and panel; no notification UI is added here.
- Q-021 — Remains open; OCR similarity matching is excluded.

### Assumptions (no entry behind them)

- The owner confirmed in this planning conversation that P22-14 adds digest/check groundwork now and leaves save-time blocking to the future save task.
- The owner confirmed in this planning conversation that a permanently failed draft leaves the active Carantină list while remaining persisted; it is not deleted.
- A future official-save task can access the persisted fingerprints for already-approved documents when it introduces the Document Version storage. If that implementation does not provide such a store, the save task must resolve the integration before claiming duplicate enforcement.
