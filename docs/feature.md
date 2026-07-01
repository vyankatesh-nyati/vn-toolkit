# /feature

Launches the gated, end-to-end feature workflow (the `feature-workflow` skill).

## Usage

```
/feature <feature description or ticket id>
```

## What it does

Runs the pipeline: structure the requirement → explore project context (from code) → clarify (one question at a time; assumptions in **bold**) → acceptance criteria (Given/When/Then + edge cases) → explore 2–3 solutions → vertical plan → horizontal plan → test / new-tech review loops → final plan doc → **explicit approval gate** → TDD implementation (local commits only).

Hard gates stop for your approval after: acceptance criteria, solution choice, vertical plan, horizontal plan, and before any production code.

See the `feature-workflow` skill for the full pipeline and rules.
