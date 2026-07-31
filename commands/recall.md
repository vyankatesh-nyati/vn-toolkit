---
description: Answer from a product's accumulated knowledge base, labelling what is known, inferred, or missing (vn-toolkit)
argument-hint: <question> | gaps
---

Use the `recalling-product-knowledge` skill to answer the question below from the product's
knowledge base. Read `MAP.md` first and then only the sources the question needs. Label every claim
as known (with its source tag), inferred, or not in the KB. If the answer is not there, say so and
offer to `/learn` the document that would close the gap — never guess and never fabricate a
citation. Report a disputed entry as disputed, with both readings.

If the question is `gaps` — or asks what we do not yet know — report `questions.md` instead: open
questions first, then contradictions.

Question: $ARGUMENTS
