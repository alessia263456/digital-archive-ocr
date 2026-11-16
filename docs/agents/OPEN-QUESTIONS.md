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
