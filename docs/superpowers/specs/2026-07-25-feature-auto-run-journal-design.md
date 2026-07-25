# Design: readable run journal for `/feature-auto`

Date: 2026-07-25
Status: approved for planning

## Problem

`/feature-auto` runs the feature pipeline autonomously and records what it did
in `DECISIONS.md` — a dense, structured decision table. In practice that table
is hard to get value from:

1. Too many decisions, tedious to read through.
2. Not readable — it is a lookup table, not a story.

What the user actually wants is to read the **journey of the feature from the
session's point of view**: step by step, what was found, what was understood,
then what decision was taken and **why** — including what was built. Something
you open and read top-to-bottom whenever you like, closer to what `/export`
gives than to a decision table.

## Key constraint discovered

Almost all real reasoning in `/feature-auto` happens inside background
**workflow subagents** (the four context readers, the self-clarify agent, the
solution panel + judge, the implementer). Those subagents are forced into
**structured JSON output**, and their raw transcripts live only in ephemeral
`agent-*.jsonl` files that are never copied into `docs/scratch/`. So the literal
subagent "thinking" is not durably available and is mostly JSON anyway.

The orchestrator (main session), however, already holds every structured return
value it uses to build `DECISIONS.md` today (`findings[].detail`/`evidence`,
`clarifications[]`, `ac`, `judge`, per-step verify results). That structured
data is rich enough to render as a first-person narrative. **The journal is
therefore a rendering change at the orchestrator level — no workflow-script
changes are required.**

## Solution overview

Replace the dense decision table as the thing-you-read with a **first-person,
per-phase prose journal** written incrementally as each phase completes. Keep a
**thin, risk-ranked decisions index** that links into the journal, so the MR
review package still has a scannable at-a-glance risk list.

Two renderings, one source of truth (the structured workflow returns):

- `journal.md` — prose journey, what you read.
- `DECISIONS.md` — one line per decision, for scanning + review, anchors into
  the journal.

## Artifact 1 — `journal.md` (new, primary)

First-person, chronological, written **incrementally as each phase completes**
(same cadence as `state.md` today) so a mid-run or dead run still leaves a
readable partial journal. Voice matches a developer's own working notes
("I looked at…", "I decided… because…").

Section order = the pipeline's journey:

- `## Understanding the code` — what the four readers found, woven into prose
  from their `findings[].detail` + `evidence` (inline `file:line` refs, not a
  table). Include what the run decided to reuse (the sibling pattern).
- `## Questions I answered myself` — for each self-clarification: the question a
  human would have been asked, the option chosen, and the **why**, in sentences.
  Every decision carries an anchor: `### D<N> — <title> {#d<N>}`.
- `## Acceptance criteria & the approach I picked` — the AC in brief, then the
  judge's pick and why it beat the rejected candidates.
- `## What I built` — per TDD step, in order: the failing test written, the
  implementation, and the pass/fail evidence (rendered from `verify.md` data).
  Note any non-green step or verify concern here as part of the story.

Each `## ` section is appended by the phase that produces its data. A phase that
does not run (script missing / early stop) simply leaves its section absent —
the journal ends where the run ended.

## Artifact 2 — `DECISIONS.md` (shrinks to a thin index)

One line per decision, no `Options considered` / `Why` / `Confidence` blocks
(those now live as prose in the journal):

    ### Decisions taken on your behalf
    - D<N> — <one-line title>  [phase <k>] [risk: H|M|L] [reversibility: easy|moderate|rebuild] [assumption]  → journal.md#d<N>

Appended in `D<N>` order (i.e. phase/append order, as today); the **MR** re-sorts
these highest-risk first (risk formula unchanged: `confidence x reversibility`,
`rebuild + Low = H`). Purpose: the scannable risk list for reviewers and the
link surface into the journal. Numbering (`D<N>`) stays continuous across phases,
exactly as today, and the anchors in `journal.md` use the same numbers.

The tags carry exactly what downstream consumers need from the line alone:

- `[phase <k>]` — retained because `feature-amend`'s triage picks its entry
  phase by scanning these tags. Unchanged from today.
- `[assumption]` — present iff the decision was taken by conservative-default
  (i.e. `source: conservative-default`, not derived from code), plus on every AC
  assumption. This replaces today's "the `Why` text contains
  `(source: conservative-default)`" heuristic: with the prose gone from
  `DECISIONS.md`, phase 7 builds its `## Assumptions` section from the
  `[assumption]`-tagged lines. The source rationale itself lives in the journal.

## Single source of truth

Per phase, the orchestrator renders **both** files from the same structured
workflow return values it already consumes:

- journal section = prose rendering of that phase's data (with a `{#d<N>}`
  anchor per decision).
- `DECISIONS.md` line(s) = one risk-ranked one-liner per decision, pointing at
  the matching anchor.

No new data is produced and no data is duplicated in a way that can drift: the
`why` lives once (as prose, in the journal); `DECISIONS.md` never repeats it.
The per-phase count contracts stay (one decision entry per `clarifications[]`
item, per `acAssumptions` item, one for the solution pick) — they now govern
both the journal decision anchors and the `DECISIONS.md` lines, which must be
1:1 with each other.

## Artifact 3 — MR description (phase 7)

The `## Decisions taken on your behalf` section becomes the thin list re-sorted
highest-risk first (the `DECISIONS.md` content, linking journal anchors). The
`## Assumptions` section is built from the `[assumption]`-tagged lines. The top-3
highest-risk decisions stay inline in the session report. The journal is embedded
in a collapsible `<details>` section (alongside AC / vertical / horizontal plan).

## Files that change

All orchestration wording, no new scripts:

- `skills/autonomous-feature-workflow/SKILL.md`
  - State-layout table: add `journal.md` (written by every phase 1+); note
    `DECISIONS.md` is now the thin index.
  - Phases 2, 3–4, 5, 6 "write" steps: append the phase's `journal.md` section
    and the thin `DECISIONS.md` line(s), instead of writing full decision-log
    entries.
  - "Decision log format" section: replace the full block format with the thin
    one-liner format + the journal section/anchor conventions.
  - Phase 7 MR assembly: thin decisions list + embedded/linked journal.
  - Hard-rules / file-list: `journal.md` is an allowed named scratch file.
- `skills/amending-feature-workflow/SKILL.md` — matching note: an amend re-runs
  affected phases and rewrites the affected journal sections + decision lines.
- Both `.claude-plugin` manifests — bump the vn-toolkit version (per project
  convention for any skill change).

## Out of scope (YAGNI)

- Capturing/rendering raw subagent `agent-*.jsonl` transcripts. The subagents
  emit structured JSON, not free-form thinking, so a verbatim transcript would
  be low-value noise; the prose journal derived from their returns is the useful
  artifact.
- Any change to the workflow scripts (`understand.js`, `decide.js`,
  `plan-and-review.js`, `implement.js`, `preflight.js`).
- Changing the gated `feature-workflow` (this is `/feature-auto`-specific;
  `feature-amend` gets only the matching note).

## Success criteria

- After a `/feature-auto` run, `journal.md` reads as a coherent first-person
  story of the feature from understanding → decisions (with why) → build.
- It can be opened and read mid-run (partial but coherent).
- `DECISIONS.md` is a one-line-per-decision risk-ranked index whose anchors
  resolve into `journal.md`.
- The MR review package still surfaces the risk-ranked decisions and links the
  journal.
- No workflow script changed; both artifacts derive from the existing
  structured returns with a 1:1 decision correspondence.
