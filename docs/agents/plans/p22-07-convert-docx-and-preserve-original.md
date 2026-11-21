# Plan — P22-07 · Convert DOCX and preserve the original

Approved for build on 2026-11-21.

## Size

M · One Laravel service, one container dependency, and a two-page integration check. Day 2 Task 4 has a provisional 75-minute timebox. P22-06a and P22-06b are complete. Planning started on clean, up-to-date `main`. [Roadmap](p22-roadmap.md#day-2--scaffold-react-and-prepare-document-input)

## Approach

Add a Laravel service that reads a preserved DOCX from a caller-supplied private Laravel disk and publishes the converted PDF under a distinct caller-supplied key on that disk. Use headless LibreOffice Writer in the existing Laravel container because it supplies DOCX pagination and PDF export locally. Follow the existing renderer’s direct-argument Symfony Process usage and reuse `DocumentPageRenderer::render` to prove that the derived PDF can produce ordered page images for OCR Extraction. A hosted converter would send Document Scans outside the Application, and a text-based PDF generator would require recreating Word layout. [LibreOffice command-line reference](https://help.libreoffice.org/latest/en-GB/text/shared/guide/start_parameters.html) · [Debian Writer package](https://packages.debian.org/bookworm/editors/libreoffice-writer-nogui)

Use a private local disk for this delivery. Require distinct, canonical relative keys in that disk and fail on destination conflicts. Stage a bounded copy of the source under a fixed DOCX filename and use a fresh private LibreOffice profile and output directory per invocation. Validate that the input is a Word OOXML package and the output is a readable, nonempty PDF before publishing it at the derived key. On the local disk, publish the complete derivative without replacing an existing artifact, including when two calls race. Report failures using Romanian service errors, clean up staging on success and failure, and preserve the original key and bytes throughout.

## Files

| Action | Path | What |
|---|---|---|
| Add | `backend/tests/Feature/DocxConversionServiceTest.php` | Test conversion with a private local disk, separate keys, original integrity, and rejection and recovery cases. |
| Add | `backend/tests/Fixtures/conversion/two-pages.docx` | Synthetic document with an explicit page break and distinct Romanian markers. |
| Add | `backend/app/Services/DocxConversionService.php` | Stage and convert the source, validate the result, and publish the derivative. |
| Edit | `docker/backend/Dockerfile` | Install the headless Writer package and a font covering Romanian diacritics. Include ZIP inspection support if required by the implementation. |
| Record results | `docs/agents/plans/p22-task-checklist.md` | Record original hash comparison, PDF page count, rendering result and any failed checks. Mark complete when acceptance passes. |

`backend/app/Services/DocumentPageRenderer.php` consumes the derived PDF through its existing input path. P22-11 introduces remote private storage and P22-12a/P22-13a introduce intake and worker integration. Those consumers have no implementation files at this stage. The Ledger contains no provided contract for this boundary.

## Tests

| # | Behaviour | Test (file · kind) | Not automated? Why |
|---|---|---|---|
| 1 | Conversion yields a readable two-page PDF at the derived key. Each PDF page contains its expected marker and the renderer produces two ordered PNGs. The original stays at its key with an identical SHA-256. | `DocxConversionServiceTest.php` · PHPUnit feature in Docker using real Writer and Poppler. | Automated. |
| 2 | Invalid, truncated or unsupported input fails without publishing a derivative. A valid conversion succeeds afterward. | Same file · PHPUnit feature. | Automated. |
| 3 | Aliased keys and existing destinations are rejected. A race for the same key leaves one complete derivative and preserves the source. | Same file · PHPUnit feature. | Automated. |
| 4 | Converter timeout or missing output surfaces a controlled failure, preserves the original, and releases staging. | Same file · PHPUnit feature with a controlled subprocess. | Automated. |
| 5 | Existing PDF and image rendering still passes and the images build. | Full backend PHPUnit suite, backend container build, frontend production build and Ledger lint. | Automated. Screenshot checks apply when a Screen changes. |

Acceptance evidence comes from the containerized two-page run. Record page count, page ordering, and the source hash comparison without logging document contents or internal source paths.

## Sequencing

One builder. Add the red PHPUnit cases and synthetic fixture first. Install the converter, implement the service, run the focused cases, then run the full backend suite and build checks. Record the acceptance results in the checklist.

## Risks

- Fonts and Writer import behaviour affect pagination. Use a known fallback font and an explicit page break in the fixture. If the representative document fails to paginate correctly, keep the original and report the discrepancy before completing the task.
- Writer can exit without a usable PDF or leave a subprocess running. Verify output independently of exit status, set a deadline and verify process termination and cleanup before reporting acceptance.
- DOCX packages may contain macros, external references or expensive content. Use disabled macro and external update behaviour, bounded conversion, private staging and no document-derived diagnostics in logs. Verify the converter under the container’s unprivileged user. Public or worker intake integration requires its own verification when wired.
- Local publication semantics do not carry over automatically to remote object storage. Verify the storage provider’s create-only operation in the storage integration before using remote keys as publish targets.

## Out of scope

Upload endpoints, remote object storage and Signed URLs, persistence of both keys in a database, OCR result persistence, queue retries, Redaction generation, viewing and Share Link delivery. This task proves the PDF artifact those flows will consume.

## Knowledge used

Six entries confirmed before, unchanged. [D-001, D-002, D-003, D-004 and D-018](../DECISIONS.md) and [D-028](../decisions/archive-workflows.md#d-028--docx-originals-and-derived-pdfs).

| Entry | What it says | Why it applies | Call |
|---|---|---|---|
| — | No unconfirmed entries relied on. | The approved scope covers the conversion service. | — |

### Considered, not applied

- PATTERN-003 · For awareness only. The renderer publishes an entire directory; the service publishes one complete PDF at a separate key. The candidate does not authorize a shared publisher.
- D-034 · Share Link access and lifecycle apply when the PDF is delivered. This task produces the artifact.

### Assumptions (no entry behind them)

- A private local Laravel disk is sufficient for the Day 2 demonstration of distinct object keys. The roadmap schedules remote private storage under P22-11. If approved as a lasting storage constraint, record it as a decision proposal.
- LibreOffice Writer is the proposed implementation dependency. The plan does not require Word-identical pagination for every template or set new user-facing upload limits. Validate runtime bounds during build against the existing renderer’s operating envelope.
