import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const decide = readFileSync(join(repoRoot, 'workflows/decide.js'), 'utf8')

test('AC phase has no adversarial review/fix loop', () => {
  assert.ok(!decide.includes('AC_REVIEW_SCHEMA'), 'AC_REVIEW_SCHEMA removed')
  assert.ok(!decide.includes('review-ac'), 'review-ac job removed')
  assert.ok(!decide.includes('fix-ac'), 'fix-ac job removed')
})

test('AC phase spawns exactly one agent', () => {
  const acSection = decide.slice(decide.indexOf("phase('AC')"), decide.indexOf("phase('Solutions')"))
  assert.equal((acSection.match(/agent\(/g) || []).length, 1)
})

test('decide.js no longer returns acOpenFindings', () => {
  assert.ok(!decide.includes('acOpenFindings'), 'acOpenFindings key removed')
})
