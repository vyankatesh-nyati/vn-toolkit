export const meta = {
  name: 'feature-auto-understand',
  description: 'Phases 1-2 of /feature-auto: parallel context mapping, then self-clarification with logged decisions',
  phases: [
    { title: 'Context', detail: 'four parallel readers map the codebase' },
    { title: 'Clarify', detail: 'enumerate and self-answer the questions a human would have been asked' },
  ],
}

let input = args
if (typeof input === 'string') {
  try { input = JSON.parse(input) } catch { input = {} }
}
const { requirement, briefPath, repoRoot } = input || {}
if (!requirement || !briefPath || !repoRoot) {
  throw new Error('understand: args.requirement, args.briefPath, args.repoRoot are all required')
}

const READER_SCHEMA = {
  type: 'object',
  required: ['findings', 'assumptions'],
  properties: {
    findings: {
      type: 'array',
      items: {
        type: 'object',
        required: ['title', 'detail', 'evidence'],
        properties: { title: { type: 'string' }, detail: { type: 'string' }, evidence: { type: 'string' } },
      },
    },
    assumptions: { type: 'array', items: { type: 'string' } },
  },
}

const READERS = [
  { key: 'entry-points', brief: 'Locate the entry points and trace the real call flow this feature will touch: controllers, handlers, CLI, module exports — then each layer inward. Every symbol you cite must be verified to exist (open its definition; LSP for Java/TS). evidence = file:line.' },
  { key: 'sibling-pattern', brief: 'Find the sibling pattern: an existing feature in this repo structurally similar to what the requirement needs — the shape new code should mirror. Name the concrete functions/classes/files and what to copy. evidence = file:line.' },
  { key: 'tests', brief: 'Locate the tests covering the code this feature touches: test files, framework, helpers/builders/factories to reuse. If the repo has no test setup, say so and name the zero-dependency framework you would default to. evidence = file:line or "absent".' },
  { key: 'history', brief: 'Check recent git history on the files this feature touches (git log --oneline, focused diffs) for in-flight work, conventions, or churn affecting this change. evidence = commit sha.' },
]

phase('Context')
const readers = await parallel(READERS.map(r => () => agent(
  `You are the ${r.key} reader for an autonomous feature pipeline, phase 1 (context mapping).
Repo: ${repoRoot} — work only inside it. Read the structured brief at ${briefPath} first.
Requirement: ${requirement}

${r.brief}

Rules: derive from CODE, never from the requirement's phrasing; report only what matters for this feature plus what to reuse; never invent a symbol — if something named in the brief does not exist, report that as a finding. Return findings (title, detail, evidence) and assumptions (anything you could not verify).`,
  { schema: READER_SCHEMA, label: `read:${r.key}`, phase: 'Context' },
)))

const contextMap = {}
READERS.forEach((r, i) => {
  contextMap[r.key] = readers[i] || { findings: [], assumptions: ['reader failed - no result'] }
})

phase('Clarify')
const CLARIFY_SCHEMA = {
  type: 'object',
  required: ['clarifications'],
  properties: {
    clarifications: {
      type: 'array',
      items: {
        type: 'object',
        required: ['question', 'dimension', 'options', 'chosen', 'why', 'source', 'confidence', 'reversibility'],
        properties: {
          question: { type: 'string' },
          dimension: { type: 'string', enum: ['purpose', 'behavior', 'data', 'errors', 'boundaries', 'non-functional'] },
          options: { type: 'array', items: { type: 'string' } },
          chosen: { type: 'string' },
          why: { type: 'string' },
          source: { type: 'string', enum: ['code', 'conservative-default'] },
          confidence: { type: 'string', enum: ['H', 'M', 'L'] },
          reversibility: { type: 'string', enum: ['easy', 'moderate', 'rebuild'] },
        },
      },
    },
  },
}

const clar = await agent(
  `You are phase 2 (self-clarification) of an autonomous feature pipeline. No human is available and you may not ask anyone anything.
Repo: ${repoRoot}. Read the brief at ${briefPath}.
Requirement: ${requirement}
Context map (phase 1 findings): ${JSON.stringify(contextMap)}

Enumerate every question a careful engineer would have asked a human before building this — across ALL dimensions: purpose, behavior (every branch), data (shape, validation, defaults, nullability), errors (invalid input, missing data, failures), boundaries (scope, callers, permissions), non-functional (performance, concurrency, compatibility). Include the brief's open unknowns.

Then answer each yourself: from the CODE where it answers the question (source "code"; cite the evidence in "why"), otherwise by the conservative default — the option that is reversible, smallest in scope, and consistent with the sibling pattern (source "conservative-default"). Give the 2-4 options a human would have been offered, your chosen answer, confidence, and reversibility. Do not skip a question because it is awkward; do not merge questions.`,
  { schema: CLARIFY_SCHEMA, label: 'self-clarify', phase: 'Clarify' },
)

log(`understand: ${Object.values(contextMap).reduce((n, r) => n + r.findings.length, 0)} findings, ${clar.clarifications.length} self-answered questions`)

return { contextMap, clarifications: clar.clarifications }
