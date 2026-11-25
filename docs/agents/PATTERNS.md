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
- PATTERN-006 · Verify permanent PDF Redaction with a source text control and pixel checks · candidate
- PATTERN-007 · Run standalone mock checks through existing Playwright projects · candidate
- PATTERN-008 · Verify live Signed URLs with a disposable object · candidate
- PATTERN-009 · Count only failed credential responses in login throttling · candidate
- PATTERN-010 · Persist mixed intake items independently across database and storage · candidate
- PATTERN-011 · Enforce both idle and absolute age for stateful sessions · candidate
- PATTERN-012 · Record authorized draft access before issuing preview URLs · candidate
- PATTERN-013 · Run a real draft OCR browser check in an isolated Compose project · candidate

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

## PATTERN-006 · Verify permanent PDF Redaction with a source text control and pixel checks
- **Status:** candidate
- **How:** Verify the source marker extracts successfully. Extract from the fresh derivative and check its rendered page plus the embedded image at the rectangle edges. Hash the source before and after.
- **Example:** [Redaction integration test](../../backend/tests/Feature/RedactedPdfTest.php).

## PATTERN-007 · Run standalone mock checks through existing Playwright projects
- **Status:** candidate
- **How:** Keep a standalone design mock and its spec under `docs/design/`. Mount the spec and design files read-only into the existing frontend test container on demand. Reuse its viewport and theme projects. Keep supplemental screenshots in the Playwright output directory.
- **Example:** [DS-003 mock spec](../design/tests/DS-003.spec.js). From the repository root:

  ```bash
  docker compose run --build --rm \
    -v "$PWD/docs:/docs:ro" \
    -v "$PWD/docs/design/tests/DS-003.spec.js:/app/tests/DS-003.spec.js:ro" \
    frontend-test
  ```
-
## PATTERN-008 · Verify live Signed URLs with a disposable object
- **Status:** candidate
- **How:** Create a random synthetic object, request it through the authenticated public Caddy listener, check delivery headers and valid/expired/tampered responses, and delete the object from an exit trap. Keep Signed URLs and hosting credentials out of logs and files.
- **Example:** [Live Signed URL probe](../../docker/live/tests/signed-delivery-smoke.sh) and [P22-56b plan](plans/p22-56b-live-skeleton-deployment.md).

## PATTERN-009 · Count only failed credential responses in login throttling
- **Status:** candidate
- **How:** Key a login limiter by a hash of the normalized username and client IP. Count only failed credential responses so malformed requests do not consume the password-guessing budget; return the localized throttle response after the threshold.
- **Example:** [Login rate limiter](../../backend/app/Providers/AppServiceProvider.php) and [authentication feature tests](../../backend/tests/Feature/AuthenticationAndRolesTest.php).

## PATTERN-010 · Persist mixed intake items independently across database and storage
- **Status:** candidate
- **How:** Persist each independent submission in its own database transaction. Track the private object keys created for that item and remove only those objects if its persistence fails. Return a result for each item so one failure does not discard valid siblings.
- **Example:** [Draft intake service](../../backend/app/Services/DocumentDraftIntakeService.php) and [draft intake feature tests](../../backend/tests/Feature/DocumentDraftIntakeTest.php).

## PATTERN-011 · Enforce both idle and absolute age for stateful sessions
- **Status:** candidate
- **How:** Store authentication start and last-activity timestamps in the server-side session. Check both before allowing each authenticated request, expire at either bound, and refresh only the idle timestamp after a valid request.
- **Example:** [Session lifetime middleware](../../backend/app/Http/Middleware/EnforceSessionLifetime.php) and [authentication feature tests](../../backend/tests/Feature/AuthenticationAndRolesTest.php).

## PATTERN-012 · Record authorized draft access before issuing preview URLs
- **Status:** candidate
- **How:** Resolve the private draft and verify every source object, write an access event for the authenticated staff member, then issue opaque short-lived Signed URLs. Keep URL values in authenticated response data and browser element sources only.
- **Why:** The access record exists before the temporary capability is created, and the API never returns private storage keys.
- **Example:** [Draft controller](../../backend/app/Http/Controllers/DocumentDraftController.php) and [protected OCR feature tests](../../backend/tests/Feature/ProtectedDraftOcrTest.php).

## PATTERN-013 · Run a real draft OCR browser check in an isolated Compose project
- **Status:** candidate
- **How:** Use a separate Compose project and database, configure the shared `documents` disk, provision a synthetic Admin interactively, and run one opt-in Playwright project with synthetic content. Mount the fixture read-only, inspect only that run's access events and sanitized service logs, then remove the isolated project and its volumes.
- **Example:** [Real draft OCR browser check](../../frontend/tests/draft-ocr-real-api.spec.js) and [local rehearsal procedure](../../README.md#local-admin-provisioning-and-m1a-workflow-check).
