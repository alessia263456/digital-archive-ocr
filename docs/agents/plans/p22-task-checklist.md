# P22 · Task checklist

**Status:** Roadmap approved on 2026-11-24. Milestone implementation plans and builds remain separate approval steps. Live deployment requires explicit authorization.

See the [approved remaining roadmap](p22-roadmap.md) for scope, dependencies, verification, estimates and daily targets.

Check off a task after verification. Record Codex active implementation/verification time, owner review/approval time, owner manual testing time, elapsed approval-to-verified turnaround, evidence and blockers separately. Keep existing completed-task evidence intact. See the [approved remaining roadmap](p22-roadmap.md) for milestone scope, dependencies, acceptance criteria and daily targets.

## Day 1 · Start the stack and take delivery of the corpus

- [x] P22-01 · Container and Romanian OCR smoke
  - Approved on 2026-11-20 before local setup at 08:58 EET. Verified by 09:02 EET. The timed setup and verification window was about four minutes. Exact approval time and approval wait were not measured.
  - Compose configuration and image build passed. Tesseract 5.3.0 with `ron` read “Știință și cultură în România” and emitted five valid TSV word Bounding Boxes.
  - Negative verification rejected a malformed TSV header, a missing word, a negative left coordinate, zero height, and an out-of-bounds word. Ledger lint passed.
  - The sandbox initially blocked writes to Docker Buildx state and access to the Docker socket. Both checks passed with escalation.
- [x] P22-02 · Laravel, PostgreSQL and PHPUnit scaffold
  - Build approved on 2026-11-20 before setup at 13:38 EET. Verified by 13:44 EET. Exact approval time and review duration were not measured.
  - Laravel 13.43.0 returned HTTP 200 at `/up`. All three scaffold migrations ran on a fresh PostgreSQL 17 database. PHPUnit 12.5.45 passed twice (3 tests, 6 assertions). The first run migrated only `archive_test` and left the development schema empty.
  - The Composer image lacked `mbstring`. In the backend image the smoke test rejected the SQLite configuration as expected, then passed with PostgreSQL. Compose validation, the backend image build, Composer platform checks, Romanian OCR and Ledger lint passed.
- [x] P22-04 · Corpus, live access and submission logistics
  - Owner approved the [coordination plan](p22-04-corpus-live-access-and-submission-logistics.md) on 2026-11-20.
  - Document Corpus handoff received. The owner received about 15 source documents of various types from the Notary Cabinet archive and reports preparing about 15 of the 30 planned test documents. The owner removes identifying information and creates variants with synthetic data. The live Document Corpus uses only the resulting test documents. Completion date for the remaining variants is pending.
  - The owner provisioned the `digital-archive-ocr` VM on Azure for Students in Sweden Central with Ubuntu Server 24.04 LTS. The Azure-managed hostname is `arhivar.swedencentral.cloudapp.azure.com`. The owner verified SSH with an Ed25519 key and confirmed passwordless sudo by running `sudo -k` followed by `sudo -n whoami`, which returned `root` with exit status 0. HTTPS and the password-protected placeholder are covered by P22-56a.
  - The Secretar Notarial is generally available daily after 18:00 Europe/Bucharest. The owner will arrange the five live acceptance searches and any rerun once the live Application is ready, before 2026-12-04, and record the results and feedback in `INTERVIEW.md` under P22-60.
  - Course submission confirmed by the owner from the course instructions. Submit by **2026-12-04 at 23:59** through the Classroom form with the public GitHub repository link and the live HTTPS URL. The evaluator uses the last commit before the cutoff.
  - Submission evidence includes root-level `SUBMISSION.md` in the course format, with a Definition of Done self-check that cites concrete evidence and a two-minute walkthrough of the P22 twist. Include `README.md` (five-minute Compose setup, environment template, architecture diagram and status), `AI_LOG.md` (at least 10 entries), at least 8 approved D- entries, API documentation with request and response examples and a C- entry linking to it, and P22 field evidence in `INTERVIEW.md` and `CORPUS.md` as specified by the brief. Record a 3–5 minute narrated demo on the live URL that shows how the twist works. [P22 brief](../../brief.md)
  - Course verification also requires the agentic setup and passing Ledger lint, a relational database with versioned migrations, at least six related tables and representative seed data, a complete local Docker Compose startup, server-side validation and authorization, at least two roles, hashed passwords, session or token authentication, SQL injection and XSS protections, and basic responsive and keyboard accessibility. GitHub Actions must run the tests and Ledger lint on every push and pass on the final commit. Count at least 10 relevant unit and integration tests, including at least four that cover business rules or the twist. The public repository needs at least 25 descriptive commits across at least eight distinct days.
- [x] P22-56a · Deploy authenticated “Hello World”
  - Approved 2026-11-20. Docker and the isolated Caddy service were installed. Local Compose and Caddy validation passed, missing credentials failed validation as expected, and HTTP on the VM returned 308. Both public TCP connections and ACME validation timed out. Stopped the placeholder and retained its volume pending ingress inspection.
  - Verified 2026-11-20 at 18:06 EET after the owner added Allow-HTTP (310) and Allow-HTTPS (320). External HTTP returned 308 to HTTPS. Let’s Encrypt issued a trusted certificate. Anonymous requests on two paths and invalid credentials returned 401 with a Basic challenge. Chromium rendered exactly “Hello World” with valid credentials (200). Recreating only Caddy retained its TLS volume and certificate fingerprint. The same external checks passed after redeployment.
- [x] P22-05 · Confirm the Screen approval route
  - The owner reviews each repository mock or its screenshots in chat and explicitly approves that Screen in chat before implementation. [Q-013](../OPEN-QUESTIONS.md#q-013--where-and-how-will-the-remaining-screen-designs-be-approved)
  - At route confirmation, DS-002, DS-003 and DS-004 were approved. Subsequent approvals are recorded for DS-011 (P22-10c) and DS-007 (registry approval commit `34c1ed4`, 2026-11-24). Current registry status: implemented — DS-001, DS-003, DS-004, DS-010; approved — DS-002, DS-007, DS-011; draft — DS-005, DS-006, DS-008, DS-009, DS-012. Draft mock files exist for DS-005 and DS-006; DS-009 also has a draft mock but still needs its incorrect-password state. DS-008 has no mock file yet. Drafts remain unapproved until the owner explicitly approves each Screen.
- [x] P22-49a · Inventory first corpus batch
  - Approved 2026-11-20. On 2026-11-21 the owner confirmed synthetic data for TEST-001 through TEST-010, identified the signatures as Signatory Party signatures and clarified the vehicle registration numbers. Exact review duration was not measured.
  - The [inventory](../../../CORPUS.md#inventory) records eight scanned PDFs, one original PDF and one DOCX, with fixtures selected for P22-06 through P22-09. Follow up on single-page PDF, JPG and PNG coverage and verify the text layer of TEST-003 before the dependent checks.

## Day 2 · Scaffold React and prepare document input

- [x] P22-03 · React and Playwright scaffold
  - Approved on 2026-11-21 and verified locally at 10:39 EET. Exact approval time and active review time were not measured.
  - The initial Docker run built the empty mount and all four tests failed with “element(s) not found”. After mounting React, all four viewport/theme combinations passed with the original assertions. Inspected all four screenshots. Compose validation, the production build, PHPUnit (3 tests, 6 assertions) and Ledger lint passed.
  - The frontend GitHub Actions job uses the verified local command. The [first hosted frontend run](https://github.com/alessia263456/digital-archive-ocr/actions/runs/44886763178) passed on the feature branch. PHPUnit and Ledger lint integration in CI remain a follow-up.
- [x] P22-06a · Rasterize PDF, JPG and PNG
  - [Approved plan](p22-06a-rasterize-pdf-jpg-and-png.md). Local implementation and backend verification ran from approximately 11:20 to 11:28 EET on 2026-11-21. Exact approval time and owner review duration were not measured.
  - The first 16 PHPUnit cases failed with the missing renderer. The complete backend suite passed with 20 tests and 77 assertions, including a late-truncated PNG regression. Concurrent publishers, timeout cleanup, file-content validation and numeric order through page 12 were verified. Backend image build, Composer platform checks, Compose configuration, React production build, Romanian OCR smoke and Ledger lint passed.
  - Internal budgets per conversion are 60 seconds, 32 MiB input, 64 pages, 180 million cumulative pixels and 128 MiB staged PNGs. Each child has a 512 MiB address-space ceiling. The test container saw 3,933,856 KiB of system RAM. Single-page fixtures took 46–75 ms and produced 1,315–61,920 bytes. The 12-page synthetic PDF took 549 ms. These are local fixture measurements. P22-06b covers representative geometry.
- [x] P22-06b · Verify multipage and rotated geometry
  - [Approved plan](p22-06b-verify-multipage-and-rotated-geometry.md). The PHPUnit fixture verified page order, displayed dimensions and all four rectangle edges on upright and quarter-turned pages.
  - Local TEST-001 acceptance passed at 300 dpi. Pages 1 and 2 each measured 2481 × 3509 pixels in both the application and MuPDF. The four edges of the selected ink region on each page agreed within one pixel. Full PHPUnit passed with 21 tests and 98 assertions.
- [x] P22-07 · Convert DOCX and preserve the original
  - [Approved plan](p22-07-convert-docx-and-preserve-original.md). The real Writer integration produced two PDF pages with the expected Romanian markers in order. The renderer returned pages 1 and 2. The preserved DOCX matched its pre-conversion SHA-256.
  - Eight DOCX cases passed with 43 assertions, including invalid input, timeout, missing output, retry and concurrent publication. The full Docker PHPUnit suite passed with 29 tests and 141 assertions. Backend image build, frontend production build and Ledger lint passed.
- [x] P22-54a · Prepare the live skeleton configuration
  - [Approved plan](p22-54a-live-skeleton-configuration.md) and [operator procedure](../../../docker/live/README.md). Verified locally on 2026-11-21. Both Compose configuration tests passed. Missing runtime inputs and a missing Caddy auth import failed validation as expected.
  - The PHP 8.4.28 image passed package discovery and Composer platform checks. The HTTP probe confirmed FrankenPHP classic mode, non-root execution, required extensions and GD codecs. A synthetic render initially returned HTTP 500 because `PHP_BINARY` was empty in the web runtime. Using the installed PHP CLI produced the expected 2 × 3 image through the same HTTP request.
  - Anonymous and invalid credentials received 401 on frontend, asset, health and API paths. Authenticated requests served React, its asset, Laravel health and JSON 404s. The backend probe received the query string and no hosting credential. Migrations survived service recreation. The separate OCR smoke produced five valid word Bounding Boxes.
  - On disposable infrastructure the certificate fingerprint matched before cutover, after cutover and after rollback to the authenticated placeholder. The public Azure endpoint returned HTTP 308 and trusted HTTPS 401 with a Basic challenge on a read-only check. Live deployment belongs to P22-56b.
  - PHPUnit passed on the development and FrankenPHP images (29 tests, 141 assertions each). The React production build, four Playwright viewport/theme checks and Ledger lint passed.

## Day 3 · Deploy the skeleton and prove permanent Redaction

- [x] P22-08 · Persist OCR text and TSV
  - Approved 2026-11-21 and verified by 16:23 EET. Reloaded Romanian OCR word boxes on both pages of TEST-002 and TEST-004. PHPUnit exercised second-page failure, rollback and retry.
- [x] P22-09a · Burn Bounding Boxes into a new PDF
  - Approved 2026-11-21 and verified by 16:23 EET. Burned persisted boxes on both pages of TEST-002. Verified black pixels in the rendered derivative and the original SHA-256.
- [x] P22-09b · Verify no residual PDF text
  - Approved 2026-11-21 and verified by 16:23 EET. Verified extractable target words on both pages of TEST-003 before Redaction. Its derivative had black pixels at both targets and yielded only whitespace to pdftotext. The rotated synthetic PDF passed all four pixel-edge checks. Full worker PHPUnit passed (37 tests, 175 assertions), along with Romanian OCR smoke, Compose validation, React build, four Playwright checks and ledger lint. [Approved plan](p22-08-09-ocr-persistence-and-permanent-redaction.md)
- [x] P22-11 · Private object storage and Signed URLs
  - The implementation is present in commit `821d83f`: private `documents` disk with local and S3-compatible R2 configurations, encrypted URL-safe tokens, expiring Laravel signed delivery, streaming security headers, and `storage:r2-smoke`.
  - Focused PHPUnit verification passed: `docker compose run --rm backend vendor/bin/phpunit --filter DocumentStorageTest` (12 tests, 35 assertions). The live R2 smoke command is implemented but could not run its object cycle because R2 credentials are not configured in this environment.
  - Full PHPUnit passed in an isolated Compose project with a fresh disposable PostgreSQL volume and generated local-only credentials (49 tests, 198 assertions; 2 skipped). The existing `proiect1_pgdata` volume was left untouched. The two earlier environment errors were resolved by supplying `APP_KEY` and `DB_PASSWORD` to the fresh stack.
  - P22-56b local Caddy/FrankenPHP integration passed with a synthetic private-disk fixture: signed delivery returned HTTP 200 with the expected bytes and `X-Content-Type-Options: nosniff`; expired and query-tampered URLs each returned HTTP 403. This local check does not replace the required live R2 round-trip and public HTTPS verification.
  - P22-56b adds a host-side HTTPS probe for live valid, expired and tampered Signed URL delivery through Caddy/FrankenPHP. The R2 smoke command now reports success without printing its generated URL; a PHPUnit regression test covers this behavior.
  - The real R2 write/read/delete cycle passed on the VM on 2026-11-22. The owner reports that the live `docker/live/tests/signed-delivery-smoke.sh` probe passed on Azure: valid delivery, expired and tampered URL rejection, response checks, and synthetic object cleanup all succeeded. No Signed URLs or credentials were recorded.
  - Backend proxy-trust fix deployed on 2026-11-22 as revision `f089e2c43f1c287450076e56ffc966296d71822b`; live Docker subnet `172.19.0.0/16` is inside the configured `172.16.0.0/12`. Backend-only rebuild/recreation passed and backend health is healthy. Together with the real R2 cycle, the owner-reported live Signed URL probe completes P22-11 acceptance.
- [x] P22-56b · Deploy the live skeleton
  - Created `feat/p22-56b-live-skeleton` from the fetched `feat/p22-11-signed-storage` branch. The approved P22-56b plan is [p22-56b-live-skeleton-deployment.md](p22-56b-live-skeleton-deployment.md); the P22-54a operator procedure governs deployment preparation.
  - Added required R2 environment passthrough to the live backend Compose service: `DOCUMENTS_DISK=r2`, access key, secret, bucket, endpoint, region (`auto`) and path-style setting (`false`). The live README documents private provisioning and the EU endpoint shape; no secret values are recorded.
  - `python3 docker/live/test_config.py` passed (3 tests), including missing-input rejection, R2 defaults and probe shell syntax. `bash -n docker/live/tests/signed-delivery-smoke.sh` passed. `python3 docs/agents/tools/ledger-lint.py` and `git diff --check` passed.
  - Docker PHPUnit passed in a fresh isolated Compose project with disposable local credentials and PostgreSQL volume (49 tests, 198 assertions; 2 skipped). An initial run against the existing development stack failed because the backend service received no database password (`fe_sendauth: no password supplied`); root Compose now passes through `DB_PASSWORD`, and the isolated rerun passed.
  - Local Caddy/FrankenPHP signed delivery integration passed: HTTP 200 synthetic payload, expired URL HTTP 403, tampered query HTTP 403. Romanian OCR smoke passed with five valid word Bounding Boxes. Playwright passed all four desktop/mobile light/dark projects.
  - Owner authorized the skeleton cutover by confirming the P22-56b plan on 2026-11-22. Live verification remains pending: use the rotated R2 credential and persistent `APP_KEY` / `DB_PASSWORD` from the private VM environment; run migrations, Romanian OCR and `storage:r2-smoke`; then verify public health, database, authenticated frontend/API, certificate continuity and signed delivery success/expiry/tampering through live Caddy/FrankenPHP. Do not change DNS or firewall rules as part of this task.
  - At that time, Docker API errors prevented the focused PHPUnit regression test from starting. Host PHP is unavailable. Live VM access was not established; migration, OCR/R2 cycle, public acceptance and rollback remained pending.
  - Follow-up on 2026-11-22: all three Compose/probe configuration checks, Ledger lint and whitespace checks passed. External HTTP returned 308 to the expected HTTPS URL. Trusted HTTPS returned 401 with the Basic challenge. The VM answered SSH but rejected the project identity for azureuser (Permission denied (publickey)). Local Docker CLI exited with SIGBUS and a direct daemon ping timed out after 8 seconds. The post-change focused PHPUnit command exited 0. The full PHPUnit command exited 0 with disposable local credentials, although PHPUnit emitted no test summary in this environment. Real R2 and authenticated live verification remain pending. Corrected the probe executable bit for its documented invocation.
  - Follow-up on 2026-11-22: SSH verified with the owner-supplied `~/.ssh/arhiva-azure.pem` identity as `azureuser`; noninteractive sudo works. Read-only VM inspection found only `archive-placeholder-caddy-1` running from `/opt/archive-placeholder/compose.yaml`, owning ports 80 and 443. No live application checkout or recognized private environment file was present at the inspected paths. The placeholder remains the active service. The authorized run did not include deploying/switching infrastructure, so no live R2 object cycle or application Signed URL 200/403/403 checks were run. Owner action is to authorize/provide the live application checkout and deployment window/runtime provisioning before those checks can proceed.
  - Follow-up on 2026-11-22: provisioned `/opt/archive-live/docker/live/.env` on the VM with mode 0600 and owner `azureuser:azureuser`. Generated a persistent production `APP_KEY` and `DB_PASSWORD` because the target file did not exist. Confirmed Compose reads `.env` from the `docker/live` working directory and references `DB_PASSWORD` for both Laravel and PostgreSQL. R2 credential, bucket and endpoint fields are blank pending owner entry. The file is ignored by `.gitignore`. No containers were started and the public listener was not changed.
  - Pre-cutover VM verification on 2026-11-22: all required `.env` keys were present and nonempty with mode 0600. The approved revision `471c3a8` was checked out at `/opt/archive-live`; the private environment file remained ignored and intact. Compose config validation passed. Caddy and FrankenPHP images built and both configurations validated. The backend build initially failed because `backend/resources/` is absent from the repository while `backend.Dockerfile` unconditionally copies it. Supplying an empty directory temporarily allowed the backend/OCR builds and validation to pass; the temporary directory was removed afterward. PostgreSQL became healthy, four additive migrations ran and migration status passed. Romanian OCR smoke passed with five valid word Bounding Boxes. `storage:r2-smoke` passed its R2 write/read/delete cycle; output was captured privately and only pass/fail was reported. The placeholder remained running on ports 80/443 throughout. No live Caddy listener was started.
  - Build-blocker fix on 2026-11-22: `docker/live/backend.Dockerfile` no longer copies the absent `backend/resources/` directory. The directory has no tracked files and backend code does not reference Laravel resources/views. Built the live backend target successfully from a `git archive` clean checkout context with `backend/resources/` absent. `python3 docker/live/test_config.py` (3 tests), `bash -n docker/live/tests/signed-delivery-smoke.sh`, Ledger lint and `git diff --check` passed.
  - Cutover and live checks on 2026-11-22: transferred commit `dd3c255ef24a48adbd20c93dbc0fe55da96a7965` by private Git bundle and verified the VM checkout hash. Production Compose config validation, clean backend/Caddy/OCR image builds, and Caddy/FrankenPHP config validation passed. Pre-cutover confirmed placeholder rollback Caddy, TLS volume `archive-placeholder_tls_data`, root-owned mode-0600 auth file, and active PostgreSQL volume `archive-live_pgdata`; rollback `start caddy` Compose dry-run succeeded. Additive migrations/status passed. After authorized cutover, live Caddy, backend and PostgreSQL are healthy. HTTP returned 308. HTTPS remained trusted and the SHA-256 certificate fingerprint matched the pre-cutover fingerprint. Anonymous frontend, health and API requests returned 401. Internal Laravel health passed and an unknown JSON API path returned 404. Romanian OCR smoke passed with five valid word Bounding Boxes. The private R2 object write/read/delete smoke passed. Live Caddy uses the existing TLS volume and auth file mount read-only. The placeholder container is stopped and remains available for the documented rollback. The valid/expired/tampered Signed URL probe and authenticated frontend/API success checks remain unrun because the `preview` Basic Auth password is not available to this session. No Signed URL or secret values were recorded.
  - P22-11 acceptance passed after the owner's reported live Signed URL smoke success. The owner reports authenticated Azure results of frontend HTTP 200, health HTTP 200, and API fallback HTTP 404. The authenticated React UI rendered in Chrome; `index-DOxFgDtR.js` and `index-DV9xApkK.css` each returned HTTP 200. The main HTML document returned HTTP 304, consistent with a valid cached response.
  - 2026-11-22 Signed URL 403 investigation: Laravel's `TrustProxies` middleware had no trusted proxy configuration, so it ignored Caddy's forwarded HTTPS host/scheme and absolute signature verification reconstructed the request as HTTP. Expiry was not the cause. `backend/bootstrap/app.php` now trusts forwarded headers only from the Docker private bridge range (`172.16.0.0/12`); the backend has no published host port. Regression coverage in `DocumentStorageTest` passed for HTTPS forwarded delivery (200), expired URL (403), tampered signature (403), tampered forwarded host (403), and spoofed forwarded headers from an untrusted peer (403). Focused group: 8 tests / 33 assertions passed. Full PHPUnit: 53 tests / 213 assertions passed, 2 skipped. `docker/live/test_config.py`, ledger lint and `git diff --check` passed.
  - Authorized deployment on 2026-11-22: private bundle transferred and VM checkout verified at `f089e2c43f1c287450076e56ffc966296d71822b`; Docker subnet `172.19.0.0/16` matched the trusted range. Production `.env` remained present with mode 0600 and required variables; values were not printed. Rebuilt and force-recreated only the backend service; backend became healthy, while Caddy container `b6b83a6f8778` and PostgreSQL container `2aef4150cc89` remained unchanged. Placeholder Caddy remains stopped but available, TLS volume `archive-placeholder_tls_data` remains present, and auth file remains root-owned mode 0600. HTTP returned 308; verified HTTPS returned anonymous 401 on `/`, `/up`, and `/api/missing`; current certificate fingerprint is `EA:FD:1A:66:A3:D4:D1:CB:E5:36:00:C2:62:A4:D3:25:77:4A:0C:44:14:F4:91:F5:AE:7E:ED:5E:AF:04:59:9A`. The owner subsequently reported all live Signed URL smoke checks passed and authenticated Azure results `frontend=200`, `health=200`, `api=404`; Chrome confirmed React render, JavaScript and CSS asset HTTP 200, and main HTML HTTP 304 (valid cache). P22-11 and P22-56b acceptance criteria passed; no rollback was needed.
- [x] P22-10a · Design DS-003
  - The owner approved the intake mock, including its processing and draft handoffs. [Plan](p22-10a-design-ds-003.md) · approval commit `d41f747`.
- [x] P22-10b · Design DS-004
  - The owner approved the review and quarantine mock with counted tabs on 2026-11-22. All 20 Playwright checks passed across desktop and mobile in both themes. [Plan](p22-10b-design-ds-004.md) · approval commit `5672dc0`.
- [x] P22-10c · Design DS-011
  - The owner approved the revised DS-011 mock. [Plan](p22-10c-design-ds-011.md) · approval commit `00bca07`.

## Day 4 · Run batches without blocking the worker

- [x] P22-12a · Private draft intake and status
  - Approved in chat on 2026-11-23. Added authenticated PDF/DOCX intake, ordered image-collection intake, per-item batch results, private original and derived-object storage, and persisted draft status. PHPUnit passed in an isolated Compose project with a fresh PostgreSQL volume and generated local-only credentials (68 tests, 357 assertions, 2 skipped). The backend image build passed. The standard project database volume was not used for test writes.
- [x] P22-13a · Worker job and backoff
  - Implemented database-queue OCR jobs with four total attempts, Laravel default retry timing, linked ordered extraction output, and persisted `processing`, `failed`, `review_ready`, and `quarantined` states. Final quarantine stores a Romanian in-app notification for each `arhivar`; P22-15 adds retry/permanent-failure actions and P22-48 provides the panel. PHPUnit passed in the isolated P22-13a Compose project (73 tests, 401 assertions). Focused draft/OCR tests passed (11 tests, 81 assertions); Romanian OCR smoke passed with five valid Bounding Boxes. Backend/OCR worker image build, React production build, Compose validation, Ledger lint, and `git diff --check` passed. The default project database was not used for test writes.
- [x] P22-18 · Part 1 account and Physical Dossier tables
  - The existing PostgreSQL database had the scaffold migrations applied and zero account rows, so implementation uses an additive migration that preserves existing data. `users` now requires a unique username, password, and one of the approved roles; `physical_dossiers` has a stable primary key and exact printed-number text. Focused PHPUnit passed (4 tests, 24 assertions); the full backend suite passed (57 tests, 237 assertions, 2 skipped) on a fresh disposable PostgreSQL volume. A fresh migration and seeder smoke passed. Backend image build, Ledger lint, and `git diff --check` passed. The existing development database volume was not used for test writes.
- [x] P22-25 · Username/password authentication and roles
  - Implemented Sanctum bearer login/logout, 12-hour token expiry, five failed attempts per normalized username/IP per minute, and reusable role middleware. C-002 response shape is `{id, username, role}` with no name/email. PHPUnit exercised the role matrix through test-only routes. Focused auth suite passed (7 tests, 83 assertions); full backend suite passed on an isolated disposable PostgreSQL database (64 tests, 320 assertions; 2 skipped). Backend image build, Ledger lint, and `git diff --check` passed. No frontend UI or production data was touched. [Plan](p22-25-username-password-authentication-and-roles.md)

## Day 5 · Produce safe reader data

- [x] P22-12b · Resume and isolate drafts
  - Verified that `admin` and `arhivar` can resume any draft and receive only its stable ID and current status; anonymous and `cititor` requests are denied, and missing drafts return the Romanian 404 response. Focused PHPUnit passed (5 tests, 46 assertions); full backend suite passed on a fresh isolated PostgreSQL volume (69 tests, 366 assertions, 2 skipped). Backend image build passed. Ledger lint and `git diff --check` passed.
- [x] P22-30b · Design DS-007
  - The Screen mock is [docs/design/mocks/DS-007.html](../../design/mocks/DS-007.html); [registry.yaml](../../design/registry.yaml) records `status: approved`. Approval is recorded by commit `34c1ed4` (2026-11-24). Preserve the approved five-section scope; P22-48 covers implementation and is still pending.

## M1a · First usable, secure workflow · target Nov 24–25

- [x] P22-20a · Design DS-010
  - Owner approved the repository mock for implementation on 2026-11-24. Implementation is covered by the approved [M1a.1 plan](p22-m1a-1-login-and-application-foundation.md).
- [x] P22-20b · Design DS-001
  - Owner approved the repository mock for implementation on 2026-11-24. Implementation is covered by the approved [M1a.1 plan](p22-m1a-1-login-and-application-foundation.md).
- [x] P22-35 · DS-010 login
  - Implementation and automated verification completed on 2026-11-24 with same-origin Vite/Sanctum session auth, Romanian login and expiry states, logout, protected-route enforcement and safe local admin provisioning. PHPUnit passed (82 tests, 471 assertions, 3 skipped); standard Playwright passed (28 tests) in desktop/mobile light/dark; the real-API proxy test passed in all four projects. DS-010 screenshots and DS-001's initial copy-only empty state are recorded in `docs/design/screens/`. Owner manually verified valid and invalid credentials, session persistence, logout, protected page access, and both Screens' appearance on 2026-11-24.
- [ ] P22-36a · Enforce append-only audit events
  - The real M1a.4 browser run observed `ocr_results_viewed` and `preview_issued` rows in the isolated database. Current tests confirm event insertion, but the schema has no update/delete guard and the tests do not demonstrate append-only enforcement.
  - Remaining: prepare a separately approved implementation plan for database-level protection against updating or deleting audit rows, then add tests proving both operations are rejected. Select the enforcement mechanism in that plan. Complete this before M3's Append-Only Audit Log integrity verification; the roadmap does not assign a start date.

M1a also begins these later-completion tasks: P22-23 (single-document upload slice; completes M1b), P22-34 (DS-001 default home/empty state; completes M3), and P22-38 (audited staff-only draft preview; completes M3).

M1a is split into separately planned and verified parts: M1a.1 Login and application foundation (implementation, automated checks, and owner review complete), M1a.2 Upload and OCR processing (implementation, automated verification, and owner confirmation complete), M1a.3 Protected OCR results and preview, and M1a.4 Integration and milestone verification (implementation, checks, and owner acceptance complete). See the [M1a.1 plan](p22-m1a-1-login-and-application-foundation.md) and the [M1a.2 plan](p22-m1a-2-upload-and-ocr-processing.md). The approved browser auth policy uses server-side sessions with a 30-minute inactivity timeout and a 12-hour maximum; M1a.2 uses explicit status refresh rather than background polling.

- [x] M1a.3 · Protected OCR results and preview
  - `admin` and `arhivar` can retrieve persisted OCR text, word confidence and Bounding Boxes, and request audited five-minute inline preview URLs for PDF, derived DOCX PDF, and ordered image pages. `cititor` and anonymous callers are denied. The DS-003 current-session flow displays read-only results, keeps preview URLs internal, and renews through the authenticated session API.
  - Full PHPUnit passed (89 tests, 530 assertions, 3 skipped). Frontend production build and Playwright passed (64 tests, 4 skipped) across desktop/mobile light/dark, including session expiry, preview renewal, long OCR text, and 320px overflow. Inspected screenshots are saved under `docs/design/screens/DS-003.ocr-results.*`.
  - Ledger lint and `git diff --check` passed. On 2026-11-25, the owner confirmed a local 285 KB PDF reached `review_ready` and displayed extracted text, confidence details, and the PDF preview. The check exposed a stale backend container; rebuilding the backend and worker and applying the access-event migration restored the protected OCR route.

- [x] M1a.4 · Integration and milestone verification
  - Added pull-request triggers to the existing frontend build and Playwright workflow and added an opt-in real-API Playwright test for login, image upload, explicit persisted-status refresh, OCR text/confidence/Bounding Boxes, and successful preview delivery. The synthetic fixture is mounted read-only into the existing frontend test service.
  - On 2026-11-25, the full workflow passed in one desktop-light browser project against an isolated Compose project and database. The Screen displayed “Știință și cultură în România”, 85% average confidence, five Bounding Boxes, and the image preview; database inspection found `ocr_results_viewed` and `preview_issued` events. Provisioning succeeded through the interactive command, and staged prompt entry confirmed the password was not echoed. Recent isolated backend/worker logs had no synthetic username, OCR text, password, XSRF, or session marker matches. No local proxy service is part of this isolated Compose stack.
  - The first isolated attempt exposed two rehearsal setup details, corrected in the documented procedure: use `DOCUMENTS_DISK=documents` so backend and worker share the mounted document volume, and set its initial ownership to `www-data`. Screenshots for DS-001, DS-003 upload/results, and DS-011 were inspected in light/dark desktop/mobile samples; no Screen change or recapture was needed. The existing architecture description already matches the protected OCR and preview implementation.
  - Full PHPUnit passed (89 tests, 530 assertions, 3 skipped). The frontend production build and Playwright matrix passed (64 passed, 8 skipped); the opt-in real-API test passed separately (1 passed). Ledger lint and `git diff --check` passed.
  - P22-36a remains open because current coverage proves event insertion and ordering before URL creation, but not that database event rows cannot be updated or deleted. The owner confirmed acceptance of the real browser workflow on 2026-11-25.

## M1b · Intake, batch and quarantine · target Nov 25–26

- [ ] P22-49b · Finish the corpus inventory — owner task, proceeds in parallel
- [x] P22-14 · Exact SHA-256 duplicate detection
  - Persisted SHA-256 for PDF/DOCX bytes and deterministic ordered image-collection digests with per-page digests; duplicate checker reports exact and reordered image matches. Save-time enforcement remains P22-21 scope because the official-save/version store is not implemented.
- [x] P22-13b · Prove corrupt-then-valid flow
  - On 2026-11-25, the opt-in browser check passed against an isolated disposable PostgreSQL database and real OCR queue worker: a synthetic malformed PDF reached `quarantined` after the initial attempt plus three retries, while its valid Romanian image sibling reached `review_ready`; both appeared in the protected DS-004 queue. The dedicated Compose project and volumes were removed afterward.
- [x] P22-15 · Notifications and quarantine actions
  - Preserved existing per-Arhivar failure notifications; added protected review/quarantine queue, retry and confirmed permanent-failure actions with actor/draft/time audit events. Permanent failure retains the draft and private objects but removes it from active queues. DS-004 hands review-ready drafts to protected OCR results until DS-011 exists; notification panel remains P22-48 scope.
- [x] P22-23 · DS-003 upload
  - DS-003 supports batch PDF/DOCX intake with independent results, one ordered JPG/PNG collection with page controls, and staff-only recovery of up to 50 persisted drafts. The Screen refreshes status on request and reopens protected read-only OCR results for review-ready drafts. [M1b plan](p22-m1b-batch-intake-completion.md)
  - The frontend production build and Playwright passed across desktop and mobile in both themes (100 passed, 20 opt-in cases skipped in the default run). Browser checks covered indexed batch outcomes, partial request errors, image ordering and undo, legacy filenames, reload recovery, and manual status refresh. Inspected DS-003 screenshots are in `docs/design/screens/`, including 320px and 1600px captures.
  - The isolated desktop-light browser run passed all three checks against PostgreSQL and the real OCR worker. Two valid PDFs persisted through reload and reached review-ready alongside a rejected DOCX. A malformed PDF reached quarantine while its valid image sibling reached review-ready. A 21-part request exercised PHP’s file limit. Document intake returned HTTP 422 with known outcomes, and image intake returned HTTP 422 with no draft.
  - The transport regression first returned HTTP 200 with an HTML parser warning prepended to the response. The local backend now logs the warning and Laravel returns JSON. The host Chromium run reported a missing `libnspr4.so` and was rerun in Compose. An intermediate browser run found duplicate text matching «Încărcarea nu a reușit» in four projects. The form now shows distinct batch guidance and item errors. Existing assertions were preserved.
  - Backend PHPUnit reported 102 tests, 614 assertions, and 3 OCR-only skips. The isolated worker image passed all 3 skipped tests with 16 assertions. Ledger lint and `git diff --check` passed.
  - M1b acceptance still depends on the P22-21 official-save duplicate guard in M2. The owner-led P22-49b Document Corpus inventory remains open.

## M2 · Safe review and immutable publication · target Nov 27–28

- [x] P22-16 · CNP and IBAN confidence rules
  - Added configurable 80/100 confidence, same-line 3-word and next-line/same-block 5-word anchor limits; retained OCR block/paragraph/line/word positions. Valid CNP and ISO 7064 MOD-97 IBAN candidates redact only when checksum, unique preceding type-specific anchor and confidence all pass; uncertain, invalid, low-confidence and ambiguous matches go to review.
- [x] P22-17a · Detect names and contact data
  - Added conservative Romanian label matching for Signatory Party names, phone numbers and email addresses. Names and contact details route to review; Notary Public references are exempt.
- [x] P22-17b · Flag other sensitive regions
  - Added conservative Romanian labels for addresses, identity-card details, cadastral and vehicle identifiers, and CUI/CIF. A Signatory Party signature label yields a review cue only; staff must draw a Bounding Box around handwriting in the later manual review workflow. Candidates carry category, disposition, page, minimum OCR confidence and geometry only; no matched value is copied or logged.
  - Full backend PHPUnit passed after the CNP review-cue change (116 tests, 669 assertions, 3 OCR-only skips). A follow-up synthetic corrected-OCR TSV check passed (2 focused tests, 14 assertions). The earlier read-only raw-OCR corpus pass processed 17 supported synthetic test references across 41 pages with no processing failures; one `.doc` source was skipped because the Application supports DOCX, not DOC. The corpus folder is excluded by this checkout’s local Git settings, and reports contain category counts only.
  - A CNP anchor followed within the configured anchor distance by adjacent OCR digit tokens containing at least 10 digits produces a review-only CNP cue when the digits do not form a valid 13-digit CNP. Its Bounding Boxes cover only the digit tokens; the candidate carries no matched text. A valid 13-digit CNP retains the existing checksum, anchor and confidence routing.
  - PII detection runs in DS-011 after inline OCR correction, using the corrected OCR words and their Bounding Boxes for candidate review and any subsequent Redaction. Upload remains OCR extraction only. This sequence was confirmed by the owner on 2026-11-26.
  - The earlier raw-OCR corpus pass processed 17 supported synthetic references across 41 pages; one `.doc` was skipped. TEST-001 through TEST-010 had CNP labels and nearby digit-heavy text but no assembled 13-digit sequence; TEST-013 had one automatic CNP candidate. This is diagnostic raw-OCR data only, not corrected-text coverage validation. Six IBAN candidates were detected and routed to review; three had confidence at or above 80. P22-16/17 are complete within detector-rules scope; corrected-corpus coverage validation belongs to P22-24/DS-011 after OCR correction.
- [ ] P22-21a · Generate reviewed Redaction PDF
- [ ] P22-21b · Generate safe reader projections
- [ ] P22-19 · Part 1 Notarial Nomenclature import
- [ ] P22-22 · Metadata suggestions and classification
- [ ] P22-24a · Build DS-011 OCR editing
- [ ] P22-24b · Build DS-011 candidate review
- [ ] P22-26 · Retention calculation and validation
- [ ] P22-27a · Draw and preview manual Redaction
- [ ] P22-27b · Capture metadata and review confirmation
- [ ] P22-28a · Implement immutable version publication
- [ ] P22-28b · Wire Editor publication and verify
- [ ] P22-29 · Possible duplicates
- [ ] P22-45 · DS-004 review and quarantine queues — completion after Editor navigation is integrated

## M3 · Search, permissions and document viewing · target Nov 28–29

- [ ] P22-31 · Folder Permission policy
- [ ] P22-32 · PostgreSQL Romanian search index
- [ ] P22-33 · Browse and search API
- [ ] P22-34 · DS-001 search and browse
  - M1a.1 implements only the authenticated default home and the confirmed copy-only empty state. Search and browse remain pending.
- [ ] P22-36b · Verify audit integrity
- [ ] P22-37 · Metadata edits and dossier reassignment
- [ ] P22-38 · Authorized viewer and export access
- [ ] P22-39 · DS-002 viewer and Document Version history

## M4 · Staff operations, sharing and retention · target Nov 29–Dec 1

- [ ] P22-20c · Design DS-006
  - Draft mock exists at [docs/design/mocks/DS-006.html](../../design/mocks/DS-006.html); registry status is `draft`. Owner approval is still required before implementation.
- [ ] P22-30a · Design DS-005
  - Draft mock exists at [docs/design/mocks/DS-005.html](../../design/mocks/DS-005.html); registry status is `draft`. Owner approval is still required before implementation.
- [ ] P22-30c · Design DS-008
  - No DS-008 mock exists yet. Owner approval is required before implementation.
- [ ] P22-30d · Review DS-009 mock
  - Draft mock exists at [docs/design/mocks/DS-009.html](../../design/mocks/DS-009.html), but [DESIGN.md](../../design/DESIGN.md#pending-mock-revisions) records the missing incorrect-password state. Review and owner approval remain pending.
- [ ] Design and build DS-012 for Nomenclature browsing and CSV revisions
- [ ] P22-40a · Implement account, dossier and permission Admin APIs
- [ ] P22-40b · Build DS-006 Admin forms
- [ ] P22-41a · Issue and revoke version-pinned Share Links
- [ ] P22-41b · Enforce Share Link access on PDF delivery
- [ ] P22-43 · Audit Share Link lifecycle and use
- [ ] P22-42a · Build DS-002 sharing controls
- [ ] P22-42b · Build DS-009 recipient Screen
- [ ] P22-44 · DS-008 Audit Log
- [ ] P22-46a · Remove destroyed versions and retain audit evidence
- [ ] P22-46b · Verify destruction recovery and invalidation
- [ ] P22-47 · DS-005 Destruction List and extension
- [ ] P22-48 · DS-007 Statistici and in-Application notification panel

## M5 · Integration and polish · target Dec 1

- [ ] P22-50 · Prove five visual Redactions
- [ ] P22-51 · Measure corpus relevance and privacy
- [ ] P22-52a · Verify intake, review and archive Screens
- [ ] P22-52b · Verify operational and recipient Screens
- [ ] P22-53 · Debug release-blocking integration failures
- [ ] P22-54b · Verify release deployment and rollback
- [ ] P22-55 · Release test matrix
- [ ] P22-56c · Promote the checked build — requires separate explicit deployment authorization
- [ ] P22-57 · Technical documentation — update progressively; final accuracy/fresh-start check in M5

## Dec 2–4 · Live acceptance and submission

- [ ] P22-58 · Process first 15 documents live
- [ ] P22-59 · Process remaining 15 documents live
- [ ] P22-60 · Five Secretar Notarial acceptance searches
- [ ] P22-61 · Assemble university evidence
- [ ] P22-62 · Contingency fix or live rerun
- [ ] P22-63 · Final release and documentation verification
- [ ] P22-64 · Prepare defense walkthrough
- [ ] P22-65 · Rehearse the defense
- [ ] P22-66 · Final submission and defense reserve

## Integration and verification notes

- M1a adds the protected draft/review detail and queue endpoints needed to return persisted OCR pages, text, confidence and Bounding Boxes. Existing `GET /api/drafts/{id}` currently returns only ID/status. It also adds authorized issuance of the expiring preview Signed URL and an access audit event before serving sensitive content.
- M1a defines safe initial live-admin provisioning without a committed/default production password and documents browser bearer-token handling within C-003. CI adds PHPUnit and Ledger lint in M1a; API examples and `AI_LOG.md` start in M1a; architecture and operational docs are updated alongside later schema changes.
- Every milestone has local browser testing with real APIs. Capture changed Screens in desktop/mobile and light/dark modes, use Design Tokens and Romanian copy, and cover required error/empty/loading/accessibility states. Screen implementation waits for that Screen's explicit approval.
- Incremental live checkpoints may be prepared after M1a/M1b, M3 and M5. Deploy only after separate explicit authorization; P22-56c promotion and removal of the host gate are never automatic.
- Keep D-001–D-042, C-001/C-003, all approved archive workflows and university requirements unchanged. Q-021 remains unanswered; do not implement an invented OCR-similarity threshold.
