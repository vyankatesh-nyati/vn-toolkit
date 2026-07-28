import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor
const toolkitRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..')

export function loadWorkflow(scriptName) {
  const source = readFileSync(join(toolkitRoot, 'workflows', scriptName), 'utf8')
  return new AsyncFunction('args', 'agent', 'phase', 'log', 'parallel', source.replace('export const meta', 'const meta'))
}

export async function runWorkflow(scriptName, args, agentStub) {
  const script = loadWorkflow(scriptName)
  const calls = []
  const logs = []

  const agent = async (prompt, opts = {}) => {
    calls.push({ prompt, opts })
    return agentStub(opts.label, prompt)
  }
  const parallel = thunks => Promise.all(thunks.map(t => t()))

  const returned = await script(args, agent, () => {}, m => logs.push(m), parallel)
  return { returned, calls, logs, promptFor: label => calls.find(c => c.opts.label === label).prompt }
}
