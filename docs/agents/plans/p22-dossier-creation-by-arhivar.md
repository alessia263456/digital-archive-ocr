# Plan — Arhivar Physical Dossier creation and Editor refresh race

**Status:** Approved and implemented on 2026-11-27.

## Scope

Allow both Admin and Arhivar to create Physical Dossier records from DS-011. Preserve session/CSRF protection, unique printed dossier numbers, classification-derived Archival Indicator and retention term, and denial for Cititor. After successful creation, immediately display and select the returned dossier. Prevent a late response from an earlier classification lookup from overwriting the newly created record.

## Approved contract

- C-007 is retained as `superseded-by C-009`.
- C-009 authorizes Admin and Arhivar creation and preserves all other C-007 requirements.
- D-046 supersedes D-045 and authorizes both Admin and Arhivar to create dossiers. D-022, D-038, and other role permissions remain unchanged.

## Consumers

- `backend/routes/api.php` — creation route role middleware.
- `backend/app/Http/Controllers/PhysicalDossierController.php` — existing creation contract provider; validation and derivation remain unchanged.
- `frontend/src/main.jsx` — role-aware create control, immediate select, and stale lookup guard.
- `docs/design/mocks/DS-011.html` — reflect both staff roles.
- `backend/tests/Feature/PhysicalDossierApiTest.php` and `frontend/tests/editor.spec.js` — staff authorization, immediate selection, and late lookup regression.
- `docs/agents/CONTRACTS.md` and `docs/agents/plans/p22-task-checklist.md` — C-009 and verification evidence.

## Verification

PHPUnit passed: 187 tests, 1,480 assertions, 3 skipped. The full serial Playwright suite passed: 204 passed, 28 opt-in real-API skips; the production frontend build passed. Focused creation/race checks passed across all four viewport/theme projects (12 tests), and screenshot coverage was generated for Admin and Arhivar on desktop/mobile in light/dark. Ledger lint and `git diff --check` passed.

The running local Compose database was missing `2026_11_27_100000_add_physical_dossier_catalogue_fields`; its dossier table had zero rows and no duplicate numbers. Applied that additive migration to the local database and verified the migration status and four catalogue columns. The other pending migrations were left untouched. The owner approved the D-045 amendment on 2026-11-27; D-046 records Admin and Arhivar dossier creation.
