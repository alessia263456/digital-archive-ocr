# Plan — P22-25 · Username/password authentication and roles

**Status:** Implemented on 2026-11-23 (approved 2026-11-23).

## Size

**M · 75-minute roadmap timebox.** The work adds Sanctum bearer-token authentication, API route setup, login rate limiting, reusable role enforcement, and PostgreSQL-backed feature coverage. No Screen or frontend work is included.

## Approach

Enable Laravel Sanctum API tokens and the API route file, then reuse the P22-18 `User` model, username column, and hashed password cast. Add `POST /api/login` to validate username/password and issue a bearer token, `POST /api/logout` to revoke the current token, and a named Laravel rate limiter for failed login attempts. Tokens expire after 12 hours; five failed attempts per normalized username/IP pair per minute produce HTTP 429 for further attempts during that window. Add reusable role middleware for `admin`, `admin`/`arhivar`, and authenticated-role route groups. Exercise those groups through routes registered only in feature tests because no protected staff resource routes exist yet; later resource tasks apply the middleware to their own routes. Keep `/api/documents/deliver/{token}` outside authentication because C-001 grants access through its expiring signature.

This follows the repository architecture’s Sanctum direction and the owner’s transport confirmation. Do not add a second auth package, session-cookie auth, a current-user endpoint, account-management routes, or token-expiry configuration.

## Files

| Action | Path | What |
|---|---|---|
| Add dependency and lockfile entry | `backend/composer.json`, `backend/composer.lock` | Add `laravel/sanctum` using Laravel’s API installation path. |
| Add | `backend/routes/api.php` | Define login and authenticated logout routes; leave signed document delivery outside the auth group. |
| Update | `backend/bootstrap/app.php` | Register the API routes and the role middleware alias. |
| Update | `backend/app/Providers/AppServiceProvider.php` | Register the named login limiter: count failed credential responses by normalized username and IP; return the agreed Romanian 429 response when the confirmed limit is reached. |
| Add | `backend/app/Http/Controllers/AuthController.php` | Validate username/password, issue a Sanctum token with the reviewed lifetime, return only approved user fields, and revoke the current token on logout. |
| Update | `backend/app/Models/User.php` | Add Sanctum’s token relationship trait without exposing secrets through serialization. |
| Add | `backend/app/Http/Middleware/RequireRole.php` | Return 401 for unauthenticated access and 403 when the authenticated role is outside the route’s allowed role list. |
| Add | `backend/database/migrations/*_create_personal_access_tokens_table.php` | Persist token hashes and token metadata using Sanctum’s migration. |
| Add | `backend/tests/Feature/AuthenticationAndRolesTest.php` | Cover login, rate limiting, token expiration/revocation, and the role matrix using test-only routes. |
| Update after implementation | `docs/agents/ARCHITECTURE.md` | Record the implemented Sanctum API boundary and middleware. |
| Update after implementation | `docs/agents/plans/p22-task-checklist.md` | Mark P22-25 complete after the checks pass. |
| Updated | `docs/agents/OPEN-QUESTIONS.md` | Mark Q-022 answered with the confirmed token lifetime and failed-login threshold. |
| Approved and recorded | `docs/agents/CONTRACTS.md` | C-002 records the corrected auth endpoint contract; the login payload excludes `name` and `email`. |
| Updated | `docs/agents/DECISIONS.md` | Record D-041 as approved with the confirmed token lifetime and rate-limit policy. |
| Consumer alignment in later work | Frontend DS-010; P22-12b protected draft routes; P22-40 Admin account APIs | Consume C-002 and apply the shared bearer-auth and role middleware. These resource/UI changes are not part of P22-25. |

## Tests

| # | Behaviour | Test (file · kind) | Not automated? why |
|---|---|---|---|
| 1 | Valid username/password returns a bearer token and safe user fields `{id, username, role}`; the response includes neither `name` nor `email`, and never includes the password or stored token hash. | `AuthenticationAndRolesTest.php` · PHPUnit against PostgreSQL | — |
| 2 | Unknown username and wrong password both return the same Romanian 401 response. | `AuthenticationAndRolesTest.php` · PHPUnit | — |
| 3 | Five failed credential attempts from the same normalized username/IP pair within one minute are counted; the next attempt returns a Romanian 429. Validation failures do not count. | `AuthenticationAndRolesTest.php` · PHPUnit | — |
| 4 | A token becomes invalid 12 hours after issuance under D-041. Logout revokes the current token immediately; both cases return 401 on the same protected test route. | `AuthenticationAndRolesTest.php` · PHPUnit with time travel | — |
| 5 | Unauthenticated protected requests return 401. For role-gated test routes, `admin` alone passes the admin group; `admin` and `arhivar` pass the staff group; each of `admin`, `arhivar`, and `cititor` passes only the all-authenticated group. Disallowed roles return 403. | `AuthenticationAndRolesTest.php` · PHPUnit | — |
| 6 | The existing expiring Signed URL delivery remains usable without a staff bearer token when its signature is valid, and rejects invalid signatures. | Existing `DocumentStorageTest.php` · PHPUnit | — |
| 7 | Sanctum token migration and the full backend suite pass against the dedicated PostgreSQL test database. | `MigrationSmokeTest.php` and full PHPUnit suite | — |
| 8 | Backend image build and Ledger lint pass. | Repository commands in `AGENTS.md` | — |

## Design (UI only)

Not applicable. P22-25 is backend-only; DS-010 implementation remains out of scope.

## Sequencing

One builder. After the approved plan is handed to `/build`, install Sanctum/API routing and migrate the dedicated test database; implement the named failed-login limiter, login/logout and role middleware; add the test-only role routes and PHPUnit coverage; then update Architecture and the checklist. Do not add production probe routes. Apply role middleware to concrete resource routes in the later tasks that create those routes.

## Risks

- **Token lifetime and login limiter:** Approved. Tokens expire 12 hours after issuance; five failed credential attempts per normalized username/IP pair within one minute trigger HTTP 429 for further attempts in that window. A shorter lifetime increases reauthentication; a longer lifetime leaves lost tokens usable for longer.
- **Public signed delivery:** Registering API routes or auth middleware must not accidentally place C-001 delivery behind staff authentication. Retain and run its existing signed-request tests.
- **No current protected staff resource endpoint:** The role matrix proves middleware behavior through test-only routes. Resource-level access remains the responsibility of P22-12b, P22-40, and later API tasks.

## Out of scope

Login Screen DS-010; account creation/editing and account Admin APIs (P22-40); password reset; multi-device token management and revocation of other devices; role changes; dossier-level Folder Permissions; protected draft retrieval (P22-12b); resource-specific route policies before those resources exist; changes to signed document delivery; deployment and production-database changes.

## Framework references

- [Laravel 13 Sanctum](https://laravel.com/framework/docs/sanctum) — API token authentication, per-token expiry, current-token revocation, and expired-token pruning.
- [Laravel 13 Routing](https://laravel.com/framework/docs/routing) — `install:api` installs Sanctum and configures API routing; named response-based rate limits can count only failed login responses.
- [Laravel 13 Starter Kits](https://laravel.com/framework/docs/13.x/starter-kits) — demonstrates a five-per-minute login limiter keyed by username and IP; D-041 records the owner-approved application of that threshold here.

## Knowledge used

Previously confirmed and applicable, unchanged: **D-001**, **D-003**, **D-017**, **D-018**, **D-032**, and **C-001**.

| Entry | What it says | Why it applies | Call |
|---|---|---|---|
| D-001 | Laravel backend and PostgreSQL are required. | Sanctum integration, token persistence, and backend route work stay on the approved stack. | Confirmed previously; unchanged |
| D-003 | Backend automated tests use PHPUnit. | All auth and role acceptance is specified as PHPUnit feature coverage. | Confirmed previously; unchanged |
| D-017 | Accounts authenticate with Admin-managed username/password; SSO, OAuth, magic links, and 2FA are out of scope. | Defines the credential source and exclusions. | Confirmed previously; unchanged |
| D-018 | UI and system errors are Romanian-only. | Login and authorization API errors must use Romanian text and the existing `eroare` response convention. | Confirmed previously; unchanged |
| D-032 | Defines which roles may access each Screen. | Supplies the admin-only, admin/arhivar, and all-role groups for middleware coverage. `cititor` access to documents remains subject to Folder Permissions in later work. | Confirmed previously; unchanged |
| C-001 | Signed URL delivery is public to a valid expiring signature and is not staff-authenticated. | Prevents the auth middleware from breaking external signed delivery. | Confirmed previously; unchanged |
| C-002 (approved) | `POST /api/login` accepts `{username, password}` and returns `{token, token_type: "Bearer", user: {id, username, role}}`; it omits `name` and `email`. Invalid credentials return one generic Romanian 401; a throttled attempt returns Romanian 429. `POST /api/logout` requires the bearer token, revokes only that token, and returns 204. Missing, revoked, or expired tokens return JSON 401; a disallowed role returns JSON 403. | Gives the future frontend and protected API tasks a stable interface without exposing fields outside the approved response. | Confirmed 2026-11-23 |
| Q-022 (answered) | Confirms a 12-hour bearer-token lifetime and five failed attempts per normalized username/IP pair per minute. | Settles the token exposure window and login throttling. | Answered as D-041 on 2026-11-23 |
| D-041 (approved) | Use Sanctum bearer tokens with a 12-hour lifetime; limit failed login attempts to five per normalized username/IP pair per minute; logout revokes the current token. | Records the authentication lifecycle and password-guessing controls. | Confirmed 2026-11-23 |

### Considered, not applied

- **PATTERN-001** — Candidate only; not treated as an approved practice. Tests will follow the existing PHPUnit/PostgreSQL configuration and `MigrationSmokeTest.php`.
- **D-006** — Frontend visual testing does not apply because no UI changes are included.
- **Q-021** — OCR similarity criteria are unrelated to P22-25 and remain open.

### Assumptions (no entry behind them)

- None. Token transport, role-test coverage, rate limiting, token lifetime, and the failure threshold were confirmed by the owner.

## Ledger updates

D-041 is approved and confirmed; Q-022 is answered and recorded as D-041. C-002 is approved and recorded in `CONTRACTS.md` with the corrected response shape. The rejected ledger was checked before proposing D-041. The owner approved the plan and confirmed the 12-hour token expiry and five failed attempts per normalized username/IP pair per minute.

## Implementation record

- Added Sanctum token persistence and API routes for username/password login and current-token logout. Login responses follow C-002 exactly; role middleware is registered as `role` and returns JSON 401/403 responses.
- Added response-based login throttling keyed by a hash of normalized username and client IP. Validation errors do not consume the limit.
- Added PostgreSQL feature coverage for credentials, the safe response shape, 12-hour expiry, token revocation, throttling and its validation exemption, authentication errors, and the D-032 role matrix on test-only routes.
- Verification on isolated disposable PostgreSQL test databases: focused auth suite 7 tests / 83 assertions; full backend suite 64 tests / 320 assertions, 2 skipped. Backend image build passed. Ledger lint and whitespace checks are recorded after completion.
- No frontend/login screen, deployment, production database access, or production data changes were part of this implementation.
