# Plan — P22-01 · Container and Romanian OCR smoke

**Status:** Draft. Awaiting build approval.

## Size

S · 90-minute roadmap checkpoint. One Docker Compose worker, one synthetic PNG, and one repeatable integration check. [Day 1 roadmap](p22-14-day-roadmap.md#day-1--start-the-stack-and-take-delivery-of-the-corpus)

## Approach

Build a minimal Debian-based worker image with Tesseract, standard language data, and `tesseract-ocr-ron`. Run it as a one-shot Compose service with a checked-in PNG containing synthetic Romanian text that exercises `ă`, `â`, `î`, `ș`, and `ț`. Use the image’s shell and `awk` to validate the TSV header, recognized words, and Bounding Boxes. The repository has no existing Compose service or OCR implementation to reuse, so the approved OCR Extraction architecture is the starting point. [Architecture](../ARCHITECTURE.md)

## Files

| Action | Path | What |
|---|---|---|
| Add | `compose.yaml` | Define the `ocr-worker` service with no exposed ports. |
| Add | `docker/ocr-worker/Dockerfile` | Build the worker image with Tesseract and Romanian language data. |
| Add | `docker/ocr-worker/smoke/romanian.png` | Provide a small, legible fixture with synthetic text. |
| Add | `docker/ocr-worker/smoke/check.sh` | Run Tesseract with `-l ron` and TSV output. Exit nonzero with a clear diagnostic when a check fails. |
| Update | `AGENTS.md`, `README.md`, `docs/agents/ARCHITECTURE.md` | Document the smoke command and the worker that exists after this task. |
| Update | `docs/agents/plans/p22-task-checklist.md`, `AI_LOG.md` | Record verification evidence, elapsed time, blockers, and AI use. |

## Tests

| # | Behaviour | Test |
|---|---|---|
| 1 | Compose resolves the service and builds the image. | `docker compose config --quiet` and `docker compose build ocr-worker` · integration |
| 2 | The image lists `ron`, and OCR returns the expected Romanian words with diacritics. | `docker compose run --rm ocr-worker` · integration |
| 3 | The TSV has the expected header and at least one recognized word. Each recognized word has nonnegative `left` and `top`, positive `width` and `height`, and a Bounding Box inside the fixture. | Same smoke command · integration |
| 4 | The check returns a failure when an expected word is missing or a Bounding Box is invalid. | Exercise the validator with altered TSV during verification. |
| 5 | The Ledger passes validation. | `python3 docs/agents/tools/ledger-lint.py` |

## Sequencing

One builder. Write the fixture and smoke assertions first, then add the worker image and Compose service. Run the checks and record the results before closing the task.

## Risks

- `docker compose version` failed during planning with `WSL (2 - ) ERROR: UtilBindVsockAnyPort:317: socket failed 1`. The build needs a working Docker runtime. If the error persists, record the blocker and leave the integration checks pending.
- OCR can vary with package versions and typography. Use high-contrast fixture text, record the Tesseract version in the verification evidence, and check the expected words without requiring exact pixel coordinates.

## Out of scope

Laravel, PostgreSQL, and PHPUnit scaffolding belong to P22-02. Queue processing, document conversion, Redaction, Screens, corpus handoff, and deployment are separate tasks. No provided contract or consumer implementation is affected.

## Knowledge used

**Previously confirmed and unchanged:** D-001 (Docker for server-side services), D-004 (Tesseract with Romanian language data and TSV word Bounding Boxes).

| Entry | What it says | Why it applies | Call |
|---|---|---|---|
| Q-001 | Server-side services run in Docker. Recorded in D-001. | Sets where the worker runs. | Confirm |
| Q-005 | Tesseract runs in Docker with `tesseract-ocr-ron` and emits TSV word coordinates. Recorded in D-004. | Sets the smoke test’s acceptance criteria. | Confirm |

### Considered, not applied

- **D-003** governs PHPUnit for the Laravel backend. This task uses a container integration check, and P22-02 introduces PHPUnit.
- **D-006** governs Playwright verification for Screens. This task has no Screen changes.

### Assumptions

No unresolved requirement blocks the plan. The Debian base, fixture wording, and shell validator are proposed implementation choices for this task.
