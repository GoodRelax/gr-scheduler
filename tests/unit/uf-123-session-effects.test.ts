// UF-123 session-effects.ts: runSessionEffects hands effects on in order, EffectRunners asks for every kind, unwiredEffect throws.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import {
  runSessionEffects,
  unwiredEffect,
  type EffectRunners,
} from '../../src/framework/single-html-shell/session-effects'
import type { SessionEffect } from '../../src/use-case/advance-screen-session/advance-screen-session'
import { unbroken } from '../contract/spec-table'

const DESIGN = unbroken(readFileSync(join(process.cwd(), 'docs', 'spec', '05-07-design.md'), 'utf8'))

const UF_123_IN_ORDER = '状態機械が返した副作用を、返った順に 1 つずつ種類ごとの実行へ渡すこと（`runSessionEffects`）'
const UF_123_EVERY_KIND = '`EffectRunners` —— 副作用の種類の全数を 1 つ残らず求める。'
const UF_123_UNWIRED = '（`unwiredEffect` —— 呼ばれたら投げる。'
const SF_6 = '副作用（書き込み・ファイル・クリップボード・問い）は値として返し、`SingleHtmlShell` が実行する。'

// see T-280, T-286, T-289, T-290, T-292, T-293
const MANUSCRIPT_EFFECTS: readonly string[] = (() => {
  const found = new Set<string>()
  const walk = (value: unknown): void => {
    if (Array.isArray(value)) {
      for (const one of value) walk(one)
      return
    }
    if (typeof value !== 'object' || value === null) return
    for (const [key, inner] of Object.entries(value)) {
      if (key === 'effect' && typeof inner === 'string') found.add(inner)
      else walk(inner)
    }
  }
  const raw = JSON.parse(
    readFileSync(join(process.cwd(), 'docs', 'spec', '_source', 'state-machines.json'), 'utf8'),
  ) as { readonly regions: unknown }
  walk(raw.regions)
  return [...found].sort()
})()

type Called = { readonly type: string; readonly at: number }

// WHY: a Proxy answers every kind, so the order and count of calls can be read without typing each runner.
const recording = (): { readonly runners: EffectRunners<SessionEffect>; readonly calls: Called[] } => {
  const calls: Called[] = []
  const runners = new Proxy(
    {},
    {
      get: (_target, name) => (effect: { readonly type: string }) =>
        void calls.push({ type: `${String(name)}:${effect.type}`, at: calls.length }),
    },
  ) as unknown as EffectRunners<SessionEffect>
  return { runners, calls }
}

const effect = (type: string): SessionEffect => ({ type }) as unknown as SessionEffect

type Two = { readonly type: 'first' } | { readonly type: 'second' }

// WHY: a type answer, not a compiler directive: tsc refuses `= false` the moment the table accepts it.
type Accepts<Table, Offered> = [Offered] extends [Table] ? true : false

describe(`UF-123 -- ${UF_123_IN_ORDER}`, () => {
  it('the design still says it, word for word', () => {
    for (const clause of [UF_123_IN_ORDER, UF_123_EVERY_KIND, UF_123_UNWIRED, SF_6]) expect(DESIGN).toContain(clause)
  })

  it('the manuscript names at least one effect, so the cases below have kinds to use', () => {
    expect(MANUSCRIPT_EFFECTS.length).toBeGreaterThan(0)
  })

  it('each effect goes to the runner of its own kind, once, in the order returned', () => {
    const kinds = MANUSCRIPT_EFFECTS.slice(0, 4)
    const order = [...kinds].reverse().concat(kinds)
    const { runners, calls } = recording()
    runSessionEffects(order.map(effect), runners, null)
    expect(calls.map((c) => c.type)).toEqual(order.map((kind) => `${kind}:${kind}`))
  })

  it('an empty list runs nothing', () => {
    const { runners, calls } = recording()
    runSessionEffects([], runners, null)
    expect(calls).toEqual([])
  })

  it('a runner that throws stops the ones after it: no effect is run out of order', () => {
    const kinds = MANUSCRIPT_EFFECTS.slice(0, 2)
    const ran: string[] = []
    const runners = new Proxy(
      {},
      {
        get: (_target, name) => () => {
          ran.push(String(name))
          if (String(name) === kinds[0]) throw new Error('refused')
        },
      },
    ) as unknown as EffectRunners<SessionEffect>
    expect(() => runSessionEffects(kinds.map(effect), runners, null)).toThrow('refused')
    expect(ran).toEqual([kinds[0]])
  })
})

describe(`UF-123 -- ${UF_123_EVERY_KIND}`, () => {
  it('a table naming every kind compiles; one missing a kind does not', () => {
    const whole: EffectRunners<Two> = { first: () => undefined, second: () => undefined }
    const missing = { first: () => undefined }
    const isMissingAccepted: Accepts<EffectRunners<Two>, typeof missing> = false
    expect(Object.keys(whole).sort()).toEqual(['first', 'second'])
    expect(Object.keys(missing)).toEqual(['first'])
    expect(isMissingAccepted).toBe(false)
  })

  it('an empty table does not compile against the whole SessionEffect', () => {
    const none = {}
    const isNoneAccepted: Accepts<EffectRunners<SessionEffect>, typeof none> = false
    expect(Object.keys(none)).toEqual([])
    expect(isNoneAccepted).toBe(false)
  })

  it('SessionEffect names exactly the effect kinds of the manuscript, no more and no fewer', () => {
    const every: Record<SessionEffect['type'], true> = {
      answerOverwriteQuestion: true,
      askBrowserForFullScreen: true,
      bringCreatedRowIntoSight: true,
      carryOutOwedAction: true,
      clearSelection: true,
      discardIncomingDocument: true,
      importIncomingDocument: true,
      matchWatermarkUnlock: true,
      raiseFlowSurface: true,
      raiseNotice: true,
      readDocumentFile: true,
      repeatHeldEntry: true,
      restartScaleMessageTimer: true,
      restorePaletteCorner: true,
      startEntryRepeat: true,
      startScaleMessageTimer: true,
      storeLanguage: true,
      tellFlowSurfaceClosed: true,
      writeClearDualCursor: true,
      writeDocumentFile: true,
      writeFixDate1: true,
      writeFixDate2: true,
      writeFoldAll: true,
      writeOpenLevel: true,
      writePlaceDualCursor: true,
      writeProgressStep: true,
    }
    expect(Object.keys(every).sort()).toEqual(MANUSCRIPT_EFFECTS)
  })
})

describe(`UF-123 -- ${UF_123_UNWIRED}`, () => {
  it('unwiredEffect throws when it is called', () => {
    expect(() => unwiredEffect({ type: MANUSCRIPT_EFFECTS[0] ?? 'any' })).toThrow()
  })

  it('an unwired runner in the table throws when its effect is run', () => {
    const runners = new Proxy({}, { get: () => unwiredEffect }) as unknown as EffectRunners<SessionEffect>
    expect(() => runSessionEffects([effect(MANUSCRIPT_EFFECTS[0] ?? 'any')], runners, null)).toThrow()
  })
})
