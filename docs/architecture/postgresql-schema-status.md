# PostgreSQL schema status

Snapshot checked on 2026-11-23. The database inspected read-only is `archive.public` in the running `proiect1-postgres-1` container.

## Actual database

The live migration table contains only these three applied scaffold migrations:

- `0001_01_01_000000_create_users_table`
- `0001_01_01_000001_create_cache_table`
- `0001_01_01_000002_create_jobs_table`

The live database has nine tables: `cache`, `cache_locks`, `failed_jobs`, `job_batches`, `jobs`, `migrations`, `password_reset_tokens`, `sessions`, and `users`. It has primary keys and the unique constraints on `failed_jobs.uuid` and `users.email`; the catalog reports no foreign-key constraints. In particular, `sessions.user_id` is nullable and indexed but has no declared foreign key.

See [the actual current schema diagram](postgresql-current-schema.mmd).

## Implemented migrations not applied to this database

| Migration | Available source | Schema contribution | Live status |
|---|---|---|---|
| `2026_11_21_000001_create_ocr_pages` | `feat/ocr-permanent-redaction` (`476e985`) | Adds `ocr_pages` with composite primary key `(extraction, page)`. No foreign key is declared for `extraction`. | Migration file exists; migration is absent from the live `migrations` table and `ocr_pages` is absent. |
| `2026_11_23_000001_add_account_fields_and_create_physical_dossiers` | `feat/p22-18-account-dossier` (`b270e5d`) | Adds unique required `users.username`, required `users.role` with an allowed-values check, and `physical_dossiers` with generated ID and non-unique printed number. | Migration file exists; migration is absent from the live `migrations` table and `physical_dossiers` is absent. |

The [intended schema diagram](postgresql-intended-schema.mmd) combines all five migration files found across available local and remote-tracking refs. It therefore shows the schema after all currently implemented migrations have run, not the live database as it stands.

## Tables not implemented in available migrations

These are mentioned in domain documentation or approved plans, but no corresponding Laravel migration is present in the inspected refs:

- **Registers / Daily Notarial Register** — a domain concept in `CONTEXT.md`; no table name, columns, keys, or relationships are defined. It cannot be represented as a concrete table without inventing a schema.
- **Notarial Nomenclature entries** — `nomenclature_entries` and its classification fields are specified in `part-1-archive-foundations.md`, but no migration is present.
- **Private draft storage** — P22-12a plans a table with stable ID, status, original storage key, optional derived PDF key, source format, and timestamps. No migration or final table name is present.
- **Documents and Document Versions** — planned by the archive roadmap and decisions; no migrations define their columns or keys yet.
- **Folder Permissions and Append-Only Audit Log** — planned table/schema work; no migrations define these tables yet.

No placeholder entities or speculative relationships for these items are included in the intended diagram.

## Branch inspection limits

The migration inventory used all local branches and remote-tracking refs available in this checkout. A direct `git ls-remote` refresh could not resolve `github.com`, so branches not already represented by local refs could not be checked. No branches were merged and no migrations were run; the database was only queried through `SELECT` catalog statements.
