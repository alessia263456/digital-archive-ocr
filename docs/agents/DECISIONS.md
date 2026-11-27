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
- D-042 · Screen inventory, home screen, and role-based access control
- D-043 · Browser session authentication lifetime and login throttling
- D-044 · Retention eligibility date calculation
- D-046 · Physical Dossier record identity and catalogue fields

### [Archive workflows](decisions/archive-workflows.md)
- D-048 · Discard PII detections without safe geometry
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
- D-040 · Multi-image duplicate detection and OCR similarity warnings

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
- **Confirmed:** 2026-11-25

## D-042 · Screen inventory, home screen, and role-based access control
- **Status:** approved
- **Date:** 2026-11-24
- **Rule:** The application user interface consists of 12 Screens with strict role-based access rules:
  1. Document list / Search results (`DS-001`): Accessible to `admin`, `arhivar`, and `cititor`; the default Screen after login for all three roles.
  2. Document viewer (`DS-002`): Read-only view accessible to all logged-in roles (`admin` and `arhivar` access original scan, redacted copy, and an edit button linking to `DS-011`; `cititor` accesses redacted copy only, with PDF download).
  3. Upload (`DS-003`): Accessible to `admin` and `arhivar`.
  4. Human Review Queue & Quarantine (`DS-004`): Accessible to `admin` and `arhivar`.
  5. Retention & Destruction list (`DS-005`): Accessible to `admin` with existing retention-management permissions and to `arhivar` with read-only access to view and filter retention deadlines and documents eligible for destruction. Only `admin` may extend retention periods, approve destruction, or perform other retention-management mutations on DS-005. Enforce role restrictions on the server.
  6. Admin panel (`DS-006`): Accessible strictly to `admin`.
  7. Statistics (`DS-007`): Accessible to `admin` and `arhivar` only, as a secondary Screen in application navigation.
  8. Audit Log viewer (`DS-008`): Accessible to `admin` and `arhivar`. DS-008 also lets both roles see, copy, and revoke active Share Links.
  9. Public share link viewer (`DS-009`): Accessible only to unauthenticated visitors possessing a valid signed URL.
  10. Login (`DS-010`): Accessible to unauthenticated visitors for cabinet authentication.
  11. Document Editor & Anonymization (`DS-011`): Dedicated editing screen for inline OCR correction, TSV bounding-box inspection, PII review, manual black-box redaction drawing, Act Date confirmation, and anonymization generation; accessible strictly to `admin` and `arhivar`.
  12. Notarial Nomenclature (`DS-012`): Accessible to `admin` and `arhivar` for browsing and applying official CSV revisions.
- **Why:** Records the revised home Screen and role access confirmed by the owner.
- **Evidence:** D-032 and owner approval in chat on 2026-11-24
- **Source:** user · confidence high
- **Confirmed:** 2026-11-24

## D-043 · Browser session authentication lifetime and login throttling
- **Status:** approved
- **Date:** 2026-11-24
- **Rule:** Authenticate first-party browser API requests with Laravel database-backed sessions and CSRF protection; do not accept bearer tokens on application routes. End a session after 30 minutes without activity or 12 hours after authentication, whichever comes first. Use encrypted, browser-close, host-only, HttpOnly, SameSite=Lax cookies; set Secure cookies in production. Limit failed credential attempts to five per normalized username and client IP within one minute, then return HTTP 429 for further attempts during that window. Do not count credential-validation errors toward the limit.
- **Why:** Replaces browser bearer-token storage with same-origin session cookies and places fixed idle and maximum limits on each authenticated session while retaining the approved login-throttling behavior.
- **Evidence:** [M1a.1 plan](plans/p22-m1a-1-login-and-application-foundation.md) and owner approval in chat on 2026-11-24.
- **Source:** user · confidence high
- **Confirmed:** 2026-11-24

## D-044 · Retention eligibility date calculation
- **Status:** approved
- **Date:** 2026-11-27
- **Rule:** For a retention term of N calendar years and a known Retention Computation Base B, the first eligible retention date is B plus N calendar years. If B is February 29 and the target year is not a leap year, use February 28. This date marks retention eligibility only; it does not authorize destruction. Destruction remains subject to D-035, including any required Selection Commission review and the Admin's explicit confirmation.
- **Why:** M2 needs one deterministic eligibility date across retention bases while keeping eligibility separate from authority to destroy.
- **Evidence:** Owner approval of the M2 plan on 2026-11-27.
- **Source:** user · confidence high
- **Confirmed:** 2026-11-27

## D-046 · Physical Dossier record identity and catalogue fields
- **Status:** approved
- **Date:** 2026-11-27
- **Rule:** Physical Dossier printed numbers are unique. Each record stores its printed number, Archival Indicator, Inventory Number, retention term, and an optional short description. The selected Notarial Nomenclature entry determines the Archival Indicator and retention term. Staff may select only dossiers matching both values; if none exists, an Admin or Arhivar may create one by providing its printed number and Inventory Number (plus optional description), while the server derives the indicator and retention term. Dossier selection in the Editor displays the printed number and sends the stable record ID. Only `admin` and `arhivar` may create dossier records; `admin` and `arhivar` may select them.
- **Why:** Dossiers retain documents with matching nomenclature indicator and retention, and these catalogue fields identify the physical records without exposing database IDs. Admin and Arhivar both perform the approved archive intake workflow.
- **Evidence:** Owner confirmation of dossier fields and matching-classification workflow in chat on 2026-11-27; owner approval of Arhivar dossier creation and the D-045 amendment on 2026-11-27.
- **Source:** user · confidence high
- **Confirmed:** 2026-11-27
