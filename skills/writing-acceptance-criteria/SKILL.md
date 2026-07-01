---
name: writing-acceptance-criteria
description: Use when a feature's requirements are settled and you need testable acceptance criteria before designing a solution or writing code — turning clarified scope into Given/When/Then scenarios grounded in actual code behavior, and proactively surfacing the edge cases the user is likely to have missed. Produces a reviewable acceptance-criteria document (happy path, alternate paths, a separate Edge cases section, and flagged assumptions). Triggers: "write acceptance criteria", "acceptance criteria", "AC", "Gherkin", "Given/When/Then", "define done", "definition of done", "what are the scenarios", "acceptance tests", "spec the behavior". Pairs with clarifying-requirements upstream and exploring-solutions downstream.
---

## Overview

Acceptance criteria are the observable, testable contract for "done": one Given/When/Then scenario per behavior, grounded in how the code actually behaves — never in ticket prose. Your value-add over the user is the **Edge cases** section: the scenarios they didn't think to ask for.

Core principle: **AC describe observable behavior, not implementation.** If a scenario can't be observed from outside — an API response, a persisted state, a UI change, an emitted event — it isn't acceptance criteria; it's a design note.

## When to use / when NOT

Use when requirements are clarified and you need the testable contract before designing the solution. Feeds exploring-solutions.

NOT for: designing the solution (exploring-solutions), listing what-changes-where (writing-vertical-plans), sequencing the build (writing-horizontal-plans), or writing the actual test code (writing-tests). AC are behavior specs — technology- and design-agnostic.

## How

1. **Ground in code, not the ticket.** Read the entry points, handlers, and state transitions the feature touches. Verify every symbol you name actually exists (LSP references/definition). Tickets and notes are hints, not truth — derive real behavior yourself.
2. **One scenario per behavior.** Write each as:
   - **Given** the starting state/context
   - **When** the trigger/action
   - **Then** the single observable outcome
   Split compound "and then… and then…" into separate scenarios. Keep each atomic and independently testable.
3. **Cover the happy path first**, then the alternate valid paths — each meaningfully different input class gets its own scenario.
4. **Then surface edge cases** in a clearly separated `## Edge cases` section — the proactive part. Write each as a G/W/T or a tight checklist item, and mine these categories against the actual code:
   - Empty / null / missing inputs; boundary values (0, 1, max, off-by-one)
   - Concurrency / duplicate / out-of-order events; idempotency and retries
   - Auth/permission and region/multi-tenant variants the code branches on
   - Failure & rollback: downstream error, partial write, validation reject
   - States the feature can't reach yet but the code allows (locked, deleted, optioned)
5. **Never make a silent assumption.** When you can't derive an expected outcome, write it as a **bold** assumption under `## Assumptions (confirm)` and flag it for the user — never quietly pick one.
6. **Write the doc to `docs/acceptance-criteria-<slug>.md`** (use `docs/scratch/` if `docs/` is already git-tracked). This doc is scratch: never commit it, never push. This step writes no production code.
7. **Return the doc for user review.** The reviewed AC feed exploring-solutions.

## Example

```markdown
# AC — Reinstate line-level lock (PLATO-12436)

## Happy path
**Scenario: locked line rejects an Evolve edit**
- Given a campaign line whose lock document exists for the caller's region
- When the caller POSTs an Evolve line edit
- Then the request is rejected with 409 and the line is unchanged

## Alternate paths
**Scenario: unlocked line accepts the edit**
- Given a campaign line with no lock document for that region
- When the caller POSTs an Evolve line edit
- Then the edit is applied and persisted

## Edge cases
**Lock exists for a different region**
- Given a lock document for region US and a caller in region UK
- When the caller edits the line
- Then the edit is allowed (lock is region-scoped)

- [ ] Lock document present but `_id` stored as String, not ObjectId → service cannot read it: does the guard fail open or closed? (see Assumptions)
- [ ] Two concurrent edits on the same locked line → both rejected, no partial write

## Assumptions (confirm)
- **A malformed lock document (String `_id`) is treated as "not locked" (fail-open).** Confirm — the alternative is fail-closed (reject on an unreadable lock).
```

## Common mistakes

| Mistake | Fix |
|---|---|
| Copying scenarios from the ticket's test-case list | Derive from code; verify each named symbol exists first |
| Compound Then ("…and updates X and emits Y") | One observable outcome per scenario; split the rest |
| AC that describe implementation ("calls `validateNotLocked`") | Describe the observable result, not the internal call |
| Only the happy path | The Edge cases section is the point — mine every category in step 4 |
| Guessing an outcome you couldn't derive | Write it as a **bold** assumption under Assumptions (confirm) |
| Committing or pushing the AC doc | `docs/` is scratch here — never commit, never push |

## Checklist

- [ ] Grounded in code; every named symbol verified to exist
- [ ] One atomic, observable G/W/T per behavior; happy path + alternate paths
- [ ] Separate `## Edge cases` section covering empty/boundary/concurrency/auth/failure/unreachable-state
- [ ] Every assumption in **bold** and listed under `## Assumptions (confirm)`
- [ ] Doc written under `docs/` (or `docs/scratch/`), not committed, not pushed
- [ ] No production code written this step
- [ ] Returned for user review before exploring-solutions
