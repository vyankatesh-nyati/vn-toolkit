---
name: feature-workflow
description: Use when the user asks to build or implement a whole feature end-to-end — a ticket or request that spans requirements, design, planning, and implementation — rather than a single isolated edit or a question you already understand. This is the orchestrator: it runs the gated feature pipeline that chains the requirement, context, clarification, acceptance-criteria, solution-exploration, planning, review, and implementation sub-skills, stopping at hard approval gates. Trigger keywords: build feature, implement feature, feature end-to-end, feature workflow, take this ticket and build it, whole feature from scratch. Do not trigger for a lone bug fix, a one-line change, or a plain question.
---

# Feature Workflow

## Overview

The orchestrator for building a feature from raw requirement to committed code. It runs a fixed pipeline of sub-skills separated by **hard gates** — points where you STOP and wait for the user. The value is the gates, not the steps: skip a gate and you build the wrong thing fast.

**Core principle: understanding comes from CODE, never from tickets. No production code without an explicit user go-ahead.**

## When to use / when NOT

**Use when** a request spans requirements → design → planning → implementation (a whole feature, a ticket "build this end-to-end").

**Do NOT use for** a single isolated edit, a bug you already understand, or a question. Those go straight to the relevant sub-skill or a direct fix.

## The pipeline (ordered — do not reorder or skip)

Invoke the named sub-skill at each step by bare name. The step 9–10 review skills are **pluggable**: if the named skill is not available, note it and continue — never block on an absent skill.

1. **structuring-requirements** — turn the raw ask into a structured requirement.
2. **exploring-project-context** — ground in the actual codebase. Verify every named symbol exists; if a ticket names a class/method, confirm it in code before trusting it.
3. **clarifying-requirements** — ask open questions ONE at a time, end-to-end, until the requirement is unambiguous.
4. **Never assume silently.** Any assumption you must make is written in **bold** and confirmed by the user before it feeds a later step.
5. **writing-acceptance-criteria** — Given/When/Then plus edge cases. Write the AC doc under `docs/` (see Docs rule).
6. **exploring-solutions** — explore options in parallel; propose 2–3 with a recommendation and trade-offs. **GATE:** the user picks one solution before you plan it.
7. **writing-vertical-plans** — vertical plan (per-layer NEW/CHANGED/REUSE/UNCHANGED tree) for the chosen solution.
8. **writing-horizontal-plans** — horizontal plan: bottom-up TDD steps, one compiling commit per concern.
9. **Test-review loop** — if writing-tests is available, invoke it to review the horizontal plan; apply its feedback; **repeat until it returns no findings.** Skip gracefully if absent.
10. **New-tech-review loop** — if using-new-technology is available, invoke it to review the plan; apply feedback; **repeat until no findings.** Skip gracefully if absent.
11. **Write the final plan** to a doc under `docs/` and **WAIT for explicit user approval. HARD GATE — do not proceed on silence or a vague "looks good"-adjacent reply; get an unambiguous go-ahead.**
12. **Implement via TDD only after the go-ahead.** Per horizontal step: RED (failing test) → GREEN (make it pass) → format → commit. **Local commits only. Never push without an explicit user word.**

## Gates (STOP and wait for the user)

| After step | Gate | What you need |
|---|---|---|
| 5 | AC written | User confirms the AC and any **bold** assumptions |
| 6 | Solution chosen | User picks ONE of the proposed options |
| 7 | Vertical plan | User approves the surface-area map |
| 8 | Horizontal plan | User approves the step sequence |
| 11 | Final plan | Explicit go-ahead before ANY production code |
| 12 | Push | Explicit word before `git push` |

## Cross-cutting rules (apply at every step)

- **Derive from code, not tickets/notes.** Ticket tech-notes, named symbols, and test-case lists are unverified hints — confirm each against the codebase yourself.
- **No silent assumptions.** Flag each in **bold** and get confirmation.
- **Docs are scratch.** Everything the workflow writes goes under `docs/` and is **NEVER committed.** If the repo already tracks `docs/`, write under `docs/scratch/` instead.
- **No production code before the step-11 go-ahead.** Local commits only; never push unprompted.
- **Concise, code-first.** The reader can read code — show the load-bearing snippet, don't narrate it.

## Example

> User: "Take PLATO-XXXX and build the line-lock reinstate feature end-to-end."

1–2. Structure the ask; open the code and confirm the lock entities/selectors the ticket names actually exist.
3–4. "The ticket says region-aware — should CA follow UK or US rules?" (one question, wait). Unresolved: **Assumption: CA reuses the UK lock strategy — confirm?**
5. Write `docs/scratch/plato-xxxx-ac.md` with Given/When/Then. → GATE: user confirms.
6. Propose 3 solutions (new strategy vs. extend selector vs. gate at controller) with trade-offs; recommend one. → GATE: user picks.
7–8. Vertical plan, then horizontal TDD steps.
9–10. Run the writing-tests review on the plan (loop to clean); using-new-technology unavailable → note and continue.
11. Write `docs/scratch/plato-xxxx-plan.md`. → HARD GATE: wait for explicit approval.
12. Only then: per step RED → GREEN → `./gradlew spotlessApply` → local commit. No push until told.

## Common mistakes

| Mistake | Fix |
|---|---|
| Trusting a symbol named in the ticket | Verify it in code (exploring-project-context) first |
| Batching clarifying questions | One at a time, end-to-end (clarifying-requirements) |
| Silent assumption baked into the plan | Write it in **bold**, get confirmation |
| Committing the AC/plan docs | `docs/` is scratch — never commit; use `docs/scratch/` if tracked |
| Writing production code before step 11 | No code without an explicit go-ahead |
| One test-review pass | Loop steps 9–10 until zero findings |
| Blocking because a review skill is missing | Steps 9–10 are pluggable — note absence, continue |
| Pushing after implementing | Local commits only; push needs an explicit word |
| Skipping straight to horizontal plan | Vertical plan first — surface area before sequence |

## Checklist

- [ ] Requirement structured and grounded in real code
- [ ] Questions asked one at a time; all assumptions **bold** + confirmed
- [ ] AC doc under `docs/` (never committed); gate cleared
- [ ] 2–3 solutions proposed; user picked one
- [ ] Vertical then horizontal plan; each gate cleared
- [ ] Test-review and new-tech-review loops run to zero findings (or noted absent)
- [ ] Final plan doc under `docs/`; explicit approval received
- [ ] Implemented TDD (RED→GREEN→format→commit); local only; no push without the word
