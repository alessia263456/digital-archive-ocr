# Plan — M1a.2 · Upload and OCR processing

**Status:** Approved by the repository owner on 2026-11-25. No implementation has started.

## Size

**S–M · 3–5 hours** for the browser upload flow, processing-status refresh, automated verification, screenshots, and implementation records. The backend intake, private draft persistence, queue worker, OCR extraction, and persisted lifecycle are already implemented; the main work is connecting the approved DS-003 Screen to those APIs.

## Approach

Add the authenticated DS-003 workflow to the existing React shell and reuse `api.js` for same-origin session and CSRF handling. Submit one document per action (PDF, DOCX, or one ordered JPG/PNG collection) to the existing `POST /api/drafts`, keep returned draft IDs in Screen state, and let staff explicitly refresh each draft through `GET /api/drafts/{id}`. Show the persisted queued, processing, failed, review-ready, and quarantined states with Romanian feedback; do not imply that OCR completion approves or indexes a document. There is no draft-list endpoint, so the Screen will show drafts uploaded during the current Screen session only; a full recent-drafts/review queue and OCR result or preview belong to later work.

Use the already approved DS-003 mock and Design Tokens. Build the functional upload and status slice only; do not implement the mock’s image reordering, duplicate detection UI, DS-004/DS-011 destinations, or unimplemented backend behaviors in this part. The agreed M1a.2 workflow is a single-document upload using existing intake APIs and explicit user-triggered status refresh, with no automatic polling.

## Files

| Action | Path | What |
|---|---|---|
| Update | `frontend/src/main.jsx` | Add a DS-003 route/state for `admin` and `arhivar`, expose an upload entry point from DS-001, implement PDF/DOCX selection and a JPG/PNG collection, submit a single item/collection, show per-attempt Romanian validation/API errors and persisted lifecycle state, and add a user-triggered status refresh. Keep authenticated role restrictions consistent with D-042. |
| Update | `frontend/src/api.js` | Add multipart upload and draft-status methods using the existing same-origin credentials and CSRF request path; do not set the multipart `Content-Type` manually. |
| Update | `frontend/src/theme.css` | Add responsive DS-003 styles using existing Design Tokens, including focus, disabled, loading, error, success, dark-theme, and narrow-screen states. |
| Update | `frontend/tests/` | Add Playwright coverage for upload submission, API outcomes, state refresh, role access, and the required visual states, using mocked endpoints for UI cases. |
| Update after verification | `docs/design/registry.yaml`, `docs/design/screens/DS-003.*.png` | Mark DS-003 implemented and save inspected desktop/mobile light/dark screenshots for the implemented state. |
| Update after implementation | `docs/plans/p22-task-checklist.md`, `docs/agents/ARCHITECTURE.md` | Record completed P22-23/M1a.2 scope, verification evidence, and any runtime detail needed to explain the workflow. |

No Ledger entry or provided contract changes are planned. C-003 and the existing authenticated draft endpoints remain unchanged.

## Tests

| # | Behaviour | Test (file · kind) | Not automated? why |
|---|---|---|---|
| 1 | `admin` and `arhivar` can reach DS-003; `cititor` cannot use or see the upload action. | Playwright UI test; existing PHPUnit role-protected draft endpoint tests remain the backend boundary. | Owner manually checks navigation with staff accounts. |
| 2 | A valid PDF or DOCX and a valid ordered image collection submit as one draft each, include the returned ID/status, and distinguish transfer from queued OCR processing. | Playwright with mocked multipart API; existing `DocumentDraftIntakeTest` and `DocumentDraftProcessingTest` cover persistence, conversion, queue dispatch, and processing. | None for the UI/API contract. |
| 3 | Invalid selection, rejected upload, network failure, missing draft, and expired session show actionable Romanian messages without hiding other state. | Playwright mocked error responses and session expiry. | None. |
| 4 | Explicit refresh fetches and displays the current persisted status, including `review_ready`, `failed`, and `quarantined`; no background polling occurs. | Playwright with sequential mocked status responses; PHPUnit worker tests cover lifecycle persistence and final quarantine. | None. |
| 5 | Upload does not imply approval, finalization, or indexing; success is presented as a private draft awaiting review. | Playwright assertions on labels and available actions. | None. |
| 6 | DS-003 has usable empty, loading, error, success, long-filename, one-item, and multiple-current-session-item states; keyboard, touch, focus, responsive layout, contrast, and light/dark are covered without horizontal overflow. | Playwright desktop/mobile, light/dark, screenshot inspection against `DESIGN.md`. | Owner manually tests a local upload and refresh against the running backend/worker. |
| 7 | Backend regressions and repository checks remain clear. | Full PHPUnit suite, frontend build/Playwright suite, Ledger lint, and `git diff --check` during implementation. | None; command results belong in the implementation record. |

## Design (UI only)

**DS-003 is approved** in `docs/design/registry.yaml` and its mock is `docs/design/mocks/DS-003.html`. Reuse the approved DS-003 structure and existing tokens in `docs/design/DESIGN.md`; do not redraw the Screen or change its approval. The implemented slice covers a single PDF/DOCX or one image collection at a time and recent items uploaded in the current Screen session. Cover empty, selection, upload/loading, per-item error, queued/processing, explicit refresh, review-ready, failed, quarantined, long filenames, and one/multiple items. Use Romanian labels, visible keyboard focus, accessible file selection, responsive mobile/desktop layouts, and light/dark themes. Successful OCR is labeled as awaiting human review, not approval. Save inspected screenshots for each required viewport and theme.

## Sequencing

One builder. Add the API calls and DS-001 entry point first, implement DS-003 upload and per-draft explicit refresh, then exercise success and failure states against mocked responses. Verify session/role behavior and the existing backend processing lifecycle; run the repository verification commands, inspect and save screenshots, and update the checklist/architecture implementation records. Do not add status polling or new backend endpoints.

## Risks

- **No list endpoint:** DS-003 cannot reconstruct older drafts after a reload. Keep this delivery’s status list limited to items returned by the current Screen session; draft listing/recent-history behavior needs a separately scoped endpoint and plan if desired.
- **Request/session lifetime:** Only explicit staff actions request status, so the page does not silently extend session idle activity. Handle a 401/419 using existing Romanian session messaging.
- **Processing is not approval:** `review_ready` means OCR extraction completed and the private draft awaits review. Keep approval and indexing controls out of this Screen slice.
- **Mismatched mock breadth:** The approved mock also depicts duplicates, recent drafts, and DS-004/DS-011 handoffs. Only implement behaviors backed by the current API and M1a.2 scope; keep all unimplemented portions clearly outside this delivery.
- **Upload transport:** Browser multipart requests must let the browser set the boundary and preserve file order within an image collection.

## Out of scope

Automatic status polling; a backend draft-list endpoint or restoration of old IDs after reload; OCR text/Bounding Box retrieval or document preview (M1a.3); audit event writing (M1a.3); DS-004 Human Review Queue and Quarantine actions; DS-011 editor, metadata, PII review, Redaction, and approval; exact duplicate enforcement/UI; OCR similarity matching; image page reordering UI; live deployment; and milestone-wide end-to-end acceptance (M1a.4).

## Knowledge used

Previously confirmed and unchanged: **D-001, D-002, D-003, D-004, D-006, D-017, D-018, D-028, D-038, D-042, and D-043**.

| Entry | What it says | Why it applies | Call |
|---|---|---|---|
| D-026 | Quarantine follows the initial OCR failure plus three failed retries; notify Arhivar and allow retry or permanent-failure action. | Defines how the terminal status shown by DS-003 arises; quarantine actions themselves remain elsewhere. | Confirmed 2026-11-25 |
| D-040 | Enforce exact ordered-image matching; reordered matching image sequences warn; test OCR similarity after extraction only when the criterion is separately approved. | The upload accepts an image collection and later OCR may expose similarity warnings; this plan adds no duplicate behavior and leaves Q-021 unresolved. | Confirmed 2026-11-25 |
| C-003 | Browser API calls use same-origin stateful sessions and CSRF for mutations; protected routes require a live session and resource-specific roles. | Existing `api.js` and authenticated intake/status endpoints are the integration boundary. No contract change is planned. | Confirmed 2026-11-25 |
| Q-021 | OCR similarity criterion remains open pending a justified metric and Document Corpus evaluation. | No real OCR similarity warning is computed or displayed in this part. | Confirmed open; unanswered and out of scope |
| PATTERN-002 | Candidate practice: run browser checks against the containerized production build. | For awareness only; verification follows D-006 and the repository’s existing Playwright setup, without promoting this candidate. | For awareness only |

### Considered, not applied

- **D-025** — Exact PDF/DOCX SHA-256 blocking and act number + confirmed Act Date warning remain in force. This delivery does not add duplicate UI or metadata review.
- **D-038** — Incomplete uploads remain private drafts and official save/indexing require human review and confirmation. Applied by keeping this Screen at intake and OCR status only.
- **D-040** — Exact multi-image duplicate enforcement remains backend-owned; do not infer any warning from a matching page or implement the open OCR similarity criterion.
- **C-001** — Governs expiring Signed URL document delivery, which belongs to M1a.3 and is not consumed here.

### Assumptions (no entry behind them)

- None. The M1a breakdown specifies single-document upload, existing intake APIs, persisted status/error verification, and explicit status refresh. This plan interprets the existing API’s supported single document types as PDF, DOCX, or one ordered image collection and restricts the Screen to one submission at a time.
