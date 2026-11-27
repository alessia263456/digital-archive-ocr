# Plan — DS-011 discard detections without safe geometry

**Status:** Implemented and verified on 2026-11-27.

## Scope

Supersede C-010 and D-047 only for detections without safe geometry. Candidates marked `manual_review_required` or with no Bounding Boxes are omitted automatically from canonical Redaction state. They do not appear as applied Redactions, require manual zones, or block preview, final review, or publication. They are also not removed from reader-safe text, metadata, or search; a real sensitive value can remain visible and searchable. Geometry-safe candidates retain implicit inclusion, revision-bound removal/undo, and the existing geometry, confidence, context, audit, permission, and publication safeguards. D-022 and D-038 remain unchanged.

## Files

Update C-010/C-011 and D-047/D-048; the DS-011 plan and mock; `RedactionState`, PDF generation, reader projection, final-review guards, Editor UI, and relevant PHPUnit/Playwright tests. Preserve existing workspace changes. Do not push or deploy.

## Verification

Test that geometryless candidates are absent from canonical Redaction state and the applied list, do not require manual marking, and do not block PDF generation, final review, or publication. Test that reader-safe projection/search keeps their text as approved. Keep coverage that geometry-safe low-confidence detections remain included, safe geometry validation still fails closed, and reliable Redactions still remove text and metadata. Run relevant PHPUnit and Playwright checks, Ledger lint, and `git diff --check`.

## Result

Implemented the approved geometryless-candidate discard behavior across canonical redaction state, preview generation, reader-safe projection/search, final review, publication, and the Editor UI. Updated C-010/D-047 to superseded status and recorded C-011/D-048. Added backend and frontend coverage for omission, retained geometry-safe inclusion, reader/search behavior, and publication flow. Captured and inspected desktop and mobile DS-011 screenshots.

Follow-up for TEST-017 publication: when corrected OCR contains tokens that cannot be safely associated with source word geometry, omit that page's OCR from `cititor` search while retaining staff search. This allows publication to complete without indexing uncertain reader text. Regression coverage exercises the projection and publication path.

Verification passed: PHPUnit 188 tests / 1,493 assertions / 3 skipped; focused projection/publication suite 15 tests / 169 assertions; Playwright 216 passed / 28 opt-in real-API skipped; ledger lint and `git diff --check` passed. No push or deployment was performed.
