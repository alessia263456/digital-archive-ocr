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
- D-006 · Frontend visual testing and screenshots via Playwright
- D-007 · Single-tenant Notary Cabinet scope
- D-017 · In-app username and password authentication
- D-018 · Romanian-only user interface and system errors
- D-019 · In-app notifications
- D-032 · Screen inventory and role-based access control

### [Archive workflows](decisions/archive-workflows.md)
- D-022 · PII detection and Redaction coverage
- D-025 · Exact and possible duplicates
- D-026 · OCR quarantine threshold
- D-028 · DOCX originals and derived PDFs
- D-033 · Archive browsing, Folder Permissions, and search
- D-034 · Share Link access and lifecycle
- D-035 · Retention, destruction, and retained audit evidence
- D-036 · Live acceptance corpus
- D-037 · Physical Dossiers, Document Versions, and metadata changes
- D-038 · Upload review, metadata, and Document Versions
- D-039 · Official Notarial Nomenclature revisions

---

## D-001 · Tech stack and containerized architecture
- **Status:** approved
- **Date:** 2026-11-16
- **Rule:** The system must use a React frontend, Laravel backend, PostgreSQL database, and Docker containerization for all server-related services.
- **Why:** Architecture constraint defined by the repository owner for the digital archive application stack.
- **Rejected:** Monolithic full-stack frameworks (Next.js, Nuxt), SQLite, or uncontainerized host services.
- **Evidence:** docs/agents/OPEN-QUESTIONS.md:Q-001
- **Source:** user · confidence high
- **Confirmed:** 2026-11-21

## D-002 · Digital archive core scope and capabilities
- **Status:** approved
- **Date:** 2026-11-16
- **Rule:** The application must support document scan uploads, OCR text extraction, document search and indexing, PII detection and anonymization, immutable document versioning, folder-level access permissions, and automated retention policies.
- **Why:** Core domain requirements defined by the repository owner for digital archive governance and compliance.
- **Rejected:** Unversioned document overwrite; unindexed storage; unanonymized public document access.
- **Evidence:** docs/agents/OPEN-QUESTIONS.md:Q-002
- **Source:** user · confidence high
- **Confirmed:** 2026-11-21

## D-003 · Backend automated testing with PHPUnit
- **Status:** approved
- **Date:** 2026-11-16
- **Rule:** Backend unit and feature tests must be written and executed using PHPUnit as part of the Definition of Done.
- **Why:** Testing framework standard defined by the repository owner for Laravel backend test coverage.
- **Rejected:** Untested backend endpoints; Pest (unless explicitly selected later).
- **Evidence:** docs/agents/OPEN-QUESTIONS.md:Q-003
- **Source:** user · confidence high
- **Confirmed:** 2026-11-21

## D-004 · OCR extraction via Tesseract with Romanian language and TSV bounding boxes
- **Status:** approved
- **Date:** 2026-11-16
- **Rule:** Optical character recognition must use Tesseract OCR installed in the Docker container, explicitly including the `tesseract-ocr-ron` (Romanian language pack) alongside standard language data, and requiring Tesseract TSV output format so word bounding-box coordinates (`left`, `top`, `width`, `height`) are preserved for visual redaction and search hit highlighting.
- **Why:** Accurate Romanian diacritic recognition and coordinate preservation are required for pixel-level visual redaction on document scans.
- **Rejected:** Cloud OCR APIs (AWS Textract, Google Cloud Vision) due to privacy, data sovereignty, and offline Docker requirements; plain text OCR output without bounding boxes.
- **Evidence:** docs/agents/OPEN-QUESTIONS.md:Q-005
- **Source:** user · confidence high
- **Confirmed:** 2026-11-21

## D-006 · Frontend visual testing and screenshots via Playwright
- **Status:** approved
- **Date:** 2026-11-16
- **Rule:** Automated UI verification and light/dark mode screenshots required by Definition of Done must be executed using Playwright against the React frontend across desktop and mobile viewports.
- **Why:** Automated, headless visual regression and screenshot capture pipeline matching the repository's Definition of Done and design guardrails.
- **Rejected:** Puppeteer scripts; Cypress.
- **Evidence:** docs/agents/OPEN-QUESTIONS.md:Q-004, docs/agents/OPEN-QUESTIONS.md:Q-007
- **Source:** user · confidence high
- **Confirmed:** 2026-11-21

## D-007 · Single-tenant Notary Cabinet scope
- **Status:** approved
- **Date:** 2026-11-17
- **Rule:** The application must operate strictly as a single-tenant deployment tailored to a single Notary Cabinet (*Cabinet Individual Notarial*). Multi-organisation or multi-tenant architectures are out of scope.
- **Why:** Scope constraint aligned with the physical notarial archive operational model and project brief.
- **Rejected:** Multi-tenant / multi-organisation database partitioning, tenant routing, and cross-organisation isolation.
- **Evidence:** README.md
- **Source:** user · confidence high
- **Confirmed:** 2026-11-19

## D-017 · In-app username and password authentication
- **Status:** approved
- **Date:** 2026-11-17
- **Rule:** User authentication must be restricted strictly to username and password credentials managed directly within the application by an Admin. Single Sign-On (SSO), OAuth, magic links, and two-factor authentication (2FA) are explicitly out of scope.
- **Why:** Matches the operational simplicity and infrastructure constraints of a standalone single-tenant Notary Cabinet.
- **Rejected:** SSO, OAuth2/OIDC, email magic links, and 2FA integrations.
- **Evidence:** README.md
- **Source:** user · confidence high
- **Confirmed:** 2026-11-19

## D-018 · Romanian-only user interface and system errors
- **Status:** approved
- **Date:** 2026-11-17
- **Rule:** The application user interface, labels, notifications, and system error messages must be authored and displayed exclusively in Romanian. Internationalization (i18n) frameworks and language switchers are out of scope.
- **Why:** The target users, legal framework, and physical archive terminology are exclusively Romanian.
- **Rejected:** Multi-language switchers, English UI translations, and complex i18n bundling.
- **Evidence:** README.md
- **Source:** user · confidence high
- **Confirmed:** 2026-11-21

## D-019 · In-app notifications
- **Status:** approved
- **Date:** 2026-11-17
- **Rule:** Application alerts and notifications (such as Quarantine Queue alerts, PII review queue assignments, and documents due for destruction) must be delivered solely via an in-app badge and notification panel. External notification channels (email, webhooks, push notifications) are out of scope.
- **Why:** Ensures simplicity, eliminates external SMTP/push delivery dependencies, and maintains confidentiality within the cabinet network.
- **Rejected:** Email notifications, SMS alerts, webhooks, or browser push services.
- **Evidence:** README.md
- **Source:** user · confidence high

## D-032 · Screen inventory and role-based access control
- **Status:** approved
- **Date:** 2026-11-20
- **Rule:** The application user interface must consist of 12 screens with strict role-based access rules:
  1. Document list / Search results (`DS-001`): Accessible to `admin`, `arhivar`, and `cititor`.
  2. Document viewer (`DS-002`): Read-only view accessible to all logged-in roles (`admin` and `arhivar` access original scan, redacted copy, and an edit button linking to `DS-011`; `cititor` accesses redacted copy only, with PDF download).
  3. Upload (`DS-003`): Accessible to `admin` and `arhivar`.
  4. Human Review Queue & Quarantine (`DS-004`): Accessible to `admin` and `arhivar`.
  5. Retention & Destruction list (`DS-005`): Accessible strictly to `admin`.
  6. Admin panel (`DS-006`): Accessible strictly to `admin`.
  7. Dashboard (`DS-007`): Accessible strictly to `admin` and `arhivar` ONLY.
  8. Audit Log viewer (`DS-008`): Accessible to `admin` and `arhivar`.
     DS-008 also lets both roles see, copy, and revoke active Share Links.
  9. Public share link viewer (`DS-009`): Accessible only to unauthenticated visitors possessing a valid signed URL.
  10. Login (`DS-010`): Accessible to unauthenticated visitors for cabinet authentication.
  11. Document Editor & Anonymization (`DS-011`): Dedicated editing screen for inline OCR correction, TSV bounding-box inspection, PII review, manual black-box redaction drawing, Act Date confirmation, and anonymization generation; accessible strictly to `admin` and `arhivar`.
  12. Notarial Nomenclature (`DS-012`): Accessible to `admin` and `arhivar` for browsing and applying official CSV revisions.
- **Why:** Records the confirmed archive requirements.
- **Evidence:** D-020 and owner confirmation in chat
- **Source:** user · confidence high
- **Confirmed:** 2026-11-20
