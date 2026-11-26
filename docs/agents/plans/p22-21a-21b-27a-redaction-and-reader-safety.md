# Plan — Redaction and reader safety: P22-21a/b, then P22-27a

**Status:** Implemented and verified.

## Size and sequencing

M · One builder, in order: P22-21a → P22-21b → P22-27a. Each task is implemented and verified separately. Do not mark a task complete until its relevant tests pass.

## Approach

P22-21a reuses `RedactedPdf` and the existing corrected OCR and PII review data to generate a separate image-only PDF from reviewed Bounding Boxes. The source remains intact. Reject stale or incomplete review state and invalid page geometry; keep generated artifacts in private storage.

P22-21b builds reader-facing text and metadata projections that conservatively remove all content affected by accepted Redactions, including overlapping OCR tokens and repeated sensitive metadata. Fail closed when reliable filtering is impossible. Verify that `cititor` cannot reach originals, drafts, unredacted derivatives, or sensitive data through direct URLs, alternate endpoints, or manipulated resource IDs.

P22-27a adds manual Bounding Box drawing and preview to the approved DS-011 editor. Persist marks against the current OCR and detection revisions. Validate renderer page coordinates, page bounds, and supported rotation; translate browser pointer coordinates correctly across scaling, resizing, scrolling, and mobile layouts. Preview and final PDF generation use the same canonical validated redaction regions and revision guards. Invalidate stale previews when source revisions or marks change.

## Files

| Action | Path | What |
|---|---|---|
| Update | `backend/app/Services/RedactedPdf.php`, `backend/app/Http/Controllers/DocumentDraftController.php`, `backend/routes/api.php` | Generate and serve a reviewed Redaction PDF through role-protected endpoints; validate review state and geometry. Document all added or changed API endpoints. |
| Update | `backend/app/Models/DocumentDraft.php`, `backend/database/migrations/` | Persist manual marks and generated derivative state with OCR and detection revision guards, using the smallest compatible schema change. |
| Add/update | `backend/app/Services/` | Build reader-safe text and metadata projections; fail closed if accepted Redactions cannot be applied reliably. |
| Update | `frontend/src/main.jsx`, `frontend/src/api.js`, `frontend/src/theme.css` | Add DS-011 manual mark drawing and preview, including loading, error, empty, and stale states. |
| Add/update | `backend/tests/Feature/RedactedPdfTest.php`, `backend/tests/Feature/DocumentDraftOcrReviewTest.php`, reader projection and authorization tests | Verify permanent pixels, text removal, projection filtering, privacy boundaries, stale revisions, private storage, and invalid geometry. |
| Add/update | `frontend/tests/` | Verify drawing and preview interactions across scale changes, resizing, scrolling, keyboard use, and mobile layouts. |
| Update after each verified task | `docs/agents/plans/p22-task-checklist.md` | Record each task's completion and test evidence only after its relevant tests pass. |
| Update if actual data flow requires it | `docs/agents/ARCHITECTURE.md` | Describe the implemented storage and redaction flow. |
| Update | `docs/agents/CONTRACTS.md` | C-004 was extended and approved before implementation; keep endpoint details and consumers aligned with implementation. |

## Tests

| # | Behaviour | Test (file · kind) | Not automated? why |
|---|---|---|---|
| 1 | Reviewed Redaction produces a separate PDF with black pixels over every accepted region and preserves uncovered content. | `RedactedPdfTest.php` · PHPUnit integration | None. |
| 2 | Covered PDF text cannot be extracted; the source remains unchanged. | `RedactedPdfTest.php` · PHPUnit integration | None. |
| 3 | Invalid pages, out-of-bounds boxes, stale revisions, and failed generation do not publish a derivative. | Redaction service/controller tests · PHPUnit | None. |
| 4 | Reader text and metadata omit all affected content, including overlapping OCR tokens and repeated sensitive metadata; filtering failure denies the projection. | Reader projection tests · PHPUnit | None. |
| 5 | `cititor` is denied originals, drafts, unredacted derivatives, and sensitive data through direct URLs, alternate endpoints, and manipulated resource IDs; generated files remain private. | Authorization and storage tests · PHPUnit feature | None. |
| 6 | Manual marks can be drawn, previewed, edited or removed, and combined with accepted automatic marks; preview and final generation use identical regions and reject stale revisions. | DS-011 Playwright tests and backend integration tests | None. |
| 7 | Coordinate conversion remains correct during browser resizing, document scrolling, zoom/scaling, supported rotation, and mobile layout. | DS-011 Playwright tests with controlled viewport and scroll changes | None. |
| 8 | Changed DS-011 states meet keyboard, desktop/mobile, and light/dark requirements. | Playwright screenshots and interaction tests | Owner review of screenshots remains part of UI review. |

Run PHPUnit, the frontend Playwright suite, relevant build/type checks, and Ledger lint. Capture DS-011 screenshots at the smallest and largest supported sizes in light and dark themes and inspect them before reporting completion.

## Design (UI only)

DS-011 is approved. Its mock includes manual mark drawing, keyboard instructions, applied-mark counts, and removal/undo interactions. Use existing Design Tokens and components. Cover default, focus, disabled, loading, error, empty, stale, long-content, and many-mark states; keyboard access; desktop/mobile; and light/dark. Update `docs/design/registry.yaml` if implementation changes its recorded status or source.

## Sequencing

One builder, in task order. P22-21a must pass before P22-21b begins; P22-21b must pass before P22-27a begins. Keep task checklist status open until each task's relevant tests pass.

## Risks

Incorrect text-to-region association can leave sensitive content visible or redact unrelated content. Apply automatic Redaction only to accepted candidates with reliable geometry; manual placement handles uncertain locations. Reject stale revisions and fail closed if rendering or projection generation fails. Verify that browser-to-renderer coordinate conversion accounts for page scale and rotation. The image-only PDF removes selectable text across the page, including uncovered text, as required by the existing renderer.

## Out of scope

P22-27b review confirmation, metadata and retention work, immutable Document Version publication, archive search and indexing, Share Links, and Q-021 OCR-similarity behavior.

## Knowledge used

| Entry | What it says | Why it applies | Call |
|---|---|---|---|
| D-022 | Defines covered PII, manual and automatic Bounding Boxes, permanent black pixels, preserved originals, removal of covered PDF text, safe reader text/metadata, and explicit review. | Governs all three tasks. | Confirmed by owner 2026-11-26. |
| D-004 | OCR stores TSV Bounding Boxes for pixel-level Redaction. | Provides geometry used by the renderer and manual marks. | Confirmed by owner 2026-11-26. |
| D-003 | Backend tests use PHPUnit. | Governs backend verification. | Confirmed by owner 2026-11-26. |
| D-006 | Playwright covers desktop/mobile and light/dark. | Governs DS-011 verification. | Confirmed by owner 2026-11-26. |
| D-038 | Requires review before official save/indexing and keeps drafts out of search. | Applies to draft state and sequencing; publication remains out of scope. | Confirmed by owner 2026-11-26. |
| D-042 | DS-011 is restricted to `admin` and `arhivar`; `cititor` sees redacted copies only. | Governs Screen and endpoint authorization. | Confirmed by owner 2026-11-26. |
| PATTERN-006 | Candidate practice: verify source text, derivative pixels/text, and source hash. | Awareness only when extending Redaction tests; not promoted or treated as approved. | Confirmed for awareness only by owner 2026-11-26. |
| C-004 | Defines the protected draft Editor, OCR correction, PII review, revision guards, and now redaction, reader-safety, and private-storage requirements. | Governs API work and its consumers. | Adjusted by approved proposal; recorded in `CONTRACTS.md`. |
| Q-021 | OCR similarity criterion remains unanswered. | Unrelated to Redaction and reader safety. | Confirmed open and out of scope by owner 2026-11-26. |

### Considered, not applied

- Q-021 — unrelated; no similarity behavior is included.

### Assumptions (no entry behind them)

- Manual marks will be persisted as draft review data and included with accepted automatic marks in the renderer's canonical validated regions. If the existing model cannot represent them safely with revision guards, revisit the plan before implementing that part.
