# Plan — P22-10a · Design DS-003 (Încărcare documente)

**Status** — Plan approved by the owner on 2026-11-22. Design execution requires separate explicit authorization.

## Size

M — One standalone HTML mock with two intake methods, an interactive image organizer, simulated processing and draft transitions, and responsive visual verification. The roadmap’s 60-minute estimate predates the expanded scope.

## Approach

Design a Romanian intake Screen for `admin` and `arhivar` with **PDF / DOCX** for independent documents and **Imagini (JPG / PNG)** for assembling one ordered multi-page document. Keep the active upload workspace visually dominant, followed by **În procesare** and **Ciorne recente**. Show transfer, processing, duplicate feedback and the handoff to DS-011 with synthetic fixtures. Use only Design Tokens from `docs/design/DESIGN.md`; the standalone DS-009 previews are a reference for awareness only.

## Files

| Action after approval | Path | What |
|---|---|---|
| Add | `docs/design/mocks/DS-003.html` | Standalone mock covering both intake methods, accessible image ordering, processing, drafts and the five preview states. |
| Update | `docs/design/registry.yaml` | Add the DS-003 mock reference and align the description with the agreed intake and review handoff. Keep `status: draft` until explicit Screen approval in chat. |
| Add | `docs/design/screens/DS-003.light.png`, `docs/design/screens/DS-003.dark.png` | Canonical review screenshots. Capture and inspect the desktop and mobile state matrix and share supplemental captures for review. |

## Tests

| # | Behaviour | Test | Manual verification |
|---|---|---|---|
| 1 | Select and drop multiple PDFs and DOCXs. Each file has independent validation, transfer and processing states. Invalid or failed entries leave valid siblings free to proceed. | DS-003 mock · Playwright | |
| 2 | Select and drop JPGs and PNGs into one organizer. Add, remove and reorder pages by drag and keyboard. Thumbnail numbers follow the new order. **Salvează și procesează** submits one simulated document. | DS-003 mock · Playwright | Inspect touch interaction and the one-document explanation. |
| 3 | Transfer is distinct from queued, processing, failed and quarantined states. Failed entries remain visible with Romanian explanations and applicable retry information. | DS-003 mock · Playwright with mixed fixtures | |
| 4 | Successful processing moves the same entry to **Ciorne recente** as **Nerevizuită**. A previously edited draft offers resume. Show approximately three to five recent drafts when available. Verify that start and resume open the individual document in DS-011 and that the full review queue link opens DS-004, using simulated destinations. | DS-003 mock · Playwright | Check labels and destinations. |
| 5 | A seeded exact PDF or DOCX duplicate shows a Romanian blocking message and an action to view the existing document. No override is available. A valid sibling continues. | DS-003 mock · Playwright | For image fixtures, verify exact ordered duplicates block, reordered identical collections warn with continuation, and a shared page does not block. Include repeated images. Simulate outcomes without computing hashes. |
| 5a | After simulated OCR completes, a seeded similarity warning appears in processing and is retained in the DS-011 review handoff. It never blocks continuation. | DS-003 mock · Playwright with synthetic fixtures | The real matching criterion is pending Q-021. |
| 6 | Verify empty, loading, error, success and long text on mobile and desktop in both themes. Include one and many items, full filename access, no horizontal overflow, visible focus, keyboard and touch use, accessible names, contrast and reduced motion. | DS-003 mock · Playwright assertions and screenshots | Inspect captures against `DESIGN.md`. |
| 7 | Verify the intake workflow and design guardrails. | DS-003 mock or screenshots · owner review in chat | Explicit Screen approval under Q-013. |

During design execution, run the frontend build and Playwright scaffold checks, the existing PHPUnit suite under D-003, and ledger lint. Report actual results and reasons for any skipped checks. The prototype verifies synthetic UI interactions.

## Design

1. **Încărcare documente** is the single primary heading.
2. **PDF / DOCX** and **Imagini (JPG / PNG)** are prominent, keyboard-accessible choices. Both provide accessible multiple-file selection and drag-and-drop.
3. The active workspace displays either an independent PDF/DOCX file list or an image organizer. Show validation and transfer per PDF or DOCX. Distinguish the preserved DOCX original from the derived PDF in the fixture. In the organizer, show numbered thumbnails and allow adding images before submission, removing individual pages, and reordering by drag or named keyboard-accessible move controls. Announce position changes and preserve usable focus after reorder or removal. Explain that the ordered images form one document. **Salvează și procesează** submits the assembly for simulated processing.
4. **În procesare** shows queued, processing, failed and quarantined documents. Keep file-transfer progress in the upload workspace and distinguish it from OCR and processing status. Keep failed entries visible with individual Romanian errors and retry information where supported. Under D-026, quarantine follows the initial OCR failure and three failed retries. Quarantine management belongs to DS-004.
5. **Ciorne recente** shows approximately three to five private, review-ready drafts. Use **Nerevizuită** and **Începe revizuirea** for a successfully processed draft awaiting review. Use **Revizuire începută** and **Continuă revizuirea** for explicitly saved unfinished OCR or metadata review. Both draft actions open the individual document in DS-011. Provide a separate link to the full review queue in DS-004.

**Lifecycle.** The normal path is **Încărcare → În procesare → Ciornă → Revizuire → Finalizare**. Accepted uploads enter processing. Successful processing moves the same document into the review-ready drafts list. A document stays a private draft throughout OCR correction, metadata entry and saved unfinished review. D-038 also preserves private, resumable incomplete uploads. Only review-ready drafts appear under **Ciorne recente**. Transfer, asynchronous processing and review lifecycle have distinct meanings in the prototype. Finalization requires human review, metadata validation and explicit approval in DS-011. D-038 gates official indexing on approval. Processing completion or technical indexing confers no approval, finalization or public visibility.

**Duplicates.** A synthetic exact SHA-256 match for a PDF or DOCX blocks that file, shows a clear Romanian explanation and offers **Vezi documentul existent**. There is no override, including as a new Document Version. Valid siblings continue. For images, show D-040 outcomes at the assembled-document level. An identical ordered sequence blocks. The same images in a different order warn and allow continuation, accounting for repeated images. A matching page alone does not block. Simulate the backend outcomes using fixtures. Show a separate non-blocking OCR similarity warning after simulated extraction and retain it in the DS-011 review handoff. The similarity criterion remains open under Q-021. The possible-duplicate warning based on matching act number and confirmed Act Date belongs in DS-011.

**Visual and accessibility requirements.** Use only the approved light and dark palettes, Public Sans typography, spacing, radii and motion from `DESIGN.md`. Cover default, hover, focus, active, disabled and drag-over interactions. Pair colors with status text, verify contrast and target sizes, respect reduced motion, and provide full filename access at narrow widths. Keep the two lower sections compact so intake remains the primary task.

## Sequencing

One builder. After separate explicit authorization to execute the design, build the DS-003 mock and draft registry reference, verify both workspaces and the state matrix, inspect the screenshots, and share them for separate Screen approval in chat. Use D-040 for the duplicate fixtures and defer production OCR similarity matching until Q-021 is answered. P22-23 is a separate delivery.

## Risks

- **Processing can be mistaken for approval.** Label stages distinctly and show successful processing moving an entry to a private draft with a review action.
- **Mixed outcomes can appear to block a batch.** Show failed and duplicate files alongside a valid sibling that continues.
- **Page reordering can be difficult on mobile or with a keyboard.** Provide named move controls, announce position changes, and verify the visible order.
- **Queue and editor navigation can be confused.** Give the DS-004 queue link a distinct label from the per-document review actions that open DS-011.
- **Image duplicate feedback can imply a matching algorithm.** Use D-040 fixture outcomes. Real hashing and the encoding specification belong to implementation.

## Out of scope

P22-23 React implementation, DS-011 editor implementation, DS-004 queue and quarantine implementation, upload endpoints, persistence, permissions, real hashing, OCR, indexing, backend status enums, new Design Tokens, and Figma regeneration. DS-011 owns act-number and Act Date entry, other metadata forms, OCR editing, PII review, Redaction, possible-duplicate resolution and final approval. Publication controls are outside DS-003.

## Knowledge used

The owner confirmed that DS-004 remains the full review queue, DS-011 remains the individual document editor, and DS-003 shows a recent-draft preview. This follows D-032 and the Screen registry.

**12 entries confirmed, unchanged:** D-002, D-003, D-004, D-006, D-018, D-025, D-026, D-028, D-032, D-038, D-040, and Q-013. D-003 belongs in this confirmed list and governs the existing PHPUnit verification run.

| Entry | What it says | Why it applies | Call |
|---|---|---|---|
| Q-011 | Exact SHA-256 matches block saving. Matching act number and Act Date produces a possible-duplicate warning. | Supports the existing upload and metadata-review boundary. D-040 adds ordered-image and OCR warning rules. | Answered. Preserve existing answer. |

### Considered, not applied

- **Signed URL delivery contract (P22-11 branch)** — Governs Signed URL delivery. The duplicate fixture illustrates navigation to the existing document. No delivery interface or consumer changes are proposed.
- **PATTERN-002** — Candidate. The verification requirement comes from AGENTS.md and D-006.

### Assumptions and open questions

- **Q-020, answered.** D-040 defines ordered-image duplicate handling. The earlier provisional label Q-017 belongs to an existing Notarial Nomenclature question.
- **Q-021, open.** OCR similarity requires a separately approved metric and threshold supported by Document Corpus tests. Use synthetic warning outcomes in the mock.
