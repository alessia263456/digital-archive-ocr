# Plan — M2 · Review to publication

**Status:** Approved by the repository owner on 2026-11-27 with D-044 and C-006; C-007 was subsequently approved to extend the dossier catalogue contract. The owner explicitly approved the DS-011 mock for React implementation. Backend M2 implementation and verification completed before frontend integration (177 PHPUnit tests, 1,339 assertions, 3 skipped). React Editor wiring and DS-004 handoff are implemented and verified through the real API. No push or deployment is authorized.

## Size

**L** — Connect the existing metadata and review APIs to DS-011, add retention calculation and immutable publication, and complete the DS-004 handoff. P22-22 backend and Editor UI wiring are complete.

## Approach

Reuse the existing metadata endpoints, `MetadataSuggestionExtractor`, Notarial Nomenclature entries, Editor, and DS-004 handoff. The selected document type completes the Archival Indicator and retention term. List only Physical Dossiers matching both values; if none exists, Admin can create one, with the backend deriving those two fields from the nomenclature entry. Add revision-bound final review confirmation, calculate retention from the selected nomenclature rule, and publish the original and current redacted output as an immutable Document Version. Run P22-29's approved duplicate checks at publication as required by the M2 roadmap.

For retention, D-044 makes the stored date the first eligible date: computation base plus N calendar years, clamping 29 February to 28 February when the target year is not a leap year. Eligibility does not authorize destruction. Physical Dossier printed numbers are unique and visible as the Editor selection label; the stable record ID remains the submitted identifier. Each dossier stores the printed number, Archival Indicator, Inventory Number, retention term, and optional short description. Dossiers match the selected nomenclature indicator and retention term; creation derives both from the selected nomenclature. Only `admin` can create a dossier; `arhivar` selects existing records.

## Files

| Action | Path | What |
|---|---|---|
| Add | `backend/database/migrations/` | Add document/version records, draft-to-document linkage, retention inputs/results, revision-bound review confirmation, idempotency state, and append-only audit enforcement for publication events. |
| Add | `backend/app/Models/Document.php`, `DocumentVersion.php` | Represent a digital document, its Physical Dossier association, current version, and immutable version history. |
| Add/update | `backend/app/Models/PhysicalDossier.php`, migrations and dossier controller | Require unique printed dossier numbers and persist Archival Indicator, Inventory Number, retention term, and optional short description; list for staff and create for Admin only. |
| Add | `backend/app/Services/RetentionCalculator.php`, `DocumentPublicationService.php` | Calculate all six Notarial Nomenclature bases; support pending dates and Permanent Preservation; publish versions without overwriting stored content. |
| Update | `DocumentDraft.php`, `DocumentDraftController.php`, `backend/routes/api.php` | Extend metadata endpoints for dossier selection, applicable event dates, and retention results. Add protected dossier list/create, final review confirmation, and publication routes. Clear confirmation when OCR or metadata changes. |
| Update | `DocumentDuplicateChecker.php` | Enforce exact duplicate blocking against published content and surface the approved act-number/Act Date warning choices. Keep OCR similarity under Q-021 out of scope. |
| Add/update | `backend/tests/Unit/RetentionCalculatorTest.php`, `backend/tests/Feature/DocumentPublicationTest.php`, `MetadataSuggestionTest.php` | Cover all retention bases and leap-year behavior, pending/permanent cases, dossier selection and Admin-only creation, required confirmation, duplicates, initial/replacement versions, idempotency, failure cleanup, and immutable audit events. |
| Update after Screen approval | `frontend/src/api.js`, `frontend/src/main.jsx`, `frontend/src/theme.css` | Wire metadata suggestions/classification, dossier selection/creation, retention, explicit final review confirmation, and publication. |
| Update after Screen approval | `frontend/tests/editor.spec.js`, `frontend/tests/queue.spec.js` | Verify DS-004 start/resume, Editor review and publication through the React application. Add an opt-in real-API workflow. |
| Update | `docs/design/mocks/DS-011.html`, `docs/design/tests/DS-011.spec.js` | Add dossier record selection/creation and distinguish retention eligibility from authority to destroy. The mock is updated; explicit owner Screen approval is the gate before React UI implementation. |
| Update after implementation | `docs/design/registry.yaml`, `docs/agents/ARCHITECTURE.md`, `docs/agents/plans/p22-task-checklist.md` | Correct the stale DS-004 description, document publication and retention data flow, and record verification evidence. |
| Add | `docs/agents/CONTRACTS.md` | C-006 defines revision requirements, authorization, duplicate outcomes, publication idempotency, and error responses for Laravel providers and React consumers. |
| Add | `docs/agents/DECISIONS.md` | D-044 defines first eligibility date arithmetic, leap-year clamping, and the separation between eligibility and destruction approval. |

## Tests

| # | Behaviour | Test | Not automated? why |
|---|---|---|---|
| 1 | Act Date, dossier resolution, deposit placement, contract expiry, deposit release, and Permanent Preservation produce the correct result. Unknown required events remain pending. February 29 clamps to February 28 in a non-leap target year. | `RetentionCalculatorTest.php` · PHPUnit | — |
| 2 | OCR suggestions remain editable; classification derives the Archival Indicator and retention term; dossier selection lists only matching records and clears an incompatible record after a classification change; only `admin` can create a dossier, with derived catalogue values. | `MetadataSuggestionTest.php`, `PhysicalDossierApiTest.php` · PHPUnit | — |
| 3 | Metadata confirmation is invalidated by metadata/OCR changes. Explicit PII review is required even with zero candidates; unresolved candidates block publication. | `DocumentPublicationTest.php` · PHPUnit | — |
| 4 | Initial publication creates version 1; replacements append a version; OCR-only changes do not create a version. Source and earlier version objects remain unchanged. | `DocumentPublicationTest.php` · PHPUnit | — |
| 5 | Exact duplicates always block. Possible duplicates present only the approved choices. Stale state, concurrent requests, and failed storage/database operations leave no partial rows or orphaned objects. | PHPUnit feature tests | — |
| 6 | Repeating an idempotency key with the same request returns the original successful result; a different request with the same key returns HTTP 409. | `DocumentPublicationTest.php` · PHPUnit | — |
| 7 | Audit records cannot be updated or deleted; unauthorized roles cannot access publication or dossier mutations. | PHPUnit/PostgreSQL feature tests | — |
| 8 | DS-004 opens/resumes the selected draft; the complete workflow works through the actual React API. | `editor.spec.js`, `queue.spec.js` · Playwright | — |
| 9 | Changed Screen matches the approved mock in light/dark at supported desktop/mobile sizes. | Containerized Playwright screenshots · D-006 | Owner reviews captures against the mock. |

After Screen and plan approval, run PHPUnit, the frontend Playwright suite, Ledger lint, and screenshot inspection. No backend publication tests have been run yet.

## Design (UI only)

**DS-011 and DS-004.** DS-011's approved four-step mock covers metadata, retention, final review, and approval. The revised mock adds stable Physical Dossier record selection and Admin-only creation when none exists, plus a clear distinction between first eligibility date and destruction approval. The owner explicitly approved the mock for React implementation. DS-004 hands off to the Editor; the real API flow is covered end to end. Use existing Design Tokens and Romanian copy. Cover loading, empty, error, success, long text, light/dark, keyboard, and desktop/mobile states.

## Sequencing

One builder, sequentially:

1. Record approved D-044 and C-006, update the DS-011 mock, run its mock tests, and obtain explicit Screen approval. Complete; the mock passed 36/36 and the owner approved React implementation.
2. Write backend tests first. Implement dossier records, retention calculation, revision-bound review confirmation, idempotency, audit enforcement, and publication. Complete and verify this backend workflow before frontend integration (177 PHPUnit tests, 1,339 assertions, 3 skipped).
3. Wait for explicit DS-011 Screen approval before implementing the changed React UI. Approval was received before UI work.
4. Wire DS-011 and verify the DS-004 handoff with the real API. Complete; the opt-in real API test traverses the flow through publication.
5. Run the complete verification matrix, inspect screenshots, and update the registry, Architecture, and checklist. Complete: frontend Playwright 156 passed, 28 opt-in skips using one worker; ledger lint and whitespace checks pass. DS-011 screenshots were inspected in desktop and mobile light mode; the full matrix generated all four viewport/theme screenshots.

## Risks

- Confirmation can become stale between review and publication. Bind the review snapshot to source and redacted content digests, metadata/classification/retention, OCR, detection decisions, and Redaction revisions; reject a mismatched snapshot.
- Storage and database writes cannot share a transaction. Use unique immutable object keys, stage before database commit, and remove only objects staged by a failed attempt.
- Dossier candidates must match the selected nomenclature's archival indicator and retention term. Unique printed numbers allow staff to identify each matching record while the API submits its stable ID.
- Retention eligibility is not destruction authorization. Pending records remain out of the Destruction List; Permanent Preservation has no eligibility date.

## Out of scope

DS-012 nomenclature revisions; DS-005 destruction management; search, indexing, browsing, and viewer work assigned to M3; Share Links; OCR-similarity behavior under Q-021; deployment and live corpus acceptance.

## Knowledge used

Previously confirmed and unchanged: D-001, D-002, D-003, D-004, D-006, D-018, D-022, D-025, D-033, D-035, D-037, D-038, D-039, D-040, D-042, D-043, and C-005.

| Entry | What it says | Why it applies | Call |
|---|---|---|---|
| D-033 / D-045 | Admin manages folders; Arhivar has unrestricted dossier access. D-045 requires unique printed dossier numbers and the catalogue fields. | Admin-only dossier creation; both staff roles can select by the displayed printed number. | D-045 approved 2026-11-27 |
| D-035 / D-044 | Retention follows the nomenclature base; unknown dates may remain pending; Permanent Preservation has no deadline. D-044 defines calendar-year arithmetic and keeps eligibility separate from destruction approval. | Governs the calculator and publication gate. | D-044 approved 2026-11-27 |
| D-037 / D-038 | Metadata changes are audited; required metadata and explicit PII review precede publication; initial and replacement approvals create immutable versions. | Governs confirmation, versioning, and audit behavior. | Confirmed previously |
| D-025 / D-040 | Exact matches block saving; approved act-number/Act Date choices remain; ordered-image duplicates are checked. | Governs publication duplicate outcomes. | Confirmed previously; exact blocking cannot be overridden |
| C-005 | Defines revision-bound OCR, PII, and Redaction API behavior. | Reuse unchanged; C-006 and its approved extension C-007 cover metadata, retention, review, dossiers, and publication. | Confirmed previously |
| C-006 / C-007 | Defines authorization, revision requirements, duplicate outcomes, idempotency, errors, and dossier catalogue behavior for the M2 API. | Connects the Laravel provider to the React consumer. | Approved 2026-11-27 |
| PATTERN-018 / PATTERN-019 | Candidate practices for contextual metadata suggestions and revision-bound OCR locations. | For awareness only; neither is approved. | Candidate |
| Q-014 / Q-016 | Pending retention is allowed; classification is corrected through type, subtype, or Storage Context. | Existing answers remain applicable. | Answered |
| Q-021 | OCR similarity criterion remains open. | Keep OCR-similarity warnings out of scope. | Open; unchanged |
