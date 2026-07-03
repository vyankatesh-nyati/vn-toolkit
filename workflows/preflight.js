export const meta = {
  name: 'feature-auto-preflight',
  description: 'Phase 0 of /feature-auto: structure the requirement, classify unknowns, abort on blocking ambiguity',
  phases: [
    { title: 'Structure', detail: 'restate the raw ask as a structured brief' },
    { title: 'Classify', detail: 'classify each open unknown against the codebase' },
  ],
}

const BRIEF_SCHEMA = {
  type: 'object',
  required: ['goal', 'actors', 'inScope', 'outOfScope', 'constraints', 'assumptions', 'unknowns'],
  properties: {
    goal: { type: 'string' },
    actors: { type: 'array', items: { type: 'string' } },
    inScope: { type: 'array', items: { type: 'string' } },
    outOfScope: { type: 'array', items: { type: 'string' } },
    constraints: { type: 'array', items: { type: 'string' } },
    assumptions: { type: 'array', items: { type: 'string' } },
    unknowns: { type: 'array', items: { type: 'string' } },
  },
}

const CLASSIFICATION_SCHEMA = {
  type: 'object',
  required: ['classifications'],
  properties: {
    classifications: {
      type: 'array',
      items: {
        type: 'object',
        required: ['unknown', 'classification', 'rationale', 'options'],
        properties: {
          unknown: { type: 'string' },
          classification: { type: 'string', enum: ['code-answerable', 'defaultable', 'blocking'] },
          rationale: { type: 'string' },
          options: { type: 'array', items: { type: 'string' } },
        },
      },
    },
  },
}

const input = typeof args === 'string' ? JSON.parse(args) : args
const requirement = input && input.requirement
if (!requirement || !String(requirement).trim()) {
  throw new Error('preflight: args.requirement missing or empty')
}

phase('Structure')
const brief = await agent(
  `Invoke the vn-toolkit:structuring-requirements skill and apply it to the raw ask below.
Follow its rules exactly: derive only from what is given, never solutionize, restate
don't expand. Do NOT write any files and do NOT ask the user anything — return the
brief as structured output only. Every gap, ambiguity, or decision you cannot resolve
from the ask goes into "unknowns" as a self-contained question. Anything you had to
assume to write a line goes into "assumptions".

Raw ask:
${requirement}`,
  { schema: BRIEF_SCHEMA, label: 'structure-brief', phase: 'Structure' },
)

phase('Classify')
let classifications = []
if (brief.unknowns.length) {
  const result = await agent(
    `You are the pre-flight classifier for an autonomous feature pipeline. For EACH
unknown below, inspect this codebase (read code; LSP for Java/TS symbols) and
classify it:
- "code-answerable": a later pipeline phase can resolve it by reading the code.
- "defaultable": a conservative default exists (reversible, smallest scope,
  consistent with the codebase's sibling pattern) whose worst case is a small
  amendment, not a rebuild.
- "blocking": a wrong guess plausibly changes the solution shape — wrong actor,
  wrong scope boundary, contradictory constraints, or ambiguous core behavior.
Be strict: when torn between defaultable and blocking, choose blocking. For every
unknown give the 2-4 concrete options a human would have been offered. Do not ask
the user anything.

Goal: ${brief.goal}
In scope: ${brief.inScope.join('; ')}
Unknowns:
${brief.unknowns.map((u, i) => `${i + 1}. ${u}`).join('\n')}`,
    { schema: CLASSIFICATION_SCHEMA, label: 'classify-unknowns', phase: 'Classify' },
  )
  classifications = result.classifications
}

const questions = classifications.filter(c => c.classification === 'blocking')
log(questions.length
  ? `pre-flight: ABORT — ${questions.length} blocking unknown(s)`
  : `pre-flight: proceed — ${classifications.length} unknown(s), none blocking`)

return questions.length
  ? { verdict: 'abort', brief, classifications, questions }
  : { verdict: 'proceed', brief, classifications }
