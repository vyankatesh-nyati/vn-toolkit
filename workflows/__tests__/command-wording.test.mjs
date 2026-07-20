import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const cmd = readFileSync(join(repoRoot, 'commands/feature-auto.md'), 'utf8')
const norm = cmd.replace(/\s+/g, ' ')

test('no longer claims no approval gates', () => {
  assert.ok(!norm.includes('no approval gates'), '"no approval gates" removed')
  assert.ok(!norm.includes('no gates'), '"no gates" removed')
})

test('documents the plan-approval gate', () => {
  assert.ok(/plan-approval gate/i.test(norm), 'plan-approval gate documented')
})
