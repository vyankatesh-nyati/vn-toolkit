# `MAP.md` template

The product's memory map. One per product. This is the **only** entry point — it carries its own
source index, so a reader needs no other file to navigate.

Copy this skeleton on first scaffold. Drop sections that have no content yet rather than leaving
them empty with placeholder text; add them back when a source fills them.

```markdown
---
product: <slug>
repos: [~/dev/<repo>]
updated: <YYYY-MM-DD>
sources: <n>
---

# <Product> — Memory Map

## What it is
<2–4 sentences: what it does, who uses it, why it exists.>

## Components
| Component | Responsibility | Where | Tech | Src |
|-----------|---------------|-------|------|-----|
| <name> | <one line> | <repo/path> | <stack> | S1 S2 |

## Domain language
- **<Term>** — <definition> [S1]

## Key flows
- **<Flow>** — <a → b → c> [S2] · detail: topics/<slug>.md

## Integrations & dependencies
- **<System>** — <how and why we talk to it> [S3]

## Conventions & constraints
- <Team rule or non-obvious invariant> [S1]

## Sources index
| Src | Original | Ingested | Covers |
|-----|----------|----------|--------|
| S1 | <path or url> | <YYYY-MM-DD> | <what it covers> |

## Open questions → questions.md (<n> open)
```

## Rules

- Every claim carries its source tag (`[S1]`, or `S1 S2` in table cells). A claim with no tag is a bug.
- A claim you derived rather than read is tagged `(inferred)`.
- A disputed claim keeps both readings and is marked `⚠ disputed: S1 vs S4 → questions.md`.
- `repos:` is what makes `cwd`-based product resolution work. Add every repo path belonging to the product.
- `updated:` and `sources:` are refreshed on every ingest.
- If a section outgrows ~10 lines and 2+ sources feed it, move the detail to `topics/<slug>.md` and leave a pointer.
- A citation tag maps to its summary file by zero-padding: `[S1]` is `sources/S001-*.md`, `[S12]` is `sources/S012-*.md`.
