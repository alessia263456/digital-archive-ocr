# Plan — M1b · DS-003 batch intake and draft recovery

**Status:** Confirmed by the owner on 2026-11-26.

## Size

**M ·** The batch intake endpoint, OCR worker, queue, and quarantine actions already exist. The remaining implementation is DS-003 batch/recovery integration, one protected recent-drafts endpoint, browser verification, and milestone records.

## Approach

Complete P22-23 on the already approved DS-003 Screen. Use the existing `POST /api/drafts` batch support for multiple independent PDFs/DOCX files, keep an ordered image collection as one Document Scan, and show each item’s filename, intake result, and persisted status independently. Add a staff-only recent-drafts endpoint so DS-003 can restore drafts after reload; use the existing draft-status and protected OCR endpoints for supported resume actions. For review-ready drafts, reopen the existing read-only OCR results in DS-003; do not create a partial DS-011 Screen. Keep OCR editing and the full DS-011 review workflow in M2.

Per the owner’s direction, leave official-save duplicate blocking in P22-21/M2. The current M1b acceptance still says the exact duplicate guard blocks final save. This plan does not change that approved roadmap criterion, so M1b cannot satisfy every current acceptance criterion before M2 unless the criterion is separately revised.

## Files

| Action | Path | What |
|---|---|---|
| Update | `frontend/src/main.jsx` | Allow multi-selection of independent PDFs/DOCX; map each API result to its matching filename and show per-item errors/status. Load persisted recent drafts when DS-003 opens. Restore status refresh and open the existing read-only OCR results for `review_ready` items. Keep one ordered image collection per submission and implement the approved mock’s page-order controls. |
| Update | `frontend/src/api.js` | Add a method for the protected recent-drafts endpoint. Reuse the existing multipart upload and same-origin session/CSRF request path. |
| Update | `frontend/src/theme.css` | Style batch rows, recent drafts, image-order controls, and loading/error/success/disabled states with existing Design Tokens. |
| Update | `backend/routes/api.php` | Add `GET /api/drafts/recent` inside the existing `admin`/`arhivar` protected route group, before the parameterized draft route. |
| Update | `backend/app/Http/Controllers/DocumentDraftController.php` | Return a small recent-draft summary containing only fields needed by DS-003, such as ID, original name, status, and creation time. Do not return private object keys, OCR, or Signed URLs. |
| Update | `backend/tests/Feature/DocumentDraftIntakeTest.php` or a focused new feature test | Cover recent-draft ordering/summary fields and role authorization. Retain the existing mixed-valid/invalid batch assertions. |
| Update | `frontend/tests/upload.spec.js` | Cover a multi-document submission with mixed outcomes, correct filename/result mapping, ordered images, recent-draft restoration, manual status refresh, and no background polling. |
| Add or update | `frontend/tests/draft-batch-real-api.spec.js` | Exercise batch intake and draft restoration against an isolated API/database/worker workflow with synthetic fixtures. |
| Update after verification | `docs/design/registry.yaml`, `docs/design/screens/DS-003.*.png` | Align the DS-003 implementation description and save inspected desktop/mobile screenshots in both themes. The approved mock and Screen status remain unchanged. |
| Update after verification | `docs/agents/ARCHITECTURE.md`, `docs/agents/plans/p22-task-checklist.md` | Record the recent-drafts endpoint, batch behavior, verification evidence, and the P22-21/M2 acceptance dependency. |
| Owner action, in parallel | `CORPUS.md` | Complete P22-49b using verified inventory information from the owner. Do not infer missing document facts. |

No provided contract changes are planned. C-003’s session, CSRF, and role boundary remains in force.

## Tests

| # | Behaviour | Test (file · kind) | Not automated? why |
|---|---|---|---|
| 1 | A mixed valid/invalid PDF/DOCX batch returns an independent outcome for every item; a failed item does not discard valid siblings. | Existing `DocumentDraftIntakeTest.php`; extend only if needed. | None. |
| 2 | Recent drafts restore after reload and expose only required summary fields to `admin`/`arhivar`; anonymous and `cititor` requests are denied. | PHPUnit feature tests and Playwright mocked API cases. | None. |
| 3 | DS-003 maps each response to the correct filename, displays per-item results/status, preserves image order, and refreshes status only after a user action. | `frontend/tests/upload.spec.js`. | None. |
| 4 | Batch intake, draft restoration, and persisted status work through the actual browser/API flow. | Opt-in Playwright real-API test in an isolated Compose project with synthetic fixtures and a disposable database/worker. | Owner can repeat the flow locally with staff accounts. |
| 5 | The existing queue, retry, permanent-failure, and corrupt-then-valid behavior still passes after the DS-003 integration. | Existing `frontend/tests/queue.spec.js`, `frontend/tests/draft-quarantine-real-api.spec.js`, and PHPUnit coverage. | None. |
| 6 | DS-003 has no horizontal overflow and remains usable at supported desktop/mobile sizes in both themes. | Existing Playwright projects; inspect and save screenshots against `docs/design/DESIGN.md`. | Screenshot inspection is manual. |
| 7 | Repository checks pass. | PHPUnit, frontend production build and Playwright, Ledger lint, and `git diff --check`. | Run the real worker flow in isolation from the default database. |

## Design (UI only)

**DS-003** is approved and implemented in the registry. Reuse `docs/design/mocks/DS-003.html`, its existing screenshots, and the tokens in `docs/design/DESIGN.md`. Cover batch selection, one/many items, mixed outcomes, recent drafts, image ordering, empty/loading/error/success states, long filenames, keyboard/touch/focus, desktop/mobile, and light/dark. Keep OCR completion distinct from approval. No mock redraw or new Screen approval is needed.

Draft recovery in M1b means rediscovering a persisted private draft, refreshing its status, and reopening supported read-only OCR results. It does not mean continuing OCR edits: those belong to DS-011 in M2. DS-011 is not changed by this plan.

## Sequencing

One builder:

1. Add and test the protected recent-drafts endpoint.
2. Implement DS-003 batch item mapping, recent-draft restoration, manual status refresh, and ordered-image controls.
3. Add mocked browser cases, then run the isolated real-API batch/recovery workflow.
4. Re-run queue/quarantine checks and the repository verification commands.
5. Inspect screenshots and update architecture/checklist evidence. The owner completes P22-49b in parallel.

## Risks

- **M1b duplicate criterion conflict:** The user-directed P22-21/M2 deferral leaves the current M1b final-save acceptance unmet. This plan does not silently change the approved roadmap; M1b cannot be declared fully complete against that criterion until M2 satisfies it or the roadmap criterion is separately approved for revision.
- **Draft visibility:** The recent-drafts endpoint exposes private draft summaries. Restrict it to `admin`/`arhivar` and omit object keys, OCR content, and Signed URLs.
- **Editor dependency:** DS-011 is not implemented yet. Do not present read-only OCR results as editable review or approval.
- **Duplicate UI:** P22-14’s fingerprint checker is groundwork for official-save blocking in P22-21. This plan does not infer a separate upload-time duplicate rule from that checker.
- **Corpus inventory:** P22-49b requires owner-supplied evidence; the checklist must not be closed using guessed inventory data.

## Out of scope

P22-21 official-save duplicate enforcement; DS-011 editing and approval; DS-004 Editor navigation; OCR-similarity behavior while Q-021 is open; the notification panel owned by P22-48; live deployment; and fabricated Document Corpus entries.

## Knowledge used

**Confirmed before, unchanged:** D-002, D-003, D-006, D-018, D-025, D-026, D-038, D-040, D-042, D-043, and C-003.

| Entry | What it says | Why it applies | Call |
|---|---|---|---|
| Q-021 | OCR-similarity criterion remains open. | No OCR-similarity behavior is planned. | Remains open; out of scope. |
| P22-14 implementation plan | Fingerprints/checking are implemented; official-save enforcement belongs to P22-21. | Matches the owner’s instruction to keep P22-21 in M2. | Confirmed 2026-11-26 |
| M1b roadmap | Calls for mixed batch outcomes, resume, queue/status/error verification, and exact duplicate blocking at final save. | Defines the remaining acceptance and exposes its timing conflict with P22-21. | Confirmed 2026-11-26 |
| DS-003 approved mock | Provides independent PDF/DOCX intake, ordered image assembly, recent drafts, and per-item states. | The implementation uses these existing approved interactions. | Confirmed 2026-11-26 |
| DS-011 approved mock and M2 roadmap | DS-011 is an editable OCR/PII/metadata/redaction workflow planned for M2. | Use DS-003’s existing read-only OCR results for M1b recovery; do not create a temporary view-only DS-011. | Confirmed 2026-11-26 |

### Considered, not applied

- **PATTERN-010** — Candidate only; not treated as an approved rule or relied on as a requirement.
- **P22-45 Editor navigation** — Completes with M2’s Editor integration, so it is not included in M1b implementation.

### Assumptions (no entry behind them)

- None. The P22-21 timing and read-only OCR results decision were confirmed by the owner on 2026-11-26.
