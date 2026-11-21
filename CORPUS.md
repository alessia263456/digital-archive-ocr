# Document Corpus

Live acceptance uses 30 test documents generated from about 10 distinct templates supplied by the Secretar Notarial. The corpus excludes official Notary Cabinet documents. The Secretar Notarial runs five acceptance searches in the live deployment, with results recorded in `INTERVIEW.md`. See [D-036](docs/agents/decisions/archive-workflows.md#d-036--live-acceptance-corpus).

## Inventory

On 2026-11-21 the owner confirmed that all ten documents below use synthetic data, including the handwritten names and Signatory Party signatures. The descriptions and fixture selections are based on the owner's itemized handoff. Acceptance runs are pending.

| Test reference | Document type or subtype | Format | Quality or handwriting | Acceptance coverage |
|---|---|---|---|---|
| TEST-001 | Procură radiere auto | Scanned PDF | 2 pages, slight rotation, yellowish tint | Name, CNP, address, identity-card series and number, vehicle registration number, vehicle identification number, registration certificate. P22-06b rotated multipage fixture. |
| TEST-002 | Procură radiere auto | Scanned PDF | 2 pages, slight rotation, noise, low resolution, handwritten name | Name, CNP, address, identity-card series and number, vehicle registration number, vehicle identification number, registration certificate, handwritten name and Signatory Party signature. P22-08 OCR word placement and P22-09a Redaction. |
| TEST-003 | Procură radiere auto – duplicat | PDF | 2 pages, high-quality original PDF | Name, CNP, address, identity-card series and number, vehicle registration number, vehicle identification number, registration certificate. P22-09b candidate pending verification of extractable text. |
| TEST-004 | Procură radiere auto | Scanned PDF | 2 pages, high-quality scan | Name, CNP, address, identity-card series and number, vehicle registration number, vehicle identification number, registration certificate. P22-08 clear-scan comparison. |
| TEST-005 | Contract vânzare-cumpărare auto | DOCX | 4 pages, high-quality original DOCX | Name, CNP, addresses, identity-card details, marriage certificate number, CNARNN Infonot extract, IBAN, bank name, vehicle registration certificate series, registration number, chassis number, type-approval number. P22-07 DOCX conversion. |
| TEST-006 | Contract comodat | Scanned PDF | 3 pages, high-quality scan | Names, CNP, addresses, vehicle type-approval number, vehicle identity-card series, registration certificate, vehicle registration number, Signatory Party signatures. |
| TEST-007 | Contract comodat | Scanned PDF | 3 pages, high-quality scan | Names, CNP, addresses, vehicle type-approval number, vehicle identity-card series, registration certificate, vehicle registration number, Signatory Party signatures. |
| TEST-008 | Contract comodat | Scanned PDF | 3 pages, high-quality scan | Names, CNP, addresses, vehicle type-approval number, vehicle identity-card series, registration certificate, vehicle registration number. |
| TEST-009 | Contract vânzare-cumpărare | Scanned PDF | 4 pages, slight rotation, visible borders | Names, CNP, addresses, identity-card details, land details, land-book number, cadastral number, adjoining properties, land-book extract, tax clearance certificate, marriage certificate, CNARNN extract. |
| TEST-010 | Contract vânzare-cumpărare | Scanned PDF | 5 pages, slight rotation, low quality | Names, CNP, addresses, identity-card details, land details, land-book number, cadastral number, adjoining properties, land-book extract, tax clearance certificate, marriage certificate, CNARNN extract, IBAN. |

For P22-06a, the first batch supplies PDF input. The separate synthetic renderer fixtures are listed below. For P22-09b, verify that text can be extracted from the target region of TEST-003 before using it to check for residual text after Redaction.


## Synthetic renderer fixtures

These repository fixtures exercise P22-06a independently of live acceptance.

| Input | Source and expected result |
|---|---|
| [Single-page PDF](backend/tests/Fixtures/rendering/mark.pdf) | A drawn black rectangle on a 72 × 144 point page. At 300 dpi the output is 300 × 600 pixels. |
| [JPG](backend/tests/Fixtures/rendering/romanian.jpg) and [PNG](backend/tests/Fixtures/rendering/romanian.png) | JPEG encoding and unchanged copy of the [Romanian OCR smoke image](docker/ocr-worker/smoke/romanian.png). Both render at 1000 × 160 pixels. |
| [Ordering PDF](backend/tests/Fixtures/rendering/ordering.pdf) | Twelve synthetic pages to exercise numeric order across 9 and 10 and cumulative limits. TEST-001 remains the geometry acceptance fixture for P22-06b. |
