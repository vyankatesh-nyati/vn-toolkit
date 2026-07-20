import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const impl = readFileSync(join(repoRoot, 'workflows/implement.js'), 'utf8')

test('implement.js has no per-step loop or per-step retry', () => {
  assert.ok(!impl.includes('for (const step of steps)'), 'per-step loop removed')
  assert.ok(!impl.includes('attempt <= 3'), 'per-step 3-attempt retry removed')
  assert.ok(!/label: `step:/.test(impl), 'per-step labels removed')
})

test('Implement phase is one labelled job', () => {
  const section = impl.slice(impl.indexOf("phase('Implement')"), impl.indexOf("phase('Verify')"))
  assert.equal((section.match(/agent\(/g) || []).length, 1)
  assert.ok(impl.includes("label: 'implement-all'"), 'single implement-all job present')
})

test('input guard, verify job, and return shape preserved', () => {
  assert.ok(impl.includes('args.steps (non-empty array)'), 'empty-step guard kept')
  assert.ok(impl.includes("label: 'verify'"), 'verify job kept')
  assert.ok(impl.includes('return { results, unresolved, verify }'), 'return shape stable')
})

test('per-step results can report partial failure (skipped/failed)', () => {
  assert.ok(impl.includes("enum: ['green', 'failed', 'skipped']"), 'result status enum supports partial-failure reporting')
})
