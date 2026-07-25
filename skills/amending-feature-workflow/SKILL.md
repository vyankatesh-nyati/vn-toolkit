---
name: amending-feature-workflow
description: Use when the user invokes /feature-amend or asks to correct/revise a feature an autonomous /feature-auto run already produced — feeding back a change against its decisions, AC, plan, or implementation. Not for a fresh feature (use autonomous-feature-workflow) or a normal edit.
---

# Amending Feature Workflow

## Overview

Re-enters a prior /feature-auto run at the earliest phase the feedback affects,
regenerates downstream artifacts, applies the change as ADDITIVE commits (never
force-push), and refreshes the MR. Reuses the same phase workflow scripts and
the state under `docs/scratch/<slug>/`. The user consents to the whole re-run
(and the branch push) by invoking /feature-amend.

**Core principle: change only what the feedback reaches.** Phases before the
entry phase are untouched inputs. Never re-run the whole pipeline.

## Preconditions

Read `docs/scratch/<slug>/state.md`. If it does not exist or shows no run for
the slug, report that and stop — there is nothing to amend.

## Steps

1. **Triage (inline — this is orchestration, not phase work).** Read
   `state.md`, `DECISIONS.md` (thin index — each line's `[phase <k>]` tag drives
   entry-phase selection; the full rationale for a decision is in its
   `journal.md#d<N>` subsection — read it there), and the feedback. Determine:
   - which decision(s) the feedback overturns or invalidates (by D-number);
   - `entryPhase` = the earliest phase among those decisions' `[phase k]` tags
     (feedback about wording/scope → phase 2; about the acceptance contract →
     phase 3; about which solution → phase 4; about the plan, steps, or
     implementation → phase 5). Phase 5 is the floor: anything that touches code
     re-runs the plan first, so there is always a fresh plan to diff. (Pure
     cosmetic code tweaks that would not change the plan at all are out of v1
     scope — see step 4.)
   - `correction` = one authoritative sentence restating the desired outcome.
   If the feedback is ambiguous about which decision it targets, pick the
   earliest plausible phase (re-running more is safe; missing the real one is not).

2. **Inject.** Append to `brief.md`:
   `## Amendments (authoritative — override any earlier derivation that conflicts)`
   (create once), then a numbered line `A<n>: <correction> (feedback: "<verbatim>")`.

3. **Snapshot the plan, then re-run entryPhase..5.** FIRST, before regenerating
   anything, copy `horizontal-plan.json` → `horizontal-plan.prev.json` (phase 6
   needs the prior plan to diff; regenerating first would destroy it). Then
   re-run entryPhase..5 with the SAME Workflow scripts and args the forward
   pipeline uses (see autonomous-feature-workflow phases 1-5), reading the
   amended docs. Overwrite the regenerated docs in place — including rewriting the affected
   `journal.md` `### D<N> — <title> {#d<N>}` subsections for the re-run phases.
   Append any new decisions as a journal subsection PLUS a thin `DECISIONS.md`
   line, both tagged `[amend A<n>]` and numbered after the last. Skip phases
   before entryPhase entirely.

4. **Phase 6 — additive.** Diff the new `horizontal-plan.json` against
   `horizontal-plan.prev.json` (snapshotted in step 3). A step is CHANGED if its id is new, or its
   `redCode`/`greenCode`/`files` differ from the prior step of the same id.
   **If NO step changed** (the amendment did not alter the plan): do NOT invoke
   `implement.js` (it rejects an empty step list by design). Record in
   `state.md` and the MR that the amendment produced no implementation change —
   a pure code-only tweak is out of v1 scope; apply it directly — then go to
   phase 7. Otherwise invoke `implement.js` with args `{ steps: <changed steps only>, repoRoot,
   branch: feature/<slug>, amendMode: true, amendNote: <this amendment's correction> }`.
   Steps present in the prior plan but absent from the new one → record each as
   an MR unresolved item ("step <id> removed by amendment A<n>; its committed
   code may be stale — verify"). Write `verify.md` from the result.

5. **Phase 7 — re-deliver.** Rebuild `mr.md` (autonomous-feature-workflow phase 7
   assembly), adding an `## Amendment history` section (each A<n>, its feedback,
   entry phase, decisions revised). Push the branch fast-forward (never force);
   if remote+glab present, `glab mr update --description-file docs/scratch/<slug>/mr.md`
   and post a comment summarizing the amendment; else report the refreshed mr.md
   path. Update `state.md` (record the amendment, bump MR status).

## Hard rules

- Never force-push; amend commits are additive, pushes fast-forward only.
- Never re-run a phase earlier than entryPhase.
- `docs/scratch/` stays uncommitted.
- Every regenerated decision carries its `[amend A<n>]` tag; the MR's amendment
  history is the audit trail of what changed and why.
