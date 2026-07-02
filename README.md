# vn-toolkit

Vyankatesh's personal Claude Code toolkit — custom skills, workflows, and commands. Standalone plugin (not a superpowers fork).

## Feature workflow

A gated, plan-first, TDD pipeline for building a feature end-to-end. Orchestrated by the `feature-workflow` skill (or the `/feature` command). Hard gates stop for approval after acceptance criteria, solution choice, vertical plan, horizontal plan, and before any production code.

## Skills

| Skill | Step | Purpose |
|---|---|---|
| `structuring-requirements` | 1 | Restate a raw ask as a structured brief (goal/scope/unknowns) |
| `exploring-project-context` | 2 | Ground the feature in the codebase (derive from code, verify symbols) |
| `clarifying-requirements` | 3–4 | One question at a time; every assumption in **bold** |
| `writing-acceptance-criteria` | 5 | Given/When/Then + edge cases; scratch doc under `docs/` (never committed) |
| `exploring-solutions` | 6 | Explore in parallel; propose 2–3 with recommendation + trade-offs |
| `writing-vertical-plans` | 7 | Per-layer NEW/CHANGED/REUSE/UNCHANGED map of what/where |
| `writing-horizontal-plans` | 8 | Bottom-up TDD steps with complete code (test + impl) per step, one compiling commit |
| `writing-tests` | 9 | Review loop: test coverage, AAA, whole-object AssertJ, naming — loops until clean |
| `using-new-technology` | 10 | Review loop: new tech warranted + correct per current docs + available + no pitfalls — loops until clean |
| `questioning-legacy-patterns` | — | Companion lens: modern-vs-legacy, don't over-modernize (used by `using-new-technology`) |
| `feature-workflow` | — | Orchestrator: runs steps 1–12 with hard gates |

Steps 9 (`writing-tests`) and 10 (`using-new-technology`) ship with this plugin and always run as review loops until clean.

## Commands

| Command | Description |
|---|---|
| `/feature <ask>` | Launch the gated end-to-end feature workflow |

## Cross-cutting rules

Derive understanding from code (not tickets); never assume silently (assumptions in **bold**); workflow docs live under `docs/` and are never committed; no production code without an explicit go-ahead; local commits only, never push unprompted.
