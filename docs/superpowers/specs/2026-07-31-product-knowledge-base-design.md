# Product Knowledge Base — `/learn` and `/recall`

**Date:** 2026-07-31
**Status:** approved design, ready for planning
**Target:** `vn-toolkit` 2.4.0

## Problem

Onboarding onto an unfamiliar team's system means reading a long tail of documents,
diagrams, transcripts and code areas. Each one is understood once and then lost — the
next session starts cold, and there is no single artifact that says what the product is.

We want an incremental, durable knowledge base that:

1. accumulates a per-source summary as material is handed over,
2. maintains one product-level **memory map** that is refined with every source,
3. is reachable from any session in any working directory,
4. answers questions later without re-reading the originals.

## Non-goals

- Not a documentation generator for the team's repo. Output is for the reader, not the team.
- Not a code-comprehension tool. Existing `exploring-project-context` covers grounding a change.
- Not a search index. Volume here is tens of sources, not thousands; a map plus summaries is enough.

## Decisions

| Decision | Choice | Why |
|---|---|---|
| Storage | `~/.claude/knowledge/<product-slug>/` | cwd-independent, so a doc can be handed over from any session; never inside the team repo, so nothing is committed there by accident; multiple products coexist |
| Ingest mode | hybrid, size-based | small sources stay discussable in-session; large ones go to a subagent so bulk ingestion does not exhaust context |
| Recall | on demand, via skill | zero token cost to unrelated sessions |
| Commands | `/learn`, `/recall` | short and verb-shaped; typed many times a day during onboarding |
| Evals | out of scope for 2.4.0 | explicit scope decision; see Risks |

## Layout

```
~/.claude/knowledge/<product-slug>/
  MAP.md            # entry point; self-describing
  questions.md      # open questions + contradictions
  sources/
    S001-billing-arch.md
    raw/
      S003.txt      # pasted text only
  topics/
    settlement.md   # created lazily
```

Three constraints, each load-bearing:

1. **`MAP.md` is the sole entry point.** It contains its own source index, so recall reads one
   known path and follows pointers from there. No layout spec is shared between the two skills.
2. **`topics/` is created lazily** — only when a subject is covered by 2+ sources *and* its
   `MAP.md` section exceeds ~10 lines. Three sources ingested means zero topic files.
3. **Raw text is archived only when no pointer exists.** File and URL sources record their
   location and can be re-read at full fidelity. Pasted text has no location, so that alone is
   copied to `sources/raw/`. The team's docs are not bulk-cloned into the home directory.

### `MAP.md`

```markdown
---
product: acme-billing
repos: [~/dev/acme-billing, ~/dev/acme-ledger]
updated: 2026-07-31
sources: 7
---

# Acme Billing — Memory Map

## What it is
2–4 sentences: what it does, who uses it, why it exists.

## Components
| Component | Responsibility | Where | Tech | Src |
|-----------|---------------|-------|------|-----|
| settlement-svc | Nets and settles daily | acme-billing/settlement | Java 21, Spring | S1 S2 |

## Domain language
- **Settlement window** — … [S1]
- **Netting** — … ⚠ disputed: S1 vs S4 → questions.md

## Key flows
- **Invoice → settlement** — ingest → net → post → notify [S2] · detail: topics/settlement.md

## Integrations & dependencies

## Conventions & constraints

## Sources index
| S1 | docs/billing-arch.md | 2026-07-31 | components, glossary |

## Open questions → questions.md (4 open)
```

Every claim carries a source tag (`[S3]`) so it can be traced. Claims derived rather than read
are tagged `(inferred)`. Nothing enters the map that no source states.

### `sources/SNNN-<slug>.md`

```markdown
---
id: S007
source: docs/billing-arch.md        # or a URL, or "pasted"
kind: doc | code | transcript | diagram
ingested: 2026-07-31
---

# Title

## In one line
## Key points
## Domain terms introduced
## Flows and behaviour
## Explicit decisions and rationale
## Constraints and gotchas
## Questions this raised
## Quotes worth keeping verbatim     # only where exact wording matters
```

### `questions.md`

Two sections: **Open questions** (things to ask the team) and **Contradictions** (each naming
both source IDs and both claims). Answered entries move into `MAP.md` and are struck here.

## Product resolution

Writing into the wrong product's KB is silent corruption, so the algorithm is spelled out
verbatim in the skill as copyable Bash rather than described. (A helper script was the original
intent; see Risks for why it was dropped.)

```
1. explicit in args      /learn --product acme docs/x.md
2. cwd matches a repos: entry in some MAP.md front matter
3. exactly one KB exists → use it, and say which
4. otherwise             → ask; never guess
```

An unknown product name prompts for slug plus repo paths, then scaffolds.

## `/learn` flow

| Step | Actor |
|---|---|
| Resolve product | main, via the verbatim Bash in the skill |
| Classify source (path / dir / URL / pasted) and measure size | main |
| Read raw material | inline if <600 lines; subagent if larger, or any directory / multi-file. Pasted text is always inline — it is already in context and has no size gate. |
| Write `sources/SNNN-<slug>.md` | whichever actor read it |
| Reconcile into `MAP.md` | **always main** |
| Update `questions.md` | main |
| Promote to `topics/` if threshold met | main |
| Report: added / changed / disputed / new questions, ≤10 lines | main |

**Extraction is delegated; reconciliation never is.** Reconciliation needs the existing map plus
judgment, and a contradiction is something the user must see rather than something a subagent
quietly resolves. The subagent returns a ~15-line digest of durable facts and *candidate* map
changes, and never edits `MAP.md`.

Subagents inherit the session model. Summary fidelity is the durable artifact, so this is not the
place to economize.

### Reconciliation rules

- **New** fact → add, tagged with its source ID.
- **Refining** fact → update in place, appending the new source ID.
- **Contradicting** fact → never overwrite. Both claims go to `questions.md` under
  Contradictions with both source IDs, and the `MAP.md` entry is marked `⚠ disputed`.
- Bump `updated:` and `sources:` in front matter.

A confidently wrong map is worse than an incomplete one. During onboarding a contradiction is
usually real signal: a stale document, or two teams using one word differently.

### Code sources

Symbols are verified to exist before entering the map — LSP-first for Java and TypeScript per the
global rules, grep only for string literals and config. A class named in a document does not exist
until its definition has been opened.

## `/recall` flow

1. Resolve product.
2. Read `MAP.md`.
3. Read only the sources and topics the question needs — never all of them.
4. Answer, labelling every claim **known** (cited), **inferred**, or **not in the KB**.
5. On a miss, say so plainly; offer to `/learn` the relevant doc or log the question. Never guess.

The literal argument `/recall gaps` (as well as phrasings like "what don't we know yet") reports
`questions.md` instead of running the lookup flow.

## Components

```
skills/learning-product-knowledge/SKILL.md
skills/learning-product-knowledge/references/map-template.md
skills/learning-product-knowledge/references/source-template.md
skills/learning-product-knowledge/references/reconciliation.md
skills/recalling-product-knowledge/SKILL.md
commands/learn.md
commands/recall.md
skills/__tests__/product-knowledge.test.mjs
.claude-plugin/plugin.json           # → 2.4.0
.claude-plugin/marketplace.json      # → 2.4.0
workflows/__tests__/journal.test.mjs # existing version assertion, 2.3.0 → 2.4.0
```

Both manifests are bumped together, per repo convention.

### Skill body budget

Each `SKILL.md` stays under ~500 lines, with deep detail pushed into `references/`. Templates and
the reconciliation rules are reference files precisely because they are consulted only once the
skill has already fired.

### Descriptions and negative cases

Roughly half of skill failures are non-triggering, and this build ships without evals to measure
that. Both descriptions therefore state when to fire *and* when not to:

- `/learn` must **not** fire for: explaining a function, summarising a PR or diff, writing a
  README or CLAUDE.md for a repo, or general code comprehension for an imminent change
  (`exploring-project-context` owns that).
- `/recall` must **not** fire for: general programming questions, or questions about a repo with
  no knowledge base.

## Testing

The deliverable is Markdown, so it is tested the way this repo already tests Markdown: content
assertions over `SKILL.md`, exactly as `workflows/__tests__/journal.test.mjs` does. Tests live in
`skills/__tests__/product-knowledge.test.mjs`, using `node:test` and `node:assert/strict`, run with
`node --test`.

Asserted contracts:

- both skill descriptions state their negative cases (the specific must-not-fire phrases)
- the learn skill spells out all four resolution rules in order, and states "never guess"
- the learn skill forbids a subagent from editing `MAP.md`
- reconciliation defines all three outcomes, and `⚠ disputed` routes to `questions.md`
- the recall skill defines the three-way known / inferred / not-in-KB labelling
- the recall skill forbids answering from outside the KB
- `topics/` is documented as lazily created, with its promotion threshold
- both templates contain every required section heading
- both manifests declare the same version

This is weaker than behavioural testing — it verifies the instructions say the right thing, not
that the model obeys them. That is the gap evals would have closed.

## Risks

- **No evals (accepted).** A future model update could silently degrade triggering or
  reconciliation with no signal. Mitigated only by careful descriptions and explicit negative
  cases. Adding `evals/cases.json` plus a `claude -p` runner is the natural follow-up; assertions
  would be file-based (did `MAP.md` gain a row, did a contradiction reach `questions.md`), so no
  trace-inspection harness is required.
- **Helper script path — RESOLVED, script dropped.** Verified on 2026-07-31: `CLAUDE_PLUGIN_ROOT`
  is unset in skill-invoked Bash, and the installed plugin is version-pinned at
  `~/.claude/plugins/cache/vn-toolkit/vn-toolkit/<version>/`, so any hardcoded path breaks on
  every version bump. `kb.mjs` is therefore unreachable and was dropped; its four operations are
  inline Bash spelled out verbatim in the skill. Consequence: resolution correctness is no longer
  guarded by unit tests, only by the explicitness of the instructions — which raises the cost of
  having skipped evals.
- **Map growth.** A large product's `MAP.md` could grow past comfortable reading. The lazy
  `topics/` promotion rule is the pressure valve; if the map still bloats, sections move wholesale
  into topic files and the map keeps only pointers.

## Out of scope

Eval harness · sharing a KB with the team · auto-ingesting a whole repo unprompted ·
syncing to Confluence or Jira · any change to the existing feature-workflow skills.
