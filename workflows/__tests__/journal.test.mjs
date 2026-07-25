import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const skill = readFileSync(join(repoRoot, 'skills/autonomous-feature-workflow/SKILL.md'), 'utf8')

test('defines the run journal as the readable record', () => {
  assert.ok(/##\s*Run journal/i.test(skill), 'run-journal contract section present')
  assert.ok(skill.includes('first-person'), 'journal voice documented')
  assert.ok(skill.includes('## Understanding the code'), 'journal section: understanding')
  assert.ok(skill.includes('## Questions I answered myself'), 'journal section: questions')
  assert.ok(skill.includes('## Acceptance criteria & the approach I picked'), 'journal section: AC + approach')
  assert.ok(skill.includes('## What I built'), 'journal section: implementation')
  assert.ok(skill.includes('{#d<N>}'), 'decision anchor convention present')
})

test('DECISIONS.md is now a thin index, not the full-format table', () => {
  assert.ok(skill.includes('→ journal.md#d<N>'), 'thin line links the journal anchor')
  assert.ok(skill.includes('[assumption]'), 'assumption tag documented')
  assert.ok(!skill.includes('Question it replaces: <what the human would have been asked>'), 'old full-format block removed')
  assert.ok(!/Options considered: <a> \/ <b> \/ <c>/.test(skill), 'old options/why block removed')
})

test('state layout lists journal.md and marks DECISIONS.md as the index', () => {
  assert.ok(/\|\s*`journal\.md`\s*\|/.test(skill), 'journal.md row in the state table')
  assert.ok(/`DECISIONS\.md`.*thin.*index/i.test(skill), 'DECISIONS.md described as thin index')
})
