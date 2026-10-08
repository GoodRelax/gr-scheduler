// DFC-551 (2): FR-020 -- the watermark time is fixed at open and renewed only by a write that changed the document.

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { installAgentApi } from '../../src/adapter/agent-api-endpoint/agent-api-endpoint'
import { keyOf, rowDocument, shell, TEMPLATE, type ShellBench } from './cr-541-stage'

const benches: ShellBench[] = []

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'], now: Date.UTC(2026, 9, 8, 1, 0, 0) })
})
afterEach(() => {
  vi.useRealTimers()
  for (const one of benches.splice(0)) one.restore()
})

const iso = (hour: number, minute = 0): string => new Date(Date.UTC(2026, 9, 8, hour, minute, 0)).toISOString().replace('.000Z', 'Z')
const at = (hour: number, minute = 0): void => void vi.setSystemTime(Date.UTC(2026, 9, 8, hour, minute, 0))

const benchOf = (): ShellBench => {
  const built = shell(rowDocument([{ id: 'g1', parentId: null }]))
  benches.push(built)
  return built
}

const watermarkTimes = (built: ShellBench): readonly string[] => {
  const svg = built.loop.exportScene()?.svg ?? ''
  return [...svg.matchAll(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z/g)].map((one) => one[0])
}

describe('FR-020 (DFC-551 2) -- the day-and-time on the watermark', () => {
  it('is the time the document was opened, in UTC to the second', () => {
    const built = benchOf()
    expect(new Set(watermarkTimes(built)), 'the watermark carries the opening time').toEqual(new Set([iso(1)]))
  })

  it('is not read again by a frame (MUST NOT read the clock every frame)', () => {
    const built = benchOf()
    at(1, 30)
    built.send(keyOf('x'))
    expect(new Set(watermarkTimes(built))).toEqual(new Set([iso(1)]))
  })

  it('is renewed by an accepted write that changed the document, and by nothing else', () => {
    const built = benchOf()
    const api = installAgentApi({ ...built.loop.agentApiSeams(), writerName: 'dfc-551', schemaVersion: TEMPLATE.schemaVersion } as never)
    const write = (title: string): any => api.applyCommands({ readStamp: api.readStamp(), commands: [{ kind: 'setProjectTitle', title }] } as never)

    at(2)
    expect(write('Changed').accepted, 'premise: the write landed').toBe(true)
    built.send(keyOf('x'))
    expect(new Set(watermarkTimes(built)), 'FR-020: a changed document is stamped again').toEqual(new Set([iso(2)]))

    at(3)
    expect(write('').accepted, 'premise: an empty title is refused (FR-035)').toBe(false)
    built.send(keyOf('x'))
    expect(new Set(watermarkTimes(built)), 'FR-020: a refused write does not restamp').toEqual(new Set([iso(2)]))

    at(4)
    write('Changed')
    built.send(keyOf('x'))
    expect(new Set(watermarkTimes(built)), 'FR-020: a write that changed nothing does not restamp').toEqual(new Set([iso(2)]))
  })
})
