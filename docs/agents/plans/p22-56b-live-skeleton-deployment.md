# Plan — P22-56b · Deploy the live skeleton

**Status:** Approved by the owner on 2026-11-22. The owner authorized this task's live skeleton cutover. Production release, DNS changes and firewall changes remain out of scope.

## Size

**M ·** The live Compose and R2 configuration are prepared and local checks have passed. Remaining work is the VM preflight, real R2 verification, authenticated listener switch, public acceptance and rollback check. The roadmap allocates 90 minutes.

## Approach

Use the existing [P22-54a operator procedure](../../../docker/live/README.md), keeping the authenticated placeholder online while the internal services are built and checked. Provision the rotated R2 credential and persistent runtime values through the private deployment environment without printing or recording values. Before cutover, verify PostgreSQL, Romanian OCR and the R2 object cycle; after cutover, exercise valid, expired and tampered Signed URLs through public Caddy and FrankenPHP using a disposable synthetic R2 object. Preserve the placeholder project and TLS volume for immediate rollback.

The local Caddy/FrankenPHP Signed URL integration already passed: synthetic delivery returned HTTP 200 with the expected bytes and `nosniff`; expired and tampered requests returned HTTP 403. Live verification remains necessary for the R2 configuration and public listener. The task checklist records prior local tests and the initial DB password configuration fix.

## Files

| Action | Path | Work |
|---|---|---|
| Update | `docker/live/compose.yaml` | Require and pass `DOCUMENTS_DISK=r2`, R2 access key, secret, bucket, endpoint, region and path-style configuration to the private backend. |
| Update | `compose.yaml` | Pass the configured `DB_PASSWORD` through to the local backend; the prior full-suite run showed it was empty while PostgreSQL required authentication. |
| Update | `docker/live/test_config.py` | Check missing R2 inputs, defaults and Signed URL probe shell syntax. |
| Add | `docker/live/tests/signed-delivery-smoke.sh` | Create one synthetic private R2 object, request valid/expired/tampered Signed URLs through the live local HTTPS listener, verify content and security headers, and delete the object on exit. Keep URLs and response data in process memory; print statuses only. |
| Update | `backend/routes/console.php` | Report Signed URL generation without printing its bearer URL during `storage:r2-smoke`. |
| Update | `backend/tests/Feature/DocumentStorageTest.php` | Verify the R2 smoke command reports success without printing a Signed URL. |
| Update | `docker/live/README.md` | Document private runtime provisioning, R2 smoke and signed delivery probe, public acceptance and rollback. |
| Update | `docs/agents/ARCHITECTURE.md` | Record live R2 variable names and the fact that live object verification is pending until acceptance. |
| Update after verification | `docs/agents/plans/p22-task-checklist.md` | Record actual live evidence. Keep P22-11 and P22-56b unchecked until their full acceptance criteria pass. |
| Update | `docs/agents/PATTERNS.md` | Add PATTERN-007 as a candidate for live Signed URL verification using a disposable object and guaranteed cleanup. |

## Tests

| # | Behaviour | Verification | Execution |
|---|---|---|---|
| 1 | R2 credentials are required and passed only to the backend | `python3 docker/live/test_config.py`; verify missing required variables fail and defaults are `auto` and `false`. | Automated local. |
| 2 | Smoke output does not expose a Signed URL | `DocumentStorageTest` runs the smoke command against a fake documents disk and asserts success without URL/signature output. | PHPUnit. |
| 3 | Runtime and application remain compatible | Build live backend/Caddy/OCR images; validate both Caddyfiles; run migrations/status, Romanian OCR smoke and real `storage:r2-smoke`. | Local build, then live VM. |
| 4 | Live edge delivers and rejects Signed URLs correctly | Run `docker/live/tests/signed-delivery-smoke.sh` after switching Caddy. Expect HTTP 200 with the synthetic PDF and security headers; expect 403 for expired and tampered URLs; verify cleanup. | Live VM. Hosting Basic Auth password is entered at curl's prompt and is not stored. |
| 5 | Public service is healthy and protected | Check HTTP redirect, trusted HTTPS, anonymous challenge, authenticated frontend and asset, `/up`, JSON API fallback and certificate continuity. | Read-only external requests after cutover. |
| 6 | Rollback restores the placeholder | If any live check fails, stop live Caddy and restart placeholder Caddy; confirm anonymous 401, trusted certificate and authenticated “Hello World”. | Live VM, only on failure. |
| 7 | Repository checks pass | Run PHPUnit, four Playwright viewport/theme checks, Romanian OCR smoke, Compose configuration tests, Ledger lint and `git diff --check`. | Local Docker and Python. |

## Sequencing

1. Add the failing PHPUnit and shell syntax checks; then implement the redacted smoke output and signed delivery probe.
2. Run focused PHPUnit, shell syntax and Compose config tests. Run the full PHPUnit suite, frontend Playwright suite, OCR smoke and Ledger lint.
3. On the VM, verify architecture, placeholder state, TCP ownership, actual TLS volume and auth-file presence. Check the current external redirect, certificate and anonymous challenge.
4. Use the private environment for `APP_KEY`, `DB_PASSWORD` and the rotated R2 values. Run `docker compose config -q`, build and validate while the placeholder remains serving.
5. Start backend/PostgreSQL, migrate and inspect migration status; run OCR smoke and the real R2 object cycle. Do not switch if either fails.
6. Perform the authorized listener switch with the same TLS volume. Run the live Signed URL probe and public checks. Roll back immediately on failure.
7. Record statuses, dates, migration evidence, OCR/R2 results, Signed URL responses and certificate fingerprint evidence in the checklist. Mark P22-11 complete only after real R2 and live Signed URL criteria pass; mark P22-56b complete only after all live criteria pass.

## Risks

- The listener switch briefly interrupts public traffic. The authenticated placeholder and its certificate volume remain the rollback target.
- A database migration can persist after listener rollback; database recovery is separate.
- Signed URLs are bearer capabilities. The probe does not print or persist them, uses synthetic content, and deletes its temporary object on exit.
- R2 credentials and endpoints must not appear in command output, shell history, tracked files or checklist evidence.

## Out of scope

Production release, queue processing, DNS/firewall changes, real Document Corpus content, Application authentication and Share Link lifecycle work.

## Knowledge used

| Entry | What it says | Why it applies | Call |
|---|---|---|---|
| D-001, D-002, D-003, D-018, D-028, D-034, D-037 and D-038 | Confirmed stack, archive scope, PHPUnit, Romanian errors, document preservation, Signed URL access and version/draft requirements. | Governs the storage deployment and verification. | Confirmed; unchanged. |
| D-004 | OCR uses Romanian Tesseract and TSV Bounding Boxes. | Governs the live OCR smoke. | Confirmed; unchanged. |
| D-006 | Playwright verifies desktop/mobile and light/dark. | Governs the required frontend regression check; no Screen changes. | Confirmed; unchanged. |
| C-001 | Signed delivery uses an opaque token and expiry/signature parameters; invalid/expired URLs return 403, missing content returns 404. | Defines the live delivery probe assertions. | Confirmed; unchanged. |
| PATTERN-005 | Disposable TLS volume rehearsal is a candidate pattern. | Not used as an approved rule; P22-54a's approved operator procedure governs. | Considered, not applied. |

- **Confirmed:** 2026-11-22 for D-001, D-002, D-003, D-004, D-006, D-018, D-028, D-034, D-037, D-038 and C-001.

### Open questions

None. Runtime secrets are supplied through the existing private deployment environment and are not recorded in this plan.
