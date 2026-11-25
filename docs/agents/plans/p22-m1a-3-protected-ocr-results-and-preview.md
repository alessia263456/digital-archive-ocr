# Plan — M1a.3 · Protected OCR results and preview

**Status:** Approved by the repository owner on 2026-11-25. Implementation, automated verification, and owner local upload-to-preview smoke completed on 2026-11-25.

## Size

**M · 4–6 hours.** This connects persisted OCR pages to the React screen, adds protected preview issuance and access auditing, and verifies role boundaries across the API and browser.

## Approach

Extend the existing draft detail endpoint to return persisted OCR page text, confidence, and word Bounding Boxes. Add an `admin`/`arhivar`-only endpoint that authorizes access, records the access event, then issues a five-minute preview URL using the existing delivery service and C-001. The URL remains internal to the application: entering the OCR results screen loads an inline document preview, and the screen may renew the preview through an authenticated request if needed. Do not expose URL controls or add extra UI steps.

Connect the current-session draft in DS-003 to OCR results and the approved DS-011 screen. Keep status refresh user-triggered and do not add editing, PII review, or approval behavior. The current draft endpoint returns only ID and status, and no audit writer is present yet, so this plan includes the draft-access audit event and its tests.

## Files

| Action | Path | What |
|---|---|---|
| Update | `backend/app/Http/Controllers/DocumentDraftController.php` | Return persisted OCR page data for authorized drafts; add authorized preview issuance after audit logging. |
| Update | `backend/routes/api.php` | Register the protected OCR detail and preview issuance routes under the existing session and role middleware. |
| Add or update | `backend/app/Services/` and `backend/app/Models/` | Reuse the P22-36a audit writer if available by implementation time; otherwise add only the event-writing support required for this access event. |
| Update | `frontend/src/api.js` | Add same-origin session-authenticated OCR detail and preview issuance requests. |
| Update | `frontend/src/main.jsx`, `frontend/src/theme.css` | Connect the current draft to its OCR results and automatically loaded inline preview, with Romanian loading, empty, and error states using existing tokens. Keep the signed URL internal and renew through the authenticated API only when necessary. |
| Add | `backend/tests/Feature/` | Verify authorized OCR detail and preview, audit-before-issuance, unknown draft, and unauthorized roles. |
| Add or update | `frontend/tests/` | Verify the DS-003 to OCR-results/preview flow, renewal, API errors, session expiry, and role-dependent UI. |
| Update after verification | `docs/design/registry.yaml`, `docs/design/screens/` | Record the implemented screen state and inspected desktop/mobile, light/dark screenshots if the existing approved mock covers the implemented result. |
| Update after implementation | `docs/agents/ARCHITECTURE.md`, `docs/agents/plans/p22-task-checklist.md` | Record endpoints, audit behavior, and M1a.3 verification evidence. |

No provided contract change is planned. C-001 governs delivery; C-003 governs authenticated API access.

## Tests

| # | Behaviour | Test | Not automated? |
|---|---|---|---|
| 1 | `admin` and `arhivar` receive persisted OCR text, confidence, and Bounding Boxes; `cititor` and unauthenticated callers do not. | PHPUnit feature tests for role and session boundaries. | None. |
| 2 | Entering OCR results loads the inline preview through an authenticated request; renewal also uses an authenticated request, while the temporary URL remains invisible to the user. | Playwright with mocked API responses; PHPUnit feature tests for issuance and the five-minute expiry. | Owner’s browser workflow uses synthetic documents. |
| 3 | A staff preview request authorizes the draft, records access, then issues a URL that delivers the private document with C-001 headers. | PHPUnit feature tests for audit ordering, signed delivery, and expiry. | None. |
| 4 | Missing drafts and drafts without completed OCR or a previewable file return safe Romanian errors without leaking stored paths or content. | PHPUnit feature tests. | None. |
| 5 | The browser displays persisted OCR results and preview; errors and expired sessions are actionable. | Playwright and owner local real-API smoke, completed 2026-11-25. The owner confirmed extracted text, confidence details, and PDF preview display. | None. |
| 6 | The changed screen works at mobile and desktop sizes, in light and dark themes, with keyboard focus and no horizontal overflow. | Playwright screenshots and inspection against `DESIGN.md`. | None. |
| 7 | Backend, frontend, and ledger checks pass. | PHPUnit, frontend build/Playwright, Ledger lint, and `git diff --check`. | None. |

## Design (UI only)

DS-003 and DS-011 are approved. Reuse their existing mocks and tokens; do not expand this slice into the full DS-011 editor workflow. Entering OCR results loads the inline preview without exposing URL controls or adding a separate step. Cover loading, OCR-ready results, missing/error states, long OCR text, preview loading/failure/renewal, keyboard access, desktop/mobile, and light/dark. Capture and inspect screenshots for every changed screen.

## Sequencing

One builder. First reuse the P22-36a audit writer if established by implementation time; otherwise add only the minimum writer support for this event. Add backend tests and protected endpoints, implement the frontend API and screen connection, then verify browser and backend behavior, inspect screenshots, and update implementation records.

## Risks

- A signed preview URL is usable by anyone who receives it until its five-minute expiry. Keep it internal to application code and avoid rendering or logging it.
- The audit writer task P22-36a is still unchecked. M1a.3 must use its established event shape if it is completed first, or implement only the minimum writer support needed for this event.
- A successful OCR extraction is still a private draft awaiting review. The UI must not imply approval, indexing, or anonymization.

## Out of scope

Draft listing or recovery after reload; automatic status polling; DS-004 queue behavior; OCR correction, PII review, Redaction, metadata confirmation, approval, indexing, share links, and milestone-wide M1a.4 acceptance.

## Knowledge used

Previously confirmed and unchanged: **D-001, D-002, D-003, D-004, D-006, D-018, D-042, and D-043**.

| Entry | What it says | Why it applies | Call |
|---|---|---|---|
| D-038 | Drafts remain private until authorized review and required confirmation; approval creates immutable versions. | Results and previews in this slice remain draft-only. | Confirmed 2026-11-25 |
| C-001 | Private document delivery uses expiring signed URLs and secure delivery headers. | Governs preview delivery; this plan sets the preview lifetime to five minutes. | Confirmed 2026-11-25 |
| C-003 | Protected API routes require live session auth; disallowed roles receive 403. | Governs OCR and preview issuance routes. | Confirmed 2026-11-25 |
| PATTERN-008 | Candidate practice for verifying signed URLs using a disposable object. | Useful for preview expiry/delivery verification; not promoted. | For awareness only |
| PATTERN-011 | Candidate practice for enforcing idle and absolute session age. | Existing session middleware remains the auth boundary; not promoted. | For awareness only |

### Considered, not applied

- **D-022** — PII detection and Redaction rules apply to later review and anonymization work; this slice only reads OCR results and previews the private source.
- **Q-021** — OCR similarity criterion remains open and is unrelated to protected result delivery.

### Assumptions

- The existing approved DS-011 screen can display OCR results for this slice without changing its approved design. If implementation requires a new or changed screen, update and approve that design before building it.
