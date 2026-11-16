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

**Notary Cabinet** (noun) — The specific notary office organization (*Cabinet Individual Notarial*) whose paper records constitute the digital archive corpus.
_Avoid_: law firm, office, agency, bureau, client.

**Notarial Act** (noun) — An authenticated legal document issued by the notary cabinet (e.g., contract, power of attorney, declaration, succession certificate).
_Avoid_: deed, paper, file, instrument, legal paper.

**Notary Public** (noun) — The certified legal official (*Notar Public*) whose name, title, and signature appear on notarial acts and are exempt from PII redaction.
_Avoid_: notary, lawyer, public official, signing officer.

**Signatory Party** (noun) — An individual identified in a notarial act whose personal data (CNP, address, identity card, phone, IBAN) is subject to PII detection and redaction.
_Avoid_: party, client, subject, individual, signer.

**Authentication Conclusion** (noun) — The formal concluding section of a Romanian notarial act (*Încheiere de Autentificare*) containing the act number, registration date, and notary certification.
_Avoid_: conclusion, closing, certification, seal.

**Notarial Nomenclature** (noun) — The statutory archival retention schedule (*Nomenclator Arhivistic Notarial*) defining mandatory preservation periods per notarial act category.
_Avoid_: retention list, schedule, retention table, document categories.

**Act Date** (noun) — The official execution or authentication date stated within a notarial act, from which archival retention periods are calculated.
_Avoid_: creation date, document date, file date, upload date.

**Document Scan** (noun) — A digitized image or PDF file of a physical document uploaded to the archive.
_Avoid_: scan, file, upload, photo.

**OCR Extraction** (noun) — The optical character recognition process extracting text and TSV bounding-box layout from a document scan.
_Avoid_: OCRing, scanning, text reading.

**Bounding Box** (noun) — The pixel coordinates (left, top, width, height) of an OCR-extracted word or redaction area on a document scan.
_Avoid_: box, rect, coordinates, zone.

**Notarial Context Anchor** (noun) — A Romanian legal phrase (e.g., subsemnatul, numitul, domiciliat în, identificat prin CI) indicating adjacent personal data.
_Avoid_: trigger word, keyword, cue.

**Anonymization** (noun) — The automated detection, confidence scoring, and redaction of personally identifiable information within extracted text.
_Avoid_: masking, blurring, privacy filtering.

**Redaction** (noun) — The permanent pixel-level burning of solid black boxes onto a scan copy and masking of corresponding text.
_Avoid_: blurring, blacking out, hiding.

**Human Review Queue** (noun) — The workflow queue for medium-confidence or unvalidated PII detections awaiting manual archivist review.
_Avoid_: moderation queue, approval list, pending tasks.

**Document Version** (noun) — An immutable snapshot of a document scan, its metadata, and its OCR output at a point in time.
_Avoid_: revision, copy, history entry.

**Folder Permission** (noun) — An access control rule enforced at folder level governing access to contained documents.
_Avoid_: folder right, access rule, privilege.

**Retention Policy** (noun) — An automated schedule governing document preservation duration and archival or deletion criteria.
_Avoid_: deletion rule, lifecycle, expiry.

**Role: Arhivar** (noun) — An archive administrator authorized to view original scans, verify OCR output, and approve PII redactions.
_Avoid_: archivist, moderator, editor.

**Role: Cititor** (noun) — A standard reader role permitted to access only approved, anonymized document scans and redacted text.
_Avoid_: viewer, reader, user, guest.

**Signed URL** (noun) — A time-limited, cryptographically signed URL providing secure temporary access to a document file in object storage.
_Avoid_: temporary link, share link, direct link, public URL.

**Append-Only Audit Log** (noun) — An immutable, tamper-evident log capturing all document access, view, download, export, and modification events for GDPR compliance.
_Avoid_: access log, audit trail, activity history, history.

**Quarantine Queue** (noun) — An isolated queue holding corrupted or unreadable document scans that failed OCR processing after maximum retry attempts.
_Avoid_: dead-letter queue, error list, failed jobs, poison queue.

**Near-Duplicate** (noun) — A document scan whose extracted OCR text exhibits high textual similarity to an existing archived document.
_Avoid_: similar document, duplicate, duplicate text, copy.
