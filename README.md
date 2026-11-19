# digital-archive-ocr — proiect1

Digital archive web application for a **Notary Cabinet** (*Cabinet Individual Notarial*).
Its primary job: let staff find the **Physical Dossier Number** faster than the paper
Alphabetical Index, while storing redacted copies of Document Scans for GDPR-safe sharing.

---

## Scope

| Area | What the application does |
|---|---|
| Upload | Drag & drop PDF / JPG / PNG / DOCX; asynchronous OCR and private drafts; explicit PII review before saving; preserve DOCX originals and generate PDFs for viewing, Redaction, and sharing |
| OCR | Tesseract with Romanian language pack (`tesseract-ocr-ron`); TSV word bounding-box output; inline text correction in DS-011 by `admin` or `arhivar` |
| Metadata | Auto-extracted dates, amounts, document numbers shown as editable suggestions; staff confirm before saving; Act Date, act number, Physical Dossier Number, and Inventory Number required. Derive the Archival Indicator from editable type, subtype, and Storage Context |
| Search | Full-text search (PostgreSQL `tsvector`, Romanian dictionary); filters by folder, type, date, and tags; results ranked by relevance with highlights and a Physical Dossier Number on every result. `cititor` can immediately search approved redacted text across all types within granted dossiers. Only `admin` and `arhivar` can look up Signatory Party names |
| PII detection | CNP checksum + IBAN checksum + Romanian notarial context anchors; detect and flag the fields listed below; every document requires explicit human approval, including documents with no uncertain matches |
| Redaction | Pixel-level black-box burn on a redacted copy; manual Bounding Box drawing in DS-011; strip redacted values from PDF text, and from text and metadata served to `cititor`. Staff can share a selected original or redacted PDF under the Share Link rules |
| Versioning | Immutable Document Versions. The current approved version remains searchable and viewable while edits are reviewed. Only the latest approved version is indexed; `admin` and `arhivar` can open older versions from version history |
| Audit | Append-Only Audit Log; tamper-evident; records views, downloads, exports, modifications, Share Link creation and each PDF view or download through a link. Retains access history and destruction evidence indefinitely after destruction |
| Permissions | Browse the same archive by Physical Dossier, document type, or year. Folder Permissions apply only to `cititor` across all three modes. Access is denied by default, and individual permissions take precedence |
| Retention | Confirm the applicable Retention Computation Base before saving. Group expired records by C.S. status. Admins can extend deadlines and must manually confirm batch destruction, which permanently deletes the Document Scan and all Document Versions. Selection Commission deliberations happen offline |
| Quarantine | Move the Document Scan to the Quarantine Queue after the initial failure and three failed retries; notify the Arhivar in the Application so they can retry or mark it permanently failed |
| Deduplication | An exact SHA-256 match warns, links to the existing document, and blocks the save. Matching act number and Act Date warns and lets staff save as a new Document Version, save separately, or abandon the save |

PII detection also flags addresses, identity-card details, Signatory Party signatures, cadastral and vehicle identifiers, and CUI/CIF for Redaction. Preserve the Notary Public name, title, and signature.

Either `admin` or `arhivar` can create and revoke Share Links. Each link serves the selected original or redacted PDF for a specific Document Version, with optional password protection and expiry after 24 hours, 7 days, 30 days, or on any custom future date. Recipient verification and written requests are handled offline.

After destruction, `admin` and `arhivar` can still see prior access events, who confirmed destruction, the act number, Act Date, document type, Physical Dossier Number, and Signatory Party names in the Append-Only Audit Log.

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
| Document corpus | 30 templates supplied by the Secretar Notarial and populated with test data for live acceptance |
| OCR language | Romanian (`tesseract-ocr-ron`), TSV output |
| PII auto-redact threshold | CNP or IBAN with valid checksum **and** a Notarial Context Anchor in proximity |
| PII human review | Explicit review of every document; flag names, uncertain matches, and corrupted OCR |
| Retention source | `docs/nomenclator_arhivistic.csv` (official Notarial Nomenclature, UNNPR 2014) |
| Retention base | The date prescribed by the Notarial Nomenclature, such as 1 January of the year after the Act Date, contract expiry, dossier resolution, or deposit release. Permanent Preservation has no destruction deadline |
| Folder structure | Three browsing modes with permissions assigned by Physical Dossier |
| Application language | Romanian only |
| Notifications | In-app only (badge / notification panel) |
| Figma | [arhiva-digitala-ocr-Design](https://www.figma.com/design/r5IWZRotEZKlAGFdzwnPlx/arhiva-digitala-ocr-Design?node-id=0-1&m=dev&t=amZfs8cD2ZGcZonq-1) |

---

## Roles

| Role | Person in cabinet | Access |
|---|---|---|
| `admin` | Notar Public | Full access; user management; folder management; retention confirmation; share link creation (redacted or original) |
| `arhivar` | Arhivar + Secretar Notarial | Original scans; PII review queue; metadata & Act Date confirmation; inline OCR correction; manual redaction drawing; quarantine management; share link creation |
| `cititor` | Other internal staff and interns | Approved redacted copies and redacted full-text search in granted Physical Dossiers |
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

- Process all 30 test documents in the live deployment; a search query returns a result in under 2 seconds.
- PII redaction working visually on ≥ 5 documents with CNP / IBAN / names, with validator tests.
- A corrupt file does not block the queue (automated test).
- Audit log is append-only and answers "who viewed document X".
- The Secretar Notarial runs five acceptance searches in the live deployment; record the results in `INTERVIEW.md`.

---

## Ledger

The [approved archive workflow decisions](docs/agents/decisions/archive-workflows.md) govern the scope above. Deferred design approval and unresolved workflow details are tracked in [Open Questions](docs/agents/OPEN-QUESTIONS.md#q-013--where-and-how-will-the-remaining-screen-designs-be-approved).

Agent rules, decisions, patterns, contracts, and open questions live in
[`docs/agents/`](docs/agents/README.md).
