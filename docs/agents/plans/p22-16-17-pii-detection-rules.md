# Plan — P22-16, P22-17a and P22-17b · PII detection rules

**Status:** Detector rules implemented on 2026-11-26 and automated checks passed. PII detection is to run in DS-011 after OCR corrections; the earlier raw-OCR corpus run is diagnostic only and does not validate corrected-text coverage. Corpus files remain locally excluded from Git.

## Size

**M** — Three related backend tasks. The detectors share persisted OCR words and Bounding Boxes. P22-16 adds configurable confidence and anchor proximity rules; P22-17a and P22-17b cover the remaining PII categories in D-022.

## Approach

Build on `OcrTsv`, `OcrExtraction`, and the persisted word data in `ocr_pages`. Extend the word data to retain OCR block, line and word order, which the current parser reads from TSV but does not save. This lets detection handle identifiers split across words and apply the approved line and block proximity rules. Add backend detectors that return candidates with category, Bounding Boxes and disposition for later review and Redaction.

For CNP and IBAN, use **80/100 provisionally** as the configurable automatic-Redaction cutoff, provided the checksum is valid and an appropriate Notarial Context Anchor precedes the identifier within the agreed proximity limits. Route candidates below the cutoff to human review rather than discarding them. Route ambiguous or conflicting anchor associations to human review. Detect names, phone numbers and email addresses for human review; flag addresses, identity-card details, cadastral and vehicle identifiers, and CUI/CIF for Redaction. An OCR signature label creates a review cue only so staff can draw a Bounding Box around the actual Signatory Party signature. Preserve Notary Public name, title and signature.

## Files

| Action | Path | What |
|---|---|---|
| Update | `backend/app/Services/OcrTsv.php` | Preserve OCR block, line and word order alongside word confidence and Bounding Boxes. |
| Add | `backend/app/Services/` | CNP/IBAN validation and contextual matching; split-word identifier assembly; name, contact and other sensitive-region detectors; candidate dispositions and boxes. |
| Update | `backend/config/services.php` | Add configurable OCR confidence and anchor proximity values using the approved defaults. |
| Update | `backend/tests/Unit/OcrTsvTest.php` | Cover preserved block, line and word order. |
| Add | `backend/tests/Unit/` | Cover checksums, identifiers split across OCR words, confidence cutoffs, anchor ordering and distance, ambiguous associations, PII categories and Notary Public exemptions. |
| Add | `backend/tests/Feature/` | Verify detector candidates map to the correct page and OCR Bounding Boxes. |
| Update after implementation | `docs/agents/plans/p22-task-checklist.md` | Record completion evidence and Document Corpus validation results. |

No database migration is planned: OCR word data is stored as JSON, so the detector can use the existing table. No API contract or UI change is planned; review UI and applying Redaction remain in later tasks.

## Tests

| # | Behaviour | Test | Not automated? why |
|---|---|---|---|
| 1 | OCR words retain block, line and word order while preserving existing confidence and Bounding Box data. | `OcrTsvTest.php` · PHPUnit unit | — |
| 2 | CNP uses weights `279146358279` and the mod-11 control digit; IBAN uses ISO 7064 MOD-97. | PHPUnit unit tests | — |
| 3 | CNP and IBAN candidates assemble correctly when split across adjacent OCR words, and their boxes cover all identifier words. | PHPUnit unit tests | — |
| 4 | Automatic Redaction requires a valid checksum, score at or above the configurable cutoff, and an appropriate preceding anchor within the same-line or fallback limits. | PHPUnit unit tests | — |
| 5 | Below-cutoff candidates, invalid or uncertain matches, and conflicting or ambiguous anchor associations go to human review. | PHPUnit unit tests | — |
| 6 | Names and contact data are detected for review; the other D-022 text-label categories are flagged; OCR signature labels cue manual Bounding Box review; Notary Public name, title and signature are exempt. | PHPUnit unit and feature tests | Handwritten or difficult visual cases require corpus review. |
| 7 | Candidate Bounding Boxes map to the correct page and OCR words. | PHPUnit feature tests | — |
| 8 | Provisional cutoff and proximity configuration are exercised against the Document Corpus and results recorded without including personal data in logs. | Corpus validation using synthetic test documents | Depends on access to the available corpus; report any unavailable cases. |

## Design (UI only)

No UI changes in these tasks.

## Sequencing

One builder, in task order: **P22-16** checksum, confidence, anchor and split-word rules; **P22-17a** names and contact data; **P22-17b** other sensitive regions. The detectors will share OCR word metadata and candidate output.

## Risks

- OCR may split, merge or misorder identifiers. Retain TSV line/block/order metadata and test multiword cases; send uncertain matches to human review.
- A broad anchor match could associate the wrong label with an identifier. Require preceding, type-appropriate anchors and route conflicting or ambiguous associations to review.
- The 80/100 cutoff is provisional. Keep it configurable and validate against the Document Corpus before treating it as settled.

## Out of scope

DS-011 review UI, manual Bounding Box drawing, applying Redaction to PDFs, safe reader text and metadata, official save and indexing, and live deployment. These are covered by related later tasks.

## Knowledge used

| Entry | What it says | Why it applies | Call |
|---|---|---|---|
| D-022 · PII detection and Redaction coverage | Specifies PII categories, CNP and IBAN checksum validation, context anchors, uncertain-match review, Notary Public exemption, pixel Redaction and explicit review. | Defines detector categories, dispositions and preservation rules. | Confirmed in plan approval on 2026-11-26 |
| D-004 · Romanian Tesseract OCR with TSV Bounding Boxes | Requires Romanian OCR and retained TSV coordinates. | Provides confidence, word geometry and TSV source for the detector. | Previously confirmed; unchanged |
| D-003 · Backend automated testing with PHPUnit | Backend automated tests use PHPUnit. | Governs detector and parser test coverage. | Previously confirmed; unchanged |
| D-002 · Digital archive core scope and capabilities | Requires PII detection and anonymization in the archive. | Establishes this work as part of the core system. | Previously confirmed; unchanged |
| D-018 · Romanian-only UI and system errors | Application UI and system errors are Romanian-only. | No UI changes are planned; detector error paths must preserve this constraint if surfaced. | Previously confirmed; unchanged |
| Q-006 · Anonymization pipeline architecture and dependencies | Answer records Laravel-based checksum/context detection, confidence scoring, human review and pixel Redaction. | Supports implementing these rules in the existing backend OCR pipeline. | Answered; no unresolved scope |
| Contracts | No provided contract governs internal detection output. | This plan does not change an external boundary. | No call required |
| Q-021 · OCR similarity criterion | Remains open and excludes OCR similarity behavior. | These tasks do not implement duplicate similarity detection. | Unchanged; not applied |

## Owner-confirmed rules

- Use a provisional OCR confidence cutoff of **80/100** for automatic CNP and IBAN Redaction when the checksum is valid and an appropriate Notarial Context Anchor is nearby. Candidates below 80 go to human review, not discard. Keep the cutoff configurable and validate it against the Document Corpus.
- Handle identifiers split across multiple OCR words.
- Primary anchor proximity: same OCR line, at most 3 intervening words.
- Fallback anchor proximity: immediately following OCR line within the same OCR block, at most 5 intervening words.
- The anchor must precede the identifier and be appropriate for its PII type. Conflicting or ambiguous associations go to human review.
- When a preceding CNP anchor is within the configured proximity and adjacent OCR digit tokens contain at least 10 digits without forming a valid 13-digit CNP, emit one review-only cue over those digit tokens. Keep valid 13-digit CNP routing unchanged.
- Run PII detection after inline OCR corrections in DS-011. Use the corrected OCR words and their Bounding Boxes for candidate review and any subsequent Redaction; upload remains OCR extraction only. **Confirmed:** 2026-11-26
- Keep proximity thresholds configurable and validate them against the Document Corpus.
- Do not treat an OCR signature label box as the actual handwritten signature. Return a review cue; manual Bounding Box drawing handles the signature region.
