# Plan — P22-54a · Prepare the live skeleton configuration

**Plan approved by the owner on 2026-11-21.** Planned from a clean, up-to-date `main`. P22-01 through P22-04 are complete. The checklist also records the authenticated placeholder passing its external HTTPS checks on 2026-11-20. Build and local verification completed on 2026-11-21. The checklist records the fresh external reachability check. [Task checklist](p22-task-checklist.md)

## Size

**M** · One Compose configuration and its operator procedure. The roadmap allocates 75 minutes. [P22 roadmap](p22-roadmap.md)

## Approach

Prefer **FrankenPHP in classic mode** for the live Laravel backend, conditional on the local compatibility checks below. Keep the pinned public Caddy image as the HTTPS and Basic authentication endpoint and use its existing reverse proxy support to reach FrankenPHP over private HTTP. Package the React production build at the edge and keep PostgreSQL and the one-shot Romanian OCR service on the Compose network. This changes only the live PHP runtime and preserves the placeholder as the rollback target.

## Compatibility findings

| Boundary | Evidence and implementation consequence |
|---|---|
| PHP and Docker | The current backend uses PHP 8.4 on Debian Bookworm. Composer requires PHP `^8.3` and resolves against 8.4.0. Registry inspection resolved `dunglas/frankenphp:1-php8.4-bookworm` to index digest `sha256:2721ad9a89b1e34da343f584c063b397012c8c48f0d5727cad657fe2cdf8763f`, with both Linux amd64 and arm64 manifests. Pin the evaluated digest, check the VM platform at preflight, and use the image’s extension installer to build for its thread-safe PHP ABI. [FrankenPHP Docker images](https://frankenphp.dev/docs/docker/) |
| Laravel lifecycle and CLI | Classic mode boots Laravel through `public/index.php` for each request. Configure `php_server` with document root `/app/public` on an internal HTTP listener and omit worker configuration. No Composer package change is needed for this mode. The repository invokes `@php artisan package:discover` during Composer install. Use the image’s PHP CLI for Composer and explicitly verify that hook, Artisan and the HTTP runtime. [Classic mode](https://frankenphp.dev/docs/classic/) · [Laravel integration](https://frankenphp.dev/docs/laravel/) · [Composer CLI caveat](https://frankenphp.dev/docs/known-issues/) |
| Basic authentication and TLS | Keep the hostname, bcrypt auth import, read-only credential mount, TCP listeners, protocol settings and Caddy data path from the placeholder. Only the public Caddy process needs the root-owned auth file and the external certificate volume mounted at `/data`. Authenticate before dispatching static or proxied requests and remove the hosting `Authorization` header on the upstream hop. The internal FrankenPHP listener needs neither credentials nor certificate access. [Placeholder configuration](../../../docker/placeholder/compose.yaml) · [Caddy Basic authentication](https://caddyserver.com/docs/caddyfile/directives/basic_auth) · [Reverse proxy](https://caddyserver.com/docs/caddyfile/directives/reverse_proxy) |
| Route ownership | Serve React at public `/`. Forward exact `/up`, exact `/api` and `/api/*` with their paths and query strings intact. Laravel currently registers the health route and its own empty root response. It has no API route file. Use the health response and a Laravel JSON 404 to distinguish the PHP front controller from the React fallback. [Bootstrap](../../../backend/bootstrap/app.php) · [Web routes](../../../backend/routes/web.php) |
| PHP and system dependencies | Preserve `pdo_pgsql`, `mbstring`, GD with JPEG and PNG, ZIP and POSIX process signalling. Verify real Composer platform requirements plus subprocess execution, Poppler, headless LibreOffice Writer, fonts and util-linux commands including `setsid` and `prlimit`. Use a non-root backend identity with writable Laravel cache, storage and temporary directories. Tesseract remains in the one-shot OCR container. [Current image](../../../docker/backend/Dockerfile) · [Document renderer](../../../backend/app/Services/DocumentPageRenderer.php) · [DOCX conversion](../../../backend/app/Services/DocxConversionService.php) |

The build verified the pinned runtime and exercised the auth challenge, certificate continuity and Laravel response locally. See the task checklist for the results and renderer compatibility fix.

## Files after approval

| Action | Path | Work |
|---|---|---|
| Add | `docker/live/compose.yaml` | Define public Caddy, internal FrankenPHP backend, PostgreSQL with a dedicated persistent volume, and an on-demand OCR smoke service. Publish only Caddy’s web ports. Require runtime-supplied `APP_KEY` and `DB_PASSWORD`, set the live Application URL and production environment, and disable debug. Mount the existing auth file read-only and reference the placeholder’s verified TLS volume as external. |
| Add | `docker/live/Dockerfile` | Use the frontend build context and existing lockfile to run `npm ci` and `npm run build`. Copy only `dist/` into the Caddy runtime. |
| Add | `docker/live/backend.Dockerfile`, `docker/live/FrankenPHP.Caddyfile` | Use the existing backend build context and its ignore rules. Install the locked production dependencies, configure the classic listener on internal port 8000 and run as a non-root user. Supply the listener configuration by read-only Compose mount. |
| Add | `docker/live/Caddyfile` | Reuse the hostname, authentication import and TLS settings from the placeholder. Preserve request paths when proxying to Laravel. Serve frontend assets from the build output. |
| Add | `docker/live/README.md` | Document the working directory, Compose project and volume identities, Docker/Compose and DNS prerequisites, required secret names and private provisioning, validation, startup, smoke checks and restoration commands. Mark commands that change the live host as P22-56b operations. |
| Update on verification | `docs/agents/ARCHITECTURE.md`, `docs/agents/plans/p22-task-checklist.md` | Link the prepared configuration, distinguish local verification from live deployment, and record actual check results or blockers. |

For awareness only, the [placeholder Compose project](../../../docker/placeholder/compose.yaml) and its [operator procedure](../../../docker/placeholder/README.md) identify the public listener and persistent certificate mount. The [local Compose file](../../../compose.yaml), [Laravel routing](../../../backend/bootstrap/app.php) and [frontend build](../../../frontend/package.json) supply the service names, health path and build command. The Ledger lists no provided or consumed contract for this handoff.

## Tests

| # | Behaviour | Test and expected evidence | Execution |
|---|---|---|---|
| 1 | Configuration fails closed | Start with missing required environment inputs and verify `docker compose -f docker/live/compose.yaml config -q` fails for each. Supply disposable inputs and expect success. Validate Caddy with a disposable auth fixture and verify a missing auth import fails. | Local integration, before runtime smoke. Never print expanded Compose configuration. |
| 2 | Routing and authentication | Start the candidate locally with isolated volumes, a test hostname, local TLS and loopback ports. Verify anonymous and invalid credentials receive a 401 challenge on the frontend, one asset, health and API paths. With valid credentials, verify the React document and one referenced asset load, and Laravel answers `/up` with 200. Request an unknown API route with JSON acceptance and verify a backend 404. | Local HTTP integration. Use a disposable trust root. |
| 3 | Dependencies work after restart | Run scaffold migrations against the disposable database, verify migration status through Laravel, recreate the services and verify the migrations persist. Run `docker compose -f docker/live/compose.yaml run --rm ocr-worker` and require the existing Romanian TSV smoke to pass. | Local integration. Run the existing PHPUnit suite in its dedicated test database, the frontend build and Ledger lint. |
| 4 | Intended live host is reachable | From outside Azure, check HTTP redirects to HTTPS on `arhivar.swedencentral.cloudapp.azure.com` and trusted HTTPS gives an anonymous 401 with a Basic challenge. Record date, status and any DNS, TLS or network failure. | Read-only external requests after build approval. A network error leaves this criterion pending. |
| 5 | Operator can restore the placeholder | Exercise the documented stop/start sequence with disposable local projects. Confirm the restored placeholder challenges anonymous requests and returns “Hello World” after authentication. | Local rehearsal. Live cutover belongs to P22-56b. |
| 6 | FrankenPHP runtime parity | Validate both Caddyfiles with their respective image binaries. Verify the effective FrankenPHP configuration enables classic mode with zero worker scripts. Run Composer’s lockfile install with scripts and `composer check-platform-reqs --no-dev`; confirm Artisan boots. Use a disposable, internal-only HTTP fixture to verify the web SAPI, required extensions, GD codecs and subprocess execution as the service user. Run the existing renderer and DOCX cases using a disposable test stage based on the same PHP runtime, with development dependencies. | Local Docker integration. Keep test fixtures out of the published image. |
| 7 | TLS and credential isolation | Seed a disposable TLS volume using the placeholder and local CA. Switch listeners using the same test hostname, compare the served certificate fingerprint across the handoff and rollback, and verify the HTTPS challenge at each step. Check the backend has no host-published port, auth mount or certificate volume and receives no hosting credential. | Local handoff rehearsal. Never mount the live TLS volume for this test. |

## Sequencing

One builder. Establish the negative configuration checks, build and verify the FrankenPHP runtime first, assemble the manifest and frontend image, then exercise routing and persistence locally. Validate the rollback instructions against that setup and check the current public endpoint before recording results.

## Risks

If the pinned image fails a compatibility check, record the failing command and output and resolve it before proposing adoption. Any runtime substitution returns to the owner.

The placeholder owns ports 80 and 443. Before a future cutover, inspect its actual TLS volume identity and auth mount, validate the candidate, and prepare its images while the placeholder is running. For the authorized switch, stop the placeholder listener before starting the candidate listener. If smoke fails, stop the candidate listener, start Caddy from `/opt/archive-placeholder` and repeat the external challenge and authenticated content checks. Preserve both projects’ volumes. Restoring the listener restores traffic only. Database migration reversal requires a separate recovery procedure.

## Out of scope

PHP-FPM, Laravel Octane, persistent PHP workers, live deployment, DNS or firewall changes, Application authentication, new Screens, and queue processing. P22-11 supplies private object storage and signed delivery. P22-56b integrates and verifies those on the host. P22-54b covers release rollback rehearsal.

## Knowledge used

Three previously confirmed entries apply unchanged. **D-001** fixes the containerized stack, **D-003** specifies PHPUnit, and **D-004** specifies Romanian Tesseract and TSV Bounding Boxes. Owner call for each — confirm, wrong or outdated. [Decision entries](../DECISIONS.md)

### Considered, not applied

- **PATTERN-001 and PATTERN-002** — candidate practices, for awareness only. Existing test commands remain available. [Patterns](../PATTERNS.md)
- **D-006** — this task packages an existing frontend build and changes no Screen. The routing smoke checks HTTP delivery.

### Approved cutover procedure

On 2026-11-21 the owner approved separate Compose projects and accepted a brief interruption during the future P22-56b listener switch. Preserve the existing placeholder project and its TLS volume so the operator can restore the authenticated placeholder if a smoke check fails. P22-56b deployment requires separate authorization.
