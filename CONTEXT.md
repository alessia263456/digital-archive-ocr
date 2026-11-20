# CONTEXT — proiect1 vocabulary

<!-- graffino-agentic:begin v1 -->
> The approved terms for this project. Use each term exactly as defined, in the part
> of speech given. Never swap in a synonym; never use a word on an _Avoid_ line.
<!-- graffino-agentic:end -->

**Application** (noun) — The `proiect1` visual web system and its runnable components.
_Avoid_: app, program, software, project.

**Screen** (noun) — A top-level page or distinct view presented to the user in the browser.
_Avoid_: view, webpage, page, window.

**Component** (noun) — A reusable user interface element rendered within one or more screens.
_Avoid_: widget, partial, snippet.

**Design Token** (noun) — A named visual style value (color, spacing, typography, radius, shadow) defined in the design system.
_Avoid_: variable, style, constant, magic number.

**Ledger** (noun) — The structured documentation files in `docs/agents/` recording decisions, patterns, contracts, and open questions.
_Avoid_: knowledge base, wiki, notes.

**Notary Cabinet** (noun) — The specific notary office organization (*Cabinet Individual Notarial* / *Birou Individual Notarial*) whose paper records constitute the digital archive corpus.
_Avoid_: law firm, office, agency, bureau, client.

**Notarial Act** (noun) — An authenticated legal document issued by the notary cabinet (e.g., contract, power of attorney, declaration, succession certificate).
_Avoid_: deed, paper, file, instrument, legal paper.

**Notary Public** (noun) — The certified legal official (*Notar Public*) whose name, title, and signature appear on notarial acts and are exempt from PII redaction.
_Avoid_: notary, lawyer, public official, signing officer.

**Signatory Party** (noun) — An individual identified in a notarial act whose name, contact details, CNP, address, identity-card details, IBAN, and signature are subject to PII detection and Redaction.
_Avoid_: party, client, subject, individual, signer.

**Authentication Conclusion** (noun) — The formal concluding section of a Romanian notarial act (*Încheiere de Autentificare*) containing the act number, registration date, and notary certification.
_Avoid_: conclusion, closing, certification, seal.

**Notarial Nomenclature** (noun) — The statutory archival retention schedule (*Nomenclator Arhivistic Notarial*) defining mandatory preservation periods per notarial act category.
_Avoid_: retention list, schedule, retention table, document categories.

**Act Date** (noun) — The official execution or authentication date stated within a Notarial Act. Staff confirm it before saving. It determines the Retention Computation Base for categories that use the Act Date.
_Avoid_: creation date, document date, file date, upload date.

**Document Scan** (noun) — An uploaded document in PDF, JPG, PNG, or DOCX format. The Application preserves the DOCX original and derives a PDF.
_Avoid_: scan, file, upload, photo.

**OCR Extraction** (noun) — The optical character recognition process extracting text and TSV bounding-box layout from a document scan.
_Avoid_: OCRing, scanning, text reading.

**Bounding Box** (noun) — The pixel coordinates (left, top, width, height) of an OCR-extracted word or redaction area on a document scan.
_Avoid_: box, rect, coordinates, zone.

**Notarial Context Anchor** (noun) — A Romanian legal phrase (e.g., subsemnatul, numitul, domiciliat în, identificat prin CI) indicating adjacent personal data.
_Avoid_: trigger word, keyword, cue.

**Anonymization** (noun) — The workflow that detects and scores sensitive information, requires explicit human review, and produces an approved redacted copy.
_Avoid_: masking, blurring, privacy filtering.

**Redaction** (noun) — The permanent pixel-level burning of solid black boxes onto a scan copy and masking of corresponding text.
_Avoid_: blurring, blacking out, hiding.

**Human Review Queue** (noun) — The workflow queue for documents awaiting mandatory PII review by `admin` or `arhivar`.
_Avoid_: moderation queue, approval list, pending tasks.

**Document Version** (noun) — An immutable approved snapshot of the underlying document file. After initial approval, a file replacement, file update, or approved corrected redacted PDF creates a new Document Version. An approved OCR-only correction reindexes the same Document Version and is audited. Metadata changes are recorded in the Append-Only Audit Log. Only the latest approved Document Version is indexed. Earlier versions are available to `admin` and `arhivar` through version history.
_Avoid_: revision, copy, history entry.

**Folder Permission** (noun) — An access control rule assigned by Physical Dossier for `cititor` and applied in all browsing modes. Access is denied by default. An individual permission takes precedence over a role permission.
_Avoid_: folder right, access rule, privilege.

**Retention Policy** (noun) — An automated schedule governing document preservation duration and archival or deletion criteria.
_Avoid_: deletion rule, lifecycle, expiry.

**Role: Arhivar** (noun) — The archive role used by Arhivar and Secretar Notarial, with unrestricted dossier access and authority to review uploads, approve Redaction, and create or revoke Share Links.
_Avoid_: archivist, moderator, editor.

**Role: Cititor** (noun) — A role for other internal staff and interns, with access to approved anonymized Document Scans and redacted search text in explicitly granted Physical Dossiers.
_Avoid_: viewer, reader, user, guest.

**Signed URL** (noun) — A time-limited, cryptographically signed URL providing secure temporary access to a document file in object storage.
_Avoid_: temporary link, share link, direct link, public URL.

**Append-Only Audit Log** (noun) — An immutable, tamper-evident log of document access, views, downloads, exports, modifications, Share Link creation and use, and destruction. It retains prior access events, the person who confirmed destruction, the act number, Act Date, document type, Physical Dossier Number, and Signatory Party names indefinitely after destruction. Both `admin` and `arhivar` can see the retained evidence.
_Avoid_: access log, audit trail, activity history, history.

**Quarantine Queue** (noun) — An isolated queue holding corrupted or unreadable document scans that failed OCR processing after the initial failure and three failed retries.
_Avoid_: dead-letter queue, error list, failed jobs, poison queue.

**Possible Duplicate** (noun) — A Document Scan whose act number and Act Date both match an existing document. An exact SHA-256 match has a separate warning and blocks saving.
_Avoid_: near-duplicate, similar document, duplicate text.

**Role: Secretar Notarial** (noun) — The notary cabinet administrative staff member (*Secretar Notarial*) responsible for daily registration of acts, compilation of the alphabetical index, and physical dossier retrieval.
_Avoid_: secretary, clerk, assistant, front desk staff.

**Physical Dossier Number** (noun) — The physical folder identifier (*Număr de Dosar*, e.g., `Dosar nr. 29/2014`) written on the physical dossier spine in the cabinet archive and displayed in the application to guide physical retrieval.
_Avoid_: folder code, shelf number, physical ID, file number.

**Archival Indicator** (noun) — The classification code (*Indicativ Arhivistic*, e.g., `IA 1`, `IA 17`, `IB 4`) defined in the Notarial Nomenclature assigned from a document’s type, subtype, and Storage Context. The classification can be corrected and governs retention and archival rules.
_Avoid_: category code, archive code, class code, tag, indicativ.

**Alphabetical Index** (noun) — The annual registry (*Opis Alfabetic*) compiled by notarial staff organized by initial of party names mapping signatories to act and physical dossier numbers.
_Avoid_: index book, name index, registry list, party index.

**Daily Notarial Register** (noun) — The formal chronological register (*Registru General*) where daily notarial acts, parties, act numbers, inventory numbers, and archival indicators are recorded.
_Avoid_: day log, daily book, journal, daily notes.

**Inventory Number** (noun) — The official archival inventory identifier (*Număr de Inventar*, e.g., `29/2014`) assigned to a completed dossier or register volume.
_Avoid_: inventory code, archive ID, item number, catalog number.

**Selection Commission** (noun) — The statutory cabinet committee (*Comisia de Selecționare* / `C.S.`) comprising the notary public, archivist, and secretary that reviews expired acts with `C.S.` notation to recommend retention extension or scrapping.
_Avoid_: disposal committee, review board, retention panel, selection team.

**Storage Context** (noun) — The specific archival placement category (*Context Arhivare*) prescribed by the Notarial Nomenclature (e.g., standalone act, permanent binder / mapă permanentă, succession dossier, divorce dossier).
_Avoid_: filing location, binder type, archive zone, placement.

**Retention Computation Base** (noun) — The statutory starting event (*De când curge timpul*) from which a retention duration is calculated (e.g., January 1st of the year following execution, contract expiration date, dossier resolution date, or deposit release date).
_Avoid_: calculation date, trigger date, start time, retention base.

**Permanent Preservation** (noun) — The indefinite archival retention status (`P`) indicating that a notarial act, permanent binder, or official register must never be destroyed.
_Avoid_: forever retention, infinite storage, permanent file, eternal archive.

**Cadastral Identifier** (noun) — Real estate identification data (*Număr Cadastral*, *Număr Carte Funciară*) appearing in notarial property acts. Flag it for Redaction and exclude the redacted value from `cititor` search.
_Avoid_: land ID, property number, lot number, plot ID.

**Movable Asset Identifier** (noun) — Vehicle identification details (VIN / chassis number, license plate) appearing in notarial powers of attorney and sale contracts. Flag it for Redaction and exclude the redacted value from `cititor` search.
_Avoid_: car ID, vehicle data, auto number, chassis data.

**Document Corpus** (noun) — The 30 test documents generated from about 10 distinct templates supplied by the Secretar Notarial for live acceptance.
_Avoid_: test set, sample documents, demo files, dataset.

**Share Link** (noun) — A Signed URL created by `admin` or `arhivar` that lets a recipient view and download the selected original or redacted PDF of one Document Version. It expires, can be password-protected, and can be revoked by either role.
_Avoid_: public link, download link, sharing URL, external link.

**Destruction List** (noun) — The in-application list of documents whose retention period has expired, grouped by C.S. status for manual batch confirmation by `admin`. Confirming destruction deletes the Document Scan and all Document Versions.
_Avoid_: deletion list, expired documents, documents to destroy, purge list.
