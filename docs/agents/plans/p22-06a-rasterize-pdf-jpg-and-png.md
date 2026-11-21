# Plan — P22-06a · Rasterize PDF, JPG and PNG

**Approved for build on 2026-11-21** · Day 2, task 2 · Planned from a clean, up-to-date `main`.

## Size

S · The roadmap assigns 90 minutes. P22-01 and P22-02 supply the Docker and PHPUnit scaffolds. Acceptance covers one single-page example per format. [Roadmap](p22-roadmap.md#day-2--scaffold-react-and-prepare-document-input)

## Approach

Add a Laravel service that renders a local Document Scan into a new private destination and returns each published PNG path with its pixel dimensions in source page order. Reuse the backend image, Poppler for PDF rendering at 300 dpi, PHP GD for native-size JPG and PNG processing, and PHPUnit for verification.

- **Input validation.** Detect PDF, JPG or PNG from file contents and require the corresponding parser or decoder to succeed. An unsupported or malformed input fails even when its filename has a supported extension.
- **Page order.** Read the PDF page count and render every page within the conversion limits. Use integer page numbers from 1 through the declared count, require one complete, readable output for each, and build the result in that order. Page 10 follows page 9 regardless of how filenames sort.
- **Bounded conversion.** Check input bytes before parsing. Run inspection and decoding for all formats in killable child processes under one wall-clock deadline and a per-process memory ceiling. Check the PDF page count and projected pixel dimensions at 300 dpi, or image header dimensions, before raster allocation. Bound cumulative rendered pixels and staged output bytes across the conversion. Render one page at a time and enforce the remaining output allowance while writing each page. On timeout or breach, stop and reap conversion processes before cleanup.
- **Atomic publication.** Use a unique private staging directory beside the intended destination on the same filesystem. Validate the complete page set and dimensions there. Under a per-destination publication lock, require the destination to be absent and publish with one directory rename. Return paths under the published directory. On any failure, including a destination collision or rename error, remove this run’s staging directory and temporary files and preserve any previously published result.

## Files

| Action at build | Path | Purpose |
|---|---|---|
| Add | `backend/app/Services/DocumentPageRenderer.php` | Validate content, enforce conversion budgets, assemble numeric page order and publish the complete result atomically. |
| Add | `backend/bin/render-page.php` | Run GD inspection and decoding in a child PHP process so the parent can enforce the same deadline and memory controls as for Poppler. |
| Update | `docker/backend/Dockerfile` | Install Poppler utilities and enable PHP GD with JPEG and PNG support in the environment that runs Laravel and its tests. |
| Add | `backend/tests/Feature/DocumentPageRendererTest.php` and `backend/tests/Fixtures/rendering/` | Exercise real decoders with synthetic, asymmetric content of known dimensions. Derive image fixtures from the existing synthetic worker PNG and supply a small one-page PDF with a known page size and visible mark. |
| Update | `CORPUS.md` | Record the three synthetic fixture references separately from the live Document Corpus. |
| Update | `docs/agents/plans/p22-task-checklist.md` and `AI_LOG.md` | Record actual verification and elapsed time after the build. |

## Tests

| # | Behaviour | Test and verification |
|---|---|---|
| 1 | A one-page PDF yields one readable PNG in position one. At the proposed 300 dpi, a 72 × 144 point page yields 300 × 600 pixels. | PHPUnit integration — inspect the decoded output, its visible mark and the dimensions returned by the service. |
| 2 | JPG and PNG each yield one PNG at the input pixel dimensions. | PHPUnit integration — use separate cases, check the preserved content at known positions with tolerance for JPEG compression, and verify the input hash before and after. |
| 3 | Repeated runs in fresh directories produce the same page numbers, dimensions and decoded pixels. A corrupt document fails without publishing partial results, and a retry with valid input succeeds. | PHPUnit integration — invoke the same service used by future callers and check the output directory after failure. |
| 4 | Numeric order is stable across digit boundaries. | PHPUnit — exercise page numbering through 12 with synthetic page records, including detection of a missing page. Representative multipage rendering and geometry acceptance belong to P22-06b. |
| 5 | File contents determine the decoder. | PHPUnit integration — render a valid fixture with a misleading filename and reject unsupported bytes and truncated content presented with supported extensions. |
| 6 | Only complete results become visible. | PHPUnit integration — pause a controlled child after it stages output, check that the final path is absent, then exercise success and failure. Verify cleanup, retry, and that two publishers targeting the same path cannot overwrite each other. |
| 7 | Timeout and resource limits fail cleanly. | PHPUnit — use a controlled slow child and small test budgets for input size, page count, pixels, memory and output size. Verify bounded termination, absence of staging and final output, and a successful subsequent conversion. |
| 8 | The build and existing checks pass. | Build the backend image, run the focused test and full PHPUnit suite against the configured test environment, then run the existing Romanian OCR smoke and Ledger lint. |

## Sequencing

One builder. Write and run the failing PHPUnit cases first, then add the image dependencies and renderer. Run the tests against the built backend container and record the commands and results.

## Risks

A PDF uses physical page units while a JPG or PNG already has a pixel grid. Apply the explicit resolution only to PDF input and check against independently specified fixture dimensions. Invoke Poppler with an argument array, use a private working directory per run and clean up only outputs owned by that run. This keeps simultaneous conversions and retries from mixing pages.

## Out of scope

P22-06b owns representative multipage and rotated geometry verification with TEST-001, including orientation normalization and coordinate mapping. P22-07 owns DOCX. Queue orchestration, OCR execution on rendered pages, uploads, storage persistence, Redaction and Screen changes belong to later tasks.

## Knowledge used

Four previously confirmed decisions apply unchanged. D-001 places the renderer in the containerized Laravel stack, D-002 establishes Document Scan processing, D-003 requires PHPUnit, and D-004 requires the downstream Romanian Tesseract workflow to retain pixel Bounding Boxes. [Decisions](../DECISIONS.md)

### Considered, not applied

- For awareness only, the existing worker smoke validates Romanian TSV against a synthetic 1000 × 160 PNG. Its fixture is suitable as a source for image tests. The worker has no existing rendering command. [Smoke check](../../../docker/ocr-worker/smoke/check.sh)
- D-036 governs live acceptance. The corpus inventory identifies a rotated two-page PDF for P22-06b and records the need for standalone P22-06a fixtures. [Inventory](../../../CORPUS.md)
- PATTERN-001 and PATTERN-002 are candidates concerning database migrations and browser checks. No provided contract, existing renderer consumer or open Ledger question governs this service.

### Assumptions for approval

Use 300 dpi as the initial internal PDF rendering resolution, PNG as the intermediate format, and repository-owned synthetic fixtures for the three single-page checks. Use internal conversion limits. The numeric budgets are still to be selected and recorded during the build using the container capacity and synthetic fixture measurements. These limits govern the renderer only.

## Approval

The owner approved the revised P22-06a plan on 2026-11-21, including the rendering, verification and fixture choices above.
