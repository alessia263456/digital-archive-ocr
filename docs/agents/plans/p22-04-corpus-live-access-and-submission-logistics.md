# Plan — Day 1, task 3 · P22-04 · Corpus, live access and submission logistics

**Status** — Owner approved the plan on 2026-11-20. Coordination is complete. See the [task checklist](p22-task-checklist.md).

## Size

**S** · Provisional 60-minute coordination timebox with no prerequisite task. P22-04 is the third item under Day 1. P22-03, the React and Playwright scaffold, is scheduled for Day 2. [Roadmap](p22-roadmap.md)

## Approach

Record the confirmed logistics under P22-04 in the existing task checklist. One person can collect the four confirmations together. An unanswered item stays open with its responsible role, blocker and next follow-up date.

| Item | Question for approval or follow-up | Acceptance check |
|---|---|---|
| Document Corpus handoff | What can the Secretar Notarial supply now, how will it be handed over, and when is the remainder expected? | Confirm the handoff method and dates with the supplier. Some test documents are ready, but the repository has no itemized inventory yet. [Corpus status](../../../CORPUS.md) |
| Live target and access | What is the intended live URL, who controls hosting and DNS, and is access available for P22-56a? | Record the target, responsible role and access status. Keep credentials out of the record. Deployment requires separate authorization. |
| Acceptance arrangements | When is the Secretar Notarial generally available to run the five live searches? | Record the availability window and cutoff. The owner will arrange the session and any rerun once the live Application is ready. |
| Course submission | Where and when is P22 due, in what format, and are there instructions beyond the brief? | Check against the course instructions or owner confirmation. Record the source, deadline, destination and required deliverables. [Course brief](../../brief.md) |

## Files after approval

Update the [task checklist](p22-task-checklist.md) with the answers and mark P22-04 complete once all four checks pass. Record the AI-assisted coordination in [AI_LOG.md](../../../AI_LOG.md). Corpus inventory belongs to P22-49a/b, deployment to P22-56a, and recording actual search results to P22-60.

## Verification and risk

Check the handoff, hosting access, acceptance arrangements and submission instructions by hand. Keep pending host access visible so the owner can continue preparing the Document Corpus while hosting is pending. PHPUnit and Playwright have no applicable behavior to exercise.

## Knowledge used

One previously confirmed decision applies unchanged. **D-036** specifies 30 test documents generated from about 10 Secretar Notarial templates, excludes official Notary Cabinet documents, and assigns the five live searches to the Secretar Notarial. The roadmap’s older “30 templates” wording conflicts with that decision. No pattern, contract or open Ledger question governs these logistics. [D-036](../decisions/archive-workflows.md#d-036--live-acceptance-corpus)
