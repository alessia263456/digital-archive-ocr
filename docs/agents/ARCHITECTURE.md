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
         +---> [PII Pipeline: Checksums (CNP, IBAN) + Romanian Notarial Anchors] [D-005]
         |          |
         |          +---> High confidence: Auto-redact (burn black boxes onto scan copy)
         |          +---> Medium confidence / Names: Human Review Queue (Arhivar review)
         |
         +---> [Storage: Original Scans (Arhivar/Admin only) vs Redacted Scans (Cititor)]
```

## Parts
| Part | Path | Responsibility | Talks to |
|---|---|---|---|
| Frontend | `frontend/` (pending) | React visual UI for archive browsing, scan uploads, bounding box correction, and archivist review | Laravel Backend |
| Backend API | `backend/` (pending) | Laravel application: auth, folder permissions, versioning, PII detection, retention | PostgreSQL, Storage, Tesseract |
| OCR Engine | Docker (Tesseract) | Tesseract OCR with `tesseract-ocr-ron` producing TSV word coordinates | Laravel Backend |
| Database | Docker service | PostgreSQL relational database for catalog, versions, PII detections, and access rules | Laravel Backend |
| Storage | Docker volume / disk | Physical scan storage segregating original scans from visually redacted copies | Laravel Backend |
| Visual Testing | `frontend/` (Playwright) | Automated desktop and mobile screenshot capture in light/dark themes ([D-006](DECISIONS.md#D-006)) | Frontend UI |

## Data flow
1. **Upload & Ingestion:** User (`arhivar` / `admin`) uploads document scan via React UI; Laravel validates folder permissions and creates an immutable initial document version ([D-002](DECISIONS.md#D-002)).
2. **OCR Extraction:** Laravel dispatches Tesseract job in Docker with Romanian language pack (`tesseract-ocr-ron`), emitting TSV output with word coordinates (`left`, `top`, `width`, `height`) ([D-004](DECISIONS.md#D-004)).
3. **PII Detection & Checksum Validation:**
   - Evaluates mathematical checksums: Romanian CNP (control digit weights `279146358279` mod 11) and IBAN (MOD-97).
   - Scans for Romanian notarial context anchors (e.g. `subsemnatul`, `numitul`, `domiciliat în`, `identificat prin CI`) to identify person names ([D-005](DECISIONS.md#D-005)).
4. **Scoring & Routing:**
   - High-confidence matches (valid checksum + context anchor) auto-redact.
   - Detected person names and unvalidated/corrupted OCR matches are assigned medium confidence and routed to the Human Review Queue. Public notary titles/names are explicitly excluded from redaction ([D-005](DECISIONS.md#D-005)).
5. **Visual Redaction:**
   - Burning solid black boxes onto a generated public scan copy using TSV bounding-box coordinates (with manual rect drawing support in UI).
   - Redacted text is masked in the full-text search index and catalog.
6. **Access Control & Serving:**
   - `cititor` role sees only approved, redacted scan copies and masked text.
   - `arhivar` / `admin` role retains access to the unredacted original in the private archive ([D-005](DECISIONS.md#D-005)).
7. **Retention:** Scheduled retention policies enforce preservation schedules or archival actions ([D-002](DECISIONS.md#D-002)).

## State and storage
| What | Where | Owner | Notes |
|---|---|---|---|
| Document metadata & catalog | PostgreSQL | Laravel Backend | Folders, permissions, document versions, retention policies |
| PII detections & review queue | PostgreSQL | Laravel Backend | Detected entities, confidence scores, bounding boxes, review status |
| Original document scans | Storage (private) | Laravel Backend | Restricted to `admin` / `arhivar` |
| Redacted document copies | Storage (public) | Laravel Backend | Burned black-box images/PDFs served to `cititor` |
| UI State & review canvas | React state | Frontend | Transient canvas state for manual bounding-box adjustment |

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
- Access boundary: `cititor` (redacted only) vs `arhivar`/`admin` (unredacted original) ([D-005](DECISIONS.md#D-005)).
- Immutability boundary: Document versions cannot be edited in place; new versions are appended ([D-002](DECISIONS.md#D-002)).
- PII redaction boundary: Redaction physically burns black pixels into the scan copy, preventing client-side unmasking.
- Contracts between services are defined in [CONTRACTS.md](CONTRACTS.md).
