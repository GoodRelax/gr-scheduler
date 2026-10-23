// One-time capture (run on the PRE-split tree only): drives the frame-loop scenarios with every function
// of the translator's public entry wrapped, and keeps a sample of the real arguments it was called with
// (inputs, InputContexts, presses, field commits). The sample is written to <out> as a gzipped graph and
// becomes the fixed input corpus of the input-command-translator comparator.

import { writeFileSync } from 'node:fs'
import { gzipSync } from 'node:zlib'

import { it, vi } from 'vitest'

import { CaseLines, canon, encodeGraph, sha256 } from './canon'
import { runScenarios } from './frame-loop-scenarios'

interface Captured {
  readonly fn: string
  readonly args: unknown[]
  readonly scenario: string
}

const sink = { scenario: '', kept: [] as Captured[], seen: new Set<string>(), buckets: new Map<string, number>(), bigKept: 0 }
;(globalThis as { __captureSink?: typeof sink }).__captureSink = sink

vi.mock('../../../src/adapter/input-command-translator/input-command-translator', async (importOriginal) => {
  const original = (await importOriginal()) as Record<string, unknown>
  const wrapped: Record<string, unknown> = { ...original }
  const capture = (globalThis as { __captureSink?: typeof sink }).__captureSink
  for (const [name, value] of Object.entries(original)) {
    if (typeof value !== 'function') continue
    const fn = value as (...args: unknown[]) => unknown
    wrapped[name] = (...args: unknown[]) => {
      const keep = capture !== undefined ? bucketOf(name, args) : null
      if (keep !== null && capture !== undefined) {
        const key = `${capture.scenario}|${keep}`
        const limit = name === 'commandFromInput' ? 1 : 1
        const count = capture.buckets.get(key) ?? 0
        // WHY: contexts over the cut-down template weigh hundreds of kB each; a few are enough.
        const tasks = (args[1] as { document?: { schedule?: { tasks?: unknown[] } } } | undefined)?.document?.schedule?.tasks?.length ?? 0
        const isBig = tasks > 50
        if (isBig && capture.bigKept >= 40) return fn(...args)
        if (count < limit) {
          if (isBig) capture.bigKept += 1
          capture.buckets.set(key, count + 1)
          capture.kept.push({ fn: name, args, scenario: capture.scenario })
        }
      }
      return fn(...args)
    }
  }
  return wrapped
})

// WHY: one bucket per kind of call in a scenario, so the sample keeps every kind of press, drag step,
// release, key and wheel the scenarios made, without keeping every frame's repeat of it.
function bucketOf(name: string, args: unknown[]): string | null {
  const input = args[0] as { kind?: string; phase?: string; key?: string; button?: string } | undefined
  const context = args[1] as { pressed?: { pressRow?: string } | null } | undefined
  switch (name) {
    case 'commandFromInput':
    case 'screenEventFromInput':
    case 'selectionFromInput': {
      if (input === undefined || typeof input !== 'object') return null
      const pressed = context?.pressed?.pressRow ?? '-'
      const detail = input.kind === 'key' ? input.key : input.kind === 'pointer' ? `${input.phase}/${input.button}` : 'wheel'
      return `${name}|${input.kind}|${detail}|${pressed}`
    }
    case 'commandFromFieldCommit':
    case 'screenEventFromFieldCommit': {
      const commit = args[0] as { row?: string; text?: string } | undefined
      return `${name}|${commit?.row}|${commit?.text}`
    }
    case 'pressedRowOf':
    case 'fitWrites':
    case 'zoomEntranceEndsOf':
    case 'escapeContextOf':
    case 'taskGroupBandCeilingOf':
      return name
    default:
      return null
  }
}

it('capture translator corpus', async () => {
  const lines = new CaseLines(process.env['COMPARATOR_OUT'] + '.lines')
  const entry = await import('../../../src/framework/single-html-shell/frame-loop')
  const agent = await import('../../../src/adapter/agent-api-endpoint/agent-api-endpoint')
  const session = await import('../../../src/use-case/advance-screen-session/advance-screen-session')
  const families = (process.env['CAPTURE_FAMILIES'] ?? '').split(',').filter(Boolean)
  await runScenarios({
    entry,
    installAgentApi: agent.installAgentApi,
    session,
    lines,
    only: null,
    accept: (id: string) => families.length === 0 || families.some((family) => id.startsWith(family)),
    onScenario: (id: string) => {
      sink.scenario = id
    },
  })
  // Global dedup by the canonical arguments, then a deterministic stride down to the cap.
  const unique: Captured[] = []
  const seen = new Set<string>()
  for (const one of sink.kept) {
    const key = sha256(one.fn + canon(one.args))
    if (seen.has(key)) continue
    seen.add(key)
    unique.push(one)
  }
  // WHY: selectionFromInput and screenEventFromInput are called on the same (input, context) pairs as
  // commandFromInput, and the comparator drives all three on every pair, so only the last is kept.
  const caps: Record<string, number> = { commandFromInput: Number(process.env['CAPTURE_CAP'] ?? '3000'), selectionFromInput: 0, screenEventFromInput: 0 }
  const picked: Captured[] = []
  for (const fn of [...new Set(unique.map((one) => one.fn))].sort()) {
    const ofFn = unique.filter((one) => one.fn === fn)
    const cap = caps[fn] ?? ofFn.length
    const stride = Math.max(1, ofFn.length / Math.max(1, cap))
    for (let k = 0; k < Math.min(cap, ofFn.length); k += 1) picked.push(ofFn[Math.floor(k * stride)] as Captured)
  }
  const text = encodeGraph(picked.map((one) => ({ fn: one.fn, scenario: one.scenario, args: one.args })))
  writeFileSync(process.env['COMPARATOR_OUT'] ?? '', gzipSync(Buffer.from(text, 'utf8'), { level: 9 }))
  const byFn = new Map<string, number>()
  for (const one of picked) byFn.set(one.fn, (byFn.get(one.fn) ?? 0) + 1)
  console.log(`captured ${sink.kept.length}, unique ${unique.length}, kept ${picked.length}, json ${text.length} bytes`)
  console.log([...byFn].map(([fn, n]) => `${fn}=${n}`).join(' '))
})
