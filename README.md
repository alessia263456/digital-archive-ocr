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
| Versioning | Immutable Document Versions. The current approved version remains searchable and viewable while edits are reviewed. Approved OCR-only corrections reindex the same version and are audited. A corrected redacted PDF creates a new version. Only the latest approved version is indexed; `admin` and `arhivar` can open older versions from version history |
| Audit | Append-Only Audit Log; tamper-evident; records views, downloads, exports, modifications, Share Link creation and each PDF view or download through a link. Retains access history and destruction evidence indefinitely after destruction |
| Permissions | Browse the same archive by Physical Dossier, document type, or year. Folder Permissions apply only to `cititor` across all three modes. Access is denied by default, and individual permissions take precedence |
| Retention | Confirm the applicable Retention Computation Base at approval when known, including a stated future contract expiry. Unknown dates can remain pending after approval, and those documents stay off the Destruction List until a deadline can be calculated. Group expired records by C.S. status. Admins can extend deadlines and must manually confirm batch destruction, which permanently deletes the Document Scan and all Document Versions. Selection Commission deliberations happen offline |
| Quarantine | Move the Document Scan to the Quarantine Queue after the initial failure and three failed retries; notify the Arhivar in the Application so they can retry or mark it permanently failed |
| Deduplication | An exact SHA-256 match warns, links to the existing document, and blocks the save. Matching act number and Act Date warns and lets staff save as a new Document Version, save separately, or abandon the save |

PII detection also flags addresses, identity-card details, Signatory Party signatures, cadastral and vehicle identifiers, and CUI/CIF for Redaction. Preserve the Notary Public name, title, and signature.

After approval, either `admin` or `arhivar` can create Share Links and manage active links in DS-008. A missed Redaction requires manual revocation of affected links. External access events record link ID, exact Document Version, action, and time. DS-009 uses the title **Document partajat** and shows archival details only inside the selected PDF. Each link serves the selected original or redacted PDF for a specific Document Version, with optional password protection and expiry after 24 hours, 7 days, 30 days, or on any custom future date. Recipient verification and written requests are handled offline.

Staff correct the Archival Indicator through type, subtype, or Storage Context. Both archive roles can browse the full Notarial Nomenclature and apply official CSV revisions in DS-012. New approvals use the revised rules. Existing documents retain their rule until reviewed and updated, and the audit log preserves the prior rule.

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
| Document corpus | 30 test documents generated from about 10 distinct templates supplied by the Secretar Notarial for live acceptance |
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
| `cititor` | Other internal staff and interns | Approved redacted PDF viewing and downloads, and redacted full-text search in granted Physical Dossiers |
| *(unauthenticated)* | External recipient | Share link viewer only — view and download PDF of the shared copy |

---

## Screens

| # | ID | Screen | Visible to |
|---|---|---|---|
| 1 | `DS-001` | Document list / Search results | All logged-in (`admin`, `arhivar`, `cititor`) |
| 2 | `DS-002` | Document viewer (read-only) | All logged-in (both copies: `admin`/`arhivar`; approved redacted PDF only: `cititor`) |
| 3 | `DS-003` | Upload | `admin`, `arhivar` |
| 4 | `DS-004` | Human Review Queue & Quarantine | `admin`, `arhivar` |
| 5 | `DS-005` | Retention & Destruction list | `admin` |
| 6 | `DS-006` | Admin panel (users, folders, permissions) | `admin` |
| 7 | `DS-007` | Dashboard / statistics | `admin`, `arhivar` |
| 8 | `DS-008` | Audit Log viewer | `admin`, `arhivar` |
| 9 | `DS-009` | Public share link viewer | unauthenticated (valid signed URL) |
| 10 | `DS-010` | Login | unauthenticated |
| 11 | `DS-011` | Document Editor & Anonymization | `admin`, `arhivar` |
| 12 | `DS-012` | Notarial Nomenclature | `admin`, `arhivar` |

---

## Commands

```bash
# Local backend. Run once per checkout to create persistent, Git-ignored credentials.
# The helper preserves existing values and never prints them.
./scripts/ensure-local-env.sh

# Start PostgreSQL first so an existing volume can be safely checked.
docker compose up -d postgres
# Only if this pre-existing volume rejects the configured password, reconcile
# the role from PostgreSQL's local socket; this preserves all database data.
DB_PASSWORD="$(sed -n 's/^DB_PASSWORD=//p' .env | tail -n 1)"
escaped_db_password="$(printf '%s' "$DB_PASSWORD" | sed "s/'/''/g")"
printf "ALTER ROLE archive WITH PASSWORD '%s';\n" "$escaped_db_password" | docker compose exec -T postgres psql -U archive -d archive

# Build/start the backend and worker, then apply pending application migrations.
docker compose up --build -d backend ocr-queue-worker
docker compose exec backend php artisan migrate
docker compose exec backend php artisan db:seed
docker compose exec backend php artisan archive:admin:create
docker compose exec -T postgres psql -U archive -d archive -c "SELECT current_database() AS database, count(*) AS applied_migrations FROM migrations;"
curl --fail --silent --output /dev/null --write-out '%{http_code}\n' http://127.0.0.1:8000/up
docker compose exec backend vendor/bin/phpunit

# Start the React frontend at the trusted same-origin Vite address.
cd frontend
npm ci
npm run dev

# Romanian OCR smoke
docker compose build ocr-worker
docker compose run --rm ocr-worker

# lint / type-check
python3 docs/agents/tools/ledger-lint.py

# Build the React frontend and run Playwright on desktop and mobile in light and dark modes.
cd ..
docker compose run --build --rm frontend-test
```

### Local Admin provisioning and M1a workflow check

Create the first Admin only after the local database is ready, using a trusted terminal:

```bash
docker compose exec backend php artisan archive:admin:create
```

The command asks for the account details and reads the password twice without echoing it. Do not put a password in a command, shell history, tracked file, or default seed. For a new disposable rehearsal, use a separate Compose project name so its PostgreSQL and document volumes cannot touch the normal local data:

```bash
COMPOSE_PROJECT_NAME=m1a4 BACKEND_PORT=18001 DOCUMENTS_DISK=documents docker compose up --build -d postgres backend
COMPOSE_PROJECT_NAME=m1a4 BACKEND_PORT=18001 DOCUMENTS_DISK=documents docker compose exec --user root backend chown -R www-data:www-data /app/storage/app/private/documents
COMPOSE_PROJECT_NAME=m1a4 BACKEND_PORT=18001 DOCUMENTS_DISK=documents docker compose exec backend php artisan migrate
COMPOSE_PROJECT_NAME=m1a4 BACKEND_PORT=18001 DOCUMENTS_DISK=documents docker compose exec backend php artisan archive:admin:create
COMPOSE_PROJECT_NAME=m1a4 BACKEND_PORT=18001 DOCUMENTS_DISK=documents docker compose up -d ocr-queue-worker
```

Use the interactive command to create a synthetic Admin in that disposable database. Then enter that account in shell prompts (the password input is hidden) and run the browser-to-worker check once, in the desktop-light project:

```bash
read -r -p 'Synthetic Admin username: ' M1A_TEST_USERNAME
read -r -s -p 'Synthetic Admin password: ' M1A_TEST_PASSWORD
printf '\n'
export M1A_TEST_USERNAME M1A_TEST_PASSWORD
COMPOSE_PROJECT_NAME=m1a4 BACKEND_PORT=18001 DOCUMENTS_DISK=documents docker compose run --build --rm -e VITE_BACKEND_URL=http://backend:8000 -e M1A_TEST_USERNAME -e M1A_TEST_PASSWORD frontend-test npx playwright test tests/draft-ocr-real-api.spec.js --project=desktop-light
unset M1A_TEST_USERNAME M1A_TEST_PASSWORD
```

The check logs in, uploads the repository's synthetic Romanian image, explicitly refreshes its persisted status, and opens the protected OCR results and preview. Inspect only the synthetic draft's `draft_access_events` rows in PostgreSQL to confirm `ocr_results_viewed` and `preview_issued`; inspect backend and worker logs for the synthetic username and other canaries without printing credentials or session values. When finished, remove only the rehearsal project's containers and volumes:

```bash
COMPOSE_PROJECT_NAME=m1a4 BACKEND_PORT=18001 DOCUMENTS_DISK=documents docker compose down --volumes --remove-orphans
```

### Isolated quarantine worker verification

Run the corrupt-then-valid queue check only against its own disposable Compose project. It submits one synthetic malformed PDF and the repository's valid synthetic Romanian image together, then waits for the database queue worker to place the PDF in quarantine and the image in the review queue. It does not use the normal project database or storage volume.

```bash
COMPOSE_PROJECT_NAME=p22queue BACKEND_PORT=18015 DOCUMENTS_DISK=documents docker compose up --build -d postgres backend
COMPOSE_PROJECT_NAME=p22queue BACKEND_PORT=18015 DOCUMENTS_DISK=documents docker compose exec --user root backend chown -R www-data:www-data /app/storage/app/private/documents
COMPOSE_PROJECT_NAME=p22queue BACKEND_PORT=18015 DOCUMENTS_DISK=documents docker compose exec backend php artisan migrate
COMPOSE_PROJECT_NAME=p22queue BACKEND_PORT=18015 DOCUMENTS_DISK=documents docker compose exec backend php artisan archive:admin:create
COMPOSE_PROJECT_NAME=p22queue BACKEND_PORT=18015 DOCUMENTS_DISK=documents docker compose up -d ocr-queue-worker
```

Provision a synthetic Admin interactively. Then enter the synthetic credentials into hidden prompts and run the opt-in browser workflow once:

```bash
read -r -p 'Synthetic Admin username: ' M1A_TEST_USERNAME
read -r -s -p 'Synthetic Admin password: ' M1A_TEST_PASSWORD
printf '\n'
export M1A_TEST_USERNAME M1A_TEST_PASSWORD
COMPOSE_PROJECT_NAME=p22queue BACKEND_PORT=18015 DOCUMENTS_DISK=documents docker compose run --build --rm -e VITE_BACKEND_URL=http://backend:8000 -e M1A_TEST_USERNAME -e M1A_TEST_PASSWORD frontend-test npx playwright test tests/draft-quarantine-real-api.spec.js --project=desktop-light
unset M1A_TEST_USERNAME M1A_TEST_PASSWORD
COMPOSE_PROJECT_NAME=p22queue BACKEND_PORT=18015 DOCUMENTS_DISK=documents docker compose down --volumes --remove-orphans
```

The browser check asserts that the two drafts progress independently and appear in their respective protected DS-004 queues. On 2026-11-25, it passed against the isolated database and real worker: the malformed PDF exhausted the initial attempt plus three retries and reached `quarantined`, while the valid image reached `review_ready`. Inspect only the disposable project's synthetic draft rows if investigating a failure. Remove only the `p22queue` project and its volumes after the check.

---

## Key deliverables (Definition of Done)

- Process all 30 test documents in the live deployment; a search query returns a result in under 2 seconds.
- PII redaction working visually on ≥ 5 documents with CNP / IBAN / names, with validator tests.
- A corrupt file does not block the queue (automated test).
- Audit log is append-only and answers "who viewed document X".
- The Secretar Notarial runs five acceptance searches in the live deployment; record the results in `INTERVIEW.md`.

---

## Ledger

The [approved archive workflow decisions](docs/agents/decisions/archive-workflows.md) govern the scope above. Confirmed workflow answers are recorded in [Open Questions](docs/agents/OPEN-QUESTIONS.md#q-013--where-and-how-will-the-remaining-screen-designs-be-approved).

Agent rules, decisions, patterns, contracts, and open questions live in
[`docs/agents/`](docs/agents/README.md).
