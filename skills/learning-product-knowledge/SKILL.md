---
name: learning-product-knowledge
description: Use when the user hands over documentation, a design doc, a diagram, a meeting transcript, a URL, or a code area to be absorbed into durable knowledge about a product they are learning — typically via /learn, or phrasings like "add this to the knowledge base", "learn this doc", "remember how this system works", "I'm onboarding onto X, here's their architecture doc". Writes one summary per source under ~/.claude/knowledge/<product>/sources/ and reconciles the facts into that product's MAP.md, flagging contradictions instead of overwriting them. Do NOT use for: explaining a function or file to the user right now, summarising a PR or diff, writing a README or CLAUDE.md for a repo, producing documentation for a team, or grounding an imminent code change — exploring-project-context owns that last one.
---

# Learning Product Knowledge

## Overview

Absorb a source the user is reading into a durable, per-product knowledge base, so the next session
starts warm and the user can interrogate what they have read without re-reading it.

**Core principle:** the map must stay trustworthy. A confidently wrong map is worse than an
incomplete one, so nothing is invented, every claim is traceable to a source, and a contradiction is
surfaced rather than resolved.

## When to use

- The user runs `/learn`, with or without an argument.
- The user hands over a doc, transcript, diagram, URL, or code area and wants it remembered.
- The user says "add this to the knowledge base", "learn this", "remember how X works".

**When NOT to use:** explaining code to the user right now; summarising a PR or diff; authoring a
README, CLAUDE.md, or team-facing docs; grounding an imminent code change (that is
`exploring-project-context`); answering from a KB that already exists (that is
`recalling-product-knowledge`).

## Layout

The knowledge base lives at `~/.claude/knowledge/<product-slug>/` — **never inside the team repo**,
so nothing is committed to their codebase by accident and a source can be handed over from any
working directory.

```
~/.claude/knowledge/<product-slug>/
  MAP.md            the only entry point; carries its own source index
  questions.md      Open questions + Contradictions
  sources/
    S001-<slug>.md
    raw/S003.txt    pasted text only
  topics/           created lazily, never upfront
```

Skeletons: `references/map-template.md`, `references/source-template.md`.

## Step 1 — Resolve the product

Writing into the wrong product's KB is silent corruption. Apply these rules **in order** and stop at
the first that resolves:

1. **Explicit in the request** — `--product <slug>`, or "for <product>".
2. **`cwd` matches a `repos:` entry** in some `MAP.md` front matter:
   ```bash
   grep -H "^repos:" ~/.claude/knowledge/*/MAP.md 2>/dev/null; pwd
   ```

Expand each `~` to the home directory, then pick the KB whose repo path **is the current directory or one of its ancestors**. If two match, the longest path wins. You compare the printed values yourself on purpose: `repos:` holds tilde paths while `pwd` prints an absolute one, and a one-liner doing both tilde expansion and prefix matching is fragile. No helper script is reachable here.
3. **Exactly one KB exists** — use it, and say which one you chose:
   ```bash
   ls -d ~/.claude/knowledge/*/ 2>/dev/null
   ```
4. **Otherwise ask.** Offer the existing slugs. **Never guess.**

For a product with no KB yet, confirm the slug and its repo paths with the user, then scaffold:

```bash
mkdir -p ~/.claude/knowledge/<slug>/sources
```

Write `MAP.md` from the template with front matter filled in, and an empty `questions.md` holding
only its two headings. Do **not** create `topics/` or `sources/raw/` until something needs them.

## Step 2 — Classify and size the source

| Source | Read by |
|---|---|
| Pasted text | inline — already in context, no size gate |
| One file or URL, under 600 lines | inline |
| One file or URL, 600 lines or more | subagent |
| A directory, a glob, or several files | subagent, always |

Measure before deciding: `wc -l <path>`. A URL has no line count until it is retrieved — fetch it first, then measure the retrieved text the same way.

Reading inline keeps the source discussable in this conversation, which is worth having for anything
small. Delegating keeps a large source from consuming the session — the user may be handing over
many documents in a row.

## Step 3 — Read and summarise

Write one summary per source to `sources/S<NNN>-<slug>.md` using
`references/source-template.md`. Next ID:

```bash
ls ~/.claude/knowledge/<slug>/sources/ 2>/dev/null | grep -o '^S[0-9]\{3\}' | sort | tail -1
```

That is the highest existing ID — add one and zero-pad to three digits. IDs are fixed-width, so a lexicographic sort gives the true maximum. Never reuse a gap: if `S001` and `S003` exist, the next ID is `S004`, not `S002`.

**When delegating**, the subagent reads the raw material, writes the summary file itself at full
fidelity, and returns a ~15-line digest. It must **never edit** `MAP.md`, `questions.md`, or
`topics/`. The digest contract is in `references/reconciliation.md`.

**For code sources**, verify every symbol before it enters a summary: LSP `definition` /
`references` first for Java and TypeScript, grep only for string literals and config values. A class
named in a document does not exist until its definition has been opened. Never substitute a
similar-looking name — say the symbol did not resolve.

**For pasted text**, also archive the raw text to `sources/raw/S<NNN>.txt`, because there is no path
to re-read it from later. File and URL sources are not copied.

## Step 4 — Reconcile into the map

Read `references/reconciliation.md` and apply it. In short: each fact is **new**, **refining**, or
**contradicting**; a contradiction is never overwritten — both claims survive, the map entry is
marked `⚠ disputed`, and the conflict goes to `questions.md`.

Reconciliation is **always** done here, in the main session, never by a subagent.

## Step 5 — Report

Ten lines at most:

- product and source ID written,
- what was **added** to the map,
- what was **refined**,
- what is now **disputed** — always call these out explicitly,
- new open questions.

If nothing changed the map, say so plainly rather than inventing significance.
