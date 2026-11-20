# Patterns — proiect1

<!-- graffino-agentic:begin v1 -->
> How we build things here. Copy only `approved` entries. `candidate` = seen once or
> not yet confirmed; agents add these freely. Promotion needs the user's OK.
<!-- graffino-agentic:end -->

## Index
- PATTERN-001 · Isolate Laravel migration smoke tests in PostgreSQL · candidate

---

## PATTERN-001 · Isolate Laravel migration smoke tests in PostgreSQL
- **Status:** candidate
- **How:** Select the dedicated test database in PHPUnit configuration. Check the live PDO driver and database name before applying scaffold migrations.
- **Example:** [Migration smoke test](../../backend/tests/Feature/MigrationSmokeTest.php) and [PHPUnit configuration](../../backend/phpunit.xml).
