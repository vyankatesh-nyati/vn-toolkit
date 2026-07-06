export const meta = {
  name: 'feature-auto-implement',
  description: 'Phase 6 of /feature-auto: execute horizontal TDD steps with per-step commits, then verify',
  phases: [
    { title: 'Implement', detail: 'one agent per step: RED, GREEN, commit; 3 attempts max' },
    { title: 'Verify', detail: 'full suite plus end-to-end evidence' },
  ],
}

let input = args
if (typeof input === 'string') {
  try { input = JSON.parse(input) } catch { input = {} }
}
const { steps, repoRoot, branch } = input || {}
if (!Array.isArray(steps) || !steps.length || !repoRoot || !branch) {
  throw new Error('implement: args.steps (non-empty array), args.repoRoot, args.branch are all required')
}

const STEP_RESULT_SCHEMA = {
  type: 'object',
  required: ['status', 'commitSha', 'testEvidence', 'notes'],
  properties: {
    status: { type: 'string', enum: ['green', 'failed'] },
    commitSha: { type: 'string' },
    testEvidence: { type: 'string' },
    notes: { type: 'string' },
  },
}

phase('Implement')
const results = []
const failed = new Set()

for (const step of steps) {
  const blockedBy = step.dependsOn.filter(d => failed.has(d))
  if (blockedBy.length) {
    results.push({ id: step.id, status: 'skipped', reason: `depends on failed step(s): ${blockedBy.join(', ')}` })
    log(`step ${step.id}: SKIPPED (blocked by ${blockedBy.join(', ')})`)
    continue
  }
  let result = null
  for (let attempt = 1; attempt <= 3; attempt++) {
    result = await agent(
      `You are executing ONE step of an approved TDD plan in ${repoRoot} on branch ${branch}. First run: git -C ${repoRoot} branch --show-current — if it is not ${branch}, STOP and return status failed with notes explaining. NEVER switch branches, NEVER push, NEVER touch files outside this step's list.
${attempt > 1 ? `This is attempt ${attempt}; a previous attempt failed. Inspect the current file state first — partial work may exist. Reach GREEN for this step.` : ''}
Step ${step.id} — ${step.title}
Files: ${step.files.join(', ')}
RED — add exactly this failing test code (each block's first line "FILE: <path>" gives its file):
${step.redCode}
Run: ${step.runCommand}   Expect FAIL: ${step.expectFail}
GREEN — apply exactly this change (same FILE convention):
${step.greenCode || '(no production change in this step)'}
Run: ${step.runCommand}   Expect PASS: ${step.expectPass}

Execute RED first and confirm it fails for the stated reason, then GREEN and confirm it passes. If the plan's code has a small defect (typo, wrong path, missing import), fix it minimally and record that in notes. Then stage ONLY this step's files and commit with exactly this message: ${step.commitMessage}
Return: status green|failed; commitSha (the new commit's short sha, or "" if failed); testEvidence (the key RED and GREEN output lines); notes (deviations, or "").`,
      { schema: STEP_RESULT_SCHEMA, label: `step:${step.id}${attempt > 1 ? `:retry${attempt}` : ''}`, phase: 'Implement', model: 'haiku', effort: 'low' },
    )
    if (result && result.status === 'green') break
  }
  if (result && result.status === 'green') {
    results.push({ id: step.id, status: 'green', commitSha: result.commitSha, testEvidence: result.testEvidence, notes: result.notes })
    log(`step ${step.id}: GREEN (${result.commitSha})`)
  } else {
    failed.add(step.id)
    results.push({ id: step.id, status: 'failed', notes: result ? result.notes : 'agent returned no result' })
    log(`step ${step.id}: FAILED after 3 attempts`)
  }
}

phase('Verify')
const VERIFY_SCHEMA = {
  type: 'object',
  required: ['suitePassed', 'evidence', 'concerns'],
  properties: {
    suitePassed: { type: 'boolean' },
    evidence: { type: 'string' },
    concerns: { type: 'array', items: { type: 'string' } },
  },
}
const verify = await agent(
  `Verification pass in ${repoRoot} on branch ${branch}. You may run tests and read anything; NEVER commit, NEVER push, NEVER edit files.
Run the full test suite. Where the project offers a runnable surface (script, REPL invocation, CLI), also drive the newly implemented behavior end-to-end and observe the real result — not just test output. Return suitePassed, the key evidence lines, and concerns ([] if none).`,
  { schema: VERIFY_SCHEMA, label: 'verify', phase: 'Verify', model: 'haiku', effort: 'low' },
)

log(`implement: ${results.filter(r => r.status === 'green').length}/${steps.length} steps green; suitePassed=${verify.suitePassed}`)

return { results, unresolved: results.filter(r => r.status !== 'green'), verify }
