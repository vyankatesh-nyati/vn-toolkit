---
name: structuring-requirements
description: Use when a feature request arrives as a raw, vague, or one-line ask and needs to be restated as a structured brief before any exploration or design. Turns messy input into a crisp, confirmable brief capturing Goal, Actors, In-scope, Out-of-scope, Constraints, and Open unknowns — framing the problem without proposing solutions and surfacing every unknown for the user to confirm. Triggers: "structure this requirement", "what are we actually building", "frame this ticket", "restate the ask", messy or ambiguous requirements, kickoff of a new feature or story. This is the first step of the feature flow, feeding clarifying-requirements and exploring-project-context.
---

## Overview

Turn a raw, messy, or one-line requirement into a **structured brief the user can confirm in one read** — before any code exploration or solutioning. Frame the problem; do not solve it.

## When to use

- A feature/story arrives as a vague or one-line ask.
- You are about to start a feature and want a shared, confirmed understanding of scope.
- First step of the feature flow, feeding clarifying-requirements (unknowns) and exploring-project-context (grounding).

## When NOT to use

- The requirement is already a clean, scoped brief — skip ahead.
- You are choosing *how* to build it (that is exploring-solutions) or mapping *what changes where* (writing-vertical-plans). This skill never names files, APIs, or designs.

## How

Produce a brief with exactly these six sections. Keep each line tight.

1. **Goal** — one sentence, outcome-focused, in the user's language. What is true after this ships that is not true now.
2. **Actors / roles** — who triggers or consumes this (user roles, systems, jobs). If the source implies one, state it; do not invent new roles.
3. **In-scope** — the concrete behaviours this change delivers, as short bullets.
4. **Out-of-scope** — what a reader might reasonably assume is included but is *not*. This is where you kill scope creep early.
5. **Constraints** — hard limits stated or clearly implied (region, backward-compat, performance, data shape, auth). Only what is stated or strongly implied.
6. **Open unknowns** — every gap, ambiguity, or decision you cannot resolve from the source. These feed clarifying-requirements.

Rules that override any temptation to fill gaps:

- **Derive only from what is given, and from code — never from a ticket's prescribed solution.** Do not invent scope, actors, or constraints. If a source names a symbol, treat it as unverified until confirmed in code; the brief stays behaviour-level. If the raw ask does not say it, it is an unknown — not a fact.
- **NEVER make a silent assumption.** If you must assume something to write a line, write the line and flag the assumption in **bold**, e.g. **ASSUMPTION: applies to UK region only — confirm.**
- **Do not solutionize.** No file names, class names, endpoints, schemas, or "we'll add X". If you catch yourself naming code, move it to a later step.
- **Restate, don't expand.** The brief is a mirror of the ask, sharpened — not a bigger ask.
- Keep it confirmable: the user should be able to read it and reply "yes" or correct one line.

Any brief you write goes under `docs/` (or `docs/scratch/` if the repo already tracks `docs/`) and is **never committed**. This step produces no production code — pause for the user's explicit confirmation before moving on.

## Example

Raw ask: *"Let planners lock a campaign line so nobody edits it while trading is in flight."*

Structured brief:

- **Goal:** A planner can lock an individual campaign line so its details cannot be edited while it is being traded.
- **Actors:** Planner (locks/unlocks); any user attempting to edit a line (blocked).
- **In-scope:** Lock and unlock a single line; block edits to a locked line with a clear rejection.
- **Out-of-scope:** Locking a whole campaign; auto-unlock on trade completion; audit history of lock changes.
- **Constraints:** Must not change existing unlocked-line behaviour. **ASSUMPTION: applies to all regions — confirm.**
- **Open unknowns:** Who may unlock — only the locker, or any planner? What happens to in-flight edits when a lock is applied? Does the lock survive across trading state transitions?

## Common mistakes

| Mistake | Instead |
|---|---|
| Filling a gap with a guess stated as fact | Write it as an **Open unknown** or a **bold** flagged assumption |
| Naming files, classes, endpoints | Keep it behaviour-level; defer naming to planning steps |
| Widening the ask ("while we're at it…") | Restate only what was asked; extras go to Out-of-scope or a separate ask |
| Treating a ticket's tech notes or named symbols as truth | Ignore prescribed solutions; capture the *outcome* the ask implies |
| Empty Out-of-scope | Always name at least one plausible-but-excluded item to bound scope |
| Vague Goal ("improve locking") | One sentence, concrete, outcome-focused |

## Checklist

- [ ] Goal is one concrete, outcome-focused sentence.
- [ ] Actors, In-scope, Out-of-scope, Constraints, Open unknowns all present.
- [ ] Every gap is an Open unknown; every assumption is **bold** and flagged for confirmation.
- [ ] No file/class/endpoint/design detail anywhere; no unverified named symbol stated as fact.
- [ ] Nothing invented beyond the raw ask.
- [ ] Brief lives under `docs/` (or `docs/scratch/`), uncommitted.
- [ ] User asked to confirm or correct before moving to clarifying-requirements.
