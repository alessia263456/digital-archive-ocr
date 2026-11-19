# Plan — Part 1 · Archive Foundations

**Status:** Approved on 2026-11-19. Implementation is on hold pending separate authorization.

## Size

**M** — Three tables and an initial Notarial Nomenclature import.

**Build prerequisite** — A Laravel backend scaffold and a PostgreSQL test database. Neither is present in the repository. Scaffolding is a separate delivery.

## Approach

Add Laravel migrations for accounts, Physical Dossiers, and Notarial Nomenclature entries, reusing the scaffold's account migration if available. Populate PostgreSQL from the checked-in CSV during initial setup. Future Application lookups will read from PostgreSQL.

| Table | Planned fields and constraints |
|---|---|
| `users` | Primary key, unique username, password hash, and a database constraint allowing the `admin`, `arhivar`, and `cititor` roles. |
| `physical_dossiers` | Stable primary key and the printed Physical Dossier Number stored as text. Future relationships use the primary key; matching by printed number is outside Part 1. |
| `nomenclature_entries` | Document type, subtype, Storage Context, Archival Indicator, retention duration, C.S. flag, Retention Computation Base, and source rule text. The combination of type, subtype, and Storage Context is unique. Archival Indicators can repeat. Permanent Preservation has no duration and uses the explicit non-applicable computation base. |

The initial import runs in one transaction. Re-running it against identical input preserves row IDs. Invalid rules or conflicts with existing classifications identify the source row and roll back the import. An official revision to the Notarial Nomenclature would use a separately approved update process.

### Relationships for Part 2

Each digital document belongs to exactly one Physical Dossier. A Physical Dossier can contain many digital documents. The current dossier assignment is stored on the digital document and determines browsing and Folder Permissions. Each digital document has its own immutable version history. After initial approval, replacing or updating the underlying document file creates a new Document Version. Metadata corrections, including dossier reassignment and reclassification, update the digital document and are tracked in the Append-Only Audit Log. Part 2 plans the document relationships under D-030 and D-031.

## Files

| Action | Path | What |
|---|---|---|
| Add or adapt | `backend/database/migrations/` | Account, Physical Dossier, and nomenclature schema. |
| Add | `backend/database/seeders/NomenclatureSeeder.php` | Import [the Notarial Nomenclature CSV](../../nomenclator_arhivistic.csv). |
| Add | `backend/tests/Feature/Database/ArchiveFoundationsTest.php` | PostgreSQL integration tests with PHPUnit. |
| Update after build | [ARCHITECTURE.md](../ARCHITECTURE.md) | Record the implemented tables and classification key. |

## Tests

| Behaviour | Verification |
|---|---|
| Fresh migrations succeed. Duplicate usernames and unsupported roles are rejected. | PHPUnit integration against PostgreSQL |
| Physical Dossier Numbers retain their printed format and each dossier has a stable primary key. | PHPUnit integration against PostgreSQL |
| All 49 entries import. Repeated Archival Indicators resolve by classification and duplicate classification combinations are rejected. | PHPUnit integration against PostgreSQL |
| The import preserves Permanent Preservation, fixed durations, C.S. flags, and all six computation-base values. | PHPUnit integration against PostgreSQL |
| An identical import preserves row IDs. An invalid row or conflicting rule leaves no partial import. | PHPUnit integration against PostgreSQL |

## Sequencing

One builder after approval and once the scaffold is available.

1. Write the PostgreSQL integration tests in PHPUnit.
2. Implement the three tables and initial CSV seeder.
3. Verify a fresh migration and seed, then run the integration tests and available backend build checks.
4. Update the Architecture Ledger and run Ledger lint.

## Risks

Map each of the six source values explicitly: Permanent Preservation, January 1 following execution, January 1 following dossier resolution, January 1 following deposit placement, contract expiry, and deposit release. Keep the retention deadline calculation for the later retention plan.

## Out of scope

Scaffolding, Admin provisioning and login, digital documents and versions, Inventory Number confirmation, Folder Permissions, deadline calculation, and Screens are separate deliveries.

### Open planning items

- **Official revisions.** Decide who may apply updates and how approved Document Versions retain the classification and retention rule used at approval. Initial setup can proceed while this question is open. [Q-017](../questions/notarial-nomenclature.md#q-017--how-should-official-revisions-to-the-notarial-nomenclature-be-applied)
- **Arhivar access.** Decide whether to offer read-only access to the Notarial Nomenclature in the Application and where it would appear. This belongs to a separate Screen plan. [Q-018](../questions/notarial-nomenclature.md#q-018--should-arhivar-have-read-only-access-to-the-notarial-nomenclature-in-the-application)
- **Dedicated Screen.** Decide whether the Notarial Nomenclature should have its own Screen for viewing entries and importing an updated CSV when an official revision is issued. [Q-019](../questions/notarial-nomenclature.md#q-019--should-there-be-a-dedicated-screen-to-view-the-notarial-nomenclature-and-import-csv-updates)

## Knowledge used

Previously confirmed and used unchanged — D-001, D-003, D-020, D-023, D-027, D-030, and D-031.

| Entry | What it says | Why it applies | Call |
|---|---|---|---|
| D-007 | One Notary Cabinet per deployment | Defines the scope of the three tables | Confirmed by the user in planning |
| D-017 | Admin-managed username and password authentication | Defines account fields | Confirmed by the user in planning |

There are no recorded patterns or contracts used or changed by this plan. Q-014 and Q-016 remain open for later deliveries.

### Assumptions

The plan uses the table names, stable primary keys, and transactional import described above.

## Approval

The repository owner approved Part 1 on 2026-11-19. Approval covers the three tables, initial CSV import, tests, and architecture documentation update. Build work requires separate authorization and the backend scaffold.
