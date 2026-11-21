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

For P22-06a, the first batch supplies PDF input. The single-page PDF, standalone JPG and PNG fixtures still need references. For P22-09b, verify that text can be extracted from the target region of TEST-003 before using it to check for residual text after Redaction.
