---
name: using-new-technology
description: Use when a plan or change introduces a technology new to this codebase — a library, framework feature, API, or version bump — and it needs review before implementation. Verifies the tech is warranted (reuses questioning-legacy-patterns), used correctly against current docs (not memory), available at the right version in the stack, and free of known pitfalls. Triggers: reviewing a plan that adds a dependency or new API, "is this the right way to use X", unfamiliar library or framework feature, version/availability doubts. Returns findings and loops until clean.
---

# Using New Technology

## Overview

Review a plan (or change) that introduces a technology new to this codebase — a library, framework feature, API, or version — **before** it is implemented. Confirm it is warranted, used correctly against current docs, available in the stack, and free of known pitfalls. Return a findings list; the workflow applies the fixes and re-invokes until clean.

**Core principle:** a new technology is a liability until verified — check *current docs, not memory*, and adopt it only when it genuinely beats the option already in the codebase.

## When to use / when NOT

**Use when** a plan step adds a dependency, a new API/library, a framework feature, or a version bump; or you are not certain the new tech is used idiomatically or is even available here. Step 10 review loop of `feature-workflow`.

**Do NOT use** when the change uses only patterns/libraries already established in the codebase — nothing new to vet.

## Is it warranted first

Before reviewing usage, confirm the tech should be here at all. **REQUIRED SUB-SKILL:** use `questioning-legacy-patterns` — is a modern feature genuinely clearer than the existing pattern, or is this novelty/churn? Modern ≠ better. If it is not warranted, that is finding #1.

## Review checklist (produce findings)

1. **Warranted** — passes `questioning-legacy-patterns`; not adopted for novelty; YAGNI; prefer a util/pattern the codebase already uses.
2. **Correct usage** — verify EVERY new API/idiom/config against CURRENT docs (`context7`: resolve-library-id → get-library-docs, or official docs). Never from memory. Flag any call, signature, or option you cannot confirm.
3. **Availability & version** — the library/feature is actually in the project's stack at the required level (language version, dependency present in the build, version floor). Note runtime limits (e.g. no network to install at runtime).
4. **Pitfalls / anti-patterns** — known footguns: thread-safety, resource leaks, deprecated usage, misconfiguration, blocking calls.
5. **Compatibility** — impact on existing code/patterns and migration cost.

Output = a findings list (each: what is wrong + the fix). Empty list = pass. Never assume silently — if something can't be verified, state it in **bold** as an open item, don't wave it through.

## Example

Plan step uses `CompletableFuture.completeOnTimeout(...)`.

Findings:
- **Availability:** `completeOnTimeout` is Java 9+ — **confirm the module's Java level in the build before relying on it.**
- **Correct usage:** current JDK docs say it completes with a fallback value; it does NOT cancel the underlying task. If the intent is cancellation, this usage is wrong — use a `TimeLimiter` / explicit cancel.
- **Warranted:** a `TimeLimiter` util is already used elsewhere (`questioning-legacy-patterns`) — prefer it over a raw future for consistency.

## Common mistakes

| Mistake | Fix |
|---|---|
| Trusting memory of an API | Fetch current docs (context7 / official); verify signatures & options |
| Assuming the dependency/version is present | Confirm in build files + language level |
| Adopting new tech for novelty | Run `questioning-legacy-patterns`; justify vs the existing option |
| Ignoring pitfalls (threading, leaks, deprecation) | Check the tech's known footguns |
| Passing an unverifiable usage silently | Flag it in **bold** as an open item |
| One review pass | Loop until zero findings |

## Checklist

- [ ] Warranted (`questioning-legacy-patterns`) — not novelty/churn
- [ ] Every new API/idiom verified against current docs, not memory
- [ ] Availability + version/language level confirmed in the build
- [ ] Pitfalls / anti-patterns checked
- [ ] Compatibility / migration impact noted
- [ ] Findings returned; loop until clean
