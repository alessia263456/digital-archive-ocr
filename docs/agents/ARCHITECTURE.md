# Architecture — proiect1

<!-- graffino-agentic:begin v1 -->
> How this repo is built, generated from the code at backfill and kept current by
> whoever changes the structure. The code wins: when this page is wrong, fix it.
<!-- graffino-agentic:end -->

## Overview
Digital archive web application `digital-archive-ocr` (`proiect1`).
Composed of a React frontend, a Laravel backend API, a PostgreSQL relational database, and an OCR/PII redaction processing pipeline containerized with Docker ([D-001](DECISIONS.md#D-001), [D-002](DECISIONS.md#D-002)).

```text
[Browser Client (React)]
         |
         v (REST API / Sanctum)
[Laravel Backend API (Docker)] <---> [PostgreSQL (Docker)]
         |
         +---> [Tesseract OCR + tesseract-ocr-ron (Docker)] ---> Emits TSV (Word Bounding Boxes) [D-004]
         |
         +---> [PII detection and private draft review] ---> [Approved Document Version]
         |
         +---> [Private object storage: original and redacted copies]
```

## Parts
| Part | Path | Responsibility | Talks to |
|---|---|---|---|
| Frontend | `frontend/` (pending) | React visual UI for archive browsing, scan uploads, bounding box correction, and archivist review | Laravel Backend |
| Backend API | `backend/` (pending) | Laravel application: auth, folder permissions, versioning, PII detection, retention | PostgreSQL, Storage, Tesseract |
| OCR Engine | Docker (Tesseract) | Tesseract OCR with `tesseract-ocr-ron` producing TSV word coordinates | Laravel Backend |
| Database | Docker service | PostgreSQL relational database for catalog, versions, PII detections, and access rules | Laravel Backend |
| Storage | Private object storage | Original Document Scans and derived redacted copies | Laravel Backend |
| Visual Testing | `frontend/` (Playwright) | Automated desktop and mobile screenshot capture in light/dark themes ([D-006](DECISIONS.md#D-006)) | Frontend UI |

## Data flow
1. **Ingestion.** An `admin` or `arhivar` uploads a Document Scan into a resumable private draft. An exact SHA-256 match warns and blocks saving. A matching act number and Act Date warns and lets staff create a new Document Version, save separately, or abandon the save. Keep uploaded DOCX originals and derive PDFs for viewing, Redaction, and sharing.
2. **OCR Extraction.** A separate worker runs Tesseract with Romanian language data and retains TSV word Bounding Boxes. After the initial failure and three failed retries, move the Document Scan to the Quarantine Queue and notify the Arhivar.
3. **Review and approval.** DS-011 supports OCR correction, metadata confirmation, and manual Bounding Boxes. Detect and review PII under D-022. Burn detected and manual Redactions into the derived copy and remove covered PDF text. Require explicit review and confirmation of required metadata and the applicable retention date before saving and indexing.
4. **Versioning and search.** Initial approval saves an immutable Document Version. Approving a replacement or update to the underlying file creates a new version. Keep the current approved version searchable during replacement review, then index only the newly approved version. Metadata changes are recorded in the Append-Only Audit Log. Each digital document belongs to exactly one Physical Dossier, and its current assignment determines browsing and Folder Permissions. `admin` and `arhivar` can open prior versions and search for Signatory Party names. `cititor` can search approved redacted text in granted Physical Dossiers, including when browsing by type or year.
5. **Sharing and audit.** An expiring Share Link pins the selected original or redacted PDF to one Document Version and can require a password. `admin` and `arhivar` can revoke links. Record creation and every PDF view or download through a Share Link.
6. **Retention and destruction.** Calculate the deadline from the confirmed date prescribed by the Notarial Nomenclature. Group expired records by C.S. status. Admins can extend deadlines or confirm batch destruction. Destroy the Document Scan and all versions, end access to them, and retain the audit evidence defined in D-027 indefinitely.

See [approved archive workflows](decisions/archive-workflows.md) for D-022 through D-031 and [Open Questions](OPEN-QUESTIONS.md) for unresolved details.

## State and storage
| What | Where | Owner | Notes |
|---|---|---|---|
| Catalog and search | PostgreSQL | Laravel Backend | Approved versions, confirmed metadata, Physical Dossiers, permissions, and retention dates |
| Private drafts and review | PostgreSQL and private object storage | Laravel Backend | Draft metadata, PII detections, Bounding Boxes, review status, and uploaded originals |
| Original and redacted copies | Private object storage | Laravel Backend | Authorized internal access and version-pinned Share Links |
| Append-Only Audit Log | Server-side | Laravel Backend | Access, changes, sharing, and retained destruction evidence |
| Review canvas | React state | Frontend | Transient Bounding Box adjustments |

## Configuration
| Name | Where set | Used by | Notes |
|---|---|---|---|
| `DB_*` | `.env` / Docker Compose | Laravel Backend | PostgreSQL connection parameters |
| `APP_KEY` | `.env` | Laravel Backend | Encryption key |
| `TESSERACT_PATH` | `.env` | Laravel Backend | Path to Tesseract binary with `ron` support |
| `VITE_*` | `frontend/.env` | React Frontend | API URL and frontend environment |
<!-- names only, never values -->

## Build, deploy, runtime
Multi-container architecture managed via Docker Compose ([D-001](DECISIONS.md#D-001)). See [AGENTS.md](../../AGENTS.md) sections 2 and 5.

## Boundaries
- Frontend / Backend REST API boundary with role-based token authentication.
- Folder Permissions restrict `cititor` by Physical Dossier. External access is limited to the selected PDF through its Share Link.
- Immutability boundary: Document versions cannot be edited in place; new versions are appended ([D-002](DECISIONS.md#D-002)).
- PII redaction boundary: Redaction physically burns black pixels into the scan copy, preventing client-side unmasking.
- Contracts between services are defined in [CONTRACTS.md](CONTRACTS.md).
