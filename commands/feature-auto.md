---
description: Run the feature pipeline autonomously — no gates, decisions logged, ends in a draft MR (vn-toolkit, experimental)
argument-hint: <feature description or ticket id>
---

Use the `autonomous-feature-workflow` skill to build the following feature with no
approval gates. I consent to the full run: fetch the ticket if an id is given, run
the phase workflows, decide on my behalf using conservative defaults, log every
decision and assumption, implement via TDD on a feature branch, then push that
branch (never main, never force) and raise a DRAFT MR via glab. The only permitted
stop is a phase-0 abort on blocking ambiguity.

Feature: $ARGUMENTS
