# Plan — P22-19 and P22-22 · Notarial Nomenclature import, metadata suggestions, and classification

**Status:** Approved by the repository owner on 2026-11-26. Implementation is not authorized by this plan approval and has not started.

## Size

**M** — Backend data and service work, plus DS-011 integration. P22-19 establishes the classification source of truth; P22-22 uses it to generate editable metadata suggestions and derive classification.

## Approach

For P22-19, implement the previously approved Part 1 import in the existing Laravel/PostgreSQL scaffold: store the 49 checked-in CSV rules, validate the classification key, and make the initial import transactional and repeatable. Reuse the existing migration and PHPUnit patterns.

For P22-22, use Romanian rule-based extraction over persisted OCR text to propose dates, amounts, document numbers, and tags. Keep every suggestion editable and subject to staff confirmation. Staff choose document type, subtype, and Storage Context; the Application derives the Archival Indicator from the imported nomenclature. Connect these controls to the approved DS-011 Step 1 design. This does not implement retention deadline calculation or official CSV revision handling.

## Files

| Action | Path | What |
|---|---|---|
| Add | `backend/database/migrations/` | Create the `nomenclature_entries` table with fields and unique key from the approved Part 1 plan. |
| Add | `backend/app/Models/NomenclatureEntry.php` | Represent nomenclature rules and their classification key. |
| Add | `backend/database/seeders/NomenclatureSeeder.php` | Import `docs/nomenclator_arhivistic.csv` transactionally; validate source rows and preserve IDs on identical re-import. |
| Add | `backend/tests/Feature/Database/NomenclatureImportTest.php` | Verify all 49 rules, repeated Archival Indicators, retention values, idempotence, and rollback with source-row errors. |
| Add | `backend/app/Services/MetadataSuggestionExtractor.php` | Produce editable rule-based date, amount, document-number, and tag candidates from OCR text. |
| Add or update | `backend/app/Models/DocumentDraft.php` and a migration | Persist metadata candidates and staff corrections with the private draft. |
| Add or update | Draft controller and routes under `backend/app/Http/Controllers/` and `backend/routes/` | Return suggestions and classification choices to authorized `admin`/`arhivar` staff; derive the Archival Indicator from a valid nomenclature entry. |
| Add | `backend/tests/Feature/MetadataSuggestionTest.php` | Cover candidate extraction, editability, role access, valid classification derivation, and invalid classification rejection. |
| Update | DS-011 implementation files under `frontend/src/` | Wire Step 1 metadata and classification controls to the backend while preserving the approved design. |
| Add or update | Frontend tests for DS-011 | Verify suggestions can be edited, missing required metadata is surfaced, and the derived indicator follows the selected classification. |
| Update after build | `docs/agents/ARCHITECTURE.md`, `docs/agents/plans/p22-task-checklist.md` | Record the implemented data flow and completion evidence. |

## Tests

| # | Behaviour | Test |
|---|---|---|
| 1 | All 49 CSV rows import; repeated Archival Indicators are allowed, but duplicate type/subtype/Storage Context combinations are rejected. | `NomenclatureImportTest.php` · PHPUnit/PostgreSQL |
| 2 | Permanent Preservation, C.S. flags, duration, source text, and all six Retention Computation Base values survive import. | `NomenclatureImportTest.php` · PHPUnit/PostgreSQL |
| 3 | Identical re-import preserves IDs; invalid or conflicting rows report the source row and leave no partial import. | `NomenclatureImportTest.php` · PHPUnit/PostgreSQL |
| 4 | Rule-based OCR candidates are returned as suggestions and staff edits remain distinct from unconfirmed candidates. | `MetadataSuggestionTest.php` · PHPUnit |
| 5 | Only `admin` and `arhivar` can access or change draft metadata; invalid classification combinations are rejected. | `MetadataSuggestionTest.php` · PHPUnit |
| 6 | DS-011 displays and edits suggestions, derives the indicator from the selected classification, and covers empty, loading, error, long-text, light, and dark states. | Playwright across desktop and mobile, both themes |

## Design

**DS-011 · approved** — reuse its Step 1 fields and approved mock. No new Screen or mock is proposed. Use existing Design Tokens and Romanian copy. Capture and inspect the changed Screen in light/dark at supported desktop/mobile sizes.

## Sequencing

One builder, sequentially: implement and verify P22-19 first; then build P22-22 against the imported rules, connect DS-011, run PHPUnit and Playwright, and update Architecture and the checklist. No contract change is needed.

## Risks

The CSV uses Romanian descriptions and several distinct Retention Computation Bases; lossy normalization could change statutory meaning. Preserve source rule text and map each source value explicitly. Suggestions may be incomplete or ambiguous, so they remain editable and require staff confirmation under D-038.

## Out of scope

DS-012 browsing and applying official revisions; retention deadline calculation; final document publication and immutable versions; PII review and redaction; new metadata categories beyond those in the brief.

## Knowledge used

Previously confirmed and unchanged: D-001, D-003, D-018, D-035, D-037, D-038, D-039, D-042.

| Entry | What it says | Why it applies | Call |
|---|---|---|---|
| Part 1 · Archive Foundations plan | Approved schema and transactional import of the nomenclature CSV; implementation was held for separate authorization. | P22-19 imports the approved classification source. Use only its import/schema scope; its older relationship notes are superseded by D-037/D-038. | Confirmed by plan approval on 2026-11-26 |
| D-001 | Laravel, PostgreSQL, React, Docker. | Governs the implementation stack. | Confirmed by plan approval on 2026-11-26 |
| D-003 | Backend tests use PHPUnit. | Governs import and metadata tests. | Confirmed by plan approval on 2026-11-26 |
| D-018 | UI and errors are Romanian-only. | Governs DS-011 and API error copy. | Confirmed by plan approval on 2026-11-26 |
| D-035 | Retention follows the applicable nomenclature base; pending dates and Permanent Preservation are supported. | Preserve imported bases; deadline calculation remains later scope. | Confirmed by plan approval on 2026-11-26 |
| D-037 | Metadata changes, including reclassification, are audited and do not create a Document Version. | Classification corrections must remain metadata changes. | Confirmed by plan approval on 2026-11-26 |
| D-038 | Staff confirm editable suggestions and required metadata; classification derives from type, subtype, and Storage Context. | Governs suggestions and classification behavior. | Confirmed by plan approval on 2026-11-26 |
| D-039 | Both staff roles can apply official revisions; new approvals use revised rules and existing documents retain prior rules until reviewed. | Establishes future revision boundary; revision UI is out of scope here. | Confirmed by plan approval on 2026-11-26 |
| D-042 | DS-011 is for `admin` and `arhivar`; DS-012 is a separate Screen. | Sets access and Screen boundaries. | Confirmed by plan approval on 2026-11-26 |
| Q-014, Q-016 | Pending retention date is allowed; classification correction is through type, subtype, or Storage Context. | Supports pending values and derived indicator behavior. | Answered |
| Q-017–Q-019 | Defines revision authority and the DS-012 browsing/import Screen. | Confirms revisions are separate from initial Part 1 import. | Answered |

No approved pattern or contract is changed. D-037 and D-038 govern metadata behavior where the older Part 1 plan differs.

### Considered, not applied

- **D-006** — UI verification uses Playwright, but no visual-testing policy changes are proposed.
- **Q-021** — OCR similarity remains open and is unrelated to metadata suggestions.

### Assumptions

- Suggestions are generated by rules over OCR text; the user-facing fields remain editable and unconfirmed until staff review.
- Classification selection uses exact imported type/subtype/Storage Context matches; the Archival Indicator is derived from that rule.
