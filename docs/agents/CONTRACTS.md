# Contracts — proiect1

<!-- graffino-agentic:begin v1 -->
> Promises across a boundary. **Provided:** this repo owns the contract; the text
> lives here only. **Consumed:** a link to the provider's entry plus the fields this
> repo relies on. **External:** what we rely on from a third-party service.
> Changing a provided contract is a PROPOSAL (AGENTS.md → The gate) and the plan
> lists the consumers' files too. Status: `approved` · `proposed` · `superseded-by`.
<!-- graffino-agentic:end -->

## Index
- C-001 · Expiring Signed URL document delivery endpoint · provided
- C-002 · Username/password bearer authentication and role-protected API · provided · _superseded-by C-003_
- C-003 · Username/password session authentication and role-protected API · provided
- C-004 · Protected draft OCR correction and PII review API · provided · _superseded-by C-005_
- C-005 · Revision-bound OCR edits and validated word associations · provided

---

## Provided

## C-001 · Expiring Signed URL document delivery endpoint
- **Status:** approved
- **Date:** 2026-11-21
- **Interface:** HTTP `GET /api/documents/deliver/{token}` with query parameters `expires` (integer Unix epoch timestamp) and `signature` (HMAC-SHA256 hex digest), with optional `disposition` (`inline` [default] or `attachment`). The `{token}` parameter is an opaque, URL-safe encrypted payload resolving internally to a private storage object. Valid requests stream the document binary with accurate `Content-Type` and security headers (`Cache-Control: private, no-store, max-age=0`, `X-Content-Type-Options: nosniff`). Invalid or expired signatures return HTTP 403; unresolvable or missing files return HTTP 404.
- **Evidence:** docs/plans/p22-11-private-object-storage-and-signed-urls.md
- **Consumers:** Frontend document viewers (DS-002, DS-009) and external Share Link recipients
- **Confirmed:** 2026-11-21

## C-002 · Username/password bearer authentication and role-protected API
- **Status:** superseded-by C-003
- **Date:** 2026-11-23
- **Interface:** `POST /api/login` accepts JSON `{username, password}`. On success it returns HTTP 200 with `{token, token_type: "Bearer", user: {id, username, role}}`; `name` and `email` are not included. Invalid credentials return a generic Romanian HTTP 401 response using the `eroare` field. When the login rate limit is exceeded, return a Romanian HTTP 429 response using `eroare`; the limit is defined by D-041 after Q-022 is answered. `POST /api/logout` requires `Authorization: Bearer <token>`, revokes only the current token, and returns HTTP 204. Protected API routes require the bearer token; missing, revoked, or expired tokens return JSON HTTP 401, and authenticated users with a disallowed role receive JSON HTTP 403. Role grants follow D-032 and the resource-specific task.
- **Evidence:** [P22-25 plan](plans/p22-25-username-password-authentication-and-roles.md) and owner confirmation in chat.
- **Consumers:** Future Login Screen DS-010, P22-12b protected draft routes, P22-40 Admin account APIs, and later protected backend APIs.
- **Confirmed:** 2026-11-23

## C-003 · Username/password session authentication and role-protected API
- **Status:** approved
- **Date:** 2026-11-24
- **Interface:** `GET /sanctum/csrf-cookie` issues the first-party session and XSRF cookies. The browser sends same-origin requests and includes the decoded `XSRF-TOKEN` cookie in `X-XSRF-TOKEN` on state-changing requests; a missing or mismatched CSRF token returns Romanian JSON HTTP 419 using `eroare`. `POST /api/login` accepts JSON `{username, password}`. On success it regenerates the session ID and returns HTTP 200 with `{user: {id, username, role}}`; `name`, `email`, and bearer tokens are not included. Invalid credentials return a generic Romanian HTTP 401 response using `eroare`. Limit failed credential attempts as defined by D-043 and return Romanian HTTP 429 using `eroare`; validation errors do not count. `GET /api/user` returns only `{id, username, role}` for the authenticated session. `POST /api/logout` requires the session and CSRF token, invalidates the session, rotates CSRF state, and returns HTTP 204. Protected application routes require a live `auth:web` session; missing, expired, or revoked sessions and bearer-token-only requests return JSON HTTP 401, and authenticated users with a disallowed role receive JSON HTTP 403. Role grants follow D-042 and the resource-specific task.
- **Evidence:** C-002, [P22-25 plan](plans/p22-25-username-password-authentication-and-roles.md), [M1a.1 plan](plans/p22-m1a-1-login-and-application-foundation.md), and owner approval in chat on 2026-11-24.
- **Consumers:** DS-010 Login, P22-12b protected draft routes, P22-24a/b and P22-45 draft Editor APIs (DS-011 and DS-004), P22-40 Admin account APIs, and later protected backend APIs.
- **Confirmed:** 2026-11-26

### C-004 · Protected draft OCR correction and PII review API
- **Status:** superseded-by C-005
- **Date:** 2026-11-26
- **Interface:** These routes require the live C-003 session, its CSRF protection for state-changing requests, and the `admin` or `arhivar` role. `GET /api/drafts/{draft}/editor` returns the private draft ID and status, current `ocr_revision`, `detection_status`, `detection_revision`, ordered pages with dimensions, source OCR text, corrected OCR text and OCR words, plus current PII candidates. A candidate contains an opaque `id`, category, disposition, confidence, page, `bounding_boxes` (possibly empty), `location_status` (`reliable` or `manual_review_required`), a `corrected_text_span` (`start` and `length` offsets into that page's corrected OCR text), and `review_status` (`pending`, `accepted`, or `rejected`). Candidate records never contain matched OCR text. Candidates with `manual_review_required` location status are identifiable from their corrected-text span, but cannot be treated as safe for automatic Redaction. `PATCH /api/drafts/{draft}/editor/ocr` accepts the expected `ocr_revision` and the complete ordered corrected text for each page. A matching revision saves the corrected text, invalidates prior candidates, advances the OCR revision, and runs detection against the corrected OCR. On success it returns the new OCR and detection revisions, `detection_status: ready`, and candidates. A stale expected revision returns HTTP 409. If detection fails, the corrected text remains saved, prior candidates remain invalidated, the response is an error with `detection_status: failed`, the new `ocr_revision`, and no reviewable candidates. `PATCH /api/drafts/{draft}/editor/pii-review` accepts `ocr_revision`, `detection_revision`, and candidate ID/review-status decisions. It saves decisions only when both revisions match the current successful detection; stale or failed results return HTTP 409. The editor GET reports detection failure and returns no reviewable candidates until a successful detection run.

  `PATCH /api/drafts/{draft}/editor/redaction-marks` accepts `{ocr_revision, detection_revision, marks:[{page, box:{left,top,width,height}}]}`. Both revisions must match current successful OCR/detection. The server validates integer pixel Bounding Boxes against renderer page dimensions (which normalize supported page rotation); stale revisions return HTTP 409 and invalid geometry HTTP 422. `POST /api/drafts/{draft}/editor/redaction-preview` generates an image-only PDF using the canonical regions: accepted automatic marks plus saved manual marks. Incomplete or stale review returns HTTP 409; unreliable accepted geometry returns HTTP 422. The generated artifact remains in private storage and the response contains no storage key or Signed URL. `GET /api/drafts/{draft}/editor/redaction-preview` streams that artifact only to authenticated `admin`/`arhivar` sessions with private no-store headers. OCR changes, PII review changes, and mark edits invalidate the artifact. The original remains intact. Reader-facing text and metadata projections conservatively remove all content affected by accepted Redactions, including overlapping OCR tokens and repeated sensitive metadata, and fail closed when reliable filtering is impossible. The `cititor` role cannot access originals, drafts, unredacted derivatives, or sensitive data through direct URLs, alternate endpoints, or manipulated resource IDs.
  `GET /api/drafts/{draft}/editor/pages/{page}/image` streams the selected original page rasterized at the persisted OCR renderer dimensions, with private no-store headers. It requires the same staff session and role and records an `editor_page_image_viewed` access event. Responses expose no storage key or Signed URL.

  All responses use Romanian `eroare` messages for errors and expose no private storage keys or Signed URLs.
- **Evidence:** Owner-approved P22-24a/b and P22-45 plan clarifications in chat on 2026-11-26.
- **Consumers:** `backend/app/Http/Controllers/DocumentDraftController.php`, `backend/routes/api.php`, `backend/app/Services/ReaderRedactionProjection.php`, `frontend/src/api.js`, `frontend/src/main.jsx`, backend draft-review feature tests, and frontend Editor/queue Playwright tests.

### C-005 · Revision-bound OCR edits and validated word associations
- **Status:** approved
- **Date:** 2026-11-26
- **Interface:** Retains C-004's staff-only Editor, PII review, manual-mark, private page-image, and PDF-preview routes, response fields, C-003 session/CSRF protection, role restrictions, revision guards, and Romanian errors. PATCH /api/drafts/{draft}/editor/ocr additionally accepts, on each ordered page, operations: [{start, deleted, inserted}]. Each operation is applied in order to the previous saved corrected text; start is a JavaScript UTF-16 offset, and deleted and inserted are exact UTF-8 strings, including empty strings for insertion or deletion. The request still supplies the complete final page text. The backend replays the operations, validates every deleted substring and the final text, and returns HTTP 422 without changing the OCR revision on a mismatch. The server stores the revision-bound base text and accumulated operations in the existing private corrected_ocr JSONB; original OCR and TSV remain immutable. An omitted operations field remains a conservative legacy text-only correction.

  The backend derives corrected-token to original-word associations from immutable source OCR and the validated edit history. It does not accept client geometry. Repeated unchanged words retain their distinct positions; character corrections, splits and merges retain the affected original word boxes when the edit history identifies them. New words or ambiguous legacy spans remain unlocated while unaffected spans retain boxes. Detection runs against corrected text and emits only validated source Bounding Boxes or manual_review_required with an exact corrected-text span. Review and PDF preview remain guarded by the OCR and detection revisions. The reader projection applies accepted regions to corrected tokens through validated associations, removes overlapping source-word and corrected-token values from metadata, and fails closed if accepted PII or affected text cannot be located safely. C-004's private storage and cititor restrictions remain in force.
- **Evidence:** Owner-approved follow-up in [redaction and reader safety plan](plans/p22-21a-21b-27a-redaction-and-reader-safety.md).
- **Consumers:** backend/app/Http/Controllers/DocumentDraftController.php, backend/app/Services/CorrectedOcrAssociation.php, backend/app/Services/DocumentDraftPiiReview.php, backend/app/Services/ReaderRedactionProjection.php, backend/routes/api.php, frontend/src/api.js, frontend/src/main.jsx, backend/tests/Feature/CorrectedOcrAssociationTest.php, backend/tests/Feature/DocumentDraftOcrReviewTest.php, backend/tests/Feature/ReaderRedactionProjectionTest.php, and frontend/tests/editor.spec.js.
- **Confirmed:** 2026-11-26

## Consumed

## External
