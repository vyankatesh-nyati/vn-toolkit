---
name: questioning-legacy-patterns
description: Use when writing or planning code changes, before copying an existing or legacy pattern — to evaluate whether a newer language or framework feature fits better. Language-agnostic; Java/Spring examples.
---

# Questioning Legacy Patterns

## Overview

Existing code shows how things *were* done, not necessarily how they *should* be done now. Before mirroring a legacy pattern, ask whether a modern language or framework feature expresses the intent better.

**Core principle:** match the codebase's *conventions* (naming, package structure, formatting) — but don't inherit its *stale mechanics* when a cleaner modern idiom exists and fits. Don't follow blindly.

## When to apply

- Writing new code, or a plan that will add or change code.
- About to copy a pattern from a neighbouring/legacy class "because that's how it's done here."
- Reaching for a verbose construct that a newer feature replaces.

## The habit: pause and ask

1. Is there a modern language feature that expresses this more directly? (Java: records, sealed types, pattern matching, switch expressions, `Optional`, streams, `var`, text blocks. Other langs: their equivalents.)
2. **Is this indirection actually needed?** e.g. does `CampaignLineLock` really need a static factory method, or would a plain constructor do? Don't add factories/builders/helpers by reflex.
3. Is there a newer framework capability? (Spring Boot: constructor injection, `@ConfigurationProperties` as a record, Bean Validation, newer test slices.)
4. Does the legacy pattern exist for a real reason (constraint, compatibility) — or just inertia?

## Examples (Java/Spring; the principle is general)

- **Plain data holder** → a `record`, not a class with hand-written getters/equals/hashCode — unless mutability or a framework (e.g. JPA entities) forces otherwise.
- **Static factory `of(...)` that only calls `new`** → use the constructor directly; add a factory only when it earns its place (multiple representations, named clarity, caching).
- **Field injection** → constructor injection with `final` fields.
- **Verbose null checks / nested branching** → `Optional`, pattern matching, or switch expressions *where they genuinely read better*.

## Balance — don't modernize blindly either

Modern ≠ automatically better. Skip the new idiom when it hurts readability, fights the framework (JPA needs a no-arg, mutable entity), or churns unrelated code. The goal is the *clearest* solution reached by thinking — not defaulting to legacy OR to novelty.

## Common mistakes

| Mistake | Fix |
|---------|-----|
| "The neighbouring class does it this way, so I will too" | Keep its conventions; re-evaluate its stale mechanics. |
| Adding a static factory / builder / helper by reflex | Use a constructor unless the indirection earns its place. |
| Class with hand-written getters/equals for plain data | Use a record (unless a framework needs otherwise). |
| Modernizing for its own sake, churning unrelated code | Apply a modern idiom only where it reads clearer and fits constraints. |
