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
