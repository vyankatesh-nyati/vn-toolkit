export const meta = {
  name: 'feature-auto-decide',
  description: 'Phases 3-4 of /feature-auto: acceptance criteria with adversarial review, then solution panel and judge',
  phases: [
    { title: 'AC', detail: 'write acceptance criteria, adversarially review until clean' },
    { title: 'Solutions', detail: 'independent candidate scoring, judge picks one' },
  ],
}

let input = args
if (typeof input === 'string') {
  try { input = JSON.parse(input) } catch { input = {} }
}
const { requirement, briefPath, contextMapPath, repoRoot } = input || {}
if (!requirement || !briefPath || !contextMapPath || !repoRoot) {
  throw new Error('decide: args.requirement, args.briefPath, args.contextMapPath, args.repoRoot are all required')
}

const AC_SCHEMA = {
  type: 'object',
  required: ['acMarkdown', 'assumptions'],
  properties: {
    acMarkdown: { type: 'string' },
    assumptions: { type: 'array', items: { type: 'string' } },
  },
}
const AC_REVIEW_SCHEMA = {
  type: 'object',
  required: ['findings'],
  properties: {
    findings: {
      type: 'array',
      items: {
        type: 'object',
        required: ['issue', 'fix'],
        properties: { issue: { type: 'string' }, fix: { type: 'string' } },
      },
    },
  },
}

phase('AC')
let ac = await agent(
  `Phase 3 of an autonomous feature pipeline: write the acceptance criteria.
Repo: ${repoRoot}. Read ${briefPath} and ${contextMapPath} first.
Requirement: ${requirement}

Produce a complete AC document as markdown with sections: ## Happy path, ## Alternate paths, ## Edge cases (empty/boundary values, concurrency/idempotency, permission/tenancy variants where the code branches on them, failure/rollback, states the code allows but the feature cannot reach), ## Assumptions (confirm). One Given/When/Then per behavior, a single observable outcome each, grounded in how the code actually behaves — verify every symbol you name exists. Outcomes you cannot derive from code go under Assumptions, never guessed silently. Return the document and the assumptions list.`,
  { schema: AC_SCHEMA, label: 'write-ac', phase: 'AC', model: 'sonnet' },
)

let acFindings = []
for (let i = 1; i <= 3; i++) {
  const review = await agent(
    `Adversarially review these acceptance criteria against the brief (${briefPath}), the context map (${contextMapPath}), and the actual code in ${repoRoot}. Hunt for: scenarios contradicting real code behavior, missing edge-case categories, compound Then clauses, implementation details posing as behavior, symbols that do not exist. Empty findings = pass.

${ac.acMarkdown}`,
    { schema: AC_REVIEW_SCHEMA, label: `review-ac:${i}`, phase: 'AC', model: 'sonnet' },
  )
  acFindings = review.findings
  if (!acFindings.length) break
  ac = await agent(
    `Rewrite these acceptance criteria applying every finding below. Keep everything no finding touches. Return the full corrected document and its assumptions list.
Repo: ${repoRoot}; read ${briefPath} and ${contextMapPath}.
Requirement: ${requirement}
Findings: ${JSON.stringify(acFindings)}

Current AC:
${ac.acMarkdown}`,
    { schema: AC_SCHEMA, label: `fix-ac:${i}`, phase: 'AC', model: 'haiku', effort: 'low' },
  )
}

phase('Solutions')
const CANDIDATES_SCHEMA = {
  type: 'object',
  required: ['candidates'],
  properties: {
    candidates: {
      type: 'array',
      minItems: 3,
      items: {
        type: 'object',
        required: ['name', 'summary'],
        properties: { name: { type: 'string' }, summary: { type: 'string' } },
      },
    },
  },
}
const SCORE_SCHEMA = {
  type: 'object',
  required: ['effort', 'risk', 'fit', 'performance', 'details', 'assumptions'],
  properties: {
    effort: { type: 'string', enum: ['low', 'medium', 'high'] },
    risk: { type: 'string', enum: ['low', 'medium', 'high'] },
    fit: { type: 'string', enum: ['low', 'medium', 'high'] },
    performance: { type: 'string', enum: ['low', 'medium', 'high'] },
    details: { type: 'string' },
    assumptions: { type: 'array', items: { type: 'string' } },
  },
}
const JUDGE_SCHEMA = {
  type: 'object',
  required: ['pick', 'why', 'confidence', 'rejected'],
  properties: {
    pick: { type: 'string' },
    why: { type: 'string' },
    confidence: { type: 'string', enum: ['H', 'M', 'L'] },
    rejected: {
      type: 'array',
      items: {
        type: 'object',
        required: ['name', 'reason'],
        properties: { name: { type: 'string' }, reason: { type: 'string' } },
      },
    },
  },
}

const gen = await agent(
  `Phase 4 of an autonomous feature pipeline: generate 3-4 genuinely different candidate approaches that satisfy the accepted criteria. Force distinct shapes (reuse-and-extend an existing pattern; a new focused component; delegate to something existing; config/data-driven). Ground each in the actual code (repo: ${repoRoot}; read ${briefPath} and ${contextMapPath}). Name + 2-3 line summary each; no scoring yet.

Acceptance criteria:
${ac.acMarkdown}`,
  { schema: CANDIDATES_SCHEMA, label: 'candidates', phase: 'Solutions', model: 'sonnet' },
)

const scores = await parallel(gen.candidates.map(c => () => agent(
  `Score ONE candidate approach independently against the real code. Repo: ${repoRoot}; read ${briefPath} and ${contextMapPath}. Verify every symbol the approach relies on actually exists. Score effort/risk/fit/performance (low|medium|high; for fit and performance, high is good), explain in details, and list every assumption the approach rests on.

Candidate: ${c.name} - ${c.summary}

Acceptance criteria:
${ac.acMarkdown}`,
  { schema: SCORE_SCHEMA, label: `score:${c.name}`, phase: 'Solutions', model: 'sonnet' },
)))

const scored = gen.candidates
  .map((c, i) => ({ name: c.name, summary: c.summary, score: scores[i] }))
  .filter(c => c.score)

if (!scored.length) {
  throw new Error('decide: all candidate scorers failed')
}

const judge = await agent(
  `You are the judge for phase 4 of an autonomous feature pipeline. Pick exactly ONE candidate using these criteria IN ORDER: (1) reuse-first - prefer extending what already exists; (2) lowest irreversibility; (3) lowest risk; (4) lowest effort. State your confidence H/M/L in the pick and give each rejected candidate a one-line reason. Do not invent a new option.

Scored candidates:
${JSON.stringify(scored, null, 1)}`,
  { schema: JUDGE_SCHEMA, label: 'judge', phase: 'Solutions', model: 'sonnet' },
)

log(`decide: AC ${acFindings.length ? `capped with ${acFindings.length} open finding(s)` : 'clean'}; judge picked "${judge.pick}" (confidence ${judge.confidence})`)

return { ac: ac.acMarkdown, acAssumptions: ac.assumptions, acOpenFindings: acFindings, candidates: scored, judge }
