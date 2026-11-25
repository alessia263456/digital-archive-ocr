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
         v (same-origin REST API / Sanctum session + CSRF)
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
| Frontend | `frontend/` | React scaffold with browser-selected light and dark themes | Standalone static assets |
| Backend API | `backend/` | Laravel scaffold, boot health check and local PDF/JPG/PNG page rendering with Poppler and PHP GD. | PostgreSQL, Storage, Tesseract |
| OCR Engine | `docker/ocr-worker/` | Romanian Tesseract smoke command and long-running Laravel database-queue worker | PostgreSQL private drafts and OCR pages; private object storage |
| Database | Compose service `postgres` | PostgreSQL relational database for catalog, versions, PII detections, and access rules | Laravel Backend |
| Storage | Private object storage | Original Document Scans and derived redacted copies | Laravel Backend |
| Visual Testing | `frontend/` (Playwright) | Automated desktop and mobile screenshot capture in light/dark themes ([D-006](DECISIONS.md#D-006)) | Frontend UI |

PostgreSQL accounts live in `users` with required unique usernames, password hashes, and roles constrained to `admin`, `arhivar`, or `cititor`. `physical_dossiers` uses a generated primary key for stable relationships and stores the printed Physical Dossier Number as text; printed numbers may repeat.

## Data flow
1. **Ingestion.** Authenticated `admin` or `arhivar` staff upload one PDF or DOCX item, or submit an ordered JPG/PNG collection as one private draft through `POST /api/drafts`. PostgreSQL stores each draft's UUID, source format, ordered private object keys, optional DOCX-derived PDF key, timestamps, and initial `queued` status. `GET /api/drafts/{id}` returns the UUID and persisted status only. The DS-003 Screen keeps returned draft IDs in frontend state for the current Screen session and refreshes each status only after an explicit staff action; it does not poll or restore IDs after a reload. Transfer or OCR completion does not approve or index a document. DOCX conversion stages privately on the local disk and publishes the derived PDF to the configured private document disk. A worker later advances the status. The later exact SHA-256 save check warns and blocks an identical document under D-025. A matching act number and Act Date warns and lets staff create a new Document Version, save separately, or abandon the save. Keep uploaded DOCX originals and derive PDFs for viewing, Redaction, and sharing.
2. **OCR Extraction.** A database-queue worker runs Tesseract with Romanian language data and retains TSV word Bounding Boxes in one extraction linked to the draft. Ordered image collections retain page order. After the initial failure and three failed retries, move the Document Scan to the Quarantine Queue and store an in-app notification for each Arhivar account.
3. **Review and approval.** DS-011 supports OCR correction, metadata confirmation, and manual Bounding Boxes. Detect and review PII under D-022. Burn detected and manual Redactions into the derived copy and remove covered PDF text. Require explicit review and confirmation of required metadata and the applicable retention date before saving and indexing.
4. **Versioning and search.** Initial approval saves an immutable Document Version. Approving a replacement, underlying file update, or corrected redacted PDF creates a new version. An approved OCR-only correction reindexes the same version and is audited. Keep the current approved version searchable during replacement review, then index only the newly approved version. Metadata changes are recorded in the Append-Only Audit Log. Each digital document belongs to exactly one Physical Dossier, and its current assignment determines browsing and Folder Permissions. `admin` and `arhivar` can open prior versions and search for Signatory Party names. `cititor` can search approved redacted text in granted Physical Dossiers, including when browsing by type or year.
5. **Sharing and audit.** An expiring Share Link pins the selected original or redacted PDF to one Document Version and can require a password. `admin` and `arhivar` can revoke links. Create links only after approval and manage active links in DS-008. Staff manually revoke links to PDFs with missed Redactions. Record creation and each external view or download with link ID, exact Document Version, action, and time. Cititor downloads of approved redacted PDFs are audited.
6. **Retention and destruction.** Calculate the deadline from the confirmed date prescribed by the Notarial Nomenclature, including a stated future contractual expiry. Allow approval with an unknown date and omit pending records from the Destruction List until a deadline is calculated. In DS-012, admin and arhivar apply official CSV revisions. New approvals use the revised rules. Existing documents retain their rules until reviewed and updated, with the prior rule retained in the audit log. Group expired records by C.S. status. Admins can extend deadlines or confirm batch destruction. Destroy the Document Scan and all versions, end access to them, and retain the audit evidence defined in D-035 indefinitely.

See [approved archive workflows](decisions/archive-workflows.md) for D-022 through D-039 and [Open Questions](OPEN-QUESTIONS.md) for unresolved details.

## State and storage
| What | Where | Owner | Notes |
|---|---|---|---|
| Catalog and search | PostgreSQL | Laravel Backend | Approved versions, confirmed metadata, Physical Dossiers, permissions, and retention dates |
| Private drafts and review | PostgreSQL and private object storage | Laravel Backend | `document_drafts` stores source format, ordered original object keys, optional derived PDF key, and persisted lifecycle status; upload and resume are restricted to `admin` and `arhivar`; resume returns only the draft ID and current status, and either role may resume any draft |
| In-app notifications | PostgreSQL `notifications` table | Laravel Backend | Quarantine notices are stored for each `arhivar` account |
| Original and redacted copies | Private object storage | Laravel Backend | Authorized internal access and version-pinned Share Links |
| Append-Only Audit Log | Server-side | Laravel Backend | Access, changes, sharing, and retained destruction evidence |
| Review canvas | React state | Frontend | Transient Bounding Box adjustments |

## Configuration
| Name | Where set | Used by | Notes |
|---|---|---|---|
| `DB_*` | Compose environment | Laravel Backend | PostgreSQL connection parameters |
| `APP_KEY` | Compose environment | Laravel Backend | Encryption key |
| `DOCUMENTS_DISK` | Private deployment environment | Laravel Backend | Set to `r2` for the live private document disk |
| `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY` | Private deployment environment | Laravel Backend | Rotated R2 credentials; never store in tracked files |
| `R2_BUCKET`, `R2_ENDPOINT` | Private deployment environment | Laravel Backend | Private EU-jurisdiction bucket and its S3-compatible endpoint |
| `R2_DEFAULT_REGION`, `R2_USE_PATH_STYLE_ENDPOINT` | Private deployment environment | Laravel Backend | Defaults: `auto` and `false` |
| `VITE_*` | `frontend/.env` | React Frontend | API URL and frontend environment |
| `SANCTUM_STATEFUL_DOMAINS` | Compose environment | Laravel Backend | Exact local Vite origin and live application host |
| `SESSION_*` | Compose environment | Laravel Backend | Encrypted PostgreSQL-backed browser sessions and cookie policy |
<!-- names only, never values -->

The live Compose model requires the R2 key, secret, bucket, and endpoint and passes them only to the backend. The endpoint must use the EU-jurisdiction R2 hostname. Live object round-trip verification remains pending P22-56b.

## Build, deploy, runtime
Compose runs the local Laravel service `backend` against PostgreSQL after its readiness check passes. The `pgdata` volume holds the development database `archive` and the dedicated PHPUnit database `archive_test`. On the first start PostgreSQL creates both databases. Laravel exposes its boot health route at `/up` on loopback port 8000. Rebuild after source changes. Compose defines the one-shot `ocr-worker` smoke service and the long-running `ocr-queue-worker` database-queue service. Both backend and queue worker share the local private-document volume when `DOCUMENTS_DISK=local`; the live Compose worker receives the same R2 configuration as the backend. Build the image with `docker compose build ocr-worker` and verify Romanian OCR with `docker compose run --rm ocr-worker`. The smoke command checks Tesseract TSV against a synthetic fixture. The queue worker handles private queued drafts and persists one extraction UUID per draft; that UUID selects ordered rows in `ocr_pages` with source digests, page dimensions, text, raw TSV and word records. `RedactedPdf::create` accepts page-indexed pixel boxes and publishes a fresh image-only PDF from GD-processed pages using img2pdf. See [D-001](DECISIONS.md#D-001) and [AGENTS.md](../../AGENTS.md) sections 2 and 5.

The [temporary Caddy service](../../docker/placeholder/README.md) has a separate Compose project on the Azure VM. It owns TCP 80 and 443 when running. The authenticated placeholder is live. Public HTTPS and credential checks passed before and after container recreation using the same certificate volume.

The [live skeleton configuration](../../docker/live/README.md) uses a separate Compose project named `archive-live`. Its public Caddy service serves the React build, challenges all requests using the placeholder’s bcrypt import and forwards `/up`, `/api` and `/api/*`, and `/sanctum` and `/sanctum/*` to the private FrankenPHP classic listener. Caddy removes the hosting credential before forwarding and sets a restrictive same-origin Content Security Policy without access logging. Laravel uses PostgreSQL on the project network. Only Caddy publishes host ports and mounts the external placeholder certificate volume. P22-56b owns the future listener switch and can restore the placeholder by stopping live Caddy and restarting placeholder Caddy.

## Boundaries
- Frontend / Backend REST API boundary uses same-origin Laravel Sanctum sessions with CSRF protection. Sessions expire after 30 minutes idle or 12 hours maximum; logout invalidates the session. Application routes reject bearer-token-only requests. Login limits failed credentials to five attempts per normalized username and client IP per minute (D-043). The reusable `role` middleware enforces allowed role groups on protected routes; resource tasks apply it to their routes.
- Folder Permissions restrict `cititor` by Physical Dossier. External access is limited to the selected PDF through its Share Link.
- Immutability boundary: Document versions cannot be edited in place; new versions are appended ([D-002](DECISIONS.md#D-002)).
- PII redaction boundary: Redaction physically burns black pixels into the scan copy, preventing client-side unmasking.
- Contracts between services are defined in [CONTRACTS.md](CONTRACTS.md).
