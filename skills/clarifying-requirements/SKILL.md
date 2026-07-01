---
name: clarifying-requirements
description: Use when a feature request is understood at a high level but still has open questions that would block an end-to-end implementation, and before writing acceptance criteria. Drives a one-question-at-a-time clarification loop whose hard rule is to never make a silent assumption: any unavoidable assumption is written down and confirmed by the user, not guessed. Keywords: clarify requirements, open questions, ambiguity, unknowns, assumptions, edge cases, scope, error handling, what happens when, requirement gaps, before acceptance criteria.
---

## Overview

Core principle: **you may not implement on top of a guess.** Every gap in the request is either answered by the user or written down as a bold, flagged assumption the user confirms. Silent assumptions are the failure mode this skill exists to prevent.

This runs after project context is understood (exploring-project-context) and before acceptance criteria are written (writing-acceptance-criteria).

## When to use / when NOT

Use when:
- The request is clear in intent but has unknowns that would change the implementation.
- You caught yourself about to pick a default ("I'll just assume it soft-deletes").

Do NOT use when:
- The request is already fully specified and every branch is pinned — go straight to writing-acceptance-criteria.
- The unknown is about *how the code works today* — that is a code question; answer it yourself by reading code (LSP), not by asking the user.

## How

1. **Ground first, ask second.** Before asking anything, read the relevant code to confirm named symbols exist and to learn what the codebase already answers. Never ask a question the code already answers; never trust a symbol from a ticket without verifying it in code.
2. **Enumerate gaps across every dimension** — purpose (why / who benefits), behavior (happy path + every branch), data (shape, source, validation, defaults, nullability), error handling (invalid input, missing data, downstream failure), boundaries (scope in/out, affected callers, regions, permissions), non-functional (performance, concurrency, migration, backward compatibility, observability).
3. **Ask ONE question at a time.** Prefer multiple-choice — offer concrete, code-grounded options plus "other". Wait for the answer before the next question. Order by blocking impact: a question whose answer reshapes later questions goes first.
4. **When you must assume to keep moving, do not go silent.** State the assumption in **bold**, give your reasoning in one line, and ask the user to confirm or correct. An unconfirmed assumption is not an answer.
5. **Record answers as you go** under `docs/` (or `docs/scratch/` if the repo already tracks `docs/`) — never committed. This becomes the input to acceptance criteria.
6. **Terminal state:** every dimension is either answered or has a confirmed bold assumption, and you could implement end-to-end without another guess. Then hand off to writing-acceptance-criteria.

## Example

Request: "Add an endpoint to archive a campaign line."

> Code check first (LSP): `CampaignLine` has no `archived` field; `CampaignLineController` has `delete` but no `archive`.
>
> **Q1 — What does "archive" do to the line's data?**
> a) Soft flag: add `archived: boolean`, line stays queryable and excluded from default lists
> b) Move to a separate collection / status enum value
> c) Same as existing `delete` but reversible
> d) Other — describe
>
> (waits for answer, then asks Q2 about who may archive, then Q3 about archiving a line on a locked campaign, etc.)

If the user says "just do the sensible thing" for region behavior:

> **Assumption: archive applies in all four regions (UK/US/CA/IRL) with identical behavior**, since the line schema is region-agnostic here. Confirm, or name a region that differs?

## Common mistakes

| Mistake | Do instead |
|---|---|
| Picking a default silently | State it as a **bold** assumption and ask to confirm |
| Batching several questions in one message | One question at a time, blocking ones first |
| Open-ended "how should this work?" | Multiple-choice with code-grounded options + "other" |
| Asking what the code already tells you | Read the code (LSP), only ask genuine unknowns |
| Trusting a symbol/flow named in the ticket | Verify it exists in code before building on it |
| Committing the Q&A notes | Keep under `docs/` (or `docs/scratch/`), never commit |
| Stopping while a branch is undefined | Every branch answered or confirmed-assumed before handoff |

## Checklist

- [ ] Read the relevant code; verified named symbols exist
- [ ] Gaps enumerated across purpose, behavior, data, errors, boundaries, non-functional
- [ ] Asked one question at a time, multiple-choice where possible
- [ ] Every unavoidable assumption written in **bold** and confirmed by the user
- [ ] Zero silent assumptions remain
- [ ] Answers recorded under `docs/` (uncommitted)
- [ ] Enough certainty to write acceptance criteria end-to-end → writing-acceptance-criteria
