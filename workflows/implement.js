export const meta = {
  name: 'feature-auto-implement',
  description: 'Phase 6 of /feature-auto: execute the horizontal TDD plan in a single job, then verify',
  phases: [
    { title: 'Implement', detail: 'one agent executes every step: RED, GREEN, commit' },
    { title: 'Verify', detail: 'full suite plus end-to-end evidence' },
  ],
}

let input = args
if (typeof input === 'string') {
  try { input = JSON.parse(input) } catch { input = {} }
}
const { steps, repoRoot, branch, amendMode = false, amendNote } = input || {}
if (!Array.isArray(steps) || !steps.length || !repoRoot || !branch) {
  throw new Error('implement: args.steps (non-empty array), args.repoRoot, args.branch are all required')
}

const IMPLEMENT_RESULT_SCHEMA = {
  type: 'object',
  required: ['results'],
  properties: {
    results: {
      type: 'array',
      items: {
        type: 'object',
        required: ['id', 'status', 'commitSha', 'testEvidence', 'notes'],
        properties: {
          id: { type: 'string' },
          status: { type: 'string', enum: ['green', 'failed', 'skipped'] },
          commitSha: { type: 'string' },
          testEvidence: { type: 'string' },
          notes: { type: 'string' },
        },
      },
    },
  },
}

phase('Implement')
const impl = await agent(
  `You are executing an approved TDD plan in ${repoRoot} on branch ${branch} — ALL steps, in one session.
First run: git -C ${repoRoot} branch --show-current — if it is not ${branch}, STOP and return results with a single entry { id: "-", status: "failed", commitSha: "", testEvidence: "", notes: "<why>" }. NEVER switch branches, NEVER push, NEVER touch files outside each step's file list.
${amendMode ? `
AMENDMENT MODE: these steps revise work an earlier run already committed on this
branch. Files may already contain tests/code from the superseded version. Do NOT
blindly append — for each step reconcile: replace or delete the superseded test(s)
and code it supersedes so the file reflects ONLY the current intended behavior,
then apply that step's RED/GREEN. The RED expectation may already be partially
present; the goal is that the step's tests pass and no contradictory leftover test
remains. Amendment context: ${amendNote}
` : ''}
Execute the steps below strictly IN ORDER. For each step:
1. Add exactly its RED test code (each code block's first line "FILE: <path>" gives its file). Run its runCommand and confirm it FAILS for the stated expectFail reason.
2. Apply exactly its GREEN change (same FILE convention; greenCode may be empty — then no production change). Run its runCommand and confirm it PASSES (expectPass).
3. Stage ONLY that step's files and commit with exactly its commitMessage.
If a step's dependsOn lists a step that ended non-green, skip it: status "skipped", note which dependency blocked it, do not commit. If the plan's code has a small defect (typo, wrong path, missing import), fix it minimally and record it in notes.

Steps (JSON array):
${JSON.stringify(steps)}

Return results: exactly one entry per step, in the same order — { id; status green|failed|skipped; commitSha (the new commit's short sha, or "" if not committed); testEvidence (the key RED and GREEN output lines, or "" if skipped); notes (deviations/skip reason, or "") }.`,
  { schema: IMPLEMENT_RESULT_SCHEMA, label: 'implement-all', phase: 'Implement', model: 'sonnet' },
)
const results = impl.results

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

const unresolved = results.filter(r => r.status !== 'green')
log(`implement: ${results.filter(r => r.status === 'green').length}/${steps.length} steps green; suitePassed=${verify.suitePassed}`)

return { results, unresolved, verify }
