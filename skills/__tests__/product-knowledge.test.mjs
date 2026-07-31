import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const read = p => readFileSync(join(repoRoot, p), 'utf8')

const mapTemplate = read('skills/learning-product-knowledge/references/map-template.md')
const sourceTemplate = read('skills/learning-product-knowledge/references/source-template.md')
const reconciliation = read('skills/learning-product-knowledge/references/reconciliation.md')

test('map template carries every required section', () => {
  const required = [
    '## What it is',
    '## Components',
    '## Domain language',
    '## Key flows',
    '## Integrations & dependencies',
    '## Conventions & constraints',
    '## Sources index',
    '## Open questions',
  ]
  required.forEach(h => assert.ok(mapTemplate.includes(h), `map template has ${h}`))
})

test('map template front matter drives product resolution', () => {
  assert.ok(/^---/m.test(mapTemplate), 'front matter present')
  assert.ok(mapTemplate.includes('product:'), 'product slug field')
  assert.ok(mapTemplate.includes('repos:'), 'repos field for cwd matching')
  assert.ok(mapTemplate.includes('updated:'), 'updated field')
  assert.ok(mapTemplate.includes('sources:'), 'source count field')
})

test('source template carries every required section', () => {
  const required = [
    '## In one line',
    '## Key points',
    '## Domain terms introduced',
    '## Flows and behaviour',
    '## Explicit decisions and rationale',
    '## Constraints and gotchas',
    '## Questions this raised',
    '## Quotes worth keeping verbatim',
  ]
  required.forEach(h => assert.ok(sourceTemplate.includes(h), `source template has ${h}`))
})

test('source template records provenance so originals can be re-read', () => {
  assert.ok(sourceTemplate.includes('id:'), 'source id field')
  assert.ok(sourceTemplate.includes('source:'), 'original location field')
  assert.ok(sourceTemplate.includes('kind:'), 'kind field')
  assert.ok(sourceTemplate.includes('ingested:'), 'ingest date field')
})

test('reconciliation defines all three outcomes', () => {
  assert.ok(/\bNew\b/.test(reconciliation), 'new-fact outcome')
  assert.ok(/\bRefining\b/.test(reconciliation), 'refining outcome')
  assert.ok(/\bContradicting\b/.test(reconciliation), 'contradicting outcome')
})

test('reconciliation never overwrites a contradiction', () => {
  assert.ok(/never overwrite/i.test(reconciliation), 'overwrite explicitly forbidden')
  assert.ok(reconciliation.includes('⚠ disputed'), 'disputed marker defined')
  assert.ok(reconciliation.includes('questions.md'), 'contradictions routed to questions.md')
  assert.ok(/both source ID/i.test(reconciliation), 'both source ids recorded')
})

test('reconciliation forbids a subagent touching the map', () => {
  assert.ok(/never edit/i.test(reconciliation), 'subagent write ban stated')
  assert.ok(reconciliation.includes('MAP.md'), 'ban names MAP.md')
})

test('topics are lazily created with a stated threshold', () => {
  assert.ok(/lazil/i.test(reconciliation), 'lazy creation documented')
  assert.ok(/2\+|two or more|≥\s*2/.test(reconciliation), 'two-source threshold stated')
})

test('inferred facts are distinguishable from sourced ones', () => {
  assert.ok(reconciliation.includes('(inferred)'), 'inferred tag defined')
})
