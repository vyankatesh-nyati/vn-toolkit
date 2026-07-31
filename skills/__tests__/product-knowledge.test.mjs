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

const learn = read('skills/learning-product-knowledge/SKILL.md')
const learnBody = learn.slice(learn.indexOf('---', 3))
const learnDesc = learn.slice(0, learn.indexOf('---', 3))

test('learn skill declares name and a description with triggers', () => {
  assert.ok(learnDesc.includes('name: learning-product-knowledge'), 'skill name')
  assert.ok(/description:/.test(learnDesc), 'description present')
  assert.ok(/\/learn/.test(learnDesc), 'command named in description')
})

test('learn description states its negative cases', () => {
  const d = learnDesc.replace(/\s+/g, ' ')
  assert.ok(/not/i.test(d), 'negative framing present')
  assert.ok(/exploring-project-context/.test(d), 'defers code grounding to exploring-project-context')
  assert.ok(/README|CLAUDE\.md/.test(d), 'excludes writing repo docs')
  assert.ok(/PR|diff/.test(d), 'excludes summarising a PR or diff')
})

test('learn skill spells out all four resolution rules in order', () => {
  const idx = s => learnBody.indexOf(s)
  assert.ok(idx('--product') > -1, 'rule 1: explicit argument')
  assert.ok(idx('repos:') > -1, 'rule 2: cwd matches repos front matter')
  assert.ok(/exactly one/i.test(learnBody), 'rule 3: single existing KB')
  assert.ok(/never guess/i.test(learnBody), 'rule 4: ask, never guess')
  assert.ok(idx('--product') < idx('repos:'), 'explicit arg precedes cwd matching')
})

test('learn skill pins the KB root', () => {
  assert.ok(learnBody.includes('~/.claude/knowledge/'), 'KB root stated')
  assert.ok(/never.*team repo|not.*inside the team repo/i.test(learnBody), 'team repo excluded')
})

test('learn skill states the size threshold and its exceptions', () => {
  assert.ok(learnBody.includes('600'), 'threshold value')
  assert.ok(/pasted/i.test(learnBody), 'pasted text handled')
  assert.ok(/director|multi-file/i.test(learnBody), 'directories always delegated')
})

test('learn skill forbids the subagent editing the map', () => {
  assert.ok(/never edit/i.test(learnBody), 'write ban present')
  assert.ok(/reconcil/i.test(learnBody), 'reconciliation named as main-session work')
})

test('learn skill points at its reference files', () => {
  assert.ok(learnBody.includes('references/map-template.md'), 'map template referenced')
  assert.ok(learnBody.includes('references/source-template.md'), 'source template referenced')
  assert.ok(learnBody.includes('references/reconciliation.md'), 'reconciliation referenced')
})

test('learn skill requires symbol verification for code sources', () => {
  assert.ok(/LSP/.test(learnBody), 'LSP-first stated')
  assert.ok(/definition/i.test(learnBody), 'definition must be opened')
})

test('learn skill reports back concisely', () => {
  assert.ok(/disputed/i.test(learnBody), 'disputes surfaced in the report')
  assert.ok(/\b(ten|10) lines\b/i.test(learnBody), 'report length bounded')
})

test('learn skill stays within the size budget', () => {
  assert.ok(learn.split('\n').length < 500, `SKILL.md under 500 lines (was ${learn.split('\n').length})`)
})
