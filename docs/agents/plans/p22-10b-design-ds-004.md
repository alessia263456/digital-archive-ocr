# Plan — P22-10b · Design DS-004 (Human Review & Quarantine Queue)

**Status** — Owner authorized mock execution with the adjustments below. Screen approval is pending visual review. Planned from clean `main` at `d41f747`.

## Size

M — One standalone mock with two queue tabs, a document handoff, two quarantine actions and responsive verification. The roadmap allocates 60 minutes and lists the completed P22-05 approval workflow as its prerequisite.

## Approach

Draw one Romanian Screen with **Revizuire** and **Carantină** tabs so staff can distinguish private drafts awaiting review from Document Scans that have exhausted automatic OCR retries. Reuse the DS-002 header structure, alignment, spacing, type and visual treatment as directed by the owner. Match the DS-003 review labels and row treatment using approved Design Tokens from `DESIGN.md`. Use synthetic data and in-memory interactions to demonstrate the DS-011 handoff and the two quarantine actions.

## Files

| Action after approval | Path | What |
|---|---|---|
| Add first | `docs/design/tests/DS-004.spec.js` | Playwright interaction checks and screenshot capture across the existing desktop and mobile projects in both themes. |
| Add | `docs/design/mocks/DS-004.html` | Standalone mock with review, quarantine, empty and feedback states and synthetic destinations. |
| Update | `docs/design/registry.yaml` | Add the DS-004 mock reference. Keep `draft` until the owner explicitly approves the Screen in chat. |
| Add | `docs/design/screens/DS-004.light.png`, `docs/design/screens/DS-004.dark.png` | Canonical desktop Screen captures. Keep the other state and viewport captures in the Playwright results for review. |

DS-003 already shows separate review and quarantine handoffs in `docs/design/mocks/DS-003.html`. DS-004 will demonstrate the corresponding entry states independently. DS-011 has a draft registry entry and its own design task, P22-10c. Use a labelled simulated DS-011 destination that identifies the selected draft and whether the action starts or resumes review. No Ledger contract currently covers these handoffs.

## Tests

| # | Behaviour | Test (file · kind) | Manual verification |
|---|---|---|---|
| 1 | Review is the default tab in the mock. A simulated quarantine entry opens **Carantină** directly. Switching tabs shows the correct panel and keeps tab selection and keyboard focus clear. | `DS-004.spec.js` · Playwright | Check consistency with the two existing DS-003 entry labels. |
| 2 | Review shows a new draft and a saved unfinished review. **Începe revizuirea** and **Continuă revizuirea** target the selected document in the simulated DS-011 destination. A document with zero uncertain PII matches still requires human review before approval. | `DS-004.spec.js` · Playwright | Check that staff can tell a pending review from a saved unfinished review. |
| 3 | Quarantine shows a Romanian explanation of the initial OCR failure and three failed retries. A manual retry shows pending and accepted feedback. A failed action keeps the item and gives staff a next step. | `DS-004.spec.js` · Playwright | Check that retry feedback describes submission for processing and that the error gives an actionable next step. |
| 4 | Marking an item permanently failed requires confirmation that explicitly describes the status change. Cancel retains the item and restores focus. Confirm shows the simulated result. | `DS-004.spec.js` · Playwright | Check dialog copy, focus and feedback. |
| 5 | Both tabs support empty, loading, error, populated and long-name fixtures. Test one and many items, complete names, no horizontal overflow, keyboard use, visible focus, touch targets and reduced motion at 320 px and 1440 px in both themes. | `DS-004.spec.js` · Playwright assertions and screenshots | Inspect captures and check contrast and control states against `DESIGN.md`. |
| 6 | The two queues and their actions are clear in the mock and screenshots. | DS-004 · owner review in chat | Explicit Screen approval under Q-013. |

Run the mock alongside the existing frontend build and Playwright checks using the frontend test container. Run the existing PHPUnit suite and Ledger lint per AGENTS.md. Report the actual results and any skipped checks with their reasons.

## Design

- **Screen structure.** Use one primary heading, **Cozi de lucru**, with **Revizuire** and **Carantină** tabs. The labels and default tab are mock design choices for owner review. DS-004 is for `admin` and `arhivar` under D-032. Demonstrate the quarantine actions in the Arhivar scenario described by D-026.
- **Revizuire.** List processed drafts awaiting their first review as **Nerevizuită** and explicitly saved unfinished reviews as **Revizuire începută**. Show **Începe revizuirea** or **Continuă revizuirea** on each corresponding row. Keep metadata validation, OCR correction, Redaction and explicit approval in DS-011. An empty queue can direct staff to **Încărcare documente**.
- **Carantină.** Give each affected document a visible **În carantină** label, a concise OCR failure explanation and the actions **Reîncearcă procesarea** and **Marchează ca eșuat definitiv**. Use a confirmation dialog for the second action and show pending, success and recoverable action error feedback within the Screen. The empty state explains when Document Scans appear in quarantine.
- **Visual treatment.** Use the existing surface, text, border, primary, warning and focus Design Tokens, Public Sans, and the documented typography, spacing, radii and motion scales. Pair color with status text. Wrap long names, keep one reading order at narrow widths, and show a layout-preserving loading state promptly. Cover default, hover, focus, active and disabled controls. Use named controls, accessible tabs, visible keyboard focus and announced feedback.

## Sequencing

One builder. After plan approval, write the first mock checks, draw the standalone mock, add its draft registry reference, run the verification checks and inspect the captures. Share the mock and representative captures in chat for separate Screen approval. P22-45 implements the approved design after P22-15 supplies quarantine actions and P22-28b connects Editor publication.

## Risks

- **Review and quarantine can be mistaken for consecutive steps.** Use separate tabs and show that quarantine follows exhausted OCR attempts while a review-ready draft opens in DS-011.
- **Accepted retry can look like successful OCR.** Show only that the retry was submitted. Keep OCR completion out of the action feedback.
- **The permanent-failure label can imply document deletion.** Describe the status change in the confirmation. Keep retention, storage and deletion semantics outside the mock.

## Out of scope

React implementation (P22-45), DS-011 design and implementation, the DS-007 notification badge and panel, worker retries and backoff, persistence, authorization enforcement, production lifecycle transitions and status enums, production sorting and pagination, post-failure record visibility, DS-003 edits, new Design Tokens and Figma work.

## Knowledge used

**9 entries confirmed before, unchanged** — D-001, D-003, D-006, D-018, D-022, D-026, D-032, D-038 and Q-013. They cover the existing stack and verification, Romanian UI, mandatory review, quarantine timing and actions, Screen access, private drafts and explicit chat approval of each Screen.

| Entry | What it says | Why it applies | Call |
|---|---|---|---|
| D-019 | Notifications appear within the Application through its badge and panel. | DS-004 demonstrates local action feedback. Quarantine alert delivery stays with P22-15 and its badge and panel stay with P22-48. | Confirm / wrong / outdated |

### Considered, not applied

- **Q-010** — Answered and recorded in D-026. The mock follows that decision.
- **PATTERN-007** — Candidate, for awareness only. Verification requirements come from D-006 and `DESIGN.md`. The existing Playwright projects can run the mock checks.
- **Q-021** — Open. The mock covers review entry for a selected draft. OCR similarity matching and warning rules need no new decision for DS-004.

### Assumptions and open questions

- The roadmap and approved entries cover the required mock states. No blocking question for this design scope.
- The Screen heading, default tab and row layout are proposed visual choices. Production queue ordering, visibility after permanent failure and any action authorization beyond the documented Arhivar scenario are deferred to the implementation plan. The mock uses independent fixtures and establishes no rule for those cases.
