# Decisions superseded — proiect1

<!-- graffino-agentic:begin v1 -->
> Decisions that no longer apply. **Never obeyed**; read only to explain old code or a
> past choice. Each points to the entry that replaced it. `ledger-lint.py --fix`
> keeps this file in sync: superseded entries move here from `DECISIONS.md`, and
> their index lines move here from its index.
<!-- graffino-agentic:end -->

## Index
- D-005 · PII detection, confidence scoring, visual redaction, and human review · _superseded-by D-022_
- D-008 · Role mapping and access segregation · _superseded-by D-023_
- D-009 · Editable OCR metadata extraction and confirmation · _superseded-by D-021_
- D-010 · Mandatory Act Date confirmation for indexing and retention · _superseded-by D-027_
- D-011 · Inline OCR text correction in Document Viewer · _superseded-by D-021_
- D-012 · Manual PII bounding-box drawing and pixel-level burning · _superseded-by D-022_
- D-013 · Share link creation, scope, and audit logging · _superseded-by D-024_
- D-014 · Upload deduplication via exact hash and near-duplicate text warning · _superseded-by D-025_
- D-015 · Quarantine Queue for consecutive OCR failures · _superseded-by D-026_
- D-016 · Retention calculation and manual batch destruction confirmation · _superseded-by D-027_

---

## D-005 · PII detection, confidence scoring, visual redaction, and human review
- **Status:** superseded-by D-022
- **Date:** 2026-11-16
- **Rule:** Personal data detection and redaction must cover Romanian CNP, IBAN, phone numbers, emails, and person names, strictly enforcing:
  1. Checksum & contextual detection: Mathematical checksum validation for Romanian CNP (control digit with weights `279146358279` mod 11) and IBAN (ISO 7064 MOD-97), combined with Romanian notarial context anchors (e.g. `CNP:`, `IBAN:`, `subsemnatul`, `subsemnata`, `numitul`, `domiciliat în`, `identificat prin CI`) to identify person names.
  2. Confidence scoring & human review: High-confidence matches (valid checksum + context keyword) can auto-redact. Detected person names, corrupted OCR matches, or matches lacking checksum are assigned medium confidence and routed to a human review queue, excluding public notary titles/names (e.g., `Notar Public Constantinescu Ana`).
  3. Visual pixel-level redaction & role segregation: Burn solid black boxes onto the image/PDF copy using Tesseract word bounding boxes (plus manual bounding-box drawing in the React UI for missed names). Strip redacted values from text/metadata served to `cititor` roles while keeping the unredacted original restricted to `admin` / `arhivar` roles.
- **Why:** Enforces compliance with privacy regulations without risking unvalidated redaction of public notary credentials or leaking PII to unauthorized readers.
- **Rejected:** Microsoft Presidio due to heavy Python/spaCy RAM footprint and lack of native Romanian CNP/notarial context rules; naive unvalidated regex matching.
- **Evidence:** docs/agents/OPEN-QUESTIONS.md:Q-006
- **Source:** user · confidence high

## D-008 · Role mapping and access segregation
- **Status:** superseded-by D-023
- **Date:** 2026-11-17
- **Rule:** The application must enforce four specific role access tiers:
  1. `admin` (Notar Public): Full system access, user and folder administration, retention and destruction confirmation, and creation of share links (original or redacted).
  2. `arhivar` (Arhivar AND Secretar Notarial): Access to original scans, PII review queue, OCR metadata confirmation, inline OCR correction, manual PII redaction drawing, quarantine queue management, and creation of share links.
  3. `cititor` (other internal staff/interns): Access to redacted scans and full-text search results only; cannot create share links or view unredacted scans.
  4. `(unauthenticated)` (external share-link recipient): Access restricted exclusively to the public share link viewer to view and download a PDF of the shared copy via signed URL.
- **Why:** Reconciles internal cabinet staff responsibilities with GDPR privacy compliance and role segregation requirements.
- **Rejected:** Role-per-title fragmentation; giving `cititor` access to unredacted originals or share link creation.
- **Evidence:** README.md
- **Source:** user · confidence high

## D-009 · Editable OCR metadata extraction and confirmation
- **Status:** superseded-by D-021
- **Date:** 2026-11-17
- **Rule:** Metadata automatically extracted by OCR (dates, amounts, document numbers, tags) must be presented in the user interface as editable suggestions and must be explicitly confirmed or corrected by an archivist before the document is indexed.
- **Why:** Prevents faulty or corrupted OCR extractions from polluting search indexes, cataloguing registers, or retention calculations.
- **Rejected:** Unchecked direct indexing of raw OCR metadata without human confirmation.
- **Evidence:** README.md
- **Source:** user · confidence high

## D-010 · Mandatory Act Date confirmation for indexing and retention
- **Status:** superseded-by D-027
- **Date:** 2026-11-17
- **Rule:** Act Date confirmation is mandatory before any document can enter the archival retention schedule or be indexed for full-text search. If OCR fails to detect an Act Date, manual entry by the archivist is strictly required. No document shall be indexed without a confirmed Act Date.
- **Why:** Archival retention computation under statutory Notarial Nomenclature is computed from the Act Date, making it a critical archival integrity requirement.
- **Rejected:** Indexing without confirmed Act Date; falling back to upload date or file timestamp for retention schedules.
- **Evidence:** README.md
- **Source:** user · confidence high

## D-011 · Inline OCR text correction in Document Viewer
- **Status:** superseded-by D-021
- **Date:** 2026-11-17
- **Rule:** The Document Viewer must provide inline OCR text editing capabilities. Corrections made by an archivist must be saved to the immutable Document Version and immediately update the full-text search index.
- **Why:** Enables correction of OCR transcription errors and misread diacritics while preserving auditability and search precision.
- **Rejected:** Read-only OCR text panes; unversioned direct database text overwrites.
- **Evidence:** README.md
- **Source:** user · confidence high

## D-012 · Manual PII bounding-box drawing and pixel-level burning
- **Status:** superseded-by D-022
- **Date:** 2026-11-17
- **Rule:** The Document Viewer must allow manual drawing of PII bounding boxes on document scans. Manually drawn boxes must merge with auto-detected PII bounding boxes and be burned at the pixel level into the generated redacted copy as solid black boxes.
- **Why:** Guarantees complete visual anonymization of personal data (such as missed person names or irregular layouts) with zero risk of underlying text recovery in the redacted file.
- **Rejected:** Client-side CSS masking or visual overlays that leave underlying image pixels or PDF text streams intact.
- **Evidence:** README.md
- **Source:** user · confidence high

## D-013 · Share link creation, scope, and audit logging
- **Status:** superseded-by D-024
- **Date:** 2026-11-17
- **Rule:** Share links may only be created by users with `admin` or `arhivar` roles. The creator must explicitly choose whether the link grants access to the original scan or the redacted copy. Unauthenticated recipients holding a valid signed URL can view and download a PDF of the shared copy. Every access via a share link must be recorded in the Append-Only Audit Log.
- **Why:** Supports lawful external sharing of notarial acts (e.g. with banks, cadastral offices, or parties) while preserving GDPR compliance, access expiration, and complete audit trails.
- **Rejected:** Creation of share links by `cititor`; unlogged access; permanent or public unauthenticated URLs without signed expiration.
- **Evidence:** README.md
- **Source:** user · confidence high

## D-014 · Upload deduplication via exact hash and near-duplicate text warning
- **Status:** superseded-by D-025
- **Date:** 2026-11-17
- **Rule:** The upload pipeline must enforce deduplication:
  1. Exact duplicate: An identical SHA-256 file hash immediately blocks the upload and displays a link to the existing archived document.
  2. Near-duplicate: High OCR text similarity triggers a warning with a link to the matching document, but allows the archivist to proceed if intended.
- **Why:** Prevents accidental duplicate uploads of identical scans while warning staff of potential redundant re-scans of existing notarial dossiers.
- **Rejected:** Silent rejection without linking existing documents; blocking near-duplicates automatically without archivist discretion.
- **Evidence:** README.md
- **Source:** user · confidence high

## D-015 · Quarantine Queue for consecutive OCR failures
- **Status:** superseded-by D-026
- **Date:** 2026-11-17
- **Rule:** Any document scan that encounters N consecutive OCR processing failures must be removed from the normal processing queue and placed into an isolated Quarantine Queue. The archivist must receive an in-app notification and be given the option to re-trigger processing or mark the document as permanently failed.
- **Why:** Prevents corrupted or unreadable scans from blocking background asynchronous processing workers and isolates problematic files for manual intervention.
- **Rejected:** Infinite retry loops that stall worker queues; silent document drops without archivist alert.
- **Evidence:** README.md
- **Source:** user · confidence high

## D-016 · Retention calculation and manual batch destruction confirmation
- **Status:** superseded-by D-027
- **Date:** 2026-11-17
- **Rule:** Retention periods must be calculated strictly from the confirmed Act Date using the statutory rules in `docs/nomenclator_arhivistic.csv`. Documents whose retention period has expired must be displayed on the Destruction List grouped by their Selection Commission (`C.S.`) flag. Permanent deletion must never occur automatically; an Admin must manually confirm destruction per batch.
- **Why:** Romanian archival law mandates strict oversight over notarial records disposal and prohibits automated purging without Selection Commission review.
- **Rejected:** Automatic scheduled purging/deletion of expired records; calculating retention from upload or system date.
- **Evidence:** README.md
- **Source:** user · confidence high
