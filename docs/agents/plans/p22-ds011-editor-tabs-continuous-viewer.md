# Plan — DS-011 interactive tabs and document viewer

**Status:** Implemented (2026-11-27). This is a corrective implementation plan against the already approved DS-011 mock. It does not replace the earlier M2 plan.

## Size

**L** — The current `DraftEditor` renders all workflow sections together. This corrects its interaction and layout while preserving revision-bound API behavior across metadata, OCR, PII review, redaction, and publication.

## Mock inspection

The approved mock’s HTML, CSS, and JavaScript were inspected. Its header shows the filename and dossier number, keeps a back action, and provides **Salvează ciorna**. Its workflow navigation changes the selected step; `renderStep` shows only that step’s content while separately displaying each step’s status. The split layout gives the document viewer 46% and the workflow panel 54%; the viewer has page and zoom controls and a scrollable viewport.

The mock allows direct step navigation. Switching steps does not confirm metadata or approve publication; those remain explicit actions. Its save button stores the simulated draft in local storage. In the real Editor, draft changes must continue to use the existing API persistence handlers.

## Approach

Refactor the Editor into four actual tabs: **Date document**, **Corectare OCR**, **Anonimizare / Revizuire PII**, and **Verificare finală**. Tabs select the visible panel without clearing component state; selection and completion status remain distinct. Navigation will not implicitly confirm or publish. Existing validation and API guards remain on their explicit actions.

Keep the existing `AppShell`. Within it, use the available workspace area for a desktop split pane: a dedicated, independently scrollable document viewer on the left and the selected workflow panel on the right. Render every document page consecutively in the viewer, so users can scroll naturally between pages. Keep the viewer toolbar sticky while its pages scroll. The current-page indicator follows the visible page; previous/next controls and a direct page selector scroll to their target page. Provide zoom, fit-to-width, and fit-to-page controls. Switching workflow tabs preserves viewer scroll position and zoom.

Reuse the existing page-image endpoint, page dimensions, and redaction drawing logic. Keep each page image and its OCR/redaction overlays in the same dimensioned canvas, scaling them together so overlays remain aligned at every zoom setting. On smaller screens, stack the viewer and workflow panel and keep the editor free of horizontal overflow.

Show the uploaded filename from the selected queue item and the physical dossier number from loaded metadata when available. Add the mock’s **Salvează ciorna** action; flush pending metadata and OCR edits through existing APIs, while preserving existing immediate saves for PII decisions and redaction marks. Saving a draft must not confirm metadata, final review, or publication. No backend endpoint or contract change is expected.

## Files

| Action | Path | What |
|---|---|---|
| Update | `frontend/src/main.jsx` | Add selected-tab state, accessible tab interaction, separate status indicators, one visible workflow panel, document-specific header, save-draft action, continuous multi-page viewer, visible-page tracking, page navigation, zoom/fit controls, and viewer-state preservation across tabs. |
| Update | `frontend/src/theme.css` | Replace the narrow, vertically stacked Editor layout with a token-based, full-width responsive split pane, independently scrollable desktop panes, sticky viewer toolbar and tab/action area, and stacked small-screen layout. Keep page images and overlays aligned during scaling. |
| Update | `frontend/src/components/AppShell.jsx` | Add an Editor-specific workspace class so the Editor can use the available area without changing other screens or removing the shell. |
| Update | `frontend/src/components/AppShell.css` | Scope workspace sizing and overflow behavior to the Editor; retain existing header, sidebar, and mobile navigation behavior. |
| Update | `frontend/tests/editor.spec.js` | Exercise tab switching, hidden inactive panels, unsaved-state preservation, workflow gates, document-specific header, and viewer behavior including continuous scrolling, indicator synchronization, state preservation, and overlay alignment at different zoom levels. |
| Update | `frontend/tests/queue.spec.js` | Verify the DS-004 handoff opens the correct document in the Editor. |
| Update | `frontend/tests/review-publication-real-api.spec.js` | Navigate tabs in the existing real-API flow and verify it still reaches publication. |
| Update | `docs/design/registry.yaml` | Mark DS-011 implemented and describe its tabs and split-pane layout. |
| Update | `docs/design/screens/DS-011.*.png` | Regenerate desktop/mobile, light/dark screenshots and inspect them. |
| Update | `docs/agents/plans/p22-task-checklist.md` | Record the corrective build and verification results after implementation. |

The approved `docs/design/mocks/DS-011.html` remains unchanged.

## Tests

| # | Behavior | Test |
|---|---|---|
| 1 | Each tab selects its panel; inactive workflow panels are not displayed; selected state is distinct from completion status. | `frontend/tests/editor.spec.js` · Playwright |
| 2 | Switching tabs preserves unsubmitted metadata, OCR edits, redaction state, review decisions, and viewer scroll position and zoom. | `frontend/tests/editor.spec.js` · Playwright |
| 3 | Viewer pages are rendered consecutively and scroll naturally; the page indicator tracks the page in view; previous/next and direct page selection scroll to the requested page. | `frontend/tests/editor.spec.js` · Playwright |
| 4 | A compact, one-row desktop toolbar supports page selection, zoom, fit-to-width, fit-to-page, and manual redaction. Fit-to-page uses the available viewer dimensions and recalculates after resize or sidebar changes. | `frontend/tests/editor.spec.js` · Playwright at 1366×768 and 1600×900 |
| 5 | OCR bounding boxes and redaction overlays remain aligned with their page at multiple zoom levels and fit modes. | `frontend/tests/editor.spec.js` · Playwright; compare page and overlay geometry. |
| 6 | Existing metadata confirmation, OCR freshness, redaction preview, final review, duplicate handling, and publication requirements still apply. | `frontend/tests/editor.spec.js` and `frontend/tests/review-publication-real-api.spec.js` · Playwright |
| 7 | Sidebar collapse retains the icon rail and leaves the Editor in the remaining workspace; expand restores labels. Desktop panes use available height and the small-screen layout has no horizontal overflow. | `frontend/tests/editor.spec.js` and `frontend/tests/appshell.spec.js` · Playwright |
| 8 | The header shows the selected upload filename and available dossier number; save-draft uses existing persistence APIs without confirming or publishing. | `frontend/tests/editor.spec.js` · Playwright |
| 9 | DS-004 opens the correct document in the Editor. | `frontend/tests/queue.spec.js` · Playwright |
| 10 | Draft/page loading, OCR/PII saves, redaction preview, and publication show pending feedback and block duplicate submissions. Failures remain actionable. | `frontend/tests/editor.spec.js` · Playwright |
| 11 | PII cards and controls remain compact; technical coordinates are available in expandable details. | Inspect Anonimizare screenshots at 1366×768 and 1600×900, light and dark. |

Also run the repository’s full frontend Playwright command and `python3 docs/agents/tools/ledger-lint.py`. No backend changes are planned; rerun PHPUnit if implementation reveals any backend change is needed.

## Design

DS-011 is already approved, so this is an implementation correction against the existing mock; no new mock or Screen approval is needed. Use existing design tokens and preserve the AppShell. Cover loading/error states, long filenames, missing dossier number, keyboard navigation, focus, light/dark themes, and desktop/mobile sizes.

## Sequencing

One builder, sequentially: implement tab state and panel switching; move the existing workflow sections into their corresponding panels; build the continuous multi-page viewer with visible-page tracking, page navigation, sticky toolbar, zoom and fit modes, and state preservation; wire filename, dossier number, and save-draft action; add the specified viewer and workflow tests; then run verification, inspect screenshots, and update the registry/checklist.

Tab selection itself remains navigation, as in the mock. Existing action-level validation continues to enforce confirmation and publication rules.

## Risks

- Saving metadata and OCR uses separate existing endpoints. If one succeeds and the next fails, report the partial result and retain remaining local edits for retry; never show an all-saved state unless all pending saves succeed.
- Page indicators and overlays can drift if page geometry and zoom transforms differ. Keep overlays in the page’s native coordinate system and verify their rendered bounds at multiple zoom and fit settings.
- A pane-height or overflow mistake could hide controls beneath the AppShell or prevent scrolling. Verify both panes at the supported desktop and mobile sizes.

## Out of scope

Backend/API or contract changes; changes to OCR/PII rules, metadata requirements, retention, duplicate handling, immutable publication, or AppShell navigation; edits to the approved mock or unrelated screens.

## Knowledge used

Previously confirmed and unchanged: **D-006, D-018, D-022, D-038, D-042, D-044, D-045, and C-007**. The plan follows the existing tab example in `DraftQueue`; no ledger pattern is relied on. **Q-021** remains open and unrelated; OCR-similarity duplicate checks remain out of scope.

No decision or contract change is proposed, and no open question blocks this work.
