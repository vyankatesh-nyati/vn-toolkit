export const meta = {
  name: 'feature-auto-plan-and-review',
  description: 'Phase 5 of /feature-auto: vertical plan, horizontal TDD plan with complete code, single deterministic review pass',
  phases: [
    { title: 'Vertical', detail: 'per-layer NEW/CHANGED/REUSE/UNCHANGED map' },
    { title: 'Horizontal', detail: 'ordered TDD steps with complete code' },
    { title: 'Review', detail: 'test-convention and new-tech review, single pass' },
  ],
}

let input = args
if (typeof input === 'string') {
  try { input = JSON.parse(input) } catch { input = {} }
}
const { requirement, briefPath, contextMapPath, acPath, solutionsPath, repoRoot } = input || {}
if (!requirement || !briefPath || !contextMapPath || !acPath || !solutionsPath || !repoRoot) {
  throw new Error('plan-and-review: requirement, briefPath, contextMapPath, acPath, solutionsPath, repoRoot are all required')
}

const VERTICAL_SCHEMA = {
  type: 'object',
  required: ['planMarkdown'],
  properties: { planMarkdown: { type: 'string' } },
}

phase('Vertical')
const vertical = await agent(
  `Phase 5a of an autonomous feature pipeline: write the VERTICAL plan for the chosen solution.
Repo: ${repoRoot}. Read ${briefPath}, ${contextMapPath}, ${acPath}, and ${solutionsPath} — plan the judge's chosen candidate ONLY.
Requirement: ${requirement}

Produce a vertical plan in the vn-toolkit writing-vertical-plans shape: a tree ordered entry-point to data, every node tagged [NEW|CHANGED|REUSE|UNCHANGED] with the concrete change (from -> to / add X), box-drawing glyphs, the key design decision stated as one rule line at the end, zero rationale prose. Every symbol you name must exist in the repo (verify by reading) or be explicitly tagged NEW.`,
  { schema: VERTICAL_SCHEMA, label: 'vertical-plan', phase: 'Vertical', model: 'sonnet' },
)

const STEP_SCHEMA = {
  type: 'object',
  required: ['steps'],
  properties: {
    steps: {
      type: 'array',
      minItems: 1,
      items: {
        type: 'object',
        required: ['id', 'title', 'files', 'redCode', 'greenCode', 'runCommand', 'expectFail', 'expectPass', 'commitMessage', 'dependsOn'],
        properties: {
          id: { type: 'string' },
          title: { type: 'string' },
          files: { type: 'array', items: { type: 'string' } },
          redCode: { type: 'string' },
          greenCode: { type: 'string' },
          runCommand: { type: 'string' },
          expectFail: { type: 'string' },
          expectPass: { type: 'string' },
          commitMessage: { type: 'string' },
          dependsOn: { type: 'array', items: { type: 'string' } },
        },
      },
    },
  },
}

phase('Horizontal')
let horizontal = await agent(
  `Phase 5b: turn the vertical plan into HORIZONTAL TDD steps per the vn-toolkit writing-horizontal-plans rules: bottom-up (callee before caller), one concern per step, one compiling commit per step, NO placeholders — every step carries COMPLETE code.
Repo: ${repoRoot}. Read ${acPath} (steps must cover every AC scenario) and ${contextMapPath} (match the repo's test framework and conventions; if the repo has none, use the framework the context map's tests section named).
Requirement: ${requirement}

Vertical plan:
${vertical.planMarkdown}

For each step return: id (s1, s2, ...); title (the one concern); files (every file the step creates or modifies, repo-relative); redCode (the complete failing test code to add — for each file block the FIRST line is exactly "FILE: <repo-relative path>"); greenCode (the complete implementation change, same FILE convention; empty string if the step adds only tests for existing behavior); runCommand (exact command from the repo root); expectFail (why RED fails); expectPass (what GREEN proves); commitMessage (one line); dependsOn (ids this step builds on; [] if none).
An engineer with zero context executes each step verbatim — repeat code rather than referencing another step.`,
  { schema: STEP_SCHEMA, label: 'horizontal-plan', phase: 'Horizontal', model: 'sonnet' },
)

phase('Review')
const FINDINGS_SCHEMA = {
  type: 'object',
  required: ['findings'],
  properties: {
    findings: {
      type: 'array',
      items: {
        type: 'object',
        required: ['stepId', 'issue', 'fix'],
        properties: { stepId: { type: 'string' }, issue: { type: 'string' }, fix: { type: 'string' } },
      },
    },
  },
}

const planJson = JSON.stringify(horizontal.steps)
const reviews = await parallel([
  () => agent(
    `Review the test code inside this horizontal plan against the vn-toolkit writing-tests conventions: every AC scenario covered (happy, edges, errors, boundaries); AAA phases separated by a single blank line with NO Arrange/Act/Assert label comments; whole-object assertions where the language supports them; test names consistent with the repo's convention (repo: ${repoRoot} — read a sibling test if one exists, else require internal consistency); no magic literals. Findings reference stepId. Empty findings = pass.

${planJson}`,
    { schema: FINDINGS_SCHEMA, label: 'review-tests', phase: 'Review', model: 'sonnet' },
  ),
  () => agent(
    `Review this horizontal plan for any technology NEW to this repo (repo: ${repoRoot}): a library, framework feature, API, or version not already used there. For each new item check: warranted (not novelty — prefer what the repo already uses)? correct per CURRENT docs (verify, never from memory)? actually available in the repo's stack? known pitfalls? If the plan introduces nothing new, return empty findings. Findings reference stepId.

${planJson}`,
    { schema: FINDINGS_SCHEMA, label: 'review-tech', phase: 'Review', model: 'sonnet' },
  ),
])
const openFindings = reviews.filter(Boolean).flatMap(r => r.findings)
log(`plan review: ${openFindings.length} finding(s)`)
if (openFindings.length) {
  horizontal = await agent(
    `Rewrite this horizontal plan applying EVERY finding below. Keep untouched steps identical. Return the complete corrected steps array in the same schema.
Repo: ${repoRoot}. Findings: ${JSON.stringify(openFindings)}

Current steps:
${planJson}`,
    { schema: STEP_SCHEMA, label: 'fix-plan', phase: 'Review', model: 'haiku', effort: 'low' },
  )
}

return { verticalPlan: vertical.planMarkdown, steps: horizontal.steps, openFindings }
