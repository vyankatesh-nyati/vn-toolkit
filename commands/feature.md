---
description: Run the gated end-to-end feature workflow (vn-toolkit)
argument-hint: <feature description or ticket id>
---

Use the `feature-workflow` skill to build the following feature end-to-end, honoring every hard gate (stop and wait for me at each): derive understanding from code, never assume silently (any assumption in **bold**), write scratch docs under `docs/` (never commit), and write no production code until I give an explicit go-ahead.

Feature: $ARGUMENTS
