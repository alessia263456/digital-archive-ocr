# Plan — P22-29 · Possible duplicates

**Status:** approved 2026-11-27

## Size

S — verify the existing publication checks and warning flow; add only missing test coverage.

## Approach

Reuse the existing duplicate checks and DS-011 warning. Verify act-number/date and reordered-image warnings, separate publication, cancellation, and exact-match blocking. Keep OCR similarity out of scope while Q-021 is unanswered.

## Files

| Action | Path | What |
|---|---|---|
| Update if coverage is missing | `backend/tests/Feature/DocumentPublicationTest.php` | Cover duplicate warning outcomes and exact-match blocking. |
| Update if coverage is missing | `frontend/tests/editor.spec.js` | Cover the existing warning, separate, and cancel actions. |
| Update after verification | `docs/agents/plans/p22-task-checklist.md` | Record results for P22-29. |

## Sequencing

One builder: inspect existing coverage, add only missing tests, run the relevant checks, and record evidence.

## Risks

D-025 also describes saving a possible duplicate as a new Document Version. This plan excludes adding that UI choice; it does not change D-025.

## Out of scope

Adding a “publish as a new version” choice; OCR similarity; changes to duplicate matching rules or the publication API.

## Knowledge used

| Entry | What it says | Why it applies | Call |
|---|---|---|---|
| 9 entries confirmed before, unchanged: D-001, D-002, D-003, D-006, D-018, D-025, D-040, D-042, C-007 | Stack, archive scope, test and UI language rules, duplicate outcomes, image matching, role access, and publication API. | Constrains the implementation and verification. | Confirmed 2026-11-27 |
| Q-021 | OCR similarity criterion remains open; the earlier proposed threshold was never approved. | Excludes OCR similarity behavior from this task. | Confirm; remains open |

### Considered, not applied

- OCR similarity under D-040 — Q-021 remains open, so it is out of scope.

### Assumptions

- None.
