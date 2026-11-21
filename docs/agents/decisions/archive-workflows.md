# Archive workflows

## D-022 · PII detection and Redaction coverage
- **Status:** approved
- **Date:** 2026-11-19
- **Rule:** Detect Romanian CNP, IBAN, phone numbers, email addresses, and Signatory Party names. Validate CNP using weights `279146358279` and the mod-11 control digit, and validate IBAN with ISO 7064 MOD-97. Use Notarial Context Anchors for contextual detection. A valid CNP or IBAN checksum plus a nearby anchor can trigger automatic Redaction. Route names, corrupt OCR, and uncertain matches to human review. Also flag addresses, identity-card details, Signatory Party signatures, cadastral identifiers, vehicle identifiers, and CUI/CIF for Redaction. Preserve the Notary Public name, title, and signature. DS-011 combines manual Bounding Boxes with automatically detected Bounding Boxes and burns solid black pixels into the redacted copy. Keep the original intact. Remove underlying redacted PDF text and strip redacted values from text and metadata served to `cititor`. Every document requires explicit review approval under D-031.
- **Why:** Defines what staff must check and what remains visible in the anonymized copy.
- **Evidence:** Q-006, D-004, D-020, and owner confirmation in the requirements review
- **Source:** user · confidence high
- **Confirmed:** 2026-11-21

## D-023 · Archive browsing, Folder Permissions, and search
- **Status:** superseded-by D-033
- **Date:** 2026-11-19
- **Rule:** Provide three browsing modes for the same archive: Physical Dossier, document type, and year. The Notary Public uses `admin` and manages users, folders, and permissions. Arhivar and Secretar Notarial both use `arhivar`. Both roles have unrestricted dossier access. Folder Permissions apply only to `cititor` (other internal staff and interns), are assigned to Physical Dossiers, apply in all browsing modes, and deny access by default. An individual permission takes precedence over a role permission. Within granted dossiers, `cititor` can immediately search and view approved redacted copies across all document types. Exclude redacted text from search. Signatory Party name lookup is restricted to `admin` and `arhivar`. Show the Physical Dossier Number on every search result. External recipients can access only the selected PDF through DS-009 and D-024.
- **Why:** Supports physical retrieval and applies the same access rules in each browsing mode.
- **Evidence:** Q-008 and owner confirmation in the requirements review
- **Source:** user · confidence high

## D-024 · Share Link access and lifecycle
- **Status:** superseded-by D-034
- **Date:** 2026-11-19
- **Rule:** Either `admin` or `arhivar` can create a Share Link and explicitly select the original or redacted PDF. Recipient identity verification and written requests are handled offline. Offer optional password protection and expiry presets of 24 hours, 7 days, and 30 days, or any custom future date. A valid Share Link lets an unauthenticated recipient view or download the selected PDF, subject to any configured password. Pin it to the exact Document Version shared. Any `admin` or `arhivar` can revoke it. Record link creation and each PDF view or download in the Append-Only Audit Log.
- **Why:** Defines external access, version scope, expiry, and audit events.
- **Evidence:** Q-012 and owner confirmation in the requirements review
- **Source:** user · confidence high

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
- **Status:** superseded-by D-035
- **Date:** 2026-11-19
- **Rule:** Use the applicable Retention Computation Base from the Notarial Nomenclature in `docs/nomenclator_arhivistic.csv`. The `admin` or `arhivar` must enter or confirm the applicable date before official save, including contract expiry, dossier resolution, or deposit release where prescribed. Permanent Preservation has no destruction deadline. Group expired records on the Destruction List by their C.S. flag. Selection Commission deliberations stay offline. The `admin` can extend the deadline and must manually confirm destruction per batch. Confirmation permanently deletes the Document Scan and every Document Version and ends access to them. Retain prior access events, the identity of the Admin who confirmed destruction, and the act number, Act Date, document type, Physical Dossier Number, and Signatory Party names in the Append-Only Audit Log indefinitely. Both `admin` and `arhivar` can view the retained evidence.
- **Why:** Uses the prescribed retention event and preserves evidence after destruction.
- **Evidence:** docs/nomenclator_arhivistic.csv and owner confirmation in the requirements review
- **Source:** user · confidence high

## D-028 · DOCX originals and derived PDFs
- **Status:** approved
- **Date:** 2026-11-19
- **Rule:** Preserve each uploaded DOCX as the original and generate a PDF for viewing, Redaction, and sharing.
- **Why:** Keeps the uploaded original and gives the Application a consistent format to serve.
- **Evidence:** Owner confirmation in the requirements review
- **Source:** user · confidence high
- **Confirmed:** 2026-11-21

## D-029 · Live acceptance corpus
- **Status:** superseded-by D-036
- **Date:** 2026-11-19
- **Rule:** Validate the Application in the live deployment using 30 document templates supplied by the Secretar Notarial and populated with test data. Official Notary Cabinet documents are excluded from this corpus. The Secretar Notarial runs the five acceptance searches in the live deployment and the results are recorded in `INTERVIEW.md`.
- **Why:** Validates the workflow while protecting client data.
- **Evidence:** docs/brief.md and owner confirmation in the requirements review
- **Source:** user · confidence high

## D-030 · Physical Dossiers, Document Versions, and metadata changes
- **Status:** superseded-by D-037
- **Date:** 2026-11-19
- **Rule:** Every digital document belongs to exactly one Physical Dossier. A Physical Dossier can contain many digital documents. The current dossier assignment is stored on the digital document and determines browsing and Folder Permissions. After initial approval, create a new immutable Document Version only when the underlying document file is replaced or updated. Apply metadata changes, including Physical Dossier reassignment and Notarial Nomenclature reclassification, to the digital document without creating a Document Version. Record the user, timestamp, changed field, previous value, and new value in the Append-Only Audit Log for each metadata change.
- **Why:** Document Versions track changes to the document file. The audit log preserves the history of changes to metadata.
- **Evidence:** Owner confirmation during Part 2 planning
- **Source:** user · confidence high

## D-031 · Upload review, metadata, and Document Versions
- **Status:** superseded-by D-038
- **Date:** 2026-11-19
- **Rule:** An incomplete upload stays a private draft that authorized staff can resume. Before any official save or indexing, an `admin` or `arhivar` must confirm or correct the editable OCR metadata suggestions (including dates, amounts, document numbers, and tags), explicitly approve PII review even when no uncertain matches are flagged, and confirm the Act Date, act number, Physical Dossier Number, and Inventory Number. Enter the Act Date manually when OCR misses it. Assign the Archival Indicator from the selected document type, subtype, and Storage Context. Staff can correct the classification. The retention date requirements in D-027 also apply. DS-011 provides inline OCR correction and Redaction. Initial approval creates the first immutable Document Version. Later approval creates a new version only when the underlying document file is replaced or updated under D-030. The current approved version remains searchable and viewable during replacement review. Only the current approved version is indexed. Older versions remain available to `admin` and `arhivar` through version history.
- **Why:** Keeps draft content out of search and preserves approved versions during review.
- **Evidence:** D-021, D-030, and owner confirmation during Part 2 planning
- **Source:** user · confidence high

## D-033 · Archive browsing, Folder Permissions, and search
- **Status:** approved
- **Date:** 2026-11-20
- **Rule:** Provide three browsing modes for the same archive: Physical Dossier, document type, and year. The Notary Public uses `admin` and manages users, folders, and permissions. Arhivar and Secretar Notarial both use `arhivar`. Both roles have unrestricted dossier access. Folder Permissions apply only to `cititor` (other internal staff and interns), are assigned to Physical Dossiers, apply in all browsing modes, and deny access by default. An individual permission takes precedence over a role permission. Within granted dossiers, `cititor` can immediately search, view, and download approved redacted copies across all document types. Exclude redacted text from search. Signatory Party name lookup is restricted to `admin` and `arhivar`. Show the Physical Dossier Number on every search result. External recipients can access only the selected PDF through DS-009 and D-034.
- **Why:** Records the confirmed archive requirements.
- **Evidence:** D-023 and owner confirmation in chat
- **Source:** user · confidence high
- **Confirmed:** 2026-11-20

## D-034 · Share Link access and lifecycle
- **Status:** approved
- **Date:** 2026-11-20
- **Rule:** After approval creates a Document Version, either `admin` or `arhivar` can create a Share Link and explicitly select the original or redacted PDF. Recipient identity verification and written requests are handled offline. Offer optional password protection and expiry presets of 24 hours, 7 days, and 30 days, or any custom future date. A valid Share Link lets an unauthenticated recipient view or download the selected PDF, subject to any configured password. Pin it to the exact Document Version shared. Any `admin` or `arhivar` can revoke it. Record link creation and each PDF view or download in the Append-Only Audit Log. For each external view or download record the link ID, exact Document Version, action, and time. Both roles see, copy, and revoke active links in DS-008. A missed Redaction leaves affected links active until manually revoked or expired. DS-009 uses the title „Document partajat” and exposes archival details only as part of the selected PDF.
- **Why:** Records the confirmed archive requirements.
- **Evidence:** D-024 and owner confirmation in chat
- **Source:** user · confidence high
- **Confirmed:** 2026-11-20

## D-035 · Retention, destruction, and retained audit evidence
- **Status:** approved
- **Date:** 2026-11-20
- **Rule:** Use the applicable Retention Computation Base from the Notarial Nomenclature in `docs/nomenclator_arhivistic.csv`. The `admin` or `arhivar` confirms the applicable date at approval when known, including a future contractual expiry stated in the contract. If the date is unknown, staff can approve the document with retention pending and record the date once confirmed. Pending documents are searchable and viewable under normal permissions and stay off the Destruction List until a deadline can be calculated. Permanent Preservation has no destruction deadline. Group expired records on the Destruction List by their C.S. flag. Selection Commission deliberations stay offline. The `admin` can extend the deadline and must manually confirm destruction per batch. Confirmation permanently deletes the Document Scan and every Document Version and ends access to them. Retain prior access events, the identity of the Admin who confirmed destruction, and the act number, Act Date, document type, Physical Dossier Number, and Signatory Party names in the Append-Only Audit Log indefinitely. Both `admin` and `arhivar` can view the retained evidence.
- **Why:** Records the confirmed archive requirements.
- **Evidence:** D-027 and owner confirmation in chat
- **Source:** user · confidence high
- **Confirmed:** 2026-11-20

## D-036 · Live acceptance corpus
- **Status:** approved
- **Date:** 2026-11-20
- **Rule:** Validate the Application in the live deployment using 30 test documents generated from about 10 distinct templates supplied by the Secretar Notarial. Official Notary Cabinet documents are excluded from this corpus. The Secretar Notarial runs the five acceptance searches in the live deployment and the results are recorded in `INTERVIEW.md`.
- **Why:** Records the confirmed archive requirements.
- **Evidence:** D-029 and owner confirmation in chat
- **Source:** user · confidence high
- **Confirmed:** 2026-11-21

## D-037 · Physical Dossiers, Document Versions, and metadata changes
- **Status:** approved
- **Date:** 2026-11-20
- **Rule:** Every digital document belongs to exactly one Physical Dossier. A Physical Dossier can contain many digital documents. The current dossier assignment is stored on the digital document and determines browsing and Folder Permissions. After initial approval, create a new immutable Document Version when the underlying document file is replaced or updated, or a corrected redacted PDF is approved. Approved OCR-only corrections reindex the same Document Version and are audited. Apply metadata changes, including Physical Dossier reassignment and Notarial Nomenclature reclassification, to the digital document without creating a Document Version. Record the user, timestamp, changed field, previous value, and new value in the Append-Only Audit Log for each metadata change.
- **Why:** Records the confirmed archive requirements.
- **Evidence:** D-030 and owner confirmation in chat
- **Source:** user · confidence high
- **Confirmed:** 2026-11-21

## D-038 · Upload review, metadata, and Document Versions
- **Status:** approved
- **Date:** 2026-11-20
- **Rule:** An incomplete upload stays a private draft that authorized staff can resume. Before any official save or indexing, an `admin` or `arhivar` must confirm or correct the editable OCR metadata suggestions (including dates, amounts, document numbers, and tags), explicitly approve PII review even when no uncertain matches are flagged, and confirm the Act Date, act number, Physical Dossier Number, and Inventory Number. Enter the Act Date manually when OCR misses it. Assign the Archival Indicator from the selected document type, subtype, and Storage Context. Staff correct the Archival Indicator through type, subtype, or Storage Context. The retention date requirements in D-035 also apply. DS-011 provides inline OCR correction and Redaction. Initial approval creates the first immutable Document Version. Later approval creates a new version when the underlying document file is replaced or updated, or a corrected redacted PDF is approved under D-037. A reviewed and approved OCR-only correction reindexes the same Document Version and is audited. The current approved version remains searchable and viewable during replacement review. Only the current approved version is indexed. Older versions remain available to `admin` and `arhivar` through version history.
- **Why:** Records the confirmed archive requirements.
- **Evidence:** D-031 and owner confirmation in chat
- **Source:** user · confidence high
- **Confirmed:** 2026-11-21

## D-039 · Official Notarial Nomenclature revisions
- **Status:** approved
- **Date:** 2026-11-20
- **Rule:** Both `admin` and `arhivar` can browse the full Notarial Nomenclature and apply official CSV revisions in DS-012. New approvals use the revised rules. Existing approved documents retain the rule already applied until either role reviews and applies the revision to them. Preserve the prior rule in the Append-Only Audit Log.
- **Why:** Records the confirmed archive requirements.
- **Evidence:** Q-017, Q-018, Q-019 and owner confirmation in chat
- **Source:** user · confidence high
- **Confirmed:** 2026-11-20
