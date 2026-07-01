---
name: writing-vertical-plans
description: Produces a vertical plan — a per-layer tree of WHAT changes and WHERE for a change that spans multiple layers or files. Use when the user asks for a "vertical plan", "what changes where", a layered change map, or a high-level surface-area outline before coding. For the execution order / TDD steps, use writing-horizontal-plans.
---

# Writing Vertical Plans

## Overview

A **vertical plan** maps WHAT changes and WHERE, layer by layer, as a scannable tree. It captures the *shape and surface area* of a change — which symbols in which layers, and whether each is reused or new.

**Core principle:** the reader can read code — the plan's job is to show the shape of the change, not re-explain the code. Default to zero rationale unless asked.

**Scope:** this skill covers ONLY the vertical (what/where) plan. For sequencing the change into ordered, test-first build steps, use the **writing-horizontal-plans** skill — the two are companions (vertical = structure; horizontal = order).

## When to use

- A change touches several layers (e.g. endpoint → dispatcher → service → repository) or several files.
- Before coding, to agree the surface area.
- The user says "vertical plan", "what/where changes", "layered outline", "map the change", "plan first / no code yet".

**When NOT to use:** a single-file, single-method change (just describe it); or when the user wants the execution order (use writing-horizontal-plans).

## Verify before you list

Every class, method, field, or repository call named in the plan MUST exist (or be explicitly marked NEW). Confirm with the code (LSP references/definition, or grep) — never invent a method name or assume a signature. A plan that names a non-existent `findByIds` is worse than no plan.

## How to build the vertical plan

Order nodes by call flow / architecture, entry point first:

```
entry point (controller / annotation / handler)
  → dispatcher / aspect / orchestrator
    → service / selector
      → strategy / domain
        → repository / data
```

Each node states the class/method + the concrete change + a status tag. Tag every node:

- **NEW** — create it
- **CHANGED** — modify it (say from → to)
- **REUSE** — existing, used as-is (name it so reviewers know it's not new)
- **UNCHANGED** — in the flow but deliberately not touched (prevents "did they forget it?")

Resolve the key design decision **inside** the plan (e.g. how a branch chooses path A vs B), stated as a rule, not a paragraph.

Use box-drawing glyphs (`├─ └─`), not `|-` — they render readably.

## Example (layered backend change)

```
Vertical Plan — enforce line-lock on campaignId-less endpoints

1. Aspect — LockAspect.validateLine                              [CHANGED]
   ├─ extractCampaignId: int+throw → OptionalInt (no throw)
   └─ branch: present → lockService.check(campaignId, ids)       [REUSE]
              absent  → lockService.checkByIds(ids)              [NEW call]

2. Service — CampaignLineLockService                             [CHANGED]
   ├─ inject CampaignLineRepository                              [NEW dep]
   └─ add checkByIds(List<String> ids):                         [NEW]
        ids blank/distinct → empty ⇒ no-op
        findAllByIdIn(ids) → empty ⇒ no-op
        select(anyMatch(instanceof Intl) ? intl : domestic).check(ids)

3. Strategy — LockStrategy / Domestic / Intl                     [UNCHANGED]

4. Repository — CampaignLineRepository.findAllByIdIn(List)       [REUSE]

Decision — path selection: line's concrete type is the discriminator
(Intl entity ⇒ intl flow; else domestic). One fetch, no extra load.
```

## Template

```
Vertical Plan — <goal>
1. <layer> — <Class.method>                 [NEW|CHANGED|REUSE|UNCHANGED]
   └─ <concrete change: from → to / add X / inject Y>
2. ...
Decision — <name>: <rule that resolves the branch>
```

## Common mistakes

| Mistake | Fix |
|---|---|
| Prose explaining *why* each change | Cut it. Vertical = what/where only. Add rationale only if asked. |
| Naming methods that don't exist | Verify every symbol first; mark unverified as NEW. |
| Omitting `REUSE` / `UNCHANGED` tags | Tag every node so reviewers see reuse and deliberate no-ops. |
| Grouping unrelated files with no call-flow order | Order entry-point → data so the tree reads as the actual flow. |
| Burying the branch decision in prose | State it as one rule line at the end of the plan. |
| `|-` ASCII that renders as noise | Use `├─ └─`. |

## Checklist

- [ ] Ordered entry-point → data, every node tagged NEW/CHANGED/REUSE/UNCHANGED
- [ ] Every named symbol verified to exist (or marked NEW)
- [ ] Key decision/branch stated as a rule inside the plan
- [ ] No rationale prose unless the user asked for it
- [ ] If execution order is also needed → produce a horizontal plan (writing-horizontal-plans)
