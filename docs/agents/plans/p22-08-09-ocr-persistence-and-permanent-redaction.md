# Plan — P22-08, P22-09a and P22-09b

**Status:** Approved for implementation on 2026-11-21.

## Size and sequencing

M · One builder, in task order. The acceptance test follows a word from its persisted OCR record to the black pixels at the same location in the finished PDF.

## Approach

| Task | Proposed implementation | Acceptance |
|---|---|---|
| P22-08 · Persist OCR text and TSV | Run Romanian Tesseract on the ordered PNGs from `DocumentPageRenderer`. Use the renderer’s page number because Tesseract sees each PNG as page 1. Persist per-page text and raw TSV plus each word’s order, text, confidence and pixel Bounding Box in one PostgreSQL transaction. | Reload the extraction and recover Romanian diacritics, fractional confidence, page associations and coordinates. Malformed TSV on a later page leaves no partial extraction. |
| P22-09a · Burn Bounding Boxes into a new PDF | Apply supplied boxes to private copies of the rendered pages using PHP GD. Cover pixels through `left + width − 1` and `top + height − 1`, inclusive. Assemble the images in page order, including unmarked pages, and publish the complete PDF at a separate private path. | Verify all four black edges, adjacent uncovered pixels, page order and displayed dimensions. Check the original SHA-256 before and after. |
| P22-09b · Verify no residual PDF text | Prove the target is extractable on the original, then run Poppler’s `pdftotext` and independently render the derivative. Repeat the geometry check on rotated input. | Extraction succeeds and returns only whitespace. The covered region is black, nearby content remains visible, and the box lands on the correct page after rotation. An extractor error fails the test. |

The renderer already applies PDF display rotation and CropBox at 300 dpi. OCR and Redaction consume those same rendered pages. [Renderer](../../../backend/app/Services/DocumentPageRenderer.php) · [Day 3 acceptance criteria](p22-roadmap.md#day-3--deploy-the-skeleton-and-prove-permanent-redaction)

## Files

| Action | Path | Purpose |
|---|---|---|
| Add | `backend/app/Services/`, `backend/database/migrations/` | OCR runner, TSV parsing and transactional persistence keyed to a private extraction. |
| Update | `docker/ocr-worker/Dockerfile`, `compose.yaml`, `docker/live/compose.yaml` | Make Laravel extraction callable as a one-shot worker command with `ron` and PostgreSQL access. Preserve the Romanian smoke command and verify both Compose consumers. |
| Add | `backend/app/Services/`, `backend/bin/` | Validate page references and bounds, burn opaque black pixels, and assemble a fresh PDF. |
| Update | `docker/backend/Dockerfile`, `docker/live/backend.Dockerfile` | Package `img2pdf` for lossless image-to-PDF assembly. GD and Poppler are already present. |
| Add | `backend/tests/Unit/`, `backend/tests/Feature/`, `backend/tests/Fixtures/` | Parser, persistence and PDF integration tests plus a synthetic text-layer PDF. Reuse the existing Romanian and rotated-page fixtures. |
| Update after verification | `docs/agents/ARCHITECTURE.md`, `docs/agents/plans/p22-task-checklist.md` | Record the implemented worker path and evidence for each task. |

## Tests and risks

Write PHPUnit tests first. Run the real Tesseract worker, PostgreSQL and PDF tools for integration coverage.

| Check | Evidence required |
|---|---|
| OCR validation and retry | A valid page with zero words retains its association. A malformed header, invalid confidence or out-of-bounds word rejects the extraction. Retrying a failed extraction yields one complete result. |
| Permanent pixel coverage | Exercise an asymmetric box on a rotated page, a box touching a page edge and an unmarked page. Sample inside and just outside each edge. Invalid boxes or a failed PDF writer leave no published derivative. |
| Representative corpus | Use a persisted word box from TEST-002 for the burn and compare word placement on TEST-004. Use TEST-003 only if its source target yields extractable text. If unsuitable, report that and record synthetic evidence separately. Record fixture IDs, pages, coordinates and outcomes without logging document text. [Corpus inventory](../../../CORPUS.md#inventory) |
| Repository checks | Full PHPUnit, Romanian OCR smoke, Compose configuration, backend and frontend builds, and ledger lint. |

Corpus acceptance depends on local access to the designated test documents.

## Scope and assumptions for approval

Use a private extraction associated with its source ahead of the draft and Document Version tables. The proposed image-only derivative makes the residual-text check unambiguous and makes all PDF text non-selectable, including uncovered text. PII detection, review UI, reader search and metadata, queue retries, object storage and live deployment belong to later tasks.

## Knowledge used

| Entry | What it says | Why it applies | Call |
|---|---|---|---|
| Nine previously confirmed decisions, unchanged · D-001, D-002, D-003, D-004, D-018, D-022, D-036, D-037, D-038 | Docker, Laravel and PostgreSQL, archive scope, PHPUnit, Romanian Tesseract with TSV coordinates, Romanian system errors, permanent pixel Redaction and original preservation, test corpus, and versioning and review before publication. | These govern extraction, artifact generation and verification. The private extraction and test derivative precede approved Document Version publication. [Core decisions](../DECISIONS.md) · [Archive decisions](../decisions/archive-workflows.md) | Previously confirmed. Flag any wrong or outdated entry by ID. |
| PATTERN-003, PATTERN-004 | Candidate practices for publishing complete page sets and individual local derivatives. | For awareness only. Existing code supplies failure and concurrency cases to test. [Patterns](../PATTERNS.md) | No call required. |
| Contracts and open questions | The contract ledger has no entries. No open ledger question blocks these tasks. | The storage unit and image-only output are explicit plan choices for review. [Contracts](../CONTRACTS.md) · [Open questions](../OPEN-QUESTIONS.md) | No call required. |
