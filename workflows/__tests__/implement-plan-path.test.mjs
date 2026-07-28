import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { runWorkflow } from './helpers/run-workflow.mjs'

const toolkitRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const skill = readFileSync(join(toolkitRoot, 'skills/autonomous-feature-workflow/SKILL.md'), 'utf8')

const PLAN_PATH = 'docs/scratch/add-a-thing/horizontal-plan.json'
const baseArgs = { repoRoot: '/repo', branch: 'feature/add-a-thing' }
const inlineSteps = [{ id: 's1', title: 'first', files: ['src/a.js'], redCode: 'FILE: t.js', greenCode: '', runCommand: 'npm test', expectFail: 'no fn', expectPass: 'fn', commitMessage: 'feat: a', dependsOn: [] }]

const stubAgent = results => label =>
  label === 'implement-all'
    ? { results }
    : { suitePassed: true, evidence: 'suite green', concerns: [] }

const greenResults = ids => ids.map(id => ({ id, status: 'green', commitSha: 'abc1234', testEvidence: 'RED ok / GREEN ok', notes: '' }))

const run = (args, results = greenResults(['s1'])) => runWorkflow('implement.js', args, stubAgent(results))

test('planPath alone satisfies the input guard and drives the run', async () => {
  const { returned, calls } = await run({ ...baseArgs, planPath: PLAN_PATH })

  assert.deepEqual(returned, {
    results: greenResults(['s1']),
    unresolved: [],
    verify: { suitePassed: true, evidence: 'suite green', concerns: [] },
  })
  assert.deepEqual(calls.map(c => c.opts.label), ['implement-all', 'verify'])
})

test('the implement prompt points the agent at the plan file rather than embedding steps', async () => {
  const { promptFor } = await run({ ...baseArgs, planPath: PLAN_PATH })
  const prompt = promptFor('implement-all')

  assert.ok(prompt.includes(PLAN_PATH), 'plan path handed to the agent')
  assert.ok(!prompt.includes('Steps (JSON array)'), 'no inline step payload')
  assert.ok(prompt.includes('read'), 'agent is told to read the plan itself')
})

test('stepIds narrows execution to the listed steps only', async () => {
  const { promptFor, logs } = await run({ ...baseArgs, planPath: PLAN_PATH, stepIds: ['s2', 's4'] }, greenResults(['s2', 's4']))
  const prompt = promptFor('implement-all')

  assert.ok(prompt.includes('s2, s4'), 'the selected ids are named')
  assert.ok(/ONLY/.test(prompt), 'other steps in the file are excluded')
  assert.ok(logs[0].includes('2/2 steps green'), 'progress counts the selected steps')
})

test('inline steps still work so /feature-amend keeps running unchanged', async () => {
  const { returned, promptFor, logs } = await run({ ...baseArgs, steps: inlineSteps })
  const prompt = promptFor('implement-all')

  assert.ok(prompt.includes('Steps (JSON array)'), 'inline payload preserved')
  assert.ok(prompt.includes(JSON.stringify(inlineSteps)), 'steps embedded verbatim')
  assert.equal(returned.unresolved.length, 0)
  assert.ok(logs[0].includes('1/1 steps green'))
})

test('amendMode instructions survive the plan-path form', async () => {
  const { promptFor } = await run({ ...baseArgs, planPath: PLAN_PATH, amendMode: true, amendNote: 'rename the flag' })
  const prompt = promptFor('implement-all')

  assert.ok(prompt.includes('AMENDMENT MODE'), 'amend guidance still emitted')
  assert.ok(prompt.includes('rename the flag'), 'amend note carried through')
})

test('the guard rejects a run with neither a plan path nor inline steps', async () => {
  await assert.rejects(run({ ...baseArgs }), /planPath/)
  await assert.rejects(run({ ...baseArgs, steps: [] }), /planPath/)
  await assert.rejects(run({ planPath: PLAN_PATH, branch: 'feature/x' }), /repoRoot/)
  await assert.rejects(run({ planPath: PLAN_PATH, repoRoot: '/repo' }), /branch/)
})

test('phase 6 of the orchestrator hands over the plan path, not the steps', () => {
  const phase6 = skill.slice(skill.indexOf('## Phase 6'), skill.indexOf('## Phase 7'))

  assert.ok(phase6.includes('planPath: docs/scratch/<slug>/horizontal-plan.json'), 'planPath passed')
  assert.ok(!phase6.includes('steps: <the parsed array>'), 'inline steps arg removed')
  assert.ok(!/Read `horizontal-plan\.json`/.test(phase6), 'orchestrator no longer reads the plan into the session')
  assert.ok(/do NOT inline its steps/i.test(phase6), 'the reason is stated so it survives paraphrase')
})

test('non-green steps are reported as unresolved regardless of input form', async () => {
  const results = [...greenResults(['s1']), { id: 's2', status: 'skipped', commitSha: '', testEvidence: '', notes: 's1 blocked it' }]
  const { returned } = await run({ ...baseArgs, planPath: PLAN_PATH }, results)

  assert.deepEqual(returned.unresolved, [results[1]])
})
