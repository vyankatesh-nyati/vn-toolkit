---
name: exploring-project-context
description: Use when grounding a feature in the real codebase before designing or planning it — locating entry points, related modules, patterns to reuse, relevant tests, and recent commits, then producing a short context map. Triggers: "explore the code", "where does this live", "ground this feature", "what already exists", "context map", "how is X done today", "map the surface area", step 2 of the feature workflow. Derives understanding from code (LSP references/definition first, grep only for strings/config) and verifies every cited symbol actually exists. Not for solutioning, designing, or planning — those come later.
---

# Exploring Project Context

## Overview

Ground the feature in the real codebase before any design. Find where the work lands — entry points, related modules, patterns already used, relevant tests, recent commits — and emit a short **context map** of what matters and what to reuse.

**Core principle:** understanding comes from the CODE, never from the ticket. Tickets, notes, and named symbols are hints to verify, not facts. Every symbol you cite must be confirmed to exist.

## When to use

- Step 2 of `feature-workflow`, after requirements are structured, before exploring solutions.
- The user says "explore the code", "where does this live", "how is X done today", "what already exists", "map the context / surface area".
- Any time you are about to design against a codebase you have not grounded yourself.

**When NOT to use:** you already hold a verified context map for this area; the change is a trivial one-file edit; or you are ready to design (use `exploring-solutions`) or plan (use `writing-vertical-plans`).

## Derive from code, verify every symbol

- **LSP first** for anything in Java/TypeScript: `references`, `definition`, `implementation`, `typeDefinition`, `documentSymbol`. Do NOT grep to find where a symbol is used or defined.
- **grep/glob only** for: files by name, string literals, config values (YAML/properties/JSON), or when LSP genuinely fails.
- A symbol named in the ticket does not exist until you open its definition. If it does not resolve, say so — never silently substitute a similar name.
- Trace the real call flow (entry to dispatcher to service to domain to data); do not assume the layering.

## How to explore

1. **Locate the entry point** — controller, RabbitMQ receiver, aspect, scheduled job, or CLI. Start from the user-visible edge and follow inward.
2. **Walk the call flow** with LSP `references`/`definition` down through each layer; note the real class/method at each hop.
3. **Find the sibling pattern** — an existing feature that is structurally similar (same layer shape, same annotation, same DO conversion). This is what a new change should mirror.
4. **Locate the tests** that cover the touched code — the test class and the object mothers / DefaultBuilders / factories it uses. New work reuses these.
5. **Check recent commits** on the touched files (`git log --oneline -- <path>`) for in-flight or related work and conventions.
6. **Emit the context map** (below). Stop there — no solutions, no plan.

Any gap you cannot resolve from code becomes a **bold assumption** flagged for user confirmation — never a silent guess.

If you write the context map to a file, put it under `docs/` (or `docs/scratch/` if the repo already tracks `docs/`) and **never commit it** — treat it as a local scratch artifact.

## Example

```
Context Map — line-level lock on Evolve endpoints

Entry points   EvolveLineController.updateLine        [verified: LSP def]
               @CheckCampaignLineLock (aspect)         [verified: LockAspect]
Call flow      controller → LockAspect.validate
                 → LineLockService.check(campaignId, lineIds)   [verified]
                   → LineLockRepository.findByCampaignId        [verified]
Reuse pattern  ScheduleLockService — same aspect+selector shape (mirror this)
Tests          LineLockServiceTest + LockedLineMother, CampaignLineBuilder
Recent commits 6b312977 gate Evolve endpoints; 97b7bad region-aware selector
Assumption     **"Evolve line" == CampaignLine with type=EVOLVE — confirm**
Gap            No existing check for campaignId-less endpoints (net-new)
```

## Common mistakes

| Mistake | Do instead |
|---|---|
| Trusting a symbol named in the ticket | Open its definition; if absent, flag it |
| Grep to find usages/definitions in Java/TS | Use LSP references/definition |
| Silently assuming a mapping or layering | Write it in **bold** and ask |
| Proposing a solution or design here | Stop at the map; that is `exploring-solutions` |
| Listing every file touched | List only what matters plus the pattern to reuse |
| Skipping tests and recent commits | Both reveal conventions and in-flight work |
| Committing the written context map | Keep it under `docs/` scratch, uncommitted |

## Checklist

- [ ] Entry point located and verified
- [ ] Call flow traced via LSP, each hop's symbol confirmed to exist
- [ ] A sibling pattern to reuse identified
- [ ] Covering tests plus their builders/mothers located
- [ ] Recent commits on touched files checked
- [ ] Every cited symbol verified; unresolved ones flagged, not swapped
- [ ] Assumptions written in **bold** for confirmation
- [ ] Output is a short context map — no solutioning
- [ ] Any written map lives under `docs/` scratch and stays uncommitted
