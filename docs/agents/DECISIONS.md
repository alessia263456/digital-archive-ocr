# Decisions — proiect1

<!-- graffino-agentic:begin v1 -->
> Constraints the code must obey. Status: `approved` (obey) · `proposed` (do not
> build on it) · `superseded-by <ID>` (kept to explain old code).
> Adding or changing an entry needs the user's OK (AGENTS.md → The gate).
<!-- graffino-agentic:end -->

## Index
- D-001 · Tech stack and containerized architecture
- D-002 · Digital archive core scope and capabilities
- D-003 · Backend automated testing with PHPUnit
- D-004 · OCR extraction via Tesseract with Romanian language and TSV bounding boxes
- D-005 · PII detection, confidence scoring, visual redaction, and human review
- D-006 · Frontend visual testing and screenshots via Playwright
- D-007 · Single-tenant Notary Cabinet scope
- D-008 · Role mapping and access segregation
- D-009 · Editable OCR metadata extraction and confirmation
- D-010 · Mandatory Act Date confirmation for indexing and retention
- D-011 · Inline OCR text correction in Document Viewer
- D-012 · Manual PII bounding-box drawing and pixel-level burning
- D-013 · Share link creation, scope, and audit logging
- D-014 · Upload deduplication via exact hash and near-duplicate text warning
- D-015 · Quarantine Queue for consecutive OCR failures
- D-016 · Retention calculation and manual batch destruction confirmation
- D-017 · In-app username and password authentication
- D-018 · Romanian-only user interface and system errors
- D-019 · In-app notifications
- D-020 · Screen inventory and role-based access control

---

## D-001 · Tech stack and containerized architecture
- **Status:** approved
- **Date:** 2026-11-16
- **Rule:** The system must use a React frontend, Laravel backend, PostgreSQL database, and Docker containerization for all server-related services.
- **Why:** Architecture constraint defined by the repository owner for the digital archive application stack.
- **Rejected:** Monolithic full-stack frameworks (Next.js, Nuxt), SQLite, or uncontainerized host services.
- **Evidence:** docs/agents/OPEN-QUESTIONS.md:Q-001
- **Source:** user · confidence high
- **Confirmed:** 2026-11-16

## D-002 · Digital archive core scope and capabilities
- **Status:** approved
- **Date:** 2026-11-16
- **Rule:** The application must support document scan uploads, OCR text extraction, document search and indexing, PII detection and anonymization, immutable document versioning, folder-level access permissions, and automated retention policies.
- **Why:** Core domain requirements defined by the repository owner for digital archive governance and compliance.
- **Rejected:** Unversioned document overwrite; unindexed storage; unanonymized public document access.
- **Evidence:** docs/agents/OPEN-QUESTIONS.md:Q-002
- **Source:** user · confidence high
- **Confirmed:** 2026-11-16

## D-003 · Backend automated testing with PHPUnit
- **Status:** approved
- **Date:** 2026-11-16
- **Rule:** Backend unit and feature tests must be written and executed using PHPUnit as part of the Definition of Done.
- **Why:** Testing framework standard defined by the repository owner for Laravel backend test coverage.
- **Rejected:** Untested backend endpoints; Pest (unless explicitly selected later).
- **Evidence:** docs/agents/OPEN-QUESTIONS.md:Q-003
- **Source:** user · confidence high
- **Confirmed:** 2026-11-16

## D-004 · OCR extraction via Tesseract with Romanian language and TSV bounding boxes
- **Status:** approved
- **Date:** 2026-11-16
- **Rule:** Optical character recognition must use Tesseract OCR installed in the Docker container, explicitly including the `tesseract-ocr-ron` (Romanian language pack) alongside standard language data, and requiring Tesseract TSV output format so word bounding-box coordinates (`left`, `top`, `width`, `height`) are preserved for visual redaction and search hit highlighting.
- **Why:** Accurate Romanian diacritic recognition and coordinate preservation are required for pixel-level visual redaction on document scans.
- **Rejected:** Cloud OCR APIs (AWS Textract, Google Cloud Vision) due to privacy, data sovereignty, and offline Docker requirements; plain text OCR output without bounding boxes.
- **Evidence:** docs/agents/OPEN-QUESTIONS.md:Q-005
- **Source:** user · confidence high
- **Confirmed:** 2026-11-16

## D-005 · PII detection, confidence scoring, visual redaction, and human review
- **Status:** approved
- **Date:** 2026-11-16
- **Rule:** Personal data detection and redaction must cover Romanian CNP, IBAN, phone numbers, emails, and person names, strictly enforcing:
  1. Checksum & contextual detection: Mathematical checksum validation for Romanian CNP (control digit with weights `279146358279` mod 11) and IBAN (ISO 7064 MOD-97), combined with Romanian notarial context anchors (e.g. `CNP:`, `IBAN:`, `subsemnatul`, `subsemnata`, `numitul`, `domiciliat în`, `identificat prin CI`) to identify person names.
  2. Confidence scoring & human review: High-confidence matches (valid checksum + context keyword) can auto-redact. Detected person names, corrupted OCR matches, or matches lacking checksum are assigned medium confidence and routed to a human review queue, excluding public notary titles/names (e.g., `Notar Public Constantinescu Ana`).
  3. Visual pixel-level redaction & role segregation: Burn solid black boxes onto the image/PDF copy using Tesseract word bounding boxes (plus manual bounding-box drawing in the React UI for missed names). Strip redacted values from text/metadata served to `cititor` roles while keeping the unredacted original restricted to `admin` / `arhivar` roles.
- **Why:** Enforces compliance with privacy regulations without risking unvalidated redaction of public notary credentials or leaking PII to unauthorized readers.
- **Rejected:** Microsoft Presidio due to heavy Python/spaCy RAM footprint and lack of native Romanian CNP/notarial context rules; naive unvalidated regex matching.
- **Evidence:** docs/agents/OPEN-QUESTIONS.md:Q-006
- **Source:** user · confidence high
- **Confirmed:** 2026-11-16

## D-006 · Frontend visual testing and screenshots via Playwright
- **Status:** approved
- **Date:** 2026-11-16
- **Rule:** Automated UI verification and light/dark mode screenshots required by Definition of Done must be executed using Playwright against the React frontend across desktop and mobile viewports.
- **Why:** Automated, headless visual regression and screenshot capture pipeline matching the repository's Definition of Done and design guardrails.
- **Rejected:** Puppeteer scripts; Cypress.
- **Evidence:** docs/agents/OPEN-QUESTIONS.md:Q-004, docs/agents/OPEN-QUESTIONS.md:Q-007
- **Source:** user · confidence high
- **Confirmed:** 2026-11-16

## D-007 · Single-tenant Notary Cabinet scope
- **Status:** approved
- **Date:** 2026-11-17
- **Rule:** The application must operate strictly as a single-tenant deployment tailored to a single Notary Cabinet (*Cabinet Individual Notarial*). Multi-organisation or multi-tenant architectures are out of scope.
- **Why:** Scope constraint aligned with the physical notarial archive operational model and project brief.
- **Rejected:** Multi-tenant / multi-organisation database partitioning, tenant routing, and cross-organisation isolation.
- **Evidence:** README.md
- **Source:** user · confidence high

## D-008 · Role mapping and access segregation
- **Status:** approved
- **Date:** 2026-11-17
- **Rule:** The application must enforce four specific role access tiers:
  1. `admin` (Notar Public): Full system access, user and folder administration, retention and destruction confirmation, and creation of share links (original or redacted).
  2. `arhivar` (Arhivar AND Secretar Notarial): Access to original scans, PII review queue, OCR metadata confirmation, inline OCR correction, manual PII redaction drawing, quarantine queue management, and creation of share links.
  3. `cititor` (other internal staff/interns): Access to redacted scans and full-text search results only; cannot create share links or view unredacted scans.
  4. `(unauthenticated)` (external share-link recipient): Access restricted exclusively to the public share link viewer to view and download a PDF of the shared copy via signed URL.
- **Why:** Reconciles internal cabinet staff responsibilities with GDPR privacy compliance and role segregation requirements.
- **Rejected:** Role-per-title fragmentation; giving `cititor` access to unredacted originals or share link creation.
- **Evidence:** README.md
- **Source:** user · confidence high

## D-009 · Editable OCR metadata extraction and confirmation
- **Status:** approved
- **Date:** 2026-11-17
- **Rule:** Metadata automatically extracted by OCR (dates, amounts, document numbers, tags) must be presented in the user interface as editable suggestions and must be explicitly confirmed or corrected by an archivist before the document is indexed.
- **Why:** Prevents faulty or corrupted OCR extractions from polluting search indexes, cataloguing registers, or retention calculations.
- **Rejected:** Unchecked direct indexing of raw OCR metadata without human confirmation.
- **Evidence:** README.md
- **Source:** user · confidence high

## D-010 · Mandatory Act Date confirmation for indexing and retention
- **Status:** approved
- **Date:** 2026-11-17
- **Rule:** Act Date confirmation is mandatory before any document can enter the archival retention schedule or be indexed for full-text search. If OCR fails to detect an Act Date, manual entry by the archivist is strictly required. No document shall be indexed without a confirmed Act Date.
- **Why:** Archival retention computation under statutory Notarial Nomenclature is computed from the Act Date, making it a critical archival integrity requirement.
- **Rejected:** Indexing without confirmed Act Date; falling back to upload date or file timestamp for retention schedules.
- **Evidence:** README.md
- **Source:** user · confidence high

## D-011 · Inline OCR text correction in Document Viewer
- **Status:** approved
- **Date:** 2026-11-17
- **Rule:** The Document Viewer must provide inline OCR text editing capabilities. Corrections made by an archivist must be saved to the immutable Document Version and immediately update the full-text search index.
- **Why:** Enables correction of OCR transcription errors and misread diacritics while preserving auditability and search precision.
- **Rejected:** Read-only OCR text panes; unversioned direct database text overwrites.
- **Evidence:** README.md
- **Source:** user · confidence high

## D-012 · Manual PII bounding-box drawing and pixel-level burning
- **Status:** approved
- **Date:** 2026-11-17
- **Rule:** The Document Viewer must allow manual drawing of PII bounding boxes on document scans. Manually drawn boxes must merge with auto-detected PII bounding boxes and be burned at the pixel level into the generated redacted copy as solid black boxes.
- **Why:** Guarantees complete visual anonymization of personal data (such as missed person names or irregular layouts) with zero risk of underlying text recovery in the redacted file.
- **Rejected:** Client-side CSS masking or visual overlays that leave underlying image pixels or PDF text streams intact.
- **Evidence:** README.md
- **Source:** user · confidence high

## D-013 · Share link creation, scope, and audit logging
- **Status:** approved
- **Date:** 2026-11-17
- **Rule:** Share links may only be created by users with `admin` or `arhivar` roles. The creator must explicitly choose whether the link grants access to the original scan or the redacted copy. Unauthenticated recipients holding a valid signed URL can view and download a PDF of the shared copy. Every access via a share link must be recorded in the Append-Only Audit Log.
- **Why:** Supports lawful external sharing of notarial acts (e.g. with banks, cadastral offices, or parties) while preserving GDPR compliance, access expiration, and complete audit trails.
- **Rejected:** Creation of share links by `cititor`; unlogged access; permanent or public unauthenticated URLs without signed expiration.
- **Evidence:** README.md
- **Source:** user · confidence high

## D-014 · Upload deduplication via exact hash and near-duplicate text warning
- **Status:** approved
- **Date:** 2026-11-17
- **Rule:** The upload pipeline must enforce deduplication:
  1. Exact duplicate: An identical SHA-256 file hash immediately blocks the upload and displays a link to the existing archived document.
  2. Near-duplicate: High OCR text similarity triggers a warning with a link to the matching document, but allows the archivist to proceed if intended.
- **Why:** Prevents accidental duplicate uploads of identical scans while warning staff of potential redundant re-scans of existing notarial dossiers.
- **Rejected:** Silent rejection without linking existing documents; blocking near-duplicates automatically without archivist discretion.
- **Evidence:** README.md
- **Source:** user · confidence high

## D-015 · Quarantine Queue for consecutive OCR failures
- **Status:** approved
- **Date:** 2026-11-17
- **Rule:** Any document scan that encounters N consecutive OCR processing failures must be removed from the normal processing queue and placed into an isolated Quarantine Queue. The archivist must receive an in-app notification and be given the option to re-trigger processing or mark the document as permanently failed.
- **Why:** Prevents corrupted or unreadable scans from blocking background asynchronous processing workers and isolates problematic files for manual intervention.
- **Rejected:** Infinite retry loops that stall worker queues; silent document drops without archivist alert.
- **Evidence:** README.md
- **Source:** user · confidence high

## D-016 · Retention calculation and manual batch destruction confirmation
- **Status:** approved
- **Date:** 2026-11-17
- **Rule:** Retention periods must be calculated strictly from the confirmed Act Date using the statutory rules in `docs/nomenclator_arhivistic.csv`. Documents whose retention period has expired must be displayed on the Destruction List grouped by their Selection Commission (`C.S.`) flag. Permanent deletion must never occur automatically; an Admin must manually confirm destruction per batch.
- **Why:** Romanian archival law mandates strict oversight over notarial records disposal and prohibits automated purging without Selection Commission review.
- **Rejected:** Automatic scheduled purging/deletion of expired records; calculating retention from upload or system date.
- **Evidence:** README.md
- **Source:** user · confidence high

## D-017 · In-app username and password authentication
- **Status:** approved
- **Date:** 2026-11-17
- **Rule:** User authentication must be restricted strictly to username and password credentials managed directly within the application by an Admin. Single Sign-On (SSO), OAuth, magic links, and two-factor authentication (2FA) are explicitly out of scope.
- **Why:** Matches the operational simplicity and infrastructure constraints of a standalone single-tenant Notary Cabinet.
- **Rejected:** SSO, OAuth2/OIDC, email magic links, and 2FA integrations.
- **Evidence:** README.md
- **Source:** user · confidence high

## D-018 · Romanian-only user interface and system errors
- **Status:** approved
- **Date:** 2026-11-17
- **Rule:** The application user interface, labels, notifications, and system error messages must be authored and displayed exclusively in Romanian. Internationalization (i18n) frameworks and language switchers are out of scope.
- **Why:** The target users, legal framework, and physical archive terminology are exclusively Romanian.
- **Rejected:** Multi-language switchers, English UI translations, and complex i18n bundling.
- **Evidence:** README.md
- **Source:** user · confidence high

## D-019 · In-app notifications
- **Status:** approved
- **Date:** 2026-11-17
- **Rule:** Application alerts and notifications (such as Quarantine Queue alerts, PII review queue assignments, and documents due for destruction) must be delivered solely via an in-app badge and notification panel. External notification channels (email, webhooks, push notifications) are out of scope.
- **Why:** Ensures simplicity, eliminates external SMTP/push delivery dependencies, and maintains confidentiality within the cabinet network.
- **Rejected:** Email notifications, SMS alerts, webhooks, or browser push services.
- **Evidence:** README.md
- **Source:** user · confidence high

## D-020 · Screen inventory and role-based access control
- **Status:** approved
- **Date:** 2026-11-18
- **Rule:** The application user interface must consist of 11 screens with strict role-based access rules:
  1. Document list / Search results (`DS-001`): Accessible to `admin`, `arhivar`, and `cititor`.
  2. Document viewer (`DS-002`): Read-only view accessible to all logged-in roles (`admin` and `arhivar` access original scan, redacted copy, and an edit button linking to `DS-011`; `cititor` accesses redacted copy only).
  3. Upload (`DS-003`): Accessible to `admin` and `arhivar`.
  4. Human Review Queue & Quarantine (`DS-004`): Accessible to `admin` and `arhivar`.
  5. Retention & Destruction list (`DS-005`): Accessible strictly to `admin`.
  6. Admin panel (`DS-006`): Accessible strictly to `admin`.
  7. Dashboard (`DS-007`): Accessible strictly to `admin` and `arhivar` ONLY.
  8. Audit Log viewer (`DS-008`): Accessible to `admin` and `arhivar`.
  9. Public share link viewer (`DS-009`): Accessible only to unauthenticated visitors possessing a valid signed URL.
  10. Login (`DS-010`): Accessible to unauthenticated visitors for cabinet authentication.
  11. Document Editor & Anonymization (`DS-011`): Dedicated editing screen for inline OCR correction, TSV bounding-box inspection, PII review, manual black-box redaction drawing, Act Date confirmation, and anonymization generation; accessible strictly to `admin` and `arhivar`.
- **Why:** Separates read-only document browsing from specialized redaction and OCR editing workflows, maps role boundaries across all visual views, and establishes the authoritative screen inventory matching `docs/design/registry.yaml`.
- **Rejected:** Combining complex redaction drawing and editing tools directly into the read-only viewer; exposing admin/retention management to non-admins; allowing `cititor` access to upload, editor, review queue, dashboard, or audit logs.
- **Evidence:** README.md, docs/design/registry.yaml
- **Source:** user · confidence high
- **Confirmed:** 2026-11-18
