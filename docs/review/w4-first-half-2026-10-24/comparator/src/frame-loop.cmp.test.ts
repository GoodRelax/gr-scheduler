// Comparator part: src/framework/single-html-shell/frame-loop.ts (public entry frameLoop and its exports).
// Each case builds a fresh loop on recording fakes, drives a scripted sequence, and hashes every host
// call (with arguments), every frame drawn, every screen view handed out and every session event.

import { it, vi } from 'vitest'

import { CaseLines } from './canon'
import { runScenarios } from './frame-loop-scenarios'

// WHY: the events the loop sends to its screen session are recorded at the one door they pass,
// the use case's advanceScreenSession; the module is not split, so both trees route through it.
vi.mock('../../../src/use-case/advance-screen-session/advance-screen-session', async (importOriginal) => {
  const original = (await importOriginal()) as Record<string, unknown>
  const advance = original['advanceScreenSession'] as (state: unknown, event: unknown) => { effects: unknown }
  return {
    ...original,
    advanceScreenSession: (state: unknown, event: unknown) => {
      const step = advance(state, event)
      const log = (globalThis as { __comparatorLog?: { add: (...e: unknown[]) => void } | null }).__comparatorLog
      log?.add('session.event', event, step.effects)
      return step
    },
  }
})

it('frame-loop comparator', async () => {
  const lines = new CaseLines(process.env['COMPARATOR_OUT'] ?? '')
  const entry = await import('../../../src/framework/single-html-shell/frame-loop')
  const agent = await import('../../../src/adapter/agent-api-endpoint/agent-api-endpoint')
  const session = await import('../../../src/use-case/advance-screen-session/advance-screen-session')
  await runScenarios({ entry, installAgentApi: agent.installAgentApi, session, lines, only: process.env['COMPARATOR_ONLY'] ?? null })
  lines.write()
  console.log('frame-loop cases: ' + lines.size())
})
