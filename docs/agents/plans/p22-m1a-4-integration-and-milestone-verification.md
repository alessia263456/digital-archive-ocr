# Plan — M1a.4 · Integration and milestone verification

**Status:** Approved by the repository owner on 2026-11-25.

## Size

**S–M · 3–5 hours.** Most application work is complete. The remaining effort is to check the end-to-end workflow, close the manual verification and documentation gaps, and record acceptance evidence.

## Approach

Use the existing M1a.1–M1a.3 implementation and verification commands. Reconcile the pending M1a.2 owner check and the P22-36a audit-event checklist item, then run a synthetic browser-to-worker workflow through login, upload, manual status refresh, OCR results, and preview. Finish the live-admin provisioning instructions and milestone records; rehearse provisioning locally or in a disposable environment, without deploying.

Backend CI already runs PHPUnit and Ledger lint. Frontend CI runs Playwright on push but not pull requests, so include pull requests in that workflow if that is the remaining CI gap. Extend tests only where verification reveals a missing automated check.

## Files

| Action | Path | What |
|---|---|---|
| Update if needed | `.github/workflows/frontend.yml` | Run the existing frontend build and Playwright suite on pull requests as well as pushes. Preserve the existing backend PHPUnit and Ledger lint job. |
| Update | `README.md` | Document the safe live-admin provisioning procedure and the synthetic M1a workflow verification steps, reusing the existing local setup commands. |
| Update | `docs/agents/ARCHITECTURE.md` | Correct the draft detail description to include protected OCR results, Bounding Boxes, preview issuance, and access events, matching the implementation. |
| Update | `AI_LOG.md` | Record M1a.4 work and verification evidence. |
| Update | `docs/agents/plans/p22-task-checklist.md` | Record M1a.4 acceptance evidence; reconcile P22-36a and the pending M1a.2 manual verification based on observed results. |
| Add only if coverage is missing | `frontend/tests/`, `backend/tests/Feature/` | Add focused coverage for uncovered integration behavior; keep existing assertions intact. |

## Tests

| # | Behaviour | Test | Not automated? why |
|---|---|---|---|
| 1 | Backend and Ledger checks pass in CI and locally. | `docker compose run --build --rm backend vendor/bin/phpunit`; `python3 docs/agents/tools/ledger-lint.py` | None. |
| 2 | Frontend build and Playwright suite pass on push and pull request. | `docker compose run --build --rm frontend-test` | None. |
| 3 | A staff member can log in, upload a synthetic document, refresh its persisted status, view OCR text/confidence/Bounding Boxes, and load its preview. | Real-API browser workflow with the local backend and OCR worker; reuse existing Playwright real-API setup where practical. | Owner confirms the real browser workflow and records the result. |
| 4 | `cititor` and unauthenticated callers cannot read staff OCR results or issue previews; authorized OCR/preview access is recorded before preview issuance. | Existing PHPUnit authorization and audit tests, plus database event inspection during the real-API run. | Database inspection is part of the owner’s local acceptance evidence. |
| 5 | Live-admin provisioning instructions create an account without a committed or default password. | Rehearse the documented procedure against a disposable local database and verify the command’s interactive prompts. | No production provisioning or deployment is included. |
| 6 | No sensitive credentials, session data, OCR content, storage keys, or Signed URL credentials appear in logs. | Inspect application and proxy logs using synthetic canary values during the workflow. | Log inspection is a manual security check. |
| 7 | M1a visual evidence remains current in supported themes and sizes. | Inspect existing DS-001, DS-003, and DS-011 Playwright screenshots against `docs/design/DESIGN.md`; recapture only if implementation changes. | Visual inspection is required by the repository workflow. |
| 8 | Changes are clean and documented. | `git diff --check`; Ledger lint after any Ledger edit. | None. |

## Design

No Screen changes are planned. Verify the existing DS-001, DS-003, and DS-011 workflow and screenshot coverage. If verification requires changing a Screen, update its mock and obtain approval before implementation.

## Sequencing

One builder. First inspect CI and reconcile the checklist against the implemented audit behavior. Then rehearse the synthetic browser-to-worker workflow and provisioning procedure, close any demonstrated verification gaps, update README, architecture, and checklist records, and run the final checks.

## Risks

- **Real OCR runtime differs from mocks:** exercise the actual backend and worker with synthetic documents; record failures instead of treating mocked browser tests as end-to-end evidence.
- **Audit task is still unchecked:** the code records `ocr_results_viewed` and `preview_issued`, but the checklist still marks P22-36a incomplete. Verify the intended append-only behavior and update the checklist only when evidence supports completion.
- **Pending M1a.2 owner check:** record it as passed only after the real upload/status-refresh path is exercised.
- **Provisioning guidance could be mistaken for deployment authorization:** rehearse locally or in a disposable environment; do not perform a live deployment.

## Out of scope

Production deployment or promotion; Document Corpus acceptance; search and browse completion; DS-004 review actions; OCR correction, PII review, Redaction, approval, or indexing; new draft-list behavior; and changes to approved contracts or decisions.

## Knowledge used

Previously confirmed and unchanged: **D-001, D-002, D-003, D-004, D-006, D-017, D-018, D-026, D-028, D-038, D-042, D-043, C-001, and C-003.**

| Entry | Why it applies | Call |
|---|---|---|
| D-022 | Requires the relevant document access events to be recorded; P22-36a remains unchecked. | Confirmed 2026-11-25 |
| PATTERN-002 | Candidate pattern for browser checks against the containerized production build. | For awareness only |
| PATTERN-008 | Candidate pattern for checking Signed URL behavior with a disposable object. | For awareness only |
| PATTERN-011 | Candidate pattern for verifying idle and maximum session age. | For awareness only |
| PATTERN-012 | Candidate pattern for recording authorized draft access before issuing preview URLs. | For awareness only |

### Considered, not applied

- **Q-021** — OCR similarity remains open and does not affect this workflow verification.
- **P22-56b** — Live object-storage verification and listener promotion are outside M1a.4.

### Assumptions

- The end-to-end check uses synthetic content and a local/disposable environment; production access is not required.
- If the existing audit tests do not demonstrate append-only behavior, P22-36a stays incomplete until that gap is separately resolved.
