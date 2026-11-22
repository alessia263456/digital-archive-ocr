# P22 · Task checklist

**Status:** Revised draft. Roadmap approval is pending. Each remaining task requires individual approval.

See the [14-day roadmap](p22-roadmap.md) for scope, dependencies, verification and daily outcomes.

Check off a task after verification. Record approval time, verification time, evidence and any blockers under the entry. Track your active review time separately from elapsed turnaround. Use Days 1–2 measurements and the Day 4 checkpoint to update the delivery forecast.

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
  - Of the 12 [registered Screens](../../design/registry.yaml), DS-002, DS-003 and DS-004 are approved. The following nine await approval.
    - DS-001 · Document list / Search results
    - DS-005 · Retention & Destruction list
    - DS-006 · Admin panel
    - DS-007 · Dashboard
    - DS-008 · Audit Log viewer
    - DS-009 · Public share link viewer
    - DS-010 · Login
    - DS-011 · Document Editor & Anonymization
    - DS-012 · Notarial Nomenclature
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
- [ ] P22-11 · Private object storage and Signed URLs
- [ ] P22-56b · Deploy the live skeleton
- [x] P22-10a · Design DS-003
  - The owner approved the intake mock, including its processing and draft handoffs. [Plan](p22-10a-design-ds-003.md) · approval commit `d41f747`.
- [x] P22-10b · Design DS-004
  - The owner approved the review and quarantine mock with counted tabs on 2026-11-22. All 20 Playwright checks passed across desktop and mobile in both themes. [Plan](p22-10b-design-ds-004.md) · approval commit `5672dc0`.
- [x] P22-10c · Design DS-011

## Day 4 · Run batches without blocking the worker

- [ ] P22-49b · Finish the corpus inventory
- [ ] P22-12a · Private draft intake and status
- [ ] P22-12b · Resume and isolate drafts
- [ ] P22-13a · Worker job and backoff
- [ ] P22-13b · Prove corrupt-then-valid flow
- [ ] P22-14 · Exact SHA-256 duplicate detection
- [ ] P22-15 · Notifications and quarantine actions
- [ ] P22-18 · Part 1 account and Physical Dossier tables

## Day 5 · Produce safe reader data

- [ ] P22-16 · CNP and IBAN confidence rules
- [ ] P22-17a · Detect names and contact data
- [ ] P22-17b · Flag other sensitive regions
- [ ] P22-21a · Generate reviewed Redaction PDF
- [ ] P22-21b · Generate safe reader projections
- [ ] P22-19 · Part 1 Notarial Nomenclature import
- [ ] P22-20a · Design DS-010
- [ ] P22-20b · Design DS-001
- [ ] P22-20c · Design DS-006

## Day 6 · Make intake and review usable

- [ ] P22-25 · Username/password authentication and roles
- [ ] P22-22 · Metadata suggestions and classification
- [ ] P22-23 · DS-003 upload
- [ ] P22-24a · Build DS-011 OCR editing
- [ ] P22-24b · Build DS-011 candidate review
- [ ] P22-26 · Retention calculation and validation
- [ ] P22-30a · Design DS-005
- [ ] P22-30b · Design DS-007
- [ ] Design and build DS-012 for Nomenclature browsing and CSV revisions
- [ ] P22-30c · Design DS-008
- [ ] P22-30d · Review DS-009 mock

## Day 7 · Approve immutable Document Versions

- [ ] P22-27a · Draw and preview manual Redaction
- [ ] P22-27b · Capture metadata and review confirmation
- [ ] P22-28a · Implement immutable version publication
- [ ] P22-28b · Wire Editor publication and verify
- [ ] P22-29 · Possible duplicates
- [ ] P22-31 · Folder Permission policy
- [ ] P22-32 · PostgreSQL Romanian search index

## Day 8 · Find documents and apply access rules

- [ ] P22-33 · Browse and search API
- [ ] P22-34 · DS-001 search and browse
- [ ] P22-35 · DS-010 login
- [ ] P22-36a · Write append-only audit events
- [ ] P22-36b · Verify audit integrity
- [ ] P22-38 · Authorized viewer and export access

## Day 9 · Complete internal access and Share Link services

- [ ] P22-37 · Metadata edits and dossier reassignment
- [ ] P22-39 · DS-002 viewer and Document Version history
- [ ] P22-40a · Implement account, dossier and permission Admin APIs
- [ ] P22-40b · Build DS-006 Admin forms
- [ ] P22-41a · Issue and revoke version-pinned Share Links
- [ ] P22-41b · Enforce Share Link access on PDF delivery
- [ ] P22-43 · Audit Share Link lifecycle and use

## Day 10 · Complete recipient, review and destruction workflows

- [ ] P22-42a · Build DS-002 sharing controls
- [ ] P22-42b · Build DS-009 recipient Screen
- [ ] P22-44 · DS-008 Audit Log
- [ ] P22-45 · DS-004 review and quarantine queues
- [ ] P22-46a · Remove destroyed versions and retain audit evidence
- [ ] P22-46b · Verify destruction recovery and invalidation

## Day 11 · Finish required Screens and exercise the corpus

- [ ] P22-47 · DS-005 Destruction List and extension
- [ ] P22-48 · DS-007 dashboard and notification panel
- [ ] P22-50 · Prove five visual Redactions
- [ ] P22-51 · Measure corpus relevance and privacy
- [ ] P22-52a · Verify intake, review and archive Screens
- [ ] P22-52b · Verify operational and recipient Screens

## Day 12 · Verify and promote the release

- [ ] P22-53 · Debug release-blocking integration failures
- [ ] P22-54b · Verify release deployment and rollback
- [ ] P22-55 · Release test matrix
- [ ] P22-56c · Promote the checked build
- [ ] P22-57 · Technical documentation

## Day 13 · Run university acceptance live

- [ ] P22-58 · Process first 15 documents live
- [ ] P22-59 · Process remaining 15 documents live
- [ ] P22-60 · Five Secretar Notarial acceptance searches
- [ ] P22-61 · Assemble university evidence

## Day 14 · Rerun, finalize and rehearse

- [ ] P22-62 · Contingency fix or live rerun
- [ ] P22-63 · Final release and documentation verification
- [ ] P22-64 · Prepare defense walkthrough
- [ ] P22-65 · Rehearse the defense
- [ ] P22-66 · Final submission and defense reserve
