import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const skill = readFileSync(join(repoRoot, 'skills/autonomous-feature-workflow/SKILL.md'), 'utf8')

test('drops the single-abort-point contract wording', () => {
  assert.ok(!skill.includes('phase 0 is the ONLY abort point'), 'overview contract reworded')
  assert.ok(!skill.includes('Phase 0 abort is the only stop'), 'hard rule reworded')
})

test('adds the plan-approval gate', () => {
  assert.ok(/plan-approval gate/i.test(skill), 'gate section present')
  assert.ok(skill.includes('awaiting plan approval'), 'state.md marker documented')
})

test('no longer reads removed return keys', () => {
  assert.ok(!skill.includes('acOpenFindings'), 'acOpenFindings read removed')
  assert.ok(!skill.includes('reviewIterations'), 'reviewIterations read removed')
})
