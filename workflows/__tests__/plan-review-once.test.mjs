import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const par = readFileSync(join(repoRoot, 'workflows/plan-and-review.js'), 'utf8')

test('review phase is a single pass, not a loop', () => {
  assert.ok(!par.includes('for (let i = 1; i <= 5'), 'the up-to-5 review loop is gone')
  assert.ok(!par.includes('reviewIterations'), 'reviewIterations removed')
})

test('both reviewers run once and one fix pass is possible', () => {
  assert.ok(par.includes("label: 'review-tests'"), 'review-tests runs once (no :i suffix)')
  assert.ok(par.includes("label: 'review-tech'"), 'review-tech runs once (no :i suffix)')
  assert.ok(par.includes("label: 'fix-plan'"), 'single fix-plan job')
})

test('fix job only runs when the single review found something', () => {
  assert.ok(par.includes('if (openFindings.length)'), 'fix-plan is guarded — clean review spawns no fix job')
})
