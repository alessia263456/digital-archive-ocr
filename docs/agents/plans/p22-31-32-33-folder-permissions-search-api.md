# P22-31, P22-32 and P22-33 · Folder Permissions, Romanian search index, and browse/search API

**Status:** Draft for repository-owner approval
**Base:** `feat/m2-review-publication` at `f0c202318545b92a12d88274904632c7e4267364`
**Worktree:** `/tmp/proiect1-m3-backend` on `feat/p22-m3-backend`

## Goal

Deliver the backend foundation for M3 archive browsing and search: enforce Folder Permission policy, index only the current approved Document Version with PostgreSQL Romanian full-text search, and expose authenticated browse/search endpoints. No frontend files or DS-011 work are in scope.

## Approved requirements to follow

- **D-001:** Laravel, PostgreSQL, and Docker remain the service stack.
- **D-003:** Backend coverage and verification use PHPUnit.
- **D-033:** Browse by Physical Dossier, document type, and year. `admin` and `arhivar` have unrestricted dossier access. `cititor` access is denied by default and granted by Folder Permission on Physical Dossiers; an individual permission takes precedence over a role permission. Apply the same policy in every browse mode. `cititor` may search/view/download approved redacted copies in granted dossiers. Exclude redacted text from search. Restrict Signatory Party name lookup to `admin` and `arhivar`. Return the Physical Dossier Number on every result.
- **D-037:** A document belongs to one current Physical Dossier; approved metadata changes do not create Document Versions; only the current approved version is indexed; prior versions remain available to staff through version history.
- **D-042 and D-043 / C-003:** Protected API routes use the current session, session-lifetime middleware, and resource-specific role checks. State-changing permission endpoints require CSRF protection.
- **C-007:** Reuse the existing Physical Dossier identifiers and document publication metadata without changing publication behavior.
- **Q-021:** OCR similarity matching remains out of scope; do not introduce a similarity threshold.

## Committed prerequisites verified

At the stated base commit, the backend already contains:

- PostgreSQL 17 Compose service and a dedicated `archive_test` database bootstrap; PHPUnit selects PostgreSQL and `archive_test`.
- C-003 session authentication and role middleware registered on API routes.
- Physical Dossier records with stable IDs, unique printed numbers, archival indicator, inventory number, and retention term.
- `documents` linked to one Physical Dossier and `document_versions` with immutable metadata, current-version linkage, source and redacted hashes, and redacted PDF storage reference.
- Publication and review services that produce the approved metadata and redacted artifact needed by the search projection.
- `ReaderRedactionProjection`, which conservatively removes accepted redactions from reader-facing page text and metadata.

No committed Folder Permission table/model, search vector/index, or archive browse/search API is present. These are the implementation targets, not missing prerequisites.

## Proposed implementation scope

### P22-31 · Folder Permission policy

- Add the smallest persistence model that represents a permission for a `cititor` role or one individual `cititor` account on a Physical Dossier, with allow/deny semantics sufficient to implement the approved individual-over-role precedence and default deny.
- Add a reusable backend policy/query boundary that applies the same effective-access rule to every document query and browse mode. `admin` and `arhivar` retain unrestricted access.
- Ensure permission changes take effect on the next request and do not leak document existence, metadata, OCR, originals, or redacted files when access is denied.
- Do not implement Admin account/permission management UI or expand account APIs; those belong to the later Admin workstream. Provide only the backend persistence/enforcement needed by this API plan.

### P22-32 · PostgreSQL Romanian search index

- Add a PostgreSQL-native Romanian `tsvector` projection and GIN index for approved, current-version search content. Use PostgreSQL's Romanian text-search configuration and preserve Romanian diacritic behavior in the acceptance tests.
- Index the reader-safe projection for `cititor`; never index OCR or metadata removed by accepted Redactions. Staff search may include the approved source-side searchable fields only if the selected API contract allows them and access is role-gated.
- Keep drafts and superseded Document Versions out of the searchable relation. Rebuild/update the index when publication, approved OCR correction/reindex, or approved metadata/dossier changes affect indexed content; remove or replace stale content transactionally.
- Use PostgreSQL `ts_headline` or an equivalent database-native mechanism for result highlights after content has been safely projected.

### P22-33 · Browse and search API

- Add session-protected Laravel endpoints for text search and the three D-033 browse modes. Apply Folder Permission filtering in SQL before pagination/counting and before returning any item data.
- Support approved metadata filters and stable pagination; return only safe role-appropriate fields and include the Physical Dossier Number on every result.
- Provide relevance ordering and Romanian-context highlights for text queries. For `cititor`, search only the redacted projection and restrict results to explicitly granted dossiers. Restrict Signatory Party name query fields to `admin`/`arhivar`.
- Return Romanian `eroare` errors with stable machine-readable codes; preserve 401/403 distinctions and avoid storage keys, Signed URLs, and sensitive unredacted content in responses.

## C-008 · Archive browse and role-safe search API

**Status:** Approved by the repository owner on 2026-11-27 and recorded in `CONTRACTS.md`. The contract uses the DS-001 mock’s dossier/type/year filters, party-name control, relevance label, result cards, and three browse sections, plus the owner’s clarified role-specific search rules.

### Authentication and common rules

- All endpoints require the live C-003 session and session-lifetime check. `admin`, `arhivar`, and `cititor` may use the endpoints; `cititor` results are filtered to currently granted Physical Dossiers using D-033 Folder Permissions before any matching, aggregation, counts, or pagination. `admin` and `arhivar` have unrestricted dossier access.
- Only current published Documents/Document Versions are included. Drafts, unpublished records, superseded versions, and older versions are never returned by search/browse.
- All query matching, browse aggregates, result counts, snippets/highlights, facets, and returned metadata are computed from the caller’s authorized role projection. No hidden or Redacted value can affect or appear in a `cititor` response.
- `cititor` requests containing staff-only parameters (`party`, `tag`, or a tag filter) fail closed with Romanian JSON HTTP 403 (`eroare`, stable `cod`); the server must not silently ignore them. No tags are returned in `cititor` fields.
- Invalid parameters return Romanian JSON HTTP 422 (`eroare`, stable `cod`). Missing/expired session returns 401. Responses contain no storage keys or Signed URLs.

### Browse endpoint

`GET /api/archive/browse`

Returns the authorized caller’s DS-001 home data: document-type groups, Physical Dossier groups, year groups, and the most recently approved current Documents. Group counts and recent entries are calculated after role/dossier authorization. Each item includes stable resource IDs, the displayed Physical Dossier Number, and only the caller’s role-safe metadata. `cititor` receives safe metadata and redacted projection values only.

### Search/list endpoint

`GET /api/documents`

Query parameters:

- `q` (optional string): Romanian full-text query across the caller’s permitted search projection. Omission or an empty/whitespace-only value means browse/filter without a keyword.
- `physical_dossier_id` (optional stable ID): scope to a dossier; unauthorized `cititor` dossiers return the same empty result shape as no matches, avoiding dossier-existence disclosure.
- `document_type` (optional exact approved type value) and `year` (optional four-digit Act Date year): DS-001 filters.
- `party` (staff only, optional): Signatory Party name lookup; equivalent to searching the authorized party-name metadata field.
- `tag` (staff only, optional exact tag value): filter by an approved tag.
- `page` (optional positive integer, default 1) and `per_page` (optional integer, default 20, maximum 100): stable pagination. Result ordering is relevance descending for a nonempty `q`, then approved time descending and document ID ascending as deterministic tie-breakers. With no `q`, order by approved time descending, then document ID ascending.

The response contains `data`, `meta` (`current_page`, `per_page`, `total`, `last_page`), and role-safe result fields. A result contains document ID, current Document Version ID/number, approved document type, Act Date, act number, Physical Dossier Number, Inventory Number, approval timestamp, and a bounded `highlight` excerpt for keyword matches. For `admin`/`arhivar`, searchable text comprises approved original OCR and approved metadata, including Signatory Party names and tags. Staff responses may include tags. For `cititor`, searchable text is only the reader-safe redacted OCR projection and reader-safe metadata; Signatory Party names and tags are not searchable or returned. Highlight content comes from the same source projection as the match.

The list endpoint accepts empty `q` to support the mock’s dossier/type/year browse and recent results without a keyword. It does not expose tags in `cititor` filters, facets, result data, or error behavior. All filters are applied after the appropriate role projection and authorization scope is selected.

### Index and privacy requirements

- Maintain separate searchable vectors (or equivalently isolated role projections) for staff source OCR/authorized metadata and reader-safe redacted OCR/metadata. Never use a staff vector to determine `cititor` matches, rank, totals, snippets, or facets.
- The reader-safe projection is produced through the approved Redaction projection. Accepted Redactions must be removed from OCR, metadata, and tags before building/searching the reader projection. Tags are excluded entirely from reader projection.
- Index the current version only. D-037 approved OCR-only corrections reindex the same version; approved metadata/dossier changes update the searchable projection without creating a version. Version replacement switches the indexed current version atomically.
- PostgreSQL Romanian full-text behavior, including diacritic handling and safe highlighting, is verified against Romanian fixtures.

### Consistency with approved decisions

- D-033 requires `cititor` to search approved redacted copies, restricts Signatory Party name lookup to staff, requires the Physical Dossier Number on each result, and says “Exclude redacted text from search.” The owner approved the C-008 interpretation: exclude sensitive text removed by Redaction while retaining the remaining reader-safe OCR. This is consistent with the same decision’s requirement that `cititor` can search redacted copies.
- D-037 requires only the current version to be indexed and requires approved OCR-only corrections to reindex the same version; the proposal preserves both.
- D-042/C-003 role/session boundaries and C-007 publication metadata are reused without amendment.
- No other contradiction with an approved decision was found. Tags being staff-only is a new clarification within the existing staff-only metadata scope, not an incompatible approved rule.

### Contract consumers

Provider: `backend/routes/api.php`, archive browse/search controller and query/index services, Folder Permission policy/query scope, search/index migrations and models. Consumers: future DS-001 React API integration (`frontend/src/api.js` and the archive Screen implementation), PHPUnit browse/search/permission tests, and any later M3 viewer that links by stable document/version IDs. This backend work does not change frontend files.

The approved C-008 contract resolves the search-specific questions previously listed in this plan. The Folder Permission persistence shape remains minimal: role-level and individual `cititor` grants with individual precedence and default deny. Permission administration endpoints remain outside P22-31/32/33.

## Files expected to change after plan approval

- `backend/database/migrations/` — Folder Permission persistence and search projection/index.
- `backend/app/Models/` — permission/search model relations only where required.
- `backend/app/Policies/` or `backend/app/Services/` — effective permission and safe search/browse query logic.
- `backend/app/Http/Controllers/` and `backend/routes/api.php` — browse/search provider routes.
- `backend/tests/Feature/` and `backend/tests/Unit/` — permission precedence, default deny, safe projections, search/index lifecycle, filters, browse modes, highlights, and role boundaries.
- `docs/agents/CONTRACTS.md` — records approved C-008.
- `docs/agents/plans/p22-task-checklist.md` — mark only these three backend tasks complete after verified implementation.
- `docs/agents/PATTERNS.md` — add a `candidate` practice only if this work establishes a reusable pattern.

No frontend or design-registry files are included. No existing approved D- or C-entry is proposed for amendment by this plan.

## Parallel-work isolation and coordination

- The original checkout remains untouched. All planned changes are confined to this worktree and branch.
- DS-011’s observed dirty files are `frontend/**`, `docs/design/registry.yaml`, and DS-011 screenshots. This plan has no overlapping files. Do not cherry-pick, merge, or rebase across the active frontend work while its state is changing.
- Both branches may eventually touch `docs/agents/CONTRACTS.md` or `docs/agents/plans/p22-task-checklist.md`. Keep those files unchanged until coordinating with the DS-011 session/owner; apply ledger/checklist edits once, after agreeing on the current committed version. The new plan file is isolated and does not edit the shared Ledger indexes.
- Database schema and `backend/routes/api.php` are distinct from the DS-011 files, but are shared integration surfaces for later M3 backend work. Keep migrations additive and route names specific; do not alter existing draft, publication, or Physical Dossier behavior.

## Isolated Docker Compose and test database

Use the worktree’s Compose file with a unique project name (for example `p22m3backend`) so network, containers, and named volumes are project-scoped. Use a worktree-local Compose override to bind PostgreSQL and backend to unused loopback ports (proposed `15432` and `18031`), set a distinct Compose database name (proposed `archive_p22m3`), and initialize/use a project-specific test database (`archive_p22m3_test`). Confirm both host ports are free before starting. Set a task-specific credentials file outside tracked files; do not reuse or print the other checkout’s credentials. Never attach to the default Compose project or its volumes. Stop/remove only this unique Compose project after verification.

The override, credentials, and runtime state are local operational artifacts; do not commit secrets or a developer-specific override. The existing repository's `archive_test` init script will need a project-specific override/init input or a startup-created isolated test database before PHPUnit can run; confirm the active PDO database name before migrations/tests, following PATTERN-001.

## Verification after implementation

- Run PHPUnit in the isolated Compose project against its dedicated PostgreSQL test database; assert the active driver and database before migrations.
- Verify migrations on clean PostgreSQL and test the PostgreSQL Romanian parser, diacritic queries, relevance, and highlights with Romanian fixtures.
- Verify a published current version is searchable, a superseded version/draft is not, and publication/OCR/metadata changes leave no stale index rows.
- Verify default deny, role grants, individual precedence over role permission, unrestricted staff access, and identical permission filtering across all browse modes.
- Verify `cititor` cannot infer denied dossier contents through results, counts, filters, pagination, or error responses; ensure redacted terms and sensitive metadata do not appear in indexed text or snippets.
- Verify validation, 401/403 behavior, Romanian error shape, and no storage keys/Signed URLs in API payloads.
- Run Ledger lint if any Ledger files change. Do not run frontend checks or modify frontend files as part of this backend-only scope.

## Approval gate and explicit exclusions

The repository owner approved C-008 and separately authorized local integration of the completed M3 work on 2026-11-27. This draft does not authorize push, tag, release, or deployment. DS-001/DS-002 frontend integration, P22-34 UI, version-history/viewer delivery, audit-integrity P22-36b, metadata-edit P22-37, OCR similarity, and Admin permission-management UI remain outside this plan.

## Other choices from the original draft

1. Folder Permission data shape and permission-administration boundary: the merged implementation uses the minimal role-level and individual `cititor` grants described above; permission-administration endpoints remain out of scope.
2. Compose/database naming and host ports: verification used the isolated `p22m3backend` project with ports checked for availability before startup. These are local verification settings, not application configuration.
