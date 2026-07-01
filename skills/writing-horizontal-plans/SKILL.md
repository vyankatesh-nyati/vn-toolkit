---
name: writing-horizontal-plans
description: Produces a horizontal plan — the ordered, test-first build steps that sequence a multi-layer change into one compiling commit per concern. Use when the user asks for a "horizontal plan", "TDD steps", "implementation/execution order", "step-by-step plan", or how to sequence a change into commits. Takes a vertical plan (writing-vertical-plans) as its input.
---

# Writing Horizontal Plans

## Overview

A **horizontal plan** sequences a change into ordered, test-first build steps that cut across the layers. It captures the *order of execution* — what to build first, as RED→GREEN→commit steps, one compiling concern at a time.

**Core principle:** each step is a full TDD micro-cycle ending in a commit that compiles on its own. The plan is executable: exact test cases, run command, and commit message per step.

**Scope:** this skill covers ONLY the horizontal (order) plan. For the WHAT/WHERE surface-area map it sequences, use the **writing-vertical-plans** skill — the two are companions (vertical = structure; horizontal = order).

**Input:** a horizontal plan is derived from a vertical plan's layers. If none exists yet, build one first (writing-vertical-plans), then order those layers into steps.

## When to use

- After a vertical plan exists and you need the build order.
- The user says "horizontal plan", "TDD steps", "execution/implementation order", "step-by-step", "how do I sequence this".

**When NOT to use:** you still need the surface-area map (use writing-vertical-plans); or a one-commit change with no ordering to decide.

## How to build the horizontal plan

**Order bottom-up** so each commit compiles and the next builds on it: the callee before its caller (interface/service before the aspect/controller that calls it; repository method before the service that uses it).

Each step is one TDD micro-cycle:

```
Step N — <one concern>
  RED   : <test file> — <named cases: happy + edges + guard/fallback + decision-branch edge>;  run → fails
  GREEN : <prod change>;                                                                        run → passes
  format/lint (e.g. spotlessApply);  commit "<id> | <message>"
```

Rules:
- **One concern per step, one commit.** Each commit compiles standalone (no step leaves the tree broken).
- **Name the test cases**, don't write "add tests" — list happy path, edge cases, the guard/fallback (empty/not-found), and any decision-branch edge (e.g. the mixed-type case that pins a rule).
- Give the **exact run command** and **commit message** so the step is executable.
- Build on existing commits; don't rewrite history unless asked.

## Example

```
Horizontal Plan (TDD) — new commits, bottom-up

Step 1 — service.checkByIds + selection
  RED   : CampaignLineLockServiceTest — routes intl when any line intl;
          routes domestic otherwise; mixed-type ⇒ intl (pins anyMatch);
          empty ids ⇒ no fetch; not-found ⇒ no-op
          → ./gradlew :core:unitTest --tests "*CampaignLineLockServiceTest"  (RED)
  GREEN : add checkByIds + inject repo  (GREEN)
  spotlessApply;  commit "TICKET | region-by-line-type line-lock check"

Step 2 — aspect branch  (builds on Step 1)
  RED   : LockAspectTest — no-campaignId method does NOT throw + delegates
          to checkByIds; campaignId-present still delegates to check(id,ids)
          → ./gradlew :core:unitTest --tests "*LockAspectTest"  (RED)
  GREEN : extractCampaignId → OptionalInt; ifPresentOrElse branch  (GREEN)
  spotlessApply;  commit "TICKET | derive campaignId-less checks from lineIds"

Step 3 — intTest (end-to-end)
  RED   : locked line via a no-campaignId endpoint ⇒ 400 <ERROR_CODE>;
          unlocked ⇒ not 400 (regression guard)
          → ./gradlew :core:intTest --tests "*LockControllerTest"  (RED)
  GREEN : (covered by Steps 1–2)
  commit "TICKET | intTest: campaignId-less endpoints enforce lock"
```

## Template

```
Horizontal Plan (TDD) — <goal>
Step 1 — <concern>            (bottom-most layer first)
  RED  : <test + named cases + run cmd>
  GREEN: <prod change + run cmd>
  <format>;  commit "<id> | <msg>"
Step 2 — <concern>  (builds on Step 1)
  ...
```

## Common mistakes

| Mistake | Fix |
|---|---|
| Steps ordered top-down (caller before callee) | Order bottom-up so each commit compiles. |
| A step spanning several concerns | Split — one concern, one compiling commit per step. |
| "Add tests" with no cases | Name cases: happy + edges + guard/fallback + decision-branch edge. |
| No run command or commit message | Include both — the step must be executable as written. |
| GREEN before RED (implement then test) | Write the failing test first each step. |
| A commit that leaves the tree not compiling | Reorder or fold the dependency into the same step. |
| Re-deriving what/where here | That's the vertical plan (writing-vertical-plans); reference it, don't repeat it. |

## Checklist

- [ ] Steps ordered bottom-up; every commit compiles standalone
- [ ] One concern per step, one commit
- [ ] Each step: RED (named cases incl edges + guard) before GREEN
- [ ] Exact run command + commit message per step
- [ ] Derived from a vertical plan's layers (writing-vertical-plans), not re-deriving what/where
