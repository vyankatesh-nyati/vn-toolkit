---
description: Run the feature pipeline autonomously with one plan-approval gate before implementation, decisions logged, ends in a draft MR (vn-toolkit, experimental)
argument-hint: <feature description or ticket id>
---

Use the `autonomous-feature-workflow` skill to build the following feature
autonomously except for one plan-approval gate. I consent to the run: fetch the
ticket if an id is given, run the phase workflows, decide on my behalf using
conservative defaults, log every decision and assumption; then STOP after the plan
and review phase and wait for me to approve the plan before any code is written.
Once I approve, implement via TDD on a feature branch, then push that branch (never
main, never force) and raise a DRAFT MR via glab. The permitted stops are a phase-0
abort on blocking ambiguity and the plan-approval gate.

Feature: $ARGUMENTS
