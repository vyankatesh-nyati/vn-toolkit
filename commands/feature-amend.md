---
description: Amend a prior autonomous /feature-auto run from feedback — re-runs the affected phases and refreshes the draft MR (vn-toolkit, experimental)
argument-hint: <slug> "<feedback>"
---

Use the `amending-feature-workflow` skill to amend the prior /feature-auto run
identified by the slug below, applying my feedback. I consent to the full re-run:
triage the feedback to the earliest affected phase, regenerate the downstream
docs/plan, apply the change to the feature branch as additive commits (never
force-push), and refresh the draft MR. Do not re-run phases the feedback does
not reach.

Slug: $1
Feedback: $2
