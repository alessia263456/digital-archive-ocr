# P22 · 14-day development roadmap

**Status:** Revised draft for review. Roadmap approval is pending. Every task requires separate build approval. Live deployment requires explicit authorization.

Start by proving Romanian OCR Bounding Boxes can drive permanent Redaction. By the end of Day 3, a synthetic multi-page document should pass through the separate worker, produce Romanian OCR text and TSV, and yield a derived PDF whose covered content is absent from the rendered image and extractable text.

Budget **45–90 minutes per day of your active time** for task approvals and result review. Schedule separate blocks for Screen design decisions, live corpus review, the five searches with the Secretar Notarial, and defense practice. Codex handles implementation, tests, and debugging within each approved task.

**Elapsed delivery forecast:** Measure the time from approval to a verified result for P22-01, P22-02 and the document conversion tasks on Days 1–2. Record approval wait and external blockers separately so the forecast reflects the one-task-at-a-time workflow. On Day 4, use the measured turnaround, the corrupt-then-valid queue result and the time to review a representative early corpus batch to forecast the remaining work. Recheck on Day 7. Keep the daily outcomes as targets and flag any that the measurements put at risk.

**Calendar reserve:** Protect 14 hours across the integration and acceptance milestones below. This is schedule capacity for failures, fixes and retests.

## Progress through 2026-11-22

Day 1 and Day 2 tasks are complete. The local Laravel, PostgreSQL, Romanian OCR and React scaffolds are verified. The live milestone reached so far is the authenticated HTTPS placeholder (P22-56a). The live skeleton configuration and rollback were rehearsed under P22-54a.

On Day 3, P22-08 and P22-09a/b verified persisted Romanian OCR text and Bounding Boxes, permanent pixel Redaction and removal of covered PDF text. The owner approved DS-003 and DS-004, completing P22-10a/b. DS-002 was already approved, bringing the total to **3 of 12 approved Screens**. DS-009 has a draft mock. Screen implementation remains scheduled.

The first 10 Document Corpus entries are inventoried. The remaining inventory (P22-49b) and five live acceptance searches are pending. The remaining Day 3 tasks are private object storage and Signed URLs (P22-11), live skeleton deployment (P22-56b, after P22-11 and explicit deployment authorization), and the DS-011 Editor mock (P22-10c). Day 4 still includes the corrupt-then-valid queue proof used by the forecast checkpoint.

See the [task checklist](p22-task-checklist.md) for task-level evidence and the [Screen registry](../../design/registry.yaml) for current approvals.

Sources: [P22](../../brief.md), [repository instructions](../../../AGENTS.md), [vocabulary](../../../CONTEXT.md), [architecture](../ARCHITECTURE.md), [decisions](../DECISIONS.md), [archive workflows](../decisions/archive-workflows.md), [Part 1](part-1-archive-foundations.md), [design guardrails](../../design/DESIGN.md), [Screen registry](../../design/registry.yaml), [interview](../../../INTERVIEW.md), [corpus](../../../CORPUS.md), and [AI interaction journal](../../../AI_LOG.md).

## What you will code

1. **Docker and OCR.** Create the worker image and Compose services. In Laravel, write format conversion, Romanian OCR/TSV parsing, the queue job and the Redaction generator.
2. **Laravel and PostgreSQL.** Add migrations under `backend/database/migrations/` and models, services, jobs, policies and controllers under `backend/app/`. These cover drafts, review, approved versions, search, folder access, sharing, audit and retention.
3. **React.** Add routes and Components under `frontend/src/`. Start with batch upload and the Editor. Then connect the other approved Screens to their Laravel endpoints.
4. **Tests.** Add PHPUnit checks under `backend/tests/` and browser scenarios to the frontend Playwright suite. Use synthetic fixtures.

The **What to build or do** column tells you what to write or configure. The **Acceptance and verification** column tells you how to check it. Tasks marked as design, coordination, verification or delivery describe work outside the Application code. Paths are proposed where the scaffold does not exist yet.

## Working agreement

Use the [task checklist](p22-task-checklist.md) to track approval, progress, evidence and blockers. Work one task at a time. Confirm the task ID, affected files, dependencies and acceptance checks before authorizing its build. Use tests first where the suite exists. Report failed and skipped checks, with reasons, before closing a task. Record course-required AI use in the journal throughout development.

`P` means PHPUnit, `PW` means Playwright, and `I` means a container, database or live integration check. Dependencies use the numeric task ID and suffix where a task is split. Split tasks are separately approvable. Timeboxes are initial checkpoints for Codex work, including verification. Use observed elapsed time for scheduling and keep a passing test with its implementation in the same approval. If a task overruns, record progress and the remaining work before revising its forecast. Each Screen also requires owner confirmation of its checked-in mock. Implement Screens with approved Design Tokens and Romanian copy, covering applicable interaction and accessibility states. Compare Playwright desktop/mobile screenshots in light/dark against the mocks and update the registry. Timebox grouped design reviews and split them into individually approved tasks if needed.

## University acceptance and optional polish

- Process, review, approve and index all 30 test-data templates live. Verify Romanian relevance and Physical Dossier Number retrieval. The Secretar Notarial runs five live searches, with the results and timings in INTERVIEW.md and a successful result in under two seconds.
- Prove visual Redaction on at least five corpus documents covering CNP, IBAN and Signatory Party names. Check burned pixels, PDF extraction and reader search/metadata. Include checksum tests and explicit human review.
- Demonstrate backoff, quarantine after the initial failure and three failed retries, and continued valid processing in an automated corrupt-then-valid test.
- Verify dossier permissions, immutable/version-pinned access, Share Link password/expiry/revocation, retention and destruction. Demonstrate who accessed a document and the evidence retained after destruction for both staff roles.
- Complete the interview, corpus inventory, course AI journal and evidence checklist. Rehearse all three P22 defense questions and verify any separate submission instructions.

All agreed Screen functionality remains scheduled, including accessibility, required states, visual verification and the approved mocks. Optional polish includes extra animation, additional visual variants and cosmetic refinements beyond the design criteria. Consider it after acceptance passes.

## Day 1 · Start the stack and take delivery of the corpus

**Outcome:** Laravel connects to PostgreSQL, Tesseract emits Romanian TSV, and the intended live URL serves an authenticated “Hello World.” If host access or DNS is pending, continue local work and retry the placeholder on Day 2.

| Task | Depends on | Provisional task timebox | What to build or do | Acceptance and verification |
|---|---|---:|---|---|
| P22-01 · Container and Romanian OCR smoke | Task approval | 90m | Create a worker Dockerfile and Compose service. Install Tesseract and Romanian language data in that image. Add a synthetic PNG and a smoke command that checks its TSV output. | Minimal Docker backend/worker environment runs Tesseract with `ron`. **I:** A synthetic Romanian image produces expected diacritics and valid TSV word coordinates. |
| P22-02 · Laravel, PostgreSQL and PHPUnit scaffold | 01 | 90m | Scaffold Laravel under backend/. Add Laravel and PostgreSQL services to compose.yaml, PHPUnit database configuration and a migration smoke test. | Laravel boots against containerized PostgreSQL. **P/I:** Health check, fresh migration and PHPUnit smoke pass. |
| P22-04 · Corpus, live access and submission logistics | — | 60m | Coordination. Record the live target, corpus handoff, acceptance appointments and submission instructions. | Confirm template handoff, acceptance and rerun slots with the Secretar Notarial, live target and access, and course submission instructions. **Check:** Record owners, dates and blockers. |
| P22-56a · Deploy authenticated “Hello World” | 04 (host access), deployment authorization | 60m | Deploy a placeholder at the intended live URL behind temporary hosting-layer authentication. Run alongside the local setup as approvals allow. Retry on Day 2 if host access or DNS is pending. | I: HTTPS works, an unauthenticated browser is challenged, an authorized browser sees the placeholder, and a second deployment succeeds. |
| P22-05 · Confirm the Screen approval route | Q-013 | 45m | Record how the owner reviews each Screen before implementation. | Verify that the [review queue](p22-task-checklist.md#day-1--start-the-stack-and-take-delivery-of-the-corpus) accounts for all 12 registered Screens and reflects the current registry status. |
| P22-49a · Inventory first corpus batch | 04, template handoff | 60m | List the first templates in CORPUS.md. Identify representative formats, quality, handwriting and PII. | Check synthetic values and choose fixtures for 06–09. |

## Day 2 · Scaffold React and prepare document input

**Outcome:** Representative PDF/image/DOCX inputs produce ordered page images. The skeleton has a repeatable start procedure. Complete the placeholder deployment today if it was blocked on Day 1.

| Task | Depends on | Provisional task timebox | What to build or do | Acceptance and verification |
|---|---|---:|---|---|
| P22-03 · React and Playwright scaffold | — | 75m | Scaffold React under frontend/. Add a React root, theme entry point and Playwright desktop/mobile configuration. | React builds. **PW:** Scaffold smoke runs on desktop and mobile with both theme modes. |
| P22-06a · Rasterize PDF, JPG and PNG | 01–02 | 90m | Add page rendering with stable order and dimensions. | P/I: one-page PDF, JPG and PNG. |
| P22-06b · Verify multipage and rotated geometry | 06a, 49a (TEST-001) | 60m | Normalize orientation and validate coordinate mapping with representative inputs. | P/I: rotated and multipage fixtures produce matching page and pixel geometry. |
| P22-07 · Convert DOCX and preserve the original | 06 | 75m | Add a DOCX conversion service. Keep the original object key separate from the derived PDF key. | Preserve DOCX bytes and derive a PDF for OCR, viewing, Redaction and sharing. **I:** Multi-page conversion and original hash comparison. |
| P22-54a · Prepare the live skeleton configuration | 04, 01–03 | 75m | Prepare live Compose configuration, prerequisites and smoke/rollback commands. | I: validate Compose configuration and host reachability. |

## Day 3 · Deploy the skeleton and prove permanent Redaction

**Outcome:** The live frontend and API respond, PostgreSQL and the worker are reachable, and signed storage works. Covered content disappears from the rendered PDF and its extractable text.

| Task | Depends on | Provisional task timebox | What to build or do | Acceptance and verification |
|---|---|---:|---|---|
| P22-08 · Persist OCR text and TSV | 06b, 49a (TEST-002 and TEST-004) | 75m | Add a Tesseract runner and TSV parser. Persist text, confidence, page and Bounding Box for each word. | Record ordered Romanian OCR words and Bounding Boxes in the rendering coordinate system. **P/I:** Diacritics, page association and malformed TSV. |
| P22-09a · Burn Bounding Boxes into a new PDF | 08 | 90m | Apply solid black pixels and serialize a fresh PDF. | I: verify pixel positions and original digest. |
| P22-09b · Verify no residual PDF text | 09a | 75m | Exercise a text-layer PDF and rotated input and fix geometry or output issues. | I: covered text cannot be extracted, and coverage matches rendered pixels. |
| P22-11 · Private object storage and Signed URLs | 02 | 90m | Configure a private object-storage disk and add a service to issue authorized expiring delivery URLs. | Originals and derivatives are private and delivered through expiring Signed URLs. **I:** Anonymous access fails, authorized access succeeds, expiry is enforced. |
| P22-56b · Deploy the live skeleton | 03, 11, 54a, 56a, deployment authorization | 90m | Replace the placeholder with the frontend, API, PostgreSQL, worker environment and private storage. Keep temporary hosting-layer authentication during development. | I: live health, database, Romanian OCR smoke and signed storage. Full queue follows on Day 4. |
| P22-10a · Design DS-003 | 05 | 60m | Prepare intake mock and review drag/drop, drafts and status. | Owner confirms against guardrails. |
| P22-10b · Design DS-004 | 05 | 60m | Prepare queue mock covering empty, review and quarantine states. | Owner confirms against guardrails. |
| P22-10c · Design DS-011 | 05 | 90m | Prepare Editor mock covering corrections, manual Bounding Boxes, zero matches and final approval. | Owner confirms against guardrails. |

## Day 4 · Run batches without blocking the worker

**Outcome:** All 30 test documents are inventoried. The worker quarantines a corrupt item on failure four and processes the next valid item. Staff draft resume and quarantine actions work at the API level.

| Task | Depends on | Provisional task timebox | What to build or do | Acceptance and verification |
|---|---|---:|---|---|
| P22-49b · Finish the corpus inventory | 49a | 90m | Complete all 30 entries and tag the five Redaction cases and search candidates. | Check distinct references, approved formats and absence of real personal data or official documents. |
| P22-12a · Private draft intake and status | 07–08, 11 | 90m | Add draft schema, upload and per-document status endpoints. | P: mixed batch and persisted status. |
| P22-12b · Resume and isolate drafts | 12a | 75m | Add resume and protected draft retrieval. | P: draft access isolation and resume. |
| P22-13a · Worker job and backoff | 08, 12a | 90m | Dispatch queued OCR to a separate worker, apply retry/backoff and persist final quarantine. | P/I: four attempts and final state. |
| P22-13b · Prove corrupt-then-valid flow | 12b, 13a | 75m | Exercise the queue with corrupt and valid inputs. | P/I: corrupt item quarantines and valid item completes. |
| P22-14 · Exact SHA-256 duplicate detection | 12b | 60m | Hash uploaded bytes. Add duplicate lookup and a database-backed guard at final save. | Warn and identify the existing document for authorized staff. Block exact duplicates, including new versions. **P:** Exact match, changed bytes and concurrent final saves. |
| P22-15 · Notifications and quarantine actions | 13b | 60m | Add retry and permanently-failed actions plus alerts for Arhivar. | Arhivar gets an in-Application alert and can retry or mark permanently failed. **P:** Transitions and role checks. |
| P22-18 · Part 1 account and Physical Dossier tables | 02 | 60m | Add account and Physical Dossier migrations/models with username and role constraints. | Reuse scaffold account migration where suitable. Enforce username uniqueness, approved roles and stable dossier IDs. **P:** Constraint checks and printed dossier number round trip. |

**Day 4 forecast checkpoint:** Use recorded task turnaround, the P22-13b queue result and a timed early corpus review to project remaining work. Flag any milestone the forecast puts beyond Day 14.

## Day 5 · Produce safe reader data

**Outcome:** Corpus examples produce review candidates and safe PDF, search text and reader metadata. All 49 classifications import repeatably.

| Task | Depends on | Provisional task timebox | What to build or do | Acceptance and verification |
|---|---|---:|---|---|
| P22-16 · CNP and IBAN confidence rules | 08 | 75m | Implement CNP/IBAN validators and an anchored confidence scorer. | Apply CNP mod-11 and IBAN MOD-97 validation with Notarial Context Anchors. Automatic Redaction pending review is limited to anchored, checksum-valid CNP/IBAN. **P:** Valid, invalid, absent-anchor and OCR substitutions. |
| P22-17a · Detect names and contact data | 16 | 90m | Match names, phones and emails with Romanian context and OCR Bounding Boxes. | P: annotated fixtures and Notary Public name exemption. |
| P22-17b · Flag other sensitive regions | 17a | 90m | Flag addresses, identity cards, signatures, cadastral and vehicle identifiers and CUI/CIF. | P/I: uncertain/handwritten cases and Notary Public title/signature exemptions. |
| P22-21a · Generate reviewed Redaction PDF | 09b, 11, 17b | 90m | Apply accepted and manual Bounding Boxes to the derivative. | P/I: permanent pixels, covered PDF text removed and original intact. |
| P22-21b · Generate safe reader projections | 21a | 90m | Strip covered values from reader text and metadata. | P: covered values excluded from serialized reader data. |
| P22-19 · Part 1 Notarial Nomenclature import | 18 | 90m | Add the classification migration and transactional CSV seeder. Map all six computation bases. | Import 49 classifications and preserve six computation bases, C.S. flags and Permanent Preservation. **P:** Repeated indicators, stable IDs on rerun, and rollback for invalid or conflicting input. |
| P22-20a · Design DS-010 | 05 | 60m | Prepare login mock and error states. | Owner confirms against guardrails. |
| P22-20b · Design DS-001 | 05 | 75m | Prepare search mock with three browse modes, result metadata and empty or denied states. | Owner confirms against guardrails. |
| P22-20c · Design DS-006 | 05 | 60m | Prepare Admin account, dossier and permission forms. | Owner confirms against guardrails. |

## Day 6 · Make intake and review usable

**Outcome:** Staff can sign in, upload, correct OCR and inspect PII candidates. Confirmed-date retention rules work in the backend.

| Task | Depends on | Provisional task timebox | What to build or do | Acceptance and verification |
|---|---|---:|---|---|
| P22-25 · Username/password authentication and roles | 18 | 75m | Add login/logout endpoints, auth middleware and role policies. | Admin-managed accounts authenticate by username/password and backend routes enforce roles. **P:** Valid/invalid credentials, logout and role matrix. |
| P22-22 · Metadata suggestions and classification | 08, 19 | 75m | Add OCR suggestion extraction, confirmation rules and classification lookup. | Suggest editable dates, amounts, numbers and tags. Derive Archival Indicator from type, subtype and Storage Context. **P:** Manual Act Date, required fields, reclassification and repeated indicators. Direct override depends on Q-016. |
| P22-23 · DS-003 upload | 03, 10a, 12b, 14, 25 | 90m | Build DS-003 with a drop zone, per-document progress, resume and duplicate feedback. | Drag and drop all four formats, show individual status, resume drafts and show exact duplicates with the existing document. **PW:** Batch, resume, duplicate and error flows. |
| P22-24a · Build DS-011 OCR editing | 03, 08, 10c, 25 | 90m | Add inline OCR correction and associated page/word Bounding Boxes. | PW: edits persist on correct page. |
| P22-24b · Build DS-011 candidate review | 17b, 24a | 90m | Display PII candidates and support review decisions. | PW: uncertain detections and saved review choices. |
| P22-26 · Retention calculation and validation | 19, 22 | 90m | Add a retention calculator and confirmed-date validation. | Use the confirmed date and all six computation bases, including year boundaries and the two deposit cases. Permanent Preservation has no deadline. **P:** All bases and missing confirmation. Future-event handling depends on Q-014. |
| P22-30a · Design DS-005 | 05 | 60m | Mock C.S. sections, extension and batch destruction confirmation. | Owner confirms against guardrails. |
| P22-30b · Design DS-007 | 05 | 60m | Mock archive statistics, activity and alerts. | Owner confirms against guardrails. |
| P22-30c · Design DS-008 | 05 | 60m | Mock filtered access history and retained evidence. | Owner confirms against guardrails. |
| P22-30d · Review DS-009 mock | 05 | 60m | Review recipient controls, passwords and expired/revoked states. | Owner confirms against guardrails. |

## Day 7 · Approve immutable Document Versions

**Outcome:** Staff can approve a reviewed document or replacement. A pending replacement leaves the current version visible. Only approved content enters role-appropriate projections.

| Task | Depends on | Provisional task timebox | What to build or do | Acceptance and verification |
|---|---|---:|---|---|
| P22-27a · Draw and preview manual Redaction | 21a, 24b | 90m | Build Bounding Box drawing and preview. | PW: zoom/rotation mapping. |
| P22-27b · Capture metadata and review confirmation | 22, 26, 27a | 75m | Collect confirmed fields and explicit review decision. Test form behavior before publication wiring in 28b. | PW: missing fields and zero detections. |
| P22-28a · Implement immutable version publication | 14, 21b, 22, 25–26 | 90m | Add immutable Document Version records, current pointer and gated approval endpoint. | P: first approval, pending update, atomic swap and failed publication. |
| P22-28b · Wire Editor publication and verify | 27b, 28a | 90m | Connect DS-011 to real approval endpoint. | P/PW: first version, replacement and unpublished draft states. |
| P22-29 · Possible duplicates | 22, 28b | 60m | Add the act-number/Act-Date lookup and wire the three duplicate choices into the pending save flow. | Matching act number and Act Date links to the existing document and offers new version, separate document or abandon. **P/PW:** All outcomes and exact-match precedence. |
| P22-31 · Folder Permission policy | 18, 25, 28b | 75m | Add a Folder Permission table and policy. Apply the policy to archive queries and direct access. | One current Physical Dossier per document. Default-deny `cititor` access, with individual permissions taking precedence. **P:** Precedence, reassignment and browse/search/direct access. |
| P22-32 · PostgreSQL Romanian search index | 21b, 28b, 31 | 90m | Add Romanian PostgreSQL full-text vectors, indexes and separate staff/reader projections updated on approval. | Romanian `tsvector`, relevance and highlights. Index only the latest approved version and use the redacted projection for `cititor`. **P/I:** Relevance, drafts excluded, index replacement and sanitized snippets. |

## Day 8 · Find documents and apply access rules

**Outcome:** Staff can recover a Physical Dossier Number through search. Cititor sees approved redacted results in granted dossiers only. Protected access writes audit events.

| Task | Depends on | Provisional task timebox | What to build or do | Acceptance and verification |
|---|---|---:|---|---|
| P22-33 · Browse and search API | 31–32 | 75m | Add browse/search endpoints with permission filtering, rank, snippets and Physical Dossier Number. | Browse by Physical Dossier, type or year. Filter by folder, type, date and tags. Show Physical Dossier Number on every hit. Restrict Signatory Party name lookup to staff roles. **P:** Modes, filters, metadata and role boundaries. |
| P22-34 · DS-001 search and browse | 20b, 33 | 90m | Build the DS-001 filters, browse selector, ranked results and highlight rendering. | React search, ranking, highlights, filters and all browse modes. **PW:** Staff and `cititor` journeys with a newly approved result and a denied dossier. |
| P22-35 · DS-010 login | 20a, 25 | 60m | Build the DS-010 username/password form, Romanian errors and authorized redirects. | Staff sign in and reach authorized Screens with Romanian feedback. **PW:** Keyboard login, invalid credentials and denied navigation. |
| P22-36a · Write append-only audit events | 02, 25 | 90m | Add audit schema and writer with update/delete protection. | P/I: permissions include Admin denial. |
| P22-36b · Verify audit integrity | 36a | 75m | Add integrity verification and trace events by document. | P/I: detect alteration and reconstruct access history. |
| P22-38 · Authorized viewer and export access | 11, 28b, 31, 36b | 75m | Add version/file authorization and view/download/export handlers that write audit events. | Staff have authorized original, redacted and historical access. `cititor` has current approved redacted access in granted dossiers only. **P/I:** View, download and export events, Signed URLs and denied requests. |

## Day 9 · Complete internal access and Share Link services

**Outcome:** Staff can open approved versions, Admin can manage dossier access, and the Share Link API verifies exact variant, password, expiry and revocation with distinct audit events.

| Task | Depends on | Provisional task timebox | What to build or do | Acceptance and verification |
|---|---|---:|---|---|
| P22-37 · Metadata edits and dossier reassignment | 22, 26, 28b, 31–33, 36b | 75m | Add metadata update and dossier reassignment handlers. Refresh search and append each field change to audit. | Edits refresh access and search and audit actor, time, field, old and new values without creating a Document Version. **P:** Reassignment, reclassification and preserved versions. |
| P22-39 · DS-002 viewer and Document Version history | 03, 38 | 90m | Build DS-002 navigation, in-document search, download, version history and Editor entry. | Implement approved viewer, navigation, in-document highlights/search, downloads, history and Editor entry. **PW:** Role and version matrix. Share controls follow in 42. |
| P22-40a · Implement account, dossier and permission Admin APIs | 25, 31 | 90m | Add authorized CRUD and explicit grant/deny operations. | P: role boundaries and precedence. |
| P22-40b · Build DS-006 Admin forms | 20c, 40a | 90m | Connect account, dossier and permission forms. | PW: Admin flow and non-admin denial. |
| P22-41a · Issue and revoke version-pinned Share Links | 11, 28b, 36b, 38 | 90m | Persist version/variant, expiry presets or future date and optional password. | P: issuance/revoke roles, version pin and validation. |
| P22-41b · Enforce Share Link access on PDF delivery | 41a | 90m | Protect viewer/download and delivery URLs through expiry, password and revocation. | P/I: both variants, prior URLs, expired and revoked links. |
| P22-43 · Audit Share Link lifecycle and use | 36b, 41b, Q-015 for attribution | 75m | Wire Share Link lifecycle and per-access events into the audit writer. Add external attribution after Q-015 is answered. | Record creation, revocation and every PDF view/download. **P/I:** Repeated distinct events, exact version and approved recipient attribution. Identity verification and written requests remain offline. |

## Day 10 · Complete recipient, review and destruction workflows

**Outcome:** The recipient flow and review queues work. Admin can destroy a test document and both staff roles can inspect retained evidence.

| Task | Depends on | Provisional task timebox | What to build or do | Acceptance and verification |
|---|---|---:|---|---|
| P22-42a · Build DS-002 sharing controls | 39, 41b, 43 | 90m | Add exact version/variant, expiry and password selection and revoke actions. | PW: authorized staff flow. |
| P22-42b · Build DS-009 recipient Screen | 30d, 41b, 43 | 90m | Add password gate and PDF view/download with unavailable states. | PW: password, expiry, revocation and exact variant. |
| P22-44 · DS-008 Audit Log | 30c, 36b, 38 | 75m | Add a staff audit query endpoint and build DS-008 operator/date filters and evidence rows. | Staff can determine who viewed a document and filter by operator and period. **PW:** Access, role denial and matching events. |
| P22-45 · DS-004 review and quarantine queues | 10b, 15, 28b | 75m | Build DS-004 queue tabs, Editor navigation, retry and permanently-failed actions. | Staff open pending items in the Editor and act on quarantine with in-Application feedback. **PW:** Corrupt input, staff actions and review navigation. |
| P22-46a · Remove destroyed versions and retain audit evidence | 26, 32, 36b, 41b | 90m | Implement Admin confirmation and teardown with required retained access and act fields. | P/I: storage, versions, search and both staff evidence roles. |
| P22-46b · Verify destruction recovery and invalidation | 46a | 90m | Exercise partial failure, retry and preissued link termination. | P/I: recover consistently without losing retained events. |

## Day 11 · Finish required Screens and exercise the corpus

**Outcome:** All eleven Screens work. Five visual Redactions pass, and corpus relevance/privacy and visual comparisons have recorded evidence.

| Task | Depends on | Provisional task timebox | What to build or do | Acceptance and verification |
|---|---|---:|---|---|
| P22-47 · DS-005 Destruction List and extension | 26, 30a, 46b | 90m | Add deadline extension and build DS-005 groupings, extension and explicit batch confirmation. | Group expired documents by C.S. status. Admin can extend and explicitly confirm destruction. **P/PW:** Both groups, extension, confirmation and Permanent Preservation exclusion. Selection Commission deliberation is offline. |
| P22-48 · DS-007 dashboard and notification panel | 15, 28b, 30b, 36b, 46b | 90m | Add dashboard queries, DS-007 statistics and the in-Application alert panel and badge. | Show archive/document/storage counts, review and quarantine alerts, retention deadlines and recent activity. **PW:** Data states, badge/panel and `cititor` denial. |
| P22-50 · Prove five visual Redactions | 21b, 28b, 34, 39, 49b | 90m | Verification. Record visual, text-extraction and reader-privacy results on five corpus documents. | Verify five or more corpus documents covering CNP, IBAN and Signatory Party names. **I/PW:** Burned pixels, PDF extraction, reader search/metadata and original integrity. Save corpus references. |
| P22-51 · Measure corpus relevance and privacy | 32–34, 49b | 75m | Verification. Record corpus query rankings, timings and permission results. | Expected Romanian results rank correctly. **P/I:** Record rankings, highlights, timing and absence of unauthorized or covered values. |
| P22-52a · Verify intake, review and archive Screens | 23, 28b, 34–35, 39, 45 | 90m | Capture DS-001/002/003/004/010/011 in both themes and viewport sizes. | PW/manual: compare mocks, accessibility/overflow and registry entries. |
| P22-52b · Verify operational and recipient Screens | 40b, 42b, 44, 47–48 | 90m | Capture DS-005/006/007/008/009 in both themes and viewport sizes. | PW/manual: compare mocks, accessibility/overflow and registry entries. |

## Day 12 · Verify and promote the release

**Outcome:** The checked full workflow is running live or a named blocker prevents promotion. Begin 58 early if live smoke passes and time permits.

| Task | Depends on | Provisional task timebox | What to build or do | Acceptance and verification |
|---|---|---:|---|---|
| P22-53 · Debug release-blocking integration failures | 50–51, 52a–b | 90m | Debugging. Fix reproducible release blockers and add focused regression checks. | Fix priority failures and rerun. **Check:** Each finding has a passing reproduction test or is listed as a release blocker. |
| P22-54b · Verify release deployment and rollback | 54a, 56b, 41b, 46b, 48 | 90m | Apply full configuration and rehearse migration, worker/storage checks and rollback in staging or equivalent. | I: repeatable startup and rollback evidence. |
| P22-55 · Release test matrix | 43–48, 50–51, 52a–b, 53, 54b | 90m | Verification. Run PHPUnit, frontend build/type-check, Ledger lint and Playwright. | Run PHPUnit, build/type-check, Ledger lint and Playwright. **Regression:** Corrupt-then-valid queue, PDF privacy, Folder Permissions, Share Link lifecycle, post-destruction evidence and Romanian role journeys. |
| P22-56c · Promote the checked build | 54b, 55, deployment authorization | 75m | Deploy the checked build and remove the temporary hosting gate so public Share Links work under their approved access rules. | I: Application login, signed delivery, Share Link password/expiry/revocation, separate worker and approved synthetic draft. |
| P22-57 · Technical documentation | 54b, 55 | 75m | Documentation. Update README, Architecture Ledger and AI journal with verified behavior. | README and Architecture Ledger match implemented behavior and repeatable commands. Document OCR, Redaction, retention and audit boundaries. **Check:** Fresh-start walkthrough, links and lint. Record approved answers and reusable practices under Ledger rules. |

## Day 13 · Run university acceptance live

**Outcome:** All 30 documents are reconciled against the live index. Five staff searches and the under-two-second result are documented.

| Task | Depends on | Provisional task timebox | What to build or do | Acceptance and verification |
|---|---|---:|---|---|
| P22-58 · Process first 15 documents live | 49b, 56c | 90m | Live acceptance. Upload, review and approve the first 15 test documents. | Upload, process, review and approve 15 test documents. **Live check:** Reconcile statuses and record failures by corpus reference. |
| P22-59 · Process remaining 15 documents live | 58 | 90m | Live acceptance. Process the other 15 and reconcile the live index. | Reconcile all 30 test documents through live processing, approval and search. **Live check:** Inventory, worker outcomes and indexed results agree. |
| P22-60 · Five Secretar Notarial acceptance searches | 59, Secretar Notarial available | 75m | Live acceptance. Record the Secretar Notarial's five searches in INTERVIEW.md. | The Secretar Notarial runs five searches live. Record queries/filters, elapsed time, correct result, Physical Dossier Number and feedback in `INTERVIEW.md`. **Check:** Demonstrate the P22 under-two-second result and record all five timings. |
| P22-61 · Assemble university evidence | 50, 55, 57, 59–60 | 75m | Documentation. Assemble university evidence against P22 completion criteria. | Collect the interview, corpus inventory, live results, validator/queue tests, five visual Redactions, retained audit evidence and course AI interaction journal. **Check:** Trace P22 Definition of Done to evidence and follow submission instructions confirmed in 04. |

## Day 14 · Rerun, finalize and rehearse

**Outcome:** The evidence matches the verified live build, the hand-in package is ready, and a timed defense rehearsal is complete.

| Task | Depends on | Provisional task timebox | What to build or do | Acceptance and verification |
|---|---|---:|---|---|
| P22-62 · Contingency fix or live rerun | 60–61 | 90m | Debugging reserve. Fix or rerun the highest-priority live issue. | Fix the highest-priority live issue and rerun affected checks. Use the reserved acceptance slot if needed. **Check:** Final outcome and evidence agree. |
| P22-63 · Final release and documentation verification | 61–62 | 60m | Verification. Confirm the deployed build and rerun checks affected by any fix. | Verify the live build and evidence against P22. **Check:** Live smoke and rerun affected tests, build/type-check, PW and lint after fixes. |
| P22-64 · Prepare defense walkthrough | 55, 61 | 75m | Defense preparation. Write the demo sequence and answers to all three P22 questions. | Script Physical Dossier retrieval, OCR correction, Redaction, Share Link expiry/revocation, quarantine and retained audit evidence. **Check:** Explain CNP validation/OCR mistakes, why expired links fail and what happens after four failed attempts. |
| P22-65 · Rehearse the defense | 63–64 | 75m | Rehearsal. Run the timed demo and verify access and evidence. | Run one timed demo with synthetic data and examiner questions. **Check:** Verify live access, screenshots and test evidence in case connectivity interrupts the demo. |
| P22-66 · Final submission and defense reserve | 63–65 | 60m | Submission. Verify and package the deliverables. | Verify the submission package and demo against confirmed course instructions. **Check:** Deliverables, live environment and evidence links match the verified result. |

## Protected reserve and dependency gates

Protect 14 hours of calendar time: 2h across Days 3–4 for conversion and worker issues, 2h across Days 7–8 for approval/index/access integration, 4h across Days 11–12 for release failures and reruns, and 6h across Days 13–14 for live acceptance and recovery. Use this reserve for failing checks, fixes and retests. Carry unused time forward.

- **Pipeline:** 01 → 02 → 06a/b → 08 → 09a/b → 21a/b → 28a/b → 32 → 33 → 34. DOCX conversion and private queued intake feed this path. Confirmed-date retention validation in 26 precedes 28a.
- **Access and release:** 31 and 36a/b → 38 → 41a/b → 43 → 42a/b. Both the audit and Share Link lifecycle feed destruction in 46a/b. The release follows 55 → 56c → 58/59 → 60 → 61. Host access and explicit authorization are needed for the Day 1 placeholder, with Day 2 as fallback. The Day 3 skeleton also requires the scaffold and private storage smoke checks.
- **Can overlap:** Corpus handoff, host access and owner mock reviews have separate inputs. Backend work may proceed while a Screen awaits approval. You and Codex implement one approved task at a time.
- **Deadline risks:** DS-011 geometry and review, ten mock approvals, revocation through file delivery, recoverable batch destruction, and 30 live human reviews. Reassess after Days 4 and 7 using observed throughput and blocked work. Bring schedule or scope decisions to the owner and keep every agreed requirement on the checklist pending approval.

## Remaining unanswered questions

| Item | Confirmation needed | Affected work |
|---|---|---|
| Q-013 | Where and how are the remaining Screen designs approved? | 05 and all design batches. |
| Q-014 | What happens when the prescribed retention event has yet to occur and its actual date cannot be confirmed? | Future-event handling in 26–28. Confirmed-date paths can proceed. |
| Q-015 | What external attribution is retained for unauthenticated Share Link views/downloads? | Attribution in 43 and release verification. |
| Q-016 | May staff directly override the derived Archival Indicator? | Additional override behavior in 22/37. Approved classification correction can proceed. |
| Q-017–Q-019 | How are official Nomenclature revisions applied and retained, can Arhivar browse the Nomenclature, and is there a dedicated Screen/import workflow? | Separate work pending answers. Initial import in 19 can proceed. |
| Delivery logistics | Live host and access, template handoff, Secretar Notarial acceptance/rerun slots and any additional course instructions. | Verify in 04. These feed 49 and the live delivery tasks. |

See the [open questions](../OPEN-QUESTIONS.md) and [Notarial Nomenclature questions](../questions/notarial-nomenclature.md). The roadmap uses approved D-001–D-004, D-006–D-007, D-017–D-020 and D-022–D-031. The Patterns and Contracts Ledgers have no entries to apply.

**Start with P22-01 · Container and Romanian OCR smoke.** This 90-minute task verifies the first dependency for OCR Extraction and permanent visual Redaction. It can begin after task approval, independently of Screen confirmation and the corpus handoff.
