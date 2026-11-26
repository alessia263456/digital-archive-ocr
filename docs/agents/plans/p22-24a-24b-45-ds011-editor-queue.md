# Plan — P22-24a/b + P22-45 · DS-011 OCR and PII review handoff

**Status:** Approved by the owner on 2026-11-26, with the OCR alignment, candidate pointer, stale-result, and API contract clarifications recorded below. Planning only; implementation has not started.

## Size

**L** — This connects a production Screen to Laravel APIs, adds persistent draft review state and audit events, and completes the DS-004 handoff. The Editor and queue already have approved designs.

## Approach

Add the DS-011 OCR correction and PII candidate review steps to the existing private-draft workflow. Keep extracted OCR and its TSV Bounding Boxes as the source record; save corrected OCR and candidate review decisions separately on the draft. Run the existing PII detector against corrected OCR whenever corrections are saved.

Allow free-text correction. Preserve a Bounding Box only when a conservative token alignment establishes a reliable, unique one-to-one correspondence, using unchanged neighboring tokens as evidence. Equal word counts or token positions alone are insufficient. If an edit splits, merges, or otherwise makes correspondence unreliable, mark affected candidates as requiring manual location review. Do not guess coordinates or allow unresolved locations to be treated as safe for automatic Redaction.

Candidates without reliable Bounding Boxes remain identifiable and reviewable through offsets into corrected OCR text. Candidate records store no matched OCR text, consistent with PATTERN-016. Unsaved OCR edits make displayed detection results stale and disable review actions. A failed detection run invalidates previous candidates; only a successful run for the current OCR revision may be reviewed. Backend review updates also require matching OCR and detection revisions.

Connect DS-004 review-ready actions to DS-011, preserving start and resume behavior. Keep the queue API and existing quarantine actions intact.

## Files

| Action | Path | What |
|---|---|---|
| Add | `backend/database/migrations/` | Add draft fields for corrected OCR, revision/detection state, and geometry-only PII candidates with review state. Keep source OCR and TSV unchanged. |
| Update | `backend/app/Models/DocumentDraft.php` | Cast and persist the new review fields. |
| Update | `backend/app/Http/Controllers/DocumentDraftController.php`, `backend/routes/api.php` | Implement C-004 editor read, OCR save/detection, and candidate-review endpoints. Preserve session/CSRF and `admin`/`arhivar` access. |
| Update | `backend/app/Services/PiiDetector.php` or add a focused review service | Run existing rules against corrected tokens; retain boxes only for reliable correspondence; require manual location review for unresolved candidates. |
| Update | `backend/app/Services/DraftAccessLogger.php` and relevant audit handling | Record OCR correction saves, detection runs, and review changes without logging OCR values or candidate text. |
| Update | `backend/tests/Feature/DocumentDraftQueueTest.php`, `backend/tests/Feature/ProtectedDraftOcrTest.php` | Cover Editor handoff access, role restrictions, and stale or unavailable draft responses. |
| Add | `backend/tests/Feature/DocumentDraftOcrReviewTest.php` and focused unit tests | Cover correction persistence, corrected-text detection, alignment, candidate decisions, and automatic Redaction safeguards. |
| Update | `frontend/src/api.js`, `frontend/src/main.jsx`, `frontend/src/theme.css` | Add production DS-011 entry, correction and review interactions, save/resume state, stale-result handling, and DS-004 start/resume navigation. |
| Add | `frontend/tests/editor.spec.js` | Verify Editor behavior and the queue-to-Editor handoff across existing browser projects. |
| Update after implementation | `docs/agents/ARCHITECTURE.md`, `docs/agents/plans/p22-task-checklist.md` | Record the draft review flow and verification evidence. Keep DS-011 registry status `approved` until later Editor tasks complete the remaining workflow. |

C-003 remains the authentication contract. C-004 documents the new frontend/backend API; both provider and consumer files are listed there. The C-003 consumer list includes P22-24a/b and P22-45.

## Tests

| # | Behaviour | Test | Not automated? why |
|---|---|---|---|
| 1 | Corrected OCR is stored separately from extracted OCR and survives reopening the draft. | `DocumentDraftOcrReviewTest.php` · PHPUnit feature | — |
| 2 | Saving corrections runs PII detection on corrected text and returns geometry-only candidates. | PHPUnit unit and feature tests using synthetic corrected OCR/TSV | — |
| 3 | Reliable one-to-one correspondence retains original boxes; split, merged, or ambiguous correspondence requires manual location review and cannot trigger automatic Redaction. | PHPUnit unit and feature tests | — |
| 4 | Candidate accept/reject decisions persist; changed OCR invalidates prior detection/review state; stale revisions and failed detection cannot be reviewed. | PHPUnit feature tests and `editor.spec.js` · Playwright | — |
| 5 | DS-004 starts or resumes the selected draft in DS-011; `admin` and `arhivar` can use it, while `cititor` and unauthenticated requests cannot. | `queue.spec.js`, `editor.spec.js`, and PHPUnit role tests | — |
| 6 | DS-011 covers loading, empty candidates, errors, saved state, long OCR, one/many candidates, keyboard/focus, mobile/desktop, and light/dark. | Containerized frontend Playwright matrix; inspect captures against `DESIGN.md` | — |
| 7 | A synthetic corrected-OCR draft can be opened from DS-004 and reviewed through the protected API. | Opt-in isolated Compose/Playwright workflow | Requires disposable database and worker setup; synthetic fixtures only. |

## Design (UI only)

**DS-004 and DS-011**, both approved. Reuse their approved mocks and captures: DS-004 queue rows and handoff; DS-011 editor header, step navigation, OCR editing, and PII review panel. Use existing Design Tokens and Romanian UI copy.

This delivery implements the OCR and candidate review portions only. Manual Bounding Box drawing, actual Redaction, metadata confirmation, final review confirmation, PDF generation, and publication remain for later tasks. Capture the implemented state at desktop/mobile sizes and in light/dark themes. No new mock or Screen approval is planned.

## Sequencing

One builder, sequentially:

1. Add persisted corrected OCR and candidate review state, reliable-alignment handling, revision guards, and audit events.
2. Add and verify the C-004 protected backend endpoints.
3. Build DS-011 OCR editing and PII candidate review using those endpoints.
4. Connect DS-004 start/resume actions to the Editor.
5. Run backend and frontend verification, inspect screenshots, and update architecture/checklist evidence.

## Risks

- **Incorrect geometry after edits:** require unique correspondence supported by token sequence context; ambiguous candidates require manual location review and cannot be automatically redacted.
- **Stale PII decisions after corrections:** bind decisions to OCR and detection revisions, invalidate prior candidates when corrected OCR changes, and block frontend review while OCR is unsaved or detection failed.
- **Draft data exposure:** retain role/session checks; do not include private storage keys or matched PII text in candidate records or logs.
- **Partial DS-011 workflow:** keep manual drawing, metadata confirmation, final review confirmation, PDF Redaction, and publication out of this delivery so the Screen is not represented as fully implemented.

## Out of scope

P22-22 metadata UI, P22-26 retention calculation, P22-27 manual Redaction drawing and final confirmation, P22-28 publication, safe reader projections, OCR-similarity behavior while Q-021 remains open, and notification panel work.

## Knowledge used

| Entry | What it says | Why it applies | Call |
|---|---|---|---|
| D-022 · PII detection and Redaction coverage | Defines PII categories, detection rules, Notary Public exemptions, and human review. | Governs corrected-text detection and candidate handling. | Confirmed by owner 2026-11-26 |
| D-038 · Upload review, metadata, and Document Versions | Requires explicit PII review before official save; approved OCR-only corrections are audited and reindex the same version. | Governs keeping edits on the private draft now and the later approval boundary. | Confirmed by owner 2026-11-26 |
| D-002, D-003, D-004, D-006, D-018, D-042, D-043 | Archive scope, PHPUnit, Romanian OCR/Bounding Boxes, Playwright, Romanian-only UI, Screen access, and session/CSRF rules. | Constrain the feature, authorization, UI, and verification approach. | Previously confirmed; unchanged |
| C-003 · Session authentication and role-protected API | Protects application routes with live sessions and CSRF for state changes. | C-004 endpoints use this authentication boundary. | Confirmed; consumer list updated 2026-11-26 |
| C-004 · Protected draft OCR correction and PII review API | Defines editor load, OCR save/detection, candidate decisions, geometry pointers, and revision guards. | Governs both API implementation and frontend integration. | Approved 2026-11-26 |
| PATTERN-016 · Keep PII detector candidates geometry-only | Stores category, disposition, page, confidence, and Bounding Boxes without matched OCR text. | Candidate records use text-span offsets as pointers into corrected OCR, never matched values. | Applicability confirmed by owner 2026-11-26; remains candidate |
| Q-006 · Anonymization pipeline architecture and dependencies | Answered with the Laravel detection and human-review approach. | Supports reuse of the existing detector. | Answered; unchanged |
| Q-021 · OCR similarity criterion | Remains open. | Duplicate-similarity warnings are excluded. | Open; unchanged and not applied |

### Considered, not applied

- **PATTERN-013/014** — For awareness only: these describe isolated worker/browser verification approaches; use the relevant synthetic isolation approach for the opt-in end-to-end check.

### Assumptions

- None. OCR alignment, candidate pointers, stale-result handling, scope boundaries, and endpoint documentation were clarified and approved by the owner.
