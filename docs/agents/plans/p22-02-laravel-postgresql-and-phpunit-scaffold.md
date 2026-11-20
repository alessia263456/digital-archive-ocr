# Plan — P22-02 · Laravel, PostgreSQL and PHPUnit scaffold

**Status:** Plan approved on 2026-11-20. Build authorization pending.

## Size

**M · 90-minute provisional timebox.** This adds the first Laravel scaffold and verifies it against PostgreSQL in Docker. Day 1, Task 1 is marked complete. [Roadmap](p22-roadmap.md) · [Task checklist](p22-task-checklist.md)

## Approach

Scaffold Laravel under `backend/` using its standard project structure, boot health route, and PHPUnit runner. Extend the existing Compose file with a Laravel service that has the PHP PostgreSQL driver and a PostgreSQL service with a readiness check. Configure PHPUnit to run against an isolated PostgreSQL test database and verify both the active driver and a table created by the scaffold migrations. This uses the framework’s health and migration tooling and follows P22-01’s checked-in Compose smoke setup **for awareness only**. [Existing Compose file](../../../compose.yaml) · [OCR smoke script](../../../docker/ocr-worker/smoke/check.sh)

## Files

| Action | Path | What |
|---|---|---|
| Add | `backend/` | Laravel scaffold, Composer manifest and lockfile, PostgreSQL environment template, and ignore rules for local environment files and generated dependencies. |
| Add | `docker/backend/Dockerfile` | PHP runtime, Composer, and PostgreSQL driver for local development and tests. |
| Update | `compose.yaml` | Define Laravel and PostgreSQL services, database readiness, and local database storage. Keep the existing `ocr-worker` command usable on its own. |
| Configure | `backend/phpunit.xml`, `backend/tests/Feature/MigrationSmokeTest.php` | Select PostgreSQL for PHPUnit and verify that the test database is reachable and the migrated schema exists. |
| Update | `README.md`, `AGENTS.md`, `docs/agents/ARCHITECTURE.md` | Record the verified startup, migration, and test commands and the new service layout. |
| Update | `docs/agents/plans/p22-task-checklist.md` | Record P22-02 completion once its acceptance checks pass. |

## Tests

| # | Behaviour | Verification |
|---|---|---|
| 1 | PHPUnit exercises the migration against PostgreSQL | Add the PHPUnit feature test first. Assert that the active driver is `pgsql` and that a table from the standard migrations exists in the isolated test database. |
| 2 | Laravel builds and boots in Docker | Validate Compose configuration, build the Laravel image, start Laravel and PostgreSQL, and check that Laravel’s `/up` returns HTTP 200. |
| 3 | Fresh migrations work from an empty database | Run migrations in a disposable PostgreSQL environment and confirm the migration status. Run the full scaffold PHPUnit suite in the Laravel container. |
| 4 | The existing OCR workflow still runs independently | Run `docker compose run --rm ocr-worker` and check the Romanian text and TSV result. |
| 5 | The Ledger passes validation | Run `python3 docs/agents/tools/ledger-lint.py`. |

Playwright and screenshots are outside this backend-only task. Implementation checks are pending approval.

## Sequencing

One builder. Scaffold Laravel and add the PHPUnit smoke test, wire the Compose services, then run the acceptance checks before updating the startup documentation and checklist.

## Risks

- Laravel can return HTTP 200 before a database problem surfaces. The fresh migration and PostgreSQL-backed PHPUnit test verify the database separately.
- Fresh migrations can erase data if pointed at the wrong target. Run them only in a disposable Compose environment, with PHPUnit using its own test database.
- Image or Composer downloads may consume the timebox. If that happens, record the failing command and what remains to verify before revising the estimate.

## Out of scope

React and Playwright scaffolding, archive schema and workflows, authentication, OCR queue integration, and deployment.

## Knowledge used

Previously confirmed and still applicable: **D-001** requires containerized Laravel and PostgreSQL, **D-003** requires PHPUnit, and **D-004** governs the Romanian OCR regression check. [Decisions](../DECISIONS.md)

The Patterns and Contracts Ledgers contain no applicable entries. This scaffold changes no provided contract or consumer. No open question blocks the plan. [Patterns](../PATTERNS.md) · [Contracts](../CONTRACTS.md) · [Open Questions](../OPEN-QUESTIONS.md)

### Considered, not applied

- **D-006** applies to visual verification once a React Screen is in scope.

### Assumptions

- The plan uses Laravel’s standard `/up` route for the local boot check and leaves dependency versions to be selected and pinned during the approved build.
