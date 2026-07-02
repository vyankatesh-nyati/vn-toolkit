---
name: writing-horizontal-plans
description: Produces a horizontal plan — ordered, test-first build steps that spell out EVERY code change in full (the exact failing test AND the exact implementation), one compiling commit per step. Use when the user asks for a "horizontal plan", "TDD steps", "implementation/execution order", "detailed plan with code", "step-by-step plan", or how to sequence a change into commits. Takes a vertical plan (writing-vertical-plans) as its input.
---

# Writing Horizontal Plans

## Overview

A **horizontal plan** turns a vertical plan into ordered, test-first build steps that spell out **every code change in full** — the actual failing test and the actual implementation for each step, in the order you build them.

**Core principle:** NO placeholders. If a step changes code, the step SHOWS the code — exact file paths, the complete test, the complete implementation, the run command, and the expected output. An engineer with zero prior context executes it verbatim.

**Scope:** companion to writing-vertical-plans. The vertical plan is the high-level map of WHAT changes and WHERE; the horizontal plan is the DETAILED, code-complete execution of it, in order. Derive the steps from the vertical plan's layers.

## When to use

- After a vertical plan exists and you need the detailed build order with code.
- The user says "horizontal plan", "TDD steps", "detailed / step-by-step plan", "give me the code changes", "how do I sequence this".

**When NOT to use:** you still need the surface-area map (writing-vertical-plans); or a one-line change with nothing to sequence.

## How to build

**Order bottom-up** so each commit compiles and the next builds on it: callee before caller (interface/repo method before the service that uses it; service before the controller/aspect that calls it).

Each step is one complete TDD micro-cycle. Show all of it:

```
Step N — <one concern>
  Files: Create <path> | Modify <path>:<lines> | Test <path>
  RED — the failing test (COMPLETE code):
        <full test method(s): happy + edges + guard/fallback + decision-branch edge>
        Run: <exact cmd>   Expect: FAIL (<why>)
  GREEN — the implementation (COMPLETE code):
        <the actual production change — real code, not a description>
        Run: <exact cmd>   Expect: PASS
  <format/lint cmd>;  commit "<id> | <message>"
```

## No placeholders — every code step shows the code

These are plan failures — never write them:
- "TBD", "add error handling", "handle edge cases", "similar to Step N".
- Describing a change in prose without the code block.
- A test step without the actual test code; an impl step without the actual code.
- Referencing a method/type not shown in this or an earlier step.

If a step changes code, the code is IN the step. Repeat code rather than cross-referencing — the engineer may read steps out of order.

## Example

```
Step 1 — CampaignLineLockService.validateNotLockedByLineIds + selection
  Files: Modify core/.../service/CampaignLineLockService.java
         Test  core/.../service/CampaignLineLockServiceTest.java
  RED:
    @Test void routesToInternationalWhenAnyLineIsInternational() {
        when(campaignLineRepository.findAllByIdIn(LINE_IDS))
            .thenReturn(List.of(bookedFinanceApprovedLine("l1")));
        campaignLineLockService.validateNotLockedByLineIds(LINE_IDS);
        verify(internationalStrategy).validateNotLocked(LINE_IDS);
    }
    @Test void skipsWhenNoLineIds() {
        campaignLineLockService.validateNotLockedByLineIds(List.of("", " "));
        verifyNoInteractions(campaignLineRepository, internationalStrategy, domesticStrategy);
    }
    Run: ./gradlew :core:unitTest --tests "*CampaignLineLockServiceTest"   Expect: FAIL (method undefined)
  GREEN:
    public void validateNotLockedByLineIds(List<String> lineIds) {
        List<String> ids = lineIds.stream()
                .filter(id -> id != null && !id.isBlank()).distinct().toList();
        if (ids.isEmpty()) return;
        List<BaseCampaignLine> lines = campaignLineRepository.findAllByIdIn(ids);
        if (lines.isEmpty()) return;
        (lines.stream().anyMatch(InternationalCampaignLine.class::isInstance)
                ? internationalStrategy : domesticStrategy).validateNotLocked(ids);
    }
    Run: ./gradlew :core:unitTest --tests "*CampaignLineLockServiceTest"   Expect: PASS
  ./gradlew spotlessApply;  commit "PLATO-12436 | region-by-line-type lock check"

Step 2 — aspect branch (builds on Step 1) — <full RED + GREEN code> ...
```

## Common mistakes

| Mistake | Fix |
|---|---|
| `GREEN: <prod change>` as a one-liner | Show the ACTUAL implementation code in the step |
| "Add tests" / unnamed cases | Full test code: happy + edges + guard + decision-branch |
| Prose describing a change | Replace it with the code block |
| Steps ordered top-down (caller first) | Bottom-up so each commit compiles |
| A step spanning several concerns | One concern, one compiling commit |
| "Same as Step N" for code | Repeat the code; steps may be read out of order |
| No run command / expected output | Include exact cmd + expected FAIL/PASS |

## Checklist

- [ ] Steps ordered bottom-up; every commit compiles standalone
- [ ] One concern per step, one commit
- [ ] Every code step shows COMPLETE code (test + implementation) — no placeholders
- [ ] Exact file paths, run commands, and expected FAIL/PASS per step
- [ ] Derived from the vertical plan's layers (writing-vertical-plans)
