# Patterns — proiect1

<!-- graffino-agentic:begin v1 -->
> How we build things here. Copy only `approved` entries. `candidate` = seen once or
> not yet confirmed; agents add these freely. Promotion needs the user's OK.
<!-- graffino-agentic:end -->

## Index
- PATTERN-001 · Isolate Laravel migration smoke tests in PostgreSQL · candidate
- PATTERN-002 · Run frontend browser checks against the containerized production build · candidate

---

## PATTERN-001 · Isolate Laravel migration smoke tests in PostgreSQL
- **Status:** candidate
- **How:** Select the dedicated test database in PHPUnit configuration. Check the live PDO driver and database name before applying scaffold migrations.
- **Example:** [Migration smoke test](../../backend/tests/Feature/MigrationSmokeTest.php) and [PHPUnit configuration](../../backend/phpunit.xml).

## PATTERN-002 · Run frontend browser checks against the containerized production build
- **Status:** candidate
- **How:** Build the frontend in a disposable Compose service. Let Playwright start the preview on container loopback and run the same Compose command locally and in CI. Mount the results directory to inspect screenshots after the container exits.
- **Example:** [Compose service](../../compose.yaml), [Playwright configuration](../../frontend/playwright.config.js) and [frontend workflow](../../.github/workflows/frontend.yml).
