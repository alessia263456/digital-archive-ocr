# Open questions — proiect1

<!-- graffino-agentic:begin v1 -->
> Unknowns. Work that depends on an open question is out of scope until it is
> answered. Only the user answers; an agent never answers by guessing. An agent may
> write a `Proposed answer` the evidence supports; the question stays
> `investigating` until the user confirms it.
> Answered entries stay, with the answer and date, and usually become a D- or PATTERN-.
<!-- graffino-agentic:end -->

## Index
- Q-001 · What tech stack, framework, and build tools will proiect1 use? · _answered_
- Q-002 · What is the purpose, domain, and feature scope of proiect1? · _answered_
- Q-003 · How will automated tests and linting be executed? · _answered_
- Q-004 · How do we screenshot this app? · _answered_
- Q-005 · What OCR engine should be used for text extraction from scans? · _answered_
- Q-006 · What tool or pipeline should perform personal data detection and anonymization? · _answered_
- Q-007 · What visual testing or screenshot tool should be used for the React frontend? · _answered_
- Q-008 · Should application folders mirror Archival Indicator categories with retention pre-filled, or be free-form? · _answered_
- Q-009 · Will a Figma account be used as an external design source / snapshot tool for this project? · _answered_
- Q-010 · How many consecutive OCR processing failures before a document is moved to the Quarantine Queue? · _answered_
- Q-011 · What text similarity threshold defines a Near-Duplicate at upload time? · _answered_
- Q-012 · What expiry options are available when creating a Share Link (fixed durations, custom date, or both)? · _answered_
- Q-013 · Where and how will the remaining Screen designs be approved? · _answered_
- Q-014 · What should staff do if a required retention event has not occurred? · _answered_
- Q-015 · What should the audit record identify for an unauthenticated Share Link access? · _answered_
- Q-016 · How should a correction to an Archival Indicator be made when the classification is wrong? · _answered_

### [Notarial nomenclature](questions/notarial-nomenclature.md)
- Q-017 · How should official revisions to the Notarial Nomenclature be applied? · _answered_
- Q-018 · Should Arhivar have read-only access to the Notarial Nomenclature in the Application? · _answered_
- Q-019 · Should there be a dedicated Screen to view the Notarial Nomenclature and import CSV updates? · _answered_

---

## Q-001 · What tech stack, framework, and build tools will proiect1 use?
- **Status:** answered 2026-11-16
- **Blocks:** AGENTS.md section 2 commands, package management, build tooling
- **Who answers:** repository owner
- **Proposed answer:**
- **Answer:** React frontend, Laravel backend, PostgreSQL database, with everything server-related running on Docker.
- **Recorded as:** D-001

## Q-002 · What is the purpose, domain, and feature scope of proiect1?
- **Status:** answered 2026-11-16
- **Blocks:** CONTEXT.md domain vocabulary, ARCHITECTURE.md data flow and models
- **Who answers:** repository owner
- **Proposed answer:**
- **Answer:** Digital archive web app for uploading and browsing document scans, extracting text via OCR, searching and indexing documents, personal data detection and anonymization, versioning, folder-level permissions, and retention policies.
- **Recorded as:** D-002

## Q-003 · How will automated tests and linting be executed?
- **Status:** answered 2026-11-16
- **Blocks:** Definition of done test command and CI workflows
- **Who answers:** repository owner
- **Proposed answer:**
- **Answer:** PHPUnit for backend automated tests.
- **Recorded as:** D-003

## Q-004 · How do we screenshot this app?
- **Status:** answered 2026-11-16
- **Blocks:** Automated UI screenshot capture in AGENTS.md section 2 and build verification
- **Who answers:** repository owner
- **Proposed answer:**
- **Answer:** Playwright headless browser automation against the React frontend for desktop and mobile viewports, light and dark modes.
- **Recorded as:** D-006

## Q-005 · What OCR engine should be used for text extraction from scans?
- **Status:** answered 2026-11-16
- **Blocks:** OCR extraction service design and Docker dependencies
- **Who answers:** repository owner
- **Proposed answer:**
- **Answer:** Tesseract OCR running in the Docker container, explicitly packaging tesseract-ocr-ron and emitting TSV word bounding-box coordinates for visual redaction.
- **Recorded as:** D-004

## Q-006 · What tool or pipeline should perform personal data detection and anonymization?
- **Status:** answered 2026-11-16
- **Blocks:** Anonymization pipeline architecture and dependencies
- **Who answers:** repository owner
- **Proposed answer:**
- **Answer:** Rule, mathematical checksum (CNP/IBAN), and Romanian notarial contextual anchor detection in Laravel, confidence scoring, human review queue, and pixel-level black box burning via TSV bounding boxes.
- **Recorded as:** D-005

## Q-007 · What visual testing or screenshot tool should be used for the React frontend?
- **Status:** answered 2026-11-16
- **Blocks:** Definition of done UI screenshot requirements
- **Who answers:** repository owner
- **Proposed answer:**
- **Answer:** Playwright test runner configured for desktop and mobile viewport screenshots, light and dark themes.
- **Recorded as:** D-006

## Q-008 · Should application folders mirror Archival Indicator categories with retention pre-filled, or be free-form?
- **Status:** answered 2026-11-19
- **Blocks:** Folder data model, Admin panel folder creation UI, retention policy assignment workflow
- **Who answers:** repository owner (after checking with client)
- **Proposed answer:**
- **Answer:** Provide three ways to browse the same archive: Physical Dossier, document type, and year. Folder Permissions are assigned by Physical Dossier and apply in each mode.
- **Recorded as:** D-023

## Q-009 · Will a Figma account be used as an external design source / snapshot tool for this project?
- **Status:** answered 2026-11-18
- **Blocks:** `docs/design/DESIGN.md` Source section and optional Figma snapshots
- **Who answers:** repository owner
- **Proposed answer:**
- **Answer:** Yes, external Figma design project linked at https://www.figma.com/design/r5IWZRotEZKlAGFdzwnPlx/arhiva-digitala-ocr-Design?node-id=0-1&m=dev&t=amZfs8cD2ZGcZonq-1 as an external snapshot/review board.
- **Recorded as:** docs/design/DESIGN.md

## Q-010 · How many consecutive OCR processing failures before a document is moved to the Quarantine Queue?
- **Status:** answered 2026-11-19
- **Blocks:** Async pipeline worker retry configuration; Quarantine Queue trigger logic
- **Who answers:** repository owner
- **Proposed answer:** 3 retries — a common queue default; avoids over-retrying a truly corrupted file; aligns with the brief's "N eșecuri"
- **Answer:** Quarantine after the initial OCR failure plus three failed retries.
- **Recorded as:** D-026

## Q-011 · What text similarity threshold defines a Near-Duplicate at upload time?
- **Status:** answered 2026-11-19
- **Blocks:** Near-duplicate detection algorithm; upload warning UI
- **Who answers:** repository owner
- **Proposed answer:** ≥ 85 % trigram similarity on the extracted OCR text (`pg_trgm`); tunable after testing on the real Document Corpus
- **Answer:** Use matching act number and Act Date for the possible-duplicate warning. Exact SHA-256 matches warn and block saving.
- **Recorded as:** D-025

## Q-012 · What expiry options are available when creating a Share Link (fixed durations, custom date, or both)?
- **Status:** answered 2026-11-19
- **Blocks:** Share link creation UI; Signed URL generation parameters
- **Who answers:** repository owner
- **Proposed answer:** Fixed preset durations (1 day, 7 days, 30 days) plus a custom date picker; a link with no expiry is not permitted
- **Answer:** Offer 24 hours, 7 days, 30 days, and any custom future expiry date.
- **Recorded as:** D-024

## Q-013 · Where and how will the remaining Screen designs be approved?
- **Status:** answered 2026-11-20
- **Blocks:** Approval and implementation of the remaining Screen designs.
- **Who answers:** repository owner
- **Proposed answer:**
- **Answer:** Review repository mocks or screenshots in chat and explicitly approve each Screen in chat.
- **Recorded as:** docs/design/DESIGN.md

## Q-014 · What should staff do if a required retention event has not occurred?
- **Status:** answered 2026-11-20
- **Blocks:** Final save for documents whose contract expires, dossier resolves, or deposit is released later.
- **Who answers:** repository owner
- **Proposed answer:**
- **Answer:** Approve with the retention date pending when unknown. Enter it once confirmed and keep the document off the Destruction List until a deadline can be calculated. Confirm known future contractual expiry dates at approval.
- **Recorded as:** D-035

## Q-015 · What should the audit record identify for an unauthenticated Share Link access?
- **Status:** answered 2026-11-20
- **Blocks:** Audit event fields and verification of external views and downloads.
- **Who answers:** repository owner
- **Proposed answer:**
- **Answer:** Record link ID, exact Document Version, action, and time for every external view or download. Verify recipient identity offline.
- **Recorded as:** D-034

## Q-016 · How should a correction to an Archival Indicator be made when the classification is wrong?
- **Status:** answered 2026-11-20
- **Blocks:** DS-011 classification controls and validation.
- **Who answers:** repository owner
- **Proposed answer:**
- **Answer:** Correct the document type, subtype, or Storage Context so the Application derives the proper Archival Indicator and retention rule.
- **Recorded as:** D-038
