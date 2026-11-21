# Plan — P22-06b · Verify multipage and rotated geometry

## Size

S · One backend renderer, one focused regression fixture and one representative acceptance run. Day 2 budgets 60 minutes. P22-06a and P22-49a are complete. Planning started on a clean, current main.

## Approach

Exercise DocumentPageRenderer::render through its existing containerized Poppler path at 300 dpi. Use a two-page synthetic PDF with unequal sides, different page rotations and distinctive off-centre rectangles whose page and pixel bounds can be calculated from the fixture specification. Then check both pages of TEST-001 against their source appearance. Change the renderer only if a regression test demonstrates a geometry defect.

## Files

| Action during build | Path | Purpose |
|---|---|---|
| Add | backend/tests/Fixtures/rendering/rotated-pages.pdf | Known page geometry and distinct marks at specified PDF coordinates. |
| Extend | backend/tests/Feature/DocumentPageRendererTest.php | Document fixture coordinates alongside assertions. Reuse existing temporary directories, PNG decoding and pixel checks. |
| Conditional fix | backend/app/Services/DocumentPageRenderer.php | Correct only the proven page-selection or orientation error while preserving the return shape and conversion limits. |
| Record results | docs/agents/plans/p22-task-checklist.md | Record the checks and TEST-001 evidence, or the remaining blocker. |

## Tests

| # | Behaviour | Verification |
|---|---|---|
| 1 | Page identity and displayed orientation survive rendering. | PHPUnit integration. Use a control page and a quarter-turned page. Assert numeric order, per-page marks, expected width and height after rotation, and agreement with decoded PNG dimensions. |
| 2 | Pixel Bounding Boxes enclose the intended marks. | Same test. Calculate expected edges independently from the authored rectangle, page rotation and PDF point scale. Use top-left PNG coordinates. Sample inside and immediately outside each edge away from antialiasing. A swapped axis, mirror or second rotation must fail. |
| 3 | TEST-001 retains both pages and their geometry. | Local integration with manual landmark selection because the corpus PDF is supplied separately. Inspect each source page in an independent viewer, record its displayed size and one distinctive region, and compare its position and extent on the corresponding PNG at the same scale. Record page numbers, dimensions and outcome only. |
| 4 | Existing behaviour remains covered. | Build the backend container, run the focused DocumentPageRendererTest and full vendor/bin/phpunit suite in it, then run python3 docs/agents/tools/ledger-lint.py. |

## Sequencing

One builder. Establish expected coordinates before rendering. Run the new tests against the existing renderer first. If they pass, keep the implementation. If they fail, retain the failing evidence, make the smallest correction and rerun. Complete the representative check before marking P22-06b done.

## Risks

A slightly tilted scan can appear inside a correctly oriented PDF page. Inspect page rotation separately from the angle of the scanned content. Poppler already interprets PDF rotation, so applying another turn could produce correct dimensions with wrongly placed content. Asymmetric marks expose this error. TEST-001 is inventoried but its bytes were absent from the checkout at planning time. The synthetic fixture permits regression testing while representative acceptance awaits access.

## Out of scope

DOCX conversion, OCR extraction and persistence, Redaction, viewer changes and live deployment belong to later tasks.

## Knowledge used

Five previously confirmed entries apply unchanged. D-001 covers the containerized Laravel stack, D-002 covers Document Scan processing, D-003 requires PHPUnit, D-004 requires pixel Bounding Boxes and D-036 defines the synthetic Document Corpus. [Decision index](../DECISIONS.md)

### Considered, not applied

For awareness only, P22-06a verifies numeric ordering and a single unrotated mark. PATTERN-003 concerns page publication and remains a candidate. The contract ledger has no renderer entry and the open-question index has no orientation rule.

### Assumptions for approval

The proposed orientation rule honours PDF display rotation and preserves slight tilt embedded in scanned pixels. Automatic straightening would change the expected landmark positions and needs an owner decision before implementation. The representative check requires a readable local copy of TEST-001.

## Approval

The owner approved the plan and orientation rule on 2026-11-21 and supplied TEST-001 for local verification only.
