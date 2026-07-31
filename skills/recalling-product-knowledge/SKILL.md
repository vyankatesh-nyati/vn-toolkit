---
name: recalling-product-knowledge
description: Use when answering a question about a product the user has been building knowledge about — typically via /recall, or phrasings like "what do we know about X", "how does the settlement flow work", "remind me how their auth works", "what don't we know yet". Reads ~/.claude/knowledge/<product>/MAP.md and only the source summaries the question needs, then labels every claim known, inferred, or not in the KB. Do NOT use for: general programming or language questions, questions about a product with no knowledge base, ingesting new material (that is learning-product-knowledge), or grounding an imminent code change in a repo (that is exploring-project-context).
---

# Recalling Product Knowledge

## Overview

Answer from the accumulated knowledge base instead of re-reading originals — and be honest about
the edges of what it contains.

**Core principle:** an answer's value depends on knowing how much to trust it. Every claim is
labelled by provenance, and a gap is reported as a gap.

## When to use

- The user runs `/recall`.
- The user asks what is known about a product they have been learning.
- The user asks what is still unknown or unresolved.

**When NOT to use:** general programming questions; a product with no KB (offer `/learn` instead);
ingesting new material (`learning-product-knowledge`); grounding a code change
(`exploring-project-context`).

## Step 1 — Resolve the product

In order, stopping at the first that resolves:

1. **Explicit in the request** — `--product <slug>`, or "for <product>".
2. **`cwd` matches a `repos:` entry** in some `MAP.md` front matter:
   ```bash
   find ~/.claude/knowledge -maxdepth 2 -name MAP.md -exec grep -H "^repos:" {} + 2>/dev/null; pwd
   ```
   Expand each `~` to the home directory, then pick the KB whose repo path **is the current
   directory or one of its ancestors**. If two match, the longest path wins. You compare the
   printed values yourself on purpose: `repos:` holds tilde paths while `pwd` prints an absolute
   one, and a one-liner doing both tilde expansion and prefix matching is fragile. No helper
   script is reachable here.
3. **Exactly one KB exists** — use it, and say which.
4. **Otherwise ask.** **Never guess.**

If no KB exists at all, say so and offer `/learn` — do not answer from general knowledge while
implying it came from the KB.

## Step 2 — Read selectively

Read `MAP.md` first. It is the **only entry point** and carries its own source index, so it tells
you where everything else is.

Then read **only** the sources and topics the question actually needs — never all of them. One
exception: if a relevant `MAP.md` entry is marked `⚠ disputed`, also read the Contradictions section
of `questions.md` — the second reading is recorded there, not in the map. The map's `Src` tags and
`Sources index` point you at the right ones. Loading the whole KB defeats its purpose.

## Step 3 — Answer, labelled

Label every claim by provenance:

- **known** — stated by a source. Cite it: `[S3]`.
- **inferred** — derived, not read. Say so, and say what it rests on.
- **not in the KB** — say this plainly.

Never guess, and never fabricate a citation. On a gap:

1. say what is missing,
2. offer to `/learn` the document that would close it,
3. offer to add the question to `questions.md`.

A `⚠ disputed` map entry is reported as disputed, giving both readings and both source IDs. Do not
pick a side the sources do not support.

## The `gaps` lookup

`/recall gaps` — and phrasings like "what don't we know yet", "what should I ask the team" — reports
`questions.md` instead of running the lookup: open questions first, then contradictions with both
claims. Group them so the user can take them into a conversation with the team.
