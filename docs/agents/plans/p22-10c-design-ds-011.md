# Plan — P22-10c · DS-011 · Editor document & Anonimizare

**Status:** Plan approved by the owner in chat. Build is on hold at the owner's request and requires a separate instruction to start. DS-011 stays `draft` in the registry until the owner explicitly approves the visual result in chat.

## Size and approach

**M · Moderate complexity.** One standalone interactive HTML mock, one Playwright spec, and two canonical screenshots. The main effort is keeping review state consistent across four steps and rendering deterministic draft coverage.

Preserve DS-002’s slim header, back control, compact title, Physical Dossier Number label, and right-aligned action slot. Put `Salvează ciorna` in that slot throughout the workflow. Keep the full document name available when the header truncates it. Reuse DS-002 page and zoom controls and DS-003 and DS-004 naming and review states. Use local Public Sans and only the Design Tokens and visual rules in [DESIGN.md](../../design/DESIGN.md). Use DS-004’s connected-tab treatment only where actual tabs are useful. The step navigation uses step semantics.

## Four-step layout

Place a horizontal four-step navigation below the header. Use a labeled navigation landmark and an ordered list with `aria-current="step"` on the active step. Indicate completed and needs-recheck states with text as well as styling. On desktop, place the document viewer on the left and the current step workspace on the right. Step 1 gives metadata the full workspace. Step 3 gives PII review the full workspace, with highlighted text and the review list in the same panel.

On mobile, let step links wrap without page-level overflow. Stack the viewer and current workspace with labeled jump links for moving between them. Keep page controls, drafting actions, and all review controls reachable, with 44 × 44 px touch targets and zoom overflow contained in the viewer.

| Step | Document viewer | Workspace |
|---|---|---|
| **1 · Date document** | Original only. | Review and confirm **Data actului**, **Numărul actului**, **Numărul dosarului fizic**, and **Numărul de inventar**. Enter the Act Date manually when OCR missed it. Confirm or correct available OCR suggestions, such as amounts and tags. Edit document type, subtype, and Storage Context. Show the derived **Indicativ arhivistic** as read-only. |
| **2 · Corectare OCR** | Original only, with page and zoom controls for reference. | Correct OCR directly in labeled editable text blocks. Save and resume corrections. Defer PII suggestions and marking controls to Step 3. |
| **3 · Anonimizare** | Use the DS-002 `Original` / `Anonimizat` segmented control here. Keep page and zoom when switching modes. | Highlight proposed PII in the OCR text. List synthetic excerpts, supported types, statuses, counts, and manual marks. Accept or reject suggestions, link review items to their fixture passage and region, and inspect a fixture Bounding Box. Select a supported OCR passage to mark it manually. Draw or remove document rectangles, including in an area absent from OCR, with a labeled keyboard alternative for the fixture. |
| **4 · Verificare finală** | Show the complete simulated anonymized document, with page navigation. The comparison control is available by returning to Step 3. | Summarize metadata, OCR corrections, PII review, and retention. Link directly to the corresponding earlier steps. Offer `Aprobă revizuirea` and a cancelable confirmation. Announce simulated approval in the current session. |

For Step 1, use a small set of rows from the [Notarial Nomenclature](../../nomenclator_arhivistic.csv), including IA 20 for contractual expiry and an example of Permanent Preservation. Show the applicable Retention Computation Base. Confirm known dates, including a future expiry stated in the contract. Show `Dată de retenție în așteptare` when the date is unknown. Permanent Preservation has no destruction deadline. Step 4 reflects these states. Pending retention can coexist with approval where D-035 permits it, and zero uncertain matches still require explicit human review and approval.

## Navigation, drafts, and rechecking

Provide `Înapoi` and `Continuă` between adjacent steps, with direct step navigation and links from the final summary. Progress reflects the current draft and review status. Apply only the approved review and metadata requirements at final approval. On step changes, move focus to the new step heading. On return from a dialog, restore focus to its trigger.

Demonstrate both DS-004 handoffs using its existing names and labels. `Contract_exemplu.pdf` starts at Step 1 with zero uncertain matches. `Procură_exemplu.docx` resumes at its saved step with the partially reviewed fixture. DS-004 currently routes both actions to its own simulated destination. DS-011 will expose matching entries and accept the same `document` and `reluare` parameters, so the demonstration begins at the DS-011 destination.

Keep working state keyed by fixture across step and scenario changes. Save explicit synthetic snapshots with the current step, OCR changes, metadata, and redaction decisions in browser storage when available. Announce a successful save. A recoverable save error preserves working state and offers a retry.

If an OCR correction changes a previously reviewed mapped passage, flag that fixture item and Step 3 as `De reverificat`. Surface the flag in Step 4 and link back to the affected review. Preserve the prior review state for inspection and let the user explicitly resolve it. Demonstrate this with a known fixture mapping. Production remapping and conflict resolution are outside this plan.

## Live anonymization preview

Use an immutable two-page synthetic Document Scan. Steps 1 and 2 render the source fixture. In Step 3, `Anonimizat` immediately renders opaque coverage for accepted and manual marks. A rejected false positive stays visible, and removing a manual mark removes its coverage. Include a synthetic Signatory Party signature missed by OCR and preserve the Notary Public’s details. Render the marks as part of the simulated document content so they stay aligned through zoom and page changes. `Original` continues to render the source fixture as the archivist switches modes.

Use predefined page regions for mapped OCR passages and a bounded drawing interaction for manual document rectangles. Indicate the draft state in Step 3 with `Previzualizare de lucru` and label Step 4 as a simulated final preview. Step 4 uses the full draft coverage across all pages. Explain in the mock that the mapped examples are predefined and the preview is a simulation. Actual secure PDF generation and publication are outside this task.

## Files and screenshots

| Action | Path | Deliverable |
|---|---|---|
| Add | `docs/design/mocks/DS-011.html` | Standalone interactive mock with synthetic documents, review scenarios, and deterministic preview coverage. |
| Add | `docs/design/tests/DS-011.spec.js` | Tests-first browser checks and screenshot capture through the existing Playwright projects. |
| Add | `docs/design/screens/DS-011.light.png` and `docs/design/screens/DS-011.dark.png` | Canonical 1440 px screenshots with the four-step navigation visible, Step 3 active, and `Anonimizat` showing draft coverage. |
| Update | `docs/design/registry.yaml` | Add `design_ref: mocks/DS-011.html` to DS-011 and retain `status: draft`. |

Keep supplemental captures in `frontend/test-results/` in both themes. Capture all four steps on desktop and mobile, Step 3 in both modes with partial coverage, and the fully reviewed Step 4 preview and confirmation. Inspect all captures against the guardrails before visual review.

## Playwright test matrix

Use existing Desktop Chrome and Pixel 7 projects in light and dark themes. Check the established 320 px and 1440 px review widths and the tablet layout transition.

| Check | Expected result |
|---|---|
| Entry and navigation | New and saved DS-004 fixture entries open at the expected step. Exercise `Înapoi`, `Continuă`, direct navigation, and summary links. Verify active-step semantics, progress labels, and focus on arrival. |
| Draft and rechecking | Edit metadata and OCR, review PII, then navigate forward and back from Step 4. Verify state survives step, preview mode, and scenario changes. Check explicit save and resume, save failure with retry, and recheck indicators after changing a previously reviewed mapped passage. |
| Viewer modes | Steps 1 and 2 show the unchanged Original. Step 3 alone renders the mode toggle. Step 4 shows anonymized coverage across the fixture pages with no toggle, and links back to Step 3 for comparison. |
| Visible coverage | Accept and reject proposals. Mark mapped OCR text, draw a rectangle in a region missed by OCR, and remove a rectangle. Verify coverage by region and page, source pixel stability in `Original`, and alignment after zoom. |
| Metadata and approval | Exercise missing Act Date entry, classification and derived Indicativ, a known future expiry, pending retention, and Permanent Preservation. Verify summary states, explicit approval for zero uncertain matches, and cancel and confirm behavior. |
| Accessibility and layout | Verify keyboard navigation and marking, accessible labels, visible focus, focus restoration, and announced feedback. Check loading, empty, recoverable error, long filenames, long OCR text, one and many detections, reduced motion, contrast, touch targets, and page-level overflow. |

## Sequencing, dependencies, and risks

One builder starts with the Playwright assertions after approval, builds the mock, captures and inspects the screenshots, then presents the draft for visual review. Use the existing fonts, Nomenclature CSV rows, and Compose and Playwright workflow.

Check coverage alignment under zoom, editor focus during highlight updates, and task continuity across mobile panels. DS-002 uses some mock-specific sizing values outside the documented token tables. Use the token-based DS-004 header adaptation for shared geometry, preserve the DS-002 header structure, and check both themes.

## Out of scope

React, Laravel, live OCR and PII detection, production mapping, secure PDF generation, backend persistence, status transitions, authorization enforcement, publication, edits to other approved Screens, new Design Tokens, and Figma.

## Knowledge used

| Source | Applicability |
|---|---|
| D-004, D-032 · previously confirmed | Romanian Tesseract TSV and Bounding Boxes inform fixture inspection. DS-011 serves `admin` and `arhivar` and includes OCR correction, PII review, and manual marking. |
| D-022, D-038 · previously confirmed | Use approved PII categories, preserve the Notary Public’s details and the original, require explicit human approval, and confirm metadata and classification. D-022 cites superseded D-031 for approval. The current rule is in D-038. |
| D-035, D-037 · previously confirmed | Follow the applicable retention date, including pending and permanent cases. Preserve the distinctions among review approval, Document Version changes, and OCR-only reindexing in workflow language. |
| D-018, D-006, Q-013, DESIGN.md | Use Romanian interface and error copy, run Playwright across themes and viewport classes, and obtain explicit visual approval in chat. |
| Q-014, Q-016 · answered | Unknown retention dates may remain pending. Correct the Indicativ through classification. |
| DS-002, DS-003, DS-004 · approved references | Use the established header, viewer, naming, handoff labels, review states, and connected-tab styling where actual tabs are useful. |
| PATTERN-007 · candidate, for awareness only | Documents the existing read-only spec mount into the frontend test container. |

Plan review points are the DS-004 handoff demonstration starting at the DS-011 destination and the limited OCR-to-preview fixtures. No new business rule, pattern promotion, or contract change is proposed.
