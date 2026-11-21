# Plan — Day 1 · P22-49a · Inventory the first Document Corpus batch

**Approved on 2026-11-20.** The owner supplied and confirmed the [first ten entries](../../../CORPUS.md#inventory) on 2026-11-21.

## Size

S · One documentation task, provisionally 60 minutes once the owner supplies the first batch details. P22-49a is the last unchecked Day 1 task.

## Approach

Reuse the five-column inventory in [CORPUS.md](../../../CORPUS.md), with one row per verified synthetic test document. The owner reports about 15 prepared variants, but the inventory has no itemized handoff. Record the observed batch size and use the acceptance coverage column for PII categories and downstream fixture assignments.

**Input needed from the owner.** Which prepared variants are available, and can you provide their non-personal inventory details or identify the synthetic copies available for review? For each variant, identify its test reference, type or subtype, format, quality, handwriting and PII categories, and confirm that identifying values have been replaced. Supply only synthetic copies or non-personal descriptions.

## Files

| Action after approval | Path | Change |
|---|---|---|
| Update | [CORPUS.md](../../../CORPUS.md) | Enter verified rows, map representative references to P22-06 through P22-09, and identify missing examples. |
| Update | [Task checklist](p22-task-checklist.md) | Record the count, verification evidence, timing and blockers. Mark P22-49a complete once its checks pass. |

## Tests

| # | Verification after approval | Method |
|---|---|---|
| 1 | Each listed reference is unique and corresponds to one prepared test document. | Manually reconcile rows against the owner's itemized handoff. |
| 2 | Every included document uses synthetic identifying values. Rows describe quality, handwriting and PII by category. | Review each synthetic copy or obtain the owner's per-item verification. Withhold uncertain items and record the coverage gap. |
| 3 | A builder can identify the fixture for each downstream check. | Read back the selected references for PDF/JPG/PNG rendering, multipage and rotated geometry (06), DOCX conversion (07), Romanian text and word placement (08), and visual Redaction including a text-layer PDF (09). Flag any missing case for follow-up. |
| 4 | Documentation and Ledger checks pass. | Run `git diff --check` and `python3 docs/agents/tools/ledger-lint.py`. PHPUnit and Playwright have no changed Application behaviour to exercise. |

## Sequencing

One builder. Obtain the itemized handoff, verify the rows, select fixtures by reference, then reconcile the checklist.

## Risks

Several variants may share a template. Count each verified document once and retain separate references. If a fixture characteristic cannot be verified, record what is missing and keep the dependent check pending.

## Out of scope

P22-49b completes the 30-document inventory and tags the five Redaction cases and search candidates. Conversion, OCR Extraction, Redaction execution, live acceptance searches and committing document binaries fall outside P22-49a.

## Knowledge used

| Entry | What it says | Why it applies | Owner call |
|---|---|---|---|
| [D-036](../decisions/archive-workflows.md#d-036--live-acceptance-corpus) | Live acceptance uses 30 test documents from about 10 Secretar Notarial templates and excludes official Notary Cabinet documents. | Defines what counts as a corpus entry and resolves the roadmap's older “30 templates” wording. | Confirm / wrong / outdated |

### Considered, not applied

- PATTERN-001 concerns PostgreSQL migration tests. No contract or open Ledger question governs this inventory.
- For awareness only, the [P22-04 handoff](p22-task-checklist.md#day-1--start-the-stack-and-take-delivery-of-the-corpus) records an approximate count. The exact batch size and coverage depend on item-level evidence.

### Assumptions

No minimum first-batch size is specified. Approval covers the verified documents available at handoff.
