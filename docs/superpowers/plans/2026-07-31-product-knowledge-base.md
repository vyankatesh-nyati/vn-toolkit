# Product Knowledge Base (`/learn` + `/recall`) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add `/learn` and `/recall` to vn-toolkit so documentation and code handed over in any session accumulate into a per-product knowledge base at `~/.claude/knowledge/<product>/` with one continuously refined memory map.

**Architecture:** Two Markdown skills plus two thin slash commands. `learning-product-knowledge` ingests a source (inline if small, via subagent if large), writes one summary per source, and reconciles facts into `MAP.md` — never silently overwriting a contradiction. `recalling-product-knowledge` reads `MAP.md` as the sole entry point and answers with every claim labelled known / inferred / not-in-KB. No runtime code: a helper script was designed but proved unreachable (see Global Constraints).

**Tech Stack:** Markdown skills and commands; `node:test` + `node:assert/strict` for content-contract tests; no package.json, no dependencies. Tests run with `node --test`.

**Spec:** `docs/superpowers/specs/2026-07-31-product-knowledge-base-design.md`

## Global Constraints

- KB root is exactly `~/.claude/knowledge/<product-slug>/`. Never inside the team repo.
- **No helper script.** `CLAUDE_PLUGIN_ROOT` is unset in skill-invoked Bash and the installed plugin path is version-pinned (`~/.claude/plugins/cache/vn-toolkit/vn-toolkit/<version>/`), so no shipped script is reachable. All operations are inline Bash written verbatim in the skill.
- Every `SKILL.md` stays under 500 lines; deep detail goes to `references/`.
- Every skill description states both when to fire and when **not** to fire.
- Inline/subagent threshold: **600 lines**. Directories and multi-file sources always use a subagent. Pasted text is always inline.
- A subagent may write `sources/SNNN-*.md` but must **never** edit `MAP.md`, `questions.md`, or `topics/`.
- Source IDs are `S` + three zero-padded digits (`S001`). Referenced in prose as `[S1]`.
- Contradictions are never overwritten: both claims go to `questions.md`, the map entry is marked `⚠ disputed`.
- Version `2.4.0` in `.claude-plugin/plugin.json` **and** `.claude-plugin/marketplace.json` (all three `version` fields in the latter).
- No code comments (global rule). Markdown prose is not a comment; Bash snippets stay uncommented.
- Existing tests must stay green: `node --test workflows/__tests__/` currently passes 32 assertions.

## File Structure

| File | Responsibility |
|---|---|
| `skills/learning-product-knowledge/SKILL.md` | Ingest flow: resolve product, classify + size source, delegate or read, reconcile |
| `skills/learning-product-knowledge/references/map-template.md` | Canonical `MAP.md` skeleton |
| `skills/learning-product-knowledge/references/source-template.md` | Canonical per-source summary skeleton |
| `skills/learning-product-knowledge/references/reconciliation.md` | Add / refine / dispute rules, topic promotion, subagent digest contract |
| `skills/recalling-product-knowledge/SKILL.md` | Lookup flow and three-way claim labelling |
| `commands/learn.md` | `/learn` entry point |
| `commands/recall.md` | `/recall` entry point |
| `skills/__tests__/product-knowledge.test.mjs` | Content contracts for both skills, references, commands, manifests |
| `.claude-plugin/plugin.json` | Version → 2.4.0 |
| `.claude-plugin/marketplace.json` | Version → 2.4.0 |
| `workflows/__tests__/journal.test.mjs` | Existing hardcoded `'2.3.0'` assertion → `'2.4.0'` |

Task order: templates first (they are the data contract every later task points at), then the ingest skill, then the recall skill, then the entry points and version bump.

---

### Task 1: Reference templates and reconciliation rules

**Files:**
- Create: `skills/learning-product-knowledge/references/map-template.md`
- Create: `skills/learning-product-knowledge/references/source-template.md`
- Create: `skills/learning-product-knowledge/references/reconciliation.md`
- Test: `skills/__tests__/product-knowledge.test.mjs`

**Interfaces:**
- Consumes: nothing.
- Produces: the section headings later tasks reference by name. `MAP.md` sections: `What it is`, `Components`, `Domain language`, `Key flows`, `Integrations & dependencies`, `Conventions & constraints`, `Sources index`, `Open questions`. Source-summary sections: `In one line`, `Key points`, `Domain terms introduced`, `Flows and behaviour`, `Explicit decisions and rationale`, `Constraints and gotchas`, `Questions this raised`, `Quotes worth keeping verbatim`. Reconciliation outcome names: `New`, `Refining`, `Contradicting`.

- [ ] **Step 1: Write the failing test**

Create `skills/__tests__/product-knowledge.test.mjs`:

```javascript
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const read = p => readFileSync(join(repoRoot, p), 'utf8')

const mapTemplate = read('skills/learning-product-knowledge/references/map-template.md')
const sourceTemplate = read('skills/learning-product-knowledge/references/source-template.md')
const reconciliation = read('skills/learning-product-knowledge/references/reconciliation.md')

test('map template carries every required section', () => {
  const required = [
    '## What it is',
    '## Components',
    '## Domain language',
    '## Key flows',
    '## Integrations & dependencies',
    '## Conventions & constraints',
    '## Sources index',
    '## Open questions',
  ]
  required.forEach(h => assert.ok(mapTemplate.includes(h), `map template has ${h}`))
})

test('map template front matter drives product resolution', () => {
  assert.ok(/^---/m.test(mapTemplate), 'front matter present')
  assert.ok(mapTemplate.includes('product:'), 'product slug field')
  assert.ok(mapTemplate.includes('repos:'), 'repos field for cwd matching')
  assert.ok(mapTemplate.includes('updated:'), 'updated field')
  assert.ok(mapTemplate.includes('sources:'), 'source count field')
})

test('source template carries every required section', () => {
  const required = [
    '## In one line',
    '## Key points',
    '## Domain terms introduced',
    '## Flows and behaviour',
    '## Explicit decisions and rationale',
    '## Constraints and gotchas',
    '## Questions this raised',
    '## Quotes worth keeping verbatim',
  ]
  required.forEach(h => assert.ok(sourceTemplate.includes(h), `source template has ${h}`))
})

test('source template records provenance so originals can be re-read', () => {
  assert.ok(sourceTemplate.includes('id:'), 'source id field')
  assert.ok(sourceTemplate.includes('source:'), 'original location field')
  assert.ok(sourceTemplate.includes('kind:'), 'kind field')
  assert.ok(sourceTemplate.includes('ingested:'), 'ingest date field')
})

test('reconciliation defines all three outcomes', () => {
  assert.ok(/\bNew\b/.test(reconciliation), 'new-fact outcome')
  assert.ok(/\bRefining\b/.test(reconciliation), 'refining outcome')
  assert.ok(/\bContradicting\b/.test(reconciliation), 'contradicting outcome')
})

test('reconciliation never overwrites a contradiction', () => {
  assert.ok(/never overwrite/i.test(reconciliation), 'overwrite explicitly forbidden')
  assert.ok(reconciliation.includes('⚠ disputed'), 'disputed marker defined')
  assert.ok(reconciliation.includes('questions.md'), 'contradictions routed to questions.md')
  assert.ok(/both source ID/i.test(reconciliation), 'both source ids recorded')
})

test('reconciliation forbids a subagent touching the map', () => {
  assert.ok(/never edit/i.test(reconciliation), 'subagent write ban stated')
  assert.ok(reconciliation.includes('MAP.md'), 'ban names MAP.md')
})

test('topics are lazily created with a stated threshold', () => {
  assert.ok(/lazil/i.test(reconciliation), 'lazy creation documented')
  assert.ok(/2\+|two or more|≥\s*2/.test(reconciliation), 'two-source threshold stated')
})

test('inferred facts are distinguishable from sourced ones', () => {
  assert.ok(reconciliation.includes('(inferred)'), 'inferred tag defined')
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test skills/__tests__/product-knowledge.test.mjs`
Expected: FAIL — `ENOENT: no such file or directory` for `map-template.md`.

- [ ] **Step 3: Create the map template**

Create `skills/learning-product-knowledge/references/map-template.md`:

````markdown
# `MAP.md` template

The product's memory map. One per product. This is the **only** entry point — it carries its own
source index, so a reader needs no other file to navigate.

Copy this skeleton on first scaffold. Drop sections that have no content yet rather than leaving
them empty with placeholder text; add them back when a source fills them.

```markdown
---
product: <slug>
repos: [~/dev/<repo>]
updated: <YYYY-MM-DD>
sources: <n>
---

# <Product> — Memory Map

## What it is
<2–4 sentences: what it does, who uses it, why it exists.>

## Components
| Component | Responsibility | Where | Tech | Src |
|-----------|---------------|-------|------|-----|
| <name> | <one line> | <repo/path> | <stack> | S1 S2 |

## Domain language
- **<Term>** — <definition> [S1]

## Key flows
- **<Flow>** — <a → b → c> [S2] · detail: topics/<slug>.md

## Integrations & dependencies
- **<System>** — <how and why we talk to it> [S3]

## Conventions & constraints
- <Team rule or non-obvious invariant> [S1]

## Sources index
| S1 | <path or url> | <YYYY-MM-DD> | <what it covers> |

## Open questions → questions.md (<n> open)
```

## Rules

- Every claim carries its source tag (`[S1]`, or `S1 S2` in table cells). A claim with no tag is a bug.
- A claim you derived rather than read is tagged `(inferred)`.
- A disputed claim keeps both readings and is marked `⚠ disputed: S1 vs S4 → questions.md`.
- `repos:` is what makes `cwd`-based product resolution work. Add every repo path belonging to the product.
- `updated:` and `sources:` are refreshed on every ingest.
- If a section outgrows ~10 lines and 2+ sources feed it, move the detail to `topics/<slug>.md` and leave a pointer.
````

- [ ] **Step 4: Create the source-summary template**

Create `skills/learning-product-knowledge/references/source-template.md`:

````markdown
# `sources/SNNN-<slug>.md` template

One file per ingested source. This is the durable record of a single document, transcript, diagram
or code area — written once, then only corrected.

```markdown
---
id: S<NNN>
source: <path, url, or "pasted">
kind: doc | code | transcript | diagram
ingested: <YYYY-MM-DD>
---

# <Title>

## In one line
<What this source is, and why it matters.>

## Key points
- <Durable fact.>

## Domain terms introduced
- **<Term>** — <definition as this source gives it.>

## Flows and behaviour
- **<Flow>** — <steps, in order.>

## Explicit decisions and rationale
- <Decision> — because <reason as stated>.

## Constraints and gotchas
- <Limit, invariant, or trap.>

## Questions this raised
- <Something the source left unanswered.>

## Quotes worth keeping verbatim
> <Only where exact wording carries weight — a contract term, a precise definition, a named guarantee.>
```

## Rules

- Naming: `S` + three zero-padded digits + `-` + kebab-case slug, e.g. `S007-billing-arch.md`.
- Write only what the source states. Anything you concluded is tagged `(inferred)`.
- Empty sections are dropped, not filled with "none".
- `source:` must let a reader re-open the original. A file path or URL is enough; only **pasted** text
  is copied to `sources/raw/S<NNN>.txt`, because it has no other home.
- For `kind: code`, every symbol named here must have had its definition opened. Unverified names do
  not belong in the summary.
````

- [ ] **Step 5: Create the reconciliation rules**

Create `skills/learning-product-knowledge/references/reconciliation.md`:

````markdown
# Reconciliation — folding a new source into the map

Reconciliation is the point of the whole exercise. Writing a summary is cheap; keeping one coherent
map across a dozen contradictory sources is the hard part.

**Never delegated.** A subagent may read raw material and write its own `sources/SNNN-*.md`, but it
must **never edit** `MAP.md`, `questions.md`, or anything in `topics/`. Reconciliation needs the
existing map plus judgement, and a contradiction is something the user must see rather than
something a subagent quietly resolves.

## The three outcomes

Take each durable fact from the new source and classify it against the current map.

**New** — the map says nothing on this point.
→ Add it to the right section, tagged with the new source ID.

**Refining** — the map already says this, and the new source adds precision or detail.
→ Update the entry in place and append the new source ID. Keep the sharper wording.

**Contradicting** — the map says something incompatible.
→ **Never overwrite.** Do all three:
1. Leave the existing claim in `MAP.md` and append `⚠ disputed: S<old> vs S<new> → questions.md`.
2. Add an entry under `## Contradictions` in `questions.md` recording **both source IDs** and both
   claims, quoted closely enough to be arguable.
3. Report it in the run summary — a contradiction is the most useful thing an ingest can produce.

A confidently wrong map is worse than an incomplete one. During onboarding a contradiction is
usually real signal: a stale document, or two teams using one word differently.

## Never invent

Nothing enters the map that no source states. A fact you derived rather than read is tagged
`(inferred)` so a later reader can challenge it. If you cannot tell whether the source says
something or you concluded it, treat it as inferred.

## Topic promotion

`topics/` is created **lazily**, never scaffolded upfront. Promote a subject out of `MAP.md` into
`topics/<slug>.md` only when both hold:

- 2+ sources feed the subject, and
- its `MAP.md` section has outgrown roughly 10 lines.

On promotion, move the detail and leave a one-line pointer in the map. Three sources ingested should
still mean zero topic files.

## Closing the loop

After folding facts in:

- refresh `updated:` and `sources:` in the map's front matter,
- append anything unanswered to `## Open questions` in `questions.md`,
- strike through any open question this source answers, and move the answer into the map.

## The subagent digest contract

A subagent dispatched to read a large source returns a compact digest — roughly 15 lines, never the
raw text:

- the source ID and path it wrote,
- durable facts, one per line, each already phrased as it could appear in the map,
- **candidate** map changes, labelled `new` / `refines <what>` / `may contradict <what>`,
- questions raised.

The label is a proposal, not a decision. Reconciliation re-checks every candidate against the real
map before anything is written.
````

- [ ] **Step 6: Run tests to verify they pass**

Run: `node --test skills/__tests__/product-knowledge.test.mjs`
Expected: PASS — 9 tests.

- [ ] **Step 7: Commit**

```bash
git add skills/learning-product-knowledge/references skills/__tests__/product-knowledge.test.mjs
git commit -m "feat(product-knowledge): map, source and reconciliation contracts

The reconciliation rules are the load-bearing part: a new source that
contradicts the map never overwrites it. Both claims are kept, the entry
is flagged disputed, and the conflict is routed to questions.md, because
during onboarding a contradiction is usually a stale doc or two teams
using one word differently."
```

---

### Task 2: The ingest skill

**Files:**
- Create: `skills/learning-product-knowledge/SKILL.md`
- Modify: `skills/__tests__/product-knowledge.test.mjs` (append)
- Test: `skills/__tests__/product-knowledge.test.mjs`

**Interfaces:**
- Consumes: the three reference files from Task 1, by relative path `references/<name>.md`, and the section names listed in Task 1's Produces block.
- Produces: the four-rule resolution order and the 600-line threshold, both of which Task 3's recall skill restates for product resolution.

- [ ] **Step 1: Write the failing test**

Append to `skills/__tests__/product-knowledge.test.mjs`:

```javascript
const learn = read('skills/learning-product-knowledge/SKILL.md')
const learnBody = learn.slice(learn.indexOf('---', 3))
const learnDesc = learn.slice(0, learn.indexOf('---', 3))

test('learn skill declares name and a description with triggers', () => {
  assert.ok(learnDesc.includes('name: learning-product-knowledge'), 'skill name')
  assert.ok(/description:/.test(learnDesc), 'description present')
  assert.ok(/\/learn/.test(learnDesc), 'command named in description')
})

test('learn description states its negative cases', () => {
  const d = learnDesc.replace(/\s+/g, ' ')
  assert.ok(/not/i.test(d), 'negative framing present')
  assert.ok(/exploring-project-context/.test(d), 'defers code grounding to exploring-project-context')
  assert.ok(/README|CLAUDE\.md/.test(d), 'excludes writing repo docs')
  assert.ok(/PR|diff/.test(d), 'excludes summarising a PR or diff')
})

test('learn skill spells out all four resolution rules in order', () => {
  const idx = s => learnBody.indexOf(s)
  assert.ok(idx('--product') > -1, 'rule 1: explicit argument')
  assert.ok(idx('repos:') > -1, 'rule 2: cwd matches repos front matter')
  assert.ok(/exactly one/i.test(learnBody), 'rule 3: single existing KB')
  assert.ok(/never guess/i.test(learnBody), 'rule 4: ask, never guess')
  assert.ok(idx('--product') < idx('repos:'), 'explicit arg precedes cwd matching')
})

test('learn skill pins the KB root', () => {
  assert.ok(learnBody.includes('~/.claude/knowledge/'), 'KB root stated')
  assert.ok(/never.*team repo|not.*inside the team repo/i.test(learnBody), 'team repo excluded')
})

test('learn skill states the size threshold and its exceptions', () => {
  assert.ok(learnBody.includes('600'), 'threshold value')
  assert.ok(/pasted/i.test(learnBody), 'pasted text handled')
  assert.ok(/director|multi-file/i.test(learnBody), 'directories always delegated')
})

test('learn skill forbids the subagent editing the map', () => {
  assert.ok(/never edit/i.test(learnBody), 'write ban present')
  assert.ok(/reconcil/i.test(learnBody), 'reconciliation named as main-session work')
})

test('learn skill points at its reference files', () => {
  assert.ok(learnBody.includes('references/map-template.md'), 'map template referenced')
  assert.ok(learnBody.includes('references/source-template.md'), 'source template referenced')
  assert.ok(learnBody.includes('references/reconciliation.md'), 'reconciliation referenced')
})

test('learn skill requires symbol verification for code sources', () => {
  assert.ok(/LSP/.test(learnBody), 'LSP-first stated')
  assert.ok(/definition/i.test(learnBody), 'definition must be opened')
})

test('learn skill reports back concisely', () => {
  assert.ok(/disputed/i.test(learnBody), 'disputes surfaced in the report')
  assert.ok(/\b(ten|10) lines\b/i.test(learnBody), 'report length bounded')
})

test('learn skill stays within the size budget', () => {
  assert.ok(learn.split('\n').length < 500, `SKILL.md under 500 lines (was ${learn.split('\n').length})`)
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test skills/__tests__/product-knowledge.test.mjs`
Expected: FAIL — `ENOENT` for `skills/learning-product-knowledge/SKILL.md`.

- [ ] **Step 3: Write the skill**

Create `skills/learning-product-knowledge/SKILL.md`:

````markdown
---
name: learning-product-knowledge
description: Use when the user hands over documentation, a design doc, a diagram, a meeting transcript, a URL, or a code area to be absorbed into durable knowledge about a product they are learning — typically via /learn, or phrasings like "add this to the knowledge base", "learn this doc", "remember how this system works", "I'm onboarding onto X, here's their architecture doc". Writes one summary per source under ~/.claude/knowledge/<product>/sources/ and reconciles the facts into that product's MAP.md, flagging contradictions instead of overwriting them. Do NOT use for: explaining a function or file to the user right now, summarising a PR or diff, writing a README or CLAUDE.md for a repo, producing documentation for a team, or grounding an imminent code change — exploring-project-context owns that last one.
---

# Learning Product Knowledge

## Overview

Absorb a source the user is reading into a durable, per-product knowledge base, so the next session
starts warm and the user can interrogate what they have read without re-reading it.

**Core principle:** the map must stay trustworthy. A confidently wrong map is worse than an
incomplete one, so nothing is invented, every claim is traceable to a source, and a contradiction is
surfaced rather than resolved.

## When to use

- The user runs `/learn`, with or without an argument.
- The user hands over a doc, transcript, diagram, URL, or code area and wants it remembered.
- The user says "add this to the knowledge base", "learn this", "remember how X works".

**When NOT to use:** explaining code to the user right now; summarising a PR or diff; authoring a
README, CLAUDE.md, or team-facing docs; grounding an imminent code change (that is
`exploring-project-context`); answering from a KB that already exists (that is
`recalling-product-knowledge`).

## Layout

The knowledge base lives at `~/.claude/knowledge/<product-slug>/` — **never inside the team repo**,
so nothing is committed to their codebase by accident and a source can be handed over from any
working directory.

```
~/.claude/knowledge/<product-slug>/
  MAP.md            the only entry point; carries its own source index
  questions.md      Open questions + Contradictions
  sources/
    S001-<slug>.md
    raw/S003.txt    pasted text only
  topics/           created lazily, never upfront
```

Skeletons: `references/map-template.md`, `references/source-template.md`.

## Step 1 — Resolve the product

Writing into the wrong product's KB is silent corruption. Apply these rules **in order** and stop at
the first that resolves:

1. **Explicit in the request** — `--product <slug>`, or "for <product>".
2. **`cwd` matches a `repos:` entry** in some `MAP.md` front matter:
   ```bash
   grep -l "$(pwd)" ~/.claude/knowledge/*/MAP.md 2>/dev/null
   ```
3. **Exactly one KB exists** — use it, and say which one you chose:
   ```bash
   ls -d ~/.claude/knowledge/*/ 2>/dev/null
   ```
4. **Otherwise ask.** Offer the existing slugs. **Never guess.**

For a product with no KB yet, confirm the slug and its repo paths with the user, then scaffold:

```bash
mkdir -p ~/.claude/knowledge/<slug>/sources
```

Write `MAP.md` from the template with front matter filled in, and an empty `questions.md` holding
only its two headings. Do **not** create `topics/` or `sources/raw/` until something needs them.

## Step 2 — Classify and size the source

| Source | Read by |
|---|---|
| Pasted text | inline — already in context, no size gate |
| One file or URL, under 600 lines | inline |
| One file or URL, 600 lines or more | subagent |
| A directory, a glob, or several files | subagent, always |

Measure before deciding: `wc -l <path>`.

Reading inline keeps the source discussable in this conversation, which is worth having for anything
small. Delegating keeps a large source from consuming the session — the user may be handing over
many documents in a row.

## Step 3 — Read and summarise

Write one summary per source to `sources/S<NNN>-<slug>.md` using
`references/source-template.md`. Next ID:

```bash
ls ~/.claude/knowledge/<slug>/sources/S*.md 2>/dev/null | wc -l
```

Take the highest existing ID and add one, so gaps are never reused.

**When delegating**, the subagent reads the raw material, writes the summary file itself at full
fidelity, and returns a ~15-line digest. It must **never edit** `MAP.md`, `questions.md`, or
`topics/`. The digest contract is in `references/reconciliation.md`.

**For code sources**, verify every symbol before it enters a summary: LSP `definition` /
`references` first for Java and TypeScript, grep only for string literals and config values. A class
named in a document does not exist until its definition has been opened. Never substitute a
similar-looking name — say the symbol did not resolve.

**For pasted text**, also archive the raw text to `sources/raw/S<NNN>.txt`, because there is no path
to re-read it from later. File and URL sources are not copied.

## Step 4 — Reconcile into the map

Read `references/reconciliation.md` and apply it. In short: each fact is **new**, **refining**, or
**contradicting**; a contradiction is never overwritten — both claims survive, the map entry is
marked `⚠ disputed`, and the conflict goes to `questions.md`.

Reconciliation is **always** done here, in the main session, never by a subagent.

## Step 5 — Report

Ten lines at most:

- product and source ID written,
- what was **added** to the map,
- what was **refined**,
- what is now **disputed** — always call these out explicitly,
- new open questions.

If nothing changed the map, say so plainly rather than inventing significance.
````

- [ ] **Step 4: Run tests to verify they pass**

Run: `node --test skills/__tests__/product-knowledge.test.mjs`
Expected: PASS — 19 tests.

- [ ] **Step 5: Commit**

```bash
git add skills/learning-product-knowledge/SKILL.md skills/__tests__/product-knowledge.test.mjs
git commit -m "feat(product-knowledge): add the /learn ingest skill

Resolution is spelled out as four ordered rules ending in 'never guess',
because writing into the wrong product's knowledge base is silent
corruption and no helper script is reachable from an installed plugin.

Extraction may be delegated to a subagent; reconciliation never is."
```

---

### Task 3: The recall skill

**Files:**
- Create: `skills/recalling-product-knowledge/SKILL.md`
- Modify: `skills/__tests__/product-knowledge.test.mjs` (append)
- Test: `skills/__tests__/product-knowledge.test.mjs`

**Interfaces:**
- Consumes: the resolution rules and KB layout from Task 2 (restated, not imported — a skill cannot include another).
- Produces: the three claim labels `known` / `inferred` / `not in the KB`, and the `gaps` argument.

- [ ] **Step 1: Write the failing test**

Append to `skills/__tests__/product-knowledge.test.mjs`:

```javascript
const recall = read('skills/recalling-product-knowledge/SKILL.md')
const recallBody = recall.slice(recall.indexOf('---', 3))
const recallDesc = recall.slice(0, recall.indexOf('---', 3))

test('recall skill declares name and description', () => {
  assert.ok(recallDesc.includes('name: recalling-product-knowledge'), 'skill name')
  assert.ok(/\/recall/.test(recallDesc), 'command named in description')
})

test('recall description states its negative cases', () => {
  const d = recallDesc.replace(/\s+/g, ' ')
  assert.ok(/not/i.test(d), 'negative framing present')
  assert.ok(/general programming|general coding/i.test(d), 'excludes general programming questions')
  assert.ok(/no knowledge base|without a knowledge base/i.test(d), 'excludes products with no KB')
})

test('recall reads MAP.md as the sole entry point', () => {
  assert.ok(recallBody.includes('MAP.md'), 'map named')
  assert.ok(/entry point/i.test(recallBody), 'entry-point role stated')
  assert.ok(/only the|never all/i.test(recallBody), 'selective source loading')
})

test('recall labels every claim three ways', () => {
  assert.ok(/\bknown\b/i.test(recallBody), 'known label')
  assert.ok(/\binferred\b/i.test(recallBody), 'inferred label')
  assert.ok(/not in the KB/i.test(recallBody), 'not-in-KB label')
})

test('recall refuses to answer from outside the KB', () => {
  assert.ok(/never (guess|fabricat)/i.test(recallBody), 'guessing forbidden')
  assert.ok(/\/learn/.test(recallBody), 'offers to ingest the missing doc')
})

test('recall supports the gaps lookup', () => {
  assert.ok(/\bgaps\b/.test(recallBody), 'gaps argument')
  assert.ok(recallBody.includes('questions.md'), 'gaps reads questions.md')
})

test('recall resolves the product the same way as learn', () => {
  assert.ok(recallBody.includes('repos:'), 'cwd matching via repos front matter')
  assert.ok(/never guess/i.test(recallBody), 'ask rather than guess')
})

test('recall skill stays within the size budget', () => {
  assert.ok(recall.split('\n').length < 500, `SKILL.md under 500 lines (was ${recall.split('\n').length})`)
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test skills/__tests__/product-knowledge.test.mjs`
Expected: FAIL — `ENOENT` for `skills/recalling-product-knowledge/SKILL.md`.

- [ ] **Step 3: Write the skill**

Create `skills/recalling-product-knowledge/SKILL.md`:

````markdown
---
name: recalling-product-knowledge
description: Use when answering a question about a product the user has been building knowledge about — typically via /recall, or phrasings like "what do we know about X", "how does the settlement flow work", "remind me how their auth works", "what don't we know yet". Reads ~/.claude/knowledge/<product>/MAP.md and only the source summaries the question needs, then labels every claim known, inferred, or not in the KB. Do NOT use for: general programming or language questions, questions about a product with no knowledge base, ingesting new material (that is learning-product-knowledge), or grounding an imminent code change in a repo (that is exploring-project-context).
---

# Recalling Product Knowledge

## Overview

Answer from the accumulated knowledge base instead of re-reading originals — and be honest about
the edges of what it contains.

**Core principle:** an answer's value depends on knowing how much to trust it. Every claim is
labelled by provenance, and a gap is reported as a gap.

## When to use

- The user runs `/recall`.
- The user asks what is known about a product they have been learning.
- The user asks what is still unknown or unresolved.

**When NOT to use:** general programming questions; a product with no KB (offer `/learn` instead);
ingesting new material (`learning-product-knowledge`); grounding a code change
(`exploring-project-context`).

## Step 1 — Resolve the product

In order, stopping at the first that resolves:

1. **Explicit in the request** — `--product <slug>`, or "for <product>".
2. **`cwd` matches a `repos:` entry** in some `MAP.md` front matter:
   ```bash
   grep -l "$(pwd)" ~/.claude/knowledge/*/MAP.md 2>/dev/null
   ```
3. **Exactly one KB exists** — use it, and say which.
4. **Otherwise ask.** **Never guess.**

If no KB exists at all, say so and offer `/learn` — do not answer from general knowledge while
implying it came from the KB.

## Step 2 — Read selectively

Read `MAP.md` first. It is the **only entry point** and carries its own source index, so it tells
you where everything else is.

Then read **only** the sources and topics the question actually needs — never all of them. The map's
`Src` tags and `Sources index` point you at the right ones. Loading the whole KB defeats its
purpose.

## Step 3 — Answer, labelled

Label every claim by provenance:

- **known** — stated by a source. Cite it: `[S3]`.
- **inferred** — derived, not read. Say so, and say what it rests on.
- **not in the KB** — say this plainly.

Never guess, and never fabricate a citation. On a gap:

1. say what is missing,
2. offer to `/learn` the document that would close it,
3. offer to add the question to `questions.md`.

A `⚠ disputed` map entry is reported as disputed, giving both readings and both source IDs. Do not
pick a side the sources do not support.

## The `gaps` lookup

`/recall gaps` — and phrasings like "what don't we know yet", "what should I ask the team" — reports
`questions.md` instead of running the lookup: open questions first, then contradictions with both
claims. Group them so the user can take them into a conversation with the team.
````

- [ ] **Step 4: Run tests to verify they pass**

Run: `node --test skills/__tests__/product-knowledge.test.mjs`
Expected: PASS — 27 tests.

- [ ] **Step 5: Commit**

```bash
git add skills/recalling-product-knowledge/SKILL.md skills/__tests__/product-knowledge.test.mjs
git commit -m "feat(product-knowledge): add the /recall lookup skill

Every claim is labelled known, inferred, or not-in-KB, because an answer
drawn from a partial knowledge base is only useful if its provenance is
visible. Gaps are reported as gaps and never closed by guessing."
```

---

### Task 4: Commands, version bump, full suite green

**Files:**
- Create: `commands/learn.md`
- Create: `commands/recall.md`
- Modify: `.claude-plugin/plugin.json` (version → 2.4.0)
- Modify: `.claude-plugin/marketplace.json` (both version fields → 2.4.0)
- Modify: `workflows/__tests__/journal.test.mjs:72` (`'2.3.0'` → `'2.4.0'`)
- Modify: `skills/__tests__/product-knowledge.test.mjs` (append)
- Modify: `README.md`
- Test: `skills/__tests__/product-knowledge.test.mjs`

**Interfaces:**
- Consumes: skill names `learning-product-knowledge` and `recalling-product-knowledge` from Tasks 2–3.
- Produces: nothing downstream — this task completes the feature.

- [ ] **Step 1: Write the failing test**

Append to `skills/__tests__/product-knowledge.test.mjs`:

```javascript
const learnCmd = read('commands/learn.md')
const recallCmd = read('commands/recall.md')

test('learn command routes to the ingest skill', () => {
  assert.ok(/description:/.test(learnCmd), 'front matter description')
  assert.ok(/argument-hint:/.test(learnCmd), 'argument hint present')
  assert.ok(learnCmd.includes('learning-product-knowledge'), 'names the skill')
  assert.ok(learnCmd.includes('$ARGUMENTS'), 'passes arguments through')
})

test('learn command tolerates an empty argument for pasted text', () => {
  assert.ok(/paste/i.test(learnCmd), 'pasted-text path documented')
})

test('recall command routes to the lookup skill', () => {
  assert.ok(/description:/.test(recallCmd), 'front matter description')
  assert.ok(recallCmd.includes('recalling-product-knowledge'), 'names the skill')
  assert.ok(recallCmd.includes('$ARGUMENTS'), 'passes arguments through')
})

test('recall command documents the gaps lookup', () => {
  assert.ok(/\bgaps\b/.test(recallCmd), 'gaps argument documented')
})

test('both manifests declare 2.4.0', () => {
  const plugin = JSON.parse(read('.claude-plugin/plugin.json'))
  const market = JSON.parse(read('.claude-plugin/marketplace.json'))
  assert.equal(plugin.version, '2.4.0', 'plugin.json bumped')
  const marketVersions = JSON.stringify(market).match(/"version":\s*"[^"]+"/g) || []
  assert.ok(marketVersions.length >= 2, 'marketplace declares versions')
  marketVersions.forEach(v => assert.ok(v.includes('2.4.0'), `marketplace agrees: ${v}`))
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test skills/__tests__/product-knowledge.test.mjs`
Expected: FAIL — `ENOENT` for `commands/learn.md`.

- [ ] **Step 3: Create both commands**

Create `commands/learn.md`:

```markdown
---
description: Absorb a doc, transcript, diagram, URL, or code area into a product knowledge base and refine its memory map (vn-toolkit)
argument-hint: [path | url | --product <slug>] (or leave empty and paste the text)
---

Use the `learning-product-knowledge` skill to absorb the source below into the product's knowledge
base at `~/.claude/knowledge/<product>/`. Resolve the product by the skill's ordered rules and ask
rather than guess if it is ambiguous. Read the source inline if it is small, delegate to a subagent
if it is large or spans several files, and reconcile the facts into `MAP.md` yourself — never let a
subagent edit the map. Flag any contradiction with what is already known instead of overwriting it,
verify every code symbol before recording it, then report what was added, refined, disputed, and
newly unanswered.

If no source is given below, use the material I have just pasted into the conversation.

Source: $ARGUMENTS
```

Create `commands/recall.md`:

```markdown
---
description: Answer from a product's accumulated knowledge base, labelling what is known, inferred, or missing (vn-toolkit)
argument-hint: <question> | gaps
---

Use the `recalling-product-knowledge` skill to answer the question below from the product's
knowledge base. Read `MAP.md` first and then only the sources the question needs. Label every claim
as known (with its source tag), inferred, or not in the KB. If the answer is not there, say so and
offer to `/learn` the document that would close the gap — never guess and never fabricate a
citation. Report a disputed entry as disputed, with both readings.

If the question is `gaps` — or asks what we do not yet know — report `questions.md` instead: open
questions first, then contradictions.

Question: $ARGUMENTS
```

- [ ] **Step 4: Bump both manifests**

In `.claude-plugin/plugin.json`, change `"version": "2.3.0"` to `"version": "2.4.0"`.

In `.claude-plugin/marketplace.json`, change **both** occurrences of `"version": "2.3.0"` to
`"version": "2.4.0"` — one under `metadata`, one in the `plugins` entry (three across both files):

```bash
sed -i '' 's/"2\.3\.0"/"2.4.0"/g' .claude-plugin/plugin.json .claude-plugin/marketplace.json
grep -n '"version"' .claude-plugin/plugin.json .claude-plugin/marketplace.json
```

Confirm no `2.3.0` remains in either file.

- [ ] **Step 5: Update the existing version assertion**

`workflows/__tests__/journal.test.mjs:72` hardcodes the old version and will now fail. Change:

```javascript
  assert.equal(plugin.version, '2.3.0', 'plugin.json bumped to 2.3.0')
```

to:

```javascript
  assert.equal(plugin.version, '2.4.0', 'plugin.json bumped to 2.4.0')
```

- [ ] **Step 6: Add the commands to the README**

`README.md`'s Skills table has a `Step` column tied to the feature workflow, and these two skills
are not feature-workflow steps. So add a new section immediately **before** `## Cross-cutting rules`:

```markdown
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
```

Then add two rows to the existing `## Commands` table, matching its format:

```markdown
| `/learn [path\|url]` | Absorb a doc, transcript, diagram, or code area into a product knowledge base and refine its memory map; leave the argument empty to ingest pasted text |
| `/recall <question>` | Answer from a product's knowledge base, labelling known, inferred, and missing; `/recall gaps` lists open questions and contradictions |
```

- [ ] **Step 7: Run the whole suite**

Run: `node --test skills/__tests__/ workflows/__tests__/`
Expected: PASS — 32 pre-existing assertions plus 32 new ones, 0 failures. If `journal.test.mjs`
fails on the version, Step 5 was missed.

- [ ] **Step 8: Commit**

```bash
git add commands/learn.md commands/recall.md .claude-plugin/plugin.json \
        .claude-plugin/marketplace.json workflows/__tests__/journal.test.mjs \
        skills/__tests__/product-knowledge.test.mjs README.md
git commit -m "feat(product-knowledge): add /learn and /recall commands, bump to 2.4.0

Both manifests move together per repo convention, and the existing
journal test's hardcoded version assertion moves with them."
```

---

## Verification

After Task 4, confirm the feature end to end by hand — no eval harness ships in this version:

- [ ] `node --test skills/__tests__/ workflows/__tests__/` is fully green.
- [ ] `/learn` on a small local Markdown file scaffolds a KB, writes `sources/S001-*.md`, and populates `MAP.md`.
- [ ] `/learn` on a second file that contradicts the first leaves the original claim intact, marks it `⚠ disputed`, and records both source IDs in `questions.md`. **This is the single most important behaviour to check by hand.**
- [ ] `/learn` on a file over 600 lines delegates to a subagent and `MAP.md` is still updated correctly.
- [ ] `/recall` answers with source tags, and reports a deliberate gap as not-in-KB rather than guessing.
- [ ] `/recall gaps` lists open questions and the contradiction.
- [ ] A negative prompt — "explain this function to me" — does **not** trigger `/learn`.

## Known gaps

- **No evals** (explicit scope decision). Trigger reliability and reconciliation behaviour are unmeasured; a future model update could degrade either silently. The follow-up is `evals/cases.json` plus a `claude -p` runner asserting on resulting files — no trace inspection needed, since every assertion above is file-based.
- **Tests assert instructions, not behaviour.** They verify the skills *say* the right thing, not that the model obeys. The manual checklist above is the only behavioural coverage.
