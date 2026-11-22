# Plan — P22-12a and P22-12b · Private draft intake, status, and resume

## Size

M · Two dependent backend deliveries: draft persistence and mixed-format intake, then resume and protected retrieval after account and authorization work. The roadmap timeboxes total 165 minutes; protected retrieval cannot be delivered before P22-18 and P22-25.

## Approach

Add a PostgreSQL draft record for each accepted document, store each original and any derived DOCX PDF on the configured private Laravel disk, and expose per-document status without returning storage paths. Verify the disk and private-access behavior delivered by prerequisite P22-11 before using it. Treat PDFs and DOCX files as individual draft items; treat an ordered JPG/PNG collection as one draft. A bad item must not roll back valid siblings. Persist and return the DS-003 lifecycle states; P22-12a creates the initial queued state, while the worker task P22-13a owns processing, failure, quarantine, and review-ready transitions. Keep byte-level duplicate enforcement in P22-14.

P22-12b will add resume and protected draft retrieval only after P22-18 supplies account and role data and P22-25 supplies authentication and role authorization. Either `admin` or `arhivar` may access any draft, as confirmed by the owner. Until those prerequisites are complete, there is no unauthenticated draft retrieval route. Use the existing `DocxConversionService` and `DocumentPageRenderer`; no new storage abstraction or dependency is proposed.

## Files

| Action | Path | What |
|---|---|---|
| Add | `backend/database/migrations/` | Create the draft table with stable ID, status, original storage key, optional derived PDF key, source format, and timestamps; constrain status to the approved lifecycle values. |
| Add | `backend/app/Models/DocumentDraft.php` | Represent one in-progress Document Scan and its persisted lifecycle status. |
| Add | `backend/app/Http/Controllers/`, `backend/app/Http/Requests/`, `backend/app/Services/` | Validate and accept mixed intake items, preserve original bytes on the P22-11 private disk, convert DOCX using the existing service, assemble ordered images as one draft using the existing renderer input conventions, and return per-item results. |
| Add | `backend/routes/` | Add batch intake and per-document status endpoints. Keep draft content and storage keys out of responses; protect private operations with the available authentication boundary. |
| Add | `backend/tests/Feature/` | PHPUnit coverage for mixed valid/invalid input, independent item outcomes, one ordered image collection per draft, DOCX original preservation and derived PDF association, status persistence, and denied anonymous access. |
| Add after P22-18/P22-25 | `backend/app/Http/Controllers/`, `backend/app/Policies/` or existing authorization location, `backend/routes/` | Add the resume and protected retrieval actions under implemented authentication and role authorization. Permit either staff role to resume/retrieve any draft; deny `cititor` and unauthenticated requests. |
| Add after P22-18/P22-25 | `backend/tests/Feature/` | Verify resume returns the existing draft and current status, both staff roles can retrieve drafts, and unauthorized roles cannot. |
| Update after verification | `docs/agents/ARCHITECTURE.md`, `docs/agents/plans/p22-task-checklist.md` | Record the implemented draft path, sequencing, and acceptance evidence. |

No provided Ledger contract exists for these endpoints, and this plan does not add or change one. The API request and response shape should be kept local to the Laravel routes and feature tests until a cross-repository consumer needs a provided contract.

## Tests

| # | Behaviour | Test (file · kind) | Not automated? why |
|---|---|---|---|
| 1 | A mixed batch accepts valid PDFs, DOCX files, and an ordered image collection independently. One invalid item receives its own Romanian error while valid siblings persist. | New draft intake feature test · PHPUnit with synthetic fixtures and private test disk. | Automated. |
| 2 | Each accepted document has a stable draft ID and a persisted initial `queued` state. A status request returns the same state after reload and does not reveal private storage keys. | New draft status feature test · PHPUnit/PostgreSQL. | Automated. |
| 3 | DOCX original bytes and key remain intact; its derived PDF is associated with the same draft. Ordered images form one draft in submitted order. | New draft intake feature test · PHPUnit using the existing conversion and rendering services. | Automated. |
| 4 | Anonymous access to private intake/status operations is denied by the authentication boundary. Role authorization is verified after P22-25. | New draft endpoint feature test · PHPUnit. | Automated; staff role matrix waits for P22-18/P22-25. |
| 5 | Either `admin` or `arhivar` can resume and retrieve any persisted draft after authentication is implemented; `cititor` and anonymous requests are denied. Resume returns the same draft identity and current persisted status. | New protected draft feature test · PHPUnit after P22-18/P22-25. | Automated after prerequisite tasks. |
| 6 | Existing rendering, conversion, OCR persistence, migrations, and Ledger constraints remain valid. | Full backend PHPUnit suite, backend build, and `python3 docs/agents/tools/ledger-lint.py`. | Automated; actual execution belongs to the build stage. |

## Sequencing

One builder. First complete P22-12a schema, private intake, batch results, and status endpoint. P22-13a owns worker-driven status transitions; P22-14 owns exact duplicate hashing and enforcement. Then complete P22-18 account/role tables and P22-25 authentication/authorization before beginning P22-12b. P22-12b adds the resume and protected retrieval routes and verifies both staff roles against the shared-draft access rule. Do not expose draft retrieval while the auth prerequisites are absent.

## Risks

- **Authentication ordering:** P22-12b was originally scheduled before auth. Move its protected endpoint work after P22-18 and P22-25; trying to meet the isolation acceptance before then would leave access control untestable.
- **Mixed outcomes:** A batch-level transaction could discard valid siblings when one item fails. Persist and report each item independently, grouping only the internal work needed to preserve a single document’s artifacts consistently.
- **Status ownership:** Upload creates `queued`; processing, failure, quarantine and review-ready transitions belong to P22-13a and must update this same persisted draft record. Do not mark successful processing as approval or indexing.
- **Private storage:** A database row without its private object, or a published object without its row, could leave an unusable draft. Stage and clean up per item, and test failure recovery without logging document contents or private keys.
- **Storage prerequisite:** The current code has a local disk rooted at `storage/app/private` and an S3 configuration, but no draft or Signed URL service. Confirm P22-11's actual private disk behavior during implementation before wiring intake to it; keep drafts off the public disk.
- **Image ordering:** The assembled image collection must preserve submitted order. Exact ordered-image and reordered-collection duplicate decisions remain enforced by P22-14 under D-040.

## Out of scope

Worker dispatch and retry/backoff (P22-13a), corrupt-then-valid worker acceptance (P22-13b), exact duplicate detection (P22-14), retry/quarantine actions (P22-15), OCR review and approval, indexing, frontend DS-003 implementation, and live deployment. Protected retrieval routes are deferred until P22-18 and P22-25 are implemented.

## Knowledge used

**10 entries confirmed before, unchanged** — D-001, D-003, D-017, D-018, D-028, D-032, D-038, and D-040, plus D-002 and D-025. They govern the Laravel/PostgreSQL stack and PHPUnit, username/password authentication, Romanian system errors, preservation of DOCX originals, role access, private resumable drafts and approval boundaries, ordered-image duplicate handling, and exact duplicate behavior.

| Entry | What it says | Why it applies | Call |
|---|---|---|---|
| D-001, D-003, D-017, D-018, D-028 | Laravel/PostgreSQL and Docker; PHPUnit; username/password authentication; Romanian system errors; preserve DOCX originals and derive PDFs. | Governs the backend stack, API error language, testing, auth prerequisite, and file handling. | Confirm / flag wrong or outdated. |
| D-032 | Only `admin` and `arhivar` may use upload; `cititor` is limited to approved redacted content. | Governs draft endpoint access; the owner has confirmed either staff role may access any draft. | Confirm / flag wrong or outdated. |
| D-038 | Incomplete uploads remain private drafts that authorized staff can resume; official save and indexing require later review and approval. | Defines the draft boundary and prevents processing status from implying approval. | Confirm / flag wrong or outdated. |
| D-040 | Ordered image digests determine exact image-document identity; the same images in another order warn without blocking. | Applies to the image collection accepted as one draft; actual duplicate enforcement remains P22-14. | Confirm / flag wrong or outdated. |
| D-002, D-025 | Archive scope includes document uploads and immutable versions; exact SHA-256 matches block saving, and metadata matches are warnings. | Keeps upload inside archive scope and duplicate enforcement outside these tasks. | Confirm / flag wrong or outdated. |
| PATTERN-003, PATTERN-004 | Candidate publication practices for complete page sets and local derivatives. | For awareness only; reuse the existing renderer/converter behavior, but do not treat candidates as approved rules. | No call required. |
| Contracts | No provided contracts are indexed. | No contract is changed or relied on. | No call required. |
| Q-021 | OCR similarity metric and threshold remain open. | No OCR similarity matching or warning is implemented here. | Remains open; no effect on scope. |

### Considered, not applied

- Q-021 — OCR similarity matching is out of scope for draft persistence and remains unanswered.
- PATTERN-003 and PATTERN-004 — candidate entries only; existing service behavior is reused without promoting either practice.

### Assumptions (no entry behind them)

- The endpoint uses one draft per independent PDF/DOCX and one draft per submitted ordered JPG/PNG collection, matching the approved DS-003 intake model.
- `queued`, `processing`, `failed`, `quarantined`, and review-ready draft are persisted lifecycle statuses; transport progress remains client-side. P22-13a owns worker transitions after the initial queued state.
- P22-18 and P22-25 are prerequisites to P22-12b, as directed by the owner, even though the current roadmap places them later.
