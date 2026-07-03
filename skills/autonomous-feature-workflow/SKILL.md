---
name: autonomous-feature-workflow
description: Use when the user invokes /feature-auto or explicitly asks to build a feature end-to-end autonomously — no approval gates, decisions taken on their behalf, ending in a draft MR. Not for the gated interactive pipeline (use feature-workflow), a lone bug fix, or a one-line change.
---

# Autonomous Feature Workflow

## Overview

Runs the feature pipeline with no human in the loop. Input: a requirement (free
text or Jira ticket-id). Output: a pushed feature branch and a draft GitLab MR
whose description carries every decision, assumption, and question the human
would have seen at the gates. The user consents to the entire run — workflow
invocations and the final scoped branch push included — by invoking /feature-auto.

**Autonomy contract: phase 0 is the ONLY abort point.** After it passes, never
stop to ask. Every would-be question becomes a logged decision with a
conservative default: reversible, smallest scope, consistent with the sibling
pattern.

## State layout

Everything lives under `docs/scratch/<slug>/` in the TARGET repo and is never
committed (ensure `docs/scratch/` is in `.git/info/exclude`; add it if absent).
`<slug>` = lowercased ticket-id if one was given, else the ask's first 4-6 words
kebab-cased (e.g. "Add a completeTodo(id) function to src/todo.js…" →
`add-a-completetodo-id-function` — derive from the ask verbatim, do not invent
a nicer name).

| File | Written by |
|---|---|
| `state.md` | every phase — phase pointer, branch, MR url |
| `brief.md` | phase 0 |
| `QUESTIONS.md` | phase 0, abort path only |
| `DECISIONS.md` | phases 2+ (format below) |
| `context-map.md` | phases 1-2 |
| `ac.md` | phase 3 |
| `solutions.md` | phase 4 |

Later-phase files (plans, verify, mr) are added by the phase that owns them.

## Phase 0 — pre-flight

1. If the argument matches a ticket-id pattern (e.g. `ABC-123`), fetch the issue
   via the Atlassian MCP tools (summary, description, comments, linked issues)
   and use that as the requirement text; otherwise use the argument verbatim.
2. Derive `<slug>`; create `docs/scratch/<slug>/`.
3. Invoke the Workflow tool with
   `scriptPath: <this skill's base directory>/../../workflows/preflight.js` and
   `args: { requirement: <text> }`. Wait for its result.
4. `verdict: "abort"` → write `brief.md` (the returned brief, unknowns annotated
   with their classifications) and `QUESTIONS.md` (one section per blocking
   unknown: the question, the concrete options, the classifier's rationale);
   write `state.md` with phase 0 = ABORTED; report the questions to the user and
   STOP. Do not create a branch. Do not proceed on any rationalization —
   "probably means X", "I can guess this one", "asking later is cheaper" are the
   failure modes this phase exists to prevent.
5. `verdict: "proceed"` → write `brief.md` (defaultable unknowns listed with
   classification + options), create branch `feature/<slug>`, write `state.md`
   with phase 0 = DONE, continue to phase 1.

## Phases 1-2 — understand (`understand.js`)

1. Script-existence check per Phases 1-7 rules.
2. Invoke the Workflow tool: scriptPath = `<plugin workflows dir>/understand.js`,
   args = `{ requirement: <text>, briefPath: docs/scratch/<slug>/brief.md,
   repoRoot: <target repo root> }`. Wait for the result.
3. Write `context-map.md`: one `##` section per reader key (entry-points,
   sibling-pattern, tests, history) — each finding as `**<title>** — <detail>
   [<evidence>]`, then an `Assumptions` list if the reader returned any.
4. Append each `clarifications[]` entry to `DECISIONS.md` in the decision-log
   format: Question it replaces = question; Options considered = options;
   Chosen / Why / Confidence / Reversibility as returned; phase tag 2; risk
   from the formula. Number D<N> continuing from the last entry.
5. Update `state.md` (phases 1-2 DONE); continue to phase 3.

## Phases 3-4 — decide (`decide.js`)

1. Script-existence check per Phases 1-7 rules.
2. Invoke: scriptPath = `<plugin workflows dir>/decide.js`, args =
   `{ requirement, briefPath, contextMapPath: docs/scratch/<slug>/context-map.md,
   repoRoot }`. Wait for the result.
3. Write `ac.md` (exactly this filename — do not create any other AC
   document) = the returned `ac` markdown; if `acOpenFindings` is non-empty,
   append them under `## Unresolved review findings` (each: issue → fix).
4. Write `solutions.md`: every candidate with its four scores, details, and
   assumptions; then `## Judge` with the pick, why, confidence, and each
   rejected candidate's reason.
5. Append decisions to `DECISIONS.md`: one entry for EVERY item in
   `acAssumptions` — count them first; the number of new assumption entries
   MUST equal the length of `acAssumptions`, and collapsing similar
   assumptions into one entry is a contract violation (Question it replaces =
   the assumption restated as the question it answers; confidence M unless
   the assumption text states evidence) — plus exactly ONE entry for the
   solution pick (Options considered = all candidate names; Chosen = pick;
   Why = judge's why; Confidence = judge's confidence; Reversibility from
   the pick's nature; risk strictly from the formula).
6. If judge confidence is L: record `TOP REVIEW ITEM: solution pick (LOW
   confidence)` in `state.md`, and apply the conservative bias — every later
   sub-decision prefers the most conservative variant.
7. Update `state.md` (phases 3-4 DONE); continue to phase 5.

## Phases 1-7

**The orchestrator NEVER executes a phase inline.** Phases 1-6 run ONLY via
the Workflow tool; your job is invoking scripts, writing state, and applying
judgment between phases. Doing a phase's work yourself — analyzing
requirements, writing acceptance criteria or plans, writing or editing
production code — is a contract violation even when the work looks easy and
you are confident you'd do it well.

Before each phase, check that its script exists
(`ls <plugin workflows dir>/<script>`, where `<plugin workflows dir>` = `<this skill's base directory>/../../workflows/` — the same resolution phase 0 uses). Missing script → the pipeline ends
here BY DESIGN (phases ship incrementally): stop, update `state.md`, report
the last completed phase. Do not substitute yourself for the missing script.

Red flags — any of these means you skipped the script check: enumerating
clarifying questions, writing Given/When/Then, comparing solution options,
writing code or tests in the target repo.

| Phase | Script | Replaces gate |
|---|---|---|
| 1 context map | `understand.js` | — |
| 2 self-clarification | `understand.js` | clarifying Q&A |
| 3 acceptance criteria | `decide.js` | AC confirmation |
| 4 solution panel + judge | `decide.js` | solution pick |
| 5 plans + review loops | `plan-and-review.js` | plan approvals |
| 6 implement + verify | `implement.js` | code go-ahead |
| 7 deliver: push + draft MR | orchestrated inline | push approval |

Resume: re-invoked with the same slug, read `state.md` and continue from the
first incomplete phase.

## Decision log format (`DECISIONS.md`)

    ### D<N> — <one-line title>                 [phase <k>] [risk: H|M|L]
    Question it replaces: <what the human would have been asked>
    Options considered: <a> / <b> / <c>
    Chosen: <x>
    Why: <one or two lines>
    Confidence: H|M|L    Reversibility: easy | moderate | rebuild

Risk = confidence x reversibility (rebuild + Low = H). The MR lists decisions
highest-risk first.

## Hard rules

- Phase 0 abort is the only stop. Afterwards: decisions, never questions.
- Writing an assumption down does not authorize proceeding. A gap is only
  buildable when the classifier returned a non-blocking verdict for it;
  "I documented the assumption" on a blocking unknown is the exact failure
  this phase exists to prevent.
- Branch only; draft MR only; never main; never force-push.
- `docs/scratch/` stays uncommitted.
- Everything scratch; the MR description is the durable review package.
- Write into `docs/scratch/<slug>/` only the files the phases name — never a
  variant filename or an additional document.
