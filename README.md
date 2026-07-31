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
| `autonomous-feature-workflow` | — | Experimental: near-autonomous pipeline — pre-flight abort, context, self-clarification, AC, solution judge, plans + single review, plan-approval gate, single-job TDD implementation, draft-MR delivery |
| `amending-feature-workflow` | — | Experimental: re-enter a prior /feature-auto run at the earliest affected phase and refresh the MR |

Steps 9 (`writing-tests`) and 10 (`using-new-technology`) ship with this plugin and always run as review loops until clean.

## Commands

| Command | Description |
|---|---|
| `/feature <ask>` | Launch the gated end-to-end feature workflow |
| `/feature-auto <ask>` | Experimental: build the feature autonomously end-to-end and raise a draft MR; two stops — a phase-0 abort and a plan-approval gate before implementation |
| `/feature-amend <slug> "<feedback>"` | Experimental: amend a prior /feature-auto run from feedback; re-runs only the affected phases; additive commits |
| `/learn [path\|url]` | Absorb a doc, transcript, diagram, or code area into a product knowledge base and refine its memory map; leave the argument empty to ingest pasted text |
| `/recall <question>` | Answer from a product's knowledge base, labelling known, inferred, and missing; `/recall gaps` lists open questions and contradictions |

## Product knowledge base

An incremental knowledge base for a product you are learning, at `~/.claude/knowledge/<product>/`.
Hand over a doc, transcript, diagram, or code area with `/learn` and it becomes one source summary
plus a refined `MAP.md`; ask with `/recall` and every claim comes back labelled known, inferred, or
not in the KB. Storage is keyed by product rather than working directory, so a source can be handed
over from any session. A new source that contradicts the map never overwrites it — both claims are
kept and the conflict is routed to `questions.md`.

| Skill | Purpose |
|---|---|
| `learning-product-knowledge` | Ingest a source, summarise it, reconcile facts into the memory map |
| `recalling-product-knowledge` | Answer from the knowledge base, labelling provenance and gaps |

## Cross-cutting rules

Derive understanding from code (not tickets); never assume silently (assumptions in **bold**); workflow docs live under `docs/` and are never committed; no production code without an explicit go-ahead; local commits only, never push unprompted.
