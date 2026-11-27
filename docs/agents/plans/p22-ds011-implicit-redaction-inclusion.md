# Plan — DS-011 implicit Redaction inclusion

**Status:** Approved and implemented on 2026-11-27.

## Scope

Include every PII detection in the persisted canonical Redaction state by default, including detections previously classified as uncertain or low confidence. Candidates with usable Bounding Boxes are included in the generated redacted PDF without per-candidate Accept/Reject decisions. Staff delete false positives from the included set, with revision-bound persistence and undo. Candidates without safe geometry remain included and require a manual page mark before preview/publication, unless deleted. Keep explicit final human review before publication.

Use this same state for the DS-011 list, PDF preview, reader-safe text and metadata, M3 search, final review fingerprints, and publication guards. Preserve checksum and context detection, original OCR/TSV, source associations, geometry checks, permissions, audits, revision guards, immutable publication, and reader privacy.

## Approved Ledger changes

- C-005 is retained as `superseded-by C-010`.
- C-010 defines default inclusion, persisted removal/undo, geometry requirements, reader-safe projections, and publication guards.
- C-010 also records the approved C-007 amendment for inherited per-candidate Redaction and publication gates; C-009's other dossier, metadata, and publication requirements remain in force.
- D-022 is retained as `superseded-by D-047`.
- D-047 defines implicit inclusion and the delete-to-remove workflow. Explicit final review remains required.

## Implementation and verification

- [x] Update `RedactionState`, preview generation, reader projection, final review and publication guards so candidate status and confidence no longer gate inclusion; exclusions remain revision-bound.
- [x] Remove DS-011 Accept/Reject actions. Show every detection in the applied list, expose manual-location requirements, and keep delete/undo actions.
- [x] Preserve auth, CSRF, audit, geometry, and revision safeguards; remove the obsolete PII-decision route and frontend call.
- [x] Add backend and Playwright coverage for uncertain/low-confidence default inclusion, deletion and undo, manual location, preview PDF, reader-safe search, and publication guards.
- [x] Compare DS-011 tabs with the mock and capture desktop/mobile, light/dark screenshots. PHPUnit passed (186 tests, 1,474 assertions, 3 skipped); Playwright passed (212 tests, 28 opt-in real-API skips); frontend production build, Ledger lint, and `git diff --check` passed.

No push or deployment is authorized.
