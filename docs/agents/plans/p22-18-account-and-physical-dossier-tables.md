# Plan — P22-18 · Part 1 account and Physical Dossier tables

**Status:** Approved on 2026-11-23. Implementation has not started.

## Size

**M · 60-minute roadmap timebox**, plus time to resolve any existing account data that needs owner input.

## Approach

First inspect the existing database state using read-only checks. If the initial `users` migration has not run, adapt it. If it has run, use a new migration that preserves all rows. Require username, password, and role in the database, enforce unique usernames and the approved role values (`admin`, `arhivar`, `cititor`), and use Laravel’s standard password hashing. Give Physical Dossiers stable primary keys and store printed numbers as text; do not add a uniqueness constraint to printed numbers.

If existing rows lack values required by the new schema, stop before applying changes and ask the owner what values to use.

## Files

| Action | Path | What |
|---|---|---|
| Check before editing | Existing PostgreSQL databases and migration records | Use read-only inspection to select a safe migration path and check account rows. |
| Update if safe; otherwise add migration | `backend/database/migrations/` | Require username, password, and role; constrain roles; create the Physical Dossier table. Preserve all existing rows. |
| Update | `backend/app/Models/User.php` | Represent the required account fields and use Laravel’s hashed password cast. |
| Add | `backend/app/Models/PhysicalDossier.php` | Represent the stable dossier identity and printed number. |
| Update | `backend/database/factories/UserFactory.php` | Generate accounts with required, valid values. |
| Update | `backend/database/seeders/DatabaseSeeder.php` | Seed an account matching the revised schema. |
| Add | `backend/tests/Feature/Database/AccountAndPhysicalDossierTest.php` | Test constraints, password hashing, and exact dossier-number preservation. |
| Update after build | `docs/agents/ARCHITECTURE.md` | Record the implemented tables. |
| Update after build | `docs/agents/plans/p22-task-checklist.md` | Record P22-18 completion after checks pass. |

## Tests

| # | Behaviour | Test (file · kind) |
|---|---|---|
| 1 | Username, password, and role are required by the database. | `AccountAndPhysicalDossierTest.php` · PHPUnit against PostgreSQL |
| 2 | Duplicate usernames and unsupported roles are rejected by database constraints. | `AccountAndPhysicalDossierTest.php` · PHPUnit against PostgreSQL |
| 3 | A stored password verifies with Laravel’s `Hash::check` and is not plaintext. | `AccountAndPhysicalDossierTest.php` · PHPUnit |
| 4 | Printed dossier numbers retain leading zeros and formatting exactly, such as `Dosar nr. 029/02014`. | `AccountAndPhysicalDossierTest.php` · PHPUnit against PostgreSQL |
| 5 | Multiple dossiers may have the same printed number, while retaining distinct stable primary keys. | `AccountAndPhysicalDossierTest.php` · PHPUnit against PostgreSQL |
| 6 | Migrations and existing migration smoke coverage pass. | New feature test and `MigrationSmokeTest.php` · PHPUnit |

## Sequencing

One builder. Inspect migration history and account rows first, without writes. If existing accounts need values for the new required fields, stop and ask the owner before applying the migration. Otherwise, choose the safe migration path, write the PostgreSQL-backed tests, implement the schema and models, align the factory and seeder, and update Architecture and the checklist after checks pass. Do not drop, reset, or recreate existing databases or data.

## Risks

Docker API access was denied during planning’s read-only inspection, so the current database state could not be confirmed. The builder must perform that check before choosing or applying a migration. If existing rows need usernames or roles, migration work waits for the owner’s direction.

## Out of scope

Authentication endpoints and policies (P22-25); account and dossier Admin APIs/forms (P22-40); Folder Permissions; document-to-dossier relationships; Notarial Nomenclature; frontend Screens.

## Knowledge used

Previously confirmed and applicable: **D-001** (Laravel and PostgreSQL), **D-003** (PHPUnit), **D-007** (single Notary Cabinet), and **D-017** (Admin-managed username/password authentication).

| Entry | What it says | Why it applies | Call |
|---|---|---|---|
| D-032 | Defines approved roles and role-based access scope. | Limits account roles to `admin`, `arhivar`, and `cititor`. | Confirmed by plan approval on 2026-11-23 |
| D-037 | Defines later versioning and audit behavior for document metadata changes, including dossier reassignment. | Keeps document relationships and reassignment behavior out of this task. | Confirmed by plan approval on 2026-11-23 |

No applicable approved patterns or contracts are changed. **Q-008** is answered; **Q-014** and **Q-016** remain open but do not affect this scope.

### Considered, not applied

- **D-006** — Applies to frontend visual work; P22-18 is backend-only.

### Assumptions

- Passwords use Laravel’s standard hashing mechanism.
- Printed Physical Dossier Numbers are descriptive text, not identifiers or uniqueness keys.
