# Feature-Auto Run Journal Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace `/feature-auto`'s dense `DECISIONS.md` table as the thing-you-read with a first-person, per-phase prose run journal (`journal.md`), and shrink `DECISIONS.md` to a thin risk-ranked index that links into it.

**Architecture:** All changes are to skill-contract *prose* (`skills/**/SKILL.md`) plus the two plugin manifests — no workflow scripts change. This repo already tests skill contracts by asserting on the markdown text (`workflows/__tests__/*.test.mjs`, e.g. `skill-gate.test.mjs` reads `SKILL.md` and asserts wording), so every task here is genuine TDD: a failing content-assertion test, then the wording edit that makes it pass. The journal and the thin index are two renderings of the same per-phase structured workflow returns; a 1:1 decision correspondence (`{#d<N>}` anchor ↔ thin line) is the core invariant.

**Tech Stack:** Node's built-in test runner (`node --test`), plain Markdown skill files, JSON plugin manifests.

## Global Constraints

- No workflow script (`workflows/*.js`) may be modified — journal + thin index are rendered by the orchestrator from data it already consumes.
- Decision numbering `D<N>` is continuous across phases; every decision has exactly ONE `journal.md` `{#d<N>}` subsection and exactly ONE `DECISIONS.md` thin line (1:1).
- Thin `DECISIONS.md` line format (verbatim): `- D<N> — <title>  [phase <k>] [risk: H|M|L] [reversibility: easy|moderate|rebuild] [assumption]  → journal.md#d<N>` — `[assumption]` present iff `source: conservative-default` or an AC assumption.
- `DECISIONS.md` is appended in `D<N>` order; the MR re-sorts highest-risk first.
- Journal voice is first-person developer working-notes; never a table.
- Comments rule: skill files are prose — no meta-commentary about the change; the wording *is* the deliverable.
- Bump the vn-toolkit version in BOTH `.claude-plugin` manifests when a skill changes (project convention).
- Run tests from the repo root. Single file: `node --test workflows/__tests__/journal.test.mjs`. Full suite: `node --test "workflows/__tests__/**/*.test.mjs"` (the bare-directory form `node --test workflows/__tests__/` fails on Node v24 — it treats the directory as a CJS module).

---

### Task 1: Journal + thin-index format contract

Rewrite the "Decision log format" contract section and the state-layout table in the autonomous skill so the artifacts are *defined* before any phase references them.

**Files:**
- Modify: `skills/autonomous-feature-workflow/SKILL.md` (state table row ~line 36; "Decision log format" section ~lines 222-232)
- Create: `workflows/__tests__/journal.test.mjs`

**Interfaces:**
- Produces: the canonical strings later tasks/tests assert on — the section heading `## Run journal (\`journal.md\`) and decision index (\`DECISIONS.md\`)`, the four journal `## ` section titles (`## Understanding the code`, `## Questions I answered myself`, `## Acceptance criteria & the approach I picked`, `## What I built`), the anchor convention `### D<N> — <title> {#d<N>}`, and the thin-line format string.
- Consumes: nothing (first task).

- [ ] **Step 1: Write the failing test**

Create `workflows/__tests__/journal.test.mjs`:

```javascript
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const skill = readFileSync(join(repoRoot, 'skills/autonomous-feature-workflow/SKILL.md'), 'utf8')

test('defines the run journal as the readable record', () => {
  assert.ok(/##\s*Run journal/i.test(skill), 'run-journal contract section present')
  assert.ok(skill.includes('first-person'), 'journal voice documented')
  assert.ok(skill.includes('## Understanding the code'), 'journal section: understanding')
  assert.ok(skill.includes('## Questions I answered myself'), 'journal section: questions')
  assert.ok(skill.includes('## Acceptance criteria & the approach I picked'), 'journal section: AC + approach')
  assert.ok(skill.includes('## What I built'), 'journal section: implementation')
  assert.ok(skill.includes('{#d<N>}'), 'decision anchor convention present')
})

test('DECISIONS.md is now a thin index, not the full-format table', () => {
  assert.ok(skill.includes('→ journal.md#d<N>'), 'thin line links the journal anchor')
  assert.ok(skill.includes('[assumption]'), 'assumption tag documented')
  assert.ok(!skill.includes('Question it replaces: <what the human would have been asked>'), 'old full-format block removed')
  assert.ok(!/Options considered: <a> \/ <b> \/ <c>/.test(skill), 'old options/why block removed')
})

test('state layout lists journal.md and marks DECISIONS.md as the index', () => {
  assert.ok(/\|\s*`journal\.md`\s*\|/.test(skill), 'journal.md row in the state table')
  assert.ok(/`DECISIONS\.md`.*thin.*index/i.test(skill), 'DECISIONS.md described as thin index')
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test workflows/__tests__/journal.test.mjs`
Expected: FAIL — all three tests fail (no run-journal section, old full-format block still present, no journal.md row).

- [ ] **Step 3: Replace the "Decision log format" section**

In `skills/autonomous-feature-workflow/SKILL.md`, replace this block:

```markdown
## Decision log format (`DECISIONS.md`)

    ### D<N> — <one-line title>                 [phase <k>] [risk: H|M|L]
    Question it replaces: <what the human would have been asked>
    Options considered: <a> / <b> / <c>
    Chosen: <x>
    Why: <one or two lines>
    Confidence: H|M|L    Reversibility: easy | moderate | rebuild

Risk = confidence x reversibility (rebuild + Low = H). The MR lists decisions
highest-risk first.
```

with:

```markdown
## Run journal (`journal.md`) and decision index (`DECISIONS.md`)

`journal.md` is the durable, human-readable record — a first-person,
chronological journey of the feature from the session's point of view: what I
found, what I understood, then what I decided and WHY, and finally what I built.
Write it INCREMENTALLY as each phase completes (same cadence as `state.md`), so a
mid-run or aborted run still leaves a coherent partial journal. Voice: a
developer's own working notes ("I looked at…", "I decided… because…"). Never a
table.

Sections, appended in pipeline order by the phase that produces the data:

- `## Understanding the code` — phases 1-2: what the readers found, in prose,
  with inline `file:line` evidence; name the sibling pattern being reused.
- `## Questions I answered myself` — phase 2: one `### D<N> — <title> {#d<N>}`
  subsection per self-answered question — the question a human would have been
  asked, the option chosen, and the WHY, in sentences.
- `## Acceptance criteria & the approach I picked` — phases 3-4: the AC in
  brief, then the judge's pick and why it beat the rejected candidates; a
  `### D<N> — <title> {#d<N>}` subsection per AC assumption and one for the pick.
- `## What I built` — phase 6: per TDD step in order — the failing test written,
  the implementation, and the pass/fail evidence; note any non-green step or
  verify concern as part of the story.

`DECISIONS.md` is now a thin INDEX into the journal — one line per decision, no
options/why/confidence prose (that lives in the journal):

    ### Decisions taken on your behalf
    - D<N> — <one-line title>  [phase <k>] [risk: H|M|L] [reversibility: easy|moderate|rebuild] [assumption]  → journal.md#d<N>

Risk = confidence x reversibility (rebuild + Low = H). Lines are appended in
`D<N>` order; the MR re-sorts them highest-risk first. Numbering (`D<N>`) is
continuous across phases and MUST match the journal's `{#d<N>}` anchors 1:1 —
every decision has exactly one thin line and exactly one journal subsection. Tag
rules: `[phase <k>]` is retained so `feature-amend`'s triage can pick its entry
phase; `[assumption]` is present iff the decision was taken by
conservative-default (`source: conservative-default`) or is an AC assumption —
phase 7 builds its `## Assumptions` section from the `[assumption]`-tagged lines.
```

- [ ] **Step 4: Update the state-layout table row**

In the same file, in the state-layout table, replace:

```markdown
| `DECISIONS.md` | phases 2+ (format below) |
```

with:

```markdown
| `journal.md` | phases 1+ (readable journey; format below) |
| `DECISIONS.md` | phases 2+ (thin risk-ranked index into `journal.md`; format below) |
```

- [ ] **Step 5: Run test to verify it passes**

Run: `node --test workflows/__tests__/journal.test.mjs`
Expected: PASS — all three tests green.

- [ ] **Step 6: Commit**

```bash
git add skills/autonomous-feature-workflow/SKILL.md workflows/__tests__/journal.test.mjs
git commit -m "feat(feature-auto): define run journal + thin decision index contract"
```

---

### Task 2: Wire the journal into the phase write-steps

Change phases 1-2, 3-4, and 6 so each writes its `journal.md` section (with `{#d<N>}` anchors) and appends thin `DECISIONS.md` lines, instead of writing full-format decision entries.

**Files:**
- Modify: `skills/autonomous-feature-workflow/SKILL.md` (Phases 1-2 items 3-4; Phases 3-4 item 6; Phase 6 item 3)
- Test: `workflows/__tests__/journal.test.mjs` (add a test)

**Interfaces:**
- Consumes: the four journal section titles, the anchor convention, and the thin-line format from Task 1.
- Produces: per-phase wording that later reviewers and the MR-assembly task (Task 3) rely on — specifically that phase 2's write step appends `## Questions I answered myself` + thin lines, phase 3-4 appends `## Acceptance criteria & the approach I picked` + thin lines, and phase 6 appends `## What I built`.

- [ ] **Step 1: Add the failing test**

Append to `workflows/__tests__/journal.test.mjs`:

```javascript
test('phase write-steps append journal sections instead of full decision entries', () => {
  const p12 = skill.slice(skill.indexOf('## Phases 1-2'), skill.indexOf('## Phases 3-4'))
  assert.ok(p12.includes('## Understanding the code'), 'phase 1-2 writes the understanding section')
  assert.ok(p12.includes('## Questions I answered myself'), 'phase 2 writes the questions section')
  assert.ok(p12.includes('journal.md') && p12.includes('thin'), 'phase 2 appends thin DECISIONS lines')
  assert.ok(!p12.includes('Question it replaces = question'), 'old full-format append wording gone from phase 1-2')

  const p34 = skill.slice(skill.indexOf('## Phases 3-4'), skill.indexOf('## Phase 5'))
  assert.ok(p34.includes('## Acceptance criteria & the approach I picked'), 'phase 3-4 writes the AC+approach section')
  assert.ok(!p34.includes('Options considered = all candidate names'), 'old full-format append wording gone from phase 3-4')

  const p6 = skill.slice(skill.indexOf('## Phase 6'), skill.indexOf('## Phase 7'))
  assert.ok(p6.includes('## What I built'), 'phase 6 writes the implementation section')
})

test('the per-phase decision COUNT contracts survive the rewrite', () => {
  assert.ok(/MUST equal the length of\s*`?clarifications`?/.test(skill), 'clarifications 1:1 count kept')
  assert.ok(/MUST equal the length of\s*`?acAssumptions`?/.test(skill), 'acAssumptions 1:1 count kept')
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test workflows/__tests__/journal.test.mjs`
Expected: FAIL on the two new tests (phase sections not yet in the write-steps; old full-format wording still present).

- [ ] **Step 3: Rewrite Phases 1-2 items 3 and 4**

Replace item 3:

```markdown
3. Write `context-map.md`: one `##` section per reader key (entry-points,
   sibling-pattern, tests, history) — each finding as `**<title>** — <detail>
   [<evidence>]`, then an `Assumptions` list if the reader returned any.
```

with:

```markdown
3. Write `context-map.md`: one `##` section per reader key (entry-points,
   sibling-pattern, tests, history) — each finding as `**<title>** — <detail>
   [<evidence>]`, then an `Assumptions` list if the reader returned any. Also
   append the `journal.md` `## Understanding the code` section: the readers'
   findings woven into first-person prose with inline `file:line` evidence,
   naming the sibling pattern to reuse. (Create `journal.md` here if absent.)
```

Replace item 4:

```markdown
4. Append each `clarifications[]` entry to `DECISIONS.md` in the decision-log
   format: Question it replaces = question; Options considered = options;
   Chosen / Confidence / Reversibility as returned; Why = the returned why
   with ` (source: <source>)` appended; phase tag 2; risk from the formula.
   Count first: the number of new entries MUST equal the length of
   `clarifications` — collapsing or skipping entries is a contract violation.
   Number D<N> continuing from the last entry.
```

with:

```markdown
4. For each `clarifications[]` entry, write ONE `### D<N> — <title> {#d<N>}`
   subsection under the journal's `## Questions I answered myself` section (the
   question the human would have been asked, the chosen option, and the WHY —
   from the returned why with its source — in prose) AND append ONE thin line to
   `DECISIONS.md` (`[phase 2]`, risk from the formula, `[assumption]` iff
   `source: conservative-default`, linking `journal.md#d<N>`). Count first: the
   number of new journal subsections AND the number of new `DECISIONS.md` lines
   MUST each equal the length of `clarifications` and be 1:1 — collapsing or
   skipping entries is a contract violation. Number D<N> continuing from the last.
```

- [ ] **Step 4: Rewrite Phases 3-4 item 6**

Replace item 6:

```markdown
6. Append decisions to `DECISIONS.md`: one entry for EVERY item in
   `acAssumptions` — count them first; the number of new assumption entries
   MUST equal the length of `acAssumptions`, and collapsing similar
   assumptions into one entry is a contract violation (Question it replaces =
   the assumption restated as the question it answers; confidence M unless
   the assumption text states evidence) — plus exactly ONE entry for the
   solution pick (Options considered = all candidate names; Chosen = pick;
   Why = judge's why; Confidence = judge's confidence; Reversibility from
   the pick's nature; risk strictly from the formula).
   Phase tags: 3 on each assumption entry, 4 on the pick entry.
```

with:

```markdown
6. Write the journal's `## Acceptance criteria & the approach I picked` section:
   the AC in brief, then the judge's pick and why it beat each rejected
   candidate, in prose. Then record decisions as journal `### D<N> — <title>
   {#d<N>}` subsections + matching thin `DECISIONS.md` lines, 1:1:
   - one per item in `acAssumptions` — count them first; the number of new
     assumption entries MUST equal the length of `acAssumptions` (collapsing
     similar assumptions into one is a contract violation). Restate each as the
     question it answers; confidence M unless the assumption states evidence;
     `[phase 3]`; always `[assumption]`.
   - exactly ONE for the solution pick: the journal subsection names all
     candidates and gives the judge's why; the thin line is `[phase 4]`, risk
     from the pick's confidence × reversibility, `[assumption]` iff the pick
     came by conservative-default.
```

- [ ] **Step 5: Rewrite Phase 6 item 3**

Replace item 3:

```markdown
3. Write `verify.md`: per-step results (id, status, commit sha, test
   evidence, notes), then the verify block (suitePassed, evidence, concerns).
```

with:

```markdown
3. Write `verify.md`: per-step results (id, status, commit sha, test
   evidence, notes), then the verify block (suitePassed, evidence, concerns).
   Also append the journal's `## What I built` section: per step in order — the
   failing test written, the implementation, and the pass/fail evidence — noting
   any non-green step or verify concern as part of the story.
```

- [ ] **Step 6: Run test to verify it passes**

Run: `node --test workflows/__tests__/journal.test.mjs`
Expected: PASS — all tests green.

- [ ] **Step 7: Commit**

```bash
git add skills/autonomous-feature-workflow/SKILL.md workflows/__tests__/journal.test.mjs
git commit -m "feat(feature-auto): write journal sections + thin decisions in each phase"
```

---

### Task 3: MR assembly surfaces the journal and builds sections from thin tags

Update Phase 7 so the MR's decisions list re-sorts the thin lines by risk, the `## Assumptions` section is built from `[assumption]` tags, and the journal is embedded.

**Files:**
- Modify: `skills/autonomous-feature-workflow/SKILL.md` (Phase 7 item 1)
- Test: `workflows/__tests__/journal.test.mjs` (add a test)

**Interfaces:**
- Consumes: the thin-line tags (`[assumption]`, `[risk]`) and the journal existence from Tasks 1-2.
- Produces: MR-assembly wording; no downstream task depends on it.

- [ ] **Step 1: Add the failing test**

Append to `workflows/__tests__/journal.test.mjs`:

```javascript
test('MR assembly embeds the journal and builds sections from thin tags', () => {
  const p7 = skill.slice(skill.indexOf('## Phase 7'), skill.indexOf('## Phases 1-7'))
  assert.ok(/journal\.md/.test(p7), 'phase 7 references the journal')
  assert.ok(/<details>/.test(p7), 'journal is embedded in a collapsible details block')
  assert.ok(/\[assumption\]/.test(p7), 'assumptions section built from the [assumption] tag')
  assert.ok(!p7.includes('(source: conservative-default)'), 'old source-text heuristic removed from MR assembly')
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test workflows/__tests__/journal.test.mjs`
Expected: FAIL — phase 7 still references `(source: conservative-default)` and lacks the journal `<details>`.

- [ ] **Step 3: Rewrite Phase 7 item 1**

Replace:

```markdown
1. Assemble `mr.md` in exactly this order: (1) what was built, 3-6 lines,
   plus how to try it; (2) `## Decisions taken on your behalf` — every
   DECISIONS.md entry, ordered risk H then M then L; (3) `## Assumptions` —
   every decision whose Why carries `(source: conservative-default)` plus the
   AC assumptions; (4) `## Unresolved items` — capped review findings,
   failed/skipped steps, verify concerns (omit section if none); (5)
   collapsible `<details>` sections for the AC, vertical plan, and horizontal
   plan; (6) test & verify evidence from `verify.md`; (7) footer: how to
   amend (`/feature-amend <slug> "<feedback>"`).
```

with:

```markdown
1. Assemble `mr.md` in exactly this order: (1) what was built, 3-6 lines,
   plus how to try it; (2) `## Decisions taken on your behalf` — every
   `DECISIONS.md` thin line, re-sorted risk H then M then L, each linking its
   `journal.md#d<N>` anchor; (3) `## Assumptions` — every `DECISIONS.md` line
   tagged `[assumption]` (linking its journal anchor); (4) `## Unresolved items`
   — capped review findings, failed/skipped steps, verify concerns (omit section
   if none); (5) collapsible `<details>` sections for the run journal
   (`journal.md`), the AC, vertical plan, and horizontal plan; (6) test & verify
   evidence from `verify.md`; (7) footer: how to amend
   (`/feature-amend <slug> "<feedback>"`).
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test workflows/__tests__/journal.test.mjs`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add skills/autonomous-feature-workflow/SKILL.md workflows/__tests__/journal.test.mjs
git commit -m "feat(feature-auto): MR embeds the journal, builds sections from thin tags"
```

---

### Task 4: Align the amending workflow with the thin index + journal

`feature-amend` reads `DECISIONS.md` by D-number/phase tag and appends amend decisions. Update it to keep working against thin lines and to regenerate the journal subsections it touches.

**Files:**
- Modify: `skills/amending-feature-workflow/SKILL.md` (Steps 1 and 3)
- Test: `workflows/__tests__/journal.test.mjs` (add a test)

**Interfaces:**
- Consumes: the thin-line format (with `[phase <k>]` and `[amend A<n>]` tags) and the journal anchor convention from Task 1.
- Produces: nothing downstream.

- [ ] **Step 1: Add the failing test**

Append to `workflows/__tests__/journal.test.mjs`:

```javascript
const amend = readFileSync(join(repoRoot, 'skills/amending-feature-workflow/SKILL.md'), 'utf8')

test('amend regenerates journal subsections alongside thin decision lines', () => {
  assert.ok(amend.includes('journal.md'), 'amend references the journal')
  assert.ok(/\{#d<N>\}|journal\.md#d/.test(amend), 'amend regenerates the journal anchor/subsection')
  assert.ok(amend.includes('[amend A<n>]'), 'amend keeps its amend tag on the thin line')
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test workflows/__tests__/journal.test.mjs`
Expected: FAIL — `amending-feature-workflow/SKILL.md` does not mention `journal.md`.

- [ ] **Step 3: Update triage Step 1 (rationale now lives in the journal)**

In `skills/amending-feature-workflow/SKILL.md`, in Step 1, replace:

```markdown
1. **Triage (inline — this is orchestration, not phase work).** Read
   `state.md`, `DECISIONS.md`, and the feedback. Determine:
```

with:

```markdown
1. **Triage (inline — this is orchestration, not phase work).** Read
   `state.md`, `DECISIONS.md` (thin index — each line's `[phase <k>]` tag drives
   entry-phase selection; the full rationale for a decision is in its
   `journal.md#d<N>` subsection — read it there), and the feedback. Determine:
```

- [ ] **Step 4: Update Step 3 to regenerate journal subsections**

Replace (note "Overwrite" is mid-line, preceded by "amended docs. " — include that prefix so the match is exact):

```markdown
   amended docs. Overwrite the regenerated docs in place. Append any new
   decisions to `DECISIONS.md` tagged `[amend A<n>]`, numbered after the last.
   Skip phases before entryPhase entirely.
```

with:

```markdown
   amended docs. Overwrite the regenerated docs in place — including rewriting the affected
   `journal.md` `### D<N> — <title> {#d<N>}` subsections for the re-run phases.
   Append any new decisions as a journal subsection PLUS a thin `DECISIONS.md`
   line, both tagged `[amend A<n>]` and numbered after the last. Skip phases
   before entryPhase entirely.
```

- [ ] **Step 5: Run test to verify it passes**

Run: `node --test workflows/__tests__/journal.test.mjs`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add skills/amending-feature-workflow/SKILL.md workflows/__tests__/journal.test.mjs
git commit -m "feat(feature-amend): align amend flow with thin index + journal"
```

---

### Task 5: Bump the plugin version and lock manifest consistency

Bump vn-toolkit `2.1.0` → `2.2.0` in both manifests (three occurrences) and add a test that the three version strings always agree.

**Files:**
- Modify: `.claude-plugin/plugin.json` (line 4), `.claude-plugin/marketplace.json` (lines 9 and 16)
- Test: `workflows/__tests__/journal.test.mjs` (add a test)

**Interfaces:**
- Consumes: nothing.
- Produces: nothing downstream.

- [ ] **Step 1: Add the failing test**

Append to `workflows/__tests__/journal.test.mjs`:

```javascript
test('plugin manifests all declare the same, bumped version', () => {
  const plugin = JSON.parse(readFileSync(join(repoRoot, '.claude-plugin/plugin.json'), 'utf8'))
  const market = JSON.parse(readFileSync(join(repoRoot, '.claude-plugin/marketplace.json'), 'utf8'))
  const marketVersions = JSON.stringify(market).match(/"version":\s*"[^"]+"/g) || []
  assert.equal(plugin.version, '2.2.0', 'plugin.json bumped to 2.2.0')
  marketVersions.forEach(v => assert.ok(v.includes('2.2.0'), `marketplace version agrees: ${v}`))
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test workflows/__tests__/journal.test.mjs`
Expected: FAIL — versions are still `2.1.0`.

- [ ] **Step 3: Bump `plugin.json`**

In `.claude-plugin/plugin.json`, change `"version": "2.1.0",` to `"version": "2.2.0",`.

- [ ] **Step 4: Bump `marketplace.json`**

In `.claude-plugin/marketplace.json`, change BOTH occurrences of `"version": "2.1.0"` (lines ~9 and ~16) to `"version": "2.2.0"`.

- [ ] **Step 5: Run the full test suite**

Run: `node --test workflows/__tests__/`
Expected: PASS — the new `journal.test.mjs` and all pre-existing tests (`skill-gate`, `command-wording`, `decide-ac`, `plan-review-once`, `implement-single-job`) green, confirming no contract regressed.

- [ ] **Step 6: Commit**

```bash
git add .claude-plugin/plugin.json .claude-plugin/marketplace.json workflows/__tests__/journal.test.mjs
git commit -m "chore(vn-toolkit): bump to 2.2.0 for run-journal change"
```

---

## Self-Review

**Spec coverage:**
- Artifact 1 (`journal.md`, four sections, incremental, first-person) → Tasks 1 (contract) + 2 (per-phase writes) + Task 2 step 5 (implementation section). ✓
- Artifact 2 (thin `DECISIONS.md` index, `[phase]`/`[assumption]` tags, 1:1 anchors) → Task 1 (format) + Task 2 (per-phase lines + count contracts). ✓
- Single source of truth / 1:1 correspondence → enforced by the count-contract test in Task 2 and stated in Global Constraints. ✓
- Artifact 3 (MR: risk-sorted decisions, assumptions from tags, embedded journal) → Task 3. ✓
- Files that change: autonomous SKILL.md → Tasks 1-3; amending SKILL.md → Task 4; both manifests → Task 5. ✓
- Out-of-scope items (no workflow-script edits, no gated-workflow change, no raw-transcript capture) → honored; Global Constraints forbids `workflows/*.js` edits. ✓

**Placeholder scan:** No "TBD"/"handle edge cases"/"similar to Task N" — every edit shows verbatim old and new text and every test shows full code. ✓

**Type/string consistency:** The four journal section titles, the anchor form `### D<N> — <title> {#d<N>}`, and the thin-line tags (`[phase <k>]`, `[assumption]`, `→ journal.md#d<N>`) are written identically in the contract (Task 1), the per-phase edits (Task 2), the MR assembly (Task 3), and every asserting test. ✓
