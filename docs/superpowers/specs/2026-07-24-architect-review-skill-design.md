# Design: `reviewing-like-an-architect` skill

Date: 2026-07-24

## Purpose

A skill that reviews a diff, MR, or plan at **architecture-and-design altitude**, the way
a senior, experienced architect would — grounded in the enduring principles of the field.
For every observation it teaches first, then advises: **Concept → What I see here →
Suggestion → Why it improves *this* design**, and cites which foundation the concept comes from.

## Scope

- **In scope:** design quality, structure, boundaries, coupling/cohesion, complexity,
  domain modeling, data/scalability trade-offs, pattern fit, language idioms, layering,
  configuration/operability. Senior judgment: trade-offs, YAGNI, respect real constraints,
  strengths called out, no nitpicking.
- **Out of scope (defer explicitly):** correctness/security bug-hunting → `/code-review`;
  the "should I mirror this legacy pattern" micro-decision → `questioning-legacy-patterns`.

## Structure

```
skills/reviewing-like-an-architect/
  SKILL.md                       # the review method + output contract
  references/
    principles-index.md          # review lens → which reference(s) to open
    clean-code.md
    refactoring-and-smells.md
    ddd.md
    ddia.md
    design-patterns.md
    effective-language-idioms.md
    enterprise-patterns.md
    philosophy-of-software-design.md
    twelve-factor.md
```

Each reference file is **original synthesis** (no verbatim book text) written as review
ammunition: for each principle — Idea, Smell it catches, Review trigger, Suggestion shape,
When NOT to apply — plus a quick review checklist.

## Review method (SKILL.md)

1. **Ingest the change.** Diff / MR / plan. Establish what it is trying to do and its altitude.
2. **Pick lenses.** Consult `principles-index.md`; open only the reference files relevant to
   this change. Do not run every lens on every change.
3. **Find, grounded.** Each finding is anchored in a named principle from a reference file.
4. **Emit in the fixed shape** for every finding:
   - **Concept** — name it + one-line explanation, cite the source foundation.
   - **What I see here** — the concrete thing in the change (`file:line` when available).
   - **Suggestion** — the change to make.
   - **Why it improves this design** — the concrete payoff *here*, not a platitude.
5. **Summarize.** Strengths first, then suggestions ranked by design impact
   (Structural / Worth-doing / Optional-polish). No nitpicking; respect constraints and YAGNI.

## How the knowledge base is built

A background Workflow (`distill-architecture-foundations`) fans out one agent per foundation
to produce each distilled reference, a verify pass checks each for copyright-safety and
review usefulness, and an index agent produces `principles-index.md`. Content is written into
`references/` by the main session. This is a one-time build; the files then persist and are
reused by every future session that invokes the skill.

## Foundations covered

Clean Code (R.C. Martin); Refactoring + code smells (Fowler); Domain-Driven Design (Evans);
Designing Data-Intensive Applications (Kleppmann); Design Patterns GoF / Head First
(intents + when-not-to); Effective Java generalized to language idioms (Bloch); Patterns of
Enterprise Application Architecture (Fowler); A Philosophy of Software Design (Ousterhout);
The Twelve-Factor App.

## Approaches considered

- **A (chosen):** skill + per-foundation reference files + index, built via a distillation
  workflow. On-demand loading, extensible, one concern per file.
- **B (rejected):** monolithic SKILL.md with all principles inline — bloated, always loaded,
  hard to extend.
- **C (rejected):** principles in auto-memory — not bundled with the skill, less structured.

## Constraints

- **No copyrighted text.** Reference files are original synthesis of widely-taught principles
  only; a verify pass enforces this.
- Matches repo skill conventions: gerund-style name, `SKILL.md` + `references/`.
