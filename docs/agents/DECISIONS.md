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
