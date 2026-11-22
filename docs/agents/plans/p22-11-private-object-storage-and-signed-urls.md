# Plan — P22-11 · Private S3-Compatible Object Storage (Cloudflare R2) and Signed URLs

**Status:** Approved for build on 2026-11-21.

## Size
S — Install `league/flysystem-aws-s3-v3`, configure explicit `documents` storage disk (R2 S3-compatible driver in production with strict configuration validation, local private driver in development/testing), implement `DocumentStorageService` with URL-safe opaque token generation and `DocumentDeliveryController` with streaming delivery, add `storage:r2-smoke` verification command, and automated feature tests. Day 3 task with a provisional 90-minute timebox.

## Approach
Configure a dedicated `documents` disk in `backend/config/filesystems.php`. In production (`APP_ENV=production`), the application strictly requires the S3/R2 backend and fails fast on boot or service invocation if any required credentials (`R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`, `R2_ENDPOINT`) are missing or empty—silent fallback to local disk in production is strictly prohibited. In development and testing, an explicit local private disk is permitted to keep automated PHPUnit tests and container development offline.

Implement `DocumentStorageService` to handle binary storage operations on the active documents disk and issue time-limited Signed URLs (`URL::temporarySignedRoute`). To avoid leaking internal directory structures or storage paths, the service encodes storage keys into URL-safe opaque encrypted tokens (using `Crypt::encryptString` converted to URL-safe base64 via `strtr` without padding) for use in the public URL path `/api/documents/deliver/{token}`. This keeps the URL contract fully compatible with future database-backed Document Version UUIDs and Folder Permissions.

Implement `DocumentDeliveryController` to validate cryptographic signatures and expiration timestamps, enforce Romanian error messages on rejection, decode and decrypt the URL-safe opaque token, and stream the file from R2 via `readStream()` with strict security headers (`Cache-Control: private, no-store, max-age=0`, `X-Content-Type-Options: nosniff`). Verify signed URLs through the Caddy + FrankenPHP routing configuration, including expiration and query-parameter tampering.

Application-level permissions (Role: Cititor folder restrictions), Share Link lifecycle/revocation, and Append-Only Audit Log integration are strictly deferred to their respective roadmap tasks (P22-31, P22-34, P22-36a). Until those protections are fully implemented, only synthetic or appropriately anonymized test documents may be uploaded and processed through this feature. Include a dedicated `storage:r2-smoke` command that exercises a live disposable object cycle against Cloudflare R2; live integration remains unverified until this smoke test is executed with real credentials during P22-56b.

## EU-Jurisdiction Cloudflare R2 Evaluation
- **Data Sovereignty & Jurisdictional Restriction:** Cloudflare R2 supports setting a jurisdictional restriction (`jurisdiction: "eu"`), ensuring that all object data at rest is stored within data centers located in the European Union.
- **Compliance Scope Clarification:** While EU data residency satisfies geographical storage requirements, technical data residency alone does not automatically constitute full GDPR compliance or Romanian statutory notarial archival compliance. Comprehensive regulatory compliance requires administrative governance, organizational policies, processing agreements, retention scheduling, and physical retrieval workflows.
- **Endpoint Configuration:** For an EU-jurisdiction bucket, the standardized S3 endpoint format is `https://<R2_ACCOUNT_ID>.eu.r2.cloudflarestorage.com`. Standardized configuration variables:
  - `DOCUMENTS_DISK=r2` (or `local` in local development / offline tests)
  - `R2_ACCESS_KEY_ID`
  - `R2_SECRET_ACCESS_KEY`
  - `R2_BUCKET`
  - `R2_ENDPOINT=https://<R2_ACCOUNT_ID>.eu.r2.cloudflarestorage.com`
  - `R2_USE_PATH_STYLE_ENDPOINT=false`
  - `R2_DEFAULT_REGION=auto`
- **Privacy & Transport Security:** 100% private bucket (no public bucket URL, no public read access). Transport is strictly TLS 1.3. Server-side encryption is standard AES-256. Outbound requests travel securely over HTTPS from the Azure VM (Sweden Central, EU) to Cloudflare EU infrastructure.
- **Free-Tier Allowances:** 10 GB stored data/month, 1,000,000 Class A operations (writes/lists)/month, 10,000,000 Class B operations (reads)/month, and $0 egress bandwidth fees.

## Files
| Action | Path | What |
|---|---|---|
| Update | `backend/composer.json` | Add `league/flysystem-aws-s3-v3: ^3.25` for S3-compatible Flysystem integration. |
| Update | `backend/config/filesystems.php` | Configure `documents` disk with explicit driver selection and standardized `R2_*` environment variables. In production, enforce `r2` with credential validation; in non-production, allow explicit `local` fallback. |
| Update | `.env.example`, `backend/.env.example` | Document standardized `R2_*` and `DOCUMENTS_DISK` configuration variables. |
| Add | `backend/app/Services/DocumentStorageService.php` | Service managing document upload, streaming, existence checks, URL-safe opaque token encryption/decryption, and expiring Signed URL generation. |
| Add | `backend/app/Http/Controllers/DocumentDeliveryController.php` | HTTP controller validating signature and expiry, resolving URL-safe opaque tokens, and streaming files with accurate MIME types and security headers. |
| Update | `backend/routes/web.php` | Register signed delivery route `GET /api/documents/deliver/{token}` named `documents.deliver`. |
| Update | `backend/routes/console.php` | Register `storage:r2-smoke` Artisan command to perform live disposable upload, read, verification, and cleanup against Cloudflare R2. |
| Add | `backend/tests/Feature/DocumentStorageTest.php` | Automated PHPUnit feature tests (offline, using `Storage::fake('documents')`) covering URL-safe token resolution, URL signing, expiry enforcement, tampering rejection, and streaming headers. |
| Update | `docs/plans/p22-11-private-object-storage-and-signed-urls.md` | Keep plan file in sync with approved requirements. |
| Update after verification | `docs/agents/ARCHITECTURE.md`, `docs/agents/plans/p22-task-checklist.md` | Record R2 EU integration details, environment variables, and verification evidence. |

## Tests
| # | Behaviour | Test (file · kind) | Not automated? why |
|---|---|---|---|
| 1 | Production environment throws RuntimeException when R2 credentials or endpoint are missing | `tests/Feature/DocumentStorageTest.php` · Feature | Automated |
| 2 | `DocumentStorageService` stores and retrieves binary streams on the configured private documents disk | `tests/Feature/DocumentStorageTest.php` · Feature | Automated (offline fake) |
| 3 | Service generates Signed URL with URL-safe opaque token (no raw filesystem path exposed in URL) | `tests/Feature/DocumentStorageTest.php` · Feature | Automated |
| 4 | Valid Signed URL with URL-safe opaque token delivers document with HTTP 200, correct MIME type, and security headers | `tests/Feature/DocumentStorageTest.php` · Feature | Automated |
| 5 | Anonymous request (missing signature) is rejected with HTTP 403 and Romanian error | `tests/Feature/DocumentStorageTest.php` · Feature | Automated |
| 6 | Expired Signed URL is rejected with HTTP 403 and Romanian error | `tests/Feature/DocumentStorageTest.php` · Feature | Automated |
| 7 | Tampered signature or token is rejected with HTTP 403 | `tests/Feature/DocumentStorageTest.php` · Feature | Automated |
| 8 | Malformed or invalid opaque token returns HTTP 404 | `tests/Feature/DocumentStorageTest.php` · Feature | Automated |
| 9 | Missing file with otherwise valid signature returns HTTP 404 | `tests/Feature/DocumentStorageTest.php` · Feature | Automated |
| 10 | Content disposition parameter toggles `inline` vs `attachment` download | `tests/Feature/DocumentStorageTest.php` · Feature | Automated |
| 11 | Caddy + FrankenPHP live skeleton routes signed delivery requests and rejects expired/tampered queries | Integration test / Live skeleton test | Automated via FrankenPHP / Compose configuration test |
| 12 | Disposable object round-trip against real Cloudflare R2 bucket (`php artisan storage:r2-smoke`) | Live CLI smoke command | Manual / Live command (requires real R2 credentials; executed on VM during P22-56b) |

## Design (UI only)
None — Backend service, delivery controller, and Artisan smoke command.

## Sequencing
one builder

## Risks
| Risk | Fallback / Mitigation |
|---|---|
| Silent production fallback to local disk | `DocumentStorageService` checks `app()->isProduction()` and fails hard with an explicit `RuntimeException` if `DOCUMENTS_DISK` is not configured for R2 or if R2 environment variables are missing. |
| Inadvertent exposure of internal storage keys | Public URLs strictly use encrypted URL-safe opaque tokens (`Crypt::encryptString($path)` with base64url encoding). Internal directory structures, file extensions, and storage paths are never visible in client URLs. |
| URL character corruption in transit | Tokens use URL-safe base64 character mapping (`-`, `_` without padding `=`) so web servers and reverse proxies do not alter or percent-encode payload bytes. |
| Live R2 connectivity failure during deployment | The `storage:r2-smoke` command isolates and verifies live R2 read/write/delete with a disposable object before any operational cutover. Live R2 integration will not be marked verified until this test passes on the host. |

## Out of scope
- Role-based Folder Permission checks for Cititor (belongs to P22-31 / P22-38).
- Share Link creation, password protection, and immediate link revocation (belongs to P22-34 / P22-41a / P22-41b).
- Append-Only Audit Log recording of each access, view, or download (belongs to P22-36a / P22-43).
- Live deployment cutover on Azure VM (belongs to P22-56b).

## Knowledge used

| Entry | What it says | Why it applies | Call |
|---|---|---|---|
| Eight previously confirmed decisions, unchanged · D-001, D-002, D-003, D-018, D-028, D-034, D-037, D-038 | React, Laravel, PostgreSQL and Docker stack; private storage without unanonymized public document access; PHPUnit tests; Romanian-only system errors; DOCX original preservation and derived PDF delivery; expiring Signed URLs; Document Versions and draft storage. | Governs storage isolation, URL signing, Romanian rejection errors, and test automation. | Confirmed (2026-11-21). |
| C-001 | Expiring Signed URL document delivery endpoint (`GET /api/documents/deliver/{token}`) delivers private documents over HTTPS when signed with valid `signature` and `expires`. Rejects invalid/expired signatures with HTTP 403 and missing files with HTTP 404. Uses opaque URL-safe encrypted token resolving internally to the target object. | Defines the boundary contract between Laravel Backend storage delivery and consumers (internal viewers, downloads, and external Share Links). | Confirmed (2026-11-21). |

### Considered, not applied
- Self-hosted MinIO — Rejected due to community edition distribution deprecation, licensing instability, host memory/CPU overhead on the 4 GB Azure VM, and lack of off-host persistence.
- Direct S3 presigned URLs without Laravel mediation — Rejected because direct bucket presigned URLs cannot be revoked upon request, bypass the Append-Only Audit Log, and cannot enforce in-flight Cititor permission checks.
- Raw storage paths in delivery URLs — Rejected in favor of URL-safe opaque tokens to prevent leaking internal directory structures and to ensure forward compatibility with Document Version UUIDs.

### Assumptions (no entry behind them)
- Cloudflare R2 credentials for an EU-jurisdiction bucket will be supplied via `.env` for live verification and deployment. Automated feature tests run entirely offline using `Storage::fake('documents')`.
