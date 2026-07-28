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

test('phase write-steps append journal sections instead of full decision entries', () => {
  const p12 = skill.slice(skill.indexOf('## Phases 1-2'), skill.indexOf('## Phases 3-4'))
  assert.ok(p12.includes('## Understanding the code'), 'phase 1-2 writes the understanding section')
  assert.ok(p12.includes('## Questions I answered myself'), 'phase 2 writes the questions section')
  assert.ok(p12.includes('journal.md') && p12.includes('thin'), 'phase 2 appends thin DECISIONS lines')
  assert.ok(!p12.includes('Question it replaces = question'), 'old full-format append wording gone from phase 1-2')

  const p34 = skill.slice(skill.indexOf('## Phases 3-4'), skill.indexOf('## Phase 5'))
  assert.ok(p34.includes('## Acceptance criteria & the approach I picked'), 'phase 3-4 writes the AC+approach section')
  assert.ok(!p34.includes('Options considered = all candidate names'), 'old full-format append wording gone from phase 3-4')

  const p6 = skill.slice(skill.indexOf('## Phase 6'), skill.indexOf('## Phase 7'))
  assert.ok(p6.includes('## What I built'), 'phase 6 writes the implementation section')
})

test('the per-phase decision COUNT contracts survive the rewrite', () => {
  assert.ok(/MUST equal the length of\s*`?clarifications`?/.test(skill), 'clarifications 1:1 count kept')
  assert.ok(/MUST equal the length of\s*`?acAssumptions`?/.test(skill), 'acAssumptions 1:1 count kept')
})

test('MR assembly embeds the journal and builds sections from thin tags', () => {
  const p7 = skill.slice(skill.indexOf('## Phase 7'), skill.indexOf('## Phases 1-7'))
  assert.ok(/journal\.md/.test(p7), 'phase 7 references the journal')
  assert.ok(/<details>/.test(p7), 'journal is embedded in a collapsible details block')
  assert.ok(/\[assumption\]/.test(p7), 'assumptions section built from the [assumption] tag')
  assert.ok(!p7.includes('(source: conservative-default)'), 'old source-text heuristic removed from MR assembly')
})

const amend = readFileSync(join(repoRoot, 'skills/amending-feature-workflow/SKILL.md'), 'utf8')

test('amend regenerates journal subsections alongside thin decision lines', () => {
  assert.ok(amend.includes('journal.md'), 'amend references the journal')
  assert.ok(/\{#d<N>\}|journal\.md#d/.test(amend), 'amend regenerates the journal anchor/subsection')
  assert.ok(amend.includes('[amend A<n>]'), 'amend keeps its amend tag on the thin line')
})

test('plugin manifests all declare the same, bumped version', () => {
  const plugin = JSON.parse(readFileSync(join(repoRoot, '.claude-plugin/plugin.json'), 'utf8'))
  const market = JSON.parse(readFileSync(join(repoRoot, '.claude-plugin/marketplace.json'), 'utf8'))
  const marketVersions = JSON.stringify(market).match(/"version":\s*"[^"]+"/g) || []
  assert.equal(plugin.version, '2.3.0', 'plugin.json bumped to 2.3.0')
  marketVersions.forEach(v => assert.ok(v.includes(plugin.version), `marketplace version agrees: ${v}`))
})

test('per-phase write-steps emit the reversibility tag', () => {
  const p12 = skill.slice(skill.indexOf('## Phases 1-2'), skill.indexOf('## Phases 3-4'))
  const p34 = skill.slice(skill.indexOf('## Phases 3-4'), skill.indexOf('## Phase 5'))
  assert.ok(/reversibility/i.test(p12), 'phase 1-2 write-step emits reversibility')
  assert.ok(/reversibility/i.test(p34), 'phase 3-4 write-step emits reversibility')
})
