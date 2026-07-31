# Reconciliation — folding a new source into the map

Reconciliation is the point of the whole exercise. Writing a summary is cheap; keeping one coherent
map across a dozen contradictory sources is the hard part.

**Never delegated.** A subagent may read raw material and write its own `sources/SNNN-*.md`, but it
must **never edit** `MAP.md`, `questions.md`, or anything in `topics/`. Reconciliation needs the
existing map plus judgement, and a contradiction is something the user must see rather than
something a subagent quietly resolves.

## The three outcomes

Take each durable fact from the new source and classify it against the current map.

**New** — the map says nothing on this point.
→ Add it to the right section, tagged with the new source ID.

**Refining** — the map already says this, and the new source adds precision or detail.
→ Update the entry in place and append the new source ID. Keep the sharper wording.

**Contradicting** — the map says something incompatible.
→ **Never overwrite.** Do all three:
1. Leave the existing claim in `MAP.md` and append `⚠ disputed: S<old> vs S<new> → questions.md`.
2. Add an entry under `## Contradictions` in `questions.md` recording **both source IDs** and both
   claims, quoted closely enough to be arguable.
3. Report it in the run summary — a contradiction is the most useful thing an ingest can produce.

**When you cannot tell** whether a fact refines or contradicts, treat it as **contradicting**.
Refining overwrites the old wording; contradicting keeps both. Choosing the safer branch costs one
entry in `questions.md` — choosing wrong costs the claim.

A confidently wrong map is worse than an incomplete one. During onboarding a contradiction is
usually real signal: a stale document, or two teams using one word differently.

## Never invent

Nothing enters the map that no source states. A fact you derived rather than read is tagged
`(inferred)` so a later reader can challenge it. If you cannot tell whether the source says
something or you concluded it, treat it as inferred.

## Topic promotion

`topics/` is created **lazily**, never scaffolded upfront. Promote a subject out of `MAP.md` into
`topics/<slug>.md` only when both hold:

- 2+ sources feed the subject, and
- its `MAP.md` section has outgrown roughly 10 lines.

On promotion, move the detail and leave a one-line pointer in the map. Three sources ingested should
still mean zero topic files.

## Closing the loop

After folding facts in:

- refresh `updated:` and `sources:` in the map's front matter,
- append anything unanswered to `## Open questions` in `questions.md`,
- strike through any open question this source answers, and move the answer into the map.

## The subagent digest contract

A subagent dispatched to read a large source returns a compact digest — roughly 15 lines, never the
raw text:

- the source ID and path it wrote,
- durable facts, one per line, each already phrased as it could appear in the map,
- **candidate** map changes, labelled `new` / `refines <what>` / `may contradict <what>`,
- questions raised.

The label is a proposal, not a decision. Reconciliation re-checks every candidate against the real
map before anything is written.
