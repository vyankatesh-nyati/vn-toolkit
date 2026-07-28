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

**Autonomy contract: two stops only — the phase-0 abort and the plan-approval
gate after phase 5.** Between them, never stop to ask: every would-be question
becomes a logged decision with a conservative default (reversible, smallest
scope, consistent with the sibling pattern). Once the plan-approval gate is
cleared, run to the draft MR without stopping again.

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
| `journal.md` | phases 1+ (readable journey; format below) |
| `DECISIONS.md` | phases 2+ (thin risk-ranked index into `journal.md`; format below) |
| `context-map.md` | phases 1-2 |
| `ac.md` | phase 3 |
| `solutions.md` | phase 4 |
| `vertical-plan.md`, `horizontal-plan.md`, `horizontal-plan.json` | phase 5 |
| `review-findings.md` | phase 5, only if the review loop left open findings |
| `verify.md` | phase 6 |
| `mr.md` | phase 7 |

All later-phase files are now enumerated above.

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
   [<evidence>]`, then an `Assumptions` list if the reader returned any. Also
   append the `journal.md` `## Understanding the code` section: the readers'
   findings woven into first-person prose with inline `file:line` evidence,
   naming the sibling pattern to reuse. (Create `journal.md` here if absent.)
4. For each `clarifications[]` entry, write ONE `### D<N> — <title> {#d<N>}`
   subsection under the journal's `## Questions I answered myself` section (the
   question the human would have been asked, the chosen option, and the WHY —
   from the returned why with its source — in prose) AND append ONE thin line to
   `DECISIONS.md` (`[phase 2]`, risk and `[reversibility]` from the returned
   values, `[assumption]` iff `source: conservative-default`, linking
   `journal.md#d<N>`). Count first: the
   number of new journal subsections AND the number of new `DECISIONS.md` lines
   MUST equal the length of `clarifications` and be 1:1 with each other —
   collapsing or skipping entries is a contract violation. Number D<N>
   continuing from the last.
5. Update `state.md` (phases 1-2 DONE); continue to phase 3.

## Phases 3-4 — decide (`decide.js`)

1. Script-existence check per Phases 1-7 rules.
2. Invoke: scriptPath = `<plugin workflows dir>/decide.js`, args =
   `{ requirement, briefPath, contextMapPath: docs/scratch/<slug>/context-map.md,
   repoRoot }`. Wait for the result.
3. Write `ac.md` (exactly this filename — do not create any other AC
   document) = the returned `ac` markdown.
4. Write `solutions.md`: every candidate with its four scores, details, and
   assumptions; then `## Judge` with the pick, why, confidence, and each
   rejected candidate's reason.
5. Validate `judge.pick`: it MUST exactly match one returned candidate name.
   No match → the decide run is invalid; re-invoke decide.js once; if it
   still mismatches, record the run as failed in `state.md` and STOP — never
   proceed on an invented pick.
6. Write the journal's `## Acceptance criteria & the approach I picked` section:
   the AC in brief, then the judge's pick and why it beat each rejected
   candidate, in prose. Then record decisions as journal `### D<N> — <title>
   {#d<N>}` subsections + matching thin `DECISIONS.md` lines, 1:1:
   - one per item in `acAssumptions` — count them first; the number of new
     assumption entries MUST equal the length of `acAssumptions` (collapsing
     similar assumptions into one is a contract violation). Restate each as the
     question it answers; confidence M unless the assumption states evidence;
     `[phase 3]`; reversibility from the assumption's nature; always
     `[assumption]`.
   - exactly ONE for the solution pick: the journal subsection names all
     candidates and gives the judge's why; the thin line is `[phase 4]`, risk
     and `[reversibility]` from the pick's confidence × reversibility,
     `[assumption]` iff the pick came by conservative-default.
7. If judge confidence is L: record `TOP REVIEW ITEM: solution pick (LOW
   confidence)` in `state.md`, and apply the conservative bias — every later
   sub-decision prefers the most conservative variant.
8. Update `state.md` (phases 3-4 DONE); continue to phase 5.

## Phase 5 — plan and review (`plan-and-review.js`)

1. Script-existence check per Phases 1-7 rules.
2. Invoke: scriptPath = `<plugin workflows dir>/plan-and-review.js`, args =
   `{ requirement, briefPath, contextMapPath, acPath: docs/scratch/<slug>/ac.md,
   solutionsPath: docs/scratch/<slug>/solutions.md, repoRoot }`.
3. Write `vertical-plan.md` = the returned `verticalPlan`. Write
   `horizontal-plan.json` = the returned `steps` array as JSON, exactly as
   returned (this is phase 6's input — do not edit it). Write
   `horizontal-plan.md` = a human rendering: per step a `## <id> — <title>`
   section with files, RED code block, run+expectFail, GREEN code block,
   run+expectPass, commit message, dependsOn.
4. If `openFindings` is non-empty, write them into `review-findings.md` (a
   single review pass found them and one fix pass was applied — the human
   verifies them at the plan-approval gate below).
5. Update `state.md` (phase 5 DONE); continue to the plan-approval gate.

## Plan-approval gate (after phase 5)

The one stop between phase 0 and delivery. Phase 6 does NOT start until the
human approves the plan.

1. Update `state.md`: `phase 5 DONE — awaiting plan approval`.
2. Present to the user, in the session: a 3-6 line summary of the plan (what
   will be built; step count), the paths to `vertical-plan.md` and
   `horizontal-plan.md`, and any `openFindings`. Ask them to approve or request
   changes.
3. STOP and wait for the user's reply. Never start phase 6 on silence or a
   vague reply.
   - Approval (e.g. "approved", "go", "lgtm") → continue to phase 6.
   - Change request → re-run phase 5 ONCE with the feedback (same
     `plan-and-review.js` invocation, the feedback appended to the requirement),
     overwrite the plan docs, then return to step 1 of this gate. Loop until
     approved.
4. Cross-session resume: if the session ended at this gate, a later
   re-invocation with the same slug reads `state.md`, sees `awaiting plan
   approval`, and re-presents the plan — it never auto-implements.

## Phase 6 — implement (`implement.js`)

1. Script-existence check per Phases 1-7 rules.
2. Invoke: scriptPath = `<plugin workflows dir>/implement.js`, args =
   `{ planPath: docs/scratch/<slug>/horizontal-plan.json, repoRoot,
   branch: feature/<slug> }`. Pass the PATH: do NOT read `horizontal-plan.json`
   into the session and do NOT inline its steps into `args`. The plan carries
   complete generated code (tens of KB); re-emitting it costs the whole plan in
   output tokens and risks truncating or mangling the very code the run
   depends on. The implement agent reads the file itself.
3. Write `verify.md`: per-step results (id, status, commit sha, test
   evidence, notes), then the verify block (suitePassed, evidence, concerns).
   Also append the journal's `## What I built` section: per step in order — the
   failing test written, the implementation, and the pass/fail evidence — noting
   any non-green step or verify concern as part of the story.
4. Any non-green step or verify concern is an unresolved item for the MR.
   If NO step reached green, record the run as failed in `state.md` and STOP
   — there is nothing to deliver.
5. Update `state.md` (phase 6 DONE); continue.

## Phase 7 — deliver (orchestrated inline)

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
2. `git -C <repo> remote get-url origin` — no remote? Report "no remote —
   draft-MR description ready at docs/scratch/<slug>/mr.md", update
   `state.md` (phase 7 DONE, MR: none — no remote), and STOP gracefully.
3. Push ONLY the feature branch: `git push -u origin feature/<slug>`. Never
   main. Never force. This push is authorized solely by the /feature-auto
   invocation.
4. `glab auth status` — not authenticated or glab missing? Report the mr.md
   path as in step 2 and STOP gracefully. Otherwise:
   `glab mr create --draft --title "feature/<slug>: <brief goal>"
   --description-file docs/scratch/<slug>/mr.md --source-branch
   feature/<slug>`.
5. Update `state.md` (phase 7 DONE, MR: <url>). Report to the user: the MR
   url and the top-3 highest-risk decisions inline.

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
| 5 plans + single review | `plan-and-review.js` | — (plan-approval gate kept, see above) |
| 6 implement + verify | `implement.js` | code go-ahead |
| 7 deliver: push + draft MR | orchestrated inline | push approval |

Resume: re-invoked with the same slug, read `state.md` and continue from the
first incomplete phase.

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

## Hard rules

- Two stops only: the phase-0 abort and the plan-approval gate after phase 5.
  Between and after them: decisions, never questions.
- Writing an assumption down does not authorize proceeding. A gap is only
  buildable when the classifier returned a non-blocking verdict for it;
  "I documented the assumption" on a blocking unknown is the exact failure
  this phase exists to prevent.
- Branch only; draft MR only; never main; never force-push.
- `docs/scratch/` stays uncommitted.
- Everything scratch; the MR description is the durable review package.
- Write into `docs/scratch/<slug>/` only the files the phases name — never a
  variant filename or an additional document.
