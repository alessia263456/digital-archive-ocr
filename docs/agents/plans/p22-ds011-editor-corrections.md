# Plan — DS-011 canonical Redaction workflow corrections

**Status:** Implemented and verified after repository-owner approval on 2026-11-27.

## Scope

Correct DS-011 against the existing approved mock and owner-approved workflow. Eligible reliable automatic detections at or above the configured confidence cutoff are part of the persisted canonical Redaction state by default. Persist removal and undo by candidate ID against the current OCR and detection revisions. Keep uncertain detections in human review. Use one canonical state for preview, reader-safe projections, final review, and publication while preserving checksums, confidence thresholds, context rules, geometry validation, revision guards, audit, permissions, and explicit final human review.

Match the mock's compact “Anonimizări aplicate” list, automatic/manual counts, origin, category, value, page, Vezi and × actions, region navigation/highlighting, manual marking, and Original/Anonimizat toggle. Preserve the continuous viewer; hide raw coordinates and pixel dimensions from normal UI. Add the final review summary and return links, and remove the extra metadata save interaction and technical positioning details.

When the reviewer confirms final checks without a current redacted PDF, generate it first and continue final review only after generation succeeds.

Preserve M3 reader-safe search indexing and ensure removed sensitive OCR cannot affect reader results. Compare the other DS-011 tabs with their mock interactions; record discrepancies here without expanding implementation scope unless independently included in the owner's approved correction list.

## Approved knowledge changes

- C-005 amendment: eligible automatic Redactions are persisted by default; removals/undo are revision-bound; uncertain candidates remain human-reviewed; preview and reader-safe projection consume the same canonical state.
- C-007 amendment: final review fingerprint and publication guard bind manual marks and automatic-detection exclusions in that canonical state.
- D-022 and D-038 remain unchanged.
- C-008 remains approved and unchanged.

## Files

Update the draft schema/model/controller, redaction and reader-projection services, publication snapshot service, frontend API and DS-011 Editor styles, focused backend and Playwright tests, C-005/C-007 Ledger entries, and this plan. Do not push or deploy.

## Verification

Add focused tests for automatic inclusion, persisted removal/undo, uncertain review, preview correctness, reader-safe search, and final publication guards. Run relevant PHPUnit and Playwright suites, production frontend build, Ledger lint, and `git diff --check`. Preserve the integration baseline evidence recorded by the owner: PHPUnit 183 tests/1,445 assertions/3 skipped; Playwright 184 passed/28 opt-in real-API skipped.

## Result

- PHPUnit passed: 186 tests, 1,469 assertions, 3 skipped. The production frontend build passed as part of the frontend-test image build.
- Playwright passed serially: 188 passed, 28 opt-in real-API tests skipped. A separate four-worker run passed 185 and timed out in three unrelated save/queue cases under parallel load; all three passed in a focused one-worker rerun (12 project executions).
- Ledger lint and `git diff --check` passed. Desktop PII screenshots in light/dark and mobile light were inspected; the refreshed DS-011 screenshots are saved under `docs/design/screens/DS-011*`.
- Compared the metadata, OCR correction, extracted-text, Redaction/PII review, and final-review tabs with their registered DS-011 mock interactions. No additional implementation discrepancy requiring scope expansion was found. The existing continuous viewer and direct tab navigation remain consistent with the approved implementation plan.
- Follow-up usability regression: the anonymized PDF iframe now receives its URL only after successful generation, avoiding a cached pre-generation 404. Uncertain-candidate acceptance was verified through the backend endpoint and Editor interaction; the accepted candidate correctly requires a manual location before preview. Focused verification passed: PHPUnit `DocumentDraftOcrReviewTest` (20 tests, 137 assertions) and the two affected Editor flows across all four Playwright projects (8 passed).
- Follow-up preview and error feedback: the `Anonimizat` toggle now generates the PDF when needed and opens it after success. Editor errors use a stacked, six-second toast region; preview generation errors are included. The full DS-011 Editor Playwright file passed (96 tests across desktop/mobile and light/dark). Popup screenshots were captured and inspected for all four combinations under `docs/design/screens/DS-011.errors.*.png`.
- Final confirmation now generates the redacted PDF first when no preview exists, then confirms the current review snapshot. Publication still requires a current generated PDF and an unchanged final-review fingerprint.
- Follow-up approved on 2026-11-27: detections without safe geometry are now discarded automatically, without manual marking or publication blocking. The older follow-up above that required a manual location is superseded by [the geometryless-candidate plan](p22-ds011-geometryless-candidate-discard.md). This approved choice also means such a detection is not removed from reader-facing text, metadata, or search; a true sensitive value may remain visible and searchable.
- Owner's manual validation of `TEST-017-incheiere-pag2.jpg` and `TEST-017-incheiere-pag1.jpg` succeeded after the reader-safe search alignment fallback was added. The workflow functionality appears to work as expected. Revise the DS-011 Editor UI in a separate follow-up; that visual revision is not included in this implementation.
