# Patterns — proiect1

<!-- graffino-agentic:begin v1 -->
> How we build things here. Copy only `approved` entries. `candidate` = seen once or
> not yet confirmed; agents add these freely. Promotion needs the user's OK.
<!-- graffino-agentic:end -->

## Index
- PATTERN-001 · Isolate Laravel migration smoke tests in PostgreSQL · candidate
- PATTERN-002 · Run frontend browser checks against the containerized production build · candidate
- PATTERN-003 · Publish complete page sets with a directory rename · candidate
- PATTERN-004 · Publish a local derivative with a create-only hard link · candidate
- PATTERN-005 · Rehearse a public listener handoff with a disposable TLS volume · candidate

---

## PATTERN-001 · Isolate Laravel migration smoke tests in PostgreSQL
- **Status:** candidate
- **How:** Select the dedicated test database in PHPUnit configuration. Check the live PDO driver and database name before applying scaffold migrations.
- **Example:** [Migration smoke test](../../backend/tests/Feature/MigrationSmokeTest.php) and [PHPUnit configuration](../../backend/phpunit.xml).

## PATTERN-002 · Run frontend browser checks against the containerized production build
- **Status:** candidate
- **How:** Build the frontend in a disposable Compose service. Let Playwright start the preview on container loopback and run the same Compose command locally and in CI. Mount the results directory to inspect screenshots after the container exits.
- **Example:** [Compose service](../../compose.yaml), [Playwright configuration](../../frontend/playwright.config.js) and [frontend workflow](../../.github/workflows/frontend.yml).


## PATTERN-003 · Publish complete page sets with a directory rename
- **Status:** candidate
- **How:** Stage each conversion in a private sibling directory. Validate every expected page, then lock the parent directory around the destination check and rename. On failure remove only the current run’s staging files. Concurrent conversions can render independently.
- **Example:** [Renderer](../../backend/app/Services/DocumentPageRenderer.php) and [concurrent publication test](../../backend/tests/Feature/DocumentPageRendererTest.php).

## PATTERN-004 · Publish a local derivative with a create-only hard link
- **Status:** candidate
- **How:** Stage and validate a single derivative in a private directory on the destination filesystem. Create the final name with a hard link. Concurrent writers receive a conflict if that name already exists. Remove the temporary name during cleanup.
- **Example:** [DOCX conversion service](../../backend/app/Services/DocxConversionService.php) and [concurrent publication test](../../backend/tests/Feature/DocxConversionServiceTest.php).

## PATTERN-005 · Rehearse a public listener handoff with a disposable TLS volume
- **Status:** candidate
- **How:** Start the placeholder and replacement as separate local Compose projects using one synthetic hostname, a local CA and a shared disposable certificate volume. Switch only the public listener. Check the certificate fingerprint, authentication challenge and expected response before the switch, after the switch and after restoring the placeholder.
- **Example:** [Live skeleton procedure](../../docker/live/README.md) and [verification plan](plans/p22-54a-live-skeleton-configuration.md).
