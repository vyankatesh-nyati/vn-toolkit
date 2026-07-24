---
name: reviewing-like-an-architect
description: Use when reviewing a diff, MR/PR, commit range, or an implementation plan and you want senior-architect-level feedback on design and quality — not a bug hunt. Grounds every suggestion in an enduring engineering principle (Clean Code, Refactoring/smells, DDD, DDIA, design patterns, language idioms, enterprise patterns, A Philosophy of Software Design, 12-Factor), and for each finding explains the concept first, then the suggestion, then why it improves THIS design. Triggers include "review this like an architect", "architectural review", "how could this be better designed", "review this MR/plan for quality", "design review", "is this well designed", "what would a staff engineer say about this". Defers correctness/security bug-hunting to /code-review and legacy-pattern micro-decisions to questioning-legacy-patterns.
---

# Reviewing Like an Architect

## Overview

Review a change the way a senior, experienced architect would: not line-by-line
fault-finding, but a read for **design and quality** — structure, boundaries, coupling,
complexity, domain fit, data and scalability trade-offs, and long-term maintainability.

**Core principle:** every suggestion is *taught, then applied*. Name the concept and where
it comes from, show where it bites in this change, propose the change, and explain the payoff
**here** — never a generic platitude. A suggestion the author cannot connect to their own code
is noise.

This skill is backed by a distilled reference library in `references/` — original syntheses
of the field's foundational works, written as review ammunition. Consult them; don't work
from memory alone.

## Scope — what this skill is and is not

**In scope (design altitude):** naming/readability, function and module design, duplication
and change-amplification, domain modeling and boundaries, coupling/cohesion/complexity,
design-pattern fit (and misfit), language/API idioms, layering and enterprise structure,
data/persistence/scalability, concurrency/consistency, configuration/deployment/operability.

**Out of scope — defer, don't duplicate:**
- Correctness bugs, security holes, concrete crash scenarios → tell the user to run `/code-review`.
- "Should I mirror this one legacy pattern here?" → `questioning-legacy-patterns`.
- Writing the tests themselves → `writing-tests`.

If a genuine correctness or security risk is spotted in passing, flag it in one line and point
to `/code-review` — do not turn the architecture review into a bug hunt.

## The review method

Create a todo per step and work them in order.

### 1. Ingest the change and establish altitude
- Get the actual change: a diff, an MR/PR, a commit range (`git diff <base>...<head>`), or a
  written plan. If it is not already in context, read it.
- State in one or two sentences what the change is trying to do and at what altitude
  (a config tweak, a new endpoint, a new bounded context, a data-model change…). The altitude
  decides which lenses are worth applying. Do not run every lens on every change.

### 2. Pick the lenses
- Open `references/principles-index.md` and select only the review lenses relevant to this
  change. A 10-line config change does not need the DDD or concurrency lens.
- Open the specific reference files the index points to. Read the "Quick review checklist" of
  each before forming findings.

### 3. Find, grounded
- Read the change through each selected lens. Every candidate finding must anchor to a **named
  principle** in a reference file — if you cannot name the principle, it is a preference, not a
  finding, so drop it.
- Apply senior judgment ruthlessly:
  - **YAGNI / when-NOT-to-apply:** each reference lists where forcing the principle is
    over-engineering. Respect it. Do not demand a rich domain model for simple CRUD, or a
    pattern where a plain function is clearer.
  - **Respect real constraints:** framework requirements (e.g. JPA needs mutable entities),
    existing conventions, deadlines, backward compatibility.
  - **Call out strengths**, not only problems. A review that only lists faults is untrustworthy.
  - **No nitpicking.** Formatting, subjective naming toss-ups, and taste calls that a linter or
    the team style guide owns are not architecture findings.

### 4. Emit every finding in the fixed shape

For each finding, use exactly this structure:

> **[Concept] — <principle name>** *(source: <foundation>)*
> One or two sentences explaining the concept in plain language.
>
> **What I see here:** the concrete thing in this change (`file:line` when you have it).
>
> **Suggestion:** the specific change to make (sketch code only if it clarifies).
>
> **Why it improves this design:** the concrete payoff *in this codebase* — what gets easier to
> change, test, understand, or scale, and what risk goes away. Tie it to the change, not to theory.

### 5. Summarize

- **Strengths** — 2-4 things the change does well (specific, not flattery).
- **Suggestions, ranked by design impact:**
  - **Structural** — affects boundaries, data, or long-term maintainability; worth addressing
    before merge.
  - **Worth doing** — clear quality win, low risk.
  - **Optional polish** — take it or leave it.
- One closing line: is the design fundamentally sound, or does it need rework before merge?

## Output discipline

- Teach before you advise — the concept always precedes the suggestion.
- Cite the foundation for each concept so the author can go deeper.
- Prefer a short review with 3-6 high-value findings over an exhaustive list. Depth over breadth.
- If the change is genuinely clean at this altitude, say so plainly and stop. Do not manufacture
  findings to look thorough.

## The reference library

`references/principles-index.md` maps each review lens to the file(s) to open. The distilled
foundations:

| File | Foundation | Best for |
|------|-----------|----------|
| `clean-code.md` | Clean Code (R.C. Martin) | naming, functions, comments, error handling, boundaries |
| `refactoring-and-smells.md` | Refactoring (Fowler) | code smells, change amplification, refactoring intents |
| `ddd.md` | Domain-Driven Design (Evans) | bounded contexts, aggregates, ubiquitous language, model isolation |
| `ddia.md` | Designing Data-Intensive Applications (Kleppmann) | data models, replication, partitioning, consistency, idempotency |
| `design-patterns.md` | Design Patterns GoF / Head First | pattern intents and when NOT to apply them |
| `effective-language-idioms.md` | Effective Java, generalized (Bloch) | immutability, construction, composition, idiomatic APIs |
| `enterprise-patterns.md` | PoEAA (Fowler) | layering, repository, unit of work, transaction script vs domain model |
| `philosophy-of-software-design.md` | A Philosophy of Software Design (Ousterhout) | complexity, deep vs shallow modules, information hiding |
| `twelve-factor.md` | The Twelve-Factor App | config, statelessness, backing services, disposability, logs |

The reference files are original syntheses of widely-taught principles — not book text.
