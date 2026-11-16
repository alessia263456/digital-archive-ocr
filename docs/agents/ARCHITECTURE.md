# Architecture — proiect1

<!-- graffino-agentic:begin v1 -->
> How this repo is built, generated from the code at backfill and kept current by
> whoever changes the structure. The code wins: when this page is wrong, fix it.
<!-- graffino-agentic:end -->

## Overview
Digital archive web application `digital-archive-ocr` (`proiect1`).
Composed of a React frontend, a Laravel backend API, a PostgreSQL relational database, and an OCR/anonymization processing pipeline, containerized with Docker ([D-001](DECISIONS.md#D-001), [D-002](DECISIONS.md#D-002)).

```text
[Browser Client (React)]
         |
         v (HTTP / REST)
[Laravel Backend API (Docker)] <---> [PostgreSQL (Docker)]
         |
         +---> [Storage: Document Scans & Versions]
         |
         +---> [OCR Extraction & Anonymization Engine]
```

## Parts
| Part | Path | Responsibility | Talks to |
|---|---|---|---|
| Frontend | `frontend/` (pending) | React visual UI for browsing, uploading, viewing, and searching archive documents | Laravel Backend |
| Backend API | `backend/` (pending) | Laravel application: auth, permissions, versioning, retention, business logic | PostgreSQL, Frontend, OCR Service |
| Database | Docker service | PostgreSQL relational database for users, documents, versions, permissions, retention rules | Laravel Backend |
| File Storage | Docker volume / disk | Preserves original document scans and versioned assets | Laravel Backend |

## Data flow
1. User uploads document scan via React UI; Laravel backend validates permissions and creates an immutable initial document version ([D-002](DECISIONS.md#D-002)).
2. Laravel dispatches OCR extraction and personal data detection/anonymization task.
3. Extracted text and anonymized copy are indexed in PostgreSQL.
4. User searches or browses documents respecting folder-level permissions.
5. Retention policies evaluate document age and trigger scheduled actions.

## State and storage
| What | Where | Owner | Notes |
|---|---|---|---|
| Document metadata & catalog | PostgreSQL | Laravel Backend | Relational models for folders, permissions, versions, retention |
| Document scans & files | Filesystem / Docker volume | Laravel Backend | Original and redacted scan assets |
| UI State | React state / browser cache | Frontend | Transient client session state |

## Configuration
| Name | Where set | Used by | Notes |
|---|---|---|---|
| `DB_*` | `.env` / Docker Compose | Laravel Backend | PostgreSQL connection parameters |
| `APP_KEY` | `.env` | Laravel Backend | Encryption key |
| `VITE_*` | `frontend/.env` | React Frontend | API base URL and client config |
<!-- names only, never values -->

## Build, deploy, runtime
Multi-container architecture managed via Docker Compose ([D-001](DECISIONS.md#D-001)). See [AGENTS.md](../../AGENTS.md) sections 2 and 5.

## Boundaries
- Frontend / Backend REST API boundary with token/session authentication.
- Folder-level permission boundary enforcing role and folder access rules ([D-002](DECISIONS.md#D-002)).
- Document version immutability boundary preventing direct mutation of past versions.
- PII redaction boundary ensuring sensitive text is masked according to anonymization rules.
- Contracts between services are defined in [CONTRACTS.md](CONTRACTS.md).
