# Archive workflows

## D-021 · Upload review, metadata, and Document Versions
- **Status:** approved
- **Date:** 2026-11-19
- **Rule:** An incomplete upload stays a private draft that authorized staff can resume. Before any official save or indexing, an `admin` or `arhivar` must confirm or correct the editable OCR metadata suggestions (including dates, amounts, document numbers, and tags), explicitly approve PII review even when no uncertain matches are flagged, and confirm the Act Date, act number, Physical Dossier Number, and Inventory Number. Enter the Act Date manually when OCR misses it. Assign the Archival Indicator from the selected document type, subtype, and Storage Context. Staff can correct the classification. The retention date requirements in D-027 also apply. DS-011 provides inline OCR correction and Redaction. Edits create a new immutable Document Version. The current approved version remains searchable and viewable during review. After approval, only the latest version is indexed. Older versions remain available to `admin` and `arhivar` through version history.
- **Why:** Keeps draft content out of search and preserves approved versions during review.
- **Evidence:** D-020 and owner confirmation in the requirements review
- **Source:** user · confidence high
- **Confirmed:** 2026-11-19

## D-022 · PII detection and Redaction coverage
- **Status:** approved
- **Date:** 2026-11-19
- **Rule:** Detect Romanian CNP, IBAN, phone numbers, email addresses, and Signatory Party names. Validate CNP using weights `279146358279` and the mod-11 control digit, and validate IBAN with ISO 7064 MOD-97. Use Notarial Context Anchors for contextual detection. A valid CNP or IBAN checksum plus a nearby anchor can trigger automatic Redaction. Route names, corrupt OCR, and uncertain matches to human review. Also flag addresses, identity-card details, Signatory Party signatures, cadastral identifiers, vehicle identifiers, and CUI/CIF for Redaction. Preserve the Notary Public name, title, and signature. DS-011 combines manual Bounding Boxes with automatically detected Bounding Boxes and burns solid black pixels into the redacted copy. Keep the original intact. Remove underlying redacted PDF text and strip redacted values from text and metadata served to `cititor`. Every document requires explicit review approval under D-021.
- **Why:** Defines what staff must check and what remains visible in the anonymized copy.
- **Evidence:** Q-006, D-004, D-020, and owner confirmation in the requirements review
- **Source:** user · confidence high
- **Confirmed:** 2026-11-19

## D-023 · Archive browsing, Folder Permissions, and search
- **Status:** approved
- **Date:** 2026-11-19
- **Rule:** Provide three browsing modes for the same archive: Physical Dossier, document type, and year. The Notary Public uses `admin` and manages users, folders, and permissions. Arhivar and Secretar Notarial both use `arhivar`. Both roles have unrestricted dossier access. Folder Permissions apply only to `cititor` (other internal staff and interns), are assigned to Physical Dossiers, apply in all browsing modes, and deny access by default. An individual permission takes precedence over a role permission. Within granted dossiers, `cititor` can immediately search and view approved redacted copies across all document types. Exclude redacted text from search. Signatory Party name lookup is restricted to `admin` and `arhivar`. Show the Physical Dossier Number on every search result. External recipients can access only the selected PDF through DS-009 and D-024.
- **Why:** Supports physical retrieval and applies the same access rules in each browsing mode.
- **Evidence:** Q-008 and owner confirmation in the requirements review
- **Source:** user · confidence high
- **Confirmed:** 2026-11-19

## D-024 · Share Link access and lifecycle
- **Status:** approved
- **Date:** 2026-11-19
- **Rule:** Either `admin` or `arhivar` can create a Share Link and explicitly select the original or redacted PDF. Recipient identity verification and written requests are handled offline. Offer optional password protection and expiry presets of 24 hours, 7 days, and 30 days, or any custom future date. A valid Share Link lets an unauthenticated recipient view or download the selected PDF, subject to any configured password. Pin it to the exact Document Version shared. Any `admin` or `arhivar` can revoke it. Record link creation and each PDF view or download in the Append-Only Audit Log.
- **Why:** Defines external access, version scope, expiry, and audit events.
- **Evidence:** Q-012 and owner confirmation in the requirements review
- **Source:** user · confidence high
- **Confirmed:** 2026-11-19

## D-025 · Exact and possible duplicates
- **Status:** approved
- **Date:** 2026-11-19
- **Rule:** An exact SHA-256 match shows a warning, directs staff to the existing document, and blocks saving, including a save as a new Document Version. Matching act number and Act Date triggers a possible-duplicate warning linking to the matching document. Staff can save it as a new Document Version, save it as a separate document, or abandon the save.
- **Why:** Act identifiers distinguish documents that use the same template.
- **Evidence:** Q-011 and owner confirmation in the requirements review
- **Source:** user · confidence high
- **Confirmed:** 2026-11-19

## D-026 · OCR quarantine threshold
- **Status:** approved
- **Date:** 2026-11-19
- **Rule:** After the initial failed OCR attempt and three failed retries, remove the Document Scan from normal processing and put it in the Quarantine Queue. Notify the Arhivar in the Application and allow them to retry processing or mark it permanently failed.
- **Why:** Keeps repeatedly failing Document Scans from blocking other work.
- **Evidence:** Q-010 and owner confirmation in the requirements review
- **Source:** user · confidence high
- **Confirmed:** 2026-11-19

## D-027 · Retention, destruction, and retained audit evidence
- **Status:** approved
- **Date:** 2026-11-19
- **Rule:** Use the applicable Retention Computation Base from the Notarial Nomenclature in `docs/nomenclator_arhivistic.csv`. The `admin` or `arhivar` must enter or confirm the applicable date before official save, including contract expiry, dossier resolution, or deposit release where prescribed. Permanent Preservation has no destruction deadline. Group expired records on the Destruction List by their C.S. flag. Selection Commission deliberations stay offline. The `admin` can extend the deadline and must manually confirm destruction per batch. Confirmation permanently deletes the Document Scan and every Document Version and ends access to them. Retain prior access events, the identity of the Admin who confirmed destruction, and the act number, Act Date, document type, Physical Dossier Number, and Signatory Party names in the Append-Only Audit Log indefinitely. Both `admin` and `arhivar` can view the retained evidence.
- **Why:** Uses the prescribed retention event and preserves evidence after destruction.
- **Evidence:** docs/nomenclator_arhivistic.csv and owner confirmation in the requirements review
- **Source:** user · confidence high
- **Confirmed:** 2026-11-19

## D-028 · DOCX originals and derived PDFs
- **Status:** approved
- **Date:** 2026-11-19
- **Rule:** Preserve each uploaded DOCX as the original and generate a PDF for viewing, Redaction, and sharing.
- **Why:** Keeps the uploaded original and gives the Application a consistent format to serve.
- **Evidence:** Owner confirmation in the requirements review
- **Source:** user · confidence high
- **Confirmed:** 2026-11-19

## D-029 · Live acceptance corpus
- **Status:** approved
- **Date:** 2026-11-19
- **Rule:** Validate the Application in the live deployment using 30 document templates supplied by the Secretar Notarial and populated with test data. Official Notary Cabinet documents are excluded from this corpus. The Secretar Notarial runs the five acceptance searches in the live deployment and the results are recorded in `INTERVIEW.md`.
- **Why:** Validates the workflow while protecting client data.
- **Evidence:** docs/brief.md and owner confirmation in the requirements review
- **Source:** user · confidence high
- **Confirmed:** 2026-11-19
