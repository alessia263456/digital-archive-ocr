# digital-archive-ocr — proiect1

Digital archive web application for a **Notary Cabinet** (*Cabinet Individual Notarial*).
Its primary job: let staff find the **Physical Dossier Number** faster than the paper
Alphabetical Index, while storing redacted copies of Document Scans for GDPR-safe sharing.

---

## Scope

| Area | What the application does |
|---|---|
| Upload | Drag & drop PDF / JPG / PNG / DOCX; async processing pipeline (`în coadă → OCR → indexat → eroare`); exact-hash duplicate blocked; near-duplicate warning |
| OCR | Tesseract with Romanian language pack (`tesseract-ocr-ron`); TSV word bounding-box output; inline text correction by archivist |
| Metadata | Auto-extracted dates, amounts, document numbers shown as editable suggestions; archivist confirms before indexing; Act Date required |
| Search | Full-text search (PostgreSQL `tsvector`, Romanian dictionary); filters by folder, type, date, tags; sorted by relevance; results highlighted |
| PII detection | CNP checksum + IBAN checksum + Romanian notarial context anchors; auto-redact high-confidence; human review queue for names and uncertain matches |
| Redaction | Pixel-level black-box burn on a redacted copy; manual bounding-box drawing in the document viewer for missed PII; original restricted to `admin` / `arhivar` |
| Versioning | Immutable Document Versions; re-upload creates a new version, never overwrites |
| Audit | Append-Only Audit Log; tamper-evident; records every view, download, export, modification with user and timestamp; answers GDPR access requests |
| Permissions | Folder-level access control per role and per user; Signed URLs for sharing (expiry + optional password) |
| Retention | Calculated from Act Date (never upload date); destruction list reviewed and confirmed manually by Admin; C.S.-flagged documents shown separately |
| Quarantine | Documents that fail OCR after N retries are moved to Quarantine Queue; archivist re-triggers or marks permanently failed |
| Deduplication | Exact file hash → blocked; near-duplicate OCR text → warning, archivist may proceed |

**Out of scope:** multi-tenant / multi-organisation, email notifications, SSO, automatic deletion, Selection Commission quorum enforcement.

---

## Stack

| Layer | Technology |
|---|---|
| Frontend | React |
| Backend | Laravel (PHP) |
| Database | PostgreSQL |
| OCR engine | Tesseract + `tesseract-ocr-ron` (Docker) |
| Search | PostgreSQL `tsvector` with Romanian dictionary |
| Storage | Object storage, Signed URLs — no public permanent URLs |
| Containerisation | Docker (all server-side services) |
| Backend tests | PHPUnit |
| UI testing & screenshots | Playwright (desktop + mobile, light + dark) |

---

## Project variables

| Variable | Value |
|---|---|
| Organisation | Cabinet Individual Notarial (single-tenant — one cabinet only) |
| Document corpus | 30 real notarial scans, used for the Definition of Done demo |
| OCR language | Romanian (`tesseract-ocr-ron`), TSV output |
| PII auto-redact threshold | CNP or IBAN with valid checksum **and** a Notarial Context Anchor in proximity |
| PII human review | Person names; matches with invalid/uncertain checksum; corrupted OCR |
| Retention source | `docs/nomenclator_arhivistic.csv` (official Notarial Nomenclature, UNNPR 2014) |
| Retention base | Act Date — from 1 Jan of the following year, or contract/dossier resolution date |
| Folder structure | See Q-008 (open — pending client answer) |
| Application language | Romanian only |
| Notifications | In-app only (badge / notification panel) |
| Figma | [arhiva-digitala-ocr-Design](https://www.figma.com/design/r5IWZRotEZKlAGFdzwnPlx/arhiva-digitala-ocr-Design?node-id=0-1&m=dev&t=amZfs8cD2ZGcZonq-1) |

---

## Roles

| Role | Person in cabinet | Access |
|---|---|---|
| `admin` | Notar Public | Full access; user management; folder management; retention confirmation; share link creation (redacted or original) |
| `arhivar` | Arhivar + Secretar Notarial | Original scans; PII review queue; metadata & Act Date confirmation; inline OCR correction; manual redaction drawing; quarantine management; share link creation |
| `cititor` | Other internal staff and interns | Redacted scans only; full-text search; no link creation |
| *(unauthenticated)* | External recipient | Share link viewer only — view and download PDF of the shared copy |

---

## Screens

| # | ID | Screen | Visible to |
|---|---|---|---|
| 1 | `DS-001` | Document list / Search results | All logged-in (`admin`, `arhivar`, `cititor`) |
| 2 | `DS-002` | Document viewer (read-only) | All logged-in (original: `admin`/`arhivar`; redacted: `cititor`) |
| 3 | `DS-003` | Upload | `admin`, `arhivar` |
| 4 | `DS-004` | Human Review Queue & Quarantine | `admin`, `arhivar` |
| 5 | `DS-005` | Retention & Destruction list | `admin` |
| 6 | `DS-006` | Admin panel (users, folders, permissions) | `admin` |
| 7 | `DS-007` | Dashboard / statistics | `admin`, `arhivar` |
| 8 | `DS-008` | Audit Log viewer | `admin`, `arhivar` |
| 9 | `DS-009` | Public share link viewer | unauthenticated (valid signed URL) |
| 10 | `DS-010` | Login | unauthenticated |
| 11 | `DS-011` | Document Editor & Anonymization | `admin`, `arhivar` |

---

## Commands

```bash
# install
# not run: pending project scaffolding

# build
# not run: pending project scaffolding

# run
# not run: pending docker-compose configuration

# test (backend)
# not run: pending Laravel PHPUnit setup (see D-003)

# lint / type-check
python3 docs/agents/tools/ledger-lint.py

# screenshot (visual apps)
# not run: pending Playwright setup (see D-006)
```

---

## Key deliverables (Definition of Done)

- 30 real documents processed; a search query returns a result in under 2 seconds.
- PII redaction working visually on ≥ 5 documents with CNP / IBAN / names, with validator tests.
- A corrupt file does not block the queue (automated test).
- Audit log is append-only and answers "who viewed document X".
- Archivist tested 5 real searches; results documented in `INTERVIEW.md`.

---

## Ledger

Agent rules, decisions, patterns, contracts, and open questions live in
[`docs/agents/`](docs/agents/README.md).
