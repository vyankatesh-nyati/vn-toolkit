---
name: exploring-solutions
description: Use when a requirement and its acceptance criteria are settled and the open question is HOW to build it — weighing several candidate approaches before committing to a design. Triggers: "how should we build this", "what are the options", "which approach", "compare designs", "trade-offs", "reuse vs build", "recommend an approach", picking an implementation strategy before planning. Reuse-first and YAGNI-oriented; grounds every option in the actual code. Precedes writing-vertical-plans. Not for clarifying requirements, not for writing the plan or tests, and not for exploring the codebase from scratch.
---

# Exploring Solutions

## Overview

Go broad before deep: enumerate several genuinely different ways to satisfy the requirement, then narrow to the 2-3 strongest with an explicit recommendation and per-option trade-offs. The strongest option usually reuses patterns and components the codebase already has. This is a terminal step — the user picks; the choice feeds writing-vertical-plans.

## When to use / when NOT

**Use when:** the WHAT is settled (requirement + acceptance criteria) and the HOW must be decided; multiple plausible designs exist; a reuse-vs-build decision is in play.

**Do NOT use when:** requirements are still fuzzy (go to clarifying-requirements), the codebase is not yet understood (go to exploring-project-context), the approach is genuinely singular and obvious (skip to writing-vertical-plans), or you are already writing the plan or tests.

## The how

1. **Ground in code, not the ticket.** Base every option on what the codebase actually does. Verify each named class/method/module exists (LSP references/definition, or read the file) before building an option on it. Reuse findings from exploring-project-context rather than re-discovering.
2. **Generate breadth first (3+ candidates).** Force distinct approaches, e.g. reuse-and-extend an existing pattern; a new focused component; delegate to an existing service; config/data-driven instead of code. Do not stop at the first workable idea.
3. **Prune to the 2-3 strongest.** Drop options that duplicate existing capability, over-engineer for needs not in the criteria (**YAGNI**), or fight the codebase's conventions.
4. **Score each survivor on fixed axes:** effort, risk, fit with existing patterns, performance/scale. Keep it a scannable table — the reader can read code.
5. **Recommend ONE, with the reason.** State which you would pick and why the trade-offs favour it. Prefer the reuse-first option unless an axis clearly rules it out.
6. **Surface assumptions and gaps.** Any assumption an option rests on is written in **bold** and flagged for the user to confirm — never silently baked in.
7. **Stop and let the user choose.** Do not start planning or writing code. Write exploration notes under `docs/` (or `docs/scratch/` if `docs/` is already tracked) and never commit them. On the user's pick, hand off to writing-vertical-plans.

## Example

Requirement: "An existing lock must block a set of edit endpoints, and the check must be region-aware."

- **A — Extend the existing lock-check annotation and its region-aware selector (reuse-first).** Effort: low. Risk: low. Fit: high (matches the selector already in place). Perf: no new queries. Rests on assumption: **the existing selector already resolves region for these endpoints**.
- **B — New dedicated guard aspect for these endpoints.** Effort: medium. Risk: medium (a second lock path to keep in sync). Fit: medium. Perf: neutral.
- **C — Check the lock inline in each endpoint.** Effort: high (many call sites). Risk: high (easy to miss one). Fit: low (bypasses the annotation convention). Perf: neutral.

**Recommendation: A** — reuses the proven annotation and selector, keeps one code path, lowest risk. Confirm the bolded assumption before planning.

## Common mistakes

| Mistake | Fix |
|---|---|
| Presenting one option as "the" solution | Generate 3+ distinct candidates before pruning |
| Options built on symbols named in the ticket | Verify each symbol exists in code first |
| New component that duplicates an existing one | Default to reuse-and-extend; justify any new build |
| Designing for future needs not in the criteria | Apply YAGNI; scope to the accepted criteria |
| Silent assumption inside an option | Write it in **bold**, flag it for confirmation |
| Sliding into the plan or the code | Stop at the recommendation; hand off to writing-vertical-plans |
| Prose wall of trade-offs | Use a per-option table on the four fixed axes |
| Committing the exploration notes | Keep notes under docs/ (or docs/scratch/), uncommitted |

## Checklist

- [ ] Options grounded in real code; every named symbol verified
- [ ] 3+ distinct candidates generated, then pruned to 2-3
- [ ] Reuse-first candidate included; YAGNI applied
- [ ] Each survivor scored on effort, risk, fit, performance
- [ ] ONE clear recommendation with rationale
- [ ] Assumptions in **bold** and flagged for the user
- [ ] Notes under docs/ (or docs/scratch/), not committed
- [ ] Stopped for the user's pick; no plan or code written

