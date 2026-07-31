# `sources/SNNN-<slug>.md` template

One file per ingested source. This is the durable record of a single document, transcript, diagram
or code area — written once, then only corrected.

```markdown
---
id: S<NNN>
source: <path, url, or "pasted">
kind: doc | code | transcript | diagram
ingested: <YYYY-MM-DD>
---

# <Title>

## In one line
<What this source is, and why it matters.>

## Key points
- <Durable fact.>

## Domain terms introduced
- **<Term>** — <definition as this source gives it.>

## Flows and behaviour
- **<Flow>** — <steps, in order.>

## Explicit decisions and rationale
- <Decision> — because <reason as stated>.

## Constraints and gotchas
- <Limit, invariant, or trap.>

## Questions this raised
- <Something the source left unanswered.>

## Quotes worth keeping verbatim
> <Only where exact wording carries weight — a contract term, a precise definition, a named guarantee.>
```

## Rules

- Naming: `S` + three zero-padded digits + `-` + kebab-case slug, e.g. `S007-billing-arch.md`.
- Write only what the source states. Anything you concluded is tagged `(inferred)`.
- Empty sections are dropped, not filled with "none".
- `source:` must let a reader re-open the original. A file path or URL is enough; only **pasted** text
  is copied to `sources/raw/S<NNN>.txt`, because it has no other home.
- For `kind: code`, every symbol named here must have had its definition opened. Unverified names do
  not belong in the summary.
