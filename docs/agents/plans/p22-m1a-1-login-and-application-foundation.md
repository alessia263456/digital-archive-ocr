# Plan — M1a.1 · Login and application foundation

**Status:** Approved and implemented on 2026-11-24. Automated verification and owner local review passed; merged into `main`. DS-010 and DS-001 mocks were approved for implementation on 2026-11-24.

## Size

**M · 4–6 hours** for implementation and automated verification. Work includes stateful session authentication, local/live proxy routing, two React Screens, and related migration, CI, and documentation updates. Record actual implementation, verification, owner review, and manual testing durations in the task checklist.

## M1a breakdown

M1a remains one milestone with its original secure browser-to-OCR workflow and acceptance criteria. Each part has a separate plan, approval, build, and verification cycle. Only M1a.1 is planned in detail here; plan later parts after verifying their prerequisites.

| Part | Size | Scope |
|---|---|---|
| M1a.1 · Login and application foundation | M | Local frontend/API connectivity; functional DS-010; secure session authentication and protected routes; minimal navigation; DS-001 default home and true empty state. |
| M1a.2 · Upload and OCR processing | S–M | Functional DS-003 single-document upload using existing intake APIs; verify the OCR worker, persisted statuses, and errors. Use explicit user-triggered status refresh; no automatic polling in the initial workflow. |
| M1a.3 · Protected OCR results and preview | M | Append-only audit writer; protected OCR detail and Signed URL issuance; read-only DS-011 with actual preview and persisted OCR text; privacy, authorization, and audit verification. |
| M1a.4 · Integration and milestone verification | S–M | Complete CI and docs, finish live-admin provisioning procedure, verify the full browser-to-worker workflow, and record milestone acceptance evidence. Start independent CI and documentation work earlier where practical. |

These boundaries preserve the roadmap’s P22 task IDs and full M1a acceptance criteria. M1a.1 covers P22-35 and the initial DS-001 home/empty-state slice of P22-34. P22-23, P22-36a, and the protected preview slice of P22-38 remain incomplete until their later M1a parts are implemented and verified.

## Approach

Use Laravel’s database-backed sessions and Sanctum’s stateful API middleware for first-party SPA authentication. Reuse existing credential validation, failed-login throttling, role middleware, and React/Vite, PHPUnit, and Playwright foundations. Use Laravel’s CSRF-cookie flow and session invalidation; add only the server-side session-age check needed for the approved 30-minute idle and 12-hour maximum limits. Laravel documents the Sanctum session/CSRF flow and regenerating and invalidating sessions on login/logout ([Sanctum SPA authentication](https://laravel.com/framework/docs/sanctum#spa-authentication), [authentication](https://laravel.com/framework/docs/13.x/authentication#logging-out), [CSRF](https://laravel.com/framework/docs/13.x/csrf)).

Use `auth:web` for first-party protected API routes behind Sanctum’s stateful middleware. This keeps session-cookie authentication while avoiding Sanctum’s bearer-token fallback on application routes. Stop issuing personal access tokens, remove `HasApiTokens` from `User`, and revoke existing personal access tokens once through a migration. Keep the existing token table but leave it unused; no M1a application route will accept bearer tokens.

Recurring status requests would count as session activity and could extend the idle window. M1a uses an explicit refresh action initiated by the user instead. Do not add background polling or custom polling exemptions in this part.

## Files

| Action | Path | What |
|---|---|---|
| Update | `backend/bootstrap/app.php` | Enable Sanctum stateful API middleware and register the session-age middleware. |
| Add | `backend/config/sanctum.php` | Configure the exact local frontend host/port and live host as stateful domains. |
| Update | `backend/config/session.php`, `backend/.env.example`, `compose.yaml`, `docker/live/compose.yaml` | Configure database-backed encrypted sessions, 30-minute idle lifetime, browser-close cookie, `HttpOnly`, `SameSite=Lax`, and production `Secure`; leave `SESSION_DOMAIN` unset for host-only cookies. |
| Add | `backend/database/migrations/*_create_sessions_table.php` | Persist sessions in PostgreSQL. |
| Add | `backend/database/migrations/*_revoke_legacy_personal_access_tokens.php` | Revoke previously issued Sanctum personal access tokens; do not restore them on rollback. |
| Add | `backend/app/Http/Middleware/EnforceSessionLifetime.php` | Enforce server-side idle and absolute session age and return a Romanian JSON 401 response when either limit is exceeded. Keep this narrow because Laravel’s standard session configuration does not provide the approved absolute maximum. |
| Update | `backend/app/Http/Controllers/AuthController.php`, `backend/routes/api.php`, `backend/app/Models/User.php` | Reuse username/password validation and throttling; authenticate through Laravel’s session guard and regenerate the session; invalidate session and CSRF token at logout; add a safe current-user endpoint; use `auth:web` plus existing role middleware; remove token issuance and `HasApiTokens`. |
| Update | `backend/tests/Feature/AuthenticationAndRolesTest.php`, `backend/tests/Feature/DocumentDraftIntakeTest.php`, and protected-resource tests using Sanctum actingAs | Cover session behavior and update protected-resource tests to use the web session guard without changing their access assertions. |
| Update | `backend/database/seeders/DatabaseSeeder.php`; add a small interactive admin-provisioning Artisan command | Remove the fixed example admin and provide a secret-prompted local account setup without a committed/default password. The final live operational procedure remains in M1a.4. |
| Add | `frontend/vite.config.js`; update `frontend/src/main.jsx`, `frontend/src/theme.css`, `frontend/index.html` | Proxy `/api` and `/sanctum` to Laravel locally; convert the approved DS-010 and DS-001 mock structures to functional React with minimal navigation, real auth state, and the true empty state. |
| Add | `frontend/src/api.js`, `frontend/src/auth.js` or equivalent small modules | Use same-origin credentialed requests, read the CSRF token cookie to send `X-XSRF-TOKEN`, and handle 401/419 in Romanian. Never store authentication credentials in browser storage. |
| Update | `docker/live/Caddyfile`, `docker/live/test_config.py` and/or a focused local proxy smoke check | Route `/sanctum` and `/sanctum/*` to Laravel alongside existing API paths. Keep Caddy access logging disabled; do not record Signed URL paths or query strings. |
| Add/update | `.github/workflows/backend.yml` and existing frontend workflow as needed | Begin PHPUnit and Ledger lint CI integration in M1a.1; M1a.4 adds full workflow integration. |
| Update | `docs/agents/CONTRACTS.md`, `docs/agents/DECISIONS.md`, `docs/agents/DECISIONS-SUPERSEDED.md`, `docs/agents/ARCHITECTURE.md`, `docs/agents/plans/p22-task-checklist.md`, `README.md`, `AI_LOG.md` | Record the approved C-003 amendment, D-043 and D-041 supersession, session and proxy setup, local instructions, and actual durations. Run Ledger lint after Ledger changes. |
| Update after implementation | `docs/design/registry.yaml`, `docs/design/screens/DS-010.*`, `docs/design/screens/DS-001.*` | Mark the Screens implemented and save inspected desktop/mobile light/dark screenshots. Preserve source HTML mocks. |

### Approved Ledger changes to record during implementation

- Amend **C-003** in place for stateful SPA login/logout, safe current-user response, CSRF requirements, session-only app routes, and JSON 401/419 behavior. Remove bearer-token issuance and app-route bearer access from the browser contract. Align existing P22-12b protected draft endpoints/tests and future P22-40/later API consumers.
- Add **D-043** and mark **D-041** `superseded-by D-043`. D-043 retains five failed credential attempts per normalized username/IP per minute and the validation exemption; it uses a 30-minute idle timeout and 12-hour maximum authentication window for server-side sessions, with browser-close, host-only, HttpOnly, SameSite=Lax cookies and Secure cookies in production.
- Record the owner’s confirmation date as **2026-11-24**. No other approved decision or contract changes.

## Tests

| # | Behaviour | Test (file · kind) | Not automated? why |
|---|---|---|---|
| 1 | `/sanctum/csrf-cookie` works through local Vite and live Caddy routing; it sets CSRF/session cookies without bearer auth. | Playwright/local proxy check; Caddy config validation and disposable local proxy smoke check | No live deployment or public traffic is included. |
| 2 | Login returns safe user identity, regenerates the session ID, and sets HttpOnly/SameSite=Lax session cookies; production config sets Secure. | PHPUnit and Playwright cookie inspection | — |
| 3 | Missing or mismatched CSRF token rejects state-changing requests; logout invalidates the session and rotates CSRF state. | PHPUnit with CSRF middleware explicitly exercised; Playwright | Laravel disables CSRF middleware in normal feature tests, so test setup must explicitly exercise it. |
| 4 | A session is rejected after 30 minutes idle or 12 hours maximum even if a client still sends its cookie. | PHPUnit with persisted sessions and controlled time | — |
| 5 | Failed-login throttling, validation exemption, generic Romanian errors, and role matrix remain as approved. | PHPUnit | — |
| 6 | Anonymous, `cititor` on staff routes, and valid legacy bearer-token requests are rejected; existing personal access tokens are revoked by migration. | PHPUnit with a synthetic legacy token and migration assertion | — |
| 7 | DS-010 login, expired-session handling, protected navigation, DS-001 default/empty state, and logout work against the real API. No auth credential is written to local/session storage. | Playwright desktop/mobile, light/dark | Owner manually tests local login/logout. |
| 8 | Keyboard focus, responsive layout, Romanian messages, loading/error states, and Screens match the approved mocks and Design Tokens. | Playwright screenshots and inspection | — |
| 9 | App/proxy logs exclude passwords, session identifiers, CSRF credentials, OCR content, and Signed URL credentials. | Synthetic-canary log inspection; repeat Signed URL-specific check in M1a.3/M1a.4 | Signed URL issuance is added in M1a.3. |
| 10 | PHPUnit, Ledger lint, frontend build, and applicable Compose/Caddy configuration checks pass. | CI and repository commands | Actual check runs occur during implementation. |

## Design (UI only)

DS-010 and DS-001 are approved for implementation by the owner on 2026-11-24; the registry already lists both as approved. Convert their approved HTML/CSS mock structure to React, reuse existing Design Tokens and fonts, and remove mock-only tools/data. Cover empty, loading, error, success, long text, keyboard focus, and light/dark states. Keep the shared layout and navigation minimal; final branding, header/sidebar, and visual polish remain M5 work.

## Sequencing

One builder. Configure the session table, stateful middleware, domains, and proxy paths first; then convert auth and revoke legacy tokens; then build DS-010, minimal navigation, DS-001, and safe local admin provisioning. Verify security, role access, proxy paths, UI behavior, and screenshots. Start PHPUnit/Ledger CI work early, then update documentation and record actual durations. M1a.1 does not implement upload, OCR status display, audit writer, OCR detail, or preview.

## Risks

- **Session expiry:** Laravel’s regular idle lifetime is not the approved absolute limit; the small server-side age check must prove both limits.
- **Token retirement:** the migration invalidates old tokens. The token table remains but `User` no longer issues tokens and app routes use the web session guard.
- **Proxy routing:** local Vite and live Caddy must both proxy `/sanctum`; live production cookies must remain Secure and host-only. Validate the actual Caddy file using a disposable local stack; do not deploy.
- **XSS:** HttpOnly reduces credential theft through JavaScript but not actions performed by injected script. Use React’s escaped rendering, avoid raw HTML insertion, and verify a restrictive same-origin Content Security Policy.
- **Polling:** no recurring status calls are part of M1a.1 or M1a.2; user-triggered refresh avoids silently extending the idle limit.
- **Logging:** current Caddy configuration has no access-log directive. Preserve that; verify application and proxy logs with synthetic canaries. Recheck Signed URL credentials when that endpoint is added in M1a.3.

## Out of scope

M1a.2 upload/OCR status UI; M1a.3 audit/OCR detail/Signed URL/DS-011; M1a.4 full workflow acceptance and live-admin operating procedure; deployment; final shared branding; and later-milestone archive search/browse features.

## Knowledge used

Previously confirmed, unchanged: **D-001, D-003, D-006, D-017, D-018, and D-042**.

| Entry | What it says | Why it applies | Call |
|---|---|---|---|
| D-041 | Bearer tokens expire after 12 hours; login throttling is five failed attempts per normalized username/IP per minute. | The owner approved replacing token lifetime with a 30-minute idle and 12-hour maximum session policy while retaining the throttling rule. | Supersede with approved D-043 during implementation. |
| C-003 | Bearer login response, bearer logout, and protected bearer-token routes. | The approved amendment replaces browser bearer auth with stateful session auth, CSRF, logout invalidation, and session-only app routes. | Amend in place during implementation; owner approved. |
| Q-022 | Previously answered as D-041 for token lifetime and login threshold. | Token lifetime aspect is superseded; the failed-login limit remains approved. | Keep answered history; do not reopen. |
| PATTERN-009 | Candidate login limiter practice. | Existing implementation and tests are reused; candidate is not an approved rule. | Considered, not relied on. |

### Considered, not applied

- C-001 remains unchanged and governs document delivery in M1a.3.
- No cross-origin CORS/cookie setup: Vite and Caddy proxy requests same-origin.
- No browser token storage or automatic status polling.
- Keep the now-unused personal-access-token table; revoke records and remove token issuance and app-route bearer authentication.

### Assumptions

- None. The session policy, bearer-token retirement, and C-003 amendment were approved by the owner. Future Screen work may begin only after Screen approval; both are now approved.

## Implementation record

- Implemented on 2026-11-24 on branch `feat/p22-m1a1-login-foundation`. The user confirmed the local Vite origin as `http://127.0.0.1:5173` and selected copy-only for the DS-001 empty state.
- **Codex implementation/verification duration:** about 1 hour 15 minutes elapsed from the test-first commit to automated verification; active editing time was not separately measured. **Owner review/manual login/logout test:** passed on 2026-11-24; review duration was not recorded. **Approval-to-verified turnaround:** same date, 2026-11-24; approval time was not recorded.
- **Verification:** PHPUnit 82 tests, 471 assertions, 3 existing skips; standard frontend build and Playwright 28 passed, 4 opt-in real-API tests skipped without backend URL; opt-in real-API Playwright 4 passed across desktop/mobile light/dark. Live Compose/Caddy static configuration checks passed (4 tests), local Compose config, Ledger lint, and `git diff --check` passed.
- **Screenshots:** inspected desktop and mobile light/dark captures, plus 320×740 and 1600×900 states for both Screens. Saved under `docs/design/screens/`.
- The existing base migration already creates `sessions`; no duplicate session-table migration was added. A narrow API CSRF adapter was added after explicit middleware tests showed Laravel returned a generic English error instead of the approved Romanian 419 response. The frontend test Docker context was corrected to include Vite proxy configuration and public fonts after a real proxy smoke test showed those files were excluded.
- Playwright UI success/logout state tests use mocked API responses; real Vite-to-Laravel proxy, cookie attributes and CSRF header were additionally checked against the local backend with invalid credentials. Successful session login/logout and role authorization are covered by PHPUnit. The owner’s local manual review passed.
- The existing scaffold heading assertion was changed to expect `Autentificare` with the user’s approval; its other assertions were preserved.
- The owner manually verified valid and invalid credentials, session persistence, logout, protected page access, and the visual appearance of both implemented Screens on 2026-11-24.
