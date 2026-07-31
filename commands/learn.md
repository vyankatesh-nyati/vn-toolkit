---
description: Absorb a doc, transcript, diagram, URL, or code area into a product knowledge base and refine its memory map (vn-toolkit)
argument-hint: [path | url | --product <slug>] (or leave empty and paste the text)
---

Use the `learning-product-knowledge` skill to absorb the source below into the product's knowledge
base at `~/.claude/knowledge/<product>/`. Resolve the product by the skill's ordered rules and ask
rather than guess if it is ambiguous. Read the source inline if it is small, delegate to a subagent
if it is large or spans several files, and reconcile the facts into `MAP.md` yourself — never let a
subagent edit the map. Flag any contradiction with what is already known instead of overwriting it,
verify every code symbol before recording it, then report what was added, refined, disputed, and
newly unanswered.

If no source is given below, use the material I have just pasted into the conversation.

Source: $ARGUMENTS
