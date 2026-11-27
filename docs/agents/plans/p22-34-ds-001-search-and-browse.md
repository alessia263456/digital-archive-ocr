# Plan — P22-34 · DS-001 search and browse

## Size

M — connect DS-001 to the approved browse/search API, replace synthetic data, amend C-008 for explicit sorting, and verify the Screen with deterministic browser fixtures and a real API/PostgreSQL browser test.

## Approach

Replace the synthetic repository behind `ArchiveSearch` with calls to `/api/archive/browse` and `/api/documents`. Adapt role-safe API responses to the existing DS-001 layout and preserve its approved visual design and sort controls. Keep the existing default API ordering when `sort` is omitted; explicit `newest` and `oldest` sorts use Act Date, with missing dates last and document ID ascending as the tie-breaker. Apply sorting in the database before pagination.

## Proposed C-008 amendment

**PROPOSAL: change**

- **Existing:** C-008 defines relevance ordering for keyword searches and approval-time ordering for browses, with no sort parameter.
- **Proposed:** Accept optional `sort=relevance|newest|oldest`.
  - When `sort` is omitted, preserve C-008's current behavior: keyword searches sort by relevance, then approval time, then document ID; searches without a keyword sort by approval time descending, then document ID.
  - `newest` and `oldest` use Act Date, with missing Act Dates last in both orders and document ID ascending for ties.
  - Explicit `relevance` with a keyword sorts by relevance, then approval time, then document ID. With no keyword, it uses the existing browse order: approval time descending, then document ID.
  - Sort before pagination so ordering stays consistent across pages. Invalid sort values return the existing Romanian HTTP 422 error shape.
- **Why now:** The approved DS-001 Screen offers these three controls, and the explicit date sorts should reflect the historical archive's Act Dates.
- **Impact:** C-008 in `docs/agents/CONTRACTS.md`; provider in `backend/app/Http/Controllers/ArchiveController.php`; consumers in `frontend/src/api.js`, `frontend/src/components/archiveSearchRepository.js`, and `frontend/src/components/ArchiveSearch.jsx`; endpoint and browser tests below.
- **If approved:** Amend C-008 in place, remove its `Confirmed` line while editing, then run the ledger lint.

## Files

| Action | Path | What |
|---|---|---|
| Amend during build after this plan approval | `docs/agents/CONTRACTS.md` | Add the optional sort parameter, defaults, Act Date ordering, null handling, tie-breaker, and invalid-value behavior to C-008. |
| Update | `backend/app/Http/Controllers/ArchiveController.php` | Validate and apply requested sorting before pagination, retaining existing defaults. |
| Update | `backend/tests/Feature/ArchiveBrowseSearchTest.php` | Cover default, relevance, newest, oldest, null dates, tied dates, pagination, and invalid values. |
| Add test fixture | `backend/database/seeders/ArchiveSearchE2ESeeder.php` | Create deterministic synthetic test users and archive records for an isolated browser run; do not add it to the normal seeding flow. |
| Update | `frontend/src/api.js` | Add same-origin methods for browse and search, including filters, sort, and pagination. |
| Replace | `frontend/src/components/archiveSearchRepository.js` | Replace local filtering and synthetic loading with adapters for the API responses. |
| Update | `frontend/src/components/ArchiveSearch.jsx` | Render API-backed groups, recent records, role-safe results, highlights, sorting, and pagination in the existing DS-001 design. |
| Remove | `frontend/src/components/archiveSearchMockData.js` | Remove synthetic records once the Screen no longer imports them. |
| Update | `frontend/tests/ds-001-search.spec.js`, `frontend/tests/ds-001-states.spec.js` | Keep deterministic API response fixtures while testing request parameters, role behavior, and DS-001 states. |
| Add test | `frontend/tests/ds-001-real-api.spec.js` | Exercise at least one browser search and sort flow against the real Laravel API and PostgreSQL-backed controlled records. |

## Tests

| # | Behaviour | Test (file · kind) | Not automated? why |
|---|---|---|---|
| 1 | Existing default ordering remains unchanged; explicit relevance works with and without a keyword. | `backend/tests/Feature/ArchiveBrowseSearchTest.php` · PHPUnit feature tests | — |
| 2 | Newest and oldest use Act Date, put missing dates last, break date ties by document ID, and remain stable across pages. | `backend/tests/Feature/ArchiveBrowseSearchTest.php` · PHPUnit feature tests | — |
| 3 | Invalid sort values return the C-008 error shape. | `backend/tests/Feature/ArchiveBrowseSearchTest.php` · PHPUnit feature test | — |
| 4 | The Screen sends browse, search, filter, sort, and pagination requests and renders deterministic API responses, role-appropriate controls, and empty/loading/error states. | `frontend/tests/ds-001-search.spec.js`, `frontend/tests/ds-001-states.spec.js` · Playwright in existing desktop/mobile and light/dark projects | — |
| 5 | A browser logs in and searches or sorts controlled records through the real Laravel API backed by PostgreSQL, including ordering across pages. | `frontend/tests/ds-001-real-api.spec.js` with `backend/database/seeders/ArchiveSearchE2ESeeder.php` · Playwright against an isolated Compose project | Runtime test credentials are supplied through the test environment and are not stored in the repository. |
| 6 | The updated Screen still follows the approved layout at supported sizes and themes. | Targeted DS-001 Playwright screenshots · visual review | Screenshots need comparison with approved DS-001 references. |

## Design (UI only)

DS-001 is already implemented and approved. Keep its mock, layout, tokens, and sort controls; do not change the registry. Render only fields supplied by the caller's role-safe API projection, using the available approved metadata and safe highlight in the existing content slots. Cover empty, loading, error, long text, many items, keyboard focus, light/dark, and smallest/largest supported sizes.

## Sequencing

One builder. After plan approval, follow `/build` test-first: write the PHPUnit and Playwright tests first, run them and confirm they fail for the missing behaviors, then commit the tests. Next amend C-008 and implement the API integration until the tests pass. Run the real-API browser test with controlled records in an isolated Compose project.

## Risks

The current synthetic titles and excerpts are not fields in C-008. The adapter must use only approved API fields and must not expose role-restricted data. Act Date may be absent, so the null ordering must be explicit and tested in both directions. The real-API browser setup must use isolated PostgreSQL data and runtime credentials, not committed secrets.

## Out of scope

Investigating whether P22-34 resolves the full Playwright run's empty-archive failures. That question remains for its own plan and tests.

## Knowledge used

| Entry | What it says | Why it applies | Call |
|---|---|---|---|
| D-002, D-006, D-018, D-033, D-042, D-043, C-003 | Archive scope, Playwright verification, Romanian UI/errors, role-safe browsing, DS-001 access, session rules, and protected API requirements. | Constrains Screen behavior, authorization, errors, and test coverage. | Confirmed, unchanged |
| C-008 | Browse/search response shapes, role projections, filters, pagination, and existing default ordering. | Baseline contract; proposed sort amendment is above. | Confirm baseline; amendment approved with this plan, to apply during build |
| PATTERN-002 | Run frontend browser checks against the containerized production build. | Applies to Playwright verification. | Confirmed |

### Considered, not applied

- PATTERN-007 — applies to standalone design-mock checks, not the Application's DS-001 integration.

### Assumptions (no entry behind them)

- Missing Act Dates sort last in both explicit date orders; equal dates sort by document ID ascending, as specified in this plan for approval.
