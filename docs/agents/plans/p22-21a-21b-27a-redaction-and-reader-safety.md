# Plan — Redaction and reader safety: P22-21a/b, then P22-27a

**Status:** Implemented and verified.

## Follow-up plan — preserve OCR word associations during correction (owner-approved 2026-11-26)

**Status:** Implemented and verified on 2026-11-27.

Retain the approved DS-011 free-text textarea and corrected-OCR PII detection. Track edits against the original OCR word sequence so unchanged words, repeated words with known positions, and ordinary spelling/character corrections retain their original Bounding Boxes. Record edit operations and derive associations independently on the backend from those operations and the original OCR data; validate each association and never accept frontend geometry as authoritative. When an edit cannot be mapped reliably, mark only the affected span unlocated when possible. Preserve manual placement as fallback for genuinely unlocatable PII.

Keep this implementation small: no custom rich-text editor, individual word fields, dependency, or broad architecture change. Investigate a minimal edit-operation representation compatible with the existing textarea, including insertion, deletion, split, merge, undo, paste, spellcheck, composition input, and Unicode offsets. Keep original OCR/TSV immutable and bind corrected text, edit operations, derived associations, detection, review, and preview to existing revision guards. Use the existing `corrected_ocr` JSONB where feasible; decide on a migration only if existing schema cannot safely represent the data. Existing drafts without operations need conservative reconstruction from unchanged text and original OCR positions; ambiguous spans remain unlocated.

Update reader-safe projection to use validated associations, including corrected token text and overlapping original boxes, while failing closed for accepted PII without reliable location. Add regression coverage for the three previously observed false-uncertainty shapes in the reported three-JPG draft, repeated words, corrected PII, genuinely missing geometry, split/merge/insertion/deletion behavior, and reader projection. Test the full flow from correction through detection, acceptance, PDF preview, and reader-safe projection.

The matcher-only alternative is insufficient: position-based matching can resolve unchanged repeated words, but the saved API currently contains only full page text, so spelling corrections, deletions, splits, and merges cannot be attributed reliably after the fact. Do not use it as the complete solution.

### Approved knowledge changes

- D-004 and D-022 were confirmed by the owner for this approach; no rule change was requested.
- PATTERN-019 revision is approved, retaining candidate status. Revise it during implementation to document edit-derived, backend-validated associations and span-local uncertainty.
- C-004 supersession is approved. Prepare a superseding contract for revision-bound correction/edit-operation data, backend-derived associations, and updated projection behavior. Keep the existing C-004 entry as superseded history and list all frontend/backend/API/projection/test consumers.
- Preserve approved DS-011 free-text editing; do not alter the screen layout or editing interaction without approval.
- Update architecture and task checklist after implementation and verification. Do not mark follow-up work complete before end-to-end tests pass.

Implementation keeps the DS-011 textarea and stores validated UTF-16 edit operations in existing `corrected_ocr` JSONB. `CorrectedOcrAssociation` derives source-word positions on the backend; corrected PII candidates and reader projection consume those associations. No migration or new dependency was needed. A backend integration test covers correction, detection, acceptance, private PDF preview, and reader projection. Full backend PHPUnit passed (160 tests, 1,168 assertions; three OCR-worker-only skips) and default Playwright passed (148 tests; 24 opt-in real-API skips). The frontend production build, Ledger lint, and four DS-011 desktop/mobile light/dark screenshots passed inspection. Existing text-only corrections use conservative source reconstruction.

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
